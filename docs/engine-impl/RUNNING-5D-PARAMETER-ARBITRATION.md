# RUNNING-5D-PARAMETER-ARBITRATION — arbitrage des paramètres Running

> **Phase 5D : documentation seulement.** Pas de nouvelle architecture, pas de nouvel archétype, pas de code RunningEngine ni CORE, Strength inchangé, CORE-EXT-R1 reste une RFC.
>
> Démarche : science → incertitude → plage candidate → sensibilité → gouvernance.
> - Preuves : [`RUNNING-PARAMETER-EVIDENCE-MATRIX.md`](RUNNING-PARAMETER-EVIDENCE-MATRIX.md).
> - Valeurs : [`RUNNING-PARAMETERS-V1-CANDIDATE.md`](RUNNING-PARAMETERS-V1-CANDIDATE.md).

## A. Base de départ

| Contrôle | Résultat |
|---|---|
| Branche / HEAD | `claude/fitness-app-architecture-81fs92` / `81a02d3` (fin 5C), arbre propre |
| Tests / typecheck / lint / architecture | 630 verts ; verts |
| Documents 5C | relus |
| R1 et R8 | **bloqués intentionnellement** (V33, V34 vides, G1) |
| V23 | **vide** |
| G1 | **0 sur 4 politiques signées** |
| CORE-EXT-R1 | RFC seulement |
| PubMed | toujours inaccessible (connexion refusée) ; recherche web seulement (SEARCH_SUMMARY) |

---

## B. Corrections du contre-audit

### B1 — Conflit de références (ex-« 6 % »)
- **Avant** : écart > 6 % ⇒ référence prudente (seuil binaire).
- **Maintenant** : **gravité ordinale du conflit**, exprimée en multiples de la **variabilité typique de performance** (`running.reference.typicalVariability`, V42).
  - V42 est SOURCE_INFORMED par Hopkins 2001 : CV entre courses 1,2–1,9 % chez les plus rapides, jusqu’à 2,3 fois plus chez les plus lents.
  - Valeurs candidates (EXPERT_PROPOSED) : P-R4 **2 %**, P-R2 et P-R3 **3 %**, P-R1 **4 %**.

| Gravité (V43) | Écart d (même distance de décision) | Effet |
|---|---|---|
| NONE | d ≤ 1 × V42 | Bruit : la référence la plus spécifique et la plus récente est retenue |
| MINOR | 1 × V42 < d ≤ 2 × V42 | La plage cible est **élargie pour contenir les deux estimations** (enveloppe) ; confiance inchangée |
| MAJOR | d > 2 × V42 | Estimation la plus prudente ; confiance −1 ; calibration demandée |

- **Continuité** : entre MINOR et MAJOR, **la borne prudente de la cible est la même** (l’enveloppe contenait déjà l’estimation prudente). Seuls changent la confiance et la demande de calibration : c’est un changement **ordinal**, pas une falaise sur la prescription.
- **Test aux bornes** (P-R2, 2 × V42 = 6 %) : à 5,9 % ⇒ MINOR (enveloppe) ; à 6,0 % ⇒ MINOR ; à 6,1 % ⇒ MAJOR. Dans les trois cas, la même borne prudente est retenue.
- **Statut** : PROGRAMMING_HEURISTIC + HIGH_SENSITIVITY + EXPERT_DESIGN_REVIEW. **6 % n’est plus une constante** : c’est 2 × V42 pour P-R2 et P-R3.

### B2 — Mise à jour de performance (ex-« 3 % »)
- **Avant** : hausse > 3 % ⇒ preuve renforcée.
- **Maintenant** : la décision tient compte, dans cet ordre :
  1. du **type de preuve** ;
  2. de l’**ampleur rapportée à la variabilité typique** (V42) ;
  3. de la **spécificité** ;
  4. de la **cohérence** (V15).

| Preuve | Amélioration a | Décision |
|---|---|---|
| Course, contre-la-montre ou test standardisé | Toute | UPDATE_UP (la mesure est la preuve) ; confiance selon le protocole et la spécificité |
| Observations d’entraînement COHERENT (V15) | a ≤ 1 × V42 | HOLD (dans le bruit) |
| idem | 1 × V42 < a ≤ 2 × V42 | UPDATE_UP, confiance ≤ MEDIUM |
| idem | a > 2 × V42 | REQUEST_CALIBRATION (un saut important observé à l’entraînement ne suffit pas) |
| Séance isolée | Toute | HOLD (`PERF.SINGLE_SESSION_IGNORED`) |

