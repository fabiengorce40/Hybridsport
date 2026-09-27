# RUNNING-PARAMETERS-V0 — valeurs candidates gouvernées

> **Mis à jour en 5D** : voir [`RUNNING-PARAMETERS-V1-CANDIDATE.md`](RUNNING-PARAMETERS-V1-CANDIDATE.md).
> - V13 (6 %) et V14 (3 %) : retirés, remplacés par V42 et V43 (multiples de la variabilité typique) ;
> - V21 : devient RecentLoadContext, ce n’est pas une bande de sécurité ;
> - V11 : séparation forte par défaut, plus un absolu ;
> - V26 : renommé `minimumPlannerRunningFrequency` (périmètre produit) ;
> - V02 : bandes chevauchantes ;
> - V38 : Riegel pour une cible ≤ semi ;
> - V28 : marathon 2–3 semaines.

> **Phase 5C, documentation seulement.** Aucun ruleset exécutable, aucun code. Complète [`RUNNING-PARAMETER-REGISTRY-V0.md`](RUNNING-PARAMETER-REGISTRY-V0.md) (5B, 110 paramètres) :
> - les paramètres existants reçoivent ici une **valeur candidate** quand elle peut être proposée ;
> - de nouveaux paramètres sont créés quand le ruleset 5C en a besoin.

## 1. Règles de proposition

- **Statut obligatoire.** Chaque valeur porte un statut : SUPPORTED_WITH_RANGE, CONTEXT_DEPENDENT, PROGRAMMING_HEURISTIC, PRODUCT_GUARDRAIL, EXPERT_DESIGN_REVIEW, SAFETY_SIGNOFF_REQUIRED ou TECHNICAL. **Aucune valeur n’est SUPPORTED.**
- **Justification.** Aucune valeur n’est justifiée par « c’est la norme en coaching ». La justification est :
  - **structurelle** (échelle, mathématique du modèle) ;
  - **dérivée des données de l’athlète** (historique, bandes observées) ;
  - **dérivée d’un autre paramètre** ;
  - ou une **proposition de conception** explicitement nommée comme telle, avec ses modes d’échec.
- **Pas de fausse précision.** Plages plutôt que valeurs uniques ; règles relatives plutôt qu’absolues. Quand une plage est donnée, la sélection suit `running.dose.rangeSelectionPolicy` (V20).
- **Pas de frontière biologique.** Une moyenne ou une association d’étude n’est jamais présentée comme une frontière physiologique : au plus comme un garde-fou produit, désigné comme tel.
- **Paramètre sans valeur.** Il reste **vide** : toute prescription qui en dépend est `PRESCRIPTION_BLOCKED_BY_PARAMETER` ou dégradée **explicitement** (par exemple cible RPE seule, tracée).
- **Mode d’exécution.** Tout est `provisional = true`. Les valeurs sous G1 non signées sont utilisables en mode **CANDIDATE** (goldens), jamais en **PRODUCTION**, selon la même doctrine que le verrou Strength.

**Abréviations**
- Vérif. : SS = SEARCH_SUMMARY (Claude) ; EXT = abstract vérifié par le contre-audit externe ; « — » = aucune source.
- Autorités : RE = RunningEngine ; GP = GlobalPlanner ; IM = InterferenceManager ; PE = ProgressionEngine ; AE = AdaptationEngine.
- Exp. : revue d’expert requise ; Séc. : visa sécurité requis.
- **HIGH_SENS** : sensibilité élevée (voir [`RUNNING-PARAMETER-SENSITIVITY-V0.md`](RUNNING-PARAMETER-SENSITIVITY-V0.md)).

## 2. Valeurs candidates

### 2.1 Cibles d’intensité

