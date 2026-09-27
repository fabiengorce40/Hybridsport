# Phase 4E — STRENGTH SCIENTIFIC RULESET V1 : rapport d’implémentation

> Intégration scientifique, provenance, incertitude et migration contrôlée. **Aucune valeur existante n’est modifiée**, les 7 écarts validés en 4C sont conservés, le CORE n’est pas modifié, et le RunningEngine n’est pas commencé.

## 1. Résultat des gates

| Gate | Résultat | Fondement |
|---|---|---|
| STRENGTH_SCIENCE_INTEGRATION_GATE | **PASS** | Voir le détail ci-dessous. |
| STRENGTH_SCIENTIFIC_V1_GATE | **PASS_PROVISIONAL** | Calculé par `scientificGate` : 0 anomalie, 60 blocages PRODUCTION (4 visas G1, 34 valeurs provisoires, 17 sources non lues, 5 identités partielles). |

Critères du gate STRENGTH_SCIENCE_INTEGRATION_GATE, tous vérifiés par des tests :

- provenance complète (K1) ;
- aucune fausse précision ni statut incohérent (K2, `validateScienceRegistry`) ;
- versionnement et reproductibilité (K20, goldens 0.2.0 identiques octet pour octet) ;
- diff S1–S7 complet et attribué (test « aucun changement sportif inexpliqué ») ;
- tests, typecheck, lint et architecture verts ;
- aucun G1 promu (K3).

Pourquoi PASS_PRODUCTION reste impossible :

- aucune valeur n’a de validation formelle ;
- les 4 G1 n’ont pas de visa de sécurité ;
- 17 sources citées ne sont connues que par des résumés de recherche (5 d’entre elles ont une identité partielle).

## 2. Vérification des sources : limite déclarée

Les 21 sources demandées ont été vérifiées par recherche web.

- **Identité** : 14 sources `CONFIRMED`, 7 `PARTIAL`.
- **Contenu** : `SEARCH_SUMMARY` pour toutes les sources.
  - PubMed, E-utilities, Europe PMC et les sites des éditeurs étaient **bloqués par la politique réseau** de l’environnement d’exécution.
  - Aucun résumé officiel ni texte intégral n’a donc été lu.
- **Garde-fous appliqués** :
  - aucun DOI, PMID, auteur ni résultat n’a été inventé ;
  - les initiales et coauteurs non vérifiés sont omis ;
  - les titres non vérifiés sont remplacés par une description entre crochets.
- **Sources non citées (4 sur 21)** :
  - Currier 2026 (Position Stand ACSM) et Currier 2023 (méta-analyse en réseau) : vérifiées, mais aucune recommandation ni estimation n’a pu être extraite des résumés consultés ; elles ne portent donc aucune revendication ;
  - Chen 2024 : titre exact et résultats non vérifiés ;
  - PMID 39593476 (échauffement lourd) : identité partielle, contenu inconnu. Aucune revendication ne s’y appuie, et un test le vérifie.
- **Pour lever la limite** : autoriser `pubmed.ncbi.nlm.nih.gov`, `eutils.ncbi.nlm.nih.gov` et `europepmc.org` dans l’accès réseau de l’environnement, puis relire en texte intégral (blocage `SOURCE_NOT_READ`).

## 3. Fichiers

### Moteur (`packages/strength/src/`)

