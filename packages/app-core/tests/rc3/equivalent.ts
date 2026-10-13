/**
 * RC3 (préparation) — comparaisons À SÉANCES ÉQUIVALENTES sur 4 semaines.
 *
 * Défaut corrigé du scénario RC1 (`plan` de sim4) : ses événements sont indexés par le RANG GLOBAL de la séance dans
 * la semaine (`k`), donc la séance manquée en S4 (`k === 4`) ou la déclaration de douleur en S3 (`k === 0`) tombent
 * sur un SPORT différent selon l'organisation : deux placements n'étaient pas comparés à séances égales.
 *
 * `planEquivalent` indexe chaque événement par (semaine, sport, rang dans le sport) — mêmes événements quel que soit
 * le placement :
 *   S1 : pas de douleur, fatigue faible ; matériel indisponible sur la 1re Musculation.
 *   S2 : 2e Musculation « récupération mauvaise » ; Cross-training « fatigue élevée » ; le reste « Passer ».
 *   S3 : genou P2 déclaré EXPLICITEMENT à chaque séance (aucune dépendance à l'ordre : « Passer » une douleur connue
 *        dépendrait de la séance qui la déclare la première, donc du placement).
 *   S4 : épaule P1 à chaque Musculation ; 2e COURSE manquée ; le reste « Non ».
 * Une séance non placée (capacité) reste une différence RÉELLE entre organisations : elle est comptée, jamais masquée.
 */
import type { CheckInInput } from '../../src/index.js';
import type { Plan, PlanFn, SimResult, SimSession } from '../consolidation/sim4.js';
import { sumGroups } from './volume-split.js';

