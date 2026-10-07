/**
 * Programme Engine P1 — couche longitudinale au-dessus du planificateur global :
 *   objectifs + horizon + priorité DÉCLARÉS → intention de semaine → planificateur (placement, interférence, moteurs)
 *   → résultats réalisés → adhérence DESCRIPTIVE → décision GOUVERNÉE (ou BLOCKED) → intention de la semaine suivante.
 *
 * Horizon glissant : la trajectoire (horizon déclaré) est longue, mais seule la semaine courante — et, si une
 * politique gouvernée l'autorise, quelques semaines suivantes — est planifiable ; une semaine qui suit une semaine
 * planifiée non clôturée attend ses résultats ; les autres sont seulement projetées. Une semaine planifiée sans
 * résultat enregistré peut être replanifiée (aucune séance figée à l'avance).
 *
 * Le Programme Engine ne place rien, n'évalue aucune interférence et n'appelle aucun moteur : le planificateur le fait.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { INTENT_FIELDS, planMultisportWeek } from '@hybridsport/planner';
import type { PlannedWeek, PlannerClock, PlannerInput, PlannerMode, SportPorts } from '@hybridsport/planner';
import { adherenceOf } from './adherence.js';
import { PG_CODES, pgReasons } from './codes.js';
import { decide } from './decision.js';
import { readProgrammeParam } from './governance.js';
import { PROGRAMME_SCHEMA_VERSION, zProgrammeDefinition, zProgrammeResult } from './model.js';
import type {
  Assessment, Completion, FullIntent, ProgrammeDecision, ProgrammeDefinitionInput, ProgrammeReason, ProgrammeResult, ProgrammeSport, ProgrammeState, ProgrammeWeek,
  ProgrammeWeekIntent, WeekStatus,
} from './model.js';

// technical-constant: conversions calendaires (jours par semaine, millisecondes par jour)
const DAYS_PER_WEEK = 7;
// technical-constant: conversions calendaires (jours par semaine, millisecondes par jour)
const MS_PER_DAY = 86_400_000;
// technical-constant: longueur de la date ISO AAAA-MM-JJ
const DATE_LEN = 10;
const toMs = (d: string): number => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number): string => new Date(toMs(d) + n * MS_PER_DAY).toISOString().slice(0, DATE_LEN);
export const POLICY_PARAMETER = 'programme.adaptation.decisionPolicy';

export type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };
const fail = <T>(...reasons: ReasonCode[]): Outcome<T> => ({ ok: false, reasons });
const toReason = (r: ReasonCode): ProgrammeReason => ({ code: r.code, params: { ...r.params } });
const audit = (s: ProgrammeState, at: string, weekIndex: number | null, rs: readonly ReasonCode[]): ProgrammeState['audit'] => [...s.audit, ...rs.map((r) => ({ at, weekIndex, reason: toReason(r) }))];

export const weekStartAt = (s: ProgrammeState, i: number): string => addDays(s.definition.startWeek, i * DAYS_PER_WEEK);
export function weekIndexOf(s: ProgrammeState, date: string): number {
  return Math.floor((toMs(date) - toMs(s.definition.startWeek)) / (MS_PER_DAY * DAYS_PER_WEEK));
}

/** Création : définition validée (objectifs, priorité, composition, horizon) ; erreurs structurées, aucun défaut. */
export function createProgramme(input: ProgrammeDefinitionInput, createdAt: string): Outcome<ProgrammeState> {
  const parsed = zProgrammeDefinition.safeParse(input);
  if (!parsed.success) return fail(...parsed.error.issues.map((i) => pgReasons.emit(PG_CODES.DEFINITION_INVALID, { path: i.path.join('.'), problem: i.message })));
  const d = parsed.data;
  return { ok: true, value: { schemaVersion: PROGRAMME_SCHEMA_VERSION, definition: d, createdAt, current: d.sports.map((x) => ({ sport: x.sport, intent: x.intent })), weeks: [], results: [], assessments: [], decisions: [], audit: [] } };
}

const weekOf = (s: ProgrammeState, i: number): ProgrammeWeek | undefined => s.weeks.find((w) => w.weekIndex === i);

/** Statut glissant d'une semaine du programme à la date `today` (horizon d'avance : paramètre gouverné facultatif). */
export function weekStatus(s: ProgrammeState, i: number, today: string, aheadWeeks: number | undefined): WeekStatus {
  const w = weekOf(s, i);
  if (w?.closedAt) return 'closed';
  if (w) return 'planned';
  const cur = weekIndexOf(s, today);
  if (i < cur) return 'past_unplanned';
  if (s.weeks.some((x) => x.weekIndex < i && !x.closedAt)) return 'awaiting_results';
  if (i === cur || (aheadWeeks !== undefined && i - cur <= aheadWeeks)) return 'plannable';
  return 'projected';
}

