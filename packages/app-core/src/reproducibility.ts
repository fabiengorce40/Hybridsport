/**
 * RC4.5 (D2, R-A) — DIAGNOSTIC de reproductibilité des séances planifiées. Lecture seule : rien n'est écrit dans
 * l'état, aucune séance prescrite ni aucune progression n'est modifiée, et les quatre chemins de démarrage
 * (Faire maintenant, Commencer depuis le Planning, contrôle pré-séance, reprise) n'utilisent PAS ce module : ils
 * gardent leur garde de reproductibilité sur l'état courant (adaptation voulue à la dernière performance).
 *
 * La séance persistée est comparée à deux régénérations à état du jour INCONNU :
 * - « maintenant » : le chemin existant (`regenerateSession`, historiques lus à la planification, progressions courantes) ;
 * - « état de planification » : en plus, les progressions OUVERTES après la planification de la semaine sont ignorées
 *   (une progression avancée depuis ne peut pas être relue à son état d'alors : elle n'est pas versionnée).
 *
 * Classes (indicateur DISTINCT pour les véritables divergences du planificateur) :
 * - `identical` : séance prescrite identique (blocs, exercices, séries, répétitions, charges) ;
 * - `progression_since_planning` : mêmes exercices, séries et RIR ; seules des prescriptions fines (répétitions, charge)
 *   ont avancé avec les progressions depuis la planification ;
 * - `history_since_planning` : le contenu diffère maintenant mais est reproduit depuis l'état de planification
 *   (progressions créées depuis par les séances réalisées) ;
 * - `planner_divergence` : le contenu diffère même depuis l'état de planification (la séance a été générée face à des
 *   versions intermédiaires des autres séances de la semaine) ;
 * - `not_regenerable` : séance non régénérable (non placée, sport non régénérable, refus du moteur).
 */
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { migrateToCurrent } from '@hybridsport/engine';
import type { AppState, PersistedWeek } from './model.js';
import type { ProgrammeEnvironment } from './programme.js';
import { UNKNOWN_CORE_STATE } from './checkin.js';
import { regenerateSession, sessionChanges } from './start-check.js';

export type ReproducibilityClass = 'identical' | 'progression_since_planning' | 'history_since_planning' | 'planner_divergence' | 'not_regenerable';

export interface SessionReproducibility {
  readonly requestId: string;
  readonly class: ReproducibilityClass;
  /** Écarts de contenu (`sessionChanges` : exercices, séries, RIR) avec la régénération « maintenant ». */
  readonly changesNow: readonly string[];
  /** Écarts de contenu avec la régénération depuis l'état de planification. */
  readonly changesAtPlanning: readonly string[];
  readonly cause?: string;
}

export interface WeekReproducibility {
  readonly weekStart: string;
  readonly sessions: readonly SessionReproducibility[];
  readonly counts: Readonly<Record<ReproducibilityClass, number>>;
  /** Séances au contenu reproduit (toutes classes sauf `planner_divergence` et `not_regenerable`). */
  readonly contentReproducible: number;
  /** Indicateur distinct : véritables divergences de contenu liées au planificateur. */
  readonly plannerDivergences: number;
}

type Request = PersistedWeek['requests'][number];

function locate(state: AppState, requestId: string): { week: PersistedWeek; r: Request } | undefined {
  for (const week of Object.values(state.planner.weeks)) {
    const r = week.requests.find((x) => x.requestId === requestId);
    if (r) return { week, r };
  }
  return undefined;
}

const persistedSession = (r: Request): SessionDraft | undefined => {
  if (!r.record) return undefined;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value.session : undefined;
};

/** État dont les progressions ouvertes APRÈS `cutoff` sont retirées (lecture de diagnostic, jamais persistée). */
function tracksAsOfPlanning(state: AppState, cutoff: string): AppState {
  const t = Date.parse(cutoff);
  return { ...state, strength: { ...state.strength, tracks: state.strength.tracks.filter((x) => Date.parse(x.openedAt) <= t) } };
}

/** Diagnostic d'UNE séance planifiée. Pur. */
export function diagnoseReproducibility(state: AppState, requestId: string, env: ProgrammeEnvironment): SessionReproducibility {
  const at = locate(state, requestId);
  const planned = at ? persistedSession(at.r) : undefined;
  if (!at || !planned) return { requestId, class: 'not_regenerable', changesNow: [], changesAtPlanning: [], cause: 'session_unknown' };
  const now = regenerateSession(state, requestId, UNKNOWN_CORE_STATE, env);
  if (now.status !== 'planned') return { requestId, class: 'not_regenerable', changesNow: [], changesAtPlanning: [], cause: now.status === 'refused' ? 'refused' : now.cause };
  const changesNow = sessionChanges(planned, now.record.session);
  if (JSON.stringify(now.record.session.blocks) === JSON.stringify(planned.blocks)) return { requestId, class: 'identical', changesNow, changesAtPlanning: [] };
  if (changesNow.length === 0) return { requestId, class: 'progression_since_planning', changesNow, changesAtPlanning: [] };
  const then = regenerateSession(tracksAsOfPlanning(state, at.week.plannedAt), requestId, UNKNOWN_CORE_STATE, env);
  if (then.status !== 'planned') return { requestId, class: 'not_regenerable', changesNow, changesAtPlanning: [], cause: then.status === 'refused' ? 'refused' : then.cause };
  const changesAtPlanning = sessionChanges(planned, then.record.session);
  return { requestId, class: changesAtPlanning.length === 0 ? 'history_since_planning' : 'planner_divergence', changesNow, changesAtPlanning };
}

const CLASSES: readonly ReproducibilityClass[] = ['identical', 'progression_since_planning', 'history_since_planning', 'planner_divergence', 'not_regenerable'];

/** Diagnostic des séances PLANIFIÉES d'une semaine (option : un sport). Pur. */
export function weekReproducibility(state: AppState, weekStart: string, env: ProgrammeEnvironment, sport?: Request['sport']): WeekReproducibility {
  const week = state.planner.weeks[weekStart];
  const ids = (week?.requests ?? []).filter((r) => r.status === 'planned' && r.date && (sport === undefined || r.sport === sport))
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : (a.date ?? '') > (b.date ?? '') ? 1 : a.requestId < b.requestId ? -1 : 1)).map((r) => r.requestId);
  const sessions = ids.map((id) => diagnoseReproducibility(state, id, env));
  const counts = Object.fromEntries(CLASSES.map((c) => [c, sessions.filter((s) => s.class === c).length])) as Record<ReproducibilityClass, number>;
  return { weekStart, sessions, counts, contentReproducible: counts.identical + counts.progression_since_planning + counts.history_since_planning, plannerDivergences: counts.planner_divergence };
}
