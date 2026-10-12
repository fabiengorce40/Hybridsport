# KAIRO — Spécification (lecture seule) : Planner multisport, récupération et arbitrage hebdomadaire

> **Statut : SPÉCIFICATION, aucune implémentation.** Ce document ne crée et n'active aucune règle sportive. Il sépare :
> **[EXISTANT]** ce qui est dans le code aujourd'hui (avec son statut de gouvernance), **[PROPOSITION TEST_ONLY]** ce qui
> pourrait être implémenté derrière un paramètre gouverné TEST_ONLY / SIMULATION_ONLY, et **[DÉCISION SPORTIVE]** ce
> qui exige une validation humaine avant toute implémentation.
>
> Base : branche intégrée PR #2 (C4.3) + PR #3 (correctifs Musculation) ; preuves :
> `packages/app-core/tests/consolidation/__reports__/consolidation-4-semaines.md`.

## 1. Principes (inchangés)

- Le **Planner arbitre**, il ne compose pas. Il place, déplace, échange, demande une recomposition et rend visibles les
  conflits. Les moteurs (Strength, Running, Cross-training, HYROX) restent seuls à choisir les exercices, doses et
  allures.
- **Aucune suppression silencieuse.** L'arbitrage M3 n'a pas d'action `DROP`. Une séance impossible reste
  « composée, non placée », avec ses raisons.
- **La douleur reste centrale.** La pause douleur suspend la planification. Une séance refusée pour sécurité n'est
  jamais déplacée pour contourner le refus.
- **Une règle absente échoue de façon sûre.** Politique absente ⇒ `POLICY_UNAVAILABLE`, comportement antérieur conservé.
  En production, les valeurs `draft` sont refusées.

## 2. Existant

