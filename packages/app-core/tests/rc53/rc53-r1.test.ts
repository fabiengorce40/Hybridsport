/**
 * RC5.3 lot R1 — progression partagée A/B, chemin réel de l'application :
 * - TA-01 : pec deck (Haut A et Haut B) sur UNE track, avancée deux fois par semaine ; première hausse de charge des
 *   accessoires communs au rythme d'avant RC5.1 (± 1 semaine) ;
 * - TA-02 : haltères seuls, développé épaules principal (Haut B) et accessoire (Haut A) : deux tracks, prescriptions
 *   propres ;
 * - TA-03 : e1RM observé recopié sur une autre track autorégulée du même exercice, sans changer sa prescription ;
 * - TA-04 : état RC5.1 (tracks en double) relu octet pour octet ; à la frontière suivante, une track active par clé (la
 *   plus récemment exposée), l'autre close `merged` avec son historique ; aucune semaine planifiée réécrite.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionRecord } from '@hybridsport/domain';
import { applyStrengthExecutionTraced, ensureBeta0Week, loadState, MemoryStorage, saveState, STORAGE_KEY } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { rc51Profiles } from '../rc51/rc51-bench.js';

const spec = (id: string): ProfileSpec => rc51Profiles().find((p) => p.id === id) as ProfileSpec;
const audit = (s: AppState) => (s.programmeState?.audit ?? []);
const weekOf = (at: string) => Math.floor((Date.parse(at) - Date.parse('2026-10-05T00:00:00Z')) / (7 * 86_400_000)) + 1;
// technical-constant: TEST_ONLY — horizon (semaines) et première hausse de charge des accessoires communs avant RC5.1 (RC5.2 § 3, REF)
const WEEKS = 8;
const REF_FIRST_LOAD_WEEK = 7;

describe('TA-01 — track partagée A/B', () => {
  const s = simulate(spec('S4'), WEEKS).state;
  it('pec deck, leg extension, squat bulgare : une seule track active pour Haut A / Haut B (Bas A / Bas B)', () => {
    for (const ex of ['ex.pec_deck', 'ex.leg_extension', 'ex.bulgarian_split_squat']) {
      const active = s.strength.tracks.filter((t) => t.exerciseId === ex && t.status === 'active' && t.tier === 'tracked');
      expect([ex, active.length]).toEqual([ex, 1]);
    }
  });
  it('deux expositions par semaine ; première hausse de charge au plus tard une semaine après la référence d’avant RC5.1', () => {
    for (const ex of ['ex.pec_deck', 'ex.leg_extension']) {
      const t = s.strength.tracks.find((x) => x.exerciseId === ex && x.status === 'active' && x.tier === 'tracked');
      const classified = audit(s).filter((a) => a.reason.code === 'PROGRESSION.EXPOSURE_CLASSIFIED' && a.reason.params.trackId === t?.trackId);
      const perWeek = new Map<number, number>();
      for (const a of classified) perWeek.set(weekOf(a.at), (perWeek.get(weekOf(a.at)) ?? 0) + 1);
      expect([ex, Math.max(...perWeek.values())]).toEqual([ex, 2]);
      const firstLoad = audit(s).find((a) => a.reason.code === 'PROGRESSION.ADVANCED' && a.reason.params.trackId === t?.trackId && a.reason.params.variable === 'load');
      expect([ex, firstLoad !== undefined && weekOf(firstLoad.at) <= REF_FIRST_LOAD_WEEK + 1]).toEqual([ex, true]);
    }
  });
}, 600_000);

describe('TA-02 — prescriptions spécifiques', () => {
  it('haltères seuls : développé épaules principal (Haut B) et accessoire (Haut A) = deux tracks, répétitions distinctes', () => {
    const s = simulate(spec('S4D'), 4).state;
    const dsp = s.strength.tracks.filter((t) => t.exerciseId === 'ex.db_shoulder_press' && t.status === 'active');
    expect(dsp.length).toBe(2);
    expect(new Set(dsp.map((t) => t.slotId.split('.').slice(1).join('.'))).size).toBe(2);
    expect(new Set(dsp.map((t) => JSON.stringify(t.nextPrescription?.reps))).size).toBe(2);
  }, 600_000);
});

describe('TA-03 — historique partagé (e1RM observé)', () => {
  it('une exposition à effort observé recopie l’e1RM sur l’autre track autorégulée du même exercice, prescription inchangée', () => {
    const s0 = simulate({ ...spec('S4'), rirOffset: 1 }, 2).state;
    const bench = s0.strength.tracks.find((t) => t.exerciseId === 'ex.bench_press' && t.model === 'autoregulated' && t.status === 'active');
    expect(bench).toBeDefined();
    if (!bench) return;
    // Track de volume fictive du même exercice (Haut B), e1RM ancien.
    const twin = { ...bench, trackId: 'track.twin.bench', archetypeId: 'str_upper_b', slotId: 'ub.push_2h', e1rmKg: 50, nextPrescription: { sets: 3, reps: 10, loadKg: 35, rir: 2 } };
    const s1: AppState = { ...s0, strength: { ...s0.strength, tracks: [...s0.strength.tracks, twin] } };
    const req = Object.values(s1.planner.weeks).flatMap((w) => w.requests).find((r) => r.intent?.archetypeId === 'str_upper_a' && r.record);
    const d = req?.record ? migrateToCurrent<SessionRecord>(req.record) : undefined;
    const session = d?.ok ? d.value.session : undefined;
    expect(session).toBeDefined();
    if (!session) return;
    const item = session.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === 'ex.bench_press');
    const sets = item?.prescription.type === 'sets' ? item.prescription.sets.flatMap((p, i) => (p.kind === 'rampup' ? [] : [{ itemId: item.id, setIndex: i, done: true, reps: typeof p.reps === 'number' ? p.reps : p.reps.min, loadKg: p.intensity?.mode === 'load' ? p.intensity.kg : 40, rir: 3 }])) : [];
    const out = applyStrengthExecutionTraced(s1, { archetypeId: 'str_upper_a', session, sets: sets.map((x) => ({ ...x })), painItems: [] }, '2026-10-20T09:30:00Z' as never);
    const after = out.strength.tracks.find((t) => t.trackId === bench.trackId);
    const twinAfter = out.strength.tracks.find((t) => t.trackId === 'track.twin.bench');
    expect(after?.evidence?.e1rmBasis).toBe('observed');
    expect(twinAfter?.e1rmKg).toBe(after?.e1rmKg);
    expect(twinAfter?.nextPrescription).toEqual(twin.nextPrescription);
    expect(out.reasons.some((r) => r.code === 'PROGRESSION.E1RM_SHARED' && r.params.toTrackId === 'track.twin.bench')).toBe(true);
  }, 600_000);
});

describe('TA-04 — fusion des tracks en double d’un état RC5.1', () => {
  const raw = readFileSync(new URL('./fixtures/rc51-s4-w3.json', import.meta.url), 'utf8');
  const st = new MemoryStorage(); st.setItem(STORAGE_KEY, raw);
  const r = loadState(st, '2026-10-26T07:00:00.000Z');
  if (r.status !== 'ok') throw new Error(r.status);
  const s = r.state;
  it('relu octet pour octet, sans migration', () => {
    const out = new MemoryStorage(); saveState(out, s);
    expect(out.getItem(STORAGE_KEY)).toBe(raw);
    expect(r.migratedFrom).toBeUndefined();
  });
  it('frontière suivante : une track active par clé (la plus récemment exposée), l’autre close `merged`, semaines conservées', () => {
    const next = ensureBeta0Week(s, { today: '2026-10-26', now: '2026-10-26T07:00:00.000Z' });
    for (const ex of ['ex.pec_deck', 'ex.leg_extension', 'ex.bulgarian_split_squat']) {
      const before = s.strength.tracks.filter((t) => t.exerciseId === ex && t.tier === 'tracked');
      expect([ex, before.length]).toEqual([ex, 2]);
      const after = next.strength.tracks.filter((t) => t.exerciseId === ex && t.tier === 'tracked');
      expect([ex, after.filter((t) => t.status === 'active').length]).toEqual([ex, 1]);
      const closed = after.filter((t) => t.status === 'closed');
      expect([ex, closed.length]).toEqual([ex, 1]);
      const kept = after.find((t) => t.status === 'active');
      const last = (id: string | undefined) => { const t = before.find((x) => x.trackId === id); return s.strength.exposures.filter((x) => x.exerciseId === ex && x.slotId === t?.slotId).map((x) => x.at).sort().at(-1) ?? ''; };
      expect(last(kept?.trackId) >= last(closed[0]?.trackId)).toBe(true);
      // Historique de la track close lisible : prescription et compteurs inchangés.
      expect({ ...closed[0], status: 'active' }).toEqual(before.find((t) => t.trackId === closed[0]?.trackId));
      expect(audit(next).some((a) => a.reason.code === 'PROGRESSION.TRACK_CLOSED' && a.reason.params.trackId === closed[0]?.trackId && a.reason.params.cause === 'merged')).toBe(true);
    }
    for (const [w, wk] of Object.entries(s.planner.weeks)) expect([w, JSON.stringify(next.planner.weeks[w]?.requests.map((q) => q.record))]).toEqual([w, JSON.stringify(wk.requests.map((q) => q.record))]);
  });
});
