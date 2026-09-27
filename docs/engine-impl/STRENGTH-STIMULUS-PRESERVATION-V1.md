# STRENGTH-STIMULUS-PRESERVATION-V1 — préservation du stimulus

> Phase 4F, correction 2 du contre-audit. Paramètre facultatif `strength.session.stimulusPreservation` (G2, `EXPERT_DESIGN_REVIEW`), présent dans le ruleset `0.4.0-strength-science-lock`. Absent en 0.2.0 et en 4E : le comportement de ces rulesets reste reproduit à l’identique (tests F1, F2).

## 1. Problème constaté (4E, S2)

- **Origine** : en 4E, la politique de durée (échauffement supplémentaire et retour au calme après les optionnels) a libéré du temps.
- **Mécanisme** : l’ordre existant d’ajout des optionnels (étape 2 : un exercice par emplacement ; étape 3 : exercices supplémentaires jusqu’à `count.max`) a fait entrer le Pallof (tronc, priorité de stimulus **basse**) avant le 2ᵉ exercice d’isolation du haut du corps (pec deck, priorité **plus haute**), qui ne tenait plus.
- **Conséquence** : pectoraux **5 → 2** séries difficiles dans une séance d’hypertrophie haut du corps.
  - Aucune revendication scientifique ne justifie ce résultat.
  - C’était un effet d’ordre, sans raison traçable.

## 2. Règle générale (aucun quota musculaire)

Après les étapes 2 et 3, pour chaque optionnel **omis faute de temps**, le moteur examine le retrait d’un optionnel déjà placé de **plus basse priorité de stimulus**, du moins prioritaire au plus prioritaire.

L’échange (ajouter l’omis, retirer l’autre) n’est accepté que si **toutes** les conditions suivantes sont réunies :

1. **Priorité de stimulus** : l’omis précède le retiré dans l’ordre déjà déclaré par le ruleset.
   - C’est le rang de l’emplacement dans la résolution des optionnels : `optionalOrder` du stimulus, puis `needPriority` de l’objectif.
   - Il traduit l’intention de séance ; aucune nouvelle valeur n’est introduite.
2. **Perte disproportionnée évitée** : sur au moins un de ses groupes primaires, l’omis apporte **au moins autant** de séries difficiles que **tous les autres exercices réunis**.
   - Autrement dit, sans lui, ce groupe perdrait la majorité de sa dose de séance.
   - C’est une comparaison ordinale, sans seuil chiffré. Elle tient compte des autres exercices qui couvrent déjà la cible.
3. **Couverture conservée** : aucun groupe primaire de l’optionnel retiré ne tombe à zéro série difficile (primaire ou secondaire) dans la séance.
4. **Durée** : la séance échangée tient dans le budget (mêmes règles de durée que tout ajout).
5. **Éligibilité** : l’optionnel retiré n’est ni requis, ni porteur d’une track (ancre ou suivi).

Options examinées par le moteur, dans cet ordre :

- conservation de l’omis par retrait d’un optionnel moins prioritaire (échange) ;
- sinon, **aucun ajout supplémentaire** : le temps n’est jamais forcé.

La réduction des séries d’un optionnel est déjà assurée par la contrainte de temps (plancher du profil).

## 3. Trace

- `SELECT.STIMULUS_PRESERVED {slot, exerciseId, removedSlot, removedExerciseId, groups, sets, otherSets}` ;
- `SELECT.SLOT_OMITTED {slot: <retiré>, cause: 'stimulus_preservation'}` ;
- l’omission initiale de l’optionnel conservé (cause `duration`) est retirée de la trace, car elle n’est plus vraie.

## 4. Résultat sur les goldens (4E → 4F)

| Séance | Effet |
|---|---|
| S2 | Pec deck (`up.iso_upper.2`, 3 séries) conservé ; Pallof retiré (tronc couvert en secondaire : 1,5). Pectoraux **2 → 5**, tronc 5,5 → 1,5. Le retour au calme retrouve sa place (l’échauffement complet était déjà présent). |
| S1 | 2ᵉ isolation du haut omise faute de temps. **Pas d’échange** : retirer le mollet supprimerait la seule couverture des mollets (condition 3). |
| S3–S7 | Aucun échange : aucune perte disproportionnée. |

## 5. Garde-fous testés

- **F3** : S2 retrouve la dose pectorale du ruleset 0.2.0.
- **F4** : la trace nomme l’échange.
- **F5** : aucun échange en S1 (couverture) ni en S3–S7, et aucun identifiant de groupe musculaire dans `engine.ts`. La règle est générale.

## 6. Limites

- Le critère « majorité de la dose » est un **choix de conception** (`EXPERT_DESIGN_REVIEW`), sans fondement quantitatif.
- L’échange n’examine qu’un optionnel retiré à la fois, sans recherche combinatoire.
- Le volume hebdomadaire n’entre pas dans le critère : la cible hebdomadaire reste l’autorité des séries (allocation), inchangée.
