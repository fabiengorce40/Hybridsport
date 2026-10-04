/**
 * C1 — frontière du contexte : strict, aucun champ complété par défaut ; séance réalisée = prescription + résultat
 * distincts, cohérents avec la définition du format.
 */
import { describe, expect, it } from 'vitest';
import { RESULT_KINDS_BY_FORMAT, parseCrossTrainingContext, resultIssues } from '../../src/index.js';
import type { CtPrescription } from '../../src/index.js';
import { ctxInput, realized } from '../fixtures.js';

const problems = (raw: unknown) => {
  const r = parseCrossTrainingContext(raw);
  return r.ok ? [] : r.reasons.map((x) => `${String(x.params.path)} : ${String(x.params.problem)}`);
};

describe('contexte strict', () => {
  it('contexte complet accepté ; séance réalisée et benchmark acceptés', () => {
    expect(problems(ctxInput())).toEqual([]);
    expect(problems(ctxInput({ sessionHistory: [realized({ sessionRpe: 7, pain: 'NONE' })] as never }))).toEqual([]);
    expect(problems(ctxInput({ benchmarks: [{ benchmarkId: 'b1', at: '2026-09-01T08:00:00Z', prescription: { format: 'for_time', rounds: 3, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 10 } }] }, result: { kind: 'time', completionS: 400 } }] }))).toEqual([]);
  });

  it('AUCUN champ n’a de valeur par défaut : chaque champ manquant est refusé', () => {
    for (const key of Object.keys(ctxInput())) {
      const raw = Object.fromEntries(Object.entries(ctxInput()).filter(([k]) => k !== key));
      const r = parseCrossTrainingContext(raw);
      expect(r.ok, key).toBe(false);
      if (!r.ok) expect(r.reasons.every((x) => x.code === 'TECHNICAL.SCHEMA_INVALID')).toBe(true);
    }
  });

  it('clés inconnues, niveau, objectif, mode, capacité ou reprise inconnus ⇒ refus', () => {
    expect(problems({ ...ctxInput(), extra: 1 })).toHaveLength(1);
    expect(problems(ctxInput({ population: { level: 'elite' as never, hybrid: false } }))[0]).toMatch(/^disciplineContext\.population\.level/);
    expect(problems(ctxInput({ goal: { type: 'HYROX' as never } }))).toHaveLength(1);
    expect(problems(ctxInput({ mode: 'SIMULATION' as never }))).toHaveLength(1);
    expect(problems(ctxInput({ capabilityRequests: ['ctEverything' as never] }))).toHaveLength(1);
    expect(problems(ctxInput({ returnState: { state: 'MAYBE' as never } }))).toHaveLength(1);
    expect(problems('x')).toHaveLength(1);
    expect(problems(null)).toHaveLength(1);
  });
});

