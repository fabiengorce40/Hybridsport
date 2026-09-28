# CORE-EXT-R1 — rapport de tests et de durcissement (phase 6A)

## 1. Suites

| Contrôle | Résultat |
|---|---|
| `pnpm test` | **696 / 696** verts (61 fichiers) ; départ 630 → +66 |
| `pnpm typecheck`, `pnpm lint` | verts |
| Architecture (CORE) | verte, dont `core-ext-r1-boundaries.test.ts` : aucun terme de programmation Running, aucun littéral non annoté |
| Strength | sources inchangées ; goldens F1 / F2 et suites Strength verts ; seule l’empreinte F20 est mise à jour |

### Fichiers de tests ajoutés

| Fichier | Contenu |
|---|---|
| `engine/tests/unit/core-ext-r1.test.ts` | Les **25 cas requis** + invariants supplémentaires (32 tests) |
| `engine/tests/unit/core-ext-r1-hardening.test.ts` | Durcissement guidé par la mutation (17 tests) |
| `engine/tests/property/core-ext-r1.property.test.ts` | Propriétés et adversariaux (10 tests) |
| `engine/tests/integration/core-ext-r1-boundary.test.ts` | Frontière SportEngine : contrat inchangé, estimation falsifiée refusée, rejeu (3 tests) |
| `engine/tests/architecture/core-ext-r1-boundaries.test.ts` | Aucune science Running dans le CORE (4 tests) |
| `engine/tests/unit/migration.test.ts` (mis à jour) | Registre 1→4, `UNAVAILABLE_LEGACY`, version future 5 |

### Correspondance des 25 cas

| # | Cas | # | Cas |
|---|---|---|---|
| 01 | répétition en durée | 14 | double retour au calme refusé |
| 02 | distance + allure | 15 | estimation stockée ≠ recalcul refusée |
| 03 | distance sans allure refusée | 16 | legacy UNAVAILABLE_LEGACY |
| 04 | ordre allure rapide / lente | 17 | aller-retour |
| 05 | répétitions multiples | 18 | rejeu |
| 06 | séries multiples | 19 | plage d’allure invalide |
| 07 | récupération | 20 | plage RPE invalide |
| 08 | RPE seul | 21 | plage FC invalide |
| 09 | FC | 22 | valeurs nulles / négatives |
| 10 | NO_WEARABLE | 23 | dépassement de la contrainte de durée |
| 11 | échauffement interne | 24 | régression Strength |
| 12 | échauffement externe (multidiscipline) | 25 | profondeur fixe |
| 13 | double échauffement refusé | | |

### Propriétés
Durée ≥ 0 ; min ≤ max ; travail ≤ total ; ajouter une répétition, une série ou allonger une récupération ne réduit jamais la durée ; aller-retour sémantiquement égal ; déterminisme ; nombre d’étapes = somme des comptages ; **une provenance invalide ne devient jamais valide par sérialisation** (schéma, enveloppe, validateur) ; une distance sans allure n’est jamais rendue valide par un recalcul.

## 2. Empreinte F20 (modification motivée du CORE)

`packages/strength/tests/architecture/__reports__/core-source-digest.txt` est mis à jour : 5 fichiers ajoutés (`run-structure.ts`, `run-execution.ts`, `duration/run-structure.ts`, `duration/recorded.ts`, `trace/schema-issue.ts`) et 11 modifiés, tous au titre de CORE-EXT-R1 approuvée par le fondateur (plus le correctif de robustesse de `migrateToCurrent`, §4). Aucune autre source du CORE n’a changé.

## 3. Mutation testing

### 3.1 Passages globaux (historique)

| Passage | Mutants | Résultat | Durée |
|---|---|---|---|
| 1 (9 fichiers, 4 exécuteurs) | 1 042 | 816 tués, 223 survivants, 3 timeouts : 78,6 % | 37 min |
| 2 (mêmes fichiers + tests de durcissement) | 1 044 | **interrompu** après 162 mutants testés (0 survivant, 5 timeouts) | ≈ 4 h |

Un passage préliminaire avait été invalidé : le lien de l’espace de travail `@hybridsport/domain` pointait vers les sources d’origine, si bien que les mutants du domaine n’étaient jamais exécutés. La configuration résout désormais le domaine dans le bac à sable.

### 3.2 Diagnostic de la lenteur du passage 2

