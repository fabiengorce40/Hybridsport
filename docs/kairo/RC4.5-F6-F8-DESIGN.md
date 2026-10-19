# REKKA — RC4.5 suite : G5-a livré, conception F6-a et F8-a, plan de tests du lot C

| | |
|---|---|
| **Base** | `765a9bd` → G5-a `65611c0`, branche `claude/kairo-rc4-dev` |
| **Statut** | G5-a **implémenté**. F6-a, F8-a et lot C : **conception seulement**, en attente de votre validation. |
| **Méthode** | Mesures sur le banc RC4 (6 profils × 6 semaines, chemin Beta 0 réel). Expériences F6 en **copie jetable** (fichiers restaurés, rien commité). |
| **Inchangé** | Running ; branches TEST, production et repli ; aucune fusion, aucun déploiement. |

---

## 1. G5-a — `maxCandidates` = 3 (livré, `65611c0`)

- **Changement :** valeur TEST_ONLY du paramètre gouverné `planner.globalPlacement.maxCandidates`, de 6 à 3. Le paramètre et sa gouvernance (G3) sont conservés.
- **Matrice RC4 :** régénérée **identique**. Identité V0 (P1b, P2, P4, P5) et gain G5 (P3) vérifiés.
- **Banc complet :** **strictement identique** (deux exécutions, 6 profils × 6 semaines).
- **Validation :** `pnpm check` (2 878 tests, 0 échec) et build ✅.

**Coût Node** (6 semaines, chemin complet) :

| Profil | maxCandidates 6 | 3 |
|---|---|---|
| P2 | 8,2–8,6 s | **5,1 s** (−40 %) |
| P1, P3 | 3,0–3,8 s | 2,9–3,8 s (bruit) |

