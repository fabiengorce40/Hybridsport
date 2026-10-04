/**
 * Contrat de RÉALISATION d'une station H1 : la PRESCRIPTION reçue (station, mouvement, dose, charge prescrite) et le
 * RÉSULTAT mesuré (quantité atteinte dans l'unité de la dose, durée éventuelle, charge réellement utilisée) sont deux
 * objets distincts. Seules des cohérences DÉFINITIONNELLES sont vérifiées (aucun seuil, aucune progression).
 *
 * H1 transporte cet historique dans son contexte (`sessionHistory`) mais ne l'utilise pas encore pour prescrire.
 */
import { z } from 'zod';
import { PAIN_LEVELS, isISODateTime } from '@hybridsport/domain';
import type { SessionDraft } from '@hybridsport/domain';

const positive = z.number().positive();
export const HR_EXECUTION_COMPLETIONS = ['completed_as_prescribed', 'completed', 'abandoned'] as const;
export const zHyroxPrescribedDose = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('distance_m'), value: positive }).strict(),
  z.object({ kind: z.literal('reps'), value: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('calories'), value: positive }).strict(),
  z.object({ kind: z.literal('duration_s'), value: positive }).strict(),
]);

export const zHyroxStationExecution = z.object({
  sessionId: z.string().min(1),
  completedAt: z.string().refine(isISODateTime, 'instant ISO attendu'),
  stationId: z.string().min(1),
  exerciseId: z.string().min(1),
  prescription: z.object({ dose: zHyroxPrescribedDose, loadKg: positive.optional() }).strict(),
  result: z.discriminatedUnion('kind', [
    /** `achieved` : quantité réalisée dans l'unité de la dose ; `elapsedS` : temps mesuré ; `actualLoadKg` : charge utilisée. */
    z.object({ kind: z.literal('completed'), achieved: positive, elapsedS: positive.optional(), actualLoadKg: positive.optional() }).strict(),
    z.object({ kind: z.literal('abandoned'), achieved: z.number().nonnegative().optional(), elapsedS: positive.optional() }).strict(),
  ]),
  completion: z.enum(HR_EXECUTION_COMPLETIONS),
  pain: z.enum(['NONE', ...PAIN_LEVELS]).optional(),
  tolerance: z.enum(['tolerated', 'poorly_tolerated']).optional(),
}).strict().superRefine((x, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if ((x.completion === 'abandoned') !== (x.result.kind === 'abandoned')) issue('completion', 'complétion « abandoned » ⇔ résultat « abandoned »');
  if (x.result.kind === 'completed' && x.result.actualLoadKg !== undefined && x.prescription.loadKg === undefined) issue('result', 'charge réalisée sur une station prescrite sans charge');
  if (x.completion === 'completed_as_prescribed' && x.result.kind === 'completed') {
    if (x.result.achieved < x.prescription.dose.value) issue('completion', 'quantité réalisée inférieure à la dose prescrite');
    if (x.result.actualLoadKg !== undefined && x.result.actualLoadKg !== x.prescription.loadKg) issue('completion', 'charge réalisée différente de la charge prescrite');
  }
});
export type HyroxStationExecution = z.infer<typeof zHyroxStationExecution>;

/** Prescription d'une séance H1 générée (un seul item de station), lue telle quelle ; undefined si hors contrat H1. */
export function h1PrescriptionOf(session: SessionDraft): { exerciseId: string; prescription: HyroxStationExecution['prescription'] } | undefined {
  const items = session.blocks.flatMap((b) => b.items);
  const it = items[0];
  if (items.length !== 1 || !it) return undefined;
  const p = it.prescription;
  const load = 'load' in p && p.load ? { loadKg: p.load.kg } : {};
  switch (p.type) {
    case 'distance': return { exerciseId: it.exerciseId, prescription: { dose: { kind: 'distance_m', value: p.distanceM }, ...load } };
    case 'reps': return { exerciseId: it.exerciseId, prescription: { dose: { kind: 'reps', value: p.reps }, ...load } };
    case 'calories': return { exerciseId: it.exerciseId, prescription: { dose: { kind: 'calories', value: p.calories }, ...load } };
    case 'timed': return { exerciseId: it.exerciseId, prescription: { dose: { kind: 'duration_s', value: p.workS * p.rounds }, ...load } };
    default: return undefined;
  }
}
