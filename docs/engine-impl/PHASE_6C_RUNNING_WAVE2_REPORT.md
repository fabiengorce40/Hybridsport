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

*(Les sections suivantes sont complétées à l'issue de l'implémentation.)*
