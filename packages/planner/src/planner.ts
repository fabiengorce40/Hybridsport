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
 * SECONDE PASSE (contexte voisin) : les moteurs qui consomment un contexte voisin (Strength) sont rappelés avec les
 *   profils de demande STANDARD (dérivés par le CORE) des séances placées d'autres disciplines ; la séance obtenue
 *   est revérifiée (G4). Un profil non dérivable ⇒ contexte inconnu (comportement prudent du moteur).
 * ORDRE (départage, jamais un filtre) : priorité DÉCLARÉE (tour de rôle), jour le plus éloigné des séances déjà
 * placées, jour le plus tôt — critères du planificateur V0. Aucun nombre sportif n'est écrit ici.
 */
import type { ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { GP_CODES, gpReasons } from './codes.js';
import { readPlannerParam } from './governance.js';
import { INTENT_FIELDS, zPlannerInput } from './model.js';
import type { DayResult, DeclaredIntent, DemandOutcome, NeighbourContext, PlannedWeek, PlannerClock, PlannerInput, PlannerSport, RequestCategory, RequestResult } from './model.js';
import type { PortOutcome, SportPort, StructuresResult } from './ports.js';

// technical-constant: millisecondes par heure (conversion d'unités)
const MS_PER_HOUR = 3_600_000;
const STRUCTURE_RULE = 'planner.interference.structureWindows';
/** Familles de codes signalant une GOUVERNANCE manquante (et non un refus sur le fond) : classement applicatif. */
const GOVERNANCE_CODE = /HYBRID_PLANNER_UNAVAILABLE|CAPABILITY_DISABLED|G1_POLICY_UNSIGNED|^RULE\./;
const GOVERNANCE_RULE = /:UNAVAILABLE$|:UNGOVERNED_STRUCTURE$|^STRUCTURES_UNAVAILABLE$/;

export type SportPorts = Partial<Readonly<Record<PlannerSport, SportPort>>>;

interface Placed {
  readonly sport: PlannerSport;
  readonly date: string;
  readonly requestId: string;
  readonly stimulus: string;
  readonly session: SessionDraft;
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

  /** Contexte voisin d'une séance : profils dérivés des séances d'AUTRES disciplines (semaine + historique). */
  const neighboursOf = (sport: PlannerSport, date: string, requestId: string): NeighbourContext => {
    const others = all().filter((p) => p.sport !== sport && p.requestId !== requestId);
    const neighbours = others.flatMap((p) => (p.demand.status === 'derived'
      ? [{ sport: p.sport, discipline: ports[p.sport]?.discipline ?? p.sport, stimulus: p.stimulus, hoursFromThisSession: hoursOf(p.date) - hoursOf(date), demand: p.demand.levels }]
      : []));
    return { known: neighbours.length === others.length, neighbours };
  };

  // Demandes en tour de rôle selon l'ordre DÉCLARÉ ; intention de programme vérifiée (G0).
  const max = Math.max(0, ...input.demands.map((d) => d.sessions));
  const requests: { requestId: string; sport: PlannerSport; intent?: DeclaredIntent; missing: string[]; station?: string }[] = [];
  for (let k = 1; k <= max; k++) {
    for (const d of input.demands) {
      if (k > d.sessions) continue;
      const override = d.overrides.find((o) => o.index === k)?.intent;
      const missing = override ? [] : INTENT_FIELDS.filter((f) => d.intent[f] === undefined);
      const intent = override ?? (missing.length === 0 ? (d.intent as DeclaredIntent) : undefined);
      requests.push({ requestId: `${input.weekStart}.${d.sport}.${String(k)}`, sport: d.sport, missing, ...(intent ? { intent } : {}), ...(d.station === undefined ? {} : { station: d.station }) });
    }
  }

  const results = new Map<string, RequestResult>();
  const conflicts: ReasonCode[] = [];
  const refusedCategory = (reasons: readonly ReasonCode[]): RequestCategory => (reasons.some((r) => GOVERNANCE_CODE.test(r.code)) ? 'governance_blocked' : 'engine_refused');
  const conflictCategory = (requestId: string, sport: PlannerSport, tried: readonly string[]): RequestCategory => {
    const own = conflicts.filter((c) => c.params.sport === sport && tried.includes(String(c.params.date)));
    return own.length > 0 && own.every((c) => GOVERNANCE_RULE.test(String(c.params.rule))) ? 'governance_blocked' : 'interference_conflict';
  };
  const plannedResult = (r: { requestId: string; sport: PlannerSport }, date: string, out: Extract<PortOutcome, { status: 'planned' }>, p: Placed, n?: NeighbourContext): RequestResult => ({
    ...r, status: 'planned', category: 'planned', date, session: out.session, ...(out.fingerprint ? { fingerprint: out.fingerprint } : {}), record: out.record, demand: p.demand,
    ...(n ? { neighbourContext: n } : {}),
    reasons: [gpReasons.emit(GP_CODES.PLACED, { sport: r.sport, requestId: r.requestId, date }), ...(n ? [neighbourReason(r.requestId, n)] : []), ...out.reasons],
  });

  for (const r of requests) {
    const base = { requestId: r.requestId, sport: r.sport };
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
    for (const date of candidates) {
      tried.push(date);
      const out = port.generate({ requestId: r.requestId, date, availableMinutes: minutes.get(date) ?? 0, hybrid, seed: `planner:${r.requestId}:${date}`, intent: r.intent, ...(r.station === undefined ? {} : { station: r.station }) });
      if (out.status === 'refused') {
        const reasons = [gpReasons.emit(GP_CODES.ENGINE_REFUSED, { sport: r.sport, requestId: r.requestId, date }), ...out.reasons];
        results.set(r.requestId, { ...base, status: 'refused', category: refusedCategory(out.reasons), date, reasons });
        done = true;
        break;
      }
      const structures = port.structures(out.session);
      const found = conflictsOf(r.sport, date, structures);
      conflicts.push(...found, ...(structures.ok ? [] : structures.reasons));
      if (found.length > 0) continue;
      const p: Placed = { sport: r.sport, date, requestId: r.requestId, stimulus: r.intent.stimulus, session: out.session, structures, demand: port.demand(out.session, input.mode) };
      placed.set(r.requestId, p);
      results.set(r.requestId, plannedResult(base, date, out, p));
      done = true;
      break;
    }
    if (!done) results.set(r.requestId, { ...base, status: 'unplaced', category: conflictCategory(r.requestId, r.sport, tried), reasons: [gpReasons.emit(GP_CODES.INTERFERENCE_UNRESOLVED, { sport: r.sport, requestId: r.requestId, triedDates: tried })] });
  }

  // Seconde passe : contexte voisin pour les moteurs consommateurs (multisport seulement ; mono-sport inchangé).
  if (hybrid) {
    for (const r of requests) {
      const p = placed.get(r.requestId);
      const port = ports[r.sport];
      if (!p || !port?.consumesNeighbours || !r.intent) continue;
      const n = neighboursOf(r.sport, p.date, r.requestId);
      const out = port.generate({ requestId: r.requestId, date: p.date, availableMinutes: minutes.get(p.date) ?? 0, hybrid, seed: `planner:${r.requestId}:${p.date}`, intent: r.intent, neighbours: n, ...(r.station === undefined ? {} : { station: r.station }) });
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
      const next: Placed = { ...p, session: out.session, structures, demand: port.demand(out.session, input.mode) };
      placed.set(r.requestId, next);
      results.set(r.requestId, plannedResult(base, p.date, out, next, n));
    }
  }

  const byDate = new Map([...placed.values()].map((p) => [p.date, p]));
  const days: DayResult[] = input.days.map((d) => {
    const t = byDate.get(d.date);
    if (t) return { date: d.date, availableMinutes: d.availableMinutes, status: 'planned', sport: t.sport, requestId: t.requestId };
    return { date: d.date, availableMinutes: d.availableMinutes, status: 'empty', reason: gpReasons.emit(GP_CODES.DAY_EMPTY, { date: d.date, cause: d.availableMinutes === 0 ? 'UNAVAILABLE' : 'NO_SESSION_PLACED' }) };
  });
  return {
    weekStart: input.weekStart, mode: input.mode, hybrid, days,
    requests: requests.flatMap((r) => { const x = results.get(r.requestId); return x ? [x] : []; }),
    conflicts, governance: hybrid ? windows.reasons : [],
  };
}

function neighbourReason(requestId: string, n: NeighbourContext): ReasonCode {
  return gpReasons.emit(GP_CODES.NEIGHBOUR_CONTEXT, { requestId, known: String(n.known), neighbours: n.neighbours.length, unknown: [] });
}
