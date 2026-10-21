/**
 * RC4.6 (lot 1, B4 réduit) — entrées CROISÉES réellement lues par la génération Strength (blocs de force Cross-training),
 * persistées en forme compacte versionnée (`crossInputs`) et relues par la régénération ; repli explicite (reconstruction
 * depuis la semaine persistée) quand le champ est absent.
 *
 * Références de compatibilité : états écrits par le code d'AVANT B4 (`bfa6f80`) et résultats de démarrage de ce même code
 * (`fixtures/pre-b4-*.json`, sonde `rc45/probe-starts.ts`).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, compactHistory, createBeta0Programme, emptyState, ensureBeta0Week, finishProgrammeSession, HISTORY_COMPACTED, MemoryStorage, previewBeta0Recreation,
  recordProgrammeSet, recreateBeta0Programme, regenerateSession, saveState, selectProgrammeSession, sessionChanges, startProgrammeSession, STORAGE_KEY, UNKNOWN_CORE_STATE, weekReproducibility,
} from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { loadText, probe } from '../rc45/probe-starts.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { PROFILE } from '../consolidation/sim4.js';
import { qualityProfiles } from './quality-bench.js';
import { at, reload } from '../hr/hr-fixtures.js';
import { clock } from '../fixtures.js';

const env = beta0Environment();
const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8');
const REFS = JSON.parse(fx('pre-b4-starts')) as Record<string, ReturnType<typeof probe>>;
const OLD = { 'pre-b4-cons-w2': '2026-10-12', 'pre-b4-p2f-w1': '2026-10-05' } as const;
const p2 = qualityProfiles().find((p) => p.id === 'P2') as ProfileSpec;
const CONS: ProfileSpec = { id: 'CONS', label: 'Consolidation', profile: PROFILE };
const P2F: ProfileSpec = { id: 'P2F', label: 'P2 + CT force', profile: { ...p2.profile, crosstraining: { ...p2.profile.crosstraining, intent: 'crosstraining.strength_plus_conditioning' } } as ProfileSpec['profile'] };
// technical-constant: TEST_ONLY — taille maximale admise des entrées croisées compactes d'une séance (octets JSON)
const MAX_BYTES = 600;

type Req = AppState['planner']['weeks'][string]['requests'][number];
const reqs = (s: AppState, week?: string): Req[] => (week ? s.planner.weeks[week]?.requests ?? [] : Object.values(s.planner.weeks).flatMap((w) => w.requests));
const strip = (s: AppState): AppState => ({ ...s, planner: { ...s.planner, weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map(({ crossInputs: _x, ...r }) => r) }])) } });
const divergences = (s: AppState, week: string) => weekReproducibility(s, week, env, 'strength').plannerDivergences;
/** États à la planification de chaque semaine (aucune séance de la semaine réalisée). */
function atPlanning(spec: ProfileSpec, weeks: number): { monday: string; state: AppState }[] {
  const out: { monday: string; state: AppState }[] = [];
  simulate(spec, weeks, env, (state, monday) => out.push({ monday, state }));
  return out;
}
const cons = atPlanning(CONS, 6);
const p2f = atPlanning(P2F, 6);

