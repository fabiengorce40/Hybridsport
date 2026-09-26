# Phase 3 — Journal d'implémentation du CORE

Référence normative : [TRAINING ENGINE SPECIFICATION V1.2](../engine-spec/README.md).

## Lot 0 — Baseline (avant toute modification de code)

| Élément | Constat |
|---------|---------|
| Branche | `claude/fitness-app-architecture-81fs92`, à jour avec `origin` (commit `c94b1cc`) |
| Contenu | Documentation uniquement (`docs/architecture/`, `docs/engine-spec/`, `README.md`, `.gitignore`) |
| Code existant | Aucun |
| Scripts existants | Aucun (pas de `package.json`) |
| Tests existants | Aucun ⇒ baseline : 0 test, rien à exécuter |
| Typecheck / lint existants | Aucun |
| Environnement | Node v22.22.2, npm 10.9.7, pnpm 10.33.0, accès au registre npm |
| Choix d'outillage | TypeScript **5.9.3** (typescript-eslint 8.70 exige `< 6.1`, donc pas TS 7) ; Vitest 5 ; fast-check 4 ; ESLint 9 + typescript-eslint ; Zod 4 (validation à l'exécution prévue par la spec) |

Configuration fonctionnelle existante réécrite : aucune (il n'y en avait pas).

## Lots 1 à 15 — Synthèse

| Lot | Contenu | Commit |
|-----|---------|--------|
| 1 | Primitives du domaine (ids, SemVer, temps, enums, ReasonCode, Violation, EngineResult, schémas zod) | `cf3c2b3` |
| 2 | Déterminisme : xoshiro128** injecté, FNV-1a, deriveSeed, JSON canonique, EngineContext | `f11a64b` |
| 3 | Registre des reason codes, TraceBuilder, trace figée et `explain()` | `42f2a5b` |
| 4 | RuleMetadata / ParameterMetadata, LoadedRuleset, CORE_PARAMETERS + preflight, RuleRegistry, diff de rulesets | `153719e` |
| 5 | `resolveEnforcement` (point d'entrée unique), monotonie selon dataQuality, cliquet G1, gate de gouvernance par environnement | `96b99b3` |
| 6 | Taxonomie 4 couches, 8 structures dérivées, profil de demande, schéma de catalogue, fixture de 33 exercices | `5c4243d` |
| 7 | Couverture CC1–CC11 (PASS / FAIL / NOT_APPLICABLE / NOT_READY) | `a04335c` |
| 8-9 | Couche A (admissibilité, fail-closed) et couche B (lexicographique par bandes, ε paramétrique) | `f5dd15c` |
| 10 | Couche C : hystérésis ≥ ε, sans oscillation | `4348710` |
| 11 | DurationEngine CORE : min/p50/p90 par composant, corrélation, tolérances, leviers, fitDuration | `cd3f53b` |
| 12 | SessionValidator (entrée `unknown`, jamais d'exception, fail-closed) et RepairEngine (borné, états visités) | `3401bd6` |
| 13 | Contrats douleur P1–P4 (contenu G1 dans le ruleset), consentement, éligibilité, programStatus | `de93d9e` |
| 14 | Pipeline CORE, harnais (goldens, métamorphiques, longitudinal 52 semaines, parcours adverses, mutation de paramètres), Stryker | `390079a` |
| 15 | Tests d'architecture du CORE (dépendances interdites, liste blanche d'imports, package.json, globals, horloge, hasard, contournement, identifiants sportifs) | ce commit |

## Écarts par rapport à la spécification V1.2 (aucune modification silencieuse de la spec)

1. **Modèle de séance** : union générique de blocs (`sets`, `emom`, `amrap`, `for_time`, `continuous`) au lieu des structures `RunSegment` / `ConditioningSpec` propres aux disciplines. Ces dernières seront des spécialisations fournies par les moteurs de discipline.
2. **ParameterMetadata** : ajout de `approvals` et `changelog`, nécessaires au cliquet G1 (décision 4). Ce sont des extensions, pas des changements de sens.
3. **ArchetypeCoverageSpec** : ajout de `declaredInfeasibleRestrictions`, qui rend explicite l'infaisabilité assumée de CC10.
4. **Contrôle d'éligibilité à l'effort maximal** : reporté aux moteurs de discipline. Le CORE fournit `generationGuard` et `performanceRelevant`.
5. **DuplicateDetectionEngine** : hors CORE. Un exercice peut donc apparaître en double après une réparation ; le contrôle reviendra au moteur concerné.
6. **Ordre par défaut des leviers de compression** : structurel. Les leviers et pas sont lus dans le ruleset (`duration.leverSteps`).
7. **Pipeline** : il consomme les vecteurs d'optimisation B1–B6 fournis par l'appelant ; le CORE ne génère aucune séance.
8. **TypeScript** : lib ES2023.

## Problèmes rencontrés

- **Défaut réel (lot 12)** : la réparation pouvait vider une séance. Corrigé et testé.
- **Défaut réel (lot 14, trouvé à la relecture des goldens)** : la réparation pouvait retirer tout le travail principal et rendre VALIDE une séance composée du seul échauffement. Corrigé de deux façons : `remove_item` ne retire jamais le dernier bloc principal (l'issue devient REST_RECOMMENDED), et le contrôle d'intégrité rejette toute séance sans bloc principal.
- **Stryker 10 avec Vitest 5** : scores non fiables. Sur `hysteresis.ts`, Stryker déclare « Survived » le mutant `v === undefined` → `v !== undefined`, alors que ce même mutant appliqué à la main fait échouer 2 fichiers de tests. Le mutant actif n'est vraisemblablement pas injecté (API de pool de Vitest 5). Le résultat est le même avec `coverageAnalysis: off` et `related: false`. La mutation reste non bloquante (matrice de la décision 4 : non calibrée). Le test maison `tests/mutation/parameter-mutation.test.ts` couvre la mutation des paramètres du ruleset.
- **Poussées GitHub** : erreurs 403 intermittentes, réussies ensuite.

## Dette technique et TODO

- Réparer l'intégration de Stryker (épingler Vitest 4, ou attendre un runner compatible avec Vitest 5), puis calibrer les seuils.
- Couverture de branches plus faible sur `duration/levers.ts` (53 %), `repair/repair.ts` (64 %) et `api/pipeline.ts` (64 %).
- Templates localisés des reason codes et test « un template par code et par langue » (spec 10 §1) : hors CORE (couche de présentation).
- Aucun ruleset de production : seules des valeurs de test provisoires existent, dans `packages/engine/tests/fixtures/ruleset.ts`, et le contenu G1 y est fictif.
- Migrations de `schemaVersion` : non implémentées (aucun plan sérialisé à migrer pour l'instant).
