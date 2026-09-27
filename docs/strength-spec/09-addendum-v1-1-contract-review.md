# STRENGTH SPECIFICATION V1.1 — CONTRACT & OPEN DECISIONS REVIEW

> Addendum à la [Strength Spec V1](README.md). **En cas de divergence, cet addendum prévaut.**
> Aucun code n'est écrit et le CORE n'est pas modifié : les contrats ci-dessous sont **proposés** pour validation.
> Passages de la V1 remplacés : 04 §10.2 (« calibration à RIR 2–3 »), 04 §11 (montée en charge en pourcentage de la charge de travail comme unique modèle), 03 §8.2 (responsabilités des ancres), 03 §17.2 et 07 D-S4 (politique F4), 07 D-S2.

## 1. Contrats exacts proposés

Notation : schémas zod (paquet `@hybridsport/domain`), stricts (champ inconnu refusé). Tous les ajouts sont **facultatifs**, sauf mention contraire.

### 1.1 CORE-EXT-1 — Exercice → prescription → séries

La hiérarchie existante est conservée : `Item` (exercice) → `Prescription` (union discriminée par `type`) → `SetPrescription[]` (pour `type: 'sets'` seulement). Les prescriptions en durée (`timed`, `hold`, `mobility`, `distance`…) restent des variantes distinctes, sans répétitions : **aucune n'est modifiée**.

```ts
/** Cible de répétitions : exacte (forme historique) ou plage. */
const zRepTarget = z.union([
  z.number().int().positive(),                                   // forme existante : reps: 5
  z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).strict()
    .refine((r) => r.min <= r.max, 'min ≤ max'),
]);

/** Effort cible : RIR OU RPE, jamais les deux (même échelle, deux conventions). */
const zEffort = z.union([
  z.object({ rir: z.number().min(0) }).strict(),
  z.object({ rpe: z.number().min(0) }).strict(),
]);

/** Intensité d'une série : union discriminée, qui empêche les combinaisons incohérentes. */
const zSetIntensity = z.discriminatedUnion('mode', [
  // Charge absolue connue, ou suggérée (l'utilisateur ajuste) ; effort de contrôle facultatif.
  z.object({ mode: z.literal('load'), kg: z.number().positive(), certainty: z.enum(['prescribed', 'suggested']), effort: zEffort.optional() }).strict(),
  // Pourcentage d'une référence, seulement quand il est réellement utilisable ; charge arrondie jointe.
  z.object({ mode: z.literal('percent_of_reference'), fraction: z.number().positive(), reference: z.literal('e1rm'), kgRounded: z.number().positive(), effort: zEffort.optional() }).strict(),
  // Autorégulé : l'effort commande ; fourchette de charge indicative facultative.
  z.object({ mode: z.literal('effort'), effort: zEffort, indicativeKg: z.object({ min: z.number().positive(), max: z.number().positive() }).strict().optional() }).strict(),
  // Montée en charge relative à la série de travail (fraction de sa charge, connue ou estimée) : réservé à kind = 'rampup'.
  z.object({ mode: z.literal('relative_to_working'), fraction: z.number().positive().max(1) }).strict(),
  // Poids du corps, éventuellement lesté.
  z.object({ mode: z.literal('bodyweight'), addedKg: z.number().nonnegative().optional(), effort: zEffort.optional() }).strict(),
]);

/** Tempo : quatre phases en secondes (excentrique, pause basse, concentrique, pause haute) ; null = libre. */
const zTempo = z.tuple([z.number().nonnegative().nullable(), z.number().nonnegative().nullable(), z.number().nonnegative().nullable(), z.number().nonnegative().nullable()]);

export const zSetPrescription = z.object({
  kind: z.enum(['rampup', 'working', 'backoff', 'amrap', 'top_set']),   // existant (ramp_up ⇔ rampup)
  reps: zRepTarget,                                                   // élargi : number | {min, max}
  restAfterS: z.number().nonnegative(),                               // existant
  rir: z.number().nonnegative().optional(),                           // existant (forme historique)
  intensity: zSetIntensity.optional(),                                // NOUVEAU
  tempo: zTempo.optional(),                                           // NOUVEAU
  optional: z.boolean().optional(),                                   // NOUVEAU : série facultative
}).strict().superRefine((s, ctx) => {
  if (s.rir !== undefined && s.intensity !== undefined) ctx.addIssue({ code: 'custom', message: 'rir historique et intensity exclusifs' });
  if (s.intensity?.mode === 'relative_to_working' && s.kind !== 'rampup') ctx.addIssue({ code: 'custom', message: 'relative_to_working réservé aux montées en charge' });
  if (s.optional === true && (s.kind === 'rampup' || s.kind === 'top_set')) ctx.addIssue({ code: 'custom', message: 'une montée ou une série lourde n’est pas facultative' });
});
```

