/**
 * RC3.4 — historique Running fiabilisé : course réalisée ≠ performance de référence ; date facultative de la dernière
 * course (onboarding) ; correction et suppression d'une course libre ; douleur déclarée (mécanisme existant) ; course
 * libre pour un profil HYROX sans Course, sans effet sur HYROX. Jamais de semaine planifiée modifiée.
 */
import { describe, expect, it } from 'vitest';
import {
  createBeta0Programme, decodeState, deleteFreeRun, emptyState, ensureBeta0Week, exportState, logFreeRun, selectBeta0Week, selectFreeRuns,
  selectRunningProfile, updateFreeRun,
} from '../../src/index.js';
import type { AppState, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { hrProfile } from '../hr/hr-fixtures.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, t = '07:30:00') => ({ today: d, now: `${d}T${t}Z` });
// technical-constant: TEST_ONLY — course déclarée (s, m)
const RUN = { realizedDurationS: 1800, completion: 'COMPLETED' as const, difficulty: 'AS_EXPECTED' as const, pain: false, distanceM: 5000 };
const runner = (): ProfileInput => profile({ priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 }, running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } });
const LAST = { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const } };
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; } };
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const free = (s: AppState, id: string) => selectFreeRuns(s).find((x) => x.sessionId === id);

describe('1. course réalisée ≠ performance de référence (audit)', () => {
  it('une course libre, même très rapide, ne crée JAMAIS de référence de performance ; elle reste de l’historique d’entraînement', () => {
    const s0 = createBeta0Programme(emptyState(), runner(), clock(W1), LAST);
    const s = logFreeRun(s0, { ...RUN, realizedDurationS: 1080, startedAt: '2026-10-03T08:00:00Z' }, at(W1));
    expect(s.running.references).toEqual(s0.running.references);
    expect(selectRunningProfile(s, W1)?.references).toEqual(selectRunningProfile(s0, W1)?.references);
    expect(s.running.realized.length).toBe(s0.running.realized.length + 1);
  });
});

describe('2. date de la dernière course (onboarding)', () => {
  it('date fournie : course enregistrée à cette date (convention de jour), heure marquée inconnue ; sans date : comportement antérieur', () => {
    const dated = createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { ...LAST.lastRun, date: '2026-09-30' } });
    const r = selectFreeRuns(dated)[0];
    expect(r).toMatchObject({ completedAt: '2026-09-30T12:00:00Z', timeKnown: false });
    const legacy = createBeta0Programme(emptyState(), runner(), clock(W1), LAST);
    expect(selectFreeRuns(legacy)[0]).toMatchObject({ completedAt: '2026-10-05T07:30:00Z', timeKnown: true });
    // Course du jour avant midi : bornée à maintenant (jamais dans le futur).
    const today = createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { ...LAST.lastRun, date: W1 } });
    expect(selectFreeRuns(today)[0]?.completedAt).toBe('2026-10-05T07:30:00Z');
    expect(code(() => createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { ...LAST.lastRun, date: '2026-10-06' } }))).toBe('RUN_IN_FUTURE');
    expect(code(() => createBeta0Programme(emptyState(), runner(), clock(W1), { lastRun: { ...LAST.lastRun, date: '30/09/2026' } }))).toBe('RUN_DATE_INVALID');
    // Persistance de la marque « heure inconnue ».
    expect(selectFreeRuns(reload(dated))[0]?.timeKnown).toBe(false);
  });
});

