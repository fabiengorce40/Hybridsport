# REKKA — RC4.5 : bilan chiffré

| | |
|---|---|
| **Branche** | `claude/kairo-rc4-dev`, à partir de `465b446` (clôture RC4.4) |
| **Autorisation** | « REKKA — Autorisation RC4.5 » : corrections C1–C4, F5, F6, F8 ; R6, P-V, S-L reportées ; lot C en étude documentaire ; F7, F13 et intégration TEST hors périmètre |
| **Hors RC4.5** | Aucune fusion vers TEST ou production, aucun déploiement, RC4.6 non commencé. Branche de repli `0cf2ceb` inchangée. |

---

## 1. Synthèse

| Lot | Résultat | Commit |
|---|---|---|
| **C3** — nettoyage | ✅ Livré. Codes du planificateur via `GP_CODES` (4 lectures app-core), `planCore` par l'index. Banc strictement identique. | `288e2a7` |
| **C1** — déplacements G5 expliqués | ✅ Livré. « Jour changé (prévue …) pour éviter deux séances Full Body à la suite. » sur la carte, sans code interne. | `d2b2d6d` |
| **C4** — durée des tests | ✅ Livré. Simulations calculées une fois par fichier ; mêmes assertions. Suite : **510 → 428 s** cumulées (−16 %), **4 min 31 → 4 min 01** réelles. | `b06e32e` |
| **C2** — coût de planification | ✅ Mesuré : outil ajouté, gain de 10 à 23 % sur les profils où G5 s'applique, à résultat identique. ⚠️ **Objectif de 3 s par semaine non atteint** pour les profils où G5 s'applique (P2 6,3 s, P3 4,0 s, P1 3,5 s en ×4). Décision demandée (§3). | `5de761f` |
| **F5** — au-dessus de la borne haute | ✅ Livré, informatif seulement. Aucune séance ni aucun volume modifié. | `32b78f8` |
| **F6** — groupes en déficit | ⛔ **Étudié et implémenté, non retenu** : contradictoire avec les conditions posées dans le contenu actuel (§4). Tentative archivée. Décision de contenu demandée. | — |
| **F8** — variation intra-semaine | ⛔ **Étudié et implémenté, non retenu** : aucune variation possible sans ralentir la progression des charges ni changer le volume (§5). Tentative archivée. Décision demandée. | — |
| **Lot C** — maintien volontaire | 📄 Étude de migration et de repli : `RC4.5-LOT-C-MIGRATION.md`. Recommandation : **aucun nouveau champ** (raison dans le contrôle avant séance), compatible avec `0cf2ceb` et `a7c1e51`. | — |

**Effet sportif global de RC4.5 :** aucun. Le banc RC4 (6 profils × 6 semaines) est **strictement identique** à `465b446` : séances, contenus, volumes, courses, erreurs. Les lots livrés sont techniques, d'affichage ou de mesure.

---

## 2. Validation

| Contrôle | Résultat |
|---|---|
| `pnpm typecheck` · `pnpm lint` | ✅ · ✅ |
| Vitest (unitaires, intégration, simulations, DOM) | ✅ **2 880 tests**, 0 échec, 2 ignorés : 1 préexistant, et `perf-seeds` qui ne s'exécute qu'à la demande |
| `pnpm kairo:build` | ✅ (avertissement préexistant sur la taille des chunks) |
| `pnpm kairo:e2e` (Chromium mobile, `vite preview`) | ✅ 221 vérifications |
| **Régression multisport** (banc RC4, 6 profils × 6 semaines) | ✅ Strictement identique à `465b446` après chaque lot (C3, C1, C4, C2, F5) et à la fin |
| **Volumes musculaires avant / après** | ✅ Identiques. Moyennes S1–S6 (séries de travail par semaine) dans le tableau ci-dessous |
| **Durées réelles des séances** | ✅ 198 séances : aucune au-delà du temps disponible du jour. Durée estimée Musculation de 25 à 72 min (moyenne 43 à 55 min selon le profil) ; Course de 30 à 75 min ; CT de 38 à 51 min ; HYROX de 9 à 48 min |
| **Stabilité des progressions** | ✅ Identiques au départ. Exemples : P1b squat 40 → 42,5 → 45 kg ; P1 / P2 / P3 presse pectoraux 40 → 45 kg ; P5 squat et soulevé roumain 40 → 42,5 kg |
| **Coût de planification** | Voir C2 (§3) |
| **Gouvernance** | Aucun fichier Running modifié. Strength : seul `week-prescription.ts`, déjà dans la liste fermée S3 ; aucune liste fermée élargie. Aucun nouveau champ persisté. |

