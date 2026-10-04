/**
 * C2 — premier incrément GÉNÉRATIF Cross-training. Corridor strict et unique :
 *   firstExposure (amorçage) OU rejeu strict → `continuous` → un item `timed` → UN mouvement.
 *
 * - Amorçage : mouvement de `ct.bootstrap.movementAllowlist` (CT-D4) × durée fixe APPROUVÉE pour ce mouvement.
 * - Rejeu strict (CT-D15) : la DERNIÈRE séance réalisée, seulement si elle est `completed_as_prescribed` et
 *   admissible ; sinon refus (aucune recherche plus ancienne, aucun repli sur l'amorçage).
 * - Aucune taxonomie de stimuli (CT-D1 découplée), aucune énergie ni aucun stimulus inventés : l'empreinte
 *   déclare `energy` et `stimulus` `not_applicable`.
 * - Aucune substitution, aucune compression, aucune reconstruction : toute incompatibilité ⇒ refus.
 * Aucune valeur sportive n'est écrite ici : durées et fenêtres viennent de la gouvernance (fail-closed).
 */
import { z } from 'zod';
import { NOT_APPLICABLE, asISODateTime, hoursBetween } from '@hybridsport/domain';
import type { Exercise, ReasonCode, SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import type { SportEngineInput } from '@hybridsport/engine';
import { CT_CODES, ctReasons } from './codes.js';
import type { CrossTrainingContext, RealizedCtSession } from './context.js';
import { movementRepresentability } from './movement.js';
import { resolveParameter } from './governance/parameters.js';
import type { CtGovernance } from './governance/state.js';
import type { CtMode } from './model.js';

// ——— Allowlist d'amorçage (CT-D4) ———

/**
 * Entrée gouvernée : `movementId → durée fixe approuvée`. Utilisable seulement si le mouvement est APPROUVÉ ET si une
 * durée approuvée (avec son approbation tracée) existe. Aucune plage, aucun coefficient par niveau.
 */
export const zBootstrapMovementEntry = z.object({
  movementId: z.string().min(1),
  status: z.enum(['APPROVED', 'PENDING', 'REJECTED']),
  /** Durée fixe (s) approuvée pour CE mouvement ; absente = non approuvée. */
  approvedBootstrapDurationS: z.number().positive().optional(),
  durationApproval: z.object({ role: z.string().min(1), reference: z.string().min(1) }).strict().optional(),
  /** Métadonnées d'éligibilité : référence de la revue du mouvement (CT_CONTENT). */
  eligibility: z.object({ contentReviewRef: z.string().min(1) }).strict(),
}).strict().superRefine((e, ctx) => {
  if ((e.approvedBootstrapDurationS === undefined) !== (e.durationApproval === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['durationApproval'], message: 'une durée approuvée exige son approbation tracée, et inversement' });
  }
});
export type BootstrapMovementEntry = z.infer<typeof zBootstrapMovementEntry>;
export const zBootstrapMovementAllowlist = z.array(zBootstrapMovementEntry);

export const BOOTSTRAP_ALLOWLIST_ID = 'ct.bootstrap.movementAllowlist';
/** `maxReplayAge` (CT-D15.b), en jours : porté par `ct.history.recencyBand`. */
export const MAX_REPLAY_AGE_ID = 'ct.history.recencyBand';

const entryCause = (e: BootstrapMovementEntry): string | undefined =>
  e.status !== 'APPROVED' ? `MOVEMENT_${e.status}` : e.approvedBootstrapDurationS === undefined ? 'DURATION_NOT_APPROVED' : undefined;

/**
 * Candidat d'amorçage : la PREMIÈRE entrée, dans l'ordre gouverné, dont le mouvement ET la durée sont approuvés.
 * Filtre de GOUVERNANCE seulement (indépendant de l'athlète) : les gardes athlète s'appliquent ensuite au candidat,
 * sans jamais passer à une autre entrée (aucune substitution).
 */
export function bootstrapCandidate(entries: readonly BootstrapMovementEntry[]): { readonly entry: BootstrapMovementEntry; readonly durationS: number } | { readonly causes: readonly string[] } {
  for (const e of entries) {
    if (entryCause(e) === undefined && e.approvedBootstrapDurationS !== undefined) return { entry: e, durationS: e.approvedBootstrapDurationS };
  }
  return { causes: entries.length === 0 ? ['NO_ENTRY'] : entries.map((e) => `${e.movementId}:${entryCause(e) ?? 'UNKNOWN'}`) };
}

