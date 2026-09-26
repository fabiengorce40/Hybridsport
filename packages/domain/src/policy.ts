import { z } from 'zod';
import { zId } from './ruleset.js';

/** Placeholder (lot 4) — la politique d'application complète est définie au lot 5. */
export const zEnforcementPolicy = z.object({ ruleId: zId }).passthrough();
export type EnforcementPolicyDocument = z.infer<typeof zEnforcementPolicy>;
