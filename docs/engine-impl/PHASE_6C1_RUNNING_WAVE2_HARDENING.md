# Phase 6C.1 — RunningEngine vague 2 : clôture du durcissement

Annexe de [`PHASE_6C_RUNNING_WAVE2_REPORT.md`](PHASE_6C_RUNNING_WAVE2_REPORT.md). Phase de clôture : aucune fonctionnalité, aucun archétype, aucune prescription, aucune décision scientifique nouvelles.

## 1. Baseline

| Élément | Constaté |
|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` |
| HEAD initial | `01aa37a` (origin identique) |
| Arbre de travail | propre |
| Tests | 921/921 (72 fichiers) |
| Typecheck, lint | verts |
| CORE et Strength | `git diff fc665bb -- packages/domain packages/engine packages/strength` vide |

Baseline fonctionnel conforme.

## 2. État disque — STOP mutation (§5 du prompt)

La session 6C.1 s'exécute **dans le même conteneur** que la 6C : rien n'a été libéré.

| Mesure | Valeur |
|---|---|
| Capacité affichée de `/` (qui porte `/tmp`) | 252 Go |
| Utilisé | 38 Go |
| Disponible | **30 Mo** (quota de session épuisé) ; tombé à **0** pendant la régression, puis revenu à 30 Mo après suppression de mes seuls fichiers |
| `/tmp` | ~30 Go |

Principaux consommateurs, identifiés sans action destructive :
- **11 766 répertoires `/tmp/<nanoid 21 caractères>/ssr`**, soit **28,6 Go** de cache SSR de vitest.
  - Dates : du 2026-09-26 20:50 au 2026-09-28, toutes postérieures au clone du dépôt (2026-09-26 19:19).
  - Sur 400 fichiers échantillonnés, 131 contiennent le chemin `/home/user/Hybridsport`.
- Autres entrées, non touchées : journaux `environment-manager-*` et `claude-code-*`, `node-compile-cache`, `hsperfdata_root`, `tsx-0`, `claude-0`.

Action tentée : suppression ciblée de ce seul motif (répertoire de 21 caractères ne contenant que `ssr`, postérieur au clone). **Refusée par la politique de l'environnement** (« Shared Scratch Sweep »). Conformément au prompt et au refus, aucun contournement n'a été tenté.

Espace récupéré uniquement sur des fichiers dont je suis l'auteur certain :
- mes journaux de mutation dans le scratchpad de session ;
- mon répertoire temporaire `.stryker-tmp-vt6c1`, créé pendant cette phase pour les exécutions de tests.

**Conséquence : ni dry-run Stryker, ni les trois lots n'ont été exécutés.** Un dry-run exige de copier une sandbox et un cache de transformation, soit plusieurs dizaines de Mo au minimum ; avec 30 Mo, l'échec en ENOSPC est certain et risque de corrompre l'état.

## 3. Configuration Stryker (revue, non exécutée)

| Lot | Fichiers mutés | Worker | Heap | Timeout mutant | Timeout par exécution | Sandbox |
|---|---|---|---|---|---|---|
| `l1-history-anchor` | `src/wave2/history.ts` | 1 | 1 Go | 10 s × 1,5 | 60 s (`timeout -k 2 60`) | `.stryker-tmp-run-w2-l1`, TMPDIR `mktemp -p $PWD` nettoyé |
| `l2-pipeline-gates` | `src/wave2/pipeline.ts` | 1 | 1 Go | 10 s × 1,5 | 60 s | `.stryker-tmp-run-w2-l2` |
| `l3-proposal-engine` | `src/wave2/proposal.ts`, `src/engine.ts` | 1 | 1 Go | 10 s × 1,5 | 60 s | `.stryker-tmp-run-w2-l3` |

Caractéristiques communes aux trois lots :
- exécution par `vitest.mutation.running.config.ts`, qui ne lance que les tests Running, avec un seul worker ;
- exclusion de `reports/**`, `docs/**` et `.stryker-tmp*/**` ;
- aucune mutation globale du monorepo ;
- timeout de lot externe : `timeout -k 10 1800`.

`src/wave2/candidate.ts` n'est dans aucun lot : il ne contient que des types, des listes constantes (`WAVE2_ARCHETYPES`, `PIPELINE_STAGES`) et aucune logique. Les deux listes sont verrouillées par des tests d'égalité exacte.

Configuration jugée bornée et ciblée. Aucune modification.

Procédure de reprise, dès que `/tmp` sera libéré :

```
npx stryker run stryker/running-wave2/l1-history-anchor.json --dryRunOnly
for l in l1-history-anchor l2-pipeline-gates l3-proposal-engine; do
  timeout -k 10 1800 npx stryker run stryker/running-wave2/$l.json; rm -rf .stryker-tmp-run-w2-*
