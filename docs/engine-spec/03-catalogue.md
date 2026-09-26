# 03 — ExerciseCatalog et familles de mouvements

## 1. Rôle

Le catalogue est la **source de vérité** sur les exercices. Le moteur ne manipule jamais un nom (« Bench Press ») : il manipule un identifiant stable et ses métadonnées. Le catalogue est :
- **versionné** (`catalogVersion`, SemVer) et livré comme une donnée ;
- **validé automatiquement** : schéma, références croisées, cohérence ;
- **relu par des experts** pour ses métadonnées sportives (doc 09 §6, catégorie CATALOG) ;
- **indépendant du contenu pédagogique** (C4) : vidéos et instructions vivent dans `ExerciseContent`.

## 2. Modèle Exercise

```ts
interface Exercise {
  // IDENTITÉ
  id: ExerciseId;                                  // 'ex.back_squat' — jamais réutilisé, jamais supprimé
  canonicalName: I18nText;
  aliases: I18nText[];                             // « squat arrière », « back squat », « high bar squat »
  status: 'active' | 'deprecated';
  replacedBy?: ExerciseId;

  // CLASSIFICATION
  disciplines: Discipline[];
  patterns: { primary: PatternId; secondary: PatternId[] };
  family: FamilyId;                                // famille de variantes (voir §3) : 'fam.squat_bilateral'
  equivalenceClass: EquivalenceId;                 // substituables à stimulus quasi identique : 'eq.squat_bilateral_barbell'
  progressionFamily?: { familyId: string; rank: number };   // échelle de difficulté (ex. traction : 1 = ring row … 6 = muscle-up)
  compound: boolean;
  laterality: 'bilateral' | 'unilateral' | 'alternating';
  movementType: 'strength' | 'power' | 'olympic' | 'gymnastic' | 'monostructural' | 'carry' | 'mobility' | 'plyometric' | 'isometric';

  // MUSCLES (ordinal, pas de faux pourcentages)
  muscles: { primary: MuscleId[]; secondary: MuscleId[] };

  // MATÉRIEL
  equipment: EquipmentRequirement;                 // expression booléenne : { allOf: [...], anyOf: [...] }
  loadable: boolean;
  loadModel?: 'barbell' | 'dumbbell_pair' | 'dumbbell_single' | 'kettlebell' | 'machine_stack' | 'plate_loaded' | 'bodyweight_plus' | 'implement_fixed';

  // COÛTS (ordinaux 0–3 ; hypothèses relues par les experts)
  cost: {
    localMuscular: 0 | 1 | 2 | 3;                  // dommages et fatigue locale potentiels (excentrique, amplitude, charge)
    systemic: 0 | 1 | 2 | 3;                       // fatigue globale (masse musculaire engagée, charge absolue)
    cardiovascular: 0 | 1 | 2 | 3;                 // potentiel de sollicitation cardio en format conditioning
    technical: 0 | 1 | 2 | 3;                      // exigence technique ⇒ à éviter sous forte fatigue
    impact: 0 | 1 | 2 | 3;                         // contrainte locomotrice / d'impact
    axialLoad: 0 | 1 | 2 | 3;
    grip: 0 | 1 | 2 | 3;                           // important en HYROX / cross (farmers, pull, sled pull)
  };
  skillLevel: 1 | 2 | 3 | 4 | 5;                   // niveau requis minimal (1 = accessible à un novice)
  stability: 0 | 1 | 2 | 3;                        // V1.2 — stabilité du mouvement (machine, poulie guidée : élevée)
  loadCeiling: 0 | 1 | 2 | 3;                      // V1.2 — potentiel de progression de charge (barre : élevé ; poids du corps : faible)

  // LOGISTIQUE (DurationEngine)
  timing: {
    secondsPerRep?: { min: number; typical: number; max: number };   // selon le tempo
    setupS: number;                                // installation (rack, réglage)
    loadChangeS?: number;                          // changement de charge
    transitionClass: 'station_fixed' | 'portable' | 'floor' | 'machine' | 'outdoor';  // coût de transition entre exercices
  };
  workRate?: { unit: 'reps_per_min' | 'm_per_min' | 'cal_per_min'; byLevel: Record<Level, { p50: number; p90Slow: number }> };  // cross / HYROX

  // MESURES
  measurableMetrics: ('reps' | 'load' | 'time' | 'distance' | 'calories' | 'rounds' | 'height')[];
  defaultPrescriptionType: Prescription['type'];

  // SÉCURITÉ
  contraindicationTags: string[];                  // 'no_overhead', 'no_impact', 'no_deep_knee_flexion', 'no_jumping'...
  painSensitiveAreas: BodyArea[];                  // zones fonctionnelles sollicitées (§5 bis), utilisées par les restrictions et les douleurs
  maxEffortEligibility?: { minLevel: Level };      // tests RM, sprints maximaux

  // SUBSTITUTIONS (explicites, avec fidélité)
  substitutions: { exerciseId: ExerciseId; fidelity: 'high' | 'medium' | 'low'; context?: 'equipment' | 'restriction' | 'skill'; note?: string }[];

  // PERTINENCE PAR DISCIPLINE (ordinaux 0–3)
  relevance: { hybrid_race?: 0 | 1 | 2 | 3; crosstraining?: 0 | 1 | 2 | 3; running_support?: 0 | 1 | 2 | 3; strength?: 0 | 1 | 2 | 3 };
  hybridRaceStation?: 'skierg' | 'sled_push' | 'sled_pull' | 'burpee_broad_jump' | 'row' | 'farmers_carry' | 'sandbag_lunge' | 'wall_ball';

  // MÉTADONNÉES DE GOUVERNANCE
  meta: { version: number; modifiedAt: ISODate; reviewStatus: 'draft' | 'reviewed' | 'approved' | 'deprecated'; reviewedBy?: string[] };
}
```

