/**
 * RC2 bis — non-régression et garanties : la capacité d'étude `studyPins` (organisation imposée, journée double) est
 * ABSENTE de l'application et INERTE quand elle n'impose rien ; RC1 reste identique au rapport RC2 ; une journée
 * double n'existe que si sa part est EXPLICITE, ne fusionne jamais deux séances et ne retire jamais d'exercice pour
 * tenir dans le temps (une séance trop longue est REFUSÉE, tracée).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beta0Environment, regenerateSession, selectBeta0Week, selectProgrammeSession, UNKNOWN_CORE_STATE } from '../../src/index.js';
import type { ProgrammeEnvironment } from '../../src/index.js';
import { create } from '../strength-fixes/sf-fixtures.js';
import { PROFILE, simulate } from '../consolidation/sim4.js';
import { measure } from '../rc2/metrics.js';
import { RUN_SHARE_MIN, SCENARIOS, weekEnv } from './week-env.js';
import type { Layout, Scenario } from './week-env.js';
import { measureWeek } from './week-metrics.js';

const MON = '2026-10-05';
const NOW = `${MON}T07:30:00.000Z`;
const S6D = SCENARIOS.find((x) => x.key === 'S6D') as Scenario;
const S6DX = SCENARIOS.find((x) => x.key === 'S6Dx') as Scenario;
const weekOf = (env?: ProgrammeEnvironment) => JSON.stringify(create(PROFILE, NOW, env).planner.weeks[MON]);
const withPins = (pins: ReturnType<NonNullable<ProgrammeEnvironment['studyPins']>>): ProgrammeEnvironment => ({ ...beta0Environment(), studyPins: () => pins });
// Organisation d'étude : course + Musculation le mercredi (journée double explicite), course + Cross-training le samedi.
const DOUBLE: Layout = [['strength'], ['strength'], ['running', 'strength'], [], [], ['running', 'crosstraining'], []];
const id = (s: string, k: number) => `${MON}.${s}.${String(k)}`;

describe('RC2 bis — capacité d’étude inerte, RC1 préservé', () => {
  it('I-1. l’environnement de l’application ne fournit aucune organisation imposée', () => {
    expect(beta0Environment().studyPins).toBeUndefined();
  });

  it('I-2. organisation absente (undefined) ou vide = semaine RC1 à l’identique', () => {
    const ref = weekOf();
    expect(weekOf(withPins(undefined))).toBe(ref);
    expect(weekOf(withPins([]))).toBe(ref);
  });

  it('I-3. RC1 sur 4 semaines identique aux mesures publiées par l’étude RC2 (aucune dérive)', () => {
    const published = JSON.parse(readFileSync(new URL('../rc2/__reports__/rc2-study.json', import.meta.url), 'utf8')) as Record<string, Record<string, unknown>>;
    expect(JSON.parse(JSON.stringify(measure(simulate())))).toEqual(published.A?.RC1);
  });

  it('I-4. une organisation imposée identique au placement RC1 reproduit les mêmes jours', () => {
    const view = selectBeta0Week(create(PROFILE, NOW), MON)?.sessions ?? [];
    const pins = view.filter((v) => v.date).map((v) => ({ requestId: v.requestId, date: v.date as string }));
    const pinned = selectBeta0Week(create(PROFILE, NOW, withPins(pins)), MON)?.sessions ?? [];
    expect(pinned.map((v) => [v.requestId, v.date])).toEqual(view.map((v) => [v.requestId, v.date]));
  });
});

describe('RC2 bis — séances combinées : contraintes explicites, jamais de fusion ni de retrait', () => {
  it('C-1. sans part explicite, une seconde séance n’est JAMAIS placée sur un jour déjà occupé (non placée, tracée)', () => {
    const s = create(PROFILE, NOW, withPins([{ requestId: id('strength', 1), date: '2026-10-07' }, { requestId: id('running', 1), date: '2026-10-07' }]));
    const r = s.planner.weeks[MON]?.requests.find((x) => x.requestId === id('running', 1));
    expect(r?.status).toBe('unplaced');
    expect(r?.category).toBe('slot_unavailable');
    expect(s.planner.weeks[MON]?.requests.filter((x) => x.status === 'planned' && x.date === '2026-10-07')).toHaveLength(1);
  });

  it('C-0. règle G4 actuelle : une journée double explicite reste REFUSÉE pour la seconde séance (conflit d’interférence tracé, jamais fusionnée)', () => {
    const s = create({ ...PROFILE, availability: [...S6D.availability] }, NOW, weekEnv({ layout: DOUBLE, scenario: S6D }));
    const wed = s.planner.weeks[MON]?.requests.filter((x) => x.requestId.includes('.strength.') || x.requestId.includes('.running.')).filter((x) => x.date === '2026-10-07' || x.status !== 'planned') ?? [];
    expect(wed.filter((x) => x.status === 'planned')).toHaveLength(1);
    expect(wed.some((x) => x.status === 'unplaced' && x.category === 'interference_conflict')).toBe(true);
  });

  it('C-2. journée double explicite : deux séances DISTINCTES, chacune dans sa part, total ≤ disponibilité du jour', () => {
    const env = weekEnv({ layout: DOUBLE, scenario: S6DX });
    const s = create({ ...PROFILE, availability: [...S6DX.availability] }, NOW, env);
    const pins = env.studyPins?.(MON) ?? [];
    const m = measureWeek(s, MON, env, new Map(pins.filter((p) => p.minutes !== undefined).map((p) => [p.requestId, p.minutes as number])));
    for (const day of ['2026-10-07', '2026-10-10']) {
      const same = m.sessions.filter((x) => x.date === day);
      expect(same).toHaveLength(2);
      expect(new Set(same.map((x) => x.requestId)).size).toBe(2);
      expect(new Set(same.map((x) => x.sport)).size).toBe(2);
      for (const x of same) expect(x.estMin ?? Infinity).toBeLessThanOrEqual(x.allottedMin);
      expect(same.reduce((a, x) => a + x.allottedMin, 0)).toBeLessThanOrEqual(S6D.availability[new Date(`${day}T12:00:00Z`).getUTCDay() - 1] ?? 0);
      // Deux enregistrements séparés : aucun bloc d'une séance n'apparaît dans l'autre (aucune fusion).
      const [a, b] = same.map((x) => JSON.stringify(selectProgrammeSession(s, x.requestId)?.session.blocks.map((k) => k.items.map((i) => i.exerciseId))));
      expect(a).not.toBe(b);
    }
  });

  it('C-3. une part trop courte REFUSE la séance (raison de faisabilité tracée), sans retirer d’exercice', () => {
    const s = create({ ...PROFILE, availability: [...S6D.availability] }, NOW, withPins([{ requestId: id('strength', 1), date: '2026-10-07', minutes: 45 }, { requestId: id('running', 1), date: '2026-10-07', minutes: 30 }]));
    const r = s.planner.weeks[MON]?.requests.find((x) => x.requestId === id('running', 1));
    expect(r?.status).toBe('refused');
    expect(r?.reasons.map((x) => x.code)).toContain('FEASIBILITY.TIME_EXCEEDED');
    expect(RUN_SHARE_MIN).toBeGreaterThan(30);
  });

  it('C-4. LIMITE documentée : la part d’une journée double n’est pas persistée ; la régénération du contrôle pré-séance relit la journée entière', () => {
    const env = weekEnv({ layout: DOUBLE, scenario: S6DX });
    const s = create({ ...PROFILE, availability: [...S6DX.availability] }, NOW, env);
    const week = s.planner.weeks[MON];
    const strengthWed = week?.requests.find((x) => x.sport === 'strength' && x.date === '2026-10-07');
    expect(strengthWed?.status).toBe('planned');
    // Le jour persisté ne porte qu'une disponibilité (la journée entière) : la part explicite (40 min) est perdue.
    expect(week?.days.find((d) => d.date === '2026-10-07')?.availableMinutes).toBe(S6D.availability[2]);
    const g = regenerateSession(s, strengthWed?.requestId ?? '', UNKNOWN_CORE_STATE, env);
    expect(g.status).toBe('planned');
  });
});
