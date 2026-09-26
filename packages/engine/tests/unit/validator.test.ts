import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { validateSession } from '../../src/index.js';
import { baseContext, deps, presetEquipment } from '../fixtures/context.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';
import { testRuleset } from '../fixtures/load.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

const d = deps();
const codes = (r: ReturnType<typeof validateSession>) => r.report.errors.map((e) => e.reason.code);

describe('SessionValidator', () => {
  it('séance conforme ⇒ VALID, versions et règles évaluées renseignées', () => {
    const r = validateSession(session(), baseContext(), d);
    expect(r.report.status).toBe('VALID');
    expect(r.report).toMatchObject({ rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test' });
    expect(r.report.rulesEvaluated.length).toBe(11);
    expect(r.estimate?.p50).toBe(1780);
  });

  it('entrée malformée ⇒ INVALID TECHNICAL, jamais d’exception (y compris NaN et champ inconnu)', () => {
    for (const bad of [null, 42, {}, { ...strengthSessionInput(), availableTimeS: Number.NaN }, { ...strengthSessionInput(), structures: { lower_knee: 'high' } }]) {
      const r = validateSession(bad, baseContext(), d);
      expect(r.report.status).toBe('INVALID');
      expect(r.report.errors.every((e) => e.nature === 'TECHNICAL' && e.layer === 'A4')).toBe(true);
    }
  });

  it('fuzz : aucune entrée arbitraire ne fait planter le validateur', () => {
    fc.assert(fc.property(fc.anything(), (x) => {
      expect(['VALID', 'VALID_WITH_WARNINGS', 'INVALID']).toContain(validateSession(x, baseContext(), d).report.status);
    }), { numRuns: 300 });
  });

  it('A1 : restriction déclarée ⇒ INVALID + substituts admissibles proposés', () => {
    const r = validateSession(session(), baseContext({ restrictions: ['no_overhead'], excludedExercises: [] }), d);
    expect(r.report.status).toBe('VALID'); // aucun exercice de la séance n'est contre-indiqué
    const r2 = validateSession(session(strengthSessionInput({ blocks: [strengthSessionInput().blocks[0]!, { id: 'b', kind: 'strength', role: 'primary', format: 'sets', grouping: 'straight', items: [{ id: 'i.sq', exerciseId: 'ex.back_squat', prescription: { type: 'sets', sets: [{ kind: 'working', reps: 5, restAfterS: 120 }] } }] }] })), baseContext({ restrictions: ['no_deep_knee_flexion'] }), d);
    expect(r2.report.errors[0]).toMatchObject({ layer: 'A1', nature: 'SAFETY', reason: { code: 'SAFETY.RESTRICTION_VIOLATED', category: 'safety' } });
    expect(r2.report.repairSuggestions).toContainEqual({ kind: 'replace_exercise', itemId: 'i.sq', candidates: ['ex.leg_press'] });
  });

  it('A2 : matériel absent et exclusion utilisateur ⇒ FEASIBILITY / PREFERENCE, distincts de SAFETY', () => {
    const r = validateSession(session(), baseContext({ availableEquipment: presetEquipment('preset.dumbbells_only'), excludedExercises: ['ex.db_row'] }), d);
    expect(r.report.status).toBe('INVALID');
    expect(r.report.errors.map((e) => [e.layer, e.nature, e.reason.category])).toEqual(expect.arrayContaining([
      ['A2', 'FEASIBILITY', 'feasibility'], ['A2', 'PREFERENCE', 'feasibility'],
    ]));
    expect(r.report.repairSuggestions).toContainEqual({ kind: 'replace_exercise', itemId: 'i.bench', candidates: ['ex.db_bench_press'] });
  });

  it('A2 : p90 au-delà du temps disponible ⇒ FEASIBILITY.TIME_EXCEEDED + compression proposée', () => {
    const r = validateSession(session(strengthSessionInput({ availableTimeS: 1900, targetDurationS: 1540 })), baseContext(), d);
    expect(codes(r)).toEqual(['FEASIBILITY.TIME_EXCEEDED']);
    expect(r.report.repairSuggestions).toContainEqual({ kind: 'compress_duration' });
  });

  it('statut du programme : paused_safety et suspended_scope bloquent toute séance', () => {
    expect(codes(validateSession(session(), baseContext({ programStatus: 'paused_safety' }), d))).toEqual(['SAFETY.PROGRAM_PAUSED']);
    expect(codes(validateSession(session(), baseContext({ programStatus: 'suspended_scope', eligibility: 'excluded' }), d))).toEqual(['SCOPE.OUT_OF_SCOPE']);
  });

  it('A3 : récupération minimale via la politique contextuelle (HARD par défaut, SOFT pour un avancé)', () => {
    const squat = session(strengthSessionInput({ blocks: [{ id: 'b', kind: 'strength', role: 'primary', format: 'sets', grouping: 'straight', items: [{ id: 'i', exerciseId: 'ex.back_squat', prescription: { type: 'sets', sets: [1, 2, 3, 4, 5].map(() => ({ kind: 'working' as const, reps: 5, restAfterS: 120 })) } }] }] }));
    const recovery = { neighbors: [{ structure: 'lower_knee', level: 'high' as const, hoursBefore: 20 }], items: [{ exerciseId: 'ex.back_squat', doseUnits: 7, intensityBand: 'high' }], enforcement: { dataQuality: 'adequate' as const } };
    const hard = validateSession(squat, baseContext({ recovery }), d);
    expect(hard.report.errors[0]).toMatchObject({ layer: 'A3', reason: { code: 'RECOVERY.MIN_GAP_VIOLATION', category: 'business_hard', params: { requiredHours: 48 } } });
    const soft = validateSession(squat, baseContext({ athleteLevel: 'advanced', recovery }), d);
    expect(soft.report.status).toBe('VALID_WITH_WARNINGS');
    expect(soft.report.warnings[0]?.reason.category).toBe('business_soft');
    const sparse = validateSession(squat, baseContext({ athleteLevel: 'advanced', recovery: { ...recovery, enforcement: { dataQuality: 'sparse' } } }), d);
    expect(sparse.report.status).toBe('INVALID'); // données plus pauvres ⇒ jamais plus permissif
  });

  it('les violations sont ordonnées A1 → A4 et les catégories restent distinctes', () => {
    const input = strengthSessionInput();
    const withUnknown = { ...input, blocks: [...input.blocks, { id: 'b.x', kind: 'accessory' as const, role: 'support' as const, format: 'continuous' as const, items: [{ id: 'i.x', exerciseId: 'ex.inconnu', prescription: { type: 'hold' as const, seconds: 30 } }] }] };
    const r = validateSession(session(withUnknown), baseContext({ programStatus: 'paused_safety', availableEquipment: [] }), d);
    const layers = r.report.errors.map((e) => e.layer);
    expect([...layers].sort()).toEqual(layers);
    expect(new Set(r.report.errors.map((e) => e.reason.category))).toEqual(new Set(['safety', 'feasibility', 'technical']));
  });

  it('fail-closed : un contrôle sans fiche dans le ruleset rend la validation INVALID', () => {
    const base = testRulesetDocument();
    const rs = testRuleset({ ...base, rules: base.rules.filter((r) => r.id !== 'core.safety.pain_area') });
    const r = validateSession(session(), baseContext(), { ...d, ruleset: rs });
    expect(r.report.status).toBe('INVALID');
    expect(r.report.errors[0]?.nature).toBe('TECHNICAL');
  });

  it('fail-closed : un paramètre manquant ne fait jamais passer une séance', () => {
    const base = testRulesetDocument();
    const rs = testRuleset({ ...base, parameters: base.parameters.filter((p) => p.id !== 'duration.toleranceProfiles').concat([param('x.unused', 1, 'G3')]) });
    expect(validateSession(session(), baseContext(), { ...d, ruleset: rs }).report.status).toBe('INVALID');
  });
});
