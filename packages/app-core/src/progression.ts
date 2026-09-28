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
import type { RealizedSession } from '@hybridsport/running';
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

function realizedRun(g: GeneratedSession, log: SessionLog, at: ISODateTime): RealizedSession | undefined {
  if (!log.run) return undefined;
  const fb = log.feedback;
  return {
    sessionId: g.key, archetype: 'EASY', structureFamily: 'CONTINUOUS', completedAt: at, realizedDurationS: log.run.realizedDurationS, completion: log.run.completion,
    ...(log.run.completion === 'SKIPPED' ? { skipReason: 'OTHER' as const } : {}),
    unexpectedDifficulty: fb?.difficulty ?? 'UNKNOWN', intoleranceOrPainSignal: fb?.pain ?? false, readinessOrToleranceDegraded: false,
  };
}

/** Applique une séance TERMINÉE à l'historique (tracks, expositions, empreintes, historique de course). */
export function applyCompletion(state: AppState, key: string, at: ISODateTime): AppState {
  const g = state.sessions[key];
  const log = state.logs[key];
  if (!g || !log || g.outcome.status !== 'ok') return state;
  const fp = g.outcome.fingerprint as FingerprintHistoryEntry['fingerprint'] | undefined;
  const entry: FingerprintHistoryEntry[] = fp ? [{ fingerprint: fp, at, status: 'completed', repetitionIntents: [] }] : [];
  const run = g.sport === 'running' ? realizedRun(g, log, at) : undefined;
  const pain = log.feedback?.pain === true || log.painItems.length > 0;
  return {
    ...state,
    strength: g.sport === 'strength' ? applyStrength(state, g, log, at) : state.strength,
    running: run ? { realized: [...state.running.realized, run] } : state.running,
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
