/**
 * Reprise RC5 lot 4.3 — propositions de replanification hybride (Q3 / Q7) et diagnostics (Q2 / Q5), chemin RÉEL :
 * - lecture seule : aucune proposition, aucun diagnostic ne modifie l'état (identité JSON) ;
 * - aucune mutation sans confirmation explicite (`confirmed: false` ⇒ erreur, état intact) ; application revérifiée ;
 * - jamais de proposition « sûre » qui viole la récupération ; aucun jour inventé ; autres sports conservés ;
 * - séance commencée jamais déplacée ni réécrite ; export / import ; déterminisme ;
 * - environnement par défaut : aucune option du lot 4.3 active (planification identique au commit bfedde1).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyHybridProposal, beta0Environment, createBeta0Programme, decodeState, emptyState, ensureBeta0Week, exportState, proposeHybridWeekAlternatives,
  pushPullIndicator, recordProgrammeSet, rollingVolumeDiagnostic, selectProgrammeSession, startProgrammeSession, strategyEnvironment,
} from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';
import { P1, P2, P3, profileOf } from './lot4-profiles.js';
import { lot42Specs, measureLot42, VARIANTS } from './lot42-bench.js';
import type { Lot42Measure } from './lot42-bench.js';

const W1 = '2026-10-05';
const W2 = '2026-10-12';
const at = (d: string, hm = '07:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const env = beta0Environment();
const strength = (s: AppState, w: string) => (s.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength');

describe('propositions hybrides (HYROX + Musculation 4×, 5 jours)', () => {
  const s = createBeta0Programme(emptyState(), P2.profile, at(W1, '06:00'), {});
  const snapshot = JSON.stringify(s);
  const r = proposeHybridWeekAlternatives(s, at(W1, '06:00'), env);

  it('lecture seule ; les cinq stratégies, dans l’ordre demandé, chacune expliquée', () => {
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(r.proposals.map((p) => p.strategy)).toEqual(['other_day', 'permutation', 'alternate_region', 'upper_lower_full', 'full_body']);
    for (const p of r.proposals) if (p.status !== 'valid') expect(p.detail).toBeTruthy();
  });

  it('recommandation : 3 Full Body (Haut / Bas sacrifié sinon), récupération respectée, HYROX conservé, aucun jour inventé', () => {
    expect(r.current.regions).toEqual({ upper: 2, lower: 1, full: 0 });
    expect(r.recommended).toBe('full_body');
    const fb = r.proposals.find((p) => p.strategy === 'full_body');
    expect(fb?.summary?.regions.full).toBe(3);
    expect(fb?.summary?.minRegionGapH).toBeGreaterThanOrEqual(36);
    expect(fb?.summary?.otherPlanned).toBe(r.current.otherPlanned);
    expect(fb?.changes.filter((c) => c.kind === 'unplanned')).toHaveLength(1);
    const avail = P2.profile.availability;
    for (const q of fb?.preview?.after.requests.filter((x) => x.status === 'planned') ?? []) expect(avail[(new Date(`${q.date ?? ''}T00:00:00Z`).getUTCDay() + 6) % 7]).toBeGreaterThan(0);
  });

  it('aucune proposition non sûre recommandée ; déterminisme', () => {
    for (const p of r.proposals) if (p.status === 'unsafe_recovery') expect(r.recommended).not.toBe(p.strategy);
    const again = proposeHybridWeekAlternatives(s, at(W1, '06:00'), env);
    expect(again.proposals.map((p) => [p.strategy, p.status, p.summary, p.changes])).toEqual(r.proposals.map((p) => [p.strategy, p.status, p.summary, p.changes]));
  });

  it('« Conserver mon planning » : sans confirmation, erreur et état intact ; « Appliquer » : semaine remplacée, export / import', () => {
    const fb = r.proposals.find((p) => p.strategy === 'full_body');
    if (!fb) throw new Error('proposition attendue');
    expect(() => applyHybridProposal(s, fb, at(W1, '06:00'), false, env)).toThrow('REPLAN_CONFIRMATION_REQUIRED');
    expect(JSON.stringify(s)).toBe(snapshot);
    const next = applyHybridProposal(s, fb, at(W1, '06:00'), true, env);
    expect(strength(next, W1).filter((x) => x.status === 'planned').map((x) => x.intent?.archetypeId)).toEqual(['str_full_body', 'str_full_body', 'str_full_body']);
    expect((next.planner.weeks[W1]?.requests ?? []).filter((x) => x.sport === 'hyrox' && x.status === 'planned')).toHaveLength(2);
    const d = decodeState(exportState(next));
    expect(d.ok && d.state).toEqual(next);
  });

  it('proposition non valide jamais appliquée, même confirmée', () => {
    const bad = r.proposals.find((p) => p.status !== 'valid');
    if (bad) expect(() => applyHybridProposal(s, bad, at(W1, '06:00'), true, env)).toThrow('REPLAN_NOT_ALLOWED');
  });
});

describe('séance commencée : jamais déplacée ni réécrite par une proposition', () => {
  it('Musculation 4× hypertrophie : séance du lundi commencée, propositions du mardi', () => {
    let s = createBeta0Programme(emptyState(), P1.profile, at(W1, '06:00'), {});
    const id = strength(s, W1).find((x) => x.date === W1)?.requestId ?? '';
    const item = selectProgrammeSession(s, id)?.session.blocks.flatMap((b) => b.items).find((i) => i.prescription.type === 'sets');
    if (!item) throw new Error('séance attendue');
    s = startProgrammeSession(s, at(W1, '08:00'), id, env, { painAnswer: 'no', fatigue: 'low', recovery: 'good' });
    s = recordProgrammeSet(s, at(W1, '08:10'), id, { itemId: item.id, setIndex: 0, done: true, reps: 8, loadKg: 40 });
    const record = JSON.stringify(s.planner.weeks[W1]?.requests.find((x) => x.requestId === id));
    const log = JSON.stringify(s.programmeLogs[id]);
    const r = proposeHybridWeekAlternatives(s, at('2026-10-06', '06:00'), env);
    for (const p of r.proposals) {
      const kept = p.preview?.after.requests.find((x) => x.requestId === id);
      if (p.preview) expect(JSON.stringify(kept)).toBe(record);
    }
    const valid = r.proposals.find((p) => p.status === 'valid');
    if (valid) {
      const next = applyHybridProposal(s, valid, at('2026-10-06', '06:00'), true, env);
      expect(JSON.stringify(next.planner.weeks[W1]?.requests.find((x) => x.requestId === id))).toBe(record);
      expect(JSON.stringify(next.programmeLogs[id])).toBe(log);
    }
  });
});

describe('Q7 : autre jour autorisé après un refus pour récupération (proposition seulement)', () => {
  it('Haut fait la veille, cinq jours choisis : le planning actif refuse sans réessai ; la proposition place les 4 séances sur des jours autorisés, récupération respectée', () => {
    const p = profileOf({}, { days: [0, 1, 2, 3, 4] });
    const s1 = createBeta0Programme(emptyState(), p, at(W1), {});
    const withY: AppState = { ...s1, strength: { ...s1.strength, exposures: [...s1.strength.exposures, { exerciseId: 'ex.bench_press', at: '2026-10-11T18:00:00Z' as never, slotId: 'ua.main_push_h', sets: [{ reps: 8, loadKg: 40 }] as never }] } };
    const s = ensureBeta0Week(withY, at(W2, '06:00'));
    const active = strength(s, W2);
    const r = proposeHybridWeekAlternatives(s, at(W2, '06:00'), env);
    const other = r.proposals.find((x) => x.strategy === 'other_day');
    const traces = other?.preview?.after.requests.flatMap((q) => q.reasons.filter((x) => x.code === 'PLAN.PLANNER.RECOVERY_RETRY')) ?? [];
    // Le planning actif (sans l'option) n'a aucune trace de réessai.
    expect(active.flatMap((q) => q.reasons).some((x) => x.code === 'PLAN.PLANNER.RECOVERY_RETRY')).toBe(false);
    // Planning actif : refus pour récupération, sans aucun réessai.
    expect(active.some((q) => q.status !== 'planned' && q.reasons.some((x) => x.params.cause === 'strength_recovery_window'))).toBe(true);
    // Propositions : la séance refusée retrouve un jour autorisé (lundi laissé au repos) ; 4 séances, Haut / Bas 2 / 2,
    // récupération respectée (48 h au moins), aucun jour hors des jours choisis ; trace des jours examinés si réessai.
    expect(r.recommended).toBe('other_day');
    expect(other?.status).toBe('valid');
    expect(other?.summary?.strengthPlanned).toBe(4);
    expect(other?.summary?.regions).toEqual({ upper: 2, lower: 2, full: 0 });
    expect(other?.summary?.minRegionGapH ?? 0).toBeGreaterThanOrEqual(36);
    for (const q of other?.preview?.after.requests.filter((x) => x.sport === 'strength' && x.status === 'planned') ?? []) expect([0, 1, 2, 3, 4]).toContain((new Date(`${q.date ?? ''}T00:00:00Z`).getUTCDay() + 6) % 7);
    for (const t of traces) expect(t.params.cause).toBe('strength_recovery_window');
    for (const x of r.proposals) if (x.status === 'unsafe_recovery') expect(r.recommended).not.toBe(x.strategy);
  });
});

describe('options inactives par défaut ; planification identique au commit bfedde1', () => {
  it('environnement Beta 0 : pas de réessai, règle de composition sans semaine courte ; les stratégies sont des COPIES', () => {
    expect(env.recoveryRetry).toBeUndefined();
    expect(env.strength?.composition?.rule?.bands.some((b) => b.shortWeek !== undefined)).toBe(false);
    const fb = strategyEnvironment(env, 'full_body');
    expect(fb.strength?.composition?.rule?.bands.every((b) => b.shortWeek === 'full_body')).toBe(true);
    expect(env.strength?.composition?.rule?.bands.some((b) => b.shortWeek !== undefined)).toBe(false);
  });
  it('profils L4-1 et L4-2 : planification identique au rapport du lot 4.2 (bfedde1, variante A) ; charges : seul écart, la référence RIR du lot 4.5', () => {
    const ref = JSON.parse(readFileSync(new URL('./__reports__/lot42-arbitrages.json', import.meta.url), 'utf8')) as Lot42Measure[];
    for (const id of ['L4-1', 'L4-2']) {
      const spec = lot42Specs().find((x) => x.id === id);
      if (!spec) throw new Error(id);
      const now = measureLot42(spec, VARIANTS[0]);
      const old = ref.find((m) => m.variant === 'A' && m.id === id);
      expect({ v: now.volume, p: now.planned, r: now.refused }).toEqual({ v: old?.volume, p: old?.planned, r: old?.refused });
      // Lot 4.5 (chantier A) : les suivis neufs portent le RIR RÉELLEMENT prescrit. Profil multisport (L4-2, HYROX) :
      // référence 4 (prudence multisport) au lieu de 2 ⇒ hausses du haut du corps calculées pour l'effort prescrit
      // (développé 70 → 70 au lieu de 75 ; militaire 45 → 45, sans la baisse d'avant). Profil sans autre sport : identique.
      if (id === 'L4-1') expect(now.loads).toEqual(old?.loads);
      else {
        const changed = Object.keys(now.loads).filter((k) => JSON.stringify(now.loads[k]) !== JSON.stringify(old?.loads[k])).sort();
        expect(changed).toEqual(['barbell_ohp', 'bench_press']);
        expect([now.loads.bench_press?.last, now.loads.barbell_ohp?.last, now.loads.barbell_ohp?.drops]).toEqual(['70', '45', 0]);
      }
    }
  }, 300_000);
});

describe('diagnostics non bloquants (Q2, Q5)', () => {
  it('Q2 : lecture seule ; direct, indirect, total, cible, borne ; dépassement jamais suivi d’effet', () => {
    const s = createBeta0Programme(emptyState(), P1.profile, at(W1), {});
    const snap = JSON.stringify(s);
    const d = rollingVolumeDiagnostic(s, '2026-10-11');
    expect(JSON.stringify(s)).toBe(snap);
    expect(d.windowStart).toBe(W1);
    // Catalogue courant : triceps PRINCIPAUX des développés ⇒ bras en volume direct ; épaules surtout en indirect.
    const sh = d.groups.find((g) => g.group === 'shoulders');
    expect(sh?.indirectRaw).toBeGreaterThan(0);
    expect(sh?.total).toBeCloseTo((sh?.direct ?? 0) + (sh?.indirectRaw ?? 0) * 0.5, 5);
    for (const g of d.groups) {
      if (g.aboveHigh) expect(g.causes.length).toBeGreaterThan(0);
      expect(g.total).toBeGreaterThanOrEqual(g.direct);
    }
    expect(d.note).toMatch(/pas une preuve de surentraînement/);
  });
  it('Q5 : matériel limité ⇒ expliqué par le matériel (aucun tirage vertical possible) ; hypertrophie standard ⇒ équilibré ; lecture seule', () => {
    let lim = createBeta0Programme(emptyState(), P3.profile, at(W1), {});
    lim = ensureBeta0Week(lim, at(W2, '06:00'));
    const snap = JSON.stringify(lim);
    const q = pushPullIndicator(lim, W2);
    expect(JSON.stringify(lim)).toBe(snap);
    expect(q.unavailable).toContain('pull_vertical');
    expect(q.status).toBe('explained_by_equipment');
    let std = createBeta0Programme(emptyState(), P1.profile, at(W1), {});
    std = ensureBeta0Week(std, at(W2, '06:00'));
    const b = pushPullIndicator(std, W2);
    expect(b.unavailable).toEqual([]);
    expect(b.status).toBe('balanced');
    expect(pushPullIndicator(createBeta0Programme(emptyState(), P1.profile, at(W1), {}), W1).status).toBe('insufficient_data');
  });
});

describe('Q3 / Q7 : aucun jour inventé ; Full Body non sûr jamais recommandé (garde absente du moteur pour un Full Body en semaine de 4)', () => {
  it('quatre jours choisis, Haut fait la veille : Full Body le lundi ⇒ `unsafe_recovery` ; recommandation sûre', () => {
    const s1 = createBeta0Programme(emptyState(), P1.profile, at(W1), {});
    const withY: AppState = { ...s1, strength: { ...s1.strength, exposures: [...s1.strength.exposures, { exerciseId: 'ex.bench_press', at: '2026-10-11T18:00:00Z' as never, slotId: 'ua.main_push_h', sets: [{ reps: 8, loadKg: 40 }] as never }] } };
    const s = ensureBeta0Week(withY, at(W2, '06:00'));
    const r = proposeHybridWeekAlternatives(s, at(W2, '06:00'), env);
    const fb = r.proposals.find((x) => x.strategy === 'full_body');
    if (fb?.summary?.regions.full) expect(fb.status).toBe('unsafe_recovery');
    for (const x of r.proposals) if (x.status === 'valid') expect(x.summary?.minRegionGapH ?? 99).toBeGreaterThanOrEqual(36);
    if (r.recommended) expect(r.proposals.find((x) => x.strategy === r.recommended)?.status).toBe('valid');
    // Q7 : les quatre jours choisis sont déjà pris ⇒ réessai tracé depuis le jour refusé, aucun jour inventé, aucune
    // proposition meilleure ⇒ aucune recommandation (le planning actuel est conservé).
    const other = r.proposals.find((x) => x.strategy === 'other_day');
    expect(other?.preview?.after.requests.flatMap((q) => q.reasons.filter((x) => x.code === 'PLAN.PLANNER.RECOVERY_RETRY').map((x) => x.params.fromDate))).toEqual([W2]);
    expect(other?.status).toBe('no_improvement');
    expect(r.recommended).toBeUndefined();
  }, 300_000);
});
