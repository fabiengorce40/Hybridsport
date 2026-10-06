/**
 * C3 — CONTRAT DE PRÉSENTATION (aucune interface construite ici) : ce qu'une vue doit pouvoir afficher d'une séance
 * composée — bloc, format, mouvements, quantités, tours, chrono, résultat attendu — sans rien recalculer. Les
 * libellés sont des CLÉS (localisées côté application) ; les nombres viennent tels quels du plan.
 */
import { RESULT_KINDS_BY_FORMAT } from '../context.js';
import type { CtResult } from '../context.js';
import type { CtFormat } from '../model.js';
import { SECONDS_PER_MINUTE } from './parameters.js';
import type { C3Plan } from './compose.js';

export type C3Chrono =
  | { readonly kind: 'countdown'; readonly totalS: number }
  | { readonly kind: 'every_minute'; readonly minutes: number }
  | { readonly kind: 'intervals'; readonly workS: number; readonly restS: number; readonly rounds: number }
  | { readonly kind: 'stopwatch_with_cap'; readonly capS: number };

export interface C3PresentedMovement {
  readonly exerciseId: string;
  readonly role: string;
  readonly quantity: { readonly kind: 'reps' | 'calories' | 'distance_m' | 'duration_s'; readonly value: number };
  readonly loadKg?: number;
}

export interface C3Presentation {
  readonly blocks: readonly {
    readonly kind: 'conditioning';
    readonly formatKey: `ct.format.${CtFormat}`;
    readonly rounds?: number;
    readonly chrono: C3Chrono;
    readonly movements: readonly C3PresentedMovement[];
    /** Résultats saisissables (contrat de séance réalisée). */
    readonly resultKinds: readonly CtResult['kind'][];
  }[];
  /** Blocs de la structure non générés (échauffement…) : affichables comme « libre », jamais comptés. */
  readonly notGenerated: readonly string[];
}

export function presentC3(plan: C3Plan): C3Presentation {
  const first = plan.items[0];
  const chrono: C3Chrono = plan.format === 'emom' ? { kind: 'every_minute', minutes: plan.blockS / SECONDS_PER_MINUTE }
    : plan.format === 'for_time' ? { kind: 'stopwatch_with_cap', capS: plan.blockS }
      : plan.format === 'intervals' && first?.timed ? { kind: 'intervals', workS: first.timed.workS, restS: first.timed.restS, rounds: first.timed.rounds }
        : { kind: 'countdown', totalS: plan.blockS };
  return {
    blocks: [{
      kind: 'conditioning', formatKey: `ct.format.${plan.format}`, ...(plan.rounds === undefined ? {} : { rounds: plan.rounds }), chrono,
      movements: plan.items.map((it) => ({
        exerciseId: it.exerciseId, role: it.role,
        quantity: it.timed ? { kind: 'duration_s' as const, value: it.timed.workS } : { kind: it.quantity?.kind ?? 'reps', value: it.quantity?.value ?? 0 },
        ...(it.loadKg === undefined ? {} : { loadKg: it.loadKg }),
      })),
      resultKinds: RESULT_KINDS_BY_FORMAT[plan.format],
    }],
    notGenerated: plan.structure.filter((k) => k !== 'conditioning'),
  };
}
