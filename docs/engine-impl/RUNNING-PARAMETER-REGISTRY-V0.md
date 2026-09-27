# RUNNING-PARAMETER-REGISTRY-V0 — premier registre candidat des paramètres Running

> **Phase 5B (section Z), documentation seulement.** Aucun ruleset, aucun code. **Aucune valeur n’est devinée** :
> - une cellule vide (`—`) signifie « à décider en conception du ruleset, sous la gouvernance indiquée » ;
> - un paramètre peut être une **politique** sans valeur numérique (ex. `running.progression.dominantVariablePolicy`).

## 1. Conventions

**Champs** : id, domaine (titre de section), type, valeur ou plage candidate, autorité, statut, gouvernance, population, objectif, phase, sources, vérification, incertitude, provisoire, revue d’expert, visa sécurité.

**Types**
- `POLICY` : règle nommée, sans valeur numérique ;
- `ENUM` : choix parmi des modalités ;
- `ORDINAL_TABLE` : table de niveaux ordinaux ;
- `NUMERIC` / `RANGE` : valeur ou plage chiffrée future ;
- `BOOLEAN` : interrupteur.

**Autorités**
- RE = RunningEngine ;
- GP = GlobalPlanner ;
- IM = InterferenceManager ;
- PE = ProgressionEngine ;
- AE = AdaptationEngine (replanification) ;
- UI = présentation.

**Abréviations des colonnes**
- Vérif. : SS = SEARCH_SUMMARY (Claude) ; EXT = abstract vérifié par le contre-audit externe ; ID = IDENTITY_ONLY ; « — » = aucune source.
- Prov. : provisoire ; Exp. : revue d’expert requise ; Séc. : visa sécurité requis.

**Tous les paramètres sont `provisional = true` en V0.**

**Valeurs inscrites.** Les seules valeurs présentes sont de trois sortes :
1. des **décisions de conception** déjà arbitrées (par exemple « interdit », « non utilisé », « durée », « informatif ») ;
2. des **libellés de politique** ;
3. **un signal de preuve**, marqué non prescriptif : le taper.

## 2. Registre

