# Reprise RC5 lot 4.3 — R4 : variantes de lecture des séances allégées (modèle réduit, 12 semaines)

Modèle `r4-model.ts` : règles autorégulées du moteur (classement, 2 preuves, e1RM lissé, pas de 2,5 kg, −10 % après 2 « en dessous », plafond de cycle 15 %), athlète Epley à capacité évolutive, fatigue du jour sur les séances allégées par interférence. Comparaison de RÈGLES, jamais une mesure physiologique.

Colonnes : charge de départ → finale ; charge que la capacité RÉELLE permet en fin de période (répétitions et RIR de référence) ; hausses / baisses ; décisions prises SUR une séance allégée ; hausses au-delà de la capacité ; échecs juste après une hausse.

## normal-progresse — Séances normales, athlète qui progresse (+0,5 %/sem.)

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 0 |
| r4 | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 0 |
| r4_r3 | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 0 |

## normal-stagne — Séances normales, athlète qui stagne

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4 | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_r3 | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |

## normal-difficulte — Séances normales, athlète en difficulté (−1 %/sem.)

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 85 | 89.5 | 2 / 2 | 0 / 0 | 1 | 1 |
| r4 | 100 → 85 | 89.5 | 2 / 2 | 0 / 0 | 1 | 1 |
| r4_floor | 100 → 85 | 89.5 | 2 / 2 | 0 / 0 | 1 | 1 |
| r4_r3 | 100 → 90 | 89.5 | 3 / 2 | 0 / 0 | 1 | 1 |
| r4_floor_r3 | 100 → 90 | 89.5 | 3 / 2 | 0 / 0 | 1 | 1 |
| r4_floor_r3_safety | 100 → 90 | 89.5 | 3 / 2 | 0 / 0 | 1 | 1 |

## hyrox-progresse — Musculation + HYROX : plancher multisport, une séance sur deux allégée par interférence (fatigue −5 %)

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 1 |
| r4_r3 | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 1 |
| r4_floor_r3_safety | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 1 |

## course-progresse — Musculation + Course : toutes les séances allégées par interférence (fatigue −3 %)

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 95 | 105.6 | 2 / 1 | 2 / 1 | 0 | 0 |
| r4 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_r3 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |

## course-stagne — Musculation + Course, athlète qui stagne

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 90 | 100 | 0 / 1 | 0 / 1 | 0 | 0 |
| r4 | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_r3 | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 100 | 100 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 95 | 100 | 1 / 1 | 0 / 1 | 0 | 0 |

## course-difficulte — Musculation + Course, athlète en difficulté (−1 %/sem.)

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 85 | 89.5 | 2 / 2 | 2 / 2 | 0 | 1 |
| r4 | 100 → 100 | 89.5 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 100 | 89.5 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_r3 | 100 → 100 | 89.5 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 100 | 89.5 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 90 | 89.5 | 2 / 2 | 0 / 2 | 0 | 0 |

## ab-alternance — Alternance Haut / Bas (principal une semaine sur deux), HYROX

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 1 |
| r4_r3 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |

## manquees — Séances manquées (S4, S5, S9), multisport

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 2 |
| r4_r3 | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 2 |
| r4_floor_r3_safety | 100 → 105 | 105.6 | 2 / 0 | 0 / 0 | 0 | 2 |

## reprise — Retour après 3 semaines d’interruption (−5 %), multisport

| Variante | Charge | Capacité (kg) | Hausses / baisses | Sur séance allégée (hausses / baisses) | Hausses injustifiées | Échecs après hausse |
|---|---|---|---|---|---|---|
| current | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4 | 100 → 100 | 105.6 | 0 / 0 | 0 / 0 | 0 | 0 |
| r4_floor | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 1 |
| r4_r3 | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3 | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 0 |
| r4_floor_r3_safety | 100 → 102.5 | 105.6 | 1 / 0 | 0 / 0 | 0 | 0 |

## Traces (exemples)

### current — course-stagne

| Exposition | Semaine | Charge | RIR prescrit / référence | Allégée | Réalisé (rép., RIR) | Classement | Décision | Pourquoi |
|---|---|---|---|---|---|---|---|---|
| 1 | S1 | 100 | 6 / 2 | non | 6, 2 | below | hold | en dessous : compteur |
| 2 | S2 | 100 | 6 / 2 | non | 6, 2 | below | decrease | 2 expositions en dessous |
| 3 | S3 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuve 1 |
| 4 | S4 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 5 | S5 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 6 | S6 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 7 | S7 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 8 | S8 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 9 | S9 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 10 | S10 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 11 | S11 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 12 | S12 | 90 | 6 / 2 | non | 6, 7 | above | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |

