/**
 * RunningEngine — vague 1 : types de domaine APPROUVÉS en phase 5 (représentation seulement).
 * Aucun algorithme de prescription ; aucune valeur scientifique. Sources : RUNNING-V1-DOMAIN-SPEC
 * (§C populations, §D objectifs, §H domaines, §AE types), RUNNING-V1-SCOPE-C-FREEZE (archétypes).
 */
import type { RunTarget } from '@hybridsport/domain';

/**
 * Populations (5A §C.1). P_HYBRID n'est PAS un niveau : c'est un contexte qui s'ajoute à un niveau
 * P_R0…P_R4 (5A). Il figure dans l'énumération pour les décisions d'éligibilité et de périmètre.
 */
export const RUNNING_POPULATIONS = ['P_R0', 'P_R1', 'P_R2', 'P_R3', 'P_R4', 'P_HYBRID'] as const;
export type RunningPopulation = (typeof RUNNING_POPULATIONS)[number];
export const RUNNING_LEVELS = ['P_R0', 'P_R1', 'P_R2', 'P_R3', 'P_R4'] as const;
export type RunningLevel = (typeof RUNNING_LEVELS)[number];

/** Profil de population : un niveau + le contexte hybride éventuel. */
export interface RunningPopulationProfile { readonly level: RunningLevel; readonly hybrid: boolean }

/** Populations applicables à un profil (le niveau, plus P_HYBRID si le contexte est hybride). */
export function populationsOf(p: RunningPopulationProfile): readonly RunningPopulation[] {
  return p.hybrid ? [p.level, 'P_HYBRID'] : [p.level];
}

/** Objectifs V1 (5A §D). */
export const RUNNING_GOALS = ['GENERAL_RUNNING', 'FIVE_K', 'TEN_K', 'HALF_MARATHON', 'MARATHON'] as const;
export type RunningGoal = (typeof RUNNING_GOALS)[number];

/** Archétypes de séance du périmètre C (5G). Aucun archétype ajouté en silence. */
export const RUNNING_SESSION_ARCHETYPES = ['EASY', 'LONG', 'THRESHOLD', 'SEVERE', 'SHORT_INTERVAL', 'HILLS', 'RACE_PACE', 'TEST', 'STRIDES'] as const;
export type RunningSessionArchetype = (typeof RUNNING_SESSION_ARCHETYPES)[number];

/** Archétypes hors V1 : connus, toujours désactivés (jamais proposés). */
export const POST_V1_ARCHETYPES = ['PROGRESSION_RUN'] as const;
export type PostV1Archetype = (typeof POST_V1_ARCHETYPES)[number];

/**
 * Identifiants d'archétype portés par l'intention du planificateur (SessionIntent.archetypeId) ;
 * table de correspondance TECHNIQUE, sans sémantique sportive.
 */
export const ARCHETYPE_INTENT_IDS: Readonly<Record<RunningSessionArchetype | PostV1Archetype, string>> = {
  EASY: 'running.easy', LONG: 'running.long', THRESHOLD: 'running.threshold', SEVERE: 'running.severe',
  SHORT_INTERVAL: 'running.short_interval', HILLS: 'running.hills', RACE_PACE: 'running.race_pace',
  TEST: 'running.test', STRIDES: 'running.strides', PROGRESSION_RUN: 'running.progression_run',
};

export function archetypeFromIntentId(id: string): RunningSessionArchetype | PostV1Archetype | undefined {
  return (Object.keys(ARCHETYPE_INTENT_IDS) as (RunningSessionArchetype | PostV1Archetype)[]).find((k) => ARCHETYPE_INTENT_IDS[k] === id);
}

export function isV1Archetype(a: string): a is RunningSessionArchetype {
  return (RUNNING_SESSION_ARCHETYPES as readonly string[]).includes(a);
}

/**
 * Modèle interne des intensités (5A §H.1) : TROIS domaines physiologiques délimités par deux
 * frontières (dont les valeurs ne sont jamais universelles), plus trois catégories d'usage.
 */
export const PHYSIOLOGICAL_DOMAINS = ['MODERATE', 'HEAVY', 'SEVERE'] as const;
export type PhysiologicalDomain = (typeof PHYSIOLOGICAL_DOMAINS)[number];
export const USAGE_CATEGORIES = ['EASY_LOW', 'THRESHOLD_LIKE', 'SPRINT_NEUROMUSCULAR'] as const;
export type UsageCategory = (typeof USAGE_CATEGORIES)[number];
export type RunningIntensityDomain = PhysiologicalDomain | UsageCategory;
export const RUNNING_INTENSITY_DOMAINS: readonly RunningIntensityDomain[] = ['EASY_LOW', 'MODERATE', 'HEAVY', 'THRESHOLD_LIKE', 'SEVERE', 'SPRINT_NEUROMUSCULAR'];

/**
 * Rattachement STRUCTUREL des catégories d'usage (5A §H.1) : EASY_LOW est un sous-ensemble du domaine
 * modéré (limite supérieure, pas une cible) ; THRESHOLD_LIKE est le haut du domaine heavy, au
 * voisinage de la frontière 2 ; SPRINT_NEUROMUSCULAR est mal décrit par les domaines métaboliques.
 */
export const USAGE_CATEGORY_PARENT: Readonly<Record<UsageCategory, PhysiologicalDomain | null>> = {
  EASY_LOW: 'MODERATE', THRESHOLD_LIKE: 'HEAVY', SPRINT_NEUROMUSCULAR: null,
};

/** Représentation dans le schéma CORE (`run_structure`, CORE-EXT-R1) : correspondance de noms seulement. */
export const CORE_RUN_DOMAIN: Readonly<Record<RunningIntensityDomain, RunTarget['domain']>> = {
  EASY_LOW: 'easy_low', MODERATE: 'moderate', HEAVY: 'heavy', THRESHOLD_LIKE: 'threshold_like', SEVERE: 'severe', SPRINT_NEUROMUSCULAR: 'sprint_neuromuscular',
};

/**
 * AUCUNE correspondance universelle RPE ↔ domaine, FC ↔ domaine ou allure ↔ domaine n'est codée :
 * elles restent des paramètres du registre (V02 `running.target.rpeByDomain`, non approuvé).
 */

/** Mode d'exécution (contrat 5C) : CANDIDATE (valeurs proposées tracées) ou PRODUCTION (éligibilité prouvée). */
export const RUNNING_MODES = ['CANDIDATE', 'PRODUCTION'] as const;
export type RunningMode = (typeof RUNNING_MODES)[number];

/** États de reprise (G1-RETURN, frontières V24 non signées : l'état est FOURNI, jamais déduit ici). */
export const RETURN_STATES = ['NONE', 'SHORT', 'MODERATE', 'LONG', 'UNKNOWN'] as const;
export type ReturnState = (typeof RETURN_STATES)[number];

/** Niveau ordinal de confiance (5A §AE). NONE = aucune base. */
export const CONFIDENCE_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export const confidenceRank = (c: ConfidenceLevel): number => CONFIDENCE_LEVELS.indexOf(c);
/** Minimum des facteurs (5G) ; aucun facteur ⇒ NONE (jamais une confiance par défaut). */
export const minConfidence = (levels: readonly ConfidenceLevel[]): ConfidenceLevel =>
  levels.length === 0 ? 'NONE' : levels.reduce<ConfidenceLevel>((m, c) => (confidenceRank(c) < confidenceRank(m) ? c : m), 'HIGH');
