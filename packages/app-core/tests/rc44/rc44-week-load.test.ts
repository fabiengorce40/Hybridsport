/**
 * RC4.4 — lots A (chemin Beta 0), B (avertissements du planning), D (déficit de séries après allègement) et E (HYROX au
 * démarrage). Lectures calculées : aucun champ persisté nouveau, aucune séance retirée, aucune redistribution.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  adaptationVolumeDeficit, beta0Environment, createBeta0Programme, emptyState, logFreeRun, regenerateSession, selectBeta0Week, selectProgrammeSession,
  sessionChanges, startProgrammeSession, UNKNOWN_CORE_STATE, weekLoadWarnings,
} from '../../src/index.js';
import type { AppState, Clock, WeekLoadWarning } from '../../src/index.js';
import { MONS, PROFILES, simulate } from '../rc4-audit/rc4-sim.js';
import type { SimOut } from '../rc4-audit/rc4-sim.js';

// Simulations de 1 à 6 semaines par le chemin réel : délai par test élargi.
vi.setConfig({ testTimeout: 300_000 });

const spec = (id: string) => {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};
const ck = (d: string, hm = '08:00'): Clock => ({ today: d, now: `${d}T${hm}:00Z` });
const kind = <K extends WeekLoadWarning['kind']>(w: readonly WeekLoadWarning[], k: K) => w.find((x): x is Extract<WeekLoadWarning, { kind: K }> => x.kind === k);
const env = beta0Environment();
/** Tout ce que le banc observe, sans l'état persisté (qui porte la trace de simulation G5). */
const observed = (r: SimOut) => ({ sessions: r.sessions, weeks: r.weeks, errors: r.errors });

describe('Lot A — placement global G5 sur le chemin Beta 0 (6 semaines)', () => {
  for (const id of ['P1b', 'P2', 'P4', 'P5']) {
    it(`${id} : strictement identique à V0 (G5 désactivé) — calendrier, séances, volumes, courses`, () => {
      expect(observed(simulate(spec(id)))).toEqual(observed(simulate(spec(id), MONS.length, beta0Environment({ globalPlacement: false }))));
    });
  }
  it('P3 : Full Body J/J+1 et jours consécutifs en baisse, aucune séance retirée, Course absente (inchangée)', () => {
    const v0 = simulate(spec('P3'), MONS.length, beta0Environment({ globalPlacement: false }));
    const g5 = simulate(spec('P3'));
    const fb = (r: SimOut) => MONS.reduce((n, mon) => n + (kind(weekLoadWarnings(r.state, mon), 'full_body_consecutive')?.pairs.length ?? 0), 0);
    expect(fb(g5)).toBeLessThan(fb(v0));
    expect(g5.sessions.filter((x) => x.placement === 'planned')).toHaveLength(v0.sessions.filter((x) => x.placement === 'planned').length);
    const moved = Object.values(g5.state.planner.weeks).flatMap((w) => w.requests).flatMap((r) => r.reasons).filter((x) => x.code === 'PLAN.PLANNER.GLOBAL_PLACEMENT_APPLIED');
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.every((x) => Number(x.params.fullBodyAfter) < Number(x.params.fullBodyBefore))).toBe(true);
  });
});

describe('Lot B — avertissements du planning', () => {
  it('P5 (quatre sports) : semaine à 7 jours d’entraînement, plus longue suite, conflits multisports non résolus', () => {
    const r = simulate(spec('P5'), 2);
    const w = weekLoadWarnings(r.state, MONS[1]);
    expect(kind(w, 'seven_days')?.days).toBe(7);
    // Suite de la semaine précédente comprise (7/7 la semaine 1 aussi).
    const c = kind(w, 'consecutive');
    expect(c?.days).toBeGreaterThan(7);
    expect(c?.acrossWeeks).toBe(true);
    expect(c?.to).toBe('2026-10-18');
    expect(kind(w, 'multisport_conflict')?.items.length).toBeGreaterThan(0);
  });
  it('P2 : Full Body à J/J+1 non évitable signalé, avec « aucun meilleur placement trouvé »', () => {
    const r = simulate(spec('P2'), 2);
    const fb = kind(weekLoadWarnings(r.state, MONS[1]), 'full_body_consecutive');
    expect(fb?.pairs).toHaveLength(1);
    expect(fb?.noBetterPlacement).toBe(true);
    // G5 désactivé : même paire, sans le motif « gardé » (rien n'a été recherché).
    const v0 = simulate(spec('P2'), 2, beta0Environment({ globalPlacement: false }));
    expect(kind(weekLoadWarnings(v0.state, MONS[1]), 'full_body_consecutive')).toEqual({ ...fb, noBetterPlacement: false });
  });
  it('course libre RÉALISÉE un jour de repos : compte comme jour d’entraînement ; la course d’onboarding (sans date) jamais', () => {
    let s: AppState = createBeta0Programme(emptyState(), spec('P2').profile, ck(MONS[0], '07:00'), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }, env);
    const before = weekLoadWarnings(s, MONS[0]);
    const planned = new Set((selectBeta0Week(s, MONS[0])?.sessions ?? []).filter((x) => x.placement === 'planned').map((x) => x.date));
    const rest = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'].filter((d) => !planned.has(d));
    expect(rest.length).toBeGreaterThan(0);
    expect(kind(before, 'seven_days')).toBeUndefined();
    for (const d of rest) s = logFreeRun(s, { realizedDurationS: 1800, distanceM: 5000, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, startedAt: `${d}T09:00:00Z` }, ck(d, '20:00'));
    const after = kind(weekLoadWarnings(s, MONS[0]), 'seven_days');
    expect(after).toEqual({ kind: 'seven_days', days: 7, freeRuns: rest.length });
    // Aucune séance retirée par l'avertissement.
    expect((selectBeta0Week(s, MONS[0])?.sessions ?? []).filter((x) => x.placement === 'planned')).toHaveLength(planned.size);
  });
  it('semaine inconnue : aucun avertissement', () => {
    expect(weekLoadWarnings(emptyState(), MONS[0])).toEqual([]);
  });
});

