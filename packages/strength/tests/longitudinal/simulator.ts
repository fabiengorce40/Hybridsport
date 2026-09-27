/**
 * Simulateur longitudinal (spec 4B étape 19). TEST UNIQUEMENT.
 *
 * Il joue trois rôles extérieurs au StrengthEngine : un PLANIFICATEUR minimal (intentions, ancres
 * déclarées, contexte de semaine), un ATHLÈTE simulé (capacités cachées, exécution bruitée mais
 * reproductible) et le PROGRESSIONENGINE (création / mise à jour / suspension / reprise / clôture des
 * tracks, via les fonctions de `progression.ts`). Le moteur n'est jamais modifié ni recalibré ici : les
 * détecteurs RAPPORTENT ce qu'ils observent.
 *
 * Modèle d'athlète volontairement simple (hypothèses de test, non validées) : e1RM caché par exercice,
 * gain par exposition efficace à rendement décroissant, fatigue intra-séance, bruit borné.
 */
import { asISODateTime } from '@hybridsport/domain';
import type { Exercise, FingerprintHistoryEntry, ISODateTime, Level, SessionDraft, SessionItem, SetPrescription } from '@hybridsport/domain';
import { SeededRng } from '@hybridsport/engine';
import { classifyExposure, closeTrack, closureCause, createTrack, groupsOf, progressionModelFor, readStrengthParams, resumeTrack, startCycle, updateTrack } from '../../src/index.js';
import type { ExecutedItem, PerformedSet, SlotRole, StrengthContextInput, StrengthTrack } from '../../src/index.js';
import { envFor, run, scenario, strengthCatalog, strengthRuleset } from '../fixtures/harness.js';

const P = readStrengthParams(strengthRuleset()).values;
const CATALOG = strengthCatalog();
const ENV = envFor(scenario());
const DAY_MS = 86_400_000;
const START = Date.parse('2026-01-05T07:00:00Z');
const at = (week: number, day: number): ISODateTime => asISODateTime(new Date(START + (week * 7 + day) * DAY_MS).toISOString().replace('.000Z', 'Z'));

type Neighbor = StrengthContextInput['week']['neighbors'][number];
export interface SessionPlan { readonly day: number; readonly archetype: string; readonly stimulus: string; readonly minutes: number; readonly neighbors?: readonly Neighbor[] }
export interface SimProfile {
  readonly name: string;
  readonly level: Level;
  readonly preset: string;
  readonly goal: StrengthContextInput['goal'];
  readonly plan: (week: number) => readonly SessionPlan[];
  readonly phase: (week: number) => StrengthContextInput['phase'];
  readonly painAt?: { readonly week: number; readonly session: number; readonly weeks: number };
  readonly missed?: readonly { readonly week: number; readonly session: number }[];
  readonly equipmentOut?: { readonly fromWeek: number; readonly toWeek: number; readonly exercises: readonly string[] };
  readonly weekUnknown?: readonly number[];
}

// --- Athlète simulé -------------------------------------------------------------------------------
const LEVEL_FACTOR: Record<Level, number> = { novice: 0.6, beginner: 0.8, intermediate: 1, advanced: 1.35 };
const GAIN: Record<Level, number> = { novice: 0.03, beginner: 0.02, intermediate: 0.008, advanced: 0.003 };
function baseE1rm(e: Exercise): number {
  const m = e.loadModel;
  if (!e.compound) return m === 'dumbbell_pair' || m === 'dumbbell_single' ? 12 : 35;
  if (m === 'barbell') return e.patterns.primary === 'push_vertical' ? 50 : e.patterns.primary === 'push_horizontal' || e.patterns.primary === 'pull_horizontal' ? 75 : 110;
  if (m === 'plate_loaded') return 160;
  if (m === 'machine_stack') return e.patterns.primary === 'squat' ? 160 : 80;
  if (m === 'dumbbell_pair') return 30;
  if (m === 'bodyweight_plus') return 25;
  return 32;
}

