/**
 * SPIKE (C2 Bootstrap Feasibility Gate) — quelles DONNÉES D'ESTIMATION du catalogue le CORE RÉEL
 * (runSportSession) exige-t-il pour chaque candidat minimal de première séance (A AMRAP, B EMOM à un mouvement,
 * C continu, D intervalles à durée fixe, E for time avec cap) ?
 *
 * Ce n'est PAS C2 : aucun code de production, un moteur de TEST qui propose une séance fixe.
 * Les résultats sont figés après une première exécution en observation (docs/kairo/CROSSTRAINING-C2-BOOTSTRAP-FEASIBILITY.md).
 *
 * TOUTES les valeurs ici sont des DONNÉES DE TEST, jamais une origine de valeur sportive :
 * - reps, durées, rounds, caps : quantités arbitraires servant seulement à former une séance valide ;
 * - parts d'énergie : FIXTURE (le CORE les exige, voir c2-replay-energy-shares) ; elles ne sont pas la question ;
 * - catalogue : catalogue de TEST du CORE, dont on RETIRE les données d'estimation d'un mouvement pour mesurer
 *   si le pipeline en a besoin. Aucun débit n'est ajouté.
 */
import { describe, expect, it } from 'vitest';
import type { ExerciseInput, SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import { createCoreRegistry, runSportSession } from '@hybridsport/engine';
import type { ContextParse, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { coreContext } from '../fixtures.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testCatalogDocument } from '../../../engine/tests/fixtures/catalog.js';
import { testRulesetDocument } from '../../../engine/tests/fixtures/ruleset.js';

type Block = SessionDraftInput['blocks'][number];
type Item = Block['items'][number];
type Outcome = ReturnType<typeof runSportSession>;

// technical-constant: parts d'énergie de TEST (FIXTURE) ; exigées par le CORE, hors de la question mesurée ici
const TEST_ONLY_ENERGY = { low: 0, moderate: 1, high: 0 };
const ENGINE = { id: 'engine.spike.ct_bootstrap', version: '0.0.1' as const };
const MOVE = 'ex.air_squat';

/** Catalogue de TEST, mouvement MOVE dépouillé des données d'estimation demandées (rien n'est ajouté). */
function catalogWithout(strip: { workRate?: boolean; secondsPerRep?: boolean }) {
  const doc = testCatalogDocument();
  const exercises = doc.exercises.map((e): ExerciseInput => {
    if (e.id !== MOVE) return e;
    const { workRate, ...rest } = e;
    const timing = strip.secondsPerRep === true ? { setupS: e.timing.setupS, transitionClass: e.timing.transitionClass } : e.timing;
    return { ...rest, ...(strip.workRate === true ? {} : { workRate }), timing } as ExerciseInput;
  });
  return testCatalog({ ...doc, exercises });
}

function testEngine(s: SessionDraftInput): SportEngine<Record<string, never>> {
  const parse = (raw: unknown): ContextParse<Record<string, never>> => (raw !== null && typeof raw === 'object' && Object.keys(raw).length === 0
    ? { ok: true, context: {} }
    : { ok: false, reasons: [createCoreRegistry().emit('TECHNICAL.SCHEMA_INVALID', { path: 'disciplineContext', problem: '{} attendu' })] });
  return {
    ...ENGINE, discipline: 'crosstraining', parseContext: parse,
    propose: (input: SportEngineInput<Record<string, never>>) => {
      const volumeByItem = Object.fromEntries(s.blocks.flatMap((b) => b.items.map((i) => [i.id, 1])));
      const p: SportEngineProposalInput = {
        proposalId: 'proposal.bootstrap', discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
        stimulus: input.intent.stimulus, objective: input.intent.objective, session: s,
        optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
        fingerprintInputs: { archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, energy: TEST_ONLY_ENERGY, volumeByItem, prescriptionMarkers: {} },
        repetitionIntents: [], reasons: [],
        provenance: { engineId: ENGINE.id, engineVersion: ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
        parametersUsed: [],
      };
      return { status: 'proposals', proposals: [p] };
    },
  };
}

/** Première séance : historique VIDE, ruleset de test SANS paramètres anti-doublon (situation d'amorçage). */
function run(block: Block, strip: { workRate?: boolean; secondsPerRep?: boolean }): Outcome {
  const s: SessionDraftInput = { id: 'ct.bootstrap.s1', discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed', blocks: [block] };
  const intent = {
    id: 'intent.ct.bootstrap', discipline: 'crosstraining' as const, archetypeId: 'crosstraining.bootstrap', stimulus: 'stim.crosstraining.bootstrap', objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
  return runSportSession(testEngine(s), { intent, profile: PROFILE_GYM, state: STATE_FRESH, history: [], disciplineContext: {} }, coreContext('spike-bootstrap', testRuleset(testRulesetDocument()), catalogWithout(strip)));
}

/** Issue compacte : acceptée (avec empreinte) ou refusée avec les raisons de l'étape durée. */
function outcome(o: Outcome) {
  if (o.result.status === 'ok') return { status: 'ok' as const, fingerprint: o.fingerprint !== undefined, duplicate: o.duplicate?.classification };
  const code = o.result.status === 'error' ? o.result.error.code : o.result.status;
  const duration = o.trace.entries.filter((e) => e.step === 'duration').flatMap((e) => e.reasons.map((r) => ({ code: r.code, params: r.params })));
  return { status: 'refused' as const, code, duration };
}

const conditioning = (format: Record<string, unknown>, items: Item[]): Block => ({ id: 'b.main', kind: 'conditioning', role: 'primary', items, ...format } as Block);
const reps = (n: number): Item => ({ id: 'i1', exerciseId: MOVE, prescription: { type: 'reps', reps: n } });
const timed = (workS: number, rounds = 1, restS = 0): Item => ({ id: 'i1', exerciseId: MOVE, prescription: { type: 'timed', workS, rounds, restS } });

const NO_RATE = { workRate: true };
const NO_ESTIMATION = { workRate: true, secondsPerRep: true };
const missingRef = (kind: string) => ({ status: 'refused', code: 'NO_VALID_SOLUTION', duration: [{ code: 'TECHNICAL.UNKNOWN_REFERENCE', params: { kind, id: MOVE } }] });
const accepted = { status: 'ok', fingerprint: true, duplicate: 'none' };

// technical-constant: quantités de TEST (forme d'une séance valide), jamais une dose
const TEST_REPS = 10;
const TEST_TIME_S = 600;
const TEST_EMOM_MIN = 10;
const TEST_ROUNDS = 3;

describe('Données d’estimation exigées par le CORE pour une PREMIÈRE séance (catalogue de test dépouillé)', () => {
  it('référence : catalogue de test intact ⇒ les 5 candidats sont acceptés, historique vide, SANS paramètres anti-doublon au ruleset', () => {
    for (const block of [
      conditioning({ format: 'amrap', timeCapS: TEST_TIME_S }, [reps(TEST_REPS)]),
      conditioning({ format: 'emom', minutes: TEST_EMOM_MIN }, [reps(TEST_REPS)]),
      conditioning({ format: 'continuous' }, [timed(TEST_TIME_S)]),
      conditioning({ format: 'continuous' }, [timed(TEST_TIME_S / TEST_EMOM_MIN, TEST_ROUNDS, TEST_TIME_S / TEST_EMOM_MIN)]),
      conditioning({ format: 'for_time', rounds: TEST_ROUNDS, timeCapS: TEST_TIME_S }, [reps(TEST_REPS)]),
    ]) expect(outcome(run(block, {})), block.format).toEqual(accepted);
  });

  it('A — AMRAP, item reps : sans débit mais avec secondsPerRep ⇒ accepté ; sans aucune donnée ⇒ REFUS (même si la durée du bloc est fixe)', () => {
    const block = conditioning({ format: 'amrap', timeCapS: TEST_TIME_S }, [reps(TEST_REPS)]);
    expect(outcome(run(block, NO_RATE))).toEqual(accepted);
    expect(outcome(run(block, NO_ESTIMATION))).toEqual(missingRef('timing.secondsPerRep'));
  });

  it('A′ — AMRAP, item timed : AUCUNE donnée d’estimation requise', () => {
    expect(outcome(run(conditioning({ format: 'amrap', timeCapS: TEST_TIME_S }, [timed(TEST_TIME_S)]), NO_ESTIMATION))).toEqual(accepted);
  });

  it('B — EMOM un mouvement, item reps : sans débit mais avec secondsPerRep ⇒ accepté ; sans aucune donnée ⇒ REFUS', () => {
    const block = conditioning({ format: 'emom', minutes: TEST_EMOM_MIN }, [reps(TEST_REPS)]);
    expect(outcome(run(block, NO_RATE))).toEqual(accepted);
    expect(outcome(run(block, NO_ESTIMATION))).toEqual(missingRef('timing.secondsPerRep'));
  });

  it('C — continu, item timed (une durée) : AUCUNE donnée d’estimation requise', () => {
    expect(outcome(run(conditioning({ format: 'continuous' }, [timed(TEST_TIME_S)]), NO_ESTIMATION))).toEqual(accepted);
  });

  it('C′ — continu, item distance sans débit m/min ⇒ REFUS', () => {
    const block = conditioning({ format: 'continuous' }, [{ id: 'i1', exerciseId: MOVE, prescription: { type: 'distance', distanceM: TEST_TIME_S } }]);
    expect(outcome(run(block, NO_ESTIMATION))).toEqual(missingRef('workRate(m_per_min)'));
  });

  it('D — intervalles à durée fixe (continu, un item timed avec tours et repos) : AUCUNE donnée d’estimation requise', () => {
    expect(outcome(run(conditioning({ format: 'continuous' }, [timed(TEST_TIME_S / TEST_EMOM_MIN, TEST_ROUNDS, TEST_TIME_S / TEST_EMOM_MIN)]), NO_ESTIMATION))).toEqual(accepted);
  });

  it('E — for time avec cap, item reps : sans débit mais avec secondsPerRep ⇒ accepté ; sans aucune donnée ⇒ REFUS', () => {
    const block = conditioning({ format: 'for_time', rounds: TEST_ROUNDS, timeCapS: TEST_TIME_S }, [reps(TEST_REPS)]);
    expect(outcome(run(block, NO_RATE))).toEqual(accepted);
    expect(outcome(run(block, NO_ESTIMATION))).toEqual(missingRef('timing.secondsPerRep'));
  });
});