| Tag | parameterId | Valeur candidate | Unité | Population / objectif / phase | Autorité | Statut | Sources · Vérif. | Incertitude | Justification | Échec si trop bas | Échec si trop haut | Exp. | Séc. | Sens. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V01 | `running.target.rpeScale` | Échelle CR-10 modifiée, entiers 0–10 (ancrages verbaux de l’échelle) | points | tous | RE / UI | TECHNICAL | RS-FOSTER-2001-SRPE · SS (les ancrages ne sont pas relus en détail) | Traduction française des ancrages | Échelle déjà utilisée pour la sRPE ; toujours disponible sans capteur | — | — | non | non | — |
| V02 | `running.target.rpeByDomain` | EASY_LOW : **plafond 3** ; STEADY (haut MODERATE / bas HEAVY) : **4–5** ; THRESHOLD_LIKE : **5–6** ; SEVERE (répétitions) : **7–8** ; test maximal : **9–10** ; SPRINT_NEUROMUSCULAR : **descripteur** « vite, relâché, jamais maximal » (pas de nombre) | points V01 | tous | RE | EXPERT_DESIGN_REVIEW | RS-FOSTER-2001-SRPE, RS-REED-TALKTEST · SS | Aucune correspondance validée entre RPE et domaine ; chevauchements volontaires (5) | Correspondance de conception entre ancrages verbaux et domaines ; le plafond 3 correspond à « modéré », qui accompagne le descripteur « conversation possible » | Easy trop facile (peu grave) ; qualité sous-dosée | Easy qui glisse vers HEAVY ; qualité qui bascule en sévère | oui | non | **HIGH_SENS** (plafond easy, THRESHOLD_LIKE) |
| V03 | `running.target.paceRangeWidthByConfidence` (5B) | Confiance de prescription HIGH : **±3 %** de l’allure de référence ; MEDIUM : **±6 %** ; LOW : **pas de plage d’allure** (EFFORT) | % d’allure (s/km) | tous | RE | EXPERT_DESIGN_REVIEW | — | Aucune preuve ; valeur opérationnelle | Doit dépasser la variabilité de mesure et d’allure d’une séance ; la largeur double quand la confiance baisse d’un niveau (expression ordinale de l’incertitude) | Fausse précision ; échecs répétés ; conformité artificiellement basse | Cible sans contenu ; dérive de domaine possible | oui | non | **HIGH_SENS** |
| V04 | `running.threshold.likeMargin` (5B) | Plage THRESHOLD_LIKE = **100 à 105 %** de l’allure de la frontière 2 estimée (de l’allure estimée à 5 % plus lent) ; seulement si la frontière 2 a une estimation d’allure (CS corroborée, LAB LT2 ou MLSS) | % d’allure | P-R2–4 | RE | EXPERT_DESIGN_REVIEW | RS-CSD-SCOPING-2026 (SS + EXT), RS-GALANRIOJA-2020-CP · SS | L’incertitude de la frontière 2 elle-même | Rester **à ou sous** la frontière estimée, compte tenu de son incertitude (5B §O) ; aucune preuve de la marge | Marge 0 : dérive vers le sévère si la frontière est surestimée | Glissement vers STEADY ; stimulus visé manqué | oui | non | **HIGH_SENS** |
| V05 | `running.threshold.raceCeilingRule` | Plafond : THRESHOLD_LIKE **jamais plus rapide** que l’allure de la course de 10 km la plus récente (bande RECENT) | règle | P-R2–4 | RE | PROGRAMMING_HEURISTIC | — | — | Une course de 10 km est un effort maximal sur sa durée ; une séance de seuil ne doit pas le dépasser | (sans objet) | (sans objet) | oui | non | — |
| V18 | `running.severe.paceAnchor` | Répétitions SEVERE : allure = course ou contre-la-montre récent de **3 à 5 km** ± largeur V03 ; à défaut, RPE 7–8 (RPE seul) | règle + V03 | P-R2–4 | RE | EXPERT_DESIGN_REVIEW | — | Relation entre la durée des répétitions et l’allure de course | Une performance maximale plus rapide que la frontière 2 est par définition dans le domaine sévère ; évite toute dépendance au VO2max | Sous-dosage sévère | Répétitions trop rapides, échecs | oui | non | MED |

### 2.2 Structure des séances

