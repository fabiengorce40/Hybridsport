# RUNNING-SCIENCE-REGISTRY-V1 — registre scientifique Running (sources et arbitrage des 75 questions)

> **Phase 5B, documentation seulement.** Remplace [`RUNNING-SCIENCE-REGISTRY-DRAFT.md`](RUNNING-SCIENCE-REGISTRY-DRAFT.md), conservé comme trace de la 5A. Le registre Strength n’est pas modifié.
>
> Vocabulaire identique à Strength : statuts SUPPORTED … TECHNICAL ; niveaux IDENTITY_ONLY < SEARCH_SUMMARY < ABSTRACT_VERIFIED < FULL_TEXT_VERIFIED ; gouvernance G1 (sécurité), G2 (expert), G3 (produit), T (technique).

## 1. Provenance : qui a vérifié quoi

- `claudeVerificationLevel` : ce que Claude a lu. PubMed et EuropePMC restent inaccessibles (proxy : connexion refusée, contrôlé en 5B). Le maximum est donc **SEARCH_SUMMARY**.
- `externalVerification` : ce que le contre-audit externe déclare avoir vérifié. `EXT_ABSTRACT` = **EXTERNAL_COUNTER_AUDIT_VERIFIED** au niveau abstract. Claude ne l’a pas relu et ne s’en attribue pas la vérification.

## 2. Sources

