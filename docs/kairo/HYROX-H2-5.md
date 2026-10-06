# HYROX H2.5 — du moteur H2 à une séance HYROX réellement utilisable dans KAIRO

Base : `eab25cf` (correctif CORE « demand repetition »), corrigé par `2f19d20` (CI). H2.5 n'est pas un lot scientifique : aucune valeur nouvelle, aucun paramètre H2 promu. La séance affichée est la prescription **H2 → CORE → session_record** persistée ; l'interface en est une projection (`hrWorkoutOfView`), sans perte ni réinterprétation.

## 1. Chaîne verticale

`Profil → Programme Engine → Planificateur → port HYROX (H2) → semaine persistée → Planning → HYROX Workout → étapes / chrono / charges → résultat → recordSessionExecution → réalisations H2 → génération suivante`

| Étage | Avant H2.5 | Après H2.5 |
|---|---|---|
| Onboarding / profil | HYROX refusé (`BETA0_SPORT_UNSUPPORTED`) | HYROX seul ou ajouté ; rôle de séance, objectif, fréquence, coupure DÉCLARÉS |
| Programme | plan HYROX H1 (station) | plan `declared`, archétype de RÔLE H2, objectif `GENERAL` / `RACE_PREPARATION` |
| Environnement | aucun moteur HYROX | moteur H2 en simulation, gouvernance TEST_ONLY, marques SIMULATION_ONLY |
| Planificateur | port H1 (station transmise) | `transportNeighbours` : voisines, priorité, séances HYROX de la semaine ; décisions H2 persistées |
| Vue / routage | HYROX exclu de `selectProgrammeSession` | `HyroxWorkout` (aucun repli Strength, Cross-training ni legacy) |
| Exécution | contrat H1 (une station) | contrat H2 : progression (étapes), chrono, time cap, charges réelles, abandon |
| Historique | — | HYROX : structure, stations, résultat (terminée / time cap / arrêtée), douleur |
| Retour moteur | `sessionHistory` H1 | `compositionHistory` H2 (exposition + statuts déclarés) relue à la génération suivante |

**Frontières** :
- app-core n'importe pas le paquet HYROX : la présentation (`hyroxPresentationOf`), la réalisation (`realizeHyroxComposed`) et la réduction des historiques (`hyroxHistoriesOf`) passent par le planificateur.
- Le planificateur (placement) et le Programme ne contiennent aucun nom de station (tests 37 / 38 de H2).

## 2. Activation Beta 0 (`beta0_experimental`)

- **Moteur** : H2 en simulation (CANDIDATE), paramètres `hybrid_race.h2.*` TEST_ONLY (`hyrox/tests/h2-governance.ts` : draft, provisoires, ordre d'épreuve ARBITRAIRE). La source unique côté planificateur est `planner/tests/hr-beta0.ts`.
- **Provenance** : les semaines contenant du HYROX portent `hybrid_race.h2.testGovernance`, `hybrid_race.engine.simulation` et `demand.doseNormalization.hybrid_race`. Chaque séance persiste ses `CANDIDATE_VALUE_USED`.
- **Production stricte** : H2 refuse (`NOT_PRODUCTION_READY`, test 42).
- **Niveau** : la gouvernance TEST_ONLY n'admet que `intermediate` / `advanced`. Un débutant voit un refus explicite (« non planifiée »), jamais une séance inventée.
- **Version** : `BETA0_PLANNING_VERSION` est inchangée. Strength, Running et Cross-training ne sont pas modifiés ; HYROX n'existe que dans les programmes créés ou recréés après H2.5.

## 3. Séance

- **Enchaînement** :
  - « Maintenant » : station (orange) ou course (bleu), dose dans son unité native, charge prévue ;
  - « Ensuite » : l'étape suivante ;
  - parcours complet par tour (fait / en cours / à venir) ;
  - « Étape faite → suivante » et « Retour ».
- **Chrono** : `{ runningSince, accumulatedS, steps, loads }` (≈ 64 o). Écrit seulement sur une commande ; 95 min de chrono ne provoquent aucune écriture (E2E).
- **Time cap** : présenté comme un plafond (« plafond, pas un objectif »). Une fois atteint, « Time cap atteint avant la fin » enregistre la progression réelle (`time_capped`), jamais « comme prévu ».
- **Course** : distance seule, « Allure libre : aucune allure n'est prescrite » (allure BLOCKED, moteur Running).
- **Transitions** : non chronométrées ; aucune durée affichée, aucune Roxzone.
- **Charges réelles** : saisies sur l'étape en cours, distinctes de la prescription, persistées, visibles au résultat (« 24 kg prévus → 22 kg réalisés »). Aucune adaptation.
- **Fin** : seules les issues cohérentes avec la progression sont proposées :
  - séquence complète : comme prévu / adaptée / arrêtée ;
  - séquence incomplète : time cap atteint (si constaté) / arrêtée.
- **Douleur** : système central (pause de planification), présence seule (`REPORTED`).

## 4. Contrat de réalisation (`hyrox/src/h2/execution.ts`)

- **Prescription** : copie fidèle de la présentation (tours, time cap, composantes).
- **Résultat** : `completed { elapsedS }`, `time_capped` ou `abandoned { elapsedS, roundsCompleted, itemsCompletedInRound }`, plus `performedLoads`.
- **Cohérences définitionnelles** :
  - abandon ⇔ résultat abandon ;
  - time cap ⇒ temps ≥ time cap et jamais « comme prévu » ;
  - charge réelle seulement sur une station chargée ;
  - « comme prévu » ⇒ charges égales aux charges prescrites.
- **Mémoire H2** : `h2RealizedOf` réduit la réalisation à son exposition et à ses statuts. Le résultat n'est jamais lu pour prescrire (aucune progression).

## 5. Constats

1. **CI de `eab25cf` rouge** : le garde-fou d'architecture CT compare l'arbre avec `git diff`, qui ignore les fichiers non suivis. Le nouveau test CORE n'était donc visible qu'une fois commité. Corrigé par `2f19d20`. Désormais, la validation est faite fichiers ajoutés à l'index.
2. **Débutants refusés** par la gouvernance H2 TEST_ONLY (`eligibleLevels`). Le refus est explicite ; c'est une décision humaine à prendre.
3. **Fenêtre de mémoire H2 TEST_ONLY de 7 jours** : une séance réalisée tôt le lundi n'est plus vue par la séance du lundi suivant à midi (171 h > 168 h).
4. **Décisions H2 persistées volumineuses** (≈ 44 % de l'état après 12 semaines) : `CANDIDATE_VALUE_USED` est répété à chaque séance.
5. **Empreintes HYROX non stockées** côté application : l'anti-doublon du CORE n'est pas alimenté pour HYROX ; la mémoire passe par les réalisations H2.
6. **Station d'une composante** : elle n'est pas dans la séance (donnée du catalogue). Elle est lue dans les décisions H2 persistées (`H2_STATION_SELECTED`).

## 6. Preuves

| Preuve | Emplacement |
|---|---|
| Boucle moteur → terrain → moteur, avec contrefactuel | `packages/app-core/tests/hr/loop.test.ts`, rapport `__reports__/h25-loop.md` |
| 48 tests adversariaux | `packages/app-core/tests/hr/hr-runtime.test.ts` (n° 44 : DOM ; n° 45 : E2E) |
| Taille de l'état | `__reports__/h25-state-size.md` |
| DOM | `apps/kairo/tests/hr-workout-dom.test.tsx` |
| E2E HYROX A / B / C / D (360 × 640 et 412 × 915) | `apps/kairo/scripts/e2e.mjs` |
