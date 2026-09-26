# 04 — Moteur d'entraînement

Couvre : **E** (architecture détaillée), **F** (moteurs par discipline et coordination), **G** (règles et contraintes).

## 1. Principes non négociables

1. **Fonctions pures** : `(snapshot, options) → résultat + trace`. Aucune I/O, aucune horloge implicite (`now` est injecté), aucun hasard implicite.
2. **Déterminisme** : mêmes entrées ⇒ même sortie. Le seul « hasard » est un départage entre candidats **de score équivalent**, via un PRNG à graine (`seed` stockée dans le plan). Le hasard ne remplace jamais une règle.
3. **Explicabilité** : chaque décision significative produit une entrée de trace (`ruleId`, entrées, choix, alternatives rejetées et pourquoi).
4. **Données manquantes explicites** : une donnée absente n'est jamais inventée. Le moteur choisit une stratégie documentée (prescription par RPE au lieu d'une charge, test planifié, valeur prudente marquée `assumed`) et le signale dans la trace.
5. **Validation systématique** : aucune sortie (moteur, adaptation, édition manuelle, IA future) n'est publiée sans passer le validateur (doc 09).
6. **Versionné** : `engineVersion` (code) + `rulesetVersion` (paramètres) + `catalogVersion` (données).
7. **Indépendant** : aucune dépendance à l'UI, à la base de données, au réseau, aux abonnements (RevenueCat ou autre) ni à un LLM. Le moteur ne sait pas si l'utilisateur est gratuit ou premium : les droits sont appliqués par la couche applicative (doc 03 §9).
8. **Testable isolément** : tout le moteur s'exécute dans un test unitaire Node sans aucun service externe.

> Ces principes sont des **contraintes validées** (2026-09-26) du cadrage détaillé du moteur.

## 2. E — Pipeline

```
 AthleteSnapshot ─┐
 Catalog ─────────┤
 Ruleset (params) ┤
 History (logs) ──┤
 Current plan ────┘
        │
        ▼
 ① NORMALISATION & CONTRÔLE DES ENTRÉES ── données manquantes → stratégie explicite
        ▼
 ② ÉVALUATION (assessment) ── capacités : e1RM, VDOT / vitesse critique, niveau par discipline,
        │                      état de fatigue, charge aiguë/chronique, confiance de chaque estimation
        ▼
 ③ ARBITRAGE DES OBJECTIFS ── priorités, enveloppe hebdo par dimension de charge (séances, minutes, muscles, intensité, impact, cardio)
        ▼
 ④ MACRO-PLANIFICATION ── cycle : phases (base / développement / spécifique / affûtage / décharge / tests)
        │                   calées sur la date d'événement ou cycles de 4–6 semaines
        ▼
 ⑤ DEMANDES DE SÉANCES ── chaque module discipline émet des SessionRequest pour la semaine
        ▼
 ⑥ ORDONNANCEMENT HEBDOMADAIRE ── placement sur les jours dispo (satisfaction de contraintes + score)
        ▼
 ⑦ CONCEPTION DES SÉANCES ── le module de la discipline construit blocs + exercices (sélection + anti-doublon)
        ▼
 ⑧ DOSAGE ── séries, reps, charges, RPE/RIR, allures, intervalles, tours, time caps
        ▼
 ⑨ DURÉE ── estimation + ajustement à la durée cible (doc 06)
        ▼
 ⑩ VALIDATION ── règles dures/souples, globales et par discipline (doc 09)
        │    └─ échec → RÉPARATION ciblée (max N itérations) → sinon erreur explicite, jamais de sortie invalide
        ▼
 ⑪ SORTIE : PlanDraft + ValidationReport + DecisionTrace + explications utilisateur
```

### Contrats principaux

