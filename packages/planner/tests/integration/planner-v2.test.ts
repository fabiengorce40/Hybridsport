/**
 * Global Planner V2 — profils de demande standard (CORE), contexte voisin, intention de programme, catégories de
 * résultat, persistance. Normalisation des doses, gouvernances et écarts : TEST_ONLY (fixtures).
 */
import { describe, expect, it } from 'vitest';
import { migrateToCurrent, toEnvelope } from '@hybridsport/engine';
import type { SportEngine } from '@hybridsport/engine';
import { StrengthEngine } from '@hybridsport/strength';
import { strengthPort, GP_CODES, planMultisportWeek } from '../../src/index.js';
import type { PlannedWeek, PlannerInput, RequestResult, SportIntent, SportPorts } from '../../src/index.js';
import {
  ALL_PORTS, PROFILE, WEEK, clock, crosstraining, ctGovernance, days, hyrox, input, plannerGovernance, running, runningGovernance, strength, strengthBase, want,
} from '../fixtures.js';
import { strengthContent } from '../../../app-core/src/provisional-content.js';
import { STATE_FRESH } from '../../../engine/tests/harness/requests.js';
import { withDemand } from '../fixtures.js';

const plan = (demands: readonly (SportIntent | { sport: SportIntent['sport']; sessions: number })[], ports: SportPorts = ALL_PORTS(), o: Partial<PlannerInput> = {}, gov = plannerGovernance()) => planMultisportWeek(input(demands, o), ports, gov, clock);
const req = (w: PlannedWeek, id: string): RequestResult | undefined => w.requests.find((r) => r.requestId.endsWith(id));

/** Port Strength espion : capture le contexte de semaine réellement reçu par le moteur Strength. */
function spiedStrength(): { port: ReturnType<typeof strength>; weeks: { known: boolean; neighbors: { discipline: string; demand: Record<string, string> }[] }[] } {
  const weeks: { known: boolean; neighbors: { discipline: string; demand: Record<string, string> }[] }[] = [];
  const engine = { ...StrengthEngine, propose: (i: Parameters<typeof StrengthEngine.propose>[0]) => { weeks.push(i.discipline.week as never); return StrengthEngine.propose(i); } } as SportEngine<unknown>;
  return { port: strengthPort({ engine, content: withDemand(strengthContent()), profile: PROFILE, state: STATE_FRESH, history: [], clock, baseContext: strengthBase() }), weeks };
}

describe('profil de demande standard (dérivé par le CORE de la séance générée)', () => {
  it('chaque séance planifiée porte un profil sur les huit structures existantes, aucune neuvième', () => {
    const w = plan([want('strength', 1), want('running', 1), want('crosstraining', 1), want('hyrox', 1)]);
    for (const r of w.requests) {
      expect(r.status, r.requestId).toBe('planned');
      if (r.status !== 'planned') continue;
      expect(r.demand.status).toBe('derived');
      if (r.demand.status === 'derived') expect(Object.keys(r.demand.levels).sort()).toEqual(['axial', 'grip', 'high_intensity_systemic', 'locomotor_impact', 'lower_hip', 'lower_knee', 'upper_pull', 'upper_push']);
    }
  });

  it('normalisation absente ⇒ profil NON dérivable, raison exacte (aucune estimation)', () => {
    const w = plan([want('running', 1)], { running: running({ normalization: null }) });
    const r = req(w, 'running.1');
    expect(r?.status === 'planned' && r.demand).toMatchObject({ status: 'unavailable', reasons: [{ code: 'DATA.DEMAND_PROFILE_UNAVAILABLE', params: { cause: 'PARAMETER_MISSING', detail: 'demand.doseNormalization' } }] });
  });

  it('PRODUCTION : normalisation draft ⇒ profil refusé (DEMAND_PROFILE_NOT_APPROVED)', () => {
    const r = running().demand(((): never => { const w = plan([want('running', 1)]); const x = req(w, 'running.1'); if (x?.status !== 'planned') throw new Error('course attendue'); return x.session as never; })(), 'PRODUCTION');
    expect(r).toMatchObject({ status: 'unavailable', reasons: [{ code: GP_CODES.DEMAND_PROFILE_NOT_APPROVED }] });
  });
});

