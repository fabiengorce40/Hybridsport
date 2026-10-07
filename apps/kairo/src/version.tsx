/**
 * Version de l'application réellement exécutée (identifiant de build injecté à la compilation) et détection d'une
 * version plus récente publiée (`version.json` écrit par le déploiement). Aucune donnée utilisateur n'est touchée :
 * la mise à jour recharge seulement l'application (le service worker sert alors la nouvelle page).
 */
import { useEffect, useState } from 'react';

declare const __KAIRO_BUILD__: string | undefined;
declare const __KAIRO_BUILD_DATE__: string | undefined;

/** Commit (7 caractères) de la build en cours d'exécution ; `dev` hors build de déploiement. */
export const BUILD_ID: string = typeof __KAIRO_BUILD__ === 'string' && __KAIRO_BUILD__.length > 0 ? __KAIRO_BUILD__ : 'dev';
/** Date de la build (horodatage de compilation) ; null hors build (tests). */
export const BUILD_DATE: string | null = typeof __KAIRO_BUILD_DATE__ === 'string' && __KAIRO_BUILD_DATE__.length > 0 ? __KAIRO_BUILD_DATE__ : null;
// technical-constant: longueur d'un identifiant de commit abrégé (affichage)
const SHORT = 7;

/** Version publiée (version.json, jamais servie depuis un cache) ; null si indisponible (hors ligne, build locale). */
export async function publishedBuild(): Promise<string | null> {
  try {
    const r = await fetch('./version.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { commit?: unknown };
    return typeof j.commit === 'string' && j.commit.length >= SHORT ? j.commit.slice(0, SHORT) : null;
  } catch {
    return null;
  }
}

/** Version publiée différente de la build exécutée (vérifiée au lancement et au retour au premier plan). */
export function useUpdateAvailable(): string | null {
  const [latest, setLatest] = useState<string | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || BUILD_ID === 'dev') return undefined;
    let alive = true;
    const check = () => { void publishedBuild().then((v) => { if (alive) setLatest(v !== null && v !== BUILD_ID ? v : null); }); };
    check();
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return latest;
}

/** Mise à jour : nouveau service worker demandé, puis rechargement (la page est servie depuis le réseau). */
export async function applyUpdate(): Promise<void> {
  try { await (await navigator.serviceWorker?.getRegistration())?.update(); } catch { /* hors ligne : rechargement simple */ }
  window.location.reload();
}

export function UpdateBanner() {
  const latest = useUpdateAvailable();
  if (!latest) return null;
  return (
    <div className="notice info" role="alert" style={{ margin: 12 }}>
      <div className="row between">
        <span>Nouvelle version de KAIRO disponible</span>
        <button className="btn primary" onClick={() => { void applyUpdate(); }}>Mettre à jour</button>
      </div>
    </div>
  );
}
