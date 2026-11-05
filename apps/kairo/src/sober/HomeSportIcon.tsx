/** Home-only artwork: no change to the canonical discipline icons used elsewhere. */
import type { SportKey } from '../design/SportIcon.js';
import { SPORT_NAMES } from '../design/SportIcon.js';
import strength from './assets/home-sports/strength.svg';
import running from './assets/home-sports/running.svg';
import hyrox from './assets/home-sports/hyrox.svg';
import crosstraining from './assets/home-sports/crosstraining.svg';
export const HOME_SPORT_ICONS = { strength, running, hyrox, crosstraining } as const;
export function HomeSportIcon({ sport }: { sport: SportKey }) {
 const src = HOME_SPORT_ICONS[sport];
 return <span className="r-sport-icon rv-emblem" data-sport={sport} role="img" aria-label={SPORT_NAMES[sport]}><span className="r-sport-glyph" style={{ maskImage:`url("${src}")`, WebkitMaskImage:`url("${src}")` }}/></span>;
}