### 2.1 Références et modèle de performance

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.reference.hierarchyPolicy` | POLICY | Tri ordinal propre à chaque décision (validité > spécificité > récence > fiabilité > accord) | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | Aucune source directe | oui | oui | non |
| `running.reference.recencyReviewPolicy` | POLICY | Décroissance contextuelle + demande de revue ; pas d’expiration universelle | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | RS-MUJIKA-2000-DETRAIN | SS | Vitesse de décroissance inconnue | oui | oui | non |
| `running.reference.recencyBands` | ORDINAL_TABLE | — | RE | PROGRAMMING_HEURISTIC | G2 | par population | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.conflictTolerance` | NUMERIC | — | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.upgradeEvidencePolicy` | POLICY | Hausse substantielle seulement sur preuve suffisamment fiable (performance, test, contre-la-montre ou observations multiples cohérentes) ; une séance isolée ne réécrit jamais la capacité | RE | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.substantialUpgradeBound` | NUMERIC | — | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.trainingObservationUpgradeRule` | POLICY | Nombre d’observations et cohérence exigés : à définir | RE | EXPERT_DESIGN_REVIEW | G2 | P-R1–4 | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.downgradeAsymmetry` | POLICY | Une baisse exige moins de preuve qu’une hausse | RE | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.declaredConfidenceCap` | ENUM | LOW (décision 5A) | RE | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.fieldThresholdCap` | ENUM | MEDIUM (décision 5B) | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | RS-JAMNICK-2020-DOMAINS | SS | Selon le protocole | oui | oui | non |
| `running.reference.hrMaxAgeFormulaPolicy` | BOOLEAN | Interdite comme borne de domaine | RE | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.reference.noFabricatedPacePolicy` | BOOLEAN | Vrai (aucune allure sans référence valide) | RE | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.performance.interpolationPreferred` | BOOLEAN | Vrai | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.performance.extrapolationModelFamily` | ENUM | — (Riegel, CS, autre ; **VDOT exclu comme autorité**) | RE | EXPERT_DESIGN_REVIEW | G2 | P-R1–4 | course | toutes | — | — | Aucun modèle vérifié | oui | oui | non |
| `running.performance.extrapolationExponent` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R1–4 | course | toutes | — | — | — | oui | oui | non |
| `running.performance.extrapolationConfidencePolicy` | POLICY | Confiance dégradée avec le rapport d’extrapolation | RE | EXPERT_DESIGN_REVIEW | G2 | tous | course | toutes | — | — | Forme inconnue | oui | oui | non |

### 2.2 Confiance

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.confidence.reference.levelRules` | ORDINAL_TABLE | Conditions LOW / MEDIUM / HIGH (5A §F.4 ; 5B §E) | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.confidence.prescription.aggregation` | POLICY | Minimum des facteurs limitants | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.confidence.singleObservationCap` | ENUM | — (hypothèse 5A : MEDIUM, à confirmer) | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.confidence.longEventHistoryPolicy` | POLICY | Confiance plafonnée sans historique long | RE | EXPERT_DESIGN_REVIEW | G2 | tous | semi, marathon | toutes | — | — | — | oui | oui | non |

### 2.3 Critical speed

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.cs.role` | ENUM | Signal facultatif (référence, estimation de frontière, entrée de performance dans la plage des essais, entrée indirecte de prescription) | RE | CONTEXT_DEPENDENT | G2 | P-R2–4 | tous | toutes | RS-CSD-SCOPING-2026, RS-JONES-2019-CP | SS + EXT | Pas de consensus sur le protocole ni le modèle | oui | oui | non |
| `running.cs.minTrialsPolicy` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R2–4 | tous | toutes | RS-CSD-SCOPING-2026 | SS + EXT | idem | oui | oui | non |
| `running.cs.trialDurationBounds` | RANGE | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R2–4 | tous | toutes | RS-CSD-SCOPING-2026 | SS + EXT | idem | oui | oui | non |
| `running.cs.modelDeclaration` | BOOLEAN | Vrai (modèle stocké) | RE | TECHNICAL | T | — | — | — | RS-CSD-SCOPING-2026 | SS + EXT | — | oui | non | non |
| `running.cs.raceAsTrialPolicy` | POLICY | Autorisé, fiabilité inférieure | RE | EXPERT_DESIGN_REVIEW | G2 | P-R2–4 | tous | toutes | — | — | — | oui | oui | non |
| `running.cs.corroborationRequirement` | POLICY | Sans corroboration, confiance plafonnée à MEDIUM | RE | EXPERT_DESIGN_REVIEW | G2 | P-R2–4 | tous | toutes | — | — | — | oui | oui | non |
| `running.cs.populationEligibility` | ENUM | Non proposée à P-R0 et P-R1 | RE | PROGRAMMING_HEURISTIC | G2 | P-R0–1 | tous | toutes | — | — | — | oui | oui | non |
| `running.cs.dprimeUse` | ENUM | Informatif seulement | RE | INSUFFICIENT_EVIDENCE | G2 | — | — | — | RS-CSD-SCOPING-2026 | SS + EXT | — | oui | oui | non |

