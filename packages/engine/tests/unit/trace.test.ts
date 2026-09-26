import { describe, expect, it } from 'vitest';
import { DECISION_CATEGORIES } from '@hybridsport/domain';
import type { EngineVersions } from '@hybridsport/domain';
import { ReasonCodeRegistry, TraceBuilder, createCoreRegistry, domainOf, explain, CORE_REASON_CODES, canonicalStringify } from '../../src/index.js';

const versions: EngineVersions = { engineVersion: '0.1.0', rulesetVersion: '0.1.0-test', catalogVersion: '0.1.0-test' };

describe('registre de reason codes', () => {
  const reg = createCoreRegistry();

  it('chaque code du CORE a un domaine cohérent avec son préfixe', () => {
    for (const d of CORE_REASON_CODES) expect(domainOf(d.code)).toBeDefined();
  });

  it('les catégories SAFETY / FEASIBILITY / TECHNICAL sont distinctes', () => {
    expect(reg.emit('SAFETY.RESTRICTION_VIOLATED', { restriction: 'no_impact', exerciseId: 'ex.box_jump' }).category).toBe('safety');
    expect(reg.emit('FEASIBILITY.EQUIPMENT_MISSING', { exerciseId: 'ex.sled_push', missing: ['sled'] }).category).toBe('feasibility');
    expect(reg.emit('TECHNICAL.NON_FINITE_VALUE', { path: '$.blocks[0]' }).category).toBe('technical');
  });

  it('les sept catégories de décision demandées existent', () => {
    for (const c of ['safety', 'feasibility', 'technical', 'business_hard', 'business_soft', 'optimization', 'adaptation']) {
      expect(DECISION_CATEGORIES).toContain(c);
    }
  });

  it('RULE.ENFORCEMENT peut être HARD ou SOFT selon l’émission', () => {
    const hard = reg.emit('RULE.ENFORCEMENT', { rule: 'L1', level: 'hard', threshold: 48, factors: ['structure'] }, { category: 'business_hard' });
    const soft = reg.emit('RULE.ENFORCEMENT', { rule: 'L1', level: 'soft', factors: [] }, { category: 'business_soft' });
    expect([hard.category, soft.category]).toEqual(['business_hard', 'business_soft']);
  });

  it('refuse un code inconnu, un paramètre manquant, mal typé ou inconnu, une catégorie interdite', () => {
    expect(() => reg.emit('SAFETY.INCONNU')).toThrow(/non enregistré/);
    expect(() => reg.emit('FEASIBILITY.TIME_EXCEEDED', { p90S: 10 })).toThrow(/manquant/);
    expect(() => reg.emit('FEASIBILITY.TIME_EXCEEDED', { p90S: 'dix', availableS: 5 })).toThrow(/number/);
    expect(() => reg.emit('FEASIBILITY.TIME_EXCEEDED', { p90S: 1, availableS: 5, extra: 1 })).toThrow(/inconnu/);
    expect(() => reg.emit('SAFETY.RESTRICTION_VIOLATED', { restriction: 'x', exerciseId: 'y' }, { category: 'optimization' })).toThrow(/non autorisée/);
  });

  it('refuse les définitions invalides ou dupliquées', () => {
    expect(() => new ReasonCodeRegistry([{ code: 'bad', categories: ['safety'], params: {}, audience: 'internal', severity: 'info' }])).toThrow();
    expect(() => new ReasonCodeRegistry([{ code: 'FOO.BAR', categories: ['safety'], params: {}, audience: 'internal', severity: 'info' }])).toThrow(/Domaine/);
    const d = { code: 'DATA.X', categories: ['information'] as const, params: {}, audience: 'internal' as const, severity: 'info' as const };
    expect(() => new ReasonCodeRegistry([d, d])).toThrow(/dupliqué/);
    expect(() => new ReasonCodeRegistry([{ ...d, categories: [] }])).toThrow(/Catégories/);
  });
});

describe('trace des décisions', () => {
  const reg = createCoreRegistry();
  const subject = { kind: 'session', id: 's1' } as const;

  function buildTrace() {
    return new TraceBuilder(versions, 'seed-1')
      .add({ step: 'admissibility', subject: { kind: 'session', id: 's0' }, decision: 'rejected', reasons: [reg.emit('FEASIBILITY.TIME_EXCEEDED', { p90S: 4000, availableS: 3600 })] })
      .add({ step: 'score', subject, decision: 'selected', reasons: [reg.emit('SELECT.DECIDED_AT_LEVEL', { winnerId: 's1', level: 'B1', gap: 0.2 }, { ruleRefs: ['core.score@1.0.0'] })] })
      .build();
  }

  it('est déterministe (même contenu ⇒ même identifiant et même sérialisation)', () => {
    expect(canonicalStringify(buildTrace())).toBe(canonicalStringify(buildTrace()));
    expect(buildTrace().traceId).toMatch(/^t[0-9a-f]{16}$/);
  });

  it('est figée après construction', () => {
    const t = buildTrace();
    expect(Object.isFrozen(t.entries)).toBe(true);
    expect(() => (t.entries as unknown as unknown[]).push({})).toThrow();
  });

  it('répond à « pourquoi ? » par catégorie et références de règles', () => {
    const why = explain(buildTrace(), subject);
    expect(why.decisions).toEqual([{ step: 'score', decision: 'selected' }]);
    expect(why.byCategory.optimization?.[0]?.code).toBe('SELECT.DECIDED_AT_LEVEL');
    expect(why.ruleRefs).toEqual(['core.score@1.0.0']);
    expect(explain(buildTrace(), { kind: 'session', id: 's0' }).byCategory.feasibility?.[0]?.params).toEqual({ p90S: 4000, availableS: 3600 });
  });
});
