/**
 * Dosage (spec strength 04 §9) : PROFIL DE BASE (stimulus × rôle × classe d'exercice) × MODIFICATEURS
 * (niveau, phase, lecture de l'état, multisport, temps ; volume en amont), avec une politique de conflit
 * lue dans le ruleset et tracée. Aucune table numérique dans le code.
 */
import type { Exercise, ReasonCode, RepTarget } from '@hybridsport/domain';
import type { Env } from './model.js';
import { exerciseClass } from './model.js';
import type { DoseCell, ExerciseClass, SlotRole } from './params.js';
import type { StrengthTrack } from './context.js';
import { strengthReasons } from './codes.js';
import { clamp } from './util.js';

export interface Dose {
  readonly sets: number;
  readonly reps: RepTarget;
  readonly rir: number;
  readonly restS: number;
  /** Première exposition sans référence : les N premières séries de travail servent à calibrer (effort G2). */
  readonly calibrationSets: number;
  readonly calibrationRir: number;
  readonly cell: DoseCell;
  readonly exerciseClass: ExerciseClass;
  readonly reasons: readonly ReasonCode[];
}

export function doseCell(e: Exercise, role: SlotRole, env: Env): { cell: DoseCell; cls: ExerciseClass } {
  const profile = env.params['strength.stimuli'][env.stimulus]?.doseProfile;
  const cls = exerciseClass(e, env.params);
  const cell = profile === undefined ? undefined : env.params['strength.dose.base'][profile]?.[role]?.[cls];
  if (!cell) throw new Error(`Profil de dosage absent : ${env.stimulus} / ${role} / ${cls}`);
  return { cell, cls };
}

export interface DoseOptions {
  readonly role: SlotRole;
  /** Séries allouées par le volume hebdomadaire (M3), dans la plage du profil. */
  readonly allocatedSets?: number;
  readonly timePressure: boolean;
  readonly track?: StrengthTrack;
  readonly doubleProgression: boolean;
  /** Première exposition sans référence : nombre de séries de calibration (G2). */
  readonly calibration: boolean;
}

export function computeDose(e: Exercise, env: Env, opts: DoseOptions): Dose {
  const { cell, cls } = doseCell(e, opts.role, env);
  const m = env.params['strength.dose.modifiers'];
  const reasons: ReasonCode[] = [];
  const next = opts.track?.nextPrescription;
  const cal = env.params['strength.calibration'];

  // Contrat track ↔ dosage (addendum V1.1 §4) : la track porte la CHARGE et les RÉPÉTITIONS (variables de
  // ses modèles). Les séries relèvent du volume (allocation PM4) et le RIR du stimulus : ils sont toujours
  // recalculés ici, modificateurs compris, jamais relus depuis la track (sinon les modificateurs
  // s'appliqueraient deux fois, séance après séance).
  let sets = opts.allocatedSets ?? cell.sets.min;
  const baseRir = cell.rir;
  const reps: RepTarget = next?.reps ?? (opts.doubleProgression ? { min: cell.reps.min, max: cell.reps.max } : m.repChoice === 'low' ? cell.reps.min : cell.reps.max);

  // Modificateurs : chacun est tracé ; la politique de conflit (ruleset) combine les deltas.
  const deltas: { modifier: string; setsDelta: number; rirDelta: number }[] = [];
  // Niveau : les cibles hebdomadaires sont DÉJÀ mises à l'échelle du niveau ; quand les séries viennent de
  // l'allocation du volume, le modificateur de niveau ne retire pas une série de plus (double comptage).
  const lv = m.level[env.level];
  deltas.push({ modifier: `level:${env.level}`, setsDelta: opts.allocatedSets !== undefined ? 0 : lv.setsDelta, rirDelta: lv.rirDelta });
  const phase = env.input.discipline.phase.kind;
  deltas.push({ modifier: `phase:${phase}`, setsDelta: m.phase[phase].setsDelta, rirDelta: m.phase[phase].rirDelta });
  const readiness = env.input.state.readiness === 'unknown' ? (m.unknownReadiness === 'as_caution' ? 'caution' : 'normal') : env.input.state.readiness;
  if (readiness === 'caution' || readiness === 'reduce') deltas.push({ modifier: `readiness:${readiness}`, ...m.readiness[readiness] });
  const structures = env.structuresOf(e);
  const touch = env.params['strength.interference'].touchThreshold;
  for (const [s, cause] of env.lowered) {
    const adj = env.params['strength.interference'].perStructure[s];
    if (adj && (structures[s] ?? 0) >= touch) deltas.push({ modifier: `interference:${s}:${cause}`, setsDelta: adj.setsDelta, rirDelta: adj.rirDelta });
  }
  const active = deltas.filter((d) => d.setsDelta !== 0 || d.rirDelta !== 0);
  const setsDelta = active.length === 0 ? 0 : m.conflictPolicy === 'sum' ? active.reduce((a, d) => a + d.setsDelta, 0) : Math.min(...active.map((d) => d.setsDelta));
  const rirDelta = active.length === 0 ? 0 : m.conflictPolicy === 'sum' ? active.reduce((a, d) => a + d.rirDelta, 0) : Math.max(...active.map((d) => d.rirDelta));
  for (const d of active) reasons.push(strengthReasons.emit('DOSE.MODIFIED', { modifier: `${d.modifier}|${m.conflictPolicy}`, exerciseId: e.id, setsDelta: d.setsDelta, rirDelta: d.rirDelta }));

  sets += setsDelta;
  const factor = m.phase[phase].setsFactor;
  if (factor !== undefined) sets = Math.floor(sets * factor);
  // Aucun modificateur ne dépasse le haut du profil ; un exercice prescrit garde au moins une série.
  sets = clamp(sets, 1, cell.sets.max);
  if (opts.timePressure && opts.role !== 'primary') {
    const floor = Math.max(1, Math.min(sets, cell.sets.min));
    if (floor < sets) reasons.push(strengthReasons.emit('DOSE.MODIFIED', { modifier: 'time', exerciseId: e.id, setsDelta: floor - sets, rirDelta: 0 }));
    sets = floor;
  }
  const rir = Math.max(0, baseRir + rirDelta);
  const restChoice = opts.timePressure ? 'low' : m.restChoice;
  // technical-constant: milieu de la plage de repos (moyenne arithmétique)
  const rawRest = restChoice === 'low' ? cell.restS.min : restChoice === 'high' ? cell.restS.max : (cell.restS.min + cell.restS.max) / 2;
  // Repos réalistes : arrondis au pas du ruleset, sans jamais passer sous le minimum du profil.
  const restS = Math.max(cell.restS.min, Math.round(rawRest / m.restRoundingS) * m.restRoundingS);
  const calibrationSets = opts.calibration && !next ? Math.min(sets, cal.sets) : 0;
  const calibrationRir = Math.max(rir, cal.targetRir + rirDelta);
  return { sets, reps, rir, restS, calibrationSets, calibrationRir, cell, exerciseClass: cls, reasons };
}
