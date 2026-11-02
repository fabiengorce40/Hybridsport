/**
 * Reprise RC5 lot 4 — CONTENU PROVISOIRE versionné « Haut A / Bas A / Haut B / Bas B » : SURCOUCHE déclarative du ruleset
 * L1b-4, qui reste inchangé et reproductible à l'identique (registre de contenus versionnés d'app-core). Mécanisme repris
 * de RC5.1 (`019d8c8`, jamais déployé) ; appariement des tirages conforme à la demande produit du lot 4 :
 * - Haut A : principal poussée HORIZONTALE, tirage HORIZONTAL ; accessoires poussée verticale, tirage vertical ;
 * - Haut B : principal poussée VERTICALE, tirage VERTICAL ; accessoires poussée horizontale, tirage horizontal ;
 * - Bas A : principal genou (quadriceps, chaîne antérieure), secondaire hanche ;
 * - Bas B : principal hanche (chaîne postérieure, fessiers, ischio-jambiers), secondaire genou.
 * Quatre archétypes AJOUTÉS, dérivés SANS MODIFICATION de `str_upper` / `str_lower` (mêmes blocs, emplacements, nombres de
 * séries, groupes de choix, leviers, durées) : seul ajout, le membre PRÉFÉRÉ de chaque groupe de choix (`preferred`) ; les
 * autres membres restent des REPLIS (douleur, matériel, exclusion). Orientation, jamais exclusion : chaque séance Haut garde
 * poussée et tirage, horizontaux et verticaux. `str_upper` / `str_lower` sont CONSERVÉS (semaines existantes, objectifs
 * force et forme générale). Objectif admis par les variantes : hypertrophie seulement. Catalogue : inchangé (F6).
 * Nom de version DISTINCT de RC5.1 (`0.8.0-strength-rc51`, contenu différent) et de toute version historique.
 */
import type { RulesetDocumentInput } from '@hybridsport/domain';
import { strengthL1B4RulesetDocument } from './l1b4.js';

export const HAUTBAS_AB_RULESET_VERSION = '0.8.0-strength-hautbas-ab';
const AB_PARAM_VERSION = '0.8.0-ab';
const AB_GOALS = ['hypertrophy'];

type Json = Record<string, unknown>;
/** Membre préféré par groupe de choix, pour chaque archétype ajouté (identifiant, source, préfixe d'emplacement). */
export const HAUTBAS_AB_VARIANTS: readonly { id: string; from: string; prefix: string; preferred: Readonly<Record<string, string>> }[] = [
  { id: 'str_upper_a', from: 'str_upper', prefix: 'ua', preferred: { main: 'push_horizontal', pull: 'pull_horizontal', push_2: 'push_vertical', pull_2: 'pull_vertical' } },
  { id: 'str_upper_b', from: 'str_upper', prefix: 'ub', preferred: { main: 'push_vertical', pull: 'pull_vertical', push_2: 'push_horizontal', pull_2: 'pull_horizontal' } },
  { id: 'str_lower_a', from: 'str_lower', prefix: 'la', preferred: { main: 'knee_dominant', secondary: 'hip_dominant' } },
  { id: 'str_lower_b', from: 'str_lower', prefix: 'lb', preferred: { main: 'hip_dominant', secondary: 'knee_dominant' } },
];

/** Archétype dérivé : emplacements renommés (`up.x` → `ua.x`), membre préféré marqué, objectif hypertrophie. */
function derive(src: Json, v: (typeof HAUTBAS_AB_VARIANTS)[number]): Json {
  return {
    ...src, id: v.id, goals: AB_GOALS,
    slots: (src.slots as Json[]).map((s) => {
      const g = s.choiceGroup as string | undefined;
      return { ...s, id: `${v.prefix}.${String(s.id).split('.').slice(1).join('.')}`, ...(g !== undefined && v.preferred[g] === s.need ? { preferred: true } : {}) };
    }),
  };
}

export function strengthHautBasAbRulesetDocument(): RulesetDocumentInput {
  const base = strengthL1B4RulesetDocument();
  return {
    ...base,
    rulesetVersion: HAUTBAS_AB_RULESET_VERSION,
    parameters: base.parameters.map((p) => {
      if (p.id !== 'strength.archetypes') return p;
      const all = p.value as unknown as Json[];
      const added = HAUTBAS_AB_VARIANTS.map((v) => derive(all.find((a) => a.id === v.from) as Json, v));
      return { ...p, value: [...all, ...added] as unknown as typeof p.value, version: AB_PARAM_VERSION, modifiedAt: '2026-11-01', justification: `Reprise RC5 lot 4 — Haut A/B et Bas A/B (membre préféré, replis conservés) ; surcouche de ${String(base.rulesetVersion)}.` };
    }),
  };
}
