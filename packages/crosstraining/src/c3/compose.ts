/**
 * C3 — MOTEUR DE COMPOSITION d'une séance Cross-training.
 *
 *   INTENTION → STRUCTURE → FORMAT → RÔLES → SÉLECTION → DOSE → VALIDATION → PRESCRIPTION
 *
 * - Aucun hasard : chaque choix est un CLASSEMENT déterministe et tracé (critères explicites, départage final par
 *   identifiant). Aucune valeur sportive ici : structures, formats, rôles, doses, débits, plafonds, densités et
 *   politiques viennent de la gouvernance (fail-closed : non résolu ou illisible ⇒ refus, ou format écarté).
 * - Chaque mouvement a une RAISON (rôle + critères) ; chaque format écarté a ses causes.
 * - Un seul bloc GÉNÉRÉ : le conditioning. Échauffement : place architecturale tracée, jamais compté ni généré. Bloc
 *   force ou compétence demandé par la structure ⇒ refus (Strength n'est pas construit ici).
 * - Les voisines (autres disciplines) et la priorité sont TRANSPORTÉES ; les voisines ne sont interprétées que si
 *   `ct.hybrid.policy` est gouvernée ; la priorité n'a AUCUNE politique (identique quel que soit le rang).
 */
import { NOT_APPLICABLE, asISODateTime, hoursBetween } from '@hybridsport/domain';
import type { Exercise, ReasonCode, SessionDraftInput, SportEngineProposalInput } from '@hybridsport/domain';
import { deriveExerciseStructures, isDerivationTable, readToleranceProfile } from '@hybridsport/engine';
import type { DerivationTable, SportEngineInput } from '@hybridsport/engine';
import type { CtFormat, CtStimulus } from '../model.js';
import { CT_CODES, ctReasons } from '../codes.js';
import type { CrossTrainingContext, RealizedCtSession } from '../context.js';
import { capabilityState, foundationState } from '../capabilities.js';
import { latestRealized, movementIssues } from '../c2.js';
import type { CtGovernance } from '../governance/state.js';
import { SECONDS_PER_MINUTE, readAll, readC3 } from './parameters.js';
import type { C3Value, RoleQuantity, WorkRates } from './parameters.js';
import { C3_FORMATS, formatGenerability } from './formats.js';
import { C3_OUT_OF_SCOPE, TECHNICAL_MOVEMENT_TYPES, movementRoles } from './taxonomy.js';
import type { CtMovementRole, CtSessionBlockKind } from './taxonomy.js';

// technical-constant: conversion jours → heures (calendrier)
const HOURS_PER_DAY = 24;
/** Classe de transition « machine » du catalogue (ergomètres) : deux machines dans un même bloc = transition absurde. */
const MACHINE_TRANSITION = 'machine';
/** Seul modèle de charge sans charge externe. */
const BODYWEIGHT_MODEL = 'bodyweight_plus';
export const CT_C3_PRIORITY_POLICY = 'blocked:priority_interference_policy';
/** Profils de tolérance de durée du ruleset CORE (identifiants) : format à durée prescrite / estimée. */
const TOLERANCE_PROFILE = { prescribed: 'fixed_time', estimated: 'for_time' } as const;

export interface C3Item {
  readonly itemId: string;
  readonly role: CtMovementRole;
  readonly exerciseId: string;
  readonly quantity?: RoleQuantity;
  readonly timed?: { readonly workS: number; readonly rounds: number; readonly restS: number };
  readonly loadKg?: number;
  /** Raisons du choix (classement), dans l'ordre des critères. */
  readonly criteria: readonly string[];
}

export interface C3Plan {
  readonly stimulus: CtStimulus;
  readonly level: string;
  readonly structure: readonly CtSessionBlockKind[];
  readonly format: CtFormat;
  readonly durationKind: 'prescribed' | 'estimated';
  /** Durée PRESCRITE du bloc (format à priorité temps) ou time cap (for time). */
  readonly blockS: number;
  /** Durée ESTIMÉE du BLOC (for time seulement), à partir des débits gouvernés. */
  readonly estimated?: { readonly typicalS: number; readonly slowS: number };
  /** Durée estimée d'UN tour (AMRAP, for time) ou du travail d'UNE minute (EMOM) : information, jamais une durée de bloc. */
  readonly roundEstimate?: { readonly fastS: number; readonly typicalS: number; readonly slowS: number };
  readonly rounds?: number;
  readonly density: { readonly kind: 'exact' | 'estimated' | 'self_paced'; readonly detail: string };
  readonly items: readonly C3Item[];
  readonly rejectedFormats: readonly { readonly format: string; readonly causes: readonly string[] }[];
  readonly excludedByHistory: readonly string[];
  readonly avoidedStructures: readonly string[];
  readonly identicalToLast: readonly string[];
}

export type C3Outcome =
  | { readonly ok: true; readonly plan: C3Plan; readonly proposal: SportEngineProposalInput }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

type Input = SportEngineInput<CrossTrainingContext>;
const fail = (reasons: readonly ReasonCode[]): C3Outcome => ({ ok: false, reasons });

/** Paramètres communs (capacité `ctSessionComposition`), lus avec leur forme. */
const COMMON = [
  'ct.stimulus.catalog', 'ct.stimulus.admissibleFormats', 'ct.stimulus.timeDomains', 'ct.composition.sessionStructure', 'ct.composition.movementPool',
  'ct.composition.movementRoles', 'ct.dose.construction', 'ct.safety.technicalUnderFatigue', 'ct.history.recencyBand', 'ct.history.negativeResponse',
  'ct.safety.novicePolicy',
] as const;
type Common = { [K in (typeof COMMON)[number]]: C3Value<K> };