- **Test aux bornes** (P-R2, 1 × V42 = 3 %) : 2,9 % ⇒ HOLD ; 3,0 % ⇒ HOLD ; 3,1 % ⇒ UPDATE_UP (MEDIUM).
- **Impact** : une mise à jour de 3 % reste **à l’intérieur** de la plage HIGH (±3 %) déjà prescrite ⇒ la cible bouge peu. Le changement est **ordinal et borné**, pas une falaise.
- **Statut** : PROGRAMMING_HEURISTIC + HIGH_SENSITIVITY + EXPERT_DESIGN_REVIEW. **3 % n’est plus une constante.**

### B3 — « 3 observations sur 2 semaines »
- **Décision** : conservé comme **défaut configurable** (V15), statut PROGRAMMING_HEURISTIC, **non validé scientifiquement**.
- Il est accompagné d’une **règle qualitative de cohérence**, obligatoire : même domaine, même famille de structure, contexte comparable, conformité, RPE conforme, aucune contradiction.
- Les nombres (3, 2) sont un compromis produit : plusieurs jours et plus d’une semaine, pour limiter l’effet d’une bonne journée.

### B4 — Charge récente
- La bande min / max est remplacée par **`RecentLoadContext`** : médiane (niveau typique) + maximum démontré sans retour négatif, sur N = 4 semaines configurables. Détails dans [`RUNNING-RECENT-LOAD-CONTEXT.md`](RUNNING-RECENT-LOAD-CONTEXT.md).
- **Ce n’est pas une bande de sécurité.** Pas d’ACWR, pas de risque inféré.

### B5 — Fréquence minimale 2
- Renommée `running.frequency.minimumPlannerRunningFrequency` = 2.
- **PRODUCT_GUARDRAIL / règle de périmètre** : « V1 ne génère pas de programme de course structuré complet en dessous de cette fréquence ».
- Elle **ne signifie pas** qu’une séance par semaine est sans effet d’entraînement. En dessous, le mode maintien (EASY) reste disponible.

### B6 — Séances exigeantes sur des jours consécutifs
- L’absolu « jamais deux jours durs consécutifs » est **retiré**.
- Remplacé par **STRONG_DEFAULT_SEPARATION** (V11) : par défaut, pas deux séances HD de course sur des jours consécutifs. Une exception est possible **seulement sur demande explicite du GlobalPlanner**, selon :
  - le niveau (P-R3 et plus) ;
  - les demandes des séances ;
  - l’entraînement concurrent ;
  - la phase et la proximité de l’épreuve ;
  - le contexte de récupération.
- En V1, **le moteur ne génère jamais d’exception de lui-même**. Ce refus est un **PRODUCT_GUARDRAIL / PROGRAMMING_HEURISTIC**, pas une vérité physiologique.

### B7 — Calcul du taper
- 41–60 % est une **réduction** du volume, pas le volume restant. Volume résultant = base × (1 − réduction).
- **Vérification** :
  - R11 : base 240 ; réduction 41–60 % ⇒ 240 × 0,59 = **141,6** et 240 × 0,40 = **96,0** ⇒ **96,0–141,6 min**. Le calcul 5C était correct ; il est désormais présenté explicitement.
  - Travail de seuil : 24 × [0,40 ; 0,59] = 9,6–14,2 min ; retenu 10 min = réduction de 58,3 %, dans la plage ✓.
  - C5 : mêmes valeurs ✓.

### B8 — RPE et domaines
- Les correspondances deviennent des **bandes chevauchantes** sur l’échelle CR-10 (V02 révisé) :

| Domaine | Bande RPE |
|---|---|
| EASY_LOW | plafond 3 |
| STEADY | 3–5 |
| THRESHOLD_LIKE | 5–7 |
| SEVERE | 7–9 |
| Test maximal | 9–10 |
| SPRINT | descripteur |

- Elles sont **toujours combinées** au contexte et aux autres signaux quand ils existent. Aucune équivalence exacte « RPE X = domaine Y ».
- NO_WEARABLE reste entièrement pris en charge.

---

## C–R. Décisions par famille (P1–P17 et règles transverses)

