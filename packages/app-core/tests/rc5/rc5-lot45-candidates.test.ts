/**
 * Reprise RC5 lot 4.5 (chantiers C, D) — contenus CANDIDATS (B1 + réévaluation des isolations ; redistribution) :
 * versions distinctes et déterministes, JAMAIS au registre des utilisateurs ni dans l'environnement Beta 0 ; séances
 * générées avec eux identifiables par leur provenance et conservées à l'export / import ; non relisibles tant que la
 * version n'est pas publiée au registre (prérequis d'activation, document 12 § 10). Garde de redistribution : stimulation
 * minimale (emplacement à temps résiduel) préservée et tracée.
 */
import { describe, expect, it } from 'vitest';
import { beta0Environment, createBeta0Programme, decodeState, emptyState, exportState, personalizedStrengthContent, strengthCandidateContent, strengthContent, strengthContentFor, strengthContentRegistry, strengthEnvironmentFor } from '../../src/index.js';
import type { AppState, Clock } from '../../src/index.js';
import { B1_CANDIDATE_CATALOG_VERSION } from '../../../strength/tests/fixtures/catalog-b1-candidate.js';
import { variantEnv } from './lot42-bench.js';
import { CANDIDATE_VARIANTS } from './lot45-bench.js';
import { profileOf } from './lot4-profiles.js';

const W1 = '2026-10-05';
const at = (d: string, hm = '06:00'): Clock => ({ today: d, now: `${d}T${hm}:00.000Z` });
const B1 = strengthCandidateContent({ b1IsolationReview: true });
const RED = strengthCandidateContent({ redistribution: { guard: 'keep_residual' } });
const prov = (s: AppState) => (s.planner.weeks[W1]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').map((r) => (r.record?.data as { provenance: { rulesetVersion: string; catalogVersion: string } }).provenance);

describe('contenus candidats : versionnés, hors registre, inactifs', () => {
  it('versions distinctes, déterministes ; jamais au registre ni dans l’environnement Beta 0', () => {
    expect(B1.ruleset.version).toMatch(/\.candidate-b1iso$/);
    expect(B1.catalog.version).toBe(B1_CANDIDATE_CATALOG_VERSION);
    expect(RED.ruleset.version).toMatch(/\.candidate-red-guard$/);
    expect(strengthCandidateContent({ b1IsolationReview: true })).toBe(B1);
    const reg = strengthContentRegistry().map((c) => `${c.ruleset.version}|${c.catalog.version}`);
    for (const c of [B1, RED]) {
      expect(reg).not.toContain(`${c.ruleset.version}|${c.catalog.version}`);
      expect(strengthContentFor(c.ruleset.version, c.catalog.version)).toBeUndefined();
    }
    const env = beta0Environment();
    expect(env.strength?.content.ruleset.version).not.toMatch(/candidate/);
    const policy = JSON.stringify(env.strength?.content.ruleset.document.parameters.find((x) => x.id === 'strength.personalization')?.value ?? {});
    for (const k of ['isolationReview', 'redistributeUnplaced', 'redistributeGuard', 'redistributeScope']) expect(policy).not.toContain(k);
  });
  it('politique candidate : seules les options déclarées diffèrent de la politique courante', () => {
    const cur = personalizedStrengthContent(strengthContent()).ruleset.document.parameters.find((x) => x.id === 'strength.personalization')?.value as Record<string, unknown>;
    const b1 = B1.ruleset.document.parameters.find((x) => x.id === 'strength.personalization')?.value as Record<string, unknown>;
    const red = RED.ruleset.document.parameters.find((x) => x.id === 'strength.personalization')?.value as Record<string, unknown>;
    expect(b1).toEqual({ ...cur, isolationReview: 'volume_fit' });
    expect(red).toEqual({ ...cur, redistributeUnplaced: true, redistributeGuard: 'keep_residual' });
  });
  it('catalogue candidat B1 : bras synergistes des poussées / tirages polyarticulaires ; tout le reste identique', () => {
    const base = beta0Environment().strength?.content.catalog;
    if (!base) throw new Error('catalogue attendu');
    for (const e of B1.catalog.document.exercises) {
      const b = base.exercise(e.id);
      if (!b) throw new Error(e.id);
      const pp = /^(push|pull)_/.test(e.patterns.primary) && e.compound;
      if (!pp) expect(e).toEqual(b);
      else {
        expect(e.muscles.primary.some((m) => m === 'biceps' || m === 'triceps') && e.muscles.primary.length > 1).toBe(false);
        expect({ ...e, muscles: undefined }).toEqual({ ...b, muscles: undefined });
      }
    }
  });
});

describe('séances issues d’un candidat : identifiables, conservées, relisibles seulement après publication', () => {
  const p = profileOf({}, { days: [0, 1, 3, 4] });
  const env = variantEnv(CANDIDATE_VARIANTS.find((v) => v.id === 'CAND-B1ISO') ?? CANDIDATE_VARIANTS[0] as never);
  const s = createBeta0Programme(emptyState(), p, at(W1), {}, env);
  it('provenance : versions candidates du ruleset et du catalogue', () => {
    for (const x of prov(s)) expect([x.rulesetVersion, x.catalogVersion]).toEqual([B1.ruleset.version, B1.catalog.version]);
  });
  it('export / import : identique (provenance comprise)', () => {
    const d = decodeState(exportState(s));
    expect(d.ok && d.state).toEqual(s);
  });
  it('non relisible avec le registre des utilisateurs tant que la version n’est pas publiée (prérequis d’activation)', () => {
    const x = prov(s)[0];
    if (!x) throw new Error('séance attendue');
    expect(strengthEnvironmentFor(beta0Environment(), x.rulesetVersion, x.catalogVersion)).toBeUndefined();
  });
});

describe('garde de redistribution : stimulation minimale préservée', () => {
  it('semaine courte (3 jours, 4 séances) : avec la garde, la séance Bas garde ses mollets ; décision tracée', () => {
    const p = profileOf({}, { days: [0, 2, 4] });
    const guarded = createBeta0Programme(emptyState(), p, at(W1), {}, variantEnv(CANDIDATE_VARIANTS.find((v) => v.id === 'CAND-RED-GUARD') as never));
    const plain = createBeta0Programme(emptyState(), p, at(W1), {}, beta0Environment());
    const items = (s: AppState) => (s.planner.weeks[W1]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned').flatMap((r) => ((r.record?.data as { session?: { blocks: { items: { exerciseId: string; refs?: { slotId?: string } }[] }[] } }).session?.blocks ?? []).flatMap((b) => b.items));
    const calves = (s: AppState) => items(s).filter((i) => /\.calves$/.test(i.refs?.slotId ?? '')).length;
    const unguarded = createBeta0Programme(emptyState(), p, at(W1), {}, variantEnv({ id: 'RED', label: 'redistribution', redistributeUnplaced: true }));
    expect(calves(guarded)).toBe(calves(plain));
    const reasons = (guarded.planner.weeks[W1]?.requests ?? []).flatMap((r) => JSON.stringify(r).match(/DOSE\.REDISTRIBUTION_SKIPPED/g) ?? []);
    // Sans garde, la redistribution perd au moins un emplacement de mollets ; la garde le rétablit et le trace.
    expect(calves(unguarded)).toBeLessThan(calves(plain));
    expect(reasons.length).toBeGreaterThan(0);
  });
});
