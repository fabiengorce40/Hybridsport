import { z } from 'zod';
import { DECISION_CATEGORIES, REASON_DOMAINS } from './reason.js';
import { DISCIPLINES, OPTIMIZATION_LEVELS } from './enums.js';
import { zId, zSemVer } from './ruleset.js';
import { zRepetitionIntent } from './duplicate.js';

/**
 * Contrat commun des quatre moteurs de discipline (spec 06, spec 07 §1) — frontière SportEngine / CORE.
 * Le moteur sportif PROPOSE ; le CORE contrôle, compare, ajuste dans les limites autorisées, valide,
 * répare et explique. Une proposition ne porte AUCUN champ de statut ou de validité : un moteur ne
 * peut pas s'auto-déclarer valide (schéma strict, champ inconnu refusé).
 */

/**
 * Intention de séance fixée AVANT la génération (spec 02 `SessionIntent`) par le planificateur.
 * Le moteur ne peut en modifier ni l'archétype, ni le stimulus, ni les intentions de répétition.
 */
export const zSessionIntent = z.object({
  id: zId,
  discipline: z.enum(DISCIPLINES),
  archetypeId: zId,
  stimulus: zId,
  /** Objectif affichable (clé de template). */
  objective: zId,
  priority: z.enum(['key', 'standard', 'optional']),
  /** Phase du programme (identifiant de données). */
  phase: zId,
  availableTimeS: z.number().positive(),
  targetDurationS: z.number().positive(),
  /** Répétitions prévues, déclarées ici et nulle part ailleurs. */
  repetitionIntents: z.array(zRepetitionIntent).default([]),
  /** Notes du planificateur (ex. 'avoid_high_lower_body'). */
  plannerNotes: z.array(zId).default([]),
}).strict();
export type SessionIntent = z.infer<typeof zSessionIntent>;
export type SessionIntentInput = z.input<typeof zSessionIntent>;

const zFinite = z.number().refine(Number.isFinite, 'nombre fini attendu');

/** Reason code tel que transmis par un moteur (vérifié à nouveau par le CORE). */
export const zProposalReason = z.object({
  code: z.string().regex(/^[A-Z]+(\.[A-Z0-9_]+){1,4}$/),
  domain: z.enum(REASON_DOMAINS),
  category: z.enum(DECISION_CATEGORIES),
  params: z.record(z.string(), z.union([z.string(), zFinite, z.boolean(), z.array(z.string())])),
  ruleRefs: z.array(z.string()),
  severity: z.enum(['info', 'notice', 'warning', 'error']),
  audience: z.enum(['internal', 'user']),
}).strict();

/** Proposition d'un moteur sportif. */
export const zSportEngineProposal = z.object({
  proposalId: zId,
  discipline: z.enum(DISCIPLINES),
  /** Intention servie (doit être celle transmise au moteur). */
  intentId: zId,
  archetypeId: zId,
  stimulus: zId,
  objective: zId,
  /** Structure et prescriptions : validées par le SessionValidator (entrée non typée ⇒ fail-closed). */
  session: z.unknown(),
  /** Vecteur de la couche B, du point de vue du moteur (le CORE y applique ses propres pénalités). */
  optimization: z.object(Object.fromEntries(OPTIMIZATION_LEVELS.map((l) => [l, zFinite])) as Record<(typeof OPTIMIZATION_LEVELS)[number], typeof zFinite>).strict(),
  /** Entrées d'empreinte (stimulus estimé, énergie, format, volumes, marqueurs) : validées par le CORE. */
  fingerprintInputs: z.unknown(),
  /** Intentions de répétition dont se réclame la proposition : sous-ensemble de celles de l'intention. */
  repetitionIntents: z.array(zRepetitionIntent).default([]),
  reasons: z.array(zProposalReason),
  provenance: z.object({ engineId: zId, engineVersion: zSemVer, rulesetVersion: zSemVer, catalogVersion: zSemVer, seed: z.string().min(1) }).strict(),
  /** Paramètres du ruleset réellement utilisés (identifiant et version) : traçabilité. */
  parametersUsed: z.array(z.object({ id: zId, version: zSemVer }).strict()),
}).strict();
export type SportEngineProposal = z.infer<typeof zSportEngineProposal>;
export type SportEngineProposalInput = z.input<typeof zSportEngineProposal>;

/**
 * Absence de proposition (CORE-EXT-3) : issue MÉTIER normale. Le moteur n'invente jamais une séance
 * pour satisfaire son contrat ; il dit pourquoi (au moins une raison), ce qui bloque et ce qui manque.
 */
export const zNoValidProposal = z.object({
  status: z.literal('no_valid_proposal'),
  reasons: z.array(zProposalReason).min(1),
  blockingNeeds: z.array(z.object({ slotId: zId, need: zId }).strict()).default([]),
  missingData: z.array(z.enum(['capacities', 'week_context', 'tracks', 'catalog_coverage'])).default([]),
  provenance: z.object({ engineId: zId, engineVersion: zSemVer, rulesetVersion: zSemVer, catalogVersion: zSemVer, seed: z.string().min(1) }).strict(),
}).strict();
export type NoValidProposal = z.infer<typeof zNoValidProposal>;
export type NoValidProposalInput = z.input<typeof zNoValidProposal>;
