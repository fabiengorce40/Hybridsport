# Phase 5D — RUNNING PARAMETER EVIDENCE & EXPERT ARBITRATION : rapport

> **Documentation seulement.**
>
> - **CORE UNCHANGED**
> - **STRENGTH UNCHANGED**
> - **CORE-EXT-R1 NOT IMPLEMENTED**
> - **RUNNING ENGINE CODE NOT STARTED**

## 1. État

| Contrôle | Résultat |
|---|---|
| Branche | `claude/fitness-app-architecture-81fs92` |
| HEAD de départ | `81a02d3` (fin 5C) |
| Tests | 630 verts sur 56 fichiers (avant et après) |
| Typecheck / lint / architecture | verts |
| CORE | LOCKED, aucun fichier modifié |
| Strength | technique LOCKED ; scientifique LOCKED_PROVISIONAL |
| Code RunningEngine | absent |
| PubMed | toujours inaccessible ; 8 recherches web (SEARCH_SUMMARY) |

## 2. Livrables

| # | Fichier |
|---|---|
| 1 | [`RUNNING-5D-PARAMETER-ARBITRATION.md`](RUNNING-5D-PARAMETER-ARBITRATION.md) |
| 2 | [`RUNNING-PARAMETERS-V1-CANDIDATE.md`](RUNNING-PARAMETERS-V1-CANDIDATE.md) |
| 3 | [`RUNNING-PARAMETER-EVIDENCE-MATRIX.md`](RUNNING-PARAMETER-EVIDENCE-MATRIX.md) |
| 4 | [`RUNNING-PARAMETER-SENSITIVITY-V1.md`](RUNNING-PARAMETER-SENSITIVITY-V1.md) |
| 5 | [`RUNNING-EXPERT-REVIEW-PACK.md`](RUNNING-EXPERT-REVIEW-PACK.md) |
| 6 | [`RUNNING-G1-REVIEW-PACK.md`](RUNNING-G1-REVIEW-PACK.md) (mis à jour, non signé) |
| 7 | [`RUNNING-GOLDEN-PRESCRIPTIONS-V1-CANDIDATE.md`](RUNNING-GOLDEN-PRESCRIPTIONS-V1-CANDIDATE.md) |
| 8 | [`RUNNING-RECENT-LOAD-CONTEXT.md`](RUNNING-RECENT-LOAD-CONTEXT.md) |
| 9 | `RUNNING-5D-REPORT.md` |

**Documents 5C mis à jour** (bandeaux et corrections acceptées seulement) :
- `RUNNING-PARAMETERS-V0.md` ;
- `RUNNING-RULESET-V0.md` ;
- `RUNNING-PARAMETER-SENSITIVITY-V0.md` ;
- `RUNNING-GOLDEN-PRESCRIPTIONS-V0.md` ;
- `RUNNING-5C-REPORT.md` ;
- `PHASE3-LOG.md`.

## 3. Gates

### RUNNING_5D_PARAMETER_ARBITRATION_GATE

| Critère | Statut |
|---|---|
| Toutes les familles ciblées revues (P1–P17 + 6 règles transverses) | ✅ |
| Chaque valeur chiffrée a une provenance | ✅ (23 sur 23) |
| Règles 3 %, 6 % et 3 observations gouvernées | ✅ (V42, V43, règle B2 ; V15 configurable) |
| RecentLoadContext remplace la « bande sûre » | ✅ |
| Le min / max sur 4 semaines n’est pas présenté comme une science | ✅ |
| Fréquence 2 correctement classée | ✅ (PRODUCT_GUARDRAIL, périmètre) |
| Séparation des jours durs non absolue | ✅ (STRONG_DEFAULT_SEPARATION) |
| Calcul du taper explicite | ✅ (R11 : base → réduction → résultat) |
| Correspondance RPE consciente de l’incertitude | ✅ (bandes chevauchantes) |
| V23 résolu ou non résolu justifié | ✅ (non résolu, justifié ; restauration et baisse démontrées) |
| V31 / V32 résolus ou non résolus justifiés | ✅ (non résolus, justifiés) |
| V33 / V34 résolus ou restent bloqués à bon droit | ✅ (restent bloqués, G1) |
| R1–R12 relancés | ✅ |
| Aucune valeur inventée | ✅ |
| Aucune nouvelle architecture | ✅ (0) |
| Aucun code RunningEngine ; CORE et Strength inchangés | ✅ |

