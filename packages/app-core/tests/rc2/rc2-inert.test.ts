/**
 * RC2 — non-régression : les capacités d'étude (règle de paire `sameSport`/`sports`, critère `later`, espacement au
 * placement `planner.placement.spacingGroups`) sont ABSENTES de l'environnement de l'application ; un environnement
 * d'étude sans règle reproduit RC1 à l'identique ; une stratégie d'étude n'enfreint aucun invariant de sécurité.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment } from '../../src/index.js';
import { simulate } from '../consolidation/sim4.js';
import { measure } from './metrics.js';
import { PARAMS, studyEnv } from './study-env.js';

describe('RC2 — capacités d’étude inertes, RC1 préservé', () => {
  it('I-1. l’environnement de l’application ne porte aucune capacité d’étude', () => {
    const g = beta0Environment().governance;
    const pair = g?.parameter('planner.m3.pairRules')?.value as { sameSport?: boolean; sports?: unknown }[];
    expect(pair.every((r) => r.sameSport === undefined && r.sports === undefined)).toBe(true);
    expect((g?.parameter('planner.m3.yieldPolicy')?.value as { order: string[] }).order).not.toContain('later');
    expect(g?.parameter('planner.placement.spacingGroups')).toBeUndefined();
  });

  it('I-2. environnement d’étude SANS règle = RC1 à l’identique (4 semaines, configuration masse)', () => {
    expect(JSON.stringify(simulate({ env: studyEnv('C') }))).toBe(JSON.stringify(simulate()));
  });

  it('I-3. stratégie d’étude (espacement + échange) : aucune zone exclue, course conservée, aucune hausse de séries', () => {
    const rc1 = measure(simulate());
    const r = simulate({ env: studyEnv('DB', PARAMS[0]) });
    const m = measure(r);
    expect(m.violations).toBe(0);
    expect(m.runExecuted).toBe(rc1.runExecuted);
    for (const s of r.sessions) for (const c of s.changes.filter((y) => y.startsWith('sets:'))) { const [a, b] = (c.split(':')[2] ?? '').split('>').map(Number); expect(b ?? 0).toBeLessThanOrEqual(a ?? 0); }
  });
});
