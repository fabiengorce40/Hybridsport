/* technical-constants-file: constantes de l'algorithme xoshiro128** (aucune valeur sportive) */
import { fnv1a32, splitmix32 } from './hash.js';

/** État sérialisable du générateur (4 mots de 32 bits). */
export interface RngState {
  readonly algorithm: 'xoshiro128**';
  readonly seed: string;
  readonly words: readonly [number, number, number, number];
  readonly draws: number;
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Générateur pseudo-aléatoire à graine (spec 01 §6). Seule source de hasard autorisée
 * dans le moteur, et uniquement pour départager des candidats à égalité de score.
 * Toujours passé explicitement : aucun générateur global.
 */
export class SeededRng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;
  private drawCount: number;

  private constructor(readonly seed: string, words: readonly [number, number, number, number], draws: number) {
    [this.s0, this.s1, this.s2, this.s3] = words;
    this.drawCount = draws;
  }

  static fromSeed(seed: string): SeededRng {
    if (seed.length === 0) throw new TypeError('Graine vide');
    let x = fnv1a32(seed);
    const w0 = (x = splitmix32(x));
    const w1 = (x = splitmix32(x));
    const w2 = (x = splitmix32(x));
    const w3 = splitmix32(x);
    // L'état tout à zéro est interdit pour xoshiro.
    const words: [number, number, number, number] = (w0 | w1 | w2 | w3) === 0 ? [1, w1, w2, w3] : [w0, w1, w2, w3];
    return new SeededRng(seed, words, 0);
  }

  static fromState(state: RngState): SeededRng {
    if (state.algorithm !== 'xoshiro128**') throw new TypeError(`Algorithme inconnu : ${state.algorithm}`);
    return new SeededRng(state.seed, state.words, state.draws);
  }

  snapshot(): RngState {
    return { algorithm: 'xoshiro128**', seed: this.seed, words: [this.s0, this.s1, this.s2, this.s3], draws: this.drawCount };
  }

  /** Entier non signé 32 bits. */
  nextUint32(): number {
    const result = Math.imul(rotl(Math.imul(this.s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;
    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotl(this.s3, 11);
    this.drawCount++;
    return result;
  }

  /** Flottant dans [0, 1). */
  nextFloat(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Entier uniforme dans [0, maxExclusive), sans biais de modulo. */
  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new RangeError(`Borne invalide : ${maxExclusive}`);
    const limit = 4294967296 - (4294967296 % maxExclusive);
    let v = this.nextUint32();
    while (v >= limit) v = this.nextUint32();
    return v % maxExclusive;
  }

  /**
   * Sous-générateur indépendant et reproductible pour un usage nommé : l'ordre d'usage
   * d'un composant n'influence pas les tirages d'un autre.
   */
  fork(label: string): SeededRng {
    return SeededRng.fromSeed(`${this.seed}/${label}`);
  }
}

/**
 * Départage déterministe : trie les candidats par clé stable, puis tire un index.
 * À utiliser UNIQUEMENT entre candidats de score équivalent (spec 01 §6).
 */
export function tieBreak<T>(candidates: readonly T[], key: (c: T) => string, rng: SeededRng): T | undefined {
  if (candidates.length === 0) return undefined;
  const sorted = [...candidates].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  return sorted[rng.nextInt(sorted.length)];
}
