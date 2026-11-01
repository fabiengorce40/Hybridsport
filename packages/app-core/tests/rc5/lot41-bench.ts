/**
 * Reprise RC5 lot 4.1 — BANC COMPARATIF 12 semaines (TEST_ONLY). Le même code mesure le moteur du lot 4 (référence figée
 * `__reports__/lot41-reference-lot4.json`, produite par ce banc sur le commit 0680831) et le moteur courant.
 * Athlète simulé à capacité RÉELLE (`capacityAthlete`, +0,5 %/semaine sauf scénario), charges de départ réalistes.
 * Observation algorithmique : aucun gain physiologique n'est déduit d'une progression simulée.
 */
import { readStrengthParams } from '@hybridsport/strength';
import { mondayOf, simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec, SimOut } from '../rc4-audit/rc4-sim.js';
import { selectBeta0Week, strengthContent, strengthWeekVolume } from '../../src/index.js';
import type { ProfileInput, StrengthPersonalization } from '../../src/index.js';
import { capacityAthlete, P1, P2, P3, P4, P5, profileOf, WEEKS } from './lot4-profiles.js';

// technical-constant: TEST_ONLY — charges de départ réalistes (kg) de l'athlète simulé, progression hebdomadaire de capacité
export const START_KG: Readonly<Record<string, number>> = {
  'ex.back_squat': 100, 'ex.bench_press': 70, 'ex.barbell_ohp': 45, 'ex.romanian_deadlift': 90, 'ex.seated_cable_row': 60, 'ex.leg_press': 140, 'ex.single_leg_rdl_db': 24,
  'ex.lat_pulldown': 55, 'ex.machine_row': 60, 'ex.machine_chest_press': 60, 'ex.machine_shoulder_press': 40, 'ex.hack_squat': 80, 'ex.db_shoulder_press': 18, 'ex.db_row': 26, 'ex.goblet_squat': 24,
  'ex.leg_curl': 35, 'ex.leg_extension': 40, 'ex.pec_deck': 40, 'ex.db_bench_press': 24, 'ex.machine_calf_raise': 60, 'ex.bulgarian_split_squat': 16,
};
const GAIN = 0.005;

const run4 = (o: Partial<ProfileInput>, pers: Partial<StrengthPersonalization>) => profileOf(o, pers);
/** 14 profils : les 5 du lot 4 (athlète à capacité réelle) et 9 profils du lot 4.1. */
/** Athlète simulé à capacité réelle (charges de départ réalistes), réutilisé par le banc du lot 4.2. */
export const lot41Athlete = (s: ProfileSpec, gain = GAIN): ProfileSpec => ({ ...s, rirOffset: undefined, startKg: START_KG, perform: capacityAthlete(gain) } as ProfileSpec);
export function lot41Specs(): ProfileSpec[] {
  const athlete = lot41Athlete;
  return [
    athlete(P1), athlete(P2), athlete(P3), athlete(P4), athlete(P5),
    athlete({ id: 'L41-H3', label: 'Hypertrophie 3× (Full Body)', profile: run4({ strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 } }, { days: [0, 2, 4] }) }),
    athlete({ id: 'L41-H4P', label: 'Hypertrophie 4×, priorités dos et épaules', profile: run4({}, { days: [0, 1, 3, 4], priorities: [{ zone: 'back', intention: 'volume' }, { zone: 'shoulders', intention: 'volume' }] }) }),
    athlete({ id: 'L41-RUN', label: 'Musculation 4× + Course 2×', profile: run4({ priorities: ['strength', 'running'], running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } }, { days: [0, 1, 3, 4] }), lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }),
    athlete({ id: 'L41-FORCE', label: 'Force 4× (objectif « devenir plus fort »)', profile: run4({}, { outcome: 'strength', days: [0, 1, 3, 4] }) }),
    athlete({ id: 'L41-FORME', label: 'Forme générale 3×', profile: run4({ strength: { enabled: true, goal: 'general', sessionsPerWeek: 3 } }, { outcome: 'fitness', days: [0, 2, 4] }) }),
    athlete({ ...P4, id: 'L41-HIST', label: 'Historique de progression : Full Body 3× puis A/B 4×, athlète qui progresse (+1 %/sem.)' }, 0.01),
    athlete({ ...P1, id: 'L41-STAG', label: 'Hypertrophie 4×, athlète qui stagne' }, 0),
    athlete({ ...P1, id: 'L41-DIFF', label: 'Hypertrophie 4×, athlète en difficulté (−1 %/sem.)' }, -0.01),
    athlete({ ...P5, id: 'L41-MISS', label: 'Hypertrophie 4×, séances manquées et jours changés' }),
  ];
}

