# RUNNING-V1-CAPABILITY-FLAGS — drapeaux de capacité (conception, non implémentés)

> **Phase 5G.**
>
> - Un drapeau **désactivé** entraîne une dégradation explicite **ou** un `NO_VALID` explicite, avec son code de raison. **Jamais de prescription substituée en silence.**
> - Un drapeau ne peut être **activé en production** que si `RunningProductionEligibility` le déclare éligible ([`RUNNING-V1-PRODUCTION-ELIGIBILITY.md`](RUNNING-V1-PRODUCTION-ELIGIBILITY.md)).
> - L’activation manuelle d’un drapeau non éligible est **refusée en production** ; en mode CANDIDATE, elle est tracée.

| Drapeau | Décisions requises | Statut requis des paramètres | G1 requis | Comportement désactivé | Code de raison |
|---|---|---|---|---|---|
| `running.noviceEntry.enabled` | G1-NOVICE (politique = oui), V33 | V33 ≥ SAFETY_APPROVED | G1-NOVICE | P-R0 détecté ⇒ `NO_VALID` + redirection neutre ; aucun test maximal | `CAPABILITY.NOVICE_ENTRY_DISABLED` |
| `running.longReturn.enabled` | G1-RETURN (politique), V24, V34 | V24 et V34 ≥ SAFETY_APPROVED | G1-RETURN | Premier départ après LONG ou UNKNOWN sans donnée post-retour ⇒ `NO_VALID` + demande d’information ; après des séances post-retour : doses ≤ réalisé (déjà sous politique signée) | `CAPABILITY.LONG_RETURN_FIRST_DOSE_DISABLED` |
| `running.progressionBeyondHistory.enabled` | E-RECENTLOAD, E-PROG (option B ou C) | V23 (par variable) ≥ EXPERT_APPROVED | — | Restauration jusqu’à `bestToleratedExposure`, HOLD ou baisse | `PROG.HOLD_MAGNITUDE_UNDEFINED` |
| `running.longRunProgression.enabled` | E-LONG, E-PROG | Paramètres E-LONG ≥ EXPERT_APPROVED (maximum produit : PRODUCT_APPROVED si l’option B est retenue) | — | Long run en HOLD ou restauration | `LONGRUN.HOLD_OR_RESTORE` |
| `running.firstThresholdExposure.enabled` | E-FIRST (+ E-QUALITY si option C, E-RECOVERY) | V35 ≥ EXPERT_APPROVED | — | THRESHOLD sans historique ⇒ composant retiré, TEST proposé | `PRESCRIPTION_BLOCKED_BY_PARAMETER(V35)` |
| `running.firstSevereExposure.enabled` | E-FIRST, E-RECOVERY | V36, V37 ≥ EXPERT_APPROVED | — | VO2 / SHORT / HILLS sans historique ⇒ composant retiré | `PRESCRIPTION_BLOCKED_BY_PARAMETER(V36/V37)` |
| `running.marathon.enabled` | E-LONG, E-TAPER (volet marathon) | Paramètres E-LONG et V28m ≥ EXPERT_APPROVED | — | Objectif marathon ⇒ programmation générale en HOLD ou restauration, **sans prétention de préparation marathon**, avec message ; ou `NO_VALID` si l’utilisateur exige un plan marathon | `CAPABILITY.MARATHON_DISABLED` |
| `running.performanceExtrapolation.enabled` | E-MODEL (+ E-VARIABILITY) | V38 ≥ EXPERT_APPROVED (provenance de l’exposant vérifiée) | — | Calibration demandée | `PERF.EXTRAPOLATION_MODEL_UNDEFINED` |
| `running.taper.enabled` | E-TAPER | V27 (règle de sélection), V28 ≥ EXPERT_APPROVED | — | Dernière semaine ; volume dans l’intervalle 41–60 % de réduction ; **sélection par l’utilisateur ou le planificateur** | `TAPER.SELECTION_UNDECIDED` |
| `running.paceTargets.enabled` | E-PACE (+ E-VARIABILITY si option B) | V03, V04 ≥ EXPERT_APPROVED | — | Cibles en RPE seul | `TARGET.RPE_ONLY_PACE_UNDECIDED` |
| `running.hybridPlanning.enabled` | Intégration technique GlobalPlanner / InterferenceManager | — | — | Profil P-HYBRID ⇒ `NO_VALID` (pas de planification multisport sans le planificateur) | `CAPABILITY.HYBRID_PLANNER_UNAVAILABLE` |

**Total : 11 drapeaux.** Le socle (4 G1, E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD, CORE-EXT-R1) n’a pas de drapeau : sans lui, **aucune** production n’est possible.
