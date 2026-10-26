/**
 * REKKA V2 — pictogrammes de discipline (SVG originaux, trait 2 px, `currentColor`). Toujours accompagnés d'un nom
 * accessible : la discipline n'est jamais portée par la couleur seule.
 */
export type SportKey = 'strength' | 'running' | 'hyrox' | 'crosstraining';
export const SPORT_NAMES: Readonly<Record<SportKey, string>> = { strength: 'Musculation', running: 'Course', hyrox: 'HYROX', crosstraining: 'Cross-training' };

const PATHS: Readonly<Record<SportKey, string>> = {
  strength: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  running: 'M14 4.5a2 2 0 1 0 0-.01M9 21l2.5-6 3 2.5V21M6 12l3-4 4 1 3 3 3 1M11.5 15 9 11',
  hyrox: 'M12 3l7 4v10l-7 4-7-4V7zM12 8v8M8.5 10l7 4M15.5 10l-7 4',
  crosstraining: 'M13 2 5 13h6l-1 9 8-11h-6z',
};

export function SportIcon({ sport, label = true }: { sport: SportKey; label?: boolean }) {
  return (
    <span className="r-sport-icon" data-sport={sport} {...(label ? { role: 'img', 'aria-label': SPORT_NAMES[sport] } : { 'aria-hidden': true })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[sport]} /></svg>
    </span>
  );
}