| Tag | parameterId | Valeur candidate | Unité | Population / objectif / phase | Autorité | Statut | Sources · Vérif. | Incertitude | Justification | Échec si trop bas | Échec si trop haut | Exp. | Séc. | Sens. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V06 | `running.interval.warmupDuration` | **10–15 min** en EASY_LOW avant THRESHOLD, SEVERE, SHORT_INTERVALS, RACE_PACE, HILLS ou TEST ; facultatif avant STEADY ; aucun avant EASY ou LONG | min | P-R1–4 | RE | EXPERT_DESIGN_REVIEW (plancher 10 : PRODUCT_GUARDRAIL) | — | Aucune preuve | Proposition de conception : le temps doit permettre une course facile continue puis, si c’est prévu, un module STRIDES ; bornée par le budget de temps | Préparation courte (effet non documenté) | Temps consommé au détriment du travail | oui | non | MED (durée) |
| V07 | `running.interval.cooldownDuration` | **5–10 min** en EASY_LOW après une séance de qualité | min | P-R1–4 | RE | EXPERT_DESIGN_REVIEW | — | Aucune preuve | Proposition de conception : retour progressif ; peu d’influence sur la charge | — | Temps consommé | oui | non | LOW |
| V08 | `running.interval.recoveryRatio` | Récupération / travail : THRESHOLD INTERVALS **0,20–0,35** ; SEVERE (VO2) **0,5–1,0** ; SHORT_INTERVALS **0,5–1,0** ; mode JOG par défaut, WALK autorisé | ratio | P-R2–4 | RE | EXPERT_DESIGN_REVIEW | — | Aucune preuve vérifiée | Proposition de conception : récupérations courtes au seuil (continuité du stimulus) ; plus longues en sévère (maintien de la qualité) | Seuil qui devient sévère ; répétitions sévères non tenues | Seuil fragmenté ; sévère qui perd sa continuité | oui | non | **HIGH_SENS** |
| V09 | `running.strides.module` | **4–6** répétitions × **15–20 s** ; récupération complète **45–90 s** en marche ou trot | répétitions, s | P-R1–4 (P-R0 exclu) | RE | EXPERT_DESIGN_REVIEW | — | Aucune preuve | Module court de qualité neuromusculaire ; la récupération complète est la philosophie retenue (5B §N) | Effet nul probable (peu grave) | Fatigue, qualité dégradée | oui | non | LOW |
| V19 | `running.dose.historyAnchorPolicy` | Dose d’un archétype = **dernière dose réalisée** du même archétype et de la même famille de structure, dans la bande RECENT (V12), sans retour négatif ; sinon paramètre de première exposition (vide ⇒ BLOCKED) | règle | tous | RE / PE | PROGRAMMING_HEURISTIC | — | — | Ancre la prescription sur les données de l’athlète (5B §F) plutôt que sur une norme | — | — | oui | non | MED |
| V20 | `running.dose.rangeSelectionPolicy` | Quand un paramètre est une plage : **borne prudente par défaut**, c’est-à-dire la plus basse pour les doses de travail, l’échauffement, le retour au calme et le module STRIDES, et la plus haute pour les ratios de récupération ; relevée seulement si le temps disponible et la bande habituelle (V21) le permettent ; la LCA vérifie aussi le **pire cas** (bornes hautes de durée) | règle | tous | RE | PROGRAMMING_HEURISTIC | — | — | Prudence ; aucune fausse précision interne à la plage | Séances un peu courtes | — | oui | non | MED |

### 2.3 Densité, placement, fréquence

| Tag | parameterId | Valeur candidate | Unité | Population / objectif / phase | Autorité | Statut | Sources · Vérif. | Incertitude | Justification | Échec si trop bas | Échec si trop haut | Exp. | Séc. | Sens. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V10 | `running.hi.densityPolicy` (5B) | Séances course HIGH_DEMAND (V30) par 7 jours glissants, **au plus** : P-R0 **0** (G1 NOVICE_ENTRY) ; P-R1 **1** ; P-R2 **2** ; P-R3 **2** ; P-R4 **3**. En P-HYBRID, le GlobalPlanner compte aussi les autres disciplines. | séances | par population | RE / GP | PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW | RS-GARCIAPINILLOS-2017-HIIT · SS | Contexte d’étude (2 à 3 séances HIIT, **combinées** au continu, chez des loisirs), pas un maximum démontré | Garde-fou cohérent avec le seul contexte vérifié ; P-R1 plus prudent ; P-R4 à 3 (confiance moindre) | Stimulus insuffisant pour les objectifs 5K / 10K avancés | Fatigue accumulée ; qualité dégradée | oui | non (G1 hérité pour P-R0) | **HIGH_SENS** |
| V11 | `running.placement.noConsecutiveHighDemand` | *(5D : devenu une séparation forte **par défaut**, exception sur demande du planificateur ; voir V1-CANDIDATE)* Pas deux séances course HIGH_DEMAND sur **deux jours civils consécutifs** (sans durée en heures) | règle | tous | GP / AE | PRODUCT_GUARDRAIL | — | — | Traduction minimale du principe « pas d’empilement » (5B §S) sans espacement horaire | — | Moins de souplesse de placement | oui | non | MED |
| V26 | `running.frequency.minimumPractical` (5B) | **2** séances de course par semaine pour un programme structuré ; en dessous : mode maintien (EASY seulement, HOLD) | séances / semaine | tous | GP | PRODUCT_GUARDRAIL (G3) | — | Aucune source | Avec une seule séance, il n’y a pas de place à la fois pour du volume facile et pour un autre élément ; raison structurelle, non physiologique | Programmes « structurés » vides de sens | Exclusion inutile de personnes à 2 séances | oui | non | MED |

