/**
 * RC4.5 (O2) — lecture des paramètres `strength.*` mémorisée par ruleset chargé.
 * Conditions validées : clé = identité du ruleset chargé (immuable) ; aucune erreur de validation en cache ; aucun
 * résultat périmé entre deux versions de contenu ; rulesets et profils séparés ; décisions inchangées.
 */
import { describe, expect, it } from 'vitest';
import { proposeStrength, readStrengthParam, readStrengthParams } from '../../src/index.js';
import { strengthF6CatalogDocument, strengthF6RulesetDocument } from '../fixtures/f6.js';
import { strengthLockRulesetDocument } from '../fixtures/ruleset.js';
import { engineInput, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import type { Scenario } from '../fixtures/harness.js';

const lock = () => strengthRuleset(strengthLockRulesetDocument());
const f6 = () => strengthRuleset(strengthF6RulesetDocument());
const sessionOf = (s: Scenario): string => {
  const r = proposeStrength(engineInput(s));
  return JSON.stringify(r.status === 'proposals' ? r.proposals.map((p) => p.session) : r);
};

describe('RC4.5 O2 — cache des paramètres Strength', () => {
  it('même ruleset chargé ⇒ même résultat (mémorisé), identique à une lecture sur un chargement neuf', () => {
    const r = f6();
    const a = readStrengthParams(r);
    expect(readStrengthParams(r)).toBe(a);
    expect(JSON.stringify(readStrengthParams(f6()))).toBe(JSON.stringify(a));
    expect(readStrengthParam(r, 'strength.archetypes')).toBe(a.values['strength.archetypes']);
  });

  it('deux versions de contenu ⇒ deux résultats, sans contamination quel que soit l’ordre de lecture', () => {
    const [x, y] = [lock(), f6()];
    const ax = JSON.stringify(readStrengthParams(x));
    const ay = JSON.stringify(readStrengthParams(y));
    expect(ax).not.toBe(ay);
    expect(ay).toContain('lo.calves');
    expect(ax).not.toContain('lo.calves');
    for (let i = 0; i < 3; i += 1) {
      expect(JSON.stringify(readStrengthParams(y))).toBe(ay);
      expect(JSON.stringify(readStrengthParams(x))).toBe(ax);
    }
  });

  it('aucune erreur mise en cache : un paramètre invalide lève à chaque appel', () => {
    const doc = strengthF6RulesetDocument();
    const bad = strengthRuleset({ ...doc, parameters: doc.parameters.map((p) => (p.id === 'strength.archetypes' ? { ...p, value: [{ id: 'x' }] as never } : p)) });
    expect(() => readStrengthParams(bad)).toThrow();
    expect(() => readStrengthParams(bad)).toThrow();
    expect(() => readStrengthParam(bad, 'strength.archetypes')).toThrow();
  });

  it('aucun résultat périmé : un paramètre remplacé dans le ruleset est relu', () => {
    const r = f6();
    const before = readStrengthParams(r);
    // Remplacement simulé (le contrat est l'immuabilité ; la garde d'identité protège quand même la lecture).
    const params = (r as unknown as { params: Map<string, { value: unknown }> }).params;
    const meta = params.get('strength.archetypes');
    if (!meta) throw new Error('paramètre absent');
    params.set('strength.archetypes', { ...meta, value: (meta.value as { slots: unknown[] }[]).map((a) => ({ ...a, slots: a.slots.slice(0, -1) })) });
    const after = readStrengthParams(r);
    expect(after).not.toBe(before);
    expect(JSON.stringify(after.values['strength.archetypes'])).not.toBe(JSON.stringify(before.values['strength.archetypes']));
  });

  it('valeurs mémorisées gelées : aucune mutation partagée possible', () => {
    const v = readStrengthParams(f6()).values;
    expect(Object.isFrozen(v)).toBe(true);
    expect(Object.isFrozen(v['strength.archetypes'][0]?.slots)).toBe(true);
    expect(() => { (v['strength.archetypes'] as unknown as unknown[]).push({}); }).toThrow();
  });

  it('profils et rulesets entrelacés ⇒ séances identiques à l’ordre inverse (aucune fuite entre lectures)', () => {
    const catalog = strengthCatalog(strengthF6CatalogDocument());
    const cases = (['beginner', 'intermediate', 'advanced'] as const).flatMap((level) => ['str_full_body', 'str_lower'].flatMap((archetype) => [lock(), f6()].map((ruleset) => scenario({ level, archetype, minutes: 75, ruleset, catalog, stimulus: archetype === 'str_lower' ? 'strength_volume' : 'strength_general' }))));
    const forward = cases.map(sessionOf);
    const backward = [...cases].reverse().map(sessionOf).reverse();
    expect(backward).toEqual(forward);
  });
});