class Athlete {
  private readonly cap = new Map<string, number>();
  private readonly ceiling = new Map<string, number>();
  constructor(private readonly level: Level, private readonly rng: SeededRng) {}
  capacity(e: Exercise): number {
    let c = this.cap.get(e.id);
    if (c === undefined) { c = baseE1rm(e) * LEVEL_FACTOR[this.level]; this.cap.set(e.id, c); this.ceiling.set(e.id, c * 1.8); }
    return c;
  }
  /** Répétitions possibles jusqu'à l'échec à une charge donnée (fatigue intra-séance, bruit borné). */
  repsToFailure(e: Exercise, loadKg: number, setIndex: number): number {
    const c = this.capacity(e);
    const base = loadKg <= 0 ? 20 * LEVEL_FACTOR[this.level] : P['strength.load'].e1rmDivisor * (c / loadKg - 1);
    return base - 0.4 * setIndex + (this.rng.nextFloat() - 0.5);
  }
  /** Gain proportionnel aux séries stimulantes (1 à 3, rendement plafonné), décroissant près du plafond génétique. */
  adapt(e: Exercise, hardSets: number, deload: boolean): void {
    if (deload || hardSets < 1) return;
    const c = this.capacity(e);
    const ceil = this.ceiling.get(e.id) ?? c;
    this.cap.set(e.id, c + c * GAIN[this.level] * (Math.min(hardSets, 3) / 3) * Math.max(0, 1 - c / ceil));
  }
}

const stepOf = (e: Exercise): number => (e.loadModel ? P['strength.load.defaultIncrements'][e.loadModel] : 1);
const roundTo = (kg: number, step: number): number => Math.max(step, Math.floor(kg / step) * step);
const repsMax = (r: SetPrescription['reps']): number => (typeof r === 'number' ? r : r.max);
const repsMin = (r: SetPrescription['reps']): number => (typeof r === 'number' ? r : r.min);
function targetRir(s: SetPrescription): number {
  const i = s.intensity;
  if (i && 'effort' in i && i.effort) return 'rir' in i.effort && i.effort.rir !== undefined ? i.effort.rir : 10 - ('rpe' in i.effort ? i.effort.rpe : 8);
  return s.rir ?? 2;
}

interface Execution { readonly performed: PerformedSet[]; readonly impossible: number; readonly workingSets: number; readonly prescribedKg?: number }

/** Exécution des séries de TRAVAIL d'un item (montées ignorées) par l'athlète simulé. */
function execute(a: Athlete, e: Exercise, it: SessionItem): Execution {
  if (it.prescription.type !== 'sets') return { performed: [], impossible: 0, workingSets: 0 };
  const work = it.prescription.sets.filter((s) => s.kind !== 'rampup' && s.optional !== true);
  const performed: PerformedSet[] = [];
  let impossible = 0;
  let chosenKg: number | undefined;
  let prescribedKg: number | undefined;
  work.forEach((s, i) => {
    const rir = targetRir(s);
    const i0 = s.intensity;
    let kg = 0;
    if (i0?.mode === 'load') { kg = i0.kg; prescribedKg ??= kg; }
    else if (i0?.mode === 'percent_of_reference') { kg = i0.kgRounded; prescribedKg ??= kg; }
    else if (i0?.mode === 'bodyweight') kg = i0.addedKg ?? 0;
    else if (e.loadable) {
      // Prescription à l'effort (calibration, faible confiance) : l'athlète choisit une charge pour le RIR visé.
      // Fourchette indicative fournie : l'athlète s'y tient (au moins son bas).
      const own = roundTo(a.capacity(e) / (1 + (repsMax(s.reps) + rir) / P['strength.load'].e1rmDivisor) * 0.97, stepOf(e));
      chosenKg ??= i0?.mode === 'effort' && i0.indicativeKg ? Math.max(own, i0.indicativeKg.min) : own;
      kg = chosenKg;
    }
    const rtf = a.repsToFailure(e, kg, i);
    if (rtf < repsMin(s.reps)) impossible++;
    const reps = Math.max(0, Math.min(repsMax(s.reps), Math.floor(typeof s.reps === 'number' ? Math.min(s.reps, rtf) : rtf - rir)));
    performed.push({ reps, ...(kg > 0 ? { loadKg: kg } : {}), rir: Math.max(0, Math.round(rtf - reps)) });
  });
  return { performed, impossible, workingSets: work.length, ...(prescribedKg !== undefined ? { prescribedKg } : {}) };
}

/** Séries « stimulantes » du modèle d'athlète (hypothèse de test) : RIR ≤ 4. */
const STIMULATING_RIR = 4;

