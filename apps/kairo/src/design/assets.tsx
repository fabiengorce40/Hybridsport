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

export const NAV_ICONS = { accueil: icoAccueil, planning: icoPlanning, seances: icoSeances, progression: icoProgression, profil: icoProfil } as const;
export const UI_ICONS = { chrono: icoChrono, pause: icoPause, check: icoCheck, record: icoRecord } as const;
export const BADGES = { objectif: badgeObjectif, premiere: badgePremiere, record: badgeRecord, regularite: badgeRegularite } as const;
export type BadgeKey = keyof typeof BADGES;
export const DECORATIONS = { corner: decoCorner, grid: decoGrid, divider: decoDivider } as const;
/** Illustrations d'ambiance (WebP, sans texte ni interface) et leur texte alternatif. */
export const ART = {
  accueil: { src: artAccueil, alt: 'Ville néon cyberpunk sous une lune magenta', width: 1080, height: 720 },
  objectifs: { src: artObjectifs, alt: 'Montagnes au crépuscule et anneau lumineux', width: 1080, height: 720 },
  bilan: { src: artBilan, alt: 'Barre de musculation néon devant une ville la nuit', width: 1080, height: 720 },
} as const;
export type ArtKey = keyof typeof ART;

/** Logo REKKA (SVG en contours du kit). `variant` : néon (défaut), blanc, ou pictogramme compact. */
export function Logo({ variant = 'primary', className }: { variant?: 'primary' | 'white' | 'mark'; className?: string }) {
  const src = variant === 'white' ? logoWhite : variant === 'mark' ? logoMark : logoPrimary;
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
