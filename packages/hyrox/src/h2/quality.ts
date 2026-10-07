/**
 * Q1 — DIAGNOSTIC DE QUALITÉ d'une séance HYROX H2 DÉJÀ COMPOSÉE (lecture seule : aucune station choisie, aucune dose,
 * charge, distance, tour ou time cap modifié). Les critères HYROX restent ici ; le contrat et le verdict sont ceux du
 * CORE (`@hybridsport/engine`, quality).
 *
 * Ce qui est DÉMONTRABLE aujourd'hui : la cohérence DÉFINITIONNELLE rôle ↔ structure ↔ stations (taxonomie H2), les
 * totaux calculés (distance, passages, charges), la présence d'une charge sur une station chargée. Ce qui ne l'est
 * PAS : la justesse des doses, du nombre de stations, des tours, de la durée, de la technicité — toutes issues de
 * paramètres `hybrid_race.h2.*` non approuvés ⇒ UNRESOLVED (base TEST_ONLY / SIMULATION_ONLY / PROVISIONAL).
 * La rotation « équilibrée » du programme n'est PAS une entrée : elle ne prouve aucune qualité.
 */
import type { LoadedCatalog, LoadedRuleset, QualityAssessment, QualityBasis, QualityCriterion, QualityEnvironment, RecordedEstimate } from '@hybridsport/engine';
import { assessment, basisOfParameter, genericCriteria, governedCriterion } from '@hybridsport/engine';
import type { SessionDraft } from '@hybridsport/domain';
import { h2PresentationOf } from './presentation.js';
import { HR_ROLE_SPECS, structureFitsRole } from './taxonomy.js';

/** Seul modèle de charge sans charge externe obligatoire (vocabulaire du catalogue). */
const BODYWEIGHT_MODEL = 'bodyweight_plus';

export interface H2QualityInput {
  readonly catalog: LoadedCatalog;
  readonly ruleset: LoadedRuleset;
  readonly env?: QualityEnvironment;
  readonly estimate?: RecordedEstimate;
  /** Décisions persistées de la composition (lecture des estimations H2 tracées). */
  readonly reasons?: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[];
}

