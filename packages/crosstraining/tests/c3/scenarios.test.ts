/**
 * C3 — scénarios A (Cross-training seul), D (30 min), E (matériel limité), F (douleur / exclusion), plus l'aperçu de
 * tous les stimuli. Gouvernance TEST_ONLY (c3-fixtures.ts), pipeline CORE réel. B et C (multisport) : planner/tests.
 * Rapport : __reports__/c3-scenarios.md.
 */
import { describe, expect, it } from 'vitest';
import { CT_STIMULI, CURRENT_CT_GOVERNANCE, presentC3 } from '../../src/index.js';
import type { CtStimulus } from '../../src/index.js';
import { C3_REQUESTS, c3Governance, runC3Detailed } from '../c3-fixtures.js';
import type { C3Run } from '../c3-fixtures.js';
import { PROFILE_GYM, STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';
import { EQUIPMENT } from '../../../engine/tests/fixtures/catalog.js';
import { testCatalog, testRuleset } from '../../../engine/tests/fixtures/load.js';
import { TEST_DOSE_NORMALIZATION, withDemand } from '../../../planner/tests/simulation.js';
import { demandOf, scenarioMarkdown, writeReport } from './report.js';

const FULL = { ...PROFILE_GYM, availableEquipment: EQUIPMENT.map((e) => e.id) };
const BODYWEIGHT = { ...PROFILE_GYM, availableEquipment: ['pullup_bar', 'bands'] };
// technical-constant: TEST_ONLY — temps disponibles des scénarios (s)
const MIN60 = 3600;
// technical-constant: TEST_ONLY
const MIN30 = 1800;
// technical-constant: TEST_ONLY — normalisation des mètres / calories Cross-training pour LIRE le profil de demande du rapport
const CT_NORMALIZATION = { ...TEST_DOSE_NORMALIZATION, crosstraining: { ...TEST_DOSE_NORMALIZATION.crosstraining, meter: { perUnit: 0.01, intensityBand: 'high' }, calorie: { perUnit: 0.2, intensityBand: 'high' } } };
const content = withDemand({ ruleset: testRuleset(), catalog: testCatalog() }, CT_NORMALIZATION);

function view(title: string, context: string, o: C3Run) {
  const r = runC3Detailed(o);
  return { r, md: scenarioMarkdown({ title, context, outcome: r.outcome, compose: r.compose, demand: demandOf(r.outcome, content.catalog, content.ruleset) }) };
}
const sections: string[] = [];

describe('C3 — scénarios (TEST_ONLY)', () => {
  it('A — Cross-training seul, intermédiaire, 60 min, matériel complet : AMRAP mixte, chaque mouvement a une raison', () => {
    const { r, md } = view('Scénario A — Cross-training seul (intermédiaire, 60 min, matériel complet)', 'Stimulus `mixed_modal_medium`, historique vide.', { profile: FULL, availableTimeS: MIN60 });
    sections.push(md);
    expect(r.outcome.result.status).toBe('ok');
    expect(r.compose?.ok).toBe(true);
    if (!r.compose?.ok) return;
    const p = r.compose.plan;
    expect(p.format).toBe('amrap');
    expect(p.items.map((i) => i.role)).toEqual(['monostructural', 'lower_body', 'upper_pull']);
    expect(p.items.every((i) => i.criteria.length > 0)).toBe(true);
    expect(p.structure).toEqual(['warmup', 'conditioning']);
    expect(presentC3(p).notGenerated).toEqual(['warmup']);
    expect(presentC3(p).blocks[0]?.chrono).toEqual({ kind: 'countdown', totalS: p.blockS });
  });

  it('A bis — chaque stimulus composable (TEST_ONLY) ; blocs force / compétence, chipper et benchmark refusés', () => {
    const rows: string[] = ['## Aperçu par stimulus (intermédiaire, 60 min, matériel complet)', '', '| Stimulus | Résultat | Format | Mouvements | Durée |', '|---|---|---|---|---|'];
    for (const stimulus of CT_STIMULI) {
      const { r } = view(stimulus, '', { stimulus, profile: FULL, availableTimeS: MIN60 });
      const c = r.compose;
      if (c?.ok) rows.push(`| ${stimulus} | composé | ${c.plan.format} | ${c.plan.items.map((i) => i.exerciseId).join(', ')} | ${c.plan.durationKind} ${String(c.plan.blockS)} s |`);
      else rows.push(`| ${stimulus} | refus | — | — | ${(c?.reasons ?? []).filter((x) => /C3_(STRUCTURE_UNAVAILABLE|STIMULUS_OUT_OF_SCOPE|NO_FORMAT)/.test(x.code)).map((x) => `${x.code.split('.').at(-1) ?? ''} ${String(x.params.cause ?? x.params.tried)}`).join(' ')} |`);
      const expected: Partial<Record<CtStimulus, boolean>> = { strength_plus_conditioning: false, skill_plus_conditioning: false, long_chipper: false, benchmark: false };
      expect(c?.ok).toBe(expected[stimulus] ?? true);
    }
    sections.push(rows.join('\n'), '');
  });

  it('D — 30 min : séance prescrite tenant dans le temps ; 20 min en capacité aérobie ⇒ refus (aucune compression)', () => {
    const { r, md } = view('Scénario D — 30 min (intermédiaire)', 'Stimulus `mixed_modal_medium`, 30 min disponibles.', { profile: FULL, availableTimeS: MIN30 });
    sections.push(md);
    expect(r.compose?.ok && r.compose.plan.blockS <= MIN30).toBe(true);
    // technical-constant: TEST_ONLY — 20 min
    const { r: r20, md: md20 } = view('Scénario D bis — 20 min en capacité aérobie', 'Stimulus `aerobic_capacity`, 20 min : toutes les doses TEST_ONLY dépassent le temps.', { stimulus: 'aerobic_capacity', profile: FULL, availableTimeS: 1200 });
    sections.push(md20);
    expect(r20.compose?.ok).toBe(false);
    expect(r20.outcome.result.status).toBe('error');
  });

  it('E — matériel limité (barre de traction + élastiques) : EMOM poids du corps, aucun ergomètre inventé', () => {
    const { r, md } = view('Scénario E — matériel limité', 'Barre de traction et élastiques seulement.', { profile: BODYWEIGHT, availableTimeS: MIN60 });
    sections.push(md);
    expect(r.compose?.ok).toBe(true);
    if (!r.compose?.ok) return;
    expect(r.compose.plan.format).toBe('emom');
    expect(r.compose.plan.rejectedFormats.map((f) => f.format)).toEqual(['amrap', 'for_time']);
  });

  it('F — douleur genou : sans politique de charge ⇒ refus (rôle bas du corps intenable) ; avec charges TEST_ONLY ⇒ kettlebell swing chargé', () => {
    const o: C3Run = { profile: { ...FULL, excludedExercises: ['ex.push_up'] }, state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'] })] }, availableTimeS: MIN60 };
    const { r, md } = view('Scénario F — douleur (genou) et exclusion (push-up), sans politique de charge', 'Douleur P2 genou déclarée ; push-up exclu par l’utilisateur ; `ct.load.*` non résolus.', o);
    sections.push(md);
    expect(r.compose?.ok).toBe(false);
    const reasons = r.compose?.ok ? [] : r.compose?.reasons ?? [];
    const rejected = reasons.filter((x) => x.code.endsWith('C3_CANDIDATES_REJECTED')).flatMap((x) => x.params.rejected as string[]);
    expect(rejected.some((x) => x.startsWith('ex.air_squat:') && x.includes('PAIN_AREA'))).toBe(true);
    expect(rejected.some((x) => x.startsWith('ex.kb_swing:') && x.includes('LOAD_POLICY_UNGOVERNED'))).toBe(true);
    const loaded = view('Scénario F bis — même douleur, charges TEST_ONLY (CORE_EXT_C1 + standards d’implément)', 'Politique de charge injectée (TEST_ONLY) : le swing (charnière, non sensible au genou) devient admissible.', { ...o, gov: c3Governance({ loads: true }) });
    sections.push(loaded.md);
    expect(loaded.r.outcome.result.status).toBe('ok');
    if (!loaded.r.compose?.ok) throw new Error('F bis : composition attendue');
    const ids = loaded.r.compose.plan.items.map((i) => i.exerciseId);
    expect(ids).toContain('ex.kb_swing');
    expect(ids).not.toContain('ex.push_up');
    expect(ids.filter((id) => ['ex.air_squat', 'ex.reverse_lunge_bw', 'ex.box_jump', 'ex.wall_ball'].includes(id))).toEqual([]);
    expect(loaded.r.compose.plan.items.find((i) => i.exerciseId === 'ex.kb_swing')?.loadKg).toBeDefined();
  });

  it('gouvernance RÉELLE (registre C1) : chaque stimulus refusé, en CANDIDATE comme en PRODUCTION', () => {
    for (const mode of ['CANDIDATE', 'PRODUCTION'] as const) {
      for (const stimulus of CT_STIMULI) {
        const r = runC3Detailed({ stimulus, gov: CURRENT_CT_GOVERNANCE, ctx: { mode, capabilityRequests: [...C3_REQUESTS] } }, {});
        expect(r.outcome.result.status).toBe('error');
      }
    }
    expect(c3Governance()).toBeDefined();
    writeReport(new URL('./__reports__/c3-scenarios.md', import.meta.url).pathname, 'Cross-training C3 — scénarios A, D, E, F', sections);
  });
});
