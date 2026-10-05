/**
 * Audit du catalogue Strength pour le contrat de substitution (lot S2). Aucun jugement ajouté : on compare
 *   - AVANT : la relation de l'ancien générateur d'« alternatives » (autres candidats d'un même emplacement, c.-à-d.
 *     exercices satisfaisant le même BESOIN `strength.needs`), hors contexte et avant la troncature à 3 ;
 *   - DÉCLARÉ : les substitutions du catalogue (donnée gouvernée) et leur verdict par invariant ;
 *   - APRÈS : les substituts directs (`directSubstitutes`) ;
 *   - DONNÉES MANQUANTES : couples qui satisfont tous les invariants de métadonnées mais ne sont PAS déclarés (le moteur
 *     ne les propose pas : leur admission relève d'une déclaration gouvernée du catalogue, jamais d'une déduction).
 */
import type { Exercise } from '@hybridsport/domain';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { slotAccepts } from '@hybridsport/engine';
import { declaredSubstitutionVerdicts, directSubstitutes, invariantFailures, readStrengthParams } from '../../src/index.js';
import type { SubstitutionVerdict } from '../../src/index.js';

export interface AuditRow {
  readonly id: string;
  readonly needs: readonly string[];
  readonly before: readonly string[];
  readonly declared: readonly SubstitutionVerdict[];
  readonly after: readonly string[];
  readonly undeclaredCompatible: readonly string[];
}

export function strengthExercises(catalog: LoadedCatalog): Exercise[] {
  return [...catalog.exercises()].filter((e) => e.status === 'active' && e.disciplines.includes('strength')).sort((a, b) => (a.id < b.id ? -1 : 1));
}

export function auditCatalog(catalog: LoadedCatalog, ruleset: LoadedRuleset): AuditRow[] {
  const needs = readStrengthParams(ruleset).values['strength.needs'];
  const all = strengthExercises(catalog);
  const needsOf = (e: Exercise) => Object.keys(needs).sort().filter((n) => slotAccepts(e, needs[n]?.requirement ?? {}, catalog));
  return all.map((e) => {
    const own = needsOf(e);
    const declared = declaredSubstitutionVerdicts(e, catalog);
    const after = directSubstitutes(e, catalog).map((t) => t.id);
    return {
      id: e.id, needs: own,
      before: all.filter((t) => t.id !== e.id && needsOf(t).some((n) => own.includes(n))).map((t) => t.id),
      declared, after,
      undeclaredCompatible: all.filter((t) => t.id !== e.id && !e.substitutions.some((s) => s.exerciseId === t.id) && invariantFailures(e, t).length === 0).map((t) => t.id),
    };
  });
}

export function auditSummary(rows: readonly AuditRow[]) {
  const before = rows.reduce((a, r) => a + r.before.length, 0);
  const after = rows.reduce((a, r) => a + r.after.length, 0);
  const removed = rows.reduce((a, r) => a + r.before.filter((t) => !r.after.includes(t)).length, 0);
  return {
    exercises: rows.length, beforePairs: before, afterPairs: after, removedPairs: removed,
    declaredPairs: rows.reduce((a, r) => a + r.declared.length, 0),
    declaredRejected: rows.reduce((a, r) => a + r.declared.filter((d) => !d.direct).length, 0),
    withoutSubstitute: rows.filter((r) => r.after.length === 0).map((r) => r.id),
    undeclaredCompatiblePairs: rows.reduce((a, r) => a + r.undeclaredCompatible.length, 0),
  };
}

/** Rapport Markdown déterministe (versionné dans __reports__, contrôlé par snapshot). */
export function auditReport(rows: readonly AuditRow[], contractVersion: string, catalogVersion: string): string {
  const s = auditSummary(rows);
  const lines = [
    `# Audit des substitutions Strength — contrat ${contractVersion}, catalogue ${catalogVersion}`,
    '',
    `- Exercices Strength actifs : ${String(s.exercises)}`,
    `- Couples AVANT (même besoin d'emplacement, hors contexte) : ${String(s.beforePairs)}`,
    `- Couples APRÈS (substituts directs) : ${String(s.afterPairs)}`,
    `- Couples AVANT supprimés : ${String(s.removedPairs)}`,
    `- Substitutions déclarées : ${String(s.declaredPairs)} (refusées par le contrat : ${String(s.declaredRejected)})`,
    `- Couples compatibles par métadonnées mais NON déclarés (données manquantes, non proposés) : ${String(s.undeclaredCompatiblePairs)}`,
    `- Exercices sans aucun substitut direct : ${String(s.withoutSubstitute.length)}`,
    '',
    '| Exercice | Besoin(s) | Avant | Déclarées (verdict) | Après | Compatibles non déclarés |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.needs.join(', ') || '—'} | ${r.before.join(', ') || '—'} | ${r.declared.map((d) => `${d.targetId} (${d.fidelity}) : ${d.direct ? 'DIRECT' : `refusée — ${d.failures.join(', ')}`}`).join(' ; ') || '—'} | ${r.after.join(', ') || '—'} | ${r.undeclaredCompatible.join(', ') || '—'} |`),
    '',
  ];
  return lines.join('\n');
}
