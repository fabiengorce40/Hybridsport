/**
 * « Modifier le programme » (recreateBeta0Programme) : aperçu des conséquences, semaine commencée REPRISE telle quelle
 * (WEEK_NOT_REPLACEABLE), séance en cours protégée, semaine non commencée replanifiée, historique conservé, date
 * d'objectif préremplie, nouvelles intentions composées par Strength S1. États de départ : AppState RÉELS pré-S1.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AppError, beta0Integrity, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, finishProgrammeSession, previewBeta0Recreation,
  recreateBeta0Programme, selectBeta0Week, selectHistory, startProgrammeSession,
} from '../src/index.js';
import type { AppState, ProfileInput } from '../src/index.js';
import { clock, profile } from './fixtures.js';

const fixture = (f: string): AppState => { const d = decodeState(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')); if (!d.ok) throw new Error(d.problem); return d.state; };
const MON = '2026-10-05';
const WED = '2026-10-07';
const NEXT = '2026-10-12';
const asInput = (s: AppState): ProfileInput => s.profile as ProfileInput;
const strengthOf = (s: AppState, day: string) => (selectBeta0Week(s, day)?.sessions ?? []).filter((x) => x.sport === 'strength');

describe('semaine pré-S1 COMMENCÉE (séance de lundi terminée), modification le mercredi', () => {
  const s0 = ensureBeta0Week(fixture('pre-s1-started-state.json'), clock(WED));

  it('aperçu : semaine conservée, nouvelles intentions dès le lundi 12', () => {
    expect(previewBeta0Recreation(s0, WED)).toEqual({ appliesFrom: NEXT, currentWeek: 'kept', sessionInProgress: null, pastSessionsDropped: 0, runningTargetDate: null });
  });

  it('semaine REPRISE à l’identique (même semaine persistée, résultat conservé), séances restantes réalisables ; historique conservé', () => {
    const s = recreateBeta0Programme(s0, asInput(s0), clock(WED, '10:00:00'), {});
    expect(s.planner.weeks[MON]).toEqual(s0.planner.weeks[MON]);
    expect(s.programmeState?.definition.programmeId).not.toBe(s0.programmeState?.definition.programmeId);
    expect(s.programmeState?.results.map((r) => [r.requestId, r.weekIndex])).toEqual([['2026-10-05.strength.1', 0]]);
    expect(strengthOf(s, WED).map((x) => [x.archetypeId, x.status])).toEqual([['str_full_body', 'modified'], ['str_full_body', 'planned'], ['str_full_body', 'planned'], ['str_full_body', 'planned']]);
    expect(selectHistory(s).map((h) => [h.requestId, h.completion])).toEqual([['2026-10-05.strength.1', 'modified']]);
    const done = finishProgrammeSession(startProgrammeSession(s, clock('2026-10-08', '17:00:00'), '2026-10-05.strength.2'), clock('2026-10-08', '18:00:00'), { requestId: '2026-10-05.strength.2', completion: 'modified', pain: false });
    expect(done.programmeState?.results.map((r) => r.requestId)).toEqual(['2026-10-05.strength.1', '2026-10-05.strength.2']);
    expect((s.programmeState?.audit ?? []).map((a) => a.reason.code)).toContain('KAIRO.PROGRAMME_RECREATED');
    expect(beta0Integrity(s)).toEqual([]);
  });

  it('semaine suivante : nouvelles intentions composées par Strength S1 ; semaine reprise clôturée normalement', () => {
    const s = recreateBeta0Programme(s0, { ...asInput(s0), displayName: 'Fabien' }, clock(WED, '10:00:00'), {});
    const n = ensureBeta0Week(s, clock(NEXT));
    expect(strengthOf(n, NEXT).map((x) => x.archetypeId)).toEqual(['str_upper', 'str_lower', 'str_upper', 'str_lower']);
    expect(n.programmeState?.weeks.find((w) => w.weekIndex === 0)?.closedAt).toBeDefined();
    expect(n.profile?.displayName).toBe('Fabien');
  });

  it('séance EN COURS : modification refusée, rien n’est modifié', () => {
    const inProgress = startProgrammeSession(s0, clock(WED), '2026-10-05.strength.3');
    expect(previewBeta0Recreation(inProgress, WED).sessionInProgress).toBe('2026-10-05.strength.3');
    expect(() => recreateBeta0Programme(inProgress, asInput(inProgress), clock(WED, '10:00:00'), {})).toThrow(AppError);
  });

  it('export / import après modification : identique', () => {
    const s = recreateBeta0Programme(s0, asInput(s0), clock(WED, '10:00:00'), {});
    const d = decodeState(exportState(s));
    if (!d.ok) throw new Error(d.problem);
    expect(d.state).toEqual(s);
  });
});

describe('semaine NON commencée', () => {
  it('pré-S1 ouverte mercredi (lundi passé, rien enregistré) : replanifiée dès aujourd’hui par S1, séances passées non réalisées retirées et comptées', () => {
    const s0 = ensureBeta0Week(fixture('pre-s1-state.json'), clock(WED));
    expect(previewBeta0Recreation(s0, WED)).toMatchObject({ appliesFrom: MON, currentWeek: 'replanned', pastSessionsDropped: 2 });
    const s = recreateBeta0Programme(s0, asInput(s0), clock(WED, '10:00:00'), {});
    expect(strengthOf(s, WED).filter((x) => x.date !== null).map((x) => [x.date, x.archetypeId])).toEqual([[WED, 'str_upper'], ['2026-10-09', 'str_lower']]);
    expect(beta0Integrity(s)).toEqual([]);
  });

  it('date d’objectif Course du programme actuel : préremplie par l’aperçu (jamais perdue en silence)', () => {
    const s = createBeta0Programme(emptyState(), profile({
      priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 },
      running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' },
    }), clock(MON), { runningTargetDate: '2027-03-14', lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
    expect(previewBeta0Recreation(s, MON).runningTargetDate).toBe('2027-03-14');
  });
});
