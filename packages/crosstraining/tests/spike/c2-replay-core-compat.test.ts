/**
 * SPIKE (Decision Gate C1 → C2) — le rejeu NON CHARGÉ d'une séance Cross-training est-il représentable par le CORE
 * ACTUEL, à travers le pipeline RÉEL (runSportSession : acceptation, durée, empreinte, anti-doublon, validation,
 * réparation) ? Ce n'est PAS C2 : aucun code de production, un moteur de TEST qui propose une séance fixe.
 * Critère de compatibilité : la séance renvoyée par le CORE doit être IDENTIQUE à la séance proposée (formats, champs
 * de bloc, exercices, prescriptions). Une représentation qui passe le typage mais change en route est incompatible.
 * Les valeurs (reps, mètres, parts d'énergie…) sont des DONNÉES DE TEST, jamais des paramètres.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import type { FingerprintHistoryEntry, SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import { canonicalStringify, createCoreRegistry, runSportSession } from '@hybridsport/engine';
import type { ContextParse, SportEngine, SportEngineInput } from '@hybridsport/engine';
import { coreContext } from '../fixtures.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';

type Block = SessionDraftInput['blocks'][number];
type Item = Block['items'][number];

// technical-constant: parts d'énergie de TEST (le spike montre justement que le CORE EXIGE cette donnée)
const TEST_ENERGY = { low: 0, moderate: 1, high: 0 };
const ENGINE = { id: 'engine.spike.ct_replay', version: '0.0.1' as const };

const reps = (id: string, exerciseId: string, n: number): Item => ({ id, exerciseId, prescription: { type: 'reps', reps: n } });
const cal = (id: string, exerciseId: string, n: number): Item => ({ id, exerciseId, prescription: { type: 'calories', calories: n } });
const dist = (id: string, exerciseId: string, m: number): Item => ({ id, exerciseId, prescription: { type: 'distance', distanceM: m } });
const timed = (id: string, exerciseId: string, s: number): Item => ({ id, exerciseId, prescription: { type: 'timed', workS: s, rounds: 1, restS: 0 } });

function session(block: Block, o: Partial<SessionDraftInput> = {}): SessionDraftInput {
  return { id: 'ct.replay.s1', discipline: 'crosstraining', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 1800, toleranceProfile: 'mixed', blocks: [block], ...o };
}

interface SpikeOptions {
  readonly energy?: unknown;
  readonly profile?: typeof PROFILE_GYM;
  readonly history?: FingerprintHistoryEntry[];
  /** Ruleset de TEST avec paramètres anti-doublon (celui que l'application charge pour la Course). */
  readonly withDuplicateParams?: boolean;
}

function spikeEngine(s: SessionDraftInput, opts: SpikeOptions): SportEngine<Record<string, never>> {
  const parse = (raw: unknown): ContextParse<Record<string, never>> => (raw !== null && typeof raw === 'object' && Object.keys(raw).length === 0
    ? { ok: true, context: {} }
    : { ok: false, reasons: [createCoreRegistry().emit('TECHNICAL.SCHEMA_INVALID', { path: 'disciplineContext', problem: '{} attendu' })] });
  return {
    ...ENGINE, discipline: 'crosstraining', parseContext: parse,
    propose: (input: SportEngineInput<Record<string, never>>) => {
      const volumeByItem = Object.fromEntries(s.blocks.flatMap((b) => b.items.map((i) => [i.id, 1])));
      const fingerprintInputs: Record<string, unknown> = { archetypeId: input.intent.archetypeId, stimulus: input.intent.stimulus, volumeByItem, prescriptionMarkers: {} };
      if (opts.energy !== undefined) fingerprintInputs.energy = opts.energy;
      const p: SportEngineProposalInput = {
        proposalId: 'proposal.replay', discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
        stimulus: input.intent.stimulus, objective: input.intent.objective, session: s,
        optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 }, fingerprintInputs, repetitionIntents: [], reasons: [],
        provenance: { engineId: ENGINE.id, engineVersion: ENGINE.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
        parametersUsed: [],
      };
      return { status: 'proposals', proposals: [p] };
    },
  };
}