| ID | Référence | Type | Identité | claudeVerificationLevel | externalVerification | Constats utilisables | Limites |
|---|---|---|---|---|---|---|---|
| RS-CSD-SCOPING-2026 | Scoping review CS/D’ en course. *Sports Med* 2026. PMID 41931241 | Scoping review | CONFIRMED par le contre-audit (auteurs non relevés par Claude) | SEARCH_SUMMARY | **EXT_ABSTRACT** | 124 études ; CS = frontière physiologiquement pertinente heavy / severe ; pas de consensus sur le protocole ni le modèle optimaux | Scoping review : pas de synthèse quantitative |
| RS-OLIVEIRA-2024-TID | Oliveira, Boppre, Fonseca. *Sports Med* 2024. PMID 38717713 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | **EXT_ABSTRACT** | 17 études, 437 participants ; avantage du polarisé sur le VO2peak dans certains contextes (moins de 12 semaines, très entraînés d’après le résumé de recherche) ; pas de supériorité claire sur tous les résultats de performance | Effet modeste ; sous-groupes |
| RS-WANG-2023-TAPER | Wang et al. *PLoS One* 2023. PMID 37163550 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | **EXT_ABSTRACT** | 14 études ; soutien au principe du taper ; signal de réduction du volume autour de 41–60 % en preuve poolée, **pas une prescription universelle** | Multi-sports d’endurance |
| RS-GONZALEZMOHINO-2020-ECON | González-Mohíno et al. *Sports Med* 2020;50:283–294 (PMID 31606879 non confirmé) | Revue systématique | PARTIAL | IDENTITY_ONLY | NONE | — (résultats non extraits) | Inutilisable pour une conclusion |
| RS-GARCIAPINILLOS-2017-HIIT | García-Pinillos et al. *J Sport Health Sci* 2017. PMID 30356547 | Revue | CONFIRMED | SEARCH_SUMMARY | NONE | HIIT (2 à 3 par semaine) combiné au continu : VO2max et économie améliorés chez les loisirs | Fréquence = contexte d’étude, pas une constante |
| RS-DAMSTED-2018-LOAD | Damsted et al. *IJSPT* 2018. PMID 30534459 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | NONE | Preuves très limitées ; pas de seuil de 10 % ; pas de différence entre 10 % et 24 % | 4 articles |
| RS-HUIBERTS-2024-CONC | Huiberts, Wüst, van der Zwaard. *Sports Med* 2024 | Méta-analyse | CONFIRMED (PMID non relevé) | SEARCH_SUMMARY | NONE | 59 études, 1346 participants ; effets selon le sexe, le statut et l’outcome | Concurrent en général, pas spécifique à la course |
| RS-BUIST-2008-GRONORUN | Buist et al. *AJSM* 2008. PMID 17940147 | ECR | CONFIRMED | SEARCH_SUMMARY | NONE | Règle des 10 % : blessures 20,8 % contre 20,3 % | Débutants |
| RS-NIELSEN-2014-DANORUN | Nielsen et al. *JOSPT* 2014 | Cohorte | CONFIRMED | SEARCH_SUMMARY | NONE | Plus de 30 % sur 2 semaines associé à des blessures liées à la distance (vs moins de 10 %), selon le type de blessure | Association ; débutants |
| RS-FREDETTE-2022-INJ | Fredette et al. *J Athl Train* 2022 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | NONE | Preuves contradictoires ; distances plus longues associées | Hétérogénéité |
| RS-IMPELLIZZERI-2020-ACWR | Impellizzeri et al. *IJSPP* 2020 | Analyse critique | CONFIRMED | SEARCH_SUMMARY | NONE | ACWR non soutenu pour gérer le risque de blessure | — |
| RS-BOSQUET-2007-TAPER | Bosquet et al. 2007. PMID 17762369 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | NONE | Taper d’environ 2 semaines ; volume −41 à −60 % ; intensité et fréquence maintenues | Multi-sports |
| RS-JONES-2019-CP | Jones et al. *Physiol Rep* 2019 | Revue | CONFIRMED | SEARCH_SUMMARY | NONE | CP/CS comme indice de l’état stable métabolique maximal | Débattu |
| RS-GALANRIOJA-2020-CP | Galán-Rioja et al. *Sports Med* 2020 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | NONE | CP ≠ MLSS, VT1, VT2, RCP | Chiffres non extraits |
| RS-JAMNICK-2020-DOMAINS | Jamnick et al. *Sports Med* 2020. PMID 32729096 | Revue | CONFIRMED | SEARCH_SUMMARY | NONE | Pas de cadre consensuel ; référence aux domaines | — |
| RS-FOSTER-2001-SRPE | Foster et al. *JSCR* 2001. PMID 11708692 | Validation | CONFIRMED | SEARCH_SUMMARY | NONE | sRPE valide par rapport à la méthode FC | Pas spécifique à la course |
| RS-MUJIKA-2000-DETRAIN | Mujika & Padilla. *Sports Med* 2000 | Revue | CONFIRMED | SEARCH_SUMMARY | NONE | Désentraînement court : VO2max et seuil lactique en baisse chez les entraînés | Ancienne |
| RS-BLAGROVE-2018-STRECON | Blagrove et al. *Sports Med* 2018. PMID 29249083 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | NONE | Musculation ⇒ économie améliorée possible | Ampleur variable |
| RS-ROSENBLAT-2019-POL | Rosenblat et al. *JSCR* 2019 | Méta-analyse | CONFIRMED | SEARCH_SUMMARY | NONE | Effet modéré du POL sur les TT | 4 études |
| RS-REED-TALKTEST | Reed & Pipe. PMID 25010379 | Revue | CONFIRMED | SEARCH_SUMMARY | NONE | Parole confortable sous VT/LT | — |
| RS-TALKTEST-SR-CARDIO | Revue systématique du talk test. PMID 39076925 | Revue systématique | CONFIRMED | SEARCH_SUMMARY | NONE | Surtout en populations cardiaques | Extrapolation limitée |
| RS-ZONE2-VAR | Variabilité de la zone 2. PMID 40225831 | Étude | CONFIRMED | SEARCH_SUMMARY | NONE | % FCmax fixe vs VT1 : CV de 6 à 29 % | Étude unique |

**Bilan des sources**
- **Total** : 22 sources.
- **Niveau de Claude** : 21 à SEARCH_SUMMARY, 1 à IDENTITY_ONLY ; aucune à ABSTRACT_VERIFIED ni FULL_TEXT_VERIFIED.
- **Vérification externe** : 3 sources vérifiées par le contre-audit au niveau abstract.

---

## D. Arbitrage des 75 questions

**Légende**
- **Vérif.** : SS = SEARCH_SUMMARY (Claude) ; EXT = abstract vérifié par le contre-audit externe ; ID = IDENTITY_ONLY ; « — » = aucune source.
- **Conf.** : confiance dans la réponse (L / M / H).
- **Extrap.** : risque d’extrapolation (L / M / H).
- **Exp. / Séc.** : revue d’expert requise / visa sécurité requis.

