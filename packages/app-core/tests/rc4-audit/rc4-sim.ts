/**
 * RC4 — banc d'audit sportif multisport (LECTURE SEULE des moteurs et du planificateur). Chemin RÉEL de l'application
 * Beta 0 : onboarding (`createBeta0Programme`), contrôle avant séance (`startProgrammeSession`), saisie (séries,
 * efforts, chronos), fin de séance (`finishProgrammeSession`), retour terrain, courses libres, semaine suivante
 * (`ensureBeta0Week`). Aucune règle sportive, aucune valeur de prescription : le banc OBSERVE ce que produisent les
 * moteurs à partir des réalisations simulées entre les semaines.
 *
 * Réalisations simulées (athlète « conforme ») : Musculation toutes séries faites au haut de la fourchette, charge
 * prescrite si elle existe, sinon charge de travail suivie par exercice ; Course faite comme prévu, avec distance
 * (allure fictive constante, uniquement pour produire une saisie) ; TEST avec son temps ; Cross-training et HYROX
 * terminés avec leur résultat structuré. Contrôles : normal, sauf scénario (fatigue, douleur).
 */
import { readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import {
  beta0Environment, controlCtTimer, ctWorkoutOf, createBeta0Programme, emptyState, ensureBeta0Week, EQUIPMENT_PRESETS, finishProgrammeSession, hrWorkoutOfView, logFreeRun,
  recordFieldFeedback, recordProgrammeSet, recordProgrammeSetEffort, selectBeta0Week, selectProgrammeSession, setHrSteps, startProgrammeSession, strengthContent, strengthWeekInsights,
} from '../../src/index.js';
import type { AppState, CheckInInput, Clock, ProfileInput, SessionView } from '../../src/index.js';

// technical-constant: TEST_ONLY — lundis des 6 semaines simulées
export const MONS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'] as const;
const at = (d: string, hm: string): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const eq = (id: string): string[] => [...(EQUIPMENT_PRESETS.find((p) => p.id === id)?.equipment ?? [])];
// technical-constant: TEST_ONLY — allure fictive de saisie (s/km) pour produire une distance réalisée, et charge de départ (kg)
const SIM_PACE = 330;
const START_KG = 40;
const TEST_PACE = 300;

export interface ProfileSpec {
  readonly id: string;
  readonly label: string;
  readonly profile: ProfileInput;
  readonly lastRun?: { readonly realizedDurationS: number; readonly difficulty: 'AS_EXPECTED'; readonly distanceM?: number };
  readonly requestTest?: boolean;
  /** Course libre réellement enregistrée (semaine index, jour, durée s, distance m). */
  readonly freeRuns?: readonly { readonly week: number; readonly day: string; readonly durationS: number; readonly distanceM: number }[];
  /** Contrôle avant séance scénarisé (semaine, rang de la séance dans la semaine) ; défaut : « Non », fatigue faible. */
  readonly checkIn?: (w: number, k: number, v: SessionView) => CheckInInput;
  /** Effort déclaré = effort prescrit + décalage (1 : séries plus faciles que prévu, athlète qui progresse). */
  readonly rirOffset?: number;
  /** RC4.1 — difficulté ressentie déclarée en fin de course ; `null` : question ignorée (défaut : « comme prévu »). */
  readonly runDifficulty?: 'EASIER' | 'AS_EXPECTED' | 'HARDER' | 'MUCH_HARDER' | null;
}

const base = (o: Partial<ProfileInput>): ProfileInput => ({
  displayName: '', level: 'intermediate', priorities: ['strength'],
  strength: { enabled: false, goal: 'hypertrophy', sessionsPerWeek: 3 },
  running: { enabled: false, population: 'P_R2', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
  crosstraining: { enabled: false }, hyrox: { enabled: false },
  equipment: { presetId: 'preset.hybrid_race_gym', items: [...new Set([...eq('preset.hybrid_race_gym'), ...eq('preset.full_gym')])], confirmedAt: '2026-10-04T10:00:00Z' },
  availability: [75, 60, 75, 60, 75, 90, 60], excludedExercises: [], acceptedProvisionalAt: '2026-10-04T10:00:00Z',
  ...o,
});
const STR3 = { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 } as const;
const RUN10K = { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } as const;
const LAST = { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' as const, distanceM: 5000 };
const HR = (n: number) => ({ enabled: true, sessionsPerWeek: n, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE' } as const);
const CT = (n: number) => ({ enabled: true, sessionsPerWeek: n, intent: 'crosstraining.mixed_modal_medium', returnState: 'NONE' } as const);
/** Fatigue élevée à la 2e séance de la semaine 3 ; genou P2 à la 1re séance de la semaine 4. */
const SCENARIO = (w: number, k: number): CheckInInput => {
  if (w === 2 && k === 1) return { painAnswer: 'no', fatigue: 'high', recovery: 'poor' };
  if (w === 3 && k === 0) return { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' };
  return { painAnswer: 'no', fatigue: 'low', recovery: 'good' };
};

/** Matrice de profils représentatifs (§1 de la mission). */
export const PROFILES: readonly ProfileSpec[] = [
  { id: 'P1', label: 'Musculation 3× (masse) + Course 2× (10 km)', profile: base({ priorities: ['strength', 'running'], strength: STR3, running: RUN10K }), lastRun: LAST, requestTest: true, checkIn: SCENARIO,
    freeRuns: [{ week: 1, day: '2026-10-17', durationS: 3600, distanceM: 10000 }] },
  { id: 'P1b', label: 'Musculation 4× (masse) + Course 2× (10 km)', profile: base({ priorities: ['strength', 'running'], strength: { ...STR3, sessionsPerWeek: 4 }, running: RUN10K }), lastRun: LAST, requestTest: true },
  { id: 'P2', label: 'Musculation 3× (masse) + Cross-training 2×', profile: base({ priorities: ['strength', 'crosstraining'], strength: STR3, crosstraining: CT(2) }), checkIn: SCENARIO },
  { id: 'P3', label: 'Musculation 3× (masse) + HYROX 2×', profile: base({ priorities: ['strength', 'hyrox'], strength: STR3, hyrox: HR(2) }) },
  { id: 'P4', label: 'Course 3× (semi) + HYROX 2×', profile: base({ priorities: ['running', 'hyrox'], running: { ...RUN10K, population: 'P_R3', goal: 'HALF_MARATHON', sessionsPerWeek: 3 }, hyrox: HR(2) }), lastRun: LAST, requestTest: true,
    freeRuns: [{ week: 2, day: '2026-10-25', durationS: 4800, distanceM: 14000 }] },
  { id: 'P5', label: 'Quatre sports : Musculation 3×, Course 2×, Cross-training 1×, HYROX 1×', profile: base({ priorities: ['strength', 'running', 'crosstraining', 'hyrox'], strength: STR3, running: RUN10K, crosstraining: CT(1), hyrox: HR(1), availability: [90, 75, 90, 75, 90, 120, 90] }), lastRun: LAST, requestTest: true, checkIn: SCENARIO },
];

export interface SessionRow {
  readonly week: number; readonly date: string | null; readonly sport: string; readonly status: string; readonly placement: string;
  readonly archetype: string | null; readonly variant: string | null; readonly role: string | null; readonly ctFormat: string | null; readonly hrTimeCapS: number | null;
  readonly targetMin: number | null; readonly notPlanned: string | null; readonly arbitration: string | null;
  /** Musculation : séries de travail par groupe (séance prescrite) ; exercices de force ; réductions d'interférence. */
  readonly groups: Readonly<Record<string, number>>; readonly exercises: readonly { readonly id: string; readonly sets: number; readonly reps: string; readonly load: string; readonly rir: string }[];
  readonly reductions: readonly string[];
  /** Course : structure (segments). */
  readonly run: string | null; readonly runPaced: boolean;
  /** CT / HYROX : contenu. */
  readonly content: string | null;
  checkIn: string; adapted: string; executed: string;
}
export interface WeekRow {
  readonly week: number; readonly monday: string;
  readonly volume: readonly { readonly group: string; readonly planned: number; readonly target: number | null; readonly high: number | null; readonly status: string }[];
  readonly volumeStatus: string | null;
  readonly recovery: readonly string[];
  readonly arbitration: string;
}
export interface SimOut { readonly spec: ProfileSpec; readonly sessions: SessionRow[]; readonly weeks: WeekRow[]; readonly state: AppState; readonly errors: string[] }

const repsOf = (r: unknown): string => {
  if (typeof r === 'number') return String(r);
  const x = r as { min?: number; max?: number } | null;
  return x && typeof x.min === 'number' ? `${String(x.min)}-${String(x.max)}` : '?';
};
const topReps = (r: unknown): number => (typeof r === 'number' ? r : r && typeof r === 'object' && 'max' in r ? (r as { max: number }).max : 8);
function loadOf(set: { intensity?: unknown }): string {
  const i = set.intensity as { mode?: string; kg?: number; kgRounded?: number; rir?: unknown; rpe?: unknown } | undefined;
  if (!i) return '—';
  if (i.mode === 'load') return `${String(i.kg)} kg`;
  if (i.mode === 'percent_of_reference') return `${String(i.kgRounded)} kg`;
  return i.mode ?? '—';
}
const prescribedRir = (set: { intensity?: unknown }): number | undefined => {
  const r = (set.intensity as { effort?: { rir?: number | { min: number; max: number } } } | undefined)?.effort?.rir;
  return typeof r === 'number' ? r : r ? r.min : undefined;
};
function rirOf(set: { intensity?: unknown }): string {
  const r = (set.intensity as { effort?: { rir?: number | { min: number; max: number } } } | undefined)?.effort?.rir;
  return r === undefined ? '—' : typeof r === 'number' ? String(r) : `${String(r.min)}-${String(r.max)}`;
}

/** `env` : environnement Beta 0 (par défaut) ; `beta0Environment({ globalPlacement: false })` rejoue V0 (RC4.4). */
export function simulate(spec: ProfileSpec, weeks: number = MONS.length, env = beta0Environment()): SimOut {
  const content = strengthContent();
  const params = readStrengthParams(content.ruleset).values;
  const errors: string[] = [];
  let s = createBeta0Programme(emptyState(), spec.profile, at(MONS[0], '07:00'), { ...(spec.lastRun ? { lastRun: spec.lastRun } : {}), ...(spec.requestTest ? { requestTest: true } : {}) }, env);
  const workKg: Record<string, number> = {};
  const sessions: SessionRow[] = [];
  const out: WeekRow[] = [];
  for (let w = 0; w < weeks; w++) {
    const mon = MONS[w] as string;
    if (w > 0) s = ensureBeta0Week(s, at(mon, '06:00'), env);
    const view = [...(selectBeta0Week(s, mon)?.sessions ?? [])].sort((a, b) => ((a.date ?? 'z') < (b.date ?? 'z') ? -1 : 1));
    const ins = strengthWeekInsights(s, mon);
    let k = 0;
    for (const v of view) {
      const pv = selectProgrammeSession(s, v.requestId);
      const sess = pv?.session;
      const si = ins?.sessions.find((x) => x.requestId === v.requestId);
      const strengthItems = v.sport === 'strength' ? (sess?.blocks ?? []).filter((b) => b.kind === 'strength' || b.kind === 'accessory').flatMap((b) => b.items) : [];
      const runP = sess?.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'run_structure')?.prescription;
      const hw = pv ? hrWorkoutOfView(pv) : null;
      const row: SessionRow = {
        week: w + 1, date: v.date, sport: v.sport, status: v.status, placement: v.placement, archetype: v.archetypeId, variant: si?.variant ?? null, role: v.role, ctFormat: v.ctFormat, hrTimeCapS: v.hrTimeCapS,
        targetMin: v.targetDurationS === null ? null : Math.round(v.targetDurationS / 60),
        notPlanned: v.notPlanned ? `${v.notPlanned.display}:${v.notPlanned.reason?.code ?? ''}` : null,
        arbitration: v.arbitration ? `${v.arbitration.kind}${v.arbitration.withSport ? `/${v.arbitration.withSport}` : ''}` : null,
        groups: sess && v.sport === 'strength' ? sessionPlannedHardSets({ ...sess, blocks: sess.blocks.filter((b) => b.kind === 'strength' || b.kind === 'accessory') }, params, content.catalog) : {},
        exercises: strengthItems.flatMap((i) => (i.prescription.type === 'sets' ? [{ id: i.exerciseId.replace('ex.', ''), sets: i.prescription.sets.filter((x) => x.kind !== 'rampup').length, reps: repsOf(i.prescription.sets.find((x) => x.kind !== 'rampup')?.reps), load: loadOf(i.prescription.sets.find((x) => x.kind !== 'rampup') ?? {}), rir: rirOf(i.prescription.sets.find((x) => x.kind !== 'rampup') ?? {}) }] : [])),
        reductions: (si?.reductions ?? []).map((r) => `${r.withSport}@${String(r.hours)}h:${r.structure}:${r.action}`),
        run: runP?.type === 'run_structure' ? runP.segments.map((x) => (x.kind === 'repeat' ? `${String(x.reps)}×${'durationS' in x.work ? `${String(x.work.durationS / 60)}min` : `${String(x.work.distanceM)}m`}/${'durationS' in x.recovery.dose ? String(x.recovery.dose.durationS) : '?'}s` : `${x.kind}:${'durationS' in x.dose ? `${String(x.dose.durationS / 60)}min` : `${String(x.dose.distanceM / 1000)}km`}`)).join(' + ') : null,
        runPaced: runP?.type === 'run_structure' ? runP.segments.some((x) => x.target.priority === 'pace') : false,
        content: v.sport === 'crosstraining' && sess
          ? sess.blocks.map((b) => `${b.kind}${b.format ? `(${b.format})` : ''}:${b.items.map((i) => i.exerciseId.replace('ex.', '')).join(',')}`).join(' | ')
          : hw ? `${hw.structure} ${String(hw.rounds)}×[${hw.components.map((c) => (c.kind === 'run' ? 'run' : c.exerciseId.replace('ex.', ''))).join(',')}] cap ${String(Math.round(hw.timeCapS / 60))}min` : null,
        checkIn: '—', adapted: '—', executed: v.placement === 'planned' && v.date ? 'à faire' : '—',
      };
      sessions.push(row);
      if (v.placement !== 'planned' || !v.date) continue;
      const d = v.date;
      try {
        const ci = spec.checkIn ? spec.checkIn(w, k, v) : { painAnswer: 'no' as const, fatigue: 'low' as const, recovery: 'good' as const };
        k += 1;
        row.checkIn = `${ci.painAnswer ?? '?'}/${ci.fatigue ?? '?'}${ci.pains?.length ? `/${ci.pains.map((p) => `${p.area}:${p.level}`).join(',')}` : ''}`;
        const st = startProgrammeSession(s, at(d, '08:00'), v.requestId, env, ci);
        const c = st.checkIns.at(-1);
        row.adapted = `${c?.decision ?? '—'}${st.programmeLogs[v.requestId]?.adaptation ? ` [${(st.programmeLogs[v.requestId]?.adaptation?.changes ?? []).join(';').replace(/ex\./g, '').slice(0, 120)}]` : ''}`;
        s = st;
        if (!s.programmeLogs[v.requestId]) { row.executed = 'non démarrée'; continue; }
        const live = selectProgrammeSession(s, v.requestId)?.session;
        if (v.sport === 'strength' || v.sport === 'crosstraining') {
          for (const b of (live?.blocks ?? []).filter((x) => x.kind !== 'warmup' && x.kind !== 'cooldown')) {
            for (const it of b.items) {
              if (it.prescription.type !== 'sets') continue;
              const sets = it.prescription.sets;
              sets.forEach((p, i) => {
                const prescribed = (p.intensity as { mode?: string; kg?: number; kgRounded?: number } | undefined);
                // Charge prescrite si elle existe ; poids du corps : aucune charge ; sinon charge de travail suivie (calibration).
                const kg = prescribed?.mode === 'load' ? prescribed.kg : prescribed?.mode === 'percent_of_reference' ? prescribed.kgRounded : prescribed?.mode === 'bodyweight' ? undefined : (workKg[it.exerciseId] ?? START_KG);
                s = recordProgrammeSet(s, at(d, '08:20'), v.requestId, { itemId: it.id, setIndex: i, done: true, reps: topReps(p.reps), ...(kg !== undefined ? { loadKg: kg } : {}) });
                // Effort déclaré = effort prescrit (athlète exactement dans la cible).
                const rir = prescribedRir(p);
                if (i === sets.length - 1 && rir !== undefined) { try { s = recordProgrammeSetEffort(s, v.requestId, it.id, i, rir + (spec.rirOffset ?? 0)); } catch { /* effort non demandé */ } }
                if (kg !== undefined) workKg[it.exerciseId] = kg;
              });
            }
          }
        }
        let finish: Record<string, unknown> = { requestId: v.requestId, completion: 'completed_as_prescribed', pain: false };
        if (v.sport === 'running') {
          // Durée réalisée = durée PRESCRITE (somme des segments en durée ; TEST : estimation du CORE).
          const segs = runP?.type === 'run_structure' ? runP.segments : [];
          const prescribedS = segs.reduce((n, g) => n + (g.kind === 'repeat' ? ('durationS' in g.work ? g.reps * g.work.durationS : 0) + ('durationS' in g.recovery.dose ? (g.reps - 1) * g.recovery.dose.durationS : 0) : 'durationS' in g.dose ? g.dose.durationS : 0), 0);
          const hasDistance = segs.some((g) => g.kind !== 'repeat' && 'distanceM' in g.dose);
          const durS = hasDistance ? (v.estimatedDurationS ?? 3600) : prescribedS || (v.targetDurationS ?? 1800);
          const testSeg = runP?.type === 'run_structure' ? runP.segments.find((x) => x.id === 'test') : undefined;
          const testDist = testSeg && testSeg.kind === 'steady' && 'distanceM' in testSeg.dose ? testSeg.dose.distanceM : null;
          const difficulty = spec.runDifficulty === undefined ? 'AS_EXPECTED' : spec.runDifficulty;
          finish = { ...finish, run: { realizedDurationS: Math.round(durS), distanceM: Math.round((durS / SIM_PACE) * 1000), ...(testDist ? { testTimeS: Math.round((testDist / 1000) * TEST_PACE) } : {}) }, ...(difficulty !== null ? { difficulty } : {}) };
        }
        if (v.sport === 'crosstraining') {
          const rt = s.programmeLogs[v.requestId]?.ct;
          if (rt && rt.runningSince === null) s = controlCtTimer(s, at(d, '08:15'), v.requestId, 'resume');
          // Résultat conforme à la prescription réelle (séance faite telle que prescrite).
          const cw = live ? ctWorkoutOf(live) : null;
          const result = cw?.format === 'amrap' ? { kind: 'rounds_reps', rounds: 5, reps: 0 }
            : cw?.format === 'emom' ? { kind: 'emom', minutesCompleted: cw.minutes ?? 0 }
              : cw?.format === 'for_time' ? { kind: 'time', completionS: Math.round((cw.timeCapS ?? 1200) * 0.8) }
                : cw?.format === 'intervals' ? { kind: 'intervals', intervalsCompleted: cw.rounds ?? 1 }
                  : { kind: 'total', durationS: cw?.totalS ?? 900 };
          finish = { ...finish, ct: { result } };
        }
        if (v.sport === 'hyrox' && hw) { s = setHrSteps(s, v.requestId, hw.steps.length); finish = { ...finish, hr: { timeCapReached: false } }; }
        try { s = finishProgrammeSession(s, at(d, '09:30'), finish as never); }
        catch (e) {
          // Résultat refusé « comme prévu » ⇒ séance déclarée adaptée (constat tracé).
          errors.push(`S${String(w + 1)} ${v.sport} ${d} : fin « comme prévu » refusée (${(e as { code?: string }).code ?? String(e)}), déclarée adaptée`);
          s = finishProgrammeSession(s, at(d, '09:31'), { ...finish, completion: 'modified' } as never);
        }
        s = recordFieldFeedback(s, at(d, '09:40'), v.requestId, { difficulty: 'adapted', tolerance: 'good', perceivedDuration: 'adapted' });
        row.executed = 'réalisée';
      } catch (e) { row.executed = `erreur ${(e as { code?: string }).code ?? String(e)}`; errors.push(`S${String(w + 1)} ${v.sport} ${d} : ${row.executed}`); }
    }
    for (const fr of (spec.freeRuns ?? []).filter((x) => x.week === w)) {
      try { s = logFreeRun(s, { realizedDurationS: fr.durationS, distanceM: fr.distanceM, completion: 'COMPLETED', difficulty: 'AS_EXPECTED', pain: false, startedAt: `${fr.day}T09:00:00Z` }, at(fr.day, '20:00')); }
      catch (e) { errors.push(`course libre ${fr.day} : ${(e as { code?: string }).code ?? String(e)}`); }
    }
    const arb = (s.planner.weeks[mon] as unknown as { arbitration?: { status?: string; residual?: unknown[] } } | undefined)?.arbitration;
    out.push({
      week: w + 1, monday: mon,
      volume: (ins?.volume?.groups ?? []).map((g) => ({ group: g.group, planned: g.planned, target: g.target, high: g.high, status: g.status })),
      volumeStatus: ins?.volume?.status ?? null,
      recovery: (ins?.recovery ?? []).map((r) => `${r.first.date}↔${r.second.date}:${r.groups.join(',')}`),
      arbitration: `${arb?.status ?? '—'}${arb?.residual?.length ? ` (${String(arb.residual.length)} résiduels)` : ''}`,
    });
  }
  return { spec, sessions, weeks: out, state: s, errors };
}
