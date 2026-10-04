/**
 * Cross-training — vocabulaire du domaine (représentation seulement ; carte docs/kairo/CROSSTRAINING-DOMAIN-MAP.md).
 * Aucune valeur sportive : les stimuli, formats et modalités sont des IDENTIFIANTS. Leurs domaines de temps,
 * intensités et densités sont des paramètres gouvernés (tous non résolus en C1).
 */

/** Stimuli (spec CORE 06 §3 + benchmark §7). L'archétype EST le stimulus ; le format le sert. */
export const CT_STIMULI = [
  'strength_plus_conditioning', 'aerobic_capacity', 'threshold', 'anaerobic_intervals', 'mixed_modal_medium',
  'muscular_endurance', 'skill_plus_conditioning', 'long_chipper', 'benchmark',
] as const;
export type CtStimulus = (typeof CT_STIMULI)[number];

/** Identifiant d'archétype porté par l'intention du planificateur (correspondance technique). */
export const CT_ARCHETYPE_PREFIX = 'crosstraining.';
export const archetypeIdOf = (s: CtStimulus): string => `${CT_ARCHETYPE_PREFIX}${s}`;
export function stimulusFromArchetypeId(id: string): CtStimulus | undefined {
  return CT_STIMULI.find((s) => archetypeIdOf(s) === id);
}

/**
 * Archétype technique de C2 (amorçage + rejeu strict). Ce N'EST PAS un stimulus : C2 est découplé de CT-D1 ; les
 * 9 identifiants de CT_STIMULI ne servent ni à la sélection, ni à l'éligibilité, ni à l'empreinte C2.
 */
export const CT_C2_ARCHETYPE = 'crosstraining.c2';

/** Formats réalisés / prescrits (spec 06 §3) ; priorité à la tâche ou au temps. */
export const CT_FORMATS = ['for_time', 'amrap', 'emom', 'intervals', 'continuous'] as const;
export type CtFormat = (typeof CT_FORMATS)[number];

/** Objectifs déclarés (spec 06 : `crosstraining_general` ou compétition). */
export const CT_GOALS = ['GENERAL_FITNESS', 'COMPETITION'] as const;
export type CtGoal = (typeof CT_GOALS)[number];

/** Modes d'exécution (même contrat que les autres moteurs gouvernés). */
export const CT_MODES = ['CANDIDATE', 'PRODUCTION'] as const;
export type CtMode = (typeof CT_MODES)[number];

/** États de reprise DÉCLARÉS (jamais déduits) ; aucune règle de reprise Cross-training n'est gouvernée. */
export const CT_RETURN_STATES = ['NONE', 'SHORT', 'MODERATE', 'LONG', 'UNKNOWN'] as const;