**RUNNING_5D_PARAMETER_ARBITRATION_GATE = PASS**

### RUNNING_PARAMETER_READINESS

| Valeur | Évaluation |
|---|---|
| NOT_READY | Non |
| PARTIALLY_ARBITRATED | Dépassé : toutes les familles ciblées sont arbitrées ou justifiées non résolues |
| **READY_FOR_EXPERT_REVIEW** | **Oui** : dossier expert compact (16 décisions), tout HIGH_SENSITIVITY identifié |
| READY_FOR_SAFETY_REVIEW | Non : V33 et V34 n’ont pas de valeur à soumettre (des options seulement) ; les décisions d’expert (V23, densité) conditionnent le contexte G1 |
| READY_FOR_IMPLEMENTATION_REVIEW | Non |

**RUNNING_PARAMETER_READINESS = READY_FOR_EXPERT_REVIEW** (non forcé).

## 4. Synthèse (points 9 à 49 du rapport demandé)

### 4.1 Paramètres chiffrés
- **Familles revues** : 23 (P1–P17 + conflit, mise à jour, 3 observations, RecentLoadContext, fréquence 2, jours consécutifs).
- **Chiffrés retenus** (valeur inchangée) : 17 (V01, V03, V04, V06–V10, V12, V15, V16, V18, V22, V24–V27).
- **Chiffrés modifiés** : 2 (V02 bandes chevauchantes ; V21 → RecentLoadContext) ; plus 4 nouveaux (V42 variabilité typique, V43 gravité du conflit, V38 Riegel ≤ semi, V28 marathon 2–3 semaines) ; V11 requalifié, V26 renommé.
- **Chiffrés retirés** : 2 constantes (6 % pour V13, 3 % pour V14) et le plancher min de V21.
- **Non résolus** : 12 (V23, V31, V32, V33, V34, V35, V36, V37, V28 hors marathon, V39, V40, V41).
- **Provenance des 23 valeurs actives** :

| Provenance | Nombre |
|---|---|
| SOURCE_DERIVED | **1** |
| SOURCE_INFORMED | **6** |
| EXPERT_PROPOSED | **11** |
| PRODUCT_GUARDRAIL | **3** |
| TECHNICAL | **2** |

