/**
 * REKKA V2 — accès aux ressources graphiques du kit (`assets/rekka-v2/`, voir son README). Fichiers SVG / WebP importés
 * par Vite (jamais collés dans le JSX). Point UNIQUE de remplacement du logo une fois sa forme validée.
 */
import logoPrimary from '../assets/rekka-v2/logos/rekka-logo-primary.svg';
import logoWhite from '../assets/rekka-v2/logos/rekka-logo-white.svg';
import logoMark from '../assets/rekka-v2/logos/rekka-mark.svg';
import icoAccueil from '../assets/rekka-v2/icons/navigation/accueil.svg';
import icoPlanning from '../assets/rekka-v2/icons/navigation/planning.svg';
import icoSeances from '../assets/rekka-v2/icons/navigation/seances.svg';
import icoProgression from '../assets/rekka-v2/icons/navigation/progression.svg';
import icoProfil from '../assets/rekka-v2/icons/navigation/profil.svg';
import icoChrono from '../assets/rekka-v2/icons/navigation/chrono.svg';
import icoPause from '../assets/rekka-v2/icons/navigation/pause.svg';
import icoCheck from '../assets/rekka-v2/icons/navigation/check.svg';
import icoRecord from '../assets/rekka-v2/icons/navigation/record.svg';
import badgeObjectif from '../assets/rekka-v2/badges/objectif-atteint.svg';
import badgePremiere from '../assets/rekka-v2/badges/premiere-seance.svg';
import badgeRecord from '../assets/rekka-v2/badges/record-personnel.svg';
import badgeRegularite from '../assets/rekka-v2/badges/regularite.svg';
import decoCorner from '../assets/rekka-v2/decorations/corner-frame.svg';
import decoGrid from '../assets/rekka-v2/decorations/grid-pattern.svg';
import decoDivider from '../assets/rekka-v2/decorations/neon-divider.svg';
import artAccueil from '../assets/rekka-v2/illustrations/accueil-cyberpunk.webp';
import artObjectifs from '../assets/rekka-v2/illustrations/objectifs-rpg.webp';
import artBilan from '../assets/rekka-v2/illustrations/bilan-performance.webp';

/**
 * Ressources FINALES validées (V2-2C) : déposées dans `assets/rekka-v2/validated/` sous un nom fixe, elles remplacent
 * automatiquement la ressource provisoire du kit au prochain build, et l'étiquette « provisoire » disparaît. Tant que
 * le fichier manque, la ressource du kit reste affichée ET signalée comme provisoire (jamais présentée comme finale).
 */
const VALIDATED: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../assets/rekka-v2/validated/*.{svg,webp}', { eager: true, query: '?url', import: 'default' }))
    .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]),
);
/** Fichiers finals attendus (nom exact dans `validated/`). */
export const FINAL_ASSETS = { logo: 'rekka-logo.svg', homeHero: 'accueil-hero.webp' } as const;
export type FinalAssetKey = keyof typeof FINAL_ASSETS;
export interface ResolvedAsset { src: string; validated: boolean }
/** Choisit la ressource validée si elle existe, sinon la ressource provisoire (fonction pure, testable). */
export function resolveAsset(validated: Readonly<Record<string, string>>, key: FinalAssetKey, fallback: string): ResolvedAsset {
  const v = validated[FINAL_ASSETS[key]];
  return v ? { src: v, validated: true } : { src: fallback, validated: false };
}
export const LOGO_ASSET: ResolvedAsset = resolveAsset(VALIDATED, 'logo', logoPrimary);
export const HOME_HERO_ASSET: ResolvedAsset = resolveAsset(VALIDATED, 'homeHero', artAccueil);
/** Ressources finales encore manquantes (affichées comme provisoires). */
export const MISSING_FINAL_ASSETS: readonly FinalAssetKey[] = (Object.keys(FINAL_ASSETS) as FinalAssetKey[]).filter((k) => !VALIDATED[FINAL_ASSETS[k]]);

export const NAV_ICONS = { accueil: icoAccueil, planning: icoPlanning, seances: icoSeances, progression: icoProgression, profil: icoProfil } as const;
export const UI_ICONS = { chrono: icoChrono, pause: icoPause, check: icoCheck, record: icoRecord } as const;
export const BADGES = { objectif: badgeObjectif, premiere: badgePremiere, record: badgeRecord, regularite: badgeRegularite } as const;
export type BadgeKey = keyof typeof BADGES;
export const DECORATIONS = { corner: decoCorner, grid: decoGrid, divider: decoDivider } as const;
/** Illustrations d'ambiance (WebP, sans texte ni interface) et leur texte alternatif. */
export const ART = {
  accueil: HOME_HERO_ASSET.validated
    ? { src: HOME_HERO_ASSET.src, alt: 'Univers REKKA : ville néon et nature fantastique', width: 1080, height: 1200 }
    : { src: artAccueil, alt: 'Ville néon cyberpunk sous une lune magenta', width: 1080, height: 720 },
  objectifs: { src: artObjectifs, alt: 'Montagnes au crépuscule et anneau lumineux', width: 1080, height: 720 },
  bilan: { src: artBilan, alt: 'Barre de musculation néon devant une ville la nuit', width: 1080, height: 720 },
} as const;
export type ArtKey = keyof typeof ART;

/** Logo REKKA : logo FINAL validé s'il est déposé, sinon proposition du kit. `variant` : néon (défaut), blanc, compact. */
export function Logo({ variant = 'primary', className }: { variant?: 'primary' | 'white' | 'mark'; className?: string }) {
  const src = variant === 'white' ? logoWhite : variant === 'mark' ? logoMark : LOGO_ASSET.src;
  return <img className={className} src={src} alt="REKKA" draggable={false} />;
}

/**
 * Pictogramme `currentColor` : le fichier SVG sert de MASQUE, la couleur vient du CSS (`color`). Décoratif par défaut ;
 * un `label` en fait une image nommée.
 */
export function MaskIcon({ src, label, className = '' }: { src: string; label?: string; className?: string }) {
  const style = { WebkitMaskImage: `url("${src}")`, maskImage: `url("${src}")` };
  return label
    ? <span className={`r-mask-icon ${className}`} style={style} role="img" aria-label={label} />
    : <span className={`r-mask-icon ${className}`} style={style} aria-hidden="true" />;
}

/**
 * Illustration d'ambiance : `<img>` en `object-fit: cover` dans un cadre au fond dégradé (REPLI si l'image ne charge
 * pas), voile de lisibilité géré par le conteneur. Jamais de texte ni de commande dans l'image.
 */
export function ArtImage({ art, eager = false, className = '' }: { art: ArtKey; eager?: boolean; className?: string }) {
  const a = ART[art];
  return (
    <img className={`r-art ${className}`} src={a.src} alt={a.alt} width={a.width} height={a.height} loading={eager ? 'eager' : 'lazy'} decoding="async"
      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
  );
}
