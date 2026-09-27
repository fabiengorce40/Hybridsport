/**
 * Étape 20 : fuzz, propriétés et relations métamorphiques sur le moteur complet (moteur → CORE).
 * Scénarios aléatoires mais REPRODUCTIBLES (graine fast-check fixée).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Level, SessionDraft } from '@hybridsport/domain';
import { canonicalStringify } from '@hybridsport/engine';
import type { StrengthContextInput } from '../../src/index.js';
import { run, scenario, strengthCatalog } from '../fixtures/harness.js';
import type { Scenario } from '../fixtures/harness.js';

const CATALOG = strengthCatalog();
const STRENGTH_EX = CATALOG.exercises().filter((e) => e.disciplines.includes('strength') && e.loadable).map((e) => e.id).sort();
const COMBOS = [
  ['str_full_body', 'strength_general', 'general'], ['str_full_body', 'strength_volume', 'hypertrophy'], ['str_upper', 'strength_volume', 'hypertrophy'],
  ['str_upper', 'strength_heavy', 'strength'], ['str_lower', 'strength_heavy', 'strength'], ['str_lower', 'strength_general', 'general'],
  ['str_support', 'strength_support', 'support:running'], ['str_support', 'strength_support', 'support:hybrid_race'],
] as const;
const PRESETS = ['preset.full_gym', 'preset.commercial_gym', 'preset.home_equipped', 'preset.dumbbells_only', 'preset.box', 'preset.hybrid_race_gym'];
const goalOf = (g: string): StrengthContextInput['goal'] => (g.startsWith('support:') ? { primary: { goal: 'support', supportFor: g.slice('support:'.length) as 'running' | 'hybrid_race' } } : { primary: { goal: g as 'general' } });
const items = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const working = (s: SessionDraft) => items(s).reduce((a, it) => a + (it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup').length : 0), 0);

const arbScenario: fc.Arbitrary<Scenario> = fc.record({
  level: fc.constantFrom<Level>('novice', 'beginner', 'intermediate', 'advanced'),
  preset: fc.constantFrom(...PRESETS),
  combo: fc.constantFrom(...COMBOS),
  minutes: fc.integer({ min: 20, max: 100 }),
  seed: fc.string({ minLength: 1, maxLength: 8 }).map((s) => `fz-${s}`),
  readiness: fc.constantFrom('normal', 'caution', 'reduce', 'unknown'),
  exposures: fc.array(fc.record({ id: fc.constantFrom(...STRENGTH_EX), day: fc.integer({ min: 1, max: 4 }), kg: fc.integer({ min: 4, max: 60 }).map((k) => k * 2.5), reps: fc.integer({ min: 3, max: 15 }), rir: fc.option(fc.integer({ min: 0, max: 4 }), { nil: undefined }) }), { maxLength: 6 }),
  excluded: fc.subarray(STRENGTH_EX, { maxLength: 4 }),
  neighbor: fc.option(fc.record({ hours: fc.integer({ min: -48, max: 48 }), demand: fc.constantFrom<Record<string, 'high' | 'moderate'>>({ lower_knee: 'high' }, { grip: 'high' }, { lower_hip: 'high', lower_knee: 'moderate' }) }), { nil: undefined }),
  weekKnown: fc.boolean(),
  phase: fc.constantFrom('accumulation', 'intensification', 'deload', 'maintenance') as fc.Arbitrary<'accumulation'>,
}).map((r) => scenario({
  level: r.level, preset: r.preset, archetype: r.combo[0], stimulus: r.combo[1], minutes: r.minutes, seed: r.seed,
  state: { readiness: r.readiness as 'normal', activePain: [], painHistory: 'available', dayAvailable: true },
  profile: { excludedExercises: r.excluded },
  context: {
    goal: goalOf(r.combo[2]), phase: { kind: r.phase, weekInMesocycle: 1, mesocycleLength: 4 },
    recentExposures: r.exposures.map((x) => ({ exerciseId: x.id, at: `2026-10-0${String(x.day)}T08:00:00Z`, sets: [{ loadKg: x.kg, reps: x.reps, ...(x.rir !== undefined ? { rir: x.rir } : {}) }] })),
    week: { otherStrengthSessions: [], neighbors: r.neighbor ? [{ discipline: 'running', stimulus: 'run_key', priority: 'key', hoursFromThisSession: r.neighbor.hours, demand: r.neighbor.demand }] : [], known: r.weekKnown },
  },
}));

describe('fuzz : le moteur ne lève jamais et ne produit que des séances valides ou des refus explicables', () => {
  it('scénarios aléatoires (salle, niveau, objectif, durée, historique, exclusions, voisins, phase, état)', () => {
    fc.assert(fc.property(arbScenario, (s) => {
      const o = run(s);
      if (o.result.status === 'error') {
        expect(['NO_VALID_SOLUTION', 'SAFETY_BLOCK', 'OUT_OF_SCOPE']).toContain(o.result.error.code);
        expect(o.result.error.reasons.length).toBeGreaterThan(0);
        return;
      }
      if (o.result.status !== 'ok') return;
      const session = o.result.value;
      const trace = o.trace.entries.filter((e) => e.subject.id === session.id);
      expect(trace.filter((e) => e.step === 'validate').at(-1)?.decision).toBe('VALID');
      const p90 = Number(trace.flatMap((e) => e.reasons).find((r) => r.code === 'DURATION.ESTIMATED')?.params.p90S);
      expect(p90).toBeLessThanOrEqual(s.intent.availableTimeS);
      const eq = new Set(s.profile.availableEquipment);
      const ids = items(session).map((it) => it.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        const e = CATALOG.exercise(id);
        expect(e && CATALOG.isFeasibleWith(e, eq), id).toBe(true);
        expect(s.profile.excludedExercises).not.toContain(id);
      }
      for (const it of items(session)) expect(it.refs?.anchor).not.toBe('declared');
    }), { numRuns: 120, seed: 20261005 });
  });

  it('déterminisme : même scénario ⇒ même sortie (séance, trace, empreinte), octet pour octet', () => {
    fc.assert(fc.property(arbScenario, (s) => {
      const a = run(s);
      const b = run(s);
      expect(canonicalStringify({ r: a.result, t: a.trace.entries, f: a.fingerprint })).toBe(canonicalStringify({ r: b.result, t: b.trace.entries, f: b.fingerprint }));
    }), { numRuns: 40, seed: 7 });
  });
});

describe('relations métamorphiques', () => {
  const okSession = (s: Scenario) => { const o = run(s); return o.result.status === 'ok' ? o.result.value : undefined; };

  it('matériel sans rapport ajouté (ergomètres) ⇒ séance identique', () => {
    fc.assert(fc.property(arbScenario, (s) => {
      const more = { ...s, profile: { ...s.profile, availableEquipment: [...new Set([...s.profile.availableEquipment, 'skierg', 'rower', 'assault_bike'])] } };
      expect(canonicalStringify(okSession(more) ?? null)).toBe(canonicalStringify(okSession(s) ?? null));
    }), { numRuns: 30, seed: 11 });
  });

  it('exclure un exercice d’un pattern que l’archétype n’utilise pas (course, sauts) ⇒ séance identique', () => {
    fc.assert(fc.property(arbScenario, (s) => {
      const extra = { ...s, profile: { ...s.profile, excludedExercises: [...s.profile.excludedExercises, 'ex.easy_run', 'ex.box_jump', 'ex.skierg'] } };
      expect(canonicalStringify(okSession(extra) ?? null)).toBe(canonicalStringify(okSession(s) ?? null));
    }), { numRuns: 30, seed: 12 });
  });

  it('état « réduire » ⇒ jamais plus de séries de travail qu’à l’état normal ; décharge ⇒ jamais plus qu’en accumulation', () => {
    fc.assert(fc.property(arbScenario, (s) => {
      const normal = okSession({ ...s, state: { readiness: 'normal', activePain: [], painHistory: 'available', dayAvailable: true } });
      const reduce = okSession({ ...s, state: { readiness: 'reduce', activePain: [], painHistory: 'available', dayAvailable: true } });
      if (normal && reduce && items(normal).length === items(reduce).length) expect(working(reduce)).toBeLessThanOrEqual(working(normal));
      const acc = okSession({ ...s, context: { ...s.context, phase: { kind: 'accumulation', weekInMesocycle: 1, mesocycleLength: 4 } } });
      const del = okSession({ ...s, context: { ...s.context, phase: { kind: 'deload', weekInMesocycle: 4, mesocycleLength: 4 } } });
      if (acc && del && items(acc).length === items(del).length) expect(working(del)).toBeLessThanOrEqual(working(acc));
    }), { numRuns: 40, seed: 13 });
  });

  it('changer de graine : la PREMIÈRE divergence de choix est toujours un départage par la graine (les suivantes peuvent en découler)', () => {
    fc.assert(fc.property(arbScenario, fc.string({ minLength: 1, maxLength: 6 }), (s, other) => {
      const a = run(s);
      const b = run({ ...s, seed: `${s.seed ?? ''}-${other}` });
      if (a.result.status !== 'ok' || b.result.status !== 'ok' || a.result.value.id !== b.result.value.id) return;
      const chosen = (o: typeof a) => o.trace.entries.filter((e) => o.result.status === 'ok' && e.subject.id === o.result.value.id).flatMap((e) => e.reasons).filter((r) => r.code === 'SELECT.EXERCISE.CHOSEN').map((r) => ({ slot: String(r.params.slot), id: String(r.params.exerciseId), why: String(r.params.decidingCriterion) }));
      const ca = chosen(a);
      const cb = chosen(b);
      const i = ca.findIndex((x, k) => cb[k]?.slot !== x.slot || cb[k]?.id !== x.id);
      if (i < 0) return;
      const x = ca[i];
      const y = cb[i];
      expect(x?.slot === y?.slot && [x?.why, y?.why].some((w) => w === 'seed_tiebreak' || w === 'variant'), `${x?.slot ?? ''}: ${x?.id ?? ''}/${y?.id ?? ''}`).toBe(true);
    }), { numRuns: 30, seed: 14 });
  });
});
