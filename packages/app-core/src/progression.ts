/**
 * Adaptation après séance (rôle « ProgressionEngine » extérieur aux moteurs, comme dans le simulateur
 * longitudinal Strength) : uniquement des appels aux fonctions du moteur Strength (`classifyExposure`,
 * `updateTrack`, `createTrack`, `progressionModelFor`), avec les valeurs du ruleset. Aucune règle ajoutée.
 *
 * Running : la séance réalisée est ajoutée à l'historique déclaré ; l'ancre V19 du moteur en tient compte.
 */
import type { FingerprintHistoryEntry, ISODateTime, ReasonCode, SessionDraft, SetPrescription } from '@hybridsport/domain';
import { anchorReviewDue, classifyExposure, closeTrack, closureCause, createTrack, declarableAnchors, effortEstimate, exerciseStillAdmissible, exposureEvidence, progressionModelFor, progressionSlotKey, readStrengthParams, resumeTrack, strengthReasons, updateTrack } from '@hybridsport/strength';
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
  /** S5 — statut déclaré de la séance (preuve : séance modifiée / abandonnée). */
  readonly sessionStatus?: 'completed' | 'modified' | 'abandoned';
  /**
   * RC5.3 R4 — items de la séance EXÉCUTÉE dont la prescription a été modifiée au démarrage (adaptation), avec leur RIR
   * de RÉFÉRENCE (celui de la séance planifiée). Les items marqués par le moteur (`refs.doseModified`) sont lus
   * directement. Sans effet si le contenu ne déclare pas la politique des expositions modifiées.
   */
  readonly modifiedItems?: Readonly<Record<string, number>>;
}

/** RC5.3 R4 — séries de travail classées contre le RIR de référence (jamais contre le RIR relevé par un modificateur). */
function withReferenceRir(sets: readonly SetPrescription[], rir: number): SetPrescription[] {
  return sets.map((z) => {
    const i = z.intensity;
    const effort = i && 'effort' in i && i.effort && 'rir' in i.effort ? { intensity: { ...i, effort: { ...i.effort, rir } } } : {};
    return { ...z, ...(z.rir !== undefined ? { rir } : {}), ...effort } as SetPrescription;
  });
}

/** RIR visé de la première série de travail d'un item (RIR de l'effort, sinon RIR de la série). */
function itemRir(it: SessionDraft['blocks'][number]['items'][number]): number | undefined {
  if (it.prescription.type !== 'sets') return undefined;
  const w = it.prescription.sets.find(isWork);
  const e = w?.intensity && 'effort' in w.intensity ? w.intensity.effort : undefined;
  return e && 'rir' in e ? e.rir : w?.rir;
}

/**
 * RC5.3 R4 — items modifiés par une adaptation au démarrage : même exercice, séries de travail ou RIR différents de la
 * séance planifiée. RIR de référence = celui de l'item planifié (ou sa propre référence s'il était déjà modifié).
 * Un exercice remplacé ou retiré n'y figure pas (substitution : règle commune).
 */
