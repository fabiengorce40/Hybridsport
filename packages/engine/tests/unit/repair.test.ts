import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { SessionDraft } from '@hybridsport/domain';
import { repairSession, validateSession } from '../../src/index.js';
import type { ValidationContext } from '../../src/index.js';
import { baseContext, deepFreeze, deps, presetEquipment } from '../fixtures/context.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

const d = deps();
const opts = { seed: 'repair-test' };
const exercisesOf = (s: SessionDraft) => s.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));

describe('RepairEngine', () => {
  it('matériel absent ⇒ substitution, séance valide, contexte et temps disponible inchangés', () => {
    const ctx = deepFreeze(baseContext({ availableEquipment: presetEquipment('preset.dumbbells_only') }));
    const snapshot = JSON.stringify(ctx);
    const out = repairSession(session(), ctx, d, opts);
    expect(out.result.status).toBe('ok');
    if (out.result.status !== 'ok') return;
    // Développé couché → haltères ; rowing haltère conservé ; écarté à la poulie → développé haltères (substitut faisable).
    expect(exercisesOf(out.result.value)).toEqual(['ex.hip_mobility_flow', 'ex.db_bench_press', 'ex.db_row', 'ex.db_bench_press']);
    expect(out.result.value.availableTimeS).toBe(2100);
    expect(JSON.stringify(ctx)).toBe(snapshot);
    expect(out.trace.traceId).toBe(out.result.trace.traceId);
    expect(out.trace.entries.some((e) => e.step === 'repair' && e.decision === 'replace_exercise')).toBe(true);
  });

  it('aucun substitut admissible ⇒ l’item est retiré (jamais une restriction levée)', () => {
    const ctx = baseContext({ excludedExercises: ['ex.cable_fly'], availableEquipment: presetEquipment('preset.commercial_gym').filter((e) => e !== 'dumbbells') });
    const out = repairSession(session(), ctx, d, opts);
    expect(out.result.status).toBe('ok');
    if (out.result.status === 'ok') expect(exercisesOf(out.result.value)).not.toContain('ex.cable_fly');
  });

  it('douleur qui retire l’objet de la séance ⇒ REST_RECOMMENDED (issue valide, pas une erreur)', () => {
    const ctx = baseContext({ areaRestrictions: ['shoulder', 'wrist_hand', 'elbow', 'lower_back', 'knee', 'hip_groin'].map((area) => ({ area, action: 'exclude' as const, painLevel: 'P3' })) });
    const s = session(strengthSessionInput({ blocks: [strengthSessionInput().blocks[1]!] }));
    const out = repairSession(s, ctx, d, opts);
    expect(out.result.status).toBe('rest_recommended');
    if (out.result.status === 'rest_recommended') expect(out.result.reasons[0]?.code).toBe('REPAIR.REST_RECOMMENDED');
  });

  it('une douleur qui retire tout le travail principal ⇒ REST_RECOMMENDED, jamais une séance réduite à l’échauffement', () => {
    const ctx = baseContext({ areaRestrictions: [{ area: 'shoulder', action: 'exclude', painLevel: 'P2' }] });
    const out = repairSession(session(), ctx, deps(), opts);
    expect(out.result.status).toBe('rest_recommended');
  });

  it('programme en pause ou hors périmètre ⇒ SAFETY_BLOCK / OUT_OF_SCOPE, aucune réparation', () => {
    const paused = repairSession(session(), baseContext({ programStatus: 'paused_safety' }), d, opts);
    expect(paused.result.status === 'error' && paused.result.error.code).toBe('SAFETY_BLOCK');
    expect(paused.attempts).toBe(0);
    const out = repairSession(session(), baseContext({ programStatus: 'suspended_scope', eligibility: 'suspended' }), d, opts);
    expect(out.result.status === 'error' && out.result.error.code).toBe('OUT_OF_SCOPE');
  });

  it('irréparable ⇒ erreur explicite, jamais une séance invalide publiée ; tentatives bornées', () => {
    const out = repairSession(session(strengthSessionInput({ availableTimeS: 700, targetDurationS: 500 })), baseContext(), d, opts);
    expect(out.result.status).toBe('error');
    if (out.result.status === 'error') expect(['NO_VALID_SOLUTION', 'REPAIR_EXHAUSTED']).toContain(out.result.error.code);
    expect(out.attempts).toBeLessThanOrEqual(d.ruleset.number('core.repair.maxAttemptsPerSession'));
  });

  it('la régénération (optionnelle) est appelée au plus une fois, avec les exercices fautifs exclus', () => {
    const calls: string[][] = [];
    const out = repairSession(session(strengthSessionInput({ availableTimeS: 700, targetDurationS: 500 })), baseContext(), d, {
      ...opts, regenerate: (excluded) => { calls.push([...excluded]); return null; },
    });
    expect(out.result.status).toBe('error');
    expect(calls.length).toBeLessThanOrEqual(1);
  });

  it('propriété : toute séance renvoyée « ok » est valide pour le contexte, sans toucher au temps disponible', () => {
    const presets = ['preset.commercial_gym', 'preset.box', 'preset.home_equipped', 'preset.dumbbells_only', 'preset.bodyweight', 'preset.hybrid_race_gym'];
    const tags = ['no_overhead', 'no_deep_knee_flexion', 'no_grip_intensive', 'no_loaded_spinal_flexion', 'no_impact'];
    fc.assert(fc.property(fc.constantFrom(...presets), fc.subarray(tags), fc.subarray(['ex.bench_press', 'ex.db_row', 'ex.cable_fly', 'ex.db_bench_press']), (preset, restrictions, excluded) => {
      const ctx: ValidationContext = baseContext({ availableEquipment: presetEquipment(preset), restrictions, excludedExercises: excluded });
      const out = repairSession(session(), ctx, d, opts);
      if (out.result.status === 'ok') {
        expect(out.result.value.availableTimeS).toBe(2100);
        expect(validateSession(out.result.value, ctx, d).report.status).not.toBe('INVALID');
        for (const id of exercisesOf(out.result.value)) expect(excluded).not.toContain(id);
      }
    }), { numRuns: 150 });
  });
});
