import { NON_PERFORMANCE_SKIP_REASONS, PAIN_LEVELS, hoursBetween } from '@hybridsport/domain';
import type { ExecutionRecord, ISODateTime, PainHistoryAvailability, PainLevel, PainReport, ReasonCode } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { AreaRestriction } from '../validation/context.js';

const reasons = createCoreRegistry();

/**
 * Comportement mécanique associé à un niveau P1–P4 : CONTENU G1 (paramètre `safety.pain.levelActions`),
 * à valider par un professionnel de santé avant production. Le code n'en connaît que la forme.
 */
export interface PainLevelAction {
  readonly areaAction: 'none' | 'reduce' | 'exclude';
  readonly movementAction: 'none' | 'exclude';
  readonly suspendHighIntensity: boolean;
  readonly interruptSession: boolean;
  readonly pauseProgram: 'never' | 'always' | 'rule';
}

export interface PainPauseRule { readonly centralAreas: readonly string[]; readonly minAreas: number }
export interface RecurrenceRule { readonly fromLevel: PainLevel; readonly toLevel: PainLevel; readonly windowHours: number; readonly minReports: number }

const isAction = (x: unknown): x is PainLevelAction => {
  if (x === null || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return ['none', 'reduce', 'exclude'].includes(a.areaAction as string) && ['none', 'exclude'].includes(a.movementAction as string)
    && typeof a.suspendHighIntensity === 'boolean' && typeof a.interruptSession === 'boolean' && ['never', 'always', 'rule'].includes(a.pauseProgram as string);
};
const isActionTable = (x: unknown): x is Record<PainLevel, PainLevelAction> =>
  x !== null && typeof x === 'object' && PAIN_LEVELS.every((l) => isAction((x as Record<string, unknown>)[l]));
const isPauseRule = (x: unknown): x is PainPauseRule =>
  x !== null && typeof x === 'object' && Array.isArray((x as Record<string, unknown>).centralAreas) && typeof (x as Record<string, unknown>).minAreas === 'number';
const isRecurrence = (x: unknown): x is RecurrenceRule => {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return PAIN_LEVELS.includes(r.fromLevel as PainLevel) && PAIN_LEVELS.includes(r.toLevel as PainLevel) && typeof r.windowHours === 'number' && typeof r.minReports === 'number';
};

export function readPainActions(ruleset: LoadedRuleset): Record<PainLevel, PainLevelAction> {
  return ruleset.table('safety.pain.levelActions', isActionTable, 'Record<P1..P4, PainLevelAction>');
}

/** Traitement d'un signalement : consentement ⇒ persistance ; sinon usage immédiat uniquement (spec 09 §7.3). */
export function handlePainReport(report: PainReport, healthDataConsent: boolean): { readonly report: PainReport; readonly toPersist: PainReport | null; readonly reasons: readonly ReasonCode[] } {
  if (healthDataConsent) {
    const r = { ...report, persisted: true };
    return { report: r, toPersist: r, reasons: [] };
  }
  return { report: { ...report, persisted: false }, toPersist: null, reasons: [reasons.emit('DATA.NOT_PERSISTED_NO_CONSENT')] };
}

export const isActive = (r: PainReport): boolean => r.resolution === undefined;

export interface SafetyRestrictions {
  readonly areaRestrictions: readonly AreaRestriction[];
  readonly restrictedMovements: readonly string[];
  readonly suspendHighIntensity: boolean;
  readonly interruptSession: boolean;
  readonly pauseProgram: boolean;
  readonly messageKey?: string;
  readonly reasons: readonly ReasonCode[];
}

/**
 * Restrictions prudentes dérivées des signalements ACTIFS selon les règles G1. Fonctionne sans historique
 * (signalement de l'interaction en cours, même non persisté) : l'adaptation immédiate reste possible.
 */
export function deriveSafetyRestrictions(active: readonly PainReport[], ruleset: LoadedRuleset): SafetyRestrictions {
  const actions = readPainActions(ruleset);
  const pause = ruleset.table('safety.pain.pauseRule', isPauseRule, 'PainPauseRule');
  const areas = new Map<string, AreaRestriction>();
  const movements = new Set<string>();
  let suspend = false;
  let interrupt = false;
  let pauseProgram = false;
  const out: ReasonCode[] = [];
  for (const r of active.filter(isActive)) {
    const a = actions[r.level];
    for (const area of r.bodyAreas) {
      if (a.areaAction === 'none') continue;
      const prev = areas.get(area);
      if (!prev || (prev.action === 'reduce' && a.areaAction === 'exclude')) areas.set(area, { area, action: a.areaAction, painLevel: r.level });
    }
    if (a.movementAction === 'exclude') r.affectedMovements.forEach((m) => movements.add(m));
    suspend ||= a.suspendHighIntensity;
    interrupt ||= a.interruptSession;
    const byRule = a.pauseProgram === 'rule' && (r.bodyAreas.some((x) => pause.centralAreas.includes(x)) || r.bodyAreas.length >= pause.minAreas);
    if (a.pauseProgram === 'always' || byRule) pauseProgram = true;
  }
  let messageKey: string | undefined;
  if (interrupt) {
    messageKey = ruleset.string('safety.p4.messageKey');
    out.push(reasons.emit('SAFETY.PAIN.P4_INTERRUPTED', { messageKey }));
  }
  if (pauseProgram) out.push(reasons.emit('SAFETY.PROGRAM_PAUSED', { cause: 'pain' }));
  return {
    areaRestrictions: [...areas.values()].sort((x, y) => (x.area < y.area ? -1 : 1)),
    restrictedMovements: [...movements].sort(), suspendHighIntensity: suspend, interruptSession: interrupt, pauseProgram,
    ...(messageKey !== undefined ? { messageKey } : {}), reasons: out,
  };
}

/**
 * Pipeline P4 (spec 09 §7.2) : P4 → interruption de la séance → blocage de la génération selon le
 * ruleset G1 → message de sécurité localisé (clé de contenu, jamais un texte médical codé en dur).
 */
export function onP4Report(report: PainReport, ruleset: LoadedRuleset): { readonly interruptSession: boolean; readonly programStatus: 'paused_safety' | 'active'; readonly messageKey?: string; readonly reasons: readonly ReasonCode[] } {
  if (report.level !== 'P4') return { interruptSession: false, programStatus: 'active', reasons: [] };
  const r = deriveSafetyRestrictions([report], ruleset);
  return { interruptSession: r.interruptSession, programStatus: r.pauseProgram ? 'paused_safety' : 'active', ...(r.messageKey !== undefined ? { messageKey: r.messageKey } : {}), reasons: r.reasons };
}

/**
 * Détection de récurrence (escalade) : IMPOSSIBLE sans historique — jamais de fausse détection
 * longitudinale quand l'utilisateur n'a pas consenti (spec 09 §7.3).
 */
export function detectRecurrence(history: readonly PainReport[], availability: PainHistoryAvailability, ruleset: LoadedRuleset, now: ISODateTime): { readonly status: 'unavailable' | 'none' | 'escalate'; readonly areas: readonly string[]; readonly toLevel?: PainLevel; readonly reasons: readonly ReasonCode[] } {
  if (availability === 'unavailable') return { status: 'unavailable', areas: [], reasons: [reasons.emit('DATA.HEALTH_HISTORY_UNAVAILABLE')] };
  const rule = ruleset.table('safety.pain.recurrence', isRecurrence, 'RecurrenceRule');
  const counts = new Map<string, number>();
  for (const r of history) {
    if (!r.persisted || r.level !== rule.fromLevel) continue;
    const age = hoursBetween(r.reportedAt as ISODateTime, now);
    if (age < 0 || age > rule.windowHours) continue;
    r.bodyAreas.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
  }
  const areas = [...counts.entries()].filter(([, n]) => n >= rule.minReports).map(([a]) => a).sort();
  return areas.length > 0 ? { status: 'escalate', areas, toLevel: rule.toLevel, reasons: [] } : { status: 'none', areas: [], reasons: [] };
}

/** Exécutions exploitables pour juger la performance : `pain` et `safety_pause` ne sont JAMAIS des échecs. */
export function performanceRelevant(executions: readonly ExecutionRecord[]): { readonly relevant: readonly ExecutionRecord[]; readonly excluded: readonly ExecutionRecord[]; readonly reasons: readonly ReasonCode[] } {
  const excluded = executions.filter((e) => e.skipReason !== undefined && NON_PERFORMANCE_SKIP_REASONS.includes(e.skipReason));
  return {
    relevant: executions.filter((e) => !excluded.includes(e)),
    excluded,
    reasons: excluded.map((e) => reasons.emit('DATA.PERFORMANCE_EXCLUDED', { reason: e.skipReason ?? 'unknown' })),
  };
}
