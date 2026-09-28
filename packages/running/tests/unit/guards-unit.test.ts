/**
 * Gate Course (mutation G4) — gardes de forte demande (`qualityGuards`, `returnLifted`) testées directement :
 * niveau minimal par archétype, §K, §M, §N, §X, §Q, V10 (fenêtre et valeurs illisibles), V11, trace exacte.
 */
import { describe, expect, it } from 'vitest';
import { CURRENT_RUNNING_GOVERNANCE, HIGH_DEMAND_ARCHETYPES, parseRunningContext, qualityGuards, returnLifted, RUNNING_CODES, withProductDecisions } from '../../src/index.js';
import type { ConfidenceLevel, GuardedArchetype, RunningContext, RunningContextInput, RunningParameter } from '../../src/index.js';
import { ctxInput, withParameter } from '../fixtures.js';

const NOW = '2026-09-28T08:00:00Z';
const at = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z');
const G = withProductDecisions(CURRENT_RUNNING_GOVERNANCE);
const V10 = 'running.hi.densityPolicy';
const V11 = 'running.placement.strongDefaultSeparation';
const RESUME = 'running.return.resumeCondition';
type H = NonNullable<RunningContextInput['sessionHistory']>[number];
const h = (id: string, d: number, o: Partial<H> = {}): H => ({ sessionId: id, archetype: 'THRESHOLD', structureFamily: 'INTERVALS', completedAt: at(d), realizedDurationS: 2400, completion: 'COMPLETED', ...o });
const ctx = (o: Partial<RunningContextInput> = {}, history: H[] = []): RunningContext => {
  const r = parseRunningContext({ ...ctxInput({ population: { level: 'P_R3', hybrid: false }, terrain: { hills: true }, ...o }), sessionHistory: history });
  if (!r.ok) throw new Error('contexte invalide');
  return r.context;
};
const guard = (a: GuardedArchetype, c: RunningContext, o: { family?: 'CONTINUOUS' | 'INTERVALS'; conf?: ConfidenceLevel; parameters?: readonly RunningParameter[] } = {}) =>
  qualityGuards({ archetype: a, family: o.family ?? 'INTERVALS', ctx: c, now: NOW, parameters: o.parameters ?? G.parameters, thresholdReferenceConfidence: o.conf ?? 'NONE' });
const failed = (r: ReturnType<typeof guard>) => r.reasons.find((x) => x.code === RUNNING_CODES.QUALITY_GUARD_FAILED)?.params;
const rule = (r: ReturnType<typeof guard>) => (r.ok ? 'OK' : String(failed(r)?.rule));
const patch = (id: string, v: unknown) => withParameter(G, id, (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: v } })).parameters;
const lvl = (level: 'P_R0' | 'P_R1' | 'P_R2' | 'P_R3' | 'P_R4') => ({ population: { level, hybrid: false } });

describe('liste HIGH_DEMAND (§S)', () => {
  it('exactement : seuil, sévère, intervalles courts, côtes, allure spécifique, sortie longue, test', () => {
    expect(HIGH_DEMAND_ARCHETYPES).toEqual(['THRESHOLD', 'SEVERE', 'SHORT_INTERVAL', 'HILLS', 'RACE_PACE', 'LONG', 'TEST']);
  });
});

describe('niveau minimal (§G.3, §Q) et règles qualitatives', () => {
  it.each([
    ['THRESHOLD', 'P_R1', 'P_R2'], ['SEVERE', 'P_R1', 'P_R2'], ['SHORT_INTERVAL', 'P_R1', 'P_R2'], ['HILLS', 'P_R1', 'P_R2'], ['LONG', 'P_R0', 'P_R1'], ['TEST', 'P_R0', 'P_R1'],
  ] as const)('%s : %s refusé, %s accepté', (a, below, min) => {
    const r = guard(a, ctx({ ...lvl(below), goal: { type: 'FIVE_K' } }));
    expect(failed(r)).toEqual({ archetype: a, rule: 'G3_POPULATION', detail: below });
    expect(rule(guard(a, ctx({ ...lvl(min), goal: { type: 'FIVE_K' } })))).toBe('OK');
  });

  it('§K : seuil continu en P-R2 seulement avec une confiance ≥ MEDIUM ; P-R3 sans condition', () => {
    expect(failed(guard('THRESHOLD', ctx(lvl('P_R2')), { family: 'CONTINUOUS', conf: 'LOW' }))).toEqual({ archetype: 'THRESHOLD', rule: 'K_CONTINUOUS_LEVEL', detail: 'P_R2/LOW' });
    expect(rule(guard('THRESHOLD', ctx(lvl('P_R2')), { family: 'CONTINUOUS', conf: 'MEDIUM' }))).toBe('OK');
    expect(rule(guard('THRESHOLD', ctx(lvl('P_R3')), { family: 'CONTINUOUS', conf: 'NONE' }))).toBe('OK');
    expect(rule(guard('THRESHOLD', ctx(lvl('P_R2')), { family: 'INTERVALS', conf: 'NONE' }))).toBe('OK');
  });

  it('§M : intervalles courts pour 5K, 10K, course générale ; jamais semi ni marathon', () => {
    for (const goal of ['FIVE_K', 'TEN_K', 'GENERAL_RUNNING'] as const) expect(rule(guard('SHORT_INTERVAL', ctx({ goal: { type: goal } })))).toBe('OK');
    for (const goal of ['HALF_MARATHON', 'MARATHON'] as const) expect(failed(guard('SHORT_INTERVAL', ctx({ goal: { type: goal } })))).toEqual({ archetype: 'SHORT_INTERVAL', rule: 'G3_GOAL', detail: goal });
  });

  it('§N : côtes sans terrain déclaré ⇒ refus', () => {
    expect(failed(guard('HILLS', ctx({ terrain: { hills: false } })))).toEqual({ archetype: 'HILLS', rule: 'N_TERRAIN_UNDECLARED', detail: 'hills' });
  });
});

