/**
 * RC2 bis — ÉTUDE (hors production) : organisations hebdomadaires ENTIÈRES imposées au chemin réel de l'application.
 *
 * Rien ici n'est branché à l'application : `beta0Environment()` reste inchangé et ne fournit jamais `studyPins`.
 * Une organisation (« layout ») affecte chaque séance demandée à un jour ; elle est transmise au planificateur par la
 * capacité d'étude `studyPins` (inerte par défaut). Les moteurs génèrent, composent (rotation A/B/C), appliquent leur
 * interférence et leurs contraintes de matériel et de durée exactement comme en Beta 0. L'arbitrage M3 est réduit à la
 * DÉTECTION (aucune action) pour mesurer l'organisation telle qu'elle est, sans la modifier.
 *
 * Valeurs = PARAMÈTRES D'ÉTUDE explicites (disponibilités, partage d'une journée double, variantes de la matrice
 * d'interférence) : aucune n'est proposée comme règle, aucune n'est approuvée.
 */
import { loadRuleset } from '@hybridsport/engine';
import { beta0Environment } from '../../src/index.js';
import type { ProfileInput, ProgrammeEnvironment } from '../../src/index.js';
import { m3Governance } from '../../../planner/tests/m3-governance.js';
import { STRUCTURE_IDS } from '../../../planner/tests/simulation.js';
import { PROFILE } from '../consolidation/sim4.js';
import { CONFIGS } from '../rc2/study-env.js';

export type Sport = 'strength' | 'running' | 'crosstraining';
export const LETTER: Readonly<Record<Sport, string>> = { strength: 'M', running: 'C', crosstraining: 'X' };
export const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const;
const MARK = { justification: 'SIMULATION_ONLY — étude RC2 bis (jamais lue par l’application)' };

// ——— Scénarios de disponibilité (minutes par jour, lundi → dimanche)

// technical-constant: ÉTUDE RC2 bis — part EXPLICITE d’une journée double réservée à la course (minutes) ; 30 min est refusé par le moteur (p90 1815 s > 1800 s)
export const RUN_SHARE_MIN = 35;
export interface Scenario {
  readonly key: string; readonly label: string; readonly availability: readonly number[];
  /** Jours (index) où DEUX séances sont explicitement permises (jamais supposé pour les autres jours). */
  readonly doubleDays: readonly number[];
  /**
   * Variante EXPLORATOIRE de la règle G4 (jamais approuvée) : fenêtre inter-sports ramenée à 0 h, seule façon de
   * laisser deux séances de sports différents partager un jour (la fenêtre TEST actuelle, 24 h, les refuse toujours ;
   * deux jours voisins, à 24 h, restent admis dans les deux cas).
   */
  readonly g4SameDay?: boolean;
}
/* technical-constant: ÉTUDE RC2 bis — disponibilités illustratives (minutes), la semaine 6 jours est celle des profils RC1 */
export const SCENARIOS: readonly Scenario[] = [
  { key: 'S5', label: '5 jours disponibles (mer. et dim. off)', availability: [75, 60, 0, 60, 75, 90, 0], doubleDays: [] },
  { key: 'S6', label: '6 jours disponibles (profil RC1)', availability: [75, 60, 75, 60, 75, 90, 0], doubleDays: [] },
  { key: 'S6D', label: '6 jours + journées doubles explicites mer. et sam. (course 35 min + autre séance), règle G4 actuelle', availability: [75, 60, 75, 60, 75, 90, 0], doubleDays: [2, 5] },
  { key: 'S6Dx', label: '6 jours + journées doubles explicites mer. et sam., G4 EXPLORATOIRE « même jour admis »', availability: [75, 60, 75, 60, 75, 90, 0], doubleDays: [2, 5], g4SameDay: true },
  { key: 'SIRR', label: 'disponibilité irrégulière (45 · 0 · 90 · 30 · 0 · 120 · 60)', availability: [45, 0, 90, 30, 0, 120, 60], doubleDays: [] },
];

// ——— Variantes EXPLORATOIRES de la matrice d'interférence Strength (étude de la « règle des 36 h »)

export interface Variant { readonly key: string; readonly label: string; readonly patch: (a: Record<string, unknown>) => Record<string, unknown> }
export const VARIANTS: readonly Variant[] = [
  { key: 'V0', label: 'matrice actuelle (ruleset verrouillé provisoire)', patch: (a) => a },
  { key: 'V1', label: 'voisine STANDARD (course facile) allégée : importance standard −2 au lieu de −1', patch: (a) => ({ ...a, importanceDelta: { ...(a.importanceDelta as object), standard: -2 } }) },
  { key: 'V2', label: 'sans majoration d’impact locomoteur', patch: (a) => ({ ...a, impactModifiers: [] }) },
  // technical-constant: ÉTUDE RC2 bis — bandes de proximité resserrées (≤ 12 h +1, ≤ 36 h 0, au-delà −2)
  { key: 'V3', label: 'proximité resserrée à 36 h (≤ 12 h +1 ; ≤ 36 h 0 ; au-delà −2)', patch: (a) => ({ ...a, proximityBands: [{ maxHours: 12, delta: 1 }, { maxHours: 36, delta: 0 }], beyondBandsDelta: -2 }) },
];

