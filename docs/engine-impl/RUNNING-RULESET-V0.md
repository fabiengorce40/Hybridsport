# RUNNING-RULESET-V0 — ruleset candidat Running (logique théorique, non exécutable)

> **Corrections 5D** ([`RUNNING-5D-PARAMETER-ARBITRATION.md`](RUNNING-5D-PARAMETER-ARBITRATION.md)) :
> - §E conflit : gravité ordinale (V43), et non plus un seuil de 6 % ;
> - §F mise à jour : rapportée à la variabilité typique (V42), et non plus 3 % ;
> - §Y : « bande habituelle » remplacée par RecentLoadContext ;
> - §R et §S : V11 devient une séparation forte par défaut (exception sur demande du planificateur) ;
> - §T : restauration vers le démontré et baisse vers la dernière dose réussie, sans V23.

> **Phase 5C, documentation seulement.** Aucun code RunningEngine ; CORE et Strength inchangés ; CORE-EXT-R1 reste une RFC.
>
> - Les valeurs citées renvoient aux tags de [`RUNNING-PARAMETERS-V0.md`](RUNNING-PARAMETERS-V0.md) (V01–V41).
> - Les codes de raison sont conceptuels.
> - Mode d’exécution : **CANDIDATE** (valeurs sous G1 non signées autorisées dans les goldens, jamais en production).

---

## B. Corrections intégrées avant le ruleset

| # | Correction | Intégration |
|---|---|---|
| B1 | Correspondance G1 : 4 politiques ↔ 7 paramètres | Table exacte dans [`RUNNING-G1-REVIEW-PACK.md`](RUNNING-G1-REVIEW-PACK.md) §1 ; aucun paramètre G1 orphelin |
| B2 | UNKNOWN_RETURN_STATE ≠ MODERATE | §X : UNKNOWN reste UNKNOWN (confiance réduite, prescription conservatrice, demande d’information, limitation de périmètre possible). Documents 5B corrigés : arbitrage §T, registre V0, plan de tests T-RET-01, rapport 5B, revue G1. |
| B3 | Confiance ≠ éligibilité | §G : `SessionEligibilityDecision`, distincte de REFERENCE_CONFIDENCE et PRESCRIPTION_CONFIDENCE. Une confiance faible réduit la **précision** (plages plus larges, RPE, calibration), pas automatiquement l’**éligibilité**. Documents corrigés : modèle de références 5A §Z.3 et T-CONF-01. |
| B4 | Profondeur de CORE-EXT-R1 | RFC mise à jour : profondeur fixe contre récursion bornée ; recommandation finale **profondeur fixe** |

---

## E. Choix de la référence

### E.1 Procédure (pour chaque décision)
1. **Candidates** : références valides pour la grandeur visée (5B §E).
2. **Récence** (V12) : RECENT / AGING / STALE, en tenant compte des interruptions.
3. **Tri ordinal** : validité du protocole > spécificité > récence > fiabilité > accord. Pas de pondération.
4. **Conflit** (V13) : si deux références valides divergent de plus de 6 % à la distance de la décision, `REF.CONFLICT` ; la prescription retient l’estimation **la plus prudente** ; confiance −1 niveau ; calibration proposée.
5. **Sortie** : référence retenue (ou aucune) + niveau de confiance + codes de raison.

### E.2 Cas

| Cas | Référence retenue | Confiance (pour une décision à la même distance) | Codes |
|---|---|---|---|
| Une course récente, distance de la décision | La course | HIGH (conditions normales, aucun conflit) | `REF.RECENT_SPECIFIC` |
| Une course récente, autre distance | La course, **transformée** : interpolation impossible avec une seule course ; extrapolation seulement si V38 est défini (vide ⇒ pas d’allure) | MEDIUM au plus ; aucune allure si V38 est vide | `REF.RECENT_NONSPECIFIC`, `PERF.EXTRAPOLATION_MODEL_UNDEFINED` |
| Plusieurs courses cohérentes | Interpolation si elles encadrent la distance | HIGH si elles sont récentes et encadrent la distance | `REF.MULTIPLE_COHERENT`, `PERF.INTERPOLATED` |
| Courses en conflit | La plus prudente | −1 niveau | `REF.CONFLICT`, `PERF.CONFLICT_CONSERVATIVE`, `REF.CALIBRATION_REQUIRED` |
| Course ancienne (AGING / STALE) | La course, dégradée | AGING : −1 ; STALE : LOW | `REF.STALE_REVIEW`, `REF.CALIBRATION_REQUIRED` (STALE) |
| Test de terrain (FIELD_THRESHOLD) | Le test, pour la frontière 2 seulement | MEDIUM au plus (plafond 5B) | `REF.FIELD_THRESHOLD_CAPPED` |
| Test CS | CS pour la frontière 2 ; D’ informative | ≥ 3 essais et corroborée (V17) : peut dépasser MEDIUM ; 2 essais : MEDIUM au plus (V16) | `REF.CS_CORROBORATED` ou `REF.CS_UNCORROBORATED` |
| Observations d’entraînement | Observations (borne basse, preuve de baisse, ou de hausse si COHERENT) | MEDIUM au plus (V15, V29) | `REF.TRAINING_OBSERVATIONS` |
| Déclaration seule | Déclaration | LOW | `REF.DECLARED_ONLY`, `REF.CALIBRATION_REQUIRED` |
| Aucune référence | Aucune | aucune ; aucune allure | `REF.NONE`, `REF.CALIBRATION_REQUIRED` (si l’éligibilité au test le permet) |
| Référence en désaccord avec l’entraînement | Si les observations sont COHERENT et plus lentes : baisse ; si plus rapides : hausse seulement selon §F | Selon §F | `REF.TRAINING_DISAGREEMENT` |

