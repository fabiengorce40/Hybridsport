import { z } from 'zod';
import { EVIDENCE_LEVELS, GOVERNANCE_CLASSES, REVIEW_STATUSES, RULE_NATURES, DISCIPLINES } from './enums.js';
import { isSemVer } from './version.js';
import { isISODate } from './time.js';
import { isValidId } from './ids.js';

/**
 * Schéma du ruleset (spec 09 §3, §3.1). Toute valeur sportive vit ICI (données versionnées),
 * jamais dans le code du CORE.
 */
export const zId = z.string().refine(isValidId, 'identifiant invalide');
export const zSemVer = z.string().refine(isSemVer, 'SemVer attendu');
export const zISODate = z.string().refine(isISODate, 'date ISO attendue');

export const APPROVAL_ROLES = ['sports_expert', 'product', 'engineering', 'medical_advisor'] as const;
export type ApprovalRole = (typeof APPROVAL_ROLES)[number];

export const zApproval = z.object({
  role: z.enum(APPROVAL_ROLES),
  name: z.string().min(1),
  qualification: z.string().optional(),
  date: zISODate,
  verdict: z.enum(['approved', 'changes_requested']),
  /** Version de l'élément approuvée. */
  version: zSemVer,
  notes: z.string().optional(),
}).strict();
export type Approval = z.infer<typeof zApproval>;

export const zChangelogEntry = z.object({
  version: zSemVer, date: zISODate, change: z.string().min(1), author: z.string().min(1),
}).strict();
export type ChangelogEntry = z.infer<typeof zChangelogEntry>;

export const zReference = z.object({
  kind: z.enum(['study', 'guideline', 'book', 'expert_consensus', 'internal', 'internal_hypothesis']),
  citation: z.string().min(1),
  url: z.string().optional(),
}).strict();

export const RULE_CATEGORIES = [
  'safety', 'recovery', 'volume', 'intensity', 'progression', 'variety', 'duration', 'scheduling',
  'interference', 'structure', 'equipment', 'eligibility', 'optimization', 'technical',
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const zRuleMetadata = z.object({
  id: zId,
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(RULE_CATEGORIES),
  nature: z.enum(RULE_NATURES),
  level: z.enum(['hard', 'soft', 'target']),
  discipline: z.enum(DISCIPLINES).optional(),
  scope: z.enum(['session', 'week', 'phase', 'program', 'cross_discipline', 'catalog', 'ruleset']),
  rationale: z.string().min(1),
  references: z.array(zReference),
  confidence: z.enum(EVIDENCE_LEVELS),
  version: zSemVer,
  modifiedAt: zISODate,
  changelog: z.array(zChangelogEntry),
  review: z.object({ status: z.enum(REVIEW_STATUSES), approvals: z.array(zApproval) }).strict(),
  governance: z.enum(GOVERNANCE_CLASSES),
}).strict();
export type RuleMetadata = z.infer<typeof zRuleMetadata>;

/** Valeur d'un paramètre : scalaire, liste ou table JSON (ex. matrice, seuils par structure). */
export const zParameterValue = z.json();
export type ParameterValue = z.infer<typeof zParameterValue>;

export const zParameterMetadata = z.object({
  id: zId,
  value: zParameterValue,
  unit: z.string().optional(),
  version: zSemVer,
  modifiedAt: zISODate,
  status: z.enum(REVIEW_STATUSES),
  confidence: z.enum(EVIDENCE_LEVELS),
  provisional: z.boolean(),
  source: z.object({
    kind: z.enum(['study', 'guideline', 'book', 'expert_consensus', 'internal_hypothesis']),
    citation: z.string().optional(),
  }).strict(),
  justification: z.string().min(1),
  governance: z.enum(GOVERNANCE_CLASSES),
  approvedRange: z.object({ min: z.number(), max: z.number() }).strict().optional(),
  /** G1 : sens prudent (cliquet, spec 09 §6). */
  safeDirection: z.enum(['increase', 'decrease']).optional(),
  /** G1 : dernière valeur de référence approuvée. */
  approvedBaseline: zParameterValue.optional(),
  /** Approbations enregistrées (précision d'implémentation de « approbation experte enregistrée »). */
  approvals: z.array(zApproval).default([]),
  changelog: z.array(zChangelogEntry).default([]),
}).strict();
export type ParameterMetadata = z.infer<typeof zParameterMetadata>;
