/**
 * Phase 6A — CORE-EXT-R1 : propriétés et cas adversariaux de la séance structurée à profondeur fixe.
 * Valeurs générées : données de test, jamais des prescriptions.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { executionSteps, runStructureIssues, segmentStepCount, zRunStructure, zSessionDraft } from '@hybridsport/domain';
import type { RunSegment, RunStructure, RunTarget } from '@hybridsport/domain';
import { canonicalStringify, checkRunEstimate, deriveRunEstimate, migrateToCurrent, toEnvelope, validateSession, withDerivedEstimate } from '../../src/index.js';
import { baseContext, deps } from '../fixtures/context.js';

const prov = { source: 'observed_athlete_range', sourceId: 'obs.test' } as const;
const pos = fc.integer({ min: 1, max: 1200 });
const paceArb = fc.tuple(fc.integer({ min: 120, max: 600 }), fc.integer({ min: 0, max: 120 })).map(([min, w]) => ({ secPerKm: { min, max: min + w }, provenance: prov }));
const targetArb = fc.oneof(
  fc.constant({ domain: 'moderate', effort: { rpe: { min: 3, max: 4 } }, priority: 'effort' } as const),
  paceArb.map((pace) => ({ domain: 'heavy', pace, priority: 'pace' }) as const),
);
/** Dose cohérente avec la cible (une distance seulement si la cible porte une allure). */
const doseFor = (t: RunTarget) => (t.pace ? fc.oneof(pos.map((durationS) => ({ durationS })), pos.map((distanceM) => ({ distanceM }))) : pos.map((durationS) => ({ durationS })));
const recArb = fc.record({ dose: pos.map((durationS) => ({ durationS })), mode: fc.constantFrom('standing', 'walk', 'jog') });

const repeatArb = (id: string) => targetArb.chain((target) => fc.record({
  kind: fc.constant('repeat' as const), id: fc.constant(id), sets: fc.integer({ min: 1, max: 4 }), reps: fc.integer({ min: 1, max: 8 }),
  work: doseFor(target), target: fc.constant(target), recovery: recArb, between: recArb,
}).map(({ between, ...s }) => (s.sets > 1 ? { ...s, betweenSetRecovery: between } : s) as RunSegment));
const simpleArb = (kind: 'warmup' | 'steady' | 'cooldown', id: string) => targetArb.chain((target) => doseFor(target).map((dose) => ({ kind, id, dose, target }) as RunSegment));

const structureArb: fc.Arbitrary<readonly RunSegment[]> = fc.record({
  wu: fc.option(simpleArb('warmup', 'wu'), { nil: undefined }),
  body: fc.array(fc.oneof(repeatArb('r'), simpleArb('steady', 's')), { minLength: 1, maxLength: 4 }),
  cd: fc.option(simpleArb('cooldown', 'cd'), { nil: undefined }),
}).map(({ wu, body, cd }) => [...(wu ? [wu] : []), ...body.map((s, i) => ({ ...s, id: `${s.id}${String(i)}` })), ...(cd ? [cd] : [])]);

const derive = (segments: readonly RunSegment[]): RunStructure => {
  const p = withDerivedEstimate({ type: 'run_structure', segments: [...segments] });
  if (!p) throw new Error('non dérivable');
  return p;
};