export function adaptedItemsOf(planned: SessionDraft, executed: SessionDraft): Record<string, number> {
  const out: Record<string, number> = {};
  const work = (it: SessionDraft['blocks'][number]['items'][number]) => (it.prescription.type === 'sets' ? it.prescription.sets.filter(isWork).length : 0);
  const before = mainItems(planned);
  for (const it of mainItems(executed)) {
    const p = before.find((z) => z.id === it.id && z.exerciseId === it.exerciseId) ?? before.find((z) => z.exerciseId === it.exerciseId);
    const ref = p?.refs?.referenceRir ?? (p ? itemRir(p) : undefined);
    if (!p || ref === undefined) continue;
    if (work(p) !== work(it) || itemRir(p) !== itemRir(it)) out[it.id] = ref;
  }
  return out;
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
  const softModified = params['strength.progression.policy']?.modifiedExposure !== undefined;
  // RC5.3 R1.3 — tracks dont l'estimation vient d'être mise à jour par un effort OBSERVÉ dans cette séance.
  const observedNow = new Set<string>();

  for (const it of mainItems(x.session)) {
    if (it.prescription.type !== 'sets') continue;
    const e = catalog.exercise(it.exerciseId);
    if (!e) continue;
    const prescribed = it.prescription.sets.filter(isWork);
    const performed = performedSets(it.id, it.prescription.sets, log);
    const pain = x.sessionPain === true || log.painItems.includes(it.id);
    // RC5.3 R4 — prescription modifiée (moteur ou adaptation au démarrage) : classement contre le RIR de RÉFÉRENCE.
    const referenceRir = softModified ? (x.modifiedItems?.[it.id] ?? (it.refs?.doseModified === true ? it.refs.referenceRir : undefined)) : undefined;
    const modified = referenceRir !== undefined;
    const exec: ExecutedItem = { exerciseId: e.id, prescribed: modified ? withReferenceRir(prescribed, referenceRir) : prescribed, performed, sessionCompleted: x.sessionCompleted ?? true, ...(x.sessionStatus ? { sessionStatus: x.sessionStatus } : {}), ...(pain ? { skipReason: 'pain' as const } : {}), ...(it.refs?.substitutedFrom ? { substitutedFrom: it.refs.substitutedFrom } : {}) };
    const slot = slots.find((z) => z.id === it.refs?.slotId);
    const role: SlotRole = slot?.role ?? 'accessory';
    const trackId = it.refs?.progressionTrackId;
    const anchorOfSlot = [...tracks.values()].find((t) => t.tier === 'anchor' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === it.refs?.slotId);
    const known = trackId ? tracks.get(trackId) : undefined;
    const update = (t: StrengthTrack, cls: ReturnType<typeof classifyExposure>) => {
      const u = updateTrack(t, exec, cls, e, params, 'accumulation', undefined, { ...(modified ? { modified } : {}), level: p.level, at: now });
      // S4 — preuve complète de l'exposition (prescrit / réalisé), indépendante de la décision du modèle.
      const ev = exposureEvidence(exec, cls);
      const signed = (v: number | null) => (v === null ? 'n/a' : v > 0 ? `+${String(v)}` : String(v));
      reasons.push(strengthReasons.emit('PROGRESSION.EXPOSURE_CLASSIFIED', {
        trackId: t.trackId, exerciseId: e.id, exposure: cls, success: ev.success, sets: `${String(ev.sets.performed)}/${String(ev.sets.prescribed)}`,
        repsDelta: signed(ev.repsDelta), loadDeltaKg: signed(ev.loadDeltaKg), rirDelta: signed(ev.rirDelta), rir: ev.rir,
        kind: ev.kind, effort: ev.effort,
      }), ...u.reasons);
      tracks.set(t.trackId, u.track);
      if (effortEstimate(performed, params).observed !== undefined) observedNow.add(t.trackId);
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
      // RC5.3 R1 — progression partagée : compteur et track communs à la famille d'archétypes (même suffixe d'emplacement).
      const key = progressionSlotKey(params, archetypeId, slot.id);
      const k = `${key}/${e.id}`;
      counts[k] = (counts[k] ?? 0) + 1;
      const hasTracked = [...tracks.values()].some((t) => t.tier === 'tracked' && t.status !== 'closed' && progressionSlotKey(params, t.archetypeId, t.slotId) === key);
      if ((counts[k] ?? 0) >= params['strength.tracks'].tier2AutoCreateAfter && !hasTracked) {
        const model = progressionModelFor(e, role, p.level, performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
        const c = createTrack({ tier: 'tracked', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role }, params);
        tracks.set(c.track.trackId, c.track);
        reasons.push(...c.reasons);
      }
    }
    if (performed.length > 0) exposures.push({ exerciseId: e.id, at: now, ...(it.refs?.slotId ? { slotId: it.refs.slotId } : {}), sets: performed });
  }
  // RC5.3 R1.3 — historique PARTAGÉ : l'e1RM OBSERVÉ que cette séance vient de produire pour un exercice (estimation de sa
  // track autorégulée après l'exposition, effort saisi) est recopié sur les autres tracks autorégulées actives du même
  // exercice (lourd / volume, A / B). Jamais un maximum ; chaque track garde sa prescription (charge, reps, RIR).
  if (params['strength.progression.policy']?.sharedProgression === true) {
    for (const src of [...tracks.values()]) {
      if (!observedNow.has(src.trackId) || src.model !== 'autoregulated' || src.e1rmKg === undefined || src.evidence?.e1rmBasis !== 'observed') continue;
      for (const t of [...tracks.values()]) {
        if (t.trackId === src.trackId || t.exerciseId !== src.exerciseId || t.status !== 'active' || t.model !== 'autoregulated' || t.e1rmKg === src.e1rmKg) continue;
        tracks.set(t.trackId, { ...t, e1rmKg: src.e1rmKg, evidence: { ...(t.evidence ?? { exactStreak: 0, effortKnown: 0, effortUnknown: 0 }), e1rmBasis: 'observed' } });
        reasons.push(strengthReasons.emit('PROGRESSION.E1RM_SHARED', { fromTrackId: src.trackId, toTrackId: t.trackId, e1rmKg: src.e1rmKg }));
      }
    }
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
  const merged = mergedDuplicates(state, params);
  const tracks = state.strength.tracks.map((t00) => {
    const m = merged.get(t00.trackId);
    if (m) { reasons.push(...m.reasons); return m.track; }
    const t0 = t00;
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

/**
 * RC5.3 R1.4 — tracks d'accessoires suivis EN DOUBLE (créées avant la progression partagée : une par archétype A / B) de
 * même clé (famille, suffixe d'emplacement, exercice) : la plus récemment exposée est conservée, les autres closes
 * `merged` (historique lisible, aucune semaine planifiée réécrite). Sans la politique : aucune fusion.
 */
function mergedDuplicates(state: AppState, params: ReturnType<typeof readStrengthParams>['values']): Map<string, ReturnType<typeof closeTrack>> {
  const out = new Map<string, ReturnType<typeof closeTrack>>();
  if (params['strength.progression.policy']?.sharedProgression !== true) return out;
  const lastExposure = (t: StrengthTrack) => state.strength.exposures.filter((x) => x.exerciseId === t.exerciseId && x.slotId === t.slotId).reduce((m, x) => (x.at > m ? x.at : m), t.openedAt as string);
  const groups = new Map<string, StrengthTrack[]>();
  for (const t of state.strength.tracks) {
    if (t.status === 'closed' || t.tier !== 'tracked') continue;
    const k = `${progressionSlotKey(params, t.archetypeId, t.slotId)}/${t.exerciseId}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  for (const g of groups.values()) {
    if (g.length <= 1) continue;
    // Plus récente exposition, puis (égalité) identifiant le plus grand : choix déterministe.
    const keep = [...g].sort((a, b) => (lastExposure(a) === lastExposure(b) ? (a.trackId < b.trackId ? 1 : -1) : lastExposure(a) < lastExposure(b) ? 1 : -1))[0] as StrengthTrack;
    for (const t of g) if (t.trackId !== keep.trackId) out.set(t.trackId, closeTrack(t, 'merged'));
  }
  return out;
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
    running: run ? { ...state.running, realized: [...state.running.realized, run], references: [...state.running.references, ...(ref ? [ref] : [])] } : state.running,
    fingerprints: { ...state.fingerprints, [g.sport]: [...state.fingerprints[g.sport], ...entry] },
    safety: pain ? { ...state.safety, activePain: { reportedAt: at, areas: log.feedback?.painAreas ?? [], sessionKey: key } } : state.safety,
    revision: state.revision + 1,
  };
}

/** Déclarations d'ancres de l'intention : au plus une ancre active par groupe de choix, la moins récemment utilisée. */
export function anchorsToDeclare(state: AppState, archetypeId: string): StrengthTrack[] {
  return declarableAnchors(state.strength.tracks, state.strength.exposures, archetypeId, readStrengthParams(strengthContent().ruleset).values);
}
