/**
 * P0 — « Faire maintenant » (séance COMPOSÉE MAIS NON PLACÉE) : contrôle MÉTIER au jour réel, même règle gouvernée
 * d'interférence que le placement (planner.interference.structureWindows), douleur active, semaine, qualité, double
 * démarrage / double enregistrement, rechargement. Adversarial : aucun contournement par l'appel direct à app-core.
 */
import { describe, expect, it } from 'vitest';
import { ensureBeta0Week, finishProgrammeSession, manualStartAssessment, recordFieldFeedback, selectBeta0Week, selectBetaJournal, startProgrammeSession } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, create, hrProfile, reload } from '../hr/hr-fixtures.js';

const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
const D = (day: string, h = '18:00') => at(`2026-10-${day}T${h}:00.000Z`);
const s0 = create(FOUR);
const sessions = selectBeta0Week(s0, '2026-10-05')?.sessions ?? [];
const U = sessions.find((x) => x.placement === 'composed_unplaced')?.requestId ?? '';
const id = (sport: string) => sessions.find((x) => x.sport === sport && x.placement === 'planned')?.requestId ?? '';
const run = (s: AppState, requestId: string, day: string, f: Parameters<typeof finishProgrammeSession>[2] extends infer X ? Omit<X & object, 'requestId'> : never) =>
  finishProgrammeSession(startProgrammeSession(s, D(day), requestId), D(day, '19:00'), { requestId, ...f });

describe('P0 — démarrage manuel d’une séance non placée', () => {
  it('P0-M1. semaine saturée : une séance Course composée mais non placée existe (pré-condition)', () => {
    expect(U).toBe('2026-10-05.running.2');
  });
  it('P0-M2. conflit d’interférence au jour réel (Musculation le même jour) ⇒ refus métier MANUAL_START_INTERFERENCE, état inchangé', () => {
    const a = manualStartAssessment(s0, D('05'), U);
    expect(a.allowed).toBe(false);
    expect(a.cause).toBe('INTERFERENCE');
    expect(a.conflicts.every((c) => c.withSport === 'strength' && c.rule.startsWith('planner.interference.structureWindows@'))).toBe(true);
    expect(code(() => startProgrammeSession(s0, D('05'), U))).toBe('MANUAL_START_INTERFERENCE');
    // Contournement par la fin directe (sans démarrage) : même garde (finishProgrammeSession démarre d'abord).
    expect(code(() => finishProgrammeSession(s0, D('05'), { requestId: U, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } }))).toBe('MANUAL_START_INTERFERENCE');
  });
  it('P0-M3. séances voisines PRÉVUES d’autres disciplines (HYROX mardi, Cross-training mercredi) ⇒ refus', () => {
    expect(manualStartAssessment(s0, D('06'), U).conflicts.map((c) => c.withSport)).toContain('hyrox');
    expect(manualStartAssessment(s0, D('07'), U).conflicts.map((c) => c.withSport)).toContain('crosstraining');
  });
  it('P0-M4. jour sans conflit gouverné (samedi) ⇒ autorisé ; réalisation, provenance manuelle, date réelle', () => {
    expect(manualStartAssessment(s0, D('10'), U)).toEqual({ allowed: true, cause: null, conflicts: [], maintainable: false });
    const s = run(s0, U, '10', { completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } });
    expect(s.programmeState?.results.find((r) => r.requestId === U)).toMatchObject({ provenance: 'manual_from_unplaced', date: '2026-10-10' });
  });
  it('P0-M5. séance non placée RÉELLEMENT effectuée : jamais redémarrable (une seule exécution)', () => {
    const s = run(s0, U, '10', { completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } });
    expect(code(() => startProgrammeSession(s, D('10'), U))).toBe('SESSION_FINISHED');
  });
  it('P0-M6. séance d’une semaine prévue MANQUÉE (non faite) : jamais une voisine (rien de supposé fait)', () => {
    // Semaine suivante : la semaine 1 est clôturée, ses séances non saisies deviennent « manquées » ; la séance non placée
    // de la semaine 1 n’est plus démarrable (autre semaine).
    const next = ensureBeta0Week(s0, D('12', '07:30'));
    expect(manualStartAssessment(next, D('12'), U).cause).toBe('OUTSIDE_WEEK');
    expect(code(() => startProgrammeSession(next, D('12'), U))).toBe('MANUAL_START_OUTSIDE_WEEK');
  });
  it('P0-M7. douleur active ⇒ refus SAFETY_PAUSE_ACTIVE_PAIN, même un jour sans conflit', () => {
    const pained = run(s0, id('strength'), '05', { completion: 'modified', pain: true });
    expect(pained.safety.activePain).not.toBeNull();
    expect(manualStartAssessment(pained, D('10'), U).cause).toBe('ACTIVE_PAIN');
    expect(code(() => startProgrammeSession(pained, D('10'), U))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
  });
  it('P0-M8. qualité BLOQUÉE ⇒ refus, prioritaire sur tout le reste', () => {
    const blocked: AppState = { ...s0, planner: { weeks: Object.fromEntries(Object.entries(s0.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === U && r.quality ? { ...r, quality: { ...r.quality, verdict: 'BLOCKED' as const } } : r)) }])) } };
    expect(manualStartAssessment(blocked, D('10'), U).cause).toBe('QUALITY_BLOCKED');
    expect(code(() => startProgrammeSession(blocked, D('10'), U))).toBe('QUALITY_BLOCKED');
  });
  it('P0-M9. double démarrage idempotent (aucun second chrono), double enregistrement refusé', () => {
    const a = startProgrammeSession(s0, D('10'), U);
    expect(startProgrammeSession(a, D('10', '18:05'), U)).toBe(a);
    const done = finishProgrammeSession(a, D('10', '18:40'), { requestId: U, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } });
    expect(code(() => finishProgrammeSession(done, D('10', '18:45'), { requestId: U, completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } }))).toBe('SESSION_FINISHED');
    expect(done.programmeState?.results.filter((r) => r.requestId === U)).toHaveLength(1);
  });
  it('P0-M10. séance commencée (jour autorisé) puis rechargée : reprise sans réévaluation, aucune perte', () => {
    const a = reload(startProgrammeSession(s0, D('10'), U), '2026-10-10T18:20:00.000Z');
    expect(a.programmeLogs[U]?.startedAt).toBeDefined();
    expect(code(() => startProgrammeSession(a, D('10', '18:21'), U))).toBe('OK');
  });
  it('P0-M11. séances PLACÉES : comportement inchangé (le planificateur a déjà appliqué la règle)', () => {
    expect(code(() => startProgrammeSession(s0, D('05'), id('strength')))).toBe('OK');
    expect(manualStartAssessment(s0, D('05'), id('strength')).allowed).toBe(true);
  });
  it('P0-M12. refus lisible dans le journal (aucune exécution ni faux placement), historique inchangé', () => {
    const before = JSON.stringify(s0);
    code(() => startProgrammeSession(s0, D('05'), U));
    expect(JSON.stringify(s0)).toBe(before);
    expect(selectBetaJournal(s0).find((e) => e.requestId === U)).toMatchObject({ placement: 'composed_unplaced', execution: null });
  });
  it('P0-M13. retour terrain impossible tant que la séance non placée n’est pas réellement faite', () => {
    expect(code(() => recordFieldFeedback(s0, D('05'), U, { difficulty: 'easy' }))).toBe('FIELD_FEEDBACK_SESSION_NOT_FINISHED');
  });
});