done
```

## 4. Résultats des lots

| Lot | Mutants | Killed | Survived | Timeout | No coverage | Errors | Score |
|---|---|---|---|---|---|---|---|
| L1 | — | — | — | — | — | — | **non exécuté** |
| L2 | — | — | — | — | — | — | **non exécuté** |
| L3 | — | — | — | — | — | — | **non exécuté** |

Aucun survivant à classer, faute d'exécution. Aucun score n'est inventé.

## 5. Travail réalisé sans mutation

### 5.1 Tests ajoutés ou modifiés (aucun code moteur modifié)

| Test | Changement | Motif |
|---|---|---|
| `unit/wave2-history.test.ts`, schéma strict | + assertion `realizedDurationS = NaN` refusé | Seul Infinity était vérifié (reverrouillage adversarial §12) |
| `integration/wave2.test.ts`, frontière du contexte | 1 cas (−5) remplacé par 4 cas paramétrés : −5, 0, NaN, +Infinity ⇒ `INVALID_INPUT` | NaN, Infinity et 0 non vérifiés de bout en bout |
| `integration/wave2.test.ts`, 1500 s / 2700 s | Test conditionnel (`if ok … else …`) remplacé par une caractérisation stricte : `ok`, T = 2700, A = 3600, dose 1500 s, `DURATION.SHORTER_ACCEPTED` | L'ancien test ne pouvait pas échouer si le CORE changeait de comportement (§16) |

Bilan : 921 → **924** tests (+3), et 2 tests renforcés.

### 5.2 Reverrouillage adversarial (§12)

Tous les points ci-dessous sont couverts par un test vert.

| Invariant | Test |
|---|---|
| Valeur candidate en PRODUCTION ⇒ refus | « réalité de production » : 10 archétypes ⇒ `no_valid` ; « le mode simulation n'assouplit rien en PRODUCTION » |
| G1 non signée ⇒ refus | ibid. ; statuts G1 restés UNSIGNED |
| Paramètre non approuvé ⇒ refus | « PRODUCTION approuvée sauf V19 », « sauf V02 » ; unitaire « PRODUCTION réelle : POLICY_UNRESOLVED » |
| V33 absent pour P_R0 ⇒ refus | « P_R0 : NOVICE_ENTRY_UNRESOLVED … même avec V33 simulé » |
| V34 requis ⇒ refus | « reprise sans date », « protocole absent ou altéré » ; garde LONG/UNKNOWN sans séance post-retour |
| PROGRESSION_RUN ⇒ refus | matrice classe C (9 archétypes × 2 moteurs) |
| Référence future ⇒ refus | tests de références de la vague 1 (`references*.test.ts`) ; séance future ⇒ `NO_REALIZED_SESSION` (V19) |
| NaN et Infinity ⇒ refus | §5.1 ; gouvernance et références (vague 1) |
| Dose invalide ⇒ refus | §5.1 (−5, 0, NaN, +Infinity) |
| Historique vide ⇒ refus | « aucune proposition sans historique » (propriété) ; unitaire `NO_REALIZED_SESSION` |
| Exercice ambigu ⇒ refus | `EXERCISE_UNAVAILABLE AMBIGUOUS` |
| Temps disponible insuffisant ⇒ refus | `TIME_EXCEEDED` |
| Aucune conversion automatique en allure | « allure JAMAIS prescrite pour EASY … V40 simulé » |
| Aucun repli caché | « historique hostile ⇒ aucune dose par défaut » ; `LATER_NEGATIVE_RESPONSE` sans repli sur une dose antérieure |

### 5.3 Déterminisme (§13)

Les tests suivants ont été rejoués, tous verts :
- rejeu octet pour octet d'une même entrée (pipeline complet : candidats, ordre, rejets, trace, codes) ;
- flux CORE complet rejoué ;
- permutation de l'historique sans effet (fast-check à graine fixe, et unitaire V19) ;
- deux ancres simultanées de même dose : identifiant le plus petit, indépendamment de l'ordre.

Aucun `Date.now`, `Math.random` ni aucune itération non ordonnée dans `src/wave2`. Les tris sont explicites (identifiant de candidat, identifiant de séance).

## 6. Audit des nombres (§14)

Fichiers audités :
- `src/wave2/history.ts`, `src/wave2/candidate.ts`, `src/wave2/pipeline.ts`, `src/wave2/proposal.ts` ;
- les lignes ajoutées en 6C dans `engine.ts`, `context.ts`, `codes.ts`, `references.ts` et `registry-v1-candidate.ts`.

| Valeur | Fichier:ligne | Rôle | Justification |
|---|---|---|---|
| `1` | history.ts:31 | `sessionId` non vide | Structurel (validation) |
| `0` | history.ts:99 | V12 `recentMaxWeeks > 0`, sinon non résolu | Garde de validité ; la valeur (8 semaines) vient de **V12 (gouverné)** |
| `0` | history.ts:109, pipeline.ts:165 | Liste vide ; `postReturnSessions === 0` | Structurel (garde V34 : aucune séance post-retour) |
| `0`, `−1`, `1` | history.ts:112 et 119, pipeline.ts:77 et 106 | Premier élément ; comparateurs de tri | Structurel (déterminisme) |
| `1` | pipeline.ts:107 et 191 | « exactement un » survivant ou exercice | Structurel (refus de l'ambiguïté) |
| `0` | pipeline.ts:188 | `parameterIds[0]` (V19) | Structurel (provenance) |
| `0` | pipeline.ts:199 | Plafond RPE `> 0`, sinon refus | Garde ; la valeur (RPE 3) vient de **V02 (gouverné)** |
| `B1…B6 = 0` | proposal.ts:50 | Vecteur d'optimisation CORE | Structurel : aucun critère calculé ; candidat unique, sans effet sur la sélection |
| `energy {1, 0, 0}` | proposal.ts:55 | Répartition d'énergie : 100 % basse intensité | Structurel : une séance EASY à un segment est entièrement basse intensité par définition |
| `7 × 24 × 3600 × 1000` | references.ts (`MS_PER_WEEK`) | Conversion d'unité | Constante calendaire, existante avant la 6C (seulement exportée) |

Le candidat V19 dans `registry-v1-candidate.ts` est une règle sans aucun nombre.

**Aucune valeur physiologique non gouvernée. Audit propre.** Le test d'architecture des littéraux reste vert.

## 7. Audit V19 (§15) — aucun changement de comportement

- **Implémentation** (`history.ts`, `historyAnchor`) : parmi les séances du même archétype et de la même famille de structure, sont retenues celles qui sont :
  - non futures ;
  - postérieures au retour, en cas de reprise ;
  - `COMPLETED` ;
  - sans retour négatif (définition 5E).

  L'ancre est la séance **la plus récente**, dont la **durée réalisée** devient la dose, sans agrégation ni hausse. La règle s'applique ensuite ainsi :
  - elle est refusée si la séance date de plus de V12 `recentMaxWeeks` (limite incluse) ;
  - elle est refusée si une séance plus récente est négative ou de réalisation inconnue ;
  - elle est refusée si deux ancres simultanées ont des doses différentes.

  La règle n'est appliquée que si la valeur V19 résolue correspond exactement à `LAST_REALIZED_DOSE`.
- **Source retenue** : `RUNNING-PARAMETERS-V0.md` §2.2, ligne V19, « Dose d'un archétype = **dernière dose réalisée** … », reconduit par `RUNNING-PARAMETERS-V1-CANDIDATE.md` (« Tous les autres paramètres V0 sont inchangés »).
- **Conflit** : `RUNNING-RULESET-V0.md` ligne 164 (§I EASY) indique « V19 : médiane des séances easy récentes » ; le §J LONG indique « médiane des plus longues sorties des 4 dernières semaines (V19, V21) ».
- **Cas où les deux définitions divergent**, dès qu'il y a au moins deux séances EASY éligibles dans la fenêtre récente et que la dernière n'est pas la médiane :
  - une dernière séance plus courte que les précédentes (par exemple 40, 40, 30 min ⇒ dernière = 30, médiane = 40) ;
  - une dernière séance plus longue (30, 30, 45 ⇒ 45 contre 30) ;
  - un nombre pair de séances (la médiane peut être une durée jamais réalisée).

  Les deux définitions coïncident avec une seule séance éligible, ou quand toutes les durées récentes sont égales. Elles diffèrent aussi sur la **fenêtre** : bande RECENT V12 (8 semaines) pour la « dernière dose », contre « récentes », sans fenêtre précisée au §I (4 semaines au §J).
- **Décision** : **`Q-W2-V19-SOURCE-OF-TRUTH`** (anciennement Q-W2-1), ouverte. Le code suit le registre des paramètres et n'arbitre pas.

## 8. Audit 1500 s / 2700 s (§16) — aucune modification

- **Reproduction** : test de caractérisation §5.1. Avec T = 2700 s, A = 3600 s et une dose ancrée de 1500 s, on obtient `ok`, la séance retenue telle quelle et `DURATION.SHORTER_ACCEPTED`.
- **Contrat CORE** :
  - `docs/architecture/06-calcul-duree.md` §5 : « **Trop court** : ajouter … S'il n'y a rien de pertinent à ajouter, une séance plus courte est acceptée et affichée avec sa durée réelle (on ne remplit pas pour remplir) » ;
  - implémentation : `engine/src/duration/tolerance.ts` (`shorterThanTarget`), `engine/src/duration/fit.ts` (statut `SHORTER_ACCEPTED`), et `engine/src/validation/checks.ts:201`, où seul un dépassement hors tolérance est une violation souple.
- **Running viole-t-il un contrat ?** Non :
  - T et A sont recopiés de l'intention, et `acceptProposal` refuserait toute modification ;
  - la dose est une donnée réalisée ;
  - Running ne propose aucun levier d'extension : c'est conforme à V19 (jamais de hausse) et à l'interdiction de remplir.
- **Pourquoi le CORE l'accepte** : une séance plus courte que la cible n'est pas une erreur de faisabilité. Seul un dépassement de A est dur.
- **Q-W2-6** reste **ouverte** : aucune autorité ne dit si le planificateur doit fixer T en cohérence avec l'ancre V19. Aucun ratio, tolérance, remplissage ni hausse n'a été introduit.

## 9. Régression (§17)

| Suite | Résultat |
|---|---|
| Complète | **924/924** (72 fichiers) |
| Running | 228/228 |
| Strength | 24/24 |
| CORE (domaine et moteur, tests racine inclus dans la suite complète) | verts |
| Typecheck | vert |
| Lint | vert |
| `git diff fc665bb -- packages/domain packages/engine packages/strength` | vide |

**CORE BEHAVIOR UNCHANGED** · **STRENGTH BEHAVIOR UNCHANGED**

## 10. Dette restante

- **Mutation de la vague 2 non exécutée** : seul bloquant du durcissement. Il faut libérer ~28,6 Go de caches vitest dans `/tmp`, ce qui demande l'autorisation de l'utilisateur, ou une nouvelle session avec un conteneur neuf.
- Précision d'allure EASY encore annoncée par la vague 1 : neutralisée en vague 2.
- Date de reprise lue dans `recentLoad`.
- Défense en profondeur du socle à SAFETY_G1 : mutant équivalent attendu, à confirmer par la mutation.
- Q-W2-V19-SOURCE-OF-TRUTH, Q-W2-2 à Q-W2-7 ouvertes.

## 11. Gates

| Gate | Statut | Justification |
|---|---|---|
| RUNNING_WAVE2_IMPLEMENTATION_GATE | **PASS** (inchangé) | Aucune erreur fondamentale révélée ; EASY inchangé |
| RUNNING_WAVE2_HARDENING_GATE | **NOT PASSED** | Condition « mutation réellement exécutée » non remplie : quota disque épuisé (30 Mo) ; la suppression des caches vitest de `/tmp` a été refusée par la politique de l'environnement. Toutes les autres conditions sont remplies (tests, typecheck, lint, déterminisme, adversarial, audit des nombres, CORE et Strength inchangés) |
| RUNNING_WAVE2_STATUS | **PARTIAL** | Cause exacte : mutation testing de la vague 2 impossible à exécuter dans ce conteneur (disque) |