**Volumes Musculation** (moyenne S1–S6, séries par semaine ; identiques avant et après RC4.5) :

| Profil | Quadriceps | Ischio-jambiers | Fessiers | Mollets | Pectoraux | Dos | Épaules | Bras | Tronc |
|---|---|---|---|---|---|---|---|---|---|
| P1 | 7,2 | 8,5 | 11,5 | 0,0 | 14,3 | 9,2 | 15,4 | 16,8 | 7,8 |
| P1b | 9,2 | 8,2 | 12,3 | 0,0 | 12,3 | 10,2 | 15,2 | 18,2 | 9,3 |
| P2 | 10,8 | 11,2 | 14,8 | 0,0 | 14,3 | 9,3 | 15,5 | 16,3 | 7,6 |
| P3 | 9,3 | 9,3 | 12,5 | 0,0 | 13,8 | 9,0 | 15,4 | 16,5 | 7,8 |
| P5 | 4,3 | 4,3 | 7,5 | 0,0 | 9,8 | 9,3 | 16,6 | 16,0 | 9,1 |

---

## 3. C2 — coût de planification sur processeur ralenti

**Méthode** (`apps/kairo/scripts/perf-planning.mjs`) :
- build de production servie par `vite preview`, Chromium mobile ;
- processeur ralenti ×1, ×4 (profil mobile intermédiaire de référence) et ×6 (entrée de gamme) ;
- l'application est ouverte le lundi de la semaine 2, à partir d'un état RC4 en fin de semaine 1 : cette ouverture planifie la semaine (de façon synchrone) ;
- on retranche le temps d'un rechargement, où la semaine est déjà planifiée ;
- médiane de 3 essais.

**Correction appliquée (résultat identique) :** pendant une planification avec placement global, les générations des moteurs sont **mémorisées** et partagées entre V0 et les organisations candidates. Ce sont des fonctions pures de leur créneau : le résultat est identique par construction, et le banc l'a vérifié.

| Profil (G5 actif ?) | ×1 avant → après | **×4 avant → après** | ×6 avant → après |
|---|---|---|---|
| P1 (oui) | 0,85 → 0,72 s | **3,83 → 3,50 s** | 6,68 → 5,20 s |
| P2 (oui, toutes candidates refusées) | 1,40 → 1,45 s | **8,03 → 6,35 s** | 12,95 → 10,30 s |
| P3 (oui) | 0,93 → 0,77 s | **5,18 → 4,02 s** | 7,86 → 5,22 s |
| P1b (non) | 0,44 → 0,44 s | **2,39 → 2,35 s** | 3,37 → 3,80 s |
| P4 (non) | 0,34 → 0,27 s | **1,60 → 1,39 s** | 2,17 → 1,96 s |
| P5 (non) | 0,49 → 0,45 s | **2,14 → 2,16 s** | 3,67 → 3,27 s |

**Objectif indicatif de 3 s en ×4 :**
- **atteint** sans G5 (P1b, P4, P5) ;
- **non atteint** quand G5 s'applique (P1, P2, P3).

Avec P2 (pire cas) :
- V0 + 6 replanifications complètes, toutes refusées par la garde ;
- taux de reprise de la mémorisation ≈ 20 % seulement : les créneaux candidats diffèrent par leurs voisines.

**Options (décision) :**

| Option | Effet mesuré | Risque |
|---|---|---|
| **G5-a** — `maxCandidates` 6 → 3 (paramètre G3 TEST_ONLY existant) | Banc **strictement identique** : les organisations retenues sont de rang 0 à 2, jamais au-delà. P2 : 8,6 → 5,7 s en Node (−33 %). Environ 4,2 s estimés en ×4 : toujours au-dessus de 3 s. | Une organisation de rang 3 à 5 ne serait plus essayée sur d'autres profils |
| **G5-b** — planifier hors du fil d'affichage (Web Worker) | Interface jamais bloquée ; durée inchangée | Changement d'architecture de l'application (hors périmètre RC4.5) |
| **G5-c** — garder tel quel | P2 : environ 6 s, une fois par semaine, à l'ouverture | Ouverture lente sur téléphone d'entrée de gamme (≈ 10 s en ×6) |

