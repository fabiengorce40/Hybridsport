/**
 * RC3 (préparation) — PROPOSITION de gouvernance TEST_ONLY : sollicitation des groupes musculaires ENTRE deux séances
 * de force (Musculation, bloc de force délégué du Cross-training). Module d'ÉTUDE, jamais lu par l'application ni par
 * le moteur Strength : il OBSERVE, il n'agit pas (aucune séance allégée, déplacée ou refusée).
 *
 * Ce que la représentation distingue (exigences de la mission) :
 *   - groupes sollicités : DIRECTS (groupe primaire d'un exercice) et INDIRECTS (secondaire), jamais confondus ;
 *   - séries : comptes bruts de séries de travail, prescrites ou réalisées (aucune pondération inventée) ;
 *   - intensité : bande ordinale lue sur le RIR cible le plus bas du groupe (inconnu ⇒ bande `unknown`) ;
 *   - délai de récupération : PAR BANDE, surchargeable PAR GROUPE ; `null` = NON RÉSOLU (aucune valeur par défaut) ;
 *   - fatigue déclarée : réponses du contrôle pré-séance (fatigue, récupération), tracées à côté, jamais converties.
 * Deux Full Body consécutifs ne sont PAS équivalents à deux séances espacées : l'écart réel (heures) est porté par
 * chaque observation et comparé au délai résolu de la bande ; sans délai validé, l'observation reste `UNRESOLVED`.
 */
import { z } from 'zod';
import type { VolumeSplit } from './volume-split.js';

const id = z.string().min(1);
export const zIntraStrengthProposal = z.object({
  id: z.literal('strength.recovery.intraDiscipline'),
  /** Jamais autre chose que TEST_ONLY dans cette étude ; une lecture PRODUCTION doit la refuser. */
  status: z.literal('TEST_ONLY'),
  /** Aucune action : la proposition décrit, elle ne prescrit pas. */
  action: z.literal('observe_only'),
  /** Bandes d'intensité, RIR maximal croissant (la bande d'un groupe = la première dont maxRir ≥ RIR cible minimal). */
  intensityBands: z.array(z.object({ id, maxRir: z.number().nonnegative() }).strict()).min(1)
    .refine((b) => b.every((x, i) => i === 0 || (b[i - 1]?.maxRir ?? -1) < x.maxRir), 'bandes croissantes'),
  /** Délai observé par bande (heures) ; null = non résolu (aucune valeur sans validation sportive). */
  recoveryHours: z.record(id, z.number().positive().nullable()),
  /** Surcharges par groupe (ex. mollets ≠ ischios) ; même sémantique null. */
  groupOverrides: z.record(id, z.record(id, z.number().positive().nullable())).optional(),
  /** Séries directes minimales de la séance précédente pour qu'une sollicitation compte ; null = toute série compte. */
  minDirectSets: z.number().int().positive().nullable(),
  /** Sollicitation indirecte : observée SÉPARÉMENT, jamais additionnée aux séries directes. */
  indirect: z.literal('observe_separately'),
  /** Fatigue déclarée : tracée avec l'observation, jamais convertie en heures. */
  declaredFatigue: z.literal('trace_only'),
}).strict();
export type IntraStrengthProposal = z.infer<typeof zIntraStrengthProposal>;

/**
 * Valeurs de DÉMONSTRATION (TEST_ONLY, non approuvées) : elles servent à montrer le mécanisme, pas à recommander un
 * délai. Les délais sont volontairement différents par bande pour rendre visible la distinction d'intensité.
 */
/* technical-constant: TEST_ONLY — bandes et délais de démonstration (heures), jamais une recommandation */
export const DEMO_PROPOSAL: IntraStrengthProposal = {
  id: 'strength.recovery.intraDiscipline', status: 'TEST_ONLY', action: 'observe_only',
  intensityBands: [{ id: 'near_failure', maxRir: 1 }, { id: 'hard', maxRir: 3 }, { id: 'moderate', maxRir: 10 }],
  recoveryHours: { near_failure: 72, hard: 48, moderate: 24, unknown: null },
  minDirectSets: null, indirect: 'observe_separately', declaredFatigue: 'trace_only',
};
/** Même structure, AUCUN délai résolu : état attendu tant qu'aucune validation sportive n'existe. */
export const UNRESOLVED_PROPOSAL: IntraStrengthProposal = { ...DEMO_PROPOSAL, recoveryHours: { near_failure: null, hard: null, moderate: null, unknown: null } };

