/**
 * C4 — cohabitation multisport (TEST_ONLY) : la séance Cross-training COMPLÈTE (échauffement / retour au calme) ne
 * change ni la charge dérivée, ni l'arbitrage M3, ni les séances Strength / Running / HYROX de la semaine. Comparaison
 * stricte de la même semaine planifiée avec un port Cross-training C3 seul et avec C4 (mêmes ports par ailleurs).
 */
import { describe, expect, it } from 'vitest';
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import { crossTrainingPort, delegateStrengthBlock, STRENGTH_DELEGATION_MISSING_RULES } from '../../src/index.js';
import type { PlannedWeek, SportPort } from '../../src/index.js';
import { C3_INTENT, D, m3Ports, planM3 } from '../m3-fixtures.js';
import { CT_DOSE_NORMALIZATION } from '../ct-beta0.js';
import { clock, PROFILE, want } from '../fixtures.js';
import { withDemand } from '../simulation.js';
import { C3_REQUESTS, c3Governance } from '../../../crosstraining/tests/c3-fixtures.js';
import { ctxInput } from '../../../crosstraining/tests/fixtures.js';
import { ctCatalogDocument } from '../../../crosstraining/tests/c4-catalog.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';

function ctC4(): SportPort {
  return crossTrainingPort({
    engine: createCrossTrainingEngine({ governance: c3Governance({ hybrid: true, c4: true }), simulation: true }), content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog(ctCatalogDocument()) }, CT_DOSE_NORMALIZATION),
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

describe('C4.2 — délégation d’un bloc de force par le planificateur (S1 / A1)', () => {
  const sc = want('crosstraining', 1, { intent: { ...C3_INTENT, archetypeId: 'crosstraining.strength_plus_conditioning' } });
  it('5. stimulus force + conditionnement : besoin exprimé, délégation NON RÉSOLUE tracée (règles manquantes), aucune séance inventée', () => {
    const w = planM3([sc], { minutes: [75, 0, 0, 0, 0, 0, 0], ports: { ...m3Ports(), crosstraining: ctC4() } });
    const r = w.requests.find((x) => x.sport === 'crosstraining');
    expect(r?.status).not.toBe('planned');
    const d = r?.reasons.find((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATION_UNRESOLVED');
    expect(d?.params).toMatchObject({ requester: 'crosstraining', cause: 'STRENGTH_BLOCK_MODE_UNAVAILABLE', purpose: 'strength_before_conditioning' });
    expect(d?.params.missingRules).toEqual([...STRENGTH_DELEGATION_MISSING_RULES]);
  });
  it('6. même un port Strength déclarant un mode bloc ne suffit pas : règles de coordination encore manquantes (fail-closed)', () => {
    const o = delegateStrengthBlock({ requester: 'crosstraining', requestId: 'r', purpose: 'strength_before_conditioning' }, { composesIsolatedBlock: true });
    expect(o).toMatchObject({ status: 'UNRESOLVED', cause: 'DELEGATION_RULES_MISSING' });
    expect(o.reasons[0]?.params.missingRules).not.toContain('strength.blockMode');
  });
  it('7. séances sans besoin de force : aucune trace de délégation (pas de bloc de force systématique)', () => {
    const w = plan(true);
    expect(w.requests.flatMap((r) => r.reasons).some((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATION_UNRESOLVED')).toBe(false);
  });
});
