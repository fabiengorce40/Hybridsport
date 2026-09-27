# RUNNING-5E-GOLDEN-IMPACT-MATRIX — impact des décisions humaines sur R1–R12

> **Phase 5E.**
>
> **Valeurs de cellule** :
> - NO = NO_EFFECT ;
> - TGT = CHANGES_TARGET ;
> - DOSE = CHANGES_DOSE ;
> - ELIG = CHANGES_ELIGIBILITY ;
> - UNB = UNBLOCKS ;
> - BLK = BLOCKS.
>
> **Lecture** :
> - Tableau 1 : effet si la décision est **prise** (option autre que KEEP BLOCKED), en mode CANDIDATE.
> - Colonne « KEEP BLOCKED » : effet si la décision reste bloquée.
> - Tableau 2 : effet en **PRODUCTION**.

## 1. Mode CANDIDATE (goldens)

| Décision | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | Si KEEP BLOCKED |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-PROG | NO | DOSE | DOSE | DOSE | DOSE | DOSE | DOSE | NO | DOSE | NO | NO | DOSE | NO (HOLD ou restauration, état actuel) |
| E-QUALITY | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | ELIG (séance de 10 min du taper) | NO | NO (défaut conservateur) |
| E-LONG | NO | ELIG (désignation LONG_RUN) | NO | DOSE | NO | DOSE | NO | NO | NO | NO | NO | NO | NO (HOLD ou restauration) |
| E-RPE | TGT | TGT | TGT | TGT | TGT | TGT | TGT | TGT | TGT | TGT | TGT | TGT | **BLK** (aucune cible RPE) |
| E-PACE | NO | NO | TGT | TGT | TGT | NO | TGT | NO | TGT | TGT | TGT | NO | TGT (RPE seul partout) |
| E-RECOVERY | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | DOSE | NO | DOSE (R11 : récupération depuis l’historique) |
| E-DENSITY | NO | ELIG | ELIG | ELIG | ELIG | ELIG | ELIG | NO | ELIG | ELIG | ELIG | ELIG | **BLK** |
| E-RECENCY | NO | TGT | TGT | TGT | TGT | TGT | TGT | NO | TGT | TGT | TGT | TGT | **BLK** |
| E-LOAD | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | **BLK** R2 (P-R1) |
| E-TAPER | NO | NO | NO | NO | NO | NO (futur) | NO | NO | NO | NO | DOSE (sélection 96,0–141,6) | NO | DOSE (sélection laissée à l’utilisateur ou au planificateur) |
| E-FIRST | NO | NO | NO | NO | NO | NO | NO | NO | UNB (VO2) | NO | NO | UNB (seuil) | NO |
| E-MODEL | NO | NO | NO | UNB (allure semi) | NO | NO (marathon exclu) | NO | NO | NO | NO | NO | NO | NO (calibration) |
| E-VARIABILITY | NO | TGT (mise à jour de la référence déclarée) | NO | NO | NO | NO | NO | NO | NO (MAJOR dans tous les cas) | NO | NO | TGT | NO (prudent) |
| E-RECENTLOAD | NO | DOSE | DOSE | DOSE | DOSE | DOSE | DOSE | NO | DOSE | DOSE | DOSE | DOSE | **BLK** |
| G1-PAIN | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO (candidate) |
| G1-RETURN | NO | NO | NO | NO | NO | NO | NO | **UNB** (si V34 signée) | NO | NO | NO | NO | R8 reste BLK |
| G1-NOVICE | **UNB** (si structure et dose signées) | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | R1 reste BLK |
| G1-SCOPE | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO | NO (candidate) |

## 2. Mode PRODUCTION

| Décision | Effet si non signée ou non décidée |
|---|---|
| G1-PAIN, G1-SCOPE | **BLK R1–R12** : s’appliquent à tous |
| G1-RETURN (frontières + UNKNOWN) | **BLK R1–R12** : toute interruption doit être traitée |
| G1-NOVICE (règle de périmètre P-R0) | **BLK R1–R12** : la détection P-R0 et le refus du test maximal doivent être signés, même si P-R0 est hors V1 |
| E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD | **BLK R2–R12** |
| Autres décisions | Dégradation (voir `RUNNING-5E-FEATURE-DEGRADATION.md`) |

## 3. Synthèse

| Effet | Décisions |
|---|---|
| **Débloquent un scénario** | G1-NOVICE (R1), G1-RETURN / V34 (R8) |
| **Débloquent un composant** | E-MODEL (R4), E-FIRST (R9, R12) |
| **Bloquent tout** si non décidées | E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD, et les 4 G1 en production |
| **Seulement la dose ou la cible** | Toutes les autres |
