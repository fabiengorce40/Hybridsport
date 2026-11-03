/**
 * FAST TRACK V1 — activation contrôlée de `progression-stab-1` sur la BÊTA (décision D2), vérifications 1 à 9 :
 * ruleset versionné et tracé ; activation EN COURS de programme sur un historique antérieur (jamais réécrit, relu) ;
 * format 5 (export / import) ; décisions, exercices principaux et accessoires ; fatigue persistante ; reprise après
 * interruption ; aucune fin de séance bloquée (14 scénarios + profils hybrides). Le point 10 est l'E2E navigateur.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment, CURRENT_SCHEMA_VERSION, decodeState, exportState } from '../../src/index.js';
import type { AppState, ProgrammeEnvironment } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { lot43Specs } from './lot43-bench.js';
import { lot45Scenarios } from './lot45-bench.js';

// technical-constant: TEST_ONLY — durée simulée (semaines) et semaine de l'activation en cours de programme
const W = 12; const SWITCH_WEEK = 5;
const S = (id: string) => lot45Scenarios().find((x) => x.id === id) as ProfileSpec;
type Entry = NonNullable<AppState['programmeState']>['audit'][number];
const progression = (s: AppState): Entry[] => (s.programmeState?.audit ?? []).filter((a) => a.reason.code.startsWith('PROGRESSION.'));
const tracks = (s: AppState) => Object.fromEntries(s.strength.tracks.map((t) => [`${t.exerciseId}/${t.slotId}`, t.nextPrescription?.loadKg ?? null]));
const lift = (s: AppState, ex: string) => s.strength.tracks.filter((t) => t.exerciseId === `ex.${ex}` && t.status !== 'closed').map((t) => t.nextPrescription?.loadKg ?? 0).reduce((a, b) => Math.max(a, b), 0);

/** Environnement qui ACTIVE la politique à partir d'une semaine donnée (bascule réelle en cours de programme). */
function switching(fromMonday: string): { env: ProgrammeEnvironment; onWeek: (s: AppState, monday: string) => void } {
  const active = beta0Environment(); const before = beta0Environment({ progressionPolicy: null });
  let on = false;
  const env = new Proxy(before, { get: (t, k) => (k === 'progressionReading' ? (on ? active.progressionReading : undefined) : Reflect.get(t, k)) });
  return { env, onWeek: (_s, monday) => { on = monday >= fromMonday; } };
}

describe('progression-stab-1 activée (BÊTA)', () => {
  it('activation en cours de programme : historique antérieur INCHANGÉ et relu ; nouvelles décisions tracées ; format 5', () => {
    const spec = S('E-FPERS');
    const ref = simulate(spec, W, beta0Environment({ progressionPolicy: null }));
    const monday = ref.weeks[SWITCH_WEEK]?.monday ?? '';
    expect(monday).not.toBe('');
    const sw = switching(monday);
    const r = simulate(spec, W, sw.env, sw.onWeek);
    expect(r.errors).toEqual([]);
    const old = progression(ref.state).filter((a) => a.at < monday);
    const mine = progression(r.state);
    // Historique antérieur strictement identique (jamais réécrit) et sans identifiant de politique.
    expect(mine.slice(0, old.length)).toEqual(old);
    expect(old.every((a) => !('progressionPolicy' in a.reason.params))).toBe(true);
    const after = mine.filter((a) => a.at >= monday && a.reason.code === 'PROGRESSION.EXPOSURE_CLASSIFIED');
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((a) => a.reason.params.progressionPolicy === 'progression-stab-1')).toBe(true);
    const back = decodeState(exportState(r.state));
    expect(back.ok && back.from).toBe(CURRENT_SCHEMA_VERSION);
    expect(back.ok && back.state).toEqual(r.state);
  }, 600_000);

  it('aucune fin de séance bloquée : 14 scénarios et profils hybrides, 12 semaines, zéro erreur', () => {
    const specs = [...lot45Scenarios(), ...lot43Specs().filter((x) => ['L4-2', 'L41-RUN', 'L42-RUN3', 'L43-HYX3', 'L43-RECOV', 'L41-FORME'].includes(x.id))];
    for (const spec of specs) expect([spec.id, simulate(spec, W, beta0Environment()).errors]).toEqual([spec.id, []]);
  }, 1_800_000);

  it('exercices principaux : égaux à la lecture antérieure en progression, retour, séances manquées ; fatigue persistante toujours détectée', () => {
    for (const id of ['E-PROG', 'E-BACK', 'E-MISS', 'E-RUN']) {
      const a = simulate(S(id), W, beta0Environment({ progressionPolicy: null })).state;
      const b = simulate(S(id), W, beta0Environment()).state;
      for (const ex of ['back_squat', 'romanian_deadlift', 'bench_press']) expect([id, ex, lift(b, ex) >= lift(a, ex)]).toEqual([id, ex, true]);
    }
    const f = simulate(S('E-FPERS'), W, beta0Environment()).state;
    expect(progression(f).some((a) => a.reason.code === 'PROGRESSION.REGRESSED')).toBe(true);
    expect(lift(f, 'back_squat')).toBeLessThan(100);
  }, 1_200_000);

  it('accessoires : aucune charge nulle ou absurde ; écart borné avec la lecture antérieure (compromis connu)', () => {
    const a = tracks(simulate(S('E-PROG'), W, beta0Environment({ progressionPolicy: null })).state);
    const b = tracks(simulate(S('E-PROG'), W, beta0Environment()).state);
    for (const [k, v] of Object.entries(b)) {
      if (v === null) continue;
      expect([k, v > 0]).toEqual([k, true]);
      const ref = a[k];
      // technical-constant: TEST_ONLY — écart relatif maximal admis par track (le banc du lot 4.6 mesure −1,6 % en somme)
      if (typeof ref === 'number' && ref > 0) expect([k, Math.abs(v - ref) / ref <= 0.2]).toEqual([k, true]);
    }
  }, 600_000);
});
