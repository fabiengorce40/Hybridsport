import { zSessionDraft, zSportEngineProposal } from '@hybridsport/domain';
import type {
  Discipline, FingerprintHistoryEntry, ISODateTime, NoValidProposalInput, ReasonCode, SemVerString, SessionDraft, SessionIntent, SportEngineProposalInput,
} from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import { intentKey } from '../duplicate/analysis.js';
import type { CoreCandidate, CoreProfile, CoreState } from './core-types.js';
import type { SessionCheck } from '../validation/checks.js';

const reasons = createCoreRegistry();

/**
 * Contraintes DÉRIVÉES par le CORE et transmises au moteur (matériel, restrictions, zones et
 * mouvements restreints par la douleur, exclusions). Le moteur doit les respecter ; le validateur
 * les revérifie de toute façon.
 */
export interface SessionConstraints {
  readonly availableEquipment: readonly string[];
  readonly restrictions: readonly string[];
  readonly areaRestrictions: readonly { readonly area: string; readonly action: 'reduce' | 'exclude'; readonly painLevel: string }[];
  readonly restrictedMovements: readonly string[];
  readonly excludedExercises: readonly string[];
  readonly suspendHighIntensity: boolean;
}

/**
 * Entrée commune minimale des quatre moteurs de discipline, générique sur le contexte propre à la
 * discipline (CORE-EXT-2). Le CORE transporte `discipline` sans en connaître la sémantique : il n'y
 * arrive qu'après validation par le parseur du moteur.
 */
export interface SportEngineInput<TContext = unknown> {
  readonly intent: SessionIntent;
  readonly profile: CoreProfile;
  readonly state: CoreState;
  readonly constraints: SessionConstraints;
  readonly catalog: LoadedCatalog;
  readonly ruleset: LoadedRuleset;
  /** Empreintes de l'historique (réalisé + prévu) : pour la variété dès la sélection. */
  readonly history: readonly FingerprintHistoryEntry[];
  /** Contexte injecté : graine DÉDIÉE au moteur (dérivée de celle du CORE), instant, versions. */
  readonly context: { readonly seed: string; readonly now: ISODateTime; readonly engineVersion: SemVerString };
  /** Contexte propre à la discipline, VALIDÉ par `SportEngine.parseContext`. */
  readonly discipline: TContext;
}

/** Résultat de la validation du contexte de discipline par son moteur. */
export type ContextParse<TContext> = { readonly ok: true; readonly context: TContext } | { readonly ok: false; readonly reasons: readonly ReasonCode[] };

/**
 * Issue d'une proposition (CORE-EXT-3) : au moins une proposition, OU une absence de proposition
 * explicable. `no_valid_proposal` est une issue MÉTIER normale, jamais une exception.
 */
export type ProposeResult =
  | { readonly status: 'proposals'; readonly proposals: readonly SportEngineProposalInput[] }
  | NoValidProposalInput;

/**
 * Un moteur de discipline : il PROPOSE une ou plusieurs séances pour une intention donnée. Il ne
 * valide, ne répare, ne place, ne publie et ne persiste rien. Sa sortie est traitée comme une entrée
 * NON fiable : schéma strict, cohérence avec l'intention, puis pipeline CORE complet.
 */
export interface SportEngine<TContext = unknown> {
  readonly id: string;
  readonly version: SemVerString;
  readonly discipline: Discipline;
  /** Validation stricte du contexte de discipline (pure). Le CORE refuse l'entrée si elle échoue. */
  parseContext(raw: unknown): ContextParse<TContext>;
  /**
   * Contrôles propres à la discipline (fiches de règles dans le ruleset), EXÉCUTÉS PAR LE CORE dans
   * son validateur et sa réparation — jamais une auto-validation du moteur.
   */
  readonly checks?: readonly SessionCheck[];
  propose(input: SportEngineInput<TContext>): ProposeResult;
}

export type ProposalAcceptance =
  | { readonly ok: true; readonly candidate: CoreCandidate; readonly id: string }
  | { readonly ok: false; readonly id: string; readonly reasons: readonly ReasonCode[] };

export const structureProblem = (problem: string, target: string): ReasonCode => reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem, target });

