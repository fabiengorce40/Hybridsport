/**
 * Adaptation après séance (rôle « ProgressionEngine » extérieur aux moteurs, comme dans le simulateur
 * longitudinal Strength) : uniquement des appels aux fonctions du moteur Strength (`classifyExposure`,
 * `updateTrack`, `createTrack`, `progressionModelFor`), avec les valeurs du ruleset. Aucune règle ajoutée.
 *
 * Running : la séance réalisée est ajoutée à l'historique déclaré ; l'ancre V19 du moteur en tient compte.
 */
import type { FingerprintHistoryEntry, ISODateTime, SessionDraft, SetPrescription } from '@hybridsport/domain';
import { classifyExposure, createTrack, progressionModelFor, readStrengthParams, updateTrack } from '@hybridsport/strength';
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
  if (g.outcome.status !== 'ok' || !state.profile) return state.strength;
  const p = state.profile;
  const params = readStrengthParams(strengthContent().ruleset).values;
  const catalog = strengthContent().catalog;
  const stimulus = STIMULUS_BY_GOAL[p.strength.goal];
  const archetypeId = g.archetypeId;
  const slots = params['strength.archetypes'].find((a) => a.id === archetypeId)?.slots ?? [];
  const tracks = new Map(state.strength.tracks.map((t) => [t.trackId, t]));
  const exposures = [...state.strength.exposures];
  const counts = { ...state.strength.accessoryCounts };
  const now = at;

  for (const it of mainItems(g.outcome.session)) {
    if (it.prescription.type !== 'sets') continue;
    const e = catalog.exercise(it.exerciseId);
    if (!e) continue;
    const prescribed = it.prescription.sets.filter(isWork);
    const performed = performedSets(it.id, it.prescription.sets, log);
    const pain = log.painItems.includes(it.id);
    const exec: ExecutedItem = { exerciseId: e.id, prescribed, performed, sessionCompleted: true, ...(pain ? { skipReason: 'pain' as const } : {}), ...(it.refs?.substitutedFrom ? { substitutedFrom: it.refs.substitutedFrom } : {}) };
    const slot = slots.find((z) => z.id === it.refs?.slotId);
    const role: SlotRole = slot?.role ?? 'accessory';
    const trackId = it.refs?.progressionTrackId;
    const anchorOfSlot = [...tracks.values()].find((t) => t.tier === 'anchor' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === it.refs?.slotId);
    const known = trackId ? tracks.get(trackId) : undefined;
    if (known) {
      tracks.set(known.trackId, updateTrack(known, exec, classifyExposure(exec, params), e, params, 'accumulation').track);
    } else if (it.refs?.anchor === 'candidate' && anchorOfSlot?.status === 'active' && anchorOfSlot.exerciseId === e.id) {
      tracks.set(anchorOfSlot.trackId, updateTrack(anchorOfSlot, exec, classifyExposure(exec, params), e, params, 'accumulation').track);
    } else if (it.refs?.substitutedFrom && anchorOfSlot) {
      tracks.set(anchorOfSlot.trackId, updateTrack(anchorOfSlot, exec, 'substituted', e, params, 'accumulation').track);
    } else if (it.refs?.anchor === 'candidate' && !anchorOfSlot && performed.length > 0 && slot && !pain) {
      const model = progressionModelFor(e, role, p.level, performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
      const c = createTrack({ tier: 'anchor', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role }, params);
      tracks.set(c.track.trackId, c.track);
    } else if (role === 'accessory' && slot?.trackable && performed.length > 0 && !pain) {
      const k = `${archetypeId}/${slot.id}/${e.id}`;
      counts[k] = (counts[k] ?? 0) + 1;
      const hasTracked = [...tracks.values()].some((t) => t.tier === 'tracked' && t.status !== 'closed' && t.archetypeId === archetypeId && t.slotId === slot.id);
      if ((counts[k] ?? 0) >= params['strength.tracks'].tier2AutoCreateAfter && !hasTracked) {
        const model = progressionModelFor(e, role, p.level, performed.find((z) => z.loadKg !== undefined)?.loadKg, params);
        const c = createTrack({ tier: 'tracked', archetypeId, slotId: slot.id, exercise: e, model, prescribed, performed, at: now, stimulus, role }, params);
        tracks.set(c.track.trackId, c.track);
      }
    }
    if (performed.length > 0) exposures.push({ exerciseId: e.id, at: now, ...(it.refs?.slotId ? { slotId: it.refs.slotId } : {}), sets: performed });
  }
  return { tracks: [...tracks.values()].sort((a, b) => (a.trackId < b.trackId ? -1 : 1)), exposures, accessoryCounts: counts };
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
  const params = readStrengthParams(strengthContent().ruleset).values;
  const slots = params['strength.archetypes'].find((a) => a.id === archetypeId)?.slots ?? [];
  const lastUse = (t: StrengthTrack): string => state.strength.exposures.filter((x) => x.exerciseId === t.exerciseId).map((x) => x.at).sort().at(-1) ?? '';
  const out: StrengthTrack[] = [];
  const seen = new Set<string>();
  const anchors = state.strength.tracks.filter((t) => t.tier === 'anchor' && t.status === 'active' && t.archetypeId === archetypeId)
    .sort((a, b) => (lastUse(a) < lastUse(b) ? -1 : lastUse(a) > lastUse(b) ? 1 : a.trackId < b.trackId ? -1 : 1));
  for (const t of anchors) {
    const group = slots.find((z) => z.id === t.slotId)?.choiceGroup;
    if (group === undefined) { out.push(t); continue; }
    if (seen.has(group)) continue;
    seen.add(group);
    out.push(t);
  }
  return out;
}