| Fichier | Changement |
|---|---|
| `params.ts` | `STRENGTH_OPTIONAL_PARAMETER_SCHEMAS` : 8 paramètres facultatifs versionnés. Absents : sémantique 0.2.0. Présents : validés et tracés, et refusés s’ils sont mal formés. Préflight CORE `optional: true`. |
| `confidence.ts` | **Nouveau** : PrescriptionConfidence ordinale (`assessMeasured`, `assessDeclared`, `assessTransferred`). |
| `load.ts` | Confiance ordinale si le paramètre est présent. Hiérarchie de référence : `specificObservation` avant l’e1RM générique. Traces `DOSE.LOAD.CONFIDENCE` et `DOSE.LOAD.FROM_SPECIFIC`. |
| `interference.ts` | InterferenceAssessment ordinale (`assessNeighborStructure`), actions graduées (`rirOnly`), signaux VERY_HIGH. La règle binaire 0.2.0 est conservée à l’identique quand le paramètre est absent. |
| `dose.ts`, `model.ts` | Ajustement « RIR seulement » (MODERATE) ; `Env.rirOnly`. |
| `engine.ts` | Priorités de durée : échauffement supplémentaire puis retour au calme après les optionnels, repos du principal réduit en dernier. `PLAN.INTERFERENCE_SIGNAL` si recouvrement structurel. `DATA.SCIENCE_REGISTRY`. Moteur `0.2.0`. |
| `rampup.ts` | Montée d’une charge suggérée choisie selon l’intensité relative (`strength.rampup.estimatedPolicy`). |
| `selection.ts` | Répétition au niveau novice (`strength.selection.repetitionPolicy`) : la récence préfère la famille la plus récente. |
| `progression.ts` | `strength.tracks.horizon = review` : plus de clôture `max_weeks`. `anchorReviewDue` émet `PROGRESSION.REVIEW_DUE`. |
| `personal-load-model.ts` | **Nouveau** : contrat `PersonalLoadModel` et `LOAD_REFERENCE_HIERARCHY`, sans implémentation ni ML. |
| `codes.ts` | 6 codes : `DOSE.LOAD.CONFIDENCE`, `DOSE.LOAD.FROM_SPECIFIC`, `PLAN.INTERFERENCE_ASSESSED`, `PLAN.INTERFERENCE_SIGNAL`, `PROGRESSION.REVIEW_DUE`, `DATA.SCIENCE_REGISTRY`. |
| `science/` | **Nouveau** : registre 1.0.0, avec `types`, `sources` (21), `principles` (13), `provenance` (37 paramètres), `validate` (validation, promotion, préparation PRODUCTION, gate). |

### Tests

| Fichier | Contenu |
|---|---|
| `tests/unit/science.test.ts` | K1–K20, propriétés et relations métamorphiques, capacités déclarées, paramètres facultatifs mal formés (25 tests). |
| `tests/golden/science-candidate.test.ts` | Goldens S1–S7 du ruleset candidat (`__goldens_v1__/`). |
| `tests/golden/science-docs.test.ts` | Génération des documents et test d’attribution du diff. |
| `tests/fixtures/ruleset.ts` | `STRENGTH_SCIENCE_CANDIDATE_VALUES`, `strengthScientificRulesetDocument`. Le ruleset 0.2.0 est intact. |
| `tests/fixtures/science.ts`, `tests/fixtures/science-diff.ts` | Ruleset candidat ; calcul du diff et table `ATTRIBUTIONS`. |
| `tests/property/fuzz-metamorphic.test.ts` | Mêmes invariants de fuzz (120 scénarios) avec le ruleset candidat. |
| `tests/architecture/strength-architecture.test.ts` | Paramètres facultatifs déclarés. Registre exclu du contrôle « paramètre mort », sinon ce contrôle deviendrait vide de sens. |

### Documents (`docs/engine-impl/`)

| Livrable | Fichier |
|---|---|
| N1 | `STRENGTH-SCIENTIFIC-RULESET-V1.md` (généré) |
| N2 | `STRENGTH-SCIENCE-REGISTRY-V1.md` (généré) |
| N3 | `STRENGTH-4E-BASELINE-DIFF.md` (généré, attribué) |
| N4 | ce rapport |
| N5 | `STRENGTH-PRESCRIPTION-CONFIDENCE-V1.md` (généré) |
| N6 | `STRENGTH-INTERFERENCE-ASSESSMENT-V1.md` (généré, matrice complète) |

Les documents générés sont vérifiés par un test : ils ne peuvent pas diverger du code.

## 4. Modifications du CORE

**Aucune.** `git diff` sur `packages/engine` et `packages/domain` est vide depuis la phase 4C.

- **Préflight** : le préflight du CORE supportait déjà les paramètres facultatifs (`CoreParameterSpec.optional`).
- **PrescriptionConfidence** : ne demandait aucune extension du CORE (confiance calculée et tracée dans le moteur).
- **Priorités de durée** : aucune modification du CORE. L’audit montre que :
  - les optionnels ne sont ajoutés que s’ils tiennent, donc ne déclenchent jamais de compression ;
  - le CORE interdit `reduce_rest` sur le principal ;
  - la montée n’est jamais réduite ;
  - l’écart restant (repos du principal réduit avec les autres par le moteur) est corrigé dans le moteur, sous politique versionnée.

**CORE-EXT-5 (proposée, non implémentée)** : plages de RIR.

