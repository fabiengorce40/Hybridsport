/**
 * Phase 6B — gouvernance : registre typé, paramètres non résolus, maturité, G1, V33 / V34.
 */
import { describe, expect, it } from 'vitest';
import {
  APPROVAL_PATH, APPROVER_ROLE, CURRENT_RUNNING_GOVERNANCE, EXPERT_DECISIONS, G1_POLICIES, MATURITY_STATES, REQUIRED_MATURITY,
  RUNNING_CODES, RUNNING_PARAMETER_REGISTRY_V1_CANDIDATE, RUNNING_RULESET_VERSION, governanceIssues, meetsRequiredMaturity, registryIssues,
  resolveParameter, transitionMaturity,
} from '../../src/index.js';
import type { RunningParameter } from '../../src/index.js';
import { approveThroughPath, fullyApprovedGovernance } from '../fixtures.js';

const reg = RUNNING_PARAMETER_REGISTRY_V1_CANDIDATE;
const byId = (id: string): RunningParameter => {
  const p = reg.find((x) => x.parameterId === id);
  if (!p) throw new Error(id);
  return p;
};
const byTag = (tag: string): RunningParameter => {
  const p = reg.find((x) => x.tag === tag);
  if (!p) throw new Error(tag);
  return p;
};

describe('registre des paramètres', () => {
  it('registre et état de gouvernance intègres ; version unique du ruleset', () => {
    expect(registryIssues(reg)).toEqual([]);
    expect(governanceIssues(CURRENT_RUNNING_GOVERNANCE)).toEqual([]);
    expect(new Set(reg.map((p) => p.rulesetVersion))).toEqual(new Set([RUNNING_RULESET_VERSION]));
  });

  it('chaque paramètre expose identifiant, valeur ou absence, unité, provenance, sources, sensibilité, maturité, gouvernance, version', () => {
    for (const p of reg) {
      expect(Object.keys(p).sort()).toEqual(expect.arrayContaining(['parameterId', 'value', 'unit', 'provenanceClass', 'evidenceReferenceIds', 'sensitivity', 'maturity', 'governance', 'rulesetVersion']));
      expect(p.provisional).toBe(true);
    }
  });

  it('AUCUN paramètre approuvé : maturité ≤ EXPERT_PROPOSED, aucune approbation enregistrée', () => {
    for (const p of reg) {
      expect(['UNRESOLVED', 'EXPERT_PROPOSED']).toContain(p.maturity);
      expect(p.approvals).toEqual([]);
      expect(meetsRequiredMaturity(p)).toBe(false);
    }
  });

  it('les paramètres non résolus de la phase 5 restent SANS valeur (aucun zéro, aucun défaut)', () => {
    for (const tag of ['V23', 'V28', 'V31', 'V32', 'V33', 'V34', 'V35', 'V36', 'V37', 'V39', 'V40', 'V41']) {
      const p = byTag(tag);
      expect(p.value.status, tag).toBe('unresolved');
      expect(p.maturity, tag).toBe('UNRESOLVED');
      expect(JSON.stringify(p.value), tag).not.toMatch(/"value"/);
    }
    for (const id of ['running.performance.extrapolationExponent', 'running.performance.predictionUncertaintyWidth', 'running.reference.variabilityMinComparablePerformances']) {
      expect(byId(id).value.status, id).toBe('unresolved');
    }
  });

  it('V38 : famille candidate NON autoritaire, jamais pour le marathon ; V42 contextuel (pas une constante unique)', () => {
    const v38 = byTag('V38');
    expect(v38.value).toEqual({ status: 'candidate', value: expect.objectContaining({ authoritative: false, marathonAuthority: false }) });
    const v42 = byTag('V42');
    expect(v42.value.status).toBe('candidate');
    expect(typeof (v42.value as { value: unknown }).value).toBe('object');
  });

  it('les 7 paramètres des politiques G1 et V33 / V34 sont gouvernés G1, rattachés à leur politique', () => {
    const g1 = reg.filter((p) => p.governance === 'G1_POLICY' || p.governance === 'G1_DOSE');
    expect(g1.map((p) => p.parameterId).sort()).toEqual([
      'running.novice.entryDose', 'running.return.firstExposureDose', 'running.return.protocol', 'running.return.stateBoundaries', 'running.return.unknownStateHandling',
      'running.safety.noviceEntryProtocol', 'running.safety.outOfScopeTriggers', 'running.safety.painActionPolicy', 'running.safety.painWording',
    ]);
    expect(byTag('V33')).toMatchObject({ governance: 'G1_DOSE', g1PolicyId: 'G1-NOVICE' });
    expect(byTag('V34')).toMatchObject({ governance: 'G1_DOSE', g1PolicyId: 'G1-RETURN' });
  });

  it('état réel : 14 décisions PENDING, 4 G1 UNSIGNED, ruleset non verrouillé', () => {
    expect(Object.keys(CURRENT_RUNNING_GOVERNANCE.decisions).sort()).toEqual([...EXPERT_DECISIONS].sort());
    expect(new Set(Object.values(CURRENT_RUNNING_GOVERNANCE.decisions))).toEqual(new Set(['PENDING']));
    expect(Object.keys(CURRENT_RUNNING_GOVERNANCE.g1Policies).sort()).toEqual([...G1_POLICIES].sort());
    expect(new Set(Object.values(CURRENT_RUNNING_GOVERNANCE.g1Policies))).toEqual(new Set(['UNSIGNED']));
    expect(CURRENT_RUNNING_GOVERNANCE.rulesetLocked).toBe(false);
  });

  it('intégrité : incohérences détectées (valeur absente mais maturité, SAFETY hors G1, état sans approbation, doublons)', () => {
    const v23 = byTag('V23');
    const v02 = byTag('V02');
    expect(registryIssues([{ ...v23, maturity: 'EXPERT_PROPOSED' }])).toEqual(['running.progression.magnitude : sans valeur mais maturité EXPERT_PROPOSED']);
    expect(registryIssues([{ ...v02, maturity: 'UNRESOLVED' }])).toEqual(['running.target.rpeByDomain : valeur candidate mais maturité UNRESOLVED']);
    expect(registryIssues([{ ...v02, maturity: 'SAFETY_APPROVED' }])).toEqual(expect.arrayContaining(['running.target.rpeByDomain : SAFETY_APPROVED réservé aux paramètres G1']));
    expect(registryIssues([{ ...v02, maturity: 'EXPERT_APPROVED' }])).toEqual(['running.target.rpeByDomain : état EXPERT_APPROVED sans approbation EXPERT']);
    expect(registryIssues([v02, v02])).toEqual(['running.target.rpeByDomain : identifiant dupliqué', 'running.target.rpeByDomain : étiquette V02 dupliquée']);
    expect(registryIssues([{ ...byTag('V33'), g1PolicyId: undefined } as unknown as RunningParameter])).toEqual(['running.novice.entryDose : rattachement G1 incohérent avec la gouvernance']);
    expect(governanceIssues({ ...CURRENT_RUNNING_GOVERNANCE, parameters: [approveThroughPath(v02)] })).toEqual(['running.target.rpeByDomain : PRODUCTION_ELIGIBLE sans ruleset verrouillé']);
  });
});

