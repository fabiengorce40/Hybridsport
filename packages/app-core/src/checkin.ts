/**
 * CONTRÔLE PRÉ-SÉANCE (P0) : état du jour DÉCLARÉ avant chaque nouveau démarrage de séance.
 *
 *   - Douleurs actuelles : zone fonctionnelle + niveau P1–P3 (libellés de la spec 09 §7.2, aucun diagnostic) ; signal
 *     général inquiétant = P4 (sans zone). Choix fermés uniquement (domaine `PainReport`).
 *   - Fatigue et récupération : réponses fermées, « je ne sais pas » toujours possible.
 *   - Aucune réponse (« Passer ») : état INCONNU (`unknown`, jamais assimilé à `normal` — spec 04 S4).
 *
 * Les conséquences ne sont PAS décidées ici : les règles G1 de douleur du CORE (`deriveSafetyRestrictions`,
 * `detectRecurrence`) disent pause / interruption / zones restreintes ; la séance est ensuite régénérée par le moteur
 * de sa discipline avec cet état (validation et réparation du CORE). Seule la LECTURE de l'état (réponses → catégorie)
 * est une règle de l'application : TEST_ONLY, explicite, versionnée (`CHECKIN_READINESS_RULE`).
 */
import { z } from 'zod';
import { PAIN_LEVELS, READINESS_CATEGORIES } from '@hybridsport/domain';
import type { PainReport, ReadinessCategory } from '@hybridsport/domain';
import { deriveSafetyRestrictions, detectRecurrence, isActive } from '@hybridsport/engine';
import type { CoreState, LoadedRuleset, SafetyRestrictions } from '@hybridsport/engine';
import { isISODateTime } from '@hybridsport/domain';

const instant = z.string().refine(isISODateTime, 'instant ISO attendu');

/** Zones fonctionnelles proposées (identifiants du catalogue, `painSensitiveAreas`). */
export const CHECKIN_BODY_AREAS = ['shoulder', 'elbow', 'wrist_hand', 'neck', 'upper_back', 'lower_back', 'hip_groin', 'knee', 'lower_leg', 'ankle_foot'] as const;
export const FATIGUE_LEVELS = ['low', 'moderate', 'high', 'unknown'] as const;
export const RECOVERY_LEVELS = ['good', 'average', 'poor', 'unknown'] as const;
/** Niveaux localisés proposés (P4 = signal général, saisi à part, sans zone). */
export const LOCAL_PAIN_LEVELS = ['P1', 'P2', 'P3'] as const;

export const zCheckInInput = z.object({
  pains: z.array(z.object({ area: z.enum(CHECKIN_BODY_AREAS), level: z.enum(LOCAL_PAIN_LEVELS) }).strict()).default([]),
  /** Signal général potentiellement préoccupant (P4, spec 09 §7.2) : interruption et pause selon G1. */
  generalSignal: z.boolean().default(false),
  fatigue: z.enum(FATIGUE_LEVELS).default('unknown'),
  recovery: z.enum(RECOVERY_LEVELS).default('unknown'),
}).strict();
export type CheckInInput = z.input<typeof zCheckInInput>;

export const CHECKIN_DECISIONS = ['unchanged', 'adapted', 'postponed', 'paused'] as const;
export type CheckInDecision = (typeof CHECKIN_DECISIONS)[number];

export const zCheckIn = z.object({
  id: z.string().min(1),
  at: instant,
  requestId: z.string().min(1),
  /** false : contrôle passé sans réponse (état inconnu). */
  answered: z.boolean(),
  pains: z.array(z.object({ area: z.string().min(1), level: z.enum(PAIN_LEVELS) }).strict()),
  generalSignal: z.boolean(),
  fatigue: z.enum(FATIGUE_LEVELS),
  recovery: z.enum(RECOVERY_LEVELS),
  readiness: z.enum(READINESS_CATEGORIES),
  decision: z.enum(CHECKIN_DECISIONS),
  /** Raisons de la décision (règles du CORE, du moteur, de l'application), affichables. */
  reasons: z.array(z.object({ code: z.string(), params: z.record(z.string(), z.unknown()).default({}) }).strict()),
}).strict();
export type CheckIn = z.infer<typeof zCheckIn>;

// technical-constant: nombre de contrôles conservés (historique de récurrence borné ; taille d'état)
export const CHECKIN_HISTORY_MAX = 60;

/**
 * Lecture de l'état à partir des réponses — règle de l'APPLICATION, TEST_ONLY (Beta 0), à valider :
 * fatigue élevée OU récupération mauvaise ⇒ `caution` (exemple de la spec moteur 04, S4) ; au moins une réponse
 * connue sinon ⇒ `normal` ; aucune réponse ⇒ `unknown`. Jamais `reduce` sur une seule déclaration (non gouverné).
 */
