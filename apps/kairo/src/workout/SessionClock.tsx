/**
 * RC5.4 — chronomètre GLOBAL de la séance (barre du haut, toujours visible) : temps écoulé calculé sur les horodatages
 * persistés (`sessionElapsedS`), jamais compté en mémoire ; il survit à la navigation, au verrouillage et au redémarrage.
 * Indépendant du chrono de repos. Pause MANUELLE de séance explicite (« Séance en pause »), distincte du repos.
 */
import { approxMinutes, sessionElapsedS } from '@hybridsport/app-core';
import type { ProgrammeLog } from '@hybridsport/app-core';

const two = (n: number): string => String(n).padStart(2, '0');
/** Temps écoulé au format chrono (h:mm:ss au-delà d'une heure, sinon m:ss). */
export function clockText(totalS: number): string {
  // technical-constant: secondes par heure / par minute (affichage)
  const h = Math.floor(totalS / 3600);
  // technical-constant: secondes par minute (affichage)
  const m = Math.floor((totalS % 3600) / 60);
  // technical-constant: secondes par minute (affichage)
  const s = totalS % 60;
  return h > 0 ? `${String(h)}:${two(m)}:${two(s)}` : `${String(m)}:${two(s)}`;
}

export function SessionClock({ log, now, plannedS, onPause, onResume }: {
  log: ProgrammeLog; now: string; plannedS: number | null; onPause: () => void; onResume: () => void;
}) {
  const elapsed = sessionElapsedS(log, now);
  const paused = log.clock?.pausedAt !== undefined;
  const finished = log.finishedAt !== undefined;
  return (
    <div className={`k-clock ${paused ? 'paused' : ''}`} data-session-clock data-elapsed-s={elapsed} data-paused={paused ? 'true' : 'false'}>
      <span className="k-clock-main" role="group" aria-label={`Temps de séance ${clockText(elapsed)}${paused ? ', séance en pause' : ''}`}>
        <span className="k-clock-label">{finished ? 'Durée' : paused ? 'Séance en pause' : 'Séance'}</span>
        <b className="num">{clockText(elapsed)}</b>
      </span>
      {plannedS !== null && <span className="k-clock-plan" data-planned-s={plannedS}>/ ≈ {approxMinutes(plannedS)}</span>}
      {!finished && (paused
        ? <button type="button" className="k-clock-btn" onClick={onResume} aria-label="Reprendre la séance après la pause">Reprendre</button>
        : <button type="button" className="k-clock-btn" onClick={onPause} aria-label="Mettre la séance en pause (hors repos)">Pause</button>)}
    </div>
  );
}
