# REKKA V4 — Séance en cours, passe 8

Base distante vérifiée : fc92d32a9d27edc0acac53820d5a9de6ad9d350e.
Branche de travail : codex/rekka-v4-seance-passe8-mobile.

## Présentation

À 360 px, quatre colonnes sur une ligne. Les boutons ± de 44 × 44 px
apparaissent au focus du champ correspondant, au-dessus de celui-ci.
Ce compromis conserve les champs directement saisissables et évite de doubler
la hauteur de chaque série. Les contrôles sont accessibles depuis le champ
au clavier (Tab ou Maj+Tab). À 390 et 412 px, les commandes restent en ligne.
Cette ergonomie demande une validation tactile sur appareil.

L’unité kg passe à 11 px et rejoint la charge. Le libellé Prochaine série passe
à 12 px et le pictogramme pause à 20 px. Exercice suivant passe à 12 px.

Les bandeaux validés sont conservés sans retouche. Leur ratio entier 3:1 est
préservé. La silhouette du bord droit du bandeau Bas fait partie de l’asset.

## Fixtures et captures

Bas : Squat barre puis Leg curl.
Full Body : Soulevé de terre roumain puis Tractions.
Haut : Développé couché puis Tractions.
Changements limités à la fixture en mémoire du script E2E.

Capture intégrale du conteneur de séance, avec restauration de son style
avant les interactions suivantes. Assertion supplémentaire sur la hauteur
d’une série (56 px au maximum).

## Contrôles exécutés et preuves

Source compilée : e091d578693155b738f0b9a24b21f31470ed742d.
Workflow réussi : https://github.com/fabiengorce40/Hybridsport/actions/runs/44199289873
Artefact : https://github.com/fabiengorce40/Hybridsport/actions/runs/44199289873/artifacts/14381191161

TypeScript, ESLint complet, build et 283 tests / 57 fichiers réussis sur GitHub.
Neuf parcours Chromium : trois zones × trois largeurs. Charges, répétitions,
validation, persistance de la série, repos/pause/reprise/+15 s, navigation,
illustrations et absence de débordement horizontal vérifiés.
Saisie longue et commandes ± de 44 × 44 px au focus à 360 px contrôlées.
Aucun test ignoré annoncé comme réussi. Les deux timeouts locaux initiaux
ont réussi lors de leur relance puis dans la suite complète sur GitHub.

Accueil comparé pixel par pixel au même SHA de build, sur le même runner,
avant (sources fc92d32) / après : zéro pixel différent à 360, 390 et 412 px.

| Largeur | Hauteur série | Panneau repos : y / hauteur | Carte suivante : y / hauteur |
| --- | --- | --- | --- |
| 360 | 50 px | 616 / 130 px | 768 / 56 px |
| 390 | 46 px | 610 / 130 px | 762 / 56 px |
| 412 | 46 px | 618,06 / 130 px | 770,06 / 56 px |

## Écarts et limites

L'écran n'est pas déclaré pixel-perfect ni validé. À 360 px, la carte suivante
termine à 824 px et demande 24 px de défilement dans un viewport de 800 px.
Les commandes au focus à 360 px se superposent visuellement à la ligne
précédente : compromis non finalisé, à revoir avant validation ergonomique.
À 390/412 px les commandes restent en ligne.
Les bandeaux par zone remplacent intentionnellement l'illustration individuelle
de la référence. Le bouton « Passer le repos » conserve sa véritable action.

Les comparaisons officielles sont indicatives : référence disponible 352 × 780,
crop (4,38)-(348,770), puis normalisation 390 × 830 ; application hors bandeau
BÊTA normalisée dans la même surface. Cette normalisation ne démontre pas
un écart absolu en pixels. Les mesures DOM et avant/après sont les preuves
exactes. Le bandeau BÊTA reste conservé dans toutes les captures réelles.
Samsung physique, lecteur d'écran et validation tactile non effectués.

## Périmètre et sécurité

Quatre fichiers modifiés : CSS de séance, script de captures, workflow de QA
et ce rapport. Aucun moteur, donnée, migration, Accueil ou asset modifié.
Aucun merge ni commande de déploiement. Workflow limité à la branche isolée.
Commits préfixés [CF-Pages-Skip] pour omettre Pages automatique ; paramètres
Cloudflare non accessibles et non modifiés. Branches BÊTA/production non ciblées.
