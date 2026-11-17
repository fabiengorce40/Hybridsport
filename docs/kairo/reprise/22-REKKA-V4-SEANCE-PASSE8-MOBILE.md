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

## Contrôles

TypeScript, compilation BÊTA locale et lint ciblé exécutés avec succès.
Suite Kairo : deux délais de 5 s dépassés sur la première exécution concurrente
(CT strength block et RC4.5 volume). Relance ciblée consignée dans la livraison.
Chromium local bloqué par socket() failed: Operation not permitted.
Aucune capture passe 8 locale produite. Mesures DOM, superpositions et
comparaisons Accueil restent à vérifier par le workflow de capture.

Workflow dédié à cette branche : compilation, tests et captures uniquement.
Commit préfixé [CF-Pages-Skip] pour omettre les déploiements Pages automatiques.
Aucune modification de moteur, donnée, migration, Accueil ou autre écran.
