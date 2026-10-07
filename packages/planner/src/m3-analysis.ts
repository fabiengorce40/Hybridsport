/**
 * M3 — ANALYSE de la semaine comme un système (fonctions pures, déterministes). M3 n'est pas un moteur sportif : il
 * lit les séances PLACÉES (et l'historique admis), leur profil de demande CORE (8 structures, jamais une nouvelle
 * taxonomie), leur distance temporelle, la priorité DÉCLARÉE du sport et l'importance de la séance, puis applique des
 * règles GOUVERNÉES. Quatre notions distinctes, jamais confondues :
 *   - PRIORITÉ SPORTIVE (`rank`, ordre déclaré par le programme) ;
 *   - IMPORTANCE de séance (`importance`, rôle de composition du moteur → table gouvernée) ;
 *   - DEMANDE PHYSIQUE (`demand`, profil CORE : un niveau DÉCRIT, il n'interdit rien) ;
 *   - PROXIMITÉ (`hours`, différence d'instants).
 */
import type { DemandLevel } from '@hybridsport/domain';
import type { PlannerSport } from './model.js';

export type M3Importance = 'key' | 'standard' | 'unknown';
export type M3Origin = 'planned' | 'executed' | 'abandoned' | 'missed' | 'history_planned';

export interface M3Node {
  readonly requestId: string;
  readonly sport: PlannerSport;
  readonly date: string;
  /** Instant de la séance (heures depuis l'époque, horloge injectée). */
  readonly hours: number;
  /** Rang DÉCLARÉ du sport (0 = le plus prioritaire). */
  readonly rank: number;
  readonly importance: M3Importance;
  /** `planned` : séance de la semaine (déplaçable) ; autres : historique (jamais modifié). */
  readonly origin: M3Origin;
  /** Profil de demande CORE ; null = non dérivable (l'arbitrage ne devine rien). */
  readonly demand: Readonly<Record<string, DemandLevel>> | null;
}

export interface PairRule { readonly id: string; readonly structures: readonly string[]; readonly levels: readonly DemandLevel[]; readonly withinHours: number }
export interface AccumulationRule { readonly id: string; readonly structure: string; readonly levels: readonly DemandLevel[]; readonly withinHours: number; readonly maxSessions: number }

export interface M3Conflict {
  readonly kind: 'pair' | 'accumulation';
  readonly rule: string;
  readonly structure: string;
  /** Séances impliquées (paire : 2 ; accumulation : toutes celles de la fenêtre), ordre chronologique. */
  readonly members: readonly string[];
  /** Plus petit écart (heures) entre deux membres. */
  readonly deltaHours: number;
}

const hit = (n: M3Node, s: string, levels: readonly DemandLevel[]): boolean => n.demand !== null && levels.includes(n.demand[s] ?? 'none');
const byTime = (a: M3Node, b: M3Node): number => a.hours - b.hours || (a.requestId < b.requestId ? -1 : a.requestId > b.requestId ? 1 : 0);

/**
 * Conflits gouvernés de la semaine. Paires : sports DIFFÉRENTS (la même discipline reste à son moteur). Accumulation :
 * toutes séances (succession lundi → mardi → mercredi), au moins une séance planifiée dans la fenêtre. Ordre stable.
 */
