# KAIRO Beta 0 — Strength Weekly Composition S1

## 1. Problème observé

Dans une semaine hybride, toutes les séances Strength étaient `str_full_body`, avec les mêmes exercices.

Reproduction : profil intermédiaire, hypertrophie, 4 séances Strength + 3 Course, 60 min par jour (90 min le samedi), salle complète. Avant correction :

| Jour | Archétype | Exercices (hors échauffement) |
|---|---|---|
| lun. | `str_full_body` | squat barre, chest press machine, traction, pec deck, élévations latérales |
| mer. | `str_full_body` | squat barre, chest press machine, traction, élévations latérales, pec deck |
| jeu. | `str_full_body` | squat barre, chest press machine, traction, élévations latérales, pec deck |
| sam. | `str_full_body` | squat barre, chest press machine, traction, élévations latérales, Pallof, pec deck |

Les autres valeurs capturées étaient identiques d'une séance à l'autre :
- empreintes disponibles ;
- profils de demande : `lower_knee` high, `upper_push` high, `upper_pull` high, `axial` high…

Seules les graines différaient (`planner:<requestId>:<date>`).

## 2. Cause exacte

1. **Archétype imposé hors de Strength.** La définition de programme Beta 0 déclarait `str_full_body` pour chaque séance. C'était un choix temporaire d'app-core, fait faute de règle de split (`beta0.ts`, `STRENGTH_ARCHETYPE`).
2. **Contexte identique pour chaque séance.** Le port Strength du Global Planner construisait le contexte de chaque séance avec :
   - `week.otherStrengthSessions: []` ;
   - `recentExposures` réalisées seulement, vides en début de programme ;
   - un historique d'empreintes réalisées seulement.

   Les mécanismes Strength existants étaient donc présents mais aveugles :
   - l'alternance des groupes de choix (« principal genou OU hanche », le besoin le moins récemment exposé d'abord) ;
   - le critère de récence ;
   - l'anti-doublon du CORE ;
   - le volume hebdomadaire.

   Chaque séance était générée comme la première de la semaine.
3. **La graine ne crée pas de variété.** Elle ne départage qu'une égalité PARFAITE de critères (spec 01 §6). Les rares écarts d'accessoires venaient de ces égalités, jamais d'une décision.

C'était donc une duplication accidentelle par défaut de contexte, pas une répétition intentionnelle.

## 3. Audit des capacités Strength

| Capacité | Où | Statut |
|---|---|---|
| Archétypes `str_full_body`, `str_upper`, `str_lower`, `str_support` | ruleset `strength.archetypes` | draft / provisional (fixture verrouillée 0.4.0) |
| Splits | spec 02 §5.1–5.2 (prose) : full body 1–3 séances/sem. ; « à 4 séances, haut / bas ×2 » ; push / pull hors V1 | **absent du ruleset** (spec brouillon) |
| Fréquence | P6 : « le moteur n'impose aucune fréquence » | `CONTEXT_DEPENDENT`, aucune valeur |
| Patterns, besoins, emplacements, groupes de choix | `strength.needs`, emplacements des archétypes | `EXPERT_DESIGN_REVIEW` |
| Sélection d'exercices (critères lexicographiques, récence, continuité principe H) | `strength.selection.*` | provisional |
| Tracks de progression, ancres | `strength.tracks`, `strength.progression` | provisional (ancres non déclarées en Beta 0) |
| Historique réalisé | `recentExposures`, `hardSets.d7`, empreintes `completed` | contrat existant |
| Anti-doublon | CORE `analyzeDuplicates` (historique `completed` **et** `planned`) | paramètres provisoires |
| Variété / exposition récente | critère `recency` + alternance des groupes de choix | provisional |
| Récupération same-discipline | — | **absent** |
| Volume hebdomadaire (plancher / haut) | `strength.volume` + `week.otherStrengthSessions` | `PROGRAMMING_HEURISTIC` |
| Objectif | `goal.primary`, `strength.goals.needPriority` | `EXPERT_DESIGN_REVIEW` |
| Phase | contexte `phase` (fixe en Beta 0 : accumulation, semaine 1) | non gouvernée |
| Interaction multisport | `strength.interference(.assessment)` sur les voisines d'AUTRES disciplines | provisional |
| TEST_ONLY | valeurs de fixtures, normalisation des doses (SIMULATION_ONLY Beta 0) | — |

## 4. Changements effectués

### Responsabilités

