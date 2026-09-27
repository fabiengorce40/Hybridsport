# Phase 5B — RUNNING SCIENTIFIC ARBITRATION & PARAMETER GOVERNANCE : rapport

> **Documentation seulement.**
>
> - **CORE UNCHANGED**
> - **STRENGTH UNCHANGED**
> - **CORE-EXT-R1 NOT IMPLEMENTED**
> - **RUNNING ENGINE CODE NOT STARTED**

## 1. État

| Contrôle | Résultat |
|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` |
| HEAD de départ | `cfcaab1` (fin 5A) |
| Tests | 630 verts sur 56 fichiers (inchangé) |
| Typecheck / lint / architecture | verts |
| CORE | LOCKED, aucun fichier modifié (empreinte F20 verte) |
| STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK | LOCKED |
| STRENGTH_SCIENTIFIC_LOCK_V1 | LOCKED_PROVISIONAL |
| RUNNING_5A_SPEC_GATE | PASS |
| Fichiers modifiés | uniquement `docs/engine-impl/*.md` |

## 2. Livrables

| # | Fichier | Contenu |
|---|---|---|
| 1 | [`RUNNING-5B-SCIENTIFIC-ARBITRATION.md`](RUNNING-5B-SCIENTIFIC-ARBITRATION.md) | A, B (corrections), C (provenance), E–W |
| 2 | [`RUNNING-SCIENCE-REGISTRY-V1.md`](RUNNING-SCIENCE-REGISTRY-V1.md) | 22 sources avec double provenance ; arbitrage des 75 questions (D) |
| 3 | [`RUNNING-PARAMETER-REGISTRY-V0.md`](RUNNING-PARAMETER-REGISTRY-V0.md) | 110 paramètres, aucune valeur devinée (Z) |
| 4 | [`RUNNING-G1-CANDIDATE-REVIEW.md`](RUNNING-G1-CANDIDATE-REVIEW.md) | Reclassement des 7 G1 (B5, X) |
| 5 | [`CORE-EXT-R1-RUNNING-INTERVALS-RFC.md`](CORE-EXT-R1-RUNNING-INTERVALS-RFC.md) | 4 options comparées ; option B recommandée (Y) |
| 6 | [`RUNNING-FORBIDDEN-CONSTANTS-AUDIT.md`](RUNNING-FORBIDDEN-CONSTANTS-AUDIT.md) | 48 lignes d’audit (AA) |
| 7 | [`RUNNING-V1-GOLDEN-SCENARIOS.md`](RUNNING-V1-GOLDEN-SCENARIOS.md) | R1–R12 révisés (AB) |
| 8 | [`RUNNING-5C-FUTURE-TEST-PLAN.md`](RUNNING-5C-FUTURE-TEST-PLAN.md) | 88 cas de test futurs (AC) |
| 9 | `RUNNING-5B-REPORT.md` | Gates (AD), rapport (AF) |

**Documents 5A mis à jour**, uniquement pour intégrer les corrections acceptées (bandeaux ou remplacements ciblés) :
- `RUNNING-V1-DOMAIN-SPEC.md` ;
- `RUNNING-V1-REFERENCE-MODEL.md` ;
- `RUNNING-V1-LOAD-PROGRESSION-SPEC.md` ;
- `RUNNING-V1-SESSION-TAXONOMY.md` ;
- `RUNNING-SCIENCE-REGISTRY-DRAFT.md` (marqué remplacé) ;
- `RUNNING-EVIDENCE-REVIEW-PACK.md` ;
- `RUNNING-5A-REPORT.md` ;
- `PHASE3-LOG.md`.

## 3. Gates

### RUNNING_5B_SCIENCE_ARBITRATION_GATE

| Critère | Statut | Preuve |
|---|---|---|
| 75 questions arbitrées | ✅ | Registre scientifique V1 §D (75 lignes, identifiants uniques) |
| Aucune question sans réponse devenue règle en silence | ✅ | Règle de statut §D : 13 INSUFFICIENT_EVIDENCE sans règle ; les autres portent une gouvernance et un paramètre nommés |
| Corrections 5A intégrées (B1–B5) | ✅ | Arbitrage §B ; documents 5A mis à jour |
| Pas de 80/20 universel | ✅ | Arbitrage §O ; audit A17 = REMOVE |
| Pas de 10 % universel | ✅ | `running.load.tenPercentRule` = non utilisée ; T-LOAD-05 |
| Pas d’autorité ACWR | ✅ | `running.load.acwr` = non utilisé ; audit A1, A3, A11 |
| CS non obligatoire | ✅ | Arbitrage §G ; T-CS-01 |
| VDOT non obligatoire | ✅ | Arbitrage §F.3 ; T-PERF-05 |
| Constructs de seuil distincts | ✅ | Arbitrage §H (paires non interchangeables) |
| Une variable de progression dominante | ✅ | Arbitrage §R ; T-PROG-01 |
| G1 reclassés | ✅ | Revue G1 |
| Mécanisme du taper séparé de l’ampleur | ✅ | Arbitrage §V (quatre composantes) |
| Confiance de référence ≠ confiance de prescription | ✅ | Arbitrage §F.2 ; T-CONF-04 |
| Registre des paramètres sans valeur inventée | ✅ | 24 paramètres NUMERIC / RANGE, tous vides sauf le signal de preuve du taper (non prescriptif) |
| RFC CORE-EXT-R1 complète | ✅ | 4 options, critères, recommandation, plan futur |
| R1–R12 mis à jour | ✅ | Scénarios révisés |
| ≥ 40 tests futurs | ✅ | 88 |
| Aucun code RunningEngine | ✅ | `git diff` : aucun fichier hors `docs/` |

**RUNNING_5B_SCIENCE_ARBITRATION_GATE = PASS**

### RUNNING_SCIENTIFIC_READINESS

| Valeur | Conditions | Évaluation |
|---|---|---|
| NOT_READY | Arbitrage incomplet, ou règles non gouvernées | Non : l’arbitrage est complet et chaque règle est gouvernée |
| **READY_FOR_RULESET_DESIGN** | Questions arbitrées ; paramètres nommés avec statut et gouvernance ; G1 identifiés ; aucune valeur inventée | **Oui.** La conception du ruleset consiste précisément à proposer des valeurs sous revue d’expert et visa G1. Elle n’exige pas de valeur déjà validée. |
| READY_FOR_IMPLEMENTATION | Valeurs choisies et revues ; G1 signés ; sources clés au moins ABSTRACT_VERIFIED par Claude ou par une provenance acceptée ; CORE-EXT-R1 approuvée | Non : aucune valeur, aucun G1 signé, Claude à SEARCH_SUMMARY, RFC non approuvée |

**RUNNING_SCIENTIFIC_READINESS = READY_FOR_RULESET_DESIGN**. Ce résultat découle des conditions ci-dessus : ni forcé, ni prêt pour l’implémentation.

## 4. Synthèse (points 8 à 29 du rapport demandé)

### 4.1 Questions et statuts
- **Questions arbitrées** : 75 sur 75.
- **Distribution des statuts** :

| Statut | Nombre |
|---|---|
| EXPERT_DESIGN_REVIEW | 20 |
| CONTEXT_DEPENDENT | 16 |
| INSUFFICIENT_EVIDENCE | 13 |
| PROGRAMMING_HEURISTIC | 10 |
| PRODUCT_GUARDRAIL | 5 |
| SUPPORTED | 4 (conclusions négatives ou de principe) |
| SAFETY_SIGNOFF_REQUIRED | 3 |
| TECHNICAL | 3 |
| SUPPORTED_WITH_RANGE | 1 (ampleur du taper) |

### 4.2 Sources
- **Total** : 22.
- **Niveau de Claude** : 21 à SEARCH_SUMMARY, 1 à IDENTITY_ONLY ; aucune à ABSTRACT_VERIFIED.
- **Vérification externe** : 3 sources `EXTERNAL_COUNTER_AUDIT_VERIFIED` au niveau abstract (PMID 41931241, 38717713, 37163550), enregistrées comme vérifiées par le contre-audit, **pas par Claude**.
- PubMed et EuropePMC restent refusés par le proxy (vérifié en 5B).

### 4.3 Modèle
- **Hiérarchie des références** :
  - ordre par défaut, propre à chaque décision : performance récente fiable et spécifique > référence de terrain ou de laboratoire validée (pour ce qu’elle mesure) > plusieurs performances cohérentes (interpolation) > observations cohérentes > modèle générique (transformateur) > déclaration > calibration ;
  - récence traitée par décroissance contextuelle et demande de revue, jamais par une expiration universelle.
- **Confiance de référence** : LOW / MEDIUM / HIGH (ou aucune), attribuée par décision selon des critères ordinaux ; conditions pour HIGH définies par type de référence.
- **Confiance de prescription** : minimum des facteurs limitants ; elle fixe la largeur des plages, la priorité de cible et l’éligibilité des séances exigeantes. Elle est distincte de la confiance de référence.
- **Intensité** :
  - 3 domaines physiologiques + catégories d’usage ;
  - le domaine est toujours la cible interne ;
  - PACE, RPE et HR sont des indicateurs, avec une modalité préférée par archétype ;
  - aucun pourcentage fixe ;
  - carte des seuils sans fusion silencieuse.
- **Archétypes** : 13 → **11**.
  - Fusionnés : RECOVERY_RUN → EASY_RUN (variante) ; THRESHOLD_INTERVALS + CONTINUOUS_THRESHOLD → THRESHOLD (structure CONTINUOUS ou INTERVALS).
  - STRIDES devient un module.
  - PROGRESSION_RUN et SHORT_INTERVALS sont conservés comme PROGRAMMING_HEURISTIC.
  - Aucun retrait sec.
- **Charge** :
  - 10 dimensions : `weeklyDuration`, `weeklyDistance`, `runFrequency`, `longRunDuration`, `highIntensityExposure`, `moderateHeavyExposure`, `mechanicalExposure`, `sessionDensity`, `concurrentLocomotorLoad`, `internalLoadSRPE` ;
  - `recentLoadChange` retirée (c’est une sortie) ;
  - chaque dimension est MEASURED, DERIVED, ESTIMATED ou UNKNOWN ; UNKNOWN n’est jamais imputé.
- **Progression** :
  - une variable dominante parmi 10, sans priorité universelle ;
  - sorties : variable, direction, `magnitudeClass` (libellés opérationnels) et codes de raison ;
  - 10 conditions de HOLD.
- **Séance manquée** : jamais de rattrapage, jamais d’empilement, pas de modèle de dette. Hiérarchie : séances importantes > récupération > spécificité > volume compatible.
- **Reprise** :
  - états SHORT / MODERATE / LONG / UNKNOWN, sans frontières en jours ;
  - UNKNOWN traité au moins comme MODERATE *(corrigé en 5C, B2 : UNKNOWN reste UNKNOWN)* ;
  - informations requises avant de reprendre la progression ;
  - G1 pour LONG / UNKNOWN ;
  - aucun diagnostic.
- **Taper** :
  - `TaperPolicy` : principe SUPPORTED ; ampleur SUPPORTED_WITH_RANGE (signal 41–60 %, non prescriptif) ; durée et spécificité CONTEXT_DEPENDENT ;
  - taper non obligatoire.
- **Concurrent** :
  - l’autorité reste au GlobalPlanner et à l’InterferenceManager ;
  - profils de demande ordinaux par type de séance ;
  - aucun espacement horaire universel.

### 4.4 Gouvernance
- **G1 finaux** :
  - PAIN_STOP ;
  - RETURN_PROTOCOL (LONG / UNKNOWN) ;
  - NOVICE_ENTRY (volet sécurité) ;
  - OUT_OF_SCOPE ;
  - reclassés : LONGRUN_BOUND → EXPERT_DESIGN_REVIEW ; HI_DENSITY et LOAD_INCREASE_BOUND → PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW ;
  - règle de précédence ajoutée : un paramètre non G1 ne relâche jamais une contrainte G1.
- **Paramètres** : 110.

| Statut | Nombre |
|---|---|
| EXPERT_DESIGN_REVIEW | 39 |
| PROGRAMMING_HEURISTIC | 23 |
| PRODUCT_GUARDRAIL | 12 |
| CONTEXT_DEPENDENT | 12 |
| TECHNICAL | 9 |
| SAFETY_SIGNOFF_REQUIRED | 7 |
| SUPPORTED | 5 |
| INSUFFICIENT_EVIDENCE | 2 |
| SUPPORTED_WITH_RANGE | 1 |

  - Gouvernance : G2 90, T 8, G1 7, G3 5.
  - 24 paramètres NUMERIC / RANGE, tous sans valeur (sauf le signal du taper).

### 4.5 Audit, CORE, scénarios, tests
- **Constantes interdites** : 48 lignes d’audit.

| Classe | Nombre |
|---|---|
| REMOVE | 3 (80/20, long run en %, « intensité en dernier ») |
| REPLACE | 21 |
| KEEP_AS_HEURISTIC | 12 |
| KEEP_AS_HISTORICAL_REFERENCE | 8 |
| REQUIRES_EVIDENCE | 4 |

  - Les documents d’architecture ne sont pas modifiés.
  - Erreur factuelle 5A corrigée : l’allure `paceSecPerKm` du CORE est déjà une plage.
- **CORE-EXT-R1** :
  - option B recommandée : prescription `run_structure` à segments (séries > répétitions), cibles en plages avec domaine obligatoire et priorité, effort suffisant sans montre, estimations dérivées ;
  - `session_record` v4, additif et rétrocompatible ;
  - **non implémentée**.
- **R1–R12** : ajout, pour chaque scénario, des références faisant autorité, des archétypes autorisés et interdits, de l’autorité de progression, des points d’attention charge et concurrent, des interactions G1 et des codes de raison attendus. 10 invariants transverses (contre 8 en 5A).
- **Tests futurs** : 88.

### 4.6 Incertitudes et blocages
- **Principales incertitudes scientifiques** :
  - long run et spécificité marathon (aucune source) ;
  - fréquence (aucune source) ;
  - protocole et modèle de CS ;
  - correspondance entre méthodes de seuil (chiffres non extraits) ;
  - protocoles de reprise ;
  - taper propre à la course selon l’épreuve ;
  - validité du talk test chez les sains ;
  - âge ;
  - González-Mohíno 2020 non extrait.
- **Blocages avant implémentation** :
  1. Conception du ruleset : proposer les valeurs des paramètres EXPERT_DESIGN_REVIEW, PROGRAMMING_HEURISTIC et PRODUCT_GUARDRAIL, avec justification.
  2. Signature des 4 G1_SAFETY Running.
  3. Accès aux résumés : faire passer Claude au moins à ABSTRACT_VERIFIED, ou accepter formellement la provenance externe, pour les sources qui justifient des valeurs.
  4. Approbation de la RFC CORE-EXT-R1, puis phase CORE dédiée (schéma, `session_record` v4, estimation de durée, `reduce_run_volume`).
  5. Correction des documents d’architecture selon l’audit (après validation).
  6. Revue experte des tables ordinales (demandes des séances, éligibilité, priorités de phase).

## 5. Confirmations

- **CORE UNCHANGED**
- **STRENGTH UNCHANGED**
- **CORE-EXT-R1 NOT IMPLEMENTED**
- **RUNNING ENGINE CODE NOT STARTED**

STOP : la phase 5C n’est pas commencée.
