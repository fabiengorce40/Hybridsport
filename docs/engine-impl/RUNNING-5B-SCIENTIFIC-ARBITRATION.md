# RUNNING-5B-SCIENTIFIC-ARBITRATION — arbitrage scientifique Running V1

> **Phase 5B, documentation seulement.**
>
> - Aucun code RunningEngine ; aucune règle implémentée ; aucune séance exécutable.
> - CORE, StrengthEngine et CORE-EXT-5 sont inchangés.
> - CORE-EXT-R1 est décrit en RFC ([`CORE-EXT-R1-RUNNING-INTERVALS-RFC.md`](CORE-EXT-R1-RUNNING-INTERVALS-RFC.md)), **non implémenté**.
>
> Documents associés :
> - [`RUNNING-SCIENCE-REGISTRY-V1.md`](RUNNING-SCIENCE-REGISTRY-V1.md) : sources avec provenance, arbitrage des 75 questions (section D) ;
> - [`RUNNING-PARAMETER-REGISTRY-V0.md`](RUNNING-PARAMETER-REGISTRY-V0.md) : paramètres ;
> - [`RUNNING-G1-CANDIDATE-REVIEW.md`](RUNNING-G1-CANDIDATE-REVIEW.md) : revue des G1 ;
> - [`RUNNING-FORBIDDEN-CONSTANTS-AUDIT.md`](RUNNING-FORBIDDEN-CONSTANTS-AUDIT.md) : audit des constantes interdites ;
> - [`RUNNING-V1-GOLDEN-SCENARIOS.md`](RUNNING-V1-GOLDEN-SCENARIOS.md) : R1–R12 révisés ;
> - [`RUNNING-5C-FUTURE-TEST-PLAN.md`](RUNNING-5C-FUTURE-TEST-PLAN.md) : plan de tests de la 5C ;
> - [`RUNNING-5B-REPORT.md`](RUNNING-5B-REPORT.md) : gates et rapport.

---

## A. Base de départ

| Contrôle | Résultat |
|---|---|
| Branche / HEAD | `claude/fitness-app-architecture-81fs92` / `cfcaab1` (fin de la 5A), arbre propre |
| Tests | 630 verts sur 56 fichiers (CORE 370, strength 260) |
| Typecheck, lint, architecture | verts |
| CORE | **LOCKED** (empreinte F20 inchangée) |
| STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK | **LOCKED** |
| STRENGTH_SCIENTIFIC_LOCK_V1 | **LOCKED_PROVISIONAL** |
| RUNNING_5A_SPEC_GATE | **PASS** |
| RunningEngine | **CODE NOT STARTED** |

Les neuf documents 5A ont été relus avant toute modification.

**Correction factuelle trouvée à la relecture.** Dans le schéma CORE (`packages/domain/src/session.ts`), `paceSecPerKm` des prescriptions `distance` et `intervals` est **déjà une plage** `{min, max}` (`zPaceRange`). La domain spec 5A §A.1 disait à tort « une allure unique ». C’est corrigé dans la 5A ; l’analyse de la RFC CORE-EXT-R1 en tient compte.

**Accès aux sources.** PubMed et EuropePMC sont toujours refusés par le proxy (connexion rejetée, vérifiée le jour de la 5B). Claude ne peut donc toujours pas lire de résumé.

---

## B. Corrections obligatoires du contre-audit

| # | Correction | Intégration 5B | Documents 5A mis à jour |
|---|---|---|---|
| B1 | Supprimer « une hausse d’allure exige une nouvelle performance » | §F.4 : **une hausse substantielle d’une référence de performance exige une nouvelle preuve suffisamment fiable** (compétition, test standardisé, contre-la-montre, **ou plusieurs observations d’entraînement cohérentes**). La confiance dépend de la nature de la preuve. Une séance isolée réussie ne réécrit jamais la capacité. | Modèle de références §F.3 ; spec charge §S, §X.3 ; domain spec §AG ; rapport 5A ; registre brouillon |
| B2 | Supprimer « l’intensité progresse en dernier » comme règle universelle | §R : **une variable de progression dominante**, choisie parmi 10 variables (l’intensité en fait partie) selon objectif, phase, niveau, charge récente, confiances et charge concurrente ; **aucune priorité universelle** | Spec charge §X.3 ; rapport 5A |
| B3 | Les niveaux de changement de charge sont des catégories opérationnelles | §Q.3 : les classes de la LOAD CHANGE ASSESSMENT sont des **catégories opérationnelles**, pas des seuils biologiques. Toute frontière chiffrée future sera PROGRAMMING_HEURISTIC, PRODUCT_GUARDRAIL ou SAFETY_SIGNOFF_REQUIRED selon son rôle. | Spec charge §Q.2 |
| B4 | Taper : séparer principe, ampleur, durée et spécificité de l’épreuve | §V : `TaperPolicy` à quatre composantes gouvernées séparément ; 41–60 % reste un **signal de preuve**, jamais une prescription | Spec charge §T.2 |
| B5 | Reclasser les sept G1 | §X de la revue G1 : 4 restent G1_SAFETY (PAIN_STOP, RETURN_PROTOCOL, NOVICE_ENTRY restreint, OUT_OF_SCOPE) ; 3 reclassés (LONGRUN_BOUND : EXPERT_DESIGN_REVIEW ; HI_DENSITY et LOAD_INCREASE_BOUND : PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW), chacun justifié, sans forcer la conclusion | Spec charge §R.4 ; registre brouillon (remplacé) |

---

## C. Provenance de la vérification

Chaque source porte **deux champs distincts** :

| Champ | Valeurs | Signification |
|---|---|---|
| `claudeVerificationLevel` | IDENTITY_ONLY, SEARCH_SUMMARY, ABSTRACT_VERIFIED, FULL_TEXT_VERIFIED | Ce que **Claude** a effectivement lu |
| `externalVerification` | NONE, EXTERNAL_COUNTER_AUDIT_VERIFIED (niveau déclaré : abstract) | Ce que le **contre-audit externe** déclare avoir vérifié |

**Règle.** On ne confond jamais qui a vérifié quoi. Trois sources sont `EXTERNAL_COUNTER_AUDIT_VERIFIED` : PMID 41931241, 38717713 et 37163550. Claude reste à SEARCH_SUMMARY pour elles : il **n’écrit jamais** `ABSTRACT_VERIFIED` à son propre nom.

