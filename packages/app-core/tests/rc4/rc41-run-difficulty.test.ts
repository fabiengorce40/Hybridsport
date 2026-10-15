/**
 * RC4.1 — difficulté ressentie en fin de course (Beta 0) : transmise au contrat Running par `finishProgrammeSession`,
 * persistée dans la séance réalisée (`unexpectedDifficulty`), facultative (absente ⇒ UNKNOWN), refusée si inconnue
 * ou pour un autre sport ; reprise des données antérieures (RC1 TEST) sans migration.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeState, finishProgrammeSession, selectBeta0Week, startProgrammeSession } from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';

const FIX = join(import.meta.dirname, '../rc3-test/fixtures');
const decode = (name: string): AppState => {
  const d = decodeState(readFileSync(join(FIX, `rc1-${name}.json`), 'utf8'));
  if (!d.ok) throw new Error(d.problem);
  return d.state;
};
const at = (iso: string, s = 0): Clock => {
  const now = new Date(Date.parse(iso) + s * 1000).toISOString().replace('.000Z', 'Z');
  return { today: now.slice(0, 10), now };
};
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; } };
const open = (s: AppState) => {
  const l = Object.values(s.programmeLogs).find((x) => !x.finishedAt);
  if (!l) throw new Error('séance en cours attendue');
  return l;
};

describe('RC4.1 — ressenti Course', () => {
  it('données RC1 TEST reprises : TEST commencé en RC1 terminé avec « comme prévu » ; réalisations antérieures intactes (UNKNOWN)', () => {
    const s0 = decode('running-test-inprogress');
    const l = open(s0);
    const before = s0.running.realized;
    const s = finishProgrammeSession(s0, at(l.startedAt, 4000), { requestId: l.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 3900, testTimeS: 2700 }, difficulty: 'AS_EXPECTED' });
    expect(s.running.realized.slice(0, before.length)).toEqual(before);
    expect(s.running.realized.at(-1)).toMatchObject({ sessionId: l.requestId, unexpectedDifficulty: 'AS_EXPECTED' });
  });

  it('les quatre réponses sont persistées telles quelles ; sans réponse : UNKNOWN', () => {
    const s0 = decode('running-week2-threshold');
    const v = (selectBeta0Week(s0, '2026-10-12')?.sessions ?? []).find((x) => x.archetypeId === 'running.easy');
    if (!v?.date) throw new Error('footing attendu');
    const start = startProgrammeSession(s0, at(`${v.date}T08:00:00Z`), v.requestId, undefined, { painAnswer: 'no' });
    for (const d of ['EASIER', 'AS_EXPECTED', 'HARDER', 'MUCH_HARDER', undefined] as const) {
      const s = finishProgrammeSession(start, at(`${v.date}T08:40:00Z`), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1800 }, ...(d ? { difficulty: d } : {}) });
      expect(s.running.realized.at(-1)?.unexpectedDifficulty).toBe(d ?? 'UNKNOWN');
    }
  });

  it('valeur inconnue ou autre sport : refus explicite, état inchangé', () => {
    const run = decode('running-test-inprogress');
    const l = open(run);
    expect(code(() => finishProgrammeSession(run, at(l.startedAt, 4000), { requestId: l.requestId, completion: 'modified', pain: false, run: { realizedDurationS: 3900 }, difficulty: 'TOO_EASY' as never }))).toBe('RUN_DIFFICULTY_INVALID');
    const str = decode('strength-inprogress-rest-paused');
    const ls = open(str);
    expect(code(() => finishProgrammeSession(str, at(ls.startedAt, 3600), { requestId: ls.requestId, completion: 'modified', pain: false, difficulty: 'AS_EXPECTED' }))).toBe('RUN_DIFFICULTY_INVALID');
  });
});
