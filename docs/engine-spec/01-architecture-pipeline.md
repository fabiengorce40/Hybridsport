# 01 — Architecture générale, pipeline et contrats

## 1. Architecture générale

Le moteur est une bibliothèque TypeScript **pure** (C10) : `entrées → résultat + trace`. Il ne lit ni n'écrit aucune base de données, n'effectue aucun appel réseau, ne lit pas l'horloge (le `now` est injecté), ne tire aucun hasard sans graine et ne dépend d'aucun LLM.

Il est composé de **sous-moteurs spécialisés** coordonnés par un planificateur global.

```
                         ┌──────────────────────── ENTRÉES ────────────────────────┐
                         │ UserTrainingProfile · Goals · Availability · Equipment   │
                         │ History (prévu vs réalisé) · Catalog · Ruleset · Context │
                         └───────────────────────────┬─────────────────────────────┘
                                                     ▼
┌────────────────────────────────────────── MOTEUR ─────────────────────────────────────────┐
│                                                                                            │
│  StateBuilder ──► AthleteState (état, expositions, capacités, confiance, signaux)          │
│        │                                                                                   │
│        ▼                                                                                   │
│  GlobalPlanner ──► Macro/Méso (phases) ──► Semaine (intentions + placement)                │
│        │                     ▲                         │                                   │
│        │                     │                ┌────────▼─────────┐                         │
│        │                     └────────────────│ InterferenceMgr  │ (déplacer/modifier/     │
│        │                                      └────────┬─────────┘  remplacer)             │
│        ▼                                               ▼                                   │
│  DisciplineEngines : Strength · Running · CrossTraining · Hyrox  (SessionIntent → Session) │
│        │   utilisent : Catalog · SessionPipeline commun · ProgressionEngine                │
│        ▼                                                                                   │
│  DurationEngine ──► DuplicateDetectionEngine ──► SessionValidator ◄──► RepairEngine        │
│        │                                                                                   │
│        ▼                                                                                   │
│  AdaptationEngine (événements → replanification minimale, réutilise tout ce qui précède)  │
│                                                                                            │
│  Transverse : RuleRegistry · ReasonCodes/Trace · SeededRng · Versioning                    │
└────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     ▼
                         SORTIES : Program / WeekPlan / Session · ValidationReport
                                   DecisionTrace (reason codes) · EngineError typée
```

**Pourquoi un planificateur global séparé des moteurs de discipline ?** Il décide *quoi* travailler et *quand* : l'équilibre entre disciplines, les priorités, la récupération et les interférences. Chaque moteur de discipline décide ensuite *comment* : exercices, dosage, formats. Un moteur de discipline ne peut donc jamais placer une séance lui-même. C'est ce qui empêche, par exemple, le moteur HYROX de programmer une séance très sollicitante pour les jambes le lendemain d'intervalles difficiles.

## 2. Pipeline complet

```
PROFIL UTILISATEUR ─┐
OBJECTIFS ──────────┤
CONTRAINTES ────────┤  (disponibilités, matériel, restrictions, préférences)
HISTORIQUE ─────────┘
        │
        ▼
[S1] NORMALISATION & CONTRÔLE DES ENTRÉES ── incohérences / manques → reason codes, stratégie explicite
        ▼
[S2] ÉTAT SPORTIF (StateBuilder → AthleteState) ── doc 04
        ▼
[S3] ARBITRAGE DES OBJECTIFS ── priorités, faisabilité globale (sinon NO_VALID_SOLUTION + alternatives)
        ▼
[S4] PROGRAMMATION DU CYCLE (GlobalPlanner.macro) ── phases, décharges, tests, affûtage
        ▼
[S5] PROGRAMMATION DE LA SEMAINE (GlobalPlanner.week)
        │   5a. demande hebdo de chaque moteur de discipline (SessionIntentRequest[])
        │   5b. sélection des intentions retenues (quotas, priorités)
        │   5c. placement sur le calendrier (solveur de contraintes, doc 05)
        │   5d. InterferenceManager : contrôle et résolution (déplacer / modifier / remplacer / retirer)
        ▼
[S6] CHOIX DU TYPE DE SÉANCE (SessionIntent figé : archétype, stimulus, priorité, durée cible)
        ▼
[S7] GÉNÉRATEUR SPÉCIFIQUE À LA DISCIPLINE (pipeline de séance commun, doc 07)
        │   Skeleton → Candidates → ConstraintFiltering → Selection → Parameterization
        ▼
[S8] CALCUL DE DURÉE + ajustement (DurationEngine)
        ▼
[S9] ANTI-DOUBLON (DuplicateDetectionEngine : répétition prévue vs accidentelle)
        ▼
[S10] CONTRÔLE CHARGE / RÉCUPÉRATION (contraintes de la doc 04 sur la semaine projetée)
        ▼
[S11] VALIDATION (SessionValidator, puis WeekValidator) ──► INVALID ─► RepairEngine (≤ N tentatives) ─┐
        │                                                    ▲                                         │
        │                                                    └──────────── revalidation ◄──────────────┘
        ▼ VALID / VALID_WITH_WARNINGS                               épuisement ⇒ NO_VALID_SOLUTION
[S12] SESSION FINALE + trace + versions
```

