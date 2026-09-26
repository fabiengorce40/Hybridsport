import type { DecisionCategory, EntityRef, EngineVersions, ReasonCode } from '@hybridsport/domain';
import { canonicalStringify } from '../core/canonical.js';
import { deriveSeed } from '../core/hash.js';

export interface TraceEntry {
  readonly seq: number;
  readonly step: string;          // étape du pipeline (ex. 'admissibility', 'score', 'duration', 'repair')
  readonly subject: EntityRef;
  readonly decision: string;      // identifiant court de la décision (ex. 'selected', 'rejected', 'kept')
  readonly reasons: readonly ReasonCode[];
  readonly rejected?: readonly { readonly candidate: string; readonly reasons: readonly ReasonCode[] }[];
}

/** Trace des décisions (spec 10 §1) : répond à « pourquoi ? » sans texte généré. */
export interface DecisionTrace {
  readonly traceId: string;
  readonly versions: EngineVersions;
  readonly seed: string;
  readonly entries: readonly TraceEntry[];
}

/** Constructeur append-only. La trace finale est figée et son identifiant dérive de son contenu. */
export class TraceBuilder {
  private readonly entries: TraceEntry[] = [];

  constructor(private readonly versions: EngineVersions, private readonly seed: string) {}

  add(entry: Omit<TraceEntry, 'seq'>): this {
    this.entries.push({ ...entry, seq: this.entries.length });
    return this;
  }

  build(): DecisionTrace {
    const body = { versions: this.versions, seed: this.seed, entries: this.entries };
    const traceId = `t${deriveSeed([canonicalStringify(body)]).slice(1)}`;
    return deepFreeze({ traceId, ...body, entries: [...this.entries] });
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

/** Entrées d'une trace qui concernent un sujet. */
export function entriesFor(trace: DecisionTrace, subject: EntityRef): TraceEntry[] {
  return trace.entries.filter((e) => e.subject.kind === subject.kind && e.subject.id === subject.id);
}

export interface Explanation {
  readonly subject: EntityRef;
  readonly decisions: readonly { readonly step: string; readonly decision: string }[];
  readonly byCategory: Readonly<Partial<Record<DecisionCategory, readonly ReasonCode[]>>>;
  readonly ruleRefs: readonly string[];
}

/** « Pourquoi le moteur a-t-il fait cela ? » — réponse structurée à partir des reason codes. */
export function explain(trace: DecisionTrace, subject: EntityRef): Explanation {
  const entries = entriesFor(trace, subject);
  const byCategory: Partial<Record<DecisionCategory, ReasonCode[]>> = {};
  const refs = new Set<string>();
  for (const e of entries) {
    for (const r of e.reasons) {
      (byCategory[r.category] ??= []).push(r);
      r.ruleRefs.forEach((x) => refs.add(x));
    }
  }
  return { subject, decisions: entries.map((e) => ({ step: e.step, decision: e.decision })), byCategory, ruleRefs: [...refs].sort() };
}
