/**
 * RC4.6 (lot 2, L1b-4) — CONTENU PROVISOIRE versionné « tirage complémentaire » : SURCOUCHE déclarative du ruleset L1-V3
 * (qui reste inchangé et reproductible à l'identique au registre de contenu versionné d'app-core), sans code moteur :
 * - besoin `pull_complement` (même exigence que le tirage horizontal), sans repli de substitution ;
 * - emplacement `fb.pull_c` du Full Body : accessoire facultatif, suivi, à TEMPS RÉSIDUEL (attribut F6 R1, servi après
 *   toute la composition, mollets compris) et jusqu'à la cible hebdomadaire de ses groupes (attribut F6 R2 : plancher du
 *   dos) ; jamais forcé si le temps ou la récupération ne le permettent pas ;
 * - retiré quand une voisine sollicite la PRÉHENSION (règle d'interférence existante `dropOptionalNeeds` de `grip`) ;
 * - dernier de `optionalOrder` et de `needPriority` (cohérence ; le temps résiduel l'ajoute de toute façon en dernier).
 */
import type { RulesetDocumentInput } from '@hybridsport/domain';
import { strengthL1V3RulesetDocument } from './l1v3.js';

export const L1B4_RULESET_VERSION = '0.7.0-strength-l1b4';
const L1B4_PARAM_VERSION = '0.7.0';
const NEED = 'pull_complement';
const SLOT = 'fb.pull_c';

type Json = Record<string, unknown>;

function overlay(id: string, v: unknown): unknown {
  switch (id) {
    case 'strength.needs': return { ...(v as Json), [NEED]: { requirement: { pattern: 'pull_horizontal' } } };
    case 'strength.substitution.fallbackNeeds': return { ...(v as Json), [NEED]: [] };
    case 'strength.goals': return Object.fromEntries(Object.entries(v as Record<string, Json>).map(([k, g]) => [k, { ...g, needPriority: [...(g.needPriority as string[]), NEED] }]));
    case 'strength.stimuli': return Object.fromEntries(Object.entries(v as Record<string, Json>).map(([k, st]) => [k, { ...st, optionalOrder: [...(st.optionalOrder as string[]), NEED] }]));
    case 'strength.interference': {
      const x = v as Json & { perStructure: Record<string, Json & { dropOptionalNeeds: string[] }> };
      return { ...x, perStructure: Object.fromEntries(Object.entries(x.perStructure).map(([s, p]) => [s, s === 'grip' ? { ...p, dropOptionalNeeds: [...p.dropOptionalNeeds, NEED] } : p])) };
    }
    case 'strength.archetypes': return (v as Json[]).map((a) => (a.id !== 'str_full_body' ? a : {
      ...a, slots: [...(a.slots as Json[]), { id: SLOT, blockId: 'b.accessory', need: NEED, role: 'accessory', status: 'optional', count: { min: 1, max: 1 }, modalityPreference: 'stability', anchorable: false, trackable: true, fill: 'residual_time', untilWeeklyTarget: true }],
    }));
    default: return undefined;
  }
}

export function strengthL1B4RulesetDocument(): RulesetDocumentInput {
  const base = strengthL1V3RulesetDocument();
  return {
    ...base,
    rulesetVersion: L1B4_RULESET_VERSION,
    parameters: base.parameters.map((p) => {
      const value = overlay(p.id, p.value);
      return value === undefined ? p : { ...p, value: value as typeof p.value, version: L1B4_PARAM_VERSION, modifiedAt: '2026-10-21', justification: `RC4.6 (L1b-4) — tirage complémentaire facultatif à temps résiduel, jusqu'au plancher du dos, retiré sous interférence de préhension ; surcouche de ${String(base.rulesetVersion)}.` };
    }),
  };
}
