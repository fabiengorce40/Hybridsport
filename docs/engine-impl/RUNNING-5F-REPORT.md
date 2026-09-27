# Phase 5F — RUNNING V1 SCOPE FREEZE & HUMAN REVIEW HANDOFF : rapport

> **Documentation seulement.**
>
> - **CORE UNCHANGED**
> - **STRENGTH UNCHANGED**
> - **CORE-EXT-R1 NOT IMPLEMENTED**
> - **RUNNING ENGINE CODE NOT STARTED**
> - **NO HUMAN DECISION AUTO-MADE**
> - **NO G1 AUTO-SIGNED**

## 1. État

| Contrôle | Résultat |
|---|---|
| Branche / HEAD de départ | `claude/fitness-app-architecture-81fs92` / `d924aa1` (fin 5E) |
| Tests / typecheck / lint / architecture | 630 verts ; verts |
| Décisions ouvertes | 14 expertes ; 4 G1 non signées ; V23, V33, V34 non résolus ; CORE-EXT-R1 READY_FOR_APPROVAL seulement |
| Recherche scientifique nouvelle | Aucune |
| Nouvelles valeurs numériques | 0 |

## 2. Livrables

| # | Fichier |
|---|---|
| 1 | [`RUNNING-5F-SCOPE-OPTIONS.md`](RUNNING-5F-SCOPE-OPTIONS.md) |
| 2 | [`RUNNING-5F-FEATURE-MATRIX.md`](RUNNING-5F-FEATURE-MATRIX.md) |
| 3 | [`RUNNING-5F-BLOCKER-AUDIT.md`](RUNNING-5F-BLOCKER-AUDIT.md) |
| 4 | [`RUNNING-5F-EXPERT-MEETING-PACK.md`](RUNNING-5F-EXPERT-MEETING-PACK.md) |
| 5 | [`RUNNING-5F-SAFETY-REVIEW-PACK.md`](RUNNING-5F-SAFETY-REVIEW-PACK.md) |
| 6 | [`RUNNING-5F-DECISION-ORDER.md`](RUNNING-5F-DECISION-ORDER.md) (ordre + plan de séance) |
| 7 | [`RUNNING-5F-PRE-SIGNOFF-IMPLEMENTATION-MAP.md`](RUNNING-5F-PRE-SIGNOFF-IMPLEMENTATION-MAP.md) |
| 8 | [`RUNNING-SCIENTIFIC-DEBT-V1.md`](RUNNING-SCIENTIFIC-DEBT-V1.md) |
| 9 | `RUNNING-5F-REPORT.md` |

**Documents mis à jour** (reclassement seulement) :
- `RUNNING-5E-BLOCKER-DEPENDENCIES.md` (bandeau : les bloquants sont de verrouillage et de production, pas de code) ;
- `RUNNING-V1-MINIMUM-SCIENTIFIC-SCOPE.md` (renvoi au SCOPE A) ;
- `PHASE3-LOG.md`.

## 3. Audit de conception de CORE-EXT-R1 (section H)

| Critère | Résultat |
|---|---|
| Profondeur fixe | ✓ (§8) |
| Sérialisation | ✓ (JSON strict, identifiants de segment stables) |
| Rétrocompatibilité | ✓ (additive ; `session_record` v4 ; un lecteur v3 refuse) |
| Validation | ✓ (règles 1–8) |
| Calcul de durée | ✓ (estimations dérivées) — **point d’intégration** ci-dessous |
| Séries et répétitions ; blocs multiples ; récupérations | ✓ |
| Plages d’allure, RPE et FC ; domaine | ✓ |
| Sans montre | ✓ (l’effort suffit) |
| Cases à cocher ; minuteur ; reprise | ✓ (adresse sur 4 entiers) |
| Historique ; retours ; analytique | ✓ |
| Compatibilité hybride future | ✓ (champ `modality`) |

**Contradictions non résolues : aucune.**

