/**
 * Reprise RC5 lot 4.2 — BANC D'ARBITRAGE (TEST_ONLY). Réutilise le banc du lot 4.1 (`lot41-bench.ts`, mêmes profils,
 * même athlète à capacité réelle) et ajoute :
 * - des VARIANTES de contenu de simulation (jamais inscrites au registre, jamais proposées à l'utilisateur) pour comparer
 *   des règles NON ACTIVÉES : décompte des synergistes (Q1), départage du volume (Q4), semaine courte (Q3), sonde de
 *   placement historique (Q6) ;
 * - des mesures DESCRIPTIVES : volume direct / indirect séparés (Q1), fenêtre glissante de 7 jours (Q2), poussée / tirage
 *   horizontal et vertical (Q5), interférences HYROX (Q6).
 * Les estimations biomécaniques (direct / indirect) sont des CONVENTIONS de décompte, jamais des mesures physiologiques.
 */
import type { Exercise } from '@hybridsport/domain';
import { loadCatalog, loadRuleset } from '@hybridsport/engine';
import { readStrengthParams, STRENGTH_WEEKLY_COMPOSITION_CANDIDATE } from '@hybridsport/strength';
import type { StrengthCompositionRule } from '@hybridsport/strength';
import { beta0Environment, personalizedStrengthContent, strengthContent, strengthWeekVolume, updateStrengthPersonalization } from '../../src/index.js';
import type { ProfileInput, ProgrammeEnvironment, StrengthPersonalization } from '../../src/index.js';
import { mondayOf, simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec, SimOut } from '../rc4-audit/rc4-sim.js';
import { lot41Athlete, lot41Specs, measureLot41 } from './lot41-bench.js';
import type { Lot41Measure } from './lot41-bench.js';
import { profileOf, WEEKS } from './lot4-profiles.js';

/** Variante de simulation : chaque champ absent = comportement du lot 4.1. */
export interface Lot42Variant {
  readonly id: string;
  readonly label: string;
  /** Q1 — reclassement des synergistes des polyarticulaires (catalogue de simulation). */
  readonly synergists?: 'arms' | 'arms_glutes_knee';
  /** Q1 (C) — poids des contributions secondaires (sensibilité ; 0,5 dans le contenu actuel). */
  readonly secondaryWeight?: number;
  /** Q4 — départage du critère `volume_fit` par déficit relatif. */
  readonly volumeFitTieBreak?: 'relative_deficit';
  /** Q2 — borne haute aussi sur 7 jours glissants. */
  readonly highWindow?: 'calendar_and_rolling';
  /** Q3 — semaine courte : alternance de la région non placée. */
  readonly shortWeek?: 'alternate_region';
  /** Q6 — sonde de placement historique. */
  readonly placementProbe?: 'first';
}

const ARMS = ['biceps', 'triceps'];
/** Q1 (B) — classification biomécanique : bras SYNERGISTES des poussées et tirages polyarticulaires ; fessiers des exercices à dominante genou (option 2). */
export function reclassify(e: Exercise, mode: NonNullable<Lot42Variant['synergists']>): Exercise {
  if (!e.compound) return e;
  const p = e.patterns.primary;
  const moved = /^(push|pull)_/.test(p) ? ARMS : mode === 'arms_glutes_knee' && /^(squat|lunge)$/.test(p) ? ['glutes'] : [];
  const out = e.muscles.primary.filter((m) => moved.includes(m));
  if (out.length === 0 || out.length === e.muscles.primary.length) return e;
  return { ...e, muscles: { primary: e.muscles.primary.filter((m) => !moved.includes(m)), secondary: [...new Set([...e.muscles.secondary, ...out])] } };
}

