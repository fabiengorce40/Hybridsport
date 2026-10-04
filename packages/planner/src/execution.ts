/**
 * Réalisations par discipline : « séance planifiée + saisie de réalisation → séance réalisée VALIDÉE par le contrat
 * du moteur ». Routage de contrat uniquement (aucune décision sportive) : la prescription est LUE dans la séance
 * générée, le résultat vient de la saisie, et la validation est celle du moteur (schéma strict, fail-closed).
 * Strength et Running gardent leurs chemins existants (application) ; Cross-training et HYROX passent ici car
 * l'application ne dépend pas de ces moteurs.
 */
import type { PainLevel, ReasonCode, SessionDraft } from '@hybridsport/domain';
import { createCoreRegistry } from '@hybridsport/engine';
import { CT_STIMULI, zRealizedCtSession } from '@hybridsport/crosstraining';
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
