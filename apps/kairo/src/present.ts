/**
 * Mapping de PRÉSENTATION Beta 0 (UI uniquement) : identifiants et catégories du backend → libellés compréhensibles.
 * Aucun code interne n'est affiché tel quel ; aucune décision sportive ici.
 */
import { CT_FORMAT_LABELS, CT_INTENT_LABELS, exerciseLabel, HR_ROLE_LABELS, RUNNING_ARCHETYPE_LABELS, RUNNING_ROLE_LABELS, SPORT_LABELS } from '@hybridsport/app-core';
import type { Beta0WeekView, SessionView, SessionViewStatus } from '@hybridsport/app-core';

const STRENGTH_TITLES: Readonly<Record<string, string>> = { str_full_body: 'Full body', str_upper: 'Haut du corps', str_lower: 'Bas du corps', str_support: 'Renforcement' };

export const SPORT_SHORT: Readonly<Record<string, string>> = { strength: 'Musculation', running: 'Course', crosstraining: 'Cross-training', hyrox: 'HYROX' };
export const sportName = (s: string): string => SPORT_SHORT[s] ?? SPORT_LABELS[s as 'strength'] ?? 'Séance';

/**
 * Titre d'une séance : libellé de l'archétype RÉELLEMENT prescrit (projection de selectBeta0Week). Aucun repli : un
 * archétype absent, incohérent ou inconnu est affiché comme une ERREUR DE DONNÉES, jamais comme un autre archétype.
 */
export function sessionName(sport: string, archetypeId: string | null, dataError: SessionView['dataError'] = null): string {
  if (dataError === 'ARCHETYPE_MISMATCH') return 'Erreur de données : archétype incohérent';
  if (archetypeId === null) return 'Erreur de données : archétype absent';
  const label = sport === 'running' ? RUNNING_ARCHETYPE_LABELS[archetypeId] : sport === 'crosstraining' ? CT_INTENT_LABELS[archetypeId]?.title : sport === 'hyrox' ? HR_ROLE_LABELS[archetypeId]?.title : STRENGTH_TITLES[archetypeId];
  return label ?? `Erreur de données : archétype inconnu (${archetypeId})`;
}

/** Semaine planifiée par une version précédente de KAIRO : explication (aucune décision ici). */
const KEPT_CAUSES: Readonly<Record<string, string>> = {
  past_sessions: 'des séances prévues sont déjà passées',
  results: 'des séances ont déjà été enregistrées',
  session_in_progress: 'une séance est en cours',
  closed: 'elle est clôturée',
};
export function weekPlanningText(p: Beta0WeekView['planning']): string | null {
  if (!p) return null;
  if (p.status === 'stale_kept') return `Cette semaine a été planifiée par une version précédente de KAIRO. Elle est conservée telle quelle car ${KEPT_CAUSES[p.cause ?? ''] ?? 'elle est commencée'} : la semaine prochaine utilisera la nouvelle composition.`;
  if (p.replannedAt) return 'Cette semaine a été replanifiée avec la nouvelle version de KAIRO : aucune séance n’avait commencé.';
  return null;
}

/**
 * A2 — TEST chronométré demandé mais refusé par le moteur Running : la séance habituelle (course facile) a été gardée.
 * Cause lue du moteur ; le texte dit quoi faire pour que le test devienne possible.
 */
export function runningTestFallbackText(f: Beta0WeekView['runningTestFallback']): string | null {
  if (!f) return null;
  const why = f.cause === 'OBSERVED_PACE_UNAVAILABLE'
    ? 'aucune course récente avec sa distance n’est enregistrée (elle sert à estimer la durée du test).'
    : `le moteur de course ne peut pas le prescrire pour l’instant (${f.cause}).`;
  const next = f.cause === 'OBSERVED_PACE_UNAVAILABLE'
    ? ' Notez la distance de vos prochaines courses, puis redemandez le test depuis le profil Course.'
    : ' Vous pourrez le redemander depuis le profil Course.';
  return `Test chronométré non programmé cette semaine : ${why} Votre séance de course est conservée en course facile, sans allure imposée.${next}`;
}

/** Rôle de la séance dans la semaine Running (composition du moteur), libellé lisible. */
export const roleName = (role: string | null): string | null => (role && role !== 'LOCKED' && role !== 'EASY' ? RUNNING_ROLE_LABELS[role] ?? null : null);

