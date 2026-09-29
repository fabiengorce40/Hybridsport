# Cross-training : C2 Bootstrap Feasibility Gate

**Statut : pour arbitrage.** Ce document ne prend aucune décision CT-D, n'ajoute aucune valeur au registre et n'écrit aucun code de C2. Les décisions déjà validées (CT-D15.a à .d, CT-D1.a) ne sont pas rouvertes : elles sont seulement **appliquées** à l'analyse.

**Question.** Quel est le premier incrément **génératif** Cross-training capable d'amorcer un historique KAIRO valide, que le rejeu strict pourra ensuite reprendre ? Il est admis qu'il n'en existe peut-être aucun de défendable aujourd'hui.

## 0. Baseline, méthode et niveaux de preuve

| Élément | État |
|---|---|
| HEAD de référence | `a289c9e` |
| Ajouts de ce gate | ce document ; `docs/kairo/CORE-FINGERPRINT-ENERGY-OVERFLOW.md` ; spike `packages/crosstraining/tests/spike/c2-bootstrap-estimation-data.test.ts` (8 tests) |
| CORE, Running, Strength, `crosstraining/src` | **inchangés** (vérifié par `git diff`, §11) |

Trois niveaux, jamais mélangés :

- **MEASURED** : établi par un test exécuté contre le pipeline réel. Références :
  - F-n : `c2-replay-core-compat.test.ts` (Decision Gate §F) ;
  - J-n : `c2-replay-energy-shares.test.ts` (Decision Gate §J) ;
  - K-n : `c2-bootstrap-estimation-data.test.ts` (ce gate).
- **STATIC** : établi par la lecture du code, cité par fichier.
- **DECISION** : arbitrage humain requis.

Origine d'une valeur (§2) :

- **A** : soutenue directement par une source vérifiée ;
- **B** : dérivée par une règle explicite et reproductible, à partir de données soutenues ;
- **C** : décision experte ou produit ;
- **D** : aucune base (KEEP BLOCKED).

Une fixture, une valeur de test ou une hypothèse de la spec **n'est jamais une origine**.

Rappel du dossier de preuve (`CROSSTRAINING-EVIDENCE-PACK.md`) : toutes les sources sont vérifiées **au niveau du résumé** (`V-ABS`), aucun texte intégral n'a été lu. « Aucun paramètre n'est **a** ou **b** au niveau d'une **valeur** : seules certaines règles qualitatives le sont. » En l'état, **aucune valeur ne peut donc avoir l'origine A**.

### 0.1 Spike ajouté (K) : données d'estimation exigées par le CORE

Question non tranchée par F et J : pour une **première** séance, quelles données d'estimation du catalogue le CORE exige-t-il selon le format et le type d'item ?

Méthode :
- `runSportSession` réel, historique vide, ruleset de test **sans** paramètres anti-doublon ;
- catalogue de test du CORE dont on **retire** au mouvement testé son débit (`workRate`), puis aussi `timing.secondsPerRep`. Rien n'est ajouté.

| # | Séance | Catalogue intact | Sans `workRate` | Sans `workRate` ni `secondsPerRep` |
|---|---|---|---|---|
| K-ref | les 5 candidats | acceptés, empreinte produite, anti-doublon `none` | — | — |
| K-A | AMRAP, item `reps` | accepté | **accepté** | **REFUS** `TECHNICAL.UNKNOWN_REFERENCE timing.secondsPerRep` |
| K-A′ | AMRAP, item `timed` | accepté | — | **accepté** |
| K-B | EMOM un mouvement, item `reps` | accepté | **accepté** | **REFUS** (`secondsPerRep`) |
| K-C | continu, item `timed` (une durée) | accepté | — | **accepté** |
| K-C′ | continu, item `distance` | — | — | **REFUS** `workRate(m_per_min)` |
| K-D | continu, un item `timed` avec tours et repos (intervalles à durée fixe, un mouvement) | accepté | — | **accepté** |
| K-E | for time avec cap, item `reps` | accepté | **accepté** | **REFUS** (`secondsPerRep`) |