- **Cause** : des mutants de boucle infinie (`r++ → r--` dans le déroulement de `preparation`, `set++` / `r++` dans `repeat`). Ces branches n’étaient pas exercées au passage 1 : les mutants survivaient vite. Les tests de durcissement les exercent désormais : chaque mutant pousse des étapes sans fin.
- **Mesure** : un worker vitest atteint **8 Go RSS en 48 s** à environ 150 % CPU. Avec 4 exécuteurs Stryker, chacun lançant plusieurs workers vitest, la machine (16 Go, 4 cœurs) thrashait : charge moyenne 33 sur 15 min. Le timeout par mutant (≈ 66 s) ne protégeait pas la mémoire.
- **Périmètre** : pas d’explosion. Même nombre de mutants (1 044) ; le temps venait des mutants pathologiques, pas du volume.
- **Correctifs de configuration** :
  - tas Node plafonné à 1 Go (le mutant meurt en ≈ 13 s au lieu de saturer la mémoire) ;
  - un seul worker vitest par exécution ;
  - `timeout -k` autour de la commande ;
  - 10 s par mutant (base ≈ 5 s) ;
  - concurrence 3 ;
  - tests ciblés (74) ;
  - 7 lots indépendants (`stryker/core-ext-r1/*.json`).

### 3.3 Lots (exécutés séparément, tous terminés)

| Lot | Zone | Total | Tués | Survivants | Timeouts | Ignorés | Score | Durée |
|---|---|---|---|---|---|---|---|---|
| L1 | invariant distance / allure | 42 | 42 | 0 | 0 | 0 | **100 %** | 95 s |
| L2 | ordre des plages | 90 | 90 | 0 | 0 | 0 | **100 %** | 196 s |
| L3 | dérivation de la durée + recalcul | 152 | 147 | 5 | 0 | 0 | **96,71 %** | 314 s |
| L4 | doublons échauffement / retour au calme (+ levier) | 226 | 220 | 6 | 0 | 0 | **97,35 %** | 508 s (1ʳᵉ exécution : 219 / 7, 479 s) |
| L5 | schéma, versions, legacy | 188 | 174 | 14 | 0 | 0 | **92,55 %** | 397 s (1ʳᵉ exécution : 170 / 18, 394 s) |
| L6 | validation de la provenance | 46 | 46 | 0 | 0 | 0 | **100 %** | 106 s |
| L7 (annexe) | comptages, bornes, déroulement d’exécution | 236 | 227 | 6 | 3 | 0 | **97,46 %** | 510 s |
| **Total** | | **980** | **946** | **31** | **3** | **0** | **96,84 %** | ≈ 36 min |

Les 3 timeouts de L7 sont les mutants de boucle infinie (détectés). Aucun mutant « NoCoverage ».

### 3.4 Survivants pertinents pour la prescription : corrigés

| Lot | Mutant | Comportement révélé | Action |
|---|---|---|---|
| L4 | `levers.ts:183`, condition « segment réductible » → `true` | Avec deux segments continus dont le premier est au plancher, le levier abandonnait au lieu de réduire le suivant | Test ajouté (comportement spécifié : « puis un segment continu ») ; tué à la 2ᵉ exécution |
| L5 | `serialization.ts:56`, raffinement `p10 ≤ p50 ≤ p90` → `true` / `‖` | Une estimation stockée avec des bornes désordonnées était acceptée à la lecture (invariant min ≤ max) | Test ajouté ; 4 mutants tués à la 2ᵉ exécution |

Au premier passage global, le durcissement avait aussi révélé un **défaut réel** : `migrateToCurrent` levait une exception sur une donnée non objet (`canonicalStringify(undefined)`), au lieu d’un refus explicite. Corrigé (comparaison en `null`) et testé.

### 3.5 Survivants restants (31) : justifiés, non masqués