**Règle de statut**
- Quand la preuve manque **et** qu’une règle est malgré tout retenue, le statut est celui de la **gouvernance** de cette règle : EXPERT_DESIGN_REVIEW, PROGRAMMING_HEURISTIC, PRODUCT_GUARDRAIL, SAFETY_SIGNOFF_REQUIRED ou TECHNICAL. La réponse le dit explicitement (« preuve non vérifiée »).
- Quand aucune règle n’est retenue, le statut est INSUFFICIENT_EVIDENCE et la colonne « Règle » vaut « aucune ».
- **Aucune question non résolue ne devient une règle en silence.**

### Références (REF)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-REF-1 | P-R2–4 → prédiction semi | Preuve non vérifiée. La spécificité (distance proche) est retenue comme critère de conception. | EXPERT_DESIGN_REVIEW | — | — | L | Élevée | M | Tri ordinal par décision (validité > spécificité > récence > fiabilité > accord) | `running.reference.hierarchyPolicy` | oui / non |
| Q-REF-2 | Tous → erreur de prédiction | Plausible (propriété générale des modèles) ; non vérifiée | EXPERT_DESIGN_REVIEW | — | — | M | Forme de la dégradation inconnue | M | La confiance décroît avec le rapport d’extrapolation | `running.performance.extrapolationConfidencePolicy` | oui / non |
| Q-REF-3 | P-R2–4 → prédiction marathon | Non vérifiée ; cohérente avec §F de l’arbitrage | EXPERT_DESIGN_REVIEW | — | — | L | Élevée | H | Confiance de prescription marathon plafonnée sans historique long | `running.confidence.longEventHistoryPolicy` | oui / non |
| Q-REF-4 | Tous → exactitude d’une déclaration | Non vérifiée ; prudence produit | PRODUCT_GUARDRAIL | — | — | M | — | L | Une référence déclarée reste LOW tant qu’elle n’est pas confirmée | `running.reference.declaredConfidenceCap` | oui / non |
| Q-REF-5 | Tous → FCmax | Non vérifiée ici ; erreur individuelle attendue | PRODUCT_GUARDRAIL | — | — | M | — | M | FCmax par formule d’âge interdite comme borne de domaine | `running.reference.hrMaxAgeFormulaPolicy` | oui / non |

### Critical speed (CS)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-CS-1 | P-R2–4 → fiabilité de CS | Pas de consensus sur le protocole (nombre d’essais inclus) | EXPERT_DESIGN_REVIEW | RS-CSD-SCOPING-2026 | SS + EXT | M | Nombre optimal inconnu | M | 2 essais ⇒ confiance plafonnée | `running.cs.minTrialsPolicy` | oui / non |
| Q-CS-2 | P-R2–4 → valeur de CS | Le modèle influence l’estimation ; pas de modèle optimal consensuel | CONTEXT_DEPENDENT | RS-CSD-SCOPING-2026 | SS + EXT | M | Ampleur non chiffrée | L | Le modèle est stocké et tracé avec la référence | `running.cs.modelDeclaration` (TECHNICAL) | non / non |
| Q-CS-3 | P-R2–4 → CS depuis des courses | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | Élevée | M | Des courses peuvent servir d’essais, avec une fiabilité inférieure | `running.cs.raceAsTrialPolicy` | oui / non |
| Q-CS-4 | Loisirs → état stable autour de CS | CS = frontière pertinente heavy / severe (scoping) ; position de Jones débattue ; CS ≠ MLSS (Galán-Rioja) | CONTEXT_DEPENDENT | RS-CSD-SCOPING-2026, RS-JONES-2019-CP, RS-GALANRIOJA-2020-CP | SS + EXT (scoping) | M | Loisirs peu documentés | M | CS = estimation de la frontière 2, en plage, parmi d’autres | `running.cs.role` | oui / non |
| Q-CS-5 | P-R2–4 → fiabilité de D’ | Non établie dans ce dossier | INSUFFICIENT_EVIDENCE | RS-CSD-SCOPING-2026 | SS + EXT | L | Élevée | H | aucune (D’ informative seulement) | `running.cs.dprimeUse` = informatif | oui / non |

