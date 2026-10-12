/**
 * P0 — contrôle pré-séance (app-core, backend réel). Reproduit l'anomalie (état « normal » et aucune douleur transmis
 * sans contrôle) puis vérifie la correction : état inconnu sans réponse, règles G1 du CORE (pause, interruption,
 * récurrence), séance RÉGÉNÉRÉE par Strength avec l'état du jour (épaule, membre inférieur, fatigue), report explicite,
 * reprise sans perte, séance manuelle et non planifiée, persistance et historique.
 */
import { describe, expect, it } from 'vitest';
import { finishProgrammeSession, loadState, MemoryStorage, recordProgrammeSet, regenerateSession, saveState, selectHistory, selectProgrammeSession, startProgrammeSession, strengthContent, UNKNOWN_CORE_STATE, beta0Environment } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { at, code, create, exercisesOf, massProfile, strengthIds, week } from './sf-fixtures.js';

const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
const catalog = strengthContent().catalog;
const areasOf = (ex: string) => catalog.exercise(ex)?.painSensitiveAreas ?? [];
const reload = (s: AppState, now: string): AppState => {
  const st = new MemoryStorage();
  const w = saveState(st, s);
  if (!w.ok) throw new Error(w.error);
  const r = loadState(st, now);
  if (r.status !== 'ok') throw new Error(r.status);
  return r.state;
};
const first = (s: AppState) => strengthIds(s)[0] ?? '';
const dateOf = (s: AppState, id: string) => selectProgrammeSession(s, id)?.date ?? '2026-10-05';

