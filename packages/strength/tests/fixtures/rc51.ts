/**
 * RC5.1 — CONTENU PROVISOIRE versionné « Haut A/B et Bas A/B » (variante C de `docs/kairo/RC5.1-HAUT-BAS-AB-ETUDE.md`) :
 * SURCOUCHE déclarative du ruleset L1b-4, qui reste inchangé et reproductible à l'identique (registre de contenu
 * versionné d'app-core). Quatre archétypes AJOUTÉS, dérivés de `str_upper` / `str_lower` (mêmes blocs, mêmes
 * emplacements, mêmes groupes de choix, mêmes leviers, mêmes durées) ; seul ajout : le membre PRÉFÉRÉ de chaque groupe
 * de choix (attribut `preferred`), les autres membres restant des replis (douleur, matériel) :
 * - Haut A : poussée horizontale (principal), tirage vertical, puis accessoires poussée verticale / tirage horizontal ;
 * - Haut B : poussée verticale (principal), tirage horizontal, puis accessoires poussée horizontale / tirage vertical ;
 * - Bas A : genou (principal), hanche (secondaire) ; Bas B : hanche (principal), genou (secondaire).
 * `str_upper` / `str_lower` sont CONSERVÉS (semaines existantes, objectifs force et forme générale). Objectifs admis par
 * les nouveaux archétypes : hypertrophie et forme générale ; la rotation qui les emploie est décidée par la règle de
 * composition (hypertrophie seulement, RC5.1). Catalogue : inchangé (F6).
 */
import type { RulesetDocumentInput } from '@hybridsport/domain';
import { strengthL1B4RulesetDocument } from './l1b4.js';

export const RC51_RULESET_VERSION = '0.8.0-strength-rc51';
const RC51_PARAM_VERSION = '0.8.0';
const RC51_GOALS = ['hypertrophy', 'general'];

type Json = Record<string, unknown>;
/** Membre préféré par groupe de choix, pour chaque archétype ajouté (identifiant, source, préfixe d'emplacement). */
const VARIANTS: readonly { id: string; from: string; prefix: string; preferred: Readonly<Record<string, string>> }[] = [
  { id: 'str_upper_a', from: 'str_upper', prefix: 'ua', preferred: { main: 'push_horizontal', pull: 'pull_vertical', push_2: 'push_vertical', pull_2: 'pull_horizontal' } },
  { id: 'str_upper_b', from: 'str_upper', prefix: 'ub', preferred: { main: 'push_vertical', pull: 'pull_horizontal', push_2: 'push_horizontal', pull_2: 'pull_vertical' } },
  { id: 'str_lower_a', from: 'str_lower', prefix: 'la', preferred: { main: 'knee_dominant', secondary: 'hip_dominant' } },
  { id: 'str_lower_b', from: 'str_lower', prefix: 'lb', preferred: { main: 'hip_dominant', secondary: 'knee_dominant' } },
];

/** Archétype dérivé : emplacements renommés (`up.x` → `ua.x`), membre préféré marqué, objectifs RC5.1. */
function derive(src: Json, v: (typeof VARIANTS)[number]): Json {
  return {
    ...src, id: v.id, goals: RC51_GOALS,
    slots: (src.slots as Json[]).map((s) => {
      const g = s.choiceGroup as string | undefined;
      return { ...s, id: `${v.prefix}.${String(s.id).split('.').slice(1).join('.')}`, ...(g !== undefined && v.preferred[g] === s.need ? { preferred: true } : {}) };
    }),
  };
}

export function strengthRc51RulesetDocument(): RulesetDocumentInput {
  const base = strengthL1B4RulesetDocument();
  return {
    ...base,
    rulesetVersion: RC51_RULESET_VERSION,
    parameters: base.parameters.map((p) => {
      if (p.id !== 'strength.archetypes') return p;
      const all = p.value as unknown as Json[];
      const added = VARIANTS.map((v) => derive(all.find((a) => a.id === v.from) as Json, v));
      return { ...p, value: [...all, ...added] as unknown as typeof p.value, version: RC51_PARAM_VERSION, modifiedAt: '2026-10-24', justification: `RC5.1 — Haut A/B et Bas A/B (membre préféré, replis conservés) ; surcouche de ${String(base.rulesetVersion)}.` };
    }),
  };
}
