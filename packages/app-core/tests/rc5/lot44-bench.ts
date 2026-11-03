/**
 * Reprise RC5 lot 4.4 — BANC DE VALIDATION (TEST_ONLY), extension des bancs 4.2 / 4.3 (mêmes 20 profils, même athlète) :
 * - C : redistribution du volume d'une séance non placée (`redistributeUnplaced`), seule et combinée aux stratégies de
 *   semaine courte ; propositions recommandées acceptées avec le classement hiérarchique du lot 4.4 ;
 * - D : B1 + réévaluation contrôlée des isolations (`isolationReview`), comparée à A, B1 et B1 + Q4 ;
 * - E : lecture R4 des séances allégées sur le MOTEUR DE PROGRESSION RÉEL (`progressionReading`), six variantes, scénarios
 *   d'athlètes (progresse, stagne, difficulté, fatigue temporaire / persistante, HYROX, Course, manquées, reprise, A/B,
 *   transfert depuis Full Body).
 * Rien n'est activé : options de simulation seulement. Comparaison de règles, aucune conclusion physiologique.
 */
import { readStrengthParams } from '@hybridsport/strength';
import type { LightenedPolicy } from '@hybridsport/strength';
import { strengthContent } from '../../src/index.js';
import type { ProgressionReadingOption } from '../../src/index.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { lot41Athlete } from './lot41-bench.js';
import type { Lot42Measure } from './lot42-bench.js';
import { LOT43_VARIANTS, lot43Specs, measureLot43 } from './lot43-bench.js';
import type { Lot43Measure, Lot43Variant } from './lot43-bench.js';
import { P1, P2, P4, profileOf } from './lot4-profiles.js';
import type { ProfileInput } from '../../src/index.js';

const v43 = (id: string) => LOT43_VARIANTS.find((v) => v.id === id) as Lot43Variant;
// technical-constant: TEST_ONLY — paramètres de simulation R4 (fenêtre du plancher, cycle R3, seuil de sécurité) repris du modèle réduit du lot 4.3
const R4_SIM = { floorWindow: 2, reassessEvery: 4, safetyBelow: 3 };
const r4 = (policy: LightenedPolicy): ProgressionReadingOption => ({ policy, ...R4_SIM });

export const LOT44_VARIANTS: readonly Lot43Variant[] = [
  v43('A'), v43('B1'), v43('B1Q4'),
  { id: 'B1ISO', label: 'D — B1 + réévaluation contrôlée des isolations', synergists: 'arms', isolationReview: 'volume_fit' },
  v43('SW-ALT'), v43('SW-ULF'), v43('SW-FB'),
  { id: 'RED', label: 'C — redistribution plafonnée du volume des séances non placées', redistributeUnplaced: true },
  { id: 'SW-ALT+RED', label: 'C — région alternée + redistribution', shortWeek: 'alternate_region', redistributeUnplaced: true },
  { id: 'SW-ULF+RED', label: 'C — Haut / Bas / Full Body + redistribution', shortWeek: 'upper_lower_full', redistributeUnplaced: true },
  { id: 'SW-FB+RED', label: 'C — Full Body + redistribution', shortWeek: 'full_body', redistributeUnplaced: true },
  { ...v43('PROP'), label: 'C — proposition recommandée acceptée chaque semaine (classement hiérarchique 4.4)' },
  { id: 'R4', label: 'E — R4 seul', progression: r4('r4') },
  { id: 'R4F', label: 'E — R4 + exception plancher multisport', progression: r4('r4_floor') },
  { id: 'R4R3', label: 'E — R4 + R3', progression: r4('r4_r3') },
  { id: 'R4FR3', label: 'E — R4 + exception + R3', progression: r4('r4_floor_r3') },
  { id: 'R4V6', label: 'E — variante 6 : R4 + exception + R3 + sécurité (−10 % après 3 séances allégées en dessous)', progression: r4('r4_floor_r3_safety') },
];
export const R4_IDS = ['A', 'R4', 'R4F', 'R4R3', 'R4FR3', 'R4V6'];
export const C_IDS = ['A', 'SW-ALT', 'SW-ULF', 'SW-FB', 'RED', 'SW-ALT+RED', 'SW-ULF+RED', 'SW-FB+RED', 'PROP'];
export const C_PROFILES = ['L4-2', 'L41-RUN', 'L42-RUN3', 'L42-SHORT', 'L43-HYX3', 'L4-5'];

