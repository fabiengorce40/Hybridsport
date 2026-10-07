/**
 * M3 — simulation hebdomadaire de l'objectif réel (HYROX principal, Running important et composé, Strength support, CT
 * complémentaire) par le planificateur RÉEL : 4, 12 puis 52 semaines. L'historique transmis à la semaine suivante porte
 * le statut CONNU des séances (réalisée, abandonnée, manquée — motif TEST_ONLY déterministe, dont une HYROX arrêtée au
 * time cap comptée réalisée et modifiée) : la politique TEST_ONLY ne compte que réalisées / abandonnées. Mesure aussi
 * la taille de l'arbitrage persisté (forme compacte) et la stabilité (déterminisme sur toute la série).
 * Limite : les moteurs n'apprennent pas ici des réalisations (boucle complète : app-core, m3-beta0.test.ts).
 * Rapports : __reports__/m3-simulation.md, __reports__/m3-state-size.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PlannedWeek, PlannerInput } from '../../src/index.js';
import { D, addDaysIso, planM3 } from '../m3-fixtures.js';

const REAL = [D.hyrox(2), D.runningComposed(2), D.strength(2), D.ct(1)];
// technical-constant: TEST_ONLY — disponibilité de l'athlète (minutes, lundi → dimanche) : 6 jours, dimanche long
const MINUTES = [60, 60, 60, 0, 60, 60, 90];
const STATUSES = ['executed', 'executed', 'abandoned', 'executed', 'missed', 'executed', 'executed'] as const;
// technical-constant: octets par Kio (affichage)
const KIB = 1024;

interface Sim { readonly weeks: readonly PlannedWeek[]; readonly recents: readonly PlannerInput['recent'][] }
function simulate(n: number): Sim {
  const weeks: PlannedWeek[] = [];
  const recents: PlannerInput['recent'][] = [];
  let recent: PlannerInput['recent'] = [];
  for (let k = 0; k < n; k += 1) {
    recents.push(recent);
    const w = planM3(REAL, { weekStart: addDaysIso('2026-10-05', 7 * k), minutes: MINUTES, composedRunning: true, recent });
    weeks.push(w);
    // Statut CONNU de chaque séance (motif TEST_ONLY décalé chaque semaine) ; jamais « réalisée » par défaut.
    recent = w.requests.flatMap((r, j) => (r.status === 'planned' ? [{ date: r.date, sport: r.sport, session: r.session, status: STATUSES[(j + k) % STATUSES.length] ?? 'planned' }] : []));
  }
  return { weeks, recents };
}
const size = (x: unknown): number => JSON.stringify(x ?? null).length;
/** Forme persistée compacte (comme app-core `persistWeek`) : sans les raisons de gouvernance. */
const compact = (w: PlannedWeek) => (w.arbitration ? { ...w.arbitration, reasons: undefined } : null);

function table(sim: Sim): string[] {
  const rows = ['| semaine | planifiées | conflits initiaux | décisions | résidus | conflits avec l’historique | statut |', '|---|---|---|---|---|---|---|'];
  for (const w of sim.weeks) {
    const a = w.arbitration;
    rows.push(`| ${w.weekStart} | ${w.requests.filter((r) => r.status === 'planned').length} / 7 | ${a?.initial.length ?? 0} | ${(a?.decisions ?? []).map((d) => `${d.action} ${d.requestId.slice(11)}`).join(', ') || '—'} | ${a?.residual.length ?? 0} | ${(a?.initial ?? []).filter((c) => c.includes('history.')).length} | ${a?.status ?? ''} |`);
  }
  return rows;
}

