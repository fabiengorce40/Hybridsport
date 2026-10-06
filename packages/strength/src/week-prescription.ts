/**
 * Strength S3 — niveaux de décision de la musculation, séparés explicitement :
 *   A. COMPOSITION de la semaine (`composeStrengthWeek`, composition.ts) : rôle / archétype de chaque occurrence ;
 *   B. CONSTRUCTION de la séance (`proposeStrength`, engine.ts) : besoins, exercices, ordre, dose, charge ;
 *   C. PROGRESSION longitudinale (`progression.ts`, appliquée hors du moteur par le ProgressionEngine) : tracks.
 *
 * Ce module porte la PRESCRIPTION HEBDOMADAIRE (lien A → B) : ce que Strength cherche à accomplir sur la semaine AVANT de
 * construire une séance — besoins requis de chaque occurrence, ancres déclarables (stabilité), volume prévu / réalisé
 * face aux bornes du ruleset — et sa PROVENANCE (statut de chaque règle lue). Aucune valeur sportive nouvelle : tout est
 * lu dans le ruleset ou dans l'historique transmis ; ce qui n'est pas gouverné est listé dans `blocked`.
 */
import type { Level, SessionDraft } from '@hybridsport/domain';
import type { LoadedCatalog } from '@hybridsport/engine';
import type { ExerciseExposure, StrengthGoalRef, StrengthTrack } from './context.js';
import type { StrengthParams } from './params.js';
import { findArchetype, goalKey } from './archetypes.js';

/** Capacités Strength NON gouvernées (fail-closed) : jamais simulées par une valeur inventée. */
export const STRENGTH_BLOCKED_CAPABILITIES = [
  // Aucune phase / mésocycle / décharge gouvernés : la phase transmise est un placeholder (accumulation, semaine 1).
  'periodization',
  // Aucune règle de split au-delà de la règle candidate S1 (5 séances et plus : non composées).
  'split_beyond_candidate',
  // Aucune règle de récupération entre deux séances Strength (signalée, jamais appliquée).
  'same_discipline_recovery',
  // Aucune conversion de charge entre exercices différents hors classe d'équivalence transférable du ruleset.
  'load_conversion_between_exercises',
  // Aucune rotation d'exercice planifiée gouvernée (seules les causes traçables : douleur, matériel, exclusion, stagnation).
  'planned_exercise_rotation',
] as const;
export type StrengthBlockedCapability = (typeof STRENGTH_BLOCKED_CAPABILITIES)[number];

/** Vue minimale d'une track / d'une exposition (accepte la forme parsée et la forme d'entrée du contrat). */
export type AnchorTrack = Pick<StrengthTrack, 'trackId' | 'tier' | 'status' | 'archetypeId' | 'slotId' | 'exerciseId'>;
export type ExposureAt = Pick<ExerciseExposure, 'exerciseId'> & { readonly at: string };

/**
 * Ancres DÉCLARABLES pour une séance de cet archétype (contrat CORE-EXT-4) : tracks d'ancre ACTIVES de l'archétype, au
 * plus une par groupe de choix (la moins récemment utilisée d'abord, selon les expositions RÉALISÉES). C'est ce qui
 * maintient un exercice principal d'une semaine à l'autre (stabilité), et ce qui fait appliquer sa progression.
 */
export function declarableAnchors<T extends AnchorTrack>(tracks: readonly T[], exposures: readonly ExposureAt[], archetypeId: string, params: StrengthParams): T[] {
  const slots = findArchetype(params, archetypeId)?.slots ?? [];
  const lastUse = (t: T): string => exposures.filter((x) => x.exerciseId === t.exerciseId).map((x) => String(x.at)).sort().at(-1) ?? '';
  const out: T[] = [];
  const seen = new Set<string>();
  const anchors = tracks.filter((t) => t.tier === 'anchor' && t.status === 'active' && t.archetypeId === archetypeId && slots.some((z) => z.id === t.slotId))
    .sort((a, b) => (lastUse(a) < lastUse(b) ? -1 : lastUse(a) > lastUse(b) ? 1 : a.trackId < b.trackId ? -1 : 1));
  for (const t of anchors) {
    const group = slots.find((z) => z.id === t.slotId)?.choiceGroup ?? `slot:${t.slotId}`;
    if (seen.has(group)) continue;
    seen.add(group);
    out.push(t);
  }
  return out;
}

/** Expositions PRÉVUES (séances Strength placées plus tôt dans la semaine) : exercices et instant, jamais de séries réalisées. */
export function plannedWeekExposures(sessions: readonly { readonly at: string; readonly session: SessionDraft }[]): ExposureAt[] {
  return sessions.flatMap((w) => w.session.blocks.flatMap((b) => b.items.map((it) => ({ exerciseId: it.exerciseId, at: w.at }))));
}