function replay(s: SessionDraftInput, opts: SpikeOptions = { energy: TEST_ENERGY }) {
  const intent = {
    id: 'intent.ct.replay', discipline: 'crosstraining' as const, archetypeId: 'crosstraining.mixed_modal_medium', stimulus: 'stim.crosstraining.metcon', objective: 'objective.crosstraining.general',
    priority: 'standard' as const, phase: 'phase.crosstraining.base', availableTimeS: s.availableTimeS, targetDurationS: s.targetDurationS, repetitionIntents: [], plannerNotes: [],
  };
  return runSportSession(spikeEngine(s, opts), { intent, profile: opts.profile ?? PROFILE_GYM, state: STATE_FRESH, history: opts.history ?? [], disciplineContext: {} }, opts.withDuplicateParams === true ? coreContext('spike', testRuleset(testRulesetDocumentWithDuplicate())) : coreContext('spike'));
}

/** Contenu prescriptif comparable (format et champs de bloc, exercices, prescriptions), sans les défauts techniques. */
const shape = (blocks: readonly { format: string; items: readonly { exerciseId: string; prescription: unknown }[] }[] & readonly object[]) =>
  canonicalStringify(blocks.map((b) => {
    const { format, items, ...rest } = b as unknown as Record<string, unknown> & { format: string; items: { exerciseId: string; prescription: unknown }[] };
    const fields = Object.fromEntries(Object.entries(rest).filter(([k]) => ['minutes', 'timeCapS', 'rounds'].includes(k)));
    return { format, ...fields, items: items.map((i) => ({ exerciseId: i.exerciseId, prescription: i.prescription })) };
  }));

function verdict(s: SessionDraftInput, opts?: SpikeOptions) {
  const o = replay(s, opts);
  if (o.result.status === 'rest_recommended') return { status: 'refused' as const, code: 'REST_RECOMMENDED', reasons: o.result.reasons.map((r) => r.code), params: [], trace: [] };
  if (o.result.status !== 'ok') return { status: 'refused' as const, code: o.result.error.code, reasons: o.result.error.reasons.map((r) => r.code), params: o.result.error.reasons.map((r) => r.params), trace: o.trace.entries.map((e) => `${e.step}:${e.decision}`) };
  const identical = shape(o.result.value.blocks) === shape(s.blocks as never);
  return { status: identical ? 'identical' as const : 'modified' as const, session: o.result.value, outcome: o };
}

/** Estimation p50 lue dans la trace (raison DURATION.ESTIMATED du pas « duration »). */
function p50Of(o: ReturnType<typeof replay>): number {
  const r = o.trace.entries.filter((e) => e.step === 'duration').flatMap((e) => e.reasons).find((x) => x.code === 'DURATION.ESTIMATED');
  if (r === undefined || typeof r.params.p50S !== 'number') throw new Error('estimation absente');
  return r.params.p50S;
}

const conditioning = (format: Record<string, unknown>, items: Item[]): Block => ({ id: 'b.metcon', kind: 'conditioning', role: 'primary', items, ...format } as Block);

