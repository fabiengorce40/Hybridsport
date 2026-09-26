import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SeededRng, tieBreak, deriveSeed, fnv1a32, canonicalStringify, canonicalParse, canonicalEquals, CanonicalJsonError,
} from '../../src/index.js';

// Séquence calculée par l’implémentation après validation du vecteur de test connu (lot 2).
const REFERENCE_SEQUENCE = [2336363545, 999176089, 1454512583, 3379313759];

function draws(rng: SeededRng, n: number): number[] {
  return Array.from({ length: n }, () => rng.nextUint32());
}

describe('SeededRng', () => {
  it('même graine ⇒ même séquence ; graine différente ⇒ séquence différente', () => {
    expect(draws(SeededRng.fromSeed('abc'), 20)).toEqual(draws(SeededRng.fromSeed('abc'), 20));
    expect(draws(SeededRng.fromSeed('abc'), 20)).not.toEqual(draws(SeededRng.fromSeed('abd'), 20));
  });

  it('vecteur de test connu de xoshiro128** (état [1, 2, 3, 4])', () => {
    // Valeurs de référence de l'algorithme publié (Blackman & Vigna), vérifiées à la main pour les 3 premières.
    const r = SeededRng.fromState({ algorithm: 'xoshiro128**', seed: 'kat', words: [1, 2, 3, 4], draws: 0 });
    expect(draws(r, 4)).toEqual([11520, 0, 5927040, 70819200]);
  });

  it('séquence de référence figée pour une graine (détecte toute modification de l’initialisation)', () => {
    expect(draws(SeededRng.fromSeed('hybridsport'), 4)).toEqual(REFERENCE_SEQUENCE);
  });

  it('état sérialisable : snapshot → JSON canonique → rechargement ⇒ suite identique', () => {
    const a = SeededRng.fromSeed('seed-1');
    draws(a, 7);
    const saved = canonicalStringify(a.snapshot());
    const b = SeededRng.fromState(JSON.parse(saved));
    expect(draws(b, 10)).toEqual(draws(a, 10));
    expect(b.snapshot().draws).toBe(17);
  });

  it('fork est indépendant de l’ordre d’usage du parent', () => {
    const p1 = SeededRng.fromSeed('p');
    const p2 = SeededRng.fromSeed('p');
    draws(p2, 50);
    expect(draws(p1.fork('selection'), 5)).toEqual(draws(p2.fork('selection'), 5));
    expect(draws(p1.fork('selection'), 5)).not.toEqual(draws(p1.fork('duration'), 5));
  });

  it('refuse une graine vide et des bornes invalides', () => {
    expect(() => SeededRng.fromSeed('')).toThrow(TypeError);
    const r = SeededRng.fromSeed('x');
    expect(() => r.nextInt(0)).toThrow(RangeError);
    expect(() => r.nextInt(1.5)).toThrow(RangeError);
  });

  it('tieBreak ne dépend pas de l’ordre d’entrée', () => {
    const items = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
    const reversed = [...items].reverse();
    expect(tieBreak(items, (x) => x.id, SeededRng.fromSeed('t'))).toEqual(tieBreak(reversed, (x) => x.id, SeededRng.fromSeed('t')));
    expect(tieBreak([], (x: { id: string }) => x.id, SeededRng.fromSeed('t'))).toBeUndefined();
  });
});

describe('hachage et dérivation de graine', () => {
  it('stables et sensibles à l’ordre', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(deriveSeed(['user-1', 'prog-1', 3])).toBe(deriveSeed(['user-1', 'prog-1', 3]));
    expect(deriveSeed(['user-1', 'prog-1', 3])).not.toBe(deriveSeed(['prog-1', 'user-1', 3]));
    expect(deriveSeed(['a', 'bc'])).not.toBe(deriveSeed(['ab', 'c']));
  });
});

describe('JSON canonique', () => {
  it('trie les clés, omet les undefined, normalise -0', () => {
    expect(canonicalStringify({ b: 1, a: { d: -0, c: undefined } })).toBe('{"a":{"d":0},"b":1}');
    expect(canonicalEquals({ x: 1, y: [1, 2] }, { y: [1, 2], x: 1 })).toBe(true);
  });
  it('refuse NaN, Infinity, undefined en tableau et objets non littéraux', () => {
    expect(() => canonicalStringify({ a: Number.NaN })).toThrow(CanonicalJsonError);
    expect(() => canonicalStringify([Infinity])).toThrow(CanonicalJsonError);
    expect(() => canonicalStringify([undefined])).toThrow(CanonicalJsonError);
    expect(() => canonicalStringify({ d: new Map() })).toThrow(CanonicalJsonError);
  });
  it('aller-retour stable', () => {
    const v = { z: [3, { k: 'v' }], a: true, n: null };
    expect(canonicalStringify(canonicalParse(canonicalStringify(v)))).toBe(canonicalStringify(v));
  });
});

describe('absence de source aléatoire ou d’horloge cachée à l’exécution', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Math.random interdit'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Date.now interdit'); });
  });
  afterEach(() => vi.restoreAllMocks());

  it('RNG, hachage et sérialisation n’utilisent ni Math.random ni Date.now', () => {
    const r = SeededRng.fromSeed(deriveSeed(['u', 1]));
    expect(() => { draws(r, 100); r.fork('x').nextFloat(); canonicalStringify(r.snapshot()); }).not.toThrow();
  });
});
