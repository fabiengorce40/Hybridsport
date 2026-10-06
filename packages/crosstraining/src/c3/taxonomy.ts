/**
 * C3 — taxonomie de composition (VOCABULAIRE, aucune valeur). Terme générique « Cross-training » ; aucun nom de
 * séance propriétaire ni de benchmark nommé.
 *
 * L'INTENTION d'une séance (le « pourquoi ») réutilise les 9 identifiants de stimulus de C1 (`CT_STIMULI`) : rien
 * n'est recréé. La classification des catégories usuelles (retenue / refusée / provisoire) est une DONNÉE de revue
 * (`C3_TAXONOMY_REVIEW`), lue par la documentation et les tests, jamais par l'algorithme.
 */
import type { Exercise } from '@hybridsport/domain';
import type { CtStimulus } from '../model.js';

export type TaxonomyVerdict = 'RETAINED_PROVISIONAL' | 'DIMENSION_NOT_TYPE' | 'REFUSED_REDUNDANT' | 'REFUSED_CONVENTION' | 'BLOCKED';
export interface TaxonomyEntry {
  readonly category: string;
  readonly verdict: TaxonomyVerdict;
  /** Stimulus C1 qui porte la catégorie, s'il existe. */
  readonly stimulus?: CtStimulus;
  readonly scientificallyDefensible: boolean;
  readonly usefulToEngine: boolean;
  readonly coachingConvention: boolean;
  readonly note: string;
}

/** Revue des catégories demandées (C3 §5). Toute catégorie retenue reste PROVISOIRE : CT-D1 n'est pas décidée. */
export const C3_TAXONOMY_REVIEW: readonly TaxonomyEntry[] = [
  { category: 'aerobic/sustainable', verdict: 'RETAINED_PROVISIONAL', stimulus: 'aerobic_capacity', scientificallyDefensible: true, usefulToEngine: true, coachingConvention: false, note: 'domaine d’intensité soutenable : notion physiologique établie ; bornes non gouvernées' },
  { category: 'interval', verdict: 'RETAINED_PROVISIONAL', stimulus: 'threshold', scientificallyDefensible: true, usefulToEngine: true, coachingConvention: false, note: 'alternance travail / repos ; « interval » est une STRUCTURE : l’intention est threshold ou anaerobic_intervals' },
  { category: 'high-intensity', verdict: 'DIMENSION_NOT_TYPE', stimulus: 'anaerobic_intervals', scientificallyDefensible: true, usefulToEngine: true, coachingConvention: false, note: 'intensité = dimension (bande E5), pas un type de séance ; portée par anaerobic_intervals ; exclusion novice G1 à signer' },
  { category: 'mixed modal', verdict: 'RETAINED_PROVISIONAL', stimulus: 'mixed_modal_medium', scientificallyDefensible: false, usefulToEngine: true, coachingConvention: true, note: 'combinaison de modalités : utile à la composition ; aucune signature physiologique propre' },
  { category: 'strength+conditioning', verdict: 'BLOCKED', stimulus: 'strength_plus_conditioning', scientificallyDefensible: true, usefulToEngine: true, coachingConvention: false, note: 'le bloc force appartient au moteur Strength : aucune délégation inter-moteurs n’existe' },
  { category: 'skill+conditioning', verdict: 'BLOCKED', stimulus: 'skill_plus_conditioning', scientificallyDefensible: false, usefulToEngine: true, coachingConvention: true, note: 'acquisition de compétence non modélisée' },
  { category: 'technique/skill', verdict: 'BLOCKED', scientificallyDefensible: true, usefulToEngine: false, coachingConvention: false, note: 'séance d’apprentissage : hors conditioning, aucune règle d’apprentissage gouvernée' },
  { category: 'conditioning pur', verdict: 'REFUSED_REDUNDANT', scientificallyDefensible: false, usefulToEngine: false, coachingConvention: true, note: 'recouvre aerobic_capacity / threshold / mixed_modal_medium' },
  { category: 'engine', verdict: 'REFUSED_CONVENTION', stimulus: 'aerobic_capacity', scientificallyDefensible: false, usefulToEngine: false, coachingConvention: true, note: 'jargon de coaching pour la capacité aérobie' },
  { category: 'mixed', verdict: 'REFUSED_REDUNDANT', stimulus: 'mixed_modal_medium', scientificallyDefensible: false, usefulToEngine: false, coachingConvention: true, note: 'doublon de mixed modal' },
  { category: 'muscular endurance', verdict: 'RETAINED_PROVISIONAL', stimulus: 'muscular_endurance', scientificallyDefensible: true, usefulToEngine: true, coachingConvention: false, note: 'endurance musculaire locale : notion établie ; doses non gouvernées' },
];

/**
 * Stimuli que C3 sait COMPOSER (un seul bloc de conditioning, formats représentables). Les autres sont hors périmètre
 * C3 pour une raison de STRUCTURE, pas de valeur : bloc force (Strength), compétence, chipper réservé (niveau),
 * benchmark (hors périmètre).
 */
export const C3_OUT_OF_SCOPE: Readonly<Partial<Record<CtStimulus, string>>> = {
  benchmark: 'BENCHMARK_OUT_OF_SCOPE',
  long_chipper: 'CHIPPER_LEVEL_POLICY_UNGOVERNED',
};

/** Types de bloc d'une séance (structure). Seul `conditioning` est GÉNÉRÉ par C3. */
export const CT_SESSION_BLOCK_KINDS = ['warmup', 'skill', 'strength', 'conditioning', 'cooldown'] as const;
export type CtSessionBlockKind = (typeof CT_SESSION_BLOCK_KINDS)[number];

/**
 * Rôle d'un mouvement dans un bloc : POURQUOI il est là. Dérivé du catalogue (type de mouvement, pattern, région),
 * jamais saisi. Classification qualitative (DERIVED), sans seuil.
 */
export const CT_MOVEMENT_ROLES = ['monostructural', 'lower_body', 'upper_push', 'upper_pull', 'trunk'] as const;
export type CtMovementRole = (typeof CT_MOVEMENT_ROLES)[number];

/** Patterns du catalogue qui définissent les rôles « haut du corps » (identifiants de la taxonomie du catalogue). */
const UPPER_PUSH_PATTERNS: ReadonlySet<string> = new Set(['push_horizontal', 'push_vertical']);
const UPPER_PULL_PATTERNS: ReadonlySet<string> = new Set(['pull_horizontal', 'pull_vertical']);

/** Rôles d'un mouvement. `region` = région du pattern PRIMAIRE dans la taxonomie du catalogue. */
export function movementRoles(e: Pick<Exercise, 'movementType' | 'patterns'>, region: string | undefined): readonly CtMovementRole[] {
  if (e.movementType === 'monostructural') return ['monostructural'];
  if (e.movementType === 'mobility') return [];
  const out: CtMovementRole[] = [];
  if (region === 'lower') out.push('lower_body');
  if (UPPER_PUSH_PATTERNS.has(e.patterns.primary)) out.push('upper_push');
  if (UPPER_PULL_PATTERNS.has(e.patterns.primary)) out.push('upper_pull');
  if (region === 'core') out.push('trunk');
  return out;
}

/** Mouvements « techniques » au sens de l'accumulation (gymnastique, haltérophilie) : classification du catalogue. */
export const TECHNICAL_MOVEMENT_TYPES: ReadonlySet<string> = new Set(['gymnastic', 'olympic']);
