/**
 * Composition hebdomadaire STRENGTH (S1) : Strength est propriétaire de l'ARCHÉTYPE de chacune de ses séances de la
 * semaine. Le programme déclare l'objectif, la fréquence et le cadre d'intention (stimulus, objectif, phase) ; le
 * planificateur place les jours ; ce module choisit l'archétype de chaque jour placé, ou refuse (fail-closed).
 *
 * Aucune règle de split n'existe dans le ruleset Strength (P6 : « le moteur n'impose aucune fréquence »). La seule
 * règle disponible est une CANDIDATE, tirée MOT POUR MOT de la spec Strength 02 §5.1–5.2 (brouillon, non approuvée) :
 *   - « Full body : indispensable de 1 à 3 séances par semaine » (A1) ;
 *   - « À 4 séances, haut / bas ×2 couvre le même besoin, avec une fréquence de 2 par groupe » (§5.1).
 * Au-delà (5 séances et plus), la spec renvoie à des archétypes hors V1 (push / pull) : AUCUNE composition (refus).
 * Une règle candidate n'est jamais résolue en PRODUCTION. Aucun nombre sportif n'est inventé ici.
 *
 * Ordre d'une rotation à plusieurs archétypes (haut / bas) : alternance dans l'ordre des dates (la spec dit « ×2 »,
 * sans ordre) ; la PREMIÈRE séance est l'archétype qui porte le besoin le plus prioritaire de l'objectif (table
 * gouvernée `strength.goals.needPriority`). Un jour trop court pour l'archétype attribué (durée minimale de
 * l'archétype, donnée du ruleset) est échangé avec un jour de l'autre archétype si l'échange rend les deux faisables ;
 * sinon l'attribution reste et le moteur refusera la séance, raisons à l'appui.
 */
