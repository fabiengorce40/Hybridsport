/**
 * RC4.3 — courses libres (décisions R2 / R3, migration M1 `running.freeRunMeta`) : types déclarés et leur
 * modification, métadonnées (suppression, correction), date inconnue de l'onboarding, avertissement « même jour »,
 * contexte du moteur Course, récupération multisport (planification et démarrage), absence de double comptage,
 * sauvegarde / rechargement / export, données antérieures sans métadonnées.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createBeta0Programme, decodeState, deleteFreeRun, emptyState, ensureBeta0Week, exportState, freeRunsSincePlanning, loadState, logFreeRun, MemoryStorage, recentOf, runningContext,
  saveState, selectBeta0Week, selectFreeRuns, selectProgrammeSession, startProgrammeSession, finishProgrammeSession, updateFreeRun,
} from '../../src/index.js';
import type { AppState, Clock, FreeRunInput } from '../../src/index.js';
import { MONS, PROFILES } from '../rc4-audit/rc4-sim.js';

vi.setConfig({ testTimeout: 120_000 });
const ck = (d: string, hm = '08:00'): Clock => ({ today: d, now: `${d}T${hm}:00Z` });
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; } };
const spec = (id: string) => { const p = PROFILES.find((x) => x.id === id); if (!p) throw new Error(id); return p; };
const RUN: FreeRunInput = { realizedDurationS: 2700, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 8000 };
const MON = MONS[0];
/** Durée prescrite (min) d'un footing : segments continus de la séance persistée. */
const easyMinutes = (s: AppState, requestId: string): number => {
  const p = selectProgrammeSession(s, requestId)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'run_structure')?.prescription;
  if (p?.type !== 'run_structure') return Infinity;
  return p.segments.reduce((n, g) => n + (g.kind === 'steady' && 'durationS' in g.dose ? g.dose.durationS : 0), 0) / 60;
};
/** P4 (Course + HYROX) après onboarding, sans date pour la dernière course déclarée. */
const p4 = (date?: string): AppState => createBeta0Programme(emptyState(), spec('P4').profile, ck(MON, '07:00'), { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000, ...(date ? { date } : {}) }, requestTest: true });

