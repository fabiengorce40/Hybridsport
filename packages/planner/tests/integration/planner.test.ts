/**
 * Global Planner V1 — orchestration réelle des quatre moteurs par le pipeline du CORE. Gouvernances, contenus et
 * écarts d'interférence : TEST_ONLY (fixtures). Production : fail-closed (dernier bloc).
 */
import { describe, expect, it } from 'vitest';
import { asISODateTime, zSessionDraft } from '@hybridsport/domain';
import { ENGINE_VERSION, migrateToCurrent, runSportSession, targetFromAvailable, readToleranceProfile, toEnvelope } from '@hybridsport/engine';
import { StrengthEngine, findArchetype, readStrengthParams } from '@hybridsport/strength';
import { CT_CODES } from '@hybridsport/crosstraining';
import { HR_CODES } from '@hybridsport/hyrox';
import { GP_CODES, planMultisportWeek } from '../../src/index.js';
import type { PlannedWeek, PlannerInput, RequestResult, SportPorts } from '../../src/index.js';
import {
  ALL_PORTS, PROFILE, STRUCTURE_IDS, WEEK, approvedTestOnly, clock, crosstraining, ctGovernance, days, hyrox, input, plannerGovernance, running, runningGovernance,
  strength, strengthBase, want,
} from '../fixtures.js';
import { strengthContent } from '../../../app-core/src/provisional-content.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';

// technical-constant: TEST_ONLY — écart d'interférence strict de test (heures)
const STRICT_H = 48;
const strict = () => plannerGovernance(Object.fromEntries(STRUCTURE_IDS.map((s) => [s, STRICT_H])));
const plan = (demands: PlannerInput['demands'], ports: SportPorts = ALL_PORTS(), o: Partial<PlannerInput> = {}, gov = plannerGovernance()) => planMultisportWeek(input(demands, o), ports, gov, clock);
const status = (w: PlannedWeek) => w.requests.map((r) => [r.requestId.split('.').slice(1).join('.'), r.status, 'date' in r ? r.date : '-']);
const req = (w: PlannedWeek, id: string): RequestResult | undefined => w.requests.find((r) => r.requestId.endsWith(id));
const codes = (r: RequestResult | undefined) => r?.reasons.map((x) => x.code) ?? [];
const FOUR: PlannerInput['demands'] = [{ sport: 'strength', sessions: 2 }, { sport: 'running', sessions: 2 }, { sport: 'crosstraining', sessions: 1 }, { sport: 'hyrox', sessions: 1 }];

describe('mono-sport : inchangé', () => {
  it('Strength seul : non multisport, aucune interférence ni gouvernance du planificateur ; séance IDENTIQUE à l’appel direct du moteur', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }]);
    expect(w.hybrid).toBe(false);
    expect(w.conflicts).toEqual([]);
    expect(w.governance).toEqual([]);
    const r = req(w, 'strength.1');
    expect(r?.status).toBe('planned');
    // Appel direct, sans planificateur : même requête que celle d'un créneau de 60 min le lundi.
    const content = strengthContent();
    const a = findArchetype(readStrengthParams(content.ruleset).values, 'str_full_body');
    const A = 3600;
    const direct = runSportSession(StrengthEngine as never, {
      intent: { id: `plan.${r?.requestId ?? ''}`, discipline: 'strength', archetypeId: 'str_full_body', stimulus: 'strength_heavy', objective: 'objective.strength_heavy', priority: 'standard', phase: 'phase.accumulation', availableTimeS: A, targetDurationS: targetFromAvailable(A, readToleranceProfile(content.ruleset, a?.toleranceProfile ?? '')), repetitionIntents: [], plannerNotes: [] },
      profile: PROFILE, state: STATE_FRESH, history: [], disciplineContext: strengthBase(),
    }, { now: clock.instantOf(WEEK[0]), timezone: clock.timezone, seed: `planner:${r?.requestId ?? ''}:${WEEK[0]}`, engineVersion: ENGINE_VERSION, ruleset: content.ruleset, catalog: content.catalog });
    expect(r?.status === 'planned' && r.session).toEqual(direct.result.status === 'ok' ? direct.result.value : null);
  });

  it.each(['running', 'crosstraining', 'hyrox'] as const)('%s seul : planifié, non multisport, aucune capacité multisport requise', (sport) => {
    const ports: SportPorts = { running: running({ governance: runningGovernance(false) }), crosstraining: crosstraining({ governance: ctGovernance({ hybrid: false }) }), hyrox: hyrox({ hybridAllowed: null }) };
    const w = plan([{ sport, sessions: 1 }], ports);
    expect(w.hybrid).toBe(false);
    expect(req(w, `${sport}.1`)?.status).toBe('planned');
  });
});

