/**
 * FIELD TEST — retour terrain et journal Beta (chemin RÉEL de l'application, Beta 0). Adversarial : le retour est une
 * OBSERVATION (jamais transmise aux moteurs, jamais interprétée), stocké une seule fois avec la séance ; le journal et
 * l'export reflètent l'état persisté sans rien recalculer ; les garde-fous existants (douleur, QUALITY_BLOCKED, non
 * placée, double soumission) restent entiers.
 */
import { describe, expect, it } from 'vitest';
import {
  betaJournalText, decodeState, ensureBeta0Week, exportBetaJournal, exportState, FIELD_COMMENT_MAX, finishProgrammeSession, recordFieldFeedback,
  recreateBeta0Programme, selectBetaJournal, selectFieldHistory, startProgrammeSession, zAppState,
} from '../../src/index.js';
import type { AppState, FieldFeedbackInput } from '../../src/index.js';
import { at, create, doHr, hrProfile, MON1, MON2, reload, ROLE, week } from '../hr/hr-fixtures.js';

const code = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const FOUR = hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] });
const T = (h: string) => `2026-10-05T${h}:00.000Z`;
const ids = (s: AppState) => {
  const xs = week(s)?.sessions ?? [];
  const id = (sport: string, placement = 'planned') => xs.find((x) => x.sport === sport && x.placement === placement)?.requestId ?? '';
  return { strength: id('strength'), running: id('running'), ct: id('crosstraining'), hyrox: id('hyrox'), unplaced: xs.find((x) => x.placement === 'composed_unplaced')?.requestId ?? '' };
};
const finish = (s: AppState, requestId: string, f: Parameters<typeof finishProgrammeSession>[2] extends infer X ? Omit<X & object, 'requestId'> : never, h = ['08:00', '08:40']) =>
  finishProgrammeSession(startProgrammeSession(s, at(T(h[0] ?? '08:00')), requestId), at(T(h[1] ?? '08:40')), { requestId, ...f });
const fb = (s: AppState, id: string, f: FieldFeedbackInput, h = '09:00') => recordFieldFeedback(s, at(T(h)), id, f);

/** Semaine quatre sports : Strength adaptée, Course terminée, Cross-training abandonné, HYROX terminée. */
function fourDone(): { s: AppState; i: ReturnType<typeof ids> } {
  let s = create(FOUR);
  const i = ids(s);
  s = finish(s, i.strength, { completion: 'modified', pain: false });
  s = finish(s, i.running, { completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1740, distanceM: 5000 } });
  s = finish(s, i.ct, { completion: 'abandoned', pain: false });
  s = doHr(s, i.hyrox, T('10:00'), T('10:30'), 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } });
  return { s, i };
}

