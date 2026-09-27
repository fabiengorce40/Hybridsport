import { z } from 'zod';
import { zId } from './ruleset.js';

/**
 * CORE-EXT-R1 — séance structurée à PROFONDEUR FIXE (RFC CORE-EXT-R1 §3 option B + §8, approuvée
 * par le fondateur, phase 6A) : prescription → segments ordonnés → séries × répétitions. Aucun arbre
 * récursif : un segment ne contient jamais de segment.
 *
 * Le CORE porte la REPRÉSENTATION et la VALIDATION structurelle, jamais la logique de programmation :
 * aucune allure, aucun seuil, aucun volume n'est choisi ici. Les cibles sont fournies par un moteur de
 * discipline et le CORE vérifie seulement leur cohérence interne.
 *
 * Les formes (types, champs connus) sont contrôlées par zod ; les invariants sémantiques sont
 * calculés par `runStructureIssues` / `sessionStructureIssues`, qui renvoient des codes d'anomalie
 * EXPLICITES (jamais un texte libre), convertis en reason codes par le CORE.
 */

/** Codes d'anomalie structurelle (contrat versionné : un code n'est jamais réutilisé avec un autre sens). */
export const STRUCTURE_ISSUES = [
  'SEGMENTS_EMPTY',
  'SEGMENTS_TOO_MANY',
  'EXECUTION_STEPS_TOO_MANY',
  'SEGMENT_ID_DUPLICATED',
  'SETS_INVALID',
  'REPS_INVALID',
  'DURATION_NOT_POSITIVE',
  'DISTANCE_NOT_POSITIVE',
  'RANGE_NOT_POSITIVE',
  'PACE_RANGE_INVERTED',
  'RPE_RANGE_INVERTED',
  'HR_RANGE_INVERTED',
  'DISTANCE_WITHOUT_PACE',
  'PACE_WITHOUT_PROVENANCE',
  'TARGET_WITHOUT_EFFORT_OR_PACE',
  'TARGET_PRIORITY_ABSENT',
  'TARGET_COMBINATION_INVALID',
  'RECOVERY_BETWEEN_SETS_REQUIRED',
  'RECOVERY_BETWEEN_SETS_FORBIDDEN',
  'RECOVERY_WITHOUT_REPETITION',
  'WARMUP_DUPLICATED',
  'WARMUP_NOT_FIRST',
  'COOLDOWN_DUPLICATED',
  'COOLDOWN_NOT_LAST',
  'WARMUP_COOLDOWN_DOUBLE_REPRESENTATION',
  'PLACEMENT_INVALID',
] as const;
export type StructureIssueCode = (typeof STRUCTURE_ISSUES)[number];
export interface StructureIssue { readonly code: StructureIssueCode; readonly path: readonly (string | number)[] }

// technical-constant: borne anti-explosion du format (contrat de schéma), pas une valeur de prescription
export const MAX_RUN_SEGMENTS = 64;
// technical-constant: borne anti-explosion du format (contrat de schéma), pas une valeur de prescription
export const MAX_RUN_SETS = 64;
// technical-constant: borne anti-explosion du format (contrat de schéma), pas une valeur de prescription
export const MAX_RUN_REPS = 256;
// technical-constant: borne anti-explosion du déroulement (cases, minuteur), pas une valeur de prescription
export const MAX_RUN_EXECUTION_STEPS = 4096;

/**
 * Plage numérique. La forme n'impose que des nombres FINIS : la positivité et l'ordre min ≤ max sont
 * des invariants sémantiques, pour être refusés avec un code explicite.
 */
const zRange = z.object({ min: z.number(), max: z.number() }).strict();
export type NumericRange = z.infer<typeof zRange>;

/** Dose : EXACTEMENT une grandeur (durée XOR distance) — garantie par la forme stricte de l'union. */
export const zRunDose = z.union([
  z.object({ durationS: z.number() }).strict(),
  z.object({ distanceM: z.number() }).strict(),
]);
export type RunDose = z.infer<typeof zRunDose>;

