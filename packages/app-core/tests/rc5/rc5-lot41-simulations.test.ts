/**
 * Reprise RC5 lot 4.1 — SIMULATIONS COMPARATIVES 12 semaines (TEST_ONLY), 14 profils, même banc (`lot41-bench.ts`) :
 * - référence FIGÉE du lot 4 : `__reports__/lot41-reference-lot4.json`, produite par ce banc sur le commit 0680831 ;
 * - rapport : `__reports__/lot41-simulations.md` (tableaux de volume cible / prévu / réalisé / écart / cause, charges,
 *   durées, refus, récupération, équilibre poussée / tirage et genou / hanche, stabilité).
 * Invariants (critères G du lot 4.1, jamais assouplis pour masquer une anomalie) : aucun refus nouveau, aucune séance
 * au-delà de sa durée, aucune séance de la même région sous 36 h, aucun groupe au-dessus de sa borne haute, groupe sous sa
 * cible jamais en baisse face au lot 4 hors anomalie DOCUMENTÉE (liste fermée, document 08 § 12), principaux aussi stables,
 * progression méritée reconnue, aucune baisse de charge ajoutée, jamais de hausse pour l'athlète en difficulté.
 * Observation algorithmique : aucune progression simulée n'est un gain physiologique.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lot41Specs, measureLot41 } from './lot41-bench.js';
import type { Lot41Measure } from './lot41-bench.js';

const reference = JSON.parse(readFileSync(new URL('./__reports__/lot41-reference-lot4.json', import.meta.url), 'utf8')) as Lot41Measure[];
const current = lot41Specs().map((s) => measureLot41(s));
const ref = (id: string) => { const r = reference.find((x) => x.id === id); if (!r) throw new Error(`référence absente : ${id}`); return r; };
/**
 * Baisses de volume prévu face au lot 4 ADMISES parce qu'expliquées (liste FERMÉE, document 08 § 12) :
 * - L41-H3 pectoraux : Full Body 3×, un seul emplacement de développé (alternance horizontal / vertical) et une seule
 *   isolation du haut (L1-V3), attribuée par ancienneté d'exposition ; les séries de développé (3 par séance) rendent le
 *   besoin « pectoraux » plus récent : l'isolation va aux épaules (5,7 → 7,8). Limite STRUCTURELLE, signalée par le bilan
 *   (« en dessous »), soumise à arbitrage.
 */
const ACCEPTED_DROPS: readonly string[] = ['L41-H3:chest'];
const TOL = 0.05;
const fmt = (n: number | null) => (n === null ? '—' : String(Math.round(n * 10) / 10));

