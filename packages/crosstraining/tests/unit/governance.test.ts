/**
 * C1 — gouvernance : registre entièrement non résolu, intégrité, résolution FAIL-CLOSED.
 */
import { describe, expect, it } from 'vitest';
import {
  CT_CODES, CT_DECISIONS, CT_PARAMETER_REGISTRY_C1, CT_RULESET_VERSION, CURRENT_CT_GOVERNANCE, governanceIssues, registryIssues, resolveParameter,
} from '../../src/index.js';
import type { CtParameter } from '../../src/index.js';
import { productionEligible, withCandidate } from '../fixtures.js';

const byId = (id: string): CtParameter => {
  const p = CT_PARAMETER_REGISTRY_C1.find((x) => x.parameterId === id);
  if (!p) throw new Error(id);
  return p;
};
const codes = (xs: readonly { code: string }[]) => xs.map((x) => x.code);

/** Parcourt une valeur JSON et renvoie tout nombre ou booléen rencontré. */
function scalars(v: unknown): unknown[] {
  if (typeof v === 'number' || typeof v === 'boolean') return [v];
  if (Array.isArray(v)) return v.flatMap(scalars);
  if (v !== null && typeof v === 'object') return Object.values(v).flatMap(scalars);
  return [];
}

describe('registre C1 : tout est non résolu', () => {
  it('registre et état cohérents', () => {
    expect(registryIssues(CT_PARAMETER_REGISTRY_C1)).toEqual([]);
    expect(governanceIssues(CURRENT_CT_GOVERNANCE)).toEqual([]);
  });

  it('chaque paramètre : aucune valeur, maturité UNRESOLVED, preuve UNRESOLVED, aucune approbation, version du ruleset', () => {
    for (const p of CT_PARAMETER_REGISTRY_C1) {
      expect(p.value.status, p.parameterId).toBe('unresolved');
      expect(p.maturity, p.parameterId).toBe('UNRESOLVED');
      expect(p.evidenceStatus, p.parameterId).toBe('UNRESOLVED');
      expect(p.approvals, p.parameterId).toEqual([]);
      expect(p.rulesetVersion).toBe(CT_RULESET_VERSION);
      expect(p.reviewRef).toMatch(/^docs\/kairo\/CROSSTRAINING-EVIDENCE-PACK\.md#ct-(d\d{1,2}|g1)$/);
      expect(scalars(p.value), p.parameterId).toEqual([]);
    }
  });

  it('aucun état n’est décidé, signé ou satisfait ; le ruleset n’est pas verrouillé', () => {
    const g = CURRENT_CT_GOVERNANCE;
    expect(g.rulesetLocked).toBe(false);
    expect(new Set(Object.values(g.decisions))).toEqual(new Set(['PENDING']));
    expect(new Set(Object.values(g.g1Policies))).toEqual(new Set(['UNSIGNED']));
    expect(new Set(Object.values(g.technical))).toEqual(new Set(['UNSATISFIED']));
  });

  it('chaque décision CT-D1…CT-D15 et CT-G1 gouverne au moins un paramètre', () => {
    const covered = new Set(CT_PARAMETER_REGISTRY_C1.map((p) => p.decisionId));
    for (const d of CT_DECISIONS) expect(covered.has(d), d).toBe(true);
  });

  it('estimation, prescription et résultat ne partagent jamais un paramètre', () => {
    expect(byId('ct.estimation.workRates').category).toBe('ESTIMATION');
    expect(byId('ct.dose.construction').category).toBe('PRESCRIPTION');
    expect(byId('ct.history.completionCriterion').category).toBe('RESULT');
    // Seuls les identifiants ct.estimation.* sont des paramètres d'estimation, et réciproquement.
    for (const p of CT_PARAMETER_REGISTRY_C1) expect(p.parameterId.startsWith('ct.estimation.'), p.parameterId).toBe(p.category === 'ESTIMATION');
    // Aucun ancien identifiant « catalogue » n'associe le débit du catalogue à une prescription.
    expect(CT_PARAMETER_REGISTRY_C1.some((p) => p.parameterId === 'ct.catalog.workRates')).toBe(false);
  });
});

describe('intégrité du registre (anomalies détectées)', () => {
  const base = byId('ct.format.emomDensity');
  it('schéma invalide, doublon, incohérences valeur / maturité / preuve, maturité sans approbation', () => {
    expect(registryIssues([{ parameterId: 'x' }])).toEqual(['x : schéma invalide']);
    expect(registryIssues([null])).toEqual(['undefined : schéma invalide']);
    expect(registryIssues([base, base])).toEqual([`${base.parameterId} : identifiant dupliqué`]);
    expect(registryIssues([{ ...base, maturity: 'EXPERT_PROPOSED' }])).toEqual([`${base.parameterId} : sans valeur mais maturité EXPERT_PROPOSED`]);
    expect(registryIssues([{ ...base, value: { status: 'candidate', value: 'v' } }])).toEqual([`${base.parameterId} : valeur candidate mais maturité UNRESOLVED`]);
    expect(registryIssues([{ ...base, evidenceStatus: 'SUPPORTED' }])).toEqual([`${base.parameterId} : sans valeur mais statut de preuve SUPPORTED`]);
    expect(registryIssues([{ ...withCandidate(base), maturity: 'EXPERT_APPROVED' }])).toEqual([`${base.parameterId} : maturité EXPERT_APPROVED sans approbation`]);
    expect(registryIssues([withCandidate(base)])).toEqual([]);
    expect(registryIssues([productionEligible(base)])).toEqual([]);
  });

  it('une valeur non finie ou une clé inconnue est refusée par le schéma', () => {
    expect(registryIssues([{ ...withCandidate(base), value: { status: 'candidate', value: Number.NaN } }])).toHaveLength(1);
    expect(registryIssues([{ ...base, extra: true }])).toHaveLength(1);
    expect(registryIssues([{ ...base, value: { status: 'unresolved', reason: '' } }])).toHaveLength(1);
  });

  it('état de gouvernance : schéma, version, verrou, décision inconnue', () => {
    expect(governanceIssues({ ...CURRENT_CT_GOVERNANCE, extra: 1 }).length).toBeGreaterThan(0);
    const other = { ...base, rulesetVersion: 'autre' };
    expect(governanceIssues({ ...CURRENT_CT_GOVERNANCE, parameters: [other] })).toEqual([`${base.parameterId} : version autre ≠ ruleset ${CT_RULESET_VERSION}`]);
    expect(governanceIssues({ ...CURRENT_CT_GOVERNANCE, parameters: [productionEligible(base)] })).toEqual([`${base.parameterId} : PRODUCTION_ELIGIBLE sans ruleset verrouillé`]);
    expect(governanceIssues({ ...CURRENT_CT_GOVERNANCE, rulesetLocked: true, parameters: [productionEligible(base)] })).toEqual([]);
    expect(governanceIssues({ ...CURRENT_CT_GOVERNANCE, parameters: [{ ...base, decisionId: 'CT-D99' }] })).toEqual([`${base.parameterId} : décision CT-D99 inconnue`]);
  });
});

describe('resolveParameter : fail-closed, jamais de défaut', () => {
  it('chaque paramètre du registre C1 est non résolu dans les deux modes, avec une raison explicite', () => {
    for (const p of CT_PARAMETER_REGISTRY_C1) {
      for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
        const r = resolveParameter(CT_PARAMETER_REGISTRY_C1, p.parameterId, mode);
        expect(r.status).toBe('unresolved');
        expect(r).toMatchObject({ cause: 'NO_VALUE' });
        expect(r.reasons).toEqual([expect.objectContaining({ code: CT_CODES.UNRESOLVED_PARAMETER, params: { parameterId: p.parameterId, cause: 'NO_VALUE', mode } })]);
        expect('value' in r).toBe(false);
      }
    }
  });

  it('paramètre absent du registre ⇒ NOT_IN_REGISTRY', () => {
    const r = resolveParameter(CT_PARAMETER_REGISTRY_C1, 'ct.unknown', 'CANDIDATE');
    expect(r).toMatchObject({ status: 'unresolved', cause: 'NOT_IN_REGISTRY' });
    expect(r.reasons[0]?.params).toEqual({ parameterId: 'ct.unknown', cause: 'NOT_IN_REGISTRY', mode: 'CANDIDATE' });
  });

  it('valeur candidate : refusée en PRODUCTION, utilisable et TRACÉE en CANDIDATE', () => {
    const regs = [withCandidate(byId('ct.format.emomDensity'), 'v')];
    expect(resolveParameter(regs, 'ct.format.emomDensity', 'PRODUCTION')).toMatchObject({ status: 'unresolved', cause: 'NOT_PRODUCTION_ELIGIBLE' });
    const c = resolveParameter(regs, 'ct.format.emomDensity', 'CANDIDATE');
    expect(c).toMatchObject({ status: 'resolved', value: 'v', candidate: true });
    expect(codes(c.reasons)).toEqual([CT_CODES.CANDIDATE_VALUE_USED]);
    expect(c.reasons[0]?.params).toEqual({ parameterId: 'ct.format.emomDensity', maturity: 'EXPERT_PROPOSED' });
  });

  it('valeur PRODUCTION_ELIGIBLE : résolue sans trace dans les deux modes', () => {
    const regs = [productionEligible(byId('ct.format.emomDensity'), 'v')];
    expect(resolveParameter(regs, 'ct.format.emomDensity', 'PRODUCTION')).toEqual({ status: 'resolved', value: 'v', candidate: false, reasons: [] });
    expect(resolveParameter(regs, 'ct.format.emomDensity', 'CANDIDATE')).toEqual({ status: 'resolved', value: 'v', candidate: false, reasons: [] });
  });
});
