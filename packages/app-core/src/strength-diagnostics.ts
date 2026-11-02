/**
 * Reprise RC5 lot 4.3 — DIAGNOSTICS Musculation NON BLOQUANTS (lecture seule). Aucune fonction de ce module ne modifie
 * l'état, une prescription, une série ou un historique, ni ne refuse une séance : elles décrivent.
 *
 * Q2 — volume sur 7 jours glissants : la prescription reste comptée sur la SEMAINE CIVILE (politique 1.1) ; ce diagnostic
 * signale les accumulations aux frontières (dimanche / lundi, retour d'une semaine courte, séance déplacée). Un dépassement
 * glissant n'est PAS une preuve de surentraînement : la borne haute est un repère de programmation (heuristique G2).
 *
 * Q5 — équilibre poussée / tirage : indicateur DESCRIPTIF par schéma (horizontal / vertical), contextualisé par les
 * priorités, le matériel et les substitutions. Aucun ratio universel ; aucune action automatique.
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionRecord } from '@hybridsport/domain';
import { readStrengthParams } from '@hybridsport/strength';
import type { AppState } from './model.js';
import { addDays, weekStartOf } from './dates.js';
import { strengthContent } from './provisional-content.js';
import { strengthWeekVolume } from './programme.js';

// technical-constant: calendrier — longueur d'une date ISO AAAA-MM-JJ, jours d'une semaine, fenêtre glissante (7 jours = date − 6)
const ISO_DATE = 10; const WEEK_DAYS = 7; const WINDOW_BACK = 6;
// technical-constant: affichage — arrondi à une décimale ; rapport arrondi au centième
const DECIMAL = 10; const HUNDREDTH = 100;
// technical-constant: CANDIDATE — semaines de recul par défaut de l'indicateur et minimum pour décrire un équilibre
const LOOKBACK_WEEKS = 4; const MIN_WEEKS = 2;
type Group = string;
interface Contribution { readonly exerciseId: string; readonly sets: number; readonly date: string; readonly source: 'done' | 'planned'; readonly moved: boolean }

const dateOf = (iso: string) => iso.slice(0, ISO_DATE);

function groupsOf(exerciseId: string): { primary: Group[]; secondary: Group[] } {
  const c = strengthContent();
  const e = c.catalog.exercise(exerciseId);
  const cfg = readStrengthParams(c.ruleset).values['strength.volume'].muscleGroups;
  if (!e) return { primary: [], secondary: [] };
  const find = (ms: readonly string[]) => Object.keys(cfg).filter((g) => (cfg[g] ?? []).some((m) => ms.includes(m))).sort();
  const primary = find(e.muscles.primary);
  return { primary, secondary: find(e.muscles.secondary).filter((g) => !primary.includes(g)) };
}

/** Séances prévues (non faites, non manquées) et séries réalisées entre deux dates incluses. */
function contributions(state: AppState, from: string, to: string): Contribution[] {
  const out: Contribution[] = [];
  const results = state.programmeState?.results ?? [];
  const requests = Object.values(state.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength');
  // Réalisé : expositions réelles (séries faites). Séance « déplacée » : réalisée un autre jour que sa date prévue.
  const movedDates = new Set(results.filter((x) => { const r = requests.find((q) => q.requestId === x.requestId); return r?.date !== undefined && x.date !== undefined && x.date !== r.date; }).map((x) => x.date));
  for (const x of state.strength.exposures) {
    const d = dateOf(x.at);
    if (d >= from && d <= to) out.push({ exerciseId: x.exerciseId, sets: x.sets.length, date: d, source: 'done', moved: movedDates.has(d) });
  }
  for (const r of requests) {
    if (r.status !== 'planned' || !r.date || r.date < from || r.date > to || results.some((x) => x.requestId === r.requestId) || !r.record) continue;
    const dec = migrateToCurrent<SessionRecord>(r.record);
    if (!dec.ok) continue;
    for (const it of dec.value.session.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items)) {
      if (it.prescription.type !== 'sets') continue;
      out.push({ exerciseId: it.exerciseId, sets: it.prescription.sets.filter((s) => s.kind !== 'rampup' && s.optional !== true).length, date: r.date, source: 'planned', moved: false });
    }
  }
  return out;
}

export interface RollingGroupDiagnostic {
  readonly group: Group;
  /** Séries où le groupe est PRINCIPAL (catalogue courant). */
  readonly direct: number;
  /** Séries où le groupe est SECONDAIRE (brutes, non pondérées) : estimation, pas une mesure. */
  readonly indirectRaw: number;
  /** Total selon la politique COURANTE (principal 1, secondaire × poids du ruleset). */
  readonly total: number;
  readonly target: number | null; readonly high: number | null;
  readonly aboveHigh: boolean;
  readonly causes: readonly ('calendar_week_above' | 'week_transition' | 'moved_session' | 'synergist_accumulation' | 'planned_not_done')[];
}
export interface RollingVolumeDiagnostic { readonly windowStart: string; readonly windowEnd: string; readonly groups: readonly RollingGroupDiagnostic[]; readonly note: string }

