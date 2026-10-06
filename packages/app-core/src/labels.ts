/**
 * Libellés d'affichage (présentation uniquement : aucune donnée sportive). Le catalogue de test ne porte
 * que des identifiants techniques comme noms ; ces libellés les rendent lisibles. Repli : identifiant humanisé.
 */
import type { SetPrescription } from '@hybridsport/domain';
import type { Reason, Sport } from './model.js';

export const EXERCISE_LABELS: Readonly<Record<string, string>> = {
  'ex.back_squat': 'Squat barre', 'ex.goblet_squat': 'Goblet squat', 'ex.air_squat': 'Squat poids du corps', 'ex.leg_press': 'Presse à cuisses',
  'ex.bulgarian_split_squat': 'Squat bulgare', 'ex.reverse_lunge_bw': 'Fente arrière', 'ex.romanian_deadlift': 'Soulevé de terre roumain',
  'ex.single_leg_rdl_db': 'Soulevé roumain unilatéral haltère', 'ex.leg_curl': 'Leg curl', 'ex.kb_swing': 'Kettlebell swing',
  'ex.bench_press': 'Développé couché', 'ex.db_bench_press': 'Développé couché haltères', 'ex.machine_chest_press': 'Presse pectoraux machine',
  'ex.cable_fly': 'Écarté poulie', 'ex.push_up': 'Pompes', 'ex.incline_push_up': 'Pompes inclinées', 'ex.db_shoulder_press': 'Développé épaules haltères',
  'ex.pull_up': 'Tractions', 'ex.band_assisted_pull_up': 'Tractions assistées élastique', 'ex.lat_pulldown': 'Tirage vertical',
  'ex.seated_cable_row': 'Tirage horizontal poulie', 'ex.machine_row': 'Rowing machine', 'ex.db_row': 'Rowing haltère', 'ex.farmers_carry': 'Farmer walk',
  'ex.plank': 'Gainage', 'ex.easy_run': 'Course facile', 'ex.row_erg': 'Rameur', 'ex.skierg': 'SkiErg', 'ex.sled_push': 'Poussée de traîneau',
  'ex.sandbag_lunge': 'Fentes sandbag', 'ex.wall_ball': 'Wall ball', 'ex.box_jump': 'Box jump', 'ex.hip_mobility_flow': 'Mobilité hanches',
  'ex.hack_squat': 'Hack squat', 'ex.leg_extension': 'Leg extension', 'ex.machine_calf_raise': 'Mollets machine', 'ex.db_calf_raise': 'Mollets haltères',
  'ex.hip_thrust_barbell': 'Hip thrust barre', 'ex.hip_thrust_machine': 'Hip thrust machine', 'ex.barbell_ohp': 'Développé militaire',
  'ex.machine_shoulder_press': 'Développé épaules machine', 'ex.db_curl': 'Curl haltères', 'ex.cable_curl': 'Curl poulie',
  'ex.cable_triceps_pushdown': 'Extension triceps poulie', 'ex.db_lateral_raise': 'Élévations latérales haltères', 'ex.cable_lateral_raise': 'Élévations latérales poulie',
  'ex.machine_lateral_raise': 'Élévations latérales machine', 'ex.pec_deck': 'Pec deck', 'ex.cable_pallof_press': 'Pallof press', 'ex.dead_bug': 'Dead bug',
  'ex.db_rdl': 'Soulevé roumain haltères', 'ex.walking_lunge_db': 'Fentes marchées haltères', 'ex.shoulder_mobility_flow': 'Mobilité épaules',
  'ex.lower_mobility_flow': 'Mobilité bas du corps',
};

export function exerciseLabel(id: string): string {
  return EXERCISE_LABELS[id] ?? id.replace(/^ex\./, '').replace(/_/g, ' ');
}

export const SPORT_LABELS: Readonly<Record<Sport, string>> = { strength: 'Musculation', running: 'Course à pied', crosstraining: 'Cross-training', hyrox: 'HYROX' };

