/**
 * Strength S2 — garde PERMANENTE du contrat de substitution directe :
 *   - toute alternative proposée est une substitution DÉCLARÉE (fidélité high / medium) qui satisfait TOUS les
 *     invariants de métadonnées (pattern, muscles primaires, poly / mono, type de mouvement, latéralité, type de
 *     prescription, chargeable) — sur tout le catalogue et dans les séances générées ;
 *   - un exercice ajouté au catalogue ne peut pas réintroduire une substitution incohérente (déclaration refusée) ni
 *     obtenir d'alternative sans déclaration (fail-closed) ;
 *   - le contexte (matériel, exclusion, douleur `reduce` comprise) retire des alternatives, jamais n'en ajoute ;
 *   - les expositions prévues n'influencent pas les alternatives ; déterminisme ; rapport d'audit versionné.
 * Les couples adversariaux sont des TESTS, pas une table de correspondance : le moteur n'en contient aucune.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogDocumentInput, ExerciseInput, SessionDraft } from '@hybridsport/domain';
import {
  declaredSubstitutionVerdicts, directSubstitutes, invariantFailures, StrengthEngine, SUBSTITUTION_CONTRACT_VERSION, SUBSTITUTION_INVARIANTS,
} from '../../src/index.js';
import type { StrengthContext } from '../../src/index.js';
import type { SportEngineInput } from '@hybridsport/engine';
import { strengthCatalogDocument } from '../fixtures/catalog.js';
import { engineInput, NOW, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';
import { GOLDENS } from '../fixtures/goldens.js';
import { auditCatalog, auditReport, auditSummary, strengthExercises } from '../substitution/audit.js';

const CATALOG = strengthCatalog();
const RULESET = strengthRuleset();
const ex = (id: string) => { const e = CATALOG.exercise(id); if (!e) throw new Error(id); return e; };
const items = (s: SessionDraft) => s.blocks.flatMap((b) => b.items);

/** Catalogue de test modifié (exercices remplacés ou ajoutés), validé par le chargeur du CORE. */
function catalogWith(patch: (doc: CatalogDocumentInput) => CatalogDocumentInput) { return strengthCatalog(patch(strengthCatalogDocument())); }
const declare = (doc: CatalogDocumentInput, from: string, to: string, fidelity: 'high' | 'medium' | 'low' = 'medium'): CatalogDocumentInput => ({
  ...doc, exercises: doc.exercises.map((e) => (e.id === from ? { ...e, substitutions: [...e.substitutions, { exerciseId: to, fidelity }] } : e)),
});

describe('catalogue complet : invariants du contrat', () => {
  const all = strengthExercises(CATALOG);

  it('toute substitution directe est déclarée (high / medium), ≠ source, active, Strength, et satisfait chaque invariant', () => {
    for (const e of all) {
      for (const t of directSubstitutes(e, CATALOG)) {
        expect(t.id, e.id).not.toBe(e.id);
        expect(t.status === 'active' && t.disciplines.includes('strength'), `${e.id} → ${t.id}`).toBe(true);
        expect(e.substitutions.find((s) => s.exerciseId === t.id)?.fidelity, `${e.id} → ${t.id}`).toMatch(/^(high|medium)$/);
        expect(invariantFailures(e, t), `${e.id} → ${t.id}`).toEqual([]);
        // Charge : jamais de prescription chargée réalisée sans charge (et la charge elle-même n'est jamais transférée).
        expect(t.loadable, `${e.id} → ${t.id}`).toBe(e.loadable);
        expect(t.compound, `${e.id} → ${t.id}`).toBe(e.compound);
      }
    }
  });

  it('invariants SYMÉTRIQUES (propriété des métadonnées) ; déclarations ASYMÉTRIQUES admises', () => {
    for (const a of all) for (const b of all) expect(invariantFailures(a, b)).toEqual(invariantFailures(b, a));
    // squat barre → presse déclarée ; presse → squat barre non déclarée : jamais déduite.
    expect(directSubstitutes(ex('ex.back_squat'), CATALOG).map((t) => t.id)).toContain('ex.leg_press');
    expect(directSubstitutes(ex('ex.leg_press'), CATALOG).map((t) => t.id)).not.toContain('ex.back_squat');
  });

  it('chaque refus de déclaration est expliqué par un invariant ou la fidélité (aucun refus muet)', () => {
    for (const e of all) for (const v of declaredSubstitutionVerdicts(e, CATALOG)) expect(v.direct, `${e.id} → ${v.targetId}`).toBe(v.failures.length === 0);
    expect(declaredSubstitutionVerdicts(ex('ex.plank'), CATALOG)).toEqual([{ targetId: 'ex.push_up', fidelity: 'low', direct: false, failures: ['pattern', 'primary_muscles', 'compound', 'movement_type', 'prescription_type', 'low_fidelity'] }]);
  });

  it('rapport d’audit versionné (avant / après / données manquantes), déterministe', async () => {
    const rows = auditCatalog(CATALOG, RULESET);
    expect(auditCatalog(CATALOG, RULESET)).toEqual(rows);
    await expect(auditReport(rows, SUBSTITUTION_CONTRACT_VERSION, CATALOG.version)).toMatchFileSnapshot('../architecture/__reports__/substitution-audit.md');
    const s = auditSummary(rows);
    expect(s.afterPairs).toBeLessThan(s.beforePairs);
    expect(rows.every((r) => r.after.every((t) => r.declared.some((d) => d.targetId === t && d.direct)))).toBe(true);
  });
});

