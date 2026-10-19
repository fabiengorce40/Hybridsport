/**
 * RC4.5 (F6) — sonde de démarrage des séances de Musculation PLANIFIÉES d'un état : pour chaque séance non commencée,
 * démarrage avec quatre contrôles (inconnu, fatigue, douleur genou P2, course libre la veille) par le chemin de
 * l'application ; empreinte du journal ouvert et du contrôle enregistré. Exécutée par le code d'AVANT F6 (références)
 * puis par le code F6 (même état) : les quatre chemins de régénération doivent donner exactement le même résultat.
 */
import { createHash } from 'node:crypto';
import { loadState, logFreeRun, MemoryStorage, selectProgrammeSession, startProgrammeSession, STORAGE_KEY } from '../../src/index.js';
import type { AppState, CheckInInput } from '../../src/index.js';

const CASES: readonly (readonly [string, CheckInInput | undefined, boolean])[] = [
  ['inconnu', undefined, false],
  ['fatigue', { painAnswer: 'no', fatigue: 'high', recovery: 'poor' }, false],
  ['douleur', { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }] }, false],
  ['course_libre', { painAnswer: 'no', fatigue: 'low', recovery: 'good' }, true],
];
export function loadText(text: string, now: string): AppState {
  const st = new MemoryStorage();
  st.setItem(STORAGE_KEY, text);
  const r = loadState(st, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
}
const dayBefore = (d: string): string => new Date(Date.parse(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
export function probe(s: AppState): Record<string, { decision: string; codes: string[]; hash: string; exercises: string[] }> {
  const out: Record<string, { decision: string; codes: string[]; hash: string; exercises: string[] }> = {};
  for (const w of Object.values(s.planner.weeks)) for (const r of w.requests) {
    if (r.sport !== 'strength' || r.status !== 'planned' || !r.date || s.programmeLogs[r.requestId] || s.programmeState?.results.some((x) => x.requestId === r.requestId)) continue;
    for (const [name, ci, free] of CASES) {
      let s0 = s;
      if (free) {
        const prev = dayBefore(r.date);
        if (Date.parse(`${prev}T07:00:00Z`) <= Date.parse(w.plannedAt)) continue;
        s0 = logFreeRun(s0, { realizedDurationS: 2700, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 8000, startedAt: `${prev}T07:00:00Z` } as never, { today: prev, now: `${prev}T09:00:00.000Z` });
      }
      const n = startProgrammeSession(s0, { today: r.date, now: `${r.date}T17:00:00.000Z` }, r.requestId, undefined, ci);
      const c = n.checkIns.at(-1);
      const log = n.programmeLogs[r.requestId] ?? null;
      out[`${r.requestId}|${name}`] = {
        decision: c?.decision ?? '-', codes: (c?.reasons ?? []).map((x) => x.code),
        hash: createHash('sha256').update(JSON.stringify([log, c ?? null])).digest('hex').slice(0, 16),
        exercises: (selectProgrammeSession(n, r.requestId)?.session.blocks ?? []).flatMap((b) => b.items.map((i) => i.exerciseId)),
      };
    }
  }
  return out;
}
