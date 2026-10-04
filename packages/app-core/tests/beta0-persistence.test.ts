/**
 * Beta 0 — sécurité et persistance : la douleur bloque TOUS les chemins de planification ; une semaine commencée ou
 * clôturée n'est jamais remplacée ; AppState v2 (migration v1 → v2 déterministe, idempotente, sans invention) ; cycle
 * export / import et rechargements aux frontières critiques ; idempotence. Environnement par défaut de l'application
 * (Strength provisoire, Running simulation) pour le mono-sport ; TEST_ONLY explicite pour l'hybride.
 */
import { describe, expect, it } from 'vitest';
import type { SportEngine } from '@hybridsport/engine';
import { migrateToCurrent } from '@hybridsport/engine';
import { asISODateTime } from '@hybridsport/domain';
import { StrengthEngine } from '@hybridsport/strength';
import { createRunningEngine } from '@hybridsport/running';
import {
  closeProgrammeWeekInApp, completeOnboarding, CURRENT_SCHEMA_VERSION, decodeState, emptyState, ensureCurrentWeek, EQUIPMENT_PRESETS, exportState, logFreeRun, migrateV1toV2,
  planProgrammeCurrentWeek, planProgrammeWeek, plannedWeekStatus, recordSessionExecution, runningContent, setProgrammeIntent, startProgramme, strengthContent, writePlannedWeek,
} from '../src/index.js';
import type { AppState, ProgrammeEnvironment } from '../src/index.js';
import { clock, profile } from './fixtures.js';
import { workSetsDone } from './executions.js';
import { plannerGovernance, runningGovernance, withDemand, RUNNING_INTENT, STRENGTH_INTENT } from '../../planner/tests/fixtures.js';
import { definition } from '../../programme/tests/fixtures.js';
import { presetEquipment } from '../../engine/tests/fixtures/context.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const id = (w: string, sport: string, k = 1) => `${w}.${sport}.${String(k)}`;
const fullGym = EQUIPMENT_PRESETS.find((p) => p.id === 'preset.full_gym')?.equipment ?? [];
// technical-constant: TEST_ONLY — minutes disponibles par jour
const AVAIL = [90, 90, 90, 90, 90, 90, 90];

/** Environnement HYBRIDE TEST_ONLY (Strength + Running) : intégration planificateur et fenêtres d'interférence de test. */
const hybridEnv = (): ProgrammeEnvironment => ({
  mode: 'CANDIDATE', governance: plannerGovernance(),
  strength: { engine: StrengthEngine as SportEngine<unknown>, content: withDemand(strengthContent()) },
  running: { engine: createRunningEngine({ governance: runningGovernance(), simulation: true }) as SportEngine<unknown>, content: withDemand(runningContent()) },
});