**Points d’intégration à trancher lors de l’approbation** (ce ne sont pas des contradictions) :
1. **Dose en distance sans plage d’allure.** La durée est alors inconnue (`UNKNOWN_DURATION_COMPONENT`), alors que la contrainte de durée du CORE est dure (p90 ≤ temps disponible). Le ruleset impose déjà des répétitions à la **durée** en l’absence de plage (NO_WEARABLE, RPE seul) ; la validation doit l’exiger formellement.
2. **Estimations stockées ou toujours recalculées** (question §7 de la RFC).
3. **Échauffement et retour au calme** : segments internes ou blocs CORE séparés. Le double placement recommandé doit être tranché par règle.

**CORE_EXT_R1_DESIGN_RECOMMENDATION = READY_FOR_HUMAN_APPROVAL** (Claude n’approuve pas).

## 4. Gel des entrées golden (section N)

Les entrées de R1–R12 ont été vérifiées pour leur cohérence interne : sommes hebdomadaires, médianes, plus longues sorties, références et allures calculées (R2, R3, R4, R5, R6, R7, R9, R11, R12). **Aucune contradiction trouvée.**

- Les compléments d’entrées de la 5D (R4 : plus longues sorties 75 / 80 / 90 / 80) sont cohérents avec la médiane 5C (80).
- R3-DOWN est une **variante** documentée, pas une modification de R3.

**RUNNING_GOLDEN_INPUTS_V1_FROZEN = YES.** Les décisions humaines changeront les **sorties**, pas les entrées.

## 5. Gates

### RUNNING_5F_SCOPE_FREEZE_GATE

| Critère | Statut |
|---|---|
| Rôles de signature clarifiés | ✅ (politique de sécurité produit, revue de programmation, frontière clinique) |
| Aucune certification inventée | ✅ (question réglementaire renvoyée au conseil juridique) |
| Périmètres A / B / C complets | ✅ |
| Matrices des séances complètes | ✅ |
| Types de bloquants corrigés | ✅ |
| CORE-EXT-R1 audité | ✅ |
| Formulaire expert utilisable | ✅ (14 fiches courtes) |
| Formulaire sécurité utilisable | ✅ (politique séparée de la dose) |
| Ordre des décisions | ✅ |
| Composants implémentables avant signature identifiés | ✅ |
| Entrées R1–R12 figées | ✅ |
| Dette scientifique priorisée | ✅ |
| Aucune nouvelle valeur, aucune décision automatique, aucun changement de code | ✅ |

**RUNNING_5F_SCOPE_FREEZE_GATE = PASS**

### RUNNING_PRE_IMPLEMENTATION_STATUS = **SCOPE_DECISION_REQUIRED**

Le choix entre A, B et C est une décision humaine préalable : il détermine quelles revues expertes et de sécurité sont nécessaires. Les états suivants ne sont pas forcés.

## 6. Synthèse (points 9 à 36 du rapport demandé)

### 6.1 Périmètres

| Périmètre | Contenu | Décisions obligatoires |
|---|---|---|
| **A — minimal** | P-R1 à P-R4 : général, 5K, 10K, semi (sauf P-R1), dégradés ; RPE seul ; restauration ou HOLD ; pas de première exposition ; exclus : P-R0, marathon, premier départ après une longue coupure | **8** : G1-PAIN, G1-SCOPE, G1-RETURN (politique), G1-NOVICE (politique) + E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD |
| **B — standard** | P-R1 à P-R4 jusqu’au semi, avec allures, premières expositions, extrapolation ≤ semi, taper hors marathon ; progression selon E-PROG ; exclus : P-R0, marathon, premier départ après une longue coupure | **15** : A + E-PACE, E-PROG, E-LOAD, E-FIRST, E-MODEL, E-TAPER, E-VARIABILITY |
| **C — étendu** | B + marathon (allure par calibration), P-R0 (si V33 est signée), premier départ après une longue coupure (si V34 est signée) | **20** : B + E-LONG, E-RECOVERY, E-QUALITY + doses V33 et V34 |

