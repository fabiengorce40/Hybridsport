# CORE-EXT-R1 — RFC : séance de course structurée (fractionné, cibles en plages)

> **Statut : RFC FINALE (5C), NON IMPLÉMENTÉE.** Phase 5B (section Y), finalisée en 5C (B4, AI) : comparaison entre profondeur fixe et récursion bornée, recommandation finale au §8. Aucun fichier du CORE n’est modifié. CORE-EXT-5 (RIR en plage) est indépendante et reste non implémentée.

## 1. Problème

### 1.1 Schéma actuel du CORE (`packages/domain/src/session.ts`)
- `distance` : `{ distanceM, paceSecPerKm?: {min, max} }`. L’allure est **déjà une plage** ; la domain spec 5A disait à tort « une allure unique ».
- `timed` : `{ workS, rounds, restS }`.
- `intervals` : `{ reps, work: {timeS} | {distanceM}, recoveryS, paceSecPerKm?: {min, max} }`.
- Blocs `SessionBlock` : `kind` (dont `warmup`, `running`, `cooldown`), `format` (`sets`, `emom`, `amrap`, `for_time`, `continuous`), `minDurationS` (plancher), `levers` (dont `reduce_run_volume {minS?, minM?}`).
- `session_record` sérialisé, version **3**. Un lecteur refuse une version inconnue.

### 1.2 Ce qui manque pour Running V1

| Besoin | Couvert aujourd’hui ? |
|---|---|
| Séries et récupération entre séries | Non |
| Mode de récupération (arrêt, marche, trot) | Non |
| Récupération en distance | Non |
| Cible d’effort (RPE) en plage | Non (pour la course) |
| Cible FC en plage | Non |
| Domaine d’intensité interne | Non |
| Priorité de cible (PACE / EFFORT / HR) | Non |
| Préparation (gammes, lignes droites) | Non (sauf comme bloc séparé) |
| Plusieurs blocs de travail (progression, fartlek structuré) | Non |
| Durée de travail distincte de la durée totale | Non (implicite) |
| Séance sans montre ni GPS | Partiel : `paceSecPerKm` est facultatif, mais il n’existe pas d’alternative par l’effort |

## 2. Exigences

La conception retenue doit pouvoir représenter :
- structure : échauffement, préparation, séries, répétitions ;
- travail : cible de travail, en distance **ou** en durée ;
- cibles : plage d’allure, plage d’effort, plage de FC, domaine d’intensité ;
- récupérations : intra-répétition, entre séries, mode de récupération ;
- retour au calme ;
- estimations : durée de travail estimée et durée totale estimée.

Critères transverses :
- sérialisation ;
- validation ;
- rétrocompatibilité ;
- modèle de séance existant ;
- rendu UI (cases à cocher, minuteur) ;
- historique, retours et analytique ;
- compatibilité future avec l’HYROX et les séances structurées ;
- stabilité d’API.

**Contrainte clé** : les champs ne sont pas tous obligatoires. Un athlète en saisie manuelle, sans montre, doit pouvoir recevoir et renseigner une séance. Aucune cible d’allure ni de FC n’est exigée.

## 3. Options

### Option A — Étendre la prescription `intervals`

Ajouter des champs facultatifs à `intervals` :
- `sets`, `betweenSetRecoveryS`, `recoveryMode`, `recovery: {timeS} | {distanceM}` ;
- `effort?: {rpeMin, rpeMax}`, `hrBpm?: {min, max}`, `domain`, `targetPriority`.

| Critère | Évaluation |
|---|---|
| Couverture | **Partielle** : une seule forme de répétition par item ; pas de préparation ; pas de blocs successifs (progression) ; échauffement et retour au calme restent des blocs séparés |
| Sérialisation / validation | Simple ; mais `intervals` devient un objet surchargé à champs conditionnels |
| Rétrocompatibilité | Bonne : tous les nouveaux champs sont facultatifs ; `session_record` passe en v4 pour qu’un lecteur v3 refuse |
| UI / minuteur | Correct pour les séances simples ; insuffisant pour les séances à plusieurs blocs |
| Historique / retours | Complétion par répétition possible, mais sans identité de répétition stable |
| HYROX / séances structurées | Faible |
| Stabilité d’API | Moyenne : chaque besoin futur ajouterait des champs |

### Option B — Nouvelle prescription `run_structure` à segments (recommandée)

