# RUNNING-SCIENCE-REGISTRY-DRAFT — brouillon du registre scientifique Running

> **Phase 5A : brouillon documentaire.** Aucun code, aucun ruleset, aucune valeur numérique. Il sera transformé en registre typé en 5B, sur le modèle du registre Strength 1.1.0. Le registre Strength n’est pas modifié.

## 1. Vocabulaire (identique à Strength)

**Statuts**

| Statut | Sens |
|---|---|
| SUPPORTED | Soutenu par des synthèses vérifiées, avec une valeur non provisoire |
| SUPPORTED_WITH_RANGE | Valeur dans une plage soutenue par une synthèse confirmée |
| CONTEXT_DEPENDENT | Soutenu selon le contexte (population, objectif, modalité) |
| PROGRAMMING_HEURISTIC | Heuristique de programmation, sans valeur démontrée |
| PRODUCT_GUARDRAIL | Garde-fou produit |
| EXPERT_DESIGN_REVIEW | Choix de conception soumis à revue d’expert |
| SAFETY_SIGNOFF_REQUIRED | Visa de sécurité requis (G1) |
| INSUFFICIENT_EVIDENCE | Preuve insuffisante |
| TECHNICAL | Paramètre technique |

**Niveaux de vérification** : IDENTITY_ONLY < SEARCH_SUMMARY < ABSTRACT_VERIFIED < FULL_TEXT_VERIFIED. Un niveau SEARCH_SUMMARY n’est jamais promu en FULL_TEXT_VERIFIED sans lecture effective.

**Gouvernance** (identique à Strength)

| Code | Portée | Qui valide |
|---|---|---|
| G1 | Sécurité | Relecture de sécurité et référent approuvé |
| G2 | Programmation | Revue d’expert |
| G3 | Préférence produit | Produit |
| T | Technique | Équipe technique |

**Séparation mécanisme / ampleur (`evidenceSplit`)** : un principe peut être SUPPORTED alors que sa valeur numérique est seulement SUPPORTED_WITH_RANGE, CONTEXT_DEPENDENT ou PROGRAMMING_HEURISTIC.

## 2. Champs obligatoires de chaque future constante

`parameterId`, `status`, `governance`, `population`, `outcome`, `sourceIds`, `verificationLevel`, `confidence` (LOW / MEDIUM / HIGH), `uncertainty`, `rationale`, `provisional`, `expertSignoffRequired`, `safetySignoffRequired`.

Règles de cohérence (à tester en 5B, comme le gate scientifique Strength) :
- SUPPORTED exige au moins une source de synthèse, avec `provisional = false`, et un niveau au moins ABSTRACT_VERIFIED pour une valeur en production.
- SAFETY_SIGNOFF_REQUIRED implique `safetySignoffRequired = true` et la gouvernance G1.
- Une entrée sans source ne peut avoir que les statuts PROGRAMMING_HEURISTIC, PRODUCT_GUARDRAIL, EXPERT_DESIGN_REVIEW, SAFETY_SIGNOFF_REQUIRED ou TECHNICAL.
- Toute valeur `provisional = true` bloque le verrou de production.

## 3. Entrées du brouillon

Colonnes abrégées :
- **Gov** : gouvernance ;
- **Vérif.** : niveau de vérification (SS = SEARCH_SUMMARY, ID = IDENTITY_ONLY) ;
- **Conf.** : confiance ;
- **Prov.** : provisional ;
- **Exp. / Séc.** : visa expert et visa sécurité requis.

Toutes les entrées sont `provisional = true` en 5A.

### 3.1 Principes et modèles

