/**
 * RunningContext : UNIQUEMENT les concepts approuvés en phase 5 et propres à la course, absents de
 * SportEngineInput (l'intention, les contraintes, l'état CORE et l'historique d'empreintes sont déjà
 * transmis par le CORE). Validé à la frontière par `parseRunningContext` (schéma strict, fail-closed).
 */
import { z } from 'zod';
import { isISODateTime } from '@hybridsport/domain';
import type { ReasonCode } from '@hybridsport/domain';
import { createCoreRegistry } from '@hybridsport/engine';
import type { ContextParse } from '@hybridsport/engine';
import { RETURN_STATES, RUNNING_GOALS, RUNNING_LEVELS, RUNNING_MODES, RUNNING_SESSION_ARCHETYPES } from './model.js';
import { zRunningReference } from './references.js';
import { zWeekObservation, RECENT_LOAD_DIMENSIONS } from './recent-load.js';
import { CAPABILITY_IDS } from './capability-definitions.js';
import { RUNNING_CODES, runningReasons } from './codes.js';

const core = createCoreRegistry();
const instant = z.string().refine(isISODateTime, 'instant ISO attendu');

export const zRunningContext = z.object({
  population: z.object({ level: z.enum(RUNNING_LEVELS), hybrid: z.boolean() }).strict(),
  goal: z.object({
    type: z.enum(RUNNING_GOALS),
    targetDate: instant.optional(),
    /** L'utilisateur exige un plan propre à l'objectif (sinon une programmation générale explicite est acceptable). */
    strict: z.boolean().default(false),
  }).strict(),
  /** État de reprise FOURNI (frontières V24 non signées : jamais déduit ici) ; UNKNOWN n'est jamais NONE. */
  returnState: z.object({ state: z.enum(RETURN_STATES), postReturnSessions: z.number().int().nonnegative() }).strict(),
  references: z.array(zRunningReference).default([]),
  /** Expositions passées par archétype (première exposition = aucune entrée). */
  exposures: z.array(z.object({ archetype: z.enum(RUNNING_SESSION_ARCHETYPES), lastAt: instant, count: z.number().int().positive() }).strict()).default([]),
  recentLoad: z.object({
    returnStartedAt: instant.optional(),
    dimensions: z.array(z.object({ dimension: z.enum(RECENT_LOAD_DIMENSIONS), weeks: z.array(zWeekObservation) }).strict()),
  }).strict().optional(),
  sensors: z.object({ wearable: z.boolean(), heartRate: z.boolean() }).strict(),
  mode: z.enum(RUNNING_MODES),
  /** Capacités demandées (drapeaux) : leur état effectif est TOUJOURS dérivé de la gouvernance. */
  capabilityRequests: z.array(z.enum(CAPABILITY_IDS)).default([]),
}).strict();
export type RunningContext = z.infer<typeof zRunningContext>;
export type RunningContextInput = z.input<typeof zRunningContext>;

/**
 * Validation stricte. Une population ou un objectif inconnus reçoivent leur code propre
 * (POPULATION_UNSUPPORTED, GOAL_UNSUPPORTED) ; toute autre anomalie est TECHNICAL.SCHEMA_INVALID.
 */
export function parseRunningContext(raw: unknown): ContextParse<RunningContext> {
  const specific: ReasonCode[] = [];
  if (raw !== null && typeof raw === 'object') {
    const pop = (raw as { population?: { level?: unknown } }).population?.level;
    if (pop !== undefined && !(RUNNING_LEVELS as readonly unknown[]).includes(pop)) specific.push(runningReasons.emit(RUNNING_CODES.POPULATION_UNSUPPORTED, { population: String(pop) }));
    const goal = (raw as { goal?: { type?: unknown } }).goal?.type;
    if (goal !== undefined && !(RUNNING_GOALS as readonly unknown[]).includes(goal)) specific.push(runningReasons.emit(RUNNING_CODES.GOAL_UNSUPPORTED, { goal: String(goal) }));
  }
  const parsed = zRunningContext.safeParse(raw);
  if (parsed.success) return { ok: true, context: parsed.data };
  const issues = parsed.error.issues
    .filter((i) => !(i.path[0] === 'population' && i.path[1] === 'level' && specific.length > 0) && !(i.path[0] === 'goal' && i.path[1] === 'type' && specific.length > 0))
    .map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `disciplineContext.${i.path.join('.')}`, problem: i.message }));
  return { ok: false, reasons: [...specific, ...issues] };
}
