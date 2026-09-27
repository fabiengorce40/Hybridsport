# StrengthEngine V1 — inventaire final des paramètres consommés (phase 4C)

> **Avertissement.** Toutes les valeurs ci-dessous sont des **valeurs de TEST** (`packages/strength/tests/fixtures/ruleset.ts`). Chacune a le statut `draft`, la confiance `provisional`, `provisional = true` et la source `internal_hypothesis`.
> **Une valeur qui fait passer les simulations n'est PAS validée scientifiquement.** Le passage des tests prouve la cohérence du mécanisme, jamais la justesse de la valeur.

Légende :

- **Gouvernance** (spec CORE doc 09) :
  - G1 : sécurité, cliquet, sens prudent et référence approuvée obligatoires ;
  - G2 : programmation, revue d'expert ;
  - G3 : préférence produit ;
  - G4 : technique, sans effet sportif.
- **Statut de preuve** :
  - `EVIDENCE_REVIEW_REQUIRED` : valeur sportive à étayer par la littérature (voir [Evidence Review Pack](STRENGTH-EVIDENCE-REVIEW-PACK.md)) ;
  - `EXPERT_DESIGN_REVIEW` : structure de programmation (choix de conception) à relire par un expert, sans valeur numérique isolée ;
  - `SAFETY_SIGNOFF_REQUIRED` : G1, relecture de sécurité et référence approuvée exigées avant production ;
  - `TECHNICAL` : réalité matérielle ou mécanisme, sans effet sportif direct ;
  - `PRODUCT_DECISION` : choix produit.
- **Si absent** : pour tous les paramètres `strength.*`, un paramètre absent, déprécié, de mauvaise gouvernance ou hors schéma ⇒ `readStrengthParams` lève une `RulesetParameterError`. Le CORE refuse alors la requête (`INVALID_INPUT`, paramètre nommé). **Jamais de valeur par défaut** (test : `parameters.test.ts`, « paramètre absent ou invalide »).

## Synthèse