// ——— Gardes mouvement × athlète (aucune substitution) ———

/**
 * Causes d'inéligibilité d'un mouvement pour CET athlète : mêmes contrôles que le CORE (matériel, contre-indications,
 * zones douloureuses, mouvements restreints, exclusions, statut), mais appliqués AVANT la proposition, pour refuser
 * au lieu de laisser le CORE substituer ou retirer. Toute restriction de zone active est pertinente (CT-G1-PAIN).
 */
export function movementIssues(exerciseId: string, exercise: Exercise | undefined, input: SportEngineInput<CrossTrainingContext>, governance: CtGovernance): string[] {
  if (!exercise) return ['UNKNOWN_MOVEMENT'];
  const c = input.constraints;
  const out: string[] = [];
  if (exercise.status !== 'active') out.push('INACTIVE');
  if (!movementRepresentability(exercise, governance).representable) out.push('LOADED');
  if (!input.catalog.isFeasibleWith(exercise, new Set(c.availableEquipment))) out.push('EQUIPMENT_MISSING');
  if (exercise.contraindicationTags.some((t) => c.restrictions.includes(t))) out.push('RESTRICTION');
  if (exercise.painSensitiveAreas.some((a) => c.areaRestrictions.some((r) => r.area === a))) out.push('PAIN_AREA');
  if (exercise.movementTags.some((m) => c.restrictedMovements.includes(m))) out.push('PAIN_MOVEMENT');
  if (c.excludedExercises.includes(exerciseId)) out.push('USER_EXCLUSION');
  return out;
}

// ——— CT-D6 : gardes de volume conditionnées à la quantité réellement prescrite ———

/**
 * Paramètres CT-D6 EXIGÉS par une prescription : un plafond n'est obligatoire que si la prescription expose la
 * quantité qu'il contrôle (répétitions ; contacts de sauts = répétitions d'un mouvement de saut). Une prescription
 * `timed` n'expose ni l'un ni l'autre : aucun plafond exigé.
 */
export function volumeGuardParameters(session: SessionDraftInput, exerciseOf: (id: string) => Exercise | undefined): string[] {
  const out = new Set<string>();
  for (const it of session.blocks.flatMap((b) => b.items)) {
    const exposesReps = it.prescription.type === 'reps' || it.prescription.type === 'sets';
    if (!exposesReps) continue;
    out.add('ct.safety.repsPerMovementCap');
    if (exerciseOf(it.exerciseId)?.movementType === 'plyometric') out.add('ct.safety.jumpContactsCap');
  }
  return [...out].sort();
}

// ——— Rejeu strict (CT-D15) ———

/** Causes qui rendent une séance réalisée non rejouable (CT-D15.c et .d) ; aucun seuil sRPE. */
export function replaySourceIssues(s: RealizedCtSession): string[] {
  const out: string[] = [];
  if (s.completion !== 'completed_as_prescribed') out.push(s.completion === 'abandoned' ? 'ABANDONED' : 'NOT_COMPLETED_AS_PRESCRIBED');
  if (s.pain === undefined) out.push('PAIN_UNKNOWN');
  else if (s.pain !== 'NONE') out.push('PAIN_DECLARED');
  if (s.tolerance === 'poorly_tolerated') out.push('POORLY_TOLERATED');
  return out;
}

/** La prescription réalisée appartient-elle au corridor C2 (continu, un seul mouvement en durée, sans charge ni variante) ? */
export function corridorIssues(s: RealizedCtSession): string[] {
  const p = s.prescription;
  if (p.format !== 'continuous') return [`FORMAT_${p.format.toUpperCase()}`];
  const out: string[] = [];
  if (p.items.length !== 1) out.push('NOT_ONE_MOVEMENT');
  const item = p.items[0];
  if (item?.quantity.kind !== 'duration_s') out.push('NOT_TIMED');
  else if (item.quantity.value !== p.durationS) out.push('DURATION_MISMATCH');
  if (item?.load !== undefined) out.push('LOADED');
  if (item?.variantOf !== undefined) out.push('VARIANT');
  return out;
}

