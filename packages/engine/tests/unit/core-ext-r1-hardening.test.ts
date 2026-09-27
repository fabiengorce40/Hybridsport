/**
 * Phase 6A — CORE-EXT-R1 : durcissement ciblé par la mutation (survivants pertinents du premier passage
 * Stryker). Valeurs ILLUSTRATIVES (données de test), jamais des prescriptions.
 */
import { describe, expect, it } from 'vitest';
import {
  executionStepKey, executionSteps, isStructureIssueParams, runStructureIssues, segmentStepCount, sessionStructureIssues, zRunStructure, zSessionDraft,
} from '@hybridsport/domain';
import type { RunSegment, RunStructure, SessionDraftInput, SessionRecord } from '@hybridsport/domain';
import {
  ENGINE_VERSION, applyLeverStep, checkRunEstimate, deriveRunEstimate, estimateDuration, migrateToCurrent, readDurationParams,
  reduceRunStructure, runEstimateMismatches, schemaIssueReason, segmentDuration, toRecordedDurationEstimate, validateSession,
  verifyRecordedDuration, withDerivedEstimate,
} from '../../src/index.js';
import { baseContext, deps } from '../fixtures/context.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { session as strengthSession } from '../fixtures/sessions.js';

const prov = { source: 'reference_derived', sourceId: 'ref.test' } as const;
const easy = { domain: 'easy_low', effort: { rpe: { min: 2, max: 3 } }, priority: 'effort' } as const;
const hard = { domain: 'threshold_like', effort: { rpe: { min: 5, max: 6 } }, priority: 'effort' } as const;
const pace = (min: number, max: number) => ({ secPerKm: { min, max }, provenance: prov });
const paced = (min: number, max: number) => ({ domain: 'severe', pace: pace(min, max), priority: 'pace' }) as const;
const jog = (durationS: number) => ({ dose: { durationS }, mode: 'jog' }) as const;
const rep = (o: Partial<Extract<RunSegment, { kind: 'repeat' }>> = {}): RunSegment => ({ kind: 'repeat', id: 'A', sets: 1, reps: 2, work: { durationS: 100 }, target: hard, recovery: jog(50), ...o });
const seg = (kind: 'warmup' | 'steady' | 'cooldown', dose: RunSegment extends never ? never : { durationS: number } | { distanceM: number }, id: string = kind, target: RunSegment['target'] = easy): RunSegment => ({ kind, id, dose, target });
const prep = (o: Partial<Extract<RunSegment, { kind: 'preparation' }>> = {}): RunSegment => ({ kind: 'preparation', id: 'P', dose: { durationS: 15 }, target: easy, ...o });
const issues = (segments: readonly unknown[]) => runStructureIssues({ segments: segments as RunSegment[] });
const rs = (segments: readonly RunSegment[]): RunStructure => withDerivedEstimate({ type: 'run_structure', segments: [...segments] })!;
const provenance = { engineVersion: ENGINE_VERSION, rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 's', traceId: 't0123456789abcdef' } as const;
const runInput = (prescriptions: readonly unknown[], over: Record<string, unknown> = {}): SessionDraftInput => ({
  id: 'session.h', discipline: 'running', athleteLevel: 'intermediate', availableTimeS: 90000, targetDurationS: 3600, toleranceProfile: 'strength_sets',
  blocks: prescriptions.map((p, i) => ({ id: `b${String(i)}`, kind: 'running', role: i === 0 ? 'primary' : 'secondary', format: 'continuous', items: [{ id: `i${String(i)}`, exerciseId: 'ex.easy_run', prescription: p }] })) as SessionDraftInput['blocks'],
  ...over,
});

