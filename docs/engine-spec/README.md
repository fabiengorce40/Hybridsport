# TRAINING ENGINE SPECIFICATION V1.2

> Statut : **V1.2 — les 45 décisions sont arbitrées.** Voir le [CHANGELOG](CHANGELOG.md) et le « Gate d'architecture » en fin de document.
> Les paramètres sportifs restent provisoires ; les contenus G1 (douleur, éligibilité) et les règles G2/G5 doivent être approuvés avant production.
> Base de travail : [dossier d'architecture phase 1](../architecture/README.md) et contraintes **C1 à C10**.
> Cette spécification **approfondit** la phase 1 ; elle ne la réécrit pas. Les rares points de la phase 1 qu'elle remplace sont listés plus bas, avec leur justification.

## Sommaire

| # | Document | Sections du cahier des charges |
|---|----------|--------------------------------|
| 01 | [Architecture générale, pipeline, contrats](01-architecture-pipeline.md) | 1 · 2 · niveaux de règles · priorités · déterminisme · échec explicite · performance · structure du package · contrats |
| 02 | [Modèles de données](02-modeles-donnees.md) | 3 · profil, objectifs, disponibilités, matériel, séance, historique prévu/réalisé |
| 03 | [ExerciseCatalog & familles de mouvements](03-catalogue.md) | 4 |
| 04 | [Charge, exposition & AthleteState](04-charge-athlete-state.md) | 5 · **remise en question de C6** |
| 05 | [GlobalPlanner & InterferenceManager](05-planner-interference.md) | 6 · 11 |
| 06 | [Moteurs de discipline](06-moteurs-disciplines.md) | 7 StrengthEngine · 8 RunningEngine · 9 CrossTrainingEngine · 10 HyroxEngine |
| 07 | [Génération de séance, DurationEngine, DuplicateDetectionEngine](07-seance-duree-doublons.md) | pipeline de séance · 12 · 13 |
| 08 | [ProgressionEngine, feedback, AdaptationEngine](08-progression-adaptation.md) | 14 · 15 |
| 09 | [SessionValidator, RepairEngine, gouvernance des règles, sécurité](09-validation-repair-regles.md) | 16 · 17 · **remise en question de C3** |
| 10 | [Reason codes, versioning, observabilité, IA](10-reason-codes-versioning-observabilite-ia.md) | 18 · 19 · 21 · 22 |
| 11 | [Stratégie de tests](11-tests.md) | 20 |
| 12 | [Exemple complet : musculation + HYROX + course, 5 séances](12-exemple-complet.md) | Raisonnement de bout en bout |
| 13 | [Risques, décisions techniques, points à définir, **statut des décisions**](13-risques-decisions.md) | 23 · 24 · 25 · liste numérotée |
| — | [CHANGELOG V1 → V1.1](CHANGELOG.md) | Arbitrages de la revue |

## Ce que cette spécification change par rapport à la phase 1

| Point de phase 1 | Changement | Pourquoi |
|------------------|------------|----------|
| Doc 04 §3.2 : `WeeklyLoadEnvelope`, qui fixait une borne hebdomadaire par dimension (8 dimensions) | **Remplacé** par la classification LOAD / STATE / CONSTRAINT / CONTEXT / DERIVED (doc [04](04-charge-athlete-state.md)). Seules 5 limites sont retenues, chacune justifiée | 8 budgets imposaient des limites sans fondement suffisant pour plusieurs dimensions (C6 révisé) |
| Doc 04 §4.2 : statuts de relecture `draft / internal_review / expert_approved / deprecated` et blocage du build | Statuts : **`draft / reviewed / approved / deprecated`**. Politique de blocage du build : **matrice graduée par environnement + cliquet de sécurité G1** (doc [09](09-validation-repair-regles.md) §6, V1.2) | C3 révisé |
| Doc 04 §4.3 : hiérarchie de priorités | **Remplacée** par la hiérarchie A (admissibilité) / B (optimisation) / C (stabilité de replanification) (doc [01](01-architecture-pipeline.md) §5, V1.2) | La hiérarchie proposée mélangeait faisabilité (dure) et préférences (souples) |
| Doc 06 : tolérance de durée | **Précisée** : on distingue le temps disponible, la durée cible et la tolérance selon le profil de séance (doc [07](07-seance-duree-doublons.md) §3) | C8 |

Tout le reste de la phase 1 est conservé tel quel.

## Principes transverses de cette spécification

1. **Aucune pseudo-précision.** Tout seuil numérique est un **paramètre du ruleset** accompagné d'un niveau de confiance (`established`, `consensus`, `heuristic` ou `provisional`). Les valeurs citées dans ce document sont des **hypothèses de départ** à valider, jamais des vérités physiologiques.
2. **Une variable ordinale (faible / modéré / élevé) plutôt qu'un faux nombre** dès que la connaissance n'est pas plus fine que cela.
3. **Données insuffisantes ⇒ comportement conservateur et explicite.** Le moteur prescrit à l'effort perçu (RPE/RIR) plutôt qu'avec une charge ou une allure inventée, planifie un test, et le signale par un *reason code*.
4. **Le générateur propose, le validateur contrôle, le réparateur corrige**, avec un nombre borné de tentatives. En cas d'échec, le moteur renvoie une erreur explicite (`NO_VALID_SOLUTION`).
5. **Toute décision laisse une trace** sous forme de *reason codes* structurés, traduits ensuite en texte pour l'utilisateur.

## Gate d'architecture (V1.2)

Vérification de cohérence documentaire effectuée après la mise à jour V1.2 :
- références croisées : 232 vérifiées, 0 erreur (CHANGELOG §V1.2) ;
- les 45 décisions sont arbitrées (doc 13 §4) ;
- les nouvelles notions (`programStatus`, `eligibility`, `healthDataConsent`, `REST_RECOMMENDED`, `skipReason = safety_pause`, 8 structures, hiérarchie A/B/C, cliquet G1, CC1–CC11) sont définies une fois et référencées de façon cohérente par l'AthleteState, l'Exposure, le GlobalPlanner, l'InterferenceManager, les moteurs de discipline, le DurationEngine, le DuplicateDetectionEngine, le ProgressionEngine, l'AdaptationEngine, le SessionValidator, le RepairEngine, les rulesets, les tests et l'observabilité ;
- aucune contradiction architecturale bloquante.

**`TRAINING_ENGINE_SPEC_V1_2_ARCHITECTURE_GATE = PASS`**

Signification : **l'architecture technique du moteur peut commencer à être implémentée.**

Cela **ne signifie pas** :
- que les paramètres sportifs sont définitivement validés (ils restent provisoires, dans le ruleset) ;
- que les règles G1 (douleur, éligibilité, sécurité) sont approuvées médicalement ;
- que les règles G2 et G5 sont prêtes pour la production ;
- que l'application peut être commercialisée.

