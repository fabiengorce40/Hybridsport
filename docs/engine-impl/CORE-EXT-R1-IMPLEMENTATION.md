# CORE-EXT-R1 — implémentation (phase 6A)

> **Approbation du fondateur : `CORE_EXT_R1_FOUNDER_APPROVAL = APPROVED`.**
> - **Q1** : une répétition en distance n’est valide que si une plage d’allure existe avec une provenance explicite (dérivée d’une référence, ou plage observée de l’athlète là où c’est permis). Aucune allure n’est inventée ; sinon la répétition est exprimée en durée.
> - **Q2** : les estimations de durée sont stockées avec leur provenance. À la validation, elles sont recalculées de façon déterministe et toute incohérence est refusée. Les sessions v3 sans estimation ne sont pas reconstruites : elles sont marquées `UNAVAILABLE_LEGACY`.
> - **Q3** : une séance de course pure porte l’échauffement et le retour au calme en segments internes ; une séance multidiscipline utilise des blocs séparés ; la double représentation est invalide.
> - **Drapeaux de capacité et éligibilité à la production** : approuvés comme principe de conception.
>
> Cette approbation **n’approuve aucun** paramètre scientifique Running, aucune décision experte, aucune politique G1, ni V33 ni V34.

Référence : [`CORE-EXT-R1-RUNNING-INTERVALS-RFC.md`](CORE-EXT-R1-RUNNING-INTERVALS-RFC.md) (option B + §8), [`CORE-EXT-R1-APPROVAL-PACK.md`](CORE-EXT-R1-APPROVAL-PACK.md).

## 1. Principe

Le CORE porte la **représentation** et la **validation structurelle** ; il ne contient **aucune logique de programmation Running** : ni allure, ni seuil, ni volume, ni progression, ni règle de sortie longue, d’affûtage ou de reprise. Les cibles sont fournies par un moteur de discipline ; le CORE vérifie leur cohérence interne, dérive les durées et refuse ce qui est incohérent. Un test d’architecture le vérifie (`core-ext-r1-boundaries.test.ts`).

## 2. Fichiers

| Fichier | Rôle |
|---|---|
| `packages/domain/src/run-structure.ts` (nouveau) | Schéma `run_structure` à profondeur fixe ; cibles ; provenance d’allure ; estimation stockée ; invariants (`runStructureIssues`, `sessionStructureIssues`) ; codes d’anomalie `STRUCTURE_ISSUES` ; bornes techniques |
| `packages/domain/src/run-execution.ts` (nouveau) | Métadonnées d’exécution neutres vis-à-vis de l’UI (adresse, clé, déroulement) |
| `packages/domain/src/session.ts` | `zPrescription` += `run_structure` ; `zSessionDraft` += invariants inter-blocs (Q3) |
| `packages/domain/src/serialization.ts` | `session_record` **v4** : `durationEstimate` (AVAILABLE / UNAVAILABLE_LEGACY) |
| `packages/engine/src/duration/run-structure.ts` (nouveau) | Dérivation déterministe de la durée ; comparaison stockée / recalculée |
| `packages/engine/src/duration/recorded.ts` (nouveau) | Estimation de séance stockée : écriture, vérification ; écarts des `run_structure` |
| `packages/engine/src/duration/estimate.ts` | Le DurationEngine intègre `run_structure` via la dérivation unique |
| `packages/engine/src/duration/levers.ts` | `reduce_run_volume` sur `run_structure` |
| `packages/engine/src/migration/migrations.ts` | Migration v3 → v4 ; contrôles après lecture |
| `packages/engine/src/trace/core-codes.ts`, `schema-issue.ts` | Codes de raison explicites ; traduction des anomalies de schéma |
| `packages/engine/src/validation/validator.ts`, `checks.ts` | Codes explicites à la validation ; contrôle stockée / recalculée |

Contrat SportEngine : **inchangé** (la proposition transporte déjà une séance non typée, validée par le CORE ; un test de frontière le démontre).

## 3. Modèle à profondeur fixe

```
run_structure
├─ segments[]  (liste PLATE, 1 à 64)
│   ├─ warmup | steady | cooldown : { id, dose, target }
│   ├─ preparation               : { id, reps?, dose, target, recovery? }
│   └─ repeat                    : { id, sets, reps, work, target, recovery, betweenSetRecovery? }
└─ estimate : { method: 'core.run_structure.pace_bounds', methodVersion: 1, unit: 's', workS{min,max}, totalS{min,max} }

dose     = { durationS } XOR { distanceM }
recovery = { dose, mode: standing | walk | jog, pace? }
target   = { domain, pace?: { secPerKm{min,max}, provenance?{source, sourceId} },
             effort?: { rpe{min,max} } | { descriptorKey }, hrBpm?{min,max},
             priority: pace | effort | hr, noWearable? }
```

