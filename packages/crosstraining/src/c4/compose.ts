/**
 * C4 — SÉANCE CROSS-TRAINING COMPLÈTE (prototype EXPÉRIMENTAL) : complète le bloc principal composé par C3 (inchangé) par les
 * blocs que les règles gouvernées permettent de construire. Le CORE reste l'UNIQUE autorité de durée et de validation
 * (échauffement et retour au calme : incompressibles, aucun levier) ; si le CORE refuse la séance complète, le
 * planificateur la redemande SANS la capacité C4 (bloc principal seul, cause tracée). Capacité demandée par
 * `ctFullSessionComposition`.
 *
 *   C3 (bloc principal) → plan de séance (`ct.c4.sessionPlan`) → échauffement général / spécifique → retour au calme
 *            → durée PLANIFIÉE (valeurs gouvernées, variante longue puis courte) → statut explicite → CORE (autorité)
 *
 * - Aucune valeur sportive ici : durées, tours, fractions, plan de blocs et cible de durée viennent de la gouvernance
 *   (fail-closed). Plan non résolu (production) ⇒ le bloc principal C3 est rendu tel quel, sans trace C4 (comportement C3).
 * - Blocs force / compétence / complémentaire : NON générés (aucune délégation Strength, aucun modèle de compétence,
 *   aucune règle) ; requis par le plan ⇒ `COMPOSITION_UNRESOLVED` (bloc principal seul), facultatifs ⇒ tracés.
 * - Échauffement et retour au calme : kinds CORE `warmup` / `cooldown`, exclus de la charge et de l'interférence par
 *   le CORE et le planificateur (règle existante) ; aucun mouvement chargé ; aucune intensité chiffrée.
 * - La cible de durée (`ct.c4.sessionDurationTarget`) n'est JAMAIS une obligation : rien n'est allongé pour l'atteindre.
 * - Chaque choix est un classement déterministe tracé (`C4_BLOCK`), chaque absence a sa cause (`C4_BLOCK_NOT_GENERATED`).
 */
import type { Exercise, ReasonCode, SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import { readToleranceProfile } from '@hybridsport/engine';
import type { SportEngineInput } from '@hybridsport/engine';
import type { CtStimulus } from '../model.js';
import { CT_CODES, ctReasons } from '../codes.js';
import type { CrossTrainingContext } from '../context.js';
import { movementIssues } from '../c2.js';
import { capabilityState } from '../capabilities.js';
import type { CtGovernance } from '../governance/state.js';
import { readC3 } from '../c3/parameters.js';
import type { C4Block } from '../c3/parameters.js';
import type { C3Plan } from '../c3/compose.js';
import { movementRoles } from '../c3/taxonomy.js';

type Input = SportEngineInput<CrossTrainingContext>;
type Block = SessionDraftInput['blocks'][number];
export type C4Status = 'FULL_SESSION' | 'MAIN_BLOCK_ONLY' | 'COMPOSITION_UNRESOLVED';

/** Blocs que C4 v1 sait composer (les autres sont tracés NON générés). */
const COMPOSABLE: ReadonlySet<C4Block> = new Set(['warmup_general', 'warmup_specific', 'conditioning', 'cooldown']);
const NOT_COMPOSABLE_CAUSE: Readonly<Partial<Record<C4Block, string>>> = {
  strength: 'STRENGTH_ENGINE_DELEGATION_UNAVAILABLE', skill: 'SKILL_ACQUISITION_UNMODELLED', accessory: 'ACCESSORY_RULE_UNGOVERNED',
};
const VARIANTS = ['long', 'short'] as const;
// technical-constant: secondes par minute (débits gouvernés exprimés par minute)
const S_PER_MIN = 60;

export interface C4Outcome {
  readonly proposal: SportEngineProposalInput;
  readonly status: C4Status | null;
}

const asProposalReason = (r: ReasonCode): SportEngineProposalInput['reasons'][number] => ({
  ...r, params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) as Record<string, string | number | boolean | string[]>, ruleRefs: [...r.ruleRefs],
});

/**
 * Complète la proposition C3. Rend la proposition C3 INCHANGÉE (statut null) si le plan C4 n'est pas gouverné ; sinon
 * une proposition avec statut tracé : séance complète, ou bloc principal seul avec la cause.
 */