export interface ForceSession {
  readonly id: string;
  /** Instant de la séance (ISO) : l'heure compte, deux séances du même jour ne sont pas « à 24 h ». */
  readonly at: string;
  readonly split: VolumeSplit;
  readonly declared?: { readonly fatigue?: string; readonly recovery?: string };
}
export type ObservationStatus = 'WITHIN_WINDOW' | 'OUTSIDE_WINDOW' | 'UNRESOLVED' | 'BELOW_MIN_SETS';
export interface IntraObservation {
  readonly from: string; readonly to: string; readonly group: string; readonly hours: number;
  readonly prevDirect: number; readonly prevIndirect: number; readonly nextDirect: number;
  readonly band: string; readonly requiredHours: number | null; readonly status: ObservationStatus;
  /** Groupe sollicité seulement INDIRECTEMENT par la séance précédente (observé à part). */
  readonly indirectOnly: boolean;
  readonly declared: { readonly fatigue?: string; readonly recovery?: string } | null;
}

const MS_PER_H = 3_600_000;
const bandOf = (rir: number | undefined, p: IntraStrengthProposal): string => (rir === undefined ? 'unknown' : p.intensityBands.find((b) => rir <= b.maxRir)?.id ?? 'unknown');

/**
 * Observations pour chaque séance et chaque groupe qu'elle sollicite DIRECTEMENT, face à la DERNIÈRE séance de force
 * antérieure qui a sollicité ce groupe (directement ou indirectement). Pur ; n'altère aucune séance.
 */
export function observeIntraStrength(sessions: readonly ForceSession[], proposal: IntraStrengthProposal): IntraObservation[] {
  const p = zIntraStrengthProposal.parse(proposal);
  const sorted = [...sessions].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const out: IntraObservation[] = [];
  for (const [j, next] of sorted.entries()) {
    for (const [group, nextDirect] of Object.entries(next.split.direct).sort()) {
      if (nextDirect <= 0) continue;
      // Dernière séance ANTÉRIEURE ayant sollicité ce groupe (direct ou indirect) : la récupération se lit depuis elle.
      const prev = sorted.slice(0, j).reverse().find((x) => (x.split.direct[group] ?? 0) > 0 || (x.split.indirect[group] ?? 0) > 0);
      if (!prev) continue;
      const hours = (Date.parse(next.at) - Date.parse(prev.at)) / MS_PER_H;
      const prevDirect = prev.split.direct[group] ?? 0; const prevIndirect = prev.split.indirect[group] ?? 0;
      const band = bandOf(prev.split.minRir[group], p);
      const over = p.groupOverrides?.[group];
      const required = over && band in over ? (over[band] ?? null) : (p.recoveryHours[band] ?? null);
      const status: ObservationStatus = p.minDirectSets !== null && prevDirect < p.minDirectSets && prevIndirect === 0 ? 'BELOW_MIN_SETS'
        : required === null ? 'UNRESOLVED' : hours < required ? 'WITHIN_WINDOW' : 'OUTSIDE_WINDOW';
      out.push({ from: prev.id, to: next.id, group, hours, prevDirect, prevIndirect, nextDirect, band, requiredHours: required, status, indirectOnly: prevDirect <= 0, declared: next.declared ?? null });
    }
  }
  return out;
}

/** Résumé descriptif (aucun score) : nombre d'observations par statut, direct / indirect séparés. */
export function summarize(obs: readonly IntraObservation[]): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const o of obs) { const k = `${o.indirectOnly ? 'indirect' : 'direct'}:${o.status}`; out[k] = (out[k] ?? 0) + 1; }
  return out;
}
