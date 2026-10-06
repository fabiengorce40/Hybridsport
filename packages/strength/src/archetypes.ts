/**
 * Archétypes (spec strength 02 §5) : STRUCTURES lues dans le ruleset (`strength.archetypes`), jamais des
 * séances figées. Le stimulus n'agit que sur le dosage et l'ORDRE des emplacements optionnels ; les
 * emplacements REQUIS ne dépendent que de l'archétype, de l'objectif et de l'historique (propriété testée).
 */
import { zSessionArchetype } from '@hybridsport/domain';
import type { ReasonCode, SessionArchetype, SlotRequirement } from '@hybridsport/domain';
import { archetypeIssues, slotAccepts } from '@hybridsport/engine';
import type { LoadedCatalog } from '@hybridsport/engine';
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
  /**
   * Explication de chaque groupe de choix (S3) : besoin retenu, critère qui l'a départagé du suivant (`anchor`,
   * `not_in_session`, `least_recent_exposure`, `goal_priority`, `identifier`, `only_member`), besoins écartés.
   * Lecture seule : la décision elle-même est inchangée.
   */
  readonly choices: readonly { readonly group: string; readonly need: string; readonly cause: ChoiceCause; readonly others: readonly string[] }[];
}
export type ChoiceCause = 'anchor' | 'not_in_session' | 'least_recent_exposure' | 'goal_priority' | 'identifier' | 'only_member';

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
 * une ANCRE déclarée par l'intention (addendum V1.1 §3), parmi les membres faisables, puis le membre dont le besoin a été le MOINS exposé récemment (alternance), puis le plus prioritaire pour l'OBJECTIF, puis
 * l'identifiant. Le stimulus n'intervient jamais dans ce choix.
 */
export function resolveSlots(a: StrengthArchetype, params: StrengthParams, goal: string, stimulus: string, recentNeedExposure: (need: string) => number, anchored: (slotId: string) => boolean = () => false, feasible: (slot: ArchetypeSlotDef) => boolean = () => true): ResolvedSlots {
  const needs = params['strength.needs'];
  const priority = params['strength.goals'][goal]?.needPriority ?? [];
  const optionalOrder = params['strength.stimuli'][stimulus]?.optionalOrder ?? [];
  const rank = (list: readonly string[], need: string): number => (list.includes(need) ? list.indexOf(need) : list.length);
  // Besoins déjà couverts par la séance : un groupe de choix préfère un besoin encore absent (le
  // secondaire d'une séance bas du corps n'est pas une seconde charnière si le principal en est une).
  const used = new Set<string>();
  const choices: { group: string; need: string; cause: ChoiceCause; others: string[] }[] = [];
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
      const scoped = relevant.length > 0 ? relevant : members;
      // Membres FAISABLES (au moins un candidat avec le matériel et les restrictions) s'il y en a : un groupe
      // de choix ne choisit jamais un membre impossible quand un autre membre est réalisable.
      const doable = scoped.filter(feasible);
      const pool = doable.length > 0 ? doable : scoped;
      const ordered = [...pool].sort((x, y) => Number(anchored(y.id)) - Number(anchored(x.id)) || Number(used.has(x.need)) - Number(used.has(y.need)) || recentNeedExposure(x.need) - recentNeedExposure(y.need) || rank(priority, x.need) - rank(priority, y.need) || (x.id < y.id ? -1 : 1));
      const chosen = ordered[0];
      if (chosen) {
        const next = ordered[1];
        const cause: ChoiceCause = !next ? 'only_member'
          : anchored(chosen.id) !== anchored(next.id) ? 'anchor'
          : used.has(chosen.need) !== used.has(next.need) ? 'not_in_session'
          : recentNeedExposure(chosen.need) !== recentNeedExposure(next.need) ? 'least_recent_exposure'
          : rank(priority, chosen.need) !== rank(priority, next.need) ? 'goal_priority' : 'identifier';
        choices.push({ group: chosen.choiceGroup ?? chosen.id, need: chosen.need, cause, others: members.filter((m) => m !== chosen).map((m) => m.need) });
        out.push(chosen); used.add(chosen.need);
      }
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
  return { required: required.map(inst), optional: optional.map(inst), choices };
}

/**
 * Couverture d'un archétype strength pour ses préréglages déclarés faisables. Le contrôle CC1 du CORE
 * raisonne emplacement par emplacement ; un GROUPE DE CHOIX strength (ex. tirage vertical OU horizontal)
 * est couvert dès qu'UN membre a un candidat ; seuls les emplacements REQUIS doivent l'être. Les autres contrôles du CORE (leviers, structure) restent
 * appliqués tels quels.
 */
export function strengthArchetypeIssues(a: StrengthArchetype, params: StrengthParams, catalog: LoadedCatalog): { core: ReasonCode[]; uncoveredGroups: string[] } {
  const needs = params['strength.needs'];
  const presets = catalog.document.presets ?? [];
  const coverageProblem = /sans aucun candidat pour le preset/;
  const core = archetypeIssues(toSessionArchetype(a, params), catalog).filter((r) => !coverageProblem.test(String(r.params.problem)));
  const groups = new Map<string, ArchetypeSlotDef[]>();
  // Un emplacement OPTIONNEL sans candidat est simplement omis (SELECT.SLOT_OMITTED) : seuls les requis doivent être couverts.
  for (const s of a.slots.filter((x) => x.status === 'required')) groups.set(s.choiceGroup ?? `slot:${s.id}`, [...(groups.get(s.choiceGroup ?? `slot:${s.id}`) ?? []), s]);
  const uncoveredGroups: string[] = [];
  for (const presetId of a.feasiblePresets) {
    const equipment = new Set(presets.find((p) => p.id === presetId)?.equipment ?? []);
    for (const [g, members] of [...groups].sort(([x], [y]) => (x < y ? -1 : 1))) {
      const covered = members.some((m) => catalog.exercises().some((e) => e.status === 'active' && e.disciplines.includes('strength') && slotAccepts(e, needs[m.need]?.requirement ?? {}, catalog) && catalog.isFeasibleWith(e, equipment)));
      if (!covered) uncoveredGroups.push(`${presetId}:${g}`);
    }
  }
  return { core, uncoveredGroups };
}
