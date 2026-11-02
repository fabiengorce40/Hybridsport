# REKKA V2 — stabilisation du 28 octobre 2026

Branche `codex/rekka-continuation-20261027`, base `8db98bb`. Pas de fusion ni de publication ; BÊTA inchangée à `bc19fb1` lors du contrôle. Aucun moteur ni contrat de prescription modifié.

## Modifications

- `80413ac` : objectifs de séries visibles sans troncature et erreur de charge invalide expliquée et accessible ; aucun changement des prescriptions. Tests de série à plage, saisie décimale, erreur et série déjà enregistrée.
- `8fdb907` : temps écoulé de la séance de musculation visible dans la barre supérieure pendant le défilement. Ce compteur inclut le temps depuis le démarrage : il ne prétend pas être un temps actif ou une pause globale.
- `58f0230`, `aebb6c5`, `fae8373` : parcours mobiles reproductibles, captures, contrôle de la plage 12–20 réelle, des valeurs et chronomètres après rechargement. `93da137` : lancement séparé des parcours du grand E2E existant, sans supprimer les assertions de chaque parcours.

Captures Chromium émulation Android, 360 et 390 px, hauteur 800, DPR 1 : [séance en cours, valeurs saisies et deux chronomètres](captures/stabilisation-v2/seance-360-390.jpg) et [prescription réelle 12–20](captures/stabilisation-v2/repetitions-360-390.jpg). Pas un essai sur téléphone physique.

## Vérifications ciblées

- TypeScript racine et application, ESLint complet et build BÊTA locale : réussis sur le code final. Test DOM de saisie : 3 réussis. Test DOM des deux chronomètres : 1 réussi à la relance, 17 ignorés par le filtre ; première tentative expirée à 5 s sous charge.
- Groupes ciblés : Planning 33 tests, séances (Musculation, Course, HYROX, Cross-training) 9 tests, persistance et migration 64 tests : réussis. Ensuite, la suite a été exécutée par sous-groupes : **3 027 tests réussis, 2 ignorés**, sans compter les relances en double. Les expirations initiales ont été résolues par découpage. Le [bilan détaillé](REKKA-STABILISATION-TESTS-2026-10-28.md) liste les fichiers, les limites et les deux tests conditionnels ignorés.
- Navigateur : parcours Musculation en 360 et 390 px avec série réelle, charge, repos, pause, +15 s, reprise et valeurs et chronomètres après rechargement : réussi. Prescription 12–20 réellement présente : largeur du placeholder et objectif vérifiés en 360 et 390 px, sans débordement horizontal.
- E2E existants exécutés séparément : base (accueil, planning, musculation, course, historique) 21 vérifications ; Cross-training 27 ; HYROX 36 ; avertissement de récupération 8 ; Planning liste/grille 74. Chaque parcours a terminé avec succès ; ils ne constituent pas l'intégralité de l'E2E original. Le lanceur `e2e-parcours.mjs` a été vérifié sur le parcours Planning après le dernier changement d'interface.
- Mise à jour PWA locale : build A en ancien thème vers build B V2, deux clés du canal BÊTA identiques octet pour octet et préférence Grille conservée. Essai local effectué avant le dernier ajustement de la barre supérieure ; aucune publication distante. La mise à jour et le fonctionnement hors ligne de tous les écrans sur un vrai téléphone restent à vérifier.

## Chronomètre global : décision nécessaire

Les compteurs Course, HYROX et Cross-training possèdent chacun des contrats persistés distincts liés à leurs propres parcours ; le compteur musculation ici est l'heure écoulée depuis `startedAt`. Une pause globale fiable et indépendante suppose de définir la signification du temps actif et d'enregistrer ses pauses. `zProgrammeLog` est strict : ajouter un champ à la sauvegarde pourrait rendre un retour à une ancienne version incapable de lire des séances modifiées.

Proposition à examiner avant implémentation : un état facultatif versionné par séance, initialisé sans modifier les séances existantes, contenant temps accumulé et date de reprise ; migrations et tests d'import/export, interruptions, retours arrière et erreurs d'écriture ; aucune incidence sur les compteurs sportifs ou la prescription. L'ancien temps d'une séance en cours ne peut pas être reconstitué hors pauses déjà enregistrées : afficher explicitement le point de départ choisi. La stratégie de retour arrière et la compatibilité des anciennes versions doivent être validées avant toute écriture dans les données existantes.

## Performance

Build BÊTA locale : JavaScript principal environ 1,416 Mo minifié, 400 Ko gzip ; l'illustration d'accueil pèse environ 320 Ko et les quatre bannières environ 193–276 Ko chacune, chargées selon leur usage. Une estimation de segments générés par la source map attribue environ 315 Ko à `node_modules` (dont ~204 Ko à React DOM), 251 Ko à l'application et le reste à plusieurs packages métiers ; ces nombres sont des approximations de code non gzip, pas des mesures exactes au téléchargement.

Le code applicatif importe statiquement plusieurs écrans et moteurs. Le service worker précharge le shell mais met les assets en cache au premier usage : découper les écrans sans modifier et tester la stratégie hors ligne pourrait rendre un écran non visité inaccessible hors connexion. Mesurer d'abord les imports et chargements réels, expérimenter un découpage réversible, puis vérifier démarrage, changements de version, écrans jamais visités et hors ligne. `provisional-content.ts` utilise effectivement des catalogues sous `tests/fixtures` ; leur nom ne justifie pas leur suppression.

## Planning et anomalies

Les vues liste/grille et les avertissements existants sont conservés. Le parcours de récupération teste le maintien volontaire après avertissement et le refus en cas de pause douleur, sans modifier les règles. Le diagnostic séparé de `bc19fb1` reste valable : deux signatures identiques peuvent afficher A, et une durée estimée courte ne peut être attribuée à une cause précise sans export de la semaine. Ne pas renommer ni régénérer les séances persistées sur hypothèse.

## À terminer

La pause globale persistée, la validation de tous les états d'erreur et de contraste, les séances manquées/déplacées/reprogrammées sur chaque parcours, et une vérification sur appareil physique restent ouvertes. Aucune modification de politique sportive. Avant toute intégration, comparer à la BÊTA à jour, relancer les contrôles retenus et examiner les migrations ; aucune fusion ni déploiement sans accord.
