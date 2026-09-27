# Phase 5G — RUNNING V1 EXTENDED SCOPE FREEZE : rapport

> **Documentation seulement.**
>
> - **RUNNING_V1_SCOPE = C_EXTENDED**
> - **CORE UNCHANGED**
> - **STRENGTH UNCHANGED**
> - **CORE-EXT-R1 NOT IMPLEMENTED**
> - **RUNNING ENGINE CODE NOT STARTED**
> - **NO EXPERT DECISION AUTO-APPROVED**
> - **NO G1 AUTO-SIGNED**

## 1. État

| Contrôle | Résultat |
|---|---|
| Branche / HEAD de départ | `claude/fitness-app-architecture-81fs92` / `a01872c` (fin 5F), arbre propre |
| Tests / typecheck / lint / architecture | 630 verts ; verts |
| RUNNING_5F_SCOPE_FREEZE_GATE | PASS |
| Blocage précédent SCOPE_DECISION_REQUIRED | **Levé par le fondateur** (C_EXTENDED) |

## 2. Livrables

| # | Fichier |
|---|---|
| 1 | [`RUNNING-V1-SCOPE-C-FREEZE.md`](RUNNING-V1-SCOPE-C-FREEZE.md) |
| 2 | [`RUNNING-V1-CAPABILITY-MATRIX.md`](RUNNING-V1-CAPABILITY-MATRIX.md) |
| 3 | [`RUNNING-V1-DECISION-DEPENDENCIES.md`](RUNNING-V1-DECISION-DEPENDENCIES.md) |
| 4 | [`RUNNING-V1-CAPABILITY-FLAGS.md`](RUNNING-V1-CAPABILITY-FLAGS.md) |
| 5 | [`RUNNING-V1-PRODUCTION-ELIGIBILITY.md`](RUNNING-V1-PRODUCTION-ELIGIBILITY.md) |
| 6 | [`CORE-EXT-R1-APPROVAL-PACK.md`](CORE-EXT-R1-APPROVAL-PACK.md) |
| 7 | [`RUNNING-V1-IMPLEMENTATION-WAVES.md`](RUNNING-V1-IMPLEMENTATION-WAVES.md) |
| 8 | [`RUNNING-V1-TEST-STRATEGY.md`](RUNNING-V1-TEST-STRATEGY.md) |
| 9 | [`RUNNING-V1-ACCEPTANCE-CRITERIA.md`](RUNNING-V1-ACCEPTANCE-CRITERIA.md) |
| 10 | `RUNNING-5G-REPORT.md` |

**Mis à jour** : `RUNNING-5F-SCOPE-OPTIONS.md` (sélection C enregistrée) ; `PHASE3-LOG.md`.

## 3. Gate

| Critère | Statut |
|---|---|
| Périmètre C enregistré comme choix du fondateur | ✅ |
| Aucune approbation scientifique déduite | ✅ |
| Matrice des capacités complète | ✅ |
| Matrice des fonctions complète | ✅ |
| 14 décisions expertes + 4 G1 + V33 / V34 suivies | ✅ |
| Graphe de dépendances complet | ✅ |
| Drapeaux de capacité conçus | ✅ (11) |
| Éligibilité à la production conçue | ✅ |
| Trois questions CORE-EXT-R1 arbitrées au niveau conception | ✅ |
| Dossier d’approbation créé | ✅ |
| Vagues d’implémentation définies | ✅ |
| Tests rattachés aux vagues | ✅ |
| Critères d’acceptation du périmètre C définis | ✅ |
| Entrées R1–R12 toujours figées | ✅ |
| Aucune nouvelle valeur non soutenue | ✅ |
| Aucune approbation experte ou G1 automatique | ✅ |
| Aucun changement de code | ✅ |

**RUNNING_5G_EXTENDED_SCOPE_FREEZE_GATE = PASS**

**RUNNING_PRE_IMPLEMENTATION_STATUS = CORE_EXTENSION_APPROVAL_REQUIRED**
- Le périmètre est décidé. Le seul prérequis humain **avant d’écrire du code** est l’approbation de CORE-EXT-R1 par le fondateur (vague 0).
- Les décisions expertes et G1 restent en attente, mais elles conditionnent l’**activation**, pas la construction (audit 5F).
- Les états READY_FOR_* ne sont pas forcés.

## 4. Synthèse (points 8 à 41 du rapport demandé)

### 4.1 Capacités
- **Périmètre retenu** : C_EXTENDED (A et B rejetés comme cibles V1).
- **Populations × objectifs** :
  - P-R1 à P-R4 en course générale, 5K et 10K : activés en mode dégradé une fois le socle acquis (complets avec E-PACE, E-FIRST et E-PROG) ;
  - semi : dégradé pour P-R2 à P-R4 (complet avec E-MODEL et E-TAPER), verrouillé expert pour P-R1 ;
  - marathon : verrouillé expert pour P-R2 à P-R4, hors modèle pour P-R1 ;
  - P-R0 : verrouillé G1 (général et 5K par reclassement), hors modèle pour 10K et plus tant que l’athlète est P-R0 ;
  - P-HYBRID : verrouillé technique (planificateur) ;
  - premier départ après une longue coupure : verrouillé G1.
