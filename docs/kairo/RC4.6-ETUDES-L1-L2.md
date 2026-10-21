# RC4.6 — Banc qualité (L0), études L2 et L1 : rapport de décision

**Branche :** `claude/kairo-rc4-dev`. **Moteurs sportifs, Running, TEST et production : inchangés.**
- Les études L2 et L1 ont été menées dans des **copies jetables** (arbres de travail temporaires), puis supprimées.
- Les modifications étudiées sont archivées sous forme de patchs dans `docs/kairo/rc46-audit/etudes/` pour la reproduction. **Aucune n'est intégrée.**
- Mesures : banc L0 (`packages/app-core/tests/rc46/quality-bench.ts`), chemin réel de l'application, 6 semaines.
- Profils : les 8 du banc, plus, pour L2, le profil de consolidation (Musculation 3×, plus Cross-training « force + conditionnement » qui héberge un bloc de force).

---

## Synthèse

| Lot | Résultat principal | Recommandation |
|---|---|---|
| **L0** | Banc intégré, référence figée. **Correctif :** les divergences R-A se mesurent **à la planification**. À ce moment, elles sont nulles sur les 7 profils avec Musculation. L'hypothèse A3 de l'audit est **retirée**. | Conserver la référence. |
| **L2** | Le contexte final des voisines ne change **rien** sur P1, P1b, P2, S3 et S4. Il change 2 séances sur 18 en P5. En P3, il **annule des décisions d'arbitrage M3**. Sur le profil de consolidation, il fait **chuter les quadriceps de 9 à 6 séries par semaine**. | **Ne pas intégrer.** Ouvrir à la place une étude ciblée sur la dépendance circulaire Musculation ↔ bloc de force du Cross-training. |
| **L1** | Le tirage horizontal complémentaire ramène le dos au plancher sur tous les profils Full Body : 0 semaine sous le plancher, contre 3 à 5. Il fait aussi passer le rapport poussée / tirage de 2,0–2,3 à 1,2–1,3. En revanche, les **bras montent** (+4 à +5 séries) et les **mollets baissent** en P2 et P3. Limiter le Full Body à une isolation du haut du corps supprime les dépassements des épaules sans perte. | **Intégrer V3 seule**, en contenu versionné, après votre accord. **Ne pas intégrer V2 en l'état.** Trancher d'abord la question du comptage des bras (§ 3.4). |

---

## 1. L0 — banc qualité : rappel et correctif

- **Banc :** commits `a63a12d` et `7a8845f`. Rapport figé : `packages/app-core/tests/rc46/__reports__/quality-bench.md` et `.json`.
- **Correctif `7a8845f` :**
  - la reproductibilité R-A est mesurée juste après la planification de chaque semaine, par un crochet d'observation de `rc4-sim` qui ne modifie aucun état ;
  - en fin de simulation, la reconstruction « à la planification » du diagnostic R-A ne retire que les progressions ouvertes depuis ; l'historique réalisé ensuite (séances voisines faites, charges) est conservé ;
  - les écarts étaient donc attribués à tort au planificateur.
- **Résultat corrigé :** 0 divergence du planificateur sur P1, P1b, P2, P3, P5, S3 et S4. L'audit (§ 6) est corrigé.
- **Profil de consolidation :** 6 divergences sur 18 **à la planification** (voir L2). C'est le seul cas réel.

---

## 2. L2 — Musculation générée avec le contexte final des voisines

### 2.1 Variantes comparées

