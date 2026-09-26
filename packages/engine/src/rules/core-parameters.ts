import type { GovernanceClass } from '@hybridsport/domain';
import type { LoadedRuleset } from './ruleset.js';

export type ParameterType = 'number' | 'boolean' | 'string' | 'string[]' | 'number-record' | 'table';

export interface CoreParameterSpec {
  readonly id: string;
  readonly type: ParameterType;
  readonly governance: GovernanceClass;
  readonly usedBy: string;
}

/**
 * Identifiants des paramètres lus par le CORE. Le CORE ne connaît QUE ces identifiants ;
 * leurs valeurs (souvent provisoires) vivent dans le ruleset (spec 09 §3.1).
 */
export const CORE_PARAMETERS: readonly CoreParameterSpec[] = [
  { id: 'core.repair.maxAttemptsPerSession', type: 'number', governance: 'G4', usedBy: 'repair' },
];

export interface PreflightIssue { readonly id: string; readonly problem: string }

/** Vérifie qu'un ruleset fournit tous les paramètres du CORE avec le bon type. */
export function preflightCoreParameters(ruleset: LoadedRuleset, specs: readonly CoreParameterSpec[] = CORE_PARAMETERS): PreflightIssue[] {
  const out: PreflightIssue[] = [];
  for (const s of specs) {
    const p = ruleset.parameter(s.id);
    if (!p) { out.push({ id: s.id, problem: 'absent' }); continue; }
    if (p.governance !== s.governance) out.push({ id: s.id, problem: `classe ${p.governance} au lieu de ${s.governance}` });
    try {
      switch (s.type) {
        case 'number': ruleset.number(s.id); break;
        case 'boolean': ruleset.boolean(s.id); break;
        case 'string': ruleset.string(s.id); break;
        case 'string[]': ruleset.stringList(s.id); break;
        case 'number-record': ruleset.numberRecord(s.id); break;
        case 'table': if (p.value === null || typeof p.value !== 'object') throw new Error('table'); break;
      }
    } catch {
      out.push({ id: s.id, problem: `type ${s.type} attendu` });
    }
  }
  return out;
}
