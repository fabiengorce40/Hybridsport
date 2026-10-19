# REKKA — RC4.4 : audit de conception (F9, F10, F11 et récupération)

Base : `claude/kairo-rc4-dev` à **b8e312b** (RC4.3 compris).

Ce lot est un audit et des simulations seulement :
- aucune règle sportive n'est modifiée ;
- aucune fusion, aucun déploiement.

Les variantes ont été mesurées dans une **copie jetable** du dépôt. Elles étaient activées par des variables d'environnement, n'ont pas été commitées, et la copie a été supprimée.

**Banc :** les 6 profils RC4, sur 6 semaines, par le chemin Beta 0 réel (`rc4-sim.ts`) :
- ressenti « comme prévu » ;
- courses libres de P1 (samedi S2) et P4 (dimanche S3).

---

## 1. Anomalies reproduites et gravité

Statu quo (V0), mesuré sur le banc. « J/J+1 durs » : deux séances exigeantes à moins de 24 h, même définition que l'audit RC4.

| # | Gravité | Profil | Constat mesuré (6 semaines) |
|---|---|---|---|
| **F10** | **P1** | P5 (4 sports) | **0 jour de repos** chaque semaine ; **7 jours consécutifs** ; 29 enchaînements durs à J/J+1 ; 26 conflits M3 laissés en place |
| F10 | P1 | P1b (Muscu 4× + Course 2×) | 1 jour de repos par semaine ; jusqu'à **6 jours consécutifs** (S1), 5 ensuite ; 23 enchaînements durs |
| **F9** | P2 | P1, P2, P3 | Deux Musculations Full Body à **J et J+1** chaque semaine, alors qu'un jour libre existe. P1 : 6 cas ; P2 : 12 cas (dont CT samedi et dimanche) ; P3 : 11 cas |
| F9 | P2 | P1b | 12 séances du même sport à J/J+1 (haut/bas : attendu pour un split, mais le bas du corps suit une course) |
| **F11** | **P1** | P5, P4, P3 | Conflits M3 **détectés mais non résolus** : P5 26, P4 11, P3 2. Aucun jour libre pour déplacer, ou aucune action admise. |
| F11 | P2 | tous | L'interférence cardiovasculaire (`high_intensity_systemic`) n'est **pas** évaluée (§2) |

---

## 2. Règles actuelles du planificateur (lues dans le code)

| Règle | Source | Valeur Beta 0 | Effet réel |
|---|---|---|---|
| Une séance par jour au plus | `planner.ts` (placement) | — | Le nombre de séances demandées remplit les jours disponibles ; **aucun jour de repos n'est réservé**. |
| Ordre de placement | Demandes en **tour de rôle** selon la priorité déclarée (1re séance de chaque sport, puis 2e…) | — | Les dernières séances des sports les moins prioritaires passent en dernier. |
| Choix du jour | Jour libre le **plus éloigné** des séances déjà placées, puis le plus tôt | — | Placement glouton, sans notion d'enchaînement ni de jours consécutifs. |
| **G4** : interférence entre sports | `planner.interference.structureWindows` | **24 h** pour les 8 structures (TEST_ONLY) | Conflit seulement si l'écart est **< 24 h**. Deux jours consécutifs sont à 24 h : **G4 ne s'applique donc jamais** en Beta 0 (une séance par jour). |
| Même discipline | `SAME_DISCIPLINE_UNGOVERNED` | Aucune fenêtre gouvernée | **Signalement** non bloquant, jamais appliqué (`same_discipline_recovery` est une capacité bloquée de Strength). |
| **M3** : paires entre sports | `planner.m3.pairRules` | Niveau `high` sur genou, hanche, impact, axial, préhension ; **48 h** (TEST_ONLY) | Détecte les paires J/J+1 ; MOVE, SWAP ou RECOMPOSE si possible, sinon conflit **visible mais laissé**. |
| M3 : accumulation | `planner.m3.accumulationRules` | Plus de 2 séances `high` en 72 h, bas du corps et impact (TEST_ONLY) | Idem. |
| M3 : cardiovasculaire | `high_intensity_systemic` **exclu** des paires | — | Presque toute séance y est `high` avec la normalisation TEST_ONLY ; l'inclure « saturerait » les semaines (§4.3). |
| Voisines (historique) | `recentOf` + `planner.m3.historyStatuses` | Semaine précédente ; réalisées et abandonnées | **RC4.3** : courses libres datées et effectuées incluses comme réalisées ; course d'onboarding sans date exclue. |
| Interférence côté Musculation | `strength.interference` + `.assessment` (candidat 4E) | Recherche sur 72 h ; bandes ≤ 12 h, ≤ 24 h, ≤ 48 h ; actions NONE → `trace` → `rir_only` → `full` → `full_and_signal` | **Le seul mécanisme qui agit réellement** sur J/J+1 : réduction de séries, RIR et besoins facultatifs de la séance de Musculation. |