/**
 * Provenance d'une plage d'allure (décision fondateur Q1) : dérivée d'une référence de l'athlète, ou
 * plage observée de l'athlète. Le CORE n'invente jamais d'allure ; il exige seulement qu'elle soit sourcée.
 */
export const PACE_PROVENANCE_SOURCES = ['reference_derived', 'observed_athlete_range'] as const;
export const zPaceProvenance = z.object({ source: z.enum(PACE_PROVENANCE_SOURCES), sourceId: zId }).strict();

/** Plage d'allure en s/km : `min` = allure la plus RAPIDE, `max` = la plus LENTE. */
export const zPaceTarget = z.object({ secPerKm: zRange, provenance: zPaceProvenance.optional() }).strict();
export type PaceTarget = z.infer<typeof zPaceTarget>;

/** Effort : plage RPE, OU clé de descripteur (texte localisé hors CORE), jamais les deux. */
export const zRunEffort = z.union([
  z.object({ rpe: zRange }).strict(),
  z.object({ descriptorKey: zId }).strict(),
]);

/** Domaine d'intensité : étiquette de représentation (sa signification appartient au moteur de discipline). */
export const RUN_DOMAINS = ['easy_low', 'moderate', 'heavy', 'threshold_like', 'severe', 'sprint_neuromuscular'] as const;
export const TARGET_PRIORITIES = ['pace', 'effort', 'hr'] as const;

/**
 * Cible : DOMAIN obligatoire ; PACE_RANGE, RPE_RANGE (ou descripteur), HR_RANGE facultatifs ;
 * NO_WEARABLE = séance exécutable sans montre (ni allure ni FC mesurables).
 */
export const zRunTarget = z.object({
  domain: z.enum(RUN_DOMAINS),
  pace: zPaceTarget.optional(),
  effort: zRunEffort.optional(),
  hrBpm: zRange.optional(),
  priority: z.enum(TARGET_PRIORITIES),
  noWearable: z.boolean().optional(),
}).strict();
export type RunTarget = z.infer<typeof zRunTarget>;

export const RECOVERY_MODES = ['standing', 'walk', 'jog'] as const;
/** Récupération : dose + mode ; une dose en distance exige une allure sourcée (même règle que Q1). */
export const zRecoverySpec = z.object({ dose: zRunDose, mode: z.enum(RECOVERY_MODES), pace: zPaceTarget.optional() }).strict();
export type RecoverySpec = z.infer<typeof zRecoverySpec>;

/** Segments : liste PLATE. `repeat` = deux niveaux fixes (séries × répétitions), jamais imbriqués. */
export const zRunSegment = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('warmup'), id: zId, dose: zRunDose, target: zRunTarget }).strict(),
  z.object({ kind: z.literal('steady'), id: zId, dose: zRunDose, target: zRunTarget }).strict(),
  z.object({ kind: z.literal('cooldown'), id: zId, dose: zRunDose, target: zRunTarget }).strict(),
  z.object({ kind: z.literal('preparation'), id: zId, reps: z.number().optional(), dose: zRunDose, target: zRunTarget, recovery: zRecoverySpec.optional() }).strict(),
  z.object({
    kind: z.literal('repeat'), id: zId, sets: z.number(), reps: z.number(),
    work: zRunDose, target: zRunTarget, recovery: zRecoverySpec, betweenSetRecovery: zRecoverySpec.optional(),
  }).strict(),
]);
export type RunSegment = z.infer<typeof zRunSegment>;

/** Méthode de dérivation des estimations (provenance, décision fondateur Q2). */
export const RUN_ESTIMATE_METHOD = 'core.run_structure.pace_bounds';
/**
 * Estimations STOCKÉES avec leur provenance, recalculées par le DurationEngine à la validation ;
 * tout écart est un refus (jamais une réparation silencieuse). Unité explicite : secondes.
 */
export const zRunEstimate = z.object({
  method: z.literal(RUN_ESTIMATE_METHOD),
  methodVersion: z.literal(1),
  unit: z.literal('s'),
  workS: zRange,
  totalS: zRange,
}).strict();
export type RunEstimate = z.infer<typeof zRunEstimate>;

