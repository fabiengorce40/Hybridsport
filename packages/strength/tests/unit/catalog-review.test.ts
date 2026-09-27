/**
 * Phase 4C §7 — revue du catalogue Musculation : chaque contrôle détecte une anomalie synthétique ; la
 * revue du catalogue de test est ENREGISTRÉE (lecture humaine) ; les acquittements rendent un constat non
 * bloquant sans le masquer.
 */
import { describe, expect, it } from 'vitest';
import type { ExerciseInput } from '@hybridsport/domain';
import { reviewStrengthCatalog } from '../../src/index.js';
import type { CatalogCheck } from '../../src/index.js';
import { strengthCatalogDocument } from '../fixtures/catalog.js';
import { TEST_CATALOG_REVIEW } from '../fixtures/catalog-review.js';
import { strengthCatalog } from '../fixtures/harness.js';

const base = strengthCatalogDocument();
const with1 = (id: string, patch: (e: ExerciseInput) => ExerciseInput) => strengthCatalog({ ...base, exercises: base.exercises.map((e) => (e.id === id ? patch(e) : e)) });
const checksFor = (catalog: ReturnType<typeof strengthCatalog>, id: string): CatalogCheck[] => reviewStrengthCatalog(catalog, TEST_CATALOG_REVIEW).findings.filter((f) => f.exerciseId === id).map((f) => f.check);

describe('revue du catalogue Musculation', () => {
  it('revue du catalogue de test enregistrée ; aucun constat BLOQUANT (erreur non acquittée)', async () => {
    const r = reviewStrengthCatalog(strengthCatalog(), TEST_CATALOG_REVIEW);
    const text = [`exercices relus : ${String(r.reviewed)}`, `par contrôle : ${JSON.stringify(r.byCheck)}`, ...r.findings.map((f) => `[${f.severity}] ${f.check} ${f.exerciseId} — ${f.detail}${f.acknowledged ? ` (acquitté : ${f.acknowledged.justification})` : ''}`)].join('\n');
    await expect(`${text}\n`).toMatchFileSnapshot('../architecture/__reports__/catalog-review.txt');
    expect(r.blocking).toEqual([]);
    // L'anomalie révélée par la simulation longitudinale est bien détectée (biceps/triceps primaires).
    expect(r.findings.some((f) => f.check === 'suspicious_primary' && f.exerciseId === 'ex.lat_pulldown')).toBe(true);
  });

  it('chaque contrôle détecte une anomalie synthétique', () => {
    expect(checksFor(with1('ex.leg_curl', (e) => ({ ...e, muscles: { primary: ['hamstrings', 'glutes', 'calves', 'quadriceps'], secondary: [] } })), 'ex.leg_curl')).toEqual(expect.arrayContaining(['too_many_primary', 'isolation_multi_group']));
    expect(checksFor(with1('ex.leg_curl', (e) => ({ ...e, patterns: { primary: 'push_horizontal', secondary: [] } })), 'ex.leg_curl')).toContain('pattern_region');
    expect(checksFor(with1('ex.bench_press', (e) => ({ ...e, stability: 3 })), 'ex.bench_press')).toContain('stability_range');
    expect(checksFor(with1('ex.push_up', (e) => ({ ...e, loadCeiling: 2 })), 'ex.push_up')).toContain('load_ceiling');
    expect(checksFor(with1('ex.leg_curl', (e) => ({ ...e, loadCeiling: 3 })), 'ex.leg_curl')).toContain('load_ceiling');
    expect(checksFor(with1('ex.bench_press', (e) => { const { progressionFamily: _p, ...rest } = e; return rest; }), 'ex.bench_press')).toContain('progression_family_missing');
    const noBarbellIncrement = { ...TEST_CATALOG_REVIEW, incrementByLoadModel: { ...TEST_CATALOG_REVIEW.incrementByLoadModel, barbell: undefined } };
    expect(reviewStrengthCatalog(strengthCatalog(), noBarbellIncrement).findings.filter((f) => f.exerciseId === 'ex.bench_press').map((f) => f.check)).toContain('loadable_without_progression');
  });

  it('un acquittement de relecture rend le constat non bloquant sans le masquer ; la revue est déterministe', () => {
    const bad = with1('ex.push_up', (e) => ({ ...e, loadCeiling: 2 }));
    const r1 = reviewStrengthCatalog(bad, TEST_CATALOG_REVIEW);
    expect(r1.blocking.map((f) => f.exerciseId)).toContain('ex.push_up');
    const r2 = reviewStrengthCatalog(bad, { ...TEST_CATALOG_REVIEW, acknowledged: [{ exerciseId: 'ex.push_up', check: 'load_ceiling', justification: 'gilet lesté documenté', reviewer: 'coach' }] });
    expect(r2.blocking.map((f) => f.exerciseId)).not.toContain('ex.push_up');
    expect(r2.findings.find((f) => f.exerciseId === 'ex.push_up' && f.check === 'load_ceiling')?.acknowledged?.reviewer).toBe('coach');
    expect(JSON.stringify(reviewStrengthCatalog(bad, TEST_CATALOG_REVIEW))).toBe(JSON.stringify(r1));
  });
});