---

## 3. Solutions possibles et effets sur les six profils

| Variante | Règle (expérimentale) |
|---|---|
| **V0** | Statu quo |
| **V1** | **Préférence** : éviter un même sport (Musculation, HYROX, CT) à J+1, et plus de 3 jours consécutifs, si un autre jour existe. Aucune séance retirée. |
| **V2** | **Contrainte** : au moins 1 jour de repos par semaine, au plus 4 jours consécutifs (semaine précédente comprise), plus la préférence V1. Une séance qui ne rentre pas est **non placée** (prescription conservée, réalisable manuellement, M3.1). |
| **V3** | **Contrainte forte** : au moins 2 jours de repos, au plus 3 jours consécutifs, plus la préférence V1. |
| **V4** | `high_intensity_systemic` ajouté aux paires M3 (F11). |
| **V5** | V2 + V4. |

### Résultats (6 semaines)

| Profil | Variante | Repos min. / moy. | Consécutifs max. | J/J+1 durs | Même sport J+1 | Non placées | M3 initiaux / décisions / restants | Volume Musculation (quadriceps · ischio-jambiers · pectoraux, séries/sem.) | Course S6 |
|---|---|---|---|---|---|---|---|---|---|
| P1 | V0 | 2 / 2,0 | 4 | 16 | 6 | 0 | 1 / 1 / 0 | 3,7 · 5,3 · 14,3 | seuil 5×5, footing 33 min |
| P1 | V1 | 2 / 2,0 | 4 | **6** | **0** | 0 | 1 / 1 / 0 | 3,3 · 4,2 · **10,8** | inchangée |
| P1 | V2 | 2 / 2,0 | 4 | 6 | 0 | 0 | 1 / 1 / 0 | 3,3 · 4,2 · 10,8 | inchangée |
| P1 | V3 | 2 / 2,0 | 3 | 6 | 0 | 0 | 1 / 0 / 2 | 3,2 · 3,5 · 10,8 | inchangée |
| P1b | V0 | 1 / 1,0 | **6** | 23 | 12 | 0 | 3 / 0 / 6 | 9,2 · 8,2 · 12,3 | seuil 5×5 |
| P1b | V1 | 1 / 1,0 | 4 | 17 | 5 | 0 | 8 / 0 / 16 | **4,2 · 4,8** · 12,3 | inchangée |
| P1b | V2 | 1 / 1,5 | 4 | 13 | 4 | **3 Muscu** | 5 / 0 / 10 | 3,5 · 3,8 · 12,3 | inchangée |
| P1b | V3 | 2 / 2,0 | 3 | 8 | 2 | **6 Muscu** | 4 / 2 / 4 | 2,7 · 2,8 · 12,3 | inchangée |
| P2 | V0 | 2 / 2,0 | 2 | 12 | **12** | 0 | 30 / 6 / 0 | 10,8 · 11,2 · 14,3 | — |
| P2 | V1–V3 | 2 / 2,0 | 2 | 12 | **0** | 0 | 9–10 / 0 / **18–20** | 10,8 · 11,2 · 13,8 | — |
| P3 | V0 | 2 / 2,0 | 4 | 13 | 11 | 0 | 33 / 7 / 2 | 8,3 · 8,8 · 14,3 | — |
| P3 | V1 | 2 / 2,0 | 3 | 14 | 3 | 0 | 24 / 5 / **20** | 8,3 · 8,5 · 13,8 | — |
| P3 | V2 | 2 / 2,0 | 3 | 13 | 1 | 0 | 23 / 2 / **29** | 7,8 · 7,7 · 13,8 | — |
| P4 | V0 | 2 / 2,0 | 4 | 6 | 4 | 0 | 46 / 4 / 11 | — | seuil 6×5, footings 35 min |
| P4 | V1–V3 | 2 / 2,0 | **2** | 6 | 0–1 | 0 | 21–27 / 1 / 28–29 | — | inchangée |
| P5 | V0 | **0** / 0,0 | **7** | 29 | 0 | 0 | 14 / 1 / 26 | 4,3 · 4,3 · 9,8 | seuil 5×5, footing 33 min |
| P5 | V1 | 0 / 0,0 | 7 | 29 | 6 | 0 | 8 / 0 / 16 | 3,7 · 4,5 · 9,8 | séances inversées (footing puis seuil) |
| P5 | V2 | **1** / 1,3 | **4** | **18** | 0 | **8** (Muscu et Course) | 8 / 0 / 16 | 4,7 · 5,2 · 8,8 | **seuil 4×5** (progression ralentie) |
| P5 | V3 | 2 / 2,0 | 3 | 12 | 0 | **12** | 12 / 2 / 19 | 5,3 · 5,7 · 10,2 | **plus de seuil en S6** |
| tous | V4 | = V0 | = V0 | = V0 | = V0 | 0 | conflits initiaux ×1,3 à ×2 ; restants ×1,5 à ×2 | = V0 | = V0 |

