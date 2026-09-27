/**
 * Revue du CATALOGUE pour la Musculation (phase 4C §7). La qualité du moteur dépend des métadonnées :
 * ce module les AUDITE, il ne les corrige pas et ne code aucune vérité biomécanique. Toutes les attentes
 * viennent d'une configuration de revue (données), et chaque constat peut être ACQUITTÉ par un
 * relecteur avec une justification. Seuls les constats `error` non acquittés sont bloquants.
 *
 * Contrôles :
 *   C1 too_many_primary            nombre de muscles primaires au-delà de l'attente
 *   C2 isolation_multi_group       isolation dont les muscles primaires couvrent plusieurs groupes
 *   C3 suspicious_primary          muscle listé primaire alors que la revue l'attend secondaire pour ce pattern
 *   C4 pattern_region              région du pattern incompatible avec la région des muscles primaires (taxonomie)
 *   C5 stability_range             stabilité hors de la plage attendue pour la classe d'équipement
 *   C6 load_ceiling                plafond de charge incohérent avec la nature de l'exercice
 *   C7 progression_family_missing  exercice de force sans famille de progression
 *   C8 loadable_without_progression chargeable sans progression de charge possible (modèle / incrément)
 */
import type { Exercise } from '@hybridsport/domain';
import type { LoadedCatalog } from '@hybridsport/engine';

export const CATALOG_CHECKS = ['too_many_primary', 'isolation_multi_group', 'suspicious_primary', 'pattern_region', 'stability_range', 'load_ceiling', 'progression_family_missing', 'loadable_without_progression'] as const;
export type CatalogCheck = (typeof CATALOG_CHECKS)[number];
export type FindingSeverity = 'error' | 'warning' | 'review';

export interface CatalogReviewConfig {
  /** C1 : muscles primaires au plus (au-delà : à relire). */
  readonly maxPrimaryMuscles: number;
  /** C2 : groupes musculaires (au sens du volume) couverts par les primaires d'une isolation, au plus. */
  readonly isolationMaxPrimaryGroups: number;
  /** C3 : pour un pattern, muscles attendus SECONDAIRES (attente de revue, pas une vérité). */
  readonly expectedSecondary: Readonly<Record<string, readonly string[]>>;
  /** C5 : plage de stabilité attendue par classe d'équipement de la taxonomie. */
  readonly stabilityByEquipmentClass: Readonly<Record<string, { readonly min: number; readonly max: number }>>;
  /** C6 : plafond de charge maximal attendu pour une isolation. */
  readonly isolationMaxLoadCeiling: number;
  /** C7 : types de mouvement pour lesquels une famille de progression est attendue. */
  readonly progressionFamilyMovementTypes: readonly string[];
  /** C8 : incrément de charge connu par modèle de charge (paramètre `strength.load.defaultIncrements`). */
  readonly incrementByLoadModel: Readonly<Record<string, number | undefined>>;
  /** Groupes musculaires (paramètre `strength.volume.muscleGroups`). */
  readonly muscleGroups: Readonly<Record<string, readonly string[]>>;
  /** Acquittements de relecture : un constat acquitté reste visible mais n'est plus bloquant. */
  readonly acknowledged: readonly { readonly exerciseId: string; readonly check: CatalogCheck; readonly justification: string; readonly reviewer: string }[];
}

export interface CatalogFinding {
  readonly exerciseId: string;
  readonly check: CatalogCheck;
  readonly severity: FindingSeverity;
  readonly detail: string;
  readonly acknowledged?: { readonly justification: string; readonly reviewer: string };
}

export interface CatalogReview {
  readonly findings: readonly CatalogFinding[];
  readonly blocking: readonly CatalogFinding[];
  readonly byCheck: Readonly<Record<CatalogCheck, number>>;
  readonly reviewed: number;
}

function equipmentClasses(e: Exercise, catalog: LoadedCatalog): string[] {
  const tax = catalog.document.taxonomy.equipment;
  const ids = [...e.equipment.allOf, ...e.equipment.anyOf];
  const classes = ids.map((id) => tax.find((t) => t.id === id)?.class).filter((c): c is NonNullable<typeof c> => c !== undefined);
  return classes.length > 0 ? [...new Set(classes)].sort() : ['bodyweight'];
}

