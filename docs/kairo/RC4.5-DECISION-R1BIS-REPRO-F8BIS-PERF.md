# REKKA — RC4.5 : document de décision (R1-bis, reproductibilité, F8-bis, performance)

| | |
|---|---|
| **Base mesurée** | F6 `0475973` (lot C `49f7479` inclus), branche `claude/kairo-rc4-dev` |
| **Nature** | Études en **copie jetable** uniquement. Tout le code d'étude a été retiré du dépôt. Les correctifs restent archivés sous `docs/kairo/rc45-etudes/` : `R1bis-etude.patch`, `F8bis-etude.patch`, `PERF-O1-O2-etude.patch`, avec les mesures dans `F8bis-R1bis-mesures.txt`. |
| **Inchangé** | Code produit (F6 tel que commité) ; Running ; branches TEST, production et repli. Aucune fusion, aucun déploiement. |
| **Outils de mesure** | Banc RC4 (6 profils × 6 semaines) ; scénarios Strength A, A sans RIR et B (4 semaines) ; contrôle de reproductibilité du profil de consolidation (12 séances) ; profil CPU Node ; mesure mobile en CPU ralenti ×4. |

---

## Synthèse des décisions demandées

| # | Sujet | Constat principal | Recommandation |
|---|---|---|---|
| D1 | **R1-bis** (mollets sur le temps d'un accessoire en excédent) | La meilleure version, R1-bis-3, rend 4 séries de mollets par semaine au scénario Haut / Bas (0 → 16 sur 4 semaines), **sans aucun écart** au banc RC4. **Mais** le squat bulgare (suivi, en progression) est remplacé par les fentes marchées, qui repartent en calibration. | **Ne pas implémenter en l'état.** Innocuité non démontrée (une progression active est interrompue). Proposition R1-bis-4 (§1.5) à mesurer si vous le souhaitez. |
| D2 | **Reproductibilité** 8/12 → 4/12 | Sur les 12 séances, 2 écarts viennent de l'historique de planification (progressions créées après la planification). 6 viennent du planificateur : séances générées face à des versions **intermédiaires** des autres séances. 4 écarts portent sur la trace seule. | **Correctif R-A** (lecture « état de planification » réservée au **diagnostic**) : aucun changement de séance, aucun chemin de démarrage touché. Pour la catégorie B, **pas de correctif de contenu** en l'état. Fix-B change les volumes et n'est pas recommandé. |
| D3 | **F8-bis** | Seule la version F8-bis-2LS ne fait perdre aucun volume (identique à F6 sur 6 profils). Le prix est payé sur les **charges** : progressions par variante plus lentes et redémarrages plus bas (jusqu'à −5 kg). Les autres versions perdent du volume ou figent la progression. | **Ne pas poursuivre les progressions séparées par variante.** Si l'identité A / B / C reste souhaitée : **F8-c** (identité affichée, progression commune, graine inchangée), neutre par construction. |
| D4 | **Performance** | Coût dominant : la validation Zod complète des paramètres Strength à **chaque** appel (`readStrengthParams`, sans cache), multipliée par F6 (signatures, volumes, mesures G5). | **O1 + O2** : décisions identiques sur 6 profils ; −30 à −48 % en Node et −10 à −29 % sur mobile ×4. O2 touche `packages/strength/src/params.ts`, il faut donc une liste fermée gouvernée. |

---

## 1. F6 — R1-bis

### 1.1 Rappel du problème

Au scénario A (Haut / Bas, 4 séances par semaine, hypertrophie), les mollets passent de 22 séries (avant F6, en concurrence avec leg curl et leg extension) à **0** avec F6. L'emplacement `lo.calves` est toujours omis faute de temps (`duration`), alors que les quadriceps sont à 14–16 séries pour un plancher de 10.

### 1.2 Règle testée (copie jetable, moteur Strength, étape 5 de `build`)

Quand l'ajout résiduel ne tient pas dans la durée, on cherche une **victime**, ce qui est permis seulement si :
- c'est un accessoire facultatif, non résiduel, **sans progression active** (`!track`) ;
- c'est une instance supplémentaire d'un emplacement répété ;
- **tous** ses groupes principaux restent au plancher ou au-dessus sans elle (projection hebdomadaire).

On la retire, puis on ajoute les mollets si la séance tient. La cause est tracée : `SLOT_OMITTED … residual_swap:<groupes>:<séries>`.

Ne sont jamais retirés :
- un emplacement requis ;
- une ancre ;
- un accessoire suivi ;
- l'emplacement résiduel lui-même.

Interférences et récupération : la règle n'agit qu'**après** les retraits d'interférence. Une séance qui a perdu les mollets pour interférence (`dropOptionalNeeds`) ne les retrouve jamais.

### 1.3 Variantes mesurées

| Variante | Victime admise | Scénario A (4 semaines) | Banc RC4 (6 profils, hors mollets) |
|---|---|---|---|
| F6 (référence) | — | mollets 0 ; quadriceps 62 ; ischio-jambiers 49 | référence |
| **R1-bis** | 2ᵉ instance d'un emplacement, groupes au plancher | mollets 0 → 16 ; **ischio-jambiers 49 → 37** (leg curl retiré) | P1 : quadriceps −1,4, ischio-jambiers −1,2, fessiers −1,5 par semaine ; mollets P2 2,7 → 3,3, P3 0,7 → 1,3 |
| **R1-bis-2** | Toute instance d'un emplacement répété, **jamais** un exercice à dominante ischio-jambiers | mollets 0 → 16 ; quadriceps 62 → 50 (16 → 13 par semaine, plancher 10) ; ischio-jambiers intacts ; scénario B inchangé | Régression P1 conservée ; multi-configuration A : épaules 13,3 → 9,5 |
| **R1-bis-3** | R1-bis-2 limité à `lo.calves` (séances Bas du corps) | mollets **0 → 16** (4 par semaine) ; quadriceps 62 → 50 ; ischio-jambiers, fessiers, haut du corps **intacts** ; même résultat sans RIR ; scénario B inchangé | **0 écart hors mollets, mollets identiques à F6, sur les 6 profils** (aucun profil du banc ne déclenche l'échange) |

**Mécanisme de la régression du banc (R1-bis et R1-bis-2).** L'échange fonctionne dans les séances Full Body. Il change la demande de la séance, donc le placement G5 / M3 de la semaine 5 de P1 (une séance de course déplacée, des réductions d'interférence différentes). Le coût vient de cet effet de chaîne. Il ne vient pas de la mesure G5 : la variante R3′, qui réintègre les séries échangées dans la mesure, ne change rien. Limiter l'échange à `lo.calves` (R1-bis-3) supprime cet effet.

### 1.4 Pourquoi R1-bis-3 n'est pas démontrée inoffensive

Au scénario A, semaine 1, séance Bas #2, la victime est l'**instance supplémentaire de leg extension**. Cette instance porte la variation de la séance face à sa jumelle (critère `variant`). Une fois la victime retirée, le CORE choisit **une autre proposition alternative** du moteur, dans laquelle le squat bulgare est remplacé par les fentes marchées (critère `variant`). Conséquences sur les 4 semaines :

| | F6 | R1-bis-3 |
|---|---|---|
| Accessoire unilatéral | Squat bulgare suivi : 2 × 8–12 → 10–12 → 12 à 40 kg | **Fentes marchées** : calibration en semaine 2, puis 8–12 → 10–12 à 40 kg |
| Leg extension | Une instance dans chaque séance Bas | Séance Bas #1 seulement (`ajouté … critère : track`) |
| Mollets | 0 | 4 × 12–20 par semaine (séance Bas #2), suivis, en progression de répétitions |

Formellement, la progression du squat bulgare n'existait pas encore au moment de l'échange : elle est créée après la séance. Mais la continuité de l'exercice et de la charge est perdue dès la semaine 2. Ce n'est pas conforme à votre condition « ne jamais interrompre une progression active ». Les deux seuls tests en échec de la suite app-core, avec R1-bis-3 actif, sont les deux rapports figés du scénario A, qui montrent cet effet.

### 1.5 Piste suivante possible : R1-bis-4 (non mesurée)

Faire l'échange **après** le choix du CORE, sur la proposition déjà retenue, et non dans chacune des alternatives. Le reste de la séance ne peut alors pas changer :
- même proposition ;
- mêmes exercices ;
- l'instance supplémentaire retirée, les mollets ajoutés.

Elle demande une passe dans le port Musculation (ou une seconde invocation contrôlée du moteur), pas une modification de l'étape 5. Critère d'acceptation : scénario A identique à F6, sauf « instance supplémentaire retirée + mollets ajoutés », et banc RC4 identique hors mollets.

**Décision D1.** Ne pas implémenter R1-bis (ni 2, ni 3). Mesurer R1-bis-4 ? Recommandation : oui, en copie jetable, si les mollets du scénario Haut / Bas restent prioritaires pour vous.

---

## 2. Reproductibilité (profil de consolidation, 12 séances Strength sur 4 semaines)

Mesure : `regenerateSession` sur chaque séance planifiée, comparée à la séance persistée par `sessionChanges` (exercices, séries, RIR) et par un diff JSON complet (trace).

### 2.1 Classement des 12 séances (F6 actuel)

| Catégorie | Séances | Nature de l'écart | Cause |
|---|---|---|---|
| **A — historique de planification** | 2 séances au contenu modifié (semaine 1, séances 2 et 3) | Ancres différentes, par exemple soulevé roumain → squat, et un tirage différent | Des progressions sont créées **après** la planification, par les séances réalisées plus tôt dans la semaine. La régénération les présente comme ancres. Depuis l'état de planification exact, ces 2 séances sont **identiques**. |
| **A′ — progression appliquée** | 4 séances « trace » | Bornes de répétitions (`reps.min`), empreinte, durée estimée. Exercices, séries et RIR identiques. | Les progressions avancent après la planification. C'est le comportement voulu au démarrage : adaptation à la dernière performance. |
| **B — planificateur** | 6 séances au contenu modifié : S1-1, S2-1, S3-1, S3-2, S4-1, S4-2 | Leg curl 3 > 4 séries ; mollets ↔ Pallof ; squat ↔ soulevé roumain | Pendant la planification, chaque séance est générée face aux versions **intermédiaires** des autres séances de la semaine (séries prévues du bloc de force hébergé par le Cross-training, ordre des ancres déclarées). Elle est ensuite comparée aux versions **finales**. L'écart persiste même depuis l'état de planification exact. |

**Pourquoi la reproductibilité tombe de 8/12 à 4/12 avec F6.** L'emplacement résiduel des mollets dépend du contexte hebdomadaire :
- R2 : séries de mollets prévues dans les autres séances ;
- R1 : temps restant.

Il rend la catégorie B plus sensible à l'ordre de génération. S3-1, S3-2, S4-1 et S4-2 étaient reproductibles avant F6.

### 2.2 Correctifs mesurés

| Correctif | Principe | Reproductibles (`sessionChanges`) | Effets |
|---|---|---|---|
| **Fix-A** | Lecture « état de planification » : progressions ouvertes après `plannedAt` ignorées | 6 / 12 | Si on l'applique aux chemins de démarrage, environ 10 tests changent de comportement. Leur prémisse est la régénération sur l'état courant : RP-1, RP-3, AP-1 à AP-6, DP-3. Ce n'est pas une régression de sécurité, mais l'adaptation au démarrage est perdue. |
| **Fix-B** | Passe de fidélité après planification : 2 passes de régénération des séances Strength, dans l'ordre des dates | 4 / 12 seul | **Change le contenu planifié** (consolidation : ischio-jambiers 36 → 44, quadriceps 36 → 29, mollets 12 → 4) et ajoute +4 à +46 % de temps en Node. |
| **Fix-A + Fix-B** | Les deux | **12 / 12** (6 strictement identiques) | Banc RC4 identique, mais le contenu de la consolidation change (cf. Fix-B). M3 n'a pas été revérifié. |

### 2.3 Correctif proposé : R-A

Il ne modifie aucune séance et ne touche aucun des quatre chemins de démarrage.
- `regenerateSession` reçoit une option `asOfPlanning` (Fix-A), **utilisée seulement par le contrôle de reproductibilité et par le diagnostic**.
- Les quatre chemins de démarrage gardent la régénération sur l'état courant :
  - Faire maintenant ;
  - Commencer depuis le Planning ;
  - contrôle pré-séance ;
  - reprise.
- Effet : l'indicateur ne compte plus comme « non reproductibles » les écarts d'adaptation voulus (catégories A et A′). Il mesure 6 / 12, et les 6 restantes sont exactement la catégorie B, ce qui donne un indicateur vrai.
- Pour la catégorie B, ne pas corriger le contenu tant qu'une version de Fix-B à volume constant n'existe pas. Piste : figer, à la planification, le contexte hebdomadaire réellement vu par chaque séance (séries prévues des autres séances) dans sa provenance, pour que la régénération de diagnostic le relise.

**Décision D2.** R-A (diagnostic seul) : oui ou non ? Fix-B : recommandation non.

---

## 3. F8-bis — variantes A / B / C stables

### 3.1 Règles testées (copie jetable, à partir de `F8-variantes-k.patch`)

Points communs à toutes les versions testées :
- identité de variante par l'index `k`, persistée (`.vB`, `.vC`) et relue ;
- accessoires suivis **communs** (continuité F6 : le leg curl reste l'exercice en place de toutes les séances).

| Version | Ancres par variante | Choix du membre d'un groupe de choix (genou / hanche, poussée…) | Graine |
|---|---|---|---|
| F8 complet (rappel, abandonné) | Tous les emplacements | Ancre de la variante (figé) | Rang de variante |
| **F8-bis-1** | Tous les emplacements ancrables | Ancres de la variante présentées seulement si elle en a pour **tous** les membres du groupe ; sinon alternance par l'exposition | Rang de variante |
| **F8-bis-1L** | Groupe `main` seulement (principal genou / hanche) | Idem | Rang de variante |
| **F8-bis-2** | Tous les groupes de choix | **Décision commune de la semaine** (ancre la moins récemment utilisée, toutes variantes confondues). La variante présente **sa propre** ancre sur ce membre, ou aucune. | Rang de variante |
| **F8-bis-2L** | Groupe `main` seulement | Décision commune | Rang de variante |
| **F8-bis-2LS** | Groupe `main` seulement | Décision commune | **Graine actuelle** (rang par date) |

### 3.2 Volumes : banc RC4, moyenne par semaine, comparée à F6

| Version | Pertes (séries par semaine) | Couples (semaine, groupe) sous le plancher | Durées |
|---|---|---|---|
| F8 complet (rejoué, identique au rapport F8) | P1 : ischio-jambiers −3,0, fessiers −1,8 ; P3 : ischio-jambiers −2,6 ; mollets P2 −2,7 | 17 → 20, 9 → 12, 16 → 18 | OK |
| F8-bis-1 | P1 : quadriceps −1,5, ischio-jambiers −1,2, fessiers −1,7 ; P3 : ischio-jambiers −1,6, fessiers −1,0 | P2 9 → 6, P3 16 → 10, P5 22 → 23 | OK, mais les **dates changent** (P1 semaine 2 : 13 / 16 / 18 → 12 / 14 / 15) |
| F8-bis-1L | Volumes = F6 (épaules −1,2 pour P2 / P3 : graine) | = | OK |
| F8-bis-2 | Épaules −1,3 à −1,7 ; mollets P2 −0,7 ; tronc P5 −1,3 | **P2 9 → 12**, P1 17 → 18 | OK |
| F8-bis-2L | Épaules −1,2 pour P2 / P3 (graine) | = | OK |
| **F8-bis-2LS** | **Aucune** : tous les groupes identiques à F6 sur les 6 profils | **=** | **= F6** (aucun dépassement ; estimation maximale inchangée) |

L'alternance genou / hanche est conservée dans toutes les versions « L » et « 2 ». Par exemple, P1 alterne soulevé roumain, squat, soulevé roumain d'une semaine à l'autre, comme avec F6.

### 3.3 Continuité des exercices et des charges

| Version | Exercices | Charges |
|---|---|---|
| F8-bis-1L | = F6 sauf P1b | **Progression figée** pour P1b (Haut / Bas) : squat à 40 kg pendant 6 semaines (F6 : 40 → 42,5 → 45). Le soulevé roumain devient le soulevé roumain unilatéral, à 3 × 8–12 et 40 kg pendant 6 semaines (F6 : 8–12 → 12, puis 42,5 kg). Cause : la variante n'a jamais d'ancre sur **tous** les membres, donc ses ancres ne sont jamais déclarées. |
| **F8-bis-2LS** | **= F6** : mêmes exercices, séries, répétitions et dates sur les 6 profils. Seules les charges diffèrent, dans 19 séances : P1 3, P1b 4, P3 2, P5 10. | Progression **plus lente** et redémarrages plus bas : chaque variante ne progresse que sur ses propres expositions, environ moitié moins nombreuses. **P1** : soulevé roumain d'une variante à 37,5 kg (F6 : 40) aux semaines 2, 4 et 6. **P3** : soulevé roumain 35 kg (F6 : 40) aux semaines 2 et 4. **P5** : squat 42,5 kg atteint en semaine 6 (F6 : semaine 3), soulevé roumain plafonné à 40 kg (F6 : 42,5). **P1b** : squat plafonné à 42,5 kg (F6 : 45 kg en semaine 6). |

### 3.4 Conclusion F8-bis

- Les deux contraintes (pas de déséquilibre figé, pas de perte de volume) sont tenues **uniquement** si la variante ne décide plus du mouvement structurant (F8-bis-2LS).
- Dans ce cas, son seul effet est de **séparer les progressions**, ce qui coûte de la charge sans rien apporter au contenu.
- La séparation des progressions par variante n'a donc pas de bénéfice mesurable sur le banc, et un coût mesurable sur la progression.

**Décision D3.** Recommandation :
- abandonner les progressions par variante, F8-bis compris ;
- si l'identité A / B / C est voulue pour l'affichage et la compréhension, livrer **F8-c** :
  - identité persistante et relue (déjà conçue et testée) ;
  - **progression commune** ;
  - **graine inchangée** ;
  - contenu identique à F6 par construction, à vérifier sur le banc.

---

## 4. Performance de F6

### 4.1 Opérations coûteuses (profil CPU, banc RC4)

Environ **34 %** du temps CPU est passé dans la validation Zod. Répartition des principaux postes :
- `readStrengthParams` : environ 8 % ;
- `readStrengthParam` : environ 4 % ;
- `acceptProposal` : environ 2,8 % ;
- `migrateToCurrent` : environ 2 %.

`readStrengthParams` revalide **tous** les paramètres `strength.*` à chaque appel, sans cache. F6 multiplie ces appels dans le port Musculation, car `residualIds()` → `params()` est appelé à chaque :
- signature de séance jumelle ;
- calcul de volume (`plannedGroupSets`) ;
- mesure des candidats G5.

### 4.2 Optimisations mesurées (décisions sportives inchangées)

| Optimisation | Contenu | Node (banc) | Décisions |
|---|---|---|---|
| **O1** | Mémoïsation dans le port : `params()` et `residualIds()` calculés une seule fois par port (le ruleset d'un port est fixe) | −15 à −18 % | Identiques sur 6 profils |
| **O1 + O2** | O2 : cache `WeakMap` par ruleset chargé dans `readStrengthParams` / `readStrengthParam` (`packages/strength/src/params.ts`) | **−30 à −48 %** (P2 : 5,5 → 3,8 s) | **Identiques sur 6 profils** |

Mobile, CPU ralenti ×4 (coût de planification, en secondes) :

| Profil | F6 | O1 + O2 |
|---|---|---|
| P1 | 3,50 | 2,91 |
| P1b | 2,23 | 1,60 |
| P2 | 4,78 | 3,39 |
| P3 | 4,21 | 3,06 |
| P5 | 1,86 | 1,69 |

**Conditions d'intégration :**
- O2 modifie le code source Strength : il faut une entrée dans une liste fermée de l'architecture, sur le modèle de `STRENGTH_RC45_F6_CHANGES`.
- Le cache suppose qu'un `LoadedRuleset` est immuable après chargement, ce qui est le cas aujourd'hui. Une erreur de validation n'est jamais mise en cache.
- Critère de livraison : banc RC4 strictement identique, `pnpm check`, build, E2E.

**Décision D4.** O1 seul (aucun fichier Strength touché) ou O1 + O2 (gain double, liste fermée à ouvrir) ? Recommandation : O1 + O2.

---

## 5. Ce qui n'a pas été fait

- Aucune implémentation permanente.
- Aucune modification Running.
- Aucune fusion, aucun déploiement.
- R1-bis-4 n'est pas mesurée.
- M3 n'est pas revérifié pour Fix-A + Fix-B.
- Rollback, « Modifier », douleur et matériel ne sont pas testés pour F8-bis : l'étude s'arrête sur le critère des charges.

En attente de vos décisions D1 à D4 avant toute modification.
