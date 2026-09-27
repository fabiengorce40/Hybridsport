# 06 — Débutant et avancé, feedback, cas d'échec, reason codes

## 18. Comportement selon le niveau

### 18.1 Débutant (novice, débutant)

| Aspect | Comportement | Erreur empêchée |
|--------|--------------|-----------------|
| Archétypes | A1 full body (2–3 par semaine), A4 pour le soutien | Répartitions trop spécialisées |
| Exercices | Au plus 1 exercice `technical ≥ 2` par séance, jamais en fin de séance (G1, STR-V6) ; exercices stables autorisés et souvent préférés comme premier mouvement chargé (C2) ; patterns libres simples introduits progressivement | Trop de mouvements techniques |
| Stabilité | Ancres conservées sur tout le mésocycle (durée maximale plus longue) ; peu de variation | Changements constants |
| Dosage | Séries au bas de la plage ; RIR 2–3 ; pas de `top_set` ; repos suffisants | Volume excessif, échec musculaire |
| Charge | Pas de test maximal ; calibration par séries à RIR 2–3 | Tests maximaux |
| Progression | PM1 (linéaire) sur le principal ; PM2 sur les accessoires ; une réussite suffit (PM1) | Progression trop lente ou trop brusque |
| Format | Séries classiques ; **pas de circuit générique par défaut**. Supersets seulement sur les accessoires, si le temps l'exige | Séance débutante = circuit léger |

### 18.2 Avancé

| Aspect | Ce qui change réellement | Ce qui ne change pas |
|--------|--------------------------|----------------------|
| Exercices | Variantes plus spécifiques (emplacement principal au `loadCeiling` élevé), plus d'isolation en hypertrophie | Pas d'exercices exotiques ajoutés « parce qu'avancé » |
| Dosage | Plages L5 plus hautes ; RIR plus bas autorisé sur les exercices stables ; `top_set` + `backoff` possibles sur le principal (stimulus `strength_heavy`) | Pas d'échec systématique |
| Progression | PM3 (autorégulé) ; PM4 en hypertrophie ; pas plus petits relativement ; bornes par cycle | Toujours une variable dominante |
| Références | **Références fiables exigées** pour la charge absolue : sans R1 récent, calibration avant le `top_set` | — |
| Spécificité | Plus de séances de stimulus lourd en intensification (décision du planificateur) | Le moteur ne choisit pas la fréquence |
| Complexité | Aucune technique avancée en V1 (hors périmètre) | — |

## 19. Feedback après séance

Principe (doc 08 §2) : **uniquement ce qui modifie une décision future**, avec le moins de saisie possible.

