import { otherStrengthSports, strengthParametersFor, muscleLevel } from './strength-personalization.js';
/**
 * Adaptation après séance (rôle « ProgressionEngine » extérieur aux moteurs, comme dans le simulateur
 * longitudinal Strength) : uniquement des appels aux fonctions du moteur Strength (`classifyExposure`,
 * `updateTrack`, `createTrack`, `progressionModelFor`), avec les valeurs du ruleset. Aucune règle ajoutée.
 *
 * Running : la séance réalisée est ajoutée à l'historique déclaré ; l'ancre V19 du moteur en tient compte.
 */
import type { Exercise, FingerprintHistoryEntry, ISODateTime, ReasonCode, SessionDraft, SetPrescription } from '@hybridsport/domain';
import { anchorReviewDue, archetypeVariant, classifyExposure, closeTrack, closureCause, createTrack, declarableAnchors, exerciseStillAdmissible, durableReferenceRir, effortEstimate, exposureEvidence, floorReferenceRir, inheritPredecessorTrack, personalizedStrengthParams, progressionModelFor, readStrengthParams, referenceCell, reassessTrack, resumeTrack, strengthReasons, updateTrack, usesFloor, usesReassessment } from '@hybridsport/strength';
import type { ExecutedItem, LightenedPolicy, LightenedReading, PerformedSet, SlotRole, StrengthParams, StrengthTrack } from '@hybridsport/strength';
import { archetypeFromIntentId, isV1Archetype } from '@hybridsport/running';
import type { RealizedSession, RealizedStructure, RunningReference, RunningSessionArchetype } from '@hybridsport/running';
import type { AppState, GeneratedSession, SessionLog } from './model.js';
import { strengthContent, strengthContentFor } from './provisional-content.js';
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
}

/**
 * Reprise RC5 lot 4.4 (chantier E) — lecture des séances allégées (R4 et variantes) : OPTION DE SIMULATION, jamais
 * renseignée par le produit (environnement Beta 0 : absente ⇒ progression actuelle strictement inchangée).
 * - `floorWindow` : expositions consécutives de la track portant le même allègement pour qu'il soit lu comme plancher ;
 * - `reassessEvery` : R3, réévaluation tous les N expositions de la track (frontière de cycle) ;
 * - `safetyBelow` : variante `safety`, séances allégées consécutives en dessous avant baisse.
 */
export interface ProgressionReadingOption {
  /** Lecture des séances allégées ; absente : règle actuelle. */
  readonly policy?: LightenedPolicy; readonly floorWindow: number; readonly reassessEvery: number; readonly safetyBelow: number;
  /**
   * Lot 4.5 (chantier B, simulation) — estimation de capacité :
   * - `e1rmMaxRtf` : plage de validité CANDIDATE (répétitions jusqu'à l'échec) au lieu de celle du ruleset (sensibilité) ;
   * - `outOfRange: 'clamp'` : effort déclaré hors plage lu au PLAFOND de la plage (estimation conservatrice, jamais au-dessus) ;
   * - `suspendUnreliable` : réussite sans estimation exploitable (ni observée, ni borne) ⇒ décision SUSPENDUE, compteurs intacts.
   */
  readonly e1rmMaxRtf?: number; readonly outOfRange?: 'clamp' | 'bound'; readonly suspendUnreliable?: true;
  /**
   * Lot 4.6 (simulation) — stabilisation :
   * - `outOfRange: 'bound'` : effort déclaré hors plage lu comme BORNE INFÉRIEURE de l'e1RM (charge × (1 + plafond /
   *   diviseur)) : relève l'estimation qu'il contredit, ne la baisse jamais, jamais une estimation ponctuelle ;
   * - `hysteresis` : après une baisse, aucune hausse avant ce nombre d'expositions de la track (anti-oscillation) ;
   * - `deferLargeStep` : une hausse dont le saut relatif dépasse cette fraction est REPORTÉE une fois (preuve supplémentaire).
   */
  readonly hysteresis?: number; readonly deferLargeStep?: number;
  /** FAST TRACK V1 — identifiant de la politique versionnée (`PROGRESSION_POLICIES`), recopié dans la trace des décisions. */
  readonly policyId?: string;
}

