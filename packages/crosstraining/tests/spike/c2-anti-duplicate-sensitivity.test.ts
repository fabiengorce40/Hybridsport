/**
 * SPIKE (gate « gouvernance anti-doublon Cross-training ») — matrice structurelle et analyse de SENSIBILITÉ
 * poids × seuils pour le corridor bootstrap `continuous → timed → 1 mouvement`, avec `energy` et `stimulus`
 * NON COMPARABLES (décision validée : known ↔ not_applicable et not_applicable ↔ not_applicable ⇒ null).
 *
 * Le CORE ne sait pas encore exclure ces deux composantes : l'exclusion est SIMULÉE par recalcul TEST_ONLY à partir
 * du détail par composante calculé par le CORE réel (runSportSession), recalcul vérifié égal au CORE quand rien
 * n'est exclu. Les poids et seuils de référence sont ceux du ruleset de TEST du CORE ; toutes les variantes de poids
 * et de seuils sont des scénarios TEST_ONLY d'analyse de sensibilité : AUCUNE n'est une valeur candidate.
 *
 * Ce n'est PAS C2 : aucun code de production. Mouvements du catalogue de TEST (certains chargés, marqués, hors
 * corridor : utilisés seulement pour la catégorie « même pattern, famille différente »). Durées TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry, SessionDraftInput, SessionFingerprint, SportEngineProposalInput } from '@hybridsport/domain';
import { createCoreRegistry, runSportSession } from '@hybridsport/engine';
import type { ContextParse, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { coreContext } from '../fixtures.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { duplicateTestParameters, testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';

type Breakdown = Record<string, number | null>;

// technical-constant: TEST_ONLY — identifiants communs (sans taxonomie) et vecteur mathématique requis par le CORE actuel
const TEST_ONLY_ARCHETYPE = 'crosstraining.bootstrap_test_only';
const TEST_ONLY_STIMULUS = 'stim.crosstraining.bootstrap_test_only';
const TEST_ONLY_ENERGY = { low: 0.2, moderate: 0.3, high: 0.5 };
// technical-constant: TEST_ONLY — durées de forme (s)
const D = { base: 600, other: 1200 } as const;
const ENGINE = { id: 'engine.spike.ct_antidup', version: '0.0.1' as const };
const HISTORY_AT = asISODateTime('2026-09-27T08:00:00Z');
const PROFILE = { ...PROFILE_GYM, availableEquipment: [...new Set([...PROFILE_GYM.availableEquipment, 'rower', 'skierg', 'box', 'pullup_bar', 'bands', 'leg_press', 'wall_ball'])] };

interface Spec { readonly id: string; readonly move: string; readonly durationS: number }

function testEngine(s: SessionDraftInput): SportEngine<Record<string, never>> {
  const parse = (raw: unknown): ContextParse<Record<string, never>> => (raw !== null && typeof raw === 'object' && Object.keys(raw).length === 0
    ? { ok: true, context: {} }
    : { ok: false, reasons: [createCoreRegistry().emit('TECHNICAL.SCHEMA_INVALID', { path: 'disciplineContext', problem: '{} attendu' })] });
  return {
    ...ENGINE, discipline: 'crosstraining', parseContext: parse,
    propose: (input: SportEngineInput<Record<string, never>>) => {
      const p: SportEngineProposalInput = {
        proposalId: 'proposal.antidup', discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
        stimulus: input.intent.stimulus, objective: input.intent.objective, session: s,
        optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
        fingerprintInputs: { archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, energy: TEST_ONLY_ENERGY, volumeByItem: { i1: 1 }, prescriptionMarkers: {} },
        repetitionIntents: [], reasons: [],
        provenance: { engineId: ENGINE.id, engineVersion: ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
        parametersUsed: [],
      };
      return { status: 'proposals', proposals: [p] };
    },
  };
}

function run(spec: Spec, history: readonly FingerprintHistoryEntry[] = []) {
  const s: SessionDraftInput = {
    id: spec.id, discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed',
    blocks: [{ id: 'b.main', kind: 'conditioning', role: 'primary', format: 'continuous', items: [{ id: 'i1', exerciseId: spec.move, prescription: { type: 'timed', workS: spec.durationS, rounds: 1, restS: 0 } }] }],
  };
  const intent = {
    id: 'intent.ct.antidup', discipline: 'crosstraining' as const, archetypeId: TEST_ONLY_ARCHETYPE, stimulus: TEST_ONLY_STIMULUS, objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
  const o = runSportSession(testEngine(s), { intent, profile: PROFILE, state: STATE_FRESH, history: [...history], disciplineContext: {} }, coreContext('spike-antidup', testRuleset(testRulesetDocumentWithDuplicate())));
  const item = o.result.status === 'ok' ? o.result.value.blocks[0]?.items[0] : undefined;
  const p = item?.prescription;
  if (item?.exerciseId !== spec.move || p?.type !== 'timed' || p.workS !== spec.durationS) throw new Error(`séance modifiée ou refusée : ${JSON.stringify(o.result)}`);
  return o;
}
const fingerprintOf = (spec: Spec): SessionFingerprint => {
  const fp = run(spec).fingerprint;
  if (!fp) throw new Error('empreinte attendue');
  return fp;
};
function coreBreakdown(a: Spec, b: Spec): { similarity: number; breakdown: Breakdown } {
  const c = run(b, [{ fingerprint: fingerprintOf(a), at: HISTORY_AT, status: 'completed', repetitionIntents: [] }]).duplicate?.comparisons[0];
  if (!c) throw new Error('comparaison absente');
  return { similarity: c.similarity, breakdown: { ...c.breakdown } };
}

const REF_WEIGHTS = (duplicateTestParameters().find((p) => p.id === 'duplicate.weights')?.value as { crosstraining: Record<string, number> }).crosstraining;
const REF_THRESHOLDS = duplicateTestParameters().find((p) => p.id === 'duplicate.thresholds')?.value as { warn: number; strong: number };
const NOT_APPLICABLE = ['energy', 'stimulus'] as const;
const simulate = (b: Breakdown): Breakdown => ({ ...b, ...Object.fromEntries(NOT_APPLICABLE.map((d) => [d, null])) });
function similarityOf(b: Breakdown, w: Record<string, number>): number {
  const keys = Object.keys(b).filter((k) => b[k] !== null);
  const denom = keys.reduce((s, k) => s + (w[k] ?? 0), 0);
  return denom > 0 ? keys.reduce((s, k) => s + (w[k] ?? 0) * (b[k] ?? 0), 0) / denom : 0;
}
const classOf = (x: number, t: { warn: number; strong: number }): string => (x >= t.strong ? 'strong' : x >= t.warn ? 'warn' : 'none');

// Matrice structurelle (catégories demandées). « TEST_ONLY_LOADED » : mouvement chargé, hors corridor.
const MATRIX: readonly { readonly name: string; readonly a: Spec; readonly b: Spec }[] = [
  { name: 'same_movement_same_duration', a: { id: 'a1', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b1', move: 'ex.air_squat', durationS: D.base } },
  { name: 'same_movement_other_duration', a: { id: 'a2', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b2', move: 'ex.air_squat', durationS: D.other } },
  { name: 'same_family_same_duration', a: { id: 'a3', move: 'ex.push_up', durationS: D.base }, b: { id: 'b3', move: 'ex.incline_push_up', durationS: D.base } },
  { name: 'same_family_other_duration', a: { id: 'a4', move: 'ex.push_up', durationS: D.base }, b: { id: 'b4', move: 'ex.incline_push_up', durationS: D.other } },
  { name: 'same_pattern_other_family_TEST_ONLY_LOADED', a: { id: 'a5', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b5', move: 'ex.leg_press', durationS: D.base } },
  { name: 'same_pattern_other_family_other_muscles_TEST_ONLY_LOADED', a: { id: 'a6', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b6', move: 'ex.wall_ball', durationS: D.base } },
  { name: 'unrelated_shared_muscles_same_duration', a: { id: 'a7', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b7', move: 'ex.reverse_lunge_bw', durationS: D.base } },
  { name: 'unrelated_same_duration', a: { id: 'a8', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b8', move: 'ex.push_up', durationS: D.base } },
  { name: 'unrelated_other_duration', a: { id: 'a9', move: 'ex.air_squat', durationS: D.base }, b: { id: 'b9', move: 'ex.push_up', durationS: D.other } },
];

describe('Matrice structurelle — contributions brutes (energy, stimulus non comparables)', () => {
  const rows = MATRIX.map((m) => ({ name: m.name, ...coreBreakdown(m.a, m.b) }));

  it('recalcul = CORE (rien d’exclu) ; puis similarité et classe de référence avec energy et stimulus non comparables', () => {
    for (const r of rows) expect(similarityOf(r.breakdown, REF_WEIGHTS)).toBeCloseTo(r.similarity, 12);
    const got = Object.fromEntries(rows.map((r) => [r.name, { sim: Number(similarityOf(simulate(r.breakdown), REF_WEIGHTS).toFixed(4)), cls: classOf(similarityOf(simulate(r.breakdown), REF_WEIGHTS), REF_THRESHOLDS), core: Number(r.similarity.toFixed(4)) }]));
    expect(got).toEqual({
      same_movement_same_duration: { sim: 1, cls: 'strong', core: 1 },
      same_movement_other_duration: { sim: 0.9765, cls: 'strong', core: 0.9817 },
      same_family_same_duration: { sim: 0.8278, cls: 'warn', core: 0.8661 },
      same_family_other_duration: { sim: 0.8049, cls: 'warn', core: 0.8482 },
      same_pattern_other_family_TEST_ONLY_LOADED: { sim: 0.5692, cls: 'none', core: 0.6649 },
      same_pattern_other_family_other_muscles_TEST_ONLY_LOADED: { sim: 0.4635, cls: 'none', core: 0.5827 },
      unrelated_shared_muscles_same_duration: { sim: 0.3571, cls: 'none', core: 0.5 },
      unrelated_same_duration: { sim: 0.1429, cls: 'none', core: 0.3333 },
      unrelated_other_duration: { sim: 0.1193, cls: 'none', core: 0.315 },
    });
  });

  it('contributions brutes : structure ≥ 2/3 pour toute paire du corridor (kind et format constants) ; exercise, movement, muscle portés par le catalogue', () => {
    const raw = Object.fromEntries(rows.map((r) => [r.name, simulate(r.breakdown)]));
    for (const b of Object.values(raw)) {
      expect(b).toMatchObject({ stimulus: null, energy: null, format: null });
      expect(b.structure).toBeGreaterThanOrEqual(2 / 3);
    }
    expect(raw.same_family_same_duration).toMatchObject({ exercise: 0.6, movement: 1, muscle: 1 });
    expect(raw.same_pattern_other_family_TEST_ONLY_LOADED).toMatchObject({ exercise: 0, movement: 1, muscle: 1 });
    expect(raw.same_pattern_other_family_other_muscles_TEST_ONLY_LOADED).toMatchObject({ exercise: 0, movement: 1, muscle: 0.5 });
    expect(raw.unrelated_shared_muscles_same_duration).toMatchObject({ exercise: 0, movement: 0, muscle: 1, structure: 1 });
    expect(raw.unrelated_same_duration).toMatchObject({ exercise: 0, movement: 0, muscle: 0, structure: 1 });
  });

  it('sensibilité TEST_ONLY : 81 jeux de poids (×0,5 / ×1 / ×2 sur exercise, movement, muscle, structure) × 15 couples de seuils', () => {
    const dims = ['exercise', 'movement', 'muscle', 'structure'] as const;
    const mults = [0.5, 1, 2];
    const warns = [0.5, 0.55, 0.6, 0.65, 0.7];
    const strongs = [0.8, 0.85, 0.9];
    const result: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const b = simulate(r.breakdown);
      const counts: Record<string, number> = {};
      const sims: number[] = [];
      for (const m0 of mults) for (const m1 of mults) for (const m2 of mults) for (const m3 of mults) {
        const k = [m0, m1, m2, m3];
        const w = { ...REF_WEIGHTS, ...Object.fromEntries(dims.map((d, i) => [d, (REF_WEIGHTS[d] ?? 0) * (k[i] ?? 1)])) };
        const s = similarityOf(b, w);
        sims.push(s);
        for (const warn of warns) for (const strong of strongs) { const c = classOf(s, { warn, strong }); counts[c] = (counts[c] ?? 0) + 1; }
      }
      result[r.name] = { ...counts, simMin: Number(Math.min(...sims).toFixed(4)), simMax: Number(Math.max(...sims).toFixed(4)) };
    }
    expect(result).toEqual({
      same_movement_same_duration: { strong: 1215, simMin: 1, simMax: 1 },
      same_movement_other_duration: { strong: 1215, simMin: 0.9342, simMax: 0.9934 },
      same_family_same_duration: { strong: 515, warn: 697, none: 3, simMin: 0.6997, simMax: 0.9357 },
      same_family_other_duration: { strong: 360, warn: 849, none: 6, simMin: 0.6896, simMax: 0.9146 },
      same_pattern_other_family_TEST_ONLY_LOADED: { strong: 25, warn: 551, none: 639, simMin: 0.249, simMax: 0.8388 },
      same_pattern_other_family_other_muscles_TEST_ONLY_LOADED: { warn: 264, none: 951, simMin: 0.2028, simMax: 0.7399 },
      unrelated_shared_muscles_same_duration: { warn: 84, none: 1131, simMin: 0.122, simMax: 0.6897 },
      unrelated_same_duration: { none: 1215, simMin: 0.04, simMax: 0.4 },
      unrelated_other_duration: { none: 1215, simMin: 0.0334, simMax: 0.3342 },
    });
  });
});