**Aucune date d’expiration universelle** : STALE entraîne une dégradation et une demande de calibration, pas une suppression.

---

## F. Mise à jour de la performance estimée

| Décision | Conditions | Codes |
|---|---|---|
| `HOLD` | Aucune preuve nouvelle ; ou preuve insuffisante (séance isolée) ; ou contexte perturbé | `PERF.HOLD` |
| `UPDATE_UP` | Nouvelle course, contre-la-montre ou test standardisé ; **ou** COHERENT_TRAINING_EVIDENCE (V15). Si la hausse est substantielle (> 3 %, V14), la preuve doit être une performance **ou** des observations cohérentes, et la confiance issue d’observations reste au plus MEDIUM. | `PERF.UPGRADE_EVIDENCE`, `PERF.UPGRADE_FROM_OBSERVATIONS` |
| `UPDATE_DOWN` | Observations cohérentes plus lentes que la référence (même règle V15, asymétrie : une baisse est acceptée à confiance égale ou moindre) ; ou interruption (V12, V24) | `PERF.DOWNGRADE_OBSERVATIONS`, `PERF.DOWNGRADE_BREAK` |
| `REQUEST_CALIBRATION` | Référence STALE, conflit non résolu, déclaration seule, ou retour après LONG ou UNKNOWN (après les conditions de reprise, V25) ; seulement si un test est éligible (§Q) | `REF.CALIBRATION_REQUIRED` |

**COHERENT_TRAINING_EVIDENCE** : défini en V15. **Une séance isolée ne suffit jamais** (`PERF.SINGLE_SESSION_IGNORED`).

---

## Confiances (rappel et règles)

| Confiance | Portée | Règle |
|---|---|---|
| REFERENCE_CONFIDENCE | Une estimation de capacité, pour une décision | §E : tri ordinal ; récence ; conflits |
| PRESCRIPTION_CONFIDENCE | Une séance prescrite | **Minimum** des facteurs limitants (5A §Z.2) : spécificité, récence, nombre d’observations, accord, spécificité de l’objectif, contexte déclaré, historique de l’archétype, statut de reprise |
| SESSION_ELIGIBILITY | Le droit de proposer un archétype | §G, **décidée séparément** |

**Effet de la confiance de prescription** (V03, `eligibility.targetClassByConfidence`) :
- HIGH ⇒ cible FULL (plage d’allure ±3 %) ;
- MEDIUM ⇒ cible BROAD (±6 %, ou borne dérivée comme V05) ;
- LOW ⇒ RPE seul.

Elle **ne change pas** à elle seule l’éligibilité.

---

## G. Éligibilité des séances (`SessionEligibilityDecision`)

### G.1 Structure

| Champ | Contenu |
|---|---|
| `archetype` | Un des 11 |
| `decision` | `ELIGIBLE_FULL_TARGET` / `ELIGIBLE_BROAD_TARGET` / `ELIGIBLE_RPE_ONLY` / `NOT_ELIGIBLE` |
| `eligibilityBasis` | Facteurs d’éligibilité évalués (voir ci-dessous) |
| `targetClassBasis` | Confiance de prescription et sources de cible |
| `blockedBy` | Paramètre vide qui empêche la dose (le cas échéant) : `PRESCRIPTION_BLOCKED_BY_PARAMETER` |
| `reasonCodes` | Codes |

### G.2 Deux étapes indépendantes
1. **Éligibilité** (OUI / NON), selon :
   - le niveau ;
   - l’historique de l’archétype ;
   - la charge récente (LCA) ;
   - la tolérance (retours) ;
   - la phase ;
   - l’objectif ;
   - les contraintes G1 (NOVICE_ENTRY, RETURN, PAIN) ;
   - la charge concurrente et le contexte du planificateur ;
   - la densité (V10, V11).
