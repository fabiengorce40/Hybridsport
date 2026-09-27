# RUNNING-V1-PRODUCTION-ELIGIBILITY — maturité des paramètres et éligibilité à la production (conception)

> **Phase 5G : conception seulement, aucun code.** Même esprit que le verrou scientifique Strength.

## 1. États de maturité d’un paramètre

| État | Signification | Qui fait passer à l’état suivant |
|---|---|---|
| UNRESOLVED | Aucune valeur ou politique | — |
| EXPERT_PROPOSED | Valeur ou politique proposée (5C à 5E), non revue | Expert de programmation |
| EXPERT_APPROVED | Approuvée par l’expert (formulaire) | — |
| PRODUCT_APPROVED | Pour les PRODUCT_GUARDRAIL : approuvée par le fondateur ou le produit | Fondateur |
| TECHNICAL_APPROVED | Pour les paramètres TECHNICAL : revue technique | Équipe technique |
| SAFETY_APPROVED | **Seulement pour les paramètres gouvernés G1** (7 paramètres G1 + V33, V34) : signés par la sécurité | Responsable sécurité (+ cosignature si prévue) |
| PRODUCTION_ELIGIBLE | L’état requis est atteint **et** le ruleset est verrouillé | Gate du ruleset |

**État requis par gouvernance** :

| Gouvernance | État requis |
|---|---|
| G2 (EXPERT_DESIGN_REVIEW, PROGRAMMING_HEURISTIC, CONTEXT_DEPENDENT…) | EXPERT_APPROVED |
| G3 / PRODUCT_GUARDRAIL | PRODUCT_APPROVED (avec EXPERT_APPROVED si la gouvernance est double, par exemple E-DENSITY, E-LOAD) |
| TECHNICAL | TECHNICAL_APPROVED |
| G1 | SAFETY_APPROVED |

**SAFETY_APPROVED n’est pas exigé pour les paramètres non gouvernés par la sécurité.**

## 2. `RunningProductionEligibility` (par capacité)

| Champ | Contenu |
|---|---|
| `capability` | Socle, ou l’un des 11 drapeaux |
| `eligible` | true / false |
| `blockingDecisionIds` | Par exemple `E-PROG` |
| `blockingParameterIds` | Paramètres sous leur état requis |
| `blockingG1PolicyIds` | Par exemple `G1-NOVICE` |
| `reasonCodes` | Par exemple `ELIGIBILITY.PARAMETER_NOT_APPROVED`, `ELIGIBILITY.G1_UNSIGNED`, `ELIGIBILITY.RULESET_NOT_LOCKED`, `ELIGIBILITY.TECHNICAL_DEPENDENCY` |

**Règle d’éligibilité** : `eligible = true` si et seulement si toutes les conditions suivantes sont réunies :
1. le **socle** est éligible (4 G1 signées ; E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD approuvées ; CORE-EXT-R1 implémentée) ;
2. toutes les décisions requises par la capacité sont approuvées ;
3. chaque paramètre utilisé est à son **état requis** ;
4. les politiques G1 requises sont signées ;
5. le ruleset est verrouillé (version figée, provenance complète) ;
6. les dépendances techniques sont satisfaites (par exemple le planificateur pour l’hybride).

**Preuve** : un ruleset de production doit pouvoir **prouver** l’éligibilité de chaque capacité active, avec les décisions, les états et les signatures tracés. Un drapeau activé sans éligibilité ⇒ refus en production.

## 3. État actuel (illustration)

| Capacité | Éligible | Blocages |
|---|---|---|
| Socle | **false** | G1-PAIN, G1-SCOPE, G1-NOVICE, G1-RETURN non signées ; E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD en attente ; CORE-EXT-R1 non implémentée ; ruleset non verrouillé |
| Les 11 drapeaux | **false** | Socle + décisions propres à chacun |
