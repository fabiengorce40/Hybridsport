/**
 * Reprise 3A — jours Musculation (personnalisation V2.1) définis APRÈS les disponibilités générales et toujours vérifiés
 * contre elles. Lecture seule : aucune préférence n'est modifiée ici (les corrections passent par `withStrengthDays`,
 * appelée seulement sur action explicite de l'utilisateur, ou pour la proposition initiale tant qu'il n'a rien choisi).
 * La règle de récupération reprise ici est EXACTEMENT celle du planificateur (`planning.ts`, `tooClose`) : en régime
 * Full Body (bande à archétype unique), deux séances Musculation espacées de moins de `recoveryHours` sont refusées, y
 * compris d'une semaine à l'autre (expositions récentes) ; la rotation Haut / Bas (4 séances) n'est pas concernée.
 */
import { STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } from '@hybridsport/strength';
import type { ProfileInput } from './model.js';
import { personalizationParams } from './strength-personalization.js';

// technical-constant: jours d'une semaine (lundi = 0 … dimanche = 6, comme `availability`)
const WEEK_DAYS = 7;
// technical-constant: heures d'une journée (écart entre deux dates du planning)
const HOURS_PER_DAY = 24;

export interface StrengthDaysCheck {
  /** Jours disponibles (temps > 0) selon les disponibilités générales. */
  readonly available: readonly number[];
  /** Jours Musculation choisis. */
  readonly chosen: readonly number[];
  /** Choisis mais indisponibles : à signaler, correction seulement avec l'accord de l'utilisateur. */
  readonly incompatible: readonly number[];
  /** Choisis et disponibles : seuls jours utilisables par le planning. */
  readonly usable: readonly number[];
  /** Disponibles mais non retenus pour la Musculation (information, jamais ajoutés d'office). */
  readonly notChosen: readonly number[];
  readonly requested: number;
  /** Assez de jours utilisables pour la fréquence demandée (une séance au plus par jour). */
  readonly enoughDays: boolean;
  /** Règle de récupération applicable (régime Full Body) : délai et nombre maximal de séances plaçables par semaine. */
  readonly recovery: { readonly hours: number; readonly maxSessions: number } | null;
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** Nombre maximal de jours parmi `days` deux à deux espacés d'au moins `hours`, d'une semaine à l'autre comprise. */
function maxSpaced(days: readonly number[], hours: number): number {
  let best = 0;
  // technical-constant: énumération des sous-ensembles d'au plus sept jours (2^7 cas)
  for (let mask = 1; mask < 1 << days.length; mask += 1) {
    const set = days.filter((_, i) => (mask & (1 << i)) !== 0);
    const ok = set.every((d, i) => {
      const nextDay = i + 1 < set.length ? (set[i + 1] ?? d) : (set[0] ?? d) + WEEK_DAYS;
      return set.length === 1 || (nextDay - d) * HOURS_PER_DAY >= hours;
    });
    if (ok) best = Math.max(best, set.length);
  }
  return best;
}

export function strengthDaysCheck(p: ProfileInput): StrengthDaysCheck | null {
  const c = p.strength.personalization;
  if (!p.strength.enabled || !c) return null;
  const available = range(WEEK_DAYS).filter((d) => (p.availability[d] ?? 0) > 0);
  const chosen = [...c.days].sort((a, b) => a - b);
  const usable = chosen.filter((d) => available.includes(d));
  const requested = p.strength.sessionsPerWeek;
  const band = STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.bands.find((b) => b.rotation.length === 1 && b.rotation.includes('str_full_body'));
  const hours = personalizationParams()['strength.personalization']?.recoveryHours;
  const recovery = band && hours !== undefined && requested <= band.maxSessions ? { hours, maxSessions: maxSpaced(usable, hours) } : null;
  return {
    available, chosen, usable, requested, recovery,
    incompatible: chosen.filter((d) => !available.includes(d)),
    notChosen: available.filter((d) => !chosen.includes(d)),
    enoughDays: usable.length >= requested,
  };
}

/** Jours Musculation remplacés (triés, sans doublon) ; la personnalisation reste confirmée. Aucun effet sans personnalisation. */
export function withStrengthDays(p: ProfileInput, days: readonly number[]): ProfileInput {
  const c = p.strength.personalization;
  const next = [...new Set(days)].filter((d) => d >= 0 && d < WEEK_DAYS).sort((a, b) => a - b);
  if (!c || next.length === 0) return p;
  return { ...p, strength: { ...p.strength, personalization: { ...c, days: next } } };
}