### 2.4 Intensité, seuil, cibles

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.intensity.domainModel` | ENUM | 3 domaines + catégories EASY_LOW, THRESHOLD_LIKE, SPRINT_NEUROMUSCULAR | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | RS-JAMNICK-2020-DOMAINS | SS | — | oui | oui | non |
| `running.intensity.uiScaleMapping` | ORDINAL_TABLE | — | UI | TECHNICAL | G3 | — | — | — | — | — | — | oui | non | non |
| `running.intensity.fixedPercentPolicy` | BOOLEAN | Interdit (pas de borne en % FCmax, VMA ou CS fixe) | RE | CONTEXT_DEPENDENT | G2 | tous | tous | toutes | RS-ZONE2-VAR | SS | Étude unique | oui | oui | non |
| `running.intensity.boundarySourcePolicy` | POLICY | Bornes issues des références, en plage multi-source | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.threshold.terminologyMap` | ENUM | Carte 5B §H (constructs distincts) | RE | TECHNICAL | T | — | — | — | RS-GALANRIOJA-2020-CP | SS | — | oui | non | non |
| `running.threshold.likeMargin` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R2–4 | tous | toutes | — | — | — | oui | oui | non |
| `running.easy.ceilingPolicy` | POLICY | Plafond (le signal le plus conservateur l’emporte) | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.easy.ceilingMargin` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.easy.talkTestUse` | ENUM | Descripteur verbal du plafond RPE | RE | CONTEXT_DEPENDENT | G2 | tous | tous | toutes | RS-REED-TALKTEST, RS-TALKTEST-SR-CARDIO | SS | Transfert aux sains | oui | oui | non |
| `running.target.modalityTable` | ORDINAL_TABLE | Table 5B §I (modalités préférées par archétype) | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.target.priorityByContext` | ORDINAL_TABLE | Table 5A §K.2 | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | RS-ZONE2-VAR | SS | — | oui | oui | non |
| `running.target.minConfidenceForPace` | ENUM | — | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.target.paceRangeWidthByConfidence` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.target.hrReferencePolicy` | POLICY | FC seulement sur référence individuelle | RE | CONTEXT_DEPENDENT | G2 | tous | tous | toutes | RS-ZONE2-VAR | SS | — | oui | oui | non |
| `running.target.hrLongSessionPolicy` | POLICY | FC en signal secondaire sur les séances longues | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |

### 2.5 Archétypes et séances

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.archetype.catalog` | ENUM | 11 archétypes (5B §J) | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.archetype.eligibilityTable` | ORDINAL_TABLE | — | RE | EXPERT_DESIGN_REVIEW | G2 | par population | par objectif | par phase | — | — | — | oui | oui | non |
| `running.archetype.demandTable` | ORDINAL_TABLE | Valeurs ordinales candidates (5B §W) | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | RS-FREDETTE-2022-INJ | SS | Ordinal, non mesuré | oui | oui | non |
| `running.threshold.continuousEligibility` | POLICY | P-R3 et plus, ou confiance ≥ MEDIUM | RE | PROGRAMMING_HEURISTIC | G2 | P-R2–4 | 10K, semi, marathon | DEVELOPMENT, SPECIFIC | — | — | — | oui | oui | non |
| `running.longRun.controlVariable` | ENUM | Durée | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.longRun.progressionPolicy` | POLICY | Relative à l’historique propre du long run ; aucun % du volume | RE / PE | EXPERT_DESIGN_REVIEW | G2 | P-R1–4 | tous | toutes | RS-FREDETTE-2022-INJ | SS | Aucune source marathon | oui | oui | non |
| `running.longRun.boundPolicy` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R1–4 | tous | toutes | RS-FREDETTE-2022-INJ | SS | idem | oui | oui | non |
| `running.longRun.specificPortionPolicy` | POLICY | Portions spécifiques en phase SPECIFIC si confiance suffisante | RE | EXPERT_DESIGN_REVIEW | G2 | P-R2–4 | semi, marathon | SPECIFIC | — | — | — | oui | oui | non |
| `running.hi.densityPolicy` | NUMERIC | — | RE / GP | PRODUCT_GUARDRAIL | G2 | P-R2–4 | tous | toutes | RS-GARCIAPINILLOS-2017-HIIT | SS | Contexte d’étude seulement | oui | oui | non |
| `running.hi.combinationPolicy` | POLICY | Continu et intermittent combinés | RE | CONTEXT_DEPENDENT | G2 | loisirs | tous | toutes | RS-GARCIAPINILLOS-2017-HIIT | SS | — | oui | oui | non |
| `running.interval.warmupFloor` | NUMERIC | — | RE | PRODUCT_GUARDRAIL | G3 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.interval.leverOrder` | POLICY | Réduire d’abord échauffement et retour au calme au-dessus du plancher, puis le travail | RE | PRODUCT_GUARDRAIL | G3 | tous | tous | toutes | — | — | — | oui | oui | non |

### 2.6 TID et fréquence

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.tid.policy` | POLICY | TID émergente ; aucune étiquette ciblée ; pas de 80/20 | RE | CONTEXT_DEPENDENT | G2 | tous | tous | toutes | RS-OLIVEIRA-2024-TID, RS-ROSENBLAT-2019-POL | SS + EXT (Oliveira) | Effet modeste, dépendant du contexte | oui | oui | non |
| `running.tid.representation` | ENUM | Temps par domaine ; par séance à faible fréquence | RE | TECHNICAL | T | — | — | — | — | — | — | oui | non | non |
| `running.tid.driftReviewPolicy` | POLICY | Une dérive déclenche une revue, pas une correction automatique | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.tid.concurrentInclusion` | POLICY | Intensité des autres disciplines incluse dans la description | RE / GP | EXPERT_DESIGN_REVIEW | G2 | P-HYBRID | tous | toutes | — | — | — | oui | oui | non |
| `running.frequency.minimumPractical` | NUMERIC | — | GP | PRODUCT_GUARDRAIL | G3 | tous | tous | toutes | — | — | Aucune source | oui | oui | non |
| `running.frequency.defaultByAvailability` | NUMERIC | — | GP | PROGRAMMING_HEURISTIC | G3 | tous | tous | toutes | — | — | Aucune source | oui | oui | non |
| `running.frequency.qualityEligibilityPolicy` | POLICY | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R0–2 | tous | toutes | — | — | — | oui | oui | non |

### 2.7 Charge

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.load.dimensions` | ENUM | 10 dimensions (5B §Q.1) | RE | TECHNICAL | T | — | — | — | RS-FOSTER-2001-SRPE | SS | — | oui | non | non |
| `running.load.unknownPropagation` | BOOLEAN | Vrai (UNKNOWN jamais imputé) | RE | TECHNICAL | T | — | — | — | — | — | — | oui | non | non |
| `running.load.primaryVolumeDimension` | ENUM | Durée | RE | TECHNICAL | T | — | — | — | — | — | — | oui | non | non |
| `running.load.baselineWindows` | NUMERIC | — | RE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | RS-IMPELLIZZERI-2020-ACWR | SS | Artefacts selon la fenêtre | oui | oui | non |
| `running.load.historyPolicy` | POLICY | Historique toléré pris en compte | RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.load.changeCategoryBounds` | NUMERIC | — (catégories opérationnelles, pas des seuils biologiques) | RE | PRODUCT_GUARDRAIL | G2 | P-R1–4 hors reprise | tous | toutes | RS-DAMSTED-2018-LOAD, RS-BUIST-2008-GRONORUN, RS-NIELSEN-2014-DANORUN, RS-FREDETTE-2022-INJ | SS | Pas de seuil universel | oui | oui | non |
| `running.load.tenPercentRule` | BOOLEAN | Non utilisée | RE | SUPPORTED (conclusion négative) | G2 | débutants | — | — | RS-BUIST-2008-GRONORUN, RS-DAMSTED-2018-LOAD | SS | Débutants | oui | oui | non |
| `running.load.acwr` | BOOLEAN | Non utilisé | RE | SUPPORTED (conclusion négative) | G2 | — | — | — | RS-IMPELLIZZERI-2020-ACWR | SS | — | oui | oui | non |
| `running.load.srpeDimension` | BOOLEAN | Vrai (`internalLoadSRPE`) | RE | CONTEXT_DEPENDENT | G2 | tous | tous | toutes | RS-FOSTER-2001-SRPE | SS | Transfert à la course | oui | oui | non |

### 2.8 Progression, phases, replanification

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.progression.dominantVariablePolicy` | POLICY | Une variable dominante par décision ; aucune priorité universelle | PE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.progression.candidateVariableTable` | ORDINAL_TABLE | — | PE | EXPERT_DESIGN_REVIEW | G2 | par population | par objectif | par phase | — | — | — | oui | oui | non |
| `running.progression.magnitudeClassBounds` | NUMERIC | — (HOLD / SMALL / MODERATE / LARGE = libellés opérationnels) | PE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.progression.holdConditions` | POLICY | Liste 5B §R.3 | PE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.progression.deloadPolicy` | ENUM | — (périodique ou conditionnelle) | PE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.phase.priorityTable` | ORDINAL_TABLE | — (priorités par phase, sans multiplicateur) | GP / RE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.phase.durations` | NUMERIC | — | GP | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.replan.noMakeUpPolicy` | BOOLEAN | Vrai (aucun rattrapage automatique, aucun modèle de dette) | AE | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.replan.noHardStacking` | BOOLEAN | Vrai | AE / GP | PRODUCT_GUARDRAIL | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.replan.decisionHierarchy` | POLICY | Séances importantes > récupération > spécificité > volume compatible | AE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.replan.volumeRecoveryBound` | NUMERIC | — | AE | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.placement.keyAdjacencyPolicy` | POLICY | Pas de séances KEY adjacentes de même dimension | GP | PROGRAMMING_HEURISTIC | G2 | tous | tous | toutes | — | — | — | oui | oui | non |
| `running.recovery.postRacePolicy` | NUMERIC | — (selon la distance courue) | GP / RE | PROGRAMMING_HEURISTIC | G2 | tous | course | RECOVERY | — | — | — | oui | oui | non |

