import { ADMISSIBILITY_LAYERS, statusFrom, zSessionDraft } from '@hybridsport/domain';
import type { RepairAction, SemVerString, SessionDraft, ValidationReport, Violation } from '@hybridsport/domain';
import { canonicalStringify } from '../core/canonical.js';
import { createCoreRegistry, schemaIssueReason } from '../trace/index.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { deriveDemandProfile } from '../catalog/structures.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { RuleRegistry } from '../rules/registry.js';
import { LAYER_NATURES } from '../decision/admissibility.js';
import { estimateDuration, readDurationParams } from '../duration/estimate.js';
import type { AthleteTimingProfile, DurationEstimate } from '../duration/estimate.js';
import { checkDuration, readToleranceProfile } from '../duration/tolerance.js';
import type { ValidationContext } from './context.js';
import { CORE_SESSION_CHECKS } from './checks.js';
import type { CheckInput, SessionCheck } from './checks.js';
import { CORE_RULES } from './rules.js';

const reasons = createCoreRegistry();

export interface ValidatorDeps {
  readonly catalog: LoadedCatalog;
  readonly ruleset: LoadedRuleset;
  readonly engineVersion: SemVerString;
  readonly timing?: AthleteTimingProfile;
  /** Contrôles supplémentaires (moteurs de discipline) ; les contrôles du CORE sont toujours exécutés. */
  readonly extraChecks?: readonly SessionCheck[];
}

export interface SessionValidation {
  readonly report: ValidationReport;
  readonly session?: SessionDraft;
  readonly estimate?: DurationEstimate;
}

function technical(problem: string, path = '$'): Violation {
  return {
    ruleId: CORE_RULES.integrity.id, ruleVersion: CORE_RULES.integrity.version, nature: 'TECHNICAL', level: 'hard', layer: 'A4',
    target: { kind: 'input', id: path }, reason: reasons.emit('TECHNICAL.SCHEMA_INVALID', { path, problem }),
  };
}

function report(deps: ValidatorDeps, errors: Violation[], warnings: Violation[], repairs: RepairAction[], evaluated: { ruleId: string; version: string }[]): ValidationReport {
  const ordered = ADMISSIBILITY_LAYERS.flatMap((l) => errors.filter((e) => (e.layer ?? 'A4') === l));
  const seen = new Set<string>();
  const uniqueRepairs = repairs.filter((r) => { const k = canonicalStringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
  return {
    status: statusFrom(ordered, warnings), errors: ordered, warnings, repairSuggestions: uniqueRepairs, rulesEvaluated: evaluated,
    engineVersion: deps.engineVersion, rulesetVersion: deps.ruleset.version, catalogVersion: deps.catalog.version,
  };
}

/**
 * SessionValidator (spec 09 §1) — indépendant des générateurs : valide de la même manière une séance
 * générée, adaptée, éditée ou proposée par une IA. Accepte une entrée NON typée et ne lève jamais :
 * toute anomalie devient une violation TECHNICAL. Politique fail-closed.
 */
export function validateSession(input: unknown, ctx: ValidationContext, deps: ValidatorDeps): SessionValidation {
  const checks = [...CORE_SESSION_CHECKS, ...(deps.extraChecks ?? [])];
  const evaluated = checks.map((c) => ({ ruleId: c.rule.id, version: c.rule.version }));
  try {
    const parsed = zSessionDraft.safeParse(input);
    if (!parsed.success) return { report: report(deps, parsed.error.issues.map((i) => ({ ...technical(i.message, i.path.join('.') || '$'), reason: schemaIssueReason(i) })), [], [], evaluated) };
    const session = parsed.data;

    // Traçabilité : chaque contrôle doit posséder sa fiche dans le ruleset, à la même version.
    const reg = RuleRegistry.create(checks.map((c) => ({ id: c.rule.id, version: c.rule.version, evaluate: () => undefined })), deps.ruleset);
    if (!reg.ok) return { report: report(deps, reg.issues.map((i) => technical(String(i.reason.params.problem ?? i.reason.code), i.ruleId)), [], [], evaluated), session };
    for (const c of checks) if (!LAYER_NATURES[c.layer].includes(c.nature)) return { report: report(deps, [technical(`nature ${c.nature} interdite en ${c.layer}`, c.rule.id)], [], [], evaluated), session };

    const errors: Violation[] = [];
    const warnings: Violation[] = [];
    const repairs: RepairAction[] = [];
    let estimate: DurationEstimate | undefined;
    const input2: { -readonly [K in keyof CheckInput]: CheckInput[K] } = { session, ctx, catalog: deps.catalog, ruleset: deps.ruleset };
    if (session.blocks.every((b) => b.items.every((i) => deps.catalog.exercise(i.exerciseId)))) {
      const est = estimateDuration(session, deps.catalog, readDurationParams(deps.ruleset, deps.timing));
      if (est.ok) {
        estimate = est.estimate;
        input2.estimate = est.estimate;
        input2.durationCheck = checkDuration(est.estimate, session.availableTimeS, session.targetDurationS, readToleranceProfile(deps.ruleset, session.toleranceProfile));
      } else {
        for (const r of est.reasons) errors.push({ ...technical(String(r.params.kind ?? r.code), String(r.params.id ?? '$')), reason: r });
      }
    }
    if (ctx.recovery) {
      const sessionExercises = new Set(session.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)));
      const foreign = ctx.recovery.items.filter((i) => !sessionExercises.has(i.exerciseId));
      if (foreign.length > 0) errors.push(technical(`demande fournie pour des exercices absents de la séance : ${foreign.map((f) => f.exerciseId).join(', ')}`, 'recovery.items'));
      input2.demand = deriveDemandProfile(ctx.recovery.items, deps.catalog, deps.ruleset);
    }
    for (const c of checks) {
      let out: ReturnType<SessionCheck['evaluate']>;
      try {
        out = c.evaluate(input2);
      } catch (e) {
        errors.push(technical(`contrôle ${c.rule.id} en échec : ${e instanceof Error ? e.message : String(e)}`, c.rule.id));
        continue;
      }
      for (const viol of out.violations) (viol.level === 'hard' ? errors : warnings).push(viol.level === 'hard' ? { ...viol, layer: c.layer } : viol);
      repairs.push(...out.repairs);
    }
    return { report: report(deps, errors, warnings, repairs, evaluated), session, ...(estimate ? { estimate } : {}) };
  } catch (e) {
    // Dernier rempart : même une erreur de paramètre ne fait jamais passer une séance.
    return { report: report(deps, [technical(e instanceof Error ? e.message : String(e))], [], [], evaluated) };
  }
}
