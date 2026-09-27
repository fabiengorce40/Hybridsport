# 03 — Sélection, ancres, modalités, substitutions

## 7. Sélection des exercices

### 7.1 Devenir candidat : filtres HARD

**INPUT** : emplacement instancié, catalogue, contraintes dérivées par le CORE, contexte.
**DECISION** : un exercice est candidat si et seulement s'il franchit **tous** les filtres suivants, dans cet ordre, chaque rejet étant compté par raison (trace agrégée) :

| # | Filtre | Source | Reason code agrégé |
|---|--------|--------|--------------------|
| F1 | `status = active` | Catalogue | `SELECT.FILTERED.DEPRECATED` |
| F2 | Satisfait l'exigence de l'emplacement (`slotAccepts` du CORE) | Archétype | — (non candidat par définition) |
| F3 | Faisable avec le matériel disponible | Contraintes | `SELECT.FILTERED.EQUIPMENT` |
| F4 | Aucune contre-indication liée à une restriction déclarée | Contraintes | `SELECT.FILTERED.RESTRICTION` |
| F5 | Aucune zone exclue par la douleur ; aucun mouvement restreint | Contraintes (G1, CORE) | `SELECT.FILTERED.PAIN` |
| F6 | Non exclu par l'utilisateur | Contraintes | `SELECT.FILTERED.USER_EXCLUSION` |
| F7 | Niveau technique admis pour le niveau de l'athlète (`skillLevel ≤ plafond[level]`) | Ruleset G1 | `SELECT.FILTERED.SKILL` |
| F8 | Discipline pertinente (`disciplines` contient `strength`, ou relevance du soutien ≥ seuil) | Catalogue | `SELECT.FILTERED.DISCIPLINE` |
| F9 | Compatible avec les exclusions du contexte (note du planificateur, ex. `avoid_axial_high` ⇒ pas de `axialLoad = 3`) | Contexte | `SELECT.FILTERED.CONTEXT` |

**OUTPUT** : candidats par emplacement, triés par identifiant (déterminisme).
**VALIDATION** : propriété « aucun exercice ne satisfait un emplacement qu'il ne couvre pas » (test) ; le CORE revalide F3 à F6.
**FAILURE** : emplacement requis sans candidat ⇒ repli de substitution (§17) ; sinon `SELECT.NO_CANDIDATE_FOR_SLOT` (06 §20).

### 7.2 Choisir parmi les candidats : tri lexicographique par rôle

Il n'y a **ni somme pondérée ni bonus**. Les critères sont **ordinaux** et comparés dans l'ordre ; le critère suivant ne départage que les égalités (au sens des bandes d'ordinaux). L'ordre des critères dépend du rôle (table G2 `strength.selection.criteriaOrder[role]`) ; ci-dessous, l'ordre proposé pour la revue :

| Ordre | Critère | Valeur (ordinale) | Rôle `primary` | `secondary` | `accessory` |
|-------|---------|-------------------|:---:|:---:|:---:|
| C1 | **Continuité d'ancre** : exercice de la track active de cet emplacement, encore admissible | oui / non | 1 | 1 | — |
| C2 | **Adéquation au rôle** : préférence de modalité de l'emplacement, lue sur l'exercice (`loadCeiling`, ou `stability` et faible `cost.technical`, ou `relevance[supportFor]`) | 0–3 | 2 | 3 | 1 |
| C3 | **Pertinence pour l'objectif** : `relevance` de la discipline soutenue, ou accent du besoin | 0–3 | 3 | 2 | 3 |
| C4 | **Compatibilité avec la fatigue et la semaine** : coût (`axialLoad`, `grip`, `impact`, `localMuscular`) par rapport aux demandes voisines et aux notes du planificateur ; plus bas = mieux quand une structure est sollicitée | 0–3 inversé | 4 | 4 | 4 |
| C5 | **Exposition récente** : écart à la dernière exposition de la famille (E2) ; variété hors ancres | bandes de jours | 6 | 5 | 5 |
| C6 | **Préférence** : aimé > neutre > « je n'aime pas » (l'exclusion explicite est un filtre, F6) | 3 niveaux | 5 | 6 | 6 |
| C7 | **Logistique** : même station que l'exercice précédent, installation courte (`setupS`) | 0–2 | 7 | 7 | 2 |
| C8 | Départage par graine | — | 8 | 8 | 8 |

Remarques :
- **Aucun critère ne porte sur la classe d'équipement ni sur le `loadModel`.** Une machine, une poulie ou une barre gagne par ses propriétés (§16). Un test d'architecture vérifie que le code de sélection ne lit ni `equipment.class` ni `loadModel`, hors faisabilité et arrondi de charge.
- La « capacité » intervient par C1 (une ancre ayant une référence de charge fiable garde la priorité) et par le dosage, pas comme un bonus de sélection.
- La **durée** intervient par C7 (installation) et par le budget (§15), pas par un bonus.
- L'anti-doublon **officiel** est celui du CORE (après proposition). C5 est une préférence locale de variété : elle évite de proposer d'emblée la même famille que la séance d'avant-hier.

