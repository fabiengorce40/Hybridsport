/**
 * Strength S4 — briques du moteur :
 * - continuité déclarée (`keep_incumbent`) : un exercice en place admissible est conservé quelle que soit la graine ;
 *   tout remplacement porte sa cause (filtre éliminatoire, ancre, accessoire suivi, raison de rotation du ruleset) ;
 * - priorité des sports : transportée et tracée, SANS effet sur la séance (politique BLOQUÉE) ;
 * - preuve d'exposition (prescrit / réalisé) ; réussite exacte d'un modèle autorégulé ⇒ décision BLOQUÉE tracée ;
 *   poids du corps en haut de plage ⇒ méthode non gouvernée, méthodes possibles listées ;
 * - bilan de volume de la semaine : cible / prévu / statut / contraintes, sans score.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise, ISODateTime, SessionDraft, SetPrescription } from '@hybridsport/domain';
import { asISODateTime } from '@hybridsport/domain';
import { assessStrengthWeekVolume, classifyExposure, exposureEvidence, readStrengthParams, updateTrack } from '../../src/index.js';
import type { ExecutedItem, StrengthContextInput, StrengthTrack } from '../../src/index.js';
import { NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { strengthLockRulesetDocument } from '../fixtures/ruleset.js';

const P = readStrengthParams(strengthRuleset()).values;
const CATALOG = strengthCatalog();
const ex = (id: string): Exercise => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
// technical-constant: TEST_ONLY — exposition réalisée la veille de NOW
const YESTERDAY = asISODateTime('2026-10-04T08:00:00Z');

type Sc = Parameters<typeof scenario>[0];
const sessionOf = (o: Sc): SessionDraft => { const r = run(scenario(o)); if (r.result.status !== 'ok') throw new Error(JSON.stringify(r.result)); return r.result.value; };
const reasonsOf = (o: Sc, code: string) => { const r = run(scenario(o)); return r.trace.entries.filter((e) => e.step === 'proposal' && r.result.status === 'ok' && e.subject.id === r.result.value.id).flatMap((e) => e.reasons).filter((x) => x.code === code); };
const main = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const bySlot = (s: SessionDraft) => main(s).map((i) => `${i.refs?.slotId ?? '?'}=${i.exerciseId}`).sort();

/** Séance de référence (graine « a », aucun historique) puis expositions réalisées de chacun de ses exercices. */
const reference = sessionOf({ archetype: 'str_upper', stimulus: 'strength_volume', seed: 'a' });
const exposures: StrengthContextInput['recentExposures'] = main(reference).filter((i) => i.refs?.slotId).map((i) => ({ exerciseId: i.exerciseId, at: YESTERDAY, slotId: i.refs?.slotId, sets: [{ reps: 10, loadKg: 20, rir: 2 }] }));
const withContinuity = (o: Sc = {}): Sc => ({ archetype: 'str_upper', stimulus: 'strength_volume', ...o, context: { recentExposures: exposures, continuity: 'keep_incumbent', ...(o.context ?? {}) } });

describe('continuité déclarée : l’exercice en place reste, la graine ne change rien', () => {
  it('même contexte, graines différentes ⇒ mêmes exercices, tous conservés', () => {
    const sessions = ['x', 'y', 'z', 'a'].map((seed) => sessionOf(withContinuity({ seed })));
    for (const s of sessions) expect(bySlot(s)).toEqual(bySlot(sessions[0] as SessionDraft));
    expect(bySlot(sessions[0] as SessionDraft)).toEqual(bySlot(reference));
    // Aucun remplacement ; les exercices conservés sont résumés en une raison par séance (instance=exercice).
    expect(reasonsOf(withContinuity({ seed: 'x' }), 'SELECT.CONTINUITY')).toEqual([]);
    const kept = reasonsOf(withContinuity({ seed: 'x' }), 'SELECT.CONTINUITY_KEPT')[0]?.params.exercises as string[];
    expect(kept.length).toBe(main(reference).filter((i) => i.refs?.slotId && !i.refs.slotId.startsWith('i.')).length);
  });

  it('sans continuité déclarée : comportement antérieur inchangé (aucune trace de continuité)', () => {
    const plain: Sc = { archetype: 'str_upper', stimulus: 'strength_volume', context: { recentExposures: exposures } };
    expect([...reasonsOf(plain, 'SELECT.CONTINUITY'), ...reasonsOf(plain, 'SELECT.CONTINUITY_KEPT')]).toEqual([]);
  });

  it('exercice exclu, matériel retiré, exercice non aimé ⇒ remplacement TRACÉ avec sa cause', () => {
    const accessory = main(reference).find((i) => i.refs?.slotId?.includes('2') || i.refs?.slotId?.includes('iso'));
    if (!accessory?.refs?.slotId) throw new Error('accessoire attendu');
    const target = accessory.exerciseId;
    const cause = (o: Sc) => reasonsOf(withContinuity(o), 'SELECT.CONTINUITY').find((r) => r.params.incumbent === target);
    expect(cause({ profile: { excludedExercises: [target] } })).toMatchObject({ params: { outcome: 'replaced', cause: 'F6_user_exclusion' } });
    const equipment = ex(target).equipment.allOf;
    const full = scenario({}).profile.availableEquipment;
    if (equipment.length > 0) expect(cause({ profile: { availableEquipment: full.filter((q) => !equipment.includes(q)) } })?.params.cause).toBe('F3_equipment');
    // Raisons de rotation du ruleset verrouillé (celui de Beta 0) : un exercice non aimé n'est jamais « conservé ».
    expect(cause({ ruleset: strengthRuleset(strengthLockRulesetDocument()), context: { recentExposures: exposures, continuity: 'keep_incumbent', preferences: { liked: [], disliked: [target] } } })?.params.cause).toBe('rotation_reason:disliked');
  });
});

