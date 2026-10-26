/**
 * P1 — LISIBILITÉ de la programmation Musculation (lecture seule des séances et raisons PERSISTÉES, aucune règle) :
 *   - variante A / B / C : séances du même archétype dans la semaine, regroupées par leurs exercices de force
 *     (deux séances aux mêmes exercices principaux portent la même lettre : rien n'est présenté comme varié à tort) ;
 *   - mouvements dominants, groupes musculaires sollicités (séries de travail, fonction de volume de Strength) ;
 *   - raisons d'allègement tracées par Strength (interférence multisport au-delà de la simple trace) ;
 *   - volume hebdomadaire par groupe (bilan Strength existant) — information seulement, jamais augmenté ;
 *   - SIGNAL de récupération : séances de force (Musculation ou bloc de force Cross-training) à moins d'un jour d'écart
 *     sur les mêmes groupes. Aucune règle de récupération entre séances Strength n'est gouvernée
 *     (`same_discipline_recovery`, NON RÉSOLU) : signalé, jamais appliqué.
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { GP_CODES } from '@hybridsport/planner';
import { readStrengthParams, sessionPlannedHardSets, STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } from '@hybridsport/strength';
import type { WeekVolumeAssessment } from '@hybridsport/strength';
import type { AppState, PersistedWeek } from './model.js';
import { strengthContent } from './provisional-content.js';
import { strengthWeekVolume } from './programme.js';
import { daysBetween } from './dates.js';

type Request = PersistedWeek['requests'][number];

export interface StrengthReduction { readonly withSport: string; readonly hours: number; readonly structure: string; readonly level: string; readonly action: string }
export interface StrengthInsight {
  readonly requestId: string;
  readonly date: string;
  readonly archetypeId: string;
  /** Lettre de variante parmi les séances du même archétype de la semaine (null si une seule séance de cet archétype). */
  readonly variant: string | null;
  /** Nombre de variantes distinctes de cet archétype dans la semaine. */
  readonly variants: number;
  /** Exercices des blocs de force (principal puis secondaire). */
  readonly focus: readonly string[];
  /** Séries de travail par groupe musculaire (fonction de volume de Strength). */
  readonly groups: readonly { readonly group: string; readonly sets: number }[];
  readonly reductions: readonly StrengthReduction[];
  /** Variation intra-semaine demandée par la règle TEST_ONLY : obtenue, ou aucune variation gouvernée disponible. */
  readonly variation: 'varied' | 'no_governed_variation' | null;
}
export interface RecoverySignal {
  readonly first: { readonly requestId: string; readonly date: string; readonly kind: 'strength' | 'ct_strength_block' };
  readonly second: { readonly requestId: string; readonly date: string; readonly kind: 'strength' | 'ct_strength_block' };
  readonly groups: readonly string[];
  readonly sameExercises: readonly string[];
  readonly rule: 'same_discipline_recovery';
  readonly status: 'UNRESOLVED';
}
export interface StrengthWeekInsights {
  readonly sessions: readonly StrengthInsight[];
  /** RC5.3 R3 — `deload` : semaine de décharge du mésocycle (volume volontairement réduit). */
  readonly volume: (WeekVolumeAssessment & { readonly deload?: true }) | null;
  readonly recovery: readonly RecoverySignal[];
}

const recordOf = (r: Request): SessionRecord | undefined => {
  if (!r.record) return undefined;
  const d = migrateToCurrent<SessionRecord>(r.record);
  return d.ok ? d.value : undefined;
};
const forceBlocks = (s: SessionDraft) => s.blocks.filter((b) => b.kind === 'strength');
const sourceSport = (src: unknown): string => (typeof src === 'string' ? (src.split(':')[1] ?? '') : '');

