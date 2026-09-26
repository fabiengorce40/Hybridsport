import type { EngineErrorCode, EngineResult, ReasonCode, RepairAction, SessionDraft, TraceRef, ValidationReport } from '@hybridsport/domain';
import { canonicalStringify } from '../core/canonical.js';
import { createCoreRegistry, TraceBuilder } from '../trace/index.js';
import type { DecisionTrace } from '../trace/index.js';
import { fitDuration } from '../duration/fit.js';
import { validateSession } from '../validation/validator.js';
import type { ValidatorDeps } from '../validation/validator.js';
import type { ValidationContext } from '../validation/context.js';

const reasons = createCoreRegistry();

export interface RepairOptions {
  /** Régénération optionnelle (générateur de discipline), appelée au plus une fois, en excluant les exercices fautifs. */
  readonly regenerate?: (excludedExerciseIds: readonly string[]) => SessionDraft | null;
  /**
   * Le repos est-il une issue sportivement valide pour ces violations ? Par défaut : oui seulement si
   * toutes les violations HARD restantes proviennent des restrictions de douleur (spec 09 §2, §7).
   */
  readonly restIsValid?: (report: ValidationReport) => boolean;
  readonly seed: string;
}

export interface RepairOutcome {
  readonly result: EngineResult<SessionDraft>;
  readonly trace: DecisionTrace;
  readonly attempts: number;
}

const PAIN_CODES = new Set(['SAFETY.PAIN.ZONE_RESTRICTED', 'SAFETY.PAIN.MOVEMENT_RESTRICTED']);
const defaultRestIsValid = (r: ValidationReport): boolean => r.errors.length > 0 && r.errors.every((e) => PAIN_CODES.has(e.reason.code));

/** Applique des actions de réparation. Ne touche JAMAIS au temps disponible, au matériel, aux restrictions ni au ruleset. */
function applyActions(s: SessionDraft, actions: readonly RepairAction[], deps: ValidatorDeps): SessionDraft {
  let current = s;
  for (const a of actions) {
    switch (a.kind) {
      case 'replace_exercise': {
        const next = a.candidates[0];
        if (next === undefined) break;
        current = { ...current, blocks: current.blocks.map((b) => ({ ...b, items: b.items.map((i) => (i.id === a.itemId ? { ...i, exerciseId: next } : i)) })) };
        break;
      }
      case 'remove_item': {
        const blocks = current.blocks
          .map((b) => ({ ...b, items: b.items.filter((i) => i.id !== a.itemId) }))
          .filter((b) => b.items.length > 0);
        // Retirer le dernier exercice viderait la séance : sans effet, la violation subsiste et
        // l'issue sera REST_RECOMMENDED ou une erreur explicite — jamais une séance vide.
        if (blocks.length > 0) current = { ...current, blocks };
        break;
      }
      case 'drop_block':
        current = { ...current, blocks: current.blocks.filter((b) => b.id !== a.blockId) };
        break;
      case 'compress_duration': {
        const fit = fitDuration(current, deps.catalog, deps.ruleset, deps.timing);
        if (fit.status !== 'INFEASIBLE') current = fit.session;
        break;
      }
      case 'reduce_sets':
      case 'reduce_rest':
        break; // réservés aux règles de discipline ; aucun effet par défaut
    }
  }
  // Garde : le temps disponible et la cible sont invariants (défense en profondeur).
  return { ...current, availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS };
}

/**
 * RepairEngine (spec 09 §2) : PROPOSAL → VALIDATE → REPAIR → VALIDATE, borné par
 * `core.repair.maxAttemptsPerSession`, sans jamais revisiter un état déjà rejeté.
 * Issues : séance valide | REST_RECOMMENDED (issue valide) | NO_VALID_SOLUTION / REPAIR_EXHAUSTED / SAFETY_BLOCK / OUT_OF_SCOPE.
 */