- **Besoin** : le principe P4 demande des plages de RIR, mais `zEffort.rir` est un nombre unique.
- **Extension minimale** : `rir: number | { min: number; max: number }` dans `zEffort` (CORE-EXT-1).
- **À adapter** :
  - le validateur de cohérence d’intensité (STR-V3 prend la borne basse, la plus proche de l’échec) ;
  - la migration `session_record` v3 → v4 ;
  - le rendu.
- **Décision** : laissée à la validation humaine.

## 5. Paramètres

| Catégorie | Nombre | Détail |
|---|---|---|
| Valeurs modifiées | **0** | — |
| Reclassés (valeur conservée, statut précisé) | 12 | `session.mobility`, `axialHighMaxPerSession` (garde-fou produit), `dose.base`, `dose.modifiers` (décharge), `load` (Epley et `pctByRepsToFailure` = repli d’amorçage), `calibration`, `rampup`, `progression` (0,15 / 0,10 / 2 / 3 = heuristiques), `tracks` (semaines = horizon de revue), `volume` (10–20 n’est pas une frontière ; 0,5 = approximation fractionnaire), `volume.sessionCap` (garde-fou produit + visa sécurité), `interference` (36 h réservé au 0.2.0) |
| Nouvelles politiques (facultatives) | 8 | `science.registryVersion`, `prescriptionConfidence`, `load.specificObservation`, `interference.assessment`, `rampup.estimatedPolicy`, `selection.repetitionPolicy`, `tracks.horizon`, `session.durationPriority` |
| Inchangés | 17 | — |

Statuts des 37 paramètres :

- 17 `PROGRAMMING_HEURISTIC` ;
- 11 `EXPERT_DESIGN_REVIEW` ;
- 4 `SAFETY_SIGNOFF_REQUIRED` ;
- 2 `PRODUCT_GUARDRAIL` ;
- 3 `TECHNICAL` ;
- **aucun `SUPPORTED`** : seuls des mécanismes le sont (P1, P2, P3 au niveau des principes).

**Heuristiques restantes** : toutes les valeurs numériques sportives. En particulier :

- cellules de dosage, bornes hebdomadaires, poids 0,5 ;
- fractions de progression, paliers de montée, décharge ;
- seuils de la PrescriptionConfidence (2 séances, 4 observations) ;
- tolérances d’observation spécifique (± 1 rep, ± 1 RIR) ;
- matrice d’interférence (bandes 12/24/48 h, fenêtre 72 h, deltas) ;
- durées d’échauffement et de retour au calme.

**G1 bloqués (visa de sécurité requis)** :

- `strength.selection.skillCeiling` ;
- `strength.novice.technicalUnderFatigue` ;
- `strength.volume.sessionCap` ;
- `strength.maxEffort.threshold`.

Pour ces quatre paramètres, `promoteParameter` refuse toute promotion sans visa formel, et la validation signale `G1_PROMOTED_WITHOUT_SIGNOFF`.

## 6. S1–S7 : avant / après (détail dans N3)

| Séance | Changement effectif | Cause |
|---|---|---|
| S1 | Échauffement 5 → 3 min, retour au calme retiré ; le temps libéré ajoute les élévations latérales (épaules 1,5 → 4,5) | politique de durée |
| S2 | Développé couché et tirage vertical : 70 et 55 kg **suggérés** (confiance MEDIUM, une séance) ; retour au calme retiré ; Pallof ajouté, pec deck retiré (pectoraux 5 → 2) | confiance ordinale ; politique de durée |
| S3 | Charnière principale RIR 3 → 5 (hanche MODERATE : effort seulement) ; genou VERY_HIGH ⇒ signal au planificateur | interférence graduée |
| S4 | Fente marchée principale RIR 3 → 5 (genou MODERATE) | interférence graduée |
| S5 | Squat inchangé (HIGH : 2 séances, 6 séries cohérentes). RDL 120 kg **suggéré** par l’observation spécifique (120 × 8 à RIR 2), montée relative à 2 paliers. Leg curl 50 kg suggéré. | hiérarchie de référence ; confiance |
| S6 | Repos du squat 90 → 120 s (repos du principal réduit en dernier) ; retour au calme et échauffement supplémentaire omis | priorités de durée |
| S7 | Développé couché 85 kg **suggéré** (une séance), montée relative à 2 paliers | confiance ordinale |

Durées p50 (avant → après) :

| S1 | S2 | S3 | S4 | S5 | S6 | S7 |
|---|---|---|---|---|---|---|
| 40 → 39 | 51 → 48 | 28 → 28 | 34 → 34 | 59 → 57 | 23 → 24 | 51 → 50 |

