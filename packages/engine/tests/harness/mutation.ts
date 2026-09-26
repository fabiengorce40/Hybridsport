import type { ParameterValue, RulesetDocumentInput } from '@hybridsport/domain';
import { loadRuleset } from '../../src/index.js';
import type { LoadedRuleset } from '../../src/index.js';

/** Mutation de paramètre du ruleset (spec 11 §9) : renvoie un ruleset chargé où `id` vaut `value`. */
export function mutateParameter(doc: RulesetDocumentInput, id: string, value: ParameterValue): LoadedRuleset {
  const mutated = { ...doc, parameters: doc.parameters.map((p) => (p.id === id ? { ...p, value } : p)) };
  const r = loadRuleset(mutated);
  if (!r.ok) throw new Error(`Mutation invalide pour ${id} : ${r.issues.map((i) => String(i.params.problem)).join(' | ')}`);
  return r.ruleset;
}

/**
 * Vérifie qu'une mutation est DÉTECTÉE : la vérification doit passer avec le ruleset d'origine et
 * échouer avec le ruleset muté. Un paramètre dont la mutation n'est détectée par aucun test est « non couvert ».
 */
export function isMutationDetected(check: (ruleset: LoadedRuleset) => boolean, original: LoadedRuleset, mutated: LoadedRuleset): boolean {
  return check(original) && !check(mutated);
}
