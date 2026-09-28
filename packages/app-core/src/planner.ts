/**
 * Planificateur hebdomadaire KAIRO V0 — MINIMAL et STRUCTUREL (décision utilisateur 2026-09-28).
 *
 * FILTRES (durs, jamais contournés) :
 *   P1 sport activé ET moteur existant (Strength, Running) ; Cross-training / HYROX : aucun moteur ⇒ jamais placés ;
 *   P2 jour déclaré disponible (minutes > 0) ;
 *   P3 au plus UNE séance par jour (pas de double séance : règle I3 non gouvernée) ;
 *   P4 archétype compatible : durée minimale, niveaux et objectifs LUS dans le ruleset (aucune valeur ajoutée) ;
 *   P5 séance commencée ou terminée : conservée à sa date (jamais replanifiée, jamais dupliquée).
 * CRITÈRES DE SÉLECTION (départage, jamais des filtres) : priorité des sports déclarée par l'utilisateur
 * (tour de rôle), puis espacement maximal entre séances, puis jour le plus tôt. Déterministe.
 *
 * NON GOUVERNÉ ⇒ NON APPLIQUÉ, SIGNALÉ : durée de récupération minimale et interférences (table I1–I8
 * `provisional`) — deux jours consécutifs sont signalés, jamais bloqués ni « corrigés » par un coefficient.
 */
import type { ISODateTime } from '@hybridsport/domain';
import { findArchetype, readStrengthParams } from '@hybridsport/strength';
import { addDays, weekdayIndex } from './dates.js';
import type { EngineSport, PlanEntry, PlanNotice, Profile, Sport, StrengthGoal, WeekPlan } from './model.js';
import { ENGINE_SPORTS } from './model.js';
import { strengthContent } from './provisional-content.js';

/** Seul archétype Strength utilisé en V0 : le choix du split (haut / bas du corps) n'est pas gouverné. */
export const STRENGTH_ARCHETYPE = 'str_full_body';
/** Stimulus de l'intention selon l'objectif (spec strength 02 l.64 : le stimulus porte l'orientation force / hypertrophie / générale ; choix du planificateur). */
export const STIMULUS_BY_GOAL: Readonly<Record<StrengthGoal, string>> = { strength: 'strength_heavy', hypertrophy: 'strength_volume', general: 'strength_general' };
/** Archétype Running PROVISOIRE du planificateur : l'archétype réel de chaque jour est choisi par la composition du moteur Course (§R). */
export const RUNNING_ARCHETYPE = 'running.easy';

export const PLANNER_RULES = ['P1_SPORT_ENGINE', 'P2_DAY_AVAILABLE', 'P3_ONE_PER_DAY', 'P4_ARCHETYPE_FITS', 'P5_LOCKED_KEPT'] as const;
export const UNGOVERNED_PLANNER_RULES = ['RECOVERY_MIN_GAP', 'INTERFERENCE_I1_I8', 'DOUBLE_SESSIONS', 'PERIODIZATION', 'STRENGTH_SPLIT'] as const;

// technical-constant: conversion minutes → secondes
const S_PER_MIN = 60;

interface SportDemand { readonly sport: EngineSport; readonly archetypeId: string; readonly count: number; readonly fits: (minutes: number) => boolean; readonly blocked?: string }

function strengthDemand(p: Profile): SportDemand {
  const params = readStrengthParams(strengthContent().ruleset).values;
  const a = findArchetype(params, STRENGTH_ARCHETYPE);
  const base = { sport: 'strength' as const, archetypeId: STRENGTH_ARCHETYPE, count: p.strength.sessionsPerWeek };
  if (!a) return { ...base, fits: () => false, blocked: 'ARCHETYPE_MISSING' };
  if (!a.levels.includes(p.level)) return { ...base, fits: () => false, blocked: 'LEVEL_NOT_SUPPORTED' };
  if (!a.goals.includes(p.strength.goal)) return { ...base, fits: () => false, blocked: 'GOAL_NOT_SUPPORTED' };
  return { ...base, fits: (m) => m * S_PER_MIN >= a.duration.min };
}