export const zRunStructureShape = z.object({
  type: z.literal('run_structure'),
  segments: z.array(zRunSegment),
  estimate: zRunEstimate,
}).strict();
export type RunStructure = z.infer<typeof zRunStructureShape>;

const isPositive = (x: number): boolean => x > 0;
const isCount = (x: number, max: number): boolean => Number.isInteger(x) && x >= 1 && x <= max;

function rangeIssues(r: NumericRange, inverted: StructureIssueCode, path: readonly (string | number)[]): StructureIssue[] {
  if (!isPositive(r.min) || !isPositive(r.max)) return [{ code: 'RANGE_NOT_POSITIVE', path }];
  return r.min > r.max ? [{ code: inverted, path }] : [];
}

function paceIssues(p: PaceTarget, path: readonly (string | number)[]): StructureIssue[] {
  const out = rangeIssues(p.secPerKm, 'PACE_RANGE_INVERTED', [...path, 'secPerKm']);
  if (!p.provenance) out.push({ code: 'PACE_WITHOUT_PROVENANCE', path });
  return out;
}

/** Dose valide ; une distance exige une plage d'allure (Q1 : aucune allure inventée). */
function doseIssues(d: RunDose, pace: PaceTarget | undefined, path: readonly (string | number)[]): StructureIssue[] {
  if ('durationS' in d) return isPositive(d.durationS) ? [] : [{ code: 'DURATION_NOT_POSITIVE', path }];
  const out: StructureIssue[] = isPositive(d.distanceM) ? [] : [{ code: 'DISTANCE_NOT_POSITIVE', path }];
  if (!pace) out.push({ code: 'DISTANCE_WITHOUT_PACE', path });
  return out;
}

function targetIssues(t: RunTarget, path: readonly (string | number)[]): StructureIssue[] {
  const out: StructureIssue[] = [];
  if (t.pace) out.push(...paceIssues(t.pace, [...path, 'pace']));
  if (t.effort && 'rpe' in t.effort) out.push(...rangeIssues(t.effort.rpe, 'RPE_RANGE_INVERTED', [...path, 'effort', 'rpe']));
  if (t.hrBpm) out.push(...rangeIssues(t.hrBpm, 'HR_RANGE_INVERTED', [...path, 'hrBpm']));
  if (!t.effort && !t.pace) out.push({ code: 'TARGET_WITHOUT_EFFORT_OR_PACE', path });
  const present = { pace: t.pace !== undefined, effort: t.effort !== undefined, hr: t.hrBpm !== undefined };
  if (!present[t.priority]) out.push({ code: 'TARGET_PRIORITY_ABSENT', path: [...path, 'priority'] });
  // NO_WEARABLE : ni allure ni FC mesurables ⇒ leur présence est contradictoire.
  if (t.noWearable === true && (t.pace !== undefined || t.hrBpm !== undefined)) out.push({ code: 'TARGET_COMBINATION_INVALID', path });
  return out;
}

function recoveryIssues(r: RecoverySpec, path: readonly (string | number)[]): StructureIssue[] {
  const out = doseIssues(r.dose, r.pace, [...path, 'dose']);
  if (r.pace) out.push(...paceIssues(r.pace, [...path, 'pace']));
  if (r.pace && 'durationS' in r.dose) out.push({ code: 'TARGET_COMBINATION_INVALID', path: [...path, 'pace'] });
  return out;
}

/** Nombre d'étapes d'exécution (cases / minuteur) d'un segment ; borné pour exclure une explosion. */
export function segmentStepCount(s: RunSegment): number {
  switch (s.kind) {
    case 'warmup': case 'steady': case 'cooldown': return 1;
    case 'preparation': { const reps = s.reps ?? 1; return reps + (s.recovery ? reps - 1 : 0); }
    case 'repeat': return s.sets * s.reps + s.sets * (s.reps - 1) + (s.sets - 1);
  }
}

