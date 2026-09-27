# Phase 5E — RUNNING EXPERT & SAFETY DECISION PACK : rapport

> **Documentation seulement.**
>
> - **CORE UNCHANGED**
> - **STRENGTH UNCHANGED**
> - **CORE-EXT-R1 NOT IMPLEMENTED**
> - **RUNNING ENGINE CODE NOT STARTED**
> - **NO G1 POLICY AUTO-SIGNED**
> - **NO EXPERT DECISION AUTO-APPROVED**

## 1. État

| Contrôle | Résultat |
|---|---|
| Branche / HEAD de départ | `claude/fitness-app-architecture-81fs92` / `0e0c538` (fin 5D) |
| Tests | 630 verts (avant et après) |
| Typecheck / lint / architecture | verts |
| CORE / Strength | inchangés (LOCKED ; LOCKED / LOCKED_PROVISIONAL) |
| Confirmations de départ | V23, V31, V32 non résolus ; V33, V34 bloqués G1 ; R1 et R8 BLOCKED_G1 ; 0 sur 4 G1 signés |

## 2. Livrables

| # | Fichier |
|---|---|
| 1 | [`RUNNING-5E-EXPERT-DECISION-PACK.md`](RUNNING-5E-EXPERT-DECISION-PACK.md) |
| 2 | [`RUNNING-5E-G1-SAFETY-PACK.md`](RUNNING-5E-G1-SAFETY-PACK.md) |
| 3 | [`RUNNING-5E-GOLDEN-IMPACT-MATRIX.md`](RUNNING-5E-GOLDEN-IMPACT-MATRIX.md) |
| 4 | [`RUNNING-5E-BLOCKER-DEPENDENCIES.md`](RUNNING-5E-BLOCKER-DEPENDENCIES.md) |
| 5 | [`RUNNING-V1-MINIMUM-SCIENTIFIC-SCOPE.md`](RUNNING-V1-MINIMUM-SCIENTIFIC-SCOPE.md) |
| 6 | [`RUNNING-5E-FEATURE-DEGRADATION.md`](RUNNING-5E-FEATURE-DEGRADATION.md) |
| 7 | [`RUNNING-5E-HUMAN-DECISION-FORM.md`](RUNNING-5E-HUMAN-DECISION-FORM.md) |
| 8 | [`RUNNING-5E-DECISION-SIMULATIONS.md`](RUNNING-5E-DECISION-SIMULATIONS.md) |
| 9 | `RUNNING-5E-REPORT.md` |

**Documents mis à jour** (provenance et corrections acceptées seulement) :
- `RUNNING-SCIENCE-REGISTRY-V1.md` (provenance externe) ;
- `RUNNING-PARAMETER-EVIDENCE-MATRIX.md` (Hopkins, Buist, Smyth) ;
- `RUNNING-PARAMETERS-V1-CANDIDATE.md` (V42, V38, V28m) ;
- `RUNNING-GOLDEN-PRESCRIPTIONS-V1-CANDIDATE.md` (R4 : allure semi suspendue ; R11 : intervalle sans valeur par défaut) ;
- `RUNNING-RECENT-LOAD-CONTEXT.md` (`bestToleratedExposure`, réponse négative) ;
- `PHASE3-LOG.md`.

## 3. Corrections

| Correction | Résultat |
|---|---|
| Provenance (B) | EXTERNAL_ABSTRACT_VERIFIED : Hopkins 2001, Buist 2008, Oliveira 2024, Wang 2023, scoping CS 2026. EXTERNAL_FULL_TEXT_VERIFIED : Smyth 2021 (observationnel). Le niveau propre à Claude reste SEARCH_SUMMARY. |
| V42 (C) | La constante universelle est remplacée par **RunningPerformanceVariabilityEstimate** : variabilité personnelle si l’athlète a assez de performances comparables ; sinon a priori par distance et par niveau (Hopkins) avec confiance réduite ; pas de sexe ; âge seulement si décidé ; repli produit explicite (PRODUCT_GUARDRAIL / EXPERT_PROPOSED), soumis à décision |
| V38 (D) | Trois éléments séparés : paramètre du modèle (exposant non verrouillé), incertitude de prédiction (largeur DECISION_REQUIRED, ce n’est pas ±6 %), gravité des conflits (V43). Jamais d’autorité pour le marathon. R4 : allure semi suspendue. Décision E-MODEL. |
| Taper (E) | Smyth : texte intégral vérifié par le contre-audit, **observationnel**. Marathon 2–3 semaines (SOURCE_INFORMED / CONTEXT_DEPENDENT), jamais « 21 jours obligatoires ». R11 : base 240 ; réduction 41–60 % ; volume **96,0–141,6** ; **aucune sélection par défaut** (E-TAPER). |
| RecentLoadContext (F) | `bestToleratedExposure` (pas un maximum sûr) ; réponse négative définie par les données du produit : échec de réalisation hors contrainte de temps, MUCH_HARDER, intolérance ou douleur déclarée, readiness dégradée, adhérence effondrée ; fenêtre de 4 semaines et médiane provisoires |

## 4. Gates

### RUNNING_5E_DECISION_PACK_GATE

| Critère | Statut |
|---|---|
| Tous les bloquants experts associés à des décisions finies | ✅ (14) |
| Tous les bloquants G1 associés | ✅ (4) |
| Correspondance 4 politiques / 7 paramètres exacte | ✅ |
| Aucune signature automatique | ✅ (0) |
| Aucune nouvelle valeur numérique non soutenue | ✅ (0 ; les besoins sont notés DECISION_REQUIRED) |
| Constante universelle V42 corrigée | ✅ |
| Incertitude de V38 séparée du seuil de conflit | ✅ |
| R11 ne se fixe plus par défaut à 96 min | ✅ |
| Formulation de RecentLoadContext corrigée | ✅ |
| Matrice d’impact R1–R12 | ✅ |
| Graphe de dépendances | ✅ |
| Ensemble minimal d’implémentation | ✅ (8 décisions) |
| Dégradations sûres documentées | ✅ |
| Périmètre scientifique minimal | ✅ |
| Préparation de CORE-EXT-R1 évaluée | ✅ |
| Aucun code RunningEngine ; CORE et Strength inchangés | ✅ |

