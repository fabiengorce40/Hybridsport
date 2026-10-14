/**
 * RC3.5 — lecteur de séance Course : déroule la `run_structure` PERSISTÉE de la séance (celle du moteur Running, ou la
 * séance adaptée par le contrôle avant séance) étape par étape, selon `executionSteps` du CORE. Aucune prescription
 * n'est lue ailleurs, recalculée ou modifiée.
 *
 * - Étape en DURÉE : temps restant, enchaînement automatique à l'échéance (dérivé de l'horloge, jamais compté).
 * - Étape en DISTANCE : temps écoulé seulement ; elle se termine UNIQUEMENT par une validation manuelle (aucune mesure
 *   GPS, aucune durée déduite d'une allure).
 * - Pause / reprise / étape suivante : commandes explicites, seules écritures. Un rechargement, un verrouillage ou une
 *   interruption ne change rien : la position est recalculée depuis l'horodatage.
 * - La fin des étapes ne termine jamais la séance : seule la fin de séance déclarée par l'utilisateur l'enregistre.
 */
import { executionSteps } from '@hybridsport/domain';
import type { ExecutionStep } from '@hybridsport/domain';
import type { Clock } from './app.js';
import { selectProgrammeSession } from './beta0-app.js';
import type { ProgrammeSessionView } from './beta0-app.js';
import { normalizeInstant } from './dates.js';
import { AppError } from './errors.js';
import type { AppState, ProgrammeLog, RunPlayer } from './model.js';

// technical-constant: conversion secondes → millisecondes
const MS_PER_S = 1000;

const IDLE: RunPlayer = { runningSince: null, accumulatedS: 0, anchorIndex: 0, anchorAtS: 0, marks: [] };

/** Étapes de la séance Course ; `null` si la séance n'a pas exactement une structure de course (rien à dérouler). */
export function runPlayerSteps(v: Pick<ProgrammeSessionView, 'sport' | 'session'>): ExecutionStep[] | null {
  if (v.sport !== 'running') return null;
  const runs = v.session.blocks.flatMap((b) => b.items).flatMap((i) => (i.prescription.type === 'run_structure' ? [i.prescription] : []));
  const p = runs[0];
  if (runs.length !== 1 || p === undefined) return null;
  const steps = executionSteps(p);
  return steps.length > 0 ? steps : null;
}

export interface RunPlayerPosition {
  /** Lancé au moins une fois (sinon : en attente du départ). */
  readonly started: boolean;
  readonly running: boolean;
  /** Index de l'étape en cours ; = nombre d'étapes quand toutes sont passées. */
  readonly index: number;
  readonly step: ExecutionStep | null;
  readonly next: ExecutionStep | null;
  /** Secondes écoulées dans l'étape en cours (entier inférieur). */
  readonly elapsedInStepS: number;
  /** Secondes restantes (entier supérieur) d'une étape en DURÉE ; `null` pour une étape en distance. */
  readonly remainingS: number | null;
  /** Temps actif total du lecteur, pauses exclues (entier inférieur). */
  readonly activeS: number;
  /** Toutes les étapes sont passées (la séance n'est PAS terminée pour autant). */
  readonly allStepsPassed: boolean;
  readonly marks: RunPlayer['marks'];
}

const activeOf = (rp: RunPlayer, nowIso: string): number =>
  rp.accumulatedS + (rp.runningSince === null ? 0 : Math.max(0, (Date.parse(nowIso) - Date.parse(rp.runningSince)) / MS_PER_S));

/** Position DÉRIVÉE à l'instant donné : depuis l'ancre, seules les étapes en durée s'enchaînent. */
export function runPlayerPosition(rp: RunPlayer | undefined, steps: readonly ExecutionStep[], nowIso: string): RunPlayerPosition {
  const r = rp ?? IDLE;
  const active = activeOf(r, nowIso);
  let i = Math.min(r.anchorIndex, steps.length);
  let t = Math.max(0, active - r.anchorAtS);
  for (let s = steps[i]; s !== undefined && 'durationS' in s.dose && t >= s.dose.durationS; s = steps[i]) {
    t -= s.dose.durationS;
    i += 1;
  }
  const step = steps[i] ?? null;
  return {
    started: rp !== undefined && (rp.runningSince !== null || rp.accumulatedS > 0),
    running: r.runningSince !== null,
    index: i, step, next: steps[i + 1] ?? null,
    elapsedInStepS: Math.floor(t),
    remainingS: step !== null && 'durationS' in step.dose ? Math.ceil(step.dose.durationS - t) : null,
    activeS: Math.floor(active),
    allStepsPassed: i >= steps.length,
    marks: r.marks,
  };
}

function openRunning(state: AppState, requestId: string): { readonly log: ProgrammeLog; readonly steps: ExecutionStep[] } {
  const log = state.programmeLogs[requestId];
  if (!log) throw new AppError('SESSION_NOT_STARTED');
  if (log.finishedAt) throw new AppError('SESSION_FINISHED');
  const v = selectProgrammeSession(state, requestId);
  const steps = v ? runPlayerSteps(v) : null;
  if (log.sport !== 'running' || steps === null) throw new AppError('RUN_PLAYER_UNAVAILABLE');
  return { log, steps };
}
const withPlayer = (state: AppState, log: ProgrammeLog, runPlayer: RunPlayer): AppState =>
  ({ ...state, programmeLogs: { ...state.programmeLogs, [log.requestId]: { ...log, runPlayer } } });

/** Lancer / reprendre (nouveau segment horodaté) ou mettre en pause (temps actif figé). Idempotent. */
export function controlRunPlayer(state: AppState, clock: Clock, requestId: string, action: 'start' | 'pause' | 'resume'): AppState {
  const { log } = openRunning(state, requestId);
  const rp = log.runPlayer ?? IDLE;
  if (action === 'pause') {
    if (rp.runningSince === null) return state;
    return withPlayer(state, log, { ...rp, runningSince: null, accumulatedS: activeOf(rp, clock.now) });
  }
  if (rp.runningSince !== null) return state;
  return withPlayer(state, log, { ...rp, runningSince: normalizeInstant(clock.now) });
}

/**
 * « Étape suivante » sur l'étape AFFICHÉE (`expectedKey`) : validation manuelle d'une étape en distance, ou étape en
 * durée passée avant son échéance (tracé). Si l'étape en cours n'est plus celle affichée (double appui, échéance
 * atteinte entre-temps), rien ne change : jamais deux étapes passées pour un seul geste.
 */
export function advanceRunPlayer(state: AppState, clock: Clock, requestId: string, expectedKey: string): AppState {
  const { log, steps } = openRunning(state, requestId);
  const rp = log.runPlayer ?? IDLE;
  const pos = runPlayerPosition(log.runPlayer, steps, clock.now);
  if (pos.step === null || pos.step.key !== expectedKey) return state;
  const end = 'distanceM' in pos.step.dose ? 'distance_validated' as const : 'skipped' as const;
  return withPlayer(state, log, {
    ...rp, anchorIndex: pos.index + 1, anchorAtS: activeOf(rp, clock.now),
    marks: [...rp.marks, { key: pos.step.key, end, elapsedS: pos.elapsedInStepS, at: normalizeInstant(clock.now) }],
  });
}
export type { ExecutionStep } from '@hybridsport/domain';