function runningDemand(p: Profile): SportDemand {
  // Aucune durée minimale gouvernée pour EASY : la faisabilité (dose ancrée ≤ temps disponible) est jugée par le moteur.
  return { sport: 'running', archetypeId: RUNNING_ARCHETYPE, count: p.running.sessionsPerWeek, fits: (m) => m > 0 };
}

export const entryKey = (date: string, sport: EngineSport): string => `${date}:${sport}`;

export interface PlanInput {
  readonly profile: Profile;
  readonly weekStart: string;
  /** Séances déjà commencées ou terminées de la semaine : conservées telles quelles (P5). */
  readonly locked: readonly PlanEntry[];
  readonly plannedAt: ISODateTime;
}

export function planWeek(input: PlanInput): WeekPlan {
  const { profile: p, weekStart } = input;
  const notices: PlanNotice[] = [];
  const unplaced: WeekPlan['unplaced'] = [];
  const days = Array.from({ length: p.availability.length }, (_, i) => addDays(weekStart, i));
  const minutesOf = (date: string): number => p.availability[weekdayIndex(date)] ?? 0;
  const taken = new Map<string, PlanEntry>(input.locked.map((e) => [e.date, e]));

  const enabled = (s: Sport): boolean => p[s].enabled;
  const ordered = [...p.priorities.filter(enabled), ...(['strength', 'running', 'crosstraining', 'hyrox'] as const).filter((s) => enabled(s) && !p.priorities.includes(s))];
  for (const s of ordered) if (!(ENGINE_SPORTS as readonly string[]).includes(s)) notices.push({ code: 'PLAN.ENGINE_UNAVAILABLE', params: { sport: s } });

  const demands = ordered.flatMap((s): SportDemand[] => (s === 'strength' ? [strengthDemand(p)] : s === 'running' ? [runningDemand(p)] : []));
  const remaining = new Map(demands.map((d) => [d.sport, Math.max(0, d.count - input.locked.filter((e) => e.sport === d.sport).length)]));
  for (const d of demands) if (d.blocked) { unplaced.push({ sport: d.sport, count: d.count, reason: d.blocked }); remaining.set(d.sport, 0); }

  // Tour de rôle selon la priorité déclarée ; chaque séance va sur le jour libre compatible le plus éloigné des séances déjà placées.
  let progress = true;
  while (progress) {
    progress = false;
    for (const d of demands) {
      if ((remaining.get(d.sport) ?? 0) === 0) continue;
      const free = days.filter((day) => !taken.has(day) && minutesOf(day) > 0 && d.fits(minutesOf(day)));
      if (free.length === 0) continue;
      const placed = [...taken.keys()].map((x) => days.indexOf(x)).filter((i) => i >= 0);
      const gap = (day: string): number => (placed.length === 0 ? 0 : Math.min(...placed.map((i) => Math.abs(i - days.indexOf(day)))));
      const best = free.reduce((a, b) => (gap(b) > gap(a) ? b : a));
      taken.set(best, { key: entryKey(best, d.sport), date: best, sport: d.sport, archetypeId: d.archetypeId, availableMinutes: minutesOf(best) });
      remaining.set(d.sport, (remaining.get(d.sport) ?? 0) - 1);
      progress = true;
    }
  }
  for (const d of demands) {
    const left = remaining.get(d.sport) ?? 0;
    if (left > 0) unplaced.push({ sport: d.sport, count: left, reason: days.some((day) => minutesOf(day) > 0 && d.fits(minutesOf(day))) ? 'NOT_ENOUGH_DAYS' : 'NO_DAY_LONG_ENOUGH' });
  }

  const entries = [...taken.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const cur = entries[i];
    if (prev && cur && days.indexOf(cur.date) - days.indexOf(prev.date) === 1) {
      notices.push({ code: 'PLAN.RECOVERY_RULE_UNGOVERNED', params: { from: prev.date, to: cur.date } });
    }
  }
  return { weekStart, entries, unplaced, notices, plannedAt: input.plannedAt, dropped: [] };
}
