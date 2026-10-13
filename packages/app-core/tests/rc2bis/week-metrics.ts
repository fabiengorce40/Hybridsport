/**
 * RC2 bis — mesures d'une semaine PLANIFIÉE (lecture de l'état persisté, aucune règle) et front de Pareto sans
 * pondération. Seuils d'OBSERVATION seulement (24 h = jour civil voisin), jamais des règles sportives.
 */
import { estimateDuration, readDurationParams } from '@hybridsport/engine';
import { readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import { selectBeta0Week, selectProgrammeSession, strengthContent, strengthWeekInsights } from '../../src/index.js';
import type { AppState, ProgrammeEnvironment } from '../../src/index.js';

// technical-constant: secondes par minute
const S_PER_MIN = 60;
const DAY_MS = 86_400_000;
const dayGap = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
export const LOWER = ['quads', 'hamstrings', 'calves', 'glutes'] as const;
export const UPPER = ['chest', 'back', 'shoulders'] as const;
const LOWER_STRUCT = ['lower_knee', 'lower_hip'];

export interface PlannedSession {
  readonly requestId: string; readonly sport: string; readonly date: string; readonly role: string | null; readonly archetype: string | null;
  readonly groups: Readonly<Record<string, number>>; readonly estMin: number | null; readonly allottedMin: number; readonly lowerHigh: boolean;
}
export interface WeekMetrics {
  /** Séances placées / demandées ; non placées : `sport:catégorie`. */
  readonly kept: number; readonly requested: number; readonly unplaced: readonly string[];
  readonly runKept: number; readonly keyRunKept: number; readonly runMin: number;
  /** Courses précédées la veille d'une séance de force à demande ÉLEVÉE genou ou hanche (pré-fatigue observée). */
  readonly runPreFatigue: number; readonly keyRunPreFatigue: number;
  /** Séances de force à J+1 partageant un groupe ; séries partagées (min des deux séances par groupe partagé). */
  readonly forcePairs24: number; readonly sharedSets24: number;
  readonly lower: number; readonly upper: number; readonly planned: Readonly<Record<string, number>>;
  readonly belowFloor: readonly string[];
  /** Séances dont la durée estimée (p50) dépasse les minutes allouées (journée ou part d'une journée double). */
  readonly overTime: number;
  /** Conflits détectés par M3 (règles TEST Beta 0) et laissés sans solution (détection seule ⇒ tous). */
  readonly residual: number; readonly residuals: readonly string[];
  readonly sessions: readonly PlannedSession[];
}

export function measureWeek(s: AppState, mon: string, env: ProgrammeEnvironment, pinMinutes: ReadonlyMap<string, number> = new Map()): WeekMetrics {
  const view = selectBeta0Week(s, mon)?.sessions ?? [];
  const week = s.planner.weeks[mon];
  const content = strengthContent();
  const params = readStrengthParams(content.ruleset).values;
  const contentOf = (sport: string) => (env as unknown as Record<string, { content: { catalog: typeof content.catalog; ruleset: typeof content.ruleset } } | undefined>)[sport]?.content;
  const sessions: PlannedSession[] = view.filter((v) => v.placement === 'planned' && v.date).map((v) => {
    const session = selectProgrammeSession(s, v.requestId)?.session;
    const c = contentOf(v.sport);
    const e = c && session ? estimateDuration(session, c.catalog, readDurationParams(c.ruleset)) : undefined;
    const req = week?.requests.find((r) => r.requestId === v.requestId);
    const levels = req?.demand?.status === 'derived' ? (req.demand as { levels: Record<string, string> }).levels : {};
    const day = week?.days.find((d) => d.date === v.date);
    return {
      requestId: v.requestId, sport: v.sport, date: v.date ?? mon, role: v.role, archetype: v.archetypeId,
      groups: session && v.sport !== 'running' ? sessionPlannedHardSets({ ...session, blocks: session.blocks.filter((b) => b.kind === 'strength' || b.kind === 'accessory') }, params, content.catalog) : {},
      estMin: e?.ok ? Math.round(e.estimate.p50 / S_PER_MIN) : null,
      allottedMin: pinMinutes.get(v.requestId) ?? day?.availableMinutes ?? 0,
      lowerHigh: v.sport !== 'running' && LOWER_STRUCT.some((x) => levels[x] === 'high'),
    };
  }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sport < b.sport ? -1 : 1));
  const force = sessions.filter((x) => Object.values(x.groups).some((n) => n > 0));
  let forcePairs24 = 0; let sharedSets24 = 0;
  for (const [i, a] of force.entries()) for (const b of force.slice(i + 1)) {
    const g = Math.abs(dayGap(a.date, b.date));
    const shared = Object.keys(a.groups).filter((k) => (a.groups[k] ?? 0) > 0 && (b.groups[k] ?? 0) > 0);
    if (g > 1 || shared.length === 0) continue;
    forcePairs24 += 1;
    for (const k of shared) sharedSets24 += Math.min(a.groups[k] ?? 0, b.groups[k] ?? 0);
  }
  const runs = sessions.filter((x) => x.sport === 'running');
  const preFatigued = (r: PlannedSession) => sessions.some((x) => x.lowerHigh && dayGap(x.date, r.date) === 1);
  const insights = strengthWeekInsights(s, mon);
  const planned = Object.fromEntries((insights?.volume?.groups ?? []).map((x) => [x.group, x.planned]));
  const belowFloor = (insights?.volume?.groups ?? []).filter((x) => x.target !== null && x.planned < x.target).map((x) => x.group).sort();
  const sum = (gs: readonly string[]) => gs.reduce((a, g) => a + (planned[g] ?? 0), 0);
  const residuals = (week?.arbitration?.residual ?? []).map((x) => x.conflict);
  return {
    kept: sessions.length, requested: view.length, unplaced: view.filter((v) => v.placement !== 'planned').map((v) => `${v.sport}:${v.notPlanned?.category ?? v.placement}`),
    runKept: runs.length, keyRunKept: runs.filter((r) => r.role === 'KEY').length, runMin: runs.reduce((a, r) => a + (r.estMin ?? 0), 0),
    runPreFatigue: runs.filter(preFatigued).length, keyRunPreFatigue: runs.filter((r) => r.role === 'KEY' && preFatigued(r)).length,
    forcePairs24, sharedSets24, lower: sum(LOWER), upper: sum(UPPER), planned, belowFloor,
    overTime: sessions.filter((x) => x.estMin !== null && x.estMin > x.allottedMin).length,
    residual: residuals.length, residuals, sessions,
  };
}

