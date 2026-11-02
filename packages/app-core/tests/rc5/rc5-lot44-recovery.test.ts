/**
 * Reprise RC5 lot 4.4 (chantier A, sécurité) — récupération évaluée sur la séance RÉELLEMENT prescrite.
 * Règle existante inchangée : `recoveryHours` (36 h, politique G2) entre deux séances Musculation de la même région, Full
 * Body chevauchant toujours ; Haut et Bas compatibles. Avant ce lot, la garde ne contrôlait que les séances A/B, et le Full
 * Body seulement à 3 séances ou moins : un Full Body d'une semaine de 4 et les séances Haut / Bas communes d'un profil
 * personnalisé n'étaient PAS contrôlés. Une SONDE de placement (archétype provisoire) n'est jamais contrôlée : seule la
 * séance finale l'est. Profils non personnalisés : comportement historique. Données de test : une exposition « veille »
 * est ajoutée directement (TEST_ONLY), comme au lot 4.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment, createBeta0Programme, emptyState, ensureBeta0Week, proposeHybridWeekAlternatives, previewStrengthWeekReplan, strategyEnvironment } from '../../src/index.js';
import type { AppState, Clock, ProfileInput } from '../../src/index.js';
import { P1, P2, profileOf } from './lot4-profiles.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, hm = '07:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const env = beta0Environment();
const strength = (s: AppState, w: string) => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength');
const yesterday = (s: AppState, slotId: string, exerciseId = 'ex.bench_press'): AppState => ({ ...s, strength: { ...s.strength, exposures: [...s.strength.exposures, { exerciseId, at: '2026-10-11T18:00:00Z' as never, slotId, sets: [{ reps: 8, loadKg: 40 }] as never }] } });
const recoveryRefused = (s: AppState, w: string) => strength(s, w).filter((r) => r.status !== 'planned' && r.reasons.some((x) => x.params.cause === 'strength_recovery_window'));
const mondayArch = (s: AppState, w: string) => strength(s, w).find((r) => r.date === w && r.status === 'planned')?.intent?.archetypeId;
/** Écart minimal (h) entre la veille et chaque séance Musculation planifiée chevauchant la région. */
const overlaps = (a: string, b: string) => a === 'full' || b === 'full' || a === b;
const region = (id = '') => (/^str_upper/.test(id) ? 'upper' : /^str_lower/.test(id) ? 'lower' : 'full');

describe('Full Body (3 séances, profil personnalisé)', () => {
  const fb3 = profileOf({ strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 } } as Partial<ProfileInput>, { days: [0, 2, 4] });
  const base = createBeta0Programme(emptyState(), fb3, at(W1), {});
  for (const [label, slot] of [['Full Body', 'fb.main_knee'], ['Haut', 'ua.main_push_h'], ['Bas', 'la.main_knee']] as const) {
    it(`Full Body le lundi après ${label} la veille (< 36 h) : refusé et signalé ; aucun Full Body placé le lundi`, () => {
      const s = ensureBeta0Week(yesterday(base, slot), at(W2, '06:00'));
      expect(recoveryRefused(s, W2).length).toBeGreaterThan(0);
      expect(mondayArch(s, W2)).toBeUndefined();
    });
  }
});

describe('Hypertrophie 4× A/B (contrôle existant, inchangé)', () => {
  const base = createBeta0Programme(emptyState(), P1.profile, at(W1), {});
  it('Haut A/B après Full Body la veille : refusé ; Bas après Haut : accepté', () => {
    const s = ensureBeta0Week(yesterday(base, 'fb.push_h'), at(W2, '06:00'));
    expect(recoveryRefused(s, W2).length).toBeGreaterThan(0);
    const t = ensureBeta0Week(yesterday(base, 'ua.main_push_h'), at(W2, '06:00'));
    for (const r of strength(t, W2).filter((x) => x.status === 'planned' && x.date === W2)) expect(region(r.intent?.archetypeId)).toBe('lower');
  });
  it('Bas après Full Body la veille : jamais placé le lundi', () => {
    const s = ensureBeta0Week(yesterday(base, 'fb.main_knee', 'ex.back_squat'), at(W2, '06:00'));
    expect(mondayArch(s, W2)).toBeUndefined();
  });
});

describe('Haut / Bas communs (force 4×, profil personnalisé) : désormais contrôlés', () => {
  const force = profileOf({}, { outcome: 'strength', days: [0, 1, 3, 4] });
  const base = createBeta0Programme(emptyState(), force, at(W1), {});
  it('Haut la veille : aucune séance Haut ni Full Body à moins de 36 h ; refus signalé s’il n’y a pas d’alternative', () => {
    const s = ensureBeta0Week(yesterday(base, 'up.main_push_h'), at(W2, '06:00'));
    for (const r of strength(s, W2).filter((x) => x.status === 'planned' && x.date === W2)) expect(overlaps(region(r.intent?.archetypeId), 'upper')).toBe(false);
    for (const r of strength(s, W2).filter((x) => x.status !== 'planned')) expect(r.reasons.length).toBeGreaterThan(0);
  });
  it('semaine sans séance la veille : 4 séances, aucune régression (identique à 4.3 : Haut / Bas alternés)', () => {
    const s = ensureBeta0Week(base, at(W2, '06:00'));
    expect(strength(s, W2).filter((x) => x.status === 'planned')).toHaveLength(4);
  });
});

