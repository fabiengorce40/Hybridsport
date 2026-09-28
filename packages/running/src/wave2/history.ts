/**
 * Vague 2 — historique des doses RÉALISÉES et ancre de dose V19 (`running.dose.historyAnchorPolicy`).
 *
 * V19 (RUNNING-PARAMETERS-V0 §2.2, inchangé en V1-CANDIDATE) : « dose d'un archétype = dernière dose
 * réalisée du même archétype et de la même famille de structure, dans la bande RECENT (V12), sans retour
 * négatif ; sinon paramètre de première exposition (vide ⇒ BLOCKED) ». Ce module n'invente rien au-delà :
 * - une séance non terminée (PARTIAL, SKIPPED, UNKNOWN) n'est pas une dose réalisée ;
 * - un retour négatif (définition 5E, restreinte à la séance) exclut la séance ;
 * - un retour INCONNU n'exclut pas (contrat V0 : tolérance UNKNOWN ⇒ HOLD), il est tracé ;
 * - en reprise, seules les séances POST-retour comptent (même règle que RecentLoadContext, POST_RETURN_ONLY) ;
 * - une séance plus récente avec retour négatif, ou dont la réalisation est inconnue, rend l'ancre
 *   incertaine : REFUS (la « baisse vers la dernière dose réussie » n'est pas appliquée en vague 2) ;
 * - deux ancres simultanées de doses différentes : ambiguïté exposée, REFUS.
 */
import { z } from 'zod';
import { isISODateTime, toEpochMs } from '@hybridsport/domain';
import type { ISODateTime, ReasonCode } from '@hybridsport/domain';
import { RUNNING_SESSION_ARCHETYPES } from '../model.js';
import type { RunningMode, RunningSessionArchetype } from '../model.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { MS_PER_WEEK } from '../references.js';

/** Familles de structure (RULESET-V0 §M : `structureMode` CONTINUOUS ou INTERVALS). */
export const STRUCTURE_FAMILIES = ['CONTINUOUS', 'INTERVALS'] as const;
export type StructureFamily = (typeof STRUCTURE_FAMILIES)[number];

export const RECOVERY_MODES_REALIZED = ['jog', 'walk', 'standing'] as const;

/**
 * Structure RÉALISÉE d'une séance de qualité (vague 3), déclarée ou mesurée, en TEMPS (une dose en distance
 * exige une allure sourcée, CORE-EXT-R1) : échauffement, répétitions × travail, récupération, retour au calme.
 * Une seule répétition = forme continue (aucune récupération) ; plusieurs = fractionné (récupération obligatoire).
 */
export const zRealizedStructure = z.object({
  warmupS: z.number().positive().finite().optional(),
  reps: z.number().int().positive(),
  workS: z.number().positive().finite(),
  recoveryS: z.number().positive().finite().optional(),
  recoveryMode: z.enum(RECOVERY_MODES_REALIZED).optional(),
  cooldownS: z.number().positive().finite().optional(),
}).strict().superRefine((s, ctx) => {
  const fractioned = s.reps > 1;
  if (fractioned && (s.recoveryS === undefined || s.recoveryMode === undefined)) ctx.addIssue({ code: 'custom', message: 'fractionné : récupération (durée et mode) obligatoire', path: ['recoveryS'] });
  if (!fractioned && (s.recoveryS !== undefined || s.recoveryMode !== undefined)) ctx.addIssue({ code: 'custom', message: 'continu : aucune récupération', path: ['recoveryS'] });
});
export type RealizedStructure = z.infer<typeof zRealizedStructure>;