**MEASURED.**
1. Une première séance (historique vide) **n'exige pas** de paramètres anti-doublon au ruleset (K-ref). En revanche, elle exige des parts d'énergie (J-B3 / J-V1 : sans elles, refus même avec un historique vide).
2. Un item `reps` exige `secondsPerRep` **ou** un débit `reps_per_min`, **quel que soit** le format, même AMRAP ou EMOM où la durée du bloc est fixe.
3. Un item `timed` n'exige **aucune** donnée d'estimation.

**STATIC** (`engine/src/duration/estimate.ts`) : le travail de chaque item est calculé **avant** le `switch` sur le format (`works = pairs.map(itemWork)`). Pour `timed`, `itemWork` ne lit que la prescription.

## 1. Inventaire des formats CORE disponibles pour Cross-training

**STATIC** (`domain/src/session.ts`) :
- **Formats de bloc** : `sets`, `emom` (`minutes`), `amrap` (`timeCapS`), `for_time` (`rounds` **et** `timeCapS`, tous deux obligatoires), `continuous`. **Aucun format « intervals »** de bloc.
- **Types d'item** : `sets`, `timed` (`workS`, `rounds`, `restS`), `distance`, `calories`, `reps`, `hold`, `mobility`, `intervals` (item de course : `work.timeS` ou `work.distanceM`, `recoveryS`), `run_structure`.
- **Commun à tous** :
  - `fingerprintInputs.energy` obligatoire (J-V1) ;
  - le CORE lit dans le catalogue `timing.setupS` et `timing.transitionClass` (durée), `family`, `equivalenceClass`, `patterns.primary`, `muscles.primary` (empreinte), `equipment`, `contraindicationTags`, `painSensitiveAreas`, `movementTags`, `status` et `substitutions` (validation et réparation).

### 1.1 Formats de bloc

| Format | Obligatoire (schéma) | Estimation de durée | Débit / données d'estimation | Time cap | Parts d'énergie | Empreinte | Réparation / substitution | Compression | Anti-doublon |
|---|---|---|---|---|---|---|---|---|---|
| **AMRAP** | `timeCapS` | Durée du bloc = `timeCapS` + mise en place (fixe) | Oui, **par item** selon son type (K-A, K-A′) | Oui (`timeCapS` **est** la durée) | Oui | Oui (F-1) | Matériel, restriction, douleur, exclusion ⇒ substitution ou retrait (F-11, F-12) | Seulement si levier `shorten_conditioning` déclaré ; sinon refus si trop long (F-13, F-14) | Paramètres `duplicate.*` exigés dès qu'une séance comparable existe (F-10b) ; nouvel id obligatoire (J-E4) |
| **EMOM** | `minutes` | Fixe (`minutes` × 60 + mise en place) | Oui, par item (K-B) | Non | Oui | Oui (F-4) | idem | `shorten_conditioning` (−1 min) si déclaré | idem |
| **For time** | `rounds`, `timeCapS` | **Estimée** : min(cap, somme des items × tours + transitions) | Oui, par item ; la valeur **compte** (F-2) | **Oui, obligatoire** (F-3) | Oui | Oui (F-2) | idem | `shorten_conditioning` (−1 tour) si déclaré | idem |
| **Continu** | — | Somme travail + repos + transitions ; « fixe » si tous les items sont `timed`, `hold` ou `mobility` | Selon l'item : aucune pour `timed` (K-C), débit pour `distance` (K-C′) | Non | Oui | Oui (F-5) | idem | `reduce_run_volume` si déclaré (réduit `workS` d'un item `timed` ou une distance) | idem |
| **Intervalles** (format Cross-training) | **pas de bloc CORE** | — | — | — | — | — | — | — | Seule approximation : continu + item `timed` (`workS`, `rounds`, `restS`). **Exacte pour un seul mouvement** (K-D) ; perd l'ordre des stations pour plusieurs (F-8b) |
| `sets` | `grouping` | Estimée | `secondsPerRep` pour des séries | Non | Oui | Oui | idem | `reduce_sets`, `reduce_rest`… (interdits sur le bloc principal pour certains) | idem |

### 1.2 Types d'item utiles en conditioning

