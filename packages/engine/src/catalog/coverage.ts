import type { Exercise, ReleaseStage } from '@hybridsport/domain';
import { RulesetParameterError } from '../rules/errors.js';
import type { LoadedRuleset } from '../rules/ruleset.js';
import type { LoadedCatalog } from './catalog.js';
import { deriveExerciseStructures, isDerivationTable } from './structures.js';

export type CoverageStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_READY';

export interface CriterionResult {
  readonly id: `CC${number}`;
  readonly title: string;
  readonly status: CoverageStatus;
  readonly details: readonly string[];
}

export interface CoverageReport {
  readonly catalogVersion: string;
  readonly rulesetVersion: string;
  readonly stage: ReleaseStage;
  readonly criteria: readonly CriterionResult[];
  readonly overall: CoverageStatus;
}

/** Lit un paramètre de configuration facultatif : absent ⇒ undefined (le critère sera NOT_READY). */
function optional<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch (e) {
    if (e instanceof RulesetParameterError && e.problem === 'missing') return undefined;
    throw e;
  }
}

const isClassTable = (v: unknown): v is Record<string, string[]> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => Array.isArray(x) && x.every((y) => typeof y === 'string'));

function result(id: CriterionResult['id'], title: string, status: CoverageStatus, details: string[] = []): CriterionResult {
  return { id, title, status, details };
}

function fromGaps(id: CriterionResult['id'], title: string, gaps: string[]): CriterionResult {
  return result(id, title, gaps.length === 0 ? 'PASS' : 'FAIL', gaps);
}

function combine(...statuses: CoverageStatus[]): CoverageStatus {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('NOT_READY')) return 'NOT_READY';
  if (statuses.every((s) => s === 'NOT_APPLICABLE')) return 'NOT_APPLICABLE';
  return 'PASS';
}

const isMobility = (e: Exercise): boolean => e.movementType === 'mobility';

/**
 * Rapport de couverture CC1–CC11 (spec 03 §7). Ne dépend jamais du nombre total d'exercices :
 * chaque critère vérifie qu'un BESOIN est couvert. Contenu absent ⇒ NOT_READY, jamais un faux PASS.
 */
