# REKKA (ex-KAIRO) — Reprise RC4 : état, conception RC4.3 et feuille de route

Audit et conception uniquement :
- aucune fusion ;
- aucune modification de prescription ou de règle sportive ;
- aucun déploiement TEST ou production.

Les mesures RC4.3 ont été faites dans une copie jetable du dépôt, hors branche. Les modifications expérimentales du moteur n'ont été ni commitées ni poussées.

---

## 1. État Git exact (vérifié le 2026-10-18 après `git fetch`)

| Rôle | Branche | Commit | Remarque |
|---|---|---|---|
| Développement RC4 | `claude/kairo-rc4-dev` | **242f101** | HEAD local = distant ; arbre propre ; aucune modification non commitée |
| TEST Cloudflare | `claude/kairo-rc1-test-env` | **a7c1e51** | « KAIRO RC3 — TEST » déployé |
| Repli TEST | `claude/kairo-rc1-test-rollback` | b2b1f3f | retour RC1 TEST, retire 4 champs annexes RC3 au chargement |
| Production | `claude/crosstraining-c1-c2-spike-vbg8dv` | **f9f7e2e** | gh-pages **7bf4a77** |

Ces quatre commits sont conformes à l'état annoncé.

### Divergence RC4 / TEST
- **Ancêtre commun :** `8dff0a9` (garde de publication de RC3 TEST). La production `f9f7e2e` en est un ancêtre.
- **Propre à RC4, 3 commits :**
  - `dc04441` : rapport de préparation RC3 TEST ;
  - `0bad48c` : audit RC4 ;
  - `242f101` : RC4.1 et RC4.2.
- **Propre à TEST, 7 commits :**
  - `3b17215` → `efc5f2f` : canal `rc1-test`, workflow Cloudflare, preuves ;
  - `b87c3f0` : intégration RC3.1–RC3.5 ;
  - `a7c1e51` : libellé RC3 TEST.
- **Fichiers touchés des deux côtés :** aucun.
  - **TEST :** workflow, `channel.ts`, `main.tsx`, `store.tsx`, `App.tsx`, `vite.config.ts`, `styles.css`, scripts, `package.json`, `eslint.config.mjs`, `.gitignore`, documentation.
  - **RC4 :** `beta0-app.ts`, `ct-feasibility.ts`, `hr-feasibility.ts`, `index.ts`, les écrans `Session0` / `Setup` / `Programme0` / `HrFeasibility`, `present.ts`, tests et documentation.

### Fusion d'essai (copie jetable, rien commité ni poussé)
`242f101` fusionné avec `a7c1e51` :
- fusion automatique, **sans conflit** ;
- `pnpm check` : ✅ 235 fichiers, **2 815 tests** réussis, 1 ignoré (préexistant) ;
- `build:rc1-test` : ✅.

Sur RC4 seule, `pnpm check` donne 2 812 tests. Les 3 tests de plus viennent de `channel.test.ts`.

---

## 2. Fonctionnalités : implémentées, validées, non validées

« Validé » signifie validé par vous (accord écrit) ; « testé » signifie couvert par les tests automatiques.

| Lot | Contenu | Où | Statut |
|---|---|---|---|
| RC1 TEST | Canal isolé `rc1-test`, Cloudflare Pages, garde de production | TEST | déployé, validé |
| RC3.1–RC3.5 | Repli EASY si TEST impossible (A2) ; motif réel des séances non planifiées (A8) ; fatigue RIR+1 (A1) ; faisabilité Cross-training (RC3.2) ; courses libres datées, modifiables et supprimables (RC3.3/3.4) ; lecteur de séance Course (RC3.5) | TEST + RC4 | déployé en TEST (`a7c1e51`), validé |
| Audit RC4 | Banc 6 profils × 6 semaines, anomalies F1–F13 | RC4 | livré (`0bad48c`), validé |
| **RC4.1** | Ressenti facultatif en fin de course → `unexpectedDifficulty` ; sans réponse : `UNKNOWN` ; aucun nouveau champ persisté | RC4 seulement | implémenté et testé (F1 réécrit, app-core, DOM, E2E 221 vérifications) ; **non validé sur le terrain, non déployé** |
| **RC4.2** | Sonde `hyroxRoleFeasibility` (moteur réel) ; types réalisables et impossibles avec leur cause, dans l'onboarding, « Modifier » et l'onglet Programme | RC4 seulement | implémenté et testé (F12 réécrit, matrice, DOM) ; **non validé sur le terrain, non déployé** |