describe('FIELD TEST — retour terrain (adversarial)', () => {
  const base = fourDone();

  it('FT-A1. feedback absent : rien d’inventé (journal et historique : null)', () => {
    expect(selectBetaJournal(base.s).every((e) => e.feedback === null)).toBe(true);
    expect(selectFieldHistory(base.s).every((e) => e.feedback === null)).toBe(true);
  });
  it('FT-A2. retour vide refusé ; commentaire composé d’espaces = absence', () => {
    expect(code(() => fb(base.s, base.i.strength, {}))).toBe('FIELD_FEEDBACK_EMPTY');
    expect(code(() => fb(base.s, base.i.strength, { comment: '   \n ' }))).toBe('FIELD_FEEDBACK_EMPTY');
    expect(fb(base.s, base.i.strength, { difficulty: 'easy', comment: '  ' }).programmeLogs[base.i.strength]?.field?.comment).toBeUndefined();
  });
  it('FT-A3. commentaire long : borne exacte acceptée, au-delà refusé (rien d’écrit)', () => {
    const max = 'x'.repeat(FIELD_COMMENT_MAX);
    expect(fb(base.s, base.i.strength, { comment: max }).programmeLogs[base.i.strength]?.field?.comment).toHaveLength(FIELD_COMMENT_MAX);
    expect(code(() => fb(base.s, base.i.strength, { comment: `${max}x` }))).toBe('FIELD_FEEDBACK_COMMENT_TOO_LONG');
  });
  it('FT-A4. séance non commencée ou en cours : retour refusé', () => {
    const s0 = create(FOUR);
    const i = ids(s0);
    expect(code(() => fb(s0, i.strength, { difficulty: 'easy' }))).toBe('FIELD_FEEDBACK_SESSION_NOT_FINISHED');
    const started = startProgrammeSession(s0, at(MON1), i.strength);
    expect(code(() => fb(started, i.strength, { difficulty: 'easy' }))).toBe('FIELD_FEEDBACK_SESSION_NOT_FINISHED');
  });
  it('FT-A5. double retour refusé (double soumission), le premier est conservé', () => {
    const s1 = fb(base.s, base.i.running, { difficulty: 'hard' });
    expect(code(() => fb(s1, base.i.running, { difficulty: 'easy' }))).toBe('FIELD_FEEDBACK_ALREADY_RECORDED');
    expect(s1.programmeLogs[base.i.running]?.field?.difficulty).toBe('hard');
  });
  it('FT-A6. valeur inconnue refusée (aucune échelle inventée)', () => {
    expect(code(() => fb(base.s, base.i.running, { difficulty: 'extreme' as never }))).toBe('FIELD_FEEDBACK_INVALID');
    expect(code(() => fb(base.s, base.i.running, { tolerance: 'ok' as never }))).toBe('FIELD_FEEDBACK_INVALID');
    expect(code(() => fb(base.s, base.i.running, { perceivedDuration: 'long' as never }))).toBe('FIELD_FEEDBACK_INVALID');
  });
  it('FT-A7. provenance explicite USER_REPORTED_FIELD_FEEDBACK et horodatage', () => {
    const f = fb(base.s, base.i.hyrox, { tolerance: 'medium' }, '11:00').programmeLogs[base.i.hyrox]?.field;
    expect(f).toEqual({ provenance: 'USER_REPORTED_FIELD_FEEDBACK', recordedAt: '2026-10-05T11:00:00Z', tolerance: 'medium' });
  });
  it('FT-A8. le retour n’écrit QUE le journal de la séance (moteurs, programme, planning, sécurité intacts)', () => {
    const s1 = fb(base.s, base.i.strength, { difficulty: 'very_hard', tolerance: 'poor', perceivedDuration: 'too_long', comment: 'trop dur' });
    const { programmeLogs: a, ...restA } = s1;
    const { programmeLogs: b, ...restB } = base.s;
    expect(restA).toEqual(restB);
    expect(Object.keys(a)).toEqual(Object.keys(b));
  });
  it('FT-A9. aucune influence sur la génération suivante : semaine 2 identique avec ou sans retour', () => {
    let withF = base.s;
    for (const id of [base.i.strength, base.i.running, base.i.ct, base.i.hyrox]) withF = fb(withF, id, { difficulty: 'very_hard', tolerance: 'poor', perceivedDuration: 'too_long' });
    const a = ensureBeta0Week(base.s, at(MON2));
    const b = ensureBeta0Week(withF, at(MON2));
    expect(b.planner.weeks['2026-10-12']).toEqual(a.planner.weeks['2026-10-12']);
    expect(b.programmeState).toEqual(a.programmeState);
  });
  it('FT-A10. séance abandonnée : retour accepté, l’abandon reste un abandon', () => {
    const s1 = fb(base.s, base.i.ct, { difficulty: 'very_hard', comment: 'arrêtée' });
    const e = selectBetaJournal(s1).find((x) => x.requestId === base.i.ct);
    expect(e?.execution?.completion).toBe('abandoned');
    expect(e?.execution?.ctResult).toBeNull();
    expect(e?.feedback?.difficulty).toBe('very_hard');
  });
  it('FT-A11. HYROX time cap : résultat structuré du moteur conservé dans le journal', () => {
    let s = create(hrProfile({ hr: { role: ROLE('station_capacity'), sessionsPerWeek: 1 } }));
    const id = week(s)?.sessions.find((x) => x.placement === 'planned')?.requestId ?? '';
    s = doHr(s, id, T('08:00'), T('10:00'), 1, { completion: 'modified', pain: false, hr: { timeCapReached: true } });
    const e = selectBetaJournal(fb(s, id, { perceivedDuration: 'too_short' })).find((x) => x.requestId === id);
    expect(e?.execution?.hrResult?.kind).toBe('time_capped');
    expect(e?.feedback?.perceivedDuration).toBe('too_short');
  });
  it('FT-A12. Running terminé : durée réelle = durée courue déclarée, distance conservée', () => {
    const h = selectFieldHistory(base.s).find((x) => x.requestId === base.i.running);
    expect(h?.durationS).toBe(1740);
    expect(selectBetaJournal(base.s).find((x) => x.requestId === base.i.running)?.execution?.distanceM).toBe(5000);
  });
  it('FT-A13. Strength modifiée : statut « modified », séries réellement faites comptées (aucune supposée)', () => {
    const e = selectBetaJournal(base.s).find((x) => x.requestId === base.i.strength);
    expect(e?.status).toBe('modified');
    expect(e?.execution?.setsDone).toBe(0);
  });
  it('FT-A14. douleur : retour accepté, la pause douleur n’est ni levée ni masquée', () => {
    let s = create(FOUR);
    const i = ids(s);
    s = finish(s, i.strength, { completion: 'modified', pain: true });
    expect(s.safety.activePain).not.toBeNull();
    const s1 = fb(s, i.strength, { tolerance: 'poor' });
    expect(s1.safety).toEqual(s.safety);
    expect(selectBetaJournal(s1).find((x) => x.requestId === i.strength)?.execution?.pain).toBe(true);
  });
  it('FT-A15. séance non placée faite maintenant : provenance manuelle, jour réel, aucun faux placement', () => {
    let s = create(FOUR);
    const i = ids(s);
    expect(i.unplaced).not.toBe('');
    s = finish(s, i.unplaced, { completion: 'completed_as_prescribed', pain: false, run: { realizedDurationS: 1500 } }, ['18:00', '18:30']);
    const e = selectBetaJournal(fb(s, i.unplaced, { difficulty: 'easy' })).find((x) => x.requestId === i.unplaced);
    expect(e).toMatchObject({ placement: 'composed_unplaced', provenance: 'manual_from_unplaced', date: '2026-10-05' });
    expect(e?.refusal?.category).toBeDefined();
    expect(Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === i.unplaced)?.status).toBe('unplaced');
    expect(selectFieldHistory(s).find((x) => x.requestId === i.unplaced)?.manual).toBe(true);
  });
  it('FT-A16. Quality BLOCKED : jamais démarrable (placée ou non) ; le journal montre le verdict', () => {
    const s0 = create(FOUR);
    const i = ids(s0);
    const blocked: AppState = { ...s0, planner: { weeks: Object.fromEntries(Object.entries(s0.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.quality ? { ...r, quality: { ...r.quality, verdict: 'BLOCKED' as const } } : r)) }])) } };
    expect(code(() => startProgrammeSession(blocked, at(MON1), i.strength))).toBe('QUALITY_BLOCKED');
    expect(code(() => startProgrammeSession(blocked, at(MON1), i.unplaced))).toBe('QUALITY_BLOCKED');
    expect(selectBetaJournal(blocked).filter((e) => e.quality).every((e) => e.quality?.verdict === 'BLOCKED')).toBe(true);
  });
  it('FT-A17. Quality UNRESOLVED : réalisable dans la Beta expérimentale (règle FIELD TEST)', () => {
    const s0 = create(FOUR);
    expect(selectBetaJournal(s0).filter((e) => e.quality).every((e) => e.quality?.verdict === 'UNRESOLVED')).toBe(true);
    expect(code(() => startProgrammeSession(s0, at(MON1), ids(s0).ct))).toBe('OK');
  });
  it('FT-A18. semaine saturée : séance composée mais non placée présente dans le journal avec sa raison', () => {
    const e = selectBetaJournal(create(FOUR)).filter((x) => x.placement === 'composed_unplaced');
    expect(e).toHaveLength(1);
    expect(e[0]?.prescription?.exercises.length).toBeGreaterThan(0);
    expect(e[0]?.refusal?.category).toBe('slot_unavailable');
  });
  it('FT-A19. quatre sports : journal complet (chaque sport, prescription, qualité)', () => {
    const j = selectBetaJournal(base.s);
    expect(new Set(j.map((e) => e.sport))).toEqual(new Set(['strength', 'running', 'crosstraining', 'hyrox']));
    expect(j.filter((e) => e.placement !== 'blocked').every((e) => e.prescription && e.quality)).toBe(true);
  });
  it('FT-A20. export / import de l’état : retour terrain conservé à l’identique', () => {
    const s1 = fb(base.s, base.i.hyrox, { difficulty: 'adapted', comment: 'ok' });
    const d = decodeState(exportState(s1));
    expect(d.ok && d.state.programmeLogs[base.i.hyrox]?.field).toEqual(s1.programmeLogs[base.i.hyrox]?.field);
  });
  it('FT-A21. rechargement avant retour : rien de supposé ; après retour : conservé', () => {
    const r0 = reload(base.s, MON1);
    expect(r0.programmeLogs[base.i.running]?.field).toBeUndefined();
    const r1 = reload(fb(r0, base.i.running, { tolerance: 'good' }), MON1);
    expect(r1.programmeLogs[base.i.running]?.field?.tolerance).toBe('good');
  });
  it('FT-A22. état antérieur (sans champ terrain) toujours lisible (champ additif)', () => {
    expect(zAppState.safeParse(JSON.parse(JSON.stringify(base.s))).success).toBe(true);
  });
  it('FT-A23. programme modifié : retours et historique conservés', () => {
    const s1 = fb(base.s, base.i.strength, { difficulty: 'easy' });
    const p = { ...FOUR, strength: { ...FOUR.strength, sessionsPerWeek: 1 } };
    const s2 = recreateBeta0Programme(s1, p, at(T('20:00')), {});
    expect(s2.programmeLogs[base.i.strength]?.field?.difficulty).toBe('easy');
    expect(selectFieldHistory(s2).some((x) => x.feedback?.difficulty === 'easy')).toBe(true);
  });
  it('FT-A24. export du journal : contrat, version, profil sans prénom, retours, qualité, décisions', () => {
    const s1 = fb({ ...base.s, profile: base.s.profile ? { ...base.s.profile, displayName: 'Fabien' } : null }, base.i.ct, { difficulty: 'hard' });
    const raw = exportBetaJournal(s1, { build: 'abc1234', builtAt: '2026-10-07T12:00:00.000Z', exportedAt: T('21:00') });
    const j = JSON.parse(raw) as Record<string, unknown> & { journal: { feedback: unknown; quality: unknown }[]; profile: Record<string, unknown>; weeks: unknown[] };
    expect(j).toMatchObject({ kind: 'kairo.field_journal', schema: 1, build: 'abc1234', planningVersion: 'beta0-m31', feedbackProvenance: 'USER_REPORTED_FIELD_FEEDBACK' });
    expect(raw).not.toContain('Fabien');
    expect(j.profile.displayName).toBeUndefined();
    expect(j.journal.filter((e) => e.feedback)).toHaveLength(1);
    expect(j.weeks).toHaveLength(1);
    expect(raw).not.toContain('localStorage');
  });
  it('FT-A25. journal texte lisible : version, une ligne par séance, retour, qualité, non placée', () => {
    const t = betaJournalText(fb(base.s, base.i.running, { difficulty: 'easy', comment: 'facile' }), { build: 'abc1234', builtAt: null, exportedAt: T('21:00') });
    expect(t.startsWith('KAIRO FIELD TEST')).toBe(true);
    expect(t).toContain('retour terrain : difficulté facile · « facile »');
    expect(t).toContain('qualité Q1 : UNRESOLVED');
    expect(t).toContain('composed_unplaced');
  });
  it('FT-A26. journal et historique : lectures pures (déterministes, aucun état modifié)', () => {
    const snap = JSON.stringify(base.s);
    expect(selectBetaJournal(base.s)).toEqual(selectBetaJournal(base.s));
    selectFieldHistory(base.s);
    exportBetaJournal(base.s, { build: 'x', builtAt: null, exportedAt: MON1 });
    expect(JSON.stringify(base.s)).toBe(snap);
  });
});