interface Candidate {
  readonly e: Exercise;
  readonly roles: readonly CtMovementRole[];
  readonly issues: readonly string[];
  readonly recent: boolean;
  readonly conflicts: number;
}

/** Point d'entrée : refus tracé, ou plan + proposition (jamais validée ici : le CORE reste l'autorité). */
export function composeC3(input: Input, stimulus: CtStimulus, governance: CtGovernance, simulation: boolean, engine: { readonly id: string; readonly version: string }): C3Outcome {
  const ctx = input.discipline;
  const mode = ctx.mode;
  const requested = new Set<string>(ctx.capabilityRequests);
  const level = ctx.population.level;

  // ——— Garde-fous (même ordre que C2) ———
  const hybrid = ctx.population.hybrid ? capabilityState('ctHybridPlanning', governance, mode, requested.has('ctHybridPlanning')) : undefined;
  if (hybrid && !hybrid.enabled) return fail([ctReasons.emit(CT_CODES.HYBRID_PLANNER_UNAVAILABLE, { cause: 'GLOBAL_PLANNER_REQUIRED' }), ...hybrid.reasons]);
  if (mode === 'CANDIDATE' && !simulation) return fail([ctReasons.emit(CT_CODES.SIMULATION_REQUIRED, { mode })]);
  const foundation = foundationState(governance, mode);
  if (!foundation.enabled) return fail(foundation.reasons);
  if (ctx.returnState.state !== 'NONE') return fail([ctReasons.emit(CT_CODES.RETURN_NOT_SUPPORTED, { returnState: ctx.returnState.state })]);
  // Suspension de la haute intensité (douleur, G1) : le classement « haute intensité » des stimuli n'est pas gouverné
  // (`ct.hi.classification`) ⇒ tout stimulus Cross-training est traité comme potentiellement intense (prudence).
  if (input.constraints.suspendHighIntensity) return fail([ctReasons.emit(CT_CODES.C3_STIMULUS_OUT_OF_SCOPE, { stimulus, cause: 'HIGH_INTENSITY_SUSPENDED' })]);
  const cap = capabilityState('ctSessionComposition', governance, mode, requested.has('ctSessionComposition'));
  if (!cap.enabled) return fail(cap.reasons);
  const common = readAll(governance, COMMON, mode);
  if (!common.ok) return fail(common.reasons);
  const P: Common = common.values;
  const trace: ReasonCode[] = [...foundation.reasons, ...(hybrid?.reasons ?? []), ...cap.reasons];

  // ——— 1. INTENTION ———
  const order = ctx.sportPriority?.order ?? [];
  trace.push(ctReasons.emit(CT_CODES.C3_INTENT, { stimulus, level, availableTimeS: input.intent.availableTimeS, sportPriority: [...order], rank: order.indexOf('crosstraining') + 1, neighbours: ctx.neighbours?.items.length ?? 0 }));
  const outOfScope = C3_OUT_OF_SCOPE[stimulus];
  if (outOfScope) return fail([ctReasons.emit(CT_CODES.C3_STIMULUS_OUT_OF_SCOPE, { stimulus, cause: outOfScope })]);
  if (!P['ct.stimulus.catalog'].includes(stimulus)) return fail([ctReasons.emit(CT_CODES.C3_STIMULUS_OUT_OF_SCOPE, { stimulus, cause: 'STIMULUS_UNDECIDED' })]);
  if (P['ct.safety.novicePolicy'].excludedStimuli[level]?.includes(stimulus)) return fail([ctReasons.emit(CT_CODES.C3_STIMULUS_OUT_OF_SCOPE, { stimulus, cause: 'EXCLUDED_FOR_LEVEL' })]);

  // ——— 2. STRUCTURE ———
  const structure = P['ct.composition.sessionStructure'][stimulus];
  if (!structure) return fail([ctReasons.emit(CT_CODES.C3_STRUCTURE_UNAVAILABLE, { stimulus, kind: 'session', cause: 'STRUCTURE_UNDECIDED' })]);
  trace.push(ctReasons.emit(CT_CODES.C3_STRUCTURE, { stimulus, blocks: [...structure] }));
  for (const kind of structure) {
    if (kind === 'strength') return fail([ctReasons.emit(CT_CODES.C3_STRUCTURE_UNAVAILABLE, { stimulus, kind, cause: 'STRENGTH_ENGINE_DELEGATION_UNAVAILABLE' })]);
    if (kind === 'skill') return fail([ctReasons.emit(CT_CODES.C3_STRUCTURE_UNAVAILABLE, { stimulus, kind, cause: 'SKILL_ACQUISITION_UNMODELLED' })]);
    if (kind === 'warmup' || kind === 'cooldown') trace.push(ctReasons.emit(CT_CODES.C3_BLOCK_NOT_GENERATED, { kind, cause: 'ARCHITECTURAL_PLACE_ONLY_CONTENT_UNGOVERNED' }));
  }
  const conditioning = structure.filter((k) => k === 'conditioning').length;
  if (conditioning !== 1) return fail([ctReasons.emit(CT_CODES.C3_STRUCTURE_UNAVAILABLE, { stimulus, kind: 'conditioning', cause: conditioning === 0 ? 'NO_CONDITIONING_BLOCK' : 'MULTIPLE_CONDITIONING_BLOCKS_UNGOVERNED' })]);

  // ——— 3. HISTORIQUE (mémoire, jamais « refaire la dernière séance ») ———
  const now = input.context.now;
  const windowH = P['ct.history.recencyBand'] * HOURS_PER_DAY;
  const within = (at: string): boolean => { const h = hoursBetween(asISODateTime(at), asISODateTime(now)); return h >= 0 && h <= windowH; };
  // Expositions de la fenêtre : séances RÉALISÉES + séances PRÉVUES plus tôt dans la semaine (variété seulement).
  // Séances prévues de la semaine, AVANT ou APRÈS cette date (la variété ne dépend pas de l'ordre de génération).
  const planned = (ctx.plannedSessions ?? []).filter((p) => Math.abs(hoursBetween(asISODateTime(p.plannedAt), asISODateTime(now))) <= windowH).map((p) => ({ completedAt: p.plannedAt, stimulus: p.stimulus, prescription: p.prescription }));
  const inWindow: readonly Exposure[] = [...ctx.sessionHistory.filter((s) => within(s.completedAt)), ...planned];
  const sameStimulus = [...inWindow].filter((s) => s.stimulus === stimulus).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
  const recentMovements = new Set(inWindow.flatMap((s) => s.prescription.items.map((i) => i.exerciseId)));
  const last = sameStimulus[0];
  trace.push(ctReasons.emit(CT_CODES.C3_HISTORY, { sameStimulus: sameStimulus.length, planned: planned.length, recentMovements: [...recentMovements].sort(), lastFormat: last?.prescription.format ?? 'none' }));
  // Retour négatif : dernière séance RÉALISÉE de la fenêtre de récence seulement (au-delà, plus aucun effet : sinon un
  // abandon rendant toute composition impossible bloquerait le sport indéfiniment — aucune séance ne le remplacerait).
  const negative = negativeOf(latestRealized(ctx.sessionHistory.filter((x) => within(x.completedAt))));
  let excludedByHistory: string[] = [];
  if (negative) {
    const actions = negative.causes.map((c) => P['ct.history.negativeResponse'][c]);
    const action = actions.includes('refuse') ? 'refuse' : 'exclude_movements';
    const reason = ctReasons.emit(CT_CODES.C3_HISTORY_NEGATIVE, { sessionId: negative.session.sessionId, causes: [...negative.causes], action });
    if (action === 'refuse') return fail([reason]);
    excludedByHistory = negative.session.prescription.items.map((i) => i.exerciseId);
    trace.push(reason);
  }

  // ——— 4. VOISINES ET PRIORITÉ (transport → trace → interprétation gouvernée seulement) ———
  let avoided = new Set<string>();
  let table: DerivationTable | undefined;
  const neighbours = ctx.neighbours?.items ?? [];
  let policy = 'none';
  if (neighbours.length > 0) {
    const pol = readC3(governance, 'ct.hybrid.policy', mode);
    if (pol.ok) {
      const raw = input.ruleset.parameter('demand.derivationTable')?.value;
      if (!isDerivationTable(raw)) return fail([ctReasons.emit(CT_CODES.C3_PARAMETER_UNREADABLE, { parameterId: 'demand.derivationTable', detail: 'structures des mouvements non dérivables : voisines non interprétables' })]);
      table = raw;
      avoided = new Set(neighbours.flatMap((n) => Object.entries(n.demand).filter(([, l]) => pol.value.avoidNeighbourLevels.includes(l)).map(([s]) => s)));
      policy = 'ct.hybrid.policy';
      trace.push(...pol.reasons);
    } else policy = 'blocked:ct.hybrid.policy';
  }
  trace.push(ctReasons.emit(CT_CODES.C3_NEIGHBOURS, { known: ctx.neighbours === undefined ? 'absent' : String(ctx.neighbours.known), neighbours: neighbours.map((n) => `${n.discipline}@${String(n.hoursFromThisSession)}h`), policy, priorityPolicy: CT_C3_PRIORITY_POLICY }));

  // ——— 5. FORMAT (admissible ∩ générable ; variété = format différent du dernier du même stimulus) ———
  const admissible = P['ct.stimulus.admissibleFormats'][stimulus];
  if (!admissible || admissible.length === 0) return fail([ctReasons.emit(CT_CODES.C3_NO_FORMAT, { stimulus, tried: ['FORMATS_UNDECIDED'] })]);
  const lastFormat = last?.prescription.format;
  // Variété ≠ hasard : le format le MOINS récemment utilisé (même stimulus, fenêtre de récence) d'abord ; jamais utilisé
  // en tête ; égalité ⇒ ordre gouverné.
  const lastUse = (f: CtFormat): string => sameStimulus.find((x) => x.prescription.format === f)?.completedAt ?? '';
  const ordered = admissible.map((f, i) => ({ f, i, at: lastUse(f) })).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.i - b.i)).map((x) => x.f);
  const rejected: { format: string; causes: string[] }[] = [];
  const rejectedReasons: ReasonCode[] = [];
  const env: Env = { input, governance, P, level, stimulus, recentMovements, excludedByHistory, avoided, table, last };
  for (const format of ordered) {
    const gen = formatGenerability(format, governance, mode);
    // Réessai DÉTERMINISTE : un mouvement responsable d'un plafond ou de la densité est écarté (tracé), puis le format
    // est recomposé avec le candidat suivant du classement. Le réservoir est fini : la boucle termine.
    const banned = new Map<string, string>();
    let attempt: Attempt = gen.generable ? composeFormat(env, format, banned) : { ok: false, causes: [...gen.causes], trace: [] };
    while (!attempt.ok && attempt.culprits && attempt.culprits.length > 0 && attempt.culprits.some((c) => !banned.has(c.id))) {
      for (const c of attempt.culprits) banned.set(c.id, c.cause);
      attempt = composeFormat(env, format, banned);
    }
    if (!attempt.ok) {
      rejected.push({ format, causes: [...attempt.causes] });
      rejectedReasons.push(ctReasons.emit(CT_CODES.C3_FORMAT_REJECTED, { format, causes: [...attempt.causes] }), ...attempt.trace);
      continue;
    }
    const used = lastUse(format);
    const criteria = ['admissible_for_stimulus', format === lastFormat ? 'same_as_last_only_option_left' : used ? 'least_recently_used_format' : lastFormat ? 'not_used_in_window' : 'governed_order'];
    if (rejected.length > 0) criteria.push(`after_rejected:${rejected.map((r) => r.format).join('|')}`);
    const plan: C3Plan = { ...attempt.plan, structure, rejectedFormats: rejected, excludedByHistory, avoidedStructures: [...avoided].sort() };
    const reasons = [
      ...trace, ...rejectedReasons,
      ctReasons.emit(CT_CODES.C3_FORMAT_CHOSEN, { format, durationKind: plan.durationKind, criteria }),
      ...attempt.trace,
      ...(plan.identicalToLast.length === IDENTITY_LEVELS.length ? [ctReasons.emit(CT_CODES.C3_REPEAT_UNAVOIDABLE, { identicalLevels: [...plan.identicalToLast] })] : []),
      ctReasons.emit(CT_CODES.C3_PROPOSED, { stimulus, format, exercises: plan.items.map((i) => i.exerciseId) }),
    ];
    // Raisons identiques (même code, mêmes paramètres : provenance relue à chaque tentative) conservées une seule fois.
    const unique = [...new Map(reasons.map((r) => [JSON.stringify([r.code, r.params]), r])).values()];
    return { ok: true, plan, proposal: proposalOf(input, plan, engine, unique) };
  }
  return fail([...rejectedReasons, ctReasons.emit(CT_CODES.C3_NO_FORMAT, { stimulus, tried: rejected.map((r) => `${r.format}:${r.causes.join('+')}`) })]);
}

