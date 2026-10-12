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

const FULL = { ...PROFILE_GYM, availableEquipment: EQUIPMENT.map((e) => e.id) };
const C4_REQ = [...C3_REQUESTS, 'ctFullSessionComposition'] as const;
const GOV = c3Governance({ c4: true });
type Block = { id: string; kind: string; format: string; items: { exerciseId: string }[] };

function run(o: C3Run & { c4?: boolean } = {}) {
  const { c4 = true, ...rest } = o;
  const r = runC3Detailed({ gov: GOV, profile: FULL, ...rest, ctx: { capabilityRequests: c4 ? [...C4_REQ] : [...C3_REQUESTS], ...rest.ctx } });
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
    expect(kinds(x.blocks)).toEqual(['warmup', 'warmup', 'conditioning', 'cooldown']);
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
    expect(['below', 'within', 'above']).toContain(x.status?.target);
    // La cible n'est JAMAIS une obligation : aucune séance allongée (variante longue au plus).
    if (x.status?.target === 'below') expect(x.status.cause).toBe('BELOW_PRODUCT_TARGET_NOT_FILLED');
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
  it('11. matériel au poids du corps (aucun ergomètre) ⇒ MAIN_BLOCK_ONLY (NO_ELIGIBLE_MONOSTRUCTURAL_MOVEMENT), jamais d’ergomètre prescrit', () => {
    const x = run({ profile: { ...FULL, availableEquipment: ['pullup_bar', 'bands', 'box'] }, availableTimeS: 3600 });
    expect(x.status).toMatchObject({ status: 'MAIN_BLOCK_ONLY', cause: 'NO_ELIGIBLE_MONOSTRUCTURAL_MOVEMENT' });
    expect(kinds(x.blocks)).toEqual(['conditioning']);
    expect(x.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)).filter((e) => e === 'ex.row_erg' || e === 'ex.skierg')).toEqual([]);
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
