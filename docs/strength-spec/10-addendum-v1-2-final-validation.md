# Addendum V1.2 — validation finale de la V1 Musculation (phase 4C)

> Statut : **normatif**. Il prévaut sur la V1 (docs 01–08) et sur l'addendum V1.1 (doc 09) pour tout ce qu'il traite. Les passages amendés portent la mention « Amendé par l'addendum V1.2 ».
> Les écarts 1 à 7 du rapport de phase 4B sont acceptés comme direction. Chacun est formalisé ici avec sa règle, sa justification, ses tests de régression et les règles antérieures qu'il remplace.
> Les valeurs citées restent des **paramètres provisoires** du ruleset de test.

## §1 — Écart 1 : les trois autorités de la prescription

| Autorité | Décide | Ne décide jamais |
|---|---|---|
| **TRACK** (ProgressionEngine) | Charge, répétitions (ou plage de répétitions) et état de progression (compteurs, e1RM lissé, statut) | Séries, RIR |
| **ALLOCATION DU VOLUME** (StrengthEngine, cibles hebdomadaires du ruleset) | Nombre de séries de travail, bornées par le profil de dosage | Charge, reps, RIR |
| **STIMULUS + MODIFICATEURS** (profil de dosage et modificateurs : niveau, phase, état, interférence) | Cible d'effort (RIR) et repos | Charge, reps |

Règles :

- **R1-a.** `nextPrescription.sets` et `nextPrescription.rir` sont **informatifs** : le StrengthEngine ne les relit jamais pour les séries ni le RIR prescrits (`dose.ts`).
- **R1-b.** Le RIR de référence stocké dans une track est celui du **profil de base**, sans modificateur ni valeur de calibration (`createTrack`). Il ne sert qu'au modèle autorégulé et au contrôle de granularité.
- **R1-c.** Quand les séries viennent de l'allocation du volume, le modificateur de niveau **n'enlève pas** de série : les cibles hebdomadaires sont déjà à l'échelle du niveau. Les modificateurs de phase, d'état et d'interférence s'appliquent **une fois**. Le niveau agit toujours sur le RIR.
- **R1-d.** Chaque modificateur est tracé exactement une fois par exercice (`DOSE.MODIFIED`).
- **R1-e.** Les répétitions viennent de la prescription de la track, sinon de la plage de la track (double progression), sinon du profil.

Justification : l'application en double faisait dériver le RIR séance après séance (3 → 5 → 6), puis les classements « en dessous » déclenchaient des régressions en boucle. Le niveau était aussi compté deux fois pour les novices, qui restaient sous le plancher hebdomadaire (simulations longitudinales, phase 4B).

Tests de régression :

- `tests/unit/authorities.test.ts` (4 tests : chaque autorité, et un contrôle de bout en bout avec une ancre dont la track porte sets = 9 et RIR = 9) ;
- `load-dose-rampup.test.ts` : « la track fixe les reps, jamais les séries ni le RIR » et « le niveau ne retire pas une série de plus » ;
- `progression.test.ts` : « RIR de référence = profil de base (jamais le RIR de calibration) » ;
- `tests/architecture/strength-architecture.test.ts` : « le dosage ne relit jamais séries ni RIR de la track ».

Règles remplacées : doc 09 §5, diagramme « prescription = track.nextPrescription (maintient) » et tableau « Maintenir la prescription ». Le StrengthEngine applique la charge et les reps de la track, pas l'intégralité de `nextPrescription`.

## §2 — Écart 2 : critères ordinaux `load_adequacy` et `volume_fit`

