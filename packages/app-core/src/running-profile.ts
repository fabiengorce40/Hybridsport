/**
 * Profil Course (Beta 0) : SAISIE d'observations (performances réalisées, Critical Speed mesurée ailleurs) au contrat
 * `RunningReference` du moteur Running, et LECTURE de ce que le moteur en déduit (analyse `analyzeRunning`, allure
 * gouvernée `severePace`, première exposition `firstExposure`, paramètre gouverné des repères d'effort).
 *
 * Aucune formule physiologique ici : aucune Critical Speed calculée, aucune zone, aucune allure fabriquée, aucune
 * conversion entre distances. Seule arithmétique : conversion d'unités d'une saisie (allure ↔ vitesse) et de dates.
 * Une référence n'est jamais effacée : une nouvelle performance s'ajoute (date et provenance conservées).
 * L'objectif (distance, date) reste dans le programme : il n'est jamais une performance observée.
 */
import type { ReasonCode } from '@hybridsport/domain';
import {
  analyzeRunning, firstExposure, KEY_PREFERENCES, parseRunningContext, performancePace, resolveParameter, RUNNING_CODES, severePace, zRunningReference,
} from '@hybridsport/running';
import type { ConfidenceLevel, ReferenceDecision, RunningGoal, RunningReference, RunningSessionArchetype } from '@hybridsport/running';
import { requestAssessment, weekIndexOf, withinProgramme } from '@hybridsport/programme';
import { logFreeRun } from './app.js';
import type { Clock, FreeRunInput } from './app.js';
import { beta0Environment, beta0RunningGovernance } from './beta0.js';
import { dateOf, normalizeInstant, sessionInstant, weekStartOf } from './dates.js';
import { AppError } from './errors.js';
import { runningContext } from './generate.js';
import type { AppState } from './model.js';
import { planProgrammeCurrentWeek, ProgrammeError } from './programme.js';
import type { ProgrammeEnvironment } from './programme.js';

// technical-constant: conversion d'unités (mètres par kilomètre)
const M_PER_KM = 1000;

/** Contexte de la mesure (entrées de confiance du contrat Running, déclarées par l'utilisateur). */
interface DeclaredContext {
  /** Date de réalisation (AAAA-MM-JJ), jamais dans le futur. */
  readonly date: string;
  readonly conditions: 'NORMAL' | 'ATYPICAL' | 'UNKNOWN';
  /** Arrêt de la course depuis la mesure. */
  readonly interruptionSince: 'NONE' | 'YES' | 'UNKNOWN';
}
/**
 * Observation saisie :
 * - performance réalisée (course officielle ou contre-la-montre) : distance, chrono, distance mesurée ou non ;
 * - Critical Speed MESURÉE AILLEURS (laboratoire, appareil, coach) : allure, nombre d'essais, modèle déclaré.
 */
export type DeclaredPerformance = DeclaredContext & (
  | {
    readonly kind: 'RACE_RESULT' | 'TIME_TRIAL'; readonly distanceM: number; readonly durationS: number; readonly measuredCourse: boolean;
    /** REKKA — effort maximal CONFIRMÉ par l'athlète (jamais supposé) : tracé dans les entrées de confiance du contrat. */
    readonly maximalEffort?: boolean;
  }
  | { readonly kind: 'CRITICAL_SPEED_TEST'; readonly paceSecPerKm: number; readonly trials: number; readonly model: string }
);

/** Référence au contrat du moteur (validée par son schéma) : source USER_DECLARED, date et provenance conservées. */
export function referenceFromDeclaration(x: DeclaredPerformance, recordedAt: string, seq: number): RunningReference {
  const base = {
    referenceId: `declared:${x.kind}:${normalizeInstant(recordedAt)}:${String(seq)}`,
    type: x.kind,
    date: sessionInstant(x.date),
    confidenceInputs: {
      protocolDeclared: x.kind === 'CRITICAL_SPEED_TEST' ? true : x.measuredCourse, conditions: x.conditions, interruptionSince: x.interruptionSince,
      ...(x.kind !== 'CRITICAL_SPEED_TEST' && x.maximalEffort === true ? { maximalEffortDeclared: true } : {}),
    },
  };
  const ref = x.kind === 'CRITICAL_SPEED_TEST'
    ? { ...base, values: { speedMps: M_PER_KM / x.paceSecPerKm, trials: x.trials }, provenance: { source: 'USER_DECLARED' as const, method: x.model } }
    : { ...base, values: { distanceM: x.distanceM, durationS: x.durationS }, provenance: { source: 'USER_DECLARED' as const } };
  const parsed = zRunningReference.safeParse(ref);
  if (!parsed.success) throw new AppError('RUNNING_REFERENCE_INVALID');
  return parsed.data;
}