Le **niveau effectif** retenu pour le gate est le plus haut niveau attesté, avec son attestant. Pour ces trois sources : « abstract (contre-audit externe) ».

---

## E. Arbitrage du modèle de références

Les durées de validité ne sont **jamais universelles** (pas de « plus de X jours = invalide »). La récence est représentée par une **revue contextuelle** :
- la confiance d’une référence **décroît** avec l’âge, selon la population, la charge intercurrente et les interruptions ;
- le moteur **demande une revue** (proposition de test, question à l’utilisateur) plutôt que d’invalider brutalement.

Les bandes de récence sont des paramètres PROGRAMMING_HEURISTIC, sans valeur (`running.reference.recencyReviewPolicy`).

| Type | Peut estimer | Ne peut PAS estimer | Spécificité | Rôle de la récence | Conflits qui invalident la confiance | Conditions pour HIGH |
|---|---|---|---|---|---|---|
| RECENT_RACE_RESULT | Capacité à cette distance ; allure spécifique de cette distance ; frontière 2 approchée si la durée de course s’y prête | Frontières physiologiques directes ; allure d’une distance éloignée sans modèle ; tolérance au volume | Maximale pour la même distance, décroissante avec l’écart de distance | Forte : la décroissance s’accélère après une interruption ou une baisse de charge | Conditions atypiques déclarées ; observations d’entraînement concordantes nettement plus lentes ; course plus récente discordante | Distance proche de la décision, protocole officiel, conditions normales, pas d’interruption depuis, aucun conflit |
| RECENT_TIME_TRIAL | Capacité à la distance ou durée testée | Idem course ; biais de motivation en solo | Élevée pour la même distance | Forte | Mesure de distance douteuse (déclarée) ; effort non maximal déclaré | Protocole standardisé déclaré, terrain plat, effort maximal déclaré |
| CRITICAL_SPEED_TEST | CS (frontière heavy / severe approchée) ; D’ (séparée) ; performances dans la plage de durées des essais | Performance hors de la plage de durées (semi, marathon) ; frontière 1 ; tolérance | Élevée pour la frontière 2 ; faible pour les longues distances | Forte | Mauvais ajustement ; essais trop rapprochés en durée ; modèle non déclaré ; discordance avec une course récente | Voir §G.3 : essais suffisants, ajustement acceptable, modèle déclaré, cohérence avec au moins une performance |
| MULTI_DISTANCE_PERFORMANCE_MODEL | Capacité à une distance **encadrée** par les performances observées (interpolation) | Extrapolation lointaine (au-delà des distances observées) à confiance élevée | Selon l’encadrement | Chaque performance porte sa propre récence | Performances incohérentes entre elles ; une seule performance récente | Plusieurs performances récentes et cohérentes qui **encadrent** la distance visée |
| LAB_THRESHOLD | La frontière mesurée, **selon la définition utilisée** (LT1, LT2, VT1, VT2, MLSS) | Une autre frontière ; une performance de course ; une allure sur route sans transfert | Élevée pour la frontière mesurée | Moyenne à forte | Définition non précisée ; tapis vs route non réconciliés ; discordance avec une course | Méthode et définition déclarées, récente, cohérente avec les performances |
| FIELD_THRESHOLD | Frontière 2 approximative | Frontière 1 ; performance | Moyenne | Forte | Protocole non standardisé ; discordance avec une course ou avec CS | Rarement HIGH : validité variable selon le protocole (Jamnick 2020) ; plafonnée à MEDIUM par défaut (EXPERT_DESIGN_REVIEW) |
| VMA_TEST | Vitesse associée au plafond aérobie selon le protocole ; borne haute du domaine sévère | Frontière 2 ; performance longue ; allure easy | Moyenne (courts efforts sévères) | Moyenne | Protocole inconnu ; discordance avec une course courte | Protocole déclaré et récent ; utile surtout pour le domaine sévère |
| VO2MAX_TEST | Capacité aérobie maximale | **Aucune allure** sans mesure d’économie ; frontières ; performance | Faible pour la prescription | Moyenne | — (ne sert pas d’autorité d’allure) | Jamais HIGH pour une décision d’allure |
| RECENT_TRAINING_PERFORMANCE | Tolérance actuelle ; **borne basse** de capacité (ce qui est tenu) ; **infirmation** d’une référence trop optimiste ; avec plusieurs observations cohérentes, une **preuve de hausse** (B1) | Capacité maximale directe (effort sous-maximal) | Selon l’archétype observé | Très forte (seules les observations récentes comptent) | Observations dispersées ; contexte perturbé (chaleur, terrain) ; retours incomplets | Jamais HIGH seule ; MEDIUM avec plusieurs observations cohérentes du même domaine et du même contexte |
| USER_DECLARED_REFERENCE | Point de départ | Toute capacité à confiance supérieure à LOW | Inconnue | Inconnue (date souvent absente) | Toute observation discordante | Jamais au-dessus de LOW tant qu’aucune preuve ne la confirme |

---

## F. Modèle de performance

### F.1 Hiérarchie V1 pour estimer la capacité actuelle (propre à chaque décision)

Ordre candidat par défaut, **réévalué pour chaque décision** avec les critères ordinaux de la 5A (validité du protocole > spécificité > récence > fiabilité > accord) :

1. performance récente, fiable et spécifique à l’objectif ;
2. référence de terrain ou de laboratoire validée (pour la grandeur qu’elle mesure) ;
3. plusieurs performances cohérentes (interpolation) ;
4. observations d’entraînement cohérentes ;
5. modèle générique (**transformateur** de référence : il hérite de la confiance de sa source et la dégrade avec l’extrapolation) ;
6. référence déclarée ;
7. calibration (séances à l’effort qui produisent des observations).

**Exemples où l’ordre change**
- Pour la frontière 2, une LAB_THRESHOLD récente peut passer devant une course de 5 km.
- Pour une allure marathon, trois performances qui encadrent le semi peuvent passer devant un 10 km récent isolé.
- Pour la tolérance actuelle, les observations d’entraînement passent devant toute performance ancienne.

### F.2 `PerformanceEstimate` (conceptuel)

