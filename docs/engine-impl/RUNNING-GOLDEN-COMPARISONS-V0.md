# RUNNING-GOLDEN-COMPARISONS-V0 — comparaisons contrôlées C1–C8 et invariants I1–I20

> **Phase 5C, théorique.** Chaque comparaison fait varier **une seule dimension principale**. La référence de base est l’athlète R3 (sauf mention) : P-R3, 10K, 3 séances, historique THRESHOLD 3 × 8 / 2, bande 150–170, montre GPS. Règles et tags : [`RUNNING-RULESET-V0.md`](RUNNING-RULESET-V0.md), [`RUNNING-PARAMETERS-V0.md`](RUNNING-PARAMETERS-V0.md).

## 1. Comparaisons

### C1 — Confiance de référence LOW contre HIGH
**Variable** : 10 km en 50:00 couru il y a 3 semaines (HIGH) **contre** « 10 km en 50 min » simplement déclaré (LOW).

| Élément | HIGH | LOW |
|---|---|---|
| Éligibilité THRESHOLD | Éligible | **Éligible** (inchangée : historique, niveau, charge) |
| Cible THRESHOLD | BROAD : RPE 5–6 + plafond 300 s/km (V05) | RPE 5–6 seul |
| RACE_PACE 10K | FULL, 291–309 s/km (V03) | RPE seul (allure objectif non validée) |
| Calibration | Non | `REF.CALIBRATION_REQUIRED` (test proposé dans une semaine où la densité le permet) |
| Durées | 43 / 45 / 65 | **identiques** |

**Explication** : la confiance réduit la **précision** de la cible, pas l’éligibilité (B3, I3).

### C2 — 3 contre 4 séances par semaine (intention du planificateur)
**Variable** : fréquence demandée.

| Élément | 3 séances | 4 séances |
|---|---|---|
| Séances | EASY 45 · THRESHOLD 43 · LONG 65 | EASY 27 · THRESHOLD 43 · EASY 27 · LONG 65 |
| `weeklyDuration` | 153 | **162** (maintenue à la médiane de la bande : 162,5 − 108 = 54,5 ⇒ 2 × 27) |
| Séances HD | 2 | 2 (V10 inchangé) |
| Variable dominante | HOLD | La fréquence est une **entrée** du planificateur ; la durée hebdomadaire est redistribuée (§Y), aucune autre dimension n’augmente |
| TID | Décrite par séance | Part de faible intensité plus grande (conséquence, pas une cible) |

**Explication** : ajouter une séance redistribue la durée ; la charge totale ne monte pas en même temps (I11).

### C3 — Frais contre forte charge concurrente
**Variable** : le planificateur signale une séance de jambes lourde (mercredi) et une HYROX (samedi).

| Élément | Frais | Charge concurrente élevée |
|---|---|---|
| Archétypes | EASY, THRESHOLD, LONG | Identiques dans la proposition |
| Progression | HOLD (V23) | HOLD (`PROG.HOLD_CONCURRENT_LOAD`) |
| Structure THRESHOLD | INTERVALS | INTERVALS maintenu (demande de récupération MODERATE, contre HIGH pour CONTINUOUS, §Z) |
| Contraintes transmises | FLEXIBLE / KEY | PREFER_BEFORE_HEAVY_LOWER (THRESHOLD) ; NOT_AFTER_HIGH_LOCOMOTOR (LONG) |
| Alternative si le planificateur ne peut pas placer | — | THRESHOLD ⇒ EASY (non HD) ; LONG ⇒ EASY dans la bande |
| HILLS | Non sélectionné | NOT_ELIGIBLE (avis IM) |

**Explication** : RunningEngine déclare ses demandes et ses alternatives ; le GlobalPlanner décide (I16).

### C4 — Objectif 10K contre semi-marathon
**Variable** : objectif.

