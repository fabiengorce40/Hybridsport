import { describe, expect, it } from 'vitest';
import { readHysteresis, readTolerances, deriveSafetyRestrictions } from '../../src/index.js';
import type { EvaluatedCandidate } from '../../src/index.js';
import { runJourney } from '../harness/adversarial.js';
import type { JourneyEvent } from '../harness/adversarial.js';
import { candidate } from '../fixtures/candidates.js';
import { testRuleset } from '../fixtures/load.js';
import { pain } from '../harness/requests.js';

const rs = testRuleset();
const eps = readTolerances(rs);
const hyst = readHysteresis(rs, eps);

describe('ADVERSARIAL ATHLETE JOURNEYS (infrastructure + premiers parcours)', () => {
  it('AJ02 — disponibilités alternées A, B, A, B… : aucune oscillation', () => {
    const planA = candidate('plan.A', { B1: 0.8, B3: 0.6 });
    const planB = candidate('plan.B', { B1: 0.82, B3: 0.62 }); // gain sous le seuil d'hystérésis
    const events: JourneyEvent<number>[] = Array.from({ length: 16 }, (_, i) => ({ name: `dispo-${i % 2 ? 'A' : 'B'}`, apply: (s) => ({ state: s + 1, proposal: i % 2 ? planA : planB }) }));
    const r = runJourney({ state: 0, plan: planA }, events, eps, hyst);
    expect(r.oscillations).toBe(0);
    expect(r.changes).toBe(0);
  });

  it('AJ13 — événements combinés : changements ≤ événements, aucune oscillation, sécurité jamais contournée', () => {
    const plans: EvaluatedCandidate[] = [
      candidate('p0', { B1: 0.5 }), candidate('p1-unsafe', { B1: 0.99 }, ['A1']), candidate('p2', { B1: 0.7 }),
      candidate('p3', { B1: 0.72 }), candidate('p4-infeasible', { B1: 1 }, ['A2']), candidate('p5', { B1: 0.9 }),
    ];
    const events: JourneyEvent<number>[] = plans.slice(1).map((p) => ({ name: p.id, apply: (s) => ({ state: s + 1, proposal: p }) }));
    const r = runJourney({ state: 0, plan: plans[0]! }, events, eps, hyst);
    expect(r.changes).toBeLessThanOrEqual(r.events);
    expect(r.oscillations).toBe(0);
    expect(r.history).not.toContain('p1-unsafe');
    expect(r.history).not.toContain('p4-infeasible');
    expect(r.history).toEqual(['p0', 'p2', 'p5']); // p3 : gain sous le seuil ⇒ conservé
  });

  it('AJ11 — douleur signalée, levée, puis signalée à nouveau : la restriction ne se lève jamais implicitement', () => {
    const reported = pain({ id: 'a', level: 'P2', bodyAreas: ['knee'] });
    const resolved = { ...reported, resolution: { declaredAt: reported.reportedAt, kind: 'resolved' as const } };
    const again = pain({ id: 'b', level: 'P2', bodyAreas: ['knee'] });
    expect(deriveSafetyRestrictions([reported], rs).areaRestrictions).toHaveLength(1);
    expect(deriveSafetyRestrictions([resolved], rs).areaRestrictions).toHaveLength(0);
    // Une levée sur un signalement ne lève pas un autre signalement actif.
    expect(deriveSafetyRestrictions([resolved, again], rs).areaRestrictions).toEqual([{ area: 'knee', action: 'exclude', painLevel: 'P2' }]);
  });
});
