/**
 * Choix du modèle de progression d'un exercice (spec strength 05 §12, addendum V1.1 §4), partagé par le
 * moteur (exercice sans track) et le ProgressionEngine (création de track) : modèle du ruleset par niveau,
 * rôle et classe d'exercice, SAUF pas de charge grossier. Quand un pas réalisable représente une part trop
 * grande de la charge (haltères de 2 kg sur 14 kg), une progression linéaire ou autorégulée en charge
 * dépasserait la capacité réelle : la double progression (reps, puis charge) est retenue (simulation 4B).
 */
import type { Exercise, Level } from '@hybridsport/domain';
import { exerciseClass } from './model.js';
import type { ProgressionModel, SlotRole, StrengthParams } from './params.js';

export function progressionModelFor(e: Exercise, role: SlotRole, level: Level, loadKg: number | undefined, params: StrengthParams, declaredStepKg?: number): ProgressionModel {
  const p = params['strength.progression'];
  const base = p.modelFor[level][role][exerciseClass(e, params)];
  if (base !== 'linear_load' && base !== 'autoregulated') return base;
  const inc = declaredStepKg ?? (e.loadModel ? params['strength.load.defaultIncrements'][e.loadModel] : undefined);
  if (inc === undefined || loadKg === undefined || loadKg <= 0) return base;
  return (inc * p.loadStepIncrements) / loadKg > p.coarseStepFraction ? 'double_progression' : base;
}
