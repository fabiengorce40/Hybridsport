/**
 * RC4.5 (lot C) — interférence musculaire NON BLOQUANTE au démarrage manuel : avertissement, maintien volontaire sur
 * confirmation explicite (`acceptInterference`), tracé par une raison EXISTANTE du contrôle avant séance (aucun champ).
 * Plan C-1 à C-7 et C-10 (lecture) ; C-8 / C-9 : DOM et E2E de l'application.
 *
 * Adversarial : aucune cause de sécurité (qualité BLOQUÉE, pause douleur, signal général P4, douleur non adaptable,
 * hors semaine, fail-closed) n'est contournable par le maintien ; une séance maintenue n'est jamais « bien tolérée ».
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CHECKIN_DECISIONS, ensureBeta0Week, finishProgrammeSession, INTERFERENCE_ACCEPTED, maintainedInterference, manualStartAssessment, MemoryStorage,
  recordFieldFeedback, saveState, selectBetaJournal, selectFieldHistory, startProgrammeSession, STORAGE_KEY, zCheckIn,
} from '../../src/index.js';
import type { AppState, CheckInInput } from '../../src/index.js';
import { at, create, hrProfile, reload } from '../hr/hr-fixtures.js';

const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
const D = (day: string, h = '18:00') => at(`2026-10-${day}T${h}:00.000Z`);
const s0 = create(FOUR);
const U = '2026-10-05.running.2';
const ACCEPT = { acceptInterference: true } as const;
const start = (s: AppState, day: string, ci?: CheckInInput, accept = true) => startProgrammeSession(s, D(day), U, undefined, ci, accept ? ACCEPT : {});
const lastCheckIn = (s: AppState) => s.checkIns.at(-1);
const withoutReason = (s: AppState): AppState => ({ ...s, checkIns: s.checkIns.map((c) => ({ ...c, reasons: c.reasons.filter((r) => r.code !== INTERFERENCE_ACCEPTED) })) });
const blockedOf = (s: AppState): AppState => ({ ...s, planner: { weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === U && r.quality ? { ...r, quality: { ...r.quality, verdict: 'BLOCKED' as const } } : r)) }])) } });
const pained = finishProgrammeSession(startProgrammeSession(s0, D('05'), '2026-10-05.strength.1'), D('05', '19:00'), { requestId: '2026-10-05.strength.1', completion: 'modified', pain: true });
const FIXTURE = fileURLToPath(new URL('./fixtures/lotc-maintained-state.json', import.meta.url));

describe('RC4.5 lot C — avertissement d’interférence maintenable', () => {
  it('C-2. interférence M3 au démarrage manuel : avertissement maintenable ; sans confirmation, refus inchangé ; état intact', () => {
    const a = manualStartAssessment(s0, D('05'), U);
    expect(a).toMatchObject({ allowed: false, cause: 'INTERFERENCE', maintainable: true });
    expect(a.conflicts.length).toBeGreaterThan(0);
    const before = JSON.stringify(s0);
    expect(code(() => start(s0, '05', undefined, false))).toBe('MANUAL_START_INTERFERENCE');
    expect(code(() => startProgrammeSession(s0, D('05'), U, undefined, undefined, { acceptInterference: false }))).toBe('MANUAL_START_INTERFERENCE');
    expect(JSON.stringify(s0)).toBe(before);
  });
  it('C-2. avec confirmation : séance démarrée, raison tracée (conflits, date), décision EXISTANTE', () => {
    const a = manualStartAssessment(s0, D('05'), U);
    const s = start(s0, '05');
    expect(s.programmeLogs[U]?.startedAt).toBe('2026-10-05T18:00:00Z');
    const c = lastCheckIn(s);
    expect(c?.decision).toBe('unchanged');
    expect(CHECKIN_DECISIONS).toContain(c?.decision);
    expect(c?.reasons.filter((r) => r.code === INTERFERENCE_ACCEPTED)).toEqual([{ code: INTERFERENCE_ACCEPTED, params: { requestId: U, acceptedAt: '2026-10-05T18:00:00Z', conflicts: a.conflicts.map((x) => ({ ...x })) } }]);
    expect(maintainedInterference(s, U)).toEqual(a.conflicts);
  });
  it('C-2. confirmation sans interférence (jour libre) : aucun effet, aucune raison de maintien', () => {
    expect(manualStartAssessment(s0, D('10'), U)).toEqual({ allowed: true, cause: null, conflicts: [], maintainable: false });
    const s = start(s0, '10');
    expect(JSON.stringify(s)).toBe(JSON.stringify(startProgrammeSession(s0, D('10'), U)));
    expect(maintainedInterference(s, U)).toBeNull();
  });
  it('C-2. séance PLACÉE : la confirmation ne change rien (règle déjà appliquée au placement)', () => {
    const id = '2026-10-05.strength.1';
    expect(JSON.stringify(startProgrammeSession(s0, D('05'), id, undefined, undefined, ACCEPT))).toBe(JSON.stringify(startProgrammeSession(s0, D('05'), id)));
  });
});

describe('RC4.5 lot C — sécurité jamais contournable (C-3, C-4)', () => {
  it('C-3 / C-4. qualité BLOQUÉE (seule ou avec interférence) : refus, jamais maintenable', () => {
    const b = blockedOf(s0);
    expect(manualStartAssessment(b, D('05'), U)).toMatchObject({ cause: 'QUALITY_BLOCKED', maintainable: false });
    expect(code(() => start(b, '05'))).toBe('QUALITY_BLOCKED');
    expect(code(() => start(b, '10'))).toBe('QUALITY_BLOCKED');
  });
  it('C-3 / C-4. pause douleur active (seule ou avec interférence) : refus, jamais maintenable', () => {
    expect(pained.safety.activePain).not.toBeNull();
    expect(manualStartAssessment(pained, D('05'), U)).toMatchObject({ cause: 'ACTIVE_PAIN', maintainable: false });
    expect(code(() => start(pained, '05'))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
    expect(code(() => start(pained, '10'))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
  it('C-3. hors semaine : refus, jamais maintenable', () => {
    const next = ensureBeta0Week(s0, D('12', '07:30'));
    expect(manualStartAssessment(next, D('12'), U)).toMatchObject({ cause: 'OUTSIDE_WEEK', maintainable: false });
    expect(code(() => startProgrammeSession(next, D('12'), U, undefined, undefined, ACCEPT))).toBe('MANUAL_START_OUTSIDE_WEEK');
  });
  it('C-3. fail-closed (programme absent, aucun conflit identifié) : refus d’interférence NON maintenable', () => {
    const broken: AppState = { ...s0, programmeState: null };
    const a = manualStartAssessment(broken, D('05'), U);
    expect(a.maintainable).toBe(false);
    expect(code(() => startProgrammeSession(broken, D('05'), U, undefined, undefined, ACCEPT))).not.toBe('OK');
  });
  it('C-3. signal général (P4) au contrôle après maintien : pause douleur, séance NON démarrée, maintien non tracé', () => {
    const s = start(s0, '05', { painAnswer: 'yes', pains: [], generalSignal: true });
    expect(s.programmeLogs[U]).toBeUndefined();
    expect(lastCheckIn(s)?.decision).toBe('paused');
    expect(s.safety.activePain).not.toBeNull();
    expect(lastCheckIn(s)?.reasons.some((r) => r.code === INTERFERENCE_ACCEPTED)).toBe(false);
    expect(maintainedInterference(s, U)).toBeNull();
  });
  it('C-3. douleur déclarée au contrôle : même décision qu’un jour sans interférence (le maintien ne lève aucune règle de douleur)', () => {
    // Les quatre décisions existantes sont couvertes : adaptée, reportée (non adaptable), pause, inchangée.
    const cases: [CheckInInput, string][] = [
      [{ painAnswer: 'yes', pains: [{ area: 'knee', level: 'P3' }] }, 'adapted'],
      [{ painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }, { area: 'lower_back', level: 'P2' }] }, 'postponed'],
      [{ painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }, { area: 'hip_groin', level: 'P3' }, { area: 'lower_back', level: 'P3' }] }, 'paused'],
      [{ painAnswer: 'yes', pains: [{ area: 'shoulder', level: 'P1' }], fatigue: 'high', recovery: 'poor' }, 'unchanged'],
    ];
    for (const [ci, expected] of cases) {
      const maintained = start(s0, '05', ci);
      const free = startProgrammeSession(s0, D('10'), U, undefined, ci);
      const dm = lastCheckIn(maintained);
      const df = lastCheckIn(free);
      expect(dm?.decision).toBe(expected);
      expect(dm?.decision).toBe(df?.decision);
      expect(maintained.programmeLogs[U] === undefined).toBe(free.programmeLogs[U] === undefined);
      expect(maintained.safety.activePain === null).toBe(free.safety.activePain === null);
      if (dm?.decision === 'postponed' || dm?.decision === 'paused') expect(maintainedInterference(maintained, U)).toBeNull();
    }
  });
});

describe('RC4.5 lot C — maintenue ≠ bien tolérée (C-5, C-6), reprise (C-7)', () => {
  const maintained = start(s0, '05');
  it('C-5. la raison de maintien n’est lue par aucune règle : fin de séance, résultat, semaine suivante identiques sans elle', () => {
    const f = { completion: 'completed_as_prescribed' as const, pain: false, run: { realizedDurationS: 1500 } };
    const a = finishProgrammeSession(maintained, D('05', '19:00'), { requestId: U, ...f });
    const b = finishProgrammeSession(withoutReason(maintained), D('05', '19:00'), { requestId: U, ...f });
    expect(JSON.stringify(withoutReason(a))).toBe(JSON.stringify(b));
    const na = ensureBeta0Week(a, D('12', '07:30'));
    const nb = ensureBeta0Week(b, D('12', '07:30'));
    expect(JSON.stringify(withoutReason(na))).toBe(JSON.stringify(nb));
    // Aucun ressenti, aucune tolérance écrits par le maintien.
    const r = a.programmeState?.results.find((x) => x.requestId === U);
    expect(Object.keys(r ?? {}).filter((k) => /toleran|feedback|difficulty/.test(k))).toEqual([]);
    expect(selectFieldHistory(a).find((e) => e.requestId === U)?.feedback ?? null).toBeNull();
    expect(selectBetaJournal(a).find((e) => e.requestId === U)?.feedback ?? null).toBeNull();
    expect(maintainedInterference(a, U)).not.toBeNull();
  });
  it('C-6. retour après maintien : douleur et ressenti « très difficile » appliqués normalement, jamais masqués', () => {
    const done = finishProgrammeSession(maintained, D('05', '19:00'), { requestId: U, completion: 'modified', pain: true, run: { realizedDurationS: 900 } });
    expect(done.safety.activePain).not.toBeNull();
    const fb = recordFieldFeedback(done, D('05', '19:05'), U, { difficulty: 'very_hard' });
    expect(selectFieldHistory(fb).find((e) => e.requestId === U)?.feedback?.difficulty).toBe('very_hard');
    expect(manualStartAssessment(fb, D('06'), '2026-10-05.strength.1').cause).toBe('ACTIVE_PAIN');
  });
  it('C-7. séance maintenue puis rechargée : reprise sans nouvel avertissement ni nouveau contrôle', () => {
    const r = reload(maintained, '2026-10-05T18:20:00.000Z');
    expect(manualStartAssessment(r, D('05', '18:21'), U).allowed).toBe(true);
    expect(startProgrammeSession(r, D('05', '18:21'), U)).toBe(r);
    expect(maintainedInterference(r, U)).toEqual(maintainedInterference(maintained, U));
  });
});

describe('RC4.5 lot C — format (C-1) et état de référence pour la relecture par le repli (C-10)', () => {
  const maintained = start(s0, '05');
  it('C-1. contrôle avec la raison : schéma strict existant, aucun champ nouveau ; rechargement octet pour octet', () => {
    const c = lastCheckIn(maintained);
    expect(zCheckIn.safeParse(c).success).toBe(true);
    expect(Object.keys(c ?? {}).sort()).toEqual(Object.keys(lastCheckIn(startProgrammeSession(s0, D('10'), U)) ?? {}).sort());
    const st = new MemoryStorage();
    expect(saveState(st, maintained).ok).toBe(true);
    const text = st.getItem(STORAGE_KEY) ?? '';
    const st2 = new MemoryStorage();
    expect(saveState(st2, reload(maintained, '2026-10-05T18:20:00.000Z')).ok).toBe(true);
    expect(st2.getItem(STORAGE_KEY)).toBe(text);
  });
  it('C-10. fixture : état réel écrit par le code du lot C (séance maintenue, terminée), relu par le repli hors dépôt', () => {
    const done = finishProgrammeSession(maintained, D('05', '19:00'), { requestId: U, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } });
    const st = new MemoryStorage();
    expect(saveState(st, done).ok).toBe(true);
    const text = st.getItem(STORAGE_KEY) ?? '';
    if (process.env.LOTC_WRITE_FIXTURE) writeFileSync(FIXTURE, text);
    expect({ ...JSON.parse(readFileSync(FIXTURE, 'utf8')), schemaVersion: 4 }).toEqual(JSON.parse(text));
    expect(text).toContain(INTERFERENCE_ACCEPTED);
  });
  it('C-9. états de départ du parcours E2E (lundi 18 h, séance non placée en interférence ; puis pause douleur active)', () => {
    for (const [name, s] of [['lotc-e2e-base', s0], ['lotc-e2e-pained', pained]] as const) {
      const st = new MemoryStorage();
      expect(saveState(st, s).ok).toBe(true);
      const text = st.getItem(STORAGE_KEY) ?? '';
      const file = fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url));
      if (process.env.LOTC_WRITE_FIXTURE) writeFileSync(file, text);
      expect({ ...JSON.parse(readFileSync(file, 'utf8')), schemaVersion: 4 }).toEqual(JSON.parse(text));
    }
  });
});
