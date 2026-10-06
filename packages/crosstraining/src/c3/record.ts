/**
 * C3 — lecture d'une séance CORE composée en PRESCRIPTION du contrat de séance réalisée (`zCtPrescription`), pour
 * l'historique. Lecture seule, sans valeur : ce que l'athlète a reçu, jamais ce qu'il a fait (le résultat est saisi
 * à part). Une séance hors du périmètre C3 (plusieurs blocs générés, format inconnu) ⇒ undefined.
 */
import type { SessionDraftInput } from '@hybridsport/domain';
import type { CtPrescribedItem, CtPrescription } from '../context.js';

type Block = SessionDraftInput['blocks'][number];
type Item = Block['items'][number];

function itemOf(it: Item): CtPrescribedItem | undefined {
  const p = it.prescription;
  const load = 'load' in p && p.load ? { load: { kind: 'external_kg' as const, value: p.load.kg } } : {};
  switch (p.type) {
    case 'reps': return { exerciseId: it.exerciseId, quantity: { kind: 'reps', value: p.reps }, ...load };
    case 'calories': return { exerciseId: it.exerciseId, quantity: { kind: 'calories', value: p.calories }, ...load };
    case 'distance': return { exerciseId: it.exerciseId, quantity: { kind: 'distance_m', value: p.distanceM }, ...load };
    case 'timed': return { exerciseId: it.exerciseId, quantity: { kind: 'duration_s', value: p.workS }, ...load };
    default: return undefined;
  }
}

export function ctPrescriptionOf(session: Pick<SessionDraftInput, 'blocks'>): CtPrescription | undefined {
  const blocks = session.blocks.filter((b) => b.kind === 'conditioning');
  const b = blocks[0];
  if (blocks.length !== 1 || !b) return undefined;
  const items = b.items.map(itemOf);
  if (items.length === 0 || items.some((i) => i === undefined)) return undefined;
  const list = items as CtPrescribedItem[];
  switch (b.format) {
    case 'emom': return { format: 'emom', minutes: b.minutes, items: list };
    case 'amrap': return { format: 'amrap', durationS: b.timeCapS, items: list };
    case 'for_time': return { format: 'for_time', rounds: b.rounds, timeCapS: b.timeCapS, items: list };
    case 'continuous': {
      const first = b.items[0]?.prescription;
      if (b.items.length !== 1 || first?.type !== 'timed') return undefined;
      const rounds = first.rounds ?? 1;
      const restS = first.restS ?? 0;
      if (rounds > 1 && restS > 0) return { format: 'intervals', rounds, workS: first.workS, restS, items: list };
      return rounds === 1 ? { format: 'continuous', durationS: first.workS, items: list } : undefined;
    }
    default: return undefined;
  }
}
