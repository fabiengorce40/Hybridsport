/**
 * Reprise RC5 lot 4.6 — banc de stabilisation SUR DEMANDE : `LOT46_BENCH=1 LOT46_SCOPE=progression|b1|red`
 * (`LOT46_SHARD` = variantes séparées par des virgules, `SIM_WEEKS=24` pour les scénarios prolongés) ; fusion
 * `LOT46_MERGE=1` → `__reports__/lot46-stabilisation.md` et `.json`. Contrôles transverses : aucune erreur, aucune séance
 * sous 36 h, aucune durée dépassée, aucune violation matériel / exclusions ; moteur actif identique au lot 4.5 (12 semaines).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lot46Plan, measureLot46 } from './lot46-bench.js';
import type { Lot46Measure, Lot46Scope } from './lot46-bench.js';
import { reportLot46 } from './lot46-report.js';
import type { Lot45Measure } from './lot45-bench.js';

const dir = fileURLToPath(new URL('./__reports__/', import.meta.url));
function checks(all: readonly Lot46Measure[]): void {
  for (const m of all) expect([m.variant, m.id, m.weeks, m.errors, m.duration.over, m.constraintViolations, m.recoveryUnder36]).toEqual([m.variant, m.id, m.weeks, 0, 0, 0, 0]);
}

describe.runIf(process.env.LOT46_MERGE === '1')('rapport du lot 4.6 (fusion des fragments)', () => {
  it('fusion, contrôles, identité du moteur actif avec le lot 4.5', () => {
    const all = readdirSync(dir).filter((f) => f.startsWith('lot46-shard-')).sort().flatMap((f) => JSON.parse(readFileSync(`${dir}${f}`, 'utf8')) as Lot46Measure[]);
    const ref45 = existsSync(`${dir}lot45-validation.json`) ? JSON.parse(readFileSync(`${dir}lot45-validation.json`, 'utf8')) as Lot45Measure[] : [];
    writeFileSync(`${dir}lot46-stabilisation.json`, `${JSON.stringify(all)}\n`);
    writeFileSync(`${dir}lot46-stabilisation.md`, reportLot46(all, ref45));
    checks(all);
    for (const m of all.filter((x) => x.variant === 'A' && x.weeks === 12)) {
      const r = ref45.find((x) => x.variant === 'A' && x.id === m.id);
      if (r) expect([m.id, m.volume, m.loads, m.planned, m.refused]).toEqual([m.id, r.volume, r.loads, r.planned, r.refused]);
    }
  });
});

describe.runIf(process.env.LOT46_BENCH === '1')('banc du lot 4.6 (sur demande)', () => {
  it('variantes × profils', () => {
    const scope = (process.env.LOT46_SCOPE ?? 'progression') as Lot46Scope;
    const shard = process.env.LOT46_SHARD === undefined || process.env.LOT46_SHARD === '' ? undefined : process.env.LOT46_SHARD;
    const ids = shard?.split(',');
    const all = lot46Plan(scope).filter((p) => !ids || ids.includes(p.variant.id)).flatMap((p) => p.specs.map((s) => measureLot46(s, p.variant)));
    const weeks = all[0]?.weeks ?? 0;
    writeFileSync(`${dir}lot46-shard-${scope}-w${String(weeks)}-${(shard ?? 'all').replace(/,/g, '_')}.json`, `${JSON.stringify(all)}\n`);
    checks(all);
  }, 7_200_000);
});
