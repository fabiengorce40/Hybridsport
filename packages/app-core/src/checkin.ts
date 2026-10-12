/**
 * CONTRÔLE PRÉ-SÉANCE (P0) : état du jour DÉCLARÉ avant chaque nouveau démarrage de séance.
 *
 *   - Douleurs actuelles : zone fonctionnelle + niveau P1–P3 (libellés de la spec 09 §7.2, aucun diagnostic) ; signal
 *     général inquiétant = P4 (sans zone). Choix fermés uniquement (domaine `PainReport`).
 *   - Fatigue et récupération : réponses fermées, « je ne sais pas » toujours possible.
 *   - Aucune réponse (« Passer ») : état INCONNU (`unknown`, jamais assimilé à `normal` — spec 04 S4).
 *   - Question douleur : réponse EXPLICITE (`no` / `yes`) ou inconnue (`unknown`). Une question sans réponse n'est
 *     JAMAIS lue comme « aucune douleur ».
 *   - Douleurs CONNUES : un signalement du CORE reste actif tant qu'il n'est pas résolu (`isActive`). Faute de réponse
 *     explicite (« Passer », question douleur sans réponse), les douleurs du dernier contrôle EXPLICITE sont reportées
 *     telles quelles (`knownPains`) et continuent de restreindre la séance. Elles ne sont levées que par une réponse
 *     explicite (« Non », ou la liste des zones actuelles) ou par la levée de la pause douleur (contrôle « pause »).
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
/** Réponse à « Avez-vous une douleur en ce moment ? » ; `unknown` = sans réponse (jamais « aucune douleur »). */
export const PAIN_ANSWERS = ['no', 'yes', 'unknown'] as const;
export type PainAnswer = (typeof PAIN_ANSWERS)[number];
/** Statut de douleur enregistré : déclarée absente, déclarée, ou inconnue (douleurs connues reportées). */
export const PAIN_STATUSES = ['none', 'reported', 'unknown'] as const;

export const zCheckInInput = z.object({
  /** Réponse à la question douleur. Absente : `yes` si des douleurs sont fournies, sinon `unknown` (jamais `no`). */
  painAnswer: z.enum(PAIN_ANSWERS).optional(),
  pains: z.array(z.object({ area: z.enum(CHECKIN_BODY_AREAS), level: z.enum(LOCAL_PAIN_LEVELS) }).strict()).default([]),
  /** Signal général potentiellement préoccupant (P4, spec 09 §7.2) : interruption et pause selon G1. */
  generalSignal: z.boolean().default(false),
  fatigue: z.enum(FATIGUE_LEVELS).default('unknown'),
  recovery: z.enum(RECOVERY_LEVELS).default('unknown'),
}).strict().superRefine((x, ctx) => {
  const any = x.pains.length > 0 || x.generalSignal === true;
  if (x.painAnswer === 'yes' && !any) ctx.addIssue({ code: 'custom', message: 'douleur déclarée sans zone ni signal général' });
  if ((x.painAnswer === 'no' || x.painAnswer === 'unknown') && any) ctx.addIssue({ code: 'custom', message: 'zones de douleur incompatibles avec la réponse' });
});
export type CheckInInput = z.input<typeof zCheckInInput>;

/** Réponse douleur effective : explicite si fournie ; sinon déduite des seules douleurs fournies, JAMAIS « aucune ». */
export function painAnswerOf(x: { readonly painAnswer?: PainAnswer | undefined; readonly pains: readonly unknown[]; readonly generalSignal: boolean }): PainAnswer {
  if (x.painAnswer) return x.painAnswer;
  return x.pains.length > 0 || x.generalSignal ? 'yes' : 'unknown';
}

export const CHECKIN_DECISIONS = ['unchanged', 'adapted', 'postponed', 'paused'] as const;
export type CheckInDecision = (typeof CHECKIN_DECISIONS)[number];

