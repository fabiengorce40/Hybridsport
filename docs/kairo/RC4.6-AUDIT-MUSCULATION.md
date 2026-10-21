# REKKA — Audit de préparation RC4.6 : qualité des séances de musculation et des progressions

| | |
|---|---|
| **Base** | `claude/kairo-rc4-dev` à `fc42a7f` (R5.2 intégré) |
| **Nature** | **Lecture seule.** Aucune règle sportive ni aucun moteur n'est modifié. Le script d'analyse a tourné hors dépôt ; il est archivé dans `rc46-audit/`. |
| **Données** | Chemin réel de l'application (`rc4-sim`) sur **6 semaines** : les 6 profils du banc RC4 (P1, P1b, P2, P3, P4, P5), plus **S3** (Musculation 3× seule) et **S4** (Musculation 4× seule, Haut / Bas). Lecture des séances persistées (emplacement, exercice, séries, répétitions, charge, progression) et diagnostic R-A. |
| **Mesures complètes** | `rc46-audit/mesures-banc.txt` |

**Limite de méthode.** La simulation saisit toujours la même performance (charge de test 40 kg, répétitions du bas de la fourchette). Le **rythme** de progression n'est donc pas évaluable ici. Ce qui est mesurable :
- la **continuité** des prescriptions : retour en calibration, baisse de charge, changement d'exercice, absence de charge ;
- tout ce qui ne dépend pas de la performance saisie.

---

## Synthèse : problèmes classés par priorité

| # | Priorité | Problème | Ampleur mesurée | Profils |
|---|---|---|---|---|
| **A1** | **P1** | **Déséquilibre poussée / tirage.** Dos sous le plancher, bras et épaules au-dessus de la borne haute. | Bras au-dessus de la borne haute (14) **6 semaines sur 6 sur tous les profils** (16 à 18 séries par semaine). Dos à 9–10 séries par semaine (plancher 10), sous le plancher 3 à 5 semaines sur 6 en Full Body. Poussée (pectoraux + épaules) ≈ **3 fois** le tirage (27–34 contre 9–11 séries). | Tous |
| **A2** | **P1** | **Quadriceps sous le plancher en Full Body multisport.** | P1 : 7,2 séries par semaine (plancher 10), 6 semaines sur 6. P5 : 4,3 (ischio-jambiers 4,3). P3 : 4 semaines sur 6. | P1, P3, P5 |
| **A3** | **P1** | **Divergences du planificateur dues à l'ordre de génération multisport.** La séance de Musculation est composée **avant** que ses voisines (Cross-training, HYROX, Course) soient toutes placées. Régénérée avec la semaine finale, elle reçoit l'allègement d'interférence que la règle impose (séries −1, RIR +2, accessoires retirés). **La séance persistée ignore donc une interférence connue.** | P2 et P3 : **12 / 18**. P1 : 9 / 18. P1b et P5 : 6. **S3 et S4 (Musculation seule) : 0.** | Multisport |
| **A4** | **P1** | **Haut / Bas avec la course : séances Bas fortement amputées.** L'interférence course à ±24 h retire tous les accessoires. | P1b : **24 / 24** séances allégées (62 réductions). Plusieurs séances Bas réduites à **2 exercices** (squat 2 × 6, soulevé de terre roumain 2 × 8–12). | P1b, P5 |
| **B1** | **P2** | **Haut / Bas répétitifs, sans complémentarité.** | S4 : Bas = **2 compositions distinctes sur 12 séances**, **10 / 11** identiques à la précédente (similarité 0,97). Mouvement principal **toujours le squat** en Bas et **toujours le développé couché** en Haut. Haut : 4 compositions (similarité 0,66). | S4, P1b |
| **B2** | **P2** | **Instance supplémentaire d'un emplacement jamais suivie.** Une seule progression par emplacement : la 2ᵉ instance reste « à l'effort » indéfiniment. | S4 : leg curl (`lo.iso_lower`, 2ᵉ instance) **12 expositions sans charge**. P1b : 5. | S4, P1b |
| **B3** | **P2** | **Isolations figées.** Le même accessoire revient dans presque chaque séance. | Pec deck 18 / 18 séances (P1), 17 / 18 (P3) ; Pallof press 11 / 18 (P5) ; squat bulgare 17 / 18 (P2, S3). | Full Body |
| **C1** | **P3** | **Mollets** (limite connue, décision D1). | 0 à 3,3 séries par semaine ; sous le plancher jusqu'à 6 semaines sur 6. | Tous |
| **C2** | **P3** | **Accessoires non suivis toujours « à l'effort ».** C'est conforme au contrat (pas de suivi sans progression), mais rien ne guide la charge. | Élévations latérales, Pallof : 4 à 11 expositions sans charge. Les tractions sont au poids du corps : c'est normal. | Tous |

