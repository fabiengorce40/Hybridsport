# KAIRO RC4 — Audit de cohérence sportive multisport

**Statut : audit en lecture seule.**
- Aucune règle sportive, aucune prescription, aucun moteur ni le planificateur n'ont été modifiés.
- Rien n'a été déployé. RC3 TEST (`a7c1e51`) et la production (`f9f7e2e`) sont inchangés.
- Branche de travail : `claude/kairo-rc4-dev`. Elle ne contient que le banc et ce rapport.

**Preuves exécutables** (`packages/app-core/tests/rc4-audit/`) :

| fichier | rôle |
|---|---|
| `rc4-sim.ts` | banc : chemin réel Beta 0, 6 profils × 6 semaines |
| `rc4-findings.test.ts` | 16 scénarios reproductibles. Ils figent le comportement actuel ; une correction les fera échouer volontairement |
| `rc4-matrix.test.ts` | régénère `__reports__/rc4-matrice.md` : calendriers, repos, enchaînements, volumes, structures, contenus |

## 0. Méthode

**Profils.** Intermédiaires, 7 jours disponibles (60 à 90 min), salle hybride complète, sauf mention contraire.

| profil | sports |
|---|---|
| P1 | Musculation 3× (prise de masse) + Course 2× (10 km) |
| P1b | Musculation 4× (Haut / Bas) + Course 2× (10 km) |
| P2 | Musculation 3× + Cross-training 2× (mixte) |
| P3 | Musculation 3× + HYROX 2× (focus équilibré) |
| P4 | Course 3× (semi) + HYROX 2× |
| P5 | les quatre sports : Musculation 3×, Course 2×, CT 1×, HYROX 1× |

En complément :
- matrice de faisabilité HYROX : 3 niveaux × 7 matériels ;
- contre-épreuves A/B : course libre, ressenti, effort déclaré.

**Chemin réel, 6 semaines**, avec réalisations entre les semaines :
- onboarding ;
- contrôle avant séance ;
- séries, efforts et chronos saisis ;
- fin de séance avec résultat structuré ;
- retour terrain ;
- courses libres ;
- semaine suivante planifiée par le programme.

**Athlète simulé « conforme »** :
- Musculation : toutes les séries faites, au haut de la fourchette ; effort déclaré = effort prescrit (variantes : +1 et +2 RIR) ;
- Course : faite comme prévu, avec la durée prescrite et une distance ;
- TEST : chronométré ;
- CT et HYROX : terminés, avec un résultat conforme au format.

**Scénarios de contrôle :**
- fatigue élevée à la 2e séance de la semaine 3 ;
- genou P2 à la 1re séance de la semaine 4 ;
- course libre longue (P1 en semaine 2 ; P4 en semaine 3).

**Réutilisé, non refait :**
- RC2 et RC2 bis : placement, organisations dominantes, règle des 36 h ;
- RC3-AUDIT : A1 à A15, D1 à D8 ;
- RC3.2 : faisabilité Cross-training par matériel et niveau.

Les points déjà connus sont seulement **re-mesurés** ici.

**Contexte à garder en tête :**
- Le contenu sportif est **provisoire**. La Musculation utilise le ruleset verrouillé 4F et le catalogue de test
  (`app-core/src/provisional-content.ts`).
- Le planificateur utilise les fenêtres d'interférence et les règles M3 **TEST_ONLY** (`app-core/src/beta0.ts:26-30`).
- Les tests verts ne prouvent pas la qualité sportive.

## 1. Ce qui fonctionne réellement

Vérifié sur 6 semaines par le chemin réel :

