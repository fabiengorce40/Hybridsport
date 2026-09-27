# StrengthEngine V1 — Evidence Review Pack (phase 4C)

> **Objet.** Préparer la recherche scientifique des paramètres `EVIDENCE_REVIEW_REQUIRED` ([inventaire](STRENGTH-V1-PARAMETERS.md)). **Aucune valeur n'est modifiée ici et aucune source n'est citée** : les sources seront recherchées, lues et évaluées séparément.
> Pour chaque question : règle concernée, décision à prendre, paramètres, population cible, type de source souhaité.
> Types de source, par ordre de préférence : méta-analyse (MA), revue systématique (RS), position stand ou consensus (PS), essai contrôlé randomisé (ECR), littérature de coaching (LC, seulement quand la recherche est muette ou quand la question est opérationnelle).
> **Règle de décision attendue** : chaque valeur retenue devra citer sa source, son niveau de preuve, sa population et sa marge d'incertitude. Une valeur issue d'une MA sur des jeunes adultes entraînés ne se transpose pas sans justification aux novices, aux seniors ou aux athlètes concurrents.

Populations de référence du produit :

- **P-NOV** : novice ;
- **P-DEB** : débutant (moins de 1 an) ;
- **P-INT** : intermédiaire ;
- **P-AV** : avancé ;
- **P-CONC** : athlète concurrent (course, HYROX, cross-training) ;
- **P-40+** : adultes de plus de 40 ans, sous-groupe à signaler partout où la preuve le permet.

---

## 1. Volume

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| V1 | Quelle plage de séries difficiles par groupe musculaire et par semaine maximise l'hypertrophie ? Où se situe le rendement décroissant ? | L5 (cibles hebdomadaires), allocation des séries | Plancher et haut par groupe (hypertrophie, intermédiaire) | `strength.volume.weeklyRange` (base hypertrophie intermédiaire) | P-INT, P-AV | MA dose-réponse, RS |
| V2 | Quel volume minimal maintient ou développe la force ? | L5, objectif force | Facteur de l'objectif force (0,7) | `strength.volume.weeklyRange` (facteurs d'objectif) | P-DEB à P-AV | MA, RS |
| V3 | Quel volume de soutien pour des athlètes d'endurance, sans compromettre l'objectif principal ? | L5, objectif soutien | Facteur soutien (0,35) | idem | P-CONC | RS, PS, ECR |
| V4 | Comment le volume utile varie-t-il selon le niveau d'entraînement ? | L5 | Facteurs de niveau (0,6 à 1,2) | idem | P-NOV à P-AV | MA (analyses en sous-groupes) |
| V5 | Comment compter une série pour un muscle sollicité secondairement (fraction de série) ? | Règle E1 | Poids du secondaire (0,5) | `strength.volume.secondaryWeight` | Tous | RS, LC (convention de comptage) |
| V6 | Au-delà de combien de séries par muscle **et par séance** le bénéfice plafonne-t-il ou le risque augmente-t-il ? | L4, STR-V2 (**G1**) | Plafond par séance et par niveau | `strength.volume.sessionCap` | P-NOV à P-AV | MA, RS |
| V7 | Faut-il augmenter les séries au fil d'un mésocycle, et de combien ? | PM4 | +1 série/semaine en accumulation | `strength.volume.pm4SetsPerWeek` | P-INT, P-AV | ECR, RS |

## 2. Intensité

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| I1 | Quelles zones d'intensité (%1RM ou reps jusqu'à l'échec) pour la force maximale selon le niveau ? | Profil lourd, principal | Reps 3–6 et RIR du profil lourd | `strength.dose.base.heavy` | P-INT, P-AV | MA, PS |
| I2 | L'hypertrophie est-elle comparable entre charges lourdes et légères à effort équivalent ? | Profil volume | Plages de reps du profil volume | `strength.dose.base.volume` | P-DEB à P-AV | MA |
| I3 | Quelle intensité pour un objectif « général » ou de santé ? | Profil général | Plages du profil général | `strength.dose.base.general` | P-NOV, P-DEB, P-40+ | PS, RS |
| I4 | À partir de quel pourcentage parle-t-on d'effort maximal, justifiant une éligibilité ? | STR-V7 (**G1**) | Seuil d'effort maximal (0,9) | `strength.maxEffort.threshold` | P-INT, P-AV | PS, LC |

