/**
 * Programme Engine — contrats longitudinaux. Le programme décide de la STRUCTURE (objectifs, horizon, priorités,
 * intentions hebdomadaires, décisions maintenir / progresser / régresser / réévaluer) ; il ne choisit ni exercice,
 * ni séance, ni mouvement, ni dose : il fournit des intentions au planificateur global.
 *
 * Aucune valeur par défaut : horizon, composition, intentions, priorité et variantes sont DÉCLARÉS.
 */
import { z } from 'zod';
import { CT_GOALS, INTENT_FIELDS, PLANNER_SPORTS, REQUEST_CATEGORIES, RUNNING_GOALS } from '@hybridsport/planner';

export const PROGRAMME_SCHEMA_VERSION = 1;
export type ProgrammeSport = (typeof PLANNER_SPORTS)[number];

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');
const instant = z.string().min(1);
const sport = z.enum(PLANNER_SPORTS);
// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;

export const zReason = z.object({ code: z.string(), params: z.record(z.string(), z.unknown()).default({}) }).strict();
export type ProgrammeReason = z.infer<typeof zReason>;

/**
 * Objectifs : vocabulaires EXISTANTS des moteurs (Running, Cross-training, ré-exportés par le planificateur) ; Strength :
 * objectifs principaux du contrat de contexte Strength (`goal.primary`, hors « support ») ; HYROX : vocabulaire minimal
 * (aucun objectif n'existait). Un objectif n'entraîne AUCUNE progression numérique : il est transmis au moteur.
 */
export const STRENGTH_PROGRAMME_GOALS = ['strength', 'hypertrophy', 'general'] as const;
export const HYROX_PROGRAMME_GOALS = ['RACE_PREPARATION', 'GENERAL'] as const;
const goalId = z.string().min(1);
export const zProgrammeGoal = z.discriminatedUnion('sport', [
  z.object({ goalId, sport: z.literal('strength'), goal: z.enum(STRENGTH_PROGRAMME_GOALS) }).strict(),
  z.object({ goalId, sport: z.literal('running'), goal: z.enum(RUNNING_GOALS), targetDate: date.optional() }).strict(),
  z.object({ goalId, sport: z.literal('crosstraining'), goal: z.enum(CT_GOALS) }).strict(),
  z.object({ goalId, sport: z.literal('hyrox'), goal: z.enum(HYROX_PROGRAMME_GOALS), targetDate: date.optional() }).strict(),
]);
export type ProgrammeGoal = z.infer<typeof zProgrammeGoal>;

type IntentShape<T> = { [K in (typeof INTENT_FIELDS)[number]]: T };
export const zFullIntent = z.object(Object.fromEntries(INTENT_FIELDS.map((k) => [k, z.string().min(1)])) as IntentShape<z.ZodString>).strict();
export const zPartialIntent = z.object(Object.fromEntries(INTENT_FIELDS.map((k) => [k, z.string().min(1).optional()])) as IntentShape<z.ZodOptional<z.ZodString>>).strict();
export type FullIntent = z.infer<typeof zFullIntent>;
/** Intention de programme d'un sport : complète (`declared`) ou sans archétype (`engine` : le moteur compose). */
export type ProgrammeIntent = z.infer<typeof zPartialIntent>;
/**
 * Composition hebdomadaire : `declared` ⇒ intention exécutée telle quelle ; `engine` ⇒ le MOTEUR du sport choisit
 * l'archétype de chaque séance (via le planificateur) ; le programme ne déclare que le cadre (stimulus, objectif,
 * phase, tolérance) et le nombre de séances.
 */
export const COMPOSITIONS = ['declared', 'engine'] as const;

export const DECISIONS = ['HOLD', 'PROGRESS', 'REGRESS', 'REASSESS', 'BLOCKED'] as const;
export type ProgrammeDecisionKind = (typeof DECISIONS)[number];

