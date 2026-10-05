/**
 * Bug réel post-S1 : un programme créé AVANT Strength S1 continuait d'afficher 4 × Full body. Fixture = AppState réel
 * exporté par le code pré-S1 (voir tests/fixtures/README.md). Politique vérifiée :
 *   - l'intention Strength TEMPORAIRE héritée (`str_full_body` déclaré) est mise à niveau vers la composition du moteur
 *     (jamais une intention explicite) ; traçée, idempotente ;
 *   - une semaine planifiée par une version antérieure et NON commencée est régénérée de façon sûre ;
 *   - une semaine commencée (séance passée, en cours, enregistrée) n'est JAMAIS remplacée : conservée et signalée ;
 *   - l'archétype affiché vient du session_record ; incohérence ou absence ⇒ erreur de données visible.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BETA0_PLANNING_VERSION, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, legacyBeta0StrengthIntent, prescribedArchetype,
  recordSessionExecution, selectBeta0Week, startProgrammeSession, upgradeLegacyBeta0Programme, weekPlanning,
} from '../src/index.js';
import type { AppState } from '../src/index.js';
import { clock, profile } from './fixtures.js';
import { workSetsDone } from './executions.js';

const MON = '2026-10-05';
const WED = '2026-10-07';
const NEXT_MON = '2026-10-12';
function preS1(): AppState {
  const d = decodeState(readFileSync(new URL('./fixtures/pre-s1-state.json', import.meta.url), 'utf8'));
  if (!d.ok) throw new Error(d.problem);
  return d.state;
}
const strengthDays = (s: AppState, day: string) => (selectBeta0Week(s, day)?.sessions ?? []).filter((x) => x.sport === 'strength').map((x) => [x.date, x.archetypeId]);
const audit = (s: AppState) => (s.programmeState?.audit ?? []).map((a) => a.reason.code).filter((c) => c.startsWith('KAIRO.'));

describe('état pré-S1 réel (fixture) : ce qui était persisté', () => {
  it('programme : Strength `declared` str_full_body ; semaine : 4 × str_full_body sans composition ni version', () => {
    const s = preS1();
    expect(s.programmeState?.definition.sports.find((x) => x.sport === 'strength')).toMatchObject({ composition: 'declared', intent: { archetypeId: 'str_full_body' } });
    const w = s.planner.weeks[MON];
    expect([w?.owner, w?.planningVersion]).toEqual(['programme', undefined]);
    const st = (w?.requests ?? []).filter((r) => r.sport === 'strength');
    expect(st.map((r) => [r.date, r.intent?.archetypeId, r.composition, prescribedArchetype(r).archetypeId])).toEqual([
      ['2026-10-05', 'str_full_body', undefined, 'str_full_body'], ['2026-10-08', 'str_full_body', undefined, 'str_full_body'],
      ['2026-10-07', 'str_full_body', undefined, 'str_full_body'], ['2026-10-09', 'str_full_body', undefined, 'str_full_body'],
    ]);
    expect(weekPlanning(s, MON, MON)).toEqual({ version: null, status: 'stale_replaceable', cause: null });
  });
});

describe('mise à niveau de l’intention Strength héritée', () => {
  it('héritée ⇒ composition par le moteur Strength (cadre sans archétype), audit tracé ; idempotente', () => {
    const up = upgradeLegacyBeta0Programme(preS1(), clock(MON));
    expect(up.programmeState?.definition.sports.find((x) => x.sport === 'strength')).toMatchObject({ composition: 'engine', intent: { stimulus: 'strength_volume', phase: 'phase.accumulation', toleranceProfile: 'strength_sets' } });
    expect(up.programmeState?.definition.sports.find((x) => x.sport === 'strength')?.intent.archetypeId).toBeUndefined();
    expect(up.programmeState?.current.find((x) => x.sport === 'strength')?.intent.archetypeId).toBeUndefined();
    expect(audit(up)).toEqual(['KAIRO.PROGRAMME_STRENGTH_INTENT_UPGRADED']);
    expect(upgradeLegacyBeta0Programme(up, clock(MON))).toBe(up);
    // Semaines persistées : jamais touchées par la mise à niveau du programme.
    expect(up.planner.weeks[MON]).toEqual(preS1().planner.weeks[MON]);
  });

  it('intention explicite (autre origine, autre archétype, variante) : jamais transformée', () => {
    const s = preS1();
    const ps = s.programmeState;
    if (!ps) throw new Error('programme absent');
    type Plan = NonNullable<AppState['programmeState']>['definition']['sports'][number];
    const withPlan = (f: (p: Plan) => Plan, origin = ps.definition.origin) => ({ ...ps, definition: { ...ps.definition, origin, sports: ps.definition.sports.map((x) => (x.sport === 'strength' ? f(x) : x)) } });
    expect(legacyBeta0StrengthIntent(withPlan((x) => x, 'coach'))).toBeNull();
    expect(legacyBeta0StrengthIntent(withPlan((x) => ({ ...x, intent: { ...x.intent, archetypeId: 'str_upper' } })))).toBeNull();
    expect(legacyBeta0StrengthIntent(withPlan((x) => ({ ...x, variants: { PROGRESS: { ...x.intent } } })))).toBeNull();
    expect(legacyBeta0StrengthIntent(ps)).not.toBeNull();
  });
});

describe('semaine planifiée par une version antérieure', () => {
  it('ouverte le lundi, non commencée ⇒ régénérée : Haut / Bas / Haut / Bas, version courante, audit, visible', () => {
    const s = ensureBeta0Week(preS1(), clock(MON));
    expect(strengthDays(s, MON)).toEqual([['2026-10-05', 'str_upper'], ['2026-10-07', 'str_lower'], ['2026-10-08', 'str_upper'], ['2026-10-09', 'str_lower']]);
    expect(s.planner.weeks[MON]?.planningVersion).toBe(BETA0_PLANNING_VERSION);
    expect(audit(s)).toEqual(['KAIRO.PROGRAMME_STRENGTH_INTENT_UPGRADED', 'KAIRO.WEEK_REPLANNED_STALE']);
    const v = selectBeta0Week(s, MON);
    expect(v?.planning).toMatchObject({ status: 'current', replannedAt: '2026-10-05T07:30:00Z' });
    expect(v?.sessions.filter((x) => x.sport === 'strength').every((x) => x.compositionAuthority === 'provisional' && x.compositionRule === 'strength.rules.weeklyComposition@0.1.0-candidate' && x.dataError === null)).toBe(true);
    // Réouverture : rien ne change (idempotent).
    expect(ensureBeta0Week(s, clock(MON))).toEqual(s);
  });

  it('ouverte le mercredi (séance de lundi passée) ⇒ CONSERVÉE (4 × Full body), signalée ; semaine suivante en S1', () => {
    const s = ensureBeta0Week(preS1(), clock(WED));
    expect(strengthDays(s, WED).map((x) => x[1])).toEqual(['str_full_body', 'str_full_body', 'str_full_body', 'str_full_body']);
    expect(selectBeta0Week(s, WED)?.planning).toEqual({ version: null, status: 'stale_kept', cause: 'past_sessions', replannedAt: null });
    expect(audit(s)).toEqual(['KAIRO.PROGRAMME_STRENGTH_INTENT_UPGRADED']);
    const next = ensureBeta0Week(s, clock(NEXT_MON));
    expect(strengthDays(next, NEXT_MON).map((x) => x[1])).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
    expect(selectBeta0Week(next, NEXT_MON)?.planning).toMatchObject({ version: BETA0_PLANNING_VERSION, status: 'current' });
  });

  it('séance en cours le lundi ⇒ semaine conservée (jamais remplacée), cause visible', () => {
    const s0 = preS1();
    const started = startProgrammeSession(s0, clock(MON), '2026-10-05.strength.1');
    const s = ensureBeta0Week(started, clock(MON));
    expect(selectBeta0Week(s, MON)?.planning).toMatchObject({ status: 'stale_kept', cause: 'session_in_progress' });
    expect(s.planner.weeks[MON]).toEqual(s0.planner.weeks[MON]);
    expect(s.programmeLogs['2026-10-05.strength.1']).toBeDefined();
  });

  it('séance déjà enregistrée ⇒ semaine conservée (WEEK_NOT_REPLACEABLE jamais contourné)', () => {
    const s0 = preS1();
    const done = recordSessionExecution(s0, clock(MON, '18:00:00'), { requestId: '2026-10-05.strength.1', sport: 'strength', completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(s0, '2026-10-05.strength.1') });
    const s = ensureBeta0Week(done, clock(MON, '19:00:00'));
    expect(selectBeta0Week(s, MON)?.planning).toMatchObject({ status: 'stale_kept', cause: 'results' });
    expect(s.planner.weeks[MON]).toEqual(s0.planner.weeks[MON]);
  });

  it('export / import après mise à niveau : identique (version et audit conservés)', () => {
    const s = ensureBeta0Week(preS1(), clock(MON));
    const d = decodeState(exportState(s));
    if (!d.ok) throw new Error(d.problem);
    expect(d.state).toEqual(s);
  });
});

describe('programme neuf après S1 et archétype prescrit', () => {
  it('programme neuf (même profil) : Haut / Bas / Haut / Bas, semaine à la version courante', () => {
    const s = createBeta0Programme(emptyState(), profile({
      priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 },
      running: { enabled: true, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' }, availability: [60, 60, 60, 60, 60, 0, 60],
    }), clock(MON), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    expect(strengthDays(s, MON)).toEqual([['2026-10-05', 'str_upper'], ['2026-10-07', 'str_lower'], ['2026-10-08', 'str_upper'], ['2026-10-09', 'str_lower']]);
    expect(selectBeta0Week(s, MON)?.planning).toEqual({ version: BETA0_PLANNING_VERSION, status: 'current', cause: null, replannedAt: null });
  });

  it('archétype du session_record incohérent avec l’intention, ou absent ⇒ erreur de données (jamais un repli)', () => {
    const r = preS1().planner.weeks[MON]?.requests.find((x) => x.sport === 'strength');
    if (!r) throw new Error('demande absente');
    expect(prescribedArchetype({ ...r, intent: r.intent ? { ...r.intent, archetypeId: 'str_upper' } : undefined })).toEqual({ archetypeId: null, dataError: 'ARCHETYPE_MISMATCH' });
    const { intent: _i, record: _r, ...bare } = r;
    expect(prescribedArchetype(bare)).toEqual({ archetypeId: null, dataError: 'ARCHETYPE_MISSING' });
  });
});
