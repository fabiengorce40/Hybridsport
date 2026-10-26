/**
 * RC4.6 (L0) — BANC QUALITÉ MUSCULATION : mesures reproductibles des séances de musculation produites par le chemin réel
 * de l'application (`rc4-sim`), sur les 8 profils de l'audit RC4.6, 6 semaines. Lecture seule : aucune règle sportive.
 *
 * Définitions (explicites, inchangées par rapport au moteur) :
 * - séries de travail : séries prescrites hors montée en charge et hors séries facultatives (comme `sessionPlannedHardSets`) ;
 * - volume DIRECT d'un groupe : séries des exercices dont un muscle PRINCIPAL appartient au groupe ;
 * - volume INDIRECT : séries des exercices dont un muscle SECONDAIRE appartient au groupe (sans muscle principal du
 *   groupe), pondérées par `strength.volume.secondaryWeight` ; direct + indirect = volume du bilan Strength (vérifié) ;
 * - POUSSÉE / TIRAGE (haut du corps, par exercice) : séries de travail des exercices de schéma principal `push_*` (resp.
 *   `pull_*`), plus les isolations du haut du corps dont les muscles principaux sont tous de poussée (pectoraux, deltoïdes
 *   antérieurs ou latéraux, triceps) (resp. de tirage : dorsaux, haut du dos, deltoïdes postérieurs, biceps) ;
 * - similarité : indice de Jaccard des ensembles d'exercices de deux séances consécutives du même archétype ;
 * - continuité : transitions entre deux expositions consécutives d'un même emplacement (archétype, emplacement).
 */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { readStrengthParams, sessionPlannedHardSets } from '@hybridsport/strength';
import { beta0Environment, strengthContent, weekReproducibility } from '../../src/index.js';
import type { AppState } from '../../src/index.js';
import { PROFILES, referenceEnvironment, simulate } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec, SimOut } from '../rc4-audit/rc4-sim.js';

// technical-constant: horizon du banc (semaines)
export const QUALITY_WEEKS = 6;
export const GROUPS = ['quads', 'hamstrings', 'glutes', 'calves', 'chest', 'back', 'shoulders', 'arms', 'core'] as const;
const PUSH_MUSCLES = new Set(['chest', 'front_delts', 'side_delts', 'triceps']);
const PULL_MUSCLES = new Set(['lats', 'upper_back_traps', 'rear_delts', 'biceps']);

/** Profils de l'audit RC4.6 : banc RC4 (6) + Musculation seule 3× (Full Body) et 4× (Haut / Bas). */
export function qualityProfiles(): ProfileSpec[] {
  const p1 = PROFILES.find((p) => p.id === 'P1');
  if (!p1) throw new Error('P1');
  const solo = (id: string, n: number): ProfileSpec => ({ id, label: `Musculation ${String(n)}× seule`, profile: { ...p1.profile, priorities: ['strength'], strength: { ...p1.profile.strength, sessionsPerWeek: n }, running: { ...p1.profile.running, enabled: false } } });
  return [...PROFILES, solo('S3', 3), solo('S4', 4)];
}

export interface QualityItem { readonly slot: string; readonly ex: string; readonly sets: number; readonly reps: string; readonly load: number | null; readonly mode: 'load' | 'bodyweight' | 'effort'; readonly track: boolean }
export interface QualitySession { readonly id: string; readonly week: string; readonly date: string; readonly arch: string; readonly items: readonly QualityItem[]; readonly direct: Record<string, number>; readonly indirect: Record<string, number>; readonly push: number; readonly pull: number; readonly estMin: number | null; readonly availMin: number | null; readonly reductions: readonly string[] }
export interface ProfileQuality {
  readonly id: string; readonly label: string; readonly sessions: readonly QualitySession[];
  readonly weeks: readonly { readonly week: number; readonly vol: Record<string, readonly [number, number | null, number | null]> }[];
  readonly arbitrations: readonly string[]; readonly repro: Readonly<Record<string, number>>; readonly plannerDivergences: readonly string[];
  /** Écart maximal (séries) entre direct + indirect recalculé et le volume du bilan Strength : 0 attendu. */
  readonly accountingGap: number;
}

