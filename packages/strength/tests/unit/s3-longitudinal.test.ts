/**
 * Strength S3 — briques longitudinales du moteur :
 * - preuve de progression : charge prescrite non portée ⇒ `load_deviation` (maintien, aucun compteur modifié) ;
 * - ancres déclarables (contrat CORE-EXT-4) : actives, de l'archétype, une par groupe de choix, la moins récente d'abord ;
 * - prescription hebdomadaire : lecture du ruleset et de l'historique, provenance, capacités BLOQUÉES ;
 * - trace des groupes de choix (`SELECT.CHOICE_GROUP`) : la cause du choix est expliquée, la décision inchangée.
 */
import { describe, expect, it } from 'vitest';
import type { SetPrescription } from '@hybridsport/domain';
import {
  classifyExposure, declarableAnchors, exerciseStillAdmissible, plannedWeekExposures, readStrengthParams, STRENGTH_BLOCKED_CAPABILITIES, strengthWeekPrescription, updateTrack,
  weekPrescriptionSummary,
} from '../../src/index.js';
import type { ExecutedItem, StrengthTrack } from '../../src/index.js';
import { NOW, run, scenario, strengthCatalog, strengthContext, strengthRuleset } from '../fixtures/harness.js';

const RULESET = strengthRuleset();
const P = readStrengthParams(RULESET).values;
const CATALOG = strengthCatalog();
const bench = (() => { const e = CATALOG.exercise('ex.bench_press'); if (!e) throw new Error('bench'); return e; })();
const work = (n: number, kg: number): SetPrescription[] => Array.from({ length: n }, () => ({ kind: 'working', reps: 8, restAfterS: 120, intensity: { mode: 'load', kg, certainty: 'prescribed', effort: { rir: 2 } } }));
const item = (performed: ExecutedItem['performed']): ExecutedItem => ({ exerciseId: 'ex.bench_press', prescribed: work(3, 80), performed, sessionCompleted: true });
const track = (o: Partial<StrengthTrack> = {}): StrengthTrack => ({
  trackId: 'track.a', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'linear_load', status: 'active', openedAt: NOW,
  consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 3, reps: 8, loadKg: 80, rir: 2 }, ...o,
});

describe('preuve de progression : la charge prescrite doit avoir été portée', () => {
  it('charge inférieure ou non saisie ⇒ load_deviation ; égale ou supérieure ⇒ classement habituel', () => {
    expect(classifyExposure(item([{ reps: 8, loadKg: 70, rir: 2 }, { reps: 8, loadKg: 80, rir: 2 }, { reps: 8, loadKg: 80, rir: 2 }]), P)).toBe('load_deviation');
    expect(classifyExposure(item([{ reps: 8, rir: 2 }, { reps: 8, rir: 2 }, { reps: 8, rir: 2 }]), P)).toBe('load_deviation');
    expect(classifyExposure(item([{ reps: 8, loadKg: 80, rir: 2 }, { reps: 8, loadKg: 80, rir: 2 }, { reps: 8, loadKg: 80, rir: 2 }]), P)).toBe('on_target');
    expect(classifyExposure(item([{ reps: 8, loadKg: 85, rir: 2 }, { reps: 8, loadKg: 85, rir: 2 }, { reps: 8, loadKg: 85, rir: 2 }]), P)).toBe('on_target');
  });

  it('load_deviation : maintien tracé, prescription et compteurs inchangés (ni progression, ni échec)', () => {
    const t = track({ consecutiveSuccess: 1, consecutiveBelow: 1, consecutiveHolds: 1 });
    const u = updateTrack(t, item([{ reps: 12, loadKg: 60, rir: 4 }]), 'load_deviation', bench, P, 'accumulation');
    expect(u.track).toEqual(t);
    expect(u.reasons.map((r) => [r.code, r.params.cause])).toEqual([['PROGRESSION.HELD', 'load_deviation']]);
  });
});

