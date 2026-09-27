# RUNNING-PARAMETERS-V1-CANDIDATE — paramètres chiffrés après arbitrage 5D

> **Corrections 5E** :
> - V42 devient une estimation contextuelle (RunningPerformanceVariabilityEstimate) ;
> - V38 sépare paramètre, incertitude et conflit ; l’exposant n’est pas verrouillé ;
> - V28m est explicitement observationnel ;
> - V43 conserve ses multiples, appliqués à l’estimation de variabilité.
>
> Aucune nouvelle valeur numérique.

> **Phase 5D.** Remplace les valeurs de [`RUNNING-PARAMETERS-V0.md`](RUNNING-PARAMETERS-V0.md) pour les paramètres listés ici. Tous les autres paramètres V0 sont inchangés.
>
> **Provenance** :
> - SOURCE_DERIVED ;
> - SOURCE_INFORMED : mécanisme ou ordre de grandeur soutenu, pas la valeur exacte ;
> - EXPERT_PROPOSED ;
> - PRODUCT_GUARDRAIL ;
> - TECHNICAL.
>
> Jamais « scientifique » tout court. Tout reste `provisional = true`.

## 1. Paramètres chiffrés retenus

| Tag | parameterId | Valeur candidate | Changement 5D | Provenance | Statut | Sources | Vérif. | Sens. |
|---|---|---|---|---|---|---|---|---|
| V01 | `running.target.rpeScale` | CR-10 modifiée, 0–10 (une seule échelle, pas de Borg 6–20) | RETENU | TECHNICAL | TECHNICAL | RS-FOSTER-2001-SRPE | SS | — |
| V02 | `running.target.rpeByDomain` | EASY_LOW plafond **3** ; STEADY **3–5** ; THRESHOLD_LIKE **5–7** ; SEVERE **7–9** ; test **9–10** ; SPRINT : descripteur. **Chevauchements volontaires** ; toujours combiné au contexte et aux autres signaux | **MODIFIÉ** (bandes élargies et chevauchantes, B8) | EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | RS-FOSTER-2001-SRPE, RS-REED-TALKTEST | SS | **HIGH** |
| V03 | `running.target.paceRangeWidthByConfidence` | HIGH ±3 % ; MEDIUM ±6 % ; LOW : pas d’allure | RETENU | SOURCE_INFORMED (Hopkins 2001 : CV entre courses 1,2–4,2 %) + EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | RS-HOPKINS-2001-VAR | SS | **HIGH** |
| V04 | `running.threshold.likeMargin` | 100–105 % de l’allure de la frontière 2 estimée | RETENU | EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | RS-CSD-SCOPING-2026 | SS + EXT | **HIGH** |
| V06 | `running.interval.warmupDuration` | 10–15 min (plancher 10 : PRODUCT_GUARDRAIL) | RETENU | EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | — | — | MED |
| V07 | `running.interval.cooldownDuration` | 5–10 min | RETENU | EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | — | — | LOW |
| V08 | `running.interval.recoveryRatio` | THRESHOLD 0,20–0,35 ; SEVERE 0,5–1,0 ; SHORT 0,5–1,0 (récupération / travail), par type de séance | RETENU | SOURCE_INFORMED (mécanisme) + EXPERT_PROPOSED (valeurs) | EXPERT_DESIGN_REVIEW | RS-HIIT-METAREG (PARTIAL), RS-HIIT-SHORTLONG | SS | **HIGH** |
| V09 | `running.strides.module` | 4–6 × 15–20 s ; récupération 45–90 s | RETENU | EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | — | — | LOW |
| V10 | `running.hi.densityPolicy` | P-R0 0 ; P-R1 1 ; P-R2 2 ; P-R3 2 ; P-R4 3 séances HD par 7 jours | RETENU | PRODUCT_GUARDRAIL (informé par RS-GARCIAPINILLOS-2017-HIIT) | PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW | RS-GARCIAPINILLOS-2017-HIIT | SS | **HIGH** |
| V11 | `running.placement.strongDefaultSeparation` (ex-`noConsecutiveHighDemand`) | Par défaut, pas de séances HD sur des jours consécutifs ; exception seulement sur demande du GlobalPlanner (P-R3+), jamais générée par le moteur en V1 | **MODIFIÉ** (retrait de l’absolu, B6) | PRODUCT_GUARDRAIL | PRODUCT_GUARDRAIL / PROGRAMMING_HEURISTIC | — | — | MED |
| V12 | `running.reference.recencyBands` | RECENT ≤ 8 sem. ; AGING 9–16 ; STALE > 16 (sous condition de continuité) | RETENU | EXPERT_PROPOSED | PROGRAMMING_HEURISTIC | RS-MUJIKA-2000-DETRAIN | SS | **HIGH** |
| V15 | `running.reference.coherentTrainingEvidence` | Défaut configurable **3 observations / 2 semaines** + règle qualitative de cohérence obligatoire | RETENU (requalifié, B3) | EXPERT_PROPOSED | PROGRAMMING_HEURISTIC | — | — | MED |
| V16 | `running.cs.minTrialsPolicy` | ≥ 3 essais pour une confiance au-dessus de MEDIUM | RETENU | TECHNICAL (deux points s’ajustent toujours exactement) | TECHNICAL | RS-CSD-SCOPING-2026 | SS + EXT | LOW |
| V18 | `running.severe.paceAnchor` | Course de 3 à 5 km ± V03 | RETENU | EXPERT_PROPOSED | EXPERT_DESIGN_REVIEW | — | — | MED |
| V21 | `running.load.recentLoadContext` (ex-`baselineWindows`, bande min / max) | N = 4 semaines ; médiane = niveau typique ; maximum démontré sans retour négatif ; semaine manquante = UNKNOWN ; moins de 2 semaines connues ⇒ UNKNOWN | **MODIFIÉ** (B4) | EXPERT_PROPOSED | PROGRAMMING_HEURISTIC | RS-IMPELLIZZERI-2020-ACWR (mise en garde) | SS | MED |
| V22 | `running.load.changeCategoryBounds` | P-R0–1 : > 130 % sur 2 semaines ⇒ LARGE ⇒ **proposition plafonnée** (pas de falaise) ; P-R2+ : vide | RETENU (requalifié : saut de programme, erreur de donnée) | PRODUCT_GUARDRAIL | PRODUCT_GUARDRAIL | RS-NIELSEN-2014-DANORUN | SS | **HIGH** |
| V24 | `running.return.stateBoundaries` | SHORT ≤ 7 j ; MODERATE 8–27 j ; LONG ≥ 28 j ; UNKNOWN jamais converti | RETENU | SOURCE_INFORMED (convention de classement de Mujika) | SAFETY_SIGNOFF_REQUIRED (frontière LONG) | RS-MUJIKA-2000-DETRAIN | SS | **HIGH** |
| V25 | `running.return.resumeCondition` | ≥ 2 séances post-retour sans signal | RETENU | EXPERT_PROPOSED | PROGRAMMING_HEURISTIC | — | — | MED |
| V26 | `running.frequency.minimumPlannerRunningFrequency` (renommé) | 2 : périmètre V1 d’un programme structuré complet ; **ne dit rien de l’effet d’une séance hebdomadaire** | **RENOMMÉ** (valeur inchangée, B5) | PRODUCT_GUARDRAIL | PRODUCT_GUARDRAIL | — | — | MED |
| V27 | `running.taper.volumeReduction` | **Réduction** de volume 41–60 % (volume restant = 40–59 %) ; non imposée à toutes les épreuves | RETENU | SOURCE_DERIVED (plage) | SUPPORTED_WITH_RANGE / CONTEXT_DEPENDENT | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS + EXT | **HIGH** |

