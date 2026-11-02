# Reprise RC5 — Lot 4.1 : audit et optimisation de la programmation Musculation

- **Branche :** `claude/rekka-reprise-20261031`, locale. Aucun push, aucune fusion, aucun déploiement.
- **Commit de référence :** `0680831` (lot 4).
- **R4 :** non intégré, toujours ouvert. Aucune correction de ce lot n'en dépend (§ 13).
- **Rapports conservés :**
  - `packages/app-core/tests/rc5/__reports__/lot41-simulations.md` : comparatif de 14 profils sur 12 semaines ;
  - `lot41-reference-lot4.json` : référence figée, produite par le même banc sur `0680831` ;
  - `lot4-simulations.reference-0680831.md` : rapport du lot 4, copie figée ;
  - `lot4-simulations.md` : même rapport, régénéré avec le code du lot 4.1.

## 1. État Git initial

| Élément | État constaté avant toute intervention |
|---|---|
| Branche locale | `claude/rekka-reprise-20261031`, HEAD `0680831`, arbre de travail propre, aucun stash |
| Historique local | `a443b4f` (lot 1), `bbd934e` (lot 2), `e7335d7` (lot 3), `0680831` (lot 4) : aucun n'est poussé |
| BÊTA `claude/rekka-beta` | `bc19fb1`, inchangée (vérifiée aussi en fin de lot) |
| Production `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e`, inchangée (vérifiée aussi en fin de lot) |
| Divergence | aucune |

## 2. Audit des causes racines (phase A)

**Chaîne auditée :** profil → objectif → priorités → fréquence → volume cible → exercices → séries → durée → récupération → progression.

**Mesures :** banc instrumenté (`lot41-bench.ts`) et traces de raisons (`DOSE.*`, `PLAN.*`), sur le code du lot 4 puis sur le code courant.

### 2.1 Volume personnalisé : ~3 séries de dos par semaine pour une cible de 10

Le budget de séries d'un exercice est calculé dans `engine.ts`, fonction `build` : part de séries par groupe musculaire, issue de `strength.volume.weeklyRange`. Quatre défauts du moteur, et une question scientifique :

| # | Cause | Mécanisme | Profils touchés | Ancienneté | Risque à corriger |
|---|---|---|---|---|---|
| V1 | **Veto du minimum** | Le budget est le **minimum** des parts de **tous** les groupes touchés, y compris les groupes **secondaires** (poids 0,5). Exemple : un tirage horizontal touche le dos (principal) et les bras. Bras déjà à leur cible → part des bras = 0 → **0 série de plus pour le dos**, alors que le dos est à 3 sur 10. | Tous les profils personnalisés. Effet maximal en A/B : dos, pectoraux, quadriceps et ischio-jambiers. | Personnalisation V1 (V2.1, 29/10). Aggravée au lot 4 : 4 séances par région, poussées et tirages répartis. | Plus de séries : il faut garder la borne haute de chaque groupe et le budget de durée. |
| V2 | **Double comptage d'une semaine sur l'autre** | La part de cible se calcule sur `hardSets.d7`, une fenêtre glissante de 7 jours. Le lundi, cette fenêtre contient la semaine précédente : le volume déjà fait **la semaine d'avant** est retranché de la cible **de cette semaine**. | Tous, à partir de la deuxième semaine. | V2.1. | La fenêtre glissante sert aussi de garde de récupération : elle ne doit pas disparaître en silence. |
| V3 | **Sonde de placement irréaliste** | Le planificateur réserve les jours avec un archétype de placement unique (`rotation[0]`). Les quatre séances A/B étaient sondées comme quatre `str_upper`, ce qui fausse le budget « séances restantes de la région ». | A/B (lot 4), Haut/Bas (force, forme générale). | Composition S1. Devenu visible avec le lot 4. | Changer la sonde change l'ordre de placement d'un sport voisin (§ 12, L4-2). |
| V4 | **Emplacement obligatoire privé de sa série** | Apparu pendant ce lot, une fois V1 corrigé : un exercice antérieur de la séance peut consommer toute la borne haute d'un groupe. L'emplacement obligatoire suivant n'a plus de série, d'où un refus terminal (`weekly_volume_budget_exhausted`). | Forme générale 3× (banc). | Introduit puis corrigé dans ce lot ; absent des builds existantes. | — |
| S1 | **Décompte plein des synergistes** (question **scientifique**, non corrigée) | Le catalogue déclare les triceps et biceps **principaux** des développés et tirages, et les fessiers principaux du squat et du soulevé roumain. La borne haute des bras (14) et des fessiers (14) bride donc le dos, les pectoraux, les quadriceps et les ischio-jambiers. | Tous. | Catalogue F6. | Changer le catalogue ou le décompte change la science du moteur : **arbitrage requis** (§ 13, Q1). |

### 2.2 Progression des charges : stagnation observée au lot 4

