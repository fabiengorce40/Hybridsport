import { z } from 'zod';
import { zChangelogEntry, zISODate, zParameterMetadata, zRuleMetadata, zSemVer } from './ruleset.js';
import { zEnforcementPolicy } from './policy.js';

/** Document de ruleset tel qu'il est versionné et livré (JSON). */
export const zRulesetDocument = z.object({
  schemaVersion: z.literal('1'),
  rulesetVersion: zSemVer,
  modifiedAt: zISODate,
  parameters: z.array(zParameterMetadata),
  rules: z.array(zRuleMetadata),
  policies: z.array(zEnforcementPolicy).default([]),
  history: z.array(zChangelogEntry),
}).strict();
export type RulesetDocument = z.infer<typeof zRulesetDocument>;
export type RulesetDocumentInput = z.input<typeof zRulesetDocument>;
