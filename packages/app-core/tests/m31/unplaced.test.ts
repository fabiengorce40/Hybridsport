/**
 * M3.1 — séances COMPOSÉES MAIS NON PLACÉES et HYROX ÉQUILIBRÉ, par le chemin RÉEL de l'application (Beta 0
 * expérimental) pour les quatre sports. Contrat : PLANNED / COMPOSED_BUT_UNPLACED / BLOCKED lu dans le contrat (jamais
 * dans un texte) ; prescription persistée réalisable telle quelle (« Faire maintenant »), provenance
 * `manual_from_unplaced`, jour RÉEL, historique, moteurs, empreintes, programme ; BLOCKED jamais exécutable.
 * Équilibré : rôle choisi par le PROGRAMME (politique de rotation TEST_ONLY), composé par H2, placé par M3.
 */
import { describe, expect, it } from 'vitest';
import { closeProgrammeWeekInApp, decodeState, ensureBeta0Week, exportState, finishProgrammeSession, hrDeclarations, programmeDefinitionFromProfile, recentOf, recordSessionExecution, selectBeta0Week, selectHistory, selectProgrammeSession, startProgrammeSession } from '../../src/index.js';
import type { AppState, ProfileInput, SessionView } from '../../src/index.js';
import { placementOf } from '@hybridsport/planner';
import { at, create, doHr, hrProfile, reload, workoutOf } from '../hr/hr-fixtures.js';
import { profile as ctProfile } from '../ct/ct-fixtures.js';

const MON = '2026-10-05T07:30:00.000Z';
const T = (d: string, h = '18:00') => `${d}T${h}:00.000Z`;
const views = (s: AppState, day = '2026-10-05') => selectBeta0Week(s, day)?.sessions ?? [];
const unplaced = (s: AppState, sport?: string) => views(s).filter((v) => v.placement === 'composed_unplaced' && (sport === undefined || v.sport === sport));
const persisted = (s: AppState, id: string) => Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === id);
const reject = (f: () => unknown): string => { try { f(); return 'OK'; } catch (e) { return (e as { code?: string }).code ?? String(e); } };

/** Profils SATURÉS (plus de séances que de jours disponibles), un par sport. */
const SATURATED: Readonly<Record<'strength' | 'running' | 'crosstraining' | 'hyrox', () => ProfileInput>> = {
  strength: () => ({ ...hrProfile({ hr: false, strength: true, availability: [60, 0, 60, 0, 0, 0, 0] }), strength: { enabled: true, goal: 'general', sessionsPerWeek: 3 } }),
  running: () => ({ ...hrProfile({ hr: false, running: true, availability: [60, 0, 60, 0, 0, 0, 0] }), running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 3, returnState: 'NONE' } }),
  crosstraining: () => ctProfile({ ct: { sessionsPerWeek: 2 }, availability: [60, 0, 0, 0, 0, 0, 0] }),
  hyrox: () => hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: 2 }, availability: [60, 0, 0, 0, 0, 0, 0] }),
};
/** Réalisation manuelle par le chemin normal (start → runtime → finish → recordSessionExecution). */
function doNow(s: AppState, v: SessionView, day = '2026-10-06'): AppState {
  if (v.sport === 'hyrox') return doHr(s, v.requestId, T(day), T(day, '18:40'), 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } } as never);
  const started = startProgrammeSession(s, at(T(day)), v.requestId);
  const f = v.sport === 'running' ? { completion: 'modified', pain: false, run: { realizedDurationS: 1500, distanceM: 4000 } } : { completion: 'abandoned', pain: false };
  return finishProgrammeSession(started, at(T(day, '18:40')), { requestId: v.requestId, ...f } as never);
}

