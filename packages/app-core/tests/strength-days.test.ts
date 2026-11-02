/**
 * Reprise 3A — jours Musculation vérifiés contre les disponibilités générales ; explication de la fréquence IDENTIQUE à
 * la décision du planificateur (règle de récupération Full Body), vérifiée sur de vraies semaines générées.
 */
import { describe, expect, it } from 'vitest';
import { createBeta0Programme, defaultStrengthPersonalization, emptyState, strengthDaysCheck, withStrengthDays, withStrengthPersonalization } from '../src/index.js';
import type { AppState, ProfileInput } from '../src/index.js';
import { clock, MONDAY, profile } from './fixtures.js';

/** Profil Musculation seule, personnalisation confirmée ; `availability` et `days` explicites (lundi = 0). */
function strengthProfile(availability: number[], days: number[], sessionsPerWeek: number): ProfileInput {
  const base = profile({ priorities: ['strength'], availability, strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek }, running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } });
  return withStrengthPersonalization(base, { ...defaultStrengthPersonalization(base), completed: true, outcome: 'muscle', experience: { months: 24, regularSessions: 3, technique: 'confident' }, days });
}
const strengthRequests = (s: AppState) => s.planner.weeks[MONDAY]?.requests.filter((r) => r.sport === 'strength') ?? [];
const recoveryRefusals = (s: AppState) => strengthRequests(s).filter((r) => r.status !== 'planned' && (r.reasons ?? []).some((x) => x.code === 'PLAN.PERSONALIZATION_BLOCKED' && x.params.cause === 'strength_recovery_window'));
const H60 = 60;

describe('Reprise 3A — jours Musculation', () => {
  it('jours choisis, utilisables, incompatibles et disponibles non retenus', () => {
    const p = strengthProfile([H60, 0, H60, H60, 0, H60, 0], [0, 1, 2, 4], 2);
    expect(strengthDaysCheck(p)).toMatchObject({ available: [0, 2, 3, 5], chosen: [0, 1, 2, 4], usable: [0, 2], incompatible: [1, 4], notChosen: [3, 5], requested: 2, enoughDays: true });
  });

  it('sans Musculation ou sans personnalisation : aucune vérification', () => {
    const p = strengthProfile([H60, H60, H60, H60, H60, H60, H60], [0], 1);
    expect(strengthDaysCheck({ ...p, strength: { ...p.strength, enabled: false } })).toBeNull();
    const { personalization: _, ...legacy } = p.strength;
    expect(strengthDaysCheck({ ...p, strength: legacy })).toBeNull();
  });

  it('fréquence supérieure aux jours utilisables : signalée', () => {
    expect(strengthDaysCheck(strengthProfile([H60, H60, 0, 0, 0, 0, 0], [0, 1], 3))?.enoughDays).toBe(false);
  });

  it('récupération Full Body : nombre maximal de séances espacées, semaine suivante comprise', () => {
    const all = [H60, H60, H60, H60, H60, H60, H60];
    expect(strengthDaysCheck(strengthProfile(all, [0, 1, 2], 3))?.recovery).toEqual({ hours: 36, maxSessions: 2 });
    expect(strengthDaysCheck(strengthProfile(all, [0, 2, 4], 3))?.recovery?.maxSessions).toBe(3);
    // Dimanche puis lundi : 24 h d'une semaine à l'autre, refusé par le planificateur (expositions récentes).
    expect(strengthDaysCheck(strengthProfile(all, [0, 3, 6], 3))?.recovery?.maxSessions).toBe(2);
    // 4 séances : rotation Haut / Bas, règle non applicable.
    expect(strengthDaysCheck(strengthProfile(all, [0, 1, 2, 3], 4))?.recovery).toBeNull();
  });

  it('cohérence avec le planificateur : jours consécutifs ⇒ séance refusée pour récupération, jours espacés ⇒ tout est placé', () => {
    const consecutive = strengthProfile([H60, H60, H60, 0, 0, 0, 0], [0, 1, 2], 3);
    const s1 = createBeta0Programme(emptyState(), consecutive, clock(), {});
    const max1 = strengthDaysCheck(consecutive)?.recovery?.maxSessions ?? -1;
    expect(strengthRequests(s1).filter((r) => r.status === 'planned')).toHaveLength(max1);
    expect(recoveryRefusals(s1)).toHaveLength(3 - max1);
    const spaced = strengthProfile([H60, 0, H60, 0, H60, 0, 0], [0, 2, 4], 3);
    const s2 = createBeta0Programme(emptyState(), spaced, clock(), {});
    expect(strengthRequests(s2).filter((r) => r.status === 'planned')).toHaveLength(strengthDaysCheck(spaced)?.recovery?.maxSessions ?? -1);
    expect(recoveryRefusals(s2)).toHaveLength(0);
  });

  it('withStrengthDays : tri, sans doublon, personnalisation toujours confirmée ; jamais vide', () => {
    const p = strengthProfile([H60, H60, H60, H60, H60, H60, H60], [0], 1);
    const q = withStrengthDays(p, [4, 2, 4]);
    expect(q.strength.personalization?.days).toEqual([2, 4]);
    expect(q.strength.personalization?.completed).toBe(true);
    expect(withStrengthDays(p, [])).toBe(p);
  });
});