### Seuil (THR)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-THR-1 | Adultes → correspondance des seuils | Non interchangeables (pas des synonymes) | SUPPORTED | RS-GALANRIOJA-2020-CP, RS-JONES-2019-CP | SS | M | Écarts non chiffrés ici | L | Constructs distincts, méthode stockée | `running.threshold.terminologyMap` (TECHNICAL) | non / non |
| Q-THR-2 | P-R2–4 → allure semi vs CS | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | Élevée | M | aucune (l’allure semi n’est pas le seuil) | — | oui / non |
| Q-THR-3 | Loisirs → allure 10K vs CS | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | Élevée | M | aucune (l’allure 10K n’est jamais une cible de seuil) | — | oui / non |
| Q-THR-4 | Tous → validité des tests de terrain | Pas de cadre consensuel | EXPERT_DESIGN_REVIEW | RS-JAMNICK-2020-DOMAINS | SS | M | Selon le protocole | M | FIELD_THRESHOLD plafonnée à MEDIUM par défaut | `running.reference.fieldThresholdCap` | oui / non |
| Q-THR-5 | P-R2–4 → fractionné vs continu | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | Élevée | M | aucune (coût dérivé de la structure, pas supposé égal) | — | oui / non |

### Domaines d’intensité (DOM)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-DOM-1 | Adultes → réponse aiguë | Méthodes évaluées par rapport aux domaines ; pas de comparaison directe vérifiée | EXPERT_DESIGN_REVIEW | RS-JAMNICK-2020-DOMAINS | SS | M | — | L | Modèle interne à 3 domaines + catégories d’usage | `running.intensity.domainModel` | oui / non |
| Q-DOM-2 | Adultes → classement par % FCmax | Écarts individuels larges par rapport à VT1 (CV 6–29 %) | CONTEXT_DEPENDENT | RS-ZONE2-VAR | SS | M | Étude unique | M | Pas de borne de domaine en % FCmax fixe | `running.intensity.fixedPercentPolicy` = interdit | oui / non |
| Q-DOM-3 | Adultes → bornes issues d’une référence | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | Les bornes issues des références sont préférées | `running.intensity.boundarySourcePolicy` | oui / non |

### Easy running (EASY)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-EASY-1 | Loisirs → intensité réelle | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | L | L’easy est un plafond (pas une cible) | `running.easy.ceilingPolicy` | oui / non |
| Q-EASY-2 | Sains → talk test | Preuves surtout cardiaques | CONTEXT_DEPENDENT | RS-REED-TALKTEST, RS-TALKTEST-SR-CARDIO | SS | M | Transfert aux sains | M | Talk test = descripteur verbal du plafond RPE, pas une autorité | `running.easy.talkTestUse` | oui / non |
| Q-EASY-3 | P-R1–2 → tolérance | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | M | aucune | — | oui / non |
| Q-EASY-4 | Débutants → adhérence | Non vérifiée | SAFETY_SIGNOFF_REQUIRED | — | — | L | — | M | Alternance course / marche autorisée à l’entrée (G1 NOVICE_ENTRY) | `running.safety.noviceEntryProtocol` | oui / oui |

### Long run (LR)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-LR-1 | Marathoniens → performance | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | Élevée | M | Le long run est une dimension propre de la charge | `running.longRun.dimensionPolicy` | oui / non |
| Q-LR-2 | Tous → part fixe | Aucune preuve d’une part fixe | INSUFFICIENT_EVIDENCE | — | — | M | — | L | aucune (pas de pourcentage) | — | oui / non |
| Q-LR-3 | Tous → blessure | Distances plus longues associées ; preuves contradictoires | CONTEXT_DEPENDENT | RS-FREDETTE-2022-INJ | SS | L | Élevée | M | Le changement de long run est évalué séparément dans la LCA | `running.longRun.changePolicy` | oui / non |
| Q-LR-4 | Semi / marathon → performance | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | Portions spécifiques en phase SPECIFIC si la confiance le permet | `running.longRun.specificPortionPolicy` | oui / non |