**Points sains (aucune action) :**
- **Continuité des charges :** **aucun retour en calibration** après la première exposition, **aucune baisse de charge** prescrite.
- **Variété en Full Body :** pas de séance identique à la précédente (0 / 17 hors S3, 1 / 17 pour S3), alternance genou / hanche conservée, 13 à 17 exercices distincts sur 6 semaines.
- **Musculation seule (S3, S4) :** aucun allègement d'interférence, aucune divergence du planificateur.

---

## 1. Variété réelle des exercices sur 6 semaines

| Profil | Séances | Exercices distincts | Compositions distinctes | Identiques à la précédente | Similarité moyenne entre séances consécutives | Mouvements principaux distincts |
|---|---|---|---|---|---|---|
| P1 (Full Body + course) | 18 | 15 | 11 | 0 / 17 | 0,16 | 2 (squat / soulevé de terre roumain) |
| P2 (Full Body + Cross-training) | 18 | 15 | 13 | 0 / 17 | 0,49 | 2 |
| P3 (Full Body + HYROX) | 18 | 17 | 15 | 0 / 17 | 0,34 | 3 |
| P5 (4 sports) | 18 | 13 | 12 | 0 / 17 | 0,06 | 3 |
| S3 (Full Body seul) | 18 | 13 | 10 | 1 / 17 | 0,56 | 2 |
| P1b — Haut | 12 | 16 (au total) | 5 | 0 / 11 | 0,69 | **1** (développé couché) |
| P1b — Bas | 12 | | 3 | 0 / 11 | 0,33 | **1** (squat) |
| **S4 — Haut** | 12 | 15 (au total) | 4 | 0 / 11 | 0,66 | **1** |
| **S4 — Bas** | 12 | | **2** | **10 / 11** | **0,97** | **1** |

La similarité est l'indice de Jaccard entre les ensembles d'exercices de deux séances consécutives du même archétype. 1 = identiques.

**Lecture.**
- La variété Full Body vient de l'alternance genou / hanche et de l'alternance des tirages. Elle est satisfaisante.
- En Haut / Bas, rien n'organise la complémentarité. Le choix du membre de chaque groupe de choix (genou / hanche, poussée horizontale / verticale) est figé par l'ancre déclarée : il n'y a pas d'alternance hebdomadaire entre deux séances du même archétype. Musculation seule, les deux séances Bas sont presque identiques chaque semaine. Avec la course, la variété apparente vient surtout des **retraits d'accessoires** par l'interférence, et non d'une conception complémentaire.

## 2. Répétitions de séances Haut ou Bas

- S4 : chaque semaine, Bas #1 et Bas #2 = squat, soulevé de terre roumain, leg extension, squat bulgare, leg curl. Seules les séries changent (4 × 6 puis 3 × 6).
- Haut : développé couché en principal chaque fois, et tractions ou tirage vertical alternés selon l'ancienneté d'exposition.
- La règle TEST_ONLY de variation intra-semaine (séance jumelle) ne se déclenche que si deux séances sont **strictement** identiques, et elle refuse toute variation qui change le volume. Elle ne produit donc presque jamais de séance B réellement différente.

## 3. Équilibre hebdomadaire des groupes musculaires

Moyenne des séries par semaine. Entre parenthèses : plancher – borne haute.

| Profil | Quadriceps (10–18) | Ischio-jambiers (8–14) | Fessiers (6–14) | Pectoraux (10–20) | Dos (10–20) | Épaules (8–16) | Bras (6–14) | Mollets (4–10) |
|---|---|---|---|---|---|---|---|---|
| P1 | **7,2** | 8,5 | 11,5 | 14,3 | **9,2** | 15,4 | **16,8** | 1,3 |
| P1b | 9,2 | 8,2 | 12,3 | 12,3 | 10,2 | 15,2 | **18,2** | 3,3 |
| P2 | 10,8 | 11,2 | 14,8 | 14,3 | **9,3** | 15,5 | **16,3** | 2,7 |
| P3 | **9,3** | 9,3 | 12,5 | 13,8 | **9,0** | 15,4 | **16,5** | 0,7 |
| P5 | **4,3** | **4,3** | 7,5 | **9,8** | **9,3** | **16,6** | **16,0** | 0,7 |
| S3 | 10,8 | 11,2 | 14,8 | 13,5 | **9,5** | 14,9 | **16,2** | 0,7 |
| S4 | 16,3 | 12,2 | **16,2** | 12,3 | 10,2 | 15,2 | **18,2** | **0** |

**Cause probable de A1** (à confirmer dans le lot L1) :
- Les **séries indirectes** créditent fortement bras et épaules : développés, tirages, presses.
- Les isolations du haut du corps sont **orientées poussée** : pec deck à chaque séance, élévations latérales.
- Le **tirage n'a qu'un emplacement par séance** en Full Body.
- Rien ne contraint le rapport poussée / tirage : seuls planchers et bornes hautes par groupe existent, et la borne haute des bras n'empêche pas les séries indirectes.