| Élément | 10K | Semi |
|---|---|---|
| KEY | THRESHOLD | THRESHOLD (ou LONG_RUN) |
| Variable dominante candidate | `intervalVolume` | `longRunDuration` |
| RACE_PACE | 10K FULL (291–309) | Semi : allure bloquée par V38 ⇒ RPE |
| LONG_RUN | Non centrale | Centrale (candidate prioritaire) |
| Semaine | 45 / 43 / 65 | 45 / 43 / 65 (HOLD ; seules les **priorités** changent) |

**Explication** : l’objectif change les priorités et la variable candidate. Sans magnitude définie, la semaine elle-même ne change pas (V23).

### C5 — Semaine normale contre taper (athlète R11)
**Variable** : proximité de l’épreuve.

| Élément | Semaine normale | Dernière semaine avant l’épreuve |
|---|---|---|
| Séances | EASY 45 · THRESHOLD 2 × 12 (42) · EASY 45 · LONG 105 | EASY 35 · THRESHOLD 2 × 5 (27) · EASY + STRIDES 34 · course |
| Volume | 237 (bande 230–250) | 96 (plage 96–142, V27) |
| Intensité | THRESHOLD_LIKE 24 min | Maintenue, travail 10 min |
| Fréquence | 4 | 3 + la course = 4 (maintenue) |
| Progression | HOLD | DOWN (volume) ; `PROG.HOLD_EVENT_PROXIMITY` |

**Explication** : le volume baisse dans la plage de preuve ; l’intensité et la fréquence sont maintenues ; aucune constante 0,50 (I5, I6).

### C6 — Reprise connue (LONG) contre reprise UNKNOWN
**Variable** : information sur l’interruption. Athlète R8 avec **2 séances easy de 30 min réalisées depuis le retour**, sans douleur.

| Élément | LONG connu (35 jours) | UNKNOWN |
|---|---|---|
| État | LONG | **UNKNOWN** (jamais converti) |
| Références | STALE ⇒ LOW | STALE ⇒ LOW |
| Archétypes | EASY (+ STRIDES après V25) | EASY seulement |
| Dose | ≤ réalisé (30 min) | ≤ réalisé (30 min) |
| Fréquence | ≤ réalisée | ≤ réalisée, jamais au-dessus d’avant l’interruption |
| Progression | V25 satisfait (2 séances) ⇒ la progression peut reprendre **sous le protocole LONG (G1)**, en pratique HOLD tant que V23 est vide | **HOLD** tant que l’état n’est pas résolu, **même si V25 est satisfait** |
| Information | — | Demande : durée, raison, douleur actuelle |
| Périmètre | — | Si la raison déclarée est médicale ⇒ PAIN_STOP ou OUT_OF_SCOPE |

**Explication** : UNKNOWN ne reprend pas les règles d’un autre état ; il ajoute la demande d’information et interdit de sortir du HOLD sans résolution (I14).

### C7 — Même performance, récente contre ancienne
**Variable** : ancienneté du 10 km en 50:00 (3 semaines contre 14 mois).

| Élément | Récente (RECENT) | Ancienne (STALE) |
|---|---|---|
| Confiance 10K | HIGH | LOW |
| THRESHOLD | BROAD (plafond 300, V05 : exige un 10K RECENT) | RPE seul |
| RACE_PACE | FULL | RPE seul |
| Calibration | Non | Oui |
| Éligibilité | Identique | Identique |

### C8 — Avec montre contre NO_WEARABLE
**Variable** : capteurs disponibles.

| Élément | Montre GPS | NO_WEARABLE |
|---|---|---|
| THRESHOLD | RPE 5–6 + plafond d’allure affiché | RPE 5–6 ; répétitions à la **durée** ; allure affichée comme information seulement |
| RACE_PACE | FULL (allure prioritaire) | RPE « effort de course » prioritaire ; l’allure de référence est indiquée à titre d’information |
| Retours | Automatiques ou manuels | Manuels : durée, RPE, complétion |
| `weeklyDistance` | Mesurée | **UNKNOWN** si non déclarée ; la LCA utilise la durée |
| FC | Non utilisée (pas de référence individuelle) | Non utilisée |
| Éligibilité | Identique | Identique |

