/**
 * M3 — arbitrage multisport par le chemin RÉEL de l'application (Beta 0 expérimental, politique M3 TEST_ONLY marquée
 * SIMULATION_ONLY) : programme Strength 3 + Running 3 conduit 4 puis 12 semaines (createBeta0Programme →
 * ensureBeta0Week → Global Planner + M3 → moteurs → recordSessionExecution → clôture). Événements TEST_ONLY : séance
 * modifiée, abandonnée, manquée, douleur. Vérifie : semaine persistée avec son arbitrage compact, statut d'historique
 * transmis (réalisé ≠ prévu ≠ manqué), raison lisible exposée à l'interface, douleur = pause (aucune semaine arbitrée
 * pendant la pause), WEEK_NOT_REPLACEABLE intact. Rapport : __reports__/m3-beta0.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { BETA0_PLANNING_VERSION, BETA0_SIMULATION, createBeta0Programme, emptyState, ensureBeta0Week, recentOf, recordSessionExecution, selectBeta0Week } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { drive } from '../longitudinal/s3-scenario.js';
import type { Event } from '../longitudinal/s3-scenario.js';

// technical-constant: millisecondes par semaine (dates du benchmark)
const WEEK_MS = 7 * 86_400_000;
const start = Date.parse('2026-10-05T00:00:00Z');
const W = Array.from({ length: 12 }, (_, i) => new Date(start + i * WEEK_MS).toISOString().slice(0, 10));
const s0 = () => createBeta0Programme(emptyState(), profile({
  priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
  running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
  availability: [60, 45, 60, 45, 60, 90, 75],
}), clock(W[0] as string), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
/** Événements TEST_ONLY (séances Strength) : manquée, modifiée, abandonnée, comme prévu. */
const EVENTS = (w: number, _r: unknown, k: number): Event => (w === 1 && k === 0 ? 'missed' : w === 2 && k === 0 ? 'last_set_missed' : w === 3 && k === 0 ? 'abandoned_half' : 'as_prescribed');

const lines: string[] = ['# M3 — Beta 0 (chemin réel de l’application) : Strength ×3 + Running ×3', '', '> Politique M3 TEST_ONLY (SIMULATION_ONLY en Beta 0). Réalisations TEST_ONLY. Aucune valeur n’est une recommandation.', ''];
function weekRows(s: AppState, weeks: readonly string[]): string[] {
  const rows = ['| semaine | statut M3 | conflits initiaux | décisions | résidus | historique transmis (statuts) |', '|---|---|---|---|---|---|'];
  for (const ws of weeks) {
    const w = s.planner.weeks[ws];
    const a = w?.arbitration;
    const hist = s.profile ? recentOf(s, s.profile, ws).map((x) => x.status) : [];
    const count = (k: string) => hist.filter((x) => x === k).length;
    rows.push(`| ${ws} | ${a?.status ?? '—'} | ${a?.initial.length ?? 0} | ${(a?.decisions ?? []).map((d) => `${d.action} ${d.requestId.slice(11)} ${d.from.slice(5)}→${d.to.slice(5)}`).join(' ; ') || '—'} | ${a?.residual.length ?? 0} | réalisées ${count('executed')}, abandonnées ${count('abandoned')}, manquées ${count('missed')}, prévues ${count('planned')} |`);
  }
  return rows;
}