describe('tests adversariaux (propriétés, pas une table)', () => {
  const NEVER: readonly [string, string][] = [
    ['ex.pec_deck', 'ex.machine_lateral_raise'], ['ex.pec_deck', 'ex.cable_triceps_pushdown'], ['ex.pec_deck', 'ex.cable_lateral_raise'],
    ['ex.machine_row', 'ex.machine_lateral_raise'], ['ex.db_curl', 'ex.cable_triceps_pushdown'], ['ex.leg_curl', 'ex.leg_extension'],
    ['ex.back_squat', 'ex.romanian_deadlift'], ['ex.back_squat', 'ex.leg_extension'], ['ex.cable_pallof_press', 'ex.plank'], ['ex.bench_press', 'ex.pec_deck'],
  ];
  it.each(NEVER)('%s → %s : incompatible par les métadonnées, refusé MÊME si le catalogue le déclarait', (a, b) => {
    expect(invariantFailures(ex(a), ex(b)).length).toBeGreaterThan(0);
    const bad = catalogWith((d) => declare(d, a, b));
    const sub = bad.exercise(a);
    if (!sub) throw new Error(a);
    expect(directSubstitutes(sub, bad).map((t) => t.id)).not.toContain(b);
  });

  it('variantes réellement compatibles déclarées : admises (squat barre → presse / goblet, développé couché → haltères / machine)', () => {
    expect(directSubstitutes(ex('ex.back_squat'), CATALOG).map((t) => t.id)).toEqual(['ex.goblet_squat', 'ex.leg_press']);
    expect(directSubstitutes(ex('ex.bench_press'), CATALOG).map((t) => t.id)).toEqual(['ex.db_bench_press', 'ex.machine_chest_press']);
  });

  it('source → elle-même : jamais (même déclarée)', () => {
    const doc = strengthCatalogDocument();
    // Le chargeur du CORE refuse déjà une auto-substitution (catalogue invalide) ; le contrat la refuse aussi.
    const e = ex('ex.bench_press');
    expect(declaredSubstitutionVerdicts({ ...e, substitutions: [{ exerciseId: e.id, fidelity: 'high' }] }, CATALOG)[0]?.failures).toContain('self');
    expect(doc.exercises.length).toBeGreaterThan(0);
  });

  it('nouvel exercice : sans déclaration ⇒ aucune alternative (fail-closed) ; déclaration incohérente ⇒ refusée', () => {
    const base = strengthCatalogDocument().exercises.find((e) => e.id === 'ex.db_curl') as ExerciseInput;
    const twin: ExerciseInput = { ...base, id: 'ex.test_curl_machine', family: 'fam.test_curl', equivalenceClass: 'eq.test_curl', substitutions: [] };
    const liar: ExerciseInput = { ...base, id: 'ex.test_curl_liar', family: 'fam.test_liar', equivalenceClass: 'eq.test_liar', substitutions: [{ exerciseId: 'ex.cable_triceps_pushdown', fidelity: 'medium' }] };
    const c = catalogWith((d) => ({ ...d, exercises: [...d.exercises, twin, liar] }));
    expect(directSubstitutes(c.exercise('ex.test_curl_machine') as never, c)).toEqual([]);
    expect(invariantFailures(c.exercise('ex.test_curl_machine') as never, ex('ex.db_curl'))).toEqual([]);
    expect(declaredSubstitutionVerdicts(c.exercise('ex.test_curl_liar') as never, c)[0]?.failures).toEqual(['primary_muscles']);
    expect(directSubstitutes(c.exercise('ex.test_curl_liar') as never, c)).toEqual([]);
  });

  it('fidélité low (repli signalé) : jamais une alternative, même si les invariants tiennent', () => {
    const c = catalogWith((d) => declare(d, 'ex.db_curl', 'ex.cable_curl', 'low'));
    expect(invariantFailures(ex('ex.db_curl'), ex('ex.cable_curl'))).toEqual([]);
    expect(directSubstitutes(c.exercise('ex.db_curl') as never, c)).toEqual([]);
    const ok = catalogWith((d) => declare(d, 'ex.db_curl', 'ex.cable_curl', 'medium'));
    expect(directSubstitutes(ok.exercise('ex.db_curl') as never, ok).map((t) => t.id)).toEqual(['ex.cable_curl']);
  });
});

