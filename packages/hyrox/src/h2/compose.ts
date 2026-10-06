/**
 * H2 — MOTEUR DE COMPOSITION d'une séance HYROX.
 *
 *   INTENTION → RÔLE DE SÉANCE → STRUCTURE → RÔLES DE BLOCS → STATIONS / COURSE → DOSE → VALIDATION → (PROFIL DE
 *   DEMANDE : CORE) → PRESCRIPTION
 *
 * - L'épreuve n'est pas l'entraînement : le programme demande un RÔLE (jamais une station) ; la structure d'épreuve
 *   n'est qu'un rôle parmi d'autres (`partial_simulation`, ordre GOUVERNÉ exigé) ; la simulation complète est BLOCKED.
 * - Aucun hasard : chaque choix est un CLASSEMENT déterministe et tracé (critères explicites, départage final par
 *   identifiant). Aucune valeur sportive ici : rôles, structures, volumes, doses, charges, débits, domaines temporels,
 *   technicité et politiques viennent de paramètres GOUVERNÉS (`hybrid_race.h2.*`, fail-closed).
 * - La course n'est qu'une DISTANCE (unité native) avec son contexte (fraîche / après station) : l'allure reste au
 *   moteur Running (BLOCKED tant que la délégation n'est pas orchestrée). Les transitions sont comptées, jamais
 *   chiffrées : leur durée est INCONNUE et exclue de l'estimation (tracé).
 * - Voisines (autres disciplines) et priorité TRANSPORTÉES ; voisines interprétées seulement si
 *   `hybrid_race.h2.neighbourPolicy` est gouvernée ; priorité sans aucune politique (identique quel que soit le rang).
 */