/** Exposition lue pour la variété : séance réalisée ou prévue (format, mouvements, dose PRESCRITS). */
type Exposure = Pick<RealizedCtSession, 'completedAt' | 'stimulus' | 'prescription'>;

// ——— Historique négatif (aucun seuil : statuts DÉCLARÉS) ———

type NegativeCause = 'abandoned' | 'poorly_tolerated' | 'pain';
function negativeOf(s: RealizedCtSession | undefined): { readonly session: RealizedCtSession; readonly causes: readonly NegativeCause[] } | undefined {
  if (!s) return undefined;
  const causes: NegativeCause[] = [];
  if (s.completion === 'abandoned') causes.push('abandoned');
  if (s.tolerance === 'poorly_tolerated') causes.push('poorly_tolerated');
  if (s.pain !== undefined && s.pain !== 'NONE') causes.push('pain');
  return causes.length > 0 ? { session: s, causes } : undefined;
}

// ——— Composition d'un format ———

interface Env {
  readonly input: Input;
  readonly governance: CtGovernance;
  readonly P: Common;
  readonly level: CrossTrainingContext['population']['level'];
  readonly stimulus: CtStimulus;
  readonly recentMovements: ReadonlySet<string>;
  readonly excludedByHistory: readonly string[];
  readonly avoided: ReadonlySet<string>;
  readonly table: DerivationTable | undefined;
  readonly last: Exposure | undefined;
}
type Culprit = { readonly id: string; readonly cause: string };
type Attempt = { readonly ok: true; readonly plan: Omit<C3Plan, 'structure' | 'rejectedFormats' | 'excludedByHistory' | 'avoidedStructures'>; readonly trace: readonly ReasonCode[] } | { readonly ok: false; readonly causes: readonly string[]; readonly trace: readonly ReasonCode[]; readonly culprits?: readonly Culprit[] };