| Famille | Décision 5D | Statut / provenance | Résolu ? |
|---|---|---|---|
| **P1 V23 magnitude** | **Aucune magnitude universelle** (preuves : 10 % non protecteur ; 10 % ≈ 24 % ; association > 30 % sur 2 semaines chez des débutants seulement). La progression peut s’appuyer sur des **doses déjà démontrées** : **restauration** jusqu’à `recentDemonstrated` (RecentLoadContext) pour la variable dominante, sans magnitude ; **baisse** vers la dernière dose réussie (historique). Une **nouvelle** hausse au-delà du démontré reste bloquée (V23 vide, EXPERT_DESIGN_REVIEW). Toute magnitude future sera **propre à chaque variable** (SMALL pour la durée hebdomadaire ≠ SMALL pour le volume de fractionné). | INSUFFICIENT_EVIDENCE ; EXPERT_DESIGN_REVIEW | **Non résolu, justifié** (restauration et baisse démontrables) |
| **P2 V31 dose de qualité** | Aucun minimum universel ; familles de doses par type de séance (THRESHOLD, SEVERE, SHORT, HILLS, RACE_PACE), ancrées sur l’historique ; le seuil d’inclusion de Bacon (≥ 10 min de travail intense) **n’est pas un minimum** | INSUFFICIENT_EVIDENCE ; EXPERT_DESIGN_REVIEW | Non résolu, justifié (défaut conservateur tracé conservé) |
| **P3 V32 long run** | Pas de pourcentage du volume, pas de borne absolue défendable. **L’historique récent du long run est la variable pertinente** (associations au marathon : plus longue sortie, sorties ≥ 32 km). Logique adaptative (ancre + restauration) + EXPERT_DESIGN_REVIEW. Programmation de performance ≠ garde-fou de sécurité. | CONTEXT_DEPENDENT ; EXPERT_DESIGN_REVIEW | Non résolu, justifié |
| **P4 V33 entrée novice** | Structure admissible : course / marche en alternance, EASY, dose à la durée, RPE ou talk test, sans test maximal. Précédent de protocole GRONORUN (10 min course / marche au départ) : **présenté à l’expert comme option, non retenu**. **Dose vide.** | SAFETY_SIGNOFF_REQUIRED | **Reste bloqué (G1)** |
| **P5 V34 reprise longue** | Distinction : interruption non médicale / raison inconnue / douleur ou blessure (renvoi à PAIN_STOP ou OUT_OF_SCOPE) / hors périmètre. Aucune dose défendable ; structure conservatrice conservée ; UNKNOWN reste UNKNOWN. **Dose vide.** | SAFETY_SIGNOFF_REQUIRED | **Reste bloqué (G1)** |
| **P6 V02 RPE** | Échelle **CR-10 modifiée** (raison : cohérence avec la sRPE, Foster 2001 ; une seule échelle, pas de mélange avec Borg 6–20). Bandes chevauchantes (B8). | EXPERT_PROPOSED ; HIGH_SENSITIVITY | Arbitré (provisoire) |
| **P7 V03 largeur d’allure** | HIGH ±3 % **conservé** : du même ordre que la variabilité intra-athlète entre courses (Hopkins 2001). MEDIUM ±6 % conservé (≈ 2 fois). Le seuil n’est pas une allure exacte. | SOURCE_INFORMED + EXPERT_PROPOSED | Arbitré |
| **P8 V04 marge seuil** | 0–5 % sous la frontière 2 estimée, conservé ; plage, pas une allure exacte | EXPERT_PROPOSED ; HIGH_SENSITIVITY | Arbitré (provisoire) |
| **P9 V08 récupérations** | Mécanisme soutenu : la durée de récupération module le temps passé près du VO2max ; les répétitions très courtes intensifiées sont moins efficaces que les longues (étude unique). Aucun ratio universel ; plages 5C conservées ; la méta-régression (ratio travail / récupération ≈ 0,85, attribution PARTIAL) est à la limite haute de la plage SEVERE et doit être relue. Les récupérations restent **par type de séance**. | SOURCE_INFORMED (mécanisme) + EXPERT_PROPOSED (valeurs) | Arbitré (provisoire) |
| **P10 V10 densité** | HighDemandRunningSession défini par le **contenu** (V30). V1 garde **les deux** : maximum par 7 jours (V10) **et** séparation par défaut (B6) | PRODUCT_GUARDRAIL | Arbitré |
| **P11 V12 récence** | 3 catégories opérationnelles conservées (RECENT / AGING / STALE ; pas de VERY_STALE, inutile) ; confiance dégradée par paliers ordinaux ; les bornes en semaines restent heuristiques | EXPERT_PROPOSED ; HIGH_SENSITIVITY | Arbitré (provisoire) |
| **P12 V22 hausse brutale** | Requalifié : protège contre un **saut de programme**, une **erreur de donnée**, une **discontinuité du planificateur** ou une **prescription irréaliste**. Ce n’est pas une science de sécurité. 130 % sur 2 semaines conservé pour P-R0–1 ; au-delà, la proposition est **plafonnée** (pas de falaise de refus) | PRODUCT_GUARDRAIL | Arbitré |
| **P13 V24 reprise** | Frontières conservées, catégories opérationnelles ; la discontinuité à 28 jours est acceptée seulement parce qu’elle va dans le sens le plus prudent, et reste soumise à G1 | SOURCE_INFORMED + SAFETY_SIGNOFF_REQUIRED | Arbitré, G1 en attente |
| **P14 V27 ampleur du taper** | Plage de réduction 41–60 % (SOURCE_DERIVED, multi-sports) ; **non imposée à toutes les épreuves** ; valeur par épreuve et niveau : CONTEXT_DEPENDENT | SOURCE_DERIVED (plage) | Arbitré |
| **P15 V28 durée du taper** | Marathon : candidate **2–3 semaines** (Smyth 2021, observationnel ; cohérent avec Bosquet ≈ 2 semaines et Wang ≤ 21 jours). 5K / 10K / semi : **vide** (aucune preuve propre à l’épreuve) | SOURCE_INFORMED (marathon) ; CONTEXT_DEPENDENT (autres) | Partiellement résolu |
| **P16 V35–V37 premières expositions** | Principe : première exposition prudente → observation → adaptation ; **aucune dose défendable** | INSUFFICIENT_EVIDENCE ; EXPERT_DESIGN_REVIEW | Non résolu, justifié |
| **P17 V38 extrapolation** | Riegel autorisé **pour une cible ≤ semi** (calibré dans Vickers 2016), confiance plafonnée à MEDIUM, **plage de sortie obligatoire** (±6 %). **Marathon exclu** (sous-estimation documentée). VDOT : non retenu. CS : dans la plage de durées de ses essais seulement. Interpolation préférée quand des performances encadrent la cible. L’exposant de la formule publiée (1,06 dans la formulation usuelle) est à **confirmer à la lecture de la source** (IDENTITY_ONLY pour la valeur). | SOURCE_INFORMED + EXPERT_DESIGN_REVIEW ; HIGH_SENSITIVITY | Partiellement résolu (≤ semi) |

