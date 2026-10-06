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
import { h1PrescriptionOf, zHyroxStationExecution } from '@hybridsport/hyrox';
import type { HyroxStationExecution } from '@hybridsport/hyrox';

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