const METRIC_OF: Readonly<Record<RoleQuantity['kind'], string>> = { reps: 'reps', calories: 'calories', distance_m: 'distance' };
export const IDENTITY_LEVELS = ['format', 'movements', 'dose'] as const;

function composeFormat(env: Env, format: CtFormat, banned: ReadonlyMap<string, string>): Attempt {
  const { input, governance, P, level, stimulus } = env;
  const mode = input.discipline.mode;
  const spec = C3_FORMATS[format];
  const roles = P['ct.composition.movementRoles'][stimulus]?.[format];
  if (!roles) return { ok: false, causes: ['ROLES_UNDECIDED'], trace: [] };
  const dose = P['ct.dose.construction'][stimulus]?.[level]?.[format];
  if (!dose) return { ok: false, causes: [`DOSE_UNDECIDED:${level}`], trace: [] };
  if (spec.items === 'single_timed' && (roles.length !== 1 || roles[0] !== 'monostructural')) return { ok: false, causes: ['ROLES_INCOMPATIBLE_WITH_FORMAT'], trace: [] };
  const quantities: Partial<Record<CtMovementRole, RoleQuantity>> = 'quantities' in dose ? dose.quantities : {};
  const missingQ = spec.items === 'quantities' ? roles.filter((r) => quantities[r] === undefined) : [];
  if (missingQ.length > 0) return { ok: false, causes: missingQ.map((r) => `QUANTITY_UNDECIDED:${r}`), trace: [] };
  const rates = spec.requires.includes('ct.estimation.workRates') ? readC3(governance, 'ct.estimation.workRates', mode) : undefined;
  const workRates: WorkRates | undefined = rates?.ok ? rates.value : undefined;
  const loads = readC3(governance, 'ct.load.implementStandards', mode);
  const loadCap = capabilityState('ctLoadedMovements', governance, mode, new Set<string>(input.discipline.capabilityRequests).has('ctLoadedMovements'));
  const tech = P['ct.safety.technicalUnderFatigue'];
  const maxTech = tech.maxTechnicalCost[level];
  const trace: ReasonCode[] = [...(rates?.reasons ?? [])];
  if (loadCap.enabled && loads.ok) trace.push(...loads.reasons);

  // Réservoir relu ∩ catalogue ; causes d'inéligibilité par mouvement (aucune substitution, aucune réduction).
  const patternRegion = new Map(input.catalog.document.taxonomy.patterns.map((p) => [p.id, p.region]));
  const candidates: Candidate[] = P['ct.composition.movementPool'].map(({ movementId }) => {
    const e = input.catalog.exercise(movementId);
    if (!e) return { e: { id: movementId } as Exercise, roles: [], issues: ['UNKNOWN_MOVEMENT'], recent: false, conflicts: 0 };
    const issues = movementIssues(movementId, e, input, governance).filter((i) => i !== 'LOADED');
    const loaded = e.loadable && e.loadModel !== BODYWEIGHT_MODEL;
    if (loaded && (!loadCap.enabled || !loads.ok || loads.value[movementId]?.[level] === undefined)) issues.push('LOAD_POLICY_UNGOVERNED');
    if (maxTech === undefined) issues.push('TECHNICALITY_UNDECIDED_FOR_LEVEL');
    else if (e.cost.technical > maxTech && !(tech.declaredSkillsAdmitted && input.discipline.declaredSkills.includes(movementId))) issues.push('TECHNICAL_INADMISSIBLE');
    if (env.excludedByHistory.includes(movementId)) issues.push('EXCLUDED_BY_NEGATIVE_HISTORY');
    const ban = banned.get(movementId);
    if (ban) issues.push(ban);
    const structures = env.table ? Object.keys(deriveExerciseStructures(e, env.table)) : [];
    return { e, roles: movementRoles(e, patternRegion.get(e.patterns.primary)), issues, recent: env.recentMovements.has(movementId), conflicts: structures.filter((s) => env.avoided.has(s)).length };
  });

  // Une quantité doit être MESURABLE pour ce mouvement, et son débit gouverné quand le format l'exige.
  const fitIssues = (c: Candidate, r: CtMovementRole): string[] => {
    if (spec.items === 'single_timed') return c.e.measurableMetrics.includes('time') ? [] : ['DURATION_NOT_MEASURABLE'];
    const q = quantities[r];
    if (!q) return ['QUANTITY_UNDECIDED'];
    const out: string[] = [];
    if (!c.e.measurableMetrics.includes(METRIC_OF[q.kind] as Exercise['measurableMetrics'][number])) out.push(`QUANTITY_NOT_MEASURABLE:${q.kind}`);
    if (workRates && rateOf(workRates, c.e.id, q.kind, level) === undefined) out.push('WORK_RATE_UNGOVERNED');
    return out;
  };

  // ——— RÔLES → SÉLECTION (classement déterministe, raisons tracées) ———
  const chosen: { c: Candidate; role: CtMovementRole; criteria: string[] }[] = [];
  for (const role of roles) {
    const withRole = candidates.filter((c) => c.roles.includes(role));
    const rejectedHere: string[] = [];
    const eligible = withRole.filter((c) => {
      const causes = [...c.issues, ...fitIssues(c, role), ...incompatibilities(c.e, chosen.map((x) => x.c.e))];
      if (chosen.some((x) => x.c.e.id === c.e.id)) causes.push('ALREADY_IN_BLOCK');
      if (causes.length > 0) rejectedHere.push(`${c.e.id}:${causes.join('+')}`);
      return causes.length === 0;
    });
    if (rejectedHere.length > 0) trace.push(ctReasons.emit(CT_CODES.C3_CANDIDATES_REJECTED, { format, role, rejected: rejectedHere }));
    if (eligible.length === 0) return { ok: false, causes: [`ROLE_UNFILLED:${role}`], trace };
    const key = (c: Candidate): readonly (number | string)[] => [c.recent ? 1 : 0, c.conflicts, c.e.cost.technical, -(c.e.relevance.crosstraining ?? 0), c.e.id];
    const ranked = [...eligible].sort((a, b) => compareKeys(key(a), key(b)));
    const best = ranked[0] as Candidate;
    const runnerUp = ranked[1];
    const criteria = [
      best.recent ? 'recently_used_no_fresh_alternative' : 'not_used_recently',
      ...(env.avoided.size > 0 ? [`neighbour_structure_conflicts:${String(best.conflicts)}`] : []),
      `technical_cost:${String(best.e.cost.technical)}`,
      `relevance:${String(best.e.relevance.crosstraining ?? 0)}`,
      ...(runnerUp && compareKeys(key(best).slice(0, -1), key(runnerUp).slice(0, -1)) === 0 ? [`tie_broken_by_id_over:${runnerUp.e.id}`] : []),
    ];
    chosen.push({ c: best, role, criteria });
    trace.push(ctReasons.emit(CT_CODES.C3_MOVEMENT_SELECTED, { format, role, exerciseId: best.e.id, criteria }));
  }

  // ——— DOSE ———
  const items: C3Item[] = chosen.map(({ c, role, criteria }, i) => {
    const itemId = `${input.intent.id}.c3.item${String(i + 1)}`;
    const loadKg = c.e.loadable && c.e.loadModel !== BODYWEIGHT_MODEL && loads.ok ? loads.value[c.e.id]?.[level] : undefined;
    const base = { itemId, role, exerciseId: c.e.id, criteria, ...(loadKg === undefined ? {} : { loadKg }) };
    if ('workS' in dose) return { ...base, timed: { workS: dose.workS, rounds: 'rounds' in dose ? dose.rounds : 1, restS: 'restS' in dose ? dose.restS : 0 } };
    return { ...base, quantity: quantities[role] as RoleQuantity };
  });
  for (const it of items) trace.push(ctReasons.emit(CT_CODES.C3_DOSE, { exerciseId: it.exerciseId, quantity: it.timed ? `${String(it.timed.rounds)}x${String(it.timed.workS)}s/${String(it.timed.restS)}s` : `${String(it.quantity?.value)} ${it.quantity?.kind ?? ''}`, load: it.loadKg === undefined ? 'none' : `${String(it.loadKg)}kg` }));

  // ——— DURÉE (prescrite vs estimée) ———
  const perRound = workRates ? roundTime(items, workRates, level) : undefined;
  let blockS: number;
  let rounds: number | undefined;
  let estimated: C3Plan['estimated'];
  const causes: string[] = [];
  const culprits: Culprit[] = [];
  if ('workS' in dose) {
    rounds = 'rounds' in dose ? dose.rounds : undefined;
    blockS = 'rounds' in dose ? dose.rounds * dose.workS + (dose.rounds - 1) * dose.restS : dose.workS;
  } else if ('minutes' in dose) {
    blockS = dose.minutes * SECONDS_PER_MINUTE;
  } else if ('timeCapS' in dose) {
    blockS = dose.timeCapS;
  } else {
    const margin = readC3(governance, 'ct.format.timeCapMargin', mode);
    if (!perRound || !margin.ok) return { ok: false, causes: ['DURATION_NOT_ESTIMABLE'], trace };
    trace.push(...margin.reasons);
    rounds = dose.rounds;
    estimated = { typicalS: perRound.typicalS * dose.rounds, slowS: perRound.slowS * dose.rounds };
    blockS = Math.ceil(estimated.slowS * (1 + margin.value));
  }
  trace.push(ctReasons.emit(CT_CODES.C3_DURATION, { format, kind: spec.duration, prescribedS: blockS, estimatedTypicalS: estimated?.typicalS ?? 0, estimatedSlowS: estimated?.slowS ?? 0 }));
  const domain = P['ct.stimulus.timeDomains'][stimulus];
  const intentS = spec.duration === 'estimated' ? estimated?.typicalS ?? blockS : blockS;
  if (!domain) causes.push('TIME_DOMAIN_UNDECIDED');
  else if (intentS < domain.minS || intentS > domain.maxS) causes.push('OUTSIDE_TIME_DOMAIN');
  // Temps UTILISABLE = disponible − marge du profil de tolérance du CORE (mise en place, consignes : autorité du CORE).
  let marginS: number | undefined;
  try { marginS = readToleranceProfile(input.ruleset, TOLERANCE_PROFILE[spec.duration]).marginS; } catch { marginS = undefined; }
  if (marginS === undefined) causes.push('TOLERANCE_PROFILE_UNAVAILABLE');
  else if (blockS > input.intent.availableTimeS - marginS) causes.push('EXCEEDS_AVAILABLE_TIME');

  // ——— DENSITÉ ———
  let density: C3Plan['density'] = { kind: spec.density, detail: 'self_paced' };
  if (format === 'continuous') density = { kind: 'exact', detail: 'continuous_work' };
  if ('restS' in dose) {
    const ratios = readC3(governance, 'ct.stimulus.workRestRatios', mode);
    const band = ratios.ok ? ratios.value[stimulus] : undefined;
    trace.push(...ratios.reasons);
    density = { kind: 'exact', detail: `work:rest=${String(dose.workS)}:${String(dose.restS)}` };
    if (!band) causes.push('WORK_REST_RATIO_UNDECIDED');
    else if (dose.workS / dose.restS < band.min || dose.workS / dose.restS > band.max) causes.push('WORK_REST_RATIO_OUTSIDE');
  }
  if ('minutes' in dose) {
    const d = readC3(governance, 'ct.format.emomDensity', mode);
    const max = d.ok ? d.value[level] : undefined;
    trace.push(...d.reasons);
    const slowS = perRound?.slowS;
    density = { kind: 'estimated', detail: `work_per_minute_slow=${String(slowS)}s/max=${String(max)}s` };
    if (max === undefined || slowS === undefined) causes.push('EMOM_DENSITY_UNDECIDED');
    else if (slowS > max) {
      causes.push('DENSITY_UNREALISTIC');
      // Contributeur principal (temps lent par minute le plus long) : candidat au réessai.
      const slowest = [...items].map((it) => ({ it, s: workRates ? roundTime([it], workRates, level)?.slowS ?? 0 : 0 })).sort((a, b) => b.s - a.s || (a.it.exerciseId < b.it.exerciseId ? -1 : 1))[0];
      if (slowest) culprits.push({ id: slowest.it.exerciseId, cause: 'DENSITY_MAIN_CONTRIBUTOR' });
    }
  }
  trace.push(ctReasons.emit(CT_CODES.C3_DENSITY, { format, kind: density.kind, detail: density.detail }));

  // ——— VALIDATION : plafonds de volume (CT-D6), volume MAXIMAL exposé ———
  const volume = volumeCauses(env, format, dose, items, workRates, blockS);
  causes.push(...volume.causes);
  trace.push(...volume.reasons);
  culprits.push(...volume.culprits);
  // Réessai seulement si TOUTES les causes sont imputables à des mouvements (plafonds, densité).
  const attributable = causes.every((c) => c === 'DENSITY_UNREALISTIC' || c.startsWith('REPS_CAP_EXCEEDED:') || c === 'JUMP_CONTACTS_CAP_EXCEEDED');
  if (causes.length > 0) return { ok: false, causes, trace, ...(attributable ? { culprits } : {}) };

  const identicalToLast = env.last ? identity(env.last, format, items) : [];
  return { ok: true, plan: { stimulus, level, format, durationKind: spec.duration, blockS, ...(estimated ? { estimated } : {}), ...(perRound ? { roundEstimate: perRound } : {}), ...(rounds === undefined ? {} : { rounds }), density, items, identicalToLast }, trace };
}

