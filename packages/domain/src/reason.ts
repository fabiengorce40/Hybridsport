/**
 * Reason codes (spec 10 §1) : explications structurées, jamais du texte libre.
 * Le texte utilisateur est produit plus tard à partir de templates localisés.
 */
export const REASON_DOMAINS = [
  'SAFETY', 'FEASIBILITY', 'TECHNICAL', 'RULE', 'PLAN', 'SELECT', 'DOSE', 'DURATION',
  'RECOVERY', 'DUPLICATE', 'PROGRESSION', 'ADAPT', 'REPAIR', 'SCOPE', 'DATA', 'GOAL', 'STATE',
] as const;
export type ReasonDomain = (typeof REASON_DOMAINS)[number];

/**
 * Catégorie de décision (Phase 3, lot 3) : distingue la protection, la faisabilité,
 * l'intégrité, les règles métier HARD/SOFT, l'optimisation et l'adaptation.
 */
export const DECISION_CATEGORIES = [
  'safety', 'feasibility', 'technical', 'business_hard', 'business_soft', 'optimization', 'adaptation', 'information',
] as const;
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export type ReasonParamValue = string | number | boolean | readonly string[];

export interface ReasonCode {
  /** 'DOMAINE.SOUS_DOMAINE.EVENEMENT[.DETAIL]' — doit être enregistré dans le registre. */
  readonly code: string;
  readonly domain: ReasonDomain;
  readonly category: DecisionCategory;
  readonly params: Readonly<Record<string, ReasonParamValue>>;
  /** Références 'ruleId@version' ayant produit la décision. */
  readonly ruleRefs: readonly string[];
  readonly severity: 'info' | 'notice' | 'warning' | 'error';
  readonly audience: 'internal' | 'user';
}
