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
5. ~~**DuplicateDetectionEngine** : hors CORE.~~ **Résolu en phase 3.5** : responsabilité commune implémentée dans le CORE (voir [SPORT-ENGINE-BOUNDARY.md](SPORT-ENGINE-BOUNDARY.md)).
6. **Ordre par défaut des leviers de compression** : structurel. Les leviers et pas sont lus dans le ruleset (`duration.leverSteps`).
7. **Pipeline** : il consomme les vecteurs d'optimisation B1–B6 fournis par l'appelant ; le CORE ne génère aucune séance.
8. **TypeScript** : lib ES2023.

## Problèmes rencontrés

- **Défaut réel (lot 12)** : la réparation pouvait vider une séance. Corrigé et testé.
- **Défaut réel (lot 14, trouvé à la relecture des goldens)** : la réparation pouvait retirer tout le travail principal et rendre VALIDE une séance composée du seul échauffement. Corrigé de deux façons : `remove_item` ne retire jamais le dernier bloc principal (l'issue devient REST_RECOMMENDED), et le contrôle d'intégrité rejette toute séance sans bloc principal.
- **Stryker 10 avec Vitest 5** : scores non fiables en phase 3. **Cause trouvée et contournée en phase 3.5**, voir plus bas.
- **Poussées GitHub** : erreurs 403 intermittentes, réussies ensuite.

## Dette technique et TODO

Voir la section « Phase 3.5 » ci-dessous (dette mise à jour).

## Phase 3.5 — Durcissement et frontière SportEngine / CORE

### Nouveaux tests (196 → 335)

| Fichier | Tests | Objet |
|---------|-------|-------|
| `unit/duration-levers.test.ts` | 27 | Leviers : aucun levier, sans effet, répété, p50 réduit mais p90 infaisable, principal / échauffement / retour au calme protégés, ordre déterministe, plafond, déjà faisable, impossible après tous les leviers, aucun ajout artificiel (propriété), formats, paramètres |
| `unit/repair-hardening.test.ts` | 20 | Violation différente recréée, cycle A → B → A, état visité, plafond exact, aucune réparation, HARD irréparable, régénération, action inconnue, matériel absent, temps invariant, contexte intact, régressions nommées lot 12 et lot 14, convergences, déterminisme |
| `integration/pipeline-branches.test.ts` | 19 | Toutes les issues et branches du pipeline, indépendance à l'ordre des candidats (propriété) |
| `unit/duplicate.test.ts` | 19 | Empreinte, similarité (bornes, symétrie), accidentel, prévu, stagnation, retest, ancre, intention jamais inférée, fenêtre, déterminisme |
| `integration/sport-engine-boundary.test.ts` | 24 | Flux complet avec moteur FACTICE, garde, contraintes dérivées, refus d'auto-validation, écarts à l'intention, intention inventée, B6 contre B2, réparation |
| `unit/archetype.test.ts` | 15 | Invariants de schéma, catalogue, faisabilité par preset, restrictions, CC1 |
| `unit/migration.test.ts` | 11 | Registre, V1 → courante → validation, version future, migration tricheuse, propriété |
| `unit/hysteresis.test.ts` | +3 | Bornes (seuil = ε, gain = seuil), raisons tracées |
| `architecture/core-boundaries.test.ts` | +1 | Détection précise d'un import du moteur depuis le domaine |

### Défauts trouvés et corrigés (7)

1. **Leviers interdits sur le bloc principal** : `reduce_sets`, `drop_accessory`, `reduce_rest` et `drop_optional_block` étaient acceptés sur le bloc principal. Le stimulus principal pouvait être réduit, voire supprimé, sans `DURATION.MAIN_VOLUME_REDUCED` (spec 07 §3.3, points 1, 7 et 9). Ces leviers sont désormais refusés (TECHNICAL).
2. **Réduction du principal non signalée** : une réduction par `shorten_conditioning` ou `reduce_run_volume` n'émettait pas `MAIN_VOLUME_REDUCED`.
3. **Plafond d'itérations décalé d'un** : le moteur appliquait `maxLeverSteps + 1` pas, et le dernier n'était jamais réévalué.
4. **Tentatives de réparation mal comptées** : une tentative était comptée avant de savoir si une réparation existait. Avec `maxAttemptsPerSession = 1`, « aucune réparation possible » était classé REPAIR_EXHAUSTED au lieu de NO_VALID_SOLUTION.
5. **Candidats dupliqués** : deux candidats de même identifiant et de contenus différents étaient acceptés, et la séance retenue dépendait de l'ordre d'entrée (vérifié). Désormais : INVALID_INPUT.
6. **Consentement ignoré** : `healthDataConsent` n'était pas lu par le pipeline. La non-persistance n'était pas tracée, et un rapport de douleur persisté sans consentement passait en silence.
7. **Levier ignoré en silence** : une clé absente de `duration.leverSteps` donnait NaN, et le levier était ignoré sans erreur.

Défaut de conception de ma propre phase 3.5, corrigé avant la fin : l'anti-doublon exigeait ses paramètres même sans historique comparable, contrairement à la spec 07 §4.

### Stryker

- **Cause** : `@stryker-mutator/vitest-runner` 10.0.0 ne voit pas les échecs de collecte sous Vitest 5. Une erreur levée dans le corps d'un `describe` donne `file.result.state = fail`, avec `errorsSet` vide et aucun test portant un résultat. Le runner conclut à une exécution complète sans échec et déclare « Survived » des mutants réellement tués. Diagnostic reproduit avec un script minimal utilisant l'API publique de Vitest.
- **Contournement sans changer la stack** : le runner `command`, intégré au cœur de Stryker, juge sur le code de sortie de `vitest run`.
- **Vérification** : sur `hysteresis.ts`, le score passe de 6,85 % à 79,45 % avec les tests existants, puis à 98,63 % après ajout des tests de bornes. Le mutant volontaire `v === undefined` → `v !== undefined` est tué. Le seul survivant est un mutant équivalent.
- **Limite** : le runner `command` exécute toute la suite pour chaque mutant (environ 6 s). Une passe complète sur tout le périmètre prendrait environ 50 minutes ; elle reste non bloquante et non calibrée (décision 4). Le test maison de mutation des paramètres reste actif.

### Dette technique et TODO (à jour)

- Calibrer les seuils de mutation et exécuter une passe complète (hors CI rapide), ou revenir au runner vitest quand le défaut sera corrigé en amont.
- Templates localisés des reason codes : hors CORE (couche de présentation).
- Aucun ruleset de production : les valeurs provisoires existent seulement dans les fixtures de test, et le contenu G1 y est fictif. Les paramètres `duplicate.*` sont des valeurs de test.
- Archétypes concrets : à définir avec chaque moteur de discipline.
- `hard_justified` (anti-doublon) : à porter par les règles HARD de discipline dans le validateur.

## Phase 4B — Baseline (avant toute modification)

| Élément | Constat |
|---------|---------|
| Commit | `9647a19` |
| Tests | 33 fichiers, 335 tests, tous verts |
| Typecheck / lint | Verts |
| Couverture | Instructions 93,51 %, branches 85,03 %, fonctions 97,26 %, lignes 96,97 % |

## Phase 4B — STRENGTH_CORE_EXTENSION_GATE = PASS

- CORE-EXT-1 : séries typées (`zRepTarget`, `zEffort`, `zSetIntensity` avec les modes load / percent_of_reference / effort / relative_to_working / bodyweight, tempo, `optional`) ; références d'item (`refs`, `alternatives`). DurationEngine : plage de reps (min, milieu, max) et séries facultatives (hors p50, dans p90). `reduce_sets` retire d'abord une série facultative. L'acceptation refuse une ancre déclarée absente de l'intention.
- CORE-EXT-2 : `SportEngine<TContext>` avec `parseContext`, et `SportEngineInput<TContext>.discipline`, typé et validé. `SportSessionRequest.disciplineContext` reste brut jusqu'au parseur.
- CORE-EXT-3 : `ProposeResult` (`proposals` | `no_valid_proposal`, schéma strict `zNoValidProposal`). Les raisons, besoins bloquants et données manquantes sont conservés jusqu'au `NO_VALID_SOLUTION`. Une exception du moteur reste `INVALID_INPUT`.
- Migration `session_record` v2 → v3 : identité ; un lecteur v2 refuse une donnée v3 (paramètre `known` de `migrateToCurrent`).
- Résultats : 365 tests (dont les 335 anciens) verts ; goldens inchangés ; typecheck et lint verts.

## Phase 4B — STRENGTH_ENGINE_GATE = PASS

Rapport complet : [`STRENGTH-ENGINE-REPORT.md`](STRENGTH-ENGINE-REPORT.md). Il couvre les extensions du CORE, les fichiers, les règles, les paramètres consommés, les tests, la couverture, les défauts corrigés, les écarts, les résultats longitudinaux et anti-biais, les séances S1–S7 lisibles et la dette.

- 45 fichiers de test, 486 tests verts (CORE 367, strength 119) ; typecheck, lint et architecture verts.
- Le CORE n'a été modifié que par CORE-EXT-1/2/3, `SportEngine.checks` et le traçage des raisons des moteurs.

## Phase 4C — STRENGTH_V1_LOCK_GATE = PASS

Rapport : [`STRENGTH-V1-LOCK-REPORT.md`](STRENGTH-V1-LOCK-REPORT.md). Documents associés :

- spec strength doc 10 (addendum V1.2) ;
- [inventaire des paramètres](STRENGTH-V1-PARAMETERS.md) ;
- [Evidence Review Pack](STRENGTH-EVIDENCE-REVIEW-PACK.md).

Résultats :

- 525 tests verts (CORE 370, strength 155) ;
- mutation ciblée strength : 59,3 % → 75,4 % ;
- moteur techniquement verrouillable, valeurs toujours provisoires.

## Phase 4E — STRENGTH SCIENTIFIC RULESET V1

Rapport : [`STRENGTH-4E-IMPLEMENTATION-REPORT.md`](STRENGTH-4E-IMPLEMENTATION-REPORT.md). Documents générés :

- [ruleset scientifique V1](STRENGTH-SCIENTIFIC-RULESET-V1.md) ;
- [registre scientifique](STRENGTH-SCIENCE-REGISTRY-V1.md) ;
- [diff S1–S7](STRENGTH-4E-BASELINE-DIFF.md) ;
- [PrescriptionConfidence](STRENGTH-PRESCRIPTION-CONFIDENCE-V1.md) ;
- [InterferenceAssessment](STRENGTH-INTERFERENCE-ASSESSMENT-V1.md).

Résultats :

- STRENGTH_SCIENCE_INTEGRATION_GATE = PASS ; STRENGTH_SCIENTIFIC_V1_GATE = PASS_PROVISIONAL ;
- 560 tests verts (CORE 370, strength 190) ; aucune modification du CORE ;
- aucune valeur existante modifiée ; goldens 0.2.0 inchangés ; ruleset candidat `0.3.0-strength-science-candidate`.

## Phase 4F — STRENGTH SCIENTIFIC LOCK & G1 HANDOFF

Rapport : [`STRENGTH-4F-IMPLEMENTATION-REPORT.md`](STRENGTH-4F-IMPLEMENTATION-REPORT.md). Documents :

- [diff 0.2.0 → 4E → 4F](STRENGTH-4F-BASELINE-DIFF.md) ;
- [dossier G1](STRENGTH-G1-REVIEW-PACK.md) ;
- [RFC CORE-EXT-5](CORE-EXT-5-RIR-RANGE-RFC.md) ;
- [préservation du stimulus](STRENGTH-STIMULUS-PRESERVATION-V1.md) ;
- registre, ruleset, interférence et confiance régénérés.

Résultats :

- STRENGTH_4F_CORRECTION_GATE = PASS ; STRENGTH_SCIENTIFIC_LOCK_V1 = LOCKED_PROVISIONAL ;
- 606 tests verts (CORE 370, strength 236) ; mutation 4F 75,1 % ; aucune modification du CORE ;
- ruleset `0.4.0-strength-science-lock` ; 0.2.0 et 4E reproductibles ; RunningEngine non commencé.

## Phase 4G — STIMULUS PRESERVATION MUTATION HARDENING

Rapport : [`STRENGTH-4G-IMPLEMENTATION-REPORT.md`](STRENGTH-4G-IMPLEMENTATION-REPORT.md) ; inventaire : [`STRENGTH-4G-MUTANT-INVENTORY.md`](STRENGTH-4G-MUTANT-INVENTORY.md).

Résultats :

- STRENGTH_STIMULUS_PRESERVATION_GATE = PASS ; STRENGTH_ENGINE_V1_FINAL_TECHNICAL_LOCK = LOCKED ;
- STRENGTH_SCIENTIFIC_LOCK_V1 = LOCKED_PROVISIONAL (inchangé) ;
- 630 tests verts ; mutation ciblée 90,0 %, 0 survivant PRESCRIPTION_RELEVANT ;
- S1–S7 identiques à la 4F ; aucune modification du CORE.

## Phase 5A — RUNNING ENGINE SCIENTIFIC & DOMAIN SPEC

Rapport : [`RUNNING-5A-REPORT.md`](RUNNING-5A-REPORT.md).

Résultats :

- RUNNING_5A_SPEC_GATE = PASS (spécification seulement) ;
- 9 documents Running (domaine, références, taxonomie, charge et progression, concurrent, preuves, registre brouillon, scénarios R1–R12, rapport) ;
- 75 questions falsifiables ; 22 sources au mieux SEARCH_SUMMARY ; 7 G1 candidats ;
- aucune modification du code (CORE, strength) ; 630 tests verts ; RunningEngine non commencé.

## Phase 5B — RUNNING SCIENTIFIC ARBITRATION & PARAMETER GOVERNANCE

Rapport : [`RUNNING-5B-REPORT.md`](RUNNING-5B-REPORT.md).

Résultats :

- RUNNING_5B_SCIENCE_ARBITRATION_GATE = PASS ; RUNNING_SCIENTIFIC_READINESS = READY_FOR_RULESET_DESIGN ;
- 75 questions arbitrées ; 110 paramètres sans valeur inventée ; 4 G1_SAFETY (3 reclassés) ; 11 archétypes (2 fusions) ;
- RFC CORE-EXT-R1 (option B recommandée, non implémentée) ; audit de 48 constantes ; R1–R12 révisés ; 88 tests futurs ;
- aucune modification du code ; 630 tests verts ; RunningEngine non commencé.

## Phase 5C — RUNNING CANDIDATE RULESET & GOLDEN PRESCRIPTIONS

Rapport : [`RUNNING-5C-REPORT.md`](RUNNING-5C-REPORT.md).

Résultats :

- RUNNING_5C_RULESET_GATE = PASS ; RUNNING_RULESET_V0_STATUS = CANDIDATE_WITH_BLOCKERS ;
- 140 paramètres gouvernés, 28 valeurs candidates (21 chiffrées, aucune SUPPORTED), 13 paramètres vides bloquants ;
- R1–R12 : 10 VALID, 2 NO_VALID (G1 V33, V34) ; C1–C8 ; I1–I20 ; 20 adversariaux ; sensibilité ;
- G1 : 4 politiques ↔ 7 paramètres, 0 signée ; UNKNOWN reste UNKNOWN ; éligibilité séparée de la confiance ;
- RFC CORE-EXT-R1 finale (profondeur fixe, non implémentée) ; contrat VALID / NO_VALID ;
- aucune modification du code ; 630 tests verts ; RunningEngine non commencé.

## Phase 5D — RUNNING PARAMETER EVIDENCE & EXPERT ARBITRATION

Rapport : [`RUNNING-5D-REPORT.md`](RUNNING-5D-REPORT.md).

Résultats :

- RUNNING_5D_PARAMETER_ARBITRATION_GATE = PASS ; RUNNING_PARAMETER_READINESS = READY_FOR_EXPERT_REVIEW ;
- 23 valeurs chiffrées actives avec provenance (1 SOURCE_DERIVED, 6 SOURCE_INFORMED, 11 EXPERT_PROPOSED, 3 PRODUCT_GUARDRAIL, 2 TECHNICAL) ; constantes 3 % et 6 % retirées (variabilité typique, gravité ordinale) ; RecentLoadContext ; 12 paramètres non résolus justifiés ;
- R1–R12 : 10 VALID_PROVISIONAL, 2 BLOCKED_G1 ; démonstrations HOLD / restauration / baisse ; calcul du taper explicite ;
- 0 nouveau concept d'architecture ; 0 G1 signé ; aucune modification du code ; 630 tests verts.

## Phase 5E — RUNNING EXPERT & SAFETY DECISION PACK

Rapport : [`RUNNING-5E-REPORT.md`](RUNNING-5E-REPORT.md).

Résultats :

- RUNNING_5E_DECISION_PACK_GATE = PASS ; RUNNING_HUMAN_DECISION_READINESS = READY_FOR_EXPERT_DECISIONS ; CORE_EXT_R1_DESIGN_READINESS = READY_FOR_APPROVAL ;
- 14 décisions expertes (16 consolidées), 4 politiques G1 / 7 paramètres, 0 signature, 0 approbation automatique ;
- corrections : V42 → RunningPerformanceVariabilityEstimate ; V38 séparé (exposant non verrouillé) ; R11 sans valeur par défaut ; bestToleratedExposure ; provenance externe ;
- ensemble minimal : 8 décisions (4 G1 + E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD) ; 0 nouvelle valeur ; 0 nouveau concept ; aucune modification du code.

## Phase 5F — RUNNING V1 SCOPE FREEZE & HUMAN REVIEW HANDOFF

Rapport : [`RUNNING-5F-REPORT.md`](RUNNING-5F-REPORT.md).

Résultats :

- RUNNING_5F_SCOPE_FREEZE_GATE = PASS ; RUNNING_PRE_IMPLEMENTATION_STATUS = SCOPE_DECISION_REQUIRED ;
- trois périmètres (A : 8 décisions, B : 15, C : 20), non classés ; matrice des séances ;
- audit des bloquants : aucune décision scientifique ou de sécurité n'est un bloquant de code (verrouillage et production seulement) ; seul CORE-EXT-R1 l'est ;
- dossiers expert (14 fiches) et sécurité (politique séparée de la dose, rôles clarifiés, aucune certification inventée) ; ordre des décisions ; carte d'implémentation avant signature ; dette priorisée ;
- CORE-EXT-R1 : READY_FOR_HUMAN_APPROVAL (0 contradiction, 3 points d'intégration) ; entrées golden figées ; aucune modification du code.
