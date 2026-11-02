# REKKA V2 — ressources graphiques (kit `REKKA_V2_ASSETS`, version 1.0 du 26/10/2026)

Ressources fournies par le propriétaire du projet, copiées telles quelles (aucun fichier modifié). Les références
PNG du kit (planche validée, maquettes) ne sont **pas** copiées ici : ce sont des références de composition, jamais
des ressources d'interface.

| Dossier | Contenu | Usage |
|---|---|---|
| `logos/` | `rekka-logo-primary.svg` (dégradé néon), `-white`, `-dark`, `rekka-mark.svg`, `rekka-kanji-symbol.svg` | Logo d'en-tête via `design/assets.ts` (`Logo`), remplaçable en un point. **Forme à valider** (proposition vectorielle de travail, pas l'extraction du logo au pinceau de la planche). Le symbole « kanji » est une interprétation stylisée, **pas** une calligraphie de 烈火 : le texte 烈火 reste en police. |
| `icons/sports/` | 4 pictogrammes de discipline (couleur fixe) | `SportIcon`, toujours avec un nom accessible |
| `icons/navigation/` | 9 pictogrammes `currentColor` | Barre de navigation, chronomètre, pause, validation, records (`MaskIcon`) |
| `badges/` | 4 badges de jalons | Jalons RPG modérés — en production, uniquement sur données réelles vérifiées |
| `decorations/` | cadre d'angle, grille, séparateur néon, barre de quête | Décor facultatif, faible opacité, jamais sur un texte ou une commande |
| `illustrations/` | `accueil-cyberpunk.webp`, `objectifs-rpg.webp`, `bilan-performance.webp` | Bandeaux d'ambiance (`object-fit: cover`, voile de lisibilité, `alt`, repli CSS). **Premières ressources autonomes, géométriques** : à comparer à l'art illustré de la planche avant validation définitive. |
| `palette.json` | Palette du kit | Référence (identique aux jetons `rekka-v2.css`, plus `green #83F45A`) |