describe('M3 — simulation de l\'objectif réel', () => {
  const s12 = simulate(12);
  const s52 = simulate(52);
  const out: string[] = ['# M3 — simulation hebdomadaire de l’objectif réel', '', '> Priorités déclarées : HYROX (×2), Running composé (×2), Strength (×2), Cross-training (×1). Disponibilité TEST_ONLY : lun–mer, ven–dim. Politique M3 TEST_ONLY.', ''];

  it('4 semaines : toutes les semaines arbitrées, aucune séance retirée par M3, passes bornées', () => {
    for (const w of s12.weeks.slice(0, 4)) {
      expect(['ADMISSIBLE', 'RESOLVED', 'PARTIAL']).toContain(w.arbitration?.status);
      expect(w.arbitration?.passes ?? 0).toBeLessThanOrEqual(12);
      for (const r of w.requests.filter((x) => x.status !== 'planned')) expect(r.reasons.some((x) => /M3_/.test(x.code))).toBe(false);
    }
    out.push('## 4 semaines', '', ...table({ weeks: s12.weeks.slice(0, 4), recents: [] }), '');
  });

  it('12 semaines : l\'historique manqué n\'est jamais un conflit ; le réalisé peut l\'être ; la série est déterministe', () => {
    let executedSeen = 0;
    for (const [k, w] of s12.weeks.entries()) {
      const statusOf = (c: string) => (c.match(/history\.(\d+)/g) ?? []).map((h) => s12.recents[k]?.[Number(h.slice('history.'.length))]?.status);
      const hist = (w.arbitration?.initial ?? []).flatMap(statusOf);
      // Une séance manquée (ou seulement prévue) de la semaine précédente n'est JAMAIS un conflit (politique TEST_ONLY).
      expect(hist.every((x) => x === 'executed' || x === 'abandoned')).toBe(true);
      executedSeen += hist.length;
    }
    const notes = [
      `Conflits impliquant l’historique réalisé / abandonné sur 12 semaines : ${String(executedSeen)} ; aucun avec une séance manquée ou seulement prévue.`,
      '7 séances demandées pour 6 jours disponibles : une demande Strength reste non planifiée (`NOT_ENOUGH_DAYS`, premier passage V2) ; M3 ne crée pas de jour et ne supprime rien.',
      'Conflits avec l’historique : la séance longue du dimanche (réalisée) et la séance du lundi ; l’historique ne cède jamais, la séance du lundi n’a ni jour libre ni échange admis : résidu visible.',
      'À partir de la semaine 8, Running refuse (`DOSE_ANCHOR_UNAVAILABLE`) : à ce niveau, les réalisations ne sont pas réinjectées dans le moteur Running (ports sans état) et son ancre de dose de test expire. Ce n’est pas un effet de M3 (boucle complète : app-core `m3-beta0.test.ts`). Les semaines suivantes, avec deux séances de moins, M3 résout le conflit restant par un échange.',
    ];
    expect(JSON.stringify(simulate(12).weeks)).toBe(JSON.stringify(s12.weeks));
    out.push('## 12 semaines', '', ...table(s12), '', ...notes.map((x) => `- ${x}`), '');
  });

  it('taille de l\'arbitrage persisté : 4 / 12 / 52 semaines (forme compacte)', () => {
    const rows = ['| semaines | arbitrage compact (Kio) | moyenne / semaine (o) | max / semaine (o) | semaine planifiée complète (Kio) | part de l’arbitrage |', '|---|---|---|---|---|---|'];
    for (const n of [4, 12, 52]) {
      const ws = s52.weeks.slice(0, n);
      const arbBytes = ws.map((w) => size(compact(w)));
      const total = arbBytes.reduce((a, b) => a + b, 0);
      const weeks = ws.reduce((a, w) => a + size(w), 0);
      rows.push(`| ${n} | ${(total / KIB).toFixed(1)} | ${Math.round(total / n)} | ${Math.max(...arbBytes)} | ${(weeks / KIB).toFixed(0)} | ${((100 * total) / weeks).toFixed(2)} % |`);
      // Borne de bon sens : l'arbitrage reste une petite fraction de la semaine planifiée.
      expect(total / weeks).toBeLessThan(0.05);
    }
    const path = new URL('./__reports__/m3-state-size.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, ['# M3 — taille de l’arbitrage persisté', '', 'Forme compacte persistée par app-core (`arbitration` : statut, passes, version, conflits initiaux, décisions, résidus ; les raisons de gouvernance ne sont persistées que si l’arbitrage est indisponible ou bloqué). Semaine planifiée complète : sortie du planificateur (séances, raisons, voisines).', '', ...rows, '', 'Mesure applicative (Beta 0, Strength + Running, 52 semaines) : `packages/app-core/tests/longitudinal/__reports__/state-size.md` (+0,7 % avec M3).', ''].join('\n'));
  });

  it('rapport', () => {
    const path = new URL('./__reports__/m3-simulation.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, out.join('\n'));
    expect(out.length).toBeGreaterThan(4);
  });
});
