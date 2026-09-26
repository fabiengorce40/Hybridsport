import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { zSessionDraft } from '@hybridsport/domain';
import { validateSession, fitDuration } from '../../src/index.js';
import { arbProfile, arbStrengthSession } from '../harness/arbitraries.js';
import { baseContext, deps } from '../fixtures/context.js';
import { EQUIPMENT } from '../fixtures/catalog.js';

const d = deps();
const count = (r: ReturnType<typeof validateSession>, category: string) => r.report.errors.filter((e) => e.reason.category === category).length;

describe('tests métamorphiques du CORE', () => {
  it('ajouter du matériel n’augmente jamais les erreurs FEASIBILITY', () => {
    fc.assert(fc.property(arbProfile, arbStrengthSession, (p, s) => {
      const ctx = baseContext({ availableEquipment: p.availableEquipment });
      const more = baseContext({ availableEquipment: EQUIPMENT.map((e) => e.id) });
      expect(count(validateSession(s, more, d), 'feasibility')).toBeLessThanOrEqual(count(validateSession(s, ctx, d), 'feasibility'));
    }), { numRuns: 150 });
  });

  it('ajouter une restriction ne fait jamais disparaître une erreur SAFETY', () => {
    fc.assert(fc.property(arbProfile, arbStrengthSession, fc.constantFrom('no_overhead', 'no_deep_knee_flexion', 'no_grip_intensive'), (p, s, extra) => {
      const a = validateSession(s, baseContext({ restrictions: p.restrictions }), d);
      const b = validateSession(s, baseContext({ restrictions: [...new Set([...p.restrictions, extra])] }), d);
      expect(count(b, 'safety')).toBeGreaterThanOrEqual(count(a, 'safety'));
    }), { numRuns: 150 });
  });

  it('augmenter le temps disponible ne rend jamais infaisable une séance faisable', () => {
    fc.assert(fc.property(arbStrengthSession, fc.integer({ min: 0, max: 1800 }), (s, extraS) => {
      const base = zSessionDraft.parse(s);
      const more = { ...base, availableTimeS: base.availableTimeS + extraS };
      const a = fitDuration(base, d.catalog, d.ruleset);
      const b = fitDuration(more, d.catalog, d.ruleset);
      if (a.status !== 'INFEASIBLE') expect(b.status).not.toBe('INFEASIBLE');
    }), { numRuns: 150 });
  });
});
