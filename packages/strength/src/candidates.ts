/**
 * Candidats d'un emplacement (spec strength 03 §7.1) : filtres ÉLIMINATOIRES F1–F10, chaque rejet
 * compté par raison. La classe d'équipement n'intervient que via la faisabilité matérielle (F3).
 */
import type { Exercise } from '@hybridsport/domain';
import { slotAccepts } from '@hybridsport/engine';
import type { Env } from './model.js';
import type { SlotInstance } from './archetypes.js';
import { levelIndex } from './util.js';

export const FILTERS = ['F1_deprecated', 'F2_slot', 'F2b_prescription', 'F3_equipment', 'F4_restriction', 'F5_pain', 'F6_user_exclusion', 'F7_skill', 'F7b_novice_technical', 'F8_discipline', 'F9_context', 'F10_primary_load'] as const;
export type FilterId = (typeof FILTERS)[number];

export interface CandidateResult {
  readonly candidates: readonly Exercise[];
  readonly rejected: Readonly<Partial<Record<FilterId, number>>>;
}

/** État cumulatif de la séance en construction (contraintes « au plus N » de la séance). */
export interface CumulativeState {
  readonly technicalCount: number;
}

export function firstFailingFilter(e: Exercise, slot: SlotInstance, env: Env, cumulative: CumulativeState): FilterId | undefined {
  const c = env.input.constraints;
  if (e.status !== 'active') return 'F1_deprecated';
  if (!slotAccepts(e, slot.requirement, env.catalog)) return 'F2_slot';
  // V1 : séries à répétitions, maintien (gainage) ou porté en distance ; les autres formes ne sont pas candidates.
  if (!['sets', 'hold', 'distance'].includes(e.defaultPrescriptionType) && e.movementType !== 'mobility') return 'F2b_prescription';
  if (!env.catalog.isFeasibleWith(e, env.equipment)) return 'F3_equipment';
  if (e.contraindicationTags.some((t) => c.restrictions.includes(t))) return 'F4_restriction';
  if (e.painSensitiveAreas.some((a) => c.areaRestrictions.some((r) => r.area === a && r.action === 'exclude'))) return 'F5_pain';
  if (e.movementTags.some((m) => c.restrictedMovements.includes(m))) return 'F5_pain';
  if (c.excludedExercises.includes(e.id)) return 'F6_user_exclusion';
  if (e.skillLevel > env.params['strength.selection.skillCeiling'][env.level]) return 'F7_skill';
  const tech = env.params['strength.novice.technicalUnderFatigue'];
  if (tech.levels.includes(env.level) && e.cost.technical >= tech.minTechnical
    && (!tech.allowedRoles.includes(slot.def.role) || cumulative.technicalCount >= tech.maxPerSession)) return 'F7b_novice_technical';
  if (!e.disciplines.includes('strength')) return 'F8_discipline';
  const per = env.params['strength.interference'].perStructure;
  const structures = env.structuresOf(e);
  for (const s of env.lowered.keys()) {
    const cut = per[s]?.excludeContributionAtLeast;
    if (cut !== undefined && (structures[s] ?? 0) >= cut) return 'F9_context';
  }
  // Principal d'un stimulus lourd : un exercice plafonné (poids du corps non lestable) ne porte pas la dose.
  if (slot.def.role === 'primary' && env.params['strength.selection.primaryLoadRequired'].includes(env.stimulus) && e.loadCeiling < env.params['strength.selection.minLoadCeiling'][env.level]) return 'F10_primary_load';
  return undefined;
}

/** Tri par identifiant AVANT tout filtre : le résultat ne dépend pas de l'ordre du catalogue. */
export function slotCandidatesFor(slot: SlotInstance, env: Env, cumulative: CumulativeState): CandidateResult {
  const rejected: Partial<Record<FilterId, number>> = {};
  const candidates: Exercise[] = [];
  for (const e of [...env.catalog.exercises()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const f = firstFailingFilter(e, slot, env, cumulative);
    if (f === undefined) candidates.push(e);
    else if (f !== 'F2_slot') rejected[f] = (rejected[f] ?? 0) + 1;
  }
  return { candidates, rejected };
}

/** Éligibilité à l'effort maximal (G1, STR-V7) : niveau minimal de l'exercice. */
export function maxEffortEligible(e: Exercise, env: Env): boolean {
  const min = e.maxEffortEligibility?.minLevel;
  return min !== undefined && levelIndex(env.level) >= levelIndex(min) && !env.input.constraints.suspendHighIntensity;
}
