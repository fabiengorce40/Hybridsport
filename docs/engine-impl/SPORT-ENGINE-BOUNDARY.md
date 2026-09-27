# Frontière SportEngine / CORE (Phase 3.5)

Référence normative : [spec V1.2](../engine-spec/README.md), en particulier doc 06 (moteurs), doc 07 §1 (pipeline de séance) et §4 (DuplicateDetectionEngine), doc 02 (`SessionIntent`, `Session`).

## 1. Principe

**Le moteur sportif PROPOSE. Le CORE contrôle, compare, ajuste dans les limites autorisées, valide, répare et explique.**

Un moteur ne peut pas s'auto-déclarer valide :
- la proposition (`zSportEngineProposal`) a un schéma strict, sans aucun champ de statut ou de validité ; tout champ inconnu (`validated`, `status`, `validation`…) entraîne le refus ;
- la séance proposée est traitée comme une entrée non typée par le SessionValidator (fail-closed) ;
- la couche B reçoit la pénalité anti-doublon calculée par le CORE, quel que soit le vecteur fourni par le moteur.

## 2. Flux

```
SessionIntent (planificateur, AVANT génération : archétype, stimulus, objectif, phase, temps, intentions de répétition)
  → garde de sécurité (programStatus, éligibilité, douleur) — le moteur n'est JAMAIS appelé si le programme n'est pas actif
  → SessionConstraints dérivées par le CORE (matériel, restrictions, zones et mouvements restreints, exclusions)
  → SPORT ENGINE.propose(SportEngineInput)                       [moteur de discipline]
  → acceptProposal : schéma strict + cohérence avec l'intention   [CORE, contracts/sport-engine.ts]
  → pipeline CORE, pour chaque candidat accepté :                  [CORE, api/pipeline.ts]
       durée (fitDuration)
       → empreinte (buildFingerprint)
       → anti-doublon (analyzeDuplicates) ⇒ pénalité SOFT sur B6
       → validation (couche A)
  → sélection (couche B, bandes ε) → réparation si aucun candidat admissible
       (empreinte et anti-doublon recalculés sur la séance réparée)
  → résultat + trace + empreinte + rapport anti-doublon
```

Point d'entrée : `runSportSession(engine, { intent, profile, state, history }, ctx)` (`api/sport-session.ts`).

**Pourquoi la durée passe avant l'empreinte** (et non l'ordre « fingerprint → duplicate → duration ») : l'ajustement de durée peut retirer un bloc optionnel ou un accessoire. Analyser l'empreinte avant l'ajustement ferait juger une séance qui ne sera pas publiée. C'est l'ordre de la spec 07 §1 (étape 7 durée, puis étape 9 DuplicateCheck, puis étape 10 validation), et c'est pourquoi l'empreinte est recalculée après une réparation.

## 3. Contrat commun des moteurs

`SportEngine` (`contracts/sport-engine.ts`) :

| Élément | Contenu |
|---------|---------|
| `id`, `version`, `discipline` | Identité et version du moteur (vérifiées dans la provenance de chaque proposition) |
| `propose(input)` | Renvoie 0 à N propositions ; ne valide, ne répare, ne place, ne publie et ne persiste rien |

`SportEngineInput` : `intent`, `profile`, `state`, `constraints` (dérivées par le CORE), `catalog`, `ruleset`, `history` (empreintes), `context` (graine dédiée `<seed>/engine/<id>`, instant, version du moteur CORE).

`SportEngineProposal` (`domain/sport-engine.ts`) :