const envCache = new Map<string, ProgrammeEnvironment>();
/** Environnement de simulation de la variante (contenu personnalisé dérivé, versions suffixées `sim-…`, hors registre). */
export function variantEnv(v: Lot42Variant): ProgrammeEnvironment {
  const hit = envCache.get(v.id);
  if (hit) return hit;
  const env = beta0Environment();
  if (!env.strength) throw new Error('environnement Strength attendu');
  const touchesContent = v.synergists !== undefined || v.secondaryWeight !== undefined || v.volumeFitTieBreak !== undefined || v.highWindow !== undefined;
  let strength = env.strength;
  if (touchesContent) {
    const p = personalizedStrengthContent(strengthContent());
    const doc = p.ruleset.document;
    const tag = `sim-${v.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const parameters = doc.parameters.map((x) => {
      if (x.id === 'strength.volume' && v.secondaryWeight !== undefined) return { ...x, value: { ...(x.value as object), secondaryWeight: v.secondaryWeight } };
      if (x.id === 'strength.personalization' && (v.volumeFitTieBreak !== undefined || v.highWindow !== undefined)) return { ...x, value: { ...(x.value as object), ...(v.volumeFitTieBreak ? { volumeFitTieBreak: v.volumeFitTieBreak } : {}), ...(v.highWindow ? { highWindow: v.highWindow } : {}) } };
      return x;
    });
    const r = loadRuleset({ ...doc, rulesetVersion: `${p.ruleset.version}.${tag}`, parameters } as never);
    if (!r.ok) throw new Error(`variante ${v.id} : ruleset invalide ${JSON.stringify(r.issues)}`);
    let catalog = p.catalog;
    if (v.synergists) {
      const cd = p.catalog.document;
      const c = loadCatalog({ ...cd, catalogVersion: `${cd.catalogVersion}${cd.catalogVersion.includes('-') ? '.' : '-'}${tag}`, exercises: cd.exercises.map((e) => reclassify(e, v.synergists ?? 'arms')) });
      if (!c.ok) throw new Error(`variante ${v.id} : catalogue invalide ${JSON.stringify(c.issues)}`);
      catalog = c.catalog;
    }
    strength = { ...strength, content: { ...strength.content, ruleset: r.ruleset, catalog } as typeof strength.content };
  }
  if (v.shortWeek) {
    const rule: StrengthCompositionRule = { ...STRENGTH_WEEKLY_COMPOSITION_CANDIDATE, version: `${STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.version}.sim-shortweek`, bands: STRENGTH_WEEKLY_COMPOSITION_CANDIDATE.bands.map((b) => ({ ...b, shortWeek: v.shortWeek })) };
    strength = { ...strength, composition: { rule } };
  }
  if (v.placementProbe) strength = { ...strength, placementProbe: v.placementProbe };
  const out = { ...env, strength };
  envCache.set(v.id, out);
  return out;
}

export const VARIANTS: readonly Lot42Variant[] = [
  { id: 'A', label: 'A — décompte actuel (lot 4.1)' },
  { id: 'B1', label: 'B1 — bras synergistes des poussées / tirages polyarticulaires', synergists: 'arms' },
  { id: 'B2', label: 'B2 — B1 + fessiers synergistes des exercices à dominante genou', synergists: 'arms_glutes_knee' },
  { id: 'C25', label: 'C — B1, poids indirect 0,25 (sensibilité)', synergists: 'arms', secondaryWeight: 0.25 },
  { id: 'C75', label: 'C — B1, poids indirect 0,75 (sensibilité)', synergists: 'arms', secondaryWeight: 0.75 },
  { id: 'Q4', label: 'Q4 — départage `volume_fit` par déficit relatif', volumeFitTieBreak: 'relative_deficit' },
  { id: 'Q2', label: 'Q2 — borne haute aussi sur 7 jours glissants', highWindow: 'calendar_and_rolling' },
  { id: 'Q3', label: 'Q3 — semaine courte : région non placée alternée', shortWeek: 'alternate_region' },
  { id: 'H', label: 'Q6 — sonde de placement historique (avant 4.1)', placementProbe: 'first' },
];

/** Mesures du lot 4.2, en plus de celles du lot 4.1 (même yardstick : décompte ACTUEL du registre). */
export interface Lot42Measure extends Lot41Measure {
  readonly variant: string;
  /** Séries prévues par semaine comptées selon la CONVENTION de la variante (catalogue et poids de la variante). */
  readonly variantCount: Readonly<Record<string, number>>;
  /** Séries par semaine : DIRECTES (groupe moteur principal selon la classification biomécanique B1) et INDIRECTES (brutes, non pondérées). */
  readonly directIndirect: Readonly<Record<string, { readonly direct: number; readonly indirect: number }>>;
  /** Q2 — réalisé : maximum sur 7 jours glissants et maximum par semaine civile ; jours où le glissant dépasse la borne haute. */
  readonly rolling: Readonly<Record<string, { readonly maxRolling: number; readonly maxCalendar: number; readonly daysAboveHigh: number }>>;
  /** Q5 — séries directes prévues par semaine et fréquence (séances / semaine) par schéma ; semaines hors bande descriptive. */
  readonly pushPull: { readonly perPattern: Readonly<Record<string, { readonly sets: number; readonly frequency: number }>>; readonly weeklyRatio: readonly (number | null)[]; readonly longestOutsideBand: number };
  /** Répartition Haut / Bas des séances PLANIFIÉES (Full Body compté à part). */
  readonly regions: { readonly upper: number; readonly lower: number; readonly full: number; readonly unplacedUpper: number; readonly unplacedLower: number };
  /** Q6 — interférences relevées sur les séances Musculation (raisons tracées). */
  readonly interference: { readonly assessedModerateOrHigh: number; readonly hyroxPlanned: number };
}

const avg = (xs: readonly number[]) => (xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);
// technical-constant: TEST_ONLY — bande DESCRIPTIVE candidate du rapport poussée / tirage (non validée, aucun effet sur les prescriptions)
export const PUSH_PULL_BAND = { low: 2 / 3, high: 1.5 };
const DAY = 86_400_000;

export function measureLot42(spec: ProfileSpec, variant: Lot42Variant = VARIANTS[0] as Lot42Variant): Lot42Measure {
  const env = variantEnv(variant);
  const r: SimOut = simulate(spec, WEEKS, env);
  const base = measureLot41(spec, r);
  const rows = r.sessions.filter((x) => x.sport === 'strength');
  const content = strengthContent();
  const groupsCfg = readStrengthParams(content.ruleset).values['strength.volume'].muscleGroups;
  const toGroups = (ms: readonly string[]) => new Set(Object.entries(groupsCfg).filter(([, xs]) => xs.some((m) => ms.includes(m))).map(([g]) => g));
  // Direct / indirect : classification biomécanique B1, appliquée aux séries PRÉVUES (montées exclues par le banc).
  const di: Record<string, { direct: number; indirect: number }> = {};
  for (const x of rows.filter((y) => y.status === 'planned')) for (const e of x.exercises) {
    const ex = content.catalog.exercise(`ex.${e.id}`);
    if (!ex) continue;
    const b = reclassify(ex, 'arms');
    const prim = toGroups(b.muscles.primary);
    for (const g of prim) (di[g] ??= { direct: 0, indirect: 0 }).direct += e.sets;
    for (const g of toGroups(b.muscles.secondary)) if (!prim.has(g)) (di[g] ??= { direct: 0, indirect: 0 }).indirect += e.sets;
  }
  // Décompte selon la convention de la variante (son catalogue, son poids secondaire).
  const vc = env.strength?.content as typeof content | undefined;
  const vw = readStrengthParams((vc ?? content).ruleset).values['strength.volume'].secondaryWeight;
  const vcount: Record<string, number> = {};
  for (const x of rows.filter((y) => y.status === 'planned')) for (const e of x.exercises) {
    const ex = (vc ?? content).catalog.exercise(`ex.${e.id}`);
    if (!ex) continue;
    const prim = toGroups(ex.muscles.primary);
    for (const g of prim) vcount[g] = (vcount[g] ?? 0) + e.sets;
    for (const g of toGroups(ex.muscles.secondary)) if (!prim.has(g)) vcount[g] = (vcount[g] ?? 0) + e.sets * vw;
  }
  const variantCount = Object.fromEntries(Object.entries(vcount).sort().map(([g, n]) => [g, Math.round((n / WEEKS) * 10) / 10]));
  const directIndirect = Object.fromEntries(Object.entries(di).sort().map(([g, v]) => [g, { direct: Math.round((v.direct / WEEKS) * 10) / 10, indirect: Math.round((v.indirect / WEEKS) * 10) / 10 }]));
  // Q2 — fenêtre glissante sur le RÉALISÉ (séances faites, décompte du registre).
  const done = rows.filter((x) => x.executed === 'réalisée' && x.date).map((x) => ({ t: Date.parse(`${x.date as string}T00:00:00Z`), g: x.groups }));
  const start = Date.parse(`${mondayOf(0)}T00:00:00Z`);
  const rolling: Record<string, { maxRolling: number; maxCalendar: number; daysAboveHigh: number }> = {};
  for (const [g, v] of Object.entries(base.volume)) {
    let maxR = 0; let above = 0; let maxC = 0;
    for (let d = 0; d < WEEKS * 7; d++) {
      const t = start + d * DAY;
      const sum = done.filter((x) => x.t <= t && x.t > t - 7 * DAY).reduce((n, x) => n + (x.g[g] ?? 0), 0);
      maxR = Math.max(maxR, sum);
      if (v.high !== null && sum > v.high + 1e-9) above += 1;
    }
    for (let w = 0; w < WEEKS; w++) maxC = Math.max(maxC, done.filter((x) => x.t >= start + w * 7 * DAY && x.t < start + (w + 1) * 7 * DAY).reduce((n, x) => n + (x.g[g] ?? 0), 0));
    rolling[g] = { maxRolling: Math.round(maxR * 10) / 10, maxCalendar: Math.round(maxC * 10) / 10, daysAboveHigh: above };
  }
  // Q5 — schémas directs (schéma moteur principal du catalogue).
  const PAT = ['push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical'];
  const perW = PAT.map(() => Array.from({ length: WEEKS }, () => ({ sets: 0, sessions: 0 })));
  for (const x of rows.filter((y) => y.status === 'planned')) {
    const w = x.week - 1;
    PAT.forEach((p, k) => {
      const n = x.exercises.filter((e) => content.catalog.exercise(`ex.${e.id}`)?.patterns.primary === p).reduce((a, e) => a + e.sets, 0);
      const cell = perW[k]?.[w];
      if (cell && n > 0) { cell.sets += n; cell.sessions += 1; }
    });
  }
  const perPattern = Object.fromEntries(PAT.map((p, k) => [p, { sets: avg((perW[k] ?? []).map((c) => c.sets)), frequency: avg((perW[k] ?? []).map((c) => c.sessions)) }]));
  const weeklyRatio = Array.from({ length: WEEKS }, (_, w) => {
    const push = (perW[0]?.[w]?.sets ?? 0) + (perW[1]?.[w]?.sets ?? 0);
    const pull = (perW[2]?.[w]?.sets ?? 0) + (perW[3]?.[w]?.sets ?? 0);
    return pull === 0 ? null : Math.round((push / pull) * 100) / 100;
  });
  let run = 0; let longest = 0;
  for (const q of weeklyRatio) { run = q !== null && (q < PUSH_PULL_BAND.low || q > PUSH_PULL_BAND.high) ? run + 1 : 0; longest = Math.max(longest, run); }
  const region = (a: string | undefined) => (a === undefined ? 'full' : /^str_upper/.test(a) ? 'upper' : /^str_lower/.test(a) ? 'lower' : 'full');
  const reqs = Object.values(r.state.planner.weeks).flatMap((w) => w.requests);
  const sReqs = reqs.filter((q) => q.sport === 'strength');
  const regions = {
    upper: sReqs.filter((q) => q.status === 'planned' && region(q.intent?.archetypeId) === 'upper').length,
    lower: sReqs.filter((q) => q.status === 'planned' && region(q.intent?.archetypeId) === 'lower').length,
    full: sReqs.filter((q) => q.status === 'planned' && region(q.intent?.archetypeId) === 'full').length,
    unplacedUpper: sReqs.filter((q) => q.status !== 'planned' && region(q.intent?.archetypeId) === 'upper').length,
    unplacedLower: sReqs.filter((q) => q.status !== 'planned' && region(q.intent?.archetypeId) === 'lower').length,
  };
  let assessed = 0;
  const reasonsIn = (o: unknown): { code: string; params: Record<string, unknown> }[] => {
    const out = new Map<string, { code: string; params: Record<string, unknown> }>();
    const walk = (x: unknown) => { if (!x || typeof x !== 'object') return; const y = x as { code?: unknown; params?: unknown }; if (typeof y.code === 'string' && y.params && typeof y.params === 'object') out.set(JSON.stringify(y), y as never); for (const v of Object.values(x)) walk(v); };
    walk(o);
    return [...out.values()];
  };
  for (const q of sReqs.filter((x) => x.status === 'planned')) {
    // Raisons de la demande ET de l'enregistrement de séance (les modificateurs de dose vivent dans la séance), dédoublonnées.
    const rs = reasonsIn(q);
    assessed += rs.filter((x) => x.code === 'PLAN.INTERFERENCE_ASSESSED' && (x.params.level === 'MODERATE' || x.params.level === 'HIGH')).length;
  }
  return {
    ...base, variant: variant.id, variantCount, directIndirect, rolling,
    pushPull: { perPattern, weeklyRatio, longestOutsideBand: longest }, regions,
    interference: { assessedModerateOrHigh: assessed, hyroxPlanned: reqs.filter((q) => q.sport === 'hyrox' && q.status === 'planned').length },
  };
}

/** Volume (décompte du registre) d'une semaine précise, pour les scénarios Q2. */
export function weekVolumeOf(r: SimOut, w: number) { return strengthWeekVolume(r.state, mondayOf(w)); }

/** Scénarios ciblés du lot 4.2 (en plus des 14 profils du lot 4.1). */
export function lot42Scenarios(base: (s: ProfileSpec) => ProfileSpec, profileOf: (o: Partial<ProfileInput>, p: Partial<StrengthPersonalization>) => ProfileInput): ProfileSpec[] {
  return [
    base({ id: 'L42-RUN3', label: 'Musculation 3× (Full Body) + Course 2×', profile: profileOf({ priorities: ['strength', 'running'], strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 3 }, running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } }, { days: [0, 2, 4] }), lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }),
    base({ id: 'L42-EARLY', label: 'Hypertrophie 4×, séances lundi–jeudi (concentrées en début de semaine)', profile: profileOf({}, { days: [0, 1, 2, 3] }) }),
    base({ id: 'L42-SUNMON', label: 'Hypertrophie 4×, dimanche puis lundi (frontière de semaine)', profile: profileOf({}, { days: [0, 2, 4, 6] }) }),
    base({ id: 'L42-SHORT', label: 'Hypertrophie 4×, 3 jours disponibles en S4–S7 (semaines courtes)', profile: profileOf({}, { days: [0, 1, 3, 4] }),
      beforeWeek: (w, st, sunday) => {
        if ((w !== 3 && w !== 7) || !st.profile) return st;
        const pers = st.profile.strength.personalization as StrengthPersonalization;
        return updateStrengthPersonalization(st, { ...st.profile, strength: { ...st.profile.strength, personalization: { ...pers, days: w === 3 ? [0, 2, 4] : [0, 1, 3, 4] } } } as ProfileInput, sunday);
      } }),
  ];
}

/** 14 profils du lot 4.1 + 4 scénarios ciblés du lot 4.2. */
export function lot42Specs(): ProfileSpec[] { return [...lot41Specs(), ...lot42Scenarios(lot41Athlete, profileOf)]; }

const f1 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));
/** Rapport Markdown reproductible du lot 4.2 (toutes variantes × tous profils). */
export function reportLot42(all: readonly Lot42Measure[]): string {
  const by = (v: string, id: string) => all.find((m) => m.variant === v && m.id === id);
  const ids = [...new Set(all.map((m) => m.id))];
  const has = (v: string) => all.some((m) => m.variant === v);
  const G = ['chest', 'back', 'shoulders', 'arms', 'quads', 'hamstrings', 'glutes'];
  const out = ['# Reprise RC5 lot 4.2 — banc d’arbitrage (12 semaines)', '',
    'Banc `lot42-bench.ts` (athlète à capacité réelle du lot 4.1). Variantes de SIMULATION, jamais activées : elles comparent des règles, elles ne valident aucune règle.',
    'Direct / indirect : convention de décompte (classification B1 : bras synergistes des polyarticulaires), jamais une mesure physiologique.', '',
    '## Variantes', '', ...VARIANTS.filter((v) => has(v.id)).map((v) => `- **${v.id}** : ${v.label}`), ''];
  out.push('## Q1 — séries prévues / semaine (yardstick du registre A | convention de la variante)', '', `| Profil | Variante | ${G.join(' | ')} | Refus | Durée max |`, `|---|---|${G.map(() => '---|').join('')}---|---|`);
  for (const id of ids) for (const v of ['A', 'B1', 'B2', 'C25', 'C75']) { const m = by(v, id); if (m) out.push(`| ${id} | ${v} | ${G.map((g) => `${f1(m.volume[g]?.planned)} \\| ${f1(m.variantCount[g])}`).join(' | ')} | ${String(m.refused)} | ${String(m.duration.max)} |`); }
  out.push('', '## Q1 — direct / indirect (A, séries brutes prévues / semaine)', '', `| Profil | ${G.join(' | ')} |`, `|---|${G.map(() => '---|').join('')}`);
  for (const id of ids) { const m = by('A', id); if (m) out.push(`| ${id} | ${G.map((g) => `${f1(m.directIndirect[g]?.direct)} / ${f1(m.directIndirect[g]?.indirect)}`).join(' | ')} |`); }
  out.push('', '## Q2 — réalisé : maximum 7 jours glissants / maximum semaine civile (borne haute) ; jours où le glissant dépasse la borne', '', '| Profil | Groupes concernés |', '|---|---|');
  for (const id of ids) {
    const m = by('A', id); if (!m) continue;
    const xs = Object.entries(m.rolling).filter(([, r]) => r.daysAboveHigh > 0 || r.maxRolling > r.maxCalendar + 0.05).map(([g, r]) => `${g} ${f1(r.maxRolling)} / ${f1(r.maxCalendar)} (${f1(m.volume[g]?.high)}) : ${String(r.daysAboveHigh)} j`);
    out.push(`| ${id} | ${xs.join(' ; ') || '—'} |`);
  }
  out.push('', '## Q2 — garde-fou « borne haute aussi sur 7 jours glissants » (option) : jours au-dessus de la borne (somme des groupes) et écarts de volume prévu face à A', '', '| Profil | Jours > borne A → Q2 | Écarts de volume | Refus A → Q2 |', '|---|---|---|---|');
  for (const id of ids) {
    const a = by('A', id); const q = by('Q2', id); if (!a || !q) continue;
    const days = (m: Lot42Measure) => Object.values(m.rolling).reduce((n, r) => n + r.daysAboveHigh, 0);
    const ch = Object.entries(q.volume).filter(([g, v]) => Math.abs(v.planned - (a.volume[g]?.planned ?? 0)) > 0.05).map(([g, v]) => `${g} ${f1(a.volume[g]?.planned)} → ${f1(v.planned)}`);
    out.push(`| ${id} | ${String(days(a))} → ${String(days(q))} | ${ch.join(' ; ') || 'identique'} | ${String(a.refused)} → ${String(q.refused)} |`);
  }
  out.push('', '## Q3 / Q6 — semaines courtes et hybrides (A : actuel ; Q3 : région alternée ; H : sonde historique)', '', '| Profil | Variante | Séances Haut / Bas / Full Body | Non placées | Quadriceps | Ischios | Fessiers | Pectoraux | Dos | Squat | Soulevé roumain | Sous 36 h | Durée max |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const id of ['L4-2', 'L41-RUN', 'L42-RUN3', 'L42-SHORT']) for (const v of ['A', 'Q3', 'H']) {
    const m = by(v, id); if (!m) continue;
    const ld = (k: string) => { const x = m.loads[k]; return x ? `${x.first} → ${x.last} (↓${String(x.drops)})` : '—'; };
    out.push(`| ${id} | ${v} | ${String(m.regions.upper)} / ${String(m.regions.lower)} / ${String(m.regions.full)} | ${String(m.refused)} | ${f1(m.volume.quads?.planned)} | ${f1(m.volume.hamstrings?.planned)} | ${f1(m.volume.glutes?.planned)} | ${f1(m.volume.chest?.planned)} | ${f1(m.volume.back?.planned)} | ${ld('back_squat')} | ${ld('romanian_deadlift')} | ${String(m.recoveryUnder36)} | ${String(m.duration.max)} |`);
  }
  out.push('', '## Q4 — départage `volume_fit` par déficit relatif (écarts face à A, séries prévues / semaine)', '', '| Profil | Écarts | Refus | Durée max A → Q4 |', '|---|---|---|---|');
  for (const id of ids) {
    const a = by('A', id); const q = by('Q4', id); if (!a || !q) continue;
    const ch = Object.entries(q.volume).filter(([g, v]) => Math.abs(v.planned - (a.volume[g]?.planned ?? 0)) > 0.05).map(([g, v]) => `${g} ${f1(a.volume[g]?.planned)} → ${f1(v.planned)}`);
    out.push(`| ${id} | ${ch.join(' ; ') || 'identique'} | ${String(a.refused)} → ${String(q.refused)} | ${String(a.duration.max)} → ${String(q.duration.max)} |`);
  }
  out.push('', `## Q5 — poussée / tirage (A) : séries directes prévues / semaine × séances / semaine ; bande descriptive candidate ${f1(PUSH_PULL_BAND.low)}–${f1(PUSH_PULL_BAND.high)}`, '', '| Profil | Poussée H | Poussée V | Tirage H | Tirage V | Rapport hebdomadaire (S1–S12) | Semaines consécutives hors bande (max) |', '|---|---|---|---|---|---|---|');
  for (const id of ids) {
    const m = by('A', id); if (!m) continue;
    const p = (k: string) => { const x = m.pushPull.perPattern[k]; return x ? `${f1(x.sets)} × ${f1(x.frequency)}` : '—'; };
    out.push(`| ${id} | ${p('push_horizontal')} | ${p('push_vertical')} | ${p('pull_horizontal')} | ${p('pull_vertical')} | ${m.pushPull.weeklyRatio.map((x) => f1(x)).join(' ')} | ${String(m.pushPull.longestOutsideBand)} |`);
  }
  out.push('', '## Contrôles transverses (toutes variantes)', '', '| Variante | Profils | Erreurs du banc | Séances sous 36 h | Durée au-delà de la limite | Principaux changés (somme) |', '|---|---|---|---|---|---|');
  for (const v of VARIANTS.filter((x) => has(x.id))) {
    const ms = all.filter((m) => m.variant === v.id);
    out.push(`| ${v.id} | ${String(ms.length)} | ${String(ms.reduce((n, m) => n + m.errors, 0))} | ${String(ms.reduce((n, m) => n + m.recoveryUnder36, 0))} | ${String(ms.reduce((n, m) => n + m.duration.over, 0))} | ${String(ms.reduce((n, m) => n + m.mainChanges, 0))} |`);
  }
  return `${out.join('\n')}\n`;
}
