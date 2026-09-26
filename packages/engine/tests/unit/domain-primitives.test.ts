import { describe, expect, it } from 'vitest';
import {
  asId, isValidId, parseSemVer, compareSemVer, isSemVer, asISODateTime, isISODateTime, isISODate, hoursBetween,
  READINESS_CATEGORIES, NON_PERFORMANCE_SKIP_REASONS, PROGRAM_STATUSES, ELIGIBILITIES, ordinal, isOneOf, statusFrom,
  ENGINE_ERROR_CODES,
} from '@hybridsport/domain';
import type { ExerciseId, Violation } from '@hybridsport/domain';
import { checkEngineContext } from '../../src/index.js';

describe('identifiants typés', () => {
  it('accepte les identifiants valides et rejette les invalides', () => {
    expect(isValidId('ex.back_squat')).toBe(true);
    expect(isValidId('')).toBe(false);
    expect(isValidId('avec espace')).toBe(false);
    const id: ExerciseId = asId<ExerciseId>('ex.bench');
    expect(id).toBe('ex.bench');
    expect(() => asId<ExerciseId>(' ')).toThrow(TypeError);
  });
});

describe('versions', () => {
  it('parse et compare SemVer', () => {
    expect(parseSemVer('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemVer('0.1.0-provisional')).toEqual({ major: 0, minor: 1, patch: 0, prerelease: 'provisional' });
    expect(parseSemVer('1.2')).toBeUndefined();
    expect(isSemVer('01.0.0')).toBe(false);
    expect(compareSemVer('1.2.3', '1.10.0')).toBeLessThan(0);
    expect(compareSemVer('1.0.0', '1.0.0-rc')).toBeGreaterThan(0);
    expect(compareSemVer('2.0.0', '2.0.0')).toBe(0);
    expect(() => compareSemVer('x', '1.0.0')).toThrow(TypeError);
  });
});

describe('temps injecté', () => {
  it('valide les instants ISO et calcule des écarts purs', () => {
    expect(isISODateTime('2026-09-28T18:00:00Z')).toBe(true);
    expect(isISODateTime('2026-09-28T18:00:00')).toBe(false); // fuseau obligatoire
    expect(isISODateTime('2026-13-40T18:00:00Z')).toBe(false);
    expect(isISODate('2026-09-28')).toBe(true);
    const a = asISODateTime('2026-09-28T08:00:00Z');
    const b = asISODateTime('2026-09-30T08:00:00+02:00');
    expect(hoursBetween(a, b)).toBe(46);
  });
});

describe('énumérations', () => {
  it('readiness distingue unknown de normal', () => {
    expect(READINESS_CATEGORIES).toEqual(['unknown', 'normal', 'caution', 'reduce']);
    expect(ordinal(READINESS_CATEGORIES, 'unknown')).not.toBe(ordinal(READINESS_CATEGORIES, 'normal'));
  });
  it('pain et safety_pause ne sont pas des motifs de performance', () => {
    expect([...NON_PERFORMANCE_SKIP_REASONS].sort()).toEqual(['pain', 'safety_pause']);
  });
  it('statuts de programme et éligibilité conformes à V1.2', () => {
    expect(PROGRAM_STATUSES).toEqual(['active', 'paused_safety', 'suspended_scope']);
    expect(ELIGIBILITIES).toEqual(['eligible', 'declaration_required', 'suspended', 'excluded']);
    expect(isOneOf(PROGRAM_STATUSES, 'paused_safety')).toBe(true);
    expect(isOneOf(PROGRAM_STATUSES, 'paused')).toBe(false);
  });
  it('REST_RECOMMENDED n’est pas un code d’erreur ; NO_VALID_SOLUTION et OUT_OF_SCOPE en sont', () => {
    expect(ENGINE_ERROR_CODES).not.toContain('REST_RECOMMENDED');
    expect(ENGINE_ERROR_CODES).toContain('NO_VALID_SOLUTION');
    expect(ENGINE_ERROR_CODES).toContain('OUT_OF_SCOPE');
  });
});

describe('statut de validation', () => {
  const v = { level: 'hard' } as unknown as Violation;
  it('dérive VALID / VALID_WITH_WARNINGS / INVALID', () => {
    expect(statusFrom([], [])).toBe('VALID');
    expect(statusFrom([], [v])).toBe('VALID_WITH_WARNINGS');
    expect(statusFrom([v], [v])).toBe('INVALID');
  });
});

describe('EngineContext', () => {
  const valid = {
    now: '2026-09-28T08:00:00Z', timezone: 'Europe/Paris', seed: 'user-1:w1', engineVersion: '0.1.0',
    ruleset: { version: '0.1.0-provisional' }, catalog: { version: '0.1.0' },
  };
  it('accepte un contexte complet', () => {
    expect(checkEngineContext(valid)).toEqual([]);
  });
  it('refuse un contexte sans instant, sans graine ou avec des versions invalides', () => {
    const issues = checkEngineContext({ ...valid, now: 'hier', seed: ' ', engineVersion: '1', ruleset: { version: 'v1' } });
    expect(issues.map((i) => i.field).sort()).toEqual(['engineVersion', 'now', 'ruleset.version', 'seed']);
  });
});
