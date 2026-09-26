/**
 * Identifiants typés (« branded types »). Un identifiant d'exercice ne peut pas être
 * passé là où un identifiant de règle est attendu. Les identifiants sont toujours
 * injectés : le domaine n'en génère jamais (pas de UUID aléatoire).
 */
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type ProgramId = Brand<string, 'ProgramId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type BlockId = Brand<string, 'BlockId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ExerciseId = Brand<string, 'ExerciseId'>;
export type RuleId = Brand<string, 'RuleId'>;
export type ParameterId = Brand<string, 'ParameterId'>;
export type TraceId = Brand<string, 'TraceId'>;
export type PatternId = Brand<string, 'PatternId'>;
export type MuscleId = Brand<string, 'MuscleId'>;
export type BodyAreaId = Brand<string, 'BodyAreaId'>;
export type StructureId = Brand<string, 'StructureId'>;
export type EquipmentId = Brand<string, 'EquipmentId'>;
export type PresetId = Brand<string, 'PresetId'>;
export type RestrictionTag = Brand<string, 'RestrictionTag'>;
export type MovementTag = Brand<string, 'MovementTag'>;
export type FamilyId = Brand<string, 'FamilyId'>;
export type EquivalenceId = Brand<string, 'EquivalenceId'>;
export type ArchetypeId = Brand<string, 'ArchetypeId'>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/** Vrai si la chaîne est un identifiant syntaxiquement valide (non vide, sans espace). */
export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/** Construit un identifiant typé ; lève une erreur de programmation si la syntaxe est invalide. */
export function asId<T extends Brand<string, string>>(value: string): T {
  if (!isValidId(value)) {
    throw new TypeError(`Identifiant invalide : "${value}"`);
  }
  return value as T;
}
