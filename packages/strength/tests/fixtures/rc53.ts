/**
 * RC5.3 — CONTENU PROVISOIRE versionné de la progression individualisée, en SURCOUCHES successives du contenu RC5.1
 * (qui reste inchangé et reproductible à l'identique : registre de contenu versionné d'app-core). Un lot = une version.
 *
 * Lot R4 (`0.9.0-strength-rc53-r4`) — séances modifiées, variante SOUPLE validée le 2026-10-25 :
 * paramètre facultatif `strength.progression.policy.modifiedExposure` = `{ mode: 'soft', recalculateLoad: false }`.
 * - une exposition à prescription modifiée (interférence, état du jour, temps, adaptation au démarrage) est classée
 *   contre son RIR de RÉFÉRENCE, jamais contre le RIR relevé ;
 * - elle ne provoque jamais de régression du seul fait de la modification ;
 * - elle fournit un signal de capacité seulement si l'effort déclaré est exploitable (réussite, RIR saisi) ;
 * - aucune hausse de charge ni validation d'essai n'en découle seule ;
 * - R4.4 (recalcul de la charge quand le RIR est relevé) : NON activé (`recalculateLoad: false`).
 * Catalogue : inchangé (F6). Composition, archétypes, volumes : inchangés.
 *
 * Lot R1 (`0.10.0-strength-rc53-r1`) — progression PARTAGÉE A/B (variante CA de RC5.2) :
 * - familles de progression déclarées : Haut A / Haut B ⇒ `str_upper`, Bas A / Bas B ⇒ `str_lower` ;
 * - politique `sharedProgression` : accessoire suivi au même emplacement ⇒ une seule track pour la famille ; e1RM observé
 *   recopié sur les tracks autorégulées actives du même exercice ; fusion des tracks en double existantes.
 * Prescriptions spécifiques conservées (un même exercice à des rôles différents garde ses tracks).
 *
 * Lot R2 (`0.11.0-strength-rc53-r2`) — réussite exacte et essais (décision du 2026-10-25, extension aux répétitions) :
 * - réussite exacte d'un principal autorégulé : un pas après 2 (intermédiaire) / 3 (avancé) réussites exactes, +1 si
 *   l'effort n'est pas saisi ; débutant : modèle linéaire inchangé ;
 * - toute hausse de charge OU de répétitions est un essai : annulé par une exposition probante en dessous / partielle
 *   (retour à la dernière prescription réussie, sans baisse de charge), confirmé par une réussite ;
 * - niveau refusé non retenté avant le prochain cycle ; sans mésocycle (avant R3), le refus expire après 4 semaines.
 */
import type { GovernanceClass, ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';
import { param } from '../../../engine/tests/fixtures/ruleset.js';
import { STRENGTH_OPTIONAL_PARAMETER_SCHEMAS } from '../../src/index.js';
import { RC51_RULESET_VERSION, strengthRc51RulesetDocument } from './rc51.js';

export const RC53_R4_RULESET_VERSION = '0.9.0-strength-rc53-r4';

/** Politique R4 du lot (variante souple, recalcul R4.4 désactivé) ; `recalculateLoad` modifiable pour l'étude R4.4. */
export function rc53R4Policy(recalculateLoad = false): ParameterValue {
  return { modifiedExposure: { mode: 'soft', recalculateLoad } } as unknown as ParameterValue;
}

export function strengthRc53R4RulesetDocument(o: { readonly recalculateLoad?: boolean } = {}): RulesetDocumentInput {
  const base = strengthRc51RulesetDocument();
  const pid = 'strength.progression.policy';
  return {
    ...base,
    rulesetVersion: RC53_R4_RULESET_VERSION,
    parameters: [...base.parameters, param(pid, rc53R4Policy(o.recalculateLoad === true), STRENGTH_OPTIONAL_PARAMETER_SCHEMAS[pid].governance as GovernanceClass, {
      version: '0.9.0', modifiedAt: '2026-10-25', justification: `RC5.3 R4 — séances modifiées, lecture souple (décision du 2026-10-25) ; surcouche de ${RC51_RULESET_VERSION}.`,
    })],
  };
}

export const RC53_R1_RULESET_VERSION = '0.10.0-strength-rc53-r1';
const FAMILIES: Readonly<Record<string, string>> = { str_upper_a: 'str_upper', str_upper_b: 'str_upper', str_lower_a: 'str_lower', str_lower_b: 'str_lower' };

/** Lot R1 : surcouche du lot R4 (familles de progression, politique de progression partagée). */
export function strengthRc53R1RulesetDocument(): RulesetDocumentInput {
  const base = strengthRc53R4RulesetDocument();
  const why = `RC5.3 R1 — progression partagée A/B (décision du 2026-10-25) ; surcouche de ${RC53_R4_RULESET_VERSION}.`;
  return {
    ...base,
    rulesetVersion: RC53_R1_RULESET_VERSION,
    parameters: base.parameters.map((p) => {
      if (p.id === 'strength.archetypes') {
        const all = p.value as unknown as Record<string, unknown>[];
        const value = all.map((a) => (FAMILIES[String(a.id)] !== undefined ? { ...a, progressionFamily: FAMILIES[String(a.id)] } : a));
        return { ...p, value: value as unknown as typeof p.value, version: '0.10.0', modifiedAt: '2026-10-25', justification: why };
      }
      if (p.id === 'strength.progression.policy') {
        return { ...p, value: { ...(p.value as Record<string, unknown>), sharedProgression: true } as unknown as ParameterValue, version: '0.10.0', modifiedAt: '2026-10-25', justification: why };
      }
      return p;
    }),
  };
}

export const RC53_R2_RULESET_VERSION = '0.11.0-strength-rc53-r2';
// technical-constant: TEST_ONLY — contenu provisoire R2 : réussites exactes requises par niveau, effort inconnu, expiration du refus (semaines)
const R2_POLICY = { exactSuccess: { streak: { intermediate: 2, advanced: 3 }, unknownEffortExtra: 1 }, probes: { reps: true, refusalMaxWeeks: 4 } };

/** Lot R2 : surcouche du lot R1 (réussite exacte, essais de charge et de répétitions). */
export function strengthRc53R2RulesetDocument(): RulesetDocumentInput {
  const base = strengthRc53R1RulesetDocument();
  const why = `RC5.3 R2 — réussite exacte, essais de charge et de répétitions (décision du 2026-10-25) ; surcouche de ${RC53_R1_RULESET_VERSION}.`;
  return {
    ...base,
    rulesetVersion: RC53_R2_RULESET_VERSION,
    parameters: base.parameters.map((p) => (p.id === 'strength.progression.policy'
      ? { ...p, value: { ...(p.value as Record<string, unknown>), ...R2_POLICY } as unknown as ParameterValue, version: '0.11.0', modifiedAt: '2026-10-25', justification: why }
      : p)),
  };
}
