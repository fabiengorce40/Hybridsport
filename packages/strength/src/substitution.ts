/**
 * Contrat de SUBSTITUTION DIRECTE Strength (lot S2). Une « alternative prévue » affichée avec un exercice prescrit doit
 * préserver l'intention de la prescription (spec strength 03 §17.1) : ce n'est PAS un autre candidat du même emplacement
 * (même besoin = exercice APPARENTÉ, fidélité F3), ni un exercice qui sollicite la même structure de demande
 * (`upper_push`, `lower_knee`… servent à l'interférence, jamais à l'équivalence).
 *
 * Source UNIQUE : les substitutions DÉCLARÉES par le catalogue (donnée gouvernée, avec fidélité). Aucune équivalence
 * n'est déduite par le moteur : un exercice sans substitution déclarée n'a AUCUNE alternative (fail-closed).
 *
 * Une substitution déclarée n'est DIRECTE que si :
 *   - sa fidélité est `high` ou `medium` (`low` = repli signalé, jamais proposé comme alternative) ;
 *   - et les métadonnées du catalogue démontrent la préservation de la prescription, invariant par invariant :
 *     même pattern principal, mêmes muscles primaires, même caractère poly / mono-articulaire, même type de mouvement,
 *     même latéralité (une répétition unilatérale n'est pas une répétition bilatérale), même type de prescription,
 *     même caractère chargeable (une prescription en charge ne se réalise pas sans charge).
 * Une donnée manquante ou différente ⇒ refus (raison tracée). Aucun transfert de charge, de répétitions ni d'intensité :
 * l'alternative est un exercice, la prescription reste celle du moteur (frontière du CORE inchangée).
 */
import type { Exercise } from '@hybridsport/domain';
import type { LoadedCatalog } from '@hybridsport/engine';

export const SUBSTITUTION_CONTRACT_VERSION = 'strength-substitution-1.0.0';
/** Fidélités déclarées admises comme substitution DIRECTE (spec catalogue : `low` = autorisée mais signalée). */
export const DIRECT_FIDELITIES = ['high', 'medium'] as const;

/** Invariants du contrat (ordre de la spec 03 §17.1 : pattern, muscles primaires, stimulus / prescription). */
export const SUBSTITUTION_INVARIANTS = ['pattern', 'primary_muscles', 'compound', 'movement_type', 'laterality', 'prescription_type', 'loadable'] as const;
export type SubstitutionInvariant = (typeof SUBSTITUTION_INVARIANTS)[number];
export type SubstitutionFailure = SubstitutionInvariant | 'self' | 'unknown_target' | 'inactive' | 'not_strength' | 'low_fidelity';

const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x)) && b.every((x) => a.includes(x));

/** Invariants de métadonnées violés par le couple source → cible (vide ⇒ préservation démontrée). Symétrique. */
export function invariantFailures(source: Exercise, target: Exercise): SubstitutionInvariant[] {
  const out: SubstitutionInvariant[] = [];
  if (source.patterns.primary !== target.patterns.primary) out.push('pattern');
  if (!sameSet(source.muscles.primary, target.muscles.primary)) out.push('primary_muscles');
  if (source.compound !== target.compound) out.push('compound');
  if (source.movementType !== target.movementType) out.push('movement_type');
  if (source.laterality !== target.laterality) out.push('laterality');
  if (source.defaultPrescriptionType !== target.defaultPrescriptionType) out.push('prescription_type');
  if (source.loadable !== target.loadable) out.push('loadable');
  return out;
}

export interface SubstitutionVerdict {
  readonly targetId: string;
  readonly fidelity: 'high' | 'medium' | 'low';
  readonly direct: boolean;
  readonly failures: readonly SubstitutionFailure[];
}

/** Verdict de CHAQUE substitution déclarée par le catalogue pour cet exercice (ordre : fidélité, puis identifiant). */
export function declaredSubstitutionVerdicts(source: Exercise, catalog: LoadedCatalog): SubstitutionVerdict[] {
  // technical-constant: rang ordinal de fidélité (tri déterministe), pas une valeur sportive
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...source.substitutions]
    .sort((a, b) => rank[a.fidelity] - rank[b.fidelity] || (a.exerciseId < b.exerciseId ? -1 : 1))
    .map((s) => {
      const target = catalog.exercise(s.exerciseId);
      const failures: SubstitutionFailure[] = [];
      if (s.exerciseId === source.id) failures.push('self');
      if (!target) failures.push('unknown_target');
      else {
        if (target.status !== 'active') failures.push('inactive');
        if (!target.disciplines.includes('strength')) failures.push('not_strength');
        failures.push(...invariantFailures(source, target));
      }
      if (!(DIRECT_FIDELITIES as readonly string[]).includes(s.fidelity)) failures.push('low_fidelity');
      return { targetId: s.exerciseId, fidelity: s.fidelity, direct: failures.length === 0, failures };
    });
}

/** Substituts DIRECTS (indépendants du contexte) : déclarés, fidélité admise, tous les invariants démontrés. */
export function directSubstitutes(source: Exercise, catalog: LoadedCatalog): Exercise[] {
  return declaredSubstitutionVerdicts(source, catalog).filter((v) => v.direct).flatMap((v) => { const t = catalog.exercise(v.targetId); return t ? [t] : []; });
}
