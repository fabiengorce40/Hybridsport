/**
 * Décision longitudinale par sport : évaluation d'une politique GOUVERNÉE (règles ordonnées sur les faits
 * descriptifs). Aucune politique, aucune règle applicable ⇒ BLOCKED (cause exacte). Le Programme Engine ne traduit
 * jamais une décision en pourcentage de charge ou de volume : il ne modifie que l'INTENTION, selon les variantes
 * déclarées par le programme ; la prescription reste au moteur sportif.
 */
import type { ReasonCode } from '@hybridsport/domain';
import { asPrescribedShare } from './adherence.js';
import { PG_CODES, pgReasons } from './codes.js';
import type { PgParamRead, PolicyCondition } from './governance.js';
import type { Adherence, ProgrammeDecision, ProgrammeSport } from './model.js';

export interface DecisionFacts { readonly adherence: Adherence; readonly assessment: ProgrammeDecision['facts']['assessment'] }

export function conditionHolds(c: PolicyCondition, f: DecisionFacts): boolean {
  const a = f.adherence;
  const share = asPrescribedShare(a);
  const checks: boolean[] = [
    c.painReported === undefined || (c.painReported ? a.painReported > 0 : a.painReported === 0),
    c.missedAtLeast === undefined || a.missed >= c.missedAtLeast,
    c.abandonedAtLeast === undefined || a.abandoned >= c.abandonedAtLeast,
    c.modifiedAtLeast === undefined || a.modified >= c.modifiedAtLeast,
    c.notPlannedAtLeast === undefined || a.notPlanned >= c.notPlannedAtLeast,
    c.completedAsPrescribedAtLeast === undefined || a.completedAsPrescribed >= c.completedAsPrescribedAtLeast,
    c.asPrescribedShareAtLeast === undefined || (share !== null && share >= c.asPrescribedShareAtLeast),
    c.asPrescribedShareBelow === undefined || (share !== null && share < c.asPrescribedShareBelow),
    c.assessment === undefined || f.assessment === c.assessment,
  ];
  return checks.every(Boolean);
}

export interface DecisionOutcome {
  readonly decision: ProgrammeDecision['decision'];
  readonly policy: ProgrammeDecision['policy'];
  readonly rule: number | null;
  readonly reasons: readonly ReasonCode[];
}

export function decide(sport: ProgrammeSport, facts: DecisionFacts, policy: PgParamRead<'programme.adaptation.decisionPolicy'>, policyId: string): DecisionOutcome {
  if (!policy.ok) return { decision: 'BLOCKED', policy: null, rule: null, reasons: [...policy.reasons, pgReasons.emit(PG_CODES.DECISION_BLOCKED, { sport, cause: 'POLICY_UNAVAILABLE' })] };
  const meta = { id: policyId, version: policy.version, status: policy.status };
  const idx = policy.value.rules.findIndex((r) => (r.sport === '*' || r.sport === sport) && conditionHolds(r.when, facts));
  const rule = policy.value.rules[idx];
  if (!rule) return { decision: 'BLOCKED', policy: meta, rule: null, reasons: [...policy.reasons, pgReasons.emit(PG_CODES.DECISION_BLOCKED, { sport, cause: 'NO_RULE_APPLIES' })] };
  return { decision: rule.decision, policy: meta, rule: idx, reasons: [...policy.reasons, pgReasons.emit(PG_CODES.DECISION, { sport, decision: rule.decision, policyId, policyVersion: policy.version, rule: idx })] };
}
