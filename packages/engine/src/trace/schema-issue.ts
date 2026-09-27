import { isStructureIssueParams } from '@hybridsport/domain';
import type { ReasonCode } from '@hybridsport/domain';
import { ReasonCodeRegistry } from './registry.js';
import { CORE_REASON_CODES } from './core-codes.js';

const reasons = new ReasonCodeRegistry(CORE_REASON_CODES);

/** Anomalie de schéma zod, vue minimale (pas de dépendance au type interne de zod). */
export interface SchemaIssueLike { readonly path: readonly PropertyKey[]; readonly message: string; readonly params?: unknown }

/**
 * Traduit une anomalie de schéma en reason code : une anomalie structurelle CORE-EXT-R1 garde son code
 * EXPLICITE (TECHNICAL.STRUCTURE.*) ; toute autre anomalie reste TECHNICAL.SCHEMA_INVALID.
 */
export function schemaIssueReason(issue: SchemaIssueLike, prefix = ''): ReasonCode {
  const path = [prefix, issue.path.map(String).join('.')].filter((x) => x !== '').join('.') || '$';
  if (isStructureIssueParams(issue.params)) return reasons.emit(`TECHNICAL.STRUCTURE.${issue.params.structureIssue}`, { path });
  return reasons.emit('TECHNICAL.SCHEMA_INVALID', { path, problem: issue.message });
}
