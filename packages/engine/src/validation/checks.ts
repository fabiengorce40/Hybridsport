import type { AdmissibilityLayer, RepairAction, RuleNature, SessionDraft, SessionItem, Violation } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { resolveEnforcement } from '../rules/enforcement.js';
import type { DemandProfile } from '../catalog/structures.js';
import type { DurationEstimate } from '../duration/estimate.js';
import type { DurationCheck } from '../duration/tolerance.js';
import { leverDeclarationIssues } from '../duration/levers.js';
import type { ValidationContext } from './context.js';
import { CORE_RULES, MIN_RECOVERY_POLICY_ID } from './rules.js';

const reasons = createCoreRegistry();

export interface CheckInput {
  readonly session: SessionDraft;
  readonly ctx: ValidationContext;
  readonly catalog: LoadedCatalog;
  readonly ruleset: LoadedRuleset;
  readonly estimate?: DurationEstimate;
  readonly durationCheck?: DurationCheck;
  readonly demand?: DemandProfile;
}

export interface CheckOutput { readonly violations: Violation[]; readonly repairs: RepairAction[] }

export interface SessionCheck {
  readonly rule: { readonly id: string; readonly version: string };
  readonly layer: AdmissibilityLayer;
  readonly nature: RuleNature;
  evaluate(input: CheckInput): CheckOutput;
}

type ReasonOf = Violation['reason'];
function v(rule: SessionCheck['rule'], nature: RuleNature, level: 'hard' | 'soft', target: Violation['target'], reason: ReasonOf, penalty?: number): Violation {
  return { ruleId: rule.id, ruleVersion: rule.version, nature, level, target, reason, ...(penalty !== undefined ? { penalty } : {}) };
}

const allItems = (s: SessionDraft): SessionItem[] => s.blocks.flatMap((b) => b.items);

/** Substituts admissibles d'un exercice, ordonnés par fidélité puis identifiant (déterministe). */
export function admissibleSubstitutes(exerciseId: string, input: Pick<CheckInput, 'catalog' | 'ctx'>): string[] {
  const e = input.catalog.exercise(exerciseId);
  if (!e) return [];
  const eq = new Set(input.ctx.availableEquipment);
  // technical-constant: rang ordinal de fidélité (tri déterministe), pas une valeur sportive
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...e.substitutions]
    .sort((a, b) => rank[a.fidelity] - rank[b.fidelity] || (a.exerciseId < b.exerciseId ? -1 : 1))
    .map((s) => input.catalog.exercise(s.exerciseId))
    .filter((t): t is NonNullable<typeof t> => t !== undefined && t.status === 'active')
    .filter((t) => input.catalog.isFeasibleWith(t, eq))
    .filter((t) => !t.contraindicationTags.some((r) => input.ctx.restrictions.includes(r)))
    .filter((t) => !t.painSensitiveAreas.some((a) => input.ctx.areaRestrictions.some((r) => r.area === a && r.action === 'exclude')))
    .filter((t) => !t.movementTags.some((m) => input.ctx.restrictedMovements.includes(m)))
    .filter((t) => !input.ctx.excludedExercises.includes(t.id))
    .map((t) => t.id);
}

function replaceOrRemove(item: SessionItem, input: CheckInput): RepairAction {
  const candidates = admissibleSubstitutes(item.exerciseId, input);
  return candidates.length > 0 ? { kind: 'replace_exercise', itemId: item.id, candidates } : { kind: 'remove_item', itemId: item.id };
}

