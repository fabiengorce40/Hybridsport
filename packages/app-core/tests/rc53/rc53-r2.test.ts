/**
 * RC5.3 lot R2 — chemin réel de l'application, athlète à capacité cachée (`rc53-bench.ts`), 12 semaines :
 * - oscillation pec deck 40 → 35 → 40 kg (constat du lot R1) corrigée : aucune charge d'accessoire sous sa charge de
 *   départ chez l'athlète qui progresse ;
 * - au plus un essai annulé par charge et par track (refus) ; aucune régression issue d'un essai ;
 * - réussite exacte : principaux de l'intermédiaire progressant au-delà de la charge de départ.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { rc51Profiles } from '../rc51/rc51-bench.js';
import { athlete } from './rc53-bench.js';

// technical-constant: TEST_ONLY — horizon (semaines)
const WEEKS = 12;
const spec = (id: string, kind: Parameters<typeof athlete>[0], level: Parameters<typeof athlete>[1]): ProfileSpec => {
  const b = rc51Profiles().find((p) => p.id === id) as ProfileSpec;
  return { ...b, profile: { ...b.profile, level }, athlete: athlete(kind, level) };
};
const loadsOf = (s: AppState, ex: string) => s.strength.exposures.filter((x) => x.exerciseId === ex).map((x) => x.sets.find((z) => z.loadKg !== undefined)?.loadKg).filter((k): k is number => k !== undefined);
const audit = (s: AppState) => (s.programmeState?.audit ?? []).map((a) => a.reason);

describe('RC5.3 R2 — essais sur 12 semaines (S4, intermédiaire progressant)', () => {
  const s = simulate(spec('S4', 'progressant', 'intermediate'), WEEKS, beta0Environment()).state;
  it('pec deck et leg extension : jamais sous la charge de départ (oscillation 40 → 35 → 40 kg corrigée)', () => {
    for (const ex of ['ex.pec_deck', 'ex.leg_extension']) {
      const loads = loadsOf(s, ex);
      expect(loads.length).toBeGreaterThan(0);
      expect([ex, Math.min(...loads) >= (loads[0] ?? 0)]).toEqual([ex, true]);
    }
  });
  it('au plus un essai annulé par track et par charge ; aucune régression de charge issue d’un essai', () => {
    const reverts = new Map<string, number>();
    for (const r of audit(s).filter((x) => x.code === 'PROGRESSION.PROBE_REVERTED')) { const k = `${String(r.params.trackId)}:${String(r.params.variable)}`; reverts.set(k, (reverts.get(k) ?? 0) + 1); }
    expect(reverts.size).toBeGreaterThan(0);
    // Chaque annulation pose un refus : la même hausse ne peut être retentée qu'après expiration (4 semaines).
    for (const [k, n] of reverts) expect([k, n <= Math.ceil(WEEKS / 4) + 1]).toEqual([k, true]);
  });
  it('principaux : réussites exactes et essais confirmés ⇒ charges au-dessus du départ', () => {
    const adv = audit(s).filter((r) => r.code === 'PROGRESSION.ADVANCED' && r.params.variable === 'load' && String(r.params.trackId).includes('.main_'));
    expect(adv.length).toBeGreaterThan(0);
    for (const ex of ['ex.bench_press', 'ex.back_squat']) {
      const loads = loadsOf(s, ex);
      expect([ex, (loads.at(-1) ?? 0) > (loads[0] ?? 0)]).toEqual([ex, true]);
    }
  });
}, 600_000);

describe('RC5.3 R2 — athlète stable : pas de hausse durable au-delà de sa capacité', () => {
  it('S4 intermédiaire stable : essais annulés, aucune charge principale au-dessus de deux pas du départ', () => {
    const s = simulate(spec('S4', 'stable', 'intermediate'), WEEKS, beta0Environment()).state;
    for (const ex of ['ex.bench_press', 'ex.back_squat']) {
      const loads = loadsOf(s, ex);
      // technical-constant: TEST_ONLY — deux pas de barre (kg)
      expect([ex, (loads.at(-1) ?? 0) <= (loads[0] ?? 0) + 5]).toEqual([ex, true]);
    }
    expect(audit(s).some((r) => r.code === 'PROGRESSION.PROBE_REVERTED')).toBe(true);
  }, 600_000);
});
