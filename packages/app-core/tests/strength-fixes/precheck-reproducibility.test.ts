/**
 * Consolidation PR #2 + #3 — anomalie bloquante corrigée : une séance planifiée n'est régénérée selon l'état du jour que
 * si elle est REPRODUCTIBLE (régénération à état inconnu = séance planifiée). Sinon (séance réalisée depuis dans la
 * semaine ⇒ historique d'exposition modifié ; semaine composée par une version antérieure du moteur), aucun changement
 * n'est attribué à l'état du jour.
 *
 * États RÉELS de la version déployée (f9f7e2e, `fixtures/deployed-f9f7e2e-*.json`, générés par le code de ce commit) :
 * séance Strength en cours (2 séries, repos), Cross-training C3 en cours (chrono), pause douleur, prise de masse 4/sem.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  beta0Environment, clearPain, ensureBeta0Week, equipmentNeedsConfirmation, finishProgrammeSession, loadState, MemoryStorage, recordProgrammeSet, regenerateSession, selectProgrammeSession, startProgrammeSession, strengthContent, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState, CheckInInput } from '../../src/index.js';
import { at, create, exercisesOf, strengthIds } from './sf-fixtures.js';

const env = beta0Environment();
const T = (d: string, hm = '18:00') => `${d}T${hm}:00.000Z`;
const areasOf = (ex: string) => strengthContent().catalog.exercise(ex)?.painSensitiveAreas ?? [];
const blocksOf = (s: AppState, id: string) => JSON.stringify(selectProgrammeSession(s, id)?.session.blocks.map((b) => b.items.map((i) => i.exerciseId)));
const faithful = (s: AppState, id: string) => {
  const g = regenerateSession(s, id, UNKNOWN_CORE_STATE, env);
  return g.status === 'planned' && JSON.stringify(g.record.session.blocks.map((b) => b.items.map((i) => i.exerciseId))) === blocksOf(s, id);
};
const codes = (s: AppState) => s.checkIns.at(-1)?.reasons.map((r) => r.code) ?? [];
const TIRED: CheckInInput = { painAnswer: 'no', fatigue: 'high', recovery: 'average' };
const KNEE: CheckInInput = { painAnswer: 'yes', pains: [{ area: 'knee', level: 'P2' }] };

/** Réalise une séance Strength (toutes les séries) par le chemin de l'application. */
function doStrength(s0: AppState, id: string, d: string): AppState {
  let s = startProgrammeSession(s0, at(T(d)), id, env, { painAnswer: 'no' });
  for (const b of selectProgrammeSession(s, id)?.session.blocks ?? []) for (const it of b.items) if (it.prescription.type === 'sets') it.prescription.sets.forEach((p, i) => { s = recordProgrammeSet(s, at(T(d, '18:10')), id, { itemId: it.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: 40 }); });
  return finishProgrammeSession(s, at(T(d, '19:00')), { requestId: id, completion: 'completed_as_prescribed', pain: false });
}

function deployed(name: string, now: string): AppState {
  const st = new MemoryStorage();
  const raw = JSON.parse(readFileSync(new URL(`./fixtures/deployed-f9f7e2e-${name}.json`, import.meta.url), 'utf8')) as Record<string, string>;
  for (const [k, v] of Object.entries(raw)) st.setItem(k, v);
  const r = loadState(st, now);
  if (r.status !== 'ok') throw new Error(r.status);
  // Comme l'application au chargement (store) : semaine courante assurée.
  return ensureBeta0Week(r.state, at(now));
}

describe('reproductibilité — semaine en cours (code intégré)', () => {
  const s0 = create();
  const [a = '', b = '', c = ''] = strengthIds(s0);
  const done = doStrength(s0, a, '2026-10-05');

  it('RP-1. reproduction : après la séance A réalisée, B et C ne sont plus reproductibles (historique d’exposition)', () => {
    expect(faithful(s0, b) && faithful(s0, c)).toBe(true);
    expect(faithful(done, b) && faithful(done, c)).toBe(false);
  });

  it('RP-2. fatigue élevée sur une séance non reproductible : séance PLANIFIÉE gardée telle quelle, raison tracée (aucun changement attribué à tort)', () => {
    const s = startProgrammeSession(done, at(T('2026-10-06')), b, env, TIRED);
    expect(s.checkIns.at(-1)).toMatchObject({ decision: 'unchanged', readiness: 'caution' });
    expect(s.checkIns.at(-1)?.reasons).toContainEqual({ code: 'KAIRO.CHECKIN_ADAPTATION_NOT_APPLIED', params: expect.objectContaining({ cause: 'session_not_reproducible' }) });
    expect(s.programmeLogs[b]?.adaptation).toBeUndefined();
    expect(exercisesOf(s, b)).toEqual(exercisesOf(done, b));
  });

  it('RP-3. genou P2 sur une séance non reproductible qui sollicite le genou : sécurité d’abord (aucun exercice genou), recomposition signalée', () => {
    const kneeIn = (id: string) => exercisesOf(done, id).some((e) => areasOf(e).includes('knee'));
    const id = [b, c].find(kneeIn) ?? '';
    expect(id).not.toBe('');
    const s = startProgrammeSession(done, at(T('2026-10-09')), id, env, KNEE);
    const d = s.checkIns.at(-1)?.decision;
    expect(['adapted', 'postponed']).toContain(d);
    if (d === 'adapted') {
      expect(exercisesOf(s, id).filter((e) => areasOf(e).includes('knee'))).toEqual([]);
      expect(codes(s)).toContain('KAIRO.CHECKIN_SESSION_RECOMPOSED');
    }
  });

  it('RP-4. séance reproductible (semaine neuve) : l’adaptation reste précise (effort seulement pour la fatigue)', () => {
    const s = startProgrammeSession(s0, at(T('2026-10-06')), b, env, TIRED);
    expect(s.checkIns.at(-1)?.decision).toBe('adapted');
    const ch = s.programmeLogs[b]?.adaptation?.changes ?? [];
    expect(ch.length).toBeGreaterThan(0);
    expect(ch.every((x) => x.startsWith('rir:'))).toBe(true);
    expect(codes(s)).not.toContain('KAIRO.CHECKIN_SESSION_RECOMPOSED');
  });
});

