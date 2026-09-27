/**
 * Phase 4G — préservation du stimulus : scénarios comportementaux G1–G12 et propriétés P1–P8.
 * - Décision PURE (`findStimulusSwap`) sur un modèle synthétique : séries par groupe et coût en temps de chaque
 *   optionnel, budget de durée ;
 * - moteur complet sur des séances réelles où la règle agit (full body et bas du corps, 60 min, ruleset 4F).
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { asISODateTime } from '@hybridsport/domain';
import type { SessionDraft, SessionItem } from '@hybridsport/domain';
import { canonicalStringify } from '@hybridsport/engine';
import { evaluateSwap, findStimulusSwap, firstFailingFilter, readStrengthParams, removalOrder, workingSetsOf } from '../../src/index.js';
import type { SpPlaced, SpTrial, StrengthTrack } from '../../src/index.js';
import { envFor, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import type { Scenario } from '../fixtures/harness.js';
import { LOCK_RULESET } from '../fixtures/science.js';
import { strengthLockRulesetDocument } from '../fixtures/ruleset.js';

// ——— Modèle synthétique ———
interface Opt { readonly key: string; readonly slot: string; readonly sets: Readonly<Record<string, number>>; readonly cost: number; readonly tracked?: boolean; readonly optional?: boolean }
interface Model { readonly base: Readonly<Record<string, number>>; readonly baseCost: number; readonly placed: readonly Opt[]; readonly added: Opt; readonly budget: number; readonly ranks: readonly string[] }

const primary = (o: Opt) => Object.keys(o.sets).sort();
const toPlaced = (o: Opt): SpPlaced => ({ key: o.key, slotId: o.slot, optional: o.optional ?? true, tracked: o.tracked ?? false, primaryGroups: primary(o) });
const rankOf = (m: Model) => (slot: string) => m.ranks.indexOf(slot);
function trialOf(m: Model, calls: string[] = []): (v: SpPlaced) => SpTrial {
  return (v) => {
    calls.push(v.key);
    const kept = m.placed.filter((p) => p.key !== v.key);
    const planned: Record<string, number> = { ...m.base };
    for (const o of [...kept, m.added]) for (const [g, n] of Object.entries(o.sets)) planned[g] = (planned[g] ?? 0) + n;
    const cost = m.baseCost + kept.reduce((a, o) => a + o.cost, 0) + m.added.cost;
    return { fits: cost <= m.budget, planned, own: Object.values(m.added.sets)[0] ?? 0, addedGroups: primary(m.added) };
  };
}
const decide = (m: Model, calls?: string[]) => findStimulusSwap(m.added.slot, rankOf(m), m.placed.map(toPlaced), trialOf(m, calls));

// Ordre de priorité de stimulus (déclaré par l'intention : optionalOrder puis needPriority) : a > b > c > d > e.
const RANKS = ['a', 'b', 'c', 'd', 'e'];
const opt = (key: string, slot: string, sets: Record<string, number>, cost = 300, o: Partial<Opt> = {}): Opt => ({ key, slot, sets, cost, ...o });

describe('scénarios G1–G9 (décision pure)', () => {
  it('G1 — deux optionnels concurrents : le moins prioritaire est retiré, de façon déterministe', () => {
    const m: Model = { base: { chest: 2, core: 1, calves: 1 }, baseCost: 1800, placed: [opt('B', 'c', { core: 3 }), opt('C', 'd', { calves: 3 })], added: opt('A', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
    // D'abord essayé : l'optionnel de rang le plus bas (d), puis c.
    expect(removalOrder('b', rankOf(m), m.placed.map(toPlaced)).map((p) => p.key)).toEqual(['C', 'B']);
    expect(decide(m)?.victim.key).toBe('C');
    for (let i = 0; i < 5; i++) expect(decide(m)?.victim.key).toBe('C');
  });

  it('G2 — un optionnel couvrant deux groupes : toute sa contribution compte (couverture ET majorité)', () => {
    // Le moins prioritaire (d) est la SEULE couverture des triceps : le retirer est refusé ; c est retiré à la place.
    const m: Model = { base: { chest: 2, core: 1 }, baseCost: 1800, placed: [opt('V2', 'c', { core: 3 }), opt('V1', 'd', { shoulders: 3, triceps: 3 })], added: opt('E', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
    expect(decide(m)?.victim.key).toBe('V2');
    // Majorité : l'omis couvre deux groupes ; seul le second perdrait la majorité — l'échange est admis sur ce groupe.
    const two: Model = { base: { chest: 9, rear_delts: 1 }, baseCost: 1800, placed: [opt('V', 'd', { core: 2 })], added: opt('E', 'b', { chest: 3, rear_delts: 3 }), budget: 2400, ranks: RANKS };
    expect(decide({ ...two, base: { ...two.base, core: 1 } })?.groups).toEqual(['rear_delts']);
  });

  it('G3 — stimulus déjà couvert par le travail obligatoire : l’optionnel redondant n’est PAS protégé (pas de quota implicite)', () => {
    const covered: Model = { base: { chest: 6, core: 1 }, baseCost: 1800, placed: [opt('T', 'd', { core: 3 })], added: opt('E', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
    expect(decide(covered)).toBeUndefined();
    // Limite : autant que tous les autres réunis (3 = 3) ⇒ échange ; un de plus chez les autres ⇒ aucun.
    expect(decide({ ...covered, base: { chest: 3, core: 1 } })?.victim.key).toBe('T');
    expect(decide({ ...covered, base: { chest: 4, core: 1 } })).toBeUndefined();
  });

  it('G5 — optionnel coûteux : le retrait d’un optionnel bon marché ne libère pas assez de temps ; le suivant admissible est essayé', () => {
    const m: Model = { base: { chest: 2, core: 1, calves: 1 }, baseCost: 1800, placed: [opt('BIG', 'c', { core: 3 }, 600), opt('SMALL', 'd', { calves: 3 }, 120)], added: opt('E', 'b', { chest: 3 }, 500), budget: 2600, ranks: RANKS };
    const calls: string[] = [];
    expect(decide(m, calls)?.victim.key).toBe('BIG');
    expect(calls).toEqual(['SMALL', 'BIG']);
    // Aucun retrait ne suffit : aucun échange (le temps n’est jamais forcé).
    expect(decide({ ...m, budget: 2000 })).toBeUndefined();
  });

  it('G6 — aucune préservation nécessaire : l’omis n’apporte rien de disproportionné ⇒ aucun échange, aucun essai accepté', () => {
    const m: Model = { base: { chest: 8, core: 1 }, baseCost: 1800, placed: [opt('T', 'd', { core: 3 })], added: opt('E', 'b', { chest: 2 }), budget: 2400, ranks: RANKS };
    expect(decide(m)).toBeUndefined();
    // Omis sans série de travail (maintien nul, mobilité) : jamais protégé.
    expect(decide({ ...m, base: { core: 1 }, added: opt('E', 'b', { chest: 0 }) })).toBeUndefined();
  });

  it('G7 — aucun candidat valide : optionnel suivi (track), requis, plus prioritaire, même emplacement, ou omis sans candidat ⇒ aucun échange forcé', () => {
    const base: Omit<Model, 'placed'> = { base: { chest: 2, core: 1 }, baseCost: 1800, added: opt('E', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
    expect(decide({ ...base, placed: [opt('T', 'd', { core: 3 }, 300, { tracked: true })] })).toBeUndefined();
    expect(decide({ ...base, placed: [opt('R', 'd', { core: 3 }, 300, { optional: false })] })).toBeUndefined();
    expect(decide({ ...base, placed: [opt('H', 'a', { core: 3 })] })).toBeUndefined();
    expect(decide({ ...base, placed: [opt('S', 'b', { shoulders: 3 })] })).toBeUndefined();
    // L'omis n'appartient pas aux optionnels (exercice supplémentaire d'un emplacement requis) : aucun retrait.
    expect(removalOrder('required_slot', rankOf({ ...base, placed: [] }), [toPlaced(opt('T', 'd', { core: 3 }))])).toEqual([]);
    // Essai « bloqué » : la victime suivante est essayée.
    const m: Model = { ...base, placed: [opt('X', 'c', { core: 3 }), opt('Y', 'd', { calves: 3 })], base: { chest: 2, core: 1, calves: 1 } };
    const t = trialOf(m);
    expect(findStimulusSwap('b', rankOf(m), m.placed.map(toPlaced), (v) => (v.key === 'Y' ? 'blocked' : t(v)))?.victim.key).toBe('X');
  });

  it('G8 — égalité : deux candidats de même rang (même emplacement) ⇒ ordre de placement (tri stable), sans hasard', () => {
    const m: Model = { base: { chest: 2, calves: 1 }, baseCost: 1800, placed: [opt('L1', 'd', { calves: 2 }), opt('L2', 'd', { hamstrings: 2 })], added: opt('E', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
    expect(decide({ ...m, base: { ...m.base, hamstrings: 1 } })?.victim.key).toBe('L1');
    expect(decide({ ...m, base: { ...m.base, hamstrings: 1 }, placed: [...m.placed].reverse() })?.victim.key).toBe('L2');
  });

  it('G9 — conflit : la priorité vient de l’intention de séance (rang), jamais de l’ordre du catalogue ou du placement', () => {
    const A = opt('A', 'b', { chest: 3 });
    const B = opt('B', 'c', { core: 3 });
    // A omis, B placé : A (plus prioritaire) remplace B.
    expect(decide({ base: { chest: 1, core: 1 }, baseCost: 1800, placed: [B], added: A, budget: 2400, ranks: RANKS })?.victim.key).toBe('B');
    // B omis, A placé : B ne peut jamais déloger A.
    expect(decide({ base: { chest: 1, core: 1 }, baseCost: 1800, placed: [A], added: B, budget: 2400, ranks: RANKS })).toBeUndefined();
    // Intention inverse (rangs inversés) : le résultat s'inverse.
    expect(decide({ base: { chest: 1, core: 1 }, baseCost: 1800, placed: [A], added: B, budget: 2400, ranks: ['a', 'c', 'b', 'd', 'e'] })?.victim.key).toBe('A');
  });
});

describe('séries prises en compte', () => {
  it('séries de travail (sans montée ni facultative) ; séries de maintien ; mobilité et intervalles = 0', () => {
    const set = (kind: 'working' | 'rampup' | 'top_set' | 'backoff', optional = false) => ({ kind, reps: 5, restAfterS: 60, ...(optional ? { optional: true } : {}) }) as never;
    expect(workingSetsOf({ type: 'sets', sets: [set('rampup'), set('working'), set('top_set'), set('backoff'), set('working', true)] })).toBe(3);
    expect(workingSetsOf({ type: 'hold', seconds: 30, sets: 3, restS: 60 })).toBe(3);
    expect(workingSetsOf({ type: 'mobility', seconds: 300, sides: 1 })).toBe(0);
    expect(workingSetsOf({ type: 'intervals', reps: 3, work: { distanceM: 30 }, recoveryS: 60 } as SessionItem['prescription'])).toBe(0);
  });

  it('évaluation : majorité ≥, couverture > 0 sur CHAQUE groupe du retiré, durée obligatoire', () => {
    const v: SpPlaced = { key: 'v', slotId: 'd', optional: true, tracked: false, primaryGroups: ['core', 'glutes'] };
    const t = (planned: Record<string, number>, fits = true, own = 3): SpTrial => ({ fits, planned, own, addedGroups: ['chest'] });
    expect(evaluateSwap(v, t({ chest: 6, core: 1, glutes: 1 })).accepted).toBe(true);
    expect(evaluateSwap(v, t({ chest: 6, core: 1, glutes: 1 })).otherSets).toBe(3);
    expect(evaluateSwap(v, t({ chest: 7, core: 1, glutes: 1 })).accepted).toBe(false);
    expect(evaluateSwap(v, t({ chest: 6, core: 1 })).accepted).toBe(false);
    expect(evaluateSwap(v, t({ chest: 6, core: 1, glutes: 1 }, false)).accepted).toBe(false);
    expect(evaluateSwap(v, t({ chest: 0, core: 1, glutes: 1 }, true, 0)).accepted).toBe(false);
    expect(evaluateSwap({ ...v, primaryGroups: [] }, t({ chest: 3 })).accepted).toBe(true);
  });
});

describe('propriétés P6–P8 (décision pure)', () => {
  const arb = fc.record({
    own: fc.integer({ min: 0, max: 6 }), others: fc.integer({ min: 0, max: 12 }), victimCovered: fc.boolean(), budgetSlack: fc.integer({ min: -600, max: 600 }),
  });
  const model = (x: { own: number; others: number; victimCovered: boolean; budgetSlack: number }): Model => ({
    base: { chest: x.others, ...(x.victimCovered ? { core: 1 } : {}) }, baseCost: 1800, placed: [opt('T', 'd', { core: 2 })], added: opt('E', 'b', { chest: x.own }), budget: 1800 + 300 + x.budgetSlack, ranks: RANKS,
  });

  it('P6 — aucun quota fixe : l’échange dépend du rapport entre la contribution de l’omis et celle des autres, jamais d’un nombre de séries', () => {
    fc.assert(fc.property(arb, (x) => {
      const expected = x.own > 0 && x.own >= x.others && x.victimCovered && x.budgetSlack >= 0;
      expect(decide(model(x)) !== undefined).toBe(expected);
      // Mise à l'échelle : multiplier toutes les séries par k ne change pas la décision.
      const k = 2;
      expect(decide({ ...model(x), base: { chest: x.others * k, ...(x.victimCovered ? { core: k } : {}) }, added: opt('E', 'b', { chest: x.own * k }) }) !== undefined).toBe(expected);
    }), { seed: 404, numRuns: 300 });
  });

  it('P7 — invariance d’ordre : permuter les optionnels de rangs distincts ne change pas la victime', () => {
    fc.assert(fc.property(fc.shuffledSubarray(['B', 'C', 'D'], { minLength: 3, maxLength: 3 }), (order) => {
      const all = { B: opt('B', 'c', { core: 3 }), C: opt('C', 'd', { calves: 3 }), D: opt('D', 'e', { hamstrings: 3 }) };
      const m: Model = { base: { chest: 2, core: 1, calves: 1, hamstrings: 1 }, baseCost: 1500, placed: order.map((k) => all[k as 'B']), added: opt('E', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
      expect(decide(m)?.victim.key).toBe('D');
    }), { seed: 7, numRuns: 30 });
  });

  it('P8 — idempotence : après l’échange, rejouer la règle sur la séance réparée ne la modifie plus', () => {
    const m: Model = { base: { chest: 2, core: 1 }, baseCost: 1800, placed: [opt('T', 'd', { core: 3 })], added: opt('E', 'b', { chest: 3 }), budget: 2400, ranks: RANKS };
    const d = decide(m);
    expect(d?.victim.key).toBe('T');
    // Séance réparée : E placé, T omis. T (moins prioritaire) ne peut déloger E.
    const repaired: Model = { ...m, placed: [opt('E', 'b', { chest: 3 })], added: opt('T', 'd', { core: 3 }) };
    expect(decide(repaired)).toBeUndefined();
  });
});

// ——— Moteur complet ———
const CATALOG = strengthCatalog();
type ScenarioOpts = NonNullable<Parameters<typeof scenario>[0]>;
const fullBody = (o: { minutes?: number; level?: 'beginner' | 'intermediate' | 'advanced'; preset?: string; context?: ScenarioOpts['context']; profile?: ScenarioOpts['profile']; ruleset?: typeof LOCK_RULESET } = {}): Scenario => scenario({
  ruleset: o.ruleset ?? LOCK_RULESET, archetype: 'str_full_body', stimulus: 'strength_general', level: o.level ?? 'intermediate', preset: o.preset ?? 'preset.full_gym', minutes: o.minutes ?? 60,
  ...(o.profile ? { profile: o.profile } : {}),
  context: { goal: { primary: { goal: 'general' } }, phase: { kind: 'accumulation', weekInMesocycle: 2, mesocycleLength: 4 }, ...(o.context ?? {}) },
});
const lower = (o: { minutes?: number; level?: 'beginner' | 'intermediate' | 'advanced'; preset?: string } = {}): Scenario => scenario({
  ruleset: LOCK_RULESET, archetype: 'str_lower', stimulus: 'strength_volume', level: o.level ?? 'advanced', preset: o.preset ?? 'preset.full_gym', minutes: o.minutes ?? 60,
  context: { goal: { primary: { goal: 'hypertrophy' } }, phase: { kind: 'accumulation', weekInMesocycle: 2, mesocycleLength: 4 } },
});
type Out = ReturnType<typeof run>;
const session = (o: Out): SessionDraft => { if (o.result.status !== 'ok') throw new Error(o.result.status); return o.result.value; };
const reasonsOf = (o: Out) => { const s = session(o); return o.trace.entries.filter((e) => e.subject.id === s.id).flatMap((e) => e.reasons); };
const preserved = (o: Out) => reasonsOf(o).filter((r) => r.code === 'SELECT.STIMULUS_PRESERVED');
const strengthItems = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
const optionalCount = (s: SessionDraft) => strengthItems(s).filter((it) => /\.(single_leg|iso_|trunk|carry|push_2|pull_2)/.test(it.refs?.slotId ?? '')).length;
const withoutPolicy = strengthRuleset(strengthLockRulesetDocument({}, { 'strength.session.stimulusPreservation': null }));

describe('moteur : scénarios G4, G10, G11, G12 et trace', () => {
  it('séance réelle (full body 60 min) : pec deck conservé à la place du Pallof, trace exacte et nettoyée', () => {
    const o = run(fullBody());
    expect(preserved(o).map((r) => r.params)).toEqual([{ slot: 'fb.iso_upper', exerciseId: 'ex.pec_deck', removedSlot: 'fb.trunk', removedExerciseId: 'ex.cable_pallof_press', groups: ['chest'], sets: 3, otherSets: 3 }]);
    const omitted = reasonsOf(o).filter((r) => r.code === 'SELECT.SLOT_OMITTED').map((r) => `${String(r.params.slot)}:${String(r.params.cause)}`);
    expect(omitted).toContain('fb.trunk:stimulus_preservation');
    expect(omitted).not.toContain('fb.iso_upper:duration');
    // Sans la politique : l'omission reste (perte traçable) et le Pallof est gardé.
    const off = run({ ...fullBody(), ruleset: withoutPolicy });
    expect(reasonsOf(off).some((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.slot === 'fb.iso_upper' && r.params.cause === 'duration')).toBe(true);
    expect(strengthItems(session(off)).map((it) => it.exerciseId)).toContain('ex.cable_pallof_press');
  });

  it('séance réelle (bas du corps 60 min, avancé) : l’isolation genou protège les quadriceps, la fente bulgare moins prioritaire sort, séries et volume cohérents', () => {
    const o = run(lower());
    expect(preserved(o).map((r) => [r.params.exerciseId, r.params.removedExerciseId])).toEqual([['ex.leg_extension', 'ex.bulgarian_split_squat']]);
    const s = session(o);
    const ext = strengthItems(s).find((it) => it.exerciseId === 'ex.leg_extension');
    expect(ext && ext.prescription.type === 'sets' ? workingSetsOf(ext.prescription) : 0).toBe(4);
  });

  it('deux essais : la première victime (tronc) est refusée, la seconde (fente bulgare) acceptée ; chaque essai repart de l’état initial', () => {
    for (const level of ['intermediate', 'advanced'] as const) {
      const o = run(lower({ level, minutes: 65 }));
      expect(preserved(o).map((r) => [r.params.slot, r.params.exerciseId, r.params.removedSlot, r.params.removedExerciseId]), level).toEqual([['lo.iso_lower', 'ex.leg_extension', 'lo.single_leg', 'ex.bulgarian_split_squat']]);
      const s = session(o);
      // Le tronc, essayé en premier puis refusé, reste dans la séance ; aucun exercice en double.
      const slots = strengthItems(s).map((it) => it.refs?.slotId);
      expect(slots, level).toContain('lo.trunk');
      expect(slots.filter((x) => x === 'lo.iso_lower'), level).toHaveLength(2);
      const ids = strengthItems(s).map((it) => it.exerciseId);
      expect(new Set(ids).size, level).toBe(ids.length);
      const omitted = reasonsOf(o).filter((r) => r.code === 'SELECT.SLOT_OMITTED').map((r) => `${String(r.params.slot)}:${String(r.params.cause)}`).sort();
      expect(omitted, level).toContain('lo.single_leg:stimulus_preservation');
      expect(omitted.filter((x) => x.startsWith('lo.iso_lower:')), level).toEqual([]);
      // Même séance que la décision pure le prévoit : sans la règle, le leg extension supplémentaire manque.
      const off = run({ ...lower({ level, minutes: 65 }), ruleset: withoutPolicy });
      expect(strengthItems(session(off)).map((it) => it.exerciseId), level).toContain('ex.bulgarian_split_squat');
    }
  });

  it('G4 / P3 — contrainte sévère : jamais de dépassement de durée, repos du principal et montée spécifique intacts', () => {
    for (const minutes of [30, 35, 40, 45, 50, 55, 60, 65]) for (const make of [fullBody, lower]) {
      const s0 = make({ minutes });
      const o = run(s0);
      if (o.result.status !== 'ok') continue;
      const rs = reasonsOf(o);
      const p90 = Number(rs.find((r) => r.code === 'DURATION.ESTIMATED')?.params.p90S);
      expect(p90, `${String(minutes)} min`).toBeLessThanOrEqual(s0.intent.availableTimeS);
      // Le principal (et sa montée) sont identiques avec et sans la règle : elle ne touche que des optionnels.
      const main = (x: Out) => JSON.stringify(strengthItems(session(x)).find((it) => /\.main_/.test(it.refs?.slotId ?? '')));
      const off = run({ ...s0, ruleset: withoutPolicy });
      expect(main(o), `${String(minutes)} min`).toBe(main(off));
    }
  });

  it('G10 — anti-doublon : une séance récente identique ne fait pas sauter le travail requis ; la pénalité reste souple ; la continuité (débutant) garde le stimulus protégé', () => {
    const recent = asISODateTime(new Date(Date.parse(NOW) - 2 * 86_400_000).toISOString().replace('.000Z', 'Z'));
    const chest = (x: SessionDraft) => strengthItems(x).reduce((a, it) => a + (CATALOG.exercise(it.exerciseId)?.muscles.primary.includes('chest') && it.prescription.type === 'sets' ? workingSetsOf(it.prescription) : 0), 0);
    for (const level of ['beginner', 'intermediate'] as const) {
      const s0 = fullBody({ level });
      const first = run(s0);
      const fp = first.fingerprint;
      if (!fp) throw new Error('empreinte');
      const again = run({ ...s0, history: [{ fingerprint: fp, at: recent, status: 'completed', repetitionIntents: [] }] });
      // Travail requis (principal, poussée, tirage) toujours présent ; séance valide ; jamais un doublon fort retenu.
      const required = (x: SessionDraft) => strengthItems(x).filter((it) => /\.(main_|push_|pull_)/.test(it.refs?.slotId ?? '')).map((it) => it.refs?.slotId).sort();
      expect(required(session(again)), level).toEqual(required(session(first)));
      expect(strengthItems(session(again)).find((it) => /\.main_/.test(it.refs?.slotId ?? ''))?.exerciseId, level).toBe(strengthItems(session(first)).find((it) => /\.main_/.test(it.refs?.slotId ?? ''))?.exerciseId);
      expect(again.trace.entries.filter((e) => e.step === 'validate').at(-1)?.decision, level).toBe('VALID');
      expect(again.duplicate?.classification, level).not.toBe('accidental_strong');
      // Débutant : continuité ⇒ même séance, stimulus protégé conservé. Intermédiaire : variation contrôlée des
      // accessoires (critère de récence, 4F) — hors du périmètre de la préservation du stimulus (voir rapport 4G).
      if (level === 'beginner') expect(chest(session(again))).toBe(chest(session(first)));
    }
  });

  it('G11 / P5 — un optionnel suivi (track) n’est jamais retiré au profit d’un optionnel plus pratique ; les ancres restent', () => {
    const tracked: StrengthTrack = { trackId: 't.pallof', tier: 'tracked', exerciseId: 'ex.cable_pallof_press', archetypeId: 'str_full_body', slotId: 'fb.trunk', model: 'double_progression', status: 'active', openedAt: asISODateTime('2026-09-20T08:00:00Z'), consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0 };
    const o = run(fullBody({ context: { tracks: [tracked] } }));
    expect(preserved(o)).toEqual([]);
    expect(strengthItems(session(o)).map((it) => it.exerciseId)).toContain('ex.cable_pallof_press');
    // Ancre déclarée sur le principal : jamais concernée (les ancres ne sont pas des optionnels).
    const anchor: StrengthTrack = { trackId: 't.sq', tier: 'anchor', exerciseId: 'ex.back_squat', archetypeId: 'str_full_body', slotId: 'fb.main_knee', model: 'autoregulated', status: 'active', openedAt: asISODateTime('2026-09-20T08:00:00Z'), consecutiveSuccess: 0, consecutiveBelow: 0, consecutiveHolds: 0 };
    const s = fullBody({ context: { tracks: [anchor] } });
    const oa = run({ ...s, intent: { ...s.intent, repetitionIntents: [{ kind: 'progression_anchor', trackId: 't.sq' }] } });
    expect(strengthItems(session(oa)).find((it) => it.refs?.anchor === 'declared')?.exerciseId).toBe('ex.back_squat');
    for (const r of preserved(oa)) expect(r.params.removedExerciseId).not.toBe('ex.back_squat');
  });

  it('G12 / P2 — budget décroissant (120 → 30 min) : jamais plus d’optionnels, pas de stimulus qui disparaît puis réapparaît', () => {
    for (const make of [fullBody, lower]) for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const budgets = [120, 105, 90, 75, 60, 45, 30];
      const sessions = budgets.map((minutes) => run(make({ minutes, level }))).filter((o) => o.result.status === 'ok').map(session);
      const counts = sessions.map(optionalCount);
      for (let i = 1; i < counts.length; i++) expect(counts[i], `${level} ${String(budgets[i])} min`).toBeLessThanOrEqual(counts[i - 1] ?? Infinity);
      // Un optionnel protégé présent à un budget plus court l'est aussi aux budgets plus longs.
      const has = sessions.map((s) => new Set(strengthItems(s).map((it) => it.exerciseId)));
      for (let i = 1; i < has.length; i++) for (const e of has[i] ?? []) if (/pec_deck|leg_extension/.test(e)) expect(has[i - 1]?.has(e), `${level} ${e}`).toBe(true);
    }
  });
});

describe('moteur : propriétés P1, P4', () => {
  it('P1 — déterminisme : même entrée, graine, ruleset, catalogue ⇒ même décision', () => {
    fc.assert(fc.property(fc.constantFrom(30, 45, 60, 75), fc.constantFrom('beginner', 'intermediate', 'advanced'), fc.string({ minLength: 1, maxLength: 6 }), (minutes, level, seed) => {
      const s = { ...fullBody({ minutes, level: level as 'beginner' }), seed };
      const a = run(s);
      const b = run(s);
      expect(canonicalStringify({ r: a.result, t: a.trace.entries })).toBe(canonicalStringify({ r: b.result, t: b.trace.entries }));
    }), { seed: 12, numRuns: 20 });
  });

  it('P4 — contraintes dures : exclusion utilisateur, matériel et douleur restent souveraines pendant l’échange', () => {
    const excluded = run(fullBody({ profile: { excludedExercises: ['ex.pec_deck'] } }));
    for (const it of strengthItems(session(excluded))) expect(it.exerciseId).not.toBe('ex.pec_deck');
    for (const r of preserved(excluded)) expect(r.params.exerciseId).not.toBe('ex.pec_deck');
    const eq = fullBody({ preset: 'preset.dumbbells_only' });
    const oe = run(eq);
    if (oe.result.status === 'ok') for (const it of strengthItems(session(oe))) {
      const e = CATALOG.exercise(it.exerciseId);
      expect(e && CATALOG.isFeasibleWith(e, new Set(eq.profile.availableEquipment)), it.exerciseId).toBe(true);
    }
    const pain = run({ ...fullBody(), state: { readiness: 'normal', activePain: [], painHistory: 'available', dayAvailable: true } });
    expect(session(pain).blocks.length).toBeGreaterThan(0);
  });
});

describe('invariants structurels (analyse des mutants liés aux familles, 4G)', () => {
  it('deux emplacements optionnels distincts (hors groupe de choix commun) ne partagent aucune famille candidate : retirer une victime ne libère jamais de candidat pour l’omis', () => {
    const P = readStrengthParams(LOCK_RULESET).values;
    for (const a of P['strength.archetypes']) {
      const env = envFor(scenario({ ruleset: LOCK_RULESET, archetype: a.id, stimulus: Object.keys(P['strength.stimuli'])[0] ?? '', level: 'advanced' }));
      const opt = a.slots.filter((x) => x.status === 'optional');
      const families = (def: (typeof opt)[number]) => {
        const slot = { def, requirement: P['strength.needs'][def.need]?.requirement ?? {} };
        return new Set(CATALOG.exercises().filter((e) => firstFailingFilter(e, slot, env, { technicalCount: 0 }) !== 'F2_slot').map((e) => e.family));
      };
      for (let i = 0; i < opt.length; i++) for (let j = i + 1; j < opt.length; j++) {
        const x = opt[i];
        const y = opt[j];
        if (!x || !y || (x.choiceGroup !== undefined && x.choiceGroup === y.choiceGroup)) continue;
        const fx = families(x);
        const shared = [...families(y)].filter((f) => fx.has(f));
        expect(shared, `${a.id} ${x.id}/${y.id}`).toEqual([]);
      }
    }
  });

  it('chaque famille du catalogue a un seul pattern primaire : retirer une victime ne libère pas de candidat pour un autre besoin', () => {
    const byFamily = new Map<string, Set<string>>();
    for (const e of CATALOG.exercises()) byFamily.set(e.family, (byFamily.get(e.family) ?? new Set()).add(e.patterns.primary));
    for (const [f, patterns] of byFamily) expect(patterns.size, f).toBe(1);
  });
});
