/**
 * REKKA V2 — bandeau d'ambiance du prototype (lot V2-2B) : illustration WebP du kit (`ArtImage`, `object-fit: cover`)
 * dans un cadre au fond dégradé qui sert de REPLI si l'image ne charge pas, puis voile de lisibilité. Purement
 * décoratif au sens de l'interface : aucun texte ni commande dans l'image, le contenu est posé AU-DESSUS en HTML.
 */
import { ArtImage } from '../../src/design/assets.js';
import type { ArtKey } from '../../src/design/assets.js';

export function Ambience({ art, eager = false, validated = false }: { art: ArtKey; eager?: boolean; validated?: boolean }) {
  return (
    <div className="p-ambience" data-art={art} data-validated={validated}>
      <ArtImage art={art} eager={eager} />
      <span className="p-ambience-veil" aria-hidden="true" />
    </div>
  );
}
