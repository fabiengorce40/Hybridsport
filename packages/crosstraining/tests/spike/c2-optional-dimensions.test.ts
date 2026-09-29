/**
 * SPIKE (compatibility gate « dimensions optionnelles ») — que produirait l'anti-doublon du CORE si les composantes
 * `energy` et/ou `stimulus` d'une empreinte étaient réellement ABSENTES (exclues du calcul), au lieu d'être des
 * constantes communes ?
 *
 * Le CORE ne sait pas exclure ces deux composantes (schéma obligatoire ; similarité jamais nulle). L'exclusion est
 * donc SIMULÉE par un recalcul TEST_ONLY : on reprend le détail par composante CALCULÉ PAR LE CORE réel
 * (runSportSession), on met à null les composantes exclues, et on applique la même moyenne pondérée, avec les mêmes
 * poids et seuils du ruleset de TEST. Le recalcul est d'abord VÉRIFIÉ égal à la similarité du CORE quand rien n'est
 * exclu. Aucun poids, aucun seuil n'est modifié.
 *
 * Ce n'est PAS C2 : aucun code de production. TOUT est TEST_ONLY (catalogue, durées, identifiants de stimulus et
 * d'archétype communs, vecteur d'énergie commun), et rien n'est approuvé.
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

type Outcome = ReturnType<typeof runSportSession>;
type Breakdown = Record<string, number | null>;

// technical-constant: TEST_ONLY — identifiants et vecteur communs du bootstrap simulé (aucune taxonomie, aucune valeur approuvée)
const TEST_ONLY_ARCHETYPE = 'crosstraining.bootstrap_test_only';
const TEST_ONLY_STIMULUS = 'stim.crosstraining.bootstrap_test_only';
const TEST_ONLY_ENERGY = { low: 0.2, moderate: 0.3, high: 0.5 };
// technical-constant: TEST_ONLY — durées de forme (s)
const DURATIONS = [300, 600, 1200] as const;
const MOVES = ['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.push_up', 'ex.incline_push_up', 'ex.band_assisted_pull_up', 'ex.pull_up', 'ex.plank', 'ex.row_erg', 'ex.skierg', 'ex.box_jump'] as const;
const ENGINE = { id: 'engine.spike.ct_optional_dims', version: '0.0.1' as const };
const HISTORY_AT = asISODateTime('2026-09-27T08:00:00Z');
/** TEST_ONLY : matériel élargi pour qu'aucun mouvement ne soit réparé (substitué) par le CORE. */
const PROFILE = { ...PROFILE_GYM, availableEquipment: [...new Set([...PROFILE_GYM.availableEquipment, 'rower', 'skierg', 'box', 'pullup_bar', 'bands'])] };

interface Spec { readonly id: string; readonly move: string; readonly durationS: number; readonly format?: string }

