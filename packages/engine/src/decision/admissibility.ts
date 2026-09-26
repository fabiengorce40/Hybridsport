import { ADMISSIBILITY_LAYERS } from '@hybridsport/domain';
import type { AdmissibilityLayer, RuleNature, Violation } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';

const reasons = createCoreRegistry();

/** Natures autorisées par couche (spec 01 §3, §5). */
export const LAYER_NATURES: Readonly<Record<AdmissibilityLayer, readonly RuleNature[]>> = {
  A1: ['SAFETY'],
  A2: ['FEASIBILITY', 'PREFERENCE'], // exclusion explicite de l'utilisateur = préférence appliquée en HARD
  A3: ['PROGRAMMING_HEURISTIC'],
  A4: ['TECHNICAL', 'PROGRAMMING_HEURISTIC'], // intégrité technique et invariants du programme
};

/** Contrôle d'admissibilité : filtre HARD, jamais compensable par un score. */
export interface AdmissibilityCheck<C> {
  readonly id: string;
  readonly version: string;
  readonly layer: AdmissibilityLayer;
  readonly nature: RuleNature;
  /** Renvoie les violations (hard ⇒ inadmissible ; soft ⇒ pénalité transmise à l'optimisation). */
  evaluate(candidate: C): readonly Violation[];
}

export interface AdmissibilityResult {
  readonly admissible: boolean;
  /** Violations HARD ordonnées A1 → A4 (priorité de réparation et de message). */
  readonly violations: readonly Violation[];
  readonly byLayer: Readonly<Record<AdmissibilityLayer, readonly Violation[]>>;
  /** Violations SOFT (ex. récupération optimale) : pénalités pour la couche B, jamais un filtre. */
  readonly soft: readonly Violation[];
}

export class AdmissibilityDefinitionError extends Error {
  constructor(checkId: string, problem: string) {
    super(`Contrôle d'admissibilité ${checkId} : ${problem}`);
    this.name = 'AdmissibilityDefinitionError';
  }
}

/** Vérifie la cohérence des contrôles (couche ↔ nature, identifiants uniques). */
export function assertValidChecks<C>(checks: readonly AdmissibilityCheck<C>[]): void {
  const ids = new Set<string>();
  for (const c of checks) {
    if (ids.has(c.id)) throw new AdmissibilityDefinitionError(c.id, 'identifiant dupliqué');
    ids.add(c.id);
    if (!LAYER_NATURES[c.layer].includes(c.nature)) throw new AdmissibilityDefinitionError(c.id, `nature ${c.nature} interdite en ${c.layer}`);
  }
}

/**
 * Évalue la couche A. Politique FAIL-CLOSED : un contrôle qui échoue techniquement (exception) rend la
 * solution inadmissible (violation TECHNICAL en A4) — une erreur ne peut jamais laisser passer une solution.
 */
export function evaluateAdmissibility<C>(candidate: C, checks: readonly AdmissibilityCheck<C>[]): AdmissibilityResult {
  assertValidChecks(checks);
  const byLayer: Record<AdmissibilityLayer, Violation[]> = { A1: [], A2: [], A3: [], A4: [] };
  const soft: Violation[] = [];
  for (const check of checks) {
    let found: readonly Violation[];
    try {
      found = check.evaluate(candidate);
    } catch (e) {
      byLayer.A4.push({
        ruleId: check.id, ruleVersion: check.version, nature: 'TECHNICAL', level: 'hard', layer: 'A4',
        target: { kind: 'input', id: check.id },
        reason: reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: `contrôle en échec : ${e instanceof Error ? e.message : String(e)}`, target: check.id }),
      });
      continue;
    }
    for (const v of found) {
      if (v.level === 'hard') byLayer[check.layer].push({ ...v, layer: check.layer });
      else soft.push(v);
    }
  }
  const violations = ADMISSIBILITY_LAYERS.flatMap((l) => byLayer[l]);
  return { admissible: violations.length === 0, violations, byLayer, soft };
}

/** Candidat évalué : identifiant, admissibilité et vecteur d'optimisation (couche B). */
export interface EvaluatedCandidate<P = unknown> {
  readonly id: string;
  readonly payload: P;
  readonly admissibility: AdmissibilityResult;
  readonly optimization: readonly number[];
}

/** Seuls les candidats admissibles peuvent être comparés : la couche A est un filtre, pas un score. */
export function admissibleOnly<P>(candidates: readonly EvaluatedCandidate<P>[]): EvaluatedCandidate<P>[] {
  return candidates.filter((c) => c.admissibility.admissible);
}
