/**
 * Semaine COURSE dans l'application : le planificateur de KAIRO attribue des JOURS à la course ; le MOTEUR COURSE
 * choisit l'archétype de chaque jour (composition §R) et décide des séances manquées (§W). La sonde de faisabilité
 * est la génération RÉELLE (moteur Course via le CORE), jamais une règle de l'application.
 */
import type { ISODateTime } from '@hybridsport/domain';
import { ARCHETYPE_INTENT_IDS, archetypeFromIntentId, composeRunningWeek, isV1Archetype, parseRunningContext, replanMissed, withProductDecisions, CURRENT_RUNNING_GOVERNANCE } from '@hybridsport/running';
import type { Probe, RunningSessionArchetype } from '@hybridsport/running';
import { addDays, weekdayIndex } from './dates.js';
import { generateSession, runningContext } from './generate.js';
import type { AppState, PlanEntry, PlanNotice, WeekPlan } from './model.js';
import { entryKey } from './planner.js';

// technical-constant: conversion minutes → secondes
const S_PER_MIN = 60;
// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;
const RUNNING_PARAMETERS = withProductDecisions(CURRENT_RUNNING_GOVERNANCE).parameters;

const archetypeOf = (id: string): RunningSessionArchetype => {
  const a = archetypeFromIntentId(id);
  return a !== undefined && isV1Archetype(a) ? a : 'EASY';
};

/** Sonde : la séance serait-elle générée (moteur réel, CORE) à cette date, avec ce temps disponible ? */
function probeFor(state: AppState, minutesOf: (date: string) => number, generatedAt: ISODateTime): Probe {
  return (a, date) => {
    const minutes = minutesOf(date);
    if (!(minutes > 0)) return { ok: false, reasons: [] };
    const entry: PlanEntry = { key: entryKey(date, 'running'), date, sport: 'running', archetypeId: ARCHETYPE_INTENT_IDS[a], availableMinutes: minutes };
    const g = generateSession({ state, entry, generatedAt });
    return g.outcome.status === 'ok' ? { ok: true, reasons: [] } : { ok: false, reasons: g.outcome.reasons.map((r) => ({ code: r.code, params: r.params })) };
  };
}

const toNotice = (r: { code: string; params: Readonly<Record<string, unknown>> }): PlanNotice => ({
  code: r.code,
  params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'number' ? v : Array.isArray(v) ? v.join(',') : String(v)])),
});

/**
 * Composition §R des jours de course RESTANTS (date ≥ aujourd'hui) d'un planning ; les séances commencées ou
 * terminées sont conservées et comptent (V10, V11, séance clé déjà faite) ; les jours passés non commencés
 * relèvent de §W. La fréquence hebdomadaire (V26, §R 4) reste celle du planning complet.
 */
export function composeRunningDays(state: AppState, plan: WeekPlan, generatedAt: ISODateTime, today: string): WeekPlan {
  const p = state.profile;
  const runs = plan.entries.filter((e) => e.sport === 'running');
  if (!p || runs.length === 0) return { ...plan, runningRevision: state.revision };
  const days = runs.filter((e) => state.logs[e.key] !== undefined || e.date >= today);
  const lastDay = addDays(plan.weekStart, DAYS_PER_WEEK - 1);
  const parsed = parseRunningContext(runningContext(state, p, { date: lastDay > today ? lastDay : today }));
  if (!parsed.ok || days.length === 0) return { ...plan, runningRevision: state.revision };
  const minutesOf = (date: string): number => plan.entries.find((e) => e.date === date && e.sport === 'running')?.availableMinutes ?? 0;
  const c = composeRunningWeek({
    ctx: parsed.context, parameters: RUNNING_PARAMETERS, mode: 'CANDIDATE', probe: probeFor(state, minutesOf, generatedAt), weeklySessions: runs.length,
    days: days.map((e) => ({ date: e.date, availableS: e.availableMinutes * S_PER_MIN, ...(state.logs[e.key] ? { locked: archetypeOf(e.archetypeId) } : {}) })),
  });
  const bySlot = new Map(c.slots.map((s) => [s.date, s]));
  const entries = plan.entries.map((e) => {
    const s = e.sport === 'running' ? bySlot.get(e.date) : undefined;
    return s && s.role !== 'LOCKED' ? { ...e, archetypeId: ARCHETYPE_INTENT_IDS[s.archetype], role: s.role } : e;
  });
  // Avis de composition : seulement ceux de la DERNIÈRE composition (jamais d'empilement à chaque révision).
  const kept = plan.notices.filter((n) => !COMPOSITION_CODES.has(n.code));
  return { ...plan, entries, runningRevision: state.revision, notices: [...kept, ...c.reasons.filter((r) => COMPOSITION_CODES.has(r.code)).map(toNotice)] };
}

