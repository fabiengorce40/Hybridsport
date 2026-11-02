/**
 * Reprise RC5 lot 4.5 — rapport Markdown reproductible du banc de validation (`rc5-lot45-bench.test.ts`).
 */
import type { Lot44Measure } from './lot44-bench.js';
import type { Lot45Measure } from './lot45-bench.js';
import { B_VARIANTS, C_VARIANTS, CANDIDATE_VARIANTS, D_VARIANTS } from './lot45-bench.js';

const f1 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));
const ld = (m: Lot44Measure, k: string) => { const x = m.loads[k]; return x ? `${x.first} → ${x.last} (↓${String(x.drops)})` : '—'; };
const G = ['chest', 'back', 'shoulders', 'arms', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];
const deficit = (m: Lot44Measure) => Math.round(Object.values(m.volume).reduce((n, g) => n + (g.target !== null ? Math.max(0, g.target - g.planned) : 0), 0) * 10) / 10;
const belowFloor = (m: Lot44Measure) => Object.values(m.volume).filter((g) => g.target !== null && g.planned < g.target - 1e-9).length;
const atHigh = (m: Lot44Measure) => Object.values(m.volume).filter((g) => g.high !== null && g.planned >= g.high - 1e-9).length;

export function reportLot45(all: readonly Lot45Measure[], ref44: readonly Lot44Measure[]): string {
  const by = (v: string, id: string) => all.find((m) => m.variant === v && m.id === id);
  const profiles = [...new Set(all.filter((m) => !m.id.startsWith('E-')).map((m) => m.id))];
  const scenarios = [...new Set(all.filter((m) => m.id.startsWith('E-')).map((m) => m.id))];
  const out = ['# Reprise RC5 lot 4.5 — banc de validation (12 semaines)', '',
    'Variantes de SIMULATION (jamais activées). `A` = moteur actif du lot 4.5 (référence RIR liée à la prescription). Comparaison de règles, aucune conclusion physiologique.', '',
    ...[...B_VARIANTS, ...C_VARIANTS, ...D_VARIANTS, ...CANDIDATE_VARIANTS].map((v) => `- **${v.id}** : ${v.label}`), ''];

  out.push('## A — écarts du moteur actif face au lot 4.4 (341fa1f), 20 profils', '', '| Profil | Volumes | Séances prévues / refusées | Charges modifiées (4.4 → 4.5) |', '|---|---|---|---|');
  for (const id of profiles) {
    const a = by('A', id); const r = ref44.find((x) => x.variant === 'A' && x.id === id);
    if (!a || !r) continue;
    const loads = Object.keys({ ...a.loads, ...r.loads }).filter((k) => JSON.stringify(a.loads[k]) !== JSON.stringify(r.loads[k])).map((k) => `${k} ${ld(r, k)} → ${ld(a, k)}`);
    out.push(`| ${id} | ${JSON.stringify(a.volume) === JSON.stringify(r.volume) ? 'identiques' : 'MODIFIÉS'} | ${a.planned === r.planned && a.refused === r.refused ? 'identiques' : `${String(r.planned)}/${String(r.refused)} → ${String(a.planned)}/${String(a.refused)}`} | ${loads.join(' ; ') || '—'} |`);
  }

  out.push('', '## B — politiques de progression (moteur réel ; principaux : départ → fin, baisses)', '', '| Scénario | Variante | Squat | SDL roumain | Développé couché | Militaire | Rowing poulie | Hausses | Baisses | En dessous juste après une hausse | Au-dessus juste après une baisse | Suspendues | Référence RIR établie / inconnue |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const id of scenarios) for (const v of B_VARIANTS.map((x) => x.id)) {
    const m = by(v, id); if (!m) continue;
    out.push(`| ${id} | ${v} | ${ld(m, 'back_squat')} | ${ld(m, 'romanian_deadlift')} | ${ld(m, 'bench_press')} | ${ld(m, 'barbell_ohp')} | ${ld(m, 'seated_cable_row')} | ${String(m.progression.ADVANCED ?? 0)} | ${String(m.progression.REGRESSED ?? 0)} | ${String(m.belowAfterIncrease)} | ${String(m.aboveAfterDecrease)} | ${String(m.suspended)} | ${String(m.referenceKnown)} / ${String(m.referenceUnknown)} |`);
  }
  out.push('', '### B — synthèse par variante (somme sur les scénarios)', '', '| Variante | Hausses | Baisses | En dessous après hausse | Au-dessus après baisse | Suspendues |', '|---|---|---|---|---|---|');
  for (const v of B_VARIANTS.map((x) => x.id)) {
    const ms = scenarios.map((id) => by(v, id)).filter((m): m is Lot45Measure => m !== undefined);
    out.push(`| ${v} | ${String(ms.reduce((n, m) => n + (m.progression.ADVANCED ?? 0), 0))} | ${String(ms.reduce((n, m) => n + (m.progression.REGRESSED ?? 0), 0))} | ${String(ms.reduce((n, m) => n + m.belowAfterIncrease, 0))} | ${String(ms.reduce((n, m) => n + m.aboveAfterDecrease, 0))} | ${String(ms.reduce((n, m) => n + m.suspended, 0))} |`);
  }

  out.push('', '## C — B1 et réévaluation des isolations (séries prévues / semaine, registre | convention de la variante ; cible)', '', `| Profil | Variante | ${G.slice(0, 7).join(' | ')} | Isolations : changements / oscillations | Principaux changés | Durée max | Violations |`, `|---|---|${G.slice(0, 7).map(() => '---|').join('')}---|---|---|---|`);
  for (const id of profiles) for (const v of ['A', ...C_VARIANTS.map((x) => x.id), 'CAND-B1ISO']) {
    const m = by(v, id); if (!m) continue;
    out.push(`| ${id} | ${v} | ${G.slice(0, 7).map((g) => `${f1(m.volume[g]?.planned)} \\| ${f1(m.variantCount[g])} (${f1(m.volume[g]?.target)})`).join(' | ')} | ${String(m.isolationChanges)} / ${String(m.isolationOscillations)} | ${String(m.mainChanges)} | ${String(m.duration.max)} (${String(m.duration.limit)}) | ${String(m.constraintViolations)} |`);
  }

  out.push('', '## D — redistribution (profils avec séances non placées ; séries prévues / semaine)', '', `| Profil | Variante | Non placées | ${G.join(' | ')} | Déficit total | Groupes sous la cible | Groupes à la borne haute | Durée max (limite) | Charges du squat |`, `|---|---|---|${G.map(() => '---|').join('')}---|---|---|---|---|`);
  const withUnplaced = profiles.filter((id) => (by('A', id)?.refused ?? 0) > 0);
  for (const id of withUnplaced) for (const v of ['A', ...D_VARIANTS.map((x) => x.id), 'CAND-RED-GUARD']) {
    const m = by(v, id); if (!m) continue;
    out.push(`| ${id} | ${v} | ${String(m.refused)} | ${G.map((g) => f1(m.volume[g]?.planned)).join(' | ')} | ${f1(deficit(m))} | ${String(belowFloor(m))} | ${String(atHigh(m))} | ${String(m.duration.max)} (${String(m.duration.limit)}) | ${ld(m, 'back_squat')} |`);
  }
  const unchanged = profiles.filter((id) => !withUnplaced.includes(id) && D_VARIANTS.every((v) => { const m = by(v.id, id); const a = by('A', id); return !m || !a || JSON.stringify(m.volume) === JSON.stringify(a.volume); }));
  out.push('', `Profils sans séance non placée, redistribution sans effet (volumes identiques à A, toutes variantes D) : ${unchanged.join(', ') || '—'}.`);

  out.push('', '## Contrôles transverses', '', '| Variante | Profils / scénarios | Erreurs | Sous 36 h | Durée au-delà | Violations matériel / exclusions |', '|---|---|---|---|---|---|');
  for (const v of [...new Set(all.map((m) => m.variant))]) { const ms = all.filter((m) => m.variant === v); out.push(`| ${v} | ${String(ms.length)} | ${String(ms.reduce((n, m) => n + m.errors, 0))} | ${String(ms.reduce((n, m) => n + m.recoveryUnder36, 0))} | ${String(ms.reduce((n, m) => n + m.duration.over, 0))} | ${String(ms.reduce((n, m) => n + m.constraintViolations, 0))} |`); }
  return `${out.join('\n')}\n`;
}
