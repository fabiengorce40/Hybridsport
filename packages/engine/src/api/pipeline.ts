import { zSessionDraft } from '@hybridsport/domain';
import type { EngineResult, ReasonCode, SessionDraft, SessionFingerprint, TraceRef, Violation } from '@hybridsport/domain';
import type { EngineContext } from '../core/context.js';
import { checkEngineContext } from '../core/context.js';
import { SeededRng } from '../core/rng.js';
import { createCoreRegistry, TraceBuilder } from '../trace/index.js';
import type { DecisionTrace } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { preflightCoreParameters } from '../rules/core-parameters.js';
import { RulesetParameterError } from '../rules/errors.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { evaluateAdmissibility } from '../decision/admissibility.js';
import type { AdmissibilityCheck, EvaluatedCandidate } from '../decision/admissibility.js';
import { readTolerances, selectBest, toArray } from '../decision/optimization.js';
import { fitDuration } from '../duration/fit.js';
import type { DurationEstimate } from '../duration/estimate.js';
import { validateSession } from '../validation/validator.js';
import type { ValidationContext } from '../validation/context.js';
import { repairSession } from '../repair/repair.js';
import { deriveSafetyRestrictions, isActive } from '../safety/pain.js';
import { deriveProgramStatus, generationGuard } from '../safety/eligibility.js';
import { buildFingerprint } from '../duplicate/fingerprint.js';
import { analyzeDuplicates } from '../duplicate/analysis.js';
import type { DuplicateReport } from '../duplicate/analysis.js';
import { CORE_RULES } from '../validation/rules.js';
import type { CoreCandidate, CoreProfile, CoreState, DuplicateContext, RejectedProposal, SessionCheck } from '../contracts/core-types.js';

export type { CoreCandidate, CoreProfile, CoreState, DuplicateContext, RejectedProposal } from '../contracts/core-types.js';

const reasons = createCoreRegistry();

export interface CorePipelineRequest {
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly candidates: readonly CoreCandidate[];
  /** Anti-doublon actif : chaque candidat DOIT fournir des entrées d'empreinte valides (sinon A4). */
  readonly duplicate?: DuplicateContext;
  /** Propositions refusées à l'acceptation (frontière moteur sportif) : tracées, jamais évaluées. */
  readonly rejectedProposals?: readonly RejectedProposal[];
  /** Contrôles propres à la discipline, exécutés par le validateur et la réparation du CORE. */
  readonly extraChecks?: readonly SessionCheck[];
}