/** La semaine i appartient-elle au programme (fin déclarée ; programme continu ⇒ toute semaine ≥ 0) ? */
export const withinProgramme = (s: ProgrammeState, i: number): boolean => i >= 0 && (s.definition.horizonWeeks === undefined || i < s.definition.horizonWeeks);

/**
 * Vue longitudinale : statut de chaque semaine du programme. Fin déclarée ⇒ toutes ses semaines ; programme continu ⇒
 * semaines déjà connues (planifiées), semaine courante et avance gouvernée seulement (aucune semaine inventée au-delà).
 */
export function programmeOutlook(s: ProgrammeState, today: string, ruleset: LoadedRuleset | undefined, mode: PlannerMode): { readonly weeks: readonly { weekIndex: number; weekStart: string; status: WeekStatus }[]; readonly reasons: readonly ReasonCode[] } {
  const ahead = readProgrammeParam(ruleset, 'programme.planning.horizonWeeks', mode);
  const known = Math.max(weekIndexOf(s, today) + (ahead.ok ? ahead.value : 0), ...s.weeks.map((w) => w.weekIndex)) + 1;
  return {
    weeks: Array.from({ length: s.definition.horizonWeeks ?? Math.max(0, known) }, (_, i) => ({ weekIndex: i, weekStart: weekStartAt(s, i), status: weekStatus(s, i, today, ahead.ok ? ahead.value : undefined) })),
    reasons: ahead.reasons,
  };
}

/** Intention de la semaine i : composition déclarée, intention COURANTE par sport, priorité, évaluations programmées. */
export function weekIntent(s: ProgrammeState, i: number): ProgrammeWeekIntent {
  const d = s.definition;
  const scheduled = s.assessments.filter((a) => a.scheduledWeek === i && (a.status === 'requested' || a.status === 'scheduled'));
  const demands = d.priorities.flatMap((sp) => {
    const plan = d.sports.find((x) => x.sport === sp);
    const intent = s.current.find((x) => x.sport === sp)?.intent;
    if (!plan || !intent) return [];
    const assess = scheduled.find((a) => a.sport === sp);
    return [{ sport: sp, sessions: plan.sessionsPerWeek, composition: plan.composition, intent, ...(plan.station === undefined ? {} : { station: plan.station }), overrides: assess && plan.assessment ? [{ index: 1, intent: plan.assessment.intent }] : [] }];
  });
  const phase = d.phases.find((p) => p.fromWeek <= i && i <= p.toWeek)?.label ?? null;
  return { weekIndex: i, weekStart: weekStartAt(s, i), phase, demands, assessments: scheduled.map((a) => a.assessmentId) };
}

export interface PlanWeekDeps {
  readonly today: string;
  readonly at: string;
  readonly mode: PlannerMode;
  readonly ports: SportPorts;
  readonly plannerGovernance: LoadedRuleset | undefined;
  readonly programmeGovernance: LoadedRuleset | undefined;
  readonly clock: PlannerClock;
  readonly days: PlannerInput['days'];
  readonly recent?: PlannerInput['recent'];
}

/**
 * Planifie la semaine i PAR LE PLANIFICATEUR GLOBAL (qui place, vérifie l'interférence et appelle les moteurs) puis
 * enregistre le résultat dans l'état longitudinal (référence + résumé). Replanification admise tant qu'aucun résultat
 * n'est enregistré pour la semaine (horizon glissant).
 */