> Différence avec l'ordre indicatif du cahier des charges : l'anti-doublon et le contrôle de charge/récupération sont aussi **intégrés à la sélection** (S7), sous forme de pénalités et de filtres. Les étapes S9–S10 sont des contrôles *a posteriori*. Ainsi on ne génère pas d'abord une séance pour la jeter ensuite, et le coût de réparation reste faible.

## 3. Trois niveaux d'application des règles (enforcement)

| Niveau | Sémantique | Effet | Exemples |
|--------|-----------|-------|----------|
| **HARD** | Une violation rend la sortie invalide | `INVALID` : réparation, sinon régénération, sinon `NO_VALID_SOLUTION` | Matériel absent, durée impossible dans le temps disponible, restriction utilisateur, récupération minimale non respectée, structure invalide, exercice inexistant, paramètre impossible (0 rep, NaN), volume au-delà d'une limite de sécurité définie |
| **SOFT** | Préférence qui peut être violée exceptionnellement | Pénalité pondérée, et un avertissement si elle dépasse un seuil | Variété, préférence utilisateur, espacement idéal, exercice préféré, diversité des formats |
| **OPTIMIZATION TARGET** | Objectif pour départager des solutions valides | Contribue au score de la solution | Spécificité à l'objectif, progression, qualité de récupération, plaisir, simplicité logistique, adéquation à la durée cible |

**Nature d'une règle** (section 38 du cahier des charges) : une dimension **orthogonale** au niveau d'application.

| Nature | Définition | Niveau d'application typique |
|--------|-----------|------------------------------|
| `SAFETY` | Protège l'intégrité de l'utilisateur | Toujours HARD |
| `FEASIBILITY` | La séance doit pouvoir être réalisée (matériel, temps, existence) | Toujours HARD |
| `PROGRAMMING_HEURISTIC` | Bonne pratique d'entraînement, avec un niveau de preuve variable | HARD si c'est un plancher conservateur (ex. récupération minimale), sinon SOFT ou TARGET |
| `PREFERENCE` | Choix de l'utilisateur ou du produit | SOFT ou TARGET, **sauf** une exclusion explicite de l'utilisateur (« jamais de burpees »), qui devient HARD |
| `TECHNICAL` | Intégrité des données (schéma, références, sérialisation) | Toujours HARD |

Pourquoi deux axes : une règle comme « 48 h entre deux séances très sollicitantes pour le même groupe musculaire » est une *heuristique de programmation* (sa nature) qu'on applique comme un *plancher HARD* (son niveau). Mélanger les deux axes empêcherait de dire honnêtement quelles règles sont démontrées et lesquelles sont des choix prudents.

## 4. Score d'une solution

```ts
interface SolutionScore {
  feasible: boolean;                        // aucune violation HARD
  tiers: number[];                          // un score par niveau de priorité (§5), du plus prioritaire au moins prioritaire
  softPenalties: { ruleId: string; penalty: number }[];
  targets: { targetId: string; value: number }[];
}
```