2. **Classe de cible** (si éligible), selon la **confiance de prescription** et la disponibilité des signaux : FULL / BROAD / RPE_ONLY. **L’absence d’allure fiable ne rend jamais une séance inéligible** : elle la rend RPE_ONLY.

### G.3 Table d’éligibilité par archétype

| Archétype | Éligible si (tous) | NOT_ELIGIBLE si (un seul) | Classe de cible |
|---|---|---|---|
| EASY_RUN | Toujours (y compris P-R0, en alternance course / marche) | OUT_OF_SCOPE ; douleur (PAUSE) ; dose P-R0 non définie ⇒ BLOCKED (V33) | RPE plafond (allure indicative seulement si LAB frontière 1, V40) |
| LONG_RUN | P-R1 et plus ; historique de sortie la plus longue disponible (V19) | P-R0 ; RETURN non levé ; UNKNOWN_RETURN_STATE ; densité dépassée | RPE plafond ; portions spécifiques selon historique (V39) |
| STEADY_RUN | P-R2 et plus ; phase ≠ RETURN | P-R0, P-R1 ; RETURN | BROAD (RPE 4–5 + allure si frontière 1 connue) ; sinon RPE_ONLY |
| THRESHOLD | P-R2 et plus ; historique THRESHOLD (V19) **ou** V35 défini ; densité OK | P-R0, P-R1 ; RETURN LONG / UNKNOWN non levé ; densité ; sans historique ⇒ **BLOCKED** (V35 vide) | FULL / BROAD si frontière 2 en allure (V04) ou plafond V05 ; sinon RPE_ONLY (5–6) |
| VO2_INTERVALS | P-R2 et plus ; historique SEVERE (V19) ; densité OK | P-R0, P-R1 ; RETURN ; sans historique ⇒ BLOCKED (V36) | FULL / BROAD via ancre 3–5 km (V18) ; sinon RPE_ONLY (7–8) |
| SHORT_INTERVALS | P-R2 et plus ; historique ; objectif 5K / 10K / GENERAL | idem VO2 | idem VO2 |
| HILL_REPETITIONS | P-R2 et plus ; côte déclarée ; historique (V37) | Sans côte ; sans historique ⇒ BLOCKED ; charge concurrente jambes HIGH (avis IM) | **RPE seul** + durée + instruction de terrain (jamais d’allure) |
| STRIDES (module) | Parent EASY ou échauffement d’une séance de qualité ; P-R1 et plus, après régularité établie | P-R0 ; RETURN non levé ; douleur | Descripteur (V02) |
| RACE_PACE_SESSION | Objectif de course ; P-R2 et plus ; phase DEVELOPMENT / SPECIFIC / TAPER ; historique de travail du même domaine | RETURN ; P-R0, P-R1 | FULL si référence RECENT à la distance de l’objectif (V03) ; sinon RPE_ONLY (allure objectif non validée = jamais une cible) |
| PROGRESSION_RUN | Catalogue seulement : **non sélectionné automatiquement en V1** (§P) | — | — |
| TEST_SESSION | §Q | §Q | Protocole |

---

## H. Modalités de cible

| Archétype | Hiérarchie (du signal prioritaire au secondaire) | NO_WEARABLE |
|---|---|---|
| EASY_RUN | DOMAIN (EASY_LOW) → RPE plafond 3 → HR plafond (référence individuelle) → PACE indicative | RPE plafond ; durée |
| LONG_RUN | DOMAIN → RPE plafond → HR (attention à la dérive) → PACE indicative | idem |
| STEADY_RUN | DOMAIN → MULTI_SIGNAL (RPE 4–5 + PACE si frontière 1) → HR | RPE 4–5 |
| THRESHOLD | DOMAIN → PACE (FULL / BROAD) ou RPE 5–6 → HR secondaire | RPE 5–6, répétitions à la **durée** |
| VO2_INTERVALS | DOMAIN → PACE (ancre V18) ou RPE 7–8 → (HR inadaptée) | RPE 7–8, répétitions à la durée |
| SHORT_INTERVALS | DOMAIN → RPE / PACE | RPE, durée |
| HILL_REPETITIONS | DOMAIN → RPE → durée + terrain | idem |
| STRIDES | Descripteur | idem |
| RACE_PACE_SESSION | PACE (FULL) → RPE | RPE « effort de course » ; allure affichée comme information si connue |
| TEST_SESSION | Protocole (effort maximal ou étalonné) | Temps chronométré manuellement, distance connue (piste ou parcours mesuré déclaré) |