| Champ | Contenu |
|---|---|
| `estimatedCapability` | Grandeur estimée (vitesse soutenable à une distance, frontière 2, CS…) |
| `range` | Plage (min, max) ; jamais une valeur seule sans plage |
| `referenceBasis` | Références utilisées, transformations appliquées (modèle, extrapolation) |
| `confidence` | `RunningReferenceConfidence` pour la décision visée |
| `uncertainty` | Sources d’incertitude (extrapolation, ancienneté, conflit, protocole) |
| `validFor` | Décisions pour lesquelles l’estimation peut servir (par exemple « cible THRESHOLD_LIKE », « allure spécifique 10K ») |
| `invalidFor` | Décisions interdites (par exemple « allure marathon », si extrapolation lointaine sans historique long) |
| `reasonCodes` | Codes de trace (ex. `PERF.INTERPOLATED`, `PERF.EXTRAPOLATED_FAR`, `PERF.CONFLICT_CONSERVATIVE`, `PERF.DECLARED_ONLY`, `PERF.STALE_REVIEW`) |

Rappel structurant (5A §B.1) : une `PerformanceEstimate` **ne devient jamais automatiquement une cible**.

### F.3 Familles de modèles (aucune équation choisie)

| Famille | Principe | Avantages | Hypothèses | Limites | Décision V1 |
|---|---|---|---|---|---|
| Type Riegel (loi de puissance temps–distance) | Temps à une distance cible = temps de référence × (rapport de distances) élevé à un exposant | Simple ; une seule performance suffit ; transparent | Exposant commun à tous ; fatigue similaire entre distances | Exposant individuel variable ; erreur croissante en extrapolation longue, surtout vers le marathon sans historique long ; non vérifié dans ce dossier | Candidat pour l’extrapolation, avec confiance dégradée ; exposant = paramètre EXPERT_DESIGN_REVIEW **sans valeur** |
| Type VDOT (tables de Daniels) | Performance → indice → allures d’entraînement tabulées | Couvre performance **et** allures ; répandu chez les coachs | Relation vitesse–VO2 et fraction soutenable standard ; économie moyenne | **Confond performance et prescription** (contraire à 5A §B.1) ; tables propriétaires et non vérifiées ici ; hypothèse d’économie standard | **Pas une autorité.** Au mieux un comparateur de contrôle ; ses allures d’entraînement ne sont pas reprises |
| Critical Speed (hyperbolique / linéaire distance–temps) | Asymptote vitesse–durée + D’ | Base physiologique (frontière heavy / severe) ; plusieurs essais ⇒ ajustement contrôlable | Modèle à 2 paramètres valable dans une plage de durées | Hors de la plage des essais, la prédiction se dégrade ; protocole et modèle non consensuels (scoping review 2026) | Entrée facultative (§G), jamais obligatoire |
| Interpolation d’allure | Interpolation entre performances observées qui encadrent la distance | Pas d’extrapolation ; minimum d’hypothèses | Monotonie de la relation vitesse–distance | Exige au moins deux performances qui encadrent la distance ; ne sort pas de la plage | **Préférée** quand elle est disponible |

**Décision V1.** L’interpolation est préférée ; l’extrapolation passe par une famille choisie **au moment de la conception du ruleset** (paramètre `running.performance.extrapolationModelFamily`, EXPERT_DESIGN_REVIEW, sans valeur), avec une confiance dégradée selon le rapport d’extrapolation. VDOT n’est pas l’autorité : sa seule mention dans l’architecture initiale n’est pas une preuve.

### F.4 Mise à jour d’une référence de performance (correction B1)

| Événement | Effet |
|---|---|
| Nouvelle compétition, contre-la-montre ou test standardisé | Nouvelle référence ; confiance selon le protocole (§E) |
| **Plusieurs** observations d’entraînement **cohérentes** (même domaine, contexte comparable) au-dessus de la référence | Peut justifier une **hausse**, avec une confiance moindre qu’une performance maximale. Le nombre d’observations et la cohérence exigée sont des paramètres EXPERT_DESIGN_REVIEW. |
| Une séance isolée réussie | **Aucune réécriture** de la capacité ; au plus une proposition de test |
| Hausse **substantielle** (au-delà d’une borne opérationnelle, sans valeur) | Exige une preuve suffisamment fiable (performance, test, ou observations multiples cohérentes) ; tracée `PERF.UPGRADE_EVIDENCE` |
| Observations concordantes en dessous de la référence, ou interruption | Baisse ou dégradation de confiance ; la baisse demande moins de preuves que la hausse (asymétrie `PRODUCT_GUARDRAIL`) |

---

## G. Gouvernance de la Critical Speed

| Rôle possible | Décision V1 | Condition |
|---|---|---|
| REFERENCE | Oui, facultative | CRITICAL_SPEED_TEST ou MULTI_DISTANCE_PERFORMANCE_MODEL conforme au minimum ci-dessous |
| PHYSIOLOGICAL_DOMAIN_BOUNDARY | Oui, comme **estimation** de la frontière heavy / severe, en plage | Confrontée aux autres références. La scoping review 2026 (vérifiée par le contre-audit externe) présente CS comme une frontière pertinente heavy / severe, **sans consensus** sur le protocole ni le modèle. |
| PERFORMANCE_MODEL_INPUT | Oui, **dans la plage de durées des essais** seulement | Aucune extrapolation longue (semi, marathon) sans autre référence |
| PRESCRIPTION_INPUT | Indirect | Via la plage de frontière 2 et les catégories THRESHOLD_LIKE / SEVERE ; jamais « cible = CS » sans marge décidée par ruleset |

**CS n’est jamais obligatoire** : aucun scénario ne l’exige, et R1–R4 et R6–R12 fonctionnent sans elle.

### G.1 Preuve minimale avant de faire confiance à une valeur de CS (conditions, sans nombre)

- plusieurs efforts maximaux (nombre minimal = paramètre EXPERT_DESIGN_REVIEW) ;
- durées **suffisamment différentes** et dans la plage du modèle ;
- dates rapprochées ;
- conditions comparables ;
- modèle déclaré ;
- ajustement acceptable ;
- **cohérence avec au moins une autre référence**, sinon la confiance est plafonnée à MEDIUM.

### G.2 Sensibilité (à tracer)