describe('reprise (§X, §Q)', () => {
  const ret = (state: 'SHORT' | 'MODERATE' | 'LONG' | 'UNKNOWN', history: H[] = [], since: string | null = at(20)) =>
    ctx({ returnState: { state, postReturnSessions: 1 }, ...(since !== null ? { recentLoad: { returnStartedAt: since, dimensions: [] } } : {}) }, history);
  const clean2 = [h('e1', 12, { archetype: 'EASY', structureFamily: 'CONTINUOUS' }), h('e2', 9, { archetype: 'EASY', structureFamily: 'CONTINUOUS' })];

  it('LONG, UNKNOWN : toute forte demande refusée', () => {
    for (const s of ['LONG', 'UNKNOWN'] as const) expect(failed(guard('THRESHOLD', ret(s, clean2)))).toEqual({ archetype: 'THRESHOLD', rule: 'X_RETURN_STATE', detail: s });
  });

  it('MODERATE : seuil permis sans levée ; sévère, sortie longue, test après levée seulement', () => {
    const r = guard('THRESHOLD', ret('MODERATE'));
    expect(r.ok).toBe(true);
    expect(r.parameterIds).toEqual([V10, V11]);
    for (const a of ['SEVERE', 'LONG', 'TEST'] as const) {
      const x = guard(a, ret('MODERATE'));
      expect(failed(x)).toEqual({ archetype: a, rule: 'X_RETURN_NOT_LIFTED', detail: 'MODERATE' });
      expect(x.parameterIds).toEqual([RESUME]);
      const lifted = guard(a, ret('MODERATE', clean2));
      expect(lifted.ok).toBe(true);
      expect(lifted.parameterIds).toEqual([RESUME, V10, V11]);
    }
  });

  it('SHORT : le TEST exige la levée ; les autres non', () => {
    expect(failed(guard('TEST', ret('SHORT')))).toEqual({ archetype: 'TEST', rule: 'X_RETURN_NOT_LIFTED', detail: 'SHORT' });
    expect(guard('TEST', ret('SHORT', clean2)).ok).toBe(true);
    expect(guard('SEVERE', ret('SHORT')).ok).toBe(true);
  });

  it('returnLifted : aucune reprise ⇒ levée sans raison ; V25, début, séances propres post-retour comptées exactement', () => {
    expect(returnLifted(ctx(), G.parameters, 'CANDIDATE')).toEqual({ lifted: true, reasons: [] });
    const r = returnLifted(ret('SHORT', clean2), G.parameters, 'CANDIDATE');
    expect(r.lifted).toBe(true);
    expect(r.reasons.map((x) => x.params.parameterId)).toEqual([RESUME]);
    const without = G.parameters.filter((p) => p.parameterId !== RESUME);
    const u = returnLifted(ret('SHORT', clean2), without, 'CANDIDATE');
    expect(u.lifted).toBe(false);
    expect(u.reasons.map((x) => x.code)).toContain(RUNNING_CODES.UNRESOLVED_PARAMETER);
    for (const n of [0, -1, '2', null]) expect(returnLifted(ret('SHORT', clean2), patch(RESUME, { postReturnSessionsWithoutSignal: n }), 'CANDIDATE')).toMatchObject({ lifted: false, reasons: [expect.anything()] });
    expect(returnLifted(ret('SHORT', clean2, null), G.parameters, 'CANDIDATE')).toMatchObject({ lifted: false, reasons: [expect.anything()] });
    // Frontière : séance exactement au début de la reprise comptée ; avant : non.
    expect(returnLifted(ret('SHORT', clean2, at(12)), G.parameters, 'CANDIDATE').lifted).toBe(true);
    expect(returnLifted(ret('SHORT', clean2, at(11)), G.parameters, 'CANDIDATE').lifted).toBe(false);
    // Séances non terminées ou négatives : non comptées.
    expect(returnLifted(ret('SHORT', [clean2[0]!, h('p', 9, { archetype: 'EASY', structureFamily: 'CONTINUOUS', completion: 'PARTIAL' })]), G.parameters, 'CANDIDATE').lifted).toBe(false);
    expect(returnLifted(ret('SHORT', [clean2[0]!, h('p', 9, { archetype: 'EASY', structureFamily: 'CONTINUOUS', intoleranceOrPainSignal: true })]), G.parameters, 'CANDIDATE').lifted).toBe(false);
    expect(returnLifted(ret('SHORT', [clean2[0]!, h('p', 9, { archetype: 'EASY', structureFamily: 'CONTINUOUS', completion: 'SKIPPED', skipReason: 'TIME' })]), G.parameters, 'CANDIDATE').lifted).toBe(false);
    expect(returnLifted(ret('SHORT', [clean2[0]!]), patch(RESUME, { postReturnSessionsWithoutSignal: 1 }), 'CANDIDATE').lifted).toBe(true);
  });
});

