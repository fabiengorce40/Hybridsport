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
  'DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE': (p) => `Aucune dose de course établie (${String(p.cause)}). Enregistrez une course réalisée : la séance reprendra sa durée, sans jamais l’augmenter.`,
  'STATE.RUNNING.RETURN_PROTOCOL_UNRESOLVED': () => 'Reprise après coupure : le protocole de reprise n’est pas encore validé.',
  'PLAN.RUNNING.TIME_EXCEEDED': (p) => `La dernière durée réalisée (${durationLabel(Number(p.estimatedMaxS))}) dépasse le temps disponible ce jour-là.`,
  'PLAN.RUNNING.EXERCISE_UNAVAILABLE': () => 'Aucun exercice de course utilisable (restrictions ou exclusions).',
  'RULE.RUNNING.SIMULATION_REQUIRED': () => 'Prescription de course possible uniquement en simulation.',
  'GOAL.RUNNING.MARATHON_RULE_UNRESOLVED': () => 'Objectif marathon : règle spécifique non validée.',
  'PLAN.RUNNING.PRESCRIPTION_NOT_IMPLEMENTED': () => 'Ce type de séance de course n’est pas encore implémenté.',
  'KAIRO.ARCHETYPE_MISSING': () => 'Type de séance absent du contenu.',
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
};

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
export const RETURN_STATE_LABELS: Readonly<Record<string, string>> = { NONE: 'Pas de coupure', SHORT: 'Courte coupure', MODERATE: 'Coupure moyenne', LONG: 'Longue coupure', UNKNOWN: 'Je ne sais pas' };
export const DIFFICULTY_LABELS: Readonly<Record<string, string>> = { EASIER: 'Plus facile que prévu', AS_EXPECTED: 'Comme prévu', HARDER: 'Plus dur', MUCH_HARDER: 'Beaucoup plus dur' };
export const PAIN_AREAS: Readonly<Record<string, string>> = { knee: 'Genou', shoulder: 'Épaule', lower_back: 'Bas du dos', hip_groin: 'Hanche / aine', ankle_foot: 'Cheville / pied', elbow_wrist: 'Coude / poignet', other: 'Autre' };
export const AUTHORITY_LABELS: Readonly<Record<string, { badge: string; detail: string }>> = {
  provisional: { badge: 'PROVISOIRE', detail: 'Valeurs provisoires non validées par un expert (ruleset de test verrouillé provisoirement).' },
  simulation: { badge: 'SIMULATION', detail: 'Moteur course en gouvernance simulée : valeurs candidates, non approuvées.' },
};
