/**
 * REKKA V2 — bascule de thème (lot V2-1). `kairo` (défaut) : interface actuelle strictement inchangée ; `v2` : jetons et
 * polices REKKA V2 (`<html data-theme="v2">`). Choisi à la build (`VITE_REKKA_THEME=v2`) ; aucune donnée utilisateur,
 * aucun contrat de données concerné. Retour arrière : build sans la variable.
 */
export type Theme = 'kairo' | 'v2';
export const THEME: Theme = import.meta.env.VITE_REKKA_THEME === 'v2' ? 'v2' : 'kairo';

export function applyTheme(root: HTMLElement, theme: Theme = THEME): void {
  if (theme === 'v2') root.dataset.theme = 'v2';
  else delete root.dataset.theme;
}