### Intervalles (INT)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-INT-1 | Loisirs → VO2max | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | M | aucune | — | oui / non |
| Q-INT-2 | Loisirs → économie | Combinaison continu + HIIT efficace (García-Pinillos) ; González-Mohíno non extrait | CONTEXT_DEPENDENT | RS-GARCIAPINILLOS-2017-HIIT, RS-GONZALEZMOHINO-2020-ECON | SS / ID | M | Supériorité sur le continu seul non établie ici | M | Continu et intermittent complémentaires | `running.hi.combinationPolicy` | oui / non |
| Q-INT-3 | P-R2–4 → économie | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | M | HILL_REPETITIONS conservé comme outil de programmation | — | oui / non |
| Q-INT-4 | Tous → économie | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | L | STRIDES conservé comme module | — | oui / non |
| Q-INT-5 | P-R2–3 → performance | Non vérifiée | PRODUCT_GUARDRAIL | RS-GARCIAPINILLOS-2017-HIIT | SS | L | — | M | Densité de haute intensité bornée par politique (sans valeur) | `running.hi.densityPolicy` | oui / non |

### Volume (VOL)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-VOL-1 | Loisirs → performance 10K | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | M | aucune | — | oui / non |
| Q-VOL-2 | Tous → tolérance | Non vérifiée ; la durée est la seule donnée toujours disponible en saisie manuelle | TECHNICAL | — | — | M | — | L | Durée = dimension principale ; distance UNKNOWN si non déclarée | `running.load.primaryVolumeDimension` | non / non |
| Q-VOL-3 | Tous → risque | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | L’historique de charge tolérée entre dans la LCA | `running.load.historyPolicy` | oui / non |

### Fréquence (FREQ)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-FREQ-1 | Débutants → tolérance | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | M | aucune | — | oui / non |
| Q-FREQ-2 | Débutants → performance | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | À 2 séances, séance de qualité seulement selon le niveau et la confiance | `running.frequency.qualityEligibilityPolicy` | oui / non |
| Q-FREQ-3 | P-HYBRID → performance | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | M | aucune | — | oui / non |

### Progression (PROG)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-PROG-1 | Tous → interruptions | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | M | — | L | Une variable dominante par décision | `running.progression.dominantVariablePolicy` | oui / non |
| Q-PROG-2 | Débutants → blessure | La règle des 10 % n’est pas protectrice (ECR) ; pas de différence entre 10 % et 24 % (revue) | SUPPORTED | RS-BUIST-2008-GRONORUN, RS-DAMSTED-2018-LOAD | SS | M | Débutants seulement | M | La règle des 10 % n’est pas utilisée comme règle préventive | `running.load.tenPercentRule` = non utilisé | oui / non |
| Q-PROG-3 | Tous → échecs de séance (reformulée B1 : hausse sur preuve fiable) | Non vérifiée | PRODUCT_GUARDRAIL | — | — | M | — | L | Hausse substantielle de référence seulement sur preuve suffisamment fiable (performance, test, ou observations multiples cohérentes) | `running.reference.upgradeEvidencePolicy` | oui / non |
| Q-PROG-4 | Tous → tolérance | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | L | Long run piloté en durée | `running.longRun.controlVariable` | oui / non |
| Q-PROG-5 | Tous → résultats | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | Choix ouvert entre décharge périodique et conditionnelle | `running.progression.deloadPolicy` | oui / non |

### TID

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-TID-1 | Endurance → VO2peak | Avantage surtout dans les interventions de moins de 12 semaines ; la disparition au-delà n’est pas établie | CONTEXT_DEPENDENT | RS-OLIVEIRA-2024-TID | SS + EXT | M | Sous-groupes | M | TID émergente, aucune étiquette ciblée | `running.tid.policy` | oui / non |
| Q-TID-2 | Loisirs → TT | Pas de supériorité claire sur tous les outcomes ; avantage surtout chez les très entraînés | CONTEXT_DEPENDENT | RS-OLIVEIRA-2024-TID, RS-ROSENBLAT-2019-POL | SS + EXT | M | — | M | idem | `running.tid.policy` | oui / non |
| Q-TID-3 | Faible fréquence → performance | Non vérifiée | TECHNICAL | — | — | M | — | L | À faible fréquence, la TID est décrite par séance, sans pourcentage | `running.tid.representation` | non / non |
| Q-TID-4 | P-HYBRID → classification | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | L’intensité des autres disciplines est prise en compte dans la description | `running.tid.concurrentInclusion` | oui / non |