type Sports = 'strength' | 'running' | 'hybrid';
function athlete(sports: Sports): AppState {
  const s = completeOnboarding(emptyState(), profile({
    priorities: sports === 'running' ? ['running'] : sports === 'strength' ? ['strength'] : ['strength', 'running'],
    strength: { enabled: sports !== 'running', goal: 'strength', sessionsPerWeek: 2 },
    running: { enabled: sports !== 'strength', population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
    equipment: { presetId: 'preset.full_gym', items: [...new Set([...fullGym, ...presetEquipment('preset.hybrid_race_gym')])].sort() },
    availability: AVAIL,
  }), clock('2026-10-01'));
  // technical-constant: TEST_ONLY — course libre déclarée (s, m)
  return sports === 'strength' ? s : logFreeRun(s, { realizedDurationS: 1800, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, distanceM: 5000 }, clock('2026-10-01', '18:00:00'));
}
const DEF: Record<Sports, ReturnType<typeof definition>> = {
  strength: definition({ goals: [{ goalId: 'g.s', sport: 'strength', goal: 'strength' }], priorities: ['strength'], sports: [{ sport: 'strength', sessionsPerWeek: 2, intent: { ...STRENGTH_INTENT } }] }),
  running: definition({ goals: [{ goalId: 'g.r', sport: 'running', goal: 'TEN_K' }], priorities: ['running'], sports: [{ sport: 'running', sessionsPerWeek: 2, intent: { ...RUNNING_INTENT } }] }),
  hybrid: definition(),
};
const envOf = (sports: Sports): ProgrammeEnvironment | undefined => (sports === 'hybrid' ? hybridEnv() : undefined);
const planned = (sports: Sports): AppState => {
  const s = startProgramme(athlete(sports), DEF[sports], clock(W1));
  const e = envOf(sports);
  return e ? planProgrammeCurrentWeek(s, clock(W1), e) : planProgrammeCurrentWeek(s, clock(W1));
};
const withPain = (s: AppState): AppState => ({ ...s, safety: { activePain: { reportedAt: asISODateTime('2026-10-05T07:00:00Z'), areas: ['knee'] } } });
const reload = (s: AppState): AppState => { const d = decodeState(exportState(s)); if (!d.ok) throw new Error(d.problem); return d.state; };

describe('P0 douleur : aucun chemin de planification ne la contourne', () => {
  it.each(['strength', 'running', 'hybrid'] as const)('%s : programme bloqué (SAFETY_PAUSE_ACTIVE_PAIN), état inchangé', (sports) => {
    const s = withPain(startProgramme(athlete(sports), DEF[sports], clock(W1)));
    const e = envOf(sports);
    expect(() => (e ? planProgrammeCurrentWeek(s, clock(W1), e) : planProgrammeCurrentWeek(s, clock(W1)))).toThrow('SAFETY_PAUSE_ACTIVE_PAIN');
  });

  it('contournement par le chemin multisport V2 (planProgrammeWeek) : bloqué aussi', () => {
    const s = withPain(setProgrammeIntent(athlete('hybrid'), { origin: 'TEST_ONLY', sports: [{ sport: 'strength', sessions: 1, intent: { ...STRENGTH_INTENT } }] }));
    expect(() => planProgrammeWeek(s, clock(W1), hybridEnv())).toThrow('SAFETY_PAUSE_ACTIVE_PAIN');
  });

  it('chemin V0 : douleur ⇒ toutes les séances indisponibles (même prédicat), aucune séance générée', () => {
    for (const sports of ['strength', 'running'] as const) {
      const s = ensureCurrentWeek(withPain(athlete(sports)), clock(W1));
      // Semaine courante (les séances passées générées avant la douleur restent telles quelles).
      const all = Object.values(s.sessions).filter((g) => g.date >= W1);
      expect(all.length).toBeGreaterThan(0);
      expect(all.every((g) => g.outcome.status === 'unavailable' && g.outcome.reasons[0]?.code === 'KAIRO.SAFETY_PAUSE_ACTIVE_PAIN')).toBe(true);
    }
  });

  it('replanification et import d’un état avec douleur active : toujours bloqués', () => {
    const s = withPain(planned('strength'));
    expect(() => planProgrammeCurrentWeek(s, clock(W1))).toThrow('SAFETY_PAUSE_ACTIVE_PAIN');
    expect(() => planProgrammeCurrentWeek(reload(s), clock(W1))).toThrow('SAFETY_PAUSE_ACTIVE_PAIN');
  });
});

describe('P0 écrasement : états de semaine et opérations autorisées', () => {
  it('absent → planned → started → closed ; mono Strength, mono Running, hybride', () => {
    for (const sports of ['strength', 'running', 'hybrid'] as const) {
      const s0 = startProgramme(athlete(sports), DEF[sports], clock(W1));
      expect(plannedWeekStatus(s0, W1)).toBe('absent');
      const s1 = planned(sports);
      expect(plannedWeekStatus(s1, W1), sports).toBe('planned');
      const first = s1.planner.weeks[W1]?.requests.find((r) => r.status === 'planned');
      expect(first, sports).toBeDefined();
      const s2 = recordSessionExecution(s1, clock(W1, '19:00:00'), { sport: first?.sport === 'running' ? 'running' : 'strength', requestId: first?.requestId ?? '', completion: 'missed' } as never);
      expect(plannedWeekStatus(s2, W1)).toBe('started');
      const s3 = closeProgrammeWeekInApp(s2, clock(W2), envOf(sports));
      expect(plannedWeekStatus(s3, W1)).toBe('closed');
    }
  });

  it('semaine vierge : planifiable ; deux planifications identiques ⇒ même état (idempotent) ; replanification avant exécution admise', () => {
    const a = planned('strength');
    expect(exportState(a)).toBe(exportState(planned('strength')));
    const again = planProgrammeCurrentWeek(a, clock(W1));
    expect(again.planner.weeks[W1]?.requests).toEqual(a.planner.weeks[W1]?.requests);
  });

  it('semaine commencée : jamais remplacée (programme refuse ; passerelle refuse WEEK_NOT_REPLACEABLE) ; état intact', () => {
    let s = planned('strength');
    s = recordSessionExecution(s, clock(W1, '19:00:00'), { sport: 'strength', requestId: id(W1, 'strength'), completion: 'modified', pain: 'NONE', sets: workSetsDone(s, id(W1, 'strength')).slice(0, 1) });
    expect(() => planProgrammeCurrentWeek(s, clock(W1))).toThrow();
    const week = s.planner.weeks[W1];
    if (!week) throw new Error('semaine attendue');
    const { owner: _o, ...raw } = week;
    expect(() => writePlannedWeek(s, raw, 'programme')).toThrow('WEEK_NOT_REPLACEABLE');
    expect(() => writePlannedWeek(s, raw, 'multisport')).toThrow('WEEK_NOT_REPLACEABLE');
  });

  it('semaine clôturée : jamais remplacée ; double clôture refusée', () => {
    const s = closeProgrammeWeekInApp(planned('strength'), clock(W2));
    const week = s.planner.weeks[W1];
    if (!week) throw new Error('semaine attendue');
    const { owner: _o, ...raw } = week;
    expect(() => writePlannedWeek(s, raw, 'programme')).toThrow('WEEK_NOT_REPLACEABLE');
    expect(() => closeProgrammeWeekInApp(s, clock(W2), undefined, 0)).toThrow('PROGRAMME_WEEK_NOT_CLOSABLE');
  });

  it('semaine du programme : le chemin multisport ne peut pas la remplacer, même vierge (propriétaire unique)', () => {
    const s = setProgrammeIntent(planned('hybrid'), { origin: 'TEST_ONLY', sports: [{ sport: 'strength', sessions: 1, intent: { ...STRENGTH_INTENT } }] });
    expect(s.planner.weeks[W1]?.owner).toBe('programme');
    expect(() => planProgrammeWeek(s, clock(W1), hybridEnv())).toThrow('WEEK_OWNED_BY_PROGRAMME');
  });

  it('double exécution refusée ; exécutions uniques après rechargement', () => {
    let s = planned('running');
    s = recordSessionExecution(s, clock(W1, '19:00:00'), { sport: 'running', requestId: id(W1, 'running'), completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: 1800, distanceM: 5000 } });
    expect(() => recordSessionExecution(reload(s), clock(W1, '19:00:00'), { sport: 'running', requestId: id(W1, 'running'), completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: 1800, distanceM: 5000 } })).toThrow('EXECUTION_DUPLICATE');
  });
});