---

## 4. F6 — orientation des isolations vers les groupes en déficit : non retenue

**Ce qui a été tenté :** une politique Strength facultative et gouvernée (`strength.selection.deficitOrientation`), activable en Beta 0 (TEST_ONLY). Elle réoriente un emplacement d'isolation facultatif vers le groupe au plus grand déficit relatif face à sa cible hebdomadaire. Garde-fous ajoutés au fil des mesures :
- volume de la semaine planifiée (et non les 7 jours glissants) ;
- aucune borne haute dépassée ;
- critère `fatigue_fit` au moins égal ;
- pas plus de séries que l'exercice remplacé ;
- jamais plus lent que l'exercice remplacé ;
- « ne pas nuire » : seulement si les groupes de l'exercice remplacé sont déjà à leur cible ;
- jamais contre une ancre, une track suivie ou l'exercice en place ;
- reproductibilité des semaines déjà planifiées.

**Mesures sur le banc** (mollets ; ischio-jambiers ; autres effets) :

| Variante | Mollets | Effet indésirable |
|---|---|---|
| Sans garde « ne pas nuire » | P1 0 → 3,5 ; P2 0 → 7,5 | **Ischio-jambiers effondrés** : P2 11,2 → 5,2, P3 9,3 → 4,2, sous leur cible de 8 ; quadriceps P1 −1,5 |
| « Ne pas nuire », isolations haut + bas | P2 0 → 1,0 | Effets en cascade : décisions G5 modifiées, quadriceps P1 −0,9, P3 −1,0 ; dépassements de borne haute +2 |
| Isolation du bas seulement + garde de temps | 0,5 à 1,0 | Ischio-jambiers −0,5 (P1, P3), à la limite de la cible |
| + progression et continuité protégées | **0** (aucun effet) | — |
| Scénario Strength A (Haut / Bas 4×) sans garde de continuité | Mollets 4 → 7 | **Le leg curl et sa progression disparaissent durablement** ; deux exercices de mollets dans la même séance ; un exercice ajouté (volume en plus) |

**Cause structurelle :**
- le Full Body n'a qu'**un** emplacement d'isolation du bas du corps, partagé entre ischio-jambiers, quadriceps et mollets ;
- la continuité S4 (un exercice en place par emplacement, avec sa track) le réserve durablement à l'accessoire en place.

Sous vos conditions (ne pas nuire, aucun volume ajouté, progressions et continuité préservées), une règle de sélection ne peut pas servir les mollets. Toutes les variantes qui ont un effet violent au moins une condition.

**Décision de contenu demandée (F6) :**
- **F6-a** — emplacement **dédié** aux mollets (facultatif, Full Body et Bas du corps). Le volume des mollets augmente vers leur cible gouvernée, qui est un volume voulu ; la durée peut augmenter, mais la politique de durée existante s'applique.
- **F6-b** — seconde instance de l'emplacement d'isolation du bas du corps en Full Body.
- **F6-c** — statu quo : mollets non couverts, signalés « en dessous ».

**Traçabilité :** patch complet, test et mesures dans `docs/kairo/rc45-etudes/` (`F6-tentative.patch`, `F6-mesures.txt`).

---

## 5. F8 — variation intra-semaine : non retenue

**Constat** (P2, chaque semaine dès S2) : Full Body A · B · A, dont les deux séances A ont les mêmes exercices structurants. Le mécanisme existant ne se déclenche que si deux séances sont **strictement** identiques. Les deux A diffèrent d'un accessoire, donc il ne se déclenche jamais.

**Ce qui a été tenté :**
- déclencheur élargi (`same_structure`) : mêmes exercices des blocs de force ;
- variation gouvernée existante (note `planned_variation`) ;
- variation acceptée seulement à **volume identique par groupe**, mêmes exercices structurants, durée jamais plus longue ;
- semaines anciennes régénérées avec le déclencheur d'origine.

**Mesure** (P2 et P1b, 6 semaines) : 15 déclenchements.

| Issue | Nombre | Cause |
|---|---|---|
| Variation identique à la séance d'origine | 10 | Les accessoires portent une **track de progression** : le critère `track` (premier pour les accessoires) les garde, par conception |
| Variation refusée (volume changé) | 5 | Les alternatives changent réellement le volume (ex. tronc 4,5 → 1,5 ; quadriceps / ischio-jambiers ±3 séries) : « volume équivalent » non respecté |
| Variation acceptée | **0** | — |

