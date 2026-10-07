/**
 * M3.1 — simulation 4 semaines HYROX ÉQUILIBRÉ par le chemin RÉEL de l'application (Beta 0) : 2 séances / semaine,
 * puis 3 séances / semaine avec Running (semaine plus dense : séances non placées). Pour chaque séance : rôle DEMANDÉ
 * par le programme, rôle COMPOSÉ par H2 (décision persistée), placement M3, exécution (réalisée, manquée, réalisée
 * manuellement hors planning), et rôles lus comme réalisés à la semaine suivante. Rapport : __reports__/m31-balanced.md.
 * Ce n'est PAS de la périodisation : la politique de rotation (TEST_ONLY) ne lit que l'historique du programme.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ensureBeta0Week, finishProgrammeSession, selectBeta0Week, startProgrammeSession } from '../../src/index.js';
import type { AppState, ProfileInput, SessionView } from '../../src/index.js';
import { at, create, doHr, hrProfile, request } from '../hr/hr-fixtures.js';

const MONS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
const T = (d: string, h = '18:00') => `${d}T${h}:00.000Z`;
const short = (a: string | null | undefined) => (a ?? '—').replace('hybrid_race.h2.', '');
const composedRole = (s: AppState, id: string) => String(request(s, id)?.reasons.find((r) => r.code.endsWith('H2_INTENT'))?.params.role ?? '—');
const assignedOf = (s: AppState, i: number) => (s.programmeState?.audit.filter((a) => a.reason.code === 'PLAN.PROGRAMME.ROTATION_ASSIGNED' && a.reason.params.weekIndex === i).at(-1)?.reason.params.assigned as string[] | undefined) ?? [];

interface Row { week: number; id: string; requested: string; composed: string; placement: string; execution: string }
/** `event(w, k, v)` : 'done' | 'missed' | 'manual' (séance non placée réalisée maintenant). */
function simulate(p: ProfileInput, event: (w: number, v: SessionView) => 'done' | 'missed' | 'manual') {
  let s = create(p, T(MONS[0] as string, '07:30'));
  const rows: Row[] = [];
  const executedBefore: string[][] = [];
  for (const [w, m] of MONS.entries()) {
    if (w > 0) s = ensureBeta0Week(s, at(T(m, '07:30')));
    executedBefore.push(s.hyrox.realized.map((r) => String(r.role)));
    const assigned = assignedOf(s, w);
    for (const v of (selectBeta0Week(s, m)?.sessions ?? []).filter((x) => x.sport === 'hyrox')) {
      const k = Number(v.requestId.slice(v.requestId.lastIndexOf('.') + 1));
      const ev = event(w, v);
      // « manual » ne concerne qu'une séance non placée ; une séance placée est réalisée normalement ou manquée.
      const e = v.placement === 'composed_unplaced' ? (ev === 'manual' ? 'manual' : 'missed') : v.placement === 'planned' ? (ev === 'missed' ? 'missed' : 'done') : 'missed';
      const day = v.date ?? `${m.slice(0, 8)}${String(Number(m.slice(8)) + 1).padStart(2, '0')}`;
      if (e === 'done' || e === 'manual') s = doHr(s, v.requestId, T(day), T(day, '18:40'), 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } } as never);
      rows.push({
        week: w + 1, id: v.requestId.slice(11), requested: short(assigned.find((a) => a.startsWith(`${String(k)}:`))?.split(':')[1]), composed: composedRole(s, v.requestId),
        placement: v.placement === 'planned' ? `placée ${v.date ?? ''}` : v.placement === 'composed_unplaced' ? 'composée, NON placée' : 'bloquée',
        execution: e === 'done' ? 'réalisée' : e === 'manual' ? 'réalisée maintenant (hors planning)' : 'non réalisée',
      });
    }
    // Les autres sports éventuels sont réalisés (Running) : la semaine reste un vrai programme multisport.
    for (const v of (selectBeta0Week(s, m)?.sessions ?? []).filter((x) => x.sport === 'running' && x.placement === 'planned' && x.date)) {
      s = finishProgrammeSession(startProgrammeSession(s, at(T(v.date ?? m, '07:00')), v.requestId), at(T(v.date ?? m, '07:40')), { requestId: v.requestId, completion: 'modified', pain: false, run: { realizedDurationS: 1800, distanceM: 5000 } } as never);
    }
  }
  return { s, rows, executedBefore };
}
const table = (rows: readonly Row[], executedBefore: readonly string[][]) => [
  '| semaine | séance | rôle demandé (programme) | rôle composé (H2) | placement (M3) | exécution | rôles réalisés lus en début de semaine |', '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${String(r.week)} | ${r.id} | ${r.requested} | ${r.composed} | ${r.placement} | ${r.execution} | ${(executedBefore[r.week - 1] ?? []).join(', ') || '—'} |`),
];

describe('M3.1 — HYROX équilibré, 4 semaines', () => {
  const lines: string[] = ['# M3.1 — HYROX équilibré : 4 semaines (chemin réel de l’application)', '', '> Politique de rotation TEST_ONLY (SIMULATION_ONLY en Beta 0) : candidates = les cinq rôles H2, critères « moins récemment réalisé » puis « moins récemment assigné ». Réalisations TEST_ONLY. Ce n’est pas une périodisation.', ''];

  it('2 séances / semaine : plusieurs rôles au fil des semaines ; rôle demandé = rôle composé', () => {
    // Semaine 2 : la 2e séance est manquée (son rôle reste « non réalisé » et sera reproposé).
    const r = simulate(hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 } }), (w, v) => (w === 1 && v.requestId.endsWith('.2') ? 'missed' : 'done'));
    expect(new Set(r.rows.map((x) => x.composed)).size).toBeGreaterThanOrEqual(4);
    for (const x of r.rows) expect(x.composed).toBe(x.requested);
    lines.push('## HYROX 2 séances / semaine (6 jours disponibles)', '', ...table(r.rows, r.executedBefore), '', `Rôles distincts composés sur 4 semaines : ${String(new Set(r.rows.map((x) => x.composed)).size)} / 5. La séance manquée de la semaine 2 garde son rôle « non réalisé » : il est reproposé ensuite.`, '');
  });

  it('3 séances / semaine + Running ×2 sur 4 jours : un rôle non placé garde son rôle et, réalisé manuellement, est lu comme réalisé', () => {
    const p = hrProfile({ running: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 3 }, availability: [60, 0, 60, 0, 60, 0, 90], priorities: ['hyrox', 'running'] });
    const r = simulate(p, (w) => (w === 0 ? 'manual' : 'done'));
    for (const x of r.rows) expect(x.composed).toBe(x.requested);
    const manual = r.rows.find((x) => x.execution.startsWith('réalisée maintenant'));
    if (manual) expect(r.executedBefore[1]).toContain(manual.composed);
    lines.push('## HYROX 3 séances / semaine + Running ×2 (4 jours disponibles)', '', ...table(r.rows, r.executedBefore), '', manual ? `Semaine 1 : la séance non placée (${manual.composed}) est réalisée manuellement ; elle est lue comme réalisée en semaine 2.` : 'Aucune séance HYROX non placée sur cette disponibilité.', '');
    const path = new URL('./__reports__/m31-balanced.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
