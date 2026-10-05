/**
 * Strength S1 — composition hebdomadaire Strength dans le chemin Beta 0 (profil → Programme Engine → Global Planner →
 * Strength) : l'archétype de chaque séance vient du MOTEUR Strength (règle candidate, autorité provisoire) ; chaque
 * séance connaît les séances Strength placées avant elle dans la semaine (expositions PRÉVUES, jamais réalisées) ; le
 * même-discipline est signalé, jamais bloqué ; déterminisme, export / import, V0 inchangé.
 * Profils et saisies : données de test (TEST_ONLY).
 */
import { describe, expect, it } from 'vitest';
import type { SessionDraft } from '@hybridsport/domain';
import {
  beta0Environment, buildPorts, closeProgrammeWeekInApp, createBeta0Programme, decodeState, emptyState, ensureCurrentWeek, exportState, planProgrammeCurrentWeek,
  programmeFromProfile, recordSessionExecution, selectBeta0Week,
} from '../src/index.js';
import type { AppState, ProfileInput } from '../src/index.js';
import { clock, MONDAY, profile } from './fixtures.js';
import { plannedSession, workSetsDone } from './executions.js';

// technical-constant: TEST_ONLY — minutes disponibles par jour (lundi → dimanche)
const ALL_DAYS = [60, 60, 60, 60, 60, 90, 60];
// technical-constant: TEST_ONLY — course libre déclarée avant le programme (s, m)
const LAST_RUN = { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' as const };
const NEXT_MONDAY = '2026-10-12';

type Goal = ProfileInput['strength']['goal'];
function athlete(o: { goal?: Goal; strength: number; running?: number; availability?: number[]; level?: ProfileInput['level'] }): AppState {
  const run = o.running !== undefined;
  return createBeta0Programme(emptyState(), profile({
    level: o.level ?? 'intermediate', priorities: run ? ['strength', 'running'] : ['strength'],
    strength: { enabled: true, goal: o.goal ?? 'hypertrophy', sessionsPerWeek: o.strength },
    running: { enabled: run, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: o.running ?? 2, returnState: 'NONE' },
    availability: o.availability ?? ALL_DAYS,
  }), clock(), run ? { lastRun: LAST_RUN } : {});
}
const weekOf = (s: AppState, w = MONDAY) => { const x = s.planner.weeks[w]; if (!x) throw new Error(`semaine absente : ${w}`); return x; };
const strengthOf = (s: AppState, w = MONDAY) => weekOf(s, w).requests.filter((r) => r.sport === 'strength').sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
const items = (x: SessionDraft) => x.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const content = (s: AppState, id: string) => JSON.stringify(items(plannedSession(s, id)).map((it) => [it.exerciseId, it.prescription]));
/** Emplacement principal (groupe de choix « main ») retenu par le moteur. */
const mainOf = (s: AppState, id: string) => items(plannedSession(s, id)).find((it) => /\.main_/.test(it.refs?.slotId ?? ''))?.refs?.slotId?.replace(/^[a-z]+\./, '');
const codes = (r: { reasons: readonly { code: string }[] }) => r.reasons.map((x) => x.code);
const param = (r: { reasons: readonly { code: string; params: Record<string, unknown> }[] }, code: string, key: string) => r.reasons.find((x) => x.code === code)?.params[key];

describe('composition Strength par le moteur (Beta 0)', () => {
  it('1 séance : full body, autorité provisoire, aucune exposition prévue antérieure', () => {
    const [r, ...rest] = strengthOf(athlete({ strength: 1 }));
    expect(rest).toEqual([]);
    expect([r?.intent?.archetypeId, r?.composition]).toEqual(['str_full_body', { authority: 'provisional', role: 'ROTATION' }]);
    expect(r && param(r, 'PLAN.PLANNER.WEEK_EXPOSURES', 'planned')).toBe(0);
    expect(r && codes(r)).not.toContain('PLAN.PLANNER.SAME_DISCIPLINE_UNGOVERNED');
  });

  it('2 séances (historique vide) : full body ×2 ; la seconde connaît la première ⇒ principal alterné (genou → hanche), décision du moteur', () => {
    const s = athlete({ goal: 'general', strength: 2 });
    const rs = strengthOf(s);
    expect(rs.map((r) => r.intent?.archetypeId)).toEqual(['str_full_body', 'str_full_body']);
    expect(rs.map((r) => param(r, 'PLAN.PLANNER.WEEK_EXPOSURES', 'planned'))).toEqual([0, 1]);
    expect(rs.map((r) => mainOf(s, r.requestId))).toEqual(['main_knee', 'main_hip']);
    expect(content(s, rs[0]?.requestId ?? '')).not.toBe(content(s, rs[1]?.requestId ?? ''));
  });

  it('3 séances + course : full body ×3 ; principal genou / hanche / genou (le moins récemment exposé) : « A / B / A » issu du moteur, pas d’un libellé', () => {
    const s = athlete({ goal: 'strength', strength: 3, running: 3 });
    const rs = strengthOf(s);
    expect(rs.map((r) => r.intent?.archetypeId)).toEqual(['str_full_body', 'str_full_body', 'str_full_body']);
    expect(rs.map((r) => mainOf(s, r.requestId))).toEqual(['main_knee', 'main_hip', 'main_knee']);
    expect(rs.map((r) => param(r, 'PLAN.PLANNER.WEEK_EXPOSURES', 'sessions'))).toEqual([[], [rs[0]?.requestId], [rs[0]?.requestId, rs[1]?.requestId]]);
    // Deux séances de même accent restent DIFFÉRENTES (expositions prévues + anti-doublon), jamais identiques.
    expect(new Set(rs.map((r) => content(s, r.requestId))).size).toBe(3);
  });

  it('semaine observée (4 Strength + course, hypertrophie) : haut / bas ×2 en alternance, plus aucune séance clonée', () => {
    const s = athlete({ goal: 'hypertrophy', strength: 4, running: 3 });
    const rs = strengthOf(s);
    expect(rs.map((r) => r.intent?.archetypeId)).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
    expect(rs.every((r) => r.status === 'planned' && r.composition?.authority === 'provisional')).toBe(true);
    expect(rs.map((r) => param(r, 'PLAN.WEEK_COMPOSITION', 'band'))).toEqual(Array(4).fill('spec 02 §5.1'));
    expect(rs.map((r) => param(r, 'PLAN.PLANNER.WEEK_EXPOSURES', 'planned'))).toEqual([0, 1, 2, 3]);
    expect(new Set(rs.map((r) => content(s, r.requestId))).size).toBe(4);
    expect(weekOf(s).requests.filter((r) => r.sport === 'running').every((r) => r.status === 'planned')).toBe(true);
  });

  it('5 séances : aucune règle (fail-closed) ⇒ Strength non planifiée, raison du moteur Strength ; Running inchangée', () => {
    const s = athlete({ strength: 5, running: 2 });
    const rs = strengthOf(s);
    expect(rs.every((r) => r.status === 'unplaced' && r.category === 'governance_blocked')).toBe(true);
    expect(rs[0]?.reasons.map((x) => [x.code, x.params.cause])).toEqual([['RULE.PLANNER.COMPOSITION_UNRESOLVED', undefined], ['RULE.WEEK_COMPOSITION_UNGOVERNED', 'frequency_not_covered']]);
    expect(weekOf(s).requests.filter((r) => r.sport === 'running').every((r) => r.status === 'planned')).toBe(true);
  });
});

describe('expositions intra-semaine : prévues ≠ réalisées', () => {
  it('planifier ne crée aucune exposition réalisée ni empreinte « completed » ; anti-doublon du CORE nourri par les séances PRÉVUES', () => {
    const s = athlete({ goal: 'strength', strength: 3, running: 3 });
    expect(s.strength.exposures).toEqual([]);
    expect(s.fingerprints.strength).toEqual([]);
    expect(s.programmeState?.results).toEqual([]);
    const rs = strengthOf(s);
    // Le CORE compare la séance à celles PRÉVUES plus tôt (identifiants de séance de la semaine), jamais à du réalisé.
    const compared = rs.slice(1).flatMap((r) => r.reasons.filter((x) => x.code.startsWith('DUPLICATE.')).map((x) => String(x.params.sessionId)));
    expect(compared.length).toBeGreaterThan(0);
    expect(compared.every((id) => rs.some((r) => id.startsWith(`plan.${r.requestId}`)))).toBe(true);
  });

  it('historique existant : la semaine suivante part de l’accent RÉALISÉ (principal le moins récemment exécuté)', () => {
    const env = beta0Environment;
    const s1 = athlete({ goal: 'strength', strength: 3 });
    const done = strengthOf(s1).reduce((acc, r) => recordSessionExecution(acc, clock(r.date ?? MONDAY, '18:00:00'), { requestId: r.requestId, sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(acc, r.requestId) }), s1);
    expect(done.strength.exposures.length).toBeGreaterThan(0);
    const lastMain = mainOf(done, strengthOf(done).at(-1)?.requestId ?? '');
    const s2 = planProgrammeCurrentWeek(closeProgrammeWeekInApp(done, clock(NEXT_MONDAY), env()), clock(NEXT_MONDAY), env());
    const first = strengthOf(s2, NEXT_MONDAY)[0];
    expect(first?.status).toBe('planned');
    expect(mainOf(s2, first?.requestId ?? '')).not.toBe(lastMain);
    // Historique vide (semaine 1) : principal de la première séance = besoin prioritaire de l'objectif (genou).
    expect(mainOf(s1, strengthOf(s1)[0]?.requestId ?? '')).toBe('main_knee');
  });

  it('même graine, occurrences différentes : seule la connaissance des séances prévues change la séance ; même contexte ⇒ séance identique', () => {
    const s = athlete({ goal: 'general', strength: 2 });
    const p = s.profile;
    if (!p) throw new Error('profil absent');
    const env = beta0Environment();
    const port = buildPorts(s, p, programmeFromProfile(p), env, { strength: 'general' }).strength;
    if (!port) throw new Error('port Strength absent');
    const intent = { archetypeId: 'str_full_body', stimulus: 'strength_general', objective: 'objective.strength_general', phase: 'phase.accumulation', toleranceProfile: 'strength_sets' };
    const slot = { requestId: 'x.1', date: '2026-10-07', availableMinutes: 60, hybrid: false, seed: 'same-seed', intent };
    const first = port.generate({ ...slot, requestId: 'x.0', date: MONDAY });
    if (first.status !== 'planned') throw new Error('séance refusée');
    const alone = port.generate(slot);
    const again = port.generate(slot);
    const after = port.generate({ ...slot, weekSessions: [{ requestId: 'x.0', date: MONDAY, archetypeId: 'str_full_body', session: first.session, ...(first.fingerprint ? { fingerprint: first.fingerprint } : {}) }] });
    if (alone.status !== 'planned' || again.status !== 'planned' || after.status !== 'planned') throw new Error('séance refusée');
    expect(again.session).toEqual(alone.session);
    const main = (x: SessionDraft) => items(x).find((it) => /\.main_/.test(it.refs?.slotId ?? ''))?.refs?.slotId;
    expect([main(alone.session), main(after.session)]).toEqual(['fb.main_knee', 'fb.main_hip']);
  });
});

describe('même discipline dans le planificateur (non gouverné : signalé, jamais bloqué)', () => {
  it('profils de demande dérivés pour chaque séance Strength ; structures partagées signalées avec l’écart, aucun conflit G4', () => {
    const s = athlete({ goal: 'strength', strength: 3, running: 3 });
    const rs = strengthOf(s);
    expect(rs.every((r) => r.demand?.status === 'derived')).toBe(true);
    const notes = rs.slice(1).map((r) => r.reasons.find((x) => x.code === 'PLAN.PLANNER.SAME_DISCIPLINE_UNGOVERNED')?.params);
    expect(notes.map((n) => [n?.withRequestId, n?.gapHours])).toEqual([[rs[0]?.requestId, 48], [rs[1]?.requestId, 24]]);
    expect(notes.every((n) => Array.isArray(n?.structures) && n.structures.length > 0)).toBe(true);
    expect(weekOf(s).conflicts.filter((c) => c.params.sport === 'strength' && c.params.withSport === 'strength')).toEqual([]);
  });

  it('jours Strength consécutifs (lundi, mardi, mercredi) : tous planifiés, chaque enchaînement signalé à 24 h', () => {
    const s = athlete({ goal: 'general', strength: 3, availability: [60, 60, 60, 0, 0, 0, 0] });
    const rs = strengthOf(s);
    expect(rs.map((r) => [r.date, r.status])).toEqual([['2026-10-05', 'planned'], ['2026-10-06', 'planned'], ['2026-10-07', 'planned']]);
    expect(rs.slice(1).map((r) => param(r, 'PLAN.PLANNER.SAME_DISCIPLINE_UNGOVERNED', 'gapHours'))).toEqual([24, 24]);
  });
});

describe('stabilité', () => {
  it('déterminisme : deux créations identiques ⇒ semaines identiques', () => {
    const a = athlete({ goal: 'hypertrophy', strength: 4, running: 3 });
    const b = athlete({ goal: 'hypertrophy', strength: 4, running: 3 });
    expect(weekOf(b)).toEqual(weekOf(a));
  });

  it('export / import : archétypes, composition et contenus conservés à l’identique', () => {
    const s = athlete({ goal: 'hypertrophy', strength: 4, running: 3 });
    const d = decodeState(exportState(s));
    if (!d.ok) throw new Error(d.problem);
    expect(selectBeta0Week(d.state, MONDAY)).toEqual(selectBeta0Week(s, MONDAY));
    expect(strengthOf(d.state).map((r) => content(d.state, r.requestId))).toEqual(strengthOf(s).map((r) => content(s, r.requestId)));
    expect(selectBeta0Week(d.state, MONDAY)?.sessions.filter((x) => x.sport === 'strength').map((x) => [x.archetypeId, x.compositionAuthority])).toEqual([
      ['str_upper', 'provisional'], ['str_lower', 'provisional'], ['str_upper', 'provisional'], ['str_lower', 'provisional'],
    ]);
  });

  it('V0 inchangé : le planificateur V0 garde son archétype déclaré (chemin hérité, hors Beta 0)', () => {
    const s = ensureCurrentWeek(emptyState(), clock());
    expect(Object.keys(s.plans)).toEqual([]);
    const v0 = ensureCurrentWeek({ ...athlete({ strength: 2 }), programmeState: null }, clock());
    expect(Object.values(v0.plans).flatMap((w) => w.entries).filter((e) => e.sport === 'strength').every((e) => e.archetypeId === 'str_full_body')).toBe(true);
  });
});
