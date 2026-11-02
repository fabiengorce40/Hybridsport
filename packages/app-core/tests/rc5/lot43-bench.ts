/**
 * Reprise RC5 lot 4.3 — BANC DE CONSOLIDATION (TEST_ONLY), extension du banc du lot 4.2 (mêmes profils, même athlète) :
 * - variantes Q1 (B1, B1 + Q4) et stratégies Q3 de semaine courte (région alternée, Haut / Bas / Full Body, Full Body) ;
 * - `PROP` : chaque lundi, l'utilisateur simulé ACCEPTE la proposition recommandée par `proposeHybridWeekAlternatives`
 *   (« Appliquer le nouveau planning ») — seule voie d'application, confirmée ;
 * - diagnostics du PRODUIT (lecture seule) : volume glissant (Q2, `rollingVolumeDiagnostic`) et poussée / tirage (Q5,
 *   `pushPullIndicator`) ; contrôle matériel / exclusions de chaque exercice prévu.
 * Comparaison de règles dans un modèle ; aucune conclusion physiologique.
 */
import { applyHybridProposal, beta0Environment, proposeHybridWeekAlternatives, pushPullIndicator, rollingVolumeDiagnostic, strengthContent } from '../../src/index.js';
import type { ProfileInput, StrengthPersonalization } from '../../src/index.js';
import { addDays } from '../../src/dates.js';
import { mondayOf } from '../rc4-audit/rc4-sim.js';
import type { ProfileSpec } from '../rc4-audit/rc4-sim.js';
import { lot41Athlete } from './lot41-bench.js';
import { lot42Specs, measureLot42, VARIANTS, variantEnv } from './lot42-bench.js';
import type { Lot42Measure, Lot42Variant } from './lot42-bench.js';
import { profileOf, WEEKS } from './lot4-profiles.js';

export interface Lot43Variant extends Lot42Variant { readonly proposals?: boolean }
export const LOT43_VARIANTS: readonly Lot43Variant[] = [
  VARIANTS[0] as Lot42Variant,
  VARIANTS.find((v) => v.id === 'B1') as Lot42Variant,
  { id: 'B1Q4', label: 'B1 + départage `volume_fit` par déficit relatif (Q4)', synergists: 'arms', volumeFitTieBreak: 'relative_deficit' },
  { id: 'SW-ALT', label: 'Q3 — semaine courte : région alternée', shortWeek: 'alternate_region' },
  { id: 'SW-ULF', label: 'Q3 — semaine courte : Haut / Bas / Full Body', shortWeek: 'upper_lower_full' },
  { id: 'SW-FB', label: 'Q3 — semaine courte : Full Body', shortWeek: 'full_body' },
  { id: 'PROP', label: 'Q3 / Q7 — proposition recommandée acceptée chaque semaine (aperçu confirmé)', proposals: true },
];

export interface Lot43Measure extends Lot42Measure {
  /** Exercices prévus incompatibles avec le matériel ou les exclusions déclarés. */
  readonly constraintViolations: number;
  /** Q2 (diagnostic produit, réalisé) : jours au-dessus de la borne haute par groupe et causes relevées. */
  readonly rollingDays: Readonly<Record<string, number>>; readonly rollingCauses: Readonly<Record<string, number>>;
  /** Q5 (diagnostic produit, dernière semaine) : statut et schémas indisponibles. */
  readonly pushPullStatus: string; readonly pushPullUnavailable: readonly string[];
  /** PROP : propositions acceptées (semaines) et stratégies retenues. */
  readonly accepted: readonly string[];
}

export function lot43Specs(): ProfileSpec[] {
  return [...lot42Specs(),
    lot41Athlete({ id: 'L43-HYX3', label: 'HYROX intensif : Musculation 4× + HYROX 3×, 6 jours', profile: profileOf({ priorities: ['strength', 'hyrox'], hyrox: { enabled: true, sessionsPerWeek: 3, focus: 'balanced', goal: 'RACE_PREPARATION', returnState: 'NONE' }, availability: [75, 60, 75, 60, 0, 90, 60] } as Partial<ProfileInput>, { days: [0, 1, 2, 3, 5, 6] }) }),
    lot41Athlete({ id: 'L43-RECOV', label: 'Hypertrophie 4×, récupération limitée déclarée', profile: profileOf({}, { days: [0, 1, 3, 4], recovery: 'limited' } as Partial<StrengthPersonalization>) }),
  ];
}