/** Format Cross-training lisible (format persisté de la séance), sinon null. */
export const ctFormatName = (f: string | null): string | null => (f ? CT_FORMAT_LABELS[f] ?? null : null);

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
  // RC3.1 A8 — une SAISIE manque (jamais présenté comme une règle absente).
  missing_data: 'Une information manque pour construire cette séance.',
};
/** Précisions connues pour certaines raisons (aucun code affiché). */
const REASON_HINTS: Readonly<Record<string, string>> = {
  'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE': 'Enregistrez une course réalisée : la course reprend ce que vous avez réellement fait.',
  'DOSE.RUNNING.TEST_REFUSED': 'Enregistrez une course récente avec sa distance : elle sert à estimer la durée du test.',
  'DOSE.RUNNING.STRUCTURE_UNAVAILABLE': 'La structure de votre dernière séance de ce type n’a pas été enregistrée : elle ne peut pas être reprise.',
  'DOSE.RUNNING.FIRST_EXPOSURE_REFUSED': 'Un test récent est d’abord nécessaire : demandez-le depuis le profil Course.',
  'FEASIBILITY.TIME_EXCEEDED': 'La séance dépasse le temps disponible ce jour-là : elle n’est jamais raccourcie.',
  'PLAN.RUNNING.TIME_EXCEEDED': 'La séance dépasse le temps disponible ce jour-là : elle n’est jamais raccourcie.',
  'DURATION.TARGET_BELOW_ARCHETYPE_MIN': 'Le temps disponible ce jour-là est inférieur à la durée minimale de cette séance.',
  'PLAN.PLANNER.NOT_ENOUGH_DAYS': 'Il n’y a pas assez de jours disponibles dans la semaine pour toutes les séances demandées.',
  // RC3.2 A3 — intention Cross-training irréalisable avec le profil : où voir les options réalisables.
  'SCOPE.CROSSTRAINING.C3_STRUCTURE_UNAVAILABLE': 'Cette intention Cross-training ne peut pas être composée avec votre profil actuel : l’onglet Programme indique les intentions réalisables (« Modifier »).',
  'SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED': 'La séance de départ pour débutant en course n’est pas encore validée.',
  // Composition Strength non gouvernée (Beta 0 : fréquence hors des bandes de la règle candidate du moteur Strength).
  'strength:RULE.PLANNER.COMPOSITION_UNRESOLVED': 'Aucune règle validée ne répartit encore ce nombre de séances de musculation dans la semaine : réduisez la fréquence de musculation.',
};
/** M3 — raison lisible d'un déplacement / d'un conflit restant (aucun code, aucune valeur). */
export function arbitrationText(v: { readonly arbitration: SessionView['arbitration'] }, dayLabel: (date: string) => string): string | null {
  const a = v.arbitration;
  if (!a) return null;
  const OF: Readonly<Record<string, string>> = { strength: 'de musculation', running: 'de course', crosstraining: 'de cross-training', hyrox: 'HYROX' };
  const other = a.withSport && OF[a.withSport] ? `une séance ${OF[a.withSport] ?? ''}` : 'une autre séance';
  if (a.kind === 'moved') return `Déplacée${a.fromDate ? ` depuis ${dayLabel(a.fromDate)}` : ''} pour l’éloigner d’${other} qui sollicite les mêmes zones du corps.`;
  if (a.kind === 'swapped') return `Jour échangé${a.fromDate ? ` (prévue ${dayLabel(a.fromDate)})` : ''} pour éloigner deux séances qui sollicitent les mêmes zones du corps.`;
  if (a.kind === 'recomposed') return `Adaptée par son moteur à cause d’${other} proche.`;
  return `Proche d’${other} qui sollicite les mêmes zones du corps : aucun autre jour disponible ne convenait.`;
}
/** RC4.5 (C1) — jour changé par le placement global (G5) : raison lisible, aucun code. */
export function globalPlacementText(v: { readonly globalPlacement: SessionView['globalPlacement'] }, dayLabel: (date: string) => string): string | null {
  return v.globalPlacement ? `Jour changé (prévue ${dayLabel(v.globalPlacement.fromDate)}) pour éviter deux séances Full Body à la suite.` : null;
}
/**
 * Q1 — qualité expérimentale (aucun code, aucun score) : le diagnostic montre seulement si la cohérence est vérifiée
 * et si des points ne sont pas validés. Null : rien à signaler (aucun diagnostic).
 */
