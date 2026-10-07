/**
 * KAIRO FIELD TEST — collecte terrain et journal Beta. Lecture et OBSERVATION seulement :
 *   - retour terrain déclaré par l'utilisateur après une séance terminée (provenance `USER_REPORTED_FIELD_FEEDBACK`),
 *     stocké avec la réalisation, JAMAIS transmis à un moteur, jamais interprété (aucun seuil, aucune valeur déduite) ;
 *   - journal Beta : projection de l'état persisté (prescription, placement, exécution, retour, qualité Q1, refus, M3)
 *     pour l'analyse après le test terrain ; export JSON et texte lisible.
 * Aucune décision sportive ici : aucune prescription n'est lue autrement que telle que persistée.
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import type { ProgrammeResult } from '@hybridsport/programme';
import type { Clock } from './app.js';
import { BETA0_PLANNING_VERSION, beta0Integrity, sessionView } from './beta0.js';
import type { SessionView } from './beta0.js';
import { selectHistory } from './beta0-app.js';
import type { HistoryEntry } from './beta0-app.js';
import { dateOf, normalizeInstant } from './dates.js';
import { AppError } from './errors.js';
import { FIELD_COMMENT_MAX, FIELD_DIFFICULTIES, FIELD_DURATIONS, FIELD_FEEDBACK_PROVENANCE, FIELD_TOLERANCES, zFieldFeedback } from './model.js';
import type { AppState, FieldFeedback, PersistedWeek, ProgrammeLog, Sport } from './model.js';

// technical-constant: conversion millisecondes → secondes
const MS_PER_S = 1000;
// technical-constant: indentation du fichier JSON exporté (lisibilité)
const JSON_INDENT = 2;
// technical-constant: secondes affichées sur deux chiffres
const TWO_DIGITS = 2;
// technical-constant: secondes par minute (affichage)
const S_PER_MIN = 60;
// technical-constant: version du format d'export du journal Beta (contrat de fichier)
export const BETA_JOURNAL_SCHEMA = 1;

export interface FieldFeedbackInput {
  readonly difficulty?: FieldFeedback['difficulty'];
  readonly tolerance?: FieldFeedback['tolerance'];
  readonly perceivedDuration?: FieldFeedback['perceivedDuration'];
  readonly comment?: string;
}

const oneOf = <T extends string>(xs: readonly T[], v: unknown): v is T => typeof v === 'string' && (xs as readonly string[]).includes(v);

/**
 * Retour terrain d'une séance TERMINÉE (une seule fois). Refus explicites : séance non terminée, retour déjà
 * enregistré (double soumission), retour vide, commentaire trop long, valeur inconnue. Un commentaire vide (espaces)
 * est une absence. N'écrit QUE le journal de la séance : aucun moteur, aucun historique sportif, aucune progression.
 */
export function recordFieldFeedback(state: AppState, clock: Clock, requestId: string, input: FieldFeedbackInput): AppState {
  const log = state.programmeLogs[requestId];
  if (!log?.finishedAt || !log.outcome) throw new AppError('FIELD_FEEDBACK_SESSION_NOT_FINISHED');
  if (log.field) throw new AppError('FIELD_FEEDBACK_ALREADY_RECORDED');
  const comment = input.comment?.trim() ?? '';
  if (comment.length > FIELD_COMMENT_MAX) throw new AppError('FIELD_FEEDBACK_COMMENT_TOO_LONG');
  if (input.difficulty !== undefined && !oneOf(FIELD_DIFFICULTIES, input.difficulty)) throw new AppError('FIELD_FEEDBACK_INVALID');
  if (input.tolerance !== undefined && !oneOf(FIELD_TOLERANCES, input.tolerance)) throw new AppError('FIELD_FEEDBACK_INVALID');
  if (input.perceivedDuration !== undefined && !oneOf(FIELD_DURATIONS, input.perceivedDuration)) throw new AppError('FIELD_FEEDBACK_INVALID');
  if (input.difficulty === undefined && input.tolerance === undefined && input.perceivedDuration === undefined && comment === '') throw new AppError('FIELD_FEEDBACK_EMPTY');
  const field = zFieldFeedback.parse({
    provenance: FIELD_FEEDBACK_PROVENANCE, recordedAt: normalizeInstant(clock.now),
    ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
    ...(input.tolerance !== undefined ? { tolerance: input.tolerance } : {}),
    ...(input.perceivedDuration !== undefined ? { perceivedDuration: input.perceivedDuration } : {}),
    ...(comment !== '' ? { comment } : {}),
  });
  const next: ProgrammeLog = { ...log, field };
  return { ...state, programmeLogs: { ...state.programmeLogs, [requestId]: next } };
}

