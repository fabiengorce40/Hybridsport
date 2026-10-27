/**
 * REKKA V2 — pictogrammes de discipline (fichiers SVG du kit `assets/rekka-v2/icons/sports/`, couleur de discipline
 * intégrée). Toujours accompagnés d'un nom accessible : la discipline n'est jamais portée par la couleur seule.
 */
import musculation from './visual/musculation.svg';
import course from './visual/course.svg';
import hyrox from './visual/hyrox.svg';
import crossTraining from './visual/cross-training.svg';

export type SportKey = 'strength' | 'running' | 'hyrox' | 'crosstraining';
export const SPORT_NAMES: Readonly<Record<SportKey, string>> = { strength: 'Musculation', running: 'Course', hyrox: 'HYROX', crosstraining: 'Cross-training' };
export const SPORT_ICONS: Readonly<Record<SportKey, string>> = { strength: musculation, running: course, hyrox, crosstraining: crossTraining };

export function SportIcon({ sport, label = true, className = '' }: { sport: SportKey; label?: boolean; className?: string }) {
  return (
    <span className={`r-sport-icon ${className}`.trim()} data-sport={sport} {...(label ? { role: 'img', 'aria-label': SPORT_NAMES[sport] } : { 'aria-hidden': true })}>
      <img src={SPORT_ICONS[sport]} alt="" draggable={false} />
    </span>
  );
}
