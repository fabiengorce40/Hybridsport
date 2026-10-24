# REKKA — RC5.1 : audit et conception Haut A/B et Bas A/B

**Statut :** audit en lecture seule, puis études en **copie jetable**.
- **Aucun moteur modifié, aucun contenu intégré, aucun déploiement.** La BÊTA déployée reste celle d'avant cette étude.
- Base : `claude/kairo-rc4-dev` (`9eb1a4c`), contenu Strength L1b-4 (`0.7.0-strength-l1b4`).
- Patch d'étude : `rc51-etudes/RC5.1-variantes-AB-etude.patch`. Mesures détaillées : `rc51-etudes/RC5.1-mesures.md`.

**Banc :** chemin réel de l'application (`rc4-sim` et banc qualité L0), 6 semaines.
- Les 8 profils RC4.6 (P1, P1b, P2, P3, P4, P5, S3, S4).
- 3 profils 4× complémentaires pour les interactions et le matériel :
  - S4H : Musculation 4× et HYROX 2× ;
  - S4C : Musculation 4× et Cross-training 2× ;
  - S4D : Musculation 4× avec haltères seulement.

## 1. Audit : ce que fait le moteur aujourd'hui

### 1.1 Composition de la semaine

- **1 à 3 séances :** Full Body seulement.
- **4 séances :** rotation Haut / Bas (×2), par ordre des dates.
  - Règle candidate de la spec 02 §5.1 (`strength.rules.weeklyComposition 0.1.0-candidate`).
  - La première séance porte le besoin le plus prioritaire de l'objectif.
- **5 séances et plus :** aucune composition (refus).

Parmi les 8 profils, **seuls P1b et S4 utilisent Haut / Bas.** P4 n'a pas de Musculation, les cinq autres sont en Full Body.

### 1.2 Groupes de choix et ancres

Un archétype déclare des **groupes de choix** : par exemple, en Haut, le principal est une poussée horizontale **ou** verticale. L'ordre de choix (`resolveSlots`) est le suivant :
1. ancre de progression déclarée ;
2. besoin pas encore présent dans la séance ;
3. besoin exposé le moins récemment ;
4. priorité de l'objectif ;
5. identifiant.

| Constat | Full Body | Haut / Bas |
|---|---|---|
| Alternance des principaux | **Oui** : squat ↔ soulevé de terre roumain, développé horizontal ↔ vertical, tirage vertical ↔ horizontal (9 / 9 sur 18 séances) | **Non** : développé couché principal **12 fois sur 12**, squat principal **12 fois sur 12**, soulevé roumain toujours secondaire |
| Cause | Aucun accessoire ne répète le schéma du groupe principal : l'exposition « la moins récente » alterne, deux ancres se créent puis alternent | L'**accessoire** de poussée verticale (Haut) et le **secondaire** charnière (Bas) exposent déjà l'autre schéma **à chaque séance**. L'exposition est lue par schéma moteur, sans tenir compte du rôle. Égalité ⇒ priorité de l'objectif ⇒ toujours le même. Une seule ancre se crée, ce qui fige le choix. |
| Variation dans la semaine (`planned_variation`, TEST_ONLY) | Sans objet | S4 Bas : « aucune variation gouvernée » 5 fois. Les deux séances de Bas de la semaine sont souvent identiques (9 sur 12 identiques à la précédente). |

### 1.3 Mesures de référence (6 semaines, séries par semaine, moyenne)

| Profil | Quadri | Ischios | Pecto | Dos | Épaules | Bras | Groupes sous le plancher (semaines) | Au-dessus du haut | Poussée / tirage | Durée moy. / max | Dépassements | R-A identiques |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | 7,5 | 8,5 | 13,7 | 10,5 | 13,6 | 17,0 | 13 | 6 | 18,3 / 10,5 | 51 / 63 | 0 | 18/18 |
| P1b | 9,2 | 8,2 | 12,3 | 10,2 | 15,2 | 18,3 | 3 | 8 | 19,5 / 10,2 | 44 / 60 | 0 | 24/24 |
| P2 | 10,7 | 11,7 | 13,7 | 10,5 | 14,0 | 17,0 | 5 | 12 | 18,3 / 10,5 | 57 / 64 | 0 | 18/18 |
| P3 | 9,2 | 9,8 | 13,2 | 9,8 | 13,4 | 16,4 | 14 | 7 | 17,8 / 9,8 | 51 / 64 | 0 | 18/18 |
| P4 | — | — | — | — | — | — | — | — | — | — | — | — |
| P5 | 4,3 | 4,3 | 13,2 | 10,8 | 14,0 | 16,8 | 15 | 6 | 18,3 / 10,8 | 47 / 70 | 0 | 18/18 |
| S3 | 10,7 | 11,7 | 12,8 | 10,2 | 14,1 | 16,5 | 8 | 12 | 18,0 / 10,2 | 53 / 63 | 0 | 18/18 |
| S4 | 16,3 | 12,2 | 12,3 | 10,2 | 15,2 | 18,3 | 6 | 12 | 19,5 / 10,2 | 48 / 60 | 0 | 24/24 |