La comparaison entre deux solutions faisables est **lexicographique avec tolérance**. On compare le niveau 1 ; si l'écart reste sous `ε(niveau)`, on passe au niveau 2, et ainsi de suite.
Pourquoi ne pas utiliser une somme pondérée unique : une somme permet à beaucoup de « variété » de compenser un peu de « spécificité », ce qui est contraire à la hiérarchie voulue. À l'inverse, un ordre lexicographique strict rendrait les niveaux inférieurs inutiles. La tolérance ε évite ces deux travers. Les valeurs ε sont des paramètres du ruleset.

## 5. Hiérarchie des priorités (analyse de la proposition)

Proposition initiale : 1 sécurité · 2 hard constraints · 3 cohérence · 4 objectif principal · 5 récupération · 6 progression · 7 durée · 8 préférences · 9 variété.

**Problèmes identifiés :**
1. La « durée » en position 7 mélange deux choses. Tenir dans le **temps réellement disponible** est une contrainte dure (C8), donc de niveau 2. En revanche, **coller à la durée cible** est une optimisation de faible niveau.
2. La « récupération » en position 5 mélange elle aussi deux choses. Le **plancher de récupération** (ne jamais enchaîner deux sollicitations lourdes de la même structure) ne doit jamais être sacrifié à l'objectif principal. La **récupération optimale** (48 h plutôt que 36 h) peut, elle, céder face à la spécificité.
3. Il manque la **stabilité du plan** : un plan qui change à chaque petit événement perd la confiance de l'utilisateur (C11, replanification minimale).
4. Il manque les **objectifs secondaires**, à distinguer de l'objectif principal.
5. Le **plaisir et l'adhérence** sont rangés dans les « préférences » (niveau 8). Or une séance que l'utilisateur n'aime pas n'est pas faite. Ce point est à débattre (voir la décision à valider n° 7).

**Hiérarchie proposée :**

| Niveau | Contenu | Nature |
|------|---------|--------|
| 1 | **Sécurité** : restrictions, signalements de douleur, règles SAFETY | HARD |
| 2 | **Faisabilité** : matériel, temps disponible, jours, existence, structure, paramètres possibles, exclusions explicites de l'utilisateur | HARD |
| 3 | **Plancher de récupération** : écarts minimaux entre sollicitations lourdes d'une même structure | HARD |
| 4 | **Cohérence du programme** : logique de phase, décharges, tests, progression non contradictoire | HARD (invariants), sinon TARGET |
| 5 | **Objectif principal** : spécificité | TARGET |
| 6 | **Progression** : continuité des exercices ancres, surcharge progressive adaptée | TARGET |
| 7 | **Objectifs secondaires** | TARGET |
| 8 | **Stabilité du plan** : changements minimaux | TARGET |
| 9 | **Récupération optimale et répartition** dans la semaine | SOFT et TARGET |
| 10 | **Adéquation à la durée cible**, dans la tolérance | TARGET |
| 11 | **Préférences et plaisir** | SOFT et TARGET |
| 12 | **Variété** | SOFT |

## 6. Déterminisme

- Toutes les fonctions sont pures. `now`, `seed`, `ruleset` et `catalog` sont passés explicitement dans un `EngineContext`.
- Le hasard est confiné à un **générateur pseudo-aléatoire à graine** (`SeededRng`, algorithme simple et portable comme `xoshiro128**`). Il ne sert qu'à **départager des candidats à égalité de score**. La graine est dérivée de `hash(userId, programId, weekIndex, slotId, seedSalt)` et stockée.
- Les ordres d'itération sont stables : tri explicite par identifiant, jamais d'ordre de parcours implicite d'un objet.
- Le calcul flottant est arrondi aux frontières (charges, allures, durées) avec des fonctions d'arrondi uniques et testées.
- Des tests vérifient qu'avec la même entrée et la même graine, la sortie est identique octet pour octet, après sérialisation JSON canonique.

## 7. Échec explicite

```ts
type EngineError = {
  code: 'NO_VALID_SOLUTION' | 'INSUFFICIENT_AVAILABILITY' | 'CONFLICTING_GOALS' | 'EQUIPMENT_INSUFFICIENT'
      | 'SAFETY_BLOCK' | 'INVALID_INPUT' | 'REPAIR_EXHAUSTED' | 'UNSUPPORTED_VERSION';
  reasons: ReasonCode[];          // ce qui bloque
  alternatives: Alternative[];    // ce qui serait possible
  trace: DecisionTrace;
};
interface Alternative { code: string; description: ReasonCode; patch: InputPatch; } // ex. { availableMinutes: 45 } ou { discipline: 'crosstraining' }
```