/** Ajoute une observation (jamais de remplacement ni d'effacement des références précédentes). */
export function declareRunningPerformance(state: AppState, clock: Clock, x: DeclaredPerformance): AppState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date) || x.date > clock.today) throw new AppError('RUNNING_REFERENCE_DATE_INVALID');
  const ref = referenceFromDeclaration(x, clock.now, state.running.references.length + 1);
  return { ...state, running: { ...state.running, references: [...state.running.references, ref] }, revision: state.revision + 1 };
}

// ——— REKKA : sortie d'entraînement (allure observée, sans prétention de performance maximale)

/** Sortie d'entraînement ordinaire : course RÉALISÉE, jamais une référence de performance (VO₂, seuil, Critical Speed). */
export interface TrainingRunInput {
  /** Date de la sortie (AAAA-MM-JJ), jamais dans le futur. */
  readonly date: string;
  readonly durationS: number;
  readonly distanceM?: number;
  /** Ressenti, s'il est connu ; inconnu ⇒ jamais une preuve de tolérance. */
  readonly difficulty?: FreeRunInput['difficulty'];
}
/** Sortie d'entraînement → course réalisée au contrat Running (même chemin que les courses hors programme). */
export const trainingRunOf = (x: TrainingRunInput): FreeRunInput => ({
  realizedDurationS: x.durationS, ...(x.distanceM !== undefined ? { distanceM: x.distanceM } : {}), completion: 'COMPLETED', difficulty: x.difficulty ?? 'UNKNOWN', pain: false, completedOn: x.date,
});

// ——— REKKA : requalification d'une performance déclarée en SORTIE D'ENTRAÎNEMENT

/** Types requalifiables : performances déclarées par l'athlète avec distance et chrono (jamais un TEST KAIRO). */
const REQUALIFIABLE: readonly RunningReference['type'][] = ['RACE_RESULT', 'TIME_TRIAL'];

export interface RequalifyInput {
  /** Confirmation EXPLICITE de l'athlète dans l'application : sans elle, rien n'est écrit. */
  readonly confirmed: boolean;
  /** Ressenti de la sortie, s'il est connu ; inconnu ⇒ jamais une preuve de tolérance (aucune progression sur cette base). */
  readonly difficulty?: FreeRunInput['difficulty'];
}

/**
 * Requalifie une performance DÉCLARÉE (course officielle, chrono) en sortie d'entraînement ordinaire, sur confirmation
 * explicite : la référence reste dans l'historique mais n'est plus transmise au moteur Running (ni allure, ni seuil,
 * ni séance clé) ; la sortie devient une course RÉALISÉE (durée, distance, date, ressenti) — celle que le moteur lit
 * pour doser un footing, avec son ancienneté réelle. Sans doublon : une course réalisée du même jour, de même durée
 * (et même distance si elle est connue) est seulement reliée. Rien n'est modifié dans les semaines planifiées ici.
 */
export function requalifyAsTrainingRun(state: AppState, clock: Clock, referenceId: string, x: RequalifyInput): AppState {
  if (x.confirmed !== true) throw new AppError('RUNNING_REQUALIFY_NOT_CONFIRMED');
  const ref = state.running.references.find((r) => r.referenceId === referenceId);
  if (!ref || ref.provenance.source !== 'USER_DECLARED' || !REQUALIFIABLE.includes(ref.type)) throw new AppError('RUNNING_REQUALIFY_UNAVAILABLE');
  if (state.running.requalified?.[referenceId]) throw new AppError('RUNNING_ALREADY_REQUALIFIED');
  const { distanceM, durationS } = ref.values;
  if (distanceM === undefined || durationS === undefined) throw new AppError('RUNNING_REQUALIFY_UNAVAILABLE');
  const day = dateOf(ref.date);
  const same = state.running.realized.find((r) => dateOf(r.completedAt) === day && r.realizedDurationS === durationS && (r.distanceM === undefined || r.distanceM === distanceM));
  let next = state;
  let runId = same?.sessionId;
  if (runId === undefined) {
    const before = new Set(state.running.realized.map((r) => r.sessionId));
    next = logFreeRun(state, { realizedDurationS: durationS, distanceM, completion: 'COMPLETED', difficulty: x.difficulty ?? 'UNKNOWN', pain: false, completedOn: day }, clock);
    runId = next.running.realized.find((r) => !before.has(r.sessionId))?.sessionId;
    if (runId === undefined) throw new AppError('RUNNING_REQUALIFY_UNAVAILABLE');
  }
  const entry = { at: normalizeInstant(clock.now), runId, link: same ? 'existing' as const : 'created' as const };
  return { ...next, running: { ...next.running, requalified: { ...(next.running.requalified ?? {}), [referenceId]: entry } }, revision: next.revision + (same ? 1 : 0) };
}