**Autres constats de l'audit (communs à toutes les variantes, hors périmètre Haut / Bas) :**
- **Poussée / tirage ≈ 1,7 à 1,9.** Le dos reste au plancher (10). C'est un déséquilibre connu (lot L1, catalogue lot 4).
- **Progression des charges :** la simulation enregistre la charge prescrite avec des répétitions fixes. La progression y est donc faible (squat P1b : 40 kg, puis 42,5, puis 45 kg en 12 expositions). **Le nombre d'expositions par mouvement est la mesure fiable ici, pas l'ampleur des gains.**
- **Interactions :**
  - Course (P1b) : la séance de Bas du mercredi, au lendemain d'une course, est **toujours réduite** à 25–32 min (2 exercices).
  - HYROX (S4H) : 16 séances réduites, 5 conflits HYROX.
  - Cross-training (S4C) : 3 séances réduites (RIR seulement).
- **Douleur au genou P2 :** les 2 séances de Bas de la semaine sont **adaptées**. Le groupe de choix passe du squat au soulevé roumain.

## 2. Variantes étudiées (copie jetable)

Toutes les variantes sont des **surcouches de contenu versionné** du ruleset L1b-4 (`0.8.0-strength-rc51-*`). Les archétypes `str_upper` / `str_lower` sont conservés, donc les semaines existantes restent relisibles. Seule la rotation 4× change, en ordre cyclique : Haut A → Bas A → Haut B → Bas B.

