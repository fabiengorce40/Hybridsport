/**
 * RC4.2 — faisabilité des types de séance HYROX (rôles H2) pour un profil, lue du MOTEUR RÉEL (aucune table) : pour
 * chaque rôle, une semaine HYROX seule est planifiée par le chemin Beta 0 complet (programme → planificateur → moteur
 * HYROX) avec le niveau, le matériel, les disponibilités et la coupure DÉCLARÉS. Faisable ⇔ le moteur compose une
 * séance. Sinon : cause décisive (RC3.1 A8) et facteurs lus dans la trace (niveau, matériel, temps, sécurité) ; un
 * facteur non attribuable n'est jamais deviné. Aucune prescription inventée, aucun refus contourné, aucune règle
 * modifiée. Pur : l'état de l'application n'est pas touché.
 */
import type { Clock } from './app.js';
import { HR_ROLE_LABELS } from './labels.js';
import { emptyState } from './model.js';
import type { ProfileInput, Reason } from './model.js';
import { createBeta0Programme } from './beta0-app.js';
import { beta0Environment, selectBeta0Week } from './beta0.js';
import type { ProgrammeEnvironment } from './programme.js';
import { weekStartOf } from './dates.js';
import { feasibilityFactors } from './ct-feasibility.js';
import type { CtFeasibilityFactor } from './ct-feasibility.js';

export interface HrRoleFeasibility {
  readonly role: string;
  /** `unknown` : la sonde n'a pas pu planifier (profil incomplet, erreur) — jamais présenté comme irréalisable. */
  readonly status: 'feasible' | 'infeasible' | 'unknown';
  readonly factors: readonly CtFeasibilityFactor[];
  readonly cause: Reason | null;
}

/** Sonde un rôle (profil HYROX seul, focus spécialisé sur ce rôle, semaine commençant au lundi de `clock`). */
function probe(input: ProfileInput, role: string, clock: Clock, env: ProgrammeEnvironment): HrRoleFeasibility {
  const monday = weekStartOf(clock.today);
  const at: Clock = { today: monday, now: `${monday}T00:00:00Z` };
  const p: ProfileInput = {
    ...input, priorities: ['hyrox'],
    strength: { ...input.strength, enabled: false }, running: { ...input.running, enabled: false }, crosstraining: { enabled: false },
    hyrox: { enabled: true, sessionsPerWeek: 1, role, focus: 'specialized', goal: input.hyrox.goal ?? 'RACE_PREPARATION', returnState: input.hyrox.returnState ?? 'NONE' },
    acceptedProvisionalAt: input.acceptedProvisionalAt ?? at.now,
  };
  try {
    const s = createBeta0Programme(emptyState(), p, at, {}, env);
    const v = (selectBeta0Week(s, monday)?.sessions ?? []).filter((x) => x.sport === 'hyrox');
    if (v.length === 0) return { role, status: 'unknown', factors: [], cause: null };
    if (v.some((x) => x.placement !== 'blocked')) return { role, status: 'feasible', factors: [], cause: null };
    const cause = v[0]?.notPlanned?.reason ?? null;
    // `SAFETY.HYROX.LEVEL_NOT_ELIGIBLE` : refus de NIVEAU (famille SAFETY du code), pas une coupure déclarée.
    const levelOnly = /LEVEL_NOT_ELIGIBLE/.test(cause?.code ?? '');
    return { role, status: 'infeasible', factors: feasibilityFactors(cause).filter((f) => !(levelOnly && f === 'safety')), cause };
  } catch {
    return { role, status: 'unknown', factors: [], cause: null };
  }
}

/** Faisabilité de chaque type de séance HYROX exposé, pour le profil déclaré. */
export function hyroxRoleFeasibility(input: ProfileInput, clock: Clock, env: ProgrammeEnvironment = beta0Environment()): readonly HrRoleFeasibility[] {
  return Object.keys(HR_ROLE_LABELS).map((role) => probe(input, role, clock, env));
}
