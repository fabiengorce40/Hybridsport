# Reprise RC5 — Lot 4 : rotation Musculation Haut A / Bas A / Haut B / Bas B

- **Branche :** `claude/rekka-reprise-20261031`, locale.
- **Base :** `e7335d7` (lot 3). Arbre de travail propre au départ, aucun stash.
- **Décisions appliquées :**
  - D5 : toutes les données sources sont conservées et traçables ;
  - D6 : rotation A/B à 4 séances en hypertrophie, personnalisation et récupération respectées ;
  - D7, D9, D10 : protections des séances commencées, terminées et remplacées, reprises telles quelles.
- **R4 :** non intégré. Son conflit scientifique reste ouvert (§ 7).

## 1. Audit initial (phase A)

### 1.1 Chaîne existante
| Élément | Fichier | Constat |
|---|---|---|
| Composition de la semaine | `packages/strength/src/composition.ts` | Règle **candidate** : bande 1 à 3 séances → Full Body ; bande 4 → `str_upper` / `str_lower` en alternance. Au-delà : refus. |
| Archétypes | contenu `strength.archetypes` (L1b-4) | `str_upper` : principal poussée H ou V ; tirage secondaire H ou V ; accessoires poussée et tirage H ou V ; isolation ; tronc. `str_lower` : principal genou ou hanche ; secondaire hanche ou genou ; unilatéral, isolation, tronc, mollets. |
| Choix dans un groupe | `archetypes.ts resolveSlots` | Ordre : ancre déclarée, puis besoin absent de la séance, puis exposition la moins récente, puis priorité de l'objectif, puis identifiant. |
| Charges | `load.ts` | Charge déduite de l'**historique réel de l'exercice** (`recentExposures` filtrées par `exerciseId`), quel que soit l'archétype. Équivalence entre exercices proches déjà gouvernée (`transferred`, avec pénalité de confiance). Sans référence : calibration. |
| Suivis de progression | `model.ts buildEnv`, `app-core/progression.ts` | Un suivi est rattaché à un **archétype** et à un **emplacement** (`track.<archétype>.<emplacement>.<exercice>.<date>`). Un nouvel archétype ne voit aucun suivi existant. |
| Volume personnalisé | `engine.ts:368` | Le budget par séance divise la fréquence par le nombre d'archétypes `str_upper` / `str_lower` (noms codés en dur). |
| Zones prioritaires | `personalization.ts:47` | Les zones du bas du corps sont exclues de `str_upper` et inversement (noms codés en dur). |
| Récupération | `app-core/planning.ts:149-155` | Règle `recoveryHours` = 36 h (politique de personnalisation G2), appliquée **seulement en Full Body** (≤ 3 séances) et seulement aux profils personnalisés. À 4 séances : **aucun contrôle**. Classement Haut / Bas des séances passées par préfixe d'emplacement (`up.`, `lo.`). |
| Choix des jours (3A) | `strength-days.ts` | Même règle que le planificateur (Full Body seulement). |
| Contenus versionnés | `provisional-content.ts` (lot 1) | Registre : L1b-4 courant, L1-V3, F6, 4F. Personnalisation : nom historique pour L1b-4, nom dérivé `<base>+personalization-v1` pour toute autre base — **défaut trouvé** : ce nom est refusé par le contrôle SemVer du chargeur ; corrigé en `<base>.personalization-v1`. |
| Données | `model.ts` (v5) | `strength.tracks`, `strength.exposures` (séries réellement faites), `accessoryCounts`. |

### 1.2 RC5.1 (`019d8c8`, branche `rc4-dev`, jamais déployé)
- **Mécanisme :**
  - attribut de contenu `preferred` ;
  - rotation par objectif (`rotationByGoal`) et alternance hebdomadaire de l'ordre A/B (`alternateWeekly`, parité de la semaine ISO) ;
  - archétypes `str_upper_a/b`, `str_lower_a/b`, dérivés de `str_upper` / `str_lower` (mêmes blocs, emplacements, durées) ;
  - contenu `0.8.0-strength-rc51`.
