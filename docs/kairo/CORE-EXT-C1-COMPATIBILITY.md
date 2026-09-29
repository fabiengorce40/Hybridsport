# CORE-EXT-C1 : analyse de compatibilité (RFC)

**Statut : RFC, pour revue.** Aucune modification du CORE n'est autorisée ni faite. Le paquet `@hybridsport/crosstraining` (C1) déclare la dépendance technique `CORE_EXT_C1 = UNSATISFIED`, et les capacités qui en dépendent restent désactivées.

**Question posée :** quelles prescriptions Cross-training le contrat actuel du CORE ne peut-il **pas** représenter ? Pour chaque concept manquant, où doit-il vivre ? Quelle est la plus petite solution, y compris sans aucune modification du CORE ?

## 1. Ce que le CORE représente aujourd'hui (constaté dans le code)

### Blocs (`packages/domain/src/session.ts`, `zBlock`)
| Format | Champs |
|---|---|
| `sets` | `grouping` : `straight` / `superset` / `circuit` |
| `emom` | `minutes` |
| `amrap` | `timeCapS` |
| `for_time` | `rounds`, `timeCapS` (obligatoire) |
| `continuous` | — |

### Prescriptions d'item (`zPrescription`)
| Type | Champs | Charge ? | Effort ? |
|---|---|---|---|
| `sets` | séries avec `SetIntensity` : `load{kg}`, `percent_of_reference`, `effort{rir\|rpe}`, `bodyweight{addedKg}` | **oui** | **oui** (par série) |
| `reps` | `reps` | non | non |
| `calories` | `calories` | non | non |
| `distance` | `distanceM`, allure optionnelle | non | non |
| `timed` | `workS`, `rounds`, `restS` | non | non |
| `intervals` | `reps`, `work{timeS\|distanceM}`, `recoveryS` | non | non |
| `hold`, `mobility`, `run_structure` | — | non | selon le type |

### Validation (`packages/engine/src/validation/checks.ts`)
- Le seul couplage format ↔ prescription trouvé : un bloc `sets` en superset ou circuit exige des items `sets` (ligne 251).
- **Rien n'interdit un item `sets` dans un bloc `amrap`, `for_time` ou `emom`.**
- Le validateur ne lit pas la charge.

### Durée (`packages/engine/src/duration/estimate.ts`)
- `emom` et `amrap` : durée fixe (minutes ou cap).
- `for_time` : min(cap, tours × Σ travail + transitions).
- Travail d'un item :
  - `reps` : `workRate` du catalogue si `reps_per_min`, sinon `secondsPerRep` ;
  - `calories` et `distance` : `workRate` ;
  - `sets` : `secondsPerRep`, jamais `workRate`.

### Empreinte (`duplicate/fingerprint.ts`)
Les marqueurs de prescription sont **fournis par le moteur** (`fingerprintInputs`), puis validés. Le CORE ne déduit pas la nature du travail de la forme `sets`.

### Résultat
Le CORE **n'enregistre aucun résultat**. `session_record` contient la séance et sa provenance. Les séances réalisées vivent côté application et dans le contexte de discipline (Course : `sessionHistory` ; Cross-training C1 : `zRealizedCtSession`).

## 2. Prescriptions Cross-training NON représentables aujourd'hui

