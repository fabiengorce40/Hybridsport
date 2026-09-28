/**
 * Vague 3 — séances de qualité en HOLD : rejeu EXACT de la dernière structure réalisée (V19), gardes
 * documentées (§G.3, §K, §M, §N, §X, V10, V11), cibles à l'effort (V02), aucune hausse, aucune première
 * exposition, aucune allure. Gouvernance simulée (mode SIMULATION) sauf mention contraire.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { FingerprintHistoryEntry } from '@hybridsport/domain';
import { canonicalStringify, runSportSession } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import { createRunningEngine, RUNNING_CODES, zRealizedStructure } from '../../src/index.js';
import type { RunningContext, RunningContextInput, RunningEngine } from '../../src/index.js';
import { PROFILE_GYM, STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { coreContext, ctxInput, runIntent } from '../fixtures.js';

const CORE_NOW = Date.parse('2026-09-28T08:00:00Z');
const daysAgo = (d: number) => new Date(CORE_NOW - d * 86_400_000).toISOString().replace('.000Z', 'Z');
type HistoryIn = NonNullable<RunningContextInput['sessionHistory']>[number];
const INTERVALS = { warmupS: 900, reps: 4, workS: 360, recoveryS: 90, recoveryMode: 'jog' as const, cooldownS: 600 };
const threshold = (o: Partial<HistoryIn> = {}): HistoryIn => ({
  sessionId: 'h.thr.1', archetype: 'THRESHOLD', structureFamily: 'INTERVALS', completedAt: daysAgo(5), realizedDurationS: 3000, completion: 'COMPLETED', structure: INTERVALS, ...o,
});
const exposure = (archetype: string) => ({ archetype, lastAt: daysAgo(5), count: 3 }) as NonNullable<RunningContextInput['exposures']>[number];
const disc = (o: Partial<RunningContextInput> = {}, history: HistoryIn[] = [threshold()]): RunningContextInput => ({
  ...ctxInput({ exposures: [...new Set(history.map((h) => h.archetype))].map(exposure), ...o }), sessionHistory: history,
});
const request = (d: RunningContextInput, archetypeId: string): Parameters<typeof runSportSession>[1] => ({
  intent: { ...runIntent(archetypeId), availableTimeS: 5400, targetDurationS: 5000 }, profile: PROFILE_GYM, state: STATE_FRESH, history: [] as FingerprintHistoryEntry[], disciplineContext: d,
});
function captured(engine: RunningEngine, d: RunningContextInput, archetypeId: string): SportEngineInput<RunningContext> {
  let seen: SportEngineInput<RunningContext> | undefined;
  const spy = { ...engine, propose: (input: SportEngineInput<RunningContext>) => { seen = input; return engine.propose(input); } };
  runSportSession(spy, request(d, archetypeId), coreContext('w3'));
  if (!seen) throw new Error('entrée non transmise');
  return seen;
}
const sim = () => createRunningEngine({ simulation: true });
const outcome = (d: RunningContextInput, archetypeId = 'running.threshold', engine = sim()) => engine.prescribe(captured(engine, d, archetypeId));
/** Règle de garde du candidat fractionné (le seuil génère aussi un candidat continu, refusé en P-R2 par §K). */
const guardRule = (o: ReturnType<typeof outcome>) => {
  const rules = o.reasons.filter((r) => r.code === RUNNING_CODES.QUALITY_GUARD_FAILED).map((r) => r.params.rule);
  return rules.find((r) => r !== 'K_CONTINUOUS_LEVEL') ?? rules[0];
};

