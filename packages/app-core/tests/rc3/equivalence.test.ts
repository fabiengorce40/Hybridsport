/**
 * RC3 (préparation) — comparaisons à séances équivalentes : preuve du défaut du scénario RC1 (événements indexés par
 * le rang global) et de sa correction (rang dans le sport), sans changer les simulations publiées.
 */
import { describe, expect, it } from 'vitest';
import { plan, PROFILE, simulate } from '../consolidation/sim4.js';
import { measure } from '../rc2/metrics.js';
import { SCENARIOS, weekEnv } from '../rc2bis/week-env.js';
import type { Layout, Scenario } from '../rc2bis/week-env.js';
import { equivalent, measureRc3, planEquivalent } from './equivalent.js';

const S6 = SCENARIOS.find((x) => x.key === 'S6') as Scenario;
// Organisation RC2 bis qui domine RC1 (profil A, 6 jours) : la 5e séance de la semaine n'y est pas du même sport.
const DOMINANT: Layout = [['running'], ['strength'], ['running'], ['crosstraining'], ['strength'], ['strength'], []];
// Organisation « bas du corps maximal » de RC2 bis : sa 5e séance est une course.
const MAX_LOWER: Layout = [['strength'], ['strength'], ['strength'], ['crosstraining'], ['running'], ['running'], []];
const missedSport = (r: ReturnType<typeof simulate>) => r.sessions.filter((s) => s.execution === 'manquée').map((s) => `S${String(s.week)} ${s.sport}`);

describe('RC3 — équivalence des scénarios 4 semaines', () => {
  it('E-1. DÉFAUT : avec le scénario RC1, une course est manquée ou non selon le placement', () => {
    // Le scénario RC1 manque la séance de RANG 5 en S4 seulement si c'est une course : rien en RC1 (vendredi =
    // Musculation), une course dans l'organisation « bas du corps maximal ».
    expect(missedSport(simulate({ plan }))).toEqual([]);
    expect(missedSport(simulate({ plan, env: weekEnv({ layout: MAX_LOWER, scenario: S6 }) }))).toEqual(['S4 running']);
  });

  it('E-2. CORRECTION : scénario indexé par (semaine, sport, rang) ⇒ mêmes séances, même issue, quel que soit le placement', () => {
    const a = measureRc3(simulate({ plan: planEquivalent, runOutcome: 'modified_duration' }));
    const b = measureRc3(simulate({ plan: planEquivalent, runOutcome: 'modified_duration', env: weekEnv({ layout: DOMINANT, scenario: S6 }) }));
    expect(a.missed).toEqual(['S4 running #2']);
    expect(b.missed).toEqual(a.missed);
    expect(equivalent(a, b)).toEqual({ ok: true, diff: [] });
    const c = measureRc3(simulate({ plan: planEquivalent, runOutcome: 'modified_duration', env: weekEnv({ layout: MAX_LOWER, scenario: S6 }) }));
    expect(equivalent(a, c)).toEqual({ ok: true, diff: [] });
  });

  it('E-3. mesures séparées : prescrit ≥ réalisé, direct et indirect distincts, bilan E1 rappelé à part', () => {
    const m = measureRc3(simulate({ plan: planEquivalent, runOutcome: 'modified_duration' }));
    for (const [g, v] of Object.entries(m.realizedDirect)) expect(v).toBeLessThanOrEqual((m.prescribedDirect[g] ?? 0) + 1e-9);
    expect(Object.keys(m.prescribedIndirect).length).toBeGreaterThan(0);
    expect(Object.keys(m.appE1Planned).length).toBeGreaterThan(0);
    expect(m.violations).toBe(0);
  });

  it('E-4. inertie : la simulation par défaut ne porte aucun champ RC3 et ses mesures RC2 sont inchangées', () => {
    const r = simulate();
    expect(r.sessions.every((s) => s.occ === undefined && s.prescribed === undefined && s.realized === undefined)).toBe(true);
    expect(measure(r).runExecuted).toBe(measure(simulate({ profile: PROFILE })).runExecuted);
  });
});