export function planProgrammeWeek(s: ProgrammeState, i: number, deps: PlanWeekDeps): Outcome<{ state: ProgrammeState; intent: ProgrammeWeekIntent; week: PlannedWeek }> {
  if (!withinProgramme(s, i)) return fail(pgReasons.emit(PG_CODES.WEEK_OUT_OF_HORIZON, { weekIndex: i, horizonWeeks: s.definition.horizonWeeks ?? -1 }));
  const ahead = readProgrammeParam(deps.programmeGovernance, 'programme.planning.horizonWeeks', deps.mode);
  const status = weekStatus(s, i, deps.today, ahead.ok ? ahead.value : undefined);
  const replannable = status === 'planned' && !s.results.some((r) => r.weekIndex === i);
  if (status !== 'plannable' && !replannable) return fail(pgReasons.emit(PG_CODES.WEEK_NOT_PLANNABLE, { weekIndex: i, status }), ...(status === 'projected' ? ahead.reasons : []));
  const rotated = rotateIntents(s, i, weekIntent(s, i), deps);
  const intent = rotated.intent;
  const week = planMultisportWeek({ weekStart: intent.weekStart, days: deps.days, demands: intent.demands, mode: deps.mode, recent: deps.recent ?? [] }, deps.ports, deps.plannerGovernance, deps.clock);
  const requests = week.requests.map((r) => ({
    requestId: r.requestId, sport: r.sport, status: r.status, category: r.category, ...(r.status === 'unplaced' ? {} : { date: r.date }),
    ...(r.status === 'unplaced' && r.composed ? { composedUnplaced: true as const } : {}),
    ...(r.intent ? { intent: r.intent } : {}), ...(r.composition ? { composition: r.composition } : {}),
  }));
  const entry: ProgrammeWeek = { weekIndex: i, weekStart: intent.weekStart, intent, plannedAt: deps.at, plannerRef: intent.weekStart, requests };
  // Évaluations de la semaine : la PREMIÈRE séance du sport porte l'intention d'évaluation (surcharge).
  const assessments = s.assessments.map((a): Assessment => {
    if (!intent.assessments.includes(a.assessmentId)) return a;
    const r = week.requests.find((x) => x.sport === a.sport && x.requestId.endsWith(`.${a.sport}.1`));
    if (r?.status === 'planned') return { ...a, status: 'scheduled', requestId: r.requestId };
    return { ...a, status: 'not_planned', reasons: [...a.reasons, toReason(pgReasons.emit(PG_CODES.ASSESSMENT_NOT_PLANNED, { sport: a.sport, assessmentId: a.assessmentId, category: r?.category ?? 'absent' }))] };
  });
  const planned = requests.filter((r) => r.status === 'planned').length;
  const note = pgReasons.emit(PG_CODES.WEEK_PLANNED, { weekIndex: i, weekStart: intent.weekStart, planned, requested: requests.length });
  const state: ProgrammeState = { ...s, weeks: [...s.weeks.filter((w) => w.weekIndex !== i), entry].sort((a, b) => a.weekIndex - b.weekIndex), assessments, audit: audit(s, deps.at, i, [...rotated.reasons, note]) };
  return { ok: true, value: { state, intent, week } };
}

/**
 * M3.1 — plans à ROTATION (« équilibré ») : le PROGRAMME assigne l'archétype de chaque séance de la semaine parmi les
 * candidates GOUVERNÉES de l'objectif, d'après l'historique du programme : critères ordonnés (la moins récemment
 * réalisée — issues comptées gouvernées —, la moins récemment assignée), égalité ⇒ ordre de la liste ; une candidate
 * n'est reprise dans la semaine qu'une fois toutes utilisées. Une évaluation (surcharge existante) garde sa séance.
 * Politique absente ⇒ aucune surcharge (demande sans archétype ⇒ non planifiée), tracé : jamais d'archétype inventé.
 * Le moteur compose chaque séance ; le planificateur (M3) place ; aucun ne change l'archétype assigné.
 */
