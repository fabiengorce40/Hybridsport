/**
 * Contrat PLANIFICATEUR → StrengthEngine (CORE-EXT-4, spec strength 10 §2). Vérifié par le CORE avant
 * `propose` ; toute violation ⇒ INVALID_INPUT déterministe. Le moteur ne choisit donc jamais
 * arbitrairement entre des ancres déclarées incompatibles.
 *
 * Règles :
 * - une ancre déclarée désigne une track EXISTANTE, de tier `anchor`, ACTIVE, du MÊME archétype, sur un
 *   emplacement de cet archétype (sinon `PLAN.ANCHOR_NOT_DECLARABLE{trackId, cause}`) ;
 * - pour un même groupe de choix (ou un même emplacement) et une même séance, AU PLUS UNE ancre déclarée
 *   (sinon `PLAN.ANCHOR_CHOICE_GROUP_CONFLICT{group, trackIds}`).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { IntentContractInput } from '@hybridsport/engine';
import type { StrengthContext } from './context.js';
import { readStrengthParam } from './params.js';
import { strengthReasons } from './codes.js';

export function validateStrengthIntent(input: IntentContractInput<StrengthContext>): readonly ReasonCode[] {
  const archetype = readStrengthParam(input.ruleset, 'strength.archetypes').find((a) => a.id === input.intent.archetypeId);
  // Archétype inconnu : issue métier traitée par propose (PLAN.ARCHETYPE_NOT_APPLICABLE), pas un défaut de contrat.
  if (!archetype) return [];
  const out: ReasonCode[] = [];
  const declared = [...new Set(input.intent.repetitionIntents.flatMap((r) => (r.kind === 'progression_anchor' ? [r.trackId] : [])))].sort();
  const byGroup = new Map<string, string[]>();
  for (const trackId of declared) {
    const t = input.discipline.tracks.find((x) => x.trackId === trackId);
    const slot = t ? archetype.slots.find((s) => s.id === t.slotId) : undefined;
    const cause = !t ? 'unknown_track' : t.tier !== 'anchor' ? 'not_an_anchor' : t.status !== 'active' ? `status_${t.status}` : t.archetypeId !== archetype.id ? 'other_archetype' : !slot ? 'unknown_slot' : undefined;
    if (cause || !slot) { out.push(strengthReasons.emit('PLAN.ANCHOR_NOT_DECLARABLE', { trackId, cause: cause ?? 'unknown_slot' })); continue; }
    const group = slot.choiceGroup !== undefined ? `group:${slot.choiceGroup}` : `slot:${slot.id}`;
    byGroup.set(group, [...(byGroup.get(group) ?? []), trackId]);
  }
  for (const [group, ids] of [...byGroup].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (ids.length > 1) out.push(strengthReasons.emit('PLAN.ANCHOR_CHOICE_GROUP_CONFLICT', { group, trackIds: ids }));
  }
  return out;
}
