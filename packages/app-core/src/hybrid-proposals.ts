/**
 * Reprise RC5 lot 4.3 (Q3 / Q7) — PROPOSITIONS de replanification de la semaine courante, PROTOTYPE non branché à
 * l'interface. Lecture seule : aucune fonction de ce module n'écrit l'état ; l'application passe exclusivement par
 * `applyHybridProposal`, qui exige `confirmed: true` et revérifie la proposition (transaction `confirmStrengthWeekReplan`,
 * garde de péremption existante).
 *
 * Stratégies essayées dans l'ordre demandé (lot 4.3 § 6), chacune avec le moteur et le planificateur EXISTANTS :
 * 1. `other_day`        : autre jour autorisé après un refus pour récupération (option `recoveryRetry`, Q7) ;
 * 2. `permutation`      : permutation des séances non commencées (exploration existante des jours de repos) ;
 * 3. `alternate_region` : semaine courte, région non placée alternée d'une semaine à l'autre ;
 * 4. `upper_lower_full` : semaine courte composée Haut / Bas / Full Body ;
 * 5. `full_body`        : semaine courte en Full Body, retenue seulement si la récupération est respectée.
 * Une proposition qui viole la récupération (même région, ou Full Body, à moins de `recoveryHours`) est marquée NON SÛRE
 * et n'est jamais recommandée. Aucun jour n'est inventé (jours disponibles seulement) ; séances commencées, terminées ou
 * passées protégées (`protectedWeekRequests`) ; autres sports conservés ou non dégradés ; déterministe.
 */
import { AppError } from './errors.js';
import type { Clock } from './app.js';
import type { AppState, PersistedWeek, ProfileInput } from './model.js';
import { addDays, weekStartOf } from './dates.js';
import { strengthWeekVolume } from './programme.js';
import type { ProgrammeEnvironment } from './programme.js';
import { strengthParametersFor } from './strength-personalization.js';
import { confirmStrengthWeekReplan, previewStrengthWeekReplan } from './strength-replan.js';
import type { WeekReplanPreview } from './strength-replan.js';

// technical-constant: conversion millisecondes → heures
const HOUR_MS = 3_600_000;
// technical-constant: calendrier — jours d'une semaine, dernier jour (lundi + 6), longueur d'une date ISO AAAA-MM-JJ
const WEEK_DAYS = 7; const LAST_DAY = 6; const ISO_DATE = 10;
// technical-constant: affichage — arrondi à une décimale
const DECIMAL = 10;
export const HYBRID_STRATEGIES = ['other_day', 'permutation', 'alternate_region', 'upper_lower_full', 'full_body'] as const;
export type HybridStrategy = (typeof HYBRID_STRATEGIES)[number];

const LABEL: Readonly<Record<HybridStrategy, string>> = {
  other_day: 'Autre jour autorisé après un refus pour récupération',
  permutation: 'Réorganisation des séances non commencées',
  alternate_region: 'Alternance de la région non planifiée d’une semaine à l’autre',
  upper_lower_full: 'Trois séances : Haut, Bas, puis Full Body',
  full_body: 'Trois séances Full Body',
};

type Request = PersistedWeek['requests'][number];
export type ChangeKind = 'kept' | 'moved' | 'replaced' | 'added' | 'unplanned' | 'removed';
export interface ProposalChange { readonly kind: ChangeKind; readonly sport: string; readonly before?: { readonly date: string; readonly archetypeId?: string }; readonly after?: { readonly date: string; readonly archetypeId?: string }; readonly reason: string }
export interface WeekSummary {
  readonly strengthPlanned: number; readonly otherPlanned: number;
  readonly regions: { readonly upper: number; readonly lower: number; readonly full: number };
  /** Écart minimal (h) entre deux séances Musculation de la même région (Full Body compte pour toutes) ; null si une seule. */
  readonly minRegionGapH: number | null;
  /** Séries prévues sous la cible, somme sur les groupes (moins = mieux). */
  readonly belowTarget: number;
  readonly groups: Readonly<Record<string, { readonly planned: number; readonly target: number | null }>>;
}
export interface HybridProposal {
  readonly strategy: HybridStrategy; readonly label: string;
  readonly status: 'valid' | 'unsafe_recovery' | 'no_improvement' | 'unavailable';
  readonly detail?: string;
  readonly summary?: WeekSummary;
  readonly changes: readonly ProposalChange[];
  /** Aperçu jetable (jamais écrit) ; absent si la stratégie n'a rien produit. */
  readonly preview?: WeekReplanPreview;
}
export interface HybridProposals {
  readonly weekStart: string; readonly current: WeekSummary;
  /** Toutes les stratégies, dans l'ordre essayé (explications comprises). */
  readonly proposals: readonly HybridProposal[];
  /** Meilleure proposition SÛRE et strictement meilleure que le planning actuel ; absente sinon. */
  readonly recommended?: HybridStrategy;
}