function rotateIntents(s: ProgrammeState, i: number, intent: ProgrammeWeekIntent, deps: Pick<PlanWeekDeps, 'mode' | 'programmeGovernance'>): { intent: ProgrammeWeekIntent; reasons: ReasonCode[] } {
  const rotating = s.definition.sports.filter((p) => p.rotation !== undefined);
  if (rotating.length === 0) return { intent, reasons: [] };
  const cand = readProgrammeParam(deps.programmeGovernance, 'programme.rotation.candidates', deps.mode);
  const sel = readProgrammeParam(deps.programmeGovernance, 'programme.rotation.selection', deps.mode);
  const reasons: ReasonCode[] = [...cand.reasons, ...sel.reasons];
  const demands = intent.demands.map((d) => {
    const plan = rotating.find((p) => p.sport === d.sport);
    if (!plan?.rotation) return d;
    const list = cand.ok ? cand.value[d.sport]?.[plan.rotation.goal] : undefined;
    if (!cand.ok || !sel.ok || !list) {
      reasons.push(pgReasons.emit(PG_CODES.ROTATION_UNAVAILABLE, { sport: d.sport, weekIndex: i, cause: !cand.ok || !sel.ok ? 'POLICY_UNAVAILABLE' : 'NO_CANDIDATES_FOR_GOAL' }));
      return d;
    }
    // Historique du programme (semaines antérieures) : dernière semaine où chaque archétype a été ASSIGNÉ / RÉALISÉ.
    const lastAssigned = new Map<string, number>();
    const lastExecuted = new Map<string, number>();
    for (const w of s.weeks.filter((x) => x.weekIndex < i)) {
      for (const r of w.requests.filter((x) => x.sport === d.sport && x.intent)) {
        const a = r.intent?.archetypeId ?? '';
        lastAssigned.set(a, Math.max(lastAssigned.get(a) ?? -1, w.weekIndex));
        const res = s.results.find((x) => x.requestId === r.requestId);
        if (res && (sel.value.executedCompletions as readonly string[]).includes(res.completion)) lastExecuted.set(a, Math.max(lastExecuted.get(a) ?? -1, w.weekIndex));
      }
    }
    const key = (a: string, c: 'least_recently_executed' | 'least_recently_assigned') => (c === 'least_recently_executed' ? lastExecuted : lastAssigned).get(a) ?? -1;
    const taken = new Set(d.overrides.map((o) => o.index));
    const used = new Set<string>();
    const overrides = [...d.overrides];
    for (let k = 1; k <= d.sessions; k += 1) {
      if (taken.has(k)) continue;
      if (list.every((x) => used.has(x.archetypeId))) used.clear();
      const pick = list.filter((x) => !used.has(x.archetypeId)).sort((a, b) => {
        for (const c of sel.value.order) { const diff = key(a.archetypeId, c) - key(b.archetypeId, c); if (diff !== 0) return diff; }
        return list.indexOf(a) - list.indexOf(b);
      })[0];
      if (!pick) continue;
      used.add(pick.archetypeId);
      overrides.push({ index: k, intent: { ...(d.intent as Record<string, string>), archetypeId: pick.archetypeId, stimulus: pick.stimulus } as FullIntent });
    }
    overrides.sort((a, b) => a.index - b.index);
    reasons.push(pgReasons.emit(PG_CODES.ROTATION_ASSIGNED, { sport: d.sport, weekIndex: i, goal: plan.rotation.goal, assigned: overrides.map((o) => `${String(o.index)}:${o.intent.archetypeId}`), criteria: [...sel.value.order], policyVersion: `${cand.version}/${sel.version}` }));
    return { ...d, overrides };
  });
  return { intent: { ...intent, demands }, reasons };
}

/**
 * Enregistre la réalisation déclarée d'une séance PLANIFIÉE (jamais d'une séance inconnue ; jamais deux fois). M3.1 :
 * une séance COMPOSÉE MAIS NON PLACÉE peut être réalisée manuellement (`executedOn` = jour réel, exigé) — provenance
 * `manual_from_unplaced`, aucun placement réécrit ; jamais « manquée » (elle n'était pas planifiée).
 */
export function recordProgrammeResult(s: ProgrammeState, raw: Omit<ProgrammeResult, 'weekIndex' | 'sport' | 'date' | 'provenance'> & { completion: Exclude<Completion, 'missed'> | 'missed'; executedOn?: string }): Outcome<ProgrammeState> {
  const w = s.weeks.find((x) => x.requests.some((r) => r.requestId === raw.requestId && (r.status === 'planned' || r.composedUnplaced === true)));
  const req = w?.requests.find((r) => r.requestId === raw.requestId);
  const manual = req?.status === 'unplaced' && req.composedUnplaced === true;
  const date = manual ? raw.executedOn : req?.date;
  if (!w || !req || !date || (manual && raw.completion === 'missed')) return fail(pgReasons.emit(PG_CODES.RESULT_UNKNOWN_REQUEST, { requestId: raw.requestId }));
  if (s.results.some((r) => r.requestId === raw.requestId)) return fail(pgReasons.emit(PG_CODES.RESULT_DUPLICATE, { requestId: raw.requestId }));
  const { executedOn: _executedOn, ...fields } = raw;
  const result = zProgrammeResult.parse({ ...fields, weekIndex: w.weekIndex, sport: req.sport, date, provenance: manual ? 'manual_from_unplaced' : 'declared' });
  const reasons: ReasonCode[] = [];
  const assessments = s.assessments.map((a): Assessment => {
    if (a.requestId !== result.requestId) return a;
    const done = (result.completion === 'completed_as_prescribed' || result.completion === 'modified') && (result.measured !== undefined || result.evidence?.measurement !== undefined);
    const r = done ? pgReasons.emit(PG_CODES.ASSESSMENT_COMPLETED, { sport: a.sport, assessmentId: a.assessmentId, requestId: result.requestId }) : pgReasons.emit(PG_CODES.ASSESSMENT_RESULT_MISSING, { sport: a.sport, assessmentId: a.assessmentId });
    reasons.push(r);
    return { ...a, status: done ? 'completed' : 'result_missing', reasons: [...a.reasons, toReason(r)] };
  });
  return { ok: true, value: { ...s, results: [...s.results, result], assessments, audit: audit(s, result.recordedAt, w.weekIndex, reasons) } };
}