### 6.2 Bloquants corrigés
- **Bloquants de code** : **aucune** décision scientifique ou de sécurité ; seul l’**approbation de CORE-EXT-R1** en est un (et, partiellement, l’intégration au planificateur pour P-HYBRID).
- **Bloquants de verrouillage du ruleset** : E-RPE, E-DENSITY, E-RECENCY, E-RECENTLOAD, les 4 G1 (politiques) ; plus toute décision dont l’option retenue exige des valeurs.
- **Bloquants de production** : les 4 politiques G1 + le verrouillage du ruleset.
- **Bloquants de fonction** : V34, E-PROG, E-LONG, E-TAPER, E-FIRST, E-MODEL.
- **Bloquants de population** : V33 (P-R0), E-LOAD (P-R1), E-LONG (marathon).

### 6.3 Revue de sécurité
- **Rôles** :
  - responsable de la sécurité produit (requis) pour les 4 politiques ;
  - expert de programmation pour les doses V33 et V34, cosignées par la sécurité ;
  - relecture clinique **recommandée, pas établie comme obligatoire** pour les formulations PAIN et les déclencheurs SCOPE et RETURN ;
  - aucune certification réglementaire établie par nos preuves.
- **Novice** : politique (P-R0 pris en charge ou non) séparée de la dose (première exposition A / B / C / KEEP BLOCKED ; GRONORUN n’est ni prouvé sûr ni optimal).
- **Reprise** : politique (contextes pris en charge, frontières, UNKNOWN, falaise à 28 jours) séparée de la dose (prescription avant toute donnée post-retour : rien, c’est-à-dire NO_VALID, ou une dose signée).

### 6.4 Dossiers et ordre
- **CORE-EXT-R1** : READY_FOR_HUMAN_APPROVAL ; 0 contradiction ; 3 points d’intégration.
- **Dossier expert** : 14 décisions. **Dossier sécurité** : 6 formulaires (PAIN, SCOPE, NOVICE politique, NOVICE dose, RETURN politique, RETURN dose).
- **Ordre des décisions** :
  1. périmètre ;
  2. G1-SCOPE → G1-NOVICE et G1-RETURN (politiques) → doses ;
  3. E-RECENTLOAD → E-PROG et E-LOAD ;
  4. E-DENSITY → E-QUALITY et E-LONG ;
  5. E-PROG → E-LONG ;
  6. E-VARIABILITY → E-PACE (option B) et E-MODEL ;
  7. E-FIRST → E-RECOVERY et E-QUALITY (option C) ;
  8. marathon dans le périmètre → volet marathon d’E-TAPER.
- **Plan de séance** : 6 blocs (périmètre ; frontières de sécurité ; intensité et cibles ; composition et charge ; progression ; populations et fonctions spéciales).
- **Implémentable avant signature, en mode non production** :
  - types, références, confiances, éligibilité, domaines, archétypes ;
  - RecentLoadContext, LCA, codes de raison, sélection déterministe ;
  - registre scientifique typé avec blocage de la production ;
  - logique de composition, de progression et de reprise (valeurs injectées) ;
  - harnais golden (invariants).
  - Après approbation de la RFC : CORE-EXT-R1 et les séances structurées.
  - Production : après les signatures seulement.

### 6.5 Gel et dette
- **Entrées golden figées** : YES.
- **Dette à résoudre avant production** : correspondance RPE, acceptation de RecentLoadContext, politique de reprise et frontières, densité et récence ; plus V33 et V34 si périmètre C, E-FIRST si option A, E-PROG si option B ou C.
- **Dette à valider pendant la bêta** : incertitude d’allure, variabilité, récupérations, magnitude (si restauration seulement), Riegel ≤ semi, taper et long run hors marathon, réglage de la fenêtre de charge.
- **Dette après V1** : long run et taper marathon (hors C), modèle intégrant l’entraînement, variabilité individualisée, contexte lissé ; V33 et V34 hors C.

### 6.6 Contrôles de discipline
- Nouvelles valeurs : **0**.
- Décisions ou signatures automatiques : **0**.
- Concepts d’architecture introduits : **0**.

STOP.