describe('durcissement — chemins exacts des anomalies (diagnostic stable)', () => {
  it('codes ET chemins exacts pour chaque genre de segment et chaque sous-objet', () => {
    expect(issues([
      seg('warmup', { durationS: 0 }, 'w'),
      prep({ id: 'p', reps: 2, dose: { distanceM: 100 }, recovery: { dose: { distanceM: 50 }, mode: 'walk', pace: { secPerKm: { min: 400, max: 300 } } } }),
      rep({ id: 'r', sets: 2, target: { ...hard, pace: { secPerKm: { min: 300, max: 200 }, provenance: prov }, hrBpm: { min: 170, max: 150 }, effort: { rpe: { min: 6, max: 5 } }, priority: 'hr' }, betweenSetRecovery: { dose: { durationS: -1 }, mode: 'walk' } }),
      seg('steady', { durationS: -5 }, 'r'),
      seg('cooldown', { distanceM: 0 }, 'c'),
    ])).toEqual([
      { code: 'DURATION_NOT_POSITIVE', path: ['segments', 0, 'dose'] },
      { code: 'DISTANCE_WITHOUT_PACE', path: ['segments', 1, 'dose'] },
      { code: 'PACE_RANGE_INVERTED', path: ['segments', 1, 'recovery', 'pace', 'secPerKm'] },
      { code: 'PACE_WITHOUT_PROVENANCE', path: ['segments', 1, 'recovery', 'pace'] },
      { code: 'PACE_RANGE_INVERTED', path: ['segments', 2, 'target', 'pace', 'secPerKm'] },
      { code: 'RPE_RANGE_INVERTED', path: ['segments', 2, 'target', 'effort', 'rpe'] },
      { code: 'HR_RANGE_INVERTED', path: ['segments', 2, 'target', 'hrBpm'] },
      { code: 'DURATION_NOT_POSITIVE', path: ['segments', 2, 'betweenSetRecovery', 'dose'] },
      { code: 'SEGMENT_ID_DUPLICATED', path: ['segments', 3, 'id'] },
      { code: 'DURATION_NOT_POSITIVE', path: ['segments', 3, 'dose'] },
      { code: 'DISTANCE_NOT_POSITIVE', path: ['segments', 4, 'dose'] },
      { code: 'DISTANCE_WITHOUT_PACE', path: ['segments', 4, 'dose'] },
    ]);
  });

  it('chemins des règles de structure, de priorité, de récupération et de comptage', () => {
    expect(issues([])).toEqual([{ code: 'SEGMENTS_EMPTY', path: ['segments'] }]);
    expect(issues([rep({ target: { ...hard, priority: 'pace' } })])).toEqual([{ code: 'TARGET_PRIORITY_ABSENT', path: ['segments', 0, 'target', 'priority'] }]);
    expect(issues([rep({ target: { domain: 'severe', pace: pace(200, 210), priority: 'effort' } })])).toEqual([{ code: 'TARGET_PRIORITY_ABSENT', path: ['segments', 0, 'target', 'priority'] }]);
    expect(issues([rep({ recovery: { dose: { durationS: 30 }, mode: 'jog', pace: pace(300, 360) } })])).toEqual([{ code: 'TARGET_COMBINATION_INVALID', path: ['segments', 0, 'recovery', 'pace'] }]);
    expect(issues([rep({ sets: 2 })])).toEqual([{ code: 'RECOVERY_BETWEEN_SETS_REQUIRED', path: ['segments', 0, 'betweenSetRecovery'] }]);
    expect(issues([rep({ betweenSetRecovery: jog(10) })])).toEqual([{ code: 'RECOVERY_BETWEEN_SETS_FORBIDDEN', path: ['segments', 0, 'betweenSetRecovery'] }]);
    expect(issues([prep({ recovery: jog(10) })])).toEqual([{ code: 'RECOVERY_WITHOUT_REPETITION', path: ['segments', 0, 'recovery'] }]);
    expect(issues([prep({ reps: 1, recovery: jog(10) })])).toEqual([{ code: 'RECOVERY_WITHOUT_REPETITION', path: ['segments', 0, 'recovery'] }]);
    expect(issues([rep({ target: { ...paced(150, 160), domain: 'sprint_neuromuscular' } })])).toEqual([{ code: 'TARGET_COMBINATION_INVALID', path: ['segments', 0, 'target'] }]);
    expect(issues([rep({ target: { ...hard, domain: 'sprint_neuromuscular' } })])).toEqual([]);
    expect(issues([rep({ target: { ...hard, noWearable: true, hrBpm: { min: 1, max: 2 } } })])).toEqual([{ code: 'TARGET_COMBINATION_INVALID', path: ['segments', 0, 'target'] }]);
    // Comptages invalides : le total d'étapes n'est pas calculé (aucune anomalie parasite).
    expect(issues([rep({ reps: 100000 })])).toEqual([{ code: 'REPS_INVALID', path: ['segments', 0, 'reps'] }]);
    expect(issues([rep({ sets: 100000, betweenSetRecovery: jog(1) })])).toEqual([{ code: 'SETS_INVALID', path: ['segments', 0, 'sets'] }]);
    expect(issues([prep({ reps: 100000 })])).toEqual([{ code: 'REPS_INVALID', path: ['segments', 0, 'reps'] }]);
    expect(issues([seg('warmup', { durationS: 1 }, 'w1'), seg('warmup', { durationS: 1 }, 'w2')])).toEqual([{ code: 'WARMUP_DUPLICATED', path: ['segments'] }, { code: 'WARMUP_NOT_FIRST', path: ['segments'] }]);
    expect(issues([seg('cooldown', { durationS: 1 }, 'c1'), seg('cooldown', { durationS: 1 }, 'c2')])).toEqual([{ code: 'COOLDOWN_DUPLICATED', path: ['segments'] }, { code: 'COOLDOWN_NOT_LAST', path: ['segments'] }]);
  });

  it('le code voyage dans l’anomalie zod avec le chemin exact ; paramètres reconnus strictement', () => {
    const r = zRunStructure.safeParse({ type: 'run_structure', segments: [rep({ work: { distanceM: 400 } })], estimate: { method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS: { min: 0, max: 0 }, totalS: { min: 0, max: 0 } } });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.map((i) => ({ path: i.path, message: i.message, code: i.code }))).toEqual([{ path: ['segments', 0, 'work'], message: 'DISTANCE_WITHOUT_PACE', code: 'custom' }]);
    expect(isStructureIssueParams({ structureIssue: 'DISTANCE_WITHOUT_PACE' })).toBe(true);
    for (const x of [null, undefined, 3, 'DISTANCE_WITHOUT_PACE', {}, { structureIssue: 'NOPE' }, { other: 'DISTANCE_WITHOUT_PACE' }]) expect(isStructureIssueParams(x)).toBe(false);
    expect(zRunStructure.safeParse(rs([rep({ target: { domain: 'moderate', effort: { descriptorKey: 'effort.key' }, priority: 'effort' } })])).success).toBe(true);
  });

  it('chemins des anomalies inter-blocs et des codes de raison', () => {
    const input = runInput([rs([seg('warmup', { durationS: 60 }), rep()])]);
    const s = { ...input, blocks: [{ ...input.blocks[0]!, kind: 'conditioning' }] } as unknown as Parameters<typeof sessionStructureIssues>[0];
    expect(sessionStructureIssues(s)).toEqual([
      { code: 'PLACEMENT_INVALID', path: ['blocks', 0, 'items', 0, 'prescription'] },
      { code: 'WARMUP_COOLDOWN_DOUBLE_REPRESENTATION', path: ['blocks', 0, 'items', 0, 'prescription'] },
    ]);
    const r = validateSession({ ...input, blocks: [{ ...input.blocks[0]!, format: 'sets', grouping: 'straight' }] }, baseContext(), deps());
    expect(r.report.errors.map((e) => e.reason)).toContainEqual(expect.objectContaining({ code: 'TECHNICAL.STRUCTURE.PLACEMENT_INVALID', params: { path: 'blocks.0.items.0.prescription' } }));
    expect(schemaIssueReason({ path: [], message: 'm' })).toMatchObject({ code: 'TECHNICAL.SCHEMA_INVALID', params: { path: '$', problem: 'm' } });
    expect(schemaIssueReason({ path: [], message: 'm' }, 'k').params.path).toBe('k');
    expect(schemaIssueReason({ path: ['a', 0], message: 'm' }, 'k').params.path).toBe('k.a.0');
    expect(schemaIssueReason({ path: ['a', 0], message: 'm' }).params.path).toBe('a.0');
    expect(schemaIssueReason({ path: ['x'], message: 'SEGMENTS_EMPTY', params: { structureIssue: 'SEGMENTS_EMPTY' } }, 'k')).toMatchObject({ code: 'TECHNICAL.STRUCTURE.SEGMENTS_EMPTY', params: { path: 'k.x' } });
  });

  it('inter-blocs : trois structures ; séance « running » mais avec un item non structuré ⇒ double représentation', () => {
    const three = (a: RunSegment[], b: RunSegment[], c: RunSegment[]) => sessionStructureIssues(zSessionDraft.parse(runInput([rs(a), rs(b), rs(c)])) as never);
    const w = (id: string) => seg('warmup', { durationS: 60 }, id);
    const cd = (id: string) => seg('cooldown', { durationS: 60 }, id);
    expect(() => zSessionDraft.parse(runInput([rs([w('w1'), rep()]), rs([rep()]), rs([w('w3'), rep()])]))).toThrow();
    const codes3 = (a: RunSegment[], b: RunSegment[], c: RunSegment[]) => {
      const r = zSessionDraft.safeParse(runInput([rs(a), rs(b), rs(c)]));
      return r.success ? [] : r.error.issues.map((i) => `${i.message}@${i.path.join('.')}`);
    };
    expect(codes3([rep()], [w('w2'), rep()], [w('w3'), rep()])).toEqual(['WARMUP_NOT_FIRST@blocks.1.items.0.prescription', 'WARMUP_DUPLICATED@blocks.2.items.0.prescription']);
    expect(codes3([rep(), cd('c1')], [rep(), cd('c2')], [rep()])).toEqual(['COOLDOWN_DUPLICATED@blocks.0.items.0.prescription', 'COOLDOWN_NOT_LAST@blocks.1.items.0.prescription']);
    expect(codes3([rep(), cd('c1')], [rep()], [rep()])).toEqual(['COOLDOWN_NOT_LAST@blocks.0.items.0.prescription']);
    expect(three([w('w'), rep()], [rep()], [rep(), cd('c')])).toEqual([]);
    const mixed = runInput([rs([w('w'), rep()])]);
    const withLegacy = { ...mixed, blocks: [{ ...mixed.blocks[0]!, items: [...mixed.blocks[0]!.items, { id: 'i.legacy', exerciseId: 'ex.easy_run', prescription: { type: 'timed', workS: 60 } }] }] };
    const r = zSessionDraft.safeParse(withLegacy);
    expect(!r.success && r.error.issues.map((i) => i.message)).toEqual(['WARMUP_COOLDOWN_DOUBLE_REPRESENTATION']);
    // Séance multidiscipline SANS segment interne : aucune anomalie.
    expect(zSessionDraft.safeParse({ ...withLegacy, blocks: [{ ...withLegacy.blocks[0]!, items: [{ ...withLegacy.blocks[0]!.items[0]!, prescription: rs([rep()]) }, withLegacy.blocks[0]!.items[1]!] }] }).success).toBe(true);
  });
});