| Champ | Rôle |
|-------|------|
| `proposalId`, `discipline`, `intentId`, `archetypeId`, `stimulus`, `objective` | Doivent reprendre l'intention reçue (sinon refus) |
| `session` | Structure de séance et prescriptions (validées par le SessionValidator) |
| `optimization` | Vecteur B1–B6 du point de vue du moteur |
| `fingerprintInputs` | Stimulus estimé, énergie, format, volumes par item, marqueurs de prescription |
| `repetitionIntents` | Sous-ensemble des intentions DÉCLARÉES dans l'intention (sinon `DUPLICATE.INTENT_NOT_DECLARED`) |
| `reasons` | Reason codes du moteur |
| `provenance` | Moteur, versions du ruleset et du catalogue, graine : doivent être ceux du contexte |
| `parametersUsed` | Paramètres du ruleset utilisés (id et version) : doivent exister dans cette version |

Motifs de refus d'une proposition (TECHNICAL, tracés dans l'étape `proposal`) : schéma, discipline, intention, archétype, stimulus ou objectif différents, temps disponible ou durée cible modifiés, intention de répétition non déclarée, provenance incohérente, paramètre inconnu ou de version différente.

## 4. Anti-doublon : responsabilité commune

Le `DuplicateDetectionEngine` est **implémenté une seule fois, dans le CORE** (`duplicate/`). Aucun moteur de discipline ne le réimplémente.

| Qui | Fournit |
|-----|---------|
| CORE (`buildFingerprint`) | Exercices exacts, familles et classes d'équivalence (famille / variation), patterns et muscles primaires pondérés par le volume, structure (type, format, durée p50 de chaque bloc). C'est ce qu'un moteur ne doit pas pouvoir travestir |
| Moteur de discipline (`fingerprintInputs`) | Stimulus, répartition énergétique, format, domaine de temps, schéma de répétitions, volume de chaque item dans l'unité de la discipline, marqueurs de prescription (progression intentionnelle), clé de contexte |
| Planificateur (`SessionIntent.repetitionIntents`) | Répétitions prévues : `progression_anchor` (ancre), `benchmark_retest` (retest et benchmark), `progression_series`, `recurring_slot` et `deload_mirror` (répétition délibérée) |
| Ruleset | Fenêtre, poids par discipline et par composante, seuils `warn` / `strong`, crédits exercice / équivalence / famille, voisinage des stimulus, politique des intentions (composantes couvertes, évolution exigée), pénalités B6 |

Composantes (spec 07 §4) : exercice, mouvement, muscle, structure, stimulus, énergie, format. Le contexte (`contextKey`) est informatif (`sameContext`) et ne pénalise jamais.

Règles appliquées :
- l'intention est lue uniquement dans le `SessionIntent`. Une intention présente seulement dans l'historique n'excuse rien ; une intention ajoutée par le moteur est refusée. **La justification n'est jamais inventée après la détection** ;
- une répétition prévue n'est exemptée que sur les composantes couvertes par son intention ; les autres restent évaluées ;
- une répétition prévue sans évolution des marqueurs de prescription produit `DUPLICATE.PLANNED_BUT_STAGNANT` (avertissement), sauf pour les intentions que le ruleset dispense d'évolution (retest, décharge) ;
- une répétition accidentelle donne une pénalité SOFT sur B6. Il n'y a jamais d'exclusion par défaut (V1.1) : la progression (B2) prime donc sur la variété (B6) ;
- les cas HARD « explicitement justifiés » (spec 07 §4) sont des règles de discipline avec fiche, branchées comme contrôles du validateur (`extraChecks`), jamais une classification implicite du CORE ;
- sans historique, aucune comparaison et aucune erreur. Sans paramètres anti-doublon, l'analyse demandée échoue explicitement (TECHNICAL).

## 5. SessionArchetype

Schéma : `domain/archetype.ts`. Les mécanismes sont dans `catalog/archetype.ts`. **Aucun archétype concret n'est défini dans le CORE** ; ils seront écrits discipline par discipline, avec leur moteur.

