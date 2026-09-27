# RUNNING-5F-SCOPE-OPTIONS — trois périmètres candidats pour Running V1

> **Phase 5F.** Trois périmètres cohérents, **non classés et non recommandés**. Aucune décision humaine n’est prise. Matrice des séances : [`RUNNING-5F-FEATURE-MATRIX.md`](RUNNING-5F-FEATURE-MATRIX.md).
>
> **Légende** :
> - S = SUPPORTED ;
> - SD = SUPPORTED_DEGRADED ;
> - B = BLOCKED ;
> - OOS = OUT_OF_SCOPE.

## 1. Définition des périmètres

| | SCOPE A — MINIMAL | SCOPE B — STANDARD | SCOPE C — EXTENDED |
|---|---|---|---|
| Idée | Seulement ce que permet le plus petit ensemble de décisions | V1 grand public utile, avec dégradations raisonnables | Ajoute des populations et fonctions qui exigent des décisions supplémentaires |
| Décisions de sécurité produit obligatoires | G1-PAIN, G1-SCOPE, G1-RETURN (politique), G1-NOVICE (politique : P-R0 exclu) | idem | idem + G1-NOVICE (dose V33, P-R0 accepté) + G1-RETURN (dose V34) |
| Décisions expertes obligatoires | E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD | A + E-PACE, E-PROG, E-LOAD, E-FIRST, E-MODEL, E-TAPER (hors marathon), E-VARIABILITY | B + E-LONG, E-TAPER (marathon), E-RECOVERY, E-QUALITY |
| Décisions facultatives | Toutes les autres (dégradées) | E-RECOVERY, E-QUALITY, E-LONG | — |
| Après V1 | Marathon, P-R0, premier départ après LONG, extrapolation, taper, premières expositions | Marathon, P-R0, premier départ après LONG | PROGRESSION_RUN, allure marathon (le modèle exclut le marathon) |
| Nombre de décisions obligatoires | 4 sécurité + 4 expertes = **8** | 4 + 11 = **15** | 6 + 14 = **20** (dont 2 doses G1 ; E-TAPER couvre aussi le marathon) |

## 2. Populations × objectifs

### SCOPE A — MINIMAL

| Population | GENERAL | 5K | 10K | HALF | MARATHON |
|---|---|---|---|---|---|
| P-R0 | OOS | OOS | OOS | OOS | OOS |
| P-R1 | SD | SD (EASY, TEST, STRIDES) | SD | OOS | OOS |
| P-R2 | SD | SD | SD | SD (allure semi par calibration) | OOS |
| P-R3 | SD | SD | SD | SD | OOS |
| P-R4 | SD | SD | SD | SD | OOS |
| P-HYBRID | SD (dépendance technique au planificateur) | SD | SD | SD | OOS |

**Bloqué / hors périmètre** :
- P-R0 : politique signée « P-R0 exclu », V33 non décidé ;
- marathon : long run, taper et allure non décidés ;
- semi pour P-R1 : décision de périmètre (confiance et fréquence généralement faibles, taper non décidé) ;
- P-R1 sans E-LOAD : pas de hausse au-delà du toléré.

### SCOPE B — STANDARD

| Population | GENERAL | 5K | 10K | HALF | MARATHON |
|---|---|---|---|---|---|
| P-R0 | OOS | OOS | OOS | OOS | OOS |
| P-R1 | S | S | S | OOS | OOS |
| P-R2 | S | S | S | SD (taper limité hors décision marathon ; long run selon E-PROG) | OOS |
| P-R3 | S | S | S | S | OOS |
| P-R4 | S | S | S | S | OOS |
| P-HYBRID | SD (technique) | SD | SD | SD | OOS |

### SCOPE C — EXTENDED

| Population | GENERAL | 5K | 10K | HALF | MARATHON |
|---|---|---|---|---|---|
| P-R0 | S si V33 est signée ; sinon OOS | OOS (premier objectif de course après la phase d’entrée) | OOS | OOS | OOS |
| P-R1 | S | S | S | SD | OOS |
| P-R2 | S | S | S | S | SD (allure marathon par calibration) |
| P-R3 | S | S | S | S | SD |
| P-R4 | S | S | S | S | SD |
| P-HYBRID | SD (technique) | SD | SD | SD | SD |

Reprise longue : A et B = NO_VALID au premier départ, puis ≤ réalisé ; C = S si V34 est signée.

## 3. Conséquences factuelles (section F, sans classement)

| Conséquence | A | B | C |
|---|---|---|---|
| Semaines en HOLD ou en restauration | **Toutes** les hausses au-delà du toléré sont impossibles | Dépend de l’option E-PROG : A = même situation qu’en SCOPE A ; B ou C = progression possible | Idem B |
| Prescriptions en RPE seul | **Toutes** (E-PACE non décidé) | Seulement sans référence fiable | Idem B |
| Progression au-delà du maximum historique | Absente | Selon E-PROG | Selon E-PROG |
| Premières expositions (seuil, sévère, côtes) | Absentes : athlètes sans historique limités à EASY, TEST et STRIDES | Présentes (E-FIRST) | Présentes |
| Progression du long run | Restauration seulement | Selon E-PROG | Mécanisme E-LONG + E-PROG |
| Programmation seuil / VO2 | Depuis l’historique seulement | Complète (≤ semi) | Complète |
| Allure spécifique semi sans semi récent | Calibration requise | Riegel ≤ semi (si E-MODEL A) | Idem B |
| Taper | Dernière semaine, sélection laissée à l’utilisateur | Règle experte (hors marathon) | Avec marathon |
| Novice et premier départ après LONG | Non | Non | Oui (si les doses sont signées) |
| Surface de paramètres EXPERT_PROPOSED en production | Faible | Moyenne | Élevée |
