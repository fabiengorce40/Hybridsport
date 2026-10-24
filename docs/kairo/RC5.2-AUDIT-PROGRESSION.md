# RC5.2 — Audit du ralentissement de progression (Haut A/B et Bas A/B)

> **Étude seulement.** Aucune modification du moteur ni du contenu sur la branche de développement. RC5.1 reste sur
> `claude/kairo-rc4-dev`, non déployé. Variantes simulées dans une copie jetable (patch : `rc52-etudes/rc52-etude.patch`).

## 1. Protocole

| Élément | Valeur |
|---|---|
| Durée | **12 semaines** (5 oct. → 27 déc. 2026), chemin réel de l'application. |
| Profils (hypertrophie 4×) | S4 (Musculation seule), P1b (+ Course), S4H (+ HYROX), S4C (+ Cross-training), S4D (haltères seuls). |
| Athlète « conforme » | Toutes les séries au haut de la fourchette, **RIR déclaré = RIR cible**. |
| Athlète « progressant » | Idem, **RIR déclaré = cible + 2** : séries plus faciles que prévu, l'athlète progresse. Avec +1, l'e1RM monte mais la charge arrondie au palier de 2,5 kg ne change pas. |
| Sondes au démarrage | Semaines 2 et 7 : contrôle inconnu, fatigue, douleur genou P2, course libre la veille. |

### Variantes

| Code | Description |
|---|---|
| **REF** | Haut / Bas d'avant RC5.1 (contenu L1b-4). |
| **A** | Rotation Haut A/B et Bas A/B actuelle (RC5.1). |
| **B1** | Principal **commun** (développé couché, squat) dans A et B ; A/B différenciés par tirages, secondaires et accessoires. |
| **B2** | Principaux alternés **et** l'autre principal en **exposition secondaire chargée**. Haut A : développé couché lourd + développé militaire barre en 3 × 8–12 ; Haut B : l'inverse ; même logique en bas. |
| **C** | B2 + progression des accessoires communs **partagée** entre A et B. |
| **CA** | **A** + progression des accessoires communs partagée entre A et B. Même exercice au même emplacement : une seule track au lieu de deux (par exemple pec deck, leg extension, squat bulgare, leg curl). |

## 2. Causes identifiées (indépendantes de A/B)

1. **Principaux de l'athlète conforme : aucune hausse de charge, dans toutes les variantes, y compris REF** (40 kg pendant 12 semaines, S4).
   - Une réussite exacte (RIR déclaré = cible) maintient la charge.
   - La règle de progression sur réussite exacte n'est pas gouvernée : trace `PROGRESSION.DECISION_BLOCKED`, `exact_success_progression`.
   - La fréquence n'y change donc rien.
2. **Principaux de l'athlète progressant : plafond à +15 % dans toutes les variantes.**
   - Le plafond de cycle `cycleCapFraction` = 0,15 s'applique et le mésocycle ne se termine jamais (périodisation non gouvernée, `mesocycleEnded: false`).
   - Résultat : 40 → 45 kg (haltères 40 → 46) puis plafond, en REF comme en A.
   - A retarde la **première** hausse d'une semaine (S3 → S4), avec la même charge finale.
3. **Squat à 40 kg pendant six séances chez S4H (HYROX).**
   - Ce n'est pas un effet de la fréquence : le squat de l'athlète conforme ne progresse jamais (point 1).
   - En REF, la seule hausse (42,5 kg) coïncide avec une exposition **allégée à 2 séries** par l'interférence HYROX (même constat sur P1b : `PROGRESSION.ADVANCED` après « 2/2 séries »). C'est un effet de bord à examiner, pas une progression réelle.
   - En A, le Bas A (squat) ne tombe plus sur les jours allégés, ce sont les Bas B qui le sont : l'effet de bord disparaît.
