/**
 * Montée en charge (spec strength 04 §11, addendum V1.1 §6) : fonction de l'état de connaissance de la
 * charge de travail (connue, estimée, déterminée par l'effort, inconnue). `relative_to_working` n'est
 * utilisé que si une charge de travail existe (estimée). Hors E1, compte dans la durée, jamais sur un
 * exercice qui n'en a pas besoin. Toutes les valeurs : paramètres G2.
 */
import type { Exercise, SetPrescription } from '@hybridsport/domain';
import type { Env } from './model.js';
import type { ExerciseClass, SlotRole } from './params.js';
import type { LoadDecision } from './load.js';
import { loadStep } from './load.js';
import { roundDownToStep } from './util.js';

export interface RampupOptions {
  readonly role: SlotRole;
  readonly exerciseClass: ExerciseClass;
  readonly decision: LoadDecision;
  /** Intensité relative de la série de travail, quand elle est connue (fraction d'e1RM). */
  readonly relativeIntensity?: number;
  /** Nombre d'exercices du même pattern déjà montés en charge dans la séance. */
  readonly samePatternBefore: number;
  /** Répétitions (hautes) de la série de travail : au-delà du seuil G2, aucune montée n'est nécessaire. */
  readonly workingReps: number;
}

export function buildRampups(e: Exercise, env: Env, o: RampupOptions): SetPrescription[] {
  const r = env.params['strength.rampup'];
  // Charge EXTERNE lourde seulement (spec 04 §11) : jamais sur le poids du corps, l'isolation ou les petits accessoires.
  if (!r.roles.includes(o.role) || !r.exerciseClasses.includes(o.exerciseClass) || e.loadModel === undefined || !r.loadModels.includes(e.loadModel) || !e.loadable || o.workingReps > r.maxWorkingReps) return [];
  const limit = o.samePatternBefore > 0 ? r.samePatternMax : Number.POSITIVE_INFINITY;
  if (limit === 0) return [];
  const cut = <T>(xs: readonly T[]): T[] => xs.slice(Math.max(0, xs.length - Math.min(xs.length, limit)));
  const rest = r.restS;
  switch (o.decision.knowledge) {
    case 'known': {
      const working = o.decision.workingKg;
      const step = loadStep(e, env);
      if (working === undefined || !step) return [];
      const band = [...r.known].filter((b) => o.relativeIntensity === undefined || b.minRelative <= o.relativeIntensity).sort((a, b) => b.minRelative - a.minRelative)[0] ?? r.known[0];
      if (!band) return [];
      const seen = new Set<number>();
      const steps = band.steps.map((s) => ({ kg: roundDownToStep(working * s.fraction, step.stepKg), reps: s.reps }))
        .filter((s) => s.kg > 0 && s.kg < working && !seen.has(s.kg) && (seen.add(s.kg), true));
      return cut(steps).map((s) => ({ kind: 'rampup', reps: s.reps, restAfterS: rest, intensity: { mode: 'load', kg: s.kg, certainty: 'prescribed' } }));
    }
    case 'estimated': {
      // Ruleset scientifique V1 : la montée spécifique reste prioritaire quand la charge n'est que suggérée
      // (confiance MEDIUM) — bande selon l'intensité relative, sans palier au-delà du plafond estimé.
      const policy = env.params['strength.rampup.estimatedPolicy']?.band ?? 'first';
      const band = policy === 'first' ? r.known[0] : [...r.known].filter((b) => o.relativeIntensity === undefined || b.minRelative <= o.relativeIntensity).sort((a, b) => b.minRelative - a.minRelative)[0] ?? r.known[0];
      if (!band) return [];
      const steps = band.steps.filter((s) => s.fraction <= r.estimatedLastStepMax);
      return cut(steps).map((s) => ({ kind: 'rampup', reps: s.reps, restAfterS: rest, intensity: { mode: 'relative_to_working', fraction: s.fraction } }));
    }
    case 'effort':
      return cut(r.effortSteps).map((s) => ({ kind: 'rampup', reps: s.reps, restAfterS: rest, intensity: { mode: 'effort', effort: { rpe: s.rpe } } }));
    case 'unknown':
      return cut(r.unknownSteps).map((s) => ({ kind: 'rampup', reps: s.reps, restAfterS: rest, intensity: { mode: 'effort', effort: { rpe: s.rpe } } }));
  }
}
