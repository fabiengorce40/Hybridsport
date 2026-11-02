/**
 * Reprise RC5 lot 4.5 (chantier C) — catalogue CANDIDAT B1 (jamais au registre des utilisateurs) : surcouche du catalogue
 * du lot 4.4. Convention biomécanique B1 (document 10, § 2.1) : pour une poussée ou un tirage POLYARTICULAIRE, les bras
 * (biceps, triceps) sont des SYNERGISTES — muscles secondaires (volume indirect estimé, poids du ruleset) — et non des
 * moteurs principaux. Les fessiers des exercices à dominante genou restent principaux (option B2 non retenue). Aucun autre
 * champ n'est modifié (familles, classes d'équivalence, substitutions, matériel, coûts).
 */
import type { CatalogDocumentInput, Exercise } from '@hybridsport/domain';
import { strengthLot44CatalogDocument } from './catalog-lot44.js';

export const B1_CANDIDATE_CATALOG_VERSION = '0.3.2-strength-test-f6-lot44-b1-candidate';
const ARMS = ['biceps', 'triceps'];

/** Bras d'un polyarticulaire de poussée / tirage reclassés en synergistes (secondaires). */
export function b1Reclassify(e: Exercise): Exercise {
  if (!e.compound || !/^(push|pull)_/.test(e.patterns.primary)) return e;
  const moved = e.muscles.primary.filter((m) => ARMS.includes(m));
  if (moved.length === 0 || moved.length === e.muscles.primary.length) return e;
  return { ...e, muscles: { primary: e.muscles.primary.filter((m) => !ARMS.includes(m)), secondary: [...new Set([...e.muscles.secondary, ...moved])] } };
}

export function strengthB1CandidateCatalogDocument(): CatalogDocumentInput {
  const base = strengthLot44CatalogDocument();
  return { ...base, catalogVersion: B1_CANDIDATE_CATALOG_VERSION, exercises: base.exercises.map((e) => b1Reclassify(e as Exercise)) };
}