export function assessH2Quality(session: SessionDraft, archetypeId: string, x: H2QualityInput): QualityAssessment {
  const generic = genericCriteria(session, x.estimate);
  const p = h2PresentationOf(session, archetypeId);
  if (!p) return assessment([...generic, { id: 'role_specificity', status: 'BLOCKED', basis: 'DERIVED', facts: { archetypeId }, reasons: ['presentation_unreadable'] }]);
  const basis = (id: string): QualityBasis => basisOfParameter(x.ruleset.parameter(id), x.env);
  const stations = p.components.filter((c) => c.kind === 'station');
  const runs = p.components.filter((c) => c.kind === 'run');
  const ex = (id: string) => x.catalog.exercise(id);
  const loaded = (id: string) => { const e = ex(id); return e !== undefined && e.loadable && e.loadModel !== BODYWEIGHT_MODEL; };
  const criteria: QualityCriterion[] = [...generic];

  // Rôle ↔ structure ↔ stations : DÉFINITIONNEL (taxonomie H2), seule spécificité démontrable.
  const spec = HR_ROLE_SPECS[p.role];
  const fit = structureFitsRole(p.role, p.structure);
  const loadedOk = spec.stations !== 'loaded' || stations.every((s) => loaded(s.exerciseId));
  criteria.push({
    id: 'role_specificity', status: fit && loadedOk ? 'PASS' : 'BLOCKED', basis: 'DERIVED',
    facts: { role: p.role, specificity: p.specificity, structure: p.structure, stationsRequired: spec.stations, allStationsLoaded: stations.every((s) => loaded(s.exerciseId)) },
    reasons: [fit ? 'structure_fits_role_definition' : 'structure_incompatible_with_role', loadedOk ? 'station_load_requirement_met' : 'role_requires_loaded_stations', 'role_definition_is_vocabulary_not_dose_evidence'],
  });

  // Équilibre des stations : faits calculés ; aucune règle gouvernée sur le nombre / la diversité de stations.
  const stationOf = (id: string): string => ex(id)?.hybridRaceStation ?? id;
  const distinct = [...new Set(stations.map((s) => stationOf(s.exerciseId)))];
  const patterns = stations.map((s) => ex(s.exerciseId)?.patterns.primary ?? 'unknown');
  const families = stations.map((s) => ex(s.exerciseId)?.family ?? 'unknown');
  criteria.push({
    id: 'station_balance', status: 'UNRESOLVED', basis: 'UNRESOLVED',
    facts: { distinctStations: distinct.length, stations: distinct, rounds: p.rounds, stationPasses: stations.length * p.rounds, primaryPatterns: [...new Set(patterns)].sort(), distinctPrimaryPatterns: new Set(patterns).size, repeatedFamilies: [...new Set(families.filter((f, i) => families.indexOf(f) !== i))] },
    reasons: ['no_governed_station_count_rule', 'no_governed_pattern_balance_rule'],
  });

  // Doses : totaux calculés (quantité × tours) ; valeurs issues de paramètres non approuvés.
  const totals = stations.map((s) => `${stationOf(s.exerciseId)}:${String(s.dose.value * p.rounds)}${s.dose.kind}${s.loadKg === undefined ? '' : `@${String(s.loadKg)}kg`}`);
  const runTotal = runs.reduce((t, r) => t + r.dose.value, 0) * p.rounds;
  criteria.push(governedCriterion('dose_coherence', [basis('hybrid_race.h2.stationDoses'), basis('hybrid_race.h2.structureVolume'), ...(runs.length > 0 ? [basis('hybrid_race.h2.runSegment')] : [])], {
    perStationTotal: totals, rounds: p.rounds, runDistanceTotalM: runTotal,
  }, ['dose_source:hybrid_race.h2.stationDoses', 'rounds_source:hybrid_race.h2.structureVolume']));

  // Charges : une station chargée sans charge est une donnée INVALIDE ; la justesse de la charge n'est pas démontrée.
  const missingLoad = stations.filter((s) => loaded(s.exerciseId) && s.loadKg === undefined).map((s) => s.exerciseId);
  criteria.push(missingLoad.length > 0
    ? { id: 'load_policy', status: 'BLOCKED', basis: 'DERIVED', facts: { missingLoad }, reasons: ['loaded_station_without_load'] }
    : governedCriterion('load_policy', [basis('hybrid_race.h2.stationDoses')], { loads: stations.filter((s) => s.loadKg !== undefined).map((s) => `${s.exerciseId}@${String(s.loadKg)}kg`) }, ['load_source:hybrid_race.h2.stationDoses']));

  // Time cap : relation DÉRIVÉE (plafond ≥ estimation lente tracée), estimation issue de débits non approuvés.
  // L'estimation de la séance RETENUE (la trace contient aussi celles des options de volume écartées).
  const d = x.reasons?.find((r) => r.code.endsWith('.H2_DURATION') && r.params.timeCapS === p.timeCapS)?.params;
  const slow = typeof d?.estimatedSlowS === 'number' ? d.estimatedSlowS : undefined;
  criteria.push(slow !== undefined && p.timeCapS < slow
    ? { id: 'time_cap_coherence', status: 'BLOCKED', basis: 'DERIVED', facts: { timeCapS: p.timeCapS, estimatedSlowS: slow }, reasons: ['time_cap_below_slow_estimate'] }
    : governedCriterion('time_cap_coherence', [basis('hybrid_race.h2.workRates'), basis('hybrid_race.h2.timeCapMargin'), basis('hybrid_race.h2.timeDomains')], {
      timeCapS: p.timeCapS, estimatedTypicalS: typeof d?.estimatedTypicalS === 'number' ? d.estimatedTypicalS : 'unknown', estimatedSlowS: slow ?? 'unknown', transitions: p.transitions.count, transitionDuration: 'unknown',
    }, ['estimate_source:hybrid_race.h2.workRates', 'transitions_excluded_from_estimate']));

  // Technicité sous fatigue : faits (coût technique catalogue) ; plafond gouverné non approuvé.
  const tech = stations.map((s) => ex(s.exerciseId)?.cost.technical ?? 0);
  criteria.push(governedCriterion('technicality_under_fatigue', [basis('hybrid_race.h2.technicalUnderFatigue')], { maxTechnicalCost: Math.max(0, ...tech), stationsAfterFirstPosition: Math.max(0, stations.length * p.rounds - 1) }));

  // Accumulation locale : faits (familles / patterns répétés) ; aucune limite de volume local gouvernée.
  criteria.push({
    id: 'local_accumulation', status: 'UNRESOLVED', basis: 'UNRESOLVED',
    facts: { accumulationIntendedByRole: spec.accumulationIntended, passesPerPattern: [...new Set(patterns)].sort().map((pt) => `${pt}:${String(patterns.filter((x2) => x2 === pt).length * p.rounds)}`) },
    reasons: ['no_governed_local_volume_limit'],
  });

  // Course (rôles RACE_SPECIFIC) : distance seulement, allure déléguée au moteur Running (non orchestrée).
  if (runs.length > 0) criteria.push({ id: 'run_component', status: 'UNRESOLVED', basis: 'UNRESOLVED', facts: { runSegmentsPerRound: runs.length, runDistanceTotalM: runTotal, pace: 'BLOCKED:RUNNING_ENGINE_DELEGATION' }, reasons: ['pace_not_prescribed', 'run_station_ratio_ungoverned'] });
  return assessment(criteria);
}