/** A1 — statut du programme : aucune génération hors `active` (spec 02 §8). Aucune réparation possible. */
const programStatusCheck: SessionCheck = {
  rule: CORE_RULES.programStatus, layer: 'A1', nature: 'SAFETY',
  evaluate: ({ ctx, session }) => {
    const target = { kind: 'session' as const, id: session.id };
    if (ctx.programStatus === 'paused_safety') return { violations: [v(CORE_RULES.programStatus, 'SAFETY', 'hard', target, reasons.emit('SAFETY.PROGRAM_PAUSED', { cause: 'paused_safety' }))], repairs: [] };
    if (ctx.programStatus === 'suspended_scope') return { violations: [v(CORE_RULES.programStatus, 'SAFETY', 'hard', target, reasons.emit('SCOPE.OUT_OF_SCOPE', { eligibility: ctx.eligibility }))], repairs: [] };
    return { violations: [], repairs: [] };
  },
};

/** A1 — restrictions déclarées ↔ contre-indications du catalogue. */
const restrictionCheck: SessionCheck = {
  rule: CORE_RULES.restriction, layer: 'A1', nature: 'SAFETY',
  evaluate: (input) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    for (const it of allItems(input.session)) {
      const e = input.catalog.exercise(it.exerciseId);
      const hit = e?.contraindicationTags.find((r) => input.ctx.restrictions.includes(r));
      if (e && hit) {
        out.violations.push(v(CORE_RULES.restriction, 'SAFETY', 'hard', { kind: 'item', id: it.id }, reasons.emit('SAFETY.RESTRICTION_VIOLATED', { restriction: hit, exerciseId: e.id })));
        out.repairs.push(replaceOrRemove(it, input));
      }
    }
    return out;
  },
};

/** A1 — zones restreintes par les règles G1 de douleur : `exclude` ⇒ HARD ; `reduce` ⇒ SOFT (prudence). */
const painAreaCheck: SessionCheck = {
  rule: CORE_RULES.painArea, layer: 'A1', nature: 'SAFETY',
  evaluate: (input) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    for (const it of allItems(input.session)) {
      const e = input.catalog.exercise(it.exerciseId);
      if (!e) continue;
      for (const r of input.ctx.areaRestrictions) {
        if (!e.painSensitiveAreas.includes(r.area)) continue;
        const reason = reasons.emit('SAFETY.PAIN.ZONE_RESTRICTED', { bodyArea: r.area, exerciseId: e.id, painLevel: r.painLevel });
        if (r.action === 'exclude') {
          out.violations.push(v(CORE_RULES.painArea, 'SAFETY', 'hard', { kind: 'item', id: it.id }, reason));
          out.repairs.push(replaceOrRemove(it, input));
        } else {
          out.violations.push(v(CORE_RULES.painArea, 'SAFETY', 'soft', { kind: 'item', id: it.id }, { ...reason, severity: 'warning' }));
        }
      }
    }
    return out;
  },
};

/** A1 — mouvements signalés douloureux (P2). */
const painMovementCheck: SessionCheck = {
  rule: CORE_RULES.painMovement, layer: 'A1', nature: 'SAFETY',
  evaluate: (input) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    for (const it of allItems(input.session)) {
      const e = input.catalog.exercise(it.exerciseId);
      const hit = e?.movementTags.find((m) => input.ctx.restrictedMovements.includes(m));
      if (e && hit) {
        out.violations.push(v(CORE_RULES.painMovement, 'SAFETY', 'hard', { kind: 'item', id: it.id }, reasons.emit('SAFETY.PAIN.MOVEMENT_RESTRICTED', { movement: hit, exerciseId: e.id })));
        out.repairs.push(replaceOrRemove(it, input));
      }
    }
    return out;
  },
};

/** A2 — exercice actif (un exercice déprécié n'est plus programmable). */
const exerciseStatusCheck: SessionCheck = {
  rule: CORE_RULES.exerciseStatus, layer: 'A2', nature: 'FEASIBILITY',
  evaluate: (input) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    for (const it of allItems(input.session)) {
      const e = input.catalog.exercise(it.exerciseId);
      if (e && e.status !== 'active') {
        out.violations.push(v(CORE_RULES.exerciseStatus, 'FEASIBILITY', 'hard', { kind: 'item', id: it.id }, reasons.emit('FEASIBILITY.EXERCISE_UNAVAILABLE', { exerciseId: e.id, status: e.status })));
        out.repairs.push(e.replacedBy ? { kind: 'replace_exercise', itemId: it.id, candidates: [e.replacedBy, ...admissibleSubstitutes(e.id, input)] } : replaceOrRemove(it, input));
      }
    }
    return out;
  },
};

