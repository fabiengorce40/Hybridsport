# RunningEngine — vague 1 : fondations, gouvernance, éligibilité à la production (phase 6B)

> **Infrastructure seulement : aucun algorithme de prescription.**
> - État humain inchangé : 14 décisions expertes PENDING, 4 G1 UNSIGNED, V23 / V33 / V34 non résolus.
> - Ces blocages n'empêchent pas le code ; ils empêchent l'**activation** des capacités qui en dépendent. Le code le prouve : tout échoue fermé.

## 1. Paquet

`packages/running` (`@hybridsport/running`). Il dépend uniquement de `@hybridsport/domain`, `@hybridsport/engine` et `zod`. Aucune fonctionnalité du CORE n'est dupliquée. CORE et Strength sont inchangés (empreinte F20 intacte).

| Fichier | Rôle |
|---|---|
| `model.ts` | Populations, objectifs, archétypes, domaines d'intensité, modes, états de reprise, niveaux de confiance |
| `codes.ts` | Codes de raison Running (domaines CORE existants) |
| `governance/parameters.ts` | Registre typé, maturité, transitions, résolution fail-closed |
| `governance/registry-v1-candidate.ts` | **Données** du registre V1 candidat : seul fichier portant des valeurs de programmation |
| `governance/state.ts` | 14 décisions, 4 G1, dépendances techniques, verrou du ruleset |
| `capability-definitions.ts`, `capabilities.ts` | Socle + 11 capacités, dépendances, état effectif |
| `eligibility.ts` | `RunningProductionEligibility` |
| `references.ts` | Modèle de références, `ReferenceConfidence`, conflits, sélection |
| `precision.ts` | Précision de cible, `PrescriptionConfidence` |
| `degradation.ts` | Modèle de dégradation |
| `recent-load.ts` | `RecentLoadContext` (provisoire) |
| `variability.ts` | `RunningPerformanceVariabilityEstimate` |
| `performance-model.ts` | Interface des modèles de performance |
| `context.ts` | `RunningContext` (schéma strict) |
| `analysis.ts` | Analyse de vague 1 : éligibilité, précision, dégradations, trace |
| `engine.ts` | Coquille `SportEngine<RunningContext>` |

## 2. Types de domaine
- **Populations** : `P_R0`…`P_R4`, `P_HYBRID`. P_HYBRID est un **contexte** qui s'ajoute à un niveau (`{ level, hybrid }`, 5A §C.1).
- **Objectifs** : `GENERAL_RUNNING`, `FIVE_K`, `TEN_K`, `HALF_MARATHON`, `MARATHON`.
- **Archétypes** : `EASY`, `LONG`, `THRESHOLD`, `SEVERE`, `SHORT_INTERVAL`, `HILLS`, `RACE_PACE`, `TEST`, `STRIDES`. `PROGRESSION_RUN` est connu comme POST_V1 et toujours indisponible. Aucun archétype ajouté.
- **Intensité** : 3 domaines physiologiques (`MODERATE`, `HEAVY`, `SEVERE`) et 3 catégories d'usage (`EASY_LOW` ⊂ MODERATE, `THRESHOLD_LIKE` haut du HEAVY, `SPRINT_NEUROMUSCULAR`). La correspondance vers le schéma CORE `run_structure` est une table de noms. **Aucune** correspondance RPE, FC ou allure ↔ domaine n'est codée : V02 reste un paramètre non approuvé, dont seul le statut est exposé.

## 3. Références et confiances
- **Types** (5B §E) : `RACE_RESULT`, `TIME_TRIAL`, `CRITICAL_SPEED_TEST`, `LAB_THRESHOLD`, `FIELD_THRESHOLD`, `VMA_TEST`, `VO2MAX_TEST`, `TRAINING_OBSERVATION`, `RPE_BASED`, `CALIBRATION_RESULT`, `USER_DECLARED`.
- **Contenu d'une référence** : valeurs, date, provenance (source, protocole, méthode), entrées de confiance, version de ruleset facultative. Exigences par type : un CS sans modèle déclaré ou un seuil sans définition est refusé.
- **Aucune formule de conversion** : seule l'allure comparable est calculée (arithmétique).
- **`ReferenceConfidence`**, pour une décision donnée, est le **minimum des facteurs** :
  - plafond du type (paramètre ordinal) ;
  - récence (V12) ;
  - conditions exigées pour HIGH (5B) ;
  - spécificité (une allure spécifique exige la même distance) ;
  - conflit.

  Un facteur dont le paramètre n'est pas résolu vaut NONE.
- **Conflits** : la gravité (V43) dépend de la variabilité (V42, E-VARIABILITY en attente). Toute discordance est donc traitée comme MAJOR (5E) : la référence la plus prudente est retenue et une calibration est demandée.
- **`PrescriptionConfidence`** est un type **séparé** (niveau, facteurs limitants, conséquences : plages élargies, effort prioritaire, test proposé). Elle n'a **aucun** champ d'éligibilité.

