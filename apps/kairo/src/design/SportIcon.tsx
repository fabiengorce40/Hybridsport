/**
 * REKKA V2 — pictogrammes de discipline (fichiers SVG du kit `assets/rekka-v2/icons/sports/`, couleur de discipline
 * intégrée). Toujours accompagnés d'un nom accessible : la discipline n'est jamais portée par la couleur seule.
 */
import musculation from '../assets/rekka-v2/icons/sports/musculation.svg';
import course from '../assets/rekka-v2/icons/sports/course.svg';
import hyrox from '../assets/rekka-v2/icons/sports/hyrox.svg';
import crossTraining from '../assets/rekka-v2/icons/sports/cross-training.svg';

export type SportKey = 'strength' | 'running' | 'hyrox' | 'crosstraining';
export const SPORT_NAMES: Readonly<Record<SportKey, string>> = { strength: 'Musculation', running: 'Course', hyrox: 'HYROX', crosstraining: 'Cross-training' };
export const SPORT_ICONS: Readonly<Record<SportKey, string>> = { strength: musculation, running: course, hyrox, crosstraining: crossTraining };

export function SportIcon({ sport, label = true }: { sport: SportKey; label?: boolean }) {
  return (
    <span className="r-sport-icon" data-sport={sport} {...(label ? { role: 'img', 'aria-label': SPORT_NAMES[sport] } : { 'aria-hidden': true })}>
      <img src={SPORT_ICONS[sport]} alt="" draggable={false} />
    </span>
  );
}