| Élément | Contenu |
|---------|---------|
| Identité | `id`, `version`, `discipline`, `status` (draft, reviewed, approved, deprecated), `stimulus`, `toleranceProfile`, `levels`, `duration {minS, maxS}` |
| Blocs | `kind`, `role`, `optional`, `formats` admissibles, `minDurationS`, `levers` (ordonnés) |
| Emplacements | `requirement` (pattern, région, polyarticulaire, types de mouvement : tous les critères présents doivent être satisfaits), `count {min, max}`, `minFamilies`, `modalityPreference` (libellé, jamais un bonus chiffré) |
| Faisabilité | `feasiblePresets` et `declaredInfeasiblePresets` |
| Restrictions | `declaredInfeasibleRestrictions` (CC7) |

Invariants :
- **schéma** : au moins un bloc principal, jamais optionnel ; identifiants de blocs et d'emplacements uniques ; `count.min ≤ count.max` ; `duration.minS ≤ duration.maxS` ; aucun preset à la fois faisable et infaisable ; schéma strict ;
- **catalogue** (`archetypeIssues`) : leviers soumis aux mêmes règles que les séances (`blockLeverIssues`) ; patterns, presets et restrictions connus ; chaque preset du catalogue déclaré faisable ou infaisable (jamais implicite) ; chaque emplacement a au moins un candidat dans chaque preset déclaré faisable.

Lien avec le catalogue : `slotAccepts` est le prédicat unique d'emplacement, partagé par CC1, CC7 et les futurs moteurs. `slotCandidates` donne les candidats par emplacement, par preset et sous restrictions. `toCoverageSpec` projette l'archétype vers la spécification de couverture sans perte d'exigence.

## 6. Écarts par rapport à la V1.2 (documentés, non silencieux)

1. **`SessionIntent.repetitionIntents`** est une liste, alors que la spec 02 prévoit `repetitionIntent?` au singulier. Une même séance peut porter plusieurs ancres (développé couché et squat). Extension compatible : une liste d'un élément équivaut à l'ancien champ.
2. **`SessionIntent`** gagne `id`, `discipline`, `objective`, `phase`, `availableTimeS` et `targetDurationS` (la spec 02 prévoit `targetMinutes {min, target, max}` et `constraintsFromPlanner`). Ce sont les champs minimaux nécessaires pour que le CORE vérifie qu'une proposition ne s'écarte pas de l'intention. `plannerNotes` correspond à `constraintsFromPlanner`.
3. **Classification anti-doublon** : `none | planned | accidental_warn | accidental_strong`. La valeur `hard_justified` de la spec est portée par les règles HARD de discipline, dans le validateur, et non par une classification du CORE.
4. **Composante « exercice »** : maximum des Jaccard pondérés (exercice, équivalence, famille). La spec dit « Jaccard pondéré » sans préciser l'agrégation ; les crédits sont dans le ruleset.
5. **Patterns et muscles de l'empreinte** : primaires uniquement, pondérés par le volume fourni par le moteur. Pondérer les secondaires aurait exigé une valeur sportive non validée.

## CORE-EXT-4 — contrat planificateur de la discipline (phase 4C)

- `SportEngine.validateIntent?(input: IntentContractInput<TContext>): readonly ReasonCode[]` : fonction pure, optionnelle et générique. Elle reçoit l'intention, le contexte de discipline **déjà validé** par `parseContext`, le ruleset et le catalogue.
- Le CORE l'exécute **après** `parseContext` et **avant** `propose`. Une raison ou plus ⇒ `INVALID_INPUT` déterministe (étape de trace `intent_contract`) et le moteur n'est jamais appelé. Une exception ⇒ `INVALID_INPUT` technique (`TECHNICAL.STRUCTURE_INVALID`).
- Pourquoi dans le CORE : une intention incohérente avec le contexte est un défaut du **planificateur**, donc une entrée invalide, pas une issue métier. `parseContext` ne voit pas l'intention ; seul le CORE voit les deux.
- Première utilisation : contrat des ancres de la Musculation (spec strength doc 10 §7).