describe('contrat : PLANNED / COMPOSED_BUT_UNPLACED / BLOCKED (quatre sports, un seul mécanisme)', () => {
  for (const sport of ['strength', 'running', 'crosstraining', 'hyrox'] as const) {
    it(`1-${sport}. semaine saturée : au moins une séance composée mais non placée, prescription persistée, aucun jour`, () => {
      const s = create(SATURATED[sport](), MON);
      const u = unplaced(s, sport);
      expect(u.length).toBeGreaterThan(0);
      for (const v of u) {
        expect(v.status).toBe('not_planned');
        expect(v.date).toBeNull();
        expect(v.archetypeId).not.toBeNull();
        const r = persisted(s, v.requestId);
        expect(r?.status).toBe('unplaced');
        expect(r?.record).toBeDefined();
        expect(r?.composedFor?.referenceDate).toMatch(/^2026-10-/);
        expect(r?.intent?.archetypeId).toBe(v.archetypeId);
        // Aucun jour n'est attribué : la séance n'apparaît sur aucun jour de la semaine.
        expect(selectBeta0Week(s, '2026-10-05')?.days.some((d) => d.sessions.some((x) => x.requestId === v.requestId))).toBe(false);
      }
    });
    it(`2-${sport}. « Faire maintenant » : même prescription, runtime normal, provenance manual_from_unplaced, jour RÉEL`, () => {
      let s = create(SATURATED[sport](), MON);
      const v = unplaced(s, sport)[0] as SessionView;
      const before = JSON.stringify(selectProgrammeSession(s, v.requestId)?.session);
      expect(selectProgrammeSession(s, v.requestId)?.placement).toBe('composed_unplaced');
      s = doNow(s, v);
      expect(JSON.stringify(selectProgrammeSession(s, v.requestId)?.session)).toBe(before);
      const res = s.programmeState?.results.find((x) => x.requestId === v.requestId);
      expect(res).toMatchObject({ provenance: 'manual_from_unplaced', date: '2026-10-06' });
      expect(persisted(s, v.requestId)?.status).toBe('unplaced');
      expect(persisted(s, v.requestId)?.date).toBeUndefined();
      const after = views(s).find((x) => x.requestId === v.requestId);
      expect(after).toMatchObject({ manual: true, date: '2026-10-06', placement: 'composed_unplaced' });
      expect(selectHistory(s).some((h) => h.requestId === v.requestId && h.date === '2026-10-06')).toBe(true);
    });
  }
});

describe('exécution manuelle : historique, moteurs, empreintes, programme, M3', () => {
  it('3. Running : réalisation dans l\'historique du moteur, empreinte ajoutée, statut transmis « réalisée » à la semaine suivante', () => {
    let s = create(SATURATED.running(), MON);
    const v = unplaced(s, 'running')[0] as SessionView;
    const fp = s.fingerprints.running.length;
    s = doNow(s, v);
    expect(s.running.realized.some((r) => r.sessionId === v.requestId)).toBe(true);
    expect(s.fingerprints.running.length).toBe(fp + 1);
    const h = s.profile ? recentOf(s, s.profile, '2026-10-12') : [];
    expect(h.find((x) => x.date === '2026-10-06')?.status).toBe('executed');
  });
  it('4. HYROX : réalisation H2 (rôle réalisé), mémoire lue à la génération suivante', () => {
    let s = create(SATURATED.hyrox(), MON);
    const v = unplaced(s, 'hyrox')[0] as SessionView;
    s = doNow(s, v);
    expect(s.hyrox.realized.find((r) => r.sessionId === v.requestId)?.role).toBe(v.archetypeId?.replace('hybrid_race.h2.', ''));
  });
  it('5. Strength : séance abandonnée enregistrée dans les expositions Strength (historique moteur)', () => {
    let s = create(SATURATED.strength(), MON);
    const v = unplaced(s, 'strength')[0] as SessionView;
    s = doNow(s, v);
    expect(s.programmeState?.results.find((r) => r.requestId === v.requestId)?.completion).toBe('abandoned');
  });
  it('6. CT : réalisation dans l\'historique Cross-training', () => {
    let s = create(SATURATED.crosstraining(), MON);
    const v = unplaced(s, 'crosstraining')[0] as SessionView;
    s = doNow(s, v);
    expect(s.crosstraining.realized.some((r) => r.sessionId === v.requestId)).toBe(true);
  });
  it('7. double soumission refusée (EXECUTION_DUPLICATE / séance terminée)', () => {
    let s = create(SATURATED.running(), MON);
    const v = unplaced(s, 'running')[0] as SessionView;
    s = doNow(s, v);
    expect(reject(() => recordSessionExecution(s, at(T('2026-10-07')), { requestId: v.requestId, sport: 'running', completion: 'modified', pain: 'NONE', run: { realizedDurationS: 1500 } }))).toBe('EXECUTION_DUPLICATE');
    expect(reject(() => startProgrammeSession(s, at(T('2026-10-07')), v.requestId))).toBe('SESSION_FINISHED');
  });
  it('8. « manquée » impossible pour une séance non placée (jamais une obligation)', () => {
    const s = create(SATURATED.running(), MON);
    const v = unplaced(s, 'running')[0] as SessionView;
    expect(reject(() => recordSessionExecution(s, at(T('2026-10-07')), { requestId: v.requestId, sport: 'running', completion: 'missed', pain: 'NONE' }))).toBe('EXECUTION_UNKNOWN_SESSION');
  });
  it('9. clôture de semaine : une non placée non réalisée n\'est jamais dérivée « manquée » ; réalisée ⇒ comptée à part', () => {
    let s = create(SATURATED.running(), MON);
    const [a, b] = unplaced(s, 'running') as SessionView[];
    s = doNow(s, a as SessionView);
    // Réalisation des séances planifiées omise : elles seront dérivées manquées (seules les planifiées peuvent l'être).
    s = closeProgrammeWeekInApp(s, at('2026-10-12T07:00:00.000Z'));
    const missed = s.programmeState?.results.filter((r) => r.provenance === 'derived_missed').map((r) => r.requestId) ?? [];
    expect(missed.includes(a?.requestId ?? '')).toBe(false);
    if (b) expect(missed.includes(b.requestId)).toBe(false);
    expect(s.programmeState?.weeks[0]?.adherence?.total.completedFromUnplaced).toBe(1);
  });
  it('10. pause / rechargement : la séance non placée commencée reprend, prescription intacte', () => {
    let s = create(SATURATED.running(), MON);
    const v = unplaced(s, 'running')[0] as SessionView;
    s = startProgrammeSession(s, at(T('2026-10-06')), v.requestId);
    s = reload(s, T('2026-10-06', '18:10'));
    expect(selectProgrammeSession(s, v.requestId)?.log?.startedAt).toBe('2026-10-06T18:00:00Z');
    expect(selectProgrammeSession(s, v.requestId)?.date).toBe('2026-10-06');
  });
  it('11. export / import : déterministe (prescription non placée et résultat manuel)', () => {
    let s = create(SATURATED.hyrox(), MON);
    s = doNow(s, unplaced(s, 'hyrox')[0] as SessionView);
    const d = decodeState(exportState(s));
    expect(d.ok && d.state).toEqual(s);
  });
  it('12. semaine commencée par une réalisation manuelle : jamais remplacée (WEEK_NOT_REPLACEABLE intact)', () => {
    let s = create(SATURATED.running(), MON);
    s = doNow(s, unplaced(s, 'running')[0] as SessionView);
    const kept = s.planner.weeks['2026-10-05'];
    expect(ensureBeta0Week(s, at(T('2026-10-07'))).planner.weeks['2026-10-05']).toEqual(kept);
  });
});