const SET_KIND: Readonly<Record<SetPrescription['kind'], string>> = { rampup: 'Montée', working: 'Travail', backoff: 'Série de recul', amrap: 'AMRAP', top_set: 'Série lourde' };
export const setKindLabel = (k: SetPrescription['kind']): string => SET_KIND[k];
const SET_KIND_SHORT: Readonly<Record<SetPrescription['kind'], string>> = { rampup: 'Mont.', working: 'Trav.', backoff: 'Recul', amrap: 'AMRAP', top_set: 'Lourde' };
export const setKindShort = (k: SetPrescription['kind']): string => SET_KIND_SHORT[k];

export function repsLabel(r: SetPrescription['reps']): string {
  return typeof r === 'number' ? `${String(r)} reps` : `${String(r.min)}–${String(r.max)} reps`;
}

/** Cible d'intensité telle que PRESCRITE par le moteur (jamais complétée ni convertie). */
export function intensityLabel(s: SetPrescription): string {
  const i = s.intensity;
  const eff = (e: { rir: number } | { rpe: number } | undefined): string => (e === undefined ? '' : 'rir' in e ? `RIR ${String(e.rir)}` : `RPE ${String(e.rpe)}`);
  if (!i) return s.rir !== undefined ? `RIR ${String(s.rir)}` : '';
  switch (i.mode) {
    case 'load': return [`${String(i.kg)} kg`, eff(i.effort)].filter(Boolean).join(' · ');
    case 'percent_of_reference': return [`${String(i.kgRounded)} kg`, eff(i.effort)].filter(Boolean).join(' · ');
    case 'effort': return [eff(i.effort), i.indicativeKg ? `repère ${String(i.indicativeKg.min)}–${String(i.indicativeKg.max)} kg` : 'charge à choisir'].filter(Boolean).join(' · ');
    // technical-constant: conversion fraction → pourcentage (affichage)
    case 'relative_to_working': return `${String(Math.round(i.fraction * 100))} % de la charge de travail`;
    case 'bodyweight': return ['Poids du corps', i.addedKg ? `+${String(i.addedKg)} kg` : '', eff(i.effort)].filter(Boolean).join(' · ');
  }
}

/** Estimation arrondie à la minute (une estimation n'a pas la précision de la seconde). */
export function approxMinutes(seconds: number): string {
  // technical-constant: conversion secondes → minutes (affichage)
  return `${String(Math.max(1, Math.round(seconds / 60)))} min`;
}

export function durationLabel(seconds: number): string {
  // technical-constant: conversion secondes → minutes (affichage)
  const m = Math.floor(seconds / 60);
  // technical-constant: conversion secondes → minutes (affichage)
  const s = Math.round(seconds % 60);
  // technical-constant: format d’affichage mm:ss
  return s === 0 ? `${String(m)} min` : `${String(m)} min ${String(s).padStart(2, '0')}`;
}