const round = (x: number, d = 1): number => Math.round(x * 10 ** d) / 10 ** d;
const repsOf = (r: unknown): string => {
  if (typeof r === 'number') return String(r);
  const x = r as { min?: number; max?: number } | null;
  return x && typeof x.min === 'number' ? `${String(x.min)}-${String(x.max)}` : '';
};

/** Mesure d'un profil à partir d'une simulation (chemin réel). `env` : environnement à évaluer (référence par défaut). */
export function measureProfile(spec: ProfileSpec, env = referenceEnvironment(), o: { readonly weeks?: number; readonly onWeek?: (state: AppState, monday: string) => void; readonly onFinal?: (state: AppState) => void } = {}): ProfileQuality {
  // R-A mesuré À LA PLANIFICATION de chaque semaine (aucune séance de la semaine réalisée) : en fin de simulation, les
  // progressions ont évolué depuis et ne peuvent pas être relues à leur état d'alors (écarts attribués à tort au planificateur).
  const repro: Record<string, number> = {};
  const divergences: string[] = [];
  const r: SimOut = simulate(spec, o.weeks ?? QUALITY_WEEKS, env, (state, monday) => {
    o.onWeek?.(state, monday);
    const x = weekReproducibility(state, monday, env, 'strength');
    for (const [k, v] of Object.entries(x.counts)) repro[k] = (repro[k] ?? 0) + v;
    divergences.push(...x.sessions.filter((y) => y.class === 'planner_divergence').map((y) => `${y.requestId}: ${y.changesAtPlanning.join(', ')}`));
  });
  const content = strengthContent();
  const params = readStrengthParams(content.ruleset).values;
  const groups = params['strength.volume'].muscleGroups;
  const w2 = params['strength.volume'].secondaryWeight;
  const groupOf = (m: string): string | undefined => Object.keys(groups).find((g) => (groups[g] ?? []).includes(m));
  const st: AppState = r.state;
  o.onFinal?.(st);
  const reductionsByDate = new Map(r.sessions.filter((s) => s.sport === 'strength' && s.date).map((s) => [s.date as string, s.reductions]));
  let gap = 0;
  const sessions: QualitySession[] = Object.entries(st.planner.weeks).sort(([a], [b]) => (a < b ? -1 : 1)).flatMap(([ws, w]) => w.requests
    .filter((q) => q.sport === 'strength' && q.status === 'planned' && q.date && q.record)
    .flatMap((q): QualitySession[] => {
      const d = migrateToCurrent<SessionRecord>(q.record as never);
      if (!d.ok) return [];
      const rec = d.value;
      const s: SessionDraft = rec.session;
      const direct: Record<string, number> = {};
      const indirect: Record<string, number> = {};
      let push = 0;
      let pull = 0;
      const items: QualityItem[] = [];
      for (const b of s.blocks) {
        if (b.kind === 'warmup' || b.kind === 'cooldown') continue;
        for (const it of b.items) {
          if (it.prescription.type !== 'sets') continue;
          const e = content.catalog.exercise(it.exerciseId);
          if (!e) continue;
          const sets = it.prescription.sets.filter((x) => x.kind !== 'rampup' && x.optional !== true);
          const n = sets.length;
          const pg = new Set(e.muscles.primary.map(groupOf).filter((x): x is string => x !== undefined));
          const sg = new Set(e.muscles.secondary.map(groupOf).filter((x): x is string => x !== undefined && !pg.has(x)));
          for (const g of pg) direct[g] = (direct[g] ?? 0) + n;
          for (const g of sg) indirect[g] = (indirect[g] ?? 0) + n * w2;
          const pat = e.patterns.primary;
          if (pat.startsWith('push_') || (pat === 'isolation_upper' && e.muscles.primary.every((m) => PUSH_MUSCLES.has(m)))) push += n;
          if (pat.startsWith('pull_') || (pat === 'isolation_upper' && e.muscles.primary.every((m) => PULL_MUSCLES.has(m)))) pull += n;
          const f = sets[0] as { reps?: unknown; intensity?: { mode?: string; kg?: number; kgRounded?: number } } | undefined;
          const mode = f?.intensity?.mode;
          const load = mode === 'load' ? f?.intensity?.kg ?? null : mode === 'percent_of_reference' ? f?.intensity?.kgRounded ?? null : null;
          items.push({ slot: it.refs?.slotId ?? '', ex: it.exerciseId.replace('ex.', ''), sets: n, reps: repsOf(f?.reps), load, mode: load !== null ? 'load' : mode === 'bodyweight' ? 'bodyweight' : 'effort', track: Boolean(it.refs?.progressionTrackId) });
        }
      }
      // Vérification de la comptabilisation : direct + indirect = volume du bilan Strength.
      const engine = sessionPlannedHardSets(s, params, content.catalog);
      for (const g of new Set([...Object.keys(engine), ...Object.keys(direct), ...Object.keys(indirect)])) gap = Math.max(gap, Math.abs((engine[g] ?? 0) - (direct[g] ?? 0) - (indirect[g] ?? 0)));
      const est = rec.durationEstimate.availability === 'AVAILABLE' ? Math.round(rec.durationEstimate.p50 / 60) : null;
      const avail = w.days.find((x) => x.date === q.date)?.availableMinutes ?? null;
      return [{ id: q.requestId, week: ws, date: q.date ?? '', arch: q.intent?.archetypeId ?? '', items, direct, indirect, push, pull, estMin: est, availMin: avail, reductions: reductionsByDate.get(q.date ?? '') ?? [] }];
    }));
  return {
    id: spec.id, label: spec.label, sessions,
    weeks: r.weeks.map((w) => ({ week: w.week, vol: Object.fromEntries(w.volume.map((v) => [v.group, [v.planned, v.target, v.high] as const])) })),
    arbitrations: r.sessions.filter((s) => s.arbitration).map((s) => `${s.sport}@${s.date ?? '?'}:${s.arbitration ?? ''}`),
    repro, plannerDivergences: divergences, accountingGap: round(gap, 3),
  };
}

