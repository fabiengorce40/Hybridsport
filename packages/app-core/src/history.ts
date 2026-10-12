/**
 * Strength S4 — HISTORIQUE CHAUD vs AUDIT : compaction DÉTERMINISTE des semaines planifiées anciennes.
 *
 * Données CHAUDES (lues par la génération, jamais touchées ici) : profil, programme (définition, semaines, résultats,
 * décisions, audit), historiques sportifs (`strength`, `running`, `fingerprints`…), séances planifiées
 * (`record` : contenu affiché dans l'historique), et la semaine PRÉCÉDENTE complète (`recentOf` : contexte voisin).
 *
 * Données d'AUDIT/DEBUG recopiées dans chaque séance planifiée et jamais relues : calculs intermédiaires et valeurs
 * RECALCULABLES depuis la séance (`DROPPABLE_CODES`), profil de demande (`demand`, dérivable par le CORE depuis la
 * séance) et contexte voisin au moment de la planification (`neighbourContext`).
 *
 * Périmètre : semaines du PROGRAMME CLÔTURÉES, sauf la dernière clôturée (que la génération peut relire comme semaine
 * précédente). Chaque séance compactée porte `KAIRO.HISTORY_COMPACTED` (codes retirés et nombre) : la perte est
 * explicite, jamais silencieuse. Les décisions (choix d'exercice, continuité, progression, provenance de charge,
 * interférence retenue, composition, prescription hebdomadaire, refus) sont CONSERVÉES ; tout code inconnu aussi.
 * Idempotente. Aucun nombre sportif.
 */
import type { AppState, PersistedWeek } from './model.js';

/** Codes d'audit/debug retirés des semaines anciennes : calculs intermédiaires ou recalculables depuis la séance. */
export const DROPPABLE_CODES: ReadonlySet<string> = new Set([
  // Anti-doublon du CORE : analyse détaillée au moment de la planification (l'empreinte reste dans `fingerprints`).
  'DUPLICATE.ACCIDENTAL', 'DUPLICATE.PLANNED',
  // Calcul intermédiaire de la confiance de charge (la charge et sa source restent dans la séance et DOSE.LOAD.FROM_*).
  'DOSE.LOAD.CONFIDENCE',
  // Recalculables depuis la séance : séries par exercice, ancre appliquée (`refs.anchor`).
  'DOSE.VOLUME_ALLOCATED', 'PROGRESSION.ANCHOR_APPLIED',
  // Évaluation d'interférence structure par structure (la décision retenue reste : PLAN.STRUCTURE_LOWERED).
  'PLAN.INTERFERENCE_ASSESSED',
  // Plomberie du planificateur : contexte voisin et expositions de la semaine (rejouables depuis les séances).
  'PLAN.PLANNER.NEIGHBOUR_CONTEXT', 'PLAN.PLANNER.WEEK_EXPOSURES',
  // Recalculables depuis la semaine persistée : placement (date et statut de la demande), composition appliquée
  // (`composition` de la demande), signal même discipline (dates et structures des séances persistées).
  'PLAN.PLANNER.PLACED', 'PLAN.PLANNER.COMPOSITION_APPLIED', 'PLAN.PLANNER.SAME_DISCIPLINE_UNGOVERNED',
]);

export const HISTORY_COMPACTED = 'KAIRO.HISTORY_COMPACTED';

/**
 * C4.1 — provenance des valeurs candidates (`*.CANDIDATE_VALUE_USED`) REGROUPÉE sans perte dans les semaines anciennes :
 * une raison par code, colonnes de paramètres et positions d'origine (`at`). `expandFoldedReasons` restitue la liste
 * exacte (mêmes raisons, même ordre). Regroupement seulement si toutes les entrées d'un code ont les mêmes clés.
 */
export const PROVENANCE_FOLDED = 'KAIRO.PROVENANCE_FOLDED';
const FOLDABLE = /\.CANDIDATE_VALUE_USED$/;

type Request = PersistedWeek['requests'][number];
type Reason = Request['reasons'][number];

function foldProvenance(reasons: readonly Reason[]): { reasons: Reason[]; folded: string[] } {
  // Déjà regroupée : aucune nouvelle passe (les positions d'origine restent celles du premier regroupement).
  if (reasons.some((x) => x.code === PROVENANCE_FOLDED)) return { reasons: [...reasons], folded: [] };
  const groups = new Map<string, number[]>();
  reasons.forEach((x, i) => { if (FOLDABLE.test(x.code)) groups.set(x.code, [...(groups.get(x.code) ?? []), i]); });
  const folds: Reason[] = [];
  const taken = new Set<number>();
  for (const [code, at] of groups) {
    const keys = Object.keys(reasons[at[0] ?? 0]?.params ?? {}).sort();
    const same = at.every((i) => JSON.stringify(Object.keys(reasons[i]?.params ?? {}).sort()) === JSON.stringify(keys));
    if (at.length <= 1 || !same) continue;
    const columns = Object.fromEntries(keys.map((k) => [k, at.map((i) => reasons[i]?.params[k])]));
    folds.push({ code: PROVENANCE_FOLDED, params: { code, at, keys, columns } });
    for (const i of at) taken.add(i);
  }
  return { reasons: [...reasons.filter((_, i) => !taken.has(i)), ...folds], folded: folds.map((f) => String(f.params.code)) };
}