### 2.9 Reprise et sécurité

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.return.stateBoundaries` | NUMERIC | — (SHORT / MODERATE : heuristique ; frontière LONG : G1) | RE | SAFETY_SIGNOFF_REQUIRED | G1 | tous | tous | RETURN | RS-MUJIKA-2000-DETRAIN | SS | Aucune borne soutenue | oui | oui | oui |
| `running.return.protocol` | POLICY | — (plafond de départ, rythme, archétypes interdits : LONG / UNKNOWN) | RE / PE | SAFETY_SIGNOFF_REQUIRED | G1 | tous | tous | RETURN | RS-MUJIKA-2000-DETRAIN | SS | idem | oui | oui | oui |
| `running.return.unknownStateHandling` | POLICY | Au moins MODERATE ; questions posées à l’utilisateur | RE | SAFETY_SIGNOFF_REQUIRED | G1 | tous | tous | RETURN | — | — | — | oui | oui | oui |
| `running.return.resumeRequirements` | POLICY | Informations requises (5B §T) avant de reprendre la progression | PE | EXPERT_DESIGN_REVIEW | G2 | tous | tous | RETURN | — | — | — | oui | oui | non |
| `running.return.referenceDecayPolicy` | POLICY | Confiance des références dégradée après interruption | RE | CONTEXT_DEPENDENT | G2 | tous | tous | RETURN | RS-MUJIKA-2000-DETRAIN | SS | Ampleur | oui | oui | non |
| `running.safety.painActionPolicy` | POLICY | CONTINUE / REDUCE / STOP_SESSION / PAUSE_PROGRESSION / OUT_OF_SCOPE ; aucun diagnostic | RE / AE | SAFETY_SIGNOFF_REQUIRED | G1 | tous | tous | toutes | — | — | — | oui | oui | oui |
| `running.safety.painWording` | ENUM | — (formulations déclaratives) | UI / RE | SAFETY_SIGNOFF_REQUIRED | G1 | tous | tous | toutes | — | — | — | oui | oui | oui |
| `running.safety.noviceEntryProtocol` | POLICY | Pas de test maximal à l’entrée ; conditions d’arrêt ; éligibilité | RE | SAFETY_SIGNOFF_REQUIRED | G1 | P-R0 | tous | FOUNDATION | RS-BUIST-2008-GRONORUN, RS-NIELSEN-2014-DANORUN | SS | — | oui | oui | oui |
| `running.safety.noviceEntryDose` | NUMERIC | — | RE | EXPERT_DESIGN_REVIEW | G2 | P-R0 | tous | FOUNDATION | — | — | — | oui | oui | non |
| `running.safety.outOfScopeTriggers` | ENUM | — (liste à signer) | RE | SAFETY_SIGNOFF_REQUIRED | G1 | — | — | — | — | — | — | oui | oui | oui |
| `running.safety.g1Precedence` | POLICY | Un paramètre non G1 ne relâche jamais une contrainte G1 | RE | TECHNICAL | T | — | — | — | — | — | — | oui | non | non |

### 2.10 Taper

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.taper.principle` | BOOLEAN | Vrai (réduction de charge avant l’épreuve) | RE / GP | SUPPORTED | G2 | athlètes d’endurance | course | TAPER | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS + EXT (Wang) | Multi-sports | oui | oui | non |
| `running.taper.volumeReduction` | RANGE | **Signal de preuve 41–60 % (méta-analyses poolées) : non prescriptif** ; valeur par épreuve et niveau à décider | RE | SUPPORTED_WITH_RANGE | G2 | athlètes d’endurance | course | TAPER | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS + EXT (Wang) | Dépendance à l’épreuve et à la charge | oui | oui | non |
| `running.taper.intensityMaintenance` | BOOLEAN | Vrai | RE | SUPPORTED | G2 | athlètes d’endurance | course | TAPER | idem | SS + EXT (Wang) | — | oui | oui | non |
| `running.taper.frequencyMaintenance` | BOOLEAN | Vrai (ou quasi-maintien) | RE | SUPPORTED | G2 | athlètes d’endurance | course | TAPER | idem | SS + EXT (Wang) | — | oui | oui | non |
| `running.taper.durationByEvent` | NUMERIC | — | RE | CONTEXT_DEPENDENT | G2 | tous | 5K / 10K / semi / marathon | TAPER | idem | SS + EXT (Wang) | ≤ 21 j (Wang), ≈ 2 sem. (Bosquet) : pas une constante | oui | oui | non |
| `running.taper.eligibilityPolicy` | POLICY | Seulement avec une épreuve datée et une charge accumulée suffisante | RE / GP | EXPERT_DESIGN_REVIEW | G2 | tous | course | TAPER | — | — | — | oui | oui | non |
| `running.taper.shape` | ENUM | — | RE | INSUFFICIENT_EVIDENCE | G2 | — | — | TAPER | RS-BOSQUET-2007-TAPER | SS | — | oui | oui | non |

