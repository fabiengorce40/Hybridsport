/**
 * RC3 (préparation) — DÉCOMPOSITION descriptive du volume Musculation d'une séance, sans indicateur inventé :
 *   - séries DIRECTES : séries de travail d'un exercice dont le groupe est PRIMAIRE (compte brut) ;
 *   - séries INDIRECTES : séries de travail d'un exercice dont le groupe est SECONDAIRE (compte brut, NON pondéré) ;
 *   - « bilan E1 » : la règle gouvernée de l'application (primaire 1 + secondaire × poids du ruleset), rappelée telle
 *     quelle pour comparaison, jamais présentée comme un volume utile.
 * Prescrit = séries de travail non facultatives de la prescription ; réalisé = séries de travail VALIDÉES dans le
 * journal de séance. Montées en charge exclues (comme la règle E1). Aucune pondération ajoutée.
 */
import type { SessionDraft } from '@hybridsport/domain';
import type { LoadedCatalog } from '@hybridsport/engine';
import type { StrengthParams } from '@hybridsport/strength';

export interface VolumeSplit {
  readonly direct: Readonly<Record<string, number>>;
  readonly indirect: Readonly<Record<string, number>>;
  /** Règle E1 gouvernée (rappel) : primaire + secondaire × `secondaryWeight`. */
  readonly e1: Readonly<Record<string, number>>;
  /** RIR cible le plus bas (effort le plus élevé) parmi les séries directes de chaque groupe ; absent si inconnu. */
  readonly minRir: Readonly<Record<string, number>>;
}
export const EMPTY_SPLIT: VolumeSplit = { direct: {}, indirect: {}, e1: {}, minRir: {} };

type SetP = Extract<SessionDraft['blocks'][number]['items'][number]['prescription'], { type: 'sets' }>['sets'][number];
const rirOf = (s: SetP): number | undefined => s.rir ?? (s.intensity && 'effort' in s.intensity && s.intensity.effort && 'rir' in s.intensity.effort ? s.intensity.effort.rir : undefined);
const isWorking = (s: SetP) => s.kind !== 'rampup' && s.optional !== true;

/** Groupes primaires / secondaires d'un exercice selon la table `strength.volume.muscleGroups` (lecture). */
export function groupsOfExercise(muscles: { readonly primary: readonly string[]; readonly secondary: readonly string[] }, params: StrengthParams): { primary: string[]; secondary: string[] } {
  const table = params['strength.volume'].muscleGroups;
  const find = (ms: readonly string[]) => Object.keys(table).filter((g) => (table[g] ?? []).some((m) => ms.includes(m))).sort();
  const primary = find(muscles.primary);
  return { primary, secondary: find(muscles.secondary).filter((g) => !primary.includes(g)) };
}

/**
 * `done` : clés `itemId#setIndex` des séries validées (réalisé). Absent ⇒ prescrit. Seuls les blocs de force
 * (`strength`, `accessory`) sont comptés : échauffement, retour au calme et conditionnement CT exclus.
 */
export function splitVolume(session: SessionDraft | undefined, params: StrengthParams, catalog: LoadedCatalog, done?: ReadonlySet<string>): VolumeSplit {
  if (!session) return EMPTY_SPLIT;
  const w = params['strength.volume'].secondaryWeight;
  const direct: Record<string, number> = {}; const indirect: Record<string, number> = {}; const e1: Record<string, number> = {}; const minRir: Record<string, number> = {};
  for (const it of session.blocks.filter((b) => b.kind === 'strength' || b.kind === 'accessory').flatMap((b) => b.items)) {
    const ex = catalog.exercise(it.exerciseId);
    if (!ex || it.prescription.type !== 'sets') continue;
    const sets = it.prescription.sets.map((s, i) => ({ s, i })).filter(({ s, i }) => isWorking(s) && (done === undefined || done.has(`${it.id}#${String(i)}`)));
    if (sets.length === 0) continue;
    const g = groupsOfExercise(ex.muscles, params);
    const rirs = sets.map(({ s }) => rirOf(s)).filter((x): x is number => x !== undefined);
    for (const p of g.primary) {
      direct[p] = (direct[p] ?? 0) + sets.length; e1[p] = (e1[p] ?? 0) + sets.length;
      if (rirs.length > 0) minRir[p] = Math.min(minRir[p] ?? Infinity, ...rirs);
    }
    for (const s of g.secondary) { indirect[s] = (indirect[s] ?? 0) + sets.length; e1[s] = (e1[s] ?? 0) + sets.length * w; }
  }
  return { direct, indirect, e1, minRir };
}

export const sumGroups = (r: Readonly<Record<string, number>>, gs: readonly string[]): number => gs.reduce((a, g) => a + (r[g] ?? 0), 0);
