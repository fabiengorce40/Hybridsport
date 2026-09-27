/**
 * Architecture du StrengthEngine (spec 4B étapes 2, 6, 7, 22) : dépendances à sens unique, aucune
 * constante sportive cachée, aucune horloge ni hasard, invariant anti-biais de la sélection, et
 * séparation moteur / ProgressionEngine.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources, REPO_ROOT, visit,
} from '../../../engine/tests/architecture/source-scanner.js';
import { STRENGTH_PARAMETER_SCHEMAS } from '../../src/index.js';

const STRENGTH = loadCoreSources(['packages/strength/src']);
const CORE = loadCoreSources();
const file = (name: string) => { const f = STRENGTH.find((x) => x.path.endsWith(`/src/${name}`)); if (!f) throw new Error(name); return f; };

describe('dépendances', () => {
  it('le CORE (domain, engine) n’importe JAMAIS le package strength', () => {
    expect(collectImports(CORE).filter((i) => i.module.includes('strength'))).toEqual([]);
  });

  it('strength n’importe que domain, engine, zod et ses propres modules', () => {
    const external = collectImports(STRENGTH).filter((i) => !i.module.startsWith('./')).map((i) => i.module);
    expect([...new Set(external)].sort()).toEqual(['@hybridsport/domain', '@hybridsport/engine', 'zod']);
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'packages/strength/package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@hybridsport/domain', '@hybridsport/engine', 'zod']);
    const core = JSON.parse(readFileSync(join(REPO_ROOT, 'packages/engine/package.json'), 'utf8')) as { dependencies?: Record<string, string> };
    expect(Object.keys(core.dependencies ?? {})).not.toContain('@hybridsport/strength');
  });

  it('le moteur (engine.ts) n’importe pas le ProgressionEngine : il applique nextPrescription, il ne gère pas les tracks', () => {
    expect(collectImports([file('engine.ts')]).map((i) => i.module)).not.toContain('./progression.js');
    const others = STRENGTH.filter((f) => !f.path.endsWith('progression.ts') && !f.path.endsWith('index.ts'));
    expect(collectImports(others).filter((i) => i.module === './progression.js')).toEqual([]);
  });
});

describe('déterminisme et pureté', () => {
  it('aucune horloge, aucun hasard non injecté, aucun réseau / stockage / minuterie', () => {
    expect(STRENGTH.length).toBeGreaterThan(10);
    expect(findClockAndRandomUsage(STRENGTH)).toEqual([]);
    expect(findForbiddenGlobals(STRENGTH)).toEqual([]);
  });

  it('aucun identifiant de contournement de validation (le moteur propose, le CORE valide)', () => {
    expect(findBypassIdentifiers(STRENGTH)).toEqual([]);
  });

  it('le moteur ne se déclare jamais valide : aucun appel au validateur ni au pipeline du CORE', () => {
    const calls: string[] = [];
    for (const f of STRENGTH) visit(f, (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['validateSession', 'runCorePipeline', 'runSportSession', 'repairSession', 'acceptProposal'].includes(n.expression.text)) calls.push(`${f.path}: ${n.expression.text}`);
    });
    expect(calls).toEqual([]);
  });
});

describe('aucune constante sportive cachée (spec 09 §3.1)', () => {
  it('aucun littéral numérique non justifié dans packages/strength/src (hors 0 et 1)', () => {
    expect(findUnjustifiedNumericLiterals(STRENGTH, [])).toEqual([]);
  });

  it('tout paramètre strength.* cité dans les sources est déclaré (gouvernance) ; aucun paramètre déclaré n’est mort', () => {
    const declared = new Set(Object.keys(STRENGTH_PARAMETER_SCHEMAS));
    const cited = new Set<string>();
    for (const f of STRENGTH.filter((x) => !x.path.endsWith('params.ts'))) visit(f, (n) => {
      if (ts.isStringLiteral(n) && /^strength\.[a-zA-Z.]+$/.test(n.text) && !n.text.startsWith('strength.rule')) cited.add(n.text);
    });
    const citedParams = [...cited].filter((c) => !/^strength\.(sessionCap|intensity|rampup|loadMode|noviceTechnical|maxEffort)$/.test(c));
    expect(citedParams.filter((c) => !declared.has(c) && !c.startsWith('strength.rules.'))).toEqual([]);
    expect([...declared].filter((d) => !cited.has(d)).sort()).toEqual([]);
  });
});

describe('invariant anti-biais de la sélection (spec 4B étape 6)', () => {
  it('selection.ts ne lit jamais la classe d’équipement, le modèle de charge, l’équipement requis comme critère, ni loadable', () => {
    const forbidden = ['loadModel', 'equipmentClass', 'loadable', 'machine', 'cable', 'barbell', 'dumbbell'];
    const hits: string[] = [];
    visit(file('selection.ts'), (n) => {
      if (ts.isPropertyAccessExpression(n) && forbidden.includes(n.name.text)) hits.push(n.getText());
      if (ts.isStringLiteral(n) && forbidden.some((w) => n.text.includes(w))) hits.push(n.text);
    });
    expect(hits).toEqual([]);
  });

  it('aucune somme pondérée ni bonus dans la sélection : aucun identifiant score / bonus / poids, aucune multiplication', () => {
    const hits: string[] = [];
    visit(file('selection.ts'), (n) => {
      if (ts.isIdentifier(n) && /score|bonus|weight/i.test(n.text)) hits.push(n.text);
      if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.PlusEqualsToken].includes(n.operatorToken.kind) && !n.getText().includes('load +=')) hits.push(n.getText());
    });
    expect(hits).toEqual([]);
  });
});

describe('règles contradictoires éliminées (addendum V1.2 §11)', () => {
  it('le dosage ne relit jamais séries ni RIR de la track (trois autorités, §1)', () => {
    const hits: string[] = [];
    visit(file('dose.ts'), (n) => {
      if (ts.isPropertyAccessExpression(n) && ['sets', 'rir'].includes(n.name.text) && /next|nextPrescription/.test(n.expression.getText())) hits.push(n.getText());
    });
    expect(hits).toEqual([]);
  });

  it('la génération ne lit aucun identifiant de préréglage (décision B, §9) : seul l’audit de couverture du catalogue les consulte', () => {
    const readers = STRENGTH.filter((f) => /preset/i.test(f.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))).map((f) => f.path.split('/').pop());
    expect(readers.sort()).toEqual(['archetypes.ts', 'params.ts']);
    const gen = ['engine.ts', 'selection.ts', 'candidates.ts', 'dose.ts', 'load.ts', 'model.ts', 'context.ts', 'intent-contract.ts'];
    for (const g of gen) expect(/preset/i.test(file(g).text), g).toBe(false);
  });
});
