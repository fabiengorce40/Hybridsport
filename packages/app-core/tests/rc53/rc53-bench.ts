/**
 * RC5.3 — banc de progression individualisée : athlète simulé à CAPACITÉ CACHÉE (le moteur ne voit que les répétitions
 * et le RIR déclarés), chemin réel de l'application, horizons 12 et 24 semaines, niveaux × trajectoires × profils.
 *
 * HYPOTHÈSES DE SIMULATION (à valider par un professionnel ; résultats simulés, pas une validation scientifique) :
 * - gain hebdomadaire de capacité (e1RM) : débutant 1,5 %, intermédiaire 0,75 %, avancé 0,4 % ;
 * - capacité initiale fixée à la première exposition (charge et RIR visés réalisés exactement) ;
 * - fatigué : performance −8 % et contrôle « fatigue élevée » les semaines 3–4, 11–12, 19–20 ; stagnation : plus aucun
 *   gain après la semaine 8 ; stable : aucun gain ;
 * - répétitions et RIR réels par la relation d'Epley (diviseur 30), RIR déclaré arrondi à l'inférieur.
 */
import { readStrengthParams } from '@hybridsport/strength';
import { beta0Environment, strengthContent } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { measureProfile, summarize } from '../rc46/quality-bench.js';
import { probe } from '../rc45/probe-starts.js';
import { rc51Profiles } from '../rc51/rc51-bench.js';

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const KINDS = ['progressant', 'stable', 'fatigue', 'stagnation'] as const;
export type Level = (typeof LEVELS)[number];
export type Kind = (typeof KINDS)[number];
// technical-constant: TEST_ONLY — hypothèses de simulation : gain hebdomadaire de capacité (e1RM) par niveau
const GAIN = { beginner: 0.015, intermediate: 0.0075, advanced: 0.004 } as const;
// technical-constant: TEST_ONLY — semaines de fatigue (index 0) et performance relative pendant ces semaines
export const FATIGUE_WEEKS = new Set([2, 3, 10, 11, 18, 19]);
// technical-constant: TEST_ONLY — performance relative en semaine de fatigue
const FATIGUE_FACTOR = 0.92;
// technical-constant: TEST_ONLY — dernière semaine de gain de l'athlète en stagnation
const STAGNATION_WEEK = 8;
// technical-constant: TEST_ONLY — charge fictive d'un exercice au poids du corps (modèle de répétitions)
const BODYWEIGHT_KG = 80;
// technical-constant: TEST_ONLY — diviseur d'Epley (répétitions jusqu'à l'échec)
const DIV = 30;
// technical-constant: TEST_ONLY — RIR supposé d'une prescription sans effort visé, pas de charge par défaut (kg)
const DEFAULT_RIR = 2;
// technical-constant: TEST_ONLY — pas de charge par défaut (kg) d'un exercice sans modèle de charge
const DEFAULT_STEP = 2.5;
// technical-constant: TEST_ONLY — jours par semaine, millisecondes par jour, arrondi des pourcentages (‰)
const WEEK_MS = 7 * 86_400_000;
// technical-constant: TEST_ONLY — arrondi des écarts en pour mille
const PERMILLE = 1000;

export interface Athlete {
  readonly truth: (exerciseId: string, week: number) => number;
  perform(a: { readonly exerciseId: string; readonly reps: unknown; readonly rir: number | undefined; readonly kg: number | undefined; readonly week: number }): { readonly reps: number; readonly rir: number };
}

export function athlete(kind: Kind, level: Level): Athlete {
  const e0 = new Map<string, number>();
  const g = GAIN[level];
  const growth = (w: number) => (kind === 'stable' ? 0 : kind === 'stagnation' ? g * Math.min(w, STAGNATION_WEEK) : g * w);
  const truth = (ex: string, w: number) => (e0.get(ex) ?? 0) * (1 + growth(w)) * (kind === 'fatigue' && FATIGUE_WEEKS.has(w) ? FATIGUE_FACTOR : 1);
  return {
    truth,
    perform(a) {
      const load = a.kg ?? BODYWEIGHT_KG;
      const rirT = a.rir ?? DEFAULT_RIR;
      const r = a.reps as number | { min: number; max: number };
      const lo = typeof r === 'number' ? r : r.min;
      if (!e0.has(a.exerciseId)) e0.set(a.exerciseId, load * (1 + (lo + rirT) / DIV));
      const maxR = DIV * (truth(a.exerciseId, a.week) / load - 1);
      let done = typeof r === 'number' ? Math.min(r, Math.floor(maxR)) : Math.min(r.max, Math.max(r.min, Math.floor(maxR - rirT)));
      if (done > maxR) done = Math.floor(maxR);
      return { reps: Math.max(0, done), rir: Math.max(0, Math.floor(maxR - done)) };
    },
  };
}

export const FATIGUE_CHECKIN = (w: number) => (FATIGUE_WEEKS.has(w) ? { painAnswer: 'no' as const, fatigue: 'high' as const, recovery: 'poor' as const } : { painAnswer: 'no' as const, fatigue: 'low' as const, recovery: 'good' as const });

