# CORE — audit de la répétition structurelle dans le profil de demande

Base : `1d8370b` (H2). Correctif transversal avant H2.5. Aucun seuil, aucun facteur de conversion, aucune valeur scientifique nouvelle. Aucune logique propre à un sport.

## 1. Ce que représente un niveau de demande

Pour chaque structure, le score est :

score(structure) = Σ_items contribution_catalogue(exercice, structure) × doseUnits × multiplicateur(bande d'intensité)

où doseUnits = dose native × `perUnit` de `demand.doseNormalization`. Le niveau `none / low / moderate / high` est ce score passé aux seuils `demand.levelThresholds`.

Un niveau est donc un **mélange volume × intensité** (réponse D) : c'est une quantité **cumulée** sur la séance (somme des items), pondérée par la bande d'intensité et par l'exposition de la structure (catalogue). Ce n'est ni une intensité pure, ni une simple exposition. Conséquence : une dose réellement répétée doit être comptée autant de fois qu'elle est répétée.

## 2. Matrice des formats

| Format | Dose portée par un item | Champ de répétition | Comportement CORE avant | Sémantique attendue (contrat) | Bug | Correctif |
|---|---|---|---|---|---|---|
| `sets` | dose complète (séries listées ; circuit = séries par item) | aucun au niveau du bloc | séries comptées | identique | non | aucun (facteur 1) |
| `continuous` | dose complète (`timed.workS × rounds`, distance, `intervals.reps × work`) | dans la prescription | compté par `nativeDose` | identique | non | aucun (facteur 1) |
| intervalles (prescription `intervals` / `timed`) | dose par intervalle × répétitions de l'item | `reps` / `rounds` de l'item | compté par `nativeDose` | identique | non | aucun |
| `for_time` | dose d'**un tour** | `rounds` (bloc) | un seul tour compté | `rounds` tours. Le DurationEngine du CORE l'applique déjà (`travail d'un tour × rounds`). | **oui** | dose × `rounds` |
| `amrap` | dose d'un tour | aucun : tours **inconnus** | un tour compté | non définissable sans inventer un nombre de tours | — | un passage, **signalé** (`AMRAP_ROUNDS_UNKNOWN`) |
| `emom` | dose « par minute » ? | `minutes` | un passage compté | **ambigu** : tous les items chaque minute (convention C3) ou en rotation ? Ni le schéma ni le CORE ne le disent. | indéterminé | un passage, **signalé** (`EMOM_ITEM_ROTATION_UNSPECIFIED`) — BLOCKED |

## 3. Correctif retenu (`engine/src/catalog/session-demand.ts`)

dose effective = dose native de l'item × répétition structurelle du bloc (`blockRepetition`)
→ normalisation existante (`perUnit`) → agrégation existante (`deriveDemandProfile`) → seuils existants

- **Facteur** : `for_time` = `rounds` ; `sets` / `continuous` = 1 ; `amrap` / `emom` = 1, non résolu.
- **Raison** `DATA.DEMAND_REPETITION_UNRESOLVED { sessionId, blockId, format, cause }` dans `profile.reasons`.
- **Pas de double multiplication** : la répétition de l'item (`timed.rounds`, `intervals.reps`, séries) reste dans `nativeDose`, et le facteur de bloc s'applique une fois. C'est la même structure que l'estimation de durée.
- **Générique** : le facteur ne dépend que du format CORE, jamais de la discipline. Un test vérifie que le même bloc sous deux disciplines donne le même profil.
- **Niveaux** : jamais multipliés. Seule la dose l'est, avant la normalisation. La saturation vient des seuils existants.
- **Unités** : une unité non normalisée reste fail-closed.

## 4. Avant / après

| Sport | Formats | Profil de demande | Prescriptions | Rapports |
|---|---|---|---|---|
| Cross-training (C3 / C3.5) | `amrap`, `emom`, `continuous` | inchangés (+ raison signalée pour `amrap` / `emom`) | inchangées | identiques |
| Cross-training | `for_time` (ex. 5 tours : rameur 250 m + fentes 15 + pompes 10) | scores × 5 : `lower_knee` moderate→high, `lower_hip` / `upper_push` / `upper_pull` low→high, systémique moderate→high, grip low→moderate | inchangées | — |
| HYROX H2 | `for_time` | changent quand `rounds` > 1 (`station_repeats` 5 tours : `lower_knee` low→high ; `strength_endurance` 4 tours : tout → high ; `compromised_running` 2 tours : `axial`, `upper_pull`, `grip` montent) ; `rounds` = 1 (simulation partielle, course compromise 30 min) inchangés | inchangées | lignes de profil des rapports H2 seulement |
| Strength (`sets`) | `sets` | inchangés (verrou F1 / F2 vert) | inchangées | — |
| Running (`continuous`, `run_structure`) | `continuous` | inchangés | inchangées | — |

Cross-training en détail : C3 / C3.5 ne lit aucun profil de demande pour composer. Le profil sert au planificateur (interférence, voisines). Aucune décision des suites planificateur et Beta 0 ne change (tests et rapports identiques, E2E identique). Une séance `for_time` CT pourra désormais légitimement compter comme `high` pour l'interférence.

## 5. Persistance et version

- Le profil est **dérivé** à chaque planification à partir de la séance.
- Les semaines persistées conservent `demand.levels` calculés à l'époque. Ce champ sert à l'audit et n'est jamais relu pour décider : le contexte récent est redérivé depuis la séance (`recentOf` → `session`). Il n'y a donc **aucune migration** et aucune semaine réécrite.
- Les niveaux persistés des anciennes semaines contenant un `for_time` à plusieurs tours sont sémantiquement anciens (sous-estimés). Ils ne sont jamais réinterprétés.
- `BETA0_PLANNING_VERSION` et la sérialisation sont inchangées. L'empreinte des sources du CORE (verrou F20 de Strength) est mise à jour volontairement : seuls `session-demand.ts` et `core-codes.ts` changent.

## 6. Non résolu (décisions humaines)

1. **Sémantique EMOM** à fixer dans le contrat du CORE (par exemple `emom.itemsPerMinute: 'all' | 'rotate'`), puis appliquer `minutes` ou `minutes / n`.
2. **Demande AMRAP** : estimation par débits gouvernés (comme C3 / H2), ou seulement « un passage » ? Il faut une gouvernance avant tout calcul.
3. Le planificateur ne transmet pas `profile.reasons` (`DemandOutcome` ne contient que les niveaux). Faut-il exposer « base d'un passage » à l'interférence ?

## 7. Preuves

- Golden et tests adversariaux génériques : `packages/engine/tests/unit/session-demand-repetition.test.ts`.
- HYROX (5 tours contre 3, scores proportionnels) : `packages/hyrox/tests/integration/h2-scenarios.test.ts`.