describe('multisport réel (TEST_ONLY)', () => {
  it('Strength + Running : les deux planifiés, en tour de rôle selon l’ordre déclaré, jours distincts', () => {
    const w = plan([{ sport: 'strength', sessions: 2 }, { sport: 'running', sessions: 2 }]);
    expect(w.hybrid).toBe(true);
    expect(status(w)).toEqual([['strength.1', 'planned', WEEK[0]], ['running.1', 'planned', WEEK[6]], ['strength.2', 'planned', WEEK[3]], ['running.2', 'planned', WEEK[1]]]);
  });

  it('Strength + Running + Cross-training : trois disciplines générées par leurs moteurs', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }, { sport: 'crosstraining', sessions: 1 }]);
    expect(w.requests.map((r) => r.status)).toEqual(['planned', 'planned', 'planned']);
    const ct = req(w, 'crosstraining.1');
    expect(ct?.status === 'planned' && ct.session.blocks[0]?.items[0]?.exerciseId).toBe('ex.air_squat');
  });

  it('quatre sports : six séances planifiées sur sept jours, une par jour, chaque contenu venant de son moteur', () => {
    const w = plan(FOUR);
    expect(w.requests.every((r) => r.status === 'planned')).toBe(true);
    expect(w.days.filter((d) => d.status === 'planned')).toHaveLength(6);
    expect(new Set(w.days.flatMap((d) => (d.status === 'planned' ? [d.date] : []))).size).toBe(6);
    const sessionOf = (id: string) => { const r = req(w, id); return r?.status === 'planned' ? r.session : undefined; };
    expect(sessionOf('strength.1')?.discipline).toBe('strength');
    expect(sessionOf('running.1')?.discipline).toBe('running');
    expect(sessionOf('crosstraining.1')?.discipline).toBe('crosstraining');
    expect(sessionOf('hyrox.1')?.blocks[0]?.items[0]).toMatchObject({ exerciseId: 'ex.skierg' });
    expect(w.days.find((d) => d.status === 'empty')?.status === 'empty' && w.days.find((d) => d.status === 'empty')).toMatchObject({ reason: { code: GP_CODES.DAY_EMPTY, params: { cause: 'NO_SESSION_PLACED' } } });
  });

  it('séance planifiée = sortie EXACTE du moteur, persistable en session_record v6', () => {
    const w = plan(FOUR);
    for (const r of w.requests) {
      if (r.status !== 'planned') continue;
      const record = { session: zSessionDraft.parse(r.session), provenance: { engineVersion: ENGINE_VERSION, rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test', seed: r.requestId, traceId: 't0123456789abcdef' }, fingerprint: r.fingerprint ? { status: 'available', value: r.fingerprint } : { status: 'unavailable', reason: 'duplicate_analysis_inactive' }, durationEstimate: { availability: 'UNAVAILABLE_LEGACY' } };
      const env = toEnvelope('session_record', record);
      expect(env.schemaVersion).toBe(6);
      const back = migrateToCurrent<typeof record>(JSON.parse(JSON.stringify(env)));
      expect(back.ok && back.value.session, r.requestId).toEqual(record.session);
    }
  });
});

