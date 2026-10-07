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
import type { AppliedComposition, DayResult, DeclaredIntent, DemandOutcome, M3Arbitration, NeighbourContext, PlannedWeek, PlannerClock, PlannerInput, PlannerSport, RequestCategory, RequestResult, UnplacedComposition } from './model.js';
import { compareConflicts, conflictId, detectConflicts, unknownDemand as m3UnknownDemand, yielderOf } from './m3-analysis.js';
import type { M3Conflict, M3Importance, M3Node, M3Origin } from './m3-analysis.js';
import { readM3Policy, readNeighbourWindow } from './m3-policy.js';
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
  /** Historique : statut connu (réalisée, abandonnée, manquée, prévue). */
  readonly status?: 'executed' | 'abandoned' | 'missed' | 'planned';
}

type Applied = { readonly action: 'MOVE' | 'SWAP' | 'RECOMPOSE'; readonly from: string; readonly to: string; readonly partner?: string };

export function planMultisportWeek(raw: PlannerInput, ports: SportPorts, governance: LoadedRuleset | undefined, clock: PlannerClock): PlannedWeek {
  const input = zPlannerInput.parse(raw);
  const hybrid = input.demands.length > 1;
  const windows = readPlannerParam(governance, 'planner.interference.structureWindows', input.mode);
  // M3 — fenêtre d'INTERFÉRENCE des voisines (si gouvernée) : au-delà, une voisine n'est plus transmise aux moteurs.
  const neighbourWindow = hybrid ? readNeighbourWindow(governance, input.mode) : { hours: undefined, reasons: [] };
  const m3Policy = hybrid ? readM3Policy(governance, input.mode) : undefined;
  // Importance transportée aux moteurs seulement si la politique M3 est gouvernée (sinon : contexte V2 inchangé).
  const importanceKnown = m3Policy?.ok === true && m3Policy.policy.importance !== null;
  const hoursOf = (d: string): number => Date.parse(clock.instantOf(d)) / MS_PER_HOUR;
  const dates = input.days.map((d) => d.date);
  const minutes = new Map(input.days.map((d) => [d.date, d.availableMinutes]));

  const unknownStructures = (sport: PlannerSport): StructuresResult => ({ ok: false, reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: 'ENGINE_UNAVAILABLE' })] });
  const unknownDemand = (sport: PlannerSport): DemandOutcome => ({ status: 'unavailable', reasons: [gpReasons.emit(GP_CODES.STRUCTURES_UNAVAILABLE, { sport, cause: 'ENGINE_UNAVAILABLE' })] });
  // Historique : séances antérieures, structures et profils dérivés par le port de leur discipline.
  const history: Placed[] = input.recent.map((r, i) => {
    const s = r.session as SessionDraft;
    const port = ports[r.sport];
    return { sport: r.sport, date: r.date, requestId: `history.${String(i)}`, stimulus: 'history', session: s, structures: port?.structures(s) ?? unknownStructures(r.sport), demand: port?.demand(s, input.mode) ?? unknownDemand(r.sport), status: r.status ?? 'planned' };
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
    .filter((p) => p.sport === sport && p.requestId !== requestId && (p.date < date || ports[sport]?.weekSessionsScope === 'generated'))
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

  /**
   * Contexte voisin d'une séance : profils dérivés des séances d'AUTRES disciplines (semaine + historique), bornés par
   * la fenêtre d'interférence M3 si elle est gouvernée (sinon : toutes, comportement V2). `keyOverride` : voisine
   * signalée comme importante pour une recomposition demandée par l'arbitrage.
   */
  const neighboursOf = (sport: PlannerSport, date: string, requestId: string, keyOverride?: string): NeighbourContext => {
    const others = all().filter((p) => p.sport !== sport && p.requestId !== requestId)
      .filter((p) => neighbourWindow.hours === undefined || Math.abs(hoursOf(p.date) - hoursOf(date)) <= neighbourWindow.hours);
    const neighbours = others.flatMap((p) => (p.demand.status === 'derived'
      ? [{ sport: p.sport, discipline: ports[p.sport]?.discipline ?? p.sport, stimulus: p.stimulus, hoursFromThisSession: hoursOf(p.date) - hoursOf(date), demand: p.demand.levels, ...(importanceKnown ? { importance: p.requestId === keyOverride ? 'key' as const : importanceOf(p) } : keyOverride === undefined ? {} : { importance: p.requestId === keyOverride ? 'key' as const : 'unknown' as const }) }]
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

  /**
   * M3.1 — demande non placée faute de JOUR (créneaux insuffisants, interférence) : la prescription produite par SON
   * moteur est conservée avec son créneau de RÉFÉRENCE (jamais un placement). Une génération déjà faite sur un jour
   * essayé est réutilisée telle quelle ; sinon le moteur compose sur le jour disponible le plus long. Refus du moteur
   * ⇒ aucune prescription (la demande reste BLOCKED, refus tracé). Rien n'est inventé.
   */
  const composeUnplaced = (r: Request, done?: { date: string; out: Extract<PortOutcome, { status: 'planned' }> }): { composed?: UnplacedComposition; reasons: ReasonCode[] } => {
    const port = ports[r.sport];
    if (!port || !r.intent) return { reasons: [] };
    const toComposition = (date: string, out: Extract<PortOutcome, { status: 'planned' }>): UnplacedComposition => ({
      referenceDate: date, availableMinutes: minutes.get(date) ?? 0, session: out.session, ...(out.fingerprint ? { fingerprint: out.fingerprint } : {}), record: out.record, demand: port.demand(out.session, input.mode),
    });
    // Raisons de composition du moteur conservées avec la prescription (décisions persistées, comme une séance placée).
    if (done) return { composed: toComposition(done.date, done.out), reasons: [...done.out.reasons] };
    const ref = [...dates].filter((d) => (minutes.get(d) ?? 0) > 0).sort((a, b) => (minutes.get(b) ?? 0) - (minutes.get(a) ?? 0) || (a < b ? -1 : 1))[0];
    if (ref === undefined) return { reasons: [] };
    const out = port.generate({ requestId: r.requestId, date: ref, availableMinutes: minutes.get(ref) ?? 0, hybrid, seed: `planner:${r.requestId}:${ref}`, intent: r.intent, ...weekArg(r.sport, ref, r.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
    return out.status === 'planned' ? { composed: toComposition(ref, out), reasons: [...out.reasons] } : { reasons: [gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date: ref }), ...out.reasons] };
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
    if (candidates.length === 0) {
      const u = composeUnplaced(r);
      results.set(r.requestId, { ...base, status: 'unplaced', category: 'slot_unavailable', reasons: [gpReasons.emit(GP_CODES.NOT_ENOUGH_DAYS, { sport: r.sport, requestId: r.requestId }), ...u.reasons], ...(u.composed ? { composed: u.composed } : {}) });
      continue;
    }
    let done = false;
    const tried: string[] = [];
    // Première génération rejetée pour interférence (jour le mieux espacé) : conservée si aucun jour n'est trouvé.
    let firstRejected: { date: string; out: Extract<PortOutcome, { status: 'planned' }> } | undefined;
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
      if (found.length > 0) { firstRejected ??= { date, out }; continue; }
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
    if (!done) {
      const category = conflictCategory(r.requestId, r.sport, tried);
      // Interférence seule : prescription conservée ; règle d'interférence non gouvernée ⇒ BLOCKED (aucune prescription).
      const u = category === 'interference_conflict' ? composeUnplaced(r, firstRejected) : { reasons: [] };
      results.set(r.requestId, { ...base, status: 'unplaced', category, reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: tried }), ...u.reasons], ...(u.composed ? { composed: u.composed } : {}) });
    }
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
        const category = conflictCategory(r.requestId, r.sport, [p.date]);
        const u = category === 'interference_conflict' ? composeUnplaced(r, { date: p.date, out }) : { reasons: [] };
        results.set(r.requestId, { ...base, status: 'unplaced', category, reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: [p.date] }), ...u.reasons], ...(u.composed ? { composed: u.composed } : {}) });
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
        const category = conflictCategory(r.requestId, r.sport, [p.date]);
        const u = category === 'interference_conflict' ? composeUnplaced(r, { date: p.date, out }) : { reasons: [] };
        results.set(r.requestId, { ...base, status: 'unplaced', category, reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: [p.date] }), ...u.reasons], ...(u.composed ? { composed: u.composed } : {}) });
        continue;
      }
      const next: Placed = { ...withFingerprint(p, out.fingerprint), session: out.session, structures, demand: port.demand(out.session, input.mode) };
      placed.set(r.requestId, next);
      results.set(r.requestId, plannedResult(base, p.date, out, next, n));
    }
  }

  // ——— M3 : ARBITRAGE de la semaine (multisport) ———
  const arbitration = hybrid ? arbitrate() : undefined;

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
    requests: requests.flatMap((r) => { const x = results.get(r.requestId); return x ? [(r.final || (x.status === 'unplaced' && x.composed !== undefined)) && r.intent ? { ...x, intent: r.intent } : x] : []; }),
    conflicts, governance: hybrid ? [...windows.reasons, ...neighbourWindow.reasons] : [],
    ...(arbitration ? { arbitration } : {}),
  };

  /** Importance d'une séance : table gouvernée (rôle composé, sinon archétype déclaré) ; sinon `unknown`. */
  function importanceOf(p: Placed): M3Importance {
    // Clé de la table : rôle de composition du moteur, sinon archétype DÉCLARÉ par le programme (ex. rôle HYROX H2).
    const role = compositionOf.get(p.requestId)?.applied.role;
    const table = m3Policy?.ok ? m3Policy.policy.importance?.[p.sport] : undefined;
    return (role === undefined ? undefined : table?.[role]) ?? (p.archetypeId === undefined ? undefined : table?.[p.archetypeId]) ?? 'unknown';
  }

  /**
   * Ordre de COMPOSITION préservé : une séance composée par son moteur (rôle dans la semaine) ne peut être placée que
   * entre la séance précédente et la suivante de son sport (l'ordre choisi par le moteur n'est jamais réécrit ici).
   */
  function keepsComposedOrder(requestId: string, date: string, swapWith?: string): boolean {
    const p = placed.get(requestId);
    if (!p || !compositionOf.has(requestId)) return true;
    // Échanger deux séances composées du même sport inverserait leurs rôles : refusé.
    if (swapWith !== undefined && placed.get(swapWith)?.sport === p.sport) return false;
    const own = [...placed.values()].filter((x) => x.sport === p.sport && x.requestId !== requestId && x.requestId !== swapWith);
    const before = own.filter((x) => x.date < p.date).map((x) => x.date);
    const after = own.filter((x) => x.date > p.date).map((x) => x.date);
    return before.every((d) => d < date) && after.every((d) => d > date);
  }

  /**
   * Boucle d'arbitrage BORNÉE et déterministe : conflits gouvernés (profils CORE, distance, règles) → séance qui cède
   * (politique : importance, puis priorité du sport) → actions AUTORISÉES dans l'ordre gouverné (MOVE : autre jour
   * libre et disponible, aucun nouveau conflit G4 ni M3 ; RECOMPOSE : le MOTEUR recompose avec la voisine en conflit
   * signalée importante — il décide seul comment) → sinon conflit RÉSIDUEL conservé et visible (jamais de suppression).
   * Arrêt : semaine admissible, aucune amélioration possible, état déjà vu (boucle), ou borne de passes atteinte.
   */
  function arbitrate(): M3Arbitration {
    const empty = { passes: 0, initial: [], decisions: [], residual: [] };
    if (!m3Policy?.ok) return { ...empty, status: 'POLICY_UNAVAILABLE', policyVersion: null, reasons: [gpReasons.emit(GP_CODES.M3_ARBITRATION_BLOCKED, { cause: 'POLICY_UNAVAILABLE', detail: 'planner.m3.*' }), ...(m3Policy?.reasons ?? [])] };
    const P = m3Policy.policy;
    const rankOf = (sport: PlannerSport): number => input.demands.findIndex((d) => d.sport === sport);
    const originOf = (p: Placed): M3Origin => (p.status === undefined ? 'planned' : p.status === 'planned' ? 'history_planned' : p.status);
    const nodes = (): M3Node[] => [
      ...history.filter((h) => P.historyStatuses.includes(h.status ?? 'planned')),
      ...placed.values(),
    ].map((p) => ({ requestId: p.requestId, sport: p.sport, date: p.date, hours: hoursOf(p.date), rank: rankOf(p.sport), importance: importanceOf(p), origin: originOf(p), demand: p.demand.status === 'derived' ? p.demand.levels : null }));
    const detect = (): M3Conflict[] => detectConflicts(nodes(), P.pairRules, P.accumulationRules).sort(compareConflicts);
    const unknown = m3UnknownDemand(nodes());
    if (unknown.length > 0) return { ...empty, status: 'BLOCKED', policyVersion: P.version, reasons: [gpReasons.emit(GP_CODES.M3_ARBITRATION_BLOCKED, { cause: 'DEMAND_UNAVAILABLE', detail: unknown.join(',') })] };
    const initial = detect();
    const decisions: M3Arbitration['decisions'][number][] = [];
    const attempts = new Map<string, { cause: string; tried: string[] }>();
    const signature = (): string => [...placed.values()].map((p) => `${p.requestId}@${p.date}#${JSON.stringify(p.session.blocks)}`).sort().join(';');
    const seen = new Set<string>([signature()]);
    let passes = 0;
    let loop = false;
    while (passes < P.maxPasses) {
      const open = detect().filter((c) => !attempts.has(conflictId(c)));
      const c = open[0];
      if (!c) break;
      const map = new Map(nodes().map((n) => [n.requestId, n]));
      const y = yielderOf(c, map, P.yieldOrder);
      if (!y.node) { attempts.set(conflictId(c), { cause: `NO_YIELDER:${y.why.join('+')}`, tried: [] }); continue; }
      const tried: string[] = [];
      let applied: Applied | undefined;
      for (const action of P.actions) {
        applied = action === 'MOVE' ? tryMove(y.node, c, map, tried) : action === 'SWAP' ? trySwap(y.node, c, map, tried) : tryRecompose(y.node, c, tried);
        if (applied) break;
      }
      if (!applied) { attempts.set(conflictId(c), { cause: P.actions.length === 0 ? 'NO_ACTION_AUTHORIZED' : 'NO_ACTION_RESOLVES', tried }); continue; }
      // Une passe = une décision appliquée (un essai sans effet est fini : il marque le conflit comme examiné).
      passes += 1;
      const why = [...y.why, `rule:${c.rule}`, `structure:${c.structure}`, `delta:${String(c.deltaHours)}h`];
      decisions.push({ ...applied, requestId: y.node.requestId, conflict: conflictId(c), why });
      const other = c.members.find((m) => m !== y.node?.requestId) ?? '';
      const note = (id: string, sport: string, from: string, to: string, w: readonly string[]): void => {
        const res = results.get(id);
        if (res) results.set(id, { ...res, reasons: [...res.reasons, gpReasons.emit(GP_CODES.M3_DECISION, { action: applied?.action ?? '', requestId: id, sport, from, to, rule: c.rule, structure: c.structure, withRequestId: other, deltaHours: c.deltaHours, why: [...w] })] });
      };
      note(y.node.requestId, y.node.sport, applied.from, applied.to, why);
      const partner = applied.partner === undefined ? undefined : placed.get(applied.partner);
      // SWAP : la séance partenaire porte aussi la décision (jour échangé, jamais silencieux).
      if (partner) note(partner.requestId, partner.sport, applied.to, applied.from, [`swap_partner_of:${y.node.requestId}`]);
      const sig = signature();
      if (seen.has(sig)) { loop = true; break; }
      seen.add(sig);
    }
    const refreshed = decisions.length > 0 ? refreshConsumers(new Set(decisions.flatMap((d) => (d.partner === undefined ? [d.requestId] : [d.requestId, d.partner])))) : [];
    const final = detect();
    const residual = final.map((c) => {
      const a = attempts.get(conflictId(c));
      return { conflict: conflictId(c), cause: loop ? 'LOOP_DETECTED' : a?.cause ?? 'MAX_PASSES_REACHED', tried: a?.tried ?? [] };
    });
    // Conflit résiduel VISIBLE sur chaque séance planifiée concernée (jamais supprimée, jamais doublée).
    for (const c of final) {
      const r = residual.find((x) => x.conflict === conflictId(c));
      for (const m of c.members) {
        const res = results.get(m);
        if (!res || res.status !== 'planned') continue;
        const other = c.members.find((x) => x !== m) ?? '';
        results.set(m, { ...res, reasons: [...res.reasons, gpReasons.emit(GP_CODES.M3_CONFLICT_UNRESOLVED, { rule: c.rule, structure: c.structure, requestId: m, withRequestId: other, deltaHours: c.deltaHours, cause: r?.cause ?? '', tried: [...(r?.tried ?? [])] })] });
      }
    }
    const status: M3Arbitration['status'] = initial.length === 0 && refreshed.length === 0 ? 'ADMISSIBLE' : final.length === 0 && refreshed.length === 0 ? 'RESOLVED' : 'PARTIAL';
    return { status, passes, policyVersion: P.version, initial: initial.map(conflictId), decisions, residual: [...residual, ...refreshed], reasons: [...m3Policy.reasons] };
  }

  /**
   * Après une décision M3, les moteurs CONSOMMATEURS de voisines (hors séances décidées, déjà régénérées) reçoivent le
   * contexte à jour, dans l'ordre des dates. Une régénération qui créerait un conflit (G4 ou M3 nouveau) est refusée :
   * la version précédente est gardée et le contexte périmé est tracé comme résidu (jamais masqué).
   */
  function refreshConsumers(decided: ReadonlySet<string>): M3Arbitration['residual'][number][] {
    const out: M3Arbitration['residual'][number][] = [];
    const before = new Set(detect2().map(conflictId));
    for (const p of [...placed.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
      const port = ports[p.sport];
      const r = requests.find((x) => x.requestId === p.requestId);
      const res = results.get(p.requestId);
      if (decided.has(p.requestId) || !port?.consumesNeighbours || !r?.intent || res?.status !== 'planned') continue;
      const n = neighboursOf(p.sport, p.date, p.requestId);
      if (JSON.stringify(n) === JSON.stringify(res.neighbourContext)) continue;
      const out1 = port.generate({ requestId: p.requestId, date: p.date, availableMinutes: minutes.get(p.date) ?? 0, hybrid, seed: `planner:${p.requestId}:${p.date}`, intent: r.intent, neighbours: n, ...weekArg(p.sport, p.date, p.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
      const stale = (cause: string): void => { out.push({ conflict: `NEIGHBOUR_REFRESH|${p.requestId}`, cause, tried: [] }); };
      if (out1.status === 'refused') { stale('REFRESH_ENGINE_REFUSED'); continue; }
      const structures = port.structures(out1.session);
      if (conflictsOf(p.sport, p.date, structures, p.requestId).length > 0) { stale('REFRESH_G4_CONFLICT'); continue; }
      const next: Placed = { ...withFingerprint(p, out1.fingerprint), session: out1.session, structures, demand: port.demand(out1.session, input.mode) };
      placed.set(p.requestId, next);
      if (detect2().some((x) => !before.has(conflictId(x)))) { placed.set(p.requestId, p); stale('REFRESH_NEW_M3_CONFLICT'); continue; }
      const kept = res.reasons.filter((x) => x.code === GP_CODES.M3_DECISION);
      const fresh = plannedResult({ requestId: p.requestId, sport: p.sport }, p.date, out1, next, n);
      results.set(p.requestId, { ...fresh, reasons: [...fresh.reasons, ...kept] });
    }
    return out;
  }

  /** MOVE : la séance qui cède est régénérée par SON moteur sur un autre jour libre et disponible, sans nouveau conflit. */
  function tryMove(n: M3Node, c: M3Conflict, map: ReadonlyMap<string, M3Node>, tried: string[]): Applied | undefined {
    const p = placed.get(n.requestId);
    const r = requests.find((x) => x.requestId === n.requestId);
    const port = ports[n.sport];
    if (!p || !r?.intent || !port) return undefined;
    const others = c.members.filter((m) => m !== n.requestId).map((m) => map.get(m)).filter((x): x is M3Node => x !== undefined);
    const taken = new Set([...placed.values()].map((x) => x.date));
    const spread = (d: string): number => Math.min(...others.map((o) => Math.abs(hoursOf(d) - o.hours)));
    const free = dates.filter((d) => !taken.has(d) && (minutes.get(d) ?? 0) > 0);
    const candidates = free.filter((d) => keepsComposedOrder(n.requestId, d)).sort((a, b) => spread(b) - spread(a) || (a < b ? -1 : 1));
    if (free.length === 0) tried.push('MOVE:NO_FREE_DAY');
    else if (candidates.length === 0) tried.push('MOVE:COMPOSITION_ORDER');
    for (const d of candidates) {
      const nctx = hybrid && port.consumesNeighbours ? neighboursOf(n.sport, d, n.requestId) : undefined;
      const out = port.generate({ requestId: n.requestId, date: d, availableMinutes: minutes.get(d) ?? 0, hybrid, seed: `planner:${n.requestId}:${d}`, intent: r.intent, ...(nctx ? { neighbours: nctx } : {}), ...weekArg(n.sport, d, n.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
      if (out.status === 'refused') { tried.push(`MOVE:${d}:ENGINE_REFUSED`); continue; }
      const structures = port.structures(out.session);
      if (conflictsOf(n.sport, d, structures, n.requestId).length > 0) { tried.push(`MOVE:${d}:G4_CONFLICT`); continue; }
      const next: Placed = { ...withFingerprint(p, out.fingerprint), date: d, session: out.session, structures, demand: port.demand(out.session, input.mode) };
      placed.set(n.requestId, next);
      if (detect2().some((x) => x.members.includes(n.requestId))) { placed.set(n.requestId, p); tried.push(`MOVE:${d}:NEW_M3_CONFLICT`); continue; }
      results.set(n.requestId, plannedResult({ requestId: n.requestId, sport: n.sport }, d, out, next, nctx));
      return { action: 'MOVE', from: p.date, to: d };
    }
    return undefined;
  }

  /**
   * SWAP : la séance qui cède ÉCHANGE son jour avec une autre séance planifiée hors du conflit ; les DEUX sont
   * régénérées par leur moteur sur leur nouveau jour. Protection gouvernée (`protectPriority`) : jamais une séance clé,
   * jamais une séance d'un sport plus prioritaire. Aucun nouveau conflit G4 ni M3 sur l'une ou l'autre ; sinon rétabli.
   */
  function trySwap(n: M3Node, c: M3Conflict, map: ReadonlyMap<string, M3Node>, tried: string[]): Applied | undefined {
    const p = placed.get(n.requestId);
    if (!p || !m3Policy?.ok) return undefined;
    const protect = m3Policy.policy.protectPriority;
    const rankOf = (sport: PlannerSport): number => input.demands.findIndex((d) => d.sport === sport);
    const others = c.members.filter((m) => m !== n.requestId).map((m) => map.get(m)).filter((x): x is M3Node => x !== undefined);
    const spread = (d: string): number => Math.min(...others.map((o) => Math.abs(hoursOf(d) - o.hours)));
    const pool = [...placed.values()].filter((q) => q.requestId !== n.requestId && !c.members.includes(q.requestId));
    const allowed = pool.filter((q) => !protect || (importanceOf(q) !== 'key' && rankOf(q.sport) >= n.rank));
    const partners = allowed.filter((q) => keepsComposedOrder(n.requestId, q.date, q.requestId) && keepsComposedOrder(q.requestId, p.date, n.requestId))
      .sort((a, b) => spread(b.date) - spread(a.date) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (partners.length === 0) tried.push(pool.length === 0 ? 'SWAP:NO_PARTNER' : allowed.length === 0 ? 'SWAP:PRIORITY_PROTECTED' : 'SWAP:COMPOSITION_ORDER');
    const before = new Set(detect2().map(conflictId));
    for (const q of partners) {
      const a = regenerate(n.requestId, q.date);
      if (!a) { tried.push(`SWAP:${q.requestId}:ENGINE_REFUSED`); continue; }
      placed.set(n.requestId, a.next);
      const b = regenerate(q.requestId, p.date);
      if (!b) { placed.set(n.requestId, p); tried.push(`SWAP:${q.requestId}:PARTNER_REFUSED`); continue; }
      placed.set(q.requestId, b.next);
      const g4 = conflictsOf(n.sport, q.date, a.next.structures, n.requestId).length + conflictsOf(q.sport, p.date, b.next.structures, q.requestId).length;
      const fresh = g4 > 0 ? [] : detect2().filter((x) => !before.has(conflictId(x)) && (x.members.includes(n.requestId) || x.members.includes(q.requestId)));
      if (g4 > 0 || fresh.length > 0 || detect2().some((x) => conflictId(x) === conflictId(c))) {
        placed.set(n.requestId, p);
        placed.set(q.requestId, q);
        tried.push(`SWAP:${q.requestId}:${g4 > 0 ? 'G4_CONFLICT' : 'NEW_M3_CONFLICT'}`);
        continue;
      }
      results.set(n.requestId, plannedResult({ requestId: n.requestId, sport: n.sport }, q.date, a.out, a.next, a.n));
      results.set(q.requestId, plannedResult({ requestId: q.requestId, sport: q.sport }, p.date, b.out, b.next, b.n));
      return { action: 'SWAP', from: p.date, to: q.date, partner: q.requestId };
    }
    return undefined;
  }

  /** Régénération d'une séance placée sur `date` par SON moteur (aucun placement : l'appelant décide). */
  function regenerate(requestId: string, date: string): { out: Extract<PortOutcome, { status: 'planned' }>; next: Placed; n: NeighbourContext | undefined } | undefined {
    const p = placed.get(requestId);
    const r = requests.find((x) => x.requestId === requestId);
    const port = p ? ports[p.sport] : undefined;
    if (!p || !r?.intent || !port) return undefined;
    const n = port.consumesNeighbours ? neighboursOf(p.sport, date, requestId) : undefined;
    const out = port.generate({ requestId, date, availableMinutes: minutes.get(date) ?? 0, hybrid, seed: `planner:${requestId}:${date}`, intent: r.intent, ...(n ? { neighbours: n } : {}), ...weekArg(p.sport, date, requestId), ...(r.station === undefined ? {} : { station: r.station }) });
    if (out.status === 'refused') return undefined;
    const structures = port.structures(out.session);
    return { out, n, next: { ...withFingerprint(p, out.fingerprint), date, session: out.session, structures, demand: port.demand(out.session, input.mode) } };
  }

  /**
   * RECOMPOSE : seulement si le moteur CONSOMME un contexte voisin (levier existant). La voisine en conflit lui est
   * signalée importante ; il décide seul comment composer. Aucun effet ou conflit persistant ⇒ version initiale gardée.
   */
  function tryRecompose(n: M3Node, c: M3Conflict, tried: string[]): Applied | undefined {
    const p = placed.get(n.requestId);
    const r = requests.find((x) => x.requestId === n.requestId);
    const port = ports[n.sport];
    if (!p || !r?.intent || !port) return undefined;
    if (!port.consumesNeighbours) { tried.push('RECOMPOSE:NO_ENGINE_LEVER'); return undefined; }
    const other = c.members.find((m) => m !== n.requestId);
    const nctx = neighboursOf(n.sport, p.date, n.requestId, other);
    const out = port.generate({ requestId: n.requestId, date: p.date, availableMinutes: minutes.get(p.date) ?? 0, hybrid, seed: `planner:${n.requestId}:${p.date}`, intent: r.intent, neighbours: nctx, ...weekArg(n.sport, p.date, n.requestId), ...(r.station === undefined ? {} : { station: r.station }) });
    if (out.status === 'refused') { tried.push('RECOMPOSE:ENGINE_REFUSED'); return undefined; }
    if (JSON.stringify(out.session.blocks) === JSON.stringify(p.session.blocks)) { tried.push('RECOMPOSE:NO_EFFECT'); return undefined; }
    const structures = port.structures(out.session);
    if (conflictsOf(n.sport, p.date, structures, n.requestId).length > 0) { tried.push('RECOMPOSE:G4_CONFLICT'); return undefined; }
    const next: Placed = { ...withFingerprint(p, out.fingerprint), session: out.session, structures, demand: port.demand(out.session, input.mode) };
    placed.set(n.requestId, next);
    if (detect2().some((x) => conflictId(x) === conflictId(c) || (x.members.includes(n.requestId) && !x.members.every((m) => c.members.includes(m))))) {
      placed.set(n.requestId, p);
      tried.push('RECOMPOSE:CONFLICT_REMAINS');
      return undefined;
    }
    results.set(n.requestId, plannedResult({ requestId: n.requestId, sport: n.sport }, p.date, out, next, nctx));
    return { action: 'RECOMPOSE', from: p.date, to: p.date };
  }

  /** Conflits courants (mêmes règles que l'arbitrage), pour vérifier qu'une action n'en crée pas. */
  function detect2(): M3Conflict[] {
    if (!m3Policy?.ok) return [];
    const P = m3Policy.policy;
    const rankOf = (sport: PlannerSport): number => input.demands.findIndex((d) => d.sport === sport);
    const ns: M3Node[] = [...history.filter((h) => P.historyStatuses.includes(h.status ?? 'planned')), ...placed.values()].map((p) => ({
      requestId: p.requestId, sport: p.sport, date: p.date, hours: hoursOf(p.date), rank: rankOf(p.sport), importance: importanceOf(p),
      origin: p.status === undefined ? 'planned' : p.status === 'planned' ? 'history_planned' : p.status, demand: p.demand.status === 'derived' ? p.demand.levels : null,
    }));
    return detectConflicts(ns, P.pairRules, P.accumulationRules);
  }
}

function neighbourReason(requestId: string, n: NeighbourContext): ReasonCode {
  return gpReasons.emit(GP_CODES.NEIGHBOUR_CONTEXT, { requestId, known: String(n.known), neighbours: n.neighbours.length, unknown: [] });
}

/** Empreinte de la séance régénérée (aucune empreinte héritée d'une version précédente). */
function withFingerprint(p: Placed, fingerprint: SessionFingerprint | undefined): Placed {
  const { fingerprint: _old, ...rest } = p;
  return fingerprint ? { ...rest, fingerprint } : rest;
}