Références portées par l'exercice (`Item`) :

```ts
const zItemRefs = z.object({
  slotId: zId.optional(),                                  // emplacement d'archétype servi
  progressionTrackId: zId.optional(),                      // track suivie (ancre ou non, §5)
  anchor: z.enum(['declared', 'candidate']).optional(),    // declared ⇒ progression_anchor déclaré ; candidate ⇒ proposition d'ancre
  prescriptionSource: z.enum(['track', 'base_profile', 'calibration', 'substitution', 'history']).optional(),
  substitutedFrom: zId.optional(),                         // exercice prévu, en cas de substitution ponctuelle
}).strict()
  .refine((r) => r.anchor !== 'declared' || r.progressionTrackId !== undefined, 'une ancre déclarée porte son trackId');

export const zItem = z.object({
  id: zId, exerciseId: zId, prescription: zPrescription,   // existant
  refs: zItemRefs.optional(),                              // NOUVEAU
  alternatives: z.array(zId).max(3).optional(),            // NOUVEAU : alternatives prévalidées
}).strict();
```

Ce que cela empêche par construction :
- une série à la fois en charge absolue et en effort pur ;
- une montée en charge relative sur une série de travail ;
- un RIR et un RPE sur la même série ;
- une ancre déclarée sans `trackId` ;
- des répétitions sur une prescription en durée.

**Contrôle CORE ajouté à l'acceptation** : tout item portant `anchor: 'declared'` doit correspondre à une intention `progression_anchor { trackId }` de l'intention de séance, sinon `DUPLICATE.INTENT_NOT_DECLARED`. `candidate` n'exempte de rien.

### 1.2 CORE-EXT-2 — Contexte de discipline typé

Le CORE reste ignorant de la sémantique : il **transmet** un contexte que le moteur **valide lui-même**, par un contrat générique.

```ts
export interface SportEngine<TContext> {
  readonly id: string;
  readonly version: SemVerString;
  readonly discipline: Discipline;
  /** Validation du contexte propre à la discipline (schéma strict du moteur). Pure. */
  parseContext(raw: unknown): { ok: true; context: TContext } | { ok: false; reasons: readonly ReasonCode[] };
  propose(input: SportEngineInput<TContext>): ProposeResult;           // CORE-EXT-3
}

export interface SportEngineInput<TContext> {
  /* champs existants inchangés : intent, profile, state, constraints, catalog, ruleset, history, context */
  readonly discipline: TContext;                                       // NOUVEAU : contexte validé
}

export interface SportSessionRequest {
  /* champs existants inchangés : intent, profile, state, history */
  readonly disciplineContext: unknown;                                 // NOUVEAU : brut, validé par engine.parseContext
}
```

Flux dans `runSportSession` : intention → garde → `engine.parseContext(request.disciplineContext)`. En cas d'échec : `INVALID_INPUT` avec les raisons, et `propose` n'est **pas** appelé. Sinon : `propose({ …, discipline: context })`.

**`StrengthContext` minimal**, défini dans le paquet du moteur et non dans le CORE. Sont exclus tous les champs déjà présents dans `SportEngineInput` : niveau (`profile.athleteLevel`), matériel, exclusions, restrictions, contraintes de douleur, lecture de l'état, phase (identifiant), stimulus, temps, intentions de répétition, notes du planificateur, historique d'empreintes.

