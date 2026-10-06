/**
 * HYROX H2 — 40 tests adversariaux (numérotés comme la demande H2 §38). Pipeline RÉEL du CORE, gouvernance TEST_ONLY ;
 * tout ce qui n'est pas gouverné refuse explicitement.
 */
import { describe, expect, it } from 'vitest';
import type { ReasonCode } from '@hybridsport/domain';
import { HR_CODES, HR_H2_RUN_PACE, HR_H2_TARGET_TIME, createHyroxEngine, h2PresentationOf, parseHyroxContext } from '../../src/index.js';
import type { H2Realized, HrRole } from '../../src/index.js';
import { PROFILE_HYROX, approvedTestOnly } from '../fixtures.js';
import { blockOf, itemsOf, reasonOf, reasonsOf, runH2 } from '../h2-fixtures.js';
import type { H2Run } from '../h2-fixtures.js';
import { TEST_H2 } from '../h2-governance.js';
import { STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';
import { collectImports, loadCoreSources } from '../../../engine/tests/architecture/source-scanner.js';

// technical-constant: TEST_ONLY — temps disponibles (secondes) : 20, 30 et 60 minutes
const T = { m20: 1200, m30: 1800, m60: 3600 } as const;
// technical-constant: TEST_ONLY — « maintenant » du banc de test du CORE (2026-09-28T08:00Z) et dates d'historique relatives
const NOW = '2026-09-28T08:00:00Z';
const DAY_BEFORE = '2026-09-27T08:00:00Z';
const LONG_AGO = '2026-08-01T08:00:00Z';

const exercisesOf = (r: H2Run) => itemsOf(r).map((i) => i.exerciseId);
const stationsOf = (r: H2Run) => [...new Set(exercisesOf(r).filter((e) => e !== 'ex.easy_run'))];
const rejectedOf = (r: H2Run) => reasonsOf(r, HR_CODES.H2_CANDIDATES_REJECTED).flatMap((x) => x.params.rejected as string[]);
const codes = (r: H2Run) => r.refusal.map((x) => x.code);
const painState = (areas: string[]) => ({ ...STATE_FRESH, activePain: [pain({ bodyAreas: areas })] });
const realized = (o: Partial<H2Realized> & Pick<H2Realized, 'exercises'>): H2Realized => ({
  sessionId: 'past.1', at: DAY_BEFORE, role: 'station_capacity', structure: 'station_repeats', completion: 'completed_as_prescribed', ...o,
} as H2Realized);
const neighbour = (discipline: 'running' | 'strength' | 'crosstraining', demand: Record<string, 'none' | 'low' | 'moderate' | 'high'>) => ({ known: true, items: [{ discipline, hoursFromThisSession: 24, demand }] });
const session = (r: H2Run) => r.session && h2PresentationOf(r.session, String(r.proposal?.archetypeId));

describe('H2 adversarial — matériel, stations, charges', () => {
  it('1. aucun matériel : seules les stations au poids du corps restent ; rôle chargé refusé explicitement', () => {
    const profile = { ...PROFILE_HYROX, availableEquipment: [] };
    const cap = runH2('station_capacity', {}, T.m60, { request: { profile } });
    expect(stationsOf(cap)).toEqual(['ex.burpee_broad_jump']);
    const se = runH2('strength_endurance', {}, T.m60, { request: { profile } });
    expect(se.session).toBeUndefined();
    expect(reasonOf(se, HR_CODES.H2_NO_STRUCTURE)).toBeDefined();
  });

  it('2. matériel incomplet (sans traîneau) : stations traîneau écartées, jamais substituées', () => {
    const profile = { ...PROFILE_HYROX, availableEquipment: PROFILE_HYROX.availableEquipment.filter((e) => e !== 'sled') };
    const r = runH2('strength_endurance', {}, T.m60, { request: { profile } });
    expect(rejectedOf(r).filter((x) => x.includes('EQUIPMENT_MISSING')).map((x) => x.split(':')[0])).toEqual(expect.arrayContaining(['sled_push', 'sled_pull']));
    expect(exercisesOf(r).some((e) => e.startsWith('ex.sled'))).toBe(false);
  });

  it('3. station impossible : mouvement inconnu ou non rattaché à la station ⇒ écartée (UNKNOWN_MOVEMENT / NOT_THIS_STATION)', () => {
    const pool = [...(TEST_H2['hybrid_race.h2.stationPool'] as { stationId: string; exerciseId: string; reviewRef: string }[]).filter((p) => p.stationId !== 'skierg' && p.stationId !== 'row'),
      { stationId: 'skierg', exerciseId: 'ex.inconnu', reviewRef: 'TEST-ONLY' }, { stationId: 'row', exerciseId: 'ex.skierg', reviewRef: 'TEST-ONLY' }];
    const r = runH2('mixed_station_conditioning', {}, T.m60, { params: { 'hybrid_race.h2.stationPool': pool } });
    expect(rejectedOf(r)).toEqual(expect.arrayContaining(['skierg:UNKNOWN_MOVEMENT', expect.stringMatching(/^row:.*NOT_THIS_STATION/)]));
  });

  it('4. station chargée sans politique de charge ⇒ LOAD_POLICY_UNGOVERNED ; seule station du réservoir ⇒ refus', () => {
    const doses = { ...(TEST_H2['hybrid_race.h2.stationDoses'] as Record<string, unknown>), sled_push: { intermediate: { dose: { kind: 'distance_m', value: 25 } } } };
    const pool = (TEST_H2['hybrid_race.h2.stationPool'] as { stationId: string }[]).filter((p) => p.stationId === 'sled_push');
    const r = runH2('station_capacity', {}, T.m60, { params: { 'hybrid_race.h2.stationDoses': doses, 'hybrid_race.h2.stationPool': pool } });
    expect(r.session).toBeUndefined();
    expect(rejectedOf(r)).toContain('sled_push:LOAD_POLICY_UNGOVERNED');
  });
});

describe('H2 adversarial — douleur et sollicitations', () => {
  const sensitive = (r: H2Run, areas: string[]) => exercisesOf(r).filter((e) => {
    const ex = { 'ex.sled_push': ['knee', 'lower_back'], 'ex.sled_pull': ['knee', 'lower_back'], 'ex.burpee_broad_jump': ['knee', 'lower_back'], 'ex.wall_ball': ['knee', 'shoulder'], 'ex.sandbag_lunge': ['knee'], 'ex.skierg': ['shoulder'], 'ex.row_erg': ['lower_back'], 'ex.farmers_carry': ['wrist_hand', 'lower_back'], 'ex.easy_run': ['knee', 'lower_leg', 'ankle_foot'] } as Record<string, string[]>;
    return (ex[e] ?? []).some((a) => areas.includes(a));
  });

  it.each([
    ['5. douleur lower_knee (genou)', ['knee']],
    ['6. douleur lower_hip (bas du dos / hanche)', ['lower_back', 'hip_groin']],
    ['7. douleur upper_push (épaule)', ['shoulder']],
    ['8. douleur upper_pull (coude / poignet)', ['elbow', 'wrist_hand']],
  ])('%s : aucune composante sensible ; refus explicite si plus rien n’est composable', (_label, areas) => {
    for (const role of ['station_capacity', 'mixed_station_conditioning', 'compromised_running'] as HrRole[]) {
      const r = runH2(role, {}, T.m60, { request: { state: painState(areas) } });
      if (r.session) expect(sensitive(r, areas)).toEqual([]);
      else expect(reasonOf(r, HR_CODES.H2_NO_STRUCTURE)).toBeDefined();
    }
  });

  it('9. grip sollicité par une voisine (politique TEST_ONLY : éviter `high`) ⇒ station sans grip classée d’abord, conflit tracé', () => {
    const r = runH2('station_capacity', { neighbours: neighbour('strength', { grip: 'high' }) }, T.m60);
    expect(stationsOf(r)).toEqual(['ex.wall_ball']);
    expect(reasonOf(r, HR_CODES.H2_STATION_SELECTED)?.params.criteria).toContain('neighbour_structure_conflicts:0');
    expect(session(r)?.components.length).toBe(1);
  });

  it('10. locomotor impact élevé (voisine) ⇒ stations à impact évitées', () => {
    const r = runH2('station_capacity', { neighbours: neighbour('running', { locomotor_impact: 'high' }) }, T.m60);
    expect(stationsOf(r)).not.toContain('ex.burpee_broad_jump');
    expect(reasonOf(r, HR_CODES.H2_NEIGHBOURS)?.params.policy).toBe('hybrid_race.h2.neighbourPolicy');
  });

  it('11. HIS élevé : douleur suspendant la haute intensité ⇒ refus ; voisine HIS high ⇒ conflit tracé partout, aucune exclusion', () => {
    const p3 = { ...STATE_FRESH, activePain: [pain({ level: 'P3', bodyAreas: ['shoulder'] })] };
    const r = runH2('station_capacity', {}, T.m60, { request: { state: p3 } });
    expect(r.refusal.map((x) => [x.code, x.params.cause])).toContainEqual([HR_CODES.H2_ROLE_UNAVAILABLE, 'HIGH_INTENSITY_SUSPENDED']);
    const n = runH2('station_capacity', { neighbours: neighbour('crosstraining', { high_intensity_systemic: 'high' }) }, T.m60);
    expect(n.session).toBeDefined();
    expect(reasonOf(n, HR_CODES.H2_STATION_SELECTED)?.params.criteria).toContain('neighbour_structure_conflicts:1');
  });
});

describe('H2 adversarial — voisines multisport (transportées, interprétées seulement si gouvernées)', () => {
  it('12. Running voisin : transporté et tracé ; sans politique ⇒ « blocked », séance inchangée', () => {
    const ctx = { neighbours: neighbour('running', { locomotor_impact: 'high', lower_knee: 'moderate' }) };
    const governed = runH2('station_capacity', ctx, T.m60);
    const blocked = runH2('station_capacity', ctx, T.m60, { params: { 'hybrid_race.h2.neighbourPolicy': null } });
    expect(reasonOf(blocked, HR_CODES.H2_NEIGHBOURS)?.params).toMatchObject({ policy: 'blocked:hybrid_race.h2.neighbourPolicy', neighbours: ['running@24h'] });
    expect(blocked.session?.blocks).toEqual(runH2('station_capacity', {}, T.m60).session?.blocks);
    expect(governed.session?.blocks).not.toEqual(blocked.session?.blocks);
  });

  it('13. Strength Lower voisin (lower_knee high) ⇒ stations lower_knee évitées', () => {
    const r = runH2('station_capacity', { neighbours: neighbour('strength', { lower_knee: 'high', lower_hip: 'high' }) }, T.m60);
    expect(['ex.sled_push', 'ex.sandbag_lunge', 'ex.wall_ball', 'ex.burpee_broad_jump']).not.toContain(stationsOf(r)[0]);
  });

  it('14. Strength Upper voisin (upper_pull high) ⇒ stations upper_pull évitées', () => {
    const r = runH2('station_capacity', { neighbours: neighbour('strength', { upper_pull: 'high', upper_push: 'high' }) }, T.m60);
    expect(['ex.skierg', 'ex.row_erg', 'ex.farmers_carry']).not.toContain(stationsOf(r)[0]);
  });

  it('15. Cross-training voisin : transporté, tracé avec la discipline', () => {
    const r = runH2('mixed_station_conditioning', { neighbours: neighbour('crosstraining', { grip: 'moderate' }) }, T.m60);
    expect(reasonOf(r, HR_CODES.H2_NEIGHBOURS)?.params.neighbours).toEqual(['crosstraining@24h']);
    expect(r.session).toBeDefined();
  });
});

describe('H2 adversarial — historique (mémoire, jamais progression)', () => {
  it('16. historique vide : ordre gouverné, aucune station récente', () => {
    const r = runH2('station_capacity', { compositionHistory: [] }, T.m60);
    expect(reasonOf(r, HR_CODES.H2_HISTORY)?.params).toMatchObject({ sameRole: 0, recentStations: [], lastStructure: 'none' });
  });

  it('17. historique riche : stations récentes classées après les fraîches (variété ≠ hasard), doses inchangées', () => {
    const past = ['ex.burpee_broad_jump', 'ex.farmers_carry', 'ex.row_erg'].map((e, k) => realized({ sessionId: `p${String(k)}`, exercises: [e] }));
    const r = runH2('station_capacity', { compositionHistory: past }, T.m60);
    expect(['ex.burpee_broad_jump', 'ex.farmers_carry', 'ex.row_erg']).not.toContain(stationsOf(r)[0]);
    expect(reasonOf(r, HR_CODES.H2_STATION_SELECTED)?.params.criteria).toContain('not_used_recently');
    // Aucune progression : la dose de la station choisie est la dose gouvernée, historique ou non.
    expect(blockOf(r)?.items[0]?.prescription).toEqual(blockOf(runH2('station_capacity', { compositionHistory: [] }, T.m60, { params: { 'hybrid_race.h2.stationPool': (TEST_H2['hybrid_race.h2.stationPool'] as { exerciseId: string }[]).filter((p) => p.exerciseId === stationsOf(r)[0]) } }))?.items[0]?.prescription);
  });

  it('18. séance précédente abandonnée ⇒ ses stations écartées (politique TEST_ONLY), tracé', () => {
    const r = runH2('station_capacity', { compositionHistory: [realized({ completion: 'abandoned', exercises: ['ex.burpee_broad_jump'] })] }, T.m60);
    expect(reasonOf(r, HR_CODES.H2_HISTORY_NEGATIVE)?.params).toMatchObject({ causes: ['abandoned'], action: 'exclude_stations' });
    expect(stationsOf(r)).not.toContain('ex.burpee_broad_jump');
    expect(rejectedOf(r)).toContain('burpee_broad_jump:EXCLUDED_BY_NEGATIVE_HISTORY');
  });

  it('19. douleur précédente ⇒ refus (politique TEST_ONLY « refuse ») ; hors fenêtre de récence ⇒ plus d’effet', () => {
    const r = runH2('station_capacity', { compositionHistory: [realized({ pain: 'REPORTED', exercises: ['ex.burpee_broad_jump'] })] }, T.m60);
    expect(r.session).toBeUndefined();
    expect(reasonOf(r, HR_CODES.H2_HISTORY_NEGATIVE)?.params).toMatchObject({ causes: ['pain'], action: 'refuse' });
    const old = runH2('station_capacity', { compositionHistory: [realized({ at: LONG_AGO as H2Realized['at'], pain: 'REPORTED', exercises: ['ex.burpee_broad_jump'] })] }, T.m60);
    expect(old.session).toBeDefined();
  });

  it('20. station répétée : la dernière station du même rôle n’est reprise que sans alternative fraîche', () => {
    const r = runH2('station_capacity', { compositionHistory: [realized({ exercises: ['ex.burpee_broad_jump'] })] }, T.m60);
    expect(stationsOf(r)).not.toEqual(['ex.burpee_broad_jump']);
    const only = runH2('station_capacity', { compositionHistory: [realized({ exercises: ['ex.burpee_broad_jump'] })] }, T.m60, { params: { 'hybrid_race.h2.stationPool': [{ stationId: 'burpee_broad_jump', exerciseId: 'ex.burpee_broad_jump', reviewRef: 'TEST-ONLY' }] } });
    expect(reasonOf(only, HR_CODES.H2_STATION_SELECTED)?.params.criteria).toContain('recently_used_no_fresh_alternative');
    expect(reasonOf(only, HR_CODES.H2_REPEAT_UNAVOIDABLE)?.params.identicalLevels).toEqual(['structure', 'components', 'order']);
  });

  it('21. structure répétée : la structure la MOINS récemment utilisée du rôle passe d’abord', () => {
    const r = runH2('strength_endurance', { compositionHistory: [realized({ role: 'strength_endurance', structure: 'station_circuit', exercises: ['ex.farmers_carry', 'ex.sandbag_lunge'] })] }, T.m60);
    expect(reasonOf(r, HR_CODES.H2_STRUCTURE_CHOSEN)?.params).toMatchObject({ structure: 'station_repeats', criteria: ['admitted_for_role', 'not_used_in_window'] });
  });
});

describe('H2 adversarial — durée, course, transitions', () => {
  it('22. 20 min : rôle composable si une option de volume tient, sinon refus explicite (EXCEEDS_AVAILABLE_TIME / OUTSIDE_TIME_DOMAIN)', () => {
    expect(runH2('strength_endurance', {}, T.m20).session).toBeDefined();
    const r = runH2('compromised_running', {}, T.m20);
    expect(r.session).toBeUndefined();
    expect(String(reasonOf(r, HR_CODES.H2_NO_STRUCTURE)?.params.tried)).toMatch(/EXCEEDS_AVAILABLE_TIME|OUTSIDE_TIME_DOMAIN/);
  });

  it('23. 30 min : time cap ≤ disponible − marge du profil de tolérance', () => {
    for (const role of ['station_capacity', 'compromised_running', 'partial_simulation'] as HrRole[]) {
      const b = blockOf(runH2(role, {}, T.m30)) as { timeCapS: number } | undefined;
      // technical-constant: TEST_ONLY — marge du profil `for_time` du ruleset de test
      expect(b?.timeCapS ?? 0).toBeLessThanOrEqual(T.m30 - 300);
      expect(b).toBeDefined();
    }
  });

  it('24. 60 min : options de volume essayées dans l’ordre gouverné ; option trop longue écartée et tracée', () => {
    const r = runH2('compromised_running', {}, T.m60);
    expect(blockOf(r)).toMatchObject({ rounds: 2 });
    expect(reasonsOf(r, HR_CODES.H2_STRUCTURE_REJECTED).map((x) => [x.params.structure, x.params.causes])).toEqual([['run_station_alternation@3x2', ['EXCEEDS_AVAILABLE_TIME']]]);
    expect(blockOf(runH2('station_capacity', {}, T.m60))).toMatchObject({ rounds: 5 });
  });

  it('25. durée non estimable (débit de course non gouverné) ⇒ structure avec course refusée, jamais une durée inventée', () => {
    const rates = { ...(TEST_H2['hybrid_race.h2.workRates'] as Record<string, unknown>) };
    delete rates['ex.easy_run'];
    const r = runH2('compromised_running', {}, T.m60, { params: { 'hybrid_race.h2.workRates': rates } });
    expect(r.session).toBeUndefined();
    expect(reasonOf(r, HR_CODES.H2_NO_STRUCTURE)?.params.tried).toEqual(['run_station_alternation:RUN_COMPONENT:WORK_RATE_UNGOVERNED']);
  });

  it('26. course compromise sans allure : distance seule, allure BLOCKED (moteur Running), aucune vitesse prescrite', () => {
    const r = runH2('compromised_running', {}, T.m60);
    const runs = itemsOf(r).filter((i) => i.exerciseId === 'ex.easy_run');
    expect(runs.every((i) => i.prescription.type === 'distance' && !('targetPace' in i.prescription))).toBe(true);
    expect(session(r)?.components.filter((c) => c.kind === 'run').every((c) => c.pace === HR_H2_RUN_PACE)).toBe(true);
  });

  it('27. transition sans durée : comptée, durée null, exclue de l’estimation', () => {
    const r = runH2('partial_simulation', {}, T.m60);
    expect(session(r)?.transitions).toEqual({ count: itemsOf(r).length - 1, durationS: null });
    expect(reasonOf(r, HR_CODES.H2_TRANSITIONS)?.params).toMatchObject({ durationS: 'unknown', estimate: 'excluded' });
  });
});

describe('H2 adversarial — priorité, objectif, simulation, état', () => {
  it('28-29. priorité HYROX première ou secondaire : tracée, AUCUNE politique ⇒ séance identique', () => {
    const first = runH2('mixed_station_conditioning', { sportPriority: { order: ['hybrid_race', 'running'] } }, T.m60);
    const second = runH2('mixed_station_conditioning', { sportPriority: { order: ['running', 'hybrid_race'] } }, T.m60);
    expect(reasonOf(first, HR_CODES.H2_INTENT)?.params.rank).toBe(1);
    expect(reasonOf(second, HR_CODES.H2_INTENT)?.params.rank).toBe(2);
    expect(reasonOf(first, HR_CODES.H2_NEIGHBOURS)?.params.priorityPolicy).toBe('blocked:priority_interference_policy');
    expect(first.session?.blocks).toEqual(second.session?.blocks);
  });

  it('30-31. objectif GENERAL ou RACE_PREPARATION (avec temps cible) : transporté, temps cible NON interprété ⇒ séance identique', () => {
    const general = runH2('compromised_running', { goal: { type: 'GENERAL' } }, T.m60);
    // technical-constant: TEST_ONLY — temps cible déclaré (secondes), jamais interprété
    const race = runH2('compromised_running', { goal: { type: 'RACE_PREPARATION', targetTimeS: 5400 } }, T.m60);
    expect(reasonOf(race, HR_CODES.H2_GOAL_TRANSPORTED)?.params).toEqual({ goal: 'RACE_PREPARATION', targetTime: '5400s', interpretation: HR_H2_TARGET_TIME });
    expect(race.session?.blocks).toEqual(general.session?.blocks);
  });

  it('32. simulation complète non gouvernée : archétype inconnu ⇒ refus (aucun rôle « full simulation »)', () => {
    const engine = createHyroxEngine({ simulation: true });
    const issues = (engine.validateIntent ?? (() => []))({ intent: { archetypeId: 'hybrid_race.h2.full_simulation' } } as never);
    expect(issues.map((x: ReasonCode) => x.code)).toEqual([HR_CODES.ARCHETYPE_UNKNOWN]);
  });

  it('33. export / import : aucun état applicatif H2 (HYROX hors Beta 0) ; le contexte H2 survit à JSON aller-retour', () => {
    const ctx = { population: { level: 'intermediate', hybrid: false }, mode: 'CANDIDATE', returnState: { state: 'NONE' }, goal: { type: 'RACE_PREPARATION', targetTimeS: 5400 },
      compositionHistory: [realized({ exercises: ['ex.skierg'] })], plannedSessions: [{ sessionId: 's', at: NOW, role: 'compromised_running', structure: 'run_station_alternation', exercises: ['ex.skierg', 'ex.easy_run'] }] };
    const parsed = parseHyroxContext(JSON.parse(JSON.stringify(ctx)));
    expect(parsed.ok).toBe(true);
    const app = loadCoreSources(['packages/app-core/src']);
    expect(app.some((f) => /compositionHistory|hybrid_race\.h2/.test(f.text))).toBe(false);
  });

  it('34. empreinte : stations différentes ⇒ empreintes différentes ; séance identique ⇒ empreinte identique ; résultat jamais inclus', () => {
    const a = runH2('station_capacity', {}, T.m60);
    const b = runH2('station_capacity', { compositionHistory: [realized({ exercises: ['ex.burpee_broad_jump'] })] }, T.m60);
    const c = runH2('station_capacity', {}, T.m60);
    expect(a.outcome.fingerprint).toEqual(c.outcome.fingerprint);
    expect(a.outcome.fingerprint?.repScheme).not.toEqual(b.outcome.fingerprint?.repScheme);
    expect(JSON.stringify(a.proposal?.fingerprintInputs)).not.toMatch(/completion|achieved|elapsed|result/);
  });

  it('35. fail-closed PRODUCTION : valeurs draft ⇒ NOT_PRODUCTION_READY ; ruleset sans H2 ⇒ MISSING ; CANDIDATE sans simulation ⇒ refus', () => {
    const prod = runH2('station_capacity', { mode: 'PRODUCTION' }, T.m60, { engine: createHyroxEngine() });
    expect(prod.refusal.filter((x) => x.code === HR_CODES.PARAMETER_UNAVAILABLE).every((x) => x.params.cause === 'NOT_PRODUCTION_READY')).toBe(true);
    expect(prod.session).toBeUndefined();
    const none = runH2('station_capacity', {}, T.m60, { params: Object.fromEntries(Object.keys(TEST_H2).map((k) => [k, null])) });
    expect(new Set(none.refusal.filter((x) => x.code === HR_CODES.PARAMETER_UNAVAILABLE).map((x) => x.params.cause))).toEqual(new Set(['MISSING']));
    expect(codes(runH2('station_capacity', {}, T.m60, { engine: createHyroxEngine() }))).toEqual([HR_CODES.SIMULATION_REQUIRED]);
    // Approbation TEST simulée (jamais réelle) : la PRODUCTION n'est ouverte que par des paramètres approuvés et non provisoires.
    expect(runH2('station_capacity', { mode: 'PRODUCTION' }, T.m60, { engine: createHyroxEngine(), extra: approvedTestOnly }).session).toBeDefined();
  });

  it('36. valeurs TEST_ONLY tracées : CANDIDATE_VALUE_USED par paramètre utilisé, versions dans parametersUsed', () => {
    const r = runH2('partial_simulation', {}, T.m60);
    const used = (r.proposal?.parametersUsed as { id: string }[]).map((u) => u.id);
    const traced = reasonsOf(r, HR_CODES.CANDIDATE_VALUE_USED).map((x) => x.params.parameterId);
    expect(used).toEqual(expect.arrayContaining(['hybrid_race.h2.raceSequence', 'hybrid_race.h2.runSegment', 'hybrid_race.h2.runExercise', 'hybrid_race.h2.stationDoses']));
    expect(new Set(traced)).toEqual(new Set(used));
  });
});

describe('H2 adversarial — frontières (aucun moteur bis, aucune logique de station hors HYROX)', () => {
  const STATION_WORDS = /skierg|sled|wall_?ball|burpee|sandbag|farmers|hybridRaceStation|raceSequence/i;
  const code = (dirs: string[]) => loadCoreSources(dirs).flatMap((f) => f.text.split('\n').flatMap((l, i) => (!/^\s*(\*|\/\/|\/\*\*)/.test(l) ? [{ at: `${f.path}:${String(i + 1)}`, l }] : [])));

  it('37. Planner : placement sans import HYROX ; aucun nom de station dans le planificateur', () => {
    const planner = loadCoreSources(['packages/planner/src']);
    expect(collectImports(planner.filter((f) => !/ports\.ts$|execution\.ts$|index\.ts$/.test(f.path))).filter((x) => x.module.includes('hyrox'))).toEqual([]);
    expect(code(['packages/planner/src']).filter((x) => STATION_WORDS.test(x.l)).map((x) => x.at)).toEqual([]);
  });

  it('38. Programme : aucune logique de station (ni nom, ni choix, ni ordre d’épreuve)', () => {
    expect(code(['packages/programme/src']).filter((x) => STATION_WORDS.test(x.l)).map((x) => x.at)).toEqual([]);
    expect(collectImports(loadCoreSources(['packages/programme/src'])).filter((x) => x.module.includes('hyrox'))).toEqual([]);
  });

  it('39. aucun moteur Running bis : HYROX ne calcule ni allure, ni zone, ni structure de course', () => {
    const lines = code(['packages/hyrox/src']);
    expect(lines.filter((x) => /targetPace|paceS\b|paceZone|hrZone|run_structure|type:\s*'intervals'|vdot|threshold/i.test(x.l)).map((x) => x.at)).toEqual([]);
    expect(collectImports(loadCoreSources(['packages/hyrox/src'])).filter((x) => /running|strength|crosstraining/.test(x.module))).toEqual([]);
  });

  it('40. aucun moteur Strength bis : HYROX ne prescrit ni séries, ni RIR, ni % de 1RM, ni progression de charge', () => {
    const lines = code(['packages/hyrox/src']);
    expect(lines.filter((x) => /type:\s*'sets'|\brir\b|oneRm|1rm|percent1RM|e1rm|progression/i.test(x.l)).map((x) => x.at)).toEqual([]);
  });
});
