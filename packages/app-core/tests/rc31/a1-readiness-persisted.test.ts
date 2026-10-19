/**
 * RC3.1 — A1 : fatigue / récupération déclarées sur une séance de Musculation NON reproductible.
 * Avant : « l'effort de cette séance n'est pas ajusté automatiquement » (cause `readiness_requires_reproducible_session`).
 * Après : règle d'état du moteur Strength appliquée à la séance PERSISTÉE, effort visé (RIR) seulement ; exercices,
 * séries, répétitions, charges, repos et exclusions de douleur inchangés ; refus EXPLICITE par exercice sinon.
 * Preuve d'équivalence : sur les séances reproductibles, l'ajustement de la séance persistée redonne EXACTEMENT
 * l'effort que le moteur prescrit en régénérant avec le même état.
 *
 * RC4.5 (F6) : la preuve porte sur le contenu 4F (avant F6), fixé explicitement par le registre versionné : F6 n'ajoute
 * aucune règle d'état du jour, et le contenu F6 ne laisse aucune séance STRICTEMENT reproductible sur ce profil (limite
 * connue : historique propre au planificateur), ce qui priverait la preuve d'équivalence de cas comparables.
 */
import { describe, expect, it } from 'vitest';
import type { SessionDraft } from '@hybridsport/domain';
import {
  applyReadinessToPersisted, beta0Environment, coreStateOf, createBeta0Programme, emptyState, ensureBeta0Week, finishProgrammeSession, recordProgrammeSet, regenerateSession, selectBeta0Week,
  selectProgrammeSession, sessionChanges, startProgrammeSession, strengthEnvironmentFor, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState, CheckInInput, Reason } from '../../src/index.js';
import { MONS, PROFILE } from '../consolidation/sim4.js';
import { at } from '../strength-fixes/sf-fixtures.js';