### Anomalies sportives encore ouvertes (audit RC4)

| # | Gravité | Anomalie | Étape prévue |
|---|---|---|---|
| F2 | P1 | Une course libre longue devient la dose des footings et vide la semaine suivante | **RC4.3** |
| F3 | P2 | Charge des courses libres ignorée par les autres sports | **RC4.3** |
| F4 | P1 | Bas du corps sacrifié par la course voisine (prise de masse) | RC4.5 |
| F5 | P2 | Volume au-dessus de la borne haute déclaré « atteint » | RC4.5 |
| F6 | P2 | Mollets jamais programmés | RC4.5 |
| F7 | P2 | Progression de charge Musculation lente, nulle en réussite exacte | RC4.6 |
| F8 | P3 | Variation intra-semaine perdue après S1 | RC4.5 |
| F9 | P2 | Full Body à J et J+1 | RC4.4 |
| F10 | P1 | Aucun jour de repos garanti (7 sur 7 en P5) | RC4.4 |
| F11 | P1 | Interférence cardiovasculaire et conflits laissés en place | RC4.4 |
| F13 | P2 | Aucune progression en Cross-training et HYROX | RC4.6 |

Points de RC4.2 qui restent ouverts :
- les restrictions HYROX elles-mêmes (débutant refusé ; « Conditionnement stations » en avancé) relèvent de la décision R10 ;
- la sonde se contente de les **annoncer**.

### Tests disponibles
- **Vitest :** 234 fichiers.
  - Moteurs : strength, running, crosstraining, hyrox, planner, programme.
  - app-core : banc RC4 `tests/rc4-audit` ; `tests/rc4` (RC4.1, RC4.2) ; RC3.x ; migrations RC1 → RC3.
  - DOM de l'application.
  - Garde de déploiement.
- **E2E :** `pnpm kairo:e2e`, Chromium mobile sur `vite preview`.
  - `e2e-rc1-test.mjs` n'existe que sur la branche TEST.

---

## 3. Risques d'intégration (RC4 → TEST)

| # | Risque | Gravité | Constat / parade |
|---|---|---|---|
| I1 | Conflits Git | Faible | Aucun fichier commun ; fusion d'essai propre ; suite complète verte. À refaire juste avant l'intégration réelle. |
| I2 | Repli RC1 TEST | Faible | RC4.1 et RC4.2 n'ajoutent **aucun champ persisté**. Le ressenti utilise `running.realized[].unexpectedDifficulty`, dont l'énumération existe déjà en RC1 (`.strict()` intact). Le repli `b2b1f3f` reste valable. **Toute étape suivante qui persiste un nouveau champ (RC4.3 en particulier) devra mettre à jour le repli.** |
| I3 | Changement de comportement après repli | Moyen | Des courses avec ressenti connu, relues par RC1, déclenchent la progression Running de RC1. C'est attendu, mais à signaler aux testeurs. |
| I4 | Renommage REKKA | **Élevé si mal fait** | Le préfixe de stockage `kairo-rc1-test:`, l'identifiant du manifest `./?kairo-channel=rc1-test`, le cache du service worker et la clé `STORAGE_KEY` identifient les données des testeurs. **Ne renommer que les libellés visibles.** Changer une clé sans migration ferait perdre profils, historiques et douleurs. |
| I5 | Branches non gardées | Moyen | Seule la publication de production est gardée. Dix branches anciennes portent encore un workflow non gardé (constat RC3 TEST) : la production n'est donc pas totalement protégée. |
| I6 | Build TEST absente de RC4 | Faible | Le canal TEST n'existe que sur sa branche. Toute candidate RC4 TEST doit passer par une branche d'intégration, comme `a7c1e51`, puis par `build:rc1-test` et l'E2E du canal. |
| I7 | Régressions sportives | Moyen | RC4.1 change la Course : elle progresse désormais (+1 répétition au seuil, +1 min en footing, par paliers). C'est voulu, mais visible par les testeurs, et à annoncer. |