describe('3. correction et suppression d’une course libre', () => {
  const base = () => logFreeRun(createBeta0Programme(emptyState(), runner(), clock(W1), LAST), { ...RUN, startedAt: '2026-10-03T08:00:00Z', note: 'Parc' }, at(W1));
  const ID = 'free:2026-10-03T08:30:00Z';

  it('correction : date, durée, distance, ressenti, commentaire ; identifiant et commentaire suivent ; une seule entrée ; semaines et programme inchangés', () => {
    const s0 = base();
    const s = updateFreeRun(s0, ID, { realizedDurationS: 2400, distanceM: 6000, startedAt: '2026-10-02T18:00:00Z', difficulty: 'HARDER', note: 'Parc, avec côtes' }, at(W1, '09:00:00'));
    expect(free(s, ID)).toBeUndefined();
    expect(free(s, 'free:2026-10-02T18:40:00Z')).toMatchObject({ durationS: 2400, distanceM: 6000, paceSecPerKm: 400, difficulty: 'HARDER', note: 'Parc, avec côtes', timeKnown: true });
    expect(s.running.realized.length).toBe(s0.running.realized.length);
    expect(s.planner.weeks).toEqual(s0.planner.weeks);
    expect(s.programmeState).toEqual(s0.programmeState);
    expect(selectFreeRuns(reload(s))).toEqual(selectFreeRuns(s));
    // Retrait de la distance et du commentaire.
    const t = updateFreeRun(s, 'free:2026-10-02T18:40:00Z', { realizedDurationS: 2400, startedAt: '2026-10-02T18:00:00Z', difficulty: 'HARDER', note: '' }, at(W1, '09:00:00'));
    expect(free(t, 'free:2026-10-02T18:40:00Z')).toMatchObject({ distanceM: null, paceSecPerKm: null, note: null });
    expect(t.running.notes).toBeUndefined();
  });

  it('correction refusée (état inchangé) : chevauchement avec une autre course, saisie invalide, course inconnue ou course du programme ; chevauchement avec elle-même accepté', () => {
    let s = base();
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-04T08:00:00Z' }, at(W1));
    expect(code(() => updateFreeRun(s, ID, { realizedDurationS: 1800, distanceM: 5000, startedAt: '2026-10-04T08:10:00Z', difficulty: 'AS_EXPECTED' }, at(W1)))).toBe('DUPLICATE_RUN');
    expect(code(() => updateFreeRun(s, ID, { realizedDurationS: 0, startedAt: '2026-10-03T08:00:00Z', difficulty: 'AS_EXPECTED' }, at(W1)))).toBe('DURATION_INVALID');
    expect(code(() => updateFreeRun(s, ID, { realizedDurationS: 1800, startedAt: '2026-10-06T08:00:00Z', difficulty: 'AS_EXPECTED' }, at(W1)))).toBe('RUN_IN_FUTURE');
    expect(code(() => updateFreeRun(s, 'free:inconnue', { realizedDurationS: 1800, startedAt: '2026-10-03T08:00:00Z', difficulty: 'AS_EXPECTED' }, at(W1)))).toBe('FREE_RUN_UNKNOWN');
    expect(code(() => deleteFreeRun(s, '2026-10-05.running.1'))).toBe('FREE_RUN_UNKNOWN');
    expect(code(() => updateFreeRun(s, ID, { realizedDurationS: 1900, distanceM: 5000, startedAt: '2026-10-03T08:05:00Z', difficulty: 'AS_EXPECTED' }, at(W1)))).toBe('OK');
  });

  it('suppression : course et commentaire retirés ; semaines et programme inchangés ; la même course peut être ressaisie ensuite', () => {
    const s0 = base();
    const s = deleteFreeRun(s0, ID);
    expect(free(s, ID)).toBeUndefined();
    expect(s.running.notes).toBeUndefined();
    expect(s.running.realized.length).toBe(s0.running.realized.length - 1);
    expect(s.planner.weeks).toEqual(s0.planner.weeks);
    expect(s.programmeState).toEqual(s0.programmeState);
    expect(code(() => logFreeRun(s, { ...RUN, startedAt: '2026-10-03T08:00:00Z' }, at(W1)))).toBe('OK');
  });

  it('course ayant servi de dose de départ supprimée : la semaine déjà planifiée reste telle quelle ; la semaine suivante est planifiée sans elle', () => {
    const s0 = createBeta0Programme(emptyState(), runner(), clock(W1), LAST);
    const anchor = selectFreeRuns(s0)[0]?.sessionId ?? '';
    const s = ensureBeta0Week(deleteFreeRun(s0, anchor), at(W1, '09:00:00'));
    expect(s.planner.weeks).toEqual(s0.planner.weeks);
    const w2 = ensureBeta0Week(s, at(W2));
    expect((selectBeta0Week(w2, W2)?.sessions ?? []).filter((x) => x.sport === 'running').every((x) => x.notPlanned?.display === 'missing_data')).toBe(true);
  });
});

