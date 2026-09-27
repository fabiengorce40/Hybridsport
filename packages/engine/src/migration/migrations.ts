import { CURRENT_SCHEMA, zSerializedEnvelope, zSessionRecordV1 } from '@hybridsport/domain';
import type { ReasonCode, SchemaVersions, SerializedEnvelope, SerializedKind } from '@hybridsport/domain';
import { canonicalStringify } from '../core/canonical.js';
import { createCoreRegistry } from '../trace/index.js';

const reasons = createCoreRegistry();

/**
 * Étape de migration : UNE version vers la suivante, fonction pure. Une migration ne modifie jamais la
 * signification sportive d'une donnée : elle ne change que sa FORME. Changer une prescription, un
 * exercice ou une durée relève d'une nouvelle version du moteur ou du ruleset (régénération aux
 * frontières de semaine, spec 10 §2), jamais d'une migration.
 */
export interface MigrationStep {
  readonly kind: SerializedKind;
  readonly from: number;
  readonly to: number;
  readonly description: string;
  migrate(data: unknown): { readonly ok: true; readonly data: unknown } | { readonly ok: false; readonly problem: string };
}

/** Projection du contenu sportif d'une donnée, qui doit rester identique à travers toute migration. */
export const SPORT_MEANING: { readonly [K in SerializedKind]: (data: unknown) => unknown } = {
  session_record: (data) => (data !== null && typeof data === 'object' && 'session' in data ? data.session : undefined),
};

/** Registre des migrations (append-only). */
export const MIGRATIONS: readonly MigrationStep[] = [
  {
    // technical-constant: numéros de version du format sérialisé (contrat de schéma), pas des valeurs sportives
    kind: 'session_record', from: 1, to: 2,
    description: 'Ajout de l’empreinte anti-doublon ; absente des données v1 ⇒ marquée indisponible (jamais reconstituée).',
    migrate: (data) => {
      const v1 = zSessionRecordV1.safeParse(data);
      if (!v1.success) return { ok: false, problem: v1.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; ') };
      return { ok: true, data: { session: v1.data.session, provenance: v1.data.provenance, fingerprint: { status: 'unavailable', reason: 'migrated_from_v1' } } };
    },
  },
  {
    // technical-constant: numéros de version du format sérialisé (contrat de schéma), pas des valeurs sportives
    kind: 'session_record', from: 2, to: 3,
    description: 'CORE-EXT-1 : champs facultatifs de séries et d’items ; données v2 inchangées (identité).',
    migrate: (data) => ({ ok: true, data }),
  },
];

/** Vérifie qu'un registre est complet : pour chaque type, une étape n → n+1 pour chaque n de 1 à courante − 1. */
export function migrationRegistryIssues(registry: readonly MigrationStep[] = MIGRATIONS, current: SchemaVersions = CURRENT_SCHEMA): string[] {
  const out: string[] = [];
  for (const [kind, cur] of Object.entries(current) as [SerializedKind, { version: number }][]) {
    for (let v = 1; v < cur.version; v++) {
      const steps = registry.filter((s) => s.kind === kind && s.from === v);
      if (steps.length === 0) out.push(`${kind} : aucune migration ${String(v)} → ${String(v + 1)}`);
      if (steps.length > 1) out.push(`${kind} : plusieurs migrations depuis ${String(v)}`);
      for (const s of steps) if (s.to !== v + 1) out.push(`${kind} : migration ${String(s.from)} → ${String(s.to)} (un pas à la fois)`);
    }
    for (const s of registry.filter((x) => x.kind === kind && x.from >= cur.version)) out.push(`${kind} : migration depuis ${String(s.from)} ≥ version courante`);
  }
  return out;
}

export type MigrationResult<T> =
  | { readonly ok: true; readonly value: T; readonly fromVersion: number; readonly applied: readonly string[] }
  | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

/**
 * Lit une donnée sérialisée : enveloppe → migrations successives vers la version courante → validation
 * par le schéma courant. Refus explicite d'une version future inconnue. Pure, déterministe, n'altère
 * jamais l'entrée ; toute migration qui modifierait le contenu sportif est refusée.
 */
/** `current` : versions connues du lecteur (par défaut, celles de ce CORE) — permet d'éprouver un lecteur ancien. */
export function migrateToCurrent<T = unknown>(raw: unknown, registry: readonly MigrationStep[] = MIGRATIONS, known: SchemaVersions = CURRENT_SCHEMA): MigrationResult<T> {
  const env = zSerializedEnvelope.safeParse(raw);
  if (!env.success) return { ok: false, reasons: env.error.issues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `envelope.${i.path.join('.')}`, problem: i.message })) };
  const { kind, schemaVersion } = env.data;
  const current = known[kind];
  if (schemaVersion > current.version) {
    return { ok: false, reasons: [reasons.emit('TECHNICAL.SCHEMA_VERSION_UNSUPPORTED', { kind, version: schemaVersion, current: current.version })] };
  }
  const meaning = SPORT_MEANING[kind];
  let data: unknown = JSON.parse(canonicalStringify(env.data.data)) as unknown; // copie : l'entrée n'est jamais modifiée
  const applied: string[] = [];
  for (let v = schemaVersion; v < current.version; v++) {
    const step = registry.find((s) => s.kind === kind && s.from === v && s.to === v + 1);
    if (!step) return { ok: false, reasons: [reasons.emit('TECHNICAL.MIGRATION_FAILED', { kind, from: v, to: v + 1, problem: 'migration absente du registre' })] };
    const before = canonicalStringify(meaning(data));
    const out = step.migrate(data);
    if (!out.ok) return { ok: false, reasons: [reasons.emit('TECHNICAL.MIGRATION_FAILED', { kind, from: v, to: v + 1, problem: out.problem })] };
    if (canonicalStringify(meaning(out.data)) !== before) {
      return { ok: false, reasons: [reasons.emit('TECHNICAL.MIGRATION_FAILED', { kind, from: v, to: v + 1, problem: 'la migration modifie le contenu sportif' })] };
    }
    data = out.data;
    applied.push(`${kind}:${String(v)}→${String(v + 1)}`);
  }
  const parsed = current.schema.safeParse(data);
  if (!parsed.success) return { ok: false, reasons: parsed.error.issues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `${kind}.${i.path.join('.')}`, problem: i.message })) };
  return { ok: true, value: parsed.data as T, fromVersion: schemaVersion, applied };
}

/** Enveloppe une donnée à la version courante (écriture). */
export function toEnvelope(kind: SerializedKind, data: unknown): SerializedEnvelope {
  return { kind, schemaVersion: CURRENT_SCHEMA[kind].version, data };
}
