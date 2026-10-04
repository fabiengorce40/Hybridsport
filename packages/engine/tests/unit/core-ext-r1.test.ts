/**
 * Phase 6A — CORE-EXT-R1 : séance structurée à profondeur fixe (run_structure), estimations stockées
 * et recalculées (Q2), distance ⇒ allure sourcée (Q1), échauffement / retour au calme exclusifs (Q3),
 * session_record v4. Les valeurs numériques ci-dessous sont ILLUSTRATIVES (données de test), jamais des
 * prescriptions.
 */
import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA, MAX_RUN_EXECUTION_STEPS, MAX_RUN_REPS, MAX_RUN_SEGMENTS, MAX_RUN_SETS, STRUCTURE_ISSUES,
  executionStepKey, executionSteps, resolveExecutionAddress, runStructureIssues, segmentStepCount, zRunStructure, zSessionDraft,
} from '@hybridsport/domain';
import type { RunSegment, RunStructure, SessionDraft, SessionDraftInput, SessionRecord } from '@hybridsport/domain';
import {
  ENGINE_VERSION, MIGRATIONS, canonicalStringify, checkRunEstimate, createCoreRegistry, deriveRunEstimate, doseDuration, estimateDuration,
  fitDuration, migrateToCurrent, readDurationParams, reduceRunStructure, toEnvelope, toRecordedDurationEstimate, validateSession,
  verifyRecordedDuration, withDerivedEstimate,
} from '../../src/index.js';
import { baseContext, deps } from '../fixtures/context.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

const d = deps();
const codes = (r: ReturnType<typeof validateSession>): string[] => r.report.errors.map((e) => e.reason.code);
const S = (issue: (typeof STRUCTURE_ISSUES)[number]): string => `TECHNICAL.STRUCTURE.${issue}`;

// ——— Fabriques de test (valeurs illustratives) ———
const prov = { source: 'reference_derived', sourceId: 'ref.test' } as const;
const easy = { domain: 'easy_low', effort: { rpe: { min: 2, max: 3 } }, priority: 'effort' } as const;
const hard = { domain: 'threshold_like', effort: { rpe: { min: 5, max: 6 } }, priority: 'effort' } as const;
const paced = (min: number, max: number) => ({ domain: 'severe', pace: { secPerKm: { min, max }, provenance: prov }, effort: { rpe: { min: 7, max: 8 } }, priority: 'pace' }) as const;
const jog = (durationS: number) => ({ dose: { durationS }, mode: 'jog' }) as const;
const walk = (durationS: number) => ({ dose: { durationS }, mode: 'walk' }) as const;
const warm = (durationS = 600, id = 'seg.wu'): RunSegment => ({ kind: 'warmup', id, dose: { durationS }, target: easy });
const cool = (durationS = 480, id = 'seg.cd'): RunSegment => ({ kind: 'cooldown', id, dose: { durationS }, target: easy });
const steady = (durationS = 180, id = 'seg.st'): RunSegment => ({ kind: 'steady', id, dose: { durationS }, target: easy });
const rep = (over: Partial<Extract<RunSegment, { kind: 'repeat' }>> = {}): RunSegment => ({ kind: 'repeat', id: 'seg.A', sets: 1, reps: 4, work: { durationS: 180 }, target: hard, recovery: jog(120), ...over });

function rs(segments: readonly unknown[]): RunStructure {
  const p = withDerivedEstimate({ type: 'run_structure', segments: segments as RunSegment[] });
  if (!p) throw new Error('structure non dérivable');
  return p;
}
/** Structure brute (estimation fournie telle quelle, éventuellement fausse). */
const raw = (segments: readonly unknown[], estimate: unknown = { method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS: { min: 0, max: 0 }, totalS: { min: 0, max: 0 } }) => ({ type: 'run_structure', segments, estimate });

