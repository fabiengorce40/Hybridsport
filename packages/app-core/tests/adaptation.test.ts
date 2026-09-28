/**
 * Adaptation sur plusieurs semaines (usage réel simulé) et reprise :
 * - les charges prescrites après la première séance proviennent des tracks du moteur (jamais de l'application) ;
 * - toute séance générée reste valide pour le CORE (p90 ≤ temps disponible) ;
 * - rejouer le même usage produit exactement le même état (déterminisme) ;
 * - reprise Running : sans séance post-retour ⇒ refus ; séances antérieures au retour ignorées.
 */
import { describe, expect, it } from 'vitest';
import { canonicalStringify } from '@hybridsport/engine';
import { addDays, completeOnboarding, emptyState, ensureCurrentWeek, finishSession, logFreeRun, recordSet, startSession } from '../src/index.js';
import type { AppState } from '../src/index.js';
import { clock, MONDAY, profile, runner } from './fixtures.js';

/** L'utilisateur réalise chaque séance disponible : reps = cible exacte ou bas de plage, charge prescrite sinon 30 kg, RIR 2. */
function liveWeeks(weeks: number): { state: AppState; loadSources: string[] } {
  let s = completeOnboarding(emptyState(), profile(), clock());
  const loadSources: string[] = [];
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(MONDAY, 7 * w);
    s = ensureCurrentWeek(s, clock(monday));
    for (const e of s.plans[monday]?.entries ?? []) {
      s = ensureCurrentWeek(s, clock(e.date));
      const g = s.sessions[e.key];
      if (g?.outcome.status !== 'ok') continue;
      expect(g.outcome.estimate?.p90S ?? 0).toBeLessThanOrEqual(e.availableMinutes * 60);
      s = startSession(s, e.key, clock(e.date, '18:00:00'));
      for (const it of g.outcome.session.blocks.flatMap((b) => b.items)) {
        if (it.prescription.type !== 'sets') continue;
        it.prescription.sets.forEach((set, i) => {
          const kg = set.intensity?.mode === 'load' ? set.intensity.kg : set.intensity?.mode === 'percent_of_reference' ? set.intensity.kgRounded : undefined;
          if (kg !== undefined && set.kind !== 'rampup') loadSources.push(it.refs?.prescriptionSource ?? 'none');
          s = recordSet(s, e.key, { itemId: it.id, setIndex: i, done: true, reps: typeof set.reps === 'number' ? set.reps : set.reps.min, loadKg: kg ?? 30, rir: 2 });
        });
      }
      s = finishSession(s, e.key, { difficulty: 'AS_EXPECTED', pain: false, painAreas: [], note: '' }, clock(e.date, '19:00:00'));
    }
  }
  return { state: s, loadSources };
}

describe('adaptation Strength sur 3 semaines', () => {
  const run = liveWeeks(3);

  it('9 séances réalisées, toutes valides ; tracks et expositions alimentées par le moteur', () => {
    expect(Object.values(run.state.logs).filter((l) => l.finishedAt)).toHaveLength(9);
    expect(run.state.strength.tracks.length).toBeGreaterThan(0);
    expect(run.state.fingerprints.strength).toHaveLength(9);
  });

  it('toute charge prescrite provient d’une track ou de l’historique réalisé (jamais une charge inventée)', () => {
    expect(run.loadSources.length).toBeGreaterThan(0);
    expect(run.loadSources.every((x) => x === 'track' || x === 'history')).toBe(true);
  });

  it('déterminisme : même usage ⇒ même état, octet pour octet', () => {
    expect(canonicalStringify(liveWeeks(3).state)).toBe(canonicalStringify(run.state));
  });
});

describe('reprise Running (V34 non validé)', () => {
  it('reprise longue sans séance post-retour : refus RETURN_PROTOCOL_UNRESOLVED', () => {
    const s = completeOnboarding(emptyState(), profile(runner({ returnState: 'LONG', returnStartedAt: '2026-10-01' })), clock());
    const g = Object.values(s.sessions)[0];
    expect(g?.outcome.status === 'unavailable' && g.outcome.reasons.map((r) => r.code)).toContain('STATE.RUNNING.RETURN_PROTOCOL_UNRESOLVED');
  });

  it('reprise courte sans date de reprise : refus (jamais de supposition) ; avec date : séances antérieures au retour ignorées', () => {
    let s = completeOnboarding(emptyState(), profile(runner({ returnState: 'SHORT' })), clock());
    s = logFreeRun(s, { realizedDurationS: 2400, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock('2026-10-05', '06:00:00'));
    const noDate = Object.values(s.sessions).find((g) => g.date > MONDAY);
    expect(noDate?.outcome.status).toBe('unavailable');
    // Reprise déclarée le 2026-10-06 : la course du 5 (avant le retour) ne peut servir d'ancre.
    const p = profile(runner({ returnState: 'SHORT', returnStartedAt: '2026-10-06' }));
    s = completeOnboarding(s, p, clock());
    const later = Object.values(s.sessions).filter((g) => g.date > '2026-10-06');
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((g) => g.outcome.status === 'unavailable')).toBe(true);
  });
});
