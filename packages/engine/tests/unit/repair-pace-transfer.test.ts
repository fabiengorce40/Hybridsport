/**
 * Frontière de sécurité générique : une ALLURE prescrite pour un mouvement n'est JAMAIS transférée à un mouvement
 * substitué par la réparation du CORE (aucune table d'équivalence, aucun coefficient, aucune conversion). Substitution
 * d'un item portant une allure ⇒ refus explicite REPAIR.PACE_TRANSFER_REFUSED. Valeurs : DONNÉES DE TEST.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Prescription, RunSegment, SessionDraft, SessionDraftInput } from '@hybridsport/domain';
import { carriesMovementLoad, carriesMovementPace, repairSession, withDerivedEstimate } from '../../src/index.js';
import { baseContext, deps } from '../fixtures/context.js';
import { session } from '../fixtures/sessions.js';

// technical-constant: TEST_ONLY — distances, durées et allures de test
const PACE = { min: 330, max: 360 };
const d = deps();
const opts = { seed: 'pace-transfer' };
/** « no_running » : la course facile est contre-indiquée ; le catalogue propose le rameur (substitution « restriction »). */
const noRunning = baseContext({ restrictions: ['no_running'] });
const prov = { source: 'reference_derived', sourceId: 'ref.test' } as const;

function runWith(prescription: unknown): SessionDraft {
  return session({
    id: 's.run', discipline: 'running', athleteLevel: 'intermediate', availableTimeS: 3600, targetDurationS: 2400, toleranceProfile: 'mixed',
    blocks: [{ id: 'b.run', kind: 'running', role: 'primary', format: 'continuous', items: [{ id: 'i.run', exerciseId: 'ex.easy_run', prescription: prescription as never }] }],
  } as SessionDraftInput);
}
const structured = (target: unknown, dose: unknown = { distanceM: 3000 }) => withDerivedEstimate({ type: 'run_structure', segments: [{ kind: 'steady', id: 'seg.st', dose, target } as unknown as RunSegment] });

const PACED: Record<string, unknown> = {
  'distance · paceSecPerKm': { type: 'distance', distanceM: 5000, paceSecPerKm: PACE },
  'intervals · paceSecPerKm': { type: 'intervals', reps: 4, work: { distanceM: 400 }, recoveryS: 60, paceSecPerKm: PACE },
  'run_structure · cible pace': structured({ domain: 'severe', pace: { secPerKm: PACE, provenance: prov }, effort: { rpe: { min: 7, max: 8 } }, priority: 'pace' }),
};
const UNPACED: Record<string, unknown> = {
  'distance sans allure': { type: 'distance', distanceM: 5000 },
  'timed': { type: 'timed', workS: 1200, rounds: 1, restS: 0 },
};

describe('carriesMovementPace', () => {
  it.each(Object.entries(PACED))('%s ⇒ allure', (_, p) => expect(carriesMovementPace(p as Prescription)).toBe(true));
  it.each(Object.entries(UNPACED))('%s ⇒ sans allure', (_, p) => expect(carriesMovementPace(p as Prescription)).toBe(false));
  it('run_structure à cibles d’effort seulement ⇒ sans allure', () => {
    expect(carriesMovementPace(structured({ domain: 'easy_low', effort: { rpe: { min: 2, max: 3 } }, priority: 'effort' }, { durationS: 1200 }) as Prescription)).toBe(false);
  });
});

describe('réparation : aucune allure transférée à un substitut', () => {
  it.each(Object.entries(PACED))('%s, course contre-indiquée ⇒ refus PACE_TRANSFER_REFUSED, aucun rameur publié avec une allure de course', (_, p) => {
    const out = repairSession(runWith(p), noRunning, d, opts);
    expect(out.result.status).not.toBe('ok');
    const reasons = out.result.status === 'error' ? out.result.error.reasons : out.result.status === 'rest_recommended' ? out.result.reasons : [];
    expect(reasons.find((r) => r.code === 'REPAIR.PACE_TRANSFER_REFUSED')).toMatchObject({ params: { itemId: 'i.run', exerciseId: 'ex.easy_run', substituteId: 'ex.row_erg' } });
  });

  it('distance SANS allure, course contre-indiquée ⇒ substitution historique conservée (rameur, même distance)', () => {
    const out = repairSession(runWith(UNPACED['distance sans allure']), noRunning, d, opts);
    expect(out.result.status).toBe('ok');
    if (out.result.status === 'ok') expect(out.result.value.blocks[0]?.items[0]).toMatchObject({ exerciseId: 'ex.row_erg', prescription: { type: 'distance', distanceM: 5000 } });
  });

  it('charge ET allure sur le même item : la frontière charge reste prioritaire et inchangée', () => {
    const loadedPaced = { type: 'distance', distanceM: 5000, paceSecPerKm: PACE, load: { kg: 10, certainty: 'prescribed' } };
    expect(carriesMovementLoad(loadedPaced as Prescription) && carriesMovementPace(loadedPaced as Prescription)).toBe(true);
    const out = repairSession(runWith(loadedPaced), noRunning, d, opts);
    expect(out.result.status === 'error' && out.result.error.reasons[0]?.code).toBe('REPAIR.LOAD_TRANSFER_REFUSED');
  });

  it('propriété : une séance publiée ne porte jamais d’allure sur un mouvement substitué', () => {
    fc.assert(fc.property(fc.constantFrom(...Object.values(PACED), ...Object.values(UNPACED)), fc.boolean(), (p, restricted) => {
      const input = runWith(p);
      const out = repairSession(input, restricted ? noRunning : baseContext(), d, opts);
      if (out.result.status !== 'ok') return true;
      return out.result.value.blocks.flatMap((b) => b.items).every((i) => i.exerciseId === 'ex.easy_run' || !carriesMovementPace(i.prescription));
    }), { numRuns: 40, seed: 11 });
  });
});
