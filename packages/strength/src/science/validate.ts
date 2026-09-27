/**
 * Validation du registre scientifique (addendum 4E §B, §G, §O). Toute incohérence est une anomalie
 * bloquante du gate STRENGTH_SCIENCE_INTEGRATION_GATE :
 * - provenance complète pour CHAQUE paramètre déclaré, sources existantes ;
 * - aucune fausse précision : le statut d'un paramètre n'est jamais plus fort que la plus faible revendication
 *   qui détermine sa valeur ; SUPPORTED exige une synthèse vérifiée et une valeur non provisoire ;
 * - G1 reste G1 : sans visa formel de sécurité, aucun statut autre que SAFETY_SIGNOFF_REQUIRED.
 */
import type { GovernanceClass } from '@hybridsport/domain';
import type { ParameterProvenance, ScienceRegistry, ScienceSource, ScientificStatus, Signoff } from './types.js';
import { atLeast, evidenceRank, SYNTHESIS_TYPES } from './types.js';

export interface ScienceIssue { readonly code: string; readonly subject: string; readonly detail: string }

const NON_SOURCED_TYPES = ['expert_design', 'product_policy', 'technical', 'none'];

const hasSafetySignoff = (s: readonly Signoff[]) => s.some((x) => x.scope === 'safety' && x.verdict === 'approved' && (x.role === 'medical_advisor' || x.role === 'sports_expert'));
const hasExpertSignoff = (s: readonly Signoff[]) => s.some((x) => x.verdict === 'approved' && (x.role === 'sports_expert' || x.role === 'medical_advisor'));

function supportsSynthesis(ids: readonly string[], sources: ReadonlyMap<string, ScienceSource>): boolean {
  // IDENTITY_ONLY ne soutient jamais seul une revendication : il faut au moins des résultats extraits.
  return ids.some((id) => { const s = sources.get(id); return s !== undefined && s.identityVerification === 'CONFIRMED' && SYNTHESIS_TYPES.includes(s.evidenceType) && atLeast(s.verificationLevel, 'SEARCH_SUMMARY'); });
}

