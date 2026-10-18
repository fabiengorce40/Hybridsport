# REKKA — RC4.3 : courses libres (décisions R2 et R3, migration M1)

**Branches :**

| Rôle | Branche | Base | Commit |
|---|---|---|---|
| Développement | `claude/kairo-rc4-dev` | 767203a | commit de ce rapport |
| Repli | `claude/kairo-rc1-test-rollback` | b2b1f3f | **0cf2ceb**, commit séparé |

**Ce qui n'a pas bougé :**
- aucune fusion vers TEST ou la production, aucun déploiement ;
- aucun workflow ne se déclenche sur ces deux branches (vérifié dans leurs fichiers `.github/workflows`).

---

## 1. Ce qui a été fait

### R2 — ancre des footings (option A′), moteur Running
La politique V19 porte `freeRunPolicy: 'PROGRAMME_FIRST'`, dans la surcouche des décisions produit (`product-decisions.ts`, décision D5 complétée).

L'origine « course libre » est **fournie** par app-core au contexte (`freeSessionIds`, non persisté). Le moteur ne la déduit jamais.

| Règle | Implémentation |
|---|---|
| Priorité aux séances du programme | `anchorCandidates` : s'il existe une séance programme exploitable (terminée, sans retour négatif) du même type, seules les séances programme sont candidates à l'ancre. |
| Ancre initiale par une course libre | Seulement pour un **footing** (EASY), et seulement sans séance programme exploitable. C'est le cas de la course déclarée à l'onboarding, qui continue d'initialiser les footings. |
| Courses longues et de qualité | **Jamais** une ancre (ni durée, ni structure), même sans séance programme. |
| Preuve de progression (V23) | Une course libre ne compte que si sa dose est **celle de l'ancre** ET sa tolérance favorable est **connue** (EASIER / AS_EXPECTED). `UNKNOWN` ne compte jamais. Une course libre d'une autre dose est ignorée : ni preuve, ni interruption. |
| Sans la politique | Comportement antérieur inchangé (gouvernance experte seule ; testé). |

**⚠ Point à valider :** le paquet Running est gelé depuis le « gate Course » par un test de garde (`crosstraining-architecture.test.ts`, liste fermée). La règle A′ vit dans ce moteur. J'ai donc ajouté un **lot fermé et nommé**, `RUNNING_RC43_R2_CHANGES`, selon la convention du dépôt (lots Strength S1 à S5, C4.2). Il couvre exactement 5 fichiers `src` et 1 test, et aucune autre modification de Running n'est admise. Si vous préférez une autre forme d'autorisation, c'est le seul endroit à changer.

### Types de courses libres (R2)
- Choix **facultatif** : « Non précisé » (par défaut), « Footing facile », « Sortie longue », « Séance de qualité ».
  - Qualité : sous-type **obligatoire**, seuil, fractionné ou côtes.
- **Persistance (M1) :** le type est enregistré dans `running.freeRunMeta[id].type`. La course reste enregistrée `EASY` / `CONTINUOUS` dans `running.realized` : le contrat Running est inchangé.
- **« Non précisé »** : **aucune** métadonnée. La distinction avec « Footing facile » est conservée, et aucune intensité n'est supposée.
- **Au calcul seulement**, le type est appliqué au contexte du moteur, jamais persisté ailleurs :

  | Type | Catégorie moteur | Effet |
  |---|---|---|
  | Facile, Non précisé | EASY continue (inchangée) | aucun |
  | Sortie longue | LONG continue | compte dans les séances à forte demande (V10 / V11) ; jamais une ancre |
  | Seuil | THRESHOLD, famille fractionnée, sans structure | idem |
  | Fractionné | SEVERE, famille fractionnée, sans structure | idem |
  | Côtes | HILLS, famille fractionnée, sans structure | idem |

- **Aucune intensité déduite de la durée.** La catégorie moteur ne sert qu'au comptage des séances exigeantes.
- **Expositions et allure du TEST :**
  - les expositions par archétype restent calculées sur les données persistées (inchangées) ;
  - une course de qualité n'entre plus dans l'allure observée du TEST, car celle-ci ne lit que les courses continues ;
  - une sortie longue, une course facile ou non précisée y entrent toujours.

