/**
 * Sérialisation JSON canonique (clés triées, nombres finis uniquement) : base des tests
 * de déterminisme « octet pour octet » et du rechargement des plans (spec 01 §6).
 */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export class CanonicalJsonError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`JSON canonique impossible en ${path} : ${reason}`);
    this.name = 'CanonicalJsonError';
  }
}

function normalize(value: unknown, path: string): Json {
  if (value === null) return null;
  switch (typeof value) {
    case 'boolean':
    case 'string':
      return value;
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalJsonError(path, `nombre non fini (${String(value)})`);
      return Object.is(value, -0) ? 0 : value;
    case 'object': {
      if (Array.isArray(value)) {
        return value.map((v, i) => {
          if (v === undefined) throw new CanonicalJsonError(`${path}[${i}]`, 'undefined dans un tableau');
          return normalize(v, `${path}[${i}]`);
        });
      }
      const proto = Object.getPrototypeOf(value) as unknown;
      if (proto !== Object.prototype && proto !== null) throw new CanonicalJsonError(path, 'objet non littéral');
      const out: { [key: string]: Json } = {};
      for (const key of Object.keys(value).sort()) {
        const v = (value as Record<string, unknown>)[key];
        if (v === undefined) continue; // propriété optionnelle absente
        out[key] = normalize(v, `${path}.${key}`);
      }
      return out;
    }
    default:
      throw new CanonicalJsonError(path, `type non sérialisable (${typeof value})`);
  }
}

/** Sérialise de façon canonique ; lève CanonicalJsonError sur une valeur non sérialisable. */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalize(value, '$'));
}

/** Recharge un JSON canonique. */
export function canonicalParse(text: string): Json {
  return normalize(JSON.parse(text) as unknown, '$');
}

/** Égalité structurelle par forme canonique. */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  return canonicalStringify(a) === canonicalStringify(b);
}