import { NOT_APPLICABLE, asISODateTime, hoursBetween } from '@hybridsport/domain';
import type { Exercise, ReasonCode, SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import { deriveExerciseStructures, isDerivationTable, readToleranceProfile } from '@hybridsport/engine';
import type { DerivationTable, SportEngineInput } from '@hybridsport/engine';
import { HR_CODES, hrReasons } from '../codes.js';
import type { H2Exposure, H2Realized, HyroxContext } from '../model.js';
import { readHrParam } from '../params.js';
import type { H2StationDose, H2Volume, H2WorkRates, HrParamId, HrParamValue } from '../params.js';
import { movementIssues } from '../h1.js';
import { HR_ROLE_SPECS, HR_STRUCTURE_SPECS, structureFitsRole } from './taxonomy.js';
import type { HrRole, HrSessionBlockKind, HrStructure } from './taxonomy.js';

// technical-constant: conversion jours → heures (calendrier)
const HOURS_PER_DAY = 24;
// technical-constant: les débits gouvernés sont exprimés par minute (définition de l'unité)
const SECONDS_PER_MINUTE = 60;
/** Seul modèle de charge sans charge externe obligatoire. */
const BODYWEIGHT_MODEL = 'bodyweight_plus';
export const HR_H2_PRIORITY_POLICY = 'blocked:priority_interference_policy';
/** Allure du segment couru : relève du moteur Running, délégation non orchestrée. */
export const HR_H2_RUN_PACE = 'BLOCKED:RUNNING_ENGINE_DELEGATION' as const;
/** Temps cible déclaré : transporté, jamais interprété (aucun modèle temps cible → dose gouverné). */
export const HR_H2_TARGET_TIME = 'NOT_INTERPRETED:no_governed_target_time_model';
/** Unité de dose → métrique mesurable du catalogue. */
const METRIC_OF = { distance_m: 'distance', reps: 'reps', calories: 'calories', duration_s: 'time' } as const;

export type H2RunContext = 'fresh' | 'after_station';
export interface H2Item {
  readonly itemId: string;
  readonly kind: 'station' | 'run';
  readonly exerciseId: string;
  readonly stationId?: string;
  readonly dose: H2StationDose['dose'];
  readonly loadKg?: number;
  readonly runContext?: H2RunContext;
}

export interface H2Plan {
  readonly role: HrRole;
  readonly level: string;
  readonly sessionStructure: readonly HrSessionBlockKind[];
  readonly structure: HrStructure;
  readonly volume: H2Volume;
  /** Tours du bloc `for_time` (layout `repeat` : tours gouvernés ; `expanded` : 1). */
  readonly rounds: number;
  /** Items d'UN tour (séquence complète pour `expanded`). */
  readonly items: readonly H2Item[];
  /** Stations distinctes, dans l'ordre prescrit. */
  readonly stations: readonly string[];
  readonly selection: readonly { readonly stationId: string; readonly exerciseId: string; readonly criteria: readonly string[] }[];
  /** Time cap PRESCRIT (plafond, jamais une cible) et durée ESTIMÉE (débits gouvernés, transitions exclues). */
  readonly timeCapS: number;
  readonly estimated: { readonly fastS: number; readonly typicalS: number; readonly slowS: number };
  /** Nombre de transitions du bloc : durée INCONNUE (null), exclue de l'estimation. */
  readonly transitions: { readonly count: number; readonly durationS: null };
  readonly rejectedStructures: readonly { readonly structure: string; readonly causes: readonly string[] }[];
  readonly excludedByHistory: readonly string[];
  readonly avoidedStructures: readonly string[];
  readonly identicalToLast: readonly string[];
  readonly accumulation: readonly string[];
}

export type H2Outcome =
  | { readonly ok: true; readonly plan: H2Plan; readonly proposal: SportEngineProposalInput }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

type Input = SportEngineInput<HyroxContext>;
const fail = (reasons: readonly ReasonCode[]): H2Outcome => ({ ok: false, reasons });

const COMMON = [
  'hybrid_race.h2.roles', 'hybrid_race.h2.roleStructures', 'hybrid_race.h2.sessionStructure', 'hybrid_race.h2.stationPool', 'hybrid_race.h2.stationDoses',
  'hybrid_race.h2.structureVolume', 'hybrid_race.h2.workRates', 'hybrid_race.h2.timeCapMargin', 'hybrid_race.h2.timeDomains', 'hybrid_race.h2.toleranceProfile',
  'hybrid_race.h2.eligibleLevels', 'hybrid_race.h2.technicalUnderFatigue', 'hybrid_race.h2.historyPolicy',
] as const;
type CommonId = (typeof COMMON)[number];
type Common = { [K in CommonId]: HrParamValue<K> };
type Used = { readonly id: string; readonly version: string };

/** Lecture groupée fail-closed : TOUTES les causes de refus sont rendues (ordre stable), les traces des succès gardées. */
function readMany<K extends HrParamId>(input: Input, ids: readonly K[]): { ok: true; values: { [P in K]: HrParamValue<P> }; used: Used[]; reasons: ReasonCode[] } | { ok: false; reasons: ReasonCode[] } {
  const values: Partial<{ [P in K]: HrParamValue<P> }> = {};
  const used: Used[] = [];
  const ok: ReasonCode[] = [];
  const failed: ReasonCode[] = [];
  for (const id of ids) {
    const r = readHrParam(input.ruleset, id, input.discipline.mode);
    if (r.ok) { values[id] = r.value; used.push({ id, version: r.version }); ok.push(...r.reasons); } else failed.push(...r.reasons);
  }
  return failed.length > 0 ? { ok: false, reasons: failed } : { ok: true, values: values as { [P in K]: HrParamValue<P> }, used, reasons: ok };
}

/** Point d'entrée : refus tracé, ou plan + proposition (jamais validée ici : le CORE reste l'autorité). */
export function composeH2(input: Input, role: HrRole, simulation: boolean, engine: { readonly id: string; readonly version: string }): H2Outcome {
  const ctx = input.discipline;
  const mode = ctx.mode;
  const level = ctx.population.level;
  const spec = HR_ROLE_SPECS[role];

  // ——— Garde-fous (même ordre que H1) ———
  if (mode === 'CANDIDATE' && !simulation) return fail([hrReasons.emit(HR_CODES.SIMULATION_REQUIRED, { mode })]);
  const hybrid = ctx.population.hybrid ? readHrParam(input.ruleset, 'hybrid_race.h2.hybridPlanning', mode) : undefined;
  if (hybrid && !(hybrid.ok && hybrid.value)) return fail([hrReasons.emit(HR_CODES.HYBRID_PLANNER_UNAVAILABLE, { cause: hybrid.ok ? 'POLICY_DISALLOWS' : 'GLOBAL_PLANNER_REQUIRED' }), ...hybrid.reasons]);
  if (ctx.returnState.state !== 'NONE') return fail([hrReasons.emit(HR_CODES.RETURN_NOT_SUPPORTED, { returnState: ctx.returnState.state })]);
  // Suspension de la haute intensité (douleur, G1) : aucun classement d'intensité HYROX gouverné ⇒ toute séance
  // HYROX composée est traitée comme potentiellement intense (prudence).
  if (input.constraints.suspendHighIntensity) return fail([hrReasons.emit(HR_CODES.H2_ROLE_UNAVAILABLE, { role, cause: 'HIGH_INTENSITY_SUSPENDED' })]);
  const common = readMany(input, COMMON);
  if (!common.ok) return fail(common.reasons);
  const P: Common = common.values;
  const used: Used[] = [...(hybrid?.ok ? [{ id: 'hybrid_race.h2.hybridPlanning', version: hybrid.version }] : []), ...common.used];
  const trace: ReasonCode[] = [...(hybrid?.reasons ?? []), ...common.reasons];
  if (!P['hybrid_race.h2.eligibleLevels'].includes(level)) return fail([hrReasons.emit(HR_CODES.LEVEL_NOT_ELIGIBLE, { level })]);

  // ——— 1. INTENTION (rôle demandé par le programme ; objectif transporté, temps cible non interprété) ———
  const order = ctx.sportPriority?.order ?? [];
  if (!P['hybrid_race.h2.roles'].includes(role)) return fail([hrReasons.emit(HR_CODES.H2_ROLE_UNAVAILABLE, { role, cause: 'ROLE_UNDECIDED' })]);
  trace.push(hrReasons.emit(HR_CODES.H2_INTENT, { role, specificity: spec.specificity, level, availableTimeS: input.intent.availableTimeS, sportPriority: [...order], rank: order.indexOf('hybrid_race') + 1, neighbours: ctx.neighbours?.items.length ?? 0 }));
  trace.push(hrReasons.emit(HR_CODES.H2_GOAL_TRANSPORTED, { goal: ctx.goal?.type ?? 'unknown', targetTime: ctx.goal?.targetTimeS === undefined ? 'absent' : `${String(ctx.goal.targetTimeS)}s`, interpretation: HR_H2_TARGET_TIME }));

  // ——— 2. RÔLES DE BLOCS (structure de séance) ———
  const sessionStructure = P['hybrid_race.h2.sessionStructure'][role];
  if (!sessionStructure) return fail([hrReasons.emit(HR_CODES.H2_STRUCTURE_UNAVAILABLE, { role, kind: 'session', cause: 'SESSION_STRUCTURE_UNDECIDED' })]);
  trace.push(hrReasons.emit(HR_CODES.H2_SESSION_STRUCTURE, { role, blocks: [...sessionStructure] }));
  for (const kind of sessionStructure) {
    if (kind === 'strength') return fail([hrReasons.emit(HR_CODES.H2_STRUCTURE_UNAVAILABLE, { role, kind, cause: 'STRENGTH_ENGINE_DELEGATION_UNAVAILABLE' })]);
    if (kind === 'running') return fail([hrReasons.emit(HR_CODES.H2_STRUCTURE_UNAVAILABLE, { role, kind, cause: 'RUNNING_ENGINE_DELEGATION_UNAVAILABLE' })]);
    if (kind === 'warmup' || kind === 'cooldown') trace.push(hrReasons.emit(HR_CODES.H2_BLOCK_NOT_GENERATED, { kind, cause: 'ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED' }));
  }
  const mains = sessionStructure.filter((k) => k === 'main').length;
  if (mains !== 1) return fail([hrReasons.emit(HR_CODES.H2_STRUCTURE_UNAVAILABLE, { role, kind: 'main', cause: mains === 0 ? 'NO_MAIN_BLOCK' : 'MULTIPLE_MAIN_BLOCKS_UNGOVERNED' })]);

  // ——— 3. HISTORIQUE (mémoire : variété et retour négatif ; jamais une progression) ———
  const policy = P['hybrid_race.h2.historyPolicy'];
  const windowH = policy.recencyDays * HOURS_PER_DAY;
  const now = input.context.now;
  const within = (at: string): boolean => { const h = hoursBetween(asISODateTime(at), asISODateTime(now)); return h >= 0 && h <= windowH; };
  const realized = (ctx.compositionHistory ?? []).filter((x) => within(x.at));
  // Séances PRÉVUES de la semaine, avant ou après cette date (la variété ne dépend pas de l'ordre de génération).
  const planned = (ctx.plannedSessions ?? []).filter((p) => Math.abs(hoursBetween(asISODateTime(p.at), asISODateTime(now))) <= windowH);
  const exposures: readonly H2Exposure[] = [...realized, ...planned];
  const stationOf = (exerciseId: string): string | undefined => input.catalog.exercise(exerciseId)?.hybridRaceStation;
  const recentStations = new Set(exposures.flatMap((x) => x.exercises.flatMap((e) => { const s = stationOf(e); return s ? [s] : []; })));
  const sameRole = [...exposures].filter((x) => x.role === role).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const last = sameRole[0];
  trace.push(hrReasons.emit(HR_CODES.H2_HISTORY, { sameRole: sameRole.length, planned: planned.length, recentStations: [...recentStations].sort(), lastStructure: last?.structure ?? 'none' }));
  let excludedByHistory: string[] = [];
  const negative = negativeOf([...realized].sort((a, b) => (a.at < b.at ? 1 : -1))[0]);
  if (negative) {
    const action = negative.causes.some((c) => policy[c] === 'refuse') ? 'refuse' : 'exclude_stations';
    const reason = hrReasons.emit(HR_CODES.H2_HISTORY_NEGATIVE, { sessionId: negative.session.sessionId, causes: [...negative.causes], action });
    if (action === 'refuse') return fail([...trace, reason]);
    excludedByHistory = [...new Set(negative.session.exercises.flatMap((e) => { const s = stationOf(e); return s ? [s] : []; }))].sort();
    trace.push(reason);
  }

  // ——— 4. VOISINES ET PRIORITÉ (transport → trace → interprétation gouvernée seulement) ———
  const rawTable = input.ruleset.parameter('demand.derivationTable')?.value;
  const table: DerivationTable | undefined = isDerivationTable(rawTable) ? rawTable : undefined;
  let avoided = new Set<string>();
  const neighbours = ctx.neighbours?.items ?? [];
  let neighbourPolicy = 'none';
  if (neighbours.length > 0) {
    const pol = readHrParam(input.ruleset, 'hybrid_race.h2.neighbourPolicy', mode);
    if (pol.ok) {
      if (!table) return fail([hrReasons.emit(HR_CODES.H2_PARAMETER_UNREADABLE, { parameterId: 'demand.derivationTable', detail: 'structures des stations non dérivables : voisines non interprétables' })]);
      avoided = new Set(neighbours.flatMap((n) => Object.entries(n.demand).filter(([, l]) => pol.value.avoidNeighbourLevels.includes(l)).map(([s]) => s)));
      neighbourPolicy = 'hybrid_race.h2.neighbourPolicy';
      used.push({ id: 'hybrid_race.h2.neighbourPolicy', version: pol.version });
      trace.push(...pol.reasons);
    } else neighbourPolicy = 'blocked:hybrid_race.h2.neighbourPolicy';
  }
  trace.push(hrReasons.emit(HR_CODES.H2_NEIGHBOURS, { known: ctx.neighbours === undefined ? 'absent' : String(ctx.neighbours.known), neighbours: neighbours.map((n) => `${n.discipline}@${String(n.hoursFromThisSession)}h`), policy: neighbourPolicy, priorityPolicy: HR_H2_PRIORITY_POLICY }));

  // ——— 5. STRUCTURE (admise pour le rôle ; variété = la MOINS récemment utilisée, égalité ⇒ ordre gouverné) ———
  const admitted = P['hybrid_race.h2.roleStructures'][role];
  if (!admitted) return fail([...trace, hrReasons.emit(HR_CODES.H2_NO_STRUCTURE, { role, tried: ['STRUCTURES_UNDECIDED'] })]);
  const lastUse = (s: HrStructure): string => sameRole.find((x) => x.structure === s)?.at ?? '';
  const ordered = admitted.map((s, i) => ({ s, i, at: lastUse(s) })).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.i - b.i)).map((x) => x.s);
  const env: Env = { input, P, role, level, recentStations, excludedByHistory, avoided, table, used };
  const rejected: { structure: string; causes: string[] }[] = [];
  const rejectedReasons: ReasonCode[] = [];
  for (const structure of ordered) {
    const attempt = composeStructure(env, structure);
    if (!attempt.ok) {
      rejected.push({ structure, causes: [...attempt.causes] });
      rejectedReasons.push(...attempt.trace, hrReasons.emit(HR_CODES.H2_STRUCTURE_REJECTED, { structure, causes: [...attempt.causes] }));
      continue;
    }
    const criteria = ['admitted_for_role', structure === last?.structure ? 'same_as_last_only_option_left' : lastUse(structure) ? 'least_recently_used_structure' : last ? 'not_used_in_window' : 'governed_order'];
    if (rejected.length > 0) criteria.push(`after_rejected:${rejected.map((r) => r.structure).join('|')}`);
    const identicalToLast = last ? identity(last, structure, attempt.plan.items) : [];
    const plan: H2Plan = { ...attempt.plan, sessionStructure, rejectedStructures: rejected, excludedByHistory, avoidedStructures: [...avoided].sort(), identicalToLast };
    const reasons = [
      ...trace, ...rejectedReasons,
      hrReasons.emit(HR_CODES.H2_STRUCTURE_CHOSEN, { structure, criteria }),
      ...attempt.trace,
      ...(identicalToLast.length === IDENTITY_LEVELS.length ? [hrReasons.emit(HR_CODES.H2_REPEAT_UNAVOIDABLE, { identicalLevels: [...identicalToLast] })] : []),
      hrReasons.emit(HR_CODES.H2_PROPOSED, { role, structure, stations: [...plan.stations] }),
    ];
    const unique = [...new Map(reasons.map((r) => [JSON.stringify([r.code, r.params]), r])).values()];
    const usedUnique = [...new Map([...used, ...attempt.used].map((u) => [u.id, u])).values()];
    return { ok: true, plan, proposal: proposalOf(input, plan, P['hybrid_race.h2.toleranceProfile'], engine, usedUnique, unique) };
  }
  return fail([...trace, ...rejectedReasons, hrReasons.emit(HR_CODES.H2_NO_STRUCTURE, { role, tried: rejected.map((r) => `${r.structure}:${r.causes.join('+')}`) })]);
}