| domaine | constat |
|---|---|
| Planification | Toutes les séances demandées sont placées dans les profils P1, P1b, P2, P3 et P5, chaque semaine, sans erreur. Les fins de séance « comme prévu » sont acceptées par les contrats des moteurs (CT, HYROX, Course, Musculation). |
| Rotation HYROX (focus équilibré) | Les 5 rôles H2 tournent sur les semaines : capacité stations, endurance de force, conditionnement stations, course compromise, simulation partielle. |
| Course : TEST et références | Le TEST (5 ou 10 km) est programmé en semaine 1 quand la distance de la dernière course est connue. Le temps du TEST crée une référence, et la séance de seuil suit (D2). La sévère porte l'allure dérivée de la référence (RC3.5). |
| Repli A2 | Un TEST demandé sans distance redevient un footing, sans perte de séance (RC3.1). |
| Musculation : double progression | Les exercices à fourchette progressent en répétitions puis en charge. Exemple : développé machine 3×8 → 3×11-12 à 40 kg, puis 45 kg en S5. |
| Musculation : pistes | La piste du squat progresse (40 → 42,5 → 45 kg) quand l'effort déclaré est plus facile que la cible. La séance suit la piste avec une semaine de décalage, ce qui est normal : la semaine est composée le lundi. |
| Fatigue (A1) | Fatigue élevée : RIR +1 sur la séance persistée, sans retrait d'exercice (P2 S3). |
| Douleur | Genou P2 : la fente bulgare est retirée et remplacée par un mollet haltère (P2 S4). Course avec genou P2 : remplacée par le rameur, même structure (RC3.5). Une douleur qui met en pause bloque tout nouveau départ. |
| Interférence Musculation | La course et HYROX voisins allègent le bas du corps (genou et hanche), l'axial et la préhension. C'est tracé, à ±24, 48 et 72 h. |
| Arbitrage M3 | Les conflits entre sports sont détectés et affichés (P5 : Musculation ↔ HYROX, CT ↔ seuil). |
| Cross-training | Les formats varient (for time, AMRAP, EMOM). La faisabilité est vérifiée par le moteur (RC3.2). |
| Courses libres | Elles nourrissent le moteur Running : allure observée, TEST possible, dose de départ. |

## 2. Anomalies confirmées

Gravité :
- **P0** : risque pour la sécurité ou perte de données ;
- **P1** : fonction sportive cassée ou nettement incohérente pour un utilisateur réel ;
- **P2** : défaut sportif notable sans blocage ;
- **P3** : amélioration.

**Aucun P0.** Les exclusions liées à la douleur, la pause douleur et la conservation des données sont respectées dans
tous les scénarios.

Nature :
- **Bug** : défaut technique ;
- **Règle** : règle sportive manquante ;
- **Gouv.** : décision de gouvernance nécessaire.

### Synthèse

| # | gravité | nature | anomalie |
|---|---|---|---|
| F1 | **P1** | Bug | Course : aucune progression en Beta 0, faute de ressenti transmis |
| F2 | **P1** | Règle + Gouv. | Une course libre longue devient la dose des footings et vide la semaine suivante |
| F3 | P2 | Règle | La charge des courses libres est ignorée par les autres sports |
| F4 | **P1** | Gouv. | Bas du corps sacrifié par la course voisine (prise de masse) |
| F5 | P2 | Règle | Un volume au-dessus de la borne haute est déclaré « atteint » |
| F6 | P2 | Règle | Mollets jamais programmés |
| F7 | P2 | Gouv. | Progression de charge lente, et nulle en réussite exacte (exercices à répétitions fixes) |
| F8 | P3 | Gouv. | Variation intra-semaine perdue après la semaine 1 |
| F9 | P2 | Gouv. | Full Body à J et J+1 chaque semaine (A6, toujours présent) |
| F10 | **P1** | Règle + Gouv. | Aucun jour de repos garanti : 7 jours sur 7 pendant 6 semaines (P5) |
| F11 | **P1** | Gouv. | Interférence cardiovasculaire et conflits laissés en place |
| F12 | **P1** | Bug (avertissement) + Gouv. | HYROX débutant : aucune séance, sans avertissement ; HYROX avancé : un rôle impossible |
| F13 | P2 | Gouv. | Cross-training et HYROX : aucune progression sur 6 semaines |
| A4 | P1 | Gouv. | Pas de sortie longue pour le semi (re-mesuré, inchangé) |
| D8 | P2 | Gouv. | Fatigue sans effet hors Musculation (re-mesuré : seuil et HYROX « inchangés ») |

### F1 — Course : aucune progression en Beta 0 (P1, bug)

- **Scénario :** `rc4-findings` « F1 ». P4 sur 4 semaines, toutes les courses faites « comme prévu ».
- **Constat :**
  - Le seuil reste à 4 × 5 min (3 × 5 min en P1 et P5) et le footing à 30 min, 6 semaines de suite.
  - Toutes les réalisations Beta 0 portent `unexpectedDifficulty: 'UNKNOWN'`.