## 4. Continuité des charges et des répétitions

Transitions d'une séance à la suivante, par emplacement :

| Profil | Transitions | Exercice changé | Retour en calibration | Baisse de charge | Items sans charge |
|---|---|---|---|---|---|
| P1 | 92 | 13 | **0** | **0** | 37 / 103 |
| P1b | 107 | 25 | **0** | **0** | 48 / 118 |
| S4 | 122 | 39 | **0** | **0** | 52 / 132 |
| P5 | 78 | 19 | **0** | **0** | 45 / 89 |

- La progression prescrite ne se casse jamais : pas de recalibration, pas de baisse.
- Les **items sans charge** sont de trois natures :
  - exercices au poids du corps (tractions), ce qui est normal ;
  - accessoires non suivis (élévations latérales, Pallof : C2) ;
  - **2ᵉ instance d'un emplacement jamais suivie** (leg curl en S4, ×12 : B2).
- Les **changements d'exercice** dans un même emplacement viennent de l'alternance voulue (tirage vertical / horizontal, genou / hanche) et des retraits d'interférence. Aucun ne correspond à une progression interrompue.

## 5. Interactions avec Course, Cross-training et HYROX

| Profil | Séances Musculation allégées | Réductions | Arbitrages M3 |
|---|---|---|---|
| P1 | 12 / 18 | 37 | 1 déplacement |
| **P1b** | **24 / 24** | 62 (ensemble 19, RIR seul 31, ensemble + signal 12) | 4 conflits restants |
| P2 | 0 / 18 | 0 | 6 déplacements |
| P3 | 6 / 18 | 17 | 5 déplacements, 2 recompositions |
| **P5** | **18 / 18** | **79** | 19 conflits restants, 1 recomposition |

**Lecture.**
- Course, puis HYROX, sont les principales sources d'allègement, surtout sur genoux / cuisses et hanches à ±24 h.
- En Haut / Bas avec la course, les séances Bas tombent sous un volume utile (A4), et les quadriceps et ischio-jambiers de P5 restent loin du plancher (A2).
- Le placement G5 / M3 ne cherche pas encore à éloigner **les séances Bas** des séances de course clés.

## 6. Divergences du planificateur (diagnostic R-A)

| Profil | Divergences / séances Musculation | Forme typique |
|---|---|---|
| P2 (Cross-training) | **12 / 18** | `sets:romanian_deadlift 3>2, rir 2>4, removed: leg_curl, squat bulgare` |
| P3 (HYROX) | **12 / 18** | idem, ou tirage 2>3 |
| P1 (course) | 9 / 18 | squat 4>3, RIR 3>5, accessoires retirés |
| P1b, P5 | 6 | idem |
| S3, S4 | **0** | — |

**Cause (A3).**
- Les divergences n'existent **qu'en multisport**.
- La régénération de diagnostic retrouve l'allègement d'interférence d'une voisine que la séance persistée n'avait pas : la séance de Musculation est générée avant que les voisines soient toutes placées.
- **Effet :** le pratiquant reçoit une séance plus chargée que ce que la règle d'interférence prescrirait avec la semaine finale.
- C'est la cause principale de la non-reproductibilité. Le correctif Fix-B (régénération en 2 passes), écarté en RC4.5 parce qu'il changeait les volumes, changeait en réalité les volumes **pour cette raison même**.

---

## 7. Architecture proposée : séances Haut A/B et Bas A/B complémentaires

### 7.1 Leçons de F8 à ne pas reproduire

| Régression F8 | Cause | Garde-fou retenu |
|---|---|---|
| Ischio-jambiers −3 séries par semaine, déséquilibre genou durable | Mouvement structurant **figé par variante** sur un nombre impair de séances (A genou, B hanche, C genou) | Variantes **uniquement pour les paires** (Haut ×2, Bas ×2). La paire A + B couvre **par construction** tous les membres des groupes de choix chaque semaine. Full Body ×3 garde l'alternance actuelle. |
| Progression ralentie, redémarrages plus bas (F8-bis) | Progression **par variante** : deux fois moins d'expositions par trace | Progression **par exercice et par rôle**, commune aux variantes. Un squat en principal progresse avec tous les squats en principal, quelle que soit la variante. |
| Leg curl dilué | Accessoires **propres à chaque variante** | Accessoires **prioritaires communs** (groupes sous le plancher). Variation limitée aux accessoires non prioritaires. |
| Fausses variantes affichées (F8-c) | Lettre sans contenu différent | La lettre A / B n'est affichée que si le contenu diffère par construction (gabarit). Sinon, la lettre de contenu actuelle est conservée. |

