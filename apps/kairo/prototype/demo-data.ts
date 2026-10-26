/**
 * REKKA V2 — prototype (lot V2-2) : DONNÉES DE DÉMONSTRATION, inventées pour la maquette. Aucune ne vient du moteur ni
 * d'un état utilisateur ; elles ne sont jamais enregistrées. Chaque écran du prototype l'indique (bandeau « Démonstration »).
 */
import type { SportKey } from '../src/design/SportIcon.js';

export const DEMO_NOTICE = 'Prototype · données de démonstration · non connecté au moteur';

export const athlete = { name: 'Alex' } as const;
export const todayLabel = 'Mardi 27 octobre';

export type DemoState = 'done' | 'today' | 'planned' | 'moved' | 'cancelled';
export const STATE_LABELS: Readonly<Record<DemoState, string>> = { done: 'Réalisée', today: 'Aujourd’hui', planned: 'Prévue', moved: 'Déplacée', cancelled: 'Annulée' };
export const STATE_MARKS: Readonly<Record<DemoState, string>> = { done: '✓', today: '●', planned: '○', moved: '↷', cancelled: '✕' };

export interface DemoSession { readonly id: string; readonly sport: SportKey; readonly title: string; readonly minutes: number; readonly state: DemoState; readonly note?: string }
export interface DemoDay { readonly day: string; readonly date: string; readonly sessions: readonly DemoSession[] }

export const week: readonly DemoDay[] = [
  { day: 'Lun', date: '26', sessions: [{ id: 'd1', sport: 'running', title: 'Endurance fondamentale', minutes: 40, state: 'done' }] },
  { day: 'Mar', date: '27', sessions: [{ id: 'd2', sport: 'strength', title: 'Full Body A', minutes: 47, state: 'today' }] },
  { day: 'Mer', date: '28', sessions: [] },
  { day: 'Jeu', date: '29', sessions: [{ id: 'd4', sport: 'hyrox', title: 'Stations et course', minutes: 50, state: 'planned' }] },
  { day: 'Ven', date: '30', sessions: [{ id: 'd5', sport: 'running', title: 'Fractionné court', minutes: 45, state: 'moved', note: 'déplacée de mercredi (récupération)' }] },
  { day: 'Sam', date: '31', sessions: [{ id: 'd6', sport: 'strength', title: 'Full Body B', minutes: 52, state: 'planned' }] },
  { day: 'Dim', date: '1', sessions: [{ id: 'd7', sport: 'crosstraining', title: 'AMRAP 20 min', minutes: 30, state: 'cancelled', note: 'annulée par l’utilisateur' }] },
];

export interface DemoSet { readonly kind: 'warmup' | 'work' | 'backoff'; readonly reps: number; readonly kg: number }
export interface DemoExercise { readonly id: string; readonly name: string; readonly muscles: readonly string[]; readonly rest: string; readonly sets: readonly DemoSet[]; readonly adapted?: string; readonly illustrative?: string }
export const workout = {
  title: 'Full Body A',
  plannedMin: 47,
  exercises: [
    { id: 'squat', name: 'Squat barre', muscles: ['Quadriceps', 'Fessiers', 'Tronc'], rest: '2:00', sets: [{ kind: 'warmup', reps: 8, kg: 20 }, { kind: 'warmup', reps: 5, kg: 40 }, { kind: 'warmup', reps: 3, kg: 55 }, { kind: 'work', reps: 6, kg: 70 }, { kind: 'work', reps: 6, kg: 70 }, { kind: 'work', reps: 6, kg: 70 }] },
    { id: 'bench', name: 'Développé couché', muscles: ['Pectoraux', 'Épaules', 'Triceps'], rest: '1:45', adapted: 'Adaptée au contrôle avant séance : 4 → 3 séries de travail.', illustrative: 'Retour en charge : exemple visuel (seulement si le moteur le prescrit).', sets: [{ kind: 'warmup', reps: 6, kg: 30 }, { kind: 'work', reps: 8, kg: 50 }, { kind: 'work', reps: 8, kg: 50 }, { kind: 'work', reps: 8, kg: 50 }, { kind: 'backoff', reps: 10, kg: 40 }] },
    { id: 'row', name: 'Rowing machine', muscles: ['Dos', 'Biceps'], rest: '1:30', sets: [{ kind: 'work', reps: 10, kg: 45 }, { kind: 'work', reps: 10, kg: 45 }, { kind: 'work', reps: 10, kg: 45 }] },
  ] satisfies readonly DemoExercise[],
} as const;

