/**
 * Vague R5b — composition hebdomadaire COURSE (RULESET-V0 §R), mono-sport : sur les jours attribués à la course
 * (par le planificateur de l'application), choisit l'archétype de chaque séance. Aucune dose ici : chaque séance
 * reste prescrite (ou refusée) par le pipeline ; la composition n'en consulte que l'issue via une SONDE injectée
 * (le moteur réel), ce qui fait des refus du moteur les seuls critères de repli.
 *
 * Ordre (§R) :
 *   1. nombre de séances ≥ V26, sinon mode MAINTIEN (EASY seulement) ;
 *   2. séances HIGH_DEMAND bornées par V10 (densité glissante) et V11 (jamais deux jours consécutifs), en
 *      comptant le réalisé ET le planifié ;
 *   3. séance KEY selon l'objectif (table §R, préférence) ; le TEST la REMPLACE quand une calibration est demandée
 *      (conflit de références, §F) ou quand la première exposition exige un test récent (D2) ;
 *   4. LONG si l'objectif le justifie (semi, marathon) et si la fréquence le permet (≥ 3), placée avant la KEY ;
 *   5. complément EASY.
 * Phase : aucune périodisation gouvernée en V0 ⇒ ligne de l'OBJECTIF (jamais FOUNDATION / TAPER inventées).
 * Départage déterministe : temps disponible décroissant, puis date croissante.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningContext } from '../context.js';
import type { RunningGoal, RunningMode, RunningSessionArchetype } from '../model.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { detectConflicts } from '../references.js';
import { HIGH_DEMAND_ARCHETYPES } from '../wave3/guards.js';

const V10 = 'running.hi.densityPolicy';
const V11 = 'running.placement.strongDefaultSeparation';
const V26 = 'running.frequency.minimumPlannerRunningFrequency';

/**
 * Table §R « Candidates KEY (ordre de préférence) », ligne de l'objectif. STEADY n'est pas un archétype V1
 * (omis) ; RACE_PACE et STRIDES restent candidats : le moteur les refuse tant qu'ils ne sont pas implémentés.
 */
export const KEY_PREFERENCES: Readonly<Record<RunningGoal, readonly RunningSessionArchetype[]>> = {
  FIVE_K: ['SEVERE', 'SHORT_INTERVAL', 'RACE_PACE', 'THRESHOLD'],
  TEN_K: ['THRESHOLD', 'SEVERE', 'RACE_PACE'],
  HALF_MARATHON: ['THRESHOLD', 'LONG', 'RACE_PACE'],
  MARATHON: ['LONG', 'THRESHOLD'],
  GENERAL_RUNNING: ['EASY', 'STRIDES', 'THRESHOLD'],
};
/** §R étape 4 : objectifs justifiant une sortie longue. */
const LONG_GOALS: readonly RunningGoal[] = ['HALF_MARATHON', 'MARATHON'];
/** §R étape 4 : fréquence minimale pour une sortie longue distincte. */
// technical-constant: seuil documenté de §R étape 4 (« ≥ 3 séances »)
const LONG_MIN_SESSIONS = 3;

// technical-constant: conversion calendaire
const MS_PER_DAY = 86_400_000;
const dayOfDate = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);
const dayOfInstant = (iso: string): number => Math.floor(Date.parse(iso) / MS_PER_DAY);

export interface WeekDay {
  /** Date civile AAAA-MM-JJ. */
  readonly date: string;
  readonly availableS: number;
  /** Séance déjà commencée ou terminée : conservée telle quelle. */
  readonly locked?: RunningSessionArchetype;
}

export interface ProbeResult { readonly ok: boolean; readonly reasons: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[] }
/** Sonde : issue RÉELLE du moteur pour un archétype à une date (pure et déterministe côté appelant). */
export type Probe = (archetype: RunningSessionArchetype, date: string) => ProbeResult;

