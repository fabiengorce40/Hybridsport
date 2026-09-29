# CORE : compatibility gate « dimensions optionnelles » du fingerprint

**Statut : pour arbitrage.** Aucune décision d'architecture n'est prise. Aucune modification du CORE, de Running, de Strength, de Cross-training, d'`AppState` ou du registre. Aucune valeur `energy`, aucun stimulus Cross-training, aucun changement de poids ou de seuil, aucune signature G1. **Le verdict n'autorise pas à modifier le CORE.**

Principe évalué : ne pas fabriquer de sémantique (parts d'énergie, stimulus physiologique) uniquement pour satisfaire le fingerprint, quand ces informations ne sont pas connues.

| Élément | État |
|---|---|
| Baseline | `7f54d1f` |
| Spike | `packages/crosstraining/tests/spike/c2-optional-dimensions.test.ts` (6 tests) |
| Vérifications | tests Cross-training 138 ; typecheck, lint propres ; suite complète **1 402** ; architecture 45 ; diff vide sur `packages/domain`, `packages/engine`, `packages/running`, `packages/strength`, `packages/crosstraining/src`, `packages/app-core` |

Légende :
- **STATIC** : lecture du code ;
- **MEASURED** : test exécuté ;
- **CALCULÉ** : recalcul TEST_ONLY à partir du détail produit par le CORE réel, vérifié égal au CORE sur les 435 paires quand rien n'est exclu.

## 1. Cartographie du fingerprint (STATIC)

### 1.1 Chaîne complète

| Étape | Où | Ce qui se passe |
|---|---|---|
| Contrat d'entrée | `domain/src/duplicate.ts` `zFingerprintInputs` | Le moteur fournit `archetypeId`, `stimulus`, `energy` (obligatoires), `volumeByItem`, `prescriptionMarkers` (obligatoires), `format`, `timeDomain`, `repScheme`, `contextKey` (optionnels). Schéma strict |
| Transport | `domain/src/sport-engine.ts` (`fingerprintInputs: z.unknown()`), `engine/src/contracts/sport-engine.ts` `acceptProposal` | Non typé jusqu'au CORE. La **proposition** porte aussi un `stimulus` obligatoire, qui doit être **égal** à celui de l'intention |
| Construction | `engine/src/duplicate/fingerprint.ts` `buildFingerprint` | Valide les entrées. Dérive du catalogue les exercices, familles, équivalences, patterns et muscles primaires (pondérés par `volumeByItem`). La structure vient des blocs et de leur p50 estimé |
| Normalisation | idem | `patterns` et `muscles` divisés par leur somme. `energy` divisée par sa somme, qui doit être > 0 (sinon refus). Tris déterministes |
| Pipeline | `engine/src/api/pipeline.ts` | Empreinte construite après l'ajustement de durée, puis reconstruite après une éventuelle réparation (`restrictVolumes`). Une empreinte invalide rend le candidat non admissible et jamais réparé |
| Comparaison | `engine/src/duplicate/analysis.ts` `similarityBreakdown` | 7 composantes (§1.2) |
| Pondération | `analyzeDuplicates` | `Σ w_c s_c / Σ w_c` sur les composantes **non nulles**. Poids `duplicate.weights[discipline]` |
| Classement | idem | Seuils `duplicate.thresholds` (warn, strong). Intentions déclarées (`intentPolicy.covers`) retirées pour `accidentalSimilarity`. Pénalités SOFT B6 |
| Filtrage de l'historique | idem | Même `discipline`, `sessionId` différent, dans `duplicate.windowDays` |
| Persistance, record | `domain/src/serialization.ts` | `session_record` v2 à v4 : `fingerprint: available(zSessionFingerprint) \| unavailable(migrated_from_v1 \| duplicate_analysis_inactive)` |
| Migration | `engine/src/migration/migrations.ts` | v1 → v2 : empreinte `unavailable`, jamais reconstituée |
| Persistance, application | `app-core/src/model.ts` | `GeneratedSession.outcome.fingerprint: z.unknown()`, non validé. `AppState.fingerprints: { strength, running }` : tableaux `zFingerprintHistoryEntry` **validés au chargement** |
| Historique | `app-core/src/progression.ts` `applyCompletion` | Séance terminée ⇒ l'empreinte de la séance générée devient une entrée d'historique `completed` du sport |

### 1.2 Dimensions

| Dimension | Structurellement obligatoire | Obligatoire seulement par le schéma | Réellement nécessaire à l'algorithme | Déjà excluable (null) |
|---|---|---|---|---|
| `sessionId` | **Oui** : identité, exclusion de l'historique, `deload_mirror`, raisons | — | Filtre, pas une composante | sans objet |
| `discipline` | **Oui** : filtre, poids par discipline | — | Filtre | sans objet |
| `archetypeId` | Non | **Oui** | **Non** : jamais lu par la comparaison | sans objet |
| `stimulus` | Non | **Oui** | Composante `stimulus` (égalité, voisinage du ruleset) | **Non** : jamais null |
| `exercises` / `families` / `equivalences` | Oui (dérivés du CORE) | — | Composante `exercise` | null si ensembles vides, impossible avec ≥ 1 item |
| `patterns` / `muscles` | Oui (dérivés) | — | `movement`, `muscle` | null si vecteur nul, possible seulement si tous les volumes valent 0 |
| `structure` | Oui (dérivée) | — | `structure` | null si aucun bloc, impossible |
| `energy` | Non | **Oui** (et somme > 0) | Composante `energy` | **Non** : jamais null |
| `format` / `timeDomain` / `repScheme` | Non | Non (optionnels) | Composante `format` | **Oui** : null si absents des deux côtés |
| `prescriptionMarkers` | Non | Oui (peut être vide) | Stagnation d'une répétition prévue | sans objet |
| `contextKey` | Non | Non | Informatif (`sameContext`) | sans objet |

**Le moteur de calcul supporte déjà des composantes nulles** : `SimilarityBreakdown` est typé `number | null`, et le dénominateur exclut les composantes nulles. `energy` et `stimulus` sont les deux seules composantes que le **schéma** et la **formule** rendent toujours non nulles.

### 1.3 Précédent existant : `format` (MEASURED)

| Paire | Composante `format` |
|---|---|
| absent ↔ absent | **null**, exclue du dénominateur |
| connu ↔ absent | **0**, comptée comme une différence |
| connu ↔ connu, identique | 1 |

Le CORE a donc déjà **une** sémantique pour « absent » : ne jamais la considérer comme une égalité, mais traiter « connu ↔ absent » comme un désaccord.

## 2. Strength et Running (STATIC)

| | Strength | Running |
|---|---|---|
| Origine de `energy` | Paramètre G2 `strength.stimuli[stimulus].energy`, **obligatoire** dans le schéma du paramètre | `energyOf(candidate, estimate)` : parts de temps de la structure par domaine d'intensité (dérivation écrite, toujours définie) |
| Toujours présente ? | **Oui**, grâce à la garde `unknown_stimulus` : pas de proposition si le stimulus manque dans le paramètre. Le code émet `stim?.energy`, et l'obligation du CORE est une **seconde barrière** si cette garde disparaissait | **Oui**, toujours |
| Origine de `stimulus` | `intent.stimulus` (planificateur) | `intent.stimulus` ; dans l'application, **constant** : `stim.running.aerobic` pour toutes les séances de course |
| Dépend de l'obligation du CORE ? | Pour son comportement nominal, non. Pour sa défense en profondeur, **oui** (sinon, un stimulus mal configuré produirait une empreinte sans énergie au lieu d'un refus technique) | Non |
| Autre lecture du fingerprint | `history[].fingerprint.families` (B6 variété, récence) ; ni `energy` ni `stimulus` | Aucune |
| Effet d'une optionalité CORE s'ils continuent de fournir les champs | **Aucun** : connu ↔ connu donne exactement la même formule (§3). Empreintes, classes et pénalités identiques | Aucun |
| Empreintes historiques | Restent valides (elles portent les champs) | idem |
| Sérialisation / `AppState` | Les données existantes restent lisibles par un schéma élargi. Une donnée **nouvelle** sans ces champs serait refusée par un lecteur ancien, ce qui exige une nouvelle version de format (doctrine de `serialization.ts`) | idem |