**Explication** : le moteur reste programmable sans montre (I4) ; la FC n’est jamais requise.

## 2. Invariants I1–I20 (vérifiés sur le papier contre R1–R12 et C1–C8)

| # | Invariant | Définition opérationnelle | Vérification 5C |
|---|---|---|---|
| I1 | Déterminisme | Même entrée, même ruleset et même graine ⇒ même sortie et même trace | Toutes les décisions sont ordinales et lexicographiques, sans hasard ; aucune règle dépendant de l’ordre (tri stable défini) ✓ |
| I2 | Une donnée manquante reste inconnue | Aucune imputation (ni 0, ni moyenne) | `weeklyDistance` UNKNOWN (R1, C8) ; `concurrentLocomotorLoad` ESTIMATED, jamais 0 (R7) ✓ |
| I3 | Une confiance faible réduit la précision avant l’éligibilité | Une baisse de confiance change la classe de cible, pas l’éligibilité | C1, C7, R9 ✓ |
| I4 | Sans montre, toujours programmable | Mode NO_WEARABLE complet | C8 ; R1 (bloqué pour une autre raison : V33) ✓ |
| I5 | Pas de 80/20 universel | La TID est une conséquence | §R ; `TID.EMERGENT` dans toutes les semaines ✓ |
| I6 | Pas de progression universelle de 10 % | Aucun paramètre de 10 % ; V22 est un garde-fou différent (P-R0–1, 130 %, sans valeur préventive) | ✓ |
| I7 | Pas d’autorité ACWR | Bandes min–max et médiane, sans ratio | V21 ✓ |
| I8 | CS facultative | Toutes les semaines sauf R5 / R10 sans CS | ✓ |
| I9 | VDOT facultatif | Aucun paramètre VDOT ; V38 vide sans effet bloquant général | ✓ |
| I10 | Constructs de seuil jamais fusionnés en silence | Frontière 2 depuis CS / LAB seulement ; 10K = plafond, jamais cible ; semi = aucune borne | R3, R4, R5, R6 ✓ |
| I11 | Une seule variable de progression dominante | Au plus une dimension en UP | Toutes en HOLD ; C2 redistribue ✓ |
| I12 | HOLD est valide | HOLD tracé, jamais présenté comme un échec | ✓ |
| I13 | Le volume manqué n’est pas dû | Jamais `MAKE_UP_VOLUME` | R10 ✓ |
| I14 | Une reprise UNKNOWN reste UNKNOWN | Aucune conversion | C6 ✓ |
| I15 | G1 ne peut pas être relâché par G2 ou G3 | Borne effective = la plus stricte | R1 (V22 contre V33) ; R8 ✓ |
| I16 | Le GlobalPlanner possède le placement multisport | RunningEngine déclare des demandes et des contraintes | R7, C3 ✓ |
| I17 | Durée dérivée du contenu | Total = échauffement + travail + récupérations + retour au calme | Toutes les séances détaillées ✓ |
| I18 | Toute valeur numérique est traçable | Chaque nombre renvoie à Vxx, `IN:` ou un calcul | Relecture des 12 scénarios ✓ |
| I19 | Aucun paramètre non soutenu n’a de défaut silencieux | Paramètre vide ⇒ BLOCKED ou dégradation tracée ; défauts conservateurs tracés (`DEMAND.DEFAULT_CONSERVATIVE`) | R1, R8, R12, R2 ✓ |
| I20 | Mêmes entrées + même version du ruleset = même prescription | Version tracée ; goldens rejouables | Doctrine Strength reprise ✓ (à prouver en 5D par des tests) |

Le statut « ✓ » signifie **cohérent sur le papier**. La preuve exécutable viendra avec l’implémentation (plan de tests 5B, cas T-*).
