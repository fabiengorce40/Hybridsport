/**
 * C4.3 — MODE BLOC Strength (archétype `str_ct_block`, TEST_ONLY) : bloc de force autonome pour une séance hôte
 * Cross-training. Strength reste propriétaire des exercices, séries, répétitions, repos et charges (règles existantes
 * de l'objectif `support:crosstraining`) ; aucune mobilité propre ; aucune track ni ancre (pas de doublon de progression).
 */
import { describe, expect, it } from 'vitest';
import { run, scenario } from '../fixtures/harness.js';

const BLOCK = { archetype: 'str_ct_block', stimulus: 'strength_general', context: { goal: { primary: { goal: 'support' as const, supportFor: 'crosstraining' as const } }, blockMode: { host: 'crosstraining' as const } } };
const codes = (r: ReturnType<typeof run>) => (r.result.status === 'ok' ? [] : r.result.status === 'error' ? r.result.error.reasons : r.result.reasons).map((x) => `${x.code}:${String(x.params.reason ?? '')}`);

describe('Strength — mode bloc (C4.3)', () => {
  it('1. bloc autonome : un besoin principal, séries de montée + travail, AUCUNE mobilité, dans le budget de temps', () => {
    for (const minutes of [15, 20, 25]) {
      const r = run(scenario({ ...BLOCK, minutes }));
      expect(r.result.status).toBe('ok');
      if (r.result.status !== 'ok') continue;
      const s = r.result.value;
      expect(s.blocks.map((b) => b.kind)).toEqual(['strength']);
      expect(s.blocks.flatMap((b) => b.items)).toHaveLength(1);
      const it0 = s.blocks[0]?.items[0];
      expect(it0?.prescription.type).toBe('sets');
      // Aucune track ni ancre : la progression reste portée par les séances Strength.
      expect(it0?.refs?.progressionTrackId).toBeUndefined();
      expect(it0?.refs?.anchor).toBeUndefined();
    }
  });
  it('2. fail-closed : archétype de bloc hors mode bloc, mode bloc sur archétype de séance, niveau avancé ⇒ refus', () => {
    const asSession = run(scenario({ archetype: 'str_ct_block', context: { goal: { primary: { goal: 'support', supportFor: 'crosstraining' } } } }));
    expect(codes(asSession).join()).toContain('block_archetype_requires_block_mode');
    const wrong = run(scenario({ archetype: 'str_support', context: { goal: { primary: { goal: 'support', supportFor: 'crosstraining' } }, blockMode: { host: 'crosstraining' } } }));
    expect(codes(wrong).join()).toContain('block_mode_requires_block_archetype');
    const advanced = run(scenario({ ...BLOCK, level: 'advanced', minutes: 20 }));
    expect(codes(advanced).join()).toContain('level_not_admitted');
  });
  it('3. alternance du besoin principal par exposition la moins récente (règle Strength existante)', () => {
    const first = run(scenario({ ...BLOCK, minutes: 20 }));
    if (first.result.status !== 'ok') throw new Error('bloc attendu');
    const ex = first.result.value.blocks[0]?.items[0]?.exerciseId ?? '';
    const next = run(scenario({ ...BLOCK, minutes: 20, context: { ...BLOCK.context, recentExposures: [{ exerciseId: ex, at: '2026-09-27T08:00:00Z', sets: [{ reps: 5, loadKg: 60 }] }] } }));
    if (next.result.status !== 'ok') throw new Error('bloc attendu');
    expect(next.result.value.blocks[0]?.items[0]?.exerciseId).not.toBe(ex);
  });
  it('4. budget trop court ⇒ refus explicite (jamais un bloc tronqué inventé)', () => {
    const r = run(scenario({ ...BLOCK, minutes: 4 }));
    expect(r.result.status).not.toBe('ok');
  });
});