```ts
interface EngineContext { now: ISODate; seed: string; ruleset: Ruleset; catalog: Catalog; }

interface AthleteSnapshot {
  profile: AthleteProfile; goals: Goal[]; availability: Availability; equipment: EquipmentProfile;
  references: ReferencePerformance[]; history: TrainingHistory /* logs + états dérivés */; currentPlan?: PlanView;
}

// Points d'entrée publics du moteur (API stable du package)
generateProgram(snapshot, ctx): EngineResult<ProgramDraft>;
extendPlan(snapshot, horizonWeeks, ctx): EngineResult<PlanRevisionDraft>;           // génération glissante
adapt(snapshot, event: AdaptationEvent, ctx): EngineResult<AdaptationProposal[]>;   // doc 08
estimateDuration(session, athleteTiming, ctx): DurationEstimate;                     // doc 06
validatePlan(plan, snapshot, ctx): ValidationReport;                                 // doc 09
updateCapacities(history, ctx): CapacityEstimate[];                                  // doc 07

type EngineResult<T> =
  | { ok: true; value: T; report: ValidationReport; trace: DecisionTrace; warnings: EngineWarning[] }
  | { ok: false; error: EngineError; trace: DecisionTrace };   // erreur typée : INSUFFICIENT_AVAILABILITY, CONFLICTING_GOALS, ...
```

Une erreur telle que `INSUFFICIENT_AVAILABILITY` (« préparer un marathon en 2 × 20 min/semaine ») est remontée **à l'utilisateur** avec des options, au lieu de produire un plan incohérent.

### Structure interne du package

```
packages/engine/src/
├─ core/              pipeline, contexte, PRNG à graine, trace, erreurs typées
├─ assessment/        capacités, niveaux, confiance, charge (ACWR), fatigue
├─ arbitration/       priorités d'objectifs, enveloppes hebdo par dimension
├─ periodization/     macro-cycles, phases, décharges, tests périodiques
├─ scheduling/        ordonnanceur hebdo (contraintes + scoring)
├─ selection/         filtrage/score des exercices, similarité, anti-doublon (doc 05)
├─ duration/          modèle de durée + ajustement (doc 06)
├─ progression/       modèles de progression (doc 07)
├─ adaptation/        analyse d'impact, stratégies, diff (doc 08)
├─ validation/        registre de règles, validateurs (doc 09)
├─ load/              profils de charge multidimensionnels, registre, récupération, contributions de course
├─ disciplines/
│  ├─ strength/
│  ├─ running/
│  ├─ crosstraining/
│  └─ hybrid_race/
└─ index.ts           API publique uniquement
```

## 3. F — Moteurs par discipline et coordination

### 3.1 Le problème

Chaque discipline a sa propre logique (la course raisonne en allures et en km, la musculation en patterns et séries difficiles, le cross-training en formats/durées/modalités, HYROX en course compromise + stations). Mais elles partagent **le même corps et le même calendrier**.

| Option | + | − |
|--------|---|---|
| Moteur unique générique | Une seule logique | Perd la spécificité ; la course devient « un exercice » (explicitement refusé) |
| Moteurs totalement indépendants | Spécialisation maximale | Aucun arbitrage : 3 séances jambes lourdes d'affilée |
| **Modules spécialisés + orchestrateur + langage commun** | Spécialisation ET coordination | Définir soigneusement le langage commun |

**Décision : modules + orchestrateur.**

### 3.2 Langage commun entre modules : un profil de charge multidimensionnel

> ⚠️ **Remplacé par TRAINING ENGINE SPECIFICATION V1** ([engine-spec/04](../engine-spec/04-charge-athlete-state.md)) : les 8 dimensions sont reclassées (LOAD / STATE / CONSTRAINT / CONTEXT / DERIVED) et `WeeklyLoadEnvelope` n'est plus un ensemble de 8 budgets. Seules 5 limites justifiées sont retenues. Le texte ci-dessous est conservé pour l'historique.

