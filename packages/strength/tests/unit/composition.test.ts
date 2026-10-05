/**
 * Strength S1 — composition hebdomadaire PROPRE au moteur Strength (`composeStrengthWeek`) : bandes de la règle
 * CANDIDATE (citation spec 02 §5), fail-closed hors bande, en PRODUCTION et sans règle ; ordre de rotation lu dans la
 * table gouvernée `strength.goals.needPriority` ; échange de jours selon la durée minimale de l'archétype ; déterminisme.
 */
import { describe, expect, it } from 'vitest';
import { loadRuleset } from '@hybridsport/engine';
import { composeStrengthWeek, readStrengthParams, STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } from '../../src/index.js';
import type { StrengthComposeInput } from '../../src/index.js';
import { strengthLockRulesetDocument } from '../fixtures/ruleset.js';

const loaded = loadRuleset(strengthLockRulesetDocument());
if (!loaded.ok) throw new Error('ruleset de test invalide');
const params = readStrengthParams(loaded.ruleset).values;
// technical-constant: TEST_ONLY — créneaux de 60 min (s) du lundi au dimanche
const HOUR_S = 3600;
const DATES = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
const days = (n: number, availableS = HOUR_S) => DATES.slice(0, n).map((date) => ({ date, availableS }));
const input = (o: Partial<StrengthComposeInput> & { n: number }): StrengthComposeInput => ({
  params, rule: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, mode: 'CANDIDATE', goal: { goal: 'hypertrophy' }, level: 'intermediate', weeklySessions: o.n, days: days(o.n), ...o,
});
const archetypes = (r: ReturnType<typeof composeStrengthWeek>) => (r.status === 'composed' ? r.slots.map((s) => s.archetypeId) : r.status);
const causeOf = (r: ReturnType<typeof composeStrengthWeek>) => (r.status === 'unresolved' ? r.reasons.map((x) => [x.code, x.params.cause]) : []);

describe('bandes de la règle candidate (spec Strength 02 §5)', () => {
  it.each([1, 2, 3])('%i séance(s) : full body à chaque séance (A1 « 1 à 3 séances »), autorité provisoire, règle tracée', (n) => {
    const r = composeStrengthWeek(input({ n }));
    expect(archetypes(r)).toEqual(Array(n).fill('str_full_body'));
    expect(r.status === 'composed' && r.authority).toBe('provisional');
    expect(r.reasons.map((x) => [x.code, x.params.status, x.params.band])).toEqual([['PLAN.WEEK_COMPOSITION', 'candidate', 'spec 02 §5.2 A1']]);
  });

  it('4 séances : haut / bas ×2 (§5.1), en alternance dans l’ordre des dates', () => {
    expect(archetypes(composeStrengthWeek(input({ n: 4 })))).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
  });

  it('première séance de la rotation : besoin le plus prioritaire de l’OBJECTIF (table gouvernée), jamais arbitraire', () => {
    // hypertrophie : push_horizontal en tête ⇒ haut du corps d'abord ; force et général : knee_dominant ⇒ bas du corps d'abord.
    const first = (goal: 'hypertrophy' | 'strength' | 'general') => { const r = composeStrengthWeek(input({ n: 4, goal: { goal } })); return r.status === 'composed' ? [r.slots[0]?.archetypeId, r.reasons[0]?.params.firstBy] : r.status; };
    expect(first('hypertrophy')).toEqual(['str_upper', 'push_horizontal']);
    expect(first('strength')).toEqual(['str_lower', 'knee_dominant']);
    expect(first('general')).toEqual(['str_lower', 'knee_dominant']);
  });

  it.each([5, 6, 7])('%i séances : aucune bande ⇒ refus explicite (fail-closed), aucun split inventé', (n) => {
    expect(causeOf(composeStrengthWeek(input({ n })))).toEqual([['RULE.WEEK_COMPOSITION_UNGOVERNED', 'frequency_not_covered']]);
  });

  it('PRODUCTION : règle candidate jamais résolue ; règle absente : refus', () => {
    expect(causeOf(composeStrengthWeek(input({ n: 2, mode: 'PRODUCTION' })))).toEqual([['RULE.WEEK_COMPOSITION_UNGOVERNED', 'rule_not_approved']]);
    expect(causeOf(composeStrengthWeek(input({ n: 2, rule: undefined })))).toEqual([['RULE.WEEK_COMPOSITION_UNGOVERNED', 'rule_absent']]);
    const approved = { ...STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, status: 'approved' as const };
    const r = composeStrengthWeek(input({ n: 2, mode: 'PRODUCTION', rule: approved }));
    expect(r.status === 'composed' && r.authority).toBe('approved');
  });

  it('archétype de la bande non admis pour l’objectif (soutien course à 4 séances) : refus, jamais un autre archétype', () => {
    expect(causeOf(composeStrengthWeek(input({ n: 4, goal: { goal: 'support', supportFor: 'running' } })))).toEqual([['RULE.WEEK_COMPOSITION_UNGOVERNED', 'goal_not_admitted:str_upper']]);
  });
});

describe('attribution des jours', () => {
  it('jour trop court pour l’archétype attribué (durée minimale du ruleset) : échange avec un jour de l’autre archétype, tracé', () => {
    const lowerMin = params['strength.archetypes'].find((a) => a.id === 'str_lower')?.duration.min ?? 0;
    const upperMin = params['strength.archetypes'].find((a) => a.id === 'str_upper')?.duration.min ?? 0;
    expect(upperMin).toBeLessThan(lowerMin);
    // Lundi haut, mardi bas (trop court pour le bas, assez pour le haut) ⇒ échange lundi ↔ mardi.
    const d = [{ date: DATES[0] ?? '', availableS: HOUR_S }, { date: DATES[1] ?? '', availableS: upperMin }, { date: DATES[2] ?? '', availableS: HOUR_S }, { date: DATES[3] ?? '', availableS: HOUR_S }];
    const r = composeStrengthWeek(input({ n: 4, days: d }));
    expect(archetypes(r)).toEqual(['str_lower', 'str_upper', 'str_upper', 'str_lower']);
    expect(r.reasons[0]?.params.swaps).toEqual([`${DATES[1] ?? ''}↔${DATES[0] ?? ''}`]);
  });

  it('jour imposé par le programme (verrouillé) : conservé hors rotation', () => {
    const d = [{ date: DATES[0] ?? '', availableS: HOUR_S, lockedArchetypeId: 'str_support' }, ...days(3).slice(1)];
    const r = composeStrengthWeek(input({ n: 3, days: d }));
    expect(r.status === 'composed' ? r.slots.map((s) => [s.archetypeId, s.role]) : r.status).toEqual([['str_support', 'LOCKED'], ['str_full_body', 'ROTATION'], ['str_full_body', 'ROTATION']]);
  });

  it('déterminisme : mêmes entrées ⇒ même composition ; ordre des jours en entrée sans effet', () => {
    const a = composeStrengthWeek(input({ n: 4 }));
    const b = composeStrengthWeek(input({ n: 4, days: [...days(4)].reverse() }));
    expect(b).toEqual(a);
  });
});