| Acteur | Décide |
|---|---|
| Programme Engine | objectif, fréquence, priorité, cadre d'intention (stimulus, objectif, phase, tolérance), `composition: 'engine'` pour Strength. **Aucun archétype.** |
| Global Planner | jours, puis génération dans l'ORDRE DES DATES, en transmettant les séances de la même discipline déjà placées (`weekSessions`). **Aucun split.** |
| Strength | archétype de chaque séance (`composeStrengthWeek`) et contenu de chaque séance, en connaissant les séances prévues avant elle |
| React | rien : libellés seulement (« Full body », « Haut du corps », « Bas du corps ») |

### Strength (`packages/strength/src/composition.ts`)

`composeStrengthWeek(objectif, niveau, fréquence, jours placés, règle, mode) → archétype par jour | refus`.

La règle `strength.rules.weeklyComposition` 0.1.0-candidate est une **citation** de la spec 02, jamais approuvée :

| Séances / sem. | Rotation | Source |
|---|---|---|
| 1–3 | full body à chaque séance | spec 02 §5.2 A1 « 1 à 3 séances par semaine » |
| 4 | haut / bas en alternance (×2) | spec 02 §5.1 « À 4 séances, haut / bas ×2 » |
| 5 et plus | **aucune** : refus `RULE.WEEK_COMPOSITION_UNGOVERNED` (`frequency_not_covered`) | push / pull hors V1 |

