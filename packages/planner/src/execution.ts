/**
 * Réalisations par discipline : « séance planifiée + saisie de réalisation → séance réalisée VALIDÉE par le contrat
 * du moteur ». Routage de contrat uniquement (aucune décision sportive) : la prescription est LUE dans la séance
 * générée, le résultat vient de la saisie, et la validation est celle du moteur (schéma strict, fail-closed).
 * Strength et Running gardent leurs chemins existants (application) ; Cross-training et HYROX passent ici car
 * l'application ne dépend pas de ces moteurs.
 */
import type { PainLevel, ReasonCode, SessionDraft } from '@hybridsport/domain';
import { createCoreRegistry } from '@hybridsport/engine';
import { CT_C2_ARCHETYPE, CT_STIMULI, ctPrescriptionOf, stimulusFromArchetypeId, zRealizedCtSession } from '@hybridsport/crosstraining';
import type { RealizedCtSession } from '@hybridsport/crosstraining';
import { h1PrescriptionOf, h2ExecutionOf, h2RealizedOf, roleFromArchetype, zH2Execution, zHyroxStationExecution } from '@hybridsport/hyrox';
import type { H2Execution, H2ExecutionInput, H2Realized, HyroxStationExecution } from '@hybridsport/hyrox';

const core = createCoreRegistry();
export type Realization<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };
const invalid = <T>(path: string, problem: string): Realization<T> => ({ ok: false, reasons: [core.emit('TECHNICAL.SCHEMA_INVALID', { path, problem })] });

/** Complétion générique ↔ vocabulaires des moteurs (CT, HYROX) : « modified » = terminée mais modifiée. */
export type GenericCompletion = 'completed_as_prescribed' | 'modified' | 'abandoned';
const ENGINE_COMPLETION = { completed_as_prescribed: 'completed_as_prescribed', modified: 'completed', abandoned: 'abandoned' } as const;

export interface CommonExecution {
  readonly sessionId: string;
  readonly completedAt: string;
  readonly completion: GenericCompletion;
  /** Douleur déclarée : niveau du domaine ; `NONE` = aucune ; absente = inconnue (jamais lue comme « aucune »). */
  readonly pain?: 'NONE' | PainLevel;
  readonly tolerance?: 'tolerated' | 'poorly_tolerated';
}

/** Cross-training C2 : séance continue, un mouvement en durée (lue dans la séance), résultat continu ou abandon. */
export function realizeCrossTrainingC2(session: SessionDraft, x: CommonExecution & {
  readonly stimulus: string;
  readonly result?: { readonly durationS?: number; readonly calories?: number; readonly distanceM?: number };
  readonly sessionRpe?: number;
}): Realization<RealizedCtSession> {
  const items = session.blocks.flatMap((b) => b.items);
  const it = items[0];
  if (items.length !== 1 || !it || it.prescription.type !== 'timed') return invalid('session', 'séance hors corridor C2 (un item en durée attendu)');
  if (!(CT_STIMULI as readonly string[]).includes(x.stimulus)) return invalid('stimulus', `stimulus non déclaré au contrat Cross-training : ${x.stimulus}`);
  const durationS = it.prescription.workS * it.prescription.rounds;
  const parsed = zRealizedCtSession.safeParse({
    sessionId: x.sessionId, completedAt: x.completedAt, stimulus: x.stimulus,
    prescription: { format: 'continuous', durationS, items: [{ exerciseId: it.exerciseId, quantity: { kind: 'duration_s', value: it.prescription.workS } }] },
    result: x.completion === 'abandoned' ? { kind: 'abandoned' } : { kind: 'total', ...x.result },
    completion: ENGINE_COMPLETION[x.completion],
    ...(x.sessionRpe !== undefined ? { sessionRpe: x.sessionRpe } : {}),
    ...(x.pain !== undefined ? { pain: x.pain } : {}),
    ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
  });
  if (!parsed.success) return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `realized.${i.path.join('.')}`, problem: i.message })) };
  return { ok: true, value: parsed.data };
}

/**
 * Cross-training C3 (C3.5) : la PRESCRIPTION est LUE dans la séance générée (`ctPrescriptionOf`, sans perte ni
 * réinterprétation) ; le stimulus vient de l'archétype PRESCRIT ; le RÉSULTAT est la saisie de l'athlète, validée par le
 * contrat du moteur (type de résultat cohérent avec le format, complétion cohérente). Abandon ⇒ résultat `abandoned`.
 * Douleur : `REPORTED` = signalée sans niveau (niveaux = contenu G1 indisponible).
 */
export function realizeCrossTraining(session: SessionDraft, x: Omit<CommonExecution, 'pain'> & {
  readonly archetypeId: string;
  readonly pain?: 'NONE' | 'REPORTED' | PainLevel;
  readonly result?: unknown;
  readonly sessionRpe?: number;
  readonly performedLoads?: readonly { readonly exerciseId: string; readonly kg: number }[];
}): Realization<RealizedCtSession> {
  const stimulus = stimulusFromArchetypeId(x.archetypeId);
  if (!stimulus) return invalid('archetypeId', `archétype Cross-training inconnu : ${x.archetypeId}`);
  const prescription = ctPrescriptionOf(session);
  if (!prescription) return invalid('session', 'séance hors contrat C3 (un bloc de conditioning, format connu)');
  if (x.completion !== 'abandoned' && x.result === undefined) return invalid('result', 'résultat exigé pour une séance terminée');
  const parsed = zRealizedCtSession.safeParse({
    sessionId: x.sessionId, completedAt: x.completedAt, stimulus, prescription,
    result: x.completion === 'abandoned' ? { kind: 'abandoned' } : x.result,
    completion: ENGINE_COMPLETION[x.completion],
    ...(x.sessionRpe !== undefined ? { sessionRpe: x.sessionRpe } : {}),
    ...(x.pain !== undefined ? { pain: x.pain } : {}),
    ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
    ...(x.performedLoads && x.performedLoads.length > 0 ? { performedLoads: x.performedLoads.map((l) => ({ ...l })) } : {}),
  });
  if (!parsed.success) return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `realized.${i.path.join('.')}`, problem: i.message })) };
  return { ok: true, value: parsed.data };
}

