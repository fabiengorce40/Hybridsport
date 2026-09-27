# STRENGTH ENGINE SPECIFICATION V1

> Statut : **V1 implémentée et verrouillable** (phases 4B–4C). Ordre de précédence : addendum V1.2 (doc 10) > addendum V1.1 (doc 09) > V1 (docs 01–08).
> Référence normative : [TRAINING ENGINE SPECIFICATION V1.2](../engine-spec/README.md) et [frontière SportEngine / CORE](../engine-impl/SPORT-ENGINE-BOUNDARY.md).
> **Aucune valeur sportive n'est figée ici.** Toute valeur numérique d'entraînement est un paramètre du ruleset, en classe G1 ou G2 selon le cas. Les chiffres cités en exemple viennent des hypothèses déjà présentes dans la spec V1.2 (doc 06 §1) et restent `provisional` jusqu'à la relecture experte.

## Sommaire

| # | Document | Sections demandées |
|---|----------|--------------------|
| 01 | [Périmètre, entrées, sorties, pipeline](01-scope-io-pipeline.md) | 1 scope · 2 inputs · 3 outputs · 4 pipeline |
| 02 | [Archétypes et emplacements](02-archetypes-slots.md) | 5 archetypes · 6 slots |
| 03 | [Sélection, ancres, modalités, substitutions](03-selection-anchors-substitutions.md) | 7 exercise selection · 8 anchors · 16 machines/cables/free weights · 17 substitutions |
| 04 | [Dosage, charge, montée en charge](04-dosage-load-rampup.md) | 9 dosage · 10 load prescription · 11 ramp-up |
| 05 | [Progression, volume, multisport, durée](05-progression-volume-multisport-duration.md) | 12 progression · 13 volume · 14 multi-sport · 15 duration |
| 06 | [Niveaux, feedback, échecs, reason codes](06-levels-feedback-failures-codes.md) | 18 beginner/advanced · 19 feedback · 20 failure modes · 21 reason codes |
| 07 | [Paramètres, règles G2, risques, décisions ouvertes](07-parameters-g2-risks-decisions.md) | 22 ruleset parameters · 26 G2 rules · 27 risks · 28 unresolved decisions |
| 08 | [Tests, profils golden, simulations longitudinales](08-tests-golden-longitudinal.md) | 23 tests · 24 golden profiles · 25 longitudinal |
| 09 | [**Addendum V1.1 — contrats et décisions ouvertes**](09-addendum-v1-1-contract-review.md) (prévaut sur la V1) | CORE-EXT-1 à 3, ancres, D-S1 à D-S8 |
| 10 | [**Addendum V1.2 — validation finale**](10-addendum-v1-2-final-validation.md) (prévaut sur la V1 et la V1.1) | Trois autorités, écarts 1–7, contrat planificateur CORE-EXT-4, préréglages |

## Principe

Le StrengthEngine programme une séance comme **une composante d'un programme**, pas comme un remplissage de durée :

```
ATHLETE → GOAL → PHASE → WEEK CONTEXT → SESSION INTENT → ARCHETYPE → MOVEMENT NEEDS → SLOT REQUIREMENTS
→ EXERCISE CANDIDATES → EXERCISE SELECTION → DOSAGE → RAMP-UP → REST → DURATION
→ (CORE) DUPLICATE ANALYSIS → (CORE) VALIDATION
```

**Le StrengthEngine propose ; le CORE valide.** Il ne place pas les séances (rôle du GlobalPlanner), ne résout pas les interférences entre disciplines (InterferenceManager), ne se déclare jamais valide et ne réimplémente ni l'anti-doublon, ni la durée, ni la validation, ni la réparation du CORE.

## Règle de conception

Chaque mécanisme répond à la question « **quelle erreur réelle de programmation empêche-t-il ?** ». Le moteur reste volontairement petit :

| Élément | Nombre | Pourquoi pas davantage |
|---------|--------|------------------------|
| Archétypes | 4 | Les accents (force, hypertrophie, soutien) relèvent du dosage, pas de la structure |
| Besoins de mouvement | 11 | Chacun correspond à un pattern du catalogue ; « principal », « secondaire » et « accessoire » sont des rôles, pas des besoins |
| Rôles d'emplacement | 3 | — |
| Modèles de progression | 4 | Les autres sont des variantes ou relèvent d'une version ultérieure |
| Modificateurs de dosage | 6 | Chacun est tracé par un reason code |

Aucun moteur biomécanique, modèle physiologique, score de récupération ni appel à une IA générative.

## Prérequis CORE (décision attendue)

L'analyse fait apparaître **trois manques du contrat CORE** qui empêcheraient d'implémenter correctement la musculation. Ils sont décrits dans [07 §4](07-parameters-g2-risks-decisions.md#4-décisions-non-résolues), sous le nom **CORE-EXT-1 à 3**, avec pour chacun une proposition d'extension minimale et additive. Conformément à la consigne, **le CORE n'est pas modifié** : ces extensions attendent la validation.

| Id | Manque | Conséquence sans extension |
|----|--------|----------------------------|
| CORE-EXT-1 | `SetPrescription` n'a ni charge, ni RPE, ni tempo, ni plage de répétitions. Les items n'ont ni emplacement, ni track d'ancre, ni alternatives | Impossible de prescrire une charge ou de rattacher une série à une ancre |
| CORE-EXT-2 | `SportEngineInput` ne transmet ni les capacités, ni les tracks de progression, ni les expositions E1, ni le contexte de la semaine | Impossible de doser, de progresser ou de coordonner la semaine |
| CORE-EXT-3 | `propose()` ne peut pas renvoyer « aucune proposition + raisons » | `NO_VALID_PROPOSAL` perd ses reason codes (principe d'explicabilité) |

## Gate

**`STRENGTH_SPEC_GATE = READY_FOR_REVIEW`**

Ce statut signifie que la spécification est complète pour la revue. Il **ne signifie pas** :
- que les paramètres G2 sont approuvés ;
- que les extensions CORE-EXT-1 à 3 sont acceptées ;
- que l'implémentation peut commencer.