| Facteur | Effet attendu | Traitement V1 |
|---|---|---|
| Protocole (piste, route, courses) | CS différentes selon le contexte | Protocole stocké ; fiabilité selon le protocole |
| Durées des essais | L’estimation dépend des durées choisies | Durées stockées ; la plage de validité en dérive |
| Nombre d’essais | 2 essais : ajustement non contrôlable | 2 essais ⇒ confiance plafonnée (EXPERT_DESIGN_REVIEW) |
| Choix du modèle | CS et D’ changent selon le modèle | Modèle stocké ; comparaison possible |
| Bruit de mesure | Distances et temps déclarés imprécis | Plage élargie |
| Population | Validité mal documentée chez les débutants | Non proposée à P-R0 et P-R1 (PROGRAMMING_HEURISTIC) |

**D’ reste séparée** : stockée à part, informative en V1, INSUFFICIENT_EVIDENCE pour doser. Tout protocole exact reste provisoire.

---

## H. Terminologie des seuils

| Terme | Construit | Mesure | Niveau interne |
|---|---|---|---|
| LT1 | 1re inflexion du lactate (définitions multiples) | Laboratoire | Frontière 1 (une méthode) |
| VT1 | 1er seuil ventilatoire (≈ GET) | Échanges gazeux | Frontière 1 (une autre méthode) |
| LT2 | 2e seuil lactique (définitions multiples : concentration fixe, Dmax, etc.) | Laboratoire | Estimation de la frontière 2, **selon la définition** |
| VT2 / RCP | Point de compensation respiratoire | Échanges gazeux | Estimation de la frontière 2 (autre méthode) |
| MLSS | Plus haute intensité avec lactatémie stable | Plusieurs sessions de laboratoire | Estimation de la frontière 2 (méthode de référence historique) |
| Critical Speed | Asymptote vitesse–durée (course) | Plusieurs efforts maximaux | Estimation de la frontière 2 (modèle) |
| Concept de Critical Power | Même concept en puissance (cyclisme) | Ergomètre | Cadre conceptuel ; **pas** de transfert numérique direct vers la course |
| « Threshold pace » | Terme de coaching, défini différemment selon les écoles | — | **Libellé d’interface** ; renvoie en interne à THRESHOLD_LIKE |
| « Tempo » | Terme de coaching ambigu | — | **Libellé d’interface** ; renvoie à STEADY_RUN ou THRESHOLD selon le contexte |
| Allure 10K | Performance | Course | Référence de performance ; domaine selon la durée de course |
| Allure semi | Performance | Course | Référence de performance ; généralement HEAVY, selon le niveau |

**Paires non interchangeables** (le moteur ne les fusionne jamais silencieusement) :

- LT1 ≠ VT1 : méthodes différentes, frontière proche sans identité garantie.
- LT1/VT1 ≠ LT2/VT2/MLSS/CS : frontières différentes.
- LT2 ≠ MLSS ; VT2 ≠ MLSS ; CS ≠ MLSS ; CS ≠ VT2/RCP ; CS ≠ LT2. Galán-Rioja 2020 : pas des synonymes ; Jones 2019 défend CS comme indice de l’état stable métabolique maximal, position débattue.
- CP (cyclisme) ≠ CS (course) : même concept, grandeurs non transférables.
- Allure 10K ≠ seuil ; allure semi ≠ seuil ; allure 10K ≠ CS ; allure semi ≠ CS. Ce sont des performances, dont la position par rapport à la frontière 2 dépend de la durée de course.
- « Threshold pace » ≠ « tempo » ≠ un construit physiologique.

Chaque référence de seuil stocke sa **méthode** (`thresholdMethod`) et sa **définition**. La frontière 2 interne est une **plage multi-source**, jamais un scalaire.

---

## I. Modalités de cible

Modalités : PACE, RPE, HEART_RATE, PHYSIOLOGICAL_DOMAIN (catégorie interne, toujours présente), MULTI_SIGNAL (plusieurs plages avec une priorité).

**Règle générale.** Le domaine interne est **toujours** défini ; il est la cible, et les signaux externes en sont les **indicateurs**. Le signal prioritaire dépend du contexte, de la confiance de prescription et des données disponibles. Sans référence, pas de PACE ; sans référence FC individuelle, pas de HEART_RATE.

| Archétype (après §J) | Modalité préférée | Secondaire | Forme | Remarque |
|---|---|---|---|---|
| EASY_RUN (dont variante récupération) | RPE **plafond** | PACE plafond indicatif ; HR plafond si référence individuelle | Borne supérieure | Pas d’allure cible basse ; courir plus lentement n’est pas un échec |
| LONG_RUN | RPE plafond | PACE plafond ; HR plafond (attention à la dérive) | Borne supérieure ; portions spécifiques en PACE si confiance suffisante | |
| STEADY_RUN | MULTI_SIGNAL (PACE plage + RPE plage) | HR | Plage | Frontière 1 incertaine ⇒ plage large |
| THRESHOLD (continu ou fractionné) | PACE plage si confiance ≥ MEDIUM et terrain plat | RPE plage | Plage sous ou au voisinage de la frontière 2 | Relation à CS ou à un seuil mesuré seulement via la plage multi-source ; RPE prioritaire si confiance LOW |
| VO2_INTERVALS | PACE plage (confiance suffisante) ou RPE | Durée de répétition | Plage | La FC est inadaptée (retard sur les efforts courts) |
| SHORT_INTERVALS | RPE ou PACE plage | — | Plage | FC inadaptée |
| HILL_REPETITIONS | **RPE** | Durée | Plage d’effort | **PACE inadaptée** en côte |
| STRIDES (module) | RPE (qualité, relâchement) | — | Descripteur | Ni PACE ni FC |
| RACE_PACE_SESSION | PACE plage (issue d’une estimation de performance validée) | RPE | Plage | Sans estimation fiable ⇒ « effort spécifique » en RPE |
| PROGRESSION_RUN | MULTI_SIGNAL par palier | — | Plages successives | |
| TEST_SESSION | Protocole (effort maximal ou étalonné) | — | — | Mesure, pas une prescription d’intensité |

Aucun pourcentage (de VMA, FCmax ou CS) n’est fixé en 5B.

---

## J. Arbitrage des archétypes

