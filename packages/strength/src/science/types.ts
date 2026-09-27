/**
 * Modèle du registre scientifique du StrengthEngine (ruleset scientifique V1, phase 4E §A–§B). Données
 * auditables et versionnées, jamais des commentaires : chaque paramètre sportif a une provenance structurée,
 * chaque source une vérification d'identité et de contenu déclarée honnêtement.
 */
import type { GovernanceClass } from '@hybridsport/domain';

/**
 * Statuts scientifiques. `SUPPORTED` n'est jamais forcé quand seul le MÉCANISME est soutenu : la valeur
 * numérique d'un paramètre garde le statut de sa revendication la plus faible qui la détermine.
 */
export const SCIENTIFIC_STATUSES = [
  'SUPPORTED', 'SUPPORTED_WITH_RANGE', 'CONTEXT_DEPENDENT', 'PROGRAMMING_HEURISTIC', 'PRODUCT_GUARDRAIL',
  'EXPERT_DESIGN_REVIEW', 'SAFETY_SIGNOFF_REQUIRED', 'INSUFFICIENT_EVIDENCE', 'TECHNICAL',
] as const;
export type ScientificStatus = (typeof SCIENTIFIC_STATUSES)[number];

/** Rang de preuve : seuls les trois premiers statuts affirment un soutien empirique (les autres valent 0). */
export function evidenceRank(s: ScientificStatus): number {
  switch (s) {
    // technical-constant: rangs ordinaux de preuve (SUPPORTED > SUPPORTED_WITH_RANGE > CONTEXT_DEPENDENT > autres)
    case 'SUPPORTED': return 3;
    // technical-constant: rang ordinal de preuve
    case 'SUPPORTED_WITH_RANGE': return 2;
    case 'CONTEXT_DEPENDENT': return 1;
    default: return 0;
  }
}

export const EVIDENCE_TYPES = [
  'position_stand', 'umbrella_review', 'network_meta_analysis', 'meta_analysis', 'systematic_review', 'scoping_review',
  'experimental_study', 'expert_design', 'product_policy', 'technical', 'none',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** Types de synthèse admis pour appuyer une revendication SUPPORTED / SUPPORTED_WITH_RANGE. */
export const SYNTHESIS_TYPES: readonly EvidenceType[] = ['position_stand', 'umbrella_review', 'network_meta_analysis', 'meta_analysis', 'systematic_review'];

export const REGISTRY_CONFIDENCE = ['very_low', 'low', 'moderate', 'high', 'not_applicable'] as const;
export type RegistryConfidence = (typeof REGISTRY_CONFIDENCE)[number];

export interface ScienceSource {
  readonly id: string;
  readonly pmid: string;
  readonly doi?: string;
  readonly citation: string;
  readonly year: string;
  readonly evidenceType: EvidenceType;
  readonly population: string;
  readonly outcomes: readonly string[];
  /** Résultats TELS QUE rapportés par la source consultée (voir `contentVerification`), sans précision ajoutée. */
  readonly findings: readonly string[];
  /** CONFIRMED : PMID, titre, auteurs et revue concordants ; PARTIAL : au moins un élément non vérifié. */
  readonly identityVerification: 'CONFIRMED' | 'PARTIAL';
  /** SEARCH_SUMMARY : contenu connu par des résumés de moteur de recherche seulement (ni résumé officiel ni texte intégral lus). */
  readonly contentVerification: 'SEARCH_SUMMARY' | 'ABSTRACT' | 'FULL_TEXT';
  readonly limitations: string;
}

export interface EvidenceClaim {
  readonly id: string;
  readonly statement: string;
  readonly status: ScientificStatus;
  readonly sourceIds: readonly string[];
  /** La revendication détermine-t-elle la VALEUR numérique (et non seulement le principe) ? */
  readonly valueDetermining: boolean;
}

export type ParameterChange = 'unchanged' | 'reclassified' | 'new_policy';

export interface ParameterProvenance {
  readonly parameterId: string;
  readonly rulesetVersion: string;
  readonly status: ScientificStatus;
  /** Classifications complémentaires (ex. garde-fou produit ET visa de sécurité). */
  readonly alsoClassifiedAs: readonly ScientificStatus[];
  readonly governance: GovernanceClass;
  readonly population: string;
  readonly outcome: string;
  readonly sourceIds: readonly string[];
  readonly evidenceType: EvidenceType;
  readonly confidence: RegistryConfidence;
  readonly uncertainty: string;
  readonly rationale: string;
  readonly reviewDate: string;
  readonly provisional: boolean;
  readonly expertSignoffRequired: boolean;
  readonly safetySignoffRequired: boolean;
  readonly change: ParameterChange;
  /** Lecture de la valeur : ancienne (0.2.0) et nouvelle (candidat) — texte, jamais une nouvelle précision. */
  readonly valueNote: string;
  /** Comportement du moteur si la preuve reste insuffisante. */
  readonly insufficientEvidenceBehaviour: string;
  readonly claims: readonly EvidenceClaim[];
  /** Visas formels enregistrés (vide en V1) : seule voie de promotion d'un paramètre G1. */
  readonly signoffs: readonly Signoff[];
}

export interface Signoff {
  readonly role: 'sports_expert' | 'medical_advisor' | 'product' | 'engineering';
  readonly name: string;
  readonly date: string;
  readonly verdict: 'approved' | 'changes_requested';
  readonly scope: 'expert' | 'safety';
}

/** Principe scientifique de programmation (règle) relié à ses sources et aux paramètres qui l'implémentent. */
export interface SciencePrinciple {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly status: ScientificStatus;
  readonly sourceIds: readonly string[];
  readonly parameterIds: readonly string[];
  readonly engineBehaviour: string;
  readonly notClaimed: string;
}

export interface ScienceRegistry {
  readonly version: string;
  readonly rulesetVersion: string;
  readonly sources: readonly ScienceSource[];
  readonly principles: readonly SciencePrinciple[];
  readonly parameters: readonly ParameterProvenance[];
}
