/**
 * Reprise RC5 lot 4 — profils des simulations sur 12 semaines (TEST_ONLY), partagés par le banc et par sa comparaison
 * avant / après (code d'avant le lot 4, rotation Haut / Bas commune).
 */
import { defaultStrengthPersonalization, EQUIPMENT_PRESETS, updateStrengthPersonalization, withStrengthPersonalization } from '../../src/index.js';
import type { ProfileInput, StrengthPersonalization } from '../../src/index.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';

// technical-constant: TEST_ONLY — durée du banc (semaines) et seuil de récupération de la politique (heures)
export const WEEKS = 12;
export const RECOVERY_H = 36;
const eq = (id: string): string[] => [...(EQUIPMENT_PRESETS.find((p) => p.id === id)?.equipment ?? [])];
const FULL = [...new Set([...eq('preset.hybrid_race_gym'), ...eq('preset.full_gym')])];

function profileOf(o: Partial<ProfileInput>, pers: Partial<StrengthPersonalization>): ProfileInput {
  const base: ProfileInput = {
    displayName: '', level: 'intermediate', priorities: ['strength'],
    strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 },
    running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: false }, hyrox: { enabled: false },
    equipment: { presetId: 'preset.full_gym', items: FULL, confirmedAt: '2026-10-04T10:00:00Z' },
    availability: [75, 60, 75, 60, 75, 90, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z', ...o,
  } as ProfileInput;
  return withStrengthPersonalization(base, {
    ...defaultStrengthPersonalization(base), completed: true, outcome: 'muscle', experience: { months: 24, regularSessions: 4, technique: 'confident' }, sessionMinutes: 60, ...pers,
  });
}

export const P1: ProfileSpec = { id: 'L4-1', rirOffset: 1, label: 'Hypertrophie 4× — priorités fessiers, cuisses, abdominaux, 60 min', profile: profileOf({}, {
  priorities: [{ zone: 'glutes', intention: 'volume' }, { zone: 'thighs', intention: 'volume' }, { zone: 'abs', intention: 'strengthen' }], days: [0, 1, 3, 4],
}) };
const P2: ProfileSpec = { id: 'L4-2', rirOffset: 1, label: 'Hybride — Musculation 4× + HYROX 2×, 5 jours disponibles', profile: profileOf({
  priorities: ['strength', 'hyrox'], hyrox: { enabled: true, sessionsPerWeek: 2, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE' },
  availability: [75, 0, 75, 60, 0, 90, 60],
}, { days: [0, 2, 3, 5, 6] }) };
const P3: ProfileSpec = { id: 'L4-3', rirOffset: 1, label: 'Matériel limité — haltères et banc, 2 exercices exclus', profile: profileOf({
  equipment: { presetId: 'preset.dumbbells_only', items: ['dumbbells', 'bench'], confirmedAt: '2026-10-04T10:00:00Z' },
  excludedExercises: ['ex.db_bench_press', 'ex.goblet_squat'],
}, { days: [0, 1, 3, 4] }) };
/** Profil 4 : Full Body 3× pendant 4 semaines, puis 4× (Haut/Bas A/B) décidé par l'utilisateur la veille de la semaine 5. */
const P4_START = profileOf({ strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 } }, { days: [0, 2, 4] });
const P4: ProfileSpec = { id: 'L4-4', rirOffset: 1, label: 'Continuité — Full Body 3× (S1–S4) puis Haut/Bas A/B 4× (S5–S12)', profile: P4_START,
  beforeWeek: (w, s, sunday) => {
    if (w !== 4 || !s.profile) return s;
    const pers = s.profile.strength.personalization as StrengthPersonalization;
    const input = { ...s.profile, strength: { ...s.profile.strength, sessionsPerWeek: 4, personalization: { ...pers, days: [0, 1, 3, 4] } } } as ProfileInput;
    return updateStrengthPersonalization(s, input, sunday);
  } };
/** Profil 5 : S3 deux séances manquées ; S5 première séance commencée, jamais terminée ; S7 jours changés (mardi → mercredi). */
const P5: ProfileSpec = { id: 'L4-5', rirOffset: 1, label: 'Planning perturbé — manquées, commencée non terminée, jours changés', profile: profileOf({}, { days: [0, 1, 3, 4] }),
  disrupt: (w, k) => (w === 2 && (k === 1 || k === 2) ? 'missed' : w === 4 && k === 0 ? 'started' : undefined),
  beforeWeek: (w, s, sunday) => {
    if (w !== 6 || !s.profile) return s;
    const pers = s.profile.strength.personalization as StrengthPersonalization;
    return updateStrengthPersonalization(s, { ...s.profile, strength: { ...s.profile.strength, personalization: { ...pers, days: [0, 2, 3, 4] } } } as ProfileInput, sunday);
  } };
export const SPECS = [P1, P2, P3, P4, P5];