// ——— Historique négatif (statuts DÉCLARÉS, aucun seuil) ———

type NegativeCause = 'abandoned' | 'poorly_tolerated' | 'pain';
function negativeOf(s: H2Realized | undefined): { readonly session: H2Realized; readonly causes: readonly NegativeCause[] } | undefined {
  if (!s) return undefined;
  const causes: NegativeCause[] = [];
  if (s.completion === 'abandoned') causes.push('abandoned');
  if (s.tolerance === 'poorly_tolerated') causes.push('poorly_tolerated');
  if (s.pain !== undefined && s.pain !== 'NONE') causes.push('pain');
  return causes.length > 0 ? { session: s, causes } : undefined;
}

// ——— Composition d'une structure ———

interface Env {
  readonly input: Input;
  readonly P: Common;
  readonly role: HrRole;
  readonly level: HyroxContext['population']['level'];
  readonly recentStations: ReadonlySet<string>;
  readonly excludedByHistory: readonly string[];
  readonly avoided: ReadonlySet<string>;
  readonly table: DerivationTable | undefined;
  readonly used: readonly Used[];
}
type PlanCore = Omit<H2Plan, 'sessionStructure' | 'rejectedStructures' | 'excludedByHistory' | 'avoidedStructures' | 'identicalToLast'>;
type Attempt = { readonly ok: true; readonly plan: PlanCore; readonly trace: readonly ReasonCode[]; readonly used: readonly Used[] } | { readonly ok: false; readonly causes: readonly string[]; readonly trace: readonly ReasonCode[] };

