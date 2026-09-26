# 04 — Charge, exposition et AthleteState

Remise en question de **C6**. La phase 1 listait 8 « dimensions de charge » et en faisait 8 budgets hebdomadaires. En analysant chaque dimension, on constate qu'elles ne sont **pas de même nature** : certaines s'accumulent, d'autres décrivent un état, d'autres limitent une décision, d'autres aident seulement à interpréter une donnée. Les traiter toutes comme des budgets reviendrait à inventer des limites là où la connaissance n'en fournit pas.

## 1. Cinq natures distinctes

| Nature | Définition | Question à laquelle elle répond | Exemple |
|--------|-----------|----------------------------------|---------|
| **LOAD / EXPOSURE** | Ce qui a été réellement accumulé, mesuré à partir de l'exécution réelle | « Qu'a fait l'athlète ? » | 14 séries difficiles pour les quadriceps sur 7 jours ; 32 km de course |
| **ATHLETE STATE** | Description de l'athlète à l'instant t | « Où en est l'athlète ? » | e1RM du squat ≈ 110 kg (confiance moyenne) ; dernière sollicitation lourde du bas du corps il y a 30 h ; signalement de douleur au genou |
| **CONSTRAINT** | Ce qui limite une décision | « Qu'est-ce qui est interdit ou déconseillé ? » | Pas de nouvelle sollicitation lourde du bas du corps avant 48 h |
| **CONTEXT** | Attribut qui aide à interpréter une exposition | « Dans quelles conditions ? » | Ce kilomètre a été couru juste après des fentes (course compromise), en zone de seuil |
| **DERIVED METRIC** | Calculée à partir des autres, jamais saisie | « Quelle tendance ? » | Ratio exposition 7 jours / moyenne 28 jours de course ; répartition des intensités sur 14 jours |

Règle : **seule une CONSTRAINT peut refuser une décision.** Une exposition ou une métrique dérivée n'interdit rien par elle-même. Elle alimente une contrainte explicitement définie, justifiée et versionnée (doc 09).

## 2. Reclassement des 8 dimensions de C6