## 2. Nouveaux paramètres chiffrés

| Tag | parameterId | Valeur candidate | Provenance | Statut | Sources | Sens. |
|---|---|---|---|---|---|---|
| V42 | `running.reference.performanceVariabilityEstimate` *(corrigé en 5E : **RunningPerformanceVariabilityEstimate**, plus une constante universelle)* | Estimation **contextuelle** : (1) si l’athlète a assez de performances répétées comparables ⇒ **variabilité personnelle** (le nombre minimal est DECISION_REQUIRED) ; (2) sinon, un **a priori** informé par Hopkins 2001, **selon la distance** (courses courtes ou route : 1,2–1,9 % chez les plus rapides ; semi : 2,7–4,2 % ; marathon : 2,6 %) et **selon le niveau** (coureurs plus lents : rapport des CV 1,0–2,3). La confiance est réduite quand l’estimation n’est pas personnelle. Le sexe n’est **pas** utilisé (effet non établi par la source). L’âge (jeunes adultes plus variables, rapport 1,1–1,8) est **non utilisé** tant qu’E-VARIABILITY ne le décide pas. **Repli produit** (anciennes valeurs 2 / 3 / 4 %) : PRODUCT_GUARDRAIL / EXPERT_PROPOSED, signalé, soumis à décision. | SOURCE_INFORMED (a priori) + EXPERT_PROPOSED (repli) | EXPERT_DESIGN_REVIEW | RS-HOPKINS-2001-VAR (EXT_ABSTRACT) | **HIGH** |
| V43 | `running.reference.conflictSeverity` | NONE ≤ 1 × V42 ; MINOR 1–2 × V42 (enveloppe) ; MAJOR > 2 × V42 (estimation prudente + calibration) | EXPERT_PROPOSED | PROGRAMMING_HEURISTIC | RS-HOPKINS-2001-VAR | **HIGH** |
| V38 | `running.performance.extrapolationModelFamily` (+ exposant) | *(5E)* Riegel **candidat** pour une cible ≤ semi, **non verrouillé**. On distingue trois choses : (a) le **paramètre du modèle** : exposant **non verrouillé** (1,06 usuel, provenance non vérifiée, DECISION_REQUIRED) ; (b) l’**incertitude de prédiction** : sortie obligatoire en plage, dont la largeur relève d’E-MODEL (la plage ±6 % de V03 n’est **pas** réutilisée par défaut) ; (c) la **gravité d’un conflit** : V43, sans rapport. Jamais d’autorité pour le marathon. | SOURCE_INFORMED (Vickers 2016) ; valeur de l’exposant : IDENTITY_ONLY | EXPERT_DESIGN_REVIEW | RS-VICKERS-2016-PRED | **HIGH** |
| V28m | `running.taper.durationByEvent` (marathon) | **2–3 semaines**, jamais « 21 jours obligatoires » | SOURCE_INFORMED (Smyth 2021, **observationnel**, texte intégral vérifié par le contre-audit ; Bosquet ; Wang) | CONTEXT_DEPENDENT | RS-SMYTH-2021-TAPER, RS-BOSQUET-2007-TAPER, RS-WANG-2023-TAPER | MED |