export const quests = [
  { id: 'q1', sport: 'strength' as SportKey, title: 'Squat barre : 100 kg', detail: 'Meilleure série confirmée : 72,5 kg × 6', milestones: ['70 kg', '80 kg', '90 kg', '100 kg'], reached: 1 },
  { id: 'q2', sport: 'running' as SportKey, title: '10 km en moins de 50 min', detail: 'Référence actuelle : 51:42', milestones: ['55:00', '52:30', '50:00'], reached: 2 },
] as const;

export const progression = {
  squat: { label: 'Squat barre · charge de travail (kg)', weeks: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'], loads: [60, 62.5, 62.5, 65, 67.5, 67.5, 70, 72.5] },
  records: [
    { sport: 'strength' as SportKey, label: 'Squat barre', value: '72,5 kg × 6', when: 'semaine 8' },
    { sport: 'strength' as SportKey, label: 'Développé couché', value: '52,5 kg × 8', when: 'semaine 7' },
    { sport: 'running' as SportKey, label: 'Test 5 km', value: '24:10', when: 'semaine 6' },
  ],
  // Séances réalisées / prévues par semaine (8 dernières semaines).
  regularity: [[3, 4], [4, 4], [4, 4], [2, 4], [4, 4], [3, 4], [4, 4], [1, 4]] as const,
  badges: [
    { id: 'b1', title: 'Quatre semaines régulières', detail: 'Toutes les séances prévues réalisées 4 semaines de suite', earned: true },
    { id: 'b2', title: 'Premier record', detail: 'Une charge confirmée au-delà de la précédente', earned: true },
    { id: 'b3', title: '50 séances', detail: '38 / 50 réalisées', earned: false },
  ],
} as const;

/** V2-2B — résumé de semaine (démonstration) : séances réalisées / prévues, temps cumulé, régularité, minutes par jour. */
export const weekSummary = {
  sessions: { done: 3, planned: 5 },
  durationLabel: '2 h 14',
  regularity: 86,
  days: [
    { day: 'L', sport: 'running' as SportKey, minutes: 40 },
    { day: 'M', sport: 'strength' as SportKey, minutes: 51 },
    { day: 'M', sport: null, minutes: 0 },
    { day: 'J', sport: 'hyrox' as SportKey, minutes: 0 },
    { day: 'V', sport: 'running' as SportKey, minutes: 0 },
    { day: 'S', sport: 'strength' as SportKey, minutes: 0 },
    { day: 'D', sport: null, minutes: 0 },
  ],
} as const;

/** V2-2B — séries par période (démonstration) : charge de travail au squat (kg). */
export const squatSeries = {
  '4w': { labels: ['S9', 'S10', 'S11', 'S12'], loads: [67.5, 70, 70, 72.5], gain: '+5' },
  '3m': { labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'], loads: [60, 62.5, 62.5, 65, 65, 67.5, 65, 67.5, 67.5, 70, 70, 72.5], gain: '+12,5' },
  '1y': { labels: ['T1', 'T2', 'T3', 'T4'], loads: [50, 57.5, 65, 72.5], gain: '+22,5' },
} as const;
export type Period = keyof typeof squatSeries;

/** V2-2B — profil (démonstration) : objectifs par discipline, disciplines actives. Aucun niveau ni XP. */
export const profileDemo = {
  since: 'octobre 2026',
  goals: [
    { sport: 'strength' as SportKey, title: 'Développer ma force', detail: 'Squat 100 kg' },
    { sport: 'running' as SportKey, title: '10 km en 45 min', detail: 'Référence actuelle 51:42' },
    { sport: 'hyrox' as SportKey, title: 'Sub 1 h 10', detail: 'Première course complète' },
    { sport: 'crosstraining' as SportKey, title: 'Être plus mobile', detail: 'Forme générale' },
  ],
  disciplines: [
    { sport: 'strength' as SportKey, done: 9, planned: 12 },
    { sport: 'running' as SportKey, done: 7, planned: 8 },
    { sport: 'hyrox' as SportKey, done: 2, planned: 4 },
    { sport: 'crosstraining' as SportKey, done: 1, planned: 4 },
  ],
} as const;
