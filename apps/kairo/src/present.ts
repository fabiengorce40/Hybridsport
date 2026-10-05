/**
 * Mapping de PRÉSENTATION Beta 0 (UI uniquement) : identifiants et catégories du backend → libellés compréhensibles.
 * Aucun code interne n'est affiché tel quel ; aucune décision sportive ici.
 */
import { RUNNING_ARCHETYPE_LABELS, RUNNING_ROLE_LABELS, SPORT_LABELS } from '@hybridsport/app-core';
import type { SessionView, SessionViewStatus } from '@hybridsport/app-core';

const STRENGTH_TITLES: Readonly<Record<string, string>> = { str_full_body: 'Full body', str_upper: 'Haut du corps', str_lower: 'Bas du corps', str_support: 'Renforcement' };

export const SPORT_SHORT: Readonly<Record<string, string>> = { strength: 'Musculation', running: 'Course' };
export const sportName = (s: string): string => SPORT_SHORT[s] ?? SPORT_LABELS[s as 'strength'] ?? 'Séance';

/** Titre d'une séance (type de séance), sans identifiant technique. */
export function sessionName(sport: string, archetypeId: string | null): string {
  if (sport === 'running') return (archetypeId ? RUNNING_ARCHETYPE_LABELS[archetypeId] : undefined) ?? 'Course';
  return (archetypeId ? STRENGTH_TITLES[archetypeId] : undefined) ?? 'Musculation';
}

/** Rôle de la séance dans la semaine Running (composition du moteur), libellé lisible. */
export const roleName = (role: string | null): string | null => (role && role !== 'LOCKED' && role !== 'EASY' ? RUNNING_ROLE_LABELS[role] ?? null : null);

export const isTest = (archetypeId: string | null): boolean => archetypeId === 'running.test';

export type DisplayStatus = SessionViewStatus | 'in_progress';
export const STATUS_LABELS: Readonly<Record<DisplayStatus, string>> = {
  planned: 'Prévue', in_progress: 'En cours', completed_as_prescribed: 'Terminée', modified: 'Adaptée', abandoned: 'Arrêtée', missed: 'Manquée', not_planned: 'Non planifiée',
};
/** Pastille d'état : forme + texte (jamais la couleur seule). */
export const STATUS_ICONS: Readonly<Record<DisplayStatus, string>> = {
  planned: '○', in_progress: '◐', completed_as_prescribed: '✓', modified: '✓', abandoned: '■', missed: '✕', not_planned: '–',
};
export const isDone = (s: DisplayStatus): boolean => s === 'completed_as_prescribed' || s === 'modified' || s === 'abandoned';

/** Explication compréhensible d'une séance non planifiée (catégorie du planificateur). */
export const NOT_PLANNED_MESSAGES: Readonly<Record<string, string>> = {
  slot_unavailable: 'Cette séance n’a pas pu être placée dans vos disponibilités.',
  interference_conflict: 'Cette séance n’a pas pu être placée : elle aurait été trop proche d’une autre séance sollicitant les mêmes zones.',
  governance_blocked: 'Les règles nécessaires pour planifier cette séance ne sont pas encore disponibles.',
  safety_blocked: 'Cette séance n’a pas été proposée par précaution.',
  engine_refused: 'Aucune séance valide n’a pu être construite pour ce créneau.',
  invalid_intent: 'Cette séance n’a pas pu être construite à partir de votre programme.',
  engine_unavailable: 'Ce sport n’est pas disponible.',
  programme_intent_incomplete: 'Le programme ne décrit pas encore cette séance.',
};
/** Précisions connues pour certaines raisons (aucun code affiché). */
const REASON_HINTS: Readonly<Record<string, string>> = {
  'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE': 'Enregistrez une course réalisée : la course reprend ce que vous avez réellement fait.',
  'SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED': 'La séance de départ pour débutant en course n’est pas encore validée.',
  // Composition Strength non gouvernée (Beta 0 : fréquence hors des bandes de la règle candidate du moteur Strength).
  'strength:RULE.PLANNER.COMPOSITION_UNRESOLVED': 'Aucune règle validée ne répartit encore ce nombre de séances de musculation dans la semaine : réduisez la fréquence de musculation.',
};
export function notPlannedText(v: SessionView): string {
  const base = NOT_PLANNED_MESSAGES[v.notPlanned?.category ?? ''] ?? 'Cette séance n’a pas pu être planifiée.';
  const code = v.notPlanned?.reason?.code;
  const hint = code ? REASON_HINTS[`${v.sport}:${code}`] ?? REASON_HINTS[code] : undefined;
  return hint ? `${base} ${hint}` : base;
}

/** Messages des refus applicatifs (codes app-core) ; défaut générique sans code. */
export const ERROR_TEXT: Readonly<Record<string, string>> = {
  NO_SPORT_SELECTED: 'Choisissez au moins un sport.',
  SESSION_UNAVAILABLE: 'Cette séance n’est pas disponible.',
  SESSION_FINISHED: 'Cette séance est déjà terminée.',
  SESSION_NOT_STARTED: 'Démarrez la séance d’abord.',
  SET_REPS_REQUIRED: 'Indiquez les répétitions réalisées.',
  EXECUTION_STRENGTH_INCOMPLETE: 'Toutes les séries n’ont pas été validées : choisissez « J’ai adapté la séance ».',
  EXECUTION_RUN_DETAILS_REQUIRED: 'Indiquez la durée réellement courue.',
  EXECUTION_DUPLICATE: 'Cette séance est déjà enregistrée.',
  SAFETY_PAUSE_ACTIVE_PAIN: 'La planification est suspendue : une douleur a été signalée.',
  PROGRAMME_WEEK_NOT_PLANNABLE: 'Cette semaine ne peut pas être planifiée pour le moment.',
  BETA0_SPORT_UNSUPPORTED: 'Seules la musculation et la course sont disponibles.',
  RUN_DURATION_REQUIRED: 'Indiquez la durée réellement courue.',
  DUPLICATE_RUN: 'Cette course est déjà enregistrée.',
};