interface Candidate {
  readonly stationId: string;
  readonly e: Exercise;
  readonly dose: H2StationDose | undefined;
  readonly issues: readonly string[];
  /** Technicité au-dessus du plafond SOUS FATIGUE : admise seulement en tout premier item d'un passage unique. */
  readonly technical: boolean;
  readonly recent: boolean;
  readonly conflicts: number;
}

type Rate = { readonly fast: number; readonly typical: number; readonly slow: number };
const rateOf = (rates: H2WorkRates, exerciseId: string, dose: H2StationDose['dose'], level: string): Rate | undefined => {
  if (dose.kind === 'duration_s') return undefined;
  const r = rates[exerciseId];
  return r && r.unit === dose.kind ? (r.rate as Partial<Record<string, Rate>>)[level] : undefined;
};
/** Temps d'un item (quantité / débit gouverné ; une durée prescrite est son propre temps). Jamais les débits du catalogue. */
function itemTime(it: Pick<H2Item, 'exerciseId' | 'dose'>, rates: H2WorkRates, level: string): Rate | undefined {
  if (it.dose.kind === 'duration_s') return { fast: it.dose.value, typical: it.dose.value, slow: it.dose.value };
  const r = rateOf(rates, it.exerciseId, it.dose, level);
  return r ? { fast: (it.dose.value / r.fast) * SECONDS_PER_MINUTE, typical: (it.dose.value / r.typical) * SECONDS_PER_MINUTE, slow: (it.dose.value / r.slow) * SECONDS_PER_MINUTE } : undefined;
}

/** Structures LOCALES (dérivées des muscles / patterns, pas des seuls coûts globaux) d'un mouvement, et la dominante. */
function localStructures(e: Exercise, table: DerivationTable): Record<string, number> {
  const all = deriveExerciseStructures(e, table);
  return Object.fromEntries(Object.entries(all).filter(([s]) => { const src = table.structures[s]; return src !== undefined && (src.muscles !== undefined || src.patterns !== undefined); }));
}
function dominantLocal(e: Exercise, table: DerivationTable): string | undefined {
  return Object.entries(localStructures(e, table)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}

const compareKeys = (a: readonly (number | string)[], b: readonly (number | string)[]): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const x = a[i] as number | string;
    const y = b[i] as number | string;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return a.length - b.length;
};

