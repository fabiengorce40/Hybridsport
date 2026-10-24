/**
 * P1 — programmation Musculation : Full Body A/B conservé à 3 séances (jamais haut/bas imposé), variantes et raisons
 * lisibles (groupes, allègements), signal de récupération entre séances de force rapprochées (règle non résolue),
 * 4 séances : aucune séance du même type strictement identique quand une variation gouvernée existe, 5–6 séances :
 * limite explicite, volume jamais augmenté automatiquement.
 */
import { describe, expect, it } from 'vitest';
import { ensureBeta0Week, finishProgrammeSession, recordProgrammeSet, selectBeta0Week, selectProgrammeSession, startProgrammeSession, strengthSupportedFrequencies, strengthWeekInsights } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, code, create, massProfile, strengthIds } from './sf-fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const reasons = (s: AppState, id: string) => Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === id)?.reasons ?? [];
function complete(s0: AppState, mon: string): AppState {
  let s = s0;
  for (const id of strengthIds(s, mon)) {
    const d = selectProgrammeSession(s, id)?.date ?? mon;
    s = startProgrammeSession(s, at(`${d}T18:00:00.000Z`), id);
    for (const b of selectProgrammeSession(s, id)?.session.blocks ?? []) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(`${d}T18:10:00.000Z`), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: 40 }); });
    s = finishProgrammeSession(s, at(`${d}T19:00:00.000Z`), { requestId: id, completion: 'completed_as_prescribed', pain: false });
  }
  return s;
}
const exercises = (s: AppState, id: string) => (selectProgrammeSession(s, id)?.session.blocks ?? []).flatMap((b) => b.items.map((i) => i.exerciseId)).join('|');

describe('P1 — programmation Musculation', () => {
  it('1. masse 3 séances + course + Cross-training : Full Body conservé, variantes A/B visibles, groupes et mouvements dominants', () => {
    const s = create(massProfile());
    const w = selectBeta0Week(s, W1);
    const str = (w?.sessions ?? []).filter((x) => x.sport === 'strength' && x.placement === 'planned');
    expect(str.map((x) => x.archetypeId)).toEqual(['str_full_body', 'str_full_body', 'str_full_body']);
    expect(new Set(str.map((x) => x.strengthVariant)).size).toBeGreaterThanOrEqual(2);
    const ins = strengthWeekInsights(s, W1);
    for (const x of ins?.sessions ?? []) { expect(x.focus.length).toBeGreaterThan(0); expect(x.groups.length).toBeGreaterThan(0); }
  });

  it('2. raisons d’allègement visibles : séance proche d’une course clé ⇒ interférence tracée (structure, sport, écart)', () => {
    const s = create(massProfile());
    const red = (strengthWeekInsights(s, W1)?.sessions ?? []).flatMap((x) => x.reductions);
    expect(red.length).toBeGreaterThan(0);
    expect(red.every((r) => r.withSport !== '' && ['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'grip', 'trunk', 'lower_back'].includes(r.structure))).toBe(true);
  });

  it('3. récupération : séances de force à un jour d’écart sur les mêmes groupes ⇒ signal NON RÉSOLU (rien déplacé)', () => {
    const s = create(massProfile());
    const ins = strengthWeekInsights(s, W1);
    const r = ins?.recovery ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.status === 'UNRESOLVED' && x.rule === 'same_discipline_recovery' && x.groups.length + x.sameExercises.length > 0)).toBe(true);
    // Le signal ne modifie aucune séance : dates identiques à la planification.
    expect((selectBeta0Week(s, W1)?.sessions ?? []).filter((x) => x.sport === 'strength').map((x) => x.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-09']);
  });

  it('4. force + conditionnement (C4.3) puis Musculation le lendemain : le bloc de force Cross-training compte dans le signal', () => {
    const p = { ...massProfile({ multisport: true, availability: [75, 75, 75, 75, 75, 0, 0] }), crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.strength_plus_conditioning', returnState: 'NONE' as const } };
    const s = create(p);
    const r = strengthWeekInsights(s, W1)?.recovery ?? [];
    const hasCt = (selectBeta0Week(s, W1)?.sessions ?? []).some((x) => x.sport === 'crosstraining' && (selectProgrammeSession(s, x.requestId)?.session.blocks ?? []).some((b) => b.kind === 'strength'));
    expect(hasCt).toBe(true);
    expect(r.some((x) => x.first.kind === 'ct_strength_block' || x.second.kind === 'ct_strength_block')).toBe(true);
  });

  it('5. masse 4 séances, deux semaines : jamais deux séances du même type strictement identiques sans trace ; variation obtenue quand elle existe', () => {
    let s = create(massProfile({ sessions: 4, multisport: false, preset: 'preset.full_gym' }));
    s = complete(s, W1);
    s = ensureBeta0Week(s, at(`${W2}T07:30:00.000Z`));
    for (const mon of [W1, W2]) {
      const ids = strengthIds(s, mon);
      for (const [i, a] of ids.entries()) for (const b of ids.slice(i + 1)) {
        const va = selectProgrammeSession(s, a); const vb = selectProgrammeSession(s, b);
        if (va?.archetypeId !== vb?.archetypeId || exercises(s, a) !== exercises(s, b)) continue;
        // Identiques : seulement si Strength n'a aucune variation gouvernée (tracé).
        expect(reasons(s, b).some((r) => r.code === 'PLAN.PLANNER.STRENGTH_WITHIN_WEEK_VARIATION' && String(r.params.outcome).startsWith('no_governed_variation'))).toBe(true);
      }
    }
    // RC5.1 — Haut A/B et Bas A/B : quatre archétypes distincts chaque semaine, la variation intra-semaine (F8, même
    // archétype deux fois) n'a plus lieu d'être pour ce profil.
    for (const mon of [W1, W2]) expect(new Set(strengthIds(s, mon).map((id) => selectProgrammeSession(s, id)?.archetypeId)).size).toBe(4);
  });

  it('6. 5 ou 6 séances : fréquence non composée ⇒ aucune séance inventée (limite exposée), 1–4 prises en charge', () => {
    expect(strengthSupportedFrequencies()).toEqual([1, 2, 3, 4]);
    for (const n of [5, 6]) {
      const r = code(() => create(massProfile({ sessions: n, multisport: false, preset: 'preset.full_gym', availability: [60, 60, 60, 60, 60, 60, 60] })));
      if (r !== 'OK') continue; // refus explicite à la création : aucune séance
      const s = create(massProfile({ sessions: n, multisport: false, preset: 'preset.full_gym', availability: [60, 60, 60, 60, 60, 60, 60] }));
      expect(strengthIds(s).length).toBe(0);
    }
  });

  it('7. volume : jamais augmenté automatiquement pour atteindre les repères (planchers toujours signalés, mêmes séries qu’avant)', () => {
    const s = create(massProfile());
    const v = strengthWeekInsights(s, W1)?.volume;
    expect(v?.groups.some((g) => g.target !== null && g.planned < g.target)).toBe(true);
  });
});