### 2.4 Références et modèle de performance

| Tag | parameterId | Valeur candidate | Unité | Population / objectif / phase | Autorité | Statut | Sources · Vérif. | Incertitude | Justification | Échec si trop bas | Échec si trop haut | Exp. | Séc. | Sens. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V12 | `running.reference.recencyBands` (5B) | Si l’entraînement a continué sans interruption : RECENT **≤ 8 semaines** ; AGING **9–16 semaines** (confiance −1 niveau, revue suggérée) ; STALE **> 16 semaines** (LOW, calibration demandée). Interruption MODERATE depuis la référence : −1 bande ; LONG ou UNKNOWN : STALE. | semaines | tous | RE | PROGRAMMING_HEURISTIC | RS-MUJIKA-2000-DETRAIN · SS | Vitesse de décroissance inconnue ; dépend du niveau | Proposition de conception : environ un bloc d’entraînement ; décroissance contextuelle et non expiration (5B §E) ; l’interruption pèse plus que l’âge (Mujika) | Calibrations trop fréquentes ; adhérence réduite | Références périmées prises pour actuelles | oui | non | **HIGH_SENS** |
| V13 | `running.reference.conflictTolerance` (5B) | Conflit si deux références valides impliquent, à la distance de la décision, des allures qui diffèrent de **plus de la largeur MEDIUM de V03 (6 %)** | % (dérivé) | tous | RE | EXPERT_DESIGN_REVIEW | — | Dépend de V03 | Cohérence interne : un écart plus grand que la plage MEDIUM ne peut pas être absorbé par elle | Conflits permanents | Conflits réels ignorés | oui | non | MED |
| V14 | `running.reference.substantialUpgradeBound` (5B) | Hausse **substantielle** = amélioration d’allure de référence **> la largeur HIGH de V03 (3 %)**, ou toute hausse depuis STALE | % (dérivé) | tous | RE | EXPERT_DESIGN_REVIEW | — | Dépend de V03 | Une hausse plus grande que la plage HIGH change la cible au-delà de son incertitude | Hausses mineures bloquées | Hausses importantes sur preuve faible | oui | non | MED |
| V15 | `running.reference.coherentTrainingEvidence` (nouveau ; valorise `trainingObservationUpgradeRule` 5B) | **COHERENT_TRAINING_EVIDENCE** = au moins **3** observations sur au moins **2** semaines distinctes, même domaine et même famille de structure, contexte déclaré comparable (sans chaleur, dénivelé ou terrain signalés), conformité WITHIN ou ABOVE, sRPE non supérieure à la plage RPE du domaine (V02), aucune observation contradictoire dans la fenêtre. Autorise une hausse jusqu’à la confiance **MEDIUM** au plus. | observations, semaines | P-R1–4 | RE | EXPERT_DESIGN_REVIEW | — | Aucune preuve | Plusieurs jours et au moins deux semaines limitent l’effet d’une bonne journée isolée (B1 5B) | Hausses sur fluctuation | Capacité réelle jamais reconnue sans test | oui | non | MED |
| V16 | `running.cs.minTrialsPolicy` (5B) | **≥ 3** essais pour une confiance CS supérieure à MEDIUM ; **2** essais ⇒ plafonnée à MEDIUM | essais | P-R2–4 | RE | TECHNICAL (raison mathématique) + EXPERT_DESIGN_REVIEW | RS-CSD-SCOPING-2026 · SS + EXT | Nombre optimal non consensuel | Deux points s’ajustent toujours exactement à un modèle à deux paramètres : aucun résidu, donc aucun contrôle d’ajustement | — | CS rarement disponible | oui | non | LOW |
| V17 | `running.cs.corroborationRequirement` (5B) | CS **corroborée** si son allure est **plus lente** que l’allure de la course récente la plus courte utilisée et **plus rapide** que celle d’une course récente plus longue (par exemple un semi) ; sinon, non corroborée | règle | P-R2–4 | RE | EXPERT_DESIGN_REVIEW | RS-JONES-2019-CP · SS | Cohérence interne au modèle CS seulement | Dans le modèle, les efforts plus longs que la durée tenable à CS sont plus lents que CS, les plus courts plus rapides | — | — | oui | non | LOW |
| V29 | `running.confidence.singleObservationCap` (5B) | **MEDIUM** | ordinal | tous | RE | EXPERT_DESIGN_REVIEW | — | — | Hypothèse 5A conservée | — | — | oui | non | LOW |

