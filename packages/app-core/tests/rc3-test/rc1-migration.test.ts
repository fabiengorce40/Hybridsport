/**
 * RC3 TEST — migration des données RC1 TEST (téléphone) vers RC3.1–RC3.5.
 *
 * Les fixtures `rc1-*.json` sont le texte EXACT stocké par le code RC1 TEST (`claude/kairo-rc1-test-env` @ efc5f2f,
 * application identique à f0b09e4) : séances en cours (Musculation avec chrono de repos qui tourne ou en pause,
 * Cross-training chrono lancé, HYROX en pause, TEST Running commencé, course adaptée par le contrôle avant séance),
 * pause douleur active, TEST refusé faute de distance (cas A2), historique hybride sur 4 semaines.
 *
 * Garanties vérifiées : relecture sans migration ni perte (même texte réécrit octet pour octet), aucune copie
 * « illisible », semaines persistées jamais réécrites, séances en cours reprises et terminées par le code RC3,
 * chronomètres identiques, profils et historiques conservés, sécurité (pause douleur) inchangée.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  activePainPause, beta0Environment, strengthEnvironmentFor, controlCtTimer, controlHrTimer, controlRest, controlRunPlayer, ctElapsedS, decodeState, ensureBeta0Week, finishProgrammeSession, loadState, MemoryStorage,
  restRemainingS, runPlayerPosition, runPlayerSteps, saveState, selectBeta0Week, selectFreeRuns, selectHistory, selectProgrammeSession, selectRunningProfile, startProgrammeSession,
  STORAGE_KEY,
} from '../../src/index.js';
import type { AppState, Clock, ProgrammeLog } from '../../src/index.js';

const DIR = join(import.meta.dirname, 'fixtures');
const FIXTURES = readdirSync(DIR).filter((f) => f.startsWith('rc1-') && f.endsWith('.json')).sort();
const text = (name: string): string => readFileSync(join(DIR, `rc1-${name}.json`), 'utf8');
const decode = (name: string): AppState => {
  const d = decodeState(text(name));
  if (!d.ok) throw new Error(d.problem);
  return d.state;
};
const at = (iso: string, s = 0): Clock => {
  const now = new Date(Date.parse(iso) + s * 1000).toISOString().replace('.000Z', 'Z');
  return { today: now.slice(0, 10), now };
};
const open = (s: AppState): ProgrammeLog => {
  const l = Object.values(s.programmeLogs).find((x) => x.finishedAt === undefined);
  if (!l) throw new Error('aucune séance en cours');
  return l;
};
/** Empreintes calculées par le CODE RC1 (efc5f2f) sur ces mêmes états : historique, et semaine suivante planifiée. */
const REFERENCE = JSON.parse(readFileSync(join(DIR, 'reference-rc1-efc5f2f.json'), 'utf8')) as Record<string, { history: string; next: string }>;
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const hash = (v: unknown): string => createHash('sha256').update(canon(v)).digest('hex');
/** Retire le seul champ ajouté par RC3 à une semaine persistée (RC3.1 A8 : cause décisive d'une demande non planifiée). */
const withoutCause = (s: AppState): AppState => ({
  ...s,
  planner: { ...s.planner, weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map(({ cause: _cause, ...r }) => r) }])) },
});
/** RC4.4 — retire la seule trace ajoutée par le placement global G5 (identifiant de simulation de la semaine). */
const withoutG5Trace = (s: AppState): AppState => ({
  ...s,
  planner: { ...s.planner, weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, simulation: w.simulation?.filter((x) => x !== 'planner.globalPlacement') }])) },
});
const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? (e as Error).message; } };

