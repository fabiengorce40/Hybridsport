# Phase 5C — RUNNING CANDIDATE RULESET & GOLDEN PRESCRIPTIONS : rapport

> **Documentation seulement.**
>
> - **CORE UNCHANGED**
> - **STRENGTH UNCHANGED**
> - **CORE-EXT-R1 NOT IMPLEMENTED**
> - **RUNNING ENGINE CODE NOT STARTED**

## 1. État

| Contrôle | Avant | Après |
|---|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` | idem |
| HEAD | `30736c6` (fin 5B) | commit 5C (voir le rapport de fin de phase) |
| Tests | 630 verts sur 56 fichiers | 630 verts sur 56 fichiers |
| Typecheck / lint / architecture | verts | verts |
| CORE | LOCKED | LOCKED, aucun fichier modifié |
| Strength | technique LOCKED ; scientifique LOCKED_PROVISIONAL | inchangé |
| RUNNING_5A_SPEC_GATE / 5B gate / readiness | PASS / PASS / READY_FOR_RULESET_DESIGN | — |
| Fichiers modifiés | — | uniquement `docs/engine-impl/*.md` |

## 2. Livrables

| # | Fichier | Contenu |
|---|---|---|
| 1 | [`RUNNING-RULESET-V0.md`](RUNNING-RULESET-V0.md) | Ruleset candidat (B, E–Z) |
| 2 | [`RUNNING-PARAMETERS-V0.md`](RUNNING-PARAMETERS-V0.md) | 28 valeurs gouvernées, 13 paramètres vides bloquants |
| 3 | [`RUNNING-GOLDEN-PRESCRIPTIONS-V0.md`](RUNNING-GOLDEN-PRESCRIPTIONS-V0.md) | R1–R12, semaines et séances détaillées |
| 4 | [`RUNNING-GOLDEN-COMPARISONS-V0.md`](RUNNING-GOLDEN-COMPARISONS-V0.md) | C1–C8 + invariants I1–I20 |
| 5 | [`RUNNING-ADVERSARIAL-SCENARIOS-V0.md`](RUNNING-ADVERSARIAL-SCENARIOS-V0.md) | 20 scénarios |
| 6 | [`RUNNING-PARAMETER-SENSITIVITY-V0.md`](RUNNING-PARAMETER-SENSITIVITY-V0.md) | Sensibilité |
| 7 | [`RUNNING-G1-REVIEW-PACK.md`](RUNNING-G1-REVIEW-PACK.md) | 4 politiques ↔ 7 paramètres, fiches de signature |
| 8 | [`CORE-EXT-R1-RUNNING-INTERVALS-RFC.md`](CORE-EXT-R1-RUNNING-INTERVALS-RFC.md) | RFC finale : profondeur fixe |
| 9 | [`RUNNING-IMPLEMENTATION-CONTRACT-V0.md`](RUNNING-IMPLEMENTATION-CONTRACT-V0.md) | Contrat VALID / NO_VALID |
| 10 | `RUNNING-5C-REPORT.md` | Gates et rapport |

**Corrections B2 et B3 appliquées aux documents 5B et 5A** :
- `RUNNING-5B-SCIENTIFIC-ARBITRATION.md` §T ;
- `RUNNING-PARAMETER-REGISTRY-V0.md` (`unknownStateHandling`) ;
- `RUNNING-5C-FUTURE-TEST-PLAN.md` (T-RET-01, T-CONF-01) ;
- `RUNNING-5B-REPORT.md` ;
- `RUNNING-G1-CANDIDATE-REVIEW.md` ;
- `RUNNING-V1-REFERENCE-MODEL.md` §Z.3 ;
- `PHASE3-LOG.md`.

## 3. Gates

### RUNNING_5C_RULESET_GATE

| Critère | Statut | Preuve |
|---|---|---|
| Corrections 5B intégrées (B1–B4) | ✅ | Ruleset §B |
| Correspondance G1 résolue | ✅ | G1 pack §1 : 7 paramètres ↔ 4 politiques, aucun orphelin |
| UNKNOWN reste UNKNOWN | ✅ | Ruleset §X ; C6 ; I14 ; documents 5B corrigés |
| Éligibilité séparée de la confiance | ✅ | `SessionEligibilityDecision` (§G) ; C1 ; I3 |
| Ruleset candidat gouverné | ✅ | Ruleset V0 + paramètres V0 (chaque valeur a un statut, des modes d’échec et une provenance) |
| Aucun nombre non traçable | ✅ | Goldens : chaque nombre renvoie à un tag Vxx, à `IN:` ou à un calcul (I18) |
| R1–R12 prescrits ou explicitement BLOCKED | ✅ | 10 VALID, 2 NO_VALID (BLOCKED par paramètre G1) |
| ≥ 1 séance détaillée par scénario | ✅ | 12 sur 12 (R1 et R8 : structure, doses bloquées) |
| C1–C8 | ✅ | Comparaisons |
| I1–I20 | ✅ | Comparaisons §2 (cohérence sur le papier) |
| ≥ 15 scénarios adversariaux | ✅ | 20 |
| Sensibilité analysée | ✅ | 9 paramètres chiffrés HIGH_SENSITIVITY + 3 vides critiques |
| RFC CORE-EXT-R1 finalisée | ✅ | §8 : profondeur fixe |
| Aucun code RunningEngine | ✅ | `git diff` : docs seulement |
| CORE et Strength inchangés | ✅ | 630 tests verts ; empreinte F20 verte |

**RUNNING_5C_RULESET_GATE = PASS**

### RUNNING_RULESET_V0_STATUS

| Valeur | Condition | Évaluation |
|---|---|---|
| NOT_READY | Ruleset incohérent ou non gouverné | Non |
| CANDIDATE | Ruleset complet sans bloquant majeur | Non : V23 vide met toutes les progressions en HOLD ; R1 et R8 sont bloqués ; 0 G1 signé |
| **CANDIDATE_WITH_BLOCKERS** | Ruleset gouverné, goldens produits, bloquants identifiés | **Oui** |
| READY_FOR_IMPLEMENTATION_REVIEW | Bloquants levés (magnitude, G1, extrapolation) | Non |

**RUNNING_RULESET_V0_STATUS = CANDIDATE_WITH_BLOCKERS** (non forcé).

## 4. Synthèse (points 9 à 38 du rapport demandé)

### 4.1 Paramètres
- **G1** : 4 politiques ; 7 paramètres.

| Politique | Paramètres |
|---|---|
| PAIN_STOP | `painActionPolicy`, `painWording` |
| RETURN_PROTOCOL | `stateBoundaries`, `protocol`, `unknownStateHandling` |
| NOVICE_ENTRY | `noviceEntryProtocol` |
| OUT_OF_SCOPE | `outOfScopeTriggers` |

- **Paramètres gouvernés** : **140** (110 du registre 5B + 14 nouveaux paramètres de valeur + 7 nouveaux paramètres vides + 9 nouveaux paramètres de politique).
- **Valeurs candidates** : 28 tags valorisés, dont **21 chiffrés** (V01–V04, V06–V10, V12–V16, V18, V21, V22, V24–V27).
- **Encore vides** :
  - 13 tags bloquants en 5C (V23, V28, V31–V41) ;
  - sur les 24 paramètres NUMERIC / RANGE du registre 5B, 12 restent vides : `extrapolationExponent`, `cs.trialDurationBounds`, `easy.ceilingMargin`, `longRun.boundPolicy`, `frequency.defaultByAvailability`, `magnitudeClassBounds`, `phase.durations`, `replan.volumeRecoveryBound`, `recovery.postRacePolicy`, `noviceEntryDose`, `taper.durationByEvent`, `concurrent.proximityBands`.
- **Statuts (140 paramètres)** :

| Statut | Nombre |
|---|---|
| EXPERT_DESIGN_REVIEW | 58 |
| PROGRAMMING_HEURISTIC | 31 |
| PRODUCT_GUARDRAIL | 13 |
| CONTEXT_DEPENDENT | 12 |
| TECHNICAL | 11 |
| SAFETY_SIGNOFF_REQUIRED | 7 |
| SUPPORTED | 5 (conclusions négatives et taper) |
| INSUFFICIENT_EVIDENCE | 2 |
| SUPPORTED_WITH_RANGE | 1 |

  - Pour les 28 valeurs 5C : EXPERT_DESIGN_REVIEW 14, PROGRAMMING_HEURISTIC 6, PRODUCT_GUARDRAIL 4, TECHNICAL 2, SAFETY_SIGNOFF_REQUIRED 1, SUPPORTED_WITH_RANGE 1, **SUPPORTED 0**.
- **HIGH_SENSITIVITY** :
  - chiffrés : V02 (RPE par domaine), V03 (largeur des plages), V04 (marge seuil), V08 (ratios de récupération), V10 (densité HD), V12 (récence), V22 (garde-fou LARGE), V24 (frontières de reprise), V27 (taper) ;
  - vides critiques : V23, V32, V31.

### 4.2 Règles
- **Références** : tri ordinal propre à chaque décision ; récence contextuelle (V12, sans expiration) ; conflit au-delà de 6 % ⇒ estimation la plus prudente (V13) ; 11 cas codés (`REF.RECENT_SPECIFIC`, `REF.MULTIPLE_COHERENT`, `REF.CONFLICT`, `REF.STALE_REVIEW`, `REF.DECLARED_ONLY`, `REF.NONE`, `REF.CALIBRATION_REQUIRED`…).
- **Mise à jour de la performance** : HOLD / UPDATE_UP / UPDATE_DOWN / REQUEST_CALIBRATION. Hausse substantielle (> 3 %, V14) seulement sur une performance ou sur COHERENT_TRAINING_EVIDENCE (V15 : ≥ 3 observations, ≥ 2 semaines, même domaine, contexte comparable, RPE conforme) ; une séance isolée ne suffit jamais.
- **Confiance** : référence (par décision), prescription (minimum des facteurs), **éligibilité distincte**. La confiance règle la classe de cible (FULL ±3 %, BROAD ±6 % ou borne, RPE seul).
- **Éligibilité** : `SessionEligibilityDecision` en deux étapes (éligibilité, puis classe de cible). L’absence d’allure donne RPE_ONLY, jamais NOT_ELIGIBLE ; un paramètre de dose vide donne BLOCKED.
- **Archétypes** :
  - 9 sélectionnables : EASY, LONG, STEADY, THRESHOLD, VO2, SHORT, HILLS, RACE_PACE, TEST ;
  - 1 module : STRIDES ;
  - 1 au catalogue, non sélectionné automatiquement en V1 : PROGRESSION_RUN ;
  - SHORT_INTERVALS est justifié opérationnellement (§M) ;
  - HILLS : RPE, durée et terrain, sans pente universelle.
- **Composition** : fréquence donnée par le planificateur (≥ 2, V26) ; séances HD ≤ V10 et jamais sur deux jours consécutifs (V11) ; KEY selon l’objectif et la phase ; LONG_RUN si la fréquence le permet ; complément en EASY ; rééquilibrage vers la bande habituelle ; **TID calculée après coup**.
- **Progression** : une variable dominante ou HOLD, avec 9 codes de HOLD. V23 vide ⇒ **toutes les semaines golden sont en HOLD** ; le changement « à dose égale » est rare (aucune variable structurelle modifiée).
- **Charge** : 10 dimensions ; bande habituelle = [min, max] des 4 semaines précédentes (V21, sans ratio) ; classes WITHIN / INCREASE_UNCLASSIFIED / MULTI (refusé) / LARGE (V22, P-R0–1) / OUT_OF_SCOPE ; UNKNOWN jamais imputé.
- **Taper** : dernière semaine seulement tant que V28 est vide ; volume dans la plage de signal 41–60 % (R11 : 96–142 min) ; intensité et fréquence maintenues ; jamais 0,50 imposé.
- **Séances manquées** : DROP / MOVE / REPLACE / REDUCE / REPLAN_WEEK ; jamais MAKE_UP_VOLUME ; R10 : DROP faute de créneau conforme.
- **Reprise** : SHORT / MODERATE / LONG / **UNKNOWN (jamais converti)**. UNKNOWN : aucune séance HD, fréquence et durées ≤ réalisées depuis le retour (sinon BLOCKED), RPE seul, demande d’information, HOLD jusqu’à résolution de l’état.
- **Demandes concurrentes** : table ordinale LOW → VERY_HIGH par archétype (§Z), PROGRAMMING_HEURISTIC / EXPERT_DESIGN_REVIEW ; le GlobalPlanner place.

### 4.3 Goldens
- **R1–R12** : 10 VALID (R2–R7, R9–R12), **2 NO_VALID** (R1 : V33 ; R8 : V34).
- **Composants bloqués dans des semaines valides** : 6 types (allure semi V38, allure marathon V38, VO2 V36, THRESHOLD V35, début du taper V28, magnitude V23).
- **Prescriptions bloquées** : 2 semaines entières.
- **C1–C8** : une seule dimension varie à chaque fois ; tous les changements sont expliqués. Points marquants :
  - C1 et C7 : la précision change, pas l’éligibilité ;
  - C2 : redistribution de la durée hebdomadaire ;
  - C6 : UNKNOWN reste en HOLD même quand la condition de reprise est satisfaite ;
  - C8 : sans montre, le moteur reste entièrement programmable.
- **I1–I20** : tous cohérents sur le papier ; preuve exécutable attendue à l’implémentation.
- **Adversariaux** : 20 scénarios ; aucune invention ; refus explicites pour A06 (doubles séances), A16, A18 selon le cas et A20 (composant).

### 4.4 CORE-EXT-R1 et contrat
- **RFC** : **profondeur fixe** (liste plate de segments ; `repeat` = séries × répétitions ; plusieurs blocs = segments successifs). Adresse de reprise sur 4 entiers ; minuteur par déroulement linéaire ; cases à cocher par (segment, série, répétition) ; HYROX par un champ `modality`. Non implémentée.
- **Contrat** :
  - entrée : contexte, objectif, intention du planificateur, références, historique, retours, état de reprise, version du ruleset, mode ;
  - sortie : `VALID_RUNNING_PROPOSAL` (avec dégradations explicites) ou `NO_VALID_RUNNING_PROPOSAL` (avec analyse partielle et demandes d’information) ;
  - jamais de séance partiellement invalide en silence ;
  - en PRODUCTION aujourd’hui : `NO_VALID` (G1 non signés).

### 4.5 Bloquants
- **Scientifiques** :
  - sources au niveau SEARCH_SUMMARY pour Claude (3 vérifiées au niveau abstract par le contre-audit) ;
  - aucune source sur le long run, le marathon, la fréquence, la dose de première exposition ou la reprise ;
  - correspondance entre RPE et domaines non validée.
- **Revue d’expert** :
  - V23 (magnitude, **critique**) ;
  - V38 (extrapolation) ;
  - V31 et V32 (définition de HD) ;
  - V35–V37 (premières expositions) ;
  - V28 (durée du taper) ;
  - valeurs EXPERT_DESIGN_REVIEW HIGH_SENSITIVITY (V02, V03, V04, V08) ;
  - table phase × objectif × niveau ;
  - table des demandes.
- **Signature de sécurité** : 4 politiques G1 (0 signée) ; V33 et V34 (doses d’entrée et de reprise) ; frontière LONG de V24.
- **Techniques** :
  - approbation puis implémentation de CORE-EXT-R1 (schéma, `session_record` v4, estimation de durée, `reduce_run_volume` pour `run_structure`) ;
  - conversion des goldens et des 88 cas du plan de tests en tests exécutables ;
  - correction des documents d’architecture (audit 5B) ;
  - mise à jour motivée de l’empreinte F20 lors de la phase CORE.

## 5. Confirmations

- **CORE UNCHANGED**
- **STRENGTH UNCHANGED**
- **CORE-EXT-R1 NOT IMPLEMENTED**
- **RUNNING ENGINE CODE NOT STARTED**

STOP : aucune implémentation n’est commencée.
