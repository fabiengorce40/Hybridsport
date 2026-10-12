/**
 * C4 / C4.2 — SÉANCE CROSS-TRAINING COMPLÈTE (prototype EXPÉRIMENTAL) : complète le bloc principal composé par C3
 * (inchangé) par les blocs que les règles gouvernées permettent de construire. Le CORE reste l'UNIQUE autorité de durée
 * et de validation ; s'il refuse la variante longue, le port essaie la variante courte, puis le bloc principal seul.
 *
 *   C3 (bloc principal) → plan de séance (`ct.c4.sessionPlan`) → échauffement général (ergomètre, sinon circuit au poids
 *   du corps du réservoir `ct.c4.generalWarmupPool`) → échauffement spécifique progressif (rampe, tour technique,
 *   accélérations sur l'ergomètre) → retour au calme (allure facile + mobilité par régions `ct.c4.mobilityPool`, plafonné
 *   à l'échauffement) → durée PLANIFIÉE (variante longue puis courte) → statut explicite → CORE (autorité)
 *
 * - Aucune valeur sportive ici : durées, rampes, réservoirs, plafonds et cible viennent de la gouvernance (fail-closed ;
 *   production : NON RÉSOLU ⇒ bloc principal C3 rendu tel quel).
 * - Force (délégation Strength par le planificateur, NON RÉSOLUE), technique, complémentaire : NON générés et tracés.
 * - Échauffement / retour au calme : kinds CORE `warmup` / `cooldown`, exclus de la charge et de l'interférence ; aucun
 *   mouvement chargé ; aucune intensité chiffrée (« facile », « progressif »).
 * - Cible 45–75 min (S8) : jugée en aval sur l'estimation du CORE ; JAMAIS une obligation de remplissage.
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
/** Ordre de départage des régions (fixe, non sportif). */
const REGION_ORDER = ['lower', 'upper', 'core', 'full'];
// technical-constant: secondes par minute (débits gouvernés exprimés par minute)
const S_PER_MIN = 60;

export interface C4Outcome {
  readonly proposal: SportEngineProposalInput;
  readonly status: C4Status | null;
}

const asProposalReason = (r: ReasonCode): SportEngineProposalInput['reasons'][number] => ({
  ...r, params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v])) as Record<string, string | number | boolean | string[]>, ruleRefs: [...r.ruleRefs],
});

