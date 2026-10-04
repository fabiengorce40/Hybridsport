import { NOT_APPLICABLE, isNotApplicable, zFingerprintInputs } from '@hybridsport/domain';
import type { ReasonCode, SessionDraft, SessionFingerprint } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedCatalog } from '../catalog/catalog.js';
import type { DurationEstimate } from '../duration/estimate.js';

const reasons = createCoreRegistry();

export type FingerprintResult = { ok: true; fingerprint: SessionFingerprint } | { ok: false; reasons: ReasonCode[] };

const sortedUnique = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

function normalize(v: Record<string, number>): Record<string, number> {
  const total = Object.values(v).reduce((a, b) => a + b, 0);
  const keys = Object.keys(v).sort();
  return Object.fromEntries(keys.map((k) => [k, total > 0 ? (v[k] ?? 0) / total : 0]));
}

type Issue = { readonly path: readonly PropertyKey[]; readonly message: string; readonly code?: string; readonly errors?: readonly (readonly Issue[])[] };
/**
 * Dimension `connu | not_applicable` invalide : le diagnostic précis est celui de la branche CONNUE (la première),
 * identique au diagnostic d'avant l'union (une valeur connue mal formée reste expliquée champ par champ).
 */
function knownBranchIssues(i: Issue): Issue[] {
  const known = i.code === 'invalid_union' ? i.errors?.[0] : undefined;
  return known && known.length > 0 ? known.map((e) => ({ path: [...i.path, ...e.path], message: e.message })) : [i];
}

/**
 * Construit l'empreinte d'une séance (spec 07 §4). Le CORE dérive lui-même, depuis la séance et le
 * catalogue, les composantes qu'un moteur ne doit pas pouvoir travestir (exercices, familles,
 * équivalences, patterns et muscles primaires, structure et durées) ; les entrées du moteur (`inputs`,
 * non typées ⇒ validées) apportent le stimulus, l'énergie, le format et les marqueurs de prescription.
 * Pure et déterministe ; toute incohérence est une erreur TECHNICAL explicite.
 */
export function buildFingerprint(session: SessionDraft, catalog: LoadedCatalog, inputs: unknown, estimate?: DurationEstimate): FingerprintResult {
  const parsed = zFingerprintInputs.safeParse(inputs);
  if (!parsed.success) {
    return { ok: false, reasons: parsed.error.issues.flatMap(knownBranchIssues).map((i) => reasons.emit('TECHNICAL.SCHEMA_INVALID', { path: `fingerprintInputs.${i.path.join('.')}`, problem: i.message })) };
  }
  const inp = parsed.data;
  const items = session.blocks.flatMap((b) => b.items);
  const problems: ReasonCode[] = [];
  const itemIds = new Set(items.map((i) => i.id));
  for (const i of items) if (inp.volumeByItem[i.id] === undefined) problems.push(reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: 'volume absent pour un item', target: i.id }));
  for (const id of Object.keys(inp.volumeByItem)) if (!itemIds.has(id)) problems.push(reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: 'volume fourni pour un item absent de la séance', target: id }));
  // Énergie `not_applicable` déclarée : aucune répartition à contrôler ni à normaliser.
  const energy = isNotApplicable(inp.energy) ? undefined : inp.energy;
  const energyTotal = energy ? energy.low + energy.moderate + energy.high : 0;
  if (energy && !(energyTotal > 0)) problems.push(reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: 'répartition énergétique nulle', target: session.id }));

  const patterns: Record<string, number> = {};
  const muscles: Record<string, number> = {};
  const families: string[] = [];
  const equivalences: string[] = [];
  for (const it of items) {
    const e = catalog.exercise(it.exerciseId);
    if (!e) { problems.push(reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'exercise', id: it.exerciseId })); continue; }
    const vol = inp.volumeByItem[it.id] ?? 0;
    families.push(e.family);
    equivalences.push(e.equivalenceClass);
    patterns[e.patterns.primary] = (patterns[e.patterns.primary] ?? 0) + vol;
    for (const m of e.muscles.primary) muscles[m] = (muscles[m] ?? 0) + vol;
  }
  if (problems.length > 0) return { ok: false, reasons: problems };

  const durationOf = (blockId: string): number => estimate?.byBlock.find((b) => b.blockId === blockId)?.p50 ?? 0;
  const fingerprint: SessionFingerprint = {
    sessionId: session.id,
    discipline: session.discipline,
    archetypeId: inp.archetypeId,
    stimulus: inp.stimulus,
    exercises: sortedUnique(items.map((i) => i.exerciseId)),
    families: sortedUnique(families),
    equivalences: sortedUnique(equivalences),
    patterns: normalize(patterns),
    muscles: normalize(muscles),
    structure: session.blocks.map((b) => ({ kind: b.kind, format: b.format, durationS: durationOf(b.id) })),
    energy: energy ? { low: energy.low / energyTotal, moderate: energy.moderate / energyTotal, high: energy.high / energyTotal } : NOT_APPLICABLE,
    ...(inp.format !== undefined ? { format: inp.format } : {}),
    ...(inp.timeDomain !== undefined ? { timeDomain: inp.timeDomain } : {}),
    ...(inp.repScheme !== undefined ? { repScheme: inp.repScheme } : {}),
    prescriptionMarkers: Object.fromEntries(Object.keys(inp.prescriptionMarkers).sort().map((k) => [k, inp.prescriptionMarkers[k] ?? 0])),
    ...(inp.contextKey !== undefined ? { contextKey: inp.contextKey } : {}),
  };
  return { ok: true, fingerprint };
}