- **Aucune récursion** : un segment ne contient jamais de segment (forme stricte : un champ `segments` dans un segment est refusé ; un genre inconnu est refusé).
- **Deux niveaux fixes** dans `repeat` : séries × répétitions. Plusieurs blocs de travail = plusieurs segments successifs.
- **Identités** : chaque segment a un `id` (unique dans la structure).
- **Bornes techniques anti-explosion** (contrat de format, pas des valeurs de prescription) : 64 segments, 64 séries, 256 répétitions, 4 096 étapes d’exécution.
- **Descripteur d’effort** : une clé (`descriptorKey`) ; le texte localisé vit hors du CORE.
- **Domaine** : étiquette de représentation ; sa signification appartient au moteur de discipline.

## 4. Cibles (DURATION, DISTANCE, PACE_RANGE, RPE_RANGE, HR_RANGE, DOMAIN, NO_WEARABLE)

| Règle | Code |
|---|---|
| `domain` obligatoire | forme |
| Au moins effort ou allure | `TARGET_WITHOUT_EFFORT_OR_PACE` |
| La priorité désigne une cible présente | `TARGET_PRIORITY_ABSENT` |
| Toute plage : bornes > 0 | `RANGE_NOT_POSITIVE` |
| Plage inversée | `PACE_RANGE_INVERTED`, `RPE_RANGE_INVERTED`, `HR_RANGE_INVERTED` |
| Allure sans provenance | `PACE_WITHOUT_PROVENANCE` |
| NO_WEARABLE avec allure ou FC | `TARGET_COMBINATION_INVALID` |
| `repeat` en `sprint_neuromuscular` piloté à l’allure (règle 6 de la RFC) | `TARGET_COMBINATION_INVALID` |
| Allure sur une récupération dosée en durée | `TARGET_COMBINATION_INVALID` |

La FC n’est jamais requise. Une cible RPE seule est valide (athlète sans montre).

## 5. Invariant distance + allure (Q1)

Toute dose en distance (travail, segment continu, échauffement, retour au calme, préparation, récupération) exige une plage d’allure ; sinon `DISTANCE_WITHOUT_PACE`. La plage exige une provenance (`reference_derived` ou `observed_athlete_range`, avec `sourceId`) ; sinon `PACE_WITHOUT_PROVENANCE`. Le CORE ne choisit jamais d’allure et ne « tolère » pas une provenance manquante.

## 6. Dérivation de la durée (DurationEngine, unique autorité)

- dose en durée `d` : `[d, d]` ;
- dose en distance `D` avec l’allure `[rapide, lente]` (s/km) : `[D × rapide / 1000, D × lente / 1000]` : **la durée min vient de l’allure la plus rapide, la max de la plus lente** ;
- `preparation` : `reps × dose + (reps − 1) × récupération` ;
- `repeat` : `sets × reps × travail + sets × (reps − 1) × récupération + (sets − 1) × récupération entre séries` (aucune récupération après la dernière répétition d’une série) ;
- `workS` = doses de travail (`steady`, `preparation`, `repeat`) ; `totalS` = tout ;
- unité explicite (secondes), **aucun arrondi** ;
- dans l’estimation de séance, la plage `[min, max]` d’une `run_structure` devient `min / milieu / max` ; les récupérations ne reçoivent pas de facteur de dépassement (comme `intervals`), et les parties effort / récupération alimentent les composantes `workS` / `restS`.

Il n’existe aucune autre fonction de durée : `deriveRunEstimate`, `estimateDuration`, `checkRunEstimate` et `verifyRecordedDuration` passent toutes par `segmentDuration`.

## 7. Estimations stockées (Q2)

- **Prescription** : `estimate` est **obligatoire** dans une `run_structure`, avec sa provenance de méthode (`method`, `methodVersion`, `unit`). À la validation (contrôle `core.integrity.structure`) et à la **lecture** d’un `session_record`, elle est recalculée ; **égalité stricte**, sinon `DURATION.ESTIMATE_MISMATCH` (champ, valeurs stockées et recalculées). Aucune tolérance, aucune réparation.
- **Record** : `durationEstimate` (`AVAILABLE` : `p10`, `p50`, `p90`, méthode `core.duration_engine`) ; la provenance du record fixe les versions (moteur, ruleset, catalogue). `verifyRecordedDuration` recalcule avec les mêmes versions ; versions différentes ⇒ `DURATION.ESTIMATE_UNVERIFIABLE` ; écart ⇒ `DURATION.ESTIMATE_MISMATCH` ; `UNAVAILABLE_LEGACY` ⇒ `DURATION.ESTIMATE_UNAVAILABLE_LEGACY` (information, jamais reconstruit).
- Aide aux moteurs : `withDerivedEstimate` et `toRecordedDurationEstimate`.

