/**
 * Interaction multisport (spec strength 05 §14) : le StrengthEngine CONSOMME le contexte (notes du
 * planificateur, séances voisines clés) et abaisse la demande sur les structures concernées. Il ne
 * déplace ni ne supprime jamais une séance ; si l'objet de l'archétype devient impossible, il répond
 * `no_valid_proposal` (jamais un changement silencieux de stimulus, D-S4).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { SportEngineInput } from '@hybridsport/engine';
import type { StrengthContext } from './context.js';
import type { StrengthParams } from './params.js';
import { strengthReasons } from './codes.js';

/** Identifiant réservé de la table des notes : hypothèse prudente quand la semaine est inconnue. */
export const WEEK_UNKNOWN_NOTE = 'week_unknown';

export function loweredStructures(input: SportEngineInput<StrengthContext>, params: StrengthParams): { lowered: Map<string, string>; reasons: ReasonCode[] } {
  const p = params['strength.interference'];
  const lowered = new Map<string, string>();
  const reasons: ReasonCode[] = [];
  const add = (s: string, cause: string) => { if (p.perStructure[s] && !lowered.has(s)) { lowered.set(s, cause); reasons.push(strengthReasons.emit('PLAN.STRUCTURE_LOWERED', { structure: s, cause })); } };
  for (const n of [...input.intent.plannerNotes].sort()) for (const s of p.notes[n] ?? []) add(s, `note:${n}`);
  const week = input.discipline.week;
  if (!week.known) {
    reasons.push(strengthReasons.emit('DATA.WEEK_CONTEXT_UNKNOWN'));
    for (const s of p.notes[WEEK_UNKNOWN_NOTE] ?? []) add(s, WEEK_UNKNOWN_NOTE);
  }
  const neighbors = [...week.neighbors].sort((a, b) => a.hoursFromThisSession - b.hoursFromThisSession || (a.stimulus < b.stimulus ? -1 : 1));
  for (const n of neighbors) {
    if (n.priority !== 'key' || Math.abs(n.hoursFromThisSession) > p.neighborWindowHours) continue;
    for (const [s, level] of Object.entries(n.demand).sort()) if (level === 'high') add(s, `neighbor:${n.discipline}:${n.stimulus}`);
  }
  return { lowered, reasons };
}