export function qualityText(v: { readonly quality: SessionView['quality'] }): string | null {
  return qualityVerdictText(v.quality?.verdict ?? null);
}
/** Version COURTE pour les cartes (planning, accueil) : l'explication complète est dans la séance. */
export function qualityShortText(verdict: NonNullable<SessionView['quality']>['verdict'] | null | undefined): string | null {
  if (verdict === 'BLOCKED') return 'Séance non réalisable : prescription incohérente.';
  if (verdict === 'UNRESOLVED') return 'Séance expérimentale';
  if (verdict === 'ACCEPTABLE_WITH_WARNINGS') return 'Point à surveiller';
  return null;
}
/** Même texte à partir du seul verdict (vue de séance). */
export function qualityVerdictText(verdict: NonNullable<SessionView['quality']>['verdict'] | null): string | null {
  if (verdict === 'BLOCKED') return 'Qualité : prescription incohérente, séance non réalisable.';
  // UNRESOLVED : statut scientifique interne, jamais une erreur pour l'utilisateur (FIELD TEST : séance réalisable).
  if (verdict === 'UNRESOLVED') return 'Séance expérimentale : structure compatible avec votre programme, certaines doses et règles sont encore en cours de validation.';
  if (verdict === 'ACCEPTABLE_WITH_WARNINGS') return 'Qualité : cohérence vérifiée, point à surveiller.';
  return null;
}
/** Démarrage refusé (séance planifiée ou « Faire maintenant ») : raison lisible (aucun code). */
const OTHER_SPORT: Readonly<Record<string, string>> = { strength: 'de musculation', running: 'de course', crosstraining: 'de cross-training', hyrox: 'HYROX' };
export function manualStartText(a: { readonly cause: string | null; readonly conflicts: readonly { readonly withSport: string }[] }): string | null {
  if (a.cause === 'INTERFERENCE') {
    const with_ = [...new Set(a.conflicts.map((c) => OTHER_SPORT[c.withSport] ?? ''))].filter(Boolean);
    return `Pas aujourd’hui : trop proche d’une séance ${with_.length > 0 ? with_.join(' et ') : 'd’une autre discipline'} qui sollicite les mêmes zones du corps. Réessayez un autre jour de la semaine.`;
  }
  if (a.cause === 'ACTIVE_PAIN') return 'Indisponible pendant la pause douleur : aucune nouvelle séance tant qu’elle n’est pas levée dans les réglages.';
  if (a.cause === 'OUTSIDE_WEEK') return 'Cette séance appartient à une autre semaine.';
  if (a.cause === 'QUALITY_BLOCKED') return 'Séance non réalisable : prescription incohérente.';
  return null;
}
type InterferenceConflict = { readonly withSport: string; readonly withDate: string; readonly structure: string };
const zonesOf = (conflicts: readonly InterferenceConflict[]): string => [...new Set(conflicts.map((c) => STRUCTURE_LABELS[c.structure] ?? 'mêmes zones du corps'))].join(', ');
/**
 * RC4.5 (lot C) — interférence musculaire NON BLOQUANTE au démarrage : séance(s) voisine(s) et zones, en clair. Le
 * maintien reste un choix explicite de l'athlète (deux boutons) ; les refus de sécurité n'utilisent jamais ce texte.
 */
export function interferenceWarningText(conflicts: readonly InterferenceConflict[], fmt: (date: string) => string): string {
  const near = [...new Set(conflicts.map((c) => `votre séance ${OTHER_SPORT[c.withSport] ?? 'd’une autre discipline'} du ${fmt(c.withDate)}`))].join(' et ');
  return `Cette séance serait proche de ${near}, qui sollicite aussi : ${zonesOf(conflicts)}. Vous pouvez la maintenir quand même (votre choix sera noté) ou choisir un autre jour.`;
}
/** RC4.5 (lot C) — séance maintenue volontairement : jamais présentée comme « bien tolérée ». */
export function maintainedText(conflicts: readonly InterferenceConflict[]): string {
  return `Maintenue à votre demande malgré une interférence musculaire (${zonesOf(conflicts)}). Ce n’est pas un ressenti : seul votre retour de fin de séance indique si elle a été bien tolérée.`;
}
/** M3.1 — séance COMPOSÉE MAIS NON PLACÉE : cause lisible (jamais un code). */
export function unplacedText(v: SessionView): string {
  const cause = v.unplacedCause === 'week_full'
    ? 'votre semaine est déjà complète.'
    : 'aucun jour disponible n’était assez éloigné des séances qui sollicitent les mêmes zones du corps.';
  return `KAIRO n’a pas trouvé de créneau compatible cette semaine : ${cause} La séance reste disponible.`;
}
/**
 * RC3.1 A8 — Cross-training / HYROX : aucune structure retenue. Les essais du moteur (`tried`) disent pourquoi :
 * temps disponible, ou matériel (station / mouvement impossible). Lecture seule de la trace, aucune valeur.
 */