/** Volume d'un groupe musculaire pour la semaine : bornes du ruleset, prévu (séances antérieures), réalisé (7 jours). */
export interface GroupVolume {
  readonly group: string;
  readonly floor: number;
  readonly high: number;
  readonly planned: number;
  readonly realized: number;
}

export interface StrengthWeekPrescription {
  readonly goal: string;
  readonly level: Level;
  readonly archetypeId: string;
  /** Rang de cette occurrence parmi les séances Strength de la semaine (1 = première). */
  readonly occurrence: number;
  readonly weeklySessions: number;
  /** Besoins REQUIS de l'archétype (avec leurs groupes de choix) : ce que la séance doit obtenir. */
  readonly requiredNeeds: readonly { readonly slotId: string; readonly need: string; readonly choiceGroup?: string }[];
  /** Ancres déclarées pour cette séance (exercice maintenu, progression de sa track appliquée). */
  readonly anchors: readonly { readonly trackId: string; readonly slotId: string; readonly exerciseId: string }[];
  /** Volume prévu (séances Strength placées plus tôt) et réalisé (7 jours), face aux bornes `strength.volume`. */
  readonly volume: readonly GroupVolume[];
  /** Provenance des règles lues (identifiant@version et statut de revue du ruleset). */
  readonly provenance: readonly { readonly parameterId: string; readonly status: string }[];
  readonly blocked: readonly StrengthBlockedCapability[];
}

export interface WeekPrescriptionInput {
  readonly params: StrengthParams;
  readonly paramStatus: (parameterId: string) => string;
  readonly goal: StrengthGoalRef;
  readonly level: Level;
  readonly archetypeId: string;
  readonly occurrence: number;
  readonly weeklySessions: number;
  readonly context: {
    readonly tracks: readonly AnchorTrack[];
    readonly recentExposures: readonly ExposureAt[];
    readonly hardSets: { readonly d7: Readonly<Record<string, number>> };
    readonly week: { readonly otherStrengthSessions: readonly { readonly plannedHardSets: Readonly<Record<string, number>>; readonly done: boolean }[] };
  };
}

export function strengthWeekPrescription(i: WeekPrescriptionInput): StrengthWeekPrescription {
  const gk = goalKey(i.goal);
  const archetype = findArchetype(i.params, i.archetypeId);
  const v = i.params['strength.volume'];
  const range = v.weeklyRange[gk]?.[i.level] ?? {};
  const plannedOthers = i.context.week.otherStrengthSessions.filter((s) => !s.done);
  const groups = Object.keys(v.muscleGroups).sort();
  const volume = groups.map((g) => ({
    group: g, floor: range[g]?.floor ?? Number.NaN, high: range[g]?.high ?? Number.NaN,
    planned: plannedOthers.reduce((a, s) => a + (s.plannedHardSets[g] ?? 0), 0), realized: i.context.hardSets.d7[g] ?? 0,
  }));
  const anchors = declarableAnchors(i.context.tracks, i.context.recentExposures, i.archetypeId, i.params);
  return {
    goal: gk, level: i.level, archetypeId: i.archetypeId, occurrence: i.occurrence, weeklySessions: i.weeklySessions,
    requiredNeeds: (archetype?.slots ?? []).filter((s) => s.status === 'required').map((s) => ({ slotId: s.id, need: s.need, ...(s.choiceGroup !== undefined ? { choiceGroup: s.choiceGroup } : {}) })),
    anchors: anchors.map((t) => ({ trackId: t.trackId, slotId: t.slotId, exerciseId: t.exerciseId })),
    volume,
    provenance: ['strength.archetypes', 'strength.volume', 'strength.progression', 'strength.tracks'].map((id) => ({ parameterId: id, status: i.paramStatus(id) })),
    blocked: [...STRENGTH_BLOCKED_CAPABILITIES],
  };
}

/** Lecture compacte (trace persistable) : groupes sous le plancher, au haut ou au-delà, sans cible gouvernée. */
export function weekPrescriptionSummary(p: StrengthWeekPrescription): { belowFloor: string[]; atOrAboveHigh: string[]; noTarget: string[] } {
  const total = (g: GroupVolume) => g.planned + g.realized;
  return {
    belowFloor: p.volume.filter((g) => Number.isFinite(g.floor) && total(g) < g.floor).map((g) => g.group),
    atOrAboveHigh: p.volume.filter((g) => Number.isFinite(g.high) && total(g) >= g.high).map((g) => g.group),
    noTarget: p.volume.filter((g) => !Number.isFinite(g.floor)).map((g) => g.group),
  };
}

/** Catalogue : un exercice reste-t-il ADMISSIBLE pour l'athlète (matériel, exclusion) ? Base de la clôture « inadmissible ». */
export function exerciseStillAdmissible(exerciseId: string, catalog: LoadedCatalog, equipment: readonly string[], excluded: readonly string[]): boolean {
  const e = catalog.exercise(exerciseId);
  return e !== undefined && e.status === 'active' && !excluded.includes(e.id) && catalog.isFeasibleWith(e, new Set(equipment));
}