const lock = strengthEnvironmentFor(beta0Environment(), '0.4.0-strength-science-lock', '0.2.0-strength-test');
if (!lock?.strength) throw new Error('contenu 4F absent du registre versionné');
const env = lock;
const content = lock.strength.content;
const create = (p: typeof PROFILE, now: string): AppState => createBeta0Programme(emptyState(), p, at(now), p.running.enabled ? { lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED' } } : {}, env);
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
const TIRED: CheckInInput = { painAnswer: 'no', fatigue: 'high', recovery: 'average' };
// technical-constant: TEST_ONLY — charge saisie illustrative
const KG = 40;
type Sets = Extract<SessionDraft['blocks'][number]['items'][number]['prescription'], { type: 'sets' }>['sets'];
const intentOf = (s: AppState, id: string) => { const i = Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === id)?.intent; return { archetypeId: i?.archetypeId ?? '', stimulus: i?.stimulus ?? '' }; };
const reasonsOf = (s: AppState, id: string): Reason[] => Object.values(s.planner.weeks).flatMap((w) => w.requests).find((r) => r.requestId === id)?.reasons ?? [];
/** Tout sauf l'effort visé (RIR) : exercices, séries, répétitions, charges, repos, rampes. */
const shapeOf = (x: SessionDraft) => JSON.stringify(x.blocks.map((b) => b.items.map((i) => ({ id: i.exerciseId, p: i.prescription.type === 'sets' ? i.prescription.sets.map((z) => ({ ...z, intensity: z.intensity && 'effort' in z.intensity ? { ...z.intensity, effort: { ...z.intensity.effort, rir: undefined } } : z.intensity })) : i.prescription }))));
const rirOf = (sets: Sets) => sets.map((z) => (z.intensity && 'effort' in z.intensity && z.intensity.effort && 'rir' in z.intensity.effort ? z.intensity.effort.rir : null));

function complete(s0: AppState, id: string, d: string, ci: CheckInInput): AppState {
  let s = startProgrammeSession(s0, at(T(d)), id, env, ci);
  if (!s.programmeLogs[id]) return s;
  for (const b of selectProgrammeSession(s, id)?.session.blocks ?? []) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:20')), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: KG }); });
  return finishProgrammeSession(s, at(T(d, '19:15')), { requestId: id, completion: 'modified', pain: false } as never);
}

/** 4 semaines, profil de consolidation (masse 3×, course, CT), fatigue élevée déclarée à CHAQUE séance de Musculation. */
function fourWeeks() {
  let s = create(PROFILE, T(MONS[0] as string, '07:30'));
  const rows: { week: number; id: string; reproducible: boolean; strict: boolean; planned: SessionDraft; reasons: Reason[]; intent: { archetypeId: string; stimulus: string }; engine: SessionDraft | null; decision: string; codes: string[]; causes: string[]; changes: string[]; after: SessionDraft | undefined }[] = [];
  for (const [w, mon] of MONS.entries()) {
    if (w > 0) s = ensureBeta0Week(s, at(T(mon, '07:30')), env);
    for (const v of (selectBeta0Week(s, mon)?.sessions ?? []).filter((x) => x.placement === 'planned' && x.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1))) {
      const d = v.date as string;
      if (v.sport !== 'strength') continue;
      const planned = selectProgrammeSession(s, v.requestId)?.session as SessionDraft;
      const base = regenerateSession(s, v.requestId, UNKNOWN_CORE_STATE, env);
      // Définition de l'application (start-check) : mêmes exercices, séries et effort ; `strict` : prescription identique.
      const reproducible = base.status === 'planned' && sessionChanges(planned, base.record.session).length === 0;
      const strict = base.status === 'planned' && JSON.stringify(base.record.session.blocks) === JSON.stringify(planned.blocks);
      const tired = regenerateSession(s, v.requestId, coreStateOf('caution', []), env);
      const reasons = reasonsOf(s, v.requestId);
      const st = startProgrammeSession(s, at(T(d)), v.requestId, env, TIRED);
      const c = st.checkIns.at(-1);
      rows.push({
        week: w + 1, id: v.requestId, reproducible, strict, planned, reasons, intent: intentOf(s, v.requestId), engine: tired.status === 'planned' ? tired.record.session : null, decision: c?.decision ?? '-',
        codes: (c?.reasons ?? []).map((r) => r.code), causes: (c?.reasons ?? []).filter((r) => r.code === 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED' || r.code === 'KAIRO.CHECKIN_READINESS_EXERCISE_REFUSED').map((r) => String(r.params.cause)),
        changes: [...(st.programmeLogs[v.requestId]?.adaptation?.changes ?? [])], after: selectProgrammeSession(st, v.requestId)?.session,
      });
      s = complete(s, v.requestId, d, TIRED);
    }
  }
  return rows;
}
const ROWS = fourWeeks();
const COMPARED = { n: 0 };

describe('A1 — état du jour sur la séance persistée', () => {
  it('4 semaines, fatigue élevée à chaque séance : plus aucun « effort non ajusté » silencieux ; non reproductibles traitées par la séance persistée', () => {
    expect(ROWS.length).toBe(12);
    // Avant RC3.1 : cause `readiness_requires_reproducible_session` sur chaque séance non reproductible.
    expect(ROWS.flatMap((r) => r.causes)).not.toContain('readiness_requires_reproducible_session');
    const persisted = ROWS.filter((r) => r.codes.includes('KAIRO.CHECKIN_READINESS_PERSISTED'));
    expect(persisted.length).toBeGreaterThan(0);
    expect(ROWS.filter((r) => !r.reproducible).every((r) => r.codes.includes('KAIRO.CHECKIN_READINESS_PERSISTED') || r.codes.includes('KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED'))).toBe(true);
    // Toute absence d'ajustement est EXPLIQUÉE (refus par exercice ou cause de session), jamais muette.
    for (const r of ROWS.filter((x) => x.decision === 'unchanged')) expect(r.causes.length + (r.codes.includes('KAIRO.CHECKIN_NO_CHANGE') ? 1 : 0)).toBeGreaterThan(0);
  });

  it('séance persistée ajustée : exercices, séries, répétitions, charges, repos INCHANGÉS ; seul le RIR augmente', () => {
    for (const r of ROWS.filter((x) => x.codes.includes('KAIRO.CHECKIN_READINESS_PERSISTED') && x.after)) {
      expect(shapeOf(r.after as SessionDraft)).toBe(shapeOf(r.planned));
      expect(r.changes.every((c) => c.startsWith('rir:'))).toBe(true);
      for (const c of r.changes) { const [a, b] = (c.split(':').at(-1) ?? '').split('>').map(Number); expect((b ?? 0) > (a ?? 0)).toBe(true); }
    }
  });

  it('équivalence avec le moteur : sur les séances STRICTEMENT reproductibles, chaque exercice ajusté = la prescription du moteur régénérée avec le même état (effort ET charge)', () => {
    let compared = 0;
    for (const r of ROWS.filter((x) => x.strict && x.engine)) {
      const out = applyReadinessToPersisted(r.planned, r.reasons, 'caution', content, r.intent);
      if (!out) throw new Error('règle illisible');
      const items = (x: SessionDraft) => x.blocks.flatMap((b) => b.items);
      for (const it of items(out.session)) {
        const eng = items(r.engine as SessionDraft).find((x) => x.id === it.id);
        if (it.prescription.type !== 'sets' || eng?.prescription.type !== 'sets') continue;
        if (out.result.adjusted.includes(it.exerciseId) || out.result.covered.includes(it.exerciseId)) {
          expect(rirOf(it.prescription.sets), `${r.id} ${it.exerciseId}`).toEqual(rirOf(eng.prescription.sets));
          expect(JSON.stringify(it.prescription), `${r.id} ${it.exerciseId}`).toBe(JSON.stringify(eng.prescription));
          compared += 1;
        }
      }
      // Exercices refusés : laissés EXACTEMENT tels que planifiés.
      for (const x of out.result.refused) expect(JSON.stringify(items(out.session).find((i) => i.exerciseId === x.exerciseId))).toBe(JSON.stringify(items(r.planned).find((i) => i.exerciseId === x.exerciseId)));
    }
    COMPARED.n = compared;
    expect(compared).toBeGreaterThan(0);
  });

  it('« réduire » : RIR +1 appliqué, la série en moins de la règle n’est JAMAIS appliquée et elle est tracée', () => {
    const r = ROWS.find((x) => !x.reproducible) ?? ROWS[0];
    if (!r) throw new Error('aucune séance');
    const out = applyReadinessToPersisted(r.planned, r.reasons, 'reduce', content, r.intent);
    expect(out?.result.rule.setsDeltaNotApplied).toBeLessThan(0);
    expect(shapeOf(out?.session as SessionDraft)).toBe(shapeOf(r.planned));
  });

  it('invariants : trace absente ⇒ refus explicite ; calibration incohérente ⇒ refus ; effort déjà plus prudent ⇒ inchangé', () => {
    const r = ROWS[0];
    if (!r) throw new Error('aucune séance');
    const none = applyReadinessToPersisted(r.planned, [], 'caution', content, r.intent);
    expect(none?.result.adjusted).toEqual([]);
    expect(new Set(none?.result.refused.map((x) => x.cause))).toEqual(new Set(['trace_unavailable']));
    expect(none?.session).toEqual(r.planned);
    const edit = (f: (sets: Sets) => Sets): SessionDraft => ({ ...r.planned, blocks: r.planned.blocks.map((b, k) => (k !== r.planned.blocks.findIndex((x) => x.kind === 'strength') ? b : { ...b, items: b.items.map((i, j) => (j !== 0 || i.prescription.type !== 'sets' ? i : { ...i, prescription: { ...i.prescription, sets: f(i.prescription.sets) } })) })) });
    const first = r.planned.blocks.find((b) => b.kind === 'strength')?.items[0]?.exerciseId ?? '';
    const setRir = (sets: Sets, at: (k: number) => boolean, add: number): Sets => sets.map((z, k) => (z.kind === 'rampup' || !at(k) || !z.intensity || !('effort' in z.intensity) || !z.intensity.effort || !('rir' in z.intensity.effort) ? z : { ...z, intensity: { ...z.intensity, effort: { ...z.intensity.effort, rir: (z.intensity.effort.rir ?? 0) + add } } } as Sets[number]));
    // Séries de calibration modifiées hors moteur : la formule ne se retrouve plus ⇒ refus, exercice laissé tel quel.
    const firstWorking = r.planned.blocks.find((b) => b.kind === 'strength')?.items[0]?.prescription;
    const wIdx = firstWorking?.type === 'sets' ? firstWorking.sets.findIndex((z) => z.kind !== 'rampup') : -1;
    const broken = applyReadinessToPersisted(edit((sets) => setRir(sets, (k) => k === wIdx, 2)), r.reasons, 'caution', content, r.intent);
    expect(broken?.result.refused).toContainEqual({ exerciseId: first, cause: 'trace_inconsistent' });
    // Effort déjà relevé de +2 par un modificateur (toutes séries) : « la plus prudente » ⇒ déjà couvert, aucun changement.
    const prudent = applyReadinessToPersisted(edit((sets) => setRir(sets, () => true, 2)), r.reasons, 'caution', content, r.intent);
    if (prudent?.result.rule.policy === 'most_conservative') expect(prudent.result.covered).toContain(first);
  });

  it('douleur + fatigue : exclusions de douleur appliquées d’abord, effort ensuite ; aucune zone exclue sollicitée', () => {
    const r = ROWS.find((x) => !x.reproducible);
    if (!r) throw new Error('aucune séance non reproductible');
    let s = create(PROFILE, T(MONS[0] as string, '07:30'));
    const v = (selectBeta0Week(s, MONS[0] as string)?.sessions ?? []).find((x) => x.sport === 'strength' && x.placement === 'planned');
    if (!v?.date) throw new Error('séance');
    s = startProgrammeSession(s, at(T(v.date)), v.requestId, env, { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }], fatigue: 'high', recovery: 'average' });
    const areas = (e: string) => content.catalog.exercise(e)?.painSensitiveAreas ?? [];
    const after = selectProgrammeSession(s, v.requestId)?.session;
    if (s.checkIns.at(-1)?.decision === 'adapted') expect((after?.blocks ?? []).flatMap((b) => b.items).filter((i) => areas(i.exerciseId).includes('knee'))).toEqual([]);
    else expect(s.checkIns.at(-1)?.decision).toBe('postponed');
  });

  it('séance planifiée de référence : la régénération n’est pas utilisée pour la séance persistée (aucune recomposition attribuée à la fatigue)', () => {
    for (const r of ROWS.filter((x) => !x.reproducible)) expect(r.codes).not.toContain('KAIRO.CHECKIN_SESSION_RECOMPOSED');
    for (const r of ROWS.filter((x) => !x.reproducible && x.after)) expect(sessionChanges(r.planned, r.after as SessionDraft).every((c) => c.startsWith('rir:'))).toBe(true);
  });
});