| ID | Gouv. | Statut de preuve | Intervient dans |
|---|---|---|---|
| `strength.needs` | G2 | EXPERT_DESIGN_REVIEW | `archetypes.ts`, `candidates.ts` |
| `strength.archetypes` | G2 | EXPERT_DESIGN_REVIEW | `archetypes.ts`, `intent-contract.ts`, `engine.ts` |
| `strength.goals` | G2 | EXPERT_DESIGN_REVIEW | `archetypes.ts` |
| `strength.stimuli` | G2 | EXPERT_DESIGN_REVIEW | `archetypes.ts`, `dose.ts`, `engine.ts` |
| `strength.session.mobility` | G2 | EVIDENCE_REVIEW_REQUIRED | `engine.ts` |
| `strength.exerciseClass` | G2 | EXPERT_DESIGN_REVIEW | `model.ts` |
| `strength.selection.criteriaOrder` | G2 | EXPERT_DESIGN_REVIEW | `selection.ts` |
| `strength.selection.recencyBandsDays` | G3 | PRODUCT_DECISION | `selection.ts` |
| `strength.selection.axialHighMaxPerSession` | G2 | EVIDENCE_REVIEW_REQUIRED | `selection.ts` |
| `strength.selection.minLoadCeiling` | G2 | EXPERT_DESIGN_REVIEW | `selection.ts`, `candidates.ts` |
| `strength.selection.primaryLoadRequired` | G2 | EXPERT_DESIGN_REVIEW | `candidates.ts` (F10) |
| `strength.selection.skillCeiling` | G1 | SAFETY_SIGNOFF_REQUIRED | `candidates.ts` (F7) |
| `strength.novice.technicalUnderFatigue` | G1 | SAFETY_SIGNOFF_REQUIRED + EVIDENCE_REVIEW_REQUIRED | `candidates.ts` (F7b), `checks.ts` (STR-V6) |
| `strength.dose.base` | G2 | EVIDENCE_REVIEW_REQUIRED | `dose.ts` |
| `strength.dose.modifiers` | G2 | EVIDENCE_REVIEW_REQUIRED | `dose.ts` |
| `strength.dose.nonRep` | G2 | EVIDENCE_REVIEW_REQUIRED | `engine.ts` |
| `strength.load` | G2 | EVIDENCE_REVIEW_REQUIRED | `load.ts`, `progression.ts`, `checks.ts` |
| `strength.load.defaultIncrements` | G4 | TECHNICAL | `load.ts`, `models.ts`, `progression.ts` |
| `strength.calibration` | G2 | EVIDENCE_REVIEW_REQUIRED | `dose.ts` |
| `strength.rampup` | G2 | EVIDENCE_REVIEW_REQUIRED | `rampup.ts` |
| `strength.progression` | G2 | EVIDENCE_REVIEW_REQUIRED | `progression.ts`, `models.ts`, `engine.ts` |
| `strength.tracks` | G2 | EVIDENCE_REVIEW_REQUIRED | `progression.ts` |
| `strength.volume` | G2 | EVIDENCE_REVIEW_REQUIRED | `volume.ts`, `checks.ts` |
| `strength.volume.sessionCap` | G1 | SAFETY_SIGNOFF_REQUIRED + EVIDENCE_REVIEW_REQUIRED | `engine.ts` (L4), `checks.ts` (STR-V2) |
| `strength.interference` | G2 | EVIDENCE_REVIEW_REQUIRED | `interference.ts`, `dose.ts`, `candidates.ts` (F9) |
| `strength.substitution.fallbackNeeds` | G2 | EXPERT_DESIGN_REVIEW | `engine.ts` (repli F4) |
| `strength.topSet` | G2 | EVIDENCE_REVIEW_REQUIRED | `engine.ts` |
| `strength.maxEffort.threshold` | G1 | SAFETY_SIGNOFF_REQUIRED | `checks.ts` (STR-V7) |
| `strength.proposals.max` | G4 | TECHNICAL | `engine.ts` |
| CORE `demand.derivationTable` | (CORE) | EXPERT_DESIGN_REVIEW | `model.ts` (structures sollicitées) |
| CORE `duration.toleranceProfiles`, `duration.blockTransitionS`, `duration.briefingS`, `duration.defaultTiming`, `duration.transitionTable`, `duration.uncertaintyCorrelation` | (CORE) | Voir inventaire CORE (phase 3) | `engine.ts` (budget de durée) |

Sur 29 paramètres `strength.*` :

- 4 sont G1 ;
- 22 sont G2 ;
- 1 est G3 ;
- 2 sont G4.

15 sont `EVIDENCE_REVIEW_REQUIRED`, dont deux G1 (qui exigent aussi un visa de sécurité).

## Fiches

Chaque fiche donne :

- la valeur de TEST et son unité ;
- le rôle et l'endroit où il intervient ;
- le statut de preuve ;
- le risque d'une valeur trop basse et trop haute.

Pour toutes les fiches :

- confiance `provisional`, provisional = oui ;
- comportement si absent : refus `INVALID_INPUT` (voir la légende).

### `strength.needs` — G2

- Valeur :
  - 11 besoins → exigence d'emplacement (pattern et `compound`, ou région et types) : genou, hanche, unilatéral, poussées horizontale et verticale, tirages horizontal et vertical ;
  - tronc = `region core` + `strength|isometric` ;
  - porté ; isolations haut et bas.
- Unité : structure.
- Rôle : traduire un besoin de mouvement en filtre de catalogue (F2).
- Intervient dans : résolution des emplacements, filtres, probe de récence.
- Statut : EXPERT_DESIGN_REVIEW.
- Trop restrictif : NO_VALID_PROPOSAL fréquent, faible variété.
- Trop large : exercices hors intention dans un emplacement.

### `strength.archetypes` — G2

- Valeur : 4 archétypes (corps entier, haut, bas, soutien). Pour chacun :
  - blocs (principal, secondaire, accessoire) et leviers de durée ;
  - emplacements (besoin, rôle, requis/optionnel, groupe de choix, `modalityPreference`, count) ;
  - niveaux et objectifs admis ;
  - durée 1 200 à 4 800 s ;
  - préréglages déclarés (audit de couverture seulement).
