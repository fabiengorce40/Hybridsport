/**
 * REKKA (Course) — NOUVELLE TENTATIVE CIBLÉE des séances de Course refusées de la semaine en cours, quand la donnée qui
 * manquait vient d'être ajoutée (course réalisée, sortie requalifiée, performance, test). Les demandes refusées ne sont
 * jamais perdues ; elles sont retentées ici, et rien d'autre ne bouge :
 * - les séances déjà planifiées (tous sports), commencées ou réalisées restent identiques, octet pour octet ;
 * - seuls les jours libres de la semaine, à partir d'aujourd'hui et disponibles au profil, sont essayés (une séance
 *   au plus par jour, règle existante) ; la règle d'interférence M3 du planificateur s'applique (`manualPlacementConflicts`) ;
 * - la séance est COMPOSÉE puis générée par le moteur Running (sonde de placement, puis composition de la semaine du
 *   moteur, séances déjà planifiées verrouillées), avec la graine et le créneau du planificateur (régénération identique) ;
 * - un nouveau refus du moteur est conservé tel quel (raisons à jour) ; aucune valeur n'est inventée.
 * Tracé : raison `KAIRO.RUNNING_SESSION_RETRIED` sur la demande placée et dans l'audit du programme.
 */
import { migrateToCurrent, toEnvelope } from '@hybridsport/engine';
import type { ReasonCode, SessionDraft, SessionRecord } from '@hybridsport/domain';
import { manualPlacementConflicts } from '@hybridsport/planner';
import type { DeclaredIntent, PortOutcome } from '@hybridsport/planner';
import { weekIndexOf } from '@hybridsport/programme';
import { logFreeRun } from './app.js';
import type { Clock } from './app.js';
import { declareRunningPerformance, requalifyAsTrainingRun, trainingRunOf } from './running-profile.js';
import type { DeclaredPerformance, RequalifyInput, TrainingRunInput } from './running-profile.js';
import { beta0Environment } from './beta0.js';
import { addDays, dateOf, normalizeInstant } from './dates.js';
import type { AppState, Reason } from './model.js';
import { buildPorts, clockOf, compactQuality, decisiveReason, recentOf } from './planning.js';
import { portInputs } from './programme.js';
import type { ProgrammeEnvironment } from './programme.js';
import { activePainPause } from './weeks.js';

export const RUNNING_SESSION_RETRIED = 'KAIRO.RUNNING_SESSION_RETRIED';

export interface RunningRetryOutcome {
  readonly state: AppState;
  /** Demandes placées par cette tentative (identifiants). */
  readonly placed: readonly string[];
  /** Demandes toujours refusées (raisons à jour sur la demande). */
  readonly stillRefused: readonly string[];
}

type PersistedRequest = AppState['planner']['weeks'][string]['requests'][number];
const reason = (r: ReasonCode): Reason => ({ code: r.code, params: { ...r.params } });
const sessionOf = (r: PersistedRequest): SessionDraft | undefined => {
  if (!r.record) return undefined;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value.session : undefined;
};
// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;
// technical-constant: conversion calendaire (millisecondes par jour)
const MS_PER_DAY = 86_400_000;