describe('profil NON personnalisé : comportement historique inchangé (aucun nouveau contrôle)', () => {
  it('Full Body 3× non personnalisé, Full Body la veille : séance du lundi placée comme avant', () => {
    const p = { ...P1.profile, strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 } } as ProfileInput;
    const s0 = createBeta0Programme(emptyState(), p, at(W1), {});
    const s = ensureBeta0Week(yesterday(s0, 'fb.main_knee'), at(W2, '06:00'));
    expect(recoveryRefused(s, W2)).toHaveLength(0);
  });
});

describe('Full Body dans une semaine demandée à 4 séances (stratégie de semaine courte) : contrôlé par le moteur', () => {
  it('stratégie Full Body, Haut fait la veille : le moteur refuse tout Full Body du lundi (avant : placé, < 36 h)', () => {
    const s0 = createBeta0Programme(emptyState(), P1.profile, at(W1), {});
    const s = ensureBeta0Week(yesterday(s0, 'ua.main_push_h'), at(W2, '06:00'));
    const preview = previewStrengthWeekReplan(s, s.profile as ProfileInput, at(W2, '06:00'), strategyEnvironment(env, 'full_body'));
    for (const r of preview.after.requests.filter((x) => x.sport === 'strength' && x.status === 'planned' && x.date === W2)) expect(region(r.intent?.archetypeId)).toBe('lower');
    const props = proposeHybridWeekAlternatives(s, at(W2, '06:00'), env);
    for (const p of props.proposals) expect(p.status).not.toBe('unsafe_recovery');
  });
});

describe('interactions multisport (règles d’interférence existantes, inchangées)', () => {
  it('HYROX puis Bas : interférence évaluée et tracée sur la séance Bas ; aucun refus de récupération Musculation', () => {
    const s = createBeta0Programme(emptyState(), P2.profile, at(W1), {});
    const lower = strength(s, W1).filter((r) => r.status === 'planned' && region(r.intent?.archetypeId) === 'lower');
    expect(lower.length).toBeGreaterThan(0);
    expect(lower.some((r) => r.reasons.some((x) => x.code === 'PLAN.INTERFERENCE_ASSESSED'))).toBe(true);
    expect(recoveryRefused(s, W1)).toHaveLength(0);
  });
  it('Course puis Bas : interférence évaluée et tracée ; 4 séances Musculation placées sur les jours choisis', () => {
    const run = profileOf({ priorities: ['strength', 'running'], running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } } as Partial<ProfileInput>, { days: [0, 1, 3, 4] });
    const s = createBeta0Programme(emptyState(), run, at(W1), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } });
    expect(strength(s, W1).filter((r) => r.status === 'planned')).toHaveLength(4);
    expect(strength(s, W1).some((r) => r.reasons.some((x) => x.code === 'PLAN.INTERFERENCE_ASSESSED'))).toBe(true);
  });
});

describe('disponibilités réduites et replanification après refus', () => {
  it('3 jours consécutifs pour 4 séances : aucune paire de même région à moins de 36 h, séances manquantes signalées', () => {
    const p = profileOf({}, { days: [0, 1, 2] });
    const s = createBeta0Programme(emptyState(), p, at(W1), {});
    const planned = strength(s, W1).filter((r) => r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    for (let i = 1; i < planned.length; i++) {
      const a = planned[i - 1]; const b = planned[i];
      if (a && b && overlaps(region(a.intent?.archetypeId), region(b.intent?.archetypeId))) expect(Date.parse(`${b.date ?? ''}T00:00:00Z`) - Date.parse(`${a.date ?? ''}T00:00:00Z`)).toBeGreaterThanOrEqual(36 * 3_600_000);
    }
    for (const r of strength(s, W1).filter((x) => x.status !== 'planned')) expect(r.reasons.length).toBeGreaterThan(0);
  });
  it('replanification après refus : toute proposition valide respecte la récupération', () => {
    const s0 = createBeta0Programme(emptyState(), profileOf({}, { days: [0, 1, 2, 3, 4] }), at(W1), {});
    const s = ensureBeta0Week(yesterday(s0, 'ua.main_push_h'), at(W2, '06:00'));
    const r = proposeHybridWeekAlternatives(s, at(W2, '06:00'), env);
    for (const p of r.proposals.filter((x) => x.status === 'valid')) expect(p.summary?.minRegionGapH ?? 99).toBeGreaterThanOrEqual(36);
  });
});

describe('cas décisif mesuré au lot 4.3 (12 séances < 36 h) : HYROX intensif, semaine courte Haut / Bas / Full Body', () => {
  it('Full Body le jeudi après Bas A le mercredi (24 h) : REFUSÉ (avant : placé) ; aucune paire de même région < 36 h', async () => {
    const { lot43Specs } = await import('./lot43-bench.js');
    const spec = lot43Specs().find((x) => x.id === 'L43-HYX3');
    if (!spec) throw new Error('profil attendu');
    const s = createBeta0Programme(emptyState(), spec.profile, at(W1), {}, strategyEnvironment(env, 'upper_lower_full'));
    const fb = strength(s, W1).find((r) => r.intent?.archetypeId === 'str_full_body');
    expect(fb?.status).toBe('refused');
    expect(fb?.reasons.some((x) => x.params.cause === 'strength_recovery_window')).toBe(true);
    const planned = strength(s, W1).filter((r) => r.status === 'planned' && r.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    for (let i = 0; i < planned.length; i++) for (let j = i + 1; j < planned.length; j++) {
      const a = planned[i]; const b = planned[j];
      if (a && b && overlaps(region(a.intent?.archetypeId), region(b.intent?.archetypeId))) expect(Date.parse(`${b.date ?? ''}T00:00:00Z`) - Date.parse(`${a.date ?? ''}T00:00:00Z`)).toBeGreaterThanOrEqual(36 * 3_600_000);
    }
  }, 300_000);
});