---

## 4. Conception RC4.3 — courses libres

### 4.1 Fonctionnement actuel (lu dans le code)

1. **Enregistrement.** `logFreeRun` (`app-core/src/app.ts:212`) enregistre toute course libre dans le contrat Running (`running.realized`), sous l'identifiant `free:<instant de fin>`, toujours en **`EASY` / `CONTINUOUS`**.
2. **Ancre de dose V19.** `historyAnchor` (`running/src/wave2/history.ts:122`) prend la **dernière** séance réalisée du même type, sans distinguer son origine. Une course libre de 80 min devient donc la dose des footings : c'est F2.
3. **Progression V23.** `progressionStep` (`running/src/wave3/progression.ts:73`) exige que les N dernières séances du même type aient la même dose que l'ancre.
   - Une course libre de durée différente intercalée **bloque** la progression.
   - Une course libre de même durée **compte** comme preuve de tolérance.
4. **La course déclarée à l'onboarding est elle-même une course libre** (`createBeta0Programme`, `lastRun` → `logFreeRun`). C'est l'**ancre du premier footing** de tous les profils Course. Sans date, elle est horodatée au moment de l'onboarding.
5. **Autres usages internes à la Course :**
   - allure observée pour le TEST : toutes courses continues terminées récentes, sans distinction d'origine ;
   - levée de reprise (V25) ;
   - séances à forte demande (V10/V11) : seulement pour les archétypes LONG et qualité, donc jamais pour une course libre aujourd'hui.
6. **Autres sports.** Les voisines du planificateur et l'interférence Musculation (`recentOf`, `app-core/src/planning.ts:228`) ne lisent **que les séances du programme**. Les courses libres sont invisibles : c'est F3.
7. **Doublons.** `checkedFreeRun` refuse :
   - un identifiant déjà présent ;
   - un **chevauchement horaire** avec toute course réalisée, programme compris (`DUPLICATE_RUN`).

   Une course **datée sans heure** (RC3.4) reçoit l'instant conventionnel du jour. Elle peut donc doubler une course du programme du même jour sans la chevaucher.

### 4.2 Options comparées (mesurées sur le banc RC4)

Mesure : banc RC4, 6 semaines, chemin Beta 0 réel, ressenti « comme prévu ».

Deux scénarios s'ajoutent :
- P2 + 90 min libres la veille de la Musculation (F3) ;
- P1 + 90 min libres le dimanche.

Variantes sur la dose (F2) :

| Variante | Règle | Résultat banc |
|---|---|---|
| **V0** statu quo | Toute course libre = dernière dose EASY | **P4 :** S5–S6 = un footing de 80–81 min, 2 courses sur 3 non planifiées (`TIME_EXCEEDED`), seuil perdu, mode entretien. **P1, P1b, P5 :** seuil 3→4×5 min, footing 30→32 min. |
| **B** exclusion totale | Les courses libres ne sont jamais ancre ni preuve | ❌ **Rejetée.** Tous les footings deviennent `DOSE_ANCHOR_UNAVAILABLE` dès S2–S3 (P1, P1b, P4, P5), car la course de l'onboarding n'ancre plus rien. Les profils Course perdent leurs footings. |
| **A** programme d'abord | Ancre = dernière séance **du programme** du même type ; une course libre n'ancre qu'en l'absence de séance programme ; preuve de tolérance = séances programme seulement | **P4 corrigé :** S5–S6 = seuil 5×5 min + 2 footings de 33–34 min. **P1, P1b, P5 :** footing en retard d'une semaine (30 au lieu de 31 min en S3), car la course de l'onboarding ne compte plus comme preuve. |
| **A′** programme d'abord, preuve de même dose acceptée | A, mais une course libre de **même dose** que l'ancre compte encore comme preuve | ✅ **P4 corrigé** comme A. **P1, P1b, P2, P3, P5 identiques à V0** (aucune régression). |
| A + typage LONG | A, et la course libre déclarée « longue » est enregistrée LONG | P4 corrigé. Seul effet en plus : réordonnancement de la semaine S5 (la course longue compte comme forte demande dans V10/V11). Aucune régression ailleurs. |