### Taper

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-TAPER-1 | Coureurs → performance selon l’épreuve | Non différenciée pour la course dans ces méta-analyses | CONTEXT_DEPENDENT | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS + EXT (Wang) | L | Élevée | M | Durée par épreuve = décision d’expert | `running.taper.durationByEvent` | oui / non |
| Q-TAPER-2 | Endurance → ampleur optimale | Signal poolé 41–60 %, non universel | SUPPORTED_WITH_RANGE | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS + EXT (Wang) | M | Dépendance à la charge non établie | M | Ampleur dans la plage, ajustée par l’expert | `running.taper.volumeReduction` | oui / non |
| Q-TAPER-3 | Endurance → maintien de l’intensité | Les tapers efficaces maintiennent intensité et fréquence | SUPPORTED | RS-WANG-2023-TAPER, RS-BOSQUET-2007-TAPER | SS + EXT (Wang) | M | — | L | Intensité et fréquence maintenues pendant le taper | `running.taper.intensityMaintenance` | oui / non |
| Q-TAPER-4 | P-R1 → performance | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | H | Pas de taper pour une charge faible ou sans épreuve datée | `running.taper.eligibilityPolicy` | oui / non |

### Spécificité (SPEC)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-SPEC-1 | Coureurs → performance cible | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | Priorité à la spécificité en phase SPECIFIC | `running.phase.priorityTable` | oui / non |
| Q-SPEC-2 | Loisirs → allure marathon | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | H | aucune (pas de fraction fixe de CS ou de VMA) | — | oui / non |

### Récupération (REC)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-REC-1 | P-R2 → qualité du lendemain | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | M | Pas de séances KEY adjacentes de même dimension | `running.placement.keyAdjacencyPolicy` | oui / non |
| Q-REC-2 | Coureurs → récupération après course | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | M | Phase RECOVERY dont la durée dépend de la distance courue | `running.recovery.postRacePolicy` | oui / non |
| Q-REC-3 | Masters → récupération | Non vérifiée | INSUFFICIENT_EVIDENCE | — | — | L | — | H | aucune (pas de correction d’âge) | — | oui / non |

### Reprise (RET)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-RET-1 | Entraînés vs débutants → retour au niveau | Déclin rapide chez les très entraînés documenté ; vitesse de retour non documentée ici | INSUFFICIENT_EVIDENCE | RS-MUJIKA-2000-DETRAIN | SS | L | — | M | aucune | — | oui / non |
| Q-RET-2 | Tous → blessure en reprise | Non vérifiée | SAFETY_SIGNOFF_REQUIRED | — | — | L | Élevée | M | Protocole de reprise gouverné G1 | `running.return.protocol` | oui / oui |
| Q-RET-3 | Entraînés → seuil lactique | Seuil lactique abaissé dès le désentraînement court | CONTEXT_DEPENDENT | RS-MUJIKA-2000-DETRAIN | SS | M | Ampleur | M | Confiance des références dégradée après interruption | `running.return.referenceDecayPolicy` | oui / non |

### Entraînement concurrent (CONC)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-CONC-1 | P-HYBRID → qualité du seuil | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | M | Contrainte déclarative PREFER_BEFORE_HEAVY_LOWER | `running.placement.heavyLowerOrderPolicy` | oui / non |
| Q-CONC-2 | Concurrent → force du bas du corps | Atténuée chez les hommes, pas chez les femmes (concurrent en général) | CONTEXT_DEPENDENT | RS-HUIBERTS-2024-CONC | SS | M | Non spécifique à la course | M | Contexte d’interprétation pour l’InterferenceManager, jamais un multiplicateur | `running.concurrent.sexStatusContext` | oui / non |
| Q-CONC-3 | P-R2–3 → économie | Amélioration possible, ampleur variable | CONTEXT_DEPENDENT | RS-BLAGROVE-2018-STRECON | SS | M | — | M | Bénéfice possible signalé au GlobalPlanner | `running.concurrent.strengthEconomyBenefit` | oui / non |
| Q-CONC-4 | HYROX → interférence | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | H | Charge locomotrice HYROX comptée comme concurrente, sans équivalence en course | `running.concurrent.hyroxLocomotorPolicy` | oui / non |
| Q-CONC-5 | P-HYBRID → effet de proximité | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | M | Bandes de proximité opérationnelles (InterferenceManager) | `running.concurrent.proximityBands` | oui / non |

