/**
 * Parcours complet V0 : onboarding → planning → séance réelle → exécution → feedback → adaptation,
 * refus corrects (aucune séance factice), autorité provisoire / simulation, pause douleur, déterminisme.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify } from '@hybridsport/engine';
import {
  clearPain, completeOnboarding, emptyState, ensureCurrentWeek, finishSession, logFreeRun, recordRun, recordSet, startSession, togglePainItem, updateProfile, weekStartOf,
} from '../src/index.js';
import type { AppState, GeneratedSession } from '../src/index.js';
import { clock, MONDAY, profile, runner } from './fixtures.js';

const onboard = (o = {}) => completeOnboarding(emptyState(), profile(o), clock());
const weekSessions = (s: AppState) => (s.plans[weekStartOf(MONDAY)]?.entries ?? []).map((e) => s.sessions[e.key] as GeneratedSession);
const okSession = (g: GeneratedSession | undefined) => (g?.outcome.status === 'ok' ? g.outcome.session : undefined);

/** Réalise toutes les séries de travail d'une séance Strength (reps = haut de la cible, charge et RIR saisis). */
function doAllSets(s0: AppState, key: string, loadKg = 40, rir = 2): AppState {
  let s = startSession(s0, key, clock(key.slice(0, 10), '18:00:00'));
  const session = okSession(s.sessions[key]);
  for (const it of session?.blocks.flatMap((b) => b.items) ?? []) {
    if (it.prescription.type !== 'sets') continue;
    it.prescription.sets.forEach((set, i) => {
      const reps = typeof set.reps === 'number' ? set.reps : set.reps.max;
      s = recordSet(s, key, { itemId: it.id, setIndex: i, done: true, reps, loadKg, rir });
    });
  }
  return s;
}

describe('Strength : séances réelles, provisoires', () => {
  const s = onboard();
  const sessions = weekSessions(s);

  it('chaque séance planifiée est générée par le moteur Strength, marquée PROVISOIRE, jamais vide', () => {
    expect(sessions).toHaveLength(3);
    for (const g of sessions) {
      expect(g.authority).toBe('provisional');
      expect(g.contentOrigin).toBe('fixtures:strength-lock-0.4.0');
      const d = okSession(g);
      expect(d?.blocks.length).toBeGreaterThan(1);
      expect(d?.blocks.flatMap((b) => b.items).every((i) => i.exerciseId.startsWith('ex.'))).toBe(true);
    }
  });

  it('temps disponible du jour et durée cible transmis au CORE (T = A − marge du ruleset)', () => {
    const d = okSession(sessions[0]);
    expect(d?.availableTimeS).toBe(3600);
    expect(d?.targetDurationS).toBe(3240);
    // Estimation du CORE conservée pour l'affichage : p90 ≤ temps disponible (contrainte HARD du CORE).
    const est = sessions[0]?.outcome.status === 'ok' ? sessions[0].outcome.estimate : undefined;
    expect(est?.p90S).toBeLessThanOrEqual(3600);
    expect(est?.p50S).toBeGreaterThan(0);
  });

  it('première séance sans historique : calibration à l’effort (aucune charge inventée)', () => {
    const items = okSession(sessions[0])?.blocks.flatMap((b) => b.items) ?? [];
    const sets = items.flatMap((i) => (i.prescription.type === 'sets' ? i.prescription.sets : []));
    expect(sets.some((x) => x.intensity?.mode === 'load')).toBe(false);
    expect(items.filter((i) => i.refs?.prescriptionSource).every((i) => i.refs?.prescriptionSource === 'calibration')).toBe(true);
  });

  it('déterminisme : même profil, même horloge ⇒ même état, octet pour octet', () => {
    expect(canonicalStringify(onboard())).toBe(canonicalStringify(s));
  });
});

