/**
 * RC4.5 (F6-V, F6-5) — registre de contenu VERSIONNÉ : une séance planifiée avant F6 est régénérée avec SES règles
 * d'origine (ruleset 4F, catalogue de test), jamais rétroactivement avec le contenu courant F6.
 *
 * Références : états écrits par le code d'AVANT F6 (`6419a1d`) et résultats de démarrage calculés par ce même code
 * (`fixtures/pre-f6-*.json`, sonde `probe-starts.ts`) sur les quatre chemins de régénération : régénération au
 * démarrage, adaptation de la séance persistée, état du jour persisté, récupération après course libre.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  beta0Environment, ensureBeta0Week, previewBeta0Recreation, recreateBeta0Programme, regenerateSession, selectBeta0Week, selectProgrammeSession, sessionChanges, sessionEnvironment, strengthContent,
  strengthContentFor, UNKNOWN_CORE_STATE,
} from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { loadText, probe } from './probe-starts.js';
import { PROFILES } from '../rc4-audit/rc4-sim.js';

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8');
const REFS = JSON.parse(fx('pre-f6-starts')) as Record<string, ReturnType<typeof probe>>;
const STATES = ['pre-f6-consolidation-w1', 'pre-f6-consolidation-w2', 'pre-f6-p2-w1'];
const LOCK = { ruleset: '0.4.0-strength-science-lock', catalog: '0.2.0-strength-test' };
const F6 = { ruleset: '0.5.0-strength-f6', catalog: '0.3.0-strength-test-f6' };
// RC4.6 (L1-V3) : le contenu COURANT est désormais la surcouche L1-V3 ; F6 est conservé au registre.
const CURRENT = { ruleset: strengthContent().ruleset.version, catalog: strengthContent().catalog.version };
const load = (n: string) => loadText(fx(n), '2026-10-05T07:30:00.000Z');
const provenance = (s: AppState, id: string) => {
  const r = Object.values(s.planner.weeks).flatMap((w) => w.requests).find((x) => x.requestId === id)?.record as { data?: { provenance?: { rulesetVersion: string; catalogVersion: string } } } | undefined;
  return r?.data?.provenance;
};
const strengthIds = (s: AppState, week: string) => (s.planner.weeks[week]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => r.requestId);

describe('RC4.5 F6 — contenu versionné : aucune régénération rétroactive', () => {
  it('registre : contenu courant (L1-V3), F6 et 4F conservés ; version inconnue ⇒ aucun contenu', () => {
    // RC5.1 : contenu courant = surcouche Haut A/B et Bas A/B (sur L1b-4, sur L1-V3, sur F6) ; antérieurs conservés au registre.
    expect(CURRENT).toEqual({ ruleset: '0.11.0-strength-rc53-r2', catalog: F6.catalog });
    expect(strengthContentFor(LOCK.ruleset, LOCK.catalog)?.ruleset.version).toBe(LOCK.ruleset);
    expect(strengthContentFor(F6.ruleset, F6.catalog)?.ruleset.version).toBe(F6.ruleset);
    expect(strengthContentFor(CURRENT.ruleset, CURRENT.catalog)).toBe(strengthContent());
    expect(strengthContentFor('9.9.9-inconnu', LOCK.catalog)).toBeUndefined();
  });

  for (const n of STATES) {
    it(`${n} : les 4 chemins de démarrage donnent EXACTEMENT le résultat du code d'avant F6 (aucun mollet ajouté)`, () => {
      const s = load(n);
      for (const id of Object.keys(s.planner.weeks).flatMap((w) => strengthIds(s, w))) expect(provenance(s, id)).toMatchObject({ rulesetVersion: LOCK.ruleset, catalogVersion: LOCK.catalog });
      const got = probe(s);
      expect(got).toEqual(REFS[n]);
      expect(Object.keys(got).length).toBeGreaterThan(0);
    });
  }

  it('couverture : les quatre chemins sont exercés par les références', () => {
    const codes = new Set(Object.values(REFS).flatMap((x) => Object.values(x).flatMap((y) => y.codes)));
    for (const c of ['KAIRO.CHECKIN_SESSION_ADAPTED', 'KAIRO.CHECKIN_PERSISTED_ADAPTED', 'KAIRO.CHECKIN_READINESS_PERSISTED', 'KAIRO.FREE_RUN_RECOVERY_APPLIED']) expect(codes.has(c), c).toBe(true);
  });

  it('séance d’avant F6 : environnement de régénération = contenu 4F ; contenu courant ⇒ régénération différente (preuve que le registre est nécessaire)', () => {
    const s = load('pre-f6-consolidation-w2');
    const env = beta0Environment();
    let differs = 0;
    for (const id of strengthIds(s, '2026-10-12')) {
      expect(sessionEnvironment(s, id, env).strength?.content.ruleset.version).toBe(LOCK.ruleset);
      const planned = selectProgrammeSession(s, id)?.session;
      const viaRegistry = regenerateSession(s, id, UNKNOWN_CORE_STATE, env);
      expect(viaRegistry.status).toBe('planned');
      if (viaRegistry.status === 'planned' && planned) expect(viaRegistry.record.session.blocks.flatMap((b) => b.items).some((i) => i.exerciseId.includes('calf') && !planned.blocks.flatMap((b) => b.items).some((p) => p.exerciseId === i.exerciseId))).toBe(false);
      // Contenu courant forcé (provenance réécrite comme si la séance était F6) : la régénération change.
      const forced: AppState = { ...s, planner: { weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === id && r.record ? { ...r, record: { ...r.record, data: { ...(r.record as { data: Record<string, unknown> }).data, provenance: { ...((r.record as { data: { provenance: Record<string, unknown> } }).data.provenance), rulesetVersion: F6.ruleset, catalogVersion: F6.catalog } } } as never } : r)) }])) } };
      const current = regenerateSession(forced, id, UNKNOWN_CORE_STATE, env);
      if (viaRegistry.status === 'planned' && current.status === 'planned' && sessionChanges(viaRegistry.record.session, current.record.session).length > 0) differs += 1;
    }
    expect(differs).toBeGreaterThan(0);
  });

  it('version inconnue du registre : environnement inchangé (chemin « non reproductible » existant, séance gardée)', () => {
    const s = load('pre-f6-p2-w1');
    const id = strengthIds(s, '2026-10-05')[0] ?? '';
    const unknown: AppState = { ...s, planner: { weeks: Object.fromEntries(Object.entries(s.planner.weeks).map(([k, w]) => [k, { ...w, requests: w.requests.map((r) => (r.requestId === id && r.record ? { ...r, record: { ...r.record, data: { ...(r.record as { data: Record<string, unknown> }).data, provenance: { ...((r.record as { data: { provenance: Record<string, unknown> } }).data.provenance), rulesetVersion: '0.0.1-retiré' } } } as never } : r)) }])) } };
    const env = beta0Environment();
    expect(sessionEnvironment(unknown, id, env)).toBe(env);
  });

  it('semaine planifiée APRÈS F6 : provenance du contenu courant, régénérée avec lui ; semaines antérieures intactes', () => {
    const s = load('pre-f6-consolidation-w2');
    const next = ensureBeta0Week(s, { today: '2026-10-19', now: '2026-10-19T07:30:00.000Z' });
    // Séances de Musculation des semaines antérieures : enregistrements persistés inchangés (aucune réécriture F6).
    const records = (x: AppState, w: string) => JSON.stringify((x.planner.weeks[w]?.requests ?? []).filter((r) => r.sport === 'strength').map((r) => r.record ?? null));
    for (const w of ['2026-10-05', '2026-10-12']) expect(records(next, w)).toBe(records(s, w));
    const ids = strengthIds(next, '2026-10-19');
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(provenance(next, id)).toMatchObject({ rulesetVersion: CURRENT.ruleset, catalogVersion: CURRENT.catalog });
      expect(sessionEnvironment(next, id, beta0Environment()).strength?.content.ruleset.version).toBe(CURRENT.ruleset);
    }
  });

  it('F6-5 : « Modifier » une semaine NON commencée la replanifie avec le contenu courant', () => {
    const s = load('pre-f6-p2-w1');
    const clock = { today: '2026-10-05', now: '2026-10-05T08:00:00.000Z' };
    expect(previewBeta0Recreation(s, clock.today).currentWeek).toBe('replanned');
    const p2 = PROFILES.find((x) => x.id === 'P2');
    if (!p2) throw new Error('P2');
    const r = recreateBeta0Programme(s, p2.profile, clock, {});
    const ids = strengthIds(r, '2026-10-05');
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(provenance(r, id)).toMatchObject({ rulesetVersion: CURRENT.ruleset, catalogVersion: CURRENT.catalog });
    expect((selectBeta0Week(r, '2026-10-05')?.sessions ?? []).length).toBeGreaterThan(0);
  });
});
