# C4 — Séance Cross-training complète : audit, spécification, gouvernance

Base : `claude/crosstraining-c1-c2-spike-vbg8dv` @ `f9f7e2e`. Suite C4.1 (audit des durées, décisions à valider, variante courte, durée estimée, réduction d'état) : [`C4.1-CROSSTRAINING-DECISIONS.md`](./C4.1-CROSSTRAINING-DECISIONS.md). Statut : **prototype EXPÉRIMENTAL** (Beta 0, SIMULATION_ONLY). Aucune valeur de C4 n'est approuvée scientifiquement ; en PRODUCTION chaque paramètre C4 est NON RÉSOLU et le moteur retombe sur le bloc principal C3 (fail-closed).

## 1. Audit C3 (état réel)

| Élément | Réutilisable | Constat |
|---|---|---|
| `c3/compose.ts` (intention → structure → format → rôles → sélection → dose → validation) | **oui, intégralement** | produit UN bloc `conditioning` (5 formats : continuous, intervals, EMOM, AMRAP, for_time) ; échauffement tracé `C3_BLOCK_NOT_GENERATED` ; bloc force / compétence ⇒ refus (`STRENGTH_ENGINE_DELEGATION_UNAVAILABLE`, `SKILL_ACQUISITION_UNMODELLED`) |
| Réservoir `ct.composition.movementPool` (11 mouvements TEST_ONLY), rôles, débits `ct.estimation.workRates` | oui | 2 mouvements monostructuraux (rameur, SkiErg) ; aucun mouvement cyclique au poids du corps |
| Éligibilité `movementIssues` (matériel, douleur, restrictions, exclusions, charge non représentable) | oui | même filtre que C3, aucune substitution implicite |
| Catalogue partagé (fixture TEST_ONLY du CORE) | partiel | **un seul** exercice de mobilité (`ex.hip_mobility_flow`, hanche) |
| CORE : estimation de durée, `readToleranceProfile`, validation | **oui** | le CORE reste l'autorité : il estime la séance multi-blocs (transitions comprises) et la refuse si elle dépasse le temps disponible ; C4 lit seulement la marge du profil de tolérance (l'estimation de durée est interdite aux moteurs par l'architecture CT) |
| CORE / planificateur : demande et structures | **oui** | blocs `warmup` / `cooldown` EXCLUS de la charge et de l'interférence (règle existante) : un échauffement ne change pas l'arbitrage M3 |
| Exécution app-core (`ctWorkoutOf`, résultat C3 `record.ts`) | oui | lisent le seul bloc `conditioning` : le résultat du WOD reste inchangé |
| Strength (blocs force) | **non** | aucune délégation inter-moteurs gouvernée ; un bloc force dans une séance CT exige un contrat Planner ↔ Strength (non construit) |

## 2. Spécification C4

Pipeline : `C3 (WOD) → C4 (blocs complémentaires) → CORE (estimation, validation)`.

| Rang | Bloc | Kind CORE | Contenu (C4 v1) | Statut |
|---|---|---|---|---|
| 1 | Échauffement général | `warmup` (continuous) | 1 mouvement monostructural éligible, durée `ct.c4.warmup.generalS` | **généré** (expérimental) |
| 2 | Échauffement spécifique | `warmup` (sets / circuit) | mouvements à répétitions du WOD, `specificRounds` tours à `specificFraction` des répétitions, sans charge | **généré** (expérimental) |
| 3 | Technique / force | `skill` / `strength` | — | **non généré** : délégation Strength / modèle de compétence absents (tracé) |
| 4 | WOD | `conditioning` | C3 inchangé (5 formats) | inchangé |
| 5 | Complémentaire | `accessory` | — | **non généré** : aucune règle (tracé) |
| 6 | Retour au calme | `cooldown` (continuous) | même mouvement monostructural à allure facile `easyS` + mobilité `mobilityS` | **généré** (expérimental) ; couverture de mobilité partielle tracée |

Chaque bloc porte un objectif (identifiant de bloc + trace), une durée ou une dose, des exercices filtrés par matériel / douleur / restrictions, une provenance (`C4_BLOCK` : paramètre, règle de sélection, critères). Coordination : l'échauffement spécifique réutilise les mouvements du WOD à dose réduite (préparation, pas une seconde sollicitation) ; aucun mouvement chargé hors WOD.

### Statut explicite (`PLAN.CROSSTRAINING.C4_SESSION_STATUS`)

| Statut | Quand | Ce que voit l'utilisateur |
|---|---|---|
| `FULL_SESSION` | tous les blocs REQUIS du plan sont générés, la durée planifiée tient dans le temps disponible ET le CORE valide la séance complète | « Séance complète expérimentale », blocs détaillés |
| `MAIN_BLOCK_ONLY` | plan non décidé pour le stimulus, aucun mouvement éligible (`NO_ELIGIBLE_MONOSTRUCTURAL_MOVEMENT`), séance hors temps (`SESSION_EXCEEDS_AVAILABLE_TIME`), CORE qui refuse la séance complète (`CORE_REFUSED_FULL_SESSION`, repli), blocs persistés incohérents (`PERSISTED_BLOCKS_MISMATCH`, lecture app-core) | « Bloc principal uniquement » (comportement P0) |
| `COMPOSITION_UNRESOLVED` | le plan EXIGE un bloc que C4 ne sait pas composer (force, compétence, complémentaire) | « Bloc principal uniquement » + cause |
| `BLOCKED` | C3 refuse (pas de bloc principal) ; statut C4 tracé sans séance lisible | séance non proposée (refus existant, aucune séance d'échauffement seule) |

Capacité : `ctFullSessionComposition` (décision CT-D21, paramètres `ct.c4.*`). Non demandée ou inactive (gouvernance réelle : NON RÉSOLU, production comme candidat) ⇒ proposition C3 STRICTEMENT inchangée, aucune trace C4.

La plage produit 45–75 min (`ct.c4.sessionDurationTarget`) est une **cible**, jamais une obligation : la séance n'est jamais allongée pour l'atteindre ; l'écart est tracé (`belowTarget` / `aboveTarget`).

### Durée et temps disponible

1. Durée PLANIFIÉE (valeurs gouvernées seulement) = blocs C4 (durées `generalS`, `easyS`, `mobilityS` ; échauffement spécifique au débit LENT gouverné `ct.estimation.workRates`) + durée du bloc principal C3.
2. Variante longue (bornes hautes) si planifiée ≤ disponible − marge du profil de tolérance ; sinon variante courte (bornes basses) ; sinon `MAIN_BLOCK_ONLY` (`SESSION_EXCEEDS_AVAILABLE_TIME`).
3. Le CORE estime et valide la séance complète ; s'il refuse la variante longue, le port relance la variante COURTE (C4.1, `C4_VARIANT_RETRY`) ; s'il la refuse aussi, la même demande SANS la capacité C4 (bloc principal C3, inchangé), tracée `MAIN_BLOCK_ONLY` / `CORE_REFUSED_FULL_SESSION`.
4. Le temps disponible reste un PLAFOND, jamais une cible ; la cible produit 45–75 min n'allonge jamais la séance.

### Application (app-core → UI)

- `CompositionScope.c4` (statut, cause, blocs, durée planifiée, position par rapport à la cible) lu dans la trace PERSISTÉE ; « séance complète » seulement si chaque bloc déclaré généré est présent dans la séance persistée (sinon `PERSISTED_BLOCKS_MISMATCH`).
- Exécution : si un échauffement précède le bloc principal, le chrono du bloc principal ne démarre PAS à « Commencer » (« PRÊT ») ; démarrage explicite « Démarrer le bloc principal ». Le résultat enregistré reste celui du bloc principal (contrat C3 inchangé).
- Blocs d'échauffement / retour au calme : objectif, durée planifiée, exercices et doses (temps, séries × répétitions) ; validation MANUELLE « Marquer le bloc terminé » (`CtRuntime.blocksDone`, champ optionnel, rechargement conservé) ; progression « Blocs terminés : x / N ».
- Cartes : « Séance complète · format · ≈ N min » et mention « plus courte que la cible 45–75 min (non complétée artificiellement) » ; Journal Beta : ligne « séance C4 (expérimentale) » ; export JSON : `composition.c4`.

## 3. Matrice de gouvernance

| Règle | Où | Autorité | Statut |
|---|---|---|---|
| Plage 45–75 min | `ct.c4.sessionDurationTarget` | décision PRODUIT (2026-10-12) | **approuvée produit**, non scientifique ; cible seulement |
| Blocs requis / facultatifs par stimulus | `ct.c4.sessionPlan` | hypothèse experte | **à valider** — TEST_ONLY en Beta 0, NON RÉSOLU en production |
| Durée échauffement général (min/max par niveau) | `ct.c4.warmup.generalS` | hypothèse | **à valider** — TEST_ONLY |
| Échauffement spécifique (tours, fraction des répétitions) | `ct.c4.warmup` | hypothèse | **à valider** — TEST_ONLY |
| Retour au calme (allure facile, mobilité) | `ct.c4.cooldown` | hypothèse | **à valider** — TEST_ONLY |
| Choix du mouvement d'échauffement : monostructural éligible, présent dans le WOD d'abord, puis coût technique, puis identifiant | code (classement déterministe tracé) | règle EXPÉRIMENTALE | expérimentale |
| Exclusion de l'échauffement de la charge / interférence | CORE + planificateur (`warmup`, `cooldown`) | règle CORE existante | existante |
| Éligibilité (matériel, douleur, restrictions, exclusions) | `movementIssues` | garde existante | existante |
| Format, mouvements, doses du WOD | C3 | TEST_ONLY (inchangé) | inchangé |
| Bloc force / technique | — | aucune | **non résolu** : contrat de délégation Strength à concevoir |
| Travail complémentaire | — | aucune | **non résolu** |
| Intensités (allure facile) | libellé seulement | aucune valeur | aucune intensité chiffrée (pas d'allure, pas de %) |
| Progression multi-semaines du WOD | C3 (récence, historique) | TEST_ONLY | inchangée ; C4 n'ajoute aucune progression |
| Diversité | C3 (récence) ; C4 suit le WOD | TEST_ONLY | inchangée |

Aucune valeur n'est présentée comme validée scientifiquement. Les valeurs TEST_ONLY vivent dans un seul fichier (`packages/crosstraining/tests/c3-governance.ts`, option `c4`), lues par la Beta 0 via `ctBeta0`.

## 4. Mesures (Beta 0, gouvernance TEST_ONLY)

| Profil (intention, niveau) | Disponible | Statuts observés (3 séances) | Durée planifiée |
|---|---|---|---|
| Mixte, débutant | 45 / 60 / 75 min | FULL_SESSION ×3 | 28–34 min (sous la cible) |
| Mixte, intermédiaire | 45 min | FULL_SESSION ×2, MAIN_BLOCK_ONLY (`CORE_REFUSED_FULL_SESSION`, for time) | 31–32 min |
| Mixte, intermédiaire | 60 / 75 min | FULL_SESSION ×3 | 31–39 min (sous la cible) |
| Mixte | 30 min | majoritairement MAIN_BLOCK_ONLY (hors temps / refus CORE) | — |
| Capacité aérobie | 60 min | FULL_SESSION ×3 | 42–48 min (2 sur 3 DANS la cible) |
| Seuil / intervalles anaérobies / endurance musculaire | 60 min | FULL_SESSION | 32–40 min |
| Niveau avancé | toutes | BLOCKED par C3 (`DOSE_UNDECIDED:advanced`, préexistant) | — |
| Poids du corps (sans ergomètre) | 60 min | MAIN_BLOCK_ONLY (`NO_ELIGIBLE_MONOSTRUCTURAL_MOVEMENT`) | — |

## 5. Limites connues (C4 v1)

- Durée typique ≈ 30–40 min : **sous la cible 45–75 min** tant que le bloc force / technique n'est pas délégué au moteur Strength (tracé `BELOW_PRODUCT_TARGET_NOT_FILLED`).
- L'estimation de C4 (valeurs gouvernées) et celle du CORE (transitions, consignes) peuvent diverger : le CORE tranche, repli tracé.
- La trace C3 conserve `C3_BLOCK_NOT_GENERATED warmup` (historique du moteur) ; le statut C4 fait autorité dans l'application.
- Mobilité de retour au calme : hanche seulement (catalogue) ⇒ couverture partielle tracée pour les WOD à dominante haut du corps.
- Sans ergomètre éligible (matériel au poids du corps) : aucun échauffement général gouverné ⇒ `MAIN_BLOCK_ONLY`.
- Aucun chronomètre propre aux blocs d'échauffement / retour au calme : validation manuelle bloc par bloc ; le chronomètre du bloc principal est inchangé (démarrage explicite).
- Aucune intensité chiffrée (« allure facile » en clair seulement) ; aucune progression propre aux blocs C4.

## 6. Tests

- Moteur (`crosstraining/tests/c4`) : 22 tests — fail-closed, statuts, bloc principal identique à C3, 45/60/75 min, temps court, repli CORE, 5 formats, niveaux, matériel (poids du corps, sans rameur), douleur.
- Planificateur (`planner/tests/c4`) : cohabitation Strength / Running / HYROX — placements, décisions M3, séances des autres sports et charge dérivée strictement identiques.
- App-core (`app-core/tests/ct/c4-app.test.ts`) : 45/60/75/30 min, chrono, validation des blocs persistée, fin, 4 semaines, pause douleur ; P0 réécrits pour le contrat C4.
- DOM et E2E 360×640 : carte, statut, blocs, validations, rechargement, démarrage explicite, export.
