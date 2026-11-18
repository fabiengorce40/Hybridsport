# REKKA V4 — Progression : première passe de finition

## Sources
Base locale : 86935687ec151b4c6d6a7074cf7e843dbae9bc79.
Séance directe archivée : ff1544c4f1e7341df4a25a756a89640c165daba7.
Première capture Progression : e24d5c208c825dff681bab617ba7112e2efe1876.
Seconde passe : 28aaee654fe0e8a825185984b5cb8f995f09bcbd.
Branche : codex/rekka-v4-progression-finition.

## Écarts identifiés et corrections
| Élément | Écart constaté | Correction |
| --- | --- | --- |
| En-tête | Trop d’espace vertical | Hauteur et marges réduites |
| Contenu | Double padding, largeur de 338 px à 390 | Un seul padding extérieur |
| Statistiques | Cartes hautes de 132 px et symboles dépendant du système | Tuiles compactes et SVG |
| Répartition | Carte de près de 159 px sur la première passe | Anneau et marges réduits |
| Graphique | Partie inférieure sous la navigation au chargement | Tableau de bord resserré, contenu complet accessible par défilement |
| Fixture | Invisible dans les builds compilés | Drapeau explicite de compilation et paramètre d’URL pour les seuls builds QA |
| Séance sans ± | Ancienne grille à 5 colonnes | Grille à quatre colonnes explicites, mêmes champs et validation |

## Données
Les calculs de progression, prescriptions, moteurs, stockage et historique ne sont pas modifiés.
Les valeurs calorifiques et de performance de la référence restent réservées à la fixture QA.
En utilisation normale, les tuiles conservent les métriques réellement disponibles : séances, durée et sports pratiqués.
La fixture n’écrit aucune donnée personnelle. Elle est absente des builds sans VITE_REKKA_VISUAL_FIXTURES=1.
Les captures « vide » utilisent les calculs réels sur un profil de test sans historique.
Les captures « référence » contiennent les chiffres de démonstration et ne représentent pas les performances d’un utilisateur.
Les graphiques secondaires et l’historique restent accessibles sous le tableau de bord.

## Limites de fidélité
La planche archivée « Maquette REKKA Playfield Pro fitness en français.png » a été retrouvée.
Extrait Progression : crop (697,61)-(1021,801) de la planche 1024 × 1536 ; barre système exclue.
Comparaison à largeur 390 px, proportions préservées ; application recadrée à partir de y=43 pour exclure ses bandeaux BÊTA dans la seule comparaison. Les captures originales les conservent.
Les hauteurs ne sont pas déformées pour forcer la coïncidence : différences de ratio et de contenu subsistent.
Les overlays officiels sont indicatifs, la planche basse résolution ne permet pas une mesure absolue au pixel près.
Aucune validation pixel-perfect annoncée. Les pictogrammes, typographie et le tracé nécessitent encore une appréciation visuelle.
Les bandeaux BÊTA restent visibles. Aucun test Samsung physique effectué.

## Vérifications
TypeScript, lint et build locaux réussis. Tests ciblés : 16/16.
Workflow final réussi : https://github.com/fabiengorce40/Hybridsport/actions/runs/44291350793
TypeScript, ESLint, build et 283 tests / 57 fichiers réussis. Neuf parcours Chromium pour les trois zones et trois largeurs.
Saisie directe de charge/répétitions, virgule décimale, valeurs longues, validation et persistance des séries, repos/pause/reprise/+15 s et navigation vérifiés.
Progression : navigation Semaine/Mois/Année, fixture explicitement activée, état vide et absence de scroll horizontal vérifiés.
Accueil : comparaison exacte avant/après sur le même runner et avec le même SHA affiché : zéro pixel différent à 360, 390 et 412 px.

## Écarts résiduels
À 360 px, les libellés du bas du graphique passent sous le dock à l’ouverture ; ils restent accessibles par défilement. Le badge de variation se répartit sur deux lignes.
À 390 px, l’axe et les six repères sont visibles sans défilement. La composition est plus compacte que certaines références individuelles.
Anneau principal sans les extrémités arrondies/bout bleu du modèle ; légende et parts du donut reflètent les pourcentages exacts de la fixture, différents du dessin de maquette.
Police, graisse, pictogrammes et graphiques ne sont pas déclarés identiques. Le dernier point de la fixture vaut 85 kg, affiché honnêtement 85 kg, alors que certaines maquettes montrent une bulle 80 kg.
Le contenu normal diffère volontairement de la maquette quand les métriques n’existent pas (aucune calorie/performance fictive).

Aucun merge, déploiement Cloudflare, changement de paramètres ou écriture sur BÊTA/production.

## Mesures DOM — état sans historique

| Largeur | Élément | x | y | largeur | hauteur |
| --- | --- | --- | --- | --- | --- |
| 360 | .pf-progress-period | 14 | 103 | 332 | 50 |
| 360 | .pf-progress-ring | 25.08 | 166 | 104 | 104 |
| 360 | .pf-progress-facts | 14 | 283 | 332 | 82.09 |
| 360 | .pf-progress-distribution | 14 | 375.09 | 332 | 151.77 |
| 360 | .pf-progress-chart-card | 14 | 536.86 | 332 | 92.77 |
| 390 | .pf-progress-period | 14 | 103 | 362 | 50 |
| 390 | .pf-progress-ring | 26.22 | 166 | 113.09 | 113.09 |
| 390 | .pf-progress-facts | 14 | 292.09 | 362 | 84.28 |
| 390 | .pf-progress-distribution | 14 | 386.38 | 362 | 151.19 |
| 390 | .pf-progress-chart-card | 14 | 547.56 | 362 | 94.59 |
| 412 | .pf-progress-period | 14 | 103 | 384 | 50 |
| 412 | .pf-progress-ring | 27.95 | 166 | 118 | 118 |
| 412 | .pf-progress-facts | 14 | 297 | 384 | 86.27 |
| 412 | .pf-progress-distribution | 14 | 393.27 | 384 | 157.8 |
| 412 | .pf-progress-chart-card | 14 | 561.06 | 384 | 95.92 |