**NO_WEARABLE** (`running.target.noWearableMode`) :
- **priorité RPE** ; toute répétition en distance peut basculer en durée (en séance) ;
- retours manuels : durée, RPE, complétion, conformité déclarée ;
- `weeklyDistance` reste UNKNOWN si elle n’est pas déclarée ;
- la LCA s’appuie sur la durée.

**HR n’est jamais requise.**

---

## I. EASY_RUN

| Élément | Règle |
|---|---|
| Finalité | Volume aérobie de faible intensité, toléré ; support de la fréquence |
| Niveaux | Tous (P-R0 : alternance course / marche, dose V33 **vide**) |
| Cible | Plafond RPE 3 (V02) ; plafond FC seulement sur référence individuelle ; plafond d’allure seulement si frontière 1 mesurée (V40) |
| Durée | Ancrée sur l’historique (V19 : médiane des séances easy récentes) ; progression par la variable dominante (§T) ; bornée par le temps disponible |
| Philosophie | Plafond, pas cible ; courir plus lentement n’est pas un échec ; `targetCompliance = ABOVE` est un signal de tolérance |
| Fatigue visée | Faible ; jamais HIGH_DEMAND (V30) |
| Concurrent | Placement libre ; peut servir de variable d’ajustement (V `week.rebalanceRule`) |
| Variante `LOW_DOSE_RECOVERY` | Durée inférieure à la médiane easy ; P-R2 et plus |

---

## J. LONG_RUN

| Entrée | Rôle |
|---|---|
| Objectif | GENERAL, 5K, 10K : endurance générale ; semi : importante ; marathon : centrale |
| Niveau | P-R1 et plus |
| Charge hebdomadaire récente | Bande habituelle (V21) de `weeklyDuration` |
| Historique de long run | **Ancre** : médiane des plus longues sorties des 4 dernières semaines (V19, V21) |
| Phase / temps restant | Portions spécifiques en SPECIFIC (V39) ; réduction en TAPER |
| Charge concurrente | HOLD si en hausse ; placement arbitré par IM et GP |
| Tolérance | HOLD si retours négatifs |

**Règles**
- Durée = ancre, progression seulement si `longRunDuration` est la variable dominante.
- Magnitude vide (V23) ⇒ HOLD tant que l’expert n’a pas défini SMALL, MODERATE et LARGE.
- **Aucun pourcentage du volume hebdomadaire.** Toute borne future sera EXPERT_DESIGN_REVIEW (`running.longRun.boundPolicy`, vide).

**Cas**

| Profil | Comportement |
|---|---|
| Novice (P-R0) | Pas de LONG_RUN distincte |
| Athlète 10K | Ancre sur l’historique, rôle non central ; HOLD par défaut |
| Semi | Candidate variable dominante quand l’écart à l’objectif le justifie |
| Marathon | Centrale ; sans historique long ⇒ confiance de prescription LOW (5B) et portions spécifiques BLOCKED (V39) |
| Hybride | HIGH_DEMAND (V30, défaut conservateur) ; soumise à l’arbitrage de placement |

---

## K. THRESHOLD (stimulus) : structures CONTINUOUS / INTERVALS

- **Éligibilité** : §G. CONTINUOUS réservé à P-R3 et plus, ou confiance ≥ MEDIUM (5B).
- **Durée de travail** : somme du temps en THRESHOLD_LIKE ; ancrée sur l’historique (V19) ; première exposition BLOCKED (V35).
- **Récupération** (INTERVALS) : ratio 0,20–0,35 (V08), mode JOG.
- **Variables de progression** : durée de travail totale **ou** durée des répétitions **ou** réduction des récupérations **ou** passage d’INTERVALS à CONTINUOUS, une seule à la fois (§T).

**Cible selon les données**

| Données | Cible | Classe |
|---|---|---|
| Seuil mesuré (LAB LT2 / MLSS) | 100–105 % de l’allure mesurée (V04) + RPE 5–6 | FULL ou BROAD selon la confiance |
| CS seule | Corroborée (V17) : 100–105 % de l’allure CS (V04) ; non corroborée : BROAD au plus | BROAD (2 essais ⇒ MEDIUM) |
| 10K récent seul | Frontière 2 non estimable (Q-THR-3) ⇒ **RPE 5–6 + plafond « pas plus vite que l’allure 10K »** (V05) | BROAD (borne seulement) |
| Semi récent seul | Q-THR-2 non vérifiée ⇒ RPE 5–6 ; **aucune borne dérivée** du semi | RPE_ONLY |
| Observations d’entraînement seules | COHERENT (V15) ⇒ allure observée ± 6 % (MEDIUM) + RPE ; sinon RPE_ONLY | BROAD ou RPE_ONLY |
| Confiance LOW | RPE 5–6 | RPE_ONLY (éligibilité inchangée) |

