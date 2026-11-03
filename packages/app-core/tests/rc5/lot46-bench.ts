/**
 * Reprise RC5 lot 4.6 — BANC DE STABILISATION (TEST_ONLY), suite du banc 4.5 (mêmes 20 profils et 14 scénarios d'athlète),
 * sur 12 semaines et, avec `SIM_WEEKS=24`, sur 24 semaines :
 * - A : estimation de capacité hors plage (actuelle, lecture au plafond, borne inférieure, suspension) ;
 * - B : oscillations des charges (hystérésis après une baisse) ;
 * - C : incréments (report d'un saut relatif trop grand) ; mesure des sauts réellement demandés ;
 * - D : B1 + réévaluation des isolations sur la durée (stabilité des exercices) ;
 * - E : redistribution (aucune, avec garde, groupes sous la cible + garde, contenus candidats).
 * Rien n'est activé : options de simulation et contenus candidats hors registre. Aucune conclusion physiologique.
 */
import type { ProgressionReadingOption } from '../../src/index.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { lot43Specs } from './lot43-bench.js';
import type { Lot43Variant } from './lot43-bench.js';
import { LOT44_VARIANTS } from './lot44-bench.js';
import { B_VARIANTS, C_VARIANTS, D_VARIANTS, lot45Scenarios, measureLot45 } from './lot45-bench.js';
import type { Lot45Measure } from './lot45-bench.js';
import { WEEKS } from './lot4-profiles.js';

// technical-constant: TEST_ONLY — paramètres de simulation repris du lot 4.5 ; hystérésis (expositions) et seuil de saut relatif étudiés
const SIM = { floorWindow: 2, reassessEvery: 4, safetyBelow: 3 };
const STAB = { hysteresis: 3, largeStep: 0.1 };
const opt = (o: Partial<ProgressionReadingOption>): ProgressionReadingOption => ({ ...SIM, ...o });
const pick = (list: readonly Lot43Variant[], id: string) => list.find((v) => v.id === id) as Lot43Variant;

export const P_VARIANTS: readonly Lot43Variant[] = [
  pick(LOT44_VARIANTS, 'A'),
  pick(B_VARIANTS, 'B-CLAMP'),
  { id: 'P-BOUND', label: 'Estimation : effort hors plage lu comme BORNE INFÉRIEURE (relève, ne baisse jamais)', progression: opt({ outOfRange: 'bound' }) },
  pick(B_VARIANTS, 'B-SUSP'),
  { id: 'P-HYST', label: 'Oscillations : aucune hausse dans les 3 expositions qui suivent une baisse', progression: opt({ hysteresis: STAB.hysteresis }) },
  { id: 'P-DEFER', label: 'Incréments : hausse de plus de 10 % reportée une fois (preuve supplémentaire)', progression: opt({ deferLargeStep: STAB.largeStep }) },
  { id: 'P-STAB', label: 'Combinaison : borne inférieure + hystérésis + report des grands sauts', progression: opt({ outOfRange: 'bound', hysteresis: STAB.hysteresis, deferLargeStep: STAB.largeStep }) },
  { id: 'P-CLSTAB', label: 'Combinaison : lecture au plafond + hystérésis + report des grands sauts', progression: opt({ outOfRange: 'clamp', hysteresis: STAB.hysteresis, deferLargeStep: STAB.largeStep }) },
];
export const B1_VARIANTS: readonly Lot43Variant[] = [pick(LOT44_VARIANTS, 'A'), pick(C_VARIANTS, 'B1'), pick(C_VARIANTS, 'B1ISO')];
export const RED_VARIANTS: readonly Lot43Variant[] = [
  pick(LOT44_VARIANTS, 'A'), pick(D_VARIANTS, 'RED-GUARD'), pick(D_VARIANTS, 'RED-DEF-GUARD'), pick(D_VARIANTS, 'SW-ALT+RED-GUARD'),
  { id: 'CAND-RED-DEF-GUARD', label: 'Candidat : redistribution vers les groupes sous la cible, avec garde', candidate: { redistribution: { scope: 'deficit', guard: 'keep_residual' } } },
];
export const B1_PROFILES = ['L4-1', 'L4-4', 'L41-H3', 'L41-H4P', 'L41-FORME', 'L41-HIST', 'L41-RUN', 'L42-RUN3'];
export const RED_PROFILES = ['L4-2', 'L43-HYX3', 'L42-SHORT', 'L41-RUN', 'L42-RUN3'];

export interface Lot46Measure extends Lot45Measure {
  readonly weeks: number;
  /** Charges : changements de sens (hausse puis baisse, ou l'inverse) et allers-retours (retour à une charge déjà quittée). */
  readonly reversals: number; readonly roundTrips: number;
  /** Sauts de charge : nombre de hausses, sauts relatifs de plus de 10 %, plus grand saut relatif (%). */
  readonly increases: number; readonly largeSteps: number; readonly maxStepPct: number;
  /** Charges des suivis en fin de période, somme (repère de progression globale). */
  readonly finalLoadSum: number;
}

export function measureLot46(s: ProfileSpec, v: Lot43Variant): Lot46Measure {
  const m = measureLot45(s, v);
  let reversals = 0; let roundTrips = 0; let increases = 0; let large = 0; let maxStep = 0; let finalSum = 0;
  for (const seq of Object.values(m.loadSequences ?? {})) {
    const levels = seq.filter((x, i) => i === 0 || x !== seq[i - 1]);
    for (let i = 1; i < levels.length; i++) {
      const a = levels[i - 1] ?? 0; const b = levels[i] ?? 0;
      if (b > a) { increases += 1; const pct = (b - a) / a; maxStep = Math.max(maxStep, pct); if (pct > STAB.largeStep + 1e-9) large += 1; }
      if (i >= 2 && Math.sign(b - a) !== Math.sign(a - (levels[i - 2] ?? 0))) reversals += 1;
      if (levels.slice(0, i - 1).includes(b)) roundTrips += 1;
    }
    finalSum += seq.at(-1) ?? 0;
  }
  const { loadSequences: _l, ...rest } = m;
  return { ...rest, weeks: WEEKS, reversals, roundTrips, increases, largeSteps: large, maxStepPct: Math.round(maxStep * 1000) / 10, finalLoadSum: Math.round(finalSum * 10) / 10 };
}

/**
 * Plan d'exécution : `scope` = 'progression' (14 scénarios + 20 profils pour A et P-STAB), 'b1', 'red', ou 'profiles'
 * (FAST TRACK : B-CLAMP et P-CLSTAB sur les 20 profils, pour repérer les profils qui régressent).
 */
export type Lot46Scope = 'progression' | 'b1' | 'red' | 'profiles';
export function lot46Plan(scope: Lot46Scope): { variant: Lot43Variant; specs: ProfileSpec[] }[] {
  const all20 = lot43Specs();
  const only = (ids: readonly string[]) => all20.filter((x) => ids.includes(x.id));
  if (scope === 'b1') return B1_VARIANTS.map((variant) => ({ variant, specs: only(B1_PROFILES) }));
  if (scope === 'profiles') return P_VARIANTS.filter((v) => ['B-CLAMP', 'P-CLSTAB'].includes(v.id)).map((variant) => ({ variant, specs: all20 }));
  if (scope === 'red') return RED_VARIANTS.map((variant) => ({ variant, specs: only(RED_PROFILES) }));
  return P_VARIANTS.map((variant) => ({ variant, specs: ['A', 'P-STAB', 'P-BOUND'].includes(variant.id) ? [...lot45Scenarios(), ...all20] : lot45Scenarios() }));
}