describe('durcissement — préparation, attribution travail / total, déroulement', () => {
  it('préparation : répétitions par défaut 1, récupération entre répétitions seulement', () => {
    expect(segmentDuration(prep())).toEqual({ work: { min: 15, max: 15 }, recovery: { min: 0, max: 0 }, total: { min: 15, max: 15 } });
    expect(segmentDuration(prep({ reps: 4, recovery: jog(45) }))).toEqual({ work: { min: 60, max: 60 }, recovery: { min: 135, max: 135 }, total: { min: 195, max: 195 } });
    expect(segmentDuration(prep({ reps: 3 }))).toEqual({ work: { min: 45, max: 45 }, recovery: { min: 0, max: 0 }, total: { min: 45, max: 45 } });
    expect(segmentStepCount(prep())).toBe(1);
    expect(segmentStepCount(prep({ reps: 4, recovery: jog(45) }))).toBe(7);
    expect(segmentStepCount(prep({ reps: 3 }))).toBe(3);
  });

  it('échauffement et retour au calme hors travail ; continu = travail ; distance avec allure dans chaque genre', () => {
    expect(segmentDuration(seg('warmup', { durationS: 600 }))).toEqual({ work: { min: 0, max: 0 }, recovery: { min: 0, max: 0 }, total: { min: 600, max: 600 } });
    expect(segmentDuration(seg('cooldown', { durationS: 300 }))).toEqual({ work: { min: 0, max: 0 }, recovery: { min: 0, max: 0 }, total: { min: 300, max: 300 } });
    expect(segmentDuration(seg('steady', { distanceM: 2000 }, 's', paced(300, 330)))).toEqual({ work: { min: 600, max: 660 }, recovery: { min: 0, max: 0 }, total: { min: 600, max: 660 } });
    expect(segmentDuration(rep({ sets: 2, reps: 3, betweenSetRecovery: jog(120) }))).toEqual({ work: { min: 600, max: 600 }, recovery: { min: 320, max: 320 }, total: { min: 920, max: 920 } });
    const p = rs([seg('warmup', { durationS: 600 }), prep({ reps: 2, recovery: jog(30) }), seg('steady', { durationS: 200 }), seg('cooldown', { durationS: 300 })]);
    expect(p.estimate.workS).toEqual({ min: 30 + 200, max: 30 + 200 });
    expect(p.estimate.totalS).toEqual({ min: 600 + 60 + 200 + 300, max: 600 + 60 + 200 + 300 });
  });

  it('déroulement : chaque étape porte sa cible (effort) ou son mode (récupération), préparation comprise', () => {
    const p = rs([seg('warmup', { durationS: 60 }), prep({ reps: 2, recovery: { dose: { durationS: 30 }, mode: 'walk' } }), rep({ sets: 2, reps: 1, betweenSetRecovery: { dose: { durationS: 90 }, mode: 'standing' } })]);
    expect(executionSteps(p)).toEqual([
      { key: 'warmup/1/1/single', segmentId: 'warmup', segmentKind: 'warmup', address: { segmentIndex: 0, set: 1, rep: 1, phase: 'single' }, dose: { durationS: 60 }, target: easy },
      { key: 'P/1/1/work', segmentId: 'P', segmentKind: 'preparation', address: { segmentIndex: 1, set: 1, rep: 1, phase: 'work' }, dose: { durationS: 15 }, target: easy },
      { key: 'P/1/1/recovery', segmentId: 'P', segmentKind: 'preparation', address: { segmentIndex: 1, set: 1, rep: 1, phase: 'recovery' }, dose: { durationS: 30 }, recoveryMode: 'walk' },
      { key: 'P/1/2/work', segmentId: 'P', segmentKind: 'preparation', address: { segmentIndex: 1, set: 1, rep: 2, phase: 'work' }, dose: { durationS: 15 }, target: easy },
      { key: 'A/1/1/work', segmentId: 'A', segmentKind: 'repeat', address: { segmentIndex: 2, set: 1, rep: 1, phase: 'work' }, dose: { durationS: 100 }, target: hard },
      { key: 'A/1/1/between_sets', segmentId: 'A', segmentKind: 'repeat', address: { segmentIndex: 2, set: 1, rep: 1, phase: 'between_sets' }, dose: { durationS: 90 }, recoveryMode: 'standing' },
      { key: 'A/2/1/work', segmentId: 'A', segmentKind: 'repeat', address: { segmentIndex: 2, set: 2, rep: 1, phase: 'work' }, dose: { durationS: 100 }, target: hard },
    ]);
    const r2 = executionSteps(rs([rep({ reps: 2 })]));
    expect(r2[1]).toEqual({ key: executionStepKey('A', 1, 1, 'recovery'), segmentId: 'A', segmentKind: 'repeat', address: { segmentIndex: 0, set: 1, rep: 1, phase: 'recovery' }, dose: { durationS: 50 }, recoveryMode: 'jog' });
    expect(executionSteps(rs([prep({ reps: 3 })])).map((s) => s.key)).toEqual(['P/1/1/work', 'P/1/2/work', 'P/1/3/work']);
  });
});

