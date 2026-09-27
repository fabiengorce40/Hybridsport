import type { ArchetypeCoverageSpec, Exercise, ReasonCode, SessionArchetype } from '@hybridsport/domain';
import { createCoreRegistry } from '../trace/index.js';
import type { LoadedCatalog } from './catalog.js';
import { blockLeverIssues } from '../duration/levers.js';

const reasons = createCoreRegistry();

type SlotLike = Pick<ArchetypeCoverageSpec['slots'][number], 'pattern' | 'movementTypes' | 'region' | 'compound'>;

/** Un exercice satisfait un emplacement ⇔ il satisfait CHAQUE critère présent (partagé par CC1, CC7 et les moteurs). */
export function slotAccepts(e: Exercise, slot: SlotLike, catalog: LoadedCatalog): boolean {
  if (slot.pattern !== undefined && e.patterns.primary !== slot.pattern) return false;
  if (slot.movementTypes !== undefined && !slot.movementTypes.includes(e.movementType)) return false;
  if (slot.compound !== undefined && e.compound !== slot.compound) return false;
  if (slot.region !== undefined && catalog.document.taxonomy.patterns.find((p) => p.id === e.patterns.primary)?.region !== slot.region) return false;
  return true;
}

/** Projection vers la spécification de couverture (CC1, CC7, CC8) : même exigence, aucune perte. */
export function toCoverageSpec(a: SessionArchetype): ArchetypeCoverageSpec {
  return {
    id: a.id, discipline: a.discipline,
    slots: a.blocks.flatMap((b) => b.slots.map((s) => ({
      id: s.id,
      ...(s.requirement.pattern !== undefined ? { pattern: s.requirement.pattern } : {}),
      ...(s.requirement.movementTypes !== undefined ? { movementTypes: [...s.requirement.movementTypes] } : {}),
      ...(s.requirement.region !== undefined ? { region: s.requirement.region } : {}),
      ...(s.requirement.compound !== undefined ? { compound: s.requirement.compound } : {}),
      ...(s.minFamilies !== undefined ? { minFamilies: s.minFamilies } : {}),
    }))),
    feasiblePresets: [...a.feasiblePresets],
    declaredInfeasiblePresets: [...a.declaredInfeasiblePresets],
    declaredInfeasibleRestrictions: [...a.declaredInfeasibleRestrictions],
  };
}

/**
 * Candidats actifs de chaque emplacement pour un preset (et sous des restrictions éventuelles), triés
 * par identifiant. Brique commune de la faisabilité par preset, de CC1 et de l'étape 3 des moteurs.
 */
export function slotCandidates(a: SessionArchetype, catalog: LoadedCatalog, presetId: string, restrictionTags: readonly string[] = []): Record<string, string[]> {
  const eq = new Set(catalog.preset(presetId)?.equipment ?? []);
  const active = catalog.document.exercises.filter((e) => e.status === 'active' && catalog.isFeasibleWith(e, eq) && !e.contraindicationTags.some((t) => restrictionTags.includes(t)));
  return Object.fromEntries(a.blocks.flatMap((b) => b.slots).map((s) => [s.id, active.filter((e) => slotAccepts(e, s.requirement, catalog)).map((e) => e.id).sort()]));
}

/**
 * Invariants d'un archétype relatifs au catalogue (le schéma porte les invariants structurels) :
 * références connues (patterns, presets, restrictions), faisabilité DÉCLARÉE pour chaque preset,
 * leviers conformes aux règles de compression, emplacement satisfiable dans au moins un preset faisable.
 */
export function archetypeIssues(a: SessionArchetype, catalog: LoadedCatalog): ReasonCode[] {
  const out: ReasonCode[] = [];
  const t = catalog.document.taxonomy;
  const problem = (p: string) => out.push(reasons.emit('TECHNICAL.STRUCTURE_INVALID', { problem: p, target: a.id }));
  for (const b of a.blocks) {
    for (const issue of blockLeverIssues({ id: b.id, kind: b.kind, role: b.role, optional: b.optional, levers: b.levers })) problem(issue);
    for (const s of b.slots) if (s.requirement.pattern !== undefined && !t.patterns.some((p) => p.id === s.requirement.pattern)) out.push(reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'pattern', id: s.requirement.pattern }));
  }
  const presetIds = catalog.document.presets.map((p) => p.id);
  for (const p of [...a.feasiblePresets, ...a.declaredInfeasiblePresets]) if (!presetIds.includes(p)) out.push(reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'preset', id: p }));
  for (const p of presetIds) if (!a.feasiblePresets.includes(p) && !a.declaredInfeasiblePresets.includes(p)) problem(`faisabilité non déclarée pour le preset ${p}`);
  for (const r of a.declaredInfeasibleRestrictions) if (!t.restrictionTags.includes(r)) out.push(reasons.emit('TECHNICAL.UNKNOWN_REFERENCE', { kind: 'restriction', id: r }));
  for (const p of a.feasiblePresets.filter((x) => presetIds.includes(x))) {
    const cands = slotCandidates(a, catalog, p);
    for (const [slot, ids] of Object.entries(cands)) if (ids.length === 0) problem(`emplacement ${slot} sans aucun candidat pour le preset déclaré faisable ${p}`);
  }
  return out;
}