### 7.2 Proposition

1. **Gabarits gouvernés par variante**, contenu versionné comme F6 : pour `str_upper` et `str_lower`, deux gabarits **A** et **B** qui fixent le **membre préféré** de chaque groupe de choix :
   - **Bas A** = principal genou (squat) + secondaire hanche (soulevé de terre roumain) + isolation ischio-jambiers ;
   - **Bas B** = principal hanche (soulevé de terre roumain, hip thrust) + secondaire genou unilatéral + isolation quadriceps ;
   - **Haut A** = principal poussée horizontale + tirage vertical ;
   - **Haut B** = principal poussée verticale + **tirage horizontal**, avec un accessoire de tirage (oiseau / face pull). C'est aussi un levier sur A1.
2. **Identité persistante** de la variante : rang de l'index `k` dans l'archétype (conception F8-I validée), relue au démarrage. La lettre A / B est affichée car le contenu diffère par construction.
3. **Progression par (archétype, exercice, rôle)**, commune aux variantes, à la place de la progression par emplacement. Elle corrige aussi B2 : une 2ᵉ instance peut avoir sa trace.
4. **Ancre déclarée** = celle du membre choisi par le gabarit. L'ancre ne décide plus le membre : c'est la cause du figement observé en S4.
5. **Activation** : règle TEST_ONLY par archétype appairé (fréquence 2 de `str_upper` ou `str_lower`). Fréquence impaire ou Full Body : comportement actuel inchangé.

### 7.3 Critères d'acceptation (avant toute intégration)

| Critère | Seuil |
|---|---|
| Complémentarité | Dans chaque semaine, Haut A et Haut B (resp. Bas A et Bas B) ont des mouvements principaux **différents**. Similarité intra-semaine ≤ 0,5. |
| Stabilité d'une variante | Similarité semaine à semaine de la même variante ≥ 0,8 (hors retraits d'interférence). |
| Volume | Banc RC4 + S4 : aucun groupe en baisse de plus de 0,5 série par semaine, aucun couple (semaine, groupe) supplémentaire sous le plancher. **Dos et ischio-jambiers ≥ actuel.** |
| Progression | Pour chaque exercice principal : nombre d'expositions par trace ≥ actuel, aucun redémarrage plus bas. |
| Durées, interférence, G5 / M3 | Aucun dépassement de durée ; placements et réductions inchangés hors effet attendu. |
| Reproductibilité | Classes R-A inchangées ou meilleures. |
| Données | Anciennes semaines régénérées avec leur règle d'origine ; rollback et TEST relisent les séances. |

---

## 8. Lots de développement proposés (à valider avant toute implémentation)

| Lot | Priorité | Contenu | Critères de validation |
|---|---|---|---|
| **L0** | Préalable | **Banc qualité Musculation** dans le dépôt : ce script d'audit transformé en rapport de test (variété, similarité, équilibre, continuité, interactions, R-A) sur les 8 profils. Aucune règle sportive. | Rapport figé reproductible, servant de référence à L1–L5. |
| **L1** | P1 | **Équilibre poussée / tirage** (A1) : contenu versionné (priorités de besoins, tirage horizontal facultatif, prise en compte des séries indirectes des bras). | Dos ≥ plancher sur ≥ 5 semaines sur 6 en Full Body ; bras ≤ borne haute ; aucun autre groupe en baisse > 0,5. |
| **L2** | P1 | **Ordre de génération multisport** (A3) : composer la Musculation **après** le placement des voisines, ou une seconde passe limitée au contexte d'interférence. | Divergences R-A en multisport → 0. Variation de volume **expliquée uniquement** par l'interférence désormais appliquée, et présentée avant intégration. |
| **L3** | P1 | **Bas du corps et course** (A2, A4) : placement G5 qui éloigne les séances Bas des séances de course clés, avant toute réduction. | P1b : séances Bas ≥ 4 exercices ; quadriceps et ischio-jambiers ≥ plancher plus souvent ; Running inchangé. |
| **L4** | P2 | **Haut A/B, Bas A/B complémentaires** (§ 7), TEST_ONLY, en étude puis en lot. | Critères du § 7.3. |
| **L5** | P2 | **Progression des instances répétées** (B2), intégrée à L4 ou seule. | Leg curl S4 : charge prescrite dès la 3ᵉ exposition ; aucun autre changement. |
| **L6** | P3 | Rotation des isolations non prioritaires (B3) et mollets (C1, réouverture D1). | Aucun isolement présent dans plus de 2 séances sur 3, sans baisse de volume. |

**Ordre recommandé :** L0 → L2 (cause principale de non-reproductibilité, effet d'interférence) → L1 → L3 → L4 + L5 → L6.

**Aucun moteur sportif n'a été modifié pendant cet audit. En attente de vos décisions avant toute implémentation.**
