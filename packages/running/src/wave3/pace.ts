/**
 * Vague R5 — cibles d'allure GOUVERNÉES des séances sévères (RULESET-V0 §H, §L) :
 * - SEVERE et SHORT_INTERVAL : ancre V18 (`running.severe.paceAnchor`, performance de course ou contre-la-montre
 *   de 3 à 5 km) ± largeur V03 selon la confiance de la référence ; confiance sans largeur (LOW) ⇒ effort seul ;
 * - HILLS : jamais d'allure (§N : terrain) ; THRESHOLD : effort seul (V05 absent du registre, V04 ambigu) ;
 *   EASY / LONG : jamais (V40 non résolu).
 * Conditions cumulées : capacité `paceTargets` active, montre disponible, ancre lisible, référence conforme.
 * Sinon : effort seul avec TOUTES les causes (jamais une allure fabriquée).
 */
import type { ISODateTime, ReasonCode } from '@hybridsport/domain';
import type { RunningContext } from '../context.js';
import type { ConfidenceLevel, RunningMode } from '../model.js';
import { performancePace, selectReference } from '../references.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import type { QualityArchetype } from './guards.js';

export const V18 = 'running.severe.paceAnchor';
export const V03 = 'running.target.paceRangeWidthByConfidence';

/** Définition de l'ancre V18 : distances de la performance servant d'ancre (définition du jeton, pas une valeur de programmation). */
const ANCHOR_DISTANCES_M: Readonly<Record<string, { readonly minM: number; readonly maxM: number }>> = {
  // technical-constant: définition du jeton d'ancre V18 « course de 3 à 5 km »
  RACE_3K_TO_5K: { minM: 3000, maxM: 5000 },
};
const ANCHOR_TYPES: readonly string[] = ['RACE_RESULT', 'TIME_TRIAL'];
const PACED: readonly QualityArchetype[] = ['SEVERE', 'SHORT_INTERVAL'];

export type PaceCause = 'NOT_PACED_BY_RULE' | 'PACE_TARGETS_DISABLED' | 'NO_WEARABLE' | 'ANCHOR_UNRESOLVED' | 'ANCHOR_REFERENCE_MISSING' | 'WIDTH_UNRESOLVED' | 'REFERENCE_CONFIDENCE_INSUFFICIENT';

export type PaceDecision =
  | { readonly status: 'pace'; readonly secPerKm: { readonly min: number; readonly max: number }; readonly referenceId: string; readonly confidence: ConfidenceLevel; readonly parameterIds: readonly string[]; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'effort'; readonly causes: readonly PaceCause[]; readonly reasons: readonly ReasonCode[] };

export interface PaceInput {
  readonly archetype: QualityArchetype;
  readonly ctx: RunningContext;
  readonly now: string;
  readonly paceTargetsEnabled: boolean;
  readonly parameters: readonly RunningParameter[];
  readonly mode: RunningMode;
}

export function severePace(i: PaceInput): PaceDecision {
  if (!PACED.includes(i.archetype)) return { status: 'effort', causes: ['NOT_PACED_BY_RULE'], reasons: [] };
  const causes: PaceCause[] = [];
  const reasons: ReasonCode[] = [];
  if (!i.paceTargetsEnabled) causes.push('PACE_TARGETS_DISABLED');
  if (!i.ctx.sensors.wearable) causes.push('NO_WEARABLE');
  const anchor = resolveParameter(i.parameters, V18, i.mode);
  reasons.push(...anchor.reasons);
  const av = anchor.status === 'resolved' ? anchor.value as { anchor?: unknown; widthParameter?: unknown } : undefined;
  const distances = typeof av?.anchor === 'string' && av.widthParameter === V03 ? ANCHOR_DISTANCES_M[av.anchor] : undefined;
  if (distances === undefined) return { status: 'effort', causes: [...causes, 'ANCHOR_UNRESOLVED'], reasons };
  const eligible = i.ctx.references.filter((r) => ANCHOR_TYPES.includes(r.type) && r.values.distanceM !== undefined && r.values.distanceM >= distances.minM && r.values.distanceM <= distances.maxM);
  const sel = selectReference(eligible, 'SEVERE_DOMAIN', { now: i.now as ISODateTime, mode: i.mode, parameters: i.parameters });
  const pace = sel.selected ? performancePace(sel.selected) : undefined;
  if (sel.selected === undefined || pace === undefined) return { status: 'effort', causes: [...causes, 'ANCHOR_REFERENCE_MISSING'], reasons };
  const width = resolveParameter(i.parameters, V03, i.mode);
  reasons.push(...width.reasons);
  if (width.status !== 'resolved') return { status: 'effort', causes: [...causes, 'WIDTH_UNRESOLVED'], reasons };
  const band = (width.value as Record<string, { relativeHalfWidth?: unknown } | null | undefined>)[sel.confidence];
  const w = band?.relativeHalfWidth;
  if (typeof w !== 'number' || !(w >= 0) || !(w < 1)) return { status: 'effort', causes: [...causes, 'REFERENCE_CONFIDENCE_INSUFFICIENT'], reasons };
  if (causes.length > 0) return { status: 'effort', causes, reasons };
  return {
    status: 'pace', secPerKm: { min: pace * (1 - w), max: pace * (1 + w) }, referenceId: sel.selected.referenceId, confidence: sel.confidence, parameterIds: [V18, V03],
    reasons: [...reasons, runningReasons.emit(RUNNING_CODES.PACE_TARGET_APPLIED, { archetype: i.archetype, referenceId: sel.selected.referenceId, confidence: sel.confidence, parameterId: V18 })],
  };
}