function structureHint(r: NonNullable<NonNullable<SessionView['notPlanned']>['reason']>): string | undefined {
  if (r.code !== 'PLAN.HYROX.H2_NO_STRUCTURE' && r.code !== 'PLAN.CROSSTRAINING.C3_NO_FORMAT') return undefined;
  const tried = Array.isArray(r.params.tried) ? r.params.tried.map(String).join(' ') : '';
  const time = /EXCEEDS_AVAILABLE_TIME|TIME/.test(tried);
  const equipment = /EQUIPMENT|STATIONS_UNFILLED|MOVEMENT/.test(tried);
  if (!time && !equipment) return r.code === 'PLAN.CROSSTRAINING.C3_NO_FORMAT' ? 'Aucun format possible avec votre profil actuel : l’onglet Programme indique les intentions réalisables (« Modifier »).' : undefined;
  if (time && !equipment) return 'Aucun format possible dans le temps disponible ce jour-là : augmentez la durée de ce jour dans vos disponibilités.';
  if (equipment && !time) return 'Aucun format possible avec le matériel déclaré : vérifiez votre lieu d’entraînement.';
  return time && equipment ? 'Aucun format possible avec le temps disponible et le matériel déclarés.' : undefined;
}

export function notPlannedText(v: SessionView): string {
  const np = v.notPlanned;
  const base = NOT_PLANNED_MESSAGES[np?.display ?? np?.category ?? ''] ?? 'Cette séance n’a pas pu être planifiée.';
  const r = np?.reason;
  const hint = r ? REASON_HINTS[`${v.sport}:${r.code}`] ?? REASON_HINTS[r.code] ?? structureHint(r) : undefined;
  return hint ? `${base} ${hint}` : base;
}