/** Ruleset Strength de l'environnement avec la matrice `strength.interference.assessment` modifiée (étude seulement). */
function withVariant(env: ProgrammeEnvironment, v: Variant): ProgrammeEnvironment {
  if (v.key === 'V0') return env;
  const content = env.strength?.content;
  if (!content) throw new Error('contenu Strength absent');
  const doc = content.ruleset.document;
  const r = loadRuleset({ ...doc, parameters: doc.parameters.map((p) => (p.id === 'strength.interference.assessment' ? { ...p, value: v.patch(p.value as Record<string, unknown>) as never, justification: MARK.justification } : p)) } as never);
  if (!r.ok) throw new Error(`variante ${v.key} invalide : ${JSON.stringify(r.issues)}`);
  return { ...env, strength: { ...env.strength, content: { ...content, ruleset: r.ruleset } } } as ProgrammeEnvironment;
}

// ——— Organisations

/** Organisation : sports par jour (index 0 = lundi). Une journée double porte deux sports. */
export type Layout = readonly (readonly Sport[])[];
export const layoutLabel = (l: Layout): string => l.map((d, i) => (d.length === 0 ? '' : `${DAYS[i] ?? '?'} ${d.map((s) => LETTER[s]).join('+')}`)).filter(Boolean).join(' · ');

export const demandOf = (p: ProfileInput): Readonly<Record<Sport, number>> => ({
  strength: p.strength.enabled ? p.strength.sessionsPerWeek : 0,
  running: p.running.enabled ? p.running.sessionsPerWeek : 0,
  crosstraining: p.crosstraining.enabled ? (p.crosstraining.sessionsPerWeek ?? 0) : 0,
});

/**
 * Énumère les organisations MAXIMALES : autant de séances que la capacité le permet (jamais de séance retirée
 * volontairement), une seule par jour sauf sur un jour double explicite, où la paire est TOUJOURS course + séance de
 * force (Musculation ou Cross-training). Deux séances de force le même jour et deux séances du même sport sont exclues
 * (décision sportive non prise : aucune fusion silencieuse).
 */
export function enumerate(p: ProfileInput, sc: Scenario): Layout[] {
  const need = demandOf(p);
  const total = need.strength + need.running + need.crosstraining;
  const days = sc.availability.map((m, i) => ({ i, open: m > 0, double: sc.doubleDays.includes(i) && m > RUN_SHARE_MIN }));
  const capacity = days.reduce((a, d) => a + (d.open ? (d.double ? 2 : 1) : 0), 0);
  const target = Math.min(total, capacity);
  const out: Layout[] = [];
  const left = { ...need };
  const cur: Sport[][] = days.map(() => []);
  const options = (d: (typeof days)[number]): Sport[][] => {
    if (!d.open) return [[]];
    const singles = (['strength', 'running', 'crosstraining'] as const).map((s) => [s]);
    const pairs = d.double ? [['running', 'strength'], ['running', 'crosstraining']] as Sport[][] : [];
    return [[], ...singles, ...pairs];
  };
  const rec = (k: number, placed: number): void => {
    if (k === days.length) { if (placed === target) out.push(cur.map((x) => [...x])); return; }
    const remainingCap = days.slice(k).reduce((a, d) => a + (d.open ? (d.double ? 2 : 1) : 0), 0);
    if (placed + remainingCap < target) return;
    for (const o of options(days[k] as (typeof days)[number])) {
      if (o.some((s) => left[s] <= 0) || placed + o.length > target) continue;
      for (const s of o) left[s] -= 1;
      cur[k] = o;
      rec(k + 1, placed + o.length);
      for (const s of o) left[s] += 1;
    }
    cur[k] = [];
  };
  rec(0, 0);
  return out;
}

const addDays = (d: string, n: number): string => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Épingles d'une semaine : identifiants attribués dans l'ordre des dates ; part explicite d'une journée double. */
export function pinsOf(l: Layout, weekStart: string, sc: Scenario): { requestId: string; date: string; minutes?: number }[] {
  const k: Record<Sport, number> = { strength: 0, running: 0, crosstraining: 0 };
  return l.flatMap((sports, i) => sports.map((s) => {
    k[s] += 1;
    const date = addDays(weekStart, i);
    const total = sc.availability[i] ?? 0;
    const minutes = sports.length > 1 ? (s === 'running' ? RUN_SHARE_MIN : total - RUN_SHARE_MIN) : undefined;
    return { requestId: `${weekStart}.${s}.${String(k[s])}`, date, ...(minutes === undefined ? {} : { minutes }) };
  }));
}

/**
 * Environnement d'étude : Beta 0, arbitrage M3 en DÉTECTION SEULE (mêmes règles TEST que Beta 0, aucune action),
 * variante de matrice d'interférence, organisation imposée chaque semaine.
 */
export function weekEnv(o: { readonly layout: Layout; readonly scenario: Scenario; readonly variant?: Variant }): ProgrammeEnvironment {
  const base = beta0Environment();
  const g4 = o.scenario.g4SameDay ? { g4: Object.fromEntries(STRUCTURE_IDS.map((x) => [x, 0])) } : {};
  const env: ProgrammeEnvironment = { ...base, governance: m3Governance({ extra: MARK, actions: [], ...g4 }), studyPins: (weekStart) => pinsOf(o.layout, weekStart, o.scenario) };
  return withVariant(env, o.variant ?? (VARIANTS[0] as Variant));
}
/** Référence RC1 (placement glouton + M3 Beta 0) avec une variante de matrice, sans organisation imposée. */
export const rc1Env = (variant?: Variant): ProgrammeEnvironment => withVariant(beta0Environment(), variant ?? (VARIANTS[0] as Variant));

/** Profils étudiés : configurations RC1 (E = planification de A, diffère seulement par l'exécution). */
export const PROFILES = CONFIGS;
export const profileOf = (c: (typeof CONFIGS)[number], sc: Scenario): ProfileInput => ({ ...(c.profile ?? PROFILE), availability: [...sc.availability] } as ProfileInput);