| # | Prescription | Représentable ? | Détail |
|---|---|---|---|
| P1 | Mouvement **chargé** dans un metcon, en reps (« 15 wall balls 9 kg », « 10 deadlifts 60 kg ») | **Partiellement** | Pas sur `reps`. Possible seulement sous forme d'item `sets` à une série (§4, option 0) |
| P2 | Charge sur un item en **calories, distance ou temps** (sled push 20 m chargé, farmer carry 40 m à 2 × 24 kg) | **Non** | Aucun type `distance`, `calories` ou `timed` ne porte de charge. `sets` n'a pas de dose en mètres |
| P3 | **Cible d'effort d'un metcon** (bloc ou séance : « rythme soutenu, RPE 7 ») | **Non** | `zEffort` n'existe que par série d'un item `sets` |
| P4 | **Type de score** (for time, rounds + reps, minutes tenues…) | Non requis en prescription | Il découle de la **définition du format** du bloc |
| P5 | **Variante / scaling prescrit** (ring rows au lieu de tractions ; step-ups au lieu de box jumps) | **Oui** | `exerciseId` = variante prescrite ; `refs.substitutedFrom` = mouvement Rx ; `refs.prescriptionSource` |
| P6 | **Options de scaling** proposées à l'athlète à l'exécution | **Partiellement** | `alternatives` ≤ 3 identifiants, sans dose propre à chaque alternative |
| P7 | **EMOM alterné** (minute 1 : A, minute 2 : B) | **Non** | Un bloc `emom` n'attribue pas d'item à une minute. La sémantique implicite est « tous les items chaque minute » |
| P8 | **Intervalles multi-stations** (40 s A / 40 s B, 20 s de repos, N tours) | **Non** (ordre perdu) | Un bloc `continuous` avec des items `timed` a la bonne durée mais une rotation perdue. Un circuit exige des items `sets` |
| P9 | **Chipper / for time** sans charge (reps, calories, mètres) | **Oui** | `for_time{rounds, timeCapS}` + items `reps` / `calories` / `distance` |
| P10 | **AMRAP / EMOM / continu** sans charge | **Oui** | Formats existants |

**Conséquence directe pour C2** : le rejeu **non chargé** (P9, P10) est représentable **sans aucune modification du CORE**. Les blocages CORE commencent avec la charge (P1, P2), l'effort (P3) et certaines structures (P7, P8).

## 3. Où chaque concept doit vivre

Classement demandé : sémantique générique de prescription du CORE · métadonnées ou contexte propres au Cross-training · catalogue · enregistrement d'exécution ou de résultat.