- **Écart avec la demande :** RC5.1 associe en Haut A poussée **horizontale** et tirage **vertical** ; la demande associe poussée et tirage **horizontaux** en Haut A, et **verticaux** en Haut B.
- **Aucune build déployée** (BÊTA `bc19fb1`, ESSAI `5695917`, production `f9f7e2e`) ne contient RC5.1 : aucune donnée réelle ne porte son nom de version.
- **Limites signalées par son propre rapport :**
  - progression par exercice plus lente : un mouvement n'est plus exposé qu'une fois par semaine ;
  - ratio poussée / tirage 1,8 non corrigé ;
  - les dépendances aux noms d'archétypes ci-dessus n'étaient pas traitées.

### 1.3 Risques identifiés
1. Zones prioritaires mal placées : une priorité « fessiers » ajoutée aux séances Haut A/B.
2. Volume personnalisé mal réparti : le budget A/B serait divisé par 1 au lieu de 2.
3. Aucune récupération contrôlée à 4 séances. Elle devient nécessaire quand un échange de jours (durée) ou une semaine perturbée rapproche deux séances de la même région.
4. Continuité de progression : suivis A/B neufs (D5).
5. Collision de version avec RC5.1.
6. Semaines déjà générées : elles doivent rester relues avec leur contenu d'origine.

## 2. Architecture retenue

| Sujet | Choix | Justification |
|---|---|---|
| Contenu | Nouveau ruleset versionné **`0.8.0-strength-hautbas-ab`**, surcouche déclarative de L1b-4, catalogue F6 inchangé. L1b-4 reste au registre. | Aucune collision avec `0.8.0-strength-rc51` (contenu différent) ni avec `0.8.0-strength-personalization-v1`. Les anciennes semaines sont relues et régénérées avec leur contenu d'origine (lot 1). |
| Archétypes | `str_upper_a`, `str_upper_b`, `str_lower_a`, `str_lower_b`, dérivés **sans modification** de `str_upper` / `str_lower` (mêmes emplacements, nombres de séries, leviers, durées). Seul ajout : le membre **préféré** de chaque groupe de choix. | Orientation sans exclusion : chaque séance Haut garde poussée **et** tirage, horizontaux **et** verticaux. Les autres membres restent des **replis** (douleur, matériel, exclusion). |
| Orientations | Haut A : principal poussée horizontale, tirage horizontal ; accessoires poussée verticale, tirage vertical. Haut B : le miroir. Bas A : principal genou (quadriceps, chaîne antérieure), secondaire hanche. Bas B : principal hanche (chaîne postérieure, fessiers, ischios), secondaire genou. | Conforme à la demande. |
| Composition | Mécanisme RC5.1 repris : rotation propre à l'objectif **hypertrophie** à 4 séances, ordre cyclique Haut A → Bas A → Haut B → Bas B, ordre B les semaines impaires. Force et forme générale : inchangées. 1 à 3 séances : Full Body inchangé. | D6 : rotation non imposée aux autres objectifs ni aux autres fréquences. |
| Dépendances aux noms | Fonction unique `archetypeRegion` (`upper` / `lower` / `full`) utilisée par la personnalisation, le budget de volume et la récupération. | Un `str_upper` historique se comporte exactement comme avant. |
| Récupération | Règle existante `recoveryHours` (36 h, G2) **étendue aux seules séances A/B** : refus si une séance de la **même région**, ou Full Body, a eu lieu ou est prévue moins de 36 h avant. Haut et Bas restent compatibles (notion `disjoint` existante). | Aucun nouveau délai. Déterministe. Le refus est signalé (« séance non proposée », raison `strength_recovery_window`), jamais un planning incohérent. Les séances Full Body et `str_upper` / `str_lower` ne changent pas. |
| Placement des jours | Pendant le premier placement, le planificateur réserve les jours sous l'archétype de **base** (`str_upper`), comme avant le lot. La variante A/B, et ses contrôles, n'est appliquée qu'à la composition, sur l'archétype réellement attribué à chaque date. | Correction d'un défaut trouvé en simulation : contrôlée pendant le placement, la récupération refusait définitivement des jours valides (archétype provisoire unique) et vidait des semaines. Les dates de séances sont désormais identiques à l'ancien comportement. |
| Continuité (D5) | § 4 | |
| Schéma | Un seul champ **facultatif** ajouté : `StrengthTrack.transferredFrom` (format v5 additif ; v5 n'est figé qu'à la fin de RC5). Aucune migration. | Seul moyen de distinguer une référence transférée de l'historique réel. |
| Défaut du lot 1 corrigé | Le nom dérivé d'un contenu personnalisé passe de `<base>+personalization-v1` à `<base>.personalization-v1`. | Le `+` était refusé par le contrôle SemVer du chargeur. Ce nom n'avait jamais été chargé ni enregistré : seule la base L1b-4, au nom historique, servait. |

