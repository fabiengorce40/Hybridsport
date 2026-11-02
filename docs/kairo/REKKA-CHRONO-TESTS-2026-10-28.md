# Tests de la préparation du chronomètre — 28 octobre 2026

Les groupes ont été exécutés en UTC, avec un seul worker et un délai de 75 s par groupe. Total observé : **3 035 tests réussis, 2 ignorés**, aucune expiration ni échec dans ces groupes. Ils ont tourné pendant la préparation : le fichier `global-clock.test.ts` a ensuite été renforcé, puis ses **9 tests** ont été relancés avec succès ; la correction CSS des cibles tactiles a ensuite été vérifiée par navigateur. Ne pas présenter le chiffre groupé comme un passage unique de tous les fichiers sur un commit figé.

## Groupes et fichiers

### apps-kairo-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  63 passed (63)

- `apps/kairo/tests/app.test.tsx`
- `apps/kairo/tests/beta-channel.test.ts`
- `apps/kairo/tests/beta-reset-dom.test.tsx`
- `apps/kairo/tests/beta0.test.tsx`
- `apps/kairo/tests/chrono-input.test.tsx`
- `apps/kairo/tests/ct-strength-block-dom.test.tsx`
- `apps/kairo/tests/ct-workout-dom.test.tsx`
- `apps/kairo/tests/deploy-guard.test.ts`
- `apps/kairo/tests/deployed-state-dom.test.tsx`
- `apps/kairo/tests/effort-dom.test.tsx`

### apps-kairo-tests-02 — code 0 — Test Files  10 passed (10) ; Tests  34 passed (34)

- `apps/kairo/tests/equipment-dom.test.tsx`
- `apps/kairo/tests/field-dom.test.tsx`
- `apps/kairo/tests/global-clock.test.ts`
- `apps/kairo/tests/hr-workout-dom.test.tsx`
- `apps/kairo/tests/m3-planning-dom.test.tsx`
- `apps/kairo/tests/m31-unplaced-dom.test.tsx`
- `apps/kairo/tests/modify-programme-dom.test.tsx`
- `apps/kairo/tests/pain-start-dom.test.tsx`
- `apps/kairo/tests/precheck-dom.test.tsx`
- `apps/kairo/tests/present.test.ts`

### apps-kairo-tests-03 — code 0 — Test Files  10 passed (10) ; Tests  53 passed (53)

- `apps/kairo/tests/q1-quality-dom.test.tsx`
- `apps/kairo/tests/r51-planning-grid-dom.test.tsx`
- `apps/kairo/tests/r52-planning-catalog-dom.test.tsx`
- `apps/kairo/tests/rc32-ct-feasibility-dom.test.tsx`
- `apps/kairo/tests/rc33-free-run-dom.test.tsx`
- `apps/kairo/tests/rc34-running-history-dom.test.tsx`
- `apps/kairo/tests/rc35-run-player-dom.test.tsx`
- `apps/kairo/tests/rc41-run-difficulty-dom.test.tsx`
- `apps/kairo/tests/rc42-hr-feasibility-dom.test.tsx`
- `apps/kairo/tests/rc43-free-run-type-dom.test.tsx`

### apps-kairo-tests-04 — code 0 — Test Files  10 passed (10) ; Tests  34 passed (34)

- `apps/kairo/tests/rc44-week-load-dom.test.tsx`
- `apps/kairo/tests/rc45-g5-moved-dom.test.tsx`
- `apps/kairo/tests/rc45-interference-maintain-dom.test.tsx`
- `apps/kairo/tests/rc45-volume-above-high-dom.test.tsx`
- `apps/kairo/tests/rekka-running.test.tsx`
- `apps/kairo/tests/strength-set-entry.test.tsx`
- `apps/kairo/tests/strength-week-dom.test.tsx`
- `apps/kairo/tests/substitution-dom.test.tsx`
- `apps/kairo/tests/v2-assets.test.ts`
- `apps/kairo/tests/v2-design-system.test.ts`

