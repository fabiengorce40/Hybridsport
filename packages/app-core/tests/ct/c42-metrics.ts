/**
 * C4.2 — mesures comparables C4.1 / C4.2 (chemin app-core réel, Beta 0 TEST_ONLY) : matrice intention × niveau ×
 * matériel × temps disponible. Lecture seule des séances et traces persistées ; aucune valeur sportive ici.
 */
import type { AppState, ProfileInput } from '../../src/index.js';
import { create, ctSessions, fullGym, profile, request } from './ct-fixtures.js';

export const INTENTS = ['crosstraining.mixed_modal_medium', 'crosstraining.aerobic_capacity', 'crosstraining.threshold', 'crosstraining.anaerobic_intervals', 'crosstraining.muscular_endurance'] as const;
export const LEVELS: readonly ProfileInput['level'][] = ['beginner', 'intermediate', 'advanced'];
export const MINUTES = [45, 60, 75] as const;
export const EQUIPMENTS = { full: fullGym, no_erg: fullGym.filter((e) => e !== 'rower' && e !== 'skierg') } as const;

export interface Cell {
  readonly n: number;
  readonly status: Readonly<Record<string, number>>;
  /** Séances complètes : moyennes (s). */
  readonly estimatedS: number | null;
  readonly plannedS: number | null;
  readonly blocks: Readonly<Record<string, number>>;
  readonly position: Readonly<Record<string, number>>;
  readonly warmupMovements: readonly string[];
  readonly mobility: readonly string[];
  /** C4.3 — formats du bloc principal des séances planifiées (variété). */
  readonly formats?: Readonly<Record<string, number>>;
}

function statusOf(s: AppState, id: string, x: ReturnType<typeof ctSessions>[number]): string {
  if (x.placement !== 'planned') return x.placement === 'composed_unplaced' ? 'UNPLACED' : 'BLOCKED';
  return x.composition?.c4?.status ?? (x.composition ? 'NO_C4_TRACE' : 'BLOCKED');
}

/** Agrège une liste d'états (séances CT de la semaine 1). */
export function measure(states: readonly AppState[]): Cell {
  const status: Record<string, number> = {};
  const blocks: Record<string, number> = {};
  const position: Record<string, number> = {};
  const wu = new Set<string>();
  const mob = new Set<string>();
  const formats: Record<string, number> = {};
  let n = 0; let full = 0; let est = 0; let estN = 0; let planned = 0;
  for (const s of states) {
    const xs = ctSessions(s);
    if (xs.length === 0) { status.BLOCKED = (status.BLOCKED ?? 0) + 1; n += 1; continue; }
    for (const x of xs) {
      n += 1;
      const st = statusOf(s, x.requestId, x);
      status[st] = (status[st] ?? 0) + 1;
      if (x.placement === 'planned' && x.ctFormat) formats[x.ctFormat] = (formats[x.ctFormat] ?? 0) + 1;
      const c4 = x.composition?.c4;
      if (st !== 'FULL_SESSION' || !c4) continue;
      full += 1;
      planned += c4.plannedDurationS ?? 0;
      if (x.estimatedDurationS !== null) {
        est += x.estimatedDurationS; estN += 1;
        const p = x.estimatedDurationS < 2700 ? 'below' : x.estimatedDurationS > 4500 ? 'above' : 'within';
        position[p] = (position[p] ?? 0) + 1;
      }
      blocks.main = (blocks.main ?? 0) + (x.composition?.blockDurationS ?? 0);
      for (const b of c4.blocks) blocks[b.block] = (blocks[b.block] ?? 0) + b.durationS;
      const r = request(s, x.requestId);
      const session = (r?.record?.data as { session?: { blocks: { id: string; kind: string; items: { exerciseId: string }[] }[] } } | undefined)?.session;
      for (const b of session?.blocks ?? []) {
        if (b.id.endsWith('.c4.warmup_general')) for (const i of b.items) wu.add(i.exerciseId);
        if (b.kind === 'cooldown') for (const i of b.items) mob.add(i.exerciseId);
      }
    }
  }
  return {
    n, status, estimatedS: estN > 0 ? est / estN : null, plannedS: full > 0 ? planned / full : null,
    blocks: Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, full > 0 ? v / full : 0])), position,
    warmupMovements: [...wu].sort(), mobility: [...mob].sort(), formats,
  };
}

export type Matrix = Record<string, Cell>;

/** Matrice complète : clé `intention|niveau|matériel` (les trois disponibilités cumulées). */
export function matrix(intents: readonly string[] = INTENTS): Matrix {
  const out: Matrix = {};
  for (const intent of intents) for (const level of LEVELS) for (const [eq, items] of Object.entries(EQUIPMENTS)) {
    const states = MINUTES.map((min) => create(profile({ ct: { intent }, level, equipment: items, availability: [min, 0, min, 0, min, 0, 0] })));
    out[`${intent.split('.')[1] ?? ''}|${level}|${eq}`] = measure(states);
  }
  return out;
}