describe('contexte voisin transmis à Strength', () => {
  it.each([['running', 'running'], ['crosstraining', 'crosstraining'], ['hyrox', 'hybrid_race']] as const)('Strength voisin de %s : semaine CONNUE, profil dérivé du voisin transmis', (sport, discipline) => {
    const s = spiedStrength();
    const w = plan([want('strength', 1), want(sport, 1)], { ...ALL_PORTS(), strength: s.port });
    const r = req(w, 'strength.1');
    expect(r?.status).toBe('planned');
    expect(r?.status === 'planned' && r.neighbourContext).toMatchObject({ known: true, neighbours: [{ sport }] });
    const last = s.weeks.at(-1);
    expect(last?.known).toBe(true);
    expect(last?.neighbors).toHaveLength(1);
    expect(last?.neighbors[0]?.discipline).toBe(discipline);
    // Le profil transmis est exactement celui dérivé par le CORE pour la séance voisine.
    const n = req(w, `${sport}.1`);
    expect(n?.status === 'planned' && n.demand.status === 'derived' && n.demand.levels).toEqual(last?.neighbors[0]?.demand);
  });

  it('voisin au profil NON dérivable ⇒ semaine inconnue (comportement prudent existant), aucun profil inventé', () => {
    const s = spiedStrength();
    const w = plan([want('strength', 1), want('running', 1)], { strength: s.port, running: running({ normalization: null }) });
    expect(req(w, 'strength.1')).toMatchObject({ status: 'planned', neighbourContext: { known: false, neighbours: [] } });
    expect(s.weeks.at(-1)).toMatchObject({ known: false, neighbors: [] });
  });

  it('mono-sport : aucune seconde passe, contexte de base inchangé', () => {
    const s = spiedStrength();
    const w = plan([want('strength', 2)], { strength: s.port });
    expect(s.weeks).toHaveLength(2);
    expect(s.weeks.every((x) => x.known && x.neighbors.length === 0)).toBe(true);
    expect(w.requests.every((r) => r.status === 'planned' && r.neighbourContext === undefined)).toBe(true);
  });

  it('historique : une séance d’une autre discipline avant la semaine devient voisine connue', () => {
    const prev = req(plan([want('crosstraining', 1)]), 'crosstraining.1');
    if (prev?.status !== 'planned') throw new Error('séance attendue');
    const s = spiedStrength();
    const w = plan([want('strength', 1), want('running', 1)], { ...ALL_PORTS(), strength: s.port }, { recent: [{ date: '2026-10-03', sport: 'crosstraining', session: prev.session }] });
    expect(req(w, 'strength.1')).toMatchObject({ neighbourContext: { known: true } });
    expect(s.weeks.at(-1)?.neighbors.map((n) => n.discipline).sort()).toEqual(['crosstraining', 'running']);
  });
});

describe('intention de programme (aucune composition ni intention inventée)', () => {
  it('intention incomplète ⇒ demande non placée PROGRAMME_INTENT_INCOMPLETE (champs manquants), autres sports planifiés', () => {
    const w = plan([want('strength', 1), { sport: 'running', sessions: 2, intent: { archetypeId: 'running.easy' } }]);
    expect(req(w, 'running.1')).toMatchObject({ status: 'unplaced', category: 'programme_intent_incomplete', reasons: [{ code: GP_CODES.PROGRAMME_INTENT_INCOMPLETE, params: { sport: 'running', missing: ['stimulus', 'objective', 'phase', 'toleranceProfile'] } }] });
    expect(req(w, 'running.2')?.category).toBe('programme_intent_incomplete');
    expect(req(w, 'strength.1')?.status).toBe('planned');
  });

  it('le nombre de séances par sport est exactement celui demandé ; aucun sport non demandé n’est ajouté', () => {
    const w = plan([want('running', 3), want('hyrox', 1)]);
    expect(w.requests.map((r) => r.sport)).toEqual(['running', 'hyrox', 'running', 'running']);
  });

  it('HYROX : la station est celle du programme, transmise telle quelle ; absente ⇒ refus du moteur', () => {
    const w = plan([want('strength', 1), want('hyrox', 1, { station: 'wall_ball' })]);
    const r = req(w, 'hyrox.1');
    expect(r?.status === 'planned' && r.session.blocks[0]?.items[0]?.exerciseId).toBe('ex.wall_ball');
    const none = req(plan([want('hyrox', 1, { station: undefined })]), 'hyrox.1');
    expect(none).toMatchObject({ status: 'refused', category: 'invalid_intent' });
  });
});