export function measureLot43(spec0: ProfileSpec, variant: Lot43Variant): Lot43Measure {
  const accepted: string[] = [];
  const env = beta0Environment();
  const spec: ProfileSpec = variant.proposals ? { ...spec0, afterPlanned: (w, s, clock) => {
    const r = proposeHybridWeekAlternatives(s, clock, env);
    const p = r.proposals.find((x) => x.strategy === r.recommended);
    if (!p) return s;
    accepted.push(`S${String(w + 1)}:${p.strategy}`);
    return applyHybridProposal(s, p, clock, true, env);
  } } : spec0;
  let lastState: Parameters<typeof rollingVolumeDiagnostic>[0] | undefined;
  const m = measureLot42(spec, variant.proposals ? (VARIANTS[0] as Lot42Variant) : variant, (st) => { lastState = st; });
  const st = lastState;
  const c = strengthContent();
  const equipment = new Set(spec.profile.equipment.items);
  const excluded = new Set(spec.profile.excludedExercises ?? []);
  let violations = 0;
  if (st) for (const w of Object.values(st.planner.weeks)) for (const r of w.requests) {
    if (r.sport !== 'strength' || r.status !== 'planned') continue;
    for (const id of JSON.stringify(r.record ?? {}).match(/"exerciseId":"(ex\.[a-z0-9_]+)"/g) ?? []) {
      const ex = c.catalog.exercise(id.slice(14, -1));
      if (!ex || excluded.has(ex.id) || !c.catalog.isFeasibleWith(ex, equipment)) violations += 1;
    }
  }
  const rollingDays: Record<string, number> = {}; const rollingCauses: Record<string, number> = {};
  if (st) for (let d = 0; d < WEEKS * 7; d++) {
    const diag = rollingVolumeDiagnostic(st, addDays(mondayOf(0), d));
    for (const g of diag.groups.filter((x) => x.aboveHigh)) { rollingDays[g.group] = (rollingDays[g.group] ?? 0) + 1; for (const cz of g.causes) rollingCauses[cz] = (rollingCauses[cz] ?? 0) + 1; }
  }
  const pp = st ? pushPullIndicator(st, mondayOf(WEEKS - 1)) : undefined;
  return { ...m, variant: variant.id, constraintViolations: violations, rollingDays, rollingCauses, pushPullStatus: pp?.status ?? '—', pushPullUnavailable: pp?.unavailable ?? [], accepted };
}

/** Exécution « sur variante » (aucune option active hors variante). */
export const lot43Env = (v: Lot43Variant) => variantEnv(v);

/** Profils où les stratégies de semaine courte et les propositions ont un sens (semaines courtes, hybrides, perturbées). */
export const LOT43_PROPOSAL_PROFILES = ['L4-2', 'L41-RUN', 'L42-RUN3', 'L42-SHORT', 'L43-HYX3', 'L4-5'];