/** Plan hebdomadaire DÉCLARÉ d'un sport : composition, intention, station HYROX, variantes et évaluation déclarées. */
export const zSportPlan = z.object({
  sport,
  sessionsPerWeek: z.number().int().positive().max(DAYS_PER_WEEK),
  composition: z.enum(COMPOSITIONS).default('declared'),
  intent: zPartialIntent,
  station: z.string().min(1).optional(),
  /** Déclarations propres au moteur (contrat de contexte), transmises telles quelles. */
  declarations: z.record(z.string(), z.unknown()).default({}),
  /** Intention appliquée après PROGRESS / REGRESS, si le programme en DÉCLARE une (sinon intention inchangée). */
  variants: z.object({ PROGRESS: zPartialIntent.optional(), REGRESS: zPartialIntent.optional() }).strict().default({}),
  /** Évaluation déclarée pour ce sport (intention de séance du moteur) ; absente ⇒ contenu d'évaluation indisponible. */
  assessment: z.object({ kind: z.string().min(1), intent: zFullIntent }).strict().optional(),
  /**
   * M3.1 — plan à ROTATION (« équilibré ») : le PROGRAMME choisit l'archétype de chaque séance parmi les candidates
   * gouvernées (`programme.rotation.*`) pour l'objectif `goal`, d'après l'historique ; le moteur compose chacune.
   * L'intention ne déclare alors pas d'archétype. Absent : intention déclarée telle quelle (comportement inchangé).
   */
  rotation: z.object({ kind: z.literal('balanced'), goal: z.string().min(1) }).strict().optional(),
}).strict().superRefine((p, ctx) => {
  if (p.rotation && p.composition !== 'declared') ctx.addIssue({ code: 'custom', path: ['rotation'], message: 'rotation : composition déclarée exigée' });
  for (const f of INTENT_FIELDS) {
    const engineOwned = (p.composition === 'engine' || p.rotation !== undefined) && f === 'archetypeId';
    if (engineOwned && p.intent[f] !== undefined) ctx.addIssue({ code: 'custom', path: ['intent', f], message: 'composition par le moteur : archétype non déclaré' });
    if (!engineOwned && p.intent[f] === undefined) ctx.addIssue({ code: 'custom', path: ['intent', f], message: 'champ d’intention requis' });
    if (engineOwned && (p.variants.PROGRESS?.[f] !== undefined || p.variants.REGRESS?.[f] !== undefined)) ctx.addIssue({ code: 'custom', path: ['variants'], message: 'composition par le moteur : variante sans archétype' });
  }
});
export type SportPlan = z.infer<typeof zSportPlan>;

export const zProgrammeDefinition = z.object({
  programmeId: z.string().min(1),
  origin: z.string().min(1),
  /** Lundi de la semaine 1. */
  startWeek: date,
  /**
   * Fin DÉCLARÉE du programme (semaines depuis `startWeek`), facultative : typiquement la semaine d'un objectif daté.
   * Absente ⇒ programme CONTINU, sans date de fin. Dans les deux cas les séances restent glissantes : seule la semaine
   * courante (ou l'avance gouvernée `programme.planning.horizonWeeks`) est planifiable, jamais l'horizon entier.
   */
  horizonWeeks: z.number().int().positive().optional(),
  goals: z.array(zProgrammeGoal).min(1),
  /** Priorité EXPLICITE des sports (ordre), transmise au planificateur. Aucun score. */
  priorities: z.array(sport),
  sports: z.array(zSportPlan).min(1),
  /** Phases DÉCLARÉES (facultatives) : aucune phase n'est inférée. */
  phases: z.array(z.object({ label: z.string().min(1), fromWeek: z.number().int().nonnegative(), toWeek: z.number().int().nonnegative() }).strict()).default([]),
}).strict().superRefine((d, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  const sports = d.sports.map((s) => s.sport);
  if (new Set(sports).size !== sports.length) issue(['sports'], 'un sport au plus une fois');
  if (d.priorities.length !== sports.length || !sports.every((s) => d.priorities.includes(s))) issue(['priorities'], 'la priorité doit ordonner exactement les sports du programme');
  if (new Set(d.goals.map((g) => g.goalId)).size !== d.goals.length) issue(['goals'], 'goalId en double');
  d.goals.forEach((g, i) => {
    if (!sports.includes(g.sport)) issue(['goals', i, 'sport'], 'objectif d’un sport absent du programme');
    if ('targetDate' in g && g.targetDate !== undefined && g.targetDate < d.startWeek) issue(['goals', i, 'targetDate'], 'date cible antérieure au début du programme');
  });
  d.phases.forEach((p, i) => {
    if (p.fromWeek > p.toWeek || (d.horizonWeeks !== undefined && p.toWeek >= d.horizonWeeks)) issue(['phases', i], 'phase hors horizon ou inversée');
    if (d.phases.some((q, j) => j !== i && q.fromWeek <= p.toWeek && p.fromWeek <= q.toWeek)) issue(['phases', i], 'phases chevauchantes');
  });
});
export type ProgrammeDefinition = z.infer<typeof zProgrammeDefinition>;
export type ProgrammeDefinitionInput = z.input<typeof zProgrammeDefinition>;