| Concept | Classement | Justification |
|---|---|---|
| **Charge externe prescrite** (kg sur un mouvement) | **Sémantique générique du CORE** (la valeur) + **catalogue** (modèle de charge, standards d'implément) + **Cross-training** (choix de la charge, CT-D12) | La charge fait déjà partie de la sémantique générique du CORE (`SetIntensity`), et d'autres disciplines (HYROX : sled, wall ball, sandbag) en auront besoin : ce n'est pas un concept propre au Cross-training. La **décision** de la charge reste au moteur Cross-training |
| **Standards d'implément** (wall ball, kettlebell, sandbag) | **Catalogue** (données) + décision produit (CT-D12) | Donnée d'équipement et de mouvement, pas une prescription |
| **Cible d'effort** d'un metcon | **Contexte Cross-training** en V1 (mesure seulement) ; **sémantique générique du CORE** seulement si une cible doit être montrée **et** vérifiée | Le CORE ne lit l'effort ni pour valider ni pour estimer la durée. Le dossier de preuve (S11) déconseille une cible fine. Tant que l'effort est seulement **mesuré** (sRPE), il vit dans le résultat |
| **Type de score** | **Enregistrement de résultat** (contrat de séance réalisée) | Dérivé du format (définitionnel). Aucun rôle en validation, durée ou sécurité. `RESULT_KINDS_BY_FORMAT` (C1) en est la table de cohérence |
| **Performance mesurée** (temps, rounds + reps, calories, distance) | **Enregistrement de résultat** | Jamais dans la prescription. Déjà séparé dans `zRealizedCtSession` (`prescription` ≠ `result`) |
| **Variante prescrite / scaling** | **Catalogue** (familles de progression, substitutions) + **prescription existante** (`exerciseId`, `refs.substitutedFrom`) + **Cross-training** (règles de scaling, CT-D13) | La variante est un mouvement du catalogue. Aucun nouveau champ CORE nécessaire |
| **Variante réellement exécutée** | **Enregistrement d'exécution** | Ce que l'athlète a fait diffère de ce qui était prescrit : c'est un résultat |
| **Débit d'estimation** (reps / cal / m par minute) | **Catalogue** (`workRate`, champ existant) ; **valeurs gouvernées** par CT-D2 (`ct.estimation.workRates`) | Sert **uniquement** au DurationEngine. Ne partage aucun paramètre avec la prescription (`ct.dose.construction`) ni avec le résultat |
| **Répartition EMOM par minute, rotation d'intervalles** | **Sémantique générique du CORE** (structure de bloc) | La durée et la validation en dépendent (ordre, repos). Besoin non prouvé en V1 : option (§4) |

## 4. Options, de la plus petite à la plus grande

### Option 0 — Aucune modification du CORE (recommandée pour C2 à C5)
- **Metcons non chargés** (P9, P10) : représentation existante.
- **Mouvements chargés** (P1) : item `sets`, une série `working`, `reps = N`, `restAfterS = 0`, `intensity = { mode: 'load', kg, certainty: 'prescribed' }`, dans le bloc `amrap` / `for_time` / `emom`.
  - Le CORE l'accepte (aucun contrôle contraire trouvé) et le validateur ne lit pas la charge.
  - **Coûts connus** :
    1. la durée utilise `secondsPerRep` et non `workRate` : les mouvements Cross-training chargés du catalogue ont besoin de `secondsPerRep` gouverné ;
    2. une « série » dans un metcon est une **approximation sémantique** : le rendu et l'exécution doivent la présenter comme une quantité de tour ;
    3. P2 (charge sur distance ou calories) reste **impossible** ⇒ ces mouvements restent exclus.
  - **À vérifier par un test de spike avant adoption** : effets sur les levers de compression, le profil de demande et la migration. Ce test n'a **pas** été fait, car C1 n'en a pas besoin.
- **Effort** (P3) : pas de cible en V1. Le sRPE est **mesuré** dans le résultat (conforme au dossier de preuve, S11).
- **Score** (P4) : contrat de résultat Cross-training (fait en C1).
- **Scaling** (P5, P6) : `exerciseId`, `refs.substitutedFrom`, `alternatives`. Les règles restent au moteur Cross-training (CT-D13).
- **P7, P8** : le moteur Cross-training **refuse** ces structures (formats non admissibles). C'est une limite produit explicite, pas une approximation silencieuse.

### Option 1 — Ajout minimal au CORE : charge optionnelle sur les doses non-séries
- `load?: { kg, certainty }` optionnel sur `reps`, `calories`, `distance`, `timed`.
- Couvre P1 proprement, et P2.
- Additif : les anciennes séances restent valides. Les nouvelles exigent une version de `session_record` (v5) et sa migration.
- Durée inchangée (la charge ne modifie pas l'estimation).
- Bénéficie aussi à HYROX (sled, farmer carry, sandbag lunges).
- **Plus petite modification** qui lève P1 et P2.

### Option 2 — Structure de bloc : EMOM alterné, rotation d'intervalles
- `emom.pattern` (chaque minute / alterné par item) ; bloc `intervals` à stations.
- Touche la durée et la validation.
- À n'ouvrir que si un stimulus décidé (CT-D1) l'exige.

### Option 3 — Type de prescription « metcon » dédié (analogue à `run_structure`)
- Le plus expressif (tours, stations, charges, cibles, time cap).
- Coût maximal : validation, durée, migration, exécution.
- **Non recommandé** tant que les options 0 et 1 n'ont pas montré leurs limites.

### Hors CORE dans tous les cas
- Type de score, performance mesurée, variante exécutée ⇒ enregistrement de résultat.
- Cible d'effort V1 ⇒ mesure seulement.
- Débits ⇒ catalogue gouverné.

## 5. Recommandation

1. **C2 (rejeu non chargé)** : option 0, aucune modification du CORE. Rejeu limité à P9 et P10, mouvements non chargés. Tout le reste est refusé avec une raison.
2. **Avant C6 (charges)**, décision distincte entre :
   - l'option 0 étendue (item `sets` chargé), après le test de spike ;
   - l'option 1 (charge optionnelle sur `reps`, `calories`, `distance`, `timed`).

   L'option 1 est la plus propre si HYROX est confirmé, puisque P2 y est central. **Décision à prendre avec la revue HYROX, pas avant.**
3. Options 2 et 3 : non ouvertes.

## 6. Ce que cette RFC ne fait pas

- Aucune modification de `packages/domain` ni de `packages/engine`. Le test d'architecture `crosstraining-architecture.test.ts` vérifie que le CORE, Running et Strength sont inchangés depuis `1d37a50`.
- Aucune prescription Cross-training n'est rendue possible : C1 refuse toujours (`PRESCRIPTION_NOT_IMPLEMENTED`).
