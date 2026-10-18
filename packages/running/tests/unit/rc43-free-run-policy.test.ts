/**
 * RC4.3 (décision R2, option A′) — politique `freeRunPolicy: PROGRAMME_FIRST` de V19 :
 * - ancre d'un footing : dernière séance du PROGRAMME ; une course libre n'ancre qu'en l'absence de séance programme
 *   exploitable (ancre initiale : course déclarée à l'onboarding) ;
 * - une course libre longue ou de qualité n'est JAMAIS une ancre (durée ou structure) ;
 * - progression : une course libre ne compte que si sa dose est celle de l'ancre ET sa tolérance favorable est CONNUE ;
 *   UNKNOWN n'est jamais une bonne tolérance ; une course libre d'une autre dose n'interrompt plus la progression ;
 * - sans la politique (gouvernance experte seule) : comportement antérieur inchangé.
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime } from '@hybridsport/domain';
import { CURRENT_RUNNING_GOVERNANCE, historyAnchor, progressionStep, withProductDecisions, zRealizedSession } from '../../src/index.js';
import type { AnchorQuery, RealizedSession } from '../../src/index.js';
import { NOW } from '../fixtures.js';

const GOV = withProductDecisions(CURRENT_RUNNING_GOVERNANCE).parameters;
type SessionIn = Partial<RealizedSession> & { sessionId: string; completedAt: string };
const session = (o: SessionIn): RealizedSession => zRealizedSession.parse({ archetype: 'EASY', structureFamily: 'CONTINUOUS', realizedDurationS: 1800, completion: 'COMPLETED', unexpectedDifficulty: 'AS_EXPECTED', ...o });
const daysAgo = (d: number) => asISODateTime(new Date(Date.parse(NOW) - d * 86_400_000).toISOString().replace('.000Z', 'Z'));
const free = (id: string) => `free:${id}`;
const freeIds = (h: readonly SessionIn[]) => h.map((x) => x.sessionId).filter((x) => x.startsWith('free:'));
const anchor = (history: SessionIn[], o: Partial<AnchorQuery> = {}, parameters = GOV) => historyAnchor({
  archetype: 'EASY', structureFamily: 'CONTINUOUS', history: history.map(session), now: NOW, mode: 'CANDIDATE', parameters, returning: false, freeSessionIds: freeIds(history), ...o,
});
const anchored = (a: ReturnType<typeof historyAnchor>) => (a.status === 'anchored' ? `${a.session.sessionId}:${String(a.session.realizedDurationS)}` : a.cause);

describe('ancre V19 — PROGRAMME_FIRST', () => {
  it('F2 : une course libre plus récente et plus longue ne remplace pas la dose du footing programmé', () => {
    expect(anchored(anchor([{ sessionId: 'p1', completedAt: daysAgo(3) }, { sessionId: free('80'), completedAt: daysAgo(1), realizedDurationS: 4800 }]))).toBe('p1:1800');
  });
  it('ancre initiale : sans séance programme exploitable, la course déclarée à l’onboarding ancre le footing', () => {
    expect(anchored(anchor([{ sessionId: free('onb'), completedAt: daysAgo(2) }]))).toBe('free:onb:1800');
    // Séance programme NON exploitable (interrompue) : la course libre reste l'ancre initiale.
    expect(anchored(anchor([{ sessionId: free('onb'), completedAt: daysAgo(4) }, { sessionId: 'p1', completedAt: daysAgo(1), completion: 'PARTIAL' }]))).toBe('free:onb:1800');
  });
  it('course libre LONGUE ou de QUALITÉ : jamais une ancre, même sans séance programme', () => {
    expect(anchored(anchor([{ sessionId: free('long'), completedAt: daysAgo(1), archetype: 'LONG', realizedDurationS: 5400 }], { archetype: 'LONG' }))).toBe('NO_REALIZED_SESSION');
    expect(anchored(anchor([{ sessionId: free('q'), completedAt: daysAgo(1), archetype: 'THRESHOLD', structureFamily: 'INTERVALS', realizedDurationS: 3000 }], { archetype: 'THRESHOLD', structureFamily: 'INTERVALS' }))).toBe('NO_REALIZED_SESSION');
    // Une sortie longue du programme reste l'ancre de la sortie longue, malgré une course libre longue plus récente.
    expect(anchored(anchor([{ sessionId: 'pl', completedAt: daysAgo(6), archetype: 'LONG', realizedDurationS: 4200 }, { sessionId: free('long'), completedAt: daysAgo(1), archetype: 'LONG', realizedDurationS: 7200 }], { archetype: 'LONG' }))).toBe('pl:4200');
  });
  it('sans la politique (gouvernance experte seule) : comportement antérieur (dernière séance, origine ignorée)', () => {
    expect(anchored(anchor([{ sessionId: 'p1', completedAt: daysAgo(3) }, { sessionId: free('80'), completedAt: daysAgo(1), realizedDurationS: 4800 }], {}, CURRENT_RUNNING_GOVERNANCE.parameters))).toBe('free:80:4800');
  });
});

describe('progression V23 — courses libres comme preuve', () => {
  const step = (history: SessionIn[], anchorId = 'p2') => {
    const h = history.map(session);
    const a = h.find((x) => x.sessionId === anchorId);
    if (!a) throw new Error('ancre');
    return progressionStep({ archetype: 'EASY', family: 'CONTINUOUS', anchor: a, afterNegativeFallback: false, history: h, now: NOW, capabilityEnabled: true, returnLifted: true, parameters: GOV, mode: 'CANDIDATE', freeSessionIds: freeIds(history) }).kind;
  };
  it('même dose, tolérance favorable CONNUE : la course libre compte (progression)', () => {
    expect(step([{ sessionId: free('a'), completedAt: daysAgo(4) }, { sessionId: 'p2', completedAt: daysAgo(1) }])).toBe('step');
  });
  it('même dose, ressenti INCONNU : jamais une bonne tolérance (maintien)', () => {
    expect(step([{ sessionId: free('a'), completedAt: daysAgo(4), unexpectedDifficulty: 'UNKNOWN' }, { sessionId: 'p2', completedAt: daysAgo(1) }])).toBe('hold');
  });
  it('autre dose : ignorée (ni preuve ni interruption) — deux footings programme tolérés suffisent', () => {
    expect(step([{ sessionId: 'p1', completedAt: daysAgo(6) }, { sessionId: free('80'), completedAt: daysAgo(3), realizedDurationS: 4800 }, { sessionId: 'p2', completedAt: daysAgo(1) }])).toBe('step');
  });
  it('séance du programme sans ressenti (UNKNOWN) : maintien, quelle que soit la course libre', () => {
    expect(step([{ sessionId: free('a'), completedAt: daysAgo(4) }, { sessionId: 'p2', completedAt: daysAgo(1), unexpectedDifficulty: 'UNKNOWN' }])).toBe('hold');
  });
});
