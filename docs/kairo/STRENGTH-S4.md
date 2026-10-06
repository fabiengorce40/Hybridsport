# Strength S4 — continuité, preuve de progression, priorité multisport, historique

Base : `9d73968` (S3). Aucune valeur scientifique nouvelle : S4 corrige des défauts d'architecture démontrables, ajoute des contrats et laisse fail-closed ce qui demande une décision scientifique.

## 1. Pourquoi les accessoires tournaient (audit)

| Mécanisme | Provenance / statut | Effet avant S4 |
|---|---|---|
| `strength.selection.repetitionPolicy` | `EXPERT_DESIGN_REVIEW`, principe P10 (« continuité forte chez le novice, préférée chez le débutant, variation contrôlée ensuite », `SRC.KASSIANO_2022`, CONTEXT_DEPENDENT) | Niveau intermédiaire = `rotate` : le critère `recency` (bandes `recencyBandsDays` [2, 5] j, provisoires) préfère la famille la **moins** récente. Les raisons de rotation (non aimé, stagnation) n'étaient lues que pour novice et débutant. |
| B6 « variété » (vecteur d'optimisation Strength) | Spec 01 §5, code du moteur, sans paramètre | Récompense les familles jamais vues dans l'historique, pour tout exercice ni ancré ni suivi. |
| Propositions alternatives (`strength.proposals.max` = 2) et choix du CORE | Contrat CORE ; ε(B6) = 0 | Quand B1 à B5 sont à égalité, l'alternative qui change un accessoire l'emporte au B6. Une égalité complète est tranchée par la graine (stable depuis S3). |
| **Défaut** : alternative par identifiant d'emplacement | Bug | Un emplacement répété (ex. `lo.iso_lower` ×2) était varié sur **toutes** ses instances, y compris celle de l'accessoire suivi (leg curl ↔ leg extension chaque semaine). |
| Cercle vicieux de suivi | Conséquence | Un accessoire n'est suivi qu'après 2 expositions dans le même emplacement (`tier2AutoCreateAfter`). La rotation l'en empêchait. |

## 2. Contrat de continuité (S4)

- **Décision produit** (utilisateur, S4) : « continuité > variété artificielle ». Le programme la déclare dans le contexte Strength : `continuity: 'keep_incumbent'` (`BETA0_STRENGTH_CONTINUITY`, app-core). Absente, le comportement du moteur est inchangé : goldens S1–S7 identiques. Le ruleset scientifique n'est pas modifié.
- **Exercice en place** d'un emplacement : les exercices de la dernière séance réalisée de cet emplacement. Pour un emplacement répété, chaque instance reprend un exercice en place encore libre ; l'accessoire suivi passe d'abord.
- **Il est conservé** s'il reste admissible (filtres F1–F10), si aucune ancre déclarée ni aucun accessoire suivi différent n'occupe l'emplacement, et si aucune raison de rotation du ruleset ne s'applique. Ces raisons (non aimé, stagnation, note `planned_variation`) sont désormais lues **quel que soit le niveau**.
- **Sinon le remplacement est tracé** : `SELECT.CONTINUITY {slot, incumbent, chosen, outcome: 'replaced', cause}`. La cause est l'une des suivantes :
  - le premier filtre éliminatoire (`F3_equipment`, `F5_pain`, `F6_user_exclusion`, `F9_context`…) ;
  - `declared_anchor` ;
  - `tracked_exercise` ;
  - `family_in_session` ;
  - `rotation_reason:<raison>`.
- **Exercices conservés** : ils sont résumés en une raison par séance (`SELECT.CONTINUITY_KEPT`).
- **Variété** : un exercice conservé n'est jamais varié par une alternative, et B6 ne mesure plus que les exercices libres.
- **Alternatives** : elles visent une **instance** d'emplacement (`slotId#k`), plus jamais toutes les instances.
- **Ce qui reste admis** : l'alternance A/B des groupes de choix (variation systématique, P10) et le départage par la graine stable à la première exposition.

Catégories : ancre déclarée (principal, progression appliquée), accessoire suivi (track `tracked`), exercice en place (stable mais non principal), exercice libre (aucune exposition dans l'emplacement). La 3ᵉ catégorie se réduit à « dernière exposition de l'emplacement » : aucun nouvel état persistant. Elle devient « suivi » après 2 expositions, par la règle existante.

## 3. Modèle de progression réellement utilisé

Les règles proviennent de `strength.progression` (draft, `internal_hypothesis`). Le modèle dépend du niveau, du rôle de l'emplacement et de la classe d'exercice :

| Niveau | Principal (polyarticulaire lourd) | Principal (autre) | Secondaire | Accessoire |
|---|---|---|---|---|
| novice / débutant | `linear_load` (+1 pas après 1 preuve) | `linear_load` | `linear_load` (lourd) / `double_progression` | `double_progression` |
| intermédiaire / avancé | **`autoregulated`** (2 preuves) | `double_progression` | `double_progression` | `double_progression` |

- **`double_progression`** : +1 répétition au minimum de la plage par preuve. Une fois le haut de plage atteint : +1 pas de charge, retour au bas de la plage. Un refus pour granularité du matériel est compté comme stagnation. Une **réussite exacte suffit**.
- **`autoregulated`** (développé couché, squat chez l'intermédiaire) : la charge suit une estimation e1RM calculée sur la séance réalisée (médiane avec l'estimation précédente), puis `pctByRepsToFailure[reps + RIR]`, arrondie au pas inférieur. Une réussite **exacte** reproduit la même charge (≈ +1,3 % avant arrondi, absorbé par l'arrondi) : c'est une **conséquence du modèle**, pas un bug. Ce modèle exige une marge **mesurée** : répétitions au-delà de la cible ou RIR saisi au-dessus de la cible.
- **Dépendance cachée (constat S4)** : l'interface Beta 0 **ne saisit pas le RIR**, et le ruleset suppose un RIR de 0 quand il manque (`assumedRirWhenUnknown`). Exemple : avec 40 kg × 6 réussis exactement, la charge ne monte qu'à partir d'environ 10 répétitions réalisées.
- **Contrat de preuve** (`exposureEvidence`) : séries, écart de répétitions, de charge et de RIR (`null` si non saisi), `success: exact | exceeded | none`. Il est audité dans `PROGRESSION.EXPOSURE_CLASSIFIED`.
- **Réussite exacte d'un modèle autorégulé** : `PROGRESSION.DECISION_BLOCKED {situation: 'exact_success', capability: 'exact_success_progression', rir}`. Le moteur ne hausse rien, mais **sait** que la prescription a été réussie.
- **Poids du corps en haut de plage** : `PROGRESSION.METHOD_UNGOVERNED {repsReached, methods}`. Les méthodes listées sont celles que le catalogue rend possibles : lest si `bodyweight_plus`, variante si une famille de progression existe, nouvelle plage, maintien. Aucune n'est choisie, et ce signal remplace un `CAP_REACHED` opaque.

## 4. Priorité multisport

- **Transport** : ordre des demandes du programme → `SlotRequest.sportPriority` (planificateur, sans interprétation) → `sportPriority.order` dans le contexte Strength → trace `PLAN.SPORT_PRIORITY {order, strengthRank, neighbours, policy: 'blocked:priority_interference_policy'}`.
- **Politique** : aucune n'est gouvernée. La séance est **identique** quelle que soit la priorité (testé). Le champ `priority` des voisines (`key` / `standard` / `optional`) est l'**importance de la séance voisine**, une autre notion. Le planificateur le transmet toujours en `standard`.
- **Égalité** : le contrat du programme est un ordre total. Une égalité n'est pas représentable, et aucune n'est inventée.

## 5. Volume : cible, réalisé, contrainte

- Le plancher de `strength.volume.weeklyRange` est une **cible** (« plancher TARGET, haut SOFT », L5), pas un minimum obligatoire.
- `assessStrengthWeekVolume` donne le statut par groupe :
  - `achieved` : cible atteinte ;
  - `reduced_by_constraint` : sous la cible, avec au moins une contrainte tracée dans la semaine ;
  - `unmet` : sous la cible, sans contrainte tracée ;
  - `no_target` : aucune cible gouvernée.
- Il donne aussi le statut d'objectif de la semaine : `satisfied`, `partially_satisfied`, `not_satisfied` ou `blocked` (séances demandées, aucune planifiée).
- Contraintes relevées : `interference` (structure, voisine), `slot_omitted:<cause>`, `sessions_not_planned`.
- Le bilan est audité à chaque planification (`KAIRO.STRENGTH_WEEK_VOLUME`) et lisible via `strengthWeekVolume(state, weekStart)`. L'attribution d'une série manquante à une contrainte précise n'est pas revendiquée : les contraintes sont relevées au niveau de la semaine.

## 6. Historique et taille de l'état

**Mesure.** JSON compact de `saveState`, en Kio, sur le même banc (Strength 3×/semaine + Running 3×/semaine, chemin de l'application) :

| | 4 sem. | 12 sem. | 26 sem. | 52 sem. |
|---|---|---|---|---|
| S3 | 291 | 894 | 1 957 | 3 931 |
| S4 | 271 | 741 | 1 554 | 3 064 |

Les « 746 Ko » cités en S3 étaient l'export **indenté**. Décomposition S4 : `packages/app-core/tests/longitudinal/__reports__/state-size.md`.

**Données chaudes**, lues par la génération et jamais touchées : profil, programme et son audit, expositions, tracks, empreintes, historique Running, contenu des séances (historique visible) et semaine précédente complète (`recentOf`).

**Allègement à la source** : ce qui est recalculable depuis la séance n'est plus persisté (`DOSE.VOLUME_ALLOCATED`, `PROGRESSION.ANCHOR_APPLIED`). Les conservations par continuité sont résumées en une raison par séance. `REVIEW_DUE` est signalé une fois par track.

**Compaction** (`history.ts`, appliquée par `ensureBeta0Week`) :

- **Déterministe et idempotente.**
- **Périmètre** : semaines du programme clôturées, sauf la dernière.
- **Retiré** : une liste fermée de codes intermédiaires ou recalculables (analyse anti-doublon, confiance de charge, évaluation d'interférence structure par structure, plomberie du planificateur), plus `demand` et `neighbourContext`.
- **Perte explicite** : chaque séance compactée porte `KAIRO.HISTORY_COMPACTED`.
- **Conservé** : décisions (choix, continuité, progression, provenance de charge, interférence retenue, composition, prescription, refus) et tout code inconnu.
- **Équivalence testée** (état complet vs compacté) : même semaine générée, mêmes tracks, même audit, même historique visible, mêmes vues de semaine, même intégrité, export / import.

## 7. Fail-closed (`STRENGTH_BLOCKED_CAPABILITIES`)

- `periodization`
- `split_beyond_candidate`
- `same_discipline_recovery`
- `load_conversion_between_exercises`
- `planned_exercise_rotation`
- **`priority_interference_policy`**
- **`exact_success_progression`**
- **`bodyweight_overload_method`**

## 8. Preuves

- Rapports : `__reports__/strength-scenario-a.md`, `strength-scenario-b.md`, `state-size.md`.
- Tests :
  - `strength-s4-adversarial.test.ts` (app-core) ;
  - `s4-continuity-evidence.test.ts` (Strength) ;
  - S3 adversarial (inchangé, vert).
- Persistance : `BETA0_PLANNING_VERSION = 'beta0-s4'`. Une semaine non commencée est régénérée ; une semaine commencée est conservée telle quelle.