| Élément | Où | Rôle | Statut |
|---|---|---|---|
| Fenêtres de présence de structure (G4) | `planner.interference.structureWindows` | 24 h, placement V2 | [EXISTANT] TEST |
| Règles de paire M3 | `planner.m3.pairRules` | conflit entre **sports différents**, 24 / 48 / 72 h | [EXISTANT] TEST_ONLY |
| Accumulation M3 | `planner.m3.accumulationRules` | succession de jours chargés (tous sports), 72 h | [EXISTANT] TEST_ONLY |
| Actions M3 | `planner.m3.actions` | `MOVE`, `SWAP`, `RECOMPOSE`, sans `DROP` | [EXISTANT] TEST_ONLY |
| Qui cède | `planner.m3.yieldPolicy`, `sessionImportance` | importance (séance clé) puis rang du sport | [EXISTANT] TEST_ONLY |
| Voisines transmises | `planner.m3.neighbourWindowHours` | 72 h | [EXISTANT] TEST_ONLY |
| Interférence côté Strength | moteur Strength (`neighborWindowHours` 36 h, recherche 72 h) | allège ou retire des emplacements (`slot_omitted:interference`) | [EXISTANT] règle moteur, valeurs TEST |
| Composition hebdomadaire Strength | `STRENGTH_WEEKLY_COMPOSITION_CANDIDATE` | 1–3 : Full Body ; 4 : Upper / Lower ; 5–6 : non composé | [EXISTANT] candidate |
| Bilan de volume par groupe | `assessStrengthWeekVolume` | plancher (`target`), haut (`high`), statut `achieved` / `reduced_by_constraint` / `unmet` | [EXISTANT] planchers expérimentaux, jamais augmentés |
| Délégation d'un bloc de force CT (C4.3) | `crosstraining.strengthBlock…` | Strength compose le bloc ; structures exclues du conditionnement | [EXISTANT] TEST_ONLY, SIMULATION_ONLY |
| Interférence intra-séance | `planner.intraSessionInterference` | ordre force → conditionnement | [EXISTANT] TEST_ONLY |
| Variation intra-semaine (4 séances) | `planner.strength.withinWeekVariation.test-0` | jumelle identique ⇒ variation, à volume égal | [EXISTANT] TEST_ONLY (PR #3) |
| Lecture de l'état du jour | `app.checkin.readinessMapping` 0.1.0-test | fatigue élevée ou mauvaise récupération ⇒ prudence | [EXISTANT] TEST_ONLY (PR #3) |
| Douleur (G1) | CORE `deriveSafetyRestrictions`, `detectRecurrence` | zones, pause, récurrence | [EXISTANT] règles de sécurité du CORE |
| Récupération entre séances de force | `strength-insight.ts` | **signal** seulement : groupes et exercices partagés à J+1 | [EXISTANT] `same_discipline_recovery` **UNRESOLVED**, jamais appliqué |

## 3. Constats (simulation 4 semaines, branche intégrée)

Profil : prise de masse, 3 séances de Musculation, 2 de Course et 1 de Cross-training « force + conditionnement »
par semaine, salle commerciale.

1. **Musculation deux jours de suite, chaque semaine.** Lundi et mardi partagent 5 groupes : bras, dos, tronc,
   fessiers, épaules. Mardi puis le bloc de force CT du mercredi partagent le tronc et les fessiers. Aucune règle ne
   s'applique : les règles M3 portent sur des sports **différents** et sur des structures CORE, pas sur des groupes
   musculaires.
2. **Volume du bas du corps effondré par la combinaison avec C4.3.** Avec le bloc de force CT, le moteur Strength
   retire `fb.single_leg` et `fb.iso_lower` des Full Body voisins (interférence).

   | Profil | Quadriceps | Ischio-jambiers | Mollets |
   |---|---|---|---|
   | Musculation seule | 13/10 | 10/8 | 4/4 |
   | + Course + CT mixte | 10/10 | 7/8 | 4/4 |
   | **+ CT « force + conditionnement »** | **2–4/10** | **2–4/8** | **0/4** |

   Le bloc CT n'apporte que ~1 série de quadriceps. Pour un objectif de prise de masse, c'est l'écart le plus
   important constaté.
3. **Excès non signalé.** Bras 16–20 séries pour un haut de 14, épaules 12–14 pour un haut de 16. Le bilan affiche
   `achieved` sans statut « au-dessus du haut ». Le calcul `atOrAboveHigh` existe dans la prescription, mais pas dans
   le bilan affiché.
4. **Le volume des blocs de force CT est absent du bilan Strength.** Les blocs sont comptés pour l'alternance des
   exercices (C4.3), mais pas dans `assessStrengthWeekVolume`.
5. **Prérequis technique : régénération non fidèle.** La régénération d'un créneau ne reconstruit ni les voisines de
   la semaine précédente ni l'historique d'exposition au moment de la planification. Une séance de Musculation n'est
   reproductible au démarrage que dans 2 cas sur 12. Le contrôle pré-séance garde alors la séance prévue ou la
   recompose en le signalant (correctif de consolidation). Un `MOVE` ou un `SWAP` M3 régénèrent la séance de la même
   manière.

## 4. Exigences

### 4.1 Récupération entre séances de force

- **[PROPOSITION TEST_ONLY]** Nouvelle famille de règles `planner.m3.forceRecoveryRules`, couvrant Musculation ↔
  Musculation, Musculation ↔ bloc de force CT, et bloc CT ↔ bloc CT.
  - Entrée : séries de travail par groupe musculaire (`sessionPlannedHardSets`, fonction existante du moteur
    Strength), calculées pour chaque séance de force **et** chaque bloc délégué.
  - Conflit : un groupe chargé au-delà d'un seuil dans deux séances séparées de moins de `withinHours`.
  - Actions : celles de M3, dans l'ordre gouverné.
    - `MOVE` ou `SWAP` d'abord : un placement lundi / mercredi / vendredi était possible dans la simulation.
    - Puis `RECOMPOSE` : le moteur Strength reçoit la voisine `key` et décide de l'accent, par exemple un autre
      groupe. Le Planner ne choisit jamais d'exercice.
    - Sinon, conflit résiduel visible : on réutilise `RECOVERY.PLANNER.M3_CONFLICT_UNRESOLVED`.
- **[DÉCISION SPORTIVE]**
  - Délai minimal entre deux séances chargeant le même groupe : par exemple 48 h, éventuellement différent selon le
    groupe ou le niveau.
  - Seuil de séries de travail qui « charge » un groupe.
  - Compter ou non les groupes secondaires (contributions fractionnaires de la fonction de volume).
  - Traitement d'un Full Body : tolérer deux jours consécutifs si l'accent diffère, ou non.

### 4.2 Arbitrage sur toute la semaine

- **[EXISTANT]** La boucle M3 traite les conflits un à un, du plus proche au plus éloigné, avec une borne
  `maxPasses` et une détection de boucles.
- **[PROPOSITION TEST_ONLY]**
  - Évaluation de la semaine **entière** avant d'accepter un placement, sur trois critères :
    - conflits résiduels (récupération et M3) ;
    - atteinte des planchers par groupe (masse) ;
    - protection des séances clés (endurance).
  - Recherche bornée (borne technique G3) et déterministe ; chaque alternative écartée est tracée.
  - Aucun critère pondéré n'est inventé : en cas d'égalité, l'ordre de priorité déclaré du programme s'applique.
- **[DÉCISION SPORTIVE]**
  - Ordre de priorité entre « plancher de volume masse » et « séance clé d'endurance » en cas de conflit.
  - Faut-il pouvoir échanger un jour de Course pour éviter deux jours de force consécutifs ?

### 4.3 Prévention des sollicitations excessives

- **[PROPOSITION TEST_ONLY]**
  - Statut `above_high` dans le bilan par groupe : il réutilise le `high` existant, sans nouvelle valeur.
  - Accumulation M3 étendue au même sport : 3 jours consécutifs chargés sur un même groupe.
  - Signal visible ; aucune réduction automatique hors moteur Strength.
- **[DÉCISION SPORTIVE]**
  - Au-delà du haut, que doit faire Strength : retirer d'abord des accessoires, ou seulement signaler ?
  - Les `high` actuels sont expérimentaux et doivent être validés avant d'agir dessus.

### 4.4 Blocs Strength intégrés au Cross-training

- **[PROPOSITION TEST_ONLY]**
  - Compter les séries du bloc délégué dans le bilan hebdomadaire Strength (`sessions` du bilan) et dans les règles
    de récupération du §4.1.
  - Signaler dans la séance hôte l'effet du bloc sur les séances Strength voisines : quelles réductions
    d'interférence il provoque.
- **[DÉCISION SPORTIVE]**
  - Le volume d'un bloc compte-t-il entièrement ou partiellement (fatigue du conditionnement qui suit) ?
  - Pour un objectif masse, faut-il interdire qu'un bloc CT retire du volume du bas du corps (constat 2) ?
  - Ou placer le bloc loin des Full Body ?
  - Ou orienter l'intention du bloc vers les groupes déficitaires ? (Strength décide, le Planner ne fait que demander.)

### 4.5 Conservation des objectifs (masse et endurance)

- **[EXISTANT]**
  - Les planchers par groupe sont expérimentaux et jamais augmentés automatiquement.
  - Les séances clés de Course sont protégées par `sessionImportance`.
- **[PROPOSITION TEST_ONLY]**
  - « Objectif en risque » visible quand un groupe ciblé reste sous son plancher 2 semaines consécutives (planifié ET
    exécuté).
  - Idem quand une séance clé d'endurance est déplacée ou non placée 2 semaines de suite.
  - Aucune compensation automatique.
- **[DÉCISION SPORTIVE]**
  - Horizon de mesure : semaine ou bloc de 2–4 semaines.
  - Tolérance sous le plancher.
  - Priorité finale entre les deux objectifs pour un profil hybride.

### 4.6 Semaine impossible à composer de façon cohérente

- **[EXISTANT]**
  - Séance « composée, non placée » avec ses raisons.
  - Pas de `DROP`.
  - 5–6 séances de Musculation non composées (limite affichée).
- **[PROPOSITION TEST_ONLY]**
  - Statut de semaine `INCOHERENT` : liste des règles violées et des alternatives essayées.
  - L'interface propose à l'utilisateur des choix **explicites** : réduire une fréquence, ajouter un jour disponible
    ou accepter le conflit.
  - Rien n'est appliqué sans son accord ; la décision est tracée.
- **[DÉCISION SPORTIVE]**
  - `DROP` avec consentement explicite est-il admissible ?
  - Quel sport cède en premier dans une semaine impossible : le rang du programme seul, ou l'importance de séance ?

## 5. Prérequis techniques (sans règle sportive)

1. **Régénération fidèle.** Persister, à la planification, les entrées du créneau :
   - voisines, y compris celles de la semaine précédente ;
   - référence de l'historique d'exposition et des empreintes ;
   - prescription de la semaine.

   Bénéficiaires : le contrôle pré-séance (l'adaptation selon l'état redevient possible) et les `MOVE` / `SWAP`. Une
   alternative consiste à adapter la séance **persistée** par la réparation du CORE, sans la régénérer.
2. **Volume par groupe des blocs délégués**, exposé par Strength (fonction existante) et persisté avec la séance hôte.
3. **Rapports de simulation** 4 et 12 semaines, avec critères chiffrés : conflits de récupération, groupes sous le
   plancher, groupes au-dessus du haut, séances non placées.

## 6. Critères d'acceptation proposés (à valider)

- **Profil de la simulation de consolidation :**
  - zéro paire de séances de force à moins du délai validé, ou chaque paire restante visible comme conflit résiduel
    avec ses alternatives ;
  - aucun groupe ciblé sous le plancher **à cause** d'un bloc CT sans que ce soit tracé et visible ;
  - aucun groupe au-dessus du haut sans statut visible.
- **Invariants :**
  - jamais de suppression silencieuse ;
  - jamais d'augmentation automatique du volume ;
  - la douleur prime ;
  - une semaine commencée n'est jamais replanifiée ;
  - une politique absente garde le comportement actuel.
- **Tests adversariaux :**
  - 7 jours sur 7 ;
  - un seul jour disponible ;
  - 4 séances de Musculation + bloc CT + Course clé ;
  - semaine avec douleur ;
  - semaine commencée ;
  - politique `draft` en production.
