/**
 * Gate Course (mutation G4) — première exposition D2 (`firstExposure`, `recentTest`) testée directement :
 * toute valeur de registre illisible ⇒ refus explicite, filtre et ordre du TEST récent, trace exacte.
 */
import { describe, expect, it } from 'vitest';
import { CURRENT_RUNNING_GOVERNANCE, firstExposure, parseRunningContext, recentTest, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { RunningContext, RunningParameter, RunningReference } from '../../src/index.js';
import { ctxInput, withParameter } from '../fixtures.js';

const NOW = '2026-09-28T08:00:00Z';
const at = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const G = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const tt = (id: string, d: number, o: Partial<RunningReference> = {}): RunningReference => ({
  referenceId: id, type: 'TIME_TRIAL', values: { distanceM: 5000, durationS: 1500 }, date: at(d) as RunningReference['date'],
  provenance: { source: 'APP_RECORDED' }, confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'NONE' }, ...o,
});
const ctx = (refs: RunningReference[]): RunningContext => {
  const r = parseRunningContext({ ...ctxInput({ population: { level: 'P_R3', hybrid: false } }), references: refs });
  if (!r.ok) throw new Error('contexte invalide');
  return r.context;
};
const fe = (o: { refs?: RunningReference[]; parameters?: readonly RunningParameter[]; archetype?: 'THRESHOLD' | 'SEVERE' | 'SHORT_INTERVAL' | 'HILLS'; level?: 'P_R2' | 'P_R3' | 'P_R4' } = {}) =>
  firstExposure({ archetype: o.archetype ?? 'THRESHOLD', level: o.level ?? 'P_R3', ctx: ctx(o.refs ?? [tt('t', 3)]), now: NOW, parameters: o.parameters ?? G.parameters, mode: 'CANDIDATE' });
const refusal = (r: ReturnType<typeof fe>) => (r.status === 'refused' ? r.reasons.find((x) => x.code === RUNNING_CODES.FIRST_EXPOSURE_REFUSED)?.params : undefined);
const cause = (r: ReturnType<typeof fe>) => refusal(r)?.cause ?? 'APPLIED';
const THR = 'running.firstExposure.threshold';
const valueOf = (id: string) => { const p = G.parameters.find((x) => x.parameterId === id); return (p?.value.status === 'candidate' ? p.value.value : {}) as Record<string, unknown>; };
const patch = (id: string, v: unknown): readonly RunningParameter[] => withParameter(G, id, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: v } })).parameters;

