# 05 — GlobalPlanner et InterferenceManager

## 1. GlobalPlanner

Rôle : décider **quoi** entraîner et **quand**. Il ne choisit pas les exercices. Il organise les disciplines, les objectifs, les priorités, les types de séances, les intensités, la récupération, les interférences et la progression d'ensemble.
Il n'utilise **aucun template de semaine figé** : la semaine résulte d'une allocation, puis d'un placement sous contraintes.

### 1.1 INPUTS

- `UserTrainingProfile`, `Goal[]`, `Availability`, `EquipmentProfile` (pour la faisabilité des archétypes)
- `AthleteState` (doc 04)
- `Program` existant (pour prolonger le plan ou le replanifier), séances déjà réalisées ou verrouillées
- `Ruleset` : paramètres de périodisation, fréquences, matrices L1/L2, tables d'interférence
- Les moteurs de discipline, interrogés via `requestWeek()`

### 1.2 DECISION PROCESS

**A. Macro / méso (S4)**

1. **Horizon.**
   - Objectif daté ⇒ macrocycle jusqu'à l'échéance. Si l'échéance dépasse un horizon maximal (paramètre, ex. 24 semaines), on ajoute d'abord des blocs généraux.
   - Sans échéance ⇒ mésocycles glissants (4 à 6 semaines selon le niveau, paramètre) enchaînés, avec des tests périodiques.
2. **Phases.** (Proportions et minimums : paramètres du ruleset, décision 36.) Séquence choisie par règles selon le temps restant, le niveau et le type d'objectif, par exemple :
   `general → development → specific → taper` pour un événement ; `accumulation → intensification → deload/test` pour un objectif de force. Les durées de phase sont calculées par proportions avec des minimums et des maximums (ruleset). Si le temps est insuffisant pour la séquence complète, on compresse les phases dans un ordre défini (on raccourcit la phase générale en premier) et on émet `PLAN.MACRO.COMPRESSED`.
