# RUNNING-5F-FEATURE-MATRIX — séances par périmètre

> **Phase 5F.** Statuts : SUPPORTED · SUPPORTED_DEGRADED · BLOCKED · OUT_OF_SCOPE. Chaque BLOCKED est expliqué. Les séances structurées supposent **CORE-EXT-R1 approuvée puis implémentée** dans les trois périmètres.

| Séance | SCOPE A | SCOPE B | SCOPE C |
|---|---|---|---|
| EASY (dont `LOW_DOSE_RECOVERY`) | SUPPORTED | SUPPORTED | SUPPORTED (y compris course / marche P-R0 si V33 est signée) |
| LONG | SUPPORTED_DEGRADED (HOLD ou restauration ; toujours HD) | SUPPORTED_DEGRADED (progression selon E-PROG ; pas de maximum produit décidé) | SUPPORTED (E-LONG) |
| THRESHOLD | SUPPORTED_DEGRADED (depuis l’historique ; RPE seul ; **BLOCKED** en première exposition) | SUPPORTED | SUPPORTED |
| VO2 / SEVERE | SUPPORTED_DEGRADED (historique ; RPE ; **BLOCKED** en première exposition) | SUPPORTED | SUPPORTED |
| SHORT_INTERVAL | SUPPORTED_DEGRADED (idem) | SUPPORTED | SUPPORTED |
| HILLS | SUPPORTED_DEGRADED (historique + côte déclarée ; **BLOCKED** en première exposition) | SUPPORTED (RPE par conception, sans pente universelle) | SUPPORTED |
| RACE_PACE | SUPPORTED_DEGRADED (RPE seul ; pas d’allure : E-PACE non décidé) | SUPPORTED (≤ semi ; allure par référence ou Riegel) | SUPPORTED_DEGRADED pour le marathon (allure par calibration seulement) ; SUPPORTED ≤ semi |
| TEST | SUPPORTED (jamais maximal pour P-R0) | SUPPORTED | SUPPORTED |
| STRIDES (module) | SUPPORTED | SUPPORTED | SUPPORTED |
| PROGRESSION_RUN | OUT_OF_SCOPE (au catalogue, non sélectionné en V1) | OUT_OF_SCOPE | OUT_OF_SCOPE |

## Explication des BLOCKED

| Cas | Raison | Débloqué par |
|---|---|---|
| Première exposition THRESHOLD / VO2 / SHORT / HILLS (SCOPE A) | V35, V36 et V37 vides : aucune dose d’initiation décidée ; le moteur n’invente pas de dose | E-FIRST (SCOPE B et C) |

Aucun autre BLOCKED : les autres limites sont des dégradations tracées ou des exclusions de périmètre.
