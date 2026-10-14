/**
 * RC3.2 A3 — matrice de faisabilité des intentions Cross-training, LUE DU MOTEUR RÉEL (sonde `ctIntentFeasibility`) :
 * préréglages de matériel × niveaux × intentions. Le rapport est régénéré à chaque exécution ; aucune table n'est écrite.
 */
import { describe, expect, it } from 'vitest';
import { createBeta0Programme, CT_INTENT_LABELS, ctIntentFeasibility, emptyState, EQUIPMENT_PRESETS, selectBeta0Week } from '../../src/index.js';
import type { CtIntentFeasibility, ProfileInput } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
// technical-constant: TEST_ONLY — disponibilités déclarées (minutes, lundi → dimanche)
const AVAIL = [60, 60, 60, 60, 60, 0, 0];
const ctProfile = (presetId: string, level: (typeof LEVELS)[number], o: Partial<ProfileInput> = {}): ProfileInput => {
  const pr = EQUIPMENT_PRESETS.find((x) => x.id === presetId);
  return profile({
    level, priorities: ['crosstraining'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 }, running: { ...profile().running, enabled: false },
    crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.mixed_modal_medium', returnState: 'NONE' }, equipment: { presetId, items: [...(pr?.equipment ?? [])] }, availability: AVAIL, ...o,
  });
};
const MATRIX = LEVELS.flatMap((level) => EQUIPMENT_PRESETS.map((pr) => ({ level, preset: pr.id, cells: ctIntentFeasibility(ctProfile(pr.id, level), clock('2026-10-07')) })));
const cell = (c: CtIntentFeasibility) => (c.status === 'feasible' ? '✅' : c.status === 'unknown' ? '?' : `❌ ${c.factors.join('+') || 'non attribuable'}`);

describe('A3 — faisabilité lue du moteur', () => {
  it('matrice préréglages × niveaux × intentions (rapport régénéré)', async () => {
    const intents = Object.keys(CT_INTENT_LABELS);
    const lines = [
      '# RC3.2 — Faisabilité des intentions Cross-training (sonde du moteur réel)', '',
      'Profil Cross-training seul, 1 séance/semaine, disponibilités 60 min du lundi au vendredi, sans coupure.',
      'Chaque case = planification réelle (programme → planificateur → moteur). ❌ : facteurs lus dans la trace du moteur.', '',
      `| niveau | matériel | ${intents.map((i) => CT_INTENT_LABELS[i]?.title ?? i).join(' | ')} |`,
      `|---|---|${intents.map(() => '---').join('|')}|`,
      ...MATRIX.map((r) => `| ${r.level} | ${r.preset.replace('preset.', '')} | ${r.cells.map(cell).join(' | ')} |`), '',
    ];
    await expect(lines.join('\n')).toMatchFileSnapshot('./__reports__/ct-feasibility.md');
  });

  it('aucun « inconnu » sur un profil complet ; chaque refus porte la cause décisive du moteur', () => {
    for (const r of MATRIX) for (const c of r.cells) {
      expect(c.status, `${r.level} ${r.preset} ${c.intent}`).not.toBe('unknown');
      if (c.status === 'infeasible') expect(c.cause?.code).toMatch(/CROSSTRAINING|PLANNER|SAFETY|FEASIBILITY/);
    }
  });

  it('constats A3 : « force + conditionnement » irréalisable avec haltères seules ou poids du corps ; « mixte » réalisable (intermédiaire)', () => {
    const at = (level: string, preset: string, intent: string) => MATRIX.find((r) => r.level === level && r.preset === preset)?.cells.find((c) => c.intent === intent);
    for (const p of ['preset.dumbbells_only', 'preset.bodyweight']) {
      expect(at('intermediate', p, 'crosstraining.strength_plus_conditioning')?.status).toBe('infeasible');
      expect(at('intermediate', p, 'crosstraining.mixed_modal_medium')?.status).toBe('feasible');
    }
    expect(at('intermediate', 'preset.full_gym', 'crosstraining.strength_plus_conditioning')?.status).toBe('feasible');
  });

  it('cohérence avec la planification réelle d’un profil complet : intention irréalisable ⇒ séance bloquée ; réalisable ⇒ composée', () => {
    for (const [preset, level] of [['preset.dumbbells_only', 'intermediate'], ['preset.full_gym', 'beginner'], ['preset.commercial_gym', 'intermediate']] as const) {
      for (const c of MATRIX.find((r) => r.level === level && r.preset === preset)?.cells ?? []) {
        const s = createBeta0Programme(emptyState(), ctProfile(preset, level, { crosstraining: { enabled: true, sessionsPerWeek: 2, intent: c.intent, returnState: 'NONE' } }), clock('2026-10-05'), {});
        const ct = (selectBeta0Week(s, '2026-10-05')?.sessions ?? []).filter((x) => x.sport === 'crosstraining');
        expect(ct.some((x) => x.placement !== 'blocked'), `${preset} ${level} ${c.intent}`).toBe(c.status === 'feasible');
      }
    }
  });

  it('coupure déclarée : refus de sécurité attribué (jamais présenté comme un problème de matériel)', () => {
    const r = ctIntentFeasibility(ctProfile('preset.full_gym', 'intermediate', { crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.mixed_modal_medium', returnState: 'LONG' } }), clock('2026-10-07'));
    for (const c of r) { expect(c.status).toBe('infeasible'); expect(c.factors).toEqual(['safety']); }
  });

  it('sonde pure et indépendante du jour : même résultat le lundi et le dimanche', () => {
    const p = ctProfile('preset.dumbbells_only', 'intermediate');
    expect(ctIntentFeasibility(p, clock('2026-10-11'))).toEqual(ctIntentFeasibility(p, clock('2026-10-05')));
  });
});