/** Messages des raisons de refus ou d'indisponibilité les plus fréquentes (repli : code brut). */
const REASONS: Readonly<Record<string, (p: Record<string, unknown>) => string>> = {
  'KAIRO.SAFETY_PAUSE_ACTIVE_PAIN': () => 'Séances suspendues : une douleur a été signalée. Consultez un professionnel de santé ; levez la pause dans votre profil quand elle a disparu.',
  'SCOPE.RUNNING.HYBRID_PLANNER_UNAVAILABLE': () => 'Course + autre sport : le planificateur global qui répartit la charge entre disciplines n’est pas encore validé. Aucune séance de course n’est proposée.',
  'SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED': () => 'Débutant en course (P-R0) : la dose de première exposition n’est pas encore validée par un expert.',
  'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE': (p) => `Aucune dose de course établie (${String(p.cause)}). Enregistrez une course réalisée : la séance reprend sa durée et n’augmente que d’un petit pas après deux séances bien tolérées.`,
  'DOSE.RUNNING.TEST_REFUSED': (p) => (p.cause === 'OBSERVED_PACE_UNAVAILABLE'
    ? 'Test impossible pour l’instant : enregistrez d’abord une course récente avec sa distance (elle sert seulement à estimer la durée du test, jamais de cible).'
    : `Test indisponible (${String(p.cause)}).`),
  'DOSE.RUNNING.FIRST_EXPOSURE_REFUSED': (p) => (p.cause === 'RECENT_TEST_REQUIRED'
    ? 'Première séance de ce type : un test récent (5 km, ou 10 km pour un objectif 10 km) est d’abord nécessaire.'
    : p.cause === 'BLOCKED_PENDING_SOURCES' ? 'Côtes : la première séance n’est pas encore validée (sources à confirmer).' : `Première séance indisponible (${String(p.cause)}).`),
  'SCOPE.RUNNING.QUALITY_GUARD_FAILED': (p) => QUALITY_GUARDS[String(p.rule)] ?? `Séance intense non autorisée (${String(p.rule)}).`,
  'DOSE.RUNNING.STRUCTURE_UNAVAILABLE': () => 'La structure de votre dernière séance de ce type n’a pas été enregistrée : elle ne peut pas être reprise.',
  'STATE.RUNNING.RETURN_PROTOCOL_UNRESOLVED': () => 'Reprise après coupure : le protocole de reprise n’est pas encore validé.',
  'PLAN.RUNNING.TIME_EXCEEDED': (p) => `Durée estimée (jusqu’à ${durationLabel(Number(p.estimatedMaxS))}) supérieure au temps disponible ce jour-là : la séance n’est jamais raccourcie.`,
  'PLAN.RUNNING.EXERCISE_UNAVAILABLE': () => 'Aucun exercice de course utilisable (restrictions ou exclusions).',
  'RULE.RUNNING.SIMULATION_REQUIRED': () => 'Prescription de course possible uniquement en simulation.',
  'GOAL.RUNNING.MARATHON_RULE_UNRESOLVED': () => 'Objectif marathon : règle spécifique non validée.',
  'PLAN.RUNNING.PRESCRIPTION_NOT_IMPLEMENTED': () => 'Ce type de séance de course n’est pas encore implémenté.',
  'KAIRO.ARCHETYPE_MISSING': () => 'Type de séance absent du contenu.',
};

const QUALITY_GUARDS: Readonly<Record<string, string>> = {
  G3_POPULATION: 'Niveau déclaré insuffisant pour ce type de séance.',
  K_CONTINUOUS_LEVEL: 'Seuil en continu réservé aux coureurs confirmés ou à une référence fiable.',
  G3_GOAL: 'Type de séance non prévu pour cet objectif.',
  N_TERRAIN_UNDECLARED: 'Aucune côte praticable déclarée dans votre profil.',
  X_RETURN_STATE: 'Reprise après une longue coupure : séances faciles seulement.',
  X_RETURN_NOT_LIFTED: 'Reprise en cours : les séances intenses attendent la fin de la reprise.',
  V10_DENSITY: 'Nombre de séances intenses de la semaine atteint.',
  V11_CONSECUTIVE: 'Jamais deux jours d’affilée à forte intensité.',
};

export function reasonMessage(r: Reason): string {
  return REASONS[r.code]?.(r.params) ?? r.code;
}

/** Raison principale à afficher pour une séance indisponible (la plus explicative). */
export function primaryReason(reasons: readonly Reason[]): Reason | undefined {
  return reasons.find((r) => REASONS[r.code]) ?? reasons.at(-1);
}

export const PLAN_NOTICES: Readonly<Record<string, (p: Record<string, string | number>) => string>> = {
  'PLAN.ENGINE_UNAVAILABLE': (p) => `${SPORT_LABELS[p.sport as Sport] ?? String(p.sport)} : aucun moteur ni règle validée pour l’instant. Aucune séance n’est générée.`,
  'PLAN.RECOVERY_RULE_UNGOVERNED': (p) => `Séances les ${String(p.from)} et ${String(p.to)} consécutives : aucune règle de récupération validée ne s’applique encore.`,
  'PLAN.RUNNING.WEEK_MAINTENANCE_MODE': (p) => `Course : ${String(p.sessions)} séance par semaine, sous le minimum pour une séance intense ⇒ footings uniquement.`,
  'PLAN.RUNNING.WEEK_TEST_REPLACES_KEY': (p) => (String(p.cause) === 'REFERENCE_CONFLICT'
    ? 'Course : vos références se contredisent ⇒ un test remplace la séance clé cette semaine.'
    : 'Course : un test remplace la séance clé cette semaine ; il fixera l’intensité de vos premières séances de qualité.'),
  'PLAN.RUNNING.WEEK_LONG_NOT_PLACED': (p) => (String(p.cause) === 'FREQUENCY_BELOW_THREE' ? 'Course : moins de 3 séances par semaine ⇒ pas de sortie longue distincte.' : 'Course : aucun jour admissible pour la sortie longue cette semaine.'),
  'PLAN.RUNNING.WEEK_MISSED_DECISION': (p) => (p.decision === 'MOVE'
    ? `Course : séance du ${String(p.date)} manquée, déplacée au ${String(p.to)}.`
    : `Course : séance du ${String(p.date)} manquée, non compensée (aucun rattrapage de volume).`),
  'PLAN.RUNNING.WEEK_REPLANNED': () => 'Course : plusieurs séances manquées ⇒ semaine replanifiée, aucune progression tant que la régularité n’est pas retrouvée.',
};
/** Avis internes de composition (tracés, non affichés). */
export const SILENT_PLAN_NOTICES: readonly string[] = ['PLAN.RUNNING.WEEK_SLOT_SELECTED', 'PLAN.RUNNING.WEEK_KEY_FALLBACK'];