export const zCheckIn = z.object({
  id: z.string().min(1),
  at: instant,
  requestId: z.string().min(1),
  /** false : contrôle passé sans réponse (état inconnu). */
  answered: z.boolean(),
  /** Douleurs DÉCLARÉES par ce contrôle (niveau après récurrence) ; seules comptées pour la récurrence future. */
  pains: z.array(z.object({ area: z.string().min(1), level: z.enum(PAIN_LEVELS) }).strict()),
  generalSignal: z.boolean(),
  /** Réponse à la question douleur : `unknown` si aucune réponse explicite. */
  painStatus: z.enum(PAIN_STATUSES).default('unknown'),
  /** Douleurs CONNUES reportées faute de réponse explicite (contrôle d'origine), appliquées à cette séance. */
  knownPains: z.array(z.object({ area: z.string().min(1), level: z.enum(PAIN_LEVELS), from: z.string().min(1), reportedAt: instant }).strict()).default([]),
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

export type KnownPain = CheckIn['knownPains'][number];

/** Statut douleur d'un contrôle enregistré (douleurs déclarées ⇒ `reported`, quel que soit l'ancien format). */
const painStatusOf = (h: Pick<CheckIn, 'pains' | 'generalSignal' | 'painStatus'>): CheckIn['painStatus'] => (h.pains.length > 0 || h.generalSignal ? 'reported' : h.painStatus);

/**
 * Douleurs CONNUES à la date du contrôle : celles du dernier contrôle à réponse douleur EXPLICITE. « Non » ⇒ aucune ;
 * contrôle ayant déclenché la pause douleur ⇒ aucune (la pause bloque tout démarrage tant qu'elle est active ; sa
 * levée vaut résolution). Toute levée explicite de la pause (`clearedAt`) résout les douleurs connues antérieures. Les
 * contrôles sans réponse ne lèvent rien : ils sont ignorés.
 */
export function knownPainsOf(history: readonly CheckIn[], clearedAt?: string): KnownPain[] {
  const last = [...history].reverse().find((h) => painStatusOf(h) !== 'unknown');
  if (last && clearedAt !== undefined && Date.parse(last.at) <= Date.parse(clearedAt)) return [];
  if (!last || painStatusOf(last) === 'none' || last.decision === 'paused') return [];
  return last.pains.map((p) => ({ area: p.area, level: p.level, from: last.id, reportedAt: last.at }));
}

/** État CORE inconnu (aucun contrôle) : jamais « normal » par défaut (spec 04 S4). */
export const UNKNOWN_CORE_STATE: CoreState = { readiness: 'unknown', activePain: [], painHistory: 'available', dayAvailable: true };

export function coreStateOf(readiness: ReadinessCategory, activePain: readonly PainReport[]): CoreState {
  return { readiness, activePain: [...activePain], painHistory: 'available', dayAvailable: true };
}

export interface CheckInEvaluation {
  readonly readiness: ReadinessCategory;
  /** Signalements appliqués : déclarés (niveau éventuellement relevé par la récurrence G1) puis connus reportés. */
  readonly reports: readonly PainReport[];
  /** Signalements DÉCLARÉS par ce contrôle (sous-ensemble de `reports`). */
  readonly declared: readonly PainReport[];
  /** Douleurs connues reportées (réponse douleur inconnue). */
  readonly known: readonly KnownPain[];
  readonly safety: SafetyRestrictions;
  /** La séance doit-elle être régénérée avec cet état (zones restreintes, intensité suspendue, état dégradé) ? */
  readonly needsAdaptation: boolean;
  readonly reasons: readonly { readonly code: string; readonly params: Readonly<Record<string, unknown>> }[];
}

/**
 * Évaluation par les règles G1 du CORE : récurrence (douleur répétée ⇒ niveau relevé) puis restrictions dérivées.
 * `history` : contrôles antérieurs (récurrence, douleurs connues) ; aucune règle de douleur n'est écrite ici. Les douleurs
 * connues reportées ne sont PAS recomptées comme nouveaux signalements (aucune récurrence artificielle).
 */
export function evaluateCheckIn(c: Pick<CheckIn, 'id' | 'at' | 'pains' | 'generalSignal' | 'fatigue' | 'recovery'> & { readonly painStatus: CheckIn['painStatus'] }, history: readonly CheckIn[], ruleset: LoadedRuleset, clearedAt?: string): CheckInEvaluation {
  const readiness = readinessOf(c);
  const known = c.painStatus === 'unknown' ? knownPainsOf(history, clearedAt) : [];
  const knownReports = known.map((k, i): PainReport => ({ id: `${k.from}.k${String(i)}`, level: k.level, bodyAreas: [k.area], affectedMovements: [], context: 'check_in', reportedAt: k.reportedAt, persisted: true, rulesetRef: ruleset.version }));
  let reports = painReportsOf(c, ruleset.version);
  const past = history.flatMap((h) => painReportsOf(h, ruleset.version));
  const rec = reports.length > 0 ? detectRecurrence([...past, ...reports], 'available', ruleset, c.at) : { status: 'none' as const, areas: [] as string[], reasons: [] };
  if (rec.status === 'escalate' && 'toLevel' in rec && rec.toLevel) {
    const to = rec.toLevel;
    const rank = (l: string): number => PAIN_LEVELS.indexOf(l as (typeof PAIN_LEVELS)[number]);
    reports = reports.map((r) => (r.bodyAreas.some((a) => rec.areas.includes(a)) && rank(r.level) < rank(to) ? { ...r, level: to } : r));
  }
  const declared = reports;
  reports = [...declared, ...knownReports];
  const safety = deriveSafetyRestrictions(reports.filter(isActive), ruleset);
  const needsAdaptation = safety.areaRestrictions.length > 0 || safety.restrictedMovements.length > 0 || safety.suspendHighIntensity || readiness === 'caution' || readiness === 'reduce';
  const escalated = rec.status === 'escalate' ? [{ code: 'KAIRO.CHECKIN_PAIN_ESCALATED', params: { areas: [...rec.areas], toLevel: 'toLevel' in rec ? rec.toLevel : null, rule: 'safety.pain.recurrence' } }] : [];
  const carried = known.length > 0 ? [{ code: 'KAIRO.CHECKIN_KNOWN_PAIN_KEPT', params: { areas: known.map((k) => `${k.area}:${k.level}`), from: known[0]?.from ?? '' } }] : [];
  const reasons = [...carried, ...escalated, ...[...rec.reasons, ...safety.reasons].map((r) => ({ code: r.code, params: { ...r.params } }))];
  return { readiness, reports, declared, known, safety, needsAdaptation, reasons };
}
