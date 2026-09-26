/**
 * Paramètre absent ou mal typé : violation d'un invariant TECHNICAL. Levée par les accesseurs,
 * convertie en EngineResult d'erreur TECHNICAL à la frontière de l'API (jamais masquée).
 */
export class RulesetParameterError extends Error {
  constructor(readonly parameterId: string, readonly problem: 'missing' | 'type', readonly expected?: string) {
    super(problem === 'missing' ? `Paramètre absent du ruleset : ${parameterId}` : `Paramètre ${parameterId} : ${expected ?? 'type'} attendu`);
    this.name = 'RulesetParameterError';
  }
}
