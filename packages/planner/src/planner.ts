/**
 * Global Planner — orchestration multisport ÉTROITE et déterministe. Il n'est pas un moteur sportif : il exécute
 * l'intention de PROGRAMME (composition hebdomadaire, intentions de séance, station HYROX), place les demandes et
 * appelle le moteur de chaque discipline, qui reste seul auteur du contenu.
 *
 * FILTRES (durs) :
 *   G0 intention de programme complète pour le sport (aucun champ inventé) ;
 *   G1 port de moteur disponible pour le sport demandé ;
 *   G2 jour déclaré disponible (minutes > 0) ;
 *   G3 au plus UNE séance par jour (double séance non gouvernée : contrat V0 conservé) ;
 *   G4 interférence inter-disciplines : deux séances de disciplines DIFFÉRENTES sollicitant la même structure
 *      (dérivée du catalogue par la table gouvernée) doivent être séparées d'au moins l'écart GOUVERNÉ
 *      `planner.interference.structureWindows` ; paramètre absent, structure non gouvernée ou structures non
 *      dérivables ⇒ conflit (fail-closed) ;
 *   G5 refus du moteur conservé tel quel (aucune substitution, aucune autre dose, aucun autre sport à sa place).
 * SÉQUENCE INTRA-SEMAINE : chaque génération reçoit les séances de SA discipline déjà placées plus tôt dans la semaine
 *   (expositions PRÉVUES, `SlotRequest.weekSessions`) ; les passes de composition et de contexte voisin régénèrent dans
 *   l'ordre des dates, de sorte que la séance de mercredi connaît celle de lundi. Jamais présentées comme réalisées.
 * MÊME DISCIPLINE (non gouverné) : G4 ne compare que des disciplines DIFFÉRENTES ; deux séances d'une même discipline
 *   qui sollicitent les mêmes structures sont SIGNALÉES (structures partagées, écart en heures), jamais bloquées ni
 *   espacées : aucune fenêtre same-discipline n'est gouvernée.
 * SECONDE PASSE (contexte voisin) : les moteurs qui consomment un contexte voisin (Strength) sont rappelés avec les
 *   profils de demande STANDARD (dérivés par le CORE) des séances placées d'autres disciplines ; la séance obtenue
 *   est revérifiée (G4). Un profil non dérivable ⇒ contexte inconnu (comportement prudent du moteur).
 * ORDRE (départage, jamais un filtre) : priorité DÉCLARÉE (tour de rôle), jour le plus éloigné des séances déjà
 * placées, jour le plus tôt — critères du planificateur V0. Aucun nombre sportif n'est écrit ici.
 */
import type { ReasonCode, SessionDraft, SessionFingerprint } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { GP_CODES, gpReasons } from './codes.js';
import { readPlannerParam } from './governance.js';
import { INTENT_FIELDS, zPlannerInput } from './model.js';
import type { AppliedComposition, DayResult, DeclaredIntent, DemandOutcome, NeighbourContext, PlannedWeek, PlannerClock, PlannerInput, PlannerSport, RequestCategory, RequestResult } from './model.js';
import type { CompositionBase, PortOutcome, SportPort, StructuresResult, WeekSession } from './ports.js';
import { classifyRefusal } from './refusal.js';
import type { RefusalClass } from './refusal.js';

// technical-constant: millisecondes par heure (conversion d'unités)
const MS_PER_HOUR = 3_600_000;
const STRUCTURE_RULE = 'planner.interference.structureWindows';
const GOVERNANCE_RULE = /:UNAVAILABLE$|:UNGOVERNED_STRUCTURE$|^STRUCTURES_UNAVAILABLE$/;

export type SportPorts = Partial<Readonly<Record<PlannerSport, SportPort>>>;