/**
 * Évaluation demandée par l'UTILISATEUR (ex. « je n'ai pas de chrono récent ») : même mécanisme que REASSESS et même
 * contenu, celui DÉCLARÉ par le programme pour ce sport (aucun protocole nouveau). Programmée pour la semaine i : la
 * première séance du sport y porte l'intention d'évaluation (surcharge existante). Refus explicite si la semaine est
 * hors programme, déjà clôturée ou commencée, si une évaluation est déjà ouverte pour ce sport, ou sans contenu déclaré.
 */
export function requestAssessment(s: ProgrammeState, sport: ProgrammeSport, i: number, at: string): Outcome<ProgrammeState> {
  const refuse = (cause: string) => fail<ProgrammeState>(pgReasons.emit(PG_CODES.ASSESSMENT_REQUEST_REFUSED, { sport, cause }));
  const plan = s.definition.sports.find((x) => x.sport === sport);
  if (!plan) return refuse('SPORT_NOT_IN_PROGRAMME');
  if (!plan.assessment) return refuse('CONTENT_NOT_DECLARED');
  if (!withinProgramme(s, i)) return refuse('WEEK_OUT_OF_PROGRAMME');
  if (weekOf(s, i)?.closedAt || s.results.some((r) => r.weekIndex === i && r.provenance !== 'derived_missed')) return refuse('WEEK_ALREADY_STARTED');
  if (s.assessments.some((a) => a.sport === sport && (a.status === 'requested' || a.status === 'scheduled'))) return refuse('ASSESSMENT_ALREADY_OPEN');
  const assessmentId = `${s.definition.programmeId}.${sport}.user.w${String(i + 1)}.${String(s.assessments.length + 1)}`;
  const r = pgReasons.emit(PG_CODES.ASSESSMENT_USER_REQUESTED, { sport, assessmentId, weekIndex: i });
  const assessment: Assessment = { assessmentId, sport, kind: plan.assessment.kind, requestedAtWeek: i, scheduledWeek: i, status: 'requested', reasons: [toReason(r)] };
  return { ok: true, value: { ...s, assessments: [...s.assessments, assessment], audit: audit(s, at, i, [r]) } };
}

export interface CloseWeekDeps { readonly today: string; readonly at: string; readonly mode: PlannerMode; readonly programmeGovernance: LoadedRuleset | undefined }

/**
 * Clôture la semaine i : séances passées sans réalisation ⇒ « manquées » (dérivé, tracé) ; adhérence descriptive ;
 * décision par sport selon la politique GOUVERNÉE (sinon BLOCKED) ; effets sur l'intention (variantes déclarées) et
 * demandes d'évaluation pour la semaine suivante. Refus si une séance planifiée n'a pas encore eu lieu.
 */
