/**
 * Archétypes (spec strength 02 §5) : STRUCTURES lues dans le ruleset (`strength.archetypes`), jamais des
 * séances figées. Le stimulus n'agit que sur le dosage et l'ORDRE des emplacements optionnels ; les
 * emplacements REQUIS ne dépendent que de l'archétype, de l'objectif et de l'historique (propriété testée).
 */
import { zSessionArchetype } from '@hybridsport/domain';
import type { SessionArchetype, SlotRequirement } from '@hybridsport/domain';
import { ROLES } from './params.js';
import type { StrengthParams, StrengthArchetype, ArchetypeSlotDef } from './params.js';
import type { StrengthGoalRef } from './context.js';

export const goalKey = (g: StrengthGoalRef): string => (g.goal === 'support' ? `support:${g.supportFor}` : g.goal);

export interface SlotInstance {
  readonly def: ArchetypeSlotDef;
  readonly requirement: SlotRequirement;
}

export interface ResolvedSlots {
  readonly required: readonly SlotInstance[];
  /** Emplacements optionnels, dans l'ordre d'ajout (priorité du stimulus, puis de l'objectif). */
  readonly optional: readonly SlotInstance[];
}

export function findArchetype(params: StrengthParams, id: string): StrengthArchetype | undefined {
  return params['strength.archetypes'].find((a) => a.id === id);
}

/** Projection vers le schéma d'archétype du CORE (archetypeIssues, couverture CC1). */
export function toSessionArchetype(a: StrengthArchetype, params: StrengthParams): SessionArchetype {
  const needs = params['strength.needs'];
  return zSessionArchetype.parse({
    id: a.id, version: a.version, discipline: 'strength', status: a.status, stimulus: 'strength', toleranceProfile: a.toleranceProfile,
    levels: a.levels, duration: { minS: a.duration.min, maxS: a.duration.max },
    blocks: a.blocks.map((b) => ({
      id: b.id, kind: b.kind, role: b.role, optional: false, formats: ['sets'], levers: b.levers,
      slots: a.slots.filter((s) => s.blockId === b.id).map((s) => ({
        id: s.id, requirement: needs[s.need]?.requirement ?? {}, count: s.count,
        ...(s.minFamilies !== undefined ? { minFamilies: s.minFamilies } : {}),
        ...(s.modalityPreference !== undefined ? { modalityPreference: s.modalityPreference } : {}),
      })),
    })).filter((b) => b.slots.length > 0),
    feasiblePresets: a.feasiblePresets, declaredInfeasiblePresets: a.declaredInfeasiblePresets, declaredInfeasibleRestrictions: a.declaredInfeasibleRestrictions,
  });
}

/**
 * Emplacements requis et optionnels. Groupe de choix (ex. principal genou OU hanche) : le membre qui porte
 * une ANCRE déclarée par l'intention (addendum V1.1 §3), puis le membre dont le besoin a été le MOINS exposé récemment (alternance), puis le plus prioritaire pour l'OBJECTIF, puis
 * l'identifiant. Le stimulus n'intervient jamais dans ce choix.
 */
export function resolveSlots(a: StrengthArchetype, params: StrengthParams, goal: string, stimulus: string, recentNeedExposure: (need: string) => number, anchored: (slotId: string) => boolean = () => false): ResolvedSlots {
  const needs = params['strength.needs'];
  const priority = params['strength.goals'][goal]?.needPriority ?? [];
  const optionalOrder = params['strength.stimuli'][stimulus]?.optionalOrder ?? [];
  const rank = (list: readonly string[], need: string): number => (list.includes(need) ? list.indexOf(need) : list.length);
  // Besoins déjà couverts par la séance : un groupe de choix préfère un besoin encore absent (le
  // secondaire d'une séance bas du corps n'est pas une seconde charnière si le principal en est une).
  const used = new Set<string>();
  const pickFromGroups = (slots: readonly ArchetypeSlotDef[]): ArchetypeSlotDef[] => {
    const out: ArchetypeSlotDef[] = [];
    const groups = new Map<string, ArchetypeSlotDef[]>();
    for (const s of [...slots].sort((x, y) => ROLES.indexOf(x.role) - ROLES.indexOf(y.role) || (x.id < y.id ? -1 : 1))) {
      if (s.choiceGroup === undefined) { out.push(s); used.add(s.need); } else groups.set(s.choiceGroup, [...(groups.get(s.choiceGroup) ?? []), s]);
    }
    const ordered = [...groups.values()].sort((a, b) => ROLES.indexOf((a[0] as ArchetypeSlotDef).role) - ROLES.indexOf((b[0] as ArchetypeSlotDef).role) || ((a[0] as ArchetypeSlotDef).id < (b[0] as ArchetypeSlotDef).id ? -1 : 1));
    for (const members of ordered) {
      // Membres pertinents pour l'objectif s'il y en a (ex. soutien course : pas de principal genou si l'objectif ne le prévoit pas).
      const relevant = members.filter((m) => priority.includes(m.need));
      const pool = relevant.length > 0 ? relevant : members;
      const chosen = [...pool].sort((x, y) => Number(anchored(y.id)) - Number(anchored(x.id)) || Number(used.has(x.need)) - Number(used.has(y.need)) || recentNeedExposure(x.need) - recentNeedExposure(y.need) || rank(priority, x.need) - rank(priority, y.need) || (x.id < y.id ? -1 : 1))[0];
      if (chosen) { out.push(chosen); used.add(chosen.need); }
    }
    return out;
  };
  const inst = (s: ArchetypeSlotDef): SlotInstance => ({ def: s, requirement: needs[s.need]?.requirement ?? {} });
  const required = pickFromGroups(a.slots.filter((s) => s.status === 'required'))
    .sort((x, y) => ROLES.indexOf(x.role) - ROLES.indexOf(y.role) || rank(priority, x.need) - rank(priority, y.need) || (x.id < y.id ? -1 : 1));
  const requiredNeeds = new Set(required.map((s) => s.need));
  // Un optionnel qui répète un besoin déjà requis passe après les autres (variété des besoins avant la répétition).
  const optional = pickFromGroups(a.slots.filter((s) => s.status === 'optional'))
    .sort((x, y) => Number(requiredNeeds.has(x.need)) - Number(requiredNeeds.has(y.need)) || rank(optionalOrder, x.need) - rank(optionalOrder, y.need) || rank(priority, x.need) - rank(priority, y.need) || (x.id < y.id ? -1 : 1));
  return { required: required.map(inst), optional: optional.map(inst) };
}