describe('séances générées : alternatives = substituts directs admissibles dans le contexte', () => {
  const upper = () => scenario({ archetype: 'str_upper', stimulus: 'strength_volume', context: { goal: { primary: { goal: 'hypertrophy' } } } });
  const propose = (input: SportEngineInput<StrengthContext>) => {
    const r = StrengthEngine.propose(input);
    if (r.status !== 'proposals') throw new Error('aucune proposition');
    return items(r.proposals[0]?.session as SessionDraft);
  };
  const altsOf = (its: ReturnType<typeof items>, exerciseId: string) => its.find((it) => it.exerciseId === exerciseId)?.alternatives ?? [];

  it('goldens S1–S7 : chaque alternative ∈ substituts directs de l’exercice prescrit', () => {
    for (const [k, g] of Object.entries(GOLDENS)) {
      const o = run(g.scenario);
      if (o.result.status !== 'ok') continue;
      const cat = g.scenario.catalog ?? CATALOG;
      for (const it of items(o.result.value)) {
        const direct = directSubstitutes(cat.exercise(it.exerciseId) as never, cat).map((t) => t.id);
        for (const a of it.alternatives ?? []) expect(direct, `${k} ${it.exerciseId} → ${a}`).toContain(a);
      }
    }
  });

  it('matériel indisponible, exercice exclu : alternative retirée (jamais remplacée par un apparenté)', () => {
    const base = engineInput(upper());
    const its = propose(base);
    expect(altsOf(its, 'ex.bench_press')).toEqual(['ex.db_bench_press', 'ex.machine_chest_press']);
    const noDb = propose({ ...base, constraints: { ...base.constraints, availableEquipment: base.constraints.availableEquipment.filter((q) => q !== 'dumbbells') } });
    expect(altsOf(noDb, 'ex.bench_press')).toEqual(['ex.machine_chest_press']);
    const excluded = propose({ ...base, constraints: { ...base.constraints, excludedExercises: ['ex.machine_chest_press'] } });
    expect(altsOf(excluded, 'ex.bench_press')).toEqual(['ex.db_bench_press']);
  });

  it('douleur : une alternative sensible à une zone restreinte est retirée, y compris en `reduce` (aucune compatibilité médicale déduite)', () => {
    // Zone de test portée par la SEULE alternative (la source n'est pas concernée : sa sélection reste identique).
    const c = catalogWith((d) => ({ ...d, taxonomy: { ...d.taxonomy, bodyAreas: [...d.taxonomy.bodyAreas, { id: 'test_zone' }] }, exercises: d.exercises.map((e) => (e.id === 'ex.machine_chest_press' ? { ...e, painSensitiveAreas: [...(e.painSensitiveAreas ?? []), 'test_zone'] } : e)) }));
    const base = engineInput({ ...upper(), catalog: c });
    expect(altsOf(propose(base), 'ex.bench_press')).toContain('ex.machine_chest_press');
    const reduce = propose({ ...base, constraints: { ...base.constraints, areaRestrictions: [{ area: 'test_zone', action: 'reduce', painLevel: 'P1' }] } });
    expect(altsOf(reduce, 'ex.bench_press')).toEqual(['ex.db_bench_press']);
  });

  it('expositions prévues : sans effet sur les alternatives d’un même exercice ; déterminisme et ordre (fidélité, identifiant)', () => {
    const s = upper();
    const first = run(s);
    if (first.result.status !== 'ok' || !first.fingerprint) throw new Error('séance');
    const planned = run({ ...s, history: [{ fingerprint: first.fingerprint, at: NOW, status: 'planned', repetitionIntents: [] }], now: '2026-10-07T08:00:00Z' as never });
    if (planned.result.status !== 'ok') throw new Error('séance');
    const byEx = (x: SessionDraft) => new Map(items(x).map((it) => [it.exerciseId, it.alternatives ?? []]));
    const a = byEx(first.result.value);
    for (const [id, alts] of byEx(planned.result.value)) if (a.has(id)) expect(alts, id).toEqual(a.get(id));
    const again = run(s);
    expect(again.result.status === 'ok' && items(again.result.value).map((it) => it.alternatives)).toEqual(items(first.result.value).map((it) => it.alternatives));
  });

  it('les alternatives sont des identifiants seuls : aucune charge, répétition ni intensité transportée ; prescription inchangée', () => {
    const o = run(upper());
    if (o.result.status !== 'ok') throw new Error('séance');
    for (const it of items(o.result.value)) for (const a of it.alternatives ?? []) expect(typeof a).toBe('string');
    expect(SUBSTITUTION_INVARIANTS).toContain('loadable');
  });
});