const jaccard = (a: readonly string[], b: readonly string[]): number => { const A = new Set(a); const B = new Set(b); const u = new Set([...A, ...B]); return u.size === 0 ? 1 : [...A].filter((x) => B.has(x)).length / u.size; };

/** Indicateurs agrégés d'un profil (base du rapport et des comparaisons des études). */
export function summarize(q: ProfileQuality) {
  const nW = Math.max(1, q.weeks.length);
  const sum = (f: (s: QualitySession) => Record<string, number>, g: string) => round(q.sessions.reduce((t, s) => t + (f(s)[g] ?? 0), 0) / nW);
  const volume = Object.fromEntries(GROUPS.map((g) => [g, { direct: sum((s) => s.direct, g), indirect: sum((s) => s.indirect, g), total: round(sum((s) => s.direct, g) + sum((s) => s.indirect, g)) }]));
  const bounds = Object.fromEntries(GROUPS.map((g) => [g, q.weeks[0]?.vol[g] ? [q.weeks[0].vol[g]?.[1] ?? null, q.weeks[0].vol[g]?.[2] ?? null] : [null, null]]));
  const under = Object.fromEntries(GROUPS.map((g) => [g, q.weeks.filter((w) => { const v = w.vol[g]; return v && v[1] !== null && v[0] < v[1]; }).length]));
  const over = Object.fromEntries(GROUPS.map((g) => [g, q.weeks.filter((w) => { const v = w.vol[g]; return v && v[2] !== null && v[0] > v[2]; }).length]));
  const push = round(q.sessions.reduce((t, s) => t + s.push, 0) / nW);
  const pull = round(q.sessions.reduce((t, s) => t + s.pull, 0) / nW);
  const byArch = new Map<string, QualitySession[]>();
  for (const s of [...q.sessions].sort((a, b) => (a.date < b.date ? -1 : 1))) byArch.set(s.arch, [...(byArch.get(s.arch) ?? []), s]);
  const variety = [...byArch].map(([arch, L]) => {
    const sig = L.map((s) => s.items.map((i) => i.ex).sort());
    const pairs = sig.slice(1).map((x, i) => jaccard(sig[i] ?? [], x));
    return { arch, sessions: L.length, distinctExercises: new Set(L.flatMap((s) => s.items.map((i) => i.ex))).size, distinctCompositions: new Set(sig.map((x) => x.join('|'))).size,
      identicalToPrevious: sig.slice(1).filter((x, i) => x.join('|') === (sig[i] ?? []).join('|')).length, meanSimilarity: round(pairs.length ? pairs.reduce((a, b) => a + b, 0) / pairs.length : 1, 2),
      distinctMains: new Set(L.map((s) => s.items[0]?.ex ?? '')).size };
  });
  const seq = new Map<string, QualityItem[]>();
  for (const s of [...q.sessions].sort((a, b) => (a.date < b.date ? -1 : 1))) for (const i of s.items) seq.set(`${s.arch}/${i.slot}`, [...(seq.get(`${s.arch}/${i.slot}`) ?? []), i]);
  let transitions = 0; let switched = 0; let recalibrated = 0; let loadDown = 0; let repsDown = 0;
  for (const L of seq.values()) for (let k = 1; k < L.length; k += 1) {
    const a = L[k - 1] as QualityItem; const b = L[k] as QualityItem;
    transitions += 1;
    if (a.ex !== b.ex) { switched += 1; continue; }
    if (a.load !== null && b.load === null && b.mode === 'effort') recalibrated += 1;
    if (a.load !== null && b.load !== null && b.load < a.load) loadDown += 1;
    if (a.load !== null && a.load === b.load && Number(b.reps.split('-')[0]) < Number(a.reps.split('-')[0])) repsDown += 1;
  }
  const items = q.sessions.flatMap((s) => s.items);
  // Par (emplacement, exercice) : une 2ᵉ instance d'un emplacement n'est pas masquée par la 1ʳᵉ.
  const byExercise = new Map<string, QualityItem[]>();
  for (const [k, L] of seq) for (const i of L) byExercise.set(`${k}:${i.ex}`, [...(byExercise.get(`${k}:${i.ex}`) ?? []), i]);
  const repeatedEffort = [...byExercise.entries()].filter(([, L]) => L.length >= 3 && L.every((i) => i.mode === 'effort')).map(([k, L]) => `${k}×${String(L.length)}`);
  const est = q.sessions.map((s) => s.estMin).filter((x): x is number => x !== null);
  return {
    id: q.id, label: q.label, strengthSessions: q.sessions.length, volume, bounds, underFloorWeeks: under, overHighWeeks: over,
    pushPull: { push, pull, ratio: pull > 0 ? round(push / pull, 2) : null },
    variety, continuity: { transitions, exerciseSwitched: switched, recalibrated, loadDown, repsDown, itemsWithLoad: items.filter((i) => i.mode === 'load').length, itemsBodyweight: items.filter((i) => i.mode === 'bodyweight').length, itemsEffortOnly: items.filter((i) => i.mode === 'effort').length, repeatedEffortOnly: repeatedEffort },
    interference: { sessionsReduced: q.sessions.filter((s) => s.reductions.length > 0).length, reductions: q.sessions.reduce((t, s) => t + s.reductions.length, 0), byAction: countBy(q.sessions.flatMap((s) => s.reductions.map((x) => x.split(':').at(-1) ?? ''))), arbitrations: countBy(q.arbitrations.map((a) => a.split(':').slice(1, 2).join(':'))) },
    reproducibility: q.repro, plannerDivergences: q.plannerDivergences.length,
    duration: { meanMin: est.length ? round(est.reduce((a, b) => a + b, 0) / est.length, 0) : null, maxMin: est.length ? Math.max(...est) : null, overAvailable: q.sessions.filter((s) => s.estMin !== null && s.availMin !== null && s.estMin > s.availMin).length },
    accountingGap: q.accountingGap,
  };
}
const countBy = (xs: readonly string[]): Record<string, number> => { const o: Record<string, number> = {}; for (const x of xs) o[x] = (o[x] ?? 0) + 1; return Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1))); };
export type QualitySummary = ReturnType<typeof summarize>;

