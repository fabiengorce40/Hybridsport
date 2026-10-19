# REKKA — RC4.4 : placement global G5, avertissements, déficit de volume, HYROX au démarrage (lots A, B, D, E)

Branche de développement `claude/kairo-rc4-dev`, à partir de l'étude G5 (2d2cda4). Référence de comparaison : b8e312b (RC4.3).

Périmètre autorisé : lots **A, B, D et E**. Le **lot C** (avertissement musculaire et maintien volontaire) **n'est pas
implémenté** : sa migration et son repli doivent d'abord être présentés et validés séparément.

Aucun nouveau champ persisté. Aucune modification des fichiers Running (autorisation `RUNNING_RC43_R2_CHANGES` non
élargie). Aucune fusion vers TEST ou production, aucun déploiement.

---

## 1. Ce qui a été fait

### Lot A — placement global G5 (planificateur)

**Fichiers :**
- `packages/planner/src/global-placement.ts` (nouveau) ;
- `planner.ts` : `planCore` exporté, épingles de jours facultatives ;
- `governance.ts`, `codes.ts`, `ports.ts`.

**Déclenchement.** Un second passage s'exécute **seulement** si deux conditions sont réunies :
- le paramètre gouverné `planner.globalPlacement` est lisible (G3, TEST_ONLY, marqué SIMULATION_ONLY dans Beta 0) ;
- la semaine planifiée V0 contient des Full Body à J/J+1 (archétypes déclarés par le paramètre : `str_full_body`).

Sinon, le résultat est **exactement** celui de V0 (même objet).