| Archétype 5A | Finalité soutenue | Usage dépendant du contexte | Heuristiques | Hypothèses interdites | Décision V1 |
|---|---|---|---|---|---|
| EASY_RUN | Volume aérobie toléré (le volume de faible intensité est au cœur de toutes les TID étudiées, Oliveira 2024) | Dose selon le niveau | Plafond d’effort | « Easy = allure fixe » | **Conservé** |
| RECOVERY_RUN | Aucune finalité physiologique **distincte** démontrée | — | Maintien de la fréquence à coût minimal | Stimulus de « récupération active » propre | **Fusionné** dans EASY_RUN (variante `LOW_DOSE_RECOVERY`, §K) |
| LONG_RUN | Tolérance à la durée, endurance (cadre usuel ; aucune source marathon vérifiée) | Selon l’objectif | Progression en durée | « X % du volume » | **Conservé** (EXPERT_DESIGN_REVIEW) |
| STEADY_RUN | Travail haut MODERATE / bas HEAVY | Semi, marathon | — | « Tempo » comme construit | **Conservé** (PROGRAMMING_HEURISTIC : distinct par domaine visé) |
| THRESHOLD_INTERVALS | Travail proche de la frontière 2 | Tous les objectifs sauf GENERAL débutant | — | Coût égal au continu | **Fusionné** avec CONTINUOUS_THRESHOLD en **THRESHOLD** (structure CONTINUOUS ou INTERVALS) |
| CONTINUOUS_THRESHOLD | Idem | 10K, semi, marathon | — | Idem | Fusionné (voir §M) |
| VO2_INTERVALS | Temps près du VO2max en domaine sévère ; HIIT combiné au continu efficace chez les loisirs (García-Pinillos 2017) | 5K, 10K | — | « Plus de HIIT = mieux » | **Conservé** |
| SHORT_INTERVALS | Travail sévère intermittent ; mécanique distincte (vitesse élevée) | 5K, 10K | Structure courte | Supériorité sur VO2_INTERVALS | **Conservé** (PROGRAMMING_HEURISTIC : distinct par profil mécanique et structure, pas par stimulus métabolique démontré) |
| STRIDES | Qualité neuromusculaire (cadre usuel ; non vérifié) | Tous | Bloc de fin de séance | Stimulus aérobie | **Conservé comme MODULE** (bloc intégré à une autre séance, pas une séance autonome) |
| HILL_REPETITIONS | Force spécifique, puissance, ou sévère selon la durée | P-R2 et plus | — | Allure en côte | **Conservé** (dépend d’une côte déclarée) |
| RACE_PACE_SESSION | Spécificité (cadre usuel ; non vérifié) | Objectif de course | — | Allure objectif = référence | **Conservé** (EXPERT_DESIGN_REVIEW) |
| PROGRESSION_RUN | Pas de stimulus distinct démontré ; transition d’intensité | P-R2 et plus | Utile opérationnellement | Stimulus physiologique propre | **Conservé comme PROGRAMMING_HEURISTIC** |
| TEST_SESSION | Mesure | — | — | Stimulus d’entraînement visé | **Conservé** |

**Bilan** : 13 archétypes → **11**, dont 10 séances et 1 module (STRIDES). Deux fusions : RECOVERY_RUN → EASY_RUN ; THRESHOLD_INTERVALS + CONTINUOUS_THRESHOLD → THRESHOLD. Aucun retrait sec.

---

## K. Easy run

- **Finalité V1 d’EASY_RUN** : accumuler du volume aérobie de faible intensité, toléré, qui permet la fréquence et la régularité. C’est la séance « par défaut » (le volume de faible intensité est présent dans toutes les TID comparées ; aucune proportion n’est imposée).
- **Différence avec RECOVERY_RUN** : la dose (plus courte) et un plafond d’effort plus bas. Il n’y a **pas de stimulus physiologique distinct démontré** dans les sources vérifiées.
- **Décision** : RECOVERY_RUN n’est **pas** un archétype séparé. Il devient `EASY_RUN.variant = LOW_DOSE_RECOVERY`. La terminologie « récupération » reste possible à l’affichage (UI).
- **Variables de contrôle candidates** (sans seuil) :
  - plafond RPE ;
  - plafond FC (si référence individuelle) ;
  - plafond d’allure indicatif (si référence) ;
  - durée ;
  - contexte déclaré ;
  - conformité (`targetCompliance = ABOVE` est un signal).
  - Le plafond effectif est le **plus conservateur** des signaux disponibles (PROGRAMMING_HEURISTIC).
- **Talk test** : CONTEXT_DEPENDENT (preuves surtout en populations cardiaques), utilisable comme descripteur verbal du plafond RPE, pas comme autorité.

---

## L. Long run

| Aspect | Arbitrage |
|---|---|
| Rôle selon l’objectif | GENERAL, 5K, 10K : endurance générale (utile, non central) ; semi : important ; marathon : central (cadre usuel ; **aucune source marathon vérifiée** ⇒ EXPERT_DESIGN_REVIEW) |
| Durée ou distance | **Durée** comme variable de contrôle (robuste à une allure incertaine, sans mesure GPS) ; distance secondaire si elle est déclarée |
| Relation à la charge hebdomadaire | **Pas de pourcentage.** Le long run est une dimension propre (`longRunDuration`) évaluée par la LOAD CHANGE ASSESSMENT (changement par rapport à son propre historique) |
| Spécificité | Portions spécifiques (semi, marathon) en phase SPECIFIC, si la confiance de prescription le permet |
| Coût mécanique | `mechanicalDemand` croissant avec la durée ; association entre distances plus longues et blessures (Fredette 2022, preuves contradictoires) ⇒ prudence, pas de seuil |
| Pertinence marathon | Probablement déterminante (Q-LR-1 : INSUFFICIENT_EVIDENCE dans ce dossier) |
| Limites débutant | P-R0 : pas de long run distinct avant une régularité établie (PROGRAMMING_HEURISTIC) |
| Athlète hybride | `locomotorDemand` HIGH : contrainte de placement vis-à-vis des jambes lourdes et de l’HYROX, arbitrée par l’InterferenceManager |

**Décision.** Architecture adaptative (progression par durée, relative à l’historique propre du long run) + EXPERT_DESIGN_REVIEW. Aucune borne relative au volume hebdomadaire n’est créée ; `running.longRun.boundPolicy` est une politique sans valeur (voir la revue G1).

---

## M. Travail au seuil

**Deux archétypes sont-ils nécessaires ?** Non. Le stimulus visé (domaine THRESHOLD_LIKE) est le même ; ce qui diffère est la **structure** (continuité, durée de travail, récupérations). Or la structure est portée par `RunningIntervalStructure` (RFC CORE-EXT-R1). D’où un archétype **THRESHOLD**, avec `structureMode` CONTINUOUS ou INTERVALS.