| Donnée | Saisie | Décision alimentée | Coût |
|--------|--------|--------------------|------|
| Séries réalisées | Cochées pendant la séance (préremplies) | E1, progression | 0 tap si conforme |
| Reps et charge réelles | Modifiées seulement si elles diffèrent de la cible | Progression, capacités | 0 à 2 taps par série modifiée |
| **RIR de la dernière série de travail** | **Seulement** sur les ancres et les principaux | e1RM (PM3), classement | 1 tap par exercice concerné |
| Exercice remplacé | Automatique (substitution dans l'app) | Track, capacité, anti-oscillation | 0 |
| Douleur | Oui / non discret ; détails seulement si « oui » (G1, CORE) | Restrictions, suspension de track | 1 tap (3 si « oui ») |
| Séance terminée | Automatique ; question seulement si c'est ambigu | Exposition, régularité | 0 à 1 |
| Durée réelle | Horodatage automatique | Calibration de la durée | 0 |
| RPE de séance | Facultatif | E6, lecture de l'état | 1 tap |

**Données minimales pour progresser** : séries cochées + reps et charge (préremplies) sur les exercices suivis. Sans elles : `no_data` et progression gelée, jamais une progression supposée.

## 20. Cas d'échec

`NO_VALID_PROPOSAL` = le moteur ne renvoie **aucune proposition**, avec ses reason codes (CORE-EXT-3). Il ne propose jamais une mauvaise séance « pour avoir quelque chose ».

| Cas | Reason code | Comportement | Dégradation possible ? |
|-----|-------------|--------------|------------------------|
| Matériel insuffisant pour un emplacement requis (après F1–F4 de substitution) | `SELECT.NO_CANDIDATE_FOR_SLOT{slot, need}` | Aucune proposition ; le planificateur choisit un autre archétype ou un autre preset | Oui, par repli F4, sauf sur le principal d'un objectif `strength` (politique `primaryF4Policy`) |
| Archétype déclaré infaisable pour le preset | `PLAN.ARCHETYPE_NOT_APPLICABLE{archetype, preset}` | Aucune proposition | Non (la faisabilité est déclarée, jamais implicite) |
| Archétype non admis pour le niveau ou l'objectif | `PLAN.ARCHETYPE_NOT_APPLICABLE{reason}` | Aucune proposition | Non |
| Durée incompatible (emplacements requis > borne haute avec dosage au plancher) | `DURATION.TARGET_BELOW_ARCHETYPE_MIN{requiredS, targetS}` | Aucune proposition | Non : le planificateur change d'archétype (A1 ou A4 plus courts) |
| Restrictions ou douleur retirant un besoin requis | `SELECT.NO_CANDIDATE_FOR_SLOT` + `SAFETY.PAIN.ZONE_RESTRICTED` | Aucune proposition ; le CORE peut conclure à `REST_RECOMMENDED` si tout est retiré | Oui (autres besoins) si le besoin retiré est optionnel |
| Contexte multisport incompatible avec l'objet de l'archétype | `PLAN.CONTEXT_INCOMPATIBLE{note, archetype}` | Aucune proposition ; demande d'une variante au planificateur | Oui, abaissement de la demande (§14) quand il reste compatible |
| Données contradictoires (références) | `STATE.REFERENCE_CONFLICT` | **Pas d'échec** : confiance abaissée, mode RIR | Oui |
| Contexte illisible ou incohérent (`StrengthContext` invalide) | `TECHNICAL.SCHEMA_INVALID` | Aucune proposition | Non |
| Intention incohérente (autre discipline, stimulus inconnu) | `TECHNICAL.STRUCTURE_INVALID` | Aucune proposition | Non |
| Programme inactif | — | Le moteur n'est **pas appelé** (garde du CORE) | — |

> **Amendé par l'addendum V1.2** (doc 10 §9 : décision B — l'infaisabilité est CALCULÉE depuis l'équipement réel (NO_CANDIDATE_FOR_SLOT, filtre F10) ; aucun identifiant de préréglage n'entre dans la génération).

### Contrôles propres de la discipline (validateur CORE, `extraChecks`)

Chaque contrôle a sa fiche de règle, versionnée dans le ruleset :

| Id | Contrôle | Couche | Nature | Gouvernance |
|----|----------|--------|--------|-------------|
| STR-V1 | Besoin principal de l'archétype présent (emplacement requis couvert) | A3 | PROGRAMMING_HEURISTIC | G2 |
| STR-V2 | L4 : séries difficiles par groupe et par séance ≤ plafond du niveau | A1 | SAFETY | **G1** |
| STR-V3 | Cohérence reps / %e1RM / RIR (table du ruleset) | A4 | TECHNICAL (incohérence de prescription) | G2 (table), G4 (contrôle) |
| STR-V4 | Montée en charge présente si requise ; absente sur l'isolation | A3 | PROGRAMMING_HEURISTIC | G2 |
| STR-V5 | Charge réalisable avec le matériel (arrondi) ; aucune charge NaN, négative ou nulle alors qu'elle est chargée | A4 | TECHNICAL | G4 |
| STR-V6 | Exercice technique (`technical ≥ 2`) jamais en fin de séance sous fatigue pour un novice | A1 | SAFETY | **G1** |
| STR-V7 | Effort maximal (`top_set` au-delà du seuil, séries de référence lourdes) seulement si l'athlète est éligible (`maxEffortEligibility`) : contrôle reporté aux moteurs de discipline en phase 3 (écart 4) | A1 | SAFETY | **G1** |
| STR-V8 (`hard_justified`) | Série de référence maximale répétée sans intention `benchmark_retest` dans la fenêtre de sécurité | A1 | SAFETY | **G1** |

