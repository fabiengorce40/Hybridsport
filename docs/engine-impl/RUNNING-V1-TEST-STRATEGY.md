# RUNNING-V1-TEST-STRATEGY — tests futurs par vague (non implémentés)

> **Phase 5G.**
> - **Entrées R1–R12 figées** (`RUNNING_GOLDEN_INPUTS_V1_FROZEN = YES`).
> - Base : plan de 88 cas (5B, `RUNNING-5C-FUTURE-TEST-PLAN.md`), invariants I1–I20 (5C), comparaisons C1–C8, scénarios adversariaux A01–A20.

| Famille | Vague | Contenu | Référence |
|---|---|---|---|
| Sérialisation, rejeu, migration | 0 | `run_structure` aller-retour ; v3 → v4 par identité ; lecteur v3 refuse v4 ; estimations stockées = recalculées ; rejeu déterministe | T-CORE-01…10 + Q1 / Q2 / Q3 |
| Dérivation de la durée | 0, 2, 3 | Total = échauffement + travail + récupérations (sans la dernière) + entre séries + retour au calme ; distance sans plage refusée | I17 |
| Unitaires fondations | 1 | Références (récence, conflits V43, mises à jour B2), confiances (minimum des facteurs), éligibilité en deux étapes | T-REF, T-PERF, T-CONF |
| Provenance des paramètres | 1 | Tout paramètre a statut, provenance et maturité ; refus d’un ruleset incomplet | T-VER-02, I18, I19 |
| Éligibilité à la production | 1 | Socle et 11 drapeaux : `eligible` + identifiants bloquants ; refus d’un drapeau non éligible en production | Nouveau (5G) |
| Drapeaux de capacité | 1–5 | Drapeau désactivé ⇒ dégradation ou NO_VALID avec le code exact ; jamais de substitution silencieuse | Nouveau (5G) |
| Propriétés | 1–4 | Déterminisme (I1, I20), une donnée manquante reste inconnue (I2), monotonie de la récence, une seule variable dominante (I11), aucun rattrapage (I13), précédence G1 (I15), invariance démographique | T-DET, T-UNK, T-PROG-01, T-REP-03, T-SAF-03, T-POP-04 |
| Comportement NO_VALID | 2–5 | R1 (V33), R8 (V34), composants bloqués (V35–V37), P-HYBRID sans planificateur | Contrat 5C |
| Goldens | 2–5 | R1–R12 : statuts, codes de raison, archétypes autorisés et interdits ; **les sorties changent avec les décisions, jamais les entrées** | Goldens V1 candidats |
| Comparaisons contrôlées | 3–4 | C1–C8 : une dimension varie, le changement attendu est vérifié | Comparaisons 5C |
| Adversariaux | 3–5 | A01–A20 : dégrader, maintenir, calibrer, réduire ou refuser, jamais inventer | Adversariaux 5C |
| Mutation ciblée | 0, 3, 4 | Sur le modèle 4F / 4G | — |