## 3. Séances A/B (profil hypertrophie 4×, salle complète, contenu `0.8.0-strength-hautbas-ab`)

| Séance | Principal | Secondaire | Accessoires (selon temps et volume) |
|---|---|---|---|
| **Haut A** | Développé couché (poussée horizontale) | Tirage horizontal poulie | Développé épaules machine (poussée verticale), tirage vertical poulie, pec deck, tronc |
| **Haut B** | Développé militaire barre (poussée verticale) | Tractions (tirage vertical) | Développé machine (poussée horizontale), rowing machine (tirage horizontal), élévations latérales, pec deck |
| **Bas A** | Squat barre (genou, quadriceps) | Soulevé de terre roumain unilatéral haltère (hanche) | Leg curl, fente bulgare, leg extension, tronc |
| **Bas B** | Soulevé de terre roumain (hanche, chaîne postérieure) | Presse à cuisses (genou) | Leg curl, fente bulgare, leg extension |

Avec l'ancienne rotation Haut / Bas, le développé couché et le squat étaient principaux à **chaque** séance. Désormais, chaque mouvement principal revient une fois par semaine, et sa variante miroir l'autre fois. Part d'exercices communs entre A et B d'une même région, la même semaine : **13 %** (profil 1).

**Repli :** un membre préféré infaisable (matériel, exclusion, douleur) cède sa place à un autre membre du groupe. Avec haltères seuls, développé haltères et goblet squat exclus (profil 3), Haut A et Haut B ont le même principal (développé épaules haltères) et Bas A / Bas B la même charnière. La différenciation tombe à 52 % : c'est la limite du matériel, signalée et non contournée.

## 4. Stratégie de reprise des performances (D5)

**Constat :** la charge prescrite d'un exercice vient déjà de son historique **réel** (séries enregistrées), indépendamment du suivi. Un Haut A qui reprend le développé couché du Full Body ou de `str_upper` repart donc des charges réellement réalisées. Ce que perd un nouveau suivi, c'est son **état de progression**.

**Règles :**
1. **Inventaire :** à chaque création d'un suivi A/B (première exposition réelle), on recherche les suivis **ancres actifs** d'un autre archétype pour le **même exercice**.
2. **Correspondance fiable :** exactement **un** candidat, de même rôle d'emplacement (principal, secondaire) et de même modèle de progression.
3. **Transfert dans ce seul cas :**
   - la **borne de cycle** du candidat (`cycleStartLoadKg`, charge réellement réalisée en début de cycle) remplace celle du nouveau suivi si elle est plus basse (plafond de gain jamais élargi) ;
   - le nouveau suivi porte `transferredFrom { trackId, archetypeId, slotId }` et la raison `PROGRESSION.TRACK_TRANSFERRED` ;
   - les compteurs de réussite ne sont **pas** transférés : ils décrivent une autre prescription.
