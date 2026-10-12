/**
 * C4.3 — délégation d'un bloc de force Strength → planificateur → Cross-training → CORE (TEST_ONLY). Strength reste
 * propriétaire de la prescription ; le planificateur coordonne (budget, structures protégées, matériel, volume
 * hebdomadaire) ; le CORE valide la séance assemblée. Aucune séance n'est fusionnée, aucune prescription inventée.
 */
import { describe, expect, it } from 'vitest';
import type { CoreProfile } from '@hybridsport/engine';
import { createCrossTrainingEngine } from '@hybridsport/crosstraining';
import { StrengthEngine } from '@hybridsport/strength';
import { crossTrainingPort, strengthPort } from '../../src/index.js';
import type { PlannedWeek, SportPort, StrengthBlockRule } from '../../src/index.js';
import { C3_INTENT, D, m3Ports, planM3 } from '../m3-fixtures.js';
import { CT_DOSE_NORMALIZATION, CT_STRENGTH_BLOCK_RULE } from '../ct-beta0.js';
import { clock, PROFILE, strengthBase, want } from '../fixtures.js';
import { withDemand } from '../simulation.js';
import { strengthContent } from '../../../app-core/src/provisional-content.js';
import { C3_REQUESTS, c3Governance } from '../../../crosstraining/tests/c3-fixtures.js';
import { ctxInput } from '../../../crosstraining/tests/fixtures.js';
import { ctCatalogDocument } from '../../../crosstraining/tests/c4-catalog.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { testRulesetDocumentWithDuplicate } from '../../../engine/tests/fixtures/ruleset.js';
import { presetEquipment } from '../../../engine/tests/fixtures/context.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';

type Captured = { readonly week: { readonly otherStrengthSessions: readonly { intentId: string; plannedHardSets: Record<string, number> }[] } };
function ports(o: { profile?: CoreProfile; rule?: StrengthBlockRule; captured?: Captured[] } = {}): { ct: SportPort; strength: SportPort } {
  const profile = o.profile ?? PROFILE;
  const engine = o.captured ? { ...StrengthEngine, propose: (i: Parameters<typeof StrengthEngine.propose>[0]) => { o.captured?.push(i.discipline as unknown as Captured); return StrengthEngine.propose(i); } } : StrengthEngine;
  const block = strengthPort({ engine: StrengthEngine as never, content: withDemand(strengthContent()), profile, state: STATE_FRESH, history: [], clock, baseContext: { ...strengthBase(), goal: { primary: { goal: 'support', supportFor: 'crosstraining' } }, blockMode: { host: 'crosstraining' } } });
  const ct = crossTrainingPort({
    engine: createCrossTrainingEngine({ governance: c3Governance({ hybrid: true, c4: true }), simulation: true }), content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog(ctCatalogDocument()) }, CT_DOSE_NORMALIZATION),
    profile, state: STATE_FRESH, history: [], clock, baseContext: ctxInput({ capabilityRequests: [...C3_REQUESTS, 'ctFullSessionComposition'] }), transportNeighbours: true,
    strengthBlocks: { port: block, rule: o.rule ?? CT_STRENGTH_BLOCK_RULE },
  });
  const strength = strengthPort({ engine: engine as never, content: withDemand(strengthContent()), profile, state: STATE_FRESH, history: [], clock, baseContext: strengthBase() });
  return { ct, strength };
}
const SC = want('crosstraining', 1, { intent: { ...C3_INTENT, archetypeId: 'crosstraining.strength_plus_conditioning' } });
const ctOf = (w: PlannedWeek) => w.requests.find((r) => r.sport === 'crosstraining');
const plan = (o: Parameters<typeof ports>[0] = {}, minutes = [75, 0, 0, 0, 0, 0, 0], demands = [SC]) => {
  const p = ports(o);
  return planM3(demands, { minutes, ports: { ...m3Ports(), crosstraining: p.ct, strength: p.strength } });
};

