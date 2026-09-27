/**
 * Sélection (spec strength 03 §7.2, addendum V1.1 §5) : classement LEXICOGRAPHIQUE de critères
 * ORDINAUX, dans l'ordre fixé par le ruleset pour chaque rôle. Aucune somme pondérée, aucun bonus.
 *
 * Invariant anti-biais (test d'architecture) : ce fichier ne lit JAMAIS la classe d'équipement ni le
 * modèle de charge d'un exercice. Une machine, une poulie, une barre ou un haltère gagne uniquement par
 * ses propriétés (loadCeiling, stabilité, coût technique, pertinence, coûts de fatigue…) au regard du
 * besoin de l'emplacement.
 */
import type { Exercise } from '@hybridsport/domain';
import { tieBreak } from '@hybridsport/engine';
import type { Criterion } from './params.js';
import type { Env } from './model.js';
import type { SlotInstance } from './archetypes.js';
import { compareLex } from './util.js';
import { volumeFit } from './volume.js';

// technical-constant: borne haute de l'échelle ordinale 0–3 du catalogue (contrat de schéma)
const ORDINAL_MAX = 3;

export interface SessionSoFar {
  readonly chosen: readonly { readonly exercise: Exercise; readonly slotId: string; readonly blockId: string }[];
}

function supportRelevance(e: Exercise, env: Env): number {
  if (env.goal.goal !== 'support') return e.relevance.strength ?? 0;
  const key = env.goal.supportFor === 'running' ? 'running_support' : env.goal.supportFor;
  return e.relevance[key] ?? 0;
}

/** Valeur ordinale (vecteur) d'un critère pour un candidat : plus grand = meilleur. */
export function criterionValue(c: Criterion, e: Exercise, slot: SlotInstance, env: Env, soFar: SessionSoFar): number[] {
  switch (c) {
    case 'anchor': return [env.anchorBySlot.get(slot.def.id)?.exerciseId === e.id ? 1 : 0];
    case 'track': return [env.trackedBySlot.get(slot.def.id)?.exerciseId === e.id ? 1 : 0];
    // Capacité à porter la dose au niveau de l'athlète (propriété loadCeiling, jamais la classe d'équipement) :
    // un exercice plafonné reste choisi quand aucun candidat chargeable n'existe (ordinal, pas un filtre).
    case 'load_adequacy': return [e.loadCeiling >= env.params['strength.selection.minLoadCeiling'][env.level] ? 1 : 0];
    case 'role_fit':
      switch (slot.def.modalityPreference) {
        case 'load_ceiling': return [e.loadCeiling];
        case 'stability': return [e.stability, ORDINAL_MAX - e.cost.technical];
        case 'specificity': return [supportRelevance(e, env)];
        default: return [0];
      }
    case 'volume_fit': {
      // Volume hebdomadaire (E1) : ne pas dépasser le haut SOFT, puis servir d'abord les groupes sous le plancher.
      const roleOf = (slotId: string) => env.archetype.slots.find((s) => s.id === slotId)?.role ?? 'accessory';
      const v = volumeFit(e, slot.def.role, soFar.chosen.map((x) => ({ exercise: x.exercise, role: roleOf(x.slotId) })), env);
      return [-v.over, v.under];
    }
    case 'goal_relevance': return [supportRelevance(e, env)];
    case 'fatigue_fit': {
      // Structures abaissées par le contexte (multisport, notes) et zones « à ménager » (douleur P1) : moins = mieux.
      const structures = env.structuresOf(e);
      let load = 0;
      for (const s of env.lowered.keys()) load += structures[s] ?? 0;
      const reduceAreas = env.input.constraints.areaRestrictions.filter((r) => r.action === 'reduce').map((r) => r.area);
      const painLoad = e.painSensitiveAreas.filter((a) => reduceAreas.includes(a)).length;
      // Charge axiale maximale : au-delà du nombre admis par séance, le candidat est rétrogradé.
      const axialHigh = soFar.chosen.filter((x) => x.exercise.cost.axialLoad >= ORDINAL_MAX).length;
      const axialPenalty = e.cost.axialLoad >= ORDINAL_MAX && axialHigh >= env.params['strength.selection.axialHighMaxPerSession'] ? 1 : 0;
      return [-axialPenalty, -painLoad, -load];
    }
    case 'recency': {
      const days = env.familyDaysSince(e.family);
      if (days === undefined) return [env.params['strength.selection.recencyBandsDays'].length];
      return [env.params['strength.selection.recencyBandsDays'].filter((b) => days >= b).length];
    }
    case 'preference': {
      const p = env.input.discipline.preferences;
      return [p.liked.includes(e.id) ? 1 : p.disliked.includes(e.id) ? -1 : 0];
    }
    case 'logistics': {
      const prev = soFar.chosen.filter((x) => x.blockId === slot.def.blockId).at(-1)?.exercise;
      const shared = prev ? e.equipment.allOf.some((q) => prev.equipment.allOf.includes(q)) : false;
      return [shared ? 1 : 0, -e.timing.setupS];
    }
  }
}

export interface Ranked {
  readonly exercise: Exercise;
  readonly values: readonly (readonly number[])[];
}

/** Classement complet (déterministe) ; égalité parfaite départagée par la graine de l'emplacement. */
export function rankCandidates(candidates: readonly Exercise[], slot: SlotInstance, env: Env, soFar: SessionSoFar): Ranked[] {
  const order = env.params['strength.selection.criteriaOrder'][slot.def.role];
  const ranked = candidates.map((e) => ({ exercise: e, values: order.map((c) => criterionValue(c, e, slot, env, soFar)) }));
  const cmp = (a: Ranked, b: Ranked): number => {
    for (let i = 0; i < order.length; i++) {
      const d = compareLex(b.values[i] ?? [], a.values[i] ?? []);
      if (d !== 0) return d;
    }
    return 0;
  };
  ranked.sort((a, b) => cmp(a, b) || (a.exercise.id < b.exercise.id ? -1 : 1));
  // Égalité parfaite en tête : départage par la graine (spec 01 §6), jamais par l'ordre du catalogue.
  const tied = ranked.filter((r) => cmp(r, ranked[0] as Ranked) === 0);
  if (tied.length > 1) {
    const winner = tieBreak(tied, (r) => r.exercise.id, env.rng.fork(`slot:${slot.def.id}`));
    if (winner) return [winner, ...ranked.filter((r) => r !== winner)];
  }
  return ranked;
}

/** Premier critère qui sépare le gagnant du suivant (trace « pourquoi cet exercice »). */
export function decidingCriterion(ranked: readonly Ranked[], slot: SlotInstance, env: Env): string {
  const order = env.params['strength.selection.criteriaOrder'][slot.def.role];
  const [a, b] = ranked;
  if (!a) return 'none';
  if (!b) return 'only_candidate';
  for (let i = 0; i < order.length; i++) if (compareLex(a.values[i] ?? [], b.values[i] ?? []) !== 0) return order[i] ?? 'none';
  return 'seed_tiebreak';
}