```ts
const zStrengthContext = z.object({
  goal: z.object({ primary: zStrengthGoalRef, secondary: zStrengthGoalRef.optional() }).strict(),  // { goal, supportFor? }
  phase: z.object({ kind: z.enum(['accumulation', 'intensification', 'deload', 'maintenance', 'transition']), weekInMesocycle: z.number().int().positive(), mesocycleLength: z.number().int().positive() }).strict(),
  capacities: z.array(zStrengthCapacity),        // { exerciseId, contextKey?, e1rmKg?, lastLoadKg?, lastReps?, confidence, source, asOf }
  tracks: z.array(zStrengthTrack),               // §5 : trackId, tier, exerciseId, archetypeId, slotId, model, nextPrescription, status, openedAt, maxUntil
  recentExposures: z.array(zExerciseExposure),   // dernières expositions par exercice (fenêtre G2) : sets réalisés, reps, charge, RIR, date, classification
  hardSets: z.object({ d7: z.record(zId, z.number().nonnegative()) }).strict(),   // E1 réalisé 7 j
  week: z.object({
    otherStrengthSessions: z.array(z.object({ intentId: zId, archetypeId: zId, plannedHardSets: z.record(zId, z.number().nonnegative()), done: z.boolean() }).strict()),
    neighbors: z.array(z.object({ discipline: z.enum(DISCIPLINES), stimulus: zId, priority: z.enum(['key', 'standard', 'optional']), hoursFromThisSession: z.number(), demand: z.record(zId, z.enum(DEMAND_LEVELS)) }).strict()),
  }).strict(),
  preferences: z.object({ liked: z.array(zId), disliked: z.array(zId) }).strict(),
  equipmentIncrements: z.record(zId, z.array(z.number().positive())).optional(),
}).strict();
```

**Source unique** : `week.neighbors` est la vue de planification. Le `state.recovery` du CORE (contrôle A3) en est une **projection** construite par l'application à partir de la même donnée ; les deux ne sont jamais saisis séparément.

### 1.3 CORE-EXT-3 — Échec métier propre

```ts
export type ProposeResult =
  | { readonly status: 'proposals'; readonly proposals: readonly [SportEngineProposalInput, ...SportEngineProposalInput[]] }   // au moins une
  | {
      readonly status: 'no_valid_proposal';
      readonly reasons: readonly ReasonCode[];                                     // au moins un
      readonly blockingNeeds?: readonly { slotId: string; need: string }[];         // besoins qui ont bloqué
      readonly missingData?: readonly ('capacities' | 'week_context' | 'tracks' | 'catalog_coverage')[];
      readonly provenance: { engineId: string; engineVersion: SemVerString; rulesetVersion: SemVerString; catalogVersion: SemVerString; seed: string };
    };
```

- Schéma zod `zNoValidProposal` (domain), strict, avec au moins une raison. Le CORE vérifie la provenance comme pour une proposition.
- **Ce n'est pas une exception** : le CORE trace une étape `proposal` avec la décision `no_valid_proposal` et ses raisons, puis répond `NO_VALID_SOLUTION` en reprenant ces raisons (et `blockingNeeds` dans les paramètres de trace). C'est le CORE, via le planificateur, qui décide ensuite d'un autre archétype ou d'une autre solution.
- Une exception levée par `propose` reste un défaut technique (`INVALID_INPUT`, comportement actuel).

## 2. Compatibilité avec le CORE existant

