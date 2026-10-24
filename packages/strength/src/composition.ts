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
export interface CompositionBand {
  readonly minSessions: number; readonly maxSessions: number; readonly rotation: readonly string[]; readonly source: string;
  /**
   * RC5.1 — rotation PROPRE à un objectif (clé `goalKey`), sinon `rotation`. Une rotation de plus de deux archétypes
   * (Haut A → Bas A → Haut B → Bas B) garde son ordre CYCLIQUE ; seul son point de départ suit la priorité de l'objectif.
   */
  readonly rotationByGoal?: Readonly<Record<string, readonly string[]>>;
  /**
   * RC5.1 — ordre A/B ALTERNÉ d'une semaine calendaire à l'autre (parité de la semaine du lundi) pour les rotations de
   * plus de deux archétypes : une même variante n'est pas systématiquement placée le même jour (jour contraint par une
   * autre discipline). Déterministe : fonction de la seule date, identique après redémarrage et à chaque replanification.
   */
  readonly alternateWeekly?: boolean;
}
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
  id: 'strength.rules.weeklyComposition', version: '0.2.0-candidate', status: 'candidate',
  source: 'docs/strength-spec/02-archetypes-slots.md §5.1–5.2 (brouillon) ; RC5.1 (docs/kairo/RC5.1-HAUT-BAS-AB-ETUDE.md, variante C, objectif hypertrophie)',
  bands: [
    // technical-constant: CANDIDATE — spec Strength 02 §5.2 A1, « 1 à 3 séances par semaine » (citation, non approuvée)
    { minSessions: 1, maxSessions: 3, rotation: ['str_full_body'], source: 'spec 02 §5.2 A1' },
    // RC5.1 — hypertrophie : Haut A → Bas A → Haut B → Bas B (décision produit) ; force et forme générale : inchangées.
    // technical-constant: CANDIDATE — spec Strength 02 §5.1, « À 4 séances, haut / bas ×2 » (citation, non approuvée)
    { minSessions: 4, maxSessions: 4, rotation: ['str_upper', 'str_lower'], rotationByGoal: { hypertrophy: ['str_upper_a', 'str_lower_a', 'str_upper_b', 'str_lower_b'] }, alternateWeekly: true, source: 'spec 02 §5.1 ; RC5.1' },
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

// technical-constant: conversion calendaire (millisecondes par jour)
const MS_PER_DAY = 86_400_000;
// technical-constant: conversion calendaire (jours par semaine)
const DAYS_PER_WEEK = 7;
// technical-constant: 1970-01-01 est un jeudi : décalage vers le lundi de la semaine (calendrier ISO)
const EPOCH_THURSDAY_OFFSET = 3;
/** Parité de la semaine calendaire (lundi) des jours composés ; aucun jour ⇒ 0. Fonction de la seule date. */
function weekParity(days: readonly StrengthCompositionDay[]): 0 | 1 {
  const first = [...days].map((d) => d.date).sort()[0];
  if (first === undefined) return 0;
  const week = Math.floor((Math.floor(Date.parse(`${first}T00:00:00Z`) / MS_PER_DAY) + EPOCH_THURSDAY_OFFSET) / DAYS_PER_WEEK);
  // technical-constant: parité calendaire (semaines paires / impaires)
  return week % 2 === 0 ? 0 : 1;
}

/** Composition de la semaine Strength (pure, déterministe). */
export function composeStrengthWeek(i: StrengthComposeInput): StrengthComposeResult {
  const rule = i.rule;
  if (!rule) return ungoverned(i, 'rule_absent');
  if (rule.status !== 'approved' && i.mode === 'PRODUCTION') return ungoverned(i, 'rule_not_approved');
  const band = rule.bands.find((b) => i.weeklySessions >= b.minSessions && i.weeklySessions <= b.maxSessions);
  if (!band) return ungoverned(i, 'frequency_not_covered');
  const gk = goalKey(i.goal);
  // RC5.1 — rotation propre à l'objectif seulement si TOUS ses archétypes existent dans le contenu, admettent l'objectif
  // et le niveau (contenu versionné : un contenu antérieur garde la rotation commune, jamais un refus de la semaine).
  const admitted = (id: string): boolean => { const a = findArchetype(i.params, id); return a !== undefined && a.status !== 'deprecated' && a.goals.includes(gk) && a.levels.includes(i.level); };
  const own = band.rotationByGoal?.[gk];
  const base = own !== undefined && own.every(admitted) ? own : band.rotation;
  const archetypes = base.map((id) => findArchetype(i.params, id));
  for (const [k, a] of archetypes.entries()) {
    const id = base[k] ?? '';
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
  const byPriority = [...base].sort((x, y) => rank(x) - rank(y) || base.indexOf(x) - base.indexOf(y));
  // RC5.1 — rotation de plus de deux archétypes : ordre cyclique conservé à partir du premier par priorité, décalé d'une
  // demi-rotation les semaines impaires (`alternateWeekly`). Deux archétypes ou moins : ordre antérieur (priorité).
  // technical-constant: structure — une rotation de deux archétypes n'a pas d'ordre cyclique distinct
  const cyclic = base.length > 2;
  // technical-constant: structure — demi-rotation (moitié de la liste des archétypes)
  const start = cyclic ? (base.indexOf(byPriority[0] as string) + (band.alternateWeekly === true && weekParity(i.days) === 1 ? base.length / 2 : 0)) % base.length : 0;
  const rotation = cyclic ? [...base.slice(start), ...base.slice(0, start)] : byPriority;
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
      ...(cyclic ? { weekOrder: start === base.indexOf(byPriority[0] as string) ? 'A' : 'B' } : {}),
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
