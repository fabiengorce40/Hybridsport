/**
 * C4 — séance Cross-training COMPLÈTE (EXPÉRIMENTALE, gouvernance TEST_ONLY `c3Governance({ c4: true })`).
 * Pipeline CORE réel (`runCrossTrainingC2`). Vérifie : statut explicite, blocs tracés, bloc principal C3 INCHANGÉ,
 * temps disponible = plafond, cible produit jamais remplie artificiellement, matériel, douleur, fail-closed production.
 */
import { describe, expect, it } from 'vitest';
import type { CtStimulus } from '../../src/index.js';
import { capabilityState, CURRENT_CT_GOVERNANCE } from '../../src/index.js';
import { C3_REQUESTS, c3Governance, runC3Detailed, TEST_C3 } from '../c3-fixtures.js';
import type { C3Run } from '../c3-fixtures.js';
import { PROFILE_GYM, STATE_FRESH, pain } from '../../../engine/tests/harness/requests.js';
import { EQUIPMENT } from '../../../engine/tests/fixtures/catalog.js';
import { testCatalog } from '../../../engine/tests/fixtures/load.js';
import { ctCatalogDocument } from '../c4-catalog.js';

const FULL = { ...PROFILE_GYM, availableEquipment: EQUIPMENT.map((e) => e.id) };
const C4_REQ = [...C3_REQUESTS, 'ctFullSessionComposition'] as const;
const GOV = c3Governance({ c4: true });
/** Catalogue du port Cross-training (CORE + extension C4.2), comme en Beta 0. */
const CT_CATALOG = testCatalog(ctCatalogDocument());
type Block = { id: string; kind: string; format: string; items: { exerciseId: string }[] };

function run(o: C3Run & { c4?: boolean } = {}) {
  const { c4 = true, ...rest } = o;
  const r = runC3Detailed({ gov: GOV, profile: FULL, ...rest, ctx: { capabilityRequests: c4 ? [...C4_REQ] : [...C3_REQUESTS], ...rest.ctx } }, { catalog: CT_CATALOG });
  const reasons = r.compose?.ok ? r.compose.proposal.reasons : [];
  const status = reasons.find((x) => x.code === 'PLAN.CROSSTRAINING.C4_SESSION_STATUS')?.params as Record<string, unknown> | undefined;
  const result = r.outcome.result;
  const warn = result.status === 'ok' ? result.warnings.find((x) => x.code === 'PLAN.CROSSTRAINING.C4_SESSION_STATUS')?.params : undefined;
  const blocks = (result.status === 'ok' ? result.value.blocks : []) as unknown as Block[];
  return { r, status, warn, blocks, ok: result.status === 'ok', main: blocks.find((b) => b.kind === 'conditioning') };
}
const kinds = (bs: Block[]) => bs.map((b) => b.kind);