Ajouter une variante discriminée `type: 'run_structure'` à `zPrescription`, portée par un item d’un bloc `running` (format `continuous`) :

```
run_structure
├─ segments[]  (ordonnés, ≥ 1)
│   ├─ { kind: 'warmup' | 'cooldown' | 'steady',
│   │    dose: {durationS} | {distanceM},
│   │    target: RunningTarget }
│   ├─ { kind: 'preparation',                       // gammes / lignes droites
│   │    reps?, dose: {durationS} | {distanceM}, target: RunningTarget,
│   │    recovery?: RecoverySpec }
│   └─ { kind: 'repeat',                            // bloc de travail
│        id,
│        sets: int ≥ 1,
│        reps: int ≥ 1,
│        work: {durationS} | {distanceM},
│        target: RunningTarget,
│        recovery: RecoverySpec,                    // entre répétitions
│        betweenSetRecovery?: RecoverySpec }        // obligatoire si sets > 1
├─ estimates?: { workS: {min, max}, totalS: {min, max} }   // dérivés, recalculables
RecoverySpec = { dose: {durationS} | {distanceM}, mode: 'standing' | 'walk' | 'jog' }
RunningTarget = {
  domain: 'easy_low' | 'moderate' | 'heavy' | 'threshold_like' | 'severe' | 'sprint_neuromuscular',
  paceSecPerKm?: {min, max},
  effort?: { rpe: {min, max} } | { descriptor: enum },
  hrBpm?: {min, max},
  priority: 'pace' | 'effort' | 'hr'
}
```

**Règles de validation**
1. `segments` n’est pas vide ; au plus un `warmup` en tête et au plus un `cooldown` en fin.
2. `dose` et `work` : **exactement une** grandeur (durée XOR distance).
3. `betweenSetRecovery` est obligatoire si `sets > 1` et interdit si `sets = 1`.
4. `RunningTarget` :
   - `domain` est obligatoire ;
   - **au moins** `effort` ou `paceSecPerKm` est présent : l’effort suffit (athlète sans montre) ;
   - `hrBpm` n’est jamais obligatoire ;
   - la `priority` doit désigner une cible présente ;
   - toute plage vérifie `min ≤ max`.
5. `domain = 'easy_low'` ⇒ les plages sont interprétées comme des **plafonds**. Le rendu affiche « au plus » ; la conformité mesure seulement le dépassement.
6. Un segment `kind: 'repeat'` avec une cible `priority: 'pace'` et un domaine `sprint_neuromuscular` est refusé (incohérent avec l’arbitrage 5B §I).
7. `estimates` : recalculés par le CORE à la validation ; une incohérence avec la structure est un refus. Ce sont des champs **dérivés**, jamais une autorité.
8. Profondeur fixe : séries > répétitions. Pas de répétitions imbriquées arbitraires en V1.

| Critère | Évaluation |
|---|---|
| Couverture | **Complète** pour les 11 archétypes 5B, y compris la progression (segments `steady` successifs) et les lignes droites (`preparation` ou `repeat` en domaine `sprint_neuromuscular`) |
| Sérialisation | Objet JSON strict ; identifiants de segment stables (`id`) utiles à l’historique |
| Validation | Schéma strict, avec règles de cohérence localisées dans une seule variante |
| Rétrocompatibilité | Additive : `distance`, `timed` et `intervals` restent valides et inchangés ; aucune migration des données existantes ; `session_record` passe en **v4** (même motif que v2 → v3) pour qu’un lecteur v3 refuse une séance v4 au lieu d’ignorer la variante |
| Modèle de séance existant | S’insère comme un item d’un bloc `running`. Deux placements possibles pour l’échauffement et le retour au calme : blocs `warmup` / `cooldown` séparés (planchers `minDurationS` existants) ou segments internes. **Recommandation** : segments internes pour une séance de course pure ; blocs séparés pour une séance mixte (HYROX, musculation + course). |
| Leviers de durée | `reduce_run_volume` doit recevoir une sémantique propre à `run_structure` : réduire d’abord `warmup` / `cooldown` au-dessus du plancher, puis les répétitions, jamais la cible. À spécifier dans l’implémentation, avec tests. |
| UI | Rendu par segment ; une case à cocher **par répétition** (identité `segmentId` + série + répétition) ; minuteur : compte à rebours pour une dose en durée, tour manuel pour une dose en distance (aucun GPS requis) |
| Historique / retours | `RunningFeedback.intervalCompletion` et `targetCompliance` adressables par segment et par répétition ; `actualPace` et `actualHR` facultatifs |
| Analytique | Temps par domaine = somme des doses de travail par `domain` (durées réalisées si saisies, sinon estimées et marquées ESTIMATED) |
| HYROX / séances structurées | `segments` généralisable par un futur champ `modality` (course, rameur, station), hors V1 |
| Stabilité d’API | Bonne : une variante versionnée ; les extensions se font par segment |

