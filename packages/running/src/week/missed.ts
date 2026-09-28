/**
 * Vague R5b — séances manquées (RULESET-V0 §W). Pur et déterministe ; aucune compensation de volume
 * (`MAKE_UP_VOLUME` n'existe pas).
 *   - EASY manquée ⇒ DROP ;
 *   - LONG, THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS, TEST manquée ⇒ MOVE vers un jour libre conforme
 *     (V10, V11, temps disponible jugé par le moteur via la sonde), sinon DROP ;
 *     « REPLACE par une EASY plus longue dans la bande habituelle » n'est PAS appliqué : aucune bande
 *     habituelle gouvernée pour allonger une EASY (jamais une dose inventée) ⇒ DROP tracé ;
 *   - plusieurs séances manquées dans la semaine ⇒ REPLAN_WEEK tracé (la progression reste en HOLD : D1 exige
 *     des séances consécutives tolérées) ;
 *   - séance partielle : REDUCE (considérée faite avec la dose réalisée) — gérée par l'historique réalisé.
 * Zone gelée (§W, 24 h) : un déplacement vise au plus tôt le SURLENDEMAIN (décision d'implémentation prudente :
 * le lendemain commence dans les 24 h).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningContext } from '../context.js';
import type { RunningMode, RunningSessionArchetype } from '../model.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { HIGH_DEMAND_ARCHETYPES } from '../wave3/guards.js';
import type { Probe } from './compose.js';

const V10 = 'running.hi.densityPolicy';
const V11 = 'running.placement.strongDefaultSeparation';
// technical-constant: conversion calendaire
const MS_PER_DAY = 86_400_000;
// technical-constant: zone gelée §W (24 h) ⇒ premier jour admissible = surlendemain
const FROZEN_DAYS = 2;
const dayOfDate = (date: string): number => Math.floor(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);
const dayOfInstant = (iso: string): number => Math.floor(Date.parse(iso) / MS_PER_DAY);
const isHd = (a: RunningSessionArchetype): boolean => HIGH_DEMAND_ARCHETYPES.includes(a);

export interface MissedSession { readonly date: string; readonly archetype: RunningSessionArchetype }
export interface PlannedRun { readonly date: string; readonly archetype: RunningSessionArchetype }
export interface FreeDay { readonly date: string; readonly availableS: number }

export type MissedDecision =
  | { readonly date: string; readonly archetype: RunningSessionArchetype; readonly decision: 'DROP'; readonly code: string }
  | { readonly date: string; readonly archetype: RunningSessionArchetype; readonly decision: 'MOVE'; readonly to: string; readonly code: string };

export interface MissedInput {
  readonly ctx: RunningContext;
  readonly today: string;
  readonly missed: readonly MissedSession[];
  /** Séances de course encore planifiées (non manquées). */
  readonly planned: readonly PlannedRun[];
  /** Jours libres de la semaine (aucune séance, toutes disciplines), avec leur temps disponible. */
  readonly freeDays: readonly FreeDay[];
  readonly parameters: readonly RunningParameter[];
  readonly mode: RunningMode;
  readonly probe: Probe;
}

export function replanMissed(i: MissedInput): { readonly decisions: readonly MissedDecision[]; readonly reasons: readonly ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  const decisions: MissedDecision[] = [];
  const density = resolveParameter(i.parameters, V10, i.mode);
  const sep = resolveParameter(i.parameters, V11, i.mode);
  reasons.push(...density.reasons, ...sep.reasons);
  const dv = density.status === 'resolved' ? density.value as Record<string, unknown> : undefined;
  const perDays = dv?.perDays;
  const cap = dv?.[i.ctx.population.level];
  const rulesOk = typeof perDays === 'number' && perDays > 0 && typeof cap === 'number' && cap >= 0
    && sep.status === 'resolved' && (sep.value as { default?: unknown }).default === 'NO_CONSECUTIVE_HIGH_DEMAND_DAYS';
  const realizedHd = i.ctx.sessionHistory.filter((s) => isHd(s.archetype) && s.completion !== 'SKIPPED').map((s) => dayOfInstant(s.completedAt));
  const planned = [...i.planned];
  const used = new Set<string>();
  const earliest = dayOfDate(i.today) + FROZEN_DAYS;
  const admissible = (date: string): boolean => {
    if (!rulesOk) return false;
    const d = dayOfDate(date);
    // Une séance planifiée déjà réalisée figure aussi dans l'historique : même jour ⇒ même séance, comptée une fois.
    const all = [...realizedHd.filter((x) => x <= d), ...planned.filter((p) => isHd(p.archetype)).map((p) => dayOfDate(p.date)).filter((x) => !realizedHd.includes(x))];
    if (all.some((x) => Math.abs(x - d) <= 1)) return false;
    return all.filter((x) => Math.abs(x - d) < perDays).length + 1 <= cap;
  };

  const ordered = [...i.missed].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.archetype < b.archetype ? -1 : 1));
  for (const m of ordered) {
    if (m.archetype === 'EASY' || m.archetype === 'STRIDES') {
      decisions.push({ ...m, decision: 'DROP', code: 'REPLAN.DROP_EASY' });
      continue;
    }
    const target = [...i.freeDays]
      .filter((f) => !used.has(f.date) && dayOfDate(f.date) >= earliest && f.availableS > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .find((f) => (!isHd(m.archetype) || admissible(f.date)) && i.probe(m.archetype, f.date).ok);
    if (target) {
      used.add(target.date);
      planned.push({ date: target.date, archetype: m.archetype });
      decisions.push({ ...m, decision: 'MOVE', to: target.date, code: m.archetype === 'LONG' ? 'REPLAN.MOVE_LONG' : 'REPLAN.MOVE_KEY' });
    } else {
      decisions.push({ ...m, decision: 'DROP', code: m.archetype === 'LONG' ? 'REPLAN.DROP_LONG' : 'REPLAN.DROP_NO_VALID_SLOT' });
    }
  }
  for (const d of decisions) {
    reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_MISSED_DECISION, { archetype: d.archetype, date: d.date, decision: d.decision, code: d.code, to: d.decision === 'MOVE' ? d.to : '' }));
  }
  if (i.missed.length > 1) reasons.push(runningReasons.emit(RUNNING_CODES.WEEK_REPLANNED, { missed: i.missed.length, progression: 'HOLD_LOW_ADHERENCE' }));
  return { decisions, reasons };
}