- Unité : structure ; secondes pour la durée.
- Rôle : squelette de la séance.
- Intervient dans : résolution, contrat planificateur, construction.
- Statut : EXPERT_DESIGN_REVIEW.
- Risques : trop peu d'emplacements requis ⇒ séances creuses ; trop ⇒ séances impossibles dans le temps.

### `strength.goals` — G2

- Valeur : priorité des besoins par objectif. Exemples :
  - force : genou > hanche > poussée horizontale > tirage vertical… ;
  - soutien course : hanche > unilatéral > tirage horizontal > tronc > isolation bas…
- Unité : ordre.
- Rôle : choix dans les groupes de choix, ordre des optionnels, exclusion des membres hors objectif.
- Intervient dans : `resolveSlots`.
- Statut : EXPERT_DESIGN_REVIEW.
- Risque : priorité inadaptée ⇒ besoins spécifiques jamais servis (ex. unilatéral en soutien course).

### `strength.stimuli` — G2

- Valeur : 4 stimuli, chacun ayant :
  - un profil de dosage (heavy, volume, general, support) ;
  - un ordre des optionnels ;
  - une répartition d'énergie (ex. lourd 0,2 / 0,5 / 0,3) ;
  - un format.
- Unité : structure ; fractions (énergie).
- Rôle : lier le stimulus au dosage et à l'ordre des optionnels. Il n'intervient jamais sur les emplacements requis (propriété testée).
- Statut : EXPERT_DESIGN_REVIEW. La répartition d'énergie sert l'empreinte anti-doublon.
- Risques : ordre des optionnels inadapté ⇒ déséquilibres (bug corrigé en 4B : aucune poussée horizontale).

### `strength.session.mobility` — G2

- Valeur : échauffement 180 à 300 s ; retour au calme 0 à 180 s. La valeur basse s'applique sous contrainte de temps.
- Unité : s.
- Rôle : durée des blocs de mobilité.
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Trop bas : échauffement insuffisant avant charges lourdes.
- Trop haut : temps pris aux séries de travail, séances courtes infaisables.

### `strength.exerciseClass` — G2

- Valeur : `highLoadCeilingMin` = 2, `cappedLoadCeilingMax` = 0.
- Unité : ordinal 0–3.
- Rôle : classe d'exercice (polyarticulaire lourd, autre polyarticulaire, isolation, poids du corps plafonné) pour le dosage, les montées et le modèle.
- Statut : EXPERT_DESIGN_REVIEW.
- Seuil trop bas : montées et % d'e1RM sur des exercices légers.
- Seuil trop haut : pas de montée sur de vrais polyarticulaires lourds.

### `strength.selection.criteriaOrder` — G2

- Valeur :
  - principal : anchor > load_adequacy > role_fit > goal_relevance > fatigue_fit > volume_fit > preference > recency > logistics ;
  - secondaire : anchor > load_adequacy > goal_relevance > role_fit > fatigue_fit > volume_fit > recency > preference > logistics ;
  - accessoire : track > load_adequacy > role_fit > volume_fit > goal_relevance > fatigue_fit > recency > preference > logistics.
- Unité : ordre lexicographique.
- Rôle : classement des candidats (aucun poids).
- Statut : EXPERT_DESIGN_REVIEW.
- Risque : le premier critère différenciant est décisif. Stabilité en tête des accessoires ⇒ préférence de fait pour la modalité la plus stable du catalogue (analyse de sensibilité, rapport 4C §7).

### `strength.selection.recencyBandsDays` — G3

- Valeur : [2, 5].
- Unité : jours.
- Rôle : bandes de récence d'une famille.
- Statut : PRODUCT_DECISION.
- Trop bas : répétition quasi quotidienne d'une même famille.
- Trop haut : rotation excessive, perte de continuité.

### `strength.selection.axialHighMaxPerSession` — G2

