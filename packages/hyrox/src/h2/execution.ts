/**
 * H2.5 — contrat de RÉALISATION d'une séance HYROX composée (H2). La PRESCRIPTION est LUE dans la séance persistée
 * (`h2PresentationOf`, sans catalogue ni réinterprétation) ; le RÉSULTAT est une OBSERVATION structurée :
 * - `completed` : toute la séquence prescrite parcourue (tous les tours, tous les items) ;
 * - `time_capped` : time cap atteint avant la fin — tours complets + items achevés du tour en cours ;
 * - `abandoned` : arrêt volontaire — même progression, distinct du time cap.
 * Charges RÉELLEMENT utilisées (`performedLoads`) distinctes de la charge prescrite. Seules des cohérences
 * DÉFINITIONNELLES sont vérifiées : aucun seuil, aucune progression, aucune allure.
 */
import { z } from 'zod';
import type { SessionDraft } from '@hybridsport/domain';
import { zH2Realized } from '../model.js';
import type { H2Realized } from '../model.js';
import { h2PresentationOf } from './presentation.js';

const nonNegInt = z.number().int().nonnegative();
const progress = { elapsedS: z.number().nonnegative(), roundsCompleted: nonNegInt, itemsCompletedInRound: nonNegInt };

export const zH2Execution = zH2Realized.extend({
  /** Prescription LUE dans la séance (copie fidèle de la présentation : tours, time cap, composantes). */
  prescription: z.object({
    rounds: z.number().int().positive(),
    timeCapS: z.number().positive(),
    components: z.array(z.object({
      itemId: z.string().min(1),
      kind: z.enum(['station', 'run']),
      exerciseId: z.string().min(1),
      dose: z.object({ kind: z.enum(['distance_m', 'reps', 'calories', 'duration_s']), value: z.number().positive() }).strict(),
      loadKg: z.number().positive().optional(),
      runContext: z.enum(['fresh', 'after_station']).optional(),
    }).strict()).min(1),
  }).strict(),
  result: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('completed'), elapsedS: z.number().nonnegative() }).strict(),
    z.object({ kind: z.literal('time_capped'), ...progress }).strict(),
    z.object({ kind: z.literal('abandoned'), ...progress }).strict(),
  ]),
  /** Charges RÉELLEMENT utilisées (observation), par item de station chargé. */
  performedLoads: z.array(z.object({ itemId: z.string().min(1), kg: z.number().positive() }).strict()).optional(),
}).strict().superRefine((x, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const n = x.prescription.components.length;
  if ((x.completion === 'abandoned') !== (x.result.kind === 'abandoned')) issue('completion', 'complétion « abandoned » ⇔ résultat « abandoned »');
  if (x.result.kind === 'time_capped' && x.completion === 'completed_as_prescribed') issue('completion', 'time cap atteint : séance non réalisée comme prescrite');
  if (x.result.kind === 'time_capped' && x.result.elapsedS < x.prescription.timeCapS) issue('result', 'time cap atteint ⇒ temps écoulé ≥ time cap');
  if (x.result.kind !== 'completed') {
    const r = x.result;
    if (r.itemsCompletedInRound >= n) issue('result', 'items du tour en cours : au plus le nombre d’items d’un tour moins un');
    if (r.roundsCompleted * n + r.itemsCompletedInRound >= x.prescription.rounds * n) issue('result', 'séquence entière parcourue : résultat « completed » attendu');
  }
  if (x.exercises.join('|') !== x.prescription.components.map((c) => c.exerciseId).join('|')) issue('exercises', 'mouvements ≠ composantes prescrites');
  const loads = x.performedLoads ?? [];
  if (new Set(loads.map((l) => l.itemId)).size !== loads.length) issue('performedLoads', 'une charge réalisée par item au plus');
  for (const l of loads) {
    const c = x.prescription.components.find((k) => k.itemId === l.itemId);
    if (!c || c.kind !== 'station' || c.loadKg === undefined) issue('performedLoads', `charge réalisée sur un item sans charge prescrite : ${l.itemId}`);
    else if (x.completion === 'completed_as_prescribed' && l.kg !== c.loadKg) issue('completion', 'charge réalisée différente de la charge prescrite');
  }
});
export type H2Execution = z.infer<typeof zH2Execution>;

