/**
 * Global Planner V1 — architecture :
 * - il dépend des moteurs (ports) mais AUCUN moteur, ni le CORE, ni app-core ne dépend de lui ;
 * - aucune logique sportive : il ne construit ni prescription, ni charge, ni allure, ni dose ; il ne choisit ni
 *   exercice, ni mouvement, ni station, ni archétype ; aucun nombre de récupération / espacement / priorité ;
 * - aucune horloge ni hasard ; le CORE reste l'autorité de validation (aucun appel au validateur).
 */
import { describe, expect, it } from 'vitest';
import { collectImports, findBypassIdentifiers, findClockAndRandomUsage, findForbiddenGlobals, findUnjustifiedNumericLiterals, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

const gp = loadCoreSources(['packages/planner/src']);
const others = loadCoreSources(['packages/domain/src', 'packages/engine/src', 'packages/strength/src', 'packages/running/src', 'packages/crosstraining/src', 'packages/hyrox/src', 'packages/app-core/src']);
const code = (f: { text: string }) => f.text.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*\*)/.test(l)).join('\n');

describe('frontières', () => {
  it('le planificateur n’importe que du relatif, le CORE, les quatre moteurs et zod', () => {
    const allowed = ['@hybridsport/domain', '@hybridsport/engine', '@hybridsport/strength', '@hybridsport/running', '@hybridsport/crosstraining', '@hybridsport/hyrox', 'zod'];
    expect(collectImports(gp).filter(({ module }) => !(module.startsWith('./') || allowed.includes(module)))).toEqual([]);
  });

  it('personne ne dépend du planificateur (CORE, moteurs, app-core)', () => {
    expect(collectImports(others).filter(({ module }) => module.includes('planner') && !module.startsWith('./'))).toEqual([]);
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
    const hits = gp.flatMap((f) => code(f).split('\n').flatMap((l, i) => (/prescription\s*:|\bkg\b|loadKg|pace|distanceM|reps\s*:|workS|requestedStation\s*:|exerciseId\s*:|archetypeId\s*:\s*['"`]/.test(l) ? [`${f.path}:${String(i + 1)}: ${l.trim()}`] : [])));
    expect(hits).toEqual([]);
  });

  it('le planificateur ne valide ni ne répare : aucun appel au validateur, à la réparation ou à l’estimation de durée', () => {
    const text = gp.map(code).join('\n');
    expect(text).not.toMatch(/validateSession|repairSession|estimateDuration|fitDuration|zSessionDraft/);
  });

  it('les variantes STRICTES sont utilisées pour Cross-training et HYROX (aucune substitution publiée)', () => {
    const ports = gp.find((f) => f.path.endsWith('ports.ts'));
    expect(ports?.text).toMatch(/runCrossTrainingC2\(/);
    expect(ports?.text).toMatch(/runHyroxH1\(/);
  });
});
