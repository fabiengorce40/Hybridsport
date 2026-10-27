/**
 * REKKA V2-2C — objectifs et jalons VÉRIFIÉS (composants prêts pour l'intégration). Règle : un chiffre, une progression
 * ou un jalon « obtenu » ne s'affiche QUE s'il repose sur une preuve (séances réelles enregistrées). Sans preuve, le
 * composant l'écrit (« non disponible », « à venir ») au lieu d'inventer. Aucun niveau, aucune XP, aucune performance
 * estimée : ces notions n'existent pas dans le modèle et ne sont pas acceptées par les types.
 */
import { SportIcon, SPORT_NAMES } from './SportIcon.js';
import type { SportKey } from './SportIcon.js';
import { BADGES } from './assets.js';
import type { BadgeKey } from './assets.js';

/** Preuve : séances réelles qui fondent la valeur (identifiants côté application, date de la plus récente). */
export interface Evidence { readonly sessionIds: readonly string[]; readonly lastOn: string }
export const isVerified = (e: Evidence | null | undefined): e is Evidence => !!e && e.sessionIds.length > 0 && e.lastOn.length > 0;

export interface VerifiedGoal {
  readonly id: string;
  readonly sport: SportKey;
  readonly title: string;
  /** Valeur actuelle MESURÉE (null si aucune mesure) et cible choisie par l'utilisateur, dans la même unité. */
  readonly current: number | null;
  readonly target: number;
  readonly unit: string;
  /** Sens de progression : charge ou volume (plus = mieux), temps (moins = mieux). */
  readonly better: 'higher' | 'lower';
  readonly evidence: Evidence | null;
}

const fmt = (n: number) => String(n).replace('.', ',');

/** Part de la cible atteinte (0–1), seulement pour un objectif « plus = mieux » mesuré et prouvé. */
export function goalRatio(g: VerifiedGoal): number | null {
  if (g.current === null || !isVerified(g.evidence) || g.better !== 'higher' || g.target <= 0) return null;
  return Math.max(0, Math.min(1, g.current / g.target));
}

export function GoalProgress({ goal }: { goal: VerifiedGoal }) {
  const verified = goal.current !== null && isVerified(goal.evidence);
  const ratio = goalRatio(goal);
  const label = `${goal.title} : ${verified ? `${fmt(goal.current ?? 0)} ${goal.unit} sur ${fmt(goal.target)} ${goal.unit}` : 'non disponible'}`;
  return (
    <article className="r-goal" data-sport={goal.sport} data-verified={verified} aria-label={label}>
      <SportIcon sport={goal.sport} />
      <div className="r-goal-text">
        <b>{goal.title}</b>
        {verified ? (
          <>
            <span className="r-num">{fmt(goal.current ?? 0)} / {fmt(goal.target)} {goal.unit} · {SPORT_NAMES[goal.sport]}</span>
            {ratio !== null && <div className="r-progress" role="progressbar" aria-label={`Progression vers : ${goal.title}`} aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={goal.current ?? 0}><i style={{ width: `${String(Math.round(ratio * 100))}%` }} /></div>}
            <small>Mesuré sur {goal.evidence?.sessionIds.length} séance{(goal.evidence?.sessionIds.length ?? 0) > 1 ? 's' : ''} · dernière le {goal.evidence?.lastOn}</small>
          </>
        ) : (
          <span>{SPORT_NAMES[goal.sport]} · non disponible : aucune séance réelle ne le mesure encore</span>
        )}
      </div>
    </article>
  );
}

export interface VerifiedMilestone {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly badge: BadgeKey;
  /** Date d'obtention ; un jalon n'est « obtenu » qu'avec une date ET une preuve. */
  readonly achievedOn: string | null;
  readonly evidence: Evidence | null;
}
export const milestoneEarned = (m: VerifiedMilestone): boolean => m.achievedOn !== null && isVerified(m.evidence);

export function MilestoneCard({ m }: { m: VerifiedMilestone }) {
  const earned = milestoneEarned(m);
  return (
    <article className={`r-milestone ${earned ? 'earned' : 'locked'}`} data-verified={earned} aria-label={`${m.title} : ${earned ? 'obtenu' : 'à venir'}`}>
      <img className="r-milestone-img" src={BADGES[m.badge]} alt="" aria-hidden="true" />
      <span className="r-milestone-text"><b>{m.title}</b><span>{earned ? `Obtenu le ${m.achievedOn ?? ''}` : m.detail}</span></span>
      <span className={`r-badge ${earned ? 'success' : ''}`}>{earned ? 'Obtenu' : 'À venir'}</span>
    </article>
  );
}