/** Compatibilité QUALITATIVE avec les mouvements déjà retenus (aucun seuil) : redondance, technique, transitions. */
function incompatibilities(e: Exercise, chosen: readonly Exercise[]): string[] {
  const out: string[] = [];
  if (chosen.some((x) => x.family === e.family || x.equivalenceClass === e.equivalenceClass)) out.push('REDUNDANT_FAMILY');
  if (chosen.some((x) => x.patterns.primary === e.patterns.primary)) out.push('REDUNDANT_PATTERN');
  if (TECHNICAL_MOVEMENT_TYPES.has(e.movementType) && chosen.some((x) => TECHNICAL_MOVEMENT_TYPES.has(x.movementType))) out.push('TECHNICAL_ACCUMULATION');
  if (e.timing.transitionClass === MACHINE_TRANSITION && chosen.some((x) => x.timing.transitionClass === MACHINE_TRANSITION)) out.push('MACHINE_TO_MACHINE_TRANSITION');
  return out;
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

function rateOf(rates: WorkRates, exerciseId: string, kind: RoleQuantity['kind'], level: string): { fast: number; typical: number; slow: number } | undefined {
  const r = rates[exerciseId];
  return r && r.unit === kind ? (r.rate as Record<string, { fast: number; typical: number; slow: number } | undefined>)[level] : undefined;
}

/** Temps d'un tour (quantités / débits gouvernés), en secondes. Jamais les débits du catalogue. */
function roundTime(items: readonly C3Item[], rates: WorkRates, level: string): { fastS: number; typicalS: number; slowS: number } | undefined {
  let fastS = 0;
  let typicalS = 0;
  let slowS = 0;
  for (const it of items) {
    if (!it.quantity) return undefined;
    const r = rateOf(rates, it.exerciseId, it.quantity.kind, level);
    if (!r) return undefined;
    fastS += (it.quantity.value / r.fast) * SECONDS_PER_MINUTE;
    typicalS += (it.quantity.value / r.typical) * SECONDS_PER_MINUTE;
    slowS += (it.quantity.value / r.slow) * SECONDS_PER_MINUTE;
  }
  return { fastS, typicalS, slowS };
}

/** Plafonds : répétitions par mouvement, contacts de sauts. Le volume MAXIMAL est borné (AMRAP : débit rapide). */
function volumeCauses(env: Env, format: CtFormat, dose: object, items: readonly C3Item[], rates: WorkRates | undefined, blockS: number): { readonly causes: readonly string[]; readonly reasons: readonly ReasonCode[]; readonly culprits: readonly Culprit[] } {
  const reps = items.filter((i) => i.quantity?.kind === 'reps');
  if (reps.length === 0) return { causes: [], reasons: [], culprits: [] };
  const mode = env.input.discipline.mode;
  let multiplier: number | undefined;
  if ('minutes' in dose) multiplier = dose.minutes as number;
  else if ('rounds' in dose) multiplier = dose.rounds as number;
  else if (format === 'amrap' && rates) { const t = roundTime(items, rates, env.level); multiplier = t ? Math.ceil(blockS / t.fastS) : undefined; }
  if (multiplier === undefined) return { causes: ['VOLUME_NOT_BOUNDABLE'], reasons: [], culprits: [] };
  const culprits: Culprit[] = [];
  const out: string[] = [];
  const cap = readC3(env.governance, 'ct.safety.repsPerMovementCap', mode);
  const repsCap = cap.ok ? cap.value[env.level] : undefined;
  const plyo = reps.filter((i) => env.input.catalog.exercise(i.exerciseId)?.movementType === 'plyometric');
  const jumps = plyo.length > 0 ? readC3(env.governance, 'ct.safety.jumpContactsCap', mode) : undefined;
  const jumpCap = jumps?.ok ? jumps.value[env.level] : undefined;
  for (const it of reps) {
    const total = (it.quantity?.value ?? 0) * multiplier;
    if (repsCap === undefined) out.push('UNGOVERNED:ct.safety.repsPerMovementCap');
    else if (total > repsCap) { out.push(`REPS_CAP_EXCEEDED:${it.exerciseId}`); culprits.push({ id: it.exerciseId, cause: 'REPS_CAP_EXCEEDED_IN_BLOCK' }); }
  }
  if (plyo.length > 0) {
    const contacts = plyo.reduce((s, it) => s + (it.quantity?.value ?? 0) * multiplier, 0);
    if (jumpCap === undefined) out.push('UNGOVERNED:ct.safety.jumpContactsCap');
    else if (contacts > jumpCap) { out.push('JUMP_CONTACTS_CAP_EXCEEDED'); culprits.push(...plyo.map((it) => ({ id: it.exerciseId, cause: 'JUMP_CONTACTS_CAP_IN_BLOCK' }))); }
  }
  return { causes: [...new Set(out)], reasons: [...cap.reasons, ...(jumps?.reasons ?? [])], culprits };
}

/** Empreinte multi-niveaux contre la dernière séance du même stimulus : ÉGALITÉ exacte par niveau, aucun seuil. */
function identity(last: Exposure, format: CtFormat, items: readonly C3Item[]): string[] {
  const out: string[] = [];
  if (last.prescription.format !== format) return out;
  out.push('format');
  const ids = (xs: readonly string[]) => [...xs].sort().join('|');
  if (ids(last.prescription.items.map((i) => i.exerciseId)) !== ids(items.map((i) => i.exerciseId))) return out;
  out.push('movements');
  const doseOf = (id: string, q: { kind: string; value: number } | undefined) => `${id}:${q?.kind ?? ''}:${String(q?.value ?? '')}`;
  const lastDose = ids(last.prescription.items.map((i) => doseOf(i.exerciseId, i.quantity)));
  const nowDose = ids(items.map((i) => doseOf(i.exerciseId, i.quantity ?? (i.timed ? { kind: 'duration_s', value: i.timed.workS } : undefined))));
  if (lastDose === nowDose) out.push('dose');
  return out;
}

// ——— PRESCRIPTION (séance CORE + empreinte) ———

function proposalOf(input: Input, plan: C3Plan, engine: { readonly id: string; readonly version: string }, reasons: readonly ReasonCode[]): SportEngineProposalInput {
  const base = input.intent.id;
  const items = plan.items.map((it) => ({ id: it.itemId, exerciseId: it.exerciseId, prescription: prescriptionOf(it) }));
  const common = { id: `${base}.c3.block`, kind: 'conditioning' as const, role: 'primary' as const, items };
  const block = plan.format === 'emom' ? { ...common, format: 'emom' as const, minutes: plan.blockS / SECONDS_PER_MINUTE }
    : plan.format === 'amrap' ? { ...common, format: 'amrap' as const, timeCapS: plan.blockS }
      : plan.format === 'for_time' ? { ...common, format: 'for_time' as const, rounds: plan.rounds ?? 1, timeCapS: plan.blockS }
        : { ...common, format: 'continuous' as const };
  const session: SessionDraftInput = {
    id: `${base}.ct`, discipline: 'crosstraining', athleteLevel: input.profile.athleteLevel,
    availableTimeS: input.intent.availableTimeS, targetDurationS: input.intent.targetDurationS,
    toleranceProfile: TOLERANCE_PROFILE[plan.durationKind],
    blocks: [block],
  };
  const volumeByItem = Object.fromEntries(plan.items.map((it) => [it.itemId, it.timed ? it.timed.workS * it.timed.rounds : (it.quantity?.value ?? 0) * (plan.rounds ?? (plan.format === 'emom' ? plan.blockS / SECONDS_PER_MINUTE : 1))]));
  return {
    proposalId: `proposal.${base}.c3`, discipline: 'crosstraining', intentId: input.intent.id, archetypeId: input.intent.archetypeId,
    stimulus: input.intent.stimulus, objective: input.intent.objective, session,
    optimization: { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0 },
    fingerprintInputs: {
      archetypeId: input.intent.archetypeId, stimulus: plan.stimulus, energy: NOT_APPLICABLE, format: plan.format, volumeByItem,
      prescriptionMarkers: { 'c3.blockS': plan.blockS, 'c3.items': plan.items.length, ...(plan.rounds === undefined ? {} : { 'c3.rounds': plan.rounds }) },
    },
    repetitionIntents: [],
    reasons: reasons.map((r) => ({
      ...r,
      params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === 'object' ? [...v] : v])) as Record<string, string | number | boolean | string[]>,
      ruleRefs: [...r.ruleRefs],
    })),
    provenance: { engineId: engine.id, engineVersion: engine.version, rulesetVersion: input.ruleset.version, catalogVersion: input.catalog.version, seed: input.context.seed },
    parametersUsed: [],
  };
}

function prescriptionOf(it: C3Item): SessionDraftInput['blocks'][number]['items'][number]['prescription'] {
  const load = it.loadKg === undefined ? {} : { load: { kg: it.loadKg, certainty: 'prescribed' as const } };
  if (it.timed) return { type: 'timed', workS: it.timed.workS, rounds: it.timed.rounds, restS: it.timed.restS, ...load };
  const q = it.quantity as RoleQuantity;
  if (q.kind === 'reps') return { type: 'reps', reps: q.value, ...load };
  if (q.kind === 'calories') return { type: 'calories', calories: q.value, ...load };
  return { type: 'distance', distanceM: q.value, ...load };
}