describe('C4 — statut explicite et fail-closed', () => {
  it('1. capacité non demandée ⇒ C3 inchangé, aucune trace C4', () => {
    const x = run({ c4: false });
    expect(x.ok).toBe(true);
    expect(x.status).toBeUndefined();
    expect(kinds(x.blocks)).toEqual(['conditioning']);
  });
  it('2. gouvernance sans valeurs C4 (production : NON RÉSOLU) ⇒ capacité inactive, C3 inchangé', () => {
    const x = run({ gov: c3Governance() });
    expect(x.status).toBeUndefined();
    expect(kinds(x.blocks)).toEqual(['conditioning']);
    // Gouvernance RÉELLE : capacité séance complète inactive en production comme en candidat (paramètres non résolus).
    expect(capabilityState('ctFullSessionComposition', CURRENT_CT_GOVERNANCE, 'PRODUCTION', true).enabled).toBe(false);
    expect(capabilityState('ctFullSessionComposition', CURRENT_CT_GOVERNANCE, 'CANDIDATE', true).enabled).toBe(false);
  });
  it('3. séance complète : échauffement général, spécifique, bloc principal, retour au calme ; statut FULL_SESSION tracé', () => {
    const x = run({ availableTimeS: 3600 });
    expect(x.ok).toBe(true);
    expect(x.status).toMatchObject({ status: 'FULL_SESSION', variant: 'long' });
    // C4.2 : l'échauffement spécifique peut ajouter un bloc d'accélérations (ergomètre du bloc principal non continu).
    const k = kinds(x.blocks);
    expect(k.slice(0, -2).every((y) => y === 'warmup')).toBe(true);
    expect(k.slice(-2)).toEqual(['conditioning', 'cooldown']);
    expect(k.filter((y) => y === 'warmup').length).toBeGreaterThanOrEqual(2);
    const traced = x.r.compose?.ok ? x.r.compose.proposal.reasons.filter((y) => y.code === 'PLAN.CROSSTRAINING.C4_BLOCK').map((y) => y.params.block) : [];
    expect(traced).toEqual(['warmup_general', 'warmup_specific', 'cooldown']);
    // Blocs non composables (technique, complémentaire) : TRACÉS, jamais inventés.
    expect(x.status?.notGenerated).toEqual(expect.arrayContaining(['skill', 'accessory']));
  });
  it('4. bloc principal STRICTEMENT identique à la composition C3 seule (même graine)', () => {
    for (const stimulus of ['mixed_modal_medium', 'aerobic_capacity', 'muscular_endurance', 'threshold'] as CtStimulus[]) {
      const a = run({ stimulus, c4: false, availableTimeS: 3600 });
      const b = run({ stimulus, availableTimeS: 3600 });
      expect(b.main?.items).toEqual(a.main?.items);
      expect(b.main?.format).toBe(a.main?.format);
    }
  });
  it('5. plan EXIGEANT un bloc non composable (force) ⇒ COMPOSITION_UNRESOLVED, bloc principal seul ; C3 qui refuse ⇒ aucune séance', () => {
    const gov = c3Governance({ c4: true, override: { 'ct.c4.sessionPlan': { mixed_modal_medium: { required: ['warmup_general', 'strength', 'conditioning', 'cooldown'], optional: [] } } } });
    const x = run({ gov, availableTimeS: 3600 });
    expect(x.status).toMatchObject({ status: 'COMPOSITION_UNRESOLVED', cause: 'REQUIRED_BLOCK_NOT_COMPOSABLE:strength' });
    expect(kinds(x.blocks)).toEqual(['conditioning']);
    // Stimulus force + conditioning : C3 refuse déjà (délégation Strength absente) ⇒ prescription bloquée, jamais de séance fictive.
    const y = run({ stimulus: 'strength_plus_conditioning', availableTimeS: 3600 });
    expect(y.ok).toBe(false);
    expect(y.blocks).toEqual([]);
  });
  it('6. plan non décidé pour un stimulus ⇒ MAIN_BLOCK_ONLY explicite', () => {
    const gov = c3Governance({ c4: true, override: { 'ct.c4.sessionPlan': { aerobic_capacity: { required: ['warmup_general', 'conditioning', 'cooldown'], optional: [] } } } });
    const x = run({ gov, availableTimeS: 3600 });
    expect(x.status).toMatchObject({ status: 'MAIN_BLOCK_ONLY', cause: 'SESSION_PLAN_UNDECIDED_FOR_STIMULUS' });
    expect(kinds(x.blocks)).toEqual(['conditioning']);
  });
});

describe('C4 — temps disponible (plafond) et cible produit 45–75 min (jamais remplie)', () => {
  const marginOf = (x: ReturnType<typeof run>) => Number(x.status?.plannedDurationS ?? 0);
  it.each([45, 60, 75])('7. %i min disponibles : durée planifiée ≤ disponible ; position par rapport à la cible tracée', (min) => {
    const x = run({ availableTimeS: min * 60 });
    expect(x.ok).toBe(true);
    expect(x.status?.status).toBe('FULL_SESSION');
    expect(marginOf(x)).toBeLessThanOrEqual(min * 60);
    expect(x.status).toMatchObject({ targetMinS: 2700, targetMaxS: 4500 });
    // S8 (C4.2) : la position par rapport à la cible est jugée sur l'estimation du CORE (en aval), jamais par le moteur.
    expect(x.status).toMatchObject({ target: 'core_estimate', cause: 'PLANNED_BLOCKS_COMPOSED' });
  });
  it('8. temps court : bloc principal seul (SESSION_EXCEEDS_AVAILABLE_TIME), jamais une séance complète tronquée', () => {
    for (const t of [900, 1500]) {
      const x = run({ availableTimeS: t });
      expect(x.status).toMatchObject({ status: 'MAIN_BLOCK_ONLY', cause: 'SESSION_EXCEEDS_AVAILABLE_TIME' });
      expect(kinds(x.blocks)).toEqual(['conditioning']);
    }
  });
  it('8b. le CORE refuse la séance complète (estimation multi-blocs hors temps) ⇒ repli tracé CORE_REFUSED_FULL_SESSION, bloc principal seul', () => {
    const x = run({ availableTimeS: 1800 });
    expect(x.ok).toBe(true);
    expect(x.warn).toMatchObject({ status: 'MAIN_BLOCK_ONLY', cause: 'CORE_REFUSED_FULL_SESSION' });
    expect(kinds(x.blocks)).toEqual(['conditioning']);
    expect(x.main?.items).toEqual(run({ availableTimeS: 1800, c4: false }).main?.items);
  });
});