/** Rapport lisible (référence figée du banc). */
export function renderQualityReport(all: readonly QualitySummary[]): string {
  const L: string[] = ['# Banc qualité Musculation (RC4.6 L0) — référence', '', `Chemin réel de l'application, ${String(QUALITY_WEEKS)} semaines, 8 profils. Définitions : voir \`tests/rc46/quality-bench.ts\`. Valeurs par semaine (moyenne) sauf mention.`, ''];
  L.push('## Synthèse', '', '| Profil | Séances | Poussée / tirage (séries) | Rapport | Groupes sous plancher (sem.) | Au-dessus borne haute (sem.) | Allégées | Divergences R-A | Durée moy. / max (min) | Dépassements |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const s of all) {
    const u = Object.entries(s.underFloorWeeks).filter(([, n]) => n > 0).map(([g, n]) => `${g} ${String(n)}`).join(', ') || '—';
    const o = Object.entries(s.overHighWeeks).filter(([, n]) => n > 0).map(([g, n]) => `${g} ${String(n)}`).join(', ') || '—';
    L.push(`| ${s.id} | ${String(s.strengthSessions)} | ${String(s.pushPull.push)} / ${String(s.pushPull.pull)} | ${s.pushPull.ratio === null ? '—' : String(s.pushPull.ratio)} | ${u} | ${o} | ${String(s.interference.sessionsReduced)} | ${String(s.plannerDivergences)} | ${String(s.duration.meanMin ?? '—')} / ${String(s.duration.maxMin ?? '—')} | ${String(s.duration.overAvailable)} |`);
  }
  for (const s of all) {
    L.push('', `## ${s.id} — ${s.label}`, '');
    if (s.strengthSessions === 0) { L.push('Aucune séance de musculation.'); continue; }
    L.push('| Groupe | Direct | Indirect | Total | Plancher – borne |', '|---|---|---|---|---|');
    for (const g of GROUPS) { const v = s.volume[g]; const b = s.bounds[g]; L.push(`| ${g} | ${String(v?.direct ?? 0)} | ${String(v?.indirect ?? 0)} | ${String(v?.total ?? 0)} | ${String(b?.[0] ?? '—')} – ${String(b?.[1] ?? '—')} |`); }
    L.push('', '| Archétype | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne | Principaux distincts |', '|---|---|---|---|---|---|---|');
    for (const v of s.variety) L.push(`| ${v.arch} | ${String(v.sessions)} | ${String(v.distinctExercises)} | ${String(v.distinctCompositions)} | ${String(v.identicalToPrevious)} | ${String(v.meanSimilarity)} | ${String(v.distinctMains)} |`);
    const c = s.continuity;
    L.push('', `Continuité : ${String(c.transitions)} transitions, exercice changé ${String(c.exerciseSwitched)}, retour en calibration ${String(c.recalibrated)}, baisse de charge ${String(c.loadDown)}, baisse de répétitions à charge égale ${String(c.repsDown)} ; items chargés ${String(c.itemsWithLoad)}, poids du corps ${String(c.itemsBodyweight)}, à l'effort ${String(c.itemsEffortOnly)}.`);
    L.push(`Emplacements toujours « à l'effort » (≥ 3 expositions) : ${c.repeatedEffortOnly.join(' ; ') || 'aucun'}.`);
    L.push(`Allègements : ${String(s.interference.sessionsReduced)} séances, ${String(s.interference.reductions)} réductions ${JSON.stringify(s.interference.byAction)} ; arbitrages ${JSON.stringify(s.interference.arbitrations)}.`);
    L.push(`Reproductibilité (R-A, à la planification de chaque semaine) : ${JSON.stringify(s.reproducibility)}.`);
    L.push(`Durées : moyenne ${String(s.duration.meanMin)} min, maximum ${String(s.duration.maxMin)} min, dépassements du temps disponible ${String(s.duration.overAvailable)}.`);
  }
  return `${L.join('\n')}\n`;
}
