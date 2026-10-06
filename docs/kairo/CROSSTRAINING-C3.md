# Cross-training C3 — moteur de composition de séance

Base : `d1d699d` (Strength S5). Terme générique « Cross-training » ; aucun nom propriétaire, aucun benchmark nommé (test d'architecture). Aucune valeur scientifique n'a été ajoutée. Toutes les valeurs des scénarios sont **TEST_ONLY / SIMULATION_ONLY**. Le registre réel reste fail-closed : 35 paramètres (32 de C1 + 3 nouveaux), tous `UNRESOLVED`.

## 1. Ce qui existait (C1 / C2)

| Élément | Statut avant C3 |
|---|---|
| Paquet `@hybridsport/crosstraining`, contrat `SportEngine` | APPROVED (architecture) |
| 9 identifiants de stimulus (`CT_STIMULI`) | PROVISIONAL (spec 06, CT-D1 non décidée) |
| 5 formats (`CT_FORMATS`), contrat de séance réalisée (prescription ≠ résultat ≠ complétion) | APPROVED (contrat) |
| Registre typé, résolution fail-closed, 32 paramètres | APPROVED (mécanisme) ; valeurs UNRESOLVED |
| Décisions CT-D1…D15, G1 (4 politiques) | PENDING / UNSIGNED |
| Dépendances techniques `CORE_EXT_C1`, `GLOBAL_PLANNER`, `CT_CONTENT` | UNSATISFIED |
| Archétypes de stimulus | BLOCKED (`PRESCRIPTION_NOT_IMPLEMENTED`) |
| C2 : amorçage (allowlist × durée approuvée) ou rejeu strict, un mouvement continu en durée | APPROVED (mécanisme) ; valeurs TEST_ONLY |
| Empreinte C2 (`energy` / `stimulus` `not_applicable`), anti-doublon du CORE | APPROVED |
| Mouvements, matériel, douleur, exclusions (`movementIssues`) | APPROVED |
| Charge : `zItemLoad` (H1) existe dans le CORE ; C1 la déclarait non représentable | CORE : représentable ; politique CT : UNRESOLVED |
| Planificateur : port CT, intégration multisport par `ctHybridPlanning` | PROVISIONAL |
| app-core / UI : CT non activable en Beta 0 (`BETA0_SPORT_UNSUPPORTED`) | BLOCKED (inchangé) |

## 2. Ce qui manquait pour une vraie séance

| Capacité | Existe ? | Gouvernée ? | Données manquantes | Risque si inventée | Nécessaire pour C3 ? |
|---|---|---|---|---|---|
| Plusieurs mouvements | Non (C2 : un seul) | — | rôles par format | séance incohérente | Oui |
| Formats EMOM / AMRAP / for time / intervalles | Représentés (CORE), non générés | Non | doses, débits, densité | surcharge, durée fausse | Oui |
| Durée estimée (tâche) | CORE : débits de **fixture** | Non (`ct.estimation.workRates`) | débits mesurés | time cap arbitraire | Oui (for time) |
| Densité EMOM | Non | Non (`ct.format.emomDensity`) | travail / minute admissible | EMOM irréalisable | Oui |
| Rôles de mouvement | Non | Non | table stimulus × format | aléatoire déguisé | Oui |
| Compatibilité (redondance, technique, transitions) | Non | Non (qualitatif) | — | combinaisons absurdes | Oui |
| Technicité sous fatigue | Coût ordinal du catalogue | Non (CT-D7) | seuil par niveau | blessure | Oui |
| Charges | `zItemLoad` (CORE) | Non (CT-D12) | standards d'implément | charge arbitraire | Non (BLOCKED en production) |
| Scaling | Familles de progression, substitutions | Non (CT-D13) | règles | « RX / scaled » inventés | Non (contrat) |
| Historique / variété | Contrat réalisé | Partiel (`recencyBand`, non résolu) | politique de variété | répétition ou hasard | Oui |
| Multisport | Transport Strength (S4) | Non (CT-D11) | politique d'interférence | interférence inventée | Transport oui, politique non |

## 3. Taxonomie (`C3_TAXONOMY_REVIEW`)

| Catégorie | Verdict | Porteur |
|---|---|---|
| aerobic / sustainable | RETAINED_PROVISIONAL | `aerobic_capacity` |
| interval | RETAINED_PROVISIONAL (une **structure** : intention `threshold` ou `anaerobic_intervals`) | `threshold` |
| high-intensity | DIMENSION_NOT_TYPE (bande d'intensité, pas un type) | `anaerobic_intervals` |
| mixed modal | RETAINED_PROVISIONAL (convention utile, aucune signature physiologique propre) | `mixed_modal_medium` |
| muscular endurance | RETAINED_PROVISIONAL | `muscular_endurance` |
| strength + conditioning | BLOCKED (bloc force = moteur Strength, aucune délégation) | `strength_plus_conditioning` |
| skill + conditioning | BLOCKED (acquisition non modélisée) | `skill_plus_conditioning` |
| technique / skill | BLOCKED | — |
| conditioning pur, mixed | REFUSED_REDUNDANT | — |
| engine | REFUSED_CONVENTION (jargon pour capacité aérobie) | — |

Les 9 identifiants de C1 sont **réutilisés** comme intentions ; rien n'est recréé. `long_chipper` (niveau réservé) et `benchmark` restent hors périmètre.

## 4. Intention (`C3_INTENT`)

Dimensions retenues : **pourquoi** (stimulus = archétype), temps disponible (CORE), niveau, contraintes (matériel, douleur, exclusions : CORE), historique, voisines et priorité (transportées).

Dimensions refusées comme entrées :
- le format (il est **dérivé** de l'intention) ;
- l'intensité (portée par le stimulus, `ct.stimulus.intensityBand`) ;
- un nom de séance.

Aucun nouveau champ d'intention au contrat du planificateur.

## 5. Formats (`C3_FORMATS`)

| Format | Priorité | Durée | Représentation CORE | Exige (en plus du commun) | Statut |
|---|---|---|---|---|---|
| continuous | temps | prescrite | `continuous` + `timed` | — | générable si commun gouverné |
| intervals | temps | prescrite | `continuous` + `timed{rounds, restS}`, **un** mouvement | `workRestRatios` | idem |
| emom | temps | prescrite | `emom{minutes}`, « tous les items chaque minute » | `workRates`, `emomDensity`, `repsPerMovementCap` | idem |
| amrap | temps | prescrite | `amrap{timeCapS}` | `workRates` (volume maximal), `repsPerMovementCap` | idem |
| for_time | tâche | **estimée** | `for_time{rounds, timeCapS}` | `workRates`, `timeCapMargin`, `repsPerMovementCap` | idem |
| rounds | tâche | estimée | ambigu (`sets` circuit ou `for_time`) | — | **BLOCKED** (`REPRESENTATION_AMBIGUOUS`) |
| chipper | tâche | estimée | `for_time{rounds: 1}` | — | **BLOCKED** (`CHIPPER_DEFINITION_UNGOVERNED`) |

EMOM alterné et intervalles multi-stations : non représentables (CORE-EXT-C1 P7 / P8), donc jamais générés.

## 6. Durée prescrite / estimée, densité

- **Durée prescrite** :
  - continu : `workS` ;
  - intervalles : `rounds × workS + (rounds − 1) × restS` ;
  - EMOM : `minutes × 60` ;
  - AMRAP : `timeCapS`.
- **Durée estimée** (for time) : tours × Σ quantité / débit gouverné (typique, lent). Time cap = ⌈lent × (1 + `timeCapMargin`)⌉. Sans débits, le format n'est **pas générable**.
- **Temps utilisable** = disponible − `marginS` du profil de tolérance **du CORE** (`fixed_time` / `for_time`) : la mise en place et les consignes restent l'autorité du CORE.
- **Cohérence avec l'intention** : durée prescrite (ou estimée typique) ∈ `ct.stimulus.timeDomains[stimulus]`.
- **Densité** :
  - exacte (intervalles : travail / repos ∈ `workRestRatios`) ;
  - estimée (EMOM : travail lent par minute ≤ `emomDensity[niveau]`) ;
  - autogérée (AMRAP, for time).

## 7. Pipeline (`composeC3`)

`INTENTION → STRUCTURE → FORMAT → RÔLES → SÉLECTION → DOSE → VALIDATION → PRESCRIPTION`

1. **Garde-fous** (ordre C2) : multisport gouverné, simulation, socle G1, reprise `NONE`, haute intensité suspendue (douleur P3) ⇒ refus, capacité `ctSessionComposition`.
2. **Structure** (`ct.composition.sessionStructure`) :
   - un seul bloc `conditioning` généré ;
   - `warmup` / `cooldown` : place architecturale tracée (`C3_BLOCK_NOT_GENERATED`), jamais comptés ;
   - `strength` / `skill` ⇒ refus.
3. **Historique** : fenêtre `recencyBand` ; séance précédente abandonnée, mal tolérée ou douloureuse ⇒ `negativeResponse` (refuser ou écarter ses mouvements).
4. **Voisines / priorité** : transport, puis trace, puis interprétation **seulement** si `ct.hybrid.policy` est résolue. L'interprétation est un critère de **classement** (structures dérivées par la table CORE `demand.derivationTable`), jamais une exclusion. La priorité n'a aucune politique (`blocked:priority_interference_policy`) : la séance est identique quel que soit le rang (testé).
5. **Format** : admissible ∩ générable. Le format le **moins récemment utilisé** (même stimulus, fenêtre) passe en premier, puis l'ordre gouverné.
6. **Rôles** (`ct.composition.movementRoles`), dérivés du catalogue :
   - `monostructural` : type de mouvement ;
   - `lower_body` / `trunk` : région du pattern ;
   - `upper_push` / `upper_pull` : pattern.
7. **Sélection** : réservoir relu (`ct.composition.movementPool`) ∩ catalogue. Causes d'inéligibilité :
   - matériel, contre-indication, douleur (zone, mouvement), exclusion, statut ;
   - charge sans politique ;
   - technicité > `maxTechnicalCost[niveau]` (sauf compétence déclarée, si admis) ;
   - historique négatif ;
   - quantité non mesurable, débit absent.

   Compatibilité qualitative avec les mouvements déjà retenus :
   - même famille ou classe d'équivalence ;
   - même pattern primaire ;
   - deux mouvements techniques (gymnastique, haltérophilie) ;
   - deux machines.

   Classement **déterministe** :
   1. non utilisé récemment ;
   2. conflits avec les voisines ;
   3. technicité ;
   4. pertinence Cross-training du catalogue ;
   5. identifiant.

   Chaque critère est tracé (`C3_MOVEMENT_SELECTED`).
8. **Dose** : `ct.dose.construction[stimulus][niveau][format]`, quantité **par rôle** dans l'unité native. Charge = `implementStandards[mouvement][niveau]` si `ctLoadedMovements` est active.
9. **Validation** :
   - domaine de temps, temps utilisable, densité ;
   - plafonds de répétitions et de contacts de sauts, sur le **volume maximal** (AMRAP : débit rapide).

   Un échec imputable à un mouvement (plafond, densité) l'écarte (tracé) et recompose le format avec le candidat suivant. La boucle est bornée par le réservoir.
10. **Prescription** : séance CORE (`conditioning`, format CORE, items `reps` / `calories` / `distance` / `timed`, `load` H1). L'empreinte porte stimulus, format, volumes et marqueurs, avec `energy` `not_applicable`. Le CORE valide et estime : la séance publiée doit être **identique** à la proposition (`runCrossTrainingC2`, contrôle strict).

## 8. Charges, scaling, historique, anti-doublon

- **Charges** : aucune modification du CORE (`zItemLoad` H1 réutilisé). Sans `ct.load.implementStandards` + `CORE_EXT_C1` + CT-D12, un mouvement chargé est **inéligible** (`LOAD_POLICY_UNGOVERNED`). Avec les valeurs TEST_ONLY, la charge est publiée telle quelle par le CORE (testé).
- **Scaling** : `ct.scaling.rules` est non résolue ⇒ aucun « RX / scaled ». La technicité inadmissible écarte le mouvement ; le classement retient un autre mouvement du **même rôle** (individualisation par sélection), tracé.
- **Historique** : C3 lit la prescription réalisée (format, mouvements, quantités) et les signaux déclarés (complétion, tolérance, douleur). `ctPrescriptionOf` lit une séance CORE C3 en prescription réalisée. Aucune « reprise de la dernière séance ».
- **Anti-doublon** : CORE inchangé (empreinte, analyse). Contrat C3 à 3 niveaux (format, mouvements, dose), par **égalité exacte**, sans seuil. Une répétition complète n'arrive que faute d'alternative (`C3_REPEAT_UNAVOIDABLE`).

## 9. Changements hors du paquet CT

- **Planificateur** (transport seulement) :
  - `crossTrainingPort({ transportNeighbours })` : voisines de la seconde passe et ordre de priorité dans le contexte CT ;
  - `weekArg` transmet `sportPriority` aux ports consommateurs de voisines.

  Sans l'option, le comportement est inchangé.
- **CORE, Strength, Running, app-core, UI** : aucun changement.

## 10. Preuves

- Rapports :
  - `packages/crosstraining/tests/c3/__reports__/c3-scenarios.md` (A, D, E, F, aperçu par stimulus) ;
  - `packages/planner/tests/integration/__reports__/c3-multisport.md` (B, C) ;
  - `packages/crosstraining/tests/c3/__reports__/c3-simulation-4w.md`.
- Tests :
  - `c3/adversarial.test.ts` (32) ;
  - `c3/units.test.ts` ;
  - propriété « C3 demandé + valeurs injectées arbitraires ⇒ jamais de proposition » ;
  - architecture : terme générique, aucun hasard, émetteur unique.

## 11. Paramètres C3

| Paramètre | Décision | Rôle C3 | Statut |
|---|---|---|---|
| `ct.stimulus.catalog`, `.admissibleFormats`, `.timeDomains`, `.workRestRatios` | CT-D1 | stimuli décidés, formats, domaines de temps, densité des intervalles | UNRESOLVED |
| `ct.composition.sessionStructure`, `.movementPool`, `.movementRoles` (**nouveaux**) | CT-D16 (nouvelle) | structure, réservoir relu, rôles | UNRESOLVED |
| `ct.dose.construction`, `ct.estimation.workRates` | CT-D2 | dose par rôle, débits (estimation seulement) | UNRESOLVED |
| `ct.format.timeCapMargin` | CT-D3 | time cap | UNRESOLVED |
| `ct.safety.repsPerMovementCap`, `.jumpContactsCap` | CT-D6 | plafonds | UNRESOLVED |
| `ct.safety.technicalUnderFatigue` | CT-D7 | technicité admise par niveau | UNRESOLVED |
| `ct.format.emomDensity` | CT-D8 | densité EMOM | UNRESOLVED |
| `ct.hybrid.policy` | CT-D11 | interprétation des voisines | UNRESOLVED |
| `ct.load.implementStandards` | CT-D12 | charges | UNRESOLVED |
| `ct.history.recencyBand`, `.negativeResponse` | CT-D15 | fenêtre, retour négatif | UNRESOLVED |
| `ct.safety.novicePolicy` | CT-G1 | stimuli exclus par niveau | UNRESOLVED |
| Marge du profil de tolérance (`duration.toleranceProfiles`) | CORE G2 | temps utilisable | PROVISIONAL (CORE) |
| Table `demand.derivationTable` | CORE G2 | structures des mouvements (voisines) | PROVISIONAL (CORE) |

Règles qualitatives codées (aucun nombre), à valider : compatibilité (§7.7), ordre de classement, variété par format le moins récemment utilisé. Statut : **PROVISIONAL (EXPERT / PRODUCT)**.