/** Invariants d'UNE prescription `run_structure` (règles 1–8 de la RFC + Q1). Pure, déterministe. */
export function runStructureIssues(p: Pick<RunStructure, 'segments'>): StructureIssue[] {
  const out: StructureIssue[] = [];
  if (p.segments.length === 0) out.push({ code: 'SEGMENTS_EMPTY', path: ['segments'] });
  if (p.segments.length > MAX_RUN_SEGMENTS) out.push({ code: 'SEGMENTS_TOO_MANY', path: ['segments'] });
  const ids = new Set<string>();
  let countsValid = true;
  p.segments.forEach((s, i) => {
    const at = ['segments', i];
    if (ids.has(s.id)) out.push({ code: 'SEGMENT_ID_DUPLICATED', path: [...at, 'id'] });
    ids.add(s.id);
    out.push(...targetIssues(s.target, [...at, 'target']));
    switch (s.kind) {
      case 'warmup': case 'steady': case 'cooldown':
        out.push(...doseIssues(s.dose, s.target.pace, [...at, 'dose']));
        break;
      case 'preparation': {
        out.push(...doseIssues(s.dose, s.target.pace, [...at, 'dose']));
        if (s.reps !== undefined && !isCount(s.reps, MAX_RUN_REPS)) { out.push({ code: 'REPS_INVALID', path: [...at, 'reps'] }); countsValid = false; }
        if (s.recovery) {
          out.push(...recoveryIssues(s.recovery, [...at, 'recovery']));
          if ((s.reps ?? 1) === 1) out.push({ code: 'RECOVERY_WITHOUT_REPETITION', path: [...at, 'recovery'] });
        }
        break;
      }
      case 'repeat': {
        if (!isCount(s.sets, MAX_RUN_SETS)) { out.push({ code: 'SETS_INVALID', path: [...at, 'sets'] }); countsValid = false; }
        if (!isCount(s.reps, MAX_RUN_REPS)) { out.push({ code: 'REPS_INVALID', path: [...at, 'reps'] }); countsValid = false; }
        out.push(...doseIssues(s.work, s.target.pace, [...at, 'work']));
        out.push(...recoveryIssues(s.recovery, [...at, 'recovery']));
        if (s.betweenSetRecovery) out.push(...recoveryIssues(s.betweenSetRecovery, [...at, 'betweenSetRecovery']));
        if (s.sets > 1 && !s.betweenSetRecovery) out.push({ code: 'RECOVERY_BETWEEN_SETS_REQUIRED', path: [...at, 'betweenSetRecovery'] });
        if (s.sets === 1 && s.betweenSetRecovery) out.push({ code: 'RECOVERY_BETWEEN_SETS_FORBIDDEN', path: [...at, 'betweenSetRecovery'] });
        // Règle 6 de la RFC : un sprint neuromusculaire répété ne se pilote pas à l'allure.
        if (s.target.domain === 'sprint_neuromuscular' && s.target.priority === 'pace') out.push({ code: 'TARGET_COMBINATION_INVALID', path: [...at, 'target'] });
        break;
      }
    }
  });
  // Les comptages ne sont sommés que s'ils sont valides (sinon le total n'a pas de sens).
  if (countsValid && p.segments.reduce((n, s) => n + segmentStepCount(s), 0) > MAX_RUN_EXECUTION_STEPS) out.push({ code: 'EXECUTION_STEPS_TOO_MANY', path: ['segments'] });
  // Règle 1 : au plus un échauffement, en tête ; au plus un retour au calme, en fin.
  const warm = p.segments.flatMap((s, i) => (s.kind === 'warmup' ? [i] : []));
  const cool = p.segments.flatMap((s, i) => (s.kind === 'cooldown' ? [i] : []));
  if (warm.length > 1) out.push({ code: 'WARMUP_DUPLICATED', path: ['segments'] });
  if (warm.some((i) => i !== 0)) out.push({ code: 'WARMUP_NOT_FIRST', path: ['segments'] });
  if (cool.length > 1) out.push({ code: 'COOLDOWN_DUPLICATED', path: ['segments'] });
  if (cool.some((i) => i !== p.segments.length - 1)) out.push({ code: 'COOLDOWN_NOT_LAST', path: ['segments'] });
  return out;
}

