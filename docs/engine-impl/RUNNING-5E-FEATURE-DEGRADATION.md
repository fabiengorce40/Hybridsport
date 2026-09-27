# RUNNING-5E-FEATURE-DEGRADATION — dégradations sûres des décisions non résolues

> **Phase 5E.** Pour chaque décision **non liée à la sécurité** et encore non résolue : comment V1 se dégrade **explicitement** (codes tracés, contrat 5C : jamais de séance partiellement invalide en silence), au lieu de tout bloquer. Les décisions G1 n’ont **pas** de dégradation : non signées, elles bloquent la production.

| Décision non résolue | Dégradation V1 | Code | Ce que l’athlète perd |
|---|---|---|---|
| E-PROG (V23) | Restauration jusqu’à `bestToleratedExposure` + HOLD ; baisse vers la dernière dose réussie | `PROG.HOLD_MAGNITUDE_UNDEFINED`, `PROG.RESTORE_TO_TOLERATED` | Pas de hausse au-delà du niveau toléré |
| E-QUALITY (V31) | Toute dose de qualité compte comme HD (défaut conservateur) | `DEMAND.DEFAULT_CONSERVATIVE` | Un peu de densité |
| E-LONG (V32) | Long run en HOLD ou en restauration ; LONG_RUN désignée comptée HD | `LONGRUN.HOLD_OR_RESTORE` | Progression du long run ; préparation marathon |
| E-PACE (V03, V04) | Cibles en RPE seul (aucune allure) | `TARGET.RPE_ONLY_PACE_UNDECIDED` | Précision d’allure |
| E-RECOVERY (V08) | Récupérations issues de l’historique seulement ; sinon aucune nouvelle structure | `RECOVERY.HISTORY_ONLY` | Structures nouvelles |
| E-LOAD (V22) | P-R1 : aucune hausse au-delà du contexte ; P-R0 déjà hors V1 | `LOAD.GUARDRAIL_UNDECIDED_HOLD` | Progression P-R1 |
| E-TAPER (V27 application, V28) | Seule la dernière semaine est traitée ; le volume reste dans l’intervalle 41–60 % de réduction ; **sélection par l’utilisateur ou le planificateur**, sans valeur choisie par le moteur | `TAPER.SELECTION_UNDECIDED` | Taper optimisé |
| E-FIRST (V35–V37) | Pas de première exposition : seulement EASY, STRIDES et TEST pour ces athlètes | `PRESCRIPTION_BLOCKED_BY_PARAMETER(V35/V36/V37)` | Introduction du seuil, du sévère et des côtes |
| E-MODEL (V38) | Pas d’extrapolation : calibration demandée (contre-la-montre ou course à la distance visée) | `PERF.EXTRAPOLATION_MODEL_UNDEFINED`, `REF.CALIBRATION_REQUIRED` | Allure spécifique sans calibration |
| E-VARIABILITY (V42, V43, V15) | Conflit toujours MAJOR (estimation prudente) ; mises à jour seulement sur performance ou test | `REF.CONFLICT_CONSERVATIVE_DEFAULT` | Mises à jour sur observations |
| Allure seuil exacte | Plage large ou RPE | `TARGET.BROAD_OR_RPE` | — |

**Aucune dégradation n’est possible** (bloquants d’implémentation) : E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD et les 4 G1.
