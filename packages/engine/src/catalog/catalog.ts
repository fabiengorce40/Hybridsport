import { zCatalogDocument } from '@hybridsport/domain';
import type { CatalogDocument, EquipmentClass, Exercise, Preset, ReasonCode, SemVerString } from '@hybridsport/domain';
import type { VersionedArtifact } from '../core/context.js';
import { createCoreRegistry } from '../trace/index.js';

const reasons = createCoreRegistry();
const issue = (path: string, problem: string): ReasonCode => reasons.emit('TECHNICAL.CATALOG_INVALID', { path, problem });

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) (seen.has(id) ? dup : seen).add(id);
  return [...dup].sort();
}

function integrityIssues(doc: CatalogDocument): ReasonCode[] {
  const out: ReasonCode[] = [];
  const t = doc.taxonomy;
  const sets = {
    pattern: new Set(t.patterns.map((p) => p.id)),
    muscle: new Set(t.muscles.map((m) => m.id)),
    area: new Set(t.bodyAreas.map((a) => a.id)),
    structure: new Set(t.structures.map((s) => s.id)),
    equipment: new Set(t.equipment.map((e) => e.id)),
    restriction: new Set(t.restrictionTags),
    movement: new Set(t.movementTags),
  };
  const lists: [string, readonly string[]][] = [
    ['patterns', t.patterns.map((p) => p.id)], ['muscles', t.muscles.map((m) => m.id)], ['bodyAreas', t.bodyAreas.map((a) => a.id)],
    ['structures', t.structures.map((s) => s.id)], ['structureGroups', t.structureGroups.map((g) => g.id)], ['equipment', t.equipment.map((e) => e.id)],
    ['exercises', doc.exercises.map((e) => e.id)], ['presets', doc.presets.map((p) => p.id)], ['archetypes', doc.archetypes.map((a) => a.id)],
  ];
  for (const [name, ids] of lists) for (const d of duplicates(ids)) out.push(issue(name, `identifiant dupliqué : ${d}`));
  for (const g of t.structureGroups) for (const m of g.members) if (!sets.structure.has(m)) out.push(issue(`structureGroups(${g.id})`, `structure inconnue : ${m}`));

  const exercises = new Map(doc.exercises.map((e) => [e.id, e]));
  for (const e of doc.exercises) {
    const p = `exercises(${e.id})`;
    for (const pat of [e.patterns.primary, ...e.patterns.secondary]) if (!sets.pattern.has(pat)) out.push(issue(p, `pattern inconnu : ${pat}`));
    if (e.patterns.secondary.includes(e.patterns.primary)) out.push(issue(p, 'pattern primaire répété en secondaire'));
    for (const m of [...e.muscles.primary, ...e.muscles.secondary]) if (!sets.muscle.has(m)) out.push(issue(p, `muscle inconnu : ${m}`));
    if (e.muscles.secondary.some((m) => e.muscles.primary.includes(m))) out.push(issue(p, 'muscle à la fois primaire et secondaire'));
    for (const a of e.painSensitiveAreas) if (!sets.area.has(a)) out.push(issue(p, `zone fonctionnelle inconnue : ${a}`));
    for (const r of e.contraindicationTags) if (!sets.restriction.has(r)) out.push(issue(p, `restriction inconnue : ${r}`));
    for (const mv of e.movementTags) if (!sets.movement.has(mv)) out.push(issue(p, `tag de mouvement inconnu : ${mv}`));
    for (const eq of [...e.equipment.allOf, ...e.equipment.anyOf]) if (!sets.equipment.has(eq)) out.push(issue(p, `matériel inconnu : ${eq}`));
    if (e.loadable && e.loadModel === undefined) out.push(issue(p, 'exercice chargeable sans loadModel'));
    if (e.status === 'deprecated' && e.replacedBy === undefined) out.push(issue(p, 'exercice déprécié sans remplaçant'));
    if (e.replacedBy !== undefined && !exercises.has(e.replacedBy)) out.push(issue(p, `remplaçant inconnu : ${e.replacedBy}`));
    if (e.timing.secondsPerRep && !(e.timing.secondsPerRep.min <= e.timing.secondsPerRep.typical && e.timing.secondsPerRep.typical <= e.timing.secondsPerRep.max)) {
      out.push(issue(p, 'secondsPerRep : min ≤ typical ≤ max attendu'));
    }
    if (e.workRate) for (const [lvl, r] of Object.entries(e.workRate.byLevel)) if (r.p90Slow > r.p50) out.push(issue(p, `workRate ${lvl} : p90Slow doit être ≤ p50 (débit plus lent)`));
    for (const s of e.substitutions) {
      const target = exercises.get(s.exerciseId);
      if (s.exerciseId === e.id) out.push(issue(p, 'substitution vers lui-même'));
      else if (!target) out.push(issue(p, `substitut inconnu : ${s.exerciseId}`));
      else {
        if (target.status !== 'active') out.push(issue(p, `substitut déprécié : ${s.exerciseId}`));
        if (s.fidelity === 'high' && target.equivalenceClass !== e.equivalenceClass) out.push(issue(p, `fidélité élevée hors classe d'équivalence : ${s.exerciseId}`));
      }
    }
  }
  for (const pr of doc.presets) for (const eq of pr.equipment) if (!sets.equipment.has(eq)) out.push(issue(`presets(${pr.id})`, `matériel inconnu : ${eq}`));
  const presetIds = new Set(doc.presets.map((p) => p.id));
  for (const a of doc.archetypes) {
    for (const pr of [...a.feasiblePresets, ...a.declaredInfeasiblePresets]) if (!presetIds.has(pr)) out.push(issue(`archetypes(${a.id})`, `preset inconnu : ${pr}`));
    for (const s of a.slots) if (s.pattern !== undefined && !sets.pattern.has(s.pattern)) out.push(issue(`archetypes(${a.id})`, `pattern inconnu : ${s.pattern}`));
  }
  return out;
}

