/**
 * Consolidation PR #2 (C4.3) + PR #3 (correctifs Musculation) — simulation 4 semaines par le chemin RÉEL de
 * l'application (Beta 0, `beta0Environment`, règles TEST_ONLY / SIMULATION_ONLY de l'environnement, aucune nouvelle) :
 * prise de masse Musculation 3×/sem., Running 2×/sem., Cross-training 1×/sem. « force + conditionnement » (bloc de force
 * délégué à Strength, C4.3), salle commerciale (matériel réel du préréglage, aucune machine supposée).
 *
 * Chaque séance passe par le contrôle pré-séance (réponses scénarisées : normal, fatigue, mauvaise récupération,
 * douleur genou P2 puis « Passer », résolution, douleur d'épaule récurrente), puis est exécutée (séries saisies) ou non
 * (report, séance manquée). Rapport : __reports__/consolidation-4-semaines.md (séances, durées, décisions, changements,
 * refus, volumes planifiés et exécutés, conflits de récupération).
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import type { SessionDraft } from '@hybridsport/domain';
import {
  beta0Environment, controlCtTimer, regenerateSession, UNKNOWN_CORE_STATE, ensureBeta0Week, finishProgrammeSession, recordProgrammeSet, reportEquipmentUnavailable, selectBeta0Week, selectProgrammeSession, startProgrammeSession, strengthContent, strengthWeekInsights,
} from '../../src/index.js';
import type { AppState, CheckInInput, SessionView } from '../../src/index.js';
import { at, create, massProfile } from '../strength-fixes/sf-fixtures.js';
import { reload } from '../ct/ct-fixtures.js';

const env = beta0Environment();
const MONS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
const content = strengthContent();
const params = readStrengthParams(content.ruleset).values;
const areasOf = (ex: string) => content.catalog.exercise(ex)?.painSensitiveAreas ?? [];
const hard = (s: SessionDraft) => sessionPlannedHardSets(s, params, content.catalog);
const min = (sec: number | null) => (sec === null ? '—' : String(Math.round(sec / 60)));
// technical-constant: TEST_ONLY — charge saisie illustrative (aucune performance réelle)
const KG = 40;
// technical-constant: TEST_ONLY — durée de course saisie (30 min), illustrative
const RUN_S = 1800;

const PROFILE = { ...massProfile({ preset: 'preset.commercial_gym' }), crosstraining: { enabled: true, sessionsPerWeek: 1, intent: 'crosstraining.strength_plus_conditioning', returnState: 'NONE' } } as ReturnType<typeof massProfile>;

type Plan = { readonly ci?: CheckInInput; readonly label: string; readonly skip?: boolean; readonly unavailable?: boolean };
/** Réponses scénarisées : `k` = rang de la séance dans la semaine (ordre des dates). */
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
  for (const b of (selectProgrammeSession(s, id)?.session.blocks ?? []).filter((x) => x.kind !== 'warmup' && x.kind !== 'cooldown')) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:20')), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: KG }); });
  return s;
}

interface Row { week: number; date: string; sport: string; title: string; target: string; est: string; reproducible: string; declared: string; decision: string; changes: string; why: string; execution: string; exercises: string[] }
const short = (c: string) => c.replace(/ex\./g, '');