describe('RC1 TEST → RC3 : relecture sans perte', () => {
  it('10 états RC1 couvrant les séances en cours, la douleur et l’historique', () => {
    expect(FIXTURES).toHaveLength(10);
  });

  for (const f of FIXTURES) {
    it(`${f} : relu tel quel (aucune migration, aucune copie illisible), réécrit octet pour octet`, () => {
      const raw = readFileSync(join(DIR, f), 'utf8');
      const storage = new MemoryStorage();
      storage.setItem(STORAGE_KEY, raw);
      const r = loadState(storage, '2026-11-10T08:00:00Z');
      expect(r.status).toBe('ok');
      if (r.status !== 'ok') return;
      expect(r.migratedFrom).toBeUndefined();
      expect(storage.keys()).toEqual([STORAGE_KEY]);
      expect(saveState(storage, r.state)).toEqual({ ok: true });
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
      // Profil, journaux, résultats, contrôles, réalisations Running : identiques.
      const before = JSON.parse(raw) as AppState;
      expect(r.state.profile).toEqual(before.profile);
      expect(r.state.programmeLogs).toEqual(before.programmeLogs);
      expect(r.state.running).toEqual(before.running);
      expect(r.state.checkIns).toEqual(before.checkIns);
      // Historique : identique à celui calculé par le code RC1 sur la même donnée.
      expect(hash(selectHistory(r.state))).toBe(REFERENCE[f]?.history);
    });

    it(`${f} : semaine suivante planifiée par RC3 = planification RC1, au seul champ additif « cause » près`, () => {
      const s0 = decode(f.slice('rc1-'.length, -'.json'.length));
      // RC4.5 (F6) : contenu Strength 4F d'origine (registre versionné) — à contenu égal, la planification reste celle
      // de RC1 ; le contenu courant F6 n'ajoute que les mollets (banc RC4, rapport F6).
      const lock = (e: ReturnType<typeof beta0Environment>) => strengthEnvironmentFor(e, '0.4.0-strength-science-lock', '0.2.0-strength-test') ?? e;
      // RC4.4 : second passage G5 DÉSACTIVÉ (paramètre absent) ⇒ planification strictement identique à RC1 (V0).
      const later = ensureBeta0Week(s0, at('2026-11-09T06:00:00Z'), lock(beta0Environment({ globalPlacement: false })));
      expect(hash(withoutCause(later))).toBe(REFERENCE[f]?.next);
      // G5 ACTIF (Beta 0) : aucune paire Full Body à J/J+1 dans ces états ⇒ même planification, seule la trace de
      // simulation (`planner.globalPlacement`) est ajoutée à la semaine persistée.
      const g5 = ensureBeta0Week(s0, at('2026-11-09T06:00:00Z'), lock(beta0Environment()));
      expect(hash(withoutCause(withoutG5Trace(g5)))).toBe(REFERENCE[f]?.next);
      // Séances terminées conservées. Une séance laissée EN COURS au-delà de sa semaine est retirée à la clôture : même
      // comportement en RC1 (empreinte identique ci-dessus), indépendant de la mise à jour.
      const done = (s: AppState) => Object.fromEntries(Object.entries(s.programmeLogs).filter(([, l]) => l.finishedAt !== undefined));
      expect(done(later)).toEqual(done(s0));
      expect(later.profile).toEqual(s0.profile);
    });
  }
});