| Élément | Impact | Rétrocompatibilité |
|---------|--------|--------------------|
| Séances existantes (`reps: number`, `rir?`) | Aucune : la forme historique reste valide | Totale ; **goldens existants inchangés** (test) |
| `DurationEngine` | Plage de reps : min → estimation `min`, milieu de plage → p50, max → p90. Séries `optional` : comptées dans p90, exclues de p50 et du minimum | Séances sans plage ni option : estimation identique (test) |
| `reduceOneSet` (levier `reduce_sets`) | Retire d'abord une série `optional`, puis la dernière série de travail ; jamais une montée en charge | Identique sans série facultative |
| Validateur | Contrôles G4 : finitude, `min ≤ max`, fraction > 0, cohérence `kind` / `mode` (déjà dans le schéma) | Aucune séance existante n'est refusée |
| E1 (AthleteState) | Une série `optional` ne compte que si elle a été réalisée | — |
| Anti-doublon | Inchangé ; les marqueurs de prescription peuvent utiliser `intensity` | — |
| `acceptProposal` | Contrôle des ancres déclarées (§1.1) | Moteur factice des tests : champs absents ⇒ aucun changement |
| Contrat `SportEngine` | Générique `<TContext>` + `parseContext` + `ProposeResult` | **Rupture assumée** : aucun moteur réel n'existe ; le moteur factice des tests est adapté |
| Architecture | Le moteur de musculation vit dans un paquet `@hybridsport/strength` (dépend de `domain`, `engine` et `zod`) ; `engine` ne dépend toujours que de `domain` | Test d'architecture étendu au nouveau paquet |

## 3. Migration des données sérialisées

- `session_record` passe de **v2 à v3**. Le schéma de `session` accepte les nouveaux champs ; aucun champ existant ne change.
- **Pourquoi changer de version** alors que tout est facultatif : un enregistrement v3 contenant `intensity` ne doit pas être lu par un lecteur v2 qui l'ignorerait. Le lecteur v2 refuse explicitement une version future (mécanisme existant).
- Migration v2 → v3 : **identité** sur les données (version incrémentée seulement). La garde de contenu sportif du CORE le vérifie : la séance est canoniquement identique avant et après.
- Aucune conversion de `rir` historique vers `intensity` : ce serait un changement de forme de la séance, refusé par la garde. Les deux formes coexistent, et les moteurs émettent `intensity`.
- Tests : v1 → v3 et v2 → v3 préservent la séance ; un enregistrement v3 avec `intensity` est refusé par un registre v2.

## 4. Cycle de vie complet d'une ancre

**Autorité unique sur l'existence d'une track (création, clôture) : le ProgressionEngine.** Le planificateur la **déclare**, le StrengthEngine l'**applique**, l'exécution l'**alimente**. Aucun autre composant ne crée ni ne supprime une track.

```
        ┌──────────────────────── cycle de planification N ────────────────────────┐
PLANNER ── lit les tracks ACTIVES ──► SESSION INTENT.repetitionIntents = [progression_anchor{trackId}…]
   ▲                                          │   (la justification existe AVANT la génération)
   │                                          ▼
   │                                  STRENGTH ENGINE
   │                                  • track active + exercice admissible ⇒ item refs {anchor:'declared', trackId},
   │                                    prescription = track.nextPrescription (maintient)
   │                                  • aucune track pour un emplacement ancrable ⇒ item refs {anchor:'candidate'} (propose)
   │                                  • track active mais exercice inadmissible aujourd'hui ⇒ substitution ponctuelle :
   │                                    refs {substitutedFrom, prescriptionSource:'substitution'}, pas de 'declared'
   │                                          │
   │                                  CORE : acceptation (declared ⊆ intentions) → anti-doublon (exemption SEULEMENT
   │                                          pour les intentions déclarées) → validation → résultat
   │                                          │
   │                                     EXECUTION (feedback : séries, reps, charges, RIR, substitution in-app)
   │                                          │
   │                                          ▼
   │                                  PROGRESSION ENGINE (seule autorité)
   │                                  • 'candidate' exécuté ⇒ CRÉE la track (trackId), tier, modèle
   │                                  • 'declared' exécuté ⇒ MET À JOUR la track (classement, prochaine prescription)
   │                                  • substitution ⇒ track inchangée (ni hausse, ni baisse) ; capacité de l'exercice substitué nourrie
   │                                  • pain / safety_pause ⇒ track SUSPENDUE
   │                                  • frontière de mésocycle, maxWeeks, stagnation persistante ⇒ décide la ROTATION
   │                                    (clôture + nouvelle track candidate au cycle suivant)
   │                                  • exercice durablement inadmissible (matériel, restriction, exclusion) ⇒ CLÔTURE
   └──────────── tracks mises à jour ── NEXT PLANNING CYCLE ◄───────────────┘
```

