# KAIRO V0 — guide : lancement, état réel, limites

Feuille de route et audit : [`V0-ROADMAP.md`](V0-ROADMAP.md).

## 1. Lancer l'application

Prérequis : Node ≥ 22.12, pnpm 10.

```bash
pnpm install
pnpm kairo:dev        # développement : http://localhost:5173
pnpm kairo:build      # build de production dans apps/kairo/dist
pnpm kairo:preview    # sert la build : http://localhost:4173
```

**Sur téléphone, sur le même réseau Wi-Fi** : `pnpm --filter @hybridsport/kairo preview --host`, puis ouvrir `http://<IP-de-l'ordinateur>:4173`.

**Installer comme une application** : la PWA (manifest, icônes, service worker hors ligne) exige HTTPS, sauf sur `localhost`. Il faut donc déployer `apps/kairo/dist` sur un hébergement statique HTTPS : n'importe quel hébergeur de fichiers statiques convient, car la base est relative. Ensuite :
- Android / Chrome : menu, puis « Installer l'application » ;
- iOS / Safari : Partager, puis « Sur l'écran d'accueil ».

**Aucun déploiement externe n'a été effectué.**

Une fois chargée, l'application fonctionne hors ligne.

## 2. Ce qui est réellement disponible

| Sport / comportement | État | Détail |
|---|---|---|
| **Musculation** | **Disponible — PROVISOIRE** | Séances complètes du moteur Strength : exercices, séries, répétitions, repos, effort (RIR/RPE), puis charges calculées par le moteur une fois l'historique disponible. Ruleset `0.4.0-strength-science-lock` : valeurs **provisoires, non validées**, règles de sécurité G1 **fictives**. |
| Progression musculation | Disponible — provisoire | Tracks du moteur (`createTrack`, `updateTrack`), mises à jour après chaque séance ; les séances non commencées sont régénérées. |
| **Course** : footing facile (EASY) | **SIMULATION** | Même durée que la dernière course réalisée (V19), **jamais augmentée**, à l'effort (RPE 3), **sans allure**. Exige au moins une course enregistrée. |
| Course : refus | Affichés tels quels | Débutant P-R0 (V33), reprise longue sans séance post-retour (V34), course + autre sport (P-HYBRID : planificateur global non validé), dose supérieure au temps disponible. |
| Course : fractionné, seuil, sortie longue, allure | **Absents** | Non implémentés ou non gouvernés. |
| **Cross-training, HYROX** | **Absents** | Aucun moteur, aucune règle validée. Sélectionnables : l'application affiche « indisponible », sans jamais générer de séance. |
| Planning | Disponible | Règles **structurelles** uniquement (§4). |
| Douleur | Pause de sécurité | Toute douleur signalée **suspend toutes les séances** jusqu'à ce que l'utilisateur la déclare disparue, avec le message « consulter un professionnel ». Aucune règle G1 validée ne permet d'adapter l'entraînement. |
| Persistance | Locale | Stockage du navigateur, versionné, avec export JSON. **Aucune synchronisation multi-appareils.** |

Rien n'est présenté comme une prescription de production :
- bannière « V0 PROVISOIRE » permanente ;
- badge PROVISOIRE ou SIMULATION sur chaque séance ;
- version du ruleset affichée ;
- avertissement accepté à l'onboarding.

## 3. Parcours

Onboarding (avertissement obligatoire, sports, objectifs, niveau, disponibilités, matériel) → planning de la semaine → séance détaillée → démarrage → séries cochées (répétitions et charge saisies) → chrono de repos flottant (durée prescrite par le moteur) → fin de séance → feedback (ressenti, douleur, note) → historique → adaptation (tracks, régénération des séances suivantes).

Règles de saisie :
- une plage de répétitions n'est **jamais pré-remplie** ;
- seules les valeurs prescrites exactement le sont (répétitions fixes, charge prescrite).

## 4. Planificateur (règles appliquées et règles bloquées)

**Filtres durs** :
- P1 : sport activé et doté d'un moteur ;
- P2 : jour déclaré disponible ;
- P3 : une séance par jour au plus ;
- P4 : archétype compatible (durée minimale, niveaux, objectifs lus dans le ruleset) ;
- P5 : une séance commencée ou terminée est conservée à sa date, jamais dupliquée.

**Critères de sélection** (départage uniquement) :
- priorité des sports déclarée par l'utilisateur ;
- espacement maximal entre les séances ;
- jour le plus tôt.

**Non gouverné, donc non appliqué et signalé** :
- durée de récupération minimale ;
- interférences I1–I8 ;
- doubles séances ;
- périodisation (phase fixe « accumulation », aucune décharge) ;
- choix du split Strength (full body uniquement).

## 5. Tests

| Suite | Contenu |
|---|---|
| `packages/app-core/tests` | Planificateur : filtres, propriété fast-check, anti-doublon, séances verrouillées. Parcours complet et déterminisme. Refus corrects (Running sans historique, P-R0, P-HYBRID). Pause douleur. Reprise. Adaptation sur 3 semaines : charges issues exclusivement des tracks et de l'historique. Persistance : réouverture, données illisibles conservées, version plus récente, échec d'écriture. Architecture : aucune horloge, aucun hasard, aucun nombre non justifié. |
| `apps/kairo/tests` (jsdom) | Onboarding, saisie des séries, parcours complet et réouverture, carte « indisponible », écran de récupération. |
| `apps/kairo/scripts/e2e.mjs` | Chromium sur la build de production, sur un viewport de téléphone : parcours complet, persistance après rechargement, course simulée, aucune erreur console. Lancement : `pnpm kairo:build && pnpm kairo:preview`, puis `pnpm kairo:e2e`. |
| Mutation ciblée | `stryker/kairo/app-core-decisions.json` : planificateur, génération, progression, transitions, persistance. |

## 6. Limites et dette

- Contenu provisoire : aucun ruleset ni catalogue de production. Les noms d'exercices sont des libellés d'affichage, car le catalogue de test ne porte que des identifiants.
- Running Wave 2 : `RUNNING_WAVE2_HARDENING_GATE = NOT PASSED` (lots de mutation 2 et 3 différés).
- Questions ouvertes :
  - V19 source-of-truth, V33, V34 ;
  - politiques G1 ;
  - Q-W2-2 à Q-W2-7.
- Pas de substitution d'exercice en séance (les alternatives du moteur sont seulement affichées), pas de saisie du RIR réalisé, pas de capacités déclarées (1RM).
- Une seule semaine planifiée à la fois ; pas de vue des semaines passées dans le planning (l'historique les conserve).
- Thème clair non livré. La photo de l'accueil est un fond graphique : pour utiliser une photo validée, définir `--hero-image: url(…)` dans `apps/kairo/src/styles.css`.
- Bundle d'environ 215 ko gzip : les moteurs tournent dans le navigateur.
