/**
 * Frontière de sécurité générique : une charge prescrite pour un mouvement n'est JAMAIS transférée à un autre
 * mouvement par une réparation du CORE. Aucune règle gouvernée de conversion n'existe : substitution d'un item chargé
 * ⇒ refus explicite (REPAIR.LOAD_TRANSFER_REFUSED), jamais un substitut portant la charge. Valeurs : DONNÉES DE TEST.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { Prescription, SessionDraft, SessionDraftInput } from '@hybridsport/domain';
import { carriesMovementLoad, repairSession } from '../../src/index.js';
import { baseContext, deps, presetEquipment } from '../fixtures/context.js';
import { session, strengthSessionInput } from '../fixtures/sessions.js';

// technical-constant: TEST_ONLY — charges et doses de test
const KG = 60;
const d = deps();
const opts = { seed: 'load-transfer' };
const noBarbell = baseContext({ availableEquipment: presetEquipment('preset.dumbbells_only') });
const load = { kg: KG, certainty: 'prescribed' as const };
const working = (intensity?: unknown) => ({ kind: 'working' as const, reps: 5, restAfterS: 150, ...(intensity ? { intensity } : {}) });

/** Séance de force de référence dont le développé couché (barre, absente) reçoit la prescription donnée. */
function benchWith(prescription: unknown): SessionDraft {
  const base = strengthSessionInput();
  return session({ ...base, blocks: [base.blocks[0]!, { ...base.blocks[1]!, items: [{ id: 'i.bench', exerciseId: 'ex.bench_press', prescription: prescription as never }] }] } as SessionDraftInput);
}
const items = (s: SessionDraft) => s.blocks.flatMap((b) => b.items);

const LOADED: Record<string, unknown> = {
  'sets · load': { type: 'sets', sets: [working({ mode: 'load', ...load })] },
  'sets · percent_of_reference': { type: 'sets', sets: [working({ mode: 'percent_of_reference', fraction: 0.8, reference: 'e1rm', kgRounded: KG })] },
  'sets · effort + charge indicative': { type: 'sets', sets: [working({ mode: 'effort', effort: { rir: 2 }, indicativeKg: { min: KG, max: KG } })] },
  'sets · bodyweight + charge ajoutée': { type: 'sets', sets: [working({ mode: 'bodyweight', addedKg: KG })] },
  'sets · relative_to_working': { type: 'sets', sets: [{ kind: 'rampup', reps: 5, restAfterS: 60, intensity: { mode: 'relative_to_working', fraction: 0.5 } }, working()] },
  'reps · load': { type: 'reps', reps: 10, load },
  'distance · load': { type: 'distance', distanceM: 50, load },
  'calories · load': { type: 'calories', calories: 10, load },
  'timed · load': { type: 'timed', workS: 60, load },
};

const UNLOADED: Record<string, unknown> = {
  'sets · historique (rir)': { type: 'sets', sets: [{ kind: 'working', reps: 5, restAfterS: 150, rir: 2 }] },
  'sets · effort pur': { type: 'sets', sets: [working({ mode: 'effort', effort: { rir: 2 } })] },
  'sets · bodyweight sans charge': { type: 'sets', sets: [working({ mode: 'bodyweight' })] },
  'reps sans charge': { type: 'reps', reps: 10 },
  'distance sans charge': { type: 'distance', distanceM: 50 },
};

describe('carriesMovementLoad', () => {
  it.each(Object.entries(LOADED))('%s ⇒ chargé', (_, p) => expect(carriesMovementLoad(p as Prescription)).toBe(true));
  it.each(Object.entries(UNLOADED))('%s ⇒ non chargé', (_, p) => expect(carriesMovementLoad(p as Prescription)).toBe(false));
  it('hold, mobility, intervals : jamais chargés', () => {
    for (const p of [{ type: 'hold', seconds: 30, sets: 1, restS: 0 }, { type: 'mobility', seconds: 30, sides: 1 }, { type: 'intervals', reps: 4, work: { timeS: 60 }, recoveryS: 60 }]) expect(carriesMovementLoad(p as Prescription)).toBe(false);
  });
});

describe('réparation : aucune charge transférée à un substitut', () => {
  it.each(Object.entries(LOADED))('%s, matériel absent ⇒ refus LOAD_TRANSFER_REFUSED, aucun substitut publié', (_, p) => {
    const out = repairSession(benchWith(p), noBarbell, d, opts);
    expect(out.result.status).toBe('error');
    if (out.result.status !== 'error') return;
    expect(out.result.error.code).toBe('NO_VALID_SOLUTION');
    expect(out.result.error.reasons[0]).toMatchObject({ code: 'REPAIR.LOAD_TRANSFER_REFUSED', params: { itemId: 'i.bench', exerciseId: 'ex.bench_press', substituteId: 'ex.db_bench_press' } });
    expect(out.trace.entries.some((e) => e.decision === 'load_transfer_refused')).toBe(true);
  });

  it.each(Object.entries(UNLOADED).filter(([k]) => k.startsWith('sets')))('%s, matériel absent ⇒ substitution inchangée (comportement historique)', (_, p) => {
    const out = repairSession(benchWith(p), noBarbell, d, opts);
    expect(out.result.status).toBe('ok');
    if (out.result.status === 'ok') expect(items(out.result.value).find((i) => i.id === 'i.bench')).toMatchObject({ exerciseId: 'ex.db_bench_press', prescription: p });
  });

  it('item chargé SECONDAIRE substituable ⇒ refus de toute la séance (ni transfert, ni retrait silencieux en échange)', () => {
    const base = strengthSessionInput();
    const acc = { ...base.blocks[2]!, items: [{ id: 'i.fly', exerciseId: 'ex.cable_fly', prescription: { type: 'sets', sets: [working({ mode: 'load', ...load })] } }] };
    const out = repairSession(session({ ...base, blocks: [base.blocks[0]!, base.blocks[1]!, acc] } as SessionDraftInput), noBarbell, d, opts);
    expect(out.result.status === 'error' && out.result.error.reasons.map((r) => r.code)).toEqual(['REPAIR.LOAD_TRANSFER_REFUSED', 'FEASIBILITY.EQUIPMENT_MISSING']);
  });

  it('douleur sans substitut admissible ⇒ repos recommandé inchangé (aucune charge déplacée)', () => {
    const ctx = baseContext({ areaRestrictions: [{ area: 'shoulder', action: 'exclude', painLevel: 'P2' }] });
    expect(repairSession(benchWith(LOADED['sets · load']), ctx, d, opts).result.status).toBe('rest_recommended');
  });

  it('propriété : quelle que soit la charge et la prescription, une séance publiée ne porte jamais de charge sur un mouvement substitué', () => {
    const presc = fc.constantFrom(...Object.values(LOADED), ...Object.values(UNLOADED));
    const equip = fc.constantFrom('preset.dumbbells_only', 'preset.commercial_gym', 'preset.box', 'preset.hybrid_race_gym');
    fc.assert(fc.property(presc, equip, (p, e) => {
      const input = benchWith(p);
      const out = repairSession(input, baseContext({ availableEquipment: presetEquipment(e) }), d, opts);
      if (out.result.status !== 'ok') return true;
      const before = new Map(items(input).map((i) => [i.id, i.exerciseId]));
      return items(out.result.value).every((i) => before.get(i.id) === i.exerciseId || !carriesMovementLoad(i.prescription));
    }), { numRuns: 60, seed: 7 });
  });
});