Exemple du cahier des charges : « HYROX complet, 20 minutes, aucun matériel ».
- Raisons : `DURATION.TARGET_BELOW_ARCHETYPE_MIN(hybrid_race_full_sim, min=75)`, `EQUIPMENT.MISSING_CRITICAL(skierg, rower, sled, wall_ball)`.
- Alternatives : « HYROX conditioning au poids du corps, 20 min (burpee broad jumps, fentes, course) », « Course compromise 20 min », « Simulation complète si 90 min et salle équipée ».
- Jamais de pseudo-séance.

## 8. Performance et complexité

| Composant | Espace de recherche | Stratégie | Complexité |
|-----------|--------------------|-----------|-----------|
| Placement hebdo (GlobalPlanner) | n séances (≤ 10) sur S créneaux (≤ 14) : S^n naïf (14^8 ≈ 1,5·10⁹) | Heuristique MRV (séances les plus contraintes d'abord : `key`, puis celles qui ont le moins de créneaux valides), *forward checking* sur les HARD, *branch & bound* sur le score, **budget de nœuds** (ex. 20 000) | En pratique quelques centaines à quelques milliers de nœuds ; borne dure par le budget |
| Repli du placement | Si le budget de nœuds est épuisé | Glouton déterministe, puis recherche locale (échanges de paires, déplacements) avec un nombre d'itérations borné | O(k · n²) |
| Matrice d'interférence | Paires de séances | Pré-calcul | O(n²) avec n ≤ 10 |
| Sélection d'exercices | Candidats filtrés par emplacement (≤ ~40) | Filtrage puis score puis top-k, **sans combinatoire globale** : sélection gloutonne emplacement par emplacement, avec contexte cumulatif, puis une passe d'amélioration locale | O(emplacements × candidats) |
| Similarité (anti-doublon) | Séance comparée à l'historique fenêtré (≤ ~30 séances) | Empreintes pré-calculées, similarité en O(taille de l'empreinte) | O(h · f) |
| Durée | Composants d'une séance | Somme et propagation d'incertitude | O(éléments) |
| Réparation | Violations × actions | Actions ciblées, **≤ N tentatives** (ex. 3 par séance, 2 par semaine) | Bornée |
| AthleteState | Historique fenêtré (≤ 52 semaines) | Agrégats incrémentaux (mis en cache hors moteur, recalculables) | O(logs de la fenêtre) |

Cibles : générer une semaine en moins de 300 ms sur un mobile de milieu de gamme (micro-adaptations), un cycle de 16 semaines en moins de 2 s côté serveur, une simulation de 52 semaines en moins de 30 s en CI. Des benchmarks en CI vérifient ces cibles.

## 9. Structure du package (proposition améliorée)

```
packages/engine/src/
├─ core/            EngineContext, Result/EngineError, SeededRng, arrondis, sérialisation canonique
├─ trace/           DecisionTrace, ReasonCode, registre des codes
├─ rules/           RuleRegistry, RuleMetadata, gouvernance, chargement et validation du ruleset
├─ catalog/         requêtes sur le catalogue, index (pattern, équipement), features de similarité
│                   (les DONNÉES du catalogue vivent dans packages/catalog)
├─ state/           StateBuilder → AthleteState (expositions, capacités, confiance, signaux)
├─ constraints/     contraintes HARD/SOFT partagées (disponibilité, matériel, récupération, sécurité)
├─ planning/        GlobalPlanner : macro (phases), semaine (demande, sélection, placement), solveur
├─ interference/    InterferenceManager : profils de demande, matrice, résolution
├─ session/         pipeline de séance commun : skeleton, candidats, sélection, paramétrage
├─ disciplines/
│  ├─ strength/     StrengthEngine (archétypes, tables de dosage, progression spécifique)
│  ├─ running/      RunningEngine (références, allures, zones, séances, contributions hybrides)
│  ├─ crosstraining/ CrossTrainingEngine (stimulus → format → mouvements → schéma)
│  └─ hybrid-race/  HyroxEngine (familles, stations, substitutions, rampe de spécificité)
├─ duration/        DurationEngine (estimation, tolérance, ajustement)
├─ similarity/      DuplicateDetectionEngine (empreintes, similarités, intention de répétition)
├─ progression/     ProgressionEngine (modèles, décisions, capacités)
├─ adaptation/      AdaptationEngine (événements, analyse d'impact, replanification minimale)
├─ validation/      SessionValidator, WeekValidator, ProgramValidator
├─ repair/          RepairEngine
└─ api/             façade publique (seul point d'import autorisé depuis l'extérieur)

packages/engine/tests/
├─ unit/  integration/  scenarios/  property/  golden/  longitudinal/  mutation/  metamorphic/  perf/
└─ fixtures/        profils, catalogues de test, rulesets figés
```