- Valeur : 1.
- Unité : exercices.
- Rôle : rétrograder un 2ᵉ exercice à charge axiale maximale.
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Trop bas (0) : pas de squat et soulevé lourds dans la même séance.
- Trop haut : cumul de charge axiale.

### `strength.selection.minLoadCeiling` — G2

- Valeur : novice 0, débutant 0, intermédiaire 1, avancé 1.
- Unité : ordinal loadCeiling.
- Rôle : critère `load_adequacy` et seuil de F10.
- Statut : EXPERT_DESIGN_REVIEW.
- Trop bas : poids du corps plafonné prescrit à des avancés.
- Trop haut : refus pour matériel léger alors qu'une progression reste possible.

### `strength.selection.primaryLoadRequired` — G2

- Valeur : [`strength_heavy`].
- Unité : liste de stimuli.
- Rôle : F10, principal chargeable exigé.
- Statut : EXPERT_DESIGN_REVIEW.
- Liste vide : « séance lourde » sans charge.
- Liste trop large : refus en maison ou en voyage pour des stimuli qui s'en accommoderaient.

### `strength.selection.skillCeiling` — G1

- Valeur : novice 2, débutant 3, intermédiaire 4, avancé 5.
- Unité : `skillLevel` du catalogue.
- Rôle : F7, exercices trop techniques exclus.
- Statut : SAFETY_SIGNOFF_REQUIRED.
- Trop bas : catalogue appauvri.
- Trop haut (sens dangereux) : mouvements complexes pour des débutants.

### `strength.novice.technicalUnderFatigue` — G1

- Valeur :
  - niveaux novice et débutant ;
  - `minTechnical` = 2 ;
  - `maxPerSession` = 1 ;
  - rôles admis : principal.
- Unité : ordinal, exercices.
- Rôle : F7b et STR-V6, au plus un exercice technique, en principal (sans fatigue préalable).
- Statut : SAFETY_SIGNOFF_REQUIRED et EVIDENCE_REVIEW_REQUIRED.
- Trop strict : séances pauvres.
- Trop laxiste (sens dangereux) : technique complexe sous fatigue.

### `strength.dose.base` — G2

- Valeur : 4 profils (heavy, volume, general, support) × 3 rôles × 4 classes, soit 48 cellules. Chaque cellule donne reps min–max, RIR, séries min–max et repos min–max.
  - Exemples, heavy / principal / polyarticulaire lourd : 3–6 reps, RIR 2, 3–5 séries, 150–240 s.
  - Volume / accessoire / isolation : 12–20 reps, RIR 1, 3–4 séries, 45–75 s.
- Unité : reps, RIR, séries, s.
- Rôle : profil de base du dosage (autorité RIR et repos ; plage des séries).
- Statut : EVIDENCE_REVIEW_REQUIRED (voir le pack).
- Trop bas : stimulus insuffisant.
- Trop haut : fatigue, durée, risque.

### `strength.dose.modifiers` — G2

- Valeur :
  - niveau : novice −1 série et +1 RIR ; débutant +1 RIR ;
  - phase : décharge +2 RIR et facteur 0,6 sur les séries ; maintenance −1 série ; transition −1 série et +1 RIR ;
  - état : prudence +1 RIR ; réduire −1 série et +1 RIR ;
  - `unknownReadiness` : as_normal ; politique de conflit `most_conservative` ;
  - `repChoice` : low ; `restChoice` : mid ; `restRoundingS` : 15.
- Unité : séries, RIR, facteur, s.
- Rôle : ajustements, appliqués une seule fois (addendum V1.2 §1).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Deltas trop faibles : décharge et prudence sans effet.
- Deltas trop forts : sous-stimulation chronique.

### `strength.dose.nonRep` — G2

- Valeur : maintien 30 à 45 s ; porté 30 à 40 m.
- Unité : s, m.
- Rôle : gainage (hold) et porté (intervals sur distance).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Risques : stimulus négligeable si trop bas, fatigue du grip et du tronc si trop haut.

### `strength.load` — G2