| Dimension C6 | Nature réelle | Commentaire |
|--------------|---------------|-------------|
| Stress musculaire / local | **EXPOSURE** (séries difficiles par groupe) + **STATE** (dernière sollicitation lourde par structure) | Le volume s'accumule ; la fraîcheur est un état |
| Patterns sollicités | **EXPOSURE** (séries et répétitions par pattern, date de dernière exposition) | Sert surtout à la couverture et à l'anti-doublon ; pas de limite physiologique propre |
| Volume | **Pas une dimension** : c'est la *grandeur* de chaque exposition, dans ses unités natives. Les agrégats sont des **DERIVED** | Additionner des séries, des km et des minutes de WOD n'a pas de sens |
| Intensité | **CONTEXT** d'une exposition + **DERIVED** (répartition) | L'intensité qualifie une exposition ; la répartition sur 14 jours est dérivée |
| Stress locomoteur / impact | **EXPOSURE** (temps et distance courus tous contextes, contacts de sauts) | Seule dimension, avec les séries musculaires, où une contrainte de progression est défendable |
| Stress cardiovasculaire | **EXPOSURE** (minutes par bande d'intensité) | Sert aux cibles de répartition ; pas de limite propre défendable |
| Exposition récente | **Pas une dimension** : c'est une **fenêtre temporelle** appliquée à chaque exposition (DERIVED) | 7 j, 28 j, dernière occurrence |
| Récupération disponible | **STATE** (temps écoulé depuis la dernière sollicitation élevée de chaque structure + signaux déclarés) **utilisé par** une **CONSTRAINT** (écarts minimaux) | Ce n'est pas une charge |

## 3. Spécification de chaque élément retenu

Colonnes : nature · unité · fenêtre · calcul · rôle dans les décisions · niveau de confiance de la méthode · limite réelle ? · origine de la limite · données insuffisantes.

### 3.1 Expositions (LOAD / EXPOSURE)

| Élément | Unité | Fenêtre | Méthode de calcul | Rôle | Confiance | Limite ? | Origine de la limite | Données insuffisantes |
|---------|-------|---------|-------------------|------|-----------|----------|----------------------|------------------------|
| **E1. Séries difficiles par groupe musculaire** | séries (muscle primaire = 1, secondaire = 0,5) | 7 j, 28 j | Séries `working`/`top_set`/`backoff`/`amrap` **réalisées**, en format musculation, avec un effort estimé ≥ seuil (RIR ≤ 4, paramètre). Les séries de montée en charge ne comptent pas. Le travail en conditioning **ne compte pas** en séries (pas d'équivalence inventée) : il contribue via E2 et le profil de demande | Cibles de volume (TARGET), plafond par séance (HARD de bon sens), plage hebdomadaire (SOFT) | `consensus` pour le comptage des séries difficiles ; `heuristic` pour la pondération 0,5 | Oui, partiellement (voir §4) | Tables par niveau et objectif (ruleset), relues par un expert | Pas d'historique ⇒ départ en bas de la plage du niveau, montée progressive |
| **E2. Exposition par pattern** | séries (musculation) ; répétitions (conditioning) ; date de dernière exposition | 7 j, 14 j, 28 j | Pattern primaire de chaque exercice réalisé | Couverture des patterns (TARGET), anti-doublon (doc 07), interférence (niveau de demande) | `established` (c'est un simple comptage) | Non | — | Aucune exposition connue ⇒ tous les patterns sont « à couvrir » |
| **E3. Exposition de course** | minutes **et** mètres, ventilés par contexte (`fresh`, `compromised`, `interval`, `continuous`, `wod_embedded`) et par bande d'intensité | 7 j, 28 j, dernière séance longue | `RunningExposure` issues des séances **réalisées** de toutes les disciplines (C7). Les km bruts sont toujours conservés | Contrainte de progression locomotrice (§4, L3), volume spécifique de course (RunningEngine) | `established` pour la mesure ; voir §5 pour la contribution | Oui (progression) | Paramètres ruleset, relus par un expert course | Pas d'historique ⇒ base = fréquence et durée déclarées (confiance faible), sinon tables de démarrage par niveau |
| **E4. Contacts de sauts / impacts non-course** | nombre de contacts, par classe d'impact (catalogue `cost.impact`) | 7 j | Répétitions des exercices `jumping` / `plyometric` réalisés | Restriction `no_impact` (HARD), plafond par séance selon le niveau (HARD de bon sens), information pour la contrainte locomotrice | `heuristic` | Plafond par séance seulement | Ruleset (relecture experte) | Débutant sans historique ⇒ plafond bas |
| **E5. Minutes par bande d'intensité** | minutes en 3 bandes : `low` / `moderate` / `high` | 7 j, 14 j | Course : bande dérivée de la zone ou du RPE des segments. Conditioning : bande **estimée** d'après le stimulus et le RPE de séance, avec un marqueur `estimated`. Musculation : non comptée ici | Cible de répartition (ex. part « facile » en course) : TARGET ; nombre de séances intenses (L2) | `consensus` pour la répartition en course ; `heuristic` pour le conditioning | Non (cible) | — | Pas de RPE ⇒ bande de la prescription, marquée `assumed` |
| **E6. Charge interne de séance (sRPE)** | UA = RPE de séance (1–10) × minutes actives | par séance ; 7 j ; 28 j | Seulement si l'utilisateur a saisi le RPE de séance | **DERIVED interne** : détection d'écart par rapport à la base personnelle (signal de lecture de l'état), jamais une limite | `consensus` sur la méthode (sRPE, Foster et al.) ; utilisée seulement en relatif à soi-même | Non | — | Absente ⇒ signal ignoré, jamais imputé |

### 3.2 État (ATHLETE STATE)

| Élément | Unité | Fenêtre | Méthode | Rôle | Confiance | Données insuffisantes |
|---------|-------|---------|---------|------|-----------|------------------------|
| **S1. Fraîcheur par structure** | heures depuis la dernière demande `high` et `moderate` de chaque structure (§6) | dernière occurrence | Profils de demande des séances **réalisées** | Utilisé par L1 (récupération minimale) | `established` (horodatage) | Aucune séance ⇒ structure fraîche |
| **S2. Capacités** | e1RM (kg), allure de référence / vitesse critique, benchmarks, capacités par station, débits de travail | selon source | Doc 06, doc 08 §1 | Dosage | Selon source (§7) | Voir §7 ; prescription à l'effort perçu |
| **S3. Signaux déclarés** | douleurs actives, fatigue déclarée, séances manquées récentes | 14 j | Feedback (doc 08 §2) | Comportement conservateur (doc 09 §7), adaptation | `established` (déclaratif) | Absence de signal = « rien de signalé », et non « tout va bien » : le moteur ne présume rien. **Sans consentement santé** (doc 09 §7.3), l'historique des douleurs est marqué `unavailable` : aucune détection de récurrence n'est tentée |
| **S4. Lecture de l'état (readiness)** | **catégorie** `unknown` / `normal` / `caution` / `reduce` + reason codes | 7–14 j | Règles explicites sur S3, E6 (écart à la base) et l'écart prévu/réalisé (doc 08 §3) | Allègement, déplacement ; `unknown` conserve un comportement par défaut raisonnable **mais reste visible** dans l'état et la trace | `heuristic` | Données récentes insuffisantes ⇒ **`unknown`** (et non `normal`), avec `DATA.READINESS_UNKNOWN` |
| **S5. Régularité** | séances réalisées / prévues | 28 j | Historique | Progression (pas de hausse si la régularité est faible), niveau de confiance des capacités | `established` | Nouveau compte ⇒ inconnue |
| **S6. Statut d'entraînement par discipline** | niveau dérivé + tendance | 28–84 j | Capacités, régularité, marqueurs factuels | Choix des archétypes, des plafonds, des modèles de progression | `heuristic` | Niveau déclaré avec une confiance faible |

**Pas de « score de fatigue » numérique.** S4 est une catégorie issue de règles lisibles, par exemple : « deux RPE de séance ≥ 2 points au-dessus de l'attendu sur les 3 dernières séances, **ou** fatigue déclarée élevée ⇒ `caution` ». Chaque passage de catégorie produit des reason codes. Il est possible de le calculer, de l'expliquer et de le tester ; il ne prétend pas mesurer la physiologie.

**`unknown` (V1.1)** : l'absence de données n'est **jamais** assimilée à un état normal. `unknown` n'implique aucune fatigue ; il signifie seulement que les données sont insuffisantes pour conclure.
- Comportement par défaut : identique à `normal` pour la programmation courante (paramètre `readiness.unknownPolicy`, valeur par défaut `as_normal`).
- L'incertitude reste visible : l'état porte `unknown`, la trace porte `DATA.READINESS_UNKNOWN`, et les politiques d'application qui dépendent de la qualité des données (§4.1) peuvent en tenir compte (ex. prudence accrue avant un test maximal).
- On sort de `unknown` dès que les données minimales sont disponibles (ex. au moins 2 RPE de séance ou un feedback explicite dans la fenêtre, paramètre).

### 3.3 Contexte (CONTEXT)

Attributs attachés à chaque exposition, jamais agrégés seuls :
- **Course** : `fresh` / `compromised` / `interval` / `continuous` / `wod_embedded`, bande d'intensité, durée du segment, récupération entre segments, exercice qui précède, séance et discipline d'origine (C7).
- **Musculation** : effort réel (RIR/RPE), tempo, format (séries classiques, superset, circuit).
- **Toute exposition** : `planned` vs `actual`, qualité de la donnée (`measured` / `declared` / `assumed` / `estimated`).

### 3.4 Métriques dérivées (DERIVED)

| Métrique | Calcul | Usage autorisé |
|---------|--------|----------------|
| D1. Ratio exposition de course 7 j / moyenne hebdo 28 j | Minutes (ou km) 7 j / (minutes 28 j / 4) | Entrée de L3. **Pas** un prédicteur de blessure : ce type de ratio est scientifiquement discuté, d'où son usage pour borner des variations brusques uniquement |
| D2. Répartition des intensités 14 j | E5 normalisé | Cible de répartition (TARGET) |
| D3. Couverture des patterns 14 j | E2 | TARGET de sélection |
| D4. Écart sRPE par rapport à la base personnelle | E6 7 j vs médiane 28 j | Entrée de S4 |
| D5. Écart prévu / réalisé | Volume réalisé / prévu, charges réalisées / prévues | Progression, lecture de l'état |
| D6. Score synthétique interne (facultatif) | Au choix, documenté | **Tri, départage, tableaux de debug uniquement.** Interdit dans une contrainte (règle vérifiée en revue de code et par un test d'architecture) |

## 4. Les limites réellement retenues (5)

| Id | Limite | Nature de la règle | Niveau | Ce qu'elle limite | Comment la valeur est déterminée | Confiance actuelle |
|----|--------|-------------------|--------|-------------------|----------------------------------|--------------------|
| **L1** | **Récupération minimale par structure** : écart minimal entre deux demandes élevées sur une même structure (matrice §6) | PROGRAMMING_HEURISTIC (plancher conservateur) | **Contextuel** (§4.1) : HARD par défaut pour une demande élevée sur la même structure | Le placement des séances, l'intensité de l'une d'elles | Matrice par niveau de demande et niveau de l'athlète dans le ruleset. Valeurs de départ prudentes (ex. élevé → élevé : 48 h), relues par des experts | `heuristic` / `consensus` |
| **L2** | **Séances à haute intensité** : maximum par semaine selon le niveau, et pas de jours intenses consécutifs pour novices et débutants | PROGRAMMING_HEURISTIC | **Contextuel** (§4.1) : plafond HARD ou SOFT selon le niveau et la phase ; espacement idéal SOFT | Le nombre et l'ordre des séances `high_intensity_systemic` | Table par niveau (ex. novice 1–2, intermédiaire 2–3, avancé 3–4 : hypothèses) | `consensus` |
| **L3** | **Progression de l'exposition locomotrice** : variation hebdomadaire de E3 par rapport à la base 28 j | PROGRAMMING_HEURISTIC | **Contextuel** (§4.1) : SOFT dans une zone de prudence, HARD au-delà d'un seuil de saut brusque, seuils fonction du contexte | Le volume de course prévu (toutes disciplines) | Paramètres du ruleset (ex. zone de prudence et seuil dur à définir avec l'expert course). La « règle des 10 % » **n'est pas** reprise comme une vérité | `heuristic` |
| **L4** | **Plafonds de bon sens par séance** : séries difficiles par groupe et par séance, contacts de sauts par séance, répétitions d'un même mouvement dans un WOD, selon le niveau | SAFETY / FEASIBILITY | HARD | Les aberrations de génération | Bornes larges fixées avec les experts ; elles ne doivent jamais gêner un programme normal, seulement arrêter l'absurde | `consensus` |
| **L5** | **Plage hebdomadaire de volume musculaire** par groupe (séries difficiles) | PROGRAMMING_HEURISTIC | TARGET pour le plancher de l'objectif, SOFT pour le haut de plage | Le volume de musculation | Tables par niveau × objectif (ex. hypertrophie intermédiaire : plage à définir), relues par un expert | `consensus` (effet dose-réponse du volume) ; valeurs exactes `heuristic` |

> **V1.1 : aucune valeur de L1, L2 ou L3 n'est une vérité physiologique.** Ce sont des paramètres provisoires du ruleset (confiance `provisional` ou `heuristic`), à calibrer et à faire relire par les experts (classe G2).

### 4.1 Politique d'application contextuelle (L1, L2, L3)

Le caractère HARD ou SOFT et les seuils de L1, L2 et L3 ne sont **pas constants**. Ils sont déterminés par une politique versionnée du ruleset :

```ts
interface EnforcementContext {
  stimulus: StimulusId;                 // ex. intervalles VO2 vs footing facile
  structure: Structure;                 // lower_knee, locomotor_impact… (§6)
  athleteLevel: Level;
  phase: PhaseKind;                     // général, spécifique, affûtage, décharge…
  keySessionProximity: 'none' | 'before_key' | 'after_key';   // proximité (en heures, paramètre) d'une séance clé
  dataQuality: 'none' | 'sparse' | 'adequate';                // qualité des données sur cette structure / cette discipline
}

interface EnforcementDecision { level: 'hard' | 'soft'; threshold: number; unit: string; penaltyWeight?: number; reasons: ReasonCode[]; }

type EnforcementPolicy = (ruleId: 'L1' | 'L2' | 'L3', ctx: EnforcementContext, ruleset: Ruleset) => EnforcementDecision;
```

Principes par défaut (paramètres, à relire) :

| Facteur | Tendance de la politique |
|---------|--------------------------|
| Stimulus | Plus le stimulus est intense ou traumatisant (intervalles, charges lourdes, excentrique), plus la règle tend vers HARD |
| Structure | `locomotor_impact`, `lower_knee` et `lower_hip` plus strictes que `upper_push`, `upper_pull` ou `grip` |
| Niveau | Novice et débutant : plus strict ; avancé : plus de SOFT |
| Phase | Affûtage et reprise : plus strict ; phase générale d'un athlète régulier : plus souple |
| Proximité d'une séance clé | Veille ou lendemain d'une séance clé : plus strict (protection de la séance clé) |
| Qualité des données | Données absentes ou pauvres : **plus prudent** (seuils conservateurs), jamais plus permissif |

La décision (niveau et seuil) est inscrite dans la trace (`RULE.ENFORCEMENT{rule, level, threshold, factors}`) : on peut toujours expliquer pourquoi une même règle a bloqué dans un cas et seulement pénalisé dans un autre. Chaque combinaison est couverte par des tests unitaires (doc 11).

**Aucune limite** sur : les patterns (hors anti-doublon), les minutes cardio (hors L2), le sRPE, un score synthétique.

Pourquoi seulement cinq : chacune correspond à un risque identifiable (lésion par répétition trop rapprochée, surcharge d'intensité, hausse brutale de la course, génération absurde, volume inadapté) et peut être relue par un expert. Ajouter des budgets pour les autres dimensions produirait des refus inexplicables pour l'utilisateur comme pour un coach.

## 5. Kilomètres hybrides (C7), précisés en V1.1

**Principe** : on conserve **toujours 100 % de l'exposition brute** réellement effectuée (distance, temps). On sépare ensuite ce qui sert à décider, **sans figer de coefficient physiologique universel**.

| Élément | Nature (§1) | Contenu | Utilisé par |
|---------|-------------|---------|-------------|
| **Exposition locomotrice brute** | EXPOSURE | 100 % de la distance et du temps courus, toutes disciplines confondues ; jamais pondérée à la baisse | L3 (via la politique §4.1), AthleteState |
| **Contribution à la programmation Running** | DERIVED | Part de l'exposition que le RunningEngine considère comme ayant rempli un objectif de course (volume facile, séance clé, spécificité). Calculée par une fonction **paramétrable** du contexte, de l'intensité et de la continuité | RunningEngine (cibles hebdomadaires, séances clés) |
| **Contexte** | CONTEXT | `fresh` / `compromised` / `embedded` (dans un WOD) / `interval` / `continuous` ; séance et discipline d'origine ; exercice précédent | Interprétation, contribution |
| **Intensité** | CONTEXT | Bande ou zone, RPE, allure si connue | Contribution, E5 |
| **Continuité** | CONTEXT | Durée du plus long segment continu, nombre de segments, récupération entre segments | Contribution (un fractionné entre stations ≠ une course continue) |

```ts
interface RunningExposureV11 {
  raw: { distanceM: number; durationS: number };                   // 100 % conservé
  context: 'fresh' | 'compromised' | 'embedded' | 'interval' | 'continuous';
  intensity: { band?: 'low' | 'moderate' | 'high'; zone?: RunZone; rpe?: number; paceSPerKm?: number };
  continuity: { longestContinuousS: number; segmentCount: number; recoveryBetweenS?: number };
  source: { sessionId: ID; discipline: Discipline; precededBy?: ExerciseId[] };
  dataQuality: 'measured' | 'declared' | 'estimated';
}

// RunningEngine — fonction pure, paramétrée par le ruleset (aucun coefficient codé en dur)
runningContribution(e: RunningExposureV11, athlete: RunningAssessment, ruleset): {
  locomotorRaw: { distanceM: number; durationS: number };          // = e.raw, toujours
  programming: { easyVolumeCreditS: number; qualityCredit?: QualityCreditKind; specificityCredit: number };
  reasons: ReasonCode[];                                            // explique le crédit accordé
};
```

- Les règles de crédit (ex. « un segment continu ≥ X min en zone basse peut compter comme volume facile ») sont des paramètres `provisional` de classe G2, à définir avec les experts course et HYROX.
- La trace conserve toujours les km bruts **et** le crédit accordé, avec sa justification.
- Tant que les paramètres ne sont pas relus, la politique par défaut est **conservatrice des deux côtés** : l'exposition brute compte entièrement pour la prudence (L3), et le crédit pour la programmation Running reste limité aux segments clairement assimilables (continus, intensité connue).

## 6. Structures et profil de demande (utilisés par L1 et par l'InterferenceManager) — V1.2

**8 structures de planification, dérivées** (jamais saisies à la main) :

```ts
type Structure =                      // identifiants de données (table versionnée), pas un enum figé dans le code
  | 'lower_knee'                      // dominante genou (quadriceps) : squat, fentes, wall ball, sled push
  | 'lower_hip'                       // dominante hanche (fessiers, ischios) : hinge, swing, hip thrust
  | 'upper_push'                      // poussée : développés, pompes, dips, jerk
  | 'upper_pull'                      // tirage : tractions, rowing, SkiErg, sled pull
  | 'axial'                           // charge sur la colonne : squat et soulevé lourds, farmers, portés
  | 'locomotor_impact'                // course + pliométrie + sauts (mollets, tendon d'Achille, pied)
  | 'high_intensity_systemic'         // intensité métabolique élevée (sert à L2)
  | 'grip';                           // préhension : farmers, sled pull, tractions, soulevé de terre
type DemandLevel = 'none' | 'low' | 'moderate' | 'high';

type DemandProfile = Record<Structure, DemandLevel> & { reasons: ReasonCode[] };
```

- **Dérivation** : chaque niveau est calculé à partir des métadonnées des exercices (muscles, patterns, zones, coûts, doc 03 §2 bis) et de l'effort réel, par une **table de correspondance versionnée du ruleset**. Exemples : wall ball ⇒ `lower_knee` + `upper_push` + systémique ; SkiErg ⇒ `upper_pull` + systémique ; farmers ⇒ `grip` + `axial` ; fentes sandbag ⇒ `lower_knee` + `axial`.
- **Alias de règle** : « bas du corps » = max(`lower_knee`, `lower_hip`). Il est utilisé par les règles d'interférence (ex. I1, doc 05 §2.3).
- **Ce qui reste dans Exposure / Context et n'est pas une structure** : travail excentrique important (modificateur qui fait monter le niveau d'un cran), lourd vs volume local (contexte d'intensité), course compromise (contexte), volume aérobie facile (E5), minutes cardio.
- **Calcul prévu** (séance générée) : règles explicites à partir du contenu (ex. `lower_knee = high` si au moins X séries difficiles à dominante genou à RIR ≤ 2, ou un exercice de coût local 3 à haute intensité). Les seuils vivent dans le ruleset ; les règles sont testées.
- **Calcul réalisé** : même règle appliquée à l'exécution réelle, avec le RPE de séance comme correcteur possible (+1 niveau si RPE ≥ attendu + 2).
- **Ordinal volontairement** : quatre niveaux suffisent pour décider d'un écart. Un nombre continu donnerait une illusion de précision.

Matrice L1 (exemple de **structure**, valeurs `provisional`, modulées par la politique §4.1, appliquée à chacune des 8 structures) :

| Demande précédente → suivante | high | moderate | low |
|-------------------------------|------|----------|-----|
| **high** | ≥ 48 h | ≥ 24 h | aucune |
| **moderate** | ≥ 24 h | aucune (soft : 24 h) | aucune |

Des ajustements par structure et par niveau d'athlète sont prévus dans le ruleset (ex. `locomotor_impact` pour un novice). La séparation poussée / tirage garantit qu'une séance de poussée lourde suivie d'une séance de tirage lourd le lendemain n'est pas bloquée par L1.

## 7. Confiance des capacités et références

Chaque capacité porte une **confiance** calculée par une règle simple et lisible :

```
confiance = f(qualité de la source, ancienneté, pertinence, cohérence)
```

| Facteur | Exemples (ordinaux) |
|---------|---------------------|
| Qualité de la source | course officielle / test encadré par l'app > série réalisée avec RIR saisi > série réalisée sans effort saisi > valeur déclarée |
| Ancienneté | décroissance par paliers (ex. < 6 sem : pas de pénalité ; 6–16 sem : −1 cran ; > 16 sem : −2 crans) — **paliers et non formule continue** |
| Pertinence | même distance ou exercice > distance proche > extrapolation lointaine (ex. 5 km → marathon : −2 crans) |
| Cohérence | plusieurs sources concordantes : +1 cran ; sources contradictoires : −1 cran + `STATE.REFERENCE_CONFLICT` |

Résultat : `high` / `medium` / `low` / `none`. Effet sur les prescriptions :

| Confiance | Prescription de charge | Prescription d'allure |
|-----------|------------------------|-----------------------|
| high | Charge absolue (arrondie au matériel) + RIR de contrôle | Plage d'allure |
| medium | Charge suggérée + RIR prioritaire | Plage d'allure élargie + effort perçu |
| low | **RIR/RPE prioritaire**, charge indicative | Zone / effort perçu, allure indicative |
| none | RIR/RPE uniquement, séance de calibration planifiée | Effort perçu uniquement, test planifié quand c'est pertinent (pas pour un novice) |

## 8. AthleteState (contrat)

```ts
interface AthleteState {
  asOf: ISODateTime;
  dataSufficiency: Record<'strength' | 'running' | 'crosstraining' | 'hybrid_race' | 'feedback', 'none' | 'sparse' | 'adequate'>;

  exposures: {
    muscularHardSets: { d7: Record<MuscleId, number>; d28: Record<MuscleId, number> };           // E1
    patterns: Record<PatternId, { d7: number; d14: number; d28: number; lastAt?: ISODateTime }>;  // E2
    running: { d7: RunExposureSummary; d28: RunExposureSummary; lastLongRunAt?: ISODateTime };   // E3 (brut + contributions)
    jumps: { d7: Record<ImpactClass, number> };                                                   // E4
    intensityMinutes: { d7: BandMinutes; d14: BandMinutes; estimatedShare: number };              // E5
    sessionLoad?: { d7: number; d28Median: number };                                              // E6 (si RPE saisis)
    recentFingerprints: SessionFingerprint[];                                                     // anti-doublon (fenêtre 28 j)
    exerciseLastDone: Record<ExerciseId, ISODateTime>;
  };

  freshness: Record<Structure, { lastHighAt?: ISODateTime; lastModerateAt?: ISODateTime }>;      // S1
  capacities: Capacity[];                                                                          // S2
  signals: {                                                                                     // S3
    activePain: PainReport[];
    painHistory: 'available' | 'unavailable';          // 'unavailable' si healthDataConsent = false (doc 09 §7.3)
    reportedFatigue?: { level: 1 | 2 | 3; at: ISODateTime };
    missedLast14d: number;
  };
  programStatus: 'active' | 'paused_safety' | 'suspended_scope';                                 // doc 02 §8
  readiness: { category: 'unknown' | 'normal' | 'caution' | 'reduce'; reasons: ReasonCode[] };   // S4 — 'unknown' ≠ 'normal'
  adherence: { d28?: number };                                                                      // S5
  trainingStatus: Partial<Record<Discipline, { level: Level; confidence: Confidence; trend: 'up' | 'flat' | 'down' | 'unknown' }>>; // S6
  progressionTracks: ProgressionTrackState[];                                                      // doc 08
  derived: { runRatio7to28?: number; intensityDistribution14d?: BandShares; patternCoverage14d: Record<PatternId, number>; plannedVsActual28d?: number };
}

interface Capacity { key: string; value: number; unit: string; confidence: Confidence; source: CapacitySource; asOf: ISODate; reasons: ReasonCode[]; }
```

**Construction** : `buildAthleteState()` est une fonction pure de l'historique fenêtré, du profil et du ruleset. Les caches côté application (doc 02 phase 1, « états dérivés ») sont des optimisations **recalculables** : en cas de doute, on recalcule.