## 3. Répétitions

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| R1 | Plages de répétitions par rôle (principal, secondaire, accessoire) et par classe d'exercice (polyarticulaire lourd, isolation, poids du corps) | Profils de base | 48 cellules de `dose.base` | `strength.dose.base.*.reps` | Tous | MA, RS, LC |
| R2 | Faut-il viser le bas ou le haut de la plage à la première prescription ? | Choix des reps | `repChoice = low` | `strength.dose.modifiers.repChoice` | Tous | LC |
| R3 | Durée et distance utiles pour le gainage (maintien) et le porté | Prescriptions sans reps | 30–45 s ; 30–40 m | `strength.dose.nonRep` | Tous, P-CONC | RS, LC |

## 4. Proximité de l'échec (RIR / RPE)

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| F1 | Quelle proximité de l'échec maximise l'adaptation (force, hypertrophie) sans fatigue disproportionnée ? | Autorité RIR (addendum V1.2 §1) | RIR par cellule de profil | `strength.dose.base.*.rir` | P-DEB à P-AV | MA, RS |
| F2 | Les novices doivent-ils s'entraîner plus loin de l'échec ? De combien ? | Modificateur de niveau | +1 RIR (novice, débutant) | `strength.dose.modifiers.level` | P-NOV, P-DEB | RS, PS, LC |
| F3 | Quelle est la précision de l'auto-estimation du RIR selon le niveau et la plage de reps ? Quelle marge d'erreur tolérer dans la classification ? | Classification des expositions | Marges au-dessus 1 et en dessous 2 | `strength.progression.aboveRirMargin`, `belowRirMargin` | P-NOV à P-AV | RS, ECR |
| F4 | Pour prescrire une série de reconnaissance, quel RIR supposer quand il n'est pas renseigné ? | Estimation de l'e1RM | `assumedRirWhenUnknown` = 0 | `strength.load` | Tous | LC (choix prudent à confirmer) |

## 5. Repos

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| RE1 | Repos inter-séries selon l'objectif (force, hypertrophie) et la classe d'exercice | Autorité repos (profil) | Plages `restS` | `strength.dose.base.*.restS` | P-DEB à P-AV | MA, RS |
| RE2 | Un repos court sous contrainte de temps compromet-il l'adaptation, et à partir de quand ? | Pression temporelle | Repos bas ; plancher du profil | `strength.dose.modifiers.restChoice` | Tous | RS |

## 6. Fréquence

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| FR1 | À volume égal, la fréquence par muscle (1, 2, 3 fois/semaine) change-t-elle l'adaptation ? | Partage du volume entre séances | Division du reste | `remainingShare` (mécanisme) | P-INT | MA |
| FR2 | Récence minimale entre deux expositions d'une même famille | Bandes de récence (G3) | [2, 5] jours | `strength.selection.recencyBandsDays` | Tous | LC (choix produit) |

## 7. Progression

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| P1 | Quels modèles de progression (linéaire, double, autorégulé) conviennent à chaque niveau, rôle et classe ? | `modelFor` | Matrice des modèles | `strength.progression.modelFor` | P-NOV à P-AV | RS, ECR, LC |
| P2 | Combien de séances réussies avant d'augmenter la charge ? | Preuves requises | 1 / 1 / 2 | `strength.progression.evidenceRequired` | Tous | LC, ECR |
| P3 | Gain de charge plausible par mésocycle selon le niveau (plafond) | Plafond de cycle | 15 % (≥ 1 pas) | `strength.progression.cycleCapFraction` | P-DEB à P-AV | RS (courbes de progression), LC |
| P4 | Après des échecs répétés, de combien réduire la charge et quand ? | Régression | −10 % après 2 échecs | `regressionFraction`, `regressAfterBelow` | Tous | LC, ECR |
| P5 | Quand déclarer une stagnation et changer d'exercice ? | Rotation | 3 maintiens | `stagnationHolds` | Tous | LC |
| P6 | À partir de quel rapport pas / charge une progression en charge devient-elle irréaliste ? | Choix du modèle (addendum V1.2 §4) | 0,1 | `coarseStepFraction` | Tous | LC (réalité matérielle) |
| P7 | Durée de vie d'une ancre avant rotation, et faut-il faire tourner les exercices à chaque mésocycle selon le niveau ? | Cycle de vie | 12/10/8/6 semaines ; rotation avancé seulement | `strength.tracks` | P-NOV à P-AV | RS (variation des exercices), LC |

