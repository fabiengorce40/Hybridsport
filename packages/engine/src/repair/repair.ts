import type { EngineErrorCode, EngineResult, Prescription, ReasonCode, RepairAction, SessionDraft, TraceRef, ValidationReport } from '@hybridsport/domain';
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

/**
 * Une prescription porte-t-elle une CHARGE propre à son mouvement ? Toute charge absolue ou relative à une référence
 * du mouvement : `load` hors séries ; en séries, `load`, `percent_of_reference` (e1RM du mouvement), `effort` avec
 * charge indicative, `bodyweight` avec charge ajoutée, `relative_to_working` (fraction de la charge de travail).
 * Un effort pur (RIR, RPE) ou une dose sans charge n'en porte pas.
 */
export function carriesMovementLoad(p: Prescription): boolean {
  switch (p.type) {
    case 'timed': case 'distance': case 'calories': case 'reps':
      return p.load !== undefined;
    case 'sets':
      return p.sets.some((s) => {
        const i = s.intensity;
        if (!i) return false;
        if (i.mode === 'effort') return i.indicativeKg !== undefined;
        if (i.mode === 'bodyweight') return i.addedKg !== undefined && i.addedKg > 0;
        return true;
      });
    default:
      return false;
  }
}

/** Recherche structurelle d'une cible d'allure (`pace`) dans une séance structurée (cibles et récupérations). */
function hasPaceTarget(v: unknown): boolean {
  if (Array.isArray(v)) return v.some(hasPaceTarget);
  if (v === null || typeof v !== 'object') return false;
  return Object.entries(v).some(([k, x]) => (k === 'pace' && x !== undefined) || hasPaceTarget(x));
}

/**
 * Une prescription porte-t-elle une ALLURE propre à son mouvement ? `paceSecPerKm` (distance, intervalles) ou une
 * cible `pace` d'une séance structurée. Une allure ne vaut que pour le mouvement pour lequel elle a été prescrite.
 */
export function carriesMovementPace(p: Prescription): boolean {
  switch (p.type) {
    case 'distance': case 'intervals':
      return p.paceSecPerKm !== undefined;
    case 'run_structure':
      return hasPaceTarget(p);
    default:
      return false;
  }
}

interface Applied { readonly session: SessionDraft; readonly refused: readonly ReasonCode[] }

/**
 * Applique des actions de réparation. Ne touche JAMAIS au temps disponible, au matériel, aux restrictions ni au ruleset.
 * Frontière de sécurité : une charge ou une allure prescrite pour un mouvement n'est JAMAIS transférée à un autre
 * mouvement. Aucune règle gouvernée de conversion n'existe : la substitution d'un item chargé ou avec allure est
 * refusée (sans effet, tracée), la violation subsiste et l'issue est un refus explicite — jamais un substitut portant
 * la charge ou l'allure d'origine.
 */
