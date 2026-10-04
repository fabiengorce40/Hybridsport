/**
 * Fixtures HYROX H1. TOUTE valeur ici est une DONNÉE DE TEST (TEST_ONLY), jamais lue par le code de production :
 * doses, charges, niveaux admis et approbations ne représentent aucune règle officielle ni aucune décision.
 */
import type { CatalogDocumentInput, FingerprintHistoryEntry, ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';
import type { CoreProfile, SportSessionRequest } from '@hybridsport/engine';
import { HR_H1_ARCHETYPE } from '../src/index.js';
import type { HyroxContextInput } from '../src/index.js';
import { EXERCISES, testCatalogDocument } from '../../engine/tests/fixtures/catalog.js';
import { presetEquipment } from '../../engine/tests/fixtures/context.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { STATE_FRESH } from '../../engine/tests/harness/requests.js';

// technical-constant: TEST_ONLY — doses et charges de test (aucune valeur de compétition ni d'entraînement)
export const TEST = { sledM: 50, sledKg: 100, wallBallReps: 20, wallBallKg: 6, skiM: 500, bbjM: 40, pullM: 50, pullKg: 80, carryS: 60, carryKg: 24 } as const;

/** Catalogue de test + clones TEST_ONLY des stations absentes du catalogue de test (sled pull, burpee broad jump). */
export function hyroxCatalogDocument(): CatalogDocumentInput {
  const base = testCatalogDocument();
  const sled = EXERCISES.find((e) => e.id === 'ex.sled_push')!;
  const sledPull = { ...sled, id: 'ex.sled_pull', canonicalName: { fr: 'ex.sled_pull' }, patterns: { primary: 'sled_pull', secondary: [] }, family: 'fam.sled_pull', equivalenceClass: 'eq.sled_pull', hybridRaceStation: 'sled_pull', substitutions: [] };
  const bbj = {
    ...sled, id: 'ex.burpee_broad_jump', canonicalName: { fr: 'ex.burpee_broad_jump' }, patterns: { primary: 'jumping', secondary: [] }, family: 'fam.bbj', equivalenceClass: 'eq.bbj',
    equipment: { allOf: [], anyOf: [] }, loadable: false, loadModel: undefined, loadCeiling: 0, movementTags: ['jumping'], contraindicationTags: ['no_jumping', 'no_impact'],
    hybridRaceStation: 'burpee_broad_jump', substitutions: [],
  };
  return { ...base, exercises: [...base.exercises, sledPull, bbj] } as CatalogDocumentInput;
}

export const hyroxCatalog = () => testCatalog(hyroxCatalogDocument());

export const DOSES = [
  { stationId: 'sled_push', exerciseId: 'ex.sled_push', dose: { kind: 'distance_m', value: TEST.sledM }, loadKg: TEST.sledKg, reviewRef: 'TEST-ONLY' },
  { stationId: 'wall_ball', exerciseId: 'ex.wall_ball', dose: { kind: 'reps', value: TEST.wallBallReps }, loadKg: TEST.wallBallKg, reviewRef: 'TEST-ONLY' },
  { stationId: 'skierg', exerciseId: 'ex.skierg', dose: { kind: 'distance_m', value: TEST.skiM }, reviewRef: 'TEST-ONLY' },
  { stationId: 'burpee_broad_jump', exerciseId: 'ex.burpee_broad_jump', dose: { kind: 'distance_m', value: TEST.bbjM }, reviewRef: 'TEST-ONLY' },
  { stationId: 'sled_pull', exerciseId: 'ex.sled_pull', dose: { kind: 'distance_m', value: TEST.pullM }, loadKg: TEST.pullKg, reviewRef: 'TEST-ONLY' },
  { stationId: 'farmers_carry', exerciseId: 'ex.farmers_carry', dose: { kind: 'duration_s', value: TEST.carryS }, loadKg: TEST.carryKg, reviewRef: 'TEST-ONLY' },
];

type ParamInput = RulesetDocumentInput['parameters'][number];
const APPROVALS = (['sports_expert', 'medical_advisor', 'product', 'engineering'] as const).map((role) => ({ role, name: 'Expert TEST', date: '2026-09-26', verdict: 'approved' as const, version: '0.1.0' }));
/** Approbation de TEST (jamais une décision réelle) : statut `approved`, non provisoire, approbations TEST tracées. */
export const approvedTestOnly: Partial<ParamInput> = { status: 'approved', provisional: false, approvals: APPROVALS, justification: 'TEST-ONLY : approbation simulée.' };

export interface HrParamsOverride { doses?: unknown; levels?: unknown; tolerance?: unknown; extra?: Partial<ParamInput>; governance?: { doses?: 'G1' | 'G2' } }

/** Ruleset de test (+ anti-doublon de test) + paramètres H1 TEST_ONLY (draft/provisoires par défaut). `null` ⇒ absent. */
export function hyroxRulesetDocument(o: HrParamsOverride = {}): RulesetDocumentInput {
  const base = testRulesetDocumentWithDuplicate();
  const extra = o.extra ?? {};
  const hr: ParamInput[] = [];
  if (o.doses !== null) hr.push(param('hybrid_race.h1.stationDoses', (o.doses ?? DOSES) as ParameterValue, o.governance?.doses ?? 'G1', extra));
  if (o.levels !== null) hr.push(param('hybrid_race.h1.eligibleLevels', (o.levels ?? ['intermediate']) as ParameterValue, 'G1', extra));
  if (o.tolerance !== null) hr.push(param('hybrid_race.h1.toleranceProfile', (o.tolerance ?? 'mixed') as ParameterValue, 'G3', extra));
  return { ...base, parameters: [...base.parameters, ...hr] };
}
export const hyroxRuleset = (o: HrParamsOverride = {}) => testRuleset(hyroxRulesetDocument(o));

export const PROFILE_HYROX: CoreProfile = {
  athleteLevel: 'intermediate', eligibility: 'eligible', declarations: [], healthDataConsent: true,
  restrictions: [], excludedExercises: [], availableEquipment: presetEquipment('preset.hybrid_race_gym'),
};

export function hrCtx(o: Partial<HyroxContextInput> = {}): HyroxContextInput {
  return { population: { level: 'intermediate', hybrid: false }, mode: 'CANDIDATE', returnState: { state: 'NONE' }, requestedStation: 'sled_push', ...o };
}

export function hrIntent(targetDurationS: number, archetypeId = HR_H1_ARCHETYPE) {
  return {
    id: 'intent.hr.h1', discipline: 'hybrid_race' as const, archetypeId, stimulus: 'stim.hybrid_race.station', objective: 'objective.hybrid_race.station',
    priority: 'standard' as const, phase: 'phase.hybrid_race.base', availableTimeS: 3600, targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
}

export function hrRequest(ctx: HyroxContextInput, targetDurationS: number, o: { profile?: CoreProfile; state?: SportSessionRequest['state']; history?: FingerprintHistoryEntry[]; archetypeId?: string } = {}): SportSessionRequest {
  return { intent: hrIntent(targetDurationS, o.archetypeId), profile: o.profile ?? PROFILE_HYROX, state: o.state ?? STATE_FRESH, history: o.history ?? [], disciplineContext: ctx };
}