/** Messages des refus applicatifs (codes app-core) ; défaut générique sans code. */
export const ERROR_TEXT: Readonly<Record<string, string>> = {
  NO_SPORT_SELECTED: 'Choisissez au moins un sport.',
  SESSION_UNAVAILABLE: 'Cette séance n’est pas disponible.',
  QUALITY_BLOCKED: 'Cette séance n’est pas réalisable : sa prescription est incohérente.',
  SESSION_FINISHED: 'Cette séance est déjà terminée.',
  SESSION_NOT_STARTED: 'Démarrez la séance d’abord.',
  SET_REPS_REQUIRED: 'Indiquez les répétitions réalisées.',
  EXECUTION_STRENGTH_INCOMPLETE: 'Toutes les séries n’ont pas été validées : choisissez « J’ai adapté la séance ».',
  EXECUTION_STRENGTH_SET_UNKNOWN: 'Une série saisie n’appartient pas au bloc de force prévu.',
  SET_UNKNOWN: 'Série inconnue dans cette séance.',
  EQUIPMENT_SWAP_AFTER_SETS: 'Une série de cet exercice est déjà validée : il ne peut plus être remplacé.',
  CHECKIN_INVALID: 'Réponses du contrôle pré-séance illisibles.',
  EXECUTION_RUN_DETAILS_REQUIRED: 'Indiquez la durée réellement courue.',
  EXECUTION_DUPLICATE: 'Cette séance est déjà enregistrée.',
  SAFETY_PAUSE_ACTIVE_PAIN: 'Pause douleur active : planification et nouvelles séances suspendues. Levez la pause dans les réglages quand la douleur a disparu.',
  PROGRAMME_WEEK_NOT_PLANNABLE: 'Cette semaine ne peut pas être planifiée pour le moment.',
  BETA0_SPORT_UNSUPPORTED: 'Seuls la musculation, la course et le Cross-training sont disponibles.',
  CT_DECLARATION_MISSING: 'Cross-training : choisissez une intention, un nombre de séances et indiquez une éventuelle coupure.',
  CT_INTENT_UNKNOWN: 'Cross-training : intention inconnue.',
  CT_PROGRESS_INVALID: 'Valeur de progression invalide.',
  CT_BLOCK_UNKNOWN: 'Bloc inconnu dans cette séance.',
  RUN_DIFFICULTY_INVALID: 'Difficulté ressentie inconnue.',
  FREE_RUN_SAME_DAY_CONFIRM: 'Une course du programme est déjà enregistrée ce jour-là : confirmez qu’il s’agit d’une activité supplémentaire, ou annulez.',
  FREE_RUN_TYPE_INVALID: 'Type de course inconnu.',
  RUN_PLAYER_UNAVAILABLE: 'Cette séance n’a pas d’étapes de course à dérouler.',
  HR_DECLARATION_MISSING: 'HYROX : choisissez un type de séance, un objectif, un nombre de séances et indiquez une éventuelle coupure.',
  HR_ROLE_UNKNOWN: 'HYROX : type de séance inconnu.',
  HR_PROGRESS_INVALID: 'Étape hors de la séance prescrite.',
  HR_RUNTIME_MISSING: 'Séance HYROX non démarrée.',
  HR_SESSION_UNREADABLE: 'Séance HYROX illisible : elle n’est pas reconstruite.',
  HR_LOAD_NOT_PRESCRIBED: 'Aucune charge n’est prescrite pour cette étape.',
  HR_LOAD_INVALID: 'Charge illisible.',
  EXECUTION_HR_PROGRESS_REQUIRED: 'Progression de la séance HYROX manquante.',
  EXECUTION_INVALID: 'Ce résultat ne correspond pas à la séance prévue : vérifiez-le (ou choisissez « J’ai adapté la séance »).',
  RUN_DURATION_REQUIRED: 'Indiquez la durée réellement courue.',
  DUPLICATE_RUN: 'Cette course est déjà enregistrée (une course enregistrée occupe déjà ce moment) : elle n’est jamais comptée deux fois.',
  // RC3.3 — course libre : saisie refusée, rien n'est enregistré.
  DURATION_INVALID: 'Durée invalide : indiquez une durée supérieure à zéro (24 h au plus).',
  DISTANCE_INVALID: 'Distance invalide : indiquez une distance supérieure à zéro.',
  RUN_SPEED_IMPOSSIBLE: 'Distance et durée incompatibles (vitesse impossible) : vérifiez votre saisie.',
  RUN_DATE_INVALID: 'Date ou heure invalide.',
  RUN_IN_FUTURE: 'Cette course se terminerait dans le futur : vérifiez la date, l’heure de départ et la durée.',
  RUN_NOTE_TOO_LONG: 'Commentaire trop long (280 caractères au plus).',
  FREE_RUN_UNKNOWN: 'Cette course n’existe plus ou ne peut pas être modifiée ici (seules les courses libres le sont).',
  BETA_RESET_NOT_CONFIRMED: 'Recréation annulée : confirmation absente. Rien n’a été modifié.',
  BETA_RESET_NOT_ALLOWED: 'Cet outil de test n’est disponible que dans la Beta expérimentale. Rien n’a été modifié.',
  PROGRAMME_MISSING: 'Aucun programme à recréer.',
  MANUAL_START_INTERFERENCE: 'Pas aujourd’hui : cette séance serait trop proche d’une autre séance qui sollicite les mêmes zones du corps.',
  MANUAL_START_OUTSIDE_WEEK: 'Cette séance appartient à une autre semaine : elle ne peut plus être réalisée.',
  FIELD_FEEDBACK_SESSION_NOT_FINISHED: 'Terminez la séance avant de donner votre retour.',
  FIELD_FEEDBACK_ALREADY_RECORDED: 'Votre retour est déjà enregistré pour cette séance.',
  FIELD_FEEDBACK_EMPTY: 'Choisissez au moins une réponse ou écrivez un commentaire.',
  FIELD_FEEDBACK_COMMENT_TOO_LONG: 'Commentaire trop long.',
  FIELD_FEEDBACK_INVALID: 'Réponse invalide.',
  PROGRAMME_SESSION_IN_PROGRESS: 'Une séance est en cours : terminez-la avant de modifier le programme. Rien n’a été modifié.',
};

