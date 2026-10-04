/**
 * Phase 3.5 — frontière anti-doublon (spec 07 §4) : empreinte construite par le CORE, similarité
 * multidimensionnelle, intentions déclarées AVANT la génération, jamais inférées après coup.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { SIMILARITY_COMPONENTS, asISODateTime, isNotApplicable } from '@hybridsport/domain';
import type { FingerprintHistoryEntry, RepetitionIntent, SessionDraftInput, SessionFingerprint } from '@hybridsport/domain';
import { analyzeDuplicates, buildFingerprint, canonicalStringify, readDuplicateParams, RulesetParameterError, similarityBreakdown } from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';
import { machineVariant } from '../harness/requests.js';
import { fingerprintInputsFor } from '../fixtures/sport-engine.js';

const catalog = testCatalog();
const ruleset = testRuleset(testRulesetDocumentWithDuplicate());
const NOW = asISODateTime('2026-09-28T08:00:00Z');

function fp(input: SessionDraftInput, id = input.id, markers?: Record<string, number>): SessionFingerprint {
  const r = buildFingerprint(session({ ...input, id }), catalog, fingerprintInputsFor(input, markers));
  if (!r.ok) throw new Error(JSON.stringify(r.reasons));
  return r.fingerprint;
}
const entry = (f: SessionFingerprint, at = '2026-09-25T08:00:00Z', repetitionIntents: RepetitionIntent[] = []): FingerprintHistoryEntry => ({ fingerprint: f, at: asISODateTime(at), status: 'completed', repetitionIntents });
const BENCH = strengthSessionInput();
const ANCHOR: RepetitionIntent = { kind: 'progression_anchor', trackId: 'track.bench' };
const SERIES: RepetitionIntent = { kind: 'progression_series', seriesId: 'series.upper', index: 2 };
const RETEST: RepetitionIntent = { kind: 'benchmark_retest', benchmarkId: 'bench.upper_test' };

describe('empreinte — construite par le CORE depuis la séance et le catalogue', () => {
  it('exercices, familles, équivalences, patterns et muscles dérivés du catalogue ; structure depuis la séance', () => {
    const f = fp(BENCH);
    expect(f.exercises).toEqual(['ex.bench_press', 'ex.cable_fly', 'ex.db_row', 'ex.hip_mobility_flow']);
    expect(f.patterns).toHaveProperty('push_horizontal');
    expect(Object.values(f.patterns).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(f.structure.map((b) => b.kind)).toEqual(['warmup', 'strength', 'accessory']);
    if (isNotApplicable(f.energy)) throw new Error('énergie connue attendue (Strength)');
    expect(f.energy.low + f.energy.moderate + f.energy.high).toBeCloseTo(1, 10);
  });

  it('entrées du moteur invalides ou incohérentes ⇒ erreur TECHNICAL explicite, jamais une empreinte partielle', () => {
    const s = session(BENCH);
    const base = fingerprintInputsFor(BENCH);
    const missing = { ...base, volumeByItem: { 'i.mob': 1 } };
    const extra = { ...base, volumeByItem: { ...(base.volumeByItem as object), 'i.ghost': 3 } };
    const zeroEnergy = { ...base, energy: { low: 0, moderate: 0, high: 0 } };
    for (const bad of [missing, extra, zeroEnergy, { ...base, stimulus: undefined }, { ...base, validated: true }, undefined]) {
      const r = buildFingerprint(s, catalog, bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons.every((x) => x.category === 'technical')).toBe(true);
    }
  });

  it('déterministe : même séance et mêmes entrées ⇒ même empreinte octet pour octet', () => {
    expect(canonicalStringify(fp(BENCH))).toBe(canonicalStringify(fp(BENCH)));
  });
});

describe('similarité — mesures bornées, symétriques, détaillées', () => {
  const p = readDuplicateParams(ruleset, 'strength');

  it('séances identiques ⇒ toutes les composantes à 1', () => {
    const b = similarityBreakdown(fp(BENCH, 'a'), fp(BENCH, 'b'), p);
    for (const c of SIMILARITY_COMPONENTS) expect(b[c]).toBeCloseTo(1, 10);
  });

  it('variante machines : exercices différents, patterns et muscles proches — le détail distingue les deux', () => {
    const b = similarityBreakdown(fp(BENCH), fp(machineVariant()), p);
    expect(b.exercise!).toBeLessThan(1);
    expect(b.movement!).toBeGreaterThan(b.exercise!);
  });

  it('propriété : chaque composante ∈ [0, 1] (ou non comparable) et la mesure est symétrique', () => {
    const pool = [BENCH, machineVariant(), strengthSessionInput({ blocks: [BENCH.blocks[1]!] })];
    fc.assert(fc.property(fc.constantFrom(...pool), fc.constantFrom(...pool), (x, y) => {
      const a = similarityBreakdown(fp(x, 'a'), fp(y, 'b'), p);
      const b = similarityBreakdown(fp(y, 'b'), fp(x, 'a'), p);
      for (const c of SIMILARITY_COMPONENTS) {
        const v = a[c];
        if (v !== null) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1 + 1e-12); }
        expect(a[c]).toBeCloseTo(b[c] ?? Number.NaN, 12);
      }
    }), { numRuns: 30 });
  });
});

describe('classification — répétition accidentelle, prévue, stagnation', () => {
  it('historique absent ⇒ aucune comparaison, aucune erreur, aucune pénalité', () => {
    const r = analyzeDuplicates(fp(BENCH), [], [], ruleset, NOW);
    expect(r).toMatchObject({ classification: 'none', penalty: 0, comparisons: [] });
  });

  it('même séance répétée sans intention ⇒ accidental_strong, pénalité SOFT du ruleset, jamais une exclusion', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new'), [entry(fp(BENCH, 'old'))], [], ruleset, NOW);
    expect(r.classification).toBe('accidental_strong');
    expect(r.penalty).toBe(0.6);
    expect(r.reasons[0]).toMatchObject({ code: 'DUPLICATE.ACCIDENTAL', category: 'business_soft' });
    expect(r.comparisons[0]?.breakdown).toBeDefined();
  });

  it('série de progression déclarée AVANT, avec évolution de prescription ⇒ planned, aucune pénalité', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new', { 'ex.bench_press:load': 82.5 }), [entry(fp(BENCH, 'old', { 'ex.bench_press:load': 80 }), undefined, [SERIES])], [SERIES], ruleset, NOW);
    expect(r.classification).toBe('planned');
    expect(r.penalty).toBe(0);
    expect(r.stagnation).toEqual([]);
    expect(r.comparisons[0]?.matchedIntents).toEqual(['progression_series:series.upper']);
  });

  it('répétition prévue SANS évolution ⇒ DUPLICATE.PLANNED_BUT_STAGNANT (avertissement), pas de pénalité', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new'), [entry(fp(BENCH, 'old'), undefined, [SERIES])], [SERIES], ruleset, NOW);
    expect(r.stagnation).toEqual([{ sessionId: 'old', intent: 'progression_series:series.upper' }]);
    expect(r.reasons.map((x) => x.code)).toContain('DUPLICATE.PLANNED_BUT_STAGNANT');
  });

  it('retest / benchmark : identique autorisé sans évolution (justification déclarée)', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new'), [entry(fp(BENCH, 'old'), undefined, [RETEST])], [RETEST], ruleset, NOW);
    expect(r.classification).toBe('planned');
    expect(r.stagnation).toEqual([]);
  });

  it('ancre de progression : l’exercice est exempté, les AUTRES composantes restent évaluées', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new', { 'ex.bench_press:load': 85 }), [entry(fp(BENCH, 'old'), undefined, [ANCHOR])], [ANCHOR], ruleset, NOW);
    const c = r.comparisons[0]!;
    expect(c.coveredComponents).toEqual(['exercise']);
    expect(c.accidentalSimilarity).toBeLessThan(c.similarity);
    // Toute la séance est identique : même avec l'ancre, la structure et le stimulus répétés restent signalés.
    expect(['accidental_warn', 'accidental_strong']).toContain(c.classification);
  });

  it('JAMAIS inférée après coup : l’intention portée par l’historique seul n’excuse rien', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new'), [entry(fp(BENCH, 'old'), undefined, [SERIES])], [], ruleset, NOW);
    expect(r.classification).toBe('accidental_strong');
    expect(r.comparisons[0]?.matchedIntents).toEqual([]);
  });

  it('intention déclarée sans séance correspondante dans l’historique ⇒ aucune exemption', () => {
    const r = analyzeDuplicates(fp(BENCH, 'new'), [entry(fp(BENCH, 'old'))], [SERIES], ruleset, NOW);
    expect(r.classification).toBe('accidental_strong');
  });

  it('séance de décharge miroir : correspondance par identifiant de la séance reprise', () => {
    const r = analyzeDuplicates(fp(BENCH, 'deload'), [entry(fp(BENCH, 'heavy'))], [{ kind: 'deload_mirror', ofSessionId: 'heavy' }], ruleset, NOW);
    expect(r.classification).toBe('planned');
  });

  it('fenêtre, discipline et identité : hors fenêtre, autre discipline ou même séance ⇒ non comparées', () => {
    const old = entry(fp(BENCH, 'old'), '2026-07-01T08:00:00Z');
    const other = entry({ ...fp(BENCH, 'run'), discipline: 'running' });
    const self = entry(fp(BENCH, 'new'));
    expect(analyzeDuplicates(fp(BENCH, 'new'), [old, other, self], [], ruleset, NOW).comparisons).toEqual([]);
  });

  it('déterministe et indépendant de l’ordre de l’historique', () => {
    const h = [entry(fp(BENCH, 'a'), '2026-09-20T08:00:00Z'), entry(fp(machineVariant(), 'b'), '2026-09-24T08:00:00Z'), entry(fp(BENCH, 'c'), '2026-09-26T08:00:00Z')];
    const a = analyzeDuplicates(fp(BENCH, 'new'), h, [], ruleset, NOW);
    const b = analyzeDuplicates(fp(BENCH, 'new'), [...h].reverse(), [], ruleset, NOW);
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('historique absent (ou sans séance comparable) ⇒ aucun contrôle et aucune erreur, même sans paramètres (spec 07 §4)', () => {
    expect(analyzeDuplicates(fp(BENCH), [], [], testRuleset(), NOW)).toMatchObject({ classification: 'none', penalty: 0, comparisons: [] });
    expect(analyzeDuplicates(fp(BENCH, 'x'), [entry(fp(BENCH, 'x'))], [], testRuleset(), NOW).classification).toBe('none');
  });

  it('paramètres absents du ruleset avec un historique à comparer ⇒ erreur explicite (aucune valeur par défaut dans le CORE)', () => {
    expect(() => analyzeDuplicates(fp(BENCH), [entry(fp(BENCH, 'old'))], [], testRuleset(), NOW)).toThrow(RulesetParameterError);
  });
});
