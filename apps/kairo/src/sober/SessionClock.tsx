import { sessionElapsedS } from '@hybridsport/app-core';
import type { ProgrammeLog } from '@hybridsport/app-core';
import { formatChrono } from '../running/duration.js';
import { PlayPauseIcon } from './PlayPauseIcon.js';
import { useAlignedSecond } from './useAlignedSecond.js';

/**
 * V3.1 — chronomètre GLOBAL de séance (en-tête fixe). Valeur toujours recalculée depuis le journal persistant
 * (`sessionElapsedS` : début, pauses) ; ce composant se rafraîchit seul, une fois par seconde affichée, sans re-rendre
 * la séance entière. Aucun second mécanisme temporel : pause / reprise restent les actions d'app-core.
 */
export function SessionClock({ log, now, onToggle }: { log: ProgrammeLog; now: () => string; onToggle: () => void }) {
  const paused = log.clock?.pausedAt !== undefined;
  // floor((maintenant − début) / 1 s − pauses) change aux multiples d'une seconde après « début + pauses ».
  useAlignedSecond(paused ? null : Date.parse(log.startedAt) + (log.clock?.pausedS ?? 0) * 1000, () => Date.parse(now()));
  const elapsed = sessionElapsedS(log, now());
  return <>
    <span className="k-elapsed" role="timer" aria-label="Chronomètre global" aria-live="off" data-session-clock data-elapsed-s={elapsed} data-paused={paused ? 'true' : 'false'}>{formatChrono(elapsed)} <small>{paused ? 'en pause' : 'écoulé'}</small></span>
    <button className="v31-clock-toggle" aria-label={paused ? 'Reprendre le chronomètre global' : 'Mettre en pause le chronomètre global'} onClick={onToggle}><PlayPauseIcon paused={paused}/></button>
  </>;
}
