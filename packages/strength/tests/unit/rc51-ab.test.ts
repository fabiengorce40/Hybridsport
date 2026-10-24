/**
 * RC5.1 — Haut A/B et Bas A/B (contenu 0.8.0, objectif hypertrophie) : membre PRÉFÉRÉ d'un groupe de choix (repli si
 * infaisable), ancre de l'emplacement préféré déclarée d'abord, ordre A/B alterné selon la parité calendaire, rotation
 * A/B réservée à l'objectif et au contenu qui la déclarent (repli sur la rotation commune sinon).
 */
import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@hybridsport/engine';
import { composeStrengthWeek, declarableAnchors, findArchetype, readStrengthParams, resolveSlots, STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } from '../../src/index.js';
import type { AnchorTrack, StrengthComposeInput } from '../../src/index.js';
import { strengthLockRulesetDocument } from '../fixtures/ruleset.js';
import { RC51_RULESET_VERSION, strengthRc51RulesetDocument } from '../fixtures/rc51.js';

const load = (doc: ReturnType<typeof strengthRc51RulesetDocument>) => {
  const r = loadRuleset(doc);
  if (!r.ok) throw new Error('ruleset de test invalide');
  return r.ruleset;
};
const rc51 = load(strengthRc51RulesetDocument());
const params = readStrengthParams(rc51).values;
const lockParams = readStrengthParams(load(strengthLockRulesetDocument())).values;
const arch = (id: string) => { const a = findArchetype(params, id); if (!a) throw new Error(id); return a; };
const chosen = (r: ReturnType<typeof resolveSlots>) => [...r.required, ...r.optional].map((s) => s.def.id);

describe('contenu RC5.1 0.8.0', () => {
  it('version, quatre archétypes A/B ajoutés, archétypes antérieurs conservés', () => {
    expect(rc51.version).toBe(RC51_RULESET_VERSION);
    const ids = params['strength.archetypes'].map((a) => a.id);
    for (const id of ['str_full_body', 'str_upper', 'str_lower', 'str_upper_a', 'str_upper_b', 'str_lower_a', 'str_lower_b']) expect(ids).toContain(id);
  });
});

describe('groupe de choix : membre préféré, repli', () => {
  const none = () => 0;
  it('Haut A : poussée horizontale et tirage vertical principaux ; Haut B : miroir', () => {
    const a = resolveSlots(arch('str_upper_a'), params, 'hypertrophy', 'strength_volume', none);
    const b = resolveSlots(arch('str_upper_b'), params, 'hypertrophy', 'strength_volume', none);
    const needOf = (r: typeof a, role: string) => [...r.required, ...r.optional].filter((s) => s.def.role === role).map((s) => s.def.need);
    expect(needOf(a, 'primary')).toEqual(['push_horizontal']);
    expect(needOf(b, 'primary')).toEqual(['push_vertical']);
    expect(a.choices.some((c) => c.cause === 'preferred')).toBe(true);
  });

  it('le membre préféré l’emporte sur l’exposition la moins récente', () => {
    // Exposition récente FORTE du besoin préféré : sans préférence, l'autre membre serait choisi.
    const recent = (need: string) => (need === 'push_horizontal' ? 1 : 0);
    const r = resolveSlots(arch('str_upper_a'), params, 'hypertrophy', 'strength_volume', recent);
    expect(r.required.find((s) => s.def.role === 'primary')?.def.need).toBe('push_horizontal');
  });

  it('membre préféré infaisable (douleur, matériel) : repli sur un autre membre faisable du groupe', () => {
    const feasible = (s: { need: string }) => s.need !== 'push_horizontal';
    const r = resolveSlots(arch('str_upper_a'), params, 'hypertrophy', 'strength_volume', () => 0, () => false, feasible);
    const main = r.required.find((s) => s.def.role === 'primary');
    expect(main?.def.need).not.toBe('push_horizontal');
    expect(main).toBeDefined();
  });

  it('une ancre existante prime sur la préférence (stabilité des exercices en place)', () => {
    const a = arch('str_upper_a');
    const other = a.slots.find((s) => s.role === 'primary' && s.preferred !== true);
    expect(other).toBeDefined();
    const r = resolveSlots(a, params, 'hypertrophy', 'strength_volume', () => 0, (id) => id === other?.id);
    expect(chosen(r)).toContain(other?.id);
  });
});