### 2.5 Charge et demande

| Tag | parameterId | Valeur candidate | Unité | Population / objectif / phase | Autorité | Statut | Sources · Vérif. | Incertitude | Justification | Échec si trop bas | Échec si trop haut | Exp. | Séc. | Sens. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V21 | `running.load.baselineWindows` (5B) | Par dimension : bande habituelle = **[min, max] des 4 semaines complètes précédentes** ; base = médiane. Dimension UNKNOWN sur ces semaines ⇒ bande UNKNOWN. | semaines | tous | RE | PROGRAMMING_HEURISTIC | RS-IMPELLIZZERI-2020-ACWR (critique des fenêtres) · SS | Choix de fenêtre arbitraire ; **pas un ratio** | Dérivée des données de l’athlète ; quatre semaines absorbent une semaine manquée ; aucune valeur de charge inventée | Bande instable (une semaine atypique domine) | Réactivité faible aux changements récents | oui | non | MED |
| V22 | `running.load.changeCategoryBounds` (5B ; plancher LARGE) | P-R0 et P-R1 : distance **ou** durée hebdomadaire prévue **> 130 %** de la valeur de deux semaines plus tôt ⇒ LARGE_INCREASE (refusé). P-R2 et plus : **vide** (EXPERT_DESIGN_REVIEW). | % sur 2 semaines | P-R0–1 | RE | PRODUCT_GUARDRAIL (+ G1 NOVICE_ENTRY en P-R0, borne la plus stricte) | RS-NIELSEN-2014-DANORUN, RS-BUIST-2008-GRONORUN, RS-DAMSTED-2018-LOAD · SS | **Association observationnelle, pas un seuil**, et selon le type de blessure | Garde-fou produit : le moteur ne propose pas de hausse dans la catégorie où une association défavorable a été rapportée chez des débutants ; **ni frontière biologique, ni zone sûre en dessous** | Progression bloquée pour des débutants qui toléreraient plus | Hausses brutales acceptées | oui | oui en P-R0 (via G1) | **HIGH_SENS** |
| V23 | `running.progression.magnitudeClassBounds` | **VIDE** (SMALL / MODERATE / LARGE restent des libellés opérationnels) | — | tous | PE | EXPERT_DESIGN_REVIEW | — | Aucune base défendable | Aucune valeur raisonnablement justifiable (5C §U) | — | — | oui | non | — |
| V30 | `running.demand.highDemandDefinition` | HIGH_DEMAND si **au moins une** condition : travail en THRESHOLD_LIKE ou SEVERE (toute quantité tant que V31 est vide : défaut conservateur **tracé**) ; test maximal ; LONG_RUN désignée (défaut conservateur tant que V32 est vide) ; HILL_REPETITIONS ; `mechanicalDemand` ≥ HIGH. **Jamais** HIGH_DEMAND : EASY (y compris module STRIDES), STEADY et PROGRESSION sans portion THRESHOLD_LIKE. | règle | tous | RE | EXPERT_DESIGN_REVIEW | — | — | Définition par le contenu, pas par le nom de l’archétype (5C §S) | — | — | oui | non | MED |

### 2.6 Reprise et taper