describe('résolution des paramètres (fail-closed)', () => {
  it('PRODUCTION : aucun paramètre résolu aujourd’hui (maturité insuffisante ou valeur absente)', () => {
    for (const p of reg) {
      const r = resolveParameter(reg, p.parameterId, 'PRODUCTION');
      expect(r.status, p.parameterId).toBe('unresolved');
      if (r.status === 'unresolved') expect(r.cause).toBe(p.value.status === 'unresolved' ? 'NO_VALUE' : 'MATURITY_INSUFFICIENT');
    }
  });

  it('CANDIDATE : valeur candidate résolue ET tracée ; valeur absente jamais résolue', () => {
    const r = resolveParameter(reg, 'running.target.rpeByDomain', 'CANDIDATE');
    expect(r).toMatchObject({ status: 'resolved', candidate: true, maturity: 'EXPERT_PROPOSED', reasons: [{ code: RUNNING_CODES.CANDIDATE_VALUE_USED }] });
    const v33 = resolveParameter(reg, 'running.novice.entryDose', 'CANDIDATE');
    expect(v33).toMatchObject({ status: 'unresolved', cause: 'NO_VALUE', reasons: [{ code: RUNNING_CODES.UNRESOLVED_PARAMETER, params: { parameterId: 'running.novice.entryDose', cause: 'NO_VALUE', mode: 'CANDIDATE' } }] });
    expect(resolveParameter(reg, 'running.does.not.exist', 'CANDIDATE')).toMatchObject({ status: 'unresolved', cause: 'UNKNOWN_PARAMETER' });
  });

  it('un paramètre PRODUCTION_ELIGIBLE se résout en PRODUCTION, sans trace « candidat »', () => {
    const g = fullyApprovedGovernance();
    const r = resolveParameter(g.parameters, 'running.target.rpeByDomain', 'PRODUCTION');
    expect(r).toMatchObject({ status: 'resolved', candidate: false, maturity: 'PRODUCTION_ELIGIBLE', reasons: [] });
  });
});