| Item | Donnée catalogue exigée pour la durée | Mesuré |
|---|---|---|
| `reps` | `workRate` `reps_per_min` **ou** `timing.secondsPerRep` | K-A, K-B, K-E |
| `timed` (durée) | aucune | K-A′, K-C, K-D |
| `distance` | `workRate` `m_per_min` (ou allure fournie) | K-C′ |
| `calories` | `workRate` `cal_per_min` | F-6 |
| `sets` (une série non chargée) | `secondsPerRep` ; sémantique différente de `reps` | F-8 |

**STATIC.** Aucun contrôle du CORE ne plafonne les répétitions, les contacts de saut, la densité ou l'intensité (`engine/src/validation/checks.ts` : statut du programme, restriction, douleur par zone et par mouvement, statut d'exercice, matériel, exclusion, jour, durée, récupération, intégrité).

## 2. Hypothèses nécessaires pour créer une séance minimale

Séances minimales théoriques (un mouvement non chargé, un bloc principal, aucun levier) :
- **A** : AMRAP, `timeCapS` = T, un item `reps` = r ;
- **B** : EMOM, `minutes` = m, un item `reps` = r ;
- **C** : continu, un item `timed` de durée d ;
- **D** : continu, un item `timed` (`workS` = w, `rounds` = n, `restS` = p), représentation CORE du format « intervalles » ;
- **E** : for time, `rounds` = n, `timeCapS` = T, un item `reps` = r.

Aucune valeur n'est proposée. Pour chaque valeur à fixer :

| Valeur | A | B | C | D | E | Origine possible | Justification |
|---|---|---|---|---|---|---|---|
| Mouvement (choix) | ✔ | ✔ | ✔ | ✔ | ✔ | **C** | Aucune source ne désigne un mouvement d'entrée. CT-D1.a interdit de passer par le stimulus |
| Ordre | — | — | — | — | — | sans objet | Un seul mouvement |
| Nombre de mouvements | 1 | 1 | 1 | 1 | 1 | **C** | Minimum de représentation ; choisir « un seul » est déjà une décision de conception |
| Reps | r | r | — | — | r | **D** | CT-D4 `firstExposure` est classé **d** ; S16 ne donne aucune dose transposable |
| Séries / tours | — | — | — | n | n | **D** | Idem |
| Durée du bloc | T | m | d | — | — | **D → C** | S15 montre que 5 et 15 min diffèrent (a, étroit), mais ne fixe **aucune** borne (`timeDomains` d → c) |
| Time cap | (T) | — | — | — | T | **C** | CT-D3 ; aucune source |
| Intervalle / travail : repos | — | — | — | w, p | — | **C** | S6 et S8 concernent le HIIT cyclique ou supra-maximal ; la transposition au multimodal n'est pas justifiée |
| Distance / calories | — | — | — | — | — | évitables | Les candidats minimaux utilisent `reps` ou `timed` |
| Charge | — | — | — | — | — | évitée | Mouvement non chargé (hors C2, décision « load » reportée) |
| Intensité / cible d'effort | — | — | — | — | — | évitable | CT-D9 : une cible n'est pas exigée par le CORE ; S11 s'y oppose en V1 |
| **Parts d'énergie** | ✔ | ✔ | ✔ | ✔ | ✔ | **C ou D** | Exigées par le CORE (J-V1). Voir §4 |
| Scaling | — | — | — | — | — | évitable | Mouvement standard ; CT-D13 non requis si aucun scaling n'est proposé |
| Progression | — | — | — | — | — | sans objet | Première séance |
| Population éligible | ✔ | ✔ | ✔ | ✔ | ✔ | **C (G1)** | Novice, reprise : politiques à signer (§6) |
| Sécurité par séance (plafonds) | ✔ | ✔ | ✔ | ✔ | ✔ | **C / D** | CT-D6 : a qualitatif (S18, S19), **d** pour les valeurs (§5) |
| Estimation catalogue | `secondsPerRep` ou débit | idem | aucune | aucune | idem, et la valeur **compte** | **D → C** (S22 : aucune norme) | K-A à K-E |
| Données de catalogue non-estimation | ✔ | ✔ | ✔ | ✔ | ✔ | **C** (`CT_CONTENT`) | §7 |
| Critère `completed_as_prescribed` du format | ✔ | ✔ | ✔ | ✔ | ✔ | **C** (CT-D15.d validé dans son principe ; règle par format à écrire) | §3 |

