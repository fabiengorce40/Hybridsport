/**
 * Reprise RC5 lot 4.3 (Q8 / R4) — comparaison des variantes de lecture des séances allégées dans le MODÈLE RÉDUIT
 * `r4-model.ts` (moteur actif NON modifié, R4 NON intégré). Rapport : `__reports__/lot43-r4-model.md`.
 * Invariants vérifiés ici (propriétés du modèle, document 10 § 7) ; les écarts au cahier des charges sont DOCUMENTÉS,
 * jamais masqués : R4 seul ignore la fatigue persistante du multisport dont toutes les séances sont allégées.
 */
import { describe, expect, it } from 'vitest';
import { R4_SCENARIOS, R4_VARIANTS, runR4 } from './r4-model.js';
import type { R4Result } from './r4-model.js';

const all: R4Result[] = R4_SCENARIOS.flatMap((sc) => R4_VARIANTS.map((v) => runR4(v, sc)));
const get = (v: string, sc: string) => all.find((r) => r.variant === v && r.scenario === sc) as R4Result;

function report(): string {
  const out = ['# Reprise RC5 lot 4.3 — R4 : variantes de lecture des séances allégées (modèle réduit, 12 semaines)', '',
    'Modèle `r4-model.ts` : règles autorégulées du moteur (classement, 2 preuves, e1RM lissé, pas de 2,5 kg, −10 % après 2 « en dessous », plafond de cycle 15 %), athlète Epley à capacité évolutive, fatigue du jour sur les séances allégées par interférence. Comparaison de RÈGLES, jamais une mesure physiologique.', '',
    'Colonnes : charge de départ → finale ; charge que la capacité RÉELLE permet en fin de période (répétitions et RIR de référence) ; hausses / baisses ; décisions prises SUR une séance allégée ; hausses au-delà de la capacité ; échecs juste après une hausse.', ''];
  for (const sc of R4_SCENARIOS) {
    out.push(`## ${sc.id} — ${sc.label}`, '', '| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |', '|---|---|---|---|---|---|---|');
    for (const v of R4_VARIANTS) { const r = get(v, sc.id); out.push(`| ${v} | ${String(r.startKg)} → ${String(r.finalKg)} | ${String(r.capacityKg)} | ${String(r.increases)} / ${String(r.decreases)} | ${String(r.increasesOnLightened)} / ${String(r.decreasesOnLightened)} | ${String(r.unjustifiedIncreases)} | ${String(r.failedAfterIncrease)} |`); }
    out.push('');
  }
  out.push('## Traces (exemples)', '');
  for (const [v, sc] of [['current', 'course-stagne'], ['r4', 'course-difficulte'], ['r4_floor_r3_safety', 'course-difficulte'], ['r4_floor', 'hyrox-progresse']] as const) {
    out.push(`### ${v} — ${sc}`, '', '| Exposition | Semaine | Charge | RIR prescrit / référence | Allégée | Réalisé (rép., RIR) | Classement | Décision | Pourquoi |', '|---|---|---|---|---|---|---|---|---|');
    for (const d of get(v, sc).trace) out.push(`| ${String(d.k + 1)} | S${String(d.week + 1)} | ${String(d.kg)} | ${String(d.prescribedRir)} / ${String(d.referenceRir)} | ${d.lightened ? 'oui' : 'non'} | ${String(d.reps)}, ${String(d.observedRir)} | ${d.outcome} | ${d.decision} | ${d.why} |`);
    out.push('');
  }
  return `${out.join('\n')}\n`;
}

describe('Q8 / R4 — modèle réduit, six variantes × dix scénarios', () => {
  it('rapport reproductible', async () => {
    await expect(report()).toMatchFileSnapshot('__reports__/lot43-r4-model.md');
  });
  it('séances normales (sans multisport) : toutes les variantes R4 identiques à la règle actuelle hors réévaluation R3', () => {
    for (const sc of ['normal-progresse', 'normal-stagne']) for (const v of R4_VARIANTS) expect([v, sc, get(v, sc).finalKg]).toEqual([v, sc, get('current', sc).finalKg]);
  });
  it('règle actuelle : décisions prises sur des séances allégées (constat) ; baisse artificielle de l’athlète qui stagne (Course)', () => {
    expect(get('current', 'course-progresse').increasesOnLightened + get('current', 'course-progresse').decreasesOnLightened).toBeGreaterThan(0);
    expect(get('current', 'course-stagne').finalKg).toBeLessThan(get('current', 'course-stagne').startKg);
  });
  it('R4 (toutes variantes) : aucune hausse décidée sur une séance allégée ; aucune baisse sauf règle de sécurité', () => {
    for (const r of all.filter((x) => x.variant !== 'current')) {
      expect([r.variant, r.scenario, r.increasesOnLightened]).toEqual([r.variant, r.scenario, 0]);
      if (r.variant !== 'r4_floor_r3_safety') expect([r.variant, r.scenario, r.decreasesOnLightened]).toEqual([r.variant, r.scenario, 0]);
    }
  });
  it('limite documentée : R4 sans règle de sécurité ignore la fatigue persistante (Course, athlète en difficulté) ; la proposition la prend en compte', () => {
    for (const v of ['r4', 'r4_floor', 'r4_r3', 'r4_floor_r3']) expect(get(v, 'course-difficulte').finalKg).toBe(100);
    const s = get('r4_floor_r3_safety', 'course-difficulte');
    expect(s.finalKg).toBeLessThan(100);
    expect(s.finalKg).toBeGreaterThanOrEqual(s.capacityKg - 2.5);
  });
  it('exception plancher multisport : progression reconnue en HYROX (une séance sur deux allégée), jamais au-delà de la capacité', () => {
    for (const v of ['r4_floor', 'r4_floor_r3', 'r4_floor_r3_safety']) {
      const r = get(v, 'hyrox-progresse');
      expect(r.finalKg).toBeGreaterThan(r.startKg);
      expect(r.unjustifiedIncreases).toBe(0);
    }
    expect(get('r4', 'hyrox-progresse').finalKg).toBe(100);
  });
  it('traces : chaque décision expliquée ; déterminisme', () => {
    for (const r of all) for (const d of r.trace) expect(d.why.length).toBeGreaterThan(0);
    expect(R4_SCENARIOS.flatMap((sc) => R4_VARIANTS.map((v) => runR4(v, sc)))).toEqual(all);
  });
});
