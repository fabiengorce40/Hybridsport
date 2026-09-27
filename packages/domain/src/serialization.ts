import { z } from 'zod';
import { zId, zSemVer } from './ruleset.js';
import { zSessionDraft } from './session.js';
import { zSessionFingerprint } from './duplicate.js';

/**
 * Données sérialisées versionnées (spec 10 §2 : « schemaVersion — migrations explicites et testées »).
 * Toute donnée persistée est enveloppée : { kind, schemaVersion, data }. Le CORE ne lit une donnée
 * qu'après migration vers la version COURANTE puis validation par le schéma courant.
 */
export const SERIALIZED_KINDS = ['session_record'] as const;
export type SerializedKind = (typeof SERIALIZED_KINDS)[number];

export const zSerializedEnvelope = z.object({
  kind: z.enum(SERIALIZED_KINDS),
  schemaVersion: z.number().int().positive(),
  data: z.unknown(),
}).strict();
export type SerializedEnvelope = z.infer<typeof zSerializedEnvelope>;

const zProvenance = z.object({ engineVersion: zSemVer, rulesetVersion: zSemVer, catalogVersion: zSemVer, seed: z.string().min(1), traceId: zId }).strict();

/** session_record v1 (Phase 3) : séance + provenance. */
export const zSessionRecordV1 = z.object({ session: z.unknown(), provenance: zProvenance }).strict();

/**
 * session_record v2 (Phase 3.5, COURANTE) : ajout de l'empreinte (spec 07 §1, étape 11). Une donnée
 * migrée depuis la v1 n'a pas d'empreinte : elle est marquée indisponible, jamais reconstituée.
 */
export const zSessionRecordV2 = z.object({
  session: zSessionDraft,
  provenance: zProvenance,
  fingerprint: z.discriminatedUnion('status', [
    z.object({ status: z.literal('available'), value: zSessionFingerprint }).strict(),
    z.object({ status: z.literal('unavailable'), reason: z.enum(['migrated_from_v1', 'duplicate_analysis_inactive']) }).strict(),
  ]),
}).strict();
export type SessionRecord = z.infer<typeof zSessionRecordV2>;

/** Version courante et schéma courant de chaque type de donnée sérialisée. */
export const CURRENT_SCHEMA: { readonly [K in SerializedKind]: { readonly version: number; readonly schema: z.ZodType } } = {
  // technical-constant: numéro de version du format sérialisé (contrat de schéma), pas une valeur sportive
  session_record: { version: 2, schema: zSessionRecordV2 },
};