/** A2 — matériel réellement disponible (jamais inventé). */
const equipmentCheck: SessionCheck = {
  rule: CORE_RULES.equipment, layer: 'A2', nature: 'FEASIBILITY',
  evaluate: (input) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    const eq = new Set(input.ctx.availableEquipment);
    for (const it of allItems(input.session)) {
      const e = input.catalog.exercise(it.exerciseId);
      if (!e) continue;
      const missing = input.catalog.missingEquipment(e, eq);
      if (missing.length > 0) {
        out.violations.push(v(CORE_RULES.equipment, 'FEASIBILITY', 'hard', { kind: 'item', id: it.id }, reasons.emit('FEASIBILITY.EQUIPMENT_MISSING', { exerciseId: e.id, missing })));
        out.repairs.push(replaceOrRemove(it, input));
      }
    }
    return out;
  },
};

/** A2 — exclusion explicite de l'utilisateur (préférence appliquée en HARD, spec 01 §3). */
const exclusionCheck: SessionCheck = {
  rule: CORE_RULES.exclusion, layer: 'A2', nature: 'PREFERENCE',
  evaluate: (input) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    for (const it of allItems(input.session)) {
      if (input.ctx.excludedExercises.includes(it.exerciseId)) {
        out.violations.push(v(CORE_RULES.exclusion, 'PREFERENCE', 'hard', { kind: 'item', id: it.id }, reasons.emit('FEASIBILITY.USER_EXCLUSION', { exerciseId: it.exerciseId })));
        out.repairs.push(replaceOrRemove(it, input));
      }
    }
    return out;
  },
};

/** A2 — jour disponible. */
const dayCheck: SessionCheck = {
  rule: CORE_RULES.day, layer: 'A2', nature: 'FEASIBILITY',
  evaluate: ({ ctx, session }) => (ctx.dayAvailable ? { violations: [], repairs: [] } : {
    violations: [v(CORE_RULES.day, 'FEASIBILITY', 'hard', { kind: 'session', id: session.id }, reasons.emit('FEASIBILITY.DAY_UNAVAILABLE', { date: session.id }))], repairs: [],
  }),
};

/** A2 — p90 ≤ temps réellement disponible (HARD) ; hors tolérance (SOFT). */
const durationCheck: SessionCheck = {
  rule: CORE_RULES.duration, layer: 'A2', nature: 'FEASIBILITY',
  evaluate: ({ session, estimate, durationCheck: dc }) => {
    if (!estimate || !dc) return { violations: [], repairs: [] };
    const target = { kind: 'session' as const, id: session.id };
    if (!dc.feasible) {
      return { violations: [v(CORE_RULES.duration, 'FEASIBILITY', 'hard', target, reasons.emit('FEASIBILITY.TIME_EXCEEDED', { p90S: estimate.p90, availableS: session.availableTimeS }))], repairs: [{ kind: 'compress_duration' }] };
    }
    if (!dc.withinTolerance && !dc.shorterThanTarget) {
      return { violations: [v(CORE_RULES.duration, 'FEASIBILITY', 'soft', target, reasons.emit('DURATION.OUT_OF_TOLERANCE', { p50S: estimate.p50, lowerS: dc.lowerS, upperS: dc.upperS }))], repairs: [{ kind: 'compress_duration' }] };
    }
    return { violations: [], repairs: [] };
  },
};

const isGapMatrix = (x: unknown): x is Record<string, Record<string, number>> =>
  x !== null && typeof x === 'object' && Object.values(x).every((row) => row !== null && typeof row === 'object' && Object.values(row).every((n) => typeof n === 'number'));