import type { Level, ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { LoadedCatalog } from '@hybridsport/engine';
import type { StrengthParams } from './params.js';
import type { StrengthGoalRef } from './context.js';
import type { Env } from './model.js';
import { findArchetype, goalKey } from './archetypes.js';
import { plannedHardSets } from './volume.js';
import { strengthReasons } from './codes.js';

export type CompositionMode = 'CANDIDATE' | 'PRODUCTION';

/** Bande de fréquence de la règle : séances par semaine (bornes incluses) → rotation d'archétypes. */
export interface CompositionBand { readonly minSessions: number; readonly maxSessions: number; readonly rotation: readonly string[]; readonly source: string }
export interface StrengthCompositionRule {
  readonly id: string;
  readonly version: string;
  readonly status: 'candidate' | 'approved';
  readonly source: string;
  readonly bands: readonly CompositionBand[];
}

/**
 * Règle CANDIDATE (Beta 0 seulement) : bandes de la spec Strength 02, recopiées sans interprétation. Jamais approuvée ;
 * à remplacer par une règle gouvernée (revue experte) avant toute production.
 */
export const STRENGTH_WEEKLY_COMPOSITION_CANDIDATE: StrengthCompositionRule = {
  id: 'strength.rules.weeklyComposition', version: '0.1.0-candidate', status: 'candidate',
  source: 'docs/strength-spec/02-archetypes-slots.md §5.1–5.2 (brouillon)',
  bands: [
    // technical-constant: CANDIDATE — spec Strength 02 §5.2 A1, « 1 à 3 séances par semaine » (citation, non approuvée)
    { minSessions: 1, maxSessions: 3, rotation: ['str_full_body'], source: 'spec 02 §5.2 A1' },
    // technical-constant: CANDIDATE — spec Strength 02 §5.1, « À 4 séances, haut / bas ×2 » (citation, non approuvée)
    { minSessions: 4, maxSessions: 4, rotation: ['str_upper', 'str_lower'], source: 'spec 02 §5.1' },
  ],
};

export interface StrengthCompositionDay {
  readonly date: string;
  readonly availableS: number;
  /** Intention imposée par le programme (ex. évaluation) : conservée, hors rotation. */
  readonly lockedArchetypeId?: string;
}

export interface StrengthComposeInput {
  readonly params: StrengthParams;
  readonly rule: StrengthCompositionRule | undefined;
  readonly mode: CompositionMode;
  readonly goal: StrengthGoalRef;
  readonly level: Level;
  /** Fréquence DÉCLARÉE par le programme (séances Strength de la semaine). */
  readonly weeklySessions: number;
  /** Jours placés pour Strength (vide : contrôle de gouvernance seulement). */
  readonly days: readonly StrengthCompositionDay[];
}

export interface StrengthComposedSlot { readonly date: string; readonly archetypeId: string; readonly toleranceProfile: string; readonly role: 'ROTATION' | 'LOCKED' }
export type StrengthComposeResult =
  | { readonly status: 'composed'; readonly authority: 'approved' | 'provisional'; readonly rotation: readonly string[]; readonly slots: readonly StrengthComposedSlot[]; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'unresolved'; readonly reasons: readonly ReasonCode[] };

const ungoverned = (i: StrengthComposeInput, cause: string): StrengthComposeResult => ({
  status: 'unresolved',
  reasons: [strengthReasons.emit('RULE.WEEK_COMPOSITION_UNGOVERNED', { sessions: i.weeklySessions, goal: goalKey(i.goal), cause })],
});

/** Composition de la semaine Strength (pure, déterministe). */
export function composeStrengthWeek(i: StrengthComposeInput): StrengthComposeResult {
  const rule = i.rule;
  if (!rule) return ungoverned(i, 'rule_absent');
  if (rule.status !== 'approved' && i.mode === 'PRODUCTION') return ungoverned(i, 'rule_not_approved');
  const band = rule.bands.find((b) => i.weeklySessions >= b.minSessions && i.weeklySessions <= b.maxSessions);
  if (!band) return ungoverned(i, 'frequency_not_covered');
  const gk = goalKey(i.goal);
  const archetypes = band.rotation.map((id) => findArchetype(i.params, id));
  for (const [k, a] of archetypes.entries()) {
    const id = band.rotation[k] ?? '';
    if (!a || a.status === 'deprecated') return ungoverned(i, `archetype_unavailable:${id}`);
    if (!a.goals.includes(gk)) return ungoverned(i, `goal_not_admitted:${id}`);
    if (!a.levels.includes(i.level)) return ungoverned(i, `level_not_admitted:${id}`);
  }
  // Première séance de la rotation : l'archétype qui porte le besoin le plus prioritaire de l'objectif (donnée gouvernée).
  const priority = i.params['strength.goals'][gk]?.needPriority ?? [];
  const rank = (id: string): number => {
    const a = findArchetype(i.params, id);
    const needs = (a?.slots ?? []).filter((s) => s.status === 'required').map((s) => s.need);
    const ranks = needs.map((n) => (priority.includes(n) ? priority.indexOf(n) : priority.length));
    return ranks.length === 0 ? priority.length : Math.min(...ranks);
  };
  const rotation = [...band.rotation].sort((x, y) => rank(x) - rank(y) || band.rotation.indexOf(x) - band.rotation.indexOf(y));
  const authority = rule.status === 'approved' ? 'approved' : 'provisional';
  const free = [...i.days].filter((d) => d.lockedArchetypeId === undefined).sort((a, b) => (a.date < b.date ? -1 : 1));
  const assigned = free.map((d, k) => rotation[k % rotation.length] as string);
  // Faisabilité de durée (donnée de l'archétype) : échange avec un jour de l'autre archétype si les deux deviennent faisables.
  const fits = (k: number, id: string): boolean => (free[k]?.availableS ?? 0) >= (findArchetype(i.params, id)?.duration.min ?? 0);
  const swaps: string[] = [];
  for (let k = 0; k < free.length; k++) {
    const a = assigned[k] as string;
    if (fits(k, a)) continue;
    const j = assigned.findIndex((b, m) => m !== k && b !== a && fits(m, a) && fits(k, b));
    if (j < 0) continue;
    assigned[k] = assigned[j] as string;
    assigned[j] = a;
    swaps.push(`${free[k]?.date ?? ''}↔${free[j]?.date ?? ''}`);
  }
  const slots: StrengthComposedSlot[] = [
    ...free.map((d, k) => {
      const id = assigned[k] as string;
      return { date: d.date, archetypeId: id, toleranceProfile: findArchetype(i.params, id)?.toleranceProfile ?? '', role: 'ROTATION' as const };
    }),
    ...i.days.filter((d) => d.lockedArchetypeId !== undefined).map((d) => {
      const id = d.lockedArchetypeId as string;
      return { date: d.date, archetypeId: id, toleranceProfile: findArchetype(i.params, id)?.toleranceProfile ?? '', role: 'LOCKED' as const };
    }),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    status: 'composed', authority, rotation, slots,
    reasons: [strengthReasons.emit('PLAN.WEEK_COMPOSITION', {
      rule: rule.id, version: rule.version, status: rule.status, band: band.source, sessions: i.weeklySessions, rotation, firstBy: priority[0] ?? 'none', swaps,
    })],
  };
}

/**
 * Séries difficiles PRÉVUES par groupe musculaire d'une séance déjà générée (règle E1 du moteur : primaire = 1,
 * secondaire = poids du ruleset ; montées et séries facultatives exclues). Sert au contexte de semaine
 * (`week.otherStrengthSessions`) : une séance PRÉVUE n'est jamais présentée comme réalisée (`done: false`).
 */
export function sessionPlannedHardSets(session: SessionDraft, params: StrengthParams, catalog: LoadedCatalog): Record<string, number> {
  const env = { params } as unknown as Env;
  const items = session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items).flatMap((it) => {
    const exercise = catalog.exercise(it.exerciseId);
    if (!exercise) return [];
    const workingSets = it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup' && x.optional !== true).length : 0;
    return [{ exercise, workingSets }];
  });
  return plannedHardSets(items, env);
}