> **Décision validée (2026-09-26)** : il n'existe **pas** de « budget de charge » numérique unique servant de vérité physiologique. La charge est décrite par plusieurs **dimensions indépendantes**, chacune avec ses propres contraintes. Un score synthétique peut exister comme **heuristique interne** (tri, départage, tableau de bord de debug), mais il n'est jamais utilisé pour autoriser ou refuser une séance à la place des dimensions.

Dimensions minimales (à préciser lors du cadrage détaillé du moteur) :

| Dimension | Ce qu'elle décrit | Exemples d'unités (provisoires) |
|-----------|-------------------|--------------------------------|
| **Stress musculaire / local** | Sollicitation de chaque groupe musculaire | Séries difficiles pondérées par groupe, part excentrique |
| **Patterns sollicités** | Quels schémas moteurs sont chargés | Volume par pattern (squat, hinge, push, pull, carry…) |
| **Volume** | Quantité de travail | Séries, reps, tonnage, durée, distance — **par discipline, jamais additionnés entre unités** |
| **Intensité** | Niveau d'effort | %1RM, RPE/RIR, zone d'allure, zone d'effort cardio |
| **Stress locomoteur / impact** | Contraintes tendineuses et osseuses liées à la course, aux sauts, aux fentes | Temps/distance d'impact typés (voir 3.4 bis), nombre de sauts |
| **Stress cardiovasculaire** | Sollicitation des systèmes énergétiques | Temps passé par zone d'intensité, part anaérobie |
| **Exposition récente** | Historique des sollicitations | Fenêtres 7/14/28 j par dimension, ratio aigu/chronique **par dimension** |
| **Récupération disponible** | Temps et capacité de récupération avant la prochaine sollicitation | Heures depuis la dernière sollicitation de la même structure, ressenti déclaré, séances manquées/réalisées |

```ts
interface LoadProfile {                // ce qu'une séance sollicite (prévu) ou a sollicité (réalisé)
  muscular: Record<MuscleGroupId, { hardSets: number; eccentricBias: number }>;
  patterns: Record<MovementPatternId, number>;
  volume: VolumeByDiscipline;          // unités natives par discipline, pas de somme inter-unités
  intensity: IntensityDistribution;    // temps / séries par zone
  locomotor: LocomotorExposure[];      // expositions typées (course fraîche, compromise, sauts…)
  cardio: { minutesByZone: Record<IntensityZone, number>; anaerobicShare: number };
  recoveryDemand: Record<RecoveryStructure, number>; // heures estimées avant nouvelle sollicitation lourde
}

interface SessionRequest {             // ce qu'un module demande à l'orchestrateur
  id: string; discipline: Discipline; archetype: string;
  priority: 'key' | 'standard' | 'optional';
  targetMinutes: { min: number; ideal: number; max: number };
  expectedLoad: LoadProfile;
  constraints: PlacementConstraint[];  // ex. { type: 'minGapAfter', tag: 'heavy_lower', hours: 36 }
  flexibility: number;                 // facilité à déplacer / raccourcir
}

interface WeeklyLoadEnvelope {         // bornes hebdo fixées par l'arbitrage — une borne PAR dimension
  sessions: { min: number; max: number };
  byDiscipline: Partial<Record<Discipline, { sessions: number; minutes: { min: number; max: number } }>>;
  muscular: Record<MuscleGroupId, { minHardSets: number; maxHardSets: number }>;
  intensity: { maxHighIntensitySessions: number; minLowIntensityShare?: number };
  locomotor: { runningContribution: { target: number; max: number }; maxWeeklyIncrease: number }; // voir 3.4 bis
  cardio: { maxMinutesHighZones: number };
}

interface DisciplineModule {
  id: Discipline;
  assess(snapshot, ctx): DisciplineAssessment;
  planPhases(goal, assessment, calendar, ctx): PhasePlan;                 // contribution à la macro
  requestSessions(week: WeekContext, envelope, ctx): SessionRequest[];    // demande hebdo
  designSession(slot: ScheduledSlot, sessionCtx, ctx): SessionDraft;      // construction concrète
  progress(history, ctx): ProgressionUpdate[];
  rules: Rule[];                                                           // règles propres (doc 09)
  archetypes: SessionArchetype[];                                          // catalogue de types de séances
}
```

