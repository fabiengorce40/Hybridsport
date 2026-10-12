/**
 * P0 — sécurisation du contrôle pré-séance (non-régression) :
 *   - une question douleur SANS réponse n'est jamais lue comme « aucune douleur » (statut `unknown`) ;
 *   - « Passer » (ou douleur sans réponse) ne supprime AUCUNE douleur connue : celles du dernier contrôle explicite
 *     restent appliquées (`knownPains`) ; seules une réponse explicite ou la levée de la pause les résolvent ;
 *   - « Passer » ne lève jamais une pause douleur active ;
 *   - démarrages planifiés, « Faire maintenant », non placés, reprises et fin directe ;
 *   - récurrence : les douleurs reportées ne sont jamais recomptées comme nouveaux signalements.
 */
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, clearPain, evaluateCheckIn, finishProgrammeSession, knownPainsOf, recordProgrammeSet, selectBeta0Week, selectProgrammeSession, startProgrammeSession, strengthContent,
} from '../../src/index.js';
import type { AppState, CheckIn, CheckInInput } from '../../src/index.js';
import { at, code, create, exercisesOf, strengthIds } from './sf-fixtures.js';
import { create as createHr, hrProfile, reload } from '../hr/hr-fixtures.js';

const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z` as CheckIn['at'];
const catalog = strengthContent().catalog;
const areasOf = (ex: string) => catalog.exercise(ex)?.painSensitiveAreas ?? [];
const touches = (s: AppState, id: string, area: string) => exercisesOf(s, id).filter((e) => areasOf(e).includes(area));
const dateOf = (s: AppState, id: string) => selectProgrammeSession(s, id)?.date ?? '2026-10-05';
const env = beta0Environment();
const start = (s: AppState, id: string, ci?: CheckInInput, hm = '18:00') => startProgrammeSession(s, at(T(dateOf(s, id), hm)), id, env, ci);
const last = (s: AppState): CheckIn | undefined => s.checkIns.at(-1);
const KNEE_P2: CheckInInput = { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' };

/** Séance A démarrée avec un genou P2 déclaré (douleur CONNUE ensuite) ; B, C : autres séances Strength. */
function kneeKnown() {
  const s0 = create();
  const [a = '', b = '', c = ''] = strengthIds(s0);
  const s = start(s0, a, KNEE_P2);
  expect(last(s)).toMatchObject({ decision: 'adapted', painStatus: 'reported', pains: [{ area: 'knee', level: 'P2' }] });
  return { s0, s, a, b, c };
}

describe('P0 — question douleur : jamais « aucune douleur » implicite', () => {
  it('S-1. fatigue et récupération répondues, douleur SANS réponse ⇒ statut douleur inconnu (pas « aucune »), contrôle répondu', () => {
    const s0 = create();
    const id = strengthIds(s0)[0] ?? '';
    const s = start(s0, id, { fatigue: 'low', recovery: 'good' });
    expect(last(s)).toMatchObject({ answered: true, painStatus: 'unknown', pains: [], knownPains: [], readiness: 'normal', decision: 'unchanged' });
  });

  it('S-2. « Non » explicite ⇒ statut « aucune douleur » ; « Passer » ⇒ inconnu ; douleurs fournies sans réponse ⇒ « déclarée »', () => {
    const s0 = create();
    const id = strengthIds(s0)[0] ?? '';
    expect(last(start(s0, id, { painAnswer: 'no' }))?.painStatus).toBe('none');
    expect(last(start(s0, id))).toMatchObject({ answered: false, painStatus: 'unknown', readiness: 'unknown' });
    expect(last(start(s0, id, { pains: [{ area: 'knee', level: 'P1' }] }))?.painStatus).toBe('reported');
  });

  it('S-3. réponses incohérentes refusées (CHECKIN_INVALID), état inchangé', () => {
    const s0 = create();
    const id = strengthIds(s0)[0] ?? '';
    for (const ci of [{ painAnswer: 'yes' as const }, { painAnswer: 'no' as const, pains: [{ area: 'knee' as const, level: 'P2' as const }] }, { painAnswer: 'unknown' as const, generalSignal: true }]) {
      expect(code(() => start(s0, id, ci))).toBe('CHECKIN_INVALID');
    }
  });
});

describe('P0 — « Passer » ne supprime aucune douleur connue', () => {
  it('K-1. genou P2 connu puis « Passer » ⇒ douleur reportée, séance adaptée (aucun exercice sollicitant le genou), raison tracée', () => {
    const { s, b } = kneeKnown();
    expect(touches(s, b, 'knee').length).toBeGreaterThan(0);
    const s2 = start(s, b);
    const c = last(s2);
    expect(c).toMatchObject({ answered: false, painStatus: 'unknown', pains: [], knownPains: [{ area: 'knee', level: 'P2' }] });
    expect(c?.reasons.some((r) => r.code === 'KAIRO.CHECKIN_KNOWN_PAIN_KEPT')).toBe(true);
    expect(['adapted', 'postponed']).toContain(c?.decision);
    if (c?.decision === 'adapted') expect(touches(s2, b, 'knee')).toEqual([]);
  });

  it('K-2. douleur sans réponse (fatigue seule répondue) ⇒ même report de la douleur connue', () => {
    const { s, b } = kneeKnown();
    const s2 = start(s, b, { fatigue: 'moderate', recovery: 'average' });
    expect(last(s2)?.knownPains).toEqual([expect.objectContaining({ area: 'knee', level: 'P2' })]);
    if (last(s2)?.decision === 'adapted') expect(touches(s2, b, 'knee')).toEqual([]);
  });

  it('K-3. plusieurs « Passer » successifs : la douleur reste connue (jamais oubliée par l’absence de réponse)', () => {
    const { s, b, c } = kneeKnown();
    const s2 = start(start(s, b), c);
    expect(last(s2)?.knownPains).toEqual([expect.objectContaining({ area: 'knee', level: 'P2' })]);
    expect(knownPainsOf(s2.checkIns)).toEqual([expect.objectContaining({ area: 'knee', level: 'P2' })]);
  });

  it('K-4. « Non » explicite résout la douleur connue : séance planifiée inchangée, plus rien de reporté ensuite', () => {
    const { s, s0, b, c } = kneeKnown();
    const s2 = start(s, b, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    expect(last(s2)).toMatchObject({ painStatus: 'none', knownPains: [], decision: 'unchanged' });
    expect(exercisesOf(s2, b)).toEqual(exercisesOf(s0, b));
    expect(last(start(s2, c))?.knownPains).toEqual([]);
  });

  it('K-5. « Oui » explicite : la déclaration actuelle remplace la précédente (zones listées seulement)', () => {
    const { s, b } = kneeKnown();
    const s2 = start(s, b, { painAnswer: 'yes', pains: [{ area: 'elbow', level: 'P1' }] });
    expect(last(s2)).toMatchObject({ painStatus: 'reported', pains: [{ area: 'elbow', level: 'P1' }], knownPains: [] });
  });

  it('K-6. pause douleur active : « Passer » ne la lève pas (démarrage refusé, état inchangé)', () => {
    const s0 = create();
    const [a = '', b = ''] = strengthIds(s0);
    const paused = start(s0, a, { painAnswer: 'yes', generalSignal: true });
    expect(paused.safety.activePain).not.toBeNull();
    const before = JSON.stringify(paused);
    expect(code(() => start(paused, b))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
    expect(code(() => start(paused, b, { painAnswer: 'no' }))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
    expect(JSON.stringify(paused)).toBe(before);
  });

  it('K-7. levée explicite de la pause ⇒ résolution des douleurs connues antérieures (aucun report ensuite)', () => {
    const { s, b } = kneeKnown();
    const cleared = clearPain(s, at(T('2026-10-06', '08:00')));
    expect(cleared.safety).toMatchObject({ activePain: null, clearedAt: '2026-10-06T08:00:00Z' });
    expect(last(startProgrammeSession(cleared, at(T('2026-10-06', '09:00')), b, env))?.knownPains).toEqual([]);
    // Douleur déclarée APRÈS la levée : de nouveau connue.
    const again = startProgrammeSession(cleared, at(T('2026-10-06', '09:00')), b, env, KNEE_P2);
    expect(knownPainsOf(again.checkIns, again.safety.clearedAt)).toEqual([expect.objectContaining({ area: 'knee' })]);
  });

  it('K-8. persistance : douleurs connues, statut et levée relus à l’identique après rechargement', () => {
    const { s, b } = kneeKnown();
    const s2 = start(s, b);
    const r = reload(s2, T('2026-10-08'));
    expect(r.checkIns).toEqual(s2.checkIns);
    expect(knownPainsOf(r.checkIns, r.safety.clearedAt)).toEqual(knownPainsOf(s2.checkIns, s2.safety.clearedAt));
  });
});

describe('P0 — chemins de démarrage avec une douleur connue', () => {
  it('D-1. planifiée le jour prévu et « Faire maintenant » (un autre jour) : même contrôle, même report', () => {
    const { s, b, c } = kneeKnown();
    const planned = start(s, b);
    const now = startProgrammeSession(s, at(T('2026-10-05', '20:00')), c, env);
    for (const [x, id] of [[planned, b], [now, c]] as const) {
      expect(last(x)?.knownPains).toEqual([expect.objectContaining({ area: 'knee', level: 'P2' })]);
      if (last(x)?.decision !== 'postponed') expect(touches(x, id, 'knee')).toEqual([]);
    }
  });

  it('D-2. séance NON PLACÉE (manuelle) : contrôle enregistré, douleur connue appliquée ; jamais démarrée sur une zone exclue', () => {
    const s0 = createHr(hrProfile({ strength: true, running: true, ct: true, hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 1 }, availability: [60, 60, 60, 60, 60, 0, 0] }));
    const sessions = selectBeta0Week(s0, '2026-10-05')?.sessions ?? [];
    const U = sessions.find((x) => x.placement === 'composed_unplaced')?.requestId ?? '';
    const A = sessions.find((x) => x.sport === 'strength' && x.placement === 'planned')?.requestId ?? '';
    expect(U).not.toBe('');
    const s = startProgrammeSession(s0, at(T('2026-10-05')), A, env, KNEE_P2);
    const x = startProgrammeSession(s, at(T('2026-10-09')), U, env);
    const c = last(x);
    expect(c).toMatchObject({ requestId: U, painStatus: 'unknown', knownPains: [expect.objectContaining({ area: 'knee', level: 'P2' })] });
    const planned = selectProgrammeSession(s, U)?.session.blocks.flatMap((bl) => bl.items.map((i) => i.exerciseId)) ?? [];
    const hitsKnee = planned.some((e) => areasOf(e).includes('knee'));
    if (c?.decision === 'unchanged') expect(hitsKnee).toBe(false);
    if (hitsKnee) expect(c?.decision === 'postponed' || c?.decision === 'adapted').toBe(true);
  });

  it('D-3. reprise d’une séance commencée : aucun contrôle, aucune douleur reportée a posteriori, séries conservées', () => {
    const { s, b } = kneeKnown();
    let x = start(s, b);
    const d = dateOf(x, b);
    const item = selectProgrammeSession(x, b)?.session.blocks.flatMap((bl) => bl.items).find((i) => i.prescription.type === 'sets');
    x = recordProgrammeSet(x, at(T(d, '18:05')), b, { itemId: item?.id ?? '', setIndex: 0, done: true, reps: 6, loadKg: 30 });
    const n = x.checkIns.length;
    const resumed = startProgrammeSession(reload(x, T(d, '18:10')), at(T(d, '18:10')), b, env, { painAnswer: 'no' });
    expect(resumed.checkIns).toHaveLength(n);
    expect(resumed.programmeLogs[b]?.sets).toHaveLength(1);
    expect(resumed.programmeLogs[b]?.adaptation).toEqual(x.programmeLogs[b]?.adaptation);
  });

  it('D-4. fin directe d’une séance non démarrée : aucun contrôle a posteriori, aucune adaptation, exécution enregistrée', () => {
    const { s, b } = kneeKnown();
    const n = s.checkIns.length;
    const done = finishProgrammeSession(s, at(T(dateOf(s, b), '19:00')), { requestId: b, completion: 'modified', pain: false });
    expect(done.checkIns).toHaveLength(n);
    expect(done.programmeLogs[b]?.adaptation).toBeUndefined();
    expect(done.programmeState?.results.some((r) => r.requestId === b)).toBe(true);
  });
});

describe('P0 — douleur récurrente (règle G1 `detectRecurrence`)', () => {
  const ruleset = strengthContent().ruleset;
  const ci = (id: string, atIso: CheckIn['at'], pains: CheckIn['pains'], o: Partial<CheckIn> = {}): CheckIn => ({
    id, at: atIso, requestId: 'r', answered: true, pains, generalSignal: false, painStatus: pains.length > 0 ? 'reported' : 'none', knownPains: [], fatigue: 'unknown', recovery: 'unknown', readiness: 'unknown', decision: 'unchanged', reasons: [], ...o,
  });
  const ev = (history: CheckIn[], atIso: CheckIn['at'], pains: CheckIn['pains'], painStatus: CheckIn['painStatus'] = pains.length > 0 ? 'reported' : 'unknown') =>
    evaluateCheckIn({ id: 'now', at: atIso, pains, generalSignal: false, fatigue: 'unknown', recovery: 'unknown', painStatus }, history, ruleset);

  it('R-1. P1 puis P1 sur la même zone sous 14 jours ⇒ relevée en P2 (raison tracée)', () => {
    const e = ev([ci('c1', T('2026-10-05'), [{ area: 'knee', level: 'P1' }])], T('2026-10-12'), [{ area: 'knee', level: 'P1' }]);
    expect(e.declared.map((r) => r.level)).toEqual(['P2']);
    expect(e.reasons.some((r) => r.code === 'KAIRO.CHECKIN_PAIN_ESCALATED')).toBe(true);
  });

  it('R-2. au-delà de 14 jours : aucune élévation', () => {
    const e = ev([ci('c1', T('2026-10-05'), [{ area: 'knee', level: 'P1' }])], T('2026-10-20'), [{ area: 'knee', level: 'P1' }]);
    expect(e.declared.map((r) => r.level)).toEqual(['P1']);
    expect(e.reasons.some((r) => r.code === 'KAIRO.CHECKIN_PAIN_ESCALATED')).toBe(false);
  });

  it('R-3. P1 connu puis « Passer » : reporté tel quel (P1), JAMAIS recompté comme une récidive', () => {
    const e = ev([ci('c1', T('2026-10-05'), [{ area: 'knee', level: 'P1' }])], T('2026-10-06'), [], 'unknown');
    expect(e.declared).toEqual([]);
    expect(e.known).toEqual([expect.objectContaining({ area: 'knee', level: 'P1' })]);
    expect(e.reports.map((r) => r.level)).toEqual(['P1']);
    expect(e.reasons.some((r) => r.code === 'KAIRO.CHECKIN_PAIN_ESCALATED')).toBe(false);
  });

  it('R-4. P1, « Passer », P1 : seules les deux DÉCLARATIONS comptent ⇒ P2 à la seconde', () => {
    const h = [ci('c1', T('2026-10-05'), [{ area: 'shoulder', level: 'P1' }]), ci('c2', T('2026-10-06'), [], { answered: false, painStatus: 'unknown', knownPains: [{ area: 'shoulder', level: 'P1', from: 'c1', reportedAt: T('2026-10-05') }] })];
    const e = ev(h, T('2026-10-08'), [{ area: 'shoulder', level: 'P1' }]);
    expect(e.declared.map((r) => r.level)).toEqual(['P2']);
  });

  it('R-5. « Non » entre deux P1 : la récurrence reste comptée sur l’historique des déclarations (règle G1 inchangée)', () => {
    const h = [ci('c1', T('2026-10-05'), [{ area: 'knee', level: 'P1' }]), ci('c2', T('2026-10-06'), [])];
    expect(ev(h, T('2026-10-08'), [{ area: 'knee', level: 'P1' }]).declared.map((r) => r.level)).toEqual(['P2']);
  });

  it('R-6. chemin réel : P1 genou (séance A), « Passer » (B), P1 genou (C) ⇒ C relevée en P2, B jamais relevée', () => {
    const s0 = create();
    const [a = '', b = '', c = ''] = strengthIds(s0);
    const s1 = start(s0, a, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P1' }] });
    const s2 = start(s1, b);
    expect(last(s2)?.knownPains).toEqual([expect.objectContaining({ area: 'knee', level: 'P1' })]);
    expect(last(s2)?.reasons.some((r) => r.code === 'KAIRO.CHECKIN_PAIN_ESCALATED')).toBe(false);
    const s3 = start(s2, c, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P1' }] });
    expect(last(s3)?.pains).toEqual([{ area: 'knee', level: 'P2' }]);
    if (last(s3)?.decision === 'adapted') expect(touches(s3, c, 'knee')).toEqual([]);
  });
});