// ——— P0 — contrôle pré-séance : libellés (choix fermés, aucun diagnostic)

export const AREA_LABELS: Readonly<Record<string, string>> = {
  shoulder: 'Épaule', elbow: 'Coude', wrist_hand: 'Poignet / main', neck: 'Cou', upper_back: 'Haut du dos', lower_back: 'Bas du dos',
  hip_groin: 'Hanche / aine', knee: 'Genou', lower_leg: 'Jambe (mollet, tibia)', ankle_foot: 'Cheville / pied',
};
/** Niveaux P1–P4 : libellés de l'architecture validée (spec moteur 09 §7.2), jamais un diagnostic. */
export const PAIN_LEVEL_LABELS: Readonly<Record<string, string>> = {
  P1: 'Gêne légère', P2: 'Douleur qui gêne certains mouvements', P3: 'Douleur importante',
  P4: 'Signal général inquiétant (pas seulement une zone)',
};
export const FATIGUE_LABELS: Readonly<Record<string, string>> = { low: 'Faible', moderate: 'Modérée', high: 'Élevée', unknown: 'Je ne sais pas' };
export const RECOVERY_LABELS: Readonly<Record<string, string>> = { good: 'Bonne', average: 'Moyenne', poor: 'Mauvaise', unknown: 'Je ne sais pas' };
export const READINESS_LABELS: Readonly<Record<string, string>> = { unknown: 'État du jour inconnu', normal: 'État du jour normal', caution: 'Prudence (fatigue ou récupération)', reduce: 'Allègement' };
const NEED_LABELS: Readonly<Record<string, string>> = {
  push_horizontal: 'poussée horizontale (pectoraux)', push_vertical: 'poussée verticale (épaules)', pull_horizontal: 'tirage horizontal (dos)', pull_vertical: 'tirage vertical (dos)',
  knee_dominant: 'mouvement dominante genou (squat)', hip_dominant: 'mouvement dominante hanche', lunge: 'fente', core: 'gainage',
};

/** RC3.1 A1 — pourquoi l'effort d'un exercice n'est pas ajusté (aucun code affiché). */
const READINESS_REFUSALS: Readonly<Record<string, string>> = {
  load_derived_from_effort: 'sa charge est calculée à partir de l’effort : elle n’est jamais modifiée ici',
  trace_unavailable: 'détail de la prescription indisponible',
  trace_inconsistent: 'prescription différente de la règle du moteur',
  dose_profile_unreadable: 'règle de dosage illisible pour cet exercice',
  effort_floor_reached: 'effort de référence non retrouvable',
  effort_unreadable: 'effort non indiqué',
  readiness_already_applied: 'état déjà pris en compte à la planification',
};

/** Raisons d'une décision du contrôle, en clair (codes inconnus ignorés : jamais de code brut affiché). */
/** Douleurs connues (« zone:niveau ») en clair. */
export function knownPainText(areas: readonly string[]): string {
  return areas.map((x) => { const [a = '', l = ''] = x.split(':'); return `${(AREA_LABELS[a] ?? a).toLowerCase()} (${(PAIN_LEVEL_LABELS[l] ?? l).toLowerCase()})`; }).join(', ');
}