| Tag | parameterId | Valeur candidate | Unité | Population / objectif / phase | Autorité | Statut | Sources · Vérif. | Incertitude | Justification | Échec si trop bas | Échec si trop haut | Exp. | Séc. | Sens. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V24 | `running.return.stateBoundaries` (5B) | SHORT **≤ 7 jours** ; MODERATE **8–27 jours** ; LONG **≥ 28 jours** ; **UNKNOWN** si la durée ou la continuité est inconnue (**jamais converti**) | jours | tous | RE | SAFETY_SIGNOFF_REQUIRED (frontière LONG, G1) + PROGRAMMING_HEURISTIC (SHORT / MODERATE) | RS-MUJIKA-2000-DETRAIN · SS | Catégories opérationnelles ; « 4 semaines » reprend la **convention de classement** de la revue (désentraînement de court terme < 4 semaines), **pas une frontière physiologique** ; 7 jours = une semaine de planification | — | Reprises trop prudentes (adhérence) | Reprises trop rapides après une longue coupure | oui | **oui** | **HIGH_SENS** |
| V25 | `running.return.resumeCondition` | La progression reprend après **≥ 2** séances réalisées depuis le retour, sans signal de douleur et avec `unexpectedDifficulty` ≠ MUCH_HARDER | séances | tous | PE | PROGRAMMING_HEURISTIC (G1 pour LONG / UNKNOWN) | — | — | Plus d’une observation avant de reprendre (même logique que V15) | Reprise sur une seule bonne séance | Reprise retardée inutilement | oui | oui (LONG / UNKNOWN) | MED |
| V27 | `running.taper.volumeReduction` (5B) | **Signal de preuve 41–60 %** (méta-analyses poolées, multi-sports) ; valeur par épreuve et par niveau **VIDE** (EXPERT_DESIGN_REVIEW) ; utilisé dans les goldens **comme plage seulement**, jamais comme valeur imposée | % de volume | athlètes d’endurance, épreuve datée | RE | SUPPORTED_WITH_RANGE (plage de preuve) / CONTEXT_DEPENDENT (application) | RS-WANG-2023-TAPER (SS + EXT), RS-BOSQUET-2007-TAPER · SS | Multi-sports ; dépendance à l’épreuve et à la charge non établie | Seule plage vérifiée | Taper insuffisant (fatigue résiduelle) | Désentraînement relatif, perte de spécificité | oui | non | **HIGH_SENS** |

### 2.7 Paramètres volontairement VIDES (bloquants)

| Tag | parameterId | Statut | Effet quand requis |
|---|---|---|---|
| V23 | `running.progression.magnitudeClassBounds` | EXPERT_DESIGN_REVIEW | Aucune hausse chiffrée : HOLD (`PROG.HOLD_MAGNITUDE_UNDEFINED`) ou changement à dose égale |
| V28 | `running.taper.durationByEvent` | CONTEXT_DEPENDENT | Début du taper non déterminable ; seule la dernière semaine avant l’épreuve est traitée (elle est incluse dans toute durée candidate ≥ 1 semaine) |
| V31 | `running.demand.minimumQualityDose` | EXPERT_DESIGN_REVIEW | Défaut conservateur : toute quantité de travail THRESHOLD_LIKE ou SEVERE rend la séance HIGH_DEMAND |
| V32 | `running.longRun.demandMargin` | EXPERT_DESIGN_REVIEW | Défaut conservateur : toute LONG_RUN désignée est HIGH_DEMAND |
| V33 | `running.safety.noviceEntryDose` | EXPERT_DESIGN_REVIEW sous G1 NOVICE_ENTRY | Doses P-R0 : PRESCRIPTION_BLOCKED_BY_PARAMETER |
| V34 | `running.return.protocol` (5B, G1) : composante « dose de départ », sans identifiant séparé | SAFETY_SIGNOFF_REQUIRED | Dose de départ après LONG / UNKNOWN : PRESCRIPTION_BLOCKED_BY_PARAMETER |
| V35 | `running.threshold.firstExposureDose` | EXPERT_DESIGN_REVIEW | THRESHOLD sans historique : BLOCKED (structure décrite, dose absente) |
| V36 | `running.severe.firstExposureDose` | EXPERT_DESIGN_REVIEW | SEVERE sans historique : BLOCKED |
| V37 | `running.hill.repDuration`, `running.hill.gradeInstruction` | EXPERT_DESIGN_REVIEW | HILL_REPETITIONS sans historique : BLOCKED ; **aucune pente universelle** |
| V38 | `running.performance.extrapolationModelFamily` (+ exposant) | EXPERT_DESIGN_REVIEW | Allure d’une distance non encadrée (semi depuis un 10K, marathon depuis un semi) : pas d’allure ⇒ RPE seul |
| V39 | `running.longRun.specificPortionPolicy` (5B), cas sans historique | EXPERT_DESIGN_REVIEW | Portion spécifique sans historique : BLOCKED ; avec historique : V19 |
| V40 | `running.easy.ceilingMargin` (allure) | EXPERT_DESIGN_REVIEW | Plafond d’allure easy seulement si une frontière 1 est mesurée (LAB) ; sinon RPE seul |
| V41 | `running.severe.boutDurationDefault` | EXPERT_DESIGN_REVIEW | Durée des répétitions sévères : historique (V19) seulement |