/** Saisie de réalisation (progression ENREGISTRÉE pendant la séance, jamais déduite). */
export interface H2ExecutionInput {
  readonly sessionId: string;
  /** Instant de RÉALISATION (fin de séance) : date de l'exposition lue par la mémoire H2. */
  readonly at: string;
  readonly archetypeId: string;
  readonly completion: H2Realized['completion'];
  readonly pain?: H2Realized['pain'];
  readonly tolerance?: H2Realized['tolerance'];
  /** Étapes (items) achevées depuis le début, tous tours confondus ; temps chronométré ; time cap atteint (constaté). */
  readonly progress: { readonly stepsCompleted: number; readonly elapsedS: number; readonly timeCapReached: boolean };
  readonly performedLoads?: readonly { readonly itemId: string; readonly kg: number }[];
}

export type H2ExecutionBuild = { readonly ok: true; readonly value: H2Execution } | { readonly ok: false; readonly issues: readonly { readonly path: string; readonly problem: string }[] };

/** Réalisation VALIDÉE d'une séance H2 persistée (prescription lue, progression → tours + items, contrat strict). */
export function h2ExecutionOf(session: SessionDraft, x: H2ExecutionInput): H2ExecutionBuild {
  const p = h2PresentationOf(session, x.archetypeId);
  if (!p) return { ok: false, issues: [{ path: 'session', problem: 'séance hors contrat H2 (bloc for_time, structure et composantes lisibles)' }] };
  const n = p.components.length;
  const steps = x.progress.stepsCompleted;
  if (!Number.isInteger(steps) || steps < 0 || steps > n * p.rounds) return { ok: false, issues: [{ path: 'progress.stepsCompleted', problem: 'étapes hors de la séquence prescrite' }] };
  const position = { elapsedS: x.progress.elapsedS, roundsCompleted: Math.floor(steps / n), itemsCompletedInRound: steps % n };
  const result = x.completion === 'abandoned' ? { kind: 'abandoned' as const, ...position }
    : x.progress.timeCapReached && steps < n * p.rounds ? { kind: 'time_capped' as const, ...position }
      : { kind: 'completed' as const, elapsedS: x.progress.elapsedS };
  if (result.kind === 'completed' && steps !== n * p.rounds) return { ok: false, issues: [{ path: 'progress', problem: 'séance terminée sans parcourir toute la séquence : time cap ou abandon attendu' }] };
  const parsed = zH2Execution.safeParse({
    sessionId: x.sessionId, at: x.at, role: p.role, structure: p.structure, exercises: p.components.map((c) => c.exerciseId),
    completion: x.completion, ...(x.pain !== undefined ? { pain: x.pain } : {}), ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
    prescription: {
      rounds: p.rounds, timeCapS: p.timeCapS,
      components: p.components.map((c) => ({ itemId: c.itemId, kind: c.kind, exerciseId: c.exerciseId, dose: { ...c.dose }, ...(c.loadKg !== undefined ? { loadKg: c.loadKg } : {}), ...(c.runContext ? { runContext: c.runContext } : {}) })),
    },
    result,
    ...(x.performedLoads && x.performedLoads.length > 0 ? { performedLoads: x.performedLoads.map((l) => ({ ...l })) } : {}),
  });
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), problem: i.message })) };
  return { ok: true, value: parsed.data };
}

/** Mémoire lue par la composition (contrat `compositionHistory`) : exposition + statuts déclarés, sans le résultat. */
export function h2RealizedOf(x: H2Execution): H2Realized {
  return {
    sessionId: x.sessionId, at: x.at, role: x.role, structure: x.structure, exercises: [...x.exercises], completion: x.completion,
    ...(x.pain !== undefined ? { pain: x.pain } : {}), ...(x.tolerance !== undefined ? { tolerance: x.tolerance } : {}),
  };
}
