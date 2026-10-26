/**
 * REKKA V2 — logo TYPOGRAPHIQUE PROVISOIRE (lot V2-2B). Construit en SVG à partir de la police du projet (Barlow
 * Condensed 800, inclinée) avec un dégradé jaune électrique → jaune-vert néon et des entailles anguleuses : il évoque
 * le logo validé SANS le reproduire. Le logo final au pinceau (planche validée) reste une ressource graphique à
 * produire et à livrer en SVG dédié (`public/rekka-v2/brand/rekka-logo.svg`) ; voir l'inventaire des assets.
 */
import { useId } from 'react';

export function Wordmark({ size = 'l', tagline = true }: { size?: 'l' | 's'; tagline?: boolean }) {
  const id = useId().replace(/:/g, '');
  const w = 260;
  const h = tagline ? 132 : 96;
  return (
    <svg className={`p-wordmark-svg ${size}`} viewBox={`0 0 ${String(w)} ${String(h)}`} role="img" aria-label="REKKA 烈火, Nourris ta flamme. Logo provisoire" data-placeholder="logo">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe35a" />
          <stop offset="0.55" stopColor="#dcff35" />
          <stop offset="1" stopColor="#7dfc6a" />
        </linearGradient>
        {/* Entailles anguleuses (évocation du trait au pinceau) : bandes obliques soustraites aux lettres. */}
        <mask id={`m${id}`}>
          <rect width={w} height={h} fill="#fff" />
          <path d="M66 50 L100 43 L100.6 45 L67 52.4 Z M158 66 L200 56 L200.6 58 L159 68.4 Z M214 34 L246 27 L246.6 29 L215 36.4 Z" fill="#000" />
        </mask>
        <filter id={`f${id}`} x="-10%" y="-20%" width="120%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g mask={`url(#m${id})`} filter={`url(#f${id})`}>
        <text x="30" y="78" transform="skewX(-14)" fontFamily="'REKKA Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="800" fontSize="86" letterSpacing="-1" fill={`url(#g${id})`}>REKKA</text>
      </g>
      {/* Traînées de vitesse, décor. */}
      <path d="M4 86 L54 82 L53 84 L5 88 Z M204 22 L256 13 L255 15 L205 24 Z" fill="#dcff35" opacity="0.75" />
      <text x="168" y="104" fontSize="26" fontWeight="800" fill="#ff438b" fontFamily="'Noto Sans CJK JP', 'Noto Sans JP', 'Hiragino Sans', sans-serif">烈火</text>
      {tagline && <text x="34" y="126" transform="skewX(-10)" fontSize="19" fontWeight="600" fill="#f3f8fc" fontFamily="'REKKA Inter', system-ui, sans-serif">Nourris ta flamme.</text>}
    </svg>
  );
}