function simulate() {
  let s = create(PROFILE, T(MONS[0] as string, '07:30'));
  const rows: Row[] = [];
  const weeks: { volume: string[]; executed: Record<string, number>; recovery: string[]; unplaced: string[] }[] = [];
  for (const [w, mon] of MONS.entries()) {
    if (w > 0) s = ensureBeta0Week(s, at(T(mon, '07:30')));
    const view = selectBeta0Week(s, mon)?.sessions ?? [];
    const insights = strengthWeekInsights(s, mon);
    const executed: Record<string, number> = {};
    const unplaced = view.filter((v) => v.placement !== 'planned').map((v) => `${v.sport} (${v.placement})`);
    const placed = view.filter((v) => v.placement === 'planned' && v.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    for (const [k, v] of placed.entries()) {
      const d = v.date ?? mon;
      const p = plan(w, v, k);
      const variant = insights?.sessions.find((x) => x.requestId === v.requestId)?.variant;
      const title = v.sport === 'strength' ? `${v.archetypeId ?? ''}${variant ? ` ${variant}` : ''}` : v.sport === 'crosstraining' ? `${v.ctFormat ?? ''}${selectProgrammeSession(s, v.requestId)?.session.blocks.some((b) => b.kind === 'strength') ? ' + bloc force' : ''}` : (v.archetypeId ?? '');
      // Reproductibilité au démarrage : régénération à état inconnu = séance planifiée (condition d'une adaptation).
      const g = regenerateSession(s, v.requestId, UNKNOWN_CORE_STATE, env);
      const ids = (b: SessionDraft['blocks']) => JSON.stringify(b.map((x) => x.items.map((i) => i.exerciseId)));
      const reproducible = g.status === 'planned' ? (ids(g.record.session.blocks) === ids(selectProgrammeSession(s, v.requestId)?.session.blocks ?? []) ? 'oui' : 'non') : g.status;
      const row: Row = { week: w + 1, date: d, sport: v.sport, title, target: min(v.targetDurationS), est: min(v.estimatedDurationS), reproducible, declared: p.label, decision: '—', changes: '', why: '', execution: '', exercises: [] };
      rows.push(row);
      if (p.skip) { row.execution = 'manquée'; continue; }
      const st = startProgrammeSession(s, at(T(d, v.sport === 'running' ? '07:00' : '18:00')), v.requestId, env, p.ci);
      const c = st.checkIns.at(-1);
      row.decision = c?.decision ?? '—';
      row.changes = (st.programmeLogs[v.requestId]?.adaptation?.changes ?? []).map(short).join(', ');
      const interesting = /NOT_ADAPTABLE|NOT_APPLIED|RECOMPOSED|KNOWN_PAIN|ESCALATED|BLOCKING_NEED|PAUSE/;
      row.why = [...new Set((c?.reasons ?? []).map((r) => r.code).filter((x) => interesting.test(x)).map((x) => x.replace('KAIRO.CHECKIN_', '').replace('SELECT.', '')))].join(', ');
      if (!st.programmeLogs[v.requestId]) { s = st; row.execution = c?.decision === 'paused' ? 'pause douleur' : 'non démarrée (report)'; continue; }
      s = st;
      if (p.unavailable) {
        const item = selectProgrammeSession(s, v.requestId)?.session.blocks.filter((b) => b.kind === 'accessory').flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
        if (item) {
          s = reportEquipmentUnavailable(s, at(T(d, '18:05')), v.requestId, item.id, env);
          const sw = s.programmeLogs[v.requestId]?.swaps?.at(-1);
          row.changes = [row.changes, `matériel indisponible ${short(sw?.fromExerciseId ?? '')} → ${sw?.substituteId ? short(sw.substituteId) : `refus (${String(sw?.reasons[0]?.params.cause ?? '')})`}`].filter(Boolean).join(', ');
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
      row.exercises = (session?.blocks ?? []).filter((b) => b.kind === 'strength' || b.kind === 'accessory').flatMap((b) => b.items.map((i) => i.exerciseId));
      row.execution = 'réalisée';
      if (session && v.sport !== 'running') for (const [g, n] of Object.entries(hard({ ...session, blocks: session.blocks.filter((b) => b.kind !== 'conditioning') }))) executed[g] = (executed[g] ?? 0) + n;
    }
    weeks.push({
      volume: (insights?.volume?.groups ?? []).map((g) => `${g.group} ${String(g.planned)}${g.target === null ? '' : `/${String(g.target)}`} (${g.status})`),
      executed,
      recovery: (insights?.recovery ?? []).map((r) => `${r.first.date} ${r.first.kind === 'strength' ? 'Musculation' : 'bloc force CT'} ↔ ${r.second.date} ${r.second.kind === 'strength' ? 'Musculation' : 'bloc force CT'} : ${r.groups.join(', ')}${r.sameExercises.length > 0 ? ` ; mêmes exercices : ${r.sameExercises.map(short).join(', ')}` : ''}`),
      unplaced,
    });
  }
  return { s, rows, weeks };
}

describe('Consolidation — 4 semaines multisport (masse 3× + Running 2× + Cross-training 1×)', () => {
  const r = simulate();

  it('W-1. chaque séance placée a une issue explicite (réalisée, reportée, manquée) ; aucune exception', () => {
    expect(r.rows.length).toBeGreaterThanOrEqual(20);
    for (const x of r.rows) expect(['réalisée', 'non démarrée (report)', 'manquée', 'pause douleur']).toContain(x.execution);
    expect(r.rows.filter((x) => x.sport === 'strength').length).toBe(12);
  });

  it('W-2. genou P2 (semaine 3) : aucun exercice sollicitant le genou exécuté tant que la douleur est connue (Musculation, bloc de force CT)', () => {
    for (const x of r.rows.filter((y) => y.week === 3 && y.execution === 'réalisée' && y.sport !== 'running')) expect(x.exercises.filter((e) => areasOf(e).includes('knee'))).toEqual([]);
    expect(r.rows.filter((y) => y.week === 3 && y.declared.startsWith('Passer')).every((y) => y.decision === '—' || y.why.includes('KNOWN_PAIN_KEPT'))).toBe(true);
  });

  it('W-3. épaule P1 déclarée deux fois en semaine 4 ⇒ relevée en P2 à la seconde (récurrence G1)', () => {
    const shoulder = r.s.checkIns.filter((c) => c.pains.some((p) => p.area === 'shoulder'));
    expect(shoulder.length).toBeGreaterThanOrEqual(2);
    expect(shoulder.at(-1)?.pains).toContainEqual({ area: 'shoulder', level: 'P2' });
  });

  it('W-4. aucune adaptation n’augmente le volume (séries de travail jamais en hausse)', () => {
    for (const x of r.rows) for (const c of x.changes.split(', ').filter((y) => y.startsWith('sets:'))) {
      const [a, b] = (c.split(':')[2] ?? '').split('>').map(Number);
      expect(b ?? 0).toBeLessThanOrEqual(a ?? 0);
    }
  });

  it('W-5. récupération : signaux NON RÉSOLUS (jamais appliqués) ; état final relu à l’identique', () => {
    expect(r.weeks.some((w) => w.recovery.length > 0)).toBe(true);
    expect(reload(r.s, T('2026-11-01')).checkIns).toEqual(r.s.checkIns);
  });

  it('W-6. rapport', () => {
    const L: string[] = [
      '# Consolidation PR #2 + #3 — 4 semaines multisport (chemin réel de l’application)', '',
      '> Beta 0 (`beta0Environment`) : règles TEST_ONLY / SIMULATION_ONLY existantes, aucune nouvelle. Profil : intermédiaire, prise de masse 3×/sem., Running 2×/sem. (P_R2), Cross-training 1×/sem. « force + conditionnement », disponibilités lun 75 · mar 60 · mer 75 · jeu 60 · ven 75 · sam 90 · dim 0 min, **salle commerciale** (matériel du préréglage). Charges et résultats saisis illustratifs.', '',
      'Contrôle pré-séance scénarisé : S1 normal (+ matériel indisponible sur un accessoire) ; S2 récupération mauvaise / fatigue élevée / « Passer » ; S3 genou P2 déclaré puis « Passer » (douleur connue) ; S4 « Non » (genou résolu), épaule P1 ×2, une course manquée.', '',
      '| sem. | jour | sport | séance | cible / estimée (min) | reproductible | contrôle | décision | changements | raisons clés | exécution |', '|---|---|---|---|---|---|---|---|---|---|---|',
      ...r.rows.map((x) => `| ${String(x.week)} | ${x.date.slice(5)} | ${x.sport} | ${x.title} | ${x.target} / ${x.est} | ${x.reproducible} | ${x.declared} | ${x.decision} | ${x.changes || '—'} | ${x.why || '—'} | ${x.execution} |`), '',
    ];
    for (const [i, w] of r.weeks.entries()) {
      L.push(`## Semaine ${String(i + 1)}`, '', `- Séances non placées : ${w.unplaced.join(', ') || 'aucune'}`,
        `- Volume Musculation PLANIFIÉ (bilan Strength, séries de travail / cible) : ${w.volume.join(' · ') || '—'}`,
        `- Volume de force EXÉCUTÉ (Musculation + blocs de force CT, séances réellement faites, adaptées comprises) : ${Object.entries(w.executed).sort().map(([g, n]) => `${g} ${String(n)}`).join(' · ') || '—'}`,
        `- Conflits de récupération signalés (\`same_discipline_recovery\`, NON RÉSOLU, jamais appliqué) : ${w.recovery.length === 0 ? 'aucun' : ''}`, ...w.recovery.map((x) => `  - ${x}`), '');
    }
    const path = new URL('./__reports__/consolidation-4-semaines.md', import.meta.url).pathname;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, L.join('\n'));
    expect(L.length).toBeGreaterThan(10);
  });
});