export interface Lot41Measure {
  readonly id: string; readonly label: string;
  readonly planned: number; readonly refused: number; readonly refusalCauses: readonly string[]; readonly done: number;
  readonly duration: { readonly mean: number; readonly max: number; readonly limit: number; readonly over: number };
  /** Par groupe : cible (repère), prévu et réalisé moyens par semaine, séances par semaine le sollicitant (fréquence). */
  readonly volume: Readonly<Record<string, { readonly target: number | null; readonly high: number | null; readonly planned: number; readonly done: number; readonly frequency: number; readonly limitedBy: readonly string[] }>>;
  readonly loads: Readonly<Record<string, { readonly first: string; readonly last: string; readonly n: number; readonly drops: number }>>;
  readonly recoveryMinH: number | null; readonly recoveryUnder36: number;
  readonly substitutions: number; readonly exerciseChanges: number; readonly slotWeeks: number;
  /** Principaux (deux premiers exercices de chaque séance) : changements d'une occurrence de l'archétype à la suivante. Accessoires : exercices distincts par archétype. */
  readonly mainChanges: number; readonly accessoryVariety: number;
  readonly tracks: number; readonly transferred: number; readonly errors: number;
  /** Séries de travail PRÉVUES par semaine (moyenne) selon le schéma moteur PRINCIPAL de l'exercice (catalogue). */
  readonly patterns: { readonly push: number; readonly pull: number; readonly knee: number; readonly hip: number; readonly pushPull: number | null; readonly kneeHip: number | null };
}