describe('priorité des sports : transportée, tracée, sans effet inventé', () => {
  it('Strength prioritaire, Running prioritaire, absente ⇒ séance identique ; rang tracé', () => {
    const neighbors: StrengthContextInput['week']['neighbors'] = [{ discipline: 'running', stimulus: 'stim.running.aerobic', priority: 'standard', hoursFromThisSession: 20, demand: { lower_knee: 'high', lower_hip: 'moderate' } }];
    const week = { otherStrengthSessions: [], neighbors, known: true };
    const base: Sc = { archetype: 'str_lower', stimulus: 'strength_volume', seed: 'p' };
    const none = sessionOf({ ...base, context: { week } });
    const strengthFirst = sessionOf({ ...base, context: { week, sportPriority: { order: ['strength', 'running'] } } });
    const runningFirst = sessionOf({ ...base, context: { week, sportPriority: { order: ['running', 'strength'] } } });
    expect(strengthFirst.blocks).toEqual(none.blocks);
    expect(runningFirst.blocks).toEqual(none.blocks);
    expect(reasonsOf({ ...base, context: { week, sportPriority: { order: ['running', 'strength'] } } }, 'PLAN.SPORT_PRIORITY')[0]?.params).toMatchObject({ strengthRank: 2, neighbours: ['running:1'], policy: 'blocked:priority_interference_policy' });
    expect(reasonsOf({ ...base, context: { week, sportPriority: { order: ['strength', 'running'] } } }, 'PLAN.SPORT_PRIORITY')[0]?.params).toMatchObject({ strengthRank: 1, neighbours: ['running:2'] });
    expect(reasonsOf({ ...base, context: { week } }, 'PLAN.SPORT_PRIORITY')).toEqual([]);
  });
});

const work = (n: number, reps: SetPrescription['reps'], kg: number | undefined, rir = 2): SetPrescription[] => Array.from({ length: n }, () => ({ kind: 'working', reps, restAfterS: 120, intensity: kg === undefined ? { mode: 'bodyweight', effort: { rir } } : { mode: 'load', kg, certainty: 'prescribed', effort: { rir } } }));
const item = (exerciseId: string, prescribed: SetPrescription[], performed: ExecutedItem['performed']): ExecutedItem => ({ exerciseId, prescribed, performed, sessionCompleted: true });
const sets = (n: number, reps: number, kg?: number, rir?: number) => Array.from({ length: n }, () => ({ reps, ...(kg !== undefined ? { loadKg: kg } : {}), ...(rir !== undefined ? { rir } : {}) }));
const track = (o: Partial<StrengthTrack>): StrengthTrack => ({
  trackId: 't', tier: 'anchor', exerciseId: 'ex.bench_press', archetypeId: 'str_upper', slotId: 'up.main_push_h', model: 'autoregulated', status: 'active', openedAt: NOW as ISODateTime,
  consecutiveSuccess: 1, consecutiveBelow: 0, consecutiveHolds: 0, nextPrescription: { sets: 3, reps: 6, loadKg: 40, rir: 2 }, ...o,
});

