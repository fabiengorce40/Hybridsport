# Moteur Course : de EASY seul à un moteur complet

Baseline : `b3ea988`. Ordre de développement verrouillé :
1. Course ;
2. Cross-training ;
3. HYROX ;
4. planificateur global ;
5. intégration et hardening.

Ce plan ne couvre que la Course. Le planificateur global n'est pas commencé.

## 1. Ce qui manque au RunningEngine

| Manque | Nature | Bloqué par une décision ? |
|---|---|---|
| Archétypes de qualité (THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS) : génération, pipeline, structure CORE (échauffement, répétitions, récupération, retour au calme) | Code | **Non**, en HOLD (rejeu de la dernière structure réalisée, V19) |
| Contrat de données : **structure réalisée** d'une séance (échauffement, répétitions, travail, récupération, retour au calme) | Code (contrat) | Non |
| Gardes RULESET-V0 §G.3 : P-R2+ pour la qualité, CONTINUOUS P-R3+ (ou confiance ≥ MEDIUM), objectif pour SHORT, côte déclarée pour HILLS, RETURN non levé (V25), densité V10, séparation V11 | Code (règles documentées, paramètres candidats) | Non |
| Cibles d'allure : seuil (V04/V05), sévère (V18 ± V03) | Code | Non (paramètres candidats) ; EASY : **oui** (V40) |
| Composition hebdomadaire mono-sport (§R) : nombre de séances, séances HIGH_DEMAND permises, séance KEY selon objectif et phase, complément EASY | Code | Partiel (voir D6) |
| Séances manquées / partielles (§W), HOLD (§T), feedback | Code | Partiel (voir D5) |
| **Progression de charge** (toute hausse au-delà du réalisé) | — | **OUI : V23 (E-PROG)** |
| **Première séance** de seuil, sévère ou côtes sans historique | — | **OUI : V35–V37 (E-FIRST)** |
| **LONG** | — | **OUI : conflit V19 (dernière dose ou médiane) + V32 (E-LONG)** |
| Allure objectif / extrapolation (RACE_PACE sans référence à la distance) | — | **OUI : V38 exposant, largeur (E-MODEL)** |
| Débutant P-R0 (V33), dose de reprise longue (V34) | — | **OUI (G1_DOSE)** |
| STRIDES : choix dans la plage 4–6 × 15–20 s, critère « régularité établie » | — | **OUI (V20, régularité)** |
| TEST : protocole (§Q) | — | **OUI (aucun paramètre au registre)** |
| Taper par épreuve (V28), allure EASY (V40), répétition sévère par défaut (V41), dose minimale qualité (V31) | — | OUI, non bloquant pour les vagues R3–R5 |

## 2. Vagues

| Vague | Contenu | Décision requise |
|---|---|---|
| **R3** | Contrat de structure réalisée ; THRESHOLD (INTERVALS / CONTINUOUS), SEVERE, SHORT_INTERVAL, HILLS en **HOLD** sur l'historique ; gardes §G.3, densité V10, séparation V11, RETURN non levé ; famille rejouée = la plus récemment réalisée ; RPE V02 par domaine ; échauffement et retour au calme rejoués | Aucune |
| **R4** | Cibles d'allure gouvernées : borne « pas plus vite que l'allure 10K » (V05) pour le seuil ; ancre 3–5 km ± V03 pour le sévère (V18) ; jamais pour HILLS ni EASY | Aucune |
| **R5** | Composition hebdomadaire Course (§R) selon objectif, niveau, fréquence et historique ; §W (manquée : DROP / MOVE) ; HOLD §T tracé ; intégration app-core (saisie de la structure réalisée, planning Course multi-archétypes) | D5, D6 pour certains cas |
| **R6** | Progression, premières expositions, LONG, RACE_PACE, STRIDES, TEST, selon les décisions | D1–D4, D7, D8 |
| **Gate Course** | Mutation Running : lots 2 et 3 différés, et nouveaux modules ; adversarial ; déterminisme ; CORE et Strength inchangés | — |

## 3. Décisions à arbitrer (groupées)

Options reprises du dossier `RUNNING-5E-EXPERT-DECISION-PACK.md`. Rien n'est décidé par défaut.

- **D1 — Progression (V23, E-PROG)**. Options :
  - A : restauration seulement ;
  - B : plages expertes par variable ;
  - C : pas minimal significatif (une répétition, une unité de temps) après tolérance et adhérence ;
  - KEEP BLOCKED.

  Sans B ou C, **aucun programme ne progresse** au-delà du réalisé.
