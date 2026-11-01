/**
 * Reprise RC5 lot 4.2 — options PROPOSÉES, INACTIVES dans tout contenu publié :
 * - Q3 `shortWeek: 'alternate_region'` (règle de composition) : semaine courte impaire commençant par une séance Bas ;
 * - Q4 `volumeFitTieBreak: 'relative_deficit'` (politique de personnalisation) : contrat seulement ici, effet mesuré par le
 *   banc du lot 4.2.
 * Sans option : comportement strictement identique (rotation, ordre A/B, trace).
 */
import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@hybridsport/engine';
import { composeStrengthWeek, readStrengthParams, STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, zPersonalizationPolicy } from '../../src/index.js';
import type { StrengthComposeInput, StrengthCompositionRule } from '../../src/index.js';
import { strengthHautBasAbRulesetDocument } from '../fixtures/hautbas-ab.js';
import { PERSONALIZATION_V1, PERSONALIZATION_V1_1 } from '../../content/personalization-v1.js';

const r = loadRuleset(strengthHautBasAbRulesetDocument());
if (!r.ok) throw new Error('ruleset de test invalide');
const params = readStrengthParams(r.ruleset).values;
// technical-constant: TEST_ONLY — créneaux de 60 min (s)
const HOUR_S = 3600;
const days = (monday: string, n: number) => Array.from({ length: n }, (_, k) => ({ date: new Date(Date.parse(`${monday}T00:00:00Z`) + k * 2 * 86_400_000).toISOString().slice(0, 10), availableS: HOUR_S }));
const SHORT: StrengthCompositionRule = { ...STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, bands: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.bands.map((b) => ({ ...b, shortWeek: 'alternate_region' as const })) };
const input = (o: Partial<StrengthComposeInput>): StrengthComposeInput => ({ params, rule: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, mode: 'CANDIDATE', goal: { goal: 'hypertrophy' }, level: 'intermediate', weeklySessions: 4, days: days('2026-10-05', 4), ...o });
const composed = (x: ReturnType<typeof composeStrengthWeek>) => (x.status === 'composed' ? x.slots.map((s) => s.archetypeId) : x.status);

describe('Q3 — semaine courte (option inactive par défaut)', () => {
  it('règle candidate publiée : aucune option ; 3 jours sur 4 ⇒ la séance Bas tombe chaque semaine (constat)', () => {
    expect(STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.bands.some((b) => b.shortWeek !== undefined)).toBe(false);
    expect(composed(composeStrengthWeek(input({ days: days('2026-10-05', 3) })))).toEqual(['str_upper_a', 'str_lower_a', 'str_upper_b']);
    expect(composed(composeStrengthWeek(input({ days: days('2026-10-12', 3) })))).toEqual(['str_upper_b', 'str_lower_b', 'str_upper_a']);
  });
  it('option active : semaine impaire courte commençant par Bas (Bas B, Haut A, Bas A) ; trace `shortWeek`', () => {
    const odd = composeStrengthWeek(input({ rule: SHORT, days: days('2026-10-12', 3) }));
    expect(composed(odd)).toEqual(['str_lower_b', 'str_upper_a', 'str_lower_a']);
    expect(odd.reasons[0]?.params.shortWeek).toBe('alternate_region');
    // Semaine paire courte : inchangée ; sur deux semaines, 3 Haut et 3 Bas.
    expect(composed(composeStrengthWeek(input({ rule: SHORT, days: days('2026-10-05', 3) })))).toEqual(['str_upper_a', 'str_lower_a', 'str_upper_b']);
  });
  it('option active, semaine COMPLÈTE : identique à la règle publiée (ordre A/B, aucune trace)', () => {
    for (const monday of ['2026-10-05', '2026-10-12']) {
      const a = composeStrengthWeek(input({ days: days(monday, 4) }));
      const b = composeStrengthWeek(input({ rule: SHORT, days: days(monday, 4) }));
      expect(composed(b)).toEqual(composed(a));
      expect(b.reasons[0]?.params.shortWeek).toBeUndefined();
    }
  });
});

describe('Q4 / Q2 — options de politique (contrat)', () => {
  it('absent des politiques publiées 1.0 et 1.1 ; valeur fermée', () => {
    expect((PERSONALIZATION_V1 as { volumeFitTieBreak?: string }).volumeFitTieBreak).toBeUndefined();
    expect((PERSONALIZATION_V1_1 as { volumeFitTieBreak?: string }).volumeFitTieBreak).toBeUndefined();
    expect(zPersonalizationPolicy.safeParse({ ...PERSONALIZATION_V1_1, volumeFitTieBreak: 'relative_deficit' }).success).toBe(true);
    expect(zPersonalizationPolicy.safeParse({ ...PERSONALIZATION_V1_1, volumeFitTieBreak: 'largest' }).success).toBe(false);
  });
  it('Q2 `highWindow` : absent des politiques publiées ; valeur fermée', () => {
    for (const p of [PERSONALIZATION_V1, PERSONALIZATION_V1_1]) expect((p as { highWindow?: string }).highWindow).toBeUndefined();
    expect(zPersonalizationPolicy.safeParse({ ...PERSONALIZATION_V1_1, highWindow: 'calendar_and_rolling' }).success).toBe(true);
    expect(zPersonalizationPolicy.safeParse({ ...PERSONALIZATION_V1_1, highWindow: 'rolling' }).success).toBe(false);
  });
});
