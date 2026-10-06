/**
 * C3.5 — coût d'état d'une pratique Cross-training RÉELLE (programme CT seul, 3 séances / semaine, chaque séance
 * exécutée par le chemin de l'application) : 1 séance, 4 semaines, 12 semaines. JSON compact de `saveState`, ventilé :
 * prescription (session_record + décisions persistées), chrono (runtime), résultat, historique moteur, audit, empreintes.
 * Rapport : __reports__/c35-state-size.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ctWorkoutOf, ensureBeta0Week, selectProgrammeSession } from '../../src/index.js';
import type { AppState, CtWorkout } from '../../src/index.js';
import { addDays } from '../../src/dates.js';
import { at, create, ctSessions, doCt, reload } from './ct-fixtures.js';

const size = (v: unknown) => JSON.stringify(v ?? null).length;
// technical-constant: TEST_ONLY — résultats illustratifs d'une exécution complète (aucune performance réelle)
const resultFor = (w: CtWorkout): Record<string, unknown> => (w.format === 'amrap' ? { kind: 'rounds_reps', rounds: 5, reps: 3 }
  : w.format === 'emom' ? { kind: 'emom', minutesCompleted: w.minutes } : w.format === 'for_time' ? { kind: 'time', completionS: Math.floor(w.totalS / 2) }
    : w.format === 'intervals' ? { kind: 'intervals', intervalsCompleted: w.rounds } : { kind: 'total', durationS: w.totalS });

function breakdown(s: AppState): Record<string, number> {
  const ctReqs = Object.values(s.planner.weeks).flatMap((w) => w.requests.filter((r) => r.sport === 'crosstraining'));
  const logs = Object.values(s.programmeLogs).filter((l) => l.sport === 'crosstraining');
  return {
    total: size(s),
    prescription: size(ctReqs.map((r) => r.record)),
    decisions: size(ctReqs.map((r) => r.reasons)),
    runtime: size(logs.map((l) => l.ct)),
    result: size(logs.map((l) => l.outcome)),
    history: size(s.crosstraining.realized),
    audit: size(s.programmeState?.audit),
    fingerprints: size(s.fingerprints.crosstraining),
  };
}

/** Exécute toutes les séances CT planifiées de la semaine de `monday`, puis passe à la semaine suivante. */
function runWeeks(n: number): { s: AppState; afterOne: AppState } {
  let s = create();
  let afterOne: AppState | null = null;
  let monday = '2026-10-05';
  for (let k = 0; k < n; k += 1) {
    s = ensureBeta0Week(s, at(`${monday}T06:00:00.000Z`));
    for (const v of ctSessions(s, `${monday}T06:00:00.000Z`).filter((x) => x.status === 'planned' && x.date)) {
      const w = ctWorkoutOf(selectProgrammeSession(s, v.requestId)?.session as never);
      if (!w) continue;
      s = doCt(s, v.requestId, `${v.date ?? ''}T07:00:00.000Z`, `${v.date ?? ''}T07:30:00.000Z`, { completion: 'completed_as_prescribed', pain: false, ct: { result: resultFor(w) } });
      afterOne ??= s;
    }
    monday = addDays(monday, 7);
  }
  return { s: reload(s, `${monday}T06:00:00.000Z`), afterOne: afterOne ?? s };
}

describe('C3.5 — taille de l’état Cross-training', () => {
  it('1 séance, 4 semaines, 12 semaines (ventilation)', () => {
    const one = runWeeks(1);
    const four = runWeeks(4);
    const twelve = runWeeks(12);
    const rows = [['1 séance', breakdown(one.afterOne), 1], ['4 semaines', breakdown(four.s), four.s.crosstraining.realized.length], ['12 semaines', breakdown(twelve.s), twelve.s.crosstraining.realized.length]] as const;
    // Le chrono n'est qu'un horodatage + 3 compteurs par séance : il ne croît pas avec la durée de la séance.
    const perSessionRuntime = rows.map(([, b, n]) => (b.runtime ?? 0) / Math.max(1, n));
    expect(Math.max(...perSessionRuntime)).toBeLessThan(200);
    expect(twelve.s.crosstraining.realized.length).toBeGreaterThanOrEqual(30);
    const kib = (n: number) => (n / 1024).toFixed(1);
    const lines = [
      '# C3.5 — taille de l’état Cross-training (programme CT seul, 3 séances / semaine, toutes exécutées)', '',
      '| Période | Séances réalisées | Total (Kio) | Prescription | Décisions C3 | Chrono | Résultat (log) | Historique moteur | Audit programme | Empreintes |',
      '|---|---|---|---|---|---|---|---|---|---|',
      ...rows.map(([label, b, n]) => `| ${label} | ${String(n)} | ${kib(b.total ?? 0)} | ${kib(b.prescription ?? 0)} | ${kib(b.decisions ?? 0)} | ${kib(b.runtime ?? 0)} | ${kib(b.result ?? 0)} | ${kib(b.history ?? 0)} | ${kib(b.audit ?? 0)} | ${kib(b.fingerprints ?? 0)} |`),
      '', `- Chrono par séance : ${perSessionRuntime.map((x) => `${String(Math.round(x))} o`).join(' / ')} (horodatage + cumul + 2 compteurs ; aucune écriture par seconde).`,
      '- Les semaines clôturées sont compactées par `compactHistory` (décisions conservées, codes inconnus conservés).', '',
    ];
    const path = new URL('./__reports__/c35-state-size.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