describe('M3 dans la Beta 0', () => {
  const run12 = drive(s0(), W, EVENTS);

  it('environnement : politique M3 marquée SIMULATION_ONLY, version de planification M3', () => {
    expect(BETA0_PLANNING_VERSION).toBe('beta0-m31');
    expect(BETA0_SIMULATION).toEqual(expect.arrayContaining(['planner.m3.pairRules', 'planner.m3.actions', 'planner.m3.neighbourWindowHours']));
    const w = run12.final.planner.weeks[W[0] as string];
    expect(w?.simulation).toEqual(expect.arrayContaining(['planner.m3.pairRules']));
    expect(w?.planningVersion).toBe('beta0-m31');
  });

  it('4 semaines : chaque semaine persiste un arbitrage compact ; aucune séance supprimée par M3', () => {
    for (const ws of W.slice(0, 4)) {
      const w = run12.final.planner.weeks[ws];
      expect(w?.arbitration?.policyVersion).not.toBeNull();
      expect(['ADMISSIBLE', 'RESOLVED', 'PARTIAL']).toContain(w?.arbitration?.status);
      // M3 ne retire rien : une demande non planifiée l'est par le premier passage (créneau trop court pour la course,
      // TIME_EXCEEDED, comportement V2), jamais par l'arbitrage.
      for (const r of w?.requests.filter((x) => x.status !== 'planned') ?? []) {
        expect(r.category).toBe('slot_unavailable');
        expect(r.reasons.some((x) => /M3_/.test(x.code))).toBe(false);
      }
    }
    lines.push('## 4 semaines', '', ...weekRows(run12.final, W.slice(0, 4)), '');
  });

  it('12 semaines : statut de l\'historique transmis (réalisé / abandonné / manqué), jamais « prévu » pour une séance réalisée', () => {
    const s = run12.final;
    if (!s.profile) throw new Error('profil absent');
    // Semaine 3 : la semaine 2 contenait une séance Strength manquée (dérivée à la clôture).
    const h3 = recentOf(s, s.profile, W[2] as string);
    expect(h3.some((x) => x.status === 'missed')).toBe(true);
    expect(h3.filter((x) => x.status === 'executed').length).toBeGreaterThan(0);
    // Semaine 5 : la semaine 4 contenait une séance abandonnée.
    expect(recentOf(s, s.profile, W[4] as string).some((x) => x.status === 'abandoned')).toBe(true);
    // Aucune semaine clôturée n'a de séance « prévue » restante dans l'historique transmis.
    for (const ws of W.slice(1)) expect(recentOf(s, s.profile, ws).every((x) => x.status !== 'planned')).toBe(true);
    lines.push('## 12 semaines', '', 'Semaine 2 : 1re séance Strength MANQUÉE ; semaine 3 : MODIFIÉE (dernière série non faite) ; semaine 4 : ABANDONNÉE à mi-séance. L’historique transmis au planificateur porte ces statuts ; la politique TEST_ONLY ne compte que les séances réalisées ou abandonnées.', '', ...weekRows(s, W), '');
  });

  it('interface : raison lisible exposée pour une séance déplacée / échangée / en conflit (aucun code)', () => {
    const s = run12.final;
    const views = W.flatMap((ws) => selectBeta0Week(s, ws)?.sessions ?? []);
    const withArb = views.filter((v) => v.arbitration !== null);
    const decided = W.flatMap((ws) => s.planner.weeks[ws]?.arbitration?.decisions ?? []);
    if (decided.length > 0) expect(withArb.length).toBeGreaterThan(0);
    for (const v of withArb) expect(['moved', 'swapped', 'recomposed', 'conflict']).toContain(v.arbitration?.kind);
    lines.push(`Vues de séance avec une raison M3 : ${String(withArb.length)} (${[...new Set(withArb.map((v) => v.arbitration?.kind))].join(', ') || 'aucune'}).`, '');
  });

  it('douleur : planification suspendue ⇒ aucune semaine arbitrée pendant la pause ; M3 ne déplace jamais une séance pour contourner la sécurité', () => {
    let s = s0();
    const w = s.planner.weeks[W[0] as string];
    const r = w?.requests.find((x) => x.status === 'planned' && x.sport === 'running');
    if (!r?.date) throw new Error('course absente');
    s = recordSessionExecution(s, clock(r.date, '18:00:00'), { requestId: r.requestId, sport: 'running', completion: 'modified', pain: 'P2', run: { realizedDurationS: 600, distanceM: 1500 } });
    expect(s.safety.activePain).not.toBeNull();
    const next = ensureBeta0Week(s, clock(W[1] as string));
    expect(next.planner.weeks[W[1] as string]).toBeUndefined();
    lines.push('## Douleur', '', 'Douleur signalée en semaine 1 : la planification est SUSPENDUE (système central de douleur) ; la semaine 2 n’est ni planifiée ni arbitrée. M3 n’a aucun accès à une séance interdite.', '');
  });

  it('semaine commencée : jamais remplacée par l\'arbitrage (WEEK_NOT_REPLACEABLE intact)', () => {
    const s = run12.final;
    const kept = s.planner.weeks[W[0] as string];
    const again = ensureBeta0Week(s, clock(W[0] as string));
    expect(again.planner.weeks[W[0] as string]).toEqual(kept);
  });

  it('rapport', () => {
    const path = new URL('./__reports__/m3-beta0.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
    expect(lines.length).toBeGreaterThan(4);
  });
});