/** Retour terrain enregistré d'une séance (null : aucun). */
export const fieldFeedbackOf = (state: AppState, requestId: string): FieldFeedback | null => state.programmeLogs[requestId]?.field ?? null;

/** Exécution observée d'une séance (horodatages, chrono du sport, durée courue) ; null si jamais commencée. */
export interface FieldExecution {
  readonly startedAt: string;
  readonly finishedAt: string | null;
  /** Temps entre « Commencer » et « Terminer » (horloge, pauses comprises), s. */
  readonly wallDurationS: number | null;
  /** Chrono de la séance (Cross-training, HYROX : pauses exclues), s. */
  readonly chronoS: number | null;
  /** Course : durée réellement courue déclarée, s ; distance déclarée, m. */
  readonly runDurationS: number | null;
  readonly distanceM: number | null;
  readonly completion: 'completed_as_prescribed' | 'modified' | 'abandoned' | null;
  readonly pain: boolean;
  readonly setsDone: number;
  readonly ctResult: Readonly<Record<string, unknown>> | null;
  readonly hrResult: Readonly<Record<string, unknown>> | null;
}
function executionOf(log: ProgrammeLog | undefined): FieldExecution | null {
  if (!log) return null;
  const o = log.outcome;
  const wall = log.finishedAt ? Math.max(0, Math.round((Date.parse(log.finishedAt) - Date.parse(log.startedAt)) / MS_PER_S)) : null;
  return {
    startedAt: log.startedAt, finishedAt: log.finishedAt ?? null, wallDurationS: wall,
    chronoS: o?.ct?.elapsedS ?? o?.hr?.elapsedS ?? null, runDurationS: o?.run?.realizedDurationS ?? null, distanceM: o?.run?.distanceM ?? null,
    completion: o?.completion ?? null, pain: o?.pain ?? false, setsDone: log.sets.filter((x) => x.done).length,
    ctResult: o?.ct?.result ?? null, hrResult: o?.hr?.result ?? null,
  };
}

/** Durée réelle la plus fidèle d'une séance terminée : course déclarée, sinon chrono du sport, sinon horloge. */
export const realDurationS = (e: FieldExecution | null): number | null => (e ? e.runDurationS ?? e.chronoS ?? e.wallDurationS : null);

type Req = PersistedWeek['requests'][number];

export interface BetaJournalEntry {
  readonly weekStart: string;
  readonly requestId: string;
  readonly sport: Sport;
  /** Jour PLACÉ ; non placée réalisée : jour RÉEL ; sinon null. */
  readonly date: string | null;
  readonly placement: SessionView['placement'];
  /** Provenance de la réalisation (`declared` planifiée, `manual_from_unplaced`, `derived_missed`) ; null : aucune. */
  readonly provenance: ProgrammeResult['provenance'] | null;
  readonly archetypeId: string | null;
  readonly role: string | null;
  readonly status: SessionView['status'] | 'in_progress';
  readonly prescription: {
    readonly targetDurationS: number | null; readonly estimatedDurationS: number | null; readonly ctFormat: string | null; readonly hrTimeCapS: number | null;
    readonly exercises: readonly string[];
  } | null;
  readonly execution: FieldExecution | null;
  readonly feedback: FieldFeedback | null;
  /** Q1 — diagnostic persisté (verdict + `critère|statut|base`), jamais recalculé. */
  readonly quality: { readonly verdict: NonNullable<Req['quality']>['verdict']; readonly criteria: readonly string[] } | null;
  /** Refus / non-placement : catégorie et raison principale (codes, pour l'analyse). */
  readonly refusal: { readonly category: string; readonly reasonCode: string | null } | null;
  /** M3 — arbitrage lisible (déplacement, échange, recomposition, conflit restant). */
  readonly m3: SessionView['arbitration'];
}

const recordOf = (r: Req): SessionRecord | null => {
  if (!r.record) return null;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value : null;
};
const exercisesOf = (s: SessionDraft | undefined): string[] => (s?.blocks ?? []).flatMap((b) => b.items.map((i) => i.exerciseId));