describe('résultat partiel : catégories auditables', () => {
  it('planned / governance_blocked / engine_refused / slot_unavailable / engine_unavailable / interference_conflict / programme_intent_incomplete', () => {
    // technical-constant: TEST_ONLY — écart strict de test (heures)
    const strict = plannerGovernance(Object.fromEntries(['lower_knee', 'lower_hip', 'upper_push', 'upper_pull', 'axial', 'locomotor_impact', 'high_intensity_systemic', 'grip'].map((s) => [s, 48])));
    const blocked = plan([want('strength', 1), want('running', 1)], { strength: strength(), running: running({ governance: runningGovernance(false) }) });
    expect(req(blocked, 'running.1')?.category).toBe('governance_blocked');
    const ungoverned = plan([want('strength', 1), want('running', 1)], ALL_PORTS(), {}, plannerGovernance(null));
    expect(req(ungoverned, 'running.1')?.category).toBe('governance_blocked');
    const conflict = plan([want('strength', 2), want('running', 2), want('crosstraining', 1), want('hyrox', 1)], ALL_PORTS(), {}, strict);
    expect(req(conflict, 'hyrox.1')?.category).toBe('interference_conflict');
    const refused = plan([want('hyrox', 1, { station: 'row' })]);
    expect(req(refused, 'hyrox.1')?.category).toBe('engine_refused');
    const slots = plan([want('strength', 1), want('running', 1)], ALL_PORTS(), { days: days([60, 0, 0, 0, 0, 0, 0]) });
    expect(req(slots, 'running.1')?.category).toBe('slot_unavailable');
    const { hyrox: _h, ...three } = ALL_PORTS();
    expect(req(plan([want('hyrox', 1)], three), 'hyrox.1')?.category).toBe('engine_unavailable');
    expect(req(plan([{ sport: 'hyrox', sessions: 1, intent: {} }]), 'hyrox.1')?.category).toBe('programme_intent_incomplete');
    expect(blocked.requests.find((r) => r.sport === 'strength')?.category).toBe('planned');
  });

  it('CT sans capacité multisport ⇒ governance_blocked (raisons du moteur conservées)', () => {
    const w = plan([want('strength', 1), want('crosstraining', 1)], { strength: strength(), crosstraining: crosstraining({ governance: ctGovernance({ hybrid: false }) }) });
    expect(req(w, 'crosstraining.1')).toMatchObject({ status: 'refused', category: 'governance_blocked' });
  });

  it('HYROX sans paramètre multisport ⇒ governance_blocked', () => {
    expect(req(plan([want('strength', 1), want('hyrox', 1)], { strength: strength(), hyrox: hyrox({ hybridAllowed: null }) }), 'hyrox.1')?.category).toBe('governance_blocked');
  });
});

describe('persistance et déterminisme', () => {
  it('chaque séance planifiée porte un session_record courant (estimation de durée du CORE stockée) ; relecture identique', () => {
    const w = plan([want('strength', 1), want('running', 1), want('crosstraining', 1), want('hyrox', 1)]);
    for (const r of w.requests) {
      if (r.status !== 'planned') continue;
      expect(r.record.session).toEqual(r.session);
      expect(r.record.durationEstimate.availability).toBe('AVAILABLE');
      const env = JSON.parse(JSON.stringify(toEnvelope('session_record', r.record)));
      const back = migrateToCurrent(env);
      expect(back.ok && back.value, r.requestId).toEqual(r.record);
    }
  });

  it('même entrée ⇒ même planning (seconde passe comprise), octet par octet', () => {
    const d = [want('strength', 2), want('running', 2), want('crosstraining', 1), want('hyrox', 1)];
    expect(JSON.stringify(plan(d))).toBe(JSON.stringify(plan(d)));
    expect(WEEK).toHaveLength(7);
  });
});