/** Historique transmis par le planificateur : les 3 dernières expositions de chaque exercice sur 365 jours. */
function recentPerExercise(xs: readonly { exerciseId: string; at: string; sets: PerformedSet[] }[], nowMs: number) {
  const byEx = new Map<string, { exerciseId: string; at: string; sets: PerformedSet[] }[]>();
  for (const x of xs) if (nowMs > Date.parse(x.at) && nowMs - Date.parse(x.at) < 365 * DAY_MS) byEx.set(x.exerciseId, [...(byEx.get(x.exerciseId) ?? []), x].slice(-3));
  return [...byEx.values()].flat().sort((a, b) => (a.at < b.at ? -1 : 1));
}

// --- Enregistrement --------------------------------------------------------------------------------
export interface WeekRecord {
  readonly week: number;
  readonly phase: string;
  readonly hardSets: Record<string, number>;
  /** Part due aux seuls emplacements REQUIS (inévitable pour l'archétype). */
  readonly requiredHardSets: Record<string, number>;
  /** Part due aux exercices OPTIONNELS mono-groupe (volume purement ajouté pour ce groupe). */
  readonly singleOptionalHardSets: Record<string, number>;
  readonly workingSets: number;
  readonly sessions: number;
  readonly impossible: number;
  readonly prescribed: number;
}
export interface SimResult {
  profile: SimProfile;
  weeks: WeekRecord[];
  outcomes: Record<string, number>;
  errors: string[];
  invalid: number;
  overTime: number;
  impossibleSets: number;
  totalSets: number;
  calibrationItemsByWeek: number[];
  anchorHistory: Map<string, { week: number; exerciseId: string; kg?: number }[]>;
  readonly exercisesUsed: Map<string, number>;
  readonly modality: Record<string, number>;
  rirZeroSets: number;
  readonly painViolations: string[];
  tracksCreated: number;
  readonly tracksClosed: Record<string, number>;
  substitutions: number;
  readonly trueGain: Map<string, { start: number; end: number }>;
  readonly e1rmError: number[];
  declaredIgnored: number;
}

const modalityOf = (e: Exercise): string => (!e.loadable || !e.loadModel || e.loadModel === 'bodyweight_plus' ? 'bodyweight' : e.loadModel === 'machine_stack' || e.loadModel === 'plate_loaded' ? (e.equipment.allOf.includes('cable') ? 'cable' : 'machine') : 'free_weight');