Les frontières entre modules sont vérifiées par l'outillage. Les moteurs de discipline ne s'importent pas entre eux : le partage passe par `session/`, `catalog/` et `progression/`. Seul `running/` expose `runningContribution()`, consommé par `planning/` et `state/`.

## 10. Contrats publics

```ts
interface EngineContext {
  now: ISODateTime; timezone: string;
  seed: string;
  ruleset: Ruleset;               // versionné
  catalog: Catalog;               // versionné
  engineVersion: string;          // injecté au build
}

// Toutes les fonctions renvoient un EngineResult : jamais d'exception pour un cas métier.
type EngineResult<T> =
  | { status: 'ok'; value: T; validation: ValidationReport; trace: DecisionTrace }
  | { status: 'error'; error: EngineError };

// ÉTAT
buildAthleteState(input: EngineInput, ctx): EngineResult<AthleteState>;

// PLANIFICATION
generateProgram(input: EngineInput, ctx): EngineResult<Program>;                       // macro + semaines initiales
planWeek(state: AthleteState, program: Program, weekIndex: number, ctx): EngineResult<WeekPlan>;
generateSession(intent: SessionIntent, weekCtx: WeekContext, state: AthleteState, ctx): EngineResult<Session>;

// CONTRÔLES (purs, sans effet de bord, utilisables partout, y compris sur des éditions manuelles)
validateSession(session: Session, vctx: ValidationContext, ctx): ValidationReport;
validateWeek(week: WeekPlan, vctx: ValidationContext, ctx): ValidationReport;
estimateDuration(session: Session, timing: AthleteTimingProfile, ctx): DurationEstimate;
calculateSimilarity(a: SessionFingerprint, b: SessionFingerprint, ctx): SimilarityBreakdown;

// ADAPTATION
adaptSession(session: Session, change: SessionConstraintChange, state, ctx): EngineResult<Session>;   // temps, matériel, douleur (L0)
replan(event: AdaptationEvent, program: Program, state: AthleteState, ctx): EngineResult<ReplanProposal[]>;
replanAfterMissedSession(sessionId: ID, program, state, ctx): EngineResult<ReplanProposal[]>;          // cas particulier de replan

// RÉSULTATS
processWorkoutResult(result: WorkoutResult, program, state, ctx): EngineResult<WorkoutProcessing>;
// → { stateDelta, progressionUpdates, capacityUpdates, triggeredEvents: AdaptationEvent[] }

// OUTILLAGE
explain(trace: DecisionTrace, locale: string): ExplanationItem[];   // reason codes → texte (templates, sans LLM)
exportRules(ruleset: Ruleset): RuleCatalogDocument;                  // audit
```

Améliorations par rapport aux signatures suggérées :
- `generateWeek(state)` devient `planWeek(state, program, weekIndex)` : une semaine n'existe jamais hors d'un programme.
- `generateSession(intent, state)` reçoit un `WeekContext` (séances voisines, expositions projetées) : une séance n'est jamais générée isolément.
- `processWorkoutResult` **ne modifie pas le plan** ; il renvoie des événements, que `replan` traite. Cela sépare l'apprentissage de la replanification.
- `replan` renvoie **plusieurs propositions classées**, pas une décision unique : l'application peut en montrer une ou demander un choix à l'utilisateur.