| parameterId | status | Gov | population | outcome | sourceIds | Vérif. | Conf. | uncertainty | rationale | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|
| `running.model.separation.performanceVsPrescription` | TECHNICAL | T | toutes | architecture | — | — | HIGH | — | Principe d’architecture (domain spec §B.1) | non / non |
| `running.intensity.domainModel` | CONTEXT_DEPENDENT | G2 | adultes sains | classification de l’intensité | RS-JAMNICK-2020-DOMAINS, RS-ZONE2-VAR | SS | MEDIUM | Pas de cadre consensuel sur la validité des méthodes | Trois domaines + catégories d’usage (§H) | oui / non |
| `running.intensity.uiScaleMapping` | TECHNICAL | G3 | toutes | affichage | — | — | HIGH | — | Table de présentation, non physiologique | non / non |
| `running.intensity.easyCeiling.margin` | EXPERT_DESIGN_REVIEW | G2 | P-R0 à P-R4 | intensité easy | RS-REED-TALKTEST, RS-TALKTEST-SR-CARDIO, RS-ZONE2-VAR | SS | LOW | Talk test surtout validé en populations cardiaques | Plafond sous la frontière 1 estimée ; aucune valeur | oui / non |
| `running.intensity.easyCeiling.mostConservativeSignal` | PROGRAMMING_HEURISTIC | G2 | toutes | intensité easy | — | — | MEDIUM | — | Le plus bas des signaux disponibles (§M.2) | oui / non |
| `running.threshold.definition` | EXPERT_DESIGN_REVIEW | G2 | P-R2 à P-R4 | frontière 2 | RS-GALANRIOJA-2020-CP, RS-JONES-2019-CP | SS | MEDIUM | CP, MLSS, VT2 et RCP non synonymes ; position de Jones débattue | Frontière 2 estimée, en plage (§O) | oui / non |
| `running.threshold.likeMargin` | EXPERT_DESIGN_REVIEW | G2 | P-R2 à P-R4 | cible THRESHOLD_LIKE | RS-GALANRIOJA-2020-CP | SS | LOW | Aucune donnée de marge | Marge sous la frontière 2 | oui / non |
| `running.cs.role` | CONTEXT_DEPENDENT | G2 | P-R2 à P-R4 | frontière heavy / severe ; performance | RS-CSD-SCOPING-2026, RS-JONES-2019-CP | SS | MEDIUM | Pas de consensus sur protocole, modèle ni application | Un signal parmi d’autres (§G) | oui / non |
| `running.cs.protocol.minTrials` | EXPERT_DESIGN_REVIEW | G2 | P-R2 à P-R4 | fiabilité de CS | RS-CSD-SCOPING-2026 | SS | LOW | Nombre et durées d’essais non consensuels | Conditions minimales (§G.3) | oui / non |
| `running.cs.dprime.prescriptionUse` | INSUFFICIENT_EVIDENCE | G2 | — | dosage en domaine sévère | RS-CSD-SCOPING-2026 | SS | LOW | Fiabilité de D’ non établie ici | D’ informatif seulement en V1 | oui / non |
| `running.reference.hierarchy.criteriaOrder` | EXPERT_DESIGN_REVIEW | G2 | toutes | choix de référence | — | — | MEDIUM | Aucune source directe | Tri ordinal : validité > spécificité > récence > fiabilité > accord (§F.2) | oui / non |
| `running.reference.recencyBands` | PROGRAMMING_HEURISTIC | G2 | toutes | confiance de référence | RS-MUJIKA-2000-DETRAIN | SS | LOW | Désentraînement variable selon le niveau | Seuils ordinaux de récence | oui / non |
| `running.reference.conflictTolerance` | PROGRAMMING_HEURISTIC | G2 | toutes | détection de conflit | — | — | LOW | — | Écart au-delà duquel la confiance baisse | oui / non |
| `running.reference.upgradeRequiresPerformance` | PRODUCT_GUARDRAIL | G1 | toutes | hausse d’allure | — | — | HIGH | — | Hausse de référence uniquement sur une nouvelle performance (§F.3) | oui / oui |
| `running.reference.equivalenceModel` | EXPERT_DESIGN_REVIEW | G2 | P-R1 à P-R4 | prédiction inter-distances | — | — | LOW | Aucun modèle vérifié en 5A (VDOT et autres non vérifiés) | Transformateur de référence, confiance dégradée avec la distance | oui / non |
| `running.reference.hrMaxAgeFormula` | INSUFFICIENT_EVIDENCE | G2 | — | FCmax | — | — | LOW | Erreur individuelle attendue | Non utilisée pour borner un domaine | oui / non |
| `running.confidence.prescription.aggregation` | EXPERT_DESIGN_REVIEW | G2 | toutes | confiance de prescription | — | — | MEDIUM | — | Minimum des facteurs limitants, ordinal (§Z.2) | oui / non |
| `running.target.paceRangeWidthByConfidence` | EXPERT_DESIGN_REVIEW | G2 | toutes | cible d’allure | — | — | LOW | — | Plage plus large quand la confiance baisse | oui / non |
| `running.target.priorityByContext` | PROGRAMMING_HEURISTIC | G2 | toutes | priorité de cible | RS-ZONE2-VAR | SS | MEDIUM | — | Table K.2 | oui / non |
| `running.goal.profile` | EXPERT_DESIGN_REVIEW | G2 | P-R1 à P-R4 | déterminants par objectif | — | — | LOW | Aucune synthèse comparant les objectifs | Tableau qualitatif de la domain spec §D | oui / non |

### 3.2 Distribution, séances, charge

