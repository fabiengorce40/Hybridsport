/**
 * R1 / R2 — comparaison AVANT / APRÈS sur 4 semaines (même simulation `sim4.ts`, même profil, mêmes réponses).
 * AVANT : version de référence `88cf5da` (consolidation), métriques figées dans `fixtures/sim4-before-88cf5da.json`
 * (produites par ce même module sur ce commit). APRÈS : code courant.
 *
 * R1 — demande composite des séances Cross-training portant un bloc délégué (TEST_ONLY) ⇒ voisinage connu.
 * R2 — régénération lisant les historiques tels qu'à la planification + adaptation de la séance PERSISTÉE par le CORE.
 * Rapport : __reports__/r1-r2-avant-apres.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { simulate } from './sim4.js';
import type { SimResult, SimSession } from './sim4.js';

const before = JSON.parse(readFileSync(new URL('./fixtures/sim4-before-88cf5da.json', import.meta.url), 'utf8')) as SimResult;
const after = simulate();
const LOWER = ['quads', 'hamstrings', 'calves', 'glutes'];
// technical-constant: heures par jour (écart entre deux dates)
const H_PER_DAY = 24;
// technical-constant: fenêtre d'observation descriptive des paires de séances de force (72 h), sans valeur de règle
const OBSERVE_H = 72;
const DAY_MS = 86_400_000;
const gapH = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS) * H_PER_DAY;
const sum = (xs: readonly (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
const fmt = (n: number | undefined) => (n === undefined ? '0' : String(Math.round(n * 10) / 10));

/** Paires de séances de force EXÉCUTÉES à ≤ 72 h partageant des groupes (descriptif, aucune règle). */
function forcePairs(r: SimResult) {
  const force = r.sessions.filter((x) => x.execution === 'réalisée' && Object.keys(x.groups).length > 0);
  const out: { a: SimSession; b: SimSession; h: number; shared: { g: string; a: number; b: number }[] }[] = [];
  for (const [i, a] of force.entries()) {
    for (const b of force.slice(i + 1)) {
      const h = gapH(a.date, b.date);
      if (h <= 0 || h > OBSERVE_H) continue;
      const shared = Object.keys(a.groups).filter((g) => (a.groups[g] ?? 0) > 0 && (b.groups[g] ?? 0) > 0).sort().map((g) => ({ g, a: a.groups[g] ?? 0, b: b.groups[g] ?? 0 }));
      if (shared.length > 0) out.push({ a, b, h, shared });
    }
  }
  return out;
}
const kind = (x: SimSession) => (x.sport === 'strength' ? 'Musculation' : 'bloc force CT');