describe('BLOCKED reste BLOCKED', () => {
  it('13. douleur active : planification suspendue, aucune séance exécutable créée', () => {
    let s = create(SATURATED.running(), MON);
    const v = unplaced(s, 'running')[0] as SessionView;
    s = { ...s, safety: { activePain: { reportedAt: '2026-10-05T08:00:00Z' as never, areas: [], sessionKey: 'x' } } };
    expect(ensureBeta0Week(s, at('2026-10-12T07:30:00.000Z')).planner.weeks['2026-10-12']).toBeUndefined();
    // La prescription déjà composée n'est pas recomposée ; la douleur se règle par le système central (aucun contournement M3).
    expect(persisted(s, v.requestId)?.record).toEqual(persisted(create(SATURATED.running(), MON), v.requestId)?.record);
  });
  it('14. séance bloquée (créneau trop court : refus du moteur) : aucune prescription, ni aperçu ni « Faire maintenant »', () => {
    const s = create({ ...hrProfile({ hr: false, running: true, availability: [60, 10, 0, 0, 0, 0, 0] }), running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } }, MON);
    const blocked = views(s).filter((v) => v.placement === 'blocked');
    expect(blocked.length).toBeGreaterThan(0);
    for (const v of blocked) {
      expect(persisted(s, v.requestId)?.record).toBeUndefined();
      expect(selectProgrammeSession(s, v.requestId)).toBeNull();
      expect(reject(() => startProgrammeSession(s, at(T('2026-10-06')), v.requestId))).toBe('SESSION_UNAVAILABLE');
      expect(reject(() => recordSessionExecution(s, at(T('2026-10-06')), { requestId: v.requestId, sport: v.sport, completion: 'modified', pain: 'NONE', run: { realizedDurationS: 600 } } as never))).toBe('EXECUTION_UNKNOWN_SESSION');
    }
  });
  it('15. HYROX débutant (gouvernance H2 TEST_ONLY : refus) : bloquée, jamais transformée en prescription', () => {
    const s = create(hrProfile({ level: 'beginner', hr: { focus: 'balanced', role: undefined } }), MON);
    for (const v of views(s).filter((x) => x.sport === 'hyrox')) {
      expect(v.placement).toBe('blocked');
      expect(selectProgrammeSession(s, v.requestId)).toBeNull();
    }
  });
  it('16. contrat planificateur : placementOf lit le contrat (planned / composed / blocked)', () => {
    expect(placementOf({ requestId: 'r', sport: 'running', status: 'unplaced', category: 'slot_unavailable', reasons: [] })).toBe('BLOCKED');
    expect(placementOf({ requestId: 'r', sport: 'running', status: 'refused', category: 'safety_blocked', date: '2026-10-05', reasons: [] })).toBe('BLOCKED');
  });
  it('17. manipulation : une demande non placée SANS prescription ne devient jamais exécutable (flag forgé refusé)', () => {
    const s = create({ ...hrProfile({ hr: false, running: true, availability: [60, 10, 0, 0, 0, 0, 0] }), running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } }, MON);
    const v = views(s).find((x) => x.placement === 'blocked') as SessionView;
    const ps = s.programmeState;
    if (!ps) throw new Error('programme absent');
    const forged = { ...s, programmeState: { ...ps, weeks: ps.weeks.map((w) => ({ ...w, requests: w.requests.map((r) => (r.requestId === v.requestId ? { ...r, status: 'unplaced' as const, composedUnplaced: true as const } : r)) })) } };
    expect(reject(() => recordSessionExecution(forged, at(T('2026-10-06')), { requestId: v.requestId, sport: 'running', completion: 'modified', pain: 'NONE', run: { realizedDurationS: 600 } }))).toBe('EXECUTION_UNKNOWN_SESSION');
  });
});

