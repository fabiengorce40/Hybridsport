# CORE-EXT-R1-APPROVAL-PACK — dossier d’approbation (séance de course structurée)

> **Phase 5G (dossier).** **Phase 6A : `CORE_EXT_R1_FOUNDER_APPROVAL = APPROVED`** (Q1 = D, Q2 = stocker + vérifier + `UNAVAILABLE_LEGACY`, Q3 = règle exclusive ; drapeaux de capacité et éligibilité à la production approuvés comme principe). Aucun paramètre scientifique, aucune décision experte, aucune politique G1, ni V33 ni V34 ne sont approuvés par cette décision. Implémentation : [`CORE-EXT-R1-IMPLEMENTATION.md`](CORE-EXT-R1-IMPLEMENTATION.md). RFC complète : [`CORE-EXT-R1-RUNNING-INTERVALS-RFC.md`](CORE-EXT-R1-RUNNING-INTERVALS-RFC.md).

| Rubrique | Contenu |
|---|---|
| **Problème** | Running V1 exige des séances structurées : échauffement, blocs successifs, séries × répétitions, récupérations (y compris entre séries, avec un mode), cibles en plages (allure, RPE, FC), domaine, et un fonctionnement sans montre |
| **Limite actuelle du CORE** | `distance` et `intervals` ont une plage d’allure, mais **ni RPE, ni FC, ni domaine, ni séries, ni récupération entre séries, ni mode de récupération, ni blocs multiples** dans un item |
| **Schéma proposé** | Nouvelle variante `run_structure` de `zPrescription`, à **profondeur fixe** : liste de segments (`warmup`, `preparation`, `repeat` [séries × répétitions], `steady`, `cooldown`) ; `RunningTarget` = domaine obligatoire + plages facultatives (allure, RPE ou descripteur, FC) + priorité ; au moins l’effort ou l’allure ; FC jamais requise |
| **Rétrocompatibilité** | Additive : `distance`, `timed` et `intervals` inchangés ; aucune donnée existante modifiée |
| **Validation** | Règles 1–8 de la RFC + règle d’intégration n° 1 (ci-dessous) |
| **Durée** | Estimations dérivées (travail, total) ; décision n° 2 |
| **Migration** | `session_record` v3 → v4 : identité pour les données existantes ; un lecteur v3 refuse une donnée v4 (même motif que v2 → v3) |
| **Rejeu** | Estimations stockées avec leur provenance, recalculées et comparées (décision n° 2) |
| **Implications UX** | Liste linéaire de segments ; une case par (segment, série, répétition) ; minuteur par déroulement ; reprise par une adresse sur 4 entiers ; répétition en distance validée par un tour manuel |

## Trois points d’intégration : recommandations de conception

### Question 1 — Répétition en distance sans plage d’allure (durée inconnue, contrainte CORE stricte)

| Option | Évaluation |
|---|---|
| A — exiger une estimation de durée avant qu’une proposition soit valide | Compatible avec la contrainte stricte ; ne dit pas **d’où** vient l’estimation |
| B — accepter une durée inconnue, mais interdire la validation finale | La séance ne peut jamais être placée ; complexité inutile |
| C — estimation par l’effort seul | **Rejetée** : l’effort ne donne pas de vitesse ; ce serait inventer une allure |
| D — une dose en distance n’est autorisée que si une **plage d’allure existe** (celle de la cible, ou une plage **observée** de l’athlète pour ce domaine, avec sa provenance) ; sinon la répétition **doit** être exprimée en durée | Compatible avec le CORE ; aucune allure inventée ; cohérent avec NO_WEARABLE (répétitions à la durée) |

**Recommandation : D** (qui applique A avec une source explicite). Règle de validation : `repeat.work` en distance sans plage d’allure disponible ⇒ refus.

### Question 2 — Estimations de durée : stockées ou recalculées ?

| Critère | Stockées seulement | Recalculées seulement | **Stockées + vérifiées** |
|---|---|---|---|
| Déterminisme | Aucune vérification | Oui | Oui (le recalcul avec les mêmes versions doit donner la même valeur) |
| Versions du ruleset | Figées | Dérivent si les règles changent | Figées + provenance (moteur, ruleset, méthode) |
| Historique | Préservé | Peut changer rétroactivement | Préservé |
| Analytique | Stable | Instable | Stable |
| Migration | — | — | v3 : estimations **indisponibles**, jamais reconstruites (même doctrine que l’empreinte) |
| Rejeu | Pas de contrôle | Dépend de la version | Rejeu contrôlé |

**Recommandation : stocker avec provenance, recalculer à la validation, et refuser tout écart.**

### Question 3 — Échauffement et retour au calme : segments internes ou blocs séparés ?

| Critère | Segments internes | Blocs CORE séparés |
|---|---|---|
| UX | Une seule séance de course, lisible | Séance morcelée |
| Minuteur, cases, reprise | Un seul espace d’adresses | Plusieurs espaces |
| Durée | Estimations internes | Planchers `minDurationS` existants |
| Analytique | Par séance, direct | Agrégation nécessaire |
| HYROX futur | — | Naturel (échauffement partagé entre stations) |

**Recommandation : règle exclusive**
- séance de course pure : **segments internes** ;
- séance multidiscipline (HYROX, course + renforcement) : **blocs séparés**, sans segments `warmup` / `cooldown` dans `run_structure` ;
- la validation interdit le double échauffement ;
- `reduce_run_volume` réduit d’abord l’échauffement et le retour au calme au-dessus du plancher, dans les deux cas.

## Plan de tests (résumé)

- Cas T-CORE-01 à T-CORE-10 du plan 5B : sérialisation, exclusivités, `betweenSetRecovery`, cible sans effort ni allure, effort seul accepté, estimations incohérentes, lecteur v3 contre donnée v4, migration par identité, levier, plafond easy.
- **Plus** :
  - distance sans plage refusée (Q1) ;
  - estimations stockées ≠ recalculées ⇒ refus (Q2) ;
  - double échauffement refusé (Q3) ;
  - rejeu déterministe ;
  - empreinte du CORE (F20) mise à jour de façon explicite et motivée ;
  - mutation ciblée, sur le modèle des phases 4F / 4G.

## Modes d’échec et retour arrière

| Mode d’échec | Parade |
|---|---|
| Lecteur ancien qui ignore la variante | Montée de version v4 : refus explicite |
| Estimations divergentes | Vérification à la validation |
| Allure inventée | Q1-D |
| Régression de Strength | Suites Strength intactes ; aucun changement de ses prescriptions |

**Retour arrière** : la variante étant **additive**, la retirer revient à désactiver l’émission de `run_structure` par le moteur. Les données v4 existantes restent lisibles par un lecteur v4. Aucune migration descendante des données n’est prévue : les données v4 ne sont pas converties en v3, elles sont conservées.

---

**CORE_EXT_R1_DESIGN_RECOMMENDATION = READY_FOR_FOUNDER_APPROVAL** (Claude n’approuve pas).

**Phase 6A : approuvée par le fondateur, puis implémentée** (voir [`CORE-EXT-R1-TEST-REPORT.md`](CORE-EXT-R1-TEST-REPORT.md) pour le statut des gates).