- **Cause :**
  - `finishProgrammeSession` (`app-core/src/beta0-app.ts:741`) n'envoie pas de `difficulty` au contrat Running, et
    `FinishInput.run` (`beta0-app.ts:694`) ne le prévoit pas.
  - La feuille de fin (`Session0.tsx`, `FinishSheet`) ne pose pas la question du ressenti pour la Course. Le retour
    terrain, lui, n'est jamais transmis aux moteurs, par conception.
  - Le moteur ne progresse qu'après deux séances « tolérées », c'est-à-dire avec un ressenti `EASIER` ou
    `AS_EXPECTED` (`running/src/wave3/progression.ts:59`).
- **Contre-épreuve :** même parcours, avec `difficulty: 'AS_EXPECTED'` transmis par `recordSessionExecution` ⇒ la
  structure progresse (test « contre-épreuve »).
- **Impact sportif :** préparation 10 km ou semi figée au niveau de la semaine 1, quel que soit le sérieux de
  l'athlète. Seul le chemin V0 hérité transmettait le ressenti.

### F2 — Course libre longue : elle devient la dose des footings (P1, règle et gouvernance)

- **Scénario :** `rc4-findings` « F2 ». P4, 80 min de course libre le dimanche de la semaine 3.
- **Constat :**
  - En S4, S5 et S6, **2 courses sur 3 ne sont pas planifiées** (`PLAN.RUNNING.TIME_EXCEEDED` : footing de 80 min
    pour 75 min disponibles).
  - La semaine passe sous la fréquence minimale, donc en **mode entretien** (`WEEK_MAINTENANCE_MODE`,
    `BELOW_MINIMUM_FREQUENCY`).
  - La **séance de seuil disparaît**.
  - La seule course restante est un footing de 80 min, toutes les semaines.
  - Témoin sans course libre : seuil + 2 footings.
- **Causes :**
  - Toute course libre est enregistrée « facile continue » (`app-core/src/app.ts:216`). Déjà signalé en RC3.4.
  - L'ancre de dose est la dernière séance du même type, sans limite (`running/src/wave2/history.ts:122`).
  - Le mode entretien est décidé sur les séances **placées** (`running/src/week/compose.ts:106`, D2 de RC3).
  - En P1, la course libre a lieu **avant** le footing du programme : elle n'a aucun effet. L'effet dépend donc du
    jour de la course libre.
- **Impact :** une sortie longue faite de sa propre initiative supprime la qualité et 2 séances sur 3, durablement,
  jusqu'à une nouvelle course plus courte.

### F3 — Charge des courses libres ignorée par les autres sports (P2, règle)

- **Scénario :** « F3 ». P2, 90 min de course libre la veille de la Musculation.
- **Constat :** séance de Musculation identique au témoin, sans allègement ni signal.
- **Cause :** les voisines du planificateur et de l'interférence Musculation sont les séances du programme
  (`app-core/src/planning.ts:228`, `recentOf`). Les courses libres ne sont lues que par le contexte Running.
- **Impact :** une sortie longue réelle la veille d'un Full Body n'allège rien.

### F4 — Bas du corps sacrifié par la course voisine (P1, gouvernance)

**Scénario :** « F4 ». Séries de travail par semaine, moyenne sur S1–S6 (cible en Musculation seule) :

| groupe | P1 (Course) | P5 (4 sports) | P1b (4×) | P3 (HYROX) | P2 (sans course) | cible |
|---|---|---|---|---|---|---|
| Quadriceps | **3,7** | **4,3** | 9,2 | 8,3 | 10,8 | 10 |
| Ischios | **5,3** | **4,3** | 8,2 | 8,8 | 11,2 | 8 |
| Mollets | 0 | 0 | 0 | 0 | 0 | 4 (F6) |

- **Cause :**
  - La séance clé de course est placée entre deux Full Body (lun M · mar seuil · mer M).
  - Chaque séance de Musculation reçoit donc `running@±24h:lower_knee:full`, et le bas du corps est retiré.
    Plus de 10 réductions de ce type sur 6 semaines (`strength/src/interference.ts:103`).