/** Lecture de la semaine persistée `weekStart` (null si absente). */
export function strengthWeekInsights(state: AppState, weekStart: string): StrengthWeekInsights | null {
  const week = state.planner.weeks[weekStart];
  if (!week) return null;
  const content = strengthContent();
  const params = readStrengthParams(content.ruleset).values;
  const hard = (s: SessionDraft): Record<string, number> => sessionPlannedHardSets(s, params, content.catalog);
  const planned = week.requests.filter((r) => r.status === 'planned' && r.date)
    .flatMap((r) => { const rec = recordOf(r); return rec ? [{ r, date: r.date ?? '', session: rec.session }] : []; })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.r.requestId < b.r.requestId ? -1 : 1));
  const strength = planned.filter((x) => x.r.sport === 'strength');
  const sig = (s: SessionDraft) => forceBlocks(s).flatMap((b) => b.items.map((i) => i.exerciseId)).join('|');
  const sessions = strength.map((x): StrengthInsight => {
    const archetypeId = x.r.intent?.archetypeId ?? '';
    const same = strength.filter((y) => (y.r.intent?.archetypeId ?? '') === archetypeId);
    const distinct = [...new Set(same.map((y) => sig(y.session)))];
    const variant = same.length > 1 ? String.fromCharCode('A'.charCodeAt(0) + distinct.indexOf(sig(x.session))) : null;
    const reductions = x.r.reasons.filter((q) => q.code === 'PLAN.INTERFERENCE_ASSESSED' && q.params.action !== 'none' && q.params.action !== 'trace')
      .map((q) => ({ withSport: sourceSport(q.params.source), hours: Number(q.params.hours), structure: String(q.params.structure), level: String(q.params.level), action: String(q.params.action) }));
    const v = x.r.reasons.find((q) => q.code === GP_CODES.STRENGTH_WITHIN_WEEK_VARIATION);
    return {
      requestId: x.r.requestId, date: x.date, archetypeId, variant, variants: distinct.length,
      focus: forceBlocks(x.session).flatMap((b) => b.items.map((i) => i.exerciseId)),
      groups: Object.entries(hard(x.session)).filter(([, n]) => n > 0).map(([group, sets]) => ({ group, sets })).sort((a, b) => b.sets - a.sets || (a.group < b.group ? -1 : 1)),
      reductions,
      variation: v ? (v.params.outcome === 'varied' ? 'varied' : 'no_governed_variation') : null,
    };
  });
  // Séances portant de la force : Musculation, et blocs de force délégués des séances Cross-training (C4.3).
  type Force = { readonly requestId: string; readonly date: string; readonly kind: 'strength' | 'ct_strength_block'; readonly session: SessionDraft };
  const force: Force[] = planned.flatMap((x): Force[] => {
    if (x.r.sport === 'strength') return [{ requestId: x.r.requestId, date: x.date, kind: 'strength', session: x.session }];
    const blocks = forceBlocks(x.session);
    return x.r.sport === 'crosstraining' && blocks.length > 0 ? [{ requestId: x.r.requestId, date: x.date, kind: 'ct_strength_block', session: { ...x.session, blocks } }] : [];
  });
  const recovery: RecoverySignal[] = [];
  for (const [i, a] of force.entries()) {
    for (const b of force.slice(i + 1)) {
      if (daysBetween(a.date, b.date) !== 1) continue;
      const ga = hard(a.session); const gb = hard(b.session);
      const groups = Object.keys(ga).filter((g) => (ga[g] ?? 0) > 0 && (gb[g] ?? 0) > 0).sort();
      const ea = new Set(forceBlocks(a.session).flatMap((x) => x.items.map((it) => it.exerciseId)));
      const sameExercises = [...new Set(forceBlocks(b.session).flatMap((x) => x.items.map((it) => it.exerciseId)).filter((e) => ea.has(e)))];
      if (groups.length === 0 && sameExercises.length === 0) continue;
      recovery.push({ first: { requestId: a.requestId, date: a.date, kind: a.kind }, second: { requestId: b.requestId, date: b.date, kind: b.kind }, groups, sameExercises, rule: 'same_discipline_recovery', status: 'UNRESOLVED' });
    }
  }
  return { sessions, volume: strengthWeekVolume(state, weekStart), recovery };
}

/**
 * P1 — fréquences hebdomadaires de Musculation que la règle de composition sait composer (bandes de la règle, sans
 * valeur ajoutée) : au-delà, KAIRO l'affiche comme une limite au lieu de proposer une fréquence non gérée.
 */
export function strengthSupportedFrequencies(): number[] {
  return STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.bands.flatMap((b) => Array.from({ length: b.maxSessions - b.minSessions + 1 }, (_, k) => b.minSessions + k)).sort((a, b) => a - b);
}

/** P1 — lecture pour UNE séance Strength : son explication, les signaux de récupération qui la concernent, le volume. */
export function strengthInsightOf(state: AppState, requestId: string): { readonly insight: StrengthInsight; readonly recovery: readonly RecoverySignal[]; readonly volume: (WeekVolumeAssessment & { readonly deload?: true }) | null } | null {
  const weekStart = Object.entries(state.planner.weeks).find(([, w]) => w.requests.some((r) => r.requestId === requestId))?.[0];
  const all = weekStart ? strengthWeekInsights(state, weekStart) : null;
  const insight = all?.sessions.find((x) => x.requestId === requestId);
  if (!all || !insight) return null;
  return { insight, recovery: all.recovery.filter((r) => r.first.requestId === requestId || r.second.requestId === requestId), volume: all.volume };
}