**Coût non supposé égal.** L’`estimatedLoad`, le `recoveryDemand` et la cible sont dérivés de la structure : durée de travail continue, nombre et durée des répétitions, récupérations. Deux séances de même durée de travail peuvent avoir des demandes différentes. Q-THR-5 (équivalence des adaptations) reste INSUFFICIENT_EVIDENCE.

**Éligibilité.** CONTINUOUS est réservé aux niveaux et confiances où le risque de dérive vers le domaine sévère est acceptable (PROGRAMMING_HEURISTIC : P-R3 et plus, ou confiance ≥ MEDIUM).

| Données disponibles | Comportement |
|---|---|
| Aucun test de seuil ni performance | Séance THRESHOLD **par effort** (plage RPE) ; confiance LOW ; structure INTERVALS préférée (plus facile à régler) |
| CS seule | Plage de frontière 2 dérivée de CS ; confiance plafonnée à MEDIUM sans autre référence (§G.1) ; plage sous ou au voisinage de CS |
| Course de 10 km seule | Estimation de la frontière 2 par la performance (la position de l’allure 10K dépend de la durée de course, Q-THR-3) ; plage large ; **l’allure 10K n’est pas la cible** |
| Course de semi seule | Idem : l’allure semi est généralement sous la frontière 2 (Q-THR-2, non vérifié) ; plage large |
| Observations d’entraînement seules | Plage RPE ; plage d’allure seulement si plusieurs observations cohérentes en THRESHOLD ; confiance LOW à MEDIUM |

---

## N. Haute intensité

| Archétype | Stimulus | Modalité | Durée de travail | Récupération | Populations | Variable de progression | Considérations mécaniques et de fatigue |
|---|---|---|---|---|---|---|---|
| VO2_INTERVALS | Temps près du VO2max en domaine sévère | PACE plage ou RPE | Répétitions de durée intermédiaire ; la **durée cumulée en sévère** est la dose | Assez longue pour maintenir la qualité ; mode actif ou passif | P-R2 à P-R4 | Volume de travail (nombre de répétitions) ou durée des répétitions | `recoveryDemand` HIGH ; jamais en RETURN précoce ; jamais empilée |
| SHORT_INTERVALS | Sévère intermittent ; vitesse | RPE ou PACE | Répétitions courtes ; dose = durée cumulée | Courte, avec récupération entre séries | P-R2 à P-R4 | Nombre de répétitions ou de séries | Vitesse élevée ⇒ `mechanicalDemand` MODERATE à HIGH |
| HILL_REPETITIONS | Force spécifique (courtes) ou sévère (longues) | RPE | Selon l’objectif ; courtes ⇒ qualité | Descente au trot ou à la marche | P-R2 à P-R4 | Nombre de répétitions | `locomotorDemand` HIGH (chaîne postérieure) ; la descente rapide ajoute une charge excentrique |
| STRIDES (module) | Neuromusculaire, relâchement | RPE (qualité) | Très courte ; pas de dose métabolique | **Complète** | P-R1 à P-R4 (P-R0 après régularité) | Nombre (limité) | Faible |

**Preuve** : García-Pinillos 2017 soutient la **combinaison** continu + intermittent chez les loisirs. Aucune source vérifiée ne soutient « plus de HIIT = mieux » : la densité est bornée par la politique `running.hi.densityPolicy` (PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW, sans valeur).

---

## O. Distribution de l’intensité (TID)

**Règle 80/20 universelle : rejetée explicitement.**

La TID est une **propriété émergente** :

```
objectif, phase, fréquence, niveau, charge récente, entraînement concurrent
        → composition hebdomadaire des séances (archétypes, doses)
        → TID résultante (décrite : POLARIZED / PYRAMIDAL / THRESHOLD_HEAVY / OTHER)
```

Le moteur **ne vise pas une étiquette**. La TID résultante est calculée, tracée et contrôlée :
- **dérive** : une TID qui s’éloigne de l’intention de la phase déclenche une revue, pas une correction automatique vers une étiquette ;
- **plausibilité** : par exemple, aucune semaine composée uniquement de séances sévères.

**Cette architecture est-elle soutenue ?**
- Oliveira 2024 (vérifiée par le contre-audit externe) : avantage du polarisé sur le VO2peak dans certains contextes (moins de 12 semaines, très entraînés), sans supériorité claire sur tous les résultats de performance.
- Rosenblat 2019 : effet modéré sur les TT, preuves limitées.
- Une cible universelle n’est donc pas soutenue, et une approche contextuelle est cohérente avec ces preuves.
- L’architecture « composition → TID émergente » est un **choix de conception** (EXPERT_DESIGN_REVIEW) compatible avec la preuve, pas une conclusion démontrée.

---

## P. Fréquence

Aucune source vérifiée sur la fréquence (5A AB.3). En conséquence :

| Notion | Définition | Statut |
|---|---|---|
| Fréquence minimale pratique | En dessous, un programme structuré n’a guère de sens (continuité) | PRODUCT_GUARDRAIL, sans valeur |
| Opportunité propre à l’objectif | Un objectif long (marathon) demande plus d’occasions de volume | EXPERT_DESIGN_REVIEW |
| Tolérance à la charge | La fréquence augmente la charge et l’exposition mécanique | Évaluée par la LOAD CHANGE ASSESSMENT |
| Heuristique de planification produit | Nombre de séances proposé par défaut selon la disponibilité | G3 (préférence produit) |

**Interdit** : 3, 4 ou 5 séances par semaine selon le niveau comme seuils scientifiques. La fréquence est d’abord une **entrée** de l’utilisateur ou du GlobalPlanner, bornée par la tolérance.

---

## Q. Modèle de charge

### Q.1 Revue des dimensions