4. **Ambiguïté** (plusieurs candidats, rôle ou modèle différent) : aucun transfert, raison `PROGRESSION.TRACK_TRANSFER_SKIPPED` avec sa cause.
5. **Conservation :** aucun suivi ancien n'est modifié, clos ou supprimé. Les expositions (historique réel) ne sont jamais réécrites. Aucune charge n'est inventée : le transfert ne copie qu'une charge réellement réalisée.
6. **Montées en charge :** elles restent exclues (`isWork`, inchangé). `working`, `top_set` et `backoff` suivent les règles existantes.

## 7. R4

R4 (lecture souple des séances allégées) n'est pas une dépendance du lot 4 : aucune règle de progression n'est modifiée ici. Le conflit (« principaux du bas du corps bloqués chez le multisport dont toutes les expositions sont allégées ») reste **à arbitrer avant le lot 5**. Le profil 2 (HYROX) des simulations documente le comportement actuel, sans R4.

## 5. Simulations sur 12 semaines (rapport complet : `packages/app-core/tests/rc5/__reports__/lot4-simulations.md`)

- **Méthode :** chemin réel de l'application, 5 profils, 12 semaines. Athlète simulé : séries au haut de la fourchette, effort déclaré = effort prescrit + 1 répétition en réserve.
- **Observation algorithmique uniquement :** aucune conclusion physiologique.

| Profil | Séances planifiées / faites | Récupération même région (minimum) | A/B communs | Durée moyenne / max (limite 60) | Contraintes | Régénération stable | Suivis transférés |
|---|---|---|---|---|---|---|---|
| 1 Hypertrophie 4× (fessiers, cuisses, abdos) | 48 / 48 | 72 h | 13 % | 33 / 48 min | 0 écart | 12/12 | 0 (aucun suivi antérieur) |
| 2 Hybride 4× + HYROX 2×, 5 jours | 36 / 36 (12 non proposées : pas assez de jours) | 48 h | 1 % | 27 / 36 min | 0 écart | 12/12 | 0 |
| 3 Haltères seuls, 2 exclusions | 48 / 48 | 72 h | 52 % (replis) | 23 / 36 min | 0 écart | 12/12 | 1 (rowing haltère, entre Haut A et Haut B) |
| 4 Full Body 3× puis A/B 4× (S5) | 44 / 44 | 48 h | 12 % | 32 / 50 min | 0 écart | 12/12 | 4 (squat, soulevé roumain, tirage horizontal, tractions ← Full Body) |
| 5 Perturbé (2 manquées, 1 commencée, jours changés S7) | 48 / 45 | 48 h | 12 % | 31 / 45 min | 0 écart | 12/12 | 0 |

**Avant / après, mêmes profils**

L'ancien code utilise la rotation Haut / Bas commune. Moyenne hebdomadaire des séries prévues :

| Profil | Séries / séance | Dos | Pectoraux | Quadriceps | Ischios | Épaules | Charges des principaux |
|---|---|---|---|---|---|---|---|
| 1 | 8,1 → 8,7 | 2,9 → 2,9 | 6,1 → 6,3 | 8,1 → 8,1 | 7,2 → 7,2 | 7,1 → 7,8 | 40 → 40 avant comme après |
| 2 | 5,6 → 6,1 | 3,0 → 2,9 | 3,3 → 3,7 | 2,9 → 2,9 | 2,8 → 2,8 | 5,6 → 6,0 | 40 → 45 avant comme après |
| 3 | 5,8 → 5,8 | 3,8 → 3,8 | 1,2 → 2,2 | 4,1 → 3,2 | 2,0 → 2,9 | 6,7 → 6,6 | 40 → 42 avant comme après |
| 4 | 8,3 → 8,2 | 3,3 → 3,6 | 6,4 → 6,3 | 6,6 → 6,3 | 6,3 → 6,6 | 7,1 → 6,8 | 40 → 40 avant comme après |
| 5 | 8,2 → 8,2 | 2,9 → 2,8 | 6,9 → 6,4 | 8,2 → 7,3 | 6,2 → 6,3 | 7,9 → 7,8 | 40 → 40 avant comme après |