describe('ancres déclarables : emplacement préféré d’abord', () => {
  it('deux ancres actives du même groupe : celle du membre préféré est déclarée, même si elle est la plus récente', () => {
    const a = arch('str_lower_a');
    const main = a.slots.filter((s) => s.role === 'primary');
    const pref = main.find((s) => s.preferred === true);
    const alt = main.find((s) => s.preferred !== true && s.choiceGroup === pref?.choiceGroup);
    expect(pref && alt).toBeTruthy();
    const track = (slotId: string, ex: string): AnchorTrack => ({ trackId: `t.${slotId}`, tier: 'anchor', status: 'active', archetypeId: 'str_lower_a', slotId, exerciseId: ex });
    const tracks = [track(pref?.id ?? '', 'ex.pref'), track(alt?.id ?? '', 'ex.alt')];
    const exposures = [{ exerciseId: 'ex.alt', at: '2026-10-01T10:00:00Z' }, { exerciseId: 'ex.pref', at: '2026-10-08T10:00:00Z' }];
    expect(declarableAnchors(tracks, exposures, 'str_lower_a', params).map((t) => t.exerciseId)).toEqual(['ex.pref']);
  });
});

describe('composition hebdomadaire RC5.1', () => {
  // technical-constant: TEST_ONLY — créneaux de 60 min (s)
  const HOUR_S = 3600;
  const week = (monday: string) => Array.from({ length: 4 }, (_, k) => ({ date: new Date(Date.parse(`${monday}T00:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10), availableS: HOUR_S }));
  const input = (o: Partial<StrengthComposeInput>): StrengthComposeInput => ({
    params, rule: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, mode: 'CANDIDATE', goal: { goal: 'hypertrophy' }, level: 'intermediate', weeklySessions: 4, days: week('2026-10-05'), ...o,
  });
  const composed = (r: ReturnType<typeof composeStrengthWeek>) => (r.status === 'composed' ? r.slots.map((s) => s.archetypeId) : r.status);

  it('semaine paire : ordre A (Haut A, Bas A, Haut B, Bas B) ; semaine impaire : ordre B', () => {
    const a = composeStrengthWeek(input({ days: week('2026-10-05') }));
    const b = composeStrengthWeek(input({ days: week('2026-10-12') }));
    expect(composed(a)).toEqual(['str_upper_a', 'str_lower_a', 'str_upper_b', 'str_lower_b']);
    expect(composed(b)).toEqual(['str_upper_b', 'str_lower_b', 'str_upper_a', 'str_lower_a']);
    expect(a.reasons[0]?.params.weekOrder).toBe('A');
    expect(b.reasons[0]?.params.weekOrder).toBe('B');
    expect(a.reasons[0]?.params.band).toBe('spec 02 §5.1 ; RC5.1');
  });

  it('parité calendaire : même semaine ⇒ même ordre, quel que soit le premier jour disponible ; déterministe', () => {
    const late = [{ date: '2026-10-08', availableS: HOUR_S }, { date: '2026-10-09', availableS: HOUR_S }, { date: '2026-10-10', availableS: HOUR_S }, { date: '2026-10-11', availableS: HOUR_S }];
    expect(composeStrengthWeek(input({ days: late })).reasons[0]?.params.weekOrder).toBe('A');
    expect(composeStrengthWeek(input({}))).toEqual(composeStrengthWeek(input({})));
  });

  it('force et forme générale : rotation commune inchangée (Haut / Bas), aucune trace d’ordre A/B', () => {
    for (const goal of ['strength', 'general'] as const) {
      const r = composeStrengthWeek(input({ goal: { goal } }));
      expect(composed(r)).toEqual(['str_lower', 'str_upper', 'str_lower', 'str_upper']);
      expect(r.reasons[0]?.params.weekOrder).toBeUndefined();
    }
  });

  it('contenu antérieur sans archétypes A/B : repli sur la rotation commune (aucun refus)', () => {
    expect(composed(composeStrengthWeek(input({ params: lockParams })))).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
  });

  it('1 à 3 séances : Full Body inchangé', () => {
    expect(composed(composeStrengthWeek(input({ weeklySessions: 3, days: week('2026-10-05').slice(0, 3) })))).toEqual(['str_full_body', 'str_full_body', 'str_full_body']);
  });
});
