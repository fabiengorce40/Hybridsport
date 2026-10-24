/**
 * RC4.6 (lot 2, L1b-4) — tirage complémentaire à temps résiduel, jusqu'au plancher du dos, retiré sous interférence de
 * préhension, en CONTENU VERSIONNÉ (registre F6-V).
 *
 * Références : états écrits par le code d'AVANT L1b-4 (`0334c46`, contenu L1-V3) sur S3 (semaine 2, une semaine réalisée),
 * P3 (HYROX) et P5 (quatre sports), et résultats de démarrage de ce même code (`fixtures/pre-l1b4-*.json`).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strengthL1V3RulesetDocument } from '../../../strength/tests/fixtures/l1v3.js';
import { strengthL1B4RulesetDocument } from '../../../strength/tests/fixtures/l1b4.js';
import { beta0Environment, ensureBeta0Week, selectProgrammeSession, sessionEnvironment, strengthContent, strengthContentFor } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { loadText, probe } from '../rc45/probe-starts.js';
import { simulate } from '../rc4-audit/rc4-sim.js';
import { qualityProfiles } from './quality-bench.js';

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8');
const REFS = JSON.parse(fx('pre-l1b4-starts')) as Record<string, ReturnType<typeof probe>>;
const STATES = { 'pre-l1b4-s3-w2': '2026-10-12', 'pre-l1b4-p3-w1': '2026-10-05', 'pre-l1b4-p5-w1': '2026-10-05' } as const;
const V3 = { ruleset: '0.6.0-strength-l1v3', catalog: '0.3.0-strength-test-f6' };
const CURRENT = { ruleset: strengthContent().ruleset.version, catalog: strengthContent().catalog.version };
const CHANGED = ['strength.needs', 'strength.substitution.fallbackNeeds', 'strength.goals', 'strength.stimuli', 'strength.interference', 'strength.archetypes'];
const load = (n: keyof typeof STATES) => loadText(fx(n), `${STATES[n]}T06:30:00.000Z`);
type Req = AppState['planner']['weeks'][string]['requests'][number];
const reqs = (s: AppState, w?: string): Req[] => (w ? s.planner.weeks[w]?.requests ?? [] : Object.values(s.planner.weeks).flatMap((x) => x.requests));
const provenance = (r: Req) => (r.record as { data?: { provenance?: { rulesetVersion: string; catalogVersion: string } } } | undefined)?.data?.provenance;
const strengthPlanned = (s: AppState, w?: string) => reqs(s, w).filter((r) => r.sport === 'strength' && r.status === 'planned');
const nextMonday = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
type J = Record<string, unknown>;

describe('RC4.6 L1b-4 — tirage complémentaire, contenu versionné', () => {
  it('surcouche : seuls les six paramètres du tirage complémentaire changent ; Full Body : un emplacement résiduel ajouté', () => {
    const v3 = strengthL1V3RulesetDocument();
    const b4 = strengthL1B4RulesetDocument();
    expect(b4.rulesetVersion).toBe('0.7.0-strength-l1b4');
    for (const p of v3.parameters) {
      const q = b4.parameters.find((x) => x.id === p.id);
      if (!CHANGED.includes(p.id)) expect(q).toEqual(p);
    }
    const arch = (d: typeof v3) => d.parameters.find((x) => x.id === 'strength.archetypes')?.value as unknown as J[];
    for (const [i, a] of arch(v3).entries()) {
      const b = arch(b4)[i] as J;
      if (a.id !== 'str_full_body') { expect(b).toEqual(a); continue; }
      const extra = (b.slots as J[]).slice((a.slots as J[]).length);
      expect((b.slots as J[]).slice(0, (a.slots as J[]).length)).toEqual(a.slots);
      expect(extra).toEqual([{ id: 'fb.pull_c', blockId: 'b.accessory', need: 'pull_complement', role: 'accessory', status: 'optional', count: { min: 1, max: 1 }, modalityPreference: 'stability', anchorable: false, trackable: true, fill: 'residual_time', untilWeeklyTarget: true }]);
    }
    const grip = ((b4.parameters.find((x) => x.id === 'strength.interference')?.value as unknown as { perStructure: Record<string, { dropOptionalNeeds: string[] }> }).perStructure.grip);
    expect(grip?.dropOptionalNeeds).toContain('pull_complement');
  });

  it('registre : L1b-4 conservé sous le contenu courant (RC5.1) ; L1-V3 conservé et relu', () => {
    expect(CURRENT).toEqual({ ruleset: '0.8.0-strength-rc51', catalog: V3.catalog });
    expect(strengthContentFor('0.7.0-strength-l1b4', V3.catalog)?.ruleset.version).toBe('0.7.0-strength-l1b4');
    expect(strengthContentFor(V3.ruleset, V3.catalog)?.ruleset.version).toBe(V3.ruleset);
  });

  for (const n of Object.keys(STATES) as (keyof typeof STATES)[]) {
    it(`${n} : anciennes semaines relues à l'identique (provenance L1-V3, 4 chemins de démarrage = code d'avant L1b-4)`, () => {
      const s = load(n);
      for (const r of strengthPlanned(s)) {
        expect(provenance(r)).toMatchObject({ rulesetVersion: V3.ruleset, catalogVersion: V3.catalog });
        expect(sessionEnvironment(s, r.requestId, beta0Environment()).strength?.content.ruleset.version).toBe(V3.ruleset);
      }
      const got = probe(s);
      expect(Object.keys(got).length).toBeGreaterThan(0);
      expect(got).toEqual(REFS[n]);
    });

    it(`${n} : semaine suivante avec L1b-4, semaines antérieures intactes, progressions existantes poursuivies`, () => {
      const s = load(n);
      const mon = nextMonday(STATES[n]);
      const next = ensureBeta0Week(s, { today: mon, now: `${mon}T06:00:00.000Z` });
      const records = (x: AppState, w: string) => JSON.stringify(reqs(x, w).map((r) => r.record ?? null));
      for (const w of Object.keys(s.planner.weeks)) expect(records(next, w)).toBe(records(s, w));
      const ids = strengthPlanned(next, mon);
      expect(ids.length).toBeGreaterThan(0);
      for (const r of ids) expect(provenance(r)).toMatchObject({ rulesetVersion: CURRENT.ruleset, catalogVersion: CURRENT.catalog });
      // Aucune progression existante interrompue : chaque track active reste active.
      for (const t of s.strength.tracks.filter((x) => x.status === 'active')) expect(next.strength.tracks.find((x) => x.trackId === t.trackId)?.status).toBe('active');
    });
  }

  it('P3 (HYROX) : le tirage complémentaire n’est jamais ajouté sous interférence de préhension (retrait tracé)', () => {
    const p3 = qualityProfiles().find((p) => p.id === 'P3');
    if (!p3) throw new Error('P3');
    const r = simulate(p3, 6);
    const gripDays = new Set(r.sessions.filter((x) => x.sport === 'strength' && x.reductions.some((y) => y.includes(':grip:'))).map((x) => x.date));
    expect(gripDays.size).toBeGreaterThan(0);
    let omitted = 0;
    let added = 0;
    for (const q of strengthPlanned(r.state)) {
      const items = (selectProgrammeSession(r.state, q.requestId)?.session.blocks ?? []).flatMap((b) => b.items);
      const has = items.some((i) => i.refs?.slotId === 'fb.pull_c');
      if (has) { added += 1; expect(gripDays.has(q.date ?? '')).toBe(false); }
      if (q.reasons.some((y) => y.code === 'SELECT.SLOT_OMITTED' && y.params.slot === 'fb.pull_c' && y.params.cause === 'interference')) omitted += 1;
    }
    expect(added).toBeGreaterThan(0);
    expect(omitted).toBeGreaterThan(0);
  }, 300000);
});