describe('CORE-EXT-R1 — propriétés', () => {
  it('toute structure générée est valide et dérivable ; durée ≥ 0 ; min ≤ max ; travail ≤ total', () => {
    fc.assert(fc.property(structureArb, (segs) => {
      expect(runStructureIssues({ segments: [...segs] })).toEqual([]);
      const p = derive(segs);
      expect(p.estimate.totalS.min).toBeGreaterThanOrEqual(0);
      expect(p.estimate.totalS.min).toBeLessThanOrEqual(p.estimate.totalS.max);
      expect(p.estimate.workS.min).toBeLessThanOrEqual(p.estimate.workS.max);
      expect(p.estimate.workS.max).toBeLessThanOrEqual(p.estimate.totalS.max);
      expect(checkRunEstimate(p)).toEqual({ consistent: true });
    }), { numRuns: 300 });
  });

  it('ajouter une répétition, une série ou allonger une récupération ne réduit jamais la durée', () => {
    fc.assert(fc.property(structureArb, fc.integer({ min: 1, max: 300 }), (segs, extra) => {
      const base = derive(segs).estimate.totalS;
      const grow = (f: (s: Extract<RunSegment, { kind: 'repeat' }>) => RunSegment) => derive(segs.map((s) => (s.kind === 'repeat' ? f(s) : s))).estimate.totalS;
      const variants = [
        grow((s) => ({ ...s, reps: s.reps + 1 })),
        grow((s) => ({ ...s, sets: s.sets + 1, betweenSetRecovery: s.betweenSetRecovery ?? { dose: { durationS: extra }, mode: 'walk' } })),
        grow((s) => ({ ...s, recovery: { ...s.recovery, dose: { durationS: ('durationS' in s.recovery.dose ? s.recovery.dose.durationS : 0) + extra } } })),
      ];
      for (const v of variants) { expect(v.min).toBeGreaterThanOrEqual(base.min); expect(v.max).toBeGreaterThanOrEqual(base.max); }
    }), { numRuns: 200 });
  });

  it('aller-retour JSON : égalité sémantique, estimation identique, toujours valide ; déterminisme', () => {
    fc.assert(fc.property(structureArb, (segs) => {
      const p = derive(segs);
      const back = zRunStructure.parse(JSON.parse(JSON.stringify(p)));
      expect(canonicalStringify(back)).toBe(canonicalStringify(p));
      expect(checkRunEstimate(back)).toEqual({ consistent: true });
      expect(canonicalStringify(deriveRunEstimate(back))).toBe(canonicalStringify(deriveRunEstimate(p)));
      expect(canonicalStringify(executionSteps(back))).toBe(canonicalStringify(executionSteps(p)));
    }), { numRuns: 200 });
  });

  it('nombre d’étapes d’exécution = somme des comptages par segment ; clés uniques', () => {
    fc.assert(fc.property(structureArb, (segs) => {
      const st = executionSteps({ segments: [...segs] });
      expect(st.length).toBe(segs.reduce((n, s) => n + segmentStepCount(s), 0));
      expect(new Set(st.map((s) => s.key)).size).toBe(st.length);
    }), { numRuns: 200 });
  });

  it('une provenance invalide ne devient jamais valide par sérialisation (schéma, enveloppe, validateur)', () => {
    fc.assert(fc.property(structureArb.filter((segs) => segs.some((s) => s.target.pace)), (segs) => {
      const p = derive(segs);
      const stripped = JSON.parse(JSON.stringify(p, (k, v: unknown) => (k === 'provenance' ? undefined : v))) as unknown;
      const r1 = zRunStructure.safeParse(stripped);
      expect(r1.success).toBe(false);
      const r2 = zRunStructure.safeParse(JSON.parse(JSON.stringify(stripped)));
      expect(r2.success).toBe(false);
      const session = { id: 's', discipline: 'running', athleteLevel: 'intermediate', availableTimeS: 90000, targetDurationS: 3600, toleranceProfile: 'strength_sets', blocks: [{ id: 'b', kind: 'running', role: 'primary', format: 'continuous', items: [{ id: 'i', exerciseId: 'ex.easy_run', prescription: stripped }] }] };
      const v = validateSession(session, baseContext(), deps());
      expect(v.report.errors.map((e) => e.reason.code)).toContain('TECHNICAL.STRUCTURE.PACE_WITHOUT_PROVENANCE');
      const env = { kind: 'session_record', schemaVersion: 4, data: { session, provenance: { engineVersion: '0.1.0', rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 'x', traceId: 't0123456789abcdef' }, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' }, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } } };
      const m = migrateToCurrent(JSON.parse(JSON.stringify(env)));
      expect(!m.ok && m.reasons.map((x) => x.code)).toContain('TECHNICAL.STRUCTURE.PACE_WITHOUT_PROVENANCE');
    }), { numRuns: 100 });
  });

  it('une distance sans allure n’est jamais rendue valide par un recalcul', () => {
    fc.assert(fc.property(pos, pos, (distanceM, durationS) => {
      const segs = [{ kind: 'repeat', id: 'r', sets: 1, reps: 2, work: { distanceM }, target: { domain: 'moderate', effort: { rpe: { min: 3, max: 4 } }, priority: 'effort' }, recovery: { dose: { durationS }, mode: 'jog' } }] as RunSegment[];
      expect(deriveRunEstimate({ segments: segs }).ok).toBe(false);
      expect(runStructureIssues({ segments: segs }).map((i) => i.code)).toContain('DISTANCE_WITHOUT_PACE');
    }), { numRuns: 100 });
  });
});

describe('CORE-EXT-R1 — adversarial', () => {
  const run = (prescription: unknown) => ({ id: 's', discipline: 'running', athleteLevel: 'intermediate', availableTimeS: 90000, targetDurationS: 3600, toleranceProfile: 'strength_sets', blocks: [{ id: 'b', kind: 'running', role: 'primary', format: 'continuous', items: [{ id: 'i', exerciseId: 'ex.easy_run', prescription }] }] });
  const ok = derive([{ kind: 'repeat', id: 'r', sets: 1, reps: 3, work: { durationS: 60 }, target: { domain: 'heavy', effort: { rpe: { min: 5, max: 6 } }, priority: 'effort' }, recovery: { dose: { durationS: 60 }, mode: 'jog' } }]);

  it('valeurs non finies, types faux, champs inconnus, méthode d’estimation inconnue ⇒ INVALID, jamais d’exception', () => {
    const bads: unknown[] = [
      { ...ok, estimate: { ...ok.estimate, method: 'other' } },
      { ...ok, estimate: { ...ok.estimate, methodVersion: 2 } },
      { ...ok, estimate: { ...ok.estimate, unit: 'min' } },
      { ...ok, estimate: undefined },
      { ...ok, extra: true },
      { ...ok, segments: [{ ...ok.segments[0]!, reps: Number.POSITIVE_INFINITY }] },
      { ...ok, segments: [{ ...ok.segments[0]!, reps: Number.NaN }] },
      { ...ok, segments: [{ ...ok.segments[0]!, reps: '3' }] },
      { ...ok, segments: 'x' },
      { ...ok, segments: [null] },
    ];
    for (const b of bads) expect(validateSession(run(b), baseContext(), deps()).report.status).toBe('INVALID');
  });

  it('fuzz : structures arbitraires ⇒ jamais d’exception ; tout succès a une estimation cohérente', () => {
    fc.assert(fc.property(fc.anything(), fc.array(fc.anything(), { maxLength: 4 }), (junk, segs) => {
      const r = validateSession(run({ type: 'run_structure', segments: segs, estimate: junk }), baseContext(), deps());
      expect(['VALID', 'VALID_WITH_WARNINGS', 'INVALID']).toContain(r.report.status);
    }), { numRuns: 300 });
  });

  it('estimation « presque juste » (epsilon) ⇒ refus : aucune tolérance cachée', () => {
    const eps = { ...ok, estimate: { ...ok.estimate, totalS: { min: ok.estimate.totalS.min + 1e-9, max: ok.estimate.totalS.max } } };
    expect(validateSession(run(eps), baseContext(), deps()).report.errors.map((e) => e.reason.code)).toContain('DURATION.ESTIMATE_MISMATCH');
  });

  it('enveloppe v4 falsifiée (estimation stockée modifiée) ⇒ refus à la lecture', () => {
    const s = zSessionDraft.parse(run(ok));
    const tampered = JSON.parse(JSON.stringify(toEnvelope('session_record', { session: s, provenance: { engineVersion: '0.1.0', rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: 'x', traceId: 't0123456789abcdef' }, fingerprint: { status: 'unavailable', reason: 'duplicate_analysis_inactive' }, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } }))) as { data: { session: { blocks: { items: { prescription: RunStructure }[] }[] } } };
    tampered.data.session.blocks[0]!.items[0]!.prescription.estimate.workS.max += 1;
    const m = migrateToCurrent(tampered);
    expect(!m.ok && m.reasons.map((x) => x.code)).toEqual(['DURATION.ESTIMATE_MISMATCH']);
  });
});