- Valeur :
  - `e1rmDivisor` = 30 (forme d'Epley) ; plage valide de 1 à 12 reps jusqu'à l'échec ;
  - table % selon les reps jusqu'à l'échec (1 → 1,00 ; 5 → 0,87 ; 8 → 0,80 ; 10 → 0,75 ; 12 → 0,70 ; 17 → 0,60) ;
  - fenêtres de référence : high 42 j, medium 112 j, low 365 j ;
  - `assumedRirWhenUnknown` = 0 ; pénalité de transfert d'équivalence = 1 cran ;
  - modèles transférables : barre, haltères, kettlebell ;
  - tolérance de conflit 0,15 ; lissage sur 3 mesures ; fourchette indicative ±0,10.
- Unité : sans dimension, jours, fraction.
- Rôle : estimation de l'e1RM, confiance, charges en % et fourchettes (STR-V3).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Diviseur ou table trop optimistes : charges trop lourdes. Trop pessimistes : sous-charge et stagnation.
- Fenêtres trop longues : confiance injustifiée dans de vieilles références.

### `strength.load.defaultIncrements` — G4

- Valeur : barre 2,5 ; haltères paire 2 ; haltère seul 2 ; kettlebell 4 ; machine 5 ; chargé plaques 5 ; lest 2,5 ; engin fixe 1.
- Unité : kg.
- Rôle : pas réalisable par défaut (sans incrément déclaré).
- Statut : TECHNICAL. Réalité matérielle, remplacée par `equipmentIncrements` du contexte.
- Trop bas : charges irréalisables.
- Trop haut : double progression forcée (`coarseStepFraction`), sauts grossiers.

### `strength.calibration` — G2

- Valeur :
  - RIR cible 3 sur 2 séries de calibration ;
  - progression intra-séance et arrêt à l'effort visé ;
  - confiance medium après 1 exposition, high après 2.
- Unité : RIR, séries, expositions.
- Rôle : première exposition sans référence (aucune charge inventée).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- RIR trop bas : première séance trop dure.
- RIR trop haut : calibration inutile et lente.

### `strength.rampup` — G2

- Valeur :
  - rôles principal et secondaire ; classe polyarticulaire lourd ; modèles barre, plaques, machine ; `maxWorkingReps` 8 ; au plus 1 montée par pattern déjà monté ;
  - 3 bandes selon l'intensité relative (≥ 0,5 / 0,7 / 0,85), de 1 à 4 paliers, de 40 % × 8 à 85 % × 1 ;
  - cas estimé : dernier palier ≤ 0,70 ;
  - cas effort : RPE 4 × 8 et 6 × 5 ; cas inconnu : RPE 3 × 8, 5 × 5, 7 × 3 ;
  - repos 60 s.
- Unité : fraction, reps, RPE, s.
- Rôle : montées (hors E1, comptées dans la durée).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Trop peu : pas de préparation avant charge lourde.
- Trop : fatigue et temps.

### `strength.progression` — G2

- Valeur :
  - `modelFor` par niveau × rôle × classe : linéaire (novice et débutant, principal) ; autorégulé (intermédiaire et avancé, principal lourd) ; double progression ailleurs ;
  - `loadStepIncrements` 1 ; marges RIR au-dessus 1 et en dessous 2 ; au plus 1 série manquée pour « partiel » ;
  - preuves requises : linéaire 1, double 1, autorégulé 2 ;
  - plafond par cycle 15 % (≥ 1 pas) ; régression 10 % après 2 échecs ; stagnation après 3 maintiens ;
  - `coarseStepFraction` 0,1.
- Unité : fractions, séances.
- Rôle : ProgressionEngine et choix du modèle.
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Trop agressif : séries impossibles, blessure. Trop prudent : stagnation.

### `strength.tracks` — G2

- Valeur :
  - durée maximale d'une ancre : novice 12, débutant 10, intermédiaire 8, avancé 6 semaines ;
  - accessoire suivi après 2 expositions ;
  - rotation en fin de mésocycle : avancé seulement.
- Unité : semaines, expositions.
- Rôle : cycle de vie des tracks.
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Trop court : rotation qui empêche la progression. Trop long : stagnation et monotonie.

### `strength.volume` — G2

- Valeur :
  - 9 groupes musculaires ; poids du secondaire 0,5 (E1) ;
  - cibles hebdomadaires (plancher et haut) par objectif et par niveau, dérivées de l'hypertrophie intermédiaire. Exemple, pectoraux : 10–20 × facteur d'objectif (force 0,7 ; général 0,6 ; soutien 0,35) × facteur de niveau (novice 0,6 à avancé 1,2) ;
  - `pm4SetsPerWeek` = 1 (progression des séries en accumulation).
- Unité : séries difficiles par semaine.
- Rôle : allocation des séries (autorité « séries »), `volume_fit`, garde des optionnels, déséquilibre de la semaine.
- Statut : EVIDENCE_REVIEW_REQUIRED. Hauts très bas pour les petits groupes du débutant : signal de la simulation.
- Trop bas : sous-stimulation (constaté en 4B chez le novice, corrigé côté mécanisme). Trop haut : fatigue.

### `strength.volume.sessionCap` — G1

- Valeur : novice 10, débutant 12, intermédiaire 14, avancé 16.
- Unité : séries difficiles par groupe et par séance.
- Rôle : plafond L4 (réduction automatique) et contrôle STR-V2 exécuté par le CORE.
- Statut : SAFETY_SIGNOFF_REQUIRED et EVIDENCE_REVIEW_REQUIRED.
- Trop bas : séances tronquées. Trop haut (sens dangereux) : volume local excessif en une séance.

### `strength.interference` — G2

- Valeur :
  - notes du planificateur → structures abaissées ; semaine inconnue ⇒ genou et hanche abaissés ;
  - fenêtre de 36 h autour d'une séance clé ; seuil de sollicitation 2 ;
  - par structure :
    - genou et hanche : −1 série, +2 RIR, optionnels unilatéral et isolation bas retirés ;
    - grip : exclusion ≥ 3, −1 série, +1 RIR, porté retiré ;
    - axial : exclusion ≥ 3, +1 RIR.
- Unité : heures, ordinal, séries, RIR.
- Rôle : multisport consommé (aucune replanification).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Trop faible : séance de force qui compromet la séance clé. Trop fort : soutien vidé de sa substance.

### `strength.substitution.fallbackNeeds` — G2

- Valeur : hanche → unilatéral ; genou → unilatéral ; unilatéral → genou ; tirages vertical ↔ horizontal ; poussées horizontale ↔ verticale ; aucun repli pour le tronc, le porté et les isolations.
- Unité : structure.
- Rôle : repli F4 tracé (jamais pour le principal d'un objectif de force).
- Statut : EXPERT_DESIGN_REVIEW.
- Replis trop larges : intention dénaturée. Trop étroits : NO_VALID_PROPOSAL évitables.

### `strength.topSet` — G2

- Valeur : stimulus lourd, niveau avancé ; 3 séries allégées à 0,9 × la série lourde.
- Unité : séries, fraction.
- Rôle : série lourde et séries allégées (D-S7).
- Statut : EVIDENCE_REVIEW_REQUIRED.
- Fraction trop basse : allégées inutiles. Trop haute : fatigue excessive.

### `strength.maxEffort.threshold` — G1

- Valeur : 0,9, cliquet dans le sens prudent (décroissant), référence approuvée 0,9 en test.
- Unité : fraction de l'e1RM.
- Rôle : STR-V7, au-delà, effort maximal réservé aux exercices et niveaux éligibles.
- Statut : SAFETY_SIGNOFF_REQUIRED.
- Trop bas : trop de séries soumises à éligibilité (prudent). Trop haut (sens dangereux) : charges quasi maximales sans contrôle.

### `strength.proposals.max` — G4

- Valeur : 2.
- Unité : propositions.
- Rôle : nombre de variantes soumises au CORE.
- Statut : TECHNICAL.
- Trop bas : pas d'alternative pour la couche B. Trop haut : temps de calcul.
