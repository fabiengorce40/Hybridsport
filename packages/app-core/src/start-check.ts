/**
 * P0 — démarrage d'une séance APRÈS le contrôle pré-séance : décision et, si nécessaire, RÉGÉNÉRATION de la séance
 * planifiée par le moteur de sa discipline avec l'état du jour déclaré (le CORE valide et répare selon ses règles G1).
 *
 * Fidélité : le créneau est reconstruit depuis la semaine PERSISTÉE (date, minutes disponibles, graine du
 * planificateur, intention, contexte voisin persisté, séances de la semaine) ; seul l'état CORE du jour change. Rien
 * n'est inventé ici : aucune dose, aucun exercice, aucune règle de douleur. Séance non régénérable (non placée,
 * HYROX) : séance gardée si elle ne sollicite aucune zone restreinte, sinon report explicite.
 */
import { migrateToCurrent, toEnvelope } from '@hybridsport/engine';
import type { CoreState } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import type { PlannerSport, SlotRequest, WeekSession } from '@hybridsport/planner';
import type { AppState, PersistedWeek, Reason } from './model.js';
import type { CheckInEvaluation } from './checkin.js';
import { coreStateOf, UNKNOWN_CORE_STATE } from './checkin.js';
import { buildPorts } from './planning.js';
import { portInputs } from './programme.js';
import type { ProgrammeEnvironment } from './programme.js';

type Request = PersistedWeek['requests'][number];
const reason = (r: { code: string; params: Readonly<Record<string, unknown>> }): Reason => ({ code: r.code, params: { ...r.params } });

function locate(state: AppState, requestId: string): { week: PersistedWeek; r: Request } | undefined {
  for (const week of Object.values(state.planner.weeks)) {
    const r = week.requests.find((x) => x.requestId === requestId);
    if (r) return { week, r };
  }
  return undefined;
}
const recordOf = (r: Request | undefined): SessionRecord | undefined => {
  if (!r?.record) return undefined;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value : undefined;
};

export type Regeneration =
  | { readonly status: 'planned'; readonly record: SessionRecord; readonly reasons: readonly Reason[] }
  | { readonly status: 'refused'; readonly reasons: readonly Reason[] }
  | { readonly status: 'not_regenerable'; readonly cause: string };

/** Sports dont le créneau est reconstructible fidèlement (HYROX : station non persistée ⇒ non régénérable). */
const REGENERABLE: readonly PlannerSport[] = ['strength', 'running', 'crosstraining'];

/**
 * Régénère la séance PLANIFIÉE `requestId` avec l'état CORE `coreState` sur son jour (les autres jours : inconnu).
 * Pur : n'écrit rien dans l'état.
 */
export function regenerateSession(state: AppState, requestId: string, coreState: CoreState, env: ProgrammeEnvironment): Regeneration {
  const at = locate(state, requestId);
  const p = state.profile;
  const ps = state.programmeState;
  if (!at || !p || !ps) return { status: 'not_regenerable', cause: 'session_unknown' };
  const { week, r } = at;
  if (r.status !== 'planned' || !r.date || !r.intent) return { status: 'not_regenerable', cause: 'session_not_placed' };
  if (!REGENERABLE.includes(r.sport)) return { status: 'not_regenerable', cause: `sport_not_regenerable:${r.sport}` };
  const { intent, goals } = portInputs(ps);
  const date = r.date;
  const ports = buildPorts(state, p, intent, env, goals, (d) => (d === date ? coreState : UNKNOWN_CORE_STATE));
  const port = ports[r.sport];
  if (!port) return { status: 'not_regenerable', cause: 'port_unavailable' };
  const placed = week.requests.filter((x) => x.status === 'planned' && x.date && x.requestId !== requestId);
  const sessionOf = (x: Request): WeekSession | undefined => {
    const rec = recordOf(x);
    return rec && x.date ? { requestId: x.requestId, date: x.date, archetypeId: x.intent?.archetypeId ?? '', session: rec.session, ...(rec.fingerprint?.status === 'available' ? { fingerprint: rec.fingerprint.value } : {}) } : undefined;
  };
  const same = placed.filter((x) => x.sport === r.sport && (port.weekSessionsScope === 'generated' || (x.date ?? '') < date))
    .sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1)).flatMap((x) => { const s = sessionOf(x); return s ? [s] : []; });
  const programmeWeek = ps.weeks.find((w) => w.plannerRef === week.weekStart);
  const sportPriority = programmeWeek?.intent.demands.map((d) => d.sport) ?? intent.sports.map((s) => s.sport);
  const cross = Object.fromEntries((port.crossSportWeek ?? []).map((o) => [o, placed.filter((x) => x.sport === o).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1)).flatMap((x) => { const s = sessionOf(x); return s ? [s] : []; })]).filter(([, v]) => (v as WeekSession[]).length > 0));
  const slot: SlotRequest = {
    requestId, date, availableMinutes: week.days.find((d) => d.date === date)?.availableMinutes ?? 0, hybrid: week.hybrid, seed: `planner:${requestId}:${date}`,
    intent: { ...r.intent } as SlotRequest['intent'],
    ...(port.consumesNeighbours && r.neighbourContext ? { neighbours: { known: r.neighbourContext.known, neighbours: r.neighbourContext.neighbours.map((n) => ({ ...n, demand: { ...n.demand } })) } as SlotRequest['neighbours'] } : {}),
    ...(port.consumesWeekSessions ? { ...(same.length > 0 ? { weekSessions: same } : {}), sportSessions: week.requests.filter((x) => x.sport === r.sport).length, sportPriority } : port.consumesNeighbours ? { sportPriority } : {}),
    ...(Object.keys(cross).length > 0 ? { crossSportWeek: cross } : {}),
  };
  const out = port.generate(slot);
  if (out.status !== 'planned') return { status: 'refused', reasons: out.reasons.map(reason) };
  return { status: 'planned', record: out.record, reasons: out.reasons.map(reason) };
}

