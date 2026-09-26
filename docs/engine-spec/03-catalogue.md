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
  painSensitiveAreas: BodyArea[];                  // zones sollicitées (utilisé en cas de PainReport)
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

Les patterns sont une **table de données**, pas un `enum` figé dans le code : on peut en ajouter sans modifier le moteur (C10). Le moteur ne raisonne que sur leurs attributs (`region`, `plane`, `locomotor`).

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

## 5. Groupes musculaires (liste initiale)

`quadriceps`, `hamstrings`, `glutes`, `adductors`, `calves`, `hip_flexors`, `lower_back`, `abs_obliques`, `chest`, `front_delts`, `side_delts`, `rear_delts`, `lats`, `upper_back_traps`, `biceps`, `triceps`, `forearms_grip`.
Granularité volontairement moyenne : plus fin serait de la fausse précision pour le volume, plus grossier ne suffirait pas à répartir un split.

## 6. Validation automatique du catalogue (CI)

- Schéma complet ; identifiants uniques ; `replacedBy` et `substitutions` pointant vers des exercices existants et actifs.
- Toute substitution satisfait la classe d'équivalence ou le pattern annoncé (fidélité `high` ⇒ même classe d'équivalence).
- Chaque archétype V1 dispose d'au moins N candidats par emplacement pour chaque preset de matériel (salle, box, maison, poids du corps). Sinon, alerte de couverture.
- Chaque station HYROX a au moins une substitution par preset de matériel, avec sa fidélité.
- Chaque exercice `loadable` a un `loadModel`, et chaque exercice utilisable en conditioning a un `workRate` pour chaque niveau.
- Rapport de couverture : exercices par pattern × matériel × niveau.

## 7. Taille visée V1

Environ 250 à 350 exercices, suffisants pour tous les archétypes V1 et tous les presets de matériel. Le chiffre exact sera arrêté lors de la constitution du catalogue (décision à valider n° 12).