export const planEquivalent: PlanFn = (w, v, _k, occ): Plan => {
  void _k;
  const no: CheckInInput = { painAnswer: 'no', fatigue: 'low', recovery: 'good' };
  if (w === 0) return { ci: no, label: 'Non · fatigue faible · bonne récup.', unavailable: v.sport === 'strength' && occ === 0 };
  if (w === 1) {
    if (v.sport === 'strength' && occ === 1) return { ci: { painAnswer: 'no', fatigue: 'moderate', recovery: 'poor' }, label: 'Non · récupération mauvaise' };
    if (v.sport === 'crosstraining') return { ci: { painAnswer: 'no', fatigue: 'high', recovery: 'average' }, label: 'Non · fatigue élevée' };
    return { label: 'Passer (état inconnu)' };
  }
  if (w === 2) return { ci: { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' }, label: 'Oui · genou P2' };
  if (v.sport === 'strength') return { ci: { painAnswer: 'yes', pains: [{ area: 'shoulder', level: 'P1' }], fatigue: 'low', recovery: 'good' }, label: 'Oui · épaule P1' };
  if (v.sport === 'running' && occ === 1) return { label: 'manquée', skip: true };
  return { ci: no, label: 'Non' };
};

// ——— Mesures SÉPARÉES (aucun indicateur composite)

export const LOWER = ['quads', 'hamstrings', 'calves', 'glutes'] as const;
export const UPPER = ['chest', 'back', 'shoulders'] as const;
const DAY_MS = 86_400_000;
const dayGap = (a: string, b: string): number => Math.round(Math.abs(Date.parse(b) - Date.parse(a)) / DAY_MS);

export interface EquivalenceKey { readonly week: number; readonly sport: string; readonly occ: number; readonly status: string }
export interface Rc3Metrics {
  /** Séances par (semaine, sport, rang) et leur issue : base de l'équivalence entre organisations. */
  readonly ledger: readonly EquivalenceKey[];
  readonly placedBySport: Readonly<Record<string, number>>;
  readonly executedBySport: Readonly<Record<string, number>>;
  readonly missed: readonly string[];
  readonly notStarted: readonly string[];
  /** Volume / semaine (moyenne), Musculation + bloc de force CT : prescrit et réalisé, direct et indirect (comptes bruts). */
  readonly prescribedDirect: Readonly<Record<string, number>>; readonly prescribedIndirect: Readonly<Record<string, number>>;
  readonly realizedDirect: Readonly<Record<string, number>>; readonly realizedIndirect: Readonly<Record<string, number>>;
  /** Bilan gouverné de l'application (règle E1, prévu) : rappel, pas un volume utile. */
  readonly appE1Planned: Readonly<Record<string, number>>;
  /** Charge rapprochée (observation) : paires de séances de force réalisées à J+1 / J+2 partageant un groupe DIRECT. */
  readonly forcePairsJ1: number; readonly forcePairsJ2: number; readonly sharedDirectSetsJ1: number;
  /** Courses réalisées le lendemain d'une séance de force réalisée avec séries directes bas du corps. */
  readonly runsAfterLowerForce: number;
  /** Séances de force réalisées le lendemain d'une course réalisée. */
  readonly lowerForceAfterRun: number;
  readonly residualConflicts: number;
  readonly runArchetypes: Readonly<Record<string, number>>;
  readonly runMinutes: number;
  readonly violations: number;
}

export function measureRc3(r: SimResult): Rc3Metrics {
  const weeks = r.weeks.length;
  const add = (o: Record<string, number>, src: Readonly<Record<string, number>> | undefined) => { for (const [g, v] of Object.entries(src ?? {})) o[g] = (o[g] ?? 0) + v / weeks; };
  const pD: Record<string, number> = {}; const pI: Record<string, number> = {}; const rD: Record<string, number> = {}; const rI: Record<string, number> = {};
  for (const s of r.sessions) { add(pD, s.prescribed?.direct); add(pI, s.prescribed?.indirect); add(rD, s.realized?.direct); add(rI, s.realized?.indirect); }
  const done = r.sessions.filter((s) => s.execution === 'réalisée');
  const force = done.filter((s) => s.realized && Object.keys(s.realized.direct).length > 0);
  let j1 = 0; let j2 = 0; let shared = 0;
  for (const [i, a] of force.entries()) for (const b of force.slice(i + 1)) {
    const gap = dayGap(a.date, b.date);
    const common = Object.keys(a.realized?.direct ?? {}).filter((g) => (b.realized?.direct[g] ?? 0) > 0);
    if (common.length === 0 || gap === 0 || gap > 2) continue;
    if (gap === 1) { j1 += 1; for (const g of common) shared += Math.min(a.realized?.direct[g] ?? 0, b.realized?.direct[g] ?? 0); } else j2 += 1;
  }
  const lowerForce = force.filter((s) => sumGroups(s.realized?.direct ?? {}, LOWER) > 0);
  const runs = done.filter((s) => s.sport === 'running');
  const count = (xs: readonly SimSession[]) => xs.reduce<Record<string, number>>((o, s) => ({ ...o, [s.sport]: (o[s.sport] ?? 0) + 1 }), {});
  const appE1: Record<string, number> = {};
  for (const w of r.weeks) for (const [g, v] of Object.entries(w.planned)) appE1[g] = (appE1[g] ?? 0) + v.planned / weeks;
  return {
    ledger: r.sessions.map((s) => ({ week: s.week, sport: s.sport, occ: s.occ ?? -1, status: s.execution })),
    placedBySport: count(r.sessions), executedBySport: count(done),
    missed: r.sessions.filter((s) => s.execution === 'manquée').map((s) => `S${String(s.week)} ${s.sport} #${String((s.occ ?? 0) + 1)}`),
    notStarted: r.sessions.filter((s) => s.execution !== 'réalisée' && s.execution !== 'manquée').map((s) => `S${String(s.week)} ${s.sport} #${String((s.occ ?? 0) + 1)} (${s.execution})`),
    prescribedDirect: pD, prescribedIndirect: pI, realizedDirect: rD, realizedIndirect: rI, appE1Planned: appE1,
    forcePairsJ1: j1, forcePairsJ2: j2, sharedDirectSetsJ1: shared,
    runsAfterLowerForce: runs.filter((x) => lowerForce.some((f) => dayGap(f.date, x.date) === 1 && f.date < x.date)).length,
    lowerForceAfterRun: lowerForce.filter((f) => runs.some((x) => dayGap(x.date, f.date) === 1 && x.date < f.date)).length,
    residualConflicts: r.weeks.reduce((a, w) => a + w.m3.residual, 0),
    runArchetypes: runs.reduce<Record<string, number>>((o, s) => ({ ...o, [s.title]: (o[s.title] ?? 0) + 1 }), {}),
    runMinutes: runs.reduce((a, s) => a + (s.executedEstMin ?? 0), 0),
    violations: r.sessions.reduce((a, s) => a + s.violations.length, 0),
  };
}

/** Deux simulations sont comparables à séances équivalentes si leurs registres (semaine, sport, rang, issue) coïncident. */
export function equivalent(a: Rc3Metrics, b: Rc3Metrics): { readonly ok: boolean; readonly diff: readonly string[] } {
  const key = (x: EquivalenceKey) => `S${String(x.week)} ${x.sport} #${String(x.occ + 1)} ${x.status}`;
  const A = new Set(a.ledger.map(key)); const B = new Set(b.ledger.map(key));
  const diff = [...[...A].filter((x) => !B.has(x)).map((x) => `− ${x}`), ...[...B].filter((x) => !A.has(x)).map((x) => `+ ${x}`)];
  return { ok: diff.length === 0, diff };
}
