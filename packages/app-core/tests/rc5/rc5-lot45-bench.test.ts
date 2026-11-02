/**
 * Reprise RC5 lot 4.5 — banc de validation SUR DEMANDE (`LOT45_BENCH=1`, fragment `LOT45_SHARD=<variantes séparées par des
 * virgules>`, fusion `LOT45_MERGE=1`) : écrit `__reports__/lot45-shard-*.json`, puis `lot45-validation.md` et `.json`.
 * Contrôles transverses (toutes variantes) : aucune erreur, aucune séance sous 36 h, aucune durée dépassée, aucune
 * violation matériel / exclusions ; redistribution : jamais au-delà de la borne haute là où A ne la dépasse pas, mêmes
 * séances planifiées ; déterminisme : deux exécutions identiques (profil témoin).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lot45Plan, measureLot45 } from './lot45-bench.js';
import type { Lot45Measure } from './lot45-bench.js';
import { reportLot45 } from './lot45-report.js';
import type { Lot44Measure } from './lot44-bench.js';

export const LOT45_SHARDS = ['A', 'B-R4,B-REF,B-V6', 'B-CLAMP,B-SUSP,B-REFCL', 'B-RNG10,B-RNG15,B-RNG20', 'B1,B1Q4,B1ISO,B1ISO-25,B1ISO-75', 'RED,RED-DEF,RED-PRIO,RED-GUARD,RED-DEF-GUARD', 'SW-ALT+RED-GUARD,SW-FB+RED-GUARD,SW-ALT+RED,SW-FB+RED,CAND-B1ISO,CAND-RED-GUARD'];
const name = (x: string) => `lot45-shard-${x.replace(/,/g, '_')}`;

function checks(all: readonly Lot45Measure[]): void {
  for (const m of all) expect([m.variant, m.id, m.errors, m.duration.over, m.constraintViolations, m.recoveryUnder36]).toEqual([m.variant, m.id, 0, 0, 0, 0]);
  for (const m of all.filter((x) => /RED/.test(x.variant))) {
    const a = all.find((x) => x.variant === 'A' && x.id === m.id);
    if (!a) continue;
    for (const [g, v] of Object.entries(m.volume)) if (v.high !== null && (a.volume[g]?.planned ?? 0) <= v.high) expect([m.variant, m.id, g, v.planned <= v.high + 1e-9]).toEqual([m.variant, m.id, g, true]);
    // Séances planifiées identiques à A pour la redistribution seule ; combinée à une stratégie de semaine courte, la
    // référence est la stratégie elle-même (séances refusées pour la sécurité de récupération, lot 4.4).
    if (!m.variant.startsWith('SW-')) expect([m.variant, m.id, m.planned]).toEqual([m.variant, m.id, a.planned]);
  }
}

describe.runIf(process.env.LOT45_MERGE === '1')('rapport du lot 4.5 depuis les fragments (sur demande)', () => {
  it('fusion et contrôles', () => {
    const all = LOT45_SHARDS.flatMap((x) => JSON.parse(readFileSync(new URL(`./__reports__/${name(x)}.json`, import.meta.url), 'utf8')) as Lot45Measure[]);
    const ref44 = JSON.parse(readFileSync(new URL('./__reports__/lot44-validation.json', import.meta.url), 'utf8')) as Lot44Measure[];
    writeFileSync(new URL('./__reports__/lot45-validation.json', import.meta.url), `${JSON.stringify(all)}\n`);
    writeFileSync(new URL('./__reports__/lot45-validation.md', import.meta.url), reportLot45(all, ref44));
    checks(all);
  });
});

describe.runIf(process.env.LOT45_BENCH === '1')('banc du lot 4.5 (sur demande)', () => {
  it('variantes × profils', () => {
    const shard = process.env.LOT45_SHARD;
    const ids = shard?.split(',');
    const all = lot45Plan().filter((p) => !ids || ids.includes(p.variant.id)).flatMap((p) => p.specs.map((s) => measureLot45(s, p.variant)));
    writeFileSync(new URL(`./__reports__/${name(shard ?? 'all')}.json`, import.meta.url), `${JSON.stringify(all)}\n`);
    checks(all);
    // Déterminisme : profil témoin rejoué à l'identique.
    const first = lot45Plan().find((p) => !ids || ids.includes(p.variant.id));
    const spec = first?.specs[0];
    if (first && spec) expect(measureLot45(spec, first.variant)).toEqual(all.find((m) => m.variant === first.variant.id && m.id === spec.id));
  }, 7_200_000);
});