describe('AppState v2 : migration v1 → v2', () => {
  /** Rétrograde un état v2 réel vers la forme v1 (suppression exacte des seuls champs ajoutés en v2). */
  function toV1(s: AppState): unknown {
    const j = JSON.parse(exportState(s)) as Record<string, unknown> & { sessions: Record<string, Record<string, unknown>>; planner: { weeks: Record<string, Record<string, unknown>> } };
    for (const g of Object.values(j.sessions)) delete g.storage;
    for (const w of Object.values(j.planner.weeks)) delete w.owner;
    return { ...j, schemaVersion: 1 };
  }
  const v0AndProgramme = (): AppState => {
    const v0 = ensureCurrentWeek(athlete('strength'), clock(W1));
    return planProgrammeCurrentWeek(startProgramme(v0, DEF.strength, clock(W1)), clock(W1));
  };

  it('v1 réel (V0 + programme) ⇒ v2 sans perte : identique à l’état d’origine', () => {
    const s = v0AndProgramme();
    expect(Object.keys(s.sessions).length).toBeGreaterThan(0);
    const d = decodeState(JSON.stringify(toV1(s)));
    expect(d.ok && d.from).toBe(1);
    expect(d.ok && d.state).toEqual(s);
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });

  it('déterministe et idempotente : même v1 ⇒ même v2 ; une donnée déjà v2 n’est jamais remigrée', () => {
    const v1 = toV1(v0AndProgramme());
    expect(JSON.stringify(migrateV1toV2(v1))).toBe(JSON.stringify(migrateV1toV2(v1)));
    expect(() => migrateV1toV2(migrateV1toV2(v1))).toThrow();
    const once = decodeState(JSON.stringify(v1));
    const twice = once.ok ? decodeState(exportState(once.state)) : once;
    expect(twice.ok && twice.from).toBe(2);
    expect(once.ok && twice.ok && twice.state).toEqual(once.ok ? once.state : null);
  });

  it('legacy incomplet : séances V0 marquées legacy_v0, AUCUNE provenance ni session_record inventés', () => {
    const d = decodeState(JSON.stringify(toV1(v0AndProgramme())));
    if (!d.ok) throw new Error(d.problem);
    for (const g of Object.values(d.state.sessions)) {
      expect(g.storage).toBe('legacy_v0');
      expect(JSON.stringify(g)).not.toMatch(/"provenance"|"traceId"|"schemaVersion"/);
    }
  });

  it('propriétaire déduit de la seule donnée existante : semaine référencée par le programme ⇒ programme ; sinon multisport', () => {
    const s = setProgrammeIntent(athlete('hybrid'), { origin: 'TEST_ONLY', sports: [{ sport: 'strength', sessions: 1, intent: { ...STRENGTH_INTENT } }] });
    const v2 = planProgrammeWeek(s, clock(W1), hybridEnv());
    expect(v2.planner.weeks[W1]?.owner).toBe('multisport');
    const d = decodeState(JSON.stringify(toV1(v2)));
    expect(d.ok && d.state.planner.weeks[W1]?.owner).toBe('multisport');
    const p = decodeState(JSON.stringify(toV1(v0AndProgramme())));
    expect(p.ok && p.state.planner.weeks[W1]?.owner).toBe('programme');
  });

  it('v1 malformé : refusé (jamais réparé) ; v1 vide valide ⇒ v2 vide', () => {
    expect(decodeState(JSON.stringify({ schemaVersion: 1, profile: 42 })).ok).toBe(false);
    const empty = decodeState(JSON.stringify(toV1(emptyState())));
    expect(empty.ok && empty.state).toEqual(emptyState());
  });
});