interface Placed {
  readonly sport: PlannerSport;
  readonly date: string;
  readonly requestId: string;
  readonly stimulus: string;
  /** Archétype de la séance placée (absent pour l'historique antérieur à la semaine). */
  readonly archetypeId?: string;
  readonly session: SessionDraft;
  readonly fingerprint?: SessionFingerprint;
  readonly structures: StructuresResult;
  readonly demand: DemandOutcome;
}

export function planMultisportWeek(raw: PlannerInput, ports: SportPorts, governance: LoadedRuleset | undefined, clock: PlannerClock): PlannedWeek {
  const input = zPlannerInput.parse(raw);
  const hybrid = input.demands.length > 1;
  const windows = readPlannerParam(governance, 'planner.interference.structureWindows', input.mode);
  const hoursOf = (d: string): number => Date.parse(clock.instantOf(d)) / MS_PER_HOUR;
  const dates = input.days.map((d) => d.date);
  const minutes = new Map(input.days.map((d) => [d.date, d.availableMinutes]));

  const unknownStructures = (sport: PlannerSport): StructuresResult => ({ ok: false, reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: 'ENGINE_UNAVAILABLE' })] });
  const unknownDemand = (sport: PlannerSport): DemandOutcome => ({ status: 'unavailable', reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: 'ENGINE_UNAVAILABLE' })] });
  // Historique : séances antérieures, structures et profils dérivés par le port de leur discipline.
  const history: Placed[] = input.recent.map((r, i) => {
    const s = r.session as SessionDraft;
    const port = ports[r.sport];
    return { sport: r.sport, date: r.date, requestId: `history.${String(i)}`, stimulus: 'history', session: s, structures: port?.structures(s) ?? unknownStructures(r.sport), demand: port?.demand(s, input.mode) ?? unknownDemand(r.sport) };
  });
  const placed = new Map<string, Placed>();
  const all = (): Placed[] => [...history, ...placed.values()];

  /** Conflits G4 d'une séance candidate avec les séances placées d'AUTRES disciplines (sauf `ignore`). */
  const conflictsOf = (sport: PlannerSport, date: string, own: StructuresResult, ignore?: string): ReasonCode[] => {
    const out: ReasonCode[] = [];
    for (const p of all()) {
      if (p.sport === sport || p.requestId === ignore) continue;
      const gapHours = Math.abs(hoursOf(date) - hoursOf(p.date));
      const base = { sport, date, withSport: p.sport, withDate: p.date, gapHours };
      if (!own.ok || !p.structures.ok) { out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: '*', rule: 'STRUCTURES_UNAVAILABLE' })); continue; }
      const theirs = new Set(p.structures.structures);
      for (const s of own.structures.filter((x) => theirs.has(x))) {
        if (!windows.ok) { out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: s, rule: `${STRUCTURE_RULE}:UNAVAILABLE` })); continue; }
        const required = windows.value[s];
        if (required === undefined) out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: s, rule: `${STRUCTURE_RULE}:UNGOVERNED_STRUCTURE` }));
        else if (gapHours < required) out.push(gpReasons.emit(GP_CODES.INTERFERENCE_CONFLICT, { ...base, structure: s, rule: `${STRUCTURE_RULE}@${windows.version}` }));
      }
    }
    return out;
  };

  /** Séances de la MÊME discipline placées plus tôt dans la semaine (ordre des dates) : expositions prévues. */
  const weekOf = (sport: PlannerSport, date: string, requestId: string): WeekSession[] => [...placed.values()]
    .filter((p) => p.sport === sport && p.requestId !== requestId && p.date < date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((p) => ({ requestId: p.requestId, date: p.date, archetypeId: p.archetypeId ?? '', session: p.session, ...(p.fingerprint ? { fingerprint: p.fingerprint } : {}) }));
  const weekArg = (sport: PlannerSport, date: string, requestId: string): { weekSessions?: WeekSession[]; sportSessions?: number; sportPriority?: PlannerSport[] } => {
    // S4 — ORDRE DE PRIORITÉ déclaré (ordre des demandes du programme), transporté tel quel : aucune interprétation ici.
    const sportPriority = input.demands.map((d) => d.sport);
    // C3 — un port consommateur de voisines reçoit aussi l'ordre de priorité (transport seul).
    if (!ports[sport]?.consumesWeekSessions) return ports[sport]?.consumesNeighbours ? { sportPriority } : {};
    const w = weekOf(sport, date, requestId);
    // Fréquence DÉCLARÉE par le programme pour ce sport (nombre de demandes), transmise pour la trace du moteur.
    const sportSessions = requests.filter((x) => x.sport === sport).length;
    return { ...(w.length > 0 ? { weekSessions: w } : {}), sportSessions, sportPriority };
  };
  const weekReason = (sport: PlannerSport, date: string, requestId: string): ReasonCode[] => {
    if (!ports[sport]?.consumesWeekSessions) return [];
    const w = weekOf(sport, date, requestId);
    return [gpReasons.emit(GP_CODES.WEEK_EXPOSURES, { sport, requestId, planned: w.length, sessions: w.map((x) => x.requestId) })];
  };

  /** Contexte voisin d'une séance : profils dérivés des séances d'AUTRES disciplines (semaine + historique). */
  const neighboursOf = (sport: PlannerSport, date: string, requestId: string): NeighbourContext => {
    const others = all().filter((p) => p.sport !== sport && p.requestId !== requestId);
    const neighbours = others.flatMap((p) => (p.demand.status === 'derived'
      ? [{ sport: p.sport, discipline: ports[p.sport]?.discipline ?? p.sport, stimulus: p.stimulus, hoursFromThisSession: hoursOf(p.date) - hoursOf(date), demand: p.demand.levels }]
      : []));
    return { known: neighbours.length === others.length, neighbours };
  };

  // Composition par le MOTEUR (G0') : vérifiée AVANT placement (aucun jour réservé pour une composition non gouvernée).
  const compositionBlocked = new Map<PlannerSport, readonly ReasonCode[]>();
  for (const d of input.demands) {
    if (d.composition !== 'engine') continue;
    const comp = ports[d.sport]?.composition;
    if (!ports[d.sport]) continue;
    if (!comp) { compositionBlocked.set(d.sport, [gpReasons.emit(GP_CODES.COMPOSITION_UNRESOLVED, { sport: d.sport, mode: input.mode })]); continue; }
    const missing = INTENT_FIELDS.filter((f) => f !== 'archetypeId' && d.intent[f] === undefined);
    if (missing.length > 0) continue;
    const check = comp.compose({ days: [], base: d.intent as CompositionBase, hybrid, mode: input.mode, weeklySessions: d.sessions });
    if (check.status === 'unresolved') compositionBlocked.set(d.sport, check.reasons);
  }

  // Demandes en tour de rôle selon l'ordre DÉCLARÉ ; intention de programme vérifiée (G0).
  const max = Math.max(0, ...input.demands.map((d) => d.sessions));
  interface Request { requestId: string; sport: PlannerSport; intent?: DeclaredIntent; missing: string[]; station?: string; composed: boolean; final: boolean }
  const requests: Request[] = [];
  for (let k = 1; k <= max; k++) {
    for (const d of input.demands) {
      if (k > d.sessions) continue;
      const override = d.overrides.find((o) => o.index === k)?.intent;
      const composed = !override && d.composition === 'engine';
      const missing = override ? [] : INTENT_FIELDS.filter((f) => !(composed && f === 'archetypeId') && d.intent[f] === undefined);
      // Composition par le moteur : jour réservé avec l'archétype de placement DU MOTEUR, remplacé après composition.
      const declaredPlacement = ports[d.sport]?.composition?.placementArchetypeId;
      const placement = typeof declaredPlacement === 'function' ? declaredPlacement(d.sessions) : declaredPlacement;
      const intent = override ?? (missing.length > 0 ? undefined : composed ? (placement === undefined ? undefined : { ...(d.intent as CompositionBase), archetypeId: placement }) : (d.intent as DeclaredIntent));
      requests.push({ requestId: `${input.weekStart}.${d.sport}.${String(k)}`, sport: d.sport, missing, composed, final: !composed, ...(intent ? { intent } : {}), ...(d.station === undefined ? {} : { station: d.station }) });
    }
  }
  const compositionOf = new Map<string, { applied: AppliedComposition; reasons: readonly ReasonCode[] }>();

  const results = new Map<string, RequestResult>();
  const conflicts: ReasonCode[] = [];
  const CATEGORY_OF: Readonly<Record<RefusalClass, RequestCategory>> = {
    retryable_slot_constraint: 'slot_unavailable', safety_blocked: 'safety_blocked', governance_blocked: 'governance_blocked', invalid_intent: 'invalid_intent', non_retryable_engine_refusal: 'engine_refused',
  };
  const refusedCategory = (reasons: readonly ReasonCode[]): RequestCategory => CATEGORY_OF[classifyRefusal(reasons)];
  const conflictCategory = (requestId: string, sport: PlannerSport, tried: readonly string[]): RequestCategory => {
    const own = conflicts.filter((c) => c.params.sport === sport && tried.includes(String(c.params.date)));
    return own.length > 0 && own.every((c) => GOVERNANCE_RULE.test(String(c.params.rule))) ? 'governance_blocked' : 'interference_conflict';
  };
  const plannedResult = (r: { requestId: string; sport: PlannerSport }, date: string, out: Extract<PortOutcome, { status: 'planned' }>, p: Placed, n?: NeighbourContext): RequestResult => {
    const c = compositionOf.get(r.requestId);
    return {
      ...r, status: 'planned', category: 'planned', date, session: out.session, ...(out.fingerprint ? { fingerprint: out.fingerprint } : {}), record: out.record, demand: p.demand,
      ...(n ? { neighbourContext: n } : {}), ...(c ? { composition: c.applied } : {}),
      reasons: [gpReasons.emit(GP_CODES.PLACED, { sport: r.sport, requestId: r.requestId, date }), ...(c?.reasons ?? []), ...(n ? [neighbourReason(r.requestId, n)] : []), ...weekReason(r.sport, date, r.requestId), ...out.reasons],
    };
  };

  for (const r of requests) {
    const base = { requestId: r.requestId, sport: r.sport };
    const blocked = r.composed ? compositionBlocked.get(r.sport) : undefined;
    if (blocked) { results.set(r.requestId, { ...base, status: 'unplaced', category: 'governance_blocked', reasons: blocked }); continue; }
    if (!r.intent) { results.set(r.requestId, { ...base, status: 'unplaced', category: 'programme_intent_incomplete', reasons: [gpReasons.emit(GP_CODES.PROGRAMME_INTENT_INCOMPLETE, { sport: r.sport, missing: r.missing })] }); continue; }
    const port = ports[r.sport];
    if (!port) { results.set(r.requestId, { ...base, status: 'unplaced', category: 'engine_unavailable', reasons: [gpReasons.emit(GP_CODES.ENGINE_UNAVAILABLE, { sport: r.sport })] }); continue; }
    const takenIdx = [...placed.values()].map((x) => dates.indexOf(x.date));
    const gap = (d: string): number => (takenIdx.length === 0 ? 0 : Math.min(...takenIdx.map((i) => Math.abs(i - dates.indexOf(d)))));
    const taken = new Set([...placed.values()].map((x) => x.date));
    const candidates = dates.filter((d) => !taken.has(d) && (minutes.get(d) ?? 0) > 0).sort((a, b) => gap(b) - gap(a) || (a < b ? -1 : 1));
    if (candidates.length === 0) { results.set(r.requestId, { ...base, status: 'unplaced', category: 'slot_unavailable', reasons: [gpReasons.emit(GP_CODES.NOT_ENOUGH_DAYS, { sport: r.sport, requestId: r.requestId })] }); continue; }
    let done = false;
    const tried: string[] = [];
    // Réessai BORNÉ : seulement après un refus dû au SEUL créneau, et seulement vers un créneau plus long ;
    // la demande (sport, intention, station, graine propre au jour) n'est jamais modifiée.
    let slotRetry: { minutes: number; trace: ReasonCode[]; last: { date: string; reasons: readonly ReasonCode[] } } | undefined;
    for (const date of candidates) {
      if (slotRetry && (minutes.get(date) ?? 0) <= slotRetry.minutes) continue;
      tried.push(date);
      const out = port.generate({ requestId: r.requestId, date, availableMinutes: minutes.get(date) ?? 0, hybrid, seed: `planner:${r.requestId}:${date}`, intent: r.intent, ...weekArg(r.sport, date, r.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
      if (out.status === 'refused') {
        if (classifyRefusal(out.reasons) === 'retryable_slot_constraint') {
          const m = minutes.get(date) ?? 0;
          const note = gpReasons.emit(GP_CODES.SLOT_RETRY, { sport: r.sport, requestId: r.requestId, fromDate: date, fromMinutes: m, causes: out.reasons.map((x) => x.code) });
          slotRetry = { minutes: Math.max(m, slotRetry?.minutes ?? 0), trace: [...(slotRetry?.trace ?? []), note], last: { date, reasons: out.reasons } };
          continue;
        }
        const reasons = [...(slotRetry?.trace ?? []), gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date }), ...out.reasons];
        results.set(r.requestId, { ...base, status: 'refused', category: refusedCategory(out.reasons), date, reasons });
        done = true;
        break;
      }
      const structures = port.structures(out.session);
      const found = conflictsOf(r.sport, date, structures);
      conflicts.push(...found, ...(structures.ok ? [] : structures.reasons));
      if (found.length > 0) continue;
      const p: Placed = { sport: r.sport, date, requestId: r.requestId, stimulus: r.intent.stimulus, archetypeId: r.intent.archetypeId, session: out.session, ...(out.fingerprint ? { fingerprint: out.fingerprint } : {}), structures, demand: port.demand(out.session, input.mode) };
      placed.set(r.requestId, p);
      const placedResult = plannedResult(base, date, out, p);
      results.set(r.requestId, slotRetry ? { ...placedResult, reasons: [...slotRetry.trace, ...placedResult.reasons] } : placedResult);
      done = true;
      break;
    }
    if (!done && slotRetry && !tried.some((d) => conflicts.some((c) => c.params.sport === r.sport && c.params.date === d))) {
      // Aucun créneau assez long : refus du moteur conservé (dernier créneau essayé), tentatives tracées.
      const { date, reasons } = slotRetry.last;
      results.set(r.requestId, { ...base, status: 'refused', category: 'slot_unavailable', date, reasons: [...slotRetry.trace, gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date }), ...reasons] });
      done = true;
    }
    if (!done) results.set(r.requestId, { ...base, status: 'unplaced', category: conflictCategory(r.requestId, r.sport, tried), reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: tried })] });
  }

  // Passe de composition : le MOTEUR choisit l'archétype de chaque jour réservé à son sport (sonde = génération
  // réelle) ; une séance déclarée (surcharge du programme, ex. évaluation) est verrouillée, jamais doublée. Chaque
  // séance composée est régénérée sur son jour (même graine) puis revérifiée (G4).
  for (const d of input.demands) {
    const port = ports[d.sport];
    const comp = port?.composition;
    if (d.composition !== 'engine' || !port || !comp || compositionBlocked.has(d.sport)) continue;
    const own = requests.filter((r) => r.sport === d.sport && placed.has(r.requestId));
    if (!own.some((r) => r.composed)) continue;
    const days = own.map((r) => {
      const p = placed.get(r.requestId) as Placed;
      return { date: p.date, availableMinutes: minutes.get(p.date) ?? 0, requestId: r.requestId, ...(r.composed || !r.intent ? {} : { locked: r.intent }) };
    }).sort((a, b) => (a.date < b.date ? -1 : 1));
    const res = comp.compose({ days, base: d.intent as CompositionBase, hybrid, mode: input.mode, weeklySessions: d.sessions });
    // Régénération dans l'ORDRE DES DATES : chaque séance composée connaît les séances de sa discipline placées avant elle.
    const dateOf = (x: Request): string => placed.get(x.requestId)?.date ?? '';
    for (const r of own.filter((x) => x.composed).sort((a, b) => (dateOf(a) < dateOf(b) ? -1 : dateOf(a) > dateOf(b) ? 1 : 0))) {
      const p = placed.get(r.requestId) as Placed;
      const base = { requestId: r.requestId, sport: r.sport };
      const slot = res.status === 'composed' ? res.days.find((x) => x.date === p.date) : undefined;
      if (res.status === 'unresolved' || !slot) {
        placed.delete(r.requestId);
        results.set(r.requestId, { ...base, status: 'unplaced', category: 'governance_blocked', reasons: [gpReasons.emit(GP_CODES.COMPOSITION_UNRESOLVED, { sport: r.sport, mode: input.mode }), ...res.reasons] });
        continue;
      }
      r.intent = slot.intent;
      r.final = true;
      compositionOf.set(r.requestId, { applied: { authority: res.status === 'composed' ? res.authority : 'provisional', role: slot.role }, reasons: [gpReasons.emit(GP_CODES.COMPOSITION_APPLIED, { sport: r.sport, authority: res.authority, role: slot.role, archetypeId: slot.intent.archetypeId }), ...res.reasons] });
      const out = port.generate({ requestId: r.requestId, date: p.date, availableMinutes: minutes.get(p.date) ?? 0, hybrid, seed: `planner:${r.requestId}:${p.date}`, intent: slot.intent, ...weekArg(r.sport, p.date, r.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
      if (out.status === 'refused') {
        placed.delete(r.requestId);
        results.set(r.requestId, { ...base, status: 'refused', category: refusedCategory(out.reasons), date: p.date, reasons: [gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date: p.date }), ...out.reasons] });
        continue;
      }
      const structures = port.structures(out.session);
      const found = conflictsOf(r.sport, p.date, structures, r.requestId);
      conflicts.push(...found);
      if (found.length > 0) {
        placed.delete(r.requestId);
        results.set(r.requestId, { ...base, status: 'unplaced', category: conflictCategory(r.requestId, r.sport, [p.date]), reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: [p.date] })] });
        continue;
      }
      const next: Placed = { ...withFingerprint(p, out.fingerprint), stimulus: slot.intent.stimulus, archetypeId: slot.intent.archetypeId, session: out.session, structures, demand: port.demand(out.session, input.mode) };
      placed.set(r.requestId, next);
      results.set(r.requestId, plannedResult(base, p.date, out, next));
    }
  }

  // Seconde passe : contexte voisin pour les moteurs consommateurs (multisport seulement ; mono-sport inchangé).
  if (hybrid) {
    // Ordre des dates (séquence intra-semaine) : la séance régénérée connaît les versions définitives des précédentes.
    const at = (x: Request): string => placed.get(x.requestId)?.date ?? '';
    for (const r of [...requests].sort((a, b) => (at(a) < at(b) ? -1 : at(a) > at(b) ? 1 : 0))) {
      const p = placed.get(r.requestId);
      const port = ports[r.sport];
      if (!p || !port?.consumesNeighbours || !r.intent) continue;
      const n = neighboursOf(r.sport, p.date, r.requestId);
      const out = port.generate({ requestId: r.requestId, date: p.date, availableMinutes: minutes.get(p.date) ?? 0, hybrid, seed: `planner:${r.requestId}:${p.date}`, intent: r.intent, neighbours: n, ...weekArg(r.sport, p.date, r.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
      const base = { requestId: r.requestId, sport: r.sport };
      if (out.status === 'refused') {
        placed.delete(r.requestId);
        results.set(r.requestId, { ...base, status: 'refused', category: refusedCategory(out.reasons), date: p.date, reasons: [gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date: p.date }), neighbourReason(r.requestId, n), ...out.reasons] });
        continue;
      }
      const structures = port.structures(out.session);
      const found = conflictsOf(r.sport, p.date, structures, r.requestId);
      conflicts.push(...found);
      if (found.length > 0) {
        placed.delete(r.requestId);
        results.set(r.requestId, { ...base, status: 'unplaced', category: conflictCategory(r.requestId, r.sport, [p.date]), reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: [p.date] })] });
        continue;
      }
      const next: Placed = { ...withFingerprint(p, out.fingerprint), session: out.session, structures, demand: port.demand(out.session, input.mode) };
      placed.set(r.requestId, next);
      results.set(r.requestId, plannedResult(base, p.date, out, next, n));
    }
  }

  // Même discipline : signalement NON BLOQUANT (aucune fenêtre gouvernée), séance précédente de la discipline seulement.
  for (const p of placed.values()) {
    const prev = all().filter((x) => x.sport === p.sport && x.requestId !== p.requestId && x.date < p.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const res = results.get(p.requestId);
    if (!prev || !res || res.status !== 'planned') continue;
    const shared = p.structures.ok && prev.structures.ok ? p.structures.structures.filter((x) => (prev.structures.ok ? prev.structures.structures : []).includes(x)) : [];
    if (shared.length === 0) continue;
    const note = gpReasons.emit(GP_CODES.SAME_DISCIPLINE_UNGOVERNED, { sport: p.sport, requestId: p.requestId, date: p.date, withRequestId: prev.requestId, withDate: prev.date, gapHours: Math.abs(hoursOf(p.date) - hoursOf(prev.date)), structures: shared });
    results.set(p.requestId, { ...res, reasons: [...res.reasons, note] });
  }

  const byDate = new Map([...placed.values()].map((p) => [p.date, p]));
  const days: DayResult[] = input.days.map((d) => {
    const t = byDate.get(d.date);
    if (t) return { date: d.date, availableMinutes: d.availableMinutes, status: 'planned', sport: t.sport, requestId: t.requestId };
    return { date: d.date, availableMinutes: d.availableMinutes, status: 'empty', reason: gpReasons.emit(GP_CODES.DAY_EMPTY, { date: d.date, cause: d.availableMinutes === 0 ? 'UNAVAILABLE' : 'NO_SESSION_PLACED' }) };
  });
  return {
    weekStart: input.weekStart, mode: input.mode, hybrid, days,
    // Intention RÉELLEMENT utilisée : déclarée, surchargée ou composée (jamais l'archétype de simple réservation).
    requests: requests.flatMap((r) => { const x = results.get(r.requestId); return x ? [r.final && r.intent ? { ...x, intent: r.intent } : x] : []; }),
    conflicts, governance: hybrid ? windows.reasons : [],
  };
}

function neighbourReason(requestId: string, n: NeighbourContext): ReasonCode {
  return gpReasons.emit(GP_CODES.NEIGHBOUR_CONTEXT, { requestId, known: String(n.known), neighbours: n.neighbours.length, unknown: [] });
}

/** Empreinte de la séance régénérée (aucune empreinte héritée d'une version précédente). */
function withFingerprint(p: Placed, fingerprint: SessionFingerprint | undefined): Placed {
  const { fingerprint: _old, ...rest } = p;
  return fingerprint ? { ...rest, fingerprint } : rest;
}