describe('application : trace exacte', () => {
  it('structure du registre, test retenu, paramètres utilisés, raison appliquée', () => {
    const r = fe();
    expect(r).toEqual({
      status: 'applied', structure: { warmupS: 600, reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog', cooldownS: 300 }, parameterId: THR, testReferenceId: 't', testDate: at(3),
      parameterIds: [THR, 'running.reference.recencyBands'], reasons: expect.arrayContaining([expect.objectContaining({ code: RUNNING_CODES.FIRST_EXPOSURE_APPLIED, params: { archetype: 'THRESHOLD', level: 'P_R3', parameterId: THR, testReferenceId: 't' } })]),
    });
    expect(r.reasons.filter((x) => x.code === RUNNING_CODES.CANDIDATE_VALUE_USED).map((x) => x.params.parameterId)).toEqual([THR, 'running.reference.recencyBands']);
    expect(fe({ archetype: 'SHORT_INTERVAL', level: 'P_R2' })).toMatchObject({ status: 'applied', parameterId: 'running.firstExposure.severe', structure: { reps: 10, workS: 30 } });
  });
});

describe('refus explicites (fail-closed)', () => {
  it('paramètre non résolu (registre expert) : cause et raisons du résolveur', () => {
    const r = fe({ parameters: CURRENT_RUNNING_GOVERNANCE.parameters });
    expect(refusal(r)).toEqual({ archetype: 'THRESHOLD', parameterId: THR, cause: 'PARAMETER_UNRESOLVED' });
    expect(r.reasons.map((x) => x.code)).toContain(RUNNING_CODES.UNRESOLVED_PARAMETER);
  });

  it('côtes : BLOCKED_PENDING_SOURCES ; politique inconnue ⇒ VALUE_UNREADABLE', () => {
    expect(refusal(fe({ archetype: 'HILLS' }))).toEqual({ archetype: 'HILLS', parameterId: 'running.firstExposure.hills', cause: 'BLOCKED_PENDING_SOURCES' });
    expect(cause(fe({ archetype: 'HILLS', parameters: patch('running.firstExposure.hills', { policy: 'OTHER' }) }))).toBe('VALUE_UNREADABLE');
  });

  const base = valueOf(THR);
  const req = base.requires as Record<string, unknown>;
  it.each([
    null, 'x',
    { ...base, requires: undefined }, { ...base, requires: { ...req, referenceType: 5 } }, { ...base, requires: { ...req, distancesM: 5000 } },
    { ...base, requires: { ...req, distancesM: [] } }, { ...base, requires: { ...req, distancesM: [5000, 0] } }, { ...base, requires: { ...req, distancesM: ['5000'] } },
    { ...base, requires: { ...req, recencyBand: 'AGING' } },
    { ...base, byLevel: undefined }, { ...base, byLevel: null }, { ...base, byLevel: 'x' }, { ...base, byLevel: { P_R2: (base.byLevel as Record<string, unknown>).P_R2 } },
    { ...base, byLevel: { P_R3: { reps: 1, workS: 1200 } } }, { ...base, byLevel: { P_R3: { reps: 4, workS: 300 } } },
    { requires: req, byArchetype: { SEVERE: { byLevel: {} } } },
  ])('valeur illisible %j ⇒ VALUE_UNREADABLE', (v) => {
    expect(cause(fe({ parameters: patch(THR, v) }))).toBe('VALUE_UNREADABLE');
  });

  it('byArchetype sans l’archétype demandé ⇒ VALUE_UNREADABLE', () => {
    const sev = valueOf('running.firstExposure.severe');
    expect(cause(fe({ archetype: 'SHORT_INTERVAL', parameters: patch('running.firstExposure.severe', { ...sev, byArchetype: { SEVERE: (sev.byArchetype as Record<string, unknown>).SEVERE } }) }))).toBe('VALUE_UNREADABLE');
  });

  it('récence V12 absente ou illisible ⇒ RECENCY_UNRESOLVED (raisons conservées)', () => {
    const noV12 = G.parameters.filter((p) => p.parameterId !== 'running.reference.recencyBands');
    const r = fe({ parameters: noV12 });
    expect(cause(r)).toBe('RECENCY_UNRESOLVED');
    expect(r.reasons.map((x) => x.code)).toEqual(expect.arrayContaining([RUNNING_CODES.CANDIDATE_VALUE_USED, RUNNING_CODES.UNRESOLVED_PARAMETER]));
    for (const w of [0, -1, '8', null]) expect(cause(fe({ parameters: patch('running.reference.recencyBands', { recentMaxWeeks: w, agingMaxWeeks: 16 }) }))).toBe('RECENCY_UNRESOLVED');
  });

  it('aucun test récent ⇒ RECENT_TEST_REQUIRED (raisons des paramètres conservées)', () => {
    const r = fe({ refs: [] });
    expect(cause(r)).toBe('RECENT_TEST_REQUIRED');
    expect(r.reasons.filter((x) => x.code === RUNNING_CODES.CANDIDATE_VALUE_USED)).toHaveLength(2);
  });
});

describe('TEST récent (recentTest)', () => {
  const REQ = { referenceType: 'TIME_TRIAL', distancesM: [5000, 10000], recencyBand: 'RECENT' };
  const pick = (refs: RunningReference[]) => recentTest(refs, REQ, 8, NOW)?.referenceId;
  it('type, distance, non future (instant présent inclus), bande (8 semaines incluses), sans interruption', () => {
    expect(pick([tt('a', 3, { type: 'RACE_RESULT' })])).toBeUndefined();
    expect(pick([tt('a', 3, { values: { durationS: 1500, paceSecPerKm: 300 } })])).toBeUndefined();
    expect(pick([tt('a', 3, { values: { distanceM: 3000, durationS: 700 } })])).toBeUndefined();
    expect(pick([tt('a', 0)])).toBe('a');
    expect(pick([tt('a', -0.01)])).toBeUndefined();
    expect(pick([tt('a', 56)])).toBe('a');
    expect(pick([tt('a', 56.01)])).toBeUndefined();
    expect(pick([tt('a', 3, { confidenceInputs: { protocolDeclared: true, conditions: 'NORMAL', interruptionSince: 'UNKNOWN' } })])).toBeUndefined();
  });

  it('le plus récent ; même date : identifiant le plus petit ; indépendant de l’ordre', () => {
    for (const refs of [[tt('a', 9), tt('b', 4)], [tt('b', 4), tt('a', 9)]]) expect(pick(refs)).toBe('b');
    for (const refs of [[tt('b', 4), tt('a', 4), tt('c', 4)], [tt('c', 4), tt('a', 4), tt('b', 4)], [tt('a', 4), tt('c', 4), tt('b', 4)]]) expect(pick(refs)).toBe('a');
  });
});