/** Vue minimale d'une séance pour les invariants inter-blocs (évite une dépendance circulaire). */
interface StructureSessionView {
  readonly blocks: readonly {
    readonly kind: string;
    readonly format: string;
    readonly items: readonly { readonly prescription: { readonly type: string } }[];
  }[];
}

const isRun = (p: { readonly type: string }): p is RunStructure => p.type === 'run_structure';

/**
 * Invariants inter-blocs (décision fondateur Q3) :
 * - `run_structure` n'est porté que par un bloc `running` au format `continuous` ;
 * - échauffement / retour au calme INTERNES seulement dans une séance de course pure (tous les blocs
 *   sont des blocs `running` ne portant que des `run_structure`) ; une séance multidiscipline utilise
 *   des blocs séparés ; toute double représentation est refusée ;
 * - sur l'ensemble de la séance : au plus un échauffement interne, en tête ; au plus un retour au
 *   calme interne, en fin.
 */
export function sessionStructureIssues(session: StructureSessionView): StructureIssue[] {
  const out: StructureIssue[] = [];
  const runs: { p: RunStructure; path: (string | number)[] }[] = [];
  session.blocks.forEach((b, bi) => b.items.forEach((it, ii) => {
    if (!isRun(it.prescription)) return;
    const path = ['blocks', bi, 'items', ii, 'prescription'];
    if (b.kind !== 'running' || b.format !== 'continuous') out.push({ code: 'PLACEMENT_INVALID', path });
    runs.push({ p: it.prescription, path });
  }));
  const has = (r: RunStructure, kind: string): boolean => r.segments.some((s) => s.kind === kind);
  if (!runs.some((r) => has(r.p, 'warmup') || has(r.p, 'cooldown'))) return out;
  const pureRunning = session.blocks.every((b) => b.kind === 'running' && b.items.every((it) => isRun(it.prescription)));
  if (!pureRunning) {
    for (const r of runs) if (has(r.p, 'warmup') || has(r.p, 'cooldown')) out.push({ code: 'WARMUP_COOLDOWN_DOUBLE_REPRESENTATION', path: r.path });
    return out;
  }
  // Séance de course pure : l'échauffement interne appartient à la PREMIÈRE prescription, le retour au
  // calme à la DERNIÈRE (l'ordre à l'intérieur d'une prescription est vérifié par runStructureIssues).
  runs.forEach((r, k) => {
    if (k > 0 && has(r.p, 'warmup')) out.push({ code: runs.slice(0, k).some((x) => has(x.p, 'warmup')) ? 'WARMUP_DUPLICATED' : 'WARMUP_NOT_FIRST', path: r.path });
    if (k < runs.length - 1 && has(r.p, 'cooldown')) out.push({ code: runs.slice(k + 1).some((x) => has(x.p, 'cooldown')) ? 'COOLDOWN_DUPLICATED' : 'COOLDOWN_NOT_LAST', path: r.path });
  });
  return out;
}

/** Paramètres d'une anomalie zod personnalisée portant un code structurel (lus par le CORE). */
export interface StructureIssueParams { readonly structureIssue: StructureIssueCode }

export function isStructureIssueParams(x: unknown): x is StructureIssueParams {
  return x !== null && typeof x === 'object' && 'structureIssue' in x && (STRUCTURE_ISSUES as readonly unknown[]).includes((x as { structureIssue: unknown }).structureIssue);
}

/** Traduit des anomalies structurelles en anomalies zod (le code voyage dans `params`). */
export function addStructureIssues(ctx: z.RefinementCtx, issues: readonly StructureIssue[], prefix: readonly (string | number)[] = []): void {
  for (const i of issues) ctx.addIssue({ code: 'custom', message: i.code, path: [...prefix, ...i.path], params: { structureIssue: i.code } });
}

export const zRunStructure = zRunStructureShape.superRefine((p, ctx) => { addStructureIssues(ctx, runStructureIssues(p)); });