## 4. Registre des paramètres
- **Champs** : `parameterId`, `tag`, valeur (`candidate`) **ou** `unresolved` (avec sa raison), `unit`, `provenanceClass`, `evidenceReferenceIds`, `sensitivity`, `maturity`, `governance`, `statusClass`, `decisionIds`, `g1PolicyId`, `approvals`, `rulesetVersion`, `provisional`.
- **Maturité** : UNRESOLVED, EXPERT_PROPOSED, EXPERT_APPROVED, PRODUCT_APPROVED, TECHNICAL_APPROVED, SAFETY_APPROVED, PRODUCTION_ELIGIBLE.
- **Chemins par gouvernance** :
  - G1_POLICY : proposé → SAFETY ;
  - G1_DOSE : proposé → EXPERT → SAFETY ;
  - EXPERT : proposé → EXPERT ;
  - PRODUCT_GUARDRAIL : proposé → PRODUCT ;
  - PRODUCT_GUARDRAIL_AND_EXPERT : proposé → EXPERT → PRODUCT ;
  - TECHNICAL : proposé → TECHNICAL.

  SAFETY_APPROVED n'existe que pour G1. PRODUCTION_ELIGIBLE exige l'état requis et le ruleset verrouillé.
- **Transitions** : chaque état exige le rôle habilité et une référence d'approbation. Une révision ramène à EXPERT_PROPOSED et efface les approbations. Le code **n'accorde aucun état**.
- **Résolution** :
  - PRODUCTION : seulement les paramètres PRODUCTION_ELIGIBLE ;
  - CANDIDATE : valeurs candidates, toujours tracées `CANDIDATE_VALUE_USED` ;
  - une absence de valeur n'est **jamais** résolue, quel que soit le mode.
- **Contenu** : 46 paramètres. 31 ont une valeur candidate : les 23 valeurs chiffrées actives de 5D/5E, la règle V11, les politiques G1 (sauf V33 et V34) et les plafonds ordinaux de confiance par type de référence. 15 n'ont pas de valeur. Aucun n'est approuvé.
- **Sans valeur** : V23, V28 (hors marathon), V31–V37, V39–V41, l'exposant et la largeur d'incertitude de V38, et le nombre minimal de V42.

## 5. Capacités et éligibilité à la production
- **Socle** : 4 G1 ; E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD ; CORE-EXT-R1 ; paramètres des politiques G1 et des décisions du socle.
- **11 capacités** : `noviceEntry`, `longReturn`, `progressionBeyondHistory`, `longRunProgression`, `firstThresholdExposure`, `firstSevereExposure`, `marathon`, `performanceExtrapolation`, `taper`, `paceTargets`, `hybridPlanning`. Chacune déclare ses décisions, paramètres, G1 et dépendances techniques (graphe 5G).
- **État effectif**, toujours dérivé de la gouvernance :
  - non demandée ⇒ désactivée ;
  - PRODUCTION ⇒ éligible ou refusée ;
  - CANDIDATE ⇒ activée si toutes les valeurs existent et les dépendances techniques sont satisfaites ; les blocages sont tracés (`CANDIDATE_OVERRIDE`) ;
  - une valeur absente (V33, V34…) rend la capacité indisponible dans tous les modes.
- **`RunningProductionEligibility`** : `eligible`, `blockingDecisionIds`, `blockingParameterIds`, `blockingG1PolicyIds`, `blockingTechnicalIds`, `rulesetLocked`, `reasonCodes`. Les listes sont triées ; le socle est inclus ; le calcul échoue fermé.
- **État réel** : socle et 11 capacités **non éligibles**.
- **CORE-EXT-R1** est vérifiée sur les artefacts (`CURRENT_SCHEMA.session_record.version ≥ 4`), pas sur un rapport.

## 6. G1, V33, V34
- **G1** : les 4 politiques sont UNSIGNED. Aucun diagnostic, aucune inférence de blessure. Elles bloquent le socle, donc toute la production.
- **V33** (`running.novice.entryDose`, G1_DOSE, G1-NOVICE) : sans valeur. Une population P_R0 rend toute séance indisponible (`NOVICE_ENTRY_UNRESOLVED`, dégradation NO_VALID).
- **V34** (`running.return.firstExposureDose`, G1_DOSE, G1-RETURN) : sans valeur. Une reprise LONG ou UNKNOWN sans séance post-retour rend la première prescription indisponible (`RETURN_PROTOCOL_UNRESOLVED`).
- Une valeur glissée dans le registre sans maturité (y compris 0) fait refuser la gouvernance, donc le moteur. Une valeur proposée légitimement reste bloquée en PRODUCTION tant qu'elle n'est pas signée.

