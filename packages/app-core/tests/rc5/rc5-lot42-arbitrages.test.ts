/**
 * Reprise RC5 lot 4.2 — arbitrages : correction technique démontrée et options inactives, chemin RÉEL de l'application.
 * - Correction : un jour Musculation CHOISI par l'utilisateur n'est plus pris par un autre sport qui a d'autres jours
 *   possibles (Musculation 3× + Course : 3 séances placées au lieu de 2) ; jamais un jour inventé (HYROX sur 5 jours :
 *   la séance sans jour reste signalée).
 * - Options inactives (Q1 variantes, Q3, Q4, Q6) : l'environnement par défaut n'en active aucune.
 * - Rapport complet (toutes variantes × 18 profils, ~6 min) : `LOT42_BENCH=1` écrit `__reports__/lot42-arbitrages.md` et
 *   `lot42-arbitrages.json` ; sinon seulement les assertions rapides ci-dessous.
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { beta0Environment, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, strengthContent } from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';
import { lot42Specs, measureLot42, reclassify, reportLot42, VARIANTS, variantEnv } from './lot42-bench.js';
import { P2, profileOf } from './lot4-profiles.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, hm = '07:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const strength = (s: AppState, w: string) => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength');
const dow = (d: string) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

describe('correction technique : jours indispensables à un autre sport essayés en dernier', () => {
  const run3 = profileOf({ priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 }, running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } }, { days: [0, 2, 4] });
  const s1 = createBeta0Programme(emptyState(), run3, at(W1), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } });
  const s2 = ensureBeta0Week(s1, at(W2, '06:00'));

  it('Musculation 3× (lundi, mercredi, vendredi choisis) + Course 2× : 3 séances Musculation placées, sur les jours choisis', () => {
    for (const [s, w] of [[s1, W1], [s2, W2]] as const) {
      const r = strength(s, w);
      expect(r.filter((x) => x.status === 'planned')).toHaveLength(3);
      for (const x of r) expect([0, 2, 4]).toContain(dow(x.date ?? ''));
      const runs = (s.planner.weeks[w]?.requests ?? []).filter((x) => x.sport === 'running');
      expect(runs.filter((x) => x.status === 'planned')).toHaveLength(2);
      for (const x of runs) expect([0, 2, 4]).not.toContain(dow(x.date ?? ''));
    }
  });

  it('jamais un jour inventé : HYROX + Musculation sur 5 jours (6 séances) ⇒ une séance non placée, signalée', () => {
    const s = createBeta0Programme(emptyState(), P2.profile, at(W1), {});
    const r = strength(s, W1);
    expect(r.filter((x) => x.status !== 'planned')).toHaveLength(1);
    expect(r.find((x) => x.status !== 'planned')?.reasons.some((x) => x.code === 'PLAN.PLANNER.NOT_ENOUGH_DAYS')).toBe(true);
  });

  it('déterminisme ; export / import identique', () => {
    expect(JSON.stringify(createBeta0Programme(emptyState(), run3, at(W1), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }).planner)).toBe(JSON.stringify(s1.planner));
    const d = decodeState(exportState(s2));
    expect(d.ok && d.state).toEqual(s2);
  });
});

describe('options du lot 4.2 : inactives par défaut', () => {
  it('environnement Beta 0 : aucune option (contenu du registre, sonde par rang, règle de composition publiée)', () => {
    const env = beta0Environment();
    expect(env.strength?.placementProbe).toBeUndefined();
    expect(env.strength?.composition?.rule?.bands.some((b) => b.shortWeek !== undefined)).toBe(false);
    expect(env.strength?.content.ruleset.version).toBe(strengthContent().ruleset.version);
  });
  it('variante A du banc = environnement par défaut ; variantes de contenu : versions `sim-…`, jamais au registre', () => {
    expect(variantEnv(VARIANTS[0] as never).strength?.content).toEqual(beta0Environment().strength?.content);
    const b1 = variantEnv(VARIANTS.find((v) => v.id === 'B1') as never).strength?.content;
    expect(b1?.ruleset.version).toMatch(/\.sim-b1$/);
    expect(b1?.catalog.version).toMatch(/sim-b1$/);
  });
  it('Q1 B : bras synergistes des poussées / tirages polyarticulaires ; fessiers du squat seulement en B2 ; isolations intactes', () => {
    const c = strengthContent().catalog;
    const ex = (id: string) => { const e = c.exercise(id); if (!e) throw new Error(id); return e; };
    expect(reclassify(ex('ex.bench_press'), 'arms').muscles).toEqual({ primary: ['chest'], secondary: ['front_delts', 'triceps'] });
    expect(reclassify(ex('ex.pull_up'), 'arms').muscles.primary).toEqual(['lats']);
    expect(reclassify(ex('ex.back_squat'), 'arms')).toEqual(ex('ex.back_squat'));
    expect(reclassify(ex('ex.back_squat'), 'arms_glutes_knee').muscles.primary).toEqual(['quadriceps']);
    expect(reclassify(ex('ex.romanian_deadlift'), 'arms_glutes_knee')).toEqual(ex('ex.romanian_deadlift'));
    expect(reclassify(ex('ex.db_curl'), 'arms_glutes_knee')).toEqual(ex('ex.db_curl'));
  });
});

describe('banc du lot 4.2 (assertions rapides, 2 profils)', () => {
  const specs = lot42Specs();
  const h3 = specs.find((s) => s.id === 'L41-H3');
  const hyb = specs.find((s) => s.id === 'L4-2');
  if (!h3 || !hyb) throw new Error('profils attendus');
  it('Q4 (option) : pectoraux du Full Body 3× relevés vers leur cible ; aucune erreur, aucun refus, durée tenue', () => {
    const a = measureLot42(h3, VARIANTS.find((v) => v.id === 'A'));
    const q = measureLot42(h3, VARIANTS.find((v) => v.id === 'Q4'));
    expect(q.volume.chest?.planned).toBeGreaterThan((a.volume.chest?.planned ?? 0) + 3);
    expect([q.errors, q.refused, q.duration.over, q.recoveryUnder36]).toEqual([0, 0, 0, 0]);
  }, 300_000);
  it('Q3 (option) : semaine hybride à 3 séances — Haut et Bas équilibrés sur 12 semaines (actuel : Bas sacrifié)', () => {
    const a = measureLot42(hyb, VARIANTS.find((v) => v.id === 'A'));
    const q = measureLot42(hyb, VARIANTS.find((v) => v.id === 'Q3'));
    expect(a.regions.upper).toBe(2 * a.regions.lower);
    expect(q.regions.upper).toBe(q.regions.lower);
    expect(q.refused).toBe(a.refused);
    expect([q.errors, q.duration.over, q.recoveryUnder36]).toEqual([0, 0, 0]);
  }, 300_000);
});

describe.runIf(process.env.LOT42_BENCH === '1')('rapport complet du lot 4.2 (sur demande)', () => {
  it('toutes variantes × 18 profils', () => {
    const all = VARIANTS.flatMap((v) => lot42Specs().map((s) => measureLot42(s, v)));
    writeFileSync(new URL('./__reports__/lot42-arbitrages.json', import.meta.url), `${JSON.stringify(all)}\n`);
    writeFileSync(new URL('./__reports__/lot42-arbitrages.md', import.meta.url), reportLot42(all));
    expect(all.every((m) => m.errors === 0)).toBe(true);
  }, 7_200_000);
});