### 3.3 Orchestrateur (coordination)

Responsabilités :

1. **Arbitrage** : fixe l'enveloppe hebdomadaire (`WeeklyLoadEnvelope`) selon la priorité des objectifs et la phase (ex. HYROX principal à 6 semaines de la course ⇒ muscu en maintien, 1 séance).
2. **Ordonnancement** : place les `SessionRequest` sur les créneaux disponibles.
   - Contraintes **dures** (jours disponibles, durée max du jour, max séances/jour, écart minimal entre séances clés incompatibles, repos minimal hebdo, bornes de chaque dimension).
   - Contraintes **souples** pondérées (espacer les séances clés, éviter jambes lourdes la veille d'une séance de seuil, alterner les dimensions sollicitées, placer la sortie longue le jour le plus long).
   - Algorithme : recherche avec retour arrière (backtracking) sur un espace petit (≤ 7 jours × 2 créneaux × ~8 séances) + score ; déterministe ; si aucune solution satisfait les contraintes dures ⇒ dégradation contrôlée (retirer d'abord les séances `optional`, puis réduire les `standard`, jamais les `key` sans le signaler).
3. **Registre de charge (load ledger)** : simule jour par jour chaque dimension séparément (récupération modélisée par structure) pour vérifier qu'aucune séance clé n'est placée sur une structure pas encore récupérée. Les vérifications portent sur les dimensions, pas sur un total.
4. **Transmission du contexte** au module lors de `designSession` : séances de la veille / lendemain, exposition récente des exercices et des patterns, état projeté de chaque dimension ⇒ le module de musculation peut par exemple choisir un travail du haut du corps si la course de la veille était une séance de côtes.

### 3.4 Règles d'interférence inter-disciplines (exemples, paramétrables)

| Situation | Règle par défaut | Type |
|-----------|------------------|------|
| Jambes lourdes (squat/hinge > 80 % 1RM) et séance course clé (seuil / intervalles / longue) | ≥ 24 h entre les deux ; préférable : la course clé **avant** | Dure (24 h) + souple (ordre) |
| Deux séances à haute intensité le même jour | Interdit sauf profil avancé ET 2 séances/jour autorisées ET ≥ 6 h d'écart | Dure |
| Contribution de course totale | Somme des **contributions calculées** (voir 3.4 bis) de la course, du HYROX et du cross-training, bornée par l'enveloppe locomotrice | Dure (max) |
| Progression de la charge de course | Hausse hebdo de la contribution bornée (paramètre à valider) ET ratio aigu/chronique locomoteur sous un seuil | Dure |
| Muscle local | Pas deux séances à stress local élevé sur le même groupe à < 48 h | Dure |
| Semaine de décharge | Synchronisée entre disciplines (sinon la décharge ne décharge rien) | Dure |
| Événement (course, HYROX) | Affûtage : réduction du volume global, maintien de l'intensité, suppression des séances à fort coût neuromusculaire J-5 → J | Dure |

### 3.4 bis Kilomètres hybrides (HYROX, Cross-Training)

> **Décision validée (2026-09-26)** : les kilomètres courus pendant une séance HYROX ou Cross-Training sont **enregistrés et pris en compte** par le moteur Running et l'orchestrateur, mais **ne sont pas équivalents kilomètre pour kilomètre** à une sortie de course classique.

Chaque portion de course est enregistrée comme une **exposition typée** qui conserve son contexte :

```ts
interface RunningExposure {
  id: UUID;
  sourceSessionId: UUID;               // séance d'origine (course, HYROX, cross-training)
  sourceDiscipline: Discipline;
  context: 'fresh' | 'compromised' | 'interval' | 'continuous' | 'wod_embedded';
  distanceM: number; durationS: number;
  intensity: { zone?: IntensityZone; rpe?: number; paceSPerKm?: number };
  segmentCount: number;                // ex. 8 × 1 km ⇒ 8
  recoveryBetweenS?: number;           // récupération entre segments
  precededBy?: { exerciseIds: string[]; loadProfileRef: string }; // station / mouvements qui précèdent (course compromise)
  planned: boolean;                    // prévu vs réalisé (seul le réalisé compte dans l'historique)
}
```

Le moteur Running expose une fonction **pure et testée** :

```ts
runningContribution(exposure: RunningExposure, athlete: RunningAssessment, ruleset): {
  volumeContribution: number;          // part comptée dans le volume de course
  locomotorStress: number;             // part comptée dans le stress d'impact
  cardioStress: CardioContribution;
  specificity: number;                 // utilité pour l'objectif course (ex. 1 km compromis ≠ 1 km en endurance fondamentale)
  rationale: string;                   // traçable
}
```

Les coefficients (effet du contexte « compromis », de la fragmentation, de l'intensité, de la récupération) sont des **paramètres du ruleset**, à définir avec les spécialistes course et HYROX lors du cadrage — aucun coefficient n'est figé à ce stade. La trace conserve toujours les km bruts ET leur contribution calculée.

### 3.5 Spécificités de chaque module

**Musculation (`strength`)**
- Unités de raisonnement : patterns moteurs, groupes musculaires, **séries difficiles hebdomadaires** par groupe (fourchettes selon niveau et objectif), intensité (%1RM, RPE/RIR).
- Choix du split selon la fréquence : 1–2 ⇒ full body ; 3 ⇒ full body ou haut/bas/full ; 4 ⇒ haut/bas ; 5+ ⇒ variantes. Adapté si d'autres disciplines sollicitent déjà les jambes.
- Structure type : échauffement général → montée en charge (ramp-up) → mouvement principal → secondaire → accessoires (superset possibles pour tenir la durée) → retour au calme.
- Exercices « ancres » maintenus sur un mésocycle (progression mesurable), accessoires plus variés.

**Course (`running`) — moteur à part entière**
- Évaluation : allures dérivées d'une performance de référence (modèle type VDOT/Daniels ou vitesse critique ; choix final à valider avec un coach course). Sans référence : séances à l'effort perçu + test planifié (ex. 5 km ou test 30 min) en semaine 1–2.
- Zones d'intensité (5 zones) avec allures ET effort perçu (et FC si disponible plus tard).
- Répartition de l'intensité majoritairement facile (type 80/20), 1–2 séances de qualité/semaine selon niveau.
- Types de séances : facile, sortie longue (part du volume hebdo plafonnée), tempo/seuil, intervalles VO2, côtes, fartlek, allure spécifique, récupération, test.
- Progression du volume, semaines de décharge, affûtage avant course cible.
- **Sources de données d'exécution (décision validée : pas de GPS natif en V1)** : le moteur ne consomme que des `RunActivity` normalisées (voir doc 02 §4), quelle que soit leur origine — saisie manuelle et exécution guidée en V1, import Apple Santé / Health Connect ensuite, tracking GPS natif éventuellement plus tard. Ajouter une source = ajouter un **adaptateur** hors du moteur ; le domaine Running et ses règles ne changent pas.

**Cross-Training (`crosstraining`)**
- Formats : AMRAP, EMOM, For Time (+ time cap), intervalles, chipper, rounds, force + metcon.
- Dimensions : domaine de temps (court < 7 min, moyen 7–15, long > 15), modalités (gymnastique / haltérophilie / monostructural), stimulus visé, schéma de répétitions.
- Mise à l'échelle (scaling) par exercice via chaînes de progression/régression + niveau de skills déclaré.
- Benchmarks récurrents pour mesurer les progrès.

**HYROX / course fonctionnelle (`hybrid_race`)**
- Modèle de course de référence : 8 × (1 km de course + 1 station) — SkiErg 1000 m, sled push 50 m, sled pull 50 m, burpee broad jumps 80 m, rameur 1000 m, farmers carry 200 m, sandbag lunges 100 m, wall balls 100 reps ; charges selon division/sexe (table dans le ruleset, à vérifier avec le règlement officiel en vigueur).
- Séances : course compromise (run + station alternés), endurance de stations, force spécifique (sled, lunges), simulation partielle/complète, travail d'allure de course.
- Délègue le pur travail de course au module `running` (allures communes) ; chaque portion courue produit une `RunningExposure` typée dont la contribution est calculée par le moteur Running (3.4 bis).
- **Nom et marque** : identifiant interne neutre `hybrid_race` ; le libellé affiché (« HYROX », « course fonctionnelle »…) est un texte de présentation configurable, choisi après vérification juridique de la marque avant commercialisation. Le moteur ne dépend pas du nom.
- **Substitutions matériel** indispensables (pas de sled / SkiErg dans la plupart des salles) avec équivalences documentées.

### 3.6 Archétypes de séances

Chaque module possède un catalogue d'**archétypes** (gabarits paramétrables), ex. `run_threshold_cruise_intervals`, `strength_upper_hypertrophy`, `cf_short_couplet_for_time`, `hybrid_race_compromised_run_4x`. Un archétype définit : blocs, formats admissibles, profil de charge attendu, fourchette de durée, contraintes de placement, niveaux admissibles.
Pourquoi : un espace de séances **borné et relu par des experts** garantit la qualité sportive, tandis que la variété vient de la sélection d'exercices, du dosage et de la rotation d'archétypes — pas de la génération libre.

## 4. G — Système de règles et contraintes

### 4.1 Typologie

| Type | Rôle | Effet si non respecté | Exemple |
|------|------|-----------------------|---------|
| **Contrainte dure** | Ne doit jamais être violée | Réparation, sinon échec explicite | Séance sur un jour indisponible ; exercice sans le matériel |
| **Contrainte souple** | Préférence pondérée | Pénalité de score | Espacer les séances clés de 48 h |
| **Invariant** | Propriété structurelle | Bug moteur (test rouge) | Une séance a exactement 1 bloc `warmup` en tête |
| **Règle de dosage** | Calcule une prescription | — | Charge = e1RM × %cible arrondi au pas du matériel |
| **Règle de sécurité** | Protège l'utilisateur | Bloquant | Pas d'haltérophilie olympique lourde pour un débutant ; limitation « pas d'impact » ⇒ zéro saut |

### 4.2 Représentation

| Option | + | − |
|--------|---|---|
| Moteur de règles générique (JSON/DSL, type json-rules-engine / Drools) | Modifiable sans déploiement | Difficile à tester, typer, déboguer ; logique cachée dans des données ; faux sentiment de flexibilité |
| Règles codées en dur dispersées | Rapide | Inmaintenable, non traçable |
| **Règles = objets typés dans un registre + paramètres dans un ruleset versionné** | Testables unitairement, typées, traçables, seuils réglables | Changer la *logique* d'une règle demande une release (accepté : c'est souhaitable) |

**Décision : registre de règles typées + ruleset paramétrique.**

> ⚠️ **Précisé par TRAINING ENGINE SPECIFICATION V1** ([engine-spec/09](../engine-spec/09-validation-repair-regles.md)) : statuts `draft / reviewed / approved / deprecated`, classes de gouvernance G1–G5 ; la politique de blocage du build (« garde-fou de mise en production » ci-dessous) est **suspendue** en attendant la décision n° 4.

> **Décision validée (2026-09-26)** : toute règle sportive importante est **documentée, versionnée et auditable**. Les règles destinées à la production doivent être relues par des professionnels qualifiés avant commercialisation.

```ts
interface RuleMetadata {                // la « fiche » de la règle — obligatoire, validée en CI
  id: string;                           // stable, ex. 'RUN.VOLUME.WEEKLY_INCREASE_MAX' — jamais réutilisé
  title: string;
  description: string;                  // ce que fait la règle, en langage clair
  category: RuleCategory;               // 'safety' | 'recovery' | 'volume' | 'intensity' | 'progression' | 'variety'
                                        // | 'duration' | 'scheduling' | 'interference' | 'structure' | 'equipment'
  discipline?: Discipline;              // absent = transverse
  scope: 'session' | 'week' | 'phase' | 'program' | 'cross_discipline';
  severity: 'hard' | 'soft' | 'safety';
  rationale: string;                    // POURQUOI la règle existe (lisible par un coach)
  references: { kind: 'study' | 'guideline' | 'book' | 'expert_consensus' | 'internal'; citation: string; url?: string }[];
  confidence: 'established' | 'consensus' | 'heuristic' | 'provisional';
                                        // niveau de preuve : littérature solide / consensus d'experts / heuristique / hypothèse à valider
  version: string;                      // SemVer de la règle (logique ou paramètres par défaut)
  modifiedAt: ISODate;
  changelog: { version: string; date: ISODate; change: string; author: string }[];
  review: {
    status: 'draft' | 'internal_review' | 'expert_approved' | 'deprecated';
    reviewers: { name: string; qualification: string; date: ISODate; verdict: 'approved' | 'changes_requested'; notes?: string }[];
  };
  productionEligible: boolean;          // dérivé : true seulement si review.status === 'expert_approved'
}

interface Rule<P = unknown> {
  meta: RuleMetadata;
  weight?: number;                      // pour les règles souples
  params: (ruleset: Ruleset) => P;      // seuils lus dans le ruleset versionné
  evaluate(input: RuleInput, params: P): RuleOutcome; // pure
  repair?(input: RuleInput, params: P, violation: Violation): RepairAction[]; // optionnel
}

interface Violation { ruleId: string; ruleVersion: string; severity: RuleMetadata['severity']; target: EntityRef; message: I18nKey; data: Record<string, number | string>; }
```

- Le **ruleset** (JSON versionné, validé par schéma) contient les seuils : volumes par niveau, fourchettes RPE, écarts de récupération, tolérances de durée, fenêtres anti-doublon, coefficients de contribution de course, etc. Chaque paramètre porte lui aussi `confidence`, `references` et `modifiedAt`.
- Chaque règle a ses **tests unitaires** (cas nominal, bornes, cas limites) ; un test de CI échoue si une fiche est incomplète (pas de rationale, pas de catégorie, pas de version).
- **Registre auditable** : un outil (`engine-cli rules export`) génère depuis le code le catalogue complet des règles et paramètres (Markdown/HTML/CSV) — c'est ce document que relisent les professionnels. Le catalogue est versionné avec le ruleset ; un diff entre deux versions est produit automatiquement.
- **Garde-fou de mise en production** : un build de production refuse un ruleset contenant une règle `safety` ou `hard` non `expert_approved` (configurable en dev/staging pour permettre l'itération).
- **Traçabilité** : chaque plan référence `rulesetVersion` ; chaque décision de la trace référence `ruleId` + `ruleVersion` ⇒ on peut expliquer après coup pourquoi une séance a été générée ainsi.
- Le même registre sert au **générateur** (score & contraintes pendant la construction) et au **validateur** (contrôle a posteriori) ⇒ une règle écrite une seule fois.

### 4.3 Résolution de conflits entre règles

Ordre de priorité fixe et documenté :
**Sécurité > Contraintes dures > Objectif principal > Cohérence de progression > Objectifs secondaires > Variété > Préférences de confort.**
Exemple : la variété ne peut jamais remplacer le squat ancre d'un cycle de force ; un objectif secondaire cède sa séance si l'enveloppe hebdomadaire ne suffit pas, avec explication.
