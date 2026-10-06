/**
 * H2.5 — coût d'état d'une pratique HYROX RÉELLE (programme HYROX seul, 2 séances / semaine, chaque séance exécutée par
 * le chemin de l'application) : 1 séance, 4 semaines, 12 semaines. JSON compact de `saveState`, ventilé : prescription
 * (session_record), décisions H2 persistées, runtime (chrono + position + charges), résultat, réalisations H2,
 * audit, empreintes. Rapport : __reports__/h25-state-size.md.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ensureBeta0Week } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { addDays } from '../../src/dates.js';
import { at, create, doHr, hrProfile, hrSessions, reload } from './hr-fixtures.js';

const size = (v: unknown) => JSON.stringify(v ?? null).length;

function breakdown(s: AppState): Record<string, number> {
  const reqs = Object.values(s.planner.weeks).flatMap((w) => w.requests.filter((r) => r.sport === 'hyrox'));
  const logs = Object.values(s.programmeLogs).filter((l) => l.sport === 'hyrox');
  return {
    total: size(s), prescription: size(reqs.map((r) => r.record)), decisions: size(reqs.map((r) => r.reasons)),
    runtime: size(logs.map((l) => l.hr)), result: size(logs.map((l) => l.outcome)), history: size(s.hyrox.realized),
    audit: size(s.programmeState?.audit), fingerprints: 0,
  };
}

function runWeeks(n: number): { s: AppState; afterOne: AppState } {
  let s = create(hrProfile());
  let afterOne: AppState | null = null;
  let monday = '2026-10-05';
  for (let k = 0; k < n; k += 1) {
    s = ensureBeta0Week(s, at(`${monday}T06:00:00.000Z`));
    for (const v of hrSessions(s, `${monday}T06:00:00.000Z`).filter((x) => x.status === 'planned' && x.date)) {
      s = doHr(s, v.requestId, `${v.date ?? ''}T18:00:00.000Z`, `${v.date ?? ''}T18:40:00.000Z`, 'all', { completion: 'completed_as_prescribed', pain: false });
      afterOne ??= s;
    }
    monday = addDays(monday, 7);
  }
  return { s: reload(s, `${monday}T06:00:00.000Z`), afterOne: afterOne ?? s };
}

describe('H2.5 — taille de l’état HYROX', () => {
  it('1 séance, 4 semaines, 12 semaines (ventilation)', () => {
    const one = runWeeks(1);
    const four = runWeeks(4);
    const twelve = runWeeks(12);
    const rows = [['1 séance', breakdown(one.afterOne), 1], ['4 semaines', breakdown(four.s), four.s.hyrox.realized.length], ['12 semaines', breakdown(twelve.s), twelve.s.hyrox.realized.length]] as const;
    // Le runtime n'est qu'un horodatage + position + charges : il ne croît pas avec la durée de la séance.
    const perSessionRuntime = rows.map(([, b, n]) => (b.runtime ?? 0) / Math.max(1, n));
    expect(Math.max(...perSessionRuntime)).toBeLessThan(200);
    expect(twelve.s.hyrox.realized.length).toBeGreaterThanOrEqual(20);
    const kib = (n: number) => (n / 1024).toFixed(1);
    const lines = [
      '# H2.5 — taille de l’état HYROX (programme HYROX seul, 2 séances / semaine, toutes exécutées)', '',
      '| Période | Séances réalisées | Total (Kio) | Prescription | Décisions H2 | Runtime | Résultat (log) | Réalisations H2 | Audit programme | Empreintes |',
      '|---|---|---|---|---|---|---|---|---|---|',
      ...rows.map(([label, b, n]) => `| ${label} | ${String(n)} | ${kib(b.total ?? 0)} | ${kib(b.prescription ?? 0)} | ${kib(b.decisions ?? 0)} | ${kib(b.runtime ?? 0)} | ${kib(b.result ?? 0)} | ${kib(b.history ?? 0)} | ${kib(b.audit ?? 0)} | — |`),
      '', `- Runtime par séance : ${perSessionRuntime.map((x) => `${String(Math.round(x))} o`).join(' / ')} (horodatage + cumul + position + charges ; aucune écriture par seconde).`,
      '- Empreintes HYROX : non stockées côté application (anti-doublon CORE non alimenté pour HYROX ; la mémoire H2 passe par les réalisations).',
      '- Les semaines clôturées sont compactées par `compactHistory` (décisions conservées).', '',
    ];
    const path = new URL('./__reports__/h25-state-size.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, lines.join('\n'));
  });
});