### RPE

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-RPE-1 | Coureurs → charge interne | sRPE valide par rapport à la FC (non spécifique à la course) | CONTEXT_DEPENDENT | RS-FOSTER-2001-SRPE | SS | M | Transfert à la course | L | sRPE = dimension `internalLoadSRPE` | `running.load.srpeDimension` | oui / non |
| Q-RPE-2 | Loisirs → classement dans le domaine | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | RPE prioritaire quand la confiance est LOW | `running.target.priorityByContext` | oui / non |

### Fréquence cardiaque (HR)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-HR-1 | Coureurs → dérive cardiaque | Non vérifiée | PROGRAMMING_HEURISTIC | — | — | L | — | L | FC en signal secondaire sur les séances longues | `running.target.hrLongSessionPolicy` | oui / non |
| Q-HR-2 | Adultes → classement de l’easy | % FCmax fixe mal aligné sur VT1 | CONTEXT_DEPENDENT | RS-ZONE2-VAR | SS | M | Étude unique | M | FC seulement sur référence individuelle | `running.target.hrReferencePolicy` | oui / non |

### Charge mécanique (MECH)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-MECH-1 | Tous → blessure | Non vérifiée | TECHNICAL | — | — | L | — | M | Exposition à haute intensité tracée comme dimension distincte (sans seuil) | `running.load.highIntensityDimension` | non / non |
| Q-MECH-2 | Tous → fatigue en descente | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | M | Descente rapide ⇒ `mechanicalDemand` relevé | `running.archetype.demandTable` | oui / non |

### Association charge–blessure (INJ)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-INJ-1 | Débutants → blessure liée à la distance | Association (> 30 % sur 2 semaines vs < 10 %), selon le type de blessure ; aucun seuil prescriptif | CONTEXT_DEPENDENT | RS-NIELSEN-2014-DANORUN, RS-DAMSTED-2018-LOAD, RS-FREDETTE-2022-INJ | SS | M | Réplication ; autres populations | H | Catégories LCA opérationnelles ; aucune valeur tirée de Nielsen | `running.load.changeCategoryBounds` | oui / non |
| Q-INJ-2 | Tous → ACWR | ACWR non soutenu | SUPPORTED | RS-IMPELLIZZERI-2020-ACWR | SS | M | — | L | ACWR non utilisé | `running.load.acwr` = non utilisé | oui / non |

### Débutants (BEG) et avancés (ADV)

| ID | Population → outcome | Réponse | Statut | Sources | Vérif. | Conf. | Incertitude | Extrap. | Règle candidate | Paramètre candidat | Exp. / Séc. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-BEG-1 | P-R0 → adhérence | Non vérifiée | PRODUCT_GUARDRAIL | — | — | M | — | L | Pas d’allure fabriquée ; P-R0 à l’effort | `running.reference.noFabricatedPacePolicy` | oui / non |
| Q-BEG-2 | P-R0 → abandons | Non vérifiée | SAFETY_SIGNOFF_REQUIRED | — | — | L | — | M | Pas de test maximal à l’entrée (G1 NOVICE_ENTRY) | `running.safety.noviceEntryProtocol` | oui / oui |
| Q-ADV-1 | P-R4 → VO2peak | Avantage du POL surtout chez les très entraînés et à court terme | CONTEXT_DEPENDENT | RS-OLIVEIRA-2024-TID | SS + EXT | M | Effet modeste | M | La TID peut s’orienter vers le polarisé chez P-R4 sans l’imposer | `running.tid.policy` | oui / non |
| Q-ADV-2 | P-R4 → écart allure prescrite / tenue | Non vérifiée | EXPERT_DESIGN_REVIEW | — | — | L | — | L | L’accord de plusieurs références élève la confiance | `running.reference.hierarchyPolicy` | oui / non |

## 3. Synthèse de l’arbitrage

Voir la distribution des statuts dans [`RUNNING-5B-REPORT.md`](RUNNING-5B-REPORT.md) §4.

- **75 questions sur 75 sont arbitrées.** Toute règle issue d’une question sans preuve porte un statut de gouvernance explicite et un paramètre nommé.
- **Les 4 questions SUPPORTED sont des conclusions négatives ou de principe** :
  - constructs de seuil non interchangeables ;
  - règle des 10 % non protectrice chez les débutants ;
  - maintien de l’intensité pendant le taper ;
  - ACWR non soutenu.
- **Aucune ne fournit de valeur de prescription.**