### R3 — récupération multisport
- **À la planification d'une semaine** (`recentOf`) : les courses libres **datées et effectuées** de la semaine précédente deviennent des voisines **réalisées** (`executed`), comme les séances du programme. Cela vaut même sans sport Course déclaré, car le port Course est toujours disponible.
- **Brouillon neutre :**
  - exercice de course du catalogue (unique, jamais deviné) ;
  - durée **réelle** comme dose ;
  - **aucune cible d'intensité**.

  Le profil de demande est dérivé par le CORE (exercice × dose × bande gouvernée de la discipline). Le type déclaré ne change pas cette demande (testé).
- **Au démarrage** d'une séance d'un **autre** sport :
  - les courses libres faites **depuis la planification** de sa semaine sont ajoutées aux voisines persistées (même fenêtre d'interférence M3 que le planificateur) ;
  - la séance est régénérée par son moteur.
  - **Garde :** si la séance prévue n'est pas reproductible à l'identique, aucun changement n'est attribué à tort (motif `KAIRO.FREE_RUN_RECOVERY_NOT_APPLIED`). Si le moteur refuse la séance, elle est reportée explicitement.
  - La **semaine déjà composée n'est jamais modifiée** (testé : semaine identique, octet pour octet, après la saisie).
- **Exclusions :**
  - **jamais** la course d'onboarding sans date réelle (`freeRunMeta[id].dateUnknown`) ;
  - jamais une course non faite (SKIPPED).

### Doublons
- **Refus existants conservés :** identifiant identique et chevauchement horaire (`DUPLICATE_RUN`).
- **Course sans heure précise** le jour d'une course du programme déjà réalisée :
  - **app-core** refuse la saisie sans confirmation explicite (`FREE_RUN_SAME_DAY_CONFIRM`) ;
  - **l'interface** affiche « S'agit-il de la même course ? Elle ne sera jamais fusionnée automatiquement », avec deux choix : **Annuler la saisie** et **Confirmer une activité supplémentaire** ;
  - il n'y a aucune fusion automatique ;
  - si la date d'une course déjà acceptée reste inchangée à la correction, la confirmation n'est pas redemandée.
- **Nécessaire pour atteindre ce cas :** l'**heure de départ devient facultative** à la saisie (« Heure de départ (facultative) »). Avant, RC3.4 l'exigeait pour une nouvelle course, ce qui rendait le cas « sans heure » impossible. Sans heure, seule la date est enregistrée, selon la convention de jour existante (RC3.4) ; l'heure n'est jamais inventée.

### Métadonnées : correction et suppression
- **Correction :** le type est mis à jour ou effacé (retour à « Non précisé »). Si l'identifiant change (nouvelle heure), les métadonnées **suivent** et l'ancien identifiant n'en garde aucune.
- **Course d'onboarding sans date, corrigée en laissant la date vide :**
  - la date reste inconnue ;
  - l'instant n'est **pas** déplacé à « maintenant » ;
  - l'heure n'est jamais présentée comme réelle.

  Si une date est saisie, elle devient la date réelle.
- **Suppression :** les métadonnées sont retirées. Un champ `freeRunMeta` vide est omis.

### Interface
| Élément | Changement |
|---|---|
| Formulaire de course libre | Choix du type et sous-type de qualité ; heure facultative ; avertissement « même jour » ; date laissée vide pour une course d'onboarding sans date. |
| Carte de l'historique | « Type : … » ou « Type : non précisé » ; « date non renseignée (déclarée à l'inscription) ». |
| Historique | « Ajouter une course » est proposé à tout profil, même sans sport Course. Le texte annonce que la course compte dans la récupération ; il remplace « sans effet sur vos séances HYROX », devenu faux. |
| Démarrage | Motifs en clair : « Course libre récente prise en compte : la séance est allégée pour votre récupération », etc. |

---

## 2. Changements de comportement (banc RC4 : 6 profils × 6 semaines)