describe('Lot D — déficit de séries après un allègement au démarrage', () => {
  const s0 = createBeta0Programme(emptyState(), spec('P2').profile, ck(MONS[0], '07:00'), {}, env);
  const strength = (selectBeta0Week(s0, MONS[0])?.sessions ?? []).filter((x) => x.sport === 'strength' && x.placement === 'planned' && x.date);
  it('douleur genou P2 : groupes et séries retirées (fonction du moteur Musculation), aucune redistribution', () => {
    const v = strength[0];
    if (!v?.date) throw new Error('séance attendue');
    const s = startProgrammeSession(s0, ck(v.date), v.requestId, env, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' });
    const d = adaptationVolumeDeficit(s, v.requestId);
    expect(s.programmeLogs[v.requestId]?.adaptation).toBeDefined();
    expect(d).not.toBeNull();
    expect(d?.length).toBeGreaterThan(0);
    for (const x of d ?? []) {
      expect(x.deficit).toBe(x.planned - x.adapted);
      expect(x.deficit).toBeGreaterThan(0);
    }
    expect(d?.map((x) => x.group)).toContain('quads');
    // Aucune autre séance modifiée (pas de redistribution).
    for (const o of strength.slice(1)) expect(selectProgrammeSession(s, o.requestId)?.session).toEqual(selectProgrammeSession(s0, o.requestId)?.session);
  });
  it('séance non allégée, inconnue ou d’un autre sport : aucun déficit (null), jamais un déficit fictif', () => {
    const v = strength[0];
    if (!v?.date) throw new Error('séance attendue');
    const s = startProgrammeSession(s0, ck(v.date), v.requestId, env, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    expect(adaptationVolumeDeficit(s, v.requestId)).toBeNull();
    expect(adaptationVolumeDeficit(s0, 'inconnue')).toBeNull();
    const ct = (selectBeta0Week(s0, MONS[0])?.sessions ?? []).find((x) => x.sport === 'crosstraining' && x.placement === 'planned' && x.date);
    if (!ct?.date) throw new Error('séance CT attendue');
    const s2 = startProgrammeSession(s0, ck(ct.date), ct.requestId, env, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' });
    expect(adaptationVolumeDeficit(s2, ct.requestId)).toBeNull();
  });
});

describe('Lot E — HYROX au démarrage : régénération fidèle avec la station du programme', () => {
  for (const id of ['P3', 'P4']) {
    it(`${id} : chaque séance HYROX planifiée est régénérée À L’IDENTIQUE (état inconnu)`, () => {
      const s = createBeta0Programme(emptyState(), spec(id).profile, ck(MONS[0], '07:00'), {}, env);
      const hx = (selectBeta0Week(s, MONS[0])?.sessions ?? []).filter((x) => x.sport === 'hyrox' && x.placement === 'planned');
      expect(hx.length).toBeGreaterThan(0);
      for (const v of hx) {
        const r = regenerateSession(s, v.requestId, UNKNOWN_CORE_STATE, env);
        expect(r.status).toBe('planned');
        if (r.status !== 'planned') continue;
        expect(sessionChanges(selectProgrammeSession(s, v.requestId)?.session as never, r.record.session)).toEqual([]);
      }
    });
  }
  it('douleur au démarrage : jamais « inchangée » si une zone exclue est sollicitée (adaptée ou reportée), sécurité inchangée', () => {
    const s0 = createBeta0Programme(emptyState(), spec('P3').profile, ck(MONS[0], '07:00'), {}, env);
    const v = (selectBeta0Week(s0, MONS[0])?.sessions ?? []).find((x) => x.sport === 'hyrox' && x.placement === 'planned' && x.date);
    if (!v?.date) throw new Error('séance HYROX attendue');
    const s = startProgrammeSession(s0, ck(v.date), v.requestId, env, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' });
    const codes = s.checkIns.flatMap((c) => c.reasons?.map((x) => x.code) ?? []);
    const adapted = s.programmeLogs[v.requestId]?.adaptation !== undefined;
    const postponed = codes.includes('KAIRO.CHECKIN_SESSION_NOT_ADAPTABLE');
    expect(adapted || postponed).toBe(true);
    expect(codes).not.toContain('KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED');
  });
});