### apps-kairo-tests-05 — code 0 — Test Files  1 passed (1) ; Tests  5 passed (5)

- `apps/kairo/tests/v2-prototype-dom.test.tsx`

### packages-app-core-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  101 passed (101)

- `packages/app-core/tests/adaptation.test.ts`
- `packages/app-core/tests/architecture.test.ts`
- `packages/app-core/tests/beta0-app.test.ts`
- `packages/app-core/tests/beta0-hybrid.test.ts`
- `packages/app-core/tests/beta0-legacy-upgrade.test.ts`
- `packages/app-core/tests/beta0-modify.test.ts`
- `packages/app-core/tests/beta0-persistence.test.ts`
- `packages/app-core/tests/beta0-reset.test.ts`
- `packages/app-core/tests/consolidation/composite-demand.test.ts`
- `packages/app-core/tests/consolidation/four-weeks.test.ts`

### packages-app-core-tests-02 — code 0 — Test Files  9 passed | 1 skipped (10) ; Tests  86 passed | 1 skipped (87)

- `packages/app-core/tests/consolidation/multi-config.test.ts`
- `packages/app-core/tests/consolidation/r1-r2-comparison.test.ts`
- `packages/app-core/tests/course.test.ts`
- `packages/app-core/tests/ct/c4-app.test.ts`
- `packages/app-core/tests/ct/c41-duration-audit.test.ts`
- `packages/app-core/tests/ct/c42-baseline.gen.test.ts`
- `packages/app-core/tests/ct/c42-report.test.ts`
- `packages/app-core/tests/ct/c43-app.test.ts`
- `packages/app-core/tests/ct/c43-report.test.ts`
- `packages/app-core/tests/ct/ct-runtime.test.ts`

### packages-app-core-tests-03 — code 0 — Test Files  10 passed (10) ; Tests  142 passed (142)

- `packages/app-core/tests/ct/ct-state-size.test.ts`
- `packages/app-core/tests/ct/loop.test.ts`
- `packages/app-core/tests/feedback-loop-e2e.test.ts`
- `packages/app-core/tests/field/field.test.ts`
- `packages/app-core/tests/hr/hr-runtime.test.ts`
- `packages/app-core/tests/hr/hr-state-size.test.ts`
- `packages/app-core/tests/hr/loop.test.ts`
- `packages/app-core/tests/journey.test.ts`
- `packages/app-core/tests/longitudinal/state-size.test.ts`
- `packages/app-core/tests/longitudinal/strength-s3-adversarial.test.ts`

### packages-app-core-tests-04 — code 0 — Test Files  10 passed (10) ; Tests  122 passed (122)

- `packages/app-core/tests/longitudinal/strength-s4-adversarial.test.ts`
- `packages/app-core/tests/longitudinal/strength-s5-effort.test.ts`
- `packages/app-core/tests/longitudinal/strength-scenarios.test.ts`
- `packages/app-core/tests/m3/m3-beta0.test.ts`
- `packages/app-core/tests/m31/balanced-simulation.test.ts`
- `packages/app-core/tests/m31/unplaced.test.ts`
- `packages/app-core/tests/multisport-e2e.test.ts`
- `packages/app-core/tests/p0/manual-start.test.ts`
- `packages/app-core/tests/p0/pain-start.test.ts`
- `packages/app-core/tests/p0/r1-audit.test.ts`

### packages-app-core-tests-05 — code 0 — Test Files  10 passed (10) ; Tests  105 passed (105)

- `packages/app-core/tests/planner.test.ts`
- `packages/app-core/tests/programme-e2e.test.ts`
- `packages/app-core/tests/q1/q1-app.test.ts`
- `packages/app-core/tests/rc3-test/rc1-migration.test.ts`
- `packages/app-core/tests/rc31/a1-readiness-persisted.test.ts`
- `packages/app-core/tests/rc31/a2-running-test-fallback.test.ts`
- `packages/app-core/tests/rc31/a8-not-planned-reason.test.ts`
- `packages/app-core/tests/rc32/ct-feasibility.test.ts`
- `packages/app-core/tests/rc33/free-run.test.ts`
- `packages/app-core/tests/rc34/running-history.test.ts`

