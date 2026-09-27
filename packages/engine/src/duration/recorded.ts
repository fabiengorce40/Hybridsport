import { DURATION_ESTIMATE_METHOD } from '@hybridsport/domain';
import type { ReasonCode, RecordedDurationEstimate, SemVerString, SessionDraft, SessionRecord } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import { estimateDuration, readDurationParams } from './estimate.js';
import type { AthleteTimingProfile, DurationEstimate } from './estimate.js';
import { checkRunEstimate } from './run-structure.js';

const reasons = createCoreRegistry();

/** Forme stockée d'une estimation produite par le DurationEngine (écriture d'un session_record v4). */
export function toRecordedDurationEstimate(e: DurationEstimate): RecordedDurationEstimate {
  return { availability: 'AVAILABLE', method: DURATION_ESTIMATE_METHOD, unit: 's', p10: e.p10, p50: e.p50, p90: e.p90 };
}

export interface RecordedDurationDeps {
  readonly catalog: LoadedCatalog;
  readonly ruleset: LoadedRuleset;
  readonly engineVersion: SemVerString;
  readonly timing?: AthleteTimingProfile;
}

export type RecordedDurationVerification =
  | { readonly status: 'verified' }
  | { readonly status: 'unavailable'; readonly reason: ReasonCode }
  | { readonly status: 'rejected'; readonly reasons: readonly ReasonCode[] };

/**
 * Vérifie l'estimation stockée d'un session_record (décision fondateur Q2) : recalcul par le
 * DurationEngine avec les MÊMES versions que la provenance du record, puis égalité stricte.
 * - UNAVAILABLE_LEGACY : signalé comme indisponible, jamais reconstitué ;
 * - versions différentes : non vérifiable (refus explicite, pas de comparaison approximative) ;
 * - écart : refus, jamais une réparation silencieuse.
 */
export function verifyRecordedDuration(record: SessionRecord, deps: RecordedDurationDeps): RecordedDurationVerification {
  const stored = record.durationEstimate;
  if (stored.availability === 'UNAVAILABLE_LEGACY') return { status: 'unavailable', reason: reasons.emit('DURATION.ESTIMATE_UNAVAILABLE_LEGACY', { kind: 'session_record' }) };
  const p = record.provenance;
  const versions: [string, string, string][] = [['engine', p.engineVersion, deps.engineVersion], ['ruleset', p.rulesetVersion, deps.ruleset.version], ['catalog', p.catalogVersion, deps.catalog.version]];
  const differing = versions.filter(([, a, b]) => a !== b);
  if (differing.length > 0) {
    return { status: 'rejected', reasons: differing.map(([what, a, b]) => reasons.emit('DURATION.ESTIMATE_UNVERIFIABLE', { problem: `version ${what} ${a} (record) ≠ ${b} (vérificateur)` })) };
  }
  const est = estimateDuration(record.session, deps.catalog, readDurationParams(deps.ruleset, deps.timing));
  if (!est.ok) return { status: 'rejected', reasons: est.reasons };
  const mismatches = (['p10', 'p50', 'p90'] as const).filter((k) => stored[k] !== est.estimate[k]);
  if (mismatches.length === 0) return { status: 'verified' };
  return {
    status: 'rejected',
    reasons: mismatches.map((k) => reasons.emit('DURATION.ESTIMATE_MISMATCH', { path: 'session_record.durationEstimate', field: k, storedMinS: stored[k], storedMaxS: stored[k], recomputedMinS: est.estimate[k], recomputedMaxS: est.estimate[k] })),
  };
}

/** Écarts entre estimations stockées et recalculées des `run_structure` d'une séance. */
export function runEstimateMismatches(session: SessionDraft, prefix: string): ReasonCode[] {
  const out: ReasonCode[] = [];
  session.blocks.forEach((b, bi) => b.items.forEach((it, ii) => {
    if (it.prescription.type !== 'run_structure') return;
    const c = checkRunEstimate(it.prescription);
    if (c.consistent) return;
    out.push(reasons.emit('DURATION.ESTIMATE_MISMATCH', {
      path: `${prefix}.blocks.${String(bi)}.items.${String(ii)}.prescription.estimate`, field: c.field,
      ...(c.stored ? { storedMinS: c.stored.min, storedMaxS: c.stored.max } : {}),
      ...(c.recomputed ? { recomputedMinS: c.recomputed.min, recomputedMaxS: c.recomputed.max } : {}),
    }));
  }));
  return out;
}