describe('états réels de la version déployée (f9f7e2e) chargés par le code intégré', () => {
  const NOW = '2026-10-06T18:30:00.000Z';
  const B = '2026-10-05.strength.2';
  const C = '2026-10-05.strength.3';
  const CT = '2026-10-05.crosstraining.1';

  it('DP-1. chargement : séance Strength en cours (2 séries, repos) et Cross-training en cours (chrono) conservés ; matériel à confirmer', () => {
    const s = deployed('L1-inprogress', NOW);
    expect(s.programmeLogs[B]).toMatchObject({ sport: 'strength' });
    expect(s.programmeLogs[B]?.sets).toHaveLength(2);
    expect(s.programmeLogs[B]?.rest).not.toBeNull();
    expect(s.programmeLogs[CT]?.ct?.runningSince).toBe('2026-10-07T17:00:00Z');
    expect(s.checkIns).toEqual([]);
    expect(equipmentNeedsConfirmation(s)).toBe(true);
    expect(s.profile?.equipment.presetId).toBe('preset.full_gym');
  });

  it('DP-2. reprises sans contrôle (Strength et Cross-training C3), fin de séance enregistrée', () => {
    const s = deployed('L1-inprogress', NOW);
    expect(startProgrammeSession(s, at(NOW), B, env, TIRED)).toBe(s);
    expect(startProgrammeSession(s, at(NOW), CT, env, KNEE)).toBe(s);
    const f = finishProgrammeSession(s, at('2026-10-06T19:00:00.000Z'), { requestId: B, completion: 'modified', pain: false });
    expect(f.programmeState?.results.some((r) => r.requestId === B)).toBe(true);
    expect(selectProgrammeSession(f, B)?.session.blocks.map((x) => x.kind)).toEqual(selectProgrammeSession(s, B)?.session.blocks.map((x) => x.kind));
  });

  it('DP-3. semaine composée par la version déployée : jamais de changement de moteur présenté comme une adaptation', () => {
    const s = deployed('L1-inprogress', NOW);
    expect(faithful(s, C)).toBe(false);
    const tired = startProgrammeSession(s, at(T('2026-10-09')), C, env, TIRED);
    expect(tired.checkIns.at(-1)?.decision).toBe('unchanged');
    expect(exercisesOf(tired, C)).toEqual(exercisesOf(s, C));
    const knee = startProgrammeSession(s, at(T('2026-10-09')), C, env, KNEE);
    if (knee.checkIns.at(-1)?.decision === 'adapted') {
      expect(exercisesOf(knee, C).filter((e) => areasOf(e).includes('knee'))).toEqual([]);
      expect(codes(knee)).toContain('KAIRO.CHECKIN_SESSION_RECOMPOSED');
    } else expect(knee.checkIns.at(-1)?.decision).toBe('postponed');
  });

  it('DP-4. pause douleur héritée : démarrage refusé ; levée ⇒ démarrage possible, aucune douleur connue inventée', () => {
    const s = deployed('L2-painpause', NOW);
    expect(s.safety.activePain).not.toBeNull();
    expect(() => startProgrammeSession(s, at(NOW), C, env)).toThrow();
    const x = startProgrammeSession(clearPain(s, at(NOW)), at(T('2026-10-09')), C, env);
    expect(x.checkIns.at(-1)).toMatchObject({ knownPains: [], decision: 'unchanged' });
  });

  it('DP-5. prise de masse 4/sem. héritée : séances reproductibles, semaine suivante composée par le code intégré', () => {
    const s = deployed('L3-mass4-fresh', '2026-10-05T08:00:00.000Z');
    for (const id of ['2026-10-05.strength.1', '2026-10-05.strength.2', '2026-10-05.strength.3', '2026-10-05.strength.4']) expect(faithful(s, id)).toBe(true);
    const w2 = ensureBeta0Week(s, at('2026-10-12T07:30:00.000Z'));
    expect(Object.keys(w2.planner.weeks)).toContain('2026-10-12');
  });
});