### packages-app-core-tests-06 — code 0 — Test Files  9 passed | 1 skipped (10) ; Tests  79 passed | 1 skipped (80)

- `packages/app-core/tests/rc35/run-player.test.ts`
- `packages/app-core/tests/rc4-audit/perf-seeds.test.ts`
- `packages/app-core/tests/rc4-audit/rc4-findings.test.ts`
- `packages/app-core/tests/rc4-audit/rc4-matrix.test.ts`
- `packages/app-core/tests/rc4/rc41-run-difficulty.test.ts`
- `packages/app-core/tests/rc4/rc42-hr-feasibility.test.ts`
- `packages/app-core/tests/rc4/rc43-free-runs.test.ts`
- `packages/app-core/tests/rc44/rc44-week-load.test.ts`
- `packages/app-core/tests/rc45/f6-r3-planner.test.ts`
- `packages/app-core/tests/rc45/f6-versioned-content.test.ts`

### packages-app-core-tests-07 — code 0 — Test Files  10 passed (10) ; Tests  99 passed (99)

- `packages/app-core/tests/rc45/lotc-interference-maintain.test.ts`
- `packages/app-core/tests/rc45/reproducibility-diagnostic.test.ts`
- `packages/app-core/tests/rc46/b4-cross-inputs.test.ts`
- `packages/app-core/tests/rc46/l1b4-versioned-content.test.ts`
- `packages/app-core/tests/rc46/l1v3-versioned-content.test.ts`
- `packages/app-core/tests/rc46/quality-bench.test.ts`
- `packages/app-core/tests/rekka/running-recovery.test.ts`
- `packages/app-core/tests/running-profile.test.ts`
- `packages/app-core/tests/store.test.ts`
- `packages/app-core/tests/strength-fixes/adapt-persisted.test.ts`

### packages-app-core-tests-08 — code 0 — Test Files  7 passed (7) ; Tests  74 passed (74)

- `packages/app-core/tests/strength-fixes/equipment.test.ts`
- `packages/app-core/tests/strength-fixes/precheck-reproducibility.test.ts`
- `packages/app-core/tests/strength-fixes/precheck-safety.test.ts`
- `packages/app-core/tests/strength-fixes/precheck.test.ts`
- `packages/app-core/tests/strength-fixes/programming.test.ts`
- `packages/app-core/tests/strength-substitution.test.ts`
- `packages/app-core/tests/strength-week.test.ts`

### packages-crosstraining-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  143 passed (143)

- `packages/crosstraining/tests/architecture/crosstraining-architecture.test.ts`
- `packages/crosstraining/tests/c3/adversarial.test.ts`
- `packages/crosstraining/tests/c3/scenarios.test.ts`
- `packages/crosstraining/tests/c3/simulation.test.ts`
- `packages/crosstraining/tests/c3/units.test.ts`
- `packages/crosstraining/tests/c4/c4-compose.test.ts`
- `packages/crosstraining/tests/integration/c2.test.ts`
- `packages/crosstraining/tests/integration/engine.test.ts`
- `packages/crosstraining/tests/integration/properties.test.ts`
- `packages/crosstraining/tests/spike/c2-anti-duplicate-sensitivity.test.ts`

### packages-crosstraining-tests-02 — code 0 — Test Files  10 passed (10) ; Tests  105 passed (105)

