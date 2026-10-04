/**
 * Profil de demande GÉNÉRIQUE d'une séance générée (Standard Demand Profile) : RÉUTILISE `deriveDemandProfile`
 * (contribution du catalogue × dose × multiplicateur d'intensité, seuils par structure — tout lu dans le ruleset).
 *
 * Ce qui manquait au CORE : la dose normalisée (`doseUnits`) et la bande d'intensité de chaque item, jusqu'ici
 * attendues du moteur de discipline. Elles sont lues ici dans le paramètre GOUVERNÉ `demand.doseNormalization`
 * (discipline → unité de dose native de la prescription → { perUnit, intensityBand }). Aucune valeur par défaut :
 * discipline, unité ou bande absentes, exercice inconnu ou paramètre manquant ⇒
 * profil NON dérivable, raison exacte (le consommateur garde alors son comportement prudent).
 * Échauffement et retour au calme sont exclus (convention de l'application : seuls les blocs d'entraînement portent
 * la sollicitation). Le travail excentrique n'est pas déductible de la prescription : aucun modificateur appliqué.
 */
import type { Prescription, ReasonCode, SessionDraft } from '@hybridsport/domain';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedCatalog } from './catalog.js';
import { deriveDemandProfile, isDerivationTable, isThresholdTable } from './structures.js';
import type { DemandInputItem, DemandProfile } from './structures.js';

const reasons = createCoreRegistry();

/** Unités de dose NATIVES des prescriptions (ce que la prescription compte déjà ; aucune conversion ici). */
export const DEMAND_DOSE_UNITS = ['working_set', 'rep', 'meter', 'calorie', 'second', 'mobility_second', 'run_structure_work_second'] as const;
export type DemandDoseUnit = (typeof DEMAND_DOSE_UNITS)[number];

export interface DoseNormalizationEntry { readonly perUnit: number; readonly intensityBand: string }
export type DoseNormalizationTable = Readonly<Record<string, Readonly<Partial<Record<DemandDoseUnit, DoseNormalizationEntry>>>>>;

export function isDoseNormalizationTable(v: unknown): v is DoseNormalizationTable {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.values(v).every((byUnit) => byUnit !== null && typeof byUnit === 'object' && !Array.isArray(byUnit) && Object.entries(byUnit as object).every(([u, e]) => {
    if (!(DEMAND_DOSE_UNITS as readonly string[]).includes(u) || e === null || typeof e !== 'object') return false;
    const x = e as Record<string, unknown>;
    return typeof x.perUnit === 'number' && Number.isFinite(x.perUnit) && x.perUnit >= 0 && typeof x.intensityBand === 'string' && x.intensityBand.length > 0;
  }));
}

/**
 * Dose native d'une prescription. Séance structurée : durée de travail ESTIMÉE et stockée par le CORE (CORE-EXT-R1),
 * borne haute (prudence).
 */
export function nativeDose(p: Prescription): { readonly unit: DemandDoseUnit; readonly quantity: number } {
  switch (p.type) {
    case 'sets': return { unit: 'working_set', quantity: p.sets.filter((s) => s.kind !== 'rampup' && s.optional !== true).length };
    case 'reps': return { unit: 'rep', quantity: p.reps };
    case 'distance': return { unit: 'meter', quantity: p.distanceM };
    case 'calories': return { unit: 'calorie', quantity: p.calories };
    case 'timed': return { unit: 'second', quantity: p.workS * p.rounds };
    case 'hold': return { unit: 'second', quantity: p.seconds * p.sets };
    case 'mobility': return { unit: 'mobility_second', quantity: p.seconds * p.sides };
    case 'intervals': return 'timeS' in p.work ? { unit: 'second', quantity: p.work.timeS * p.reps } : { unit: 'meter', quantity: p.work.distanceM * p.reps };
    case 'run_structure': return { unit: 'run_structure_work_second', quantity: p.estimate.workS.max };
  }
}

const TRAINING_EXCLUDED_KINDS: ReadonlySet<string> = new Set(['warmup', 'cooldown']);
export const DEMAND_NORMALIZATION_PARAMETER = 'demand.doseNormalization';

export type SessionDemandResult =
  | { readonly ok: true; readonly profile: DemandProfile; readonly items: readonly DemandInputItem[] }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

export function deriveSessionDemand(session: SessionDraft, catalog: LoadedCatalog, ruleset: LoadedRuleset): SessionDemandResult {
  const fail = (cause: string, detail = ''): SessionDemandResult => ({ ok: false, reasons: [reasons.emit('DATA.DEMAND_PROFILE_UNAVAILABLE', { sessionId: session.id, cause, detail })] });
  const table = ruleset.parameter(DEMAND_NORMALIZATION_PARAMETER)?.value;
  if (table === undefined) return fail('PARAMETER_MISSING', DEMAND_NORMALIZATION_PARAMETER);
  if (!isDoseNormalizationTable(table)) return fail('PARAMETER_UNREADABLE', DEMAND_NORMALIZATION_PARAMETER);
  for (const id of ['demand.derivationTable', 'demand.levelThresholds', 'demand.intensityMultipliers', 'demand.eccentricLevelBump']) {
    if (!ruleset.parameter(id)) return fail('PARAMETER_MISSING', id);
  }
  if (!isDerivationTable(ruleset.parameter('demand.derivationTable')?.value) || !isThresholdTable(ruleset.parameter('demand.levelThresholds')?.value)) return fail('PARAMETER_UNREADABLE', 'demand.derivationTable|demand.levelThresholds');
  const byUnit = table[session.discipline];
  if (!byUnit) return fail('DISCIPLINE_NOT_NORMALIZED', session.discipline);
  const multipliers = ruleset.numberRecord('demand.intensityMultipliers');
  const items: DemandInputItem[] = [];
  for (const b of session.blocks) {
    if (TRAINING_EXCLUDED_KINDS.has(b.kind)) continue;
    for (const it of b.items) {
      if (!catalog.exercise(it.exerciseId)) return fail('UNKNOWN_EXERCISE', it.exerciseId);
      const dose = nativeDose(it.prescription);
      const entry = byUnit[dose.unit];
      if (!entry) return fail('UNIT_NOT_NORMALIZED', `${session.discipline}:${dose.unit}`);
      if (multipliers[entry.intensityBand] === undefined) return fail('INTENSITY_BAND_UNKNOWN', entry.intensityBand);
      items.push({ exerciseId: it.exerciseId, doseUnits: dose.quantity * entry.perUnit, intensityBand: entry.intensityBand });
    }
  }
  return { ok: true, profile: deriveDemandProfile(items, catalog, ruleset), items };
}