**Ajouts par rapport au modèle conceptuel du cahier des charges** :
- `family` et `equivalenceClass` sont distincts. La famille sert à détecter les répétitions, l'équivalence sert aux substitutions (voir §3).
- `progressionFamily.rank` permet les progressions et régressions de difficulté (cross-training, gymnastique).
- `cost.grip` et `cost.axialLoad` : ce sont des facteurs d'interférence réels entre HYROX, cross-training et musculation.
- `workRate` par niveau : indispensable pour estimer la durée d'un WOD « for time ».
- `substitutions` avec **fidélité** : une substitution de faible fidélité est autorisée mais signalée.
- `painSensitiveAreas` : utilisé par le comportement conservateur en cas de douleur (doc 09 §7).
- Les coûts sont **ordinaux (0–3)**. Personne ne sait dire qu'un back squat coûte « 7,3 » : on sait qu'il coûte plus qu'un leg extension. Des valeurs ordinales relues par des experts sont honnêtes et suffisent pour trier et comparer.

## 2 bis. Quatre couches de description (V1.2)

```
EXERCISE
  → movement patterns      (1 primaire + au plus 2 secondaires)     — saisis dans le catalogue
  → muscles                (17 groupes, primaire / secondaire)        — saisis dans le catalogue
  → functional body areas  (zones fonctionnelles, §5 bis)              — saisies dans le catalogue
  → derived planning structures (8 structures, doc 04 §6)              — DÉRIVÉES, jamais saisies
```

| Couche | Sert à | Remarque |
|--------|--------|----------|
| Patterns | Programmation, couverture, anti-doublon, substitutions | L'unilatéralité est un attribut (`laterality`), pas un pattern |
| Muscles | Volume (E1), répartition des séances | Pas de pourcentages : primaire / secondaire |
| Zones fonctionnelles | Restrictions et douleurs | Aucune prétention anatomique ni diagnostique |
| Structures de planification | DemandProfile, L1, InterferenceManager | Dérivées par une table de correspondance versionnée du ruleset |

Aucune précision biomécanique supplémentaire n'est ajoutée sans besoin démontré.

## 3. Hiérarchie de similarité des mouvements

```
Pattern (squat)                            ← ce que fait le corps
 └─ Family (fam.squat_bilateral)           ← même mouvement, variantes
     └─ EquivalenceClass (eq.squat_bilateral_barbell)   ← substituables à stimulus quasi identique
         └─ Exercise (ex.back_squat, ex.safety_bar_squat)
     └─ EquivalenceClass (eq.squat_bilateral_front_loaded)
         └─ Exercise (ex.front_squat, ex.goblet_squat*)
```
\* Le goblet squat appartient à la même famille mais à une autre classe d'équivalence pour un intermédiaire, parce que sa charge est limitée.