- **Aucun défaut du moteur** de progression. Le moteur est inchangé dans ce lot, et les chiffres sont identiques entre le lot 4 et le lot 4.1 sur 5 scénarios (§ 7).
- **Cause de la stagnation observée :** le banc du lot 4 simulait un athlète à **capacité constante**, qui rend toujours exactement l'effort prescrit plus 1 RIR, à partir de **40 kg pour tous les exercices**.
- **Effet :** à 40 kg, le pas de 2,5 kg représente 6,25 % de la charge. La réserve (RIR) est entière et l'e1RM est lissé par médiane ; il faut deux preuves (`evidenceRequired` 2).
- **Conclusion :** aucune progression ne peut être « méritée » par cet athlète. C'est un artefact du banc.
- **Correction du banc (et non du moteur) :** athlète à capacité réelle (`capacityAthlete`), charges de départ réalistes (`START_KG`).

### 2.3 Équilibre poussée / tirage : 1,8–1,9 observé

- **Causes :** la même que V1. Les tirages (dos principal, bras secondaires) étaient bloqués par le veto des bras, tandis que les poussées pouvaient encore progresser grâce aux épaules.
- **Mesure du lot 4 :** 1,4 à 1,5 par schéma moteur principal sur les profils A/B, et jusqu'à 2,3 en pectoraux / dos. Le 1,8 du rapport RC5.1 comptait aussi les isolations.
- **Orientations :** non en cause (Haut A horizontal, Haut B vertical).

### 2.4 Planification : semaines hybrides à 3 séances sur 4, refus sans alternative

