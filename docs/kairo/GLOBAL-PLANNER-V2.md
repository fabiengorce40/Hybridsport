# Global Planner V2 : infrastructure applicative multisport

Baseline : `7379bea`. Référence d'architecture : 83 tests répartis sur 12 fichiers. Ce lot en ajoute un, ce qui donne 88 tests sur 13 fichiers.

## Graphe de dépendances (règle `planner/tests/architecture/dependency-graph.test.ts`)

```
apps/kairo → app-core → planner → strength | running | crosstraining | hyrox → engine → domain
                └──────→ strength, running (chemin V0), engine, domain
```

La règle est une liste fermée de couches, sans cycle (tri topologique) :
- le planificateur ne dépend pas d'app-core ;
- les moteurs ne dépendent ni du planificateur, ni d'app-core, ni les uns des autres ;
- le CORE ne dépend d'aucun moteur ;
- les imports des sources sont tous déclarés dans `package.json` ;
- app-core n'importe ni Cross-training ni HYROX.

## A. Frontière d'allure (réparation CORE)

**Prescriptions concernées** (`carriesMovementPace`) :
- `distance` et `intervals` qui portent `paceSecPerKm` ;
- `run_structure` qui contient une cible `pace`.

**Comportement :**
- La substitution d'un item portant une allure est refusée : `REPAIR.PACE_TRANSFER_REFUSED`, puis refus explicite.
- Aucune table d'équivalence, aucun coefficient, aucune conversion.
- Une `distance` sans allure est toujours substituée, comme avant.
- La frontière de charge reste prioritaire et inchangée.

## B. Standard Demand Profile

Le CORE contenait déjà `deriveDemandProfile` et ses huit structures. Il lui manquait la dose normalisée et la bande d'intensité de chaque item, jusqu'ici attendues du moteur de discipline.

`deriveSessionDemand` (engine/catalog/session-demand.ts) les fournit, puis **réutilise** `deriveDemandProfile`.

**Dose native de chaque prescription** (aucune conversion) :

| Unité | Source |
|---|---|
| `working_set` | séries de travail |
| `rep` | répétitions |
| `meter` | distance |
| `calorie` | calories |
| `second` | durée, maintien |
| `mobility_second` | mobilité |
| `run_structure_work_second` | durée de travail estimée par le CORE pour une séance structurée, borne haute |

**Normalisation :**
- Elle se fait par le paramètre gouverné facultatif `demand.doseNormalization` (G2). Il associe, pour chaque discipline et chaque unité, une valeur `perUnit` et une bande d'intensité.
- Aucune valeur par défaut. Si le paramètre, la discipline, l'unité, la bande ou l'exercice manque, le profil n'est pas dérivable (`DATA.DEMAND_PROFILE_UNAVAILABLE`, cause exacte).
- En production, une normalisation non approuvée est refusée (`DEMAND_PROFILE_NOT_APPROVED`).

**Limites :**
- Le planificateur consomme le profil sans connaître les exercices.
- Échauffement et retour au calme sont exclus.
- Aucun modificateur excentrique n'est appliqué : il n'est pas déductible de la prescription.

## C. Contexte voisin

Une seconde passe rappelle les moteurs consommateurs (Strength) avec :
- les profils dérivés des séances d'autres disciplines (semaine et historique) ;
- l'écart en heures entre les séances.

`week.known` vaut `true` seulement si toutes les voisines ont un profil dérivable. Sinon, Strength garde son comportement prudent existant.

La séance régénérée est revérifiée contre l'interférence. En mono-sport, il n'y a pas de seconde passe.

## D/E. Intention de programme

- Chaque sport demandé porte :
  - un nombre de séances ;
  - une intention de séance : archétype, stimulus, objectif, phase, profil de tolérance ;
  - pour HYROX, une station.
- L'ordre des sports donne la priorité.
- Aucune valeur par défaut. Une intention incomplète donne `PROGRAMME_INTENT_INCOMPLETE`, avec la liste des champs manquants.
- La station HYROX appartient au programme. Le planificateur la transmet sans la lire. HYROX prescrit la station.
- La surcharge manuelle par l'utilisateur est reportée : elle se fera au niveau du programme.

## F/G. app-core

**Chemin** : `programmeFromProfile`, puis `setProgrammeIntent`, puis `planProgrammeWeek(state, clock, env)`, qui écrit dans `AppState.planner.weeks[weekStart]`.

**`programmeFromProfile`** reprend :
- pour Strength et Running, les déclarations du profil et les choix V0 existants ;
- pour Cross-training et HYROX, rien : leur intention doit être déclarée.

**Persistance :**
- Les séances sont enregistrées en `session_record` courant : enveloppe, estimation de durée du CORE, empreinte.
- Sont aussi conservés le profil de demande, le contexte voisin, les conflits, la gouvernance et les raisons.

**Catégories de demande** : `planned`, `engine_refused`, `governance_blocked`, `interference_conflict`, `slot_unavailable`, `engine_unavailable`, `programme_intent_incomplete`.

**Environnement par défaut** :
- Strength et Running, comme V0 ;
- Cross-training et HYROX non raccordés, faute de contenu de production ;
- aucune gouvernance du planificateur.

Le planificateur V0 reste la voie des semaines Strength/Running existantes. Son instantané applicatif est identique avant et après ce lot.

## H. Ce qui reste fail-closed en production

Aucune de ces décisions n'est signée :
- `planner.interference.structureWindows` ;
- `demand.doseNormalization` ;
- Running `GLOBAL_PLANNER_INTEGRATION` ;
- CT-D11 et `ct.hybrid.policy` ;
- HYROX `hybrid_race.h1.hybridPlanning`.

Les tests de bout en bout utilisent des gouvernances TEST_ONLY.