export type SlotRole = 'KEY' | 'TEST' | 'LONG' | 'EASY' | 'LOCKED';
export interface ComposedSlot { readonly date: string; readonly archetype: RunningSessionArchetype; readonly role: SlotRole }

export interface WeekComposition {
  readonly mode: 'NORMAL' | 'MAINTENANCE';
  readonly slots: readonly ComposedSlot[];
  readonly reasons: readonly ReasonCode[];
}

export interface ComposeInput {
  readonly ctx: RunningContext;
  readonly days: readonly WeekDay[];
  readonly parameters: readonly RunningParameter[];
  readonly mode: RunningMode;
  readonly probe: Probe;
}

const isHd = (a: RunningSessionArchetype): boolean => HIGH_DEMAND_ARCHETYPES.includes(a);
const needsTest = (r: ProbeResult): boolean => r.reasons.some((x) => x.code === RUNNING_CODES.FIRST_EXPOSURE_REFUSED && x.params.cause === 'RECENT_TEST_REQUIRED');

export function composeRunningWeek(i: ComposeInput): WeekComposition {
  const reasons: ReasonCode[] = [];
  const days = [...i.days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const slots = new Map<string, ComposedSlot>();
  for (const d of days) if (d.locked !== undefined) slots.set(d.date, { date: d.date, archetype: d.locked, role: 'LOCKED' });
  const easyRest = (mode: WeekComposition['mode']): WeekComposition => {
    for (const d of days) if (!slots.has(d.date)) slots.set(d.date, { date: d.date, archetype: 'EASY', role: 'EASY' });
    return { mode, slots: days.map((d) => slots.get(d.date)).filter((s): s is ComposedSlot => s !== undefined), reasons };
  };

  // 1. Fréquence minimale (V26) : sinon mode MAINTIEN (aucune séance à forte demande).
  const v26 = resolveParameter(i.parameters, V26, i.mode);
  reasons.push(...v26.reasons);
  const minimum = v26.status === 'resolved' ? (v26.value as { sessionsPerWeek?: unknown }).sessionsPerWeek : undefined;
  if (typeof minimum !== 'number' || days.length < minimum) {
    reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_MAINTENANCE_MODE, { sessions: days.length, cause: typeof minimum === 'number' ? 'BELOW_MINIMUM_FREQUENCY' : 'V26_UNRESOLVED' }));
    return easyRest('MAINTENANCE');
  }

  // 2. Bornes HIGH_DEMAND : V10 (fenêtre glissante, par niveau) et V11 (jamais deux jours consécutifs).
  const density = resolveParameter(i.parameters, V10, i.mode);
  const sep = resolveParameter(i.parameters, V11, i.mode);
  reasons.push(...density.reasons, ...sep.reasons);
  const dv = density.status === 'resolved' ? density.value as Record<string, unknown> : undefined;
  const perDays = dv?.perDays;
  const cap = dv?.[i.ctx.population.level];
  const separated = sep.status === 'resolved' && (sep.value as { default?: unknown }).default === 'NO_CONSECUTIVE_HIGH_DEMAND_DAYS';
  if (typeof perDays !== 'number' || !(perDays > 0) || typeof cap !== 'number' || !(cap >= 0) || !separated) {
    reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_MAINTENANCE_MODE, { sessions: days.length, cause: 'HIGH_DEMAND_RULES_UNRESOLVED' }));
    return easyRest('MAINTENANCE');
  }
  const realizedHd = i.ctx.sessionHistory.filter((s) => isHd(s.archetype) && s.completion !== 'SKIPPED').map((s) => dayOfInstant(s.completedAt));
  const plannedHd = (): number[] => [...slots.values()].filter((s) => isHd(s.archetype)).map((s) => dayOfDate(s.date));
  const hdAllowed = (date: string): boolean => {
    const d = dayOfDate(date);
    const all = [...realizedHd.filter((x) => x <= d), ...plannedHd()];
    if (all.some((x) => Math.abs(x - d) <= 1)) return false;
    return all.filter((x) => Math.abs(x - d) < perDays).length + 1 <= cap;
  };
  const free = (): WeekDay[] => days.filter((d) => !slots.has(d.date)).sort((a, b) => b.availableS - a.availableS || (a.date < b.date ? -1 : 1));

  /** Place un archétype sur le meilleur jour libre admissible ; renvoie aussi les refus observés. */
  const place = (a: RunningSessionArchetype, role: SlotRole): { placed: boolean; testRequired: boolean } => {
    let testRequired = false;
    for (const d of free()) {
      if (isHd(a) && !hdAllowed(d.date)) continue;
      const r = i.probe(a, d.date);
      if (r.ok) { slots.set(d.date, { date: d.date, archetype: a, role }); return { placed: true, testRequired }; }
      testRequired ||= needsTest(r);
    }
    return { placed: false, testRequired };
  };

  const goal = i.ctx.goal.type;
  const longWanted = LONG_GOALS.includes(goal) && days.length >= LONG_MIN_SESSIONS;
  // 4 (avant 3). LONG d'abord : c'est la séance la plus longue ; la KEY du marathon EST la sortie longue.
  if (longWanted) {
    const role: SlotRole = KEY_PREFERENCES[goal][0] === 'LONG' ? 'KEY' : 'LONG';
    const r = place('LONG', role);
    reasons.push(r.placed
      ? runningReasons.emit(RUNNING_CODES.WEEK_SLOT_SELECTED, { archetype: 'LONG', role, date: [...slots.values()].find((s) => s.archetype === 'LONG')?.date ?? '' })
      : runningReasons.emit(RUNNING_CODES.WEEK_LONG_NOT_PLACED, { cause: 'NO_ADMISSIBLE_DAY' }));
  } else if (LONG_GOALS.includes(goal)) {
    reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_LONG_NOT_PLACED, { cause: 'FREQUENCY_BELOW_THREE' }));
  }

  // 3. KEY (si la sortie longue n'est pas déjà la KEY) ; TEST en remplacement quand une calibration est demandée.
  const keyTaken = [...slots.values()].some((s) => s.role === 'KEY');
  if (!keyTaken) {
    const conflict = detectConflicts(i.ctx.references).length > 0;
    let done = false;
    if (conflict) {
      const t = place('TEST', 'TEST');
      reasons.push(runningReasons.emit(t.placed ? RUNNING_CODES.WEEK_TEST_REPLACES_KEY : RUNNING_CODES.WEEK_KEY_FALLBACK, t.placed ? { cause: 'REFERENCE_CONFLICT' } : { archetype: 'TEST', cause: 'NO_ADMISSIBLE_DAY' }));
      done = t.placed;
    }
    for (const a of KEY_PREFERENCES[goal].filter((x) => x !== 'LONG' || !longWanted)) {
      if (done) break;
      if (a === 'LONG' && days.length < LONG_MIN_SESSIONS) continue;
      const r = place(a, 'KEY');
      if (r.placed) { reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_SLOT_SELECTED, { archetype: a, role: 'KEY', date: [...slots.values()].find((s) => s.role === 'KEY')?.date ?? '' })); done = true; break; }
      if (r.testRequired) {
        const t = place('TEST', 'TEST');
        if (t.placed) { reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_TEST_REPLACES_KEY, { cause: `FIRST_EXPOSURE:${a}` })); done = true; break; }
      }
      reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_KEY_FALLBACK, { archetype: a, cause: r.testRequired ? 'RECENT_TEST_REQUIRED' : 'ENGINE_REFUSED_OR_NO_ADMISSIBLE_DAY' }));
    }
    if (!done) reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_KEY_FALLBACK, { archetype: 'NONE', cause: 'NO_KEY_SESSION' }));
  }

  // 5. Complément EASY.
  return easyRest('NORMAL');
}
