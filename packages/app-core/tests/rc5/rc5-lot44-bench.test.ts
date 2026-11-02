/**
 * Reprise RC5 lot 4.4 — banc de validation SUR DEMANDE (`LOT44_BENCH=1`, fragments `LOT44_SHARD=A,B1…`, fusion
 * `LOT44_MERGE=1`) : écrit `__reports__/lot44-validation.md` et `.json`. Contrôles transverses : aucune erreur, aucune
 * séance sous 36 h (TOUTES variantes, stratégies statiques comprises, depuis la sécurisation du chantier A), aucune
 * durée dépassée, aucune violation matériel / exclusions ; identité de A et B1 avec le banc du lot 4.3 (7cc8abd) ;
 * redistribution jamais au-delà de la borne haute là où A ne la dépassait pas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lot44Plan, measureLot44, reportLot44 } from './lot44-bench.js';
import type { Lot44Measure } from './lot44-bench.js';
import type { Lot43Measure } from './lot43-bench.js';

const SHARDS = ['A', 'B1_B1Q4', 'B1ISO_RED', 'SW-ALT_SW-ULF_SW-FB_SW-ALT+RED_SW-ULF+RED_SW-FB+RED_PROP', 'R4_R4F_R4R3_R4FR3_R4V6'];
const ref43 = (): Lot43Measure[] => ['A_B1', 'B1Q4_SW-ALT', 'SW-ULF_SW-FB', 'PROP'].flatMap((x) => JSON.parse(readFileSync(new URL(`./__reports__/lot43-shard-${x}.json`, import.meta.url), 'utf8')) as Lot43Measure[]);

function checks(all: readonly Lot44Measure[], ref: readonly Lot43Measure[]): void {
  for (const m of all) expect([m.variant, m.id, m.errors, m.duration.over, m.constraintViolations, m.recoveryUnder36]).toEqual([m.variant, m.id, 0, 0, 0, 0]);
  for (const m of all.filter((x) => (x.variant === 'A' || x.variant === 'B1') && !x.id.startsWith('E-'))) {
    const r = ref.find((x) => x.variant === m.variant && x.id === m.id);
    if (r) expect([m.variant, m.id, m.volume, m.loads, m.planned, m.refused]).toEqual([m.variant, m.id, r.volume, r.loads, r.planned, r.refused]);
  }
  for (const m of all.filter((x) => x.variant.endsWith('RED'))) {
    const a = all.find((x) => x.variant === (m.variant === 'RED' ? 'A' : m.variant.replace('+RED', '')) && x.id === m.id);
    if (!a) continue;
    for (const [g, v] of Object.entries(m.volume)) if (v.high !== null && (a.volume[g]?.planned ?? 0) <= v.high) expect([m.variant, m.id, g, v.planned <= v.high + 1e-9]).toEqual([m.variant, m.id, g, true]);
    expect([m.variant, m.id, m.planned]).toEqual([m.variant, m.id, a.planned]);
  }
}

describe.runIf(process.env.LOT44_MERGE === '1')('rapport du lot 4.4 depuis les fragments (sur demande)', () => {
  it('fusion des fragments `lot44-shard-*.json` et contrôles', () => {
    const all = SHARDS.flatMap((x) => JSON.parse(readFileSync(new URL(`./__reports__/lot44-shard-${x}.json`, import.meta.url), 'utf8')) as Lot44Measure[]);
    const ref = ref43();
    writeFileSync(new URL('./__reports__/lot44-validation.json', import.meta.url), `${JSON.stringify(all)}\n`);
    writeFileSync(new URL('./__reports__/lot44-validation.md', import.meta.url), reportLot44(all, ref));
    checks(all, ref);
  });
});

describe.runIf(process.env.LOT44_BENCH === '1')('banc du lot 4.4 (sur demande)', () => {
  it('variantes × profils', () => {
    const shard = process.env.LOT44_SHARD;
    const ids = shard?.split(',');
    const all = lot44Plan().filter((p) => !ids || ids.includes(p.variant.id)).flatMap((p) => p.specs.map((s) => measureLot44(s, p.variant)));
    writeFileSync(new URL(`./__reports__/lot44-shard-${(shard ?? 'all').replace(/,/g, '_')}.json`, import.meta.url), `${JSON.stringify(all)}\n`);
    checks(all, ref43());
  }, 7_200_000);
});