### r4 — course-difficulte

| Exposition | Semaine | Charge | RIR prescrit / référence | Allégée | Réalisé (rép., RIR) | Classement | Décision | Pourquoi |
|---|---|---|---|---|---|---|---|---|
| 1 | S1 | 100 | 6 / 2 | oui | 6, 2 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 2 | S2 | 100 | 6 / 2 | oui | 6, 2 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 3 | S3 | 100 | 6 / 2 | oui | 6, 2 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 4 | S4 | 100 | 6 / 2 | oui | 6, 1 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 5 | S5 | 100 | 6 / 2 | oui | 6, 1 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 6 | S6 | 100 | 6 / 2 | oui | 6, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 7 | S7 | 100 | 6 / 2 | oui | 6, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 8 | S8 | 100 | 6 / 2 | oui | 6, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 9 | S9 | 100 | 6 / 2 | oui | 5, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 10 | S10 | 100 | 6 / 2 | oui | 5, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 11 | S11 | 100 | 6 / 2 | oui | 5, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 12 | S12 | 100 | 6 / 2 | oui | 4, 0 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |

### r4_floor_r3_safety — course-difficulte

| Exposition | Semaine | Charge | RIR prescrit / référence | Allégée | Réalisé (rép., RIR) | Classement | Décision | Pourquoi |
|---|---|---|---|---|---|---|---|---|
| 1 | S1 | 100 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 2 | S2 | 100 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 3 | S3 | 100 | 6 / 4 | oui | 6, 2 | below | decrease | 3 séances allégées consécutives en dessous : baisse (fatigue persistante) |
| 4 | S4 | 90 | 6 / 4 | oui | 6, 5 | success | reassess | réévaluation de fin de cycle (R3) : 90 → 95 kg (e1RM observé) |
| 4 | S4 | 90 | 6 / 4 | oui | 6, 5 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 5 | S5 | 95 | 6 / 4 | oui | 6, 3 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 6 | S6 | 95 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 7 | S7 | 95 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 8 | S8 | 95 | 6 / 4 | oui | 6, 2 | below | reassess | réévaluation de fin de cycle (R3) : 85 → 90 kg (e1RM observé) |
| 8 | S8 | 95 | 6 / 4 | oui | 6, 2 | below | decrease | 3 séances allégées consécutives en dessous : baisse (fatigue persistante) |
| 9 | S9 | 90 | 6 / 4 | oui | 6, 3 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 10 | S10 | 90 | 6 / 4 | oui | 6, 3 | success | hold | séance allégée : preuve comptée, aucune hausse décidée (R4) |
| 11 | S11 | 90 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 12 | S12 | 90 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |

### r4_floor — hyrox-progresse

| Exposition | Semaine | Charge | RIR prescrit / référence | Allégée | Réalisé (rép., RIR) | Classement | Décision | Pourquoi |
|---|---|---|---|---|---|---|---|---|
| 1 | S1 | 100 | 6 / 4 | oui | 6, 1 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 2 | S2 | 100 | 4 / 4 | non | 6, 4 | success | hold | preuve 1 |
| 3 | S3 | 100 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 4 | S4 | 100 | 4 / 4 | non | 6, 4 | success | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 5 | S5 | 100 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 6 | S6 | 100 | 4 / 4 | non | 6, 5 | above | increase | 2 preuves, e1RM le permet |
| 7 | S7 | 102.5 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 8 | S8 | 102.5 | 4 / 4 | non | 6, 4 | success | hold | preuve 1 |
| 9 | S9 | 102.5 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 10 | S10 | 102.5 | 4 / 4 | non | 6, 4 | success | hold | preuves réunies, e1RM ne permet pas de hausse (maintien) |
| 11 | S11 | 102.5 | 6 / 4 | oui | 6, 2 | below | hold | séance allégée : en dessous, maintien sans compteur (R4) |
| 12 | S12 | 102.5 | 4 / 4 | non | 6, 5 | above | increase | 2 preuves, e1RM le permet |