function testEngine(s: SessionDraftInput, format: string | undefined): SportEngine<Record<string, never>> {
  const parse = (raw: unknown): ContextParse<Record<string, never>> => (raw !== null && typeof raw === 'object' && Object.keys(raw).length === 0
    ? { ok: true, context: {} }
    : { ok: false, reasons: [createCoreRegistry().emit('TECHNICAL.SCHEMA_INVALID', { path: 'disciplineContext', problem: '{} attendu' })] });
  return {
    ...ENGINE, discipline: 'crosstraining', parseContext: parse,
    propose: (input: SportEngineInput<Record<string, never>>) => {
      const p: SportEngineProposalInput = {
        proposalId: 'proposal.optional', discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
        stimulus: input.intent.stimulus, objective: input.intent.objective, session: s,
        optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
        fingerprintInputs: {
          archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, energy: TEST_ONLY_ENERGY, volumeByItem: { i1: 1 }, prescriptionMarkers: {},
          ...(format === undefined ? {} : { format }),
        },
        repetitionIntents: [], reasons: [],
        provenance: { engineId: ENGINE.id, engineVersion: ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
        parametersUsed: [],
      };
      return { status: 'proposals', proposals: [p] };
    },
  };
}

function run(spec: Spec, history: readonly FingerprintHistoryEntry[] = []): Outcome {
  const s: SessionDraftInput = {
    id: spec.id, discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed',
    blocks: [{ id: 'b.main', kind: 'conditioning', role: 'primary', format: 'continuous', items: [{ id: 'i1', exerciseId: spec.move, prescription: { type: 'timed', workS: spec.durationS, rounds: 1, restS: 0 } }] }],
  };
  const intent = {
    id: 'intent.ct.optional', discipline: 'crosstraining' as const, archetypeId: TEST_ONLY_ARCHETYPE, stimulus: TEST_ONLY_STIMULUS, objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
  const o = runSportSession(testEngine(s, spec.format), { intent, profile: PROFILE, state: STATE_FRESH, history: [...history], disciplineContext: {} }, coreContext('spike-optional', testRuleset(testRulesetDocumentWithDuplicate())));
  // Instrumentation : aucune réparation (mouvement et durée intacts).
  const item = o.result.status === 'ok' ? o.result.value.blocks[0]?.items[0] : undefined;
  const p = item?.prescription;
  if (item?.exerciseId !== spec.move || p?.type !== 'timed' || p.workS !== spec.durationS) throw new Error(`séance modifiée ou refusée : ${JSON.stringify(o.result)}`);
  return o;
}

function fingerprintOf(spec: Spec): SessionFingerprint {
  const o = run(spec);
  if (!o.fingerprint) throw new Error('empreinte attendue');
  return o.fingerprint;
}
const entry = (fp: SessionFingerprint): FingerprintHistoryEntry => ({ fingerprint: fp, at: HISTORY_AT, status: 'completed', repetitionIntents: [] });

/** Détail par composante et similarité calculés par le CORE réel. */
function coreCompare(previous: Spec, candidate: Spec): { similarity: number; classification: string; breakdown: Breakdown } {
  const c = run(candidate, [entry(fingerprintOf(previous))]).duplicate?.comparisons[0];
  if (!c) throw new Error('comparaison absente');
  return { similarity: c.similarity, classification: c.classification, breakdown: { ...c.breakdown } };
}

// Poids et seuils du ruleset de TEST (source unique : la fixture), jamais modifiés.
const WEIGHTS = (duplicateTestParameters().find((p) => p.id === 'duplicate.weights')?.value as { crosstraining: Record<string, number> }).crosstraining;
const THRESHOLDS = duplicateTestParameters().find((p) => p.id === 'duplicate.thresholds')?.value as { warn: number; strong: number };

/** Moyenne pondérée des composantes non nulles : MÊME formule que `analyzeDuplicates` (vérifiée ci-dessous). */
function similarityOf(b: Breakdown): number {
  const keys = Object.keys(b).filter((k) => b[k] !== null);
  const denom = keys.reduce((s, k) => s + (WEIGHTS[k] ?? 0), 0);
  return denom > 0 ? keys.reduce((s, k) => s + (WEIGHTS[k] ?? 0) * (b[k] ?? 0), 0) / denom : 0;
}
const classOf = (x: number): string => (x >= THRESHOLDS.strong ? 'accidental_strong' : x >= THRESHOLDS.warn ? 'accidental_warn' : 'none');

const SCENARIOS = {
  current: [] as string[],
  energyExcluded: ['energy'],
  stimulusExcluded: ['stimulus'],
  bothExcluded: ['energy', 'stimulus'],
} as const;
type Scenario = keyof typeof SCENARIOS;
const exclude = (b: Breakdown, dims: readonly string[]): Breakdown => ({ ...b, ...Object.fromEntries(dims.map((d) => [d, null])) });

/** Catégorie structurelle d'une paire, lue dans le détail du CORE (composante exercise). */
const kindOf = (b: Breakdown): 'same_movement' | 'same_family' | 'unrelated' => (b.exercise === 1 ? 'same_movement' : (b.exercise ?? 0) > 0 ? 'same_family' : 'unrelated');

describe('Compatibility gate — exclusion simulée de energy / stimulus (matrice Cross-training, 30 séances, 435 paires)', () => {
  const sessions = MOVES.flatMap((move, i) => DURATIONS.map((durationS, j) => ({ id: `s.${String(i * DURATIONS.length + j)}`, move, durationS })));
  const pairs: { x: Spec; y: Spec; core: ReturnType<typeof coreCompare> }[] = [];
  for (let a = 0; a < sessions.length; a++) for (let b = a + 1; b < sessions.length; b++) {
    const x = sessions[a]; const y = sessions[b];
    if (x && y) pairs.push({ x, y, core: coreCompare({ ...x, id: `h.${x.id}` }, { ...y, id: `c.${y.id}` }) });
  }

  it('instrumentation : le recalcul est égal au CORE (similarité et classe) pour les 435 paires quand rien n’est exclu', () => {
    expect(pairs).toHaveLength(435);
    for (const p of pairs) {
      expect(similarityOf(p.core.breakdown)).toBeCloseTo(p.core.similarity, 12);
      expect(classOf(p.core.similarity)).toBe(p.core.classification);
      // Constantes communes : stimulus et energy valent 1 pour toute paire du bootstrap simulé.
      expect(p.core.breakdown).toMatchObject({ stimulus: 1, energy: 1, format: null });
    }
  });

  it('classes par scénario et transitions depuis le fingerprint actuel', () => {
    const counts = (s: Scenario) => pairs.reduce<Record<string, number>>((acc, p) => { const c = classOf(similarityOf(exclude(p.core.breakdown, SCENARIOS[s]))); acc[c] = (acc[c] ?? 0) + 1; return acc; }, {});
    expect(counts('current')).toEqual({ none: 387, accidental_warn: 11, accidental_strong: 37 });
    expect(counts('energyExcluded')).toEqual({ none: 387, accidental_warn: 12, accidental_strong: 36 });
    expect(counts('stimulusExcluded')).toEqual({ none: 387, accidental_warn: 18, accidental_strong: 30 });
    expect(counts('bothExcluded')).toEqual({ none: 387, accidental_warn: 18, accidental_strong: 30 });
    const moved = (s: Scenario) => pairs.filter((p) => classOf(similarityOf(exclude(p.core.breakdown, SCENARIOS[s]))) !== p.core.classification)
      .map((p) => ({ kind: kindOf(p.core.breakdown), from: p.core.classification, to: classOf(similarityOf(exclude(p.core.breakdown, SCENARIOS[s]))) }));
    // Tous les changements : variantes de même famille, strong → warn. Aucune paire sans lien ne change de classe.
    for (const s of ['energyExcluded', 'stimulusExcluded', 'bothExcluded'] as const) {
      for (const m of moved(s)) expect(m).toEqual({ kind: 'same_family', from: 'accidental_strong', to: 'accidental_warn' });
    }
    expect(moved('energyExcluded')).toHaveLength(1);
    expect(moved('stimulusExcluded')).toHaveLength(7);
    expect(moved('bothExcluded')).toHaveLength(7);
  });

  it('par catégorie : bornes de similarité (sans lien / même famille / même mouvement) dans chaque scénario', () => {
    const range = (s: Scenario, k: ReturnType<typeof kindOf>) => {
      const xs = pairs.filter((p) => kindOf(p.core.breakdown) === k).map((p) => similarityOf(exclude(p.core.breakdown, SCENARIOS[s])));
      return { n: xs.length, min: Math.min(...xs), max: Math.max(...xs) };
    };
    expect([range('current', 'unrelated').n, range('current', 'same_family').n, range('current', 'same_movement').n]).toEqual([387, 18, 30]);
    // Sans lien : l'exclusion BAISSE la similarité (plus aucune contribution des constantes) ; toujours « none ».
    expect(range('current', 'unrelated').max).toBeCloseTo(0.5, 12);
    expect(range('bothExcluded', 'unrelated').max).toBeCloseTo(0.25 / 0.7, 12);
    expect(range('bothExcluded', 'unrelated').min).toBeLessThan(range('current', 'unrelated').min);
    // Même mouvement (durées différentes) : reste accidental_strong dans tous les scénarios.
    for (const s of Object.keys(SCENARIOS) as Scenario[]) expect(classOf(range(s, 'same_movement').min)).toBe('accidental_strong');
    // Même famille : la plage descend quand les constantes disparaissent.
    expect(range('bothExcluded', 'same_family').max).toBeLessThan(range('current', 'same_family').max);
  });

  it('propriété 1 : séance identique sur toutes les dimensions connues, nouvel id ⇒ similarité 1 et accidental_strong dans les 4 scénarios', () => {
    const same = coreCompare({ id: 'h.same', move: 'ex.air_squat', durationS: 600 }, { id: 'c.same', move: 'ex.air_squat', durationS: 600 });
    for (const dims of Object.values(SCENARIOS)) {
      expect(similarityOf(exclude(same.breakdown, dims))).toBe(1);
      expect(classOf(similarityOf(exclude(same.breakdown, dims)))).toBe('accidental_strong');
    }
  });

  it('propriété 2 : l’absence ne crée aucune similarité positive — pour chaque paire, exclure les constantes ne l’augmente jamais, et une paire sans aucune dimension connue commune n’est jamais un doublon', () => {
    for (const p of pairs) {
      const cur = similarityOf(p.core.breakdown);
      expect(similarityOf(exclude(p.core.breakdown, SCENARIOS.bothExcluded))).toBeLessThanOrEqual(cur + 1e-12);
    }
    // Paire dont toutes les dimensions connues diffèrent (exercice, pattern, muscles à 0), structure seule commune.
    const unrelated = coreCompare({ id: 'h.u', move: 'ex.air_squat', durationS: 600 }, { id: 'c.u', move: 'ex.push_up', durationS: 600 });
    expect(unrelated.breakdown).toMatchObject({ exercise: 0, movement: 0, muscle: 0 });
    expect(similarityOf(exclude(unrelated.breakdown, SCENARIOS.bothExcluded))).toBeCloseTo((WEIGHTS.structure ?? 0) * (unrelated.breakdown.structure ?? 0) / 0.7, 12);
    expect(classOf(similarityOf(exclude(unrelated.breakdown, SCENARIOS.bothExcluded)))).toBe('none');
  });
});

describe('Précédent du CORE : composante optionnelle `format` (MEASURED)', () => {
  const base: Spec = { id: 'h.f', move: 'ex.air_squat', durationS: 600 };
  it('absent ↔ absent ⇒ null (exclu du dénominateur) ; connu ↔ absent ⇒ 0 (compté comme différence) ; connu ↔ connu identique ⇒ 1', () => {
    expect(coreCompare(base, { ...base, id: 'c.f0' }).breakdown.format).toBeNull();
    expect(coreCompare({ ...base, format: 'continuous' }, { ...base, id: 'c.f1' }).breakdown.format).toBe(0);
    expect(coreCompare(base, { ...base, id: 'c.f2', format: 'continuous' }).breakdown.format).toBe(0);
    expect(coreCompare({ ...base, format: 'continuous' }, { ...base, id: 'c.f3', format: 'continuous' }).breakdown.format).toBe(1);
  });
});