describe('exécution, feedback, adaptation', () => {
  const s0 = onboard();
  const [first, second] = weekSessions(s0);
  const key = first!.key;

  it('séance non commencée : aucune saisie possible ; séance inconnue refusée', () => {
    expect(() => recordSet(s0, key, { itemId: 'x', setIndex: 0, done: true })).toThrow('SESSION_NOT_STARTED');
    expect(() => startSession(s0, 'nope', clock())).toThrow('SESSION_UNKNOWN');
  });

  it('séries cochées, fin de séance, feedback : historique, tracks créées par le moteur, séances suivantes régénérées', () => {
    let s = doAllSets(s0, key);
    expect(() => recordSet(s, key, { itemId: 'inconnu', setIndex: 0, done: true })).toThrow('SET_UNKNOWN');
    s = finishSession(s, key, { difficulty: 'AS_EXPECTED', pain: false, painAreas: [], note: '' }, clock(MONDAY, '19:00:00'));
    expect(s.logs[key]?.finishedAt).toBe('2026-10-05T19:00:00Z');
    expect(s.revision).toBe(1);
    expect(s.strength.exposures.length).toBeGreaterThan(0);
    expect(s.strength.tracks.filter((t) => t.tier === 'anchor').length).toBeGreaterThan(0);
    expect(s.fingerprints.strength).toHaveLength(1);
    // La séance suivante (non commencée) a été régénérée avec l'historique : ancres déclarées, charges issues du réalisé.
    const next = s.sessions[second!.key];
    expect(next?.basedOnRevision).toBe(1);
    const items = okSession(next)?.blocks.flatMap((b) => b.items) ?? [];
    expect(items.some((i) => i.refs?.anchor === 'declared')).toBe(true);
    expect(items.some((i) => i.prescription.type === 'sets' && i.prescription.sets.some((x) => x.intensity?.mode === 'load'))).toBe(true);
    // La séance terminée n'est jamais régénérée ni modifiée.
    expect(s.sessions[key]).toEqual(s0.sessions[key]);
    expect(() => recordSet(s, key, { itemId: 'x', setIndex: 0, done: true })).toThrow('SESSION_FINISHED');
  });

  it('modification du profil : séance commencée conservée, jamais dupliquée', () => {
    let s = doAllSets(s0, key);
    s = updateProfile(s, profile({ availability: [60, 60, 60, 60, 0, 0, 0] }), clock());
    const entries = s.plans[weekStartOf(MONDAY)]?.entries ?? [];
    expect(entries.filter((e) => e.key === key)).toHaveLength(1);
    expect(s.sessions[key]).toEqual(s0.sessions[key]);
    expect(new Set(entries.map((e) => e.date)).size).toBe(entries.length);
    expect(Object.keys(s.sessions).every((k) => entries.some((e) => e.key === k))).toBe(true);
  });
});

describe('douleur : pause de sécurité (aucune règle G1 validée)', () => {
  it('douleur signalée ⇒ TOUTES les séances suivantes suspendues, raison exposée ; levée explicite ⇒ séances restaurées', () => {
    const s0 = onboard();
    const [first, second] = weekSessions(s0);
    let s = doAllSets(s0, first!.key);
    const painful = okSession(first)!.blocks[1]!.items[0]!;
    s = togglePainItem(s, first!.key, painful.id);
    s = finishSession(s, first!.key, { difficulty: 'HARDER', pain: true, painAreas: ['knee'], note: '' }, clock(MONDAY, '19:00:00'));
    expect(s.safety.activePain?.areas).toEqual(['knee']);
    const paused = s.sessions[second!.key];
    expect(paused?.outcome).toEqual({ status: 'unavailable', reasons: [{ code: 'KAIRO.SAFETY_PAUSE_ACTIVE_PAIN', params: { reportedAt: '2026-10-05T19:00:00Z' } }] });
    expect(() => startSession(s, second!.key, clock())).toThrow('SESSION_UNAVAILABLE');
    // Un exercice signalé douloureux ne devient jamais une référence de progression (aucune track créée).
    expect(s.strength.tracks.some((t) => t.exerciseId === painful.exerciseId)).toBe(false);
    expect(s.strength.tracks.length).toBeGreaterThan(0);
    s = clearPain(s, clock(MONDAY, '20:00:00'));
    expect(okSession(s.sessions[second!.key])).toBeDefined();
  });
});