export function detectConflicts(nodes: readonly M3Node[], pairRules: readonly PairRule[], accRules: readonly AccumulationRule[]): M3Conflict[] {
  const sorted = [...nodes].sort(byTime);
  const out: M3Conflict[] = [];
  for (const r of pairRules) {
    for (const s of r.structures) {
      for (let i = 0; i < sorted.length; i += 1) {
        for (let j = i + 1; j < sorted.length; j += 1) {
          const a = sorted[i] as M3Node;
          const b = sorted[j] as M3Node;
          const delta = b.hours - a.hours;
          if (delta >= r.withinHours) break;
          if (a.sport === b.sport || (a.origin !== 'planned' && b.origin !== 'planned')) continue;
          if (hit(a, s, r.levels) && hit(b, s, r.levels)) out.push({ kind: 'pair', rule: r.id, structure: s, members: [a.requestId, b.requestId], deltaHours: delta });
        }
      }
    }
  }
  for (const r of accRules) {
    const hits = sorted.filter((n) => hit(n, r.structure, r.levels));
    const seen = new Set<string>();
    for (let i = 0; i < hits.length; i += 1) {
      const start = hits[i] as M3Node;
      const win = hits.filter((n) => n.hours >= start.hours && n.hours - start.hours < r.withinHours);
      if (win.length <= r.maxSessions || !win.some((n) => n.origin === 'planned')) continue;
      const key = win.map((n) => n.requestId).join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const gaps = win.slice(1).map((n, k) => n.hours - (win[k] as M3Node).hours);
      out.push({ kind: 'accumulation', rule: r.id, structure: r.structure, members: win.map((n) => n.requestId), deltaHours: Math.min(...gaps) });
    }
  }
  return out;
}

/** Nœuds dont le profil n'est pas dérivable : l'arbitrage les signale, ne les devine jamais. */
export const unknownDemand = (nodes: readonly M3Node[]): readonly string[] => nodes.filter((n) => n.demand === null && n.origin === 'planned').map((n) => n.requestId);

const IMPORTANCE_ORDER: Readonly<Record<M3Importance, number>> = { key: 0, standard: 1, unknown: 1 };

/**
 * QUI CÈDE dans un conflit, selon la politique GOUVERNÉE (`order` : critères successifs). L'historique ne cède jamais
 * (déjà réalisé ou passé). Critère `importance` : une séance clé est préservée face à une standard. Critère `rank` : le
 * sport le MOINS prioritaire cède. Aucun critère ne départage ⇒ null (conflit non résolu, jamais un choix arbitraire).
 */
export function yielderOf(c: M3Conflict, nodes: ReadonlyMap<string, M3Node>, order: readonly ('importance' | 'rank')[]): { readonly node: M3Node | null; readonly why: readonly string[] } {
  const members = c.members.map((id) => nodes.get(id)).filter((n): n is M3Node => n !== undefined && n.origin === 'planned');
  if (members.length === 0) return { node: null, why: ['NO_PLANNED_MEMBER'] };
  if (members.length === 1) return { node: members[0] as M3Node, why: ['ONLY_PLANNED_MEMBER (history is never modified)'] };
  let pool = members;
  const why: string[] = [];
  for (const criterion of order) {
    if (pool.length <= 1) break;
    if (criterion === 'importance') {
      const best = Math.min(...pool.map((n) => IMPORTANCE_ORDER[n.importance]));
      const worst = Math.max(...pool.map((n) => IMPORTANCE_ORDER[n.importance]));
      if (best === worst) { why.push('importance:tie'); continue; }
      pool = pool.filter((n) => IMPORTANCE_ORDER[n.importance] === worst);
      why.push('importance:standard_yields_to_key');
    } else {
      const worst = Math.max(...pool.map((n) => n.rank));
      if (pool.every((n) => n.rank === worst)) { why.push('rank:tie'); continue; }
      pool = pool.filter((n) => n.rank === worst);
      why.push('rank:lower_priority_yields');
    }
  }
  if (pool.length !== 1) return { node: null, why: [...why, 'UNDECIDED'] };
  return { node: pool[0] as M3Node, why };
}

/** Ordre déterministe des conflits : le plus proche d'abord, puis règle, structure, membres. */
export function compareConflicts(a: M3Conflict, b: M3Conflict): number {
  const ka = `${a.rule}|${a.structure}|${a.members.join(',')}`;
  const kb = `${b.rule}|${b.structure}|${b.members.join(',')}`;
  return a.deltaHours - b.deltaHours || (ka < kb ? -1 : ka > kb ? 1 : 0);
}
export const conflictId = (c: M3Conflict): string => `${c.rule}|${c.structure}|${c.members.join(',')}`;
