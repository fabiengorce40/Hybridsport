/**
 * RC3.1 A1 — état du jour (fatigue / récupération) sur une séance Musculation PERSISTÉE non reproductible.
 *
 * La séance n'est jamais régénérée : seule la règle d'état du moteur Strength (`strength.dose.modifiers.readiness`,
 * valeur et politique de conflit du ruleset) est appliquée à l'EFFORT visé (RIR) des séries de travail, selon la formule
 * du dosage du moteur (strength `dose.ts`) : RIR = RIR de base du profil de dose + delta combiné des modificateurs.
 * Les modificateurs déjà appliqués ne sont pas persistés avec la séance : leur delta combiné est RETROUVÉ à partir du
 * RIR de base lu dans le ruleset (profil de dose du stimulus × rôle du créneau dans l'archétype × classe d'exercice).
 * Les séries de calibration suivent la même formule que le moteur (`strength.calibration`).
 *
 * Invariants (sinon refus EXPLICITE, exercice par exercice) :
 *   - exercices, nombre de séries, répétitions, charges, repos et exclusions de douleur inchangés ;
 *   - jamais un exercice dont la charge est CALCULÉE à partir de l'effort (observation spécifique, % d'e1RM, historique,
 *     fourchette indicative) : la règle du moteur changerait aussi la charge, ce qui n'est jamais fait ici ;
 *   - profil de dose, créneau et classe d'exercice lisibles ; séries de calibration retrouvées à l'identique ;
 *   - la part « séries » de la règle (ex. une série de moins si l'état est « réduire ») n'est jamais appliquée : tracée.
 */
import type { SessionDraft } from '@hybridsport/domain';
import type { LoadedCatalog, LoadedRuleset } from '@hybridsport/engine';
import { exerciseClass, readStrengthParams } from '@hybridsport/strength';
import type { Reason } from './model.js';

type Item = SessionDraft['blocks'][number]['items'][number];
type SetP = Extract<Item['prescription'], { type: 'sets' }>['sets'][number];

export interface ReadinessOnPersisted {
  /** Delta d'effort de la règle d'état (ruleset) et part « séries » NON appliquée. */
  readonly rule: { readonly rirDelta: number; readonly setsDeltaNotApplied: number; readonly policy: string };
  /** Exercices ajustés (RIR +Δ, Δ > 0) et exercices déjà couverts (Δ = 0 : un modificateur plus prudent s'applique déjà). */
  readonly adjusted: readonly string[];
  readonly covered: readonly string[];
  /** Exercices NON ajustés, avec la cause (invariant non respecté). */
  readonly refused: readonly { readonly exerciseId: string; readonly cause: string }[];
}

const DOSED_BLOCKS = new Set(['strength', 'accessory']);
/**
 * Sources de charge du moteur (strength `decideLoad`) qui dépendent de l'effort visé : observation spécifique (choisie
 * près du RIR cible), pourcentage d'e1RM (fonction de répétitions + RIR), historique (e1RM × pourcentage).
 */
const LOAD_FROM_EFFORT = new Set(['DOSE.LOAD.FROM_SPECIFIC', 'DOSE.LOAD.FROM_E1RM', 'DOSE.LOAD.FROM_HISTORY']);
const effortOf = (s: SetP): number | undefined => {
  const e = s.intensity && 'effort' in s.intensity ? s.intensity.effort : undefined;
  return e && 'rir' in e && typeof e.rir === 'number' ? e.rir : undefined;
};
/**
 * Charge INDÉPENDANTE de l'effort visé : effort seul (calibration, sans fourchette indicative), poids du corps, ou
 * charge portée par la track de progression (aucune source dépendante de l'effort tracée pour l'exercice).
 */
const effortOnly = (s: SetP, loadFromEffort: boolean): boolean => {
  const i = s.intensity;
  if (!i) return false;
  if (i.mode === 'bodyweight') return true;
  if (i.mode === 'effort') return !('indicativeKg' in i && i.indicativeKg !== undefined);
  return i.mode === 'load' && !loadFromEffort;
};
const withRir = (s: SetP, rir: number): SetP => {
  const i = s.intensity;
  if (!i || !('effort' in i)) return s;
  return { ...s, intensity: { ...i, effort: { ...i.effort, rir } } } as SetP;
};

/**
 * Applique la règle d'état `readiness` au RIR de la séance persistée `session` (tracée par `reasons`, composée pour
 * `intent`). Pur ; null si la règle n'est pas lisible dans le ruleset (aucune valeur supposée).
 */