describe('SPIKE — formats non chargés, pipeline réel, sans aucun levier', () => {
  it('AMRAP : reps + distance ⇒ IDENTIQUE', () => {
    const v = verdict(session(conditioning({ format: 'amrap', timeCapS: 600 }, [reps('i1', 'ex.air_squat', 15), reps('i2', 'ex.push_up', 10), dist('i3', 'ex.row_erg', 250)])));
    expect(v.status).toBe('identical');
  });

  it('FOR TIME avec time cap : reps + distance ⇒ IDENTIQUE', () => {
    const v = verdict(session(conditioning({ format: 'for_time', rounds: 3, timeCapS: 900 }, [reps('i1', 'ex.air_squat', 15), reps('i2', 'ex.box_jump', 10), dist('i3', 'ex.row_erg', 250)])));
    expect(v.status).toBe('identical');
  });

  it('FOR TIME SANS time cap (autorisé par le contrat de séance réalisée C1) ⇒ REFUS : le CORE exige timeCapS ; rejouer exigerait d’INVENTER un cap', () => {
    const v = verdict(session(conditioning({ format: 'for_time', rounds: 3 }, [reps('i1', 'ex.air_squat', 15)])));
    expect(v.status).toBe('refused');
  });

  it('EMOM, un seul mouvement ⇒ IDENTIQUE', () => {
    expect(verdict(session(conditioning({ format: 'emom', minutes: 10 }, [reps('i1', 'ex.push_up', 10)]))).status).toBe('identical');
  });

  it('EMOM, deux mouvements ⇒ accepté, mais le CORE n’a AUCUNE sémantique « alterné » vs « chaque minute » : la durée est la même dans les deux lectures', () => {
    const v = verdict(session(conditioning({ format: 'emom', minutes: 10 }, [reps('i1', 'ex.push_up', 10), reps('i2', 'ex.air_squat', 15)])));
    expect(v.status).toBe('identical');
    // Même estimation que l'EMOM à un mouvement : le bloc EMOM est une durée fixe, son contenu n'est pas interprété.
    const single = verdict(session(conditioning({ format: 'emom', minutes: 10 }, [reps('i1', 'ex.push_up', 10)])));
    if (v.status !== 'identical' || single.status !== 'identical') throw new Error('attendu identique');
    expect(p50Of(v.outcome)).toBe(p50Of(single.outcome));
  });

  it('CONTINU : distance et durée (timed) ⇒ IDENTIQUE', () => {
    expect(verdict(session(conditioning({ format: 'continuous' }, [dist('i1', 'ex.row_erg', 2000)]))).status).toBe('identical');
    expect(verdict(session(conditioning({ format: 'continuous' }, [timed('i1', 'ex.air_squat', 60)]))).status).toBe('identical');
  });

  it('CALORIES sur un mouvement sans débit cal/min au catalogue ⇒ REFUS, même en AMRAP (la durée calcule le travail de chaque item)', () => {
    for (const block of [conditioning({ format: 'amrap', timeCapS: 600 }, [cal('i1', 'ex.row_erg', 12)]), conditioning({ format: 'for_time', rounds: 1, timeCapS: 600 }, [cal('i1', 'ex.row_erg', 12)])]) {
      const v = verdict(session(block));
      expect(v.status).toBe('refused');
    }
  });

  it('Item « sets » à une série (non chargé) dans un for time ⇒ accepté, mais estimé par secondsPerRep et non par le débit : sémantique différente d’un item reps', () => {
    const asSets: Item = { id: 'i1', exerciseId: 'ex.air_squat', prescription: { type: 'sets', sets: [{ kind: 'working', reps: 15, restAfterS: 0 }] } };
    const a = verdict(session(conditioning({ format: 'for_time', rounds: 3, timeCapS: 900 }, [asSets])));
    const b = verdict(session(conditioning({ format: 'for_time', rounds: 3, timeCapS: 900 }, [reps('i1', 'ex.air_squat', 15)])));
    if (a.status !== 'identical' || b.status !== 'identical') throw new Error(`attendu identique : ${a.status}/${b.status}`);
    expect(p50Of(a.outcome)).not.toBe(p50Of(b.outcome));
  });

  it('INTERVALLES multi-stations : aucun bloc CORE ne porte la rotation ; la meilleure approximation (continu + items timed) perd l’ordre des stations', () => {
    // 3 tours de [40 s A, 40 s B] : le CORE n'a qu'une suite d'items, chacun avec ses propres tours.
    const approx = conditioning({ format: 'continuous' }, [
      { id: 'i1', exerciseId: 'ex.air_squat', prescription: { type: 'timed', workS: 40, rounds: 3, restS: 20 } },
      { id: 'i2', exerciseId: 'ex.push_up', prescription: { type: 'timed', workS: 40, rounds: 3, restS: 20 } },
    ]);
    const v = verdict(session(approx));
    // Accepté et « identique » à la proposition… mais la proposition elle-même n'exprime plus A/B/A/B : information perdue AVANT le CORE.
    expect(v.status).toBe('identical');
  });
});

