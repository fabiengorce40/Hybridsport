/**
 * HYROX (`hybrid_race`) — vocabulaire et contrats du domaine. Aucune valeur de compétition ni d'entraînement
 * n'est écrite ici :
 * - les STATIONS sont des données du catalogue (`Exercise.hybridRaceStation`, gouvernance G5) ;
 * - les distances, répétitions, charges et durées viennent de paramètres GOUVERNÉS du ruleset (`hybrid_race.*`) ;
 * - les règles officielles d'épreuve (table par division) relèveraient d'un paramètre sourcé distinct, non utilisé
 *   en H1 : une donnée de compétition n'est jamais une dose d'entraînement par défaut.
 */
import { z } from 'zod';
import { LEVELS } from '@hybridsport/domain';
import type { ContextParse } from '@hybridsport/engine';
import { zHyroxStationExecution } from './execution.js';
import { createCoreRegistry } from '@hybridsport/engine';

/** Archétype technique de H1 : UNE station, une dose gouvernée, sans course (le segment couru relève de la suite). */
export const HR_H1_ARCHETYPE = 'hybrid_race.h1_station';

export const HR_MODES = ['CANDIDATE', 'PRODUCTION'] as const;
export type HrMode = (typeof HR_MODES)[number];
/** États de reprise DÉCLARÉS (jamais déduits). */
export const HR_RETURN_STATES = ['NONE', 'SHORT', 'MODERATE', 'LONG', 'UNKNOWN'] as const;

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
}).strict();
export type HyroxContext = z.infer<typeof zHyroxContext>;
export type HyroxContextInput = z.input<typeof zHyroxContext>;

const core = createCoreRegistry();
export function parseHyroxContext(raw: unknown): ContextParse<HyroxContext> {
  const parsed = zHyroxContext.safeParse(raw);
  if (parsed.success) return { ok: true, context: parsed.data };
  return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `disciplineContext.${i.path.join('.')}`, problem: i.message })) };
}
