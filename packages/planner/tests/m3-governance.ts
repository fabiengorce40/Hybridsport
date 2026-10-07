/**
 * M3 — politique d'arbitrage multisport TEST_ONLY, source UNIQUE. AUCUNE valeur n'est approuvée : statut `draft`,
 * provisoire ; une lecture PRODUCTION les refuse (NOT_PRODUCTION_READY). Ce sont des valeurs de MÉCANISME (montrer que
 * la détection, la distance, l'arbitrage et les actions fonctionnent), jamais une recommandation de récupération :
 * fenêtres « proche / moyenne / lointaine » choisies pour rendre les effets visibles, pas pour être justes.
 */
import type { LoadedRuleset } from '@hybridsport/engine';
import { ARCHETYPE_INTENT_IDS } from '@hybridsport/running';
import { testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocument } from '../../engine/tests/fixtures/ruleset.js';
import { STRUCTURE_IDS, TEST_WINDOW_H } from './simulation.js';

// technical-constant: TEST_ONLY — fenêtres d'interférence de démonstration (heures) : proche / moyenne / lointaine
export const M3_TEST_WINDOWS = { near: 24, medium: 48, far: 72 } as const;
export type M3Window = keyof typeof M3_TEST_WINDOWS;
// technical-constant: TEST_ONLY — fenêtre de transport des voisines (heures)
export const M3_TEST_NEIGHBOUR_WINDOW_H = 72;
// technical-constant: TEST_ONLY — accumulation : plus de 2 séances `high` sur une structure en 72 h
export const M3_TEST_ACCUMULATION = { withinHours: 72, maxSessions: 2 } as const;
// technical-constant: TEST_ONLY — borne de passes d'arbitrage (arrêt garanti)
export const M3_TEST_MAX_PASSES = 12;

/**
 * Structures où deux séances de sports différents à demande `high` sont un conflit (TEST_ONLY). `high_intensity_systemic`
 * est EXCLUE : sous la normalisation des doses TEST_ONLY, presque toute séance y est `high` (non discriminante, limite
 * documentée) ; l'inclure saturerait toute semaine multisport.
 */
export const M3_TEST_PAIR_STRUCTURES = ['lower_knee', 'lower_hip', 'locomotor_impact', 'axial', 'grip'] as const;
/** Accumulation (succession de jours) : structures du bas du corps et impact (TEST_ONLY). */
export const M3_TEST_ACCUMULATION_STRUCTURES = ['lower_knee', 'lower_hip', 'locomotor_impact'] as const;

/** Identifiants SIMULATION_ONLY tracés par la Beta 0 expérimentale quand elle lit cette politique. */
export const M3_SIMULATION_IDS = ['planner.m3.pairRules', 'planner.m3.accumulationRules', 'planner.m3.actions', 'planner.m3.yieldPolicy', 'planner.m3.sessionImportance', 'planner.m3.historyStatuses', 'planner.m3.maxPasses', 'planner.m3.neighbourWindowHours'] as const;

export interface M3TestOptions {
  readonly window?: M3Window;
  readonly actions?: readonly ('MOVE' | 'SWAP' | 'RECOMPOSE')[];
  readonly protectPriority?: boolean;
  readonly yieldOrder?: readonly ('importance' | 'rank')[];
  readonly importance?: Record<string, Record<string, 'key' | 'standard'>> | null;
  readonly historyStatuses?: readonly ('executed' | 'abandoned' | 'planned' | 'missed')[];
  readonly maxPasses?: number;
  readonly accumulation?: boolean;
  readonly pairStructures?: readonly string[];
  readonly levels?: readonly ('low' | 'moderate' | 'high')[];
  readonly neighbourWindowH?: number | null;
  /** Valeurs BRUTES imposées à certains paramètres (tests adversariaux : schéma invalide, action inconnue…). */
  readonly values?: Readonly<Record<string, unknown>>;
  /** Paramètres M3 à OMETTRE (fail-closed). */
  readonly omit?: readonly string[];
  /** Champs de méta-données ajoutés à chaque paramètre (ex. statut approuvé simulé). */
  readonly extra?: Record<string, unknown>;
  /** Fenêtres G4 V2 (null ⇒ absentes). */
  readonly g4?: Record<string, number> | null;
}

/** Importance TEST_ONLY : Running KEY / LONG / TEST clés ; HYROX course compromise clé (rôle déclaré). */
export const M3_TEST_IMPORTANCE: Record<string, Record<string, 'key' | 'standard'>> = {
  running: { KEY: 'key', LONG: 'key', TEST: 'key', EASY: 'standard', [ARCHETYPE_INTENT_IDS.TEST]: 'key' },
  hyrox: { 'hybrid_race.h2.compromised_running': 'key' },
};

export function m3Parameters(o: M3TestOptions = {}) {
  const levels = o.levels ?? ['high'];
  const within = M3_TEST_WINDOWS[o.window ?? 'medium'];
  const extra = o.extra ?? {};
  const all = [
    param('planner.m3.pairRules', [{ id: `m3.test.pair.${o.window ?? 'medium'}`, structures: [...(o.pairStructures ?? M3_TEST_PAIR_STRUCTURES)], levels: [...levels], withinHours: within }] as never, 'G2', extra),
    param('planner.m3.accumulationRules', (o.accumulation === false ? [] : M3_TEST_ACCUMULATION_STRUCTURES.map((s) => ({ id: 'm3.test.accumulation', structure: s, levels: ['high'], ...M3_TEST_ACCUMULATION }))) as never, 'G2', extra),
    param('planner.m3.actions', [...(o.actions ?? ['MOVE', 'SWAP', 'RECOMPOSE'])] as never, 'G2', extra),
    param('planner.m3.yieldPolicy', { order: [...(o.yieldOrder ?? ['importance', 'rank'])], protectPriority: o.protectPriority ?? true } as never, 'G2', extra),
    param('planner.m3.historyStatuses', [...(o.historyStatuses ?? ['executed', 'abandoned'])] as never, 'G2', extra),
    param('planner.m3.maxPasses', o.maxPasses ?? M3_TEST_MAX_PASSES, 'G3', extra),
    ...(o.importance === null ? [] : [param('planner.m3.sessionImportance', (o.importance ?? M3_TEST_IMPORTANCE) as never, 'G2', extra)]),
    ...(o.neighbourWindowH === null ? [] : [param('planner.m3.neighbourWindowHours', o.neighbourWindowH ?? M3_TEST_NEIGHBOUR_WINDOW_H, 'G2', extra)]),
  ];
  return all.filter((p) => !(o.omit ?? []).includes(p.id)).map((p) => (o.values && p.id in o.values ? { ...p, value: o.values[p.id] as never } : p));
}

/** Gouvernance du planificateur TEST_ONLY : fenêtres G4 V2 + politique M3. */
export function m3Governance(o: M3TestOptions = {}): LoadedRuleset {
  const doc = testRulesetDocument();
  const g4 = o.g4 === undefined ? Object.fromEntries(STRUCTURE_IDS.map((s) => [s, TEST_WINDOW_H])) : o.g4;
  return testRuleset({ ...doc, parameters: [...doc.parameters, ...(g4 === null ? [] : [param('planner.interference.structureWindows', g4, 'G2', o.extra ?? {})]), ...m3Parameters(o)] });
}