Variante sur la charge (F3) :

| Variante | Règle | Résultat banc |
|---|---|---|
| **W0** statu quo | Courses libres hors voisines | P1 avec 90 min libres le dimanche : Musculation du lundi inchangée. |
| **W1** voisines réalisées | Courses libres de la semaine précédente ajoutées à `recentOf`, comme course continue de durée réelle | **P1 :** le lundi reçoit `running@-24h lower_hip:full, lower_knee:full`. L'allègement est tracé, les courses du programme sont inchangées. **P2 (pas de sport Course) : aucun effet,** car il n'existe pas de port Course pour dériver la demande. **Effet de bord :** la course de l'onboarding, horodatée à l'onboarding, entre aussi comme voisine (fausse charge) ; il faut l'exclure. |

Doublons (scénario « P1 + libre dimanche », « P5 + libre ») :
- la saisie qui chevauchait une course du programme a été **refusée** (`DUPLICATE_RUN`) ;
- la protection horaire fonctionne ;
- le cas « date sans heure » reste ouvert (§4.1, point 7).

### 4.3 Conception proposée

1. **Origine explicite, sans nouveau champ persisté.**
   - L'origine « libre » se lit dans l'identifiant existant `free:`.
   - app-core la transmet au moteur dans le **contexte** (non persisté) : `RunningContext.freeSessionIds`.
   - Aucune migration, aucun impact sur le repli.
2. **Dose : variante A′ (décision R2).**
   - L'ancre V19 privilégie les séances du programme.
   - Une course libre n'ancre que si aucune séance programme n'existe : c'est le cas de la course d'onboarding et des profils sans historique.
   - Preuve de tolérance V23 : séances programme, plus les courses libres de **même dose**.
   - C'est un changement de **règle gouvernée** : le registre V19 gagne `freeRunPolicy: 'PROGRAMME_FIRST'`. Il est tracé (`DOSE_ANCHOR_SELECTED` porte l'origine) et soumis à votre validation.
3. **Typage à la saisie** (facultatif, défaut « non précisé ») : « Footing facile », « Sortie longue », « Séance de qualité ».
   - **Facile et non précisé :** `EASY` (comportement actuel).
   - **Sortie longue :** archétype existant `LONG` (énumération déjà connue de RC1 : aucun champ nouveau). Elle compte comme forte demande (V10/V11), mais n'ancre pas la sortie longue du programme (A′).
   - **Qualité :** l'archétype seul ne suffit pas, il faudrait une structure réalisée (répétitions, durées). Deux possibilités :
     - (a) choix explicite parmi Seuil, Fractionné, Côtes, enregistré `INTERVALS` sans structure : compte comme forte demande, n'ancre jamais ;
     - (b) attendre une saisie de structure.

     Je recommande (a), sous réserve de votre décision.
   - La **modification** (RC3.4) permet de corriger ce type.
