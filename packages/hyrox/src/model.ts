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
  /** Station demandée par le planificateur (identifiant de station du catalogue) : le moteur ne la choisit pas. */
  requestedStation: z.string().min(1),
}).strict();
export type HyroxContext = z.infer<typeof zHyroxContext>;
export type HyroxContextInput = z.input<typeof zHyroxContext>;

const core = createCoreRegistry();
export function parseHyroxContext(raw: unknown): ContextParse<HyroxContext> {
  const parsed = zHyroxContext.safeParse(raw);
  if (parsed.success) return { ok: true, context: parsed.data };
  return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `disciplineContext.${i.path.join('.')}`, problem: i.message })) };
}
