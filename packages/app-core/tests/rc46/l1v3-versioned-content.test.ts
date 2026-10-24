/**
 * RC4.6 (L1-V3) — une seule isolation du haut du corps en Full Body, en CONTENU VERSIONNÉ (registre F6-V).
 *
 * Références : états écrits par le code d'AVANT L1-V3 (`7a8845f`, contenu F6) sur trois profils du banc (S3 semaine 2
 * avec une semaine réalisée, P1 et P5 semaine 1) et résultats de démarrage calculés par ce même code
 * (`fixtures/pre-l1v3-*.json`, sonde `rc45/probe-starts.ts`) : relecture des anciennes semaines à l'identique.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strengthF6RulesetDocument } from '../../../strength/tests/fixtures/f6.js';
import { strengthL1V3RulesetDocument } from '../../../strength/tests/fixtures/l1v3.js';
import {
  beta0Environment, ensureBeta0Week, regenerateSession, selectProgrammeSession, sessionChanges, sessionEnvironment, strengthContent, strengthContentFor, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { loadText, probe } from '../rc45/probe-starts.js';

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8');
const REFS = JSON.parse(fx('pre-l1v3-starts')) as Record<string, ReturnType<typeof probe>>;
const STATES = { 'pre-l1v3-s3-w2': '2026-10-12', 'pre-l1v3-p1-w1': '2026-10-05', 'pre-l1v3-p5-w1': '2026-10-05' } as const;
const F6 = { ruleset: '0.5.0-strength-f6', catalog: '0.3.0-strength-test-f6' };
const CURRENT = { ruleset: strengthContent().ruleset.version, catalog: strengthContent().catalog.version };
const load = (n: keyof typeof STATES) => loadText(fx(n), `${STATES[n]}T06:30:00.000Z`);
const provenance = (s: AppState, id: string) => {
  const r = Object.values(s.planner.weeks).flatMap((w) => w.requests).find((x) => x.requestId === id)?.record as { data?: { provenance?: { rulesetVersion: string; catalogVersion: string } } } | undefined;
  return r?.data?.provenance;
};
const strengthIds = (s: AppState, week: string) => (s.planner.weeks[week]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => r.requestId);
const isoUpper = (s: AppState, id: string) => (selectProgrammeSession(s, id)?.session.blocks ?? []).flatMap((b) => b.items).filter((i) => i.refs?.slotId === 'fb.iso_upper').length;
const nextMonday = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);

describe('RC4.6 L1-V3 — contenu versionné', () => {
  it('surcouche : seul `fb.iso_upper` (Full Body) change, de 1..2 à 1..1 ; tout le reste du ruleset F6 est identique', () => {
    const f6 = strengthF6RulesetDocument();
    const v3 = strengthL1V3RulesetDocument();
    expect(v3.rulesetVersion).toBe('0.6.0-strength-l1v3');
    for (const p of f6.parameters) {
      const q = v3.parameters.find((x) => x.id === p.id);
      if (p.id !== 'strength.archetypes') { expect(q).toEqual(p); continue; }
      const a = p.value as unknown as { id: string; slots: { id: string; count: unknown }[] }[];
      const b = q?.value as unknown as typeof a;
      expect(b.map((x) => x.id)).toEqual(a.map((x) => x.id));
      for (const [i, arch] of a.entries()) {
        for (const [j, slot] of arch.slots.entries()) {
          const other = b[i]?.slots[j];
          if (arch.id === 'str_full_body' && slot.id === 'fb.iso_upper') { expect(slot.count).toEqual({ min: 1, max: 2 }); expect(other).toEqual({ ...slot, count: { min: 1, max: 1 } }); } else expect(other).toEqual(slot);
        }
      }
    }
  });

  it('registre : L1-V3 conservé (catalogue F6 inchangé) sous le contenu courant (RC5.1) ; F6 conservé et relu', () => {
    expect(CURRENT).toEqual({ ruleset: '0.8.0-strength-rc51', catalog: F6.catalog });
    expect(strengthContentFor(CURRENT.ruleset, CURRENT.catalog)).toBe(strengthContent());
    expect(strengthContentFor('0.6.0-strength-l1v3', F6.catalog)?.ruleset.version).toBe('0.6.0-strength-l1v3');
    expect(strengthContentFor(F6.ruleset, F6.catalog)?.ruleset.version).toBe(F6.ruleset);
  });

  for (const n of Object.keys(STATES) as (keyof typeof STATES)[]) {
    it(`${n} : anciennes semaines relues à l'identique (provenance F6, 4 chemins de démarrage = code d'avant L1-V3)`, () => {
      const s = load(n);
      const ids = Object.keys(s.planner.weeks).flatMap((w) => strengthIds(s, w));
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(provenance(s, id)).toMatchObject({ rulesetVersion: F6.ruleset, catalogVersion: F6.catalog });
        expect(sessionEnvironment(s, id, beta0Environment()).strength?.content.ruleset.version).toBe(F6.ruleset);
      }
      const got = probe(s);
      expect(Object.keys(got).length).toBeGreaterThan(0);
      expect(got).toEqual(REFS[n]);
    });

    it(`${n} : semaine suivante planifiée avec le contenu courant (≤ 1 isolation du haut du corps, L1-V3 inclus), semaines antérieures intactes`, () => {
      const s = load(n);
      const mon = nextMonday(STATES[n]);
      const next = ensureBeta0Week(s, { today: mon, now: `${mon}T06:00:00.000Z` });
      const records = (x: AppState, w: string) => JSON.stringify((x.planner.weeks[w]?.requests ?? []).map((r) => r.record ?? null));
      for (const w of Object.keys(s.planner.weeks)) expect(records(next, w)).toBe(records(s, w));
      const ids = strengthIds(next, mon);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(provenance(next, id)).toMatchObject({ rulesetVersion: CURRENT.ruleset, catalogVersion: CURRENT.catalog });
        expect(isoUpper(next, id)).toBeLessThanOrEqual(1);
      }
    });
  }

  it('preuve que le registre est nécessaire : une séance F6 non commencée à 2 isolations du haut du corps, régénérée avec le contenu courant, changerait', () => {
    let twoIso = 0;
    let changed = 0;
    for (const n of Object.keys(STATES) as (keyof typeof STATES)[]) {
      const s = load(n);
      for (const id of Object.keys(s.planner.weeks).flatMap((w) => strengthIds(s, w))) {
        // Séances NON commencées seulement (une séance réalisée n'est plus régénérée par l'application).
        if (isoUpper(s, id) < 2 || s.programmeLogs[id]) continue;
        twoIso += 1;
        const viaRegistry = regenerateSession(s, id, UNKNOWN_CORE_STATE, beta0Environment());
        const forced: AppState = { ...s, planner: { weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === id && r.record ? { ...r, record: { ...r.record, data: { ...(r.record as { data: Record<string, unknown> }).data, provenance: { ...((r.record as { data: { provenance: Record<string, unknown> } }).data.provenance), rulesetVersion: CURRENT.ruleset } } } as never } : r)) }])) } };
        const current = regenerateSession(forced, id, UNKNOWN_CORE_STATE, beta0Environment());
        expect(viaRegistry.status).toBe('planned');
        if (viaRegistry.status === 'planned' && current.status === 'planned' && sessionChanges(viaRegistry.record.session, current.record.session).length > 0) changed += 1;
      }
    }
    expect(twoIso).toBeGreaterThan(0);
    expect(changed).toBe(twoIso);
  });
});