### Option C — Composer avec les blocs CORE existants

Représenter la séance par plusieurs blocs : `warmup` (item `timed`), `running` (items `intervals` ou `distance`), `cooldown`. Les cibles d’effort et de FC s’ajoutent sur les items.

| Critère | Évaluation |
|---|---|
| Couverture | **Insuffisante** : séries, récupération entre séries et mode de récupération restent absents sans étendre `intervals` (on retombe sur l’option A) |
| Rétrocompatibilité | Très bonne |
| Leviers | Réutilise directement `minDurationS` et `reduce_run_volume` |
| UI / historique | Une séance de course éclatée en blocs : retours et analytique par séance plus difficiles |
| HYROX | Moyen |
| Stabilité d’API | Faible : les cibles d’effort et de FC doivent être ajoutées à plusieurs prescriptions |

### Option D — Arbre générique de séance structurée (étapes et groupes répétés imbriqués)

Modèle général, à la manière des formats de séance structurée des montres : étapes et groupes de répétition imbriqués sans limite.

| Critère | Évaluation |
|---|---|
| Couverture | Maximale |
| Validation | Complexe (profondeur arbitraire, cohérence des estimations) |
| UI | Rendu et cases à cocher plus complexes |
| HYROX | Bonne |
| Risque | Sur-ingénierie pour V1 ; surface de test importante |

## 4. Comparaison

| Critère | A | **B** | C | D |
|---|---|---|---|---|
| Couverture des exigences §2 | Partielle | **Complète** | Insuffisante | Complète |
| Athlète sans montre | Oui | **Oui (l’effort suffit)** | Oui | Oui |
| Rétrocompatibilité | Bonne | **Bonne (additive, v4)** | Très bonne | Bonne |
| Complexité de validation | Faible | **Moyenne, localisée** | Faible | Élevée |
| UI : cases à cocher et minuteur | Moyen | **Bon** | Moyen | Bon mais complexe |
| Historique et analytique | Moyen | **Bon** | Faible | Bon |
| Future compatibilité HYROX | Faible | **Moyenne à bonne** | Moyenne | Bonne |
| Stabilité d’API | Moyenne | **Bonne** | Faible | Bonne |

## 5. Recommandation

**Option B** : nouvelle prescription `run_structure` à segments, profondeur fixe (séries > répétitions), cibles en plages avec domaine obligatoire et priorité explicite, effort suffisant sans montre, estimations dérivées. Le fractionné simple existant (`intervals`) et `distance` restent valides.

## 6. Plan d’implémentation futur (pour mémoire, non exécuté)

1. Schéma de domaine + `session_record` v4 + migration v3 → v4 : identité pour les données existantes, aucune reconstruction.
2. Estimation de durée de travail et de durée totale (DurationEngine) + sémantique de `reduce_run_volume` pour `run_structure`.
3. Validation CORE (règles 1 à 8).
4. Tests de sérialisation, de migration, de refus et d’estimation : voir `RUNNING-5C-FUTURE-TEST-PLAN.md`, cas T-CORE-*.
5. Empreinte CORE (F20) : mise à jour **explicite et motivée** au moment de l’implémentation, qui fera l’objet d’une phase dédiée approuvée.

## 7. Questions ouvertes
- Faut-il un `effort.descriptor` (mots) en plus de la plage RPE pour les débutants ? (Proposition : oui, facultatif.)
- Les `estimates` doivent-ils être stockés ou toujours recalculés ? (Proposition : stockés, avec provenance ; recalculés et comparés à la validation.)
- Faut-il permettre `repeat` en domaine `easy_low` (alternance course / marche, P-R0) ? (Proposition : oui, avec une récupération en mode `walk`.)

---

## 8. Finalisation 5C : profondeur de la structure (B4, AI)

### 8.1 Comparaison

