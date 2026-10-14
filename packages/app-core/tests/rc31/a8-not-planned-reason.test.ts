/**
 * RC3.1 — A8 : motif affiché d'une séance non planifiée. Avant : première raison hors `PLAN.PLANNER.*` (souvent un
 * AVERTISSEMENT `*.CANDIDATE_VALUE_USED`) et catégorie du planificateur (« gouvernance » dès qu'un code `RULE.*` est
 * présent, avertissement compris) ⇒ « Les règles nécessaires … ne sont pas encore disponibles » pour une course
 * jamais enregistrée. Après : cause DÉCISIVE (sévérité « error ») persistée à la planification, catégorie affichée
 * déduite de cette cause ; donnée manquante ⇒ `missing_data`. Catégorie du planificateur conservée (trace).
 */
import { describe, expect, it } from 'vitest';
import { runningReasons } from '@hybridsport/running';
import { strengthReasons } from '@hybridsport/strength';
import { gpReasons } from '@hybridsport/planner';
import { createBeta0Programme, emptyState, selectBeta0Week } from '../../src/index.js';
import type { AppState, ProfileInput, Reason } from '../../src/index.js';
import { clock, profile } from '../fixtures.js';
import { massProfile } from '../strength-fixes/sf-fixtures.js';
import { create as hrCreate, hrProfile } from '../hr/hr-fixtures.js';

const W1 = '2026-10-05';
const R = (o: Partial<ProfileInput['running']>): ProfileInput['running'] => ({ enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE', ...o });
const runOnly = (o: Partial<ProfileInput['running']> = {}) => profile({ priorities: ['running'], strength: { enabled: false, goal: 'general', sessionsPerWeek: 2 }, running: R(o) });
// technical-constant: TEST_ONLY — dernière course déclarée (s)
const LAST = { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const } };
const make = (p: ProfileInput, o: object = {}) => createBeta0Programme(emptyState(), p, clock(W1), o);

/** Comportement AVANT RC3.1 (reproduit pour la comparaison) : premier code hors `PLAN.PLANNER.*`. */
const before = (rs: readonly Reason[]) => rs.find((r) => !/^PLAN\.PLANNER\./.test(r.code)) ?? rs[0] ?? null;
const notPlanned = (s: AppState) => (selectBeta0Week(s, W1)?.sessions ?? []).filter((x) => x.notPlanned).map((x) => {
  const req = Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === x.requestId);
  return { sport: x.sport, archetype: x.archetypeId, category: x.notPlanned?.category, display: x.notPlanned?.display, reason: x.notPlanned?.reason?.code, before: before(req?.reasons ?? [])?.code, all: req?.reasons ?? [] };
});
const severity = (code: string) => [runningReasons, strengthReasons, gpReasons].map((r) => r.definition(code)).find(Boolean)?.severity ?? null;

const CASES: Record<string, () => AppState> = {
  'course sans course enregistrée': () => make(runOnly()),
  'course débutant P_R0': () => make(runOnly({ population: 'P_R0' }), LAST),
  'course 5×/sem.': () => make(runOnly({ sessionsPerWeek: 5 }), LAST),
  'masse 4×, journées courtes': () => make(massProfile({ sessions: 4, availability: [45, 30, 45, 30, 45, 0, 0] }), LAST),
  'musculation 5×/sem.': () => make(profile({ priorities: ['strength'], running: R({ enabled: false }), strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 5 } })),
  'HYROX débutant': () => hrCreate(hrProfile({ level: 'beginner' })),
  'HYROX sans matériel': () => hrCreate(hrProfile({ equipment: [] })),
  'HYROX journées de 20 min': () => hrCreate(hrProfile({ availability: [20, 20, 20, 20, 20, 20, 0] })),
};