function runInput(prescriptions: readonly unknown[], over: Partial<SessionDraftInput> = {}): SessionDraftInput {
  return {
    id: 'session.test.run', discipline: 'running', athleteLevel: 'intermediate', availableTimeS: 7200, targetDurationS: 3600, toleranceProfile: 'strength_sets',
    blocks: prescriptions.map((p, i) => ({ id: `b.run${String(i)}`, kind: 'running', role: i === 0 ? 'primary' : 'secondary', format: 'continuous', items: [{ id: `i.run${String(i)}`, exerciseId: 'ex.easy_run', prescription: p }] })) as SessionDraftInput['blocks'],
    ...over,
  };
}
const validate = (input: unknown) => validateSession(input, baseContext(), d);

describe('CORE-EXT-R1 — 25 cas requis', () => {
  it('01 répétition en durée : travail et total exacts, séance VALID', () => {
    const p = rs([rep()]);
    expect(p.estimate).toEqual({ method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS: { min: 720, max: 720 }, totalS: { min: 1080, max: 1080 } });
    expect(validate(runInput([p])).report.status).toBe('VALID');
  });

  it('02 distance + allure sourcée : min = allure rapide, max = allure lente', () => {
    const p = rs([rep({ reps: 5, work: { distanceM: 400 }, target: paced(200, 220), recovery: jog(90) })]);
    expect(p.estimate.workS).toEqual({ min: 400, max: 440 });
    expect(p.estimate.totalS).toEqual({ min: 400 + 360, max: 440 + 360 });
    expect(validate(runInput([p])).report.status).toBe('VALID');
  });

  it('03 distance sans allure ⇒ refus explicite DISTANCE_WITHOUT_PACE (jamais une allure inventée)', () => {
    const segs = [rep({ work: { distanceM: 400 }, target: hard })];
    expect(deriveRunEstimate({ segments: segs })).toEqual({ ok: false, reason: 'DISTANCE_WITHOUT_PACE' });
    expect(withDerivedEstimate({ type: 'run_structure', segments: segs })).toBeUndefined();
    const r = validate(runInput([raw(segs)]));
    expect(r.report.status).toBe('INVALID');
    expect(codes(r)).toContain(S('DISTANCE_WITHOUT_PACE'));
    expect(doseDuration({ distanceM: 400 }, undefined)).toEqual({ ok: false, reason: 'DISTANCE_WITHOUT_PACE' });
  });

  it('04 ordre rapide / lent : la borne min vient de l’allure la plus rapide ; plage inversée refusée', () => {
    const r = doseDuration({ distanceM: 1000 }, { secPerKm: { min: 240, max: 300 }, provenance: prov });
    expect(r).toEqual({ ok: true, range: { min: 240, max: 300 } });
    const inv = validate(runInput([raw([rep({ work: { distanceM: 400 }, target: paced(220, 200) })])]));
    expect(codes(inv)).toContain(S('PACE_RANGE_INVERTED'));
  });

  it('05 répétitions multiples : linéaire en nombre de répétitions (sans récupération après la dernière)', () => {
    for (const reps of [1, 2, 7]) {
      const p = rs([rep({ reps })]);
      expect(p.estimate.totalS.min).toBe(reps * 180 + (reps - 1) * 120);
    }
  });

  it('06 séries multiples : récupération entre séries, aucune après la dernière série', () => {
    const p = rs([rep({ sets: 3, reps: 4, betweenSetRecovery: walk(180) })]);
    expect(p.estimate.workS.min).toBe(12 * 180);
    expect(p.estimate.totalS.min).toBe(12 * 180 + 3 * 3 * 120 + 2 * 180);
    expect(validate(runInput([p])).report.status).toBe('VALID');
  });

  it('07 récupération : distance avec allure ; entre séries obligatoire / interdite ; récupération sans répétition', () => {
    const pr = { secPerKm: { min: 360, max: 420 }, provenance: prov };
    const p = rs([rep({ reps: 2, recovery: { dose: { distanceM: 200 }, mode: 'jog', pace: pr } })]);
    expect(p.estimate.totalS).toEqual({ min: 360 + 72, max: 360 + 84 });
    expect(codes(validate(runInput([raw([rep({ recovery: { dose: { distanceM: 200 }, mode: 'jog' } })])])))).toContain(S('DISTANCE_WITHOUT_PACE'));
    expect(codes(validate(runInput([raw([rep({ sets: 2 })])])))).toContain(S('RECOVERY_BETWEEN_SETS_REQUIRED'));
    expect(codes(validate(runInput([raw([rep({ sets: 1, betweenSetRecovery: walk(60) })])])))).toContain(S('RECOVERY_BETWEEN_SETS_FORBIDDEN'));
    expect(codes(validate(runInput([raw([{ kind: 'preparation', id: 'seg.p', dose: { durationS: 15 }, target: easy, recovery: walk(45) }])])))).toContain(S('RECOVERY_WITHOUT_REPETITION'));
    expect(codes(validate(runInput([raw([rep({ recovery: { dose: { durationS: 60 }, mode: 'jog', pace: pr } })])])))).toContain(S('TARGET_COMBINATION_INVALID'));
  });

  it('08 cible RPE seule (sans montre ni allure) : acceptée', () => {
    expect(validate(runInput([rs([warm(), rep(), cool()])])).report.status).toBe('VALID');
    expect(runStructureIssues({ segments: [rep({ target: { domain: 'moderate', effort: { descriptorKey: 'effort.comfortable' }, priority: 'effort' } })] })).toEqual([]);
  });

  it('09 cible FC : plage acceptée, jamais requise ; priorité FC sans plage ⇒ refus', () => {
    expect(runStructureIssues({ segments: [rep({ target: { ...hard, hrBpm: { min: 150, max: 165 }, priority: 'hr' } })] })).toEqual([]);
    expect(runStructureIssues({ segments: [rep({ target: { ...hard, priority: 'hr' } })] }).map((i) => i.code)).toEqual(['TARGET_PRIORITY_ABSENT']);
    expect(runStructureIssues({ segments: [rep({ target: { domain: 'moderate', hrBpm: { min: 140, max: 150 }, priority: 'hr' } })] }).map((i) => i.code)).toEqual(['TARGET_WITHOUT_EFFORT_OR_PACE']);
  });

  it('10 NO_WEARABLE : effort seul accepté ; allure ou FC avec NO_WEARABLE ⇒ combinaison refusée', () => {
    expect(runStructureIssues({ segments: [rep({ target: { ...hard, noWearable: true } })] })).toEqual([]);
    expect(runStructureIssues({ segments: [rep({ target: { ...hard, noWearable: true, hrBpm: { min: 150, max: 160 } } })] }).map((i) => i.code)).toEqual(['TARGET_COMBINATION_INVALID']);
    expect(runStructureIssues({ segments: [rep({ work: { distanceM: 400 }, target: { ...paced(200, 220), noWearable: true } })] }).map((i) => i.code)).toEqual(['TARGET_COMBINATION_INVALID']);
  });

  it('11 échauffement interne (séance de course pure) : accepté', () => {
    const r = validate(runInput([rs([warm(), rep(), cool()])]));
    expect(r.report.status).toBe('VALID');
  });

  it('12 échauffement externe en multidiscipline : blocs séparés acceptés ; segment interne en plus ⇒ double représentation', () => {
    const base = strengthSessionInput();
    const mixed = (p: unknown) => ({ ...base, discipline: 'hybrid_race', availableTimeS: 7200, targetDurationS: 3600, blocks: [...base.blocks, { id: 'b.run', kind: 'running', role: 'secondary', format: 'continuous', items: [{ id: 'i.run', exerciseId: 'ex.easy_run', prescription: p }] }] });
    expect(validate(mixed(rs([rep()]))).report.status).toBe('VALID');
    expect(codes(validate(mixed(rs([warm(), rep()]))))).toEqual([S('WARMUP_COOLDOWN_DOUBLE_REPRESENTATION')]);
    expect(codes(validate(mixed(rs([rep(), cool()]))))).toEqual([S('WARMUP_COOLDOWN_DOUBLE_REPRESENTATION')]);
  });

  it('13 double échauffement ⇒ refus (même structure, deux structures, bloc + segment)', () => {
    expect(codes(validate(runInput([raw([warm(600, 'w1'), warm(300, 'w2'), rep()])])))).toEqual(expect.arrayContaining([S('WARMUP_DUPLICATED'), S('WARMUP_NOT_FIRST')]));
    expect(codes(validate(runInput([rs([warm(600, 'w1'), rep()]), rs([warm(300, 'w2'), rep({ id: 'seg.B' })])])))).toEqual([S('WARMUP_DUPLICATED')]);
    expect(codes(validate(runInput([rs([rep()]), rs([warm(), rep({ id: 'seg.B' })])])))).toEqual([S('WARMUP_NOT_FIRST')]);
    const withBlock = runInput([rs([warm(), rep()])]);
    const both = { ...withBlock, blocks: [{ id: 'b.wu', kind: 'warmup', role: 'support', format: 'continuous', items: [{ id: 'i.mob', exerciseId: 'ex.hip_mobility_flow', prescription: { type: 'mobility', seconds: 300 } }] }, ...withBlock.blocks] };
    expect(codes(validate(both))).toEqual([S('WARMUP_COOLDOWN_DOUBLE_REPRESENTATION')]);
  });

  it('14 double retour au calme ⇒ refus', () => {
    expect(codes(validate(runInput([raw([rep(), cool(300, 'c1'), cool(300, 'c2')])])))).toEqual(expect.arrayContaining([S('COOLDOWN_DUPLICATED'), S('COOLDOWN_NOT_LAST')]));
    expect(codes(validate(runInput([rs([rep(), cool(300, 'c1')]), rs([rep({ id: 'seg.B' }), cool(300, 'c2')])])))).toEqual([S('COOLDOWN_DUPLICATED')]);
    expect(codes(validate(runInput([rs([rep(), cool()]), rs([rep({ id: 'seg.B' })])])))).toEqual([S('COOLDOWN_NOT_LAST')]);
    expect(codes(validate(runInput([raw([cool(), rep()])])))).toContain(S('COOLDOWN_NOT_LAST'));
  });

  it('15 estimation stockée ≠ recalcul ⇒ refus (validateur ET lecteur), jamais réparée', () => {
    const p = rs([rep()]);
    const tampered = { ...p, estimate: { ...p.estimate, totalS: { min: 1080, max: 1081 } } };
    const r = validate(runInput([tampered]));
    expect(r.report.status).toBe('INVALID');
    expect(r.report.errors.map((e) => e.reason)).toContainEqual(expect.objectContaining({ code: 'DURATION.ESTIMATE_MISMATCH', params: expect.objectContaining({ field: 'totalS', storedMaxS: 1081, recomputedMaxS: 1080 }) }));
    const work = { ...p, estimate: { ...p.estimate, workS: { min: 719, max: 720 } } };
    expect(checkRunEstimate(work)).toMatchObject({ consistent: false, field: 'workS' });
    const rec = recordOf(zSessionDraft.parse(runInput([tampered])));
    const read = migrateToCurrent(JSON.parse(JSON.stringify(toEnvelope('session_record', rec))));
    expect(!read.ok && read.reasons.map((x) => x.code)).toEqual(['DURATION.ESTIMATE_MISMATCH']);
  });

  it('16 legacy v3 : estimation UNAVAILABLE_LEGACY, jamais reconstituée ; combinaisons de versions malformées refusées', () => {
    const legacy = { session: session(), provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' } };
    const r = migrateToCurrent<SessionRecord>({ kind: 'session_record', schemaVersion: 3, data: legacy });
    expect(r.ok && r.value.durationEstimate).toEqual({ availability: 'UNAVAILABLE_LEGACY' });
    if (!r.ok) return;
    const v = verifyRecordedDuration(r.value, { catalog: testCatalog(), ruleset: testRuleset(), engineVersion: ENGINE_VERSION });
    expect(v).toMatchObject({ status: 'unavailable', reason: { code: 'DURATION.ESTIMATE_UNAVAILABLE_LEGACY' } });
    const withRun = { ...legacy, session: zSessionDraft.parse(runInput([rs([rep()])])) };
    const bad1 = migrateToCurrent({ kind: 'session_record', schemaVersion: 3, data: withRun });
    expect(!bad1.ok && bad1.reasons[0]).toMatchObject({ code: 'TECHNICAL.MIGRATION_FAILED', params: { from: 3, to: 4 } });
    const bad2 = migrateToCurrent({ kind: 'session_record', schemaVersion: 3, data: { ...legacy, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } } });
    expect(!bad2.ok && bad2.reasons[0]?.code).toBe('TECHNICAL.MIGRATION_FAILED');
    const bad3 = migrateToCurrent({ kind: 'session_record', schemaVersion: 4, data: legacy });
    expect(!bad3.ok && bad3.reasons[0]?.code).toBe('TECHNICAL.SCHEMA_INVALID');
    const oldReader = { session_record: { version: 3, schema: CURRENT_SCHEMA.session_record.schema } };
    const bad4 = migrateToCurrent(toEnvelope('session_record', recordOf(withRun.session)), MIGRATIONS.slice(0, 2), oldReader);
    expect(!bad4.ok && bad4.reasons[0]).toMatchObject({ code: 'TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', params: { version: 5, current: 3 } });
  });

  it('17 aller-retour sérialisé : égalité sémantique, estimation de séance vérifiée', () => {
    const s = zSessionDraft.parse(runInput([rs([warm(), { kind: 'preparation', id: 'seg.p', reps: 4, dose: { durationS: 15 }, target: { domain: 'sprint_neuromuscular', effort: { rpe: { min: 8, max: 9 } }, priority: 'effort' }, recovery: walk(45) }, rep({ sets: 2, betweenSetRecovery: walk(180) }), steady(), cool()])]));
    const rec = recordOf(s);
    const env = JSON.parse(JSON.stringify(toEnvelope('session_record', rec)));
    const r = migrateToCurrent<SessionRecord>(env);
    expect(r.ok && r.applied).toEqual([]);
    if (!r.ok) return;
    expect(canonicalStringify(r.value)).toBe(canonicalStringify(rec));
    expect(verifyRecordedDuration(r.value, { catalog: testCatalog(), ruleset: testRuleset(), engineVersion: ENGINE_VERSION })).toEqual({ status: 'verified' });
    const drift = { ...r.value, durationEstimate: { ...rec.durationEstimate, p90: (rec.durationEstimate as { p90: number }).p90 + 1 } } as SessionRecord;
    expect(verifyRecordedDuration(drift, { catalog: testCatalog(), ruleset: testRuleset(), engineVersion: ENGINE_VERSION })).toMatchObject({ status: 'rejected', reasons: [{ code: 'DURATION.ESTIMATE_MISMATCH', params: { field: 'p90' } }] });
    expect(verifyRecordedDuration(r.value, { catalog: testCatalog(), ruleset: testRuleset(), engineVersion: '9.9.9' })).toMatchObject({ status: 'rejected', reasons: [{ code: 'DURATION.ESTIMATE_UNVERIFIABLE' }] });
  });

  it('18 rejeu déterministe : même entrée ⇒ même rapport, même estimation, même déroulement', () => {
    const input = runInput([rs([warm(), rep({ sets: 2, betweenSetRecovery: walk(180) }), cool()])]);
    const a = validate(input);
    const b = validate(JSON.parse(JSON.stringify(input)));
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    const p = rs([warm(), rep({ sets: 2, betweenSetRecovery: walk(180) }), cool()]);
    expect(canonicalStringify(executionSteps(p))).toBe(canonicalStringify(executionSteps(JSON.parse(JSON.stringify(p)))));
  });

  it('19 plage d’allure invalide (inversée, nulle, négative)', () => {
    for (const [min, max, code] of [[220, 200, 'PACE_RANGE_INVERTED'], [0, 200, 'RANGE_NOT_POSITIVE'], [-10, 200, 'RANGE_NOT_POSITIVE']] as const) {
      expect(codes(validate(runInput([raw([rep({ work: { distanceM: 400 }, target: paced(min, max) })])])))).toContain(S(code));
    }
  });

  it('20 plage RPE invalide', () => {
    expect(codes(validate(runInput([raw([rep({ target: { ...hard, effort: { rpe: { min: 7, max: 5 } } } })])])))).toContain(S('RPE_RANGE_INVERTED'));
    expect(codes(validate(runInput([raw([rep({ target: { ...hard, effort: { rpe: { min: 0, max: 5 } } } })])])))).toContain(S('RANGE_NOT_POSITIVE'));
  });

  it('21 plage FC invalide', () => {
    expect(codes(validate(runInput([raw([rep({ target: { ...hard, hrBpm: { min: 170, max: 150 } } })])])))).toContain(S('HR_RANGE_INVERTED'));
    expect(codes(validate(runInput([raw([rep({ target: { ...hard, hrBpm: { min: -1, max: 150 } } })])])))).toContain(S('RANGE_NOT_POSITIVE'));
  });

  it('22 valeurs nulles ou négatives, comptages invalides', () => {
    const cases: [unknown, string][] = [
      [rep({ work: { durationS: 0 } }), 'DURATION_NOT_POSITIVE'],
      [rep({ work: { distanceM: -400 }, target: paced(200, 220) }), 'DISTANCE_NOT_POSITIVE'],
      [rep({ recovery: jog(-5) }), 'DURATION_NOT_POSITIVE'],
      [rep({ sets: 0 }), 'SETS_INVALID'],
      [rep({ reps: 0 }), 'REPS_INVALID'],
      [rep({ reps: 1.5 }), 'REPS_INVALID'],
      [rep({ sets: MAX_RUN_SETS + 1, betweenSetRecovery: walk(60) }), 'SETS_INVALID'],
      [rep({ reps: MAX_RUN_REPS + 1 }), 'REPS_INVALID'],
      [{ kind: 'preparation', id: 'p', reps: 0, dose: { durationS: 10 }, target: easy }, 'REPS_INVALID'],
      [warm(-1), 'DURATION_NOT_POSITIVE'],
    ];
    for (const [seg, code] of cases) expect(codes(validate(runInput([raw([seg])])))).toContain(S(code as (typeof STRUCTURE_ISSUES)[number]));
    // Dose à deux grandeurs (durée ET distance) : refusée par la forme stricte.
    expect(zRunStructure.safeParse(raw([rep({ work: { durationS: 10, distanceM: 100 } as never })])).success).toBe(false);
  });

  it('23 dépassement de la contrainte HARD de temps disponible ⇒ FEASIBILITY.TIME_EXCEEDED', () => {
    const r = validate(runInput([rs([warm(), rep({ sets: 3, betweenSetRecovery: walk(180) }), cool()])], { availableTimeS: 1800, targetDurationS: 1500 }));
    expect(codes(r)).toContain('FEASIBILITY.TIME_EXCEEDED');
    expect(r.estimate!.p90).toBeGreaterThan(1800);
  });

  it('24 régression Strength : séance de force, intervals et distance inchangés', () => {
    const r = validate(session());
    expect(r.report.status).toBe('VALID');
    expect(r.estimate?.p50).toBe(1780);
    const iv = { type: 'intervals', reps: 3, work: { distanceM: 400 }, recoveryS: 60 };
    const legacyRun = runInput([iv]);
    expect(validate(legacyRun).report.status).toBe('VALID');
  });

  it('25 profondeur fixe : aucun segment imbriqué, genre inconnu refusé, bornes anti-explosion', () => {
    expect(zRunStructure.safeParse(raw([{ ...rep(), segments: [steady()] }])).success).toBe(false);
    expect(zRunStructure.safeParse(raw([{ kind: 'group', id: 'g', segments: [rep()] }])).success).toBe(false);
    expect(runStructureIssues({ segments: Array.from({ length: MAX_RUN_SEGMENTS }, (_, i) => steady(60, `s${String(i)}`)) })).toEqual([]);
    expect(runStructureIssues({ segments: Array.from({ length: MAX_RUN_SEGMENTS + 1 }, (_, i) => steady(60, `s${String(i)}`)) }).map((i) => i.code)).toEqual(['SEGMENTS_TOO_MANY']);
    expect(runStructureIssues({ segments: [] }).map((i) => i.code)).toEqual(['SEGMENTS_EMPTY']);
    // 64 × 32 : 2048 travail + 1984 récupérations + 63 entre séries = 4095 étapes (≤ borne) ; 4096 est la borne incluse.
    const big = rep({ sets: 64, reps: 32, betweenSetRecovery: walk(30) });
    expect(segmentStepCount(big)).toBe(4095);
    expect(runStructureIssues({ segments: [big, steady()] })).toEqual([]);
    expect(runStructureIssues({ segments: [big, steady(), steady(60, 'x')] }).map((i) => i.code)).toEqual(['EXECUTION_STEPS_TOO_MANY']);
    expect(MAX_RUN_EXECUTION_STEPS).toBe(4096);
  });
});