describe('format canonique / legacy', () => {
  it('chemin programme : chaque séance planifiée en session_record courant (v6) ; V0 : legacy_v0 explicite', () => {
    const s = planProgrammeCurrentWeek(startProgramme(ensureCurrentWeek(athlete('strength'), clock(W1)), DEF.strength, clock(W1)), clock(W1));
    for (const r of s.planner.weeks[W1]?.requests ?? []) {
      if (r.status !== 'planned') continue;
      expect(r.record?.kind).toBe('session_record');
      expect(r.record?.schemaVersion).toBe(6);
      expect(migrateToCurrent(r.record).ok).toBe(true);
    }
    expect(Object.values(s.sessions).every((g) => g.storage === 'legacy_v0')).toBe(true);
  });
});

describe('export / import / rechargement', () => {
  it('cycle Beta 0 complet : profil → programme → planification → exécutions S et R → clôture → export → import → reprise → semaine suivante', () => {
    const env = hybridEnv();
    let s = planProgrammeCurrentWeek(startProgramme(athlete('hybrid'), DEF.hybrid, clock(W1)), clock(W1), env);
    s = recordSessionExecution(s, clock(W1, '19:00:00'), { sport: 'strength', requestId: id(W1, 'strength'), completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(s, id(W1, 'strength'), { loadKg: 60, rir: 2 }) });
    s = recordSessionExecution(s, clock(W1, '19:00:00'), { sport: 'running', requestId: id(W1, 'running'), completion: 'completed_as_prescribed', pain: 'NONE', run: { realizedDurationS: 1800, distanceM: 5200 } });
    s = closeProgrammeWeekInApp(s, clock(W2), env);
    const text = exportState(s);
    // Destruction de l'état en mémoire : seule la sauvegarde exportée subsiste.
    const d = decodeState(text);
    if (!d.ok) throw new Error(d.problem);
    const back = d.state;
    expect(back).toEqual(s);
    expect(back.planner.weeks[W1]?.requests.filter((r) => r.status === 'planned')).toHaveLength(s.planner.weeks[W1]?.requests.filter((r) => r.status === 'planned').length ?? -1);
    expect(new Set(back.programmeState?.results.map((r) => r.requestId)).size).toBe(back.programmeState?.results.length);
    expect(back.strength.exposures).toEqual(s.strength.exposures);
    expect(back.running.realized).toEqual(s.running.realized);
    // Reprise : semaine suivante planifiée depuis l'état importé, identique à une reprise sans import.
    const next = planProgrammeCurrentWeek(back, clock(W2), hybridEnv());
    // Égalité SÉMANTIQUE (l'export JSON n'est pas canonique : l'ordre des clés suit le schéma après relecture).
    expect(next).toEqual(planProgrammeCurrentWeek(s, clock(W2), hybridEnv()));
    expect(next.programmeState?.weeks.map((w) => w.plannerRef)).toEqual([W1, W2]);
    // Double import : stable.
    expect(reload(reload(s))).toEqual(s);
  });

  it('rechargement brutal aux frontières : après planification, après exécution, après clôture ⇒ la suite est identique', () => {
    const steps: ((x: AppState) => AppState)[] = [
      (x) => planProgrammeCurrentWeek(x, clock(W1)),
      (x) => recordSessionExecution(x, clock(W1, '19:00:00'), { sport: 'strength', requestId: id(W1, 'strength'), completion: 'completed_as_prescribed', pain: 'NONE', sets: workSetsDone(x, id(W1, 'strength'), { loadKg: 60 }) }),
      (x) => closeProgrammeWeekInApp(x, clock(W2)),
      (x) => planProgrammeCurrentWeek(x, clock(W2)),
    ];
    let straight = startProgramme(athlete('strength'), DEF.strength, clock(W1));
    let reloaded = straight;
    for (const step of steps) {
      straight = step(straight);
      reloaded = step(reload(reloaded));
      expect(reloaded).toEqual(straight);
      expect(reload(reloaded)).toEqual(reload(straight));
    }
  });
});