| Dimension | Conservée ? | Nature | Si absente | Remarque |
|---|---|---|---|---|
| `weeklyDuration` | Oui | MEASURED (déclarée ou importée) | UNKNOWN | Dimension principale en saisie manuelle |
| `weeklyDistance` | Oui | MEASURED si déclarée | **UNKNOWN** (jamais reconstruite par une allure) | Non redondante : exposition mécanique ; Nielsen 2014 raisonne en distance |
| `runFrequency` | Oui | MEASURED | — | |
| `longRunDuration` | Oui | MEASURED | UNKNOWN | Dimension propre du long run |
| `highIntensityExposure` | Oui | DERIVED (archétype × durée de travail réalisée) ou ESTIMATED | UNKNOWN si les retours manquent | Temps en SEVERE + SPRINT |
| `moderateHeavyExposure` | Oui | DERIVED / ESTIMATED | UNKNOWN | Temps en HEAVY / THRESHOLD_LIKE |
| `mechanicalExposure` | Oui | ESTIMATED (ordinal : archétype × dose × terrain déclaré) | ESTIMATED par défaut sur l’archétype | Jamais présentée comme mesurée |
| `sessionDensity` | Oui | DERIVED (espacement des séances exigeantes) | — | Utile pour le placement et les séances manquées |
| `recentLoadChange` | **Retirée comme dimension** | — | — | C’est une **sortie** de la LOAD CHANGE ASSESSMENT (comparaison), pas une dimension. Redondante sinon. |
| `concurrentLocomotorLoad` | Oui | ESTIMATED (fournie par les autres moteurs) | UNKNOWN (jamais 0 par défaut) | |
| `internalLoadSRPE` | **Ajoutée** | MEASURED si sRPE saisie (Foster 2001) | UNKNOWN | Charge interne, disponible sans capteur |

**Bilan : 10 dimensions.** `recentLoadChange` est retirée (c’est une sortie) ; `internalLoadSRPE` est ajoutée.
- Pas de score unique de fatigue.
- Pas d’autorité ACWR.
- Pas de 10 % universel.

### Q.2 Propagation d’UNKNOWN

- Une dimension UNKNOWN **reste** UNKNOWN : aucune imputation silencieuse (ni 0, ni moyenne).
- La LOAD CHANGE ASSESSMENT ne peut conclure `WITHIN_HABITUAL` sur une dimension UNKNOWN. Elle trace `LOAD.DIMENSION_UNKNOWN` et, si la dimension est **structurante** pour la décision (par exemple le long run avant de progresser sur le long run), elle interdit la progression de cette dimension (HOLD).

### Q.3 Catégories de changement de charge (correction B3)

Les classes `WITHIN_HABITUAL`, `MODERATE_INCREASE`, `MULTI_DIMENSION_INCREASE`, `LARGE_INCREASE` et `OUT_OF_SCOPE` sont des **catégories opérationnelles**. Leurs frontières futures seront :
- `PROGRAMMING_HEURISTIC` (programmation) ;
- `PRODUCT_GUARDRAIL` (borne produit) ;
- `SAFETY_SIGNOFF_REQUIRED` : uniquement dans les contextes RETURN et NOVICE couverts par un G1, voir la revue G1.

**Aucune n’est un seuil biologique.**

---

## R. Gouvernance de la progression (correction B2)

### R.1 Modèle de décision

| Entrées | Sorties |
|---|---|
| goal, phase, level, adherence, recentTolerance, referenceConfidence, prescriptionConfidence, loadHistory, concurrentLoad, timeToEvent | `dominantProgressionVariable`, `direction` (UP / HOLD / DOWN), `magnitudeClass` (HOLD / SMALL / MODERATE / LARGE, **libellés opérationnels**), `reasonCodes` |

Variables éligibles comme variable dominante : `weeklyDuration`, `weeklyDistance`, `frequency`, `longRunDuration`, `intervalVolume`, `repDuration`, `recoveryDuration` (à la baisse), `sessionDensity`, `intensity`, `specificity`.

### R.2 Principes
1. **Une seule variable dominante** par décision ; les autres sont en HOLD ou en DOWN.
2. **Pas de priorité universelle.** La variable dominante résulte des entrées. L’intensité **peut** être dominante, par exemple en DEVELOPMENT avec une prescription de confiance HIGH, une charge stable et une fréquence déjà suffisante. Elle ne l’est jamais **par défaut**.
3. **Hausse d’une cible d’intensité ≠ hausse de référence** : faire progresser l’intensité, c’est changer la composition ou le domaine visé ; la référence de performance ne change que selon §F.4.
4. La table « phase × objectif × niveau → variables candidates » est une **table de ruleset** (EXPERT_DESIGN_REVIEW) sans valeur en 5B. Le départage entre variables candidates est ordinal et tracé (écart à l’objectif, temps restant, historique de progression, charge concurrente).

### R.3 Conditions où HOLD est la bonne progression
- statut de reprise actif, tant que les conditions de reprise ne sont pas remplies (§T) ;
- tolérance récente défavorable (retours HARDER / MUCH_HARDER répétés, échecs de séance) ;
- adhérence faible ;
- signal de douleur (PAUSE_PROGRESSION, §U) ;
- dimension structurante UNKNOWN (§Q.2) ;
- hausse récente sur une autre dimension non encore consolidée ;
- charge concurrente en hausse (P-HYBRID) ;
- confiance de prescription LOW **pour une progression d’intensité** ;
- phase PEAK / TAPER (la direction est DOWN pour le volume) ;
- semaine de décharge décidée.

---

## S. Séance manquée et replanification

**Principes**
- **Jamais de rattrapage automatique** du volume perdu.
- **Pas de modèle de dette ou de culpabilité** : aucun message ni compteur de « kilomètres dus ».
- Replanification minimale.

**Hiérarchie de décision** (lexicographique) :
1. **Préserver les séances importantes à venir** (KEY de la semaine et de la suivante).
2. **Préserver la récupération** : ne jamais placer une séance de qualité manquée à côté d’une autre séance difficile ; respecter `recoveryDemand` et les contraintes de placement.
3. **Préserver la spécificité de l’épreuve** : proche de l’épreuve, la séance spécifique prime sur le volume.
4. **Récupérer du volume seulement si c’est compatible** avec 1 à 3, sans dépasser la charge prévue de la semaine (par exemple allonger modérément une séance easy existante ; la borne est PROGRAMMING_HEURISTIC).

**Conséquences**
- Une séance de qualité manquée n’est **pas** déplacée automatiquement à côté d’une autre séance difficile : elle est soit placée dans un créneau conforme, soit abandonnée.
- Plusieurs séances manquées : la base récente est recalculée sur le **réalisé**.

---

## T. Reprise après interruption (potentiellement G1)