/**
 * Accepte (ou refuse) une proposition brute. Refus TECHNICAL si le moteur s'écarte de l'intention
 * (discipline, archétype, stimulus, temps), invente une intention de répétition, déclare des versions
 * ou une graine qui ne sont pas celles du contexte, ou cite un paramètre inconnu du ruleset.
 * Ne juge PAS la qualité sportive : c'est le rôle du validateur et de la couche B.
 */
export function acceptProposal<TContext>(raw: unknown, index: number, input: SportEngineInput<TContext>, engine: Pick<SportEngine, 'id' | 'version'>): ProposalAcceptance {
  const parsed = zSportEngineProposal.safeParse(raw);
  const fallbackId = `proposal-${String(index)}`;
  if (!parsed.success) return { ok: false, id: fallbackId, reasons: parsed.error.issues.map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `proposal.${i.path.join('.')}`, problem: i.message })) };
  const p = parsed.data;
  const { intent, ruleset, catalog } = input;
  const out: ReasonCode[] = [];
  if (p.discipline !== intent.discipline) out.push(structureProblem('discipline différente de l’intention', p.proposalId));
  if (p.intentId !== intent.id) out.push(structureProblem('intention différente de celle transmise', p.proposalId));
  if (p.archetypeId !== intent.archetypeId) out.push(structureProblem('archétype différent de l’intention', p.proposalId));
  if (p.stimulus !== intent.stimulus) out.push(structureProblem('stimulus différent de l’intention', p.proposalId));
  if (p.objective !== intent.objective) out.push(structureProblem('objectif différent de l’intention', p.proposalId));
  const declared = new Set(intent.repetitionIntents.map(intentKey));
  for (const r of p.repetitionIntents) if (!declared.has(intentKey(r))) out.push(reasons.emit('DUPLICATE.INTENT_NOT_DECLARED', { intent: intentKey(r) }));
  const prov = p.provenance;
  if (prov.engineId !== engine.id || prov.engineVersion !== engine.version) out.push(structureProblem('provenance : moteur ou version inattendus', p.proposalId));
  if (prov.rulesetVersion !== ruleset.version) out.push(structureProblem('provenance : version du ruleset différente', p.proposalId));
  if (prov.catalogVersion !== catalog.version) out.push(structureProblem('provenance : version du catalogue différente', p.proposalId));
  if (prov.seed !== input.context.seed) out.push(structureProblem('provenance : graine différente de celle transmise', p.proposalId));
  for (const u of p.parametersUsed) {
    const meta = ruleset.parameter(u.id);
    if (!meta) out.push(reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'parameter', id: u.id }));
    else if (meta.version !== u.version) out.push(structureProblem(`paramètre cité en version ${u.version}, ruleset en ${meta.version}`, u.id));
  }
  const session = zSessionDraft.safeParse(p.session);
  if (session.success) {
    const s: SessionDraft = session.data;
    if (s.discipline !== intent.discipline) out.push(structureProblem('séance d’une autre discipline', s.id));
    if (s.availableTimeS !== intent.availableTimeS || s.targetDurationS !== intent.targetDurationS) out.push(structureProblem('temps disponible ou durée cible modifiés par le moteur', s.id));
    // CORE-EXT-1 : une ancre DÉCLARÉE doit l'être par l'intention (jamais inventée par le moteur).
    const anchors = new Set(intent.repetitionIntents.flatMap((r) => (r.kind === 'progression_anchor' ? [r.trackId] : [])));
    for (const it of s.blocks.flatMap((b) => b.items)) {
      if (it.refs?.anchor === 'declared' && !anchors.has(it.refs.progressionTrackId ?? '')) {
        out.push(reasons.emit('DUPLICATE.INTENT_NOT_DECLARED', { intent: `progression_anchor:${it.refs.progressionTrackId ?? ''}` }));
      }
    }
  }
  // Une séance illisible n'est pas refusée ici : le validateur la rejettera (TECHNICAL), tracée.
  if (out.length > 0) return { ok: false, id: p.proposalId, reasons: out };
  return { ok: true, id: p.proposalId, candidate: { session: p.session, optimization: p.optimization, fingerprintInputs: p.fingerprintInputs, ...(p.reasons.length > 0 ? { reasons: p.reasons as ReasonCode[] } : {}) } };
}

