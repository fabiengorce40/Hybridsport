/**
 * REKKA V2 — ILLUSTRATIONS PROVISOIRES VECTORIELLES ORIGINALES (lot V2-2B), générées en SVG (aucune image, aucune
 * requête réseau). Elles posent l'ambiance de la planche (ciel violet-magenta, soleil, ville néon, pagode, reflets,
 * végétation ; montagnes pour le Profil) SANS en reprendre les peintures : il n'y a ni personnage ni rendu peint. Les
 * illustrations finales restent à livrer (`public/rekka-v2/art/home-hero.webp`, `profile-hero.webp`) ; voir
 * l'inventaire des assets. Aucun texte ni élément d'interface n'est incrusté dans l'image.
 */
import { useId, useMemo } from 'react';

/** Générateur pseudo-aléatoire déterministe (même dessin à chaque rendu, captures stables). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const WINDOW_COLORS = ['#39ddeb', '#ff438b', '#ffe35a', '#dcff35', '#8b5cf6'];

interface Building { x: number; w: number; h: number; windows: { x: number; y: number; c: string }[]; antenna: boolean; neon: string }

function city(seed: number, from: number, to: number, base: number): Building[] {
  const r = rng(seed);
  const out: Building[] = [];
  let x = from;
  while (x < to) {
    const w = 10 + Math.floor(r() * 18);
    const h = 40 + Math.floor(r() * 150);
    const windows: Building['windows'] = [];
    for (let wy = base - h + 8; wy < base - 6; wy += 7) {
      for (let wx = x + 2; wx < x + w - 2; wx += 4) if (r() < 0.32) windows.push({ x: wx, y: wy, c: WINDOW_COLORS[Math.floor(r() * WINDOW_COLORS.length)] ?? '#39ddeb' });
    }
    out.push({ x, w, h, windows, antenna: r() < 0.3, neon: WINDOW_COLORS[Math.floor(r() * 3)] ?? '#39ddeb' });
    x += w + 1 + Math.floor(r() * 4);
  }
  return out;
}

function foliage(seed: number, n: number, y0: number, spread: number): { x: number; y: number; r: number; a: number; hi: boolean }[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r() * 400, y: y0 + r() * spread, r: 6 + r() * 14, a: -60 + r() * 120, hi: r() < 0.3 }));
}

export function Scene({ variant = 'city', label }: { variant?: 'city' | 'mountain'; label: string }) {
  const id = useId().replace(/:/g, '');
  const W = 400;
  const H = 460;
  const horizon = variant === 'city' ? 300 : 280;
  const buildings = useMemo(() => (variant === 'city' ? city(7, 120, 400, horizon) : []), [variant, horizon]);
  const far = useMemo(() => (variant === 'city' ? city(21, 60, 400, horizon - 6).map((b) => ({ ...b, h: b.h * 0.6, windows: [] })) : []), [variant, horizon]);
  const leaves = useMemo(() => foliage(variant === 'city' ? 3 : 11, 140, horizon + 34, 150), [variant, horizon]);
  const stars = useMemo(() => { const r = rng(5); return Array.from({ length: 40 }, () => ({ x: r() * W, y: r() * 150, o: 0.3 + r() * 0.7 })); }, []);
  return (
    <svg className="p-scene" viewBox={`0 0 ${String(W)} ${String(H)}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} data-placeholder="illustration">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          {variant === 'city' ? (<>
            <stop offset="0" stopColor="#1a0b4a" /><stop offset="0.38" stopColor="#5a1fa8" /><stop offset="0.62" stopColor="#c43c9e" /><stop offset="0.8" stopColor="#ff7a7a" /><stop offset="0.92" stopColor="#ffb86b" />
          </>) : (<>
            <stop offset="0" stopColor="#0d2a4a" /><stop offset="0.45" stopColor="#2b5f8a" /><stop offset="0.75" stopColor="#7cc4c9" /><stop offset="0.95" stopColor="#f3d9a0" />
          </>)}
        </linearGradient>
        <radialGradient id={`sun${id}`}>
          <stop offset="0" stopColor="#fff3b0" /><stop offset="0.45" stopColor="#ffe35a" /><stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`water${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={variant === 'city' ? '#ff7aa8' : '#7cc4c9'} stopOpacity="0.75" /><stop offset="0.5" stopColor={variant === 'city' ? '#5a1fa8' : '#1d4f6e'} stopOpacity="0.8" /><stop offset="1" stopColor="#071827" />
        </linearGradient>
        <linearGradient id={`bld${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a8a" /><stop offset="1" stopColor="#0d1240" />
        </linearGradient>
        <linearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#071827" stopOpacity="0" /><stop offset="1" stopColor="#071827" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky${id})`} />
      {stars.map((s, i) => <circle key={`s${String(i)}`} cx={s.x} cy={s.y} r={0.9} fill="#f3f8fc" opacity={s.o} />)}
      <circle cx={variant === 'city' ? 318 : 290} cy={variant === 'city' ? 168 : 120} r={variant === 'city' ? 70 : 54} fill={`url(#sun${id})`} />
      <circle cx={variant === 'city' ? 318 : 290} cy={variant === 'city' ? 168 : 120} r={variant === 'city' ? 30 : 22} fill="#ffe9a0" opacity="0.95" />
      {/* Nuages */}
      <g fill="#ff9ed0" opacity="0.45">
        <ellipse cx="80" cy="96" rx="70" ry="10" /><ellipse cx="250" cy="70" rx="90" ry="9" /><ellipse cx="190" cy="132" rx="60" ry="7" />
      </g>
      {variant === 'mountain' ? (<>
        <path d={`M0 ${String(horizon)} L60 170 L95 200 L150 110 L205 190 L250 150 L320 230 L360 180 L400 220 L400 ${String(horizon)} Z`} fill="#24507a" />
        <path d="M150 110 L140 130 L150 125 L160 134 L165 122 Z M60 170 L54 181 L62 178 L68 184 Z" fill="#e8f4fb" opacity="0.85" />
        <path d={`M0 ${String(horizon)} L40 230 L90 250 L140 210 L200 255 L260 225 L330 260 L400 240 L400 ${String(horizon)} Z`} fill="#16405e" />
        {/* Ruine en arche (fantasy) */}
        <g fill="#0f2f45" opacity="0.95"><rect x="300" y="196" width="10" height="70" /><rect x="342" y="196" width="10" height="70" /><path d="M296 200 Q326 160 356 200 L350 204 Q326 172 302 204 Z" /></g>
      </>) : (<>
        <path d={`M0 ${String(horizon)} L0 220 L40 200 L80 228 L120 ${String(horizon)} Z`} fill="#3b1a78" opacity="0.8" />
        {far.map((b, i) => <rect key={`f${String(i)}`} x={b.x} y={horizon - 6 - b.h} width={b.w} height={b.h} fill="#4a2b9a" opacity="0.55" />)}
        {buildings.map((b, i) => (
          <g key={`b${String(i)}`}>
            <rect x={b.x} y={horizon - b.h} width={b.w} height={b.h} fill={`url(#bld${id})`} />
            <rect x={b.x} y={horizon - b.h} width={b.w} height={1.5} fill={b.neon} opacity="0.9" />
            {b.antenna && <line x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={horizon - b.h} y2={horizon - b.h - 14} stroke={b.neon} strokeWidth="1" />}
            {b.windows.map((w, k) => <rect key={k} x={w.x} y={w.y} width={2} height={2.5} fill={w.c} opacity="0.85" />)}
          </g>
        ))}
        {/* Pagode (fantasy) et lanterne */}
        <g fill="#1d0f45">
          <rect x="62" y="236" width="26" height="64" /><path d="M50 240 L100 240 L90 228 L60 228 Z" /><path d="M54 222 L96 222 L86 212 L64 212 Z" /><path d="M58 206 L92 206 L80 194 L70 194 Z" /><rect x="74" y="182" width="2" height="12" />
        </g>
        <circle cx="75" cy="250" r="3" fill="#ffe35a" /><circle cx="75" cy="250" r="9" fill="#ffe35a" opacity="0.25" />
      </>)}
      {/* Eau et reflets */}
      <rect x="0" y={horizon} width={W} height={70} fill={`url(#water${id})`} />
      {[8, 18, 30, 44].map((dy, i) => <rect key={`r${String(i)}`} x={100 + i * 37} y={horizon + dy} width={120 - i * 18} height={1.5} fill={WINDOW_COLORS[i] ?? '#39ddeb'} opacity="0.55" />)}
      <rect x="250" y={horizon + 4} width="70" height="3" fill="#ffe9a0" opacity="0.55" />
      {/* Premier plan : rochers et végétation, touches néon */}
      <path d={`M0 ${String(horizon + 60)} Q90 ${String(horizon + 40)} 160 ${String(horizon + 66)} T400 ${String(horizon + 56)} L400 ${String(H)} L0 ${String(H)} Z`} fill="#0b2a3a" />
      {/* Feuillage : feuilles effilées orientées (ellipses), quelques reflets néon sur la tranche. */}
      {leaves.map((l, i) => <ellipse key={`l${String(i)}`} cx={l.x} cy={l.y} rx={l.r} ry={l.r * 0.32} transform={`rotate(${l.a.toFixed(0)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`} fill={l.hi ? '#1f6b3a' : i % 3 === 0 ? '#0a3326' : '#0f4231'} />)}
      {leaves.filter((l) => l.hi).map((l, i) => <ellipse key={`h${String(i)}`} cx={l.x} cy={l.y - l.r * 0.12} rx={l.r * 0.8} ry={1} transform={`rotate(${l.a.toFixed(0)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`} fill="#dcff35" opacity="0.6" />)}
      <rect width={W} height={H} fill={`url(#fade${id})`} />
    </svg>
  );
}
