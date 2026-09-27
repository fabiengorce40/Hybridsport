/**
 * Préservation du stimulus (phase 4F, décision isolée en phase 4G pour être testée seule). Fonction PURE :
 * le moteur fournit les optionnels placés, le rang de priorité de stimulus et un essai d'échange (séance
 * réassemblée) ; la fonction choisit l'optionnel retiré ou n'échange rien. Aucun quota musculaire.
 *
 * Règle (inchangée depuis la 4F) :
 * - candidats au retrait : optionnels placés, sans track (ancre ou suivi), de rang STRICTEMENT inférieur en
 *   priorité (rang numérique plus grand) à l'optionnel omis ; essayés du moins prioritaire au plus prioritaire,
 *   à rang égal dans l'ordre de placement (tri stable) ;
 * - échange accepté si la séance tient dans la durée, si l'omis apporte sur au moins un de ses groupes primaires
 *   autant que tous les autres exercices réunis (perte disproportionnée évitée), et si aucun groupe primaire du
 *   retiré ne tombe à zéro (couverture conservée) ;
 * - premier échange accepté retenu ; sinon, aucun échange.
 */
import type { SessionItem } from '@hybridsport/domain';

/**
 * Séries difficiles d'un élément pour la préservation du stimulus : séries de travail (montées et séries
 * facultatives exclues), séries de maintien ; mobilité et intervalles (portés) ne comptent pas.
 */
export function workingSetsOf(p: SessionItem['prescription']): number {
  if (p.type === 'sets') return p.sets.filter((s) => s.kind !== 'rampup' && s.optional !== true).length;
  return p.type === 'hold' ? p.sets : 0;
}

export interface SpPlaced {
  /** Identité stable de l'optionnel placé (position dans la séance). */
  readonly key: string;
  readonly slotId: string;
  readonly optional: boolean;
  /** Porte une track (ancre déclarée ou exercice suivi) : jamais retiré. */
  readonly tracked: boolean;
  readonly primaryGroups: readonly string[];
}

export interface SpTrial {
  readonly fits: boolean;
  /** Séries difficiles prévues par groupe dans la séance échangée (règle E1). */
  readonly planned: Readonly<Record<string, number>>;
  /** Séries de travail de l'optionnel ajouté. */
  readonly own: number;
  readonly addedGroups: readonly string[];
}

export interface SpDecision {
  readonly victim: SpPlaced;
  readonly groups: readonly string[];
  readonly own: number;
  readonly otherSets: number;
}

/** Candidats au retrait, dans l'ordre d'essai. */
export function removalOrder(failedSlot: string, rank: (slotId: string) => number, placed: readonly SpPlaced[]): SpPlaced[] {
  const fr = rank(failedSlot);
  if (fr < 0) return [];
  return placed.filter((p) => p.optional && !p.tracked && p.slotId !== failedSlot && rank(p.slotId) > fr)
    .sort((x, y) => rank(y.slotId) - rank(x.slotId));
}

/** Évaluation d'un échange essayé : groupes protégés et couverture du retiré. */
export function evaluateSwap(victim: SpPlaced, t: SpTrial): { accepted: boolean; groups: string[]; otherSets: number } {
  const groups = t.addedGroups.filter((g) => t.own > 0 && t.own >= (t.planned[g] ?? 0) - t.own);
  const covered = victim.primaryGroups.every((g) => (t.planned[g] ?? 0) > 0);
  return { accepted: t.fits && groups.length > 0 && covered, groups, otherSets: Math.max(0, ...groups.map((g) => (t.planned[g] ?? 0) - t.own)) };
}

/**
 * Choisit l'échange pour UN optionnel omis. `trial(victim)` réassemble la séance sans `victim` et avec l'omis
 * (ou renvoie 'blocked' si l'omis n'a plus de candidat) ; il repart toujours de l'état initial.
 */
export function findStimulusSwap(failedSlot: string, rank: (slotId: string) => number, placed: readonly SpPlaced[], trial: (victim: SpPlaced) => SpTrial | 'blocked'): SpDecision | undefined {
  for (const victim of removalOrder(failedSlot, rank, placed)) {
    const t = trial(victim);
    if (t === 'blocked') continue;
    const e = evaluateSwap(victim, t);
    if (e.accepted) return { victim, groups: e.groups, own: t.own, otherSets: e.otherSets };
  }
  return undefined;
}