**Jamais** « allure seuil = allure 10K ».

---

## L. VO2 / SEVERE

| Élément | Règle |
|---|---|
| Répétition de travail | Durée issue de l’historique (V19, V41 vide) ; en distance seulement si PACE est prioritaire |
| Travail total | Somme des répétitions ; ancré sur l’historique ; première exposition BLOCKED (V36) |
| Récupération | Ratio 0,5–1,0 (V08), JOG ou WALK |
| Cible | Ancre course de 3 à 5 km ± V03 (V18) ; sinon RPE 7–8 ; **VO2max jamais requis** |
| Niveaux | P-R2 et plus |
| Progression | Nombre de répétitions **ou** durée des répétitions (une seule) |
| Contraintes de fatigue | HIGH_DEMAND ; V10, V11 ; jamais en RETURN non levé ; jamais placée pour rattraper une séance |

---

## M. SHORT_INTERVALS (PROGRAMMING_HEURISTIC)

- **Pourquoi il existe** : outil opérationnel pour exposer l’athlète à la vitesse et au domaine sévère par des répétitions **courtes**, plus faciles à tenir et à fractionner qu’une série VO2 longue.
- **Apport opérationnel** : fractionnement fin (bon pour les débuts de travail sévère), exposition à des allures proches de celles du 5K, et variante lorsque les répétitions longues sont mal tolérées.
- **Quand il est préféré** : objectif 5K ou 10K ; retours négatifs sur VO2_INTERVALS longs ; séance plus courte imposée par le temps.
- **Quand il est inutile** : marathon et semi en phase SPECIFIC ; P-R1 ; athlète sans historique sévère (BLOCKED).
- **Pas de physiologie distincte revendiquée** : même domaine (SEVERE) que VO2_INTERVALS ; la différence porte sur la structure et la mécanique (vitesse).

---

## N. HILL_REPETITIONS

- **Cible** : **RPE** (courtes : descripteur « puissant, relâché » ; longues : 7–8), **durée**, **instruction de terrain** (« côte régulière, praticable, sans descente technique »). **Aucune pente universelle** (V37 vide) ; pas d’allure absolue.
- **Demande mécanique** : montée MODERATE à HIGH, descente HIGH si rapide ⇒ récupération en descente **au trot lent ou à la marche** (demande HIGH de la chaîne postérieure et des mollets).
- **Blocage** : sans historique, BLOCKED (V37).

---

## O. Module STRIDES

| Élément | Règle |
|---|---|
| Séances parentes éligibles | Fin d’EASY_RUN ; préparation de THRESHOLD, VO2, SHORT, RACE_PACE ou TEST |
| Finalité | Qualité neuromusculaire, relâchement, préparation |
| Placement | Après la partie continue (EASY) ou à la fin de l’échauffement (qualité) |
| Volume | 4–6 × 15–20 s (V09) |
| Récupération | Complète, 45–90 s marche ou trot (V09) |
| Limite | **Pas automatique** : au plus sur une séance EASY par semaine, plus les préparations de qualité (PROGRAMMING_HEURISTIC) ; jamais pour P-R0 ; jamais en RETURN non levé |

---

## P. PROGRESSION_RUN

- **Intérêt** : transition d’intensité dans une séance ; variété.
- **Stimulus** : pas de stimulus unique (mélange MODERATE → HEAVY), donc aucune cible de domaine propre.
- **Décision V1** : **conservé au catalogue, non sélectionné automatiquement par la composition V1.** Il peut être représenté (segments `steady` successifs dans CORE-EXT-R1), mais la composition ne le choisit pas tant qu’un expert ne lui a pas attribué un rôle distinct de STEADY ou de LONG avec portion spécifique.

---

## Q. TEST_SESSION

| Élément | Règle |
|---|---|
| Qui | P-R1 et plus, sans signal de douleur, hors RETURN non levé ; **jamais P-R0 en test maximal** (G1 NOVICE_ENTRY) |
| Quand | Calibration demandée (§F) ; espacé des séances HIGH_DEMAND (V11) ; compte comme HIGH_DEMAND ; **remplace** une séance de qualité, ne s’ajoute pas |
| Pourquoi | Référence STALE, conflit, déclaration seule, retour (après levée), confiance insuffisante pour la décision visée |
| Type | Contre-la-montre de 3 à 5 km (performance, ancre sévère V18), ou 10 km pour un objectif 10K ; essais CS (≥ 3, V16) seulement pour P-R3 et plus |
| Mises à jour possibles | La grandeur mesurée par le protocole (5B §E) ; jamais une autre grandeur sans transformation tracée |

---

## R. Composition hebdomadaire