La matrice `tests/rc4-audit/__reports__/rc4-matrice.md` a été régénérée. Comparée à 242f101 :

| Profil | Changement |
|---|---|
| **P4** (Course 3× + HYROX 2×, 80 min libres le dimanche de S3) | **F2 corrigé.** S4–S6 : seuil 5×5 → 6×5 min, deux footings de 33 → 35 min, plus de mode entretien. Avant : un footing de 80–81 min seul, 2 courses sur 3 non planifiées (`TIME_EXCEEDED`). Les séances HYROX sont replacées en conséquence. ⚠ S4–S5 comptent désormais **4 jours consécutifs** (constat F10, RC4.4, inchangé). |
| P1, P1b, P2, P3, P5 | **Identiques** à 242f101. La course libre de P1 (samedi de S2) ne change ni les courses ni le volume de Musculation affiché. |

### F2 — vérifié (`rc4-findings` F2, réécrit)
- **P4 :**
  - S4, S5 et S6 gardent **3 courses**, le **seuil**, et aucun mode entretien ;
  - les structures de S6 sont **identiques au témoin sans course libre**.
- **Par type** (`rc43-free-runs`) : 80 min libres non précisées, faciles, longues ou au seuil laissent la semaine suivante avec 3 courses, le seuil, et des footings ≤ 31 min.

### F3 — vérifié (`rc4-findings` F3, réécrit)
- **P2, sans sport Course**, 90 min libres la veille :
  - la Musculation du lundi reçoit `running@-24h lower_hip:full, lower_knee:full`. Elle était inchangée avant RC4.3 ;
  - les autres séances de la semaine ne reçoivent **aucun** allègement lié à la course (pas de double comptage) ;
  - le moteur Musculation y compense le volume hebdomadaire retiré le lundi (ischio-jambiers 3 → 6 séries le mercredi ; règle existante, inchangée).
- **Au démarrage**, P2 avec 90 min libres la veille d'une séance de Musculation déjà planifiée :
  - décision `adapted`, motif `KAIRO.FREE_RUN_RECOVERY_APPLIED` ;
  - soulevé de terre roumain 3 → 2 séries et effort allégé, deux exercices du bas du corps retirés, un exercice du haut ajouté ;
  - **sans** la course libre, la même séance démarre `unchanged`.

### Autres effets mesurés
- **Taille de l'état :** +1 Kio à 12 et 26 semaines (« Running : réalisé et références » 7 → 8, 15 → 16 Kio). C'est la métadonnée de la course d'onboarding, plus la progression Course.
- **Test E2E multisport :** les séances de Musculation voient **5** voisines au lieu de 4. La 5e est la course libre datée de la semaine précédente (`history`), que le test enregistre lui-même.

---

## 3. Tests

**Nouveaux :**

| Fichier | Couverture |
|---|---|
| `running/tests/unit/rc43-free-run-policy.test.ts` (8) | F2, ancre initiale, longue et qualité jamais ancre, comportement sans la politique, même dose et tolérance connue, `UNKNOWN`, autre dose ignorée, séance programme sans ressenti |
| `app-core/tests/rc4/rc43-free-runs.test.ts` (15) | Les quatre saisies et leur modification ; type invalide ; contexte du moteur ; F2 par type ; date inconnue (métadonnée, voisines, correction avec et sans date) ; F3 sans sport Course ; démarrage (`adapted` contre `unchanged`) ; même jour (confirmation, chevauchement, correction) ; une voisine par course et demande indépendante du type ; sauvegarde, rechargement et export ; **état RC4.3 réel** relu, exporté et ré-importé à l'identique ; fixtures RC1 sans `freeRunMeta` |
| `apps/kairo/tests/rc43-free-run-type-dom.test.tsx` (5) | Type par défaut, sous-type obligatoire, enregistrement, affichage, modification jusqu'à « Non précisé » ; suppression ; même jour (Annuler / Confirmer) ; onboarding sans date ; profil sans Course |

