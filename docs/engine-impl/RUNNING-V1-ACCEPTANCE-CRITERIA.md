# RUNNING-V1-ACCEPTANCE-CRITERIA — définition de « Running V1 périmètre C terminé »

> **Phase 5G.** « Terminé » **ne signifie pas** « tout le code existe ». On suit séparément, par capacité : **TARGET_SCOPE**, **IMPLEMENTED**, **VALIDATED**, **PRODUCTION_ENABLED**.

## 1. Critères

| # | Critère | Preuve attendue |
|---|---|---|
| 1 | CORE-EXT-R1 approuvée, implémentée et durcie | Approbation du fondateur tracée ; tests T-CORE + Q1–Q3 ; mutation ; empreinte F20 motivée |
| 2 | Gate technique RunningEngine | Contrat SportEngine respecté ; typecheck, lint et architecture verts ; aucune modification de Strength |
| 3 | Goldens R1–R12 | Entrées inchangées ; sorties conformes aux décisions enregistrées |
| 4 | Invariants I1–I20 | Tests de propriétés verts |
| 5 | Adversariaux A01–A20 et comparaisons C1–C8 | Verts |
| 6 | Provenance des paramètres | 100 % des paramètres actifs avec statut, provenance et maturité requise |
| 7 | Décisions expertes | Les décisions requises par chaque capacité **activée** sont approuvées |
| 8 | Décisions G1 | Les 4 politiques signées (socle) ; V33 et V34 signées **si** leurs capacités sont activées |
| 9 | Éligibilité à la production | `RunningProductionEligibility` prouve l’éligibilité de chaque capacité activée |
| 10 | Verrouillage des capacités | Chaque capacité non éligible est désactivée avec son comportement dégradé ou NO_VALID testé |
| 11 | Intégration au planificateur | P-HYBRID : intégration testée, ou capacité désactivée |
| 12 | Aucun repli non soutenu | Test : aucune valeur par défaut silencieuse (I19) |
| 13 | Dette scientifique documentée | Registre à jour (avant production / bêta / après V1) |

## 2. Niveaux

| Niveau | Condition |
|---|---|
| **Scope C IMPLEMENTED** | Critères 1–6 et 10–12 ; toutes les capacités C codées (actives ou verrouillées) |
| **Scope C VALIDATED** | IMPLEMENTED + critères 3–5 sur toutes les capacités, y compris verrouillées (tests de désactivation) |
| **Scope C PRODUCTION_ENABLED (partiel)** | Socle éligible (critères 7–9 pour le socle) ; capacités activées = capacités éligibles |
| **Scope C COMPLETE** | Toutes les capacités C éligibles et activées, **ou** désactivations explicitement acceptées par le fondateur comme différées, avec leur motif |

**Une capacité désactivée n’est pas retirée du périmètre C.**
