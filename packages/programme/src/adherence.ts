/**
 * Adhérence DESCRIPTIVE : comptes factuels d'une semaine (demandé, planifié, réalisé, tel que prescrit, modifié,
 * abandonné, manqué, douleur). AUCUN seuil, aucune décision : la décision est une politique gouvernée séparée.
 */
import type { Adherence, ProgrammeResult, ProgrammeWeek } from './model.js';

export function adherenceOf(requests: ProgrammeWeek['requests'], results: readonly ProgrammeResult[]): Adherence {
  const planned = requests.filter((r) => r.status === 'planned');
  const res = results.filter((x) => planned.some((r) => r.requestId === x.requestId));
  const count = (c: ProgrammeResult['completion']) => res.filter((x) => x.completion === c).length;
  const asPrescribed = count('completed_as_prescribed');
  const modified = count('modified');
  return {
    requested: requests.length, planned: planned.length, notPlanned: requests.length - planned.length,
    completed: asPrescribed + modified, completedAsPrescribed: asPrescribed, modified, abandoned: count('abandoned'), missed: count('missed'),
    painReported: res.filter((x) => x.pain).length,
  };
}

/** Part réalisée telle que prescrite (fraction exacte), ou null si aucune séance planifiée (non définie). */
export const asPrescribedShare = (a: Adherence): number | null => (a.planned === 0 ? null : a.completedAsPrescribed / a.planned);
