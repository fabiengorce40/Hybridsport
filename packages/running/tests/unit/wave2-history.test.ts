/**
 * Phase 6C — ancre de dose V19 : dernière dose réalisée du même archétype et de la même famille de
 * structure, bande RECENT (V12), sans retour négatif ; toute incertitude ⇒ indisponible (jamais une dose par défaut).
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import { CURRENT_RUNNING_GOVERNANCE, historyAnchor, RUNNING_CODES, sessionNegativeResponse, zRealizedSession } from '../../src/index.js';
import type { AnchorQuery, RealizedSession, RunningParameter } from '../../src/index.js';
import { fullyApprovedGovernance, NOW, withParameter } from '../fixtures.js';

type SessionIn = Partial<RealizedSession> & { sessionId: string; completedAt: string };
const session = (o: SessionIn): RealizedSession => zRealizedSession.parse({ archetype: 'EASY', structureFamily: 'CONTINUOUS', realizedDurationS: 2400, completion: 'COMPLETED', ...o });
const daysAgo = (d: number) => asISODateTime(new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z'));
const q = (history: SessionIn[], o: Partial<AnchorQuery> = {}): AnchorQuery => ({
  archetype: 'EASY', structureFamily: 'CONTINUOUS', history: history.map(session), now: NOW, mode: 'CANDIDATE', parameters: CURRENT_RUNNING_GOVERNANCE.parameters, returning: false, ...o,
});
const causeOf = (a: ReturnType<typeof historyAnchor>) => (a.status === 'unavailable' ? a.cause : 'ANCHORED');
const doseOf = (a: ReturnType<typeof historyAnchor>) => (a.status === 'anchored' ? a.session.realizedDurationS : undefined);

describe('retour négatif (définition 5E, au niveau de la séance)', () => {
  it.each([
    [{ completion: 'PARTIAL' }, true],
    [{ completion: 'SKIPPED', skipReason: 'PAIN' }, true],
    [{ completion: 'SKIPPED' }, true],
    [{ completion: 'SKIPPED', skipReason: 'TIME' }, false],
    [{ unexpectedDifficulty: 'MUCH_HARDER' }, true],
    [{ unexpectedDifficulty: 'HARDER' }, false],
    [{ unexpectedDifficulty: 'UNKNOWN' }, false],
    [{ intoleranceOrPainSignal: true }, true],
    [{ readinessOrToleranceDegraded: true }, true],
    [{ completion: 'SKIPPED', skipReason: 'EQUIPMENT' }, true],
    [{ completion: 'SKIPPED', skipReason: 'FATIGUE' }, true],
    [{ completion: 'SKIPPED', skipReason: 'OTHER' }, true],
    [{ unexpectedDifficulty: 'EASIER' }, false],
    [{ unexpectedDifficulty: 'AS_EXPECTED' }, false],
    [{}, false],
  ] as const)('%j ⇒ %s', (o, expected) => {
    expect(sessionNegativeResponse(session({ sessionId: 's', completedAt: daysAgo(1), ...o }))).toBe(expected);
  });
});

describe('ancre V19 — gouvernance', () => {
  it('mode CANDIDATE : V19 et V12 candidats, tracés CANDIDATE_VALUE_USED ; ancre retenue et tracée', () => {
    const a = historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }]));
    expect(a.status).toBe('anchored');
    expect(a.reasons.map((r) => [r.code, r.params.parameterId ?? r.params.sessionId])).toEqual([
      [RUNNING_CODES.CANDIDATE_VALUE_USED, 'running.dose.historyAnchorPolicy'],
      [RUNNING_CODES.CANDIDATE_VALUE_USED, 'running.reference.recencyBands'],
      [RUNNING_CODES.DOSE_ANCHOR_SELECTED, 'h1'],
    ]);
    expect(a.reasons[2]?.params).toEqual({ archetype: 'EASY', sessionId: 'h1', realizedDurationS: 2400, feedbackKnown: false });
    expect(a.parameterIds).toEqual(['running.dose.historyAnchorPolicy', 'running.reference.recencyBands']);
  });

  it('mode PRODUCTION avec la gouvernance réelle : V19 non éligible ⇒ POLICY_UNRESOLVED (aucune dose)', () => {
    const a = historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { mode: 'PRODUCTION' }));
    expect(causeOf(a)).toBe('POLICY_UNRESOLVED');
    expect(a.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.UNRESOLVED_PARAMETER, RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE]);
    expect(a.reasons[0]?.params).toEqual({ parameterId: 'running.dose.historyAnchorPolicy', cause: 'MATURITY_INSUFFICIENT', mode: 'PRODUCTION' });
  });

  it('mode PRODUCTION avec une gouvernance simulée approuvée : ancre sans trace de valeur candidate', () => {
    const a = historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { mode: 'PRODUCTION', parameters: fullyApprovedGovernance().parameters }));
    expect(a.status).toBe('anchored');
    expect(a.reasons.map((r) => r.code)).toEqual([RUNNING_CODES.DOSE_ANCHOR_SELECTED]);
  });

  it('V19 absent du registre ⇒ POLICY_UNRESOLVED ; valeur de règle altérée ⇒ POLICY_UNRESOLVED (jamais interprétée)', () => {
    const without = CURRENT_RUNNING_GOVERNANCE.parameters.filter((p) => p.parameterId !== 'running.dose.historyAnchorPolicy');
    expect(causeOf(historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { parameters: without })))).toBe('POLICY_UNRESOLVED');
    const alter = (patch: Record<string, unknown>) => withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.dose.historyAnchorPolicy', (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: { ...(p.value.status === 'candidate' ? p.value.value as object : {}), ...patch } } })).parameters;
    for (const patch of [{ anchor: 'MEDIAN_RECENT' }, { sameArchetype: false }, { sameStructureFamily: false }, { recencyBand: 'AGING' }, { recencyParameter: 'x' }, { requiresNoNegativeResponse: false }, { otherwise: 'DEFAULT_DOSE' }]) {
      expect(causeOf(historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { parameters: alter(patch) }))), JSON.stringify(patch)).toBe('POLICY_UNRESOLVED');
    }
    const nonObject = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.dose.historyAnchorPolicy', (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: 'LAST_REALIZED_DOSE' } })).parameters;
    expect(causeOf(historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { parameters: nonObject })))).toBe('POLICY_UNRESOLVED');
    // 6C.2 (mutation L1) : une valeur JSON null est refusée, jamais déréférencée.
    const nullValue = withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.dose.historyAnchorPolicy', (p): RunningParameter => ({ ...p, value: { status: 'candidate', value: null } })).parameters;
    expect(causeOf(historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { parameters: nullValue })))).toBe('POLICY_UNRESOLVED');
  });

  it('bande de récence V12 absente ou altérée ⇒ RECENCY_UNRESOLVED', () => {
    const v12 = (value: unknown) => withParameter(CURRENT_RUNNING_GOVERNANCE, 'running.reference.recencyBands', (p): RunningParameter => ({ ...p, value: { status: 'candidate', value } })).parameters;
    for (const v of [{ recentMaxWeeks: 0 }, { recentMaxWeeks: -1 }, { recentMaxWeeks: '8' }, {}]) {
      expect(causeOf(historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { parameters: v12(v) }))), JSON.stringify(v)).toBe('RECENCY_UNRESOLVED');
    }
    const without = CURRENT_RUNNING_GOVERNANCE.parameters.filter((p) => p.parameterId !== 'running.reference.recencyBands');
    expect(causeOf(historyAnchor(q([{ sessionId: 'h1', completedAt: daysAgo(3) }], { parameters: without })))).toBe('RECENCY_UNRESOLVED');
  });
});

describe('ancre V19 — sélection de la séance', () => {
  it('historique vide, autre archétype, autre famille, séance future ⇒ NO_REALIZED_SESSION', () => {
    expect(causeOf(historyAnchor(q([])))).toBe('NO_REALIZED_SESSION');
    expect(causeOf(historyAnchor(q([{ sessionId: 'l', completedAt: daysAgo(2), archetype: 'LONG' }])))).toBe('NO_REALIZED_SESSION');
    expect(causeOf(historyAnchor(q([{ sessionId: 'i', completedAt: daysAgo(2), structureFamily: 'INTERVALS' }])))).toBe('NO_REALIZED_SESSION');
    expect(causeOf(historyAnchor(q([{ sessionId: 'f', completedAt: daysAgo(-1) }])))).toBe('NO_REALIZED_SESSION');
  });

  it('une séance non terminée ou avec retour négatif n’est jamais une dose réalisée', () => {
    for (const o of [{ completion: 'PARTIAL' }, { completion: 'SKIPPED', skipReason: 'TIME' }, { completion: 'UNKNOWN' }, { unexpectedDifficulty: 'MUCH_HARDER' }, { intoleranceOrPainSignal: true }, { readinessOrToleranceDegraded: true }] as const) {
      expect(causeOf(historyAnchor(q([{ sessionId: 'x', completedAt: daysAgo(2), ...o }]))), JSON.stringify(o)).toBe('NO_REALIZED_SESSION');
    }
  });

  it('dernière dose réalisée (pas la plus haute, pas une médiane) ; retour connu tracé', () => {
    const a = historyAnchor(q([
      { sessionId: 'old', completedAt: daysAgo(10), realizedDurationS: 3600 },
      { sessionId: 'last', completedAt: daysAgo(2), realizedDurationS: 1800, unexpectedDifficulty: 'AS_EXPECTED' },
      { sessionId: 'mid', completedAt: daysAgo(5), realizedDurationS: 2400 },
    ]));
    expect(doseOf(a)).toBe(1800);
    expect(a.status === 'anchored' && a.feedbackKnown).toBe(true);
  });

  it('séance exactement à la limite de la bande RECENT (8 semaines) : retenue ; au-delà : NOT_RECENT', () => {
    expect(doseOf(historyAnchor(q([{ sessionId: 'b', completedAt: daysAgo(56) }])))).toBe(2400);
    expect(causeOf(historyAnchor(q([{ sessionId: 'b', completedAt: daysAgo(57) }])))).toBe('NOT_RECENT');
  });

  it('séance plus récente avec retour négatif ⇒ LATER_NEGATIVE_RESPONSE (pas de repli sur une dose antérieure)', () => {
    const base = { sessionId: 'ok', completedAt: daysAgo(6), realizedDurationS: 3000 };
    for (const o of [{ completion: 'PARTIAL' }, { unexpectedDifficulty: 'MUCH_HARDER' }, { completion: 'SKIPPED', skipReason: 'FATIGUE' }] as const) {
      expect(causeOf(historyAnchor(q([base, { sessionId: 'bad', completedAt: daysAgo(2), realizedDurationS: 1200, ...o }]))), JSON.stringify(o)).toBe('LATER_NEGATIVE_RESPONSE');
    }
    // Un saut pour manque de temps n'est pas un retour négatif.
    expect(doseOf(historyAnchor(q([base, { sessionId: 'skip', completedAt: daysAgo(2), completion: 'SKIPPED', skipReason: 'TIME' }])))).toBe(3000);
    // Une séance négative d'un AUTRE archétype ne change pas l'ancre EASY.
    expect(doseOf(historyAnchor(q([base, { sessionId: 'lg', completedAt: daysAgo(2), archetype: 'LONG', completion: 'PARTIAL' }])))).toBe(3000);
  });

  it('séance plus récente de réalisation inconnue ⇒ LATER_SESSION_UNKNOWN', () => {
    expect(causeOf(historyAnchor(q([{ sessionId: 'ok', completedAt: daysAgo(6) }, { sessionId: 'u', completedAt: daysAgo(1), completion: 'UNKNOWN' }])))).toBe('LATER_SESSION_UNKNOWN');
  });

  it('deux ancres simultanées : doses différentes ⇒ AMBIGUOUS ; identiques ⇒ identifiant le plus petit', () => {
    const t = daysAgo(3);
    expect(causeOf(historyAnchor(q([{ sessionId: 'a', completedAt: t, realizedDurationS: 2000 }, { sessionId: 'b', completedAt: t, realizedDurationS: 2100 }])))).toBe('AMBIGUOUS');
    const same = historyAnchor(q([{ sessionId: 'z', completedAt: t }, { sessionId: 'a', completedAt: t }]));
    expect(same.status === 'anchored' && same.session.sessionId).toBe('a');
  });

  it('reprise : début inconnu ⇒ RETURN_START_UNKNOWN ; séances antérieures au retour ignorées', () => {
    const history = [{ sessionId: 'pre', completedAt: daysAgo(40), realizedDurationS: 4000 }, { sessionId: 'post', completedAt: daysAgo(3), realizedDurationS: 1500 }];
    expect(causeOf(historyAnchor(q(history, { returning: true })))).toBe('RETURN_START_UNKNOWN');
    expect(doseOf(historyAnchor(q(history, { returning: true, returnStartedAt: daysAgo(10) })))).toBe(1500);
    expect(causeOf(historyAnchor(q([history[0] as SessionIn], { returning: true, returnStartedAt: daysAgo(10) })))).toBe('NO_REALIZED_SESSION');
    // Séance le jour même du retour : post-retour (borne incluse).
    expect(doseOf(historyAnchor(q([{ sessionId: 'd0', completedAt: daysAgo(10) }], { returning: true, returnStartedAt: daysAgo(10) })))).toBe(2400);
    // Hors reprise, le début de reprise éventuel n'est pas appliqué.
    expect(doseOf(historyAnchor(q([history[0] as SessionIn], { returning: false, returnStartedAt: daysAgo(10) })))).toBe(4000);
  });

  it('séance terminée exactement à l’instant présent : non future, retenue (borne incluse)', () => {
    expect(doseOf(historyAnchor(q([{ sessionId: 'now', completedAt: NOW, realizedDurationS: 2000 }])))).toBe(2000);
  });

  it('séances négatives ou inconnues ANTÉRIEURES ou SIMULTANÉES à l’ancre : ne bloquent pas (seules les plus récentes comptent)', () => {
    const anchor = { sessionId: 'ok', completedAt: daysAgo(3), realizedDurationS: 2500 };
    for (const o of [{ completion: 'PARTIAL' }, { completion: 'UNKNOWN' }, { unexpectedDifficulty: 'MUCH_HARDER' }, { intoleranceOrPainSignal: true }] as const) {
      expect(doseOf(historyAnchor(q([{ sessionId: 'older', completedAt: daysAgo(9), ...o }, anchor]))), `antérieure ${JSON.stringify(o)}`).toBe(2500);
      expect(doseOf(historyAnchor(q([{ sessionId: 'same', completedAt: daysAgo(3), ...o }, anchor]))), `simultanée ${JSON.stringify(o)}`).toBe(2500);
    }
  });

  it('ancres simultanées de même dose : identifiant le plus petit pour TOUTE permutation', () => {
    const t = daysAgo(3);
    const ids = ['m', 'a', 'z'];
    const perms = ids.flatMap((x) => ids.filter((y) => y !== x).flatMap((y) => ids.filter((z) => z !== x && z !== y).map((z) => [x, y, z])));
    expect(perms).toHaveLength(6);
    for (const p of perms) {
      const a = historyAnchor(q(p.map((sessionId) => ({ sessionId, completedAt: t, unexpectedDifficulty: sessionId === 'a' ? 'AS_EXPECTED' : 'UNKNOWN' }))));
      expect(a.status === 'anchored' && [a.session.sessionId, a.feedbackKnown], p.join()).toEqual(['a', true]);
    }
  });

  it('identifiants de séance dupliqués (même instant, même dose, retours différents) : ancre indépendante de l’ordre', () => {
    const t = daysAgo(3);
    const h = [{ sessionId: 'dup', completedAt: t, unexpectedDifficulty: 'AS_EXPECTED' }, { sessionId: 'dup', completedAt: t, unexpectedDifficulty: 'UNKNOWN' }] as const;
    expect(historyAnchor(q([...h]))).toEqual(historyAnchor(q([...h].reverse())));
  });

  it('l’ordre de l’historique ne change pas l’ancre (déterminisme)', () => {
    const h = [{ sessionId: 'a', completedAt: daysAgo(9), realizedDurationS: 2000 }, { sessionId: 'b', completedAt: daysAgo(4), realizedDurationS: 2600 }, { sessionId: 'c', completedAt: daysAgo(7) }];
    const ref = historyAnchor(q(h));
    expect(historyAnchor(q([...h].reverse()))).toEqual(ref);
    expect(doseOf(ref)).toBe(2600);
  });

  it('schéma strict : durée non positive, instant invalide, champ inconnu refusés', () => {
    expect(zRealizedSession.safeParse({ sessionId: 's', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: asISODateTime('2026-10-01T08:00:00Z'), realizedDurationS: 0, completion: 'COMPLETED' }).success).toBe(false);
    expect(zRealizedSession.safeParse({ sessionId: 's', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: 'hier', realizedDurationS: 10, completion: 'COMPLETED' }).success).toBe(false);
    expect(zRealizedSession.safeParse({ sessionId: 's', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: '2026-10-01T08:00:00Z', realizedDurationS: 10, completion: 'COMPLETED', dose: 1 }).success).toBe(false);
    expect(zRealizedSession.safeParse({ sessionId: 's', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: '2026-10-01T08:00:00Z', realizedDurationS: Number.POSITIVE_INFINITY, completion: 'COMPLETED' }).success).toBe(false);
    expect(zRealizedSession.safeParse({ sessionId: 's', archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: '2026-10-01T08:00:00Z', realizedDurationS: Number.NaN, completion: 'COMPLETED' }).success).toBe(false);
  });
});
