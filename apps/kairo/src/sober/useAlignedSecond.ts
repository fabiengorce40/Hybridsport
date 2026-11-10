import { useEffect, useRef, useState } from 'react';

// technical-constant: marge (ms) après la frontière de seconde, pour que la nouvelle valeur soit déjà atteinte
const BOUNDARY_SLACK_MS = 15;
// technical-constant: une seconde (ms)
const SECOND_MS = 1000;

/**
 * Rafraîchissement d'AFFICHAGE d'un chronomètre persistant, aligné sur les changements de seconde.
 * `phaseMs` : instant (ms depuis l'époque) dont les multiples d'une seconde marquent exactement les changements de la
 * valeur affichée (échéance du repos, début de séance + pauses) ; `null` : rien à rafraîchir (pause, aucun repos).
 * Le temps n'est JAMAIS compté ici : chaque rendu recalcule la valeur depuis la référence persistante. Un seul rendu par
 * seconde affichée, au bon instant ; resynchronisation immédiate au retour au premier plan (verrouillage, onglet).
 */
export function useAlignedSecond(phaseMs: number | null, nowMs: () => number): void {
  const [, setTick] = useState(0);
  const clock = useRef(nowMs);
  clock.current = nowMs;
  useEffect(() => {
    if (phaseMs === null || !Number.isFinite(phaseMs)) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const into = (((clock.current() - phaseMs) % SECOND_MS) + SECOND_MS) % SECOND_MS;
      timer = setTimeout(() => { setTick((x) => x + 1); schedule(); }, SECOND_MS - into + BOUNDARY_SLACK_MS);
    };
    const resync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setTick((x) => x + 1);
      schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('pageshow', resync);
    window.addEventListener('focus', resync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('pageshow', resync);
      window.removeEventListener('focus', resync);
    };
  }, [phaseMs]);
}