### 2.11 Concurrent et démographie

| id | Type | Valeur candidate | Autorité | Statut | Gov | Population | Objectif | Phase | Sources | Vérif. | Incertitude | Prov. | Exp. | Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `running.concurrent.demandProfileTable` | ORDINAL_TABLE | Valeurs ordinales candidates (5B §W) | RE → IM | EXPERT_DESIGN_REVIEW | G2 | P-HYBRID | tous | toutes | — | — | — | oui | oui | non |
| `running.concurrent.noUniversalSpacing` | BOOLEAN | Vrai | IM / GP | CONTEXT_DEPENDENT | G2 | P-HYBRID | tous | toutes | RS-HUIBERTS-2024-CONC | SS | — | oui | oui | non |
| `running.concurrent.proximityBands` | NUMERIC | — (bandes opérationnelles, non biologiques) | IM | PROGRAMMING_HEURISTIC | G2 | P-HYBRID | tous | toutes | — | — | — | oui | oui | non |
| `running.concurrent.sexStatusContext` | POLICY | Contexte d’interprétation, jamais un multiplicateur | IM | CONTEXT_DEPENDENT | G2 | P-HYBRID | tous | toutes | RS-HUIBERTS-2024-CONC | SS | — | oui | oui | non |
| `running.concurrent.hyroxLocomotorPolicy` | POLICY | Comptée comme charge concurrente, sans équivalence en course | IM / GP | EXPERT_DESIGN_REVIEW | G2 | P-HYBRID | HYBRID_RUNNING_SUPPORT | toutes | — | — | — | oui | oui | non |
| `running.concurrent.strengthEconomyBenefit` | POLICY | Signalé au GlobalPlanner | GP | CONTEXT_DEPENDENT | G2 | coureurs | tous | toutes | RS-BLAGROVE-2018-STRECON | SS | — | oui | oui | non |
| `running.placement.heavyLowerOrderPolicy` | POLICY | PREFER_BEFORE_HEAVY_LOWER (souple) | IM / GP | PROGRAMMING_HEURISTIC | G2 | P-HYBRID | tous | toutes | — | — | — | oui | oui | non |
| `running.demographics.noCorrection` | BOOLEAN | Vrai (aucune correction par âge ou par sexe) | RE | TECHNICAL | T | — | — | — | RS-HUIBERTS-2024-CONC | SS | — | oui | non | non |

## 3. Synthèse

Voir le décompte dans [`RUNNING-5B-REPORT.md`](RUNNING-5B-REPORT.md) §4.

- **Aucune valeur numérique de prescription n’est proposée.**
- Le seul chiffre présent est le signal de preuve du taper, marqué non prescriptif.
- Tous les paramètres sont provisoires ; ceux gouvernés G1 exigent un visa de sécurité.
