# Cross-training : gate de gouvernance anti-doublon

**Statut : pour arbitrage.** Aucune valeur numérique n'est choisie ni approuvée. Aucune modification du CORE, de Running, de Strength, de Cross-training, d'`AppState` ou du registre. Aucun C2, aucune signature G1. Les poids et seuils du ruleset de test ne deviennent **pas** des valeurs Cross-training.

Décisions validées appliquées ici (non rouvertes) :
- empreinte au **modèle B** : `known(value)` | `not_applicable`, sans confusion avec une absence accidentelle ;
- known ↔ known : comparaison normale ;
- not_applicable ↔ not_applicable et known ↔ not_applicable : non comparable (null), exclu du dénominateur ;
- corridor bootstrap : `firstExposure → continuous → timed → 1 mouvement (allowlist) → durée fixe par mouvement`.

| Élément | État |
|---|---|
| Baseline | `89afbbf` |
| Spike | `packages/crosstraining/tests/spike/c2-anti-duplicate-sensitivity.test.ts` (3 tests) |
| Vérifications | tests Cross-training 141 ; typecheck, lint propres ; suite complète **1 405** ; architecture 45 ; diff vide sur `packages/domain`, `packages/engine`, `packages/running`, `packages/strength`, `packages/crosstraining/src`, `packages/app-core` |

