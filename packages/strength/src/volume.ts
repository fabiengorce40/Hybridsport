/**
 * Volume (spec strength 05 §13) : séries difficiles prévues par groupe musculaire, avec la règle E1
 * (primaire = 1, secondaire = poids du ruleset) ; montées en charge et séries facultatives exclues.
 * Cible hebdomadaire L5 (plancher TARGET, haut SOFT), plafond par séance L4 (G1), progression de séries
 * PM4 en accumulation. Aucun score physiologique.
 */
import type { Exercise } from '@hybridsport/domain';
import type { Env } from './model.js';

export interface PlannedItem { readonly exercise: Exercise; readonly workingSets: number }

export function groupsOf(e: Exercise, env: Env): { primary: string[]; secondary: string[] } {
  const groups = env.params['strength.volume'].muscleGroups;
  const find = (muscles: readonly string[]) => Object.keys(groups).filter((g) => (groups[g] ?? []).some((m) => muscles.includes(m))).sort();
  const primary = find(e.muscles.primary);
  return { primary, secondary: find(e.muscles.secondary).filter((g) => !primary.includes(g)) };
}

export function plannedHardSets(items: readonly PlannedItem[], env: Env): Record<string, number> {
  const w = env.params['strength.volume'].secondaryWeight;
  const out: Record<string, number> = {};
  for (const it of items) {
    const g = groupsOf(it.exercise, env);
    for (const p of g.primary) out[p] = (out[p] ?? 0) + it.workingSets;
    for (const s of g.secondary) out[s] = (out[s] ?? 0) + it.workingSets * w;
  }
  return out;
}

/** Cible hebdomadaire d'un groupe (L5), avec la progression de séries PM4 en accumulation. */
export function weeklyTarget(group: string, env: Env): { floor: number; high: number } | undefined {
  const v = env.params['strength.volume'];
  const r = v.weeklyRange[env.goalKey]?.[env.level]?.[group];
  if (!r) return undefined;
  const ph = env.input.discipline.phase;
  const pm4 = ph.kind === 'accumulation' ? (ph.weekInMesocycle - 1) * v.pm4SetsPerWeek : 0;
  return { floor: Math.min(r.high, r.floor + pm4), high: r.high };
}

/** Part du volume restant de la semaine revenant à cette séance, pour un groupe. */
export function remainingShare(group: string, env: Env): number | undefined {
  const t = weeklyTarget(group, env);
  if (!t) return undefined;
  const ctx = env.input.discipline;
  const done = ctx.hardSets.d7[group] ?? 0;
  const others = ctx.week.otherStrengthSessions.filter((s) => !s.done);
  const plannedOthers = others.reduce((a, s) => a + (s.plannedHardSets[group] ?? 0), 0);
  return Math.max(0, (t.floor - done - plannedOthers) / (1 + others.length));
}