**Entrées** : objectif, phase, fréquence (intention du planificateur), niveau, historique de charge, temps restant, séances concurrentes, éligibilité, confiance.

**Ordre de composition** (`week.compositionPolicy`, EXPERT_DESIGN_REVIEW) :
1. **Nombre de séances** = intention du GlobalPlanner, **≥ V26** (sinon mode maintien).
2. **Séances HIGH_DEMAND autorisées** = min(V10 selon le niveau, créneaux permis par V11, décision du planificateur en P-HYBRID).
3. **Séance KEY** : choisie selon l’objectif et la phase, parmi les archétypes éligibles :

| Objectif · phase | Candidates KEY (ordre de préférence) |
|---|---|
| 5K · DEVELOPMENT / SPECIFIC | SEVERE (VO2 / SHORT) · RACE_PACE (5K) · THRESHOLD |
| 10K | THRESHOLD · SEVERE · RACE_PACE (10K) |
| Semi | THRESHOLD · LONG_RUN · STEADY · RACE_PACE (semi) |
| Marathon | LONG_RUN (avec ou sans portion spécifique) · THRESHOLD · STEADY |
| GENERAL | EASY · STRIDES · THRESHOLD si P-R2 et plus |
| Toute · FOUNDATION | EASY · LONG_RUN · STRIDES |
| Toute · TAPER | Séance courte du domaine spécifique (volume réduit, V27) |

4. **LONG_RUN** si l’objectif le justifie et si la fréquence le permet (≥ 3 séances), sinon intégrée dans une EASY plus longue.
5. **Complément** en EASY (variante `LOW_DOSE_RECOVERY` si besoin).
6. **Rééquilibrage** : si une dimension non dominante sort de sa bande habituelle, raccourcir les EASY d’abord (`week.rebalanceRule`).

**Sorties** : intentions de séance (archétype, priorité, stimulus, durée estimée, charge estimée, demandes, contraintes de placement), transmises au GlobalPlanner.

La **TID est calculée après coup** et tracée (`TID.EMERGENT`). **Aucune cible 80/20.**

---

## S. Séance à forte demande (`HIGH_DEMAND_RUNNING_SESSION`)

Définition par le **contenu** (V30) :
- intensité (travail en THRESHOLD_LIKE ou SEVERE) ;
- durée de travail (seuil V31 vide ⇒ toute quantité compte) ;
- demande mécanique (≥ HIGH) ;
- taille de la séance (LONG_RUN désignée ; marge V32 vide ⇒ défaut conservateur) ;
- densité (V10, V11).

Le module STRIDES ne rend jamais une séance HIGH_DEMAND.

**Usages** : placement (V11), récupération, séances manquées (§W), interférence (demandes transmises à l’IM).

Les défauts conservateurs sont **tracés** (`DEMAND.DEFAULT_CONSERVATIVE`) ; ce ne sont pas des valeurs silencieuses.

---

## T. Variable de progression dominante

**Candidates** : `weeklyDuration`, `weeklyDistance`, `frequency`, `longRunDuration`, `intervalVolume`, `repDuration`, `recoveryDuration`, `sessionDensity`, `intensity`, `specificity`.

**Procédure** :
1. **Conditions de HOLD** (une suffit) :

| Condition | Code |
|---|---|
| Adhérence faible | `PROG.HOLD_LOW_ADHERENCE` |
| LCA défavorable | `PROG.HOLD_LOAD_CHANGE` |
| Confiance insuffisante pour une progression d’intensité | `PROG.HOLD_LOW_CONFIDENCE` |
| Charge concurrente en hausse | `PROG.HOLD_CONCURRENT_LOAD` |
| Proximité de l’épreuve (PEAK / TAPER) | `PROG.HOLD_EVENT_PROXIMITY` |
| Reprise non levée (V25) | `PROG.HOLD_RETURN_REQUIREMENTS` |
| Douleur | `PROG.HOLD_PAIN_PAUSE` |
| Dimension structurante UNKNOWN | `PROG.HOLD_UNKNOWN_DIMENSION` |
| Bornes de magnitude vides (V23) | `PROG.HOLD_MAGNITUDE_UNDEFINED` |

2. Sinon, candidates = table de ruleset (phase × objectif × niveau, EXPERT_DESIGN_REVIEW). Départage ordinal : écart à l’objectif > temps restant > variable la moins récemment progressée > charge concurrente.
3. **Une seule variable en UP** ; les autres en HOLD ou DOWN.
4. **Changement à dose égale** : autorisé même quand V23 est vide, **seulement si aucune dimension de charge ni aucune variable structurelle progressable ne change** (`PROG.EQUAL_DOSE_CHANGE`). Passer d’INTERVALS à CONTINUOUS modifie `recoveryDuration`, et allonger les répétitions modifie `repDuration` : ce sont des progressions qui exigent V23. En pratique, ce cas est rare. **Conséquence 5C : toutes les semaines golden sont en HOLD**, et V23 est un bloquant majeur (revue d’expert).