- **D2 — Premières expositions (V35–V37, E-FIRST)**. Options :
  - A : dose d'initiation par type et par niveau ;
  - B : uniquement après un TEST ;
  - KEEP BLOCKED (qualité seulement si l'utilisateur en a déjà fait).
- **D3 — LONG**. Deux questions :
  - source de vérité V19 : dernière dose réalisée, ou médiane des plus longues sorties sur 4 semaines (§J) ;
  - E-LONG : mécanisme accepté, avec ou sans maximum produit.
- **D4 — Allure objectif (V38, E-MODEL)**. Options :
  - A : Riegel jusqu'au semi, avec exposant vérifié et largeur de prédiction ;
  - B : aucune extrapolation, calibration demandée.
- **D5 — Séance interrompue** : V19 refuse aujourd'hui toute ancre après une séance plus récente négative, alors que §W prévoit « REDUCE, séance considérée faite avec la dose réalisée ». Options :
  - ancrer sur la dose partielle réalisée ;
  - revenir à la dernière dose réussie ;
  - refuser (état actuel).
- **D6 — Bandes RPE** : le registre V02 diverge du texte de RULESET-V0 :
  - seuil : 5–7 au registre, 5–6 aux §K et §G.3 ;
  - sévère et côtes : 7–9 au registre, 7–8 aux §L et §N.

  Le code suit le registre (précédent V19), sauf décision contraire.
- **D7 — P-R0 (V33) et reprise longue (V34)** : doses G1, qui exigent une signature G1.
- **D8 — STRIDES (V20, régularité) et TEST (protocole §Q)**.

## 4. Livré

### R3 (moteur `0.3.0`, vague `3`)

- **Contrat** : `zRealizedStructure` (échauffement, répétitions × travail, récupération et mode, retour au calme ; en temps uniquement) ; champ `terrain.hills` déclaré.
- **Archétypes** : THRESHOLD (CONTINUOUS / INTERVALS), SEVERE, SHORT_INTERVAL, HILLS, en **rejeu exact** de la dernière structure réalisée (V19).
- **Gardes** (`wave3/guards.ts`) :
  - §G.3 : P-R2 et plus ;
  - §K : continu réservé à P-R3+ ou à une confiance ≥ MEDIUM ;
  - §M : objectif ;
  - §N : côte déclarée ;
  - §X : reprise LONG ou UNKNOWN ⇒ refus ; MODERATE ⇒ sévère seulement après levée (V25) ;
  - V10 : densité ;
  - V11 : pas de veille à forte demande.
- **Sélection** : la famille réalisée le plus récemment ; en cas d'égalité, `FAMILY_AMBIGUOUS`.
- **Cibles** : bande RPE V02 du domaine de travail ; échauffement, retour au calme et récupération sous le plafond EASY_LOW ; aucune allure. Défaut conservateur V31 tracé (`HIGH_DEMAND_DEFAULT_CONSERVATIVE`).
- **Empreinte CORE** : répartition E5 par parts de temps (THRESHOLD_LIKE ⇒ moderate, SEVERE ⇒ high), format `intervals`.
- **Refus** :
  - première exposition (V35–V37) ;
  - structure non enregistrée (`STRUCTURE_UNAVAILABLE`) ;
  - famille incohérente ;
  - séance plus récente négative (V19) ;
  - temps dépassé ;
  - PRODUCTION.
- **EASY inchangé.**

## 5. Décisions produit du 2026-09-28

Ces décisions du propriétaire du produit sont importées au registre comme valeurs **candidates** (maturité `EXPERT_PROPOSED`, provenance « décision produit »). Elles ne sont utilisées qu'en simulation ; la production exige toujours les signatures expertes et G1.

| Id | Décision | Paramètre |
|---|---|---|
| D1 | **Pas minimal (E-PROG C)** : +1 min pour les variables de durée (EASY, LONG, travail continu) ; +1 répétition pour le fractionné ; après **2 séances consécutives tolérées** du même type (terminées, sans retour négatif) ; une seule variable à la fois (§T) | V23 `running.progression.magnitude` |
| D2 | **Première exposition après un TEST (E-FIRST B)**. Le test (§Q) : contre-la-montre de **5 km**, ou **10 km** pour un objectif 10K. Il fournit la référence d'allure. La première structure de travail est une **structure minimale fixée** par type et par niveau : **valeurs attendues du propriétaire du produit** ; tant qu'elles manquent, la première exposition reste bloquée | V35–V37, protocole TEST |
| D3 | **LONG = dernière sortie longue réalisée (V19), sans maximum produit (E-LONG A)** ; progression par D1 | V19 (LONG), V32 |
| D5 | **Séance interrompue** : repli sur la **dernière dose réussie** avant l'interruption (jamais supérieure), tracé | V19 (règle après retour négatif) |
| D6 | Non tranché : le code suit le registre V02 | — |

**Valeurs attendues (D2)** : pour THRESHOLD, SEVERE, SHORT_INTERVAL et HILLS, et pour chaque niveau P-R2, P-R3 et P-R4, fournir :
- le nombre de répétitions × la durée de travail ;
- la récupération (durée et mode) ;
- l'échauffement et le retour au calme.