export function checkInReasonsText(reasons: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[]): string[] {
  const s = (v: unknown): string => (typeof v === 'string' ? v : '');
  const out = reasons.flatMap((r) => {
    const p = r.params;
    switch (r.code) {
      case 'SELECT.BLOCKING_NEED': return [`Aucun exercice compatible avec votre état pour : ${NEED_LABELS[s(p.need)] ?? 'un mouvement obligatoire de la séance'}.`];
      case 'SAFETY.PAIN.ZONE_RESTRICTED': return [`${exerciseLabel(s(p.exerciseId))} sollicite la zone ${(AREA_LABELS[s(p.bodyArea)] ?? '').toLowerCase()} : ${p.painLevel === 'P1' ? 'prudence' : 'retiré ou remplacé'}.`];
      case 'SAFETY.PAIN.P4_INTERRUPTED': return ['Signal général : la séance est interrompue par sécurité.'];
      case 'SAFETY.PROGRAM_PAUSED': return ['Les règles de sécurité suspendent la planification (douleur importante ou étendue).'];
      case 'KAIRO.CHECKIN_KNOWN_PAIN_KEPT': return [`Douleur déjà signalée, toujours prise en compte faute de réponse : ${knownPainText(Array.isArray(p.areas) ? p.areas.map(String) : [])}.`];
      case 'KAIRO.CHECKIN_PAIN_ESCALATED': return ['Douleur signalée à plusieurs reprises : elle est traitée avec plus de prudence.'];
      case 'KAIRO.CHECKIN_PERSISTED_ADAPTED': return ['Séance prévue conservée et ajustée à votre douleur : seuls les exercices concernés sont remplacés ou retirés.'];
      case 'KAIRO.CHECKIN_SESSION_RECOMPOSED': return ['Séance recomposée avec votre historique récent : certains changements ne sont pas liés à la douleur déclarée.'];
      // RC3.1 A1 — état du jour appliqué à la séance prévue (effort seulement), refus expliqués exercice par exercice.
      case 'KAIRO.CHECKIN_READINESS_PERSISTED': return [
        `Fatigue ou récupération prise en compte : effort visé allégé sur la séance prévue (mêmes exercices, séries et charges).${Number(p.setsDeltaNotApplied) < 0 ? ' La règle prévoit aussi une série de moins : elle n’est pas appliquée à une séance déjà prévue.' : ''}`,
      ];
      case 'KAIRO.CHECKIN_READINESS_EXERCISE_REFUSED': return [`${exerciseLabel(s(p.exerciseId))} : effort non ajusté (${READINESS_REFUSALS[s(p.cause)] ?? 'ajustement impossible sans modifier la séance'}).`];
      case 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED': if (p.cause === 'readiness_requires_reproducible_session') return ['Fatigue ou récupération enregistrée : l’effort de cette séance n’est pas ajusté automatiquement ; écoutez vos sensations.'];
        if (p.cause === 'readiness_not_applicable_persisted') return ['Fatigue ou récupération enregistrée : aucun exercice de cette séance ne peut être allégé sans changer sa charge ; écoutez vos sensations.'];
        if (p.cause === 'readiness_persisted_session_unavailable' || p.cause === 'readiness_rule_unreadable') return ['Fatigue ou récupération enregistrée : l’effort de cette séance ne peut pas être ajusté automatiquement ; écoutez vos sensations.'];
        if (p.cause === 'session_not_reproducible') return ['État du jour enregistré : la séance prévue est gardée telle quelle (elle ne peut plus être recomposée à l’identique ; aucun ajustement automatique).'];
        return ['État du jour enregistré : cette séance n’est pas ajustée automatiquement (aucune règle d’adaptation pour ce type de séance).'];
      case 'KAIRO.CHECKIN_NO_CHANGE': return ['État du jour pris en compte : aucun changement nécessaire.'];
      // RC4.5 (lot C) — interférence non bloquante maintenue par l'athlète (choix tracé, jamais un ressenti).
      case 'KAIRO.MANUAL_START_INTERFERENCE_ACCEPTED': return [`Séance maintenue à votre demande malgré une interférence musculaire (${zonesOf(Array.isArray(p.conflicts) ? p.conflicts.map((c) => ({ withSport: '', withDate: '', structure: s((c as Record<string, unknown>).structure) })) : [])}).`];
      // RC4.3 (R3) — courses libres faites depuis la planification de la semaine, évaluées au démarrage.
      case 'KAIRO.FREE_RUN_RECOVERY_APPLIED': return ['Course libre récente prise en compte : la séance est allégée pour votre récupération.'];
      case 'KAIRO.FREE_RUN_RECOVERY_NO_CHANGE': return ['Course libre récente prise en compte : aucun changement nécessaire.'];
      case 'KAIRO.FREE_RUN_RECOVERY_REFUSED': return ['Course libre récente : le moteur ne peut pas proposer cette séance aujourd’hui ; elle est reportée.'];
      case 'KAIRO.FREE_RUN_RECOVERY_NOT_APPLIED': return ['Course libre récente enregistrée : cette séance ne peut pas être ajustée automatiquement ; écoutez vos sensations.'];
      default: return [];
    }
  });
  return [...new Set(out)];
}