/** Séances de Course refusées (non commencées, non réalisées) de la semaine en cours, retentées sur les jours libres. */
export function retryRefusedRunning(state: AppState, clock: Clock, env: ProgrammeEnvironment = beta0Environment()): RunningRetryOutcome {
  const none: RunningRetryOutcome = { state, placed: [], stillRefused: [] };
  const p = state.profile;
  const ps = state.programmeState;
  if (!p?.running.enabled || !ps || activePainPause(state)) return none;
  const cur = weekIndexOf(ps, clock.today);
  const pw = ps.weeks.find((w) => w.weekIndex === cur && !w.closedAt);
  const week = pw ? state.planner.weeks[pw.plannerRef] : undefined;
  const demand = pw?.intent.demands.find((d) => d.sport === 'running');
  if (!pw || !week || !demand) return none;
  const done = new Set(ps.results.map((r) => r.requestId));
  const refused = week.requests.filter((r) => r.sport === 'running' && r.status !== 'planned' && !(r.status === 'unplaced' && r.composedFor) && !state.programmeLogs[r.requestId] && !done.has(r.requestId))
    .sort((a, b) => (a.requestId < b.requestId ? -1 : 1));
  if (refused.length === 0) return none;
  const { intent, goals } = portInputs(ps);
  const ports = buildPorts(state, p, intent, env, goals);
  const port = ports.running;
  const comp = port?.composition;
  if (!port) return none;

  // Jours libres : à partir d'aujourd'hui, disponibles au profil, sans séance planifiée ni séance commencée (tous sports).
  const occupied = new Set([
    ...week.requests.flatMap((r) => (r.status === 'planned' && r.date ? [r.date] : [])),
    ...Object.values(state.programmeLogs).map((l) => dateOf(l.startedAt)),
  ]);
  const minutesOf = (date: string): number => p.availability[Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${week.weekStart}T00:00:00Z`)) / MS_PER_DAY)] ?? 0;
  const free = Array.from({ length: DAYS_PER_WEEK }, (_, k) => addDays(week.weekStart, k)).filter((d) => d >= clock.today && minutesOf(d) > 0 && !occupied.has(d));
  const others = [
    ...week.requests.flatMap((r) => { const s = r.status === 'planned' && r.date ? sessionOf(r) : undefined; return s && r.date ? [{ sport: r.sport, date: r.date, session: s }] : []; }),
    ...recentOf(state, p, week.weekStart).filter((x) => x.status !== 'missed').map((x) => ({ sport: x.sport, date: x.date, session: x.session })),
  ];
  const conflictsOf = (date: string, session: SessionDraft, extra: readonly { sport: 'running'; date: string; session: SessionDraft }[]) =>
    manualPlacementConflicts({ sport: 'running', date, session }, [...others, ...extra], ports, env.governance, env.mode, clockOf());
  const frame = demand.intent as Omit<DeclaredIntent, 'archetypeId'>;
  const placementIntent = (r: PersistedRequest): DeclaredIntent | undefined => {
    if (r.intent && r.intent.archetypeId !== undefined && !r.composition) return r.intent as DeclaredIntent;
    const a = comp?.placementArchetypeId;
    const id = typeof a === 'function' ? a(demand.sessions) : a ?? (demand.intent as Partial<DeclaredIntent>).archetypeId;
    return id === undefined ? undefined : { ...frame, archetypeId: id };
  };
  const generate = (r: PersistedRequest, date: string, i: DeclaredIntent): PortOutcome =>
    port.generate({ requestId: r.requestId, date, availableMinutes: minutesOf(date), hybrid: week.hybrid, seed: `planner:${r.requestId}:${date}`, intent: i });
  const runningOn = (d: string, extra: readonly string[]): boolean => [...week.requests.filter((x) => x.sport === 'running' && x.status === 'planned').map((x) => x.date ?? ''), ...extra].includes(d);
  const adjacent = (d: string, extra: readonly string[]): boolean => runningOn(addDays(d, -1), extra) || runningOn(addDays(d, 1), extra);

  // 1. Réservation d'un jour par demande : sonde de génération + interférence (jour essayé d'abord, puis non contigu).
  const reserved: { r: PersistedRequest; date: string; intent: DeclaredIntent; out: Extract<PortOutcome, { status: 'planned' }> }[] = [];
  const latest = new Map<string, readonly ReasonCode[]>();
  for (const r of refused) {
    const i = placementIntent(r);
    if (!i) continue;
    const taken = reserved.map((x) => x.date);
    const days = free.filter((d) => !taken.includes(d))
      .sort((a, b) => Number(b === r.date) - Number(a === r.date) || Number(adjacent(a, taken)) - Number(adjacent(b, taken)) || (a < b ? -1 : 1));
    for (const d of days) {
      const out = generate(r, d, i);
      if (out.status !== 'planned') { latest.set(r.requestId, out.reasons); continue; }
      if (conflictsOf(d, out.session, reserved.map((x) => ({ sport: 'running' as const, date: x.date, session: x.out.session }))).length > 0) continue;
      reserved.push({ r, date: d, intent: i, out });
      break;
    }
  }

  // 2. Composition du moteur sur la semaine (séances déjà planifiées verrouillées), puis génération finale par date.
  const lockedDays = week.requests.filter((x) => x.sport === 'running' && x.status === 'planned' && x.date && x.intent)
    .map((x) => ({ date: x.date as string, availableMinutes: minutesOf(x.date as string), requestId: x.requestId, locked: x.intent as DeclaredIntent }));
  const newDays = reserved.map((x) => ({ date: x.date, availableMinutes: minutesOf(x.date), requestId: x.r.requestId, ...(x.r.composition || !x.r.intent ? {} : { locked: x.intent }) }));
  const composed = comp && reserved.some((x) => !x.r.intent || x.r.composition)
    ? comp.compose({ days: [...lockedDays, ...newDays].sort((a, b) => (a.date < b.date ? -1 : 1)), base: frame, hybrid: week.hybrid, mode: env.mode, weeklySessions: demand.sessions })
    : undefined;
  const at = normalizeInstant(clock.now);
  const placedRequests = new Map<string, PersistedRequest>();
  for (const x of [...reserved].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const slot = composed?.status === 'composed' ? composed.days.find((d) => d.date === x.date) : undefined;
    if (composed && composed.status !== 'composed') { latest.set(x.r.requestId, composed.reasons); continue; }
    const finalIntent = (slot?.intent ?? x.intent) as DeclaredIntent;
    const out = finalIntent.archetypeId === x.intent.archetypeId ? x.out : generate(x.r, x.date, finalIntent);
    if (out.status !== 'planned') { latest.set(x.r.requestId, out.reasons); continue; }
    const extra = [...placedRequests.values()].flatMap((q) => { const s = sessionOf(q); return s && q.date ? [{ sport: 'running' as const, date: q.date, session: s }] : []; });
    if (conflictsOf(x.date, out.session, extra).length > 0) continue;
    const quality = port.quality?.({ session: out.session, archetypeId: finalIntent.archetypeId, reasons: out.reasons, record: out.record });
    const demandOut = port.demand(out.session, env.mode);
    const why: Reason = { code: RUNNING_SESSION_RETRIED, params: { requestId: x.r.requestId, date: x.date, previousStatus: x.r.status } };
    placedRequests.set(x.r.requestId, {
      requestId: x.r.requestId, sport: 'running', status: 'planned', category: 'planned', date: x.date,
      reasons: [why, ...(slot && composed?.status === 'composed' ? [{ code: 'PLAN.PLANNER.COMPOSITION_APPLIED', params: { sport: 'running', authority: composed.authority, role: slot.role, archetypeId: finalIntent.archetypeId } }] : []), ...out.reasons.map(reason)],
      intent: { ...finalIntent }, ...(slot && composed?.status === 'composed' ? { composition: { authority: composed.authority, role: slot.role } } : {}),
      record: toEnvelope('session_record', out.record),
      demand: demandOut.status === 'derived' ? { status: 'derived', levels: { ...demandOut.levels } } : { status: 'unavailable', reasons: demandOut.reasons.map(reason) },
      ...(quality ? { quality: compactQuality(quality) } : {}),
    } as PersistedRequest);
  }

  // 3. Écriture ciblée : demandes placées remplacées, autres refus mis à jour (raisons du dernier essai), rien d'autre.
  const requests = week.requests.map((r) => {
    const q = placedRequests.get(r.requestId);
    if (q) return q;
    const last = latest.get(r.requestId);
    if (!last || !refused.includes(r)) return r;
    const cause = decisiveReason(last);
    return { ...r, reasons: [...r.reasons.filter((y) => y.code.startsWith('PLAN.PLANNER.')), ...last.map(reason)], ...(cause ? { cause: reason(cause) } : {}) };
  });
  const days = week.days.map((d) => {
    const q = [...placedRequests.values()].find((x) => x.date === d.date);
    return q ? { date: d.date, availableMinutes: minutesOf(d.date), status: 'planned' as const, sport: 'running' as const, requestId: q.requestId } : d;
  });
  const programmeWeeks = ps.weeks.map((w) => (w !== pw ? w : {
    ...w, requests: w.requests.map((r) => {
      const q = placedRequests.get(r.requestId);
      if (!q) return r;
      const { composedUnplaced: _c, ...rest } = r;
      return { ...rest, status: 'planned' as const, category: 'planned' as const, date: q.date, ...(q.intent ? { intent: q.intent } : {}), ...(q.composition ? { composition: q.composition } : {}) };
    }),
  }));
  const placed = [...placedRequests.keys()];
  if (placed.length === 0 && latest.size === 0) return none;
  const audit = placed.map((id) => ({ at, weekIndex: cur, reason: { code: RUNNING_SESSION_RETRIED, params: { requestId: id, date: placedRequests.get(id)?.date ?? '' } } }));
  const next: AppState = {
    ...state,
    planner: { weeks: { ...state.planner.weeks, [week.weekStart]: { ...week, requests, days } } },
    programmeState: { ...ps, weeks: programmeWeeks, audit: [...ps.audit, ...audit] },
    revision: state.revision + 1,
  };
  return { state: next, placed, stillRefused: refused.map((r) => r.requestId).filter((id) => !placedRequests.has(id)) };
}

/** REKKA — requalification CONFIRMÉE d'une performance en sortie d'entraînement, puis nouvelle tentative des refus. */
export function requalifyRunningPerformance(state: AppState, clock: Clock, referenceId: string, x: RequalifyInput, env: ProgrammeEnvironment = beta0Environment()): AppState {
  return retryRefusedRunning(requalifyAsTrainingRun(state, clock, referenceId, x), clock, env).state;
}

/** REKKA — sortie d'entraînement enregistrée (course réalisée), puis nouvelle tentative des refus de la semaine. */
export function logTrainingRun(state: AppState, clock: Clock, x: TrainingRunInput, env: ProgrammeEnvironment = beta0Environment()): AppState {
  return retryRefusedRunning(logFreeRun(state, trainingRunOf(x), clock), clock, env).state;
}

/** REKKA — performance maximale déclarée (test, compétition), puis nouvelle tentative des refus de la semaine. */
export function declarePerformanceAndRetry(state: AppState, clock: Clock, x: DeclaredPerformance, env: ProgrammeEnvironment = beta0Environment()): AppState {
  return retryRefusedRunning(declareRunningPerformance(state, clock, x), clock, env).state;
}
