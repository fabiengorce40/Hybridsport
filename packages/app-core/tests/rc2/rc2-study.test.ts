/**
 * RC2 — ÉTUDE comparative des stratégies d'arbitrage de récupération (TEST_ONLY, jamais branchées à l'application).
 * 5 configurations RC1 × 14 variantes (RC1 ; A/B/C × P1/P2/P3 ; D0 ; DB × P1/P2/P3), 4 semaines chacune, chemin réel.
 * Lancement EXPLICITE (`RC2_STUDY=1`) : 70 simulations, inutiles à la non-régression courante. Sorties :
 * __reports__/rc2-study.json (métriques brutes) et __reports__/rc2-strategies.md (tableaux).
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { simulate } from '../consolidation/sim4.js';
import { measure } from './metrics.js';
import type { RunMetrics } from './metrics.js';
import { CONFIGS, PARAMS, studyEnv } from './study-env.js';
import type { StrategyKey } from './study-env.js';

const VARIANTS: readonly { readonly key: string; readonly label: string; readonly strategy?: StrategyKey; readonly p?: (typeof PARAMS)[number] }[] = [
  { key: 'RC1', label: 'RC1 (référence)' },
  ...(['A', 'B', 'C'] as const).flatMap((st) => PARAMS.map((p) => ({ key: `${st}-${p.key}`, label: `${st} · ${p.label}`, strategy: st, p }))),
  { key: 'D0', label: 'D0 · espacement au placement seul', strategy: 'D0' },
  ...PARAMS.map((p) => ({ key: `DB-${p.key}`, label: `DB · espacement + B · ${p.label}`, strategy: 'DB' as const, p })),
];
const LOWER = ['quads', 'hamstrings', 'calves', 'glutes'];
const UPPER = ['chest', 'back', 'shoulders'];
const sumOf = (m: RunMetrics, gs: readonly string[]) => gs.reduce((a, g) => a + (m.planned[g] ?? 0), 0);
const n1 = (x: number) => String(Math.round(x * 10) / 10);
// technical-constant: ÉTUDE — seuil de SIGNALEMENT d'une dégradation (−20 % vs RC1), observation, pas une règle
const DEGRADE = 0.8;

describe.skipIf(process.env.RC2_STUDY !== '1')('RC2 — étude des stratégies (70 simulations)', () => {
  it('étude complète, invariants et rapport', () => {
    const out: Record<string, Record<string, RunMetrics>> = {};
    for (const c of CONFIGS) {
      out[c.key] = {};
      for (const v of VARIANTS) {
        const env = v.strategy ? studyEnv(v.strategy, v.p) : undefined;
        const r = simulate({ ...(c.profile ? { profile: c.profile } : {}), ...(c.plan ? { plan: c.plan } : {}), ...(env ? { env } : {}) });
        const m = measure(r);
        expect(m.violations).toBe(0);
        (out[c.key] as Record<string, RunMetrics>)[v.key] = m;
      }
    }
    const json = new URL('./__reports__/rc2-study.json', import.meta.url).pathname;
    mkdirSync(dirname(json), { recursive: true });
    writeFileSync(json, JSON.stringify(out, null, 1));

    const L: string[] = ['# RC2 — stratégies d’arbitrage de récupération : étude sur 4 semaines × 5 configurations', '',
      '> Étude TEST_ONLY, **jamais branchée à l’application** (`beta0Environment` inchangé ; équivalence vérifiée). Stratégies : A = déplacer ; B = déplacer puis échanger ; C = déplacer, échanger puis recomposer ; D0 = espacement des séances de force au placement initial (exploratoire) ; DB = D0 + règle « force » + B. Paramètres de détection « force » (Musculation ↔ Musculation et Musculation ↔ Cross-training, structures CORE genou, hanche, poussée, tirage, axial) : P1 = < 36 h, niveau élevé ; P2 = < 36 h, modéré ou élevé ; P3 = < 60 h, élevé. **Aucune valeur n’est une recommandation de seuil.**', '',
      'Lecture : paires J+1 = séances de force réalisées à 24 h partageant au moins un groupe ; séries partagées = somme, sur ces paires, du minimum des séries des deux séances par groupe partagé ; bas du corps = quadriceps + ischio-jambiers + mollets + fessiers (séries planifiées / semaine, moyenne) ; ⚠ = dégradation de plus de 20 % du bas du corps, du haut du corps ou des séances de course réalisées par rapport à RC1 (signalée, jamais retenue automatiquement).', ''];
    for (const c of CONFIGS) {
      const rows = out[c.key] as Record<string, RunMetrics>;
      const ref = rows.RC1 as RunMetrics;
      L.push(`## ${c.key}. ${c.name}`, '', `Semaine type RC1 : ${ref.layouts[0] ?? '—'}`, '',
        '| variante | semaine 1 | paires J+1 | paires ≤ 48 h | séries partagées J+1 | dont CT | MOVE / SWAP / RECOMP. | résidus | reportées | non placées | course réalisée (séances / min) | min / sem. | bas du corps | haut du corps | sous plancher | ▲ haut | répét. variante / exercice | bloc CT (séries/sem.) |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const v of VARIANTS) {
        const m = rows[v.key] as RunMetrics;
        const lo = sumOf(m, LOWER); const up = sumOf(m, UPPER);
        const warn = [lo < sumOf(ref, LOWER) * DEGRADE ? '⚠ bas du corps' : '', up < sumOf(ref, UPPER) * DEGRADE ? '⚠ haut du corps' : '', m.runExecuted < ref.runExecuted * DEGRADE ? '⚠ course' : ''].filter(Boolean).join(' ');
        L.push(`| ${v.label}${warn ? ` ${warn}` : ''} | ${m.layouts[0] ?? '—'} | ${String(m.pairs24)} | ${String(m.pairs48)} | ${n1(m.sharedSets24)} | ${String(m.ctAdj24)} | ${String(m.moves)} / ${String(m.swaps)} / ${String(m.recomposes)} | ${String(m.residual)} | ${String(m.postponed)} | ${String(m.unplaced)} | ${String(m.runExecuted)} / ${String(m.runMin)} | ${n1(m.weeklyPlannedMin)} | ${n1(lo)} | ${n1(up)} | ${m.belowFloor.join(', ') || '—'} | ${m.aboveHigh.join(', ') || '—'} | ${String(m.variantRepeats)} / ${String(m.exerciseRepeats)} | ${n1(m.ctBlockSets)} |`);
      }
      L.push('');
    }
    const md = new URL('./__reports__/rc2-strategies.md', import.meta.url).pathname;
    writeFileSync(md, L.join('\n'));
    expect(Object.keys(out)).toHaveLength(CONFIGS.length);
  }, 1_800_000);
});
