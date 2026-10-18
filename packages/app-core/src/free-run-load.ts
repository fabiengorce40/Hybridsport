/**
 * RC4.3 (décision R3) — courses libres RÉELLEMENT effectuées et DATÉES dans la récupération des autres sports.
 *
 * Une course libre devient une séance VOISINE RÉALISÉE (`executed`) du planificateur :
 * - à la planification d'une semaine : courses libres de la semaine précédente (`recentOf`), comme les séances du
 *   programme de cette semaine ;
 * - au démarrage d'une séance d'un autre sport : courses libres faites DEPUIS la planification de sa semaine (la semaine
 *   déjà composée n'est jamais modifiée rétroactivement).
 *
 * Brouillon NEUTRE : exercice de course du catalogue, durée RÉELLE comme dose, AUCUNE cible d'intensité (le profil de
 * demande est dérivé par le CORE à partir de l'exercice et de la dose, bande d'intensité gouvernée par discipline ;
 * jamais une intensité déduite de la durée). Le type déclaré n'y change rien.
 * Exclues : course d'onboarding sans date réelle (`dateUnknown`), course non faite (SKIPPED). Une course libre n'est
 * comptée qu'une fois (identifiant unique) et n'est jamais confondue avec une séance du programme (sources distinctes).
 */
import type { SessionDraft } from '@hybridsport/domain';
import type { RealizedSession } from '@hybridsport/running';
import { RUN_ESTIMATE_METHOD } from '@hybridsport/domain';
import { dateOf } from './dates.js';
import type { AppState } from './model.js';
import { runningContent } from './provisional-content.js';

/** Courses libres comptables comme charge récente : datées réellement, effectuées. */
export function countableFreeRuns(state: AppState): readonly RealizedSession[] {
  const meta = state.running.freeRunMeta ?? {};
  return state.running.realized.filter((r) => r.sessionId.startsWith('free:') && meta[r.sessionId]?.dateUnknown !== true && r.completion !== 'SKIPPED');
}

let exerciseId: string | null | undefined;
/** Exercice de course du catalogue (unique) ; plusieurs ou aucun ⇒ aucune voisine (jamais un exercice deviné). */
function runExerciseId(): string | null {
  if (exerciseId !== undefined) return exerciseId;
  const list = runningContent().catalog.activeExercises().filter((e) => e.disciplines.includes('running') && e.patterns.primary === 'running' && e.movementType === 'monostructural');
  exerciseId = list.length === 1 ? (list[0]?.id ?? null) : null;
  return exerciseId;
}

/** Brouillon neutre d'une course libre réalisée (voisine) ; `null` si l'exercice de course n'est pas déterminable. */
export function freeRunDraft(r: RealizedSession): SessionDraft | null {
  const ex = runExerciseId();
  if (ex === null) return null;
  const d = r.realizedDurationS;
  const id = `${r.sessionId}.neighbour`;
  return {
    id, discipline: 'running', availableTimeS: d, targetDurationS: d, toleranceProfile: 'fixed_time',
    blocks: [{
      id: `${id}.block`, kind: 'running', role: 'primary', optional: false, format: 'continuous', levers: [],
      items: [{ id: `${id}.run`, exerciseId: ex, prescription: { type: 'run_structure', segments: [], estimate: { method: RUN_ESTIMATE_METHOD, methodVersion: 1, unit: 's', workS: { min: d, max: d }, totalS: { min: d, max: d } } } }],
    }],
  } as unknown as SessionDraft;
}

/** Courses libres comptables du jour `from` (inclus) au jour `to` (exclu), en voisines réalisées du planificateur. */
export function freeRunRecent(state: AppState, from: string, to: string): { date: string; sport: 'running'; session: SessionDraft; status: 'executed' }[] {
  return countableFreeRuns(state).filter((r) => dateOf(r.completedAt) >= from && dateOf(r.completedAt) < to)
    .flatMap((r) => { const s = freeRunDraft(r); return s ? [{ date: dateOf(r.completedAt), sport: 'running' as const, session: s, status: 'executed' as const }] : []; });
}
