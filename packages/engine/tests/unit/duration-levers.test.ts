/**
 * Phase 3.5 — durcissement du DurationEngine (leviers de compression, spec 07 §3.3).
 * Objectif : les comportements risqués, pas un pourcentage de couverture.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { SessionDraft, SessionDraftInput } from '@hybridsport/domain';
import {
  applyLeverStep, canonicalStringify, defaultLeverPlan, estimateDuration, fitDuration, leverDeclarationIssues, readDurationParams, readLeverSteps,
} from '../../src/index.js';
import { testCatalog, testRuleset } from '../fixtures/load.js';
import { param, testRulesetDocument } from '../fixtures/ruleset.js';
import { session, set, strengthSessionInput } from '../fixtures/sessions.js';

const catalog = testCatalog();
const ruleset = testRuleset();
const steps = readLeverSteps(ruleset);
const params = readDurationParams(ruleset);

type BlockInput = SessionDraftInput['blocks'][number];
const base = strengthSessionInput();
const WARMUP = base.blocks[0]!;
const MAIN = base.blocks[1]!;
const ACC = base.blocks[2]!;
const COOLDOWN: BlockInput = { id: 'b.cool', kind: 'cooldown', role: 'support', format: 'continuous', minDurationS: 180, items: [{ id: 'i.cool', exerciseId: 'ex.hip_mobility_flow', prescription: { type: 'mobility', seconds: 180 } }] };
const FINISHER: BlockInput = { id: 'b.fin', kind: 'finisher', role: 'support', optional: true, format: 'amrap', timeCapS: 360, levers: [{ kind: 'drop_optional_block' }], items: [{ id: 'i.wb', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 15 } }] };

const withBlocks = (blocks: BlockInput[], o: Partial<SessionDraftInput> = {}): SessionDraft => session({ ...base, ...o, blocks });
const accWith = (levers: NonNullable<BlockInput['levers']>, id = 'b.acc'): BlockInput => ({ ...ACC, id, levers, items: ACC.items.map((i) => ({ ...i, id: `${id}.${i.id}` })) }) as BlockInput;
const p50 = (s: SessionDraft): number => { const r = estimateDuration(s, catalog, params); if (!r.ok) throw new Error('estimation'); return r.estimate.p50; };
const workingSets = (s: SessionDraft, blockId: string): number[] =>
  (s.blocks.find((b) => b.id === blockId)?.items ?? []).map((i) => (i.prescription.type === 'sets' ? i.prescription.sets.filter((x) => x.kind !== 'rampup').length : 0));
const codes = (r: { reasons: readonly { code: string }[] }) => r.reasons.map((x) => x.code);

describe('leviers — disponibilité et effet', () => {
  it('aucun levier disponible et p90 > disponible ⇒ INFEASIBLE, aucun levier appliqué', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([])], { availableTimeS: 1900, targetDurationS: 1600 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(r.appliedLevers).toEqual([]);
    expect(codes(r)).toEqual(['DURATION.INFEASIBLE']);
  });

  it('aucun levier, p90 faisable mais p50 au-dessus de la tolérance ⇒ séance conservée, écart SOFT signalé', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([])], { availableTimeS: 2100, targetDurationS: 1500 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('FITS');
    expect(codes(r)).toEqual(['DURATION.OUT_OF_TOLERANCE']);
    if (r.status !== 'INFEASIBLE') expect(r.session).toEqual(s);
  });

  it('levier sans effet (repos déjà au plancher, déjà en superset) ⇒ ignoré, jamais compté comme appliqué', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_rest', floorS: 90 }])]);
    const acc = s.blocks[2]!;
    expect(applyLeverStep(s, { blockId: acc.id, lever: { kind: 'reduce_rest', floorS: 90 } }, steps)).toBeNull();
    const superset = withBlocks([WARMUP, MAIN, { ...accWith([{ kind: 'superset_accessories' }]), grouping: 'superset' } as BlockInput]);
    expect(applyLeverStep(superset, { blockId: 'b.acc', lever: { kind: 'superset_accessories' } }, steps)).toBeNull();
    expect(applyLeverStep(s, { blockId: 'b.inconnu', lever: { kind: 'reduce_rest', floorS: 0 } }, steps)).toBeNull();
    const r = fitDuration(withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_rest', floorS: 90 }])], { availableTimeS: 1900, targetDurationS: 1600 }), catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(r.appliedLevers).toEqual([]);
  });

  it('levier appliqué plusieurs fois, un pas à la fois, jusqu’à son plancher', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_sets', min: 1 }])], { availableTimeS: 1600, targetDurationS: 1300 });
    const r = fitDuration(s, catalog, ruleset);
    const n = r.appliedLevers.filter((l) => l.lever.kind === 'reduce_sets').length;
    expect(n).toBeGreaterThan(1);
    // 2 exercices × (3 → 1) = au plus 4 pas ; chaque exercice garde au moins son plancher.
    expect(n).toBeLessThanOrEqual(4);
    if (r.status !== 'INFEASIBLE') expect(Math.min(...workingSets(r.session, 'b.acc'))).toBeGreaterThanOrEqual(1);
  });

  it('un levier réduit p50 mais laisse p90 hors du disponible ⇒ INFEASIBLE (la réduction de p50 ne suffit jamais)', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_rest', floorS: 45 }])], { availableTimeS: 1700, targetDurationS: 1400 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(r.appliedLevers.length).toBeGreaterThan(0);
    if (r.status === 'INFEASIBLE' && r.estimate) {
      expect(r.estimate.p50).toBeLessThan(p50(s));
      expect(r.estimate.p90).toBeGreaterThan(1700);
    }
  });
});

describe('leviers — protection du travail principal, de l’échauffement et du retour au calme', () => {
  it('reduce_main_volume ne descend jamais sous son plancher : le bloc principal garde son travail', () => {
    const main = { ...MAIN, levers: [{ kind: 'reduce_main_volume' as const, min: 1 }] } as BlockInput;
    const r = fitDuration(withBlocks([WARMUP, main, accWith([])], { availableTimeS: 900, targetDurationS: 700 }), catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    const applied = r.appliedLevers.filter((l) => l.lever.kind === 'reduce_main_volume').length;
    expect(applied).toBe(2); // 3 séries de travail → 1, jamais 0
  });

  it('drop_accessory garde toujours au moins un exercice, même avec keepAtLeast = 0', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'drop_accessory', keepAtLeast: 0 }])]);
    const once = applyLeverStep(s, { blockId: 'b.acc', lever: { kind: 'drop_accessory', keepAtLeast: 0 } }, steps);
    expect(once?.blocks[2]?.items).toHaveLength(1);
    expect(applyLeverStep(once!, { blockId: 'b.acc', lever: { kind: 'drop_accessory', keepAtLeast: 0 } }, steps)).toBeNull();
  });

  it.each([
    ['drop_optional_block', { kind: 'drop_optional_block' as const }, true],
    ['reduce_sets', { kind: 'reduce_sets' as const, min: 1 }, false],
    ['drop_accessory', { kind: 'drop_accessory' as const, keepAtLeast: 1 }, false],
    ['reduce_rest', { kind: 'reduce_rest' as const, floorS: 30 }, false],
  ])('un levier %s sur le bloc PRINCIPAL est refusé (le principal ne se réduit que par reduce_main_volume, visible)', (_n, lever, optional) => {
    const main = { ...MAIN, optional, levers: [lever] } as BlockInput;
    const s = withBlocks([WARMUP, main, ACC]);
    expect(leverDeclarationIssues(s).length).toBeGreaterThan(0);
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(codes(r)).toContain('TECHNICAL.STRUCTURE_INVALID');
  });

  it('toute réduction du bloc principal (conditioning compris) est signalée DURATION.MAIN_VOLUME_REDUCED', () => {
    const amrap: BlockInput = { id: 'b.metcon', kind: 'conditioning', role: 'primary', format: 'amrap', timeCapS: 1200, levers: [{ kind: 'shorten_conditioning', minS: 600 }], items: [{ id: 'i.wb', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 15 } }] };
    const s = withBlocks([WARMUP, amrap], { toleranceProfile: 'fixed_time', availableTimeS: 1500, targetDurationS: 1380 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).not.toBe('INFEASIBLE');
    expect(r.appliedLevers.length).toBeGreaterThan(0);
    expect(codes(r)).toContain('DURATION.MAIN_VOLUME_REDUCED');
  });

  it('échauffement et retour au calme : aucun levier accepté, jamais modifiés par un ajustement', () => {
    const coolWithLever = { ...COOLDOWN, levers: [{ kind: 'drop_accessory' as const, keepAtLeast: 0 }] } as BlockInput;
    expect(leverDeclarationIssues(withBlocks([WARMUP, MAIN, ACC, coolWithLever]))).toEqual(['b.cool : levier interdit sur un bloc cooldown']);
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_sets', min: 1 }, { kind: 'drop_accessory', keepAtLeast: 1 }]), COOLDOWN], { availableTimeS: 1500, targetDurationS: 1200 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.appliedLevers.every((l) => l.blockId === 'b.acc')).toBe(true);
    if (r.status !== 'INFEASIBLE') {
      expect(r.session.blocks[0]).toEqual(s.blocks[0]);
      expect(r.session.blocks.at(-1)).toEqual(s.blocks.at(-1));
    }
  });
});

describe('leviers — ordre, bornes et issues', () => {
  it('plusieurs leviers de même priorité : ordre de déclaration des blocs puis des leviers (stable)', () => {
    const a = accWith([{ kind: 'reduce_sets', min: 2 }], 'b.acc1');
    const b = accWith([{ kind: 'reduce_sets', min: 2 }, { kind: 'reduce_rest', floorS: 45 }], 'b.acc2');
    expect(defaultLeverPlan(withBlocks([WARMUP, MAIN, a, b])).map((l) => `${l.blockId}:${l.lever.kind}`))
      .toEqual(['b.acc1:reduce_sets', 'b.acc2:reduce_sets', 'b.acc2:reduce_rest']);
    expect(defaultLeverPlan(withBlocks([WARMUP, MAIN, b, a])).map((l) => l.blockId)).toEqual(['b.acc2', 'b.acc2', 'b.acc1']);
  });

  it('ordre de priorité : optionnel < support < secondaire < principal ; reduce_main_volume toujours dernier', () => {
    const secondary = { ...accWith([{ kind: 'reduce_sets', min: 1 }], 'b.sec'), role: 'secondary', kind: 'strength' } as BlockInput;
    const main = { ...MAIN, levers: [{ kind: 'reduce_main_volume' as const, min: 1 }] } as BlockInput;
    const plan = defaultLeverPlan(withBlocks([WARMUP, main, secondary, accWith([{ kind: 'reduce_rest', floorS: 45 }]), FINISHER]));
    expect(plan.map((l) => l.blockId)).toEqual(['b.fin', 'b.acc', 'b.sec', 'b.main']);
  });

  it('ordre déterministe : même entrée ⇒ même suite de leviers et même séance, octet pour octet', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'superset_accessories' }, { kind: 'reduce_sets', min: 1 }, { kind: 'reduce_rest', floorS: 45 }]), FINISHER], { availableTimeS: 1800, targetDurationS: 1500 });
    expect(canonicalStringify(fitDuration(s, catalog, ruleset))).toBe(canonicalStringify(fitDuration(s, catalog, ruleset)));
    expect(fitDuration(s, catalog, ruleset).appliedLevers[0]?.lever.kind).toBe('drop_optional_block');
  });

  it('plafond d’itérations : au plus core.duration.maxLeverSteps pas, puis échec explicite (jamais une séance non vérifiée)', () => {
    const doc = testRulesetDocument();
    const capped = testRuleset({ ...doc, parameters: doc.parameters.map((x) => (x.id === 'core.duration.maxLeverSteps' ? param('core.duration.maxLeverSteps', 2, 'G4') : x)) });
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_sets', min: 1 }, { kind: 'drop_accessory', keepAtLeast: 1 }])], { availableTimeS: 1500, targetDurationS: 1200 });
    const free = fitDuration(s, catalog, ruleset);
    expect(free.appliedLevers.length).toBeGreaterThan(2);
    const r = fitDuration(s, catalog, capped);
    expect(r.status).toBe('INFEASIBLE');
    expect(r.appliedLevers).toHaveLength(2);
    expect(codes(r)).toEqual(['DURATION.INFEASIBLE']);
  });

  it('séance déjà faisable ⇒ aucun levier touché, séance identique', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_sets', min: 1 }]), FINISHER], { availableTimeS: 2800, targetDurationS: 2300 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).not.toBe('INFEASIBLE');
    expect(r.appliedLevers).toEqual([]);
    if (r.status !== 'INFEASIBLE') expect(r.session).toEqual(s);
  });

  it('impossible même après tous les leviers ⇒ INFEASIBLE avec la liste exhaustive des leviers tentés', () => {
    const main = { ...MAIN, levers: [{ kind: 'reduce_main_volume' as const, min: 1 }] } as BlockInput;
    const s = withBlocks([WARMUP, main, accWith([{ kind: 'superset_accessories' }, { kind: 'reduce_sets', min: 1 }, { kind: 'reduce_rest', floorS: 30 }, { kind: 'drop_accessory', keepAtLeast: 1 }]), FINISHER], { availableTimeS: 800, targetDurationS: 600 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('INFEASIBLE');
    expect(new Set(r.appliedLevers.map((l) => l.lever.kind))).toEqual(new Set(['drop_optional_block', 'superset_accessories', 'reduce_sets', 'reduce_rest', 'drop_accessory', 'reduce_main_volume']));
    expect(codes(r)).toEqual(['DURATION.INFEASIBLE']);
  });

  it('propriété : aucun ajout artificiel — jamais plus de blocs, d’items, de séries ni de p50 qu’à l’entrée', () => {
    const levers = [{ kind: 'superset_accessories' as const }, { kind: 'reduce_sets' as const, min: 1 }, { kind: 'reduce_rest' as const, floorS: 30 }, { kind: 'drop_accessory' as const, keepAtLeast: 1 }];
    fc.assert(fc.property(fc.integer({ min: 600, max: 4000 }), fc.subarray(levers), fc.boolean(), (available, chosen, withFinisher) => {
      const blocks = [WARMUP, MAIN, accWith(chosen), ...(withFinisher ? [FINISHER] : [])];
      const s = withBlocks(blocks, { availableTimeS: available, targetDurationS: Math.max(60, available - 300) });
      const r = fitDuration(s, catalog, ruleset);
      if (r.status === 'INFEASIBLE') return;
      expect(r.session.blocks.length).toBeLessThanOrEqual(s.blocks.length);
      const items = (x: SessionDraft) => x.blocks.flatMap((b) => b.items);
      expect(items(r.session).length).toBeLessThanOrEqual(items(s).length);
      for (const b of r.session.blocks) {
        const before = s.blocks.find((x) => x.id === b.id)!;
        expect(workingSets(r.session, b.id).reduce((a, c) => a + c, 0)).toBeLessThanOrEqual(workingSets(s, before.id).reduce((a, c) => a + c, 0));
      }
      expect(r.estimate.p50).toBeLessThanOrEqual(p50(s));
      expect(r.estimate.p90).toBeLessThanOrEqual(available);
    }), { numRuns: 150 });
  });

  it('séance trop courte : jamais d’augmentation, même avec des leviers disponibles', () => {
    const s = withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_sets', min: 1 }])], { availableTimeS: 5000, targetDurationS: 4500 });
    const r = fitDuration(s, catalog, ruleset);
    expect(r.status).toBe('SHORTER_ACCEPTED');
    if (r.status === 'SHORTER_ACCEPTED') expect(r.session).toEqual(s);
  });
});

describe('leviers — formats de conditioning et de course', () => {
  it('shorten_conditioning : AMRAP (time cap), EMOM (minutes), For Time (rounds), jamais sous le minimum', () => {
    const mk = (b: BlockInput) => withBlocks([WARMUP, b]);
    const amrap = mk({ id: 'b.c', kind: 'conditioning', role: 'secondary', format: 'amrap', timeCapS: 660, items: [{ id: 'i', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 10 } }] });
    const ref = { blockId: 'b.c', lever: { kind: 'shorten_conditioning' as const, minS: 600 } };
    const once = applyLeverStep(amrap, ref, steps);
    expect(once?.blocks[1]).toMatchObject({ timeCapS: 600 });
    expect(applyLeverStep(once!, ref, steps)).toBeNull();
    const emom = mk({ id: 'b.c', kind: 'conditioning', role: 'secondary', format: 'emom', minutes: 11, items: [{ id: 'i', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 10 } }] });
    const e1 = applyLeverStep(emom, ref, steps);
    expect(e1?.blocks[1]).toMatchObject({ minutes: 10 });
    expect(applyLeverStep(e1!, ref, steps)).toBeNull();
    const ft = mk({ id: 'b.c', kind: 'conditioning', role: 'secondary', format: 'for_time', rounds: 2, timeCapS: 900, items: [{ id: 'i', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 10 } }] });
    const f1 = applyLeverStep(ft, ref, steps);
    expect(f1?.blocks[1]).toMatchObject({ rounds: 1 });
    expect(applyLeverStep(f1!, ref, steps)).toBeNull();
    const cont = mk({ id: 'b.c', kind: 'conditioning', role: 'secondary', format: 'continuous', items: [{ id: 'i', exerciseId: 'ex.wall_ball', prescription: { type: 'reps', reps: 10 } }] });
    expect(applyLeverStep(cont, ref, steps)).toBeNull();
  });

  it('reduce_run_volume : temps et distance réduits d’un pas du ruleset, jamais sous le minimum déclaré', () => {
    const run = (p: { type: 'timed'; workS: number } | { type: 'distance'; distanceM: number }): SessionDraft => withBlocks([WARMUP, { id: 'b.run', kind: 'running', role: 'secondary', format: 'continuous', items: [{ id: 'i.run', exerciseId: 'ex.easy_run', prescription: p }] }], { discipline: 'running' });
    const timed = run({ type: 'timed', workS: 1200 });
    const t1 = applyLeverStep(timed, { blockId: 'b.run', lever: { kind: 'reduce_run_volume', minS: 1000 } }, steps);
    expect(t1?.blocks[1]?.items[0]?.prescription).toMatchObject({ workS: 1200 - steps.reduceRunS });
    expect(applyLeverStep(t1!, { blockId: 'b.run', lever: { kind: 'reduce_run_volume', minS: 1000 } }, steps)).toBeNull();
    const dist = run({ type: 'distance', distanceM: 5000 });
    const d1 = applyLeverStep(dist, { blockId: 'b.run', lever: { kind: 'reduce_run_volume', minM: 4500 } }, steps);
    expect(d1?.blocks[1]?.items[0]?.prescription).toMatchObject({ distanceM: 5000 - steps.reduceRunM });
    expect(applyLeverStep(d1!, { blockId: 'b.run', lever: { kind: 'reduce_run_volume', minM: 4500 } }, steps)).toBeNull();
    // Sans minimum déclaré : le plancher par défaut est un pas (jamais une durée nulle).
    const short = run({ type: 'timed', workS: steps.reduceRunS });
    expect(applyLeverStep(short, { blockId: 'b.run', lever: { kind: 'reduce_run_volume' } }, steps)).toBeNull();
  });

  it('superset_accessories exige un bloc « sets » en séries droites d’au moins deux exercices', () => {
    const one = withBlocks([WARMUP, MAIN, { ...accWith([{ kind: 'superset_accessories' }]), items: [ACC.items[0]!] } as BlockInput]);
    expect(applyLeverStep(one, { blockId: 'b.acc', lever: { kind: 'superset_accessories' } }, steps)).toBeNull();
    const two = withBlocks([WARMUP, MAIN, accWith([{ kind: 'superset_accessories' }])]);
    const after = applyLeverStep(two, { blockId: 'b.acc', lever: { kind: 'superset_accessories' } }, steps);
    expect(after?.blocks[2]).toMatchObject({ grouping: 'superset' });
    expect(p50(after!)).toBeLessThan(p50(two));
  });

  it('drop_optional_block refusé sur un bloc non optionnel, reduce_main_volume refusé hors bloc principal', () => {
    expect(leverDeclarationIssues(withBlocks([WARMUP, MAIN, accWith([{ kind: 'drop_optional_block' }])]))).toEqual(['b.acc : drop_optional_block sur un bloc non optionnel']);
    expect(leverDeclarationIssues(withBlocks([WARMUP, MAIN, accWith([{ kind: 'reduce_main_volume', min: 1 }])]))).toEqual(['b.acc : reduce_main_volume réservé au bloc principal']);
  });

  it('les séries de montée en charge ne sont jamais retirées par reduce_sets', () => {
    const acc = { ...accWith([{ kind: 'reduce_sets', min: 1 }]), items: [{ id: 'i.x', exerciseId: 'ex.db_row', prescription: { type: 'sets', sets: [set('rampup', 8, 60), set('working', 10, 90), set('working', 10, 90)] } }] } as BlockInput;
    const s = withBlocks([WARMUP, MAIN, acc]);
    const after = applyLeverStep(s, { blockId: 'b.acc', lever: { kind: 'reduce_sets', min: 1 } }, steps);
    const p = after?.blocks[2]?.items[0]?.prescription;
    expect(p?.type === 'sets' && p.sets.map((x) => x.kind)).toEqual(['rampup', 'working']);
  });
});