| Lot | Mutant(s) | Justification |
|---|---|---|
| L3 | `estimate.ts:118` (`!(e instanceof UnknownDurationComponent)` → `false`) ; `run-structure.ts:77` (→ `true`) | **Défensif / inatteignable** : après validation du schéma, `segmentDuration` ne peut lever qu’une composante inconnue ; aucune autre erreur n’existe pour une entrée validée |
| L3 | `run-structure.ts:48` (corps du `case 'steady'` vidé, 2 mutants) | **Équivalent** : la chute dans `preparation` (1 répétition par défaut, sans récupération) donne exactement `{ work: d, recovery: 0, total: d }` |
| L3 | `recorded.ts:38:154` (`'session_record'` → `""`) | **Diagnostic** : paramètre `kind` d’un code d’information ; aucun effet sur la décision |
| L4 | `run-structure.ts:280` (2 mutants) | **Équivalent** : l’arrêt anticipé ne fait qu’éviter un travail ; la suite n’agit que si un échauffement ou un retour au calme interne existe |
| L4 | `run-structure.ts:283` (→ `true`) | **Diagnostic** : dans une séance déjà refusée, ajoute la même anomalie pour une structure sans segment interne ; statut INVALID identique |
| L4 | `levers.ts:183:65`, `185`, `187` | **Équivalents / défensifs** : `s.kind === kind` précède déjà la condition ; gardes de rétrécissement de type |
| L5 | `serialization.ts:56:63` (message `'p10 ≤ p50 ≤ p90'`) ; `migrations.ts:49` (description) ; `migrations.ts:79` (préfixe de chemin) | **Diagnostic / documentation** |
| L5 | `migrations.ts:62, 66, 68` (`typeof … 'object'`) | **Équivalents** : une primitive n’a ni `blocks` ni `items` ni `prescription` ; le résultat (`false`) est identique |
| L5 | `migrations.ts:120` (6 mutants), `121`, `127` | **Code pré-existant (phase 3.5)** compris dans la plage mutée : recherche d’étape équivalente pour un registre à pas uniques (garanti par `migrationRegistryIssues`) ; `to: v ± 1` est un paramètre de diagnostic |
| L7 | `run-structure.ts:193`, `212` (`case 'cooldown'` sans corps) | **Équivalents** : la chute dans `preparation` donne le même comptage (1) et les mêmes contrôles de dose |
| L7 | `run-structure.ts:203`, `239` (chemin `['segments']`, 4 mutants) | **Diagnostic** : chemin des anomalies de bornes ; le code est vérifié |

**Survivants pertinents pour la prescription non expliqués : 0.** Aucun test n’a été ajouté pour le seul score : les deux tests ajoutés portent sur des comportements spécifiés.

### 3.6 Passage global
Aucun nouveau passage global n’est nécessaire : les lots couvrent tous les fichiers CORE-EXT-R1. Le passage 1 avait déjà mesuré le périmètre complet, et le passage 2 n’apportait que les mutants pathologiques, désormais bornés.

## 4. Gates

### CORE_EXT_R1_IMPLEMENTATION_GATE = **PASS**

| Critère | Statut |
|---|---|
| Approbation du fondateur tracée (Q1–Q3) | ✅ |
| Modèle à profondeur fixe, sans récursion | ✅ |
| Cibles, provenance, estimations et identité d’exécution représentées | ✅ |
| Invariant distance + allure avec codes explicites | ✅ |
| Dérivation déterministe, sans arrondi caché ; DurationEngine unique autorité | ✅ |
| Estimation stockée + recalcul + refus d’un écart (validateur et lecteur) | ✅ |
| Legacy v3 lisible, `UNAVAILABLE_LEGACY`, jamais reconstruit | ✅ |
| Échauffement / retour au calme (Q3) | ✅ |
| Sérialisation déterministe, v4, migration documentée | ✅ |
| Validateur : toutes les catégories de refus exigées | ✅ |
| Contrat SportEngine inchangé ; Strength inchangé | ✅ |
| Métadonnées d’exécution neutres vis-à-vis de l’UI ; rejeu | ✅ |
| Aucune science Running dans le CORE | ✅ |
| Tests, typecheck, lint, architecture verts | ✅ |

### CORE_EXT_R1_HARDENING_GATE = **PASS**

| Critère | Statut |
|---|---|
| Mutation ciblée sur les 6 zones exigées (+ annexe), bornée et reproductible | ✅ (7 lots, 96,84 %) |
| Zones distance / allure, plages, provenance | ✅ 100 % |
| Survivants pertinents corrigés (test ou implémentation) | ✅ (2 comportements + 1 défaut de robustesse) |
| Survivants restants justifiés individuellement | ✅ (31) |
| Propriétés et adversariaux verts | ✅ |

**CORE_EXT_R1_STATUS = IMPLEMENTED_HARDENED**

RunningEngine (vague 1) : **non démarré**.