4. **Charge des autres sports : variante W1 (décision R3).**
   - `recentOf` et l'évaluation au démarrage (`startAssessment`) ajoutent les courses libres **datées** comme voisines réalisées.
   - Leur brouillon de séance est produit par le port Course à partir de la durée et du type réels ; aucune valeur inventée.
   - La course d'onboarding sans date est exclue.
   - Le port Course doit être disponible même si la Course n'est pas un sport du programme : c'est une dépendance planificateur (cas P2).
   - Les courses libres de la **semaine en cours** n'agissent qu'au démarrage de séance (contrôle d'interférence) ; la semaine déjà planifiée n'est pas recomposée.
5. **Anti-doublons.**
   - Garder l'identifiant unique et le refus de chevauchement.
   - Ajouter un **avertissement** (pas un refus) quand une course datée sans heure tombe le même jour qu'une course du programme déjà réalisée, avec deux choix : « C'est la même course » (annuler) ou « Course supplémentaire ».
   - Une course libre et une séance du programme ne sont jamais fusionnées automatiquement.
   - Le même mécanisme servira à l'import Strava (§5, n° 5).
6. **Préservation.**
   - Aucune donnée réécrite. Les courses libres existantes restent `EASY`.
   - Les références de performance restent déclarées à part (`declareRunningPerformance`) : une course libre n'en crée jamais.
   - L'allure observée pour le TEST continue d'utiliser toutes les courses continues.
   - L'historique et l'export restent inchangés.

### 4.4 Décisions à prendre avant implémentation

| # | Décision | Recommandation |
|---|---|---|
| R2-a | Règle d'ancre | A′ « programme d'abord, preuve de même dose acceptée » |
| R2-b | Typage à la saisie | Facultatif, trois types ; Qualité selon l'option (a) |
| R2-c | Course longue libre et sortie longue du programme | N'ancre pas (A′) ; forte demande |
| R3 | Courses libres voisines des autres sports | Oui, si datées ; port Course disponible sans sport Course |
| R3-b | Course d'onboarding | Jamais voisine si non datée |
| D-dup | Même jour sans heure | Avertissement avec choix explicite |

---

## 5. Feuille de route mise à jour

| Phase | Contenu | Dépend de |
|---|---|---|
| **RC4.3** | Courses libres : dose, typage, charge, doublons (§4) | R2, R3 |
| RC4.4 | Semaine multisport : repos, enchaînements, conflits (F9–F11) | R4, R5 |
| RC4.5 | Musculation : équilibre, couverture, variation (F4–F6, F8) | R6, R7, R9 |
| RC4.6 | Progressions Musculation, Cross-training, HYROX (F7, F13) | R8, R11 |
| **RC4 TEST** | Branche d'intégration RC4 → TEST, libellés « REKKA », migration de libellés seulement | accord de déploiement |
| **R5.1** | Planning Liste / Grille, agenda à une ligne par jour : **développé** (`R5.1-PLANNING-GRILLE.md`), en attente de validation | — |
| **R5.2** | Avertissement muscles récemment sollicités (n° 2) | RC4.3 (voisines réelles), RC4.4 |
| **R5.3** | Rotation Haut A / Haut B (n° 3) | RC4.5 (R9) |
| **R6.x** | Strava (n° 5) | RC4.3, backend |
| **R7.x** | Coach IA conversationnel (n° 4) | R5.2, R6, backend |

### 1. Planning hebdomadaire Liste / Grille

> **Mise à jour 2026-10-20 (décision de l'utilisateur après RC4.5).** La vue grille retenue est celle **validée à partir de sa capture**. Ce n'est **pas** un calendrier classique à sept cases. Elle est prévue pour le **prochain lot UI**, sans modification des moteurs sportifs.

- **Présentation validée :**
  - agenda hebdomadaire avec **une ligne par jour** (lundi → dimanche, de haut en bas) ;
  - **cartes de séances côte à côte** sur la ligne du jour ;
  - **sélecteur Liste / Grille** ;
  - **couleur par sport** (Musculation, Course, Cross-training, HYROX ; course libre distinguée) ;
  - **séances cliquables**, qui ouvrent le détail ou le démarrage comme dans la liste actuelle.
- **Mobile lisible :** à 360 px, la ligne d'un jour garde ses cartes côte à côte et défile horizontalement si nécessaire. Le jour reste visible en tête de ligne. Pas de 7 colonnes compressées.
- **Interdit :** remplacer la vue par une grille calendrier 7 cases × semaines ; modifier app-core ou les moteurs pour cette vue.
- **Architecture :**
  - interface seule (`apps/kairo/src/screens/beta0/Planning0.tsx` et un composant `WeekAgendaGrid`) ;
  - données existantes de `selectBeta0Week`, sans changement d'app-core : date, sport, statut, explication G5 / M3, lettre de variante actuelle ;
  - mode mémorisé par lecteur (`localStorage` encapsulé, préférence d'affichage non sportive).
- **Accessibilité :** une liste par jour (`role="list"`) ; cartes focusables au clavier ; libellé complet par carte (jour, sport, archétype, statut) ; contraste des couleurs de sport vérifié ; la couleur n'est jamais la seule information (texte du sport sur la carte).
- **Tests prévus :**
  - DOM : bascule Liste ↔ Grille, ordre des jours, cartes par jour, clic qui ouvre la séance, persistance du mode ;
  - E2E mobile à 360 px : aucune coupure de texte, défilement horizontal limité à la ligne ;
  - non-régression du Planning en liste.
- **Dépendances :** aucune (lecture seule des données existantes).
- **Phase :** R5.1, **prochain lot UI**.

### 2. Avertissement muscles récemment entraînés, maintien volontaire
- **Architecture :**
  - app-core : nouvelle évaluation `startAssessment` étendue à **toutes** les séances, pas seulement `composed_unplaced`.
  - Elle lit les structures et demandes réelles (ports, `manualPlacementConflicts`, fenêtres G4/M3) des séances **réalisées**, voisines libres comprises.
  - Résultat : « avertissement » (groupes, heures écoulées) plus choix « Maintenir quand même ».
  - Le maintien est tracé dans le journal de séance (provenance).
  - **Exceptions :** pause douleur active, refus G1 du CORE, refus du moteur. Elles restent **bloquantes** : aucun contournement possible.
- **Dépendances :**
  - RC4.3, pour voir les courses libres ;
  - RC4.4 (R5), pour valider les fenêtres aujourd'hui `TEST_ONLY` ;
  - décision sur les seuils d'avertissement.
- **Risques :**
  - fatigue d'alerte (trop d'avertissements en P5) ;
  - confusion entre avertissement et interdiction : le texte doit distinguer « déconseillé » et « bloqué par sécurité » ;
  - la persistance du maintien ajoute un champ de journal, donc une mise à jour du repli.
- **Phase recommandée :** R5.2, après RC4.4.

### 3. Rotation Haut A / Haut B, compléments, progression indépendante
- **Architecture :**
  - moteur Musculation : la règle de composition `STRENGTH_WEEKLY_COMPOSITION_CANDIDATE` (`strength/src/composition.ts:44`) fait aujourd'hui tourner `str_upper` / `str_lower` à 4 séances ;
  - il faut deux **variantes** d'archétype (`str_upper_a`, `str_upper_b`, et symétriquement pour le bas si décidé), avec des créneaux d'exercices complémentaires (A : développé et tirage horizontaux ; B : vertical, par exemple) ;
  - chaque variante a ses **pistes** (S4 « keep_incumbent ») et sa progression **par exercice et par variante**.
- **Dépendances :**
  - R9 (variation intra-semaine, F8) ;
  - revue du contenu provisoire ;
  - fréquences prises en charge (4 séances ; 5–6 limitées) ;
  - gouvernance (règle candidate, jamais approuvée).
- **Risques :**
  - migration des pistes existantes : les séances `str_upper` passées alimentent A et B, sans perte de charge de référence ;
  - volume hebdomadaire (F5) ;
  - taille de l'état.
  - C'est un changement de **règle sportive**, donc soumis à validation.
- **Phase recommandée :** R5.3, après RC4.5.

### 4. Coach IA conversationnel avec confirmation
- **Architecture :**
  - **le coach ne prescrit jamais.** Il propose des **commandes typées** déjà exposées par app-core :
    - déplacer ou reporter une séance ;
    - remplacer un exercice (substitution existante) ;
    - modifier une durée disponible, le matériel ou la fréquence (recréation du programme) ;
    - saisir une charge réalisée ;
  - chaque proposition est **rejouée par les moteurs** (aperçu : `previewBeta0Recreation`, substitution, sonde de faisabilité) et affichée avec ses conséquences ;
  - elle n'est appliquée qu'après **confirmation explicite** ;
  - les refus de sécurité ne sont jamais contournables.
  - **Serveur obligatoire :** la PWA est statique (Cloudflare Pages, gh-pages). Il faut une fonction serveur (Cloudflare Pages Functions) qui détient la clé de l'API du modèle, puis :
    - limitation de débit ;
    - consentement ;
    - minimisation des données envoyées (pas de nom ni d'historique brut ; résumé dérivé) ;
    - journal des actions acceptées.
- **Dépendances :**
  - n° 2 (vocabulaire avertissement / blocage) ;
  - commandes app-core idempotentes ;
  - serveur partagé avec Strava ;
  - politique de confidentialité, car les données de santé (douleurs) sont des données sensibles (RGPD) ;
  - choix du fournisseur et du modèle.
- **Risques :**
  - **sécurité sportive** : une proposition hors règles, d'où le filtrage obligatoire par les moteurs ;
  - hallucination présentée comme conseil, d'où un libellé « proposition » et la source des règles ;
  - coût et disponibilité hors ligne (le coach est indisponible hors ligne, l'application doit rester complète sans lui) ;
  - confidentialité ;
  - injection de contenu dans les conversations.
- **Phase recommandée :** R7, après Strava (le serveur, l'authentification et le consentement sont mutualisés) et après stabilisation des règles RC4.

### 5. Connexion Strava
- **Architecture :**
  - OAuth Strava, qui exige un **serveur** pour le secret client et le rafraîchissement des jetons (Cloudflare Pages Functions, avec stockage chiffré des jetons par utilisateur) ;
  - l'application aujourd'hui sans compte doit gagner une **identité** minimale ;
  - import :
    - les activités course passent par le **même chemin que les courses libres RC4.3** (`logFreeRun`), avec leur origine (`strava:<id>` dans l'identifiant, sans nouveau champ si possible), le type (facile, longue, qualité) proposé à partir des données Strava puis **confirmé par l'utilisateur**, la distance et l'allure ;
    - les autres activités (vélo, renforcement) deviennent des voisines de charge (R3), sans contrat sportif aujourd'hui : décision à prendre.
  - Récupération : par la voie W1 (voisines réalisées).
- **Anti-doublons :**
  - même identifiant Strava : ignoré ;
  - chevauchement avec une course du programme ou une course libre : rapprochement proposé (« C'est cette séance ? ») et jamais fusionné en silence ;
  - une séance du programme réalisée et importée garde une **seule** exposition.
- **Dépendances :**
  - RC4.3 (origine, typage, anti-doublons, voisines) ;
  - serveur et identité ;
  - conditions de l'API Strava (quotas, affichage de la marque, interdiction de certains usages : à vérifier au moment de la phase) ;
  - consentement.
- **Risques :**
  - fausses charges (montre oubliée, trajet à vélo) ;
  - doubles comptages ;
  - **une sortie longue Strava qui écrase la dose (F2) : c'est exactement ce que RC4.3 doit empêcher en premier** ;
  - révocation d'accès ;
  - confidentialité.
- **Phase recommandée :** R6, après RC4.3 et la mise en place du serveur ; d'abord en lecture seule et en import manuel déclenché.

---

## 6. Prochaine implémentation recommandée : RC4.3

Après vos décisions R2 et R3 (§4.4).

### Périmètre
1. **Moteur Running :**
   - contexte `freeSessionIds` (non persisté) ;
   - V19 « programme d'abord » et V23 « preuve de même dose » (A′), via un paramètre gouverné tracé.
2. **app-core :**
   - typage de saisie facultatif (EASY / LONG / qualité selon la décision) ;
   - voisines réalisées W1 dans `recentOf` et `startAssessment` ;
   - exclusion de la course d'onboarding non datée ;
   - avertissement « même jour ».
3. **Interface :**
   - formulaire de course libre (type facultatif, avertissement de doublon) ;
   - affichage du motif d'allègement côté Musculation.

### Critères de validation
| Critère | Attendu |
|---|---|
| F2 (P4, 80 min libres) | S4–S6 : 3 courses sur 3, seuil conservé et progressant ; test F2 réécrit |
| Non-régression banc | P1, P1b, P2, P3, P5 : matrice RC4 **identique** à 242f101, hors F3 |
| F3 (P1, 90 min libres la veille) | Allègement Musculation tracé (`running@-24h`) ; P2 (sans sport Course) : allègement aussi, ou limite documentée si le port Course reste indisponible |
| Onboarding | Premier footing toujours ancré sur la course déclarée ; course non datée jamais voisine |
| Doublons | Chevauchement refusé (inchangé) ; même jour sans heure : avertissement, choix explicite |
| Préservation | Courses libres existantes inchangées (fixtures RC1 et RC3) ; références de performance intactes ; allure observée du TEST inchangée |
| Persistance | Aucun nouveau champ persisté, ou mise à jour du repli `kairo-rc1-test-rollback` et test de repli si un champ est ajouté |
| Validation | `pnpm check`, build, DOM du formulaire, E2E ; matrice et rapport `docs/kairo/RC4.3-REPORT.md` |

**Aucune implémentation avant votre accord.**