**Méthode** (celle de l'étude, sans règle nouvelle) :
1. **Énumération** des organisations complètes de la semaine. Une séance par jour disponible ; les séances d'un même sport sont interchangeables ; **aucune séance retirée**.
2. **Comparaison par vecteur de critères existants**, jamais agrégé ni pondéré :
   - conflits M3 gouvernés (`detectConflicts`, règles de paires et d'accumulation de la politique M3) ;
   - Full Body à J/J+1 ;
   - séances de Musculation dans chaque **bande de proximité gouvernée** du moteur Musculation (`strength.interference.assessment`, bornes lues par le port), autour d'une séance à demande `high` genou ou hanche ;
   - plus longue suite de jours consécutifs.

   Une organisation n'est candidate que si elle **domine** V0 critère par critère.
3. **Garde réelle.** Au plus `maxCandidates` candidates (6 en Beta 0) sont **replanifiées par le chemin complet** : composition, voisines, arbitrage M3, moteurs. Chacune est mesurée, groupe par groupe :
   - conflits M3 restants (par séance) ;
   - Full Body J/J+1 ;
   - jours consécutifs ;
   - **séries de travail par groupe musculaire**, calculées par la fonction du moteur Musculation (port `plannedGroupSets`, sans dépendance du planificateur à Strength).
4. **Décision.** Une candidate est retenue **seulement** si les Full Body J/J+1 **baissent strictement** et si **aucune** mesure n'empire. Sinon, V0 est gardé.

**Traces** (codes de raison, dans les tableaux existants de la semaine) :
- `PLAN.PLANNER.GLOBAL_PLACEMENT_APPLIED` sur chaque séance déplacée : jour d'origine, jour retenu, Full Body avant et après, nombre de candidates ;
- `PLAN.PLANNER.GLOBAL_PLACEMENT_KEPT` sur les Full Body restés à J/J+1, avec la cause :
  - `NO_DOMINATING_ORGANISATION` ;
  - `NO_CANDIDATE_WITHOUT_DEGRADATION` ;
  - `GROUP_VOLUME_UNAVAILABLE` ;
  - `M3_POLICY_UNAVAILABLE` ;
  - `UNPLACED_SESSION` ;
  - `CURRENT_DEMAND_UNAVAILABLE` ;
  - `ENGINE_UNAVAILABLE`.

**Sécurité et gouvernance inchangées.** Les moteurs prescrivent comme d'habitude ; seul le **jour** change. Une séance refusée par son moteur sur un jour candidat rend ce jour impossible pour elle. Le paramètre n'est pas lisible en PRODUCTION (non approuvé), donc le placement reste V0.

**Beta 0.** `beta0Environment()` active G5. `beta0Environment({ globalPlacement: false })` donne exactement V0 (paramètre et identifiant de simulation absents) ; cette option sert aux comparaisons.

### Lot B — avertissements du planning (app-core `week-load.ts`, Planning)

`weekLoadWarnings(state, weekStart)` est calculé **à la lecture** de la semaine persistée. Aucune séance n'est retirée.

| Avertissement | Source | Affichage |
|---|---|---|
| 7 jours d'entraînement sur 7 | Séances planifiées non manquées, séances non placées réalisées, **courses libres réalisées datées de la semaine** | « 7 jours d'entraînement sur 7 (courses libres comprises) : aucune journée de repos cette semaine. Cette organisation n'est pas optimale ; vous pouvez réduire le nombre de séances dans « Modifier ». » |
| Plus longue suite de jours consécutifs | Mêmes jours, **semaine précédente comprise** | « Plus longue suite : N jours d'entraînement consécutifs (du … au …, semaine précédente comprise) » |
| Full Body à J/J+1 | Séances Full Body planifiées ; motif `GLOBAL_PLACEMENT_KEPT` | « Full Body à J et J+1 : lun 12 et mar 13 — aucun autre placement ne les sépare sans dégrader le reste de la semaine. » |
| Interférence multisport non résolue | Raisons persistées `M3_CONFLICT_UNRESOLVED`, une ligne par paire | « Interférence non résolue : Musculation (mer 7) et Course (jeu 8) sollicitent genoux / cuisses » |

- La course d'onboarding **sans date** n'est jamais comptée (`countableFreeRuns`, RC4.3).
- Le bandeau est en ton « avertissement » dès qu'il contient autre chose que la plus longue suite.
- Aucun code interne n'est affiché.

### Lot D — déficit de volume après un allègement au démarrage

`adaptationVolumeDeficit(state, requestId)` compare la séance **planifiée** et la séance **adaptée** au démarrage (Musculation seulement). Le calcul utilise `sessionPlannedHardSets`, la fonction du bilan hebdomadaire du moteur Musculation.

- **Résultat :** une liste par groupe (séries prévues, séries adaptées, séries retirées).
- **Affichage**, dans le bandeau « Séance adaptée » : « Séries retirées de votre semaine par cet allègement (non redistribuées) : Quadriceps −3, … ».
- **Aucune redistribution.**
- **`null` (rien d'affiché)** dans ces cas :
  - séance non adaptée ;
  - autre sport ;
  - séance illisible ;
  - exercice inconnu du catalogue (calcul non fiable).

  Aucun déficit fictif n'est donc affiché.

### Lot E — HYROX au démarrage

`regenerateSession` accepte HYROX. La station est celle **réellement persistée** dans l'intention de semaine du programme (`programmeState.weeks[].intent.demands[hyrox].station`). Avec H2 par rôle, la station est absente, ce qui est cohérent.

- La garde de reproductibilité n'a pas changé : une séance n'est régénérée au démarrage que si sa régénération à état inconnu redonne **exactement** la séance planifiée.
- Les contrôles de douleur et de sécurité n'ont pas changé.
- Aucune règle de charge HYROX n'a été ajoutée.
- **Effet conforme à la conception (§4.7) :** les courses libres faites depuis la planification sont désormais aussi évaluées au démarrage d'une séance HYROX. H2 n'applique pas les voisines à la dose : la séance reste inchangée (`FREE_RUN_RECOVERY_NO_CHANGE`).

---

## 2. Résultats — banc RC4, 6 profils × 6 semaines (chemin Beta 0 réel)

Comparaison entre V0 (G5 désactivé, identique à b8e312b) et RC4.4. Volume : séries de travail de Musculation par semaine, moyenne S1–S6.

| Profil | Version | Full Body J/J+1 | J/J+1 durs | Consécutifs max. | Conflits M3 restants | Réductions Musculation | Quadriceps | Ischio-jambiers | Fessiers | Pectoraux | Dos | Épaules | Bras | Tronc |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **P1** | V0 | 6 | 16 | 4 | 0 | 45 | 3,7 | 5,3 | 7,8 | 14,3 | 9,3 | 16,0 | 16,3 | 9,2 |
| | **RC4.4** | **1** | **4** | 4 (S1) puis **3** | 0 | **37** | **7,2** | **8,5** | **11,5** | 14,3 | 9,2 | 15,4 | 16,8 | **7,8** |
| P1b | V0 = RC4.4 | 0 | 23 | 6 | 6 | 62 | 9,2 | 8,2 | 12,3 | 12,3 | 10,2 | 15,2 | 18,2 | 9,3 |
| P2 | V0 = RC4.4 | 6 | 12 | 2 | 0 | 0 | 10,8 | 11,2 | 14,8 | 14,3 | 9,3 | 15,5 | 16,3 | 7,6 |
| **P3** | V0 | 6 | 13 | 4 | 2 | 25 | 8,3 | 8,8 | 11,3 | 14,3 | 9,2 | 15,5 | 16,2 | 7,5 |
| | **RC4.4** | **5** | **12** | **3** | **1** | **17** | **9,3** | **9,3** | **12,5** | 13,8 | 9,0 | 15,4 | 16,5 | 7,8 |
| P4 | V0 = RC4.4 | — | 6 | 4 | 11 | — | — | — | — | — | — | — | — | — |
| P5 | V0 = RC4.4 | — | 29 | 7 | 26 | 79 | 4,3 | 4,3 | 7,5 | 9,8 | 9,3 | 16,6 | 16,0 | 9,1 |

**Conformité aux critères de validation :**

| Critère | Résultat |
|---|---|
| P1 : placement et volume du bas du corps améliorés | ✅ Full Body J/J+1 6 → 1, enchaînements durs 16 → 4, quadriceps / ischio-jambiers / fessiers **+3,5 / +3,2 / +3,7** séries par semaine (valeurs de l'étude retrouvées) |
| P3 : amélioré sans dégradation musculaire significative | ✅ Full Body J/J+1 6 → 5, consécutifs 4 → 3, conflit M3 restant 2 → 1, bas du corps +1,0 / +0,5 / +1,2. Baisses ≤ 0,5 série (pectoraux −0,5, dos −0,2, épaules −0,1) : effet de cascade (§5) |
| P1b, P2, P4, P5 identiques à V0 | ✅ Banc complet **identique** (séances, contenus, volumes, courses, erreurs), testé ; matrice RC4 identique à b8e312b pour ces quatre profils |
| G5 désactivé ⇒ strictement V0 | ✅ Planificateur (`planMultisportWeek` ≡ `planCore`, 6 semaines types) et chemin Beta 0 (10 états RC1 : planification identique à l'empreinte RC1) |
| Course RC4.1 et RC4.3 inchangées | ✅ Mêmes structures prescrites pour les 6 profils. Pour P1, en S3 et S5, le footing et le seuil échangent leurs jours (prescriptions identiques). Les tests RC4.1 (ressenti) et RC4.3 (courses libres) passent sans modification. Aucun fichier Running modifié |
| Aucune séance supprimée | ✅ Même nombre de séances planifiées pour chaque profil et chaque semaine ; aucune séance non placée |
| Aucune régression de sécurité | ✅ Tests douleur, contrôle pré-séance, pause douleur et refus moteur inchangés et verts ; HYROX : douleur sur zone sollicitée ⇒ adaptée ou reportée, jamais « inchangée » |

### Temps de calcul (6 semaines par profil, même machine, chemin Beta 0 complet)

| Profil | V0 | RC4.4 | Écart | Cause |
|---|---|---|---|---|
| **P2** (le plus lourd) | 1,8 s | **10,2 s** | +8,4 s, soit ≈ 1,4 s par semaine | 6 candidates replanifiées chaque semaine, **toutes refusées** par la garde |
| P1 | 1,7 s | 4,2 s | +2,5 s | Semaines S2–S6 replanifiées |
| P3 | 1,9 s | 3,9 s | +2,0 s | — |
| P1b | 1,6 s | 2,2 s | — | Aucun Full Body à J/J+1 : pas de second passage |
| P5 | 1,1 s | 1,2 s | — | Aucun Full Body à J/J+1 : pas de second passage |
| P4 | 0,3 s | 0,3 s | — | Aucun Full Body à J/J+1 : pas de second passage |

Le coût est **borné** :
- au plus `maxCandidates` (6) replanifications par semaine ;
- le passage n'a lieu que si des Full Body à J/J+1 existent ;
- il intervient seulement à la planification d'une semaine (une fois par semaine pour l'utilisateur), jamais à l'affichage.

---

## 3. Tests

| Fichier | Contenu |
|---|---|
| `packages/planner/tests/m3/g5-global-placement.test.ts` (15) | Paramètre absent ⇒ `planMultisportWeek` ≡ `planCore` (6 semaines types) ; PRODUCTION ⇒ V0, aucune trace ; paramètre présent ⇒ aucune séance retirée, V0 gardé et motivé (motif sur les seuls Full Body J/J+1, candidates ≤ 6) ; port sans mesure par groupe ⇒ V0 (`GROUP_VOLUME_UNAVAILABLE`) ; déterminisme |
| `packages/app-core/tests/rc44/rc44-week-load.test.ts` (14) | P1b, P2, P4, P5 identiques à V0 sur 6 semaines ; P3 amélioré et traces `APPLIED` cohérentes ; avertissements P5 (7/7, suite sur deux semaines, conflits), P2 (Full Body gardé, « aucun meilleur placement »), courses libres comptées, onboarding sans date exclu ; déficit (genou P2 ⇒ quadriceps, aucune autre séance modifiée ; null hors Musculation ou sans allègement) ; HYROX régénéré à l'identique (P3, P4), douleur au démarrage |
| `apps/kairo/tests/rc44-week-load-dom.test.tsx` (3) | Bandeau du Planning (7/7, interférences lisibles, aucun code interne), absence de bandeau, déficit affiché par groupe en français |
| `rc3-test/rc1-migration.test.ts` | Fixtures RC1 : G5 désactivé ⇒ empreinte RC1 **exacte** ; G5 actif ⇒ même planification, seule la trace de simulation `planner.globalPlacement` est ajoutée (aucun Full Body à J/J+1 dans ces états) |
| `rc4-audit/rc4-findings.test.ts` | F4 réécrit : constat V0 conservé (G5 désactivé) et nouveau comportement (bas du corps en hausse, interférences en baisse, mêmes séances) ; F13 : constat V0 conservé, et avec G5 la station de capacité de S5 change **seulement** par l'historique (vérifié : même semaine replanifiée sans G5 sur le même historique ⇒ même station) |
| Rapports régénérés | `strength-scenario-b.md` (les Full Body passent du 12/13/15 au 13/15/17 : plus de J/J+1), `rc4-matrice.md` (sections P1 et P3 seulement), tailles d'état (+0,1 à +0,8 % : raisons G5 et identifiant de simulation) |

---

## 4. Persistance, compatibilité et repli

- **Aucun nouveau champ.** G5 n'ajoute que des **valeurs** dans des tableaux existants : des codes de raison dans `requests[].reasons` et `governance`, et l'identifiant `planner.globalPlacement` dans `simulation`.
- **Compatibilité avec le repli RC1 TEST (0cf2ceb).** Le schéma de la branche de repli accepte ces valeurs telles quelles : `zReason.code` est une chaîne libre, et `simulation` est un tableau de chaînes. Aucune migration et aucun retrait ne sont nécessaires.
- **Lots B et D :** calculés à la lecture, rien n'est écrit.
- **Lot E :** il réutilise le journal d'adaptation existant.
- **Version de planification inchangée** (`beta0-m31`). Les semaines déjà planifiées ne sont pas régénérées ; G5 ne s'applique qu'aux semaines planifiées après la mise à jour.

---

## 5. Limites

1. **Effet de cascade.** La garde compare chaque semaine à V0 **dans la même trajectoire**. Une semaine modifiée change l'historique des suivantes (progression, voisines). Moyennes sur 6 semaines :
   - **P1 :** tronc 9,2 → 7,8 (reste dans la plage 4–10) ; épaules 16,0 → 15,4 ; dos 9,3 → 9,2 ;
   - **P3 :** pectoraux −0,5 ; dos −0,2 ; épaules −0,1.

   Aucune semaine **retenue** n'a baissé un groupe : ces écarts viennent des semaines suivantes. Une garde sur toute la trajectoire n'est pas possible au moment de planifier, car l'avenir n'est pas connu.
2. **P2 : F9 subsiste.** Les Full Body à J/J+1 restent : aucune organisation ne les sépare sans rapprocher la Musculation du Cross-training. Ils sont signalés par un avertissement explicite (« aucun autre placement ne les sépare sans dégrader le reste de la semaine »).
3. **Pas de seuil de « longue suite ».** Aucune valeur gouvernée n'existe. La plus longue suite est donc affichée **telle quelle**, en information, et l'avertissement fort reste réservé à 7/7. Un seuil demanderait une décision sportive.
4. **HYROX et voisines.** Au démarrage, H2 reçoit les voisines (courses libres comprises) mais ne les applique pas à la dose : aucune règle de charge HYROX n'existe. Le bénéfice tient aux contrôles de douleur et d'état du jour.
5. **Déficit (lot D).** Il porte sur la séance allégée seulement, pas sur la semaine entière : les séances réalisées en plus ou en moins ne sont pas comptées. Il n'est disponible qu'en Musculation, avec des exercices connus du catalogue.
6. **Identifiant de simulation.** Chaque semaine Beta 0 planifiée après la mise à jour porte `planner.globalPlacement` dans sa liste de simulation (trace seulement).
7. **Coût sur P2.** Les 6 candidates sont replanifiées puis refusées chaque semaine (≈ 1,4 s par planification de semaine sur la machine de test). Ce coût est acceptable une fois par semaine, mais à surveiller sur des téléphones lents.
8. **Lot C non implémenté** (avertissement musculaire avec maintien volontaire) : il nécessite un champ persisté, dont la migration et le repli doivent d'abord être présentés.

---

## 6. Validation (branche `claude/kairo-rc4-dev`)

| Étape | Résultat |
|---|---|
| `pnpm check` (typage racine et application, ESLint, Vitest) | ✅ 240 fichiers, **2 874 tests**, 1 ignoré (préexistant) |
| `pnpm kairo:build` | ✅ (avertissement préexistant sur la taille des chunks) |
| `pnpm kairo:e2e` (Chromium mobile, `vite preview`) | ✅ 221 vérifications |

En attente de votre accord. Aucune fusion vers TEST ou production, aucun déploiement.