describe('R1 / R2 — avant / après sur 4 semaines', () => {
  it('A-1. sécurité : aucune séance exécutée ne sollicite une zone exclue (avant ET après, exercice par exercice, tous blocs)', () => {
    for (const r of [before, after]) for (const x of r.sessions) expect(x.violations).toEqual([]);
    // Semaine 3 (genou P2 déclaré puis connu) : chaque séance réalisée est auditée.
    const w3 = after.sessions.filter((x) => x.week === 3 && x.execution === 'réalisée');
    expect(w3.length).toBeGreaterThan(0);
    for (const x of w3) {
      expect(x.excludedAreas).toContain('knee');
      for (const e of x.exercises) expect(e.areas).not.toContain('knee');
    }
  });

  it('A-2. R1 : volume du bas du corps PLANIFIÉ rétabli (semaines sans douleur), jamais au-delà du plus haut de (avant, haut gouverné)', () => {
    for (const w of [0, 1, 3]) {
      const b = before.weeks[w]?.planned ?? {}; const a = after.weeks[w]?.planned ?? {};
      expect(sum(LOWER.map((g) => a[g]?.planned ?? 0))).toBeGreaterThan(sum(LOWER.map((g) => b[g]?.planned ?? 0)));
    }
    for (const [w, wk] of after.weeks.entries()) {
      for (const [g, v] of Object.entries(wk.planned)) {
        const ref = Math.max(before.weeks[w]?.planned[g]?.planned ?? 0, v.high ?? Number.POSITIVE_INFINITY);
        expect(v.planned).toBeLessThanOrEqual(ref);
      }
    }
  });

  it('A-3. R1 : arbitrage M3 actif (plus jamais BLOCKED par une demande indisponible)', () => {
    expect(before.weeks.every((w) => w.m3.status === 'BLOCKED')).toBe(true);
    expect(after.weeks.some((w) => w.m3.status === 'BLOCKED')).toBe(false);
  });

  it('A-4. R2 : plus de séances reproductibles ; aucune adaptation ne monte le volume', () => {
    const rep = (r: SimResult) => r.sessions.filter((x) => x.sport === 'strength' && x.reproducible === 'oui').length;
    expect(rep(after)).toBeGreaterThan(rep(before));
    for (const x of after.sessions) for (const c of x.changes.filter((y) => y.startsWith('sets:'))) {
      const [a0, b0] = (c.split(':')[2] ?? '').split('>').map(Number);
      expect(b0 ?? 0).toBeLessThanOrEqual(a0 ?? 0);
    }
  });

  it('A-5. rapport', () => {
    const L: string[] = ['# R1 / R2 — comparaison avant / après sur 4 semaines', '',
      '> Même simulation (`sim4.ts`), même profil (prise de masse 3×/sem., Running 2×, Cross-training 1× « force + conditionnement », salle commerciale), mêmes réponses au contrôle pré-séance. **Avant** : `88cf5da` (consolidation). **Après** : R1 (demande composite, TEST_ONLY) + R2 (fidélité de régénération, adaptation de la séance persistée). Valeurs sportives inchangées.', ''];
    // 1. Séances
    L.push('## 1. Séances (avant → après)', '', '| sem. | jour | sport | séance (après) | reproductible | contrôle | décision | adaptation | changements (après) | durée cible / estimée prévue / estimée exécutée (min) | exécution |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const [i, a] of after.sessions.entries()) {
      const b = before.sessions[i];
      const same = (f: (x: SimSession) => string) => (b && f(b) !== f(a) ? `${f(b)} → **${f(a)}**` : f(a));
      L.push(`| ${String(a.week)} | ${a.date.slice(5)} | ${a.sport} | ${a.title} | ${same((x) => x.reproducible)} | ${a.declared} | ${same((x) => x.decision)} | ${same((x) => x.adaptation)} | ${a.changes.join(', ') || '—'} | ${String(a.targetMin ?? '—')} / ${same((x) => String(x.plannedEstMin ?? '—'))} / ${same((x) => String(x.executedEstMin ?? '—'))} | ${same((x) => x.execution)} |`);
    }
    // 2. Audit douleur
    L.push('', '## 2. Audit douleur exercice par exercice (séances avec zone exclue, après)', '', 'Zones exclues recalculées par les règles G1 du CORE à partir du contrôle (douleurs déclarées + connues reportées) ; zones de chaque exercice lues dans le catalogue de la discipline de la séance, tous blocs (échauffement, force, accessoires, conditionnement, retour au calme).', '');
    for (const x of after.sessions.filter((y) => y.excludedAreas.length > 0)) {
      L.push(`- **${x.date} ${x.sport}** (${x.declared}) — zones exclues : ${x.excludedAreas.join(', ')} — ${x.execution} — violations : ${x.violations.length === 0 ? 'aucune' : x.violations.join(', ')}`);
      if (x.exercises.length > 0) L.push(`  - ${x.exercises.map((e) => `${e.id} [${e.block}] (${e.areas.join('/') || '—'})`).join(' · ')}`);
    }
    L.push('', `Avant comme après : **${String(sum([...before.sessions, ...after.sessions].map((x) => x.violations.length)))} violation**.`);
    // 3. Volumes
    L.push('', '## 3. Volumes par groupe (séries de travail) — planifié (bilan Strength) et exécuté (Musculation + blocs CT)', '');
    for (const [w, a] of after.weeks.entries()) {
      const b = before.weeks[w];
      const groups = [...new Set([...Object.keys(a.planned), ...Object.keys(b?.planned ?? {})])].sort();
      L.push(`### Semaine ${String(w + 1)}`, '', '| groupe | cible / haut | planifié avant → après | exécuté avant → après |', '|---|---|---|---|');
      for (const g of groups) {
        const pa = a.planned[g]; const pb = b?.planned[g];
        L.push(`| ${g} | ${String(pa?.target ?? pb?.target ?? '—')} / ${String(pa?.high ?? pb?.high ?? '—')} | ${fmt(pb?.planned)} → **${fmt(pa?.planned)}** (${pa?.status ?? '—'}) | ${fmt(b?.executed[g])} → **${fmt(a.executed[g])}** |`);
      }
      L.push('');
    }
    // 4. Durées
    L.push('## 4. Durées estimées (somme hebdomadaire, min)', '', '| semaine | prévue avant → après | exécutée avant → après |', '|---|---|---|');
    for (let w = 1; w <= after.weeks.length; w++) {
      const pick = (r: SimResult, f: (x: SimSession) => number | null) => sum(r.sessions.filter((x) => x.week === w).map(f));
      L.push(`| ${String(w)} | ${String(pick(before, (x) => x.plannedEstMin))} → ${String(pick(after, (x) => x.plannedEstMin))} | ${String(pick(before, (x) => x.executedEstMin))} → ${String(pick(after, (x) => x.executedEstMin))} |`);
    }
    // 5. Conflits, refus, adaptations
    const count = (r: SimResult, f: (x: SimSession) => boolean) => r.sessions.filter(f).length;
    L.push('', '## 5. Conflits, refus, adaptations', '', '| indicateur | avant | après |', '|---|---|---|',
      `| séances Musculation reproductibles au démarrage | ${String(count(before, (x) => x.sport === 'strength' && x.reproducible === 'oui'))} / 12 | ${String(count(after, (x) => x.sport === 'strength' && x.reproducible === 'oui'))} / 12 |`,
      `| adaptations par régénération (reproductible) | ${String(count(before, (x) => x.adaptation.startsWith('régénérée')))} | ${String(count(after, (x) => x.adaptation.startsWith('régénérée')))} |`,
      `| adaptations de la séance persistée (CORE) | ${String(count(before, (x) => x.adaptation.startsWith('séance persistée')))} | ${String(count(after, (x) => x.adaptation.startsWith('séance persistée')))} |`,
      `| recompositions signalées | ${String(count(before, (x) => x.adaptation.startsWith('recomposée')))} | ${String(count(after, (x) => x.adaptation.startsWith('recomposée')))} |`,
      `| ajustement d’état non appliqué | ${String(count(before, (x) => x.reasons.includes('ADAPTATION_NOT_APPLIED')))} | ${String(count(after, (x) => x.reasons.includes('ADAPTATION_NOT_APPLIED')))} |`,
      `| séances reportées (refus) | ${String(count(before, (x) => x.decision === 'postponed'))} | ${String(count(after, (x) => x.decision === 'postponed'))} |`,
      `| signaux de récupération (J+1, non résolus) | ${String(sum(before.weeks.map((w) => w.recovery.length)))} | ${String(sum(after.weeks.map((w) => w.recovery.length)))} |`,
      `| arbitrage M3 (statut par semaine) | ${before.weeks.map((w) => w.m3.status).join(' / ')} | ${after.weeks.map((w) => `${w.m3.status}${w.m3.residual > 0 ? ` (${String(w.m3.residual)} résidu)` : ''}`).join(' / ')} |`,
      '', 'Reports (après) :', ...after.sessions.filter((x) => x.decision === 'postponed').map((x) => `- ${x.date} ${x.sport} : ${x.reasons.join(', ')}`));
    // 6. Récupération
    L.push('', '## 6. Récupération : séances de force exécutées à ≤ 72 h partageant des groupes (après, descriptif)', '', 'Séries de travail par groupe de chaque séance ; aucune règle appliquée (`same_discipline_recovery` NON RÉSOLU).', '', '| séance A | séance B | écart (h) | groupes partagés (séries A / B) |', '|---|---|---|---|');
    for (const p of forcePairs(after)) L.push(`| ${p.a.date} ${kind(p.a)} | ${p.b.date} ${kind(p.b)} | ${String(p.h)} | ${p.shared.map((s) => `${s.g} ${fmt(s.a)}/${fmt(s.b)}`).join(', ')} |`);
    const path = new URL('./__reports__/r1-r2-avant-apres.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, L.join('\n'));
    expect(L.length).toBeGreaterThan(20);
  });
});