describe('capacités multisport gouvernées par chaque moteur ⇒ résultat partiel explicite', () => {
  it('Running sans intégration planificateur (gouvernance réelle) ⇒ course refusée HYBRID_PLANNER_UNAVAILABLE ; Strength planifiée', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], { strength: strength(), running: running({ governance: runningGovernance(false) }) });
    expect(req(w, 'strength.1')?.status).toBe('planned');
    const r = req(w, 'running.1');
    expect(r?.status).toBe('refused');
    expect(codes(r)[0]).toBe(GP_CODES.ENGINE_REFUSED);
    expect(codes(r)).toContain('SCOPE.RUNNING.HYBRID_PLANNER_UNAVAILABLE');
  });

  it('Cross-training sans capacité ctHybridPlanning ⇒ refus HYBRID_PLANNER_UNAVAILABLE + capacité désactivée (raisons du moteur)', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'crosstraining', sessions: 1 }], { strength: strength(), crosstraining: crosstraining({ governance: ctGovernance({ hybrid: false }) }) });
    const r = req(w, 'crosstraining.1');
    expect(r?.status).toBe('refused');
    expect(codes(r).slice(0, 3)).toEqual([GP_CODES.ENGINE_REFUSED, CT_CODES.HYBRID_PLANNER_UNAVAILABLE, CT_CODES.CAPABILITY_DISABLED]);
  });

  it('HYROX : paramètre multisport absent ⇒ refus ; politique « non » ⇒ POLICY_DISALLOWS ; station non demandée ⇒ STATION_NOT_REQUESTED', () => {
    const two = (port: ReturnType<typeof hyrox>) => req(plan([{ sport: 'strength', sessions: 1 }, { sport: 'hyrox', sessions: 1 }], { strength: strength(), hyrox: port }), 'hyrox.1');
    const absent = two(hyrox({ hybridAllowed: null }));
    expect(absent?.status === 'refused' && absent.reasons[1]).toMatchObject({ code: HR_CODES.HYBRID_PLANNER_UNAVAILABLE, params: { cause: 'GLOBAL_PLANNER_REQUIRED' } });
    expect(two(hyrox({ hybridAllowed: false }))?.reasons[1]).toMatchObject({ code: HR_CODES.HYBRID_PLANNER_UNAVAILABLE, params: { cause: 'POLICY_DISALLOWS' } });
    const noStation = req(plan([want('strength', 1), want('hyrox', 1, { station: undefined })], { strength: strength(), hyrox: hyrox() }), 'hyrox.1');
    expect(codes(noStation)).toEqual([GP_CODES.ENGINE_REFUSED, HR_CODES.STATION_NOT_REQUESTED]);
  });

  it('matériel absent (aucun SkiErg) ⇒ HYROX refusé par son moteur (aucune substitution), les autres sports planifiés', () => {
    const noSki = { ...PROFILE, availableEquipment: PROFILE.availableEquipment.filter((e) => e !== 'skierg') };
    const w = plan(FOUR, { ...ALL_PORTS(), hyrox: hyrox({ profile: noSki }) });
    const r = req(w, 'hyrox.1');
    expect(r?.status === 'refused' && r.reasons[1]).toMatchObject({ code: HR_CODES.MOVEMENT_INELIGIBLE, params: { exerciseId: 'ex.skierg', causes: ['EQUIPMENT_MISSING'] } });
    expect(w.requests.filter((x) => x.status === 'planned')).toHaveLength(5);
  });

  it('moteur indisponible (aucun port) ⇒ ENGINE_UNAVAILABLE par demande, le reste planifié', () => {
    const { hyrox: _h, ...three } = ALL_PORTS();
    const w = plan(FOUR, three);
    expect(req(w, 'hyrox.1')).toMatchObject({ status: 'unplaced', reasons: [{ code: GP_CODES.ENGINE_UNAVAILABLE, params: { sport: 'hyrox' } }] });
    expect(w.requests.filter((x) => x.status === 'planned')).toHaveLength(5);
  });

  it('créneaux insuffisants ⇒ NOT_ENOUGH_DAYS pour les demandes restantes (ordre déclaré respecté), jours indisponibles signalés', () => {
    const w = plan(FOUR, ALL_PORTS(), { days: days([60, 0, 0, 60, 0, 0, 0]) });
    expect(status(w).filter(([, s]) => s === 'planned').map(([id]) => id)).toEqual(['strength.1', 'running.1']);
    expect(codes(req(w, 'hyrox.1'))).toEqual([GP_CODES.NOT_ENOUGH_DAYS]);
    expect(w.days.filter((d) => d.status === 'empty').map((d) => d.status === 'empty' && d.reason.params.cause)).toEqual(['UNAVAILABLE', 'UNAVAILABLE', 'UNAVAILABLE', 'UNAVAILABLE', 'UNAVAILABLE']);
  });
});