/**
 * Routage par archétype PRESCRIT : corridor C2 (`crosstraining.c2` : résultat continu) ou composition C3 (résultat
 * structuré du format). Aucune décision sportive : chaque chemin valide par le contrat du moteur.
 */
export function realizeCrossTrainingExecution(session: SessionDraft, x: Parameters<typeof realizeCrossTraining>[1] & { readonly stimulus: string; readonly continuous?: Parameters<typeof realizeCrossTrainingC2>[1]['result'] }): Realization<RealizedCtSession> {
  if (x.archetypeId !== CT_C2_ARCHETYPE) return realizeCrossTraining(session, x);
  if (x.pain === 'REPORTED') return invalid('pain', 'corridor C2 : niveau de douleur exigé');
  const { archetypeId: _a, result: _r, performedLoads: _l, continuous, pain, ...rest } = x;
  return realizeCrossTrainingC2(session, { ...rest, ...(pain !== undefined ? { pain } : {}), ...(continuous ? { result: continuous } : {}) });
}

/** HYROX H1 : station, mouvement, dose et charge LUS dans la séance générée ; résultat mesuré saisi. */
export function realizeHyroxStation(session: SessionDraft, x: CommonExecution & {
  readonly stationId: string;
  readonly result?: { readonly achieved?: number; readonly elapsedS?: number; readonly actualLoadKg?: number };
}): Realization<HyroxStationExecution> {
  const p = h1PrescriptionOf(session);
  if (!p) return invalid('session', 'séance hors contrat H1 (un item de station attendu)');
  const r = x.result ?? {};
  const parsed = zHyroxStationExecution.safeParse({
    sessionId: x.sessionId, completedAt: x.completedAt, stationId: x.stationId, exerciseId: p.exerciseId, prescription: p.prescription,
    result: x.completion === 'abandoned' ? { kind: 'abandoned', ...r } : { kind: 'completed', ...r },
    completion: ENGINE_COMPLETION[x.completion],
    ...(x.pain !== undefined ? { pain: x.pain } : {}),
    ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
  });
  if (!parsed.success) return { ok: false, reasons: parsed.error.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `realized.${i.path.join('.')}`, problem: i.message })) };
  return { ok: true, value: parsed.data };
}

/**
 * HYROX H2 (H2.5) : séance COMPOSÉE (archétype de rôle). Prescription lue dans la séance persistée, progression
 * ENREGISTRÉE pendant la séance (étapes achevées, chrono, time cap constaté), charges réelles ; contrat strict du moteur.
 * Douleur : `REPORTED` = signalée sans niveau (comme le Cross-training C3).
 */
export function realizeHyroxComposed(session: SessionDraft, x: Omit<CommonExecution, 'pain' | 'completedAt'> & {
  readonly completedAt: string;
  readonly archetypeId: string;
  readonly pain?: 'NONE' | 'REPORTED' | PainLevel;
  readonly progress: H2ExecutionInput['progress'];
  readonly performedLoads?: H2ExecutionInput['performedLoads'];
}): Realization<H2Execution> {
  if (roleFromArchetype(x.archetypeId) === undefined) return invalid('archetypeId', `archétype HYROX H2 inconnu : ${x.archetypeId}`);
  const r = h2ExecutionOf(session, {
    sessionId: x.sessionId, at: x.completedAt, archetypeId: x.archetypeId, completion: ENGINE_COMPLETION[x.completion], progress: x.progress,
    ...(x.pain !== undefined ? { pain: x.pain } : {}), ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
    ...(x.performedLoads ? { performedLoads: x.performedLoads } : {}),
  });
  if (!r.ok) return { ok: false, reasons: r.issues.map((i) => core.emit('TECHNICAL.SCHEMA_INVALID', { path: `realized.${i.path}`, problem: i.problem })) };
  return { ok: true, value: r.value };
}

/** Archétype HYROX composé (H2) ? Routage de contrat seulement. */
export const isHyroxComposed = (archetypeId: string): boolean => roleFromArchetype(archetypeId) !== undefined;

/**
 * Historiques HYROX transportés au moteur depuis les réalisations STOCKÉES (H1 : stations ; H2 : séances composées).
 * Une réalisation H2 est réduite à sa mémoire (`compositionHistory` : exposition + statuts déclarés). Fail-closed : une
 * entrée illisible est transmise telle quelle et le moteur la refuse à sa frontière (jamais ignorée en silence).
 */
export function hyroxHistoriesOf(records: readonly Readonly<Record<string, unknown>>[]): { readonly sessionHistory: readonly unknown[]; readonly compositionHistory: readonly (H2Realized | Readonly<Record<string, unknown>>)[] } {
  const sessionHistory: unknown[] = [];
  const compositionHistory: (H2Realized | Readonly<Record<string, unknown>>)[] = [];
  for (const r of records) {
    if (!('role' in r)) { sessionHistory.push(r); continue; }
    const parsed = zH2Execution.safeParse(r);
    compositionHistory.push(parsed.success ? h2RealizedOf(parsed.data) : r);
  }
  return { sessionHistory, compositionHistory };
}
