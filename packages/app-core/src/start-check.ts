/**
 * P0 — démarrage d'une séance APRÈS le contrôle pré-séance : décision et, si nécessaire, RÉGÉNÉRATION de la séance
 * planifiée par le moteur de sa discipline avec l'état du jour déclaré (le CORE valide et répare selon ses règles G1).
 *
 * Fidélité : le créneau est reconstruit depuis la semaine PERSISTÉE (date, minutes disponibles, graine du
 * planificateur, intention, contexte voisin persisté, séances de la semaine) ; seul l'état CORE du jour change. Rien
 * n'est inventé ici : aucune dose, aucun exercice, aucune règle de douleur. Séance non régénérable (non placée,
 * HYROX) : séance gardée si elle ne sollicite aucune zone restreinte, sinon report explicite.
 *
 * Reproductibilité (consolidation) : la composition dépend aussi de l'historique (expositions, progression) et de la
 * version du moteur. Une séance planifiée n'est donc régénérable FIDÈLEMENT que si sa régénération à état INCONNU redonne
 * exactement la séance planifiée. Sinon (séance réalisée depuis dans la semaine, semaine composée par une version
 * antérieure), aucun changement n'est attribué à l'état du jour : la séance planifiée est gardée si aucune zone exclue
 * n'est sollicitée ; sinon la séance recomposée est proposée, en signalant que la recomposition dépasse la douleur.
 *
 * R2 (consolidation) — fidélité accrue sans rien persister : la régénération lit les historiques ajoutés AU PLUS TARD à
 * la planification de la semaine (`plannedAt` : expositions, empreintes, réalisations), comme le planificateur les a lus.
 * Séance encore non reproductible (historique propre au planificateur, tracks de progression, version du moteur) :
 * adaptation de la séance PERSISTÉE par la validation et la réparation du CORE (`adaptPersistedSession`), qui ne change
 * que ce que l'état déclaré impose. La recomposition signalée et le report ne sont que les derniers recours.
 */