| Variante | Principe (dans `planCore`, après l'arbitrage M3) |
|---|---|
| **Référence** | Code actuel. Seconde passe dans l'ordre des dates, puis arbitrage M3 et rafraîchissement des consommateurs. |
| **A — composition après placement** | Toutes les séances de Musculation sont régénérées **en dernier**, avec le contexte final : voisines, séances de la semaine, blocs de force du Cross-training. Une régénération refusée ou qui crée un conflit est abandonnée et la version précédente est gardée. |
| **B — seconde passe limitée aux interférences** | Seules les séances dont le **contexte voisin d'interférence** a changé depuis leur génération sont régénérées. Le reste du contexte est inchangé. |

### 2.2 Mesure préalable : contexte des voisines périmé

- **Mesure :** pour chaque séance de Musculation, contexte voisin utilisé comparé au contexte final. Les évaluations comptent toutes les planifications de la semaine, y compris les candidates G5.
- **Contexte périmé :**
  - aucun en P1, P1b, P2, S3 et S4 ;
  - 5 sur 42 en P3 ;
  - 4 sur 18 en P5 ;
  - 6 sur 18 sur le profil de consolidation.
- **Hors périmètre, à signaler :** en P2, **29 contextes sur 48 du Cross-training** sont périmés. Le Cross-training lit des versions intermédiaires de la Musculation. Ce point n'est pas étudié ici.

### 2.3 Résultats avant / après

| Profil | Séances | A : séances modifiées | B : séances modifiées | Divergences R-A à la planification (réf. / A / B) | Volume hebdomadaire moyen (A, écart à la réf.) | Durée moy. / max (réf. → A) | Placements G5 / M3 |
|---|---|---|---|---|---|---|---|
| P1 | 18 | 0 | 0 | 0 / 0 / 0 | aucun écart | 51 / 62 → 51 / 62 | inchangés |
| P1b | 24 | 0 | 0 | 0 / 0 / 0 | aucun écart | 44 / 60 → 44 / 60 | inchangés |
| P2 | 18 | 0 | 0 | 0 / 0 / 0 | aucun écart | 56 / 64 → 56 / 64 | inchangés |
| **P3** | 18 | **7** | **4** | 0 / 0 / **1** | quadriceps +0,2, ischio +0,3, fessiers +0,5, mollets +0,7 | 52 / 62 → 53 / **65** | dates inchangées, **contenu M3 annulé** |
| **P5** | 18 | **2** | **2** | 0 / 0 / 0 | aucun écart | 46 / 72 → 46 / 72 | inchangés |
| S3, S4 | 18, 24 | 0 | 0 | 0 / 0 / 0 | aucun écart | inchangées | — |
| **Consolidation** | 18 | **13** | 0 | **6** / 0 / 6 | **quadriceps −2,5** (9 → 6 dès la semaine 2, plancher 10), mollets +0,7 | 52 / 61 → 51 / 61 | inchangés |

Aucune date de séance ne change : les placements G5 sont identiques dans toutes les variantes.

### 2.4 Analyse : les réductions supplémentaires sont-elles justifiées ?

**P3 — non : la variante défait l'arbitrage M3.**
- **Lundi 2 novembre, lendemain d'une simulation de course HYROX** (conflit M3 non résolu) :
  - **référence** : squat goblet 2 séries à RIR 5, tirage, développé épaules, pec deck, **39 min** ;
  - **A et B** : squat arrière 3 séries à RIR 4, leg curl, squat bulgare, mollets, **65 min**.
- **Cause :** l'arbitrage M3 (RECOMPOSE) régénère la Musculation en signalant la voisine HYROX comme **clé**, ce qui déclenche des allègements complets. La seconde passe régénère **sans** ce signal.
  - Les allègements tombent (axial : complet → RIR seul).
  - La séance garde la mention « décision M3 » alors que son contenu ne la reflète plus.
- **Effets en cascade :** l'alternance des semaines suivantes change ; la variante B crée **1 divergence R-A**.
- **Verdict : régression.** La séance devient plus lourde la veille d'une séance clé, contre une décision déjà prise.

**P5 — oui, mais au prix d'un circuit.**
- **Lundi 5 octobre :** la séance HYROX à +24 h est régénérée **après** la Musculation (ordre des dates). Son profil passe de « bas du corps élevé » à « haut du corps et préhension élevés ».
  - **Référence :** allègement genou (squat et squat bulgare à RIR 5).
  - **A et B :** allègement préhension (squat et squat bulgare à RIR 3, tractions à RIR 4).
- C'est la règle d'interférence existante, appliquée à la version finale de la voisine : **justifié**.
- **Revers :** la séance HYROX devient à son tour périmée (4 contextes HYROX). Les deux moteurs se lisent mutuellement ; aucun ordre ne garantit un point fixe.
- Le gain se limite à 2 séances sur 18, sans changement de volume.

**Consolidation — non : la variation ne vient pas de l'interférence.**
- **Variante B :** 6 régénérations, **0 séance modifiée**. La voisine qui change est le Cross-training à +72 h, sans effet sur les allègements. Les 6 divergences R-A restent.
- **Variante A :** les divergences R-A tombent à 0, mais **13 séances sur 18 changent** :
  - squat arrière remplacé par un soulevé de terre roumain ;
  - leg curl retiré ;
  - **quadriceps de 9 à 6 séries par semaine**, sous le plancher de 10.
- **Cause :** la règle C4.3, qui compte le **bloc de force du Cross-training** dans la semaine Musculation, appliquée à la version finale du bloc. Le bloc, lui, a été composé en lisant les séances de Musculation. **Dépendance circulaire.**
- C'est exactement le cas signalé dans votre consigne : la disparition des divergences R-A ne prouve rien. Le programme obtenu est moins bon.

### 2.5 Décision L2

1. **Résultats chiffrés :** § 2.3.
2. **Bénéfices attendus :** faibles. En P5, une séance sur 18 reçoit l'allègement correspondant à la voisine finale.
3. **Régressions :**
   - annulation silencieuse des décisions M3 (P3) ;
   - séance de 65 min la veille d'une séance clé ;
   - quadriceps sous le plancher (consolidation) ;
   - nouvelle divergence R-A (P3, B) ;
   - circuit Musculation ↔ HYROX non résolu.
4. **Conséquences sur les programmes existants :** aucune pour les semaines déjà planifiées (contenu persisté). Les nouvelles semaines des profils P3, P5 et Cross-training « force » changeraient.
5. **Recommandation :**
   - **ne pas intégrer** A ni B ;
   - L2 passe de P1 à **P3** ;
   - à la place, **étude ciblée L2-bis**, à autoriser : supprimer la dépendance circulaire Musculation ↔ bloc de force du Cross-training. Piste : composer le bloc après les séances de Musculation définitives, et ne pas le relire pendant la génération Musculation, ou figer l'ordre. Critère : 0 divergence R-A sur le profil de consolidation **sans** baisse des quadriceps ;
   - documenter la limite du diagnostic R-A (§ 1).

---

## 3. L1 — équilibre musculaire

### 3.1 Vérification de la comptabilisation

- **Écart du banc :** direct + indirect = bilan Strength, **écart 0 série** sur tous les profils.
- **Origine des bras au-dessus de la borne haute :** séries **directes** pour l'essentiel (P1 : 14,7 directes sur 16,8).
  - Le catalogue range le **triceps en muscle principal** des développés (couché, machine, épaules) et le **biceps en muscle principal** des tractions et du tirage vertical.
  - Chaque série de développé compte donc une série directe de bras.
  - Les isolations de bras (curl, extension) n'apparaissent presque jamais (3 séries sur 6 semaines).
- **Plafonner les séries indirectes n'est pas justifié :** elles ne pèsent que 2,1 à 2,5 séries par semaine. Même supprimées, les bras resteraient au-dessus de 14.
- **Dos sous le plancher en Full Body :**
  - un seul tirage par séance (groupe de choix « tirage » : vertical **ou** horizontal), environ 3 séries ;
  - aucune isolation du haut du corps du catalogue ne sert le dos.
  - Il faut donc un **second tirage** : une priorité ne suffit pas.

### 3.2 Variantes (surcouches de contenu, comme F6)

| Variante | Contenu |
|---|---|
| **V1 — priorité du dos** | Tirages placés avant les poussées dans `needPriority` (objectifs) et `optionalOrder` (stimuli). |
| **V2 — tirage horizontal complémentaire** | Emplacement Full Body facultatif `fb.pull_2h` (tirage horizontal, accessoire, suivi). Il hérite de la priorité du tirage horizontal (2ᵉ des facultatifs). |
| **V2b — idem, servi après le bas du corps** | Besoin distinct `pull_complement` (même exigence), placé **après** les accessoires du bas du corps et avant les mollets. |
| **V3 — moins d'isolations de poussée** | `fb.iso_upper` limité à **1** exercice (au lieu de 1 à 2). |

Haut / Bas (P1b, S4) : aucune variante ne les touche. Ce sont des emplacements Full Body ; leurs chiffres sont identiques à la référence.

### 3.3 Résultats (séries par semaine, moyenne sur 6 semaines)

Légende : ↓n = n semaines sous le plancher ; ↑n = n semaines au-dessus de la borne haute. Bornes : dos 10–20, bras 6–14, épaules 8–16, pectoraux 10–20, quadriceps 10–18, ischio-jambiers 8–14, fessiers 6–14, mollets 4–10.

**P1 — Musculation 3× (masse) + Course 2× (10 km)**

| Variante | Dos | Poussée / tirage | Bras | Épaules | Pectoraux | Quadriceps | Ischio | Fessiers | Mollets | Durée moy. / max | Similarité |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence | 9,2 ↓5 | 21 / 9,2 (2,28) | 16,8 ↑6 | 15,5 ↑3 | 14,3 | 7,2 ↓6 | 8,5 ↓2 | 11,5 | 1,3 ↓4 | 51 / 62 | 0,16 |
| V1 priorité dos | 9,3 ↓4 | 20,8 / 9,3 (2,24) | 16,8 ↑6 | 15,4 ↑3 | 14,2 | 7,2 ↓6 | 8,5 ↓2 | 11,5 | 1,3 ↓4 | 51 / 62 | 0,16 |
| V3 une isolation haut | 9,2 ↓5 | 18,3 / 9,2 (1,99) | 16,3 ↑6 | 13,6 | 13,7 | 7,5 ↓5 | 8,5 ↓2 | 11,8 | 1,3 ↓4 | 50 / 63 | 0,17 |
| V2+V3 tirage compl. (prioritaire) | 15,2 | 18,3 / 15,2 (1,2) | 21,3 ↑6 | 14,3 | 13,8 | 7,5 ↓5 | 8,5 ↓2 | 11,8 | 1,3 ↓4 | 53 / 63 | 0,35 |
| V2b+V3 tirage compl. (après le bas) | 14,8 | 18,3 / 14,8 (1,24) | 21,1 ↑6 | 14,3 | 13,7 | 7,5 ↓5 | 8,5 ↓2 | 11,8 | 1,3 ↓4 | 54 / 72 | 0,35 |

**P2 — Musculation 3× (masse) + Cross-training 2×**

| Variante | Dos | Poussée / tirage | Bras | Épaules | Pectoraux | Quadriceps | Ischio | Fessiers | Mollets | Durée moy. / max | Similarité |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence | 9,3 ↓4 | 20,5 / 9,3 (2,2) | 16,4 ↑6 | 15,5 ↑2 | 14,3 | 10,8 ↓3 | 11,2 | 14,8 ↑5 | 2,7 ↓2 | 56 / 64 | 0,23 |
| V1 priorité dos | 9,5 ↓3 | 20,3 / 9,5 (2,14) | 16,4 ↑6 | 15,5 ↑2 | 14,2 | 10,8 ↓3 | 11,2 | 14,8 ↑5 | 2,7 ↓2 | 56 / 64 | 0,23 |
| V3 une isolation haut | 9,3 ↓4 | 18,3 / 9,3 (1,97) | 16,4 ↑6 | 13,7 | 13,7 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 3,3 ↓1 | 56 / 64 | 0,24 |
| V2+V3 tirage compl. (prioritaire) | 15,2 | 18,3 / 15,2 (1,2) | 21,3 ↑6 | 14,3 | 13,8 | 10,3 ↓3 | 11,7 | 14,8 ↑5 | 1,3 ↓4 | 57 / 64 | 0,41 |
| V2b+V3 tirage compl. (après le bas) | 14,2 | 18,3 / 14,2 (1,29) | 20,8 ↑6 | 11,8 | 13,7 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 1,3 ↓4 | 57 / 64 | 0,39 |

**P3 — Musculation 3× (masse) + HYROX 2×**

| Variante | Dos | Poussée / tirage | Bras | Épaules | Pectoraux | Quadriceps | Ischio | Fessiers | Mollets | Durée moy. / max | Similarité |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence | 9 ↓5 | 20,7 / 9 (2,3) | 16,5 ↑6 | 15,4 ↑2 | 13,8 ↓1 | 9,3 ↓4 | 9,3 ↓1 | 12,5 | 0,7 ↓5 | 52 / 62 | 0,17 |
| V1 priorité dos | 9,2 ↓4 | 20,5 / 9,2 (2,23) | 16,5 ↑6 | 15,3 ↑2 | 13,7 ↓1 | 9,3 ↓4 | 9,3 ↓1 | 12,5 | 0,7 ↓5 | 52 / 62 | 0,17 |
| V3 une isolation haut | 9 ↓5 | 17,8 / 9 (1,98) | 16 ↑6 | 13,5 | 13,2 ↓1 | 9,2 ↓4 | 9,8 ↓1 | 12,8 ↑1 | 0,7 ↓5 | 51 / 63 | 0,18 |
| V2+V3 tirage compl. (prioritaire) | 14,3 | 18,3 / 14,3 (1,28) | 20,4 ↑6 | 14,3 | 13,8 | 7,8 ↓5 | 9,3 ↓1 | 11,3 | 0 ↓6 | 51 / 64 | 0,35 |
| V2b+V3 tirage compl. (après le bas) | 13,3 | 18,3 / 13,3 (1,38) | 19,9 ↑6 | 11,8 | 13,7 | 8,2 ↓5 | 9,3 ↓1 | 11,7 ↑1 | 0 ↓6 | 51 / 64 | 0,33 |

**P5 — Quatre sports : Musculation 3×, Course 2×, Cross-training 1×, HYROX 1×**

| Variante | Dos | Poussée / tirage | Bras | Épaules | Pectoraux | Quadriceps | Ischio | Fessiers | Mollets | Durée moy. / max | Similarité |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence | 9,3 ↓4 | 19 / 9,3 (2,04) | 16 ↑6 | 16,6 ↑3 | 9,8 ↓3 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 46 / 72 | 0,06 |
| V1 priorité dos | 9,5 ↓3 | 18,8 / 9,5 (1,98) | 16 ↑6 | 16,5 ↑3 | 9,7 ↓3 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 46 / 72 | 0,06 |
| V3 une isolation haut | 9,3 ↓4 | 18,3 / 9,3 (1,97) | 16 ↑6 | 14,3 | 13,2 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 46 / 70 | 0,16 |
| V2+V3 tirage compl. (prioritaire) | 14,8 | 18,5 / 14,8 (1,25) | 20,9 ↑6 | 14,7 | 13,5 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 50 / 72 | 0,37 |
| V2b+V3 tirage compl. (après le bas) | 14,8 | 18,3 / 14,8 (1,24) | 20,9 ↑6 | 14,7 | 13,2 | 4,3 ↓5 | 4,3 ↓5 | 7,5 | 0,7 ↓5 | 49 / 72 | 0,38 |

**S3 — Musculation 3× seule**

| Variante | Dos | Poussée / tirage | Bras | Épaules | Pectoraux | Quadriceps | Ischio | Fessiers | Mollets | Durée moy. / max | Similarité |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Référence | 9,5 ↓3 | 19,2 / 9,5 (2,02) | 16,2 ↑6 | 15 | 13,5 | 10,8 ↓3 | 11,2 | 14,8 ↑5 | 0,7 ↓5 | 53 / 64 | 0,23 |
| V1 priorité dos | 9,7 ↓2 | 19 / 9,7 (1,96) | 16,2 ↑6 | 14,9 | 13,3 | 10,8 ↓3 | 11,2 | 14,8 ↑5 | 0,7 ↓5 | 53 / 64 | 0,23 |
| V3 une isolation haut | 9,5 ↓3 | 18 / 9,5 (1,89) | 16,2 ↑6 | 14,1 | 12,8 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 1,3 ↓4 | 53 / 63 | 0,24 |
| V2+V3 tirage compl. (prioritaire) | 15,2 | 18,5 / 15,2 (1,22) | 21,3 ↑6 | 14,7 | 13,5 | 10,5 ↓3 | 11,2 | 14,5 ↑5 | 0 ↓6 | 54 / 64 | 0,41 |
| V2b+V3 tirage compl. (après le bas) | 13,8 | 18,3 / 13,8 (1,33) | 18,6 ↑6 | 14,2 | 13,2 | 10,7 ↓3 | 11,7 | 15,2 ↑6 | 0,7 ↓5 | 54 / 64 | 0,3 |

**Lecture :**
- **V1** ne change presque rien : +0,1 à +0,2 série de dos. Le groupe de choix impose un seul tirage.
- **V3** supprime tous les dépassements des épaules (P1 : ↑3 → 0 ; P5 : ↑3 → 0). Elle réduit la poussée de 2 à 3 séries. Pectoraux : −0,5 à −0,7 (12,8 au plus bas, plancher 10), sauf P5 (+3,4). Aucune autre baisse > 0,5 et aucun groupe ne passe sous son plancher. Les mollets gagnent un peu en P2 et S3.
  - **Limite :** le pec deck reste présent dans 16 à 17 séances sur 18 (B3 de l’audit). C'est l'élévation latérale qui disparaît.
- **V2 + V3** et **V2b + V3** ramènent le dos à **0 semaine sous le plancher** sur les 5 profils Full Body : 13,3 à 15,2 séries, contre 9 à 9,5. Le rapport poussée / tirage passe à **1,2–1,4**.
- **Régressions de V2 / V2b :**
  - **Bras :** +4 à +5 séries, sur 6 semaines sur 6 au-dessus de la borne haute. Avec un tirage horizontal servi à part, le groupe « tirage » choisit presque toujours les **tractions** (biceps principal).
  - **Bas du corps :**
    - P3 : quadriceps −1,1 à −1,5, fessiers −0,8 à −1,2, mollets 0,7 → 0 ;
    - P2 : mollets 2,7 → 1,3 ;
    - S3 : mollets 0,7 → 0 avec V2 + V3.
    - V2b protège mieux le bas du corps en P1 et S3, mais pas en P3. Les mollets, à temps résiduel, perdent le temps restant.
  - **Variété :** similarité entre séances consécutives 0,16 → 0,35 (P1), 0,23 → 0,41 (P2). Tractions et tirage à la poulie reviennent **à chaque séance**.
  - **Durée :** +1 à +3 min en moyenne ; P1 V2b, maximum 72 min (62 en référence). Aucun dépassement du temps disponible.
- **Continuité (toutes variantes) :** aucun retour en calibration, aucune baisse de charge. Le tirage complémentaire crée une progression nouvelle.

### 3.4 Sensibilité du comptage des bras (analyse, **pas un correctif**)

- **Calcul :** triceps et biceps comptés comme muscles **secondaires** des développés et tirages (× 0,5), sans rien changer au moteur.
- **Résultat :** les bras tombent à **9 à 10 séries** en référence (12 au plus avec V2b + V3), dans la plage 6–14.
- **Conclusion :** l'alerte « bras au-dessus de la borne haute » est d'abord une **propriété du catalogue**, pas un excès d'isolations de bras.
- **Conformément à votre consigne, ce n'est pas proposé comme correctif.** Changer cette attribution changerait la définition de l'indicateur.
- **Ce qui relève de votre décision :**
  - (a) garder l'attribution actuelle, et accepter que les bras restent au-dessus de 14 en Full Body et Haut / Bas, quoi qu'on fasse ;
  - (b) faire relire le catalogue (contenu `draft`, non relu) par un référent, avec une justification documentée ;
  - (c) relever la borne haute des bras pour tenir compte des polyarticulaires.

### 3.5 Décision L1

1. **Résultats chiffrés :** § 3.3.
2. **Bénéfices attendus :**
   - **V3 :** épaules dans la plage, moins de poussée redondante, durée inchangée ;
   - **V2 / V2b :** dos au plancher et équilibre poussée / tirage nettement meilleur. Bénéfice postural et de prévention de l'épaule souvent recherché en hypertrophie.
3. **Régressions possibles :**
   - **V3 :** pectoraux −0,5 à −0,7 série, toujours au-dessus du plancher ; rien d'autre au-delà de 0,5 ;
   - **V2 / V2b :** bras +4–5, mollets et quadriceps en baisse (P2, P3), variété en baisse (tractions et tirage à chaque séance), séances plus longues.
4. **Conséquences sur les programmes existants :**
   - contenu **versionné** (registre F6) : les séances déjà planifiées gardent leur version et restent régénérables ;
   - seules les nouvelles semaines changent ;
   - V2 ajoute une progression « tirage complémentaire » nouvelle (calibration à la première exposition) ;
   - V3 retire l'élévation latérale de la plupart des séances : sa progression s'arrête, sans perte de charge.
5. **Recommandation :**
   - **V3 : intégrer** après accord, en contenu versionné, avec le banc L0 en critère : épaules ≤ borne haute, aucun groupe sous son plancher, aucune baisse > 0,7 ;
   - **V2 / V2b : ne pas intégrer en l'état.** Étude complémentaire **L1-bis**, à autoriser :
     - groupe de choix pour le tirage complémentaire, afin d'alterner vertical et horizontal et de ne pas toujours garder les tractions ;
     - ordre de remplissage qui protège mollets et quadriceps ;
     - critère : dos ≥ plancher 5 semaines sur 6, aucune autre baisse > 0,5, similarité ≤ 0,25 ;
   - **comptage des bras :** décision (a), (b) ou (c) du § 3.4 avant tout critère « bras ≤ borne haute ».
   - **V1 : abandonner** (effet nul).

---

## 4. Décisions attendues

| # | Question | Recommandation |
|---|---|---|
| D-L2 | Intégrer la seconde passe A ou B ? | **Non.** Autoriser l'étude **L2-bis** (dépendance circulaire Musculation ↔ bloc de force Cross-training). |
| D-L1-a | Intégrer V3 (une isolation du haut du corps en Full Body) ? | **Oui**, en contenu versionné. |
| D-L1-b | Tirage complémentaire (V2 / V2b) ? | **Étude L1-bis** avant toute intégration. |
| D-L1-c | Comptage des bras ? | Choisir (a), (b) ou (c), § 3.4. |
| D-L1-d | Priorité du dos (V1) ? | **Abandonner.** |

Aucun moteur sportif ne sera modifié avant ces décisions.

---

## Annexe — reproduction

- **Patchs jetables :** `docs/kairo/rc46-audit/etudes/l2-seconde-passe-planificateur.patch` et `l1-surcouche-contenu.patch`. Ils s'appliquent sur `7a8845f`.
- **Tests d'étude :** `l2.test.ts.txt` et `l1.test.ts.txt`, à copier dans `packages/app-core/tests/rc46study/`.
- **Exécution :**
  - L2 : `L2_VARIANT=ref|after|interf` et `L2_OUT=<dossier>`, puis `npx vitest run tests/rc46study/l2.test.ts` dans `packages/app-core` ;
  - L1 : `L1_VARIANT=ref|prio|iso1|pull2|pull2hv|pull2late`, combinables avec `+`.
- **Comparaison :** `l2cmp.py <dossier>` et `l1cmp.py <dossier> ref,iso1,...`.