function composeStructure(env: Env, structure: HrStructure): Attempt {
  const { input, P, role, level } = env;
  const mode = input.discipline.mode;
  const sspec = HR_STRUCTURE_SPECS[structure];
  const rspec = HR_ROLE_SPECS[role];
  const trace: ReasonCode[] = [];
  const used: Used[] = [];
  if (!structureFitsRole(role, structure)) return { ok: false, causes: ['STRUCTURE_INCOMPATIBLE_WITH_ROLE'], trace };
  const volumes = P['hybrid_race.h2.structureVolume'][structure]?.[level];
  if (!volumes) return { ok: false, causes: [`VOLUME_UNDECIDED:${level}`], trace };
  const rates = P['hybrid_race.h2.workRates'];
  const maxTech = P['hybrid_race.h2.technicalUnderFatigue'].maxTechnicalCost[level];
  if (maxTech === undefined) return { ok: false, causes: [`TECHNICALITY_UNDECIDED:${level}`], trace };

  // Ordre d'épreuve (simulation partielle seulement) : donnée officielle GOUVERNÉE, jamais reconstituée de mémoire.
  let sequence: readonly string[] | undefined;
  if (structure === 'partial_sequence') {
    const seq = readHrParam(input.ruleset, 'hybrid_race.h2.raceSequence', mode);
    if (!seq.ok) return { ok: false, causes: ['RACE_SEQUENCE_UNGOVERNED'], trace: [...seq.reasons] };
    sequence = seq.value;
    used.push({ id: 'hybrid_race.h2.raceSequence', version: seq.version });
    trace.push(...seq.reasons);
  }

  // Composante COURSE : mouvement et distance gouvernés, aucune allure.
  let run: { readonly exerciseId: string; readonly distanceM: number } | undefined;
  if (sspec.running) {
    const ex = readHrParam(input.ruleset, 'hybrid_race.h2.runExercise', mode);
    const seg = readHrParam(input.ruleset, 'hybrid_race.h2.runSegment', mode);
    if (!ex.ok || !seg.ok) return { ok: false, causes: ['RUN_COMPONENT_UNGOVERNED'], trace: [...(ex.ok ? [] : ex.reasons), ...(seg.ok ? [] : seg.reasons)] };
    used.push({ id: 'hybrid_race.h2.runExercise', version: ex.version }, { id: 'hybrid_race.h2.runSegment', version: seg.version });
    trace.push(...ex.reasons, ...seg.reasons);
    const distance = seg.value[level]?.distanceM;
    if (distance === undefined) return { ok: false, causes: [`RUN_SEGMENT_UNDECIDED:${level}`], trace };
    const e = input.catalog.exercise(ex.value);
    const issues = movementIssues(undefined, ex.value, e, input);
    if (e && !e.measurableMetrics.includes('distance')) issues.push('DISTANCE_NOT_MEASURABLE');
    if (!rateOf(rates, ex.value, { kind: 'distance_m', value: distance }, level)) issues.push('WORK_RATE_UNGOVERNED');
    if (issues.length > 0) return { ok: false, causes: issues.map((i) => `RUN_COMPONENT:${i}`), trace };
    run = { exerciseId: ex.value, distanceM: distance };
  }

  // Réservoir relu ∩ catalogue ; causes d'inéligibilité par station (aucune substitution, aucune réduction).
  const pool = P['hybrid_race.h2.stationPool'];
  const candidates: Candidate[] = pool.map(({ stationId, exerciseId }) => {
    const e = input.catalog.exercise(exerciseId);
    const issues = movementIssues(stationId, exerciseId, e, input);
    if (!e) return { stationId, e: { id: exerciseId } as Exercise, dose: undefined, issues, technical: false, recent: false, conflicts: 0 };
    if (pool.filter((p) => p.stationId === stationId).length > 1) issues.push('AMBIGUOUS_POOL_ENTRY');
    const dose = P['hybrid_race.h2.stationDoses'][stationId]?.[level];
    const loaded = e.loadable && e.loadModel !== BODYWEIGHT_MODEL;
    if (!dose) issues.push(`DOSE_UNDECIDED:${level}`);
    else {
      if (loaded && dose.loadKg === undefined) issues.push('LOAD_POLICY_UNGOVERNED');
      if (!e.loadable && dose.loadKg !== undefined) issues.push('LOAD_ON_UNLOADED_MOVEMENT');
      if (!e.measurableMetrics.includes(METRIC_OF[dose.dose.kind])) issues.push(`QUANTITY_NOT_MEASURABLE:${dose.dose.kind}`);
      if (dose.dose.kind !== 'duration_s' && !rateOf(rates, exerciseId, dose.dose, level)) issues.push('WORK_RATE_UNGOVERNED');
    }
    if (rspec.stations === 'loaded' && !loaded) issues.push('ROLE_REQUIRES_LOADED_STATION');
    if (env.excludedByHistory.includes(stationId)) issues.push('EXCLUDED_BY_NEGATIVE_HISTORY');
    const structures = env.table ? Object.keys(deriveExerciseStructures(e, env.table)) : [];
    return { stationId, e, dose, issues, technical: e.cost.technical > maxTech, recent: env.recentStations.has(stationId), conflicts: structures.filter((s) => env.avoided.has(s)).length };
  });
  const rejectedHere = candidates.filter((c) => c.issues.length > 0).map((c) => `${c.stationId}:${c.issues.join('+')}`);
  if (rejectedHere.length > 0) trace.push(hrReasons.emit(HR_CODES.H2_CANDIDATES_REJECTED, { structure, rejected: rejectedHere }));
  const eligible = candidates.filter((c) => c.issues.length === 0);

  // Volumes gouvernés dans l'ordre : le premier qui tient (domaine temporel, temps disponible) est retenu.
  const failures: string[] = [];
  for (const volume of volumes) {
    const r = composeVolume(env, structure, volume, eligible, run, sequence);
    if (r.ok) return { ok: true, plan: r.plan, trace: [...trace, ...r.trace], used: [...used, ...r.used] };
    failures.push(...r.causes.map((c) => `${String(volume.rounds)}x${String(volume.stations)}:${c}`));
    // Option de volume écartée : tracée (structure@tours×stations), l'option suivante est essayée.
    trace.push(...r.trace, hrReasons.emit(HR_CODES.H2_STRUCTURE_REJECTED, { structure: `${structure}@${String(volume.rounds)}x${String(volume.stations)}`, causes: [...r.causes] }));
  }
  return { ok: false, causes: [...new Set(failures)], trace };
}