describe('interférence inter-disciplines (G4)', () => {
  it('écart gouverné non respecté ⇒ conflit tracé (X, Y, structure, règle) ; la séance va sur un autre jour ou reste non placée', () => {
    const w = plan(FOUR, ALL_PORTS(), {}, strict());
    const r = req(w, 'hyrox.1');
    expect(r?.status).toBe('unplaced');
    expect(r?.reasons[0]).toMatchObject({ code: GP_CODES.INTERFERENCE_UNRESOLVED, params: { sport: 'hyrox' } });
    expect(w.conflicts.find((c) => c.params.sport === 'hyrox' && c.params.withSport === 'strength')).toMatchObject({
      code: GP_CODES.INTERFERENCE_CONFLICT, params: { gapHours: 24, rule: 'planner.interference.structureWindows@0.1.0' },
    });
    // Aucune séance planifiée de disciplines différentes ne viole l'écart gouverné.
    const planned = w.requests.flatMap((x) => (x.status === 'planned' ? [x] : []));
    for (const a of planned) for (const b of planned) {
      if (a.sport === b.sport) continue;
      const gapH = Math.abs(Date.parse(clock.instantOf(a.date)) - Date.parse(clock.instantOf(b.date))) / 3_600_000;
      const sa = ALL_PORTS()[a.sport]?.structures(a.session);
      const sb = ALL_PORTS()[b.sport]?.structures(b.session);
      const shared = sa?.ok && sb?.ok ? sa.structures.filter((s) => sb.structures.includes(s)) : ['*'];
      if (shared.length > 0) expect(gapH).toBeGreaterThanOrEqual(STRICT_H);
    }
  });

  it('écart égal au minimum gouverné ⇒ admis (même convention que la récupération du CORE)', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], ALL_PORTS(), { days: days([60, 60, 0, 0, 0, 0, 0]) });
    expect(status(w)).toEqual([['strength.1', 'planned', WEEK[0]], ['running.1', 'planned', WEEK[1]]]);
  });

  it('historique : une course la veille de la semaine (dimanche) écarte la force du lundi selon la règle gouvernée', () => {
    const run = plan([{ sport: 'running', sessions: 1 }], ALL_PORTS());
    const prev = req(run, 'running.1');
    if (prev?.status !== 'planned') throw new Error('course attendue');
    const recent = [{ date: '2026-10-04', sport: 'running' as const, session: prev.session }];
    expect(req(plan([{ sport: 'strength', sessions: 1 }, { sport: 'crosstraining', sessions: 1 }], ALL_PORTS(), {}, strict()), 'strength.1')).toMatchObject({ date: WEEK[0] });
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'crosstraining', sessions: 1 }], ALL_PORTS(), { recent }, strict());
    expect(req(w, 'strength.1')).toMatchObject({ status: 'planned' });
    expect(req(w, 'strength.1')?.status === 'planned' && req(w, 'strength.1')).not.toMatchObject({ date: WEEK[0] });
    expect(w.conflicts.some((c) => c.params.withDate === '2026-10-04' && c.params.date === WEEK[0])).toBe(true);
  });

  it('historique d’un sport sans moteur raccordé ⇒ structures non dérivables ⇒ conflit fail-closed', () => {
    const run = req(plan([{ sport: 'running', sessions: 1 }]), 'running.1');
    if (run?.status !== 'planned') throw new Error('course attendue');
    const w = planMultisportWeek(input([{ sport: 'strength', sessions: 1 }, { sport: 'crosstraining', sessions: 1 }], { recent: [{ date: '2026-10-04', sport: 'running', session: run.session }] }), { strength: strength(), crosstraining: crosstraining() }, plannerGovernance(), clock);
    expect(w.conflicts.some((c) => c.params.rule === 'STRUCTURES_UNAVAILABLE' && c.params.withSport === 'running')).toBe(true);
    expect(w.requests.every((r) => r.status !== 'planned' || r.date > WEEK[0] || r.sport === 'running')).toBe(true);
  });
});

describe('gouvernance du planificateur : fail-closed', () => {
  it('paramètre absent ⇒ PARAMETER_UNAVAILABLE ; tout recouvrement inter-disciplines est un conflit ; mono-sport non affecté', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], ALL_PORTS(), {}, plannerGovernance(null));
    expect(w.governance).toEqual([expect.objectContaining({ code: GP_CODES.PARAMETER_UNAVAILABLE, params: { parameterId: 'planner.interference.structureWindows', cause: 'MISSING', mode: 'CANDIDATE' } })]);
    expect(req(w, 'strength.1')?.status).toBe('planned');
    expect(req(w, 'running.1')).toMatchObject({ status: 'unplaced', reasons: [{ code: GP_CODES.INTERFERENCE_UNRESOLVED }] });
    expect(w.conflicts.every((c) => c.params.rule === 'planner.interference.structureWindows:UNAVAILABLE')).toBe(true);
    expect(plan([{ sport: 'strength', sessions: 2 }], ALL_PORTS(), {}, plannerGovernance(null)).requests.map((r) => r.status)).toEqual(['planned', 'planned']);
  });

  it('structure partagée absente de la table ⇒ non gouvernée ⇒ conflit UNGOVERNED_STRUCTURE', () => {
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], ALL_PORTS(), {}, plannerGovernance({ lower_knee: 0 }));
    expect(w.conflicts.some((c) => String(c.params.rule).endsWith(':UNGOVERNED_STRUCTURE'))).toBe(true);
    expect(req(w, 'running.1')?.status).toBe('unplaced');
  });

  it('PRODUCTION : valeur draft ⇒ NOT_PRODUCTION_READY ; approuvée (approbation TEST) ⇒ lue sans trace candidate', () => {
    const p = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], ALL_PORTS(), { mode: 'PRODUCTION' });
    expect(p.governance[0]).toMatchObject({ params: { cause: 'NOT_PRODUCTION_READY' } });
    const ok = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], ALL_PORTS(), { mode: 'PRODUCTION' }, plannerGovernance(undefined, approvedTestOnly));
    expect(ok.governance).toEqual([]);
  });
});

