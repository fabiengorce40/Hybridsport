# Global Planner V1 et frontière de charge

Baseline : `080ae34`.

## A. Frontière de sécurité CORE : aucun transfert de charge

- **Chemin unique de substitution** : la validation produit `replace_exercise` (matériel, statut, restriction, douleur), puis `applyActions` dans `engine/src/repair/repair.ts` remplace l'`exerciseId` d'un item en gardant sa prescription.
- **Prescriptions considérées comme chargées** (`carriesMovementLoad`) :
  - hors séries : `reps`, `distance`, `calories` ou `timed` avec `load` ;
  - en séries (`sets`), selon le mode d'intensité : `load`, `percent_of_reference`, `effort` avec charge indicative, `bodyweight` avec charge ajoutée, ou `relative_to_working`.
- **Non chargées** : RIR ou effort pur, `hold`, `mobility`, `intervals`, `run_structure`.
- **Règle appliquée** : il n'existe aucune règle gouvernée de conversion de charge. La substitution d'un item chargé est donc refusée et tracée par `REPAIR.LOAD_TRANSFER_REFUSED` (item, mouvement, substitut). La violation subsiste : l'issue est un refus explicite, ou un repos recommandé si la cause est une douleur. On ne retire jamais un item en compensation.
- **Effets** :
  - aucun coefficient ni table d'équivalence ;
  - substitution historique inchangée pour les items non chargés ;
  - instantané applicatif Strength/Running identique avant/après.
- **Limite connue** : la réparation transfère toujours une allure (`paceSecPerKm`) vers un substitut. Ce n'est pas une charge et le cas n'est pas traité dans ce lot.

## B. Global Planner V1 (`@hybridsport/planner`)

### Existant avant ce lot

| Élément | Constat |
|---|---|
| `app-core/planner.ts` (V0) | Strength et Running seulement. Une séance par jour (P3). Priorité déclarée par l'utilisateur, appliquée en tour de rôle. Jours consécutifs signalés sans blocage |
| Running | Refuse `hybrid` tant que la capacité `hybridPlanning` est inactive (dépendance technique `GLOBAL_PLANNER_INTEGRATION`) |
| Cross-training C2 | Refusait tout athlète `hybrid` de façon inconditionnelle |
| HYROX H1 | Refusait tout athlète `hybrid` de façon inconditionnelle |
| Strength | Lit `week.neighbors` (profils de demande par structure). Aucun moteur ne fournit ces profils : `week.known = false`, hypothèse prudente |
| CORE | Fournit `deriveExerciseStructures` (table gouvernée `demand.derivationTable`). Le contrôle A3 `recovery.minGapMatrix` exige des niveaux de demande, donc des doses fournies par le moteur |

### Responsabilités

- **Le planificateur décide** :
  - le sport, le jour et l'ordre ;
  - la disponibilité ;
  - l'interférence entre disciplines ;
  - le moteur à appeler ;
  - le caractère multisport transmis aux moteurs.
- **Le planificateur ne transmet** que le créneau : `requestId`, `date`, `availableMinutes`, `hybrid`, `seed`.
- **Le contexte sportif est déclaré par l'appelant**, dans le port :
  - historique, références ;
  - intention de programme : archétype, stimulus, station HYROX.
- **Les moteurs restent auteurs** du contenu : exercices, allures, mouvements, stations, charges, doses, progression.

### Station HYROX

- Le choix de la station est une décision de contenu sans règle gouvernée.
- Elle n'appartient donc ni au planificateur ni au moteur.
- C'est une **intention utilisateur ou programme**, transmise telle quelle.
- `requestedStation` devient facultatif. Absent, le moteur refuse avec `STATION_NOT_REQUESTED`.

### Filtres

| Filtre | Effet |
|---|---|
| G1 | Port de moteur présent, sinon `ENGINE_UNAVAILABLE` |
| G2 | Jour disponible |
| G3 | Une séance par jour (contrat V0) |
| G4 | Interférence inter-disciplines (voir ci-dessous) |
| G5 | Un refus du moteur est conservé tel quel. Aucun autre sport, aucune autre dose sur ce créneau |

**Détail de G4 :**
- Deux séances de disciplines différentes qui sollicitent la même structure doivent être séparées d'au moins `planner.interference.structureWindows[structure]` heures. Ce paramètre est G2, gouverné.
- Les structures sont dérivées de la séance réellement générée, hors échauffement et retour au calme.
- Les séances antérieures à la semaine (`recent`) sont prises en compte.
- Fail-closed : un paramètre absent, une structure non listée ou des structures non dérivables comptent comme un conflit.

**Ordre de départage**, identique à V0 :
1. priorité déclarée, appliquée en tour de rôle ;
2. jour le plus éloigné des séances déjà placées ;
3. jour le plus tôt.

### Multisport par moteur

Chaque moteur reste maître de sa propre décision multisport :

| Moteur | Condition pour accepter un athlète multisport |
|---|---|
| Running | Capacité `hybridPlanning` active (inchangé) |
| Cross-training C2 | Capacité gouvernée `ctHybridPlanning` active : `ct.hybrid.policy` et dépendance `GLOBAL_PLANNER` |
| HYROX H1 | Paramètre G1 `hybrid_race.h1.hybridPlanning = true` |

### Résultat

- **Par jour** : `planned` ou `empty`, avec une raison (`UNAVAILABLE` ou `NO_SESSION_PLACED`).
- **Par demande** :
  - `planned` : séance exacte du moteur et empreinte, persistable en `session_record` v6 ;
  - `refused` : raisons du moteur ;
  - `unplaced` : `ENGINE_UNAVAILABLE`, `NOT_ENOUGH_DAYS` ou `INTERFERENCE_UNRESOLVED`.
- **Conflits tracés** : X, Y, structure, écart et règle.
- Une semaine partielle est représentée telle quelle.

### Frontière avec app-core (non raccordé)

- app-core ne dépend pas de Cross-training (règle d'architecture). Le raccorder au planificateur le ferait dépendre, transitivement, de Cross-training et de HYROX, et remplacerait le planificateur V0 des profils mono-sport.
- Pour passer de « profil » à « planning » puis à « séances persistables », il reste à :
  1. décider l'autorisation de cette dépendance ;
  2. construire les ports depuis `AppState` (contextes Strength/Running de `generate.ts`, historique Cross-training) ;
  3. étendre `zPlanEntry` et `zGeneratedSession` aux sports `crosstraining` et `hyrox`.
- Les séances du planificateur sont déjà persistables en `session_record` v6 (testé).

### Fail-closed (production)

- Gouvernance du planificateur : aucun ruleset ni écart approuvé. Tout recouvrement entre disciplines est un conflit.
- Running : `GLOBAL_PLANNER_INTEGRATION` reste `UNSATISFIED` dans l'état réel. Le passer à `SATISFIED` est une décision.
- Cross-training : `ct.hybrid.policy` n'est pas résolu, CT-D11 est en attente et `GLOBAL_PLANNER` est `UNSATISFIED`.
- HYROX : `hybrid_race.h1.hybridPlanning` est absent.
- Strength : `week.known = false` en multisport. Aucun moteur ne fournit de profil de demande pour remplir `neighbors`.
- Non gouverné dans le planificateur :
  - espacement entre séances d'une même discipline (laissé aux moteurs) ;
  - doubles séances ;
  - composition hebdomadaire Running (rôles KEY/LONG/TEST) ;
  - périodisation.
