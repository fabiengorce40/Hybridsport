# Audit de départ — cycle autonome, 27 octobre 2026

Instantané des références distantes au début de la session :

| Branche | SHA | Constat |
|---|---|---|
| visual-direct | 7fd4ff0239c82791367fd1fa55a9eb19322b9329 | Prototype visuel, trois commits après 2b. |
| v2-2b | cdec1cf113071133bbdc4e7939aa88b7f5a12090 | Base commune. |
| v2-2c | f45de96a9a6917480871708ff95a31f3c9a4340b | Trois commits distincts après 2b ; corrections du prototype et composants de jalons. |
| beta-integration | f4820b48a082f867b8381e416908a4524b798c34 | Intégration réelle, ancêtre direct de la BÊTA actuelle. |
| beta | bc19fb1c94aa720044fe0968af99d1cb6f3fae8e | Intégration réelle plus correctif d'affichage et diagnostic. |
| kairo-rc4-dev | dc99d253f7ac5de7eb5f50e3a5dabaf3293bbff7 | Développement sportif, lecture seule. |
| production | f9f7e2e94dc87bb0176d55f8f730f2563c1f60a9 | Branche de publication GitHub Pages, lecture seule. |

`claude/rekka-autonomous-cycle` pointe aussi vers 7fd4ff0. Un clone ne peut pas révéler les modifications non poussées d'un autre environnement ; aucune conclusion à leur sujet. Ne pas modifier ces branches existantes. La branche locale de continuation part de 7fd4ff0, mais ne constitue pas une intégration de la BÊTA.

## Couverture initiale

Les lignes « tests » indiquent les preuves historiques présentes dans le dépôt, pas des tests réexécutés dans cette session. Une fonction signalée partielle nécessite une vérification avant livraison.

| Fonction | Prototype visual-direct | PWA BÊTA actuelle | Moteur / données | Preuves historiques et reste |
|---|---|---|---|---|
| Accueil et navigation | Cinq écrans, démonstration | Accueil et cinq entrées, V2 spécifique au canal beta | Prochaine séance réelle et sélecteurs | E2E BÊTA rapporté ; vérifier fidélité visuelle actuelle. |
| Planning liste/grille | Présent | Présent, préférence mémorisée | Semaine réelle ; avertissements de charge existants | E2E BÊTA rapporté ; filtre par sport à examiner. |
| Séance musculation | Séries et champs simulés, repos simulé | Session0 et StrengthWorkout, saisie et clôture | Store et transitions de séance existants | E2E BÊTA rapporté ; vérifier interruptions, chrono global et saisies tactiles. |
| Course / HYROX / Cross-training | Présentation de démonstration | Lecteurs propres à chaque sport | Prescriptions persistées et contrats spécifiques | E2E quatre sports rapporté ; réexécuter avant changement. |
| Progression et profil | Chiffres de démonstration | Historique, mesures réelles et réglages | Sélecteurs de l'historique | BÊTA : séances, durées renseignées et sports ; pas de courbe fictive. |
| Repos et reprise | Simulation | RestTimer0 et transitions persistées | controlRest et état de séance | Vérifier pause, ajout de temps, interruption et reprise sur chaque parcours. |
| Jalons | Démo | v2-2c fournit des composants non intégrés | Aucun branchement réel démontré | Tests v2-2c rapportés ; ne pas présenter les jalons comme acquis sans preuve. |

Les travaux 2c et visual-direct sont parallèles : `prototype.css`, Home, Workout, Progress et tests E2E se recoupent. Réutiliser des corrections ciblées après comparaison, sans écraser les illustrations et emblèmes déjà retenus. Les documentations de versions rapportent des validations différentes ; leur statut artistique doit être vérifié auprès des décisions effectives avant remplacement. La BÊTA réelle inclut déjà des bannières sportives : ne pas en conclure que toute nouvelle bannière est approuvée.

## Sécurité de publication

Sur visual-direct, `kairo-pages.yml` publie uniquement depuis `claude/crosstraining-c1-c2-spike-vbg8dv`, `rekka-beta-pages.yml` uniquement depuis `claude/rekka-beta`, y compris garde du lancement manuel. Aucun workflow ne doit être déclenché manuellement pour ce cycle. Vérifier à nouveau les workflows et règles externes avant tout push : le seul contenu du dépôt ne prouve pas l'absence d'autres automatisations de plateforme.

## Anomalies sportives

Le diagnostic existant `REKKA-REPS-PROGRAMME-REVIEW.md` sur bc19fb1 distingue le libellé A fondé sur des signatures identiques de la vraie rotation RC5.1, absente de la BÊTA. Il indique que la durée affichée utilise `estimatedDurationS`, avec repli sur `targetDurationS` : les 33 minutes ne sont pas expliquées sans les données de la semaine concernée. Le correctif mobile modifie le CSS de la BÊTA, pas la prescription. Ce diagnostic reste à reproduire ; ne pas renommer artificiellement une séance ni modifier les semaines persistées. Les changements de politique sportive nécessitent une proposition et une validation.

## Intégration proposée

Partir d'un SHA BÊTA actualisé sur une nouvelle branche isolée, conserver les contrats et le stockage, porter les améliorations UI par petits changements vérifiés, puis tester les quatre sports, import/export, interruption, mise à jour et hors ligne sur une origine de test isolée. Auditer manifeste, cache, service worker, migration et retour arrière avant toute publication. Une branche ou une PR ne met pas à jour une PWA installée. Aucun déploiement ni fusion dans ce cycle sans accord explicite.

## Futur

Coach conversationnel : propositions explicites, validation humaine et passage par les contrats existants. Strava : adaptateur, autorisation et synchronisation séparés des prescriptions. Récupération et planification multisports : exploiter les contrats et politiques validés, sans ajouter de seuil non validé. Progression : indicateurs issus de données réelles avec provenance, unités et états indisponibles. Ces pistes ne sont pas des fonctionnalités livrées.