**Sélection gloutonne** par ordre de priorité des besoins (02 §6.3), avec un **contexte cumulatif** :
- pas deux exercices de la même famille dans la séance, sauf intention ;
- la charge axiale et le grip cumulés sont suivis : un second `axialLoad = 3` est rétrogradé en C4 ;
- la même station est favorisée en C7.

Une passe d'**amélioration locale** suit (échange d'un exercice si la séance progresse lexicographiquement sur B1, puis B2, puis B5). Elle est bornée par un paramètre G4.

**Alternatives prévalidées** : pour chaque emplacement, les 2 à 3 candidats suivants dans l'ordre, qui franchissent aussi F1–F9. Elles sont stockées dans l'item (CORE-EXT-1) et servent aux substitutions manuelles de l'utilisateur.

**VALIDATION** : déterminisme (même graine ⇒ même choix) ; invariance à l'ordre du catalogue (tri par identifiant avant sélection) ; S7 (§24) ; propriété d'absence de biais de modalité.
**FAILURE** : aucun candidat n'est compatible avec la semaine (C4) ⇒ on garde le moins coûteux, en le signalant (`SELECT.CONTEXT_COMPROMISE`), à moins qu'une règle HARD du CORE ne l'interdise (validation).

## 8. Exercices ancres

**Erreur empêchée** : changer tous les exercices chaque semaine au nom de la variété, ce qui empêche la progression mesurable et l'apprentissage technique ; à l'inverse, garder le même exercice indéfiniment malgré la stagnation.

### 8.1 Définition

Une **ancre** est un exercice rattaché à une `ProgressionTrack` identifiée par `trackId`, pour un couple (archétype, emplacement ancrable), sur une durée bornée. Toute répétition de cet exercice dans cet emplacement est une **répétition prévue**, de type `progression_anchor { trackId }`.

### 8.2 Cycle de vie

| Événement | Règle | Qui décide |
|-----------|-------|------------|
| **Création** | Première occurrence d'un emplacement ancrable dans un mésocycle : l'exercice choisi (par C2 à C8, faute d'ancre) devient la proposition d'ancre. La track n'est **créée qu'après l'exécution réelle** (feedback), par le ProgressionEngine, à partir de l'item marqué `anchorCandidate` (CORE-EXT-1 : `slotId`, `progressionTrackId`) | StrengthEngine (propose), ProgressionEngine (crée) |
| **Déclaration de la répétition** | Pour les séances suivantes, le **planificateur** recopie les tracks actives de l'archétype dans `SessionIntent.repetitionIntents` **avant** la génération. Le moteur ne peut se réclamer que de ces intentions (sinon refus CORE `DUPLICATE.INTENT_NOT_DECLARED`) | GlobalPlanner |
| **Durée** | Jusqu'à la fin du mésocycle (`phase.mesocycleLength`), bornée par `strength.anchor.maxWeeks[level]` (G2 ; un débutant garde ses ancres plus longtemps) | Paramètres |
| **Évolution** | La track progresse selon son modèle (§12). Les marqueurs de prescription changent, donc pas de stagnation au sens du CORE | ProgressionEngine |
| **Stagnation** | `DUPLICATE.PLANNED_BUT_STAGNANT` (CORE), ou `below` / maintien répétés : 1) changer de variable progressée ; 2) si cela persiste, variante de la même famille (fidélité élevée) à la prochaine frontière de semaine | ProgressionEngine → StrengthEngine |
| **Remplacement** | Fin de mésocycle (variation planifiée, paramètre `strength.anchor.rotationPolicy`) ; restriction ou douleur rendant l'exercice inadmissible ; matériel perdu ; exclusion par l'utilisateur ; stagnation persistante | ProgressionEngine / contraintes |
| **Suspension** | Douleur ou `safety_pause` : la track est **gelée**, sans baisse ni hausse (V1.2) | CORE / ProgressionEngine |

### 8.3 Variation planifiée ou changement accidentel

