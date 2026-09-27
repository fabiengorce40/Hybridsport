# RUNNING-V1-MINIMUM-SCIENTIFIC-SCOPE — périmètre scientifique minimal de V1

> **Suite 5F** : ce périmètre correspond au SCOPE A de [`RUNNING-5F-SCOPE-OPTIONS.md`](RUNNING-5F-SCOPE-OPTIONS.md) ; les SCOPES B et C y sont définis.

> **Phase 5E.** **RUNNING_V1_MINIMUM_SCIENTIFIC_SCOPE** = ce que V1 peut prendre en charge si **seul l’ensemble minimal** est décidé :
> - 4 G1 : PAIN, SCOPE, RETURN (frontières et UNKNOWN), NOVICE (règle de périmètre) ;
> - E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD.
>
> Toutes les autres décisions sont dégradées ([`RUNNING-5E-FEATURE-DEGRADATION.md`](RUNNING-5E-FEATURE-DEGRADATION.md)). **Toutes les populations ne sont pas forcées dans V1.**

| Profil | Avec l’ensemble minimal seul | Limites | Décision qui élargirait |
|---|---|---|---|
| P-R1 course générale | **PARTIEL** : EASY, STRIDES, TEST ; HOLD ou restauration ; aucune hausse au-delà du toléré | E-LOAD (garde-fou P-R1) non décidé ⇒ pas de hausse ; confort limité | E-LOAD, E-PROG |
| P-R2 5K | **OUI (dégradé)** si l’athlète a un historique de qualité ; sinon EASY + TEST | Premières expositions bloquées ; cibles RPE si E-PACE n’est pas décidé | E-FIRST, E-PACE |
| P-R2 10K | **OUI (dégradé)**, idem | idem | idem |
| P-R3 10K | **OUI (dégradé)** : seuil et sévère depuis l’historique ; HOLD ou restauration | Pas de nouvelle hausse | E-PROG |
| P-R3 semi | **PARTIEL** : allure semi seulement avec un semi récent (sinon calibration) ; taper limité à la dernière semaine, sélection laissée à l’utilisateur | E-MODEL, E-TAPER | E-MODEL, E-TAPER, E-LONG |
| Marathon | **NON** | Progression du long run, taper marathon, allure marathon (Riegel exclu) | E-LONG, E-TAPER, E-PROG |
| P-HYBRID | **CONDITIONNEL** : même périmètre que le niveau de course, sous réserve de l’intégration technique au GlobalPlanner et à l’InterferenceManager | Dépendance technique | — (technique) |
| P-R0 novice | **NON** (règle de périmètre signée : détection, pas de test maximal, redirection) | V33 vide | G1-NOVICE (structure + dose) |
| Reprise longue | **PARTIEL** : NO_VALID au premier départ ; ensuite doses ≤ réalisé post-retour, RPE seul | V34 vide | G1-RETURN (V34) |
| Reprise UNKNOWN | **PARTIEL** : structure conservatrice + demande d’information ; NO_VALID sans séance post-retour | — | — |

**Périmètre minimal** : P-R2 et P-R3 (5K, 10K) et P-R1 course générale, avec un historique suffisant pour les séances de qualité. Le semi est partiel ; le marathon, P-R0 et le premier départ après une longue coupure sont hors du périmètre minimal.
