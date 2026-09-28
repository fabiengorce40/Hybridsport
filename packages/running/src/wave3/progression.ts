/**
 * Progression par PAS MINIMAL (décision produit D1, E-PROG option C ; V23 `running.progression.magnitude`).
 *
 * Règle, sans aucune valeur propre à ce fichier (toutes lues dans V23) :
 * - une seule variable progresse (§T) : durée pour une course continue (EASY, LONG, seuil continu),
 *   nombre de répétitions pour un fractionné ;
 * - seulement après N séances CONSÉCUTIVES du même archétype et de la même famille, toutes réalisées À LA DOSE
 *   ANCRÉE, terminées, sans retour négatif, avec un ressenti connu et non plus dur que prévu (contrat V0 :
 *   retour inconnu ⇒ tolérance inconnue ⇒ HOLD) ;
 * - HOLD (§T) : capacité désactivée, V23 illisible, ancre de repli après un retour négatif (D5), reprise non levée,
 *   tolérance non démontrée. Le HOLD est une décision tracée, jamais un échec.
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningMode, RunningSessionArchetype } from '../model.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { sessionNegativeResponse } from '../wave2/history.js';
import type { RealizedSession, RealizedStructure, StructureFamily } from '../wave2/history.js';

export const V23 = 'running.progression.magnitude';

export type ProgressionVariable = 'durationS' | 'workS' | 'reps';

export interface StepInput {
  readonly archetype: RunningSessionArchetype;
  readonly family: StructureFamily;
  readonly anchor: RealizedSession;
  readonly afterNegativeFallback: boolean;
  readonly history: readonly RealizedSession[];
  readonly now: string;
  readonly capabilityEnabled: boolean;
  readonly returnLifted: boolean;
  readonly returnStartedAt?: string;
  readonly parameters: readonly RunningParameter[];
  readonly mode: RunningMode;
}

export type StepResult =
  | { readonly kind: 'hold'; readonly cause: string; readonly reasons: readonly ReasonCode[]; readonly parameterIds: readonly string[] }
  | { readonly kind: 'step'; readonly variable: ProgressionVariable; readonly from: number; readonly to: number; readonly durationS?: number; readonly structure?: RealizedStructure; readonly reasons: readonly ReasonCode[]; readonly parameterIds: readonly string[] };

interface MinimalStep { readonly durationStepS: number; readonly repetitionStep: number; readonly tolerated: number }

function readV23(v: unknown): MinimalStep | undefined {
  if (v === null || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const d = o.durationStepS;
  const r = o.repetitionStep;
  const n = o.toleratedSessionsBeforeStep;
  if (o.policy !== 'MINIMAL_STEP' || o.oneVariableAtATime !== true) return undefined;
  if (typeof d !== 'number' || !(d > 0) || typeof r !== 'number' || !Number.isInteger(r) || !(r > 0) || typeof n !== 'number' || !Number.isInteger(n) || !(n > 0)) return undefined;
  return { durationStepS: d, repetitionStep: r, tolerated: n };
}

const sameDose = (a: RealizedSession, b: RealizedSession): boolean =>
  a.realizedDurationS === b.realizedDurationS && JSON.stringify(a.structure) === JSON.stringify(b.structure);
const tolerated = (s: RealizedSession): boolean =>
  s.completion === 'COMPLETED' && !sessionNegativeResponse(s) && (s.unexpectedDifficulty === 'EASIER' || s.unexpectedDifficulty === 'AS_EXPECTED');

export function progressionStep(i: StepInput): StepResult {
  const hold = (cause: string, extra: readonly ReasonCode[] = [], used: readonly string[] = []): StepResult =>
    ({ kind: 'hold', cause, reasons: [...extra, runningReasons.emit(RUNNING_CODES.PROGRESSION_HOLD, { archetype: i.archetype, cause })], parameterIds: used });
  if (!i.capabilityEnabled) return hold('CAPABILITY_DISABLED');
  if (i.afterNegativeFallback) return hold('AFTER_NEGATIVE_RESPONSE');
  if (!i.returnLifted) return hold('RETURN_REQUIREMENTS');
  const p = resolveParameter(i.parameters, V23, i.mode);
  const step = p.status === 'resolved' ? readV23(p.value) : undefined;
  if (!step) return hold('MAGNITUDE_UNDEFINED', p.reasons);

  // Les N dernières séances du même type (non futures, post-retour si reprise), de la plus récente à la plus ancienne.
  const sameKind = i.history
    .filter((s) => s.archetype === i.archetype && s.structureFamily === i.family && s.completedAt <= i.now && (i.returnStartedAt === undefined || s.completedAt >= i.returnStartedAt))
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : a.completedAt > b.completedAt ? -1 : a.sessionId < b.sessionId ? -1 : 1));
  const lastN = sameKind.slice(0, step.tolerated);
  if (lastN.length < step.tolerated || lastN[0]?.sessionId !== i.anchor.sessionId || !lastN.every((s) => sameDose(s, i.anchor) && tolerated(s))) {
    return hold('TOLERANCE_NOT_DEMONSTRATED', p.reasons, [V23]);
  }

  const applied = (variable: ProgressionVariable, from: number, to: number, extra: { durationS?: number; structure?: RealizedStructure }): StepResult => ({
    kind: 'step', variable, from, to, ...extra, parameterIds: [V23],
    reasons: [...p.reasons, runningReasons.emit(RUNNING_CODES.PROGRESSION_STEP_APPLIED, { archetype: i.archetype, variable, from, to, parameterId: V23 })],
  });
  const st = i.anchor.structure;
  if (st === undefined) return applied('durationS', i.anchor.realizedDurationS, i.anchor.realizedDurationS + step.durationStepS, { durationS: i.anchor.realizedDurationS + step.durationStepS });
  if (st.reps > 1) return applied('reps', st.reps, st.reps + step.repetitionStep, { structure: { ...st, reps: st.reps + step.repetitionStep } });
  return applied('workS', st.workS, st.workS + step.durationStepS, { structure: { ...st, workS: st.workS + step.durationStepS } });
}