describe('SPIKE — ce que le pipeline peut changer ou exiger', () => {
  it('matériel absent (box) ⇒ le CORE RÉPARE (substitution ou retrait) : la séance renvoyée n’est PLUS la séance rejouée', () => {
    const noBox = { ...PROFILE_GYM, availableEquipment: PROFILE_GYM.availableEquipment.filter((e) => e !== 'box') };
    const v = verdict(session(conditioning({ format: 'for_time', rounds: 3, timeCapS: 900 }, [reps('i1', 'ex.air_squat', 15), reps('i2', 'ex.box_jump', 10)])), { energy: TEST_ENERGY, profile: noBox });
    expect(v.status).toBe('modified');
  });

  it('restriction déclarée (no_impact) ⇒ réparation : séance modifiée', () => {
    const restricted = { ...PROFILE_GYM, restrictions: ['no_impact'] };
    const v = verdict(session(conditioning({ format: 'for_time', rounds: 3, timeCapS: 900 }, [reps('i1', 'ex.air_squat', 15), reps('i2', 'ex.box_jump', 10)])), { energy: TEST_ENERGY, profile: restricted });
    expect(v.status).toBe('modified');
  });

  it('temps disponible insuffisant, aucun levier déclaré ⇒ REFUS (jamais de compression silencieuse)', () => {
    const v = verdict(session(conditioning({ format: 'amrap', timeCapS: 1800 }, [reps('i1', 'ex.air_squat', 15)]), { availableTimeS: 900, targetDurationS: 600 }));
    expect(v.status).toBe('refused');
  });

  it('temps insuffisant AVEC un levier déclaré ⇒ le CORE raccourcit le bloc : séance modifiée (un rejeu ne doit déclarer aucun levier)', () => {
    const block = { ...conditioning({ format: 'amrap', timeCapS: 1800 }, [reps('i1', 'ex.air_squat', 15)]), levers: [{ kind: 'shorten_conditioning', minS: 300 }] } as Block;
    const v = verdict(session(block, { availableTimeS: 1500, targetDurationS: 1200 }));
    expect(v.status).toBe('modified');
  });

  it('parts d’énergie absentes des entrées d’empreinte ⇒ REFUS technique : le CORE exige une donnée d’intensité prévue', () => {
    const v = verdict(session(conditioning({ format: 'amrap', timeCapS: 600 }, [reps('i1', 'ex.air_squat', 15)])), {});
    expect(v.status).toBe('refused');
  });

  it('même identifiant de séance ⇒ l’historique est IGNORÉ par l’anti-doublon (comparaison exclue) : un rejeu doit porter un nouvel identifiant', () => {
    const s = session(conditioning({ format: 'amrap', timeCapS: 600 }, [reps('i1', 'ex.air_squat', 15)]));
    const first = replay(s);
    if (!first.fingerprint) throw new Error('empreinte');
    const history: FingerprintHistoryEntry[] = [{ fingerprint: first.fingerprint, at: asISODateTime('2026-09-27T08:00:00Z'), status: 'completed', repetitionIntents: [] }];
    const same = verdict(s, { energy: TEST_ENERGY, history });
    if (same.status !== 'identical') throw new Error(same.status);
    expect(same.outcome.duplicate?.classification).toBe('none');
    expect(same.outcome.duplicate?.comparisons).toEqual([]);
  });

  it('rejeu sous un NOUVEL identifiant, ruleset SANS paramètres anti-doublon ⇒ REFUS technique (duplicate.weights manquant) : fail-closed', () => {
    const original = session(conditioning({ format: 'amrap', timeCapS: 600 }, [reps('i1', 'ex.air_squat', 15)]));
    const first = replay(original);
    if (!first.fingerprint) throw new Error('empreinte');
    const history: FingerprintHistoryEntry[] = [{ fingerprint: first.fingerprint, at: asISODateTime('2026-09-27T08:00:00Z'), status: 'completed', repetitionIntents: [] }];
    const v = verdict({ ...original, id: 'ct.replay.s2' }, { energy: TEST_ENERGY, history });
    expect(v).toMatchObject({ status: 'refused', code: 'INVALID_INPUT', reasons: ['TECHNICAL.PARAMETER_MISSING'] });
  });

  it('rejeu sous un NOUVEL identifiant, ruleset AVEC paramètres anti-doublon, sans intention déclarée ⇒ accepté et identique ; classé « accidentel » (SOFT, pénalité B6)', () => {
    const original = session(conditioning({ format: 'amrap', timeCapS: 600 }, [reps('i1', 'ex.air_squat', 15)]));
    const first = replay(original, { energy: TEST_ENERGY, withDuplicateParams: true });
    if (!first.fingerprint) throw new Error('empreinte');
    const history: FingerprintHistoryEntry[] = [{ fingerprint: first.fingerprint, at: asISODateTime('2026-09-27T08:00:00Z'), status: 'completed', repetitionIntents: [] }];
    const v = verdict({ ...original, id: 'ct.replay.s2' }, { energy: TEST_ENERGY, history, withDuplicateParams: true });
    if (v.status !== 'identical') throw new Error(JSON.stringify(v));
    expect(v.outcome.duplicate?.classification).toMatch(/^accidental_/);
    expect(v.outcome.duplicate?.penalty).toBeGreaterThan(0);
  });
});