| État | Définition conceptuelle | Limites |
|---|---|---|
| SHORT_INTERRUPTION | Interruption brève, sans signal de problème | Frontières en jours **non fixées** (aucune preuve) : paramètre `running.return.stateBoundaries` (PROGRAMMING_HEURISTIC ; G1 pour la frontière LONG) |
| MODERATE_INTERRUPTION | Interruption intermédiaire | idem |
| LONG_INTERRUPTION | Interruption longue ; références dégradées | idem ; G1 `RETURN_PROTOCOL` |
| UNKNOWN_RETURN_STATE | Durée ou raison inconnues | Traité **au moins** comme MODERATE, avec questions à l’utilisateur ; jamais comme SHORT par défaut |

**Informations requises avant de reprendre la progression**
- charge antérieure (historique) ;
- durée de l’interruption ;
- raison si connue (maladie, blessure, contrainte de vie : **sans diagnostic**) ;
- tolérance actuelle (retours des premières séances) ;
- course récente (depuis la reprise) ;
- readiness.

Tant que ces éléments manquent, la progression est en HOLD. Une raison déclarée « blessure » ou « douleur » renvoie à la gouvernance douleur (§U) et, le cas échéant, OUT_OF_SCOPE.

Mujika & Padilla 2000 (désentraînement rapide chez les très entraînés, seuil lactique abaissé) justifie la **dégradation de confiance** des références, pas une valeur de perte.

---

## U. Douleur et sécurité (comportement produit, aucun diagnostic)

Actions possibles : `CONTINUE`, `REDUCE`, `STOP_SESSION`, `PAUSE_PROGRESSION`, `OUT_OF_SCOPE`.

| Signal (déclaratif) | Action candidate | Gouvernance |
|---|---|---|
| Aucun | CONTINUE | — |
| Gêne déclarée légère, sans modification de la foulée (formulation à valider) | REDUCE (séance) + suivi au retour | G1 `PAIN_STOP` |
| Douleur qui modifie la foulée ou augmente pendant la séance (formulation à valider) | STOP_SESSION + PAUSE_PROGRESSION | G1 `PAIN_STOP` |
| Douleur récurrente sur plusieurs séances | PAUSE_PROGRESSION + recommandation de consulter | G1 `PAIN_STOP` |
| Symptômes non locomoteurs (malaise, douleur thoracique…) ou contexte médical | OUT_OF_SCOPE (arrêt, message de réorientation) | G1 `OUT_OF_SCOPE` |

**Aucune échelle chiffrée de douleur** n’est supposée correspondre universellement à un risque de blessure. Si une échelle est affichée, ses paliers sont des catégories produit, gouvernées séparément. Le moteur ne diagnostique jamais.

---

## V. `TaperPolicy`

| Champ | Contenu | Statut |
|---|---|---|
| `event` | 5K / 10K / HALF / MARATHON | — |
| `athleteLevel` | P-R0 … P-R4 | — |
| `previousLoad` | Charge accumulée (dimensions §Q) | — |
| `timeToEvent` | Temps restant | — |
| `volumeChange` | Réduction du volume : **principe** SUPPORTED ; **ampleur** SUPPORTED_WITH_RANGE (signal 41–60 % dans les méta-analyses poolées, multi-sports) : signal de preuve, **pas une prescription** | Ampleur par épreuve et niveau = EXPERT_DESIGN_REVIEW |
| `intensityMaintenance` | Maintien de l’intensité : SUPPORTED (Wang 2023, Bosquet 2007) | — |
| `frequencyChange` | Maintien (ou quasi-maintien) de la fréquence : SUPPORTED | — |
| `duration` | ≤ 21 jours (Wang), environ 2 semaines (Bosquet) : **CONTEXT_DEPENDENT** | Par épreuve = EXPERT_DESIGN_REVIEW |
| `specificity` | Spécificité de l’épreuve (séances de rappel spécifiques) | CONTEXT_DEPENDENT |
| `confidence` | Confiance de la politique | MEDIUM pour le principe, LOW pour l’ampleur par épreuve |

**Le taper n’est pas obligatoire** : il est appliqué seulement quand la charge accumulée le justifie et qu’une épreuve datée existe. Pas de taper pour GENERAL_RUNNING, ni pour une charge antérieure faible (Q-TAPER-4, INSUFFICIENT_EVIDENCE ⇒ décision EXPERT_DESIGN_REVIEW).

---

## W. Entraînement concurrent : profil de demande

RunningEngine fournit, par séance :
- `mechanicalDemand`, `locomotorDemand`, `metabolicDemand`, `structuralDemand` (structures sollicitées, compatibles avec la dérivation par structure de l’InterferenceAssessment Strength), `recoveryDemand` ;
- `sessionPriority` ;
- `placementConstraints` déclaratives.

Le GlobalPlanner garde l’autorité ; il n’existe **aucun espacement horaire universel**.

| Séance | Mécanique | Locomotrice | Métabolique | Structures principales | Récupération | Remarque d’interférence |
|---|---|---|---|---|---|---|
| Easy | LOW–MOD | MOD | LOW | Chaîne locomotrice globale | LOW | Placement flexible |
| Long | MOD–HIGH | HIGH | MOD | `lower_knee`, `lower_hip`, mollets | MOD–HIGH | Sensible aux jambes lourdes adjacentes |
| Threshold | MOD | MOD | HIGH | Globale | MOD–HIGH | La qualité peut souffrir d’une fatigue des jambes préalable (Q-CONC-1, non vérifié) |
| VO2 | MOD–HIGH | HIGH | HIGH | Globale, vitesse | HIGH | Séance KEY : protéger |
| Hills | MOD–HIGH | HIGH | MOD–HIGH | Chaîne postérieure, mollets | MOD–HIGH | Recouvrement fort avec la musculation des jambes et l’HYROX |
| Sprint / strides | LOW–MOD | LOW | LOW | Neuromusculaire | LOW | Peu d’interférence en module |

Valeurs **ordinales** et **candidates** (EXPERT_DESIGN_REVIEW). La matrice d’interférence n’est pas implémentée.

---

## D. Arbitrage des 75 questions

Voir [`RUNNING-SCIENCE-REGISTRY-V1.md`](RUNNING-SCIENCE-REGISTRY-V1.md), section D. Aucune question sans réponse ne devient une règle : chaque question INSUFFICIENT_EVIDENCE est soit sans règle, soit renvoyée à une décision gouvernée (EXPERT_DESIGN_REVIEW, PRODUCT_GUARDRAIL ou G1) explicitement nommée.