**STATIC** (`crosstraining/src`) : les trois sources de dose possibles du moteur sont `ctReplayHold`, `ctCalibratedDose` et `ctFirstExposure`. Une première séance ne peut venir que de `ctFirstExposure` (paramètre `ct.firstExposure.byStimulus`, CT-D4, G1 NOVICE et EXERTIONAL) ou de `ctCalibratedDose` (7 paramètres de CT-D1, D2, D3, D8). **Ces deux capacités sont indexées par stimulus**, alors que CT-D1.a exclut toute taxonomie gouvernée en C2 (voir §9, décision 1).

## 3. Les candidats minimaux

| Candidat | Séance sans valeur sportive arbitraire ? | Pipeline CORE réel sans modification ? | Données historiques pour le futur rejeu strict ? |
|---|---|---|---|
| **A** AMRAP un mouvement `reps` | **Non** : mouvement (C), durée (D→C), reps (D), parts (C/D) | **Oui** (F-1, K-A), si parts d'énergie et `secondsPerRep` ou débit | **Pas en l'état** (ci-dessous). Contrat C1 : `amrap` + `rounds_reps` ; « completed_as_prescribed » d'un AMRAP n'a pas de définition (seul l'abandon est détectable) |
| **B** EMOM un mouvement `reps` | **Non** : mouvement, minutes, reps, parts | **Oui** (F-4, K-B) | **Pas en l'état.** Contrat C1 : `emom` + `minutesCompleted` : « toutes les minutes tenues » est définissable |
| **C** continu `timed` | **Non** : mouvement, durée, parts. C'est le candidat qui en demande le moins | **Oui** (F-5, K-C), **sans** donnée d'estimation | **Pas en l'état.** Contrat C1 : `continuous` exige un résultat `total` en calories ou distance. Pour un mouvement au poids du corps en durée, **aucun résultat enregistrable** ; « complété » en continu n'est pas défini (Decision Gate D.5) |
| **D** intervalles à durée fixe (un mouvement) | **Non** : mouvement, w, n, p, parts | **Oui** (K-D), **sans** donnée d'estimation ; représentation exacte pour **un** mouvement seulement | **Pas en l'état.** Contrat C1 : `intervals` + `intervalsCompleted` : « tous les intervalles tenus » est définissable. Écart : `restS` doit être > 0 dans le contrat C1, ≥ 0 dans le CORE |
| **E** for time avec cap `reps` | **Non** : mouvement, tours, reps, cap (CT-D3), parts ; et la valeur d'estimation **compte** pour la durée | **Oui** (F-2, K-E) | **Pas en l'état.** Contrat C1 : `time` ≤ cap ou `capped` : critère définissable |

Aucun autre candidat ne demande objectivement moins de décisions. Un bloc `sets` ou un item `hold` / `mobility` relèvent d'autres disciplines. `hold` en continu n'exige pas non plus de donnée d'estimation (**STATIC**), mais demande les mêmes décisions que C (durée, mouvement, parts) et n'a pas d'équivalent dans le contrat de séance réalisée Cross-training.

**Pourquoi aucun candidat n'amorce le rejeu « en l'état »** (MEASURED J-O2, J-O3, J-B3 ; STATIC) :
1. aucune séance Cross-training n'est planifiée ni générée par l'application (`PLAN.ENGINE_UNAVAILABLE`) ;
2. `AppState` n'a pas d'emplacement pour une empreinte Cross-training, ni pour une séance réalisée Cross-training ;
3. le contrat `zRealizedCtSession` ne porte ni parts d'énergie, ni empreinte, ni la distinction `completed` / `completed_as_prescribed` (CT-D15.d, validée dans son principe mais absente du contrat), ni la variante exécutée, ni la provenance (Decision Gate D.5).

Chacun de ces trois points est un choix produit ou architecture (**hors CT-D**), à trancher **avant** qu'une première séance générée puisse devenir rejouable.

## 4. Parts d'énergie, par candidat

Le CORE exige `fingerprintInputs.energy` = parts prévues {low, moderate, high} pour **toute** proposition, y compris la première (J-V1, J-B3).

| Source | A | B | C | D | E |
|---|---|---|---|---|---|
| Scientifiquement établie | **Aucune.** S1 : l'intensité est relative à l'individu (qualitatif). S6 : cadre HIIT cyclique. Aucune source ne donne une répartition low / moderate / high pour une séance multimodale | idem | idem | idem | idem |
| Dérivation possible mais non validée | Aucune règle écrite. Le format, la durée, le mouvement ou le sRPE **ne sont pas** convertis en parts (consigne du gate) | idem | idem | idem | idem |
| Décision experte | `ct.stimulus.intensityBand` (CT-D1) est **indexé par stimulus**, ce que CT-D1.a exclut en C2. Il faudrait une **autre** clé de décision : par format, par séance d'amorçage, ou une valeur unique déclarée | idem | idem | idem | idem |
| Donnée existante | **Aucune** (J-B3 : BOOTSTRAP PATH ABSENT) | idem | idem | idem | idem |

**Constat.** Les cinq candidats ont **tous** besoin d'une décision non résolue sur les parts d'énergie. Aucun candidat n'y échappe : l'exigence vient du CORE, pas du format.

**STATIC**, pour mémoire : les parts servent à la composante `energy` de l'anti-doublon (`1 − ½·Σ|Δ|`). Si elles étaient déclarées identiques pour toutes les séances Cross-training, cette composante vaudrait 1 entre deux séances Cross-training quelconques. Ce serait un choix explicite de neutralisation, donc une décision, pas une valeur neutre.

## 5. CT-D6 : bloque-t-il tous les candidats ?

**STATIC** (`crosstraining/src/capabilities.ts`) : `CT_FOUNDATION_DEFINITION` contient `ct.safety.repsPerMovementCap` et `ct.safety.jumpContactsCap`. Le socle est évalué pour **toute** prescription (`foundationState`, toujours « demandé »). Tant que ces deux paramètres ne sont pas résolus, le socle est désactivé et **aucune** séance n'est possible, quel que soit le format. **CT-D6 bloque donc les cinq candidats en l'état du code.**

Pour les candidats à item `timed` (C, D), aucun nombre de répétitions n'est prescrit : un plafond de répétitions **ne peut pas être vérifié** sur la prescription. Il porterait sur une quantité inconnue.

| Option | Contenu | Candidats débloqués | Ce qu'elle exige | Risque |
|---|---|---|---|---|
| **1** — CT-D6 obligatoire pour toute première prescription | Décider les deux plafonds (valeurs **d**) | Tous, une fois décidés | Deux valeurs sans source chiffrée (S18, S19 qualitatifs). Pour C et D, une règle de conversion durée → répétitions ou contacts, qui est elle-même une décision | Valeurs arbitraires présentées comme des garde-fous |
| **2** — Plafonds retirés du socle pour certains formats | Modifier la définition du socle (code C2) : plafonds exigés seulement quand une quantité de répétitions ou de sauts est prescrite | C et D si leur mouvement n'est pas un saut ; les plafonds restent exigés pour A, B, E | Décision structurelle ; changement de `crosstraining/src` en C2 | S19 : du volume sans plafond de répétitions reste possible en durée (un mouvement en 10 min peut totaliser beaucoup de répétitions) |
| **3** — Un garde existant rend CT-D6 inutile dans un sous-ensemble borné | Chercher un garde déjà présent | **Aucun, en l'état** | — | — |

Détail de l'option 3 (**STATIC**) :
- le CORE n'a aucun plafond de volume (§1.2) ;
- les gardes existants (restrictions déclarées comme `no_impact`, zones douloureuses, mouvements restreints, exclusions, matériel) filtrent des **mouvements**, jamais un **volume** ;
- un sous-ensemble « mouvement sans saut » rendrait `jumpContactsCap` sans objet, mais exige une **étiquette de contenu fiable** (`CT_CONTENT`) et une décision déclarant ce sous-ensemble. Ce n'est pas un garde existant ;
- `repsPerMovementCap` n'a aucun équivalent existant.

Aucune option n'est choisie ici.

## 6. CT-G1 : politiques à signer avant la moindre première séance

**STATIC** : le socle exige les **quatre** politiques signées (`CT-G1-PAIN`, `CT-G1-NOVICE`, `CT-G1-RETURN`, `CT-G1-EXERTIONAL`) et les trois paramètres CT-G1 (`ct.safety.novicePolicy`, `ct.return.protocol`, `ct.safety.novelEccentricVolume`). `ctFirstExposure` exige en plus NOVICE et EXERTIONAL. Aucune règle de la spec n'est une politique approuvée.

Gardes **déjà existants**, qui ne remplacent aucune signature :
- l'application suspend toutes les séances dès qu'une douleur est signalée (`KAIRO.SAFETY_PAUSE_ACTIVE_PAIN`) ;
- le CORE applique les restrictions de zone et de mouvement douloureux, ainsi que le statut du programme (`paused_safety`, `suspended_scope`).

| Politique | Question minimale pour une **première** séance | Options (aucune retenue) |
|---|---|---|
| **CT-G1-PAIN** | Que faire si une douleur est déclarée, active ou récente ? | (a) reprendre la suspension globale existante de l'application comme politique Cross-training ; (b) politique propre (zones exclues, mouvements exclus) ; KEEP BLOCKED |
| **CT-G1-NOVICE** (`novicePolicy`) | Un novice peut-il recevoir une première séance générée ? | (a) exclu de C2 ; (b) admis sous conditions à écrire (format, durée) ; KEEP BLOCKED. S8 **n'établit pas** l'exclusion (dossier de preuve) |
| **CT-G1-RETURN** (`return.protocol`) | Première séance après une coupure déclarée ? | (a) seulement si `returnState = NONE` ; (b) protocole de reprise à écrire ; KEEP BLOCKED. S21 : contexte seulement |
| **CT-G1-EXERTIONAL** (`novelEccentricVolume`) | Une première séance expose **par définition** un mouvement nouveau : quelle limite ? | (a) exclure les mouvements à excentrique marqué (pompes, tractions : S19) de la première séance ; (b) limite de volume (valeur **d**) ; (c) combiner (a) et une durée ; KEEP BLOCKED |

À la différence du rejeu (Decision Gate H.4), la question « mouvement nouveau » n'est **pas** sans objet ici : c'est le cas nominal d'une première séance.

## 7. Catalogue / CT_CONTENT : minimum absolu

**STATIC** : `CT_CONTENT` est `UNSATISFIED`. Le catalogue de l'application est **provisoire** (`app-core/src/provisional-content.ts` : fixtures de test, statut `draft`, autorité `provisional`).

| Question | Réponse | Niveau |
|---|---|---|
| Nombre minimal de mouvements | **1** pour les cinq candidats (un seul mouvement). Pour qu'une réparation par **substitution** reste possible sous restriction ou matériel manquant, au moins un substitut admissible ; sans substitut, l'item est **retiré** (F-11, F-12), et un rejeu ou une première séance modifiée n'est plus la séance prévue | STATIC + MEASURED |
| Données d'estimation | A, B, E : `timing.secondsPerRep` **ou** `workRate reps_per_min` (K-A, K-B, K-E). Pour E, la valeur **détermine** la durée estimée. C, D : **aucune** (K-C, K-D) | MEASURED |
| Équipement (`equipment.allOf/anyOf`) | Obligatoire et **fiable** : le contrôle de faisabilité et la substitution en dépendent | STATIC |
| Pattern, muscles, famille, classe d'équivalence | Obligatoires et fiables : l'empreinte et l'anti-doublon en dérivent (`fingerprint.ts`) | STATIC |
| `timing.setupS`, `transitionClass` | Obligatoires (durée) | STATIC |
| Complexité technique (`skillLevel`, `cost.technical`) | **Non lus** par le pipeline de séance (seulement par la couverture du catalogue). Nécessaires si CT-G1-NOVICE en dépend | STATIC |
| Impact (`cost.impact`, étiquettes de restriction comme `no_impact`) | Le CORE filtre par `contraindicationTags` : l'étiquette doit être **fiable** pour que les restrictions déclarées protègent réellement | STATIC |
| Saut (pour CT-D6 option 2 ou 3) | Une étiquette de mouvement fiable (« saut ») serait nécessaire ; aucune n'est gouvernée aujourd'hui | STATIC |
| Scaling | Non requis si aucune variante n'est proposée | — |
| Contre-indications, zones douloureuses (`contraindicationTags`, `painSensitiveAreas`, `movementTags`) | Obligatoires et fiables : sécurité par restriction et douleur | STATIC |
| `loadable` / `loadModel` | Mouvement non chargeable, ou `bodyweight_plus` sans charge (`movement.ts`) | STATIC |
| Revue | `meta.reviewStatus` au moins `reviewed` (convention `CT_CONTENT`, **C**) | DECISION |

Aucune valeur de catalogue n'est proposée. S22 : aucune norme publiée de débit.

## 8. Comparaison des candidats

« Décisions A/B » = valeurs qui auraient une origine A ou B : **aucune** (§0). Le décompte des décisions C porte sur les valeurs **propres au candidat**. Les décisions communes à tous figurent dans la ligne « Communes ».

| Candidat | CORE compatible | Décisions A/B | Décisions C propres | Blockers D propres | CT-D nécessaires | G1 | Catalogue (estimation) | Peut amorcer le rejeu |
|---|---|---|---|---|---|---|---|---|
| **A** AMRAP `reps` | Oui (F-1, K-A) | 0 | durée | reps | CT-D4 ou CT-D2/D1, CT-D6 | 4 | `secondsPerRep` ou débit | Non en l'état (§3) ; « completed_as_prescribed » non défini pour l'AMRAP |
| **B** EMOM `reps` | Oui (F-4, K-B) | 0 | minutes | reps | CT-D4 ou D1/D2/D8, CT-D6 | 4 | `secondsPerRep` ou débit | Non en l'état ; critère définissable |
| **C** continu `timed` | Oui (F-5, K-C) | 0 | durée | — | CT-D4 ou D1/D2, CT-D6 (non vérifiable sur une durée) | 4 | **aucune** | Non en l'état ; **aucun résultat enregistrable** au contrat C1 pour un mouvement en durée |
| **D** intervalles `timed` | Oui (K-D) | 0 | travail, repos, tours | — | CT-D4 ou D1 (`workRestRatios`), CT-D6 | 4 | **aucune** | Non en l'état ; critère définissable (`intervalsCompleted`) |
| **E** for time `reps` | Oui (F-2, K-E) | 0 | tours, cap (CT-D3) | reps | CT-D4 ou D1/D2/D3, CT-D6 | 4 | `secondsPerRep` ou débit, **valeur déterminante** | Non en l'état ; critère définissable (`time` ≤ cap) |
| **Communes** | — | 0 | choix du mouvement ; parts d'énergie ; population (G1) ; règle `completed_as_prescribed` du format ; `maxReplayAge` (CT-D15.b) pour le rejeu ultérieur ; mode SIMULATION ou PRODUCTION | plafonds CT-D6 (valeurs) | CT-D6, CT-G1 | les 4 signées | contenu `CT_CONTENT` relu (§7) | stockage réalisé + empreinte (produit, hors CT-D) |

Constats factuels (sans classement global) :
- **Moins de décisions C propres** : **C** (une durée).
- **Moins de paramètres de dose** : **C** (une valeur). D en a trois, E en a trois dont un cap.
- **Moins de contenu catalogue** : **C** et **D** (aucune donnée d'estimation, K-C, K-D).
- **Critère de complétion définissable dans le contrat C1** : B, D et E. Pas C (aucun résultat pour un mouvement en durée), ni A (seul l'abandon est détectable).
- **Restent bloqués, tous les cinq** : parts d'énergie (§4), CT-D6 (§5), G1 (§6), `CT_CONTENT` (§7), dose d'entrée CT-D4 (**d**), et l'absence de chemin de stockage vers le rejeu (§3).

## 9. Hypothèse « aucun C2 génératif »

Chacun des cinq candidats exige encore **à la fois** :
- une **dose arbitraire** : au moins une durée ou un nombre de répétitions d'origine D ou C, sans source (CT-D4 **d**, `timeDomains` **d → c**) ;
- des **parts d'énergie arbitraires** (§4 : aucune source, aucune dérivation écrite, clé de décision incompatible avec CT-D1.a) ;
- des **politiques de sécurité non signées** : les 4 politiques G1 et CT-D6 dans le socle ;
- pour A, B et E, des **données d'estimation non établies** (S22 : aucune norme).

La condition du gate est donc remplie : **NO DEFENSIBLE GENERATIVE C2 YET.**

La faisabilité **technique** est établie (les cinq passent le pipeline réel sans modification du CORE). Ce qui manque n'est pas technique : ce sont des décisions humaines.

### Décisions humaines minimales pour que cela change

Aucune n'est prise ici. Les options ne sont pas classées.

1. **Structure du socle face à CT-D1.a** (conception, `crosstraining/src`, hors valeur sportive). Le socle exige `ct.stimulus.catalog`, et `ctFirstExposure` / `ctCalibratedDose` sont indexés par stimulus, alors que C2 ne valide aucune taxonomie. Trancher entre :
   - déclarer le vocabulaire actuel comme identifiants techniques non gouvernés, avec leur rôle exact ;
   - réindexer la première exposition (par format ou par séance d'amorçage) ;
   - KEEP BLOCKED.
2. **Parts d'énergie de la première séance** (CT-D1 ou nouvelle décision). Choisir une origine explicite :
   - par format ;
   - valeur unique déclarée, en assumant la neutralisation de la composante `energy` ;
   - règle de dérivation écrite ;
   - KEEP BLOCKED.
3. **Dose d'entrée** (CT-D4). Pour **un** candidat au moins, sa ou ses valeurs (durée ; ou travail, repos, tours ; ou reps), par niveau si nécessaire. Origine **C**, assumée comme telle.
4. **Choix du ou des mouvements d'amorçage** (C), avec des métadonnées `CT_CONTENT` relues (§7). Pour A, B et E, une donnée d'estimation (`secondsPerRep` ou débit, CT-D2).
5. **CT-D6** : option 1, 2 ou 3 du §5, et les valeurs si option 1.
6. **Les 4 politiques CT-G1 signées** (§6), dont EXERTIONAL, qui n'est **pas** sans objet pour une première séance.
7. **Critère `completed_as_prescribed` par format retenu** (application de CT-D15.d), et, pour le continu en durée, un résultat enregistrable ou l'exclusion de ce format.
8. **Chemin d'historique (produit / architecture, hors CT-D)** :
   - enregistrer les séances Cross-training réalisées dans l'application ;
   - y conserver l'empreinte ou les parts de la séance générée ;
   - porter `completed_as_prescribed`, la variante exécutée et la provenance.

   Sans ce chemin, même une première séance générée n'amorce pas le rejeu.
9. **Mode** : C2 en simulation seulement ou éligible à la production (déjà ouvert en §I du Decision Gate).

## 10. Edge case CORE séparé

Le cas `{MAX_VALUE, MAX_VALUE, 0}` (J-V3) est décrit dans `docs/kairo/CORE-FINGERPRINT-ENERGY-OVERFLOW.md` comme dette technique. **Aucune modification du CORE** dans ce gate.

## 11. Vérifications

- Tests Cross-training, typecheck, lint, suite complète et tests d'architecture : **verts**.
- CORE (`packages/domain`, `packages/engine`), Running, Strength et `packages/crosstraining/src` : **aucun changement** depuis `a289c9e` (vérifié par `git diff`).
- Aucun code C2. Aucune nouvelle valeur CT-D approuvée : le registre reste à 31 paramètres `UNRESOLVED`.

## Conclusion

**B — NO DEFENSIBLE GENERATIVE C2 YET**

Décisions humaines minimales pour passer à l'étape suivante : §9, points 1 à 9.
