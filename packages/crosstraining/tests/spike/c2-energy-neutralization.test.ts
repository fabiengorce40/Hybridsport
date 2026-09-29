/**
 * SPIKE (C2, origine des parts d'énergie du bootstrap) — une signature `energy` COMMUNE à toutes les séances de
 * bootstrap neutralise-t-elle proprement cette composante de l'anti-doublon du CORE RÉEL (runSportSession), sans
 * rendre la classification Cross-training trompeuse ?
 *
 * Ce n'est PAS C2 : aucun code de production, un moteur de TEST qui propose une séance fixe.
 * Corridor imité (TEST_ONLY) : continuous → timed → 1 mouvement NON CHARGÉ du catalogue de test du CORE.
 *
 * TOUT est TEST_ONLY et n'approuve RIEN :
 * - vecteurs d'énergie : vecteurs mathématiques valides, choisis pour sonder l'algorithme, jamais une estimation ;
 * - durées : quantités de forme ;
 * - mouvements : catalogue de TEST, pas une allowlist ;
 * - stimulus / archétype : identifiants TEST_ONLY COMMUNS (le bootstrap est découplé de toute taxonomie) ;
 * - poids et seuils de l'anti-doublon : ruleset de TEST du CORE (`duplicateTestParameters`), non gouvernés pour
 *   le Cross-training. Les classifications mesurées dépendent de ces poids.
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

type Energy = SessionFingerprint['energy'];
type Outcome = ReturnType<typeof runSportSession>;

// technical-constant: TEST_ONLY — identifiants communs du bootstrap simulé (aucune taxonomie)
const TEST_ONLY_ARCHETYPE = 'crosstraining.bootstrap_test_only';
const TEST_ONLY_STIMULUS = 'stim.crosstraining.bootstrap_test_only';
const ENGINE = { id: 'engine.spike.ct_energy_neutral', version: '0.0.1' as const };
const HISTORY_AT = asISODateTime('2026-09-27T08:00:00Z');

// technical-constant: TEST_ONLY — vecteurs d'énergie valides servant à sonder l'algorithme (aucune valeur physiologique)
const V = {
  low: { low: 1, moderate: 0, high: 0 },
  moderate: { low: 0, moderate: 1, high: 0 },
  high: { low: 0, moderate: 0, high: 1 },
  mixed: { low: 0.2, moderate: 0.3, high: 0.5 },
  thirds: { low: 1, moderate: 1, high: 1 },
  thirdsScaled: { low: 2, moderate: 2, high: 2 },
} as const;
// technical-constant: TEST_ONLY — durées de forme (s)
const D = { short: 300, base: 600, long: 1200 } as const;

/** TEST_ONLY : matériel élargi pour qu'aucun mouvement testé ne soit réparé (substitution) par le CORE. */
const PROFILE = { ...PROFILE_GYM, availableEquipment: [...new Set([...PROFILE_GYM.availableEquipment, 'rower', 'skierg', 'box', 'pullup_bar', 'bands'])] };

interface Spec { readonly id: string; readonly move: string; readonly durationS: number; readonly energy: Energy }