export function repairSession(proposal: SessionDraft, ctx: ValidationContext, deps: ValidatorDeps, options: RepairOptions): RepairOutcome {
  const maxAttempts = deps.ruleset.number('core.repair.maxAttemptsPerSession');
  const trace = new TraceBuilder({ engineVersion: deps.engineVersion, rulesetVersion: deps.ruleset.version, catalogVersion: deps.catalog.version }, options.seed);
  const visited = new Set<string>();
  const subject = { kind: 'session' as const, id: proposal.id };
  let current = proposal;
  let regenerated = false;
  let attempts = 0;
  let last: ValidationReport | undefined;

  // La référence de trace du résultat est celle de la trace réellement construite.
  const done = (make: (ref: TraceRef) => EngineResult<SessionDraft>): RepairOutcome => {
    const built = trace.build();
    return { result: make({ traceId: built.traceId }), trace: built, attempts };
  };

  while (attempts <= maxAttempts) {
    const key = canonicalStringify(current);
    if (visited.has(key)) break; // anti-boucle : état déjà rejeté
    visited.add(key);
    const { report } = validateSession(current, ctx, deps);
    last = report;
    trace.add({ step: 'validate', subject, decision: report.status, reasons: [...report.errors, ...report.warnings].map((v) => v.reason) });
    if (report.status !== 'INVALID') {
      return done((ref) => ({ status: 'ok', value: current, validation: report, trace: ref, warnings: report.warnings.map((w) => w.reason) }));
    }
    // Statut du programme : aucune réparation possible.
    const blocked = report.errors.find((e) => e.reason.code === 'SAFETY.PROGRAM_PAUSED' || e.reason.code === 'SCOPE.OUT_OF_SCOPE');
    if (blocked) {
      const code: EngineErrorCode = blocked.reason.code === 'SCOPE.OUT_OF_SCOPE' ? 'OUT_OF_SCOPE' : 'SAFETY_BLOCK';
      return done((ref) => ({ status: 'error', error: { code, reasons: [blocked.reason], alternatives: [] }, trace: ref }));
    }
    if (attempts === maxAttempts) break;
    attempts++;
    const actions = report.repairSuggestions;
    if (actions.length > 0) {
      actions.forEach((a) => trace.add({ step: 'repair', subject, decision: a.kind, reasons: [reasons.emit('REPAIR.ACTION', { action: a.kind, target: 'itemId' in a ? a.itemId : 'blockId' in a ? a.blockId : proposal.id, attempt: attempts })] }));
      current = applyActions(current, actions, deps);
      continue;
    }
    if (!regenerated && options.regenerate) {
      regenerated = true;
      const excluded = report.errors.flatMap((e) => (typeof e.reason.params.exerciseId === 'string' ? [e.reason.params.exerciseId] : []));
      const next = options.regenerate(excluded);
      if (next) { current = { ...next, availableTimeS: proposal.availableTimeS, targetDurationS: proposal.targetDurationS }; continue; }
    }
    break;
  }

  const finalReport = last;
  const lastReasons: ReasonCode[] = finalReport?.errors.map((e) => e.reason) ?? [];
  if (finalReport && (options.restIsValid ?? defaultRestIsValid)(finalReport)) {
    const cause = finalReport.errors[0]?.reason.code ?? 'unknown';
    const rest = reasons.emit('REPAIR.REST_RECOMMENDED', { cause });
    trace.add({ step: 'repair', subject, decision: 'rest_recommended', reasons: [rest, ...lastReasons] });
    return done((ref) => ({ status: 'rest_recommended', reasons: [rest, ...lastReasons], trace: ref }));
  }
  const exhausted = attempts >= maxAttempts;
  const code: EngineErrorCode = exhausted ? 'REPAIR_EXHAUSTED' : 'NO_VALID_SOLUTION';
  const head = exhausted ? [reasons.emit('REPAIR.EXHAUSTED', { attempts })] : [];
  trace.add({ step: 'repair', subject, decision: code, reasons: [...head, ...lastReasons] });
  return done((ref) => ({ status: 'error', error: { code, reasons: [...head, ...lastReasons], alternatives: [] }, trace: ref }));
}
