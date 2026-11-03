/**
 * Reprise RC5 lot 4.6 — rapport Markdown reproductible du banc de stabilisation (`rc5-lot46-bench.test.ts`).
 */
import type { Lot45Measure } from './lot45-bench.js';
import type { Lot46Measure } from './lot46-bench.js';
import { B1_PROFILES, B1_VARIANTS, P_VARIANTS, RED_PROFILES, RED_VARIANTS } from './lot46-bench.js';

const f1 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));
const ld = (m: Lot46Measure, k: string) => { const x = m.loads[k]; return x ? `${x.first} → ${x.last} (↓${String(x.drops)})` : '—'; };
const deficit = (m: Lot46Measure) => Object.values(m.volume).reduce((n, g) => n + (g.target !== null ? Math.max(0, g.target - g.planned) : 0), 0);
const sum = (ms: readonly Lot46Measure[], f: (m: Lot46Measure) => number) => ms.reduce((n, m) => n + f(m), 0);

export function reportLot46(all: readonly Lot46Measure[], ref45: readonly Lot45Measure[]): string {
  const by = (v: string, id: string, w: number) => all.find((m) => m.variant === v && m.id === id && m.weeks === w);
  const weeks = [...new Set(all.map((m) => m.weeks))].sort((a, b) => a - b);
  const scenarios = [...new Set(all.filter((m) => m.id.startsWith('E-')).map((m) => m.id))];
  const profiles = [...new Set(all.filter((m) => !m.id.startsWith('E-') && m.variant === 'P-STAB').map((m) => m.id))];
  const out = ['# Reprise RC5 lot 4.6 — banc de stabilisation (12 et 24 semaines)', '',
    'Variantes de SIMULATION (jamais activées) sur le moteur de la BÊTA publiée (`097bacb`, code applicatif identique au lot 4.5). Comparaison de règles, aucune conclusion physiologique.', '',
    ...[...P_VARIANTS, ...B1_VARIANTS, ...RED_VARIANTS].filter((v, i, xs) => xs.findIndex((x) => x.id === v.id) === i).map((v) => `- **${v.id}** : ${v.label}`), ''];

  out.push('## Identité du moteur actif avec le lot 4.5 (12 semaines)', '', '| Profil | Volumes, charges, séances |', '|---|---|');
  for (const id of profiles) { const a = by('A', id, 12); const r = ref45.find((x) => x.variant === 'A' && x.id === id); if (a && r) out.push(`| ${id} | ${JSON.stringify([a.volume, a.loads, a.planned, a.refused]) === JSON.stringify([r.volume, r.loads, r.planned, r.refused]) ? 'identiques' : 'DIFFÉRENTS'} |`); }

  for (const w of weeks) {
    const vs = P_VARIANTS.map((v) => v.id).filter((v) => scenarios.some((id) => by(v, id, w)));
    if (vs.length === 0) continue;
    out.push('', `## A / B / C — politiques de progression, ${String(w)} semaines : synthèse sur les ${String(scenarios.length)} scénarios`, '', '| Variante | Hausses | Baisses | En dessous juste après une hausse | Au-dessus juste après une baisse | Changements de sens | Allers-retours | Sauts > 10 % | Maintiens (cause) | Somme des charges finales |', '|---|---|---|---|---|---|---|---|---|---|');
    for (const v of vs) {
      const ms = scenarios.map((id) => by(v, id, w)).filter((m): m is Lot46Measure => m !== undefined);
      const held: Record<string, number> = {};
      for (const m of ms) for (const [k, n] of Object.entries(m.progression)) if (k.startsWith('HELD:') && ['hysteresis', 'large_step_deferred', 'estimate_unreliable'].includes(k.slice(5))) held[k.slice(5)] = (held[k.slice(5)] ?? 0) + n;
      out.push(`| ${v} | ${String(sum(ms, (m) => m.progression.ADVANCED ?? 0))} | ${String(sum(ms, (m) => m.progression.REGRESSED ?? 0))} | ${String(sum(ms, (m) => m.belowAfterIncrease))} | ${String(sum(ms, (m) => m.aboveAfterDecrease))} | ${String(sum(ms, (m) => m.reversals))} | ${String(sum(ms, (m) => m.roundTrips))} | ${String(sum(ms, (m) => m.largeSteps))} | ${Object.entries(held).map(([k, n]) => `${k} ${String(n)}`).join(' ; ') || '—'} | ${f1(sum(ms, (m) => m.finalLoadSum))} |`);
    }
    out.push('', `### Détail par scénario (${String(w)} semaines) : squat · soulevé de terre roumain · développé couché ; changements de sens`, '', `| Scénario | ${vs.join(' | ')} |`, `|---|${vs.map(() => '---|').join('')}`);
    for (const id of scenarios) out.push(`| ${id} | ${vs.map((v) => { const m = by(v, id, w); return m ? `${ld(m, 'back_squat')} · ${ld(m, 'romanian_deadlift')} · ${ld(m, 'bench_press')} ; ${String(m.reversals)}` : '—'; }).join(' | ')} |`);
    const pv = ['A', 'P-BOUND', 'P-STAB'].filter((v) => profiles.some((id) => by(v, id, w)));
    if (pv.length > 0) {
      out.push('', `### 20 profils (${String(w)} semaines) : changements de sens · hausses suivies d’un « en dessous » · somme des charges finales`, '', `| Profil | ${pv.join(' | ')} |`, `|---|${pv.map(() => '---|').join('')}`);
      for (const id of profiles) out.push(`| ${id} | ${pv.map((v) => { const m = by(v, id, w); return m ? `${String(m.reversals)} · ${String(m.belowAfterIncrease)} · ${f1(m.finalLoadSum)}` : '—'; }).join(' | ')} |`);
    }
  }

  for (const w of weeks) {
    if (!B1_PROFILES.some((id) => by('B1ISO', id, w))) continue;
    out.push('', `## D — B1 et réévaluation des isolations, ${String(w)} semaines`, '', '| Profil | Variante | Pectoraux | Épaules | Bras (registre \\| convention) | Déficit | Isolations : changements / allers-retours | Principaux changés | Durée max |', '|---|---|---|---|---|---|---|---|---|');
    for (const id of B1_PROFILES) for (const v of B1_VARIANTS.map((x) => x.id)) { const m = by(v, id, w); if (m) out.push(`| ${id} | ${v} | ${f1(m.volume.chest?.planned)} | ${f1(m.volume.shoulders?.planned)} | ${f1(m.volume.arms?.planned)} \\| ${f1(m.variantCount.arms)} | ${f1(deficit(m))} | ${String(m.isolationChanges)} / ${String(m.isolationOscillations)} | ${String(m.mainChanges)} | ${String(m.duration.max)} |`); }
  }

  for (const w of weeks) {
    if (!RED_PROFILES.some((id) => by('RED-GUARD', id, w))) continue;
    out.push('', `## E — redistribution, ${String(w)} semaines`, '', '| Profil | Variante | Non placées | Quadriceps | Ischios | Fessiers | Mollets | Tronc | Pectoraux | Dos | Déficit | Durée max (limite) | Squat |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const id of RED_PROFILES) for (const v of RED_VARIANTS.map((x) => x.id)) { const m = by(v, id, w); if (m) out.push(`| ${id} | ${v} | ${String(m.refused)} | ${['quads', 'hamstrings', 'glutes', 'calves', 'core', 'chest', 'back'].map((g) => f1(m.volume[g]?.planned)).join(' | ')} | ${f1(deficit(m))} | ${String(m.duration.max)} (${String(m.duration.limit)}) | ${ld(m, 'back_squat')} |`); }
  }

  out.push('', '## Contrôles transverses', '', '| Variante | Semaines | Profils / scénarios | Erreurs | Sous 36 h | Durée au-delà | Violations |', '|---|---|---|---|---|---|---|');
  for (const w of weeks) for (const v of [...new Set(all.filter((m) => m.weeks === w).map((m) => m.variant))]) { const ms = all.filter((m) => m.variant === v && m.weeks === w); out.push(`| ${v} | ${String(w)} | ${String(ms.length)} | ${String(sum(ms, (m) => m.errors))} | ${String(sum(ms, (m) => m.recoveryUnder36))} | ${String(sum(ms, (m) => m.duration.over))} | ${String(sum(ms, (m) => m.constraintViolations))} |`); }
  return `${out.join('\n')}\n`;
}