type VolumeAttempt = { readonly ok: true; readonly plan: PlanCore; readonly trace: readonly ReasonCode[]; readonly used: readonly Used[] } | { readonly ok: false; readonly causes: readonly string[]; readonly trace: readonly ReasonCode[] };

function composeVolume(env: Env, structure: HrStructure, volume: H2Volume, eligible: readonly Candidate[], run: { readonly exerciseId: string; readonly distanceM: number } | undefined, sequence: readonly string[] | undefined): VolumeAttempt {
  const { input, P, role, level } = env;
  const sspec = HR_STRUCTURE_SPECS[structure];
  const rspec = HR_ROLE_SPECS[role];
  const trace: ReasonCode[] = [];
  const n = volume.stations;
  if (sspec.stations === 'one' && n !== 1) return { ok: false, causes: ['VOLUME_INCOMPATIBLE_WITH_STRUCTURE'], trace };
  if (sspec.stations === 'many' && n <= 1) return { ok: false, causes: ['VOLUME_INCOMPATIBLE_WITH_STRUCTURE'], trace };
  if (sspec.layout === 'expanded' && volume.rounds !== 1) return { ok: false, causes: ['SINGLE_PASS_STRUCTURE'], trace };
  // Une station technique n'est admise qu'en tout PREMIER item d'un passage unique (fraîche) ; ailleurs elle est
  // exécutée sous fatigue (tours suivants, après une course ou une autre station).
  const freshFirst = volume.rounds === 1 && structure !== 'partial_sequence';
  const technicalOk = (c: Candidate, position: number) => !c.technical || (freshFirst && position === 0);

  let chosen: { c: Candidate; criteria: string[] }[] = [];
  if (sequence) {
    // Segment CONTIGU de l'ordre d'épreuve : fenêtres classées (stations fraîches, conflits voisins, rang dans l'ordre).
    const byStation = new Map(eligible.map((c) => [c.stationId, c]));
    const windows: { start: number; cs: Candidate[] }[] = [];
    const blocked: string[] = [];
    for (let start = 0; start + n <= sequence.length; start += 1) {
      const ids = sequence.slice(start, start + n);
      const cs = ids.map((id) => byStation.get(id));
      const missing = ids.filter((_id, k) => cs[k] === undefined || !technicalOk(cs[k] as Candidate, k));
      if (missing.length > 0) blocked.push(`${String(start)}:${missing.join('|')}`);
      else windows.push({ start, cs: cs as Candidate[] });
    }
    if (blocked.length > 0) trace.push(hrReasons.emit(HR_CODES.H2_CANDIDATES_REJECTED, { structure, rejected: blocked.map((b) => `segment@${b}`) }));
    const key = (w: { start: number; cs: Candidate[] }) => [w.cs.filter((c) => c.recent).length, w.cs.reduce((s, c) => s + c.conflicts, 0), w.start];
    const best = [...windows].sort((a, b) => compareKeys(key(a), key(b)))[0];
    if (!best) return { ok: false, causes: ['NO_ELIGIBLE_RACE_SEGMENT'], trace };
    chosen = best.cs.map((c) => ({ c, criteria: [`race_sequence_segment_start:${String(best.start)}`, `fresh_stations_in_segment:${String(best.cs.filter((x) => !x.recent).length)}/${String(n)}`] }));
  } else {
    for (let position = 0; position < n; position += 1) {
      const rejectedHere: string[] = [];
      const options = eligible.filter((c) => {
        const causes: string[] = [];
        if (chosen.some((x) => x.c.stationId === c.stationId)) causes.push('ALREADY_IN_BLOCK');
        if (!technicalOk(c, position)) causes.push('TECHNICAL_UNDER_FATIGUE');
        if (!rspec.accumulationIntended) causes.push(...incompatibilities(c.e, chosen.map((x) => x.c.e), env.table));
        if (causes.length > 0 && !causes.includes('ALREADY_IN_BLOCK')) rejectedHere.push(`${c.stationId}:${causes.join('+')}`);
        return causes.length === 0;
      });
      if (rejectedHere.length > 0) trace.push(hrReasons.emit(HR_CODES.H2_CANDIDATES_REJECTED, { structure, rejected: rejectedHere.map((x) => `p${String(position + 1)}:${x}`) }));
      const key = (c: Candidate): readonly (number | string)[] => [c.recent ? 1 : 0, c.conflicts, -(c.e.relevance.hybrid_race ?? 0), c.stationId];
      const ranked = [...options].sort((a, b) => compareKeys(key(a), key(b)));
      const best = ranked[0];
      if (!best) return { ok: false, causes: [`STATIONS_UNFILLED:${String(position)}/${String(n)}`], trace };
      const runnerUp = ranked[1];
      chosen.push({
        c: best,
        criteria: [
          best.recent ? 'recently_used_no_fresh_alternative' : 'not_used_recently',
          ...(env.avoided.size > 0 ? [`neighbour_structure_conflicts:${String(best.conflicts)}`] : []),
          `relevance:${String(best.e.relevance.hybrid_race ?? 0)}`,
          ...(runnerUp && compareKeys(key(best).slice(0, -1), key(runnerUp).slice(0, -1)) === 0 ? [`tie_broken_by_id_over:${runnerUp.stationId}`] : []),
        ],
      });
    }
  }
  chosen.forEach(({ c, criteria }, k) => trace.push(hrReasons.emit(HR_CODES.H2_STATION_SELECTED, { structure, position: k + 1, stationId: c.stationId, exerciseId: c.e.id, criteria })));

  // ——— DOSE (unités natives) et séquence d'items ———
  const base = input.intent.id;
  let index = 0;
  // Le préfixe d'item (`s` station, `r` course) rend la séance lisible sans catalogue (présentation, exposition).
  const nextId = (kind: H2Item['kind']) => { index += 1; return `${base}${H2_ITEM_MARK}${H2_ITEM_PREFIX[kind]}${String(index)}`; };
  const stationItem = (c: Candidate): H2Item => {
    const d = c.dose as H2StationDose;
    return { itemId: nextId('station'), kind: 'station', exerciseId: c.e.id, stationId: c.stationId, dose: d.dose, ...(d.loadKg === undefined ? {} : { loadKg: d.loadKg }) };
  };
  const runItem = (context: H2RunContext): H2Item => {
    const r = run as { exerciseId: string; distanceM: number };
    return { itemId: nextId('run'), kind: 'run', exerciseId: r.exerciseId, dose: { kind: 'distance_m', value: r.distanceM }, runContext: context };
  };
  const items: H2Item[] = [];
  if (structure === 'partial_sequence') chosen.forEach(({ c }, k) => { items.push(runItem(k === 0 ? 'fresh' : 'after_station'), stationItem(c)); });
  else if (structure === 'run_station_alternation') chosen.forEach(({ c }) => { items.push(stationItem(c), runItem('after_station')); });
  else chosen.forEach(({ c }) => items.push(stationItem(c)));
  const rounds = sspec.layout === 'repeat' ? volume.rounds : 1;
  for (const it of items.filter((x) => x.kind === 'station')) trace.push(hrReasons.emit(HR_CODES.H2_DOSE, { exerciseId: it.exerciseId, quantity: `${String(it.dose.value)} ${it.dose.kind}`, load: it.loadKg === undefined ? 'none' : `${String(it.loadKg)}kg` }));
  if (run) {
    const contexts = [...new Set(items.flatMap((x) => (x.runContext ? [x.runContext] : [])))];
    trace.push(hrReasons.emit(HR_CODES.H2_RUN_COMPONENT, { exerciseId: run.exerciseId, distanceM: run.distanceM, contexts, pace: HR_H2_RUN_PACE }));
  }

  // ——— Accumulation (compatibilité dépendante de l'intention) ———
  const accumulation = rspec.accumulationIntended && env.table ? sharedLocal(items.map((x) => input.catalog.exercise(x.exerciseId)).filter((e): e is Exercise => e !== undefined), env.table) : [];
  if (rspec.accumulationIntended) trace.push(hrReasons.emit(HR_CODES.H2_ACCUMULATION, { role, sharedStructures: accumulation, status: env.table ? 'INTENDED_BY_ROLE' : 'NOT_EVALUABLE' }));

  // ——— DURÉE : estimée (débits gouvernés), time cap prescrit, transitions INCONNUES ———
  const causes: string[] = [];
  const times = items.map((it) => itemTime(it, P['hybrid_race.h2.workRates'], level));
  if (times.some((t) => t === undefined)) return { ok: false, causes: ['DURATION_NOT_ESTIMABLE'], trace };
  const sum = (k: keyof Rate) => (times as Rate[]).reduce((s, t) => s + t[k], 0) * rounds;
  const estimated = { fastS: sum('fast'), typicalS: sum('typical'), slowS: sum('slow') };
  const timeCapS = Math.ceil(estimated.slowS * (1 + P['hybrid_race.h2.timeCapMargin']));
  const transitions = { count: items.length * rounds - 1, durationS: null };
  trace.push(hrReasons.emit(HR_CODES.H2_TRANSITIONS, { count: transitions.count, durationS: 'unknown', estimate: 'excluded' }));
  trace.push(hrReasons.emit(HR_CODES.H2_DURATION, { structure, timeCapS, estimatedTypicalS: Math.round(estimated.typicalS), estimatedSlowS: Math.round(estimated.slowS), kind: 'time_cap_prescribed_duration_estimated' }));
  const domain = P['hybrid_race.h2.timeDomains'][role];
  if (!domain) causes.push('TIME_DOMAIN_UNDECIDED');
  else if (estimated.typicalS < domain.minS || estimated.typicalS > domain.maxS) causes.push('OUTSIDE_TIME_DOMAIN');
  let marginS: number | undefined;
  try { marginS = readToleranceProfile(input.ruleset, P['hybrid_race.h2.toleranceProfile']).marginS; } catch { marginS = undefined; }
  if (marginS === undefined) causes.push('TOLERANCE_PROFILE_UNAVAILABLE');
  else if (timeCapS > input.intent.availableTimeS - marginS) causes.push('EXCEEDS_AVAILABLE_TIME');
  if (causes.length > 0) return { ok: false, causes, trace };

  const stations = chosen.map((x) => x.c.stationId);
  return {
    ok: true,
    plan: {
      role, level, structure, volume, rounds, items, stations, selection: chosen.map((x) => ({ stationId: x.c.stationId, exerciseId: x.c.e.id, criteria: x.criteria })),
      timeCapS, estimated, transitions, accumulation,
    },
    trace,
    used: [],
  };
}