### Comparaison des familles de modèles (V38)

| Famille | Populations | Plage de distances | Hypothèses | Erreur connue | Forces | Modes d’échec |
|---|---|---|---|---|---|---|
| Type Riegel | Loisirs (Vickers 2016) | Calibré jusqu’au semi | Exposant commun | Marathon : au moins 10 min trop rapide pour la moitié des coureurs | Simple, une seule course suffit | Marathon ; coureurs atypiques |
| Type VDOT | Non évalué ici | — | Économie standard, fraction soutenable standard | Non vérifiée | Répandu | Confond performance et prescription ; non vérifié |
| CS | P-R2–4 | Plage de durées des essais | Modèle à 2 paramètres | Hors plage des essais | Base physiologique | Extrapolation longue |
| Interpolation | Tous | Entre deux performances | Monotonie | Faible | Pas d’extrapolation | Exige deux courses qui encadrent la cible |

---

## AC. Audit d’absence de dérive architecturale

**NEW_ARCHITECTURAL_CONCEPTS_INTRODUCED = 0**

| Élément 5D | Nature | Pourquoi ce n’est pas un nouveau concept |
|---|---|---|
| RecentLoadContext | Renommage et précision de V21 (exigé par B4) | Remplace un paramètre existant ; même rôle dans la LCA |
| V42 variabilité typique, V43 gravité du conflit | Paramètres | Précisent les règles existantes §E et §F (exigé par B1 et B2) |
| Restauration vers le démontré, baisse vers la dernière dose réussie | Règles internes au modèle de progression existant | « Dose précédente réussie » figure parmi les entrées demandées (§E de la mission) |
| STRONG_DEFAULT_SEPARATION | Requalification de V11 (B6) | Même contrainte, statut corrigé |
| VALID_PROVISIONAL, BLOCKED_PARAMETER, BLOCKED_G1 | Statuts de résultat fournis par la mission | Libellés de résultat, pas de nouveau mécanisme |

**FUTURE_RFC** (non intégré à V1) :
1. Variabilité typique **individualisée** à partir de l’historique de courses de l’athlète (avec au moins 3 courses comparables).
2. Contexte de charge lissé (moyenne pondérée), si une validation apparaît.
3. Modèles de prédiction intégrant l’entraînement (Vickers 2016 montre un gain).

**CORE-EXT-R1** : aucune contradiction découverte ; RFC inchangée.