/** Environnement de la stratégie (copie ; l'environnement reçu n'est jamais modifié). */
export function strategyEnvironment(env: ProgrammeEnvironment, strategy: HybridStrategy): ProgrammeEnvironment {
  if (strategy === 'other_day') return { ...env, recoveryRetry: true };
  if (strategy === 'permutation') return env;
  const rule = env.strength?.composition?.rule;
  if (!env.strength || !rule) return env;
  return { ...env, strength: { ...env.strength, composition: { rule: { ...rule, version: `${rule.version}.proposal-${strategy}`, bands: rule.bands.map((b) => ({ ...b, shortWeek: strategy })) } } } };
}

const regionOf = (a: string | undefined) => (a === undefined ? 'full' : /^str_upper/.test(a) ? 'upper' : /^str_lower/.test(a) ? 'lower' : 'full');
const hoursBetween = (a: string, b: string) => Math.abs(Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / HOUR_MS;

function summarize(state: AppState, weekStart: string): WeekSummary {
  const w = state.planner.weeks[weekStart];
  const reqs = w?.requests ?? [];
  const st = reqs.filter((r) => r.sport === 'strength' && r.status === 'planned' && r.date);
  const regions = { upper: 0, lower: 0, full: 0 };
  for (const r of st) regions[regionOf(r.intent?.archetypeId)] += 1;
  // Séance Musculation de la semaine précédente (dernière prévue ou faite) : la récupération traverse la frontière.
  const prevWeek = state.planner.weeks[addDays(weekStart, -WEEK_DAYS)];
  const prev = (prevWeek?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned' && r.date && state.programmeState?.results.find((x) => x.requestId === r.requestId)?.completion !== 'missed');
  // Séances RÉELLEMENT faites (expositions) dans les 7 jours précédant la semaine et pendant celle-ci : région déduite de
  // l'emplacement (`up.`/`ua.`/`ub.` Haut, `lo.`/`la.`/`lb.` Bas, sinon Full Body). Indispensable : les gardes du moteur ne
  // contrôlent pas une séance Full Body dans une semaine demandée à 4 séances (document 10, Q3).
  const slotRegion = (slot: string | undefined) => (slot === undefined ? 'full' : /^(up|ua|ub)\./.test(slot) ? 'upper' : /^(lo|la|lb)\./.test(slot) ? 'lower' : 'full');
  const from = addDays(weekStart, -WEEK_DAYS); const to = addDays(weekStart, LAST_DAY);
  const done = state.strength.exposures.filter((x) => x.at.slice(0, ISO_DATE) >= from && x.at.slice(0, ISO_DATE) <= to).map((x) => ({ date: x.at.slice(0, ISO_DATE), region: slotRegion(x.slotId) }));
  const all = [...prev.map((r) => ({ date: r.date as string, region: regionOf(r.intent?.archetypeId) })), ...st.map((r) => ({ date: r.date as string, region: regionOf(r.intent?.archetypeId) })), ...done]
    .filter((x, i, xs) => xs.findIndex((y) => y.date === x.date && y.region === x.region) === i).sort((a, b) => (a.date < b.date ? -1 : 1));
  let minGap: number | null = null;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i]; const b = all[j];
    if (!a || !b || a.date === b.date || (a.region !== b.region && a.region !== 'full' && b.region !== 'full')) continue;
    if (a.date < weekStart && b.date < weekStart) continue;
    const h = hoursBetween(a.date, b.date);
    if (minGap === null || h < minGap) minGap = h;
  }
  const vol = strengthWeekVolume(state, weekStart);
  const groups = Object.fromEntries((vol?.groups ?? []).map((g) => [g.group, { planned: g.planned, target: g.target }]));
  const belowTarget = (vol?.groups ?? []).reduce((n, g) => n + (g.target !== null ? Math.max(0, g.target - g.planned) : 0), 0);
  return { strengthPlanned: st.length, otherPlanned: reqs.filter((r) => r.sport !== 'strength' && r.status === 'planned').length, regions, minRegionGapH: minGap, belowTarget: Math.round(belowTarget * DECIMAL) / DECIMAL, groups };
}

