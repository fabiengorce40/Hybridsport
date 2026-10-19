/**
 * RC4.4 — lectures de CHARGE de la semaine, calculées à la lecture (aucun champ persisté, aucune séance retirée,
 * aucune valeur sportive nouvelle) :
 * - lot B : avertissements du planning — semaine à 7 jours d'entraînement, plus longue suite de jours consécutifs
 *   (semaine précédente comprise), Full Body à J/J+1 non évités, conflits multisports M3 non résolus. Les courses
 *   libres RÉALISÉES et datées de la semaine comptent comme jours d'entraînement (jamais la course d'onboarding sans date) ;
 * - lot D : déficit de séries de Musculation, par groupe musculaire, d'une séance ALLÉGÉE au démarrage, calculé par la
 *   fonction du moteur Musculation (`sessionPlannedHardSets`) ; aucune redistribution ; aucun déficit affiché si un
 *   exercice est inconnu du catalogue (calcul non fiable).
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import { addDays, dateOf } from './dates.js';
import { countableFreeRuns } from './free-run-load.js';
import type { AppState, PersistedWeek } from './model.js';
import { STRENGTH_ARCHETYPE } from './planner.js';
import { strengthContent } from './provisional-content.js';

// technical-constant: jours par semaine (calendrier)
const DAYS_PER_WEEK = 7;
const GLOBAL_PLACEMENT_KEPT = 'PLAN.PLANNER.GLOBAL_PLACEMENT_KEPT';
const M3_CONFLICT_UNRESOLVED = 'RECOVERY.PLANNER.M3_CONFLICT_UNRESOLVED';

export type WeekLoadWarning =
  | { readonly kind: 'seven_days'; readonly days: number; readonly freeRuns: number }
  | { readonly kind: 'consecutive'; readonly days: number; readonly from: string; readonly to: string; readonly acrossWeeks: boolean }
  | { readonly kind: 'full_body_consecutive'; readonly pairs: readonly { readonly first: string; readonly second: string }[]; readonly noBetterPlacement: boolean }
  | { readonly kind: 'multisport_conflict'; readonly items: readonly { readonly requestId: string; readonly withRequestId: string; readonly structure: string }[] };

type Request = PersistedWeek['requests'][number];

/** Jours d'entraînement d'une semaine (séances planifiées non manquées, séances non placées réalisées, courses libres). */
function trainingDays(state: AppState, weekStart: string): { readonly days: ReadonlySet<string>; readonly freeRuns: number } {
  const week = state.planner.weeks[weekStart];
  const results = new Map((state.programmeState?.results ?? []).map((x) => [x.requestId, x]));
  const end = addDays(weekStart, DAYS_PER_WEEK);
  const out = new Set<string>();
  for (const r of week?.requests ?? []) {
    const x = results.get(r.requestId);
    if (r.status === 'planned' && r.date && x?.completion !== 'missed') out.add(r.date);
    if (r.status === 'unplaced' && x?.provenance === 'manual_from_unplaced' && x.completion !== 'missed') out.add(x.date);
  }
  const free = countableFreeRuns(state).map((r) => dateOf(r.completedAt)).filter((d) => d >= weekStart && d < end);
  for (const d of free) out.add(d);
  return { days: out, freeRuns: new Set(free).size };
}