Constat voisin : en production, Running a déjà un `stimulus` **constant** (composante toujours à 1 entre séances de course). Ce gate ne le traite pas ; il le signale seulement.

## 3. Modèles possibles (analyse, aucun choix)

| | A — champs optionnels | B — état explicite (`known(...) \| not_applicable`) | C — masque de comparabilité | D — dimensions déclarées par le moteur |
|---|---|---|---|---|
| Principe | `energy?` et `stimulus?` absents ⇒ composante exclue | L'absence est une valeur explicite et justifiée | Structure inchangée ; le fingerprint porte la liste des dimensions comparables | Le CORE compare ; chaque moteur déclare les dimensions qui le concernent |
| Distinction « oublié » / « non applicable » | **Non** (le risque Strength ci-dessus devient silencieux) | **Oui** | Oui, mais la valeur factice reste stockée | Oui, au niveau du moteur |
| Stocke une valeur inventée ? | Non | Non | **Oui** (la constante subsiste dans l'empreinte) | Dépend de la variante |
| Changement de schéma | Élargissement local (`zFingerprintInputs`, `zSessionFingerprint`) | Nouvelle forme des deux champs | Champ `comparable` ajouté | Contrat moteur ↔ CORE ; similarité paramétrée par moteur |
| Changement de calcul | `similarityBreakdown` : null si absent | idem, par variante d'état | Mise à null selon le masque | Refonte du calcul par déclaration |
| Ampleur | **Locale** | Locale à modérée | Locale, mais conserve la fabrication | **Refonte** |

## 4. Spike : exclusion simulée (CALCULÉ à partir du CORE réel)

Matrice : 10 mouvements non chargés × 3 durées (TEST_ONLY), `continuous → timed → 1 mouvement`, stimulus et énergie **communs** TEST_ONLY, `format` absent, poids et seuils du ruleset de TEST **inchangés**. 435 paires.

### 4.1 Classes par scénario

| Scénario | none | warn | strong | Changements vs actuel |
|---|---|---|---|---|
| 1. actuel (constantes communes) | 387 | 11 | 37 | — |
| 2. `energy` exclue | 387 | 12 | 36 | **1** (strong → warn) |
| 3. `stimulus` exclu | 387 | 18 | 30 | **7** (strong → warn) |
| 4. `energy` + `stimulus` exclus | 387 | 18 | 30 | **7** (strong → warn) |

Tous les changements concernent des **variantes de même famille** (pompe / pompe inclinée, traction assistée / traction) et vont de strong vers warn. **Aucune** paire sans lien ne change de classe.

### 4.2 Plages de similarité par catégorie

| Catégorie (paires) | actuel | `energy` exclue | `stimulus` exclu | les deux exclus |
|---|---|---|---|---|
| sans lien (387) | 0,306 – 0,500 | 0,265 – 0,471 | 0,167 – 0,400 | 0,107 – 0,357 |
| même famille (18) | 0,839 – 0,866 | 0,830 – 0,859 | 0,807 – 0,840 | 0,793 – 0,828 |
| même mouvement, durées différentes (30) | 0,973 – 0,983 | 0,971 – 0,982 | 0,967 – 0,979 | 0,965 – 0,978 |
| séance identique, nouvel id | 1 (strong) | 1 (strong) | 1 (strong) | 1 (strong) |

### 4.3 Les deux propriétés

| Propriété | Résultat |
|---|---|
| « Deux séances identiques sur toutes les dimensions connues restent fortement similaires même sans `energy` ni `stimulus`. » | **Vérifiée** : similarité 1, `accidental_strong`, dans les 4 scénarios. Même mouvement à durée différente : `accidental_strong` partout |
| « L'absence de dimensions inconnues ne crée pas de similarité positive artificielle. » | **Vérifiée** : pour chacune des 435 paires, exclure ne **l'augmente jamais**. Une paire sans aucune dimension connue commune (squat / pompe) ne garde que la structure : 0,1 × s / 0,7, classe `none`. À l'inverse, les **constantes actuelles** ajoutent jusqu'à 0,5 − 0,357 = 0,143 de similarité aux paires sans lien |

## 5. Compatibilité historique (analyse)

| Paire | Ce qui se passerait | Sémantique la plus cohérente (non décidée) |
|---|---|---|
| **known ↔ known** (Strength, Running, futur Cross-training réel) | Formule inchangée | Identique à aujourd'hui |
| **absent ↔ absent** (bootstrap ↔ bootstrap) | Composante exclue | **Non comparable**, jamais une égalité (conforme au précédent `format`) |
| **known ↔ absent** (futur Cross-training réel ↔ bootstrap) | À définir | Deux options : **non comparable** (null), cohérent avec « l'absence n'apporte ni ressemblance ni différence » ; ou **désaccord** (0), cohérent avec le précédent `format` mais qui pénalise l'absence comme si elle était une différence connue. À arbitrer |

Autres constats :
- La comparaison ne franchit jamais la frontière entre disciplines : un historique Strength ou Running n'est jamais comparé à une empreinte Cross-training.
- Si les poids et seuils sont calibrés en supposant `energy` et `stimulus` présents, l'exclusion renormalise le dénominateur et redistribue implicitement leur poids sur les autres composantes (§4.1 : 7 variantes passent de strong à warn).

## 6. Migration (analyse, aucune migration codée)

| | A | B | C | D |
|---|---|---|---|---|
| Schéma | `zFingerprintInputs` et `zSessionFingerprint` : deux champs optionnels | Deux champs à état | Champ de masque | Contrat moteur et similarité |
| Migration des données | **Non** : l'existant reste valide | **Oui** (réécrire les valeurs en `known(...)`), ou accepter les deux formes | Non, si le masque est optionnel et vaut « tout » par défaut | Selon la variante |
| Rétrocompatibilité en lecture de l'ancien | Oui | Non sans migration | Oui | Incertaine |
| Nouveau format lisible par un ancien lecteur | Non : nouvelle version `session_record` requise (doctrine) | Non | Non | Non |
| Strength | Aucun effet ; perte de la seconde barrière (§2) | Doit émettre `known(...)` | Aucun | Doit déclarer ses dimensions |
| Running | Aucun | Doit émettre `known(...)` | Aucun | idem |
| HYROX futur | Peut omettre ce qu'il ignore | Doit qualifier chaque absence | idem C | Déclare ses dimensions |
| `AppState` | Aucun changement de forme ; la validation au chargement accepte l'ancien. Un emplacement Cross-training reste à créer (décision séparée) | Migration `AppState` si les valeurs sont réécrites | Aucun | Selon la variante |
| Tests | Tests CORE du fingerprint et de la similarité ; tests de sérialisation et de migration | + migration | + masque | Refonte |
| Risque architectural | **Faible** ; ambiguïté « oublié » / « non applicable » | Faible à modéré ; plus explicite | Conserve une valeur inventée dans l'empreinte, ce qui contredit le principe évalué | **Élevé** |

## 7. Gouvernance

| Élément | Relève de | Ce qu'une optionalité **n'approuve pas** |
|---|---|---|
| Existence et forme des dimensions (optionnelles ou non, sémantique de l'absence) | **Contrat CORE** (G4, ingénierie) et décision d'architecture | — |
| Poids `duplicate.weights.crosstraining` | **Ruleset** (G2) | Aucun poids Cross-training ; les poids de TEST restent des fixtures |
| Seuils `duplicate.thresholds` | **Ruleset** (G2 ; aujourd'hui communs à toutes les disciplines) | Aucun seuil Cross-training ; §4.1 montre que les seuils de TEST classent différemment selon les dimensions présentes |
| Omettre une dimension pour une séance donnée | **Moteur sportif** (bootstrap : moteur Cross-training) | Aucune valeur d'énergie ou de stimulus |
| Qu'une séance de bootstrap omette `energy` et `stimulus`, et pourquoi | **Gouvernance Cross-training** (décision tracée) | Ni CT-D1, ni les politiques G1 |
| `stimulus` de l'**intention** et de la proposition | **Contrat planificateur** (CORE) : reste obligatoire, identifiant technique | Rendre le fingerprint optionnel ne retire pas le stimulus d'intention ; ce serait une refonte du contrat planificateur |

## 8. Verdict

**OPTIONAL DIMENSIONS CORE-COMPATIBLE**

Justification :
1. L'algorithme **ne dépend pas intrinsèquement** de `energy` ni de `stimulus`. Il gère déjà des composantes nulles (dénominateur renormalisé) ; seuls le schéma et la formule de ces deux composantes les rendent toujours présentes.
2. Une évolution **locale** du contrat de type A ou B (schéma de deux champs, calcul null si absent, nouvelle version de format pour les nouvelles données) laisse **inchangée** la sémantique Strength et Running tant qu'ils continuent de fournir ces champs : connu ↔ connu donne exactement la même formule.
3. Mesuré : les deux propriétés sont vérifiées, et l'exclusion ne crée aucune similarité artificielle. Elle supprime au contraire celle que les constantes introduisent.

Conditions et réserves, **à arbitrer** :
- la sémantique **known ↔ absent** (null ou 0 ; le précédent `format` donne 0) ;
- la distinction « oublié » / « non applicable » : le modèle A perd la seconde barrière de Strength, le modèle B la conserve ;
- les **poids et seuils** Cross-training : l'exclusion fait passer 7 variantes de même famille de strong à warn sous les seuils de TEST ;
- le `stimulus` d'**intention** reste obligatoire (contrat planificateur) : l'optionalité ne vaut que pour le fingerprint ;
- tout changement exige une nouvelle version de `session_record` et les tests CORE associés ;
- le test d'architecture Cross-training suppose le CORE inchangé depuis `1d37a50`.

Ce verdict **n'autorise pas** une modification du CORE.

**STOP.**
