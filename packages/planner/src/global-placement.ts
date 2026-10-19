/**
 * RC4.4 (lot A, G5) — second passage de placement GLOBAL de la semaine, déclenché SEULEMENT par des Full Body à J/J+1.
 * Ce n'est PAS un score de charge : chaque organisation est décrite par un VECTEUR de critères existants (jamais agrégé
 * ni pondéré) ; une organisation n'est candidate que si elle domine le placement actuel critère par critère, puis
 * vérifiée par replanification réelle. Le placement actuel (`planCore`) reste la seule règle de placement.
 */
import type { DemandLevel, ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { LoadedRuleset } from '@hybridsport/engine';
import { GP_CODES, gpReasons } from './codes.js';
import { zPlannerInput } from './model.js';
import type { DeclaredIntent, PlannedWeek, PlannerClock, PlannerInput } from './model.js';
import { detectConflicts } from './m3-analysis.js';
import type { M3Node, M3Origin } from './m3-analysis.js';
import { readM3Policy } from './m3-policy.js';
import { planCore } from './planner.js';
import type { SportPorts } from './planner.js';

// technical-constant: millisecondes par heure (conversion d'unité)
const MS_PER_HOUR = 3_600_000;
// technical-constant: heures par jour (conversion d'unité)
const HOURS_PER_DAY = 24;

/** Full Body à J/J+1 d'une semaine planifiée : paires de séances des archétypes déclencheurs à un jour d'écart. */
export function fullBodyPairs(w: PlannedWeek, archetypeIds: readonly string[], dayOf: (d: string) => number): number {
  const fb = w.requests.flatMap((q) => (q.status === 'planned' && q.sport === 'strength' && archetypeIds.includes(q.intent?.archetypeId ?? '') ? [dayOf(q.date)] : [])).sort((a, b) => a - b);
  return fb.filter((x, i) => i > 0 && x - (fb[i - 1] as number) === 1).length;
}

/**
 * RC4.4 (G5) — second passage de placement GLOBAL, seulement si la semaine contient des Full Body à J/J+1.
 *
 * 1. Organisations COMPLÈTES de la semaine énumérées : une séance par jour disponible, séances d'un même sport
 *    interchangeables, AUCUNE séance retirée.
 * 2. Évaluation par les profils de demande RÉELS (une génération par sport et par jour, refus ⇒ jour impossible) et par
 *    des règles EXISTANTES seulement : conflits M3 gouvernés, Full Body J/J+1, séances de Musculation dans chaque bande
 *    de proximité GOUVERNÉE (`strength.interference.assessment`) d'une séance à demande `high` genou / hanche, jours
 *    consécutifs. Candidate ⇔ elle DOMINE le placement actuel.
 * 3. Garde RÉELLE : chaque candidate (au plus `maxCandidates`) est replanifiée par le chemin complet (composition,
 *    voisines, arbitrage M3, moteurs) et mesurée : conflits M3 restants (par séance), Full Body J/J+1, séries de travail
 *    PAR GROUPE musculaire (fonction du moteur Musculation), jours consécutifs. Retenue seulement si les Full Body J/J+1
 *    BAISSENT et si aucune mesure n'empire ; sinon le placement actuel est gardé (motif tracé).
 * Les moteurs prescrivent comme d'habitude : seul le JOUR des séances change ; sécurité et gouvernance inchangées.
 */
export function globalPlacement(raw: PlannerInput, ports: SportPorts, governance: LoadedRuleset | undefined, clock: PlannerClock, v0: PlannedWeek, cfg: { readonly archetypeIds: readonly string[]; readonly maxCandidates: number }, paramReasons: readonly ReasonCode[]): PlannedWeek {
  const input = zPlannerInput.parse(raw);
  const hoursOf = (d: string): number => Date.parse(clock.instantOf(d)) / MS_PER_HOUR;
  const dayOf = (d: string): number => Math.round(hoursOf(d) / HOURS_PER_DAY);
  const before = fullBodyPairs(v0, cfg.archetypeIds, dayOf);
  if (before === 0) return v0;
  // Full Body à J/J+1 gardés : motif porté par les séances concernées (raisons persistées) et par la trace de semaine.
  const fbAdjacent = (() => {
    const fb = v0.requests.flatMap((q) => (q.status === 'planned' && q.sport === 'strength' && cfg.archetypeIds.includes(q.intent?.archetypeId ?? '') ? [q] : [])).sort((a, b) => (a.date < b.date ? -1 : 1));
    return new Set(fb.flatMap((q, i) => { const p = fb[i - 1]; return p && dayOf(q.date) - dayOf(p.date) === 1 ? [p.requestId, q.requestId] : []; }));
  })();
  const kept = (cause: string, candidates: number): PlannedWeek => {
    const note = gpReasons.emit(GP_CODES.GLOBAL_PLACEMENT_KEPT, { cause, fullBody: before, candidates });
    return { ...v0, governance: [...v0.governance, ...paramReasons, note], requests: v0.requests.map((q) => (fbAdjacent.has(q.requestId) ? { ...q, reasons: [...q.reasons, note] } : q)) };
  };
  const policy = readM3Policy(governance, input.mode);
  const groupsOf = ports.strength?.plannedGroupSets;
  const bands = ports.strength?.proximityBandsHours?.() ?? [];
  if (!policy.ok) return kept('M3_POLICY_UNAVAILABLE', 0);
  if (!groupsOf) return kept('GROUP_VOLUME_UNAVAILABLE', 0);
  const planned = v0.requests.flatMap((q) => (q.status === 'planned' ? [q] : []));
  if (planned.length !== v0.requests.length) return kept('UNPLACED_SESSION', 0);
  const P = policy.policy;
  const days = input.days.filter((d) => d.availableMinutes > 0).map((d) => d.date).sort();
  // Profil de demande RÉEL par (sport, jour) : génération par le moteur (refus ⇒ jour impossible pour ce sport).
  const demandAt = new Map<string, Readonly<Record<string, DemandLevel>> | null>();
  for (const d of input.demands) {
    const port = ports[d.sport];
    if (!port) return kept('ENGINE_UNAVAILABLE', 0);
    const placement = port.composition?.placementArchetypeId;
    const archetypeId = typeof placement === 'function' ? placement(d.sessions) : placement;
    const intent = d.overrides[0]?.intent ?? (d.composition === 'engine' && archetypeId !== undefined ? { ...d.intent, archetypeId } : d.intent);
    for (const day of days) {
      const out = port.generate({ requestId: `${input.weekStart}.${d.sport}.probe`, date: day, availableMinutes: input.days.find((x) => x.date === day)?.availableMinutes ?? 0, hybrid: true, seed: `planner:${input.weekStart}.${d.sport}.probe:${day}`, intent: intent as DeclaredIntent, ...(d.station === undefined ? {} : { station: d.station }) });
      const dm = out.status === 'planned' ? port.demand(out.session, input.mode) : undefined;
      demandAt.set(`${d.sport}|${day}`, dm?.status === 'derived' ? dm.levels : null);
    }
  }
  const history: M3Node[] = input.recent.filter((h) => P.historyStatuses.includes(h.status ?? 'planned')).flatMap((h, i) => {
    const dm = ports[h.sport]?.demand(h.session as SessionDraft, input.mode);
    return dm?.status === 'derived' ? [{ requestId: `history.${String(i)}`, sport: h.sport, date: h.date, hours: hoursOf(h.date), rank: 0, importance: 'unknown' as const, origin: (h.status ?? 'planned') === 'planned' ? 'history_planned' as const : h.status as M3Origin, demand: dm.levels }] : [];
  });
  const fullBodyIds = new Set(planned.filter((q) => q.sport === 'strength' && cfg.archetypeIds.includes(q.intent?.archetypeId ?? '')).map((q) => q.requestId));
  type Criteria = readonly number[];
  /** Critères d'une organisation complète (vecteur à minimiser, jamais agrégé) ; null si un sport est impossible sur son jour. */
  const criteriaOf = (asg: ReadonlyMap<string, string>): Criteria | null => {
    const nodes: M3Node[] = [...history];
    for (const q of planned) {
      const day = asg.get(q.requestId) as string;
      const demand = demandAt.get(`${q.sport}|${day}`);
      if (!demand) return null;
      nodes.push({ requestId: q.requestId, sport: q.sport, date: day, hours: hoursOf(day), rank: input.demands.findIndex((d) => d.sport === q.sport), importance: 'unknown', origin: 'planned', demand });
    }
    const fbDays = planned.filter((q) => fullBodyIds.has(q.requestId)).map((q) => dayOf(asg.get(q.requestId) as string)).sort((a, b) => a - b);
    const strengthHours = planned.filter((q) => q.sport === 'strength').map((q) => hoursOf(asg.get(q.requestId) as string));
    // Proximité d'une séance à demande `high` genou / hanche : bandes GOUVERNÉES lues par le port Musculation
    // (`strength.interference.assessment`) ; absentes ⇒ critère non évalué (aucune fenêtre inventée).
    const lowerHigh = nodes.filter((n) => n.sport !== 'strength' && n.demand !== null && (n.demand.lower_knee === 'high' || n.demand.lower_hip === 'high')).map((n) => n.hours);
    const near = (h: number): number => strengthHours.filter((x) => lowerHigh.some((o) => Math.abs(o - x) <= h)).length;
    return [detectConflicts(nodes, P.pairRules, P.accumulationRules).length, fbDays.filter((x, i) => i > 0 && x - (fbDays[i - 1] as number) === 1).length, ...bands.map(near), maxConsecutive([...asg.values()].map(dayOf))];
  };
  const current = new Map(planned.map((q) => [q.requestId, q.date]));
  const base = criteriaOf(current);
  if (!base) return kept('CURRENT_DEMAND_UNAVAILABLE', 0);
  const bySport = input.demands.map((d) => planned.filter((q) => q.sport === d.sport).map((q) => q.requestId).sort());
  const found: { asg: Map<string, string>; s: Criteria; moved: number }[] = [];
  const dominates = (a: Criteria, b: Criteria): boolean => a.every((x, i) => x <= (b[i] as number)) && a.some((x, i) => x < (b[i] as number));
  const assign = (k: number, free: readonly string[], asg: Map<string, string>): void => {
    if (k === bySport.length) {
      const s = criteriaOf(asg);
      if (s && dominates(s, base)) found.push({ asg: new Map(asg), s, moved: [...asg].filter(([id, d]) => current.get(id) !== d).length });
      return;
    }
    const ids = bySport[k] as string[];
    const pick = (start: number, left: number, acc: readonly string[]): void => {
      if (left === 0) { ids.forEach((id, i) => asg.set(id, acc[i] as string)); assign(k + 1, free.filter((d) => !acc.includes(d)), asg); ids.forEach((id) => asg.delete(id)); return; }
      for (let i = start; i <= free.length - left; i++) pick(i + 1, left - 1, [...acc, free[i] as string]);
    };
    pick(0, ids.length, []);
  };
  assign(0, days, new Map());
  const lex = (a: Criteria, b: Criteria): number => a.reduce((acc, x, i) => acc || x - (b[i] as number), 0);
  found.sort((a, b) => lex(a.s, b.s) || a.moved - b.moved || [...a.asg].join() .localeCompare([...b.asg].join()));
  if (found.length === 0) return kept('NO_DOMINATING_ORGANISATION', 0);
  // Garde réelle : replanification complète et mesures par groupe musculaire.
  const measure = (w: PlannedWeek): Criteria | null => {
    const q = w.requests.flatMap((x) => (x.status === 'planned' ? [x] : []));
    if (q.length !== planned.length) return null;
    const groups: Record<string, number> = {};
    for (const x of q.filter((y) => y.sport === 'strength')) for (const [g, n] of Object.entries(groupsOf(x.session)) as [string, number][]) groups[g] = (groups[g] ?? 0) + n;
    const unresolved = q.reduce((n, x) => n + x.reasons.filter((y) => y.code === GP_CODES.M3_CONFLICT_UNRESOLVED).length, 0);
    return [unresolved, fullBodyPairs(w, cfg.archetypeIds, dayOf), maxConsecutive(q.map((x) => dayOf(x.date))), ...Object.keys(groupsOf0).sort().map((g) => -(groups[g] ?? 0))];
  };
  const groupsOf0: Record<string, number> = {};
  for (const x of planned.filter((y) => y.sport === 'strength')) for (const [g, n] of Object.entries(groupsOf(x.session)) as [string, number][]) groupsOf0[g] = (groupsOf0[g] ?? 0) + n;
  const ref = measure(v0);
  if (!ref) return kept('CURRENT_UNMEASURABLE', found.length);
  const tried = found.slice(0, cfg.maxCandidates);
  for (const c of tried) {
    const w = planCore(raw, ports, governance, clock, c.asg);
    const m = measure(w);
    if (!m || (m[1] as number) >= (ref[1] as number) || m.some((x, i) => x > (ref[i] as number))) continue;
    const after = m[1] as number;
    const notes = new Map(w.requests.flatMap((q) => (q.status === 'planned' && current.get(q.requestId) !== q.date ? [[q.requestId, gpReasons.emit(GP_CODES.GLOBAL_PLACEMENT_APPLIED, { requestId: q.requestId, from: current.get(q.requestId) ?? '', to: q.date, fullBodyBefore: before, fullBodyAfter: after, candidates: tried.length })]] : [])));
    return {
      ...w, governance: [...w.governance, ...paramReasons],
      requests: w.requests.map((q) => { const n = notes.get(q.requestId); return n ? { ...q, reasons: [...q.reasons, n] } : q; }),
    };
  }
  return kept('NO_CANDIDATE_WITHOUT_DEGRADATION', tried.length);
}

/** Plus longue suite de jours consécutifs (indices de jours). */
function maxConsecutive(dayIdx: readonly number[]): number {
  const used = new Set(dayIdx);
  let best = 0;
  for (const d of used) { if (used.has(d - 1)) continue; let n = 0; while (used.has(d + n)) n += 1; best = Math.max(best, n); }
  return best;
}

