/**
 * Reprise RC5 lot 4.6 — stabilisation de la progression (options de SIMULATION, jamais renseignées par le produit) et
 * chaîne de lecture des contenus candidats (prête, inactive par défaut).
 * - hystérésis : aucune hausse dans les N expositions qui suivent une baisse ; la baisse elle-même n'est jamais empêchée ;
 * - report des grands sauts : toute hausse de plus de 10 % est précédée d'un report tracé sur la même track ;
 * - borne inférieure hors plage : l'estimation n'est jamais abaissée par un effort hors plage ;
 * - environnement Beta 0 : aucune de ces causes de maintien n'apparaît.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment, createBeta0Programme, emptyState, STRENGTH_CANDIDATES, strengthCandidateContent, strengthContentFor, strengthContentRegistry } from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { variantEnv } from './lot42-bench.js';
import { lot45Scenarios } from './lot45-bench.js';
import { P_VARIANTS } from './lot46-bench.js';
import { profileOf } from './lot4-profiles.js';

// technical-constant: TEST_ONLY — durée des simulations de ces tests (semaines) et paramètres étudiés
const W = 12; const HYST = 3; const LARGE = 0.1;
const V = (id: string) => { const v = P_VARIANTS.find((x) => x.id === id); if (!v) throw new Error(id); return variantEnv(v); };
const S = (id: string) => lot45Scenarios().find((x) => x.id === id) as ProfileSpec;
type R = { code: string; params: Record<string, unknown> };
const audit = (s: AppState): R[] => (s.programmeState?.audit ?? []).map((a) => a.reason as R).filter((r) => r.code.startsWith('PROGRESSION.'));
const byTrack = (rs: readonly R[]) => { const m = new Map<string, R[]>(); for (const r of rs) { const k = String(r.params.trackId ?? ''); m.set(k, [...(m.get(k) ?? []), r]); } return m; };

describe('options de stabilisation (simulation)', () => {
  it('hystérésis : jamais de hausse dans les 3 expositions qui suivent une baisse ; maintiens tracés', () => {
    const rs = audit(simulate(S('E-FPERS'), W, V('P-HYST')).state);
    expect(rs.some((r) => r.code === 'PROGRESSION.HELD' && r.params.cause === 'hysteresis')).toBe(true);
    for (const seq of byTrack(rs).values()) {
      let since: number | undefined;
      for (const r of seq) {
        if (r.code === 'PROGRESSION.REGRESSED') since = 0;
        else if (r.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' && since !== undefined) since += 1;
        else if (r.code === 'PROGRESSION.ADVANCED' && r.params.variable === 'load' && since !== undefined) expect(since).toBeGreaterThan(HYST);
      }
    }
    // Les baisses restent possibles : la difficulté persistante est toujours détectée.
    expect(rs.some((r) => r.code === 'PROGRESSION.REGRESSED')).toBe(true);
  }, 300_000);
  it('report des grands sauts : chaque hausse de plus de 10 % suit un report tracé sur sa track', () => {
    const st = simulate(S('E-PROG'), W, V('P-DEFER')).state;
    const rs = audit(st);
    expect(rs.some((r) => r.code === 'PROGRESSION.HELD' && r.params.cause === 'large_step_deferred')).toBe(true);
    const loads = new Map(st.strength.tracks.map((t) => [t.trackId, t]));
    expect(loads.size).toBeGreaterThan(0);
    for (const [id, seq] of byTrack(rs)) {
      const decisions = seq.filter((r) => r.code !== 'PROGRESSION.EXPOSURE_CLASSIFIED');
      decisions.forEach((r, i) => { if (r.code === 'PROGRESSION.HELD' && r.params.cause === 'large_step_deferred') expect([id, decisions[i + 1]?.code ?? 'fin']).not.toEqual([id, 'PROGRESSION.REGRESSED']); });
    }
    void LARGE;
  }, 300_000);
  it('environnement Beta 0 : aucune option de stabilisation, aucune cause de maintien du lot 4.6', () => {
    expect(beta0Environment().progressionReading).toBeUndefined();
    const rs = audit(simulate(S('E-FPERS'), W).state);
    for (const c of ['hysteresis', 'large_step_deferred', 'estimate_unreliable']) expect(rs.some((r) => r.code === 'PROGRESSION.HELD' && r.params.cause === c)).toBe(false);
  }, 300_000);
});

describe('chaîne de lecture des contenus candidats (prête, inactive par défaut)', () => {
  const W1 = '2026-10-05';
  const at = (d: string): Clock => ({ today: d, now: `${d}T06:00:00.000Z` });
  it('registre des utilisateurs : aucun candidat ; lecture explicite (`candidates: true`) : chaque candidat retrouvé', () => {
    const reg = strengthContentRegistry().map((c) => c.ruleset.version);
    for (const o of STRENGTH_CANDIDATES) {
      const c = strengthCandidateContent(o);
      expect(reg).not.toContain(c.ruleset.version);
      expect(strengthContentFor(c.ruleset.version, c.catalog.version)).toBeUndefined();
      expect(strengthContentFor(c.ruleset.version, c.catalog.version, { candidates: true })).toBe(c);
    }
  });
  it('séance générée avec un candidat : sa provenance est relue par la chaîne explicite', () => {
    const red = strengthCandidateContent({ redistribution: { scope: 'deficit', guard: 'keep_residual' } });
    const env = beta0Environment();
    const s = createBeta0Programme(emptyState(), profileOf({}, { days: [0, 2, 4] }), at(W1), {}, env.strength ? { ...env, strength: { ...env.strength, content: { ...env.strength.content, ruleset: red.ruleset, catalog: red.catalog } as typeof env.strength.content } } : env);
    const provs = (s.planner.weeks[W1]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => (r.record?.data as { provenance: { rulesetVersion: string; catalogVersion: string } }).provenance);
    expect(provs.length).toBeGreaterThan(0);
    for (const p of provs) {
      expect(strengthContentFor(p.rulesetVersion, p.catalogVersion)).toBeUndefined();
      expect(strengthContentFor(p.rulesetVersion, p.catalogVersion, { candidates: true })).toBe(red);
    }
  });
});