describe('transitions de maturité', () => {
  const ok = (p: RunningParameter, to: RunningParameter['maturity'], role = APPROVER_ROLE[to], locked = false, value?: unknown) => transitionMaturity(p, to, { role, reference: 'REF-1' }, { rulesetLocked: locked, ...(value !== undefined ? { value } : {}) });
  const cause = (r: ReturnType<typeof transitionMaturity>): string => (r.ok ? 'OK' : String(r.reason.params.cause));

  it('chemins complets par gouvernance, avec le rôle habilité', () => {
    expect(APPROVAL_PATH.G1_DOSE).toEqual(['EXPERT_PROPOSED', 'EXPERT_APPROVED', 'SAFETY_APPROVED']);
    expect(REQUIRED_MATURITY.EXPERT).toBe('EXPERT_APPROVED');
    for (const p of reg) {
      const final = approveThroughPath(p);
      expect(final.maturity).toBe('PRODUCTION_ELIGIBLE');
      expect(registryIssues([final])).toEqual([]);
    }
  });

  it('refus : saut d’étape, rôle erroné, SAFETY hors G1, ELIGIBLE sans verrou ni état requis, valeur absente, référence vide', () => {
    const v02 = byTag('V02');
    expect(cause(ok(v02, 'PRODUCTION_ELIGIBLE', 'RULESET_GATE', true))).toBe('état requis EXPERT_APPROVED non atteint');
    expect(cause(ok(v02, 'EXPERT_APPROVED', 'FOUNDER'))).toBe('rôle FOUNDER non habilité pour EXPERT_APPROVED');
    expect(cause(ok(v02, 'SAFETY_APPROVED'))).toMatch(/^transition hors chemin EXPERT/);
    expect(cause(ok(v02, 'PRODUCT_APPROVED'))).toMatch(/^transition hors chemin EXPERT/);
    const approved = ok(v02, 'EXPERT_APPROVED');
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(cause(ok(approved.parameter, 'PRODUCTION_ELIGIBLE', 'RULESET_GATE', false))).toBe('ruleset non verrouillé');
    expect(cause(ok(approved.parameter, 'PRODUCTION_ELIGIBLE', 'EXPERT', true))).toBe('rôle non habilité');
    const v33 = byTag('V33');
    expect(cause(ok(v33, 'EXPERT_APPROVED'))).toBe('paramètre sans valeur : proposer une valeur d’abord');
    expect(cause(ok(v33, 'EXPERT_PROPOSED'))).toBe('valeur candidate absente ou non sérialisable');
    expect(cause(ok(v33, 'EXPERT_PROPOSED', 'EXPERT', false, { x: 1 }))).toBe('rôle non habilité');
    const g1 = ok(v33, 'EXPERT_PROPOSED', 'AUTHOR', false, { dose: 'test' });
    expect(g1.ok).toBe(true);
    if (!g1.ok) return;
    expect(cause(ok(g1.parameter, 'SAFETY_APPROVED'))).toMatch(/^transition hors chemin G1_DOSE/); // expert d'abord (cosignature)
    expect(cause(transitionMaturity(v02, 'EXPERT_APPROVED', { role: 'EXPERT', reference: ' ' }))).toBe('référence d’approbation absente');
    expect(cause(ok(v02, 'EXPERT_PROPOSED', 'AUTHOR', false, Number.NaN))).toBe('OK'); // révision : la valeur existante est conservée
  });

  it('une transition invalide émet MATURITY_TRANSITION_INVALID ; une révision efface les approbations', () => {
    const r = ok(byTag('V02'), 'SAFETY_APPROVED');
    expect(!r.ok && r.reason).toMatchObject({ code: RUNNING_CODES.MATURITY_TRANSITION_INVALID, params: { parameterId: 'running.target.rpeByDomain', from: 'EXPERT_PROPOSED', to: 'SAFETY_APPROVED' } });
    const a = ok(byTag('V02'), 'EXPERT_APPROVED');
    if (!a.ok) throw new Error('approbation');
    const back = ok(a.parameter, 'EXPERT_PROPOSED', 'AUTHOR');
    expect(back.ok && back.parameter).toMatchObject({ maturity: 'EXPERT_PROPOSED', approvals: [] });
    expect(MATURITY_STATES).toEqual(['UNRESOLVED', 'EXPERT_PROPOSED', 'EXPERT_APPROVED', 'PRODUCT_APPROVED', 'TECHNICAL_APPROVED', 'SAFETY_APPROVED', 'PRODUCTION_ELIGIBLE']);
  });

  it('SAFETY_APPROVED n’est pas exigé pour un paramètre non G1', () => {
    for (const p of reg.filter((x) => !x.governance.startsWith('G1'))) expect(APPROVAL_PATH[p.governance]).not.toContain('SAFETY_APPROVED');
  });
});