## 7. Codes de raison
Codes stables et distincts :
- **Exigés par la phase 6B** : `RULE.RUNNING.UNRESOLVED_PARAMETER`, `SCOPE.RUNNING.CAPABILITY_DISABLED`, `SAFETY.RUNNING.G1_POLICY_UNSIGNED`, `DATA.RUNNING.REFERENCE_MISSING`, `DATA.RUNNING.REFERENCE_LOW_CONFIDENCE`, `DOSE.RUNNING.PRESCRIPTION_PRECISION_REDUCED`, `SCOPE.RUNNING.POPULATION_UNSUPPORTED`, `GOAL.RUNNING.GOAL_UNSUPPORTED`, `PROGRESSION.RUNNING.FIRST_EXPOSURE_UNRESOLVED`, `STATE.RUNNING.RETURN_PROTOCOL_UNRESOLVED`, `SCOPE.RUNNING.NOVICE_ENTRY_UNRESOLVED`, `PROGRESSION.RUNNING.PROGRESSION_UNRESOLVED`, `GOAL.RUNNING.MARATHON_RULE_UNRESOLVED`, `DATA.RUNNING.MODEL_UNAVAILABLE`.
- **Gouvernance, références, séances** : 20 codes supplémentaires (34 au total), dont `DECISION_PENDING`, `RULESET_NOT_LOCKED`, `CANDIDATE_OVERRIDE`, `REFERENCE_CONFLICT`, `CALIBRATION_REQUIRED` et `PRESCRIPTION_NOT_IMPLEMENTED`.

Tous utilisent des domaines CORE existants (aucun domaine ajouté).

## 8. Éligibilité, précision, dégradation
- **Éligibilité** d'une séance (capacités, socle en PRODUCTION, périmètre) : `ELIGIBLE` ou `UNAVAILABLE`, avec la liste des blocages.
- **Précision** (décision séparée) : `PACE_RANGE` seulement si tout est réuni (capacité `paceTargets`, montre, référence, V03 autorisant une plage à ce niveau de confiance). Sinon `EFFORT_ONLY`, avec **toutes** les causes. `NOT_APPLICABLE` si la séance est indisponible. Exemple : EASY reste **éligible** sans allure prescriptible.
- **Dégradations explicites** :

  | Situation | Dégradation |
  |---|---|
  | Allure indisponible | `PRECISION_REDUCED` |
  | Modèle indisponible | `CALIBRATION_REQUIRED` |
  | Progression au-delà de l'historique indisponible | `HOLD_OR_RESTORE_ONLY` (long run compris) |
  | Première exposition non résolue | `COMPONENT_UNAVAILABLE` |
  | Marathon non strict | `GENERAL_PROGRAM_WITHOUT_GOAL_CLAIM` |
  | Novice (V33) ou reprise longue (V34) | `NO_VALID` |

  Chaque dégradation porte sa capacité, ses paramètres et son code.

## 9. Contextes et modèles
- **`RunningContext`** (strict) : population, objectif (`strict` pour exiger un plan propre à l'objectif), état de reprise fourni, références, expositions par archétype, charge récente, capteurs, mode, capacités demandées. Une population ou un objectif inconnus reçoivent leur code propre.
- **`RecentLoadContext`** : contexte de programmation, **pas** une capacité sûre.
  - calcul : médiane et `bestToleratedExposure` sur la fenêtre de V21 ;
  - semaines : manquante = UNKNOWN, zéro déclaré compté ;
  - drapeaux : POST_RETURN_ONLY, INSUFFICIENT_HISTORY, OUTLIER_WEEK (signalement seulement), NO_TOLERATED_WEEK ;
  - réponse négative : définie par des signaux produit seulement ;
  - tout est `provisional` ; paramètre non résolu ⇒ UNKNOWN.
- **Variabilité** :
  - PERSONAL, si le nombre minimal est décidé (aujourd'hui non décidé) ;
  - CONTEXT_PRIOR, par distance, tracé et à confiance LOW ;
  - UNKNOWN sinon.

  Aucune constante universelle.
- **Modèle de performance** : interface (`modelId`, `version`, objectifs couverts, entrées, incertitude en plage, provenance, `authoritative: false`). La famille type Riegel est un candidat **non implémenté**. Aucun modèle ne couvre le marathon. Sans modèle éligible : `MODEL_UNAVAILABLE`.

## 10. SportEngine, déterminisme, observabilité
- **Coquille** `createRunningEngine({ governance? })` :
  - `parseContext` ;
  - `validateIntent` (archétype inconnu ⇒ refus) ;
  - `propose` ⇒ `no_valid_proposal` avec `PRESCRIPTION_NOT_IMPLEMENTED` et les blocages exacts ;
  - `analyze` pour l'observabilité.

  Une gouvernance incohérente est refusée à la construction.
- **Déterminisme** : mêmes contexte, gouvernance, instant et graine ⇒ même analyse et même trace, octet pour octet.
- **Trace** : une entrée par étape (gouvernance, capacité, référence, variabilité, modèle, charge récente, séance, dégradation). Elle dit pourquoi une capacité est activée ou non, quel paramètre ou quelle G1 bloque, pourquoi la précision est réduite, quelle référence est retenue ou rejetée, et quelle version de ruleset s'applique. Aucune autorité LLM.

## 11. Non implémenté (vagues suivantes)
Prescriptions EASY, LONG, THRESHOLD, VO2 et fractionnés, côtes, allure spécifique, taper, dose novice, dose de reprise, programme marathon, planificateur hebdomadaire, progression.