/** Restitue la liste de raisons d'origine (positions et contenus exacts) ; sans regroupement : liste inchangée. */
export function expandFoldedReasons<T extends Reason>(reasons: readonly T[]): Reason[] {
  const folds = reasons.filter((x) => x.code === PROVENANCE_FOLDED);
  if (folds.length === 0) return [...reasons];
  const rest: Reason[] = reasons.filter((x) => x.code !== PROVENANCE_FOLDED);
  const placed = new Map<number, Reason>();
  for (const f of folds) {
    const at = (f.params.at as number[] | undefined) ?? [];
    const keys = (f.params.keys as string[] | undefined) ?? [];
    const cols = (f.params.columns as Record<string, unknown[]> | undefined) ?? {};
    at.forEach((pos, j) => placed.set(pos, { code: String(f.params.code), params: Object.fromEntries(keys.map((k) => [k, cols[k]?.[j]])) }));
  }
  const out: Reason[] = [];
  let k = 0;
  // Positions relatives à la liste sans le marqueur de compaction (toujours en dernier) : il est réajouté à la fin.
  const marker = rest.filter((x) => x.code === HISTORY_COMPACTED);
  const body = rest.filter((x) => x.code !== HISTORY_COMPACTED);
  for (let i = 0; i < body.length + placed.size; i += 1) {
    const p = placed.get(i);
    if (p) out.push(p); else { const b = body[k]; k += 1; if (b) out.push(b); }
  }
  return [...out, ...marker];
}

function compactRequest(r: Request): Request {
  // Rien de nouveau à retirer (séance déjà compactée ou sans audit/debug) : séance inchangée (idempotence stricte).
  const foldable = r.reasons.filter((x) => FOLDABLE.test(x.code)).length > 1;
  if (!r.demand && !r.neighbourContext && !foldable && !r.reasons.some((x) => DROPPABLE_CODES.has(x.code))) return r;
  const dropped = new Map<string, number>();
  const prior = r.reasons.find((x) => x.code === HISTORY_COMPACTED);
  for (const d of (prior?.params.dropped as string[] | undefined) ?? []) {
    const [code, n] = d.split('×');
    if (code) dropped.set(code, (dropped.get(code) ?? 0) + Number(n ?? 0));
  }
  const kept = r.reasons.filter((x) => {
    if (x.code === HISTORY_COMPACTED) return false;
    if (!DROPPABLE_CODES.has(x.code)) return true;
    dropped.set(x.code, (dropped.get(x.code) ?? 0) + 1);
    return false;
  });
  const fields = [...new Set([...((prior?.params.fields as string[] | undefined) ?? []), ...(r.demand ? ['demand'] : []), ...(r.neighbourContext ? ['neighbourContext'] : [])])].sort();
  const f = foldProvenance(kept);
  if (dropped.size === 0 && fields.length === 0 && f.folded.length === 0) return r;
  const { demand: _demand, neighbourContext: _neighbours, ...rest } = r;
  const folded = [...new Set([...((prior?.params.folded as string[] | undefined) ?? []), ...f.folded])].sort();
  const marker = { code: HISTORY_COMPACTED, params: { dropped: [...dropped].sort(([a], [b]) => (a < b ? -1 : 1)).map(([c, n]) => `${c}×${String(n)}`), fields, ...(folded.length > 0 ? { folded } : {}) } };
  return { ...rest, reasons: [...f.reasons, marker] };
}

/** Semaines compactables : semaines du programme clôturées, sauf la plus récente clôturée. */
export function compactableWeeks(state: AppState): string[] {
  const closed = (state.programmeState?.weeks ?? []).filter((w) => w.closedAt !== undefined).sort((a, b) => a.weekIndex - b.weekIndex);
  return closed.slice(0, -1).map((w) => w.plannerRef).filter((ref) => state.planner.weeks[ref]?.owner === 'programme');
}

/** Compaction déterministe et idempotente (voir en-tête). L'état rendu est identique si rien n'est compactable. */
export function compactHistory(state: AppState): AppState {
  const refs = compactableWeeks(state);
  if (refs.length === 0) return state;
  let changed = false;
  const weeks = { ...state.planner.weeks };
  for (const ref of refs) {
    const w = weeks[ref];
    if (!w) continue;
    const requests = w.requests.map(compactRequest);
    if (requests.some((r, i) => r !== w.requests[i])) { weeks[ref] = { ...w, requests }; changed = true; }
  }
  return changed ? { ...state, planner: { ...state.planner, weeks } } : state;
}