describe('types déclarés et métadonnées', () => {
  it('quatre saisies : non précisé (aucune métadonnée), facile, longue, qualité (seuil / fractionné / côtes) ; contrat Running inchangé (EASY continue)', () => {
    let s = p4('2026-10-01');
    const before = s.running.freeRunMeta ?? {};
    const types = [undefined, 'easy', 'long', 'threshold', 'interval', 'hills'] as const;
    types.forEach((type, i) => { s = logFreeRun(s, { ...RUN, startedAt: `2026-09-2${String(i + 2)}T07:00:00Z`, ...(type ? { type } : {}) }, ck(MON, '07:30')); });
    const views = selectFreeRuns(s).filter((v) => v.startedAt.startsWith('2026-09-2') && v.startedAt.endsWith('T07:00:00Z')).sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
    expect(views.map((v) => v.type)).toEqual([null, 'easy', 'long', 'threshold', 'interval', 'hills']);
    expect(s.running.realized.filter((r) => r.sessionId.startsWith('free:2026-09-2')).every((r) => r.archetype === 'EASY' && r.structureFamily === 'CONTINUOUS')).toBe(true);
    // « Non précisé » : aucune entrée de métadonnées (jamais un type supposé).
    expect(Object.keys(s.running.freeRunMeta ?? {}).length).toBe(Object.keys(before).length + 5);
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: '2026-10-04T18:00:00Z', type: 'tempo' as never }, ck(MON)))).toBe('FREE_RUN_TYPE_INVALID');
  });

  it('modification : type changé, effacé (« Non précisé ») ; identifiant changé ⇒ métadonnées suivies ; suppression ⇒ métadonnées retirées', () => {
    let s = logFreeRun(p4('2026-10-01'), { ...RUN, startedAt: '2026-10-03T07:00:00Z', type: 'easy' }, ck(MON));
    const id = 'free:2026-10-03T07:45:00Z';
    s = updateFreeRun(s, id, { realizedDurationS: 2700, difficulty: 'AS_EXPECTED', startedAt: '2026-10-03T07:00:00Z', type: 'long' }, ck(MON));
    expect(s.running.freeRunMeta?.[id]).toEqual({ type: 'long' });
    // Nouvelle heure ⇒ nouvel identifiant : les métadonnées suivent, l'ancien identifiant n'en garde aucune.
    s = updateFreeRun(s, id, { realizedDurationS: 3000, difficulty: 'EASIER', startedAt: '2026-10-03T08:00:00Z', type: 'hills' }, ck(MON));
    const id2 = 'free:2026-10-03T08:50:00Z';
    expect(s.running.freeRunMeta?.[id]).toBeUndefined();
    expect(s.running.freeRunMeta?.[id2]).toEqual({ type: 'hills' });
    s = updateFreeRun(s, id2, { realizedDurationS: 3000, difficulty: 'EASIER', startedAt: '2026-10-03T08:00:00Z' }, ck(MON));
    expect(s.running.freeRunMeta?.[id2]).toBeUndefined();
    expect(selectFreeRuns(s).find((v) => v.sessionId === id2)?.type).toBeNull();
    s = updateFreeRun(s, id2, { realizedDurationS: 3000, difficulty: 'EASIER', startedAt: '2026-10-03T08:00:00Z', type: 'threshold' }, ck(MON));
    s = deleteFreeRun(s, id2);
    expect(s.running.freeRunMeta?.[id2]).toBeUndefined();
    expect(s.running.realized.some((r) => r.sessionId === id2)).toBe(false);
  });

  it('contexte du moteur : type appliqué au seul contexte (LONG / qualité sans structure), origine libre fournie ; expositions inchangées', () => {
    let s = logFreeRun(p4('2026-10-01'), { ...RUN, startedAt: '2026-10-03T07:00:00Z', type: 'long' }, ck(MON));
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-04T07:00:00Z', type: 'interval' }, ck(MON));
    const c = runningContext(s, s.profile as NonNullable<AppState['profile']>, { date: MON });
    const h = c.sessionHistory ?? [];
    expect(h.find((r) => r.sessionId === 'free:2026-10-03T07:45:00Z')).toMatchObject({ archetype: 'LONG', structureFamily: 'CONTINUOUS' });
    expect(h.find((r) => r.sessionId === 'free:2026-10-04T07:45:00Z')).toMatchObject({ archetype: 'SEVERE', structureFamily: 'INTERVALS' });
    expect(h.find((r) => r.sessionId === 'free:2026-10-04T07:45:00Z')?.structure).toBeUndefined();
    expect(c.freeSessionIds).toEqual(s.running.realized.filter((r) => r.sessionId.startsWith('free:')).map((r) => r.sessionId));
    expect((c.exposures ?? []).map((e) => e.archetype)).toEqual(['EASY']);
    // Données persistées inchangées : les courses restent EASY continues.
    expect(s.running.realized.every((r) => r.archetype === 'EASY')).toBe(true);
  });
});

describe('F2 par type : une course libre longue ne vide jamais la semaine suivante', () => {
  for (const type of [undefined, 'easy', 'long', 'threshold'] as const) {
    it(`80 min libres (${type ?? 'non précisé'}) après S1 : S2 garde 3 courses, dont le seuil, footings ≤ 31 min`, () => {
      let s = p4();
      for (const v of (selectBeta0Week(s, MON)?.sessions ?? []).filter((x) => x.sport === 'running' && x.date && x.placement === 'planned')) {
        const d = v.date ?? MON;
        s = startProgrammeSession(s, ck(d), v.requestId, undefined, { painAnswer: 'no' });
        s = finishProgrammeSession(s, ck(d, '09:00'), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: v.archetypeId === 'running.test' ? 1800 : easyMinutes(s, v.requestId) * 60, distanceM: 6000, ...(v.archetypeId === 'running.test' ? { testTimeS: 1500 } : {}) }, difficulty: 'AS_EXPECTED' });
      }
      s = logFreeRun(s, { ...RUN, realizedDurationS: 4800, distanceM: 14000, startedAt: '2026-10-11T09:00:00Z', ...(type ? { type } : {}) }, ck('2026-10-11', '20:00'));
      s = ensureBeta0Week(s, ck(MONS[1], '06:00'));
      const runs = (selectBeta0Week(s, MONS[1])?.sessions ?? []).filter((x) => x.sport === 'running');
      expect(runs.filter((x) => x.placement !== 'blocked').length).toBe(3);
      expect(runs.map((x) => x.archetypeId)).toContain('running.threshold');
      for (const x of runs.filter((r) => r.archetypeId === 'running.easy')) expect(easyMinutes(s, x.requestId)).toBeLessThanOrEqual(31);
    });
  }
});

