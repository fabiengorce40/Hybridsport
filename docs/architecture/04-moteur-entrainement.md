# 04 — Moteur d'entraînement

Couvre : **E** (architecture détaillée), **F** (moteurs par discipline et coordination), **G** (règles et contraintes).

## 1. Principes non négociables

1. **Fonctions pures** : `(snapshot, options) → résultat + trace`. Aucune I/O, aucune horloge implicite (`now` est injecté), aucun hasard implicite.
2. **Déterminisme** : mêmes entrées ⇒ même sortie. Le seul « hasard » est un départage entre candidats **de score équivalent**, via un PRNG à graine (`seed` stockée dans le plan). Le hasard ne remplace jamais une règle.
3. **Explicabilité** : chaque décision significative produit une entrée de trace (`ruleId`, entrées, choix, alternatives rejetées et pourquoi).
4. **Données manquantes explicites** : une donnée absente n'est jamais inventée. Le moteur choisit une stratégie documentée (prescription par RPE au lieu d'une charge, test planifié, valeur prudente marquée `assumed`) et le signale dans la trace.
5. **Validation systématique** : aucune sortie (moteur, adaptation, édition manuelle, IA future) n'est publiée sans passer le validateur (doc 09).
6. **Versionné** : `engineVersion` (code) + `rulesetVersion` (paramètres) + `catalogVersion` (données).

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
 ③ ARBITRAGE DES OBJECTIFS ── priorités, répartition du budget hebdo (séances, minutes, charge)
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
├─ arbitration/       priorités d'objectifs, budgets
├─ periodization/     macro-cycles, phases, décharges, tests périodiques
├─ scheduling/        ordonnanceur hebdo (contraintes + scoring)
├─ selection/         filtrage/score des exercices, similarité, anti-doublon (doc 05)
├─ duration/          modèle de durée + ajustement (doc 06)
├─ progression/       modèles de progression (doc 07)
├─ adaptation/        analyse d'impact, stratégies, diff (doc 08)
├─ validation/        registre de règles, validateurs (doc 09)
├─ fatigue/           empreintes de fatigue, modèle de récupération
├─ disciplines/
│  ├─ strength/
│  ├─ running/
│  ├─ crosstraining/
│  └─ hyrox/
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

### 3.2 Langage commun entre modules

```ts
interface FatigueFootprint {           // ce qu'une séance « coûte » et à quoi
  systemic: number;                    // 0..10 — fatigue générale
  neural: number;                      // charges lourdes, sprints, skills complexes
  aerobic: number; anaerobic: number;  // systèmes énergétiques
  impactKm: number;                    // km de course/impact (tendons, os)
  muscles: Record<MuscleGroupId, number>; // fatigue locale par groupe (0..10)
  recoveryHours: { full: number; partial: number }; // délai avant séance sollicitant les mêmes structures
}

interface SessionRequest {             // ce qu'un module demande à l'orchestrateur
  id: string; discipline: Discipline; archetype: string;
  priority: 'key' | 'standard' | 'optional';
  targetMinutes: { min: number; ideal: number; max: number };
  expectedFootprint: FatigueFootprint;
  constraints: PlacementConstraint[];  // ex. { type: 'minGapAfter', tag: 'heavy_lower', hours: 36 }
  flexibility: number;                 // facilité à déplacer / raccourcir
}

interface LoadBudget {                 // budget hebdo fixé par l'arbitrage
  sessions: number; minutes: number;
  byDiscipline: Partial<Record<Discipline, { sessions: number; minutes: number }>>;
  runningKm: { target: number; max: number };      // partagé course + HYROX + cross (voir 3.4)
  hardSessionsMax: number;                         // séances à haute intensité / semaine
  muscleWeeklyLoad: Record<MuscleGroupId, { min: number; max: number }>;
}

interface DisciplineModule {
  id: Discipline;
  assess(snapshot, ctx): DisciplineAssessment;
  planPhases(goal, assessment, calendar, ctx): PhasePlan;              // contribution à la macro
  requestSessions(week: WeekContext, budget, ctx): SessionRequest[];   // demande hebdo
  designSession(slot: ScheduledSlot, sessionCtx, ctx): SessionDraft;   // construction concrète
  progress(history, ctx): ProgressionUpdate[];
  rules: Rule[];                                                        // règles propres (doc 09)
  archetypes: SessionArchetype[];                                       // catalogue de types de séances
}
```

### 3.3 Orchestrateur (coordination)

Responsabilités :

