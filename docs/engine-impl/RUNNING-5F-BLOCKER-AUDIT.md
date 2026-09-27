# RUNNING-5F-BLOCKER-AUDIT — ce que les décisions bloquent vraiment

> **Phase 5F (section G).** Remise en cause de l’affirmation 5E : « ces 8 décisions bloquent toute l’implémentation ».
>
> **Classes** :
> - CODE_BLOCKER : empêche d’écrire le moteur ;
> - RULESET_LOCK_BLOCKER : empêche de verrouiller le ruleset final ;
> - PRODUCTION_BLOCKER : empêche l’activation en production ;
> - FEATURE_BLOCKER : empêche une fonction ;
> - POPULATION_BLOCKER : empêche une population ;
> - NON_BLOCKER_FOR_IMPLEMENTATION.

## 1. Les 8 décisions de l’« ensemble minimal » 5E

| Décision | Empêche-t-elle d’écrire le moteur ? | Ce qu’elle empêche vraiment | Classe corrigée |
|---|---|---|---|
| G1-PAIN | **Non** : le comportement (actions CONTINUE, REDUCE, STOP, PAUSE, OUT_OF_SCOPE) est une politique paramétrée, déjà décrite ; le code peut l’implémenter en mode CANDIDATE | L’activation pour de vrais utilisateurs | PRODUCTION_BLOCKER + RULESET_LOCK_BLOCKER |
| G1-SCOPE | Non : la liste des déclencheurs est une donnée de ruleset | L’activation | PRODUCTION_BLOCKER + RULESET_LOCK_BLOCKER |
| G1-RETURN : politique (frontières, UNKNOWN) | Non : les états et les frontières sont des paramètres | L’activation ; le verrouillage | PRODUCTION_BLOCKER + RULESET_LOCK_BLOCKER |
| G1-RETURN : dose V34 | Non | Le premier départ après une longue coupure (NO_VALID en attendant) | FEATURE_BLOCKER |
| G1-NOVICE : politique (P-R0 accepté ou non) | Non | L’activation (la détection et le refus du test maximal doivent être signés) | PRODUCTION_BLOCKER |
| G1-NOVICE : dose V33 | Non | La population P-R0 | POPULATION_BLOCKER |
| E-RPE | **Non** : les bandes sont des paramètres ; le code manipule des plages | Le verrouillage du ruleset (valeurs de cible) | RULESET_LOCK_BLOCKER |
| E-DENSITY | Non : le maximum et la séparation sont des paramètres | Le verrouillage | RULESET_LOCK_BLOCKER |
| E-RECENCY | Non : les bornes sont des paramètres | Le verrouillage | RULESET_LOCK_BLOCKER |
| E-RECENTLOAD | Non : la structure du contexte est approuvée sur le principe (5E) ; fenêtre et agrégation paramétrables | Le verrouillage | RULESET_LOCK_BLOCKER |

**Correction** : **aucune** des 8 décisions n’est un CODE_BLOCKER. Ce sont des bloquants de **verrouillage du ruleset** et d’**activation en production**. La 5E confondait « implémenter » et « activer en production ».

## 2. Les autres décisions

| Décision | Classe corrigée |
|---|---|
| E-PROG | FEATURE_BLOCKER (hausse au-delà du toléré) ; RULESET_LOCK_BLOCKER si l’option choisie exige des valeurs |
| E-QUALITY | NON_BLOCKER_FOR_IMPLEMENTATION (défaut conservateur) ; RULESET_LOCK_BLOCKER pour le verrouillage |
| E-LONG | FEATURE_BLOCKER (progression du long run) ; POPULATION_BLOCKER (marathon) |
| E-PACE | NON_BLOCKER_FOR_IMPLEMENTATION (dégradation en RPE seul) ; RULESET_LOCK_BLOCKER |
| E-RECOVERY | NON_BLOCKER_FOR_IMPLEMENTATION (historique) |
| E-LOAD | POPULATION_BLOCKER (P-R1) |
| E-TAPER | FEATURE_BLOCKER (taper optimisé) |
| E-FIRST | FEATURE_BLOCKER (premières expositions) |
| E-MODEL | FEATURE_BLOCKER (extrapolation) |
| E-VARIABILITY | NON_BLOCKER_FOR_IMPLEMENTATION (dégradation prudente) |

## 3. Le seul vrai bloquant de code

| Élément | Classe | Raison |
|---|---|---|
| **Approbation de CORE-EXT-R1** (technique, pas scientifique) | **CODE_BLOCKER** pour les séances structurées (fractionné à séries, cibles en plages) | Modification du schéma du CORE (verrouillé) ; exige une approbation humaine |
| Intégration GlobalPlanner / InterferenceManager (P-HYBRID) | CODE_BLOCKER partiel (P-HYBRID seulement) | Dépendance technique |

Les séances continues (EASY, LONG) et le fractionné simple sont représentables avec les prescriptions actuelles du CORE (`distance` avec une plage d’allure, `timed`, `intervals`). Mais les cibles RPE et FC ainsi que les séries exigent CORE-EXT-R1.

## 4. Mise à jour des documents 5E
Voir le bandeau ajouté à `RUNNING-5E-BLOCKER-DEPENDENCIES.md` : « bloquant d’implémentation » y signifie désormais **bloquant de verrouillage ou de production**, sauf CORE-EXT-R1.