- **Aucune compensation :** statut `partially_satisfied` 6 semaines sur 6.
- **Impact :** pour un objectif de prise de masse, les quadriceps reçoivent environ 37 % de la cible. Le haut du
  corps, lui, dépasse la sienne (F5).
- **Rappel :** RC3-AUDIT A5 et D4 (compromis volume / protection des courses ; fronts RC2 bis) ; ici chiffré sur
  6 semaines.

### F5 — Volume au-dessus de la borne haute déclaré « atteint » (P2, règle)

- **Constat :**
  - Bras 16 à 18 séries pour une borne haute de 14 (tous les profils).
  - Épaules jusqu'à 18,5 séries pour 16.
  - Statut affiché : `achieved`.
- **Cause :** l'évaluation ne connaît que `achieved`, `reduced_by_constraint`, `unmet` et `no_target`
  (`strength/src/week-prescription.ts:162`, `:209` : prévu ≥ plancher ⇒ atteint).
- **Impact :** l'utilisateur et le moteur ignorent l'excès. Avec F4, l'équilibre haut / bas est inversé par rapport
  à une prise de masse équilibrée.

### F6 — Mollets jamais programmés (P2, règle)

- **Constat :** 0 série de mollets par semaine, dans tous les profils et toutes les semaines. Cible : 4.
- **Cause :**
  - Les mollets ne passent que par le créneau `fb.iso_lower`, **facultatif et unique** en Full Body
    (`strength/tests/fixtures/ruleset.ts:64`, contenu provisoire). Ce créneau va toujours au leg curl.
  - La sélection d'exercices ne cible pas les groupes en déficit.
  - Même avec deux créneaux en Haut / Bas (`lo.iso_lower`), aucun mollet n'est choisi.

### F7 — Progression de charge lente, nulle en réussite exacte (P2, gouvernance)

**Scénario :** « F7 ». Squat, 3 × 6, effort déclaré :

| effort déclaré | charge sur 6 semaines |
|---|---|
| = cible | 40 kg constant ; `DECISION_BLOCKED` (`exact_success_progression`) |
| cible + 1 RIR | 40 kg constant |
| cible + 2 RIR | 40 → 42,5 kg, puis plateau ; 45 kg seulement sur la piste en fin de S6 |

- **Cause :** modèle `autoregulated` (`strength/src/progression.ts:268`). L'e1RM est lissé par médiane, la charge est
  arrondie à l'inférieur au pas, et la réussite exacte n'a pas de règle gouvernée (S4).
- **Exercices à fourchette :** la double progression avance normalement (§1).
- **Impact :** les exercices principaux, ceux qui portent la prise de masse en bas du corps, progressent le plus
  lentement.

### F8 — Variation intra-semaine perdue après la semaine 1 (P3, gouvernance)

- **Constat :**
  - Haut / Bas : semaine 1 `upperA · lowerA · upperB · lowerB`, puis la **même** séance deux fois par semaine.
  - Full Body : A · B · C, puis A · B · A.
- **Cause :** les pistes ancrent les exercices. La variation intra-semaine est une règle TEST_ONLY, non appliquée
  (`variation: null`).

### F9 — Full Body à J et J+1 chaque semaine (P2, gouvernance ; A6)

- **Constat :** mercredi et jeudi, toutes les semaines, alors que le mardi et le vendredi sont libres (P2, P3).
- **Cause :** placement glouton, sans règle de récupération entre deux séances du même sport (A6 ; propositions S1–S3
  de RC3-AUDIT).

### F10 — Aucun jour de repos garanti (P1, règle et gouvernance)

- **Constat :**
  - P5 : 7 jours d'entraînement sur 7, 6 semaines de suite.
  - 5 enchaînements durs à J/J+1 par semaine. Exemple : M → HYROX → M → CT → seuil → M.
  - P1b : 1 seul jour de repos par semaine, jusqu'à 6 jours consécutifs.
- **Cause :** aucun paramètre de repos minimal ni de jours consécutifs maximaux dans le planificateur. Le nombre de
  séances demandées et les disponibilités déclarées suffisent à remplir la semaine.
- **Impact :** charge cumulée non contrôlée pour un profil hybride. C'est le cas le plus fréquent chez un
  pratiquant multisport.