/**
 * Athlète à capacité réelle (lot 4.1) avec FATIGUE DU JOUR : les séances allégées (RIR prescrit au-dessus du plus bas RIR
 * déjà prescrit pour l'exercice) se font à capacité réduite de `fatigue` ; `window` : semaines concernées (défaut toutes) ;
 * `detrain` : perte de capacité à partir de `detrainFrom` (reprise après interruption).
 */
export function fatigueAthlete(gain: number, o: { readonly fatigue: number; readonly window?: readonly [number, number]; readonly detrain?: number; readonly detrainFrom?: number; readonly all?: boolean }): NonNullable<ProfileSpec['perform']> {
  const divisor = readStrengthParams(strengthContent().ruleset).values['strength.load'].e1rmDivisor;
  const base = new Map<string, number>(); const lowRir = new Map<string, number>();
  return ({ week, exerciseId, kg, reps, rir }) => {
    if (!base.has(exerciseId)) base.set(exerciseId, kg * (1 + (reps + (rir ?? 2)) / divisor));
    if (rir !== undefined) lowRir.set(exerciseId, Math.min(lowRir.get(exerciseId) ?? rir, rir));
    const lightened = o.all === true || (rir !== undefined && rir > (lowRir.get(exerciseId) ?? rir));
    const inWindow = !o.window || (week >= o.window[0] && week <= o.window[1]);
    const detrain = o.detrain !== undefined && week >= (o.detrainFrom ?? 0) ? 1 - o.detrain : 1;
    const e1rm = (base.get(exerciseId) ?? kg) * (1 + gain) ** week * detrain * (lightened && inWindow ? 1 - o.fatigue : 1);
    const toFailure = divisor * (e1rm / kg - 1);
    const done = Math.max(1, Math.min(reps, Math.floor(toFailure)));
    return { reps: done, rir: Math.max(0, Math.floor(toFailure - done)) };
  };
}

