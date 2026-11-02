# REKKA V2.1 — QA et procédure d'essai

## Résultat

Fonctionnalité développée sur la branche isolée
`codex/rekka-v2-1-musculation-personnalisee`. Aucun déploiement et aucune fusion.
Les sources des moteurs Running, HYROX, Cross-training, du domaine et du CORE
n'ont pas été modifiées. Aucun workflow de publication modifié ou déclenché.
Le planificateur reçoit seulement une disponibilité optionnelle propre à
Strength et transporte ses cibles personnalisées dans ses explications.

## Parcours intégré

Huit résultats (les sept demandés + recomposition), corps entier ou jusqu'à
3 zones parmi les 8 zones régionales, intention propre à chaque zone, expérience,
fréquence, durée, jours, équipement, récupération, exclusions et préférences.
Le niveau Musculation est indépendant du niveau déclaré pour les autres sports.
Les programmes historiques gardent leurs objectifs et comportements tant que
la personnalisation n'est pas choisie explicitement.

Écrans : assistant de création existant, récapitulatif de programme, cartes de
volume/semaine et explications de séance, Profil → Ma musculation. L'édition
permet de changer directement une rubrique sans refaire tout l'onboarding.
La configuration est conservée dans le profil, les sauvegardes et exports.
Les réponses d'un assistant de création non encore validé restent un brouillon
en mémoire : leur reprise après fermeture complète n'est pas implémentée.

## Adaptation effective

Même StrengthEngine : besoins prioritaires, emplacements ciblés filtrés par
muscles, objectifs E1 hebdomadaires, dosage des intentions, RIR, repos, sélection
sous contraintes et continuité/progression existantes. Budget de volume borné,
sollicitations secondaires comptabilisées. Répartition selon les séances
restantes ; le haut hebdomadaire et les contrôles G1 existants restent prioritaires.

Le mode Force conserve ses principaux lourds ; une intention différente porte
sur ses accessoires. Pas de charge inventée ni d'accélération arbitraire des
hausses de charge : les performances réellement saisies nourrissent les tracks
et les modèles existants. Les plages de répétitions sont adaptées à l'intention ;
une prescription de track hors de cette plage n'est pas reprise comme telle.

Les changements s'appliquent aux prochaines semaines non encore planifiées.
Les séances et leurs instantanés restent inchangés. Les contraintes actuelles
(douleur et exclusions) restent vérifiées avant de démarrer une séance ancienne.
Les blocs de force hébergés dans Cross-training ne reçoivent pas cette personnalisation.

## Vérifications exécutées

- TypeScript racine + application : réussis.
- ESLint complet : réussi (dossier de build Android explicitement ignoré).
- Suite Vitest complète : **3 058 réussis, 2 ignorés, 0 échec** (3 060 tests).
- Build Vite React/TypeScript : réussie ; avertissement de taille du bundle
  préexistant, environ 411 ko gzip pour le JavaScript principal.
- Chromium 360 et 390 px : parcours en 7 étapes, génération réelle, persistance
  après rechargement, édition directe des priorités et sauvegarde sans changement
  des demandes planifiées ; aucune erreur JavaScript ni débordement horizontal.
- E2E icônes/PWA existant : migration du worker, icônes hors ligne,
  localStorage/IndexedDB conservés et BÊTA simulée sur autre origine intacte.
- Migration de sauvegardes v1/v2, séances en cours, repos/chronos, historique,
  sauvegarde/import et non-régressions multisports : couverts par la suite complète.

Voir `VALIDATION-PROFILS.md` pour les exercices et volumes des cinq exemples.
À mêmes contraintes : A (fessiers) = 10 E1 fessiers / 4 pectoraux ;
C (pectoraux/épaules) = 6 E1 fessiers / 12 pectoraux / 10 épaules.
Les intentions volume vs endurance/contrôle produisent aussi des prescriptions
mesurablement différentes. Le test de modification vérifie la conservation des
charges/tracks/expositions, logs et résultats, ainsi que la régénération identique
sur une séance conservée grâce à son instantané.

## Limites explicites

La politique chiffrée est candidate, sans validation clinique ou production.
Les fréquences prises en charge restent celles du moteur existant : 1 à 4.
Une priorité ne garantit ni résultat esthétique ni perte de graisse localisée.
Les contraintes peuvent empêcher une partie des séances demandées : dans le
profil E (Course + HYROX), 1/3 demande Musculation est placée ; les autres sont
signalées, pas forcées au détriment de la récupération. Le registre des exercices
et la disponibilité du matériel restent ceux déclarés par l'utilisateur.
La périodisation automatique et les capacités historiquement bloquées ne sont
pas prétendues résolues. Installation et tests physiques Samsung non exécutés.

## Tester après autorisation distincte de déploiement

1. Autoriser explicitement la publication de cette branche sur le seul projet
   Cloudflare Pages `rekka-v2-android-test` ; la version en ligne actuelle reste
   celle d'avant V2.1 tant que cette autorisation n'a pas été suivie d'un déploiement.
2. Vérifier à nouveau l'identité du projet, son origine et ses bindings ; relever
   les versions BÊTA/production avant/après. Construire le commit exact validé,
   puis exécuter `prepare-android-test.mjs` avec son `GITHUB_SHA` complet.
   Aucun nouveau projet ou domaine commun ne doit être utilisé.
3. Vérifier le manifeste servi et le commit de `version.json`, puis ouvrir
   https://rekka-v2-android-test.pages.dev/ dans un contexte de test jetable.
4. Créer uniquement des profils fictifs A et C, mêmes contraintes et niveau,
   comparer les volumes et les exercices. Tester B, D et E, les exclusions,
   une semaine limitée en temps, puis la modification depuis le profil.
5. Vérifier sur Samsung une séance : séries saisies, repos, pause/reprise,
   retour dans l'application et export/import d'une sauvegarde fictive.
   Ne pas désinstaller ni effacer les données pour appliquer une mise à jour.

Le format v3 relit les exports v1/v2. Une ancienne application v2 ne peut pas lire
un export v3 ; elle doit refuser de l'écraser. Il n'existe pas de rétroconversion
silencieuse ou de migration destructive.