/** Q2 — fenêtre [date − 6 j ; date] : réalisé + prévu non fait. Lecture seule. */
export function rollingVolumeDiagnostic(state: AppState, date: string): RollingVolumeDiagnostic {
  const from = addDays(date, -WINDOW_BACK);
  const items = contributions(state, from, date);
  const w = readStrengthParams(strengthContent().ruleset).values['strength.volume'].secondaryWeight;
  const vol = strengthWeekVolume(state, weekStartOf(date)) ?? strengthWeekVolume(state, weekStartOf(from));
  const acc = new Map<Group, { direct: number; indirect: number; byWeek: Map<string, number>; moved: boolean; planned: boolean }>();
  for (const c of items) {
    const g = groupsOf(c.exerciseId);
    const add = (grp: Group, d: number, i: number) => {
      const a = acc.get(grp) ?? { direct: 0, indirect: 0, byWeek: new Map(), moved: false, planned: false };
      a.direct += d; a.indirect += i;
      const wk = weekStartOf(c.date);
      a.byWeek.set(wk, (a.byWeek.get(wk) ?? 0) + d + i * w);
      a.moved ||= c.moved; a.planned ||= c.source === 'planned';
      acc.set(grp, a);
    };
    for (const p of g.primary) add(p, c.sets, 0);
    for (const s of g.secondary) add(s, 0, c.sets);
  }
  const groups = [...acc.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([group, a]): RollingGroupDiagnostic => {
    const v = vol?.groups.find((x) => x.group === group);
    const total = Math.round((a.direct + a.indirect * w) * DECIMAL) / DECIMAL;
    const high = v?.high ?? null;
    const above = high !== null && total > high;
    const causes: RollingGroupDiagnostic['causes'][number][] = [];
    if (above) {
      const weekTotals = [...a.byWeek.values()];
      if (weekTotals.some((x) => high !== null && x > high)) causes.push('calendar_week_above');
      else if (a.byWeek.size > 1) causes.push('week_transition');
      if (a.moved) causes.push('moved_session');
      if (a.direct <= high) causes.push('synergist_accumulation');
      if (a.planned) causes.push('planned_not_done');
    }
    return { group, direct: a.direct, indirectRaw: a.indirect, total, target: v?.target ?? null, high, aboveHigh: above, causes };
  });
  return { windowStart: from, windowEnd: date, groups, note: 'Indicatif : la prescription reste comptée sur la semaine civile ; un dépassement glissant n’est pas une preuve de surentraînement.' };
}

export const PUSH_PULL_PATTERNS = ['push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical'] as const;
type Pattern = (typeof PUSH_PULL_PATTERNS)[number];
// technical-constant: CANDIDATE — bande DESCRIPTIVE du rapport poussée / tirage (non validée, aucun effet sur les prescriptions)
export const PUSH_PULL_DESCRIPTIVE_BAND = { low: 2 / 3, high: 1.5 } as const;
// technical-constant: CANDIDATE — nombre de semaines consécutives hors bande avant de parler de déséquilibre « persistant »
export const PUSH_PULL_PERSISTENT_WEEKS = 3;

export interface PushPullWeek { readonly weekStart: string; readonly sets: Readonly<Record<Pattern, number>>; readonly indirect: Readonly<Record<Pattern, number>>; readonly frequency: Readonly<Record<Pattern, number>>; readonly ratio: number | null }
export interface PushPullIndicator {
  readonly weeks: readonly PushPullWeek[];
  /** Schémas sans aucun exercice possible avec le matériel et les exclusions déclarés. */
  readonly unavailable: readonly Pattern[];
  readonly substitutions: number;
  /** Orientation attendue d'après les priorités déclarées (dos ⇒ tirage ; pectoraux ⇒ poussée ; épaules : neutre). */
  readonly expected: 'pull' | 'push' | 'neutral';
  readonly status: 'insufficient_data' | 'balanced' | 'explained_by_priority' | 'explained_by_equipment' | 'pattern_missing' | 'persistent_imbalance';
  readonly message: string;
}