/** Compatibilité QUALITATIVE (rôles SPECIFIC, accumulation non voulue) : redondance et structure locale dominante. */
function incompatibilities(e: Exercise, chosen: readonly Exercise[], table: DerivationTable | undefined): string[] {
  if (chosen.length === 0) return [];
  const out: string[] = [];
  if (chosen.some((x) => x.family === e.family || x.equivalenceClass === e.equivalenceClass)) out.push('REDUNDANT_FAMILY');
  if (chosen.some((x) => x.patterns.primary === e.patterns.primary)) out.push('REDUNDANT_PATTERN');
  if (!table) out.push('COMPATIBILITY_NOT_EVALUABLE');
  else {
    const d = dominantLocal(e, table);
    if (d !== undefined && chosen.some((x) => dominantLocal(x, table) === d)) out.push(`SHARED_DOMINANT_LOCAL_STRUCTURE:${d}`);
  }
  return out;
}

/** Structures locales sollicitées par plusieurs composantes (accumulation VOULUE des rôles RACE_SPECIFIC, tracée). */
function sharedLocal(es: readonly Exercise[], table: DerivationTable): string[] {
  const count = new Map<string, Set<string>>();
  for (const e of es) for (const s of Object.keys(localStructures(e, table))) count.set(s, (count.get(s) ?? new Set()).add(e.id));
  return [...count.entries()].filter(([, ids]) => ids.size > 1).map(([s]) => s).sort();
}

