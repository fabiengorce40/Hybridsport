/**
 * H1 — première tranche GÉNÉRATIVE HYROX : UNE station, UN mouvement du catalogue rattaché à cette station, UNE dose
 * gouvernée (distance, répétitions, calories ou durée) et la charge gouvernée si le mouvement est chargé. Bloc
 * `hybrid_station_work`, format `continuous`, aucun levier. Pas de course, pas d'enchaînement course / station, pas de
 * simulation : ils exigent des allures (moteur Course) et un planificateur global. Aucune substitution : toute
 * incompatibilité ⇒ refus.
 */
import { NOT_APPLICABLE } from '@hybridsport/domain';
import type { Exercise, ItemLoad, Prescription, ReasonCode, SportEngineProposalInput } from '@hybridsport/domain';
import type { SportEngineInput } from '@hybridsport/engine';
import { HR_CODES, hrReasons } from './codes.js';
import type { HyroxContext } from './model.js';
import type { StationDose } from './params.js';

/** Seul modèle de charge chargeable SANS charge externe obligatoire : le poids du corps (charge ajoutée facultative). */
const BODYWEIGHT_PLUS = 'bodyweight_plus';

/** Cohérence charge ↔ mouvement : charge OBLIGATOIRE si le mouvement est chargé, INTERDITE s'il ne l'est pas. */
export function loadIssue(dose: StationDose, exercise: Exercise): string | undefined {
  const requiresLoad = exercise.loadable && exercise.loadModel !== BODYWEIGHT_PLUS;
  if (requiresLoad && dose.loadKg === undefined) return 'LOAD_REQUIRED';
  if (!exercise.loadable && dose.loadKg !== undefined) return 'LOAD_ON_UNLOADED_MOVEMENT';
  return undefined;
}

/**
 * Causes d'inéligibilité du mouvement pour CET athlète (mêmes contrôles que le CORE, appliqués AVANT la proposition
 * pour refuser au lieu de laisser le CORE substituer ou retirer) et pour CETTE station.
 */
export function movementIssues(stationId: string | undefined, exerciseId: string, exercise: Exercise | undefined, input: SportEngineInput<HyroxContext>): string[] {
  if (!exercise) return ['UNKNOWN_MOVEMENT'];
  const c = input.constraints;
  const out: string[] = [];
  if (exercise.status !== 'active') out.push('INACTIVE');
  // `undefined` : composante non-station (segment couru H2) — aucun rattachement de station exigé.
  if (stationId !== undefined && exercise.hybridRaceStation !== stationId) out.push('NOT_THIS_STATION');
  if (!input.catalog.isFeasibleWith(exercise, new Set(c.availableEquipment))) out.push('EQUIPMENT_MISSING');
  if (exercise.contraindicationTags.some((t) => c.restrictions.includes(t))) out.push('RESTRICTION');
  if (exercise.painSensitiveAreas.some((a) => c.areaRestrictions.some((r) => r.area === a))) out.push('PAIN_AREA');
  if (exercise.movementTags.some((m) => c.restrictedMovements.includes(m))) out.push('PAIN_MOVEMENT');
  if (c.excludedExercises.includes(exerciseId)) out.push('USER_EXCLUSION');
  return out;
}

/** Prescription CORE de la dose : types existants, charge générique `load` (jamais de sémantique HYROX dans le CORE). */
export function prescriptionOf(dose: StationDose): Prescription {
  const load: { load?: ItemLoad } = dose.loadKg === undefined ? {} : { load: { kg: dose.loadKg, certainty: 'prescribed' } };
  switch (dose.dose.kind) {
    case 'distance_m': return { type: 'distance', distanceM: dose.dose.value, ...load };
    case 'reps': return { type: 'reps', reps: dose.dose.value, ...load };
    case 'calories': return { type: 'calories', calories: dose.dose.value, ...load };
    case 'duration_s': return { type: 'timed', workS: dose.dose.value, rounds: 1, restS: 0, ...load };
  }
}

/**
 * Séance H1 : NOUVELLE occurrence (identifiants dérivés de l'intention courante). Empreinte : `energy` et `stimulus`
 * `not_applicable` (aucun modèle énergétique ni taxonomie HYROX gouvernés) ; aucun `format` déclaré.
 */
export function h1Proposal(
  input: SportEngineInput<HyroxContext>, dose: StationDose, toleranceProfile: string, engine: { readonly id: string; readonly version: string },
  used: readonly { readonly id: string; readonly version: string }[], reasons: readonly ReasonCode[],
): SportEngineProposalInput {
  const base = input.intent.id;
  const itemId = `${base}.station`;
  const markers: Record<string, number> = { [`h1.${dose.stationId}.${dose.dose.kind}`]: dose.dose.value, ...(dose.loadKg === undefined ? {} : { [`h1.${dose.stationId}.loadKg`]: dose.loadKg }) };
  return {
    proposalId: `proposal.${base}.h1`, discipline: 'hybrid_race', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
    stimulus: input.intent.stimulus, objective: input.intent.objective,
    session: {
      id: `${base}.hr`, discipline: 'hybrid_race', athleteLevel: input.profile.athleteLevel,
      availableTimeS: input.intent.availableTimeS, targetDurationS: input.intent.targetDurationS, toleranceProfile,
      blocks: [{ id: `${base}.block`, kind: 'hybrid_station_work', role: 'primary', format: 'continuous', items: [{ id: itemId, exerciseId: dose.exerciseId, prescription: prescriptionOf(dose) }] }],
    },
    optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
    fingerprintInputs: { archetypeId: input.intent.archetypeId, stimulus: NOT_APPLICABLE, energy: NOT_APPLICABLE, volumeByItem: { [itemId]: dose.dose.value }, prescriptionMarkers: markers },
    repetitionIntents: [],
    reasons: [...reasons, hrReasons.emit(HR_CODES.H1_PROPOSED, { stationId: dose.stationId, exerciseId: dose.exerciseId })].map((r) => ({
      ...r,
      params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
      ruleRefs: [...r.ruleRefs],
    })),
    provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    parametersUsed: used.map((u) => ({ id: u.id, version: u.version })),
  };
}