/** Titres des séances de course (identifiant d'archétype de l'intention). */
export const RUNNING_ARCHETYPE_LABELS: Readonly<Record<string, string>> = {
  'running.easy': 'Footing facile', 'running.long': 'Sortie longue', 'running.threshold': 'Seuil', 'running.severe': 'Fractionné VO₂',
  'running.short_interval': 'Intervalles courts', 'running.hills': 'Côtes', 'running.test': 'Test chronométré', 'running.race_pace': 'Allure spécifique',
  'running.strides': 'Lignes droites',
};
export const RUNNING_ROLE_LABELS: Readonly<Record<string, string>> = { KEY: 'Séance clé', TEST: 'Calibration', LONG: 'Sortie longue', EASY: 'Footing' };
export const RUNNING_ARCHETYPE_SHORT: Readonly<Record<string, string>> = {
  EASY: 'Footing', LONG: 'Sortie longue', THRESHOLD: 'Seuil', SEVERE: 'VO₂', SHORT_INTERVAL: 'Intervalles courts', HILLS: 'Côtes', TEST: 'Test', RACE_PACE: 'Allure spécifique', STRIDES: 'Lignes droites',
};

/** Allure s/km ⇒ « m:ss /km » (affichage seulement). */
export function paceLabel(secPerKm: number): string {
  // technical-constant: conversion secondes → minutes (affichage)
  const m = Math.floor(secPerKm / 60);
  // technical-constant: conversion secondes → minutes (affichage)
  const s = Math.round(secPerKm % 60);
  // technical-constant: arrondi d’affichage (60 s)
  return s === 60 ? `${String(m + 1)}:00` : `${String(m)}:${String(s).padStart(2, '0')}`;
}

export const UNPLACED_REASONS: Readonly<Record<string, string>> = {
  NOT_ENOUGH_DAYS: 'pas assez de jours disponibles (une séance par jour au plus)',
  NO_DAY_LONG_ENOUGH: 'aucun jour assez long pour ce type de séance',
  LEVEL_NOT_SUPPORTED: 'niveau non couvert par ce type de séance',
  GOAL_NOT_SUPPORTED: 'objectif non couvert par ce type de séance',
  ARCHETYPE_MISSING: 'type de séance absent du contenu',
};

export const EQUIPMENT_LABELS: Readonly<Record<string, string>> = {
  barbell: 'Barre olympique', plates: 'Disques', rack: 'Rack', bench: 'Banc', dumbbells: 'Haltères', kettlebells: 'Kettlebells', cable: 'Poulie',
  leg_press: 'Presse à cuisses', chest_press_machine: 'Presse pectoraux', leg_curl_machine: 'Leg curl', row_machine: 'Machine de tirage',
  pullup_bar: 'Barre de traction', bands: 'Élastiques', box: 'Box', rower: 'Rameur', skierg: 'SkiErg', assault_bike: 'Assault bike', treadmill: 'Tapis de course',
  sled: 'Traîneau', wall_ball: 'Wall ball', sandbag: 'Sandbag', hack_squat: 'Hack squat', leg_extension_machine: 'Leg extension', calf_machine: 'Machine à mollets',
  hip_thrust_machine: 'Hip thrust machine', shoulder_press_machine: 'Presse épaules', pec_deck: 'Pec deck', lateral_raise_machine: 'Élévations latérales machine',
};
export const equipmentLabel = (id: string): string => EQUIPMENT_LABELS[id] ?? id.replace(/_/g, ' ');