const withAthlete = (s: ProfileSpec, perform: NonNullable<ProfileSpec['perform']>): ProfileSpec => ({ ...lot41Athlete(s), perform } as ProfileSpec);
const spec = (id: string) => lot43Specs().find((x) => x.id === id) as ProfileSpec;
const run2 = { priorities: ['strength', 'running'], running: { enabled: true, population: 'P_R2', goal: 'TEN_K', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' } } as Partial<ProfileInput>;
// technical-constant: TEST_ONLY — scénarios d'athlète (gains hebdomadaires, fatigue du jour, perte à la reprise)
const SC = { gain: 0.005, fatigue: 0.03, hyroxFatigue: 0.05, temp: 0.08, detrain: 0.05 };

/** Scénarios E (moteur réel, 12 semaines). */
export function r4Scenarios(): ProfileSpec[] {
  return [
    lot41Athlete({ ...P1, id: 'E-PROG', label: 'Hypertrophie 4× A/B, athlète qui progresse (+0,5 %/sem.)' }),
    lot41Athlete({ ...P1, id: 'E-STAG', label: 'Hypertrophie 4× A/B, athlète qui stagne' }, 0),
    lot41Athlete({ ...P1, id: 'E-DIFF', label: 'Hypertrophie 4× A/B, athlète en difficulté (−1 %/sem.)' }, -0.01),
    withAthlete({ ...P1, id: 'E-FTEMP', label: 'Fatigue temporaire (S5–S6, −8 % sur toutes les séances)' }, fatigueAthlete(SC.gain, { fatigue: SC.temp, window: [4, 5], all: true })),
    withAthlete({ id: 'E-FPERS', label: 'Course 2× + Musculation 4×, fatigue persistante (séances allégées −3 %, athlète −1 %/sem.)', profile: profileOf(run2, { days: [0, 1, 3, 4] }), lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }, fatigueAthlete(-0.01, { fatigue: SC.fatigue })),
    withAthlete({ ...spec('L43-HYX3'), id: 'E-HYX', label: 'HYROX intensif 3× + Musculation 4× (séances allégées −5 %)' }, fatigueAthlete(SC.gain, { fatigue: SC.hyroxFatigue })),
    withAthlete({ id: 'E-RUN', label: 'Bloc Course 2× + Musculation 4× (séances allégées −3 %), athlète qui progresse', profile: profileOf(run2, { days: [0, 1, 3, 4] }), lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }, fatigueAthlete(SC.gain, { fatigue: SC.fatigue })),
    withAthlete({ id: 'E-RUNSTAG', label: 'Bloc Course, athlète qui stagne (séances allégées −3 %)', profile: profileOf(run2, { days: [0, 1, 3, 4] }), lastRun: { realizedDurationS: 1800, difficulty: 'AS_EXPECTED', distanceM: 5000 } }, fatigueAthlete(0, { fatigue: SC.fatigue })),
    lot41Athlete({ ...spec('L4-5'), id: 'E-MISS', label: 'Séances manquées, commencée non terminée, jours changés' }),
    withAthlete({ ...P1, id: 'E-BACK', label: 'Retour après 3 semaines d’interruption (S5–S7 manquées, −5 %)', disrupt: (w) => (w >= 4 && w <= 6 ? 'missed' : undefined) }, fatigueAthlete(SC.gain, { fatigue: 0, detrain: SC.detrain, detrainFrom: 7 })),
    withAthlete({ ...P2, id: 'E-AB', label: 'Alternance A/B avec HYROX (séances allégées −5 %)' }, fatigueAthlete(SC.gain, { fatigue: SC.hyroxFatigue })),
    lot41Athlete({ ...P4, id: 'E-FB2AB', label: 'Transfert : Full Body 3× puis A/B 4× (+1 %/sem.)' }, 0.01),
  ];
}

export interface Lot44Measure extends Lot43Measure {
  /** E : décisions de progression relevées (programme), par code / cause. */
  readonly progression: Readonly<Record<string, number>>;
  /** Lot 4.5 : séquence brute des raisons de progression (seulement si demandée). */
  readonly audit?: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[];
  /** Lot 4.5 : exercices successifs de chaque emplacement d'isolation (archétype / emplacement), seulement si demandé. */
  readonly isolationSequences?: Readonly<Record<string, readonly string[]>>;
  /** Lot 4.6 : charges réalisées successives (première série de travail) par exercice et emplacement, seulement si demandé. */
  readonly loadSequences?: Readonly<Record<string, readonly number[]>>;
}

export function measureLot44(s: ProfileSpec, v: Lot43Variant, keepAudit = false): Lot44Measure {
  let audit: Record<string, number> = {};
  let raw: { code: string; params: Record<string, unknown> }[] = [];
  const iso: Record<string, string[]> = {};
  const loadSeq: Record<string, number[]> = {};
  const m = measureLot43(s, v, (st) => {
    const out: Record<string, number> = {};
    for (const a of st.programmeState?.audit ?? []) {
      const r = a.reason as { code: string; params: Record<string, unknown> };
      if (!r.code.startsWith('PROGRESSION.')) continue;
      const k = r.code === 'PROGRESSION.HELD' ? `HELD:${String(r.params.cause)}` : r.code.slice('PROGRESSION.'.length);
      out[k] = (out[k] ?? 0) + 1;
    }
    audit = out;
    if (keepAudit) {
      const reqs = Object.values(st.planner.weeks).flatMap((w) => w.requests).filter((r) => r.sport === 'strength' && r.status === 'planned' && r.date).sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
      for (const r of reqs) {
        const ses = (r.record?.data as { session?: { blocks: { items: { exerciseId: string; refs?: { slotId?: string } }[] }[] } } | undefined)?.session;
        const n: Record<string, number> = {};
        for (const it of (ses?.blocks ?? []).flatMap((b) => b.items)) if (it.refs?.slotId && /\.iso_/.test(it.refs.slotId)) { const k = it.refs.slotId; n[k] = (n[k] ?? 0) + 1; (iso[`${r.intent?.archetypeId ?? ''}/${k}#${String(n[k])}`] ??= []).push(it.exerciseId); }
      }
    }
    if (keepAudit) for (const x of [...st.strength.exposures].sort((a, b) => (a.at < b.at ? -1 : 1))) { const kg = x.sets[0]?.loadKg; if (kg !== undefined) (loadSeq[`${x.exerciseId}/${x.slotId ?? ''}`] ??= []).push(kg); }
    if (keepAudit) raw = (st.programmeState?.audit ?? []).filter((a) => a.reason.code.startsWith('PROGRESSION.')).map((a) => ({ code: a.reason.code, params: a.reason.params as Record<string, unknown> }));
  });
  return { ...m, progression: audit, ...(keepAudit ? { audit: raw, isolationSequences: iso, loadSequences: loadSeq } : {}) };
}

const f1 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));
const ld = (m: Lot42Measure, k: string) => { const x = m.loads[k]; return x ? `${x.first} → ${x.last} (↓${String(x.drops)})` : '—'; };
const G = ['chest', 'back', 'shoulders', 'arms', 'quads', 'hamstrings', 'glutes'];