**Coût mobile** (planification d'une semaine, build de production, Chromium ralenti, médiane de 3) :

| Profil | ×4, 6 candidates | **×4, 3 candidates** | ×6, 3 candidates |
|---|---|---|---|
| P2 (pire cas) | 6,35 s | **4,52 s** | 7,00 s |
| P3 | 4,02 s | **3,72 s** | 5,82 s |
| P1 | 3,50 s | **3,62 s** (bruit, organisation retenue de rang ≤ 2) | 5,59 s |
| P1b / P4 / P5 (sans G5) | 2,35 / 1,39 / 2,16 s | **2,38 / 1,30 / 1,99 s** | 2,93 / 1,92 / 3,54 s |

**Objectif de 3 s en ×4** : toujours **non atteint** pour P1, P2 et P3. Sans Web Worker (exclu à ce stade), aucun autre levier ne garantit un résultat identique. La part restante est le coût propre d'une planification (V0) et de ses replanifications, dominée par la génération Strength : environ 22 ms par séance en Node.

---

## 2. F6-a — emplacement dédié aux mollets (conception)

### 2.1 Contrainte technique préalable

L'exigence d'un emplacement ne peut viser qu'un **schéma de mouvement** (`pattern`, type, polyarticulaire, région), jamais un muscle (`slotAccepts`, CORE). Or les deux exercices de mollets du catalogue (`ex.machine_calf_raise`, `ex.db_calf_raise`) ont le schéma `isolation_lower`, **comme** le leg curl et le leg extension.

Un emplacement « mollets » impose donc un **schéma distinct**. Il est déclaré dans l'extension de taxonomie du catalogue Strength, sans modifier le catalogue du CORE.

### 2.2 Composition proposée

| Élément | Proposition |
|---|---|
| Catalogue (contenu provisoire Strength) | Schéma `calf_raise` (région `lower`, non locomoteur), attribué aux 2 exercices de mollets. Ils sortent de `isolation_lower` : le leg curl et le leg extension ne sont plus en concurrence avec eux. |
| Besoin | `calves` : `{ pattern: 'calf_raise' }`, sans repli de substitution |
| Archétypes | `fb.calves` (Full Body) et `lo.calves` (Bas du corps) : accessoire, **facultatif**, `count: 1`, `modalityPreference: 'stability'`, suivi (track d'accessoire, double progression) |
| Priorité | **Dernière** de `optionalOrder` (4 stimuli) et de `needPriority` (objectifs force, hypertrophie, général, soutien course) |
| Récupération | Retiré, comme `isolation_lower` et `single_leg`, quand une structure `lower_knee` ou `lower_hip` est abaissée par une voisine (course, CT, HYROX) |
| Matériel | Machine à mollets (salle complète) ou haltères. Sinon l'emplacement est **omis** : aucun exercice inventé. Ajouter une version au poids du corps relèverait d'une décision de contenu. |
| Séries | Profil existant de l'accessoire d'isolation : **3 à 4 séries**, 12–20 répétitions, allocation par le volume hebdomadaire existant |
| Leg curl et exercices prioritaires | **Aucun remplacement** (emplacements inchangés) |

### 2.3 Mesures de la composition seule (copie jetable)

Variante E1, conforme au tableau ci-dessus :

| Profil | Mollets (séries / semaine, cible 4) | Séances avec mollets | Séries par séance | Couples (semaine, groupe) sous la cible | Autres groupes |
|---|---|---|---|---|---|
| P1 | 0 → 2,5 | 4 / 18 | 3–4 | 19 → 17 | ⚠️ quadriceps −1,4, ischio-jambiers −1,2, fessiers −1,5 (§2.4) |
| P1b | 0 → 3,3 | 5 / 12 | 4 | 8 → 3 | identiques |
| P2 | 0 → **6,7** | **13 / 18** | 3–4 | 13 → 7 | épaules −1,0 |
| P3 | 0 → 4,2 | 7 / 18 | 3–4 | 17 → 13 | identiques |
| P5 | 0 → 1,2 | 2 / 18 | 3–4 | 23 → 22 | tronc −0,2 |

- **Durées :** +2 à +8 min par séance concernée. Aucune séance au-delà du temps disponible du jour (maximum estimé 63 min).
- **Leg curl :** même nombre d'occurrences pour tous les profils, sauf P1 (8 → 6, voir §2.4).
- **Variante E2** (mollets jamais retirés par l'interférence) : P5 9,2 séries (proche de la borne haute 10), P1 7,7. Elle est rejetée : charge du bas de jambe à côté de la course et volume excessif.

### 2.4 Deux défauts mesurés, à corriger avant implémentation

**1. L'emplacement n'est pas strictement additif.**
- Quand le temps manque, l'ajustement de durée et la préservation du stimulus peuvent écarter un autre facultatif au profit des mollets. Cas observé : un triceps en P1, semaine 2.
- Dans les organisations candidates de G5, cela déplace d'autres groupes (épaules 18,5 → 15,5 séries en P1, semaines 5–6).
- La garde de G5 (« aucun groupe en baisse ») refuse alors l'organisation, et P1 garde ses Full Body à J/J+1, d'où la perte sur le bas du corps.
- Vérifications faites :
  - retirer les mollets de la garde G5 ne change rien ;
  - une garde « distance à la plage cible » corrige ce cas, mais **dégrade P1 et P3 sur le contenu actuel** (quadriceps −0,9 / −1,0). Elle est donc écartée.

**2. Fréquence non bornée.** L'emplacement est présent dans **chaque** Full Body. P2 a des mollets dans 13 séances sur 18, soit 6,7 séries par semaine pour une cible de 4.

**Règles du moteur proposées** (attributs d'emplacement facultatifs du ruleset, gouvernés, absents ⇒ comportement actuel) :

| Règle | Contenu | Effet attendu |
|---|---|---|
| **R1 — temps résiduel** (`fill: 'residual_time'`) | L'emplacement n'est ajouté **qu'après** l'ajustement complet de la durée des autres emplacements, et seulement s'il tient dans le temps restant. Il n'entre jamais dans la préservation du stimulus. | Séances **identiques** à aujourd'hui, mollets en plus quand le temps le permet. Décisions G5 inchangées, sauf sur le volume des mollets (voir R3). |
| **R2 — jusqu'à la cible** (`untilWeeklyTarget: true`) | Omis quand le volume de la semaine planifiée du groupe atteint sa cible : séances plus tôt dans la semaine plus séance en cours. Raison `SELECT.SLOT_OMITTED { cause: 'weekly_target_met' }`. | 1 à 2 séances de mollets par semaine, 3 à 7 séries |
| **R3 — garde G5** | Les groupes servis **uniquement** par un emplacement à temps résiduel ne comptent pas dans la garde « aucun groupe en baisse » de G5. | G5 ne refuse pas une organisation pour des séries de mollets ajoutées en fin de séance |

**Critères d'acceptation :**
- banc RC4 identique à `65611c0` **hors** lignes de mollets : mêmes exercices dans les autres emplacements, mêmes dates, mêmes décisions G5 et M3, mêmes volumes des autres groupes ;
- mollets ≥ 1 exposition par semaine quand le matériel et le temps le permettent, et ≤ 10 séries (borne haute) ;
- aucune séance au-delà du temps disponible ;
- leg curl : même nombre d'occurrences qu'avant.

### 2.5 Fichiers et gouvernance

| Zone | Fichiers | Gouvernance |
|---|---|---|
| Contenu provisoire | `packages/strength/tests/fixtures/catalog.ts`, `ruleset.ts` (archétypes, besoins, objectifs, stimuli, interférence, replis) | Nouveau lot fermé « Strength RC4.5 F6 » dans la garde d'architecture (comme S1–S5) |
| Moteur Strength | `params.ts` (attributs d'emplacement), `engine.ts` (R1, R2), `codes.ts` | Même lot fermé |
| Planificateur | `global-placement.ts` (R3) ; le port Strength expose les groupes à temps résiduel | — |
| Rapports générés | goldens S1–S7 (`__goldens__`, 4E, 4F), documents scientifiques, simulations longitudinales Strength | Différences attribuées et expliquées, comme en 4E / 4F |
| Interface | Libellé du besoin « Mollets » ; F5 continue d'afficher les dépassements | — |

**Semaines déjà planifiées** (décision P-V) : pas de régénération automatique. Au démarrage d'une séance d'une semaine planifiée avant F6, la régénération (nouveau contenu) ne redonne plus la séance persistée. Le chemin existant « séance non reproductible » s'applique alors : adaptation de la séance persistée, motif tracé. C'est sûr, et cela dure au plus la semaine de transition. Une alternative, la régénération avec la version de contenu de la semaine, demanderait de conserver l'ancien contenu dans le code. Je ne la recommande pas.

### 2.6 Tests prévus (F6-a)

1. **Moteur Strength** :
   - emplacement facultatif ajouté seulement sur le temps résiduel (R1) : mêmes exercices et mêmes séries dans les autres emplacements qu'avec le ruleset sans mollets ;
   - omis dès que la cible est atteinte (R2) ;
   - omis sans matériel compatible ;
   - retiré sous interférence `lower_knee` / `lower_hip` ;
   - jamais en préservation du stimulus ;
   - déterminisme.
2. **Goldens S1–S7** et simulations longitudinales : différences limitées aux mollets, attribuées.
3. **Banc RC4** : critères d'acceptation du §2.4, et décisions G5 inchangées.
4. **Planificateur** : garde G5 avec R3 ; matrice RC4 identique hors mollets.
5. **App-core / interface** : bilan de volume (mollets « atteint » ou « en dessous »), libellés, F5.
6. **Reproductibilité** : séances planifiées après F6 régénérées à l'identique ; semaine planifiée avant F6 ⇒ chemin « non reproductible », sans erreur.

---

## 3. F8-a — tracks distinctes par occurrence (conception)

### 3.1 Modèle actuel (lu dans le code)

- **Track** (`zStrengthTrack`, strict) :
  - clé fonctionnelle (`archetypeId`, `slotId`) ;
  - `tier: 'anchor'` (exercices structurants) ou `tracked` (accessoire) ;
  - une track active par emplacement et par archétype.
- **Exposition** (`zExerciseExposure`) : `slotId` facultatif. C'est la base de la continuité S4 (`incumbentBySlot`).
- **Compteurs d'accessoires** (`accessoryCounts`) : clé `archétype/emplacement/exercice`.
- **Occurrence** (rang de l'archétype dans la semaine, ordre des dates) : déjà calculée et stable. Elle sert à la graine `strength:{archétype}:{stimulus}:{rang}` et à la trace `PLAN.WEEK_PRESCRIPTION.occurrence`.

**Conséquence :** Haut n°1 et Haut n°2 partagent les mêmes ancres, accessoires et progressions. D'où A · B · A en Full Body et deux séances Haut identiques (P1b).

### 3.2 Modèle proposé

**Clé de track et de continuité :** (`archetypeId`, `slotId`, **`occurrence`**), où l'occurrence vaut 1, 2, 3… selon le rang de l'archétype dans la semaine.

| Type de track | Règle |
|---|---|
| **Ancres** (blocs de force) | Une ancre **par occurrence** et par groupe de choix. Haut A garde son développé couché, Haut B son développé militaire, d'une semaine à l'autre. Chacune progresse de son côté : ses propres expositions, son modèle, ses paliers. |
| **Accessoires suivis** | Une track par (emplacement, occurrence). Les accessoires diffèrent entre variantes et restent **stables** dans une variante (continuité S4 par occurrence). Jamais aléatoires. |
| **Choix initial de la variante B** | Le groupe de choix existant alterne déjà (exposition la moins récente). La variante B prend l'autre option du groupe de choix, puis la garde. |

**Encodage, deux options :**

| | **M1 — champ `occurrence`** | **M2 — rang dans l'identifiant d'emplacement** |
|---|---|---|
| Données | `zStrengthTrack.occurrence?: number` ; `zExerciseExposure.occurrence?: number` ; clé de compteur avec le rang | `slotId` = `up.iso_upper` (rang 1) ou `up.iso_upper#2` (rang 2…). **Aucun schéma modifié.** |
| Migration | Aucune transformation : absent = rang 1 (lecture). Les anciennes tracks deviennent celles de la variante A. Les variantes B et C démarrent sans track ; la charge est connue par les expositions du même exercice, sinon calibration. | Identique (anciennes = rang 1) |
| Repli `0cf2ceb` | Schéma strict ⇒ champ inconnu ⇒ état **illisible** sans retrait. Il faudrait ajouter `strength.tracks.*.occurrence` et `strength.exposures.*.occurrence` à la liste fermée, ce qui ne suffit pas : deux tracks actives pour le même (archétype, emplacement) seraient ambiguës pour RC1. Le repli devrait **suspendre** les tracks de rang ≥ 2. C'est une mise à jour séparée, à valider. | Lisible tel quel (`slotId` est une chaîne libre). Les tracks `…#2` ne correspondent à aucun emplacement d'archétype : **à vérifier** par un test de lecture sur une copie jetable du code `0cf2ceb`, comme en RC4.3. Attendu : ignorées, progression des variantes B gelée pendant le repli et reprise au retour. |
| TEST `a7c1e51` | État refusé (copie illisible gardée) | Idem M2 / repli : à vérifier |
| Lisibilité du code | Explicite | Convention de nommage, à encapsuler dans un module unique |

**Recommandation : M2**, sous réserve du test de repli. Aucune migration, compatibilité de lecture attendue, même logique que le lot C (option A) et RC4.4 : des valeurs dans des structures existantes. Si le test de repli révèle une ambiguïté, alors M1, avec la mise à jour de la branche de repli présentée séparément.

### 3.3 Règles de continuité

1. L'exercice en place et les ancres sont lus **par occurrence**. Haut B ne reprend jamais l'exercice de Haut A par continuité.
2. Les mouvements structurants (blocs de force) ont une ancre par occurrence. Ils sont stables (jamais changés sans cause traçable : douleur, matériel, stagnation, revue) et progressifs.
3. Les accessoires d'une variante restent les mêmes d'une semaine à l'autre, sauf cause traçable existante : matériel, exclusion, rotation pour stagnation ou exercice non aimé.
4. Graine : inchangée (déjà par occurrence). La sélection reste déterministe.
5. Volume : chaque séance reçoit sa part du volume hebdomadaire, comme aujourd'hui, sans règle nouvelle. Le bilan F5 reste calculé sur la semaine.

### 3.4 Changement de fréquence (Modifier)

| Cas | Comportement |
|---|---|
| 2 → 3 séances du même archétype | Occurrence 3 nouvelle : choix ordinaires (groupe de choix, continuité vide), charges connues par les expositions des mêmes exercices, sinon calibration. Tracks créées à la première séance réalisée, comme aujourd'hui. |
| 3 → 2 | Tracks du rang 3 **suspendues**, ni closes ni supprimées. Reprises si la fréquence revient, sous les causes de clôture existantes. |
| Changement de composition (Full Body ↔ Haut / Bas) | Inchangé : les tracks sont déjà par archétype ; celles des archétypes absents restent en l'état |
| Ordre des jours modifié (G5, M3, Modifier) | L'occurrence suit l'**ordre des dates** dans la semaine, comme la graine actuelle. Déplacer Haut B avant Haut A échange les variantes cette semaine-là, sans perte de progression. |

### 3.5 Tests prévus (F8-a)

1. **Unitaires Strength** : clé (archétype, emplacement, rang) ; ancres par rang ; continuité par rang ; anciennes tracks lues comme rang 1.
2. **App-core** :
   - création et mise à jour des tracks par rang ;
   - fréquence 2 → 3 → 2 : suspension, puis reprise sans perte ;
   - Modifier composition ;
   - pause douleur ;
   - substitution matériel.
3. **Banc RC4** :
   - séances du même archétype différentes dans une semaine (accessoires) ;
   - **mêmes exercices structurants d'une semaine à l'autre pour chaque variante** ;
   - progressions de charge par variante (pas de régression) ;
   - volumes par groupe dans les plages actuelles ;
   - durées dans le temps disponible.
4. **Compatibilité** :
   - fixtures RC1 et RC4.3 relues sans migration ;
   - état F8 réel relu par une copie jetable de `0cf2ceb` (M2 : aucune erreur, tracks `#k` ignorées) et de `a7c1e51` ;
   - aller-retour sans perte des tracks de rang ≥ 2.
5. **Reproductibilité** du démarrage par variante (régénération identique).

---

## 4. Lot C — plan de tests (option A, sans implémentation)

### 4.1 Compatibilité exacte du format (vérifiée)

- **Schéma `zCheckIn` identique octet pour octet** (empreinte de sa définition) sur dev, sur le repli `0cf2ceb` et sur TEST `a7c1e51`. Ses énumérations sont identiques aussi : niveaux de douleur, statuts, fatigue, récupération, disponibilité, décisions.
- `reasons: z.array({ code: z.string(), params: z.record(z.string(), z.unknown()) })` : la raison `KAIRO.MANUAL_START_INTERFERENCE_ACCEPTED` avec ses paramètres (tableau de conflits) est valide dans les trois versions.
- **Décision** : `unchanged`, une valeur existante. Aucune nouvelle valeur d'énumération.
- `checkInReasonsText` (dev et `0cf2ceb`) ignore les codes inconnus.

### 4.2 Tests prévus

| # | Test | Attendu |
|---|---|---|
| C-1 | Format | Un `CheckIn` avec la raison est lu par le schéma de dev, de `0cf2ceb` et de `a7c1e51` (copies jetables) ; état réécrit octet pour octet |
| C-2 | Avertissement maintenable | Interférence M3 au démarrage manuel ⇒ `startAssessment` renvoie un **avertissement** avec les conflits ; sans `acceptInterference`, démarrage **refusé** (comportement actuel inchangé par défaut) ; avec, démarrage et raison tracée |
| C-3 | Blocages de sécurité non contournables | Avec `acceptInterference: true`, toujours refusés : qualité `BLOCKED`, pause douleur active, signal général (P4), douleur sur zone exclue sans adaptation possible (report), refus du moteur, hors semaine. Test adverse : chaque cause, seule et combinée à une interférence |
| C-4 | Ordre d'évaluation | Une séance à la fois interférente et dangereuse est **bloquée**, jamais présentée comme maintenable |
| C-5 | Maintenue ≠ bien tolérée | Une séance maintenue volontairement n'écrit **rien** dans la tolérance, le ressenti ni la réalisation (`completion`, retour terrain) ; l'historique et le journal affichent « maintenue malgré une interférence (zones) », distinct de « bien tolérée » ; les sélecteurs (récupération, F5, avertissements de semaine, progression) ne la comptent pas comme bien tolérée |
| C-6 | Retour terrain après maintien | Si l'athlète déclare ensuite « difficile » ou une douleur, ces déclarations s'appliquent normalement, et la raison de maintien ne les masque pas |
| C-7 | Reprise | Une séance maintenue puis rechargée reprend sans nouvel avertissement (règle existante « reprise jamais réévaluée ») |
| C-8 | Interface | Feuille d'avertissement (deux boutons, zones lisibles, aucun code) ; refus de sécurité sans bouton « Maintenir » (DOM) |
| C-9 | E2E | Parcours « Faire maintenant » avec interférence ⇒ avertissement ⇒ maintien ⇒ séance démarrée et tracée ; parcours douleur ⇒ aucun maintien proposé |
| C-10 | Repli | État avec séance maintenue relu par une copie jetable de `0cf2ceb` : lisible, séance et résultat intacts, phrase de maintien absente (code ignoré) |

---

## 5. Banc RC4 et performances (rejoués à `65611c0`)

| Contrôle | Résultat |
|---|---|
| Matrice RC4 | Identique à `765a9bd` |
| Banc 6 profils × 6 semaines | Strictement identique (deux exécutions) |
| `pnpm check` | ✅ 2 878 tests, 0 échec, 2 ignorés |
| Build | ✅ |
| Coût mobile | §1 |

---

## 6. Décisions demandées

| # | Question | Recommandation |
|---|---|---|
| F6-1 | Composition §2.2 (schéma `calf_raise`, emplacement facultatif dernier en priorité, retiré sous interférence du bas du corps) | Oui |
| F6-2 | Règles R1 (temps résiduel), R2 (jusqu'à la cible), R3 (garde G5) | Oui, les trois : sans elles, les mesures montrent des effets indésirables (§2.4) |
| F6-3 | Version au poids du corps des mollets (sans matériel) | Non pour l'instant (contenu non relu) |
| F6-4 | Semaines planifiées avant F6 : chemin « non reproductible » pendant la semaine de transition | Oui |
| F8-1 | Encodage | M2 (rang dans l'identifiant d'emplacement), sous réserve du test de lecture par `0cf2ceb` ; sinon M1 avec mise à jour séparée du repli |
| F8-2 | Fréquence en baisse : suspension (pas de clôture) des tracks du rang supprimé | Oui |
| C-1 | Plan de tests du lot C §4 | À valider avant implémentation |

Rien d'autre n'est implémenté. En attente de votre accord.