## 3. Valeurs retirées

| Tag | Ancienne valeur | Remplacée par |
|---|---|---|
| V13 | Conflit si l’écart dépasse **6 %** (constante) | V43 (multiples de V42) |
| V14 | Hausse substantielle si elle dépasse **3 %** (constante) | Règle de mise à jour rapportée à V42 (arbitrage B2) |
| V21 (partie) | Borne basse (min) de la « bande habituelle » | Aucune : le contexte n’a pas de plancher |

## 4. Paramètres non résolus (vides)

| Tag | Paramètre | Raison | Gouvernance |
|---|---|---|---|
| V23 | Magnitude de progression | Aucune magnitude universelle ; restauration et baisse démontrables sans elle | EXPERT_DESIGN_REVIEW |
| V31 | Dose minimale de qualité | Aucun minimum universel ; familles propres à chaque type de séance | EXPERT_DESIGN_REVIEW |
| V32 | Marge et borne du long run | Aucune borne défendable | EXPERT_DESIGN_REVIEW |
| V33 | Dose d’entrée novice | Aucune dose validée (précédent GRONORUN présenté comme option) | **G1** |
| V34 | Dose de reprise longue | Aucune dose défendable | **G1** |
| V35 / V36 / V37 | Premières expositions (seuil, sévère, côtes ; pente) | Aucune preuve | EXPERT_DESIGN_REVIEW |
| V28 | Durée du taper pour 5K, 10K et semi | Aucune preuve propre à l’épreuve | CONTEXT_DEPENDENT |
| V39 | Portion spécifique sans historique | — | EXPERT_DESIGN_REVIEW |
| V40 | Marge d’allure du plafond easy | Frontière 1 rarement mesurée | EXPERT_DESIGN_REVIEW |
| V41 | Durée par défaut des répétitions sévères | — | EXPERT_DESIGN_REVIEW |

## 5. Décompte

| Élément | Nombre |
|---|---|
| Chiffrés retenus sans changement de valeur | 17 (V01, V03, V04, V06–V10, V12, V15, V16, V18, V22, V24–V27 ; V26 renommé) |
| Chiffrés modifiés | 2 (V02, V21) ; plus V11 requalifié (règle, non chiffrée) |
| Chiffrés retirés | 2 (V13, V14) |
| Nouveaux chiffrés | 4 (V42, V43, V38, V28m) |
| **Total chiffrés actifs** | **23** |
| Non résolus | 12 tags (V23, V31–V37, V28 hors marathon, V39–V41) |

**Provenance des 23 valeurs chiffrées actives**

| Provenance | Nombre | Tags |
|---|---|---|
| SOURCE_DERIVED | **1** | V27 |
| SOURCE_INFORMED | **6** | V03, V08, V24, V42, V38, V28m |
| EXPERT_PROPOSED | **11** | V02, V04, V06, V07, V09, V12, V15, V18, V21, V25, V43 |
| PRODUCT_GUARDRAIL | **3** | V10, V22, V26 |
| TECHNICAL | **2** | V01, V16 |

Paramètres gouvernés au total : **142** (140 en 5C + V42 + V43 ; V38, V28 et V21 existaient déjà).