/** Semaines du programme persistées (ordre chronologique), avec leurs demandes. */
const programmeWeeks = (state: AppState) => Object.values(state.planner.weeks).filter((w) => w.owner === 'programme').sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

/**
 * Journal Beta : toutes les séances des semaines du programme (planifiées, non placées, refusées), avec ce qui a été
 * prescrit, fait et déclaré. Ordre : semaine, puis jour, puis identifiant. Lecture seule.
 */
export function selectBetaJournal(state: AppState): readonly BetaJournalEntry[] {
  const results = state.programmeState?.results ?? [];
  return programmeWeeks(state).flatMap((w) => {
    const sportById = new Map(w.requests.map((r) => [r.requestId, r.sport]));
    return w.requests.map((r): BetaJournalEntry => {
      const result = results.find((x) => x.requestId === r.requestId);
      const v = sessionView(r, result, (id) => sportById.get(id) ?? null);
      const log = state.programmeLogs[r.requestId];
      const prescribed = v.placement !== 'blocked';
      return {
        weekStart: w.weekStart, requestId: r.requestId, sport: r.sport, date: v.date ?? (log ? dateOf(log.startedAt) : null), placement: v.placement,
        provenance: result?.provenance ?? null, archetypeId: v.archetypeId, role: v.role,
        status: log && !log.finishedAt ? 'in_progress' : v.status,
        prescription: prescribed ? { targetDurationS: v.targetDurationS, estimatedDurationS: v.estimatedDurationS, ctFormat: v.ctFormat, hrTimeCapS: v.hrTimeCapS, exercises: exercisesOf(recordOf(r)?.session) } : null,
        execution: executionOf(log), feedback: log?.field ?? null,
        quality: r.quality ? { verdict: r.quality.verdict, criteria: [...r.quality.criteria] } : null,
        refusal: v.notPlanned ? { category: v.notPlanned.category, reasonCode: v.notPlanned.reason?.code ?? null } : null,
        m3: v.arbitration,
      };
    });
  });
}

/** Historique enrichi pour le terrain : provenance manuelle, durée réelle, retour déclaré. */
export interface FieldHistoryEntry extends HistoryEntry {
  readonly manual: boolean;
  readonly durationS: number | null;
  readonly feedback: FieldFeedback | null;
}
export function selectFieldHistory(state: AppState): readonly FieldHistoryEntry[] {
  const results = state.programmeState?.results ?? [];
  return selectHistory(state).map((e) => ({
    ...e, manual: results.some((r) => r.requestId === e.requestId && r.provenance === 'manual_from_unplaced'),
    durationS: realDurationS(executionOf(state.programmeLogs[e.requestId])), feedback: state.programmeLogs[e.requestId]?.field ?? null,
  }));
}

export interface BetaJournalMeta {
  /** Version testée : commit de la build, date de build, version de planification. */
  readonly build: string;
  readonly builtAt: string | null;
  readonly exportedAt: string;
}

/**
 * Export du journal Beta (JSON) : profil sportif utile (sans prénom), programme (définition, semaines, audit des
 * décisions), semaines planifiées (prescriptions complètes, diagnostics, raisons), journal par séance, historique,
 * sécurité, intégrité. Aucune donnée technique inutile (aucun stockage brut, aucune clé interne du navigateur).
 */
export function exportBetaJournal(state: AppState, meta: BetaJournalMeta): string {
  const { displayName: _name, ...profile } = state.profile ?? ({ displayName: '' } as NonNullable<AppState['profile']>);
  const ps = state.programmeState;
  const doc = {
    kind: 'kairo.field_journal', schema: BETA_JOURNAL_SCHEMA, label: 'KAIRO FIELD TEST — Beta expérimentale',
    build: meta.build, builtAt: meta.builtAt, planningVersion: BETA0_PLANNING_VERSION, exportedAt: normalizeInstant(meta.exportedAt),
    feedbackProvenance: FIELD_FEEDBACK_PROVENANCE,
    profile: state.profile ? profile : null,
    programme: ps ? { definition: ps.definition, weeks: ps.weeks, results: ps.results, audit: ps.audit } : null,
    weeks: programmeWeeks(state).map((w) => ({
      weekStart: w.weekStart, planningVersion: w.planningVersion ?? null, authority: w.authority, simulation: w.simulation,
      requests: w.requests.map((r) => ({ requestId: r.requestId, sport: r.sport, status: r.status, date: r.date ?? null, category: r.category, intent: r.intent ?? null, composition: r.composition ?? null, composedFor: r.composedFor ?? null, quality: r.quality ?? null, reasons: r.reasons, session: recordOf(r)?.session ?? null })),
    })),
    journal: selectBetaJournal(state),
    history: selectFieldHistory(state),
    safety: state.safety,
    integrity: beta0Integrity(state),
  };
  return JSON.stringify(doc, null, JSON_INDENT);
}

