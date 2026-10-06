/**
 * Strength S4 — croissance de l'état PERSISTÉ (JSON compact écrit par `saveState`) sur un programme Strength + Running
 * réaliste conduit par le chemin de l'application pendant 52 semaines (réalisations TEST_ONLY, s3-scenario.ts),
 * décomposée par poste. La compaction de l'historique (history.ts) est appliquée par `ensureBeta0Week`.
 * Rapport régénéré : `__reports__/state-size.md`.
 */
import { describe, expect, it } from 'vitest';
import { createBeta0Programme, emptyState, HISTORY_COMPACTED } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { drive } from './s3-scenario.js';

// technical-constant: TEST_ONLY — horizon du benchmark (semaines) et points de mesure
const HORIZON = 52;
const POINTS = [4, 12, 26, 52] as const;
// technical-constant: octets par Kio (affichage)
const KIB = 1024;
// technical-constant: millisecondes par semaine (dates du benchmark)
const WEEK_MS = 7 * 86_400_000;

const len = (x: unknown): number => JSON.stringify(x ?? null).length;
const kib = (n: number): string => `${String(Math.round(n / KIB))}`;

function breakdown(s: AppState): Record<string, number> {
  const reqs = Object.values(s.planner.weeks).flatMap((w) => w.requests);
  const records = reqs.reduce((a, r) => a + len(r.record), 0);
  const reasons = reqs.reduce((a, r) => a + len(r.reasons), 0);
  const audit = len(s.programmeState?.audit);
  return {
    'séances planifiées (session_record)': records,
    'raisons persistées des séances': reasons,
    'semaines planifiées (autres champs)': len(s.planner) - records - reasons,
    'audit du programme': audit,
    'programme (définition, semaines, résultats)': len(s.programmeState) - audit,
    'Strength : expositions': len(s.strength.exposures),
    'Strength : tracks et compteurs': len(s.strength.tracks) + len(s.strength.accessoryCounts),
    'empreintes (anti-doublon)': len(s.fingerprints),
    'Running : réalisé et références': len(s.running),
    'autres': len(s) - len(s.planner) - len(s.programmeState) - len(s.strength) - len(s.fingerprints) - len(s.running),
  };
}

describe('taille de l’état persisté (Strength + Running, 52 semaines)', () => {
  it('mesure 4 / 12 / 26 / 52 semaines, décomposition par poste, compaction appliquée', async () => {
    const start = Date.parse('2026-10-05T00:00:00Z');
    const W = Array.from({ length: HORIZON }, (_, i) => new Date(start + i * WEEK_MS).toISOString().slice(0, 10));
    const s0 = createBeta0Programme(emptyState(), profile({
      priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
      running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
      availability: [60, 45, 60, 45, 60, 90, 75],
    }), clock(W[0] as string), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    // État après n semaines réalisées et clôturées (un run par point de mesure, même protocole que la mesure S3).
    const runs = new Map(POINTS.map((n) => [n, drive(s0, W.slice(0, n)).final]));
    const r = { final: runs.get(HORIZON) as AppState };
    const rows = POINTS.map((n) => ({ n, s: runs.get(n) as AppState, b: breakdown(runs.get(n) as AppState) }));
    const keys = Object.keys(rows[0]?.b ?? {});
    const compacted = (s: AppState) => Object.values(s.planner.weeks).flatMap((w) => w.requests).filter((q) => q.reasons.some((x) => x.code === HISTORY_COMPACTED)).length;
    const lines = [
      '# Taille de l’état persisté — Strength (3 / semaine) + Running (3 / semaine), 52 semaines', '',
      'JSON compact écrit par `saveState` (Kio). Réalisations TEST_ONLY. Compaction de l’historique appliquée par `ensureBeta0Week`.', '',
      `| Poste | ${POINTS.map((n) => `${String(n)} sem.`).join(' | ')} |`, `|---|${POINTS.map(() => '---').join('|')}|`,
      ...keys.map((k) => `| ${k} | ${rows.map((x) => kib(x.b[k] ?? 0)).join(' | ')} |`),
      `| **Total** | ${rows.map((x) => `**${kib(len(x.s))}**`).join(' | ')} |`,
      `| séances compactées | ${rows.map((x) => String(compacted(x.s))).join(' | ')} |`, '',
    ];
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot('__reports__/state-size.md');
    // Croissance bornée par les données chaudes : la compaction s'applique à toutes les semaines sauf les deux dernières.
    expect(compacted(r.final)).toBeGreaterThan(0);
    for (const x of rows) expect(Object.values(x.b).every((v) => v >= 0)).toBe(true);
  }, 600_000);
});