Niveaux : **STATIC** (lecture du code ou des specs), **MEASURED** (test exécuté), **CALCULÉ** (recalcul TEST_ONLY à partir du détail du CORE réel, vérifié égal au CORE quand rien n'est exclu).

## 1. Paramètres anti-doublon (STATIC)

Nature de chaque valeur :
- **FIXTURE** : fixture de test du CORE (`engine/tests/fixtures/ruleset.ts`, `duplicateTestParameters`), statut `draft`, `provisional`, source `internal_hypothesis`, classe G2 ;
- **CONST** : constante technique du code ;
- **HIST** : valeur historique, non utilisée.

| Paramètre / règle | Emplacement | Portée | Valeur actuelle | Nature | Gouvernance | Consommateurs |
|---|---|---|---|---|---|---|
| `duplicate.windowDays` | ruleset ; `analysis.ts` | **globale** (tous sports) | 28 j | FIXTURE | G2, facultatif dans `CORE_PARAMETERS` | Strength, Running (application) |
| `duplicate.weights` | ruleset | **par discipline** (table) | identiques pour les 4 disciplines : exercise 0,3 ; movement 0,15 ; muscle 0,15 ; structure 0,1 ; stimulus 0,15 ; energy 0,05 ; format 0,1 | FIXTURE | G2 | idem |
| `duplicate.thresholds` | ruleset | **globale** | warn 0,6 ; strong 0,85 | FIXTURE | G2 | idem |
| `duplicate.exerciseLevelWeights` | ruleset | globale | exercice 1 ; équivalence 0,8 ; famille 0,6 | FIXTURE | G2 | idem |
| `duplicate.stimulusNeighbors` | ruleset | globale | une paire Strength (0,5) | FIXTURE | G2 | idem |
| `duplicate.intentPolicy` | ruleset | globale | composantes couvertes et exigence d'évolution par intention | FIXTURE | G2 | idem |
| `duplicate.penalties` | ruleset | globale | warn 0,2 ; strong 0,6 (none et planned = 0 en dur) | FIXTURE + CONST | G2 | idem |
| `core.optimization.epsilon` | ruleset | globale | B1–B5 0,05 ; **B6 0** | FIXTURE | G2 | sélection de tous les moteurs |
| Exclusion même `sessionId` | `analysis.ts` | code | — | CONST | G4 implicite | tous |
| Filtre même `discipline` | `analysis.ts` | code | — | CONST | G4 | tous |
| Formules des composantes (Jaccard, cosinus, structure = moyenne de 3 indicateurs, ½ Σ\|Δ\|) | `analysis.ts` | code | — | CONST | G4 | tous |
| Classe globale = pire comparaison | `analysis.ts` | code | — | CONST | — | tous |
| Statuts comparés | `analysis.ts` | code | `completed` **et** `planned`, sans distinction | CONST | — | tous |
| Historique fourni par l'application | `app-core/src/generate.ts`, `progression.ts` | application | entrées antérieures à la date de la séance ; seules les séances **terminées** y entrent | CONST | produit | Strength, Running |
| Règle V1 « ≥ 0,9 sur 21 j ⇒ HARD » | spec 07 §4 | — | supprimée en V1.1 | HIST | — | aucun |
| « Même WOD interdit 21 j », « même structure ≥ 0,85 : ≤ 2 fois / 14 j », mémoire d'exposition avec demi-vie | `docs/architecture/05-anti-doublon.md` | — | — | HIST (`KEEP_AS_HISTORICAL_REFERENCE`) | — | aucun |
| `hard_justified`, `DUPLICATE.RELAXED_EQUIPMENT_LIMITED` | spec 07 §4 | — | **non implémentés** dans le CORE ; `hard_justified` est renvoyé aux règles HARD des disciplines (`SPORT-ENGINE-BOUNDARY.md` §105) | — | — | aucun |

Par sport :
- **Strength** : ruleset verrouillé provisoire (`strengthLockRulesetDocument`) = extension de `testRulesetDocumentWithDuplicate`. Il utilise donc les **valeurs FIXTURE** en application. Seules ses parts d'énergie par stimulus sont un paramètre propre (STR-G2-15, `provisional`).
- **Running** : `runningContent()` charge directement le ruleset de test avec anti-doublon, donc les valeurs FIXTURE.
- **Cross-training** : aucune valeur. Les poids `crosstraining` de la fixture ne sont gouvernés par rien.
- **HYROX (futur)** : idem (`hybrid_race` présent dans la fixture seulement).

**Aucune valeur anti-doublon n'est aujourd'hui une valeur de production gouvernée**, pour aucun sport.

## 2. Fonction réelle de l'anti-doublon (STATIC, confirmé par le spike de rejeu F-10c)

| Classe | Condition | Effet réel dans le code |
|---|---|---|
| `none` | similarité accidentelle < warn, sans intention correspondante | aucun |
| `planned` | < warn, avec une intention déclarée correspondante | aucune pénalité ; `DUPLICATE.PLANNED` ; stagnation signalée si aucune évolution requise n'apparaît |
| `accidental_warn` | ≥ warn | pénalité SOFT retranchée de **B6** ; raison `DUPLICATE.ACCIDENTAL` dans les avertissements |
| `accidental_strong` | ≥ strong | pénalité SOFT plus forte sur B6 ; même raison |

Ce que ces effets produisent réellement :
- La sélection est **lexicographique** (B1 → B6), avec une tolérance ε par niveau. B6 est le **dernier** niveau : la pénalité ne départage que des candidats à égalité (à ε près) sur B1–B5.
- **Un seul candidat** (Running ; le bootstrap C2 tel que défini) : l'anti-doublon **ne change jamais** l'issue. Mesuré en F-10c : rejeu classé `accidental_strong`, séance acceptée.
- **Strength** propose une séance principale et des variantes d'accessoires (`strength.proposals.max`) : la pénalité peut orienter le choix entre elles.
- Aucun refus : pas de HARD par défaut (spec 07 §4, V1.1).
- L'application ne présente pas les raisons `DUPLICATE.*` à l'utilisateur (aucun consommateur dans `app-core` ni dans l'interface).

**Réponse** : l'anti-doublon est une **heuristique de variété** (G2, SOFT), avec un rôle secondaire de **détection de stagnation** pour les répétitions prévues (`PLANNED_BUT_STAGNANT`). Ce n'est **pas une règle de sécurité** : les cas de sécurité envisagés par la spec (test maximal répété, simulation complète HYROX) relèvent de règles HARD de discipline, non implémentées. Pour un moteur à proposition unique, c'est aujourd'hui une **trace informative**.

## 3. Dimensions restantes pour le bootstrap (energy et stimulus non comparables)

| Dimension | Ce qu'elle représente pour `continuous timed` à un mouvement | Informative ? | Égalité ⇒ séances similaires ? | Différence ⇒ séances différentes ? | Risque de double comptage |
|---|---|---|---|---|---|
| `exercise` | identité du mouvement ; sinon classe d'équivalence (0,8) ou famille (0,6) du catalogue | **Oui** : c'est l'information principale | Oui pour le même mouvement ; pour une famille, dépend de la qualité du catalogue | Oui, au niveau du catalogue | **Élevé** avec movement et muscle : pour un seul mouvement, les trois dérivent des mêmes métadonnées |
| `movement` | pattern **primaire** du mouvement : cosinus d'un vecteur à une composante, donc **0 ou 1** | Faible : indicateur binaire | Même pattern ≠ même séance (squat au poids du corps vs presse) | Oui | Élevé (voir exercise) |
| `muscle` | muscles primaires du catalogue (cosinus) | Moyenne | Mêmes muscles ≠ même séance (squat vs fente : muscle = 1) | Oui | Élevé |
| `structure` | moyenne de [même `kind`, même `format`, ratio de durées p50 estimées] | Seule information **de séance** : la durée | `kind` et `format` sont **constants** dans le corridor : 2/3 de la composante valent toujours 1. Plancher mesuré ≥ 2/3 | Seule la durée varie | Faible, mais la partie constante crée un **plancher artificiel**, déjà relevé pour energy et stimulus |
| `format` (optionnel) | non déclaré aujourd'hui ; déclaré `continuous`, il serait **constant** | Non, dans le corridor | Égalité triviale | — | Même problème que stimulus |
| `energy`, `stimulus` | `not_applicable` (décision) | — | — | — | — |

Conséquence : pour ce corridor, l'empreinte se réduit à **« quel mouvement (vu par le catalogue) × quelle durée »**, lu à travers trois composantes corrélées et une composante dont 2/3 sont constants.

## 4. Matrice structurelle (MEASURED + CALCULÉ)

Poids et seuils de **référence** : ceux de la FIXTURE, utilisés seulement pour situer les classes. Contributions **brutes** avant pondération ; `stimulus`, `energy` et `format` non comparables.

| Paire | exercise | movement | muscle | structure | Similarité | Classe | Similarité CORE actuel (constantes) |
|---|---|---|---|---|---|---|---|
| même mouvement, même durée | 1 | 1 | 1 | 1 | **1** | strong | 1 |
| même mouvement, durée ×2 | 1 | 1 | 1 | 0,835 | 0,977 | strong | 0,982 |
| même famille, même durée (pompe / pompe inclinée) | 0,6 | 1 | 1 | 0,995 | 0,828 | **warn** | 0,866 (strong) |
| même famille, durée ×2 | 0,6 | 1 | 1 | 0,834 | 0,805 | warn | 0,848 (warn) |
| même pattern, autre famille, mêmes muscles (air squat / presse — **TEST_ONLY chargé, hors corridor**) | 0 | 1 | 1 | 0,985 | 0,569 | none | 0,665 (warn) |
| même pattern, autre famille, autres muscles (air squat / wall ball — **TEST_ONLY chargé**) | 0 | 1 | 0,5 | 0,995 | 0,464 | none | 0,583 (none) |
| sans lien, muscles partagés, même durée (squat / fente) | 0 | 0 | 1 | 1 | 0,357 | none | 0,500 |
| sans lien, même durée (squat / pompe) | 0 | 0 | 0 | 1 | 0,143 | none | 0,333 |
| sans lien, durée ×2 | 0 | 0 | 0 | 0,835 | 0,119 | none | 0,315 |

Le passage au modèle B change **à lui seul** deux classes de la matrice (même famille : strong → warn ; même pattern : warn → none) **sans toucher un seul poids**. Les poids et seuils actuels ont été posés en présence des constantes.

## 5. Sensibilité poids × seuils (CALCULÉ, scénarios TEST_ONLY)

Scénarios : chaque poids exercise, movement, muscle et structure multiplié par 0,5, 1 ou 2 (81 jeux) ; warn ∈ {0,5 ; 0,55 ; 0,6 ; 0,65 ; 0,7} ; strong ∈ {0,8 ; 0,85 ; 0,9}. Soit 1 215 configurations par paire. **Aucune n'est une valeur candidate.**

| Paire | none | warn | strong | Plage de similarité |
|---|---|---|---|---|
| même mouvement, même durée | 0 | 0 | 1 215 | 1 |
| même mouvement, autre durée | 0 | 0 | 1 215 | 0,934 – 0,993 |
| même famille, même durée | 3 | 697 | 515 | 0,700 – 0,936 |
| même famille, autre durée | 6 | 849 | 360 | 0,690 – 0,915 |
| même pattern, autre famille, mêmes muscles (TEST_ONLY chargé) | 639 | 551 | 25 | 0,249 – 0,839 |
| même pattern, autres muscles (TEST_ONLY chargé) | 951 | 264 | 0 | 0,203 – 0,740 |
| sans lien, muscles partagés | 1 131 | **84** | 0 | 0,122 – 0,690 |
| sans lien | 1 215 | 0 | 0 | ≤ 0,400 |
| sans lien, autre durée | 1 215 | 0 | 0 | ≤ 0,334 |

Réponses :
- **Dimensions qui contrôlent la classification** : `exercise`, le poids le plus fort, sépare « même mouvement » du reste. `movement` + `muscle` décident des cas intermédiaires. `structure` n'apporte que la durée, avec un plancher de 2/3.
- **Frontières des variantes de même famille** : elles se répartissent entre warn et strong selon la configuration, et même `none` dans 3 à 6 configurations. Référence : 0,828, soit **0,022 sous strong**.
- **Mouvements sans lien** : ceux qui ne partagent ni pattern ni muscles restent `none` partout. Ceux qui partagent leurs muscles (squat / fente) deviennent `warn` dans 84 configurations proches (poids muscle ou structure doublés, warn ≤ 0,55).
- **Seuils fragiles** : strong face aux variantes de même famille (écart 0,022) ; warn face au « même pattern, autre famille » (écart 0,031).

## 6. Recherche documentaire

| Source | Ce qu'elle dit | Classe pour des poids / seuils de similarité |
|---|---|---|
| Spec 07 §4 | structure de l'algorithme, poids **par discipline** dans le ruleset, pas de HARD par défaut | Conception (C), aucune valeur |
| `docs/architecture/05-anti-doublon.md` | valeurs historiques (0,9 / 21 j ; 0,85 / 14 j ; demi-vie) ; proposait une **fonction de similarité distincte pour les WOD** (format, domaine de temps, mouvements pondérés, schéma de reps) | HIST, non sourcé : D |
| Registre scientifique Strength : Kassiano 2022 (`C.VAR`) | la variation systématique peut aider, la variation aléatoire excessive peut nuire ; aucune durée ni seuil | Contexte Strength ; **pas** un seuil de similarité : D pour toute valeur |
| Evidence Pack Cross-training (S12, S13, S15, S17) | le format et la durée changent la réponse aiguë ; plus de volume ≠ mieux | Qualitatif ; aucune métrique de similarité : D |
| Recherche externe : revues sur la variation d'exercices et l'adhésion ([JSCR, revue systématique](https://www.ovid.com/jnls/nsca-jscr/fulltext/10.1519/jsc.0000000000004258~does-varying-resistance-exercises-promote-superior-muscle), [PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0226989&sub_id=undefined), [revue adhésion](https://www.researchgate.net/publication/399054105_What_works_to_improve_resistance_training_adherence_A_systematic_review_of_intervention_strategies)) | la variété peut favoriser l'adhésion ; « le seuil à partir duquel la variation devient excessive reste à déterminer » | Aucune métrique de similarité entre séances : D |

Niveau de vérification des sources externes : résumé de moteur de recherche (texte intégral bloqué par la politique réseau).

**Classement :**
- **A** : aucun ;
- **B** : aucun ;
- **C** : choix des dimensions, des poids, des seuils, de la fenêtre et des pénalités (décision produit et experte, G2) ;
- **D** : toute valeur numérique présentée comme scientifique.

**Il n'existe pas de base scientifique pour des poids ou des seuils numériques d'un anti-doublon de séances Cross-training.**

## 7. Portée de la gouvernance (analyse, aucun choix)

| | A — global CORE | B — algorithme commun, poids **et** seuils par sport | C — profils par capability / format dans un sport | D — profil de similarité par sport (dimensions + poids + seuils) |
|---|---|---|---|---|
| État du code | seuils, fenêtre, niveaux, pénalités globaux ; poids **déjà** par discipline | poids OK ; seuils, fenêtre et pénalités à rendre par sport : **évolution CORE** | nouvelle clé de profil (portée par l'empreinte ou l'intention) : évolution CORE | dimensions déclarées par sport ; rejoint le « modèle D » du gate précédent : **refonte** |
| Complexité | faible | faible à modérée | modérée | élevée |
| Cohérence | faible : un seuil calibré pour des séances multi-exercices (Strength) s'applique à un mouvement unique | bonne à l'échelle du sport | la meilleure pour des formats hétérogènes (§8) | la meilleure en théorie |
| Risque de régression | nul aujourd'hui | faible si les valeurs actuelles sont recopiées pour Strength et Running | faible à modéré | élevé |
| Strength / Running | inchangés | valeurs identiques à reconduire (toujours FIXTURE) | inchangés | à redéclarer |
| HYROX futur | hérite de valeurs non pensées pour lui | profil propre | profils par type de séance | déclare ses dimensions |
| Auditabilité | une seule table, mais ne dit pas pour quel sport elle vaut | une table par sport, traçable | plus de tables, portée explicite | explicite mais plus diffuse |

## 8. Bootstrap vs Cross-training futur

**Non**, un profil conçu pour `continuous timed` à un mouvement **ne peut pas** être raisonnablement réutilisé tel quel pour AMRAP, EMOM, For Time, intervalles, mixed modal ou mouvements chargés :
- l'empreinte du bootstrap se réduit à « mouvement × durée » (§3) ;
- les formats multi-mouvements introduisent l'ordre, le schéma de répétitions, le domaine de temps, le format de bloc et la composition des modalités. Aujourd'hui, `format`, `timeDomain` et `repScheme` sont optionnels et non gouvernés pour le Cross-training ;
- avec plusieurs mouvements, `exercise`, `movement` et `muscle` deviennent des mesures d'ensemble (Jaccard, cosinus) dont la sensibilité diffère ;
- la **charge** n'est pas une dimension de l'empreinte (elle n'apparaît que dans `prescriptionMarkers`, pour la stagnation) ;
- la conception historique (`05-anti-doublon.md`) prévoyait déjà une similarité **propre aux WOD**.

Aucun de ces profils futurs n'est conçu ici.

## 9. Rôle du `sessionId`

Comportement mesuré (spikes J-E4 et N-§5) : une entrée d'historique de même `sessionId` est **toujours** exclue, quel que soit son contenu.

| Cas | Conséquence | Lecture |
|---|---|---|
| **Replay** | doit porter un **nouvel** id, sinon l'anti-doublon est contourné en silence | règle **métier** implicite |
| **Nouvelle occurrence** | les identifiants de l'application dérivent du créneau (`kairo.<date>:<sport>`) : un autre jour donne un nouvel id | correct |
| **Duplication / import** | une copie qui conserve l'id n'est jamais comparée à l'original | angle mort |
| **Édition ou régénération d'une séance existante** (même créneau) | même id : elle n'est pas comparée à sa propre version précédente | correct, et c'est l'intention probable de la règle |

Conclusion : c'est aujourd'hui une **règle technique** (ne pas se comparer à soi-même) qui porte une **conséquence métier** non formalisée : l'identité d'une **occurrence**. Le CORE ne distingue pas « même séance éditée » de « nouvelle occurrence du même contenu ». C'est une **dette architecturale** légère, sans défaut actuel démontré, que le replay C2 rend visible. Aucun changement.

## 10. Verdict

**B — CROSS-TRAINING REQUIRES SPORT-SPECIFIC ANTI-DUPLICATE GOVERNANCE**

Justification (code et mesures) :
1. Les poids sont **déjà** par discipline dans l'algorithme, mais **aucune** valeur n'est gouvernée pour le Cross-training. Les seuils, la fenêtre et les pénalités sont **globaux** et n'existent qu'en FIXTURE, aussi pour Strength et Running.
2. Les dimensions pertinentes du Cross-training diffèrent de celles pour lesquelles la fixture a été posée : energy et stimulus sont non comparables, `structure` a 2/3 de constant, et `exercise`, `movement`, `muscle` sont corrélés. Le seul passage au modèle B change 2 classes de la matrice sans changer un poids.
3. Les classes intermédiaires (variantes de même famille, même pattern) sont **très sensibles** aux poids et seuils : 3 classes possibles selon la configuration, avec des écarts de 0,02 à 0,03 aux seuils de référence. Elles exigent donc une décision propre au sport.
4. L'algorithme lui-même reste valide sur les propriétés essentielles : les séances sans lien restent `none`, les répétitions strictes restent `strong`, dans toutes les configurations testées. D'où B, et non C.

Réserve : rendre les seuils, la fenêtre et les pénalités propres au sport (option B du §7) est une **évolution du contrat CORE**, comme le modèle B de l'empreinte. C'est une évolution locale, pas une refonte. Pour un moteur à proposition unique, ces valeurs n'influencent aujourd'hui que la trace (§2).

## Décisions humaines nécessaires avant la première modification réelle du CORE ou de C2

1. **Portée de la gouvernance anti-doublon** : option A, B, C ou D du §7.
2. **Rôle attendu de l'anti-doublon pour le bootstrap** : simple trace pour une proposition unique, ou critère de choix, ce qui suppose que le moteur propose plusieurs mouvements de l'allowlist.
3. **Dimensions comparables du bootstrap** : traitement de `structure` (sous-composantes constantes `kind` et `format`), de `format` (non déclaré ou `not_applicable`), et acceptation ou non de la corrélation `exercise` / `movement` / `muscle`.
4. **Valeurs Cross-training** (poids, warn, strong, fenêtre, pénalités), décidées comme **C** par un responsable G2 désigné. Aucune base A ou B n'existe.
5. **Statut des valeurs Strength et Running** : reconduction explicite des valeurs FIXTURE ou gouvernance propre, puisqu'elles tournent en application sans être gouvernées.
6. **Identité d'occurrence** : formaliser ou non la règle `sessionId` (replay = nouvel id obligatoire ; import ; édition).
7. **Autorisation du changement de contrat CORE** qui regroupe l'empreinte en modèle B et, selon le point 1, les paramètres anti-doublon par sport, avec nouvelle version de `session_record` et mise à jour validée de la baseline d'architecture.

**STOP.**