describe('RC1 TEST → RC3 : séances en cours reprises par le code RC3', () => {
  it('Musculation, chrono de repos qui tourne : même temps restant, commandes et fin de séance', () => {
    const s0 = decode('strength-inprogress-rest-running');
    const log = open(s0);
    const rest = log.rest;
    if (!rest) throw new Error('repos attendu');
    const t = at(rest.endsAt, -30);
    expect(restRemainingS(rest, t.now)).toBe(30);
    expect(log.sets.filter((x) => x.done)).toHaveLength(3);
    let s = controlRest(s0, t, log.requestId, 'pause');
    expect(s.programmeLogs[log.requestId]?.rest?.pausedRemainingS).toBe(30);
    s = controlRest(s, at(rest.endsAt, 60), log.requestId, 'skip');
    s = finishProgrammeSession(s, at(rest.endsAt, 1200), { requestId: log.requestId, completion: 'modified', pain: false });
    expect(selectProgrammeSession(s, log.requestId)?.result?.completion).toBe('modified');
    expect(s.programmeLogs[log.requestId]?.sets).toEqual(log.sets);
  });

  it('Musculation, repos en pause : temps figé conservé', () => {
    const s0 = decode('strength-inprogress-rest-paused');
    const rest = open(s0).rest;
    if (!rest) throw new Error('repos attendu');
    expect(rest.pausedRemainingS).toBe(40);
    expect(restRemainingS(rest, '2026-12-01T00:00:00Z')).toBe(40);
  });

  it('Cross-training, chrono lancé : temps écoulé recalculé, pause, fin', () => {
    const s0 = decode('ct-inprogress-timer');
    const log = open(s0);
    if (!log.ct) throw new Error('chrono CT attendu');
    const t = at(log.startedAt, 900);
    expect(ctElapsedS(log.ct, t.now)).toBeGreaterThan(0);
    expect(log.ct).toMatchObject({ rounds: 3, partialReps: 5 });
    let s = controlCtTimer(s0, t, log.requestId, 'pause');
    s = finishProgrammeSession(s, at(log.startedAt, 1000), { requestId: log.requestId, completion: 'abandoned', pain: false });
    expect(s.programmeLogs[log.requestId]?.outcome?.ct?.elapsedS).toBe(ctElapsedS(log.ct, t.now));
  });

  it('HYROX en pause : position, charges et temps conservés ; reprise et fin', () => {
    const s0 = decode('hyrox-inprogress-paused');
    const log = open(s0);
    expect(log.hr).toMatchObject({ runningSince: null, steps: 2 });
    let s = controlHrTimer(s0, at(log.startedAt, 3600), log.requestId, 'resume');
    s = finishProgrammeSession(s, at(log.startedAt, 3700), { requestId: log.requestId, completion: 'abandoned', pain: false, hr: { timeCapReached: false } });
    expect(s.programmeLogs[log.requestId]?.outcome?.hr?.performedLoads).toEqual(log.hr?.loads);
  });

  it('TEST Running commencé en RC1 : le lecteur RC3.5 démarre sur la séance persistée ; fin ⇒ référence TIME_TRIAL', () => {
    const s0 = decode('running-test-inprogress');
    const log = open(s0);
    expect(log.runPlayer).toBeUndefined();
    const v = selectProgrammeSession(s0, log.requestId);
    const steps = v ? runPlayerSteps(v) : null;
    expect(steps?.map((x) => x.key)).toEqual(['warmup/1/1/single', 'test/1/1/single', 'cooldown/1/1/single']);
    let s = controlRunPlayer(s0, at(log.startedAt, 60), log.requestId, 'start');
    expect(runPlayerPosition(s.programmeLogs[log.requestId]?.runPlayer, steps ?? [], at(log.startedAt, 60 + 700).now)).toMatchObject({ index: 1, remainingS: null });
    s = finishProgrammeSession(s, at(log.startedAt, 4000), { requestId: log.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 3900, testTimeS: 2700 } });
    expect(s.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: expect.objectContaining({ durationS: 2700 }) })]);
  });

  it('Course adaptée par le contrôle avant séance (genou P2, rameur) : le lecteur déroule la séance adaptée', () => {
    const s0 = decode('pain-running-adapted-inprogress');
    const log = open(s0);
    const v = selectProgrammeSession(s0, log.requestId);
    expect(v?.adaptation).not.toBeNull();
    expect(v?.session.blocks[0]?.items[0]?.exerciseId).toBe('ex.row_erg');
    expect(v ? runPlayerSteps(v) : null).not.toBeNull();
  });

  it('Pause douleur active : conservée ; tout nouveau départ refusé', () => {
    const s0 = decode('pain-pause-active');
    expect(activePainPause(s0)).toBeTruthy();
    const next = (selectBeta0Week(s0, '2026-10-05')?.sessions ?? []).find((x) => x.status === 'planned' && x.date !== null && !s0.programmeLogs[x.requestId]);
    expect(code(() => startProgrammeSession(s0, at(`${next?.date ?? ''}T08:00:00Z`), next?.requestId ?? ''))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
});

describe('RC1 TEST → RC3 : vues RC3.1–RC3.4 sur des données RC1', () => {
  it('A2 : TEST refusé en RC1 reste tracé « non planifié » ; motif affiché sans valeur candidate (A8, semaine antérieure)', () => {
    const s0 = decode('running-a2-test-not-planned');
    const w = selectBeta0Week(s0, '2026-10-05');
    const np = (w?.sessions ?? []).filter((x) => x.notPlanned !== null);
    for (const x of np) expect(x.notPlanned?.reason?.code ?? '').not.toMatch(/CANDIDATE_VALUE_USED$/);
    const next = ensureBeta0Week(s0, at('2026-10-12T06:00:00Z'));
    expect((selectBeta0Week(next, '2026-10-12')?.sessions ?? []).filter((x) => x.sport === 'running' && x.status === 'planned').length).toBeGreaterThan(0);
  });

  it('D5 : sur les anciennes semaines compactées, le motif affiché n’est jamais le marqueur de compactage', () => {
    const s0 = decode('hybrid-4-weeks');
    const shown = Object.keys(s0.planner.weeks).flatMap((w) => (selectBeta0Week(s0, w)?.sessions ?? []).flatMap((x) => (x.notPlanned?.reason ? [x.notPlanned.reason.code] : [])));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown).not.toContain('KAIRO.HISTORY_COMPACTED');
  });

  it('Courses : la dernière course de l’onboarding RC1 apparaît comme course libre (heure connue), profil Course relu', () => {
    const s0 = decode('running-week2-threshold');
    expect(selectFreeRuns(s0)).toEqual([expect.objectContaining({ timeKnown: true, distanceM: 5000 })]);
    expect(selectRunningProfile(s0, '2026-10-12')).not.toBeNull();
    const key = (selectBeta0Week(s0, '2026-10-12')?.sessions ?? []).find((x) => x.archetypeId === 'running.threshold');
    const v = key ? selectProgrammeSession(s0, key.requestId) : null;
    expect(v ? runPlayerSteps(v)?.length : 0).toBe(7);
  });
});