/** Une raison identique (code et paramètres) n'est persistée qu'une fois : C3 et C4 lisent des paramètres communs. */
const merged = (a: SportEngineProposalInput['reasons'], b: readonly ReasonCode[]): SportEngineProposalInput['reasons'] => {
  const seen = new Set(a.map((r) => `${r.code}|${JSON.stringify(r.params)}`));
  return [...a, ...b.filter((r) => { const k = `${r.code}|${JSON.stringify(r.params)}`; if (seen.has(k)) return false; seen.add(k); return true; }).map(asProposalReason)];
};

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
  const mainOnly = (s: C4Status, cause: string, more: ReasonCode[] = [], notGenerated: string[] = []): C4Outcome => ({
    proposal: { ...c3.proposal, reasons: merged(c3.proposal.reasons, [...trace, ...more, status(s, cause, { notGenerated })]) }, status: s,
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

  const reads = [
    readC3(governance, 'ct.c4.warmup', mode), readC3(governance, 'ct.c4.cooldown', mode), readC3(governance, 'ct.c4.sessionDurationTarget', mode),
    readC3(governance, 'ct.composition.movementPool', mode), readC3(governance, 'ct.estimation.workRates', mode),
    readC3(governance, 'ct.c4.generalWarmupPool', mode), readC3(governance, 'ct.c4.generalWarmupCircuit', mode), readC3(governance, 'ct.c4.mobilityPool', mode),
  ] as const;
  for (const r of reads) trace.push(...r.reasons);
  const [wr, cr, tr, pr, rr, gpr, gcr, mpr] = reads;
  if (!wr.ok || !cr.ok || !tr.ok || !pr.ok || !rr.ok || !gpr.ok || !gcr.ok || !mpr.ok) return mainOnly('MAIN_BLOCK_ONLY', 'C4_PARAMETER_UNRESOLVED', missing);
  const warm = wr.value[level];
  const cool = cr.value[level];
  const circuit = gcr.value[level];
  if (!warm || !cool || !circuit) return mainOnly('MAIN_BLOCK_ONLY', 'LEVEL_UNDECIDED', missing);
  const rates = rr.value;
  /** Temps planifié d'une quantité au débit LENT gouverné (mêmes débits que C3) ; débit absent ⇒ infini (variante écartée). */
  const slowS = (exerciseId: string, reps: number): number => {
    const r = rates[exerciseId];
    const v = r?.unit === 'reps' ? r.rate[level]?.slow : undefined;
    return v === undefined ? Number.POSITIVE_INFINITY : (reps / v) * S_PER_MIN;
  };
  const wants = (b: C4Block) => plan.required.includes(b) || plan.optional.includes(b);

  // ——— Régions RÉELLEMENT sollicitées par le bloc principal (pattern principal de chaque mouvement), par fréquence
  // décroissante puis ordre fixe ; les patterns cycliques / sans région n'en apportent aucune.
  const regionOf = new Map(input.catalog.document.taxonomy.patterns.map((p) => [p.id, p.region]));
  const mainIds = new Set(c3.plan.items.map((i) => i.exerciseId));
  const counts = new Map<string, number>();
  for (const i of c3.plan.items) {
    const r = regionOf.get(input.catalog.exercise(i.exerciseId)?.patterns.primary ?? '');
    if (r === 'lower' || r === 'upper' || r === 'core' || r === 'full') counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const mainRegions = [...counts.entries()].sort((a, b) => b[1] - a[1] || REGION_ORDER.indexOf(a[0]) - REGION_ORDER.indexOf(b[0])).map(([r]) => r);
  const eligible = (e: Exercise | undefined, id: string) => e !== undefined && movementIssues(id, e, input, governance).length === 0 && !c3.plan.excludedByHistory.includes(id);

  // ——— Échauffement général, mode 1 : ergomètre éligible (présent dans le bloc principal d'abord, puis coût technique).
  const mono = pr.value.map((m) => input.catalog.exercise(m.movementId))
    .filter((e): e is Exercise => e !== undefined && movementRoles(e, regionOf.get(e.patterns.primary)).includes('monostructural') && eligible(e, e.id))
    .sort((a, b) => Number(mainIds.has(b.id)) - Number(mainIds.has(a.id)) || a.cost.technical - b.cost.technical || (a.id < b.id ? -1 : 1))[0];
  // Mode 2 (C4.2, CT-D22) : circuit au poids du corps — UN mouvement d'élévation de température (premier éligible du
  // réservoir, impact ≤ plafond du niveau) + préparations dynamiques couvrant les régions du bloc principal (une par région).
  const pool = gpr.value.flatMap((p) => { const e = input.catalog.exercise(p.movementId); return e && eligible(e, p.movementId) && e.cost.impact <= circuit.maxImpact ? [{ ...p, e }] : []; });
  const pulse = pool.find((p) => p.role === 'pulse_raise');
  const preps: typeof pool = [];
  for (const r of mainRegions) {
    if (preps.length >= circuit.maxDynamicPrep) break;
    const m = pool.find((p) => p.role === 'dynamic_prep' && (p.regions as readonly string[]).includes(r) && !preps.includes(p));
    if (m) preps.push(m);
  }
  if (wants('warmup_general') && !mono && !pulse) return mainOnly('MAIN_BLOCK_ONLY', 'NO_ELIGIBLE_GENERAL_WARMUP_MOVEMENT', missing);
  // Retour au calme : allure facile sur l'ergomètre, sinon élévation SANS impact du réservoir, sinon mobilité seule.
  const easyMove = mono ?? pool.find((p) => p.role === 'pulse_raise' && p.e.cost.impact === 0)?.e;
  // Mobilité (CT-D23) : un mouvement éligible par région sollicitée ; sans région (bloc cyclique) : ordre du réservoir.
  const mobPool = mpr.value.flatMap((m) => { const e = input.catalog.exercise(m.movementId); return e && e.movementType === 'mobility' && eligible(e, m.movementId) ? [{ ...m, e }] : []; });
  const mobility: typeof mobPool = [];
  for (const r of mainRegions.length > 0 ? mainRegions : ['_pool_order']) {
    for (const m of mobPool) {
      if (mobility.length >= cool.maxMobilityMovements) break;
      if (mobility.includes(m)) continue;
      if (r === '_pool_order' || (m.regions as readonly string[]).includes(r === 'full' ? 'lower' : r)) { mobility.push(m); if (r !== '_pool_order') break; }
    }
  }

  // ——— Échauffement spécifique (C4.2, S6) : mouvements à RÉPÉTITIONS du bloc principal, sans charge, RAMPE gouvernée
  // (fraction croissante par tour) + tours supplémentaires si un mouvement atteint le seuil de coût technique.
  const specificItems = c3.plan.items.filter((i) => i.quantity?.kind === 'reps' && i.loadKg === undefined);
  const maxTech = Math.max(0, ...specificItems.map((i) => input.catalog.exercise(i.exerciseId)?.cost.technical ?? 0));
  const ramp = [...warm.specificRamp, ...(maxTech >= warm.technicalThreshold ? warm.technicalRamp : [])];
  const base = input.intent.id;
  const blocksFor = (v: (typeof VARIANTS)[number]) => {
    const pick = (r: { min: number; max: number }) => (v === 'long' ? r.max : r.min);
    const out: { before: Block[]; after: Block[]; notes: ReasonCode[]; generated: string[]; covered: string[]; plannedS: number } = { before: [], after: [], notes: [], generated: [], covered: [], plannedS: 0 };
    let warmS = 0;
    if (wants('warmup_general') && mono) {
      const workS = pick(warm.generalS);
      warmS += workS;
      out.before.push({ id: `${base}.c4.warmup_general`, kind: 'warmup', role: 'support', format: 'continuous', items: [{ id: `${base}.c4.wg.1`, exerciseId: mono.id, prescription: { type: 'timed', workS, rounds: 1, restS: 0 } }] });
      out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'warmup_general', kind: 'warmup', purpose: 'raise_temperature_easy_pace', durationS: workS, exercises: [mono.id], criteria: [mainIds.has(mono.id) ? 'in_main_block' : 'not_in_main_block', `technical_cost:${String(mono.cost.technical)}`], parameterIds: ['ct.c4.warmup', 'ct.composition.movementPool'] }));
      out.generated.push('warmup_general');
    } else if (wants('warmup_general') && pulse) {
      const moves = [pulse, ...preps];
      const rounds = Math.max(1, Math.floor(pick(warm.generalS) / (moves.length * circuit.intervalS)));
      const workS = rounds * moves.length * circuit.intervalS;
      warmS += workS;
      out.before.push({ id: `${base}.c4.warmup_general`, kind: 'warmup', role: 'support', format: 'continuous', items: moves.map((m, k) => ({ id: `${base}.c4.wg.${String(k + 1)}`, exerciseId: m.movementId, prescription: { type: 'timed' as const, workS: circuit.intervalS, rounds, restS: 0 } })) });
      out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'warmup_general', kind: 'warmup', purpose: 'raise_temperature_bodyweight_circuit', durationS: workS, exercises: moves.map((m) => m.movementId),
        criteria: ['no_eligible_ergometer', `impact_max:${String(circuit.maxImpact)}`, `regions:${mainRegions.join('+') || 'none'}`, ...moves.map((m) => `${m.role}:${m.movementId}`)], parameterIds: ['ct.c4.warmup', 'ct.c4.generalWarmupPool', 'ct.c4.generalWarmupCircuit'] }));
      out.generated.push('warmup_general');
    }
    // Accélérations progressives : ergomètre PRÉSENT dans le bloc principal non continu (intervalles, EMOM, AMRAP, for time).
    const buildupMono = mono && mainIds.has(mono.id) && c3.plan.format !== 'continuous' ? mono : undefined;
    if (wants('warmup_specific')) {
      if (specificItems.length === 0 && !buildupMono) {
        // Bloc principal sans mouvement à répétitions (ergomètre seul) : l'échauffement général sur le même mouvement le prépare.
        out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK_NOT_GENERATED, { block: 'warmup_specific', required: plan.required.includes('warmup_specific') ? 'required' : 'optional', cause: 'COVERED_BY_GENERAL_WARMUP' }));
        out.covered.push('warmup_specific');
      } else {
        const items = specificItems.map((i, k) => ({ id: `${base}.c4.ws.${String(k + 1)}`, exerciseId: i.exerciseId, prescription: { type: 'sets' as const, sets: ramp.map((f) => ({ kind: 'working' as const, reps: Math.max(1, Math.round((i.quantity?.value ?? 1) * f)), restAfterS: 0 })) } }));
        let specificS = Math.ceil(items.reduce((acc, it) => acc + it.prescription.sets.reduce((a, x) => a + slowS(it.exerciseId, x.reps), 0), 0));
        const b = { ...warm.buildups, rounds: pick(warm.buildups.rounds) };
        // Bloc de type « sets » (répétitions) puis, le cas échéant, bloc « continu » d'accélérations : deux blocs CORE.
        if (items.length > 0) out.before.push({ id: `${base}.c4.warmup_specific`, kind: 'warmup', role: 'support', format: 'sets', grouping: 'circuit', restBetweenRoundsS: 0, items });
        if (buildupMono) {
          const ref = items.length > 0 ? `${base}.c4.warmup_buildups` : `${base}.c4.warmup_specific`;
          out.before.push({ id: ref, kind: 'warmup', role: 'support', format: 'continuous', items: [{ id: `${base}.c4.wb.1`, exerciseId: buildupMono.id, prescription: { type: 'timed', workS: b.workS, rounds: b.rounds, restS: b.restS } }] });
          specificS += b.rounds * b.workS + (b.rounds - 1) * b.restS;
        }
        warmS += specificS;
        out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'warmup_specific', kind: 'warmup', purpose: 'rehearse_main_block_movements_progressive', durationS: specificS, exercises: [...items.map((x) => x.exerciseId), ...(buildupMono ? [buildupMono.id] : [])],
          criteria: [...(items.length > 0 ? [`ramp:${ramp.join('/')}`, maxTech >= warm.technicalThreshold ? `technical_extra_rounds:cost_${String(maxTech)}` : `technical_cost_max:${String(maxTech)}`] : []), ...(buildupMono ? [`buildups:${String(b.rounds)}x${String(b.workS)}s`] : []), 'no_load'], parameterIds: ['ct.c4.warmup'] }));
        out.generated.push('warmup_specific');
      }
    }
    out.plannedS += warmS;
    if (wants('cooldown') && (easyMove || mobility.length > 0)) {
      // S7 — le retour au calme ne dépasse jamais `maxShareOfWarmup` × l'échauffement planifié : mobilité au minimum, puis
      // allure facile au minimum, puis moins de mouvements de mobilité (jamais allongé, jamais pour compenser).
      let easyS = easyMove ? pick(cool.easyS) : 0;
      let mobS = pick(cool.mobilityPerMovementS);
      let mob = [...mobility];
      const cap = cool.maxShareOfWarmup * warmS;
      const total = () => easyS + mob.length * mobS;
      const adjusted: string[] = [];
      if (total() > cap && mobS > cool.mobilityPerMovementS.min) { mobS = cool.mobilityPerMovementS.min; adjusted.push('mobility_to_min'); }
      if (total() > cap && easyMove && easyS > cool.easyS.min) { easyS = cool.easyS.min; adjusted.push('easy_to_min'); }
      while (total() > cap && mob.length > 1) { mob = mob.slice(0, -1); adjusted.push('fewer_mobility_movements'); }
      const items: Block['items'] = [
        ...(easyMove ? [{ id: `${base}.c4.cd.1`, exerciseId: easyMove.id, prescription: { type: 'timed' as const, workS: easyS, rounds: 1, restS: 0 } }] : []),
        ...mob.map((m, k) => ({ id: `${base}.c4.cd.m${String(k + 1)}`, exerciseId: m.movementId, prescription: { type: 'mobility' as const, seconds: mobS, sides: 1 } })),
      ];
      out.plannedS += total();
      out.after.push({ id: `${base}.c4.cooldown`, kind: 'cooldown', role: 'support', format: 'continuous', items });
      out.notes.push(ctReasons.emit(CT_CODES.C4_BLOCK, { block: 'cooldown', kind: 'cooldown', purpose: easyMove ? 'return_to_calm_easy_pace_and_mobility' : 'return_to_calm_mobility', durationS: total(), exercises: items.map((x) => x.exerciseId),
        criteria: [`mobility_regions:${mainRegions.join('+') || 'pool_order'}`, ...mob.map((m) => `mobility:${m.movementId}`), ...(adjusted.length > 0 ? [`balanced_to_warmup:${adjusted.join('+')}`] : []), ...(total() > cap ? ['cap_above_minimums'] : [])], parameterIds: ['ct.c4.cooldown', 'ct.c4.mobilityPool'] }));
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
  for (const v of input.discipline.fullSessionVariant === 'short' ? (['short'] as const) : VARIANTS) {
    const b = blocksFor(v);
    const plannedS = b.plannedS + mainS;
    if (!(plannedS <= input.intent.availableTimeS - marginS)) continue;
    // S8 (C4.2) — la référence de la cible produit est l'estimation du CORE (consignes et transitions comprises),
    // lue en aval sur la séance enregistrée ; le moteur ne juge pas la cible sur sa durée planifiée.
    const target = tr.value;
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
    const reasons = [...trace, ...b.notes, ...missing, status('FULL_SESSION', 'PLANNED_BLOCKS_COMPOSED', { generated: [...b.generated, 'conditioning'], notGenerated, plannedS: Math.round(plannedS), target, position: 'core_estimate', variant: v })];
    return { proposal: { ...c3.proposal, session, fingerprintInputs: { ...fp, volumeByItem }, reasons: merged(c3.proposal.reasons, reasons) }, status: 'FULL_SESSION' };
  }
  return mainOnly('MAIN_BLOCK_ONLY', 'SESSION_EXCEEDS_AVAILABLE_TIME', missing);
}
