# RUNNING-V1-IMPLEMENTATION-WAVES — séquence d’implémentation proposée (non exécutée)

> **Phase 5G : proposition.** Dépendances vérifiées et séquence ajustée. **Aucune implémentation.** Chaque vague aura sa propre gate technique, sur le modèle des phases Strength 4A–4G.

| Vague | Contenu | Pré-requis | Ajustement 5G |
|---|---|---|---|
| **0** | CORE-EXT-R1 : schéma `run_structure`, `session_record` v4 et migration, validation (règles 1–8 + Q1), estimations stockées et vérifiées (Q2), règle échauffement / retour au calme (Q3), `reduce_run_volume`, empreinte F20 mise à jour de façon motivée, tests et mutation | **Approbation du fondateur** | — |
| **1** | Fondations : types, références (récence injectée), confiances, `SessionEligibilityDecision`, domaines et cibles, codes de raison, registre des paramètres Running typé (statuts, provenance, maturité), `RunningProductionEligibility`, **drapeaux de capacité**, sélection déterministe, **RecentLoadContext et LCA** | Vague 0 pour la sérialisation des cibles ; le modèle interne peut commencer en parallèle | **RecentLoadContext déplacé de la vague 4 à la vague 1** : le long run de base (restauration) en dépend dès la vague 2 |
| **2** | Prescriptions de base : EASY (et `LOW_DOSE_RECOVERY`), module STRIDES, TEST / calibration, LONG de base (HOLD ou restauration, si éligible) | Vagues 0 et 1 | — |
| **3** | Structures de qualité ancrées sur l’historique : THRESHOLD (continu ou fractionné), VO2 / SEVERE, SHORT_INTERVALS, HILLS, RACE_PACE ; premières expositions **derrière leurs drapeaux** | Vagues 0 à 2 | — |
| **4** | Composition hebdomadaire, densité et séparation, progression (restauration, HOLD, baisse ; au-delà de l’historique derrière son drapeau), séances manquées, reprise (états, UNKNOWN, ≤ réalisé), intégration GlobalPlanner / InterferenceManager (P-HYBRID derrière son drapeau) | Vagues 1 à 3 | L’intégration au planificateur est explicitement rattachée ici |
| **5** | Capacités verrouillées : marathon, taper, novice (P-R0), premier départ après une longue coupure, extrapolation, cibles d’allure ; **implémentées derrière leurs drapeaux**, activées seulement si éligibles | Vagues 1 à 4 + décisions humaines pour l’**activation** (pas pour le code) | — |

**Principe** : le **code** des vagues 1 à 5 peut être écrit avec des paramètres injectés et des drapeaux désactivés. L’**activation** dépend des décisions (voir [`RUNNING-V1-DECISION-DEPENDENCIES.md`](RUNNING-V1-DECISION-DEPENDENCIES.md)). Seule la vague 0 exige une approbation humaine avant d’écrire le code, car elle modifie le CORE verrouillé.
