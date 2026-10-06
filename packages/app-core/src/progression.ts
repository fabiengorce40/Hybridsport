/**
 * Adaptation après séance (rôle « ProgressionEngine » extérieur aux moteurs, comme dans le simulateur
 * longitudinal Strength) : uniquement des appels aux fonctions du moteur Strength (`classifyExposure`,
 * `updateTrack`, `createTrack`, `progressionModelFor`), avec les valeurs du ruleset. Aucune règle ajoutée.
 *
 * Running : la séance réalisée est ajoutée à l'historique déclaré ; l'ancre V19 du moteur en tient compte.
 */
import type { FingerprintHistoryEntry, ISODateTime, ReasonCode, SessionDraft, SetPrescription } from '@hybridsport/domain';
import { anchorReviewDue, classifyExposure, closeTrack, closureCause, createTrack, declarableAnchors, exerciseStillAdmissible, exposureEvidence, progressionModelFor, readStrengthParams, resumeTrack, strengthReasons, updateTrack } from '@hybridsport/strength';
import type { ExecutedItem, PerformedSet, SlotRole, StrengthTrack } from '@hybridsport/strength';
import { archetypeFromIntentId, isV1Archetype } from '@hybridsport/running';
import type { RealizedSession, RealizedStructure, RunningReference, RunningSessionArchetype } from '@hybridsport/running';
import type { AppState, GeneratedSession, SessionLog } from './model.js';
import { strengthContent } from './provisional-content.js';
import { STIMULUS_BY_GOAL } from './planner.js';

const isWork = (s: SetPrescription): boolean => s.kind !== 'rampup' && s.optional !== true;

/** Séries de travail réalisées d'un item : seules les séries cochées, avec ce que l'utilisateur a saisi. */
export function performedSets(itemId: string, prescribed: readonly SetPrescription[], log: SessionLog): PerformedSet[] {
  return prescribed.flatMap((s, i) => {
    if (!isWork(s)) return [];
    const l = log.sets.find((x) => x.itemId === itemId && x.setIndex === i && x.done);
    if (!l || l.reps === undefined) return [];
    return [{ reps: l.reps, ...(l.loadKg !== undefined && l.loadKg > 0 ? { loadKg: l.loadKg } : {}), ...(l.rir !== undefined ? { rir: l.rir } : {}) }];
  });
}

const mainItems = (s: SessionDraft) => s.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);

function applyStrength(state: AppState, g: GeneratedSession, log: SessionLog, at: ISODateTime): AppState['strength'] {
  if (g.outcome.status !== 'ok') return state.strength;
  return applyStrengthExecution(state, { archetypeId: g.archetypeId, session: g.outcome.session, sets: log.sets, painItems: log.painItems }, at);
}

/** Réalisation Strength : séance générée + séries RÉELLEMENT saisies (jamais déduites de la prescription). */
export interface StrengthExecution {
  readonly archetypeId: string;
  readonly session: SessionDraft;
  readonly sets: SessionLog['sets'];
  readonly painItems: SessionLog['painItems'];
  /**
   * S3 — séance menée à son terme (défaut : oui, chemin V0 inchangé). Abandonnée ⇒ `false` : une série manquante n'est
   * alors jamais lue comme un échec (classe `interrupted` / `partial` du moteur), seulement comme une interruption.
   */
  readonly sessionCompleted?: boolean;
  /**
   * S3 — douleur déclarée pour la SÉANCE sans localisation par exercice : chaque exercice est classé `pain` (suspension
   * de sa track, jamais une progression ni une régression lues sur une exécution douloureuse).
   */
  readonly sessionPain?: boolean;
}

/** Réalisation appliquée et décisions de progression du moteur Strength qui l'ont produite (trace d'audit). */
export interface StrengthExecutionOutcome {
  readonly strength: AppState['strength'];
  readonly reasons: readonly ReasonCode[];
}

