# HYROX H2 — moteur de composition de séance

Base : `ae7c1e7` (C3.5). Cross-training est gelé ; ni C4, ni H2.5, ni H3, ni M3 ne sont commencés. H2 compose une **vraie séance HYROX à partir d'une intention de rôle**, en TEST_ONLY / SIMULATION_ONLY : aucune valeur n'est approuvée et la PRODUCTION reste fermée.

## 1. Point de départ : H1

| Élément H1 | Classement |
|---|---|
| Archétype `hybrid_race.h1_station` : une station demandée par le programme, une dose gouvernée | APPROVED comme mécanisme, valeurs absentes ⇒ fail-closed |
| `hybrid_race.h1.stationDoses` / `eligibleLevels` / `hybridPlanning` / `toleranceProfile` | UNRESOLVED (absents des rulesets réels) |
| Fixtures H1 (doses, charges, approbations) | TEST_ONLY |
| Exécuteur strict `runHyroxH1` (séance publiée = séance proposée) | APPROVED (réutilisé par H2) |
| Contrat de réalisation `zHyroxStationExecution` | DERIVED (mesure ≠ prescription) |
| Course, transitions, enchaînement, simulation | absents (BLOCKED en H1) |
| `station` dans le Programme et le planificateur | H1 seulement ; H2 n'en a pas besoin |

Ce qui manquait pour une vraie séance : un rôle de séance, une structure, plusieurs stations compatibles, une composante course, une durée estimée, une mémoire, et l'interprétation (gouvernée) du multisport.

## 2. Épreuve ≠ entraînement