**Lecture :**
- Le lot 4 ne dégrade aucun profil : mêmes séances planifiées, mêmes durées, aucune baisse de charge, contraintes respectées.
- **Défauts préexistants, identiques avant le lot :**
  - le volume des profils **personnalisés** est très inférieur aux cibles (dos ≈ 3 séries / semaine pour une cible de 10) ; les premières séances de la semaine ont souvent une série par exercice ;
  - les charges des principaux restent figées sur 12 semaines dans 3 profils sur 5.
- Ces défauts relèvent du budget de volume personnalisé (V2.1) et de la progression. Ils ne sont **pas** corrigés ici (§ 10).

## 6. Tests

| Test | Résultat |
|---|---|
| `packages/strength/tests/unit/lot4-ab.test.ts` (repris de RC5.1 et adapté) | 11/11 |
| `packages/strength/tests/unit/lot4-region-transfer.test.ts` | 10/10 |
| `packages/app-core/tests/rc5/rc5-lot4-integration.test.ts` | 8/8 |
| `packages/app-core/tests/rc5/rc5-lot4-simulations.test.ts` (5 profils × 12 semaines) | 9/9 |
| `pnpm check` (TypeScript, lint, tests) | **3 161 réussis**, 0 échec |
| E2E `e2e-rc5-lot4-ab.mjs`, 360 et 390 px | 12 vérifications par largeur, OK |
| E2E parcours complet | **342** OK |
| E2E chronomètre (lot 2), phases (lot 3), personnalisation, jours, séance mobile, répétitions, hors ligne, icônes, sécurité des données | OK |
| E2E migrations, build V2.1 (v1–v3 → v5) et build `b850b98` (v1–v4 → v5) | 3/3 et 4/4 OK |

**Contenu détaillé :**
- **Test moteur A/B** (11 cas) : préférence, repli, ancre, rotation, ordre alterné, objectifs.
- **Régions et reprise des suivis** (10 cas) :
  - régions et variantes ;
  - orientation Bas A / Bas B ;
  - variantes dérivées sans modification ;
  - zones prioritaires par région ;
  - reprise fiable, borne de cycle la plus basse, ambiguïté, rôle ou modèle différent, absence de candidat.
- **Intégration** (8 cas) :
  - récupération : refus signalé, région opposée acceptée, anciens emplacements ;
  - semaine d'avant conservée et relue avec son contenu ;
  - séance commencée puis terminée jamais réécrite ;
  - export / import identique ;
  - rotation A/B limitée à l'hypertrophie à 4 séances (D6).
- **Simulations** (9 cas) :
  - rapport figé et invariants (aucune erreur, stabilité, contraintes) ;
  - rotation complète, variantes différenciées ;
  - récupération ≥ 36 h, durée ≤ 60 min ;
  - continuité Full Body → A/B, planning perturbé ;
  - déterminisme.

**Tests existants ajustés (justification) :**
- tests qui fixaient la rotation Haut / Bas en hypertrophie à 4 séances : ajustements de RC5.1 repris, noms de version du lot 4 ;
- `substitution-dom` : Haut A contient désormais les tirages horizontaux ;
- `strength-s4-adversarial` : un accessoire libre peut changer d'emplacement entre variantes (`ua.trunk` → `ub.trunk`), jamais d'exercice ; l'absence de remplacement reste vérifiée ;
- tests du lot 1 : contenu courant du lot 4 ; nom historique L1b-4 vérifié sur le registre.
- **Fixtures de données :** elles ne sont **pas** réécrites. Ce sont des données d'avant le lot 4, relues par la build V2.1. Les tests qui les comparent traduisent seulement les noms de version de l'état généré. Avant cela, une comparaison complète des profils Full Body, force et forme générale, ancien code contre nouveau, a montré que **seuls** les noms de version et les identifiants de trace diffèrent.