- `packages/crosstraining/tests/spike/c2-bootstrap-estimation-data.test.ts`
- `packages/crosstraining/tests/spike/c2-energy-neutralization.test.ts`
- `packages/crosstraining/tests/spike/c2-optional-dimensions.test.ts`
- `packages/crosstraining/tests/spike/c2-replay-core-compat.test.ts`
- `packages/crosstraining/tests/spike/c2-replay-energy-shares.test.ts`
- `packages/crosstraining/tests/unit/capabilities.test.ts`
- `packages/crosstraining/tests/unit/context.test.ts`
- `packages/crosstraining/tests/unit/governance.test.ts`
- `packages/crosstraining/tests/unit/movement.test.ts`
- `packages/crosstraining/tests/unit/mutation-gaps.test.ts`

### packages-engine-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  69 passed (69)

- `packages/engine/tests/adversarial/journeys.test.ts`
- `packages/engine/tests/architecture/core-boundaries.test.ts`
- `packages/engine/tests/architecture/core-ext-r1-boundaries.test.ts`
- `packages/engine/tests/architecture/determinism-boundaries.test.ts`
- `packages/engine/tests/architecture/no-bypass.test.ts`
- `packages/engine/tests/architecture/sport-constants.test.ts`
- `packages/engine/tests/golden/core-pipeline.golden.test.ts`
- `packages/engine/tests/integration/core-ext-r1-boundary.test.ts`
- `packages/engine/tests/integration/core-pipeline.test.ts`
- `packages/engine/tests/integration/pipeline-branches.test.ts`

### packages-engine-tests-02 — code 0 — Test Files  10 passed (10) ; Tests  88 passed (88)

- `packages/engine/tests/integration/sport-engine-boundary.test.ts`
- `packages/engine/tests/longitudinal/core.longitudinal.test.ts`
- `packages/engine/tests/metamorphic/core.metamorphic.test.ts`
- `packages/engine/tests/mutation/parameter-mutation.test.ts`
- `packages/engine/tests/property/core-ext-r1.property.test.ts`
- `packages/engine/tests/property/decision.property.test.ts`
- `packages/engine/tests/property/determinism.property.test.ts`
- `packages/engine/tests/unit/admissibility.test.ts`
- `packages/engine/tests/unit/archetype.test.ts`
- `packages/engine/tests/unit/catalog.test.ts`

### packages-engine-tests-03 — code 0 — Test Files  10 passed (10) ; Tests  176 passed (176)

- `packages/engine/tests/unit/core-ext-1.test.ts`
- `packages/engine/tests/unit/core-ext-r1-hardening.test.ts`
- `packages/engine/tests/unit/core-ext-r1.test.ts`
- `packages/engine/tests/unit/coverage.test.ts`
- `packages/engine/tests/unit/determinism.test.ts`
- `packages/engine/tests/unit/domain-primitives.test.ts`
- `packages/engine/tests/unit/duplicate.test.ts`
- `packages/engine/tests/unit/duration-levers.test.ts`
- `packages/engine/tests/unit/duration.test.ts`
- `packages/engine/tests/unit/enforcement.test.ts`

### packages-engine-tests-04 — code 0 — Test Files  10 passed (10) ; Tests  130 passed (130)

- `packages/engine/tests/unit/fingerprint-explicit.test.ts`
- `packages/engine/tests/unit/hysteresis.test.ts`
- `packages/engine/tests/unit/item-load.test.ts`
- `packages/engine/tests/unit/migration.test.ts`
- `packages/engine/tests/unit/optimization.test.ts`
- `packages/engine/tests/unit/quality.test.ts`
- `packages/engine/tests/unit/repair-hardening.test.ts`
- `packages/engine/tests/unit/repair-load-transfer.test.ts`
- `packages/engine/tests/unit/repair-pace-transfer.test.ts`
- `packages/engine/tests/unit/repair.test.ts`

### packages-engine-tests-05 — code 0 — Test Files  6 passed (6) ; Tests  73 passed (73)

- `packages/engine/tests/unit/ruleset.test.ts`
- `packages/engine/tests/unit/safety.test.ts`
- `packages/engine/tests/unit/session-demand-repetition.test.ts`
- `packages/engine/tests/unit/session-demand.test.ts`
- `packages/engine/tests/unit/trace.test.ts`
- `packages/engine/tests/unit/validator.test.ts`