| Constat | Cause | Profils |
|---|---|---|
| 12 séances sur 48 non proposées (`PLAN.PLANNER.NOT_ENOUGH_DAYS`) | 4 Musculation + 2 HYROX (ou 2 Course) sur 5 jours disponibles, une séance par jour : la 4ᵉ séance de Musculation n'a pas de jour. | L4-2, L41-RUN. Identique au lot 4 et au lot 4.1. |
| La séance non proposée est **toujours** la dernière de la rotation, donc toujours une séance **Bas** | Ordre de tour de rôle du planificateur : Haut A, Bas A, Haut B, puis Bas B (ou l'ordre B). | Hybrides : quadriceps 3,8 et ischio-jambiers 2,8 séries pour des cibles de 8 et 6. |
| Refus « récupération » sans recherche d'un autre jour | La garde de 36 h par région (`planning.ts`) refuse au niveau du port. Pour le planificateur, ce refus est **terminal**, et aucun autre jour n'est essayé. | Séance déplacée la veille (test du lot 4). |

Ces constats relèvent du **planificateur**. Ils ne sont pas corrigés ici, conformément à la demande (pas de nouveau planificateur). Les options sont étudiées au § 4.4.

## 3. Défauts historiques

1. **V1 et V2** existent depuis V2.1 et sont présents dans la BÊTA `bc19fb1` : semaines nommées `0.8.0-strength-personalization-v1`. Ces semaines sont **relues et régénérées avec leur contenu d'origine**, politique 1.0 strictement inchangée. Aucune prescription historique n'est réécrite.
2. **Sonde de placement (V3) :** défaut latent depuis S1, rendu visible par le lot 4.
3. **Test d'architecture rouge au commit du lot 4.** `crosstraining-architecture.test.ts` (liste fermée des fichiers Strength modifiés) **échoue sur `0680831`**, vérifié dans un arbre de travail isolé.
   - Le lot 4 avait ajouté trois fichiers de **test** (`hautbas-ab.ts`, `lot4-ab.test.ts`, `lot4-region-transfer.test.ts`) sans les inscrire dans la liste.
   - La phrase « tests verts » du rapport 07 était donc **inexacte** sur ce point.
   - Correction : inscription explicite, avec la mention de l'omission (aucun fichier `src` concerné).
4. **L'E2E `e2e.mjs` échoue** (« deux réalisations enregistrées ») quand il est lancé contre la build **BÊTA** avec `E2E_REKKA_V2=1`. L'échec est **identique** sur `0680831`. Le script se lance contre la build standard (`pnpm build`, port 4173), où il passe sur les deux commits (§ 9).

## 4. Corrections

### 4.1 Volume : politique de personnalisation 1.1 (`allocation: 'primary_need'`)

- **Champ :** `allocation` est un champ facultatif et **versionné** du paramètre `strength.personalization` (`personalization-contract.ts`).
- **Politique 1.0 :** elle n'a pas ce champ et le moteur suit le chemin historique, **à l'identique**.
- **Politique 1.1 :** `PERSONALIZATION_V1_1` est identique à la 1.0, sauf la version (`1.1.0-candidate`) et `allocation` (vérifié par test).

| Règle 1.1 | Effet | Corrige |
|---|---|---|
| Le besoin d'un exercice vient de ses groupes **principaux** : le plus grand besoin restant parmi eux. | Un groupe indirect déjà satisfait ne bloque plus un muscle principal sous sa cible. | V1 |
| La **borne haute** hebdomadaire de **chaque** groupe touché reste une borne stricte, pondérée (secondaire × 0,5). | Le volume ne monte jamais au-delà de la borne haute. Le dépassement n'est ni silencieux ni possible. | Récupération |
| Borne haute **répartie** entre les séances restantes de la région, comme la cible. | Une séance ne consomme jamais seule la borne haute de la semaine. | — |
| Cible et borne comptées sur la **semaine civile** de la séance (`hardSets.week` : réalisé depuis le lundi, plus le prévu des séances antérieures). Ce champ n'est fourni par app-core **que** sous la politique 1.1. | La semaine précédente n'est plus recomptée. La récupération entre séances reste assurée par la règle de région (36 h), inchangée. | V2 |
| **Réserve** d'une série par emplacement **obligatoire** restant dans la séance. | Aucun refus par épuisement intra-séance. | V4 |
| Cible inatteignable sans dépasser la borne haute d'un **autre** groupe : raison `DOSE.VOLUME_LIMITED {exerciseId, group, by, wanted, allowed}`. Elle est persistée, puis reprise dans le bilan hebdomadaire (`limitedBy`, statut `reduced_by_constraint`). Le Programme ajoute la mention « · repère inatteignable sans dépasser la borne haute de : … ». | Cible impossible **signalée**, jamais compensée en silence ni présentée comme atteinte. | Signalement |

- **Versionnement :** le contenu courant personnalisé s'appelle `0.8.0-strength-hautbas-ab.personalization-v1-1`, politique 1.1.
  - Le nom du lot 4 (`….personalization-v1`) n'a jamais quitté le poste local : aucune donnée persistée ne le porte.
  - Le contenu L1b-4 garde `0.8.0-strength-personalization-v1` et la politique 1.0.
- **Pas de cible universelle à 10 :** cibles et bornes restent celles de `strength.volume.weeklyRange`, mises à l'échelle par niveau, objectif, contexte hybride et priorités (inchangé).
- **Séries non comptées :** montées en charge et séries facultatives (vérifié par recomptage indépendant, test § 9).
- **Séries indirectes :** pondérées par `secondaryWeight` (0,5), sans double comptage.

### 4.2 Sonde de placement réaliste (planificateur)

- `placementArchetypeId(weeklySessions, index)` renvoie l'archétype **au rang** `index` de la rotation (A/B, Haut/Bas), ramené à sa base (`str_upper_a` devient `str_upper`).
- Full Body (rotation à un seul archétype) : inchangé.

### 4.3 Progression

- Aucune modification du moteur (§ 2.2).
- Banc corrigé : athlète à capacité réelle, charges réalistes, 5 scénarios (§ 7).

### 4.4 Planification (phase E) : étude seulement, rien de modifié

| Option | Description | Avantages | Risques / prérequis | Avis |
|---|---|---|---|---|
| E1. Autre jour | Après un refus `strength_recovery_window`, essayer les jours suivants disponibles, avec le même contrôle de 36 h. | Supprime les refus « sans recherche ». | Le refus du port est terminal aujourd'hui ; il faut un statut « réessayable » côté planificateur. | Recommandée (petit changement du planificateur, proposition technique séparée). |
| E2. Réorganisation | Inverser l'ordre A/B de la semaine (B en premier) quand la séance de tête est refusée. | Reste dans la rotation validée. | Modifie l'ordre A/B en cours de semaine : à prévisualiser. | Possible, après E1. |
| E3. Redistribution A/B à 3 séances | Semaine hybride à 3 séances (jours insuffisants) : alterner **quelle** région perd une séance (Bas une semaine, Haut la suivante), ou passer à Haut / Bas / Full Body. | Corrige le déficit **systématique** du bas du corps des hybrides. | Choix scientifique et produit (composition à 3 séances en hypertrophie). | **Arbitrage requis** (§ 13, Q3). |
| E4. Replanification avec aperçu | Proposer le changement dans l'aperçu existant « Planning actuel / Planning proposé », avec confirmation. | Rien n'est modifié en silence ; séances commencées et terminées jamais déplacées. | Aucun : le mécanisme existe. | Support obligatoire de E1–E3. |
| E5. Avertissement seul | Afficher la cause du refus et le déficit de la région. | Immédiat. | Ne règle rien. | Minimum déjà en place (refus tracé et bilan « en dessous »). |

## 5. Justifications scientifiques

- **Décompte par groupe principal, secondaires pondérés :** c'est le principe déjà gouverné du dépôt. `science/principles.ts` : « le décompte fractionnaire des séries indirectes est la méthode la mieux soutenue » ; `secondaryWeight` 0,5. La politique 1.1 **applique** ce principe, qu'appliquait mal le veto du minimum. Elle n'ajoute **aucune** règle scientifique.
- **Borne haute stricte, répartie entre les séances :** bornes hebdomadaires existantes (`strength.volume`, statut `PROGRAMMING_HEURISTIC`, G2). Aucune valeur modifiée.
- **Semaine civile :** cible et bornes sont **hebdomadaires** par définition. La fenêtre glissante faisait compter deux fois la même semaine. La récupération entre deux séances reste gouvernée par `recoveryHours` (36 h, politique G2), inchangé.
- **Aucun paramètre sensible modifié :** cibles, bornes, poids, RIR, paliers, durées et règle de 36 h sont inchangés. Seul ajout : l'énumération `allocation`.
- **Progression :** aucune modification. Les seuils (`evidenceRequired`, palier de 2,5 kg, lissage) relèvent de R4 (§ 13).

## 6. Volume avant / après

Prévu = séries de travail pondérées, moyenne sur 12 semaines. Réalisé : athlète simulé qui fait toutes les séances.

### 6.1 Profil L4-1 (hypertrophie 4×, priorités fessiers, cuisses et abdominaux, 60 min)

| Groupe | Cible–haut | Prévu lot 4 | Prévu lot 4.1 | Réalisé lot 4.1 | Écart | Écart % | Cause |
|---|---|---|---|---|---|---|---|
| Pectoraux | 10–20 | 6,3 | 9,9 | 9,9 | −0,1 | −1 % | borne haute des bras |
| Dos | 10–20 | **2,9** | **8** | 8 | −2 | −20 % | borne haute des bras |
| Épaules | 8–16 | 7,8 | 9,7 | 9,7 | +1,7 | +21 % | atteinte |
| Bras | 6–14 | 6 | 13,8 | 13,8 | +7,8 | — | atteinte (borne haute) |
| Quadriceps | 11–18 | 8,1 | 11 | 11 | 0 | 0 % | atteinte |
| Ischio-jambiers | 9–14 | 7,2 | 9 | 9 | 0 | 0 % | atteinte |
| Fessiers | 7–14 | 7 | 14 | 14 | +7 | — | atteinte (borne haute) |
| Mollets | 4–10 | 4 | 4 | 4 | 0 | 0 % | atteinte |
| Tronc | 5–10 | 5 | 6,5 | 6,5 | +1,5 | +30 % | atteinte |

### 6.2 Les 14 profils (séries prévues par semaine, lot 4 → **lot 4.1** ; cible entre parenthèses)

| Profil | Pectoraux | Dos | Épaules | Bras | Quadriceps | Ischios | Fessiers | Mollets | Tronc |
|---|---|---|---|---|---|---|---|---|---|
| L4-1 hypertrophie 4× | 6,3 → **9,9** (10) | 2,9 → **8** (10) | 7,8 → **9,7** (8) | 6 → **13,8** (6) | 8,1 → **11** (11) | 7,2 → **9** (9) | 7 → **14** (7) | 4 → **4** (4) | 5 → **6,5** (5) |
| L4-2 Musculation 4× + HYROX 2× | 3,7 → **7,2** (8) | 2,9 → **5,3** (8) | 6 → **7,1** (6) | 5 → **10** (5) | 2,9 → **3,8** (8) | 2,8 → **2,8** (6) | 2,1 → **3,8** (5) | 0,9 → **0,9** (3) | 2,8 → **3** (3) |
| L4-3 matériel limité | 2,2 → **5** (10) | 3,8 → **7** (10) | 6,6 → **7,5** (8) | 6 → **13,5** (6) | 3,2 → **8** (10) | 2,9 → **6** (8) | 6,1 → **14** (6) | 4 → **4** (4) | 2,5 → **3,4** (4) |
| L4-4 Full Body → A/B | 6,3 → **8,7** (10) | 3,6 → **8** (10) | 6,8 → **9,1** (8) | 6 → **13,8** (6) | 6,3 → **9,7** (10) | 6,6 → **8** (8) | 6 → **13,3** (6) | 3,7 → **3,8** (4) | 3,7 → **5,4** (4) |
| L4-5 planning perturbé | 6,4 → **9,9** (10) | 2,8 → **8** (10) | 7,8 → **9,8** (8) | 6,1 → **13,8** (6) | 7,3 → **10** (10) | 6,3 → **8** (8) | 6 → **12,1** (6) | 4 → **4** (4) | 4 → **6** (4) |
| L41-H3 hypertrophie 3× | 6,6 → **4,8** (10) ⚠ | 3,9 → **8,1** (10) | 5,7 → **7,8** (8) | 6,7 → **14** (6) | 3,4 → **9** (10) | 6,3 → **8** (8) | 6 → **13** (6) | 2,7 → **3,5** (4) | 3,5 → **4,3** (4) |
| L41-H4P priorités dos et épaules | 6,5 → **9** (10) | 2,9 → **10,9** (13) | 8,9 → **11,5** (10) | 6 → **14** (6) | 7,3 → **10** (10) | 6,3 → **8** (8) | 6 → **12,1** (6) | 4 → **4** (4) | 4 → **6** (4) |
| L41-RUN Musculation 4× + Course 2× | 3,7 → **7** (8) | 2,9 → **5,5** (8) | 6 → **7** (6) | 5 → **10** (5) | 3,1 → **4** (8) | 3 → **3** (6) | 2,1 → **4** (5) | 1 → **1** (3) | 2,8 → **3** (3) |
| L41-FORCE | 4 → **5** (7) | 2,9 → **5** (7) | 5,2 → **5,6** (6) | 4 → **9,5** (4) | 5,2 → **7** (7) | 4,2 → **6** (6) | 5 → **10** (4) | 3 → **3** (3) | 3 → **4,6** (3) |
| L41-FORME forme générale 3× | 3,7 → **6** (6) | 3 → **5,3** (6) | 3,4 → **5,3** (5) | 5,6 → **8** (4) | 2 → **5,5** (6) | 4,2 → **5** (5) | 4 → **8** (4) | 2 → **2** (2) | 2 → **2,8** (2) |
| L41-HIST historique de progression | 6,3 → **8,7** (10) | 3,6 → **8** (10) | 6,8 → **9,1** (8) | 6 → **13,8** (6) | 6,3 → **9,7** (10) | 6,6 → **8** (8) | 6 → **13,3** (6) | 3,7 → **3,8** (4) | 3,7 → **5,4** (4) |
| L41-STAG / L41-DIFF | comme L4-1 | | | | | | | | |
| L41-MISS séances manquées | comme L4-5 | | | | | | | | |

**Lecture du tableau :**
- **Cibles manquées restantes :** dos, pectoraux, quadriceps et ischio-jambiers sont désormais bornés par les bras ou les fessiers, et **signalés** (`limitedBy`, 2 à 3 groupes par profil).
- **Hybrides :** le bas du corps reste bas, faute de jours (§ 2.4, E3).
- **L41-H3, pectoraux (⚠, seul recul) :** limite **structurelle** du Full Body.
  - Il y a un seul emplacement de développé, qui alterne horizontal et vertical, et une seule isolation du haut (décision L1-V3), attribuée par ancienneté d'exposition.
  - Avec 3 séries de développé par séance, le besoin « pectoraux » paraît plus récent, et l'isolation va aux épaules (5,7 → 7,8).
  - Ce n'est pas une borne haute, donc le cas n'est pas signalé en `limitedBy`. Le bilan l'affiche toutefois « en dessous ».
  - Arbitrage : § 13, Q4.

## 7. Progression avant / après

Banc à capacité réelle, charges réalistes. **Observation algorithmique, et non gain physiologique.**

| Scénario (profil) | Squat | Développé couché | Soulevé roumain | Développé militaire | Lecture |
|---|---|---|---|---|---|
| Progresse +0,5 %/sem. (L4-1) | 100 → 105 / 100 → 105 | 70 → 72,5 / idem | 90 → 92,5 / idem | 45 → 47,5 / idem | Progression reconnue, identique |
| Progresse +1 %/sem., historique Full Body (L41-HIST) | 100 → 110 / idem | 70 → 77,5 / 77,5 → 85 | 90 → 100 / idem | 45 → 50 / idem | Reconnue. Couché : la charge de départ A/B est reprise de l'historique réel (suivi Full Body plus long) |
| Stagne (L41-STAG) | 100 → 100 / idem | 70 → 72,5 / idem | 90 → 90 / idem | 45 → 45 / idem | Aucune hausse artificielle. Couché +2,5 dès la première estimation, identique au lot 4 |
| En difficulté −1 %/sem. (L41-DIFF) | 100 → 92,5 / idem | 70 → 65 / idem | 90 → 82,5 / idem | 45 → 42,5 / idem | Baisse autorégulée, jamais de hausse |
| Séances manquées (L41-MISS) | 100 → 105 / idem | 70 → 72,5 / idem | 90 → 95 / idem | 45 → 47,5 / idem | Aucune hausse « parce que le temps passe » |
| Hybride HYROX (L4-2) | 100 → 102,5 / **100 → 105** | 70 → 75 / idem | 90 → 95 / idem | 45 → 47,5, 1 baisse / idem | Une baisse en S8, identique au lot 4 : palier de 2,5 kg (5,5 % à 45 kg) supérieur à la capacité simulée, d'où des répétitions manquées et une réponse autorégulée attendue |

- **Arrondi :** 2,5 kg partout, cohérent.
- **A/B :** aucun suivi interrompu. Les principaux changés d'une occurrence à l'autre restent 0 en A/B, comme au lot 4.
- **Anciennes performances :** jamais modifiées (tests § 9).

## 8. Comparaison des profils sur 12 semaines (lot 4 → lot 4.1)

| Profil | Refus | Durée max (limite) | Même région < 36 h | Groupes sous la cible | Signalés « borne haute » | Poussée / tirage (schéma) | Pectoraux / dos | Genou / hanche | Principaux changés |
|---|---|---|---|---|---|---|---|---|---|
| L4-1 | 0 → 0 | 48 → 44 (60) | 0 → 0 | 5 → 2 | 2 | 1,40 → 0,94 | 2,17 → 1,24 | 1,00 → 1,33 | 0 → 0 |
| L4-2 | 12 → 12 | 36 → 34 | 0 → 0 | 7 → 6 | 2 | 1,06 → 1,06 | 1,28 → 1,36 | 1,08 → 1,00 | 0 → 0 |
| L4-3 | 0 → 0 | 36 → 34 | 0 → 0 | 6 → 6 | 2 | 1,07 → 1,43 | 0,58 → 0,71 | 1,09 → 1,33 | 0 → 0 |
| L4-4 | 0 → 0 | 50 → 52 | 0 → 0 | 7 → 4 | 3 | 0,98 → 0,91 | 1,75 → 1,09 | 1,06 → 1,50 | 22 → 22 |
| L4-5 | 0 → 0 | 45 → 44 | 0 → 0 | 5 → 2 | 2 | 1,47 → 0,94 | 2,29 → 1,24 | 1,06 → 1,01 | 0 → 0 |
| L41-H3 | 0 → 0 | 51 → 52 | 0 → 0 | 7 → 5 | 3 | 0,91 → 0,80 | 1,69 → 0,59 | 1,32 → 2,25 | 70 → 68 |
| L41-H4P | 0 → 0 | 45 → 46 | 0 → 0 | 5 → 2 | 2 | 1,40 → 0,56 | 2,24 → 0,83 | 1,06 → 1,01 | 0 → 0 |
| L41-RUN | 12 → 12 | 36 → 34 | 0 → 0 | 7 → 6 | 2 | 1,06 → 1,00 | 1,28 → 1,27 | 1,08 → 1,00 | 0 → 0 |
| L41-FORCE | 0 → 0 | 38 → 43 | 0 → 0 | 5 → 3 | 3 | 0,71 → 1,20 | 1,38 → 1,00 | 1,50 → 1,50 | 48 → 48 |
| L41-FORME | 0 → 0 | 36 → 42 | 0 → 0 | 5 → 2 | 3 | 1,00 → 0,78 | 1,23 → 1,13 | 1,00 → 2,20 | 68 → 68 |
| L41-HIST | 0 → 0 | 50 → 52 | 0 → 0 | 7 → 4 | 3 | 0,98 → 0,91 | 1,75 → 1,09 | 1,06 → 1,50 | 22 → 22 |
| L41-STAG / DIFF | 0 → 0 | 48 / 47 → 44 | 0 → 0 | 5 → 2 | 2 | 1,40 → 0,94 | 2,17 → 1,24 | 1,00 → 1,33 | 0 → 0 |
| L41-MISS | 0 → 0 | 45 → 44 | 0 → 0 | 5 → 2 | 2 | 1,47 → 0,94 | 2,29 → 1,24 | 1,06 → 1,01 | 0 → 0 |

**Observations :**
- **Refus :** aucun nouveau refus. Les causes sont identiques (`NOT_ENOUGH_DAYS` pour les hybrides).
- **Durées :** toutes dans la limite. Moyenne en hausse (L4-1 : 33 → 41 min), reflet du volume ajouté. Le maximum baisse parfois, car le volume est mieux réparti entre les séances.
- **Récupération et bornes :** aucune séance de la même région sous 36 h ; aucun groupe au-dessus de sa borne haute.
- **Poussée / tirage :** le déséquilibre du lot 4 est résorbé dans les profils A/B (0,94). L41-H4P (priorités dos et épaules) penche vers le tirage, comme voulu.
  - L4-3 (matériel limité) passe à 1,43 et L41-FORCE à 1,20 : à observer, mais aucun ratio universel n'est imposé (§ 13, Q5).
- **Genou / hanche :** la hausse en Full Body et en forme générale (2,2) vient des fessiers.
  - Le soulevé roumain atteint vite la borne haute des fessiers, pendant que les ischio-jambiers atteignent leur cible grâce au leg curl.
  - Même question scientifique S1.
- **Stabilité :**
  - principaux inchangés ;
  - accessoires distincts par archétype comparables (3,3 → 3,5 pour L4-1) ;
  - les changements « tous rangs » augmentent : l'ajout ou le retrait d'accessoires selon la semaine décale les rangs (lot 4 : L4-1 15, lot 4.1 : 25 ; L4-2 : 2 → 33).
- **Différenciation A/B :** la part d'exercices communs entre A et B monte avec le nombre d'accessoires (L4-1 : 13 → 30 % ; matériel limité : 52 → 75 %). Les principaux restent distincts (test du lot 4 « moins de la moitié en commun » toujours vert pour le profil qu'il couvre).
- **Hybride HYROX (L4-2), effet indirect de la sonde :**
  - Le 4ᵉ créneau de Musculation, non placé, est désormais sondé en « Bas ». L'ordre des séances HYROX change : la séance d'endurance de force passe la veille du Bas A.
  - La règle d'interférence existante (MODÉRÉE, `rir_only`, tracée par `PLAN.INTERFERENCE_ASSESSED`) relève alors l'effort de réserve du Bas A (+2 RIR).
  - Avec l'athlète à capacité réelle, le squat progresse quand même (100 → 105 kg, contre 102,5 au lot 4). Avec l'athlète « effort prescrit + 1 » du rapport du lot 4, il reste à 40 kg.
  - Arbitrage : § 13, Q6.

## 9. Tests

| Vérification | Résultat |
|---|---|
| `pnpm check` (typage, lint, tests) | **OK** : 282 fichiers, 3 186 tests réussis, 2 ignorés (préexistants) |
| Contrats Strength (`lot41-volume-allocation.test.ts`) | Politiques 1.0 / 1.1 ; énumération fermée ; contexte `week` facultatif et strict ; raison `DOSE.VOLUME_LIMITED` |
| Chemin réel app-core (`rc5-lot41-volume.test.ts`, 11 tests) | Versionnement 1.0 / 1.1 ; contexte `week` sous 1.1 seulement ; recomptage indépendant (montées en charge exclues, indirectes × 0,5, sans double comptage) ; bornes hautes ; volume relevé ; signalement persisté et `limitedBy` ; durée ; placement A/B, force, forme ; séance commencée jamais réécrite ; export / import ; déterminisme |
| Simulations comparatives (`rc5-lot41-simulations.test.ts`, 9 tests, rapport figé) | Aucun refus nouveau, aucune erreur ; durées ; récupération ; bornes hautes ; aucune baisse de volume hors liste fermée documentée (`L41-H3:chest`) ; dos et pectoraux relevés ; signalement ; principaux stables ; progression reconnue, aucune baisse ajoutée, aucune hausse en difficulté, stagnation identique au lot 4 |
| Simulations du lot 4 (`rc5-lot4-simulations.test.ts`) | Invariants du lot 4 **inchangés et verts**. Rapport régénéré, écarts expliqués (§ 6 à 8). Copie figée de l'ancien rapport conservée. |
| Tests mis à jour (justifiés) | `rc5-lot1-migration` (2) et `rc5-lot4-integration` (1) : nom de version `.personalization-v1-1`, puisque la politique 1.1 diffère de la 1.0 et que le nom doit le dire ; `planner-architecture` : constante justifiée (`// technical-constant:`) ; `crosstraining-architecture` : liste fermée complétée (§ 3.3) |
| DOM Programme (`rc5-lot41-volume-limited-dom.test.tsx`) | Mention « repère inatteignable » sur les seuls groupes limités, avec le groupe limitant |
| Interface, carte « volume de la semaine », 360 et 390 px (build BÊTA locale, onboarding réel) | 2 mentions « repère inatteignable… : Bras » (dos, pectoraux) ; aucun débordement de page ni de ligne ; aucune erreur JavaScript. Captures : `captures-lot41/lot41-360-volume.png`, `lot41-390-volume.png` |
| E2E rotation A/B (`e2e-rc5-lot4-ab.mjs`), 360 et 390 px | 24 vérifications OK (sans débordement, rechargement à l'octet près, hors ligne, aucune erreur JavaScript) |
| E2E lots 2 et 3 (chronomètre, phases) | 22 et 10 vérifications OK |
| E2E personnalisation, séance mobile, répétitions, jours Musculation, hors ligne, stockage auxiliaire du chronomètre | OK |
| E2E parcours `base`, `cross`, `hyrox`, `recovery`, `planning` | 5 sur 5 OK |
| E2E parcours complet `e2e.mjs` (build standard) | **310 OK**, sortie identique à celle de `0680831` (310 OK) |
| Migrations | Tests de migration v1–v4 → v5 (unitaires et d'intégration) verts dans `pnpm check`. E2E navigateur de migration (V2.1 → courant) **non relancé** : il exige une build historique et l'empreinte du commit, et ce lot ne touche ni `model.ts`, ni les migrations, ni le stockage. |

## 10. Compatibilité des données historiques

- **Format persistant :** v5, **inchangé**. Seuls ajouts dans les enregistrements générés : la raison `DOSE.VOLUME_LIMITED` dans les décisions persistées, et le nom de version `.personalization-v1-1`.
- **Semaines V2.1 / V2.2** (`0.8.0-strength-personalization-v1`) : relues et régénérées avec la politique 1.0 et le contexte sans `week`, donc **résultat identique** (test de versionnement).
- **Séances commencées et terminées :** jamais réécrites (tests du lot 4 et du lot 4.1). Performances, expositions et suivis : jamais modifiés.
- **Planning existant :** aucune modification sans régénération normale de la semaine courante (mécanisme inchangé). Pas de nouveau déplacement.

## 11. Fichiers modifiés

**Moteur et planification**
- `packages/strength/src/personalization-contract.ts` : champ `allocation` facultatif.
- `packages/strength/content/personalization-v1.ts` : `PERSONALIZATION_V1_1`.
- `packages/strength/src/engine.ts` : allocation `primary_need`, réserve des obligatoires, `DOSE.VOLUME_LIMITED`. Chemin 1.0 inchangé.
- `packages/strength/src/codes.ts` : déclaration de `DOSE.VOLUME_LIMITED`.
- `packages/strength/src/context.ts` : `hardSets.week` facultatif.
- `packages/strength/src/week-prescription.ts` : `limitedBy` et contrainte `volume_limited_by:<groupe>`.
- `packages/planner/src/ports.ts`, `packages/planner/src/planner.ts` : sonde par rang ; décision persistée `DOSE.VOLUME_LIMITED`.
- `packages/app-core/src/provisional-content.ts` : nom et politique 1.1 pour les bases non historiques.
- `packages/app-core/src/generate.ts` : `hardSets.week` sous la politique 1.1 seulement.

**Interface**
- `apps/kairo/src/strength/StrengthInsight.tsx` : mention « repère inatteignable », sans refonte graphique.

**Tests**
- Nouveaux : `packages/strength/tests/unit/lot41-volume-allocation.test.ts`, `packages/app-core/tests/rc5/rc5-lot41-volume.test.ts`, `rc5-lot41-simulations.test.ts`, `lot41-bench.ts`, `apps/kairo/tests/rc5-lot41-volume-limited-dom.test.tsx`.
- Modifiés : `rc4-audit/rc4-sim.ts` (athlète paramétrable, charges de départ), `rc5/lot4-profiles.ts` (profils exportés, `capacityAthlete`), `rc5-lot1-migration.test.ts`, `rc5-lot4-integration.test.ts`, `crosstraining-architecture.test.ts`.

**Rapports**
- `__reports__/lot41-simulations.md`, `lot41-reference-lot4.json`, `lot4-simulations.reference-0680831.md`, `lot4-simulations.md` (régénéré).

**Documentation**
- `docs/kairo/reprise/08-RC5-LOT4-1-QUALITE-PROGRAMMATION.md`, `docs/kairo/reprise/captures-lot41/`.

## 12. Risques résiduels

1. **Bras et fessiers à leur borne haute** dans la plupart des profils (13,8 à 14 séries) : sous-produit des polyarticulaires, avec le décompte plein des synergistes (S1). La borne haute est respectée, mais le volume total par séance augmente (L4-1 : +8 min en moyenne).
2. **L41-H3, pectoraux :** 6,6 → 4,8 (structure Full Body, § 6.2). C'est le seul recul ; il est documenté et limité par une liste fermée dans le test comparatif.
3. **Hybrides :** déficit systématique du bas du corps (séance Bas non proposée faute de jours), inchangé (E3).
4. **Sonde par rang :** elle change l'ordre HYROX de L4-2, avec plus d'effort de réserve sur le Bas A.
5. **Stabilité des accessoires « tous rangs » en baisse :** principaux inchangés. La rotation des accessoires dépend davantage du budget de la semaine.
6. **Différenciation A/B plus faible :** plus d'accessoires communs, surtout avec un matériel limité.
7. **Banc :** l'athlète simulé est un modèle (capacité exponentielle, RIR entier). Aucune conclusion physiologique ne peut en être tirée.
8. **Contenu et politique 1.1 :** **candidats**, non approuvés, comme les contenus des lots précédents.

## 13. Questions à arbitrer

- **Q1. Décompte des synergistes (scientifique, suspendu) :**
  - (a) catalogue : triceps, biceps et fessiers déclarés **secondaires** des polyarticulaires concernés ;
  - (b) décompte fractionnaire des synergistes même « principaux » ;
  - (c) statu quo, avec signalement.
  - Effet attendu de (a) ou (b) : dos, pectoraux, quadriceps et ischio-jambiers atteignent leur cible, et les bras ne saturent plus.
- **Q2. Sémantique de la borne haute :** semaine civile (choix 1.1, cohérent avec la cible) ou 7 jours glissants. La récupération entre séances est couverte par la règle de 36 h.
- **Q3. Semaine hybride à 3 séances sur 4 :** alterner la région sacrifiée, passer à Haut / Bas / Full Body, ou garder l'existant (E3).
- **Q4. Full Body 3×, pectoraux :** seconde isolation du haut ou isolation pectoraux préférée quand ils sont sous la cible. Cela touche la décision L1-V3 (une seule isolation du haut).
- **Q5. Équilibre poussée / tirage :** ce lot n'impose aucun ratio universel. Faut-il un garde-fou (signalement au-delà d'un seuil) pour le matériel limité et la force ?
- **Q6. Hybride HYROX :** conserver la sonde par rang (réaliste, sans refus) en acceptant l'ordre HYROX qui en découle, ou garder la sonde historique pour les semaines hybrides seulement.
- **Q7. Autre jour après un refus de récupération (E1) :** proposition technique séparée pour le planificateur, avec aperçu « Planning actuel / Planning proposé » et confirmation.
- **Q8. R4 :** seuils de progression (`evidenceRequired`, palier de 2,5 kg à faible charge, lissage). Rien n'a été modifié ; le constat du palier relatif (6,25 % à 40 kg, 5,5 % à 45 kg) est transmis à R4.

## 14. Commit

- **Commit local unique :** `RC5 lot 4.1 : …`, sur `0680831`. Son empreinte est donnée dans le rapport final (`git log -1`).
- Aucun push, aucune fusion, aucun déploiement. BÊTA `bc19fb1` et production `f9f7e2e` intactes.
