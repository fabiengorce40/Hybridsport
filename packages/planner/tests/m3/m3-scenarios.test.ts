/**
 * M3 — scénarios d'arbitrage multisport par le planificateur RÉEL et les quatre moteurs RÉELS (Strength, Running,
 * Cross-training C3, HYROX H2). Chaque scénario : AVANT (V2, aucune politique M3) / APRÈS (politique M3 TEST_ONLY).
 * Invariants vérifiés partout : une séance par jour, aucune séance supprimée ni ajoutée par M3, aucun jour indisponible
 * utilisé, toute décision et tout conflit restant tracés sur les séances concernées, déterminisme.
 * Rapport : __reports__/m3-scenarios.md. Valeurs : TEST_ONLY (aucune n'est une recommandation de récupération).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { GP_CODES } from '../../src/index.js';
import type { PlannedWeek, SportIntent } from '../../src/index.js';
import { D, arbitrationMd, beforeAfter, pairMd, planM3, weekTable } from '../m3-fixtures.js';
import type { Pair } from '../m3-fixtures.js';
import { M3_TEST_WINDOWS } from '../m3-governance.js';

const sections: string[] = [];
const planned = (w: PlannedWeek) => w.requests.filter((r) => r.status === 'planned');
const ids = (w: PlannedWeek) => planned(w).map((r) => r.requestId).sort();
const codes = (w: PlannedWeek, id: string) => (w.requests.find((r) => r.requestId === id)?.reasons ?? []).map((r) => r.code);

/** Invariants M3 (toute semaine APRÈS). */
export function invariants(p: Pair): void {
  const { before, after } = p;
  // Une séance par jour ; aucun jour indisponible.
  const dates = planned(after).map((r) => r.date);
  expect(new Set(dates).size).toBe(dates.length);
  for (const d of after.days) if (d.status === 'planned') expect(d.availableMinutes).toBeGreaterThan(0);
  // M3 ne supprime ni n'ajoute aucune séance (AVANT et APRÈS : mêmes demandes planifiées).
  expect(ids(after)).toEqual(ids(before));
  const a = after.arbitration;
  expect(a).toBeDefined();
  if (!a) return;
  expect(a.passes).toBeLessThanOrEqual(12);
  // Toute décision est tracée sur la séance décidée ; tout conflit restant sur chacun de ses membres planifiés.
  for (const d of a.decisions) expect(codes(after, d.requestId)).toContain(GP_CODES.M3_DECISION);
  for (const r of a.residual.filter((x) => !x.conflict.startsWith('NEIGHBOUR_REFRESH'))) {
    for (const m of (r.conflict.split('|')[2] ?? '').split(',')) if (planned(after).some((x) => x.requestId === m)) expect(codes(after, m)).toContain(GP_CODES.M3_CONFLICT_UNRESOLVED);
  }
  // Statut cohérent.
  if (a.initial.length === 0) expect(['ADMISSIBLE', 'PARTIAL']).toContain(a.status);
  if (a.status === 'RESOLVED') expect(a.residual).toEqual([]);
  // AVANT : aucune politique M3 ⇒ arbitrage indisponible, tracé (fail-closed), aucune décision.
  expect(before.arbitration?.status).toBe('POLICY_UNAVAILABLE');
  expect(before.arbitration?.decisions).toEqual([]);
}
const run = (title: string, note: string, demands: readonly SportIntent[], o: Parameters<typeof beforeAfter>[1] = {}): Pair => {
  const p = beforeAfter(demands, o);
  invariants(p);
  // Déterminisme : même entrée ⇒ même semaine.
  expect(JSON.stringify(beforeAfter(demands, o).after)).toBe(JSON.stringify(p.after));
  sections.push(pairMd(title, note, p));
  return p;
};
const decisionsOf = (w: PlannedWeek) => (w.arbitration?.decisions ?? []).map((d) => [d.action, d.requestId.slice(11), d.from.slice(8), d.to.slice(8), d.partner?.slice(11)]);

