# 08 — ProgressionEngine, boucle de feedback, AdaptationEngine

## 1. ProgressionEngine

### INPUTS
`ProgressionTrack` en cours (par exercice ancre, séance-type ou capacité), exécutions **réelles** récentes, `AthleteState` (régularité, lecture de l'état, capacités), phase, ruleset (modèles, pas, bornes).

### Principes
1. **Une variable dominante progresse généralement à la fois**, sauf modèle explicitement défini et testé (ex. un modèle d'hypertrophie qui fait progresser reps et charge selon une règle documentée). Jamais « tout, à chaque séance ». Chaque modèle déclare sa ou ses variables progressables et est couvert par des tests (V1.1).
2. La progression se décide sur des **preuves répétées**, pas sur une seule bonne séance (sauf test).
3. Aucune hausse si la régularité est faible (S5 sous un seuil) ou si la lecture de l'état est `caution` ou `reduce` ; `unknown` est traité selon `readiness.unknownPolicy` (doc 04 §3.2).
4. **Bornes de progression** par cycle (plafond d'augmentation des capacités estimées) : c'est ce qui empêche la « progression infinie » détectée en test longitudinal.
5. Les pas sont **réalisables** : incrément réel du matériel, pas d'allure arrondi à 5 s/km.
6. **Exclusion des interruptions pour douleur ou pause de sécurité (V1.2)** : les exécutions dont `skipReason ∈ { pain, safety_pause }`, ainsi que les séances non réalisées pendant `programStatus = paused_safety`, ne sont **jamais** interprétées comme une baisse de performance. Elles ne comptent ni comme `below`, ni dans la régularité (S5), ni comme rejet dans le score d'adhérence. La progression concernée est **suspendue** (ni hausse ni baisse) ; la reprise suit les règles G1 de reprise (doc 09 §7).

### Variables progressables par discipline

| Discipline | Variables | Modèles |
|------------|-----------|---------|
| Musculation | charge, reps, séries, densité (repos), difficulté (variante plus difficile), amplitude, tempo | **Linéaire** (novice) ; **double progression** (fourchette de reps puis charge) ; **autorégulé RIR + e1RM** (intermédiaire, avancé) ; **progression de volume** (séries) en hypertrophie ; **ondulé / par blocs** (avancé) |
| Course | volume, durée, distance, intensité, densité (récupérations), spécificité | Volume par paliers avec décharge ; séances de qualité par **séries de progression** (temps cumulé à l'allure, puis récupération raccourcie, puis allure) ; allures mises à jour uniquement sur preuves (test, course, séances de qualité réussies à RPE bas de manière répétée) |
| HYROX | volume de station, charges, transitions, course compromise, densité, spécificité | Progression de la charge des stations vers le standard de la division ; densité (moins de pauses) ; réduction de l'écart allure fraîche / allure compromise ; rampe de spécificité (GlobalPlanner) |
| Cross-training | capacité, densité, complexité (scaling), volume, intensité | Échelles de scaling (paliers de `progressionFamily`) avec critères objectifs ; charges liées aux e1RM ; retest de benchmarks |

### DECISION PROCESS (exemple : modèle autorégulé RIR + e1RM, exercice ancre)
1. Mise à jour de l'e1RM à partir des séries de travail réalisées avec RIR saisi (formule dans le ruleset). Estimation **lissée**, jamais le maximum ponctuel ; confiance mise à jour.
2. Classement de la séance : `above` (reps réalisées et RIR réel ≥ cible + 1), `on_target`, `below` (reps manquées ou RIR réel ≤ cible − 2).
3. Décision :

| Historique | Décision |
|------------|----------|
| `on_target` ou `above` | Progression de **la** variable du modèle au prochain pas (ex. charge + incrément réalisable) |
| `above` × 2 consécutifs | Recalage de l'e1RM à la hausse (borné) |
| `below` × 1 | Maintien |
| `below` × 2 consécutifs (hors `pain` / `safety_pause`, principe 6) | Réduction (ex. −5 à −10 %, paramètre) ou variante ; `PROGRESSION.REGRESSED` |
| Prescription identique sur N semaines sans justification | `DUPLICATE.PLANNED_BUT_STAGNANT` ⇒ changer de variable ou de modèle |
| Performance nettement supérieure (test, record) | Mise à jour de la capacité au prochain point de recalcul (début de semaine), jamais au milieu d'une semaine en cours |

### OUTPUTS
`ProgressionUpdate[]` : prochaine prescription par track, capacités mises à jour (avec leur confiance), reason codes (`PROGRESSION.ADVANCED(variable=load, step=2.5kg)`).

### VALIDATION
Bornes de progression respectées ; pas réalisables ; cohérence avec la phase (pas de hausse de volume en décharge) ; aucune capacité ne progresse au-delà du plafond par cycle.

### FAILURE MODES
Données d'exécution absentes (séance cochée sans charges) ⇒ `DATA.ASSUMED_AS_PRESCRIBED`, progression **gelée** tant que la confiance n'est pas suffisante ; tests manqués ⇒ capacités conservées avec une confiance dégradée ; matériel plafonné ⇒ changement de variable (reps, tempo).

## 2. Boucle de feedback (après séance)

Objectif : **recueillir uniquement ce qui modifie une décision future**. La majorité des données est captée **pendant** la séance (séries cochées, valeurs préremplies modifiées d'un geste).

| Question | Quand la poser | Décision alimentée | Coût pour l'utilisateur |
|----------|----------------|--------------------|-------------------------|
| Séance terminée ? | Déduit automatiquement ; demandé seulement si c'est ambigu | Exposition réelle, adhérence | 0–1 tap |
| RPE global (1–10) | Toujours proposé, **facultatif** | E6, S4, calibration de la difficulté | 1 tap |
| Charges et reps réelles | Pendant la séance (préremplies avec la cible) | Progression | 0 tap si conforme |
| RIR | Seulement sur la **dernière série de travail des exercices ancres** (modèle autorégulé) | e1RM | 1 tap |
| Difficulté vs attendu | Seulement si le RPE est absent ou si l'écart prévu/réalisé est notable | S4, progression | 1 tap |
| Douleur ou inconfort ? | Toujours un **oui/non** discret ; détails uniquement si « oui » (zone, intensité, moment) | Comportement conservateur (doc 09 §7) | 1 tap (3 si « oui ») |
| Temps réel | Automatique (horodatage) | Calibration de durée | 0 |
| Allure / distance de course | Seulement sans import santé : saisie simple par segment ou globale | E3, allures | quelques taps |

Règle : **une donnée ne modifie une décision que si elle dépasse un seuil de pertinence** (ex. un RPE isolé élevé ne déclenche rien ; deux RPE élevés sur trois séances font passer la lecture de l'état en `caution`).

## 3. AdaptationEngine

### INPUTS
`AdaptationEvent`, `Program` courant (révision active), `AthleteState`, calendrier, ruleset.

```ts
type AdaptationEvent =
  | { type: 'session_missed'; sessionId: ID }
  | { type: 'session_moved_by_user'; sessionId: ID; toDate: ISODate }
  | { type: 'time_reduced'; sessionId: ID; availableMinutes: number }
  | { type: 'equipment_changed'; scope: 'session' | 'from_date'; profileId: ID }
  | { type: 'availability_changed'; availability: Availability }
  | { type: 'discipline_added' | 'discipline_removed'; discipline: Discipline }
  | { type: 'goal_changed'; goalId: ID }
  | { type: 'performance_deviation'; direction: 'above' | 'below'; evidence: ReasonCode[] }   // issu de processWorkoutResult
  | { type: 'readiness_changed'; category: 'caution' | 'reduce' }
  | { type: 'pain_reported'; report: PainReport }
  | { type: 'eligibility_changed'; eligibility: UserTrainingProfile['eligibility'] }
  | { type: 'test_completed'; sessionId: ID }
  | { type: 'engine_upgraded'; from: string; to: string };
```

### DECISION PROCESS : replanification minimale

1. **Analyse d'impact.** Séances dépendantes (écarts L1, séance clé, ordre `mustPrecede`, semaine de test), contraintes nouvellement violées, séances clés menacées, effet sur la progression.
2. **Portée minimale** : on essaie successivement `session` → `rest_of_week` → `next_week` → `phase` → `program`. On s'arrête à la **première portée** qui produit une solution valide.
3. **Zone gelée** : séances réalisées (immuables), séance en cours, séances verrouillées par l'utilisateur. **Règle de stabilité UX** : les prochaines 24 h (paramètre) ne changent pas, **sauf exceptions** (V1.1) :
   - **sécurité** (règle SAFETY violée par la séance prévue) ;
   - **douleur** signalée (doc 09 §7) ;
   - **indisponibilité explicite** déclarée par l'utilisateur ;
   - **modification demandée par l'utilisateur** ;
   - **impossibilité devenue certaine** (matériel indisponible confirmé, fermeture de la salle, dates bloquées).
   Chaque exception est tracée (`ADAPT.FROZEN_ZONE_OVERRIDE{reason}`). Hors de ces cas, un changement calculé dans la zone gelée est reporté à la séance suivante hors zone.
4. **Génération d'options** et évaluation de chacune par le même score (doc 01 §4, couches A et B), auquel s'ajoute un **coût de changement**. La **couche C (hystérésis, doc 01 §5)** s'applique : le plan actuel est conservé si le gain d'une option ne dépasse pas le seuil sur B1–B3, sauf violation de la couche A :

```
changeCost = w1·(séances modifiées) + w2·(séances déplacées) + w3·(séances clés perdues)
           + w4·(écart de progression) + w5·(préférences touchées)
```

5. **Validation complète** de l'horizon touché ; seules les options valides sont retenues et **classées**.
6. **Proposition (V1.1)** : le moteur désigne **une recommandation principale** (la mieux classée) ; les alternatives valides restent disponibles. L'interface présente **par défaut la recommandation seule** (diff + explication courte), les alternatives étant accessibles au second plan. Application directe pour une action explicite de l'utilisateur (L0) ; aperçu et confirmation si des séances visibles changent.

### `replanAfterMissedSession(sessionId)`

Une séance manquée n'est **jamais** automatiquement déplacée au lendemain. Arbre de décision :

```
Importance de la séance ?
├─ optional  ─────────────────────────────────────────────► SKIP
├─ standard
│   ├─ Un créneau valide existe cette semaine sans violer L1/L2/I* ni évincer une séance clé ? ──► MOVE (score) sinon
│   ├─ Contenu fusionnable dans une séance de même discipline (accessoires seulement, durée OK) ? ──► MERGE partiel sinon
│   └─ ──────────────────────────────────────────────────► SKIP (le volume n'est pas reporté)
└─ key
    ├─ Créneau valide dans la fenêtre (≤ 48–72 h, paramètre) ? ──► MOVE, en décalant si besoin une séance standard
    ├─ Peut remplacer la prochaine séance de même discipline (moins importante) ? ──► REPLACE
    ├─ Séance de test ? ──► REPROGRAMMER au prochain créneau compatible de la semaine suivante
    └─ ──────────────────────────────────────────────────► SKIP + ajustement de la suivante (progression maintenue, pas « doublée »)
Contexte aggravant (fatigue `caution`/`reduce`, ≥ 2 séances manquées sur 7 j) ⇒ préférer SKIP et alléger la reprise.
```

Options évaluées : **SKIP**, **MOVE**, **MERGE** (jamais deux séances clés fusionnées ; seulement des éléments compatibles ; durée et L4 respectés), **REPLACE**, **SHIFT** (décaler le reste de la semaine, rarement retenu car coûteux en changements). Chaque option est simulée, validée, notée, et la meilleure est proposée (d'autres peuvent être affichées).

### Autres événements (résumé)

| Événement | Portée typique | Comportement |
|-----------|----------------|--------------|
| `time_reduced` | session | DurationEngine (doc 07 §3) ; sinon archétype court de même stimulus ; sinon report |
| `equipment_changed` (séance) | session | Substitutions (fidélité) ; sinon autre archétype du même stimulus |
| `availability_changed` | semaine suivante (et la semaine en cours si nécessaire) | Nouveau placement ; les intentions de la semaine sont réutilisées au maximum (stabilité) |
| `discipline_added` | phase | Nouvel arbitrage ; introduction **progressive** (la nouvelle discipline démarre avec un volume faible, L3 pour la course) |
| `goal_changed` | programme | Nouvelle macro ; capacités et historique conservés |
| `performance_deviation` | phase (au prochain recalcul) | ProgressionEngine ; capacités recalculées |
| `readiness_changed` | reste de la semaine | Allègement (volume et intensité), séance clé déplacée plutôt que dégradée si possible |
| `pain_reported` | immédiat | Doc 09 §7 : P1–P3 ⇒ restrictions et adaptations selon les règles G1 ; P4 ⇒ interruption de la séance, `programStatus = paused_safety`, blocage de la génération selon le ruleset G1, message de sécurité localisé |
| `eligibility_changed` | programme | `programStatus` recalculé (doc 09 §8) ; `suspended_scope` ⇒ aucune génération, historique conservé |
| `engine_upgraded` | à la frontière de semaine | Régénération des séances futures non commencées, si la politique de version l'exige (doc 10 §2) |

### OUTPUTS
```ts
interface ReplanResult {
  recommended: ReplanProposal;         // affichée par défaut
  alternatives: ReplanProposal[];      // classées, accessibles au second plan (peut être vide)
}

interface ReplanProposal {
  rank: number;                        // 1 = recommandation principale
  scope: 'session' | 'rest_of_week' | 'next_week' | 'phase' | 'program';
  diff: PlanDiff;                      // ajouts / modifications / déplacements / suppressions
  changeCost: number; score: SolutionScore;
  reasons: ReasonCode[];
  requiresConfirmation: boolean;
}
```

### VALIDATION
Revalidation complète de l'horizon modifié et de ses frontières ; invariants : le passé n'est pas modifié, aucune séance clé perdue sans reason code, pas de « doublement » d'une séance manquée, idempotence (rejouer l'événement ne produit aucun nouveau changement).

### FAILURE MODES
Aucune option valide à la portée maximale ⇒ `NO_VALID_SOLUTION` + alternatives (ex. réduire les objectifs de la semaine) ; événements concurrents (hors-ligne) ⇒ traités dans l'ordre de leur horodatage, chaque proposition étant rebasée sur la révision la plus récente (le serveur fait autorité, phase 1 D6).