| parameterId | status | Gov | population | outcome | sourceIds | Vérif. | Conf. | uncertainty | rationale | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|
| `running.tid.policy` | CONTEXT_DEPENDENT | G2 | P-R1 à P-R4 | VO2peak, TT | RS-OLIVEIRA-2024-TID, RS-ROSENBLAT-2019-POL | SS | MEDIUM | Effet modeste (SMD 0,24 ; IC 0,01–0,48), surtout < 12 sem. et chez les très entraînés ; pas de différence claire sur TT, TTE, VT2/LT2 | Aucune cible « 80/20 » ; orientation par contexte (§L) | oui / non |
| `running.hi.combinedWithContinuous` | CONTEXT_DEPENDENT | G2 | coureurs loisirs | VO2max, économie | RS-GARCIAPINILLOS-2017-HIIT, RS-GONZALEZMOHINO-2020-ECON | SS / ID | MEDIUM | González-Mohíno non extrait | Continu et intermittent complémentaires (§P) | oui / non |
| `running.hi.maxSessionsPerPeriod` | SAFETY_SIGNOFF_REQUIRED | G1 | P-R2 à P-R4 | exposition | — | — | LOW | Aucune valeur soutenue | G1 `R-G1-HI-DENSITY` | oui / oui |
| `running.archetype.demandTable` | EXPERT_DESIGN_REVIEW | G2 | toutes | exigences mécanique, locomotrice, récupération | RS-FREDETTE-2022-INJ | SS | LOW | Ordinal, non mesuré | Taxonomie §I | oui / non |
| `running.longRun.dose` | PROGRAMMING_HEURISTIC | G2 | P-R1 à P-R4 | endurance, tolérance | — | — | LOW | Aucune source marathon vérifiée | Doses par objectif et niveau | oui / non |
| `running.longRun.bound` | SAFETY_SIGNOFF_REQUIRED | G1 | P-R1 à P-R4 | exposition mécanique | RS-FREDETTE-2022-INJ | SS | LOW | Association, pas un seuil | G1 `R-G1-LONGRUN-BOUND` ; aucune part fixe | oui / oui |
| `running.interval.warmupFloor` | PRODUCT_GUARDRAIL | G3 | toutes | durée de séance | — | — | MEDIUM | — | Plancher d’échauffement lors d’une réduction de durée (§J.2) | oui / non |
| `running.load.dimensions` | TECHNICAL | T | toutes | modèle de charge | RS-FOSTER-2001-SRPE | SS | HIGH | — | Dimensions séparées (§Q.1), sans score unique | non / non |
| `running.load.baselineWindows` | PROGRAMMING_HEURISTIC | G2 | toutes | base récente | RS-IMPELLIZZERI-2020-ACWR | SS | LOW | Le choix de fenêtre crée des artefacts (critique de l’ACWR) | Fenêtre récente vs historique | oui / non |
| `running.load.changeAssessment.bounds` | SAFETY_SIGNOFF_REQUIRED | G1 | toutes | exposition | RS-DAMSTED-2018-LOAD, RS-BUIST-2008-GRONORUN, RS-NIELSEN-2014-DANORUN, RS-FREDETTE-2022-INJ | SS | LOW | Pas de seuil universel ; 10 % non protecteur (Buist) ; association > 30 % / 2 sem. chez des débutants (Nielsen) | Bornes de garde-fou, non préventives ; G1 `R-G1-LOAD-INCREASE-BOUND` | oui / oui |
| `running.load.tenPercentRule` | INSUFFICIENT_EVIDENCE | G2 | — | blessure | RS-DAMSTED-2018-LOAD, RS-BUIST-2008-GRONORUN | SS | MEDIUM (contre) | — | **Non utilisée** comme règle scientifique | oui / non |
| `running.load.acwr` | INSUFFICIENT_EVIDENCE | G2 | — | blessure | RS-IMPELLIZZERI-2020-ACWR | SS | MEDIUM (contre) | — | **Non utilisé** comme prédicteur | oui / non |
| `running.progression.singleDominantVariable` | PROGRAMMING_HEURISTIC | G2 | toutes | tolérance | — | — | MEDIUM | — | Une variable dominante par cycle (§X) | oui / non |
| `running.progression.dominantVariableOrder` | EXPERT_DESIGN_REVIEW | G2 | toutes | progression | — | — | LOW | — | Ordre §X.3 | oui / non |
| `running.progression.increments` | PROGRAMMING_HEURISTIC | G2 | par population | progression | — | — | LOW | — | Incréments bornés par la LOAD CHANGE ASSESSMENT | oui / non |
| `running.progression.deload` | PROGRAMMING_HEURISTIC | G2 | toutes | récupération | — | — | LOW | Aucune source vérifiée | Périodique ou conditionnelle, à trancher | oui / non |
| `running.phase.priorities` | EXPERT_DESIGN_REVIEW | G2 | toutes | périodisation | — | — | LOW | — | Priorités par phase, sans multiplicateur (§W) | oui / non |