## 8. Échauffement et retour au calme (Q3)

| Règle | Code |
|---|---|
| `run_structure` seulement dans un bloc `running` au format `continuous` | `PLACEMENT_INVALID` |
| Dans une structure : au plus un échauffement, en tête | `WARMUP_DUPLICATED`, `WARMUP_NOT_FIRST` |
| Dans une structure : au plus un retour au calme, en fin | `COOLDOWN_DUPLICATED`, `COOLDOWN_NOT_LAST` |
| Segments internes seulement si la séance est de course pure (tous les blocs `running`, uniquement des `run_structure`) ; sinon (bloc `warmup` / `cooldown` séparé, bloc de force…) | `WARMUP_COOLDOWN_DOUBLE_REPRESENTATION` |
| Plusieurs `run_structure` : échauffement dans la première, retour au calme dans la dernière | `WARMUP_DUPLICATED` / `WARMUP_NOT_FIRST`, `COOLDOWN_DUPLICATED` / `COOLDOWN_NOT_LAST` |

## 9. Récupérations et comptages

| Règle | Code |
|---|---|
| `betweenSetRecovery` obligatoire si `sets > 1` | `RECOVERY_BETWEEN_SETS_REQUIRED` |
| `betweenSetRecovery` interdite si `sets = 1` | `RECOVERY_BETWEEN_SETS_FORBIDDEN` |
| Récupération de préparation sans répétition | `RECOVERY_WITHOUT_REPETITION` |
| `sets`, `reps` : entiers dans [1, borne] | `SETS_INVALID`, `REPS_INVALID` |
| Durée ou distance ≤ 0 | `DURATION_NOT_POSITIVE`, `DISTANCE_NOT_POSITIVE` |
| Structure vide, trop de segments, trop d’étapes | `SEGMENTS_EMPTY`, `SEGMENTS_TOO_MANY`, `EXECUTION_STEPS_TOO_MANY` |
| Identifiant de segment dupliqué | `SEGMENT_ID_DUPLICATED` |

Chaque code est enregistré sous `TECHNICAL.STRUCTURE.<CODE>` (paramètre `path`). La forme stricte (zod) refuse les champs inconnus, les valeurs non finies et une dose à deux grandeurs ; les invariants sémantiques voyagent dans l’anomalie zod (`params.structureIssue`) et le CORE les traduit en codes explicites, au validateur comme à la lecture. La contrainte HARD de durée (p90 ≤ temps disponible) reste celle du CORE (`FEASIBILITY.TIME_EXCEEDED`).

## 10. Levier `reduce_run_volume`

Sur une `run_structure` : réduit d’abord l’**échauffement**, puis le **retour au calme**, d’un pas lu dans le ruleset (`duration.leverSteps` : `reduceRunS` / `reduceRunM`), sans descendre sous le plancher déclaré par le levier (`minS` / `minM`), puis un segment **continu** (`steady`). Il ne touche **jamais** une cible, ni les séries × répétitions d’un `repeat` : réduire un bloc de travail structuré est une décision de programmation, laissée au moteur de discipline (nouvelle proposition). L’estimation est re-dérivée par le DurationEngine. *Écart assumé avec la RFC (« puis les répétitions ») : documenté ici, conforme à « CORE sans logique de programmation ».*

## 11. Métadonnées d’exécution (neutres vis-à-vis de l’UI)

`executionSteps` déroule la structure dans l’ordre de la dérivation : chaque étape porte `key = segmentId/série/répétition/phase`, une adresse `{segmentIndex, set, rep, phase}` (`single`, `work`, `recovery`, `between_sets`), la dose, la cible (effort) ou le mode (récupération). `resolveExecutionAddress` résout une adresse de reprise et renvoie `undefined` si elle ne désigne aucune étape (jamais une étape voisine). Ces identités servent aux cases, au minuteur, à la reprise, à l’historique, aux retours et à l’analytique, sans aucun concept d’interface.

## 12. Rejeu et déterminisme

Toutes les fonctions sont pures ; la validation, la dérivation, le déroulement et le flux SportEngine complet sont rejoués à l’identique (tests de rejeu). L’aller-retour JSON préserve l’égalité canonique.

## 13. Strength

Aucun fichier de `packages/strength/src` n’est modifié. `intervals`, `distance` et `timed` sont inchangés. Seule l’empreinte F20 (`core-source-digest.txt`) est mise à jour, de façon motivée (voir le rapport de tests).