/** Dernière séance réalisée (par `completedAt`, puis identifiant) : l'UNIQUE candidate au rejeu (aucun repli). */
export function latestRealized(history: readonly RealizedCtSession[]): RealizedCtSession | undefined {
  return [...history].sort((a, b) => (a.completedAt < b.completedAt ? 1 : a.completedAt > b.completedAt ? -1 : a.sessionId < b.sessionId ? 1 : -1))[0];
}

// technical-constant: conversion jours → heures (calendrier)
const HOURS_PER_DAY = 24;

export type MaxReplayAge = { readonly ok: true; readonly days: number; readonly reasons: readonly ReasonCode[] } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

/** `maxReplayAge` gouverné (jours, > 0) ; non résolu ou illisible ⇒ rejeu refusé (fail-closed). */
export function readMaxReplayAge(governance: CtGovernance, mode: CtMode): MaxReplayAge {
  const r = resolveParameter(governance.parameters, MAX_REPLAY_AGE_ID, mode);
  if (r.status === 'unresolved') return { ok: false, reasons: r.reasons };
  const v = z.number().positive().safeParse(r.value);
  if (!v.success) return { ok: false, reasons: [...r.reasons, ctReasons.emit(CT_CODES.UNRESOLVED_PARAMETER, { parameterId: MAX_REPLAY_AGE_ID, cause: 'UNREADABLE', mode })] };
  return { ok: true, days: v.data, reasons: r.reasons };
}

/** Âge de la séance au regard de `maxReplayAge` : trop ancienne, ou datée dans le futur ⇒ inadmissible. */
export function ageIssues(completedAt: string, now: string, maxDays: number): string[] {
  const h = hoursBetween(asISODateTime(completedAt), asISODateTime(now));
  if (h < 0) return ['IN_FUTURE'];
  return h > maxDays * HOURS_PER_DAY ? ['TOO_OLD'] : [];
}

// ——— Proposition ———

export type C2Source = 'bootstrap' | 'replay';

/**
 * Profil de tolérance de durée du ruleset pour une séance à DURÉE FIXE (identifiant, comme le profil « au temps » de
 * Running) : ses valeurs sont celles du ruleset, jamais écrites ici.
 */
export const CT_C2_TOLERANCE_PROFILE = 'fixed_time';

/**
 * Séance C2 : `continuous`, un item `timed` (tours = 1, repos = 0), aucun levier (jamais de compression). NOUVELLE
 * occurrence : identifiants dérivés de l'intention courante, jamais de la séance rejouée. Empreinte : `energy` et
 * `stimulus` `not_applicable` ; aucun `format` déclaré (il serait constant dans le corridor).
 */
export function c2Proposal(input: SportEngineInput<CrossTrainingContext>, exerciseId: string, durationS: number, source: C2Source, engine: { readonly id: string; readonly version: string }, reasons: readonly ReasonCode[]): SportEngineProposalInput {
  const base = input.intent.id;
  const itemId = `${base}.item`;
  const session: SessionDraftInput = {
    id: `${base}.ct`, discipline: 'crosstraining', athleteLevel: input.profile.athleteLevel,
    availableTimeS: input.intent.availableTimeS, targetDurationS: input.intent.targetDurationS, toleranceProfile: CT_C2_TOLERANCE_PROFILE,
    blocks: [{ id: `${base}.block`, kind: 'conditioning', role: 'primary', format: 'continuous', items: [{ id: itemId, exerciseId, prescription: { type: 'timed', workS: durationS, rounds: 1, restS: 0 } }] }],
  };
  return {
    proposalId: `proposal.${base}.${source}`, discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
    stimulus: input.intent.stimulus, objective: input.intent.objective, session,
    optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
    fingerprintInputs: { archetypeId: input.intent.archetypeId, stimulus: NOT_APPLICABLE, energy: NOT_APPLICABLE, volumeByItem: { [itemId]: durationS }, prescriptionMarkers: { [`c2.${source}.durationS`]: durationS } },
    repetitionIntents: [],
    reasons: [...reasons, ctReasons.emit(CT_CODES.C2_PROPOSED, { source, exerciseId })].map((r) => ({
      ...r,
      params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
      ruleRefs: [...r.ruleRefs],
    })),
    provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    parametersUsed: [],
  };
}