describe('A8 — cause décisive et catégorie affichée', () => {
  it('avant / après : une course jamais enregistrée n’est plus « règles indisponibles » mais « information manquante »', () => {
    const [x] = notPlanned(CASES['course sans course enregistrée']?.() as AppState);
    expect(x).toMatchObject({ before: 'RULE.RUNNING.CANDIDATE_VALUE_USED', category: 'governance_blocked' });
    expect(x).toMatchObject({ reason: 'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE', display: 'missing_data' });
  });

  it('avant / après sur 8 configurations : jamais un avertissement ou une information affichés comme cause', () => {
    const table = Object.fromEntries(Object.entries(CASES).map(([k, f]) => [k, [...new Set(notPlanned(f()).map((x) => `${x.display}:${x.reason ?? '-'}  (avant ${x.category}:${x.before ?? '-'})`))]]));
    expect(table).toEqual({
      'course sans course enregistrée': ['missing_data:DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE  (avant governance_blocked:RULE.RUNNING.CANDIDATE_VALUE_USED)'],
      'course débutant P_R0': ['engine_refused:SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED  (avant engine_refused:SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED)'],
      'course 5×/sem.': ['slot_unavailable:PLAN.PLANNER.NOT_ENOUGH_DAYS  (avant slot_unavailable:PLAN.PLANNER.NOT_ENOUGH_DAYS)'],
      'masse 4×, journées courtes': [
        'slot_unavailable:FEASIBILITY.TIME_EXCEEDED  (avant slot_unavailable:FEASIBILITY.TIME_EXCEEDED)',
        'engine_refused:DURATION.TARGET_BELOW_ARCHETYPE_MIN  (avant engine_refused:DATA.SCIENCE_REGISTRY)',
        'slot_unavailable:PLAN.PLANNER.NOT_ENOUGH_DAYS  (avant slot_unavailable:PLAN.WEEK_PRESCRIPTION)',
      ],
      'musculation 5×/sem.': ['governance_blocked:RULE.PLANNER.COMPOSITION_UNRESOLVED  (avant governance_blocked:RULE.PLANNER.COMPOSITION_UNRESOLVED)'],
      'HYROX débutant': ['safety_blocked:SAFETY.HYROX.LEVEL_NOT_ELIGIBLE  (avant safety_blocked:SAFETY.HYROX.LEVEL_NOT_ELIGIBLE)'],
      'HYROX sans matériel': ['engine_refused:PLAN.HYROX.H2_NO_STRUCTURE  (avant engine_refused:DATA.HYROX.CANDIDATE_VALUE_USED)'],
      'HYROX journées de 20 min': ['engine_refused:PLAN.HYROX.H2_NO_STRUCTURE  (avant engine_refused:DATA.HYROX.CANDIDATE_VALUE_USED)'],
    });
    for (const f of Object.values(CASES)) for (const x of notPlanned(f())) {
      expect(x.reason).not.toMatch(/CANDIDATE_VALUE_USED$/);
      const sev = x.reason ? severity(x.reason) : null;
      expect(sev === null || sev === 'error', `${x.reason ?? ''} : ${String(sev)}`).toBe(true);
    }
  });

  it('séance planifiée : aucune cause persistée ; catégorie du planificateur toujours tracée', () => {
    const s = make(runOnly(), LAST);
    const reqs = Object.values(s.planner.weeks).flatMap((w) => w.requests);
    expect(reqs.filter((r) => r.status === 'planned').every((r) => r.cause === undefined)).toBe(true);
    const blocked = make(runOnly());
    expect(Object.values(blocked.planner.weeks).flatMap((w) => w.requests).every((r) => r.status === 'planned' || r.cause !== undefined)).toBe(true);
  });

  it('semaine antérieure à RC3.1 (sans cause persistée) : repli sur la sévérité des registres, jamais la valeur candidate', () => {
    const s = make(runOnly());
    const legacy: AppState = { ...s, planner: { weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map(({ cause: _c, ...r }) => r) }])) } };
    const xs = notPlanned(legacy);
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) expect(x).toMatchObject({ reason: 'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE', display: 'missing_data', category: 'governance_blocked' });
  });
});