const DIFFICULTY_TEXT: Readonly<Record<string, string>> = { very_easy: 'très facile', easy: 'facile', adapted: 'adaptée', hard: 'difficile', very_hard: 'très difficile' };
const TOLERANCE_TEXT: Readonly<Record<string, string>> = { good: 'bonne', medium: 'moyenne', poor: 'mauvaise' };
const DURATION_TEXT: Readonly<Record<string, string>> = { too_short: 'trop courte', adapted: 'adaptée', too_long: 'trop longue' };
/** Retour terrain en texte lisible (libellés de l'utilisateur, aucune interprétation). */
export function fieldFeedbackText(f: FieldFeedback | null): string | null {
  if (!f) return null;
  return [
    f.difficulty ? `difficulté ${DIFFICULTY_TEXT[f.difficulty] ?? f.difficulty}` : null,
    f.tolerance ? `tolérance ${TOLERANCE_TEXT[f.tolerance] ?? f.tolerance}` : null,
    f.perceivedDuration ? `durée ${DURATION_TEXT[f.perceivedDuration] ?? f.perceivedDuration}` : null,
    f.comment ? `« ${f.comment} »` : null,
  ].filter(Boolean).join(' · ');
}

const mmss = (s: number | null): string => (s === null ? '—' : `${String(Math.floor(s / S_PER_MIN))} min ${String(Math.round(s % S_PER_MIN)).padStart(TWO_DIGITS, '0')} s`);
/** Journal Beta en texte lisible (une ligne par séance, puis détails) : pour la lecture humaine après le test. */
export function betaJournalText(state: AppState, meta: BetaJournalMeta): string {
  const lines = [`KAIRO FIELD TEST — Beta expérimentale`, `Version ${meta.build}${meta.builtAt ? ` (build ${meta.builtAt})` : ''} · planification ${BETA0_PLANNING_VERSION} · export ${normalizeInstant(meta.exportedAt)}`, ''];
  for (const e of selectBetaJournal(state)) {
    const head = `${e.date ?? 'sans jour'} · ${e.sport} · ${e.archetypeId ?? '—'}${e.role ? ` (${e.role})` : ''} · ${e.placement}${e.provenance ? ` / ${e.provenance}` : ''} · ${e.status}`;
    lines.push(head);
    if (e.prescription) lines.push(`  prescription : ${[e.prescription.ctFormat, e.prescription.hrTimeCapS !== null ? `time cap ${mmss(e.prescription.hrTimeCapS)}` : null, e.prescription.estimatedDurationS !== null ? `≈ ${mmss(e.prescription.estimatedDurationS)}` : e.prescription.targetDurationS !== null ? `cible ${mmss(e.prescription.targetDurationS)}` : null, e.prescription.exercises.join(' + ')].filter(Boolean).join(' · ')}`);
    if (e.execution) lines.push(`  exécution : ${e.execution.completion ?? 'en cours'} · durée réelle ${mmss(realDurationS(e.execution))}${e.execution.pain ? ' · DOULEUR' : ''}${e.execution.ctResult ? ` · résultat ${JSON.stringify(e.execution.ctResult)}` : ''}${e.execution.hrResult ? ` · résultat ${JSON.stringify(e.execution.hrResult)}` : ''}`);
    if (e.feedback) lines.push(`  retour terrain : ${fieldFeedbackText(e.feedback) ?? ''}`);
    if (e.quality) lines.push(`  qualité Q1 : ${e.quality.verdict}`);
    if (e.refusal) lines.push(`  non placée / refus : ${e.refusal.category}${e.refusal.reasonCode ? ` (${e.refusal.reasonCode})` : ''}`);
    if (e.m3) lines.push(`  M3 : ${e.m3.kind}${e.m3.fromDate ? ` depuis ${e.m3.fromDate}` : ''}${e.m3.withSport ? ` (avec ${e.m3.withSport})` : ''}`);
  }
  if (state.safety.activePain) lines.push('', `Pause douleur active depuis ${state.safety.activePain.reportedAt}`);
  return lines.join('\n');
}
