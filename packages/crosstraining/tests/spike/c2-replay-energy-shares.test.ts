/**
 * SPIKE (Decision Gate C1 → C2, annexe « energy shares ») — que fait le CORE RÉEL (runSportSession) des parts
 * d'énergie (`fingerprintInputs.energy`) lors d'un rejeu, et une première séance historique Cross-training
 * porteuse de ces parts peut-elle exister avant C2 (bootstrap problem) ?
 *
 * Ce n'est PAS C2 : aucun code de production, un moteur de TEST qui propose une séance fixe.
 * Les assertions ci-dessous FIGENT les résultats mesurés lors d'une première exécution en mode observation
 * (annexe du Decision Gate, section J). Aucune n'est une décision.
 *
 * FIXTURE TEST-ONLY : l'empreinte « historique » utilisée par les rejeux (blocs E) est FABRIQUÉE ici par un
 * premier passage dans le pipeline avec des parts d'énergie de TEST (`TEST_ONLY_SEED_ENERGY`). Elle sert
 * UNIQUEMENT à observer le comportement du CORE. Elle ne prouve PAS qu'une telle empreinte existe, ni puisse
 * exister, en production : c'est la question du bloc B (bootstrap), traité SANS cette fixture.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { asISODateTime, isNotApplicable } from '@hybridsport/domain';
import type { EnergyShares, FingerprintHistoryEntry, SessionDraftInput, SessionFingerprint, SportEngineProposalInput } from '@hybridsport/domain';
import { canonicalStringify, createCoreRegistry, runSportSession } from '@hybridsport/engine';
import type { ContextParse, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { createCrossTrainingEngine, zRealizedCtSession } from '../../src/index.js';
import { coreContext, ctRequest, ctxInput, fullyValuedGovernance, realized } from '../fixtures.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { completeOnboarding, decodeState, emptyState, ensureCurrentWeek, exportState, zAppState } from '../../../app-core/src/index.js';
import type { AppState } from '../../../app-core/src/index.js';
import { clock as appClock, profile as appProfile } from '../../../app-core/tests/fixtures.js';

type Block = SessionDraftInput['blocks'][number];
type Outcome = ReturnType<typeof runSportSession>;

// technical-constant: parts d'énergie de TEST ; FIXTURE, jamais une valeur de production ni un paramètre
const TEST_ONLY_SEED_ENERGY = { low: 0.2, moderate: 0.3, high: 0.5 };
const ENGINE = { id: 'engine.spike.ct_energy', version: '0.0.1' as const };
const HISTORY_AT = asISODateTime('2026-09-27T08:00:00Z');

// ——— Séance et moteur de TEST (même construction que c2-replay-core-compat) ———

const BLOCK: Block = {
  id: 'b.metcon', kind: 'conditioning', role: 'primary', format: 'amrap', timeCapS: 600,
  items: [{ id: 'i1', exerciseId: 'ex.air_squat', prescription: { type: 'reps', reps: 15 } }, { id: 'i2', exerciseId: 'ex.push_up', prescription: { type: 'reps', reps: 10 } }],
} as Block;
const session = (id: string): SessionDraftInput => ({ id, discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed', blocks: [BLOCK] });

const ABSENT = Symbol('energy absent');
interface RunOptions { readonly energy: unknown; readonly history?: readonly FingerprintHistoryEntry[] }

function testEngine(s: SessionDraftInput, energy: unknown): SportEngine<Record<string, never>> {
  const parse = (raw: unknown): ContextParse<Record<string, never>> => (raw !== null && typeof raw === 'object' && Object.keys(raw).length === 0
    ? { ok: true, context: {} }
    : { ok: false, reasons: [createCoreRegistry().emit('TECHNICAL.SCHEMA_INVALID', { path: 'disciplineContext', problem: '{} attendu' })] });
  return {
    ...ENGINE, discipline: 'crosstraining', parseContext: parse,
    propose: (input: SportEngineInput<Record<string, never>>) => {
      const volumeByItem = Object.fromEntries(s.blocks.flatMap((b) => b.items.map((i) => [i.id, 1])));
      const fingerprintInputs: Record<string, unknown> = { archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, volumeByItem, prescriptionMarkers: {} };
      // Les parts d'énergie sont PASSÉES TELLES QUELLES : aucune dérivation, aucune table de stimulus.
      if (energy !== ABSENT) fingerprintInputs.energy = energy;
      const p: SportEngineProposalInput = {
        proposalId: 'proposal.energy', discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
        stimulus: input.intent.stimulus, objective: input.intent.objective, session: s,
        optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 }, fingerprintInputs, repetitionIntents: [], reasons: [],
        provenance: { engineId: ENGINE.id, engineVersion: ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
        parametersUsed: [],
      };
      return { status: 'proposals', proposals: [p] };
    },
  };
}

/** Passage par le pipeline RÉEL ; ruleset de TEST avec paramètres anti-doublon (sinon refus dès qu'un historique existe, F-10b). */
function run(id: string, opts: RunOptions): Outcome {
  const s = session(id);
  const intent = {
    id: 'intent.ct.energy', discipline: 'crosstraining' as const, archetypeId: 'crosstraining.mixed_modal_medium', stimulus: 'stim.crosstraining.metcon', objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
  return runSportSession(testEngine(s, opts.energy), { intent, profile: PROFILE_GYM, state: STATE_FRESH, history: [...(opts.history ?? [])], disciplineContext: {} }, coreContext('spike-energy', testRuleset(testRulesetDocumentWithDuplicate())));
}

/** Contenu prescriptif comparable (format et champs de bloc, exercices, prescriptions), sans les défauts techniques du CORE (comme c2-replay-core-compat). */
const shape = (blocks: readonly object[]): string => canonicalStringify(blocks.map((b) => {
  const { format, items, ...rest } = b as Record<string, unknown> & { format: string; items: { exerciseId: string; prescription: unknown }[] };
  const fields = Object.fromEntries(Object.entries(rest).filter(([k]) => ['minutes', 'timeCapS', 'rounds'].includes(k)));
  return { format, ...fields, items: items.map((i) => ({ exerciseId: i.exerciseId, prescription: i.prescription })) };
}));

/** Observation d'un passage : issue, raisons, décisions de trace, parts d'énergie de l'empreinte produite. */
function observe(o: Outcome) {
  const steps = o.trace.entries.filter((e) => ['fingerprint', 'duplicate', 'result'].includes(e.step)).map((e) => `${e.step}:${e.decision}`);
  const error = o.result.status === 'error' ? { code: o.result.error.code, reasons: o.result.error.reasons.map((r) => ({ code: r.code, params: r.params })) } : undefined;
  const fpReasons = o.trace.entries.filter((e) => e.step === 'fingerprint').flatMap((e) => e.reasons.map((r) => ({ code: r.code, params: r.params })));
  return {
    status: o.result.status, error, fingerprintReasons: fpReasons, steps,
    identical: o.result.status === 'ok' ? shape(o.result.value.blocks) === shape(session(o.result.value.id).blocks) : undefined,
    energy: o.fingerprint?.energy,
    energySum: o.fingerprint && !isNotApplicable(o.fingerprint.energy) ? o.fingerprint.energy.low + o.fingerprint.energy.moderate + o.fingerprint.energy.high : undefined,
    duplicate: o.duplicate ? { classification: o.duplicate.classification, comparisons: o.duplicate.comparisons.map((c) => ({ sessionId: c.sessionId, energy: c.breakdown.energy, similarity: c.similarity })) } : undefined,
  };
}

/** Comparaison bit à bit (Object.is) et écart maximal entre deux vecteurs de parts. */
function compare(a: EnergyShares, b: EnergyShares) {
  const keys = ['low', 'moderate', 'high'] as const;
  return { bitwiseEqual: keys.every((k) => Object.is(a[k], b[k])), maxAbsDiff: Math.max(...keys.map((k) => Math.abs(a[k] - b[k]))) };
}

/** FIXTURE TEST-ONLY : empreinte « historique » fabriquée par un premier passage (voir en-tête). */
function testOnlyHistoricalFingerprint(): SessionFingerprint {
  const o = run('ct.hist.h0', { energy: TEST_ONLY_SEED_ENERGY });
  if (!o.fingerprint) throw new Error(`fixture : empreinte non produite ${JSON.stringify(observe(o))}`);
  return o.fingerprint;
}
const historyOf = (fp: SessionFingerprint): FingerprintHistoryEntry[] => [{ fingerprint: fp, at: HISTORY_AT, status: 'completed', repetitionIntents: [] }];

const energyOf = (o: Outcome): EnergyShares => {
  if (!o.fingerprint) throw new Error(`empreinte attendue : ${JSON.stringify(observe(o))}`);
  if (isNotApplicable(o.fingerprint.energy)) throw new Error('énergie connue attendue');
  return o.fingerprint.energy;
};

/** Refus mesuré (V1, V2, B3-bis) : jamais INVALID_INPUT, toujours NO_VALID_SOLUTION ; la raison technique n'est que dans la trace. */
function expectFingerprintRefusal(o: Outcome, fingerprintReasons: readonly { code: string; params: Record<string, unknown> }[]): void {
  const v = observe(o);
  expect(v.status).toBe('error');
  expect(v.error).toEqual({ code: 'NO_VALID_SOLUTION', reasons: [{ code: 'SELECT.NO_ADMISSIBLE_CANDIDATE', params: { candidates: 1 } }] });
  expect(v.fingerprintReasons).toEqual(fingerprintReasons);
  expect(v.steps).toEqual(['fingerprint:rejected']);
  expect(o.fingerprint).toBeUndefined();
}
const schemaInvalid = (path: string, problem: string) => ({ code: 'TECHNICAL.SCHEMA_INVALID', params: { path, problem } });

// ———————————————————————————————————————————————————————————————————————————————————————————————
describe('E — rejeu avec parts d’énergie historiques (FIXTURE TEST-ONLY), pipeline réel', () => {
  it('E1 [1,2,3] nouvel identifiant + parts de l’empreinte historique ⇒ accepté, séance identique, parts conservées bit à bit ; classé accidental_strong', () => {
    const h0 = testOnlyHistoricalFingerprint();
    expect(h0.energy).toEqual(TEST_ONLY_SEED_ENERGY);
    const o = run('ct.replay.r1', { energy: h0.energy, history: historyOf(h0) });
    const v = observe(o);
    expect(v).toMatchObject({ status: 'ok', identical: true, fingerprintReasons: [], steps: ['duplicate:accidental_strong', 'result:VALID'], energySum: 1 });
    if (isNotApplicable(h0.energy)) throw new Error('énergie connue attendue');
    expect(compare(h0.energy, energyOf(o))).toEqual({ bitwiseEqual: true, maxAbsDiff: 0 });
    expect(v.duplicate).toEqual({ classification: 'accidental_strong', comparisons: [{ sessionId: 'ct.hist.h0', energy: 1, similarity: 1 }] });
  });

  it('E2 [4] renormalisation IDEMPOTENTE bit à bit sur les vecteurs testés : N(N(x)) = N(x) = N(N(N(x))), chaque étape par runSportSession', () => {
    // technical-constant: vecteurs de TEST choisis pour exercer l'arithmétique flottante (tiers, dixièmes, entiers)
    const cases: readonly [string, EnergyShares, EnergyShares][] = [
      ['tiers', { low: 1, moderate: 1, high: 1 }, { low: 1 / 3, moderate: 1 / 3, high: 1 / 3 }],
      ['dixiemes', { low: 0.1, moderate: 0.2, high: 0.7 }, { low: 0.1, moderate: 0.2, high: 0.7 }],
      ['seed', TEST_ONLY_SEED_ENERGY, TEST_ONLY_SEED_ENERGY],
      ['entiers', { low: 3, moderate: 5, high: 11 }, { low: 3 / 19, moderate: 5 / 19, high: 11 / 19 }],
      ['pur', { low: 0, moderate: 1, high: 0 }, { low: 0, moderate: 1, high: 0 }],
    ];
    for (const [name, input, expected] of cases) {
      const n1 = energyOf(run(`ct.idem.${name}.1`, { energy: input }));
      const n2 = energyOf(run(`ct.idem.${name}.2`, { energy: n1 }));
      const n3 = energyOf(run(`ct.idem.${name}.3`, { energy: n2 }));
      expect(compare(n1, expected), name).toEqual({ bitwiseEqual: true, maxAbsDiff: 0 });
      expect(n1.low + n1.moderate + n1.high, name).toBe(1);
      expect(compare(n1, n2), name).toEqual({ bitwiseEqual: true, maxAbsDiff: 0 });
      expect(compare(n2, n3), name).toEqual({ bitwiseEqual: true, maxAbsDiff: 0 });
    }
  });

  it('E3 [10] déterminisme : deux passages identiques ⇒ empreinte et rapport anti-doublon identiques octet à octet', () => {
    const h0 = testOnlyHistoricalFingerprint();
    const a = run('ct.replay.det', { energy: h0.energy, history: historyOf(h0) });
    const b = run('ct.replay.det', { energy: h0.energy, history: historyOf(h0) });
    expect(a.fingerprint).toBeDefined();
    expect(canonicalStringify(a.fingerprint ?? null)).toBe(canonicalStringify(b.fingerprint ?? null));
    expect(canonicalStringify(a.duplicate ?? null)).toBe(canonicalStringify(b.duplicate ?? null));
  });

  it('E4 [11] sessionId : seule clé d’empreinte qui change ; nouvel id ⇒ comparé (accidental_strong) ; même id que l’historique ⇒ comparaison exclue (none)', () => {
    const h0 = testOnlyHistoricalFingerprint();
    const r2 = run('ct.replay.r2', { energy: h0.energy, history: historyOf(h0) });
    const r3 = run('ct.replay.r3', { energy: h0.energy, history: historyOf(h0) });
    const same = run(h0.sessionId, { energy: h0.energy, history: historyOf(h0) });
    const diffKeys = (x?: SessionFingerprint, y?: SessionFingerprint): string[] => {
      if (!x || !y) throw new Error('empreintes attendues');
      return Object.keys({ ...x, ...y }).filter((k) => canonicalStringify((x as Record<string, unknown>)[k] ?? null) !== canonicalStringify((y as Record<string, unknown>)[k] ?? null)).sort();
    };
    expect(diffKeys(r2.fingerprint, r3.fingerprint)).toEqual(['sessionId']);
    expect(diffKeys(r2.fingerprint, h0)).toEqual(['sessionId']);
    expect(observe(r2).duplicate).toEqual({ classification: 'accidental_strong', comparisons: [{ sessionId: 'ct.hist.h0', energy: 1, similarity: 1 }] });
    expect(observe(same).duplicate).toEqual({ classification: 'none', comparisons: [] });
  });
});

// ———————————————————————————————————————————————————————————————————————————————————————————————
describe('V — parts absentes, invalides, non normalisées : comportement mesuré du CORE', () => {
  it('V1 [7] parts absentes (clé absente, null, {}, clé partielle) ⇒ empreinte rejetée, NO_VALID_SOLUTION, aucune réparation (fail-closed)', () => {
    expectFingerprintRefusal(run('ct.abs.cle', { energy: ABSENT }), [schemaInvalid('fingerprintInputs.energy', 'Invalid input: expected object, received undefined')]);
    expectFingerprintRefusal(run('ct.abs.null', { energy: null }), [schemaInvalid('fingerprintInputs.energy', 'Invalid input: expected object, received null')]);
    expectFingerprintRefusal(run('ct.abs.vide', { energy: {} }), (['low', 'moderate', 'high'] as const).map((k) => schemaInvalid(`fingerprintInputs.energy.${k}`, 'Invalid input: expected number, received undefined')));
    expectFingerprintRefusal(run('ct.abs.partiel', { energy: { low: 0.5, moderate: 0.5 } }), [schemaInvalid('fingerprintInputs.energy.high', 'Invalid input: expected number, received undefined')]);
  });

  it('V2 [8] valeurs invalides ⇒ empreinte rejetée (schéma ou structure), NO_VALID_SOLUTION', () => {
    expectFingerprintRefusal(run('ct.inv.neg', { energy: { low: -0.1, moderate: 0.6, high: 0.5 } }), [schemaInvalid('fingerprintInputs.energy.low', 'Too small: expected number to be >=0')]);
    expectFingerprintRefusal(run('ct.inv.nan', { energy: { low: Number.NaN, moderate: 0.5, high: 0.5 } }), [schemaInvalid('fingerprintInputs.energy.low', 'Invalid input: expected number, received NaN')]);
    expectFingerprintRefusal(run('ct.inv.inf', { energy: { low: Number.POSITIVE_INFINITY, moderate: 0, high: 0 } }), [schemaInvalid('fingerprintInputs.energy.low', 'Invalid input: expected number, received Infinity')]);
    expectFingerprintRefusal(run('ct.inv.minf', { energy: { low: Number.NEGATIVE_INFINITY, moderate: 1, high: 1 } }), [schemaInvalid('fingerprintInputs.energy.low', 'Invalid input: expected number, received -Infinity')]);
    expectFingerprintRefusal(run('ct.inv.str', { energy: { low: '0.2', moderate: 0.3, high: 0.5 } }), [schemaInvalid('fingerprintInputs.energy.low', 'Invalid input: expected number, received string')]);
    expectFingerprintRefusal(run('ct.inv.extra', { energy: { low: 0.2, moderate: 0.3, high: 0.5, veryHigh: 0 } }), [schemaInvalid('fingerprintInputs.energy', 'Unrecognized key: "veryHigh"')]);
    expectFingerprintRefusal(run('ct.inv.zero', { energy: { low: 0, moderate: 0, high: 0 } }), [{ code: 'TECHNICAL.STRUCTURE_INVALID', params: { problem: 'répartition énergétique nulle', target: 'ct.inv.zero' } }]);
  });

  it('V3 [9] valeurs valides non normalisées ⇒ acceptées et normalisées (somme 1) ; SAUF dépassement flottant : somme infinie ⇒ parts {0,0,0} ACCEPTÉES, puis refusées au rejeu', () => {
    // technical-constant: vecteurs de TEST ; les extrêmes sondent la division par la somme (sous-normaux, dépassement)
    const normalized: readonly [string, EnergyShares, EnergyShares][] = [
      ['sommeDix', { low: 2, moderate: 3, high: 5 }, { low: 0.2, moderate: 0.3, high: 0.5 }],
      ['unSeul', { low: 10, moderate: 0, high: 0 }, { low: 1, moderate: 0, high: 0 }],
      ['sommeInferieure', { low: 0.1, moderate: 0.1, high: 0.1 }, { low: 1 / 3, moderate: 1 / 3, high: 1 / 3 }],
      ['sousNormal', { low: Number.MIN_VALUE, moderate: 0, high: 0 }, { low: 1, moderate: 0, high: 0 }],
    ];
    for (const [name, input, expected] of normalized) {
      const o = run(`ct.norm.${name}`, { energy: input });
      expect(observe(o), name).toMatchObject({ status: 'ok', identical: true, steps: ['duplicate:none', 'result:VALID'], energySum: 1 });
      expect(compare(energyOf(o), expected), name).toEqual({ bitwiseEqual: true, maxAbsDiff: 0 });
    }
    // Dépassement : MAX_VALUE + MAX_VALUE = Infinity > 0 passe le contrôle, chaque part / Infinity = 0.
    const overflow = run('ct.norm.depassement', { energy: { low: Number.MAX_VALUE, moderate: Number.MAX_VALUE, high: 0 } });
    expect(observe(overflow)).toMatchObject({ status: 'ok', identical: true, energy: { low: 0, moderate: 0, high: 0 }, energySum: 0 });
    // Cette empreinte dégénérée, relue comme parts historiques, est refusée au rejeu (répartition nulle).
    expectFingerprintRefusal(run('ct.norm.depassement.replay', { energy: energyOf(overflow) }), [{ code: 'TECHNICAL.STRUCTURE_INVALID', params: { problem: 'répartition énergétique nulle', target: 'ct.norm.depassement.replay' } }]);
  });
});

// ———————————————————————————————————————————————————————————————————————————————————————————————
describe('O — origine des parts d’énergie dans les contrats actuels', () => {
  it('O1 [5,6] ce spike n’utilise ni la liste des stimuli Cross-training ni la bande d’intensité', () => {
    const text = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    // Jetons reconstruits pour que ce test ne se détecte pas lui-même.
    const forbidden = [['CT', 'STIMULI'].join('_'), ['ct', 'stimulus', ['intensity', 'Band'].join('')].join('.'), ['intensity', 'Band'].join('')];
    expect(forbidden.filter((t) => text.includes(t))).toEqual([]);
  });

  it('O2 [12,13] une séance réalisée Cross-training (contrat C1) ne peut porter ni parts d’énergie ni empreinte', () => {
    const base = zRealizedCtSession.safeParse(realized());
    expect(base.success).toBe(true);
    expect(base.success ? Object.keys(base.data).sort() : []).toEqual(['completedAt', 'completion', 'prescription', 'result', 'sessionId', 'stimulus']);
    const withEnergy = zRealizedCtSession.safeParse({ ...realized(), energy: TEST_ONLY_SEED_ENERGY });
    expect(withEnergy.success).toBe(false);
    expect(withEnergy.error?.issues.map((i) => ({ code: i.code, message: i.message }))).toEqual([{ code: 'unrecognized_keys', message: 'Unrecognized key: "energy"' }]);
    expect(zRealizedCtSession.safeParse({ ...realized(), fingerprint: {} }).success).toBe(false);
  });

  it('O3 [13] (état POST-C2) l’état applicatif a désormais un emplacement d’empreintes Cross-training ; un emplacement inconnu reste refusé', () => {
    // Avant C2 (mesure d'origine) : seuls `running` et `strength` existaient. C2 ajoute `crosstraining` (champ additif).
    const empty = emptyState();
    expect(Object.keys(empty.fingerprints).sort()).toEqual(['crosstraining', 'running', 'strength']);
    expect(zAppState.safeParse({ ...empty, fingerprints: { ...empty.fingerprints, hyrox: [] } }).success).toBe(false);
  });
});

// ———————————————————————————————————————————————————————————————————————————————————————————————
describe('B — bootstrap : une PREMIÈRE empreinte Cross-training peut-elle exister avant C2 ? (SANS fixture historique)', () => {
  it('B1 [14] moteur Cross-training RÉEL (C1), gouvernance actuelle, historique réalisé fourni ⇒ NO_VALID_SOLUTION, aucune empreinte', () => {
    const o = runSportSession(createCrossTrainingEngine(), ctRequest(ctxInput({ sessionHistory: [zRealizedCtSession.parse(realized())] })), coreContext('spike-energy-b1'));
    expect(o.result.status === 'error' ? o.result.error.code : o.result.status).toBe('NO_VALID_SOLUTION');
    expect(o.fingerprint).toBeUndefined();
    expect(o.trace.entries.map((e) => e.step)).toEqual(['proposal']);
  });

  it('B2 [14] TEST-ONLY — gouvernance SIMULÉE entièrement valorisée + simulation : isole l’effet de la gouvernance C1 (ne simule PAS un état de production valide) ⇒ seul PRESCRIPTION_NOT_IMPLEMENTED reste, aucune empreinte', () => {
    const engine = createCrossTrainingEngine({ governance: fullyValuedGovernance(), simulation: true });
    const o = runSportSession(engine, ctRequest(ctxInput({ sessionHistory: [zRealizedCtSession.parse(realized())] })), coreContext('spike-energy-b2'));
    expect(o.result.status === 'error' ? { code: o.result.error.code, reasons: o.result.error.reasons.map((r) => r.code) } : o.result.status)
      .toEqual({ code: 'NO_VALID_SOLUTION', reasons: ['PLAN.CROSSTRAINING.PRESCRIPTION_NOT_IMPLEMENTED'] });
    expect(o.fingerprint).toBeUndefined();
  });

  it('B3 [14] bout en bout, depuis les SEULES données qu’un utilisateur Cross-training peut posséder ⇒ BOOTSTRAP PATH ABSENT', () => {
    // Aucune fixture energy, aucune empreinte fabriquée, aucune liste de stimuli, aucune bande résolue, aucune classification.
    // 1. Utilisateur Cross-training SEUL, parcours applicatif réel : onboarding puis 3 semaines suivantes.
    const ctOnly = appProfile({ priorities: ['crosstraining'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 1 }, crosstraining: { enabled: true } });
    let state: AppState = completeOnboarding(emptyState(), ctOnly, appClock());
    for (const monday of ['2026-10-12', '2026-10-19', '2026-10-26']) state = ensureCurrentWeek(state, appClock(monday));
    const plans = Object.values(state.plans);
    expect(plans).toHaveLength(4);
    expect(plans.flatMap((p) => p.entries).filter((e) => (e.sport as string) === 'crosstraining')).toEqual([]);
    expect(Object.values(state.sessions).filter((g) => (g.sport as string) === 'crosstraining')).toEqual([]);
    expect([...new Set(plans.flatMap((p) => p.notices.map((n) => `${n.code}:${String(n.params.sport)}`)))]).toEqual(['PLAN.ENGINE_UNAVAILABLE:crosstraining']);

    // 2. Ce qui est RÉELLEMENT persisté (export puis relecture par le décodeur de l'application) : aucune part d'énergie.
    const text = exportState(state);
    expect(decodeState(text).ok).toBe(true);
    const persisted = scan(JSON.parse(text) as unknown);
    expect(persisted.energyShareObjects).toEqual([]);
    expect(persisted.energyKeys).toEqual([]);
    // Seule trace Cross-training persistée : l'avis « moteur indisponible » de chaque semaine.
    expect(persisted.crosstrainingObjects).toEqual(plans.map((p) => `$.plans.${p.weekStart}.notices[0].params`));

    // 3. La seule séance Cross-training historique REPRÉSENTABLE : zRealizedCtSession (C1), champs optionnels renseignés.
    const r = zRealizedCtSession.parse(realized({ sessionRpe: 7, pain: 'NONE' }));
    expect(Object.keys(r).sort()).toEqual(['completedAt', 'completion', 'pain', 'prescription', 'result', 'sessionId', 'sessionRpe', 'stimulus']);
    expect(scan(r)).toEqual({ energyShareObjects: [], energyKeys: [], crosstrainingObjects: [] });
    // 3b. (POST-C2) Elle a désormais un emplacement dédié ; elle n'entre toujours pas dans l'historique Running.
    expect(zAppState.safeParse({ ...state, crosstraining: { realized: [r] } }).success).toBe(true);
    expect(zAppState.safeParse({ ...state, running: { ...state.running, realized: [r] } }).success).toBe(false);

    // 4. Son seul consommateur actuel (moteur Cross-training réel, via le CORE) ne produit aucune empreinte.
    const o = runSportSession(createCrossTrainingEngine(), ctRequest(ctxInput({ sessionHistory: [r] })), coreContext('spike-energy-b3'));
    expect(o.result.status === 'error' ? o.result.error.code : o.result.status).toBe('NO_VALID_SOLUTION');
    expect(o.fingerprint).toBeUndefined();

    // 5. Faute de source, un rejeu ne pourrait transmettre aucune part au CORE : refus mesuré (même issue que V1).
    expectFingerprintRefusal(run('ct.bootstrap.r1', { energy: ABSENT }), [schemaInvalid('fingerprintInputs.energy', 'Invalid input: expected object, received undefined')]);
  });
});

/** Parcours d'une donnée : objets de forme {low, moderate, high}, clés « energy », objets Cross-training. */
function scan(root: unknown) {
  const energyShareObjects: string[] = [];
  const energyKeys: string[] = [];
  const crosstrainingObjects: string[] = [];
  const walk = (v: unknown, path: string): void => {
    if (Array.isArray(v)) { v.forEach((x, i) => { walk(x, `${path}[${String(i)}]`); }); return; }
    if (v === null || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (['low', 'moderate', 'high'].every((k) => typeof o[k] === 'number')) energyShareObjects.push(path);
    if (o.discipline === 'crosstraining' || o.sport === 'crosstraining') crosstrainingObjects.push(path);
    for (const [k, x] of Object.entries(o)) { if (k === 'energy') energyKeys.push(`${path}.${k}`); walk(x, `${path}.${k}`); }
  };
  walk(root, '$');
  return { energyShareObjects, energyKeys, crosstrainingObjects };
}
