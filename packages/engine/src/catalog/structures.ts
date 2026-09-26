import { DEMAND_LEVELS } from '@hybridsport/domain';
import type { DemandLevel, Exercise, ReasonCode } from '@hybridsport/domain';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { LoadedCatalog } from './catalog.js';

type Weights = Readonly<Record<string, number>>;

/** Table de correspondance catalogue → structures (paramètre `demand.derivationTable`, spec 04 §6). */
export interface DerivationTable {
  readonly roleFactors: { readonly primary: number; readonly secondary: number };
  readonly structures: Readonly<Record<string, { readonly muscles?: Weights; readonly patterns?: Weights; readonly costs?: Weights }>>;
}

export interface LevelThresholds { readonly low: number; readonly moderate: number; readonly high: number }

const isRecordOfNumbers = (v: unknown): v is Weights =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number' && Number.isFinite(x));

export function isDerivationTable(v: unknown): v is DerivationTable {
  if (v === null || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  const rf = t.roleFactors as Record<string, unknown> | undefined;
  if (!rf || typeof rf.primary !== 'number' || typeof rf.secondary !== 'number') return false;
  if (t.structures === null || typeof t.structures !== 'object') return false;
  return Object.values(t.structures as object).every((s) => {
    if (s === null || typeof s !== 'object') return false;
    const src = s as Record<string, unknown>;
    return ['muscles', 'patterns', 'costs'].every((k) => src[k] === undefined || isRecordOfNumbers(src[k]));
  });
}

export function isThresholdTable(v: unknown): v is Readonly<Record<string, LevelThresholds>> {
  return v !== null && typeof v === 'object' && Object.values(v).every((x) => {
    if (x === null || typeof x !== 'object') return false;
    const t = x as Record<string, unknown>;
    return typeof t.low === 'number' && typeof t.moderate === 'number' && typeof t.high === 'number' && t.low <= t.moderate && t.moderate <= t.high;
  });
}

/**
 * Contributions d'un exercice aux structures de planification, DÉRIVÉES de ses métadonnées
 * (muscles, patterns, coûts) — jamais saisies. Renvoie seulement les structures non nulles.
 */
export function deriveExerciseStructures(e: Exercise, table: DerivationTable): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [structure, src] of Object.entries(table.structures)) {
    let v = 0;
    for (const [m, w] of Object.entries(src.muscles ?? {})) {
      if (e.muscles.primary.includes(m)) v = Math.max(v, w * table.roleFactors.primary);
      else if (e.muscles.secondary.includes(m)) v = Math.max(v, w * table.roleFactors.secondary);
    }
    for (const [p, w] of Object.entries(src.patterns ?? {})) {
      if (e.patterns.primary === p) v = Math.max(v, w * table.roleFactors.primary);
      else if (e.patterns.secondary.includes(p)) v = Math.max(v, w * table.roleFactors.secondary);
    }
    for (const [field, w] of Object.entries(src.costs ?? {})) {
      const c = (e.cost as Readonly<Record<string, number>>)[field];
      if (c !== undefined) v = Math.max(v, c * w);
    }
    if (v > 0) out[structure] = v;
  }
  return out;
}

/** Élément de séance vu par la dérivation : AUCUN champ de structure n'est accepté en entrée. */
export interface DemandInputItem {
  readonly exerciseId: string;
  /** Dose normalisée fournie par le moteur de discipline (ex. séries difficiles, minutes de travail). */
  readonly doseUnits: number;
  /** Bande d'intensité (identifiant de données du ruleset). */
  readonly intensityBand: string;
  /** Travail excentrique important : modificateur (+ n niveaux, paramètre), pas une structure. */
  readonly eccentricBias?: boolean;
}

export interface DemandProfile {
  readonly levels: Readonly<Record<string, DemandLevel>>;
  readonly scores: Readonly<Record<string, number>>;
  readonly reasons: readonly ReasonCode[];
}

function levelFor(score: number, t: LevelThresholds): DemandLevel {
  if (score >= t.high) return 'high';
  if (score >= t.moderate) return 'moderate';
  if (score >= t.low && score > 0) return 'low';
  return 'none';
}

/**
 * Profil de demande d'une séance (8 structures en V1.2, identifiants de données) : agrégat
 * contribution × dose × multiplicateur d'intensité, puis seuils par structure — toutes les valeurs
 * viennent du ruleset.
 */
export function deriveDemandProfile(items: readonly DemandInputItem[], catalog: LoadedCatalog, ruleset: LoadedRuleset): DemandProfile {
  const table = ruleset.table('demand.derivationTable', isDerivationTable, 'DerivationTable');
  const thresholds = ruleset.table('demand.levelThresholds', isThresholdTable, 'Record<structure, {low, moderate, high}>');
  const multipliers = ruleset.numberRecord('demand.intensityMultipliers');
  const eccentricBump = ruleset.number('demand.eccentricLevelBump');
  const scores: Record<string, number> = Object.fromEntries(catalog.structureIds().map((s) => [s, 0]));
  const bumped = new Set<string>();
  for (const item of items) {
    const e = catalog.exercise(item.exerciseId);
    if (!e) continue; // l'intégrité des références est contrôlée par le validateur (TECHNICAL)
    const mult = multipliers[item.intensityBand] ?? multipliers.default;
    if (mult === undefined) continue;
    for (const [s, c] of Object.entries(deriveExerciseStructures(e, table))) {
      scores[s] = (scores[s] ?? 0) + c * item.doseUnits * mult;
      if (item.eccentricBias) bumped.add(s);
    }
  }
  const levels: Record<string, DemandLevel> = {};
  for (const s of catalog.structureIds()) {
    const t = thresholds[s] ?? thresholds.default;
    let lvl: DemandLevel = t ? levelFor(scores[s] ?? 0, t) : 'none';
    if (bumped.has(s) && lvl !== 'none') {
      const idx = Math.min(DEMAND_LEVELS.indexOf(lvl) + eccentricBump, DEMAND_LEVELS.length - 1);
      lvl = DEMAND_LEVELS[idx] ?? lvl;
    }
    levels[s] = lvl;
  }
  return { levels, scores, reasons: [] };
}

/** Niveau d'un alias de structures (ex. « bas du corps » = max des membres). */
export function groupLevel(profile: DemandProfile, groupId: string, catalog: LoadedCatalog): DemandLevel {
  let best = 0;
  for (const m of catalog.structureMembers(groupId)) best = Math.max(best, DEMAND_LEVELS.indexOf(profile.levels[m] ?? 'none'));
  return DEMAND_LEVELS[best] ?? 'none';
}