1. **Arbitrage** : répartit le budget selon la priorité des objectifs et la phase (ex. HYROX principal à 6 semaines de la course ⇒ muscu en maintien, 1 séance).
2. **Ordonnancement** : place les `SessionRequest` sur les créneaux disponibles.
   - Contraintes **dures** (jours disponibles, durée max du jour, max séances/jour, écart minimal entre séances clés incompatibles, repos minimal hebdo).
   - Contraintes **souples** pondérées (espacer les séances clés, éviter jambes lourdes la veille d'une séance de seuil, alterner systèmes, placer la sortie longue le jour le plus long).
   - Algorithme : recherche avec retour arrière (backtracking) sur un espace petit (≤ 7 jours × 2 créneaux × ~8 séances) + score ; déterministe ; si aucune solution satisfait les contraintes dures ⇒ dégradation contrôlée (retirer d'abord les séances `optional`, puis réduire les `standard`, jamais les `key` sans le signaler).
3. **Ledger de fatigue** : simule jour par jour la fatigue cumulée à partir des empreintes (modèle à décroissance exponentielle par structure) pour vérifier qu'aucune séance clé n'est placée sur une structure encore fatiguée.
4. **Transmission du contexte** au module lors de `designSession` : séances de la veille / lendemain, exposition récente des exercices, fatigue projetée ⇒ le module de musculation peut par exemple choisir un travail du haut du corps si la course de la veille était une séance de côtes.

### 3.4 Règles d'interférence inter-disciplines (exemples, paramétrables)

| Situation | Règle par défaut | Type |
|-----------|------------------|------|
| Jambes lourdes (squat/hinge > 80 % 1RM) et séance course clé (seuil / intervalles / longue) | ≥ 24 h entre les deux ; préférable : la course clé **avant** | Dure (24 h) + souple (ordre) |
| Deux séances à haute intensité le même jour | Interdit sauf profil avancé ET 2 séances/jour autorisées ET ≥ 6 h d'écart | Dure |
| Volume de course total | Km HYROX + km cross (runs dans les WODs) + km course **comptés ensemble** dans `runningKm` | Dure (max) |
| Progression du volume de course | Hausse hebdo bornée (paramètre, ~10 % indicatif) ET ratio charge aiguë/chronique sous un seuil | Dure |
| Muscle local | Pas deux séances à fatigue locale élevée sur le même groupe à < 48 h | Dure |
| Semaine de décharge | Synchronisée entre disciplines (sinon la décharge ne décharge rien) | Dure |
| Événement (course, HYROX) | Affûtage : réduction du volume global, maintien de l'intensité, suppression des séances à fort coût neuromusculaire J-5 → J | Dure |

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

**Cross-Training (`crosstraining`)**
- Formats : AMRAP, EMOM, For Time (+ time cap), intervalles, chipper, rounds, force + metcon.
- Dimensions : domaine de temps (court < 7 min, moyen 7–15, long > 15), modalités (gymnastique / haltérophilie / monostructural), stimulus visé, schéma de répétitions.
- Mise à l'échelle (scaling) par exercice via chaînes de progression/régression + niveau de skills déclaré.
- Benchmarks récurrents pour mesurer les progrès.

**HYROX (`hyrox`)**
- Modèle de course de référence : 8 × (1 km de course + 1 station) — SkiErg 1000 m, sled push 50 m, sled pull 50 m, burpee broad jumps 80 m, rameur 1000 m, farmers carry 200 m, sandbag lunges 100 m, wall balls 100 reps ; charges selon division/sexe (table dans le ruleset, à vérifier avec le règlement officiel en vigueur).
- Séances : course compromise (run + station alternés), endurance de stations, force spécifique (sled, lunges), simulation partielle/complète, travail d'allure de course.
- Délègue le pur travail de course au module `running` (allures communes) et compte son kilométrage dans le budget partagé.
- **Substitutions matériel** indispensables (pas de sled / SkiErg dans la plupart des salles) avec équivalences documentées.

### 3.6 Archétypes de séances

Chaque module possède un catalogue d'**archétypes** (gabarits paramétrables), ex. `run_threshold_cruise_intervals`, `strength_upper_hypertrophy`, `cf_short_couplet_for_time`, `hyrox_compromised_run_4x`. Un archétype définit : blocs, formats admissibles, empreinte de fatigue attendue, fourchette de durée, contraintes de placement, niveaux admissibles.
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

```ts
interface Rule<P = unknown> {
  id: string;                          // 'RUN.VOLUME.WEEKLY_INCREASE_MAX'
  version: number;
  scope: 'session' | 'week' | 'phase' | 'program' | 'cross_discipline';
  discipline?: Discipline;
  severity: 'hard' | 'soft' | 'safety';
  weight?: number;                     // pour les règles souples
  rationale: string;                   // pourquoi cette règle existe (lisible par un coach)
  params: (ruleset: Ruleset) => P;     // seuils lus dans le ruleset versionné
  evaluate(input: RuleInput, params: P): RuleOutcome; // pure
  repair?(input: RuleInput, params: P, violation: Violation): RepairAction[]; // optionnel
}

interface Violation { ruleId: string; severity: Rule['severity']; target: EntityRef; message: I18nKey; data: Record<string, number | string>; }
```

- Le **ruleset** (JSON versionné, validé par schéma) contient les seuils : volumes par niveau, fourchettes RPE, écarts de récupération, tolérance de durée, fenêtres anti-doublon, etc.
- Chaque règle a ses **tests unitaires** (cas nominal, bornes, cas limites) et une **fiche** (rationale) relue par le spécialiste concerné.
- Le même registre sert au **générateur** (score & contraintes pendant la construction) et au **validateur** (contrôle a posteriori) ⇒ une règle écrite une seule fois.

### 4.3 Résolution de conflits entre règles

Ordre de priorité fixe et documenté :
**Sécurité > Contraintes dures > Objectif principal > Cohérence de progression > Objectifs secondaires > Variété > Préférences de confort.**
Exemple : la variété ne peut jamais remplacer le squat ancre d'un cycle de force ; un objectif secondaire cède sa séance si le budget ne suffit pas, avec explication.
