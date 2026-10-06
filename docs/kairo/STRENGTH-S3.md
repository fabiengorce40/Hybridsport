# Strength S3 — programmation longitudinale de la musculation

Base : `397987e` (Beta 0, après S1, S2 et les correctifs « Modifier le programme »).
Ce lot ne crée **aucune** valeur sportive. Il branche les fonctions du moteur Strength qui existaient déjà mais n'étaient pas appelées en Beta 0 (ancres, frontière de semaine). Il ferme deux trous de données qui pouvaient produire une progression injustifiée, et il rend chaque décision longitudinale traçable.

## 1. Audit avant S3 (constats vérifiés)

| # | Constat | Effet réel | Classe |
|---|---|---|---|
| 1 | `createEnginePort.generate` envoyait `repetitionIntents: []` : aucune ancre n'était déclarée. | Les tracks d'ancre étaient créées, puis jamais appliquées. L'exercice principal était marqué « candidate » à chaque fois et sa charge ne progressait jamais (par exemple 40 kg × 4 semaines). | Bug de câblage |
| 2 | La graine Strength valait `planner:<requestId>:<date>` et changeait donc chaque semaine. | Les égalités parfaites (classement d'emplacement, choix CORE entre propositions `SELECT.TIE_BROKEN_BY_SEED`) se départageaient différemment d'une semaine à l'autre, ce qui changeait des exercices sans cause. | Bug de stabilité |
| 3 | `applyStrengthExecution` passait toujours `sessionCompleted: true`. | Une séance **abandonnée** était lue comme terminée. Une série manquante devenait un échec (`below` / `partial`) au lieu d'une interruption. | Bug |
| 4 | Une douleur déclarée pour la **séance** (chemin UI, `pain: REPORTED`) sans exercice coché n'était pas propagée. | Une exécution douloureuse pouvait faire progresser les tracks. | Bug de sécurité |
| 5 | `classifyExposure` ignorait la charge réalisée. | Avec 30 kg réalisés au lieu de 40 kg prescrits et les répétitions cibles, l'exposition était `on_target` et la charge progressait. | Bug de preuve |
| 6 | Aucune frontière de semaine (`resumeTrack`, `closureCause`, `anchorReviewDue`) n'était appelée. | Une track suspendue après une douleur restait suspendue pour toujours. Une ancre devenue inadmissible (matériel, exclusion) n'était jamais clôturée. | Bug de câblage |
| 7 | La phase transmise est un placeholder (`accumulation`, semaine 1/1). | Aucune périodisation. Pour un débutant, la politique de continuité (`cycleStartForPreferred`) se lit « début de cycle » chaque semaine. | Non résolu (BLOCKED) |
| 8 | Aucune représentation de « ce que la semaine Strength cherche à accomplir ». | Volume prévu ou réalisé, ancres et règles lues : rien n'était visible. | Manque d'architecture |

## 2. Architecture après S3

Trois niveaux de décision, tous possédés par **Strength** :

- **A. Composition de la semaine** (`composeStrengthWeek`, S1) : le rôle et l'archétype de chaque occurrence. La règle reste la règle candidate S1, inchangée.
- **B. Construction de la séance** (`proposeStrength`) : besoins, exercices, ordre, dose et charge. Nouveau : la raison `SELECT.CHOICE_GROUP` explique la résolution de chaque groupe de choix (cause : `anchor`, `not_in_session`, `least_recent_exposure`, `goal_priority`, `identifier` ou `only_member`). La décision elle-même ne change pas : les goldens S1–S7 ne gagnent que cette raison.
- **C. Progression longitudinale** (`progression.ts`) : elle est appliquée par le ProgressionEngine d'app-core après chaque réalisation (`applyStrengthExecutionTraced`) et à chaque frontière de semaine (`strengthWeekBoundary`).

Le lien entre A et B est la **prescription hebdomadaire** (`week-prescription.ts`, `StrengthWeekPrescription`). Elle porte :

- l'objectif, le niveau, l'archétype, le rang de l'occurrence et la fréquence déclarée ;
- les besoins requis ;
- les ancres déclarables ;
- le volume par groupe : plancher et haut du ruleset, prévu (séances placées plus tôt) et réalisé (7 jours) ;
- la provenance, c'est-à-dire le statut de chaque règle lue ;
- les capacités **bloquées**.

Elle est tracée dans chaque séance (`PLAN.WEEK_PRESCRIPTION`).

Les responsabilités restent séparées :

- le **Programme Engine** déclare l'objectif, la priorité et la fréquence ;
- le **Global Planner** place les séances, transmet le créneau, les voisines, les séances de la semaine et la fréquence déclarée (`sportSessions`, pour la trace) ;
- **Strength** compose, construit et progresse.

Le port Strength du planificateur ne fait que de la plomberie de contrat. Les ancres, les expositions prévues et la prescription sont calculées par `@hybridsport/strength`.

## 3. Stabilité des exercices

Le cycle est le suivant : sélection → exposition → historique → progression → maintien → remplacement justifié.

- **Ancres** : à la première exposition d'un emplacement principal, le ProgressionEngine crée une track d'ancre. Ensuite, le planificateur **déclare** les ancres actives de l'archétype (`declarableAnchors`, contrat CORE-EXT-4) : au plus une par groupe de choix, la moins récemment utilisée d'abord. Les séances **prévues** plus tôt dans la semaine comptent comme usage. En full body × 3, deux ancres d'un même groupe alternent donc (A/B) au lieu d'être clonées.
- **Accessoires suivis** (tier `tracked`, créés après `tier2AutoCreateAfter` expositions) : le critère `track` les maintient.
- **Accessoires non suivis** : ils tournent selon `strength.selection.repetitionPolicy`. Cette règle est **provisoire** : rotation par récence pour le niveau intermédiaire, répétition pour le niveau novice. Le terme B6 (variété) du vecteur d'optimisation s'y ajoute. C'est la **seule** source de changement d'exercice restante sans cause individuelle, et elle est listée comme décision humaine.
- **Graine** : `strength:<archétype>:<stimulus>:<rang de l'occurrence>`, identique d'une semaine à l'autre. Une égalité parfaite se départage donc toujours de la même façon : **la graine ne peut plus créer de variation**.
- **Remplacement justifié** : à la frontière de semaine, une track est clôturée (`PROGRESSION.TRACK_CLOSED`) quand son exercice devient inadmissible (matériel, exclusion, catalogue), ou en cas de stagnation (`consecutiveHolds ≥ stagnationHolds`, valeur du ruleset). La fin de mésocycle n'est jamais une cause, car la périodisation n'est pas gouvernée. Le remplaçant **n'hérite d'aucune charge** : sa source est la calibration, son historique propre ou une classe d'équivalence transférable du ruleset.

## 4. Progression (données réelles uniquement)

- Une réalisation est classée par `classifyExposure` sur les séries **réellement saisies** : `on_target`, `above`, `partial`, `below`, `interrupted`, `no_data`, `pain`, `safety_pause`, `substituted` ou **`load_deviation`** (nouveau en S3).
- **`load_deviation`** : la charge réalisée est inférieure à la charge prescrite, ou n'a pas été saisie alors qu'une charge était prescrite. Le résultat est un maintien tracé et aucun compteur n'est modifié. C'est une comparaison stricte à la prescription : aucune valeur n'a été ajoutée.
- Séance **abandonnée** : `sessionCompleted: false`, donc `interrupted` / `partial`, jamais un échec.
- **Douleur de séance** : chaque exercice est classé `pain` et sa track est suspendue. La reprise (`PROGRESSION.RESUMED`) se fait à la frontière de semaine, seulement après la levée explicite de la pause douleur.
- Les modèles (`linear_load`, `autoregulated`, `double_progression`, `set_progression`), le nombre de preuves requises, la régression après N échecs, le plafond par cycle et la granularité sont **tous** lus dans `strength.progression`, une règle provisoire Beta 0 inchangée.
- Chaque décision est auditée dans `programmeState.audit` : `PROGRESSION.EXPOSURE_CLASSIFIED`, `ADVANCED`, `HELD(cause)`, `REGRESSED`, `SUSPENDED`, `TRACK_CREATED`, `TRACK_CLOSED`, `RESUMED` et `REVIEW_DUE`.

## 5. Volume

Les bornes `strength.volume.weeklyRange[objectif][niveau][groupe]` (plancher / haut) sont une heuristique de programmation **provisoire**.

Le volume prévu (séances placées plus tôt) et le volume réalisé (7 jours) sont lus par `volume.ts`. Ils sont désormais visibles dans `PLAN.WEEK_PRESCRIPTION` (`belowFloor` / `atOrAboveHigh`).

Une séance « courte » a trois causes possibles, toutes tracées :

1. l'interférence avec une voisine d'une autre discipline : structures abaissées (`PLAN.STRUCTURE_LOWERED`) et besoins optionnels retirés (`SELECT.SLOT_OMITTED … interference`) ;
2. le haut soft déjà atteint par les séances prévues (`SELECT.SLOT_OMITTED … volume`) ;
3. le partage du plancher restant entre les séances restantes (`remainingShare`) et la durée (`… duration`).

Aucune valeur n'a été modifiée.

## 6. Interaction Running

Le chemin est inchangé : seconde passe du planificateur, voisines avec un profil de demande dérivé, puis `strength.interference` (provisoire).

Aucune nouvelle fenêtre de 24, 48 ou 72 h n'a été créée.

Effet observé (scénario B) : les structures `lower_knee` / `lower_hip` sont abaissées à côté des courses, et les besoins `iso_lower` / `single_leg` sont omis. Le volume des quadriceps et des ischio-jambiers reste donc sous le plancher.

La priorité du programme (Strength d'abord) n'est **pas** transmise au moteur Strength : les voisines restent `priority: 'standard'`. C'est une décision humaine.

## 7. Gouvernance

| Statut | Éléments |
|---|---|
| Approuvé | Aucun paramètre Strength n'est approuvé en Beta 0. Le contenu Beta 0 (`strengthContent`) est `draft` et provisoire. |
| Dérivé | `load_deviation` (définition d'une exposition conforme). Session abandonnée → interruption. Douleur de séance → douleur de chaque exercice. Graine stable. Déclaration d'ancres (contrat CORE-EXT-4). Expositions prévues comptées comme usage. Clôture « inadmissible ». |
| Provisoire (ruleset Beta 0, `draft`) | `strength.archetypes`, `strength.volume`, `strength.progression` (modèles, preuves, régression, plafond, `stagnationHolds`), `strength.tracks` (`tier2AutoCreateAfter`, `anchorMaxWeeks`), `strength.tracks.horizon` (`review`), `strength.selection.repetitionPolicy`, `strength.selection.recencyBandsDays`, `strength.interference`, `strength.proposals.max`, `core.optimization.epsilon`. La règle de composition S1 est candidate. |
| TEST_ONLY | Les saisies des scénarios et des cas adverses (`tests/longitudinal/s3-scenario.ts`) : charge de première exposition de 40 kg, RIR 2 par défaut, distance de course de 6 000 m, temps de TEST de 1 500 s. |
| Non résolu (BLOCKED) | `periodization` (phases, mésocycles, décharges), `split_beyond_candidate` (5 séances et plus), `same_discipline_recovery`, `load_conversion_between_exercises` (hors classe transférable), `planned_exercise_rotation`. Voir `STRENGTH_BLOCKED_CAPABILITIES`. |

## 8. Preuves

- Scénarios 4 semaines : `packages/app-core/tests/longitudinal/__reports__/strength-s3-scenario-a.md` (Strength seul) et `-b.md` (Strength + Running). Ils sont générés par le chemin réel de l'application, sans séance injectée.
- 26 cas adverses : `packages/app-core/tests/longitudinal/strength-s3-adversarial.test.ts`. Critère : aucune progression sans exposition probante tracée et aucune charge héritée.
- Briques du moteur : `packages/strength/tests/unit/s3-longitudinal.test.ts`.
- Persistance : `BETA0_PLANNING_VERSION = 'beta0-s3'`. Une semaine non commencée planifiée avant S3 est régénérée (`KAIRO.WEEK_REPLANNED_STALE`). Une semaine commencée est conservée telle quelle.