## 8. Décharge (deload)

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| D1 | Une décharge planifiée est-elle bénéfique ? Réduire volume, intensité ou les deux ? De combien ? | Modificateur de phase | ×0,6 séries, +2 RIR | `strength.dose.modifiers.phase.deload` | P-INT, P-AV | RS, consensus d'experts, LC |
| D2 | Les novices ont-ils besoin de décharges planifiées ? | idem | Décharge appliquée à tous | idem | P-NOV, P-DEB | LC, PS |

## 9. Montée en charge (ramp-up)

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| U1 | Protocoles de séries de montée avant une charge lourde (nombre, % et reps par palier) | Bandes de montée | 1 à 4 paliers selon l'intensité | `strength.rampup.known` | P-DEB à P-AV | RS (échauffement spécifique), LC |
| U2 | Montée quand la charge de travail est inconnue (effort seulement) | Cas inconnu et effort | Paliers RPE | `strength.rampup.unknownSteps`, `effortSteps` | Tous | LC |
| U3 | Seuil de reps au-delà duquel une montée est superflue ; exercices exclus | Conditions | `maxWorkingReps` 8 ; classes et modèles | `strength.rampup` | Tous | LC |
| U4 | Durée et contenu de l'échauffement général | Blocs de mobilité | 180–300 s | `strength.session.mobility` | Tous, P-40+ | RS, PS |

## 10. Novice

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| N1 | Volume minimal efficace pour un novice (séries par exercice et par semaine) | Modificateur de niveau, cibles | −1 série (hors allocation) ; facteur 0,6 | `strength.dose.modifiers.level`, `strength.volume` | P-NOV | MA, RS |
| N2 | Limiter la complexité technique sous fatigue pour un novice : quelle règle ? | F7b, STR-V6 (**G1**) | Au plus 1 exercice technique, en principal seulement | `strength.novice.technicalUnderFatigue` | P-NOV, P-DEB | PS, LC |
| N3 | Plafond de compétence technique par niveau | F7 (**G1**) | 2 / 3 / 4 / 5 | `strength.selection.skillCeiling` | Tous | LC, PS |
| N4 | Première exposition : combien de séries de calibration, à quel RIR ? | Calibration | 2 séries, RIR 3 | `strength.calibration` | P-NOV, P-DEB | LC, ECR si disponible |

## 11. Avancé

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| A1 | Série lourde + séries allégées : fraction et nombre d'allégées | D-S7 | 3 × 0,9 | `strength.topSet` | P-AV | LC, ECR |
| A2 | Autorégulation par e1RM lissé contre pourcentages fixes chez l'avancé | Modèle autorégulé | Médiane et preuves requises 2 | `strength.progression`, `strength.load.smoothingWindow` | P-AV | RS, ECR |
| A3 | Deux exercices à charge axiale maximale dans une même séance : risque et bénéfice | Rétrogradation axiale | Au plus 1 | `strength.selection.axialHighMaxPerSession` | P-INT, P-AV | LC, RS (charge rachidienne) |

