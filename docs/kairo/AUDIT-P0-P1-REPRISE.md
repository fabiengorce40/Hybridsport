# Reprise technique — audit P0 / P1 / P2

Branche : `claude/kairo-p0-safety-audit` (depuis `claude/crosstraining-c1-c2-spike-vbg8dv` @ `3edc882`). Aucune prescription générée n'a changé (aucun rapport de prescription régénéré, suites existantes inchangées).

## Anomalies

| # | Fichier / fonction | Observé | Cause racine | Conséquence utilisateur | Gravité | Traitement |
|---|---|---|---|---|---|---|
| A1 | `app-core/src/beta0-app.ts` `startProgrammeSession` | « Faire maintenant » démarrait une séance composée mais non placée n'importe quel jour | Aucun contrôle au jour réel : seuls `SESSION_FINISHED` et `QUALITY_BLOCKED` étaient vérifiés ; la règle d'interférence G4 n'existait que dans le placement (`planner.ts`, closure `conflictsOf`) | Course non placée réalisable le jour d'une Musculation sollicitant les mêmes structures (genou, hanche, système) : contournement de la règle qui l'avait laissée non placée | **P0** | **Corrigé** : règle extraite à l'identique (`structureConflicts`), réutilisée par `manualPlacementConflicts` ; `manualStartAssessment` (qualité, douleur, semaine, interférence) appliqué par `startProgrammeSession` ; refus explicites `MANUAL_START_INTERFERENCE`, `MANUAL_START_OUTSIDE_WEEK`, `SAFETY_PAUSE_ACTIVE_PAIN` |
| A2 | même chemin | Douleur active ignorée au démarrage manuel | idem | Séance supplémentaire démarrable pendant la pause douleur | **P0** | **Corrigé** (A1) |
| A3 | même chemin | Séance non placée d'une semaine passée démarrable par appel direct | aucune vérification de semaine | Réalisation datée hors de sa semaine | P1 | **Corrigé** (`OUTSIDE_WEEK`) |
| A4 | `apps/kairo/.../common.tsx` `metaOf` | Carte d'un bloc Cross-training : « ≈ 11 min » pour un AMRAP de 10:00 | l'estimation p50 du CORE était affichée à la place de la durée PRESCRITE du format | Durée du bloc inexacte | P1 | **Corrigé** : `CompositionScope.blockDurationS` (durée prescrite), `availableTimeS`, `targetDurationS` distincts |
| A5 | `hyrox/src/h2/compose.ts` (sélection des stations) | Deux séances `partial_simulation` IDENTIQUES dans la même semaine | Les 8 stations de test sont toutes « récentes » dans la fenêtre ⇒ `fresh_stations_in_segment:0/4`, départage au segment 0 ; le moteur trace `H2_REPEAT_UNAVOIDABLE` | Répétition non signalée dans l'interface | P1 | **Rendu visible** (`repeatFlagged`, carte, journal, export). La sélection n'est PAS modifiée : règle de diversité non gouvernée (H3) |
| A6 | `apps/kairo/.../common.tsx` (cartes Strength) | « Full body » affiché pour toutes les séances | le titre de l'archétype seul masque l'alternance A/B/A réelle | Impression de répétition excessive | P2 | **Corrigé** : exercices principaux prescrits sur la carte (`mainExercises`) |
| A7 | Strength S4 (continuité) | Semaine N+1 = mêmes exercices que la semaine N | règle de continuité (exercices stables pour suivre la progression) | Répétition d'une semaine à l'autre | — | **Conforme** (documenté, non modifié) |
| A8 | C3 / H2 (`compose.ts`) | Bloc principal seul | structure déclarée (échauffement / retour au calme) sans contenu gouverné, tracée `*_BLOCK_NOT_GENERATED` | — | — | Déjà traité au lot précédent (`TRAINING_BLOCK`, `FULL_SESSION_COMPOSITION_UNRESOLVED`) ; complété par les trois durées (A4) |

## Chemin « Faire maintenant » après correction

Planning → carte « Non planifiée » → `manualStartAssessment` (lecture) → bouton présent seulement si autorisé, sinon raison lisible → `startProgrammeSession` (refus métier identique, même par appel direct ou fin directe) → exécution (reprise jamais réévaluée) → `recordSessionExecution` (`EXECUTION_DUPLICATE`) → historique / Journal Beta (`manual_from_unplaced`, jour réel).

Voisines prises en compte : séances prévues de la semaine (sauf manquées), réalisations manuelles de la semaine, séances connues de la semaine précédente (`recentOf`, sauf manquées). Même discipline : non réévaluée ici (proximité intra-sport = responsabilité du moteur, qui a composé la séance en connaissant les séances prévues de la semaine) — **risque résiduel documenté**. Aucune règle « une séance par jour » n'est ajoutée à l'exécution manuelle (ce serait une nouvelle règle produit).

## Cross-training C3 — cinq formats

Tous produisent UN bloc `conditioning` (`blocks: [block]`) ; échauffement non généré (tracé). Durée du bloc : EMOM = minutes × 60 ; AMRAP = time cap ; for time = time cap (estimation lente × (1 + marge)) ; intervalles = tours × travail + (tours − 1) × récupération ; continu = travail. Temps disponible : plafond (`EXCEEDS_AVAILABLE_TIME`), jamais une cible. Toutes les doses : `ct.dose.construction` TEST_ONLY.

## HYROX H2 — cinq rôles

| Rôle | Structure | Stations / tours observés (3 semaines) | Diversité |
|---|---|---|---|
| station_capacity | `station_repeats` ×5, 1 station | burpee broad jump → farmers → rameur → … | rotation par récence ; 1 station par séance par construction |
| strength_endurance | `station_circuit` 4×2 ou `station_repeats` ×5 | farmers + fentes, sled pull, sled push… | rotation correcte |
| mixed_station_conditioning | `station_circuit` 4×2 | 3 compositions en cycle | cycle de 3 |
| compromised_running | `run_station_alternation` 2–3 tours | station + course (sans allure : `RUNNING_ENGINE_DELEGATION`) | cycle de 3 |
| partial_simulation | `partial_sequence` 4 stations | 2 segments de la séquence de course | **répétition dans la semaine (A5)** |

Charges, distances, tours, time caps : `hybrid_race.h2.*` TEST_ONLY (draft, provisoires). Transitions : comptées, durée « unknown », exclues de l'estimation, jamais chronométrées. Équilibré = alternance des rôles par le programme (jamais présenté comme scientifiquement équilibré).

## Contrat d'évolution C4 / H3 (préparé, NON réalisé)

`CompositionScope` (app-core) est l'interface : `scope` (`TRAINING_BLOCK` | `FULL_SESSION`), `notGenerated`, `status` (`FULL_SESSION_COMPOSITION_UNRESOLVED`), `blockDurationS`, `availableTimeS`, `targetDurationS`. Une séance complète ne sera déclarée que si le moteur trace une structure SANS bloc manquant. Prérequis de gouvernance :
- C4 : contenu d'échauffement / retour au calme par stimulus et niveau ; délégation éventuelle au moteur Strength (`STRENGTH_ENGINE_DELEGATION_UNAVAILABLE` aujourd'hui) ; règle d'assemblage multi-blocs ; plages de dose approuvées (Q1).
- H3 : contenu d'échauffement / retour au calme ; durée des transitions ; règle de diversité au-delà de la récence (A5) ; allures de course déléguées au moteur Running.
