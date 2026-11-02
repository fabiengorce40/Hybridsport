/**
 * Reprise RC5 lot 4.4 (chantiers C, D, E) — options candidates INACTIVES et classement des propositions :
 * - redistribution du volume d'une séance non placée (`redistributeUnplaced`) : jamais au-delà de la borne haute ni de la
 *   durée maximale, aucune séance ajoutée, mêmes jours, récupération respectée, charges inchangées ;
 * - réévaluation contrôlée des isolations (`isolationReview`) : principaux inchangés ;
 * - environnement Beta 0 : aucune de ces options (ni `progressionReading`) ; propositions sans mutation avant confirmation.
 * Le banc 12 semaines (`rc5-lot44-bench.test.ts`, sur demande) mesure l'effet sur 20 profils.
 */
import { describe, expect, it } from 'vitest';
import { applyHybridProposal, beta0Environment, createBeta0Programme, emptyState, proposeHybridWeekAlternatives, strengthWeekVolume } from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';
import { variantEnv } from './lot42-bench.js';
import { lot43Specs } from './lot43-bench.js';
import { LOT44_VARIANTS } from './lot44-bench.js';
import { P2 } from './lot4-profiles.js';

const W1 = '2026-10-05';
const at = (d: string, hm = '06:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const V = (id: string) => { const v = LOT44_VARIANTS.find((x) => x.id === id); if (!v) throw new Error(id); return variantEnv(v); };
const spec = (id: string) => { const s = lot43Specs().find((x) => x.id === id); if (!s) throw new Error(id); return s; };
const strength = (s: AppState) => (s.planner.weeks[W1]?.requests ?? []).filter((r) => r.sport === 'strength');
const work = (s: AppState, date: string) => {
  const r = strength(s).find((x) => x.date === date && x.status === 'planned');
  const session = (r?.record?.data as { session?: { blocks: { items: { exerciseId: string; prescription: { type: string; sets?: { kind?: string; optional?: boolean }[] } }[] }[] } } | undefined)?.session;
  return (session?.blocks ?? []).flatMap((b) => b.items).flatMap((it) => (it.prescription.type === 'sets' ? [{ id: it.exerciseId, n: (it.prescription.sets ?? []).filter((x) => x.kind !== 'rampup' && x.optional !== true).length }] : []));
};
const p50 = (s: AppState, date: string) => (strength(s).find((x) => x.date === date && x.status === 'planned')?.record?.data as { durationEstimate?: { p50?: number } } | undefined)?.durationEstimate?.p50 ?? 0;

describe('options inactives par défaut', () => {
  it('environnement Beta 0 : aucune lecture R4 ; politique publiée sans redistribution ni réévaluation d’isolation', () => {
    const env = beta0Environment();
    expect(env.progressionReading).toBeUndefined();
    const policy = JSON.stringify(env.strength?.content.ruleset.document.parameters.find((x) => x.id === 'strength.personalization')?.value ?? {});
    expect(policy).not.toContain('redistributeUnplaced');
    expect(policy).not.toContain('isolationReview');
  });
});

describe('C — redistribution plafonnée (HYROX intensif : une séance Bas non placée chaque semaine)', () => {
  const sp = spec('L43-HYX3');
  const a = createBeta0Programme(emptyState(), sp.profile, at(W1), {}, V('A'));
  const red = createBeta0Programme(emptyState(), sp.profile, at(W1), {}, V('RED'));
  it('mêmes séances, mêmes jours, mêmes statuts ; aucune séance ajoutée', () => {
    expect(strength(red).map((r) => [r.date, r.status, r.intent?.archetypeId])).toEqual(strength(a).map((r) => [r.date, r.status, r.intent?.archetypeId]));
  });
  it('séance Bas placée : volume redistribué (plus de séries), mêmes exercices principaux ; durée sous la limite', () => {
    const lower = strength(a).find((r) => r.status === 'planned' && /^str_lower/.test(r.intent?.archetypeId ?? ''));
    const d = lower?.date ?? '';
    const before = work(a, d); const after = work(red, d);
    expect(after.reduce((n, x) => n + x.n, 0)).toBeGreaterThan(before.reduce((n, x) => n + x.n, 0));
    expect(after.slice(0, 2).map((x) => x.id)).toEqual(before.slice(0, 2).map((x) => x.id));
    expect(p50(red, d)).toBeLessThanOrEqual((sp.profile.strength.personalization?.sessionMinutes ?? 60) * 60);
  });
  it('jamais au-delà de la borne haute hebdomadaire là où le planning actuel ne la dépasse pas', () => {
    const va = strengthWeekVolume(a, W1); const vr = strengthWeekVolume(red, W1);
    for (const g of vr?.groups ?? []) {
      const ga = va?.groups.find((x) => x.group === g.group);
      if (g.high !== null && ga && !ga.aboveHigh) expect([g.group, g.planned <= g.high]).toEqual([g.group, true]);
    }
  });
  it('séances Haut (toutes placées) : prescription identique', () => {
    for (const r of strength(a).filter((x) => x.status === 'planned' && /^str_upper/.test(x.intent?.archetypeId ?? ''))) expect(work(red, r.date ?? '')).toEqual(work(a, r.date ?? ''));
  });
  it('profil sans séance non placée : prescription strictement identique (option sans effet)', () => {
    const s5 = spec('L4-5');
    const x = createBeta0Programme(emptyState(), s5.profile, at(W1), {}, V('A'));
    const y = createBeta0Programme(emptyState(), s5.profile, at(W1), {}, V('RED'));
    for (const r of strength(x).filter((q) => q.status === 'planned')) expect(work(y, r.date ?? '')).toEqual(work(x, r.date ?? ''));
  });
});

describe('D — réévaluation contrôlée des isolations (B1)', () => {
  it('première semaine (aucune isolation en place) : identique à B1 ; principaux toujours identiques', () => {
    const sp = spec('L41-FORME');
    const b1 = createBeta0Programme(emptyState(), sp.profile, at(W1), {}, V('B1'));
    const iso = createBeta0Programme(emptyState(), sp.profile, at(W1), {}, V('B1ISO'));
    for (const r of strength(b1).filter((q) => q.status === 'planned')) expect(work(iso, r.date ?? '')).toEqual(work(b1, r.date ?? ''));
  });
});

describe('C — propositions : hiérarchie explicite, aucune mutation avant confirmation', () => {
  const s = createBeta0Programme(emptyState(), P2.profile, at(W1), {});
  const env = beta0Environment();
  const r = proposeHybridWeekAlternatives(s, at(W1), env);
  it('la recommandation est SÛRE et a la meilleure couverture des cibles parmi les propositions valides', () => {
    const valid = r.proposals.filter((p) => p.status === 'valid');
    const rec = valid.find((p) => p.strategy === r.recommended);
    expect(rec).toBeDefined();
    for (const p of valid) expect((rec?.summary?.belowTarget ?? 0) <= (p.summary?.belowTarget ?? 0)).toBe(true);
    for (const p of r.proposals.filter((x) => x.status === 'unsafe_recovery')) expect(r.recommended).not.toBe(p.strategy);
  });
  it('« Conserver mon planning » : état intact ; « Appliquer » seulement confirmé', () => {
    const snap = JSON.stringify(s);
    const rec = r.proposals.find((p) => p.strategy === r.recommended);
    if (!rec) throw new Error('recommandation attendue');
    expect(() => applyHybridProposal(s, rec, at(W1), false, env)).toThrow('REPLAN_CONFIRMATION_REQUIRED');
    expect(JSON.stringify(s)).toBe(snap);
    const next = applyHybridProposal(s, rec, at(W1), true, env);
    expect(JSON.stringify(next.planner.weeks[W1])).not.toBe(JSON.stringify(s.planner.weeks[W1]));
  });
});