## 21. Reason codes

Ils sont enregistrés par le moteur dans une extension du registre (`createCoreRegistry(extra)`). Ils utilisent **uniquement les domaines existants** (le domaine `EQUIPMENT` de la spec 06 n'existe pas dans le registre ; `EQUIPMENT.LOAD_CAP_REACHED` devient `DOSE.LOAD.CAP_REACHED`).

| Code | Catégorie | Audience | Paramètres |
|------|-----------|----------|------------|
| `SELECT.EXERCISE.CHOSEN` | optimization | internal (visible dans « Pourquoi cet exercice ? ») | exerciseId, slot, decidingCriterion |
| `SELECT.FILTERED.EQUIPMENT` / `.RESTRICTION` / `.PAIN` / `.USER_EXCLUSION` / `.SKILL` / `.DISCIPLINE` / `.CONTEXT` / `.DEPRECATED` | information | internal | slot, count |
| `SELECT.NO_CANDIDATE_FOR_SLOT` | feasibility | user | slot, need |
| `SELECT.SUBSTITUTION` | adaptation | user | from, to, fidelity |
| `SELECT.SUBSTITUTION_LOW_FIDELITY` | adaptation | user | from, to |
| `SELECT.PATTERN_FALLBACK` | adaptation | user | slot, fallbackPattern |
| `SELECT.CONTEXT_COMPROMISE` | business_soft | internal | slot, structure |
| `DOSE.LOAD.FROM_E1RM` | information | internal | exerciseId, pct, confidence |
| `DOSE.LOAD.RPE_BASED_LOW_CONFIDENCE` | information | user | exerciseId, suggested |
| `DOSE.LOAD.CALIBRATION` | information | user | exerciseId |
| `DOSE.LOAD.CAP_REACHED` | adaptation | user | exerciseId, maxLoad, alternative |
| `DOSE.LEVEL_ADJUSTED` / `PHASE_ADJUSTED` / `VOLUME_ALLOCATED` / `READINESS_ADJUSTED` / `INTERFERENCE_ADJUSTED` / `TIME_ADJUSTED` | optimization | internal | modifier, delta |
| `PROGRESSION.ADVANCED` / `HELD` / `REGRESSED` / `CAP_REACHED` | adaptation | user | trackId, variable, step |
| `PROGRESSION.ANCHOR_PROPOSED` | information | internal | slot, exerciseId |
| `PROGRESSION.ANCHOR_ROTATED` | adaptation | user | from, to, cause |
| `PROGRESSION.SUSPENDED` | information | internal | trackId, cause (`pain` / `safety_pause`) |
| `PLAN.ARCHETYPE_NOT_APPLICABLE` | feasibility | internal | archetype, reason |
| `PLAN.CONTEXT_INCOMPATIBLE` | feasibility | internal | note, archetype |
| `PLAN.VOLUME_IMBALANCE_WEEK` | business_soft | internal | muscleGroup, planned, floor |
| `DURATION.TARGET_BELOW_ARCHETYPE_MIN` | feasibility | user | requiredS, targetS |
| `DATA.WEEK_CONTEXT_UNKNOWN` / `DATA.EXPOSURE_UNKNOWN` | information | internal | — |
| `STATE.REFERENCE_CONFLICT` | information | internal | exerciseId, sources |

Chaque code utilisé a un template dans chaque langue (test de CI, spec 10 §1). Aucun code n'est émis sans être enregistré (le registre lève une erreur).