| Critère | **Profondeur fixe** (séance → segments → séries × répétitions) | Récursion bornée (groupes imbriqués, profondeur maximale N) |
|---|---|---|
| Sérialisation | Liste plate de segments ; chaque `repeat` porte `sets` et `reps` | Arbre ; profondeur à borner et à valider |
| Validation | Règles locales à un segment (1 à 8 du §3) | Règles récursives, cohérence des estimations sur l’arbre |
| Rendu UI | Liste linéaire, rendu direct | Rendu imbriqué, repliable |
| Reprise (`resume`) | Adresse = (index de segment, série, répétition, phase travail / récupération) : 4 entiers | Chemin dans l’arbre, de longueur variable |
| Minuteur | Séquence déterministe dérivée par simple déroulement | Déroulement récursif |
| Cases à cocher | Une case par (segment, série, répétition) | Une case par feuille, avec un chemin |
| Historique et retours | Clé stable `segmentId` + série + répétition | Clé = chemin |
| Analytique | Somme directe par `domain` | Parcours d’arbre |
| Expressivité V1 | Couvre les 11 archétypes et les goldens R1–R12 | Couvre aussi les pyramides imbriquées et les fartleks complexes (hors V1) |
| HYROX futur | Ajout d’un champ `modality` par segment ; stations comme segments | Naturel, mais pas nécessaire |
| Risque | Faible | Surface de test plus grande ; profondeur arbitraire si la borne dérive |

### 8.2 Recommandation finale

**Profondeur fixe** (option B, sans récursion) :
- une séance est une **liste ordonnée** de segments ;
- un segment `repeat` a **deux niveaux fixes** : séries × répétitions ;
- **plusieurs blocs de travail** = plusieurs segments `repeat` successifs, jamais imbriqués.

La récursion bornée n’est pas retenue pour V1 : elle n’apporte rien aux 11 archétypes et coûte en validation, rendu et reprise.

### 8.3 Démonstration : échauffement → bloc 1 → répétitions → récupérations → bloc 2 → retour au calme

```
run_structure
  [0] warmup      : 12 min · easy_low · RPE ≤ 3
  [1] preparation : reps 4 · 15 s · sprint_neuromuscular · recovery 45 s walk
  [2] repeat id=A : sets 1 · reps 3 · work 8 min threshold_like (RPE 5–6)
                    recovery 2 min jog
  [3] steady      : 3 min · easy_low                      ← transition entre blocs
  [4] repeat id=B : sets 2 · reps 4 · work 200 m severe (pace range | RPE 7–8)
                    recovery 200 m jog · betweenSetRecovery 3 min walk
  [5] cooldown    : 8 min · easy_low
```

(Valeurs illustratives, **pas des prescriptions** : elles servent seulement à montrer que la structure est représentable.)

| Besoin | Réponse avec la profondeur fixe |
|---|---|
| Case à cocher | (segment 2, série 1, rép. 1..3) ; (segment 4, série 1..2, rép. 1..4) |
| Minuteur | Déroulement linéaire : 12:00 → 4 × (0:15 + 0:45) → 3 × (8:00 + 2:00, sans récupération après la dernière) → 3:00 → série 1 : 4 × (200 m + 200 m) → 3:00 → série 2 → 8:00. Les doses en distance sont validées par un tour manuel (sans GPS). |
| Reprise | Adresse (4, 2, 3, work) ⇒ reprendre au 3e 200 m de la série 2 |
| Historique et retours | `intervalCompletion` par (segmentId, série, rép.) ; `targetCompliance` par segment |
| Analytique | Travail THRESHOLD_LIKE = 24 min (A) ; SEVERE = 8 × 200 m (B) ; totaux calculés |
| HYROX futur | Segment `modality: station` avec sa propre dose ; toujours à plat |

### 8.4 Estimations (dérivées, jamais une autorité)
- `estimates.workS` = somme des doses de travail.
- `estimates.totalS` = échauffement + préparation + travail + récupérations (sans la récupération après la dernière répétition d’une série, et avec une `betweenSetRecovery` entre séries) + transitions + retour au calme.
- Une dose en distance est convertie en durée **seulement** avec une plage d’allure (bornes de la plage) ; sinon l’estimation est marquée `UNKNOWN_DURATION_COMPONENT` et la séance ne peut pas être placée sans confirmation.

**CORE-EXT-R1 NOT IMPLEMENTED.**