describe('rejeu en HOLD de la dernière structure réalisée', () => {
  it('THRESHOLD fractionné : échauffement, 4 × 6 min, récupération trottée 90 s, retour au calme — exactement le réalisé', () => {
    const o = outcome(disc());
    expect(o.status).toBe('selected');
    if (o.status !== 'selected') return;
    expect(o.selection.structure.segments).toEqual([
      { kind: 'warmup', id: 'warmup', dose: { durationS: 900 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } },
      { kind: 'repeat', id: 'work', sets: 1, reps: 4, work: { durationS: 360 }, target: { domain: 'threshold_like', effort: { rpe: { min: 5, max: 7 } }, priority: 'effort' }, recovery: { dose: { durationS: 90 }, mode: 'jog' } },
      { kind: 'cooldown', id: 'cooldown', dose: { durationS: 600 }, target: { domain: 'easy_low', effort: { rpe: { min: 3, max: 3 } }, priority: 'effort' } },
    ]);
    expect(o.selection.candidate.dose).toEqual({ kind: 'structure', structure: INTERVALS, workS: 1440, source: { parameterId: 'running.dose.historyAnchorPolicy', sessionId: 'h.thr.1', completedAt: daysAgo(5) } });
    expect(o.selection.candidate.intensity).toEqual({ domain: 'THRESHOLD_LIKE', rpe: { min: 5, max: 7 }, easyCeiling: 3, source: { parameterId: 'running.target.rpeByDomain' } });
    expect(o.selection.candidate.precision).toBe('EFFORT_ONLY');
    expect(o.selection.structure.segments.every((s) => !('pace' in s.target))).toBe(true);
  });

  it('séance acceptée, validée et retenue par le CORE ; traces : simulation, HIGH_DEMAND conservateur (V31 vide), HOLD', () => {
    const engine = sim();
    const r = runSportSession(engine, request(disc(), 'running.threshold'), coreContext('w3-core'));
    expect(r.result.status).toBe('ok');
    const p = engine.propose(captured(engine, disc(), 'running.threshold'));
    expect(p.status).toBe('proposals');
    if (p.status !== 'proposals') return;
    const codes = p.proposals[0]?.reasons.map((x) => x.code) ?? [];
    expect(codes).toEqual(expect.arrayContaining([RUNNING_CODES.SIMULATED_PROPOSAL, RUNNING_CODES.HIGH_DEMAND_DEFAULT_CONSERVATIVE, RUNNING_CODES.PROGRESSION_UNRESOLVED, RUNNING_CODES.DOSE_ANCHOR_SELECTED]));
    // E5 : parts de temps de la structure (travail 1440 s en THRESHOLD_LIKE ⇒ moderate ; le reste ⇒ low).
    const total = 900 + 600 + 3 * 90 + 1440;
    const fi = p.proposals[0]?.fingerprintInputs as { energy: unknown; format: unknown; prescriptionMarkers: unknown } | undefined;
    expect(fi?.energy).toEqual({ low: 1 - 1440 / total, moderate: 1440 / total, high: 0 });
    expect(fi?.format).toBe('intervals');
    expect(fi?.prescriptionMarkers).toEqual({ 'THRESHOLD.workS': 1440, 'THRESHOLD.reps': 4 });
  });

  it('SEVERE : bande SEVERE (V02), E5 en high ; THRESHOLD continu (P-R3) : un segment steady', () => {
    const sev = outcome(disc({}, [threshold({ sessionId: 's1', archetype: 'SEVERE', structure: { ...INTERVALS, reps: 5, workS: 180, recoveryS: 180 } })]), 'running.severe');
    expect(sev.status === 'selected' && sev.selection.structure.segments[1]).toMatchObject({ kind: 'repeat', reps: 5, work: { durationS: 180 }, target: { domain: 'severe', effort: { rpe: { min: 7, max: 9 } } } });
    const cont = outcome(disc({ population: { level: 'P_R3', hybrid: false } }, [threshold({ structureFamily: 'CONTINUOUS', structure: { warmupS: 900, reps: 1, workS: 1200, cooldownS: 600 } })]));
    expect(cont.status === 'selected' && cont.selection.structure.segments.map((s) => s.kind)).toEqual(['warmup', 'steady', 'cooldown']);
  });

  it('dose jamais modifiée : pour toute structure réalisée, la séance rejoue exactement ses durées (propriété)', () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 8 }), fc.integer({ min: 60, max: 600 }), fc.integer({ min: 30, max: 240 }), (reps, workS, recoveryS) => {
      const structure = { reps, workS, recoveryS, recoveryMode: 'jog' as const };
      const o = outcome(disc({}, [threshold({ structure })]));
      if (o.status !== 'selected') return false;
      const seg = o.selection.structure.segments.find((s) => s.kind === 'repeat');
      return seg?.kind === 'repeat' && seg.reps === reps && canonicalStringify(seg.work) === canonicalStringify({ durationS: workS }) && canonicalStringify(seg.recovery.dose) === canonicalStringify({ durationS: recoveryS });
    }), { numRuns: 25, seed: 6_401 });
  });

  it('déterminisme : même entrée ⇒ même sortie ; permutation de l’historique sans effet', () => {
    const h = [threshold(), threshold({ sessionId: 'old', completedAt: daysAgo(20), structure: { ...INTERVALS, reps: 3 } }), threshold({ sessionId: 'e', archetype: 'EASY', structureFamily: 'CONTINUOUS', structure: undefined, completedAt: daysAgo(3) })];
    const a = canonicalStringify(outcome(disc({}, h)));
    expect(canonicalStringify(outcome(disc({}, h)))).toBe(a);
    expect(canonicalStringify(outcome(disc({}, [...h].reverse())))).toBe(a);
  });
});

