# PHASE 6C — RunningEngine, vague 2 (première vague de prescription)

> Principe directeur : **absence d'autorité = absence de prescription**. La vague 2 ne rend pas le moteur plus audacieux ; elle le rend capable d'agir seulement là où une règle gouvernée existe.

## 1. Baseline vérifié (avant toute modification)

| Contrôle | Attendu | Constaté |
|---|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` | conforme |
| HEAD | `1e7bb38` | conforme |
| Arbre de travail | propre, tout poussé | conforme |
| Tests | 827/827 | 827/827 (70 fichiers) |
| Typecheck, lint | verts | verts |
| CORE et Strength depuis `fc665bb` | diff vide | diff vide |
| Digest F20 (`science-lock.test.ts`) | intact | vert |
| Contrats `packages/running` | vague 1, aucune prescription | `propose` renvoie toujours `no_valid_proposal` |
| Interfaces CORE (`SportEngine`, `acceptProposal`) | inchangées | inchangées |

## 2. Audit de la vague 1 : sources d'autorité de dose

Constats issus du code et des documents gouvernés (le dépôt fait foi) :

1. **Registre code** (`registry-v1-candidate.ts`) : 46 paramètres (31 candidats, 15 non résolus). Il ne contient **aucun paramètre de dose de séance**. En particulier, V19 `running.dose.historyAnchorPolicy` n'y figure pas.
2. **V19 est pourtant un candidat gouverné.** Il est défini dans `RUNNING-PARAMETERS-V0.md` (PROGRAMMING_HEURISTIC, règle sans valeur numérique) : « Dose d'un archétype = **dernière dose réalisée** du même archétype et de la même famille de structure, dans la bande RECENT (V12), sans retour négatif ; sinon paramètre de première exposition (vide ⇒ BLOCKED) ». `RUNNING-PARAMETERS-V1-CANDIDATE.md` précise : « Tous les autres paramètres V0 sont inchangés ». La vague 1 ne l'avait pas importé, puisqu'elle ne prescrivait rien.
3. **Conflit documentaire sur l'agrégation de V19.** `RUNNING-RULESET-V0.md` paraphrase V19 autrement :
   - §I EASY : « médiane des séances easy récentes » ;
   - §J LONG : « **Ancre** : médiane des plus longues sorties des 4 dernières semaines (V19, V21) ».

   La valeur gouvernée est celle du registre des paramètres (« dernière dose réalisée »). Le conflit est **exposé** (question experte Q-W2-1, §9) et n'est pas arbitré par le code.
4. **Dégradations gouvernées** (`RUNNING-5E-FEATURE-DEGRADATION.md`) :
   - E-PROG (V23 vide) ⇒ restauration ou HOLD, aucune hausse ;
   - E-PACE ⇒ RPE seul ;
   - E-FIRST ⇒ pas de première exposition ;
   - E-LONG ⇒ long run en HOLD ou en restauration, compté HD.
5. **Contrat V0 §1** : « feedback absent ⇒ Tolérance UNKNOWN ⇒ HOLD ». Un retour inconnu n'interdit donc pas l'ancre (HOLD = dose inchangée), mais il est tracé.
6. **Intensité EASY** :
   - V02 fournit un plafond RPE 3 (candidat) ;
   - l'allure plafond easy exige V40 (`running.target.easyCeilingPaceMargin`, **non résolu**) et une frontière 1 mesurée (RULESET-V0 §G.3, §I) ;
   - aucun algorithme gouverné ne calcule une allure plafond easy.

   Conséquence : **EASY est toujours à l'effort** en vague 2, quelle que soit la précision annoncée par l'analyse de vague 1. C'est un écart de la vague 1 (elle peut annoncer PACE_RANGE pour EASY), documenté et neutralisé à l'étape de résolution de précision.
7. **Représentation CORE d'un plafond RPE.** CORE-EXT-R1 exige une plage RPE strictement positive. La RFC R1 (règle 5) dit : « `domain = 'easy_low'` ⇒ les plages sont interprétées comme des **plafonds** ». Le plafond V02 = 3 est donc encodé `{min: 3, max: 3}` : aucun plancher n'est inventé.
8. **Profil de tolérance CORE** : spec 07 §3, `fixed_time` = « intervalles et course au temps ». Une séance dosée à la durée utilise ce profil, défini par le CORE et non par Running.
9. **Durée** : le moteur ne calcule aucune durée. L'estimation stockée provient de `withDerivedEstimate` (CORE), et `acceptProposal` interdit de modifier `availableTimeS` ou `targetDurationS`. La compatibilité entre la dose ancrée et la durée cible reste une décision du CORE (tolérance, leviers, refus).
10. **Historique** : l'historique CORE (`FingerprintHistoryEntry`) ne porte aucune dose. La dose réalisée doit venir du `RunningContext` (champ propre à Running, ajout rétrocompatible et facultatif).

## 3. Matrice des archétypes (archétypes réellement présents dans le code)

Légende : A = prescriptible avec règles gouvernées (en gouvernance simulée) ; B = partiel avec dégradations explicites ; C = non prescriptible en vague 2.

| Archétype | Éligibilité existante (vague 1) | Paramètres nécessaires | G1 nécessaires | Intensité prescriptible ? | Volume prescriptible ? | Vague 2 possible ? |
|---|---|---|---|---|---|---|
| EASY | Blocages : socle en PRODUCTION, P_R0 (V33), reprise LONG/UNKNOWN sans séance post-retour (V34), hybride, marathon strict | V19 (ancre, à importer comme candidat), V12 (bande RECENT), V02 (plafond RPE), V40 (allure : **non résolu**) | Socle : G1-PAIN, G1-SCOPE, G1-NOVICE, G1-RETURN ; `running.return.protocol` si reprise | **Effort oui** (V02, plafond 3). **Allure non** (V40 non résolu, aucun algorithme de plafond) | **Oui, en HOLD** : dernière dose réalisée (V19). Aucune hausse (V23 vide) | **A** (gouvernance simulée). PRODUCTION : NO_VALID (socle non signé) |
| LONG | Idem EASY, plus la dégradation HOLD_OR_RESTORE_ONLY (V32) | V19 **en conflit** avec RULESET-V0 §J (médiane des plus longues sorties sur 4 semaines), V32 non résolu, V10 (compté HD : données de densité absentes du contexte) | Socle | Effort (V02) | **Non** : ancre ambiguë entre deux documents gouvernés | **C** |
| THRESHOLD | Première exposition bloquée (V35) | Avec historique : V19 (rejeu d'une structure fractionnée absente du contexte), V06/V07 et V20 (sélection de borne, absent du registre), V08 ou récupérations historiques, V31 non résolu, garde de population P-R2+ et densité (RULESET-V0 §G.3, absentes du code) | Socle | Effort V02 (5–7) ; allure V04 possible | Non : contrat de données de structure et gardes absents | **C** |
| SEVERE | Première exposition bloquée (V36) | V41 non résolu (répétitions : historique seul), V18, V08, V20, densité | Socle | Effort V02 ; allure V18 | Non | **C** |
| SHORT_INTERVAL | Première exposition bloquée (V36) | Idem SEVERE ; filtre d'objectif | Socle | Effort | Non | **C** |
| HILLS | Première exposition bloquée (V37) | Terrain déclaré (absent du contexte), V37, V41 | Socle | Effort seul (jamais d'allure) | Non | **C** |
| RACE_PACE | Bloqué si objectif GENERAL ou marathon sans règle | Modèle non autoritatif (V38, exposant non résolu), V39 non résolu, référence spécifique | Socle | Allure de course seulement sur référence récente à la distance ; jamais extrapolée | Non | **C** |
| TEST | Éligible en vague 1 (effort par nature) | Protocole (RULESET-V0 §Q) : **aucun paramètre** au registre | Socle | Protocole non gouverné | Non | **C** |
| STRIDES | Éligible en vague 1 (effort par nature) | Module (parent EASY ou échauffement) ; V09 (plage), V20 absent ; « après régularité établie » non paramétré | Socle | Descripteur | Non : critère de régularité non décidé, sélection de borne non importée | **C** |
| PROGRESSION_RUN | POST_V1 | — | — | — | — | **C (bloqué)** |

**Réalité de production** : le socle exige 4 signatures G1, 4 décisions expertes et un ruleset verrouillé ; rien n'est signé. **Tous les archétypes, EASY compris, restent `no_valid_proposal` en production.**

## 4. Décision de périmètre

Implémenté en vague 2 : **EASY en HOLD strict**. La dose est la dernière dose réalisée (V19, candidat importé tel que documenté). L'intensité est le plafond RPE V02, à l'effort seul. Aucune hausse, aucune allure, aucune première exposition.

Ce comportement n'est actif que si :
- PRODUCTION : le socle est éligible et chaque paramètre utilisé est PRODUCTION_ELIGIBLE (aujourd'hui : jamais) ;
- CANDIDATE : le moteur a été construit explicitement en **mode simulation** (`simulation: true`). Chaque proposition porte alors `RULE.RUNNING.SIMULATED_PROPOSAL` et les traces CANDIDATE_VALUE_USED.

Hors périmètre (C) : LONG, THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS, RACE_PACE, TEST, STRIDES, PROGRESSION_RUN. Ces archétypes renvoient `no_valid_proposal` avec PRESCRIPTION_NOT_IMPLEMENTED (vague 2) et leurs raisons d'indisponibilité.


## 5. Implémentation

### 5.1 Fichiers Running

| Fichier | Rôle |
|---|---|
| `src/governance/registry-v1-candidate.ts` | V19 importé comme candidat (règle, aucune valeur numérique) ; ruleset `running-0.2.0-candidate` (47 paramètres : 32 candidats, 15 non résolus) |
| `src/context.ts` | `sessionHistory` (doses réalisées), facultatif, `[]` par défaut ; schéma strict |
| `src/wave2/history.ts` | `zRealizedSession`, `sessionNegativeResponse` (5E, niveau séance), `historyAnchor` (V19) |
| `src/wave2/candidate.ts` | Modèle typé du candidat, étapes du pipeline, archétypes et familles de vague 2 |
| `src/wave2/pipeline.ts` | Génération, éligibilité, sécurité/G1, faisabilité, précision, sélection, trace |
| `src/wave2/proposal.ts` | Correspondance candidat → proposition CORE (`run_structure`, `fixed_time`, T et A de l'intention) |
| `src/engine.ts` | Version `0.2.0`, vague `2`, option `simulation`, `prescribe()` (observabilité), `propose()` |
| `src/codes.ts` | 6 codes nouveaux (§5.4) |
| `src/references.ts` | `MS_PER_WEEK` exporté (constante technique existante) |

### 5.2 Pipeline

`RunningContext → Analyse (vague 1) → Génération → Éligibilité → Sécurité/G1 → Faisabilité → Précision → Sélection → Proposition`

| Étape | Règle | Refus (code) |
|---|---|---|
| Génération | Seuls les archétypes de `WAVE2_ARCHETYPES` (EASY) ; une famille de structure (CONTINUOUS) | `PRESCRIPTION_NOT_IMPLEMENTED {archetype, wave: '2'}` + raisons d'indisponibilité |
| Éligibilité | `assessSession` de vague 1 doit être ELIGIBLE ; sinon rejet, **jamais** une séance dégradée | raisons de vague 1 (G1, socle, V33, V34, hybride, marathon strict) |
| Sécurité / G1 | PRODUCTION : socle éligible. CANDIDATE : moteur en simulation. P_R0 et reprise LONG/UNKNOWN sans séance post-retour : refus, même si V33 ou V34 ont une valeur simulée. Reprise en cours : `running.return.protocol` avec `doseCap = AT_MOST_REALIZED_POST_RETURN` | `SIMULATION_REQUIRED`, `NOVICE_ENTRY_UNRESOLVED`, `RETURN_PROTOCOL_UNRESOLVED` |
| Faisabilité | Ancre V19 ; exercice unique du catalogue (discipline, schéma `running`, matériel, exclusions, contre-indications) ; estimation CORE ≤ temps disponible | `DOSE_ANCHOR_UNAVAILABLE {cause}`, `EXERCISE_UNAVAILABLE {NONE|AMBIGUOUS}`, `TIME_EXCEEDED` |
| Précision | Plafond RPE V02 (`EASY_LOW.max`) ; allure **toujours refusée** pour EASY | `UNRESOLVED_PARAMETER` ; dégradation `PRESCRIPTION_PRECISION_REDUCED` (cause `…,EASY_CEILING_PACE_UNGOVERNED`) |
| Sélection | Un candidat par construction ; aucun score ; plusieurs survivants = aucun choix | — |
| Proposition | `run_structure` à un segment `steady` ; estimation par `withDerivedEstimate` (CORE) ; B1–B6 = 0 (aucun critère calculé) ; `energy.low = 1` | — |

Causes de `DOSE_ANCHOR_UNAVAILABLE` :
- POLICY_UNRESOLVED
- RECENCY_UNRESOLVED
- RETURN_START_UNKNOWN
- NO_REALIZED_SESSION
- NOT_RECENT
- LATER_NEGATIVE_RESPONSE
- LATER_SESSION_UNKNOWN
- AMBIGUOUS

### 5.3 Modèle de candidat

`RunningCandidate` trace les éléments suivants :
- `candidateId`, archétype, famille de structure et objectif ;
- l'état des 11 capacités ;
- les paramètres utilisés (identifiant, maturité, candidat ou non) ;
- les références (aucune pour une cible à l'effort) ;
- les 4 statuts G1 ;
- la précision et les dégradations (globales et propres à l'archétype) ;
- la dose (valeur et provenance : V19 + séance d'ancrage) ;
- l'intensité (plafond, source V02) ;
- l'exercice ;
- le rejet éventuel (étape + raisons) ;
- les raisons ;
- la provenance (ruleset, mode, simulation).

### 5.4 Codes de raison nouveaux (documentés et testés)

Aucun code existant n'avait la même sémantique.

| Code | Paramètres | Sens |
|---|---|---|
| `DOSE.RUNNING.DOSE_ANCHOR_SELECTED` | archetype, sessionId, realizedDurationS, feedbackKnown | Séance d'ancrage retenue (V19) |
| `DOSE.RUNNING.DOSE_ANCHOR_UNAVAILABLE` | archetype, cause | Aucune ancre gouvernée ⇒ aucune dose |
| `RULE.RUNNING.SIMULATION_REQUIRED` | mode | Prescription CANDIDATE refusée hors mode simulation |
| `RULE.RUNNING.SIMULATED_PROPOSAL` | rulesetVersion | Marque toute proposition issue de valeurs candidates (simulation) |
| `PLAN.RUNNING.EXERCISE_UNAVAILABLE` | cause, candidates | Aucun exercice de course admissible, ou plusieurs (ambiguïté exposée) |
| `PLAN.RUNNING.TIME_EXCEEDED` | archetype, availableTimeS, estimatedMaxS | Dose ancrée au-delà du temps disponible (Running ne raccourcit jamais) |

Codes réutilisés à sémantique identique : UNRESOLVED_PARAMETER, CANDIDATE_VALUE_USED, PRESCRIPTION_PRECISION_REDUCED, NOVICE_ENTRY_UNRESOLVED, RETURN_PROTOCOL_UNRESOLVED, PRESCRIPTION_NOT_IMPLEMENTED, PROGRESSION_UNRESOLVED, MARATHON_RULE_UNRESOLVED, HYBRID_PLANNER_UNAVAILABLE.

### 5.5 Mode test et mode production

- `createRunningEngine()` : `simulation = false`. En CANDIDATE, aucune prescription (SIMULATION_REQUIRED). En PRODUCTION, tout est bloqué par le socle.
- `createRunningEngine({ simulation: true })` : prescription CANDIDATE autorisée, proposition marquée `SIMULATED_PROPOSAL` et tracée `CANDIDATE_VALUE_USED`. En PRODUCTION, l'option ne change rien.
- La gouvernance « entièrement approuvée » n'existe que dans les fixtures de test (transitions légitimes). Aucune donnée de production n'est modifiée ; les statuts G1 restent UNSIGNED et les décisions PENDING.

### 5.6 Écarts constatés et neutralisés

- La vague 1 peut annoncer `PACE_RANGE` pour EASY (allure activée, montre, référence). La vague 2 ne prescrit jamais d'allure EASY : ni V40 ni un algorithme de plafond d'allure ne sont gouvernés. Le test « allure JAMAIS prescrite pour EASY » le vérifie avec V40 simulé.
- En PRODUCTION, V02 et le protocole de reprise appartiennent au socle : les retirer bloque dès l'éligibilité. Le contrôle de socle de l'étape SAFETY_G1 est une défense en profondeur, inatteignable après l'éligibilité (mutant équivalent attendu).
- Dose ancrée hors tolérance de la durée cible T : Running ne modifie ni la dose ni T (`acceptProposal` l'interdit). Constaté : pour T = 2700 s et une dose de 1500 s, le CORE retient la séance telle quelle (un sous-dépassement n'est pas un refus dur). La cohérence entre T et l'ancre relève du planificateur (§9, Q-W2-6).

## 6. Tests

| Élément | Valeur |
|---|---|
| Total dépôt | **921/921** (72 fichiers) ; baseline 827 |
| Ajoutés | **94** (unitaires ancre V19 : 25 ; intégration vague 2 : 68 ; contrat vague 1 réécrit en vague 2 : +1) |
| Tests vague 1 modifiés | 4 assertions (vague `1` → `2`, SIMULATION_REQUIRED au lieu de PRESCRIPTION_NOT_IMPLEMENTED pour EASY, test d'architecture : une seule émission de proposition, depuis le candidat retenu) |
| Typecheck, lint | verts |

Matrices couvertes :
- **réalité de production** : 10 archétypes × {PRODUCTION, CANDIDATE sans simulation} ⇒ `no_valid` ;
- **gouvernance simulée** : EASY en CANDIDATE + simulation et en PRODUCTION entièrement approuvée ; V19, V02 ou protocole retirés ;
- **classe C** : 9 archétypes × 2 moteurs, historique complet, références et expositions ⇒ aucune séance ;
- **adversarial** :
  - V33 et V34 simulés ;
  - reprise sans date ;
  - hybride ;
  - marathon strict ;
  - restrictions et exclusions ;
  - exercice ambigu ;
  - temps dépassé ;
  - historique hostile ;
  - contexte invalide ;
  - valeurs de règle altérées ;
- **propriétés** (fast-check, graines fixes) :
  - la dose appartient aux doses réalisées et ne dépasse ni leur maximum ni A ;
  - rejeu octet pour octet ;
  - permutation de l'historique sans effet ;
  - aucune proposition sans historique.

## 7. Mutation testing

**STOP (environnement saturé).**

Contrôle avant mutation :
- `/` était plein à 100 % : 30 Mo libres, après suppression de **mes seuls** artefacts ignorés (rapports JSON de mutation 6A/6B, déjà résumés dans les documents commités, et fichiers de mon scratchpad) ;
- la sortie d'une commande a déjà échoué en ENOSPC pendant la phase ;
- la saturation vient d'environ 30 Go de répertoires vitest `/tmp/-xxxx/ssr` laissés par des exécutions interrompues. Leur suppression a été refusée par la politique d'environnement en 6B. Conformément au prompt (« Ne supprime aucun répertoire système ou partagé sans certitude de propriété »), ils n'ont pas été touchés.

Lots préparés, prêts à exécuter une fois l'espace libéré (bornés, un worker, heap 1 Go, timeout 60 s par exécution, TMPDIR local nettoyé) :

| Lot | Cible |
|---|---|
| `stryker/running-wave2/l1-history-anchor.json` | `src/wave2/history.ts` |
| `stryker/running-wave2/l2-pipeline-gates.json` | `src/wave2/pipeline.ts` |
| `stryker/running-wave2/l3-proposal-engine.json` | `src/wave2/proposal.ts`, `src/engine.ts` |

Commande par lot : `timeout -k 10 1800 npx stryker run stryker/running-wave2/<lot>.json && rm -rf .stryker-tmp-run-*`.

## 8. Audits

- **Nombres magiques** :
  - fichiers d'algorithme de vague 2 : seulement 0 et 1, plus des comparateurs et indices structurels ; B1–B6 = 0 et `energy` {1, 0, 0} décrivent la structure et ne sont pas des scores ;
  - aucune valeur de programmation hors du registre de données ;
  - V19 est une règle sans nombre ;
  - le test d'architecture (littéraux non justifiés, `1.06`, noms interdits, calcul de durée) est vert.
- **CORE et Strength** : `git diff fc665bb -- packages/domain packages/engine packages/strength` est **vide** ; F20 est intact. Aucune modification CORE n'a été nécessaire.
- **Durée** : aucune durée n'est calculée par Running. L'estimation vient de `withDerivedEstimate` (CORE) ; la dose est une donnée réalisée d'entrée.

## 9. Décisions expertes restantes (nouvelles en 6C)

| # | Question | Effet tant que non décidé |
|---|---|---|
| Q-W2-1 (Q-W2-V19-SOURCE-OF-TRUTH) | Agrégation de V19 : « dernière dose réalisée » (registre des paramètres) ou « médiane des séances récentes » (RULESET-V0 §I) ? | EASY suit la valeur du registre ; la divergence est documentée |
| Q-W2-2 | Ancre LONG : V19 ou « médiane des plus longues sorties sur 4 semaines » (RULESET-V0 §J) ; V32 | LONG non prescriptible (C) |
| Q-W2-3 | Après un retour négatif : règle de « baisse vers la dernière dose réussie » quand celle-ci n'est pas inférieure | Refus (LATER_NEGATIVE_RESPONSE) |
| Q-W2-4 | STRIDES : critère « après régularité établie » ; import de V20 (sélection de borne) | STRIDES non prescriptible (C) |
| Q-W2-5 | Séances de qualité avec historique : contrat de données de structure réalisée, gardes de population P-R2+ et densité V10 | THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS non prescriptibles (C) |
| Q-W2-6 | Cohérence entre la durée cible du planificateur et l'ancre V19 (le CORE accepte une séance plus courte que T) | Le CORE décide ; aucun ajustement par Running |
| Q-W2-7 | Exercice de course : correspondance archétype ↔ exercice du catalogue en cas de pluralité | Refus (EXERCISE_UNAVAILABLE AMBIGUOUS) |

Décisions de la phase 5 toujours ouvertes : 14 décisions expertes PENDING ; 4 G1 UNSIGNED ; ruleset non verrouillé ; paramètres non résolus : V23, V28 (5K, 10K, semi), V31–V37, V39–V41, exposant V38, nombre minimal de V42.

## 10. Dette

- Mutation de la vague 2 non exécutée (environnement saturé ; lots prêts).
- Écart de précision EASY de la vague 1 : neutralisé en vague 2, non corrigé dans `targetPrecision` (comportement de vague 1 conservé).
- `sessionHistory` et `recentLoad.returnStartedAt` : la date de reprise est lue dans `recentLoad`. Un champ dédié serait plus lisible (changement de contrat à décider).
- Défense en profondeur du socle à l'étape SAFETY_G1 : mutant équivalent attendu.

## 11. Gates

| Gate | Statut | Justification |
|---|---|---|
| RUNNING_WAVE2_IMPLEMENTATION_GATE | **PASS** | Pipeline complet ; EASY prescriptible là où l'autorité existe (simulation ou approbation) ; production inchangée (no_valid partout) ; CORE et Strength intacts ; 921 tests, typecheck et lint verts |
| RUNNING_WAVE2_HARDENING_GATE | **NOT PASSED (incomplet)** | Tests adverses et de propriétés verts, mais la mutation exigée n'a pas pu être exécutée (disque saturé, STOP conforme au prompt) |
| RUNNING_WAVE2_STATUS | **PARTIAL** | Implémenté et testé ; durcissement par mutation en attente d'espace disque |

## 12. Suite : phase 6C.1

Clôture du durcissement : voir [`PHASE_6C1_RUNNING_WAVE2_HARDENING.md`](PHASE_6C1_RUNNING_WAVE2_HARDENING.md). Mutation toujours non exécutée (disque) ; gates inchangés : IMPLEMENTATION PASS, HARDENING NOT PASSED, STATUS PARTIAL.