/** Différences lisibles (codes) entre la séance planifiée et la séance adaptée : exercices, séries de travail, effort. */
export function sessionChanges(before: SessionDraft, after: SessionDraft): string[] {
  type It = SessionDraft['blocks'][number]['items'][number];
  const items = (s: SessionDraft): It[] => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
  const work = (it: It): number => (it.prescription.type === 'sets' ? it.prescription.sets.filter((x) => x.kind !== 'rampup').length : 0);
  const rir = (it: It): number | undefined => {
    if (it.prescription.type !== 'sets') return undefined;
    const w = it.prescription.sets.find((x) => x.kind !== 'rampup');
    const e = w?.intensity && 'effort' in w.intensity ? w.intensity.effort : undefined;
    return e && 'rir' in e ? e.rir : w?.rir;
  };
  const a = items(before);
  const b = items(after);
  const out: string[] = [];
  for (const x of a) {
    const y = b.find((z) => z.exerciseId === x.exerciseId);
    if (!y) { out.push(`removed:${x.exerciseId}`); continue; }
    if (work(x) !== work(y)) out.push(`sets:${x.exerciseId}:${String(work(x))}>${String(work(y))}`);
    const r0 = rir(x); const r1 = rir(y);
    if (r0 !== undefined && r1 !== undefined && r0 !== r1) out.push(`rir:${x.exerciseId}:${String(r0)}>${String(r1)}`);
  }
  for (const y of b) if (!a.some((x) => x.exerciseId === y.exerciseId)) out.push(`added:${y.exerciseId}`);
  return out;
}

export type StartDecision =
  | { readonly kind: 'unchanged'; readonly reasons: readonly Reason[] }
  | { readonly kind: 'adapted'; readonly adaptation: { readonly record: ReturnType<typeof toEnvelope>; readonly changes: readonly string[]; readonly reasons: readonly Reason[] }; readonly reasons: readonly Reason[] }
  | { readonly kind: 'postponed'; readonly reasons: readonly Reason[] };

/** Codes de trace utiles à l'utilisateur dans la séance adaptée (douleur, réparation, dosage selon l'état). */
const SHOWN = /^(SAFETY\.|REPAIR\.|DOSE\.(MODIFIED|READINESS)|DATA\.READINESS)/;

/**
 * Décision de démarrage pour une évaluation SANS pause : séance inchangée, adaptée (régénérée) ou reportée.
 * `catalogAreas` : zones sensibles d'un exercice (catalogue de la discipline) pour les séances non régénérables.
 */
export function decideStart(state: AppState, requestId: string, planned: SessionDraft, ev: CheckInEvaluation, env: ProgrammeEnvironment, catalogAreas: (exerciseId: string) => readonly string[]): StartDecision {
  const base = ev.reasons.map(reason);
  if (!ev.needsAdaptation) return { kind: 'unchanged', reasons: base };
  const regen = regenerateSession(state, requestId, coreStateOf(ev.readiness, ev.reports), env);
  if (regen.status === 'refused') return { kind: 'postponed', reasons: [...base, { code: 'KAIRO.CHECKIN_SESSION_NOT_ADAPTABLE', params: { requestId } }, ...regen.reasons.filter((x) => SHOWN.test(x.code) || /REFUSED|NO_VALID|UNAVAILABLE|BLOCKING_NEED/.test(x.code)).slice(0, 8)] };
  if (regen.status === 'not_regenerable') {
    // Séance non régénérable : gardée seulement si aucune zone restreinte (exclusion) n'est sollicitée.
    const excluded = ev.safety.areaRestrictions.filter((a) => a.action === 'exclude').map((a) => a.area);
    const hit = planned.blocks.flatMap((b) => b.items).filter((it) => catalogAreas(it.exerciseId).some((a) => excluded.includes(a)));
    if (hit.length > 0 || ev.safety.suspendHighIntensity) return { kind: 'postponed', reasons: [...base, { code: 'KAIRO.CHECKIN_SESSION_NOT_ADAPTABLE', params: { requestId, cause: regen.cause, exercises: hit.map((x) => x.exerciseId) } }] };
    return { kind: 'unchanged', reasons: [...base, { code: 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED', params: { requestId, cause: regen.cause, readiness: ev.readiness } }] };
  }
  const changes = sessionChanges(planned, regen.record.session);
  const traced = regen.reasons.filter((x) => SHOWN.test(x.code));
  if (changes.length === 0) return { kind: 'unchanged', reasons: [...base, { code: 'KAIRO.CHECKIN_NO_CHANGE', params: { requestId, readiness: ev.readiness } }, ...traced.slice(0, 8)] };
  return { kind: 'adapted', adaptation: { record: toEnvelope('session_record', regen.record), changes, reasons: traced.slice(0, 24) }, reasons: [...base, { code: 'KAIRO.CHECKIN_SESSION_ADAPTED', params: { requestId, changes: changes.length } }] };
}
