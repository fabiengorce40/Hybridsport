# RUNNING-IMPLEMENTATION-CONTRACT-V0 — contrat conceptuel du futur RunningEngine

> **Phase 5C, spécification seulement.** Aucun code. Le futur RunningEngine est un **SportEngine** : il respecte le contrat existant du CORE (`parseContext`, `propose`, `checks`, `validateIntent`, voir `SPORT-ENGINE-BOUNDARY.md`) et **ne s’auto-valide jamais**. Le CORE valide.

## 1. Entrée

| Bloc | Contenu | Obligatoire | Si absent |
|---|---|---|---|
| `athleteContext` | Population (P-R0…P-R4, P-HYBRID), disponibilité, readiness et tolérance déclarées, douleur, déclencheurs hors périmètre, capteurs (`NO_WEARABLE` possible) | oui | `NO_VALID` (`INPUT.MISSING_ATHLETE_CONTEXT`) |
| `goal` | GENERAL_RUNNING / 5K / 10K / HALF / MARATHON / HYBRID_RUNNING_SUPPORT ; date éventuelle | oui | `NO_VALID` |
| `plannerIntent` | Nombre de séances, priorité de la course dans la semaine, phase, créneaux, contraintes concurrentes | oui | `NO_VALID` (le moteur ne planifie pas seul) |
| `references` | `RunningReferenceSet` (peut être vide) | non | `REF.NONE` ⇒ effort seulement |
| `loadHistory` | Séances réalisées (durée, distance si connue, RPE, archétype, structure) | non | Dimensions UNKNOWN ; ancres V19 absentes ⇒ doses BLOCKED selon le cas |
| `feedback` | `RunningFeedback` récents | non | Tolérance UNKNOWN ⇒ HOLD |
| `returnState` | SHORT / MODERATE / LONG / UNKNOWN / aucun | non | Calculé depuis l’historique ; **si incalculable ⇒ UNKNOWN** |
| `rulesetVersion` | Version du ruleset Running (paramètres, statuts) | oui | `NO_VALID` (`RULESET.MISSING`) |
| `mode` | CANDIDATE / PRODUCTION | oui | En PRODUCTION, tout paramètre G1 non signé requis ⇒ `NO_VALID` (`SAFETY.G1_UNSIGNED`) |
| `seed`, `now` | Déterminisme | oui (fournis par le CORE) | — |

## 2. Sortie

Exactement l’une des deux formes suivantes.

### 2.1 `VALID_RUNNING_PROPOSAL`

| Champ | Contenu |
|---|---|
| `sessions[]` | Demandes de séance : `sessionType`, `priority`, `stimulus`, `structure` (CORE-EXT-R1 `run_structure`), `targets` (plages + priorité), `estimatedDuration` (dérivée du contenu), `estimatedLoad` (10 dimensions, UNKNOWN conservé), `mechanicalDemand`, `metabolicDemand`, `locomotorDemand`, `structuralDemand`, `recoveryDemand`, `placementConstraints`, `eligibility` (`SessionEligibilityDecision`), `prescriptionConfidence` |
| `weekDecision` | Composition, TID résultante, LCA par dimension, décision de progression (variable dominante ou HOLD, direction, classe de magnitude) |
| `referenceDecision` | Référence retenue par décision, confiance, conflits, `PerformanceEstimate`, décision HOLD / UPDATE_UP / UPDATE_DOWN / REQUEST_CALIBRATION |
| `degradations[]` | Toute dégradation explicite (par exemple RPE seul faute de V38 ; composant bloqué retiré), avec code et paramètre |
| `trace` | Codes de raison ordonnés, paramètres utilisés avec statut et provenance, version du ruleset, graine |

### 2.2 `NO_VALID_RUNNING_PROPOSAL`

| Champ | Contenu |
|---|---|
| `reasonCodes[]` | Par exemple `PRESCRIPTION_BLOCKED_BY_PARAMETER(V33)`, `SAFETY.OUT_OF_SCOPE`, `SAFETY.G1_UNSIGNED`, `FREQ.BELOW_MINIMUM_PRACTICAL` (si le planificateur exige une structure), `INPUT.*` |
| `partialAnalysis` | Ce qui a été déterminé (références, éligibilités, structure prévue) **sans aucune séance prescrite** |
| `informationRequests[]` | Questions à poser (durée d’interruption, raison, déclaration à confirmer) |

## 3. Règles du contrat

1. **Jamais de séance partiellement invalide en silence.** Un composant dont la dose dépend d’un paramètre vide est :
   - soit **retiré ou dégradé explicitement**, et la proposition reste valide (entrée dans `degradations[]`) ;
   - soit, si la semaine n’a plus de sens (aucune séance restante, ou toutes les séances bloquées), la sortie est `NO_VALID_RUNNING_PROPOSAL`.
2. **Aucun défaut silencieux** (I19). Les défauts conservateurs sont tracés (`DEMAND.DEFAULT_CONSERVATIVE`).
3. **UNKNOWN reste UNKNOWN** (I2, I14).
4. **Le moteur ne place pas les séances** : il fournit des contraintes ; le GlobalPlanner place (I16).
5. **Toute valeur numérique porte sa provenance** (tag de paramètre, donnée d’entrée ou calcul) (I18).
6. **Déterminisme** : mêmes entrées, même ruleset, même graine ⇒ sortie et trace identiques octet pour octet (I1, I20).
7. **Précédence G1** : aucune règle G2 ou G3 ne relâche une contrainte G1 (I15). En PRODUCTION, un G1 non signé requis ⇒ `NO_VALID`.
8. **Validation par le CORE** : la proposition passe par le pipeline du CORE (schéma strict, validation, réparation éventuelle). Une proposition refusée par le CORE n’est jamais présentée comme valide.
9. **Séparation performance / prescription** : une `PerformanceEstimate` n’est jamais une cible sans décision tracée (5A §B.1).

## 4. Correspondance avec les goldens

| Scénario | Sortie attendue |
|---|---|
| R1 | `NO_VALID` : `PRESCRIPTION_BLOCKED_BY_PARAMETER(V33)` + analyse partielle (structure) |
| R8 | `NO_VALID` : `PRESCRIPTION_BLOCKED_BY_PARAMETER(V34)` |
| R4, R6 | `VALID` + dégradation `PERF.EXTRAPOLATION_MODEL_UNDEFINED` (allure spécifique absente) |
| R12 | `VALID` + composant THRESHOLD retiré, `PRESCRIPTION_BLOCKED_BY_PARAMETER(V35)` |
| Autres | `VALID` |
| Tous en PRODUCTION aujourd’hui | `NO_VALID` (`SAFETY.G1_UNSIGNED`) dès qu’un G1 est requis, c’est-à-dire toujours, car PAIN_STOP et OUT_OF_SCOPE s’appliquent à tous |

## 5. Pré-requis d’implémentation (hors 5C)
1. Ruleset V0 revu par un expert (valeurs EXPERT_DESIGN_REVIEW, dont V23).
2. Signature des 4 G1.
3. CORE-EXT-R1 approuvée, puis implémentée dans une phase CORE dédiée.
4. Tests du plan 5B (88 cas) et goldens R1–R12 convertis en tests exécutables.
