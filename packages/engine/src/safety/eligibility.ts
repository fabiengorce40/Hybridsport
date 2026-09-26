import type { Eligibility, EngineError, ProgramStatus, ReasonCode, UserDeclaration } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { SafetyRestrictions } from './pain.js';

const reasons = createCoreRegistry();

/**
 * Statut du programme (spec 02 §8) dérivé de l'éligibilité (calculée par la couche app selon les
 * règles G1), des déclarations de l'utilisateur et des restrictions de sécurité. Le moteur n'accorde
 * jamais d'autorisation médicale : il enregistre seulement une déclaration.
 */
export function deriveProgramStatus(input: {
  readonly eligibility: Eligibility;
  readonly declarations: readonly UserDeclaration[];
  readonly safety: Pick<SafetyRestrictions, 'pauseProgram'>;
  readonly ruleset: LoadedRuleset;
}): { readonly status: ProgramStatus; readonly reasons: readonly ReasonCode[] } {
  if (input.eligibility === 'excluded' || input.eligibility === 'suspended') {
    return { status: 'suspended_scope', reasons: [reasons.emit('SCOPE.OUT_OF_SCOPE', { eligibility: input.eligibility })] };
  }
  if (input.eligibility === 'declaration_required') {
    const accepted = input.ruleset.stringList('safety.eligibility.acceptedDeclarations');
    const ok = input.declarations.some((d) => accepted.includes(d.kind));
    if (!ok) return { status: 'suspended_scope', reasons: [reasons.emit('SCOPE.DECLARATION_REQUIRED', { declarationKind: accepted.join('|') })] };
  }
  if (input.safety.pauseProgram) return { status: 'paused_safety', reasons: [reasons.emit('SAFETY.PROGRAM_PAUSED', { cause: 'pain' })] };
  return { status: 'active', reasons: [] };
}

/** Garde de génération : aucune séance hors `active` (SAFETY_BLOCK / OUT_OF_SCOPE). */
export function generationGuard(status: ProgramStatus, eligibility: Eligibility): { ok: true } | { ok: false; error: EngineError } {
  if (status === 'paused_safety') return { ok: false, error: { code: 'SAFETY_BLOCK', reasons: [reasons.emit('SAFETY.PROGRAM_PAUSED', { cause: 'paused_safety' })], alternatives: [] } };
  if (status === 'suspended_scope') return { ok: false, error: { code: 'OUT_OF_SCOPE', reasons: [reasons.emit('SCOPE.OUT_OF_SCOPE', { eligibility })], alternatives: [] } };
  return { ok: true };
}