const f1 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));
export function reportLot43(all: readonly Lot43Measure[], reference: readonly Lot42Measure[]): string {
  const by = (v: string, id: string) => all.find((m) => m.variant === v && m.id === id);
  const ids = [...new Set(all.map((m) => m.id))];
  const G = ['chest', 'back', 'shoulders', 'arms', 'quads', 'hamstrings', 'glutes'];
  const out = ['# Reprise RC5 lot 4.3 — banc de consolidation (12 semaines)', '',
    'Variantes de SIMULATION (jamais activées). `A` = moteur actif = commit bfedde1 (identité vérifiée colonne « = bfedde1 »). Comparaison de règles, aucune conclusion physiologique.', '',
    ...LOT43_VARIANTS.map((v) => `- **${v.id}** : ${v.label}`), ''];
  out.push('## Q1 — matrice B1 / B1 + Q4 (séries prévues / semaine, convention du registre | convention de la variante ; cible)', '', `| Profil | = bfedde1 | Variante | ${G.join(' | ')} | Durée max | Violations matériel / exclusions | Principaux changés |`, `|---|---|---|${G.map(() => '---|').join('')}---|---|---|`);
  for (const id of ids) {
    const ref = reference.find((m) => m.variant === 'A' && m.id === id);
    const a = by('A', id);
    const same = ref && a ? (JSON.stringify(ref.volume) === JSON.stringify(a.volume) && JSON.stringify(ref.loads) === JSON.stringify(a.loads) ? 'oui' : 'NON') : 'nouveau';
    for (const v of ['A', 'B1', 'B1Q4']) { const m = by(v, id); if (m) out.push(`| ${id} | ${v === 'A' ? same : ''} | ${v} | ${G.map((g) => `${f1(m.volume[g]?.planned)} \\| ${f1(m.variantCount[g])} (${f1(m.volume[g]?.target)})`).join(' | ')} | ${String(m.duration.max)} (${String(m.duration.limit)}) | ${String(m.constraintViolations)} | ${String(m.mainChanges)} |`); }
  }
  out.push('', '## Q1 — volume direct / indirect (A, séries brutes prévues / semaine ; convention B1 : bras synergistes)', '', `| Profil | ${G.join(' | ')} |`, `|---|${G.map(() => '---|').join('')}`);
  for (const id of ids) { const m = by('A', id); if (m) out.push(`| ${id} | ${G.map((g) => `${f1(m.directIndirect[g]?.direct)} / ${f1(m.directIndirect[g]?.indirect)}`).join(' | ')} |`); }
  out.push('', '## Q2 — diagnostic glissant du produit (réalisé, jours au-dessus de la borne haute et causes ; A)', '', '| Profil | Jours par groupe | Causes |', '|---|---|---|');
  for (const id of ids) { const m = by('A', id); if (m) out.push(`| ${id} | ${Object.entries(m.rollingDays).map(([g, n]) => `${g} ${String(n)}`).join(' ; ') || '—'} | ${Object.entries(m.rollingCauses).map(([c, n]) => `${c} ${String(n)}`).join(' ; ') || '—'} |`); }
  out.push('', '## Q5 — indicateur poussée / tirage du produit (dernière semaine, 4 semaines glissantes)', '', '| Profil | A | B1 | Schémas indisponibles |', '|---|---|---|---|');
  for (const id of ids) { const a = by('A', id); const b = by('B1', id); if (a) out.push(`| ${id} | ${a.pushPullStatus} | ${b?.pushPullStatus ?? '—'} | ${a.pushPullUnavailable.join(', ') || '—'} |`); }
  out.push('', '## Q3 / Q7 — stratégies de semaine courte et propositions acceptées', '', '| Profil | Variante | H / B / FB | Non placées | Quadriceps | Ischios | Fessiers | Pectoraux | Dos | Squat | Soulevé roumain | Sous 36 h | Durée max | Propositions acceptées |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const id of LOT43_PROPOSAL_PROFILES) for (const v of ['A', 'SW-ALT', 'SW-ULF', 'SW-FB', 'PROP']) {
    const m = by(v, id); if (!m) continue;
    const ld = (k: string) => { const x = m.loads[k]; return x ? `${x.first} → ${x.last} (↓${String(x.drops)})` : '—'; };
    const acc = m.accepted.length ? `${String(m.accepted.length)} : ${[...new Set(m.accepted.map((x) => x.split(':')[1]))].join(', ')}` : v === 'PROP' ? '0' : '';
    out.push(`| ${id} | ${v} | ${String(m.regions.upper)} / ${String(m.regions.lower)} / ${String(m.regions.full)} | ${String(m.refused)} | ${f1(m.volume.quads?.planned)} | ${f1(m.volume.hamstrings?.planned)} | ${f1(m.volume.glutes?.planned)} | ${f1(m.volume.chest?.planned)} | ${f1(m.volume.back?.planned)} | ${ld('back_squat')} | ${ld('romanian_deadlift')} | ${String(m.recoveryUnder36)} | ${String(m.duration.max)} | ${acc} |`);
  }
  out.push('', '## Contrôles transverses', '', '| Variante | Profils | Erreurs | Sous 36 h | Durée au-delà | Violations matériel / exclusions |', '|---|---|---|---|---|---|');
  for (const v of LOT43_VARIANTS) { const ms = all.filter((m) => m.variant === v.id); if (ms.length) out.push(`| ${v.id} | ${String(ms.length)} | ${String(ms.reduce((n, m) => n + m.errors, 0))} | ${String(ms.reduce((n, m) => n + m.recoveryUnder36, 0))} | ${String(ms.reduce((n, m) => n + m.duration.over, 0))} | ${String(ms.reduce((n, m) => n + m.constraintViolations, 0))} |`); }
  return `${out.join('\n')}\n`;
}
