/**
 * C4 — cohabitation multisport (TEST_ONLY) : la séance Cross-training COMPLÈTE (échauffement / retour au calme) ne
 * change ni la charge dérivée, ni l'arbitrage M3, ni les séances Strength / Running / HYROX de la semaine. Comparaison
 * stricte de la même semaine planifiée avec un port Cross-training C3 seul et avec C4 (mêmes ports par ailleurs).
 */
import { describe, expect, it } from 'vitest';
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import { crossTrainingPort } from '../../src/index.js';
import type { PlannedWeek, SportPort } from '../../src/index.js';
import { D, m3Ports, planM3 } from '../m3-fixtures.js';
import { CT_DOSE_NORMALIZATION } from '../ct-beta0.js';
import { clock, PROFILE } from '../fixtures.js';
import { withDemand } from '../simulation.js';
import { C3_REQUESTS, c3Governance } from '../../../crosstraining/tests/c3-fixtures.js';
import { ctxInput } from '../../../crosstraining/tests/fixtures.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';

function ctC4(): SportPort {
  return crossTrainingPort({
    engine: createCrossTrainingEngine({ governance: c3Governance({ hybrid: true, c4: true }), simulation: true }), content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog() }, CT_DOSE_NORMALIZATION),
    profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: ctxInput({ capabilityRequests: [...C3_REQUESTS, 'ctFullSessionComposition'] }), transportNeighbours: true,
  });
}
const DEMANDS = [D.strength(2), D.running(2), D.ct(2), D.hyrox(1)];
const MIN = [60, 60, 60, 60, 60, 75, 45];
const plan = (c4: boolean): PlannedWeek => planM3(DEMANDS, { minutes: MIN, ports: { ...m3Ports(), ...(c4 ? { crosstraining: ctC4() } : {}) } });
const main = (r: PlannedWeek['requests'][number]) => (r.status === 'planned' ? r.session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown') : []);

describe('C4 — cohabitation Strength / Running / HYROX', () => {
  const a = plan(false);
  const b = plan(true);
  it('1. mêmes placements (sport, jour, statut) et mêmes décisions M3', () => {
    expect(b.requests.map((r) => [r.requestId, r.status, r.status === 'planned' ? r.date : null])).toEqual(a.requests.map((r) => [r.requestId, r.status, r.status === 'planned' ? r.date : null]));
    expect(b.arbitration?.decisions ?? null).toEqual(a.arbitration?.decisions ?? null);
  });
  it('2. séances des autres sports STRICTEMENT identiques ; bloc principal Cross-training identique', () => {
    for (const r of a.requests) {
      const o = b.requests.find((x) => x.requestId === r.requestId);
      if (!o || r.status !== 'planned' || o.status !== 'planned') continue;
      if (r.sport === 'crosstraining') expect(main(o)).toEqual(main(r));
      else expect(o.session).toEqual(r.session);
    }
  });
  it('3. charge dérivée inchangée : échauffement / retour au calme exclus de la demande (règle CORE existante)', () => {
    for (const r of a.requests.filter((x) => x.sport === 'crosstraining' && x.status === 'planned')) {
      const o = b.requests.find((x) => x.requestId === r.requestId);
      if (r.status !== 'planned' || o?.status !== 'planned') continue;
      expect(o.demand).toEqual(r.demand);
    }
  });
  it('4. au moins une séance Cross-training complète (statut C4 tracé et persisté)', () => {
    const ct = b.requests.filter((r) => r.sport === 'crosstraining' && r.status === 'planned');
    expect(ct.length).toBeGreaterThan(0);
    const statuses = ct.map((r) => r.reasons.find((x) => x.code === 'PLAN.CROSSTRAINING.C4_SESSION_STATUS')?.params.status);
    expect(statuses.every((s) => typeof s === 'string')).toBe(true);
    expect(statuses).toContain('FULL_SESSION');
  });
});
