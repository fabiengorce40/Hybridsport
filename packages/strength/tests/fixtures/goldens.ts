/**
 * Profils GOLDEN S1–S7 (spec strength 08 §24). Entrées complètes et figées ; les valeurs sportives
 * restent celles du ruleset de test (provisoires).
 */
import type { StrengthContextInput } from '../../src/index.js';
import { intent, profile, strengthContext } from './harness.js';
import type { Scenario } from './harness.js';

const DAY = (d: number, h = 8) => `2026-10-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`;
type Exposure = StrengthContextInput['recentExposures'][number];
const exposure = (exerciseId: string, at: string, sets: [number, number, number?][]): Exposure => ({ exerciseId, at, sets: sets.map(([loadKg, reps, rir]) => ({ loadKg, reps, ...(rir !== undefined ? { rir } : {}) })) });

export const GOLDENS: Readonly<Record<string, { title: string; scenario: Scenario }>> = {
  S1: {
    title: 'Débutant, 3 séances / semaine, 45 min, haltères + banc, objectif général',
    scenario: {
      profile: profile('beginner', 'preset.dumbbells_only'),
      intent: intent('str_full_body', 'strength_general', 45),
      context: strengthContext({
        goal: { primary: { goal: 'general' } },
        week: { otherStrengthSessions: [{ intentId: 'intent.w1.d3', archetypeId: 'str_full_body', plannedHardSets: {}, done: false }, { intentId: 'intent.w1.d5', archetypeId: 'str_full_body', plannedHardSets: {}, done: false }], neighbors: [], known: true },
      }),
      seed: 'golden-S1',
    },
  },
  S2: {
    title: 'Intermédiaire, 4 séances / semaine, 60 min, salle complète, hypertrophie (séance haut du corps)',
    scenario: {
      profile: profile('intermediate', 'preset.full_gym'),
      intent: intent('str_upper', 'strength_volume', 60),
      context: strengthContext({
        goal: { primary: { goal: 'hypertrophy' } },
        recentExposures: [
          exposure('ex.bench_press', DAY(1), [[70, 8, 2], [70, 8, 2], [70, 7, 1]]),
          exposure('ex.lat_pulldown', DAY(1), [[55, 10, 2], [55, 10, 2]]),
          exposure('ex.hack_squat', DAY(2), [[100, 10, 2], [100, 9, 1]]),
        ],
        hardSets: { d7: { chest: 3, back: 2, arms: 2, quads: 2, glutes: 1 } },
        week: { otherStrengthSessions: [{ intentId: 'intent.w1.d2', archetypeId: 'str_lower', plannedHardSets: { quads: 7, hamstrings: 6, glutes: 5 }, done: false }, { intentId: 'intent.w1.d4', archetypeId: 'str_upper', plannedHardSets: { chest: 5, back: 6, shoulders: 4, arms: 4 }, done: false }, { intentId: 'intent.w1.d5', archetypeId: 'str_lower', plannedHardSets: { quads: 7, hamstrings: 6, glutes: 5 }, done: false }], neighbors: [], known: true },
      }),
      seed: 'golden-S2',
    },
  },
  S3: {
    title: 'Intermédiaire, 3 musculation + 3 course (10 km) : soutien course, séance clé d’intervalles 20 h après',
    scenario: {
      profile: profile('intermediate', 'preset.commercial_gym'),
      intent: intent('str_support', 'strength_support', 45),
      context: strengthContext({
        goal: { primary: { goal: 'support', supportFor: 'running' } },
        week: { otherStrengthSessions: [], neighbors: [{ discipline: 'running', stimulus: 'run_intervals_vo2', priority: 'key', hoursFromThisSession: 20, demand: { lower_knee: 'high', lower_hip: 'moderate', locomotor_impact: 'high' } }], known: true },
      }),
      seed: 'golden-S3',
    },
  },
  S4: {
    title: 'Intermédiaire, 2 musculation + HYROX : soutien HYROX, séance sled/farmers (grip élevé) 18 h après',
    scenario: {
      profile: profile('intermediate', 'preset.full_gym'),
      intent: intent('str_support', 'strength_support', 50),
      context: strengthContext({
        goal: { primary: { goal: 'support', supportFor: 'hybrid_race' } },
        week: { otherStrengthSessions: [], neighbors: [{ discipline: 'hybrid_race', stimulus: 'hr_station_strength', priority: 'key', hoursFromThisSession: 18, demand: { grip: 'high', lower_knee: 'moderate' } }], known: true },
      }),
      seed: 'golden-S4',
    },
  },
  S5: {
    title: 'Avancé, 4 séances / semaine, 75 min, force + hypertrophie (séance bas du corps lourde)',
    scenario: {
      profile: profile('advanced', 'preset.full_gym'),
      intent: intent('str_lower', 'strength_heavy', 75, { phase: 'phase.intensification', repetitionIntents: [{ kind: 'progression_anchor', trackId: 'track.squat' }, { kind: 'progression_anchor', trackId: 'track.rdl' }] }),
      context: strengthContext({
        tracks: [
          { trackId: 'track.squat', tier: 'anchor', exerciseId: 'ex.back_squat', archetypeId: 'str_lower', slotId: 'lo.main_knee', model: 'autoregulated', status: 'active', openedAt: DAY(1), cycleStartLoadKg: 140, e1rmKg: 165, consecutiveSuccess: 2, consecutiveBelow: 0, consecutiveHolds: 0 },
          { trackId: 'track.rdl', tier: 'anchor', exerciseId: 'ex.romanian_deadlift', archetypeId: 'str_lower', slotId: 'lo.sec_hip', model: 'double_progression', status: 'active', openedAt: DAY(1), repRange: { min: 6, max: 8 }, consecutiveSuccess: 1, consecutiveBelow: 0, consecutiveHolds: 0 },
        ],
        goal: { primary: { goal: 'strength' }, secondary: { goal: 'hypertrophy' } },
        phase: { kind: 'intensification', weekInMesocycle: 2, mesocycleLength: 4 },
        recentExposures: [
          exposure('ex.back_squat', DAY(1), [[140, 5, 2], [140, 5, 2], [140, 5, 1]]),
          exposure('ex.back_squat', DAY(3), [[142.5, 5, 2], [142.5, 5, 1], [142.5, 4, 0]]),
          exposure('ex.romanian_deadlift', DAY(1), [[120, 8, 2], [120, 8, 2]]),
          exposure('ex.leg_curl', DAY(1), [[50, 12, 1], [50, 11, 1]]),
        ],
        hardSets: { d7: { quads: 6, hamstrings: 4, glutes: 5 } },
        week: { otherStrengthSessions: [{ intentId: 'intent.w2.d2', archetypeId: 'str_upper', plannedHardSets: { chest: 8, back: 9, shoulders: 6, arms: 6 }, done: false }], neighbors: [], known: true },
      }),
      seed: 'golden-S5',
    },
  },
  S6: {
    title: '30 minutes seulement, salle complète, intermédiaire, objectif général',
    scenario: {
      profile: profile('intermediate', 'preset.full_gym'),
      intent: intent('str_full_body', 'strength_general', 30),
      context: strengthContext({ goal: { primary: { goal: 'general' } } }),
      seed: 'golden-S6',
    },
  },
  S7: {
    title: 'Machines + poulies + charges libres disponibles, historique biaisé vers les charges libres (hypertrophie, haut du corps)',
    scenario: {
      profile: profile('intermediate', 'preset.full_gym'),
      intent: intent('str_upper', 'strength_volume', 60),
      context: strengthContext({
        goal: { primary: { goal: 'hypertrophy' } },
        recentExposures: [
          exposure('ex.bench_press', DAY(1), [[80, 8, 2], [80, 8, 2]]),
          exposure('ex.db_bench_press', DAY(1), [[30, 10, 2], [30, 10, 2]]),
          exposure('ex.db_row', DAY(1), [[32, 10, 2], [32, 10, 2]]),
          exposure('ex.db_curl', DAY(1), [[14, 12, 1], [14, 12, 1]]),
          exposure('ex.db_lateral_raise', DAY(1), [[10, 15, 1], [10, 14, 1]]),
          exposure('ex.barbell_ohp', DAY(2), [[50, 6, 2], [50, 6, 2]]),
        ],
      }),
      seed: 'golden-S7',
    },
  },
};