| Action | Responsable unique | Moment |
|--------|--------------------|--------|
| Proposer une nouvelle ancre | StrengthEngine (`anchor: 'candidate'`) | Génération |
| Accepter / créer le `trackId` | ProgressionEngine | Après exécution réelle |
| Déclarer `progression_anchor` | GlobalPlanner, à partir des tracks actives | Avant génération |
| Maintenir la prescription | StrengthEngine (applique `nextPrescription`) | Génération |
| Mettre à jour la track | ProgressionEngine | Après exécution |
| Décider une rotation | ProgressionEngine (planificateur : fournit la frontière de mésocycle) | Frontière de semaine |
| Gérer une substitution ponctuelle | StrengthEngine (à la génération) ou utilisateur (en séance) ; la track n'est pas touchée | Génération / séance |
| Clôturer une ancre | ProgressionEngine | Frontière de semaine |

Invariants testés :
1. un `progression_anchor` n'est jamais déclaré pour une track inexistante ou clôturée ;
2. `anchor: 'declared'` n'apparaît que si l'intention le déclare ;
3. la première occurrence (`candidate`) ne bénéficie d'aucune exemption anti-doublon ;
4. seul le ProgressionEngine crée ou clôture une track ;
5. une track clôturée n'est jamais réactivée : une nouvelle rotation crée un nouveau `trackId`.

## 5. Anchor ou ProgressionTrack (révision de D-S2)

Distinction : **ProgressionTrack = suivi de la progression d'un exercice** ; **ancre = track dont la répétition structure la semaine et est déclarée au planificateur**.