function diff(before: readonly Request[], after: readonly Request[], strategy: HybridStrategy): ProposalChange[] {
  const out: ProposalChange[] = [];
  const used = new Set<string>();
  const key = (r: Request) => `${r.sport}|${r.date ?? ''}`;
  for (const b of before.filter((r) => r.status === 'planned' && r.date)) {
    const same = after.find((a) => a.status === 'planned' && key(a) === key(b) && !used.has(a.requestId));
    const bb = { date: b.date as string, ...(b.intent?.archetypeId ? { archetypeId: b.intent.archetypeId } : {}) };
    if (same) {
      used.add(same.requestId);
      const kind: ChangeKind = (same.intent?.archetypeId ?? '') === (b.intent?.archetypeId ?? '') ? 'kept' : 'replaced';
      out.push({ kind, sport: b.sport, before: bb, after: { date: same.date as string, ...(same.intent?.archetypeId ? { archetypeId: same.intent.archetypeId } : {}) }, reason: kind === 'kept' ? 'Inchangée.' : `Composition modifiée : ${LABEL[strategy]}.` });
      continue;
    }
    const moved = after.find((a) => a.status === 'planned' && a.sport === b.sport && (a.intent?.archetypeId ?? '') === (b.intent?.archetypeId ?? '') && !used.has(a.requestId) && !before.some((x) => x.status === 'planned' && key(x) === key(a)));
    if (moved) { used.add(moved.requestId); out.push({ kind: 'moved', sport: b.sport, before: bb, after: { date: moved.date as string, ...(moved.intent?.archetypeId ? { archetypeId: moved.intent.archetypeId } : {}) }, reason: `Déplacée : ${LABEL[strategy]}.` }); continue; }
    out.push({ kind: 'removed', sport: b.sport, before: bb, reason: 'Non reprise dans la proposition.' });
  }
  for (const a of after.filter((r) => r.status === 'planned' && r.date && !used.has(r.requestId))) out.push({ kind: 'added', sport: a.sport, after: { date: a.date as string, ...(a.intent?.archetypeId ? { archetypeId: a.intent.archetypeId } : {}) }, reason: `Placée : ${LABEL[strategy]}.` });
  for (const a of after.filter((r) => r.status !== 'planned')) out.push({ kind: 'unplanned', sport: a.sport, reason: `Toujours non planifiée (${a.category ?? 'sans jour compatible'}) : aucun créneau n'est inventé.` });
  return out;
}

/** Rang lexicographique (plus grand = meilleur) : séances Musculation, autres sports, équilibre des régions, déficit. */
function rank(s: WeekSummary): number[] {
  const balance = Math.min(s.regions.upper + s.regions.full, s.regions.lower + s.regions.full);
  return [s.strengthPlanned, s.otherPlanned, balance, -s.belowTarget];
}
const better = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) { const x = a[i] ?? 0; const y = b[i] ?? 0; if (x !== y) return x > y; } return false; };

/** Propositions pour la semaine courante (lecture seule). */
export function proposeHybridWeekAlternatives(state: AppState, clock: Clock, env: ProgrammeEnvironment): HybridProposals {
  const p = state.profile;
  if (!p) throw new AppError('PROFILE_MISSING');
  const weekStart = weekStartOf(clock.today);
  const current = summarize(state, weekStart);
  const recoveryH = strengthParametersFor(p)['strength.personalization']?.recoveryHours ?? 0;
  const before = state.planner.weeks[weekStart]?.requests ?? [];
  const proposals: HybridProposal[] = [];
  let best: { strategy: HybridStrategy; r: number[] } | undefined;
  for (const strategy of HYBRID_STRATEGIES) {
    let preview: WeekReplanPreview;
    try {
      preview = previewStrengthWeekReplan(state, p as ProfileInput, clock, strategyEnvironment(env, strategy));
    } catch (e) {
      proposals.push({ strategy, label: LABEL[strategy], status: 'unavailable', detail: e instanceof AppError ? e.code : 'ERROR', changes: [] });
      continue;
    }
    const summary = summarize(preview.next, weekStart);
    const changes = diff(before, preview.after.requests, strategy);
    const otherLost = summary.otherPlanned < current.otherPlanned;
    const unsafe = summary.minRegionGapH !== null && summary.minRegionGapH < recoveryH;
    const r = rank(summary);
    const improves = better(r, rank(current));
    const status: HybridProposal['status'] = unsafe ? 'unsafe_recovery' : otherLost || !improves ? 'no_improvement' : 'valid';
    const detail = unsafe ? `Récupération non respectée : ${String(summary.minRegionGapH)} h entre deux séances sollicitant la même région (minimum ${String(recoveryH)} h).` : otherLost ? 'Un autre sport perdrait une séance.' : !improves ? 'Aucun gain face au planning actuel.' : undefined;
    proposals.push({ strategy, label: LABEL[strategy], status, ...(detail ? { detail } : {}), summary, changes, preview });
    if (status === 'valid' && (!best || better(r, best.r))) best = { strategy, r };
  }
  return { weekStart, current, proposals, ...(best ? { recommended: best.strategy } : {}) };
}

/**
 * Application d'une proposition : SEULEMENT avec `confirmed: true` (« Appliquer le nouveau planning ») ; sinon erreur
 * `REPLAN_CONFIRMATION_REQUIRED` et aucun changement (« Conserver mon planning » = ne rien appeler). La proposition est
 * régénérée et comparée (garde de péremption) ; une proposition non sûre n'est jamais appliquée.
 */
export function applyHybridProposal(state: AppState, proposal: HybridProposal, clock: Clock, confirmed: boolean, env: ProgrammeEnvironment): AppState {
  if (!confirmed) throw new AppError('REPLAN_CONFIRMATION_REQUIRED');
  if (proposal.status !== 'valid' || !proposal.preview) throw new AppError('REPLAN_NOT_ALLOWED');
  return confirmStrengthWeekReplan(state, proposal.preview, clock, true, strategyEnvironment(env, proposal.strategy));
}