/** Catalogue chargé : source de vérité des exercices (identifiants et métadonnées, jamais des noms). */
export class LoadedCatalog implements VersionedArtifact {
  readonly version: SemVerString;
  private readonly byId: ReadonlyMap<string, Exercise>;
  private readonly equipmentClass: ReadonlyMap<string, EquipmentClass>;
  private readonly locomotorPatterns: ReadonlySet<string>;

  constructor(readonly document: CatalogDocument) {
    this.version = document.catalogVersion as SemVerString;
    this.byId = new Map(document.exercises.map((e) => [e.id, e]));
    this.equipmentClass = new Map(document.taxonomy.equipment.map((e) => [e.id, e.class]));
    this.locomotorPatterns = new Set(document.taxonomy.patterns.filter((p) => p.isLocomotor).map((p) => p.id));
  }

  exercise(id: string): Exercise | undefined { return this.byId.get(id); }
  exercises(): readonly Exercise[] { return this.document.exercises; }
  activeExercises(): Exercise[] { return this.document.exercises.filter((e) => e.status === 'active'); }
  preset(id: string): Preset | undefined { return this.document.presets.find((p) => p.id === id); }
  structureIds(): string[] { return this.document.taxonomy.structures.map((s) => s.id); }

  /** Membres d'un groupe de structures (alias), ou la structure elle-même. */
  structureMembers(idOrGroup: string): string[] {
    return this.document.taxonomy.structureGroups.find((g) => g.id === idOrGroup)?.members ?? [idOrGroup];
  }

  /** Classes de matériel d'un exercice ; « bodyweight » s'il n'exige aucun matériel. */
  equipmentClassesOf(e: Exercise): EquipmentClass[] {
    const classes = new Set<EquipmentClass>();
    for (const id of [...e.equipment.allOf, ...e.equipment.anyOf]) {
      const c = this.equipmentClass.get(id);
      if (c && c !== 'support') classes.add(c);
    }
    if (classes.size === 0) classes.add('bodyweight');
    return [...classes].sort();
  }

  /** Matériel manquant pour réaliser l'exercice avec l'équipement disponible (vide si faisable). */
  missingEquipment(e: Exercise, available: ReadonlySet<string>): string[] {
    const missing = e.equipment.allOf.filter((id) => !available.has(id));
    if (e.equipment.anyOf.length > 0 && !e.equipment.anyOf.some((id) => available.has(id))) missing.push(`anyOf(${e.equipment.anyOf.join('|')})`);
    return missing;
  }

  isFeasibleWith(e: Exercise, available: ReadonlySet<string>): boolean {
    return this.missingEquipment(e, available).length === 0;
  }

  /** Attribut `isLocomotor` porté par le pattern primaire (spec 03 §4). */
  isLocomotor(e: Exercise): boolean {
    return this.locomotorPatterns.has(e.patterns.primary);
  }
}

export type CatalogLoadResult = { ok: true; catalog: LoadedCatalog } | { ok: false; issues: ReasonCode[] };

/** Charge et valide un catalogue (schéma + intégrité référentielle). Ne lève jamais. */
export function loadCatalog(input: unknown): CatalogLoadResult {
  const parsed = zCatalogDocument.safeParse(input);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => issue(i.path.join('.') || '$', i.message)) };
  const issues = integrityIssues(parsed.data);
  return issues.length > 0 ? { ok: false, issues } : { ok: true, catalog: new LoadedCatalog(parsed.data) };
}