function report(): string {
  const out = ['# Reprise RC5 lot 4.1 — simulations comparatives 12 semaines (lot 4 → lot 4.1)', '',
    'Banc `lot41-bench.ts`, athlète simulé à capacité réelle (charges de départ réalistes). Référence lot 4 figée : `lot41-reference-lot4.json`.',
    'Observation algorithmique : aucune progression simulée n’est un gain physiologique.', ''];
  for (const b of current) {
    const a = ref(b.id);
    out.push(`## ${b.id} — ${b.label}`, '');
    out.push(`- Séances : planifiées ${String(a.planned)} → ${String(b.planned)} ; refusées ${String(a.refused)} → ${String(b.refused)}${b.refusalCauses.length ? ` (${b.refusalCauses.join(', ')})` : ''} ; faites ${String(a.done)} → ${String(b.done)}.`);
    out.push(`- Durées estimées : moyenne ${fmt(a.duration.mean)} → ${fmt(b.duration.mean)} min ; maximum ${String(a.duration.max)} → ${String(b.duration.max)} min (limite ${String(b.duration.limit)}) ; au-delà : ${String(b.duration.over)}.`);
    out.push(`- Récupération (même région) : écart minimal ${fmt(b.recoveryMinH)} h ; sous 36 h : ${String(a.recoveryUnder36)} → ${String(b.recoveryUnder36)}.`);
    out.push(`- Équilibre (séries prévues / semaine, schéma principal) : poussée ${fmt(a.patterns.push)} → ${fmt(b.patterns.push)}, tirage ${fmt(a.patterns.pull)} → ${fmt(b.patterns.pull)} (rapport ${fmt(a.patterns.pushPull)} → ${fmt(b.patterns.pushPull)}) ; genou ${fmt(a.patterns.knee)} → ${fmt(b.patterns.knee)}, hanche ${fmt(a.patterns.hip)} → ${fmt(b.patterns.hip)} (rapport ${fmt(a.patterns.kneeHip)} → ${fmt(b.patterns.kneeHip)}).`);
    out.push(`- Stabilité : principaux changés ${String(a.mainChanges)} → ${String(b.mainChanges)} ; tous rangs ${String(a.exerciseChanges)} → ${String(b.exerciseChanges)} sur ${String(b.slotWeeks)} ; accessoires distincts par archétype ${fmt(a.accessoryVariety)} → ${fmt(b.accessoryVariety)} ; substitutions ${String(a.substitutions)} → ${String(b.substitutions)}.`);
    out.push(`- Suivis ${String(a.tracks)} → ${String(b.tracks)} (transférés ${String(a.transferred)} → ${String(b.transferred)}) ; erreurs du banc ${String(b.errors)}.`, '');
    out.push('| Groupe | Cible–haut | Prévu lot 4 | Prévu lot 4.1 | Réalisé lot 4.1 | Écart (séries) | Écart (%) | Fréquence | Cause |', '|---|---|---|---|---|---|---|---|---|');
    for (const [g, v] of Object.entries(b.volume)) {
      const gap = v.target === null ? null : v.planned - v.target;
      const cause = v.target === null ? '—' : v.planned >= v.target - TOL ? 'atteinte' : v.limitedBy.length ? `borne haute : ${v.limitedBy.join(', ')}` : ACCEPTED_DROPS.includes(`${b.id}:${g}`) ? 'structure de séance (doc 08)' : 'emplacements / durée / jours';
      out.push(`| ${g} | ${fmt(v.target)}–${fmt(v.high)} | ${fmt(a.volume[g]?.planned ?? null)} | ${fmt(v.planned)} | ${fmt(v.done)} | ${gap === null ? '—' : fmt(gap)} | ${gap === null || !v.target ? '—' : `${String(Math.round((gap / v.target) * 100))} %`} | ${fmt(v.frequency)} | ${cause} |`);
    }
    out.push('', '| Exercice (2 premiers de séance) | Lot 4 : première → dernière (n, baisses) | Lot 4.1 : première → dernière (n, baisses) |', '|---|---|---|');
    for (const ex of [...new Set([...Object.keys(a.loads), ...Object.keys(b.loads)])].sort()) {
      const l = (m: Lot41Measure) => { const x = m.loads[ex]; return x ? `${x.first} → ${x.last} kg (${String(x.n)}, ${String(x.drops)})` : '—'; };
      out.push(`| ${ex} | ${l(a)} | ${l(b)} |`);
    }
    out.push('');
  }
  return `${out.join('\n')}\n`;
}