- Le programme demande un **rôle** (`hybrid_race.h2.<rôle>`) et jamais une station.
- La structure de course n'est pas la structure par défaut. Une seule structure reproduit l'enchaînement de l'épreuve (`partial_sequence`), elle est réservée au rôle `partial_simulation` et exige l'ordre officiel **gouverné** (`hybrid_race.h2.raceSequence`).
- La simulation complète est **BLOCKED** : aucun rôle, aucune structure et aucun archétype ne la portent. Données manquantes : `FULL_SIMULATION_MISSING` (format d'épreuve, standards par division, distance officielle des segments, modèle de transition / roxzone, allure sous fatigue).

## 3. Frontières

| Sujet | Propriétaire | En H2 |
|---|---|---|
| Stations HYROX (dose, charge, ordre, compatibilité) | HYROX | composé |
| Course dans une séance HYROX | HYROX (distance et contexte) ; Running (allure) | distance gouvernée, allure `BLOCKED:RUNNING_ENGINE_DELEGATION` |
| Séance de course | Running | délégué : aucun moteur Running bis |
| Force maximale | Strength | délégué ; `strength_endurance` = stations chargées enchaînées, sans séries / RIR / %1RM |
| Aérobie / moteur général | Running ou Cross-training | DELEGATED (pas d'orchestration inter-moteurs ⇒ non composé) |
| Bloc `running` ou `strength` dans une séance HYROX | — | refus `*_ENGINE_DELEGATION_UNAVAILABLE` |
| Placement multisport | Planificateur | aucune station connue (test d'architecture) |

## 4. Taxonomie des rôles (`h2/taxonomy.ts`)

| Catégorie demandée | Verdict | Rôle H2 | Spécificité |
|---|---|---|---|
| station technique | BLOCKED (aucune règle d'acquisition) | — | — |
| station capacity | RETAINED_PROVISIONAL | `station_capacity` | SPECIFIC |
| strength endurance | RETAINED_PROVISIONAL | `strength_endurance` (stations chargées) | SPECIFIC |
| aerobic / engine | DELEGATED (Running / Cross-training) | — | GENERAL |
| compromised running | RETAINED_PROVISIONAL | `compromised_running` | RACE_SPECIFIC |
| mixed station conditioning | RETAINED_PROVISIONAL | `mixed_station_conditioning` | SPECIFIC |
| race-specific intervals | MERGED (même définition que compromised running) | `compromised_running` | RACE_SPECIFIC |
| partial simulation | RETAINED_PROVISIONAL (ordre gouverné exigé) | `partial_simulation` | RACE_SPECIFIC |
| full simulation | BLOCKED | — | — |

- **Spécificité** : qualitative, sans seuil. SPECIFIC = stations sans structure de course ; RACE_SPECIFIC = reproduit une caractéristique de l'épreuve (course après station, enchaînement) ; GENERAL = n'est pas composé par HYROX.
- **Structures** : `station_repeats` (une station × tours), `station_circuit` (plusieurs stations × tours), `run_station_alternation` ([station, course] × tours, chaque course vient après une station), `partial_sequence` ([course fraîche, station, course après station…], un seul passage).
- La cohérence rôle ↔ structure est définitionnelle (`structureFitsRole`). Une table gouvernée incohérente est refusée.

## 5. Pipeline (`h2/compose.ts`), sans aucun hasard

`INTENTION → RÔLE → STRUCTURE DE SÉANCE (blocs) → STRUCTURE → STATIONS / COURSE → DOSE → VALIDATION → (profil de demande : CORE) → PRESCRIPTION`

1. **Garde-fous** : simulation exigée en CANDIDATE ; multisport seulement si `hybridPlanning` ; reprise `NONE` seulement ; haute intensité suspendue ⇒ refus ; paramètres communs lus fail-closed ; niveau admis.
2. **Intention** : le rôle est-il décidé (`roles`) ? L'objectif est transporté. Un temps cible éventuel est tracé `NOT_INTERPRETED`.
3. **Structure de séance** : un seul bloc `main` est généré ; `warmup` / `cooldown` ont une place tracée mais ne sont pas générés ; `running` / `strength` ⇒ refus.
4. **Historique** :
   - fenêtre gouvernée ;
   - séances réalisées et séances **prévues** de la semaine, utilisées pour la variété ;
   - retour négatif sur la dernière séance réalisée de la fenêtre : refus ou stations écartées, selon la politique ;
   - aucune progression.
5. **Voisines / priorité** : transportées et tracées ; interprétées seulement via `neighbourPolicy`, qui fait **éviter** les stations sollicitant une structure de la voisine (jamais les exclure) ; la priorité n'a pas de politique (séance identique quel que soit le rang).
6. **Structure** : on essaie d'abord la moins récemment utilisée du rôle ; à égalité, l'ordre gouverné décide. Chaque structure écartée l'est avec ses causes.
7. **Stations** :
   - réservoir gouverné ∩ catalogue ;
   - causes d'inéligibilité : matériel, restriction, douleur, exclusion, station non rattachée, dose, politique de charge, métrique, débit, rôle chargé, historique ;
   - classement : fraîcheur → conflits avec les voisines → pertinence `hybrid_race` → identifiant.
8. **Options de volume** (gouvernées et ordonnées) : la première qui tient le domaine temporel et le temps utilisable est retenue ; chaque option écartée est tracée (`structure@tours×stations`).
9. **Prescription** : bloc `hybrid_station_work`, format `for_time` (tours, time cap) ; exécution stricte par le CORE (`H2_MODIFIED_BY_CORE` si le CORE modifie la séance).

## 6. Durée, doses, charges, transitions

| Notion | Règle |
|---|---|
| Durée **prescrite** | time cap = ⌈estimation lente × (1 + `timeCapMargin`)⌉. C'est un plafond, jamais une cible. |
| Durée **estimée** | Somme des quantités divisées par les débits gouvernés (`workRates`, jamais ceux du catalogue) ; une dose en durée est sa propre durée. |
| Domaine temporel | Estimation typique dans le domaine `timeDomains[rôle]`. |
| Temps utilisable | Disponible − marge du profil de tolérance du CORE (`toleranceProfile`). |
| Transitions | Comptées ; durée `null`, exclue de l'estimation et tracée (`durationS: unknown`). Le CORE garde sa propre estimation générique. |
| Doses | Unité native (`distance_m`, `reps`, `calories`, `duration_s`) ; aucune conversion. |
| Charges | Extension `load` générique du CORE (H1). Mouvement chargé sans `loadKg` gouverné ⇒ `LOAD_POLICY_UNGOVERNED` ; charge sur un mouvement non chargé ⇒ refus. |
| Course | Distance `runSegment[niveau]` du mouvement `runExercise` ; contexte `fresh` / `after_station` ; allure BLOCKED. |

## 7. Compatibilité et technicité (selon l'intention)

- **Rôles SPECIFIC** (accumulation non voulue) : refus en cas de famille ou de pattern redondant, ou de **structure locale dominante partagée**. « Structure locale » = structure dérivée des muscles et des patterns par `demand.derivationTable`, hors structures dérivées seulement des coûts globaux. Si la table est absente ⇒ `COMPATIBILITY_NOT_EVALUABLE`.
- **Rôles RACE_SPECIFIC** : l'accumulation est voulue ; les structures partagées sont tracées (`H2_ACCUMULATION`, `INTENDED_BY_ROLE`).
- **Technicité sous fatigue** : une station au-dessus de `technicalUnderFatigue.maxTechnicalCost[niveau]` n'est admise qu'en tout premier item d'un passage unique.
- Le grip n'a pas de règle d'accumulation propre (PROVISIONAL) : il agit seulement via les voisines.

## 8. Empreinte, variété, présentation

- **Empreinte** :
  - `stimulus` = rôle ;
  - `format` = structure ;
  - `repScheme` = stations dans l'ordre ;
  - `volumeByItem` = doses × tours ;
  - marqueurs : tours, items, time cap, segments courus, charges ;
  - jamais le résultat.
- **Variété ≠ hasard** : on classe les stations fraîches d'abord et on prend la structure la moins récente ; une répétition inévitable est tracée (`H2_REPEAT_UNAVOIDABLE`).
- **Contrat de présentation** (pour H2.5, aucune UI ici) : `h2PresentationOf(session, archetypeId)` renvoie :
  - le rôle, la spécificité et la structure ;
  - les tours et le time cap ;
  - les composantes (station / course, dose native, charge, contexte de course, allure BLOCKED) ;
  - les transitions (nombre ; durée `null`).

  Elle est lue **sans catalogue** : la structure vient de l'identifiant de bloc, la nature de chaque item de son préfixe `s` / `r`.
- **Exposition** (`h2ExposureOf`) : le planificateur transmet les séances HYROX prévues de la semaine sans lire aucune station.

## 9. Planificateur

`hyroxPort({ …, transportNeighbours: true })` transporte, sans les interpréter :
- les voisines de la seconde passe ;
- la priorité déclarée ;
- les séances HYROX déjà générées de la semaine (portée `generated`) ;
- les empreintes prévues (anti-doublon du CORE).

Les décisions H2 sont persistées avec la séance (liste fermée de codes). Sans l'option, le comportement H1 est inchangé.

## 10. Matrice de gouvernance (tous les paramètres sont absents des rulesets réels ⇒ H2 fermé)

| Paramètre | Classe | Rôle | Statut |
|---|---|---|---|
| `hybrid_race.h2.roles` | G2 | rôles décidés | UNRESOLVED (TEST_ONLY) |
| `hybrid_race.h2.roleStructures` | G2 | structures par rôle, ordonnées | UNRESOLVED |
| `hybrid_race.h2.sessionStructure` | G2 | rôles de blocs par rôle | UNRESOLVED |
| `hybrid_race.h2.stationPool` | G1 | stations entraînables (revue) | UNRESOLVED |
| `hybrid_race.h2.stationDoses` | G1 | dose d'entraînement par station et par niveau (≠ norme de compétition) | UNRESOLVED |
| `hybrid_race.h2.runSegment` | G1 | distance d'entraînement par niveau | UNRESOLVED |
| `hybrid_race.h2.runExercise` | G2 | mouvement de course | UNRESOLVED |
| `hybrid_race.h2.structureVolume` | G2 | options tours × stations | UNRESOLVED |
| `hybrid_race.h2.workRates` | G2 | débits d'ESTIMATION | UNRESOLVED |
| `hybrid_race.h2.timeCapMargin` | G2 | marge du time cap | UNRESOLVED |
| `hybrid_race.h2.timeDomains` | G2 | domaine temporel par rôle | UNRESOLVED |
| `hybrid_race.h2.toleranceProfile` | G3 | profil de tolérance du CORE | UNRESOLVED |
| `hybrid_race.h2.eligibleLevels` | G1 | niveaux admis | UNRESOLVED |
| `hybrid_race.h2.technicalUnderFatigue` | G1 | technicité sous fatigue | UNRESOLVED |
| `hybrid_race.h2.raceSequence` | G1 | ordre OFFICIEL (source) | UNRESOLVED ⇒ simulation partielle BLOCKED |
| `hybrid_race.h2.historyPolicy` | G2 | fenêtre et réponse négative | UNRESOLVED |
| `hybrid_race.h2.neighbourPolicy` | G2 | interprétation des voisines | UNRESOLVED |
| `hybrid_race.h2.hybridPlanning` | G1 | multisport admis | UNRESOLVED |

- En PRODUCTION : `approved` et non provisoire sont exigés, sinon `NOT_PRODUCTION_READY`.
- En CANDIDATE : moteur en simulation exigé ; chaque valeur utilisée est tracée `CANDIDATE_VALUE_USED`.
- Valeurs de démonstration : `packages/hyrox/tests/h2-governance.ts` (source unique, TEST_ONLY, ordre d'épreuve **arbitraire** — alphabétique).

## 11. Problèmes découverts

1. **Le profil de demande du CORE ignore les tours de bloc** (`for_time.rounds`, `emom.minutes`) : `nativeDose` compte une fois la dose de chaque item. 5 ou 3 tours donnent le même profil (test de caractérisation). Ce problème touche aussi C3. La correction relève du CORE (décision humaine) et modifierait les profils Cross-training.
2. **Le catalogue de test clone le traîneau** pour `sled_pull` et `burpee_broad_jump` (muscles, coûts) : leurs structures dérivées sont celles du sled push. C'est une question de contenu (G5).
3. **Mémoire négative** : seule la dernière séance réalisée de la fenêtre est lue (même règle que C3). Un abandon suivi d'une séance réussie est donc oublié.
4. **Repos entre tours** : il n'est pas représentable dans `for_time`. H2 n'en prescrit aucun.
5. **Deux estimations coexistent** : celle de HYROX (débits gouvernés, sans transitions) et celle du CORE (table générique de transitions). L'exécuteur strict refuse toute modification par le CORE.
6. **HYROX reste hors Beta 0** : aucun état applicatif H2, aucune UI (H2.5).

## 12. Preuves

| Preuve | Fichier |
|---|---|
| Scénarios A–G, taxonomie, simulation partielle / complète, durée, empreinte, présentation | `packages/hyrox/tests/integration/h2-scenarios.test.ts` ; rapport `__reports__/h2-scenarios.md` |
| 40 tests adversariaux | `packages/hyrox/tests/integration/h2-adversarial.test.ts` |
| Multisport (+ Running, + Strength, + Cross-training), semaine à quatre sports, simulation de 4 semaines | `packages/planner/tests/integration/h2-multisport.test.ts` ; rapport `__reports__/h2-multisport.md` |
| Architecture (une seule source de propositions, aucun littéral, aucun import d'un autre moteur) | `packages/hyrox/tests/architecture/hyrox-architecture.test.ts` |
| Pas de station dans le Planner ni le Programme ; pas de moteur Running / Strength bis | tests 37 à 40 |
