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

export function RestTimer0({ rest, now, onAction }: { rest: Rest | null; now: () => string; onAction: (a: 'pause' | 'resume' | 'extend' | 'skip') => void }) {
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
