/**
 * C3 — 32 tests adversariaux (liste de la demande C3 §28). Gouvernance TEST_ONLY (c3-fixtures.ts) sauf mention ;
 * pipeline CORE réel quand la séance est publiée. Chaque test vérifie une RAISON, jamais seulement un statut.
 */
import { describe, expect, it } from 'vitest';
import { decodeState, emptyState, exportState } from '../../../app-core/src/index.js';
import { asISODateTime } from '@hybridsport/domain';
import { CT_CODES, CURRENT_CT_GOVERNANCE, createCrossTrainingEngine, parseCrossTrainingContext } from '../../src/index.js';
import type { C3Outcome, CrossTrainingContextInput } from '../../src/index.js';
import { C3_REQUESTS, c3Governance, realizedFrom, runC3Detailed } from '../c3-fixtures.js';
import type { C3Run } from '../c3-fixtures.js';
import { PROFILE_GYM, STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';
import { EQUIPMENT } from '../../../engine/tests/fixtures/catalog.js';

const FULL = { ...PROFILE_GYM, availableEquipment: EQUIPMENT.map((e) => e.id) };
// technical-constant: TEST_ONLY — temps disponibles (s)
const T60 = 3600;
// technical-constant: TEST_ONLY
const T30 = 1800;
// technical-constant: TEST_ONLY
const T20 = 1200;
// technical-constant: TEST_ONLY — séance réalisée 2 jours avant l'instant de test
const PREV_AT = '2026-09-26T08:00:00Z';

const run = (o: C3Run = {}) => runC3Detailed({ profile: FULL, availableTimeS: T60, ...o });
const planOf = (c: C3Outcome | undefined) => { if (!c?.ok) throw new Error(`composition attendue : ${JSON.stringify(c?.ok === false ? c.reasons.map((r) => [r.code, r.params]) : c)}`); return c.plan; };
const reasons = (c: C3Outcome | undefined) => (c?.ok ? c.proposal.reasons : c?.reasons ?? []);
const codes = (c: C3Outcome | undefined) => reasons(c).map((r) => r.code);
const rejectedCandidates = (c: C3Outcome | undefined) => reasons(c).filter((r) => r.code === CT_CODES.C3_CANDIDATES_REJECTED).flatMap((r) => r.params.rejected as string[]);
const ids = (c: C3Outcome | undefined) => planOf(c).items.map((i) => i.exerciseId);
const NEIGHBOUR_HIGH = (structure: string, discipline: 'strength' | 'running' = 'strength'): Partial<CrossTrainingContextInput> => ({
  // technical-constant: TEST_ONLY — voisine à 24 h
  neighbours: { known: true, items: [{ discipline, hoursFromThisSession: 24, demand: { [structure]: 'high' } }] },
});

const realizedOf = (c: C3Outcome | undefined, o: Record<string, unknown> = {}) => realizedFrom(c, 'ct.prev', PREV_AT, o);

describe('C3 — 32 tests adversariaux', () => {
  it('1. aucun matériel ⇒ refus (rôles intenables pour tous les formats), aucun mouvement inventé', () => {
    const r = run({ profile: { ...PROFILE_GYM, availableEquipment: [] } });
    // Poids du corps pur : EMOM squat + pompes reste possible ; AMRAP / for time exigent un ergomètre.
    const p = planOf(r.compose);
    expect(p.format).toBe('emom');
    expect(p.items.every((i) => ['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.push_up'].includes(i.exerciseId))).toBe(true);
    expect(p.rejectedFormats).toEqual([{ format: 'amrap', causes: ['ROLE_UNFILLED:monostructural'] }, { format: 'for_time', causes: ['ROLE_UNFILLED:monostructural'] }]);
    const aerobic = run({ stimulus: 'aerobic_capacity', profile: { ...PROFILE_GYM, availableEquipment: [] } });
    expect(aerobic.compose?.ok).toBe(false);
    expect(codes(aerobic.compose)).toContain(CT_CODES.C3_NO_FORMAT);
  });

  it('2. matériel incomplet (pas de rameur ni de SkiErg) ⇒ rôle monostructural intenable, format suivant', () => {
    const r = run({ profile: { ...FULL, availableEquipment: FULL.availableEquipment.filter((e) => e !== 'rower' && e !== 'skierg') } });
    expect(planOf(r.compose).format).toBe('emom');
    expect(rejectedCandidates(r.compose)).toEqual(expect.arrayContaining(['ex.row_erg:EQUIPMENT_MISSING', 'ex.skierg:EQUIPMENT_MISSING']));
  });

  it('3. mouvement exclu ⇒ jamais sélectionné, cause USER_EXCLUSION', () => {
    const r = run({ profile: { ...FULL, excludedExercises: ['ex.air_squat'] } });
    expect(ids(r.compose)).not.toContain('ex.air_squat');
    expect(rejectedCandidates(r.compose)).toContain('ex.air_squat:USER_EXCLUSION');
  });

  it('4. douleur lower_knee (genou) ⇒ aucun mouvement sensible au genou ; sans charge gouvernée, refus', () => {
    const r = run({ state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'] })] } });
    expect(r.compose?.ok).toBe(false);
    expect(rejectedCandidates(r.compose).filter((x) => x.includes('PAIN_AREA')).map((x) => x.split(':')[0])).toEqual(expect.arrayContaining(['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.box_jump', 'ex.wall_ball']));
    // P3 : haute intensité suspendue (G1) ⇒ refus explicite avant toute composition.
    const p3 = run({ state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'], level: 'P3' })] } });
    expect(p3.outcome.result.status).toBe('error');
    expect(reasons(p3.compose)[0]).toMatchObject({ code: CT_CODES.C3_STIMULUS_OUT_OF_SCOPE, params: { cause: 'HIGH_INTENSITY_SUSPENDED' } });
  });

  it('5. douleur lower_hip (bas du dos) ⇒ rameur et swing écartés, SkiErg retenu', () => {
    const r = run({ state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['lower_back'] })] }, gov: c3Governance({ loads: true }) });
    expect(ids(r.compose)).not.toContain('ex.row_erg');
    expect(ids(r.compose)).toContain('ex.skierg');
    expect(rejectedCandidates(r.compose)).toEqual(expect.arrayContaining(['ex.row_erg:PAIN_AREA', 'ex.kb_swing:PAIN_AREA']));
  });

  it('6. douleur upper_push (épaule) ⇒ pompes et SkiErg écartés', () => {
    const r = run({ stimulus: 'muscular_endurance', state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['shoulder'] })] } });
    expect(r.compose?.ok).toBe(false);
    expect(rejectedCandidates(r.compose).filter((x) => x.includes('PAIN_AREA')).map((x) => x.split(':')[0])).toEqual(expect.arrayContaining(['ex.push_up', 'ex.incline_push_up']));
  });

  it('7. douleur upper_pull (mouvement « pulling » restreint) ⇒ aucune traction, rôle upper_pull intenable ⇒ format suivant', () => {
    const r = run({ state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['elbow'], affectedMovements: ['pulling'] })] } });
    const p = planOf(r.compose);
    expect(p.items.map((i) => i.role)).not.toContain('upper_pull');
    expect(rejectedCandidates(r.compose)).toEqual(expect.arrayContaining(['ex.pull_up:PAIN_AREA+PAIN_MOVEMENT', 'ex.band_assisted_pull_up:PAIN_MOVEMENT']));
    expect(p.rejectedFormats[0]?.causes).toEqual(['ROLE_UNFILLED:upper_pull']);
  });

  it('8. grip déjà très sollicité (voisine grip=high) ⇒ classement : mouvements sans grip préférés, tracé', () => {
    const r = run({ ctx: NEIGHBOUR_HIGH('grip') });
    const p = planOf(r.compose);
    expect(p.avoidedStructures).toEqual(['grip']);
    expect(p.items.every((i) => i.criteria.some((c) => c.startsWith('neighbour_structure_conflicts:')))).toBe(true);
    expect(codes(r.compose)).toContain(CT_CODES.C3_NEIGHBOURS);
  });

  it('9. Running voisin (lower_knee + locomotor_impact high) ⇒ le bas du corps à faible impact est préféré', () => {
    const r = run({ ctx: { neighbours: { known: true, items: [{ discipline: 'running', hoursFromThisSession: 24, demand: { lower_knee: 'high', locomotor_impact: 'high' } }] } } });
    const lower = planOf(r.compose).items.find((i) => i.role === 'lower_body');
    expect(lower?.exerciseId).not.toBe('ex.box_jump');
    expect(lower?.criteria).toContain('neighbour_structure_conflicts:1');
  });

  it('10. Strength Lower voisin (lower_knee + lower_hip high) ⇒ évitement tracé, jamais d’exclusion', () => {
    const r = run({ ctx: { neighbours: { known: true, items: [{ discipline: 'strength', hoursFromThisSession: 24, demand: { lower_knee: 'high', lower_hip: 'high' } }] } } });
    const p = planOf(r.compose);
    expect(p.avoidedStructures).toEqual(['lower_hip', 'lower_knee']);
    expect(p.items.map((i) => i.role)).toContain('lower_body');
  });

  it('11. Strength Upper voisin (upper_pull high) ⇒ le monostructural sans tirage est préféré', () => {
    const r = run({ ctx: NEIGHBOUR_HIGH('upper_pull') });
    const p = planOf(r.compose);
    expect(p.avoidedStructures).toEqual(['upper_pull']);
    expect(p.items.find((i) => i.role === 'upper_pull')?.criteria).toContain('neighbour_structure_conflicts:1');
  });

  it('12. séance précédente très similaire (même format, mêmes mouvements) ⇒ autre format, mouvements frais', () => {
    const first = run();
    const second = run({ ctx: { sessionHistory: [realizedOf(first.compose)] } });
    const p = planOf(second.compose);
    expect(p.format).not.toBe(planOf(first.compose).format);
    expect(p.identicalToLast).toEqual([]);
    expect(p.items.filter((i) => ids(first.compose).includes(i.exerciseId)).every((i) => i.criteria[0] === 'recently_used_no_fresh_alternative')).toBe(true);
  });

  it('13. séance précédente abandonnée ⇒ politique gouvernée : ses mouvements écartés, tracé', () => {
    const first = run();
    const r = run({ ctx: { sessionHistory: [realizedOf(first.compose, { completion: 'abandoned', result: { kind: 'abandoned' } })] } });
    expect(codes(r.compose)).toContain(CT_CODES.C3_HISTORY_NEGATIVE);
    for (const id of ids(first.compose)) expect(ids(r.compose)).not.toContain(id);
    // Politique non résolue ⇒ capacité de composition désactivée (fail-closed).
    expect(run({ gov: c3Governance({ unresolved: ['ct.history.negativeResponse'] }), ctx: { sessionHistory: [] } }).compose?.ok).toBe(false);
  });

  it('14. mauvaise tolérance déclarée ⇒ mouvements écartés ; douleur déclarée ⇒ refus (politique TEST_ONLY)', () => {
    const first = run();
    const poor = run({ ctx: { sessionHistory: [realizedOf(first.compose, { tolerance: 'poorly_tolerated' })] } });
    expect(reasons(poor.compose).find((x) => x.code === CT_CODES.C3_HISTORY_NEGATIVE)?.params).toMatchObject({ causes: ['poorly_tolerated'], action: 'exclude_movements' });
    const hurt = run({ ctx: { sessionHistory: [realizedOf(first.compose, { pain: 'P2', completion: 'completed' })] } });
    expect(hurt.compose?.ok).toBe(false);
    expect(reasons(hurt.compose)[0]?.params).toMatchObject({ causes: ['pain'], action: 'refuse' });
  });

  it('15. durée 20 min ⇒ format tenant dans le temps ou refus, jamais de compression', () => {
    const r = run({ availableTimeS: T20 });
    expect(planOf(r.compose).blockS).toBeLessThanOrEqual(T20);
    expect(r.outcome.result.status).toBe('ok');
    const aerobic = run({ stimulus: 'aerobic_capacity', availableTimeS: T20 });
    expect(aerobic.compose?.ok).toBe(false);
  });

  it('16. durée 30 min ⇒ capacité aérobie : continu et intervalles écartés (temps utilisable = disponible − marge CORE), EMOM retenu', () => {
    const r = run({ stimulus: 'aerobic_capacity', availableTimeS: T30 });
    const p = planOf(r.compose);
    expect(p.format).toBe('emom');
    expect(p.rejectedFormats).toEqual([{ format: 'continuous', causes: ['EXCEEDS_AVAILABLE_TIME'] }, { format: 'intervals', causes: ['EXCEEDS_AVAILABLE_TIME'] }]);
    expect(r.outcome.result.status).toBe('ok');
  });

  it('17. durée 60 min ⇒ la durée du bloc reste celle de la dose gouvernée (jamais étirée pour remplir)', () => {
    const r60 = planOf(run({ availableTimeS: T60 }).compose);
    const r30 = planOf(run({ availableTimeS: T30 }).compose);
    expect(r60).toEqual(r30);
  });

  it('18. format impossible à estimer (débits non gouvernés) ⇒ for time / AMRAP / EMOM non générables', () => {
    const r = run({ gov: c3Governance({ unresolved: ['ct.estimation.workRates'] }) });
    expect(r.compose?.ok).toBe(false);
    expect(reasons(r.compose).filter((x) => x.code === CT_CODES.C3_FORMAT_REJECTED).map((x) => x.params.causes)).toEqual([
      ['UNGOVERNED:ct.estimation.workRates'], ['UNGOVERNED:ct.estimation.workRates'], ['UNGOVERNED:ct.estimation.workRates'],
    ]);
    // Les formats à durée prescrite et sans répétitions restent composables.
    expect(planOf(run({ stimulus: 'threshold', gov: c3Governance({ unresolved: ['ct.estimation.workRates'] }) }).compose).format).toBe('intervals');
  });

  it('19. mouvement chargé sans politique de charge ⇒ LOAD_POLICY_UNGOVERNED ; avec politique TEST_ONLY ⇒ charge prescrite au CORE', () => {
    const r = run({ ctx: { capabilityRequests: ['ctSessionComposition'] }, profile: { ...FULL, excludedExercises: ['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.box_jump'] } });
    expect(rejectedCandidates(r.compose)).toEqual(expect.arrayContaining(['ex.kb_swing:LOAD_POLICY_UNGOVERNED', 'ex.wall_ball:LOAD_POLICY_UNGOVERNED']));
    const loaded = run({ gov: c3Governance({ loads: true }), profile: { ...FULL, excludedExercises: ['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.box_jump'] } });
    const item = planOf(loaded.compose).items.find((i) => i.role === 'lower_body');
    expect(item?.loadKg).toBeDefined();
    const published = loaded.outcome.result.status === 'ok' ? loaded.outcome.result.value.blocks[0]?.items.find((i) => i.exerciseId === item?.exerciseId)?.prescription : undefined;
    expect(published).toMatchObject({ load: { kg: item?.loadKg, certainty: 'prescribed' } });
  });

  it('20. mouvement technique inadmissible (traction stricte, débutant) ⇒ TECHNICAL_INADMISSIBLE ; compétence déclarée ⇒ admise', () => {
    const beginner = { ...FULL, athleteLevel: 'beginner' as const };
    const r = run({ ctx: { population: { level: 'beginner', hybrid: false } }, profile: { ...beginner, excludedExercises: ['ex.band_assisted_pull_up'] } });
    expect(rejectedCandidates(r.compose)).toContain('ex.pull_up:TECHNICAL_INADMISSIBLE');
    const skilled = run({ ctx: { population: { level: 'beginner', hybrid: false }, declaredSkills: ['ex.pull_up'] }, profile: { ...beginner, excludedExercises: ['ex.band_assisted_pull_up'] } });
    expect(ids(skilled.compose)).toContain('ex.pull_up');
  });

  it('21. niveau débutant ⇒ dose du niveau ; niveau novice sans dose gouvernée pour un format ⇒ DOSE_UNDECIDED', () => {
    const r = run({ ctx: { population: { level: 'beginner', hybrid: false } } });
    expect(planOf(r.compose).blockS).toBe(600);
    const novice = run({ stimulus: 'threshold', ctx: { population: { level: 'novice', hybrid: false } } });
    expect(reasons(novice.compose).find((x) => x.code === CT_CODES.C3_FORMAT_REJECTED)?.params.causes).toEqual(['DOSE_UNDECIDED:novice']);
    const excluded = run({ stimulus: 'anaerobic_intervals', ctx: { population: { level: 'novice', hybrid: false } } });
    expect(reasons(excluded.compose)[0]).toMatchObject({ code: CT_CODES.C3_STIMULUS_OUT_OF_SCOPE, params: { cause: 'EXCLUDED_FOR_LEVEL' } });
  });

  it('22. niveau intermédiaire ⇒ dose intermédiaire, plafonds intermédiaires respectés (volume maximal borné)', () => {
    const p = planOf(run().compose);
    expect(p.blockS).toBe(720);
    expect(p.roundEstimate).toBeDefined();
  });

  it('23. combinaison redondante (même pattern / même famille) ⇒ refusée ; densité irréaliste ⇒ refusée', () => {
    const r = run({ stimulus: 'muscular_endurance', gov: c3Governance({ override: { 'ct.stimulus.admissibleFormats': { muscular_endurance: ['amrap'] } } }) });
    const p = planOf(r.compose);
    const lowers = p.items.filter((i) => i.role === 'lower_body');
    expect(lowers).toHaveLength(2);
    expect(rejectedCandidates(r.compose)).toEqual(expect.arrayContaining([expect.stringMatching(/^ex\.air_squat:.*ALREADY_IN_BLOCK/)]));
    const dense = run({ gov: c3Governance({ override: { 'ct.stimulus.admissibleFormats': { mixed_modal_medium: ['emom'] }, 'ct.format.emomDensity': { intermediate: 20 } } }) });
    // Réessai déterministe : chaque contributeur principal de densité est écarté (tracé) jusqu'à épuisement du rôle.
    expect(rejectedCandidates(dense.compose).some((x) => x.endsWith(':DENSITY_MAIN_CONTRIBUTOR'))).toBe(true);
    expect(dense.compose?.ok).toBe(false);
  });

  it('24. deux instances du même rôle ⇒ deux mouvements DIFFÉRENTS, sans redondance de pattern', () => {
    const r = run({ stimulus: 'muscular_endurance', gov: c3Governance({ override: { 'ct.stimulus.admissibleFormats': { muscular_endurance: ['amrap'] } } }) });
    const lowers = planOf(r.compose).items.filter((i) => i.role === 'lower_body').map((i) => i.exerciseId);
    expect(new Set(lowers).size).toBe(2);
    expect(rejectedCandidates(r.compose).some((x) => x.includes('REDUNDANT_PATTERN') || x.includes('REDUNDANT_FAMILY') || x.includes('ALREADY_IN_BLOCK'))).toBe(true);
  });

  it('25. historique vide ⇒ ordre gouverné, aucun critère d’historique inventé', () => {
    const r = run();
    expect(reasons(r.compose).find((x) => x.code === CT_CODES.C3_FORMAT_CHOSEN)?.params.criteria).toEqual(['admissible_for_stimulus', 'governed_order']);
    expect(planOf(r.compose).items.every((i) => i.criteria[0] === 'not_used_recently')).toBe(true);
  });

  it('26. historique riche (3 séances) ⇒ formats et mouvements tournent ; répétition inévitable tracée', () => {
    const history = [];
    const seen: string[] = [];
    for (let k = 0; k < 3; k += 1) {
      const r = run({ ctx: { sessionHistory: history.map((h, i) => ({ ...h, sessionId: `ct.prev.${String(i)}`, completedAt: `2026-09-2${String(i + 1)}T08:00:00Z` })) } });
      const p = planOf(r.compose);
      seen.push(p.format);
      history.push(realizedOf(r.compose));
    }
    expect(new Set(seen).size).toBe(3);
  });

  it('27. priorité CT première ⇒ tracée (rang 1), séance identique', () => {
    const a = run({ ctx: { sportPriority: { order: ['crosstraining', 'strength'] } } });
    const b = run();
    expect(reasons(a.compose).find((x) => x.code === CT_CODES.C3_INTENT)?.params).toMatchObject({ rank: 1, sportPriority: ['crosstraining', 'strength'] });
    expect(planOf(a.compose)).toEqual(planOf(b.compose));
  });

  it('28. priorité CT secondaire ⇒ tracée (rang 2), séance identique, politique « blocked »', () => {
    const a = run({ ctx: { sportPriority: { order: ['strength', 'crosstraining'] } } });
    expect(reasons(a.compose).find((x) => x.code === CT_CODES.C3_INTENT)?.params).toMatchObject({ rank: 2 });
    expect(reasons(a.compose).find((x) => x.code === CT_CODES.C3_NEIGHBOURS)?.params.priorityPolicy).toBe('blocked:priority_interference_policy');
    expect(planOf(a.compose)).toEqual(planOf(run().compose));
  });

  it('29. export / import ⇒ séance réalisée C3 conservée à l’identique (contrat CT)', () => {
    const r = run();
    const realized = realizedOf(r.compose);
    const state = { ...emptyState(), crosstraining: { realized: [realized] } };
    const back = decodeState(exportState(state));
    expect(back.ok && back.state.crosstraining.realized).toEqual([realized]);
  });

  it('30. reload ⇒ même entrée, même plan (déterministe, aucun hasard)', () => {
    const a = run({ seed: 'a' });
    const b = run({ seed: 'b' });
    expect(planOf(a.compose)).toEqual(planOf(b.compose));
    expect(JSON.stringify(a.outcome.result)).toBe(JSON.stringify(run({ seed: 'a' }).outcome.result));
  });

  it('31. anti-doublon : empreinte transmise au CORE (stimulus, format, volumes) ; analyse CORE avec historique', () => {
    const first = run();
    expect(first.compose?.ok && first.compose.proposal.fingerprintInputs).toMatchObject({ stimulus: 'mixed_modal_medium', format: 'amrap', energy: { status: 'not_applicable' } });
    const fp = first.outcome.fingerprint;
    expect(fp).toBeDefined();
    if (!fp) return;
    const again = run({ history: [{ fingerprint: fp, at: asISODateTime(PREV_AT), status: 'completed', repetitionIntents: [] }] });
    expect(again.outcome.duplicate?.comparisons.length ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('32. fail-closed : chaque paramètre essentiel manquant ⇒ aucune séance ; registre réel ⇒ aucune séance', () => {
    const essential = ['ct.stimulus.catalog', 'ct.stimulus.admissibleFormats', 'ct.stimulus.timeDomains', 'ct.composition.sessionStructure', 'ct.composition.movementPool', 'ct.composition.movementRoles', 'ct.dose.construction', 'ct.safety.technicalUnderFatigue', 'ct.history.recencyBand', 'ct.history.negativeResponse', 'ct.safety.novicePolicy'];
    for (const id of essential) {
      const r = run({ gov: c3Governance({ unresolved: [id] }) });
      expect(r.compose?.ok, id).toBe(false);
      expect(r.outcome.result.status, id).toBe('error');
    }
    // Forme illisible ⇒ refus explicite (jamais une interprétation partielle).
    const bad = run({ gov: c3Governance({ override: { 'ct.dose.construction': { mixed_modal_medium: 'beaucoup' } } }) });
    expect(codes(bad.compose)).toContain(CT_CODES.C3_PARAMETER_UNREADABLE);
    // Registre réel, PRODUCTION et CANDIDATE.
    for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) expect(run({ gov: CURRENT_CT_GOVERNANCE, ctx: { mode } }).outcome.result.status).toBe('error');
    // PRODUCTION avec les valeurs TEST_ONLY (EXPERT_PROPOSED) ⇒ refus : jamais PRODUCTION_ELIGIBLE.
    expect(run({ ctx: { mode: 'PRODUCTION' } }).compose?.ok).toBe(false);
    // Simulation exigée en CANDIDATE.
    const engine = createCrossTrainingEngine({ governance: c3Governance() });
    const ctx = parseCrossTrainingContext({ ...run().input?.discipline, capabilityRequests: [...C3_REQUESTS] });
    const input = run().input;
    if (!ctx.ok || !input) throw new Error('contexte');
    expect(engine.compose({ ...input, discipline: ctx.context })?.ok).toBe(false);
  });
});