export function composeC4(input: Input, stimulus: CtStimulus, c3: { readonly plan: C3Plan; readonly proposal: SportEngineProposalInput }, governance: CtGovernance): C4Outcome {
  const mode = input.discipline.mode;
  // Capacité DEMANDÉE et active (paramètres C4 résolus dans le mode) ; sinon bloc principal C3 inchangé, sans trace.
  if (!input.discipline.capabilityRequests.includes('ctFullSessionComposition')) return { proposal: c3.proposal, status: null };
  const cap = capabilityState('ctFullSessionComposition', governance, mode, true);
  if (!cap.enabled) return { proposal: c3.proposal, status: null };
  const planRead = readC3(governance, 'ct.c4.sessionPlan', mode);
  if (!planRead.ok) return { proposal: c3.proposal, status: null };
  const trace: ReasonCode[] = [...cap.reasons, ...planRead.reasons];
  const level = input.profile.athleteLevel;
  const status = (s: C4Status, cause: string, extra: { generated?: string[]; notGenerated?: string[]; plannedS?: number; target?: { minS: number; maxS: number }; position?: string; variant?: string } = {}) => ctReasons.emit(CT_CODES.C4_SESSION_STATUS, {
    status: s, generated: extra.generated ?? ['conditioning'], notGenerated: extra.notGenerated ?? [], cause, plannedDurationS: extra.plannedS ?? 0,
    targetMinS: extra.target?.minS ?? 0, targetMaxS: extra.target?.maxS ?? 0, target: extra.position ?? 'unknown', variant: extra.variant ?? 'none',
  });
  // Une lecture de paramètre n'est tracée qu'une fois (capacité et lecture directe émettent la même provenance).
  const uniq = (xs: readonly ReasonCode[]) => [...new Map(xs.map((r) => [`${r.code}|${JSON.stringify(r.params)}`, r])).values()];
  const mainOnly = (s: C4Status, cause: string, more: ReasonCode[] = [], notGenerated: string[] = []): C4Outcome => ({
    proposal: { ...c3.proposal, reasons: [...c3.proposal.reasons, ...uniq([...trace, ...more, status(s, cause, { notGenerated })]).map(asProposalReason)] }, status: s,
  });

  const plan = planRead.value[stimulus];
  if (!plan) return mainOnly('MAIN_BLOCK_ONLY', 'SESSION_PLAN_UNDECIDED_FOR_STIMULUS');
  // Blocs que C4 ne sait pas composer : requis ⇒ composition non résolue ; facultatifs ⇒ tracés.
  const missing: ReasonCode[] = [];
  const requiredUnsupported = plan.required.filter((b) => !COMPOSABLE.has(b));
  for (const b of [...plan.required, ...plan.optional]) {
    if (COMPOSABLE.has(b)) continue;
    missing.push(ctReasons.emit(CT_CODES.C4_BLOCK_NOT_GENERATED, { block: b, required: plan.required.includes(b) ? 'required' : 'optional', cause: NOT_COMPOSABLE_CAUSE[b] ?? 'UNSUPPORTED' }));
  }
  if (requiredUnsupported.length > 0) return mainOnly('COMPOSITION_UNRESOLVED', `REQUIRED_BLOCK_NOT_COMPOSABLE:${requiredUnsupported.join(',')}`, missing, requiredUnsupported);

  const reads = [readC3(governance, 'ct.c4.warmup', mode), readC3(governance, 'ct.c4.cooldown', mode), readC3(governance, 'ct.c4.sessionDurationTarget', mode), readC3(governance, 'ct.composition.movementPool', mode), readC3(governance, 'ct.estimation.workRates', mode)] as const;
  for (const r of reads) trace.push(...r.reasons);
  const [wr, cr, tr, pr, rr] = reads;
  if (!wr.ok || !cr.ok || !tr.ok || !pr.ok || !rr.ok) return mainOnly('MAIN_BLOCK_ONLY', 'C4_PARAMETER_UNRESOLVED', missing);
  const warm = wr.value[level];
  const cool = cr.value[level];
  if (!warm || !cool) return mainOnly('MAIN_BLOCK_ONLY', 'LEVEL_UNDECIDED', missing);
  const rates = rr.value;
  /** Temps planifié d'une quantité au débit LENT gouverné (mêmes débits que C3) ; débit absent ⇒ infini (variante écartée). */
  const slowS = (exerciseId: string, reps: number): number => {
    const r = rates[exerciseId];
    const v = r?.unit === 'reps' ? r.rate[level]?.slow : undefined;
    return v === undefined ? Number.POSITIVE_INFINITY : (reps / v) * S_PER_MIN;
  };
  const wants = (b: C4Block) => plan.required.includes(b) || plan.optional.includes(b);

  // ——— Mouvement monostructural d'échauffement / retour au calme : éligible (matériel, douleur, restrictions,
  // exclusions, historique négatif), présent dans le bloc principal d'abord, puis coût technique, puis identifiant.
  const regionOf = new Map(input.catalog.document.taxonomy.patterns.map((p) => [p.id, p.region]));
  const mainIds = new Set(c3.plan.items.map((i) => i.exerciseId));
  const eligible = (e: Exercise | undefined, id: string) => e !== undefined && movementIssues(id, e, input, governance).length === 0 && !c3.plan.excludedByHistory.includes(id);
  const mono = pr.value.map((m) => input.catalog.exercise(m.movementId))
    .filter((e): e is Exercise => e !== undefined && movementRoles(e, regionOf.get(e.patterns.primary)).includes('monostructural') && eligible(e, e.id))
    .sort((a, b) => Number(mainIds.has(b.id)) - Number(mainIds.has(a.id)) || a.cost.technical - b.cost.technical || (a.id < b.id ? -1 : 1))[0];
  const needsMono = wants('warmup_general') || wants('cooldown');
  if (needsMono && !mono) return mainOnly('MAIN_BLOCK_ONLY', 'NO_ELIGIBLE_MONOSTRUCTURAL_MOVEMENT', missing);
  const mobility = [...input.catalog.exercises()].filter((e) => e.movementType === 'mobility' && eligible(e, e.id)).sort((a, b) => (a.id < b.id ? -1 : 1));

  // ——— Échauffement spécifique : mouvements à RÉPÉTITIONS du bloc principal, sans charge, fraction gouvernée des répétitions.
  const specificItems = c3.plan.items.filter((i) => i.quantity?.kind === 'reps' && i.loadKg === undefined);
  const base = input.intent.id;
  const blocksFor = (v: (typeof VARIANTS)[number]) => {
    const pick = (r: { min: number; max: number }) => (v === 'long' ? r.max : r.min);
    const out: { before: Block[]; after: Block[]; notes: ReasonCode[]; generated: string[]; covered: string[]; plannedS: number } = { before: [], after: [], notes: [], generated: [], covered: [], plannedS: 0 };
    if (wants('warmup_general') && mono) {
      const workS = pick(warm.generalS);
      out.plannedS += workS;
      out.before.push({ id: `${base}.c4.warmup_general`, kind: 'warmup', role: 'support', format: 'continuous', items: [{ id: `${base}.c4.wg.1`, exerciseId: mono.id, prescription: { type: 'timed', workS, rounds: 1, restS: 0 } }] });
      out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'warmup_general', kind: 'warmup', purpose: 'raise_temperature_easy_pace', durationS: workS, exercises: [mono.id], criteria: [mainIds.has(mono.id) ? 'in_main_block' : 'not_in_main_block', `technical_cost:${String(mono.cost.technical)}`], parameterIds: ['ct.c4.warmup', 'ct.composition.movementPool'] }));
      out.generated.push('warmup_general');
    }
    if (wants('warmup_specific')) {
      if (specificItems.length === 0) {
        // Bloc principal sans mouvement à répétitions (ergomètre seul) : l'échauffement général sur le même mouvement le prépare.
        out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK_NOT_GENERATED, { block: 'warmup_specific', required: plan.required.includes('warmup_specific') ? 'required' : 'optional', cause: 'COVERED_BY_GENERAL_WARMUP' }));
        out.covered.push('warmup_specific');
      } else {
        const items = specificItems.map((i, k) => ({ id: `${base}.c4.ws.${String(k + 1)}`, exerciseId: i.exerciseId, prescription: { type: 'sets' as const, sets: Array.from({ length: warm.specificRounds }, () => ({ kind: 'working' as const, reps: Math.max(1, Math.floor((i.quantity?.value ?? 1) * warm.specificFraction)), restAfterS: 0 })) } }));
        out.before.push({ id: `${base}.c4.warmup_specific`, kind: 'warmup', role: 'support', format: 'sets', grouping: 'circuit', restBetweenRoundsS: 0, items });
        const specificS = Math.ceil(items.reduce((acc, it) => acc + slowS(it.exerciseId, it.prescription.sets[0]?.reps ?? 0), 0) * warm.specificRounds);
        out.plannedS += specificS;
        out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'warmup_specific', kind: 'warmup', purpose: 'rehearse_main_block_movements_reduced_dose', durationS: specificS, exercises: items.map((x) => x.exerciseId), criteria: [`rounds:${String(warm.specificRounds)}`, `fraction:${String(warm.specificFraction)}`, 'no_load'], parameterIds: ['ct.c4.warmup'] }));
        out.generated.push('warmup_specific');
      }
    }
    if (wants('cooldown') && mono) {
      const easyS = pick(cool.easyS);
      const mobS = pick(cool.mobilityS);
      out.plannedS += easyS + (mobility[0] ? mobS : 0);
      const items: Block['items'] = [{ id: `${base}.c4.cd.1`, exerciseId: mono.id, prescription: { type: 'timed', workS: easyS, rounds: 1, restS: 0 } }];
      if (mobility[0]) items.push({ id: `${base}.c4.cd.2`, exerciseId: mobility[0].id, prescription: { type: 'mobility', seconds: mobS, sides: 1 } });
      out.after.push({ id: `${base}.c4.cooldown`, kind: 'cooldown', role: 'support', format: 'continuous', items });
      out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'cooldown', kind: 'cooldown', purpose: 'return_to_calm_easy_pace_and_mobility', durationS: easyS + (mobility[0] ? mobS : 0), exercises: items.map((x) => x.exerciseId), criteria: [mobility[0] ? `mobility_catalog:${mobility.map((m) => m.id).join('|')}` : 'mobility_unavailable', 'mobility_coverage_unmodelled'], parameterIds: ['ct.c4.cooldown'] }));
      out.generated.push('cooldown');
    }
    return out;
  };

  // ——— Durée PLANIFIÉE (valeurs gouvernées seulement : durées des blocs, débits lents, durée du bloc principal) contre le
  // temps disponible moins la marge du profil de tolérance : variante longue, sinon courte, sinon bloc principal seul. Le
  // CORE reste l'autorité (estimation complète, validation, retrait éventuel des blocs facultatifs).
  const c3Session = c3.proposal.session as SessionDraftInput;
  let marginS: number;
  try { marginS = readToleranceProfile(input.ruleset, c3Session.toleranceProfile).marginS; } catch { return mainOnly('MAIN_BLOCK_ONLY', 'TOLERANCE_PROFILE_UNAVAILABLE', missing); }
  const mainS = c3.plan.blockS;
  for (const v of VARIANTS) {
    const b = blocksFor(v);
    const plannedS = b.plannedS + mainS;
    if (!(plannedS <= input.intent.availableTimeS - marginS)) continue;
    const target = tr.value;
    const position = plannedS < target.minS ? 'below' : plannedS > target.maxS ? 'above' : 'within';
    const missingRequired = plan.required.filter((x) => x !== 'conditioning' && !b.generated.includes(x) && !b.covered.includes(x));
    if (missingRequired.length > 0) return mainOnly('MAIN_BLOCK_ONLY', `REQUIRED_BLOCK_NOT_GENERATED:${missingRequired.join(',')}`, missing, missingRequired);
    const session: SessionDraftInput = { ...c3Session, blocks: [...b.before, ...c3Session.blocks, ...b.after] };
    // Empreinte : volume de CHAQUE item (exigence du CORE) ; échauffement / retour au calme lus dans leur prescription.
    const volumeOf = (it: Block['items'][number]): number => {
      const p = it.prescription;
      return p.type === 'timed' ? p.workS * (p.rounds ?? 1) : p.type === 'mobility' ? p.seconds * (p.sides ?? 1) : p.type === 'sets' ? p.sets.reduce((a, x) => a + (typeof x.reps === 'number' ? x.reps : 0), 0) : 0;
    };
    const fp = c3.proposal.fingerprintInputs as { readonly volumeByItem?: Readonly<Record<string, number>> } & Readonly<Record<string, unknown>>;
    const volumeByItem = { ...fp.volumeByItem, ...Object.fromEntries([...b.before, ...b.after].flatMap((x) => x.items).map((it) => [it.id, volumeOf(it)])) };
    const notGenerated = [...missing.map((m) => String(m.params.block)), ...b.covered];
    const cause = position === 'within' ? 'WITHIN_PRODUCT_TARGET' : position === 'below' ? 'BELOW_PRODUCT_TARGET_NOT_FILLED' : 'ABOVE_PRODUCT_TARGET';
    const reasons = [...trace, ...b.notes, ...missing, status('FULL_SESSION', cause, { generated: [...b.generated, 'conditioning'], notGenerated, plannedS: Math.round(plannedS), target, position, variant: v })];
    return { proposal: { ...c3.proposal, session, fingerprintInputs: { ...fp, volumeByItem }, reasons: [...c3.proposal.reasons, ...uniq(reasons).map(asProposalReason)] }, status: 'FULL_SESSION' };
  }
  return mainOnly('MAIN_BLOCK_ONLY', 'SESSION_EXCEEDS_AVAILABLE_TIME', missing);
}
