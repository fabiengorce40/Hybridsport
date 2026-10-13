/**
 * RC2 — ÉTUDE (lecture seule pour le produit) : environnements Beta 0 dérivés pour comparer des stratégies
 * d'arbitrage de récupération. Rien ici n'est branché à l'application : `beta0Environment()` reste inchangé ; ces
 * environnements n'existent que dans les tests d'étude. Valeurs = PARAMÈTRES D'ÉTUDE explicites, jamais des seuils
 * sportifs (aucune n'est proposée comme règle).
 *
 * Stratégies (actions M3, dans l'ordre d'essai) : A = MOVE ; B = MOVE puis SWAP ; C = MOVE, SWAP puis RECOMPOSE.
 * Détection d'étude « force » : paire de séances Musculation ↔ Musculation ou Musculation ↔ Cross-training (bloc
 * délégué compris, demande composite) sur des structures CORE, capacité `sameSport` / `sports` de M3 (inerte ailleurs).
 * Départage à égalité : critère d'étude `later` (la séance la plus tardive cède) après `importance` puis `rank`.
 * Stratégie exploratoire D (au-delà du minimum demandé) : ESPACEMENT au placement initial des séances de force
 * (Musculation + Cross-training), capacité d'étude `planner.placement.spacingGroups` ; D0 = espacement seul (M3 RC1),
 * DB = espacement + règle d'étude « force » + stratégie B.
 */
import { beta0Environment } from '../../src/index.js';
import type { PlanFn } from '../consolidation/sim4.js';
import type { ProfileInput, ProgrammeEnvironment } from '../../src/index.js';
import { PROFILE } from '../consolidation/sim4.js';
import { eqOf } from '../strength-fixes/sf-fixtures.js';
import { M3_TEST_PAIR_STRUCTURES, M3_TEST_WINDOWS, m3Parameters } from '../../../planner/tests/m3-governance.js';
import { STRUCTURE_IDS, TEST_WINDOW_H } from '../../../planner/tests/simulation.js';
import { testRuleset } from '../../../engine/tests/fixtures/load.js';
import { param, testRulesetDocument } from '../../../engine/tests/fixtures/ruleset.js';

export type Action = 'MOVE' | 'SWAP' | 'RECOMPOSE';
export const STRATEGIES: Readonly<Record<'A' | 'B' | 'C', readonly Action[]>> = { A: ['MOVE'], B: ['MOVE', 'SWAP'], C: ['MOVE', 'SWAP', 'RECOMPOSE'] };

export interface ForceParams { readonly key: string; readonly label: string; readonly withinHours: number; readonly levels: readonly ('moderate' | 'high')[]; readonly structures: readonly string[] }
/** Structures CORE « force » observées (charge musculaire et axiale) ; l'impact locomoteur et le systémique sont exclus. */
const FORCE_STRUCTURES = ['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial'] as const;
// technical-constant: ÉTUDE RC2 — fenêtres testées (heures) : < 36 h = jour suivant seulement ; < 60 h = J+1 et J+2
const J1_H = 36;
// technical-constant: ÉTUDE RC2 — fenêtre J+1 et J+2 (heures)
const J2_H = 60;
export const PARAMS: readonly ForceParams[] = [
  { key: 'P1', label: '< 36 h (J+1), niveau élevé', withinHours: J1_H, levels: ['high'], structures: FORCE_STRUCTURES },
  { key: 'P2', label: '< 36 h (J+1), niveau modéré ou élevé', withinHours: J1_H, levels: ['moderate', 'high'], structures: FORCE_STRUCTURES },
  { key: 'P3', label: '< 60 h (J+1 et J+2), niveau élevé', withinHours: J2_H, levels: ['high'], structures: FORCE_STRUCTURES },
];

export type StrategyKey = 'A' | 'B' | 'C' | 'D0' | 'DB';
const MARK = { justification: 'SIMULATION_ONLY — étude RC2 (jamais lue par l’application)' };
const FORCE_SPORTS = ['strength', 'crosstraining'] as const;

/**
 * Environnement d'étude : Beta 0 + fenêtres G4 et politique M3 TEST d'origine (identiques à `m3Governance`), plus la
 * règle d'étude « force » (A, B, C, DB) et/ou l'espacement au placement (D0, DB).
 */
export function studyEnv(strategy: StrategyKey, p?: ForceParams): ProgrammeEnvironment {
  const base = beta0Environment();
  const force = strategy !== 'D0' && p !== undefined;
  const pairRules = [
    { id: 'm3.test.pair.medium', structures: [...M3_TEST_PAIR_STRUCTURES], levels: ['high'], withinHours: M3_TEST_WINDOWS.medium },
    ...(force ? [{ id: `rc2.study.force.${p.key}`, structures: [...p.structures], levels: [...p.levels], withinHours: p.withinHours, sameSport: true, sports: [...FORCE_SPORTS] }] : []),
  ];
  const actions = strategy === 'DB' ? STRATEGIES.B : strategy === 'D0' ? STRATEGIES.C : STRATEGIES[strategy];
  const m3 = m3Parameters({ extra: MARK, actions: [...actions], yieldOrder: force ? ['importance', 'rank', 'later'] : ['importance', 'rank'], values: { 'planner.m3.pairRules': pairRules } });
  const spacing = strategy === 'D0' || strategy === 'DB' ? [param('planner.placement.spacingGroups', [[...FORCE_SPORTS]] as never, 'G2', MARK)] : [];
  const doc = testRulesetDocument();
  const g4 = param('planner.interference.structureWindows', Object.fromEntries(STRUCTURE_IDS.map((x) => [x, TEST_WINDOW_H])) as never, 'G2', MARK);
  return { ...base, governance: testRuleset({ ...doc, parameters: [...doc.parameters, g4, ...m3, ...spacing] }) };
}

/** Configurations RC1 (identiques à `multi-config.test.ts`). */
const withPreset = (preset: string): ProfileInput => ({ ...PROFILE, equipment: { presetId: preset, items: eqOf(preset) } });
const HYBRID: ProfileInput = { ...PROFILE, priorities: ['running', 'strength', 'crosstraining'], strength: { ...PROFILE.strength, sessionsPerWeek: 2 }, running: { ...PROFILE.running, sessionsPerWeek: 3 } };
const DEGRADED: PlanFn = () => ({ ci: { painAnswer: 'no', fatigue: 'high', recovery: 'poor' }, label: 'Non · fatigue élevée · récupération mauvaise' });
export const CONFIGS: readonly { readonly key: string; readonly name: string; readonly profile?: ProfileInput; readonly plan?: PlanFn }[] = [
  { key: 'A', name: 'Prise de masse prioritaire (salle commerciale)' },
  { key: 'B', name: 'Profil hybride (Course 3×, Musculation 2×, CT 1×)', profile: HYBRID },
  { key: 'C', name: 'Salle complète', profile: withPreset('preset.full_gym') },
  { key: 'D', name: 'Matériel limité (haltères seulement)', profile: withPreset('preset.dumbbells_only') },
  { key: 'E', name: 'Récupération dégradée à chaque séance', plan: DEGRADED },
];
