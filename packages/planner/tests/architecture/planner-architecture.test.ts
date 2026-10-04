/**
 * Global Planner V1 — architecture :
 * - il dépend des moteurs (ports) ; AUCUN moteur ni le CORE ne dépend de lui ; seul app-core le consomme ;
 * - aucune logique sportive : il ne construit ni prescription, ni charge, ni allure, ni dose ; il ne choisit ni
 *   exercice, ni mouvement, ni station, ni archétype ; aucun nombre de récupération / espacement / priorité ;
 * - aucune horloge ni hasard ; le CORE reste l'autorité de validation (aucun appel au validateur).
 */
import { describe, expect, it } from 'vitest';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const gp = loadCoreSources(['packages/planner/src']);
/** app-core est le SEUL consommateur autorisé du planificateur (voir dependency-graph.test.ts). */
const others = loadCoreSources(['packages/domain/src', 'packages/engine/src', 'packages/strength/src', 'packages/running/src', 'packages/crosstraining/src', 'packages/hyrox/src']);
const code = (f: { text: string }) => f.text.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l)).join('\n');

describe('frontières', () => {
  it('le planificateur n’importe que du relatif, le CORE, les quatre moteurs et zod', () => {
    const allowed = ['@hybridsport/domain', '@hybridsport/engine', '@hybridsport/strength', '@hybridsport/running', '@hybridsport/crosstraining', '@hybridsport/hyrox', 'zod'];
    expect(collectImports(gp).filter(({ module }) => !(module.startsWith('./') || allowed.includes(module)))).toEqual([]);
  });

  it('ni le CORE ni aucun moteur ne dépend du planificateur ; le planificateur ne dépend pas d’app-core', () => {
    expect(collectImports(others).filter(({ module }) => module.includes('planner') && !module.startsWith('./'))).toEqual([]);
    expect(collectImports(gp).filter(({ module }) => module.includes('app-core'))).toEqual([]);
  });

  it('aucune horloge, aucun hasard, aucun global interdit, aucune API de contournement', () => {
    expect(findClockAndRandomUsage(gp)).toEqual([]);
    expect(findForbiddenGlobals(gp)).toEqual([]);
    expect(findBypassIdentifiers(gp)).toEqual([]);
  });
});

describe('aucune logique sportive déplacée dans le planificateur', () => {
  it('aucun littéral numérique non justifié (récupération, espacement, volume, priorité)', () => {
    expect(findUnjustifiedNumericLiterals(gp, [])).toEqual([]);
  });

  it('aucune construction de prescription, de charge, d’allure ou de dose ; aucun choix d’exercice, de station ou d’archétype', () => {
    // execution.ts : routage de CONTRAT (prescription LUE dans la séance générée, validée par le schéma du moteur) — règle dédiée ci-dessous.
    const hits = gp.filter((f) => !f.path.endsWith('execution.ts')).flatMap((f) => code(f).split('\n').flatMap((l, i) => (/prescription\s*:|\bkg\b|loadKg|pace|distanceM|reps\s*:|workS|requestedStation\s*:(?!\s*slot\.station)|exerciseId\s*:|archetypeId\s*:\s*['"`]|station\s*:\s*['"`]/.test(l) ? [`${f.path}:${String(i + 1)}: ${l.trim()}`] : [])));
    expect(hits).toEqual([]);
  });

  it('le planificateur ne valide ni ne répare ; la durée n’est jamais calculée hors du CORE (estimation du CORE seulement stockée par les ports)', () => {
    expect(gp.map(code).join('\n')).not.toMatch(/validateSession|repairSession|fitDuration|zSessionDraft/);
    expect(gp.filter((f) => /estimateDuration\(/.test(code(f))).map((f) => f.path)).toEqual(['packages/planner/src/ports.ts']);
    expect(code(gp.find((f) => f.path.endsWith('planner.ts')) ?? { text: '' })).not.toMatch(/estimateDuration|deriveDemandProfile|deriveSessionDemand|deriveExerciseStructures/);
  });

  it('le profil de demande vient du CORE (deriveSessionDemand), jamais d’une estimation du planificateur', () => {
    const ports = gp.find((f) => f.path.endsWith('ports.ts'));
    expect(ports?.text).toMatch(/deriveSessionDemand\(/);
    expect(gp.map(code).join('\n')).not.toMatch(/doseUnits|intensityBand|levelThresholds/);
  });

  it('réalisations : chaque constructeur valide par le schéma STRICT du moteur ; aucune valeur par défaut ni constante', () => {
    const ex = gp.find((f) => f.path.endsWith('execution.ts'));
    const text = code(ex ?? { text: '' });
    expect(text).toMatch(/zRealizedCtSession\.safeParse\(/);
    expect(text).toMatch(/zHyroxStationExecution\.safeParse\(/);
    expect(text).not.toMatch(/\?\?\s*\d|default\(/);
  });

  it('les variantes STRICTES sont utilisées pour Cross-training et HYROX (aucune substitution publiée)', () => {
    const ports = gp.find((f) => f.path.endsWith('ports.ts'));
    expect(ports?.text).toMatch(/runCrossTrainingC2\(/);
    expect(ports?.text).toMatch(/runHyroxH1\(/);
  });
});