4. **Fatigue 4 → 3 adaptations chez S4H.**
   - La séance non adaptée est le Bas B du mercredi 14/10, placé 24 h après la séance HYROX « course compromise ».
   - Elle est **déjà réduite au minimum** par l'interférence : soulevé roumain 2 × RIR 4, presse 2 × RIR 4, gainage.
   - La règle d'état du jour (RIR + 1, séries en moins) n'a plus rien à retirer, d'où « inchangée » (readiness « caution » tracée).
   - En REF, la séance réduite de ce jour gardait un Pallof press (3 séries) que la fatigue pouvait retirer.
   - Aucune sécurité perdue.
   - Semaine 7 : 4 / 4 adaptées dans toutes les variantes.

## 3. Ralentissement réellement dû à A/B : les accessoires

La double progression avance **par exposition**. A expose chaque exercice une fois par semaine.

Les accessoires présents **dans A et dans B** progressent sur **deux tracks séparées** (une par archétype), chacune exposée une fois par semaine. Leur rythme est donc divisé par deux, alors qu'ils sont exécutés deux fois par semaine.

Première hausse de charge, S4 conforme :

| Exercice | REF | A | B1 | B2 | C | **CA** |
|---|---|---|---|---|---|---|
| Pec deck (A et B) | S7 | S12 | S12 | S12 | S7 | **S7** |
| Leg extension (A et B) | S7 | S12 | S12 | S12 | S7 | **S7** |
| Squat bulgare (A et B) — charge finale | S5 — 46 kg | S8 — 42 kg | S8 — 42 kg | S8 — 42 kg | S5 — 46 kg | **S5 — 46 kg** |
| Tirage horizontal poulie (A seul) | S6 | S8 | S8 | S7 | S7 | S8 |
| Développé épaules machine (A seul) | S5 | S8 | S8 | — | — | S8 |

Seuls les exercices propres à une variante gardent un retard (S5–S6 → S8). C'est le coût inhérent de la complémentarité : la moitié des expositions, pour la même dose par muscle.

## 4. Comparaison sur 12 semaines (moyennes par semaine)

Tableaux complets par profil et par athlète : `rc52-etudes/tableaux-12-semaines.md`.

### S4, athlète conforme

| Var. | Fréq. principaux / sem. | 1re hausse accessoire | Pecto / Dos / Épaules / Bras | Au-dessus haut | P/T | Durée moy / max | Exercice changé | R-A |
|---|---|---|---|---|---|---|---|---|
| REF | DC 2, squat 2, RDL 1,9 | S5 | 12,2 / 10,1 / 15,1 / 18,1 | 24 | 1,91 | 48 / 60 | 75 | 48/48 |
| A | DC, DM, squat, RDL : 1 chacun | S7 | 11,2 / 10,6 / 14,7 / 17,9 | 25 | 1,82 | 49 / 60 | 69 | 48/48 |
| B1 | DC 2, squat 2 | S7 | 12,2 / 10,6 / 14,2 / 17,9 | 26 | 1,82 | 49 / 60 | 69 | 48/48 |
| B2 | DC, DM, squat, RDL : 2 chacun | S7 | 12,2 / 12,1 / 15,1 / **21,1** | **31** | **1,63** | 49 / 61 | 57 | 48/48 |
| C | idem B2 | S5 | idem B2 | 31 | 1,63 | 49 / 61 | 57 | 48/48 |
| **CA** | idem A | **S5** | idem A | 25 | 1,82 | 49 / 60 | 69 | 48/48 |

DC = développé couché ; DM = développé militaire ; RDL = soulevé de terre roumain.

### Profils multisports et matériel limité (athlète conforme)