## 12. Entraînement concurrent / interférence

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| C1 | Délai entre une séance de force des membres inférieurs et une séance clé d'endurance (intervalles, sortie longue) pour limiter l'interférence | Fenêtre des voisines | 36 h | `strength.interference.neighborWindowHours` | P-CONC | MA (entraînement concurrent), RS, PS |
| C2 | Quelle réduction de dose (séries, RIR) autour d'une séance clé ? Quels exercices retirer (unilatéral, isolation des jambes) ? | Ajustement par structure | −1 série, +2 RIR, optionnels retirés | `strength.interference.perStructure` | P-CONC | RS, ECR, LC |
| C3 | Sollicitation du grip avant une séance HYROX ou de portés : exclusion et seuil | Grip | Exclusion ≥ 3 | idem (grip) | P-CONC (HYROX) | LC |
| C4 | Semaine inconnue : hypothèse prudente justifiée ? | Note `week_unknown` | Genou et hanche abaissés | `strength.interference.notes` | P-CONC | LC |

## 13. Autorégulation

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| AU1 | Ajustement selon l'état du jour (prudence, réduction) : efficacité et ampleur | Modificateur d'état | +1 RIR ; −1 série et +1 RIR | `strength.dose.modifiers.readiness` | Tous | RS, ECR |
| AU2 | État inconnu : prudent ou normal ? | `unknownReadiness` | as_normal | idem | Tous | LC (choix produit et sécurité) |
| AU3 | Combinaison de plusieurs modificateurs : somme ou le plus prudent ? | Politique de conflit | `most_conservative` | `conflictPolicy` | Tous | LC |

## 14. e1RM et estimation de charge

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| E1 | Précision des formules d'estimation du 1RM à partir de reps jusqu'à l'échec ; plage de reps valide | Estimation | Forme d'Epley ; 1–12 reps | `strength.load.e1rmDivisor`, `validRepRange` | Tous (sous-groupes par exercice) | RS, études de validation |
| E2 | Table % du 1RM selon les reps jusqu'à l'échec | Charges en % (STR-V3) | Table de 1 à 17 | `strength.load.pctByRepsToFailure` | Tous | RS, études de validation |
| E3 | Durée de validité d'une référence de charge (détraînement) | Fenêtres de confiance | 42 / 112 / 365 j | `strength.load.referenceWindowsDays` | Tous | RS (détraînement) |
| E4 | Transfert d'une charge entre variantes équivalentes (barre vers haltères, etc.) | Transfert limité | Pénalité d'un cran ; modèles transférables | `strength.load.equivalenceTransferPenalty`, `transferableLoadModels` | Tous | LC, études comparatives |
| E5 | Écart à partir duquel deux références (déclarée et mesurée) sont en conflit | Conflit | 15 % | `strength.load.conflictTolerance` | Tous | LC |

## 15. Séries maximales / sécurité

| # | Question | Règle | Décision | Paramètres | Population | Source |
|---|---|---|---|---|---|---|
| S1 | Conditions d'éligibilité à l'effort maximal (niveau, exercice, supervision) | STR-V7 (**G1**) | Seuil et éligibilité du catalogue | `strength.maxEffort.threshold`, `maxEffortEligibility` (catalogue) | P-INT, P-AV | PS, LC |
| S2 | Plafond de volume par séance (voir V6) | STR-V2 (**G1**) | Plafond par niveau | `strength.volume.sessionCap` | Tous | MA, RS |
| S3 | Faut-il interdire toute série de référence maximale en V1 ? (STR-V8 sans objet) | STR-V8 | Aucune série de référence maximale | — | Tous | PS |

---

## Paramètres hors pack

Ces paramètres ne relèvent pas d'une question de littérature. Ce sont des choix de conception, des réalités matérielles ou des décisions produit, à relire par un expert :

- `strength.needs`, `archetypes`, `goals`, `stimuli`, `exerciseClass`, `selection.criteriaOrder`, `selection.minLoadCeiling`, `selection.primaryLoadRequired`, `substitution.fallbackNeeds` (EXPERT_DESIGN_REVIEW) ;
- `strength.load.defaultIncrements`, `proposals.max` (TECHNICAL) ;
- `selection.recencyBandsDays` (PRODUCT_DECISION).