describe('C4.2 — mobilité, échauffement spécifique progressif, équilibrage', () => {
  const block = (x: ReturnType<typeof run>, id: string) => x.blocks.find((b) => b.id.endsWith(id)) as unknown as { items: { exerciseId: string; prescription: { type: string; seconds?: number; workS?: number; sets?: { reps: number }[] } }[] } | undefined;
  const params = (x: ReturnType<typeof run>, b: string) => (x.r.compose?.ok ? x.r.compose.proposal.reasons.find((r) => r.code === 'PLAN.CROSSTRAINING.C4_BLOCK' && r.params.block === b)?.params : undefined);
  it('16. mobilité choisie par RÉGIONS du bloc principal (haut du corps ⇒ épaules) ; douleur d’épaule ⇒ mobilité d’épaule exclue', () => {
    const x = run({ availableTimeS: 3600 });
    const mob = (block(x, '.c4.cooldown')?.items ?? []).filter((i) => i.prescription.type === 'mobility').map((i) => i.exerciseId);
    expect(mob.length).toBeGreaterThan(0);
    expect(mob.length).toBeLessThanOrEqual(2);
    const regions = String((params(x, 'cooldown')?.criteria as string[] | undefined)?.find((c) => c.startsWith('mobility_regions:')) ?? '');
    if (regions.includes('upper')) expect(mob.some((m) => m === 'ex.shoulder_mobility_flow' || m === 'ex.thoracic_mobility_flow')).toBe(true);
    if (regions.includes('lower')) expect(mob).toContain('ex.hip_mobility_flow');
    const sore = run({ availableTimeS: 3600, state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['shoulder'] })] } });
    expect(sore.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).not.toContain('ex.shoulder_mobility_flow');
  });
  it('17. échauffement spécifique PROGRESSIF (rampe 30 / 50 / 70 %, tour à 80 % si coût technique ≥ 2, jamais 100 %) ; accélérations sur l’ergomètre du bloc principal', () => {
    for (const stimulus of ['mixed_modal_medium', 'muscular_endurance'] as CtStimulus[]) {
      const x = run({ stimulus, availableTimeS: 3600 });
      const ws = block(x, '.c4.warmup_specific');
      if (!ws) continue;
      const main = x.main?.items as unknown as { exerciseId: string; prescription: { reps?: number } }[];
      for (const it of ws.items) {
        const reps = (it.prescription.sets ?? []).map((z) => z.reps);
        expect(reps.length).toBeGreaterThanOrEqual(2);
        for (let k = 1; k < reps.length; k += 1) expect(reps[k] ?? 0).toBeGreaterThanOrEqual(reps[k - 1] ?? 0);
        const q = main.find((m) => m.exerciseId === it.exerciseId)?.prescription.reps;
        if (q !== undefined) expect(Math.max(...reps)).toBeLessThan(q);
      }
      const crit = (params(x, 'warmup_specific')?.criteria as string[] | undefined) ?? [];
      expect(crit.some((c) => c.startsWith('ramp:0.3/0.5/0.7'))).toBe(true);
      if ((x.main?.items ?? []).some((i) => i.exerciseId === 'ex.row_erg') && x.main?.format !== 'continuous') expect(crit).toContain('buildups:3x20s');
      if (crit.some((c) => c.startsWith('technical_extra_rounds'))) expect(crit.some((c) => c.includes('/0.8'))).toBe(true);
    }
  });
  it('18. retour au calme ≤ échauffement planifié (S7) sur tous les stimulus composés ; jamais allongé', () => {
    for (const stimulus of ['mixed_modal_medium', 'aerobic_capacity', 'threshold', 'anaerobic_intervals', 'muscular_endurance'] as CtStimulus[]) for (const availableTimeS of [2700, 3600, 4500]) {
      const x = run({ stimulus, availableTimeS });
      if (x.status?.status !== 'FULL_SESSION') continue;
      const d = (b: string) => Number(params(x, b)?.durationS ?? 0);
      expect(d('cooldown')).toBeLessThanOrEqual(d('warmup_general') + d('warmup_specific'));
    }
  });
});