### packages-hyrox-tests-01 — code 0 — Test Files  4 passed (4) ; Tests  95 passed (95)

- `packages/hyrox/tests/architecture/hyrox-architecture.test.ts`
- `packages/hyrox/tests/integration/h1.test.ts`
- `packages/hyrox/tests/integration/h2-adversarial.test.ts`
- `packages/hyrox/tests/integration/h2-scenarios.test.ts`

### packages-planner-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  99 passed (99)

- `packages/planner/tests/architecture/dependency-graph.test.ts`
- `packages/planner/tests/architecture/planner-architecture.test.ts`
- `packages/planner/tests/c4/c4-multisport.test.ts`
- `packages/planner/tests/c4/c43-delegation.test.ts`
- `packages/planner/tests/integration/c3-multisport.test.ts`
- `packages/planner/tests/integration/composition.test.ts`
- `packages/planner/tests/integration/execution.test.ts`
- `packages/planner/tests/integration/h2-multisport.test.ts`
- `packages/planner/tests/integration/planner-v2.test.ts`
- `packages/planner/tests/integration/planner.test.ts`

### packages-planner-tests-02 — code 0 — Test Files  7 passed (7) ; Tests  154 passed (154)

- `packages/planner/tests/integration/slot-retry.test.ts`
- `packages/planner/tests/m3/g5-global-placement.test.ts`
- `packages/planner/tests/m3/m3-adversarial.test.ts`
- `packages/planner/tests/m3/m3-scenarios.test.ts`
- `packages/planner/tests/m3/m3-simulation.test.ts`
- `packages/planner/tests/m3/m31-unplaced.test.ts`
- `packages/planner/tests/q1/q1-audit.test.ts`

### packages-programme-tests-01 — code 0 — Test Files  3 passed (3) ; Tests  46 passed (46)

- `packages/programme/tests/architecture/programme-architecture.test.ts`
- `packages/programme/tests/integration/programme.test.ts`
- `packages/programme/tests/integration/rotation.test.ts`

### packages-running-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  212 passed (212)

- `packages/running/tests/architecture/running-architecture.test.ts`
- `packages/running/tests/integration/engine.test.ts`
- `packages/running/tests/integration/pipeline-characterization.test.ts`
- `packages/running/tests/integration/pipeline-gaps.test.ts`
- `packages/running/tests/integration/product-decisions.test.ts`
- `packages/running/tests/integration/r5-pace-properties.test.ts`
- `packages/running/tests/integration/r5-test-pace.test.ts`
- `packages/running/tests/integration/r5-week-properties.test.ts`
- `packages/running/tests/integration/r5-week.test.ts`
- `packages/running/tests/integration/wave2.test.ts`

### packages-running-tests-02 — code 0 — Test Files  10 passed (10) ; Tests  184 passed (184)

- `packages/running/tests/integration/wave3.test.ts`
- `packages/running/tests/unit/analysis.test.ts`
- `packages/running/tests/unit/capabilities.test.ts`
- `packages/running/tests/unit/first-exposure-unit.test.ts`
- `packages/running/tests/unit/governance.test.ts`
- `packages/running/tests/unit/guards-unit.test.ts`
- `packages/running/tests/unit/hardening.test.ts`
- `packages/running/tests/unit/load-variability-model.test.ts`
- `packages/running/tests/unit/progression-step.test.ts`
- `packages/running/tests/unit/proposal-energy.test.ts`

### packages-running-tests-03 — code 0 — Test Files  6 passed (6) ; Tests  123 passed (123)

- `packages/running/tests/unit/rc43-free-run-policy.test.ts`
- `packages/running/tests/unit/references-hardening.test.ts`
- `packages/running/tests/unit/references.test.ts`
- `packages/running/tests/unit/wave2-history.test.ts`
- `packages/running/tests/unit/wave3-pace-test-structure.test.ts`
- `packages/running/tests/unit/week-unit.test.ts`

