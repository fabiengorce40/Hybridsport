/**
 * Saisie d'une durée par COMPOSANTS (heures, minutes, secondes), sans « : » à taper : chaque composant est un champ
 * numérique. Assemblage en secondes pour le contrat existant (`durationS`, `paceSecPerKm`). Aucune règle sportive.
 */
export interface DurationParts { readonly h: string; readonly m: string; readonly s: string }
export const EMPTY_DURATION: DurationParts = { h: '', m: '', s: '' };

export type DurationResult = { readonly ok: true; readonly seconds: number } | { readonly ok: false; readonly error: string };

/**
 * Durée assemblée. `withHours` : les minutes vont de 0 à 59 (les heures portent le reste) ; sinon les minutes ne sont
 * pas bornées (ex. 75 min). Secondes toujours 0–59 ; un composant vide vaut 0, mais au moins un composant est exigé.
 */
export function durationFromParts(p: DurationParts, withHours: boolean, label = 'le chrono'): DurationResult {
  const parts = withHours ? [p.h, p.m, p.s] : [p.m, p.s];
  if (parts.every((x) => x.trim() === '')) return { ok: false, error: `Indiquez ${label}.` };
  if (parts.some((x) => x.trim() !== '' && !/^\d+$/.test(x.trim()))) return { ok: false, error: 'Utilisez uniquement des chiffres.' };
  const [h, m, s] = [withHours ? Number(p.h || '0') : 0, Number(p.m || '0'), Number(p.s || '0')];
  if (s > 59) return { ok: false, error: 'Les secondes vont de 0 à 59.' };
  if (withHours && m > 59) return { ok: false, error: 'Les minutes vont de 0 à 59 (utilisez le champ heures).' };
  const seconds = h * 3600 + m * 60 + s;
  if (seconds <= 0) return { ok: false, error: `${label.charAt(0).toUpperCase()}${label.slice(1)} doit être supérieur à zéro.` };
  return { ok: true, seconds };
}

/** Affichage d'un chrono : « 45:00 », « 1:35:20 ». */
export function formatChrono(seconds: number): string {
  const t = Math.round(seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${String(h)}:${String(m).padStart(2, '0')}:${ss}` : `${String(m)}:${ss}`;
}