| Tier | Quoi | Track persistante | Intention `progression_anchor` | Continuité à la sélection | Exemples |
|------|------|-------------------|-------------------------------|---------------------------|----------|
| **T1 — Ancre structurante** | Emplacements `primary` (et `secondary` si l'archétype le déclare) | Oui (`tier: 'anchor'`) | **Oui** | C1 (critère 1) | Squat, développé couché, tractions |
| **T2 — Accessoire suivi** | Emplacements `accessory` déclarés `trackable` par l'archétype, **ou** accessoire répété sur k occurrences consécutives du même emplacement (paramètre) | Oui (`tier: 'tracked'`) | **Non** | Critère **C1b**, placé **après** C2 (adéquation au rôle) : garde l'exercice tant qu'il reste bien adapté | Curl, extension triceps, élévation latérale en hypertrophie |
| **T3 — Interchangeable** | Autres accessoires, tronc, portés d'un profil de soutien | Non | Non | Aucune (variété C5) ; dosage par l'historique de l'exercice s'il existe (`prescriptionSource: 'history'`) | Gainage, variantes de tronc |

- Une track T2 se crée comme une T1 (ProgressionEngine, après exécution), elle est rotée à la frontière de mésocycle (paramètre) et suspendue en cas de douleur.
- Elle **n'exempte rien** de l'anti-doublon : sa répétition n'est pas déclarée, et la similarité de séance reste évaluée normalement.
- Résultat : un accessoire ne change pas aléatoirement chaque semaine (C1b), sa progression reste suivie, et aucune intention n'est multipliée sans raison.

**Niveau d'application des modèles de progression** :
- le modèle est porté par la **track** (T1 et T2), choisi à sa création par `strength.progression.modelFor[level][role][exerciseClass]`, et modifiable seulement par le ProgressionEngine (stagnation, rotation) ;
- pour T3, il est déterminé à chaque fois par la même règle, au niveau de l'exercice ;
- **jamais au niveau de la séance ni de la série**. Une séance mélange donc naturellement : principal PM3, secondaire PM2, accessoire T2 PM2, tronc T3.
- **PM4** (progression de séries) n'est pas un modèle de track : il s'applique au **volume hebdomadaire par groupe** (répartition M3) et ajoute des séries aux emplacements, sans changer le modèle des tracks concernées.

**Force et hypertrophie dans un même archétype** : le stimulus ne modifie **jamais** la structure.

| `str_upper` | `strength_heavy` | `strength_volume` |
|-------------|------------------|-------------------|
| Emplacements requis | identiques | identiques |
| Emplacements optionnels possibles | identiques (ceux de l'archétype) | identiques |
| Ordre d'ajout des optionnels | priorité des besoins du stimulus (ruleset) | idem, autre priorité (isolation plus haute) |
| Dosage | profil `strength_heavy` × rôle × classe | profil `strength_volume` × rôle × classe |
| Montées en charge | plus de paliers (intensité plus élevée) | moins de paliers |

Règle vérifiable : pour un archétype donné, l'**ensemble des emplacements requis est indépendant du stimulus**, et les optionnels présents ⊆ optionnels de l'archétype. Le stimulus ne peut agir que sur le dosage et sur la priorité des optionnels (propriété testée, §10). Il n'y a donc pas de template caché.

## 6. Correction : montée en charge

La montée en charge est **une fonction de l'état de connaissance de la charge de travail**, et non un pourcentage unique :

| Charge de travail | Représentation (CORE-EXT-1) | Règle (G2) |
|-------------------|-----------------------------|------------|
| Connue (confiance `high`) | `intensity.mode = 'relative_to_working'` ou `'load'` arrondi | Progression relative vers la charge de travail, si le modèle G2 le retient ; paliers dédoublonnés après arrondi |
| Estimée avec confiance (`medium`) | Idem, avec un dernier palier plus prudent | Idem, avec un écart au dernier palier (paramètre) |
| Déterminée par RIR / RPE (`low`) | `intensity.mode = 'effort'` (efforts croissants) | Nombre de paliers et efforts : paramètres |
| Inconnue (`none`) | `intensity.mode = 'effort'`, paliers exploratoires | Arrêt quand l'effort atteint la cible de la première série de travail (critère G2) |

- **Conditions de nécessité** (G2) : type d'exercice, rôle, intensité relative estimée, position dans la séance.
- **Aucune montée en charge** n'est générée pour un exercice qui ne remplit pas ces conditions (propriété testée).
- Les montées restent hors E1, comptent dans la durée, ne sont jamais facultatives et ne sont jamais retirées par un levier.

## 7. Correction : première prescription sans référence

Le principe est conservé :

```
absence de référence fiable → prescription autorégulée prudente → collecte d'information → hausse progressive de la confiance
```

- **Aucune valeur n'est constante dans le moteur** : cible d'effort, nombre de séries de calibration, progression intra-séance éventuelle, critères d'arrêt et gain de confiance sont des paramètres **G2 `EVIDENCE_REVIEW_REQUIRED`** (§9).
- **G1** : une séance de calibration n'est jamais un effort maximal (STR-V7).
- Représentation : `prescriptionSource: 'calibration'` et `intensity.mode = 'effort'`. Le résultat nourrit la capacité (R1 si le RIR est saisi).

## 8. Revue des décisions D-S1 à D-S8

| Id | Décision | Verdict | Détail |
|----|----------|---------|--------|
| D-S1 | Soutien comme profil unique `support` + `supportFor` | **VALIDATE** | Validé dans l'audit |
| D-S2 | Accessoires non ancrables | **VALIDATE WITH MODIFICATION** | Trois tiers (§5) : ancre T1, accessoire suivi T2 (track sans intention), interchangeable T3 |
| D-S3 | Preset poids du corps : faisabilité de A1 et A3 | **KEEP OPEN** | Dépend du contenu du catalogue (CC1) ; tranché lors du remplissage du catalogue |
| D-S4 | Politique F4 sur le principal d'un objectif `strength` | **VALIDATE WITH MODIFICATION** | L'option « changer de stimulus » est **impossible** sous le contrat (l'acceptation refuse un stimulus différent de l'intention). Politique unique : `no_valid_proposal` avec `blockingNeeds`, puis le CORE et le planificateur choisissent une autre intention |
| D-S5 | Transfert de capacité au sein d'une classe d'équivalence | **VALIDATE WITH MODIFICATION** | Mécanisme validé (transfert limité à la classe, jamais à la famille). Ampleur du déclassement : paramètre G2 `EVIDENCE_REVIEW_REQUIRED` |
| D-S6 | Référence de charge des machines | **VALIDATE WITH MODIFICATION** | Clé = (`exerciseId`, `contextKey?`). `contextKey` (salle ou profil de matériel) est facultatif, jamais de conversion entre machines ou vers la barre |
| D-S7 | `top_set` + `backoff` pour l'avancé | **VALIDATE WITH MODIFICATION** | Stimulus `strength_heavy`, niveau intermédiaire ou avancé, éligibilité STR-V7 (G1), paramètres G2 ; interdit au novice |
| D-S8 | Seuils des tests longitudinaux | **KEEP OPEN** | Fixés comme paramètres de test en phase 4B, puis revus avec l'expert |

## 9. Paramètres encore provisoires

Tous sont `provisional`, sans valeur fixée. **ERR** = `EVIDENCE_REVIEW_REQUIRED`.

**G1** (expert qualifié, non modifiables par le produit) :
1. `strength.selection.skillCeiling`
2. `strength.volume.sessionCap` (L4)
3. `strength.maxEffort.threshold` (STR-V7)
4. `strength.benchmark.safetyWindowDays` (STR-V8)
5. `strength.novice.technicalUnderFatigue` (STR-V6 : position, seuil `technical`)

**G2** (expert de la discipline, plage approuvée) :

| # | Paramètre | ERR |
|---|-----------|-----|
| 1 | `strength.stimuli` | — |
| 2 | `strength.needs.priority` (par objectif **et par stimulus**) | ERR |
| 3 | `strength.support.emphasis` | ERR |
| 4 | `strength.archetype.duration` | — (calibration) |
| 5 | `strength.archetype.trackableSlots` (emplacements T2 déclarés) | — |
| 6 | `strength.selection.criteriaOrder` (C1–C4, C1b) | — |
| 7 | `strength.dose.base` | ERR |
| 8 | `strength.dose.modifiers` (M1–M6) | ERR |
| 9 | `strength.dose.tempoPolicy` | ERR |
| 10 | `strength.load.e1rmFormula` (+ `validRepRange`) | ERR |
| 11 | `strength.load.pctTable` | ERR |
| 12 | `strength.load.assumedRirWhenUnknown` | ERR |
| 13 | `strength.load.referenceWindows` | ERR |
| 14 | `strength.load.equivalenceTransferPenalty` (D-S5) | ERR |
| 15 | `strength.calibration.targetEffort` | ERR |
| 16 | `strength.calibration.sets` | ERR |
| 17 | `strength.calibration.intraSessionProgression` | ERR |
| 18 | `strength.calibration.stopCriteria` | ERR |
| 19 | `strength.calibration.confidenceGain` | ERR |
| 20 | `strength.rampup.requiredWhen` (conditions de nécessité) | ERR |
| 21 | `strength.rampup.byKnowledge` (4 cas du §6 : paliers, fractions ou efforts, reps, repos, prudence du dernier palier) | ERR |
| 22 | `strength.rampup.exploratoryStop` | ERR |
| 23 | `strength.progression.modelFor` | ERR |
| 24 | `strength.progression.steps` | ERR |
| 25 | `strength.progression.classification` | ERR |
| 26 | `strength.progression.evidenceRequired` | ERR |
| 27 | `strength.progression.cycleCap` | ERR |
| 28 | `strength.progression.regressionStep` | ERR |
| 29 | `strength.anchor.maxWeeks` | — |
| 30 | `strength.anchor.rotationPolicy` | — |
| 31 | `strength.track.tier2.autoCreateAfter` (k occurrences) | — |
| 32 | `strength.track.tier2.rotationPolicy` | — |
| 33 | `strength.volume.weeklyRange` (L5) | ERR |
| 34 | `strength.volume.supportRange` | ERR |
| 35 | `strength.interference.adjustments` | ERR |
| 36 | `strength.axialLoad.maxHighPerSession` | ERR |
| 37 | `strength.substitution.patternFallback` | — |
| 38 | `strength.fingerprint.energyByStimulus` | — |
| 39 | `strength.topSet.policy` (D-S7) | ERR |

`strength.substitution.primaryF4Policy` est **supprimé** (D-S4).

**G3 / G4** (hors revue experte) : `strength.selection.localSearchMaxSwaps`, `strength.proposals.max`, `strength.load.defaultIncrements`, `strength.frequency.maxPerWeek`, et l'ordre de C5–C7.

## 10. Tests supplémentaires induits

| Zone | Tests |
|------|-------|
| CORE-EXT-1 (schéma) | Chaque combinaison interdite est refusée : `rir` + `intensity`, `relative_to_working` hors montée, montée facultative, RIR + RPE, ancre déclarée sans `trackId`, reps sur une prescription en durée. Plage `min > max` refusée. Propriété : toute série acceptée est finie et bornée |
| CORE-EXT-1 (durée) | Séance sans nouveaux champs : estimation identique octet pour octet. Plage de reps : min ≤ p50 ≤ p90 cohérents. Série facultative : dans p90, hors p50. `reduce_sets` retire d'abord la série facultative |
| CORE-EXT-1 (acceptation) | `anchor: 'declared'` sans intention ⇒ `DUPLICATE.INTENT_NOT_DECLARED` ; `candidate` accepté sans exemption |
| CORE-EXT-2 | `parseContext` en échec ⇒ `INVALID_INPUT`, `propose` non appelé. Contexte valide transmis tel quel. Champ dupliquant `SportEngineInput` (ex. niveau) refusé par le schéma strict |
| CORE-EXT-3 | `no_valid_proposal` ⇒ étape `proposal` tracée avec raisons et `blockingNeeds` ; résultat `NO_VALID_SOLUTION` avec les mêmes raisons ; provenance incohérente refusée ; `no_valid_proposal` sans raison refusé ; exception de `propose` ⇒ `INVALID_INPUT` |
| Migration | v1 → v3 et v2 → v3 préservent la séance ; enregistrement v3 refusé par un registre v2 ; registre complet |
| Compatibilité | Tous les goldens du CORE inchangés ; les 335 tests existants restent verts ; moteur factice adapté au nouveau contrat |
| Cycle des ancres | Les 5 invariants du §4 (propriétés sur une simulation longitudinale) ; aucune double autorité (seul le ProgressionEngine produit `created` / `closed`) |
| Tiers T1 / T2 / T3 | Accessoire T2 stable sur un mésocycle tant qu'il reste bien adapté ; T2 roté à la frontière ; T3 varie ; T2 n'exempte jamais l'anti-doublon ; détecteur longitudinal « accessoire changé chaque semaine sans cause » |
| Modèles de progression | Séance mixte (PM3 + PM2 + T3) ; modèle porté par la track ; aucun modèle par série ; PM4 n'altère pas le modèle des tracks |
| Stimulus / structure | Propriété : emplacements requis identiques pour tout stimulus d'un même archétype ; optionnels ⊆ archétype ; seuls le dosage et l'ordre d'ajout diffèrent |
| Montée en charge | Les 4 cas de connaissance ; aucune montée hors conditions de nécessité (propriété) ; arrêt exploratoire au critère |
| Première prescription | Sans référence : `calibration` + `effort`, jamais de charge absolue inventée, jamais d'effort maximal ; confiance croissante sur la simulation |
| D-S4 | Principal `strength` sans candidat F1–F3 ⇒ `no_valid_proposal` avec `blockingNeeds`, **jamais** de proposition au stimulus modifié |

---

**`STRENGTH_SPEC_V1_1_GATE = READY_FOR_FINAL_REVIEW`**