**Conclusion :** même cause que F6, la continuité S4 (une track par emplacement). Varier un accessoire suivi dans la 2e séance du même type ralentirait sa progression : elle passerait d'une exposition à une seule exposition par semaine sur cette track. C'est contraire à « préserver la progression des charges ».

**Décision demandée (F8) :**
- **F8-a** — tracks **par occurrence** (A#1, A#2 : chaque séance du même type a ses accessoires et leur progression). C'est un changement de données persistées (clé de track), donc **migration et repli à présenter**, comme le lot C.
- **F8-b** — accepter une progression plus lente des accessoires variés.
- **F8-c** — statu quo, avec la variation A · B · A signalée.

**Traçabilité :** `docs/kairo/rc45-etudes/F8-tentative.patch`, `F8-traces-P2-P1b.txt`.

---

## 6. Livraisons techniques (détail)

- **C1** :
  - `SessionView.globalPlacement` (jour d'origine), lu dans la raison persistée `GLOBAL_PLACEMENT_APPLIED` ;
  - phrase sur la carte (`data-g5-moved`) ;
  - test DOM sur la semaine 2 de P1 (chemin réel).
- **C2** :
  - `memoizedPorts` dans `global-placement.ts`, activés seulement quand le paramètre G5 est lisible ;
  - `perf-planning.mjs` et les états de départ `perf-seeds.test.ts`, écrits seulement si `PERF_SEED_DIR` est défini.
- **C3** :
  - `GP_CODES` dans `week-load.ts`, `beta0.ts` et `strength-insight.ts` ;
  - test G5 importé par l'index.
- **C4** :
  - `simulateOnce` (`rc4-sim.ts`) ;
  - identité V0 et gain G5 déplacés dans `rc4-matrix.test.ts`, qui partage ses simulations ;
  - aucune assertion retirée (35 tests sur les trois fichiers, avant comme après) ;
  - `rc4-findings` 77 → 48 s ; `rc44` 35 → 6 s ; `rc4-matrix` 23 → 24 s.
- **F5** :
  - `aboveHigh` dans le bilan hebdomadaire Strength, indicateur seul (statut du groupe et de la semaine inchangés) ;
  - Programme : « au-dessus de la borne haute (N), non réduit automatiquement » ;
  - tests unitaire, DOM et constat F5 réécrit.

---

## 7. Limites restantes et anomalies documentées

1. **Coût G5 sur téléphone** au-dessus de l'objectif pour P1, P2 et P3 (§3), en attente de décision.
2. **Mollets jamais programmés (F6)** : anomalie inchangée, décision de contenu en attente.
3. **Variation intra-semaine (F8)** : A · B · A inchangé, décision en attente (tracks par occurrence ⇒ migration).
4. **R6 — quadriceps P1** : 7,2 séries pour une cible de 10, anomalie documentée (décision reportée). F5 à F8 ne l'ont pas modifiée.
5. **P-V** : semaines non commencées non régénérées automatiquement (décision respectée).
6. **S-L** : aucun seuil de longue suite (décision respectée).
7. **Bras et épaules** au-dessus de leur borne haute dans tous les profils Musculation : désormais **signalés** (F5), jamais réduits automatiquement.

---

## 8. Décisions demandées

| # | Question | Options | Recommandation |
|---|---|---|---|
| G5-perf | Coût de planification au-dessus de 3 s (P1 à P3) | G5-a (`maxCandidates` 3) / G5-b (Web Worker) / G5-c (statu quo) | G5-a tout de suite (banc identique), puis G5-b si l'objectif doit être tenu en ×4 |
| F6 | Mollets | F6-a (emplacement dédié) / F6-b (seconde instance) / F6-c (statu quo) | F6-a |
| F8 | Variation intra-semaine | F8-a (tracks par occurrence, migration) / F8-b (progression ralentie) / F8-c (statu quo) | F8-a, après présentation de la migration avec le lot C |
| Lot C | Persistance du maintien volontaire | A (raison, aucun champ) / B (champ + liste fermée) / C (aucune) | A |

En attente de votre accord. Rien n'est fusionné ni déployé, et RC4.6 n'est pas commencé.