/** Avertissements de charge d'une semaine planifiée (lecture seule). */
export function weekLoadWarnings(state: AppState, weekStart: string): readonly WeekLoadWarning[] {
  const week = state.planner.weeks[weekStart];
  if (!week) return [];
  const out: WeekLoadWarning[] = [];
  const cur = trainingDays(state, weekStart);
  if (cur.days.size >= DAYS_PER_WEEK) out.push({ kind: 'seven_days', days: cur.days.size, freeRuns: cur.freeRuns });
  // Plus longue suite (sans seuil inventé : la suite est signalée telle qu'elle est), jours de la semaine précédente compris.
  const prev = trainingDays(state, addDays(weekStart, -DAYS_PER_WEEK)).days;
  const all = new Set([...prev, ...cur.days]);
  let best: { from: string; to: string; days: number } | null = null;
  for (let i = 0; i < DAYS_PER_WEEK; i += 1) {
    const d = addDays(weekStart, i);
    if (!cur.days.has(d) || cur.days.has(addDays(d, -1)) && i > 0) continue;
    let from = d;
    while (all.has(addDays(from, -1))) from = addDays(from, -1);
    let to = d;
    while (cur.days.has(addDays(to, 1))) to = addDays(to, 1);
    let n = 1;
    for (let x = from; x !== to; x = addDays(x, 1)) n += 1;
    if (!best || n > best.days) best = { from, to, days: n };
  }
  if (best && best.days > 1) out.push({ kind: 'consecutive', days: best.days, from: best.from, to: best.to, acrossWeeks: best.from < weekStart });
  // Full Body à J/J+1 restés dans la semaine (après le placement global G5, s'il est actif).
  const fb = week.requests.filter((r): r is Request & { date: string } => r.status === 'planned' && r.sport === 'strength' && typeof r.date === 'string' && r.intent?.archetypeId === STRENGTH_ARCHETYPE)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const pairs = fb.flatMap((r, i) => { const p = fb[i - 1]; return p && addDays(p.date, 1) === r.date ? [{ first: p.date, second: r.date }] : []; });
  if (pairs.length > 0) out.push({ kind: 'full_body_consecutive', pairs, noBetterPlacement: fb.some((r) => r.reasons.some((x) => x.code === GLOBAL_PLACEMENT_KEPT)) });
  // Conflits multisports non résolus (raisons persistées par l'arbitrage M3), une entrée par paire.
  const seen = new Set<string>();
  const items = week.requests.flatMap((r) => r.reasons.filter((x) => x.code === M3_CONFLICT_UNRESOLVED).flatMap((x) => {
    const a = String(x.params.requestId ?? r.requestId);
    const b = String(x.params.withRequestId ?? '');
    const key = [a, b].sort().join('|') + String(x.params.structure ?? '');
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ requestId: a, withRequestId: b, structure: String(x.params.structure ?? '') }];
  }));
  if (items.length > 0) out.push({ kind: 'multisport_conflict', items });
  return out;
}

export interface VolumeDeficit {
  readonly group: string;
  readonly planned: number;
  readonly adapted: number;
  readonly deficit: number;
}

const recordOf = (envelope: unknown): SessionRecord | undefined => {
  const d = migrateToCurrent<SessionRecord>(envelope as never);
  return d.ok ? d.value : undefined;
};

/**
 * Lot D — séries de travail PERDUES par groupe musculaire après un allègement au démarrage (séance prévue contre séance
 * adaptée), selon la fonction du moteur Musculation. `null` : pas de séance de Musculation adaptée, ou calcul non
 * fiable (séance illisible, exercice inconnu du catalogue). Liste vide : aucun groupe en déficit.
 */
export function adaptationVolumeDeficit(state: AppState, requestId: string): readonly VolumeDeficit[] | null {
  const log = state.programmeLogs[requestId];
  if (!log?.adaptation) return null;
  const r = Object.values(state.planner.weeks).flatMap((w) => w.requests).find((x) => x.requestId === requestId);
  if (!r || r.sport !== 'strength' || !r.record) return null;
  const planned = recordOf(r.record)?.session;
  const adapted = recordOf(log.adaptation.record)?.session;
  if (!planned || !adapted) return null;
  const content = strengthContent();
  const known = (s: SessionDraft): boolean => s.blocks.every((b) => b.items.every((it) => content.catalog.exercise(it.exerciseId) !== undefined));
  if (!known(planned) || !known(adapted)) return null;
  const params = readStrengthParams(content.ruleset).values;
  const before = sessionPlannedHardSets(planned, params, content.catalog);
  const after = sessionPlannedHardSets(adapted, params, content.catalog);
  return Object.keys(before).sort().flatMap((g) => {
    const p = before[g] ?? 0;
    const a = after[g] ?? 0;
    return p - a > 0 ? [{ group: g, planned: p, adapted: a, deficit: p - a }] : [];
  });
}
