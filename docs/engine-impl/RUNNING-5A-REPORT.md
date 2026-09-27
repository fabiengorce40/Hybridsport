# Phase 5A — RUNNING ENGINE SCIENTIFIC & DOMAIN SPEC : rapport

> **Correctifs 5B** (trace conservée ci-dessous, sans réécriture) :
> - « une hausse exige une nouvelle performance » → hausse substantielle sur preuve suffisamment fiable (B1) ;
> - « intensité en dernier » → supprimé (B2) ;
> - 7 G1 → 4 G1_SAFETY (B5) ;
> - `tenPercentRule` → SUPPORTED (conclusion négative).
>
> Voir [`RUNNING-5B-REPORT.md`](RUNNING-5B-REPORT.md).

> **Documentation seulement. RUNNING ENGINE CODE NOT STARTED.**
>
> Non modifiés : CORE, StrengthEngine, rulesets Strength, registre scientifique Strength, G1 Strength, CORE-EXT-5.

## 1. État du dépôt

| Contrôle | Résultat |
|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` |
| HEAD de départ | `386e414` (fin 4G), arbre propre |
| Tests | 630 verts sur 56 fichiers (inchangé) |
| Typecheck / lint / architecture | verts |
| Modifications de code | **aucune** : seuls 9 fichiers Markdown sont ajoutés et `PHASE3-LOG.md` est complété |
| STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK | **LOCKED** |
| STRENGTH_SCIENTIFIC_LOCK_V1 | LOCKED_PROVISIONAL (inchangé) |
| RunningEngine | **NOT IMPLEMENTED** ; aucun code existant à inventorier (points d’accroche CORE listés en domain spec §A.1) |

## 2. Livrables

| # | Fichier | Sections |
|---|---|---|
| 1 | [`RUNNING-V1-DOMAIN-SPEC.md`](RUNNING-V1-DOMAIN-SPEC.md) | A, B, C, D, H, O, V, W, AE, AF ; extension CORE candidate (CORE-EXT-R1) ; divergences avec l’architecture initiale |
| 2 | [`RUNNING-V1-REFERENCE-MODEL.md`](RUNNING-V1-REFERENCE-MODEL.md) | E, F, G, K, Z |
| 3 | [`RUNNING-V1-SESSION-TAXONOMY.md`](RUNNING-V1-SESSION-TAXONOMY.md) | I, J, M, N, P |
| 4 | [`RUNNING-V1-LOAD-PROGRESSION-SPEC.md`](RUNNING-V1-LOAD-PROGRESSION-SPEC.md) | L, Q, R, S, T, X, Y |
| 5 | [`RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC.md`](RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC.md) | U, V (côté interférence) |
| 6 | [`RUNNING-EVIDENCE-REVIEW-PACK.md`](RUNNING-EVIDENCE-REVIEW-PACK.md) | AB, AC (75 questions) |
| 7 | [`RUNNING-SCIENCE-REGISTRY-DRAFT.md`](RUNNING-SCIENCE-REGISTRY-DRAFT.md) | AA (51 entrées) |
| 8 | [`RUNNING-V1-GOLDEN-SCENARIOS.md`](RUNNING-V1-GOLDEN-SCENARIOS.md) | AD (R1–R12) |
| 9 | `RUNNING-5A-REPORT.md` | AH, AI |

## 3. RUNNING_5A_SPEC_GATE

| Critère | Statut | Preuve |
|---|---|---|
| Aucun code RunningEngine créé | ✅ | `git diff` : aucun fichier hors `docs/` |
| Références séparées des prescriptions | ✅ | Domain spec §B.1 ; modèle de références, règle 2 |
| Modèle de confiance défini | ✅ | `RunningReferenceConfidence` (§F.4), `RUNNING_PRESCRIPTION_CONFIDENCE` (§Z) |
| Taxonomie des séances définie | ✅ | 13 archétypes avec tous les champs demandés (taxonomie §I) |
| Domaines d’intensité définis | ✅ | Modèle hybride à 3 domaines + catégories d’usage (domain spec §H) |
| Modèle de charge multidimensionnel | ✅ | Spec charge §Q.1 (10 dimensions), LOAD CHANGE ASSESSMENT (§Q.2) |
| Règle des 10 % non utilisée comme vérité | ✅ | §Q.3 ; registre `running.load.tenPercentRule` = INSUFFICIENT_EVIDENCE |
| TID non réduite à 80/20 | ✅ | §L ; registre `running.tid.policy` = CONTEXT_DEPENDENT |
| CS non traitée comme vérité absolue | ✅ | Modèle de références §G ; D’ séparé |
| Seuil correctement désambiguïsé | ✅ | Domain spec §O (LT1, LT2, MLSS, CS, allures 10K et semi, « tempo ») |
| Taper : principe séparé de l’amplitude | ✅ | §T.2 : principe SUPPORTED ; volume SUPPORTED_WITH_RANGE ; durée CONTEXT_DEPENDENT |
| Concurrent renvoyé au GlobalPlanner | ✅ | Spec concurrente §1, §5 |
| Sécurité / gouvernance explicite | ✅ | §R : 4 classes de règles, 7 G1 candidats |
| ≥ 60 questions scientifiques | ✅ | 75 |
| R1–R12 définis | ✅ | Scénarios de référence |
| Aucune constante physiologique inventée | ✅ | Aucune valeur numérique de prescription ; les seuls chiffres sont ceux rapportés par les sources, attribués et non convertis en constantes |

**RUNNING_5A_SPEC_GATE = PASS**

Ce PASS porte sur la **spécification**. Il ne dit rien de la validité scientifique finale : toutes les sources sont au niveau SEARCH_SUMMARY au mieux, et le contre-audit humain et scientifique reste requis avant la 5B.

## 4. Synthèse (points 6 à 22 du rapport demandé)

- **Populations V1** :
  - P-R0 à P-R4 ;
  - P-HYBRID comme contexte ajouté à un niveau ;
  - classification par l’historique observable, jamais par l’âge ou le sexe ;
  - hors V1 : élite, mineurs, grossesse, pathologie.
- **Objectifs V1** :
  - GENERAL_RUNNING, 5K, 10K, HALF_MARATHON, MARATHON ;
  - HYBRID_RUNNING_SUPPORT en architecture seulement ;
  - profils qualitatifs, sans pourcentage.
- **Hiérarchie des références** : par décision, par tri ordinal (validité du protocole > spécificité > récence > fiabilité > accord), sans pondération. En cas de conflit, l’estimation la plus prudente est retenue. Une hausse exige une nouvelle performance ; une baisse peut venir d’observations concordantes.
- **Confiance** : `RunningReferenceConfidence` par décision (LOW / MEDIUM / HIGH ou aucune) ; `RUNNING_PRESCRIPTION_CONFIDENCE` = minimum des facteurs limitants, qui fixe la largeur des plages et la priorité de cible.
- **Intensité** :
  - domaines MODERATE, HEAVY, SEVERE, avec les catégories EASY_LOW (plafond), THRESHOLD_LIKE et SPRINT_NEUROMUSCULAR ;
  - échelle d’affichage séparée ;
  - pas de « zone 2 = X % FCmax ».
- **Taxonomie** : 13 archétypes ; structure fractionnée complète (séries, récupération entre séries, mode de récupération, plages) ; durée de travail distincte de la durée de séance.
- **Charge** :
  - 10 dimensions, sans score unique ;
  - LOAD CHANGE ASSESSMENT en 5 classes ordinales ;
  - bornes = garde-fous G1, non préventifs ;
  - ni règle des 10 %, ni ACWR.
- **Progression** :
  - une variable dominante par cycle, choisie selon cet ordre : blocages > phase > écart à l’objectif > variable la moins récemment progressée > intensité en dernier ;
  - l’intensité ne progresse que sur nouvelle référence.
- **Taper** : principe SUPPORTED (Wang 2023, Bosquet 2007) ; réduction du volume SUPPORTED_WITH_RANGE ; durée et forme CONTEXT_DEPENDENT / INSUFFICIENT_EVIDENCE.
- **Concurrent** :
  - délégué au GlobalPlanner et à l’InterferenceManager ;
  - RunningEngine fournit des demandes de séance avec contraintes déclaratives ;
  - pas d’espacement universel ;
  - Huiberts 2024 : les effets dépendent du sexe, du statut d’entraînement et de l’outcome.
- **Règles de sécurité candidates** :
  - pas de prétention de prévention ;
  - arrêt de progression sur douleur ;
  - reprise progressive ;
  - pas de test maximal pour P-R0 ;
  - jamais deux séances difficiles empilées ;
  - hausse d’allure seulement sur preuve ;
  - message hors périmètre.
- **Questions scientifiques** : 75, réparties sur les 22 thèmes demandés.
- **Sources** : 22 sources.
  - 20 identités confirmées, 2 partielles (scoping review CS 2026 : auteurs non capturés ; González-Mohíno 2020 : PMID non confirmé).
  - Niveau **SEARCH_SUMMARY** pour 21 sources et **IDENTITY_ONLY** pour González-Mohíno.
  - Aucune source n’atteint ABSTRACT_VERIFIED, car PubMed et EuropePMC sont bloqués.
- **Principales incertitudes** :
  - protocole et modèle de CS ;
  - correspondance entre les méthodes de seuil ;
  - dose du long run et spécificité marathon (aucune source vérifiée) ;
  - fréquence (aucune source vérifiée) ;
  - protocoles de reprise ;
  - validité du talk test chez les coureurs sains ;
  - taper propre à la course selon la distance ;
  - âge (aucune donnée) ;
  - résultats de González-Mohíno 2020 non extraits.
- **Paramètres probablement G1** :
  - `R-G1-LOAD-INCREASE-BOUND` ;
  - `R-G1-RETURN-PROTOCOL` ;
  - `R-G1-PAIN-STOP` ;
  - `R-G1-NOVICE-ENTRY` ;
  - `R-G1-LONGRUN-BOUND` ;
  - `R-G1-HI-DENSITY` ;
  - `R-G1-OUT-OF-SCOPE`.
- **R1–R12** : novice sans référence ; premier 5 km ; 10 km avec référence fiable ; semi ; 10 km avancé multi-références ; marathon avec historique long ; hybride ; reprise ; références conflictuelles ; séance manquée ; taper ; référence déclarée seule. Huit invariants transverses sont prévus pour la 5B.
- **Non-objectifs V1** : GPS natif, coaching en direct, météo, altitude, détection de terrain, biomécanique, diagnostic médical, chaussures, prédiction par apprentissage automatique, moteur HYROX, trail / ultra / demi-fond, VO2max estimée par la montre.

## 5. Points à trancher au contre-audit (avant 5B)

1. Accepter le modèle interne hybride à 3 domaines (§H), ou revenir à un modèle à 5 zones interne.
2. Choisir le ou les modèles d’équivalence de distances (VDOT et autres non vérifiés en 5A).
3. Ouvrir la RFC CORE-EXT-R1 (structure fractionnée, cibles en plages avec priorité) et fixer la sémantique de `reduce_run_volume`.
4. Choisir entre décharge périodique et décharge conditionnelle.
5. Corriger `docs/architecture/04` et `07` selon la table de divergences (domain spec §AG), non modifiés en 5A.
6. Obtenir un accès aux résumés ou aux textes intégraux pour monter les sources au niveau ABSTRACT_VERIFIED au minimum.
7. Désigner les signataires G1 Running.

## 6. Confirmation

**RUNNING ENGINE CODE NOT STARTED.** STOP : attente du contre-audit humain et scientifique avant la phase 5B.