import { deriveProgramStatus, ENGINE_VERSION, estimateDuration, migrateToCurrent, readDurationParams, repairSession, toEnvelope, toRecordedDurationEstimate, validateSession } from '@hybridsport/engine';
import type { CoreState, ValidationContext } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import type { PlannerSport, SlotRequest, WeekSession } from '@hybridsport/planner';
import type { AppState, PersistedWeek, Reason } from './model.js';
import type { CheckInEvaluation } from './checkin.js';
import { coreStateOf, UNKNOWN_CORE_STATE } from './checkin.js';
import { buildPorts } from './planning.js';
import { portInputs } from './programme.js';
import { coreProfile } from './generate.js';
import type { ProgrammeEnvironment } from './programme.js';
import { applyReadinessToPersisted } from './readiness-persisted.js';

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
export function regenerateSession(state0: AppState, requestId: string, coreState: CoreState, env: ProgrammeEnvironment): Regeneration {
  const at = locate(state0, requestId);
  // Historiques tels qu'à la planification de la semaine (aucune donnée persistée en plus ; tracks : état courant).
  const state = at ? asOfPlanning(state0, at.week.plannedAt) : state0;
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

/** État dont les historiques AJOUTÉS (append-only) sont coupés à l'instant `cutoff` ; le reste est inchangé. */
export function asOfPlanning(state: AppState, cutoff: string): AppState {
  const t = Date.parse(cutoff);
  const keep = (iso: unknown): boolean => typeof iso !== 'string' || Date.parse(iso) <= t;
  return {
    ...state,
    strength: { ...state.strength, exposures: state.strength.exposures.filter((x) => keep(x.at)) },
    fingerprints: { strength: state.fingerprints.strength.filter((x) => keep(x.at)), running: state.fingerprints.running.filter((x) => keep(x.at)), crosstraining: state.fingerprints.crosstraining.filter((x) => keep(x.at)) },
    running: { ...state.running, realized: state.running.realized.filter((x) => keep(x.completedAt)) },
    crosstraining: { realized: state.crosstraining.realized.filter((x) => keep(x.completedAt)) },
    hyrox: { realized: state.hyrox.realized.filter((x) => keep(x.completedAt)) },
  };
}

export type PersistedAdaptation =
  | { readonly status: 'adapted'; readonly record: SessionRecord; readonly changes: readonly string[]; readonly reasons: readonly Reason[] }
  | { readonly status: 'impossible'; readonly cause: string; readonly reasons: readonly Reason[] };

/**
 * R2 — adaptation de la séance PERSISTÉE (jamais régénérée) par le CORE : validation puis réparation sous les
 * restrictions de douleur du jour (`validateSession`, `repairSession` : substituts admissibles du catalogue, ou retrait).
 * Garde : la séance planifiée doit être VALIDE sans restriction (sinon un écart non lié à l'état serait attribué à
 * tort). La dose selon l'état (règle du moteur de la discipline) n'est PAS appliquée ici : tracée comme non appliquée.
 */
export function adaptPersistedSession(state: AppState, requestId: string, ev: CheckInEvaluation, env: ProgrammeEnvironment): PersistedAdaptation {
  const at = locate(state, requestId);
  const rec = recordOf(at?.r);
  const p = state.profile;
  const content = at ? env[at.r.sport]?.content : undefined;
  if (!at || !rec || !p || !content) return { status: 'impossible', cause: 'session_unknown', reasons: [] };
  const cp = coreProfile(p);
  const deps = { catalog: content.catalog, ruleset: content.ruleset, engineVersion: ENGINE_VERSION };
  const ctxOf = (restricted: boolean): ValidationContext => ({
    programStatus: deriveProgramStatus({ eligibility: cp.eligibility, declarations: [], safety: restricted ? ev.safety : { pauseProgram: false }, ruleset: content.ruleset }).status,
    eligibility: cp.eligibility, athleteLevel: cp.athleteLevel, availableEquipment: cp.availableEquipment, restrictions: cp.restrictions,
    areaRestrictions: restricted ? ev.safety.areaRestrictions : [], restrictedMovements: restricted ? ev.safety.restrictedMovements : [],
    excludedExercises: cp.excludedExercises, dayAvailable: true,
  });
  if (validateSession(rec.session, ctxOf(false), deps).report.status === 'INVALID') return { status: 'impossible', cause: 'planned_session_invalid_without_restrictions', reasons: [] };
  const out = repairSession(rec.session, ctxOf(true), deps, { seed: `checkin:${requestId}` });
  const traced = out.trace.entries.flatMap((e) => e.reasons).filter((r) => SHOWN.test(r.code)).map(reason);
  if (out.result.status !== 'ok') return { status: 'impossible', cause: 'repair_refused', reasons: (out.result.status === 'error' ? out.result.error.reasons : out.result.reasons).map(reason) };
  const session = out.result.value;
  // Cohérence (garde conservatrice, aucune valeur sportive) : le CORE protège le bloc PRINCIPAL ; un bloc de force
  // secondaire vidé (ex. Full Body sans poussée ni tirage) est une séance que le moteur de la discipline refuse de
  // composer ⇒ jamais acceptée ici ; la décision revient au moteur (recomposition signalée ou report).
  const emptied = rec.session.blocks.filter((b) => b.kind === 'strength' && !session.blocks.some((x) => x.id === b.id && x.items.length > 0)).map((b) => b.id);
  if (emptied.length > 0) return { status: 'impossible', cause: 'strength_block_emptied', reasons: [{ code: 'KAIRO.CHECKIN_STRENGTH_BLOCK_EMPTIED', params: { requestId, blocks: emptied } }] };
  const est = estimateDuration(session, content.catalog, readDurationParams(content.ruleset));
  const record: SessionRecord = { ...rec, session, durationEstimate: est.ok ? toRecordedDurationEstimate(est.estimate) : rec.durationEstimate };
  return { status: 'adapted', record, changes: sessionChanges(rec.session, session), reasons: traced };
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

/** RC3.1 A1 — l'état du jour (prudence / réduire) concerne-t-il cette séance de Musculation ? */
function readinessApplies(state: AppState, requestId: string, ev: CheckInEvaluation): boolean {
  return (ev.readiness === 'caution' || ev.readiness === 'reduce') && locate(state, requestId)?.r.sport === 'strength';
}

/**
 * RC3.1 A1 — règle d'état du moteur Strength appliquée à la séance persistée `record` (effort seulement). Null hors
 * Musculation ou hors état « prudence / réduire ». `applied` : au moins un exercice ajusté ou déjà couvert.
 */
function readinessPersisted(state: AppState, requestId: string, record: SessionRecord, ev: CheckInEvaluation, env: ProgrammeEnvironment): { readonly record: SessionRecord; readonly reasons: readonly Reason[]; readonly applied: boolean } | null {
  if (!readinessApplies(state, requestId, ev) || (ev.readiness !== 'caution' && ev.readiness !== 'reduce')) return null;
  const at = locate(state, requestId);
  const content = env.strength?.content;
  const notApplied = (cause: string, more: readonly Reason[] = []) => ({ record, applied: false, reasons: [{ code: 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED', params: { requestId, cause, readiness: ev.readiness } }, ...more] });
  if (!at || !content) return notApplied('readiness_persisted_session_unavailable');
  const intent = at.r.intent;
  if (!intent?.archetypeId || !intent.stimulus) return notApplied('readiness_persisted_session_unavailable');
  const out = applyReadinessToPersisted(record.session, at.r.reasons, ev.readiness, content, { archetypeId: intent.archetypeId, stimulus: intent.stimulus });
  if (!out) return notApplied('readiness_rule_unreadable');
  const r = out.result;
  const refused = r.refused.map((x): Reason => ({ code: 'KAIRO.CHECKIN_READINESS_EXERCISE_REFUSED', params: { requestId, exerciseId: x.exerciseId, cause: x.cause } }));
  if (r.adjusted.length === 0 && r.covered.length === 0) return notApplied('readiness_not_applicable_persisted', refused);
  const est = estimateDuration(out.session, content.catalog, readDurationParams(content.ruleset));
  return {
    applied: true,
    record: { ...record, session: out.session, durationEstimate: est.ok ? toRecordedDurationEstimate(est.estimate) : record.durationEstimate },
    reasons: [{ code: 'KAIRO.CHECKIN_READINESS_PERSISTED', params: { requestId, readiness: ev.readiness, rirDelta: r.rule.rirDelta, adjusted: r.adjusted.length, covered: r.covered.length, refused: r.refused.length, setsDeltaNotApplied: r.rule.setsDeltaNotApplied } }, ...refused],
  };
}

export type StartDecision =
  | { readonly kind: 'unchanged'; readonly reasons: readonly Reason[] }
  | { readonly kind: 'adapted'; readonly adaptation: { readonly record: ReturnType<typeof toEnvelope>; readonly changes: readonly string[]; readonly reasons: readonly Reason[] }; readonly reasons: readonly Reason[] }
  | { readonly kind: 'postponed'; readonly reasons: readonly Reason[] };

/** Codes de trace utiles à l'utilisateur dans la séance adaptée (douleur, réparation, dosage selon l'état). */
// technical-constant: nombre de raisons de décision conservées par contrôle (taille d'état, affichage)
const SHOWN_MAX = 8;
// technical-constant: nombre de raisons conservées avec une séance adaptée (taille d'état)
const ADAPTATION_REASONS_MAX = 24;
const SHOWN = /^(SAFETY\.|REPAIR\.|DOSE\.(MODIFIED|READINESS)|DATA\.READINESS)/;

/**
 * Décision de démarrage pour une évaluation SANS pause : séance inchangée, adaptée (régénérée) ou reportée.
 * `catalogAreas` : zones sensibles d'un exercice (catalogue de la discipline) pour les séances non régénérables.
 */
export function decideStart(state: AppState, requestId: string, planned: SessionDraft, ev: CheckInEvaluation, env: ProgrammeEnvironment, catalogAreas: (exerciseId: string) => readonly string[]): StartDecision {
  const base = ev.reasons.map(reason);
  if (!ev.needsAdaptation) return { kind: 'unchanged', reasons: base };
  const excludedAreas = ev.safety.areaRestrictions.filter((a) => a.action === 'exclude').map((a) => a.area);
  const hitsOf = (s: SessionDraft) => s.blocks.flatMap((b) => b.items).filter((it) => catalogAreas(it.exerciseId).some((a) => excludedAreas.includes(a)));
  const hits = hitsOf(planned);
  const mustChange = hits.length > 0 || ev.safety.suspendHighIntensity;
  const notApplied = (cause: string): StartDecision => ({ kind: 'unchanged', reasons: [...base, { code: 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED', params: { requestId, cause, readiness: ev.readiness } }] });
  const postponed = (more: readonly Reason[], params: Record<string, unknown> = {}): StartDecision => ({ kind: 'postponed', reasons: [...base, { code: 'KAIRO.CHECKIN_SESSION_NOT_ADAPTABLE', params: { requestId, ...params } }, ...more] });
  const adapted = (record: SessionRecord, changes: readonly string[], extra: readonly Reason[], traced: readonly Reason[]): StartDecision => {
    // Défense en profondeur : jamais une séance adaptée qui sollicite encore une zone exclue.
    const left = hitsOf(record.session);
    if (left.length > 0) return postponed([], { cause: 'excluded_area_still_loaded', exercises: left.map((x) => x.exerciseId) });
    if (changes.length === 0) return { kind: 'unchanged', reasons: [...base, ...extra, { code: 'KAIRO.CHECKIN_NO_CHANGE', params: { requestId, readiness: ev.readiness } }, ...traced.slice(0, SHOWN_MAX)] };
    return { kind: 'adapted', adaptation: { record: toEnvelope('session_record', record), changes, reasons: [...extra, ...traced].slice(0, ADAPTATION_REASONS_MAX) }, reasons: [...base, ...extra, { code: 'KAIRO.CHECKIN_SESSION_ADAPTED', params: { requestId, changes: changes.length } }] };
  };
  /**
   * Adaptation de la séance PERSISTÉE par le CORE (douleur) puis, en Musculation, règle d'état du moteur Strength
   * appliquée au seul effort visé (RC3.1 A1, `applyReadinessToPersisted`) ; tout refus est tracé, jamais silencieux.
   */
  const persisted = (cause: string): StartDecision | null => {
    const a = adaptPersistedSession(state, requestId, ev, env);
    if (a.status !== 'adapted') return null;
    const rd = readinessPersisted(state, requestId, a.record, ev, env);
    const record = rd?.record ?? a.record;
    const changes = rd?.applied ? sessionChanges(planned, record.session) : a.changes;
    const readinessReasons = rd?.reasons ?? [];
    // Rien à changer : la séance n'est pas « adaptée » ; l'état (appliqué sans effet, ou refusé) reste tracé.
    if (changes.length === 0) {
      if (rd && !rd.applied) return { kind: 'unchanged', reasons: [...base, ...readinessReasons] };
      return { kind: 'unchanged', reasons: [...base, ...readinessReasons, { code: 'KAIRO.CHECKIN_NO_CHANGE', params: { requestId, readiness: ev.readiness } }] };
    }
    return adapted(record, changes, [...(a.changes.length > 0 ? [{ code: 'KAIRO.CHECKIN_PERSISTED_ADAPTED', params: { requestId, cause } }] : []), ...readinessReasons], a.reasons);
  };
  const regen = regenerateSession(state, requestId, coreStateOf(ev.readiness, ev.reports), env);
  if (regen.status === 'not_regenerable') {
    // Séance non régénérable (non placée, HYROX) : adaptation de la séance persistée si une zone l'impose (ou, en
    // Musculation, si l'état du jour le demande : RC3.1 A1), sinon gardée.
    if (!mustChange) return (readinessApplies(state, requestId, ev) ? persisted(regen.cause) : null) ?? notApplied(regen.cause);
    return persisted(regen.cause) ?? postponed([], { cause: regen.cause, exercises: hits.map((x) => x.exerciseId) });
  }
  const baseline = regenerateSession(state, requestId, UNKNOWN_CORE_STATE, env);
  const reproducible = baseline.status === 'planned' && sessionChanges(planned, baseline.record.session).length === 0;
  if (reproducible) {
    if (regen.status === 'refused') return postponed(regen.reasons.filter((x) => SHOWN.test(x.code) || /REFUSED|NO_VALID|UNAVAILABLE|BLOCKING_NEED/.test(x.code)).slice(0, SHOWN_MAX));
    return adapted(regen.record, sessionChanges(planned, regen.record.session), [], regen.reasons.filter((x) => SHOWN.test(x.code)));
  }
  // Non reproductible : jamais de changement attribué à tort. Adaptation de la séance persistée (CORE) ; sinon, si
  // aucune zone exclue n'est sollicitée, séance gardée ; sinon recomposition SIGNALÉE, ou report.
  const p = persisted('session_not_reproducible');
  if (p) return p;
  // Zone exclue sollicitée : jamais « inchangée » (recomposition signalée ou report ci-dessous), état du jour compris.
  if (!mustChange) return notApplied(readinessApplies(state, requestId, ev) ? 'readiness_persisted_session_unavailable' : 'session_not_reproducible');
  const recomposed = [{ code: 'KAIRO.CHECKIN_SESSION_RECOMPOSED', params: { requestId, cause: 'session_not_reproducible' } }];
  if (regen.status === 'refused') return postponed(regen.reasons.filter((x) => SHOWN.test(x.code) || /REFUSED|NO_VALID|UNAVAILABLE|BLOCKING_NEED/.test(x.code)).slice(0, SHOWN_MAX));
  return adapted(regen.record, sessionChanges(planned, regen.record.session), recomposed, regen.reasons.filter((x) => SHOWN.test(x.code)));
}
