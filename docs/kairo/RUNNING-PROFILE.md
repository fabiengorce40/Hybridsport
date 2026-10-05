# Profil Course (Beta 0) : références athlète

Principe : l'interface et app-core **saisissent des observations** et **affichent ce que le moteur Running calcule**. Aucune formule physiologique, aucune Critical Speed calculée, aucune zone ni allure fabriquée.

## Inventaire du moteur Running

### Ce que le contrat accepte

Contrat `RunningReference` (`running/src/references.ts`), 11 types : `RACE_RESULT`, `TIME_TRIAL`, `CRITICAL_SPEED_TEST`, `LAB_THRESHOLD`, `FIELD_THRESHOLD`, `VMA_TEST`, `VO2MAX_TEST`, `TRAINING_OBSERVATION`, `RPE_BASED`, `CALIBRATION_RESULT`, `USER_DECLARED`.

Chaque référence porte :
- des valeurs : distance, durée, vitesse, allure, RPE, VO₂, nombre d'essais ;
- une date ;
- une provenance : source `USER_DECLARED`, `APP_RECORDED`, `IMPORTED`, `LAB` ou `COACH`, plus protocole et méthode ;
- des entrées de confiance : protocole déclaré, conditions, interruption depuis.

### Ce que le moteur consomme réellement

| Consommateur | Référence utilisée | Règle (registre, valeurs candidates) |
|---|---|---|
| Confiance par décision (`analyzeRunning`, `selectReference`) | Toutes, selon la décision | Plafond par type, récence V12 (récente ≤ 8 sem., vieillissante ≤ 16, ancienne au-delà), conditions, spécificité |
| Premières séances seuil et VO₂ (`firstExposure`) | `TIME_TRIAL` de 5 ou 10 km, récent, sans interruption | `running.firstExposure.*` |
| Allure des séances VO₂ / intervalles courts (`severePace`) | `RACE_RESULT` ou `TIME_TRIAL` de 3 à 5 km | Ancre V18 ± largeur V03 selon la confiance ; exige une montre et la capacité `paceTargets` |
| Seuil continu des niveaux inférieurs (garde) | Confiance de la référence `THRESHOLD_BOUNDARY`, à laquelle une Critical Speed contribue | Règle de garde |
| Calibration (composition) | Performances discordantes à la même distance | Un TEST remplace la séance clé |
| TEST (`testSession`) | Protocole du registre (10 km pour l'objectif 10 km, sinon 5 km), borne d'allure observée | Produit un `TIME_TRIAL` `APP_RECORDED` |

### Critical Speed

KAIRO **n'en calcule aucune**. Le type `CRITICAL_SPEED_TEST` accepte une valeur **mesurée ailleurs** : vitesse, nombre d'essais, modèle déclaré. Elle n'entre que dans la confiance des décisions ; aucune allure n'en est tirée. Aucun modèle multi-distances n'existe : `performance-model.ts` est `NOT_IMPLEMENTED` et la famille type Riegel n'est qu'une candidate non autoritaire.

### Zones

- Cinq domaines sont définis structurellement : modéré, heavy, sévère, plus les catégories facile, seuil et sprint.
- La seule correspondance gouvernée est le paramètre **candidat** `running.target.rpeByDomain` : repères d'effort perçu par domaine, non approuvés, non résolus en production.
- Aucune zone d'allure ni de fréquence cardiaque :
  - `easyCeilingPaceMargin` n'a pas de valeur ;
  - aucune estimation de la frontière 2 (V04/V05) ;
  - la marge seuil est relative à cette frontière absente.

## Ce que fait la Beta 0

- **Saisie** (`declareRunningPerformance`) : course officielle, chrono personnel ou Critical Speed mesurée.
  - Champs : date (jamais future), distance mesurée ou non, conditions, arrêt depuis.
  - Seules les entrées que le contrat consomme sont demandées.
  - La conversion allure → vitesse de la Critical Speed n'est qu'une conversion d'unités.
  - Ajout seulement, jamais d'effacement ; date et provenance sont conservées.
- **Profil calculé** (`selectRunningProfile`), qui n'affiche que des résultats du moteur :
  - références (fraîcheur, décisions pour lesquelles elles sont retenues) ;
  - accès aux séances clés ;
  - allure VO₂ ou causes de l'effort seul ;
  - Critical Speed déclarée ou « données manquantes » ;
  - repères d'effort candidats ;
  - « aucune zone d'allure » ;
  - prédiction indisponible ;
  - conflits.
- **« Je n'ai pas de chrono récent »** (`requestRunningTest`, Programme Engine `requestAssessment`) :
  - même mécanisme d'évaluation, même contenu déclaré (le TEST du moteur), aucun nouveau protocole ;
  - semaine courante replanifiée si elle n'a pas commencé, sinon semaine suivante ;
  - le TEST réalisé produit une référence `TIME_TRIAL` `APP_RECORDED` et l'évaluation passe à « réalisée ».
- **Objectif ≠ niveau** :
  - l'objectif (distance, date) reste dans le programme ; il n'est jamais une référence ;
  - le contrat Running n'a **aucun champ de chrono cible** : il n'est donc pas demandé.
- **Sans référence** :
  - footings sur la dose réellement courue (dernière course déclarée) ;
  - séances clés « test récent nécessaire » : le moteur place lui-même un TEST quand il tient dans un créneau ;
  - aucune allure fabriquée.

## Non gouverné scientifiquement

Valeurs candidates seulement (non résolues en production) : récence, plafonds de confiance, ancre et largeur d'allure VO₂, premières expositions, protocole TEST, repères RPE.

Absents :
- calcul de Critical Speed ;
- modèle de performance entre distances ;
- zones d'allure et de fréquence cardiaque ;
- frontière de seuil ;
- allure facile ;
- chrono cible.