describe('V10 — densité glissante', () => {
  const long1 = (history: H[], parameters = G.parameters) => guard('LONG', ctx(lvl('P_R1'), history), { family: 'CONTINUOUS', parameters });
  it('fenêtre de perDays jours : J-6 compté, J-7 non ; séance future et séance SKIPPED non comptées ; détail « compte/plafond »', () => {
    expect(failed(long1([h('a', 6)]))).toEqual({ archetype: 'LONG', rule: 'V10_DENSITY', detail: '1/1' });
    expect(long1([h('a', 7)]).ok).toBe(true);
    expect(long1([h('a', -3)]).ok).toBe(true);
    expect(long1([h('a', 6, { completion: 'SKIPPED', skipReason: 'TIME' })]).ok).toBe(true);
    expect(long1([h('a', 6, { archetype: 'EASY', structureFamily: 'CONTINUOUS' })]).ok).toBe(true);
    for (const a of ['SHORT_INTERVAL', 'HILLS', 'RACE_PACE', 'TEST', 'LONG', 'SEVERE'] as const) expect(rule(long1([h('a', 6, { archetype: a })]))).toBe('V10_DENSITY');
    // Séance à l'instant présent : comptée (V10 avant V11).
    expect(rule(long1([h('a', 0)]))).toBe('V10_DENSITY');
  });

  it('plafond 0 ⇒ refus ; valeurs illisibles ⇒ V10_UNRESOLVED', () => {
    expect(failed(guard('LONG', ctx(lvl('P_R1')), { family: 'CONTINUOUS', parameters: patch(V10, { perDays: 7, P_R1: 0 }) }))).toEqual({ archetype: 'LONG', rule: 'V10_DENSITY', detail: '0/0' });
    const without = G.parameters.filter((p) => p.parameterId !== V10);
    for (const ps of [without, patch(V10, { perDays: 0, P_R1: 1 }), patch(V10, { perDays: '7', P_R1: 1 }), patch(V10, { perDays: 7 }), patch(V10, { perDays: 7, P_R1: -1 }), patch(V10, { perDays: 7, P_R1: '1' })]) {
      expect(failed(guard('LONG', ctx(lvl('P_R1')), { family: 'CONTINUOUS', parameters: ps }))).toEqual({ archetype: 'LONG', rule: 'V10_UNRESOLVED', detail: V10 });
    }
  });
});

describe('V11 — jamais deux jours consécutifs', () => {
  it('veille et jour même refusés ; J-2 accepté ; futur, SKIPPED et non intense ignorés ; valeurs illisibles refusées', () => {
    const g = (history: H[], parameters = G.parameters) => guard('SEVERE', ctx(lvl('P_R4'), history), { parameters });
    expect(failed(g([h('a', 1)]))).toEqual({ archetype: 'SEVERE', rule: 'V11_CONSECUTIVE', detail: 'HIGH_DEMAND' });
    expect(rule(g([h('a', 0)]))).toBe('V11_CONSECUTIVE');
    expect(g([h('a', 2)]).ok).toBe(true);
    expect(g([h('a', -1)]).ok).toBe(true);
    expect(g([h('a', 1, { completion: 'SKIPPED', skipReason: 'TIME' })]).ok).toBe(true);
    expect(g([h('a', 1, { archetype: 'EASY', structureFamily: 'CONTINUOUS' })]).ok).toBe(true);
    for (const ps of [G.parameters.filter((p) => p.parameterId !== V11), patch(V11, { default: 'ALLOW' })]) expect(failed(g([], ps))).toEqual({ archetype: 'SEVERE', rule: 'V11_UNRESOLVED', detail: V11 });
  });

  it('accepté : raisons des paramètres et identifiants exacts', () => {
    const r = guard('SEVERE', ctx(lvl('P_R4')));
    expect(r).toEqual({ ok: true, parameterIds: [V10, V11], reasons: [expect.objectContaining({ params: expect.objectContaining({ parameterId: V10 }) }), expect.objectContaining({ params: expect.objectContaining({ parameterId: V11 }) })] });
  });
});