describe('date inconnue (onboarding) et récupération multisport', () => {
  it('onboarding sans date : métadonnée `dateUnknown`, jamais une voisine ni une fatigue récente ; avec date réelle : comptée', () => {
    const s = p4();
    const id = s.running.realized[0]?.sessionId ?? '';
    expect(s.running.freeRunMeta?.[id]).toEqual({ dateUnknown: true });
    expect(selectFreeRuns(s)[0]?.dateUnknown).toBe(true);
    const next = recentOf(s, s.profile as NonNullable<AppState['profile']>, MONS[1]);
    expect(next.filter((x) => x.sport === 'running' && x.status === 'executed' && x.session.id.startsWith('free:'))).toHaveLength(0);
    // Même course déclarée AVEC une date réelle (semaine précédente de MONS[1]) : voisine réalisée.
    const t = p4('2026-10-05');
    expect(recentOf(t, t.profile as NonNullable<AppState['profile']>, MONS[1]).filter((x) => x.session.id.startsWith('free:'))).toHaveLength(1);
    // Correction sans date : la date reste inconnue, l'instant n'est pas déplacé ; avec une date : elle devient réelle.
    const u = updateFreeRun(s, id, { realizedDurationS: 1800, difficulty: 'EASIER' }, ck(MON, '09:00'));
    expect(u.running.realized.find((r) => r.sessionId === id)?.completedAt).toBe(s.running.realized[0]?.completedAt);
    expect(u.running.freeRunMeta?.[id]).toEqual({ dateUnknown: true });
    const v = updateFreeRun(s, id, { realizedDurationS: 1800, difficulty: 'EASIER', completedOn: '2026-10-03' }, ck(MON, '09:00'));
    expect(Object.values(v.running.freeRunMeta ?? {})).toEqual([]);
  });

  it('F3 sans sport Course (P2) : 90 min libres la veille ⇒ Musculation du lundi allégée à la planification ; une seule voisine par course', () => {
    let s = createBeta0Programme(emptyState(), spec('P2').profile, ck(MON, '07:00'), {});
    s = logFreeRun(s, { ...RUN, realizedDurationS: 5400, distanceM: 15000, startedAt: '2026-10-11T09:00:00Z', type: 'long' }, ck('2026-10-11', '20:00'));
    const rec = recentOf(s, s.profile as NonNullable<AppState['profile']>, MONS[1]).filter((x) => x.sport === 'running');
    expect(rec).toHaveLength(1);
    expect(rec[0]).toMatchObject({ date: '2026-10-11', status: 'executed' });
    s = ensureBeta0Week(s, ck(MONS[1], '06:00'));
    const monday = (selectBeta0Week(s, MONS[1])?.sessions ?? []).find((x) => x.sport === 'strength' && x.date === MONS[1]);
    const ctx = s.planner.weeks[MONS[1]]?.requests.find((r) => r.requestId === monday?.requestId)?.neighbourContext;
    expect(ctx?.neighbours.filter((n) => n.sport === 'running').map((n) => [n.stimulus, n.hoursFromThisSession])).toEqual([['history', -24]]);
  });

  it('au démarrage : course libre faite APRÈS la planification ⇒ évaluée pour la Musculation ; semaine composée inchangée', () => {
    let s = createBeta0Programme(emptyState(), spec('P2').profile, ck(MON, '07:00'), {});
    const strength = (selectBeta0Week(s, MON)?.sessions ?? []).filter((x) => x.sport === 'strength' && x.date && x.date > MON);
    const target = strength[0];
    if (!target?.date) throw new Error('séance de Musculation attendue');
    const dayBefore = new Date(Date.parse(`${target.date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const weekBefore = JSON.stringify(s.planner.weeks[MON]);
    s = logFreeRun(s, { ...RUN, realizedDurationS: 5400, distanceM: 15000, startedAt: `${dayBefore}T18:00:00Z` }, ck(dayBefore, '20:00'));
    expect(JSON.stringify(s.planner.weeks[MON])).toBe(weekBefore);
    expect(freeRunsSincePlanning(s, target.requestId, `${target.date}T07:00:00Z`).map((r) => r.completedAt)).toEqual([`${dayBefore}T19:30:00Z`]);
    const t = startProgrammeSession(s, ck(target.date, '07:00'), target.requestId, undefined, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    const ci = t.checkIns.at(-1);
    // Profil P2 (sans sport Course) : la séance du lendemain est régénérée avec la course comme voisine réalisée.
    expect(ci?.decision).toBe('adapted');
    expect(ci?.reasons.find((r) => r.code === 'KAIRO.FREE_RUN_RECOVERY_APPLIED')?.params.freeRuns).toEqual([`free:${dayBefore}T19:30:00Z`]);
    expect((t.programmeLogs[target.requestId]?.adaptation?.changes ?? []).some((c) => c.startsWith('removed:') || c.startsWith('sets:'))).toBe(true);
    // Sans course libre : séance inchangée (aucun allègement attribué à tort).
    const u = startProgrammeSession(createBeta0Programme(emptyState(), spec('P2').profile, ck(MON, '07:00'), {}), ck(target.date, '07:00'), target.requestId, undefined, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    expect(u.checkIns.at(-1)?.decision).toBe('unchanged');
    // Course d'onboarding sans date : jamais évaluée au démarrage.
    expect(freeRunsSincePlanning(p4(), 'x', `${MON}T23:00:00Z`)).toEqual([]);
  });
});

describe('doublons', () => {
  it('même jour qu’une course du programme réalisée, sans heure : confirmation exigée ; avec heure : seuls les chevauchements sont refusés ; aucune fusion', () => {
    let s = p4('2026-10-01');
    const v = (selectBeta0Week(s, MON)?.sessions ?? []).find((x) => x.sport === 'running' && x.date && x.placement === 'planned');
    if (!v?.date) throw new Error('course attendue');
    s = startProgrammeSession(s, ck(v.date), v.requestId, undefined, { painAnswer: 'no' });
    s = finishProgrammeSession(s, ck(v.date, '09:00'), { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: v.archetypeId === 'running.test' ? 1800 : easyMinutes(s, v.requestId) * 60, distanceM: 6000, ...(v.archetypeId === 'running.test' ? { testTimeS: 1500 } : {}) } });
    const n = s.running.realized.length;
    expect(code(() => logFreeRun(s, { ...RUN, completedOn: v.date ?? '' }, ck(v.date ?? '', '20:00')))).toBe('FREE_RUN_SAME_DAY_CONFIRM');
    const t = logFreeRun(s, { ...RUN, completedOn: v.date, confirmedExtra: true }, ck(v.date, '20:00'));
    expect(t.running.realized.length).toBe(n + 1);
    // Heure précise qui chevauche la course du programme : refus existant conservé.
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: `${v.date ?? ''}T08:30:00Z` }, ck(v.date ?? '', '20:00')))).toBe('DUPLICATE_RUN');
    // Heure précise sans chevauchement : enregistrée sans confirmation.
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: `${v.date ?? ''}T17:00:00Z` }, ck(v.date ?? '', '20:00')))).toBe('OK');
    // Correction de la course acceptée (date inchangée) : la confirmation n'est pas redemandée.
    const id = t.running.realized.at(-1)?.sessionId ?? '';
    expect(code(() => updateFreeRun(t, id, { realizedDurationS: 2400, difficulty: 'EASIER', completedOn: v.date ?? '', type: 'easy' }, ck(v.date ?? '', '21:00')))).toBe('OK');
  });

  it('récupération : une course libre = une voisine, jamais confondue avec une séance du programme ; types sans effet sur la demande (aucune intensité inventée)', () => {
    const base = createBeta0Programme(emptyState(), spec('P2').profile, ck(MON, '07:00'), {});
    const demand = (type?: 'easy' | 'long' | 'threshold') => {
      const s = logFreeRun(base, { ...RUN, realizedDurationS: 3600, startedAt: '2026-10-10T09:00:00Z', ...(type ? { type } : {}) }, ck('2026-10-10', '20:00'));
      const w = ensureBeta0Week(s, ck(MONS[1], '06:00'));
      return JSON.stringify(Object.values(w.planner.weeks[MONS[1]]?.requests ?? []).flatMap((r) => (r.neighbourContext?.neighbours ?? []).filter((n) => n.sport === 'running')));
    };
    const plain = demand();
    expect(JSON.parse(plain).length).toBeGreaterThan(0);
    expect(demand('easy')).toBe(plain);
    expect(demand('long')).toBe(plain);
    expect(demand('threshold')).toBe(plain);
  });
});

describe('persistance, export et données antérieures', () => {
  it('sauvegarde, rechargement et export : `freeRunMeta` conservé à l’identique', () => {
    let s = logFreeRun(p4(), { ...RUN, startedAt: '2026-10-03T07:00:00Z', type: 'threshold' }, ck(MON));
    const storage = new MemoryStorage();
    expect(saveState(storage, s).ok).toBe(true);
    const back = loadState(storage, `${MON}T09:00:00Z`);
    expect(back.status === 'ok' ? back.state.running.freeRunMeta : null).toEqual(s.running.freeRunMeta);
    const exported = decodeState(exportState(s));
    expect(exported.ok && exported.state.running.freeRunMeta).toEqual(s.running.freeRunMeta);
    s = deleteFreeRun(s, 'free:2026-10-03T07:45:00Z');
    expect(Object.keys(s.running.freeRunMeta ?? {})).toEqual([s.running.realized[0]?.sessionId]);
  });

  it('état RC4.3 réel (fixture : types, date inconnue, commentaire, même jour confirmé) : relu, exporté et ré-importé à l’identique', () => {
    const text = readFileSync(join(import.meta.dirname, 'fixtures', 'rc43-real-state.json'), 'utf8');
    const d = decodeState(text);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    // Plus récentes d'abord : 11/10 longue, 10/10 non précisée, 09/10 seuil, 07/10 facile (même jour confirmé), onboarding sans date.
    expect(selectFreeRuns(d.state).map((v) => [v.completedAt.slice(0, 10), v.type, v.dateUnknown])).toEqual([
      ['2026-10-11', 'long', false], ['2026-10-10', null, false], ['2026-10-09', 'threshold', false], ['2026-10-07', 'easy', false], ['2026-10-05', null, true],
    ]);
    expect(Object.values(d.state.running.freeRunMeta ?? {})).toEqual([{ dateUnknown: true }, { type: 'long' }, { type: 'threshold' }, { type: 'easy' }]);
    const again = decodeState(exportState(d.state));
    expect(again.ok && again.state).toEqual(d.state);
  });

  it('états antérieurs sans `freeRunMeta` (fixtures RC1 et RC3) : lisibles, courses « Non précisé », date réelle, aucune référence ajoutée', () => {
    const dir = join(import.meta.dirname, '../rc3-test/fixtures');
    for (const f of ['rc1-hybrid-4-weeks.json', 'rc1-running-week2-threshold.json', 'rc1-running-test-inprogress.json']) {
      const d = decodeState(readFileSync(join(dir, f), 'utf8'));
      expect(d.ok, f).toBe(true);
      if (!d.ok) continue;
      expect(d.state.running.freeRunMeta).toBeUndefined();
      for (const v of selectFreeRuns(d.state)) { expect(v.type).toBeNull(); expect(v.dateUnknown).toBe(false); }
      const refs = d.state.running.references.length;
      const w = logFreeRun(d.state, { ...RUN, startedAt: '2026-09-01T07:00:00Z', type: 'long' }, ck('2026-10-20'));
      expect(w.running.references.length).toBe(refs);
    }
  });
});