describe('refus explicites (jamais une séance inventée)', () => {
  it('aucune séance de seuil réalisée : première exposition bloquée (V35 vide)', () => {
    const o = outcome(disc({}, [threshold({ archetype: 'EASY', structureFamily: 'CONTINUOUS', structure: undefined })]));
    expect(o.status).toBe('no_valid');
    expect(o.reasons.map((r) => r.code)).toContain(RUNNING_CODES.FIRST_EXPOSURE_UNRESOLVED);
  });

  it('séance réalisée sans structure enregistrée : STRUCTURE_UNAVAILABLE (NOT_RECORDED), jamais une structure devinée', () => {
    const o = outcome(disc({}, [threshold({ structure: undefined })]));
    expect(o.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.STRUCTURE_UNAVAILABLE, params: { archetype: 'THRESHOLD', cause: 'NOT_RECORDED' } });
  });

  it('famille déclarée incohérente avec la structure (INTERVALS en une répétition) : FAMILY_MISMATCH', () => {
    const o = outcome(disc({}, [threshold({ structure: { reps: 1, workS: 1200 } })]));
    expect(o.reasons.at(-1)?.params.cause).toBe('FAMILY_MISMATCH');
  });

  it('séance plus récente négative (interrompue) : ancre refusée (V19), aucun repli', () => {
    // P-R4 (densité 3 / 7 jours) : seule la règle V19 s'applique.
    const o = outcome(disc({ population: { level: 'P_R4', hybrid: false } }, [threshold(), threshold({ sessionId: 'bad', completedAt: daysAgo(3), completion: 'PARTIAL' })]));
    expect(o.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, params: { cause: 'LATER_NEGATIVE_RESPONSE' } });
  });

  it('structure réalisée plus longue que le temps disponible : TIME_EXCEEDED (jamais raccourcie par Running)', () => {
    const engine = sim();
    const input = captured(engine, disc(), 'running.threshold');
    const o = engine.prescribe({ ...input, intent: { ...input.intent, availableTimeS: 2400 } });
    expect(o.reasons.at(-1)).toMatchObject({ code: RUNNING_CODES.TIME_EXCEEDED, params: { archetype: 'THRESHOLD', availableTimeS: 2400 } });
  });

  it('PRODUCTION réelle : aucune séance de qualité (socle non signé)', () => {
    const o = outcome(disc({ mode: 'PRODUCTION' }), 'running.threshold', createRunningEngine());
    expect(o.status).toBe('no_valid');
    expect(o.candidates.every((c) => c.dose === undefined)).toBe(true);
  });
});

describe('gardes documentées', () => {
  it('§G.3 : P-R1 refusé (P-R2 et plus) ; P-R0 refusé par G1-NOVICE', () => {
    expect(guardRule(outcome(disc({ population: { level: 'P_R1', hybrid: false } })))).toBe('G3_POPULATION');
    expect(outcome(disc({ population: { level: 'P_R0', hybrid: false } })).status).toBe('no_valid');
  });

  it('§K : seuil CONTINU réservé à P-R3+ ou à une confiance ≥ MEDIUM ; le fractionné reste possible en P-R2', () => {
    const cont = [threshold({ structureFamily: 'CONTINUOUS', structure: { reps: 1, workS: 1200 } })];
    expect(guardRule(outcome(disc({}, cont)))).toBe('K_CONTINUOUS_LEVEL');
    expect(outcome(disc({ population: { level: 'P_R3', hybrid: false } }, cont)).status).toBe('selected');
  });

  it('§M : intervalles courts refusés pour un objectif semi ; acceptés pour 10K', () => {
    const h = [threshold({ archetype: 'SHORT_INTERVAL', structure: { reps: 10, workS: 60, recoveryS: 60, recoveryMode: 'jog' } })];
    expect(guardRule(outcome(disc({ goal: { type: 'HALF_MARATHON' } }, h), 'running.short_interval'))).toBe('G3_GOAL');
    expect(outcome(disc({ goal: { type: 'TEN_K' } }, h), 'running.short_interval').status).toBe('selected');
  });

  it('§N : côtes sans côte déclarée refusées ; avec côte déclarée, effort seul', () => {
    const h = [threshold({ archetype: 'HILLS', structure: { reps: 8, workS: 45, recoveryS: 90, recoveryMode: 'walk' } })];
    expect(guardRule(outcome(disc({}, h), 'running.hills'))).toBe('N_TERRAIN_UNDECLARED');
    const ok = outcome(disc({ terrain: { hills: true } }, h), 'running.hills');
    expect(ok.status === 'selected' && ok.selection.structure.segments[0]).toMatchObject({ kind: 'repeat', recovery: { mode: 'walk' }, target: { domain: 'severe', priority: 'effort' } });
  });

  it('V10 : densité de séances à forte demande par population (P-R2 : 2 / 7 jours) ; V11 : jamais la veille d’une séance à forte demande', () => {
    const sev = (id: string, d: number): HistoryIn => threshold({ sessionId: id, archetype: 'SEVERE', completedAt: daysAgo(d), structure: { reps: 5, workS: 180, recoveryS: 180, recoveryMode: 'jog' } });
    expect(outcome(disc({}, [threshold(), sev('s2', 4)])).status).toBe('no_valid');
    expect(guardRule(outcome(disc({}, [threshold(), sev('s2', 4)])))).toBe('V10_DENSITY');
    expect(outcome(disc({}, [threshold(), sev('s2', 9)])).status).toBe('selected');
    expect(guardRule(outcome(disc({ population: { level: 'P_R4', hybrid: false } }, [threshold({ completedAt: daysAgo(1) })])))).toBe('V11_CONSECUTIVE');
    expect(outcome(disc({ population: { level: 'P_R4', hybrid: false } }, [threshold({ completedAt: daysAgo(2) })])).status).toBe('selected');
  });

  it('§X : reprise LONG ⇒ EASY seulement ; MODERATE ⇒ sévère seulement après levée (V25), seuil autorisé', () => {
    const since = { recentLoad: { returnStartedAt: daysAgo(10), dimensions: [] } };
    expect(guardRule(outcome(disc({ returnState: { state: 'LONG', postReturnSessions: 1 }, ...since })))).toBe('X_RETURN_STATE');
    const sevH = [threshold({ sessionId: 'sv', archetype: 'SEVERE', completedAt: daysAgo(3), structure: { reps: 5, workS: 180, recoveryS: 180, recoveryMode: 'jog' } })];
    expect(guardRule(outcome(disc({ returnState: { state: 'MODERATE', postReturnSessions: 1 }, ...since }, sevH), 'running.severe'))).toBe('X_RETURN_NOT_LIFTED');
    const lifted = [...sevH, threshold({ sessionId: 'e1', archetype: 'EASY', structureFamily: 'CONTINUOUS', structure: undefined, completedAt: daysAgo(8) }), threshold({ sessionId: 'e2', archetype: 'EASY', structureFamily: 'CONTINUOUS', structure: undefined, completedAt: daysAgo(6) })];
    expect(outcome(disc({ returnState: { state: 'MODERATE', postReturnSessions: 3 }, ...since }, lifted), 'running.severe').status).toBe('selected');
  });
});