### packages-strength-tests-01 — code 0 — Test Files  10 passed (10) ; Tests  85 passed (85)

- `packages/strength/tests/architecture/parameters.test.ts`
- `packages/strength/tests/architecture/strength-architecture.test.ts`
- `packages/strength/tests/golden/anti-bias.test.ts`
- `packages/strength/tests/golden/goldens.test.ts`
- `packages/strength/tests/golden/science-candidate.test.ts`
- `packages/strength/tests/golden/science-docs.test.ts`
- `packages/strength/tests/golden/science-lock.test.ts`
- `packages/strength/tests/golden/stability-sensitivity.test.ts`
- `packages/strength/tests/integration/engine.test.ts`
- `packages/strength/tests/longitudinal/evidence-longitudinal.test.ts`

### packages-strength-tests-02 — code 0 — Test Files  10 passed (10) ; Tests  69 passed (69)

- `packages/strength/tests/longitudinal/simulation.test.ts`
- `packages/strength/tests/property/fuzz-metamorphic.test.ts`
- `packages/strength/tests/unit/archetypes-selection.test.ts`
- `packages/strength/tests/unit/authorities.test.ts`
- `packages/strength/tests/unit/block-mode.test.ts`
- `packages/strength/tests/unit/catalog-review.test.ts`
- `packages/strength/tests/unit/checks.test.ts`
- `packages/strength/tests/unit/composition.test.ts`
- `packages/strength/tests/unit/discipline-mobility.test.ts`
- `packages/strength/tests/unit/f6-residual.test.ts`

### packages-strength-tests-03 — code 0 — Test Files  10 passed (10) ; Tests  164 passed (164)

- `packages/strength/tests/unit/load-dose-rampup.test.ts`
- `packages/strength/tests/unit/mutation-4f.test.ts`
- `packages/strength/tests/unit/mutation-hardening.test.ts`
- `packages/strength/tests/unit/params-cache.test.ts`
- `packages/strength/tests/unit/progression.test.ts`
- `packages/strength/tests/unit/s3-longitudinal.test.ts`
- `packages/strength/tests/unit/s4-continuity-evidence.test.ts`
- `packages/strength/tests/unit/science-lock.test.ts`
- `packages/strength/tests/unit/science.test.ts`
- `packages/strength/tests/unit/stimulus-preservation.test.ts`

### packages-strength-tests-04 — code 0 — Test Files  1 passed (1) ; Tests  23 passed (23)

- `packages/strength/tests/unit/substitution-contract.test.ts`

## Tests ignorés

- `packages/app-core/tests/ct/c42-baseline.gen.test.ts` : conditionné par `C4_BASELINE`.
- `packages/app-core/tests/rc4-audit/perf-seeds.test.ts` : conditionné par `PERF_SEED_DIR`.

## Vérifications navigateur sur le code applicatif après correction tactile

- `base` 21, `cross` 27, `hyrox` 36, `recovery` 8 et `planning` 74 assertions : réussies. Ce sont des parcours séparés du grand E2E, pas toutes ses sections.
- `session` : 360 / 390 px, série réelle, charge, repos, pause/reprise, rechargement, temps écoulé et cibles de navigation ≥ 44 px : réussi.
- `reps` : prescription réelle 12–20, 360 / 390 px : réussi.
- Mise à jour PWA locale : build A ancienne présentation vers B V2, deux clés de test conservées et grille retrouvée : réussie. Le nouveau chrono n’est pas relié à la PWA, donc ce test ne valide pas son installation.
- `e2e-global-clock-storage.mjs` : test auxiliaire Vite dans un profil Chromium jetable ; pause, fermeture/réouverture, deux onglets et Web Locks, hors ligne après chargement, compagnon séparé et clé historique intacte. Il ne couvre pas les transitions réelles de séance ou le démarrage PWA hors ligne.