// ——— Lecture : ce que le moteur Running déduit des références

export type RecencyBand = 'RECENT' | 'AGING' | 'STALE' | 'FUTURE' | 'UNKNOWN';
export interface ReferenceView {
  readonly referenceId: string;
  readonly type: RunningReference['type'];
  readonly source: RunningReference['provenance']['source'];
  readonly date: string;
  readonly distanceM: number | null;
  readonly durationS: number | null;
  /** Allure de la performance (arithmétique du moteur `performancePace`), ou de la vitesse déclarée. */
  readonly paceSecPerKm: number | null;
  readonly trials: number | null;
  readonly method: string | null;
  readonly recency: RecencyBand;
  /** Décisions pour lesquelles le moteur a RETENU cette référence. */
  readonly selectedFor: readonly ReferenceDecision[];
  /** REKKA — requalifiée en sortie d'entraînement (plus transmise au moteur), avec la course réalisée liée. */
  readonly requalified: { readonly at: string; readonly runId: string } | null;
  /** REKKA — requalification proposée (performance déclarée avec distance et chrono, pas encore requalifiée). */
  readonly requalifiable: boolean;
}
export interface DecisionView {
  readonly decision: ReferenceDecision;
  readonly selectedId: string | null;
  readonly confidence: ConfidenceLevel;
}
export type KeySessionAccess = { readonly status: 'available'; readonly testReferenceId: string } | { readonly status: 'test_required' } | { readonly status: 'unavailable'; readonly cause: string };
export interface RunningProfileView {
  readonly rulesetVersion: string;
  readonly mode: 'CANDIDATE' | 'PRODUCTION';
  /** Toutes les références, plus récentes d'abord (historique complet). */
  readonly references: readonly ReferenceView[];
  readonly decisions: readonly DecisionView[];
  /** Performances comparables discordantes (le moteur demande alors une calibration). */
  readonly conflicts: readonly { readonly referenceIds: readonly string[] }[];
  /** Critical Speed : uniquement une valeur MESURÉE et déclarée (le moteur n'en calcule aucune). */
  readonly criticalSpeed: { readonly status: 'declared'; readonly referenceId: string; readonly paceSecPerKm: number; readonly date: string; readonly trials: number | null; readonly method: string | null } | { readonly status: 'missing' };
  /** Allure gouvernée des séances sévères (ancre V18 ± largeur V03), ou effort seul avec les causes. */
  readonly severePace: { readonly status: 'pace'; readonly minSecPerKm: number; readonly maxSecPerKm: number; readonly referenceId: string; readonly confidence: ConfidenceLevel } | { readonly status: 'effort'; readonly causes: readonly string[] };
  /** Accès aux premières séances clés (règle du registre : test récent exigé). */
  readonly keySessions: { readonly threshold: KeySessionAccess; readonly severe: KeySessionAccess };
  /**
   * REKKA — séances clés que la composition de la semaine du moteur PRÉVOIT pour l'objectif (table §R, préférence avant
   * le footing) : « autorisées par vos données » n'est jamais présenté comme « programmées ».
   */
  readonly plannedByGoal: { readonly threshold: boolean; readonly severe: boolean };
  /** Repères d'effort par domaine (paramètre gouverné), uniquement s'il est résolu dans le mode. */
  readonly effortDomains: { readonly status: 'approved' | 'candidate'; readonly bands: Readonly<Record<string, { readonly min?: number; readonly max?: number }>> } | { readonly status: 'unavailable' };
  /** Bandes de récence gouvernées (semaines), si résolues. */
  readonly recencyWeeks: { readonly recent: number; readonly aging: number } | null;
  /** Modèle de performance entre distances : indisponible (aucun modèle implémenté) ⇒ cause. */
  readonly performanceModel: { readonly status: 'available' } | { readonly status: 'unavailable'; readonly cause: string };
  /** Évaluation Running (TEST) du programme : la plus récente. */
  readonly test: { readonly status: string; readonly scheduledWeek: number | null } | null;
  readonly reasons: readonly ReasonCode[];
}

