/**
 * H2 — taxonomie de composition HYROX (VOCABULAIRE, aucune valeur). L'épreuve n'est pas l'entraînement : une
 * simulation est UN rôle parmi d'autres, jamais la structure par défaut.
 *
 * Rôles RETENUS (provisoires : décision `hybrid_race.h2.roles` non prise) et SPÉCIFICITÉ qualitative :
 * - SPECIFIC : travail des stations HYROX sans reproduire la structure de course ;
 * - RACE_SPECIFIC : reproduit une caractéristique de l'épreuve (course APRÈS station, enchaînement de l'épreuve).
 * GENERAL (aérobie, force maximale, course) n'est PAS composé par HYROX : il appartient à Running / Strength /
 * Cross-training (délégation non orchestrée ⇒ BLOCKED).
 */

export const HR_SPECIFICITY = ['GENERAL', 'SPECIFIC', 'RACE_SPECIFIC'] as const;
export type HrSpecificity = (typeof HR_SPECIFICITY)[number];

export const HR_H2_ROLES = ['station_capacity', 'strength_endurance', 'mixed_station_conditioning', 'compromised_running', 'partial_simulation'] as const;
export type HrRole = (typeof HR_H2_ROLES)[number];

/** Préfixe des archétypes H2 : le programme demande « une séance HYROX de rôle X », jamais une station. */
export const HR_H2_ARCHETYPE_PREFIX = 'hybrid_race.h2.';
export const h2ArchetypeOf = (r: HrRole): string => `${HR_H2_ARCHETYPE_PREFIX}${r}`;
export const roleFromArchetype = (id: string): HrRole | undefined => HR_H2_ROLES.find((r) => h2ArchetypeOf(r) === id);

export interface HrRoleSpec {
  readonly specificity: HrSpecificity;
  /** Filtre de stations propre au rôle (définitionnel). */
  readonly stations: 'any' | 'loaded';
  /** L'accumulation de fatigue est-elle VOULUE par l'intention (race-specific) ? */
  readonly accumulationIntended: boolean;
  readonly definition: string;
}

export const HR_ROLE_SPECS: Readonly<Record<HrRole, HrRoleSpec>> = {
  station_capacity: { specificity: 'SPECIFIC', stations: 'any', accumulationIntended: false, definition: 'une station répétée : capacité à tenir la dose de station' },
  strength_endurance: { specificity: 'SPECIFIC', stations: 'loaded', accumulationIntended: false, definition: 'stations CHARGÉES enchaînées : endurance de force spécifique (pas de force maximale : Strength)' },
  mixed_station_conditioning: { specificity: 'SPECIFIC', stations: 'any', accumulationIntended: false, definition: 'plusieurs stations différentes enchaînées, sans course' },
  compromised_running: { specificity: 'RACE_SPECIFIC', stations: 'any', accumulationIntended: true, definition: 'course APRÈS station, répétée : courir sous fatigue de station' },
  partial_simulation: { specificity: 'RACE_SPECIFIC', stations: 'any', accumulationIntended: true, definition: 'segment CONTIGU de l’enchaînement d’épreuve (ordre gouverné), course + station' },
};