export const CHECKIN_READINESS_RULE = {
  id: 'app.checkin.readinessMapping', version: '0.1.0-test', status: 'TEST_ONLY',
  source: 'docs/engine-spec/04-charge-athlete-state.md S4 (exemple : fatigue déclarée élevée ⇒ caution)',
  caution: { fatigue: ['high'], recovery: ['poor'] },
} as const;

export function readinessOf(x: { readonly fatigue: (typeof FATIGUE_LEVELS)[number]; readonly recovery: (typeof RECOVERY_LEVELS)[number] }): ReadinessCategory {
  if (x.fatigue === 'unknown' && x.recovery === 'unknown') return 'unknown';
  const r = CHECKIN_READINESS_RULE.caution;
  if ((r.fatigue as readonly string[]).includes(x.fatigue) || (r.recovery as readonly string[]).includes(x.recovery)) return 'caution';
  return 'normal';
}

/** Signalements de douleur (domaine) d'un contrôle : un par zone, P4 sans zone si signal général. */
export function painReportsOf(c: Pick<CheckIn, 'id' | 'at' | 'pains' | 'generalSignal'>, rulesetRef: string): PainReport[] {
  const local = c.pains.map((p, k): PainReport => ({ id: `${c.id}.p${String(k)}`, level: p.level, bodyAreas: [p.area], affectedMovements: [], context: 'check_in', reportedAt: c.at, persisted: true, rulesetRef }));
  return c.generalSignal ? [...local, { id: `${c.id}.p4`, level: 'P4', bodyAreas: [], affectedMovements: [], context: 'check_in', reportedAt: c.at, persisted: true, rulesetRef }] : local;
}

/** État CORE inconnu (aucun contrôle) : jamais « normal » par défaut (spec 04 S4). */
export const UNKNOWN_CORE_STATE: CoreState = { readiness: 'unknown', activePain: [], painHistory: 'available', dayAvailable: true };

export function coreStateOf(readiness: ReadinessCategory, activePain: readonly PainReport[]): CoreState {
  return { readiness, activePain: [...activePain], painHistory: 'available', dayAvailable: true };
}

export interface CheckInEvaluation {
  readonly readiness: ReadinessCategory;
  /** Signalements retenus (niveau éventuellement relevé par la règle G1 de récurrence). */
  readonly reports: readonly PainReport[];
  readonly safety: SafetyRestrictions;
  /** La séance doit-elle être régénérée avec cet état (zones restreintes, intensité suspendue, état dégradé) ? */
  readonly needsAdaptation: boolean;
  readonly reasons: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[];
}

/**
 * Évaluation par les règles G1 du CORE : récurrence (douleur répétée ⇒ niveau relevé) puis restrictions dérivées.
 * `history` : contrôles antérieurs (pour la récurrence) ; aucune règle de douleur n'est écrite ici.
 */
export function evaluateCheckIn(c: Pick<CheckIn, 'id' | 'at' | 'pains' | 'generalSignal' | 'fatigue' | 'recovery'>, history: readonly CheckIn[], ruleset: LoadedRuleset): CheckInEvaluation {
  const readiness = readinessOf(c);
  let reports = painReportsOf(c, ruleset.version);
  const past = history.flatMap((h) => painReportsOf(h, ruleset.version));
  const rec = reports.length > 0 ? detectRecurrence([...past, ...reports], 'available', ruleset, c.at) : { status: 'none' as const, areas: [] as string[], reasons: [] };
  if (rec.status === 'escalate' && 'toLevel' in rec && rec.toLevel) {
    const to = rec.toLevel;
    const rank = (l: string): number => PAIN_LEVELS.indexOf(l as (typeof PAIN_LEVELS)[number]);
    reports = reports.map((r) => (r.bodyAreas.some((a) => rec.areas.includes(a)) && rank(r.level) < rank(to) ? { ...r, level: to } : r));
  }
  const safety = deriveSafetyRestrictions(reports.filter(isActive), ruleset);
  const needsAdaptation = safety.areaRestrictions.length > 0 || safety.restrictedMovements.length > 0 || safety.suspendHighIntensity || readiness === 'caution' || readiness === 'reduce';
  const escalated = rec.status === 'escalate' ? [{ code: 'KAIRO.CHECKIN_PAIN_ESCALATED', params: { areas: [...rec.areas], toLevel: 'toLevel' in rec ? rec.toLevel : null, rule: 'safety.pain.recurrence' } }] : [];
  const reasons = [...escalated, ...[...rec.reasons, ...safety.reasons].map((r) => ({ code: r.code, params: { ...r.params } }))];
  return { readiness, reports, safety, needsAdaptation, reasons };
}