const avg = (xs: readonly number[]) => (xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);
/** `sim` (lot 4.2) : simulation déjà calculée (même profil), réutilisée telle quelle ; absente : simulation Beta 0 par défaut. */
export function measureLot41(spec: ProfileSpec, sim?: SimOut): Lot41Measure {
  const r = sim ?? simulate(spec, WEEKS);
  const rows = r.sessions.filter((x) => x.sport === 'strength');
  const groups = Object.keys(readStrengthParams(strengthContent().ruleset).values['strength.volume'].muscleGroups);
  const volume: Record<string, { target: number | null; high: number | null; planned: number; done: number; frequency: number; limitedBy: string[] }> = {};
  for (const g of groups) {
    const planned: number[] = []; const done: number[] = []; const freq: number[] = []; let target: number | null = null; let high: number | null = null; const limited = new Set<string>();
    for (let w = 0; w < WEEKS; w++) {
      const wr = rows.filter((x) => x.week === w + 1);
      const vol = strengthWeekVolume(r.state, mondayOf(w))?.groups.find((x) => x.group === g);
      target = vol?.target ?? target; high = vol?.high ?? high;
      for (const b of (vol as { limitedBy?: readonly string[] } | undefined)?.limitedBy ?? []) limited.add(b);
      planned.push(wr.filter((x) => x.status === 'planned').reduce((n, x) => n + (x.groups[g] ?? 0), 0));
      done.push(wr.filter((x) => x.executed === 'réalisée').reduce((n, x) => n + (x.groups[g] ?? 0), 0));
      freq.push(wr.filter((x) => x.executed === 'réalisée' && (x.groups[g] ?? 0) >= 1).length);
    }
    volume[g] = { target, high, planned: avg(planned), done: avg(done), frequency: avg(freq), limitedBy: [...limited].sort() };
  }
  const loadsBy: Record<string, number[]> = {};
  for (const x of rows.filter((y) => y.executed === 'réalisée')) for (const e of x.exercises.slice(0, 2)) { const kg = Number.parseFloat(e.load); if (Number.isFinite(kg)) (loadsBy[e.id] ??= []).push(kg); }
  const loads = Object.fromEntries(Object.entries(loadsBy).sort().map(([k, v]) => [k, { first: String(v[0]), last: String(v.at(-1)), n: v.length, drops: v.filter((x, i) => i > 0 && x < (v[i - 1] ?? x)).length }]));
  const est: number[] = [];
  for (let w = 0; w < WEEKS; w++) for (const v of selectBeta0Week(r.state, mondayOf(w))?.sessions ?? []) if (v.sport === 'strength' && v.estimatedDurationS) est.push(Math.round(v.estimatedDurationS / 60));
  const limit = spec.profile.strength.personalization?.sessionMinutes ?? 60;
  const region = (a: string) => (/^str_upper/.test(a) ? 'upper' : /^str_lower/.test(a) ? 'lower' : 'full');
  const doneDates = rows.filter((x) => x.executed === 'réalisée' && x.date && x.archetype).map((x) => ({ t: Date.parse(`${x.date as string}T00:00:00Z`), reg: region(x.archetype as string) })).sort((a, b) => a.t - b.t);
  let minH: number | null = null; let under = 0;
  for (let i = 0; i < doneDates.length; i++) for (let j = i + 1; j < doneDates.length; j++) {
    const a = doneDates[i]; const b = doneDates[j];
    if (!a || !b || (a.reg !== b.reg && a.reg !== 'full' && b.reg !== 'full')) continue;
    const h = (b.t - a.t) / 3_600_000; if (minH === null || h < minH) minH = h; if (h < 36) under += 1; break;
  }
  // Stabilité : par archétype et rang d'exercice, changements d'exercice d'une semaine à la suivante.
  const seq = new Map<string, string[]>();
  for (const x of rows.filter((y) => y.status === 'planned' && y.archetype)) x.exercises.forEach((e, k) => seq.set(`${String(x.archetype)}#${String(k)}`, [...(seq.get(`${String(x.archetype)}#${String(k)}`) ?? []), e.id]));
  let changes = 0; let slotWeeks = 0; let mainChanges = 0;
  for (const [key, v] of seq) for (let i = 1; i < v.length; i++) { slotWeeks += 1; if (v[i] !== v[i - 1]) { changes += 1; if (/#[01]$/.test(key)) mainChanges += 1; } }
  const accBy = new Map<string, Set<string>>();
  for (const x of rows.filter((y) => y.status === 'planned' && y.archetype)) for (const e of x.exercises.slice(2)) accBy.set(String(x.archetype), (accBy.get(String(x.archetype)) ?? new Set()).add(e.id));
  const accessoryVariety = avg([...accBy.values()].map((x) => x.size));
  const subs = JSON.stringify(r.state.planner.weeks).match(/"prescriptionSource":"substitution"/g)?.length ?? 0;
  const refusedRows = rows.filter((x) => x.notPlanned);
  const catalog = strengthContent().catalog;
  const pat = { push: 0, pull: 0, knee: 0, hip: 0 };
  for (const x of rows.filter((y) => y.status === 'planned')) for (const e of x.exercises) {
    const p = (catalog.exercise(`ex.${e.id}`) as { patterns?: { primary?: string } } | undefined)?.patterns?.primary ?? '';
    const k = /^push_/.test(p) ? 'push' : /^pull_/.test(p) ? 'pull' : /^(squat|lunge)$/.test(p) ? 'knee' : p === 'hinge' ? 'hip' : undefined;
    if (k) pat[k] += e.sets;
  }
  const per = (n: number) => Math.round((n / WEEKS) * 10) / 10;
  const ratio = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 100) / 100);
  return {
    id: spec.id, label: spec.label, planned: rows.filter((x) => x.status === 'planned').length, refused: refusedRows.length, refusalCauses: [...new Set(refusedRows.map((x) => x.notPlanned as string))].sort(),
    done: rows.filter((x) => x.executed === 'réalisée').length,
    duration: { mean: avg(est), max: Math.max(0, ...est), limit, over: est.filter((x) => x > limit).length },
    volume, loads, recoveryMinH: minH, recoveryUnder36: under, substitutions: subs, exerciseChanges: changes, slotWeeks, mainChanges, accessoryVariety,
    patterns: { push: per(pat.push), pull: per(pat.pull), knee: per(pat.knee), hip: per(pat.hip), pushPull: ratio(pat.push, pat.pull), kneeHip: ratio(pat.knee, pat.hip) },
    tracks: r.state.strength.tracks.length, transferred: r.state.strength.tracks.filter((t) => (t as { transferredFrom?: unknown }).transferredFrom).length, errors: r.errors.length,
  };
}