export function reportLot44(all: readonly Lot44Measure[], ref43: readonly Lot43Measure[]): string {
  const by = (v: string, id: string) => all.find((m) => m.variant === v && m.id === id);
  const ids = [...new Set(all.filter((m) => !m.id.startsWith('E-')).map((m) => m.id))];
  const out = ['# Reprise RC5 lot 4.4 — banc de validation (12 semaines)', '',
    'Variantes de SIMULATION (jamais activées). `A` = moteur du lot 4.4 (sécurité de récupération et catalogue corrigés) ; colonne « = 7cc8abd » : identité des volumes, charges, séances prévues et refusées avec le banc du lot 4.3. Comparaison de règles, aucune conclusion physiologique.', '',
    ...LOT44_VARIANTS.map((v) => `- **${v.id}** : ${v.label}`), ''];
  out.push('## Identité avec 7cc8abd (A et B1)', '', '| Profil | A | B1 | Écarts |', '|---|---|---|---|');
  for (const id of ids) {
    const cmp = (v: string) => { const a = by(v, id); const r = ref43.find((x) => x.variant === v && x.id === id); if (!a || !r) return { ok: '—', d: [] as string[] }; const d = (['volume', 'loads', 'planned', 'refused', 'recoveryUnder36', 'regions'] as const).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(r[k])); return { ok: d.length === 0 ? 'oui' : 'NON', d }; };
    const a = cmp('A'); const b = cmp('B1');
    out.push(`| ${id} | ${a.ok} | ${b.ok} | ${[...a.d.map((x) => `A:${x}`), ...b.d.map((x) => `B1:${x}`)].join(', ') || '—'} |`);
  }
  out.push('', '## C — stratégies hybrides et redistribution (séries prévues / semaine ; cibles entre parenthèses pour A)', '', '| Profil | Variante | H / B / FB | Non placées | Quadriceps | Ischios | Fessiers | Pectoraux | Dos | Épaules | Bras | Au-dessus de la borne haute (groupes·semaines) | Squat | Soulevé roumain | Sous 36 h | Durée max (limite) | Propositions acceptées |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const id of C_PROFILES) for (const v of C_IDS) {
    const m = by(v, id); if (!m) continue;
    const above = Object.values(m.volume).filter((g) => g.high !== null && g.planned > g.high + 1e-9).length;
    const t = (g: string) => (v === 'A' ? ` (${f1(m.volume[g]?.target)})` : '');
    const acc = m.accepted.length ? `${String(m.accepted.length)} : ${[...new Set(m.accepted.map((x) => x.split(':')[1]))].join(', ')}` : v === 'PROP' ? '0' : '';
    out.push(`| ${id} | ${v} | ${String(m.regions.upper)} / ${String(m.regions.lower)} / ${String(m.regions.full)} | ${String(m.refused)} | ${f1(m.volume.quads?.planned)}${t('quads')} | ${f1(m.volume.hamstrings?.planned)}${t('hamstrings')} | ${f1(m.volume.glutes?.planned)}${t('glutes')} | ${f1(m.volume.chest?.planned)}${t('chest')} | ${f1(m.volume.back?.planned)}${t('back')} | ${f1(m.volume.shoulders?.planned)}${t('shoulders')} | ${f1(m.volume.arms?.planned)}${t('arms')} | ${String(above)} | ${ld(m, 'back_squat')} | ${ld(m, 'romanian_deadlift')} | ${String(m.recoveryUnder36)} | ${String(m.duration.max)} (${String(m.duration.limit)}) | ${acc} |`);
  }
  out.push('', '## D — B1 et réévaluation des isolations (séries prévues / semaine, décompte du registre | convention de la variante ; cible)', '', `| Profil | Variante | ${G.join(' | ')} | Durée max | Violations matériel / exclusions | Principaux changés |`, `|---|---|${G.map(() => '---|').join('')}---|---|---|`);
  for (const id of ids) for (const v of ['A', 'B1', 'B1Q4', 'B1ISO']) {
    const m = by(v, id); if (!m) continue;
    out.push(`| ${id} | ${v} | ${G.map((g) => `${f1(m.volume[g]?.planned)} \\| ${f1(m.variantCount[g])} (${f1(m.volume[g]?.target)})`).join(' | ')} | ${String(m.duration.max)} (${String(m.duration.limit)}) | ${String(m.constraintViolations)} | ${String(m.mainChanges)} |`);
  }
  out.push('', '## E — R4 sur le moteur de progression réel (charges des principaux : départ → fin, baisses)', '', '| Scénario | Variante | Squat | Soulevé roumain | Développé couché | Rowing | Hausses | Baisses | Maintiens (cause : nombre) |', '|---|---|---|---|---|---|---|---|---|');
  for (const id of [...new Set(all.filter((m) => m.id.startsWith('E-')).map((m) => m.id))]) for (const v of R4_IDS) {
    const m = by(v, id); if (!m) continue;
    const p = m.progression;
    const held = Object.entries(p).filter(([k]) => k.startsWith('HELD:')).map(([k, n]) => `${k.slice(5)} ${String(n)}`).join(' ; ');
    out.push(`| ${id} | ${v} | ${ld(m, 'back_squat')} | ${ld(m, 'romanian_deadlift')} | ${ld(m, 'bench_press')} | ${ld(m, 'seated_cable_row')} | ${String(p.ADVANCED ?? 0)} | ${String(p.REGRESSED ?? 0)} | ${held || '—'} |`);
  }
  out.push('', '## Contrôles transverses', '', '| Variante | Profils | Erreurs | Sous 36 h | Durée au-delà | Violations matériel / exclusions |', '|---|---|---|---|---|---|');
  for (const v of LOT44_VARIANTS) { const ms = all.filter((m) => m.variant === v.id); if (ms.length) out.push(`| ${v.id} | ${String(ms.length)} | ${String(ms.reduce((n, m) => n + m.errors, 0))} | ${String(ms.reduce((n, m) => n + m.recoveryUnder36, 0))} | ${String(ms.reduce((n, m) => n + m.duration.over, 0))} | ${String(ms.reduce((n, m) => n + m.constraintViolations, 0))} |`); }
  return `${out.join('\n')}\n`;
}

/** Plan d'exécution : (variante, profils). */
export function lot44Plan(): { variant: Lot43Variant; specs: ProfileSpec[] }[] {
  const all20 = lot43Specs();
  const only = (ids: readonly string[]) => all20.filter((s) => ids.includes(s.id));
  return LOT44_VARIANTS.map((variant) => {
    const id = variant.id;
    if (['A', 'B1', 'B1Q4', 'B1ISO', 'RED'].includes(id)) return { variant, specs: id === 'A' ? [...all20, ...r4Scenarios()] : all20 };
    if (C_IDS.includes(id)) return { variant, specs: only(C_PROFILES) };
    return { variant, specs: r4Scenarios() };
  });
}
