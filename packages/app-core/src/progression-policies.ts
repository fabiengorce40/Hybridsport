/**
 * FAST TRACK V1 — politiques de progression versionnées et relisibles (lot 4.6). Décision D2 : `progression-stab-1` est
 * ACTIVE sur la BÊTA (`BETA0_PROGRESSION_POLICY` dans `beta0Environment`) ; `progression-clamp-1` reste candidate. Chaque décision prise sous une politique porte son
 * identifiant dans la trace (`progressionPolicy`), sans changement de schéma (paramètres libres de l'audit).
 *
 * Paramètres = ceux des variantes simulées (banc du lot 4.6, 14 scénarios + 20 profils, 12 et 24 semaines) :
 * - `progression-clamp-1` (B-CLAMP) : effort déclaré au-delà de la plage de validité lu au PLAFOND de la plage ;
 * - `progression-stab-1` (P-CLSTAB) : idem + aucune hausse dans les 3 expositions qui suivent une baisse + hausse de plus
 *   de 10 % reportée une fois. La plage de validité de l'estimation n'est jamais modifiée ; R4 (séances allégées) absent.
 */
import type { ProgrammeEnvironment } from './programme.js';
import type { ProgressionReadingOption } from './progression.js';

// technical-constant: champs imposés par le contrat de lecture, sans effet sans politique d'allègement (R4 absent)
const NO_LIGHTENED = { floorWindow: 2, reassessEvery: 4, safetyBelow: 3 } as const;
export const PROGRESSION_POLICIES = {
  'progression-clamp-1': { ...NO_LIGHTENED, policyId: 'progression-clamp-1', outOfRange: 'clamp' },
  // technical-constant: paramètres CANDIDATS étudiés au lot 4.6 (hystérésis en expositions, saut relatif), inactifs par défaut
  'progression-stab-1': { ...NO_LIGHTENED, policyId: 'progression-stab-1', outOfRange: 'clamp', hysteresis: 3, deferLargeStep: 0.1 },
} as const satisfies Record<string, ProgressionReadingOption & { readonly policyId: string }>;
export type ProgressionPolicyId = keyof typeof PROGRESSION_POLICIES;

/** Environnement avec une politique candidate — usage explicite seulement (tests, activation validée). */
export function withProgressionPolicy(env: ProgrammeEnvironment, id: ProgressionPolicyId): ProgrammeEnvironment {
  return { ...env, progressionReading: PROGRESSION_POLICIES[id] };
}
