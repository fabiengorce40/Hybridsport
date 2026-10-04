# HYROX H1 : modèle, revue CORE et première tranche générative

Baseline `06c0230` (Cross-training C2). Paquet `@hybridsport/hyrox` (discipline `hybrid_race`).

## 1. Inventaire et classement des valeurs

Classes : **A** = sourcée et approuvée dans KAIRO ; **B** = source officielle identifiée, non importée ni approuvée ; **C** = hypothèse (spec, fixture) ; **D** = absente.

| Élément | Classe | Statut dans H1 |
|---|---|---|
| Format d'épreuve (8 × [course + station], ordre des 8 stations) | B | Règlement officiel HYROX. Non codé |
| Distances, répétitions et charges officielles par division | B | Règlement officiel. Ce sont des **règles de compétition, pas des doses d'entraînement**. Non codé |
| Stations du catalogue (`Exercise.hybridRaceStation`, G5) | C | Catalogue de test : 6 stations. Sled pull et BBJ absents, clonés en TEST_ONLY dans les tests |
| Débits de station du catalogue (`workRate`) | C | Fixtures. Lus seulement par l'estimation de durée du CORE, jamais par HYROX |
| Spec 06 §4 (familles de séances, `fullSimPolicy`, substitutions) | C | Non approuvé. Non utilisé |
| Doses, charges, allures, ratios course/station, progression d'entraînement | D | Paramètres gouvernés **vides**. Refus en production |
| Poids et seuils anti-doublon `hybrid_race` | D | Non gouvernés. Valeurs de test seulement |

## 2. Modèle du domaine retenu

Chaque dimension est séparée et a un seul porteur.

| Dimension | Porteur |
|---|---|
| Mouvement | Exercice du catalogue rattaché à une station (`hybridRaceStation`) |
| Distance, répétitions, calories, durée | Une seule mesure par dose : `StationDose.dose` (`distance_m`, `reps`, `calories`, `duration_s`), puis types de prescription du CORE existants |
| Charge | `StationDose.loadKg`, puis `prescription.load` générique du CORE. Obligatoire si le mouvement est chargé, interdite sinon |
| Équipement | Catalogue et profil (contrôle CORE) |
| Transitions, enchaînement, segments de course | **Hors H1.** Ils exigent des allures (moteur Course) et un planificateur global |
| Résultat | Hors H1. Aucun contrat de résultat HYROX |

## 3. Revue CORE

**Déjà représentable sans changement :**
- discipline `hybrid_race` ;
- bloc `hybrid_station_work` et bloc `running` ;
- doses distance, répétitions, calories et durée ;
- matériel, restrictions, douleur et exclusions ;
- gouvernance des paramètres (statut, approbations par rôle, version tracée) ;
- empreinte `not_applicable` ;
- anti-doublon (poids par discipline).

**Non représentable :** une **charge** sur une dose hors séries, par exemple un sled de 50 m chargé, des wall balls avec une balle de N kg ou un carry chargé. Seule la prescription `sets` portait une charge.

**Extension générique minimale** (option 1 de `CORE-EXT-C1-COMPATIBILITY.md`) :

| Fichier | Changement |
|---|---|
| `domain/src/session.ts` | `zItemLoad { kg > 0, certainty: prescribed \| suggested }`, facultatif sur `timed`, `distance`, `calories` et `reps`. Interdit sur `hold`, `mobility` et intervalles |
| `domain/src/serialization.ts` | `session_record` v6 (courante), même enveloppe que la v5 |
| `engine/src/migration/migrations.ts` | v5 → v6 identité. Une donnée v5 portant `load` hors séries est refusée (combinaison malformée) |

- Le CORE **transporte** la charge sans l'interpréter : ni durée, ni validation, ni empreinte (testé).
- Aucun mot ou concept HYROX dans le code du CORE (garde d'architecture).
- Forme historique (sans charge) inchangée.
- Non-régression avant/après sur un parcours applicatif réel (Strength seul, Running seul) : instantané identique octet par octet, avec 30 séances, empreintes, journaux et rapports anti-doublon.
- Digest F20 mis à jour (3 fichiers). Liste fermée Cross-training étendue à `session.ts` et `item-load.test.ts`.

## 4. Responsabilités

| Acteur | Responsabilité |
|---|---|
| **Moteur HYROX** | Station demandée → dose et charge gouvernées → une proposition. Refus explicite sinon. Aucune dépendance vers Running, Strength ou Cross-training |
| **CORE** | Sécurité, faisabilité, durée, validation, empreinte, anti-doublon, sérialisation |
| **Global Planner** (futur) | Choix de la station, enchaînement course + station, simulation, répartition hebdomadaire multisport, appel aux allures du moteur Course. Un athlète `hybrid: true` est refusé (`HYBRID_PLANNER_UNAVAILABLE`) |

## 5. Tranche H1

- Archétype `hybrid_race.h1_station` : **une** station, **un** mouvement, **une** dose, bloc `continuous`, aucun levier.
- Paramètres gouvernés :
  - `hybrid_race.h1.stationDoses` (G1) ;
  - `hybrid_race.h1.eligibleLevels` (G1) ;
  - `hybrid_race.h1.toleranceProfile` (G3).
- Règles de résolution des paramètres :
  - paramètre absent, gouvernance erronée ou valeur illisible : refus ;
  - en PRODUCTION, `approved` et non provisoire sont exigés ;
  - en CANDIDATE, la simulation est exigée et `CANDIDATE_VALUE_USED` est tracé.
- Ordre des refus :
  1. archétype ;
  2. multisport ;
  3. simulation ;
  4. reprise (seul `NONE` est admis) ;
  5. paramètres ;
  6. niveau ;
  7. dose de la station (absente ou ambiguë) ;
  8. éligibilité du mouvement (inconnu, inactif, autre station, matériel, restriction, douleur, exclusion) ;
  9. cohérence de charge.
- **Aucune substitution.** `runHyroxH1` refuse toute séance modifiée par le CORE (`H1_MODIFIED_BY_CORE`).
- Constat testé : sans cette garde, la réparation du CORE publierait des fentes sandbag **portant la charge du traîneau**.

## 6. Limites documentées

- **Anti-doublon** : diagnostic seulement, avec une seule proposition. Aucun poids ni seuil `hybrid_race` gouverné. Sans eux, un historique comparable rend l'analyse techniquement impossible (fail-closed du CORE). `stimulus`/`energy` valent `not_applicable`. `structure` est constante (`hybrid_station_work`/`continuous`).
- **Durée** : estimée par le CORE à partir des débits du catalogue, **indépendamment de la charge**.
- **Réparation CORE** : elle conserve la prescription, charge comprise, sur un substitut. Ce risque existait déjà pour `sets`. Pour H1, il est neutralisé par la garde stricte. Une correction CORE générique, par exemple ne pas reporter `load` sur un substitut, reste à décider.