### 4.2 Décisions
- **Règle des 3 %** : retirée comme constante. La mise à jour dépend du type de preuve et de l’amélioration rapportée à V42 (≤ 1× HOLD ; 1–2× UPDATE jusqu’à MEDIUM ; > 2× calibration). Le comportement aux bornes est ordinal et borné.
- **Règle des 6 %** : retirée comme constante. Gravité ordinale NONE / MINOR (enveloppe) / MAJOR (> 2 × V42), avec la même borne prudente de part et d’autre de la frontière.
- **3 observations / 2 semaines** : défaut configurable (PROGRAMMING_HEURISTIC), non validé, avec une règle qualitative de cohérence obligatoire.
- **RecentLoadContext** : médiane et maximum démontré sans retour négatif sur N = 4 semaines ; semaine manquante = UNKNOWN ; moins de 2 semaines connues ⇒ UNKNOWN ; reprise ⇒ semaines post-retour seulement ; ni bande de sécurité, ni ACWR.
- **Fréquence minimale** : `minimumPlannerRunningFrequency` = 2, PRODUCT_GUARDRAIL de périmètre ; aucune affirmation sur l’effet d’une séance par semaine.
- **Jours durs consécutifs** : STRONG_DEFAULT_SEPARATION ; exception sur demande du GlobalPlanner (P-R3+) ; jamais générée par le moteur en V1 (PRODUCT_GUARDRAIL).
- **V23 progression** : pas de magnitude universelle ; restauration vers le démontré et baisse vers la dernière dose réussie ; une nouvelle hausse reste bloquée ; les futures magnitudes seront propres à chaque variable.
- **V31 dose de qualité** : aucun minimum universel ; familles par type de séance ; défaut conservateur tracé.
- **V32 long run** : aucune borne ni aucun pourcentage ; l’historique est pertinent (associations au marathon) ; logique adaptative + EXPERT_DESIGN_REVIEW.
- **V33 novice** : vide ; R1 BLOCKED_G1 ; options présentées au référent (dont le protocole GRONORUN, non retenu).
- **V34 reprise** : vide ; R8 BLOCKED_G1 ; distinction non médical / inconnu / douleur / hors périmètre.
- **V02 RPE** : CR-10 uniquement ; bandes chevauchantes ; combinaison avec le contexte ; NO_WEARABLE intact.
- **V03 / V04 allure** : ±3 % / ±6 % conservés (SOURCE_INFORMED par Hopkins) ; marge du seuil 0–5 % (EXPERT_PROPOSED) ; le seuil n’est jamais une allure exacte.
- **V08 récupération** : mécanisme soutenu, valeurs EXPERT_PROPOSED par type de séance ; pas de ratio universel.
- **V10 densité** : maximum par 7 jours et séparation par défaut ; HD défini par le contenu.
- **V12 récence** : 3 catégories ordinales ; bornes heuristiques.
- **V22 forte hausse** : PRODUCT_GUARDRAIL (saut de programme, erreur de donnée) ; plafonnement au lieu d’un refus.
- **V24 frontières de reprise** : conservées ; falaise conservatrice à 28 jours signalée au dossier G1.
- **V27 / V28 taper** : réduction 41–60 % (SOURCE_DERIVED, non imposée à toutes les épreuves) ; marathon 2–3 semaines (SOURCE_INFORMED, Smyth 2021) ; autres épreuves : vide.
- **V35–V37 premières expositions** : vides ; principe « prudent → observer → adapter ».
- **V38 extrapolation** : Riegel pour une cible ≤ semi (Vickers 2016), confiance ≤ MEDIUM, plage ±6 % ; marathon exclu ; VDOT non retenu ; exposant à confirmer à la lecture de la source.

### 4.3 Goldens
- **R1–R12** : 10 VALID_PROVISIONAL (R2–R7, R9–R12), **2 BLOCKED_G1** (R1, R8), 0 VALID, 0 OUT_OF_SCOPE.
- **R4 modifié** : restauration du long run à 90 min ; allure semi disponible (283–319 s/km).
- **Démonstrations de progression** :
  - HOLD (R3) ;
  - progression candidate (R4, restauration 80 → 90) ;
  - baisse (variante R3-DOWN vers 3 × 6, séance de 37 min).
  - Aucune valeur inventée.
- **Taper R11** : base 240 ; réduction 41–60 % ; volume 96,0–141,6 min ; semaine proposée 96 (réduction 60 %), pire cas 137 (réduction 42,9 %) ; travail de seuil 10 min (réduction 58,3 %) ; fréquence 4 maintenue ; intensité maintenue ; durée du taper semi non définie.

### 4.4 Bloquants
- **HIGH_SENSITIVITY restants** :
  - chiffrés : V02, V03, V04, V08, V10, V12, V22, V24, V27, V38, V42, V43 ;
  - vides : V23, V31, V32 (+ V33, V34 en G1).
- **Revue experte** : 16 décisions (E1–E16), en priorité V23, V38, V42 et V43.
- **G1** : 0 sur 4 politiques signées ; V33 et V34 vides ; question sur la falaise de V24.
- **Scientifiques** :
  - PubMed inaccessible : Claude reste à SEARCH_SUMMARY ;
  - aucune source pour la dose de progression, les premières expositions, le long run (bornes), le taper hors marathon ou la dose de reprise ;
  - exposant de Riegel non relu.
- **Techniques** :
  - approbation puis implémentation de CORE-EXT-R1 ;
  - conversion des goldens et des 88 cas de test en tests exécutables ;
  - corrections des documents d’architecture.

### 4.5 Architecture
**NEW_ARCHITECTURAL_CONCEPTS_INTRODUCED = 0** (audit dans l’arbitrage, section AC ; 3 FUTURE_RFC consignées, non intégrées).

## 5. Confirmations

- **CORE UNCHANGED**
- **STRENGTH UNCHANGED**
- **CORE-EXT-R1 NOT IMPLEMENTED**
- **RUNNING ENGINE CODE NOT STARTED**

STOP : la phase 5E n’est pas commencée.