| | Variation planifiée | Changement accidentel |
|---|---------------------|------------------------|
| Moment | Frontière de mésocycle, ou décision tracée du ProgressionEngine | N'importe quand |
| Trace | `PROGRESSION.ANCHOR_ROTATED{from, to, cause}` | Aucune cause |
| Track | Nouvelle track, ou migration de la track (même classe d'équivalence ⇒ capacité transférée avec une confiance abaissée) | La track de l'ancre reste active ; l'ancre revient à la séance suivante |
| Anti-doublon | Nouvelle intention déclarée par le planificateur | Le CORE juge la similarité sans exemption |

**Substitution d'une séance** (matériel indisponible ce jour-là) : ce n'est pas une rotation. L'exécution est enregistrée sous l'exercice substitué ; la track de l'ancre n'est ni mise à jour ni pénalisée ; l'ancre revient à la séance suivante (§17).

**VALIDATION** : aucune intention inventée (propriété) ; durée de vie ≤ maximum ; pas d'ancre éternelle (longitudinal, §25).

## 16. Machines, poulies et charges libres

**Erreur empêchée** : le biais historique vers la barre, les haltères et le poids du corps, qui écarte des solutions souvent meilleures (stabilité, sécurité, isolation, rapidité).

**Règle** : aucun bonus de catégorie. Une modalité l'emporte uniquement par les propriétés de l'exercice, au regard du **besoin de l'emplacement** :

| Situation | Propriété décisive | Modalité qui gagne souvent (non imposée) |
|-----------|--------------------|-------------------------------------------|
| Emplacement principal de force, athlète formé | `loadCeiling` élevé, progression de charge fine | Barre ; parfois machine guidée ou chargée par disques |
| Hypertrophie, accessoire | `stability` élevée, `cost.technical` faible, proche de l'échec en sécurité | Machine, poulie |
| Isolation | Stabilité, tension continue, installation rapide | Poulie, machine |
| Fatigue technique en fin de séance (novice) | `cost.technical` faible (règle G1 STR-V6) | Machine, poulie |
| Débutant | Stabilité et faible technique pour un premier mouvement chargé ; apprentissage des patterns libres **progressif** | Machine, **ou** libre simple (goblet squat, développé haltères) : le choix revient au critère C2 de l'emplacement |
| Temps limité | `setupS` faible, supersets sans changement de station (C7) | Poulie, haltères, machine proche |
| Charge axiale à limiter (contexte multisport) | `axialLoad` faible | Presse à cuisses, hack squat, split squat |
| Grip à préserver (HYROX) | `cost.grip` faible | Machine à appui, sangles non modélisées (hors V1) |
| Soutien HYROX, carry | `relevance.hybrid_race` | Charges libres (farmers), selon le besoin |

**VALIDATION** :
- **S7** (golden, §24) : profil machines + poulies, historique biaisé vers les charges libres. Le moteur ne choisit **pas** systématiquement les charges libres ; la part des modalités est mesurée et dépend des emplacements.
- **Test d'architecture** : la sélection ne lit pas la classe d'équipement (§7.2).
- **Longitudinal** : surutilisation d'une modalité détectée (§25).

## 17. Substitutions

**Erreur empêchée** : remplacer par le mouvement le plus ressemblant biomécaniquement, au point de détruire l'objectif de la séance (ex. remplacer un squat lourd par un goblet squat plafonné en charge pour un objectif de force, alors qu'une presse aurait préservé le stimulus).

### 17.1 Ordre de préservation

1. **Objectif de l'emplacement** : besoin et rôle ; pour un principal de force, `loadCeiling` suffisant.
2. **Pattern**.
3. **Muscles primaires**.
4. **Stimulus** : charge lourde, volume, contrôle.
5. **Continuité de progression** : même classe d'équivalence ⇒ capacité transférable.
6. **Prescription** : les reps et l'effort restent réalisables.
7. **Contraintes matérielles**.
8. **Durée** : installation et transitions.

### 17.2 Niveaux de fidélité

| Niveau | Définition | Effet sur la progression | Trace |
|--------|------------|--------------------------|-------|
| F1 — Élevée | Même classe d'équivalence | Track conservée ; capacité transférée avec une confiance abaissée d'un cran | `SELECT.SUBSTITUTION{fidelity:high}` |
| F2 — Moyenne | Même famille, autre classe | Track suspendue pour cet exercice ; prescription en RIR / RPE | `SELECT.SUBSTITUTION{fidelity:medium}` |
| F3 — Faible | Même besoin (pattern), autre famille | Aucun transfert ; RIR / RPE | `SELECT.SUBSTITUTION_LOW_FIDELITY` |
| F4 — Repli | Même besoin, pattern de repli (table G2 `strength.substitution.patternFallback`, ex. `hip_dominant` sans charge lourde ⇒ unilatéral ou pont) | Aucun transfert ; objectif de l'emplacement dégradé et signalé | `SELECT.PATTERN_FALLBACK` |

La recherche essaie F1, puis F2, F3 et F4 ; à chaque niveau, les candidats sont triés par §7.2 (le critère C2 garantit l'objectif de l'emplacement). **Un repli F4 sur l'emplacement principal d'un objectif `strength` n'est pas accepté silencieusement** : le moteur doit alors, selon le paramètre `strength.substitution.primaryF4Policy`, soit changer le stimulus en `strength_general` (tracé), soit renvoyer `NO_VALID_PROPOSAL`.

**Anti-oscillation** : après une substitution imposée par le matériel, le choix est conservé pour les séances suivantes tant que la cause persiste (hystérésis de la couche C du CORE, `ADAPT.KEPT_STABILITY`). Cela évite l'alternance A ↔ B d'une séance à l'autre (test longitudinal §25).

**VALIDATION** : la substitution respecte F1 à F6 (le CORE revalide) ; jamais de restriction levée.
**FAILURE** : aucun niveau disponible ⇒ `SELECT.NO_CANDIDATE_FOR_SLOT` (emplacement requis) ou emplacement retiré (optionnel), en le traçant.