// ——— Front de Pareto (aucune pondération : dominance sur des critères explicites)

export interface Objective { readonly key: string; readonly label: string; readonly dir: 1 | -1; readonly of: (m: WeekMetrics) => number }
/** dir = 1 : plus grand est meilleur ; −1 : plus petit est meilleur. */
export const OBJECTIVES: readonly Objective[] = [
  { key: 'kept', label: 'séances conservées', dir: 1, of: (m) => m.kept },
  { key: 'runKept', label: 'courses conservées', dir: 1, of: (m) => m.runKept },
  { key: 'runPreFatigue', label: 'courses pré-fatiguées (force bas du corps la veille)', dir: -1, of: (m) => m.runPreFatigue },
  { key: 'lower', label: 'séries bas du corps', dir: 1, of: (m) => Math.round(m.lower * 10) / 10 },
  { key: 'upper', label: 'séries haut du corps', dir: 1, of: (m) => Math.round(m.upper * 10) / 10 },
  { key: 'sharedSets24', label: 'séries partagées à J+1', dir: -1, of: (m) => Math.round(m.sharedSets24 * 10) / 10 },
  { key: 'overTime', label: 'séances au-delà du temps alloué', dir: -1, of: (m) => m.overTime },
  { key: 'residual', label: 'conflits M3 résiduels', dir: -1, of: (m) => m.residual },
];
const vec = (m: WeekMetrics) => OBJECTIVES.map((o) => o.dir * o.of(m));
/** `a` domine `b` : au moins aussi bon partout, strictement meilleur sur au moins un critère. */
export function dominates(a: WeekMetrics, b: WeekMetrics): boolean {
  const x = vec(a); const y = vec(b);
  return x.every((v, i) => v >= (y[i] ?? 0)) && x.some((v, i) => v > (y[i] ?? 0));
}
export function paretoFront<T extends { readonly m: WeekMetrics }>(items: readonly T[]): T[] {
  return items.filter((a) => !items.some((b) => b !== a && dominates(b.m, a.m)));
}
export const signature = (m: WeekMetrics): string => OBJECTIVES.map((o) => String(o.of(m))).join('|');