## 3. Nouveaux paramètres de politique (sans nombre)

| parameterId | Contenu | Statut | Gov |
|---|---|---|---|
| `running.eligibility.decisionPolicy` | `SessionEligibilityDecision` (ruleset §G) : ELIGIBLE_FULL_TARGET / ELIGIBLE_BROAD_TARGET / ELIGIBLE_RPE_ONLY / NOT_ELIGIBLE, décidée **séparément** de la confiance | EXPERT_DESIGN_REVIEW | G2 |
| `running.eligibility.targetClassByConfidence` | FULL si la confiance de prescription est HIGH ; BROAD si MEDIUM, ou si une borne dérivée existe (V05) ; RPE_ONLY sinon | EXPERT_DESIGN_REVIEW | G2 |
| `running.target.noWearableMode` | NO_WEARABLE : cible RPE prioritaire ; allure affichée seulement comme information ; retours manuels (durée, RPE, complétion) ; distance UNKNOWN si non déclarée | TECHNICAL | T |
| `running.load.withinBandRule` | Une dimension dans sa bande habituelle (V21) est WITHIN_HABITUAL ; une hausse hors bande sur une seule dimension, avec des bornes de magnitude vides, est INCREASE_UNCLASSIFIED, admise seulement si c’est la variable dominante ou l’effet d’un test demandé, et sous tout garde-fou | PROGRAMMING_HEURISTIC | G2 |
| `running.week.compositionPolicy` | Ruleset §R (ordre de remplissage des séances) | EXPERT_DESIGN_REVIEW | G2 |
| `running.week.rebalanceRule` | Si la semaine dépasse la bande habituelle d’une dimension non dominante, les séances EASY sont raccourcies d’abord (jamais la séance KEY) | PROGRAMMING_HEURISTIC | G2 |
| `running.replan.missedDecisionTable` | Ruleset §W | PROGRAMMING_HEURISTIC | G2 |
| `running.test.eligibility` | Ruleset §Q | EXPERT_DESIGN_REVIEW | G2 |
| `running.progressionRun.selection` | Au catalogue ; **non sélectionné automatiquement en V1** (ruleset §P) | PROGRAMMING_HEURISTIC | G2 |

## 4. Décompte

| Élément | Nombre |
|---|---|
| Paramètres du registre 5B | 110 |
| Nouveaux paramètres de valeur 5C | 14 : `rpeScale`, `rpeByDomain`, `raceCeilingRule`, `severe.paceAnchor`, `warmupDuration`, `cooldownDuration`, `recoveryRatio`, `strides.module`, `dose.historyAnchorPolicy`, `dose.rangeSelectionPolicy`, `placement.noConsecutiveHighDemand`, `coherentTrainingEvidence`, `demand.highDemandDefinition`, `return.resumeCondition` |
| Nouveaux paramètres volontairement vides | 7 : `demand.minimumQualityDose`, `longRun.demandMargin`, `threshold.firstExposureDose`, `severe.firstExposureDose`, `hill.repDuration`, `hill.gradeInstruction`, `severe.boutDurationDefault` |
| Nouveaux paramètres de politique (§3) | 9 (la structure conservatrice UNKNOWN est la **valeur** du paramètre G1 existant `running.return.unknownStateHandling`, pas un nouveau paramètre) |
| **Total gouverné** | **140** |
| Tags valorisés en 5C | **28** (V01–V22, V24–V27, V29, V30), dont **21 chiffrés** (V01–V04, V06–V10, V12–V16, V18, V21, V22, V24–V27) et **7 règles ou valeurs ordinales** (V05, V11, V17, V19, V20, V29, V30) |
| Statut principal des 28 valeurs | EXPERT_DESIGN_REVIEW 14 · PROGRAMMING_HEURISTIC 6 · PRODUCT_GUARDRAIL 4 · TECHNICAL 2 · SAFETY_SIGNOFF_REQUIRED 1 · SUPPORTED_WITH_RANGE 1 · SUPPORTED 0 |
| Tags laissés vides (bloquants) | 13 (§2.7) |
| Paramètres NUMERIC / RANGE du registre 5B encore vides | voir le rapport §4 |