describe('M3 — scénarios A à G (AVANT / APRÈS)', () => {
  it('A — Strength 3 + Running 3 : protection du sport prioritaire gouvernée (SWAP refusé) puis autorisée', () => {
    const p = run('A — Strength ×3 + Running ×3 (Strength prioritaire)', 'Conflit `lower_knee` lundi (Strength, haut) / mardi (Running, haut) à 24 h. Running cède (rang). Le seul jour libre (samedi) crée une accumulation sam-dim-ven ; les échanges avec une séance Strength sont refusés (`protectPriority`) : conflit RÉSIDUEL visible, aucune suppression.', [D.strength(3), D.running(3)]);
    expect(p.after.arbitration?.status).toBe('PARTIAL');
    expect(p.after.arbitration?.residual[0]?.tried).toEqual(expect.arrayContaining(['MOVE:2026-10-10:NEW_M3_CONFLICT', 'RECOMPOSE:NO_ENGINE_LEVER']));
    const q = run('A′ — même semaine, `protectPriority: false` (décision humaine simulée)', 'Sans protection, la course du mardi échange son jour avec une séance Strength non clé : conflit résolu.', [D.strength(3), D.running(3)], { m3: { protectPriority: false } });
    expect(q.after.arbitration?.status).toBe('RESOLVED');
    expect(decisionsOf(q.after)).toEqual([['SWAP', 'running.2', '06', '08', 'strength.2']]);
  });

  it('B — HYROX + Running : la course facile cède à la séance HYROX clé (course compromise), MOVE', () => {
    const p = run('B — HYROX ×2 (course compromise, clé) + Running ×2', 'Conflit `lower_knee` / `lower_hip` / `locomotor_impact` lundi–mardi. Importance : HYROX `compromised_running` clé (table TEST_ONLY) ; la course standard cède et va au samedi.', [D.hyrox(2), D.running(2)]);
    expect(p.after.arbitration?.status).toBe('RESOLVED');
    expect(decisionsOf(p.after)).toEqual([['MOVE', 'running.2', '06', '10', undefined]]);
  });

  it('C — HYROX + Strength : Strength cède (séance HYROX clé), MOVE', () => {
    const p = run('C — HYROX ×2 + Strength ×2', 'Conflit `lower_knee` HYROX lundi / Strength mardi.', [D.hyrox(2), D.strength(2)]);
    expect(p.after.arbitration?.status).toBe('RESOLVED');
    expect(decisionsOf(p.after)[0]?.[0]).toBe('MOVE');
  });

  it('D — CT + Running : semaine admissible (48 h ≥ fenêtre moyenne), aucune décision', () => {
    const p = run('D — Cross-training ×2 + Running ×2', 'Aucune paire `high` à moins de 48 h : M3 ne fait rien (et le dit : ADMISSIBLE).', [D.ct(2), D.running(2)]);
    expect(p.after.arbitration?.status).toBe('ADMISSIBLE');
    expect(p.after.arbitration?.decisions).toEqual([]);
  });

  it('E — CT + HYROX : dans les deux ordres de priorité ; HYROX prioritaire ⇒ CT cède (MOVE)', () => {
    const e1 = run('E — Cross-training ×2 + HYROX ×2 (CT prioritaire)', 'Placement V2 déjà espacé : admissible.', [D.ct(2), D.hyrox(2)]);
    expect(e1.after.arbitration?.status).toBe('ADMISSIBLE');
    const e2 = run('E′ — HYROX ×2 + Cross-training ×2 (HYROX prioritaire)', 'CT (mardi) à 24 h de HYROX (lundi), `lower_knee` / `lower_hip` hauts : CT cède, déplacé au samedi (seul jour qui l’éloigne des deux séances HYROX). Aucun mouvement ni station choisi par M3.', [D.hyrox(2), D.ct(2)]);
    expect(e2.after.arbitration?.status).toBe('RESOLVED');
    expect(decisionsOf(e2.after)).toEqual([['MOVE', 'crosstraining.2', '06', '10', undefined]]);
    expect(e2.after.arbitration?.decisions.every((d) => d.requestId.includes('crosstraining'))).toBe(true);
  });

  it('F — quatre sports (Strength 2, Running 2, CT 1, HYROX 2) : semaine pleine (7/7), amélioration partielle honnête', () => {
    const p = run('F — Strength ×2 + Running ×2 + CT ×1 + HYROX ×2 (7 séances, 7 jours)', 'Aucun jour libre : seul SWAP est possible. Strength lundi cède à HYROX clé (importance avant rang) et échange avec CT ; l\'accumulation ven–sam–dim reste NON résolue (égalité Running/Running : aucun choix arbitraire).', [D.strength(2), D.running(2), D.ct(1), D.hyrox(2)]);
    expect(p.after.arbitration?.status).toBe('PARTIAL');
    expect(p.after.arbitration?.decisions.map((d) => d.action)).toEqual(['SWAP']);
    expect(p.after.arbitration?.residual.some((r) => r.cause.startsWith('NO_YIELDER'))).toBe(true);
    expect((p.after.arbitration?.initial.length ?? 0)).toBeGreaterThan(p.after.arbitration?.residual.filter((r) => !r.conflict.startsWith('NEIGHBOUR')).length ?? 0);
  });

  it('G — semaine impossible (3 jours consécutifs, 6 séances) : non planifiées tracées, conflits restants visibles, aucune suppression', () => {
    const p = run('G — semaine impossible : HYROX ×2 + Running ×2 + Strength ×2 sur lun–mar–mer', 'Trois jours pour six séances : trois demandes non planifiées (`slot_unavailable`, déjà V2). Sur les trois jours, conflits `lower_knee` : aucun jour libre, échanges refusés (priorité protégée), recomposition Strength sans effet : RÉSIDUS visibles.', [D.hyrox(2), D.running(2), D.strength(2)], { minutes: [60, 60, 60, 0, 0, 0, 0] });
    expect(p.after.arbitration?.status).toBe('PARTIAL');
    expect(planned(p.after)).toHaveLength(3);
    expect(p.after.arbitration?.residual.flatMap((r) => r.tried)).toEqual(expect.arrayContaining(['MOVE:NO_FREE_DAY', 'SWAP:PRIORITY_PROTECTED']));
  });
});