/** Q5 — semaines planifiées se terminant par `weekStart` (incluse), au plus `lookback`. Lecture seule. */
export function pushPullIndicator(state: AppState, weekStart: string, lookback = LOOKBACK_WEEKS): PushPullIndicator {
  const c = strengthContent();
  const zero = () => Object.fromEntries(PUSH_PULL_PATTERNS.map((p) => [p, 0])) as Record<Pattern, number>;
  const weeks: PushPullWeek[] = [];
  let substitutions = 0;
  for (let k = lookback - 1; k >= 0; k--) {
    const ws = addDays(weekStart, -WEEK_DAYS * k);
    const reqs = (state.planner.weeks[ws]?.requests ?? []).filter((r) => r.sport === 'strength' && r.status === 'planned' && r.record);
    if (reqs.length === 0) continue;
    const sets = zero(); const indirect = zero(); const frequency = zero();
    for (const r of reqs) {
      const dec = migrateToCurrent<SessionRecord>(r.record as never);
      if (!dec.ok) continue;
      const seen = new Set<Pattern>();
      for (const it of dec.value.session.blocks.flatMap((b) => b.items)) {
        if (it.prescription.type !== 'sets') continue;
        if ((it.refs as { prescriptionSource?: string } | undefined)?.prescriptionSource === 'substitution') substitutions += 1;
        const e = c.catalog.exercise(it.exerciseId);
        if (!e) continue;
        const n = it.prescription.sets.filter((s) => s.kind !== 'rampup' && s.optional !== true).length;
        const p = e.patterns.primary as Pattern;
        if ((PUSH_PULL_PATTERNS as readonly string[]).includes(p)) { sets[p] += n; seen.add(p); }
        for (const q of e.patterns.secondary) if ((PUSH_PULL_PATTERNS as readonly string[]).includes(q) && q !== p) indirect[q as Pattern] += n;
      }
      for (const p of seen) frequency[p] += 1;
    }
    const push = sets.push_horizontal + sets.push_vertical; const pull = sets.pull_horizontal + sets.pull_vertical;
    weeks.push({ weekStart: ws, sets, indirect, frequency, ratio: pull === 0 ? null : Math.round((push / pull) * HUNDREDTH) / HUNDREDTH });
  }
  const p = state.profile;
  const equipment = new Set(p?.equipment.items ?? []);
  const excluded = new Set([...(p?.excludedExercises ?? []), ...(p?.strength.personalization?.avoidExercises ?? [])]);
  const unavailable = PUSH_PULL_PATTERNS.filter((pat) => !c.catalog.activeExercises().some((e) => e.patterns.primary === pat && !excluded.has(e.id) && c.catalog.isFeasibleWith(e, equipment)));
  const zones = (p?.strength.personalization?.priorities ?? []).map((z) => z.zone as string);
  // Zone « épaules » : surtout des élévations latérales (isolation, ni poussée ni tirage) ⇒ neutre. Dos seul ⇒ tirage attendu ;
  // pectoraux seuls ⇒ poussée attendue ; dos ET pectoraux ⇒ neutre.
  const expected: PushPullIndicator['expected'] = zones.includes('back') && !zones.includes('chest') ? 'pull' : zones.includes('chest') && !zones.includes('back') ? 'push' : 'neutral';
  let run = 0; let longest = 0; let direction: 'push' | 'pull' | null = null;
  for (const w of weeks) {
    const out = w.ratio === null ? null : w.ratio > PUSH_PULL_DESCRIPTIVE_BAND.high ? 'push' : w.ratio < PUSH_PULL_DESCRIPTIVE_BAND.low ? 'pull' : null;
    run = out !== null && (direction === null || out === direction) ? run + 1 : out !== null ? 1 : 0;
    direction = out ?? direction;
    longest = Math.max(longest, run);
  }
  const available = PUSH_PULL_PATTERNS.filter((x) => !unavailable.includes(x));
  const missing = weeks.length >= MIN_WEEKS ? available.filter((x) => weeks.every((w) => w.sets[x] === 0)) : [];
  const status: PushPullIndicator['status'] = weeks.length < MIN_WEEKS ? 'insufficient_data'
    : unavailable.length > 0 ? 'explained_by_equipment'
      : missing.length > 0 ? 'pattern_missing'
        : longest >= PUSH_PULL_PERSISTENT_WEEKS && direction !== null && direction === expected ? 'explained_by_priority'
          : longest >= PUSH_PULL_PERSISTENT_WEEKS ? 'persistent_imbalance' : 'balanced';
  const label: Record<Pattern, string> = { push_horizontal: 'poussée horizontale', push_vertical: 'poussée verticale', pull_horizontal: 'tirage horizontal', pull_vertical: 'tirage vertical' };
  const message = {
    insufficient_data: 'Pas encore assez de semaines planifiées pour décrire l’équilibre.',
    balanced: 'Poussées et tirages sont répartis de façon comparable sur les dernières semaines.',
    explained_by_priority: `Les ${direction === 'pull' ? 'tirages' : 'poussées'} dominent, conformément aux zones prioritaires choisies.`,
    explained_by_equipment: `Avec le matériel déclaré, aucun exercice de ${unavailable.map((x) => label[x]).join(', ')} n’est disponible.`,
    pattern_missing: `Aucune série de ${missing.map((x) => label[x]).join(', ')} sur les dernières semaines, alors que des exercices sont disponibles.`,
    persistent_imbalance: `Les ${direction === 'pull' ? 'tirages' : 'poussées'} dominent depuis ${String(longest)} semaines ; à examiner sur la durée, sans changement automatique.`,
  }[status];
  return { weeks, unavailable, substitutions, expected, status, message };
}
