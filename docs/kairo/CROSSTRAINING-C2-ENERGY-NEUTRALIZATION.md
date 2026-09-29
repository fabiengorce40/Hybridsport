# Cross-training C2 : neutralisation de la composante `energy` du bootstrap (spike)

**Statut : pour arbitrage.** Ce document n'approuve **aucune** valeur d'énergie, ne prend aucune décision CT-D, ne signe aucune politique G1 et ne modifie ni le CORE, ni Running, ni Strength, ni `crosstraining/src`, ni le registre, ni `AppState`. Toute valeur utilisée est **TEST_ONLY**.

Question : si toutes les séances de bootstrap C2 (`continuous → timed → 1 mouvement`) portent la **même** signature `energy`, cette dimension est-elle neutralisée proprement, ou l'anti-doublon Cross-training devient-il trompeur ?

| Élément | État |
|---|---|
| Baseline | `d4e4c2b` |
| Spike | `packages/crosstraining/tests/spike/c2-energy-neutralization.test.ts` (10 tests, assertions figées sur les valeurs mesurées) |
| Pipeline | `runSportSession` réel ; ruleset de TEST avec `duplicate.*` ; catalogue de TEST ; profil de test au matériel élargi (TEST_ONLY) pour qu'aucune séance ne soit réparée ; chaque comparaison vérifie que la séance renvoyée porte le mouvement et la durée proposés |
| Vérifications | tests Cross-training 132 ; typecheck, lint propres ; suite complète **1 396** ; tests d'architecture 45 ; diff vide sur `packages/domain`, `packages/engine`, `packages/running`, `packages/strength`, `packages/crosstraining/src`, `packages/app-core` |

**Réserve majeure.** Les classifications mesurées dépendent des **poids et seuils du ruleset de TEST** : `duplicate.weights` (exercise 0,3 ; movement 0,15 ; muscle 0,15 ; structure 0,1 ; stimulus 0,15 ; energy 0,05 ; format 0,1) et `duplicate.thresholds` (warn 0,6 ; strong 0,85). Aucun poids anti-doublon n'est gouverné pour le Cross-training.

## 1. Algorithme réel (STATIC CODE FINDING, confirmé par MEASURED)

### 1.1 Empreinte (`engine/src/duplicate/fingerprint.ts`, `domain/src/duplicate.ts`)