describe('M3 — paires, triplets, objectif réel, disponibilités, fenêtres', () => {
  it('Strength Lower vs Running qualité (KEY composé par Running) : la séance clé est préservée', () => {
    const p = run('Paire — Running qualité (KEY, composée) + Strength', 'Running compose KEY / EASY ; la séance KEY est clé (table TEST_ONLY). Strength (standard) à côté d\'une KEY cède.', [D.runningComposed(2), D.strength(2)], { composedRunning: true });
    for (const d of p.after.arbitration?.decisions ?? []) expect(p.after.requests.find((r) => r.requestId === d.requestId)?.composition?.role).not.toBe('KEY');
  });

  it('CT + Strength, CT + Running, triplets : invariants et traces', () => {
    run('Paire — Cross-training + Strength', 'Deux sports chargés.', [D.ct(1), D.strength(2)]);
    run('Triplet — HYROX + Running + Strength', 'Objectif course-hybride.', [D.hyrox(2), D.running(2), D.strength(1)]);
    run('Triplet — Strength + Running + CT', 'Force d\'abord.', [D.strength(2), D.running(2), D.ct(1)]);
    run('Triplet — CT + HYROX + Running', 'Deux sports à stations + course.', [D.ct(1), D.hyrox(2), D.running(2)]);
  });

  const REAL: readonly SportIntent[] = [D.hyrox(2), D.runningComposed(2), D.strength(2), D.ct(1)];
  it('objectif réel (HYROX principal, Running important, Strength support, CT complémentaire) et variantes de disponibilité', () => {
    const variants: [string, readonly number[]][] = [
      ['très ouverte (7 × 90 min)', [90, 90, 90, 90, 90, 90, 90]],
      ['5 jours', [60, 60, 60, 0, 60, 0, 90]],
      ['4 jours', [60, 0, 60, 0, 60, 0, 90]],
      ['jours fixes (lun / mer / ven / dim)', [60, 0, 60, 0, 60, 0, 60]],
      ['créneaux courts (30 min)', [30, 30, 30, 30, 30, 30, 30]],
      ['aucune solution parfaite (3 jours consécutifs)', [0, 0, 0, 0, 60, 60, 60]],
    ];
    const rows: string[] = ['| disponibilité | planifiées | conflits initiaux | décisions | résidus | statut |', '|---|---|---|---|---|---|'];
    for (const [label, minutes] of variants) {
      const p = run(`Objectif réel — ${label}`, 'Priorités déclarées : HYROX, Running (composé), Strength, CT.', REAL, { minutes, composedRunning: true });
      const a = p.after.arbitration;
      rows.push(`| ${label} | ${planned(p.after).length} / 7 | ${a?.initial.length ?? 0} | ${(a?.decisions ?? []).map((d) => d.action).join(', ') || '—'} | ${a?.residual.length ?? 0} | ${a?.status ?? ''} |`);
    }
    sections.push(['## Objectif réel — synthèse des disponibilités', '', ...rows, ''].join('\n'));
  });

  it('fenêtres TEST_ONLY proche / moyenne / lointaine : effet visible sur la même semaine', () => {
    const rows = ['| fenêtre | heures | conflits initiaux | décisions | résidus | statut |', '|---|---|---|---|---|---|'];
    const statuses: string[] = [];
    for (const window of ['near', 'medium', 'far'] as const) {
      const w = planM3([D.hyrox(2), D.running(2)], { m3: { window } });
      const a = w.arbitration;
      statuses.push(a?.status ?? '');
      rows.push(`| ${window} | ${M3_TEST_WINDOWS[window]} | ${a?.initial.length ?? 0} | ${(a?.decisions ?? []).map((d) => `${d.action} ${d.requestId.slice(11)}`).join(', ') || '—'} | ${a?.residual.length ?? 0} | ${a?.status ?? ''} |`);
      sections.push(`### Fenêtre ${window} (${M3_TEST_WINDOWS[window]} h) — HYROX ×2 + Running ×2\n\n${weekTable(w)}\n\n${arbitrationMd(w)}\n`);
    }
    // Proche (24 h) : 24 h n'est pas < 24 h ⇒ aucun conflit ; moyenne : conflit résolu ; lointaine : davantage de conflits.
    expect(statuses[0]).toBe('ADMISSIBLE');
    expect(statuses[1]).toBe('RESOLVED');
    sections.push(['## Fenêtres TEST_ONLY — synthèse', '', 'Valeurs de DÉMONSTRATION (proche / moyenne / lointaine), jamais une recommandation.', '', ...rows, ''].join('\n'));
  });
});

afterAll(() => {
  const path = new URL('./__reports__/m3-scenarios.md', import.meta.url).pathname;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, ['# M3 — scénarios d’arbitrage multisport (AVANT / APRÈS)', '', '> Politique M3 TEST_ONLY (draft, provisoire) : règles, fenêtres, actions, importance et borne de passes de DÉMONSTRATION. Profil `KH↑↓AIsG` : lower_knee, lower_hip, upper_push, upper_pull, axial, locomotor_impact, high_intensity_systemic, grip (`·` none, `L` low, `M` moderate, `H` high).', '', ...sections].join('\n'));
});
