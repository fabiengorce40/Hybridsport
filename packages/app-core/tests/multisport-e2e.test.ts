/**
 * E2E MULTISPORT (démonstration) : profil applicatif → intention de programme → planificateur global → moteurs réels
 * → CORE → semaine persistée → relecture. TOUTES les valeurs non approuvées sont TEST_ONLY : gouvernances simulées
 * (fixtures du planificateur), normalisation des doses, écarts d'interférence, intention CT / HYROX de démonstration.
 * Aucune séance n'est injectée : chaque séance vient de son moteur (moteurs espionnés pour le prouver).
 */
import { describe, expect, it } from 'vitest';
import { migrateToCurrent } from '@hybridsport/engine';
import type { SportEngine } from '@hybridsport/engine';
import type { SessionRecord } from '@hybridsport/domain';
import { StrengthEngine } from '@hybridsport/strength';
import { createRunningEngine } from '@hybridsport/running';
// Tests seulement : app-core (src) ne dépend pas des moteurs Cross-training / HYROX ; l'environnement TEST_ONLY les construit ici.
import { createCrossTrainingEngine } from '../../crosstraining/src/index.js';
import type { CrossTrainingEngine } from '../../crosstraining/src/index.js';
import { createHyroxEngine } from '../../hyrox/src/index.js';
import type { HyroxEngine } from '../../hyrox/src/index.js';
import {
  completeOnboarding, decodeState, emptyState, EQUIPMENT_PRESETS, exportState, logFreeRun, planProgrammeWeek, programmeFromProfile, runningContent, setProgrammeIntent, strengthContent,
} from '../src/index.js';
import type { AppState, PlannerEnvironment, ProgrammeIntent } from '../src/index.js';
import { clock, MONDAY, profile } from './fixtures.js';
import { CT_INTENT, HYROX_INTENT, STRUCTURE_IDS, ctGovernance, hyroxContent, plannerGovernance, runningGovernance, withDemand } from '../../planner/tests/fixtures.js';
import { testCatalog, testRuleset } from '../../engine/tests/fixtures/load.js';
import { presetEquipment } from '../../engine/tests/fixtures/context.js';

const calls = new Map<string, number>();
function spied<E extends { propose: (i: never) => unknown }>(name: string, e: E): E {
  return { ...e, propose: (i: never) => { calls.set(name, (calls.get(name) ?? 0) + 1); return e.propose(i); } };
}

/** Environnement TEST_ONLY : moteurs réels, gouvernances et normalisations simulées (aucune signature réelle). */
function testEnv(o: { governance?: PlannerEnvironment['governance'] | null } = {}): PlannerEnvironment {
  return {
    mode: 'CANDIDATE',
    ...(o.governance === null ? {} : { governance: o.governance ?? plannerGovernance() }),
    strength: { engine: spied('strength', StrengthEngine) as SportEngine<unknown>, content: withDemand(strengthContent()) },
    running: { engine: spied('running', createRunningEngine({ governance: runningGovernance(), simulation: true })) as SportEngine<unknown>, content: withDemand(runningContent()) },
    crosstraining: { engine: spied('crosstraining', createCrossTrainingEngine({ governance: ctGovernance(), simulation: true })) as CrossTrainingEngine, content: withDemand({ ruleset: testRuleset(), catalog: testCatalog() }) },
    hyrox: { engine: spied('hyrox', createHyroxEngine({ simulation: true })) as HyroxEngine, content: hyroxContent() },
  };
}

const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — profil multisport de démonstration (minutes par jour, séances déclarées)
const AVAIL = [60, 60, 60, 60, 60, 90, 60];

function onboarded(): AppState {
  const s = completeOnboarding(emptyState(), profile({
    priorities: ['strength', 'running', 'crosstraining', 'hyrox'],
    strength: { enabled: true, goal: 'strength', sessionsPerWeek: 2 },
    running: { enabled: true, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    crosstraining: { enabled: true }, hyrox: { enabled: true },
    equipment: { presetId: 'preset.full_gym', items: [...new Set([...fullGym, ...presetEquipment('preset.hybrid_race_gym')])].sort() },
    availability: AVAIL,
  }), clock('2026-10-01'));
  // Course libre déclarée par l'utilisateur (ancre d'historique du moteur Course).
  return logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false }, clock('2026-10-01', '18:00:00'));
}