function testEngine(s: SessionDraftInput, energy: Energy): SportEngine<Record<string, never>> {
  const parse = (raw: unknown): ContextParse<Record<string, never>> => (raw !== null && typeof raw === 'object' && Object.keys(raw).length === 0
    ? { ok: true, context: {} }
    : { ok: false, reasons: [createCoreRegistry().emit('TECHNICAL.SCHEMA_INVALID', { path: 'disciplineContext', problem: '{} attendu' })] });
  return {
    ...ENGINE, discipline: 'crosstraining', parseContext: parse,
    propose: (input: SportEngineInput<Record<string, never>>) => {
      const p: SportEngineProposalInput = {
        proposalId: 'proposal.neutral', discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
        stimulus: input.intent.stimulus, objective: input.intent.objective, session: s,
        optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
        fingerprintInputs: { archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, energy, volumeByItem: { i1: 1 }, prescriptionMarkers: {} },
        repetitionIntents: [], reasons: [],
        provenance: { engineId: ENGINE.id, engineVersion: ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
        parametersUsed: [],
      };
      return { status: 'proposals', proposals: [p] };
    },
  };
}

/** Une séance du corridor imité, passée par le pipeline réel. */
function run(spec: Spec, history: readonly FingerprintHistoryEntry[] = []): Outcome {
  const s: SessionDraftInput = {
    id: spec.id, discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed',
    blocks: [{ id: 'b.main', kind: 'conditioning', role: 'primary', format: 'continuous', items: [{ id: 'i1', exerciseId: spec.move, prescription: { type: 'timed', workS: spec.durationS, rounds: 1, restS: 0 } }] }],
  };
  const intent = {
    id: 'intent.ct.neutral', discipline: 'crosstraining' as const, archetypeId: TEST_ONLY_ARCHETYPE, stimulus: TEST_ONLY_STIMULUS, objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
  return runSportSession(testEngine(s, spec.energy), { intent, profile: PROFILE, state: STATE_FRESH, history: [...history], disciplineContext: {} }, coreContext('spike-neutral', testRuleset(testRulesetDocumentWithDuplicate())));
}

function fingerprintOf(spec: Spec): SessionFingerprint {
  const o = run(spec);
  if (o.result.status !== 'ok' || !o.fingerprint) throw new Error(`séance TEST_ONLY refusée : ${JSON.stringify(o.result)}`);
  assertUnrepaired(o, spec);
  return o.fingerprint;
}
/** Instrumentation : la séance renvoyée porte bien le mouvement et la durée proposés (aucune réparation). */
function assertUnrepaired(o: Outcome, spec: Spec): void {
  const item = o.result.status === 'ok' ? o.result.value.blocks[0]?.items[0] : undefined;
  const p = item?.prescription;
  if (item?.exerciseId !== spec.move || p?.type !== 'timed' || p.workS !== spec.durationS) throw new Error(`séance modifiée par le CORE : ${JSON.stringify(item)}`);
}
const entry = (fp: SessionFingerprint): FingerprintHistoryEntry => ({ fingerprint: fp, at: HISTORY_AT, status: 'completed', repetitionIntents: [] });

/** Compare `candidate` à l'historique [`previous`] via le pipeline réel : similarité, classe, détail par composante. */
function compare(previous: Spec, candidate: Spec) {
  const o = run(candidate, [entry(fingerprintOf(previous))]);
  const c = o.duplicate?.comparisons[0];
  if (o.result.status !== 'ok' || !c) throw new Error(`comparaison absente : ${JSON.stringify(o.result)}`);
  assertUnrepaired(o, candidate);
  return { similarity: c.similarity, classification: c.classification, breakdown: c.breakdown };
}

// Poids de TEST lus dans la fixture du ruleset (source unique), pour recalculer la similarité à partir du détail.
const TEST_WEIGHTS = (duplicateTestParameters().find((p) => p.id === 'duplicate.weights')?.value as { crosstraining: Record<string, number> }).crosstraining;
const TEST_THRESHOLDS = duplicateTestParameters().find((p) => p.id === 'duplicate.thresholds')?.value as { warn: number; strong: number };
const recompute = (b: Record<string, number | null>): number => {
  const keys = Object.keys(b).filter((k) => b[k] !== null);
  return keys.reduce((s, k) => s + (TEST_WEIGHTS[k] ?? 0) * (b[k] ?? 0), 0) / keys.reduce((s, k) => s + (TEST_WEIGHTS[k] ?? 0), 0);
};

// Poids non nuls de la composante énergie et des composantes comparables (format absent ⇒ null, exclu).
const W_ENERGY = TEST_WEIGHTS.energy ?? Number.NaN;
const W_NON_NULL = Object.entries(TEST_WEIGHTS).filter(([k]) => k !== 'format').reduce((a, [, w]) => a + w, 0);
const ENERGY_MAX_SHIFT = W_ENERGY / W_NON_NULL;
const ALL_ONE = { exercise: 1, movement: 1, muscle: 1, structure: 1, stimulus: 1, energy: 1, format: null };
const base: Spec = { id: 'ct.n.base', move: 'ex.air_squat', durationS: D.base, energy: V.mixed };

describe('N1–N5 — corridor imité (continuous → timed → 1 mouvement), énergie commune TEST_ONLY', () => {
  it('N1 même séance, nouvel identifiant ⇒ similarité 1, accidental_strong, toutes composantes à 1 (format absent ⇒ exclu)', () => {
    expect(compare(base, { ...base, id: 'ct.n1' })).toEqual({ similarity: 1, classification: 'accidental_strong', breakdown: ALL_ONE });
  });

  it('N2 mouvement différent, même durée ⇒ seules structure, stimulus (commun) et énergie (commune) restent à ~1 ; la classe dépend des autres dimensions', () => {
    const squatLunge = compare(base, { ...base, id: 'ct.n2a', move: 'ex.reverse_lunge_bw' });
    expect(squatLunge).toEqual({ similarity: 0.5, classification: 'none', breakdown: { exercise: 0, movement: 0, muscle: 1, structure: 1, stimulus: 1, energy: 1, format: null } });
    const squatPush = compare(base, { ...base, id: 'ct.n2b', move: 'ex.push_up' });
    expect(squatPush.classification).toBe('none');
    expect(squatPush.similarity).toBeCloseTo(1 / 3, 12);
    expect(squatPush.breakdown).toMatchObject({ exercise: 0, movement: 0, muscle: 0, structure: 1, stimulus: 1, energy: 1 });
    const rowSki = compare({ ...base, move: 'ex.row_erg' }, { ...base, id: 'ct.n2d', move: 'ex.skierg' });
    expect(rowSki.classification).toBe('none');
    expect(rowSki.breakdown).toMatchObject({ exercise: 0, movement: 0, muscle: 0.5, stimulus: 1, energy: 1 });
    const squatBox = compare(base, { ...base, id: 'ct.n2e', move: 'ex.box_jump' });
    expect(squatBox.classification).toBe('none');
    expect(squatBox.breakdown.muscle).toBeCloseTo(2 / Math.sqrt(6), 12);
    // Variante de même famille (famille 0,6 ; pattern et muscles identiques) ⇒ strong.
    const pushIncline = compare({ ...base, move: 'ex.push_up' }, { ...base, id: 'ct.n2c', move: 'ex.incline_push_up' });
    expect(pushIncline.classification).toBe('accidental_strong');
    expect(pushIncline.breakdown).toMatchObject({ exercise: 0.6, movement: 1, muscle: 1, stimulus: 1, energy: 1 });
    // La similarité est exactement la moyenne pondérée des composantes non nulles (poids du ruleset de TEST).
    for (const c of [squatLunge, squatPush, rowSki, squatBox, pushIncline]) expect(recompute(c.breakdown)).toBeCloseTo(c.similarity, 12);
  });

  it('N3 même mouvement, durée différente ⇒ seule la structure baisse ; accidental_strong', () => {
    for (const durationS of [D.short, D.long]) {
      const c = compare(base, { ...base, id: `ct.n3.${String(durationS)}`, durationS });
      expect(c.classification).toBe('accidental_strong');
      expect(c.breakdown).toMatchObject({ exercise: 1, movement: 1, muscle: 1, stimulus: 1, energy: 1 });
      expect(c.breakdown.structure).toBeLessThan(1);
    }
  });

  it('N4 mouvement + durée différents ⇒ none (sans lien) ; accidental_warn pour une variante de même famille', () => {
    expect(compare({ ...base, durationS: D.short }, { ...base, id: 'ct.n4a', move: 'ex.reverse_lunge_bw', durationS: D.long }).classification).toBe('none');
    const c = compare({ ...base, move: 'ex.push_up' }, { ...base, id: 'ct.n4b', move: 'ex.incline_push_up', durationS: D.short });
    expect(c.classification).toBe('accidental_warn');
    expect(c.similarity).toBeGreaterThan(TEST_THRESHOLDS.warn);
    expect(c.similarity).toBeLessThan(TEST_THRESHOLDS.strong);
  });

  it('N5 seule l’énergie diffère ⇒ similarité = 1 − w_energy·(1 − s_energy)/Σw ; écart maximal w_energy/Σw (vecteurs orthogonaux)', () => {
    const ortho = compare({ ...base, energy: V.low }, { ...base, id: 'ct.n5a', energy: V.high });
    expect(ortho.breakdown).toEqual({ ...ALL_ONE, energy: 0 });
    expect(ortho.similarity).toBeCloseTo(1 - ENERGY_MAX_SHIFT, 12);
    const partial = compare({ ...base, energy: V.mixed }, { ...base, id: 'ct.n5b', energy: V.moderate });
    expect(partial.breakdown.energy).toBeCloseTo(0.3, 12);
    expect(partial.similarity).toBeCloseTo(1 - ENERGY_MAX_SHIFT * 0.7, 12);
    expect(ortho.classification).toBe('accidental_strong');
  });
});

describe('N6 — énergie commune (A) vs énergies variables (B), 30 séances, 435 paires', () => {
  const moves = ['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.push_up', 'ex.incline_push_up', 'ex.band_assisted_pull_up', 'ex.pull_up', 'ex.plank', 'ex.row_erg', 'ex.skierg', 'ex.box_jump'];
  const durations = [D.short, D.base, D.long];
  const variable = [V.low, V.moderate, V.high, V.mixed];
  const sessions = moves.flatMap((move, i) => durations.map((durationS, j) => ({ move, durationS, k: i * durations.length + j })));
  const cls = (x: number): string => (x >= TEST_THRESHOLDS.strong ? 'accidental_strong' : x >= TEST_THRESHOLDS.warn ? 'accidental_warn' : 'none');
  const label = (x: { move: string; durationS: number }) => `${x.move}@${String(x.durationS)}`;
  const specOf = (x: { move: string; durationS: number; k: number }, prefix: string, energy: Energy): Spec => ({ id: `${prefix}.${String(x.k)}`, move: x.move, durationS: x.durationS, energy });

  it('changements de classe, écart maximal, et comparaison à une composante énergie EXCLUE (contrefactuel calculé)', () => {
    const transitions: Record<string, number> = {};
    const flippedVsVariable: string[] = [];
    const flippedVsExcluded: string[] = [];
    let maxDelta = 0;
    for (let a = 0; a < sessions.length; a++) for (let b = a + 1; b < sessions.length; b++) {
      const x = sessions[a]; const y = sessions[b];
      if (!x || !y) continue;
      const A = compare(specOf(x, 'h', V.mixed), specOf(y, 'c', V.mixed));
      const B = compare(specOf(x, 'h', variable[x.k % variable.length] ?? V.low), specOf(y, 'c', variable[y.k % variable.length] ?? V.low));
      maxDelta = Math.max(maxDelta, A.similarity - B.similarity);
      expect(A.similarity).toBeGreaterThanOrEqual(B.similarity);
      const key = `${B.classification}→${A.classification}`;
      transitions[key] = (transitions[key] ?? 0) + 1;
      if (A.classification !== B.classification) flippedVsVariable.push(`${label(x)} ~ ${label(y)}`);
      // Contrefactuel (calcul, pas le CORE) : même détail, composante énergie retirée du calcul.
      if (cls(recompute({ ...A.breakdown, energy: null })) !== A.classification) flippedVsExcluded.push(`${label(x)} ~ ${label(y)}`);
    }
    expect(transitions).toEqual({ 'none→none': 387, 'accidental_warn→accidental_warn': 11, 'accidental_strong→accidental_strong': 31, 'accidental_warn→accidental_strong': 6 });
    expect(maxDelta).toBeCloseTo(ENERGY_MAX_SHIFT, 12);
    // Seules des variantes de MÊME FAMILLE changent de classe, et seulement warn → strong.
    expect(flippedVsVariable).toEqual([
      'ex.push_up@300 ~ ex.incline_push_up@300', 'ex.push_up@600 ~ ex.incline_push_up@600', 'ex.push_up@1200 ~ ex.incline_push_up@1200',
      'ex.band_assisted_pull_up@300 ~ ex.pull_up@300', 'ex.band_assisted_pull_up@600 ~ ex.pull_up@600', 'ex.band_assisted_pull_up@1200 ~ ex.pull_up@1200',
    ]);
    // Une constante n'équivaut pas à exclure la composante : elle GONFLE la similarité et fait franchir le seuil strong ici.
    expect(flippedVsExcluded).toEqual(['ex.band_assisted_pull_up@300 ~ ex.pull_up@600']);
  });

  it('§3 si toutes les séances portent EXACTEMENT le même vecteur, son choix ne change aucune similarité (6 vecteurs TEST_ONLY)', () => {
    const pairs = [['ex.air_squat', 'ex.reverse_lunge_bw'], ['ex.push_up', 'ex.incline_push_up'], ['ex.row_erg', 'ex.skierg']] as const;
    const byVector = Object.values(V).map((v) => pairs.map(([m1, m2]) => compare({ id: 'h', move: m1, durationS: D.base, energy: v }, { id: 'c', move: m2, durationS: D.base, energy: v }).similarity));
    for (const sims of byVector) expect(sims).toEqual(byVector[0]);
    // Deux saisies de même direction ({1,1,1} et {2,2,2}) se normalisent au même vecteur : énergie = 1.
    expect(compare({ id: 'h', move: 'ex.air_squat', durationS: D.base, energy: V.thirds }, { id: 'c', move: 'ex.air_squat', durationS: D.base, energy: V.thirdsScaled }).breakdown.energy).toBe(1);
  });
});

describe('§5 — sessionId (logique du CORE inchangée)', () => {
  const h = (): SessionFingerprint => fingerprintOf({ id: 'ct.sid.h', move: 'ex.air_squat', durationS: D.base, energy: V.mixed });
  it('même identifiant ⇒ l’entrée est TOUJOURS exclue, même si le contenu diffère totalement', () => {
    const o = run({ id: 'ct.sid.h', move: 'ex.push_up', durationS: D.long, energy: V.low }, [entry(h())]);
    expect(o.duplicate).toMatchObject({ classification: 'none', comparisons: [], penalty: 0 });
  });
  it('même identifiant + autre séance ⇒ seule l’autre séance est comparée', () => {
    const other = fingerprintOf({ id: 'ct.sid.o', move: 'ex.push_up', durationS: D.base, energy: V.mixed });
    const o = run({ id: 'ct.sid.h', move: 'ex.air_squat', durationS: D.base, energy: V.mixed }, [entry(h()), entry(other)]);
    expect(o.duplicate?.comparisons.map((c) => c.sessionId)).toEqual(['ct.sid.o']);
  });
  it('nouvel identifiant ⇒ comparé (accidental_strong pour un contenu identique) ; hors fenêtre du ruleset ⇒ non comparé', () => {
    expect(run({ id: 'ct.sid.new', move: 'ex.air_squat', durationS: D.base, energy: V.mixed }, [entry(h())]).duplicate?.classification).toBe('accidental_strong');
    const old = { ...entry(h()), at: asISODateTime('2026-01-01T08:00:00Z') };
    expect(run({ id: 'ct.sid.new2', move: 'ex.air_squat', durationS: D.base, energy: V.mixed }, [old]).duplicate).toMatchObject({ classification: 'none', comparisons: [] });
  });
});