export function evaluateCoverage(catalog: LoadedCatalog, ruleset: LoadedRuleset, stage: ReleaseStage): CoverageReport {
  const active = catalog.activeExercises();
  const presets = catalog.document.presets;
  const archetypes = catalog.document.archetypes;
  const feasibleIn = (presetId: string) => {
    const eq = new Set(catalog.preset(presetId)?.equipment ?? []);
    return (e: Exercise) => catalog.isFeasibleWith(e, eq);
  };
  const criteria: CriterionResult[] = [];

  // CC1 — archétypes
  {
    const title = 'Candidats par emplacement d’archétype et par preset';
    const min = optional(() => ruleset.number('coverage.cc1.minCandidates'));
    if (archetypes.length === 0 || min === undefined) {
      criteria.push(result('CC1', title, 'NOT_READY', [archetypes.length === 0 ? 'aucun archétype V1 défini' : 'coverage.cc1.minCandidates absent']));
    } else {
      const gaps: string[] = [];
      for (const a of archetypes) for (const p of a.feasiblePresets) for (const slot of a.slots) {
        const ok = feasibleIn(p);
        const cands = active.filter((e) => ok(e) && (slot.pattern === undefined || e.patterns.primary === slot.pattern) && (slot.movementTypes === undefined || slot.movementTypes.includes(e.movementType)));
        const families = new Set(cands.map((e) => e.family)).size;
        if (cands.length < min) gaps.push(`${a.id}/${slot.id} @ ${p} : ${cands.length} candidat(s) < ${min}`);
        if (families < (slot.minFamilies ?? 1)) gaps.push(`${a.id}/${slot.id} @ ${p} : ${families} famille(s) < ${slot.minFamilies ?? 1}`);
      }
      criteria.push(fromGaps('CC1', title, gaps));
    }
  }

  // CC2 — pattern × classe de matériel
  {
    const title = 'Chaque pattern principal couvert dans chaque classe de matériel pertinente';
    const table = optional(() => ruleset.table('coverage.cc2.patternClasses', isClassTable, 'Record<pattern, class[]>'));
    if (table === undefined) criteria.push(result('CC2', title, 'NOT_READY', ['coverage.cc2.patternClasses absent']));
    else {
      const gaps: string[] = [];
      for (const [pattern, classes] of Object.entries(table)) for (const c of classes) {
        if (!active.some((e) => e.patterns.primary === pattern && (catalog.equipmentClassesOf(e) as string[]).includes(c))) gaps.push(`${pattern} × ${c}`);
      }
      criteria.push(fromGaps('CC2', title, gaps));
    }
  }

  // CC3 — chaînes de progression / régression
  {
    const title = 'Chaînes de progression complètes et régression accessible aux novices';
    const families = new Map<string, number[]>();
    for (const e of active) {
      if (!e.progressionFamily) continue;
      const ranks = families.get(e.progressionFamily.familyId) ?? [];
      ranks.push(e.progressionFamily.rank);
      families.set(e.progressionFamily.familyId, ranks);
    }
    if (families.size === 0) criteria.push(result('CC3', title, 'NOT_READY', ['aucune famille de progression']));
    else {
      const gaps: string[] = [];
      for (const [fam, ranks] of families) {
        const max = Math.max(...ranks);
        for (let r = 1; r <= max; r++) if (!ranks.includes(r)) gaps.push(`${fam} : rang ${r} manquant`);
      }
      for (const e of active.filter((x) => x.loadable && x.compound && x.skillLevel > 1)) {
        const regression = active.some((o) => o.id !== e.id && o.skillLevel === 1 && (o.family === e.family || o.patterns.primary === e.patterns.primary))
          || e.substitutions.some((s) => catalog.exercise(s.exerciseId)?.skillLevel === 1);
        if (!regression) gaps.push(`${e.id} : aucune régression accessible (niveau technique 1)`);
      }
      criteria.push(fromGaps('CC3', title, gaps));
    }
  }

  // CC4 — substitutions
  {
    const title = 'Substitut de fidélité élevée/moyenne dans une autre classe ; stations couvertes par preset';
    const gaps: string[] = [];
    for (const e of active.filter((x) => !isMobility(x))) {
      const own = new Set(catalog.equipmentClassesOf(e));
      const ok = e.substitutions.some((s) => {
        const t = catalog.exercise(s.exerciseId);
        return (s.fidelity === 'high' || s.fidelity === 'medium') && t !== undefined && catalog.equipmentClassesOf(t).some((c) => !own.has(c));
      });
      if (!ok) gaps.push(`${e.id} : aucun substitut élevé/moyen dans une autre classe de matériel`);
    }
    const stations = active.filter((e) => e.hybridRaceStation !== undefined);
    let stationStatus: CoverageStatus = stations.length === 0 ? 'NOT_APPLICABLE' : 'PASS';
    if (stations.length > 0 && presets.length === 0) stationStatus = 'NOT_READY';
    else for (const st of stations) for (const p of presets) {
      const ok = feasibleIn(p.id);
      if (!ok(st) && !st.substitutions.some((s) => { const t = catalog.exercise(s.exerciseId); return t !== undefined && ok(t); })) {
        gaps.push(`station ${st.id} : ni faisable ni substituable @ ${p.id}`);
      }
    }
    const status = combine(gaps.length > 0 ? 'FAIL' : 'PASS', stationStatus === 'NOT_APPLICABLE' ? 'PASS' : stationStatus);
    criteria.push(result('CC4', title, active.length === 0 ? 'NOT_READY' : status, gaps));
  }

  // CC5 — unilatéral
  {
    const title = 'Options unilatérales pour squat, hinge et fente dans chaque preset';
    const patterns = optional(() => ruleset.stringList('coverage.cc5.unilateralPatterns'));
    if (patterns === undefined || presets.length === 0) criteria.push(result('CC5', title, 'NOT_READY', [patterns === undefined ? 'coverage.cc5.unilateralPatterns absent' : 'aucun preset']));
    else {
      const gaps: string[] = [];
      for (const p of presets) for (const pat of patterns) {
        const ok = feasibleIn(p.id);
        if (!active.some((e) => e.patterns.primary === pat && e.laterality !== 'bilateral' && ok(e))) gaps.push(`${pat} unilatéral @ ${p.id}`);
      }
      criteria.push(fromGaps('CC5', title, gaps));
    }
  }

  // CC6 — machines et poulies
  {
    const title = 'Salle : option machine ET poulie pour chaque groupe musculaire principal';
    const presetId = optional(() => ruleset.string('coverage.cc6.presetId'));
    const muscles = optional(() => ruleset.stringList('coverage.cc6.mainMuscles'));
    if (presetId === undefined || muscles === undefined) criteria.push(result('CC6', title, 'NOT_READY', ['configuration CC6 absente']));
    else if (!catalog.preset(presetId)) criteria.push(result('CC6', title, 'FAIL', [`preset ${presetId} introuvable`]));
    else {
      const ok = feasibleIn(presetId);
      const gaps: string[] = [];
      for (const m of muscles) for (const cls of ['machine', 'cable'] as const) {
        if (!active.some((e) => ok(e) && e.muscles.primary.includes(m) && catalog.equipmentClassesOf(e).includes(cls))) gaps.push(`${m} : aucune option ${cls}`);
      }
      criteria.push(fromGaps('CC6', title, gaps));
    }
  }

  // CC7 — restrictions
  {
    const title = 'Chaque archétype faisable sous chaque restriction, ou déclaré infaisable';
    const tags = catalog.document.taxonomy.restrictionTags;
    if (archetypes.length === 0) criteria.push(result('CC7', title, 'NOT_READY', ['aucun archétype V1 défini']));
    else if (tags.length === 0) criteria.push(result('CC7', title, 'NOT_APPLICABLE'));
    else {
      const gaps: string[] = [];
      for (const a of archetypes) for (const tag of tags) {
        if (a.declaredInfeasibleRestrictions.includes(tag)) continue;
        for (const p of a.feasiblePresets) for (const slot of a.slots) {
          const ok = feasibleIn(p);
          if (!active.some((e) => ok(e) && !e.contraindicationTags.includes(tag) && (slot.pattern === undefined || e.patterns.primary === slot.pattern))) {
            gaps.push(`${a.id}/${slot.id} @ ${p} sous ${tag} : aucune alternative`);
          }
        }
      }
      criteria.push(fromGaps('CC7', title, gaps));
    }
  }

  // CC8 — échauffement / mobilité
  {
    const title = 'Échauffement / mobilité pour chaque pattern utilisé par les archétypes';
    if (archetypes.length === 0) criteria.push(result('CC8', title, 'NOT_READY', ['aucun archétype V1 défini']));
    else {
      const used = new Set(archetypes.flatMap((a) => a.slots.map((s) => s.pattern)).filter((p): p is string => p !== undefined));
      const gaps = [...used].sort().filter((p) => !active.some((e) => isMobility(e) && e.patterns.secondary.includes(p))).map((p) => `${p} : aucun échauffement spécifique`);
      criteria.push(fromGaps('CC8', title, gaps));
    }
  }

  const table = optional(() => ruleset.table('demand.derivationTable', isDerivationTable, 'DerivationTable'));

  // CC9 — course
  {
    const title = 'Course : segments et éducatifs avec métadonnées complètes';
    const running = active.filter((e) => catalog.isLocomotor(e) && e.disciplines.includes('running'));
    if (running.length === 0) criteria.push(result('CC9', title, 'NOT_READY', ['aucun exercice de course']));
    else {
      const gaps: string[] = [];
      for (const e of running) {
        if (e.painSensitiveAreas.length === 0) gaps.push(`${e.id} : zones sensibles absentes`);
        if (e.workRate?.unit !== 'm_per_min') gaps.push(`${e.id} : débit m/min absent`);
        if (!table || Object.keys(deriveExerciseStructures(e, table)).length === 0) gaps.push(`${e.id} : aucune structure dérivée`);
      }
      criteria.push(fromGaps('CC9', title, gaps));
    }
  }

  // CC10 — qualité des métadonnées
  {
    const title = 'Qualité des métadonnées (et statut de relecture selon l’environnement)';
    if (active.length === 0) criteria.push(result('CC10', title, 'NOT_READY', ['catalogue vide']));
    else {
      const gaps: string[] = [];
      for (const e of active) {
        if (!isMobility(e) && e.painSensitiveAreas.length === 0) gaps.push(`${e.id} : zones fonctionnelles sensibles absentes`);
        const conditioning = (e.relevance.crosstraining ?? 0) > 0 || (e.relevance.hybrid_race ?? 0) > 0 || e.movementType === 'monostructural';
        if (conditioning && !e.workRate) gaps.push(`${e.id} : workRate absent (utilisable en conditioning)`);
        if (e.defaultPrescriptionType === 'sets' && !e.timing.secondsPerRep) gaps.push(`${e.id} : secondsPerRep absent`);
        if (!isMobility(e) && (!table || Object.keys(deriveExerciseStructures(e, table)).length === 0)) gaps.push(`${e.id} : aucune structure dérivée`);
        if (stage === 'beta_closed' && e.meta.reviewStatus === 'draft') gaps.push(`${e.id} : non relu (bêta)`);
        if (stage === 'production' && e.meta.reviewStatus !== 'approved') gaps.push(`${e.id} : non approuvé G5 (production)`);
      }
      criteria.push(fromGaps('CC10', title, gaps));
    }
  }

  // CC11 — presets
  {
    const title = 'Presets V1 présents, modifiables ; salle avec machines et poulies';
    const required = optional(() => ruleset.stringList('coverage.cc11.requiredPresets'));
    if (required === undefined) criteria.push(result('CC11', title, 'NOT_READY', ['coverage.cc11.requiredPresets absent']));
    else {
      const gaps: string[] = [];
      for (const id of required) {
        const p = catalog.preset(id);
        if (!p) gaps.push(`${id} : absent`);
        else if (!p.editable) gaps.push(`${id} : non modifiable`);
      }
      const gymId = optional(() => ruleset.string('coverage.cc6.presetId'));
      const gym = gymId === undefined ? undefined : catalog.preset(gymId);
      if (gym) {
        const classes = new Set(gym.equipment.map((id) => catalog.document.taxonomy.equipment.find((x) => x.id === id)?.class));
        if (!classes.has('machine')) gaps.push(`${gym.id} : aucune machine listée`);
        if (!classes.has('cable')) gaps.push(`${gym.id} : aucune poulie listée`);
      }
      criteria.push(fromGaps('CC11', title, gaps));
    }
  }

  return { catalogVersion: catalog.version, rulesetVersion: ruleset.version, stage, criteria, overall: combine(...criteria.map((c) => c.status)) };
}

export const COVERAGE_CRITERIA = ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CC7', 'CC8', 'CC9', 'CC10', 'CC11'] as const;

/** « Le catalogue est suffisamment complet pour la V1 » ⇔ CC1–CC11 tous PASS. */
export function isCatalogCompleteForV1(report: CoverageReport): boolean {
  return COVERAGE_CRITERIA.every((id) => report.criteria.some((c) => c.id === id && c.status === 'PASS'));
}