describe('4. douleur déclarée avec une course libre (mécanisme existant)', () => {
  it('douleur ⇒ pause douleur avec zones ; seconde douleur ⇒ zones ajoutées, date de début conservée ; sans douleur ⇒ pause INCHANGÉE ; suppression ⇒ pause INCHANGÉE', () => {
    let s = createBeta0Programme(emptyState(), runner(), clock(W1), LAST);
    expect(s.safety.activePain).toBeNull();
    s = logFreeRun(s, { ...RUN, pain: true, painAreas: ['knee'], startedAt: '2026-10-03T08:00:00Z' }, at(W1));
    expect(s.safety.activePain).toEqual({ reportedAt: '2026-10-05T07:30:00Z', areas: ['knee'] });
    expect(free(s, 'free:2026-10-03T08:30:00Z')?.pain).toBe(true);
    s = logFreeRun(s, { ...RUN, pain: true, painAreas: ['ankle_foot'], startedAt: '2026-10-04T08:00:00Z' }, at(W1, '08:00:00'));
    expect(s.safety.activePain).toEqual({ reportedAt: '2026-10-05T07:30:00Z', areas: ['ankle_foot', 'knee'] });
    const before = s.safety;
    s = logFreeRun(s, { ...RUN, startedAt: '2026-10-02T08:00:00Z' }, at(W1, '08:10:00'));
    expect(s.safety).toEqual(before);
    s = deleteFreeRun(s, 'free:2026-10-03T08:30:00Z');
    expect(s.safety).toEqual(before);
    // Correction : la douleur déclarée n'est pas effacée.
    s = updateFreeRun(s, 'free:2026-10-04T08:30:00Z', { realizedDurationS: 1800, startedAt: '2026-10-04T08:00:00Z', difficulty: 'EASIER' }, at(W1, '08:20:00'));
    expect(free(s, 'free:2026-10-04T08:30:00Z')?.pain).toBe(true);
    expect(s.safety).toEqual(before);
  });
});

describe('5. profil HYROX sans Course', () => {
  it('course libre acceptée (historique seulement) ; séances HYROX de la semaine et de la semaine suivante IDENTIQUES avec ou sans elle', () => {
    const p = hrProfile();
    expect(p.running.enabled).toBe(false);
    const s0 = createBeta0Programme(emptyState(), p, clock(W1), {});
    const s = logFreeRun(s0, { ...RUN, startedAt: '2026-10-04T08:00:00Z' }, at(W1));
    expect(selectFreeRuns(s)).toHaveLength(1);
    expect(s.planner.weeks).toEqual(s0.planner.weeks);
    const hr = (x: AppState) => JSON.stringify(Object.values(ensureBeta0Week(x, at(W2)).planner.weeks).flatMap((w) => w.requests.filter((r) => r.sport === 'hyrox').map((r) => [r.status, r.date, r.record])));
    expect(hr(s)).toBe(hr(s0));
  });
});

describe('6. migrations', () => {
  it('état RC3.3 (commentaire, sans marque « heure inconnue ») et état antérieur (sans annexes) : relus tels quels', () => {
    const s = logFreeRun(createBeta0Programme(emptyState(), runner(), clock(W1), LAST), { ...RUN, startedAt: '2026-10-03T08:00:00Z', note: 'Parc' }, at(W1));
    const rc33 = JSON.parse(exportState(s)) as { state: { running: Record<string, unknown> } } & Record<string, unknown>;
    const st = (rc33.state ?? rc33) as { running: Record<string, unknown> };
    delete st.running.timeUnknown;
    const d1 = decodeState(JSON.stringify(rc33));
    if (!d1.ok) throw new Error(d1.problem);
    expect(selectFreeRuns(d1.state).every((r) => r.timeKnown)).toBe(true);
    expect(selectFreeRuns(d1.state).find((r) => r.sessionId === 'free:2026-10-03T08:30:00Z')?.note).toBe('Parc');
    delete st.running.notes;
    const d2 = decodeState(JSON.stringify(rc33));
    if (!d2.ok) throw new Error(d2.problem);
    expect(selectFreeRuns(d2.state).map((r) => r.note)).toEqual([null, null]);
  });
});