| Champ | Origine | Participe à la similarité ? |
|---|---|---|
| `sessionId` | séance | **Non** ; sert à exclure l'historique de même id |
| `discipline` | séance | Filtre : seules les séances de même discipline sont comparées |
| `archetypeId` | moteur | Non |
| `stimulus` | moteur | Oui (`stimulus`) |
| `exercises`, `families`, `equivalences` | CORE, depuis le catalogue | Oui (`exercise`) |
| `patterns` (pattern primaire × volume, normalisé) | CORE | Oui (`movement`) |
| `muscles` (muscles primaires × volume, normalisé) | CORE | Oui (`muscle`) |
| `structure` (`kind`, `format`, `durationS` = p50 **estimé** du bloc) | CORE | Oui (`structure`) |
| `energy` (parts divisées par leur somme) | moteur | Oui (`energy`) |
| `format`, `timeDomain`, `repScheme` (optionnels) | moteur | Oui (`format`) ; **null si absents des deux côtés** |
| `prescriptionMarkers` | moteur | Non (stagnation d'une répétition prévue seulement) |
| `contextKey` | moteur | Non (informatif) |

### 1.2 Composantes et calcul (`engine/src/duplicate/analysis.ts`)

| Composante | Formule | Peut être null ? |
|---|---|---|
| `exercise` | max(poids de niveau × Jaccard) sur exercices, équivalences, familles | si aucun élément |
| `movement` | cosinus des patterns | si vecteur nul |
| `muscle` | cosinus des muscles | si vecteur nul |
| `structure` | moyenne par bloc de [même `kind`, même `format`, ratio min/max des durées] | si aucun bloc |
| `stimulus` | 1 si égal, sinon voisinage du ruleset, sinon 0 | **jamais** |
| `energy` | 1 − ½ Σ \|Δpart\| (distance de variation totale) | **jamais** : le schéma exige `energy` |
| `format` | moyenne des indicateurs d'égalité des champs présents | si aucun champ présent |

Calcul de la classe :
- `similarity = Σ w_c · s_c / Σ w_c`, sur les composantes **non nulles** ;
- `accidentalSimilarity` : même calcul, hors composantes couvertes par une intention déclarée ;
- `≥ strong` ⇒ `accidental_strong` ; `≥ warn` ⇒ `accidental_warn` ; sinon `planned` si une intention correspond, sinon `none` ;
- pénalité SOFT (B6), jamais une exclusion.

Filtres préalables : même discipline, `sessionId` différent, dans la fenêtre `duplicate.windowDays`.

**Conséquence algébrique** (S = Σ w_c s_c et W = Σ w_c sur les autres composantes non nulles) :

| Scénario | Similarité |
|---|---|
| Énergie **commune** | (S + w_e) / (W + w_e) |
| Énergie **variable** (e = similarité d'énergie) | (S + w_e · e) / (W + w_e) |
| Énergie **exclue** (impossible dans le CORE actuel) | S / W |

Écart commun − variable = w_e (1 − e) / (W + w_e) ≤ w_e / (W + w_e). Avec les poids de TEST et `format` absent, cette borne vaut **0,05 / 0,9 = 0,0556**.

### 1.3 Identité et similarité

Le CORE n'a **aucune notion d'identité d'empreinte**. Deux empreintes identiques sauf `sessionId` ont une similarité de 1. Seul `sessionId` identique **retire** une entrée de la comparaison, quel que soit son contenu.

## 2. Matrice (MEASURED)

Corridor imité : `continuous`, un item `timed`, un mouvement non chargé, stimulus et archétype **communs** TEST_ONLY, énergie commune TEST_ONLY `{0,2 ; 0,3 ; 0,5}`, `format` non déclaré (composante null).

| # | Paire | Similarité | Classe | Détail |
|---|---|---|---|---|
| N1 | même séance, nouvel id | **1** | `accidental_strong` | toutes les composantes à 1 |
| N2 | air squat / fente arrière | 0,5 | `none` | exercise 0, movement 0, muscle 1, structure 1, stimulus 1, energy 1 |
| N2 | air squat / pompe | 0,3333 | `none` | seules structure, stimulus et energy à 1 |
| N2 | rameur / SkiErg | 0,4161 | `none` | muscle 0,5 |
| N2 | air squat / box jump | 0,4688 | `none` | muscle 2/√6 |
| N2 | pompe / pompe inclinée (même famille) | 0,8661 | `accidental_strong` | exercise 0,6 (famille), movement 1, muscle 1 |
| N3 | même mouvement, durée ½ ou ×2 | 0,9819 / 0,9817 | `accidental_strong` | seule la structure baisse |
| N4 | squat court / fente longue | 0,4726 | `none` | — |
| N4 | pompe / pompe inclinée, durée ½ | 0,8492 | `accidental_warn` | juste sous le seuil strong |
| N5 | seule l'énergie diffère, vecteurs orthogonaux | 0,9444 = 1 − 0,0556 | `accidental_strong` | energy 0 |
| N5 | seule l'énergie diffère, énergie 0,3 | 0,9611 | `accidental_strong` | — |

Pour chaque paire, la similarité recalculée à partir du détail et des poids de TEST est égale à celle du CORE (précision 10⁻¹²).

### N6 : énergie commune (A) vs énergies variables (B)

30 séances (10 mouvements non chargés × 3 durées), 435 paires. En B, les vecteurs TEST_ONLY sont attribués en rotation.

| Transition B → A | Paires |
|---|---|
| none → none | 387 |
| warn → warn | 11 |
| strong → strong | 31 |
| **warn → strong** | **6** |
| none → warn ou strong | **0** |
| tout passage vers une classe inférieure | **0** (A ≥ B pour chaque paire) |

- Écart maximal A − B : **0,0556** (= w_e / Σw, énergie B orthogonale).
- **Les 6 changements** : `push_up` / `incline_push_up` et `band_assisted_pull_up` / `pull_up`, aux trois durées. Ce sont des variantes de **même famille** : même pattern, mêmes muscles.
- **Contrefactuel « énergie exclue »** : calculé à partir du détail, ce n'est pas un comportement du CORE. Une paire (`band_assisted_pull_up@300` / `pull_up@600`) est `accidental_strong` avec l'énergie commune et serait `accidental_warn` si la composante était exclue.

### §3 Choix du vecteur commun

Pour 6 vecteurs TEST_ONLY (trois purs, un mixte, {1,1,1}, {2,2,2}), les similarités de trois paires sont **identiques bit à bit**. {1,1,1} et {2,2,2} se normalisent au même vecteur (énergie = 1).

**Si toutes les séances portent exactement le même vecteur, le choix de ce vecteur ne modifie pas la similarité entre elles.** Ce résultat ne dit rien de la physiologie.

### §4 Frontières de classification

- **Énergie commune ⇒ « none » vers doublon** : aucun cas sur les 435 paires (0 transition none → warn ou strong). La plus forte similarité mesurée entre séances sans lien (N2, N4) est de 0,5. STATIC : la formule donne au moins (0,63 + 0,1 · structure) / 0,9 pour une variante de même famille avec ces poids ; aucune paire de la matrice n'est proche du seuil warn.
- **Énergie commune ⇒ warn vers strong** : 6 cas, uniquement des variantes de même famille.
- **Énergie variable ⇒ classe inférieure** : c'est la lecture inverse des mêmes 6 cas.
- **Score changé sans changement de classe** : 429 paires sur 435.
- **Constante vs exclusion** : la constante **gonfle** toujours la similarité, de (W − S) · w_e / (W (W + w_e)). Elle n'est donc pas neutre au sens « composante absente ». Le franchissement mesuré est warn → strong (1 paire).

**Faux rapprochement structurel ?** Aucune paire **sans lien structurel** n'est devenue un doublon. Les rapprochements renforcés concernent des séances **structurellement proches** (même famille). La signature commune les fait passer de `warn` à `strong` en supposant, sans le savoir, que leur énergie est identique.

**Constat voisin.** Le `stimulus` est lui aussi **commun** à toutes les séances de bootstrap (découplage de toute taxonomie). Avec un poids de 0,15, il pèse trois fois plus que l'énergie dans le socle de similarité de deux séances sans lien : 0,333 minimum mesuré (N2).

## 3. SessionId (MEASURED, logique inchangée)

- **Même `sessionId`** : l'entrée est **toujours** exclue, même si le contenu est totalement différent (autre mouvement, autre durée, autre énergie). Classe `none`, aucune comparaison, pénalité 0.
- **Même `sessionId` + une autre séance** : seule l'autre est comparée.
- **Nouvel `sessionId`** : comparaison normale (`accidental_strong` pour un contenu identique).
- **Hors de la fenêtre `duplicate.windowDays`** : non comparé.

## 4. Verdict

**ENERGY NEUTRALIZATION AFFECTS DUPLICATE CLASSIFICATION**

Justification factuelle :
1. La signature commune **change la classe** de 6 paires sur 435 (warn → strong) par rapport à des énergies différenciées, et d'1 paire par rapport à une composante exclue.
2. L'effet est **borné et prévisible** : écart ≤ w_e / Σw (0,0556 avec les poids de TEST). Il est toujours dans le sens « plus similaire » et, dans la matrice, limité à la frontière warn / strong entre variantes de même famille.
3. Les autres dimensions **suffisent** à séparer les séances sans lien (`none`) des répétitions (`strong`). Mais la neutralisation n'est **pas** une exclusion : c'est une hypothèse implicite « énergie identique ».
4. Le choix **du** vecteur commun est sans effet entre séances qui le partagent tous.

Ce verdict n'approuve aucune valeur. Il n'exclut pas non plus une neutralisation : il établit qu'elle **n'est pas sans effet** sur la classification. Il faut donc la **décider en connaissance de cause** (poids anti-doublon Cross-training, seuils, forme de la neutralisation), non la présenter comme neutre.

## 5. Question architecturale (analyse seulement)

| Emplacement | Analyse |
|---|---|
| **CORE** | Seul lieu où une **vraie** neutralisation (exclusion) est possible : la composante `energy` deviendrait null, comme `format`. Cela demanderait d'autoriser l'absence d'`energy` dans `zFingerprintInputs`, donc une modification de contrat de domaine commune aux quatre moteurs. Hors périmètre ; ce serait une décision CORE distincte |
| **Moteur Cross-training** | Émetteur de `fingerprintInputs` : c'est lui qui transmet la valeur au CORE. Il ne doit pas la **définir** en dur (le test d'architecture interdit les littéraux non justifiés dans `crosstraining/src`) |
| **Configuration bootstrap gouvernée** | Lieu naturel de la **valeur**. Elle influence la classification anti-doublon : c'est une donnée gouvernée et tracée, pas une constante technique anodine |
| **Adaptateur d'empreinte** (fonction dédiée du moteur Cross-training) | Lieu naturel de la **règle** « séance de bootstrap ⇒ neutralisation » : il isole la décision, rend la provenance explicite et prépare le passage à de vraies parts (C3 et au-delà) sans toucher au reste du moteur |
| **Autre : historique réalisé** | L'empreinte stockée **ne porte aucune provenance** de l'énergie (STATIC). Un rejeu reprendrait le vecteur commun tel quel (Decision Gate J-E1). Si des parts « réelles » apparaissent plus tard, la comparaison entre une empreinte neutralisée et une empreinte réelle produirait une similarité d'énergie **sans signification**. La provenance devrait être conservée hors de l'empreinte (séance réalisée Cross-training) ou par une convention explicite |

**Nommage.** La donnée ne devrait **pas** s'appeler « energy share » ni être présentée comme une estimation. Elle devrait être nommée comme une **neutralisation technique** (par exemple « signature énergie de neutralisation du bootstrap »), avec une raison de trace ou une marque de provenance dédiée. Sans cela, une lecture ultérieure de l'historique pourrait la prendre pour une intensité prévue et la réutiliser comme telle.

## 6. Décisions qui restent à arbitrer (aucune prise ici)

1. Accepter ou non une neutralisation **par constante**, sachant qu'elle rend les variantes de même famille plus souvent `accidental_strong` (§4). Ou demander une neutralisation **par exclusion** (décision CORE distincte).
2. **Poids et seuils anti-doublon pour le Cross-training** (`duplicate.weights.crosstraining`, `duplicate.thresholds`) : non gouvernés. Toute conclusion chiffrée ci-dessus en dépend.
3. **Stimulus commun du bootstrap** : même question que l'énergie (poids 0,15, trois fois celui de l'énergie).
4. **Provenance** de la neutralisation dans l'historique, et règle de comparaison future entre empreintes neutralisées et empreintes à parts réelles.
5. **Nom** et emplacement de la donnée (§5).

**STOP.**