export function validateScienceRegistry(reg: ScienceRegistry, declared: readonly { readonly id: string; readonly governance: GovernanceClass }[]): ScienceIssue[] {
  const out: ScienceIssue[] = [];
  const issue = (code: string, subject: string, detail: string) => out.push({ code, subject, detail });
  const sources = new Map(reg.sources.map((s) => [s.id, s]));
  for (const src of reg.sources) {
    // Cohérence du niveau de vérification : aucun résultat ⇔ IDENTITY_ONLY ; revue humaine toujours préparée tant que le texte intégral n'est pas lu.
    if ((src.findings.length === 0) !== (src.verificationLevel === 'IDENTITY_ONLY')) issue('SOURCE_LEVEL', src.id, src.verificationLevel);
    if (src.verificationLevel !== 'FULL_TEXT_VERIFIED' && src.pendingHumanReview.length === 0) issue('SOURCE_REVIEW_MISSING', src.id, 'points de revue humaine absents');
  }
  const byId = new Map<string, ParameterProvenance>();
  for (const p of reg.parameters) {
    if (byId.has(p.parameterId)) issue('DUPLICATE_PROVENANCE', p.parameterId, 'provenance déclarée deux fois');
    byId.set(p.parameterId, p);
  }
  for (const d of declared) {
    const p = byId.get(d.id);
    if (!p) { issue('MISSING_PROVENANCE', d.id, 'paramètre sans provenance'); continue; }
    if (p.governance !== d.governance) issue('GOVERNANCE_MISMATCH', d.id, `${p.governance} ≠ ${d.governance}`);
  }
  const declaredIds = new Set(declared.map((d) => d.id));
  for (const p of reg.parameters) {
    const s = p.parameterId;
    if (!declaredIds.has(s)) issue('UNKNOWN_PARAMETER', s, 'provenance d’un paramètre non déclaré');
    if (p.rulesetVersion !== reg.rulesetVersion) issue('RULESET_VERSION', s, p.rulesetVersion);
    for (const [k, v] of Object.entries({ population: p.population, outcome: p.outcome, uncertainty: p.uncertainty, rationale: p.rationale, reviewDate: p.reviewDate, valueNote: p.valueNote, insufficientEvidenceBehaviour: p.insufficientEvidenceBehaviour })) {
      if (v.trim().length === 0) issue('EMPTY_FIELD', s, k);
    }
    const allIds = [...p.sourceIds, ...p.claims.flatMap((c) => c.sourceIds)];
    for (const id of allIds) if (!sources.has(id)) issue('UNKNOWN_SOURCE', s, id);
    for (const id of allIds) if ((sources.get(id)?.findings.length ?? 1) === 0) issue('SOURCE_WITHOUT_CONTENT', s, id);
    const claimSources = [...new Set(p.claims.flatMap((c) => c.sourceIds))].sort();
    if (claimSources.join('|') !== [...p.sourceIds].sort().join('|')) issue('SOURCES_NOT_FROM_CLAIMS', s, 'sourceIds ≠ sources des revendications');
    if (NON_SOURCED_TYPES.includes(p.evidenceType) !== (p.sourceIds.length === 0)) issue('EVIDENCE_TYPE', s, p.evidenceType);
    // Revendications : une revendication de soutien s'appuie sur une synthèse à l'identité confirmée.
    for (const c of p.claims) {
      if ((c.status === 'SUPPORTED' || c.status === 'SUPPORTED_WITH_RANGE') && !supportsSynthesis(c.sourceIds, sources)) issue('CLAIM_UNSUPPORTED', s, c.id);
      if (c.status === 'CONTEXT_DEPENDENT' && c.sourceIds.length === 0) issue('CLAIM_UNSOURCED', s, c.id);
    }
    // Aucune fausse précision : statut du paramètre ≤ plus faible revendication déterminant la valeur.
    const vd = p.claims.filter((c) => c.valueDetermining);
    const rank = evidenceRank(p.status);
    if (rank > 0 && (vd.length === 0 || vd.some((c) => evidenceRank(c.status) < rank))) issue('FALSE_PRECISION', s, `${p.status} plus fort que la valeur ne le permet`);
    if (p.status === 'SUPPORTED' && (p.provisional || !p.sourceIds.some((id) => { const x = sources.get(id); return x !== undefined && atLeast(x.verificationLevel, 'ABSTRACT_VERIFIED'); }))) issue('PROVISIONAL_AS_SUPPORTED', s, 'SUPPORTED exige une valeur non provisoire et une source au moins ABSTRACT_VERIFIED');
    // Mécanisme / ampleur : l'ampleur ne peut pas être plus faible que le statut affiché ; le mécanisme doit être porté par une revendication de principe.
    if (p.evidenceSplit) {
      if (evidenceRank(p.evidenceSplit.magnitude) < rank) issue('FALSE_PRECISION', s, `ampleur ${p.evidenceSplit.magnitude} plus faible que le statut ${p.status}`);
      if (!p.claims.some((c) => !c.valueDetermining && c.status === p.evidenceSplit?.mechanism)) issue('MECHANISM_UNSOURCED', s, p.evidenceSplit.mechanism);
      if (!p.claims.some((c) => c.valueDetermining && c.status === p.evidenceSplit?.magnitude)) issue('MAGNITUDE_UNDECLARED', s, p.evidenceSplit.magnitude);
    }
    if (p.status === 'SUPPORTED_WITH_RANGE' && !supportsSynthesis(p.sourceIds, sources)) issue('RANGE_UNSUPPORTED', s, 'SUPPORTED_WITH_RANGE sans synthèse confirmée');
    if (p.status !== 'TECHNICAL' && p.provisional && !p.expertSignoffRequired) issue('SIGNOFF_FLAG', s, 'valeur provisoire sans visa d’expert requis');
    // G1 reste G1.
    if (p.governance === 'G1') {
      if (!p.safetySignoffRequired) issue('G1_SAFETY_FLAG', s, 'G1 sans visa de sécurité requis');
      if (p.status !== 'SAFETY_SIGNOFF_REQUIRED' && !hasSafetySignoff(p.signoffs)) issue('G1_PROMOTED_WITHOUT_SIGNOFF', s, p.status);
    }
  }
  for (const pr of reg.principles) {
    for (const id of pr.parameterIds) if (!byId.has(id)) issue('PRINCIPLE_UNKNOWN_PARAMETER', pr.id, id);
    for (const id of pr.sourceIds) if (!sources.has(id)) issue('UNKNOWN_SOURCE', pr.id, id);
    for (const id of pr.sourceIds) if ((sources.get(id)?.findings.length ?? 1) === 0) issue('SOURCE_WITHOUT_CONTENT', pr.id, id);
    if ((pr.status === 'SUPPORTED' || pr.status === 'SUPPORTED_WITH_RANGE') && !supportsSynthesis(pr.sourceIds, sources)) issue('PRINCIPLE_UNSUPPORTED', pr.id, pr.status);
    if (pr.status === 'CONTEXT_DEPENDENT' && pr.sourceIds.length === 0) issue('PRINCIPLE_UNSOURCED', pr.id, pr.status);
  }
  return out;
}