describe('preuve d’exposition et décisions bloquées', () => {
  it('réussite exacte, dépassement (reps, RIR), aucune preuve ; RIR saisi ou non', () => {
    const rx = work(3, 6, 40);
    const ev = (performed: ExecutedItem['performed']) => { const x = item('ex.bench_press', rx, performed); return exposureEvidence(x, classifyExposure(x, P)); };
    expect(ev(sets(3, 6, 40, 2))).toMatchObject({ success: 'exact', repsDelta: 0, loadDeltaKg: 0, rirDelta: 0, rir: 'reported' });
    expect(ev(sets(3, 6, 40))).toMatchObject({ success: 'exact', rirDelta: null, rir: 'not_collected' });
    expect(ev(sets(3, 8, 40, 2))).toMatchObject({ success: 'exceeded', repsDelta: 2 });
    expect(ev(sets(3, 6, 40, 4))).toMatchObject({ success: 'exceeded', rirDelta: 2 });
    expect(ev(sets(2, 6, 40, 2))).toMatchObject({ sets: { prescribed: 3, performed: 2 } });
    expect(ev(sets(3, 6, 30, 2))).toMatchObject({ exposure: 'load_deviation', success: 'none', loadDeltaKg: -10 });
    expect(ev(sets(3, 6, 40, 0))).toMatchObject({ exposure: 'below', success: 'none' });
  });

  it('modèle autorégulé : réussite exacte ⇒ maintien + DECISION_BLOCKED ; dépassement mesuré ⇒ progression du modèle', () => {
    const exact = updateTrack(track({}), item('ex.bench_press', work(3, 6, 40), sets(3, 6, 40, 2)), 'on_target', ex('ex.bench_press'), P, 'accumulation');
    expect(exact.reasons.map((r) => r.code)).toEqual(['PROGRESSION.HELD', 'PROGRESSION.DECISION_BLOCKED']);
    expect(exact.reasons[1]?.params).toMatchObject({ situation: 'exact_success', capability: 'exact_success_progression', model: 'autoregulated' });
    expect(exact.track.nextPrescription?.loadKg).toBe(40);
    const above = updateTrack(track({}), item('ex.bench_press', work(3, 6, 40), sets(3, 6, 40, 5)), 'above', ex('ex.bench_press'), P, 'accumulation');
    expect(above.reasons.map((r) => r.code)).toEqual(['PROGRESSION.ADVANCED']);
  });

  it('poids du corps en haut de plage : progression possible, méthode non gouvernée (méthodes du catalogue listées)', () => {
    const t = track({ exerciseId: 'ex.pull_up', slotId: 'up.pull_v', model: 'double_progression', consecutiveSuccess: 0, repRange: { min: 8, max: 12 }, nextPrescription: { sets: 3, reps: { min: 12, max: 12 }, rir: 2 } });
    const u = updateTrack(t, item('ex.pull_up', work(3, { min: 12, max: 12 }, undefined), sets(3, 12, undefined, 2)), 'on_target', ex('ex.pull_up'), P, 'accumulation');
    expect(u.reasons.map((r) => [r.code, r.params.methods])).toEqual([['PROGRESSION.METHOD_UNGOVERNED', ['added_load', 'harder_variant', 'new_rep_range', 'hold']]]);
    expect(u.track.nextPrescription).toEqual(t.nextPrescription);
  });
});

describe('bilan de volume de la semaine', () => {
  const s1 = sessionOf({ archetype: 'str_upper', stimulus: 'strength_volume', seed: 'v' });
  const input = (o: Partial<Parameters<typeof assessStrengthWeekVolume>[0]>) => assessStrengthWeekVolume({ params: P, catalog: CATALOG, goal: { goal: 'hypertrophy' }, level: 'intermediate', requestedSessions: 1, sessions: [{ session: s1, reasons: [] }], notPlanned: [], ...o });
  it('cible = plancher du ruleset ; statut par groupe ; aucune contrainte tracée ⇒ « unmet »', () => {
    const v = input({});
    const legs = v.groups.find((g) => g.group === 'quads');
    expect(legs).toMatchObject({ target: P['strength.volume'].weeklyRange.hypertrophy?.intermediate?.quads?.floor, status: 'unmet' });
    expect(v.constraints).toEqual([]);
    expect(['partially_satisfied', 'not_satisfied']).toContain(v.status);
  });
  it('contrainte tracée (interférence, emplacement omis, séance non planifiée) ⇒ « reduced_by_constraint » et causes listées', () => {
    const v = input({ requestedSessions: 2, notPlanned: [{ category: 'slot_unavailable' }], sessions: [{ session: s1, reasons: [{ code: 'PLAN.STRUCTURE_LOWERED', params: { structure: 'lower_knee', cause: 'neighbor:running:x' } }, { code: 'SELECT.SLOT_OMITTED', params: { slot: 'up.iso', cause: 'duration' } }] }] });
    expect(v.groups.find((g) => g.group === 'quads')?.status).toBe('reduced_by_constraint');
    expect(v.constraints.map((c) => c.cause)).toEqual(['interference', 'sessions_not_planned', 'slot_omitted:duration']);
  });
  it('conflit insoluble : séances demandées, aucune planifiée ⇒ BLOCKED', () => {
    expect(input({ requestedSessions: 2, sessions: [], notPlanned: [{ category: 'governance_blocked' }, { category: 'slot_unavailable' }] }).status).toBe('blocked');
  });
});