Autres règles de la composition :
- **Ordre de la rotation.** La première séance est l'archétype qui porte le besoin le plus prioritaire de l'objectif (table gouvernée `strength.goals.needPriority`) : hypertrophie → haut d'abord ; force / général → bas d'abord. Ensuite, alternance dans l'ordre des dates.
- **Jour trop court** (durée minimale de l'archétype, donnée du ruleset). Le jour est échangé avec un jour de l'autre archétype si l'échange rend les deux faisables (tracé `swaps`). Sinon, le moteur refusera la séance, raisons à l'appui.
- **Autorité.** `provisional` en CANDIDATE. En PRODUCTION, la règle est non résolue et les séances sont refusées (`rule_not_approved`). Sans règle : refus (`rule_absent`).
- **Trace** sur chaque séance : `PLAN.WEEK_COMPOSITION` (règle, version, statut, bande, rotation, besoin décisif, échanges).

**Expositions prévues** (`engine.ts`, alternance des groupes de choix). La « dernière exposition d'un besoin » lit :
- le RÉALISÉ (`recentExposures`) ;
- les empreintes **`planned`** transmises par le planificateur.

Les empreintes `completed` restent hors de ce calcul : elles sont déjà représentées par les séries exécutées. Le comportement historique est inchangé (golden G10 conservé).

### Global Planner

- `SlotRequest.weekSessions` contient les séances de la même discipline placées plus tôt dans la semaine : séance, archétype, empreinte.
- Le port Strength les transmet de deux façons :
  - `week.otherStrengthSessions` (séries prévues par groupe, **`done: false`**) ;
  - historique d'empreintes de statut **`planned`**.

  Elles ne sont jamais présentées comme réalisées.
- La composition et la seconde passe (contexte voisin) régénèrent dans l'ordre des dates. La séance de mercredi connaît la version définitive de celle de lundi.
- Nouvelle trace `PLAN.PLANNER.WEEK_EXPOSURES` : nombre et identifiants des séances prévues transmises.

### Même discipline (planificateur)

**Constat.** G4 ne compare que des disciplines DIFFÉRENTES (`conflictsOf` ignore `p.sport === sport`). L'interférence Strength (`strength.interference.assessment`) ne reçoit que les voisines d'autres disciplines. Le same-discipline Strength était donc **totalement ignoré**.

Les profils de demande et les structures de chaque séance Strength sont pourtant dérivés par le CORE : la détection est possible.

**Changement.** Pour chaque séance, la séance précédente de la même discipline est comparée. Si elles partagent des structures : `PLAN.PLANNER.SAME_DISCIPLINE_UNGOVERNED` avec les structures partagées et l'écart en heures.

Ce signalement n'est jamais un blocage ni un espacement. **Aucune fenêtre** (24 / 48 / 72 h) n'est créée : il n'en existe aucune de gouvernée pour une même discipline.

## 5. Comportement par fréquence (profil reproduit)

| Fréquence | Composition | Variation intra-semaine |
|---|---|---|
| 1 | full body | — |
| 2 | full body ×2 | principal genou puis hanche (le moins récemment exposé) |
| 3 (force + course) | full body ×3 | principal genou / hanche / genou ; accessoires différents ; anti-doublon `accidental_warn` sur la 3ᵉ (souple) |
| 4 (hypertrophie + course) | haut / bas / haut / bas | voir la semaine observée ci-dessous |
| 5 et plus | non planifiée (`governance_blocked`), message clair dans l'interface | — |

Semaine observée après correction (4 séances, hypertrophie) :

| Jour | Archétype | Exercices |
|---|---|---|
| lun. | Haut du corps | développé couché 4, traction 3, rowing machine 3, développé épaules 2, pec deck 4 |
| mer. | Bas du corps | squat 3, soulevé de terre roumain unilatéral 2, Pallof 4 |
| jeu. | Haut du corps | développé couché 3, tirage vertical 3, rowing poulie 2, développé épaules 2, élévations latérales 3, Pallof 3, pec deck 3 |
| sam. | Bas du corps | squat 2, soulevé de terre roumain 2 |

**Répétitions observées (décisions du moteur, pas des clones).**
- **Principal du haut.** Le développé couché revient jeudi : les deux besoins de poussée ont été exposés lundi, donc la priorité de l'objectif départage.
- **Séances du bas du corps courtes (mercredi, samedi).** Elles sont entourées de courses (veille ou lendemain). L'interférence multisport EXISTANTE (`PLAN.INTERFERENCE_ASSESSED` HIGH à ±24 h sur `lower_knee` / `lower_hip`, valeurs provisoires) retire leurs optionnels du bas du corps (`SELECT.SLOT_OMITTED` cause `interference`). Le samedi, deux autres effets s'ajoutent :
  - le tronc est omis par le volume hebdomadaire PRÉVU (cause `volume`) ;
  - la part restante du volume réduit les séries des principaux (`DOSE.VOLUME_ALLOCATED`, 2 séries).

  Ce sont des règles existantes, appliquées pour la première fois avec le contexte de semaine. Avant correction, les full body ne portaient pas d'optionnels du bas du corps : cette interférence ne s'y voyait pas.

## 6. Ce qui reste non gouverné

- **Règle de split.** Elle reste une CANDIDATE (citation de spec), sans revue experte. Le choix full body à 3 séances, alors qu'upper / lower est aussi cité pour 3–4 séances dans la spec, suit A1.
- **5 à 7 séances Strength.** Aucune composition.
- **Récupération same-discipline.** Aucune fenêtre, aucun écart minimal : signalement seulement.
- **Ordre fin des jours haut / bas.** Alternance par date, sans règle de récupération.
- **Phase et périodisation.** Phase fixe en Beta 0.
- **Volume par séance dans une semaine dense.** C'est la règle E1 telle quelle. Sa répartition « séquentielle » (seules les séances antérieures sont connues) n'est pas une règle gouvernée de répartition.

## 7. Tests

**`packages/strength/tests/unit/composition.test.ts` (13 tests)**
- bandes 1, 2, 3, 4, 5, 6, 7 ;
- ordre de rotation par objectif ;
- refus en PRODUCTION, sans règle, objectif non admis ;
- échange de jours ;
- jour verrouillé ;
- déterminisme.

**`packages/app-core/tests/strength-week.test.ts` (13 tests)**
- 1 / 2 / 3 / 4 / 5 séances ;
- Strength + Course ;
- historique vide et existant ;
- expositions prévues ≠ réalisées ;
- anti-doublon du CORE nourri par les séances prévues ;
- même graine, occurrences différentes ;
- demande dérivée et même discipline ;
- jours consécutifs ;
- déterminisme ;
- export / import ;
- V0 inchangé.

**`apps/kairo/tests/present.test.ts`** : libellés et message de refus.

**Non-régression** : suites Running, Cross-training, HYROX, V0, CORE et les goldens Strength inchangées.

La garde d'architecture Cross-training « Strength `src` inchangé depuis la baseline » liste désormais explicitement les 4 fichiers du lot S1 (liste fermée).

## 8. Bug post-S1 — l'application déployée affichait toujours 4 × Full body

### Cause exacte

Ce n'était pas le moteur, ni le bundle, ni le service worker.

La build servie par GitHub Pages contenait bien S1 :
- `version.json` = `f837b9a` ;
- l'asset servi (`index-BcqEkJJK.js`) contient `strength.rules.weeklyComposition` et « Haut du corps ».

Le problème venait de l'**état persisté**. Le code pré-S1 (`ec84c88`) produit EXACTEMENT la semaine observée : fixture `packages/app-core/tests/fixtures/pre-s1-state.json`. Deux niveaux en cause :

1. **Semaine courante.** `planner.weeks['2026-10-05']` a été planifiée avant S1. Elle contient 4 `session_record` dont l'empreinte porte `archetypeId: str_full_body`, sans composition. `ensureBeta0Week` ne planifiait que si la semaine n'existait pas : elle n'était donc jamais régénérée.
2. **Toutes les semaines suivantes.** Le `ProgrammeState` pré-S1 conserve `sports.strength = { composition: 'declared', intent: { archetypeId: 'str_full_body', … } }`. Le Programme Engine rejoue cette intention à chaque semaine : sans correction, un programme pré-S1 restait en Full body **indéfiniment**.

`selectBeta0Week` et React affichaient fidèlement ce qui était stocké.

### Politique de mise à niveau

**Intention héritée** (`upgradeLegacyBeta0Programme`).
- Seule l'intention Strength TEMPORAIRE exacte de la Beta 0 pré-S1 est convertie :
  - définition `origin: profile` ;
  - plan `declared` ;
  - `str_full_body` avec le stimulus de l'objectif, `phase.accumulation` et la tolérance du ruleset ;
  - aucune variante, déclaration, évaluation ni station ;
  - intention courante identique.
- Elle devient le cadre sans archétype composé par le moteur Strength.
- Une intention explicite n'est jamais transformée.
- La mise à niveau est idempotente, tracée dans l'audit du programme (`KAIRO.PROGRAMME_STRENGTH_INTENT_UPGRADED`), et ne modifie aucune semaine.

**Semaine obsolète** (`weekPlanning`, `BETA0_PLANNING_VERSION = 'beta0-s1'`). Chaque semaine persistée porte désormais `planningVersion`. Une semaine d'une version antérieure (ou non versionnée) est :
- **régénérée** si elle n'est pas commencée : aucun résultat, aucune séance en cours, aucune séance planifiée à une date déjà passée, non clôturée. Audit `KAIRO.WEEK_REPLANNED_STALE` ; avis « replanifiée avec la nouvelle version » ;
- **conservée telle quelle** sinon (`stale_kept` + cause). Avis expliquant pourquoi ; la semaine suivante utilise la nouvelle composition.

`WEEK_NOT_REPLACEABLE` n'est jamais contourné. Aucune donnée n'est supprimée.

À incrémenter à chaque changement d'un compositeur ou de l'intention dérivée du profil.

### Affichage

- L'archétype affiché vient du `session_record` canonique (empreinte), contrôlé contre l'intention (`prescribedArchetype`).
- Absent ou incohérent : erreur de données visible.
- Un archétype inconnu s'affiche « Erreur de données : archétype inconnu (…) » ; aucun repli vers Full body ni « Musculation ».

### Version et mise à jour

- **Identifiant de build** (commit) injecté à la compilation. Il est affiché dans Réglages (« Version : abc1234 ») et comparé à `version.json`, toujours relu sans cache.
- **Bannière** « Nouvelle version de KAIRO disponible — Mettre à jour » si les deux diffèrent. Elle déclenche la mise à jour du service worker puis un rechargement.
- **Service worker** (`kairo-beta0-2`) :
  - navigations revalidées auprès du serveur (`cache: 'no-cache'`, plus le cache HTTP de 10 min de l'hébergeur) ;
  - enregistrement `updateViaCache: 'none'` ;
  - activation immédiate ;
  - anciens caches supprimés.
- **E2E du site déployé** : il vérifie que la version affichée est égale à la version publiée.

### Tests discriminants

- **`packages/app-core/tests/beta0-legacy-upgrade.test.ts`** :
  - contenu de l'état pré-S1 ;
  - mise à niveau, intentions explicites intactes ;
  - lundi : régénération ;
  - mercredi : conservation, puis S1 la semaine suivante ;
  - séance en cours et séance enregistrée : conservation ;
  - export / import ;
  - programme neuf ;
  - erreurs de données.
- **`apps/kairo/tests/strength-week-dom.test.tsx`** (jsdom, application réelle) :
  - A, programme neuf : onboarding avec 4 séances, DOM Haut / Bas en alternance égal à la composition renvoyée ;
  - B, état pré-S1 : lundi, DOM Haut / Bas / Haut / Bas avec avis ; mercredi, DOM Full body ×4 avec avis ; lundi suivant, Haut / Bas.
- **`apps/kairo/scripts/e2e.mjs`** (Chromium, build de production, aussi exécuté contre le site déployé) :
  - scénarios A et B jusqu'au DOM ;
  - version affichée égale à la version publiée.