describe('CORE-EXT-R1 — invariants supplémentaires', () => {
  it('allure sans provenance ⇒ PACE_WITHOUT_PROVENANCE ; sprint répété piloté à l’allure ⇒ combinaison refusée', () => {
    const noProv = { domain: 'severe', pace: { secPerKm: { min: 200, max: 220 } }, priority: 'pace' };
    expect(codes(validate(runInput([raw([rep({ work: { distanceM: 400 }, target: noProv as never })])])))).toContain(S('PACE_WITHOUT_PROVENANCE'));
    expect(runStructureIssues({ segments: [rep({ target: { ...paced(150, 160), domain: 'sprint_neuromuscular' } })] }).map((i) => i.code)).toEqual(['TARGET_COMBINATION_INVALID']);
    // La même cible en préparation (lignes droites) n'est pas visée par la règle 6.
    expect(runStructureIssues({ segments: [{ kind: 'preparation', id: 'p', dose: { durationS: 15 }, target: { ...paced(150, 160), domain: 'sprint_neuromuscular' } }] })).toEqual([]);
  });

  it('placement : run_structure hors d’un bloc running continu ⇒ PLACEMENT_INVALID ; identifiant de segment dupliqué', () => {
    const input = runInput([rs([rep()])]);
    const misplaced = { ...input, blocks: [{ ...input.blocks[0]!, kind: 'conditioning' }] };
    expect(codes(validate(misplaced))).toEqual([S('PLACEMENT_INVALID')]);
    expect(runStructureIssues({ segments: [rep(), rep()] }).map((i) => i.code)).toEqual(['SEGMENT_ID_DUPLICATED']);
  });

  it('chaque code structurel est enregistré, au format du registre', () => {
    const reg = createCoreRegistry();
    for (const c of STRUCTURE_ISSUES) expect(reg.has(S(c))).toBe(true);
    for (const c of ['DURATION.ESTIMATE_MISMATCH', 'DURATION.ESTIMATE_UNAVAILABLE_LEGACY', 'DURATION.ESTIMATE_UNVERIFIABLE']) expect(reg.has(c)).toBe(true);
  });

  it('DurationEngine : la run_structure contribue exactement (travail, récupérations, consigne), unique autorité', () => {
    const p = rs([warm(), rep({ reps: 5, work: { distanceM: 400 }, target: paced(200, 220), recovery: jog(90) }), cool()]);
    const s = zSessionDraft.parse(runInput([p]));
    const e = estimateDuration(s, testCatalog(), readDurationParams(testRuleset()));
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const block = e.estimate.byBlock[0]!;
    // briefing 15 s (ruleset de test) ; mise en place 0 s (catalogue de test) ; aucun facteur sur les récupérations.
    expect(block.min).toBe(p.estimate.totalS.min + 15);
    expect(block.p90).toBe(p.estimate.totalS.max + 15);
    expect(block.p50).toBe((p.estimate.totalS.min + p.estimate.totalS.max) / 2 + 15);
    expect(e.estimate.components.restS).toBe(4 * 90);
  });

  it('levier reduce_run_volume : échauffement puis retour au calme au-dessus du plancher, puis continu ; jamais la cible ni les répétitions', () => {
    const steps = { reduceRestS: 15, shortenConditioningS: 60, reduceRunS: 120, reduceRunM: 400 };
    const lever = { kind: 'reduce_run_volume', minS: 300 } as const;
    const p = rs([warm(540), rep(), steady(420), cool(480)]);
    const r1 = reduceRunStructure(p, lever, steps)!;
    expect(r1.segments[0]).toMatchObject({ kind: 'warmup', dose: { durationS: 420 } });
    const r2 = reduceRunStructure(r1, lever, steps)!;
    expect(r2.segments[0]).toMatchObject({ dose: { durationS: 300 } });
    const r3 = reduceRunStructure(r2, lever, steps)!;
    expect(r3.segments[0]).toMatchObject({ dose: { durationS: 300 } }); // plancher atteint
    expect(r3.segments[3]).toMatchObject({ kind: 'cooldown', dose: { durationS: 360 } });
    const r4 = reduceRunStructure(r3, lever, steps)!; // retour au calme 360 − 120 < plancher ⇒ segment continu
    expect(r4.segments[2]).toMatchObject({ kind: 'steady', dose: { durationS: 300 } });
    expect(reduceRunStructure(r4, lever, steps)).toBeNull();
    for (const x of [r1, r2, r3, r4]) {
      expect(x.segments[1]).toEqual(p.segments[1]); // repeat intact (séries, répétitions, cible)
      expect(x.segments.map((s) => s.target)).toEqual(p.segments.map((s) => s.target));
      expect(checkRunEstimate(x)).toEqual({ consistent: true });
    }
  });

  it('ajustement de durée du CORE : compresse via le levier et produit une séance toujours valide', () => {
    const input = runInput([rs([warm(900), rep({ sets: 2, betweenSetRecovery: walk(180) }), cool(900)])], { availableTimeS: 3900, targetDurationS: 3300 });
    const withLever = { ...input, blocks: [{ ...input.blocks[0]!, levers: [{ kind: 'reduce_run_volume', minS: 300 }] }] };
    const s = zSessionDraft.parse(withLever);
    const fit = fitDuration(s, testCatalog(), testRuleset());
    expect(fit.status).not.toBe('INFEASIBLE');
    if (fit.status === 'INFEASIBLE') return;
    expect(fit.appliedLevers.length).toBeGreaterThan(0);
    const after = validate(fit.session);
    expect(after.report.errors).toEqual([]);
    const p = fit.session.blocks[0]!.items[0]!.prescription as RunStructure;
    expect(p.segments[1]).toEqual((s.blocks[0]!.items[0]!.prescription as RunStructure).segments[1]);
  });

  it('métadonnées d’exécution : adresses stables, déroulement conforme aux durées, adresse inconnue ⇒ undefined', () => {
    const p = rs([warm(), rep({ sets: 2, reps: 3, betweenSetRecovery: walk(180) }), cool()]);
    const st = executionSteps(p);
    expect(st.length).toBe(p.segments.reduce((n, s) => n + segmentStepCount(s), 0));
    expect(st.map((x) => x.key)).toEqual([
      'seg.wu/1/1/single',
      'seg.A/1/1/work', 'seg.A/1/1/recovery', 'seg.A/1/2/work', 'seg.A/1/2/recovery', 'seg.A/1/3/work', 'seg.A/1/3/between_sets',
      'seg.A/2/1/work', 'seg.A/2/1/recovery', 'seg.A/2/2/work', 'seg.A/2/2/recovery', 'seg.A/2/3/work',
      'seg.cd/1/1/single',
    ]);
    expect(new Set(st.map((x) => x.key)).size).toBe(st.length);
    const total = st.reduce((n, x) => n + ('durationS' in x.dose ? x.dose.durationS : 0), 0);
    expect(total).toBe(p.estimate.totalS.min);
    expect(resolveExecutionAddress(p, { segmentIndex: 1, set: 2, rep: 3, phase: 'work' })?.key).toBe(executionStepKey('seg.A', 2, 3, 'work'));
    expect(resolveExecutionAddress(p, { segmentIndex: 1, set: 2, rep: 3, phase: 'recovery' })).toBeUndefined();
    expect(resolveExecutionAddress(p, { segmentIndex: 9, set: 1, rep: 1, phase: 'single' })).toBeUndefined();
  });
});

const provenance = { engineVersion: ENGINE_VERSION, rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 'seed-r1', traceId: 't0123456789abcdef' } as const;
function recordOf(s: SessionDraft): SessionRecord {
  const e = estimateDuration(s, testCatalog(), readDurationParams(testRuleset()));
  if (!e.ok) throw new Error('estimation impossible');
  return { session: s, provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' }, durationEstimate: toRecordedDurationEstimate(e.estimate) };
}