function applyActions(s: SessionDraft, actions: readonly RepairAction[], deps: ValidatorDeps): Applied {
  let current = s;
  const refused: ReasonCode[] = [];
  for (const a of actions) {
    switch (a.kind) {
      case 'replace_exercise': {
        const next = a.candidates[0];
        if (next === undefined) break;
        const item = current.blocks.flatMap((b) => b.items).find((i) => i.id === a.itemId);
        if (item && carriesMovementLoad(item.prescription)) {
          refused.push(reasons.emit('REPAIR.LOAD_TRANSFER_REFUSED', { itemId: item.id, exerciseId: item.exerciseId, substituteId: next }));
          break;
        }
        // Même frontière pour l'allure : aucune règle gouvernée de compatibilité ⇒ aucune allure transférée.
        if (item && carriesMovementPace(item.prescription)) {
          refused.push(reasons.emit('REPAIR.PACE_TRANSFER_REFUSED', { itemId: item.id, exerciseId: item.exerciseId, substituteId: next }));
          break;
        }
        current = { ...current, blocks: current.blocks.map((b) => ({ ...b, items: b.items.map((i) => (i.id === a.itemId ? { ...i, exerciseId: next } : i)) })) };
        break;
      }
      case 'remove_item': {
        const blocks = current.blocks
          .map((b) => ({ ...b, items: b.items.filter((i) => i.id !== a.itemId) }))
          .filter((b) => b.items.length > 0);
        // Retirer le dernier exercice du travail PRINCIPAL ferait perdre à la séance son objet (spec 09 §2) :
        // sans effet, la violation subsiste et l'issue sera REST_RECOMMENDED ou une erreur explicite —
        // jamais une séance vidée de son stimulus principal.
        if (blocks.some((b) => b.role === 'primary')) current = { ...current, blocks };
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
  return { session: { ...current, availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS }, refused };
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
  let exhausted = false;
  let last: ValidationReport | undefined;
  const loadRefusals: ReasonCode[] = [];

  // La référence de trace du résultat est celle de la trace réellement construite.
  const done = (make: (ref: TraceRef) => EngineResult<SessionDraft>): RepairOutcome => {
    const built = trace.build();
    return { result: make({ traceId: built.traceId }), trace: built, attempts };
  };

  for (;;) {
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
    // Une tentative n'est comptée que si une réparation est réellement disponible : « aucune
    // réparation possible » (NO_VALID_SOLUTION) n'est jamais confondu avec « plafond atteint ».
    const actions = report.repairSuggestions;
    const canRegenerate = !regenerated && options.regenerate !== undefined;
    if (actions.length === 0 && !canRegenerate) break;
    if (attempts === maxAttempts) { exhausted = true; break; }
    attempts++;
    if (actions.length > 0) {
      actions.forEach((a) => trace.add({ step: 'repair', subject, decision: a.kind, reasons: [reasons.emit('REPAIR.ACTION', { action: a.kind, target: 'itemId' in a ? a.itemId : 'blockId' in a ? a.blockId : proposal.id, attempt: attempts })] }));
      const applied = applyActions(current, actions, deps);
      for (const r of applied.refused) {
        if (!loadRefusals.some((x) => canonicalStringify(x.params) === canonicalStringify(r.params))) loadRefusals.push(r);
      }
      if (applied.refused.length > 0) trace.add({ step: 'repair', subject, decision: 'load_transfer_refused', reasons: [...applied.refused] });
      current = applied.session;
      continue;
    }
    regenerated = true;
    const excluded = report.errors.flatMap((e) => (typeof e.reason.params.exerciseId === 'string' ? [e.reason.params.exerciseId] : []));
    const next = options.regenerate?.(excluded) ?? null;
    if (next) { current = { ...next, availableTimeS: proposal.availableTimeS, targetDurationS: proposal.targetDurationS }; continue; }
    break;
  }

  const finalReport = last;
  const lastReasons: ReasonCode[] = [...loadRefusals, ...(finalReport?.errors.map((e) => e.reason) ?? [])];
  if (finalReport && (options.restIsValid ?? defaultRestIsValid)(finalReport)) {
    const cause = finalReport.errors[0]?.reason.code ?? 'unknown';
    const rest = reasons.emit('REPAIR.REST_RECOMMENDED', { cause });
    trace.add({ step: 'repair', subject, decision: 'rest_recommended', reasons: [rest, ...lastReasons] });
    return done((ref) => ({ status: 'rest_recommended', reasons: [rest, ...lastReasons], trace: ref }));
  }
  const code: EngineErrorCode = exhausted ? 'REPAIR_EXHAUSTED' : 'NO_VALID_SOLUTION';
  const head = exhausted ? [reasons.emit('REPAIR.EXHAUSTED', { attempts })] : [];
  trace.add({ step: 'repair', subject, decision: code, reasons: [...head, ...lastReasons] });
  return done((ref) => ({ status: 'error', error: { code, reasons: [...head, ...lastReasons], alternatives: [] }, trace: ref }));
}