export interface LiftMeasure {
  readonly main: boolean; readonly n: number; readonly first: number | null; readonly w12: number | null; readonly w24: number | null;
  readonly reps12: string | undefined; readonly reps24: string | undefined; readonly ups: number; readonly downs: number; readonly repsUps: number;
  readonly err12: number | null; readonly err24: number | null; readonly capErr12: number | null; readonly capErr24: number | null;
}
export interface BenchCell {
  readonly lifts: Readonly<Record<string, LiftMeasure>>;
  readonly codes: Readonly<Record<string, number>>;
  readonly unjustified: number;
  readonly starts: Readonly<Record<string, number>>;
  readonly summary: ReturnType<typeof summarize>;
}

/** Une simulation (profil × niveau × trajectoire) et ses mesures. */
export function benchCell(profileId: string, level: Level, kind: Kind, weeks: number): BenchCell {
  const params = readStrengthParams(strengthContent().ruleset).values;
  const catalog = strengthContent().catalog;
  const pct = params['strength.load'].pctByRepsToFailure;
  const base = rc51Profiles().find((p) => p.id === profileId) as ProfileSpec;
  const ath = athlete(kind, level);
  const spec: ProfileSpec = { ...base, profile: { ...base.profile, level }, athlete: ath, ...(kind === 'fatigue' ? { checkIn: FATIGUE_CHECKIN } : {}) };
  let w2: AppState | undefined;
  let final: AppState | undefined;
  const q = measureProfile(spec, beta0Environment(), { weeks, onWeek: (st, m) => { if (m === '2026-10-12') w2 = st; }, onFinal: (st) => { final = st; } });
  const wk = (d: string) => Math.floor((Date.parse(d) - Date.parse('2026-10-05')) / WEEK_MS);
  const seq: Record<string, { w: number; load: number | null; reps: string; main: boolean }[]> = {};
  for (const s of [...q.sessions].sort((a, b) => (a.date < b.date ? -1 : 1))) for (const i of s.items) (seq[`${i.ex}@${i.slot.split('.').slice(1).join('.')}`] ??= []).push({ w: wk(s.date), load: i.load, reps: i.reps, main: /(^|\.)main_/.test(i.slot) });
  const stepOf = (ex: string) => { const e = catalog.exercise(`ex.${ex}`); return (e?.loadModel ? params['strength.load.defaultIncrements'][e.loadModel] : undefined) ?? DEFAULT_STEP; };
  const lo = (r: string) => Number(r.split(/[-–]/)[0]);
  const ideal = (ex: string, w: number, reps: number) => { const t = ath.truth(`ex.${ex}`, w); const f = pct[String(reps + DEFAULT_RIR)]; const st = stepOf(ex); return t && f ? Math.floor((t * f) / st + 1e-9) * st : null; };
  const lifts: Record<string, LiftMeasure> = {};
  let unjustified = 0;
  for (const [k, L] of Object.entries(seq)) {
    const ex = k.split('@')[0] as string;
    const loads = L.filter((x) => x.load !== null);
    let ups = 0; let downs = 0; let repsUps = 0;
    for (let j = 1; j < L.length; j++) {
      const a = L[j - 1] as (typeof L)[number]; const b = L[j] as (typeof L)[number];
      if (a.load !== null && b.load !== null && b.load > a.load) { ups++; const id = ideal(ex, b.w, lo(b.reps)); if (id !== null && b.load > id + stepOf(ex)) unjustified++; }
      if (a.load !== null && b.load !== null && b.load < a.load) downs++;
      if (a.load === b.load && lo(b.reps) > lo(a.reps)) repsUps++;
    }
    const at = (wMax: number) => loads.filter((x) => x.w < wMax).at(-1);
    const err = (wMax: number) => { const x = at(wMax); if (!x || x.load === null || !L[0]?.main) return null; const id = ideal(ex, x.w, lo(x.reps)); return id ? Math.round(((x.load - id) / id) * PERMILLE) / 10 : null; };
    const cap = (wMax: number) => { const x = at(wMax); const t = x ? ath.truth(`ex.${ex}`, x.w) : 0; return x && x.load !== null && t ? Math.round(((x.load * (1 + (lo(x.reps) + DEFAULT_RIR) / DIV)) / t - 1) * PERMILLE) / 10 : null; };
    lifts[k] = { main: L[0]?.main ?? false, n: L.length, first: loads[0]?.load ?? null, w12: at(12)?.load ?? null, w24: at(24)?.load ?? null, reps12: L.filter((x) => x.w < 12).at(-1)?.reps, reps24: L.at(-1)?.reps, ups, downs, repsUps, err12: err(12), err24: err(24), capErr12: cap(12), capErr24: cap(24) };
  }
  const codes: Record<string, number> = {};
  for (const a of final?.programmeState?.audit ?? []) {
    const r = a.reason;
    if (!r.code.startsWith('PROGRESSION.') || r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED') continue;
    const key = r.code === 'PROGRESSION.HELD' ? `HELD:${String(r.params.cause)}` : r.code === 'PROGRESSION.ADVANCED' ? `ADVANCED:${String(r.params.variable)}` : r.code;
    codes[key] = (codes[key] ?? 0) + 1;
  }
  const starts: Record<string, number> = {};
  if (w2) for (const [k, v] of Object.entries(probe(w2))) { const key = `${k.split('|')[1] ?? ''}:${v.decision}`; starts[key] = (starts[key] ?? 0) + 1; }
  return { lifts, codes, unjustified, starts, summary: summarize(q) };
}
