/**
 * FAST TRACK V1 — séance manquée : déclarer « non réalisée » (jamais une réalisation), reporter vers un jour admis de la
 * même semaine (disponible, libre, sans conflit de récupération), aucune accumulation, pause douleur respectée.
 */
import { describe, expect, it } from 'vitest';
import { addDays, createBeta0Programme, declareSessionMissed, decodeState, emptyState, exportState, missedSessionOptions, postponeSession, selectBeta0Week, selectHistory, SESSION_POSTPONED } from '../src/index.js';
import type { AppState } from '../src/index.js';
import { clock, profile } from './fixtures.js';

const MON = '2026-10-05';
const TUE = '2026-10-06';
function programme(): AppState {
  return createBeta0Programme(emptyState(), profile({
    priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 },
    running: { enabled: true, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' }, availability: [60, 60, 60, 60, 60, 60, 60],
  }), clock(MON), { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } });
}
const planned = (s: AppState) => (selectBeta0Week(s, MON)?.sessions ?? []).filter((x) => x.status === 'planned');

describe('séance manquée', () => {
  it('options : jours admis libres, disponibles, sans conflit ; jours occupés refusés ; jamais avant aujourd’hui', () => {
    const s = programme();
    const first = (s.planner.weeks[MON]?.requests ?? []).filter((r) => r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))[0];
    if (!first) throw new Error('séance attendue');
    const o = missedSessionOptions(s, clock(TUE), first.requestId);
    if (!o) throw new Error('options attendues');
    const busy = new Set((s.planner.weeks[MON]?.requests ?? []).filter((r) => r.status === 'planned' && r.requestId !== first.requestId).map((r) => r.date));
    for (const d of o.postpone) { expect(busy.has(d)).toBe(false); expect(d >= TUE).toBe(true); }
    expect(o.refused.filter((x) => x.cause === 'occupied').every((x) => busy.has(x.date))).toBe(true);
    expect([...o.postpone, ...o.refused.map((x) => x.date)].every((d) => d >= TUE)).toBe(true);
  });

  it('« Je ne l’ai pas faite » : résultat manqué déclaré, aucune réalisation ni exposition, plus d’option ensuite', () => {
    const s = programme();
    const r = (s.planner.weeks[MON]?.requests ?? []).find((x) => x.status === 'planned' && x.sport === 'strength');
    if (!r) throw new Error('séance attendue');
    const m = declareSessionMissed(s, clock(MON, '20:00:00'), r.requestId);
    expect(m.programmeState?.results.find((x) => x.requestId === r.requestId)).toMatchObject({ completion: 'missed', provenance: 'declared' });
    expect(m.strength).toEqual(s.strength);
    expect(selectHistory(m).find((e) => e.requestId === r.requestId)?.completion).toBe('missed');
    expect(missedSessionOptions(m, clock(MON, '20:00:00'), r.requestId)).toBeNull();
    expect(() => declareSessionMissed(m, clock(MON, '20:00:00'), r.requestId)).toThrow('MISSED_NOT_ALLOWED');
  });

  it('report vers un jour admis : date déplacée, jour libéré, tracé ; prescription inchangée ; jour refusé ⇒ refus', () => {
    const s = programme();
    const reqs = (s.planner.weeks[MON]?.requests ?? []).filter((x) => x.status === 'planned');
    const pick = reqs.map((r) => ({ r, o: missedSessionOptions(s, clock(MON), r.requestId) })).find((x) => (x.o?.postpone.length ?? 0) > 0);
    if (!pick?.o) throw new Error('au moins un report admis attendu');
    const to = pick.o.postpone[0] as string;
    const n = postponeSession(s, clock(MON), pick.r.requestId, to);
    const moved = n.planner.weeks[MON]?.requests.find((x) => x.requestId === pick.r.requestId);
    expect(moved?.date).toBe(to);
    expect(moved?.record).toEqual(pick.r.record);
    expect(n.planner.weeks[MON]?.days.find((d) => d.date === to)).toMatchObject({ status: 'planned', requestId: pick.r.requestId });
    expect(n.planner.weeks[MON]?.days.find((d) => d.date === pick.r.date)?.requestId).not.toBe(pick.r.requestId);
    expect(n.programmeState?.weeks[0]?.requests.find((x) => x.requestId === pick.r.requestId)?.date).toBe(to);
    expect(n.programmeState?.audit.at(-1)?.reason).toEqual({ code: SESSION_POSTPONED, params: { requestId: pick.r.requestId, from: pick.r.date, to } });
    expect(planned(n).length).toBe(planned(s).length);
    const bad = pick.o.refused[0]?.date ?? '2026-10-04';
    expect(() => postponeSession(s, clock(MON), pick.r.requestId, bad)).toThrow('POSTPONE_NOT_ALLOWED');
  });

  it('récupération Musculation : un Full body n’est jamais reporté à moins de 36 h d’un autre Full body (avant ou après)', () => {
    const s = programme();
    const fb = (s.planner.weeks[MON]?.requests ?? []).find((x) => x.status === 'planned' && x.sport === 'strength' && x.date === MON);
    if (!fb) throw new Error('Full body du lundi attendu');
    const o = missedSessionOptions(s, clock(MON), fb.requestId);
    const strengthDates = (s.planner.weeks[MON]?.requests ?? []).filter((x) => x.status === 'planned' && x.sport === 'strength' && x.requestId !== fb.requestId).map((x) => Date.parse(x.date ?? ''));
    for (const d of o?.postpone ?? []) for (const t of strengthDates) expect(Math.abs(Date.parse(d) - t) / 3600000).toBeGreaterThanOrEqual(36);
    expect(o?.refused.some((x) => x.cause === 'recovery')).toBe(true);
  });

  it('séance commencée : ni déclaration ni report', () => {
    const s = programme();
    const r = (s.planner.weeks[MON]?.requests ?? []).find((x) => x.status === 'planned');
    if (!r) throw new Error('séance attendue');
    const started = { ...s, programmeLogs: { ...s.programmeLogs, [r.requestId]: { requestId: r.requestId, startedAt: `${MON}T07:00:00Z`, sets: [], painItems: [] } } } as unknown as AppState;
    expect(missedSessionOptions(started, clock(MON), r.requestId)).toBeNull();
  });

  it('P1 corrigé — récupération au changement de semaine : un Full Body n’est pas reporté au dimanche quand un Full Body est déjà planifié le lundi suivant', () => {
    // Musculation seule (3 × Full Body) : le dimanche est libre, seule la récupération peut le refuser.
    const base = createBeta0Programme(emptyState(), profile({ priorities: ['strength'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 }, running: { ...profile().running, enabled: false }, availability: [60, 60, 60, 60, 60, 60, 60] }), clock(MON), {});
    const week = base.planner.weeks[MON];
    if (!week) throw new Error('semaine attendue');
    const NEXT = addDays(MON, 7);
    const shift = (d?: string) => (d ? addDays(d, 7) : d);
    // Semaine suivante DÉJÀ planifiée (copie décalée, identifiants distincts) ; état validé par le schéma 5.
    const next = { ...week, weekStart: NEXT, days: week.days.map((d) => ({ ...d, date: addDays(d.date, 7), ...(d.requestId ? { requestId: d.requestId.replace(MON, NEXT) } : {}) })), requests: week.requests.map((r) => ({ ...r, requestId: r.requestId.replace(MON, NEXT), ...(r.date ? { date: shift(r.date) } : {}) })) };
    const decoded = decodeState(exportState({ ...base, planner: { ...base.planner, weeks: { ...base.planner.weeks, [NEXT]: next } } }));
    if (!decoded.ok) throw new Error(decoded.problem);
    const SAT = addDays(MON, 5); const SUN = addDays(MON, 6);
    const reqs = (decoded.state.planner.weeks[MON]?.requests ?? []).filter((r) => r.status === 'planned' && r.sport === 'strength');
    const sunday = reqs.find((r) => r.date === SUN);
    const fb = reqs.find((r) => r.date !== SUN && (r.date ?? '') > MON);
    if (!sunday || !fb) throw new Error('Full Body du dimanche et du milieu de semaine attendus');
    // Le Full Body du dimanche n'a pas été fait : le dimanche est libre ; un Full Body est prévu le lundi suivant.
    const s = declareSessionMissed(decoded.state, clock(SAT), sunday.requestId);
    expect(next.requests.some((r) => r.status === 'planned' && r.sport === 'strength' && r.date === NEXT)).toBe(true);
    const o = missedSessionOptions(s, clock(SAT), fb.requestId);
    expect(o?.postpone).not.toContain(SUN);
    expect(o?.refused).toContainEqual({ date: SUN, cause: 'recovery' });
  });

  it('P1 corrigé — durée : une séance n’est jamais reportée sur un jour dont la disponibilité est inférieure à sa durée estimée', () => {
    const s0 = programme();
    const p = s0.profile;
    if (!p) throw new Error('profil');
    // Samedi et dimanche : 15 min seulement.
    const s = { ...s0, profile: { ...p, availability: [60, 60, 60, 60, 60, 15, 15] } };
    const fb = (s.planner.weeks[MON]?.requests ?? []).find((r) => r.status === 'planned' && r.sport === 'strength');
    if (!fb) throw new Error('séance attendue');
    const o = missedSessionOptions(s, clock(MON), fb.requestId);
    for (const d of [addDays(MON, 5), addDays(MON, 6)]) {
      expect(o?.postpone).not.toContain(d);
      expect(o?.refused.find((x) => x.date === d)?.cause).toBe('too_short');
    }
  });
});

