/**
 * RC4.5 (F6) — emplacement facultatif « mollets » à TEMPS RÉSIDUEL (R1) et jusqu'à la cible hebdomadaire (R2).
 * Contenu F6 = surcouche du ruleset verrouillé et du catalogue de test (fixtures `f6.ts`) ; contenu 4F inchangé.
 *
 * R1 : la séance ordinaire (mêmes exercices, séries, ordre, regroupements, leviers) est IDENTIQUE à celle du contenu
 * 4F dès que les mollets ne concourent plus avec `isolation_lower` ; l'ajout n'intervient qu'en dernier, s'il tient.
 */
import { describe, expect, it } from 'vitest';
import type { SessionDraft } from '@hybridsport/domain';
import { proposeStrength } from '../../src/index.js';
import { strengthF6CatalogDocument, strengthF6RulesetDocument } from '../fixtures/f6.js';
import { engineInput, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import type { Scenario } from '../fixtures/harness.js';

const F6 = { ruleset: strengthRuleset(strengthF6RulesetDocument()), catalog: strengthCatalog(strengthF6CatalogDocument()) };
const CALVES = new Set(['fb.calves', 'lo.calves']);
interface Proposal { readonly session: SessionDraft; readonly reasons: readonly { code: string; params: Record<string, unknown> }[]; readonly optimization: unknown }
const propose = (s: Scenario): Proposal => {
  const r = proposeStrength(engineInput(s));
  if (r.status !== 'proposals') throw new Error(JSON.stringify(r.reasons.map((x) => x.code)));
  return r.proposals[0] as unknown as Proposal;
};
const items = (s: SessionDraft) => s.blocks.flatMap((b) => b.items);
const calvesOf = (s: SessionDraft) => items(s).filter((i) => CALVES.has(i.refs?.slotId ?? ''));
/** Séance sans les éléments à temps résiduel (blocs vidés retirés) : regroupements et leviers compris. */
const ordinary = (s: SessionDraft) => s.blocks.map((b) => ({ ...b, items: b.items.filter((i) => !CALVES.has(i.refs?.slotId ?? '')) })).filter((b) => b.items.length > 0);
const omitted = (reasons: readonly { code: string; params: Record<string, unknown> }[], slot: string) => reasons.filter((r) => r.code === 'SELECT.SLOT_OMITTED' && r.params.slot === slot).map((r) => r.params.cause);

describe('RC4.5 F6 — mollets à temps résiduel', () => {
  it('R1 : sans mollet en concurrence (catalogue F6), la séance ordinaire est IDENTIQUE au contenu F6 sans emplacement mollets ; mollets en dernier', () => {
    // Référence : même ruleset F6, emplacements mollets retirés (même catalogue) ⇒ seul l'ajout résiduel diffère.
    const doc = strengthF6RulesetDocument();
    const noSlot = strengthRuleset({ ...doc, parameters: doc.parameters.map((p) => (p.id === 'strength.archetypes' ? { ...p, value: (p.value as { slots: { id: string }[] }[]).map((a) => ({ ...a, slots: a.slots.filter((x) => !CALVES.has(x.id)) })) as never } : p)) });
    let added = 0;
    for (const archetype of ['str_full_body', 'str_lower']) for (const minutes of [45, 60, 75, 90]) for (const preset of ['preset.full_gym', 'preset.dumbbells_only', 'preset.home_equipped']) {
      const base = scenario({ archetype, minutes, preset, stimulus: archetype === 'str_lower' ? 'strength_volume' : 'strength_general' });
      const a = propose({ ...base, ...F6 });
      const b = propose({ ...base, ruleset: noSlot, catalog: F6.catalog });
      expect(JSON.stringify(ordinary(a.session)), `${archetype} ${String(minutes)} ${preset}`).toBe(JSON.stringify(ordinary(b.session)));
      expect(a.optimization).toEqual(b.optimization);
      const c = calvesOf(a.session);
      expect(c.length).toBeLessThanOrEqual(1);
      if (c.length === 1) {
        added += 1;
        const acc = a.session.blocks.find((x) => x.id === 'b.accessory');
        expect(acc?.items.at(-1)?.refs?.slotId).toBe(archetype === 'str_lower' ? 'lo.calves' : 'fb.calves');
        expect(a.session.availableTimeS).toBeGreaterThan(0);
      } else {
        expect(omitted(a.reasons, archetype === 'str_lower' ? 'lo.calves' : 'fb.calves').length).toBe(1);
      }
      // Séance valide pour le CORE (durée, contrôles) avec l'ajout.
      expect(run({ ...base, ...F6 }).result.status).toBe('ok');
    }
    expect(added).toBeGreaterThan(0);
  });

  it('R2 : cible hebdomadaire des mollets déjà atteinte (réalisé sur 7 j) ⇒ omis, cause tracée « weekly_target_met »', () => {
    const base = scenario({ minutes: 90 });
    expect(calvesOf(propose({ ...base, ...F6 }).session)).toHaveLength(1);
    const met = propose({ ...base, ...F6, context: { ...base.context, hardSets: { d7: { calves: 4 } } } });
    expect(calvesOf(met.session)).toHaveLength(0);
    expect(omitted(met.reasons, 'fb.calves')).toEqual(['weekly_target_met']);
    // Séance prévue plus tôt dans la semaine avec ses séries de mollets : même décision.
    const planned = propose({ ...base, ...F6, context: { ...base.context, week: { ...base.context.week, otherStrengthSessions: [{ intentId: 'plan.x', archetypeId: 'str_full_body', plannedHardSets: { calves: 4 }, done: false }] } } });
    expect(omitted(planned.reasons, 'fb.calves')).toEqual(['weekly_target_met']);
  });

  it('interférence genou / hanche (voisine) ⇒ omis, aucun signal d’interférence créé par l’emplacement résiduel', () => {
    const base = scenario({ minutes: 90 });
    const lowered = propose({ ...base, ...F6, context: { ...base.context, week: { otherStrengthSessions: [], neighbors: [{ discipline: 'running', stimulus: 'k', priority: 'key', hoursFromThisSession: 10, demand: { lower_knee: 'high', lower_hip: 'high' } }], known: true } } });
    expect(calvesOf(lowered.session)).toHaveLength(0);
    expect(omitted(lowered.reasons, 'fb.calves')).toEqual(['interference']);
  });

  it('sans machine à mollets ni haltères ⇒ omis (aucun exercice inventé, aucune version au poids du corps)', () => {
    const s = propose({ ...scenario({ minutes: 90, preset: 'preset.bodyweight', archetype: 'str_full_body' }), ...F6 });
    expect(calvesOf(s.session)).toHaveLength(0);
    expect(omitted(s.reasons, 'fb.calves')).toEqual(['no_candidate']);
  });

  it('séance trop courte : omis faute de temps, jamais au détriment d’un autre emplacement', () => {
    const s = propose({ ...scenario({ minutes: 45 }), ...F6 });
    if (calvesOf(s.session).length === 0) expect(omitted(s.reasons, 'fb.calves')).toEqual(['duration']);
    expect(s.reasons.filter((r) => r.code === 'SELECT.STIMULUS_PRESERVED' && (CALVES.has(String(r.params.slot)) || CALVES.has(String(r.params.removedSlot))))).toEqual([]);
  });

  it('leg curl et leg extension ne sont plus en concurrence avec les mollets (schéma `calf_raise`) ; Haut du corps sans mollets', () => {
    for (const minutes of [60, 90]) {
      const s = propose({ ...scenario({ minutes, archetype: 'str_lower', stimulus: 'strength_volume' }), ...F6 });
      const iso = items(s.session).filter((i) => (i.refs?.slotId ?? '') === 'lo.iso_lower').map((i) => i.exerciseId);
      expect(iso.some((x) => x.includes('calf'))).toBe(false);
      const up = propose({ ...scenario({ minutes, archetype: 'str_upper', stimulus: 'strength_volume' }), ...F6 });
      expect(items(up.session).some((i) => i.exerciseId.includes('calf'))).toBe(false);
    }
  });

  it('déterminisme : même entrée ⇒ même séance', () => {
    const base = { ...scenario({ minutes: 75, seed: 'f6-det' }), ...F6 };
    expect(JSON.stringify(propose(base).session)).toBe(JSON.stringify(propose(base).session));
  });
});
