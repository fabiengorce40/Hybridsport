/**
 * C3 — registre des FORMATS. Un format n'est générable que si sa représentation CORE existe ET si toutes les données
 * qu'il exige sont gouvernées dans le mode. « Connu » n'est jamais « générable ».
 *
 * Durée PRESCRITE (format à priorité temps : continu, intervalles, EMOM, AMRAP) : connue par construction.
 * Durée ESTIMÉE (format à priorité tâche : for time) : exige des débits gouvernés (`ct.estimation.workRates`) ;
 * sans eux, le format n'est pas générable (aucun time cap inventé).
 */
import type { CtMode } from '../model.js';
import type { CtGovernance } from '../governance/state.js';
import { readC3 } from './parameters.js';
import type { C3ParameterId } from './parameters.js';

export const C3_FORMAT_IDS = ['continuous', 'intervals', 'emom', 'amrap', 'for_time', 'rounds', 'chipper'] as const;
export type C3FormatId = (typeof C3_FORMAT_IDS)[number];

export interface C3FormatSpec {
  readonly priority: 'time' | 'task';
  readonly duration: 'prescribed' | 'estimated';
  /** Représentation CORE (bloc + type d'item). */
  readonly core: string;
  /** Un seul mouvement monostructural en durée, ou plusieurs rôles en quantités. */
  readonly items: 'single_timed' | 'quantities';
  readonly density: 'exact' | 'estimated' | 'self_paced';
  /** Paramètres propres au format, en plus de ceux de `ctSessionComposition`. */
  readonly requires: readonly C3ParameterId[];
  /** Cause de blocage STRUCTURELLE (indépendante des valeurs), si le format n'est pas composable en C3. */
  readonly blocked?: string;
}

export const C3_FORMATS: Readonly<Record<C3FormatId, C3FormatSpec>> = {
  continuous: { priority: 'time', duration: 'prescribed', core: 'continuous + timed', items: 'single_timed', density: 'exact', requires: [] },
  // Intervalles à UN mouvement : `timed { workS, rounds, restS }`. Multi-stations : ordre non représentable (CORE-EXT-C1 P8).
  intervals: { priority: 'time', duration: 'prescribed', core: 'continuous + timed(rounds, restS)', items: 'single_timed', density: 'exact', requires: ['ct.stimulus.workRestRatios'] },
  // « Tous les items chaque minute » (sémantique CORE) ; EMOM alterné non représentable (P7).
  emom: { priority: 'time', duration: 'prescribed', core: 'emom { minutes } + reps/calories/distance', items: 'quantities', density: 'estimated', requires: ['ct.estimation.workRates', 'ct.format.emomDensity', 'ct.safety.repsPerMovementCap'] },
  // Durée prescrite ; le volume maximal (plafonds) exige le débit RAPIDE gouverné.
  amrap: { priority: 'time', duration: 'prescribed', core: 'amrap { timeCapS } + reps/calories/distance', items: 'quantities', density: 'self_paced', requires: ['ct.estimation.workRates', 'ct.safety.repsPerMovementCap'] },
  for_time: { priority: 'task', duration: 'estimated', core: 'for_time { rounds, timeCapS } + reps/calories/distance', items: 'quantities', density: 'self_paced', requires: ['ct.estimation.workRates', 'ct.format.timeCapMargin', 'ct.safety.repsPerMovementCap'] },
  // « N tours de qualité avec repos » : bloc `sets` circuit (items `sets` exigés) ou `for_time` (score implicite) : ambigu.
  rounds: { priority: 'task', duration: 'estimated', core: '—', items: 'quantities', density: 'self_paced', requires: [], blocked: 'REPRESENTATION_AMBIGUOUS' },
  // Chipper = for_time à 1 tour : le nombre de mouvements et leur ordre ne sont pas définis (et le stimulus est réservé).
  chipper: { priority: 'task', duration: 'estimated', core: 'for_time { rounds: 1 }', items: 'quantities', density: 'self_paced', requires: [], blocked: 'CHIPPER_DEFINITION_UNGOVERNED' },
};

export type Generability = { readonly generable: true } | { readonly generable: false; readonly causes: readonly string[] };

/** Générabilité d'un format dans une gouvernance et un mode (aucune lecture de l'athlète). */
export function formatGenerability(id: C3FormatId, governance: CtGovernance, mode: CtMode): Generability {
  const spec = C3_FORMATS[id];
  if (spec.blocked) return { generable: false, causes: [spec.blocked] };
  const missing = spec.requires.filter((p) => !readC3(governance, p, mode).ok);
  return missing.length === 0 ? { generable: true } : { generable: false, causes: missing.map((p) => `UNGOVERNED:${p}`) };
}