### 3.3 Taper, reprise, sécurité, concurrent

| parameterId | status | Gov | population | outcome | sourceIds | Vérif. | Conf. | uncertainty | rationale | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|
| `running.taper.principle` | SUPPORTED (principe) | G2 | athlètes d’endurance | TT, TTE | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS | MEDIUM | Méta-analyses multi-sports | Réduire le volume en maintenant intensité et fréquence | oui / non |
| `running.taper.volumeReduction` | SUPPORTED_WITH_RANGE | G2 | athlètes d’endurance | TT, TTE | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS | MEDIUM | Plage 41–60 % multi-sports ; pas de constante | Plage de départ, à ajuster selon l’objectif et la charge | oui / non |
| `running.taper.duration` | CONTEXT_DEPENDENT | G2 | athlètes d’endurance | TT, TTE | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS | LOW | ≤ 21 jours (Wang), environ 2 semaines (Bosquet) ; selon la distance et le niveau | Durée par objectif, non fixée | oui / non |
| `running.taper.shape` | INSUFFICIENT_EVIDENCE | G2 | — | — | RS-BOSQUET-2007-TAPER | SS | LOW | — | Forme non tranchée | oui / non |
| `running.return.caseThresholds` | PROGRAMMING_HEURISTIC | G2 | toutes | classification des interruptions | RS-MUJIKA-2000-DETRAIN | SS | LOW | — | Seuils entre SHORT_BREAK et LONG_BREAK | oui / non |
| `running.return.protocol` | SAFETY_SIGNOFF_REQUIRED | G1 | toutes | reprise | RS-MUJIKA-2000-DETRAIN | SS | LOW | Aucun protocole chiffré vérifié | G1 `R-G1-RETURN-PROTOCOL` | oui / oui |
| `running.replan.noHardStacking` | PRODUCT_GUARDRAIL | G1 | toutes | tolérance | — | — | HIGH | — | Jamais deux séances difficiles empilées pour rattraper | oui / oui |
| `running.safety.painStop` | SAFETY_SIGNOFF_REQUIRED | G1 | toutes | sécurité | — | — | — | — | G1 `R-G1-PAIN-STOP` | oui / oui |
| `running.safety.noviceEntry` | SAFETY_SIGNOFF_REQUIRED | G1 | P-R0 | sécurité, adhérence | RS-BUIST-2008-GRONORUN, RS-NIELSEN-2014-DANORUN | SS | LOW | — | G1 `R-G1-NOVICE-ENTRY` | oui / oui |
| `running.safety.outOfScope` | SAFETY_SIGNOFF_REQUIRED | G1 | — | périmètre | — | — | — | — | G1 `R-G1-OUT-OF-SCOPE` | oui / oui |
| `running.concurrent.noUniversalSpacing` | CONTEXT_DEPENDENT | G2 | P-HYBRID | force, VO2max | RS-HUIBERTS-2024-CONC | SS | MEDIUM | Effets selon le sexe, le statut et l’outcome | Pas d’espacement universel ; délégation à l’InterferenceManager | oui / non |
| `running.concurrent.proximityBands` | PROGRAMMING_HEURISTIC | G2 | P-HYBRID | interférence | — | — | LOW | Bandes opérationnelles, non biologiques | Paramètres de l’InterferenceManager | oui / non |
| `running.concurrent.strengthEconomyBenefit` | CONTEXT_DEPENDENT | G2 | coureurs | économie | RS-BLAGROVE-2018-STRECON | SS | MEDIUM | Ampleur selon la méthode et la vitesse | Information pour le GlobalPlanner | oui / non |
| `running.demographics.noCorrection` | TECHNICAL | T | toutes | — | RS-HUIBERTS-2024-CONC | SS | HIGH | — | Aucune correction par âge ou par sexe | non / non |

## 4. État du brouillon

- **Entrées** : 51.
  - SAFETY_SIGNOFF_REQUIRED : 7 (G1), soit les 7 G1 candidats de la spec charge §R.4 ;
  - PRODUCT_GUARDRAIL : 3 ;
  - SUPPORTED : 1, principe du taper ;
  - SUPPORTED_WITH_RANGE : 1, réduction du volume en taper ;
  - INSUFFICIENT_EVIDENCE : 5, dont trois qui **écartent** une règle usuelle (10 %, ACWR, FCmax par l’âge).
- **Aucune valeur numérique n’est proposée.**
- **Verrou scientifique Running** : NON ÉVALUABLE en 5A (aucun ruleset). Il serait **bloqué** en l’état : toutes les entrées sont `provisional`, les G1 ne sont pas signés, et le niveau maximal est SEARCH_SUMMARY.
