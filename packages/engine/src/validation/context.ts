import type { DataQuality, DemandLevel, Eligibility, Level, ProgramStatus } from '@hybridsport/domain';
import type { DemandInputItem } from '../catalog/structures.js';

/** Restriction de zone issue des règles G1 de douleur (lot 13) : `exclude` = interdiction, `reduce` = prudence. */
export interface AreaRestriction { readonly area: string; readonly action: 'exclude' | 'reduce'; readonly painLevel: string }

/** Séance voisine vue par le contrôle de récupération minimale (A3). */
export interface NeighborDemand { readonly structure: string; readonly level: DemandLevel; readonly hoursBefore: number }

/**
 * Contexte de validation : TOUT est fourni par l'appelant et n'est jamais modifié par le validateur
 * ni par le RepairEngine (temps disponible, matériel, restrictions…).
 */
export interface ValidationContext {
  readonly programStatus: ProgramStatus;
  readonly eligibility: Eligibility;
  readonly athleteLevel: Level;
  readonly availableEquipment: readonly string[];
  readonly restrictions: readonly string[];
  readonly areaRestrictions: readonly AreaRestriction[];
  readonly restrictedMovements: readonly string[];
  readonly excludedExercises: readonly string[];
  readonly dayAvailable: boolean;
  /** Facultatif : contrôle A3 seulement si fourni. */
  readonly recovery?: {
    readonly neighbors: readonly NeighborDemand[];
    /** Doses et bandes d'intensité fournies par le moteur de discipline ; les structures restent dérivées du catalogue. */
    readonly items: readonly DemandInputItem[];
    readonly enforcement: { readonly stimulus?: string; readonly phase?: string; readonly keySessionProximity?: string; readonly dataQuality: DataQuality };
  };
}
