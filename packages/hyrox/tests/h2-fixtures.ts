/**
 * Fixtures H2 (tests seulement) : ruleset de test du CORE + paramètres H2 TEST_ONLY, requêtes de RÔLE, exécution par le
 * pipeline RÉEL du CORE (exécuteur strict), lecture du plan et de la proposition.
 */
import type { CatalogDocumentInput, FingerprintHistoryEntry, ReasonCode, RulesetDocumentInput, SessionDraft } from '@hybridsport/domain';
import { deriveSessionDemand } from '@hybridsport/engine';
import type { CoreProfile, CorePipelineOutcome, SportSessionRequest } from '@hybridsport/engine';
import { createHyroxEngine, h2ArchetypeOf, runHyrox } from '../src/index.js';
import type { HrParamId, HrRole, HyroxContextInput, HyroxEngine } from '../src/index.js';
import { coreContext } from '../../engine/tests/harness/context.js';
import { STATE_FRESH } from '../../engine/tests/harness/requests.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { param, testRulesetDocumentWithDuplicate } from '../../engine/tests/fixtures/ruleset.js';
import { PROFILE_HYROX, hyroxCatalogDocument } from './fixtures.js';
import { h2Parameters } from './h2-governance.js';

type ParamInput = RulesetDocumentInput['parameters'][number];
export type H2Overrides = { readonly [K in HrParamId]?: unknown };

// technical-constant: TEST_ONLY — normalisation des doses HYROX pour le profil de demande du CORE (mêmes valeurs que le planificateur)
export const H2_DOSE_NORMALIZATION = { hybrid_race: { meter: { perUnit: 0.03, intensityBand: 'high' }, rep: { perUnit: 0.5, intensityBand: 'high' }, second: { perUnit: 0.1, intensityBand: 'high' }, calorie: { perUnit: 0.5, intensityBand: 'high' } } };

export function h2RulesetDocument(o: H2Overrides = {}, extra: Partial<ParamInput> = {}): RulesetDocumentInput {
  const base = testRulesetDocumentWithDuplicate();
  return { ...base, parameters: [...base.parameters.filter((p) => p.id !== 'demand.doseNormalization'), param('demand.doseNormalization', H2_DOSE_NORMALIZATION as never, 'G2'), ...h2Parameters(o, extra)] };
}
export const h2Ruleset = (o: H2Overrides = {}, extra: Partial<ParamInput> = {}) => testRuleset(h2RulesetDocument(o, extra));
export const h2Catalog = (doc: CatalogDocumentInput = hyroxCatalogDocument()) => testCatalog(doc);

export function h2Ctx(o: Partial<HyroxContextInput> = {}): HyroxContextInput {
  return { population: { level: 'intermediate', hybrid: false }, mode: 'CANDIDATE', returnState: { state: 'NONE' }, goal: { type: 'GENERAL' }, ...o };
}

export function h2Request(role: HrRole, ctx: HyroxContextInput, availableS: number, o: { profile?: CoreProfile; history?: FingerprintHistoryEntry[]; intentId?: string; state?: SportSessionRequest['state'] } = {}): SportSessionRequest {
  return {
    intent: {
      id: o.intentId ?? `intent.hr.h2.${role}`, discipline: 'hybrid_race', archetypeId: h2ArchetypeOf(role), stimulus: `stim.hybrid_race.${role}`, objective: 'objective.hybrid_race.h2',
      priority: 'standard', phase: 'phase.hybrid_race.base', availableTimeS: availableS, targetDurationS: availableS, repetitionIntents: [], plannerNotes: [],
    },
    profile: o.profile ?? PROFILE_HYROX, state: o.state ?? STATE_FRESH, history: o.history ?? [], disciplineContext: ctx,
  };
}

export interface H2Run {
  readonly outcome: CorePipelineOutcome;
  readonly proposal: Record<string, unknown> | undefined;
  readonly refusal: readonly ReasonCode[];
  readonly session: SessionDraft | undefined;
}

export interface H2RunOptions {
  readonly params?: H2Overrides;
  readonly extra?: Partial<ParamInput>;
  readonly catalog?: CatalogDocumentInput;
  readonly engine?: HyroxEngine;
  readonly request?: Parameters<typeof h2Request>[3];
  readonly now?: string;
}

/** Exécution complète : moteur (simulation) → pipeline CORE → contrôle strict ; proposition capturée. */
export function runH2(role: HrRole, ctx: Partial<HyroxContextInput> = {}, availableS = 3600, o: H2RunOptions = {}): H2Run {
  const engine = o.engine ?? createHyroxEngine({ simulation: true });
  let proposal: Record<string, unknown> | undefined;
  let refusal: readonly ReasonCode[] = [];
  const spy: HyroxEngine = {
    ...engine,
    propose: (i) => {
      const r = engine.propose(i);
      if (r.status === 'proposals') proposal = r.proposals[0] as unknown as Record<string, unknown>;
      else if (r.status === 'no_valid_proposal') refusal = r.reasons as unknown as ReasonCode[];
      return r;
    },
  };
  const c = coreContext(`hr-h2-${role}`, h2Ruleset(o.params, o.extra), h2Catalog(o.catalog));
  const context = o.now ? { ...c, now: o.now } : c;
  const outcome = runHyrox(spy, h2Request(role, h2Ctx(ctx), availableS, o.request), context as typeof c);
  if (outcome.result.status === 'error' && refusal.length === 0) refusal = outcome.result.error.reasons;
  return { outcome, proposal, refusal, session: outcome.result.status === 'ok' ? outcome.result.value : undefined };
}

export const codesOf = (rs: readonly ReasonCode[]) => rs.map((r) => r.code);
export const reasonOf = (run: H2Run, code: string): ReasonCode | undefined => [...((run.proposal?.reasons as ReasonCode[] | undefined) ?? []), ...run.refusal].find((r) => r.code === code);
export const reasonsOf = (run: H2Run, code: string): ReasonCode[] => [...((run.proposal?.reasons as ReasonCode[] | undefined) ?? []), ...run.refusal].filter((r) => r.code === code);
export const itemsOf = (run: H2Run) => run.session?.blocks[0]?.items ?? [];
export const blockOf = (run: H2Run) => run.session?.blocks[0];

/** Profil de demande CORE de la séance générée (8 structures, normalisation du ruleset de test). */
export function demandOf(run: H2Run) {
  if (!run.session) return undefined;
  return deriveSessionDemand(run.session, h2Catalog(), h2Ruleset());
}
