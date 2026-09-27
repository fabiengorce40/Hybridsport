/**
 * Contrôles HARD de la musculation (STR-V2 à V7), exécutés par le CORE : chaque contrôle est silencieux sur
 * les goldens et détecte une séance délibérément fautive (le moteur ne s'auto-valide jamais).
 */
import { describe, expect, it } from 'vitest';
import type { Level, SessionDraft, SetPrescription } from '@hybridsport/domain';
import type { CheckInput } from '@hybridsport/engine';
import { STRENGTH_CHECKS, STRENGTH_RULES } from '../../src/index.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { run, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';

const CATALOG = strengthCatalog();
const RULESET = strengthRuleset();
const golden = (k: string): SessionDraft => { const o = run((GOLDENS[k] as { scenario: Parameters<typeof run>[0] }).scenario); if (o.result.status !== 'ok') throw new Error(k); return o.result.value; };
const check = (id: string) => { const c = STRENGTH_CHECKS.find((x) => x.rule.id === id); if (!c) throw new Error(id); return c; };
const evaluate = (id: string, session: SessionDraft, level: Level) => check(id).evaluate({ session, ctx: { athleteLevel: level } as CheckInput['ctx'], catalog: CATALOG, ruleset: RULESET }).violations;
const mapSets = (s: SessionDraft, exerciseId: string, f: (sets: SetPrescription[]) => SetPrescription[], newId?: string): SessionDraft => ({
  ...s, blocks: s.blocks.map((b) => ({ ...b, items: b.items.map((it) => (it.exerciseId === exerciseId && it.prescription.type === 'sets' ? { ...it, ...(newId ? { exerciseId: newId } : {}), prescription: { type: 'sets' as const, sets: f([...it.prescription.sets]) } } : it)) })) as SessionDraft['blocks'],
});
const W = (o: Partial<SetPrescription>): SetPrescription => ({ kind: 'working', reps: 8, restAfterS: 90, ...o });

describe('contrôles strength exécutés par le CORE', () => {
  it('aucune violation sur les goldens S1–S7', () => {
    const levels: Record<string, Level> = { S1: 'beginner', S2: 'intermediate', S3: 'intermediate', S4: 'intermediate', S5: 'advanced', S6: 'intermediate', S7: 'intermediate' };
    for (const [k, level] of Object.entries(levels)) for (const c of STRENGTH_CHECKS) expect(evaluate(c.rule.id, golden(k), level), `${k} ${c.rule.id}`).toEqual([]);
  });

  it('STR-V2 plafond de séries par groupe et par séance (G1)', () => {
    const s = mapSets(golden('S5'), 'ex.leg_curl', () => Array.from({ length: 20 }, () => W({ reps: 12, intensity: { mode: 'effort', effort: { rir: 2 } } })));
    expect(evaluate(STRENGTH_RULES.sessionCap.id, s, 'advanced').map((v) => v.reason.params.detail).join()).toMatch(/hamstrings/);
  });

  it('STR-V3 cohérence % d’e1RM / répétitions (aucun 12 × 90 %)', () => {
    const s = mapSets(golden('S5'), 'ex.back_squat', (sets) => sets.map((x) => (x.kind === 'rampup' ? x : { ...x, reps: 12, intensity: { mode: 'percent_of_reference', fraction: 0.9, reference: 'e1rm', kgRounded: 150, effort: { rir: 2 } } })));
    expect(evaluate(STRENGTH_RULES.intensity.id, s, 'advanced').length).toBeGreaterThan(0);
  });

  it('STR-V4 montée en charge : jamais après une série de travail, jamais ≥ la charge de travail, jamais sur l’isolation', () => {
    const after = mapSets(golden('S5'), 'ex.back_squat', (sets) => [...sets, { kind: 'rampup', reps: 3, restAfterS: 60, intensity: { mode: 'load', kg: 60, certainty: 'prescribed' } }]);
    expect(evaluate(STRENGTH_RULES.rampup.id, after, 'advanced').map((v) => v.reason.params.detail)).toContain('montée en charge après une série de travail');
    const heavy = mapSets(golden('S5'), 'ex.back_squat', (sets) => sets.map((x) => (x.kind === 'rampup' ? { ...x, intensity: { mode: 'load', kg: 300, certainty: 'prescribed' } } : x)));
    expect(evaluate(STRENGTH_RULES.rampup.id, heavy, 'advanced').map((v) => v.reason.params.detail)).toContain('montée en charge ≥ charge de travail');
    const iso = mapSets(golden('S5'), 'ex.leg_curl', (sets) => [{ kind: 'rampup', reps: 8, restAfterS: 60, intensity: { mode: 'effort', effort: { rpe: 4 } } }, ...sets]);
    expect(evaluate(STRENGTH_RULES.rampup.id, iso, 'advanced').map((v) => v.reason.params.detail)).toContain('montée en charge sur un exercice d’isolation');
  });

  it('STR-V5 aucune charge prescrite sur un exercice non chargeable', () => {
    const s = mapSets(golden('S5'), 'ex.leg_curl', (sets) => sets.map((x) => ({ ...x, intensity: { mode: 'load', kg: 20, certainty: 'prescribed' } })), 'ex.push_up');
    expect(evaluate(STRENGTH_RULES.loadMode.id, s, 'advanced').length).toBeGreaterThan(0);
  });

  it('STR-V6 novice / débutant : au plus un exercice technique, jamais hors du travail principal', () => {
    const s = mapSets(golden('S1'), 'ex.db_row', (sets) => sets, 'ex.barbell_ohp');
    const v = evaluate(STRENGTH_RULES.noviceTechnical.id, mapSets(s, 'ex.goblet_squat', (sets) => sets, 'ex.back_squat'), 'beginner');
    expect(v.map((x) => x.reason.params.detail).join()).toMatch(/techniques|hors du travail principal/);
    expect(evaluate(STRENGTH_RULES.noviceTechnical.id, s, 'intermediate')).toEqual([]);
  });

  it('STR-V7 effort maximal réservé aux exercices et niveaux éligibles (G1)', () => {
    const s = mapSets(golden('S5'), 'ex.back_squat', (sets) => sets, 'ex.leg_press');
    expect(evaluate(STRENGTH_RULES.maxEffort.id, s, 'advanced').length).toBeGreaterThan(0);
    expect(evaluate(STRENGTH_RULES.maxEffort.id, golden('S5'), 'beginner').length).toBeGreaterThan(0);
  });
});
