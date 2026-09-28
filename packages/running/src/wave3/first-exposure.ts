/**
 * Première exposition à une séance de qualité (décision produit D2, E-FIRST option B, revue sourcée
 * docs/kairo/RUNNING-D2-D6-REVIEW.md). Appliquée UNIQUEMENT dans la branche « sinon » de V19 : aucune dose
 * réalisée récente du même archétype (NO_REALIZED_SESSION, NOT_RECENT).
 *
 * - La structure vient EXCLUSIVEMENT du registre (`running.firstExposure.threshold` / `.severe`), par niveau.
 * - Elle exige un TEST récent (contre-la-montre déclaré au registre, bande RECENT V12) : le TEST fixe
 *   l'intensité, il ne sert JAMAIS à calculer le volume.
 * - HILLS : première exposition bloquée par valeur gouvernée explicite (sources illisibles, §N).
 */
import type { ReasonCode } from '@hybridsport/domain';
import type { RunningContext } from '../context.js';
import type { RunningLevel, RunningMode } from '../model.js';
import { MS_PER_WEEK } from '../references.js';
import type { RunningReference } from '../references.js';
import { resolveParameter } from '../governance/parameters.js';
import type { RunningParameter } from '../governance/parameters.js';
import { RUNNING_CODES, runningReasons } from '../codes.js';
import { zRealizedStructure } from '../wave2/history.js';
import type { RealizedStructure } from '../wave2/history.js';
import type { QualityArchetype } from './guards.js';

export const FIRST_EXPOSURE_PARAMETER: Readonly<Record<QualityArchetype, string>> = {
  THRESHOLD: 'running.firstExposure.threshold', SEVERE: 'running.firstExposure.severe', SHORT_INTERVAL: 'running.firstExposure.severe', HILLS: 'running.firstExposure.hills',
};
const V12 = 'running.reference.recencyBands';

export type FirstExposure =
  | { readonly status: 'applied'; readonly structure: RealizedStructure; readonly parameterId: string; readonly testReferenceId: string; readonly testDate: RunningReference['date']; readonly reasons: readonly ReasonCode[]; readonly parameterIds: readonly string[] }
  | { readonly status: 'refused'; readonly reasons: readonly ReasonCode[] };

interface Requirement { readonly referenceType: string; readonly distancesM: readonly number[]; readonly recencyBand: string }

function readRequirement(v: unknown): Requirement | undefined {
  const r = (v as { requires?: unknown } | null)?.requires as Record<string, unknown> | undefined;
  if (!r || typeof r.referenceType !== 'string' || !Array.isArray(r.distancesM) || r.distancesM.length === 0 || !r.distancesM.every((d) => typeof d === 'number' && d > 0) || r.recencyBand !== 'RECENT') return undefined;
  return { referenceType: r.referenceType, distancesM: r.distancesM as number[], recencyBand: r.recencyBand };
}

/** Table par niveau : `byLevel` (THRESHOLD) ou `byArchetype[archetype].byLevel` (SEVERE, SHORT_INTERVAL). */
function readTable(v: unknown, a: QualityArchetype): Readonly<Record<string, unknown>> | undefined {
  const o = v as { byLevel?: unknown; byArchetype?: Record<string, { byLevel?: unknown } | undefined> } | null;
  const t = o?.byArchetype ? o.byArchetype[a]?.byLevel : o?.byLevel;
  return t !== null && typeof t === 'object' ? t as Record<string, unknown> : undefined;
}

export interface FirstExposureInput {
  readonly archetype: QualityArchetype;
  readonly level: RunningLevel;
  readonly ctx: RunningContext;
  readonly now: string;
  readonly parameters: readonly RunningParameter[];
  readonly mode: RunningMode;
}

/** Test récent valide : type et distances du registre, non futur, dans la bande RECENT (V12), sans interruption déclarée. */
export function recentTest(refs: readonly RunningReference[], req: Requirement, recentMaxWeeks: number, now: string): RunningReference | undefined {
  const nowMs = Date.parse(now);
  return refs
    .filter((r) => r.type === req.referenceType && r.values.distanceM !== undefined && req.distancesM.includes(r.values.distanceM)
      && Date.parse(r.date) <= nowMs && (nowMs - Date.parse(r.date)) / MS_PER_WEEK <= recentMaxWeeks && r.confidenceInputs.interruptionSince === 'NONE')
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : x.referenceId < y.referenceId ? -1 : 1))[0];
}

export function firstExposure(i: FirstExposureInput): FirstExposure {
  const parameterId = FIRST_EXPOSURE_PARAMETER[i.archetype];
  const refuse = (cause: string, extra: readonly ReasonCode[] = []): FirstExposure =>
    ({ status: 'refused', reasons: [...extra, runningReasons.emit(RUNNING_CODES.FIRST_EXPOSURE_REFUSED, { archetype: i.archetype, parameterId, cause })] });
  const p = resolveParameter(i.parameters, parameterId, i.mode);
  if (p.status !== 'resolved') return refuse('PARAMETER_UNRESOLVED', p.reasons);
  if ((p.value as { policy?: unknown } | null)?.policy === 'BLOCKED_PENDING_SOURCES') return refuse('BLOCKED_PENDING_SOURCES', p.reasons);
  const req = readRequirement(p.value);
  const raw = readTable(p.value, i.archetype)?.[i.level];
  const parsed = zRealizedStructure.safeParse(raw);
  if (!req || !parsed.success || !(parsed.data.reps > 1)) return refuse('VALUE_UNREADABLE', p.reasons);
  const bands = resolveParameter(i.parameters, V12, i.mode);
  const weeks = bands.status === 'resolved' ? (bands.value as { recentMaxWeeks?: unknown }).recentMaxWeeks : undefined;
  if (typeof weeks !== 'number' || !(weeks > 0)) return refuse('RECENCY_UNRESOLVED', [...p.reasons, ...bands.reasons]);
  const test = recentTest(i.ctx.references, req, weeks, i.now);
  if (!test) return refuse('RECENT_TEST_REQUIRED', [...p.reasons, ...bands.reasons]);
  return {
    status: 'applied', structure: parsed.data, parameterId, testReferenceId: test.referenceId, testDate: test.date, parameterIds: [parameterId, V12],
    reasons: [...p.reasons, ...bands.reasons, runningReasons.emit(RUNNING_CODES.FIRST_EXPOSURE_APPLIED, { archetype: i.archetype, level: i.level, parameterId, testReferenceId: test.referenceId })],
  };
}
