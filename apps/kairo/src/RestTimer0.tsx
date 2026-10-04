/**
 * Chrono de repos Beta 0 : l'état (échéance horodatée, pause) est PERSISTÉ dans l'état applicatif (app-core) ; le
 * temps restant est RECALCULÉ à chaque affichage depuis l'heure courante. L'intervalle ne sert qu'au rafraîchissement
 * de l'affichage : navigation, verrouillage d'écran, rechargement ou re-rendu ne perdent rien.
 */
import { useEffect, useRef, useState } from 'react';
import { exerciseLabel, REST_EXTENSION_S, restRemainingS } from '@hybridsport/app-core';
import type { Rest } from '@hybridsport/app-core';

// technical-constant: rafraîchissement de l'affichage du chrono (ms), jamais une source de temps
const REFRESH_MS = 250;

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
  const mm = Math.floor(shown / 60);
  const ss = String(shown % 60).padStart(2, '0');
  const pct = rest.totalS > 0 ? Math.max(0, Math.min(100, (remaining / rest.totalS) * 100)) : 0;
  return (
    <div className="rest-timer rest0" role="timer" aria-live="off" aria-label="Chrono de repos">
      <div className="row" style={{ width: '100%', gap: 12 }}>
        <div className={`time num ${over ? 'over' : ''}`} aria-label={`${over ? 'Dépassé de' : 'Reste'} ${String(mm)} min ${ss} s`}>{over ? '+' : ''}{mm}:{ss}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small">{paused ? 'Repos en pause' : over ? 'Repos terminé' : 'Repos'}</div>
          <div className="tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseLabel(rest.exerciseId)}</div>
          <div className="bar"><div style={{ width: `${String(pct)}%` }} /></div>
        </div>
      </div>
      <div className="row" style={{ width: '100%', gap: 8 }}>
        <button className="btn secondary" style={{ flex: 1, padding: 0 }} aria-label={paused ? 'Reprendre le repos' : 'Mettre le repos en pause'} onClick={() => onAction(paused ? 'resume' : 'pause')}>{paused ? '▶ Reprendre' : '❚❚ Pause'}</button>
        <button className="btn secondary" style={{ flex: 1, padding: 0, whiteSpace: 'nowrap' }} aria-label={`Ajouter ${String(REST_EXTENSION_S)} secondes`} onClick={() => onAction('extend')}>+{REST_EXTENSION_S} s</button>
        <button className="btn primary" style={{ flex: 1, padding: 0 }} onClick={() => onAction('skip')}>{over ? 'OK' : 'Passer'}</button>
      </div>
    </div>
  );
}