**RUNNING_5E_DECISION_PACK_GATE = PASS**

### RUNNING_HUMAN_DECISION_READINESS = **READY_FOR_EXPERT_DECISIONS**

Aucune signature ni décision humaine n’existe. READY_FOR_G1_SIGNOFF suppose des décisions expertes prises (par exemple E-DENSITY pour le contexte de NOVICE) ; il n’est pas forcé.

### CORE_EXT_R1_DESIGN_READINESS = **READY_FOR_APPROVAL**

C’est le maximum que Claude peut attribuer : l’approbation est humaine. La RFC (§3 option B et §8) couvre :

| Exigence | Couverte |
|---|---|
| Profondeur fixe | ✓ |
| Blocs successifs multiples | ✓ |
| Séries × répétitions | ✓ |
| Récupération (y compris entre séries) | ✓ |
| Plage d’allure | ✓ |
| Plage RPE | ✓ |
| Plage FC | ✓ |
| Domaine | ✓ |
| Sans montre (l’effort suffit) | ✓ |
| Calcul de durée (estimations dérivées) | ✓ |
| Cases à cocher, minuteur, reprise | ✓ |
| Historique, retours, analytique | ✓ |

Aucune contradiction découverte ; RFC inchangée.

## 5. Synthèse (points 9 à 39 du rapport demandé)

### 5.1 Décisions
- **Décisions expertes** : 16 avant consolidation → **14** après (E-PROG, E-QUALITY, E-LONG, E-RPE, E-PACE, E-RECOVERY, E-DENSITY, E-RECENCY, E-LOAD, E-TAPER, E-FIRST, E-MODEL, E-VARIABILITY, E-RECENTLOAD).
- **G1** : 4 politiques (PAIN, RETURN, NOVICE, SCOPE) ; 7 paramètres ; **0 signature**.

### 5.2 Chaînes de blocage
- **R1** : G1-NOVICE (A / B / C / D) → V33 (DECISION_REQUIRED) → signature → éligible ; D = hors V1.
- **R8** : G1-RETURN → V24 + UNKNOWN + V34 (DECISION_REQUIRED) → signature ; sinon NO_VALID jusqu’aux séances post-retour.
- **V23** : E-PROG → A (restauration) ou B / C (valeurs par variable, DECISION_REQUIRED) → nouvelle hausse.

### 5.3 Matrice d’impact
- Débloquent un scénario : G1-NOVICE (R1), G1-RETURN / V34 (R8).
- Débloquent un composant : E-MODEL (R4), E-FIRST (R9, R12).
- Bloquent tout si non décidées : E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD, et les 4 G1 en production.

### 5.4 Classification
- **Bloquants d’implémentation** : G1-PAIN, G1-SCOPE, G1-RETURN (frontières + UNKNOWN), G1-NOVICE (règle de périmètre), E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD.
- **Bloquants de fonction** : V33, V34, E-LOAD, E-PROG, E-LONG, E-TAPER (hors marathon), E-FIRST, E-MODEL.
- **Bloquants de qualité** : E-PACE, E-RECOVERY, E-QUALITY, E-VARIABILITY.
- **Après V1** : E-TAPER marathon (si le marathon est hors V1), PROGRESSION_RUN.

### 5.5 Périmètre et dégradation
- **Périmètre minimal** : P-R1 course générale (partiel), P-R2 et P-R3 5K / 10K (dégradé, avec historique de qualité), P-R3 semi (partiel), P-HYBRID (conditionnel, technique). Hors périmètre : marathon, P-R0, premier départ après une longue coupure.
- **Dégradations sûres** :
  - progression : restauration ou HOLD ;
  - allure non décidée : RPE seul ;
  - pas de modèle d’extrapolation : calibration ;
  - pas de première exposition : EASY, STRIDES et TEST ;
  - taper : dernière semaine, sélection laissée à l’utilisateur ou au planificateur ;
  - conflit : MAJOR par défaut ;
  - long run : HOLD ou restauration.

### 5.6 Simulations
- **CONSERVATIVE** : R2–R7 et R9–R12 disponibles, dégradés ; R1 indisponible ; R8 NO_VALID au premier départ ; marathon hors périmètre minimal.
- **PROGRESSIVE** : R1–R12 disponibles, sous réserve des valeurs humaines ; l’allure marathon reste par calibration.
- Aucun des deux profils n’est enregistré.

### 5.7 Ce qui reste ouvert
- **Questions scientifiques** : dose de progression ; premières expositions ; bornes du long run ; taper hors marathon ; dose de reprise ; correspondance RPE ↔ domaines ; exposant de Riegel (provenance) ; variabilité chez les loisirs modernes.
- **Décisions expertes** : les 14 (toutes PENDING).
- **Décisions G1** : les 4 (toutes UNSIGNED).

### 5.8 Contrôles de discipline
- Nouvelles valeurs numériques introduites : **0**.
- Approbations ou signatures automatiques : **0**.
- **NEW_ARCHITECTURAL_CONCEPTS_INTRODUCED = 0** : RunningPerformanceVariabilityEstimate remplace l’hypothèse invalide de V42, à la demande de la mission, sans nouveau mécanisme.

STOP : aucune implémentation n’est commencée.
