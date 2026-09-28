/**
 * Architecture de la couche produit : aucune horloge système ni hasard (tout est injecté), aucun nombre
 * non justifié (aucune constante sportive cachée), aucune dépendance vers l'interface.
 */
import { describe, expect, it } from 'vitest';
import { findClockAndRandomUsage, findUnjustifiedNumericLiterals, loadCoreSources } from '../../engine/tests/architecture/source-scanner.js';

const files = loadCoreSources(['packages/app-core/src']);

describe('app-core', () => {
  it('sources analysées', () => { expect(files.length).toBeGreaterThan(5); });
  it('aucune horloge système ni hasard', () => { expect(findClockAndRandomUsage(files)).toEqual([]); });
  it('aucun littéral numérique non justifié (≠ 0, 1) : aucune dose, durée ou seuil caché', () => {
    expect(findUnjustifiedNumericLiterals(files, [])).toEqual([]);
  });
  it('aucune importation de l’interface ni du navigateur', () => {
    expect(files.filter((f) => /from '(react|react-dom|.*apps\/)/.test(f.text) || /\blocalStorage\b|\bwindow\./.test(f.text)).map((f) => f.path)).toEqual([]);
  });
});