/** Lot 4.5 (simulation) : paramètres d'estimation avec une plage de validité candidate (jamais ceux du ruleset actif). */
function estimationParams(params: StrengthParams, o: ProgressionReadingOption): StrengthParams {
  if (o.e1rmMaxRtf === undefined) return params;
  const l = params['strength.load'];
  return { ...params, 'strength.load': { ...l, validRepRange: { ...l.validRepRange, max: o.e1rmMaxRtf } } };
}
/** Lot 4.5 (simulation) : effort déclaré au-delà de la plage lu au plafond de la plage (estimation conservatrice). */
function clampToRange(sets: readonly PerformedSet[], params: StrengthParams): PerformedSet[] {
  const max = params['strength.load'].validRepRange.max;
  return sets.map((z) => (z.rir !== undefined && z.reps + z.rir > max && z.reps <= max ? { ...z, rir: max - z.reps } : z));
}

/** Lot 4.6 (simulation) : borne inférieure de l'e1RM des séries dont l'effort déclaré dépasse la plage de validité. */
function outOfRangeBound(sets: readonly PerformedSet[], params: StrengthParams): number | undefined {
  const l = params['strength.load'];
  const b = sets.flatMap((z) => (z.rir !== undefined && z.loadKg !== undefined && z.loadKg > 0 && z.reps + z.rir > l.validRepRange.max ? [z.loadKg * (1 + l.validRepRange.max / l.e1rmDivisor)] : []));
  return b.length > 0 ? Math.max(...b) : undefined;
}

type AuditEntry = { readonly reason: { readonly code: string; readonly params: Readonly<Record<string, unknown>> } };
type Update = { readonly track: StrengthTrack; readonly reasons: readonly ReasonCode[]; readonly rotate: boolean };
/**
 * Lot 4.6 (simulation) — stabilisation d'une HAUSSE décidée : hystérésis après une baisse récente, report d'un saut relatif
 * trop grand. La hausse devient un maintien tracé (`PROGRESSION.HELD`), compteurs de preuves conservés ; jamais de baisse.
 */
function stabilize(before: StrengthTrack, u: Update, o: ProgressionReadingOption, audit: readonly AuditEntry[], pending: readonly ReasonCode[]): Update {
  const prev = before.nextPrescription?.loadKg; const next = u.track.nextPrescription?.loadKg;
  if (prev === undefined || next === undefined || next <= prev) return u;
  const mine = [...audit.map((a) => a.reason), ...pending].filter((r) => r.params.trackId === before.trackId);
  const hold = (cause: string): Update => ({ track: { ...before, consecutiveSuccess: Math.max(before.consecutiveSuccess, u.track.consecutiveSuccess), ...(u.track.e1rmKg !== undefined ? { e1rmKg: u.track.e1rmKg } : {}), ...(u.track.evidence ? { evidence: u.track.evidence } : {}) }, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: before.trackId, cause })], rotate: false });
  if (o.hysteresis !== undefined) {
    let since = 0;
    for (let i = mine.length - 1; i >= 0; i--) {
      const r = mine[i];
      if (r?.code === 'PROGRESSION.REGRESSED') { if (since < o.hysteresis) return hold('hysteresis'); break; }
      if (r?.code === 'PROGRESSION.EXPOSURE_CLASSIFIED') since += 1;
    }
  }
  if (o.deferLargeStep !== undefined && (next - prev) / prev > o.deferLargeStep) {
    const last = [...mine].reverse().find((r) => r.code !== 'PROGRESSION.EXPOSURE_CLASSIFIED');
    if (!(last?.code === 'PROGRESSION.HELD' && last.params.cause === 'large_step_deferred')) return hold('large_step_deferred');
  }
  return u;
}

