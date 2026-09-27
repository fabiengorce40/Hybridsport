import type { ReasonCode, SessionDraft } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { RulesetParameterError } from '../rules/errors.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { estimateDuration, readDurationParams } from './estimate.js';
import type { AthleteTimingProfile, DurationEstimate } from './estimate.js';
import { checkDuration, readToleranceProfile } from './tolerance.js';
import type { DurationCheck } from './tolerance.js';
import { applyLeverStep, defaultLeverPlan, leverDeclarationIssues } from './levers.js';
import type { LeverRef, LeverSteps } from './levers.js';

const reasons = createCoreRegistry();

export type FitOutcome =
  | { readonly status: 'FITS'; readonly session: SessionDraft; readonly estimate: DurationEstimate; readonly check: DurationCheck; readonly appliedLevers: readonly LeverRef[]; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'SHORTER_ACCEPTED'; readonly session: SessionDraft; readonly estimate: DurationEstimate; readonly check: DurationCheck; readonly appliedLevers: readonly LeverRef[]; readonly reasons: readonly ReasonCode[] }
  | { readonly status: 'INFEASIBLE'; readonly estimate?: DurationEstimate; readonly appliedLevers: readonly LeverRef[]; readonly reasons: readonly ReasonCode[] };

/** Pas des leviers, lus dans le ruleset : une clé absente ou non positive est une erreur explicite (jamais ignorée). */
export function readLeverSteps(ruleset: LoadedRuleset): LeverSteps {
  const r = ruleset.numberRecord('duration.leverSteps');
  const step = (k: keyof LeverSteps): number => {
    const v = r[k];
    if (v === undefined || !(v > 0)) throw new RulesetParameterError('duration.leverSteps', 'type', `${k} > 0`);
    return v;
  };
  return { reduceRestS: step('reduceRestS'), shortenConditioningS: step('shortenConditioningS'), reduceRunS: step('reduceRunS'), reduceRunM: step('reduceRunM') };
}

/**
 * Ajuste une séance à son temps disponible (spec 07 §3) :
 * - garantie HARD : p90 ≤ temps réellement disponible, sinon INFEASIBLE (changement d'archétype
 *   ou NO_VALID_SOLUTION côté appelant) ;
 * - leviers appliqués un pas à la fois, dans l'ordre de priorité (travail secondaire avant principal) ;
 * - jamais d'ajout artificiel : une séance plus courte que la cible est acceptée telle quelle.
 */
export function fitDuration(session: SessionDraft, catalog: LoadedCatalog, ruleset: LoadedRuleset, timing?: AthleteTimingProfile, plan?: readonly LeverRef[]): FitOutcome {
  const declaration = leverDeclarationIssues(session);
  if (declaration.length > 0) return { status: 'INFEASIBLE', appliedLevers: [], reasons: declaration.map((d) => reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: d, target: session.id })) };
  const params = readDurationParams(ruleset, timing);
  const profile = readToleranceProfile(ruleset, session.toleranceProfile);
  const steps = readLeverSteps(ruleset);
  const maxSteps = ruleset.number('core.duration.maxLeverSteps');
  const levers = [...(plan ?? defaultLeverPlan(session))];
  const applied: LeverRef[] = [];
  let current = session;
  let leverIndex = 0;
  const primaryBlocks = new Set(session.blocks.filter((b) => b.role === 'primary').map((b) => b.id));

  for (;;) {
    const est = estimateDuration(current, catalog, params);
    if (!est.ok) return { status: 'INFEASIBLE', appliedLevers: applied, reasons: est.reasons };
    const check = checkDuration(est.estimate, current.availableTimeS, current.targetDurationS, profile);
    const done = check.feasible && est.estimate.p50 <= check.upperS;
    if (done) {
      const out: ReasonCode[] = [reasons.emit('DURATION.ESTIMATED', { p50S: est.estimate.p50, p90S: est.estimate.p90 })];
      if (applied.length > 0) out.push(reasons.emit('DURATION.ADJUSTED', { levers: applied.map((a) => `${a.blockId}:${a.lever.kind}`) }));
      // Toute réduction du bloc principal est visible (spec 07 §3.3 point 9), quel que soit le levier.
      for (const blockId of [...new Set(applied.filter((x) => primaryBlocks.has(x.blockId)).map((x) => x.blockId))]) out.push(reasons.emit('DURATION.MAIN_VOLUME_REDUCED', { blockId }));
      if (check.shorterThanTarget) {
        out.push(reasons.emit('DURATION.SHORTER_ACCEPTED', { p50S: est.estimate.p50, targetS: current.targetDurationS }));
        return { status: 'SHORTER_ACCEPTED', session: current, estimate: est.estimate, check, appliedLevers: applied, reasons: out };
      }
      return { status: 'FITS', session: current, estimate: est.estimate, check, appliedLevers: applied, reasons: out };
    }
    // Plafond technique d'itérations (G4) : au plus maxSteps pas, chacun réestimé ; au-delà, échec
    // explicite — jamais une séance non vérifiée.
    if (applied.length >= maxSteps) {
      return { status: 'INFEASIBLE', estimate: est.estimate, appliedLevers: applied, reasons: [reasons.emit('DURATION.INFEASIBLE', { p90S: est.estimate.p90, availableS: current.availableTimeS })] };
    }
    // Trop long (ou p90 au-delà du disponible) : pas suivant du levier courant, sinon levier suivant.
    let next: SessionDraft | null = null;
    while (leverIndex < levers.length && next === null) {
      const ref = levers[leverIndex];
      next = ref ? applyLeverStep(current, ref, steps) : null;
      if (next === null) leverIndex++;
      else if (ref) applied.push(ref);
    }
    if (next === null) {
      if (check.feasible) {
        // Réalisable mais au-dessus de la tolérance haute : SOFT, pas un échec.
        return { status: 'FITS', session: current, estimate: est.estimate, check, appliedLevers: applied, reasons: [reasons.emit('DURATION.OUT_OF_TOLERANCE', { p50S: est.estimate.p50, lowerS: check.lowerS, upperS: check.upperS })] };
      }
      return { status: 'INFEASIBLE', estimate: est.estimate, appliedLevers: applied, reasons: [reasons.emit('DURATION.INFEASIBLE', { p90S: est.estimate.p90, availableS: current.availableTimeS })] };
    }
    current = next;
  }
}