describe('Running : simulation, refus exacts', () => {
  it('sans course réalisée : aucune dose (V33 non validé), raison exposée — jamais une séance par défaut', () => {
    const s = onboard(runner());
    const gs = weekSessions(s);
    expect(gs.length).toBeGreaterThan(0);
    for (const g of gs) {
      expect(g.authority).toBe('simulation');
      expect(g.outcome.status).toBe('unavailable');
      expect(g.outcome.status === 'unavailable' && g.outcome.reasons.some((r) => r.code === 'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE')).toBe(true);
    }
  });

  it('course libre enregistrée ⇒ séance EASY SIMULÉE à la même durée (jamais augmentée), effort seul, sans allure', () => {
    let s = onboard(runner());
    s = logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock(MONDAY, '06:00:00'));
    const g = weekSessions(s)[0];
    const d = okSession(g);
    expect(g?.authority).toBe('simulation');
    const seg = d?.blocks[0]?.items[0]?.prescription;
    expect(seg?.type).toBe('run_structure');
    if (seg?.type !== 'run_structure') return;
    const first = seg.segments[0];
    expect(first?.kind === 'steady' && first.dose).toEqual({ durationS: 1800 });
    expect(first?.kind === 'steady' && first.target.pace).toBeUndefined();
    expect(first?.kind === 'steady' && first.target.effort).toEqual({ rpe: { min: 3, max: 3 } });
  });

  it('course + musculation (P-HYBRID) : refus du moteur, même avec une course réalisée', () => {
    let s = onboard({ running: runner().running, priorities: ['running', 'strength'] });
    s = logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock(MONDAY, '06:00:00'));
    const runs = weekSessions(s).filter((g) => g.sport === 'running');
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((g) => g.outcome.status === 'unavailable' && g.outcome.reasons.some((r) => r.code === 'SCOPE.RUNNING.HYBRID_PLANNER_UNAVAILABLE'))).toBe(true);
  });

  it('débutant P-R0 : refus (entrée novice non validée)', () => {
    let s = onboard(runner({ population: 'P_R0' }));
    s = logFreeRun(s, { realizedDurationS: 1200, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock(MONDAY, '06:00:00'));
    expect(weekSessions(s).every((g) => g.outcome.status === 'unavailable' && g.outcome.reasons.some((r) => r.code === 'SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED'))).toBe(true);
  });

  it('séance de course réalisée : durée déclarée obligatoire, ajoutée à l’historique réalisé', () => {
    let s = onboard(runner());
    s = logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock(MONDAY, '06:00:00'));
    const key = weekSessions(s)[0]!.key;
    s = startSession(s, key, clock(MONDAY, '18:00:00'));
    expect(() => finishSession(s, key, { difficulty: 'AS_EXPECTED', pain: false, painAreas: [], note: '' }, clock(MONDAY, '19:00:00'))).toThrow('RUN_DURATION_REQUIRED');
    s = recordRun(s, key, { realizedDurationS: 1500, completion: 'COMPLETED' });
    s = finishSession(s, key, { difficulty: 'EASIER', pain: false, painAreas: [], note: '' }, clock(MONDAY, '19:00:00'));
    expect(s.running.realized.map((r) => r.realizedDurationS)).toEqual([1800, 1500]);
    // Séance suivante : dernière dose réalisée (1500 s), jamais augmentée vers le temps disponible.
    const next = weekSessions(s).find((g) => g.key !== key);
    const p = okSession(next)?.blocks[0]?.items[0]?.prescription;
    const seg = p?.type === 'run_structure' ? p.segments[0] : undefined;
    expect(seg?.kind === 'steady' && seg.dose).toEqual({ durationS: 1500 });
  });
});

describe('ouverture de l’application', () => {
  it('semaine suivante : planifiée à l’ouverture ; semaine en cours : rien n’est modifié sans changement', () => {
    const s = onboard();
    expect(ensureCurrentWeek(s, clock())).toEqual(s);
    const next = ensureCurrentWeek(s, clock('2026-10-12'));
    expect(next.plans['2026-10-12']?.entries.length).toBe(3);
    expect(next.plans[MONDAY]).toEqual(s.plans[MONDAY]);
  });

  it('aucun sport sélectionné : onboarding refusé', () => {
    expect(() => onboard({ strength: { enabled: false, goal: 'general', sessionsPerWeek: 1 } })).toThrow('NO_SPORT_SELECTED');
  });
});
