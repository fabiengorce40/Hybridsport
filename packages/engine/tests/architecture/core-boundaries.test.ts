/**
 * Lot 15 — Tests d'architecture du CORE (spec 01 §9, contraintes C10).
 * Chaque test échoue si le CORE : importe l'UI, une base de données, le réseau, RevenueCat ou un LLM ;
 * lit l'horloge système ; utilise un hasard non injecté ; expose une API de désactivation de la
 * validation ; écrit en dur des paramètres ou identifiants sportifs provisoires.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, loadCoreSources, REPO_ROOT, visit,
} from './source-scanner.js';
import type { SourceFile } from './source-scanner.js';
import { BODY_AREAS, EQUIPMENT, EXERCISES, MUSCLES, PATTERNS, PRESETS } from '../fixtures/catalog.js';
import { testRulesetDocument } from '../fixtures/ruleset.js';

const files = loadCoreSources();
const engineFiles = files.filter((f) => f.path.startsWith('packages/engine/src'));
const domainFiles = files.filter((f) => f.path.startsWith('packages/domain/src'));

function fake(text: string, path = 'fake.ts'): SourceFile {
  return { path, text, ast: ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true) };
}

/** Familles de dépendances interdites (motifs sur le spécificateur de module). */
const FORBIDDEN_MODULES: Record<string, RegExp> = {
  ui: /^(react|react-dom|react-native|expo(-.*)?|@expo\/.*|@react-navigation\/.*|nativewind|tamagui)(\/|$)/,
  db: /^(@supabase\/.*|pg|postgres|mysql2?|sqlite3?|better-sqlite3|expo-sqlite|@prisma\/.*|prisma|drizzle-orm|mongodb|mongoose|redis|ioredis|@react-native-async-storage\/.*)(\/|$)/,
  network: /^(axios|node-fetch|undici|got|ky|superagent|ws|socket\.io(-client)?|(node:)?(http|https|http2|net|tls|dgram|dns))(\/|$)/,
  payments: /^(react-native-purchases|@revenuecat\/.*|stripe|@stripe\/.*)(\/|$)/,
  llm: /^(@anthropic-ai\/.*|openai|langchain|@langchain\/.*|ai|@ai-sdk\/.*|@google\/generative-ai|cohere-ai|ollama)(\/|$)/,
  system: /^(node:)?(fs|fs\/promises|child_process|worker_threads|os|process|cluster|vm|crypto|perf_hooks|timers)(\/|$)/,
};

function forbiddenImports(sources: readonly SourceFile[]): { file: string; module: string; family: string }[] {
  const out: { file: string; module: string; family: string }[] = [];
  for (const { file, module } of collectImports(sources)) {
    for (const [family, re] of Object.entries(FORBIDDEN_MODULES)) if (re.test(module)) out.push({ file, module, family });
  }
  return out;
}