**Réécrits**, car le comportement change par décision :
- `rc4-findings` F2 et F3 ;
- RC3.3 / RC3.4 DOM : heure facultative, entrée proposée sans sport Course, texte « compte dans la récupération » ;
- `rc33/free-run` : vue enrichie de `type` et `dateUnknown` ;
- `multisport-e2e` : 5 voisines ;
- rapport de taille d'état ;
- liste fermée du test de garde (lot `RUNNING_RC43_R2_CHANGES`).

**Absence de ressenti :** une séance du programme sans ressenti et une course libre de même dose à `UNKNOWN` donnent un **maintien** (testé au moteur). Le formulaire de course libre exige toujours un ressenti (RC3.3, inchangé).

---

## 4. Compatibilité et repli

| Cas | Preuve |
|---|---|
| États sans `freeRunMeta` (RC1, RC3, RC4.1–4.2) | Lisibles sans migration ; courses « Non précisé », date réelle ; aucune référence ajoutée (fixtures RC1 testées). |
| Sauvegarde, rechargement, export | `freeRunMeta` conservé à l'identique ; état RC4.3 réel exporté puis ré-importé à l'identique. |
| **Repli RC1 TEST** (0cf2ceb, commit séparé) | `running.freeRunMeta` rejoint la liste fermée des champs additifs retirés à la lecture. L'état **RC4.3 réel** (fixture écrite par le code RC4.3) est relu : état = texte moins les seuls champs additifs ; réalisations, références, profil et sécurité identiques ; texte d'origine gardé sous `kairo.rc3-original` ; relu ensuite sans retrait. Les courses restant EASY continues, RC1 les interprète comme avant. Message de repli : « type déclaré des courses libres et mention « date non renseignée » ». |
| Validation de la branche de repli | `pnpm check` ✅ (2 695 tests) ; `build:rc1-test` ✅ ; E2E du canal TEST ✅ (238 vérifications). |

**Limites :**
- **Anciennes courses d'onboarding sans date :** celles enregistrées **avant** RC4.3 ne portent pas `dateUnknown`, et elles ne peuvent pas être identifiées après coup. Seule une heuristique fragile le permettrait (instant égal à la création du programme, qui change à chaque « Modifier »). Elles sont traitées comme datées à l'instant de l'onboarding.

  Effet réel : la récupération ne lit que la semaine précédente (planification) et les courses postérieures à la planification (démarrage). Une telle course ne pèse donc que si l'onboarding date de **moins d'une semaine** au moment de la mise à jour : à vérifier pour les testeurs de RC3 TEST (déployé mi-octobre) au moment d'une éventuelle intégration.
- **Retour vers RC3 TEST (a7c1e51) au lieu de RC1 :** RC3 TEST ne connaît pas `freeRunMeta`. Il refuserait l'état (« illisible », copie gardée). Le chemin de retour prévu reste la branche de repli RC1. Un retour vers RC3 exigerait la même liste de retrait dans RC3.
- **HYROX au démarrage :** une séance HYROX n'est pas régénérable (station non persistée). Une course libre faite depuis la planification n'est donc évaluée qu'à la planification de la semaine suivante. Le motif est tracé.
- **Course libre avec retour négatif** (beaucoup plus dur, douleur) sous une ancre programme : elle n'entraîne pas le repli de dose D5, car seule l'ancre programme compte. La douleur déclenche toujours la pause douleur existante.
- **Durées et intensités :** la demande multisport d'une course libre dépend de sa **durée réelle** seulement, quel que soit son type (aucune intensité inventée).

---

## 5. Validation (branche `claude/kairo-rc4-dev`)

| Étape | Résultat |
|---|---|
| `pnpm check` (typage racine et application, ESLint, Vitest) | ✅ 237 fichiers, **2 839 tests**, 1 ignoré (préexistant) |
| `pnpm kairo:build` | ✅ (avertissement préexistant sur la taille des chunks) |
| `pnpm kairo:e2e` (Chromium mobile, `vite preview`) | ✅ 221 vérifications |
| Build du canal TEST | Non disponible sur cette branche (canal propre à la branche TEST) ; exécutée sur la branche de repli ✅ |

En attente de votre validation avant toute intégration.