/** Archétype clé prévu par la composition pour l'objectif : présent dans la table §R AVANT le footing (EASY). */
function plannedByGoal(goal: RunningGoal): { threshold: boolean; severe: boolean } {
  const prefs = KEY_PREFERENCES[goal];
  const easy = prefs.indexOf('EASY');
  const before = (a: RunningSessionArchetype) => { const i = prefs.indexOf(a); return i >= 0 && (easy < 0 || i < easy); };
  return { threshold: before('THRESHOLD'), severe: before('SEVERE') || before('SHORT_INTERVAL') };
}

const PROFILE_DECISIONS: readonly ReferenceDecision[] = ['INTENSITY_TARGETING', 'THRESHOLD_BOUNDARY', 'SEVERE_DOMAIN', 'RACE_SPECIFIC_PACE'];

function keyAccess(r: ReturnType<typeof firstExposure>): KeySessionAccess {
  if (r.status === 'applied') return { status: 'available', testReferenceId: r.testReferenceId };
  const cause = String(r.reasons.find((x) => x.code === RUNNING_CODES.FIRST_EXPOSURE_REFUSED)?.params.cause ?? 'UNKNOWN');
  return cause === 'RECENT_TEST_REQUIRED' ? { status: 'test_required' } : { status: 'unavailable', cause };
}

/** Profil Course calculé PAR LE MOTEUR à la date `today` (aucun profil sans course activée). */
export function selectRunningProfile(state: AppState, today: string): RunningProfileView | null {
  const p = state.profile;
  if (!p?.running.enabled) return null;
  const parsed = parseRunningContext(runningContext(state, p, { date: today }));
  if (!parsed.ok) return null;
  const ctx = parsed.context;
  const g = beta0RunningGovernance();
  const now = sessionInstant(today);
  const analysis = analyzeRunning(ctx, g, now);
  const sel = (d: ReferenceDecision) => analysis.references.find((r) => r.decision === d);
  const recencyOf = (id: string): RecencyBand => {
    const f = sel('INTENSITY_TARGETING')?.candidates.find((c) => c.referenceId === id)?.factors.find((x) => x.factor === 'RECENCY')?.cause;
    return f === 'RECENT' || f === 'AGING' || f === 'STALE' ? f : f === 'FUTURE_DATE' ? 'FUTURE' : 'UNKNOWN';
  };
  const references = [...state.running.references].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.referenceId.localeCompare(a.referenceId))).map((r): ReferenceView => ({
    referenceId: r.referenceId, type: r.type, source: r.provenance.source, date: r.date,
    distanceM: r.values.distanceM ?? null, durationS: r.values.durationS ?? null, paceSecPerKm: performancePace(r) ?? null,
    trials: r.values.trials ?? null, method: r.provenance.method ?? null,
    recency: r.date > now ? 'FUTURE' : recencyOf(r.referenceId),
    selectedFor: PROFILE_DECISIONS.filter((d) => sel(d)?.selected?.referenceId === r.referenceId),
    requalified: (() => { const q = state.running.requalified?.[r.referenceId]; return q ? { at: q.at, runId: q.runId } : null; })(),
    requalifiable: state.running.requalified?.[r.referenceId] === undefined && r.provenance.source === 'USER_DECLARED' && REQUALIFIABLE.includes(r.type) && r.values.distanceM !== undefined && r.values.durationS !== undefined,
  }));
  const cs = references.find((r) => r.type === 'CRITICAL_SPEED_TEST' && r.paceSecPerKm !== null);
  const paceOn = analysis.capabilities.find((c) => c.capability === 'paceTargets')?.enabled === true;
  const pace = severePace({ archetype: 'SEVERE', ctx, now, paceTargetsEnabled: paceOn, parameters: g.parameters, mode: ctx.mode });
  const fe = (archetype: 'THRESHOLD' | 'SEVERE') => keyAccess(firstExposure({ archetype, level: ctx.population.level, ctx, now, parameters: g.parameters, mode: ctx.mode }));
  const rpe = resolveParameter(g.parameters, 'running.target.rpeByDomain', ctx.mode);
  const bands = rpe.status === 'resolved' ? Object.fromEntries(Object.entries(rpe.value as Record<string, unknown>).flatMap(([k, v]) => {
    const b = v as { min?: unknown; max?: unknown } | null;
    const min = typeof b?.min === 'number' ? b.min : undefined;
    const max = typeof b?.max === 'number' ? b.max : undefined;
    return min === undefined && max === undefined ? [] : [[k, { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) }]];
  })) : {};
  const rec = resolveParameter(g.parameters, 'running.reference.recencyBands', ctx.mode);
  const rv = rec.status === 'resolved' ? rec.value as { recentMaxWeeks?: unknown; agingMaxWeeks?: unknown } : undefined;
  const lastTest = [...(state.programmeState?.assessments ?? [])].reverse().find((a) => a.sport === 'running');
  return {
    rulesetVersion: analysis.rulesetVersion, mode: ctx.mode, references,
    decisions: PROFILE_DECISIONS.map((d) => ({ decision: d, selectedId: sel(d)?.selected?.referenceId ?? null, confidence: sel(d)?.confidence ?? 'NONE' })),
    conflicts: (sel('INTENSITY_TARGETING')?.conflicts ?? []).map((c) => ({ referenceIds: [...c.referenceIds] })),
    criticalSpeed: cs?.paceSecPerKm != null ? { status: 'declared', referenceId: cs.referenceId, paceSecPerKm: cs.paceSecPerKm, date: cs.date, trials: cs.trials, method: cs.method } : { status: 'missing' },
    severePace: pace.status === 'pace'
      ? { status: 'pace', minSecPerKm: pace.secPerKm.min, maxSecPerKm: pace.secPerKm.max, referenceId: pace.referenceId, confidence: pace.confidence }
      : { status: 'effort', causes: [...pace.causes] },
    keySessions: { threshold: fe('THRESHOLD'), severe: fe('SEVERE') },
    plannedByGoal: plannedByGoal(p.running.goal),
    effortDomains: rpe.status === 'resolved' && Object.keys(bands).length > 0 ? { status: rpe.candidate ? 'candidate' : 'approved', bands } : { status: 'unavailable' },
    recencyWeeks: typeof rv?.recentMaxWeeks === 'number' && typeof rv.agingMaxWeeks === 'number' ? { recent: rv.recentMaxWeeks, aging: rv.agingMaxWeeks } : null,
    performanceModel: analysis.performanceModel.status === 'available' ? { status: 'available' } : { status: 'unavailable', cause: analysis.performanceModel.cause },
    test: lastTest ? { status: lastTest.status, scheduledWeek: lastTest.scheduledWeek ?? null } : null,
    reasons: [...pace.reasons],
  };
}