### Lecture

1. **F9 (V1, préférence) :** l'espacement d'un même sport supprime les Full Body à J+1 (P1, P2 : 0) **sans retirer de séance**. En contrepartie, la Musculation se rapproche d'une **autre** discipline :
   - P1 : le volume de Musculation prévu baisse (pectoraux 14,3 → 10,8, quadriceps 3,7 → 3,3 séries par semaine ; réductions d'interférence 45 → 49). Les quadriceps baissent sous l'effet de la course voisine. Pour les pectoraux, la cause n'est pas l'interférence, qui ne touche que le bas du corps : c'est la recomposition des séances sur d'autres jours (ordre A/B, besoins), non analysée en détail ici.
   - P2 et P3 : les conflits M3 restants passent de 0–2 à **18–29**, car Musculation et CT/HYROX deviennent voisins.

   **Espacer un sport fait mécaniquement voisiner les autres** quand les jours disponibles manquent.
2. **F10 :**
   - **la préférence seule (V1) ne protège pas P5** : 7 jours sur 7, car 7 séances pour 7 jours ;
   - **la contrainte V2** garantit au moins 1 jour de repos et au plus 4 jours consécutifs, mais 8 séances de P5 sur 6 semaines deviennent **non placées** (réalisables manuellement), et la progression du seuil est **ralentie** (4×5 au lieu de 5×5 en S6) ;
   - **V3** coûte 12 séances à P5 et fait perdre le seuil en S6 ; P1b perd 6 Musculations.
3. **F11 (V4) :** ajouter le cardiovasculaire aux paires M3 ne **déplace rien**. La structure est `high` presque partout (normalisation TEST_ONLY non discriminante) : on multiplie les signalements sans information exploitable. **Ce n'est pas une solution** tant que la normalisation de la demande cardiovasculaire n'est pas gouvernée.
4. **Volume :** toutes les variantes qui éloignent les séances du même sport, ou en retirent, **baissent** le volume de Musculation prévu (P1b, quadriceps : 9,2 → 3,5–4,2). En cause : soit davantage d'interférence avec la course voisine, soit des séances non placées. Le bas du corps, déjà sacrifié (F4), l'est davantage.

---

## 4. Analyse par objectif

### 4.1 Jours de repos et enchaînements (objectifs 1 et 2)
- **Aucun paramètre n'existe** pour un repos minimal ou des jours consécutifs maximaux. Le choix est **sportif** (D1).
- Recommandation de mécanisme, **sans valeur choisie** : une contrainte gouvernée `planner.recovery.weekStructure` = { jours de repos minimum, jours consécutifs maximum, mode `constraint` ou `warning` }.
  - Le planificateur l'applique au placement **et** aux déplacements M3 (vérifié : sinon, un MOVE peut remplir le jour de repos).
  - Les séances qui ne rentrent pas restent **composées, non placées**, réalisables manuellement (M3.1), avec un motif explicite. Ordre de sacrifice : le tour de rôle actuel (priorité déclarée), donc les dernières séances des sports les moins prioritaires.
- **Alternative sans retrait :** mode `warning`. La semaine reste pleine, mais un avertissement de semaine est affiché (« 7 jours d'entraînement sur 7 : aucune journée de récupération ») et l'utilisateur peut réduire sa fréquence.

### 4.2 Même sport à J+1 (F9)
- Préférence V1 (§3), utile pour Full Body, HYROX et CT ; **sans effet** sur un split haut/bas (P1b), où J+1 est attendu.
- **Risque mesuré :** davantage de voisinage entre sports et de baisse de volume. À combiner avec la décision D3 (seuils M3) ; à accepter **ou** à n'activer qu'en Musculation Full Body.

### 4.3 Interférences Course, Musculation, HYROX, Cross-training (objectif 3)
| Paire | Ce qui agit aujourd'hui | Limite |
|---|---|---|
| Course → Musculation | Interférence Musculation (assessment 4E) : `rir_only`, `full`, `full_and_signal` | Agit, mais réduit le volume (F4) sans compensation au démarrage |
| Musculation → Course | Aucune règle côté Course | Un seuil le lendemain d'un Full Body n'est pas modulé |
| HYROX / CT ↔ Musculation | M3 (bas du corps, préhension, axial), voisines transmises à CT et HYROX | CT/HYROX tombent souvent samedi et dimanche ; conflits restants quand aucun jour n'est libre |
| CT / HYROX → Course de qualité | Aucune (cardiovasculaire exclu) | Signalé seulement si le contenu CT touche le bas du corps (S3/S5 contre S2/S4/S6) |
| Courses libres (RC4.3) | Voisines réalisées (planification) ; régénération au démarrage | Les courses libres de la **semaine en cours** n'entrent pas dans le compte des jours de repos ou consécutifs (la semaine n'est pas recomposée) ; elles comptent dès la semaine suivante (historique). |

### 4.4 Avertissements musculaires non bloquants (objectifs 4 et 5)
**Seuils proposés, sans nouvelle valeur.** Trois sources **existantes** (toutes candidates ou TEST_ONLY, aucune approuvée) :

| Option | Déclencheur | Source | Remarque |
|---|---|---|---|
| A (recommandée) | Le moteur Musculation **allégerait** la séance à cause d'une voisine (action `full` ou `full_and_signal` de `strength.interference.assessment`) | Moteur Musculation, déjà calculé | Cohérent avec la prescription ; Musculation seulement |
| B | Paire M3 : même structure à niveau `high` dans **48 h** | `planner.m3.pairRules` (TEST_ONLY) | Tous sports ; valeur de démonstration |
| C | Accumulation M3 : plus de 2 séances `high` en **72 h** (bas du corps, impact) | `planner.m3.accumulationRules` (TEST_ONLY) | Tous sports |

- **Données :** structures et niveaux de demande dérivés par le CORE pour les séances **réalisées** (programme, courses libres datées, séances non placées faites manuellement). Les 8 structures du CORE servent de « groupes musculaires » ; aucune nouvelle taxonomie.
- **« Maintenir quand même » :** le choix est enregistré avec la séance (provenance), puis la séance démarre **telle que prévue** (ou allégée si l'utilisateur le préfère).
  - ⚠ Pour persister ce choix, il faut un **nouveau champ ou une nouvelle valeur de décision** (`CHECKIN_DECISIONS` est une énumération stricte), donc une migration et une mise à jour du repli : **à présenter avant implémentation**, comme pour M1.

### 4.5 Situations bloquantes et non bloquantes

| Situation | Statut proposé | Aujourd'hui |
|---|---|---|
| Pause douleur active, règle G1 (P4, interruption) | **Bloquant**, jamais contournable | Bloquant |
| Refus du moteur (sécurité, niveau, reprise, matériel), qualité BLOCKED | **Bloquant** | Bloquant |
| Séance hors de la semaine courante | Bloquant (règle produit) | Bloquant |
| Séance non placée faite manuellement, conflit d'interférence M3/G4 | **Avertissement + maintien volontaire** (REKKA n° 2) | **Bloquant** (`MANUAL_START_INTERFERENCE`) : à changer, décision D5 |
| Muscles récemment sollicités (§4.4) | Avertissement + maintien volontaire | Absent |
| Semaine sans repos, jours consécutifs, même sport J+1 | Avertissement de semaine (planning) | Signalement technique seulement |
| Conflit M3 non résolu | Avertissement sur la séance (déjà persisté) | Persisté, peu visible |

### 4.6 Compensation du volume après une séance allégée (objectif 7)
**Mesuré :** P2, 90 min de course libre la veille du lundi, semaine S2.

| Groupe | Sans course | Avec course | Compensation |
|---|---|---|---|
| Ischio-jambiers | 12 séries | 11 | partielle : lundi −4, jeudi +3 |
| Fessiers | 15 | 12 | aucune |
| Quadriceps | 9 | 7 | aucune ; déjà « réduit par contrainte » |

- **À la planification seulement :** le moteur Musculation lit les séances placées plus tôt (`weekSessions`) et ajuste les suivantes. Il n'y a aucune compensation pour un allègement **au démarrage** (contrôle pré-séance, course libre RC4.3), car les séances suivantes sont déjà persistées.
- **Options :**
  - (a) pas de compensation (statu quo, prudent) ;
  - (b) régénérer les séances restantes de la semaine après un allègement : coût, reproductibilité, risque de surcompensation sur un jour voisin d'une course ;
  - (c) afficher le déficit sans le compenser.

  Décision D6.

### 4.7 HYROX au démarrage (objectif 8)
- **Cause actuelle :** `REGENERABLE` exclut HYROX parce que « la station n'est pas persistée » dans la requête du planificateur. Or elle **est** persistée dans l'intention de semaine du programme (`programmeState.weeks[].intent.demands[hyrox].station`, déjà lue à l'enregistrement d'un résultat).
- **Mesure** (copie jetable : station lue depuis le programme, HYROX ajouté aux sports régénérables) : **15 séances HYROX sur 15 régénérées à l'identique** (P3, P4, P5, S1–S3). Le démarrage HYROX devient donc évaluable : contrôle pré-séance (douleur, fatigue) et courses libres récentes.
- **Limite :** avec 90 min de course libre la veille, le moteur HYROX H2 **ne modifie pas** la séance (`FREE_RUN_RECOVERY_NO_CHANGE`). Il reçoit les voisines mais ne les applique pas à la dose. Le bénéfice réel tient au contrôle pré-séance ; une adaptation à la charge relèverait d'une règle HYROX (gouvernance H2), hors RC4.4.

### 4.8 Courses libres RC4.3 (objectif 6)
| Point | Vérification |
|---|---|
| Course libre datée de la semaine précédente | Voisine réalisée à la planification (M3 historique, interférence Musculation) ; P2 testé (`running@-24h`) |
| Course d'onboarding sans date | Jamais comptée |
| Course libre de la semaine en cours | Évaluée au démarrage (Musculation, CT) ; **HYROX** seulement si §4.7 est retenu |
| Compte des jours de repos et consécutifs | Elle entre dans l'historique dès la semaine suivante (vérifié en V2 : l'historique est lu). Pour la semaine en cours, il faut un avertissement à la saisie : « vous avez déjà 6 jours d'entraînement cette semaine ». |

---

## 5. Conséquences sur la progression et la récupération

| Mesure | Récupération | Progression |
|---|---|---|
| Repos garanti (contrainte) | Jours de repos garantis ; enchaînements durs P5 29 → 18 | **Ralentie** : séances non placées (P5 : seuil 4×5 au lieu de 5×5 en S6 ; P1b : −3 Musculations) ; ancres Course moins fréquentes |
| Préférence même sport | Moins de Full Body à J+1 | Volume Musculation prévu plus bas (P1 : quadriceps −0,4 sous l'effet de la course voisine ; pectoraux −3,5 par recomposition des séances, cause à analyser) |
| Avertissements + maintien | Choix informé, aucune séance retirée | Inchangée si maintenue ; un maintien répété sous fatigue n'est pas « tolérance démontrée » si le ressenti est mauvais (règles existantes) |
| Compensation (b) | Risque de surcompensation | Volume hebdomadaire mieux tenu |
| HYROX régénérable | Douleur et fatigue prises en compte au démarrage | Aucune (H2 sans règle de charge) |

---

## 6. Décisions sportives nécessitant votre accord

| # | Décision | Options | Recommandation |
|---|---|---|---|
| **D1** | Repos hebdomadaire et jours consécutifs | (a) contrainte (valeurs à fixer : V2 = 1 jour de repos et 4 consécutifs ; V3 = 2 et 3) ; (b) avertissement seul ; (c) contrainte seulement au-delà de N séances demandées | (b) d'abord, ou (a) avec V2 si vous acceptez des séances non placées pour P5 et P1b |
| **D2** | Même sport à J+1 | Préférence pour Full Body, HYROX et CT ; ou aucune | Préférence, Musculation Full Body seulement (le split haut/bas n'est pas concerné) |
| **D3** | Seuils M3 et cardiovasculaire | Garder le cardiovasculaire exclu ; gouverner une normalisation cardiovasculaire (prérequis) ; valider les fenêtres 48 h et 72 h aujourd'hui TEST_ONLY | Exclu, tant qu'une normalisation n'est pas gouvernée |
| **D4** | Source des avertissements musculaires | A (moteur Musculation), B (paires M3 48 h), C (accumulation 72 h) | A pour la Musculation, puis B si D3 est validée |
| **D5** | Démarrage manuel en conflit d'interférence | Blocage actuel → avertissement + maintien | Avertissement + maintien ; sécurité toujours bloquante |
| **D6** | Compensation après allègement au démarrage | (a) aucune ; (b) régénération des séances restantes ; (c) affichage du déficit | (a) + (c) |
| **D7** | Persistance du « maintien volontaire » | Nouvelle valeur de décision ou nouveau champ ; migration et repli à présenter | À présenter avant implémentation |
| **D8** | HYROX au démarrage | Régénération avec la station du programme | Oui (15/15 identiques), sans règle de charge HYROX nouvelle |

---

## 7. Critères de validation et de non-régression (pour l'implémentation)

| Critère | Attendu |
|---|---|
| F10 (si D1a) | P5 : au moins N jours de repos, au plus K jours consécutifs, chaque semaine ; séances non placées listées avec leur motif et réalisables manuellement |
| F10 (si D1b) | Avertissement de semaine sur P5 et P1b ; aucune séance retirée ; matrice identique hors avertissement |
| F9 (si D2) | P1, P2, P3 : 0 Full Body à J+1 quand un jour libre existe ; P1b inchangé |
| Avertissements (D4, D5) | Déclenchés uniquement par la source choisie (aucune valeur nouvelle) ; « maintenir » enregistré ; aucun avertissement ne lève une pause douleur, un refus du moteur ou une qualité BLOCKED (tests adverses) |
| Courses libres | Une course libre datée récente déclenche l'avertissement ; la course d'onboarding sans date jamais |
| HYROX (D8) | Séances HYROX planifiées régénérées à l'identique (banc) ; douleur au démarrage ⇒ adaptation ou report ; aucune station inventée |
| Non-régression | Profils non concernés : matrice RC4 identique ; RC4.1–RC4.3 inchangés (F1, F2, F3) ; `pnpm check`, builds, E2E ; garde Running/Strength sans nouvel élargissement |
| Persistance | Aucun champ nouveau sans migration validée ; repli RC1 mis à jour et testé sur un état réel si un champ est ajouté |
| Gouvernance | Toute nouvelle valeur (repos, consécutifs, fenêtres) déclarée comme paramètre gouverné (TEST_ONLY), jamais une constante dans le code |

---

## 8. Décisions retenues (2026-10-19)

| # | Décision |
|---|---|
| D1 | **Avertissement** sur l'absence de repos et les longues séquences consécutives, **sans suppression** de séances. Ces semaines ne sont jamais présentées comme optimales. |
| D2 | Éviter deux Full Body à J/J+1 **si un meilleur placement existe**, sans appliquer V1 telle quelle. |
| D3 | Pas de charge cardiovasculaire dans M3 tant que sa normalisation n'est pas fiable ; fenêtres TEST_ONLY inchangées. |
| D4 | Avertissements musculaires fondés sur les signaux existants du moteur Musculation ; aucun seuil arbitraire. |
| D5 | Blocage dû à une interférence non bloquante remplacé par un avertissement avec maintien volontaire ; la sécurité reste bloquante. |
| D6 | Pas de compensation automatique ; déficit affiché s'il est mesurable de façon fiable. |
| D7 | Migration et compatibilité du repli présentées avant tout ajout de persistance. |
| D8 | Recalcul HYROX au démarrage avec la station réellement enregistrée ; aucune nouvelle règle de charge HYROX. |

---

## 9. Étude complémentaire : placement global de la semaine (copie jetable)

### 9.1 Méthode
L'étude reprend l'approche RC2 bis (organisations hebdomadaires entières), dans le chemin Beta 0 réel. Tout a été fait dans une copie jetable du dépôt (d523eea), avec des variantes activées par variables d'environnement, non commitées ; la copie a été supprimée.

1. **Placement actuel (V0)** : le planificateur place la semaine comme aujourd'hui.
2. **Énumération** de toutes les organisations complètes de la semaine :
   - une séance par jour disponible, les séances d'un même sport étant interchangeables ;
   - **aucune séance retirée** ;
   - tailles : P5, 420 organisations (7 séances, 7 jours) ; P1b, 105.
3. **Évaluation rapide** de chaque organisation, avec les profils de demande **réels** (une génération par sport et par jour) :
   - conflits M3 (règles gouvernées actuelles) ;
   - Full Body à J/J+1 ;
   - séances de Musculation à ≤ 24 h, puis ≤ 48 h, d'une séance à demande `high` genou ou hanche (bandes **existantes** de `strength.interference.assessment`) ;
   - jours consécutifs maximaux.

   Une organisation n'est candidate que si elle **domine V0** : au moins aussi bonne sur chaque critère et meilleure sur au moins un. Il n'y a **aucune pondération** et **aucune fenêtre nouvelle**.
4. **Garde réelle** : chaque candidate est **replanifiée par le chemin complet** (composition, voisines, arbitrage M3, moteurs), puis mesurée. Elle n'est retenue que si elle n'est pire que V0 sur **aucune** mesure réelle ; sinon, on garde V0. Au plus 6 candidates par semaine.
5. **Règles de sécurité et prescriptions** : inchangées. Seul le **jour** de chaque séance est choisi ; les moteurs prescrivent comme d'habitude.

| Variante | Garde réelle |
|---|---|
| **G** | aucune (meilleure candidate selon l'évaluation rapide) |
| **G2** | conflits M3 restants, Full Body J/J+1, séries de Musculation **totales**, jours consécutifs |
| **G4** | comme G2, mais séries **par groupe musculaire** (calcul du moteur Musculation) et conflits restants comptés par séance |
| **G5** | G4, **déclenchée seulement** si la semaine V0 contient des Full Body à J/J+1, et retenue seulement si ce nombre **baisse strictement** (D2) |
| **V1** | rappel : préférence « même sport pas à J+1 » dans le placement glouton actuel |

### 9.2 Résultats (6 profils × 6 semaines)

Volume : séries de travail de Musculation par semaine, moyenne S1–S6 (cible – borne haute du moteur).

| Profil | Var. | Full Body J/J+1 | J/J+1 durs | Consécutifs max. | M3 initiaux / décisions / restants | Réductions Musculation | Quadriceps (10–18) | Ischio-jambiers (8–14) | Fessiers (6–14) | Pectoraux (10–20) | Dos (10–20) | Épaules (8–16) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **P1** | V0 | 6 | 16 | 4 | 1 / 1 / 0 | 45 | 3,7 | 5,3 | 7,8 | 14,3 | 9,3 | 16,0 |
| | V1 | 0 | 6 | 4 | 1 / 1 / 0 | 45 | 3,3 | 4,2 | 6,8 | **10,8** | 9,3 | 16,8 |
| | G | 2 | 4 | 4 | 2 / 2 / 0 | 38 | 6,3 | 7,7 | 10,3 | 14,3 | 9,3 | 16,0 |
| | **G5** | **1** | **4** | 4 | 1 / 1 / 0 | **37** | **7,2** | **8,8** | **11,3** | 14,3 | 9,2 | 15,4 |
| **P1b** | V0 | — | 23 | 6 | 3 / 0 / 6 | 62 | 9,2 | 8,2 | 12,3 | 12,3 | 10,2 | 15,2 |
| | V1 | — | 17 | 4 | 8 / 0 / 16 | 55 | **4,2** | **4,8** | 9,0 | 12,3 | 10,2 | 14,8 |
| | G2 / G4 | — | 16–17 | 6 | 3 / 0 / 6 | 40 | **8,3** | **7,8** | 13,3 | 12,3–12,7 | 10,2–10,3 | 13,8–14,0 |
| | **G5** | — | = V0 | = V0 | = V0 | = V0 | = V0 | = V0 | = V0 | = V0 | = V0 | = V0 |
| **P2** | V0 | 6 | 12 | 2 | 30 / 6 / 0 | 0 | 10,8 | 11,2 | 14,8 | 14,3 | 9,3 | 15,5 |
| | V1 | 0 | 12 | 2 | 9 / 0 / **18** | 12 | 10,8 | 11,2 | 14,8 | 13,8 | 9,5 | 15,6 |
| | G | 0 | **16** | 3 | 6 / 1 / **8** | 4 | 10,5 | 10,2 | 14,5 | 13,7 | 9,5 | 14,5 |
| | **G2 / G4 / G5** | = V0 (aucune candidate ne passe la garde) | | | | | | | | | | |
| **P3** | V0 | 6 | 13 | 4 | 33 / 7 / 2 | 25 | 8,3 | 8,8 | 11,3 | 14,3 | 9,2 | 15,5 |
| | V1 | 0 | 13 | 4 | 23 / 2 / **29** | 46 | 7,8 | 7,7 | 10,8 | 13,8 | 9,2 | 16,1 |
| | G2 | 6 | 12 | 2 | 27 / 5 / 3 | 12 | 9,3 | 8,7 | 13,2 | 13,8 | 9,0 | 15,3 |
| | **G5** | **5** | 12 | **3** | 34 / 7 / **1** | **17** | **9,3** | **9,3** | **12,5** | 13,8 | 9,0 | 15,4 |
| **P4** | V0 | — | 6 | 4 | 46 / 4 / 11 | — | — | — | — | — | — | — |
| | G2 / G4 | — | 6 | 3 | 52 / 5 / 10 | — | — | — | — | — | — | — |
| | **G5** | = V0 (aucun Full Body) | | | | | | | | | | |
| **P5** | V0 | — | 29 | 7 | 14 / 1 / 26 | 79 | 4,3 | 4,3 | 7,5 | 9,8 | 9,3 | 16,6 |
| | G2 | — | 25 | 7 | 8 / 0 / **15** | 72 | 5,3 | 6,3 | 9,0 | 10,2 | 9,2 | 15,4 |
| | G4 | — | 26 | 7 | 21 / 0 / **39** | 83 | 5,3 | 5,8 | 8,7 | 10,5 | 9,0 | 16,0 |
| | **G5** | = V0 (aucun Full Body) | | | | | | | | | | |

La Course est identique dans toutes les variantes : mêmes structures en S6 (P1, P1b, P4, P5). Seul l'ordre des séances change parfois dans la semaine (G, G2, G4). Aucune séance n'est non placée.

**Coût mesuré :** banc complet en 15 s (V0), 25 s (G5), 31 s (G4). Le placement global ne s'exécute que dans les semaines concernées.

### 9.3 Gains et régressions

| Profil | G5 (recommandée) | Remarques |
|---|---|---|
| **P1** | **Gain net.** Full Body J/J+1 6 → 1 ; enchaînements durs 16 → 4 ; réductions d'interférence 45 → 37 ; bas du corps **+3,5 / +3,5 / +3,5** séries (quadriceps, ischio-jambiers, fessiers) ; M3 inchangé ; Course identique | Régressions résiduelles : dos 9,3 → 9,2 ; épaules 16,0 → 15,4 (retour dans la plage 8–16) |
| P1b | Identique à V0 | G2/G4 améliorent les enchaînements, mais **baissent** quadriceps (−0,9) et ischio-jambiers (−0,4), déjà sous la cible : rejetées |
| **P2** | Identique à V0 : **F9 subsiste** | Toute organisation sans Full Body J/J+1 rapproche la Musculation du Cross-training : conflits M3 restants 0 → 8 (G) ou 18 (V1), et enchaînements durs 12 → 16. Ce compromis demande votre décision ; à défaut, **avertissement F9** (D1/D2). |
| **P3** | **Gain modéré.** Full Body J/J+1 6 → 5 ; consécutifs 4 → 3 ; réductions 25 → 17 ; quadriceps +1,0, ischio-jambiers +0,5, fessiers +1,2 ; conflits restants 2 → 1 | Régressions : pectoraux −0,5, dos −0,2, épaules −0,1 |
| P4, P5 | Identiques à V0 (aucun Full Body) | G2/G4 auraient changé P4/P5 avec des résultats **instables** (P5 : conflits restants 26 → 15 avec G2, mais 26 → 39 avec G4) |

**Pourquoi la garde ne suffit pas à tout éviter :** elle compare chaque semaine à V0 **de la même trajectoire**. Une semaine modifiée change l'historique des suivantes (progression, voisines, compaction). Les petites régressions de G5 (≤ 0,5 série par semaine sur un groupe) viennent de cet effet en cascade, pas de la semaine retenue. Une garde sur toute la trajectoire est impossible au moment de planifier une semaine : l'avenir n'est pas connu.

**Enseignements :**
1. Un placement global **sans garde réelle** (G) ou avec une garde globale (G2) **dégrade** certains profils (P2, P4, P1b) : les mesures rapides ne prédisent pas l'arbitrage M3 ni la recomposition.
2. Une garde **par groupe musculaire** est indispensable pour ne pas déplacer le volume d'un groupe en déficit vers un autre (P1b).
3. Restreint aux Full Body J/J+1 (**G5**), le placement global apporte un gain net là où F9 existe (P1, P3) **sans toucher** aux profils qui fonctionnent (P1b, P4, P5). Pour P2, **aucun meilleur placement n'existe** à règles constantes.

---

## 10. Proposition d'implémentation limitée (RC4.4)

| Lot | Contenu | Persistance |
|---|---|---|
| **A. Placement Full Body (D2, G5)** | Dans le planificateur, un **second passage facultatif**, déclenché seulement si la semaine contient des Full Body à J/J+1 : énumération des organisations complètes et évaluation rapide (critères §9.1, règles et bandes existantes) ; **garde réelle** par replanification complète ; retenue seulement si les Full Body J/J+1 baissent strictement et si rien n'empire. Mesures de la garde : conflits M3 restants par séance, séries de travail **par groupe** (fournies par le moteur Musculation via son port, sans dépendance du planificateur à Strength), jours consécutifs. Paramètre gouverné d'activation (TEST_ONLY, comme M3), jamais une constante. Trace : `PLAN.PLANNER.GLOBAL_PLACEMENT` (organisation retenue et mesures) ou motif de non-application. | Aucune (raisons dans la semaine planifiée existante) |
| **B. Avertissements de semaine (D1, D2)** | Calculés à la lecture, à partir de la semaine persistée : « 7 jours d'entraînement sur 7 », « N jours consécutifs », « Full Body à J et J+1 » (si aucun meilleur placement), conflits M3 non résolus mis en avant. Ces semaines ne sont jamais présentées comme optimales. Une course libre de la semaine en cours entre dans ce décompte. | Aucune |
| **C. Avertissement musculaire et maintien (D4, D5)** | Source : signaux existants du moteur Musculation (`strength.interference.assessment`, actions `full` / `full_and_signal`) ; interférence d'un démarrage manuel transformée en avertissement avec « Maintenir quand même » ; douleur, refus du moteur et qualité BLOCKED toujours bloquants. | **Oui** : choix de maintien ⇒ **migration et repli présentés avant** (D7) |
| **D. Déficit de volume (D6)** | Affichage du déficit de la semaine après un allègement au démarrage, par groupe, quand il est calculable (moteur Musculation) ; aucune compensation. | Aucune (calcul à la lecture) |
| **E. HYROX au démarrage (D8)** | Ajout de HYROX aux sports régénérables, station lue dans l'intention de semaine du programme ; garde de reproductibilité inchangée. | Aucune |

**Ordre proposé :**
1. A, B, D et E, sans persistance nouvelle ;
2. la migration de C, présentée séparément avant d'être codée (D7).

**Critères de validation spécifiques au lot A :**
- P1 et P3 : Full Body J/J+1 en baisse, aucun groupe musculaire en baisse dans les semaines modifiées ;
- P1b, P2, P4, P5 : matrice RC4 **identique** à b8e312b ;
- la Course reste identique (structures) ;
- aucune séance non placée ;
- toutes les séances planifiées restent produites par leur moteur ;
- tests adverses : paramètre absent ⇒ comportement V0 exact ; refus d'un moteur sur le jour candidat ⇒ V0 ;
- durée de planification bornée (énumération seulement si Full Body J/J+1).

En attente de votre accord avant de coder RC4.4.