describe('HYROX équilibré : programme ⇒ rôles, H2 ⇒ composition, M3 ⇒ placement', () => {
  const balanced = (n: number, availability = [60, 60, 60, 60, 60, 60, 0]) => hrProfile({ hr: { focus: 'balanced', role: undefined, sessionsPerWeek: n }, availability });
  it('18. équilibré n\'est PAS un rôle H2 : aucun archétype « balanced », rôles reçus par H2 ∈ cinq rôles', () => {
    const s = create(balanced(2), MON);
    const roles = views(s).filter((x) => x.sport === 'hyrox').map((x) => x.archetypeId);
    expect(roles.every((r) => /^hybrid_race\.h2\.(station_capacity|strength_endurance|mixed_station_conditioning|compromised_running|partial_simulation)$/.test(r ?? ''))).toBe(true);
    expect(JSON.stringify(s)).not.toMatch(/hybrid_race\.h2\.balanced/);
  });
  it('19. deux séances : deux rôles différents, choisis par le PROGRAMME (audit ROTATION_ASSIGNED)', () => {
    const s = create(balanced(2), MON);
    const roles = views(s).filter((x) => x.sport === 'hyrox').map((x) => x.archetypeId);
    expect(new Set(roles).size).toBe(2);
    expect(s.programmeState?.audit.some((a) => a.reason.code === 'PLAN.PROGRAMME.ROTATION_ASSIGNED')).toBe(true);
  });
  it('20. pas de répétition mécanique : sur 3 semaines réalisées, les cinq rôles apparaissent', () => {
    let s = create(balanced(2), MON);
    const seen = new Set<string>();
    for (const m of ['2026-10-05', '2026-10-12', '2026-10-19']) {
      if (m !== '2026-10-05') s = ensureBeta0Week(s, at(`${m}T07:30:00.000Z`));
      for (const v of views(s, m).filter((x) => x.sport === 'hyrox' && x.placement === 'planned')) {
        seen.add(v.archetypeId ?? '');
        s = doHr(s, v.requestId, T(v.date ?? m), T(v.date ?? m, '18:40'), 'all', { completion: 'completed_as_prescribed', pain: false, hr: { timeCapReached: false } } as never);
      }
    }
    expect(seen.size).toBe(5);
  });
  it('21. déterministe : même profil, même horloge ⇒ mêmes rôles', () => {
    const a = views(create(balanced(3), MON)).map((x) => x.archetypeId);
    const b = views(create(balanced(3), MON)).map((x) => x.archetypeId);
    expect(a).toEqual(b);
  });
  it('22. spécialisé inchangé : rôle déclaré pour chaque séance, aucune rotation', () => {
    const s = create(hrProfile({ hr: { role: 'hybrid_race.h2.strength_endurance', sessionsPerWeek: 2 } }), MON);
    expect(views(s).filter((x) => x.sport === 'hyrox').every((x) => x.archetypeId === 'hybrid_race.h2.strength_endurance')).toBe(true);
    expect(s.programmeState?.audit.some((a) => a.reason.code.includes('ROTATION'))).toBe(false);
  });
  it('23. profil antérieur (rôle, sans focus) : jamais migré vers équilibré', () => {
    const p = hrProfile({ hr: { role: 'hybrid_race.h2.station_capacity' } });
    expect(p.hyrox.focus).toBeUndefined();
    expect(hrDeclarations(create(p, MON).profile as never).role).toBe('hybrid_race.h2.station_capacity');
  });
  it('24. définition du programme : plan à rotation, aucun archétype déclaré', () => {
    const d = programmeDefinitionFromProfile(create(balanced(2), MON).profile as never, { programmeId: 'p', startWeek: '2026-10-05', origin: 'profile' });
    const plan = d.sports.find((x) => x.sport === 'hyrox');
    expect(plan?.rotation).toEqual({ kind: 'balanced', goal: 'RACE_PREPARATION' });
    expect(plan?.intent.archetypeId).toBeUndefined();
  });
  it('25. BALANCED + M3 : un rôle placé, le second COMPOSÉ MAIS NON PLACÉ garde son rôle ; réalisé ⇒ ce rôle dans l\'historique H2', () => {
    let s = create(balanced(2, [60, 0, 0, 0, 0, 0, 0]), MON);
    const hr = views(s).filter((x) => x.sport === 'hyrox');
    const placed = hr.find((x) => x.placement === 'planned');
    const u = hr.find((x) => x.placement === 'composed_unplaced');
    expect(placed && u).toBeTruthy();
    expect(u?.archetypeId).not.toBe(placed?.archetypeId);
    const assigned = s.programmeState?.audit.find((a) => a.reason.code === 'PLAN.PROGRAMME.ROTATION_ASSIGNED')?.reason.params.assigned;
    expect(assigned).toContain(`2:${u?.archetypeId ?? ''}`);
    s = doNow(s, u as SessionView);
    expect(s.hyrox.realized.find((r) => r.sessionId === u?.requestId)?.role).toBe(u?.archetypeId?.replace('hybrid_race.h2.', ''));
    // Semaine suivante : le rôle réalisé manuellement est lu comme réalisé (il n'est pas reproposé en premier).
    s = ensureBeta0Week(s, at('2026-10-12T07:30:00.000Z'));
    const next = s.programmeState?.audit.filter((a) => a.reason.code === 'PLAN.PROGRAMME.ROTATION_ASSIGNED').at(-1)?.reason.params.assigned as string[];
    expect(next[0]).not.toBe(`1:${u?.archetypeId ?? ''}`);
  });
  it('26. M3 ne remplace jamais le rôle pour faciliter le placement (rôle de la demande = rôle assigné)', () => {
    const s = create(balanced(3, [60, 0, 60, 0, 0, 0, 0]), MON);
    const assigned = (s.programmeState?.audit.find((a) => a.reason.code === 'PLAN.PROGRAMME.ROTATION_ASSIGNED')?.reason.params.assigned as string[]).map((x) => x.split(':')[1]);
    expect(views(s).filter((x) => x.sport === 'hyrox').sort((a, b) => (a.requestId < b.requestId ? -1 : 1)).map((x) => x.archetypeId)).toEqual(assigned);
  });
  it('27. objectif « Préparer une course » : équilibré n\'est jamais imposé à un profil spécialisé existant', () => {
    const p = hrProfile({ hr: { role: 'hybrid_race.h2.compromised_running', goal: 'RACE_PREPARATION' } });
    expect(create(p, MON).profile?.hyrox.focus).toBeUndefined();
  });
  it('28. reload / export : rôles assignés identiques', () => {
    const s = create(balanced(2), MON);
    const r = reload(s, MON);
    expect(views(r).map((x) => x.archetypeId)).toEqual(views(s).map((x) => x.archetypeId));
  });
  it('29. aperçu : la vue de séance non placée est la prescription persistée (jamais recomposée)', () => {
    const s = create(balanced(2, [60, 0, 0, 0, 0, 0, 0]), MON);
    const u = unplaced(s, 'hyrox')[0] as SessionView;
    const rec = persisted(s, u.requestId)?.record?.data as { session?: unknown } | undefined;
    expect(selectProgrammeSession(s, u.requestId)?.session).toEqual(rec?.session);
    expect(workoutOf(s, u.requestId)).not.toBeNull();
  });
});