### F11 — Interférence cardiovasculaire et conflits laissés en place (P1, gouvernance)

- **Constat (P5) :**
  - Conflits M3 **détectés mais laissés en place chaque semaine** : Musculation ↔ HYROX en S1–S6, CT ↔ seuil en
    S2, S4 et S6. Aucun jour libre ne permet de les déplacer.
  - Le même enchaînement CT → seuil **n'est pas signalé** en S3 et S5 : le signal dépend du contenu de la séance CT.
  - En P2 et P3, CT ou HYROX tombent samedi et dimanche, de façon récurrente, sans signal.
- **Cause :** les fenêtres et règles M3 sont des valeurs de démonstration TEST_ONLY
  (`planner/tests/m3-governance.ts`). La structure `high_intensity_systemic` est **exclue** des conflits, pour ne
  pas saturer les semaines. L'interférence cardiovasculaire n'est donc pas représentée.

### F12 — HYROX selon le niveau (P1, bug d'avertissement et gouvernance)

Matrice de faisabilité, 3 séances par semaine, focus équilibré :

| niveau | résultat |
|---|---|
| Débutant | **aucune séance HYROX**, quel que soit le matériel (`SAFETY.HYROX.LEVEL_NOT_ELIGIBLE`) |
| Intermédiaire | 3 / 3 avec tout matériel, sauf poids du corps (1 / 3) |
| Avancé | **2 / 3** : le conditionnement stations n'est jamais composable (`H2_NO_STRUCTURE`), même en salle hybride |

- **Cause :** l'onboarding ne sonde pas la faisabilité HYROX. RC3.2 l'a fait pour le Cross-training seulement.
- **Impact :** un débutant voit chaque semaine des séances « non planifiées », sans explication préalable.

### F13 — Cross-training et HYROX : aucune progression (P2, gouvernance)

- **Constat :**
  - HYROX « capacité stations » : identique en S1, S3 et S5 (5 × SkiErg, cap 15 min).
  - CT du samedi : même for time, mêmes mouvements, 6 semaines de suite.
- **Cause :**
  - CT : `ct.progression.magnitude` et `ct.progression.toleranceRule` **non décidés**
    (`crosstraining/src/governance/registry.ts:41-43`, CT-D5).
  - HYROX : « jamais une progression », par conception (`hyrox/src/h2/compose.ts:149`).
- **À noter (observation) :** le conditionnement CT de P2 est surtout au poids du corps (squats, pompes, tractions
  élastique) malgré une salle complète. Les séances remplissent tout le temps disponible : 88 min le samedi, 58 min
  le dimanche.

## 3. Incohérences multisports prioritaires

1. **La semaine n'a pas de notion de charge globale** (F10, F11, F3). Le planificateur place tout ce qui est demandé
   dans les jours disponibles :
   - aucun jour de repos garanti ;
   - aucune interférence cardiovasculaire ;
   - les courses libres sont invisibles pour les autres sports ;
   - les conflits sans solution restent en place.
2. **La protection de la course se paie en Musculation, sans compensation** (F4, F9). La séance clé de course est
   intercalée entre deux Full Body, et le bas du corps disparaît. Une autre organisation de la semaine (RC2 bis :
   organisations dominantes) protégerait les deux.
3. **Les retours du terrain n'alimentent pas la progression** (F1, F7, F13) :
   - Course : ressenti non transmis ;
   - Musculation : progression très prudente des exercices principaux ;
   - CT et HYROX : aucune progression.

   Sur 6 semaines, seuls les exercices à fourchette progressent.
4. **Les courses libres agissent dans le mauvais sens** (F2, F3). Elles écrasent la dose de la Course, mais
   n'allègent pas les autres sports.

## 4. Décisions sportives à arbitrer

