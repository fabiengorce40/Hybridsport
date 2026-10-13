# KAIRO — Préparation RC3 : corriger les moteurs avant l'optimisation du Planner

**Branche :** `claude/kairo-rc3-prep`, issue de `claude/kairo-rc2bis-week-study` (`0b44d9d`).

- **Rien n'est engagé :** aucune fusion, aucun déploiement, aucune règle sportive approuvée modifiée.
- **Aucun archétype activé, aucune action nouvelle dans l'application.**
- **Code ajouté :** uniquement sous `packages/app-core/tests/` (modules d'étude et tests).
  `tests/consolidation/sim4.ts` reçoit des options **facultatives**. Sans elles, son comportement est identique
  (test E-4, et mesures RC2 publiées inchangées : rc2bis I-3).

> Des tests verts ne prouvent pas la qualité sportive. Les valeurs « démonstration » de ce document sont TEST_ONLY.
> Elles montrent un mécanisme, jamais un délai ou un seuil recommandé.

| Fichier | Rôle |
|---|---|
| `tests/rc3/running-audit.test.ts` | Mission 1 : 8 constats prouvés (R-1 à R-8). |
| `tests/rc3/intra-strength.ts` + `.test.ts` | Mission 2 : proposition de gouvernance TEST_ONLY (S-1 à S-6). |
| `tests/rc3/volume-split.ts`, `equivalent.ts`, `equivalence.test.ts` | Mission 3 : volumes séparés, scénario équivalent (E-1 à E-4). |
| `tests/rc3/rc3-study.test.ts` | Étude comparative, lancée par `RC3_STUDY=1` (56 simulations de 4 semaines, ≈ 70 s). Sorties : `__reports__/rc3-comparaisons.md` et `rc3-study.json`. |

## Mission 1 — Audit Running : pourquoi seulement `running.easy`

### 1.1 Archétypes existants

| archétype | état dans le moteur | condition d'accès |
|---|---|---|
| EASY | implémenté | ancre de dose sur la dernière course réalisée (V19) |
| TEST (contre-la-montre) | implémenté (décision produit D2, candidat) | **allure observée récente** : courses **terminées** avec **distance** (bande RECENT V12, 8 semaines) |
| THRESHOLD | implémenté | niveau ≥ P_R2 ; dose réalisée récente, **sinon** première exposition D2 **après un TEST récent** (5 ou 10 km) |
| SEVERE, SHORT_INTERVAL | implémentés | idem THRESHOLD (première exposition D2 par niveau P_R2 à P_R4) |
| HILLS | première exposition **bloquée** par décision (`BLOCKED_PENDING_SOURCES`) | — |
| LONG | implémenté pour **progresser**, pas pour **commencer** | exige une dose LONG réalisée récente ; **aucune première exposition gouvernée** |
| RACE_PACE, STRIDES | **non implémentés** (`PRESCRIPTION_NOT_IMPLEMENTED`) | — |
| PROGRESSION_RUN | hors V1, toujours désactivé | — |

### 1.2 Composition de la semaine (`composeRunningWeek`, §R)

Les étapes s'appliquent dans cet ordre :

1. **Fréquence minimale** : moins de 2 courses par semaine (V26) ⇒ mode maintien, EASY seulement.
2. **Séances à forte demande** (LONG, TEST, qualité) :
   - densité V10 par niveau : P_R0 0, P_R1 1, P_R2 et P_R3 2, P_R4 3 par 7 jours ;
   - jamais deux jours consécutifs (V11).
3. **Séance clé** selon l'objectif :
   - 10 km : THRESHOLD → SEVERE → RACE_PACE ;
   - semi : THRESHOLD → LONG → RACE_PACE ;
   - marathon : LONG → THRESHOLD ;
   - 5 km : SEVERE → SHORT_INTERVAL → RACE_PACE → THRESHOLD ;
   - course générale : **EASY** → STRIDES → THRESHOLD.

   Le TEST remplace la séance clé quand la première exposition l'exige.
4. **LONG** pour le semi et le marathon, si 3 courses ou plus.
5. **Complément** en EASY.

### 1.3 Causes prouvées (tests R-1 à R-8)

| # | cause | effet | nature |
|---|---|---|---|
| R-1 / R-2 | **Distance jamais saisie** à l'inscription ni dans les simulations ⇒ aucune allure observée ⇒ TEST refusé (`TEST_REFUSED: OBSERVED_PACE_UNAVAILABLE`) ⇒ THRESHOLD et SEVERE refusés (`RECENT_TEST_REQUIRED`) | 10 km : séance clé introuvable, repli EASY toutes les semaines | **donnée manquante**, pas une règle |
| R-4 | Simulations : course enregistrée « modifiée » ⇒ issue PARTIAL ⇒ ni allure observée ni ancre de dose (les deux exigent COMPLETED) | même blocage, même avec distance | **biais du banc** de simulation |
| R-3 | Avec distance saisie et course « comme prescrite » : **TEST en semaine 1, puis séance de seuil** (première exposition D2, 3 × 5 min pour P_R2) | 10 km sur 4 semaines : 5 EASY, 1 TEST, 2 THRESHOLD | **le moteur fonctionne déjà** |
| R-5 | LONG : `DOSE_ANCHOR_UNAVAILABLE: NO_REALIZED_SESSION`. Aucune première exposition n'existe pour LONG, et une course libre est toujours enregistrée EASY. | Sortie longue **impossible à initier**, même en semi à 3 courses sur 7 jours | **lacune de gouvernance** (décision sportive) |
| R-6 | RACE_PACE non implémenté | troisième candidat 10 km toujours refusé | implémentation absente |
| R-7 | Le port Running compte la fréquence sur les **jours placés**, pas sur les séances demandées : 3 demandées, 2 placées ⇒ `FREQUENCY_BELOW_THREE` | profils à 6 jours chargés : jamais de LONG | **choix technique à arbitrer** |
| R-8 | Course générale : la séance clé **est** une EASY (table §R) | jamais de qualité, par conception | décision produit existante |

**Dans l'application réelle**, l'écran de fin de séance (`Session0.tsx`) propose une « Distance (km, facultatif) ». La
qualité est donc **atteignable** si l'utilisateur saisit la distance et déclare « comme prévu ». Mais rien ne lui dit
que cette saisie débloque le TEST puis la qualité, et la course déclarée à l'inscription n'a pas de distance.

### 1.4 Étapes pour une semaine « facile + qualité + longue » adaptée au niveau, au volume et à l'objectif

Aucune étape n'active un archétype non approuvé. Celles marquées **D** demandent une décision sportive.

1. **Données (sans règle) :**
   - demander la distance de la dernière course à l'inscription ;
   - rendre explicite à l'écran de fin que la distance sert à calibrer l'intensité ;
   - en simulation, utiliser `runOutcome: 'completed_distance'` (fait, option sim4).
2. **TEST de 10 km pour un objectif 10 km (D).** La décision produit D2 / D8 prévoit un contre-la-montre de 10 km dès
   la semaine 1, pour un coureur P_R2 hybride. Faut-il un TEST de 5 km pour tous les niveaux P_R2 ?
3. **Première exposition LONG (D).** Paramètre `running.firstExposure.long` à créer, par niveau et objectif, ancré
   sur la plus longue course EASY réalisée. C'est l'**unique** verrou de la sortie longue. Sans valeur sourcée, LONG
   reste inaccessible, et c'est le comportement actuel, correct en mode fail-closed.
4. **Fréquence lue par le port (D).** Choisir entre séances **demandées** (`weeklySessions`, déjà transmis par le
   planificateur et ignoré par le port Running) et séances **placées** (comportement actuel, prudent).
5. **RACE_PACE et STRIDES** : implémentation et valeurs gouvernées à produire, ou retrait des tables §R.
6. **Volume :** l'EASY progresse depuis la dernière dose réalisée (V19 / V23). Aucune cible de volume hebdomadaire
   par objectif n'existe (**D**). Le « volume adapté à l'objectif » n'est donc pas représenté aujourd'hui.

**Impact multisport mesuré** (étude RC3, profil A en 10 km, saisie complète) : les séances THRESHOLD ont l'importance
« clé » pour l'interférence Musculation. L'organisation « espacement max. » perd **6 séries directes de bas du corps
prescrites par semaine** (22,5 → 16,5) quand la qualité apparaît. Activer la qualité Running déplacera donc le volume
Musculation : à valider en même temps.

## Mission 2 — Récupération intra-Musculation : représentation et gouvernance TEST_ONLY

### 2.1 Constat

- **Aujourd'hui, deux séances de Musculation ne s'influencent pas pour la récupération.** Le moteur ne lit, comme
  voisines, que les **autres** disciplines (`neighboursOf` exclut le même sport). Le bilan hebdomadaire signale ce
  point comme bloqué : `same_discipline_recovery` dans `PLAN.WEEK_PRESCRIPTION.blocked`.
- **Conséquence :** deux Full Body consécutifs sont prescrits **comme** deux Full Body espacés (RC2 bis §1, point 4).

### 2.2 Proposition (`tests/rc3/intra-strength.ts`, jamais lue par l'application)

```
strength.recovery.intraDiscipline   (status TEST_ONLY, action observe_only)
  intensityBands   : [{ id, maxRir }] croissantes — bande d'un groupe = RIR cible le plus bas de ses séries directes
  recoveryHours    : { bande → heures | null }     null = NON RÉSOLU (aucun délai par défaut)
  groupOverrides   : { groupe → { bande → heures | null } }   (ex. mollets ≠ ischios)
  minDirectSets    : entier | null                  seuil de sollicitation (null = toute série compte)
  indirect         : 'observe_separately'           jamais additionné au direct
  declaredFatigue  : 'trace_only'                   tracée, jamais convertie en heures
```

Chaque observation porte :
- la séance précédente sollicitant le groupe, et la suivante ;
- l'écart **réel** en heures ;
- les séries directes et indirectes précédentes, et les séries directes suivantes ;
- la bande d'intensité et le délai résolu ou `null` ;
- le statut : `WITHIN_WINDOW` / `OUTSIDE_WINDOW` / `UNRESOLVED` / `BELOW_MIN_SETS` ;
- la fatigue déclarée au contrôle.

Garanties (tests S-1 à S-6) :

| test | garantie |
|---|---|
| S-1 | Full Body à 24 h et à 72 h donnent des observations différentes. |
| S-2 | Sans délai validé, **tout** reste `UNRESOLVED`. |
| S-3 | L'intensité compte : RIR inconnu ⇒ bande inconnue (non résolue) ; RIR 0 ⇒ bande plus exigeante. |
| S-4 | Direct et indirect sont séparés ; le délai est surchargeable par groupe. |
| S-5 | Fatigue tracée sans conversion ; séances non modifiées. |
| S-6 | Schéma fermé (seulement `TEST_ONLY`, `observe_only`, `observe_separately`) et paramètre absent de l'environnement Beta 0. |

### 2.3 Ce que l'observation montre (démonstration 72 / 48 / 24 h, 4 semaines, scénario équivalent)

| profil · organisation | observations directes « dans la fenêtre » / « hors fenêtre » | sans délai validé |
|---|---|---|
| A · RC1 | 17 / 43 | 60 non résolues |
| A · domine RC1 | 10 / 49 | idem |
| A · bas du corps max. | **32** / 28 | idem |
| A · espacement max. | 4 / 52 | idem |
| B · RC1 / bas du corps max. / espacement max. | 8 / 33, 15 / 36, 2 / 40 | idem |

L'observation distingue bien les organisations que le volume planifié récompensait à tort (« bas du corps max. »).
Les observations **indirectes** restent toutes `UNRESOLVED` : l'intensité d'un groupe secondaire n'est pas
représentée. C'est une limite assumée, rien n'est inventé.

### 2.4 Décisions sportives nécessaires avant tout usage

1. Bandes d'intensité et délais par bande, éventuellement par groupe. Aucun délai universel.
2. Seuil de sollicitation (séries directes minimales).
3. Statut de la sollicitation indirecte : ignorée, observée, ou comptée à part avec un délai propre.
4. Rôle de la fatigue déclarée : trace seule, ou allongement du délai, ce qui demanderait une valeur validée.
5. **Action** éventuelle : allègement, rotation des exercices, signal au planificateur. Aujourd'hui `observe_only` ;
   toute action relèverait d'une gouvernance Strength approuvée.

## Mission 3 — Comparaisons corrigées

### 3.1 Défaut corrigé

Le scénario 4 semaines de RC1 (`plan` de sim4) indexe ses événements par le **rang global** de la séance dans la
semaine. En S4, la séance de rang 5 est « manquée » **seulement si c'est une course**. Selon le placement, une course
est donc manquée ou non :
- RC1 : vendredi = Musculation, rien n'est manqué ;
- « bas du corps max. » : une course est manquée.

C'est prouvé par E-1. Les écarts « 7 contre 8 courses » de RC2 bis §1.2 venaient de là.

`planEquivalent` indexe chaque événement par **(semaine, sport, rang dans le sport)** :

| semaine | événements |
|---|---|
| S1 | matériel indisponible sur la 1ʳᵉ Musculation |
| S2 | récupération mauvaise sur la 2ᵉ Musculation ; fatigue élevée sur le CT |
| S3 | genou P2 déclaré **à chaque séance** : « Passer » dépendrait de la séance qui déclare en premier, donc du placement |
| S4 | épaule P1 à chaque Musculation ; **2ᵉ course** manquée |

Le registre (semaine, sport, rang, issue) des simulations est **identique** pour RC1 et pour les trois organisations
RC2 bis, profils A, B et E (E-2 ; colonne « équivalent à RC1 » = oui partout dans l'étude). Une différence restante
serait une différence **réelle**, par exemple une séance non placée ou reportée, et elle est listée, jamais masquée.

### 3.2 Mesures séparées (`measureRc3`, aucun indicateur composite)

- **Volume prescrit** (à la planification) et **réalisé** (séries validées au journal), **directs** et **indirects**
  en comptes bruts : aucune pondération ajoutée.
- **Bilan E1 de l'application** rappelé à part : la règle gouvernée, prévue, avec secondaire × 0,5. Il n'est pas
  présenté comme un volume utile.
- **Charge rapprochée** (observation) :
  - paires de séances de force à J+1 et J+2 partageant un groupe direct ;
  - séries directes partagées à J+1 ;
  - courses le lendemain d'une force bas du corps, et l'inverse.
- **Conflits résiduels M3.** Attention : RC1 a un M3 complet, les organisations imposées sont en détection seule.
  Ces deux chiffres ne se comparent pas.
- **Course :** archétypes réalisés et minutes ; séances manquées et non démarrées, avec leur sport et leur rang.

### 3.3 Résultats à séances équivalentes (moyenne / semaine, profil A, saisie historique)

| organisation | direct bas prescrit → réalisé | direct haut prescrit → réalisé | E1 app. bas | paires J+1 / séries partagées | course après force bas / force bas après course |
|---|---|---|---|---|---|
| RC1 | 32 → 25,2 | 23,2 → 20 | 30,2 | 6 / 66 | 6 / 3 |
| domine RC1 | 31,8 → 23,8 | 23,8 → 20 | 30,2 | 6 / 59 | 3 / 6 |
| bas du corps max. | 39,2 → 30,8 | 23,2 → 20 | 37,8 | 9 / **116** | 3 / 0 |
| espacement max. | **14** → 11,5 | 23,5 → 20,2 | 12 | 4 / **7** | 6 / 6 |

**Lecture :**
- L'écart prescrit → réalisé (−18 à −25 % sur le bas du corps) vient des **adaptations et reports réels** : genou
  P2 en S3, épaule P1 en S4. Il est le même pour toutes les organisations, ce que l'ancien scénario ne garantissait
  pas.
- En E (récupération dégradée à chaque contrôle), réalisé = prescrit : l'adaptation pour fatigue ne retire aucune
  série de travail.
- Le volume indirect du bas du corps est presque nul (0 à 0,5 série par semaine) ; celui du haut du corps vaut
  environ 9,5 séries par semaine.
- Le bilan E1 de l'application **exclut le bloc de force du CT**, d'où un bas du corps E1 inférieur au direct
  prescrit (RC1 : 30,2 contre 32). Les deux mesures ne se comparent pas terme à terme.

## Mission 4 — Plan d'implémentation par étapes

Chaque étape est **indépendante, désactivée par défaut**, et précédée de ses tests de non-régression. Aucune n'est
commencée.

| étape | contenu | tests de non-régression | impacts sur les quatre sports | décision à valider |
|---|---|---|---|---|
| **E0 — Banc de mesure** (fait ici) | scénario équivalent, mesures séparées, saisie de course paramétrable | E-1 à E-4 ; rc2bis I-3 (mesures RC2 identiques) ; rc2 I-2 | aucun (tests) | — |
| **E1 — Saisie Running** | distance demandée à l'inscription (facultative, expliquée) ; texte de fin de séance | migration d'un profil sans distance = comportement actuel ; R-1 inchangé sans saisie ; R-3 avec saisie ; E2E onboarding | Running : TEST puis qualité atteignables ; Musculation : interférence « clé » plus fréquente (−6 séries bas du corps / sem. mesurées) ; CT et HYROX : voisinage modifié | formulation produit ; TEST 10 km ou 5 km pour un P_R2 hybride |
| **E2 — Fréquence Running du port** | `weeklySessions` demandé ou placé (paramètre gouverné) | R-7 bascule seulement si le paramètre est présent ; semaines RC1 identiques sans paramètre | Running : LONG possible en 3× ; Planner : aucune modification | demandé ou placé |
| **E3 — Première exposition LONG** | `running.firstExposure.long` par niveau et objectif, candidat | R-5 bascule seulement avec la valeur ; TEST_ONLY refusé en PRODUCTION ; progression LONG existante inchangée | Running : sortie longue ; Musculation et CT : nouvelle voisine longue (impact locomoteur), à mesurer par le banc E0 | ancrage, valeurs par niveau, objectifs concernés |
| **E4 — Récupération intra-Musculation (observation)** | `strength.recovery.intraDiscipline` TEST_ONLY lu par la Beta 0 en **observation seule**, tracée dans le bilan | S-1 à S-6 ; semaine et séances identiques octet pour octet (aucune action) ; absent ⇒ trace absente | Musculation : trace seulement ; Planner : rien ; autres sports : rien | bandes, délais, seuil, indirect, fatigue |
| **E5 — Intra-Musculation (action)** | allègement ou rotation selon l'observation résolue, gouvernance Strength | non-régression complète Strength (S3–S5) ; aucun groupe sous `UNRESOLVED` ne bouge ; banc E0 avant / après | Musculation : volume utile ; CT : le bloc de force délégué partage la même source | toute action, après validation de E4 sur le terrain |
| **E6 — Puis seulement l'optimisation du Planner** | réutiliser le banc RC2 bis avec E1 à E5 | fronts RC2 bis recalculés à séances équivalentes | les quatre sports | choix du compromis (RC2 bis §6) |

**HYROX** n'est touché par aucune étape. Il hérite seulement d'un voisinage différent, via la course de qualité et
la sortie longue, que le banc E0 permettra de mesurer.

## Limites

- **Audit Running sur un profil hybride P_R2 / P_R3.** Les niveaux P_R0 et P_R1 sont bloqués par la densité V10 et
  le niveau minimal de qualité (P_R2) : c'est attendu.
- **Valeurs de démonstration intra-Musculation (72 / 48 / 24 h)** choisies pour rendre le mécanisme visible. Elles
  ne sont ni sourcées ni proposées.
- **Volume réalisé** = séries validées au journal. La simulation valide toutes les séries prescrites de la séance
  démarrée : l'écart vient des reports et adaptations, pas d'un abandon partiel.
- **Bloc de force du CT :** il est compté avec la Musculation (même règle de décomposition).

## Validation

- Tests ajoutés, dans `pnpm check` :
  - `running-audit` : 8 tests ;
  - `intra-strength` : 6 tests ;
  - `equivalence` : 4 tests.
- Étude : `RC3_STUDY=1 npx vitest run packages/app-core/tests/rc3/rc3-study.test.ts`.
- `pnpm check` : 2 699 tests réussis, 4 sautés (études à lancement explicite), 0 échec ;
- `pnpm kairo:build` : OK ;
- `pnpm kairo:e2e` : 221 vérifications ok, 0 échec, « E2E OK ».
