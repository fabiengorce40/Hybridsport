import { z } from 'zod';
import { DISCIPLINES } from './enums.js';
import { zId } from './ruleset.js';
import { isISODateTime } from './time.js';

/**
 * Anti-doublon (spec 07 §4) — contrats COMMUNS aux quatre moteurs de discipline.
 * Le CORE construit l'empreinte à partir de la séance et du catalogue (ce qu'un moteur ne peut pas
 * travestir : exercices, familles, patterns, muscles, structure) ; le moteur de discipline ne fournit
 * que ce que lui seul connaît (stimulus, systèmes énergétiques, format, marqueurs de prescription).
 * Aucun poids ni seuil ici : ils vivent dans le ruleset.
 */

const zInstant = z.string().refine(isISODateTime, 'instant ISO attendu');
const share = z.number().nonnegative();
const zVector = z.record(zId, z.number().nonnegative());

/** Les sept composantes de similarité (spec 07 §4). */
export const SIMILARITY_COMPONENTS = ['exercise', 'movement', 'muscle', 'structure', 'stimulus', 'energy', 'format'] as const;
export type SimilarityComponent = (typeof SIMILARITY_COMPONENTS)[number];

/**
 * Intention de répétition (spec 07 §4), DÉCLARÉE au moment de la planification, avant la génération.
 * Correspondance avec les besoins produit : ancre de progression = `progression_anchor` ; retest et
 * benchmark = `benchmark_retest` ; répétition délibérée = `progression_series`, `recurring_slot` ou
 * `deload_mirror`.
 */
export const zRepetitionIntent = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('progression_anchor'), trackId: zId }).strict(),
  z.object({ kind: z.literal('progression_series'), seriesId: zId, index: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('benchmark_retest'), benchmarkId: zId }).strict(),
  z.object({ kind: z.literal('recurring_slot'), slotKey: zId }).strict(),
  z.object({ kind: z.literal('deload_mirror'), ofSessionId: zId }).strict(),
]);
export type RepetitionIntent = z.infer<typeof zRepetitionIntent>;
export const REPETITION_INTENT_KINDS = ['progression_anchor', 'progression_series', 'benchmark_retest', 'recurring_slot', 'deload_mirror'] as const;

/**
 * Dimension d'empreinte à état EXPLICITE : `known` = la valeur (forme historique, inchangée pour Strength et
 * Running) ; `not_applicable` = déclaration explicite qu'aucune valeur n'existe pour cette séance. Une clé
 * ABSENTE reste une erreur de schéma : une omission n'est jamais lue comme `not_applicable`.
 * Comparaison (analysis.ts) : known ↔ known normale ; toute paire contenant `not_applicable` est non
 * comparable (null, exclue du dénominateur).
 */
export const zNotApplicable = z.object({ status: z.literal('not_applicable') }).strict();
export type NotApplicable = z.infer<typeof zNotApplicable>;
export const NOT_APPLICABLE: NotApplicable = { status: 'not_applicable' };
export const isNotApplicable = (v: unknown): v is NotApplicable =>
  v !== null && typeof v === 'object' && (v as { status?: unknown }).status === 'not_applicable';

const zEnergyShares = z.object({ low: share, moderate: share, high: share }).strict();
export type EnergyShares = z.infer<typeof zEnergyShares>;

/** Ce que le moteur de discipline fournit pour l'empreinte (données, jamais une conclusion). */
export const zFingerprintInputs = z.object({
  archetypeId: zId,
  /** Stimulus connu, ou `not_applicable` déclaré. */
  stimulus: z.union([zId, zNotApplicable]),
  /** Parts prévues des intensités (normalisées par le CORE), ou `not_applicable` déclaré. */
  energy: z.union([zEnergyShares, zNotApplicable]),
  format: zId.optional(),
  timeDomain: z.enum(['short', 'medium', 'long']).optional(),
  repScheme: z.string().min(1).optional(),
  /** Volume de chaque item dans l'unité de la discipline (séries difficiles, minutes…) : TOUS les items. */
  volumeByItem: zVector,
  /** Marqueurs de prescription (charge, reps, volume, densité…) servant à détecter la stagnation. */
  prescriptionMarkers: z.record(z.string().min(1), z.number()),
  /** Contexte d'exécution (profil de matériel, lieu) : informatif, jamais pénalisant. */
  contextKey: zId.optional(),
}).strict();
export type FingerprintInputs = z.infer<typeof zFingerprintInputs>;

/** Champs communs de l'empreinte (hors dimensions à état explicite). */
const fingerprintShape = {
  sessionId: zId,
  discipline: z.enum(DISCIPLINES),
  archetypeId: zId,
  exercises: z.array(zId),
  families: z.array(zId),
  equivalences: z.array(zId),
  patterns: zVector,
  muscles: zVector,
  structure: z.array(z.object({ kind: zId, format: zId, durationS: z.number().nonnegative() }).strict()),
  format: zId.optional(),
  timeDomain: z.enum(['short', 'medium', 'long']).optional(),
  repScheme: z.string().min(1).optional(),
  prescriptionMarkers: z.record(z.string().min(1), z.number()),
  contextKey: zId.optional(),
};

/**
 * Empreinte HISTORIQUE (session_record v2 à v4) : `stimulus` et `energy` toujours connus. Conservée pour que
 * les lecteurs de ces versions gardent leur sens exact.
 */
export const zSessionFingerprintV1 = z.object({ ...fingerprintShape, stimulus: zId, energy: zEnergyShares }).strict();

/** Empreinte COURANTE (session_record v5) : `stimulus` et `energy` connus ou `not_applicable`. */
export const zSessionFingerprint = z.object({ ...fingerprintShape, stimulus: z.union([zId, zNotApplicable]), energy: z.union([zEnergyShares, zNotApplicable]) }).strict();
export type SessionFingerprint = z.infer<typeof zSessionFingerprint>;

/** Séance de l'historique (réalisée ou prévue) avec les intentions sous lesquelles elle a été planifiée. */
export const zFingerprintHistoryEntry = z.object({
  fingerprint: zSessionFingerprint,
  at: zInstant,
  status: z.enum(['completed', 'planned']),
  repetitionIntents: z.array(zRepetitionIntent).default([]),
}).strict();
export type FingerprintHistoryEntry = z.infer<typeof zFingerprintHistoryEntry>;

export const DUPLICATE_CLASSIFICATIONS = ['none', 'planned', 'accidental_warn', 'accidental_strong'] as const;
export type DuplicateClassification = (typeof DUPLICATE_CLASSIFICATIONS)[number];
