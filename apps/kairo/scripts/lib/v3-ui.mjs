/**
 * Aides E2E pour le rendu V3 de la BÊTA (`VITE_REKKA_VISUAL=v3`). Sans effet sur l'ancien rendu :
 * - le chronomètre global et « Terminer la séance » sont dans le menu « ⋮ Commandes de séance » (dialogue modal) ;
 * - la saisie d'une série se fait dans l'éditeur de la série choisie ;
 * - l'export / import est dans le panneau « Données & sauvegardes » du Profil.
 * Les assertions des scripts restent inchangées : seuls les accès aux contrôles déplacés sont adaptés.
 */
export const isV3 = async (page) => (await page.locator('[data-live-workout="v3"]').count()) > 0;

const menuButton = (page) => page.getByRole('button', { name: 'Commandes de séance', exact: true });

/** Ouvre le menu de séance V3 (no-op sur l'ancien rendu ou s'il est déjà ouvert). */
export async function openCommands(page) {
  const m = menuButton(page);
  if (await m.count() && (await m.getAttribute('aria-expanded')) !== 'true') await m.click();
}

/** Ferme le menu de séance V3 (no-op s'il est fermé). */
export async function closeCommands(page) {
  const m = menuButton(page);
  if (await m.count() && (await m.getAttribute('aria-expanded')) === 'true') {
    await page.getByRole('dialog', { name: 'Commandes de séance' }).getByRole('button', { name: 'Fermer le message', exact: true }).click();
  }
}

/** Bouton de séance qui peut se trouver dans le menu V3 (« Terminer la séance », pause du chronomètre global…). */
export async function sessionCommand(page, name) {
  const b = page.getByRole('button', { name, exact: true });
  if (!(await b.count()) || !(await b.first().isVisible())) await openCommands(page);
  return b.first();
}

/**
 * Ligne de la prochaine série à valider (`filter` : sélecteur CSS supplémentaire de l'ancien rendu, ex. `:not(.warm)`).
 * En V3, la série est choisie pour afficher son éditeur (charge, répétitions) ; le menu est refermé auparavant.
 */
export async function nextSetLine(page, { scope = page, legacy = '.k-set', workOnly = false } = {}) {
  const cocher = page.getByRole('button', { name: 'Cocher la série', exact: true });
  if (await isV3(page)) {
    await closeCommands(page);
    const sel = workOnly ? '.v3-exercise:not([hidden]) .v3-set:not([data-set-kind="rampup"])' : '.v3-exercise:not([hidden]) .v3-set';
    const line = scope.locator(sel).filter({ has: cocher }).first();
    if ((await line.locator('.v3-set-editor').count()) === 0) await line.locator('.v3-series-select').click();
    return line;
  }
  return scope.locator(legacy).filter({ has: cocher }).first();
}

/** Ouvre le panneau du Profil qui contient `name` (V3 : « Données & sauvegardes »). */
export async function openProfilePanel(page, entry = /Données & sauvegardes/) {
  const e = page.getByRole('button', { name: entry });
  if (await e.count()) await e.first().click();
}
