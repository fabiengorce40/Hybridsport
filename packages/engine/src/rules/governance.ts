import { canonicalEquals } from '../core/canonical.js';
import type { GovernanceClass, ParameterMetadata, ReasonCode, ReleaseStage, RuleMetadata } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import { hasRequiredApproval } from './ruleset.js';
import type { LoadedRuleset } from './ruleset.js';

const reasons = createCoreRegistry();

export interface RatchetViolation {
  readonly parameterId: string;
  readonly reason: ReasonCode;
}

function loosened(p: ParameterMetadata, value: unknown, baseline: unknown): boolean {
  if (typeof value === 'number' && typeof baseline === 'number' && p.safeDirection) {
    return p.safeDirection === 'increase' ? value < baseline : value > baseline;
  }
  // Valeur non numérique : tout écart à la référence est traité comme un assouplissement potentiel.
  return !canonicalEquals(value ?? null, baseline ?? null);
}

function violation(p: ParameterMetadata, baseline: unknown): RatchetViolation {
  return {
    parameterId: p.id,
    reason: reasons.emit('SAFETY.RATCHET_LOOSENED', { parameterId: p.id, baseline: JSON.stringify(baseline), value: JSON.stringify(p.value) }, { ruleRefs: [`${p.id}@${p.version}`] }),
  };
}

/**
 * Cliquet de sécurité G1 (spec 09 §6) : durcir est toujours permis ; assouplir par rapport à
 * `approvedBaseline` exige une approbation experte enregistrée pour la version courante.
 */
export function checkSafetyRatchet(ruleset: LoadedRuleset): RatchetViolation[] {
  const out: RatchetViolation[] = [];
  for (const p of ruleset.document.parameters) {
    if (p.governance !== 'G1' || p.approvedBaseline === undefined) continue;
    if (loosened(p, p.value, p.approvedBaseline) && !hasRequiredApproval('G1', p.version, p.approvals)) out.push(violation(p, p.approvedBaseline));
  }
  return out;
}

/** Cliquet entre deux versions : la référence elle-même ne peut pas être assouplie ni retirée sans approbation. */
export function checkRatchetTransition(prev: LoadedRuleset, next: LoadedRuleset): RatchetViolation[] {
  const out: RatchetViolation[] = [...checkSafetyRatchet(next)];
  for (const before of prev.document.parameters) {
    if (before.governance !== 'G1') continue;
    const after = next.parameter(before.id);
    const approved = after !== undefined && hasRequiredApproval('G1', after.version, after.approvals);
    if (!after) { out.push(violation({ ...before, value: null }, before.approvedBaseline ?? before.value)); continue; }
    if (approved) continue;
    const prevRef = before.approvedBaseline ?? before.value;
    const nextRef = after.approvedBaseline ?? after.value;
    if (after.governance !== 'G1' || loosened(after, nextRef, prevRef)) out.push(violation(after, prevRef));
  }
  return out;
}

export interface GovernanceGate {
  readonly stage: ReleaseStage;
  readonly blocking: readonly string[];
  readonly warnings: readonly string[];
}

const REVIEWED_OR_BETTER = new Set(['reviewed', 'approved']);

function describe(kind: 'param' | 'rule', id: string, governance: GovernanceClass, status: string): string {
  return `${kind} ${id} (${governance}, ${status})`;
}

/**
 * Porte de gouvernance par environnement (matrice validée, spec 09 §6) pour le statut des règles et
 * paramètres. Les échecs de tests, la mutation et les parcours sont gérés par la CI.
 */
export function evaluateGovernanceGate(ruleset: LoadedRuleset, stage: ReleaseStage): GovernanceGate {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (stage !== 'local') {
    for (const v of checkSafetyRatchet(ruleset)) blocking.push(`cliquet G1 : ${v.parameterId} assoupli sans approbation`);
  }
  const items: { kind: 'param' | 'rule'; id: string; governance: GovernanceClass; status: string; hardRule: boolean; inRange: boolean }[] = [
    ...ruleset.document.parameters.map((p: ParameterMetadata) => ({
      kind: 'param' as const, id: p.id, governance: p.governance, status: p.status, hardRule: false,
      inRange: p.approvedRange !== undefined && typeof p.value === 'number' && p.value >= p.approvedRange.min && p.value <= p.approvedRange.max,
    })),
    ...ruleset.document.rules.map((r: RuleMetadata) => ({ kind: 'rule' as const, id: r.id, governance: r.governance, status: r.review.status, hardRule: r.level === 'hard', inRange: false })),
  ];
  for (const it of items) {
    if (it.status === 'deprecated') continue;
    const label = describe(it.kind, it.id, it.governance, it.status);
    if (it.governance === 'G1') {
      if (stage === 'production' && it.status !== 'approved') blocking.push(`G1 non approuvé : ${label}`);
      else if (stage === 'beta_closed' && !REVIEWED_OR_BETTER.has(it.status)) blocking.push(`G1 non relu : ${label}`);
      else if (it.status !== 'approved') warnings.push(`G1 non approuvé : ${label}`);
    } else if (it.governance === 'G2') {
      if (stage === 'production') {
        const ok = it.kind === 'rule'
          ? (it.hardRule ? it.status === 'approved' : REVIEWED_OR_BETTER.has(it.status))
          : it.status === 'approved' || (it.inRange && it.status === 'reviewed');
        if (!ok) blocking.push(`G2 insuffisant pour la production : ${label}`);
      } else if (it.status !== 'approved') warnings.push(`G2 non approuvé : ${label}`);
    }
  }
  return { stage, blocking, warnings };
}
