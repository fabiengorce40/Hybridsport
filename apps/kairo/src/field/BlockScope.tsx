/**
 * FIELD TEST P0 — présentation HONNÊTE de la portée d'une prescription Cross-training / HYROX : quand le moteur ne
 * compose que le bloc principal (`TRAINING_BLOCK`, blocs non générés tracés dans le contrat), l'interface le dit et ne
 * présente jamais la durée du bloc comme la durée d'une séance complète. Aucune durée ni aucun contenu ajouté.
 */
import type { CompositionScope } from '@hybridsport/app-core';

const PART: Readonly<Record<string, string>> = {
  warmup: 'l’échauffement', cooldown: 'le retour au calme', warmup_general: 'l’échauffement général', warmup_specific: 'l’échauffement spécifique',
  strength: 'le bloc de force', skill: 'le bloc technique', accessory: 'le travail complémentaire',
};

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
      <strong>{c.c4 ? C4_STATUS_TEXT[c.c4.status] ?? 'Bloc principal uniquement' : 'Bloc principal uniquement'}</strong>
      <span>KAIRO ne dispose pas encore de règles validées pour composer automatiquement {missingText(c)} : seul ce bloc est prescrit. Sa durée n’est pas celle d’une séance complète.</span>
    </div>
  );
}

/** C4 — séance Cross-training COMPLÈTE (expérimentale) : statut tracé FULL_SESSION et blocs présents dans la séance. */
export const isFullC4 = (c: CompositionScope | null | undefined): boolean => c?.c4?.status === 'FULL_SESSION';

/** C4 — libellés des statuts explicites (jamais présentés comme validés). */
export const C4_STATUS_TEXT: Readonly<Record<string, string>> = {
  FULL_SESSION: 'Séance complète expérimentale',
  MAIN_BLOCK_ONLY: 'Bloc principal uniquement',
  COMPOSITION_UNRESOLVED: 'Composition non résolue',
  BLOCKED: 'Prescription bloquée',
};

/** Blocs du plan NON composés par KAIRO, en clair (ex. « bloc technique, travail complémentaire »). */
export function c4MissingText(c: CompositionScope): string {
  const xs = (c.c4?.notGenerated ?? []).filter((k) => k !== 'warmup_specific').map((k) => PART[k] ?? k);
  return xs.join(', ');
}

/**
 * Ligne courte des cartes pour une séance complète C4 : complète SELON LE PLAN expérimental (blocs générés), jamais
 * présentée comme incluant les blocs non composés ; position de la durée ESTIMÉE (transitions comprises) / cible.
 */
/** C4.3 — parties composées, dans l'ordre de la séance (bloc de force délégué au moteur Musculation s'il est présent). */
const composedParts = (c: CompositionScope): string => (c.c4?.blocks.some((b) => b.block === 'strength') ? 'échauffement, bloc de force (moteur Musculation), bloc principal, retour au calme' : 'échauffement, bloc principal, retour au calme');

export function fullSessionCardText(c: CompositionScope): string {
  const missing = c4MissingText(c);
  const pos = c.c4?.estimatedPosition ?? c.c4?.target?.position;
  return `Séance complète expérimentale (selon le plan KAIRO non validé) : ${composedParts(c)}${missing ? ` · sans ${missing}` : ''}${pos === 'below' ? ' · plus courte que la cible 45–75 min (non complétée artificiellement)' : ''}`;
}

/** C4.1 — définition affichée dans la séance : ce que « complète » veut dire, et ce qui n'est PAS inclus. */
export function FullSessionDefinition({ c }: { c: CompositionScope | null }) {
  if (!c?.c4 || c.c4.status !== 'FULL_SESSION') return null;
  const missing = c4MissingText(c);
  return (
    <div className="k-block-note" role="note" data-c4-definition>
      <strong>Séance complète expérimentale</strong>
      <span>« Complète » signifie : tous les blocs du plan expérimental de KAIRO sont composés ({composedParts(c)}). Ce plan, ses durées et ses contenus ne sont pas validés scientifiquement.{missing ? ` Non inclus, faute de règles validées : ${missing}.` : ''}</span>
    </div>
  );
}