export type TaxonomyVerdict = 'RETAINED_PROVISIONAL' | 'MERGED' | 'DELEGATED' | 'BLOCKED';
/** Revue des catégories demandées (H2 §5) : donnée de documentation et de tests, jamais lue par l'algorithme. */
export const HR_TAXONOMY_REVIEW: readonly { readonly category: string; readonly verdict: TaxonomyVerdict; readonly role?: HrRole; readonly owner: string; readonly note: string }[] = [
  { category: 'station technique', verdict: 'BLOCKED', owner: 'HYROX', note: 'apprentissage technique : aucune règle d’acquisition ni critère de qualité gouvernés' },
  { category: 'station capacity', verdict: 'RETAINED_PROVISIONAL', role: 'station_capacity', owner: 'HYROX', note: 'dose de station répétée' },
  { category: 'strength endurance spécifique', verdict: 'RETAINED_PROVISIONAL', role: 'strength_endurance', owner: 'HYROX', note: 'stations chargées sous fatigue ; la force maximale reste à Strength' },
  { category: 'aerobic / engine spécifique', verdict: 'DELEGATED', owner: 'Running / Cross-training', note: 'aérobie générale : moteurs Running (allures) ou Cross-training (ergomètres) ; aucune orchestration inter-moteurs ⇒ BLOCKED' },
  { category: 'compromised running', verdict: 'RETAINED_PROVISIONAL', role: 'compromised_running', owner: 'HYROX (contexte) + Running (allure, BLOCKED)', note: 'course après station ; distance de locomotion sans allure' },
  { category: 'mixed station conditioning', verdict: 'RETAINED_PROVISIONAL', role: 'mixed_station_conditioning', owner: 'HYROX', note: 'plusieurs stations, pas de course' },
  { category: 'race-specific intervals', verdict: 'MERGED', role: 'compromised_running', owner: 'HYROX', note: 'même définition opérationnelle que compromised running (course + station répétées)' },
  { category: 'partial simulation', verdict: 'RETAINED_PROVISIONAL', role: 'partial_simulation', owner: 'HYROX', note: 'exige l’ordre d’épreuve GOUVERNÉ (`hybrid_race.h2.raceSequence`)' },
  { category: 'full simulation', verdict: 'BLOCKED', owner: 'HYROX', note: 'exige ordre, distances, standards par division, transitions et allures gouvernés : aucun disponible' },
];

/** Structures de séance (représentation CORE : bloc `hybrid_station_work`, format `for_time`). */
export const HR_STRUCTURES = ['station_repeats', 'station_circuit', 'run_station_alternation', 'partial_sequence'] as const;
export type HrStructure = (typeof HR_STRUCTURES)[number];

export interface HrStructureSpec {
  /** `repeat` : liste d'items répétée `rounds` fois ; `expanded` : séquence explicite parcourue une fois (rounds = 1). */
  readonly layout: 'repeat' | 'expanded';
  readonly running: boolean;
  /** Nombre de stations : une seule, ou `stations` du volume gouverné. */
  readonly stations: 'one' | 'many';
}

export const HR_STRUCTURE_SPECS: Readonly<Record<HrStructure, HrStructureSpec>> = {
  station_repeats: { layout: 'repeat', running: false, stations: 'one' },
  station_circuit: { layout: 'repeat', running: false, stations: 'many' },
  /** Un tour = [station, course] par station : chaque segment couru vient APRÈS une station (course compromise). */
  run_station_alternation: { layout: 'repeat', running: true, stations: 'many' },
  /** Segment CONTIGU de l'ordre d'épreuve gouverné : [course fraîche, station, course après station, station…], une fois. */
  partial_sequence: { layout: 'expanded', running: true, stations: 'many' },
};

/**
 * Cohérence DÉFINITIONNELLE rôle ↔ structure (indépendante de toute valeur) : une table gouvernée incohérente est
 * refusée, jamais réinterprétée.
 */
export function structureFitsRole(role: HrRole, structure: HrStructure): boolean {
  const s = HR_STRUCTURE_SPECS[structure];
  switch (role) {
    case 'station_capacity': return !s.running && s.stations === 'one';
    case 'strength_endurance': return !s.running;
    case 'mixed_station_conditioning': return !s.running && s.stations === 'many';
    case 'compromised_running': return s.running && structure !== 'partial_sequence';
    case 'partial_simulation': return structure === 'partial_sequence';
  }
}

/** Types de bloc de la STRUCTURE de séance ; seul `main` est généré par HYROX. */
export const HR_SESSION_BLOCK_KINDS = ['warmup', 'main', 'running', 'strength', 'cooldown'] as const;
export type HrSessionBlockKind = (typeof HR_SESSION_BLOCK_KINDS)[number];

/** Simulation complète : BLOCKED — données manquantes, toutes non gouvernées (refus explicite plutôt que fausse course). */
export const FULL_SIMULATION_MISSING = [
  'hybrid_race.raceFormat (ordre et nombre de stations, source officielle)',
  'hybrid_race.divisionStandards (distances, répétitions, charges par division)',
  'hybrid_race.runSegmentDistance (distance officielle des segments courus)',
  'hybrid_race.transitionModel (temps de transition / roxzone)',
  'running.compromisedPace (allure sous fatigue : moteur Running)',
] as const;