export function closeProgrammeWeek(s: ProgrammeState, i: number, deps: CloseWeekDeps): Outcome<ProgrammeState> {
  const w = weekOf(s, i);
  if (!w || w.closedAt) return fail(pgReasons.emit(PG_CODES.WEEK_NOT_PLANNABLE, { weekIndex: i, status: w ? 'closed' : 'not_planned' }));
  const open = w.requests.filter((r) => r.status === 'planned' && !s.results.some((x) => x.requestId === r.requestId));
  const pending = open.filter((r) => (r.date ?? '') >= deps.today);
  if (pending.length > 0) return fail(pgReasons.emit(PG_CODES.WEEK_NOT_OVER, { weekIndex: i, pending: pending.map((r) => r.requestId) }));
  const missed: ProgrammeResult[] = open.map((r) => ({ requestId: r.requestId, weekIndex: i, sport: r.sport, date: r.date ?? w.weekStart, completion: 'missed', pain: false, provenance: 'derived_missed', recordedAt: deps.at }));
  const results = [...s.results, ...missed];
  let assessments = s.assessments.map((a): Assessment => (a.scheduledWeek === i && a.status === 'scheduled' && missed.some((m) => m.requestId === a.requestId)
    ? { ...a, status: 'result_missing', reasons: [...a.reasons, toReason(pgReasons.emit(PG_CODES.ASSESSMENT_RESULT_MISSING, { sport: a.sport, assessmentId: a.assessmentId }))] } : a));
  const weekResults = results.filter((r) => r.weekIndex === i);
  const total = adherenceOf(w.requests, weekResults);
  const bySport = Object.fromEntries(s.definition.priorities.map((sp) => [sp, adherenceOf(w.requests.filter((r) => r.sport === sp), weekResults)]));
  const policy = readProgrammeParam(deps.programmeGovernance, 'programme.adaptation.decisionPolicy', deps.mode);
  const reasons: ReasonCode[] = missed.map((m) => pgReasons.emit(PG_CODES.MISSED_DERIVED, { requestId: m.requestId, date: m.date }));
  let current = s.current;
  const decisions: ProgrammeDecision[] = [];
  for (const sp of s.definition.priorities) {
    const latest = [...assessments].reverse().find((a) => a.sport === sp);
    const facts = { adherence: bySport[sp] ?? adherenceOf([], []), assessment: latest?.status ?? ('none' as const) };
    const o = decide(sp, facts, policy, POLICY_PARAMETER);
    const effects: ReasonCode[] = [];
    const plan = s.definition.sports.find((x) => x.sport === sp);
    if (o.decision === 'PROGRESS' || o.decision === 'REGRESS') {
      const variant = plan?.variants[o.decision];
      if (variant) current = current.map((c) => (c.sport === sp ? { sport: sp, intent: { ...c.intent, ...definedOnly(variant) } } : c));
      else effects.push(pgReasons.emit(PG_CODES.NO_VARIANT_DECLARED, { sport: sp, decision: o.decision }));
    }
    if (o.decision === 'REASSESS') {
      const assessmentId = `${s.definition.programmeId}.${sp}.w${String(i + 1)}`;
      const content = plan?.assessment !== undefined;
      const r = content ? pgReasons.emit(PG_CODES.ASSESSMENT_REQUESTED, { sport: sp, assessmentId, weekIndex: i + 1 }) : pgReasons.emit(PG_CODES.ASSESSMENT_CONTENT_UNAVAILABLE, { sport: sp, assessmentId });
      effects.push(r);
      if (!assessments.some((a) => a.assessmentId === assessmentId)) {
        assessments = [...assessments, { assessmentId, sport: sp, kind: plan?.assessment?.kind ?? 'undeclared', requestedAtWeek: i, ...(content && withinProgramme(s, i + 1) ? { scheduledWeek: i + 1 } : {}), status: content ? 'requested' : 'content_unavailable', reasons: [toReason(r)] }];
      }
    }
    decisions.push({
      decisionId: `${s.definition.programmeId}.w${String(i)}.${sp}`, weekIndex: i, sport: sp, decision: o.decision, policy: o.policy, rule: o.rule, facts,
      results: weekResults.filter((r) => r.sport === sp).map((r) => r.requestId), reasons: [...o.reasons, ...effects].map(toReason),
    });
    reasons.push(...o.reasons, ...effects);
  }
  const closed: ProgrammeWeek = { ...w, closedAt: deps.at, adherence: { total, bySport } };
  return { ok: true, value: { ...s, weeks: s.weeks.map((x) => (x.weekIndex === i ? closed : x)), results, assessments, decisions: [...s.decisions, ...decisions], current, audit: audit(s, deps.at, i, reasons) } };
}

/** Intention de séance réellement demandée pour une requête planifiée (surcharge d'évaluation comprise). */
export function requestIntent(s: ProgrammeState, requestId: string): FullIntent | undefined {
  const w = s.weeks.find((x) => x.requests.some((r) => r.requestId === requestId));
  const req = w?.requests.find((r) => r.requestId === requestId);
  if (!w || !req) return undefined;
  if (req.intent) return req.intent;
  const k = Number(requestId.slice(requestId.lastIndexOf('.') + 1));
  const demand = w.intent.demands.find((d) => d.sport === req.sport);
  const declared = demand?.overrides.find((o) => o.index === k)?.intent ?? demand?.intent;
  return declared && INTENT_FIELDS.every((f) => declared[f] !== undefined) ? declared as FullIntent : undefined;
}

function definedOnly(p: Partial<FullIntent>): Partial<FullIntent> {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<FullIntent>;
}

export type { ProgrammeSport };