- **`load_adequacy`** : un exercice dont `loadCeiling` est inférieur à `strength.selection.minLoadCeiling[level]` est classé derrière les exercices chargeables. Il reste choisissable s'il n'existe rien d'autre : c'est un critère ordinal, pas un filtre. Il lit une **propriété** de l'exercice, jamais sa classe d'équipement.
- **`volume_fit`** : le vecteur `[− groupes qui dépasseraient le haut hebdomadaire, + groupes encore sous le plancher]`. Un ajout **optionnel** dont **tous** les groupes primaires dépasseraient le haut est omis (`SELECT.SLOT_OMITTED{cause: volume}`). Un polyarticulaire utile à au moins un groupe reste admis.
- Leur position dans l'ordre lexicographique est un paramètre G2 (`strength.selection.criteriaOrder`).

Justification :

- revue des goldens : fente au poids du corps chez un avancé ;
- simulation : bras à 24 séries/semaine pour un haut de 14, pectoraux sous le plancher en hypertrophie.

Tests :

- `archetypes-selection.test.ts` : « load_adequacy… » et « ANTI-BIAIS (métamorphique) » ;
- goldens S2 (pec deck choisi par `volume_fit`) et S5 ;
- simulations : aucune isolation optionnelle superflue au-delà du haut.

Règles remplacées : doc 03 §7.2. La liste des critères est complétée ; le principe « ni somme pondérée ni bonus » est inchangé et vérifié par un test d'architecture.

## §3 — Écart 3 : filtres F2b et F10

- **F2b** (V1) : seules les prescriptions `sets`, `hold` (gainage) et `distance` (porté) sont candidates. Le gainage est prescrit en `hold`, le porté en `intervals` sur une distance (`strength.dose.nonRep`).
- **F10** : pour les stimuli listés dans `strength.selection.primaryLoadRequired` (G2), le travail **principal** exige `loadCeiling ≥ minLoadCeiling[level]`. Sans candidat, le refus est explicable (`SELECT.NO_CANDIDATE_FOR_SLOT`, donnée manquante `catalog_coverage`).

Justification : une séance « lourde » avec un air squat comme principal pour un intermédiaire est manifestement mauvaise. La faisabilité est **calculée depuis les capacités réelles**, sans dépendre d'un nom de préréglage (§9).

Tests : `engine.test.ts`, « stimulus lourd sans exercice chargeable… » (le novice reste admis) ; F10 visible dans la trace de S5 (air squat filtré).

## §4 — Écart 4 : choix du modèle de progression (pas grossier)

- `progressionModelFor` (module `models.ts`, partagé par le moteur et le ProgressionEngine) part de `strength.progression.modelFor[level][role][exerciseClass]`.
- Si le modèle est `linear_load` ou `autoregulated` et que le **pas réalisable / charge** dépasse `strength.progression.coarseStepFraction` (G2), le modèle retenu est `double_progression`.
- En double progression, un saut de charge que la séance mesurée classerait d'avance « en dessous » est refusé (`PROGRESSION.HELD{cause: granularity}`, stagnation comptée).

Justification : haltères de 2 kg sur 12–14 kg, soit des sauts de +14 à +50 % ; la simulation montrait 16 à 27 % de séries impossibles.

Tests : `progression.test.ts`, « pas grossier… double progression » et « saut de charge refusé… (granularité) », sans régression sur le pas ordinaire 30 → 32 kg.

Règles remplacées :

- doc 05 §12 (« le choix du modèle se fait par track : modelFor ») : il se fait par `progressionModelFor` ;
- doc 09 §5 (« choisi à sa création par modelFor ») : même amendement.

## §5 — Écart 5 : cycle de vie des tracks

- **`resumeTrack(track, painCleared)`** : une track suspendue (douleur, pause de sécurité) reprend **telle quelle** à une frontière de semaine quand la douleur est levée (`PROGRESSION.RESUMED`). Elle ne baisse jamais : une suspension n'est pas un échec.
- **`startCycle(track)`** : à la frontière de mésocycle, une track conservée prend sa charge courante comme référence du plafond de gain par cycle (`PROGRESSION.CYCLE_STARTED`).
- **Plafond de gain par cycle** : jamais inférieur à un pas réalisable.
- **`strength.tracks.rotateAtMesocycleEnd`** devient **par niveau** (test : novice, débutant et intermédiaire gardent leurs ancres jusqu'à `anchorMaxWeeks` ; l'avancé tourne à chaque mésocycle). Ce paramètre implémente la « rotationPolicy » de la V1.