**HOLD n’est pas un échec** : c’est une décision tracée.

---

## U. Magnitude

- SMALL, MODERATE et LARGE restent des **catégories opérationnelles** ; **V23 est vide** (EXPERT_DESIGN_REVIEW).
- Aucune frontière n’est décrite comme un seuil biologique.
- Seul garde-fou chiffré : V22 (P-R0 et P-R1, PRODUCT_GUARDRAIL).

---

## V. Taper

| Entrée | Utilisation |
|---|---|
| Épreuve et distance | Éligibilité (épreuve datée) ; durée (V28 **vide**) |
| Niveau | Éligibilité (charge accumulée suffisante) |
| Charge antérieure | Base de la réduction (médiane V21 des semaines précédant le taper) |
| Temps restant | Seule la **dernière semaine** avant l’épreuve est traitée tant que V28 est vide |
| Fatigue récente | HOLD ou DOWN supplémentaire, sans valeur |
| Fréquence | Maintenue (`running.taper.frequencyMaintenance`) |

| Sortie | Règle |
|---|---|
| Direction du volume | DOWN, **dans la plage de signal 41–60 %** (V27), présentée comme plage ; valeur par épreuve vide |
| Direction de l’intensité | Maintenue (séance courte du domaine spécifique) |
| Direction de la fréquence | Maintenue |
| Spécificité | Séances courtes à allure ou effort spécifique |

**Jamais** `mandatoryVolumeReduction = 0,50`.

---

## W. Séances manquées

| Cas | Décision | Détail | Codes |
|---|---|---|---|
| EASY manquée | **DROP** | Aucune compensation | `REPLAN.DROP_EASY` |
| LONG manquée | **MOVE** si un créneau respecte V11 et le temps disponible ; sinon **REPLACE** par une EASY plus longue **dans la bande habituelle** ; sinon DROP | Jamais adjacente à une HIGH_DEMAND | `REPLAN.MOVE_LONG`, `REPLAN.REPLACE_LONG_WITH_EASY`, `REPLAN.DROP_LONG` |
| THRESHOLD manquée | **MOVE** si créneau conforme ; sinon **DROP** | La séance KEY suivante reste inchangée | `REPLAN.MOVE_KEY`, `REPLAN.DROP_NO_VALID_SLOT` |
| SEVERE manquée | **MOVE** si créneau conforme ; sinon **DROP** | Jamais placée la veille ou le lendemain d’une HIGH_DEMAND | idem |
| Plusieurs séances manquées | **REPLAN_WEEK** | Base récente recalculée sur le réalisé (V21) ; HOLD de progression | `REPLAN.WEEK_REPLANNED`, `PROG.HOLD_LOW_ADHERENCE` |
| Séance partiellement faite | **REDUCE** (considérée faite avec la dose réalisée) | Aucune compensation | `REPLAN.PARTIAL_ACCEPTED` |

**Jamais `MAKE_UP_VOLUME`.** La zone gelée (24 h) est respectée. Ordre de décision : séances importantes à venir > récupération > spécificité > volume compatible.

---

## X. Reprise après interruption

**États** (V24) : SHORT, MODERATE, LONG, **UNKNOWN**. UNKNOWN **n’est jamais converti** en un autre état.

| État | Références | Archétypes | Dose | Progression | Autre |
|---|---|---|---|---|---|
| SHORT | Inchangées (bande V12 inchangée) | Tous ceux éligibles | Ancre V19 | Normale | — |
| MODERATE | −1 bande (V12) | Pas de TEST maximal la première semaine | Ancre V19, sans hausse | HOLD jusqu’à V25 | — |
| LONG | STALE ⇒ LOW | EASY seulement (+ STRIDES après V25) | Si des séances post-retour existent : ≤ durées réalisées depuis le retour (V19 sur celles-ci) ; sinon dose de départ **V34 vide (G1) ⇒ BLOCKED** | HOLD jusqu’à V25, puis protocole LONG | G1 RETURN_PROTOCOL |
| **UNKNOWN** | Confiance réduite (STALE) | Structure conservatrice (ci-dessous) | Seulement si des séances post-retour existent (V19 sur celles-ci) ; sinon **BLOCKED** | HOLD | Demande d’information ; limitation de périmètre si la raison est médicale |