export const LEVEL_LABELS: Readonly<Record<string, string>> = { novice: 'Novice', beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' };
export const STRENGTH_GOAL_LABELS: Readonly<Record<string, string>> = { strength: 'Force', hypertrophy: 'Masse musculaire', general: 'Forme générale' };
export const RUNNING_GOAL_LABELS: Readonly<Record<string, string>> = { GENERAL_RUNNING: 'Courir régulièrement', FIVE_K: '5 km', TEN_K: '10 km', HALF_MARATHON: 'Semi-marathon', MARATHON: 'Marathon' };
/** Populations Running (RUNNING-V1-DOMAIN-SPEC). */
export const RUNNING_LEVEL_LABELS: Readonly<Record<string, { title: string; detail: string }>> = {
  P_R0: { title: 'Je débute la course', detail: 'Peu d’historique fiable' },
  P_R1: { title: 'Loisir débutant', detail: 'Pratique récente et irrégulière' },
  P_R2: { title: 'Loisir entraîné', detail: 'Pratique régulière, quelques séances de qualité' },
  P_R3: { title: 'Intermédiaire', detail: 'Pratique structurée, plusieurs distances courues' },
  P_R4: { title: 'Avancé non élite', detail: 'Volume élevé, compétitions régulières' },
};
/**
 * Cross-training (C3.5) : intentions DÉCLARABLES en Beta 0 = archétypes de stimulus que C3 sait composer (identifiants
 * techniques du moteur, aucun nouveau stimulus) ; libellés d'interface seulement.
 */
export const CT_INTENT_LABELS: Readonly<Record<string, { title: string; detail: string }>> = {
  'crosstraining.mixed_modal_medium': { title: 'Mixte', detail: 'Plusieurs modalités enchaînées (ergomètre, poids du corps)' },
  'crosstraining.aerobic_capacity': { title: 'Capacité aérobie', detail: 'Effort long et soutenable' },
  'crosstraining.threshold': { title: 'Seuil', detail: 'Intervalles longs avec récupération' },
  'crosstraining.anaerobic_intervals': { title: 'Intervalles intenses', detail: 'Efforts courts, récupérations plus longues' },
  'crosstraining.muscular_endurance': { title: 'Endurance musculaire', detail: 'Répétitions au poids du corps, chaque minute' },
};
export const CT_FORMAT_LABELS: Readonly<Record<string, string>> = { continuous: 'Continu', intervals: 'Intervalles', emom: 'EMOM', amrap: 'AMRAP', for_time: 'For time' };
export const RETURN_STATE_LABELS: Readonly<Record<string, string>> = { NONE: 'Pas de coupure', SHORT: 'Courte coupure', MODERATE: 'Coupure moyenne', LONG: 'Longue coupure', UNKNOWN: 'Je ne sais pas' };
export const DIFFICULTY_LABELS: Readonly<Record<string, string>> = { EASIER: 'Plus facile que prévu', AS_EXPECTED: 'Comme prévu', HARDER: 'Plus dur', MUCH_HARDER: 'Beaucoup plus dur' };
export const PAIN_AREAS: Readonly<Record<string, string>> = { knee: 'Genou', shoulder: 'Épaule', lower_back: 'Bas du dos', hip_groin: 'Hanche / aine', ankle_foot: 'Cheville / pied', elbow_wrist: 'Coude / poignet', other: 'Autre' };
export const AUTHORITY_LABELS: Readonly<Record<string, { badge: string; detail: string }>> = {
  provisional: { badge: 'PROVISOIRE', detail: 'Valeurs provisoires non validées par un expert (ruleset de test verrouillé provisoirement).' },
  simulation: { badge: 'SIMULATION', detail: 'Moteur course en gouvernance simulée : valeurs candidates, non approuvées.' },
};