/** Empreinte multi-niveaux contre la dernière séance du même rôle : ÉGALITÉ exacte par niveau, aucun seuil. */
export const IDENTITY_LEVELS = ['structure', 'components', 'order'] as const;
function identity(last: H2Exposure, structure: HrStructure, items: readonly H2Item[]): string[] {
  const out: string[] = [];
  if (last.structure !== structure) return out;
  out.push('structure');
  const nowEx = items.map((i) => i.exerciseId);
  if ([...new Set(last.exercises)].sort().join('|') !== [...new Set(nowEx)].sort().join('|')) return out;
  out.push('components');
  if (last.exercises.join('|') === nowEx.join('|')) out.push('order');
  return out;
}

// ——— PRESCRIPTION (séance CORE + empreinte) ———

function prescriptionOf(it: H2Item): SessionDraftInput['blocks'][number]['items'][number]['prescription'] {
  const load = it.loadKg === undefined ? {} : { load: { kg: it.loadKg, certainty: 'prescribed' as const } };
  switch (it.dose.kind) {
    case 'distance_m': return { type: 'distance', distanceM: it.dose.value, ...load };
    case 'reps': return { type: 'reps', reps: it.dose.value, ...load };
    case 'calories': return { type: 'calories', calories: it.dose.value, ...load };
    case 'duration_s': return { type: 'timed', workS: it.dose.value, rounds: 1, restS: 0, ...load };
  }
}

/** Identifiant de bloc : porte la STRUCTURE (relue par `h2ExposureOf`, sans catalogue ni connaissance des stations). */
export const H2_BLOCK_MARK = '.h2.';
export const H2_ITEM_MARK = '.h2.';
export const H2_ITEM_PREFIX: Readonly<Record<H2Item['kind'], string>> = { station: 's', run: 'r' };
export const h2BlockId = (base: string, structure: HrStructure): string => `${base}${H2_BLOCK_MARK}${structure}`;

function proposalOf(input: Input, plan: H2Plan, toleranceProfile: string, engine: { readonly id: string; readonly version: string }, used: readonly Used[], reasons: readonly ReasonCode[]): SportEngineProposalInput {
  const base = input.intent.id;
  const items = plan.items.map((it) => ({ id: it.itemId, exerciseId: it.exerciseId, prescription: prescriptionOf(it) }));
  const session: SessionDraftInput = {
    id: `${base}.hr`, discipline: 'hybrid_race', athleteLevel: input.profile.athleteLevel,
    availableTimeS: input.intent.availableTimeS, targetDurationS: input.intent.targetDurationS, toleranceProfile,
    blocks: [{ id: h2BlockId(base, plan.structure), kind: 'hybrid_station_work', role: 'primary', format: 'for_time', rounds: plan.rounds, timeCapS: plan.timeCapS, items }],
  };
  return {
    proposalId: `proposal.${base}.h2`, discipline: 'hybrid_race', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
    stimulus: input.intent.stimulus, objective: input.intent.objective, session,
    optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
    // Empreinte : rôle, structure, stations dans l'ordre, doses, course ; jamais le résultat.
    fingerprintInputs: {
      archetypeId: input.intent.archetypeId, stimulus: plan.role, energy: NOT_APPLICABLE, format: plan.structure, repScheme: plan.stations.join('>'),
      volumeByItem: Object.fromEntries(plan.items.map((it) => [it.itemId, it.dose.value * plan.rounds])),
      prescriptionMarkers: {
        'h2.rounds': plan.rounds, 'h2.items': plan.items.length, 'h2.timeCapS': plan.timeCapS,
        'h2.runSegments': plan.items.filter((i) => i.kind === 'run').length * plan.rounds,
        ...Object.fromEntries(plan.items.filter((i) => i.loadKg !== undefined).map((i) => [`h2.${i.stationId ?? i.exerciseId}.loadKg`, i.loadKg as number])),
      },
    },
    repetitionIntents: [],
    reasons: reasons.map((r) => ({
      ...r,
      params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
      ruleRefs: [...r.ruleRefs],
    })),
    provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    parametersUsed: used.map((u) => ({ id: u.id, version: u.version })),
  };
}
