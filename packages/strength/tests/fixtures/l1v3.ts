/**
 * RC4.6 (L1, variante V3) — CONTENU PROVISOIRE versionné « une isolation du haut du corps en Full Body » : SURCOUCHE
 * déclarative du ruleset F6, qui reste inchangé et reproductible à l'identique (registre de contenu versionné
 * d'app-core). Seul changement : l'emplacement `fb.iso_upper` de l'archétype `str_full_body` passe d'un nombre
 * d'exercices de 1 à 2 à 1 exactement (décision RC4.6 L1-V3 : moins d'isolations de poussée redondantes, épaules
 * ramenées sous la borne haute). Haut du corps (`up.iso_upper`), Bas du corps, bloc Cross-training et catalogue :
 * inchangés (le catalogue F6 est réutilisé tel quel).
 */
import type { RulesetDocumentInput } from '@hybridsport/domain';
import { strengthF6RulesetDocument } from './f6.js';

export const L1V3_RULESET_VERSION = '0.6.0-strength-l1v3';
const L1V3_PARAM_VERSION = '0.6.0';
const ARCHETYPE = 'str_full_body';
const SLOT = 'fb.iso_upper';

type Json = Record<string, unknown>;

export function strengthL1V3RulesetDocument(): RulesetDocumentInput {
  const base = strengthF6RulesetDocument();
  return {
    ...base,
    rulesetVersion: L1V3_RULESET_VERSION,
    parameters: base.parameters.map((p) => {
      if (p.id !== 'strength.archetypes') return p;
      const value = (p.value as unknown as Json[]).map((a) => (a.id !== ARCHETYPE ? a : {
        ...a, slots: (a.slots as Json[]).map((s) => (s.id === SLOT ? { ...s, count: { min: 1, max: 1 } } : s)),
      }));
      return { ...p, value: value as unknown as typeof p.value, version: L1V3_PARAM_VERSION, modifiedAt: '2026-10-21', justification: `RC4.6 (L1-V3) — Full Body : une seule isolation du haut du corps (fb.iso_upper 1..1) ; surcouche de ${String(base.rulesetVersion)}.` };
    }),
  };
}
