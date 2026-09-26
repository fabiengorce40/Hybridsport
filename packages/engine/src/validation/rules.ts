/** Contrôles intégrés du CORE : chacun possède une fiche dans le ruleset (traçabilité, spec 09 §3). */
export const CORE_RULES = {
  programStatus: { id: 'core.safety.program_status', version: '1.0.0' },
  restriction: { id: 'core.safety.restriction', version: '1.0.0' },
  painArea: { id: 'core.safety.pain_area', version: '1.0.0' },
  painMovement: { id: 'core.safety.pain_movement', version: '1.0.0' },
  equipment: { id: 'core.feasibility.equipment', version: '1.0.0' },
  exclusion: { id: 'core.feasibility.user_exclusion', version: '1.0.0' },
  exerciseStatus: { id: 'core.feasibility.exercise_status', version: '1.0.0' },
  day: { id: 'core.feasibility.day', version: '1.0.0' },
  duration: { id: 'core.feasibility.duration', version: '1.0.0' },
  recovery: { id: 'core.recovery.min_gap', version: '1.0.0' },
  integrity: { id: 'core.integrity.structure', version: '1.0.0' },
} as const;

/** Identifiant de politique d'application utilisé par le contrôle de récupération minimale (L1). */
export const MIN_RECOVERY_POLICY_ID = 'core.recovery.min_gap';