/** Réalisation déclarée (ou dérivée « manquée ») d'une séance planifiée. */
export const COMPLETIONS = ['completed_as_prescribed', 'modified', 'abandoned', 'missed'] as const;
export type Completion = (typeof COMPLETIONS)[number];
export const zProgrammeResult = z.object({
  requestId: z.string().min(1),
  weekIndex: z.number().int().nonnegative(),
  sport,
  date,
  completion: z.enum(COMPLETIONS),
  pain: z.boolean(),
  /**
   * declared : saisi par l'utilisateur ; derived_missed : aucune réalisation après la date de la séance ;
   * manual_from_unplaced (M3.1) : séance COMPOSÉE MAIS NON PLACÉE réalisée à l'initiative de l'utilisateur — `date` est
   * le jour RÉEL de la réalisation, jamais un placement réécrit.
   */
  provenance: z.enum(['declared', 'derived_missed', 'manual_from_unplaced']),
  recordedAt: instant,
  /** Forme historique (non écrite depuis F1) : conservée en lecture pour les états existants. */
  measured: z.object({ kind: z.string().min(1), values: z.record(z.string(), z.number()) }).strict().optional(),
  /**
   * Preuve RÉFÉRENCÉE (jamais interprétée) : historique du moteur qui détient le détail (séries, course, séance CT,
   * station HYROX) et identifiant d'occurrence ; `measurement` si une mesure exploitable a été produite (ex. référence
   * TIME_TRIAL d'un TEST). Le programme n'en lit que l'existence.
   */
  evidence: z.object({ history: sport, ref: z.string().min(1), measurement: z.string().min(1).optional() }).strict().optional(),
}).strict();
export type ProgrammeResult = z.infer<typeof zProgrammeResult>;

export const ASSESSMENT_STATUSES = ['requested', 'scheduled', 'content_unavailable', 'not_planned', 'completed', 'result_missing'] as const;
export const zAssessment = z.object({
  assessmentId: z.string().min(1),
  sport,
  kind: z.string().min(1),
  requestedAtWeek: z.number().int().nonnegative(),
  scheduledWeek: z.number().int().nonnegative().optional(),
  requestId: z.string().optional(),
  status: z.enum(ASSESSMENT_STATUSES),
  reasons: z.array(zReason),
}).strict();
export type Assessment = z.infer<typeof zAssessment>;

/** Mesure DESCRIPTIVE (faits comptés, aucun seuil). */
export const zAdherence = z.object({
  requested: z.number().int().nonnegative(),
  planned: z.number().int().nonnegative(),
  notPlanned: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  completedAsPrescribed: z.number().int().nonnegative(),
  modified: z.number().int().nonnegative(),
  abandoned: z.number().int().nonnegative(),
  missed: z.number().int().nonnegative(),
  painReported: z.number().int().nonnegative(),
  /** M3.1 — séances non placées réalisées manuellement (réalisées ou modifiées), comptées à part (champ additif). */
  completedFromUnplaced: z.number().int().nonnegative().optional(),
}).strict();
export type Adherence = z.infer<typeof zAdherence>;

