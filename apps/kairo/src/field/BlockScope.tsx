/**
 * FIELD TEST P0 — présentation HONNÊTE de la portée d'une prescription Cross-training / HYROX : quand le moteur ne
 * compose que le bloc principal (`TRAINING_BLOCK`, blocs non générés tracés dans le contrat), l'interface le dit et ne
 * présente jamais la durée du bloc comme la durée d'une séance complète. Aucune durée ni aucun contenu ajouté.
 */
import type { CompositionScope } from '@hybridsport/app-core';

const PART: Readonly<Record<string, string>> = { warmup: 'l’échauffement', cooldown: 'le retour au calme' };

/** Blocs non générés, en clair (ex. « l’échauffement et le retour au calme »). */
export function missingText(c: CompositionScope): string {
  const xs = c.notGenerated.map((k) => PART[k] ?? 'le reste de la séance');
  return xs.length === 0 ? 'le reste de la séance' : xs.length === 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} et ${xs.at(-1) ?? ''}`;
}

export const isBlock = (c: CompositionScope | null | undefined): boolean => c?.scope === 'TRAINING_BLOCK';

/** Ligne courte des cartes (planning, accueil). */
export const blockCardText = 'Bloc d’entraînement : pas une séance complète';

/** Avertissement dans la séance (en tête du bloc). */
export function BlockNotice({ c }: { c: CompositionScope | null }) {
  if (!c || !isBlock(c)) return null;
  return (
    <div className="k-block-note" role="note" data-block-scope="TRAINING_BLOCK">
      <strong>Bloc principal uniquement</strong>
      <span>KAIRO ne dispose pas encore de règles validées pour composer automatiquement {missingText(c)} : seul ce bloc est prescrit. Sa durée n’est pas celle d’une séance complète.</span>
    </div>
  );
}