export function applyReadinessToPersisted(
  session: SessionDraft, reasons: readonly Reason[], readiness: 'caution' | 'reduce',
  content: { readonly ruleset: LoadedRuleset; readonly catalog: LoadedCatalog }, intent: { readonly archetypeId: string; readonly stimulus: string },
): { readonly session: SessionDraft; readonly result: ReadinessOnPersisted } | null {
  const params = readStrengthParams(content.ruleset).values;
  const m = params['strength.dose.modifiers'];
  const cal = params['strength.calibration'];
  const rule = m.readiness[readiness];
  if (!Number.isFinite(rule.rirDelta) || !Number.isFinite(cal.targetRir) || !Number.isInteger(cal.sets)) return null;
  const profile = params['strength.stimuli'][intent.stimulus]?.doseProfile;
  const archetype = params['strength.archetypes'].find((a) => a.id === intent.archetypeId);
  const adjusted: string[] = [];
  const covered: string[] = [];
  const refused: { exerciseId: string; cause: string }[] = [];

  const adjust = (it: Item): Item => {
    if (it.prescription.type !== 'sets') return it;
    const id = it.exerciseId;
    const refuse = (cause: string): Item => { refused.push({ exerciseId: id, cause }); return it; };
    const chosen = reasons.filter((r) => r.code === 'SELECT.EXERCISE.CHOSEN' && r.params.exerciseId === id);
    if (chosen.length === 0) return refuse('trace_unavailable');
    // État inconnu traité comme « prudence » à la planification : l'état est déjà dans la séance, jamais cumulé.
    if (m.unknownReadiness === 'as_caution') {
      if (readiness !== 'caution') return refuse('readiness_already_applied');
      covered.push(id);
      return it;
    }
    const sets = it.prescription.sets;
    const working = sets.map((s, k) => ({ s, k })).filter(({ s }) => s.kind !== 'rampup');
    if (working.some(({ s }) => s.kind !== 'working')) return refuse('load_derived_from_effort');
    const loadFromEffort = reasons.some((r) => LOAD_FROM_EFFORT.has(r.code) && r.params.exerciseId === id);
    if (working.some(({ s }) => !effortOnly(s, loadFromEffort))) return refuse('load_derived_from_effort');
    if (working.some(({ s }) => effortOf(s) === undefined)) return refuse('effort_unreadable');
    // RIR de base du profil de dose (ruleset) : stimulus × rôle du créneau × classe d'exercice.
    const roles = [...new Set(chosen.map((r) => archetype?.slots.find((x) => x.id === r.params.slot)?.role))];
    const exercise = content.catalog.exercise(id);
    const role = roles.length === 1 ? roles[0] : undefined;
    const cell = profile && role && exercise ? params['strength.dose.base'][profile]?.[role]?.[exerciseClass(exercise, params)] : undefined;
    if (!cell) return refuse('dose_profile_unreadable');
    const calibration = reasons.some((r) => r.code === 'DOSE.LOAD.CALIBRATION' && r.params.exerciseId === id) ? Math.min(working.length, cal.sets) : 0;
    const normal = working.slice(calibration).map(({ s }) => effortOf(s) as number);
    const calibrationSets = working.slice(0, calibration).map(({ s }) => effortOf(s) as number);
    if (new Set(normal).size > 1 || new Set(calibrationSets).size > 1) return refuse('trace_inconsistent');
    // Effort plancher (0) : le delta déjà appliqué n'est pas reconstructible ⇒ refus.
    if (normal[0] === 0) return refuse('effort_floor_reached');
    // Delta combiné DÉJÀ appliqué par le moteur (dose.ts : RIR = base + delta ; calibration : max(base, cible) + delta).
    const before = normal[0] !== undefined ? normal[0] - cell.rir : (calibrationSets[0] ?? 0) - Math.max(cell.rir, cal.targetRir);
    if (calibrationSets.length > 0 && calibrationSets[0] !== Math.max(cell.rir + before, cal.targetRir + before)) return refuse('trace_inconsistent');
    // Politique de conflit du ruleset : « la plus prudente » (max des deltas) ou « somme ».
    const after = m.conflictPolicy === 'sum' ? before + rule.rirDelta : Math.max(before, rule.rirDelta);
    const delta = after - before;
    // Jamais un effort plus élevé que prévu : un delta nul ou négatif laisse l'exercice tel quel.
    if (delta <= 0) {
      covered.push(id);
      return it;
    }
    const next = sets.map((s, k) => {
      const w = working.findIndex((x) => x.k === k);
      if (w < 0) return s;
      return withRir(s, w < calibration ? Math.max(cell.rir + after, cal.targetRir + after) : (effortOf(s) as number) + delta);
    });
    adjusted.push(id);
    return { ...it, prescription: { ...it.prescription, sets: next } };
  };

  const next: SessionDraft = { ...session, blocks: session.blocks.map((b) => (DOSED_BLOCKS.has(b.kind) ? { ...b, items: b.items.map(adjust) } : b)) };
  return { session: next, result: { rule: { rirDelta: rule.rirDelta, setsDeltaNotApplied: rule.setsDelta, policy: m.conflictPolicy }, adjusted, covered, refused } };
}