const COMPOSITION_CODES = new Set(['PLAN.RUNNING.WEEK_MAINTENANCE_MODE', 'PLAN.RUNNING.WEEK_SLOT_SELECTED', 'PLAN.RUNNING.WEEK_LONG_NOT_PLACED', 'PLAN.RUNNING.WEEK_TEST_REPLACES_KEY', 'PLAN.RUNNING.WEEK_KEY_FALLBACK']);

/**
 * §W : séances de course planifiées, passées, jamais commencées ⇒ décision du moteur (DROP / MOVE). Idempotent :
 * une séance traitée quitte le planning (déplacée ou abandonnée, tracée dans `dropped` et les avis).
 */
export function applyMissedRuns(state: AppState, weekStart: string, today: string, generatedAt: ISODateTime): AppState {
  const p = state.profile;
  const plan = state.plans[weekStart];
  if (!p || !plan) return state;
  const missed = plan.entries.filter((e) => e.sport === 'running' && e.date < today && state.logs[e.key] === undefined);
  if (missed.length === 0) return state;
  const parsed = parseRunningContext(runningContext(state, p, { date: today }));
  if (!parsed.ok) return state;
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, i) => addDays(weekStart, i));
  const minutesOf = (date: string): number => p.availability[weekdayIndex(date)] ?? 0;
  const taken = new Set(plan.entries.map((e) => e.date));
  const r = replanMissed({
    ctx: parsed.context, today, parameters: RUNNING_PARAMETERS, mode: 'CANDIDATE', probe: probeFor(state, minutesOf, generatedAt),
    missed: missed.map((e) => ({ date: e.date, archetype: archetypeOf(e.archetypeId) })),
    planned: plan.entries.filter((e) => e.sport === 'running' && e.date >= today).map((e) => ({ date: e.date, archetype: archetypeOf(e.archetypeId) })),
    freeDays: days.filter((d) => !taken.has(d) && minutesOf(d) > 0).map((date) => ({ date, availableS: minutesOf(date) * S_PER_MIN })),
  });
  const missedKeys = new Set(missed.map((e) => e.key));
  const moved: PlanEntry[] = [];
  const dropped: WeekPlan['dropped'] = [];
  for (const d of r.decisions) {
    const e = missed.find((x) => x.date === d.date);
    if (!e) continue;
    if (d.decision === 'MOVE') moved.push({ ...e, key: entryKey(d.to, 'running'), date: d.to, availableMinutes: minutesOf(d.to) });
    else dropped.push({ date: e.date, archetypeId: e.archetypeId, code: d.code });
  }
  const entries = [...plan.entries.filter((e) => !missedKeys.has(e.key)), ...moved].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([k]) => !missedKeys.has(k)));
  return {
    ...state, sessions,
    plans: { ...state.plans, [weekStart]: { ...plan, entries, dropped: [...plan.dropped, ...dropped], notices: [...plan.notices, ...r.reasons.filter((x) => x.code.startsWith('PLAN.RUNNING.WEEK_')).map(toNotice)] } },
  };
}
