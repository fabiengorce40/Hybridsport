/**
 * C4.1 — AUDIT des durées des séances Cross-training complètes (chemin app-core réel, Beta 0 TEST_ONLY) : décomposition
 * bloc principal / échauffement général / échauffement spécifique / retour au calme (allure facile + mobilité), blocs
 * non générés, durée planifiée C4 et estimation du CORE. Lecture seule des traces persistées. Rapport :
 * __reports__/c41-durations.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ProfileInput } from '../../src/index.js';
import { create, ctSessions, profile, request } from './ct-fixtures.js';

const INTENTS = ['crosstraining.mixed_modal_medium', 'crosstraining.aerobic_capacity', 'crosstraining.threshold', 'crosstraining.anaerobic_intervals', 'crosstraining.muscular_endurance'];
const LEVELS: ProfileInput['level'][] = ['beginner', 'intermediate'];
const MINUTES = [45, 60, 75];
const m = (s: number | null | undefined) => (s === null || s === undefined || !Number.isFinite(s) ? '—' : (s / 60).toFixed(1));

describe('C4.1 — audit des durées', () => {
  it('décomposition par bloc ; aucune séance au-delà du temps disponible ; rapport', () => {
    const rows: string[] = [];
    const agg = { n: 0, full: 0, main: 0, wg: 0, ws: 0, cd: 0, planned: 0, est: 0 };
    const pos = { below: 0, within: 0, above: 0 };
    let retries = 0;
    for (const intent of INTENTS) for (const level of LEVELS) for (const min of MINUTES) {
      const s = create(profile({ ct: { intent }, level, availability: [min, 0, min, 0, min, 0, 0] }));
      for (const x of ctSessions(s).filter((y) => y.placement === 'planned')) {
        const rs = request(s, x.requestId)?.reasons ?? [];
        const blk = (b: string) => Number(rs.find((r) => r.code === 'PLAN.CROSSTRAINING.C4_BLOCK' && r.params.block === b)?.params.durationS ?? NaN);
        const c4 = x.composition?.c4;
        if (rs.some((r) => r.code === 'PLAN.CROSSTRAINING.C4_VARIANT_RETRY')) retries += 1;
        const mainS = x.composition?.blockDurationS ?? null;
        const planned = c4?.plannedDurationS ?? null;
        if (planned !== null) expect(planned).toBeLessThanOrEqual(min * 60);
        if (c4?.status === 'FULL_SESSION' && planned !== null && mainS !== null) {
          agg.n += 1; agg.full += 1; agg.main += mainS; agg.planned += planned;
          agg.est += c4.estimatedDurationS ?? 0; if (c4.estimatedPosition) pos[c4.estimatedPosition] += 1;
          agg.wg += blk('warmup_general') || 0; agg.ws += blk('warmup_specific') || 0; agg.cd += blk('cooldown') || 0;
        } else agg.n += 1;
        rows.push(`| ${intent.split('.')[1] ?? ''} | ${level} | ${String(min)} | ${x.ctFormat ?? '—'} | ${c4?.status ?? 'BLOCKED'} | ${m(mainS)} | ${m(blk('warmup_general'))} | ${m(blk('warmup_specific'))} | ${m(blk('cooldown'))} | ${m(planned)} | ${m(x.estimatedDurationS)} | ${c4?.notGenerated.join(', ') || '—'} | ${c4?.cause ?? '—'} |`);
      }
    }
    expect(agg.full).toBeGreaterThan(0);
    const share = (v: number) => `${((100 * v) / agg.planned).toFixed(0)} %`;
    const lines = [
      '# C4.1 — audit des durées Cross-training (Beta 0, gouvernance TEST_ONLY)', '',
      '> Chemin app-core réel. Durées en minutes. « Principal » = durée PRESCRITE du format C3 ; blocs C4 = durées tracées (`C4_BLOCK`) ; « Planifiée » = somme gouvernée C4 ; « CORE » = estimation du CORE (transitions comprises). Aucune valeur n’est validée scientifiquement.', '',
      `Séances complètes : ${String(agg.full)} / ${String(agg.n)}. Moyennes (séances complètes) : principal ${m(agg.main / agg.full)} · échauffement général ${m(agg.wg / agg.full)} · spécifique ${m(agg.ws / agg.full)} · retour au calme ${m(agg.cd / agg.full)} · planifiée ${m(agg.planned / agg.full)}.`,
      `Durée ESTIMÉE par le CORE (consignes et transitions comprises) : moyenne ${m(agg.est / agg.full)} min ; position / cible 45–75 min : sous ${String(pos.below)} · dans ${String(pos.within)} · au-dessus ${String(pos.above)}. Variante courte après refus du CORE : ${String(retries)} séance(s).`,
      `Part de la durée planifiée : principal ${share(agg.main)} · échauffement général ${share(agg.wg)} · spécifique ${share(agg.ws)} · retour au calme ${share(agg.cd)}.`, '',
      '| Intention | Niveau | Dispo | Format | Statut C4 | Principal | Éch. général | Éch. spécifique | Retour au calme | Planifiée | CORE | Non générés | Cause |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|', ...rows, '',
    ];
    const path = new URL('./__reports__/c41-durations.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