/**
 * A3 — récupération minimale entre demandes sur une même structure (L1). Le seuil vient de la matrice
 * du ruleset et le niveau HARD/SOFT de la politique contextuelle (point d'entrée unique).
 */
const recoveryCheck: SessionCheck = {
  rule: CORE_RULES.recovery, layer: 'A3', nature: 'PROGRAMMING_HEURISTIC',
  evaluate: ({ ctx, demand, ruleset, session }) => {
    if (!ctx.recovery || !demand) return { violations: [], repairs: [] };
    // Le profil de demande est DÉRIVÉ par le validateur (deriveDemandProfile), jamais fourni tel quel.
    const matrix = ruleset.table('recovery.minGapMatrix', isGapMatrix, 'Record<niveauPrécédent, Record<niveauSuivant, heures>>');
    const out: CheckOutput = { violations: [], repairs: [] };
    for (const n of ctx.recovery.neighbors) {
      const next = demand.levels[n.structure] ?? 'none';
      const required = matrix[n.level]?.[next];
      if (required === undefined || n.hoursBefore >= required) continue;
      const d = resolveEnforcement(ruleset, MIN_RECOVERY_POLICY_ID, { ...ctx.recovery.enforcement, structure: n.structure, athleteLevel: ctx.athleteLevel });
      if (d.level === 'inactive') continue;
      const category = d.level === 'hard' ? 'business_hard' : 'business_soft';
      const reason = reasons.emit('RECOVERY.MIN_GAP_VIOLATION', { structure: n.structure, gapHours: n.hoursBefore, requiredHours: required }, { category, ruleRefs: [`${CORE_RULES.recovery.id}@${CORE_RULES.recovery.version}`] });
      out.violations.push(v(CORE_RULES.recovery, 'PROGRAMMING_HEURISTIC', d.level, { kind: 'session', id: session.id }, reason, d.level === 'soft' ? d.penaltyWeight : undefined));
    }
    return out;
  },
};

/** A4 — intégrité structurelle (identifiants uniques, références connues, leviers bien déclarés). */
const integrityCheck: SessionCheck = {
  rule: CORE_RULES.integrity, layer: 'A4', nature: 'TECHNICAL',
  evaluate: ({ session, catalog }) => {
    const out: CheckOutput = { violations: [], repairs: [] };
    const tech = (problem: string, target: string) => out.violations.push(v(CORE_RULES.integrity, 'TECHNICAL', 'hard', { kind: 'session', id: session.id }, reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem, target })));
    const ids = new Set<string>();
    for (const id of [...session.blocks.map((b) => b.id), ...allItems(session).map((i) => i.id)]) {
      if (ids.has(id)) tech('identifiant dupliqué', id);
      ids.add(id);
    }
    for (const it of allItems(session)) {
      if (!catalog.exercise(it.exerciseId)) out.violations.push(v(CORE_RULES.integrity, 'TECHNICAL', 'hard', { kind: 'item', id: it.id }, reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'exercise', id: it.exerciseId })));
    }
    for (const b of session.blocks) {
      if (b.format === 'sets' && b.grouping !== 'straight' && b.items.some((i) => i.prescription.type !== 'sets')) tech('superset/circuit : prescriptions en séries attendues', b.id);
    }
    for (const issue of leverDeclarationIssues(session)) tech(issue, session.id);
    // Une séance porte au moins un bloc principal (son stimulus) — invariant structurel (spec 02 §5, 07 §3.3).
    if (!session.blocks.some((b) => b.role === 'primary')) tech('séance sans bloc principal', session.id);
    if (session.targetDurationS > session.availableTimeS) tech('durée cible supérieure au temps disponible', session.id);
    return out;
  },
};

export const CORE_SESSION_CHECKS: readonly SessionCheck[] = [
  programStatusCheck, restrictionCheck, painAreaCheck, painMovementCheck,
  exerciseStatusCheck, equipmentCheck, exclusionCheck, dayCheck, durationCheck,
  recoveryCheck, integrityCheck,
];
