/**
 * Reprise RC5 lot 4.3 (Q8 / R4) — MODÈLE RÉDUIT, TEST_ONLY, des règles de progression autorégulée d'un exercice
 * principal, pour comparer CINQ variantes de lecture des séances ALLÉGÉES sans modifier le moteur actif :
 *   current        : règle actuelle (exposition classée contre le RIR PRESCRIT, allégé compris) ;
 *   r4             : R4 « lecture souple » (5e119d6) : séance allégée ⇒ jamais de hausse ni de baisse décidée ; réussite à
 *                    effort observé = preuve (comptée), la hausse n'intervient qu'à une séance NON allégée ;
 *   r4_floor       : R4 + exception « plancher multisport » : l'effort relevé par le seul plancher multisport (durable,
 *                    chaque semaine) est la RÉFÉRENCE de l'athlète, pas un allègement du jour ;
 *   r4_r3          : R4 + R3 (réévaluation de fin de cycle) : toutes les 4 expositions, la charge est recalculée depuis
 *                    l'e1RM observé (médiane des 3 dernières), au plus +15 % par cycle, jamais au-dessus de l'estimation ;
 *   r4_floor_r3    : les deux ;
 *   r4_floor_r3_safety : PROPOSITION du lot 4.3 (exploratoire) — r4_floor_r3, mais `safetyBelow` (3) séances allégées
 *                    consécutives « en dessous » déclenchent la baisse (−10 %) : la fatigue persistante n'est pas ignorée.
 * Paramètres repris du ruleset (`strength.progression`, inchangés) : 2 preuves, marge au-dessus 1, marge en dessous 2,
 * baisse après 2 « en dessous », −10 %, pas de 2,5 kg, plafond de cycle 15 %. Athlète : e1RM (Epley) évoluant de `gain`
 * par semaine, fatigue du jour sur les séances allégées par interférence, répétitions réalisées ≤ répétitions possibles.
 * Résultat : COMPARAISON DE RÈGLES dans un modèle, jamais une mesure physiologique.
 */
export const R4_VARIANTS = ['current', 'r4', 'r4_floor', 'r4_r3', 'r4_floor_r3', 'r4_floor_r3_safety'] as const;
export type R4Variant = (typeof R4_VARIANTS)[number];

// technical-constant: TEST_ONLY — paramètres du ruleset `strength.progression` (copiés, non modifiés) et du modèle
const P = { safetyBelow: 3, evidence: 2, above: 1, below: 2, regressAfter: 2, regression: 0.1, step: 2.5, cycleCap: 0.15, cycleLen: 4, epley: 30, reps: 6, baseRir: 2, floorRir: 4, interferenceRir: 2 };

export interface R4Scenario {
  readonly id: string; readonly label: string;
  readonly weeks: number; readonly startKg: number;
  /** Gain de capacité par semaine (0,005 = +0,5 %) ; `detrain` : perte à la reprise après interruption. */
  readonly gain: number;
  readonly multisport: boolean;
  /** Pour chaque exposition (index), allègement par interférence du jour (RIR +2) ; fatigue réelle `fatigue` ce jour-là. */
  readonly interference: (k: number) => boolean;
  readonly fatigue: number;
  /** Expositions par semaine (1 ; 0,5 = une semaine sur deux, alternance Haut / Bas). */
  readonly perWeek: number;
  /** Semaines sans séance (manquées, interruption). */
  readonly skipWeeks?: readonly number[];
  readonly detrain?: number;
}
export interface R4Decision { readonly k: number; readonly week: number; readonly kg: number; readonly prescribedRir: number; readonly referenceRir: number; readonly lightened: boolean; readonly reps: number; readonly observedRir: number; readonly outcome: 'success' | 'above' | 'below'; readonly decision: 'increase' | 'decrease' | 'hold' | 'reassess'; readonly why: string }
export interface R4Result { readonly variant: R4Variant; readonly scenario: string; readonly startKg: number; readonly finalKg: number; readonly capacityKg: number; readonly increasesOnLightened: number; readonly decreasesOnLightened: number; readonly decreases: number; readonly increases: number; readonly unjustifiedIncreases: number; readonly failedAfterIncrease: number; readonly trace: readonly R4Decision[] }

const round = (kg: number) => Math.round(kg / P.step) * P.step;
const e1rm = (kg: number, toFailure: number) => kg * (1 + toFailure / P.epley);

const floorStep = (kg: number) => Math.floor(kg / P.step + 1e-9) * P.step;
/** Charge supportée par un e1RM pour des répétitions à l'échec données (Epley inverse, comme `pctByRepsToFailure`). */
const loadFor = (e: number, rtf: number) => e / (1 + rtf / P.epley);
const median = (xs: readonly number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };

/**
 * Décision du modèle autorégulé du moteur (`progression.ts`) : classement (`below` si répétitions manquées ou RIR observé
 * ≤ RIR visé − 2 ; `above` si ≥ RIR visé + 1), preuves (2), puis charge = max(actuelle, min(actuelle + pas, e1RM lissé
 * × % des répétitions à l'échec visées, arrondi inférieur)) ; e1RM lissé = médiane (estimation, observé).
 */
export function runR4(variant: R4Variant, sc: R4Scenario): R4Result {
  const usesFloor = variant === 'r4_floor' || variant === 'r4_floor_r3' || variant === 'r4_floor_r3_safety';
  const soft = variant !== 'current';
  const r3 = variant === 'r4_r3' || variant === 'r4_floor_r3' || variant === 'r4_floor_r3_safety';
  const safety = variant === 'r4_floor_r3_safety';
  let lightBelow = 0;
  const floor = sc.multisport ? P.floorRir : P.baseRir;
  let kg = sc.startKg; let evidence = 0; let below = 0; let cycleStart = kg; let pendingIncrease = false;
  const capacity0 = e1rm(sc.startKg, P.reps + floor);
  let est: number | undefined;
  const observed: number[] = [];
  const trace: R4Decision[] = [];
  let k = 0; let lastWeek = -1;
  const out = { inc: 0, dec: 0, incL: 0, decL: 0, unj: 0, failAfter: 0 };
  let prevDecision: R4Decision['decision'] = 'hold';
  for (let w = 0; w < sc.weeks; w++) {
    if (sc.skipWeeks?.includes(w)) continue;
    if (sc.perWeek < 1 && w % Math.round(1 / sc.perWeek) !== 0) continue;
    const weeksOff = lastWeek >= 0 ? w - lastWeek - 1 : 0;
    lastWeek = w;
    const capacity = capacity0 * (1 + sc.gain) ** w * (weeksOff >= 2 ? 1 - (sc.detrain ?? 0) : 1);
    const interference = sc.interference(k);
    // RIR prescrit = plancher (multisport) + interférence du jour ; RIR de référence (R4) : base, ou plancher si exception.
    const prescribedRir = floor + (interference ? P.interferenceRir : 0);
    const referenceRir = usesFloor ? floor : P.baseRir;
    const lightened = soft && prescribedRir > referenceRir;
    const dayCap = capacity * (interference ? 1 - sc.fatigue : 1);
    const toFailure = Math.max(0, P.epley * (dayCap / kg - 1));
    const reps = Math.min(P.reps, Math.floor(toFailure));
    const observedRir = Math.max(0, Math.floor(toFailure - reps));
    // R4 classe une séance allégée contre son RIR de RÉFÉRENCE ; la règle actuelle, contre le RIR prescrit.
    const rirFor = lightened ? referenceRir : prescribedRir;
    const outcome: R4Decision['outcome'] = reps < P.reps || observedRir <= rirFor - P.below ? 'below' : observedRir >= rirFor + P.above && !lightened ? 'above' : 'success';
    if (reps === P.reps) { const o = e1rm(kg, reps + observedRir); observed.push(o); est = est === undefined ? o : median([est, o]); }
    let decision: R4Decision['decision'] = 'hold'; let why = '';
    if (lightened) {
      if (outcome !== 'below') { lightBelow = 0; evidence += 1; pendingIncrease = evidence >= P.evidence; why = 'séance allégée : preuve comptée, aucune hausse décidée (R4)'; }
      else if (safety && ++lightBelow >= P.safetyBelow) { decision = 'decrease'; lightBelow = 0; evidence = 0; why = `${String(P.safetyBelow)} séances allégées consécutives en dessous : baisse (fatigue persistante)`; }
      else why = 'séance allégée : en dessous, maintien sans compteur (R4)';
    } else if (outcome === 'below') {
      below += 1; evidence = 0;
      if (below >= P.regressAfter) { decision = 'decrease'; why = `${String(P.regressAfter)} expositions en dessous`; } else why = 'en dessous : compteur';
    } else {
      below = 0; evidence += 1;
      if (evidence >= P.evidence || pendingIncrease) {
        const cand = Math.max(kg, Math.min(kg + P.step, floorStep(loadFor(est ?? 0, P.reps + prescribedRir))));
        if (cand > kg) { decision = 'increase'; why = pendingIncrease && evidence < P.evidence ? 'preuve complétée par une séance allégée' : `${String(P.evidence)} preuves, e1RM le permet`; }
        else why = 'preuves réunies, e1RM ne permet pas de hausse (maintien)';
      } else why = 'preuve 1';
    }
    const d: R4Decision = { k, week: w, kg, prescribedRir, referenceRir, lightened, reps, observedRir, outcome, decision, why };
    if (prevDecision === 'increase' && outcome === 'below') out.failAfter += 1;
    // Charge que la capacité RÉELLE permet aux répétitions et au RIR de référence de l'athlète (plancher).
    const supported = loadFor(capacity, P.reps + floor);
    if (decision === 'increase') {
      kg = Math.min(kg + P.step, Math.max(kg, floorStep(cycleStart * (1 + P.cycleCap))));
      evidence = 0; pendingIncrease = false; out.inc += 1;
      if (interference) out.incL += 1;
      if (kg > supported + P.step / 2) out.unj += 1;
    }
    if (decision === 'decrease') { kg = round(kg * (1 - P.regression)); below = 0; out.dec += 1; if (interference) out.decL += 1; }
    if (!lightened) lightBelow = 0;
    k += 1;
    // R3 : réévaluation de fin de cycle depuis l'e1RM OBSERVÉ (médiane des 3 dernières), jamais au-dessus de l'estimation.
    if (r3 && k % P.cycleLen === 0 && observed.length > 0) {
      const med = median(observed.slice(-3));
      const target = floorStep(Math.min(loadFor(med, P.reps + floor), cycleStart * (1 + P.cycleCap)));
      if (target > kg) { trace.push({ ...d, decision: 'reassess', why: `réévaluation de fin de cycle (R3) : ${String(kg)} → ${String(target)} kg (e1RM observé)` }); kg = target; out.inc += 1; if (kg > supported + P.step / 2) out.unj += 1; }
      cycleStart = kg; evidence = 0; pendingIncrease = false;
    }
    trace.push(d);
    prevDecision = decision;
  }
  const capW = capacity0 * (1 + sc.gain) ** (sc.weeks - 1);
  return { variant, scenario: sc.id, startKg: sc.startKg, finalKg: kg, capacityKg: Math.round(loadFor(capW, P.reps + floor) * 10) / 10, increasesOnLightened: out.incL, decreasesOnLightened: out.decL, decreases: out.dec, increases: out.inc, unjustifiedIncreases: out.unj, failedAfterIncrease: out.failAfter, trace };
}