/**
 * Applique une réalisation Strength à l'historique (tracks, expositions, compteurs) par les SEULES fonctions du moteur
 * Strength (classifyExposure, updateTrack, createTrack) : chemin V0 inchangé, entrée factorisée pour le programme.
 */
export function applyStrengthExecution(state: AppState, x: StrengthExecution, at: ISODateTime): AppState['strength'] {
  return applyStrengthExecutionTraced(state, x, at).strength;
}

/** Même application, avec les raisons du moteur (classement de l'exposition, mise à jour / création de track). */
export function applyStrengthExecutionTraced(state: AppState, x: StrengthExecution, at: ISODateTime): StrengthExecutionOutcome {
  if (!state.profile) return { strength: state.strength, reasons: [] };
  const reasons: ReasonCode[] = [];
  const log = { sets: x.sets, painItems: x.painItems } as SessionLog;
  const p = state.profile;
  const params = readStrengthParams(strengthContent().ruleset).values;
  const catalog = strengthContent().catalog;
  const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
  const archetypeId = x.archetypeId;
  const slots = params['strength.archetypes'].find((a) => a.id === archetypeId)?.slots ?? [];
  const tracks = new Map(state.strength.tracks.map((t) => [t.trackId, t]));
  const exposures = [...state.strength.exposures];
  const counts = { ...state.strength.accessoryCounts };
  const now = at;

  for (const it of mainItems(x.session)) {
    if (it.prescription.type !== 'sets') continue;
    const e = catalog.exercise(it.exerciseId);
    if (!e) continue;
    const prescribed = it.prescription.sets.filter(isWork);
    const performed = performedSets(it.id, it.prescription.sets, log);
    const pain = x.sessionPain === true || log.painItems.includes(it.id);
    const exec: ExecutedItem = { exerciseId: e.id, prescribed, performed, sessionCompleted: x.sessionCompleted ?? true, ...(pain ? { skipReason: 'pain' as const } : {}), ...(it.refs?.substitutedFrom ? { substitutedFrom: it.refs.substitutedFrom } : {}) };
    const slot = slots.find((z) => z.id === it.refs?.slotId);
    const role: SlotRole = slot?.role ?? 'accessory';
    const trackId = it.refs?.progressionTrackId;
    const anchorOfSlot = [...tracks.values()].find((t) => t.tier === 'anchor' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === it.refs?.slotId);
    const known = trackId ? tracks.get(trackId) : undefined;
    const update = (t: StrengthTrack, cls: ReturnType<typeof classifyExposure>) => {
      const u = updateTrack(t, exec, cls, e, params, 'accumulation');
      // S4 — preuve complète de l'exposition (prescrit / réalisé), indépendante de la décision du modèle.
      const ev = exposureEvidence(exec, cls);
      const signed = (v: number | null) => (v === null ? 'n/a' : v > 0 ? `+${String(v)}` : String(v));
      reasons.push(strengthReasons.emit('PROGRESSION.EXPOSURE_CLASSIFIED', {
        trackId: t.trackId, exerciseId: e.id, exposure: cls, success: ev.success, sets: `${String(ev.sets.performed)}/${String(ev.sets.prescribed)}`,
        repsDelta: signed(ev.repsDelta), loadDeltaKg: signed(ev.loadDeltaKg), rirDelta: signed(ev.rirDelta), rir: ev.rir,
      }), ...u.reasons);
      tracks.set(t.trackId, u.track);
    };
    if (known) {
      update(known, classifyExposure(exec, params));
    } else if (it.refs?.anchor === 'candidate' && anchorOfSlot?.status === 'active' && anchorOfSlot.exerciseId === e.id) {
      update(anchorOfSlot, classifyExposure(exec, params));
    } else if (it.refs?.substitutedFrom && anchorOfSlot) {
      update(anchorOfSlot, 'substituted');
    } else if (it.refs?.anchor === 'candidate' && !anchorOfSlot && performed.length > 0 && slot && !pain) {
      const model = progressionModelFor(e, role, p.level, performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
      const c = createTrack({ tier: 'anchor', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role }, params);
      tracks.set(c.track.trackId, c.track);
      reasons.push(...c.reasons);
    } else if (role === 'accessory' && slot?.trackable && performed.length > 0 && !pain) {
      const k = `${archetypeId}/${slot.id}/${e.id}`;
      counts[k] = (counts[k] ?? 0) + 1;
      const hasTracked = [...tracks.values()].some((t) => t.tier === 'tracked' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === slot.id);
      if ((counts[k] ?? 0) >= params['strength.tracks'].tier2AutoCreateAfter && !hasTracked) {
        const model = progressionModelFor(e, role, p.level, performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
        const c = createTrack({ tier: 'tracked', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role }, params);
        tracks.set(c.track.trackId, c.track);
        reasons.push(...c.reasons);
      }
    }
    if (performed.length > 0) exposures.push({ exerciseId: e.id, at: now, ...(it.refs?.slotId ? { slotId: it.refs.slotId } : {}), sets: performed });
  }
  return { strength: { tracks: [...tracks.values()].sort((a, b) => (a.trackId < b.trackId ? -1 : 1)), exposures, accessoryCounts: counts }, reasons };
}

/**
 * S3 — FRONTIÈRE DE SEMAINE du ProgressionEngine (avant de planifier une nouvelle semaine, hors pause douleur) : seules
 * les fonctions du moteur Strength, avec les valeurs du ruleset, sur des causes TRAÇABLES :
 * - reprise d'une track suspendue (`resumeTrack`) quand aucune douleur n'est active ;
 * - clôture (`closureCause`) : exercice devenu inadmissible (matériel, exclusion), stagnation (le compteur de maintiens
 *   du moteur a atteint son seuil `strength.progression.stagnationHolds`), horizon selon la politique du ruleset ;
 *   fin de mésocycle : JAMAIS (périodisation non gouvernée, `mesocycleEnded: false`) ;
 * - revue d'ancre due (`anchorReviewDue`) : signalée, sans changement.
 * Aucune rotation planifiée, aucune décharge, aucune nouvelle valeur.
 */
export function strengthWeekBoundary(state: AppState, at: ISODateTime, o: { readonly painCleared: boolean }): StrengthExecutionOutcome {
  const p = state.profile;
  if (!p) return { strength: state.strength, reasons: [] };
  const params = readStrengthParams(strengthContent().ruleset).values;
  const catalog = strengthContent().catalog;
  const reasons: ReasonCode[] = [];
  const tracks = state.strength.tracks.map((t0) => {
    if (t0.status === 'closed') return t0;
    const r = resumeTrack(t0, o.painCleared);
    reasons.push(...r.reasons);
    const t = r.track;
    const inadmissible = !exerciseStillAdmissible(t.exerciseId, catalog, p.equipment.items, p.excludedExercises);
    const stagnant = t.consecutiveHolds >= params['strength.progression'].stagnationHolds;
    const cause = closureCause(t, { now: at, mesocycleEnded: false, stagnant, inadmissible, level: p.level }, params);
    if (cause) { const c = closeTrack(t, cause); reasons.push(...c.reasons); return c.track; }
    // Revue d'ancre : signalée UNE fois par track (S4 — le même signal n'est pas recopié chaque semaine).
    const signalled = (state.programmeState?.audit ?? []).some((a) => a.reason.code === 'PROGRESSION.REVIEW_DUE' && a.reason.params.trackId === t.trackId);
    if (t.tier === 'anchor' && !signalled) reasons.push(...anchorReviewDue(t, { now: at, level: p.level }, params).reasons);
    return t;
  });
  return { strength: { ...state.strength, tracks }, reasons };
}

/** Structure PRESCRITE d'une séance de course (réalisée « comme prévu ») : lecture de la structure CORE, rien de calculé. */
export function prescribedRunStructure(session: SessionDraft): { family: 'CONTINUOUS' | 'INTERVALS'; structure?: RealizedStructure } {
  const p = session.blocks.flatMap((b) => b.items).map((i) => i.prescription).find((x) => x.type === 'run_structure');
  if (p?.type !== 'run_structure') return { family: 'CONTINUOUS' };
  const dur = (d: { durationS: number } | { distanceM: number }): number | undefined => ('durationS' in d ? d.durationS : undefined);
  const warm = p.segments.find((x) => x.kind === 'warmup');
  const cool = p.segments.find((x) => x.kind === 'cooldown');
  const rep = p.segments.find((x) => x.kind === 'repeat');
  const steady = p.segments.filter((x) => x.kind === 'steady');
  const warmupS = warm ? dur(warm.dose) : undefined;
  const cooldownS = cool ? dur(cool.dose) : undefined;
  const edges = { ...(warmupS !== undefined ? { warmupS } : {}), ...(cooldownS !== undefined ? { cooldownS } : {}) };
  if (rep && rep.sets === 1) {
    const workS = dur(rep.work);
    const recoveryS = dur(rep.recovery.dose);
    if (workS === undefined || recoveryS === undefined) return { family: 'INTERVALS' };
    return { family: rep.reps > 1 ? 'INTERVALS' : 'CONTINUOUS', structure: { ...edges, reps: rep.reps, workS, ...(rep.reps > 1 ? { recoveryS, recoveryMode: rep.recovery.mode } : {}) } };
  }
  // Course continue simple (EASY, LONG) : aucune structure de qualité ; seuil continu : échauffement + bloc + retour au calme.
  const only = steady.length === 1 ? steady[0] : undefined;
  const workS = only ? dur(only.dose) : undefined;
  if (only === undefined || workS === undefined || (warm === undefined && cool === undefined)) return { family: 'CONTINUOUS' };
  return { family: 'CONTINUOUS', structure: { ...edges, reps: 1, workS } };
}

/** Entrée commune (chemin V0 ou programme) d'une course réalisée déclarée. */
export interface RunRealization {
  readonly sessionId: string;
  readonly archetypeId: string;
  readonly session: SessionDraft;
  readonly run: NonNullable<SessionLog['run']>;
  readonly difficulty?: NonNullable<SessionLog['feedback']>['difficulty'];
  readonly pain: boolean;
  readonly at: ISODateTime;
}

/** Séance réalisée au contrat Running (structure prescrite conservée seulement si complète ; TEST sans distance). */
export function realizedRunFrom(x: RunRealization): RealizedSession {
  const archetype = archetypeFromIntentId(x.archetypeId);
  const a: RunningSessionArchetype = archetype !== undefined && isV1Archetype(archetype) ? archetype : 'EASY';
  const { family, structure } = prescribedRunStructure(x.session);
  // Structure réalisée = structure prescrite, seulement si la séance est COMPLÈTE (déclarée « comme prévu ») ;
  // interrompue : aucune structure (retour négatif, V19 l'exclut de toute façon).
  const keepStructure = x.run.completion === 'COMPLETED' && structure !== undefined && a !== 'EASY' && a !== 'LONG' && a !== 'TEST';
  // TEST : la durée totale inclut échauffement et retour au calme ⇒ aucune distance (l'allure serait fausse) ;
  // la performance est enregistrée comme référence TIME_TRIAL.
  const distanceM = a === 'TEST' ? undefined : x.run.distanceM;
  return {
    sessionId: x.sessionId, archetype: a, structureFamily: family, completedAt: x.at, realizedDurationS: x.run.realizedDurationS, completion: x.run.completion,
    ...(x.run.completion === 'SKIPPED' ? { skipReason: 'OTHER' as const } : {}),
    unexpectedDifficulty: x.difficulty ?? 'UNKNOWN', intoleranceOrPainSignal: x.pain, readinessOrToleranceDegraded: false,
    ...(keepStructure ? { structure } : {}),
    ...(distanceM !== undefined ? { distanceM } : {}),
  };
}

/** TEST complet et chronométré ⇒ référence TIME_TRIAL (APP_RECORDED, protocole KAIRO) à la distance du protocole. */
export function testReferenceFrom(x: RunRealization): RunningReference | undefined {
  if (archetypeFromIntentId(x.archetypeId) !== 'TEST' || x.run.completion !== 'COMPLETED' || x.run.testTimeS === undefined || x.pain) return undefined;
  const p = x.session.blocks.flatMap((b) => b.items).map((i) => i.prescription).find((y) => y.type === 'run_structure');
  const seg = p?.type === 'run_structure' ? p.segments.find((y) => y.kind === 'steady') : undefined;
  const distanceM = seg?.kind === 'steady' && 'distanceM' in seg.dose ? seg.dose.distanceM : undefined;
  if (distanceM === undefined) return undefined;
  return {
    referenceId: `test:${x.sessionId}`, type: 'TIME_TRIAL', values: { distanceM, durationS: x.run.testTimeS }, date: x.at,
    provenance: { source: 'APP_RECORDED', protocol: 'KAIRO_TEST_TT' },
    confidenceInputs: { protocolDeclared: true, maximalEffortDeclared: true, conditions: 'NORMAL', interruptionSince: 'NONE' },
  };
}

const v0Run = (g: GeneratedSession, log: SessionLog, at: ISODateTime): RunRealization | undefined => (log.run && g.outcome.status === 'ok'
  ? { sessionId: g.key, archetypeId: g.archetypeId, session: g.outcome.session, run: log.run, ...(log.feedback ? { difficulty: log.feedback.difficulty } : {}), pain: log.feedback?.pain ?? false, at }
  : undefined);
function realizedRun(g: GeneratedSession, log: SessionLog, at: ISODateTime): RealizedSession | undefined {
  const x = v0Run(g, log, at);
  return x ? realizedRunFrom(x) : undefined;
}
function testReference(g: GeneratedSession, log: SessionLog, at: ISODateTime): RunningReference | undefined {
  const x = v0Run(g, log, at);
  // V0 : la douleur du TEST se lit dans le feedback (identique à la forme historique).
  return x ? testReferenceFrom(x) : undefined;
}

/** Applique une séance TERMINÉE à l'historique (tracks, expositions, empreintes, historique de course). */
export function applyCompletion(state: AppState, key: string, at: ISODateTime): AppState {
  const g = state.sessions[key];
  const log = state.logs[key];
  if (!g || !log || g.outcome.status !== 'ok') return state;
  const fp = g.outcome.fingerprint as FingerprintHistoryEntry['fingerprint'] | undefined;
  const entry: FingerprintHistoryEntry[] = fp ? [{ fingerprint: fp, at, status: 'completed', repetitionIntents: [] }] : [];
  const run = g.sport === 'running' ? realizedRun(g, log, at) : undefined;
  const ref = g.sport === 'running' ? testReference(g, log, at) : undefined;
  const pain = log.feedback?.pain === true || log.painItems.length > 0;
  return {
    ...state,
    strength: g.sport === 'strength' ? applyStrength(state, g, log, at) : state.strength,
    running: run ? { realized: [...state.running.realized, run], references: [...state.running.references, ...(ref ? [ref] : [])] } : state.running,
    fingerprints: { ...state.fingerprints, [g.sport]: [...state.fingerprints[g.sport], ...entry] },
    safety: pain ? { activePain: { reportedAt: at, areas: log.feedback?.painAreas ?? [], sessionKey: key } } : state.safety,
    revision: state.revision + 1,
  };
}

/** Déclarations d'ancres de l'intention : au plus une ancre active par groupe de choix, la moins récemment utilisée. */
export function anchorsToDeclare(state: AppState, archetypeId: string): StrengthTrack[] {
  return declarableAnchors(state.strength.tracks, state.strength.exposures, archetypeId, readStrengthParams(strengthContent().ruleset).values);
}
