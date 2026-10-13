/**
 * Simulation 4 semaines (chemin RÉEL de l'application, Beta 0) — module partagé par les rapports de consolidation et
 * par la comparaison avant / après R1-R2 (exécuté à l'identique sur la version de référence). Aucune règle sportive :
 * il observe ce que produisent les moteurs, le planificateur et le contrôle pré-séance.
 *
 * Profil : intermédiaire, prise de masse 3×/sem., Running 2×/sem., Cross-training 1×/sem. « force + conditionnement »,
 * salle commerciale. Contrôles scénarisés : S1 normal (+ matériel indisponible) ; S2 récupération mauvaise / fatigue
 * élevée / « Passer » ; S3 genou P2 puis « Passer » (douleur connue) ; S4 « Non », épaule P1 ×2, une course manquée.
 */
import { deriveSafetyRestrictions, estimateDuration, readDurationParams } from '@hybridsport/engine';
import type { PainReport, SessionDraft } from '@hybridsport/domain';
import { readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import {
  beta0Environment, controlCtTimer, ensureBeta0Week, finishProgrammeSession, painReportsOf, recordProgrammeSet, regenerateSession, reportEquipmentUnavailable, selectBeta0Week, selectProgrammeSession,
  startProgrammeSession, strengthContent, strengthWeekInsights, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState, CheckIn, CheckInInput, ProfileInput, SessionView } from '../../src/index.js';
import { at, create, massProfile } from '../strength-fixes/sf-fixtures.js';

export const MONS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
// technical-constant: TEST_ONLY — charge saisie illustrative (aucune performance réelle)
const KG = 40;
// technical-constant: TEST_ONLY — durée de course saisie (30 min), illustrative
const RUN_S = 1800;
// technical-constant: secondes par minute
const S_PER_MIN = 60;

export const PROFILE = { ...massProfile({ preset: 'preset.commercial_gym' }), crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.strength_plus_conditioning', returnState: 'NONE' } } as ProfileInput;

interface Plan { readonly ci?: CheckInInput; readonly label: string; readonly skip?: boolean; readonly unavailable?: boolean }
function plan(w: number, v: SessionView, k: number): Plan {
  const no: CheckInInput = { painAnswer: 'no', fatigue: 'low', recovery: 'good' };
  if (w === 0) return { ci: no, label: 'Non · fatigue faible · bonne récup.', unavailable: v.sport === 'strength' && k === 0 };
  if (w === 1) {
    if (v.sport === 'strength' && k === 1) return { ci: { painAnswer: 'no', fatigue: 'moderate', recovery: 'poor' }, label: 'Non · récupération mauvaise' };
    if (v.sport === 'crosstraining') return { ci: { painAnswer: 'no', fatigue: 'high', recovery: 'average' }, label: 'Non · fatigue élevée' };
    return { label: 'Passer (état inconnu)' };
  }
  if (w === 2) {
    if (k === 0) return { ci: { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'low', recovery: 'good' }, label: 'Oui · genou P2' };
    return { label: 'Passer (genou P2 connu)' };
  }
  if (k === 0) return { ci: no, label: 'Non (genou résolu)' };
  if (v.sport === 'strength') return { ci: { painAnswer: 'yes', pains: [{ area: 'shoulder', level: 'P1' }], fatigue: 'low', recovery: 'good' }, label: 'Oui · épaule P1' };
  if (v.sport === 'running' && k === 4) return { label: 'manquée', skip: true };
  return { ci: no, label: 'Non' };
}

const CT_RESULT = (s: AppState, id: string): Record<string, unknown> => {
  const f = selectProgrammeSession(s, id)?.session.blocks.find((x) => x.kind === 'conditioning')?.format;
  if (f === 'amrap') return { kind: 'rounds_reps', rounds: 3, reps: 0 };
  if (f === 'emom') return { kind: 'emom', minutesCompleted: 0 };
  if (f === 'for_time') return { kind: 'capped_rounds', roundsCompleted: 0, partialReps: 0 };
  return { kind: 'total', durationS: 60 };
};
function allSets(s0: AppState, id: string, d: string): AppState {
  let s = s0;
  for (const b of (selectProgrammeSession(s, id)?.session.blocks ?? []).filter((x) => x.kind !== 'warmup' && x.kind !== 'cooldown')) {
    for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:20')), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: KG }); });
  }
  return s;
}

export interface SimExercise { readonly id: string; readonly block: string; readonly areas: readonly string[] }
export interface SimSession {
  readonly week: number; readonly date: string; readonly sport: string; readonly title: string; readonly requestId: string;
  readonly reproducible: string; readonly declared: string; decision: string; adaptation: string; changes: string[]; reasons: string[]; execution: string;
  readonly targetMin: number | null; readonly plannedEstMin: number | null; executedEstMin: number | null;
  exercises: SimExercise[]; excludedAreas: string[]; violations: string[];
  /** Séries de travail par groupe de la séance EXÉCUTÉE (force : Musculation, bloc délégué CT ; hors conditionnement). */
  groups: Record<string, number>;
}
export interface SimWeek {
  readonly planned: Record<string, { planned: number; target: number | null; high: number | null; status: string }>;
  readonly executed: Record<string, number>;
  readonly recovery: readonly string[];
  readonly m3: { readonly status: string; readonly residual: number };
}
export interface SimResult { readonly sessions: SimSession[]; readonly weeks: SimWeek[] }

/** Zones EXCLUES par les règles G1 du CORE pour le contrôle `c` (déclarées + connues reportées). */
function excludedOf(c: CheckIn | undefined): string[] {
  if (!c) return [];
  const ruleset = strengthContent().ruleset;
  const known = ((c as { knownPains?: { area: string; level: PainReport['level']; reportedAt: string }[] }).knownPains ?? []).map((k, i): PainReport => ({ id: `${c.id}.k${String(i)}`, level: k.level, bodyAreas: [k.area], affectedMovements: [], context: 'check_in', reportedAt: k.reportedAt as PainReport['reportedAt'], persisted: true, rulesetRef: ruleset.version }));
  const s = deriveSafetyRestrictions([...painReportsOf(c, ruleset.version), ...known], ruleset);
  return s.areaRestrictions.filter((a) => a.action === 'exclude').map((a) => a.area).sort();
}

export function simulate(): SimResult {
  const env = beta0Environment();
  const content = strengthContent();
  const params = readStrengthParams(content.ruleset).values;
  const contentOf = (sport: string) => (env as unknown as Record<string, { content: { catalog: typeof content.catalog; ruleset: typeof content.ruleset } } | undefined>)[sport]?.content;
  const estMin = (sport: string, sess: SessionDraft | undefined): number | null => {
    const c = contentOf(sport);
    if (!c || !sess) return null;
    const e = estimateDuration(sess, c.catalog, readDurationParams(c.ruleset));
    return e.ok ? Math.round(e.estimate.p50 / S_PER_MIN) : null;
  };
  let s = create(PROFILE, T(MONS[0] as string, '07:30'));
  const sessions: SimSession[] = [];
  const weeks: SimWeek[] = [];
  for (const [w, mon] of MONS.entries()) {
    if (w > 0) s = ensureBeta0Week(s, at(T(mon, '07:30')));
    const view = selectBeta0Week(s, mon)?.sessions ?? [];
    const insights = strengthWeekInsights(s, mon);
    const executed: Record<string, number> = {};
    const placed = view.filter((v) => v.placement === 'planned' && v.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    for (const [k, v] of placed.entries()) {
      const d = v.date ?? mon;
      const p = plan(w, v, k);
      const variant = insights?.sessions.find((x) => x.requestId === v.requestId)?.variant;
      const plannedSession = selectProgrammeSession(s, v.requestId)?.session;
      const title = v.sport === 'strength' ? `${v.archetypeId ?? ''}${variant ? ` ${variant}` : ''}` : v.sport === 'crosstraining' ? `${v.ctFormat ?? ''}${plannedSession?.blocks.some((b) => b.kind === 'strength') ? ' + bloc force' : ''}` : (v.archetypeId ?? '');
      const g = regenerateSession(s, v.requestId, UNKNOWN_CORE_STATE, env);
      const ids = (b: SessionDraft['blocks']) => JSON.stringify(b.map((x) => x.items.map((i) => i.exerciseId)));
      const reproducible = g.status === 'planned' ? (ids(g.record.session.blocks) === ids(plannedSession?.blocks ?? []) ? 'oui' : 'non') : g.status;
      const row: SimSession = {
        week: w + 1, date: d, sport: v.sport, title, requestId: v.requestId, reproducible, declared: p.label, decision: '—', adaptation: '—', changes: [], reasons: [], execution: '',
        targetMin: v.targetDurationS === null ? null : Math.round(v.targetDurationS / S_PER_MIN), plannedEstMin: estMin(v.sport, plannedSession), executedEstMin: null, exercises: [], excludedAreas: [], violations: [], groups: {},
      };
      sessions.push(row);
      if (p.skip) { row.execution = 'manquée'; continue; }
      const st = startProgrammeSession(s, at(T(d, v.sport === 'running' ? '07:00' : '18:00')), v.requestId, env, p.ci);
      const c = st.checkIns.at(-1);
      row.decision = c?.decision ?? '—';
      const codes = (c?.reasons ?? []).map((r) => r.code);
      row.adaptation = codes.includes('KAIRO.CHECKIN_PERSISTED_ADAPTED') ? 'séance persistée (CORE)' : codes.includes('KAIRO.CHECKIN_SESSION_RECOMPOSED') ? 'recomposée (signalée)' : c?.decision === 'adapted' ? 'régénérée (reproductible)' : '—';
      row.changes = [...(st.programmeLogs[v.requestId]?.adaptation?.changes ?? [])].map((x) => x.replace(/ex\./g, ''));
      row.reasons = [...new Set(codes.filter((x) => /NOT_ADAPTABLE|NOT_APPLIED|RECOMPOSED|PERSISTED|KNOWN_PAIN|ESCALATED|BLOCKING_NEED|PAUSE/.test(x)).map((x) => x.replace('KAIRO.CHECKIN_', '').replace('SELECT.', '')))];
      for (const r of c?.reasons ?? []) if (r.code === 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED' && typeof r.params.cause === 'string') row.reasons.push(`cause=${r.params.cause}`);
      row.excludedAreas = excludedOf(c);
      if (!st.programmeLogs[v.requestId]) { s = st; row.execution = c?.decision === 'paused' ? 'pause douleur' : 'non démarrée (report)'; continue; }
      s = st;
      if (p.unavailable) {
        const item = selectProgrammeSession(s, v.requestId)?.session.blocks.filter((b) => b.kind === 'accessory').flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
        if (item) {
          s = reportEquipmentUnavailable(s, at(T(d, '18:05')), v.requestId, item.id, env);
          const sw = s.programmeLogs[v.requestId]?.swaps?.at(-1);
          row.changes.push(`matériel indisponible ${(sw?.fromExerciseId ?? '').replace('ex.', '')} → ${sw?.substituteId ? sw.substituteId.replace('ex.', '') : `refus (${String(sw?.reasons[0]?.params.cause ?? '')})`}`);
        }
      }
      if (v.sport === 'running') {
        s = finishProgrammeSession(s, at(T(d, '07:40')), { requestId: v.requestId, completion: 'modified', pain: false, run: { realizedDurationS: RUN_S } } as never);
      } else {
        if (v.sport === 'crosstraining') { const rt = s.programmeLogs[v.requestId]?.ct; if (rt && rt.runningSince === null) s = controlCtTimer(s, at(T(d, '18:15')), v.requestId, 'resume'); }
        s = allSets(s, v.requestId, d);
        s = finishProgrammeSession(s, at(T(d, '19:15')), { requestId: v.requestId, completion: 'modified', pain: false, ...(v.sport === 'crosstraining' ? { ct: { result: CT_RESULT(s, v.requestId) } } : {}) } as never);
      }
      const session = selectProgrammeSession(s, v.requestId)?.session;
      row.executedEstMin = estMin(v.sport, session);
      const cat = contentOf(v.sport)?.catalog;
      row.exercises = (session?.blocks ?? []).flatMap((b) => b.items.map((i) => ({ id: i.exerciseId.replace('ex.', ''), block: b.kind, areas: [...(cat?.exercise(i.exerciseId)?.painSensitiveAreas ?? [])] })));
      row.violations = row.exercises.filter((e) => e.areas.some((a) => row.excludedAreas.includes(a))).map((e) => `${e.id}@${e.block}`);
      row.execution = 'réalisée';
      if (session && v.sport !== 'running') {
        // Séries de force : blocs `strength` / `accessory` seulement (l'échauffement et le conditionnement CT ne comptent pas).
        row.groups = sessionPlannedHardSets({ ...session, blocks: session.blocks.filter((b) => b.kind === 'strength' || b.kind === 'accessory') }, params, content.catalog);
        for (const [gname, n] of Object.entries(row.groups)) executed[gname] = (executed[gname] ?? 0) + n;
      }
    }
    const arb = (s.planner.weeks[mon] as unknown as { arbitration?: { status?: string; residual?: unknown[] } } | undefined)?.arbitration;
    weeks.push({
      planned: Object.fromEntries((insights?.volume?.groups ?? []).map((x) => [x.group, { planned: x.planned, target: x.target, high: x.high, status: x.status }])),
      executed,
      recovery: (insights?.recovery ?? []).map((r) => `${r.first.date} ${r.first.kind === 'strength' ? 'Musculation' : 'bloc force CT'} ↔ ${r.second.date} ${r.second.kind === 'strength' ? 'Musculation' : 'bloc force CT'} : ${r.groups.join(', ')}${r.sameExercises.length > 0 ? ` ; mêmes exercices : ${r.sameExercises.map((x) => x.replace('ex.', '')).join(', ')}` : ''}`),
      m3: { status: arb?.status ?? '—', residual: arb?.residual?.length ?? 0 },
    });
  }
  return { sessions, weeks };
}