/** Changements d'une séance adaptée au démarrage, en clair. */
export function adaptationChangesText(changes: readonly string[]): string[] {
  return changes.map((c) => {
    const [kind, ex = '', delta = ''] = c.split(':');
    const [a = '', b = ''] = delta.split('>');
    if (kind === 'removed') return `${exerciseLabel(ex)} retiré`;
    if (kind === 'added') return `${exerciseLabel(ex)} ajouté`;
    if (kind === 'sets') return `${exerciseLabel(ex)} : ${a} → ${b} séries de travail`;
    if (kind === 'rir') return `${exerciseLabel(ex)} : effort plus ${Number(b) > Number(a) ? 'facile' : 'soutenu'} (${a} → ${b} répétitions en réserve)`;
    return '';
  }).filter(Boolean);
}

// ——— P1 — programmation Musculation : libellés (lecture des décisions persistées)

export const MUSCLE_GROUP_LABELS: Readonly<Record<string, string>> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules', arms: 'Bras', quads: 'Quadriceps', hamstrings: 'Ischio-jambiers',
  glutes: 'Fessiers', calves: 'Mollets', core: 'Tronc',
};
export const STRUCTURE_LABELS: Readonly<Record<string, string>> = {
  lower_knee: 'genoux / cuisses', lower_hip: 'hanches / chaîne postérieure', upper_push: 'poussées du haut du corps', upper_pull: 'tirages du haut du corps', grip: 'préhension', trunk: 'tronc', lower_back: 'bas du dos', high_intensity_systemic: 'effort intense (charge générale)',
};
const SPORT_OF_SOURCE: Readonly<Record<string, string>> = { running: 'course', crosstraining: 'Cross-training', hyrox: 'HYROX', strength: 'musculation' };

/** Titre d'une séance avec sa variante (« Full body A ») quand la semaine en compte plusieurs du même type. */
export function sessionTitle(v: { readonly sport: string; readonly archetypeId: string | null; readonly dataError: SessionView['dataError']; readonly strengthVariant?: string | null }): string {
  const name = sessionName(v.sport, v.archetypeId, v.dataError);
  return v.sport === 'strength' && v.strengthVariant ? `${name} ${v.strengthVariant}` : name;
}

/** Raison d'allègement (interférence multisport tracée par Strength), en clair. */
export function reductionText(r: { readonly withSport: string; readonly hours: number; readonly structure: string; readonly action: string }): string {
  const when = r.hours < 0 ? `${SPORT_OF_SOURCE[r.withSport] ?? r.withSport} ${r.hours === -24 ? 'la veille' : `${String(Math.round(-r.hours / 24))} j avant`}` : `${SPORT_OF_SOURCE[r.withSport] ?? r.withSport} ${r.hours === 24 ? 'le lendemain' : `${String(Math.round(r.hours / 24))} j après`}`;
  const what = r.action === 'rir_only' ? 'effort plus facile' : 'moins de séries et effort plus facile';
  return `Allégée (${what}) sur ${STRUCTURE_LABELS[r.structure] ?? r.structure} : ${when}.`;
}

/** Signal de récupération (règle non résolue) en clair. */
export function recoveryText(r: { readonly first: { readonly date: string; readonly kind: string }; readonly second: { readonly date: string; readonly kind: string }; readonly groups: readonly string[]; readonly sameExercises: readonly string[] }): string {
  const k = (x: string) => (x === 'strength' ? 'Musculation' : 'bloc de force Cross-training');
  const groups = r.groups.map((g) => (MUSCLE_GROUP_LABELS[g] ?? g).toLowerCase()).join(', ');
  const same = r.sameExercises.length > 0 ? ` Même exercice deux jours de suite : ${r.sameExercises.map((e) => exerciseLabel(e)).join(', ')}.` : '';
  return `Séances de force rapprochées (${k(r.first.kind)} le ${r.first.date.slice(8)}/${r.first.date.slice(5, 7)}, ${k(r.second.kind)} le ${r.second.date.slice(8)}/${r.second.date.slice(5, 7)}) sollicitant : ${groups || 'les mêmes mouvements'}.${same} KAIRO n’a pas encore de règle validée de récupération entre séances de force : rien n’est déplacé automatiquement.`;
}