/**
 * Promotion d'un statut : refusée pour un G1 sans visa formel de sécurité, et pour toute valeur provisoire
 * vers SUPPORTED. Le résultat reste soumis à `validateScienceRegistry`.
 */
export function promoteParameter(p: ParameterProvenance, to: ScientificStatus, signoffs: readonly Signoff[] = p.signoffs): ParameterProvenance {
  if (p.governance === 'G1' && !hasSafetySignoff(signoffs)) throw new Error(`${p.parameterId} : G1, promotion refusée sans visa de sécurité`);
  if (to === 'SUPPORTED' && (p.provisional || !hasExpertSignoff(signoffs))) throw new Error(`${p.parameterId} : valeur provisoire, SUPPORTED refusé`);
  return { ...p, status: to, signoffs };
}

export interface ProductionReadiness { readonly ready: boolean; readonly blockers: readonly ScienceIssue[] }

/** Préparation PRODUCTION : chaque G1 visé, aucune valeur provisoire, aucune source connue par simple résumé de recherche. */
export function productionReadiness(reg: ScienceRegistry): ProductionReadiness {
  const blockers: ScienceIssue[] = [];
  const cited = new Set([...reg.parameters.flatMap((p) => p.sourceIds), ...reg.principles.flatMap((p) => p.sourceIds)]);
  for (const p of reg.parameters) {
    if (p.governance === 'G1' && !hasSafetySignoff(p.signoffs)) blockers.push({ code: 'G1_SIGNOFF_MISSING', subject: p.parameterId, detail: 'visa de sécurité formel requis' });
    if (p.provisional) blockers.push({ code: 'PROVISIONAL_VALUE', subject: p.parameterId, detail: p.status });
  }
  for (const s of reg.sources) {
    if (!cited.has(s.id)) continue;
    // ABSTRACT_VERIFIED ≠ FULL_TEXT_VERIFIED : seul le texte intégral lève le blocage.
    if (s.verificationLevel !== 'FULL_TEXT_VERIFIED') blockers.push({ code: 'SOURCE_NOT_FULL_TEXT', subject: s.id, detail: s.verificationLevel });
    if (s.identityVerification === 'PARTIAL') blockers.push({ code: 'SOURCE_IDENTITY_PARTIAL', subject: s.id, detail: 'identité partiellement vérifiée' });
  }
  return { ready: blockers.length === 0, blockers };
}

export type ScientificGate = 'PASS_PROVISIONAL' | 'PASS_PRODUCTION' | 'FAIL';

/** STRENGTH_SCIENTIFIC_V1_GATE : FAIL si le registre est incohérent ; PASS_PRODUCTION seulement si tout est visé et lu. */
export function scientificGate(reg: ScienceRegistry, declared: readonly { readonly id: string; readonly governance: GovernanceClass }[]): { gate: ScientificGate; issues: readonly ScienceIssue[]; readiness: ProductionReadiness } {
  const issues = validateScienceRegistry(reg, declared);
  const readiness = productionReadiness(reg);
  return { gate: issues.length > 0 ? 'FAIL' : readiness.ready ? 'PASS_PRODUCTION' : 'PASS_PROVISIONAL', issues, readiness };
}

export type ScientificLock = 'LOCKED_PROVISIONAL' | 'LOCKED_PRODUCTION' | 'FAIL';

/**
 * STRENGTH_SCIENTIFIC_LOCK_V1 (phase 4F) : FAIL si le registre est incohérent ; LOCKED_PRODUCTION seulement si
 * chaque G1 est visé, aucune valeur provisoire et chaque source citée lue en texte intégral ; sinon
 * LOCKED_PROVISIONAL (moteur gouverné, provenance structurée, heuristiques identifiées, G1 non signés).
 */
export function scientificLock(reg: ScienceRegistry, declared: readonly { readonly id: string; readonly governance: GovernanceClass }[]): { lock: ScientificLock; issues: readonly ScienceIssue[]; readiness: ProductionReadiness } {
  const g = scientificGate(reg, declared);
  return { lock: g.gate === 'FAIL' ? 'FAIL' : g.gate === 'PASS_PRODUCTION' ? 'LOCKED_PRODUCTION' : 'LOCKED_PROVISIONAL', issues: g.issues, readiness: g.readiness };
}