| # | décision | anomalies | options |
|---|---|---|---|
| R1 | Ressenti de fin de séance Course | F1 | question obligatoire ou facultative (facile / comme prévu / plus dur / beaucoup plus dur) ; valeur par défaut si non répondue (aujourd'hui « inconnu », aucune progression) |
| R2 | Course libre et dose | F2 | type de course à la saisie (facile, longue, qualité) ; exclure les courses libres de l'ancre de dose ; plafonner l'ancre par la disponibilité du jour |
| R3 | Courses libres dans la charge des autres sports | F3 | les traiter comme des voisines réalisées (interférence et M3) |
| R4 | Repos et enchaînements | F10, F9 | jours de repos minimum par semaine ; jours consécutifs maximum ; refus ou avertissement quand la demande dépasse |
| R5 | Interférence cardiovasculaire | F11 | valider les fenêtres G4 et M3 (aujourd'hui TEST_ONLY) ; représenter la charge systémique sans saturer ; conduite quand un conflit n'a pas de solution (alléger, reporter, avertir) |
| R6 | Compromis bas du corps / course | F4 | organisation de la semaine (RC2 bis) ; compensation du volume ; priorité selon l'objectif déclaré (D4 de RC3) |
| R7 | Couverture et excès de volume | F5, F6 | statut « au-dessus de la borne haute » ; sélection orientée vers les groupes en déficit (mollets) ; créneaux du contenu provisoire |
| R8 | Progression Musculation des exercices principaux | F7 | réussite exacte (`exact_success_progression`) ; lissage et arrondi ; rythme cible par niveau |
| R9 | Variation intra-semaine | F8 | appliquer ou non la variation (TEST_ONLY) quand les pistes ancrent les exercices |
| R10 | HYROX selon le niveau | F12 | HYROX débutant (refus explicite ou version adaptée) ; rôle « conditionnement stations » pour l'avancé ; avertissement à l'onboarding |
| R11 | Progression CT et HYROX | F13 | CT-D5 (pas et conditions) ; HYROX : progression ou périodisation par rôle |
| D1 / D8 | (rappel RC3) Sortie longue ; fatigue hors Musculation | A4, D8 | — |

## 5. Plan RC4 par étapes

Chaque étape attend votre accord. Elles se valident sur le banc RC4 : la matrice est régénérée, et le test
`rc4-findings` correspondant est réécrit avec le comportement attendu. S'y ajoutent `pnpm check`, le build, l'E2E,
et le DOM quand l'interface change.

| étape | contenu | nature | critères de validation |
|---|---|---|---|
| **RC4.1** | Ressenti de fin de séance Course transmis au moteur (F1) | technique, dès que R1 est tranchée | F1 inversé : avec « comme prévu », +1 répétition ou +1 min après 2 séances tolérées ; sans réponse, comportement actuel ; feuille de fin testée en DOM ; aucune autre prescription modifiée |
| **RC4.2** | Avertissement de faisabilité HYROX à l'onboarding (F12), sur le modèle de RC3.2 | technique (sonde moteur, aucune table) | matrice HYROX générée ; aucun niveau ou matériel sans séance proposé sans avertissement ; options réalisables proposées |
| **RC4.3** | Courses libres : dose et charge (F2, F3) | selon R2 et R3 | scénario F2 : 3 courses sur 3 et seuil conservés ; scénario F3 : allègement tracé ; courses du programme inchangées |
| **RC4.4** | Semaine multisport : repos, enchaînements, conflits sans solution (F10, F11, F9) | selon R4 et R5 (planificateur) | P5 : au moins N jours de repos ou avertissement explicite ; 0 conflit laissé en place sans indication ; P2 : plus de Full Body à J+1 quand un jour libre existe ; non-régression des profils RC2 bis |
| **RC4.5** | Musculation : équilibre et couverture (F4, F5, F6, F8) | selon R6, R7, R9 | P1 : quadriceps ≥ seuil décidé (aujourd'hui 3,7 pour 10) ; statut de dépassement affiché ; mollets ≥ 1 exposition par semaine si décidé |
| **RC4.6** | Progressions (F7, F13) et décisions RC3 restantes (A4, D8) | selon R8, R11, D1, D8 | banc « athlète qui progresse » : charge, structure, rounds et caps qui évoluent selon la règle décidée ; aucune progression sans preuve |

**Ordre recommandé :**
1. RC4.1 et RC4.2 : purement techniques, dès vos décisions R1 et R10.
2. RC4.3.
3. RC4.4.
4. RC4.5 et RC4.6 : les plus dépendantes des décisions sportives.

En attente de votre validation avant toute implémentation.