describe('durcissement — recalcul, lecture, vérification', () => {
  it('dérivation impossible ⇒ écart « derivation » explicite ; chemin exact dans la séance', () => {
    const bad = { type: 'run_structure', segments: [rep({ work: { distanceM: 400 } })], estimate: { method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS: { min: 1, max: 2 }, totalS: { min: 3, max: 4 } } } as RunStructure;
    expect(checkRunEstimate(bad)).toEqual({ consistent: false, field: 'derivation', stored: { min: 3, max: 4 }, recomputed: undefined });
    const s = { ...zSessionDraft.parse(runInput([rs([rep()])])) };
    const unsafe = { ...s, blocks: [s.blocks[0]!, { ...s.blocks[0]!, id: 'b9', items: [{ ...s.blocks[0]!.items[0]!, id: 'i9', prescription: bad }] }] };
    expect(runEstimateMismatches(unsafe, 'x')).toEqual([expect.objectContaining({ code: 'DURATION.ESTIMATE_MISMATCH', params: { path: 'x.blocks.1.items.0.prescription.estimate', field: 'derivation', storedMinS: 3, storedMaxS: 4 } })]);
    expect(deriveRunEstimate({ segments: [rep({ recovery: { dose: { distanceM: 100 }, mode: 'jog' } })] })).toEqual({ ok: false, reason: 'DISTANCE_WITHOUT_PACE' });
    // Le DurationEngine refuse aussi une structure non validée (jamais une durée partielle).
    const e = estimateDuration(unsafe, testCatalog(), readDurationParams(testRuleset()));
    expect(e).toEqual({ ok: false, reasons: [expect.objectContaining({ code: 'TECHNICAL.STRUCTURE.DISTANCE_WITHOUT_PACE', params: { path: 'i9.segments.0' } })] });
  });

  it('violation du validateur : règle, nature, cible exactes', () => {
    const p = rs([rep()]);
    const r = validateSession(runInput([{ ...p, estimate: { ...p.estimate, workS: { min: 0, max: 0 } } }]), baseContext(), deps());
    expect(r.report.errors).toContainEqual(expect.objectContaining({ ruleId: 'core.integrity.structure', nature: 'TECHNICAL', level: 'hard', layer: 'A4', target: { kind: 'session', id: 'session.h' }, reason: expect.objectContaining({ code: 'DURATION.ESTIMATE_MISMATCH', params: expect.objectContaining({ path: 'session.blocks.0.items.0.prescription.estimate' }) }) }));
  });

  it('vérification de l’estimation de séance : chaque version comptée, estimation impossible refusée', () => {
    const s = zSessionDraft.parse(runInput([rs([rep()])]));
    const e = estimateDuration(s, testCatalog(), readDurationParams(testRuleset()));
    if (!e.ok) throw new Error('estimation');
    const rec: SessionRecord = { session: s, provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' }, durationEstimate: toRecordedDurationEstimate(e.estimate) };
    const d = { catalog: testCatalog(), ruleset: testRuleset(), engineVersion: ENGINE_VERSION };
    const problems = (r: ReturnType<typeof verifyRecordedDuration>) => (r.status === 'rejected' ? r.reasons.map((x) => x.params.problem ?? x.code) : []);
    expect(problems(verifyRecordedDuration({ ...rec, provenance: { ...provenance, rulesetVersion: '9.0.0' } }, d))).toEqual(['version ruleset 9.0.0 (record) ≠ 0.1.0-test (vérificateur)']);
    expect(problems(verifyRecordedDuration({ ...rec, provenance: { ...provenance, catalogVersion: '9.0.0' } }, d))).toEqual(['version catalog 9.0.0 (record) ≠ 0.1.0-test (vérificateur)']);
    expect(problems(verifyRecordedDuration(rec, { ...d, engineVersion: '9.9.9' }))).toEqual([`version engine ${ENGINE_VERSION} (record) ≠ 9.9.9 (vérificateur)`]);
    const unknown = { ...rec, session: { ...s, blocks: [{ ...s.blocks[0]!, items: [{ ...s.blocks[0]!.items[0]!, exerciseId: 'ex.nope' }] }] } };
    expect(verifyRecordedDuration(unknown, d)).toMatchObject({ status: 'rejected', reasons: [{ code: 'TECHNICAL.UNKNOWN_REFERENCE' }] });
    const mism = verifyRecordedDuration({ ...rec, durationEstimate: { ...rec.durationEstimate, p10: 0 } as SessionRecord['durationEstimate'] }, d);
    expect(mism).toMatchObject({ status: 'rejected', reasons: [{ code: 'DURATION.ESTIMATE_MISMATCH', params: { path: 'session_record.durationEstimate', field: 'p10', storedMinS: 0 } }] });
    expect(toRecordedDurationEstimate(e.estimate)).toEqual({ availability: 'AVAILABLE', method: 'core.duration_engine', unit: 's', p10: e.estimate.p10, p50: e.estimate.p50, p90: e.estimate.p90 });
  });

  it('migration v3 → v4 : données malformées refusées sans exception ; run_structure détectée même parmi d’autres items', () => {
    const base = { provenance, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' } };
    const failed = (data: unknown) => {
      const r = migrateToCurrent({ kind: 'session_record', schemaVersion: 3, data });
      expect(r.ok).toBe(false);
      return r.ok ? '' : `${r.reasons[0]!.code}:${String(r.reasons[0]!.params.problem ?? '')}`;
    };
    expect(failed([1])).toBe('TECHNICAL.MIGRATION_FAILED:record v3 attendu (objet)');
    expect(failed(null)).toBe('TECHNICAL.MIGRATION_FAILED:record v3 attendu (objet)');
    expect(failed('x')).toBe('TECHNICAL.MIGRATION_FAILED:record v3 attendu (objet)');
    for (const session of [null, 'x', {}, { blocks: 'x' }, { blocks: [null] }, { blocks: [{ items: 'x' }] }, { blocks: [{ items: [null] }] }, { blocks: [{ items: [{ prescription: null }] }] }, { blocks: [{ items: [{ prescription: 'run_structure' }] }] }]) {
      expect(failed({ ...base, session })).toMatch(/^TECHNICAL\.SCHEMA_INVALID/);
    }
    const s = zSessionDraft.parse(runInput([{ type: 'timed', workS: 60 }]));
    const mixed = { ...s, blocks: [{ ...s.blocks[0]!, items: [s.blocks[0]!.items[0]!, { id: 'i.r', exerciseId: 'ex.easy_run', prescription: rs([rep()]) }] }] };
    expect(failed({ ...base, session: mixed })).toBe('TECHNICAL.MIGRATION_FAILED:combinaison de versions malformée : run_structure dans une donnée v3');
    expect(failed({ ...base, session: s, durationEstimate: {} })).toBe('TECHNICAL.MIGRATION_FAILED:combinaison de versions malformée : durationEstimate dans une donnée v3');
    const r = migrateToCurrent<SessionRecord>({ kind: 'session_record', schemaVersion: 3, data: { ...base, session: strengthSession() } });
    expect(r.ok && r.value.durationEstimate).toEqual({ availability: 'UNAVAILABLE_LEGACY' });
  });
});

describe('durcissement — levier reduce_run_volume', () => {
  const steps = { reduceRestS: 15, shortenConditioningS: 60, reduceRunS: 120, reduceRunM: 400 };

  it('ordre : échauffement, puis retour au calme, puis continu — même si le continu précède le retour au calme', () => {
    const p = rs([seg('warmup', { durationS: 300 }), seg('steady', { durationS: 600 }), rep(), seg('cooldown', { durationS: 600 })]);
    const r = reduceRunStructure(p, { kind: 'reduce_run_volume', minS: 300 }, steps)!;
    expect(r.segments.map((s) => ('dose' in s ? s.dose : null))).toEqual([{ durationS: 300 }, { durationS: 600 }, null, { durationS: 480 }]);
  });

  it('dose en distance : pas en mètres, plancher inclus (égalité autorisée), allure conservée', () => {
    const wu = seg('warmup', { distanceM: 2000 }, 'w', paced(300, 330));
    const p = rs([wu, rep()]);
    const r1 = reduceRunStructure(p, { kind: 'reduce_run_volume', minM: 1600 }, steps)!;
    expect(r1.segments[0]).toEqual({ ...wu, dose: { distanceM: 1600 } });
    expect(checkRunEstimate(r1)).toEqual({ consistent: true });
    expect(reduceRunStructure(r1, { kind: 'reduce_run_volume', minM: 1600 }, steps)).toBeNull();
    expect(reduceRunStructure(p, { kind: 'reduce_run_volume', minM: 1601 }, steps)).toBeNull();
    // Sans plancher déclaré : le pas sert de plancher (jamais une dose nulle).
    expect(reduceRunStructure(rs([seg('warmup', { distanceM: 800 }, 'w', paced(300, 330)), rep()]), { kind: 'reduce_run_volume' }, steps)!.segments[0]).toMatchObject({ dose: { distanceM: 400 } });
    expect(reduceRunStructure(rs([seg('warmup', { distanceM: 799 }, 'w', paced(300, 330)), rep()]), { kind: 'reduce_run_volume' }, steps)).toBeNull();
    expect(reduceRunStructure(rs([seg('warmup', { durationS: 420 }), rep()]), { kind: 'reduce_run_volume', minS: 300 }, steps)!.segments[0]).toMatchObject({ dose: { durationS: 300 } });
  });

  it('dans un bloc : seul le premier item réductible change ; timed / distance au plancher exact', () => {
    const input = runInput([rs([seg('warmup', { durationS: 600 }), rep()])]);
    const two = { ...input, blocks: [{ ...input.blocks[0]!, levers: [{ kind: 'reduce_run_volume', minS: 300 }], items: [input.blocks[0]!.items[0]!, { ...input.blocks[0]!.items[0]!, id: 'i.second', prescription: rs([seg('steady', { durationS: 600 }), rep()]) }] }] };
    const s = zSessionDraft.parse(two);
    const out = applyLeverStep(s, { blockId: 'b0', lever: { kind: 'reduce_run_volume', minS: 300 } }, steps)!;
    expect((out.blocks[0]!.items[0]!.prescription as RunStructure).segments[0]).toMatchObject({ dose: { durationS: 480 } });
    expect((out.blocks[0]!.items[1]!.prescription as RunStructure).segments[0]).toMatchObject({ dose: { durationS: 600 } });
    const legacy = (p: unknown, lever: { kind: 'reduce_run_volume'; minS?: number; minM?: number }) => applyLeverStep(zSessionDraft.parse(runInput([p])), { blockId: 'b0', lever }, steps);
    expect(legacy({ type: 'timed', workS: 420 }, { kind: 'reduce_run_volume', minS: 300 })?.blocks[0]!.items[0]!.prescription).toMatchObject({ workS: 300 });
    expect(legacy({ type: 'timed', workS: 419 }, { kind: 'reduce_run_volume', minS: 300 })).toBeNull();
    expect(legacy({ type: 'distance', distanceM: 2000 }, { kind: 'reduce_run_volume', minM: 1600 })?.blocks[0]!.items[0]!.prescription).toMatchObject({ distanceM: 1600 });
    expect(legacy({ type: 'distance', distanceM: 1999 }, { kind: 'reduce_run_volume', minM: 1600 })).toBeNull();
  });
});
