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
 * session_record v2 (Phase 3.5) : ajout de l'empreinte (spec 07 §1, étape 11). Une donnée
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
/**
 * session_record v3 (Phase 4B) : même enveloppe que la v2 ; la séance accepte les champs
 * facultatifs de CORE-EXT-1 (séries typées, références d'item). La version change pour qu'un lecteur v2
 * refuse explicitement une donnée v3 au lieu d'en ignorer les nouveaux champs.
 */
export const zSessionRecordV3 = zSessionRecordV2;

/**
 * Estimation de durée de la séance enregistrée (CORE-EXT-R1, décision fondateur Q2) : STOCKÉE avec sa
 * provenance (méthode + versions de la provenance du record), recalculable et comparée à la vérification.
 * Une donnée migrée depuis la v3 n'a pas d'estimation stockée : elle est marquée UNAVAILABLE_LEGACY,
 * jamais reconstituée (même doctrine que l'empreinte en v2).
 */
export const DURATION_ESTIMATE_METHOD = 'core.duration_engine';
export const zRecordedDurationEstimate = z.discriminatedUnion('availability', [
  z.object({
    availability: z.literal('AVAILABLE'), method: z.literal(DURATION_ESTIMATE_METHOD), unit: z.literal('s'),
    p10: z.number().nonnegative(), p50: z.number().nonnegative(), p90: z.number().nonnegative(),
  }).strict().refine((e) => e.p10 <= e.p50 && e.p50 <= e.p90, 'p10 ≤ p50 ≤ p90'),
  z.object({ availability: z.literal('UNAVAILABLE_LEGACY') }).strict(),
]);
export type RecordedDurationEstimate = z.infer<typeof zRecordedDurationEstimate>;

/**
 * session_record v4 (Phase 6A, COURANTE) : la séance accepte la variante `run_structure` (CORE-EXT-R1)
 * et le record porte `durationEstimate`. La version change pour qu'un lecteur v3 refuse explicitement
 * une donnée v4 au lieu d'en ignorer la variante.
 */
export const zSessionRecordV4 = z.object({
  session: zSessionDraft,
  provenance: zProvenance,
  fingerprint: zSessionRecordV2.shape.fingerprint,
  durationEstimate: zRecordedDurationEstimate,
}).strict();
export type SessionRecord = z.infer<typeof zSessionRecordV4>;

/** Versions et schémas connus par un lecteur : { type → { version, schema } }. */
export type SchemaVersions = { readonly [K in SerializedKind]: { readonly version: number; readonly schema: z.ZodType } };

/** Version courante et schéma courant de chaque type de donnée sérialisée. */
export const CURRENT_SCHEMA: SchemaVersions = {
  // technical-constant: numéro de version du format sérialisé (contrat de schéma), pas une valeur sportive
  session_record: { version: 4, schema: zSessionRecordV4 },
};