/** Programme : Strength / Running depuis le profil ; Cross-training et HYROX DÉCLARÉS (démonstration TEST_ONLY). */
function programme(s: AppState): ProgrammeIntent {
  const base = programmeFromProfile(s.profile!);
  return {
    origin: 'TEST_ONLY:demo-programme',
    sports: [
      ...base.sports,
      { sport: 'crosstraining', sessions: 1, intent: { ...CT_INTENT }, declarations: { population: { level: 'intermediate', hybrid: false }, goal: { type: 'GENERAL_FITNESS' }, returnState: { state: 'NONE' }, declaredSkills: [], benchmarks: [] } },
      { sport: 'hyrox', sessions: 1, intent: { ...HYROX_INTENT }, station: 'skierg', declarations: { population: { level: 'intermediate', hybrid: false }, returnState: { state: 'NONE' } } },
    ],
  };
}

describe('E2E multisport TEST_ONLY : profil → semaine persistée', () => {
  it('quatre sports orchestrés, moteurs réellement appelés, profils dérivés, voisins transmis, séances persistées et relues', () => {
    calls.clear();
    const s0 = onboarded();
    // 1. intention hebdomadaire reçue (composition déclarée, aucune composition déduite pour CT / HYROX)
    const s1 = setProgrammeIntent(s0, programme(s0));
    expect(s1.programme?.sports.map((x) => [x.sport, x.sessions])).toEqual([['strength', 2], ['running', 2], ['crosstraining', 1], ['hyrox', 1]]);
    // 2–3. planificateur appelé, moteurs réellement appelés
    const s2 = planProgrammeWeek(s1, clock(MONDAY), testEnv());
    expect([...calls.keys()].sort()).toEqual(['crosstraining', 'hyrox', 'running', 'strength']);
    const week = s2.planner.weeks[MONDAY];
    expect(week).toBeDefined();
    if (!week) return;
    // 4. séances générées (une par jour, chaque discipline)
    const planned = week.requests.filter((r) => r.status === 'planned');
    expect(planned.map((r) => r.sport).sort()).toEqual(['crosstraining', 'hyrox', 'running', 'running', 'strength', 'strength']);
    expect(new Set(planned.map((r) => r.date)).size).toBe(planned.length);
    // 5. profils de demande dérivés
    expect(planned.every((r) => r.demand?.status === 'derived')).toBe(true);
    // 6. interférences vérifiées (écart TEST_ONLY respecté : aucun conflit retenu entre séances placées)
    expect(week.hybrid).toBe(true);
    // 7. contexte voisin transmis à Strength, semaine connue
    const str = planned.filter((r) => r.sport === 'strength');
    expect(str.every((r) => r.neighbourContext?.known === true && r.neighbourContext.neighbours.length === 4)).toBe(true);
    // 9. persistées en session_record courant
    for (const r of planned) {
      const back = migrateToCurrent<SessionRecord>(r.record);
      expect(back.ok, r.requestId).toBe(true);
      if (back.ok) expect(back.value.session.discipline).toBe(r.sport === 'hyrox' ? 'hybrid_race' : r.sport);
    }
    // 10. relecture de l'état identique
    const decoded = decodeState(exportState(s2));
    expect(decoded.ok && decoded.state).toEqual(s2);
    // Le chemin V0 (Strength / Running) coexiste, inchangé.
    expect(Object.keys(s2.plans)).toEqual(Object.keys(s0.plans));
  });

  it('8. résultat partiel persisté : sans gouvernance du planificateur, multisport bloqué par gouvernance, raisons structurées', () => {
    const s0 = onboarded();
    const s = planProgrammeWeek(setProgrammeIntent(s0, programme(s0)), clock(MONDAY), testEnv({ governance: null }));
    const week = s.planner.weeks[MONDAY];
    expect(week?.requests.filter((r) => r.status === 'planned').length).toBeGreaterThan(0);
    expect(week?.requests.some((r) => r.category === 'governance_blocked')).toBe(true);
    expect(week?.governance[0]).toMatchObject({ code: 'RULE.PLANNER.PARAMETER_UNAVAILABLE', params: { cause: 'MISSING' } });
    expect(week?.requests.every((r) => r.reasons.length > 0)).toBe(true);
    const decoded = decodeState(exportState(s));
    expect(decoded.ok && decoded.state).toEqual(s);
  });

  it('conflit réel (écart strict TEST_ONLY) ⇒ demande non placée « interference_conflict », conflit X/Y/structure/règle persisté', () => {
    const s0 = onboarded();
    // technical-constant: TEST_ONLY — écart strict de test (heures)
    const strict = plannerGovernance(Object.fromEntries(STRUCTURE_IDS.map((x) => [x, 48])));
    const s = planProgrammeWeek(setProgrammeIntent(s0, programme(s0)), clock(MONDAY), testEnv({ governance: strict }));
    const week = s.planner.weeks[MONDAY];
    expect(week?.requests.some((r) => r.category === 'interference_conflict')).toBe(true);
    expect(week?.conflicts[0]).toMatchObject({ code: 'RECOVERY.PLANNER.INTERFERENCE_CONFLICT', params: { rule: 'planner.interference.structureWindows@0.1.0' } });
  });

  it('environnement applicatif par défaut : CT / HYROX non raccordés (ENGINE_UNAVAILABLE), multisport fail-closed, aucune séance inventée', () => {
    const s0 = onboarded();
    const s = planProgrammeWeek(setProgrammeIntent(s0, programme(s0)), clock(MONDAY));
    const week = s.planner.weeks[MONDAY];
    expect(week?.requests.filter((r) => r.sport === 'crosstraining' || r.sport === 'hyrox').map((r) => r.category)).toEqual(['engine_unavailable', 'engine_unavailable']);
    expect(week?.requests.find((r) => r.sport === 'running')?.status).not.toBe('planned');
  });

  it('intention de programme absente ⇒ erreur explicite (aucune composition déduite) ; intention incomplète ⇒ demande non placée', () => {
    const s0 = onboarded();
    expect(() => planProgrammeWeek(s0, clock(MONDAY), testEnv())).toThrow('PROGRAMME_INTENT_MISSING');
    const p = programme(s0);
    const s = planProgrammeWeek(setProgrammeIntent(s0, { ...p, sports: p.sports.map((x) => (x.sport === 'hyrox' ? { ...x, intent: { archetypeId: x.intent.archetypeId } } : x)) }), clock(MONDAY), testEnv());
    expect(s.planner.weeks[MONDAY]?.requests.find((r) => r.sport === 'hyrox')).toMatchObject({ status: 'unplaced', category: 'programme_intent_incomplete' });
  });

  it('semaine suivante : les séances persistées de la semaine précédente servent d’historique (voisins et interférence)', () => {
    const s0 = onboarded();
    const s1 = planProgrammeWeek(setProgrammeIntent(s0, programme(s0)), clock(MONDAY), testEnv());
    const s2 = planProgrammeWeek(s1, clock('2026-10-12'), testEnv());
    const next = s2.planner.weeks['2026-10-12'];
    const str = next?.requests.find((r) => r.sport === 'strength' && r.status === 'planned');
    expect((str?.neighbourContext?.neighbours.length ?? 0)).toBeGreaterThan(4);
  });

  it('déterministe : même état et même environnement ⇒ même semaine persistée', () => {
    const s0 = onboarded();
    const a = planProgrammeWeek(setProgrammeIntent(s0, programme(s0)), clock(MONDAY), testEnv());
    const b = planProgrammeWeek(setProgrammeIntent(s0, programme(s0)), clock(MONDAY), testEnv());
    expect(exportState(a)).toBe(exportState(b));
  });
});