describe('séance réalisée : prescription ≠ résultat', () => {
  const bad = (o: Record<string, unknown>) => problems(ctxInput({ sessionHistory: [realized(o)] as never }));

  it('le résultat doit correspondre à la définition du format', () => {
    expect(bad({ result: { kind: 'time', completionS: 600 } })).toEqual(['disciplineContext.sessionHistory.0.result : résultat time incompatible avec le format amrap']);
    expect(bad({ result: { kind: 'abandoned' }, completion: 'abandoned' })).toEqual([]);
    // Complétion déclarée cohérente avec le résultat : un abandon n'est jamais « tel que prescrit ».
    expect(bad({ result: { kind: 'abandoned' } })).toEqual(['disciplineContext.sessionHistory.0.completion : complétion « abandoned » ⇔ résultat « abandoned »']);
  });

  it('les champs d’estimation ou de résultat ne peuvent pas entrer dans la prescription (et inversement)', () => {
    expect(bad({ prescription: { format: 'amrap', durationS: 600, workRate: 12, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 5 } }] } }).length).toBeGreaterThan(0);
    expect(bad({ result: { kind: 'rounds_reps', rounds: 5, reps: 3, load: 40 } }).length).toBeGreaterThan(0);
    expect(bad({ prescription: { format: 'amrap', durationS: 600, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 5 }, roundsCompleted: 3 }] } }).length).toBeGreaterThan(0);
  });

  it('valeurs impossibles refusées (RPE hors CR10, reps non entières, quantités non positives, liste vide)', () => {
    expect(bad({ sessionRpe: 11 })).toHaveLength(1);
    expect(bad({ sessionRpe: -1 })).toHaveLength(1);
    expect(bad({ sessionRpe: 10 })).toEqual([]);
    expect(bad({ prescription: { format: 'amrap', durationS: 600, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 2.5 } }] } })).toHaveLength(1);
    expect(bad({ prescription: { format: 'amrap', durationS: 0, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 2 } }] } })).toHaveLength(1);
    expect(bad({ prescription: { format: 'amrap', durationS: 60, items: [] } })).toHaveLength(1);
    expect(bad({ prescription: { format: 'amrap', durationS: 60, items: [{ exerciseId: 'e', quantity: { kind: 'calories', value: Number.POSITIVE_INFINITY } }] } }).length).toBeGreaterThan(0);
    expect(bad({ pain: 'P9' })).toHaveLength(1);
  });

  it('cohérences définitionnelles de resultIssues', () => {
    const ft = (timeCapS?: number): CtPrescription => ({ format: 'for_time', rounds: 1, ...(timeCapS === undefined ? {} : { timeCapS }), items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 1 } }] });
    const item = [{ exerciseId: 'e', quantity: { kind: 'reps' as const, value: 1 } }];
    expect(resultIssues(ft(300), { kind: 'time', completionS: 301 })).toEqual(['temps supérieur au time cap : le résultat est « capped »']);
    expect(resultIssues(ft(300), { kind: 'time', completionS: 300 })).toEqual([]);
    expect(resultIssues(ft(), { kind: 'time', completionS: 9999 })).toEqual([]);
    expect(resultIssues(ft(), { kind: 'capped', repsCompleted: 3 })).toEqual(['résultat « capped » sans time cap prescrit']);
    expect(resultIssues(ft(300), { kind: 'capped', repsCompleted: 3 })).toEqual([]);
    expect(resultIssues({ format: 'emom', minutes: 10, items: item }, { kind: 'emom', minutesCompleted: 11 })).toEqual(['plus de minutes réalisées que prescrites']);
    expect(resultIssues({ format: 'emom', minutes: 10, items: item }, { kind: 'emom', minutesCompleted: 10 })).toEqual([]);
    expect(resultIssues({ format: 'intervals', rounds: 4, workS: 30, restS: 30, items: item }, { kind: 'intervals', intervalsCompleted: 5 })).toEqual(['plus d’intervalles réalisés que prescrits']);
    expect(resultIssues({ format: 'intervals', rounds: 4, workS: 30, restS: 30, items: item }, { kind: 'intervals', intervalsCompleted: 4 })).toEqual([]);
    expect(resultIssues({ format: 'continuous', durationS: 600, items: item }, { kind: 'total' })).toEqual(['total sans mesure']);
    expect(resultIssues({ format: 'continuous', durationS: 600, items: item }, { kind: 'total', distanceM: 2000 })).toEqual([]);
    expect(resultIssues({ format: 'continuous', durationS: 600, items: item }, { kind: 'total', calories: 50 })).toEqual([]);
  });

  it('chaque format accepte « abandoned » et au moins un résultat mesuré', () => {
    for (const kinds of Object.values(RESULT_KINDS_BY_FORMAT)) {
      expect(kinds).toContain('abandoned');
      expect(kinds.length).toBeGreaterThan(1);
    }
  });

  it('un benchmark incohérent est refusé comme une séance', () => {
    const r = problems(ctxInput({ benchmarks: [{ benchmarkId: 'b', at: '2026-09-01T08:00:00Z', prescription: { format: 'amrap', durationS: 600, items: [{ exerciseId: 'e', quantity: { kind: 'reps', value: 5 } }] }, result: { kind: 'time', completionS: 1 } }] }));
    expect(r).toEqual(['disciplineContext.benchmarks.0.result : résultat time incompatible avec le format amrap']);
  });
});
