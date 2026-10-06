/**
 * HYROX (`hybrid_race`) — vocabulaire et contrats du domaine. Aucune valeur de compétition ni d'entraînement
 * n'est écrite ici :
 * - les STATIONS sont des données du catalogue (`Exercise.hybridRaceStation`, gouvernance G5) ;
 * - les distances, répétitions, charges et durées viennent de paramètres GOUVERNÉS du ruleset (`hybrid_race.*`) ;
 * - les règles officielles d'épreuve (table par division) relèveraient d'un paramètre sourcé distinct, non utilisé
 *   en H1 : une donnée de compétition n'est jamais une dose d'entraînement par défaut.
 */
import { z } from 'zod';
import { DEMAND_LEVELS, DISCIPLINES, LEVELS, PAIN_LEVELS, isISODateTime } from '@hybridsport/domain';
import type { ContextParse } from '@hybridsport/engine';
import { zHyroxStationExecution } from './execution.js';
import { createCoreRegistry } from '@hybridsport/engine';
import { HR_H2_ROLES, HR_STRUCTURES } from './h2/taxonomy.js';

/** Archétype technique de H1 : UNE station, une dose gouvernée, sans course (le segment couru relève de la suite). */
export const HR_H1_ARCHETYPE = 'hybrid_race.h1_station';

export const HR_MODES = ['CANDIDATE', 'PRODUCTION'] as const;
export type HrMode = (typeof HR_MODES)[number];
/** États de reprise DÉCLARÉS (jamais déduits). */
export const HR_RETURN_STATES = ['NONE', 'SHORT', 'MODERATE', 'LONG', 'UNKNOWN'] as const;

/** Objectifs HYROX du programme (vocabulaire du Programme Engine). */
export const HR_GOALS = ['RACE_PREPARATION', 'GENERAL'] as const;
const instant = z.string().refine(isISODateTime, 'instant ISO attendu');

/**
 * H2 — exposition à une séance HYROX composée (réalisée ou PRÉVUE) : rôle, structure, mouvements dans l'ordre prescrit.
 * Les stations sont dérivées des mouvements par le catalogue (le planificateur ne connaît aucune station).
 */
export const zH2Exposure = z.object({
  sessionId: z.string().min(1),
  at: instant,
  role: z.enum(HR_H2_ROLES),
  structure: z.enum(HR_STRUCTURES),
  exercises: z.array(z.string().min(1)).min(1),
}).strict();
export type H2Exposure = z.infer<typeof zH2Exposure>;
/** H2 — séance composée RÉALISÉE : exposition + statuts DÉCLARÉS (aucun seuil, aucune progression). */
export const zH2Realized = zH2Exposure.extend({
  completion: z.enum(['completed_as_prescribed', 'completed', 'abandoned']),
  pain: z.enum(['NONE', 'REPORTED', ...PAIN_LEVELS]).optional(),
  tolerance: z.enum(['tolerated', 'poorly_tolerated']).optional(),
}).strict();
export type H2Realized = z.infer<typeof zH2Realized>;

/** Contexte propre à HYROX, validé à la frontière (strict, fail-closed : aucune valeur par défaut). */
export const zHyroxContext = z.object({
  population: z.object({ level: z.enum(LEVELS), hybrid: z.boolean() }).strict(),
  mode: z.enum(HR_MODES),
  returnState: z.object({ state: z.enum(HR_RETURN_STATES) }).strict(),
  /**
   * Station demandée par l'intention utilisateur / programme (identifiant de station du catalogue), transmise telle
   * quelle par le planificateur. Ni le moteur ni le planificateur ne la choisissent (aucune règle de choix gouvernée) :
   * absente ⇒ refus explicite STATION_NOT_REQUESTED.
   */
  requestedStation: z.string().min(1).optional(),
  /**
   * Stations RÉALISÉES (contrat de réalisation H1), transportées et validées à la frontière. H1 ne les exploite pas
   * encore pour prescrire (aucune progression gouvernée) : absent ⇒ historique vide.
   */
  sessionHistory: z.array(zHyroxStationExecution).default([]),
  /**
   * H2 — objectif DÉCLARÉ du programme. Un temps cible peut exister : il est TRACÉ, jamais interprété (aucun modèle
   * temps cible → dose gouverné). Absent ⇒ objectif inconnu (tracé).
   */
  goal: z.object({ type: z.enum(HR_GOALS), targetTimeS: z.number().positive().optional() }).strict().optional(),
  /** H2 — séances composées RÉALISÉES (mémoire : variété, retour négatif). */
  compositionHistory: z.array(zH2Realized).optional(),
  /** H2 — séances HYROX PRÉVUES de la semaine, transportées par le planificateur (variété seulement). */
  plannedSessions: z.array(zH2Exposure).optional(),
  /** H2 — voisines d'autres disciplines (profil de demande CORE), transportées ; interprétées seulement si gouvernées. */
  neighbours: z.object({
    known: z.boolean(),
    items: z.array(z.object({ discipline: z.enum(DISCIPLINES), hoursFromThisSession: z.number(), demand: z.record(z.string(), z.enum(DEMAND_LEVELS)) }).strict()),
  }).strict().optional(),
  /** H2 — ordre de priorité DÉCLARÉ des sports (transporté ; aucune politique d'interférence gouvernée). */
  sportPriority: z.object({ order: z.array(z.enum(DISCIPLINES)).min(1) }).strict().optional(),
}).strict();
export type HyroxContext = z.infer<typeof zHyroxContext>;
export type HyroxContextInput = z.input<typeof zHyroxContext>;

const core = createCoreRegistry();
export function parseHyroxContext(raw: unknown): ContextParse<HyroxContext> {
  const parsed = zHyroxContext.safeParse(raw);
  if (parsed.success) return { ok: true, context: parsed.data };
  return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `disciplineContext.${i.path.join('.')}`, problem: i.message })) };
}