describe('P0 — contrôle pré-séance', () => {
  it('1. fidélité : régénérer la séance planifiée avec un état INCONNU redonne exactement la séance planifiée (aucun changement inventé)', () => {
    const s = create();
    for (const id of strengthIds(s)) {
      const r = regenerateSession(s, id, UNKNOWN_CORE_STATE, beta0Environment());
      expect(r.status).toBe('planned');
      if (r.status === 'planned') expect(JSON.stringify(r.record.session.blocks)).toBe(JSON.stringify(selectProgrammeSession(s, id)?.session.blocks));
    }
  });

  it('2. aucune réponse : contrôle enregistré « non répondu », état INCONNU (jamais normal), séance inchangée et démarrée', () => {
    const s0 = create();
    const id = first(s0);
    const s = startProgrammeSession(s0, at(T(dateOf(s0, id))), id);
    expect(s.checkIns.at(-1)).toMatchObject({ requestId: id, answered: false, readiness: 'unknown', decision: 'unchanged' });
    expect(s.programmeLogs[id]?.adaptation).toBeUndefined();
    expect(exercisesOf(s, id)).toEqual(exercisesOf(s0, id));
  });

  it('3. douleur d’épaule P2 sur un Full Body : Strength ne trouve aucune poussée / aucun tirage compatible ⇒ séance REPORTÉE (raisons), aucune pause', () => {
    const s0 = create();
    const [id, other] = strengthIds(s0);
    expect(exercisesOf(s0, id ?? '').some((e) => areasOf(e).includes('shoulder'))).toBe(true);
    const s = startProgrammeSession(s0, at(T(dateOf(s0, id ?? ''))), id ?? '', beta0Environment(), { pains: [{ area: 'shoulder', level: 'P2' }], fatigue: 'low', recovery: 'good' });
    expect(s.programmeLogs[id ?? '']).toBeUndefined();
    const c = s.checkIns.at(-1);
    expect(c).toMatchObject({ decision: 'postponed', answered: true, pains: [{ area: 'shoulder', level: 'P2' }] });
    expect(c?.reasons.some((r) => r.code === 'KAIRO.CHECKIN_SESSION_NOT_ADAPTABLE')).toBe(true);
    expect(c?.reasons.some((r) => r.code === 'SELECT.BLOCKING_NEED')).toBe(true);
    expect(s.safety.activePain).toBeNull();
    // Report d'UNE séance, pas une pause : une autre séance peut être démarrée (nouveau contrôle).
    expect(code(() => startProgrammeSession(s, at(T(dateOf(s, other ?? ''))), other ?? ''))).toBe('OK');
  });

  it('4. douleur de membre inférieur (genou P2) : plus aucun exercice sollicitant le genou', () => {
    const s0 = create();
    const id = first(s0);
    expect(exercisesOf(s0, id).some((e) => areasOf(e).includes('knee'))).toBe(true);
    const s = startProgrammeSession(s0, at(T(dateOf(s0, id))), id, beta0Environment(), { pains: [{ area: 'knee', level: 'P2' }] });
    const after = exercisesOf(s, id);
    expect(after.filter((e) => areasOf(e).includes('knee'))).toEqual([]);
    expect(after.length).toBeGreaterThan(0);
  });

  it('5. gêne légère P1 : prudence (zone signalée), aucun exercice supprimé ; P1 répétée sur 14 jours ⇒ relevée en P2 (règle G1 de récurrence)', () => {
    const s0 = create();
    const [a, b] = strengthIds(s0);
    const s1 = startProgrammeSession(s0, at(T(dateOf(s0, a ?? ''))), a ?? '', beta0Environment(), { pains: [{ area: 'shoulder', level: 'P1' }] });
    expect(exercisesOf(s1, a ?? '')).toEqual(exercisesOf(s0, a ?? ''));
    expect(s1.checkIns.at(-1)?.reasons.some((r) => r.code === 'SAFETY.PAIN.ZONE_RESTRICTED' || r.code.startsWith('SAFETY.'))).toBe(true);
    const s2 = startProgrammeSession(s1, at(T(dateOf(s1, b ?? ''))), b ?? '', beta0Environment(), { pains: [{ area: 'shoulder', level: 'P1' }] });
    expect(s2.checkIns.at(-1)?.pains).toEqual([{ area: 'shoulder', level: 'P2' }]);
    expect(s2.checkIns.at(-1)?.decision).toBe('postponed');
  });

  it('6. fatigue élevée (règle TEST_ONLY ⇒ prudence) : dose Strength ajustée (effort plus facile), exercices conservés', () => {
    const s0 = create();
    const id = first(s0);
    const s = startProgrammeSession(s0, at(T(dateOf(s0, id))), id, beta0Environment(), { fatigue: 'high', recovery: 'average' });
    expect(s.checkIns.at(-1)).toMatchObject({ readiness: 'caution' });
    const ch = selectProgrammeSession(s, id)?.adaptation?.changes ?? [];
    expect(ch.some((c) => c.startsWith('rir:'))).toBe(true);
    expect(ch.filter((c) => c.startsWith('removed:'))).toEqual([]);
  });

  it('7. signal général (P4) ou P3 sur zone centrale : pause douleur, séance NON démarrée, autres démarrages refusés', () => {
    const s0 = create();
    const [a, b] = strengthIds(s0);
    for (const ci of [{ generalSignal: true }, { pains: [{ area: 'lower_back' as const, level: 'P3' as const }] }]) {
      const s = startProgrammeSession(s0, at(T(dateOf(s0, a ?? ''))), a ?? '', beta0Environment(), ci);
      expect(s.programmeLogs[a ?? '']).toBeUndefined();
      expect(s.safety.activePain).not.toBeNull();
      expect(s.checkIns.at(-1)?.decision).toBe('paused');
      expect(code(() => startProgrammeSession(s, at(T(dateOf(s, b ?? ''))), b ?? ''))).toBe('SAFETY_PAUSE_ACTIVE_PAIN');
    }
  });

  it('8. reprise d’une séance commencée : aucun contrôle, aucune donnée perdue (séries, repos)', () => {
    const s0 = create();
    const id = first(s0);
    const d = dateOf(s0, id);
    let s = startProgrammeSession(s0, at(T(d)), id, beta0Environment(), { pains: [{ area: 'knee', level: 'P2' }] });
    const it0 = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    s = recordProgrammeSet(s, at(T(d, '18:05')), id, { itemId: it0?.id ?? '', setIndex: 0, done: true, reps: 5, loadKg: 40 });
    const n = s.checkIns.length;
    const resumed = startProgrammeSession(reload(s, T(d, '18:10')), at(T(d, '18:10')), id, beta0Environment(), { generalSignal: true });
    expect(resumed.checkIns.length).toBe(n);
    expect(resumed.programmeLogs[id]?.sets).toHaveLength(1);
    expect(resumed.programmeLogs[id]?.adaptation).toBeDefined();
    expect(resumed.safety.activePain).toBeNull();
  });

  it('9. « Faire maintenant » d’une séance planifiée un autre jour : même contrôle, régénération sur son créneau', () => {
    const s0 = create();
    const ids = strengthIds(s0);
    const later = ids[ids.length - 1] ?? '';
    const s = startProgrammeSession(s0, at(T('2026-10-05', '07:45')), later, beta0Environment(), { pains: [{ area: 'knee', level: 'P2' }] });
    expect(s.programmeLogs[later]).toBeDefined();
    expect(exercisesOf(s, later).filter((e) => areasOf(e).includes('knee'))).toEqual([]);
  });

  it('10. fin d’une séance adaptée (genou) : séries validées sur la séance adaptée, exécution enregistrée, historique et rechargement', () => {
    const s0 = create();
    const id = first(s0);
    const d = dateOf(s0, id);
    let s = startProgrammeSession(s0, at(T(d)), id, beta0Environment(), { pains: [{ area: 'knee', level: 'P2' }] });
    for (const b of selectProgrammeSession(s, id)?.session.blocks ?? []) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:20')), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: 30 }); });
    s = finishProgrammeSession(s, at(T(d, '19:00')), { requestId: id, completion: 'completed_as_prescribed', pain: false });
    const r = reload(s, T(d, '19:05'));
    expect(r.programmeState?.results.some((x) => x.requestId === id)).toBe(true);
    const h = selectHistory(r).find((x) => x.requestId === id);
    expect(h?.sets.length).toBeGreaterThan(0);
    expect(r.checkIns.at(-1)?.decision).toBe('adapted');
    expect(exercisesOf(r, id).filter((e) => areasOf(e).includes('knee'))).toEqual([]);
  });

  it('11. multisport : le contrôle s’applique aussi à Course et Cross-training (même point d’entrée)', () => {
    const s0 = create();
    const others = (week(s0)?.sessions ?? []).filter((x) => x.sport !== 'strength' && x.placement === 'planned');
    expect(others.length).toBeGreaterThan(0);
    for (const x of others) {
      const s = startProgrammeSession(s0, at(T(x.date ?? '2026-10-05')), x.requestId, beta0Environment(), { pains: [{ area: 'knee', level: 'P2' }] });
      const c = s.checkIns.at(-1);
      expect(c?.requestId).toBe(x.requestId);
      expect(['adapted', 'unchanged', 'postponed']).toContain(c?.decision);
      if (c?.decision !== 'postponed') expect(exercisesOf(s, x.requestId).filter((e) => (strengthContent().catalog.exercise(e)?.painSensitiveAreas ?? []).includes('knee') && c?.decision === 'unchanged')).toEqual([]);
    }
  });

  it('12. massProfile 4 séances : contrôle sur chaque séance, aucune exception', () => {
    const s0 = create(massProfile({ sessions: 4, multisport: false, preset: 'preset.full_gym' }));
    for (const id of strengthIds(s0)) {
      const s = startProgrammeSession(s0, at(T(dateOf(s0, id))), id, beta0Environment(), { pains: [{ area: 'shoulder', level: 'P2' }] });
      const d = s.checkIns.at(-1)?.decision;
      expect(['adapted', 'postponed', 'unchanged']).toContain(d);
      if (d !== 'postponed') expect(exercisesOf(s, id).filter((e) => areasOf(e).includes('shoulder'))).toEqual([]);
    }
  });
});
