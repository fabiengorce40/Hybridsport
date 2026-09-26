import { describe, expect, it } from 'vitest';
import { fromArray, validateSession } from '../../src/index.js';
import type { CorePipelineRequest, SeededRng, ValidationContext } from '../../src/index.js';
import { runLongitudinal } from '../harness/simulation.js';
import type { DriftDetector } from '../harness/simulation.js';
import { coreContext } from '../harness/context.js';
import { PROFILE_GYM, STATE_FRESH, machineVariant, pain } from '../harness/requests.js';
import { presetEquipment, deps } from '../fixtures/context.js';
import { strengthSessionInput } from '../fixtures/sessions.js';

const PRESETS = ['preset.commercial_gym', 'preset.home_equipped', 'preset.dumbbells_only', 'preset.box'];

/** Trajectoire synthétique (PAS un modèle physiologique) : matériel changeant, épisodes de douleur, temps variable. */
function weekRequest(week: number, rng: SeededRng): CorePipelineRequest {
  const preset = PRESETS[rng.nextInt(PRESETS.length)]!;
  const painEpisode = rng.nextInt(10) === 0 ? [pain({ id: `p.${week}`, level: 'P2', bodyAreas: ['knee'] })] : [];
  const available = [1800, 2100, 2700, 3600][rng.nextInt(4)]!;
  return {
    profile: { ...PROFILE_GYM, availableEquipment: presetEquipment(preset) },
    state: { ...STATE_FRESH, activePain: painEpisode },
    candidates: [
      { session: strengthSessionInput({ availableTimeS: available, targetDurationS: available - 360 }), optimization: fromArray([0.8, 0.7, 0.5, 0, 0.5, 0.2]) },
      { session: { ...machineVariant(), availableTimeS: available, targetDurationS: available - 360 }, optimization: fromArray([0.78, 0.6, 0.9, 0, 0.5, 0.4]) },
    ],
  };
}

const detectors: DriftDetector[] = [
  { id: 'ok-results-are-valid', detect: (tl) => tl.flatMap((w) => {
    if (w.outcome.result.status !== 'ok') return [];
    const r = w.request;
    const ctx: ValidationContext = { programStatus: 'active', eligibility: 'eligible', athleteLevel: r.profile.athleteLevel, availableEquipment: r.profile.availableEquipment, restrictions: r.profile.restrictions, areaRestrictions: r.state.activePain.flatMap((p) => p.bodyAreas.map((area) => ({ area, action: 'exclude' as const, painLevel: p.level }))), restrictedMovements: [], excludedExercises: r.profile.excludedExercises, dayAvailable: true };
    return validateSession(w.outcome.result.value, ctx, deps()).report.status === 'INVALID' ? [`semaine ${w.week} : séance publiée invalide`] : [];
  }) },
  { id: 'duration-feasible', detect: (tl) => tl.flatMap((w) => (w.outcome.result.status === 'ok' && w.outcome.result.validation.errors.length > 0 ? [`semaine ${w.week}`] : [])) },
  { id: 'no-unexpected-technical-error', detect: (tl) => tl.flatMap((w) => (w.outcome.result.status === 'error' && w.outcome.result.error.code === 'INVALID_INPUT' ? [`semaine ${w.week} : erreur technique`] : [])) },
];

describe('longitudinal — 52 semaines sur le pipeline CORE (infrastructure)', () => {
  it('aucune dérive détectée et une année entière reproductible', () => {
    const cfg = { weeks: 52, seed: 'longitudinal-1', context: (s: string) => coreContext(s), weekRequest, detectors };
    const a = runLongitudinal(cfg);
    expect(a.timeline).toHaveLength(52);
    expect(a.anomalies).toEqual({ 'ok-results-are-valid': [], 'duration-feasible': [], 'no-unexpected-technical-error': [] });
    expect(runLongitudinal(cfg).fingerprint).toBe(a.fingerprint);
    const statuses = new Set(a.timeline.map((w) => w.outcome.result.status));
    expect(statuses.has('ok')).toBe(true);
  }, 30_000);
});