describe('déterminisme et frontières adverses', () => {
  it('même entrée ⇒ même planning, octet par octet', () => {
    expect(JSON.stringify(plan(FOUR))).toBe(JSON.stringify(plan(FOUR)));
    expect(JSON.stringify(plan(FOUR, ALL_PORTS(), {}, strict()))).toBe(JSON.stringify(plan(FOUR, ALL_PORTS(), {}, strict())));
  });

  it('entrée gelée non modifiée ; entrées malformées refusées (sport en double, jours non chronologiques)', () => {
    const i = input(FOUR);
    const snap = JSON.stringify(i);
    planMultisportWeek(Object.freeze(i), ALL_PORTS(), plannerGovernance(), clock);
    expect(JSON.stringify(i)).toBe(snap);
    expect(() => planMultisportWeek(input([{ sport: 'strength', sessions: 1 }, { sport: 'strength', sessions: 1 }]), ALL_PORTS(), plannerGovernance(), clock)).toThrow();
    expect(() => planMultisportWeek(input(FOUR, { days: [...days()].reverse() }), ALL_PORTS(), plannerGovernance(), clock)).toThrow();
  });

  it('le planificateur ne modifie jamais la séance du moteur et ne lui transmet que le créneau (multisport compris)', () => {
    const seen: unknown[] = [];
    const base = strength();
    const spy = { ...base, generate: (slot: Parameters<typeof base.generate>[0]) => { seen.push(slot); return base.generate(slot); } };
    const w = plan([{ sport: 'strength', sessions: 1 }, { sport: 'running', sessions: 1 }], { ...ALL_PORTS(), strength: spy });
    expect(Object.keys(seen[0] as object).sort()).toEqual(['availableMinutes', 'date', 'hybrid', 'intent', 'requestId', 'seed']);
    // Seconde passe (multisport) : même créneau + contexte voisin, rien d'autre.
    expect(Object.keys(seen.at(-1) as object).sort()).toEqual(['availableMinutes', 'date', 'hybrid', 'intent', 'neighbours', 'requestId', 'seed']);
    const r = req(w, 'strength.1');
    expect(r?.status === 'planned' && r.session).toEqual((() => { const o = base.generate(seen.at(-1) as never); return o.status === 'planned' ? o.session : null; })());
  });

  it('un refus du moteur n’est jamais remplacé par un autre sport ni une autre dose sur ce créneau', () => {
    const w = plan([want('hyrox', 1, { station: 'row' }), want('strength', 1)], { strength: strength(), hyrox: hyrox() });
    const r = req(w, 'hyrox.1');
    expect(r?.status).toBe('refused');
    expect(codes(r)).toEqual([GP_CODES.ENGINE_REFUSED, HR_CODES.STATION_DOSE_UNAVAILABLE]);
    expect(w.requests.filter((x) => x.status === 'planned').map((x) => x.sport)).toEqual(['strength']);
  });

  it('séances du CT et d’HYROX : passées par les variantes STRICTES (aucune substitution publiée)', () => {
    const w = plan(FOUR);
    const ct = req(w, 'crosstraining.1');
    const hr = req(w, 'hyrox.1');
    expect(ct?.status === 'planned' && ct.session.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).toEqual(['ex.air_squat']);
    expect(hr?.status === 'planned' && hr.session.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))).toEqual(['ex.skierg']);
    expect(asISODateTime(clock.instantOf(WEEK[0]))).toBe('2026-10-05T12:00:00Z');
  });
});