describe('C4.3 — délégation Strength → planificateur → Cross-training → CORE', () => {
  it('1. séance assemblée : échauffement général → force → préparation du WOD → WOD → retour au calme', () => {
    const r = ctOf(plan());
    expect(r?.status).toBe('planned');
    if (r?.status !== 'planned') return;
    const ids = r.session.blocks.map((b) => b.id.split('.').slice(-2).join('.'));
    const iS = ids.indexOf('c4.strength');
    const iC = r.session.blocks.findIndex((b) => b.kind === 'conditioning');
    expect(ids[0]).toBe('c4.warmup_general');
    expect(iS).toBeGreaterThan(0);
    expect(iS).toBeLessThan(iC);
    for (const [k, id] of ids.entries()) if (id === 'c4.warmup_specific' || id === 'c4.warmup_buildups') { expect(k).toBeGreaterThan(iS); expect(k).toBeLessThan(iC); }
    expect(r.session.blocks.at(-1)?.kind).toBe('cooldown');
    // Une seule séance (aucune fusion de deux séances) : un seul bloc de conditionnement, un seul bloc de force.
    expect(r.session.blocks.filter((b) => b.kind === 'strength')).toHaveLength(1);
  });

  it('2. provenance : bloc Strength transporté tel quel, règle et séance Strength tracées, décisions Strength jointes', () => {
    const r = ctOf(plan());
    if (r?.status !== 'planned') throw new Error('séance attendue');
    const d = r.reasons.find((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATED');
    expect(d?.params).toMatchObject({ requester: 'crosstraining', ruleId: CT_STRENGTH_BLOCK_RULE.ruleId, archetypeId: 'str_ct_block' });
    const strengthItems = r.session.blocks.filter((b) => b.kind === 'strength').flatMap((b) => b.items);
    expect(strengthItems.map((i) => i.exerciseId)).toEqual(d?.params.exercises);
    // Prescription de Strength : séries (montée + travail), repos et intensité présents, aucune charge inventée.
    for (const it of strengthItems) {
      expect(it.prescription.type).toBe('sets');
      if (it.prescription.type !== 'sets') continue;
      expect(it.prescription.sets.some((x) => x.kind === 'working')).toBe(true);
      expect(it.prescription.sets.every((x) => x.restAfterS !== undefined && x.intensity !== undefined)).toBe(true);
      expect(it.refs?.slotId).toMatch(/^ctb\./);
      expect(it.refs?.progressionTrackId).toBeUndefined();
    }
    expect(r.reasons.some((x) => x.code === 'SELECT.CHOICE_GROUP')).toBe(true);
    expect(r.reasons.find((x) => x.code === 'PLAN.CROSSTRAINING.C4_BLOCK' && x.params.block === 'strength')?.params.criteria).toContain('owner:strength');
  });

  it('3. durée : bloc dans le budget du besoin, séance assemblée ≤ temps disponible (estimation du CORE)', () => {
    for (const min of [45, 60, 75]) {
      const r = ctOf(plan({}, [min, 0, 0, 0, 0, 0, 0]));
      if (r?.status !== 'planned') { expect(r?.reasons.some((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATION_UNRESOLVED' || x.code === 'PLAN.PLANNER.ENGINE_REFUSED')).toBe(true); continue; }
      const d = r.reasons.find((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATED');
      expect(Number(d?.params.durationS)).toBeLessThanOrEqual(1200);
      const est = r.record.durationEstimate;
      expect(est.availability).toBe('AVAILABLE');
      if (est.availability === 'AVAILABLE') expect(est.p90).toBeLessThanOrEqual(min * 60);
    }
  });

  it('4. matériel déclaré : chaque exercice délégué est RÉALISABLE avec le matériel de l’athlète (haltères seuls, poids du corps)', () => {
    const cat = testCatalog(ctCatalogDocument());
    let planned = 0;
    for (const preset of ['preset.dumbbells_only', 'preset.bodyweight', 'preset.home_equipped']) {
      const profile = { ...PROFILE, availableEquipment: presetEquipment(preset) };
      const r = ctOf(plan({ profile }));
      if (r?.status !== 'planned') { expect(r?.reasons.some((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATION_UNRESOLVED' || x.code === 'PLAN.PLANNER.ENGINE_REFUSED'), preset).toBe(true); continue; }
      planned += 1;
      const owned = new Set(profile.availableEquipment);
      for (const it of r.session.blocks.flatMap((b) => b.items)) {
        const e = cat.exercise(it.exerciseId);
        expect(e && cat.isFeasibleWith(e, owned), `${preset}:${it.exerciseId}`).toBe(true);
      }
      expect(r.session.blocks.flatMap((b) => b.items).map((i) => i.exerciseId)).not.toContain('ex.hack_squat');
    }
    expect(planned).toBeGreaterThan(0);
  });
  it('4b. garde du planificateur : exercice délégué irréalisable avec le matériel ⇒ délégation NON RÉSOLUE (aucune séance)', () => {
    // Port Strength de bloc qui IGNORE le matériel de l'athlète (profil salle complète) ; port hôte : haltères seulement.
    const db = { ...PROFILE, availableEquipment: presetEquipment('preset.dumbbells_only') };
    const block = strengthPort({ engine: StrengthEngine as never, content: withDemand(strengthContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: { ...strengthBase(), goal: { primary: { goal: 'support', supportFor: 'crosstraining' } }, blockMode: { host: 'crosstraining' } } });
    const ct = crossTrainingPort({
      engine: createCrossTrainingEngine({ governance: c3Governance({ hybrid: true, c4: true }), simulation: true }), content: withDemand({ ruleset: testRuleset(testRulesetDocumentWithDuplicate()), catalog: testCatalog(ctCatalogDocument()) }, CT_DOSE_NORMALIZATION),
      profile: db, state: STATE_FRESH, history: [], clock, baseContext: ctxInput({ capabilityRequests: [...C3_REQUESTS, 'ctFullSessionComposition'] }), transportNeighbours: true,
      strengthBlocks: { port: block, rule: CT_STRENGTH_BLOCK_RULE },
    });
    const r = ctOf(planM3([SC], { minutes: [75, 0, 0, 0, 0, 0, 0], ports: { ...m3Ports(), crosstraining: ct } }));
    expect(r?.status).not.toBe('planned');
    expect(String(r?.reasons.find((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATION_UNRESOLVED')?.params.cause)).toMatch(/^STRENGTH_BLOCK_EQUIPMENT_UNAVAILABLE:/);
  });

  it('5. interférence intra-séance : structures protégées par le bloc ⇒ aucun mouvement de conditionnement ne les sollicite', () => {
    const strict: StrengthBlockRule = { ...CT_STRENGTH_BLOCK_RULE, ruleId: 'test.strict', excludeConditioningAtLevels: ['low', 'moderate', 'high'] };
    const r = ctOf(plan({ rule: strict }));
    if (r?.status !== 'planned') { expect(r?.reasons.some((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATION_UNRESOLVED')).toBe(true); return; }
    const protectedS = r.reasons.find((x) => x.code === 'PLAN.PLANNER.STRENGTH_DELEGATED')?.params.protectedStructures as string[];
    expect(protectedS.length).toBeGreaterThan(0);
    const p = ports();
    const main = r.session.blocks.filter((b) => b.kind === 'conditioning');
    const s = p.ct.structures({ ...r.session, blocks: main });
    if (s.ok) for (const x of protectedS) expect(s.structures).not.toContain(x);
  });

  it('6. volume hebdomadaire : les séances Strength voient le bloc (séries PRÉVUES), une seule fois, sans track ni ancre', () => {
    const captured: Captured[] = [];
    const p = ports({ captured });
    const w = planM3([SC, D.strength(1)], { minutes: [75, 0, 60, 0, 0, 0, 0], ports: { ...m3Ports(), crosstraining: p.ct, strength: p.strength } });
    expect(ctOf(w)?.status).toBe('planned');
    const seen = captured.map((c) => c.week.otherStrengthSessions.filter((x) => x.intentId.includes('crosstraining')));
    expect(seen.some((x) => x.length === 1)).toBe(true);
    expect(seen.every((x) => x.length <= 1)).toBe(true);
    const sets = seen.find((x) => x.length === 1)?.[0]?.plannedHardSets ?? {};
    expect(Object.values(sets).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('7. stimulus sans besoin de force (mixte) : aucune sollicitation de Strength, séance inchangée', () => {
    const r = ctOf(plan({}, [60, 0, 0, 0, 0, 0, 0], [D.ct(1)]));
    expect(r?.status).toBe('planned');
    expect(r?.reasons.some((x) => /STRENGTH_DELEGAT/.test(x.code))).toBe(false);
    if (r?.status === 'planned') expect(r.session.blocks.some((b) => b.kind === 'strength')).toBe(false);
  });
});