Aucune omission de séance requise ; ancres S5 inchangées.

## 7. Points soumis à la validation humaine (non tranchés)

1. **Assouplissement entre 24 et 36 h** : une voisine clé à demande haute y passe de l’ajustement complet (0.2.0) à MODERATE (RIR seulement).
   - Entre 36 et 48 h, elle passe d’aucun ajustement à MODERATE.
   - C’est le prix d’une échelle graduée ; les bandes sont des heuristiques.
2. **MODERATE applique le `rirDelta` complet de la structure (+2)**. Une ampleur intermédiaire exigerait une nouvelle valeur, non créée ici.
3. **S2** : l’ordre existant des étapes d’optionnels (emplacements avant exercices supplémentaires) fait passer le tronc avant le 2ᵉ exercice d’isolation, et le volume pectoraux baisse.
4. **Répétition novice** : limitée au niveau `novice`. Faut-il l’étendre au niveau débutant ?
   - L’alternance A/B des groupes de choix (validée en 4C) est conservée, car elle est systématique.
5. **Montée d’une charge suggérée** : paliers en relatif plafonnés à 0,7.
6. **CORE-EXT-5** (plages de RIR) : à décider.

## 8. Tests, couverture, régressions

- **Totaux** : 560 tests verts sur 52 fichiers (CORE 370, strength 190 ; +35 depuis la phase 4C). Typecheck, lint et architecture verts.
- **Correspondance K1–K20** : un test nommé par exigence dans `science.test.ts`.
- **Propriétés** :
  - monotonie de l’interférence (plus proche, plus exigeante ou plus importante ⇒ jamais plus faible), symétrie avant / après ;
  - la confiance n’augmente jamais en ajoutant une observation incohérente ou en retirant le RIR, et ne dépend pas de l’ordre des observations ;
  - retrait politique par politique ⇒ comportement 0.2.0 du domaine concerné ;
  - fuzz complet (120 scénarios) sous le ruleset candidat.
- **Couverture** : tous fichiers 94,6 % instructions, 86,0 % branches, 98,0 % lignes ; strength 96,3 % instructions, 86,5 % branches, 98,8 % lignes.
- **Régressions** : aucune. Les goldens 0.2.0 et leurs assertions sont inchangés ; le fuzz, la simulation longitudinale et l’anti-biais restent verts.
- **Mutation** : non relancée en 4E (dette technique).

## 9. Dette

**Scientifique**

- Lecture intégrale des 17 sources citées (`SOURCE_NOT_READ`) ; identités partielles à compléter (7, dont 5 citées).
- Extraction des recommandations de la Position Stand ACSM 2026 et des estimations de Currier 2023, pour les rattacher aux principes.
- Transposition des sources (majoritairement jeunes hommes) aux femmes, aux seniors et aux sportifs d’endurance.
- Précision du RIR selon l’expérience et selon l’éloignement de l’échec : non modélisée.
- Réponse individuelle au volume ; dose axiale cumulée ; décharge contextuelle.
- Durées de repos pour la force (Grgic 2018) à confirmer en texte intégral ; aucune valeur n’en est tirée.

**Technique**

- `strength.calibration.mediumAfterExposures` / `highAfterExposures` : déclarés mais lus par aucun code depuis 4B ; remplacés en V1 sans être modifiés.
- Catalogue de test sans paires équivalentes transférables : le transfert n’est testé qu’au niveau unitaire.
- `anchorReviewDue` et `PersonalLoadModel` : contrats non encore branchés sur un ProgressionEngine ou un modèle réel.
- CORE-EXT-5 (plages de RIR) et `perSide` (unilatéral), à arbitrer.
- Mutation Stryker à relancer sur les nouveaux modules.

## 10. Versionnement et migration

- **Traçabilité d’une séance historique** : elle garde
  - `rulesetVersion` ;
  - `engineVersion` (0.2.0) ;
  - la version du registre (`DATA.SCIENCE_REGISTRY` dans les raisons, `strength.science.registryVersion` dans `parametersUsed`) ;
  - la graine et les raisons.
- **Reproduire une séance 0.2.0** : même ruleset 0.2.0 et moteur 0.2.0, avec un résultat identique au moteur 0.1.0 (goldens inchangés).
- **Migration** : aucune migration de données requise. Le schéma `session_record` est inchangé ; le ruleset candidat est un nouveau document versionné qui n’écrase pas l’ancien.