3. **Décharges (V1.1).** Rythme paramétrable (tous les k semaines, k selon le niveau et la discipline, `provisional`), décalées si elles tombent en affûtage ou sur une semaine de test. La synchronisation totale entre disciplines **n'est pas imposée**. Le GlobalPlanner choisit un **mode** selon le contexte :

   | Mode | Principe | Contexte typique |
   |------|----------|------------------|
   | `global` | Toutes les disciplines allégées la même semaine | Fatigue globale (lecture de l'état `caution` / `reduce`), semaine de test, fin de bloc commune |
   | `partial` | Une ou plusieurs disciplines allégées, les autres inchangées | Fatigue localisée (ex. structures du bas du corps), cycles de disciplines décalés |
   | `discipline_reduction` | Une discipline réduite pendant qu'une autre reste en maintenance ou en développement | Phase spécifique d'une discipline prioritaire, discipline secondaire en surcharge |

   Critères de choix (paramètres G2) : rythme propre de chaque discipline, demande cumulée par structure sur le bloc, lecture de l'état, proximité d'un événement, régularité. Le mode retenu et ses raisons sont tracés (`PLAN.MACRO.DELOAD{week, mode, disciplines, reasons}`). Invariant conservé : une semaine allégée doit **réellement** réduire la demande sur les structures visées (vérifié par le WeekValidator).
4. **Tests.** En fin de phase, dans une semaine allégée : protocoles du catalogue. Jamais de test maximal pour les profils non éligibles.
5. **Rôle de chaque discipline par phase** : `development` / `maintenance` / `support` / `off`, déterminé par la priorité des objectifs et la phase. Par exemple, pour un HYROX de priorité 1 en phase spécifique : `hybrid_race = development`, `running = development (partagé)`, `strength = maintenance`.

**B. Semaine (S5)**

5a. **Allocation des séances par discipline (quotas).**
   - N = min(séances souhaitées, maximum de l'utilisateur, créneaux faisables).
   - Si l'utilisateur a indiqué une répartition (« courir 3×, muscu 2× »), elle sert de **cible forte**. Si elle est infaisable, on ne la modifie pas en silence : on émet `PLAN.QUOTA.USER_REQUEST_INFEASIBLE` et on propose des alternatives.
   - Sinon : minimum efficace par discipline selon son rôle (table ruleset, ex. `maintenance strength` ≥ 1), puis répartition du reste selon le poids de la priorité × le rôle de la phase, par la méthode du plus fort reste. Les égalités sont départagées par priorité puis par identifiant, de façon déterministe.

5b. **Demande hebdomadaire.** Chaque moteur de discipline reçoit son quota et le contexte (phase, expositions, progression) et renvoie des `SessionIntentRequest` classées :
```ts
interface SessionIntentRequest {
  id: string; discipline: Discipline;
  priority: 'key' | 'standard' | 'optional';
  variants: SessionVariant[];         // du plus spécifique au plus « compatible », ex. [lower_heavy, full_moderate, upper_focus]
  placement: PlacementPreference[];   // ex. 'longest_day', 'fresh_for_quality', 'not_before:test'
  mustPrecede?: string[]; mustFollow?: string[];   // ordre intra-semaine (ex. seuil avant sortie longue)
}
interface SessionVariant { archetypeId: string; demand: DemandProfile; minutes: { min: number; target: number; max: number }; specificityScore: number; }
```
   Les **variantes** sont le mécanisme qui permet au planificateur (et à l'InterferenceManager) de *remplacer* une séance sans rappeler le moteur de discipline.

5c. **Placement (solveur de contraintes).**
   - Variables : une par demande. Domaine : `(jour, créneau, variante)` où le temps disponible ≥ `minutes.min` de la variante.
   - **HARD** : disponibilité, dates impossibles, contraintes récurrentes, maximum de séances par jour et doubles séances, L1 (récupération minimale, **y compris avec les 3 derniers jours de la semaine précédente, réalisés ou prévus**), L2, ordres `mustPrecede`, exclusions.
   - **SOFT** : espacement idéal des séances clés, préférences de jour, répartition des jours de repos, ordre favorable (séance de qualité sur une structure fraîche).
   - **TARGET** : somme des `specificityScore` des variantes choisies, stabilité par rapport à la semaine précédente (même ossature si rien n'a changé), adéquation durée / jour.
   - Algorithme : doc 01 §8 (MRV, forward checking, branch & bound, budget de nœuds, puis repli glouton et recherche locale).

5d. **InterferenceManager** (§2) sur la solution. S'il reste des conflits, il résout ou renvoie des *nogoods* au solveur (au plus 2 allers-retours).

5e. **Figer les intentions** (S6) : `SessionIntent` complet (archétype, stimulus, priorité, durée cible, notes du planificateur comme `avoid_high_lower_body`).

### 1.3 OUTPUTS

```ts
interface WeekPlan {
  weekIndex: number; phase: PhaseRef; isDeload: boolean; isTestWeek: boolean;
  intents: ScheduledIntent[];          // { date, slot, intent }
  targets: WeekTargets;                // cibles de la semaine : séries par groupe (L5), exposition de course, répartition d'intensité
  droppedRequests: { requestId: string; reason: ReasonCode }[];
  trace: DecisionTrace;
}
```

### 1.4 VALIDATION

`WeekValidator` (doc 09) : toutes les contraintes HARD ; quotas atteints ou abandons expliqués ; séances clés de l'objectif principal placées ; L1 à L5 évalués sur la semaine projetée **et** sur la jonction avec les semaines précédente et suivante ; cohérence avec la phase (pas d'intervalles de VO2max en semaine de décharge si la règle l'interdit).

### 1.5 FAILURE MODES

| Cas | Comportement |
|-----|--------------|
| Aucun placement ne satisfait les HARD | Dégradation contrôlée et tracée : (1) retirer les `optional`, (2) choisir des variantes moins exigeantes, (3) réduire le quota de la discipline de priorité la plus basse, (4) seulement ensuite toucher un `standard` de l'objectif principal |
| Séances clés de l'objectif principal impossibles à placer | `INSUFFICIENT_AVAILABILITY` ou `CONFLICTING_GOALS` + alternatives (ajouter un jour, allonger un créneau, abaisser la priorité d'un objectif) |
| Budget de nœuds épuisé | Repli glouton et recherche locale ; si la solution est faisable, `PLAN.SOLVER.FALLBACK_USED` (métrique d'observabilité) |
| Oscillation d'une semaine à l'autre | Cible de stabilité ; test longitudinal dédié (doc 11) |
| Horizon trop court pour l'objectif | `PLAN.MACRO.COMPRESSED`, et si c'est irréaliste, `GOAL.DEADLINE_TOO_CLOSE` + alternatives |

## 2. InterferenceManager

Rôle : garantir que les séances des quatre disciplines **cohabitent**. Il analyse les groupes musculaires, les patterns, l'intensité, le volume, le stress cardiovasculaire, les impacts, la fatigue locale et globale et la proximité des séances, puis **déplace, modifie ou remplace** une séance si nécessaire.

### 2.1 INPUTS

- Une séquence chronologique de séances (planifiées pour la semaine + réalisées sur les 3 à 7 jours précédents), chacune avec son `DemandProfile`, sa priorité et ses variantes
- `AthleteState.freshness`, le niveau de l'athlète
- Les règles : matrice L1, L2, table d'interférence (§2.3)

### 2.2 DECISION PROCESS

1. **Détection** : pour chaque paire ordonnée (A avant B) avec Δt ≤ 72 h, et chaque structure, évaluer les règles. Complexité O(n² × structures), avec n ≤ ~12.
2. **Classement des conflits** : `HARD` (L1, L2, I-règles dures), `SPECIFICITY_HARM` (une séance clé placée sur une structure déjà sollicitée : elle reste faisable mais perd de sa valeur), `SOFT`.
3. **Résolution** par actions de coût croissant, **en touchant d'abord la séance de moindre priorité** :

| Ordre | Action | Exemple |
|-------|--------|---------|
| 1 | **Échanger ou déplacer** (contenu inchangé) | Seuil du mardi ↔ séance de haut du corps du mercredi |
| 2 | **Changer de variante** (même discipline, autre accent) | `strength_lower_heavy` → `strength_upper_focus` |
| 3 | **Abaisser la demande** (volume ou intensité de la séance la moins prioritaire) | Fentes HYROX `high` → `moderate` : moins de charge, plus de course |
| 4 | **Remplacer l'archétype** | `hr_station_strength` → `hr_aerobic_ergs` |
| 5 | **Retirer** une séance `optional` | — |
| 6 | Retirer une séance `standard` | Reason code obligatoire, visible dans la semaine |

   Chaque action doit **réduire strictement** le coût de conflit total (sinon elle est rejetée). Cela garantit la terminaison : le nombre d'actions est fini et le coût décroît de façon monotone.
   **Interdit** : dégrader une séance `key` de l'objectif principal tant qu'une autre action est possible.

### 2.3 Table d'interférence initiale (règles `provisional`, à relire)

| Id | Règle | Niveau | Nature |
|----|-------|--------|--------|
| I1 | Séance de course de qualité (seuil, intervalles, sortie longue) : pas dans les 24 h suivant une demande `lower_muscular = high` | HARD | heuristique (plancher) |
| I2 | Même situation, entre 24 et 48 h | SOFT | heuristique |
| I3 | Double séance le même jour : la séance de la discipline de plus haute priorité en premier ; écart ≥ `minHoursBetweenDoubleSessions` | SOFT (ordre), HARD (écart déclaré) | heuristique / préférence |
| I4 | `grip = high` (tirage de sled, farmers lourds) et soulevé de terre lourd ou tractions lourdes à moins de 24 h | SOFT | heuristique |
| I5 | Veille d'une séance `key` de type test, simulation ou sortie longue : aucune demande `high` sur une structure utilisée par cette séance | HARD | heuristique |
| I6 | Deux jours consécutifs avec `high_intensity_systemic = high` : interdit pour novice et débutant (L2), SOFT sinon | HARD / SOFT | consensus |
| I7 | Affûtage : pas de demande `high` sur `lower_muscular` / `axial_posterior` dans les J-x avant l'événement (x à définir) | HARD | consensus |
| I8 | Activité externe déclarée (club, sport collectif) : son profil de demande est traité comme une séance verrouillée | HARD | faisabilité |

### 2.4 OUTPUTS

```ts
interface InterferenceReport {
  conflicts: { a: ID; b: ID; structure: Structure; ruleId: string; level: 'hard' | 'harm' | 'soft' }[];
  actions: { type: 'move' | 'swap' | 'variant' | 'reduce' | 'replace' | 'drop'; target: ID; reason: ReasonCode }[];
  residual: Conflict[];                // conflits SOFT acceptés, avec leur justification
  nogoods?: Nogood[];                  // renvoyés au solveur si aucune résolution locale n'est possible
}
```

### 2.5 VALIDATION

Revalidation complète de la semaine après les actions. Invariant testé : aucune action ne crée de nouveau conflit HARD ailleurs.

### 2.6 FAILURE MODES

| Cas | Comportement |
|-----|--------------|
| Conflit HARD irrésolu localement | `nogoods` → nouvelle recherche du solveur (≤ 2 allers-retours) → sinon dégradation (§1.5) |
| Activités externes saturant la semaine | Signalement `PLAN.EXTERNAL_LOAD_HIGH`, réduction des quotas |
| Données de demande manquantes (séance libre importée sans détail) | Profil de demande estimé **prudent** (un cran au-dessus), marqué `estimated` |