describe('RC4.6 B4 — entrées croisées compactes de la Musculation', () => {
  it('format : champ facultatif versionné, Musculation seule, blocs de force lus réduits à (exercice, séries de travail)', () => {
    const all = cons.flatMap((x) => reqs(x.state, x.monday));
    const withField = all.filter((r) => r.crossInputs);
    expect(withField.length).toBeGreaterThan(0);
    for (const r of all) if (r.crossInputs) expect(r.sport).toBe('strength');
    for (const r of withField) {
      const x = r.crossInputs!;
      expect(x.v).toBe(1);
      expect(JSON.stringify(x).length).toBeLessThanOrEqual(MAX_BYTES);
      expect(JSON.stringify(x)).not.toMatch(/prescription|blocks|warmup|restAfterS/);
      for (const w of x.crosstraining) for (const [e, n] of w.items) { expect(e).toMatch(/^ex\./); expect(Number.isInteger(n)).toBe(true); }
    }
    // Profil sans Cross-training : aucun champ (rien à reproduire).
    for (const r of reqs(atPlanning(qualityProfiles().find((p) => p.id === 'S3') as ProfileSpec, 1)[0]?.state as AppState)) expect(r.crossInputs).toBeUndefined();
  });

  it('divergences R-A Musculation à la planification : 0 sur 6 semaines (consolidation, P2F) ; repli (champ retiré) ⇒ divergences d’avant B4', () => {
    for (const x of [...cons, ...p2f]) expect(divergences(x.state, x.monday), x.monday).toBe(0);
    const before = [...cons, ...p2f].reduce((a, x) => a + divergences(strip(x.state), x.monday), 0);
    expect(before).toBe(7); // 6 (consolidation) + 1 (P2F) : valeurs mesurées avant B4 (rapport comparatif RC4.6)
  });

  it('régénération : source des entrées croisées explicite (persistées / reconstruites en repli)', () => {
    const x = cons[1] as { monday: string; state: AppState };
    for (const r of reqs(x.state, x.monday).filter((q) => q.sport === 'strength' && q.status === 'planned')) {
      const a = regenerateSession(x.state, r.requestId, UNKNOWN_CORE_STATE, env);
      const b = regenerateSession(strip(x.state), r.requestId, UNKNOWN_CORE_STATE, env);
      expect(a.status === 'planned' && a.crossSource).toBe('persisted');
      expect(b.status === 'planned' && b.crossSource).toBe('rebuilt_from_week');
      const planned = selectProgrammeSession(x.state, r.requestId)?.session;
      if (a.status === 'planned' && planned) expect(sessionChanges(planned, a.record.session)).toEqual([]);
    }
  });

  for (const [n, d] of Object.entries(OLD) as [keyof typeof OLD, string][]) {
    it(`${n} : état d'avant B4 relu, aucun champ, repli explicite, 4 chemins de démarrage = code d'avant B4`, () => {
      const s = loadText(fx(n), `${d}T06:30:00.000Z`);
      expect(reqs(s).some((r) => r.crossInputs)).toBe(false);
      const ids = reqs(s).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => r.requestId);
      expect(ids.some((id) => { const g = regenerateSession(s, id, UNKNOWN_CORE_STATE, env); return g.status === 'planned' && g.crossSource === 'rebuilt_from_week'; })).toBe(true);
      const got = probe(s);
      expect(Object.keys(got).length).toBeGreaterThan(0);
      expect(got).toEqual(REFS[n]);
    });
  }

  it('semaine suivante d’un état d’avant B4 : nouvelles séances avec le champ, semaines antérieures intactes octet pour octet', () => {
    const s = loadText(fx('pre-b4-cons-w2'), '2026-10-12T06:30:00.000Z');
    const next = ensureBeta0Week(s, at('2026-10-19T06:00:00.000Z'));
    // Enregistrements des séances antérieures inchangés (la compaction de l'historique, existante, peut retirer audit et contexte).
    const records = (x: AppState, w: string) => JSON.stringify(reqs(x, w).map((r) => r.record ?? null));
    for (const w of Object.keys(s.planner.weeks)) expect(records(next, w)).toBe(records(s, w));
    expect(reqs(next, '2026-10-19').filter((r) => r.sport === 'strength' && r.status === 'planned').every((r) => r.crossInputs?.v === 1)).toBe(true);
    expect(divergences(next, '2026-10-19')).toBe(0);
  });

  it('« Modifier » une semaine non commencée : replanifiée avec le champ, 0 divergence', () => {
    const s = loadText(fx('pre-b4-p2f-w1'), '2026-10-05T06:30:00.000Z');
    const c = { today: '2026-10-05', now: '2026-10-05T08:00:00.000Z' };
    expect(previewBeta0Recreation(s, c.today).currentWeek).toBe('replanned');
    const r = recreateBeta0Programme(s, P2F.profile, c, {});
    expect(reqs(r, '2026-10-05').filter((q) => q.sport === 'strength' && q.status === 'planned').every((q) => q.crossInputs?.v === 1)).toBe(true);
    expect(divergences(r, '2026-10-05')).toBe(0);
  });

  it('démarrage : une séance auparavant NON reproductible (bloc CT relu dans sa version finale) passe par la régénération', () => {
    let seen = 0;
    for (const x of cons) {
      for (const q of reqs(x.state, x.monday).filter((r) => r.sport === 'strength' && r.status === 'planned')) {
        const planned = selectProgrammeSession(x.state, q.requestId)?.session;
        const old = regenerateSession(strip(x.state), q.requestId, UNKNOWN_CORE_STATE, env);
        if (!planned || old.status !== 'planned' || sessionChanges(planned, old.record.session).length === 0) continue;
        seen += 1;
        const ci = { painAnswer: 'no', fatigue: 'high', recovery: 'poor' } as const;
        const c = (st: AppState) => JSON.stringify(startProgrammeSession(st, at(`${q.date ?? ''}T17:00:00.000Z`), q.requestId, env, ci).checkIns.at(-1)?.reasons ?? []);
        // Avec le champ : régénération du moteur (dose de l'état du jour par Strength) ; sans (avant B4) : repli sur la
        // séance persistée (règle RC3.1 A1, `READINESS_PERSISTED`), la séance n'étant pas reproductible.
        expect(c(x.state)).not.toContain('KAIRO.CHECKIN_READINESS_PERSISTED');
        expect(c(x.state)).toContain('KAIRO.CHECKIN_SESSION_ADAPTED');
        expect(c(strip(x.state))).toContain('KAIRO.CHECKIN_READINESS_PERSISTED');
      }
    }
    expect(seen).toBe(6);
  });

  it('abandon d’une séance : champ des autres séances intact, reproductibilité conservée', () => {
    const x = cons[1] as { monday: string; state: AppState };
    const ids = reqs(x.state, x.monday).filter((q) => q.sport === 'strength' && q.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    const first = ids[0] as Req;
    const started = startProgrammeSession(x.state, at(`${first.date ?? ''}T17:00:00.000Z`), first.requestId, env);
    const abandoned = finishProgrammeSession(started, at(`${first.date ?? ''}T17:20:00.000Z`), { requestId: first.requestId, completion: 'abandoned', pain: false } as never);
    for (const q of ids.slice(1)) {
      expect(reqs(abandoned, x.monday).find((y) => y.requestId === q.requestId)?.crossInputs).toEqual(q.crossInputs);
      const g = regenerateSession(abandoned, q.requestId, UNKNOWN_CORE_STATE, env);
      expect(g.status === 'planned' && g.crossSource).toBe('persisted');
    }
  });

  it('reprise : séance commencée, état enregistré puis relu, poursuite identique ; champ conservé au rechargement', () => {
    const x = cons[1] as { monday: string; state: AppState };
    const q = reqs(x.state, x.monday).filter((r) => r.sport === 'strength' && r.status === 'planned').sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1))[0] as Req;
    const d = q.date ?? '';
    let s = startProgrammeSession(x.state, at(`${d}T17:00:00.000Z`), q.requestId, env, { painAnswer: 'no', fatigue: 'high', recovery: 'poor' });
    const r1 = reload(s, `${d}T17:05:00.000Z`);
    const rq = (x: AppState) => { const y = reqs(x).find((z) => z.requestId === q.requestId); return JSON.stringify([y?.record ?? null, y?.crossInputs ?? null, x.programmeLogs[q.requestId] ?? null]); };
    expect(rq(r1)).toBe(rq(s));
    const items = (selectProgrammeSession(r1, q.requestId)?.session.blocks ?? []).flatMap((b) => b.items).filter((i) => i.prescription.type === 'sets');
    const it0 = items[0];
    expect(it0).toBeDefined();
    const set = { itemId: it0?.id ?? '', setIndex: 0, done: true, reps: 8, loadKg: 40 };
    s = recordProgrammeSet(s, at(`${d}T17:10:00.000Z`), q.requestId, set);
    const s2 = recordProgrammeSet(r1, at(`${d}T17:10:00.000Z`), q.requestId, set);
    expect(JSON.stringify(s2.programmeLogs[q.requestId])).toBe(JSON.stringify(s.programmeLogs[q.requestId]));
    expect(reqs(r1, x.monday).find((y) => y.requestId === q.requestId)?.crossInputs).toEqual(q.crossInputs);
  });

  it('compaction de l’historique : champ retiré des semaines compactées et tracé dans le marqueur', () => {
    const s = cons[5]?.state as AppState;
    const c = compactHistory(s);
    const compacted = reqs(c).filter((r) => r.reasons.some((y) => y.code === HISTORY_COMPACTED));
    expect(compacted.length).toBeGreaterThan(0);
    for (const r of compacted) expect(r.crossInputs).toBeUndefined();
    expect(compacted.some((r) => ((r.reasons.find((y) => y.code === HISTORY_COMPACTED)?.params.fields as string[] | undefined) ?? []).includes('crossInputs'))).toBe(true);
  });

  it('coût de stockage : 6 semaines (simulation) et 26 / 52 semaines (parcours longitudinal, compaction appliquée)', () => {
    const size = (s: AppState) => { const st = new MemoryStorage(); expect(saveState(st, s).ok).toBe(true); return (st.getItem(STORAGE_KEY) ?? '').length; };
    const bytes = (s: AppState) => reqs(s).reduce((a, r) => a + (r.crossInputs ? JSON.stringify({ crossInputs: r.crossInputs }).length + 1 : 0), 0);
    const rows: string[] = [];
    for (const [name, xs] of [['Consolidation (Musculation 3×, CT force 1×)', cons], ['P2F (Musculation 3×, CT force 2×)', p2f]] as const) {
      const last = simulate(name.startsWith('C') ? CONS : P2F, 6, env).state;
      rows.push(`| ${name} | 6 (simulation, séances réalisées) | ${String(size(last))} | ${String(bytes(last))} | ${(100 * bytes(last) / size(last)).toFixed(2)} % |`);
      expect(bytes(last) / size(last)).toBeLessThan(0.01);
      expect(xs.length).toBe(6);
    }
    const W = Array.from({ length: 52 }, (_, i) => new Date(Date.parse('2026-10-05T00:00:00Z') + i * 7 * 86_400_000).toISOString().slice(0, 10));
    // Historique long : semaines planifiées chaque lundi par le chemin de l'application (séances non réalisées), compaction
    // de l'historique appliquée par `ensureBeta0Week` ; les réalisations n'ajoutent rien au champ mesuré.
    let f = createBeta0Programme(emptyState(), PROFILE, clock(W[0] as string), {});
    for (const [i, mon] of W.entries()) {
      if (i > 0) f = ensureBeta0Week(f, at(`${mon}T06:00:00.000Z`));
      const n = i + 1;
      if (n !== 26 && n !== 52) continue;
      rows.push(`| Consolidation (Musculation 3×, CT force 1×) | ${String(n)} (semaines planifiées, compaction appliquée) | ${String(size(f))} | ${String(bytes(f))} | ${(100 * bytes(f) / size(f)).toFixed(2)} % |`);
      expect(bytes(f) / size(f)).toBeLessThan(0.01);
    }
    const out = new URL('./__reports__/b4-storage.md', import.meta.url);
    const text = ['# RC4.6 B4 — coût de stockage des entrées croisées compactes', '', '| Profil | Semaines | État persisté (octets) | `crossInputs` (octets) | Part |', '|---|---|---|---|---|', ...rows, ''].join('\n');
    mkdirSync(dirname(out.pathname), { recursive: true });
    if (process.env.B4_WRITE_REPORT) writeFileSync(out, text);
    expect(rows.length).toBe(4);
  }, 600000);
});
