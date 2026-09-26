/* technical-constants-file: constantes de l'algorithme de hachage FNV-1a / mixage (aucune valeur sportive) */

/** Hachage 32 bits FNV-1a d'une chaîne (stable, portable, sans dépendance). */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mixeur splitmix32 : diffuse un entier 32 bits (initialisation d'état PRNG). */
export function splitmix32(x: number): number {
  let z = (x + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * Dérive une graine stable à partir de composantes ordonnées
 * (ex. userId, programId, weekIndex, slotId, sel) — spec 01 §6.
 */
export function deriveSeed(parts: readonly (string | number)[]): string {
  const joined = parts.map((p) => String(p)).join('␟');
  return `s${fnv1a32(joined).toString(16).padStart(8, '0')}${fnv1a32(`${joined}#2`).toString(16).padStart(8, '0')}`;
}
