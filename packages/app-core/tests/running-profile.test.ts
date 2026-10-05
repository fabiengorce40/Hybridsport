/**
 * Profil Course (Beta 0) : observations saisies au contrat `RunningReference`, résultats LUS du moteur Running
 * (analyse, allure gouvernée, première exposition, repères d'effort gouvernés), TEST demandé par le mécanisme
 * d'évaluation du programme, historique conservé. Saisies : TEST_ONLY.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createBeta0Programme, declareRunningPerformance, decodeState, emptyState, EQUIPMENT_PRESETS, exportState, finishProgrammeSession,
  ensureBeta0Week, requestRunningTest, selectBeta0Week, selectProgrammeSession, selectRunningProfile,
} from '../src/index.js';
import type { AppState, DeclaredPerformance, ProfileInput } from '../src/index.js';
import { clock, profile } from './fixtures.js';
import { REPO_ROOT } from '../../engine/tests/architecture/source-scanner.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — disponibilités, course libre déclarée (s, m), chronos déclarés (s)
const AVAIL = [60, 45, 60, 0, 60, 90, 75];
const LAST_RUN = { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' as const };
const OK = { conditions: 'NORMAL' as const, interruptionSince: 'NONE' as const };
const TT_5K: DeclaredPerformance = { kind: 'TIME_TRIAL', distanceM: 5000, durationS: 1320, measuredCourse: true, date: '2026-09-27', ...OK };
const RACE_10K_OLD: DeclaredPerformance = { kind: 'RACE_RESULT', distanceM: 10000, durationS: 2700, measuredCourse: true, date: '2026-06-01', ...OK };
const CS: DeclaredPerformance = { kind: 'CRITICAL_SPEED_TEST', paceSecPerKm: 270, trials: 3, model: 'HYPERBOLIC_2_PARAMETERS', date: '2026-09-20', ...OK };

const runner = (o: Partial<ProfileInput['running']> = {}): ProfileInput => profile({
  priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
  running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: true, sessionsPerWeek: 3, returnState: 'NONE', ...o },
  equipment: { presetId: 'preset.full_gym', items: [...fullGym] }, availability: AVAIL,
});
const create = (o: Parameters<typeof createBeta0Programme>[3] = {}, p = runner()): AppState => createBeta0Programme(emptyState(), p, clock(W1), { lastRun: LAST_RUN, ...o });
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };
const roles = (s: AppState, today = W1) => (selectBeta0Week(s, today)?.sessions ?? []).map((x) => x.archetypeId);

describe('références valides', () => {
  it('chrono récent mesuré : référence au contrat Running (déclarée, datée), retenue par le moteur ; séances clés et allure VO₂ calculées PAR LE MOTEUR', () => {
    const s = create({ performances: [TT_5K] });
    expect(s.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', values: { distanceM: 5000, durationS: 1320 }, date: '2026-09-27T12:00:00Z', provenance: { source: 'USER_DECLARED' } })]);
    const v = selectRunningProfile(s, W1);
    expect(v?.references[0]).toMatchObject({ recency: 'RECENT', paceSecPerKm: 264, selectedFor: ['INTENSITY_TARGETING', 'THRESHOLD_BOUNDARY', 'SEVERE_DOMAIN'] });
    expect(v?.keySessions).toEqual({ threshold: { status: 'available', testReferenceId: s.running.references[0]?.referenceId }, severe: { status: 'available', testReferenceId: s.running.references[0]?.referenceId } });
    expect(v?.severePace).toMatchObject({ status: 'pace', confidence: 'HIGH' });
    // La semaine composée par le moteur contient la séance clé débloquée par le test.
    expect(roles(s)).toContain('running.threshold');
  });

  it('plusieurs performances (chrono, course, Critical Speed mesurée) : toutes conservées ; Critical Speed AFFICHÉE telle que déclarée, jamais calculée', () => {
    const s = create({ performances: [TT_5K, RACE_10K_OLD, CS] });
    const v = selectRunningProfile(s, W1);
    expect(v?.references.map((r) => r.type)).toEqual(['TIME_TRIAL', 'CRITICAL_SPEED_TEST', 'RACE_RESULT']);
    expect(v?.criticalSpeed).toMatchObject({ status: 'declared', paceSecPerKm: 270, trials: 3, method: 'HYPERBOLIC_2_PARAMETERS' });
    expect(v?.references.find((r) => r.type === 'RACE_RESULT')?.recency).toBe('STALE');
    expect(v?.performanceModel.status).toBe('unavailable');
  });

  it('performances discordantes à la même distance : conflit signalé, le moteur demande une calibration (TEST à la place de la séance clé)', () => {
    const s = create({ performances: [TT_5K, { ...TT_5K, durationS: 1500, date: '2026-09-29' }] }, runner({ goal: 'FIVE_K' }));
    expect(selectRunningProfile(s, W1)?.conflicts).toHaveLength(1);
    expect(roles(s)).toContain('running.test');
  });
});

describe('date, objectif, données insuffisantes', () => {
  it('la date de réalisation fixe la fraîcheur (bandes gouvernées) ; une date future est refusée', () => {
    const s = create({ performances: [{ ...TT_5K, date: '2026-07-20' }] });
    expect(selectRunningProfile(s, W1)?.references[0]?.recency).toBe('AGING');
    expect(selectRunningProfile(s, W1)?.recencyWeeks).toEqual({ recent: 8, aging: 16 });
    expect(() => declareRunningPerformance(s, clock(W1), { ...TT_5K, date: '2026-10-06' })).toThrow('RUNNING_REFERENCE_DATE_INVALID');
  });

  it('objectif ≠ niveau actuel : objectif daté dans le programme, JAMAIS une référence', () => {
    const s = create({ performances: [{ ...TT_5K, distanceM: 10000, durationS: 2700 }], runningTargetDate: '2027-03-16' });
    expect(s.programmeState?.definition.goals).toEqual([expect.objectContaining({ sport: 'running', goal: 'TEN_K', targetDate: '2027-03-16' })]);
    expect(s.running.references).toHaveLength(1);
    expect(s.running.references.every((r) => r.date <= `${W1}T12:00:00Z` && r.values.durationS === 2700)).toBe(true);
    const onlyGoal = create({ runningTargetDate: '2027-03-16' });
    expect(onlyGoal.running.references).toEqual([]);
  });

  it('données insuffisantes : chaque métrique non calculable est explicitement marquée (aucune valeur par défaut)', () => {
    const s = create({ performances: [RACE_10K_OLD] }, runner({ wearable: false }));
    const v = selectRunningProfile(s, W1);
    expect(v?.criticalSpeed).toEqual({ status: 'missing' });
    expect(v?.severePace).toMatchObject({ status: 'effort' });
    expect(v?.severePace.status === 'effort' && v.severePace.causes).toEqual(expect.arrayContaining(['NO_WEARABLE', 'ANCHOR_REFERENCE_MISSING']));
    expect(v?.keySessions.threshold).toEqual({ status: 'test_required' });
  });
});

describe('aucune référence et TEST', () => {
  it('aucune référence : programme prudent (séances faciles sur la dose réellement courue), aucune allure fabriquée', () => {
    const s = create();
    const v = selectRunningProfile(s, W1);
    expect(v?.references).toEqual([]);
    expect(v?.keySessions).toEqual({ threshold: { status: 'test_required' }, severe: { status: 'test_required' } });
    const sessions = (selectBeta0Week(s, W1)?.sessions ?? []).filter((x) => x.status === 'planned');
    expect(sessions.length).toBeGreaterThan(0);
    for (const x of sessions) {
      const segs = selectProgrammeSession(s, x.requestId)?.session.blocks.flatMap((b) => b.items).flatMap((i) => (i.prescription.type === 'run_structure' ? i.prescription.segments : [])) ?? [];
      expect(segs.every((g) => g.target.priority !== 'pace')).toBe(true);
    }
  });

  it('« je n’ai pas de chrono récent » : TEST demandé par le mécanisme d’évaluation, il REMPLACE une séance ; réalisé ⇒ référence TIME_TRIAL (historique) ⇒ séances clés débloquées', () => {
    let s = create({ requestTest: true }, runner({ goal: 'FIVE_K' }));
    expect(s.programmeState?.assessments).toEqual([expect.objectContaining({ sport: 'running', status: 'scheduled', scheduledWeek: 0 })]);
    const test = (selectBeta0Week(s, W1)?.sessions ?? []).find((x) => x.archetypeId === 'running.test');
    if (!test?.date) throw new Error('TEST non planifié');
    expect(selectBeta0Week(s, W1)?.sessions.filter((x) => x.sport === 'running')).toHaveLength(3);
    s = finishProgrammeSession(s, clock(test.date, '19:00:00'), { requestId: test.requestId, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 2100, distanceM: 5000, testTimeS: 1290 } });
    expect(s.running.references).toEqual([expect.objectContaining({ type: 'TIME_TRIAL', provenance: expect.objectContaining({ source: 'APP_RECORDED' }), values: { distanceM: 5000, durationS: 1290 } })]);
    expect(s.programmeState?.assessments[0]?.status).toBe('completed');
    const v = selectRunningProfile(s, W2);
    expect(v?.keySessions.threshold.status).toBe('available');
    expect(v?.references[0]?.source).toBe('APP_RECORDED');
  });

  it('TEST demandé plus tard depuis le profil : semaine courante sans séance commencée ⇒ replanifiée avec le TEST ; double demande refusée', () => {
    // Objectif général : la composition du moteur n'exige aucun test (la séance clé est un footing).
    let s = create({}, runner({ goal: 'GENERAL_RUNNING' }));
    expect(roles(s)).not.toContain('running.test');
    s = requestRunningTest(s, clock(W1, '09:00:00'));
    expect(roles(s)).toContain('running.test');
    expect(() => requestRunningTest(s, clock(W1, '09:05:00'))).toThrow('RUNNING_TEST_REFUSED');
  });
});

describe('mise à jour et persistance', () => {
  it('nouvelle performance plus tard : ajoutée, l’ancienne conservée (date et provenance) ; le moteur retient la plus fiable (récente)', () => {
    let s = create({ performances: [{ ...TT_5K, date: '2026-07-20' }] });
    s = ensureBeta0Week(s, clock(W2));
    s = declareRunningPerformance(s, clock(W2), { ...TT_5K, distanceM: 3000, durationS: 760, date: '2026-10-11' });
    const v = selectRunningProfile(s, W2);
    expect(v?.references.map((r) => [r.date.slice(0, 10), r.distanceM, r.source, r.recency])).toEqual([['2026-10-11', 3000, 'USER_DECLARED', 'RECENT'], ['2026-07-20', 5000, 'USER_DECLARED', 'AGING']]);
    expect(v?.decisions.find((d) => d.decision === 'SEVERE_DOMAIN')).toMatchObject({ selectedId: v?.references[0]?.referenceId, confidence: 'HIGH' });
  });

  it('même distance, chronos discordants : le moteur retient la référence la plus PRUDENTE (sa règle de conflit), les deux sont conservées', () => {
    let s = create({ performances: [TT_5K] });
    s = declareRunningPerformance(s, clock(W1, '10:00:00'), { ...TT_5K, durationS: 1200, date: '2026-10-04' });
    const v = selectRunningProfile(s, W1);
    expect(v?.references).toHaveLength(2);
    expect(v?.conflicts).toHaveLength(1);
    expect(v?.references.find((r) => r.referenceId === v.decisions.find((d) => d.decision === 'SEVERE_DOMAIN')?.selectedId)?.durationS).toBe(1320);
  });

  it('rechargement / export / import : références et profil calculé identiques', () => {
    const s = create({ performances: [TT_5K, CS] });
    expect(reload(s).running.references).toEqual(s.running.references);
    expect(selectRunningProfile(reload(s), W1)).toEqual(selectRunningProfile(s, W1));
  });
});

describe('aucune formule Running dans app-core ni dans l’interface', () => {
  it('le profil Course et ses écrans ne contiennent aucun modèle (puissance, logarithme, exponentielle, hyperbole) ni coefficient de zone', () => {
    const files = ['packages/app-core/src/running-profile.ts', 'apps/kairo/src/running/RunningProfile.tsx', 'apps/kairo/src/running/PerformanceForm.tsx'];
    for (const f of files) {
      const text = readFileSync(join(REPO_ROOT, f), 'utf8');
      expect(text, f).not.toMatch(/Math\.(pow|log|exp)|\w\s*\*\*\s*\w|riegel/i);
      expect(text, f).not.toMatch(/0\.\d+\s*\*\s*(pace|speed|cs)/i);
    }
  });
});
