/**
 * RC2 — mesures sportives d'une simulation 4 semaines (lecture des séances EXÉCUTÉES et des bilans persistés).
 * Aucune valeur de règle : seuils d'OBSERVATION (24 h / 48 h) pour décrire la proximité des séances de force.
 */
import type { SimResult, SimSession } from '../consolidation/sim4.js';

// technical-constant: heures par jour (écart entre deux dates)
const H_PER_DAY = 24;
const DAY_MS = 86_400_000;
// technical-constant: observation — écart de 2 jours (heures)
const OBS_48 = 48;
const gapH = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS) * H_PER_DAY;
const DOW = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const dow = (d: string) => DOW[new Date(`${d}T12:00:00Z`).getUTCDay()] ?? '?';
const isForce = (s: SimSession) => s.execution === 'réalisée' && Object.values(s.groups).some((n) => n > 0);

export interface RunMetrics {
  readonly pairs24: number; readonly pairs48: number; readonly sharedSets24: number; readonly ctAdj24: number;
  readonly sharedGroups24: Readonly<Record<string, number>>;
  readonly planned: Readonly<Record<string, number>>; readonly executed: Readonly<Record<string, number>>;
  readonly targets: Readonly<Record<string, { target: number | null; high: number | null }>>;
  readonly belowFloor: readonly string[]; readonly aboveHigh: readonly string[];
  readonly weeklyPlannedMin: number; readonly overTarget: number;
  readonly runExecuted: number; readonly runMin: number;
  readonly executedCount: number; readonly postponed: number; readonly missed: number; readonly unplaced: number; readonly residual: number;
  readonly moves: number; readonly swaps: number; readonly recomposes: number;
  readonly variantRepeats: number; readonly exerciseRepeats: number; readonly ctBlockSets: number;
  readonly violations: number; readonly layouts: readonly string[];
}

export function measure(r: SimResult): RunMetrics {
  const force = r.sessions.filter(isForce);
  let pairs24 = 0; let pairs48 = 0; let sharedSets24 = 0; let ctAdj24 = 0;
  const sharedGroups24: Record<string, number> = {};
  for (const [i, a] of force.entries()) {
    for (const b of force.slice(i + 1)) {
      const h = gapH(a.date, b.date);
      const shared = Object.keys(a.groups).filter((g) => (a.groups[g] ?? 0) > 0 && (b.groups[g] ?? 0) > 0);
      if (h <= 0 || shared.length === 0) continue;
      if (h <= H_PER_DAY) {
        pairs24 += 1;
        if (a.sport === 'crosstraining' || b.sport === 'crosstraining') ctAdj24 += 1;
        for (const g of shared) { sharedSets24 += Math.min(a.groups[g] ?? 0, b.groups[g] ?? 0); sharedGroups24[g] = (sharedGroups24[g] ?? 0) + 1; }
      }
      if (h <= OBS_48) pairs48 += 1;
    }
  }
  const weeks = r.weeks.length;
  const avg = (pick: (w: SimResult['weeks'][number]) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const w of r.weeks) for (const [g, v] of Object.entries(pick(w))) out[g] = (out[g] ?? 0) + v / weeks;
    return out;
  };
  const planned = avg((w) => Object.fromEntries(Object.entries(w.planned).map(([g, v]) => [g, v.planned])));
  const executed = avg((w) => w.executed);
  const targets: Record<string, { target: number | null; high: number | null }> = {};
  for (const w of r.weeks) for (const [g, v] of Object.entries(w.planned)) targets[g] ??= { target: v.target, high: v.high };
  const belowFloor = Object.entries(planned).filter(([g, v]) => { const t = targets[g]?.target; return t !== null && t !== undefined && v < t; }).map(([g]) => g).sort();
  const aboveHigh = Object.entries(planned).filter(([g, v]) => { const h = targets[g]?.high; return h !== null && h !== undefined && v > h; }).map(([g]) => g).sort();
  const strengthByWeek = (w: number) => r.sessions.filter((s) => s.week === w && s.sport === 'strength' && s.execution === 'réalisée');
  let variantRepeats = 0; let exerciseRepeats = 0;
  for (let w = 1; w <= weeks; w += 1) {
    const ss = strengthByWeek(w);
    const letters = ss.map((s) => s.title.split(' ')[1] ?? '').filter(Boolean);
    variantRepeats += letters.length - new Set(letters).size;
    const ex = ss.flatMap((s) => [...new Set(s.exercises.filter((e) => e.block === 'strength' || e.block === 'accessory').map((e) => e.id))]);
    exerciseRepeats += ex.length - new Set(ex).size;
  }
  const decisions = r.weeks.flatMap((w) => w.m3.decisions);
  const ct = r.sessions.filter((s) => s.sport === 'crosstraining' && s.execution === 'réalisée');
  return {
    pairs24, pairs48, sharedSets24, ctAdj24, sharedGroups24, planned, executed, targets, belowFloor, aboveHigh,
    weeklyPlannedMin: r.sessions.reduce((a, s) => a + (s.plannedEstMin ?? 0), 0) / weeks,
    overTarget: r.sessions.filter((s) => s.plannedEstMin !== null && s.targetMin !== null && s.plannedEstMin > s.targetMin).length,
    runExecuted: r.sessions.filter((s) => s.sport === 'running' && s.execution === 'réalisée').length,
    runMin: r.sessions.filter((s) => s.sport === 'running' && s.execution === 'réalisée').reduce((a, s) => a + (s.executedEstMin ?? 0), 0),
    executedCount: r.sessions.filter((s) => s.execution === 'réalisée').length,
    postponed: r.sessions.filter((s) => s.decision === 'postponed').length,
    missed: r.sessions.filter((s) => s.execution === 'manquée').length,
    unplaced: r.weeks.reduce((a, w) => a + w.unplaced.length, 0),
    residual: r.weeks.reduce((a, w) => a + w.m3.residual, 0),
    moves: decisions.filter((d) => d.startsWith('MOVE')).length, swaps: decisions.filter((d) => d.startsWith('SWAP')).length, recomposes: decisions.filter((d) => d.startsWith('RECOMPOSE')).length,
    variantRepeats, exerciseRepeats,
    ctBlockSets: ct.reduce((a, s) => a + Object.values(s.groups).reduce((x, y) => x + y, 0), 0) / weeks,
    violations: r.sessions.reduce((a, s) => a + s.violations.length, 0),
    layouts: Array.from({ length: weeks }, (_, k) => r.sessions.filter((s) => s.week === k + 1).map((s) => `${dow(s.date)} ${s.sport === 'strength' ? 'M' : s.sport === 'running' ? 'C' : s.sport === 'crosstraining' ? 'X' : s.sport}`).join(' · ')),
  };
}
