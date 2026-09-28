/**
 * Phase 6B — architecture du RunningEngine :
 * - la science Running ne fuit pas dans le CORE ; Strength ne dépend pas de Running ;
 * - Running ne contourne ni le validateur du CORE ni le DurationEngine ;
 * - aucune valeur de programmation en dur dans les fichiers d'algorithme (seul le registre porte des valeurs candidates) ;
 * - aucune horloge, aucun hasard non injecté.
 */
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources, visit } from '../../../engine/tests/architecture/source-scanner.js';

const running = loadCoreSources(['packages/running/src']);
const core = loadCoreSources(['packages/domain/src', 'packages/engine/src']);
const strength = loadCoreSources(['packages/strength/src']);
/** Seul fichier de données autorisé à porter des valeurs numériques de programmation (candidates, gouvernées). */
const REGISTRY_DATA = 'packages/running/src/governance/registry-v1-candidate.ts';
const algorithms = running.filter((f) => f.path !== REGISTRY_DATA);

describe('frontières de dépendances', () => {
  it('Running n’importe que du relatif, @hybridsport/domain, @hybridsport/engine et zod', () => {
    const bad = collectImports(running).filter(({ module }) => !(module.startsWith('./') || module.startsWith('../') || ['@hybridsport/domain', '@hybridsport/engine', 'zod'].includes(module)));
    expect(bad).toEqual([]);
  });

  it('ni le CORE ni Strength ne dépendent de Running', () => {
    expect(collectImports([...core, ...strength]).filter(({ module }) => module.includes('running'))).toEqual([]);
  });

  it('la science Running ne fuit pas dans le CORE (populations, politiques G1, paramètres running.*)', () => {
    const leaks = core.flatMap((f) => f.text.split('\n').flatMap((l, i) => (/P_R[0-4]|P-R[0-4]|G1-(PAIN|SCOPE|NOVICE|RETURN)|running\.(novice|return|target|reference|load|progression|taper)\.|E-(PROG|LONG|TAPER|FIRST|MODEL)/.test(l) ? [`${f.path}:${String(i + 1)}`] : [])));
    expect(leaks).toEqual([]);
  });

  it('aucune horloge système, aucun hasard non injecté, aucun global interdit, aucune API de contournement', () => {
    expect(findClockAndRandomUsage(running)).toEqual([]);
    expect(findForbiddenGlobals(running)).toEqual([]);
    expect(findBypassIdentifiers(running)).toEqual([]);
  });
});

describe('aucune valeur magique', () => {
  it('aucun littéral numérique non justifié dans les fichiers d’algorithme (hors 0 et 1)', () => {
    expect(findUnjustifiedNumericLiterals(algorithms, [])).toEqual([]);
  });

  it('les valeurs non résolues de la phase 5 n’apparaissent nulle part en dur (exposant 1,06, repli 2/3/4 %, variabilité constante)', () => {
    const hits = running.flatMap((f) => f.text.split('\n').flatMap((l, i) => (/\b1\.06\b|const\s+\w*(variability|exponent|magnitude|noviceDose|returnDose)\w*\s*=\s*[\d.]/i.test(l) ? [`${f.path}:${String(i + 1)}: ${l.trim()}`] : [])));
    expect(hits).toEqual([]);
  });

  it('le registre de données ne contient aucun nombre dans les entrées non résolues', () => {
    const reg = running.find((f) => f.path === REGISTRY_DATA);
    expect(reg).toBeDefined();
    const unresolvedLines = (reg?.text ?? '').split('\n').filter((l) => /unresolvedReason|tag: 'V(23|28|31|32|33|34|35|36|37|39|40|41)'/.test(l) && !/candidate:/.test(l));
    for (const l of unresolvedLines) expect(l).not.toMatch(/candidate:/);
  });
});

describe('aucun contournement du CORE', () => {
  it('Running ne se valide pas lui-même et n’émet aucune proposition de séance en vague 1', () => {
    const text = algorithms.map((f) => f.text).join('\n');
    expect(text).not.toMatch(/status:\s*'proposals'/);
    expect(text).not.toMatch(/validateSession|zSessionDraft\.parse|status:\s*'VALID'/);
  });

  it('Running ne calcule aucune durée (le DurationEngine reste l’unique autorité)', () => {
    const defined: string[] = [];
    for (const f of algorithms) visit(f, (n) => {
      if ((ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) && n.name && ts.isIdentifier(n.name) && /duration|estimate(?!Variability)/i.test(n.name.text) && !/^(RunningPerformanceVariabilityEstimate|PerformanceEstimate)$/.test(n.name.text)) defined.push(`${f.path}:${n.name.text}`);
    });
    expect(defined).toEqual([]);
    expect(collectImports(algorithms).filter(({ module }) => module.includes('duration'))).toEqual([]);
  });
});