// ——— « Je n'ai pas de chrono récent » : TEST programmé par le mécanisme d'évaluation du programme

/**
 * Demande le TEST Running (contenu déclaré du programme, protocole du registre Running) pour la semaine courante si
 * elle n'a encore aucune séance commencée ni réalisée (la semaine est alors replanifiée), sinon pour la suivante.
 */
export function requestRunningTest(state: AppState, clock: Clock, env: ProgrammeEnvironment = beta0Environment()): AppState {
  const ps = state.programmeState;
  if (!ps) throw new AppError('PROGRAMME_MISSING');
  const cur = weekIndexOf(ps, clock.today);
  const thisWeek = weekStartOf(clock.today);
  const started = Object.values(state.programmeLogs).some((l) => weekStartOf(dateOf(l.startedAt)) === thisWeek)
    || ps.results.some((r) => r.weekIndex === cur && r.provenance === 'declared') || ps.weeks.some((w) => w.weekIndex === cur && w.closedAt);
  const target = started || cur < 0 ? Math.max(cur + 1, 0) : cur;
  if (!withinProgramme(ps, target)) throw new AppError('RUNNING_TEST_OUT_OF_PROGRAMME');
  const r = requestAssessment(ps, 'running', target, normalizeInstant(clock.now));
  if (!r.ok) throw new ProgrammeError('RUNNING_TEST_REFUSED', r.reasons);
  const next: AppState = { ...state, programmeState: r.value };
  // Semaine courante déjà planifiée, sans séance commencée : replanifiée pour porter le TEST.
  const planned = r.value.weeks.some((w) => w.weekIndex === target && !w.closedAt);
  return target === cur && planned ? planProgrammeCurrentWeek(next, clock, env, cur, { pastDaysUnavailable: true }) : next;
}