/** Revue des exercices de la discipline Musculation (déterministe, triée). */
export function reviewStrengthCatalog(catalog: LoadedCatalog, config: CatalogReviewConfig): CatalogReview {
  const out: CatalogFinding[] = [];
  const tax = catalog.document.taxonomy;
  const exercises = [...catalog.exercises()].filter((e) => e.disciplines.includes('strength') && e.movementType !== 'mobility').sort((a, b) => (a.id < b.id ? -1 : 1));
  const add = (e: Exercise, check: CatalogCheck, severity: FindingSeverity, detail: string) => {
    const ack = config.acknowledged.find((a) => a.exerciseId === e.id && a.check === check);
    out.push({ exerciseId: e.id, check, severity, detail, ...(ack ? { acknowledged: { justification: ack.justification, reviewer: ack.reviewer } } : {}) });
  };
  const groupsOf = (muscles: readonly string[]) => Object.keys(config.muscleGroups).filter((g) => (config.muscleGroups[g] ?? []).some((m) => muscles.includes(m))).sort();
  for (const e of exercises) {
    if (e.muscles.primary.length > config.maxPrimaryMuscles) add(e, 'too_many_primary', 'review', `${String(e.muscles.primary.length)} muscles primaires (${e.muscles.primary.join(', ')})`);
    const pg = groupsOf(e.muscles.primary);
    if (!e.compound && pg.length > config.isolationMaxPrimaryGroups) add(e, 'isolation_multi_group', 'warning', `isolation couvrant ${pg.join(' + ')}`);
    const suspicious = (config.expectedSecondary[e.patterns.primary] ?? []).filter((m) => e.muscles.primary.includes(m));
    if (suspicious.length > 0) add(e, 'suspicious_primary', 'review', `${suspicious.join(', ')} en primaire sur le pattern ${e.patterns.primary} (attendu secondaire)`);
    const pr = tax.patterns.find((p) => p.id === e.patterns.primary)?.region;
    const mr = [...new Set(e.muscles.primary.map((m) => tax.muscles.find((x) => x.id === m)?.region).filter(Boolean))];
    if ((pr === 'upper' || pr === 'lower' || pr === 'core') && mr.length > 0 && !mr.includes(pr)) add(e, 'pattern_region', 'error', `pattern ${e.patterns.primary} (${pr}) sans muscle primaire de cette région (${mr.join(', ')})`);
    for (const cls of equipmentClasses(e, catalog)) {
      const range = config.stabilityByEquipmentClass[cls];
      if (range && (e.stability < range.min || e.stability > range.max)) add(e, 'stability_range', 'review', `stabilité ${String(e.stability)} hors [${String(range.min)}, ${String(range.max)}] attendu pour la classe ${cls}`);
    }
    if (!e.loadable && e.loadCeiling > 0) add(e, 'load_ceiling', 'error', `non chargeable mais plafond de charge ${String(e.loadCeiling)}`);
    else if (e.loadable && e.loadCeiling === 0) add(e, 'load_ceiling', 'warning', 'chargeable mais plafond de charge 0');
    else if (!e.compound && e.loadCeiling > config.isolationMaxLoadCeiling) add(e, 'load_ceiling', 'review', `isolation avec plafond de charge ${String(e.loadCeiling)}`);
    if (config.progressionFamilyMovementTypes.includes(e.movementType) && !e.progressionFamily) add(e, 'progression_family_missing', 'warning', `aucune famille de progression (${e.movementType})`);
    if (e.loadable && (!e.loadModel || config.incrementByLoadModel[e.loadModel] === undefined)) add(e, 'loadable_without_progression', 'error', e.loadModel ? `aucun incrément connu pour ${e.loadModel}` : 'chargeable sans modèle de charge');
  }
  const byCheck = Object.fromEntries(CATALOG_CHECKS.map((c) => [c, out.filter((f) => f.check === c).length])) as Record<CatalogCheck, number>;
  return { findings: out, blocking: out.filter((f) => f.severity === 'error' && !f.acknowledged), byCheck, reviewed: exercises.length };
}
