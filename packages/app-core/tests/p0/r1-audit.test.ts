/**
 * R1 — audit ciblé (Strength, HYROX) par le chemin RÉEL de l'application : la variété Strength A/B/A et Upper/Lower
 * existe et n'est plus masquée ; HYROX : la répétition est SIGNALÉE (jamais corrigée en inventant), les transitions ne
 * sont jamais chronométrées ni estimées. Aucune prescription n'est modifiée par ces lectures.
 */
import { describe, expect, it } from 'vitest';
import { createBeta0Programme, emptyState, ensureBeta0Week, selectBeta0Week, selectBetaJournal, selectProgrammeSession } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { at, create, doHr, hrProfile, request, ROLE, workoutOf } from '../hr/hr-fixtures.js';

function strengthOnly(n: number): AppState {
  return createBeta0Programme(emptyState(), profile({ level: 'intermediate', priorities: ['strength'], strength: { enabled: true, goal: 'general', sessionsPerWeek: n }, availability: [60, 60, 60, 60, 60, 60, 60] }), clock(), {});
}
const strength = (s: AppState, w = '2026-10-05') => (selectBeta0Week(s, w)?.sessions ?? []).filter((x) => x.sport === 'strength');

describe('R1 — Strength : variété réelle visible', () => {
  it('R1-S1. 3 séances : Full body ×3, alternance A/B/A — A et B différents, le second A n’est pas une copie du premier', () => {
    const xs = strength(strengthOnly(3));
    expect(xs.map((x) => x.archetypeId)).toEqual(['str_full_body', 'str_full_body', 'str_full_body']);
    const [a, b, a2] = xs.map((x) => x.mainExercises);
    expect(a?.[0]).not.toBe(b?.[0]);
    expect(a2?.[0]).toBe(a?.[0]);
    expect(a2).not.toEqual(a);
  });
  it('R1-S2. 4 séances : Upper / Lower / Upper / Lower, exercices principaux distincts par type', () => {
    const xs = strength(strengthOnly(4));
    expect(xs.map((x) => x.archetypeId)).toEqual(['str_lower', 'str_upper', 'str_lower', 'str_upper']);
    expect(xs[0]?.mainExercises).not.toEqual(xs[2]?.mainExercises);
  });
  it('R1-S3. continuité S4 : une même séance de la semaine suivante reprend les mêmes exercices (règle de continuité, pas un bug)', () => {
    const s = ensureBeta0Week(strengthOnly(2), at('2026-10-12T07:30:00.000Z'));
    expect(strength(s, '2026-10-12').map((x) => x.mainExercises)).toEqual(strength(s).map((x) => x.mainExercises));
  });
  it('R1-S4. mainExercises = exercices PRESCRITS du bloc principal (hors échauffement, aucun ajout)', () => {
    const s = strengthOnly(1);
    const x = strength(s)[0];
    const v = selectProgrammeSession(s, x?.requestId ?? '');
    const prescribed = (v?.session.blocks ?? []).filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items.map((i) => i.exerciseId));
    expect(x?.mainExercises).toEqual(prescribed);
  });
});

describe('R1 — HYROX : répétition signalée, transitions non quantifiées', () => {
  it('R1-H1. stations épuisées dans la fenêtre de récence : séance identique SIGNALÉE (vue, journal), jamais inventée', () => {
    let s = create(hrProfile({ hr: { role: ROLE('partial_simulation'), sessionsPerWeek: 2 } }));
    for (const x of (selectBeta0Week(s, '2026-10-05')?.sessions ?? []).filter((y) => y.sport === 'hyrox')) if (x.date) s = doHr(s, x.requestId, `${x.date}T18:00:00.000Z`, `${x.date}T18:40:00.000Z`, 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } });
    s = ensureBeta0Week(s, at('2026-10-12T07:30:00.000Z'));
    const xs = (selectBeta0Week(s, '2026-10-12')?.sessions ?? []).filter((y) => y.sport === 'hyrox');
    const comps = xs.map((x) => JSON.stringify(workoutOf(s, x.requestId)?.components.map((c) => c.exerciseId)));
    expect(comps[0]).toBe(comps[1]);
    expect(xs[1]?.repeatFlagged).toBe(true);
    expect(selectBetaJournal(s).find((e) => e.requestId === xs[1]?.requestId)?.repeatFlagged).toBe(true);
  });
  it('R1-H2. transitions : comptées, durée « inconnue », exclues de l’estimation ; aucune étape chronométrée inventée', () => {
    const s = create(hrProfile({ hr: { role: ROLE('strength_endurance'), sessionsPerWeek: 1 } }));
    const id = (selectBeta0Week(s, '2026-10-05')?.sessions ?? []).find((y) => y.sport === 'hyrox')?.requestId ?? '';
    const t = request(s, id)?.reasons.find((x) => x.code.endsWith('H2_TRANSITIONS'))?.params;
    expect(t).toMatchObject({ durationS: 'unknown', estimate: 'excluded' });
    expect(workoutOf(s, id)?.components.every((c) => c.kind === 'station' || c.kind === 'run')).toBe(true);
  });
  it('R1-H3. aucune répétition signalée sur une première semaine variée (le drapeau ne se déclenche pas à tort)', () => {
    const s = create(hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 } }));
    expect((selectBeta0Week(s, '2026-10-05')?.sessions ?? []).every((x) => !x.repeatFlagged)).toBe(true);
  });
});