**Structure conservatrice pour UNKNOWN** (valeur du paramètre G1 `running.return.unknownStateHandling`), **sans pourcentage** :
1. **Aucun archétype HIGH_DEMAND** ni test maximal.
2. **Fréquence** ≤ la fréquence récente réalisée (depuis le retour), jamais supérieure à celle d’avant l’interruption.
3. **Durées** ≤ les durées réellement réalisées depuis le retour ; sinon aucune dose (BLOCKED).
4. **Cible** RPE seule (plafond easy).
5. **Demande d’information** : durée de l’interruption, raison (sans diagnostic), douleur actuelle, course depuis le retour.
6. Si la raison déclarée est médicale ou une douleur : gouvernance douleur (PAIN_STOP) ou OUT_OF_SCOPE.
7. La progression reste en HOLD tant que V25 n’est pas satisfait **et** que l’état n’a pas été résolu en SHORT, MODERATE ou LONG par l’information reçue.

---

## Y. Règles de charge (10 dimensions)

| Dimension | Autorité | Mesure | Si inconnue | Détection de changement | Interaction avec la progression |
|---|---|---|---|---|---|
| `weeklyDuration` | RE | MEASURED (saisie) | UNKNOWN (la semaine n’est pas comptée dans V21) | Hors bande V21 ; V22 (P-R0–1) | Variable candidate |
| `weeklyDistance` | RE | MEASURED si déclarée | **UNKNOWN**, jamais reconstruite par l’allure | idem si mesurée | Candidate seulement si mesurée |
| `runFrequency` | GP / RE | MEASURED | — | Hors bande | Candidate ; dominante ⇒ durée hebdomadaire maintenue dans la bande (redistribution) |
| `longRunDuration` | RE | MEASURED | UNKNOWN ⇒ LONG_RUN non progressable | Hors bande | Candidate |
| `highIntensityExposure` | RE | DERIVED (archétype × travail réalisé) | UNKNOWN si les retours manquent | Hors bande | Candidate (`intensity`, `intervalVolume`) |
| `moderateHeavyExposure` | RE | DERIVED / ESTIMATED | UNKNOWN | Hors bande | idem |
| `mechanicalExposure` | RE | ESTIMATED (ordinal) | Estimée par défaut sur l’archétype | Hausse de classe | Contraint le placement |
| `sessionDensity` | RE / GP | DERIVED | — | V10, V11 | Candidate |
| `concurrentLocomotorLoad` | autres moteurs / IM | ESTIMATED | **UNKNOWN, jamais 0** | Hausse ⇒ HOLD | Bloquante si en hausse |
| `internalLoadSRPE` | RE | MEASURED si sRPE saisie | UNKNOWN | Hors bande | Signal de tolérance |

**Aucun score global. Aucun ACWR. Aucun UNKNOWN → 0.**

Classes de la LCA : WITHIN_HABITUAL, INCREASE_UNCLASSIFIED (V23 vide), MULTI_DIMENSION_INCREASE (refusé), LARGE_INCREASE (V22), OUT_OF_SCOPE.

---

## Z. Demandes pour l’interférence (table ordinale candidate)

Statut : PROGRAMMING_HEURISTIC / EXPERT_DESIGN_REVIEW. Ce ne sont **pas des unités physiologiques**. RunningEngine fournit ces demandes ; le GlobalPlanner place les séances.

| Archétype | Mécanique | Métabolique | Locomotrice | Récupération |
|---|---|---|---|---|
| EASY_RUN | LOW | LOW | MODERATE | LOW |
| EASY_RUN (`LOW_DOSE_RECOVERY`) | LOW | LOW | LOW | LOW |
| LONG_RUN (selon la durée) | MODERATE → HIGH | MODERATE | HIGH → VERY_HIGH | HIGH |
| STEADY_RUN | MODERATE | MODERATE | MODERATE | MODERATE |
| THRESHOLD (INTERVALS) | MODERATE | HIGH | MODERATE | MODERATE |
| THRESHOLD (CONTINUOUS) | MODERATE | HIGH | MODERATE | HIGH |
| VO2_INTERVALS | HIGH | VERY_HIGH | HIGH | HIGH |
| SHORT_INTERVALS | HIGH | HIGH | HIGH | MODERATE |
| HILL_REPETITIONS | HIGH | HIGH | VERY_HIGH | HIGH |
| STRIDES (module) | LOW | LOW | LOW | LOW |
| RACE_PACE_SESSION | selon le domaine de l’objectif | selon le domaine | MODERATE → HIGH | MODERATE → HIGH |
| TEST_SESSION (maximal) | HIGH | VERY_HIGH | HIGH | VERY_HIGH |

`structuralDemand` : structures principales (compatibles avec la dérivation par structure de l’`InterferenceAssessment` Strength, non modifiée) ; transmise avec chaque demande de séance.