describe('lot 15 — dépendances interdites (UI, DB, réseau, paiements, LLM, système)', () => {
  it('aucun import interdit dans le CORE', () => {
    expect(forbiddenImports(files)).toEqual([]);
  });

  it('liste blanche : engine n’importe que du relatif et @hybridsport/domain ; domain que du relatif et zod', () => {
    const imports = collectImports(files);
    const offending = imports.filter(({ file, module }) => {
      if (module.startsWith('./') || module.startsWith('../')) return false;
      if (file.startsWith('packages/engine/src')) return module !== '@hybridsport/domain';
      return module !== 'zod';
    });
    expect(offending).toEqual([]);
  });

  it('aucun import dynamique', () => {
    expect(collectImports(files).filter((i) => i.module === '<dynamic>')).toEqual([]);
  });

  it('le domaine ne dépend pas du moteur', () => {
    expect(collectImports(domainFiles).filter((i) => i.module.includes('engine'))).toEqual([]);
  });

  it('package.json : engine → @hybridsport/domain seul ; domain → zod seul ; aucune dépendance pair ou optionnelle', () => {
    const pkg = (p: string) => JSON.parse(readFileSync(join(REPO_ROOT, p, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
    const engine = pkg('packages/engine');
    const domain = pkg('packages/domain');
    expect(Object.keys(engine.dependencies ?? {})).toEqual(['@hybridsport/domain']);
    expect(Object.keys(domain.dependencies ?? {})).toEqual(['zod']);
    for (const p of [engine, domain]) {
      expect(p.peerDependencies).toBeUndefined();
      expect(p.optionalDependencies).toBeUndefined();
    }
  });

  it('auto-test : chaque famille interdite est détectée', () => {
    const src = [
      "import 'react-native';", "import { createClient } from '@supabase/supabase-js';", "import axios from 'axios';",
      "import http from 'node:https';", "import Purchases from 'react-native-purchases';", "import Anthropic from '@anthropic-ai/sdk';",
      "import OpenAI from 'openai';", "import { readFileSync } from 'node:fs';", "export * from 'expo-router';",
      "const m = await import('pg');",
    ].join('\n');
    const families = forbiddenImports([fake(src)]).map((f) => f.family).sort();
    expect(families).toEqual(['db', 'db', 'llm', 'llm', 'network', 'network', 'payments', 'system', 'ui', 'ui']);
  });
});

describe('lot 15 — horloge, hasard, réseau et temps réel', () => {
  it('aucune lecture de l’horloge système ni hasard non injecté', () => {
    expect(findClockAndRandomUsage(files)).toEqual([]);
  });

  it('aucun global interdit (fetch, WebSocket, stockage, timers, require)', () => {
    expect(findForbiddenGlobals(files)).toEqual([]);
  });

  it('auto-test : globals interdits détectés, noms de propriétés ignorés', () => {
    const src = 'fetch("x"); setTimeout(f, 0); localStorage.getItem("k"); const o = { fetch: 1 }; o.fetch; require("fs");';
    expect(findForbiddenGlobals([fake(src)]).map((f) => f.snippet)).toEqual(['fetch', 'setTimeout', 'localStorage', 'require']);
  });

  it('le hasard n’est produit que par core/rng.ts (seule implémentation de générateur)', () => {
    const declaring = engineFiles.filter((f) => /class\s+\w*Rng\b/.test(f.text)).map((f) => f.path);
    expect(declaring).toEqual(['packages/engine/src/core/rng.ts']);
  });
});

describe('lot 15 — aucune API de désactivation de la validation', () => {
  it('aucun identifiant de contournement (skipValidation, disableRules, bypassSafety…)', () => {
    expect(findBypassIdentifiers(files)).toEqual([]);
  });

  it('aucun paramètre booléen d’API publique dont le nom évoque validation / règles / sécurité', () => {
    // Champs de SORTIE ou de métadonnées descriptives (jamais des interrupteurs d'entrée) :
    const allowed = new Set([
      'packages/engine/src/decision/admissibility.ts: readonly admissible: boolean;', // résultat de l'évaluation A1–A4
      'packages/engine/src/rules/governance.ts: hardRule: boolean;', // décrit la règle évaluée par le gate
    ]);
    const suspicious: string[] = [];
    const name = /(validat|rule|safety|hard|check|admissib|repair)/i;
    for (const f of engineFiles) {
      visit(f, (n) => {
        if ((ts.isPropertySignature(n) || ts.isParameter(n)) && n.type?.kind === ts.SyntaxKind.BooleanKeyword && name.test(n.name.getText(f.ast))) {
          const entry = `${f.path}: ${n.getText(f.ast)}`;
          if (!allowed.has(entry)) suspicious.push(entry);
        }
      });
    }
    expect(suspicious).toEqual([]);
  });

  it('le validateur ne dépend ni du réparateur, ni du pipeline, ni de l’optimisation (il contrôle, il ne propose pas)', () => {
    const validation = engineFiles.filter((f) => f.path.includes('/src/validation/'));
    const bad = collectImports(validation).filter((i) => /\/(repair|api|duration\/fit)\b|optimization/.test(i.module));
    expect(bad).toEqual([]);
    // Des leviers de compression, le validateur ne lit que le contrôle statique des déclarations (pur, sans application).
    const leverNames: string[] = [];
    for (const f of validation) {
      visit(f, (n) => {
        if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text.includes('duration/levers')) {
          const b = n.importClause?.namedBindings;
          if (b && ts.isNamedImports(b)) leverNames.push(...b.elements.map((e) => e.name.text));
        }
      });
    }
    expect(leverNames.every((x) => x.endsWith('Issues'))).toBe(true);
  });

  it('seul le pipeline orchestre (aucun module métier n’importe api/)', () => {
    const bad = collectImports(engineFiles.filter((f) => !f.path.includes('/src/api/') && !f.path.endsWith('src/index.ts')))
      .filter((i) => i.module.includes('/api/'));
    expect(bad).toEqual([]);
  });
});

describe('lot 15 — aucun paramètre ni identifiant sportif provisoire écrit en dur', () => {
  /**
   * Identifiants propres au catalogue (DONNÉES) : ils ne doivent jamais apparaître dans le code du CORE.
   * Le vocabulaire du SCHÉMA (valeurs d'enum définies par la spec dans packages/domain, ex. classe
   * d'équipement `cable`, type de mouvement `mobility`, discipline `running`) n'est pas une donnée :
   * le moteur peut s'y référer. On retire donc ce vocabulaire des identifiants de la fixture qui le réutilisent.
   */
  const schemaVocabulary = new Set<string>();
  for (const f of domainFiles) visit(f, (n) => { if (ts.isStringLiteral(n)) schemaVocabulary.add(n.text); });
  const catalogIds = new Map<string, string>();
  for (const [kind, arr] of Object.entries({ EXERCISES, PATTERNS, MUSCLES, BODY_AREAS, EQUIPMENT, PRESETS })) {
    for (const x of arr as readonly { id: string }[]) if (!schemaVocabulary.has(x.id)) catalogIds.set(x.id, kind);
  }

  it('la fixture contient bien des identifiants de données à rechercher (garde-fou du test)', () => {
    expect(catalogIds.size).toBeGreaterThan(EXERCISES.length);
  });

  it('aucun exercice ni preset (données pures) n’apparaît dans le domaine', () => {
    const data = new Set([...EXERCISES, ...(PRESETS ?? [])].map((x) => x.id));
    const found: string[] = [];
    for (const f of domainFiles) visit(f, (n) => { if (ts.isStringLiteral(n) && data.has(n.text)) found.push(`${f.path}: ${n.text}`); });
    expect(found).toEqual([]);
  });

  it('aucun identifiant d’exercice, de pattern, de muscle, de zone, d’équipement ou de preset dans le moteur', () => {
    const found: string[] = [];
    for (const f of engineFiles) {
      visit(f, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && catalogIds.has(n.text)) found.push(`${f.path}: ${n.text} (${catalogIds.get(n.text) ?? ''})`);
      });
    }
    expect(found).toEqual([]);
  });

  it('aucun identifiant de paramètre provisoire du ruleset de test hors CORE_PARAMETERS', () => {
    // Les paramètres propres aux moteurs de discipline ou aux fixtures ne sont pas connus du CORE.
    const coreDeclared = readFileSync(join(REPO_ROOT, 'packages/engine/src/rules/core-parameters.ts'), 'utf8');
    const nonCore = testRulesetDocument().parameters.map((p) => p.id).filter((id) => !coreDeclared.includes(`'${id}'`));
    const found: string[] = [];
    for (const f of files) {
      visit(f, (n) => {
        if (ts.isStringLiteral(n) && nonCore.includes(n.text)) found.push(`${f.path}: ${n.text}`);
      });
    }
    expect(found).toEqual([]);
  });

  it('aucune valeur par défaut « de secours » pour un paramètre : pas de `?? <nombre>` ni `|| <nombre>` sur une lecture du ruleset', () => {
    const found: string[] = [];
    for (const f of engineFiles) {
      visit(f, (n) => {
        if (ts.isBinaryExpression(n) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind)
          && ts.isNumericLiteral(n.right) && /ruleset|\bparam/i.test(n.left.getText(f.ast))) {
          found.push(`${f.path}: ${n.getText(f.ast).slice(0, 80)}`);
        }
      });
    }
    expect(found).toEqual([]);
  });
});
