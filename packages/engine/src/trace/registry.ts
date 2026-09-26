import { DECISION_CATEGORIES, REASON_DOMAINS, isOneOf } from '@hybridsport/domain';
import type { DecisionCategory, ReasonCode, ReasonDomain, ReasonParamValue } from '@hybridsport/domain';

export type ReasonParamType = 'string' | 'number' | 'boolean' | 'string[]';

/** Définition d'un reason code : le code est un contrat versionné, jamais réutilisé avec un autre sens. */
export interface ReasonCodeDefinition {
  readonly code: string;
  readonly categories: readonly DecisionCategory[];
  readonly params: Readonly<Record<string, ReasonParamType>>;
  readonly audience: 'internal' | 'user';
  readonly severity: ReasonCode['severity'];
  /** Paramètres facultatifs (tous les autres sont obligatoires). */
  readonly optionalParams?: readonly string[];
}

const CODE_FORMAT = /^[A-Z]+(\.[A-Z0-9_]+){1,4}$/;

export function domainOf(code: string): ReasonDomain | undefined {
  const prefix = code.split('.')[0];
  return isOneOf(REASON_DOMAINS, prefix) ? prefix : undefined;
}

function typeMatches(value: ReasonParamValue, type: ReasonParamType): boolean {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'boolean': return typeof value === 'boolean';
    case 'string[]': return Array.isArray(value) && value.every((v) => typeof v === 'string');
  }
}

export class ReasonCodeRegistry {
  private readonly defs = new Map<string, ReasonCodeDefinition>();

  constructor(definitions: readonly ReasonCodeDefinition[]) {
    for (const d of definitions) this.register(d);
  }

  private register(d: ReasonCodeDefinition): void {
    if (!CODE_FORMAT.test(d.code)) throw new TypeError(`Format de reason code invalide : ${d.code}`);
    if (!domainOf(d.code)) throw new TypeError(`Domaine inconnu pour ${d.code}`);
    if (this.defs.has(d.code)) throw new TypeError(`Reason code dupliqué : ${d.code}`);
    if (d.categories.length === 0 || !d.categories.every((c) => isOneOf(DECISION_CATEGORIES, c))) {
      throw new TypeError(`Catégories invalides pour ${d.code}`);
    }
    this.defs.set(d.code, d);
  }

  has(code: string): boolean {
    return this.defs.has(code);
  }

  definition(code: string): ReasonCodeDefinition | undefined {
    return this.defs.get(code);
  }

  codes(): string[] {
    return [...this.defs.keys()].sort();
  }

  /**
   * Émet un reason code après contrôle du contrat (code enregistré, catégorie autorisée,
   * paramètres complets et typés). Une violation est une erreur de programmation.
   */
  emit(
    code: string,
    params: Readonly<Record<string, ReasonParamValue>> = {},
    options: { category?: DecisionCategory; ruleRefs?: readonly string[]; severity?: ReasonCode['severity'] } = {},
  ): ReasonCode {
    const def = this.defs.get(code);
    if (!def) throw new TypeError(`Reason code non enregistré : ${code}`);
    const category = options.category ?? def.categories[0];
    if (category === undefined || !def.categories.includes(category)) {
      throw new TypeError(`Catégorie « ${String(category)} » non autorisée pour ${code}`);
    }
    const optional = new Set(def.optionalParams ?? []);
    for (const [name, type] of Object.entries(def.params)) {
      const value = params[name];
      if (value === undefined) {
        if (!optional.has(name)) throw new TypeError(`Paramètre manquant « ${name} » pour ${code}`);
        continue;
      }
      if (!typeMatches(value, type)) throw new TypeError(`Paramètre « ${name} » de ${code} : ${type} attendu`);
    }
    for (const name of Object.keys(params)) {
      if (!(name in def.params)) throw new TypeError(`Paramètre inconnu « ${name} » pour ${code}`);
    }
    const domain = domainOf(code) as ReasonDomain;
    return {
      code, domain, category,
      params: { ...params },
      ruleRefs: [...(options.ruleRefs ?? [])].sort(),
      severity: options.severity ?? def.severity,
      audience: def.audience,
    };
  }
}