| Niveau | Utilisé par | Exemple |
|--------|-------------|---------|
| Pattern | Couverture des patterns, interférence, anti-doublon (large) | squat |
| Family | Anti-doublon (répétition d'un même mouvement), suivi de progression | back / front / goblet squat |
| EquivalenceClass | Substitutions à fidélité élevée | back squat ↔ safety bar squat |
| Exercise | Prescription, historique exact | back squat |

## 4. Patterns (liste initiale, extensible)

Les patterns sont une **table de données**, pas un `enum` figé dans le code : on peut en ajouter sans modifier le moteur (C10). Le moteur ne raisonne que sur leurs attributs (`region`, `plane`, `isLocomotor`).

| PatternId | Région | Remarques |
|-----------|--------|-----------|
| `squat` | bas | bilatéral dominant genou |
| `hinge` | bas / chaîne postérieure | soulevé de terre, hip thrust, swing |
| `lunge` | bas | unilatéral : fentes, split squat, step-up (fentes sandbag HYROX) |
| `push_horizontal` | haut | développé, pompes |
| `push_vertical` | haut | développé militaire, handstand push-up, jerk |
| `pull_horizontal` | haut | rowing |
| `pull_vertical` | haut | tractions, tirage |
| `carry` | global | farmers, suitcase, overhead carry |
| `locomotion` | global | marche, crawl, burpee broad jump (+ `jumping`) |
| `rotation` | tronc | lancers rotatifs, woodchop |
| `anti_rotation` | tronc | Pallof press, suitcase carry |
| `trunk_flexion` | tronc | sit-up, toes-to-bar, GHD |
| `trunk_extension` | tronc | back extension |
| `anti_extension` | tronc | planche, ab wheel |
| `running` | cyclique | course (tous contextes) |
| `rowing` | cyclique | rameur |
| `skiing` | cyclique | SkiErg |
| `cycling` | cyclique | vélo, assault bike |
| `sled_push` | bas / global | sled push, tapis non motorisé poussé |
| `sled_pull` | haut / global | sled pull, tirage de corde |
| `jumping` | bas / impact | box jump, broad jump, double-unders |
| `throwing` | global | wall ball, med ball slam |
| `olympic_lift` | global | arraché, épaulé-jeté et dérivés |
| `isolation_upper` / `isolation_lower` | local | curls, extensions, leg curl |
| `mobility` | — | échauffement, retour au calme (exclu de l'anti-doublon) |

**Précisions V1.2** :
- `lunge` couvre les mouvements unilatéraux à dominante genou (fentes, split squat, step-up) ; l'unilatéralité reste l'attribut `laterality`.
- Les exercices hybrides passent par les patterns secondaires : thruster = `squat` + `push_vertical` ; wall ball = `squat` + `throwing` ; burpee broad jump = `locomotion` + `jumping` ; épaulé = `olympic_lift` (secondaires `hinge` + `squat`).
- `olympic_lift` reste un pattern primaire, à cause de son coût technique et de ses interférences propres.
- Les patterns locomoteurs (`running`, `sled_push`, `sled_pull`, ergomètres) portent le contexte d'exposition (doc 04 §3.3).

## 5. Groupes musculaires (17, validés en V1.2)

`quadriceps`, `hamstrings`, `glutes`, `adductors`, `calves`, `hip_flexors`, `lower_back`, `abs_obliques`, `chest`, `front_delts`, `side_delts`, `rear_delts`, `lats`, `upper_back_traps`, `biceps`, `triceps`, `forearms_grip`.
Granularité volontairement moyenne : plus fin serait de la fausse précision pour le volume, plus grossier ne suffirait pas à répartir un split.

## 5 bis. Zones fonctionnelles (V1.2)

Liste fermée, utilisée **uniquement** par les restrictions (doc 02 §1) et les signalements de douleur (doc 09 §7) : épaule, coude, poignet/main, cou, haut du dos, bas du dos, hanche/aine, genou, jambe (mollet/Achille), cheville/pied.
Ce sont des zones décrites en langage courant, sans prétention anatomique ni diagnostique. La liste est une donnée versionnée (contenu G1 pour son usage en sécurité).

## 6. Validation automatique du catalogue (CI)

- Schéma complet ; identifiants uniques ; `replacedBy` et `substitutions` pointant vers des exercices existants et actifs.
- Toute substitution satisfait la classe d'équivalence ou le pattern annoncé (fidélité `high` ⇒ même classe d'équivalence).
- Chaque archétype V1 dispose d'au moins N candidats par emplacement pour chaque preset de matériel (salle, box, maison, poids du corps). Sinon, alerte de couverture.
- Chaque station HYROX a au moins une substitution par preset de matériel, avec sa fidélité.
- Chaque exercice `loadable` a un `loadModel`, et chaque exercice utilisable en conditioning a un `workRate` pour chaque niveau.
- Rapport de couverture : exercices par pattern × matériel × niveau.

## 7. Complétude du catalogue V1 (V1.2)

**Le nombre d'exercices n'est plus un objectif** : c'est un résultat. Priorités : (1) couverture, (2) qualité des métadonnées, (3) substitutions, (4) progressions et régressions, (5) diversité réelle du matériel, (6) qualité avant quantité.

Le catalogue est **suffisamment complet pour la V1** quand les critères CC1 à CC11 sont tous au vert dans le rapport de couverture (CI) et que la relecture G5 des métadonnées est terminée.

| # | Critère |
|---|---------|
| CC1 | **Archétypes** : chaque emplacement de chaque archétype V1 a au moins N candidats admissibles (paramètre, valeur initiale 3), dont au moins 2 familles distinctes quand l'anti-doublon l'exige, pour chaque preset où l'archétype est déclaré faisable. Un archétype infaisable pour un preset est **déclaré** comme tel, jamais implicite |
| CC2 | **Pattern × classe de matériel** : chaque pattern principal est couvert dans chaque classe pertinente (barre, haltères, KB, machine, poulie, poids du corps, élastique) |
| CC3 | **Chaînes de progression et régression** complètes pour chaque famille technique (tractions, pompes, HSPU, toes-to-bar, double-unders, pistol, muscle-up…) ; au moins une régression accessible à un novice pour chaque mouvement principal chargé |
| CC4 | **Substitutions** : chaque exercice a au moins un substitut de fidélité élevée ou moyenne dans une autre classe de matériel ; chaque station HYROX a des substituts pour chaque preset, avec leur fidélité |
| CC5 | **Unilatéral** : des options unilatérales pour squat, hinge et fente dans chaque preset |
| CC6 | **Machines et poulies** : dans le preset salle, chaque groupe musculaire principal a au moins une option machine **et** une option poulie |
| CC7 | **Restrictions** : pour chaque restriction de la liste fermée, chaque archétype reste faisable avec alternatives, ou est déclaré infaisable |
| CC8 | **Échauffement et mobilité** : échauffement général + spécifique par famille de patterns ; mobilité limitée à ce qu'utilisent les archétypes |
| CC9 | **Course** : types de segments, éducatifs, accélérations, avec des métadonnées complètes (impact, structures dérivées) |
| CC10 | **Qualité des métadonnées** : 100 % des champs obligatoires ; `workRate` pour tout exercice utilisable en conditioning ; timing ; contre-indications ; zones fonctionnelles ; correspondance aux structures ; statut au moins `reviewed` en bêta et `approved` (G5) en production |
| CC11 | **Presets** : 6 points de départ modifiables. Salle commerciale : machines et poulies explicitement listées (liste cochable). Box cross-training. Salle HYROX (box + sled + SkiErg + sandbag). Maison équipée. Haltères seuls (+ banc optionnel). Poids du corps (+ barre de traction et élastiques optionnels) |

**Machines et poulies = candidats de première classe.**
- Il est **interdit** d'introduire un bonus implicite global favorisant les charges libres ou le polyarticulaire.
- Les préférences de modalité sont portées par **l'emplacement** de l'archétype : un mouvement principal de force privilégie `loadCeiling` élevé ; un accessoire d'hypertrophie peut privilégier `stability` élevée et un faible coût technique ; un emplacement spécifique HYROX privilégie la spécificité.
- Test d'équité et métrique de part des modalités par preset : doc 11 §2, doc 10 §3.

Dépendance : CC1 suppose la liste des archétypes V1 (doc 13 §3, point 2).