describe('Reprise RC5 lot 4.1 — simulations comparatives (14 profils)', () => {
  it('rapport comparatif (référence figée)', async () => {
    await expect(report()).toMatchFileSnapshot('__reports__/lot41-simulations.md');
  });

  it('aucun refus nouveau (nombre et causes), aucune erreur du banc', () => {
    for (const b of current) {
      expect([b.id, b.refused <= ref(b.id).refused]).toEqual([b.id, true]);
      for (const c of b.refusalCauses) expect([b.id, ref(b.id).refusalCauses]).toEqual([b.id, expect.arrayContaining([c])]);
      expect([b.id, b.errors]).toEqual([b.id, 0]);
    }
  });

  it('durée déclarée respectée ; aucune séance de la même région sous 36 h', () => {
    for (const b of current) expect([b.id, b.duration.over, b.recoveryUnder36]).toEqual([b.id, 0, 0]);
  });

  it('aucun groupe au-dessus de sa borne haute (moyenne hebdomadaire prévue)', () => {
    for (const b of current) for (const [g, v] of Object.entries(b.volume)) if (v.high !== null) expect([b.id, g, v.planned <= v.high + TOL]).toEqual([b.id, g, true]);
  });

  it('volume prévu jamais en baisse face au lot 4, hors anomalie documentée (liste fermée)', () => {
    const drops = current.flatMap((b) => Object.entries(b.volume).filter(([g, v]) => v.planned < (ref(b.id).volume[g]?.planned ?? 0) - TOL).map(([g]) => `${b.id}:${g}`));
    expect(drops).toEqual(ACCEPTED_DROPS);
  });

  it('volume relevé là où le lot 4 l’effondrait : dos et pectoraux du profil L4-1', () => {
    const b = current.find((x) => x.id === 'L4-1');
    expect(b?.volume.back?.planned).toBeGreaterThanOrEqual(2 * (ref('L4-1').volume.back?.planned ?? 0));
    expect(b?.volume.chest?.planned).toBeGreaterThanOrEqual(9);
  });

  it('cible manquée faute de borne haute d’un autre groupe : toujours signalée (`limitedBy`)', () => {
    const flagged = current.flatMap((b) => Object.entries(b.volume).filter(([, v]) => v.limitedBy.length > 0).map(([g]) => `${b.id}:${g}`));
    expect(flagged.length).toBeGreaterThan(0);
    for (const b of current) for (const [g, v] of Object.entries(b.volume)) if (v.limitedBy.length > 0) expect([b.id, g, v.limitedBy.includes(g)]).toEqual([b.id, g, false]);
  });

  it('principaux aussi stables qu’au lot 4 (aucun changement supplémentaire)', () => {
    for (const b of current) expect([b.id, b.mainChanges <= ref(b.id).mainChanges]).toEqual([b.id, true]);
  });

  it('progression : méritée reconnue, jamais de baisse quand l’athlète progresse ; jamais de hausse quand il recule', () => {
    const main = ['back_squat', 'bench_press', 'romanian_deadlift', 'barbell_ohp'];
    const hist = current.find((x) => x.id === 'L41-HIST');
    for (const ex of ['back_squat', 'romanian_deadlift', 'barbell_ohp']) expect(Number(hist?.loads[ex]?.last)).toBeGreaterThan(Number(hist?.loads[ex]?.first));
    // Aucune baisse AJOUTÉE face au lot 4. Seule baisse existante (identique au lot 4) : L4-2 développé militaire
    // 47,5 → 42,5 kg en S8 — palier de 2,5 kg (5,5 % à 45 kg) supérieur à la capacité simulée (+0,5 %/sem.) : répétitions
    // manquées, réponse autorégulée attendue (document 08 § 7).
    // Lot 4.2 (liste FERMÉE, document 09 § Q3 et Q8) : L41-RUN obtient sa 4ᵉ séance (jour Musculation n'est plus pris par la
    // Course) ; ses séances Bas, allégées par l'interférence de la Course (RIR relevé), voient la charge monter puis
    // redescendre — hausse décidée sur des séances allégées, sans R4 (conflit scientifique ouvert, non modifié ici).
    const ACCEPTED_LOAD_DROPS = ['L41-RUN:back_squat', 'L41-RUN:romanian_deadlift'];
    for (const b of current.filter((x) => x.id !== 'L41-DIFF')) for (const ex of main) if (b.loads[ex] && !ACCEPTED_LOAD_DROPS.includes(`${b.id}:${ex}`)) expect([b.id, ex, (b.loads[ex]?.drops ?? 0) <= (ref(b.id).loads[ex]?.drops ?? 0)]).toEqual([b.id, ex, true]);
    const diff = current.find((x) => x.id === 'L41-DIFF');
    for (const ex of main) if (diff?.loads[ex]) expect(Number(diff.loads[ex]?.last)).toBeLessThan(Number(diff.loads[ex]?.first));
    // Athlète qui stagne : charges des principaux identiques au lot 4 (aucune hausse artificielle introduite).
    const stag = current.find((x) => x.id === 'L41-STAG');
    for (const ex of main) expect(stag?.loads[ex]?.last).toBe(ref('L41-STAG').loads[ex]?.last);
  });
});