export const zDecision = z.object({
  decisionId: z.string().min(1),
  weekIndex: z.number().int().nonnegative(),
  sport,
  decision: z.enum(DECISIONS),
  /** Politique utilisée (identifiant, version, statut de revue) ; null ⇒ aucune politique ⇒ BLOCKED. */
  policy: z.object({ id: z.string(), version: z.string(), status: z.string() }).strict().nullable(),
  rule: z.number().int().nonnegative().nullable(),
  facts: z.object({ adherence: zAdherence, assessment: z.enum(['none', ...ASSESSMENT_STATUSES]) }).strict(),
  /** Résultats utilisés (références). */
  results: z.array(z.string()),
  reasons: z.array(zReason),
}).strict();
export type ProgrammeDecision = z.infer<typeof zDecision>;

/** Intention de semaine transmise au planificateur (forme de ses demandes). */
export const zWeekDemand = z.object({
  sport, sessions: z.number().int().positive(), intent: zPartialIntent, station: z.string().optional(),
  composition: z.enum(COMPOSITIONS).default('declared'),
  overrides: z.array(z.object({ index: z.number().int().positive(), intent: zFullIntent }).strict()).default([]),
}).strict();
export const zProgrammeWeekIntent = z.object({
  weekIndex: z.number().int().nonnegative(),
  weekStart: date,
  phase: z.string().nullable(),
  demands: z.array(zWeekDemand),
  /** Évaluations programmées cette semaine (identifiants). */
  assessments: z.array(z.string()),
}).strict();
export type ProgrammeWeekIntent = z.infer<typeof zProgrammeWeekIntent>;

export const zProgrammeWeek = z.object({
  weekIndex: z.number().int().nonnegative(),
  weekStart: date,
  intent: zProgrammeWeekIntent,
  plannedAt: instant,
  /** Référence de la semaine planifiée persistée par l'application (clé), jamais recopiée. */
  plannerRef: date,
  /** Résumé minimal nécessaire à l'adhérence (statut et catégorie de chaque demande). */
  requests: z.array(z.object({
    requestId: z.string(), sport, status: z.enum(['planned', 'refused', 'unplaced']), category: z.enum(REQUEST_CATEGORIES), date: date.optional(),
    /** M3.1 — demande non placée dont le moteur a composé une prescription valide (réalisable manuellement). */
    composedUnplaced: z.literal(true).optional(),
    /** Intention RÉELLEMENT utilisée par le planificateur (déclarée, surchargée ou composée par le moteur). */
    intent: zFullIntent.optional(),
    /** Composition du moteur appliquée : autorité de sa règle et rôle de la séance. */
    composition: z.object({ authority: z.enum(['approved', 'provisional']), role: z.string().min(1) }).strict().optional(),
  }).strict()),
  closedAt: instant.optional(),
  adherence: z.object({ total: zAdherence, bySport: z.record(z.string(), zAdherence) }).strict().optional(),
}).strict();
export type ProgrammeWeek = z.infer<typeof zProgrammeWeek>;

export const zProgrammeState = z.object({
  schemaVersion: z.literal(PROGRAMME_SCHEMA_VERSION),
  definition: zProgrammeDefinition,
  createdAt: instant,
  /** Intention COURANTE par sport (départ : intention déclarée ; modifiée seulement par une variante déclarée). */
  current: z.array(z.object({ sport, intent: zPartialIntent }).strict()),
  weeks: z.array(zProgrammeWeek),
  results: z.array(zProgrammeResult),
  assessments: z.array(zAssessment),
  decisions: z.array(zDecision),
  audit: z.array(z.object({ at: instant, weekIndex: z.number().int().nonnegative().nullable(), reason: zReason }).strict()),
}).strict();
export type ProgrammeState = z.infer<typeof zProgrammeState>;

export const WEEK_STATUSES = ['closed', 'planned', 'plannable', 'awaiting_results', 'projected', 'past_unplanned'] as const;
export type WeekStatus = (typeof WEEK_STATUSES)[number];
