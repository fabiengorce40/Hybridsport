/**
 * RC3 (préparation) — AUDIT Running : pourquoi le chemin réel Beta 0 ne produit que `running.easy`, y compris pour un
 * objectif 10 km. Tests de CONSTAT (lecture des raisons persistées et des refus du moteur), aucune règle modifiée,
 * aucun archétype activé.
 */
import { describe, expect, it } from 'vitest';
import type { ProposeResult, SportEngine } from '@hybridsport/engine';
import { beta0Environment, createBeta0Programme, emptyState } from '../../src/index.js';
import type { ProfileInput, ProgrammeEnvironment } from '../../src/index.js';
import { at } from '../strength-fixes/sf-fixtures.js';
import { PROFILE, simulate } from '../consolidation/sim4.js';

const MON = '2026-10-05';
const NOW = at(`${MON}T07:30:00.000Z`);
// technical-constant: TEST_ONLY — course déclarée à l'inscription (30 min ; 5,4 km quand la distance est saisie)
const LAST = { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const };
// technical-constant: TEST_ONLY — distance illustrative de la dernière course (m)
const LAST_M = 5400;
const runner = (goal: string, o: { population?: string; sessions?: number; availability?: number[] } = {}): ProfileInput => ({
  ...PROFILE, ...(o.availability ? { availability: o.availability } : {}),
  running: { ...PROFILE.running, goal, ...(o.population ? { population: o.population } : {}), ...(o.sessions ? { sessionsPerWeek: o.sessions } : {}) },
} as ProfileInput);
const SEVEN_DAYS = [75, 60, 75, 60, 75, 90, 90];

/** Raisons de composition Running de la semaine 1 (codes `PLAN.RUNNING.WEEK_*`). */
function weekReasons(p: ProfileInput, lastRun: object = LAST, env?: ProgrammeEnvironment): string[] {
  const s = createBeta0Programme(emptyState(), p, NOW, { lastRun } as never, ...(env ? [env] : []));
  const reqs = s.planner.weeks[MON]?.requests.filter((r) => r.sport === 'running') ?? [];
  return [...new Set(reqs.flatMap((r) => r.reasons.filter((x) => x.code.startsWith('PLAN.RUNNING.WEEK_')).map((x) => `${x.code.replace('PLAN.RUNNING.', '')}:${String(x.params.archetype ?? '')}:${String(x.params.cause ?? '')}`)))];
}
/** Environnement Beta 0 dont le moteur Running est ESPIONNÉ (lecture des refus, sortie inchangée). */
function spied(): { env: ProgrammeEnvironment; refusals: Map<string, Set<string>> } {
  const env = beta0Environment();
  const eng = env.running?.engine as SportEngine<unknown>;
  const refusals = new Map<string, Set<string>>();
  const propose = (i: Parameters<SportEngine<unknown>['propose']>[0]): ProposeResult => {
    const r = eng.propose(i);
    if (r.status === 'no_valid_proposal') {
      const set = refusals.get(i.intent.archetypeId) ?? new Set<string>();
      for (const x of r.reasons.filter((y) => y.severity !== 'warning')) set.add(`${x.code}:${String(x.params.cause ?? '')}`);
      refusals.set(i.intent.archetypeId, set);
    }
    return r;
  };
  return { env: { ...env, running: { ...env.running, engine: { ...eng, propose } } } as ProgrammeEnvironment, refusals };
}
const runTitles = (r: ReturnType<typeof simulate>) => r.sessions.filter((s) => s.sport === 'running').map((s) => `S${String(s.week)}:${s.title}`);

describe('RC3 — audit Running : causes de la semaine « facile seulement »', () => {
  it('R-1. chemin réel (saisie de durée seule, course « modifiée ») : 10 km ⇒ uniquement running.easy sur 4 semaines', () => {
    const titles = runTitles(simulate({ profile: runner('TEN_K') }));
    expect(new Set(titles.map((t) => t.split(':')[1]))).toEqual(new Set(['running.easy']));
    expect(weekReasons(runner('TEN_K'))).toEqual(expect.arrayContaining([
      'WEEK_KEY_FALLBACK:THRESHOLD:RECENT_TEST_REQUIRED', 'WEEK_KEY_FALLBACK:SEVERE:RECENT_TEST_REQUIRED', 'WEEK_KEY_FALLBACK:NONE:NO_KEY_SESSION',
    ]));
  });

  it('R-2. le TEST qui débloquerait la qualité est refusé : aucune allure observée (distance jamais saisie)', () => {
    const { env, refusals } = spied();
    weekReasons(runner('TEN_K'), LAST, env);
    expect([...(refusals.get('running.test') ?? [])]).toContain('DOSE.RUNNING.TEST_REFUSED:OBSERVED_PACE_UNAVAILABLE');
  });

  it('R-3. avec distance saisie et course réalisée comme prescrite : TEST puis séance de seuil (10 km), sans nouvelle règle', () => {
    expect(weekReasons(runner('TEN_K'), { ...LAST, distanceM: LAST_M })).toContain('WEEK_TEST_REPLACES_KEY::FIRST_EXPOSURE:THRESHOLD');
    const titles = runTitles(simulate({ profile: runner('TEN_K'), runOutcome: 'completed_distance' }));
    expect(titles).toEqual(expect.arrayContaining([expect.stringMatching(/running\.test$/), expect.stringMatching(/running\.threshold$/)]));
  });

  it('R-4. course « modifiée » (issue PARTIAL) : même avec distance, aucune allure observée ni dose réalisée ancrable', () => {
    // sim4 historique : completion « modified » ⇒ PARTIAL ; l'allure observée et l'ancre de dose exigent COMPLETED.
    const titles = runTitles(simulate({ profile: runner('TEN_K') }));
    expect(titles.some((t) => t.endsWith('running.test'))).toBe(false);
  });

  it('R-5. sortie longue impossible à initier : aucune dose LONG réalisée et aucune « première exposition » gouvernée', () => {
    const { env, refusals } = spied();
    weekReasons(runner('HALF_MARATHON', { population: 'P_R3', sessions: 3, availability: SEVEN_DAYS }), { ...LAST, distanceM: LAST_M }, env);
    expect([...(refusals.get('running.long') ?? [])]).toContain('DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE:NO_REALIZED_SESSION');
    const titles = runTitles(simulate({ profile: runner('HALF_MARATHON', { population: 'P_R3', sessions: 3, availability: SEVEN_DAYS }), runOutcome: 'completed_distance' }));
    expect(titles.some((t) => t.endsWith('running.long'))).toBe(false);
  });

  it('R-6. RACE_PACE (candidat 10 km) non implémenté : refusé par le moteur', () => {
    const { env, refusals } = spied();
    weekReasons(runner('TEN_K'), LAST, env);
    expect([...(refusals.get('running.race_pace') ?? [])]).toContain('PLAN.RUNNING.PRESCRIPTION_NOT_IMPLEMENTED:');
  });

  it('R-7. 3 courses demandées mais 2 placées (6 jours, 6 autres séances) : la fréquence lue est celle des jours PLACÉS', () => {
    const r = weekReasons(runner('HALF_MARATHON', { population: 'P_R3', sessions: 3 }), { ...LAST, distanceM: LAST_M });
    expect(r).toContain('WEEK_LONG_NOT_PLACED::FREQUENCY_BELOW_THREE');
  });

  it('R-8. objectif « course générale » : la séance clé EST une course facile (table §R), par conception', () => {
    expect(weekReasons(runner('GENERAL_RUNNING'), { ...LAST, distanceM: LAST_M })).toContain('WEEK_SLOT_SELECTED:EASY:');
  });
});
