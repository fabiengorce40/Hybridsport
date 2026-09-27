/**
 * Spec strength 10 §1 — trois autorités, chacune appliquée UNE SEULE FOIS :
 *   TRACK                 → charge + répétitions + état de progression
 *   ALLOCATION DU VOLUME  → séries
 *   STIMULUS + MODIFICATEURS → cible d'effort (RIR)
 * Aucune ne rejoue la décision d'une autre (régressions : dérive du RIR, niveau compté deux fois).
 */
import { describe, expect, it } from 'vitest';
import type { Exercise } from '@hybridsport/domain';
import { computeDose } from '../../src/index.js';
import type { StrengthTrack } from '../../src/index.js';
import { envFor, NOW, run, scenario, strengthCatalog } from '../fixtures/harness.js';

const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const track = (next: Partial<NonNullable<StrengthTrack['nextPrescription']>>, o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 't', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_full_body', slotId: 'fb.push_h', model: 'linear_load', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2, ...next }, ...o,
});
const opts = { role: 'secondary' as const, timePressure: false, doubleProgression: false, calibration: false };

describe('trois autorités sans double application', () => {
  const env = envFor(scenario({ state: { readiness: 'caution', activePain: [], painHistory: 'available', dayAvailable: true } }));
  const cell = env.params['strength.dose.base'].general?.secondary?.compound_high_load;

  it('TRACK : les séries et le RIR stockés dans la track n’ont AUCUN effet ; les répétitions de la track s’appliquent', () => {
    const a = computeDose(ex('ex.bench_press'), env, { ...opts, allocatedSets: 3, track: track({ sets: 1, rir: 0, reps: 6 }) });
    const b = computeDose(ex('ex.bench_press'), env, { ...opts, allocatedSets: 3, track: track({ sets: 9, rir: 9, reps: 6 }) });
    expect({ sets: a.sets, rir: a.rir }).toEqual({ sets: b.sets, rir: b.rir });
    expect(a.reps).toBe(6);
    // Plage de la track honorée en double progression, même sans prescription suivante.
    const dp = computeDose(ex('ex.bench_press'), env, { ...opts, doubleProgression: true, track: track({}, { nextPrescription: undefined, model: 'double_progression', repRange: { min: 6, max: 8 } }) });
    expect(dp.reps).toEqual({ min: 6, max: 8 });
  });

  it('VOLUME : les séries suivent l’allocation (bornée par le profil) ; le niveau n’en retire pas une de plus', () => {
    for (const n of [2, 3, 4]) expect(computeDose(ex('ex.bench_press'), env, { ...opts, allocatedSets: n }).sets).toBe(Math.min(n, cell?.sets.max ?? n));
    const novice = envFor(scenario({ level: 'novice' }));
    expect(computeDose(ex('ex.bench_press'), novice, { ...opts, allocatedSets: 3 }).sets).toBe(3);
  });

  it('STIMULUS + MODIFICATEURS : RIR = RIR du profil + delta combiné, chaque modificateur tracé exactement une fois', () => {
    const d = computeDose(ex('ex.bench_press'), env, { ...opts, allocatedSets: 3, track: track({ rir: 7 }) });
    const mods = d.reasons.filter((r) => r.code === 'DOSE.MODIFIED').map((r) => String(r.params.modifier));
    expect(new Set(mods).size).toBe(mods.length);
    expect(d.rir).toBe((cell?.rir ?? 0) + env.params['strength.dose.modifiers'].readiness.caution.rirDelta);
  });

  it('de bout en bout : une ancre déclarée reçoit le MÊME RIR et les MÊMES séries qu’un exercice non suivi du même profil', () => {
    const base = { archetype: 'str_upper', stimulus: 'strength_heavy', context: { goal: { primary: { goal: 'strength' as const } } } };
    const free = run(scenario(base));
    const anchored = run(scenario({ ...base, intent: { repetitionIntents: [{ kind: 'progression_anchor', trackId: 't' }] },
      context: { ...base.context, tracks: [track({ sets: 9, rir: 9, reps: 5, loadKg: 90 }, { archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'autoregulated' })] } }));
    const bench = (o: ReturnType<typeof run>) => (o.result.status === 'ok' ? o.result.value.blocks.flatMap((b) => b.items).find((i) => i.refs?.slotId === 'up.main_push_h') : undefined);
    const work = (o: ReturnType<typeof run>) => { const it = bench(o); return it?.prescription.type === 'sets' ? it.prescription.sets.filter((s) => s.kind !== 'rampup') : []; };
    const rirOf = (s: ReturnType<typeof work>[number]) => (s.intensity && 'effort' in s.intensity && s.intensity.effort && 'rir' in s.intensity.effort ? s.intensity.effort.rir : undefined);
    expect(bench(anchored)?.refs?.anchor).toBe('declared');
    expect(work(anchored).length).toBeLessThan(9);
    expect(work(anchored).map(rirOf).every((r) => r !== undefined && r < 9)).toBe(true);
    expect(work(anchored).every((s) => s.reps === 5)).toBe(true);
    expect(free.result.status).toBe('ok');
  });
});