- **Fonctions** :
  - cibles : EASY, TEST, STRIDES, REFERENCE_CALIBRATION ;
  - cibles avec dégradation : LONG, THRESHOLD, VO2, SHORT, HILLS, RACE_PACE, RETURN_PROGRAMMING ;
  - verrouillées expert : TAPER, PERFORMANCE_EXTRAPOLATION ;
  - verrouillées G1 : NOVICE_ENTRY, premier départ après une longue coupure ;
  - après V1 : PROGRESSION_RUN ;
  - toute séance structurée est verrouillée techniquement jusqu’à CORE-EXT-R1.

### 4.2 Décisions et drapeaux
- **Décisions expertes ouvertes** : 14. **G1 ouvertes** : 4. **V33** : UNRESOLVED (P-R0 désactivé). **V34** : UNRESOLVED (premier départ : NO_VALID).
- **Drapeaux** : 11.
- **Éligibilité à la production** :
  - états de maturité : UNRESOLVED, EXPERT_PROPOSED, EXPERT_APPROVED, PRODUCT_APPROVED, TECHNICAL_APPROVED, SAFETY_APPROVED (G1 seulement), PRODUCTION_ELIGIBLE ;
  - éligibilité par capacité = socle + décisions + états requis + G1 + ruleset verrouillé + dépendances techniques, avec les identifiants bloquants.

### 4.3 Chaînes de dépendances
- **P-R0** : G1-SCOPE → G1-NOVICE (politique) → V33 (cosignée) → drapeau → activation.
- **Premier départ après une longue coupure** : G1-RETURN → V24 → V34 → drapeau.
- **Marathon** : E-LONG (← E-PROG, E-DENSITY) → E-TAPER (volet marathon) → allure par calibration → drapeau.
- **Progression au-delà de l’historique** : E-RECENTLOAD → E-PROG (valeurs V23) → drapeau.
- **Qualité en première exposition** : E-FIRST → E-RECOVERY (→ E-QUALITY si option C) → drapeaux.

### 4.4 CORE-EXT-R1
- **Q1** : option D, une dose en distance seulement si une plage d’allure existe (cible, ou plage observée avec provenance) ; sinon la répétition est à la durée ; jamais d’allure inventée.
- **Q2** : estimations stockées avec provenance, recalculées à la validation ; tout écart est refusé ; v3 = indisponible, jamais reconstruit.
- **Q3** : règle exclusive, segments internes pour une séance de course pure, blocs séparés pour une séance multidiscipline ; double échauffement interdit.
- **CORE_EXT_R1_DESIGN_RECOMMENDATION = READY_FOR_FOUNDER_APPROVAL.**

### 4.5 Vagues
- **Vague 0** : CORE-EXT-R1 (après approbation).
- **Vague 1** : fondations, dont registre, éligibilité, drapeaux et **RecentLoadContext** (avancé).
- **Vague 2** : EASY, STRIDES, TEST, LONG de base.
- **Vague 3** : THRESHOLD, VO2, SHORT, HILLS, RACE_PACE.
- **Vague 4** : composition, progression, séances manquées, reprise, planificateur.
- **Vague 5** : marathon, taper, novice, premier départ après une longue coupure, extrapolation, allures (derrière leurs drapeaux).

### 4.6 Tests et acceptation
- **Goldens** : entrées figées (YES).
- **Familles de tests** : sérialisation et rejeu, dérivation de la durée, unitaires, provenance, éligibilité, drapeaux, propriétés, NO_VALID, goldens, comparaisons, adversariaux, mutation.
- **Acceptation** : 13 critères ; niveaux IMPLEMENTED, VALIDATED, PRODUCTION_ENABLED (partiel) et COMPLETE ; une capacité désactivée reste dans le périmètre.

## 5. Actions humaines

### Groupe 1 — Fondateur (produit et architecture)
1. **Approuver ou refuser CORE-EXT-R1**, y compris les recommandations Q1 (D), Q2 (stocker + vérifier) et Q3 (règle exclusive).
2. **Adopter le modèle** de drapeaux de capacité et d’éligibilité à la production (principe).
3. **Cosigner les garde-fous produit** : E-LOAD (V22) et E-DENSITY (volet garde-fou), avec l’expert.
4. **Saisir le conseil juridique** sur la classification réglementaire de l’application (hors périmètre de nos preuves).

### Groupe 2 — Expert de programmation course
1. Les **14 décisions** : E-RPE, E-DENSITY*, E-RECENCY, E-RECENTLOAD, E-PACE, E-VARIABILITY, E-MODEL, E-LOAD*, E-PROG, E-FIRST, E-TAPER, E-LONG, E-RECOVERY, E-QUALITY (* cosignature du fondateur).
2. **Doses V33 et V34** (cosignature sécurité).

### Groupe 3 — Revue de sécurité
1. **G1-PAIN**, **G1-SCOPE**, **G1-NOVICE** (politique), **G1-RETURN** (politique, dont les frontières V24 et la falaise à 28 jours).
2. **Cosignature de V33 et V34.**

Les doublons sont limités aux cosignatures réellement requises.

## 6. Contrôles de discipline
- Nouvelles valeurs numériques : **0**.
- Approbations automatiques : **0**.
- Modifications de code : **0**.

STOP.
