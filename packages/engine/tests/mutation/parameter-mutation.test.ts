import { describe, expect, it } from 'vitest';
import { validateSession, fitDuration } from '../../src/index.js';
import type { LoadedRuleset } from '../../src/index.js';
import { mutateParameter, isMutationDetected } from '../harness/mutation.js';
import { baseContext, deps } from '../fixtures/context.js';
import { testRuleset } from '../fixtures/load.js';
import { testRulesetDocument } from '../fixtures/ruleset.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

const doc = testRulesetDocument();
const original = testRuleset(doc);
const d = deps();

/** Vérification sensible au seuil L1 : 20 h après une demande élevée doit rester INVALID. */
function recoveryGuard(rs: LoadedRuleset): boolean {
  const squat = session(strengthSessionInput({ blocks: [{ id: 'b', kind: 'strength', role: 'primary', format: 'sets', grouping: 'straight', items: [{ id: 'i', exerciseId: 'ex.back_squat', prescription: { type: 'sets', sets: [1, 2, 3, 4, 5].map(() => ({ kind: 'working' as const, reps: 5, restAfterS: 120 })) } }] }] }));
  const recovery = { neighbors: [{ structure: 'lower_knee', level: 'high' as const, hoursBefore: 20 }], items: [{ exerciseId: 'ex.back_squat', doseUnits: 7, intensityBand: 'high' }], enforcement: { dataQuality: 'adequate' as const } };
  return validateSession(squat, baseContext({ recovery }), { ...d, ruleset: rs }).report.status === 'INVALID';
}

describe('mutation de paramètres du ruleset (spec 11 §9)', () => {
  it('muter la matrice L1 (48 h → 12 h) est détecté par le test de récupération', () => {
    const mutated = mutateParameter(doc, 'recovery.minGapMatrix', { high: { high: 12, moderate: 12 }, moderate: { high: 12 } });
    expect(isMutationDetected(recoveryGuard, original, mutated)).toBe(true);
  });

  it('muter la marge de durée est détecté par la garantie p90 ≤ disponible', () => {
    const check = (rs: LoadedRuleset) => fitDuration(session(strengthSessionInput({ availableTimeS: 1950, targetDurationS: 1590 })), d.catalog, rs).status === 'FITS';
    const mutated = mutateParameter(doc, 'duration.defaultTiming', { restOverrunFactor: 1.1, restP90Factor: 3, transitionFactor: 1 });
    expect(isMutationDetected(check, original, mutated)).toBe(true);
  });

  it('une mutation sans effet sur la vérification est signalée comme non couverte', () => {
    const mutated = mutateParameter(doc, 'demand.eccentricLevelBump', 2);
    expect(isMutationDetected(recoveryGuard, original, mutated)).toBe(false);
  });
});