| Variante | Haut A | Haut B | Bas A | Bas B | Changement moteur |
|---|---|---|---|---|---|
| **A — A/B figés** | Principal poussée horizontale ; secondaire tirage vertical ; accessoires poussée verticale et tirage horizontal | Principal poussée verticale ; secondaire tirage horizontal ; accessoires poussée horizontale et tirage vertical | Principal genou ; secondaire charnière | Principal charnière ; secondaire genou | Rotation cyclique à 4 archétypes (`composition.ts`) |
| **B — A/B avec contrepartie chargée** | Comme A, mais la poussée verticale devient un **secondaire** chargé | Comme A, poussée horizontale en secondaire chargé | Comme A | Comme A | Idem A |
| **C — A/B par préférence** | Mêmes groupes de choix qu'aujourd'hui, **membre préféré** = poussée horizontale / tirage vertical | Membre préféré = poussée verticale / tirage horizontal | Préféré : genou (principal), charnière (secondaire) | Préféré : charnière (principal), genou (secondaire) | Idem A, plus **un attribut facultatif de contenu `preferred`** sur un emplacement, et un critère de tri dans `resolveSlots` (après l'ancre). Aucun autre effet : sans l'attribut, résultat identique. |

## 3. Résultats

### 3.1 Non-régression Full Body

**P1, P2, P3, P4, P5, S3 : séances identiques octet pour octet dans les variantes A, B et C.** La rotation 3× et l'attribut `preferred` (absent du Full Body) n'ont aucun effet.

### 3.2 Profils 4× (séries par semaine)

| Profil | Var. | Pecto | Dos | Épaules | Bras | Quadri | Ischios | Sous plancher | Au-dessus haut | Poussée / tirage | Durée moy. / max | Dépass. | R-A |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S4 | réf. | 12,3 | 10,2 | 15,2 | 18,3 | 16,3 | 12,2 | 6 | 12 | 19,5 / 10,2 | 48 / 60 | 0 | 24/24 |
| S4 | A | 11,3 | 10,2 | 15,0 | 17,8 | 16,3 | 12,2 | 6 | 13 | 19,5 / 10,2 | 48 / 60 | 0 | 24/24 |
| S4 | B | 12,3 | 10,2 | **16,3** | 19,8 | 16,3 | 12,2 | 6 | **14** | **21,3** / 10,2 | 50 / 63 | 0 | 24/24 |
| S4 | **C** | 11,3 | 10,2 | 15,0 | 17,8 | 16,3 | 12,2 | 6 | 13 | 19,5 / 10,2 | 48 / 60 | 0 | 24/24 |
| P1b | réf. | 12,3 | 10,2 | 15,2 | 18,3 | 9,2 | 8,2 | 3 | 8 | 19,5 / 10,2 | 44 / 60 | 0 | 24/24 |
| P1b | **C** | 11,3 | 10,2 | 15,0 | 17,8 | 9,2 | 8,2 | 3 | 8 | 19,5 / 10,2 | 45 / 60 | 0 | 24/24 |
| S4H | réf. → **C** | 12,3 → 11,3 | 10,2 → 10,2 | 15,3 → 15,0 | 18,2 → 17,7 | 14,5 → 14,5 | 10,8 → 10,8 | 1 → 1 | 12 → 13 | 19,5 / 10,2 → 19,5 / 10,2 | 49 / 60 → 49 / 62 | 0 | 24/24 |
| S4C | réf. → **C** | 12,3 → 11,3 | 10,2 → 10,2 | 15,2 → 15,0 | 18,3 → 17,8 | 16,3 → 16,3 | 12,2 → 12,2 | 0 → 0 | 13 → 14 | inchangé | 51 / 60 → 50 / 60 | 0 | 24/24 |
| S4D (haltères) | réf. → **C** | 6,2 → 5,2 | 7,0 → 7,0 | 13,3 → 13,8 | 14,2 → 14,2 | 10,2 → 10,2 | 6,0 → 6,0 | 19 → 18 | 7 → 7 | 16,3 / 7,5 → inchangé | 40 / 55 → 39 / 55 | 0 | 24/24 |

**Constats :**
- **Volumes :** les séries par groupe suivent les cibles hebdomadaires gouvernées. Elles bougent donc peu. En A et C : pectoraux −1 série par semaine (toujours au-dessus du plancher 10), bras −0,5, quadriceps / ischios / dos inchangés.
- Le « + 1 semaine au-dessus du haut » vient des fessiers ou des bras, déjà au-dessus en référence.
- **B fait passer les épaules au-dessus du haut** (16,3 pour 16) et aggrave le ratio poussée / tirage (2,1).

### 3.3 Variété et continuité (S4 et P1b, identiques en A et C)

| Profil | Var. | Principaux distincts par semaine (Haut ; Bas) | Exercices distincts par semaine | Principaux sur 6 semaines | Exercice changé entre deux expositions d'un emplacement | Séances identiques à la précédente du même archétype |
|---|---|---|---|---|---|---|
| S4 | réf. | 1 ; 1 | 12,5 | développé couché ×12, squat ×12 | 39 / 122 | 9 |
| S4 | **C** | **2 ; 2** | **18,0** | développé couché ×6, développé militaire ×6, squat ×6, soulevé roumain ×6 | **33 / 113** | 20 |
| P1b | réf. | 1 ; 1 | 13,0 | développé couché ×12, squat ×12 | 25 / 107 | 0 |
| P1b | **C** | **2 ; 2** | **18,5** | 4 principaux ×6 | **20 / 103** | 19 |

- **La variété vient de l'alternance A/B dans la semaine** : 2 principaux par région au lieu d'un, et +40 % d'exercices distincts par semaine.
- **Moins de changements arbitraires** : chaque variante est stable d'une semaine à l'autre. C'est favorable à la progression.
- **Exemples de séances (S4, variante C) :**
  - Haut A : développé couché, tractions, rowing assis à la poulie, développé épaules machine, isolations.
  - Haut B : développé militaire à la barre, tirage vertical, rowing machine, développé machine.
  - Bas A : squat, soulevé de terre roumain unilatéral, isolations.
  - Bas B : soulevé de terre roumain, presse à cuisses, extension et flexion des jambes, fente bulgare, mollets.

### 3.4 Douleur, fatigue, matériel, interactions

| Contrôle (S4 et P1b, semaine 2) | Réf. | A | B | **C** |
|---|---|---|---|---|
| Douleur au genou P2 (2 séances de Bas) | **adaptées 2** | **reportées 2** | **reportées 2** | **adaptées 2** |
| Fatigue | adaptées 4 / 3 | identique | identique | identique |
| Course libre la veille | identique | identique | identique | identique |
| Haltères seuls (S4D) | 24 / 24 planifiées | 24 / 24 | 24 / 24 | 24 / 24 |
| HYROX (S4H) : séances réduites | 16 | 16 | 15 | 16 |

**A et B suppriment le repli du groupe de choix** : un genou douloureux bloque Bas A (squat obligatoire) et Bas B (genou secondaire obligatoire). **C le conserve** : à la douleur, le moteur choisit l'autre membre (soulevé roumain), comme aujourd'hui.

### 3.5 Migration d'un programme existant (variante C, bascule à la semaine 4)

- Semaines 1 à 3 : planifiées et relues avec `str_upper` / `str_lower`, sans changement.
- À partir de la semaine 4 : Haut A/B et Bas A/B.
- **Charges continues** pour le développé couché et le squat (connaissance des charges par exercice) : 40 kg et 42,5 kg conservés.
- Le développé militaire et le soulevé roumain, nouveaux en principal, partent de leur exposition connue (soulevé roumain 42,5 kg sur S4) ou d'une première séance de calibration.
- Les adaptations au démarrage restent identiques à la référence.
- **Progressions (tracks) :** elles sont liées à l'archétype. Les ancres de `str_upper` / `str_lower` ne sont plus déclarées après la bascule ; de nouvelles ancres naissent sur A et B. La charge ne repart pas de zéro, mais l'historique d'ancre change d'identifiant. **À vérifier dans l'application** (affichage « progression »).

## 4. Comparaison et recommandation

| Critère | A — figés | B — contrepartie chargée | **C — préférence** |
|---|---|---|---|
| Rotation réelle Haut A/B, Bas A/B | Oui | Oui | **Oui** |
| Complémentarité (horizontal / vertical, genou / hanche) | Oui | Oui, avec redondance (même exercice principal en A et secondaire en B) | **Oui** |
| Poussée / tirage, quadri / ischios | Inchangés | **Poussée en hausse** (2,1) | Inchangés |
| Volumes | Pecto −1 | Épaules au-dessus du haut | Pecto −1 |
| Variété sans changements arbitraires | Bonne | Bonne | **Bonne** |
| Continuité des charges | Oui | Oui | **Oui** |
| Durées | Sans dépassement | Sans dépassement, +2 min | **Sans dépassement** |
| Douleur, matériel | **Régression** (reports) | **Régression** | **Inchangés** |
| Full Body (6 profils) | Identique | Identique | **Identique** |
| Moteur | Rotation seulement | Rotation seulement | Rotation + attribut `preferred` (1 critère de tri) |

**Recommandation : variante C**, en contenu versionné `0.8.0`, avec la règle de rotation versionnée.

**Risques à accepter ou traiter :**
1. **Fréquence par mouvement divisée par deux** : chaque principal 1×/semaine au lieu de 2×. La fréquence par région reste 2×. La progression par mouvement avance moins vite en calendrier ; c'est surtout pertinent pour l'objectif « force ». *Option :* garder A/B pour hypertrophie et général, et la rotation actuelle pour l'objectif force (règle par objectif).
2. **Jour contraint toujours sur la même variante** : P1b, Bas A le mercredi (lendemain de course), réduit à 2 exercices. C'est préexistant, mais concentré sur le squat. *Option :* inverser A/B une semaine sur deux, ou placer la variante la moins sensible le jour contraint (règle de placement, étude séparée).
3. **Pectoraux −1 série par semaine** (au-dessus du plancher) ; poussée / tirage inchangé (1,9). Le déséquilibre tirage reste à traiter séparément.
4. **Ancres liées à l'archétype** : nouveau suivi à la bascule (charges conservées). À vérifier à l'écran.
5. **Changement moteur minimal** (attribut facultatif et un critère de tri), avec preuve de non-régression : Full Body identique, contenus antérieurs relus à l'identique.

## 5. Plan d'intégration proposé (après votre accord)

1. Contenu versionné `0.8.0-strength-rc51` : surcouche L1b-4 ajoutant 4 archétypes (C) ; `str_upper` / `str_lower` conservés. Registre de contenu : versions antérieures relues.
2. Moteur Strength :
   - attribut facultatif `preferred` (schéma `params`) ;
   - un critère de tri dans `resolveSlots` (après l'ancre) ;
   - rotation 4× en ordre cyclique (règle de composition versionnée `0.2.0-candidate`).
3. Tests à fournir :
   - Full Body identique (6 profils) ;
   - états antérieurs relus à l'identique (4 chemins de démarrage) ;
   - migration semaine 4 (charges conservées) ;
   - douleur genou / épaule, fatigue, matériel (haltères seuls, poids du corps) ;
   - R-A 0 divergence ;
   - durées ;
   - banc qualité figé ;
   - E2E mobile ;
   - listes fermées d'architecture.
4. BÊTA : mise à jour seulement après votre accord, données conservées.

**Décisions attendues :**
- Variante C ?
- Règle par objectif (force) ?
- Traitement du jour contraint ?
