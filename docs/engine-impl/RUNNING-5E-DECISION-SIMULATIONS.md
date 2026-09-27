# RUNNING-5E-DECISION-SIMULATIONS — deux profils de décision (simulation seulement)

> **Phase 5E.** **Simulation** : aucun profil n’est enregistré comme ruleset choisi et aucune option n’est retenue. Hypothèse commune : les 4 G1 **seraient signés** et CORE-EXT-R1 **serait implémentée**, sinon rien n’est disponible en production. Les valeurs DECISION_REQUIRED du profil progressif sont supposées décidées par des humains ; **aucune n’est proposée ici**.

## 1. Profils

| Décision | CONSERVATIVE | PROGRESSIVE |
|---|---|---|
| E-RPE | A | A |
| E-DENSITY | A | A |
| E-RECENCY | A | A |
| E-RECENTLOAD | A | A |
| E-PROG | A (restauration seulement) | B ou C (valeurs décidées) |
| E-QUALITY | A (aucun minimum) | B (minimum par stimulus) |
| E-LONG | A | B (mécanisme + maximum produit) |
| E-PACE | KEEP BLOCKED (RPE seul) | A |
| E-RECOVERY | KEEP BLOCKED (historique) | A |
| E-LOAD | A | A |
| E-TAPER | KEEP BLOCKED (dernière semaine, sélection laissée à l’utilisateur) | A |
| E-FIRST | B (après test seulement) | A (doses d’initiation décidées) |
| E-MODEL | B (calibration) | A (exposant vérifié) |
| E-VARIABILITY | B (sans repli) | A |
| G1-NOVICE | D (P-R0 hors V1) | A (dose signée) |
| G1-RETURN (V34) | Premier départ NO_VALID | Dose signée |

## 2. Disponibilité de R1–R12

| Scénario | CONSERVATIVE | PROGRESSIVE |
|---|---|---|
| R1 novice | **Indisponible** (hors V1) | Disponible (si la dose est signée) |
| R2 premier 5K | Disponible, RPE seul, HOLD ou restauration | Disponible, progression possible |
| R3 10K | Disponible, RPE seul (pas de plafond d’allure) | Disponible, cibles d’allure |
| R4 semi | Disponible, allure semi par calibration ; long run restauré | Disponible, allure semi par Riegel ; progression du long run |
| R5 10K avancé | Disponible, RPE seul | Disponible, cibles d’allure complètes |
| R6 marathon | Disponible en HOLD ou restauration ; **marathon hors périmètre minimal** (taper non décidé) | Disponible (taper 2–3 semaines, long run avec maximum produit) ; allure marathon toujours par calibration |
| R7 hybride | Disponible (dépendance au planificateur) | idem |
| R8 reprise LONG | NO_VALID au premier départ, puis ≤ réalisé | Disponible (dose signée) |
| R9 conflit | Disponible ; VO2 via test d’abord | Disponible ; VO2 en première exposition |
| R10 manquée | Disponible | Disponible |
| R11 taper | Dernière semaine, sélection 96,0–141,6 laissée à l’utilisateur ou au planificateur | Sélection selon la règle experte |
| R12 déclarée | Disponible ; seuil via test d’abord | Disponible ; première exposition au seuil |

## 3. Fonctions et bloquants restants

| | CONSERVATIVE | PROGRESSIVE |
|---|---|---|
| Fonctions indisponibles | Progression au-delà du toléré ; cibles d’allure ; taper optimisé ; premières expositions sans test ; P-R0 ; premier départ après LONG ; extrapolation | Allure marathon (Riegel exclu par la preuve) ; PROGRESSION_RUN (non sélectionné) |
| Décisions encore requises | Aucune pour ce profil, en dehors de l’ensemble minimal | Toutes les valeurs DECISION_REQUIRED de B, C et A (liste dans le dossier expert) |
| Risque principal | Programmes qui stagnent | Plus de paramètres EXPERT_PROPOSED en production, donc plus de surface de revue |

**Aucun des deux profils n’est enregistré.**
