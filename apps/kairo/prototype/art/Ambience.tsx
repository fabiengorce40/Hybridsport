/** Standalone anime artwork behind HTML content, isolated from production assets. */
import { VISUAL_ART } from './visual-assets.js';
import type { ArtKey } from '../../src/design/assets.js';

export function Ambience({ art, eager = false }: { art: ArtKey; eager?: boolean }) {
  return (
    <div className="p-ambience" data-art={art}>
      <img className="r-art" src={VISUAL_ART[art].src} alt={VISUAL_ART[art].alt} width={1600} height={900} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      <span className="p-ambience-veil" aria-hidden="true" />
    </div>
  );
}