describe('ancres déclarables', () => {
  const t = (id: string, o: Partial<StrengthTrack>): StrengthTrack => track({ trackId: id, ...o });
  it('actives, de l’archétype, sur un emplacement existant ; une par groupe de choix, la moins récemment utilisée', () => {
    // Groupe de choix `pull` de l'archétype (up.pull_v / up.pull_h) : deux ancres, une seule déclarable.
    const tracks = [
      t('a', { slotId: 'up.main_push_h', exerciseId: 'ex.bench_press' }),
      t('suspended', { slotId: 'up.main_push_h', exerciseId: 'ex.db_bench_press', status: 'suspended' }),
      t('other', { archetypeId: 'str_lower', slotId: 'lo.main_knee', exerciseId: 'ex.back_squat' }),
      t('ghost', { slotId: 'up.unknown_slot', exerciseId: 'ex.pull_up' }),
      t('pv', { slotId: 'up.pull_v', exerciseId: 'ex.pull_up' }),
      t('ph', { slotId: 'up.pull_h', exerciseId: 'ex.seated_cable_row' }),
    ];
    // Tractions réalisées le 1er octobre, tirage horizontal le 28 septembre ⇒ le tirage horizontal (moins récent) est déclaré.
    const exposures = [{ exerciseId: 'ex.pull_up', at: '2026-10-01T10:00:00Z' }, { exerciseId: 'ex.seated_cable_row', at: '2026-09-28T10:00:00Z' }];
    const out = declarableAnchors(tracks, exposures, 'str_upper', P).map((x) => x.trackId);
    expect(out.sort()).toEqual(['a', 'ph']);
    // Séance prévue plus tôt dans la semaine avec le tirage horizontal ⇒ ce sont les tractions qui sont déclarées.
    expect(declarableAnchors(tracks, [...exposures, { exerciseId: 'ex.seated_cable_row', at: '2026-10-05T08:00:00Z' }], 'str_upper', P).map((x) => x.trackId).sort()).toEqual(['a', 'pv']);
    // Même entrée ⇒ même sortie (aucune graine, aucun hasard).
    expect(declarableAnchors(tracks, exposures, 'str_upper', P)).toEqual(declarableAnchors(tracks, exposures, 'str_upper', P));
  });

  it('séances PRÉVUES de la semaine comptées comme usage (alternance entre ancres d’un même groupe)', () => {
    const s = run(scenario({ archetype: 'str_upper' }));
    if (s.result.status !== 'ok') throw new Error('séance');
    const planned = plannedWeekExposures([{ at: '2026-10-05T08:00:00Z', session: s.result.value }]);
    expect(planned.length).toBeGreaterThan(0);
    expect(planned.every((x) => x.at === '2026-10-05T08:00:00Z')).toBe(true);
  });
});

describe('prescription hebdomadaire', () => {
  it('besoins requis, volume prévu / réalisé face aux bornes du ruleset, provenance, capacités bloquées', () => {
    const ctx = strengthContext({ hardSets: { d7: { chest: 4 } }, week: { otherStrengthSessions: [{ intentId: 'i1', archetypeId: 'str_lower', plannedHardSets: { quads: 6 }, done: false }], neighbors: [], known: true } } as never);
    const p = strengthWeekPrescription({
      params: P, paramStatus: (id) => RULESET.parameter(id)?.status ?? 'missing', goal: { goal: 'hypertrophy' }, level: 'intermediate', archetypeId: 'str_upper', occurrence: 2, weeklySessions: 4,
      context: { tracks: [], recentExposures: [], hardSets: ctx.hardSets, week: ctx.week },
    });
    expect(p.requiredNeeds.length).toBeGreaterThan(0);
    expect(p.volume.find((g) => g.group === 'chest')?.realized).toBe(4);
    expect(p.volume.find((g) => g.group === 'quads')?.planned).toBe(6);
    expect(p.provenance.map((x) => x.parameterId)).toEqual(['strength.archetypes', 'strength.volume', 'strength.progression', 'strength.tracks']);
    expect(p.blocked).toEqual([...STRENGTH_BLOCKED_CAPABILITIES]);
    expect(p.blocked).toContain('periodization');
    const sum = weekPrescriptionSummary(p);
    for (const g of sum.belowFloor) expect(sum.atOrAboveHigh).not.toContain(g);
  });

  it('admissibilité durable d’un exercice : matériel, exclusion, catalogue', () => {
    expect(exerciseStillAdmissible('ex.bench_press', CATALOG, bench.equipment.allOf, [])).toBe(true);
    expect(exerciseStillAdmissible('ex.bench_press', CATALOG, bench.equipment.allOf, ['ex.bench_press'])).toBe(false);
    expect(exerciseStillAdmissible('ex.bench_press', CATALOG, [], [])).toBe(false);
    expect(exerciseStillAdmissible('ex.does_not_exist', CATALOG, bench.equipment.allOf, [])).toBe(false);
  });
});

describe('trace des groupes de choix', () => {
  it('chaque groupe de choix résolu est expliqué (cause parmi les critères ordonnés du moteur)', () => {
    const o = run(scenario({ archetype: 'str_upper' }));
    const codes = o.trace.entries.flatMap((e) => e.reasons).filter((r) => r.code === 'SELECT.CHOICE_GROUP');
    expect(codes.length).toBeGreaterThan(0);
    for (const r of codes) expect(['anchor', 'not_in_session', 'least_recent_exposure', 'goal_priority', 'identifier', 'only_member']).toContain(r.params.cause);
  });
});
