import type { RecoverySpec, RunDose, RunSegment, RunStructure, RunTarget } from './run-structure.js';

/**
 * CORE-EXT-R1 — métadonnées d'exécution NEUTRES vis-à-vis de l'UI : chaque étape d'une `run_structure`
 * reçoit une adresse stable à 4 entiers/étiquettes (segment, série, répétition, phase) et une clé texte
 * dérivée. Ces identités servent aux cases à cocher, au minuteur, à la reprise, à l'historique, aux
 * retours et à l'analytique, sans aucun concept d'interface (ni rendu, ni libellé, ni couleur).
 */
export const EXECUTION_PHASES = ['single', 'work', 'recovery', 'between_sets'] as const;
export type ExecutionPhase = (typeof EXECUTION_PHASES)[number];

/** Adresse de reprise : index de segment (0-based), série et répétition (1-based), phase. */
export interface ExecutionAddress {
  readonly segmentIndex: number;
  readonly set: number;
  readonly rep: number;
  readonly phase: ExecutionPhase;
}

export interface ExecutionStep {
  /** Clé stable `segmentId/série/répétition/phase` (historique, retours, analytique). */
  readonly key: string;
  readonly segmentId: string;
  readonly segmentKind: RunSegment['kind'];
  readonly address: ExecutionAddress;
  readonly dose: RunDose;
  /** Cible du segment pour une étape d'effort ; absente pour une récupération. */
  readonly target?: RunTarget;
  /** Mode de récupération pour une étape de récupération. */
  readonly recoveryMode?: RecoverySpec['mode'];
}

export function executionStepKey(segmentId: string, set: number, rep: number, phase: ExecutionPhase): string {
  return `${segmentId}/${String(set)}/${String(rep)}/${phase}`;
}

function step(s: RunSegment, segmentIndex: number, set: number, rep: number, phase: ExecutionPhase, dose: RunDose, extra: { target?: RunTarget; recoveryMode?: RecoverySpec['mode'] }): ExecutionStep {
  return { key: executionStepKey(s.id, set, rep, phase), segmentId: s.id, segmentKind: s.kind, address: { segmentIndex, set, rep, phase }, dose, ...extra };
}

/**
 * Déroulement linéaire et déterministe (même ordre que la dérivation de durée) : aucune récupération
 * après la dernière répétition d'une série ; une récupération entre séries.
 */
export function executionSteps(p: Pick<RunStructure, 'segments'>): ExecutionStep[] {
  const out: ExecutionStep[] = [];
  p.segments.forEach((s, i) => {
    switch (s.kind) {
      case 'warmup': case 'steady': case 'cooldown':
        out.push(step(s, i, 1, 1, 'single', s.dose, { target: s.target }));
        break;
      case 'preparation': {
        const reps = s.reps ?? 1;
        for (let r = 1; r <= reps; r++) {
          out.push(step(s, i, 1, r, 'work', s.dose, { target: s.target }));
          if (s.recovery && r < reps) out.push(step(s, i, 1, r, 'recovery', s.recovery.dose, { recoveryMode: s.recovery.mode }));
        }
        break;
      }
      case 'repeat':
        for (let set = 1; set <= s.sets; set++) {
          for (let r = 1; r <= s.reps; r++) {
            out.push(step(s, i, set, r, 'work', s.work, { target: s.target }));
            if (r < s.reps) out.push(step(s, i, set, r, 'recovery', s.recovery.dose, { recoveryMode: s.recovery.mode }));
          }
          if (set < s.sets && s.betweenSetRecovery) out.push(step(s, i, set, s.reps, 'between_sets', s.betweenSetRecovery.dose, { recoveryMode: s.betweenSetRecovery.mode }));
        }
        break;
    }
  });
  return out;
}

/** Résout une adresse de reprise ; `undefined` si elle ne désigne aucune étape (jamais une étape voisine). */
export function resolveExecutionAddress(p: Pick<RunStructure, 'segments'>, a: ExecutionAddress): ExecutionStep | undefined {
  return executionSteps(p).find((s) => s.address.segmentIndex === a.segmentIndex && s.address.set === a.set && s.address.rep === a.rep && s.address.phase === a.phase);
}
