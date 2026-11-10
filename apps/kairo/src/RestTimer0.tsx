import { SOBER_V3 } from './sober/flag.js';
import { RecoveryBrush } from './sober/Artwork.js';
/**
 * Chrono de repos Beta 0 (KAIRO Design System) : l'état (échéance horodatée, pause) est PERSISTÉ dans l'état applicatif
 * (app-core) ; le temps restant est RECALCULÉ à chaque affichage depuis l'heure courante. L'intervalle ne sert qu'au
 * rafraîchissement de l'affichage : navigation, verrouillage d'écran, rechargement ou re-rendu ne perdent rien.
 */
import { useEffect, useRef, useState } from 'react';
import { exerciseLabel, REST_EXTENSION_S, restRemainingS } from '@hybridsport/app-core';
import type { Rest } from '@hybridsport/app-core';

// technical-constant: rafraîchissement de l'affichage du chrono (ms), jamais une source de temps
const REFRESH_MS = 250;
// technical-constant: géométrie de l'anneau (rayon SVG)
const R = 32;
const CIRC = 2 * Math.PI * R;

export function RestTimer0({ rest, now, onAction, layout='compact' }: { layout?: 'large'|'compact'; rest: Rest | null; now: () => string; onAction: (a: 'pause' | 'resume' | 'extend' | 'skip') => void }) {
  const [, setTick] = useState(0);
  const buzzed = useRef<string | null>(null);
  useEffect(() => {
    if (!rest || rest.pausedRemainingS !== undefined) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, [rest]);
  if (!rest) return null;
  const remaining = restRemainingS(rest, now());
  const paused = rest.pausedRemainingS !== undefined;
  const over = remaining <= 0;
  if (over && !paused && buzzed.current !== rest.endsAt) {
    buzzed.current = rest.endsAt;
    if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
  }
  const shown = Math.abs(remaining);
  const mm = String(Math.floor(shown / 60)).padStart(2, '0');
  const ss = String(shown % 60).padStart(2, '0');
  const frac = rest.totalS > 0 ? Math.max(0, Math.min(1, remaining / rest.totalS)) : 0;
  if (SOBER_V3) {
    const label = paused ? 'Repos en pause' : over ? 'Repos terminé' : 'Repos';
    // The original brush is revealed clockwise in proportion to the remaining prescribed rest.
    // The timer deadline, pause and extension are still owned exclusively by app-core.
    const angle = Math.round(frac * 36000) / 100;
    const mask = `conic-gradient(#000 0deg ${angle}deg, transparent ${angle}deg 360deg)`;
    return <section className={`k-rest rw-rest v3-rest v3-rest--${layout} v31-rest`}
      data-paused={paused} data-over={over} data-rest-fraction={frac.toFixed(3)}
      role="timer" aria-live="off" aria-label="Chrono de repos">
      <div className="v31-rest-main">
        <div className="v3-rest-orbit v31-rest-orbit">
          <svg className="v31-rest-track" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43"/></svg>
          <div className="v31-rest-progress" style={{ WebkitMaskImage: mask, maskImage: mask }}>
            <RecoveryBrush/>
          </div>
          <div className="v31-rest-readout">
            <small>{label}</small>
            <div className={`k-rest-time ${over ? 'over' : ''}`}
              aria-label={`${over ? 'Dépassé de' : 'Reste'} ${mm} min ${ss} s`}>
              {over ? '+' : ''}{Number(mm)}:{ss}
            </div>
            <button className="v31-rest-play" aria-label={paused ? 'Reprendre le repos' : 'Mettre le repos en pause'}
              onClick={() => onAction(paused ? 'resume' : 'pause')}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {paused ? <path d="M8 6L18 12L8 18Z"/> : <><rect x="7" y="6" width="3.5" height="12" rx="1"/><rect x="13.5" y="6" width="3.5" height="12" rx="1"/></>}
              </svg>
            </button>
          </div>
        </div>
        <div className="v31-rest-side">
          <button className="v31-rest-add" aria-label={`Ajouter ${REST_EXTENSION_S} secondes`}
            onClick={() => onAction('extend')}>+{REST_EXTENSION_S} s</button>
          <button className="v31-rest-skip" aria-label={over ? 'OK' : 'Passer'} onClick={() => onAction('skip')}>
            {over ? 'OK' : 'Passer'}
          </button>
        </div>
      </div>
      <span className="v31-rest-exercise">{exerciseLabel(rest.exerciseId)}</span>
    </section>;
  }
  return (
    <div className="k-rest" role="timer" aria-live="off" aria-label="Chrono de repos">
      <div className="k-rest-top">
        <div className={`k-ring ${over ? 'over' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 76 76"><circle className="track" cx="38" cy="38" r={R} /><circle className="value" cx="38" cy="38" r={R} strokeDasharray={CIRC} strokeDashoffset={over ? 0 : CIRC * (1 - frac)} /></svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="k-rest-label">{paused ? 'Repos en pause' : over ? 'Repos terminé' : 'REPOS'}</div>
          <div className={`k-rest-time ${over ? 'over' : ''}`} aria-label={`${over ? 'Dépassé de' : 'Reste'} ${mm} min ${ss} s`}>{over ? '+' : ''}{mm}:{ss}</div>
          <div className="k-rest-ex">{exerciseLabel(rest.exerciseId)}</div>
        </div>
      </div>
      <div className="k-rest-actions">
        <button aria-label={`Ajouter ${String(REST_EXTENSION_S)} secondes`} onClick={() => onAction('extend')}>+{REST_EXTENSION_S} s</button>
        <button aria-label={paused ? 'Reprendre le repos' : 'Mettre le repos en pause'} onClick={() => onAction(paused ? 'resume' : 'pause')}>{paused ? 'Reprendre' : 'Pause'}</button>
        <button className="primary" onClick={() => onAction('skip')}>{over ? 'OK' : 'Passer'}</button>
      </div>
    </div>
  );
}
