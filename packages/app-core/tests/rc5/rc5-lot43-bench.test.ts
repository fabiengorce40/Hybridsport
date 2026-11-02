/**
 * Reprise RC5 lot 4.3 — banc de consolidation SUR DEMANDE (`LOT43_BENCH=1`, ~15 min) : écrit
 * `__reports__/lot43-consolidation.md` et `.json` ; vérifie les contrôles transverses (aucune erreur, aucune séance sous
 * 36 h, aucune durée dépassée, aucune violation matériel / exclusions) et l'identité de la variante A avec bfedde1.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOT43_PROPOSAL_PROFILES, LOT43_VARIANTS, lot43Specs, measureLot43, reportLot43 } from './lot43-bench.js';
import type { Lot43Measure } from './lot43-bench.js';
import type { Lot42Measure } from './lot42-bench.js';

describe.runIf(process.env.LOT43_MERGE === '1')('rapport du lot 4.3 depuis les fragments (sur demande)', () => {
  it('fusion des fragments `lot43-shard-*.json`', () => {
    const shards = ['A_B1', 'B1Q4_SW-ALT', 'SW-ULF_SW-FB', 'PROP'];
    const all = shards.flatMap((x) => JSON.parse(readFileSync(new URL(`./__reports__/lot43-shard-${x}.json`, import.meta.url), 'utf8')) as Lot43Measure[]);
    const ref = JSON.parse(readFileSync(new URL('./__reports__/lot42-arbitrages.json', import.meta.url), 'utf8')) as Lot42Measure[];
    writeFileSync(new URL('./__reports__/lot43-consolidation.json', import.meta.url), `${JSON.stringify(all)}\n`);
    writeFileSync(new URL('./__reports__/lot43-consolidation.md', import.meta.url), reportLot43(all, ref));
    expect(all.length).toBeGreaterThan(0);
  });
});

describe.runIf(process.env.LOT43_BENCH === '1')('banc du lot 4.3 (sur demande)', () => {
  it('variantes × profils, rapport et contrôles', () => {
    const shard = process.env.LOT43_SHARD;
    const all = LOT43_VARIANTS.filter((v) => shard === undefined || shard.split(',').includes(v.id)).flatMap((v) => lot43Specs().filter((s) => v.id !== 'PROP' || LOT43_PROPOSAL_PROFILES.includes(s.id)).map((s) => measureLot43(s, v)));
    const ref = JSON.parse(readFileSync(new URL('./__reports__/lot42-arbitrages.json', import.meta.url), 'utf8')) as Lot42Measure[];
    const name = shard === undefined ? 'lot43-consolidation' : `lot43-shard-${shard.replace(/,/g, '_')}`;
    writeFileSync(new URL(`./__reports__/${name}.json`, import.meta.url), `${JSON.stringify(all)}\n`);
    if (shard === undefined) writeFileSync(new URL('./__reports__/lot43-consolidation.md', import.meta.url), reportLot43(all, ref));
    // Moteur actif (A), variantes de décompte (B1, B1Q4) et propositions VALIDÉES (PROP) : aucune séance sous 36 h. Les
    // stratégies STATIQUES de semaine courte (SW-*) ne sont pas validées : leurs écarts sont RAPPORTÉS (document 10 § 6),
    // c'est précisément pourquoi elles ne passent que par une proposition revérifiée.
    for (const m of all) expect([m.variant, m.id, m.errors, m.duration.over, m.constraintViolations]).toEqual([m.variant, m.id, 0, 0, 0]);
    for (const m of all.filter((x) => !x.variant.startsWith('SW-'))) expect([m.variant, m.id, m.recoveryUnder36]).toEqual([m.variant, m.id, 0]);
    for (const m of all.filter((x) => x.variant === 'A')) {
      const r = ref.find((x) => x.variant === 'A' && x.id === m.id);
      if (r) expect([m.id, m.volume, m.loads, m.planned, m.refused]).toEqual([m.id, r.volume, r.loads, r.planned, r.refused]);
    }
  }, 7_200_000);
});