describe('sélection de la famille rejouée', () => {
  // Hors de la fenêtre de densité V10 (7 jours) pour isoler la règle de sélection.
  const cont = threshold({ sessionId: 'c', structureFamily: 'CONTINUOUS', completedAt: daysAgo(12), structure: { reps: 1, workS: 1200 } });
  const intervals = threshold({ completedAt: daysAgo(9) });
  const p3 = { population: { level: 'P_R3', hybrid: false } } as const;

  it('seuil continu ET fractionné réalisés : la famille la plus récente est rejouée (HOLD), tracée', () => {
    const o = outcome(disc(p3, [cont, intervals]));
    expect(o.status === 'selected' && o.selection.candidate.structureFamily).toBe('INTERVALS');
    expect(o.trace.find((t) => t.stage === 'SELECTION')?.decision).toBe('SELECTED:MOST_RECENT_FAMILY');
    const o2 = outcome(disc(p3, [{ ...cont, completedAt: daysAgo(8) }, intervals]));
    expect(o2.status === 'selected' && o2.selection.candidate.structureFamily).toBe('CONTINUOUS');
  });

  it('les deux familles réalisées au même instant : ambiguïté exposée, aucun choix arbitraire', () => {
    const o = outcome(disc(p3, [{ ...cont, completedAt: daysAgo(9) }, intervals]));
    expect(o.status).toBe('no_valid');
    expect(o.reasons[0]).toMatchObject({ code: RUNNING_CODES.FAMILY_AMBIGUOUS, params: { archetype: 'THRESHOLD' } });
  });
});

describe('contrat de structure réalisée', () => {
  it('fractionné sans récupération, continu avec récupération, durées non positives : refusés', () => {
    expect(zRealizedStructure.safeParse({ reps: 4, workS: 300 }).success).toBe(false);
    expect(zRealizedStructure.safeParse({ reps: 1, workS: 1200, recoveryS: 60, recoveryMode: 'jog' }).success).toBe(false);
    expect(zRealizedStructure.safeParse({ reps: 4, workS: 0, recoveryS: 60, recoveryMode: 'jog' }).success).toBe(false);
    expect(zRealizedStructure.safeParse({ reps: 4, workS: 300, recoveryS: 60, recoveryMode: 'jog', distanceM: 1000 }).success).toBe(false);
    expect(zRealizedStructure.safeParse(INTERVALS).success).toBe(true);
  });
});