Justification (simulation) :

- une track suspendue n'était plus jamais appliquée ;
- une ancre conservée restait bloquée au plafond du premier cycle ;
- 12 kg × 1,15 < 12 + 2 kg bloquait toute progression ;
- rotation toutes les 4 semaines chez le débutant, contradictoire avec `anchorMaxWeeks`.

Tests : `progression.test.ts`, bloc « cycle de vie : reprise après suspension et nouveau cycle », « plafond… au moins un pas » et `closureCause` par niveau.

Règles remplacées : doc 03 §8 et doc 07 (`strength.anchor.maxWeeks` / `rotationPolicy`) → `strength.tracks.anchorMaxWeeks` et `strength.tracks.rotateAtMesocycleEnd[level]`.

## §6 — Écart 6 : groupes de choix

- Un groupe de choix retient, dans l'ordre :
  1. le membre portant l'**ancre déclarée** ;
  2. les membres **faisables** (au moins un candidat) ;
  3. le besoin non encore couvert dans la séance ;
  4. la **date** de dernière exposition du besoin la plus ancienne (jamais un nombre d'expositions) ;
  5. la priorité de l'objectif.
- **Couverture** : un groupe est couvert dès qu'un membre a un candidat. Seuls les emplacements **requis** doivent l'être (`strengthArchetypeIssues`). Les autres contrôles du CORE (leviers, structure) restent appliqués tels quels.

Justification :

- haltères seuls : le tirage vertical était choisi sans barre, avec un repli mal étiqueté ;
- l'alternance par nombre d'expositions saturait selon la quantité d'historique transmise.

Tests : `archetypes-selection.test.ts`, « groupe de choix… », « haltères seuls + tirage horizontal récent… » et la couverture des 4 archétypes.

## §7 — Écart 7 et §8 : contrat planificateur (CORE-EXT-4)

- **CORE-EXT-4** : `SportEngine.validateIntent(input)` est une fonction pure, optionnelle et générique. Le CORE l'exécute **avant** `propose`, sur l'intention et le contexte de discipline déjà validé. Toute raison ⇒ `INVALID_INPUT` déterministe, étape de trace `intent_contract`. Une exception ⇒ `INVALID_INPUT` technique.
- **Contrat Musculation** (`intent-contract.ts`) :
  - **une seule ancre déclarée par groupe de choix (ou par emplacement) et par séance**, sinon `PLAN.ANCHOR_CHOICE_GROUP_CONFLICT{group, trackIds}` (identifiants triés : refus identique quel que soit l'ordre de déclaration) ;
  - une ancre déclarée désigne une track **existante**, de tier `anchor`, **active**, du **même archétype**, sur un emplacement de cet archétype, sinon `PLAN.ANCHOR_NOT_DECLARABLE{trackId, cause}` ;
  - défense en profondeur : `proposeStrength` appelé directement avec un contrat violé lève une erreur (défaut technique). Le moteur ne choisit **jamais** arbitrairement une ancre.
- **Alternance** : c'est au planificateur d'alterner les membres d'un groupe d'une séance à l'autre. Une exposition d'une ancre non déclarée reste une donnée d'apprentissage pour le ProgressionEngine. Seule l'exemption anti-doublon exige la déclaration.
- `PROGRESSION.ANCHOR_NOT_APPLICABLE` reste tracé pour le cas résiduel d'une ancre valide dont l'emplacement n'est pas retenu (membre infaisable avec le matériel du jour).

Justification : la règle vivait seulement dans le simulateur ; deux ancres incompatibles pouvaient atteindre le moteur, qui en ignorait une silencieusement.

Tests :

- CORE : `sport-engine-boundary.test.ts`, bloc « CORE-EXT-4 » (3 tests) ;
- Musculation : `engine.test.ts`, bloc « contrat planificateur » (4 tests).

## §9 — Préréglage de matériel : décision B

**Question.** Le préréglage (preset) est-il une information de programmation (A) ou un raccourci pour construire la liste réelle d'équipements (B) ?

**Analyse** : toutes les décisions du moteur se prennent depuis l'équipement réel et les propriétés des exercices.

| Décision | Donnée utilisée |
|---|---|
| Candidats | `catalog.isFeasibleWith(exercise, équipement réel)` (F3) |
| Faisabilité d'un emplacement ou d'un groupe | Au moins un candidat après F1–F10 |
| Faisabilité « charge suffisante » d'un stimulus lourd | `loadCeiling` par rapport au niveau (F10) |
| Incréments et plafonds de charge | Équipement déclaré (`equipmentIncrements`) ou modèle de charge |
| Couverture du catalogue par archétype (audit) | Équipement de chaque préréglage **déclaré** faisable |

Aucune décision ne requiert le nom du préréglage. Un comportement spécial « parce qu'il s'appelle bodyweight » serait faux : un « bodyweight » enrichi d'un gilet lesté ou un « home » sans barre doivent être jugés sur leur contenu.

**Décision : B.**

- L'équipement réel est l'autorité ; le moteur ne dépend d'aucun identifiant de préréglage.
- `feasiblePresets` / `declaredInfeasiblePresets` des archétypes restent des **métadonnées de gouvernance du catalogue** (contrôle de couverture CC1 hors génération), jamais une entrée de la génération.

Tests :

- `strength-architecture.test.ts` : « la génération ne lit aucun identifiant de préréglage » ;
- `engine.test.ts` : « équipement identique sous deux noms de préréglage ⇒ séance identique » et « liste poids du corps sans nom de préréglage ⇒ même refus » (F10).

Règles remplacées :

- doc 06 §20, ligne « Archétype déclaré infaisable pour le preset → `PLAN.ARCHETYPE_NOT_APPLICABLE{archetype, preset}` » ;
- doc 08, ligne « preset déclaré infaisable ⇒ PLAN.ARCHETYPE_NOT_APPLICABLE ».

L'infaisabilité est calculée (NO_CANDIDATE_FOR_SLOT, F10) ; `PLAN.ARCHETYPE_NOT_APPLICABLE` reste réservé à l'archétype inconnu ou déprécié, au niveau, à l'objectif et au stimulus non admis.

## §10 — Autres écarts constatés à la relecture

| Spec | Implémentation V1 | Statut |
|---|---|---|
| Doc 03 §7.2 : passe d'**amélioration locale** après la sélection gloutonne | Non implémentée. Le moteur produit une proposition principale et jusqu'à `strength.proposals.max − 1` variantes, chacune sur un emplacement accessoire non ancré ; le CORE choisit par la couche B. | Accepté pour la V1, en dette |
| Doc 07 : `strength.anchor.*`, `strength.track.tier2.*` | `strength.tracks.{anchorMaxWeeks, tier2AutoCreateAfter, rotateAtMesocycleEnd}` | Nommage aligné sur l'implémentation |
| Doc 06 §20 : `PLAN.ARCHETYPE_NOT_APPLICABLE{archetype, preset}` | Paramètres `{archetype, reason}` | Voir §9 |

## §11 — Aucune règle contradictoire active

Contrôles automatiques :

- le dosage ne lit jamais `nextPrescription.sets` / `.rir` (test d'architecture) ;
- la génération ne lit aucun préréglage (test d'architecture) ;
- `selection.ts` ne lit aucune classe d'équipement et n'a ni score ni bonus (test d'architecture) ;
- aucune constante sportive dans `packages/strength/src` (scanner de littéraux) ;
- tous les paramètres déclarés sont consommés (test d'architecture).