export function simulate(p: SimProfile, weeks: number): SimResult {
  const rng = SeededRng.fromSeed(`athlete:${p.name}`);
  const athlete = new Athlete(p.level, rng);
  const tracks = new Map<string, StrengthTrack>();
  const stagnant = new Set<string>();
  const accessoryCount = new Map<string, number>();
  const exposures: { exerciseId: string; at: string; sets: PerformedSet[] }[] = [];
  const history: FingerprintHistoryEntry[] = [];
  const done: { at: number; groups: Record<string, number> }[] = [];
  const lastPlanned = new Map<string, Record<string, number>>();
  const r: SimResult = {
    profile: p, weeks: [], outcomes: {}, errors: [], invalid: 0, overTime: 0, impossibleSets: 0, totalSets: 0, calibrationItemsByWeek: [], anchorHistory: new Map(),
    exercisesUsed: new Map(), modality: {}, rirZeroSets: 0, painViolations: [], tracksCreated: 0, tracksClosed: {}, substitutions: 0, trueGain: new Map(), e1rmError: [], declaredIgnored: 0,
  };
  let painUntilWeek = -1;
  const suspendedBefore = new Map<string, StrengthTrack>();
  const lastUse = new Map<string, number>();
  const lastSlotOfGroup = new Map<string, string>();
  let sessionIndex = 0;

  for (let w = 0; w < weeks; w++) {
    const phase = p.phase(w);
    const plan = p.plan(w);
    const weekGroups: Record<string, number> = {};
    const weekRequired: Record<string, number> = {};
    const weekSingle: Record<string, number> = {};
    let weekSets = 0;
    let weekSessions = 0;
    let calibrationItems = 0;
    let weekImpossible = 0;
    let weekPrescribed = 0;
    const doneThisWeek: { archetype: string; groups: Record<string, number>; day: number }[] = [];
    plan.forEach((sp, si) => {
      if (p.missed?.some((m) => m.week === w && m.session === si)) return;
      const now = at(w, sp.day);
      const nowMs = Date.parse(now);
      const d7: Record<string, number> = {};
      for (const d of done.filter((x) => nowMs - x.at < 7 * DAY_MS)) for (const [g, v] of Object.entries(d.groups)) d7[g] = (d7[g] ?? 0) + v;
      const active = [...tracks.values()].filter((t) => t.status !== 'closed');
      // Planificateur : au plus UNE ancre déclarée par groupe de choix et par séance, en ALTERNANCE : jamais
      // celle du membre utilisé à la séance précédente de cet archétype ; sans autre ancre, rien n'est
      // déclaré pour le groupe et le moteur choisit par récence (le membre non ancré aura sa propre ancre).
      const archSlots = P['strength.archetypes'].find((a) => a.id === sp.archetype)?.slots ?? [];
      const groupOf = (t: StrengthTrack) => archSlots.find((z) => z.id === t.slotId)?.choiceGroup;
      const declared: StrengthTrack[] = [];
      const seenGroups = new Set<string>();
      for (const t of active.filter((x) => x.tier === 'anchor' && x.status === 'active' && x.archetypeId === sp.archetype).sort((x, y) => (lastUse.get(x.trackId) ?? -1) - (lastUse.get(y.trackId) ?? -1) || (x.trackId < y.trackId ? -1 : 1))) {
        const g = groupOf(t);
        if (g === undefined) { declared.push(t); continue; }
        if (seenGroups.has(g) || lastSlotOfGroup.get(`${sp.archetype}/${g}`) === t.slotId) continue;
        seenGroups.add(g);
        declared.push(t);
      }
      const others = plan.filter((_, k) => k !== si).map((o, k) => {
        const past = doneThisWeek.find((x) => x.day === o.day);
        return { intentId: `intent.w${String(w)}.d${String(o.day)}.${String(k)}`, archetypeId: o.archetype, plannedHardSets: past?.groups ?? lastPlanned.get(o.archetype) ?? {}, done: past !== undefined };
      });
      const excluded = p.equipmentOut && w >= p.equipmentOut.fromWeek && w <= p.equipmentOut.toWeek ? [...p.equipmentOut.exercises] : [];
      const s = {
        ...scenario({
          level: p.level, preset: p.preset, archetype: sp.archetype, stimulus: sp.stimulus, minutes: sp.minutes, seed: `${p.name}:w${String(w)}:s${String(si)}`,
          profile: { excludedExercises: excluded },
          intent: { id: `intent.w${String(w)}.d${String(sp.day)}`, repetitionIntents: declared.map((t) => ({ kind: 'progression_anchor' as const, trackId: t.trackId })) },
          context: {
            goal: p.goal, phase, tracks: active,
            recentExposures: recentPerExercise(exposures, nowMs),
            hardSets: { d7 },
            week: { otherStrengthSessions: others, neighbors: [...(sp.neighbors ?? [])], known: !(p.weekUnknown ?? []).includes(w) },
          },
          history: history.filter((h) => nowMs - Date.parse(h.at) < 28 * DAY_MS),
        }),
        now,
      };
      const o = run(s);
      const key = o.result.status === 'ok' ? 'ok' : o.result.status === 'error' ? o.result.error.code : o.result.status;
      r.outcomes[key] = (r.outcomes[key] ?? 0) + 1;
      if (o.result.status !== 'ok') { r.errors.push(`w${String(w)} ${sp.archetype}: ${key} ${o.result.status === 'error' ? o.result.error.reasons.map((x) => x.code).join(',') : ''}`); return; }
      const session: SessionDraft = o.result.value;
      const entries = o.trace.entries.filter((e) => e.subject.id === session.id);
      if (entries.filter((e) => e.step === 'validate').at(-1)?.decision !== 'VALID') r.invalid++;
      const p90 = Number(entries.flatMap((e) => e.reasons).find((x) => x.code === 'DURATION.ESTIMATED')?.params.p90S);
      if (p90 > s.intent.availableTimeS) r.overTime++;
      if (o.fingerprint) history.push({ fingerprint: o.fingerprint, at: now, status: 'completed', repetitionIntents: [] });
      weekSessions++;
      const sessionGroups: Record<string, number> = {};
      const items = session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items);
      const usedTracks = new Set(items.map((it) => it.refs?.progressionTrackId).filter(Boolean));
      sessionIndex++;
      for (const id of usedTracks) if (id) lastUse.set(id, sessionIndex);
      for (const it of items) {
        const g = P['strength.archetypes'].find((a) => a.id === sp.archetype)?.slots.find((z) => z.id === it.refs?.slotId)?.choiceGroup;
        if (g !== undefined && it.refs?.slotId) lastSlotOfGroup.set(`${sp.archetype}/${g}`, it.refs.slotId);
      }
      for (const t of declared) if (!usedTracks.has(t.trackId) && !items.some((it) => it.refs?.substitutedFrom === t.exerciseId)) r.declaredIgnored++;
      items.forEach((it, idx) => {
        const e = CATALOG.exercise(it.exerciseId);
        if (!e) return;
        r.exercisesUsed.set(e.id, (r.exercisesUsed.get(e.id) ?? 0) + 1);
        r.modality[modalityOf(e)] = (r.modality[modalityOf(e)] ?? 0) + 1;
        if (it.refs?.prescriptionSource === 'calibration') calibrationItems++;
        if (it.refs?.substitutedFrom) r.substitutions++;
        const slotDef = P['strength.archetypes'].find((a) => a.id === sp.archetype)?.slots.find((z) => z.id === it.refs?.slotId);
        const pain = p.painAt && p.painAt.week === w && p.painAt.session === si && idx === 0;
        const x = pain ? { performed: [] as PerformedSet[], impossible: 0, workingSets: 0 } : execute(athlete, e, it);
        const prescribedSets = it.prescription.type === 'sets' ? it.prescription.sets.filter((z) => z.kind !== 'rampup' && z.optional !== true) : [];
        r.totalSets += prescribedSets.length;
        r.rirZeroSets += prescribedSets.filter((z) => targetRir(z) <= 0).length;
        r.impossibleSets += x.impossible;
        weekImpossible += x.impossible;
        weekPrescribed += prescribedSets.length;
        weekSets += x.workingSets;
        const g = groupsOf(e, ENV);
        for (const gp of g.primary) sessionGroups[gp] = (sessionGroups[gp] ?? 0) + x.workingSets;
        for (const gs of g.secondary) sessionGroups[gs] = (sessionGroups[gs] ?? 0) + x.workingSets * P['strength.volume'].secondaryWeight;
        if (slotDef?.status === 'optional' && g.primary.length === 1) for (const gp of g.primary) weekSingle[gp] = (weekSingle[gp] ?? 0) + x.workingSets;
        if (slotDef?.status === 'required') {
          for (const gp of g.primary) weekRequired[gp] = (weekRequired[gp] ?? 0) + x.workingSets;
          for (const gs of g.secondary) weekRequired[gs] = (weekRequired[gs] ?? 0) + x.workingSets * P['strength.volume'].secondaryWeight;
        }
        if (!r.trueGain.has(e.id)) r.trueGain.set(e.id, { start: athlete.capacity(e), end: athlete.capacity(e) });
        athlete.adapt(e, x.performed.filter((z) => (z.rir ?? 9) <= STIMULATING_RIR).length, phase.kind === 'deload');
        const tg = r.trueGain.get(e.id);
        if (tg) r.trueGain.set(e.id, { ...tg, end: athlete.capacity(e) });
        if (x.performed.length > 0) exposures.push({ exerciseId: e.id, at: now, sets: x.performed });

        // --- ProgressionEngine (hors moteur) ---
        const exec: ExecutedItem = { exerciseId: e.id, prescribed: prescribedSets, performed: x.performed, sessionCompleted: true, ...(pain ? { skipReason: 'pain' as const } : {}), ...(it.refs?.substitutedFrom ? { substitutedFrom: it.refs.substitutedFrom } : {}) };
        const role: SlotRole = slotDef?.role ?? 'accessory';
        const trackId = it.refs?.progressionTrackId;
        const anchorOfSlot = [...tracks.values()].find((t) => t.tier === 'anchor' && t.status !== 'closed' && t.archetypeId === sp.archetype && t.slotId === it.refs?.slotId);
        if (trackId && tracks.get(trackId)) {
          const t = tracks.get(trackId) as StrengthTrack;
          const cls = classifyExposure(exec, P);
          const u = updateTrack(t, exec, cls, e, P, phase.kind);
          if (cls === 'pain') suspendedBefore.set(t.trackId, t);
          tracks.set(trackId, u.track);
          if (u.rotate) stagnant.add(trackId);
          if (t.tier === 'anchor') r.anchorHistory.set(`${sp.archetype}/${t.slotId}`, [...(r.anchorHistory.get(`${sp.archetype}/${t.slotId}`) ?? []), { week: w, exerciseId: e.id, ...(x.prescribedKg !== undefined ? { kg: x.prescribedKg } : {}) }]);
          if (t.e1rmKg !== undefined && u.track.e1rmKg !== undefined) r.e1rmError.push(Math.abs(u.track.e1rmKg - athlete.capacity(e)) / athlete.capacity(e));
        } else if (it.refs?.anchor === 'candidate' && anchorOfSlot && anchorOfSlot.status === 'active' && anchorOfSlot.exerciseId === e.id) {
          // Ancre existante non déclarée pour cette séance : l'exposition reste une donnée d'apprentissage de la track.
          const u = updateTrack(anchorOfSlot, exec, classifyExposure(exec, P), e, P, phase.kind);
          tracks.set(anchorOfSlot.trackId, u.track);
          if (u.rotate) stagnant.add(anchorOfSlot.trackId);
        } else if (it.refs?.substitutedFrom && anchorOfSlot) {
          tracks.set(anchorOfSlot.trackId, updateTrack(anchorOfSlot, exec, 'substituted', e, P, phase.kind).track);
        } else if (it.refs?.anchor === 'candidate' && !anchorOfSlot && x.performed.length > 0 && slotDef) {
          const c = createTrack({ tier: 'anchor', archetypeId: sp.archetype, slotId: slotDef.id, exercise: e, model: progressionModelFor(e, role, p.level, x.performed.find((z) => z.loadKg !== undefined)?.loadKg, P), prescribed: prescribedSets, performed: x.performed, at: now, stimulus: sp.stimulus, role }, P);
          tracks.set(c.track.trackId, c.track);
          r.tracksCreated++;
        } else if (role === 'accessory' && slotDef?.trackable && x.performed.length > 0) {
          const k = `${sp.archetype}/${slotDef.id}/${e.id}`;
          const n = (accessoryCount.get(k) ?? 0) + 1;
          accessoryCount.set(k, n);
          const hasTracked = [...tracks.values()].some((t) => t.tier === 'tracked' && t.status !== 'closed' && t.archetypeId === sp.archetype && t.slotId === slotDef.id);
          if (n >= P['strength.tracks'].tier2AutoCreateAfter && !hasTracked) {
            const c = createTrack({ tier: 'tracked', archetypeId: sp.archetype, slotId: slotDef.id, exercise: e, model: progressionModelFor(e, role, p.level, x.performed.find((z) => z.loadKg !== undefined)?.loadKg, P), prescribed: prescribedSets, performed: x.performed, at: now, stimulus: sp.stimulus, role }, P);
            tracks.set(c.track.trackId, c.track);
            r.tracksCreated++;
          }
        }
        if (pain) painUntilWeek = w + (p.painAt?.weeks ?? 1);
      });
      done.push({ at: nowMs, groups: sessionGroups });
      doneThisWeek.push({ archetype: sp.archetype, groups: sessionGroups, day: sp.day });
      lastPlanned.set(sp.archetype, sessionGroups);
      for (const [g, v] of Object.entries(sessionGroups)) weekGroups[g] = (weekGroups[g] ?? 0) + v;
    });
    r.calibrationItemsByWeek.push(calibrationItems);
    r.weeks.push({ week: w, phase: phase.kind, hardSets: weekGroups, requiredHardSets: weekRequired, singleOptionalHardSets: weekSingle, workingSets: weekSets, sessions: weekSessions, impossible: weekImpossible, prescribed: weekPrescribed });

    // --- Frontière de semaine : reprise, clôture (ProgressionEngine) ---
    const boundary = at(w + 1, 0);
    const mesocycleEnded = phase.weekInMesocycle === phase.mesocycleLength;
    for (const t of [...tracks.values()]) {
      if (t.status === 'suspended') {
        const res = resumeTrack(t, w + 1 >= painUntilWeek);
        const before = suspendedBefore.get(t.trackId);
        if (before && JSON.stringify(before.nextPrescription) !== JSON.stringify(t.nextPrescription)) r.painViolations.push(`${t.trackId}: prescription modifiée pendant la suspension`);
        tracks.set(t.trackId, res.track);
        continue;
      }
      if (t.status !== 'active') continue;
      const cause = closureCause(t, { now: boundary, mesocycleEnded, stagnant: stagnant.has(t.trackId), inadmissible: false, level: p.level }, P);
      if (cause) { tracks.set(t.trackId, closeTrack(t, cause).track); r.tracksClosed[cause] = (r.tracksClosed[cause] ?? 0) + 1; stagnant.delete(t.trackId); }
      else if (mesocycleEnded) tracks.set(t.trackId, startCycle(t).track);
    }
  }
  for (const [id, before] of suspendedBefore) {
    const now = tracks.get(id);
    if (now && before.nextPrescription?.loadKg !== undefined && (now.nextPrescription?.loadKg ?? 0) < before.nextPrescription.loadKg && now.status !== 'closed') r.painViolations.push(`${id}: charge baissée après douleur`);
  }
  return r;
}

