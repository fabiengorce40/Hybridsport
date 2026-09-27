# RUNNING-V1-SCOPE-C-FREEZE — gel du périmètre cible Running V1

> **Phase 5G.** Enregistrement de la décision du fondateur.

## 1. Décision du fondateur (périmètre produit)

| Élément | Statut |
|---|---|
| **RUNNING_V1_SCOPE** | **C_EXTENDED** |
| SCOPE_A | REJECTED_AS_V1_TARGET |
| SCOPE_B | REJECTED_AS_V1_TARGET |
| SCOPE_C | **SELECTED_V1_TARGET** |

**Nature de la décision** : c’est une décision de **périmètre produit**. Ce n’est :
- **pas** une approbation scientifique ;
- **pas** une approbation experte ;
- **pas** une approbation de sécurité ;
- **pas** une signature G1.

## 2. Conséquences

- Les capacités du périmètre C qui dépendent de décisions non résolues **existent comme capacités explicitement verrouillées** ([`RUNNING-V1-CAPABILITY-FLAGS.md`](RUNNING-V1-CAPABILITY-FLAGS.md)). Elles ne sont ni retirées du périmètre, ni activées par un repli caché.
  - P-R0 reste désactivé tant que G1-NOVICE et V33 ne sont pas décidés.
  - La première prescription après une longue coupure reste désactivée tant que G1-RETURN et V34 ne sont pas décidés.
- Quatre états distincts sont suivis pour chaque capacité : **TARGET_SCOPE**, **IMPLEMENTED**, **VALIDATED**, **PRODUCTION_ENABLED**. Une capacité désactivée **reste dans le périmètre cible**.
- Une bêta technique peut exister avec certaines capacités C désactivées.

## 3. Documents du gel

| Document | Contenu |
|---|---|
| [`RUNNING-V1-CAPABILITY-MATRIX.md`](RUNNING-V1-CAPABILITY-MATRIX.md) | Populations × objectifs ; fonctions |
| [`RUNNING-V1-DECISION-DEPENDENCIES.md`](RUNNING-V1-DECISION-DEPENDENCIES.md) | 14 décisions expertes + 4 G1 + V33 / V34 ; besoins d’implémentation ; graphe |
| [`RUNNING-V1-CAPABILITY-FLAGS.md`](RUNNING-V1-CAPABILITY-FLAGS.md) | Drapeaux de capacité |
| [`RUNNING-V1-PRODUCTION-ELIGIBILITY.md`](RUNNING-V1-PRODUCTION-ELIGIBILITY.md) | États de maturité ; éligibilité à la production |
| [`CORE-EXT-R1-APPROVAL-PACK.md`](CORE-EXT-R1-APPROVAL-PACK.md) | Dossier d’approbation de la RFC |
| [`RUNNING-V1-IMPLEMENTATION-WAVES.md`](RUNNING-V1-IMPLEMENTATION-WAVES.md) | Vagues d’implémentation |
| [`RUNNING-V1-TEST-STRATEGY.md`](RUNNING-V1-TEST-STRATEGY.md) | Tests par vague |
| [`RUNNING-V1-ACCEPTANCE-CRITERIA.md`](RUNNING-V1-ACCEPTANCE-CRITERIA.md) | Définition de « V1 périmètre C terminé » |
