# Cross-training C3.5 — du moteur C3 à une séance réellement utilisable dans KAIRO

Base : `3a0739c` (C3). C3.5 n'est pas un lot scientifique : aucune valeur nouvelle, aucun paramètre C3 promu. La séance affichée est la prescription **C3 → CORE → session_record** persistée ; l'interface en est une projection (`ctWorkoutOf`), sans perte ni réinterprétation.

## 1. Chaîne verticale

`Profil → Programme Engine → Planificateur → port CT (C3) → semaine persistée → Planning → Séance → chrono / compteurs → résultat → recordSessionExecution → historique CT → génération suivante`

| Étape | Avant C3.5 | Après C3.5 |
|---|---|---|
| Onboarding / programme | CT refusé (`BETA0_SPORT_UNSUPPORTED`) | CT seul ou ajouté ; intention C3 déclarée, fréquence, coupure |
| Environnement | aucun moteur CT | moteur C3 en simulation, gouvernance TEST_ONLY, marques SIMULATION_ONLY |
| Planificateur | port CT C2 (passe unique) | voisines, priorité et séances CT de la semaine transportées ; décisions C3 persistées |
| Vue de séance / routage | CT exclu (`selectProgrammeSession`) | `CrossTrainingWorkout` (aucun repli Strength ni legacy) |
| Exécution | corridor C2 (un mouvement continu) | résultat structuré par format, validé par le contrat du moteur |
| Historique | Strength / Running | + Cross-training (format, mouvements, résultat) |
| Retour moteur | — | `state.crosstraining.realized` relu à la génération suivante |

**Frontière** : app-core n'importe aucun module Cross-training. Le moteur, le contenu et la réalisation passent par le planificateur (`planner/tests/ct-beta0.ts`, `realizeCrossTrainingExecution`).

## 2. Activation Beta 0 (`beta0_experimental`)

- Moteur C3 en mode simulation, gouvernance `c3Governance({ hybrid: true })` : valeurs **EXPERT_PROPOSED** (TEST_ONLY), jamais PRODUCTION_ELIGIBLE ; aucune politique de charge (mouvements chargés inéligibles).
- Contenu : ruleset de test du CORE avec anti-doublon, normalisation des mètres / calories TEST_ONLY.
- Provenance : les semaines contenant du CT portent `crosstraining.c3.testGovernance`, `crosstraining.engine.simulation`, `demand.doseNormalization.crosstraining` ; chaque séance persiste ses `CANDIDATE_VALUE_USED` (EXPERT_PROPOSED). Une semaine sans CT ne porte aucune marque CT.
- Production stricte : CT non planifié (testé).
- `BETA0_PLANNING_VERSION` inchangée : Strength / Running non modifiés, aucune semaine régénérée.

## 3. Programme

- Intentions déclarables = archétypes que C3 sait composer : Mixte, Capacité aérobie, Seuil, Intervalles intenses, Endurance musculaire (`CT_INTENT_LABELS`).
- Objectif moteur : `GENERAL_FITNESS` (seul objectif Beta 0 ; compétition hors périmètre).
- Le programme déclare l'intention ; le planificateur place ; C3 compose format, mouvements et doses.
- Cross-training ajouté à d'autres sports : dernier dans l'ordre de priorité déclaré (aucune politique de priorité).

## 4. Séance

| Format | Chrono (fonction pure du temps écoulé) | Saisie | Résultat (contrat CT) |
|---|---|---|---|
| Continu | temps restant | durée réalisée | `total { durationS }` |
| Intervalles | TRAVAIL / RÉCUP, n° d'intervalle | intervalles réalisés | `intervals` |
| EMOM | minute en cours, restant dans la minute | minutes réalisées | `emom` |
| AMRAP | temps restant | tours + répétitions (compteurs) | `rounds_reps` |
| For time | temps écoulé, time cap | temps, ou tours + répétitions au time cap | `time` / `capped_rounds` |

- **Chrono** : `{ runningSince, accumulatedS, rounds, partialReps }` (≈ 70 o) ; écrit seulement sur une commande (démarrer, pause, reprise, compteur, fin). 30 minutes de chrono : aucune écriture (E2E).
- **Pause / reprise** explicites ; navigation et rechargement ne changent rien.
- **Douleur** : présence seule (`REPORTED`, les niveaux P1–P4 sont un contenu G1 indisponible) → pause douleur centrale (système existant) + signal moteur.
- **Abandon** : persisté (`abandoned`), visible, distinct ; lu par la politique d'historique C3.
- **Time cap** : résultat descriptif `capped_rounds` ; « comme prévu » refusé (incohérence), jamais un échec.
- **Charges réelles** : `performedLoads` (observation) distinctes de la charge prescrite ; aucune progression.
- **Scaling** : aucun « RX / Scaled » (règles non gouvernées).

## 5. Constats terrain (corrigés ou documentés)

1. **Semaine monotone** (3 AMRAP identiques) : C3 ne lisait que l'historique réalisé. Corrigé : séances CT prévues de la semaine transportées (`plannedSessions`), lues pour la variété seulement.
2. **Ordre de génération ≠ ordre des dates** (mercredi et vendredi identiques) : portée `generated` des séances de la semaine pour le port CT (Strength inchangé).
3. **Anti-doublon CORE absent du ruleset CT** : toute génération après une séance réalisée échouait. Corrigé : ruleset de test avec anti-doublon (comme Running).
4. **Décisions C3 non persistées** : persistées avec la séance (liste fermée de codes).
5. **Blocage permanent après abandon** : avec un catalogue pauvre (rameur seul ergomètre), « écarter les mouvements » rend toute composition impossible ; la dernière séance réalisée n'étant jamais remplacée, le blocage était définitif. Corrigé : retour négatif lu dans la fenêtre de récence seulement. Le refus d'une semaine reste explicite (`engine_refused`).
6. **Douleur → refus** (politique TEST_ONLY) : après une douleur, la semaine CT suivante est refusée « par précaution », même après levée de la pause. Comportement fail-closed attendu, à gouverner (décision humaine).
7. **Voisines à 144 h** interprétées par la politique de test : distance tracée (`discipline@Nh`), aucune fenêtre inventée (décision ouverte).

## 6. Preuves

- Boucle moteur → terrain → moteur : `packages/app-core/tests/ct/loop.test.ts`, rapport `__reports__/c35-loop.md`, et E2E navigateur (bloc CT).
- 40 tests adversariaux : `packages/app-core/tests/ct/ct-runtime.test.ts` (n° 30 : E2E 360 × 640).
- Taille de l'état : `__reports__/c35-state-size.md`.
- DOM : `apps/kairo/tests/ct-workout-dom.test.tsx`.
- E2E : `apps/kairo/scripts/e2e.mjs`, blocs F / G / H.