/** RIR prescrits (première série de travail) des expositions RÉALISÉES de la track, dans l'ordre chronologique. */
function prescribedRirHistory(state: AppState, trackId: string): number[] {
  const done = new Set((state.programmeState?.results ?? []).filter((r) => r.completion !== 'missed').map((r) => r.requestId));
  const rows: { date: string; rir: number }[] = [];
  for (const w of Object.values(state.planner.weeks)) for (const r of w.requests) {
    if (r.sport !== 'strength' || !done.has(r.requestId)) continue;
    const session = (r.record?.data as { session?: SessionDraft } | undefined)?.session;
    for (const it of session ? mainItems(session) : []) {
      if (it.refs?.progressionTrackId !== trackId || it.prescription.type !== 'sets') continue;
      const first = it.prescription.sets.find(isWork);
      const rir = first ? rirOf(first) : undefined;
      if (rir !== undefined) rows.push({ date: r.date ?? '', rir });
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1)).map((x) => x.rir);
}
const rirOf = (s: SetPrescription): number | undefined => {
  const i = s.intensity;
  return i && 'effort' in i && i.effort && 'rir' in i.effort ? i.effort.rir : s.rir;
};

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
export function applyStrengthExecutionTraced(state: AppState, x: StrengthExecution, at: ISODateTime, readingOption?: ProgressionReadingOption): StrengthExecutionOutcome {
  if (!state.profile) return { strength: state.strength, reasons: [] };
  const reasons: ReasonCode[] = [];
  const log = { sets: x.sets, painItems: x.painItems } as SessionLog;
  const week = Object.values(state.planner.weeks).find(w => w.requests.some(r => {
    const record = r.record?.data as { session?: { id?: string } } | undefined;
    return record?.session?.id === x.session.id;
  }));
  const request = week?.requests.find(r => (r.record?.data as { session?: { id?: string } } | undefined)?.session?.id === x.session.id);
  const snapshot = request?.strengthProfile ?? week?.strengthProfile;
  const p = snapshot ?? state.profile;
  const params = strengthParametersFor(p);
  const catalog = strengthContent().catalog;
  const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
  const archetypeId = x.archetypeId;
  // Lot 4.5 — RIR de RÉFÉRENCE de la prescription : profil FIGÉ avec la semaine (instantané `strengthProfile`) et contenu de
  // sa PROVENANCE (versions du ruleset et du catalogue de la séance), jamais le profil courant d'un profil personnalisé.
  // Instantané absent pour un profil personnalisé (données anciennes) ou contenu inconnu : référence `unknown`, jamais inventée.
  const prov = (request?.record?.data as { provenance?: { rulesetVersion?: string; catalogVersion?: string } } | undefined)?.provenance;
  const refContent = prov?.rulesetVersion !== undefined && prov.catalogVersion !== undefined ? strengthContentFor(prov.rulesetVersion, prov.catalogVersion) : undefined;
  const refSource = refContent === undefined || (snapshot === undefined && p.strength.personalization !== undefined) ? 'unknown' : snapshot !== undefined ? 'prescription_profile' : 'profile';
  const refParams = refSource !== 'unknown' && refContent ? personalizedStrengthParams(readStrengthParams(refContent.ruleset).values, p.strength.personalization, otherStrengthSports(p)) : undefined;
  const personalizationOf = p.strength.personalization ? { personalization: p.strength.personalization, otherSports: otherStrengthSports(p) } : {};
  const referenceRirOf = (e: Exercise, role: SlotRole): number | undefined => {
    if (!refParams) return undefined;
    const cell = referenceCell({ exercise: e, role, stimulus, ...personalizationOf }, refParams);
    return cell === undefined ? undefined : durableReferenceRir(cell.rir, refParams, muscleLevel(p), 'accumulation');
  };
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
    const exec: ExecutedItem = { exerciseId: e.id, prescribed, performed, sessionCompleted: x.sessionCompleted ?? true, ...(x.sessionStatus ? { sessionStatus: x.sessionStatus } : {}), ...(pain ? { skipReason: 'pain' as const } : {}), ...(it.refs?.substitutedFrom ? { substitutedFrom: it.refs.substitutedFrom } : {}) };
    const slot = slots.find((z) => z.id === it.refs?.slotId);
    const role: SlotRole = slot?.role ?? 'accessory';
    const trackId = it.refs?.progressionTrackId;
    const anchorOfSlot = [...tracks.values()].find((t) => t.tier === 'anchor' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === it.refs?.slotId);
    const known = trackId ? tracks.get(trackId) : undefined;
    const update = (t: StrengthTrack, cls: ReturnType<typeof classifyExposure>) => {
      // Lot 4.4 (simulation seulement) : lecture des séances allégées ; R3 tous les `reassessEvery` expositions.
      // Lot 4.5 : référence de la PRESCRIPTION (instantané + provenance) ; aucune lecture R4 sans référence établie.
      const ref = referenceRirOf(e, role);
      const current = prescribed[0] ? rirOf(prescribed[0]) : undefined;
      const history = readingOption?.policy && usesFloor(readingOption.policy) ? [...prescribedRirHistory(state, t.trackId), ...(current !== undefined ? [current] : [])] : [];
      const policy = readingOption?.policy;
      const reading: LightenedReading | undefined = readingOption && policy && ref !== undefined ? { policy, referenceRir: ref, safetyBelow: readingOption.safetyBelow, ...(usesFloor(policy) ? { floorRir: floorReferenceRir(history, ref, readingOption.floorWindow) } : {}) } : undefined;
      const simParams = readingOption ? estimationParams(params, readingOption) : params;
      const simExec = readingOption?.outOfRange === 'clamp' ? { ...exec, performed: clampToRange(exec.performed, simParams) } : exec;
      const est = effortEstimate(simExec.performed, simParams);
      const suspend = readingOption?.suspendUnreliable === true && t.model === 'autoregulated' && (cls === 'above' || cls === 'on_target') && est.observed === undefined && est.lowerBound === undefined;
      // Lot 4.6 (simulation) : borne inférieure de l'e1RM pour un effort déclaré hors plage.
      const bound = readingOption?.outOfRange === 'bound' && t.model === 'autoregulated' ? outOfRangeBound(exec.performed, simParams) : undefined;
      const tb = bound !== undefined && (t.e1rmKg === undefined || bound > t.e1rmKg) ? { ...t, e1rmKg: bound } : t;
      const u00 = suspend ? { track: t, reasons: [strengthReasons.emit('PROGRESSION.HELD', { trackId: t.trackId, cause: 'estimate_unreliable' })], rotate: false } : updateTrack(tb, simExec, cls, e, simParams, 'accumulation', undefined, reading);
      const u0 = readingOption ? stabilize(t, u00, readingOption, state.programmeState?.audit ?? [], reasons) : u00;
      const count = exposures.filter((z) => z.exerciseId === t.exerciseId && z.slotId === t.slotId && z.at >= t.openedAt).length + 1;
      const r3 = readingOption?.policy && usesReassessment(readingOption.policy) && count % readingOption.reassessEvery === 0 ? reassessTrack(u0.track, e, params) : undefined;
      const u = r3 ? { ...u0, track: { ...r3.track, ...(r3.track.nextPrescription?.loadKg !== undefined ? { cycleStartLoadKg: r3.track.nextPrescription.loadKg } : {}) }, reasons: [...u0.reasons, ...r3.reasons] } : u0;
      // S4 — preuve complète de l'exposition (prescrit / réalisé), indépendante de la décision du modèle.
      const ev = exposureEvidence(exec, cls);
      const signed = (v: number | null) => (v === null ? 'n/a' : v > 0 ? `+${String(v)}` : String(v));
      reasons.push(strengthReasons.emit('PROGRESSION.EXPOSURE_CLASSIFIED', {
        trackId: t.trackId, exerciseId: e.id, exposure: cls, success: ev.success, sets: `${String(ev.sets.performed)}/${String(ev.sets.prescribed)}`,
        repsDelta: signed(ev.repsDelta), loadDeltaKg: signed(ev.loadDeltaKg), rirDelta: signed(ev.rirDelta), rir: ev.rir,
        kind: ev.kind, effort: ev.effort,
        prescribedRir: current === undefined ? 'n/a' : String(current), referenceRir: ref === undefined ? 'n/a' : String(ref), referenceSource: ref === undefined ? 'unknown' : refSource,
        ...(readingOption?.policyId !== undefined ? { progressionPolicy: readingOption.policyId } : {}),
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
      const model = progressionModelFor(e, role, muscleLevel(p), performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
      const c = createTrack({ tier: 'anchor', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role, ...personalizationOf }, params);
      // Reprise RC5 lot 4 (D5) — suivi neuf de la rotation Haut A/B et Bas A/B : reprise FIABLE de la borne de cycle d'un
      // suivi existant du même exercice (Full Body, Haut, Bas, autre variante), sinon aucun transfert (cause tracée).
      const roleOf = (t: StrengthTrack) => params['strength.archetypes'].find((a) => a.id === t.archetypeId)?.slots.find((z) => z.id === t.slotId)?.role;
      const inherited = archetypeVariant(archetypeId) !== null ? inheritPredecessorTrack(c.track, role, [...tracks.values()], roleOf) : { track: c.track, reasons: [] };
      tracks.set(inherited.track.trackId, inherited.track);
      reasons.push(...c.reasons, ...inherited.reasons);
    } else if (role === 'accessory' && slot?.trackable && performed.length > 0 && !pain) {
      const k = `${archetypeId}/${slot.id}/${e.id}`;
      counts[k] = (counts[k] ?? 0) + 1;
      const hasTracked = [...tracks.values()].some((t) => t.tier === 'tracked' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === slot.id);
      if ((counts[k] ?? 0) >= params['strength.tracks'].tier2AutoCreateAfter && !hasTracked) {
        const model = progressionModelFor(e, role, muscleLevel(p), performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
        const c = createTrack({ tier: 'tracked', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role, ...personalizationOf }, params);
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