// --- Détecteurs -------------------------------------------------------------------------------------
export interface Detection { readonly id: string; readonly severity: 'critical' | 'warning' | 'info'; readonly detail: string }

export function detect(r: SimResult, upTo: number): Detection[] {
  const out: Detection[] = [];
  const weeks = r.weeks.slice(0, upTo);
  const push = (id: string, severity: Detection['severity'], detail: string) => out.push({ id, severity, detail });
  if (r.invalid > 0) push('invalid_session', 'critical', `[simulation complète] ${String(r.invalid)} séance(s) non valides`);
  if (r.overTime > 0) push('duration_overflow', 'critical', `${String(r.overTime)} séance(s) au-delà du temps disponible (p90)`);
  if (r.painViolations.length > 0) push('pain_as_failure', 'critical', r.painViolations.join(' ; '));
  if (r.declaredIgnored > 0) push('declared_anchor_ignored', 'critical', `${String(r.declaredIgnored)} ancre(s) déclarée(s) ni appliquée(s) ni substituée(s)`);
  const presc = weeks.reduce((a, w) => a + w.prescribed, 0);
  const impossibleRate = presc === 0 ? 0 : weeks.reduce((a, w) => a + w.impossible, 0) / presc;
  push('impossible_prescriptions', impossibleRate > 0.1 ? 'critical' : impossibleRate > 0.03 ? 'warning' : 'info', `${(impossibleRate * 100).toFixed(1)} % des séries prescrites au-delà de la capacité réelle`);
  const errs = Object.entries(r.outcomes).filter(([k]) => k !== 'ok').reduce((a, [, v]) => a + v, 0);
  if (errs > 0) push('no_valid_proposal', 'warning', `${String(errs)} séance(s) sans proposition : ${r.errors.slice(0, 3).join(' | ')}`);
  const acc = weeks.filter((w) => w.phase !== 'deload' && w.sessions > 0);
  const del = weeks.filter((w) => w.phase === 'deload' && w.sessions > 0);
  const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  const accSets = mean(acc.map((w) => w.workingSets / w.sessions));
  const delSets = mean(del.map((w) => w.workingSets / w.sessions));
  if (del.length > 0) push('deload_effect', delSets < accSets ? 'info' : 'critical', `séries/séance : décharge ${delSets.toFixed(1)} vs accumulation ${accSets.toFixed(1)}`);
  // Stagnation d'ancre : aucune hausse de charge sur ≥ 6 expositions consécutives d'une même ancre.
  for (const [slot, h] of r.anchorHistory) {
    const hs = h.filter((x) => x.week < upTo && x.kg !== undefined);
    let flat = 0;
    let maxFlat = 0;
    for (let i = 1; i < hs.length; i++) { flat = (hs[i]?.kg ?? 0) > (hs[i - 1]?.kg ?? 0) || hs[i]?.exerciseId !== hs[i - 1]?.exerciseId ? 0 : flat + 1; maxFlat = Math.max(maxFlat, flat); }
    if (maxFlat >= 6) push('anchor_stagnation', 'warning', `${slot} : ${String(maxFlat)} expositions sans hausse`);
  }
  // Rotation des ancres : nombre d'exercices distincts par emplacement ancré.
  const churn = [...r.anchorHistory].map(([slot, h]) => `${slot}=${String(new Set(h.filter((x) => x.week < upTo).map((x) => x.exerciseId)).size)}`);
  push('anchor_rotation', 'info', `exercices distincts par emplacement ancré : ${churn.join(', ') || '—'}`);
  // Volume hebdomadaire vs cible du ruleset (semaines hors décharge, groupes entraînés).
  const key = r.profile.goal.primary.goal === 'support' ? `support:${r.profile.goal.primary.supportFor ?? ''}` : r.profile.goal.primary.goal;
  const range = P['strength.volume'].weeklyRange[key]?.[r.profile.level] ?? {};
  let below = 0; let aboveOptional = 0; let aboveRequired = 0; let aboveCompound = 0; let checked = 0;
  const overGroups = new Map<string, number>();
  for (const w of acc) for (const [g, t] of Object.entries(range)) {
    const v = w.hardSets[g] ?? 0;
    if (v === 0) continue;
    checked++;
    if (v < t.floor * 0.5) below++;
    if (v > t.high * 1.25) {
      // Dépassement inévitable (emplacements requis seuls au-delà du haut) : incohérence du ruleset, pas du moteur.
      if ((w.requiredHardSets[g] ?? 0) > t.high) aboveRequired++;
      // Sans les optionnels mono-groupe, le groupe resterait-il sous 125 % du haut ? Sinon le dépassement vient
      // de polyarticulaires utiles à d'autres groupes (comptabilité E1 du catalogue), pas d'un ajout superflu.
      else if (v - (w.singleOptionalHardSets[g] ?? 0) <= t.high * 1.25) { aboveOptional++; overGroups.set(g, (overGroups.get(g) ?? 0) + 1); }
      else aboveCompound++;
    }
  }
  push('volume_bounds', aboveOptional > checked * 0.05 ? 'critical' : below > checked * 0.25 || aboveRequired + aboveCompound > checked * 0.1 ? 'warning' : 'info',
    `groupes-semaines : ${String(checked)} contrôlés, ${String(below)} < 50 % du plancher ; > 125 % du haut : ${String(aboveOptional)} par isolations optionnelles superflues ${JSON.stringify(Object.fromEntries(overGroups))}, ${String(aboveCompound)} par polyarticulaires optionnels (comptabilité E1), ${String(aboveRequired)} par les seuls emplacements requis`);
  const rir0 = r.totalSets === 0 ? 0 : r.rirZeroSets / r.totalSets;
  push('rir_zero_share', rir0 > 0.15 ? 'warning' : 'info', `${(rir0 * 100).toFixed(1)} % des séries prescrites à RIR 0`);
  const cal = r.calibrationItemsByWeek.slice(0, upTo);
  push('calibration_decay', (cal.at(-1) ?? 0) > (cal[0] ?? 0) ? 'warning' : 'info', `items en calibration : semaine 1 = ${String(cal[0] ?? 0)}, dernière = ${String(cal.at(-1) ?? 0)}`);
  const gains = [...r.trueGain.values()].map((g) => g.end / g.start - 1);
  push('true_strength_gain', mean(gains) > 0 ? 'info' : 'warning', `[simulation complète] gain moyen de capacité réelle ${(mean(gains) * 100).toFixed(1)} % sur ${String(gains.length)} exercices`);
  if (r.e1rmError.length > 0) push('e1rm_tracking_error', mean(r.e1rmError) > 0.2 ? 'warning' : 'info', `[simulation complète] erreur moyenne e1RM track vs réel ${(mean(r.e1rmError) * 100).toFixed(1)} %`);
  const total = Object.values(r.modality).reduce((a, b) => a + b, 0);
  push('modality_share', 'info', '[simulation complète] ' + Object.entries(r.modality).sort().map(([m, n]) => `${m} ${((n / total) * 100).toFixed(0)} %`).join(', '));
  push('variety', 'info', `[simulation complète] ${String(r.exercisesUsed.size)} exercices distincts ; tracks créées ${String(r.tracksCreated)}, closes ${JSON.stringify(r.tracksClosed)} ; substitutions ${String(r.substitutions)}`);
  return out;
}

export function report(r: SimResult, horizons: readonly number[]): string {
  const lines = [`## ${r.profile.name}`, `issues : ${JSON.stringify(r.outcomes)}`];
  for (const h of horizons) {
    lines.push(`### ${String(h)} semaines`);
    for (const d of detect(r, h)) lines.push(`- [${d.severity}] ${d.id} — ${d.detail}`);
  }
  return lines.join('\n');
}

