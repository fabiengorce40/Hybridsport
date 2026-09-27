/**
 * Interaction multisport (spec strength 05 §14) : le StrengthEngine CONSOMME le contexte (notes du
 * planificateur, séances voisines) et abaisse la demande sur les structures concernées. Il ne déplace ni ne
 * supprime jamais une séance ; si l'objet de l'archétype devient impossible, il répond `no_valid_proposal`
 * (jamais un changement silencieux de stimulus, D-S4).
 *
 * Deux sémantiques versionnées :
 * - ruleset 0.2.0 (paramètre `strength.interference.assessment` absent) : une voisine CLÉ à demande HAUTE à
 *   moins de `neighborWindowHours` abaisse la structure (règle binaire historique, reproduite à l'identique) ;
 * - ruleset scientifique V1 : InterferenceAssessment ORDINALE et transparente (demande attendue, importance,
 *   proximité temporelle par bandes, impact locomoteur), dans une LARGE fenêtre de recherche, avec des actions
 *   graduées. VERY_HIGH produit un signal structuré au planificateur, qui reste seul décideur (GlobalPlanner).
 */
import { DEMAND_LEVELS } from '@hybridsport/domain';
import type { ReasonCode } from '@hybridsport/domain';
import type { SportEngineInput } from '@hybridsport/engine';
import type { StrengthContext } from './context.js';
import { INTERFERENCE_LEVELS } from './params.js';
import type { InterferenceAction, InterferenceLevel, StrengthParams } from './params.js';
import { strengthReasons } from './codes.js';

/** Identifiant réservé de la table des notes : hypothèse prudente quand la semaine est inconnue. */
export const WEEK_UNKNOWN_NOTE = 'week_unknown';

export interface InterferenceAssessment {
  readonly structure: string;
  readonly level: InterferenceLevel;
  readonly action: InterferenceAction;
  readonly source: string;
  readonly hours: number;
  readonly priority: string;
  readonly demand: string;
}

export interface InterferenceResult {
  /** Structures abaissées en totalité (séries, RIR, exclusions F9, optionnels retirés) → cause. */
  readonly lowered: Map<string, string>;
  /** Structures à ajustement d'effort seulement (RIR), sans retrait ni exclusion → cause. */
  readonly rirOnly: Map<string, string>;
  /** Évaluations VERY_HIGH : signal au planificateur si la séance a un recouvrement structurel. */
  readonly signals: readonly InterferenceAssessment[];
  readonly assessments: readonly InterferenceAssessment[];
  readonly reasons: ReasonCode[];
}

type Neighbor = StrengthContext['week']['neighbors'][number];
type Assessment = NonNullable<StrengthParams['strength.interference.assessment']>;

/** Niveau ordinal d'un couple (voisine, structure) : matrice transparente, aucun coefficient. */
export function assessNeighborStructure(n: Neighbor, structure: string, a: Assessment): InterferenceLevel {
  const demand = n.demand[structure] ?? 'none';
  const base = DEMAND_LEVELS.indexOf(demand);
  if (base <= 0) return 'NONE';
  const hours = Math.abs(n.hoursFromThisSession);
  const band = a.proximityBands.find((b) => hours <= b.maxHours);
  let level = base + a.importanceDelta[n.priority] + (band ? band.delta : a.beyondBandsDelta);
  for (const m of a.impactModifiers) {
    const impact = DEMAND_LEVELS.indexOf(n.demand[m.demand] ?? 'none');
    if (impact >= DEMAND_LEVELS.indexOf(m.atLeast) && m.structures.includes(structure) && base >= DEMAND_LEVELS.indexOf(m.structureAtLeast)) level += m.delta;
  }
  return INTERFERENCE_LEVELS[Math.max(0, Math.min(INTERFERENCE_LEVELS.length - 1, level))] ?? 'NONE';
}

export function loweredStructures(input: SportEngineInput<StrengthContext>, params: StrengthParams): InterferenceResult {
  const p = params['strength.interference'];
  const lowered = new Map<string, string>();
  const rirOnly = new Map<string, string>();
  const reasons: ReasonCode[] = [];
  const signals: InterferenceAssessment[] = [];
  const assessments: InterferenceAssessment[] = [];
  const add = (s: string, cause: string) => { if (p.perStructure[s] && !lowered.has(s)) { lowered.set(s, cause); reasons.push(strengthReasons.emit('PLAN.STRUCTURE_LOWERED', { structure: s, cause })); } };
  for (const n of [...input.intent.plannerNotes].sort()) for (const s of p.notes[n] ?? []) add(s, `note:${n}`);
  const week = input.discipline.week;
  if (!week.known) {
    reasons.push(strengthReasons.emit('DATA.WEEK_CONTEXT_UNKNOWN'));
    for (const s of p.notes[WEEK_UNKNOWN_NOTE] ?? []) add(s, WEEK_UNKNOWN_NOTE);
  }
  const neighbors = [...week.neighbors].sort((a, b) => a.hoursFromThisSession - b.hoursFromThisSession || (a.stimulus < b.stimulus ? -1 : 1));
  const a = params['strength.interference.assessment'];
  if (!a) {
    for (const n of neighbors) {
      if (n.priority !== 'key' || Math.abs(n.hoursFromThisSession) > p.neighborWindowHours) continue;
      for (const [s, level] of Object.entries(n.demand).sort()) if (level === 'high') add(s, `neighbor:${n.discipline}:${n.stimulus}`);
    }
    return { lowered, rirOnly, signals, assessments, reasons };
  }
  // Évaluation graduée : le niveau retenu par structure est le plus élevé des voisines de la fenêtre de recherche.
  const best = new Map<string, InterferenceAssessment>();
  for (const n of neighbors) {
    if (Math.abs(n.hoursFromThisSession) > a.searchWindowHours) continue;
    for (const [s, demand] of Object.entries(n.demand).sort()) {
      if (!p.perStructure[s] || demand === 'none') continue;
      const level = assessNeighborStructure(n, s, a);
      const item: InterferenceAssessment = { structure: s, level, action: a.actions[level], source: `neighbor:${n.discipline}:${n.stimulus}`, hours: n.hoursFromThisSession, priority: n.priority, demand };
      assessments.push(item);
      reasons.push(strengthReasons.emit('PLAN.INTERFERENCE_ASSESSED', { structure: s, level, action: item.action, source: item.source, hours: item.hours, priority: item.priority, demand }));
      const cur = best.get(s);
      if (!cur || INTERFERENCE_LEVELS.indexOf(level) > INTERFERENCE_LEVELS.indexOf(cur.level)) best.set(s, item);
    }
  }
  for (const [s, item] of [...best].sort(([x], [y]) => (x < y ? -1 : 1))) {
    if (item.action === 'full' || item.action === 'full_and_signal') add(s, item.source);
    else if (item.action === 'rir_only' && !lowered.has(s)) rirOnly.set(s, item.source);
    if (item.action === 'full_and_signal') signals.push(item);
  }
  return { lowered, rirOnly, signals, assessments, reasons };
}
