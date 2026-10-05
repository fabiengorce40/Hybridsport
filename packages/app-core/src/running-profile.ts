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
  analyzeRunning, firstExposure, parseRunningContext, performancePace, resolveParameter, RUNNING_CODES, severePace, zRunningReference,
} from '@hybridsport/running';
import type { ConfidenceLevel, ReferenceDecision, RunningReference } from '@hybridsport/running';
import { requestAssessment, weekIndexOf, withinProgramme } from '@hybridsport/programme';
import type { Clock } from './app.js';
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
  | { readonly kind: 'RACE_RESULT' | 'TIME_TRIAL'; readonly distanceM: number; readonly durationS: number; readonly measuredCourse: boolean }
  | { readonly kind: 'CRITICAL_SPEED_TEST'; readonly paceSecPerKm: number; readonly trials: number; readonly model: string }
);

/** Référence au contrat du moteur (validée par son schéma) : source USER_DECLARED, date et provenance conservées. */
export function referenceFromDeclaration(x: DeclaredPerformance, recordedAt: string, seq: number): RunningReference {
  const base = {
    referenceId: `declared:${x.kind}:${normalizeInstant(recordedAt)}:${String(seq)}`,
    type: x.kind,
    date: sessionInstant(x.date),
    confidenceInputs: { protocolDeclared: x.kind === 'CRITICAL_SPEED_TEST' ? true : x.measuredCourse, conditions: x.conditions, interruptionSince: x.interruptionSince },
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