// technical-constant: TEST_ONLY — scénarios du modèle (gains, fatigue, fréquences, interruptions)
export const R4_SCENARIOS: readonly R4Scenario[] = [
  { id: 'normal-progresse', label: 'Séances normales, athlète qui progresse (+0,5 %/sem.)', weeks: 12, startKg: 100, gain: 0.005, multisport: false, interference: () => false, fatigue: 0, perWeek: 1 },
  { id: 'normal-stagne', label: 'Séances normales, athlète qui stagne', weeks: 12, startKg: 100, gain: 0, multisport: false, interference: () => false, fatigue: 0, perWeek: 1 },
  { id: 'normal-difficulte', label: 'Séances normales, athlète en difficulté (−1 %/sem.)', weeks: 12, startKg: 100, gain: -0.01, multisport: false, interference: () => false, fatigue: 0, perWeek: 1 },
  { id: 'hyrox-progresse', label: 'Musculation + HYROX : plancher multisport, une séance sur deux allégée par interférence (fatigue −5 %)', weeks: 12, startKg: 100, gain: 0.005, multisport: true, interference: (k) => k % 2 === 0, fatigue: 0.05, perWeek: 1 },
  { id: 'course-progresse', label: 'Musculation + Course : toutes les séances allégées par interférence (fatigue −3 %)', weeks: 12, startKg: 100, gain: 0.005, multisport: true, interference: () => true, fatigue: 0.03, perWeek: 1 },
  { id: 'course-stagne', label: 'Musculation + Course, athlète qui stagne', weeks: 12, startKg: 100, gain: 0, multisport: true, interference: () => true, fatigue: 0.03, perWeek: 1 },
  { id: 'course-difficulte', label: 'Musculation + Course, athlète en difficulté (−1 %/sem.)', weeks: 12, startKg: 100, gain: -0.01, multisport: true, interference: () => true, fatigue: 0.03, perWeek: 1 },
  { id: 'ab-alternance', label: 'Alternance Haut / Bas (principal une semaine sur deux), HYROX', weeks: 12, startKg: 100, gain: 0.005, multisport: true, interference: (k) => k % 2 === 1, fatigue: 0.05, perWeek: 0.5 },
  { id: 'manquees', label: 'Séances manquées (S4, S5, S9), multisport', weeks: 12, startKg: 100, gain: 0.005, multisport: true, interference: (k) => k % 2 === 0, fatigue: 0.05, perWeek: 1, skipWeeks: [3, 4, 8] },
  { id: 'reprise', label: 'Retour après 3 semaines d’interruption (−5 %), multisport', weeks: 12, startKg: 100, gain: 0.005, multisport: true, interference: (k) => k % 2 === 0, fatigue: 0.05, perWeek: 1, skipWeeks: [4, 5, 6], detrain: 0.05 },
];
