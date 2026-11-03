/**
 * FAST TRACK V1 — politiques de progression versionnées (lot 4.6) : inactives par défaut, identiques aux variantes
 * simulées, relisibles (identifiant dans la trace, conservé par export / import), baisses toujours possibles.
 */
import { describe, expect, it } from 'vitest';
import { BETA0_PROGRESSION_POLICY, beta0Environment, decodeState, exportState, PROGRESSION_POLICIES, withProgressionPolicy } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { variantEnv } from './lot42-bench.js';
import { lot45Scenarios } from './lot45-bench.js';
import { P_VARIANTS } from './lot46-bench.js';

// technical-constant: TEST_ONLY — durée des simulations (semaines)
const W = 12;
const S = (id: string) => lot45Scenarios().find((x) => x.id === id) as ProfileSpec;
const V = (id: string) => P_VARIANTS.find((x) => x.id === id);
const classified = (s: AppState) => (s.programmeState?.audit ?? []).map((a) => a.reason).filter((r) => r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED');
const loads = (s: AppState) => s.strength.tracks.map((t) => [t.trackId, t.nextPrescription?.loadKg ?? null]);

describe('politiques de progression versionnées', () => {
  it('BÊTA (D2) : `progression-stab-1` active par défaut ; référence antérieure : aucune politique, aucun identifiant', () => {
    expect(beta0Environment().progressionReading).toBe(PROGRESSION_POLICIES['progression-stab-1']);
    expect(BETA0_PROGRESSION_POLICY).toBe('progression-stab-1');
    expect(beta0Environment({ progressionPolicy: null }).progressionReading).toBeUndefined();
    const st = simulate(S('E-PROG'), W, beta0Environment({ progressionPolicy: null })).state;
    expect(classified(st).length).toBeGreaterThan(0);
    expect(classified(st).some((r) => 'progressionPolicy' in r.params)).toBe(false);
    const active = simulate(S('E-PROG'), W, beta0Environment()).state;
    expect(classified(active).every((r) => r.params.progressionPolicy === 'progression-stab-1')).toBe(true);
  }, 300_000);
  it('mêmes paramètres que les variantes simulées (B-CLAMP, P-CLSTAB)', () => {
    const strip = (o: object | undefined) => { const { policyId: _p, ...rest } = (o ?? {}) as { policyId?: string }; return rest; };
    expect(strip(PROGRESSION_POLICIES['progression-clamp-1'])).toEqual(strip(V('B-CLAMP')?.progression));
    expect(strip(PROGRESSION_POLICIES['progression-stab-1'])).toEqual(strip(V('P-CLSTAB')?.progression));
  });
  it('activation explicite : décisions identiques à la simulation, identifiant tracé et conservé par export / import ; la fatigue persistante fait toujours baisser', () => {
    const env = withProgressionPolicy(beta0Environment(), 'progression-stab-1');
    const st = simulate(S('E-FPERS'), W, env).state;
    const sim = simulate(S('E-FPERS'), W, variantEnv(V('P-CLSTAB') as never)).state;
    expect(loads(st)).toEqual(loads(sim));
    const cls = classified(st);
    expect(cls.length).toBeGreaterThan(0);
    expect(cls.every((r) => r.params.progressionPolicy === 'progression-stab-1')).toBe(true);
    expect((st.programmeState?.audit ?? []).some((a) => a.reason.code === 'PROGRESSION.REGRESSED')).toBe(true);
    const back = decodeState(exportState(st));
    expect(back.ok && back.state.programmeState?.audit).toEqual(st.programmeState?.audit);
  }, 600_000);
});