export interface CorePipelineOutcome {
  readonly result: EngineResult<SessionDraft>;
  readonly trace: DecisionTrace;
  /** Empreinte de la séance retenue (anti-doublon actif), à stocker avec elle (spec 07 §1, étape 11). */
  readonly fingerprint?: SessionFingerprint;
  readonly duplicate?: DuplicateReport;
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Après réparation, les volumes des items retirés par le CORE sont écartés (jamais d'autre modification). */
function restrictVolumes(inputs: unknown, session: SessionDraft): unknown {
  if (!isRecord(inputs) || !isRecord(inputs.volumeByItem)) return inputs;
  const present = new Set(session.blocks.flatMap((b) => b.items.map((i) => i.id)));
  const vol = inputs.volumeByItem;
  return { ...inputs, volumeByItem: Object.fromEntries(Object.keys(vol).filter((k) => present.has(k)).map((k) => [k, vol[k]])) };
}

type Ctx = EngineContext<LoadedRuleset, LoadedCatalog>;

/**
 * Pipeline CORE (spec 01 §2, sans moteur sportif) :
 * contexte → sécurité / éligibilité → restrictions → durée → validation (couche A) → score (couche B)
 * → réparation si nécessaire → trace → résultat. Pur et déterministe (même entrée + même graine ⇒
 * même sortie).
 */
export function runCorePipeline(request: CorePipelineRequest, ctx: Ctx): CorePipelineOutcome {
  const versions = { engineVersion: ctx.engineVersion, rulesetVersion: ctx.ruleset.version, catalogVersion: ctx.catalog.version };
  const trace = new TraceBuilder(versions, ctx.seed);
  const pipelineSubject = { kind: 'program' as const, id: ctx.seed };
  const finish = (make: (ref: TraceRef) => EngineResult<SessionDraft>, extra: { fingerprint?: SessionFingerprint; duplicate?: DuplicateReport } = {}): CorePipelineOutcome => {
    const built = trace.build();
    return { result: make({ traceId: built.traceId }), trace: built, ...extra };
  };
  const technicalError = (rs: ReasonCode[]) => finish((ref) => ({ status: 'error', error: { code: 'INVALID_INPUT', reasons: rs, alternatives: [] }, trace: ref }));

  // 1. Contexte et paramètres
  const ctxIssues = checkEngineContext({ ...ctx, ruleset: { version: ctx.ruleset.version }, catalog: { version: ctx.catalog.version } });
  const pre = preflightCoreParameters(ctx.ruleset);
  if (ctxIssues.length > 0 || pre.length > 0) {
    const rs = [
      ...ctxIssues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `context.${i.field}`, problem: i.problem })),
      ...pre.map((p) => reasons.emit('TECHNICAL.PARAMETER_MISSING', { parameterId: `${p.id} (${p.problem})` })),
    ];
    trace.add({ step: 'context', subject: pipelineSubject, decision: 'rejected', reasons: rs });
    return technicalError(rs);
  }

  // Intégrité des entrées : identifiants de candidats uniques (sinon la décision dépendrait de l'ordre
  // d'entrée) ; aucun rapport de douleur persisté sans consentement aux données de santé.
  const ids = request.candidates.map((c) => zSessionDraft.safeParse(c.session)).flatMap((p) => (p.success ? [p.data.id] : []));
  const duplicated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].sort();
  const persistedWithoutConsent = request.profile.healthDataConsent ? [] : request.state.activePain.filter((r) => r.persisted).map((r) => r.id);
  if (duplicated.length > 0 || persistedWithoutConsent.length > 0) {
    const rs = [
      ...duplicated.map((id) => reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: 'identifiant de candidat dupliqué', target: id })),
      ...persistedWithoutConsent.map((id) => reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: 'rapport de douleur persisté sans consentement', target: id })),
    ];
    trace.add({ step: 'context', subject: pipelineSubject, decision: 'rejected', reasons: rs });
    return technicalError(rs);
  }

  // Propositions refusées à la frontière moteur sportif / CORE : tracées, jamais évaluées ni réparées.
  for (const r of request.rejectedProposals ?? []) trace.add({ step: 'proposal', subject: { kind: 'session', id: r.id }, decision: 'rejected', reasons: [...r.reasons] });

  try {
    // 2. Sécurité et éligibilité
    const active = request.state.activePain.filter(isActive);
    const safety = deriveSafetyRestrictions(active, ctx.ruleset);
    const status = deriveProgramStatus({ eligibility: request.profile.eligibility, declarations: request.profile.declarations, safety, ruleset: ctx.ruleset });
    const info: ReasonCode[] = [...safety.reasons, ...status.reasons];
    if (request.state.readiness === 'unknown') info.push(reasons.emit('DATA.READINESS_UNKNOWN'));
    if (request.state.painHistory === 'unavailable') info.push(reasons.emit('DATA.HEALTH_HISTORY_UNAVAILABLE'));
    // Sans consentement : la douleur adapte la séance du jour mais n'est pas conservée (spec 02 §8, V1.2).
    if (!request.profile.healthDataConsent && active.length > 0) info.push(reasons.emit('DATA.NOT_PERSISTED_NO_CONSENT'));
    trace.add({ step: 'safety', subject: pipelineSubject, decision: status.status, reasons: info });
    const guard = generationGuard(status.status, request.profile.eligibility);
    if (!guard.ok) return finish((ref) => ({ status: 'error', error: guard.error, trace: ref }));

    const vctx: ValidationContext = {
      programStatus: status.status, eligibility: request.profile.eligibility, athleteLevel: request.profile.athleteLevel,
      availableEquipment: request.profile.availableEquipment, restrictions: request.profile.restrictions,
      areaRestrictions: safety.areaRestrictions, restrictedMovements: safety.restrictedMovements,
      excludedExercises: request.profile.excludedExercises, dayAvailable: request.state.dayAvailable,
      ...(request.state.recovery ? { recovery: request.state.recovery } : {}),
    };
    const deps = { catalog: ctx.catalog, ruleset: ctx.ruleset, engineVersion: ctx.engineVersion, ...(request.state.timing ? { timing: request.state.timing } : {}), ...(request.extraChecks ? { extraChecks: request.extraChecks } : {}) };

    // 3. Durée puis validation de chaque candidat ⇒ admissibilité (couche A)
    const evaluated: EvaluatedCandidate<SessionDraft | undefined>[] = [];
    const analyses = new Map<string, { fingerprint: SessionFingerprint; report: DuplicateReport }>();
    const brokenFingerprint = new Set<string>();
    const inputsById = new Map<string, unknown>();
    request.candidates.forEach((c, index) => {
      const parsed = zSessionDraft.safeParse(c.session);
      const id = parsed.success ? parsed.data.id : `candidate-${index}`;
      let session: SessionDraft | undefined = parsed.success ? parsed.data : undefined;
      let estimate: DurationEstimate | undefined;
      if (session) {
        const fit = fitDuration(session, ctx.catalog, ctx.ruleset, request.state.timing);
        trace.add({ step: 'duration', subject: { kind: 'session', id }, decision: fit.status, reasons: [...fit.reasons] });
        if (fit.status !== 'INFEASIBLE') { session = fit.session; estimate = fit.estimate; }
      }
      // Empreinte puis anti-doublon (spec 07 §4), sur la séance APRÈS ajustement de durée : SOFT (B6), jamais HARD par défaut.
      const fingerprintViolations: Violation[] = [];
      let penalty = 0;
      if (request.duplicate && session) {
        inputsById.set(id, c.fingerprintInputs);
        const fp = buildFingerprint(session, ctx.catalog, c.fingerprintInputs, estimate);
        if (!fp.ok) {
          brokenFingerprint.add(id);
          fingerprintViolations.push(...fp.reasons.map((reason) => ({ ruleId: CORE_RULES.integrity.id, ruleVersion: CORE_RULES.integrity.version, nature: 'TECHNICAL' as const, level: 'hard' as const, layer: 'A4' as const, target: { kind: 'session' as const, id }, reason })));
          trace.add({ step: 'fingerprint', subject: { kind: 'session', id }, decision: 'rejected', reasons: [...fp.reasons] });
        } else {
          const report = analyzeDuplicates(fp.fingerprint, request.duplicate.history, request.duplicate.declaredIntents, ctx.ruleset, ctx.now);
          analyses.set(id, { fingerprint: fp.fingerprint, report });
          penalty = report.penalty;
          trace.add({ step: 'duplicate', subject: { kind: 'session', id }, decision: report.classification, reasons: [...report.reasons] });
        }
      }
      const v = validateSession(session ?? c.session, vctx, deps);
      trace.add({ step: 'validate', subject: { kind: 'session', id }, decision: v.report.status, reasons: [...v.report.errors, ...v.report.warnings].map((x) => x.reason) });
      const checks: AdmissibilityCheck<null>[] = (['A1', 'A2', 'A3', 'A4'] as const).map((layer) => ({
        id: `pipeline.${layer}`, version: '1.0.0', layer,
        nature: layer === 'A1' ? 'SAFETY' : layer === 'A2' ? 'FEASIBILITY' : layer === 'A3' ? 'PROGRAMMING_HEURISTIC' : 'TECHNICAL',
        evaluate: () => [...v.report.errors.filter((e) => (e.layer ?? 'A4') === layer), ...(layer === 'A4' ? fingerprintViolations : [])],
      }));
      // Les violations restent attachées à leur couche ; la nature du contrôle d'agrégation ne les réécrit pas.
      const admissibility = evaluateAdmissibility(null, checks);
      // La pénalité anti-doublon est appliquée par le CORE au niveau B6 (variété), quel que soit le vecteur du moteur.
      evaluated.push({ id, payload: v.session ?? session, admissibility, optimization: toArray({ ...c.optimization, B6: c.optimization.B6 - penalty }) });
    });

    // 4. Sélection (couche B)
    const selection = selectBest(evaluated, readTolerances(ctx.ruleset), SeededRng.fromSeed(ctx.seed).fork('selection'));
    trace.add({
      step: 'score', subject: pipelineSubject, decision: selection.status,
      reasons: [...selection.reasons], rejected: selection.rejected.map((r) => ({ candidate: r.id, reasons: r.reasons })),
    });
    const winnerSession = selection.status === 'selected' ? selection.winner.payload : undefined;
    if (selection.status === 'selected' && winnerSession) {
      const final = validateSession(winnerSession, vctx, deps);
      trace.add({ step: 'result', subject: { kind: 'session', id: selection.winner.id }, decision: final.report.status, reasons: final.report.warnings.map((w) => w.reason) });
      const dup = analyses.get(selection.winner.id);
      return finish((ref) => ({ status: 'ok', value: winnerSession, validation: final.report, trace: ref, warnings: [...final.report.warnings.map((w) => w.reason), ...(dup?.report.reasons ?? [])] }), dup ? { fingerprint: dup.fingerprint, duplicate: dup.report } : {});
    }

    // 5. Aucune solution admissible : réparation du candidat le mieux placé sur la couche B (ordre déterministe).
    // Une proposition à l'empreinte invalide est techniquement défectueuse : jamais réparée.
    const repairable = evaluated.filter((e) => !brokenFingerprint.has(e.id)).flatMap((e) => (e.payload ? [{ ...e, payload: e.payload }] : [])).sort((a, b) => {
      for (let i = 0; i < a.optimization.length; i++) { const d = (b.optimization[i] ?? 0) - (a.optimization[i] ?? 0); if (d !== 0) return d; }
      return a.id < b.id ? -1 : 1;
    })[0];
    if (!repairable) {
      const rs = [reasons.emit('SELECT.NO_ADMISSIBLE_CANDIDATE', { candidates: request.candidates.length })];
      return finish((ref) => ({ status: 'error', error: { code: 'NO_VALID_SOLUTION', reasons: rs, alternatives: [] }, trace: ref }));
    }
    const repaired = repairSession(repairable.payload, vctx, deps, { seed: `${ctx.seed}/repair` });
    for (const e of repaired.trace.entries) trace.add({ step: e.step, subject: e.subject, decision: e.decision, reasons: e.reasons });
    if (request.duplicate && repaired.result.status === 'ok') {
      // Séance modifiée par la réparation : empreinte et anti-doublon recalculés sur la séance finale.
      const finalSession = repaired.result.value;
      const fp = buildFingerprint(finalSession, ctx.catalog, restrictVolumes(inputsById.get(repairable.id), finalSession));
      if (!fp.ok) {
        trace.add({ step: 'fingerprint', subject: { kind: 'session', id: finalSession.id }, decision: 'rejected', reasons: [...fp.reasons] });
        return technicalError([...fp.reasons]);
      }
      const report = analyzeDuplicates(fp.fingerprint, request.duplicate.history, request.duplicate.declaredIntents, ctx.ruleset, ctx.now);
      trace.add({ step: 'duplicate', subject: { kind: 'session', id: finalSession.id }, decision: report.classification, reasons: [...report.reasons] });
      const ok = repaired.result;
      return finish((ref) => ({ ...ok, trace: ref, warnings: [...ok.warnings, ...report.reasons] }), { fingerprint: fp.fingerprint, duplicate: report });
    }
    return finish((ref) => ({ ...repaired.result, trace: ref }));
  } catch (e) {
    // Paramètre ou politique absents : erreur TECHNICAL explicite, jamais masquée ni contournée.
    const problem = e instanceof RulesetParameterError ? `${e.parameterId} (${e.problem})` : e instanceof Error ? e.message : String(e);
    const rs = [reasons.emit('TECHNICAL.PARAMETER_MISSING', { parameterId: problem })];
    trace.add({ step: 'context', subject: pipelineSubject, decision: 'technical_error', reasons: rs });
    return technicalError(rs);
  }
}
