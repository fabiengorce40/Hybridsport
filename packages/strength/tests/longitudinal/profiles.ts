/**
 * Profils des simulations longitudinales (planification minimale de test).
 */
import type { SimProfile } from './simulator.js';

const meso = (w: number, intensify = false) => {
  const k = (w % 4) + 1;
  return { kind: k === 4 ? 'deload' as const : intensify && k === 3 ? 'intensification' as const : 'accumulation' as const, weekInMesocycle: k, mesocycleLength: 4 };
};

export const PROFILES: SimProfile[] = [
  {
    name: 'P1 débutant, salle complète, général, 3 × corps entier 45 min (douleur semaine 6)', level: 'beginner', preset: 'preset.full_gym', goal: { primary: { goal: 'general' } },
    plan: () => [0, 2, 4].map((day) => ({ day, archetype: 'str_full_body', stimulus: 'strength_general', minutes: 45 })),
    phase: (w) => meso(w), painAt: { week: 6, session: 1, weeks: 1 },
  },
  {
    name: 'P2 intermédiaire, salle complète, hypertrophie, 4 × haut / bas 60 min (banc indisponible semaines 10–11)', level: 'intermediate', preset: 'preset.full_gym', goal: { primary: { goal: 'hypertrophy' } },
    plan: () => [
      { day: 0, archetype: 'str_upper', stimulus: 'strength_volume', minutes: 60 }, { day: 1, archetype: 'str_lower', stimulus: 'strength_volume', minutes: 60 },
      { day: 3, archetype: 'str_upper', stimulus: 'strength_volume', minutes: 60 }, { day: 4, archetype: 'str_lower', stimulus: 'strength_volume', minutes: 60 },
    ],
    phase: (w) => meso(w), equipmentOut: { fromWeek: 10, toWeek: 11, exercises: ['ex.bench_press'] },
  },
  {
    name: 'P3 avancé, salle complète, force, 4 × haut / bas lourd 75 min (2 séances manquées semaine 20)', level: 'advanced', preset: 'preset.full_gym', goal: { primary: { goal: 'strength' } },
    plan: () => [
      { day: 0, archetype: 'str_lower', stimulus: 'strength_heavy', minutes: 75 }, { day: 1, archetype: 'str_upper', stimulus: 'strength_heavy', minutes: 75 },
      { day: 3, archetype: 'str_lower', stimulus: 'strength_heavy', minutes: 75 }, { day: 4, archetype: 'str_upper', stimulus: 'strength_heavy', minutes: 75 },
    ],
    phase: (w) => meso(w, true), missed: [{ week: 20, session: 0 }, { week: 20, session: 2 }],
  },
  {
    name: 'P4 coureur intermédiaire (10 km), salle commerciale, soutien course, 2 × 45 min, intervalles clés le lendemain de la 1re', level: 'intermediate', preset: 'preset.commercial_gym', goal: { primary: { goal: 'support', supportFor: 'running' } },
    plan: () => [
      { day: 0, archetype: 'str_support', stimulus: 'strength_support', minutes: 45, neighbors: [{ discipline: 'running', stimulus: 'run_intervals_vo2', priority: 'key', hoursFromThisSession: 20, demand: { lower_knee: 'high', locomotor_impact: 'high' } }] },
      { day: 3, archetype: 'str_support', stimulus: 'strength_support', minutes: 45, neighbors: [{ discipline: 'running', stimulus: 'run_long', priority: 'key', hoursFromThisSession: 48, demand: { lower_knee: 'moderate' } }] },
    ],
    phase: (w) => meso(w), weekUnknown: [7, 8],
  },
  {
    name: 'P5 novice, haltères + banc à domicile, général, 2 × corps entier 40 min', level: 'novice', preset: 'preset.dumbbells_only', goal: { primary: { goal: 'general' } },
    plan: () => [0, 3].map((day) => ({ day, archetype: 'str_full_body', stimulus: 'strength_general', minutes: 40 })),
    phase: (w) => meso(w),
  },
];