/** Séance réalisée déclarée (données produit, jamais un diagnostic). */
export const zRealizedSession = z.object({
  sessionId: z.string().min(1),
  archetype: z.enum(RUNNING_SESSION_ARCHETYPES),
  structureFamily: z.enum(STRUCTURE_FAMILIES),
  completedAt: z.string().refine(isISODateTime, 'instant ISO attendu'),
  /** Durée RÉALISÉE (s), mesurée ou déclarée : une donnée d'entrée, jamais calculée par le moteur. */
  realizedDurationS: z.number().positive().finite(),
  completion: z.enum(['COMPLETED', 'PARTIAL', 'SKIPPED', 'UNKNOWN']),
  skipReason: z.enum(['TIME', 'EQUIPMENT', 'PAIN', 'FATIGUE', 'OTHER']).optional(),
  unexpectedDifficulty: z.enum(['EASIER', 'AS_EXPECTED', 'HARDER', 'MUCH_HARDER', 'UNKNOWN']).default('UNKNOWN'),
  intoleranceOrPainSignal: z.boolean().default(false),
  readinessOrToleranceDegraded: z.boolean().default(false),
  /** Vague 3 : structure réalisée (séances de qualité) ; absente pour une course continue simple. */
  structure: zRealizedStructure.optional(),
}).strict();
export type RealizedSession = z.infer<typeof zRealizedSession>;

/** Retour négatif (5E), au niveau de la séance : échec hors manque de temps, difficulté bien supérieure, intolérance ou douleur, readiness dégradée. */
export function sessionNegativeResponse(s: RealizedSession): boolean {
  return s.completion === 'PARTIAL'
    || (s.completion === 'SKIPPED' && s.skipReason !== 'TIME')
    || s.unexpectedDifficulty === 'MUCH_HARDER'
    || s.intoleranceOrPainSignal
    || s.readinessOrToleranceDegraded;
}

export const ANCHOR_UNAVAILABLE_CAUSES = [
  'POLICY_UNRESOLVED', 'RECENCY_UNRESOLVED', 'RETURN_START_UNKNOWN', 'NO_REALIZED_SESSION', 'NOT_RECENT', 'LATER_NEGATIVE_RESPONSE', 'LATER_SESSION_UNKNOWN', 'AMBIGUOUS',
] as const;
export type AnchorUnavailableCause = (typeof ANCHOR_UNAVAILABLE_CAUSES)[number];

export type HistoryAnchor =
  | {
    readonly status: 'anchored'; readonly session: RealizedSession; readonly feedbackKnown: boolean; readonly parameterIds: readonly string[]; readonly reasons: readonly ReasonCode[];
    /** D5 : ancre de repli (dernière dose réussie) après une séance plus récente négative — jamais une base de hausse. */
    readonly afterNegativeFallback?: true;
  }
  | { readonly status: 'unavailable'; readonly cause: AnchorUnavailableCause; readonly parameterIds: readonly string[]; readonly reasons: readonly ReasonCode[] };

export interface AnchorQuery {
  readonly archetype: RunningSessionArchetype;
  readonly structureFamily: StructureFamily;
  readonly history: readonly RealizedSession[];
  readonly now: ISODateTime;
  readonly mode: RunningMode;
  readonly parameters: readonly RunningParameter[];
  /** Reprise en cours (état ≠ NONE) : seules les séances post-retour comptent. */
  readonly returning: boolean;
  readonly returnStartedAt?: string;
}

const V19 = 'running.dose.historyAnchorPolicy';
const V12 = 'running.reference.recencyBands';

function readV19(v: unknown): boolean {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.anchor === 'LAST_REALIZED_DOSE' && o.sameArchetype === true && o.sameStructureFamily === true && o.recencyBand === 'RECENT'
    && o.recencyParameter === V12 && o.requiresNoNegativeResponse === true && o.otherwise === 'FIRST_EXPOSURE_PARAMETER'
    && (o.afterNegativeResponse === undefined || o.afterNegativeResponse === 'REFUSE' || o.afterNegativeResponse === 'LAST_SUCCESSFUL_DOSE');
}

/** Règle après un retour négatif plus récent : REFUS (V19 d'origine) ou repli sur la dernière dose réussie (décision D5). */
const fallbackAfterNegative = (v: unknown): boolean => (v as { afterNegativeResponse?: unknown }).afterNegativeResponse === 'LAST_SUCCESSFUL_DOSE';