| Profil | Mesure | REF | A | B2 | CA |
|---|---|---|---|---|---|
| P1b (Course) | séances allégées / réductions | 48 / 132 | 48 / 132 | 48 / 132 | 48 / 132 |
| P1b | au-dessus haut ; P/T | 14 ; 1,91 | 14 ; 1,82 | 19 ; 1,63 | 14 ; 1,82 |
| S4H (HYROX) | allégées / réductions | 33 / 101 | 32 / 95 | 32 / 100 | 32 / 95 |
| S4H | 1re hausse accessoire | S5 | S7 | S7 | **S5** |
| S4C (Cross-training) | au-dessus haut ; 1re hausse accessoire | 25 ; S5 | 28 ; S7 | 31 ; S7 | 28 ; **S5** |
| S4D (haltères) | séances | 48 | 48 | **0 : programme non créé** | 48 |
| S4D | 1re hausse accessoire | S4 | S7 | — | S6 |

Valable pour **toutes** les variantes et tous les profils :
- quadriceps, ischios, fessiers et mollets inchangés ;
- aucun dépassement de durée (maximum 62 min sur des créneaux de 60–90 min) ;
- reproductibilité R-A 48/48 ;
- ancres jamais remplacées sans cause, aucun retour en calibration, aucune baisse de charge.

### Douleur et fatigue au démarrage

- Douleur genou P2, course libre la veille, contrôle inconnu : décisions **identiques** dans toutes les variantes (semaines 2 et 7).
- Fatigue : identique, sauf S4H semaine 2 (3 / 4 adaptées en A, B1, B2, C et CA, contre 4 / 4 en REF ; cause au § 2.4). En semaine 7 : 4 / 4 partout.

## 5. Lecture des variantes

| Variante | Apport | Coût | Avis |
|---|---|---|---|
| **A** (actuel) | Complémentarité : 4 principaux, alternance des jours contraints. | Accessoires communs deux fois plus lents ; 1re hausse d'un principal +1 semaine. | Base conservée. |
| **B1** (principal commun) | DC et squat 2× / semaine. | Perd le développé militaire barre et le RDL principal. Aucun gain de charge sur les principaux, car le frein vient des règles (§ 2.1–2.2), pas de la fréquence. Accessoires aussi lents que A. | Non recommandé. |
| **B2** (secondaire chargé) | Chaque principal 2× / semaine (lourd + volume) ; dos +1,5 série, P/T 1,82 → 1,63. | Bras 18 → 21 séries (au-dessus de la borne 6–14) ; semaines au-dessus de la borne haute 25 → 31 ; **échoue sans barre** (S4D : programme non créé) ; accessoires aussi lents que A. | Non retenu en l'état. Intéressant pour l'étude poussée / tirage. |
| **C** (B2 + partage) | Cumule B2 et la progression des accessoires de REF. | Mêmes coûts que B2 (bras, S4D). | Non retenu en l'état. |
| **CA** (A + partage) | **Rétablit le rythme de REF** pour les accessoires communs (S12 → S7, squat bulgare 42 → 46 kg), sans rien changer à la composition, aux volumes, à P/T, aux durées ni aux adaptations. | Exercices propres à A ou B : toujours 1× / semaine (coût de la complémentarité). Modification du moteur : suivi des tracks par famille d'archétype. | **Piste recommandée** pour une prochaine intégration, après validation. |

Le nombre d'exercices différents n'a pas été un critère : CA n'en ajoute aucun.

## 6. Points à trancher (hors A/B, constatés dans toutes les variantes)

1. **Progression sur réussite exacte** des principaux autorégulés : non gouvernée. Un athlète qui réalise exactement la prescription ne progresse jamais en charge.
2. **Fin de mésocycle** non gouvernée : le plafond de cycle (+15 %) devient un plafond permanent (45 kg vers la semaine 6, puis plus rien sur 12 semaines).
3. **Exposition allégée à 2 séries** suivie d'une hausse de charge (REF P1b et S4H) : effet de bord du calcul de preuve à vérifier.
4. **Équilibre poussée / tirage** (rappel RC5.1) : 1,82 en A ; B2 montre qu'une exposition secondaire de tirage le ramène à 1,63, au prix d'un excès sur les bras.

Ces quatre points pèsent davantage sur la progression que le choix A/B. Ils relèvent de règles sportives à valider avant toute modification du moteur.
