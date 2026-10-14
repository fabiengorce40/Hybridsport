/**
 * RC3.2 A3 — faisabilité des intentions Cross-training pour un profil, lue du MOTEUR RÉEL (aucune table de
 * compatibilité) : pour chaque intention, une semaine Cross-training seule est planifiée par le chemin Beta 0 complet
 * (programme → planificateur → moteur Cross-training, délégation Musculation comprise) avec le matériel, le niveau, les
 * disponibilités et la coupure DÉCLARÉS. Faisable ⇔ le moteur compose une séance (placée, ou composée non placée).
 * Sinon : cause décisive persistée (RC3.1 A8) et facteurs lus dans la trace du moteur (temps, matériel, niveau,
 * sécurité) ; un facteur non attribuable n'est jamais deviné. Pur : l'état de l'application n'est pas touché.
 */
import type { Clock } from './app.js';
import { CT_INTENT_LABELS } from './labels.js';
import { emptyState } from './model.js';
import type { ProfileInput, Reason } from './model.js';
import { createBeta0Programme } from './beta0-app.js';
import { beta0Environment, selectBeta0Week } from './beta0.js';
import type { ProgrammeEnvironment } from './programme.js';
import { weekStartOf } from './dates.js';

export type CtFeasibilityFactor = 'time' | 'equipment' | 'level' | 'safety';
export interface CtIntentFeasibility {
  readonly intent: string;
  /** `unknown` : la sonde n'a pas pu planifier (profil incomplet, erreur) — jamais présenté comme irréalisable. */
  readonly status: 'feasible' | 'infeasible' | 'unknown';
  readonly factors: readonly CtFeasibilityFactor[];
  readonly cause: Reason | null;
}

/** Facteurs lus dans la trace du moteur (essais de format, cause de délégation), sans interprétation sportive. */
function factorsOf(cause: Reason | null): CtFeasibilityFactor[] {
  if (!cause) return [];
  const text = [cause.code, String(cause.params.cause ?? ''), ...(Array.isArray(cause.params.tried) ? cause.params.tried.map(String) : [])].join(' ');
  const out: CtFeasibilityFactor[] = [];
  if (/^SAFETY\.|RETURN_NOT_SUPPORTED/.test(text)) out.push('safety');
  if (/EXCEEDS_AVAILABLE_TIME|OUTSIDE_TIME_DOMAIN|TIME_EXCEEDED|BELOW_ARCHETYPE_MIN/.test(text)) out.push('time');
  if (/ROLE_UNFILLED|EQUIPMENT|STATIONS_UNFILLED|WITHOUT_EXTERNAL_LOAD|MOVEMENT_INELIGIBLE/.test(text)) out.push('equipment');
  if (/DOSE_UNDECIDED:(beginner|intermediate|advanced)|LEVEL_NOT_ELIGIBLE/.test(text)) out.push('level');
  return out;
}

/** Sonde une intention (profil Cross-training seul, semaine commençant au lundi de `clock`). */
function probe(input: ProfileInput, intent: string, clock: Clock, env: ProgrammeEnvironment): CtIntentFeasibility {
  const monday = weekStartOf(clock.today);
  const at: Clock = { today: monday, now: `${monday}T00:00:00Z` };
  const p: ProfileInput = {
    ...input, priorities: ['crosstraining'],
    strength: { ...input.strength, enabled: false }, running: { ...input.running, enabled: false }, hyrox: { enabled: false },
    crosstraining: { enabled: true, sessionsPerWeek: 1, intent, returnState: input.crosstraining.returnState ?? 'NONE' },
    acceptedProvisionalAt: input.acceptedProvisionalAt ?? at.now,
  };
  try {
    const s = createBeta0Programme(emptyState(), p, at, {}, env);
    const v = (selectBeta0Week(s, monday)?.sessions ?? []).filter((x) => x.sport === 'crosstraining');
    if (v.length === 0) return { intent, status: 'unknown', factors: [], cause: null };
    if (v.some((x) => x.placement !== 'blocked')) return { intent, status: 'feasible', factors: [], cause: null };
    const cause = v[0]?.notPlanned?.reason ?? null;
    return { intent, status: 'infeasible', factors: factorsOf(cause), cause };
  } catch {
    return { intent, status: 'unknown', factors: [], cause: null };
  }
}

/** Faisabilité de toutes les intentions Cross-training exposées, pour le profil déclaré. */
export function ctIntentFeasibility(input: ProfileInput, clock: Clock, env: ProgrammeEnvironment = beta0Environment()): readonly CtIntentFeasibility[] {
  return Object.keys(CT_INTENT_LABELS).map((intent) => probe(input, intent, clock, env));
}