describe('C4.1 — variante courte avant le repli', () => {
  it('14. CORE qui refuse la variante longue ⇒ variante courte essayée (C4_VARIANT_RETRY) ; jamais au-delà du temps disponible', () => {
    let retried = 0;
    for (let t = 1800; t <= 3600; t += 120) {
      const x = run({ availableTimeS: t });
      const warn = x.r.outcome.result.status === 'ok' ? x.r.outcome.result.warnings.find((w) => w.code === 'PLAN.CROSSTRAINING.C4_VARIANT_RETRY') : undefined;
      if (!warn) continue;
      retried += 1;
      expect(warn.params).toEqual({ refused: 'long', retried: 'short' });
      expect(x.status).toMatchObject({ status: 'FULL_SESSION', variant: 'short' });
      expect(Number(x.status?.plannedDurationS)).toBeLessThanOrEqual(t);
    }
    expect(retried).toBeGreaterThan(0);
  });
  it('15. raisons sans doublon (provenance commune C3 / C4 tracée une fois)', () => {
    const x = run({ availableTimeS: 3600 });
    const rs = x.r.compose?.ok ? x.r.compose.proposal.reasons : [];
    const keys = rs.map((r) => `${r.code}|${JSON.stringify(r.params)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('C4 — formats, niveaux, matériel, douleur', () => {
  const only = (stimulus: CtStimulus, format: string) => c3Governance({ c4: true, override: { 'ct.stimulus.admissibleFormats': { ...TEST_C3['ct.stimulus.admissibleFormats'], [stimulus]: [format] } } });
  it.each([
    ['aerobic_capacity', 'continuous'], ['aerobic_capacity', 'intervals'], ['aerobic_capacity', 'emom'], ['mixed_modal_medium', 'amrap'], ['mixed_modal_medium', 'for_time'],
  ] as [CtStimulus, string][])('9. %s / %s : séance complète ou statut explicite, bloc principal du format conservé', (stimulus, format) => {
    const x = run({ stimulus, gov: only(stimulus, format), availableTimeS: 4500 });
    expect(x.ok).toBe(true);
    expect(x.status).toBeDefined();
    expect(x.blocks.filter((b) => b.kind === 'conditioning')).toHaveLength(1);
    if (x.status?.status === 'FULL_SESSION') {
      expect(kinds(x.blocks)[0]).toBe('warmup');
      expect(kinds(x.blocks).at(-1)).toBe('cooldown');
    }
  });
  it.each(['beginner', 'intermediate', 'advanced'] as const)('10. niveau %s : statut explicite, aucun mouvement chargé hors bloc principal', (athleteLevel) => {
    const x = run({ profile: { ...FULL, athleteLevel }, availableTimeS: 3600 });
    expect(x.status).toBeDefined();
    for (const b of x.blocks.filter((y) => y.kind !== 'conditioning')) for (const it of b.items as unknown as { prescription: { load?: unknown; sets?: { load?: unknown }[] } }[]) {
      expect(it.prescription.load).toBeUndefined();
      expect((it.prescription.sets ?? []).every((s) => s.load === undefined)).toBe(true);
    }
  });
  it('11. sans ergomètre (C4.2) : échauffement général = circuit au poids du corps du réservoir gouverné, aucun ergomètre prescrit', () => {
    const x = run({ profile: { ...FULL, availableEquipment: ['pullup_bar', 'bands', 'box'] }, availableTimeS: 3600 });
    expect(x.status).toMatchObject({ status: 'FULL_SESSION' });
    const wg = x.blocks.find((b) => b.id.endsWith('.c4.warmup_general'));
    expect(wg?.items.map((i) => i.exerciseId)[0]).toBe('ex.jumping_jack');
    expect(wg?.items.length).toBeGreaterThan(1);
    expect(x.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)).filter((e) => e === 'ex.row_erg' || e === 'ex.skierg')).toEqual([]);
    // Retour au calme : élévation SANS impact (marche) puis mobilité, jamais les jumping jacks.
    const cd = x.blocks.find((b) => b.kind === 'cooldown');
    expect(cd?.items[0]?.exerciseId).toBe('ex.march_in_place');
    const crit = x.r.compose?.ok ? x.r.compose.proposal.reasons.find((r) => r.code === 'PLAN.CROSSTRAINING.C4_BLOCK' && r.params.block === 'warmup_general')?.params.criteria : [];
    expect(crit).toEqual(expect.arrayContaining(['no_eligible_ergometer', 'impact_max:2', 'pulse_raise:ex.jumping_jack']));
  });
  it('11b. niveau débutant (impact plafonné à 1) ou restriction « pas de saut » : marche sur place, jamais de jumping jacks', () => {
    const bw = { ...FULL, availableEquipment: ['pullup_bar', 'bands', 'box'] };
    for (const profile of [{ ...bw, athleteLevel: 'beginner' as const }, { ...bw, restrictions: ['no_jumping'] }]) {
      const x = run({ profile, availableTimeS: 3600 });
      if (!x.ok) continue;
      const wg = x.blocks.find((b) => b.id.endsWith('.c4.warmup_general'));
      expect(wg?.items[0]?.exerciseId).toBe('ex.march_in_place');
      expect(x.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).not.toContain('ex.jumping_jack');
    }
  });
  it('11c. catalogue sans réservoir d’échauffement et sans ergomètre ⇒ MAIN_BLOCK_ONLY explicite (aucun mouvement inventé)', () => {
    const r = runC3Detailed({ gov: GOV, profile: { ...FULL, availableEquipment: ['pullup_bar', 'bands', 'box'] }, availableTimeS: 3600, ctx: { capabilityRequests: [...C4_REQ] } });
    const st = r.compose?.ok ? r.compose.proposal.reasons.find((x) => x.code === 'PLAN.CROSSTRAINING.C4_SESSION_STATUS')?.params : undefined;
    expect(st).toMatchObject({ status: 'MAIN_BLOCK_ONLY', cause: 'NO_ELIGIBLE_GENERAL_WARMUP_MOVEMENT' });
  });
  it('12. sans rameur mais avec SkiErg : échauffement et retour au calme sur le mouvement monostructural DISPONIBLE', () => {
    const x = run({ profile: { ...FULL, availableEquipment: EQUIPMENT.map((e) => e.id).filter((e) => e !== 'rower') }, availableTimeS: 3600 });
    expect(x.status?.status).toBe('FULL_SESSION');
    expect(x.blocks.find((b) => b.id.endsWith('.c4.warmup_general'))?.items[0]?.exerciseId).toBe('ex.skierg');
    expect(x.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).not.toContain('ex.row_erg');
  });
  it('13. douleur active : C3 sans mouvement admissible ⇒ aucune séance (jamais d’échauffement seul) ; sinon blocs complémentaires filtrés comme le bloc principal', () => {
    const knee = run({ state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['knee'] })] }, availableTimeS: 3600 });
    expect(knee.ok).toBe(false);
    expect(knee.blocks).toEqual([]);
    const elbow = run({ state: { ...STATE_FRESH, activePain: [pain({ bodyAreas: ['elbow'], affectedMovements: ['pulling'] })] }, availableTimeS: 3600 });
    const main = elbow.main?.items.map((i) => i.exerciseId) ?? [];
    const spec = elbow.blocks.find((b) => b.id.endsWith('.c4.warmup_specific'))?.items.map((i) => i.exerciseId) ?? [];
    for (const e of spec) expect(main).toContain(e);
    expect(elbow.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).not.toContain('ex.band_assisted_pull_up');
  });
});