## 8. Anciennes sauvegardes
- Semaines déjà générées (L1b-4, personnalisation historique) : conservées, jamais recalculées en silence, relues et régénérées avec leur contenu d'origine (test d'intégration).
- Séances commencées ou terminées : inchangées (tests d'intégration et simulation, profil 5).
- Migrations v1 à v4 → v5 depuis la build V2.1 et la build `b850b98` : OK. Les anciennes builds refusent v5 sans réécrire.
- Export / import : identique à l'octet près (tests d'intégration et E2E).

## 9. Fichiers modifiés

**Code :**
- `packages/strength/src/` : `archetypes.ts`, `codes.ts`, `composition.ts`, `context.ts`, `engine.ts`, `params.ts`, `personalization.ts`, `progression.ts`, `week-prescription.ts`.
- `packages/planner/src/ports.ts`.
- `packages/app-core/src/` : `planning.ts`, `progression.ts`, `provisional-content.ts`.
- `apps/kairo/src/present.ts`.

**Contenu :** `packages/strength/tests/fixtures/hautbas-ab.ts`.

**Tests nouveaux :**
- `packages/strength/tests/unit/lot4-ab.test.ts`, `lot4-region-transfer.test.ts` ;
- `packages/app-core/tests/rc5/lot4-profiles.ts`, `rc5-lot4-integration.test.ts`, `rc5-lot4-simulations.test.ts`, `__reports__/lot4-simulations.md` ;
- `apps/kairo/scripts/e2e-rc5-lot4-ab.mjs`.

**Banc :** `packages/app-core/tests/rc4-audit/rc4-sim.ts` (12 semaines, crochets facultatifs).

**Tests ajustés :** voir § 6.

**Rapports régénérés :** banc qualité, scénario A, matrice RC4, tailles d'état.

**Documentation :**
- ce document ;
- correction du § 1 du lot 1 (`04-RC5-LOT1-MIGRATION-V5.md`) ;
- captures `captures-lot4/`.

## 10. Risques résiduels et décisions à arbitrer
1. **Volume personnalisé très inférieur aux cibles** (préexistant, toutes rotations). Budget hebdomadaire réparti entre séances déjà générées ; premières séances à une série par exercice. Décision à prendre : revoir le budget V2.1 (règle de personnalisation G2), dans un lot dédié.
2. **Charges figées** chez plusieurs profils personnalisés sur 12 semaines (préexistant). À examiner avec R4 et la progression.
3. **R4 toujours ouvert** (§ 7) : à arbitrer avant le lot 5.
4. **Fréquence déclarée non atteinte** (profil 2 : 3 séances placées sur 4) : la rotation donne Haut A, Bas A, Haut B. Le bas du corps ne reçoit alors qu'une séance par semaine, en alternant A et B. C'est le même comportement qu'avant avec Haut / Bas. Options :
   - repli Full Body quand moins de 4 jours sont placés ;
   - signalement à l'utilisateur ;
   - statu quo.
5. **Matériel limité :** la différenciation A/B baisse (52 %) quand les membres préférés sont infaisables. Le repli est voulu ; il faudra peut-être enrichir le catalogue haltères.
6. **Appariement choisi** (Haut A horizontal / horizontal) : décision produit de ce lot, différente de RC5.1 (horizontal / vertical). Les deux sont défendables : regrouper un même plan ou alterner les plans. Le ratio poussée / tirage reste supérieur à 1,8 (préexistant, rapport RC5.1).
7. **Récupération :** une séance A/B à moins de 36 h d'une séance de la même région est **refusée et signalée**, pas déplacée. Le cas se présente après une séance déplacée ou rattrapée la veille. Option : chercher un autre jour (évolution du planificateur).
8. **Bascule automatique :** un utilisateur V2.x en hypertrophie à 4 séances passe en A/B à sa prochaine semaine générée (D6). Les semaines existantes ne sont pas touchées. Aucune option de refus n'est proposée.
9. **Règle de composition et contenu :** tous deux restent **candidats** (non approuvés). Ne pas déployer de build intermédiaire avant la fin de RC5 (lot 1).
