/**
 * Chronomètre de repos flottant, fondé sur des horodatages (juste même si l'écran se met en veille).
 * La durée affichée est celle PRESCRITE par le moteur pour la série cochée (`restAfterS`).
 */
import { useEffect, useState } from 'react';

export interface RestState { readonly endsAt: number; readonly totalS: number; readonly label: string }

export function RestTimer({ rest, onChange }: { rest: RestState | null; onChange: (r: RestState | null) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!rest) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest]);
  const remaining = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
  useEffect(() => {
    if (rest && remaining === 0 && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
  }, [rest, remaining]);
  if (!rest) return null;
  const over = remaining <= 0;
  const shown = Math.abs(remaining);
  const mm = Math.floor(shown / 60);
  const ss = String(shown % 60).padStart(2, '0');
  const pct = Math.max(0, Math.min(100, (remaining / rest.totalS) * 100));
  return (
    <div className="rest-timer" role="timer" aria-live="polite" aria-label="Chrono de repos">
      <div className={`time ${over ? 'over' : ''}`}>{over ? '+' : ''}{mm}:{ss}</div>
      <div style={{ flex: 1 }}>
        <div className="small">{over ? 'Repos terminé' : 'Repos'}</div>
        <div className="tiny">{rest.label}</div>
        <div className="bar"><div style={{ width: `${String(pct)}%` }} /></div>
      </div>
      <button className="btn ghost" style={{ padding: '0 10px' }} onClick={() => onChange({ ...rest, endsAt: rest.endsAt + 15_000, totalS: rest.totalS + 15 })}>+15 s</button>
      <button className="btn secondary" style={{ padding: '0 14px' }} onClick={() => onChange(null)}>{over ? 'OK' : 'Passer'}</button>
    </div>
  );
}
