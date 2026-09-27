import { LEVELS } from '@hybridsport/domain';
import type { Level } from '@hybridsport/domain';

/** Comparaison lexicographique de vecteurs ordinaux (plus grand = meilleur). */
export function compareLex(a: readonly number[], b: readonly number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const levelIndex = (l: Level): number => LEVELS.indexOf(l);
export const byId = <T extends { readonly id: string }>(a: T, b: T): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Jours écoulés entre deux instants ISO (b − a). */
export function daysBetween(a: string, b: string): number {
  // technical-constant: millisecondes par jour (conversion d'unités)
  const MS_PER_DAY = 86_400_000;
  return (Date.parse(b) - Date.parse(a)) / MS_PER_DAY;
}

/** Arrondi vers le bas au pas réalisable (jamais une charge plus lourde que la cible). */
export function roundDownToStep(kg: number, step: number): number {
  const r = Math.floor(kg / step + Number.EPSILON) * step;
  // Évite les résidus binaires (ex. 2,5 × 3 = 7,499999…) : précision de l'arrondi = celle du pas.
  const decimals = (step.toString().split('.')[1] ?? '').length;
  return Number(r.toFixed(decimals));
}

export const median = (xs: readonly number[]): number | undefined => {
  if (xs.length === 0) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  // technical-constant: médiane d'un effectif pair = moyenne des deux valeurs centrales
  return s.length % 2 === 1 ? s[mid] : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};