/** Ancre de dose V19. Pure et déterministe ; toute incertitude conduit à `unavailable`, jamais à une dose par défaut. */
export function historyAnchor(q: AnchorQuery): HistoryAnchor {
  const reasons: ReasonCode[] = [];
  const parameterIds = [V19, V12];
  const unavailable = (cause: AnchorUnavailableCause): HistoryAnchor => ({
    status: 'unavailable', cause, parameterIds,
    reasons: [...reasons, runningReasons.emit(RUNNING_CODES.DOSE_ANCHOR_UNAVAILABLE, { archetype: q.archetype, cause })],
  });
  const policy = resolveParameter(q.parameters, V19, q.mode);
  reasons.push(...policy.reasons);
  if (policy.status === 'unresolved' || !readV19(policy.value)) return unavailable('POLICY_UNRESOLVED');
  const bands = resolveParameter(q.parameters, V12, q.mode);
  reasons.push(...bands.reasons);
  const recentMaxWeeks = bands.status === 'resolved' ? (bands.value as { recentMaxWeeks?: unknown }).recentMaxWeeks : undefined;
  if (typeof recentMaxWeeks !== 'number' || !(recentMaxWeeks > 0)) return unavailable('RECENCY_UNRESOLVED');
  if (q.returning && q.returnStartedAt === undefined) return unavailable('RETURN_START_UNKNOWN');

  const nowMs = toEpochMs(q.now);
  const at = (s: RealizedSession): number => toEpochMs(s.completedAt as ISODateTime);
  const sameKind = q.history
    .filter((s) => s.archetype === q.archetype && s.structureFamily === q.structureFamily)
    // Une séance future ou antérieure au retour n'est pas un niveau démontré actuel.
    .filter((s) => at(s) <= nowMs && (!q.returning || q.returnStartedAt === undefined || at(s) >= toEpochMs(q.returnStartedAt as ISODateTime)));
  const realized = sameKind.filter((s) => s.completion === 'COMPLETED' && !sessionNegativeResponse(s));
  if (realized.length === 0) return unavailable('NO_REALIZED_SESSION');
  const latest = Math.max(...realized.map(at));
  const tied = realized.filter((s) => at(s) === latest);
  const first = tied[0];
  if (first === undefined) return unavailable('NO_REALIZED_SESSION');
  // Deux ancres simultanées : doses OU structures différentes ⇒ ambiguïté exposée.
  if (tied.some((s) => s.realizedDurationS !== first.realizedDurationS || JSON.stringify(s.structure) !== JSON.stringify(first.structure))) return unavailable('AMBIGUOUS');
  if ((nowMs - latest) / MS_PER_WEEK > recentMaxWeeks) return unavailable('NOT_RECENT');
  const later = sameKind.filter((s) => at(s) > latest);
  const negativeLater = later.filter(sessionNegativeResponse);
  if (negativeLater.length > 0 && !fallbackAfterNegative(policy.value)) return unavailable('LATER_NEGATIVE_RESPONSE');
  if (later.some((s) => s.completion === 'UNKNOWN')) return unavailable('LATER_SESSION_UNKNOWN');
  // Identifiant le plus petit ; à identifiant égal (données dupliquées), ordre total sur l'enregistrement : indépendant de l'ordre d'entrée.
  const cmp = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);
  const session = [...tied].sort((a, b) => cmp(a.sessionId, b.sessionId) || cmp(JSON.stringify(a), JSON.stringify(b)))[0] ?? first;
  const feedbackKnown = session.unexpectedDifficulty !== 'UNKNOWN';
  reasons.push(runningReasons.emit(RUNNING_CODES.DOSE_ANCHOR_SELECTED, { archetype: q.archetype, sessionId: session.sessionId, realizedDurationS: session.realizedDurationS, feedbackKnown }));
  if (negativeLater.length > 0) {
    // D5 : la séance interrompue (ou négative) n'est jamais l'ancre ; on rejoue la dernière dose réussie, sans hausse.
    reasons.push(runningReasons.emit(RUNNING_CODES.DOSE_ANCHOR_FALLBACK, { archetype: q.archetype, sessionId: session.sessionId, negativeSessionIds: negativeLater.map((s) => s.sessionId).sort() }));
    return { status: 'anchored', session, feedbackKnown, parameterIds, reasons, afterNegativeFallback: true };
  }
  return { status: 'anchored', session, feedbackKnown, parameterIds, reasons };
}
