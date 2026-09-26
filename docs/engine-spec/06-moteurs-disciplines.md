# 06 — Moteurs de discipline

Chaque moteur implémente la même interface. Il **ne place jamais** de séance : c'est le rôle du GlobalPlanner.

```ts
interface DisciplineEngine {
  id: Discipline;
  assess(state: AthleteState, profile, goals, ctx): DisciplineAssessment;                 // niveau, capacités, manques de données
  phaseRole(goal: Goal[], phase: PhaseRef, ctx): DisciplineRole;                         // development / maintenance / support / off
  requestWeek(quota: number, weekCtx: WeekContext, ctx): SessionIntentRequest[];        // demande hebdomadaire (doc 05 §1.2 5b)
  designSession(intent: SessionIntent, sessionCtx: SessionContext, ctx): SessionDraft;  // pipeline de séance (doc 07 §1)
  progressionModels: ProgressionModelId[];                                               // doc 08
  rules: Rule[];                                                                          // règles propres (doc 09)
  archetypes: Archetype[];                                                                // gabarits relus par des experts
}
```

Un **archétype** définit : les blocs et leurs rôles, les emplacements (*slots*) avec leurs exigences (pattern, région, polyarticulaire ou non), les formats admissibles, le stimulus, la fourchette de durée, le profil de demande attendu, les niveaux admissibles et les **leviers de compression** (doc 07 §3).

Toutes les valeurs numériques ci-dessous sont des **hypothèses de départ** (`provisional` ou `heuristic`), à relire par le spécialiste de chaque discipline (doc 09 §6).

---

## 1. StrengthEngine (musculation)

### INPUTS
Objectif(s) (`strength_max`, `hypertrophy`, `general_fitness`, soutien HYROX / cross-training / course), rôle dans la phase, quota, `AthleteState` (E1, E2, capacités e1RM, progressions), matériel, restrictions, préférences, notes du planificateur (ex. `avoid_high_lower_body`), durée cible.

### DECISION PROCESS

**1. Répartition hebdomadaire des accents (requestWeek).** Pas de split figé. Le moteur énumère les combinaisons d'accents possibles pour N séances (`full`, `upper`, `lower`, `push`, `pull`, `posterior`, `upper_plus_carry`…), petit espace : ≤ ~50 combinaisons pour N ≤ 5. Il les note selon :
   - la couverture des patterns requis par l'objectif (TARGET) ;
   - la faisabilité de la plage L5 par groupe sans dépasser L4 par séance ;
   - l'interférence connue : si course ou HYROX sont en `development`, le volume du bas du corps est réduit et **déplacé loin des séances clés** (préférence exprimée par des variantes à accent haut du corps) ;
   - la fréquence de chaque groupe (idéalement ≥ 2 expositions par semaine en hypertrophie, si N le permet : `consensus`).

   Il fournit ensuite, pour chaque séance, 2 ou 3 **variantes** (ex. `lower_heavy`, `full_moderate`, `upper_focus`) pour le placement.

**2. Squelette de séance** (selon l'archétype) : échauffement (général + spécifique) → **mouvement principal** (1–2) avec montée en charge → **secondaire** (1–2) → **accessoires** (2–4, supersets possibles) → gainage ou finisher optionnel → retour au calme.

**3. Sélection par emplacement** : pattern requis → candidats filtrés (matériel et caractéristiques, restrictions, zones douloureuses, exclusions, niveau technique) → score :
   - continuité de l'**ancre** (même exercice principal sur tout le mésocycle : répétition *prévue*) ;
   - pertinence pour l'objectif et les autres disciplines (soutien HYROX : fentes, portés, poussées ; soutien course : unilatéral, chaîne postérieure, mollets) ;
   - contexte de fatigue (notes du planificateur) ;
   - exposition récente (anti-doublon) ;
   - préférences ;
   - logistique (réutiliser la même station : moins de transitions).

**4. Paramétrage — tables par objectif (hypothèses ; entièrement paramétrables dans le ruleset, classe G2, décision 20)** :

| Objectif | Principal : reps / RIR / repos | Accessoires : reps / RIR / repos | Séries par exercice |
|----------|-------------------------------|----------------------------------|---------------------|
| Force | 3–6 / 1–3 / 2–5 min | 6–12 / 1–3 / 1,5–2,5 min | 3–5 |
| Hypertrophie | 6–12 / 0–3 / 2–3 min | 8–20 / 0–2 / 1–2 min | 2–4 |
| Général | 6–10 / 2–3 / 1,5–2,5 min | 10–15 / 2–3 / 1–1,5 min | 2–3 |
| Soutien endurance (HYROX, course, cross) | 3–6 / 2–3 / 2–3 min, **faible volume** | unilatéral, portés 8–12 / 2–3 | 2–4 |

   Références pour les plages : prises de position ACSM sur les modèles de progression, littérature dose-réponse du volume, usage du RIR en autorégulation. Niveau de confiance : `consensus` pour les plages, `heuristic` pour les valeurs exactes.

   - **Charge** : `e1RM × pct(reps, RIR)` (table reps/RIR → %, dans le ruleset), arrondie au **réalisable** avec le matériel. Confiance moyenne ⇒ charge suggérée + RIR prioritaire ; faible ⇒ `rpe_based` (doc 04 §7).
   - **Montée en charge** (uniquement sur le premier exercice polyarticulaire chargé, si la charge de travail dépasse un seuil) : paliers en % de la charge de travail, par exemple ~40–50 % × 5, ~60–70 % × 3, ~80–85 % × 1–2. Le nombre de paliers dépend de la charge et du niveau. Ces séries ne comptent pas dans E1 mais comptent dans la durée.
   - **Repos** : dans la plage de l'objectif. Le **minimum** est protégé par le DurationEngine (un 3RM ne se fait pas avec 60 s de repos).

**5. Décharge** : planifiée par le GlobalPlanner, ou réactive (proposée par le ProgressionEngine). Stratégie par défaut : volume réduit (séries −30 à −50 %) et/ou RIR +2, **mêmes exercices** (la continuité est préservée).

**6. Substitutions** : même classe d'équivalence (fidélité élevée), puis même famille, puis même pattern (fidélité faible, signalée).

### OUTPUTS
`SessionDraft` : blocs `warmup` / `strength` / `accessory` / `cooldown`, `SetPrescription[]` avec les charges et/ou le RIR, les montées en charge, les repos, les alternatives pré-validées, et un `DemandProfile`.

### VALIDATION (règles propres, en plus des règles communes)
Pattern principal présent pour l'accent choisi ; L4 (séries par groupe et par séance) ; cohérence reps / %e1RM / RIR (ex. interdit : 10 reps à 90 % e1RM) ; montée en charge présente si requise ; charge réalisable avec le matériel ; exercice technique (`technical ≥ 2`) jamais placé en fin de séance sous fatigue pour un novice.

### FAILURE MODES
| Cas | Comportement |
|-----|--------------|
| Pas de candidat pour un pattern requis | Pattern de repli (table : `hinge` sans charge → hip thrust / RDL unilatéral au poids du corps), `SELECT.PATTERN_FALLBACK` |
| Charge maximale du matériel atteinte | Plus de reps (dans la plage), tempo, variante unilatérale : `EQUIPMENT.LOAD_CAP_REACHED` |
| e1RM inconnu | `rpe_based` + séance de calibration (série de référence à RIR 2) |
| Durée insuffisante | DurationEngine (doc 07 §3) ; sinon variante plus courte |

---

## 2. RunningEngine (course à pied)

Moteur **indépendant**. Il expose aussi des **services** utilisés par les autres moteurs : allures, zones et `runningContribution()`. Le HyroxEngine s'en sert même si la course n'est pas une discipline active de l'utilisateur.

### INPUTS
Objectif (5 km, 10 km, semi, marathon, général, soutien HYROX), échéance, rôle dans la phase, quota, `AthleteState` (E3, E5, capacités de course, régularité), références disponibles (chronos, tests, allures, FC réservée), restrictions (`no_running`, `no_impact`), préférences (jour de sortie longue, surface).

### DECISION PROCESS

**1. Références et confiance** (doc 04 §7).
   - **Modèle d'allure interchangeable (V1.1)** : le RunningEngine dépend d'une interface `PaceModel { estimate(references, ctx): PaceProfile }` ; le modèle actif est choisi par le ruleset (`running.paceModel`), et plusieurs modèles peuvent coexister.
   - Candidats : équivalence de performance à partir d'une course ou d'un test (tables de type VDOT de Daniels, formule de Riegel) ; vitesse critique quand il existe ≥ 2 efforts maximaux de durées différentes et récents.
   - Le choix du modèle par défaut et des conditions de bascule se fait avec l'expert course (décision 18, paramétrable). Changer de modèle ne modifie ni les contrats ni les autres moteurs.
   - Plusieurs références ⇒ la plus confiante sert de base. En cas de désaccord important, on prend la valeur **la plus prudente** et on émet `STATE.REFERENCE_CONFLICT`.

**2. Zones** : 5 zones définies par rapport à l'allure de seuil estimée (et/ou aux allures équivalentes E / M / T / I / R). Chaque zone a une **plage d'allure** et un **descripteur d'effort perçu** (« conversation possible », « phrases courtes »…) pour que la prescription reste utilisable si l'allure n'est pas fiable (terrain, chaleur, pas de montre).

**3. Sans référence** :
   - novice ⇒ séances **au temps** et à l'effort (alternance course/marche si nécessaire), aucun test maximal ;
   - autres ⇒ effort perçu pendant 2–3 semaines de base, puis **test planifié** (ex. 5 km ou 20–30 min en effort régulier ; protocole du catalogue).

**4. Structure hebdomadaire (requestWeek)** selon le quota :
   - 1 séance ⇒ polyvalente ;
   - 2 ⇒ 1 facile + 1 qualité (ou 2 faciles pour un novice) ;
   - ≥ 3 ⇒ 1 sortie longue + 0–2 qualités selon le niveau et la phase + faciles.
   - Répartition visée : majorité du temps en intensité basse (`consensus`, modèles polarisé / pyramidal) : TARGET sur E5.

**5. Volume** :
   - cible hebdomadaire **en temps** (et en distance pour les objectifs de course), calculée à partir de la base E3 (28 j) et de la phase, bornée par **L3** ;
   - part de la sortie longue plafonnée (hypothèse : ≈ 25–35 % du temps hebdomadaire selon le niveau et l'objectif) ;
   - prise en compte des **kilomètres hybrides** (doc 04 §5) : l'exposition brute (100 %) entre dans L3 ; le **crédit de programmation** est calculé par `runningContribution()` selon le contexte, l'intensité et la continuité (paramètres G2, aucun coefficient universel).

**6. Archétypes V1** : `run_easy`, `run_recovery`, `run_long`, `run_progression`, `run_tempo`, `run_threshold_cruise` (intervalles au seuil), `run_vo2_intervals`, `run_repetitions` (vitesse, économie), `run_hills`, `run_strides_addon`, `run_race_pace`, `run_time_trial` (test).

**7. Affûtage** : réduction progressive du volume sur 1–3 semaines selon la distance, intensité maintenue (`consensus`, méta-analyses sur l'affûtage) ; paramètres dans le ruleset.

### OUTPUTS
Séances avec blocs `running` (`RunSegment[]`), allures (plage + zone + effort perçu), récupérations, échauffement et retour au calme, `DemandProfile` (`locomotor`, `high_intensity_systemic`, `lower_muscular`).
Services : `paceFor(zone)`, `zones()`, `runningContribution(exposure)`.

### VALIDATION
L3 (exposition locomotrice) ; répartition d'intensité (SOFT) ; au plus une sortie longue par semaine sauf exception d'objectif ; allures issues des zones de l'athlète (jamais une valeur libre) ; échauffement présent avant toute séance de qualité ; `no_running` ⇒ aucune course (substitution par un ergomètre si c'est pertinent, signalée).

### FAILURE MODES
| Cas | Comportement |
|-----|--------------|
| Cible chronométrique irréaliste pour l'échéance | `GOAL.TARGET_AMBITIOUS` + plage réaliste estimée ; l'objectif n'est pas modifié sans l'accord de l'utilisateur |
| Références contradictoires | Valeur prudente + `STATE.REFERENCE_CONFLICT` + test proposé |
| Quota insuffisant pour sortie longue + qualité | Priorité selon l'objectif et le niveau (novice : sortie longue et facile avant la qualité) |
| Restriction `no_impact` et objectif course | `CONFLICTING_GOALS` + alternatives (ergomètres) : pas de course prescrite |
| Pas d'allure fiable | Prescription par zone et effort perçu uniquement |

---

## 3. CrossTrainingEngine

Principe : **le stimulus d'abord.** Le format est choisi pour servir le stimulus, **jamais pour apporter de la variété** : la variété ne départage que des formats **admissibles** pour ce stimulus.

### INPUTS
Objectif (`crosstraining_general` ou compétition), rôle, quota, `AthleteState` (E1, E2, E5, benchmarks, skills acquis), matériel, restrictions, notes du planificateur, durée cible.

### DECISION PROCESS

**1. Catalogue des stimuli** (données relues par un expert) :

| Stimulus | Domaine de temps (travail) | Intensité | Travail / repos | Formats admissibles |
|----------|---------------------------|-----------|-----------------|---------------------|
| `strength_plus_conditioning` | force 12–20 min + metcon 6–12 min | élevée / élevée | — | séries classiques + For Time court / AMRAP court |
| `aerobic_capacity` | 20–40 min | modérée | continu | AMRAP long, EMOM long à faible densité, intervalles longs |
| `threshold` | 8–20 min cumulées | soutenue | continu ou 3–6 min / 1–2 min | intervalles, EMOM dense, AMRAP moyen |
| `anaerobic_intervals` | 6–15 min cumulées | très élevée | 1:1 à 1:3 | intervalles courts, Tabata-like (novice exclu) |
| `mixed_modal_medium` | 8–15 min | élevée | continu | For Time (rounds), AMRAP, chipper court |
| `muscular_endurance` | 10–20 min | modérée à élevée (local) | continu ou circuit | circuits structurés, EMOM |
| `skill_plus_conditioning` | skill 10–15 min + metcon faible technicité | modérée | — | EMOM skill + AMRAP / intervalles |
| `long_chipper` (avancé) | 20–35 min | modérée à élevée | continu | chipper, task priority |

   Priorité à la tâche (*task priority*, For Time / rounds) ou au temps (*time priority*, AMRAP / EMOM / intervalles) : c'est un attribut du format que le stimulus contraint.

**2. Choix du stimulus (requestWeek)** : répartition sur 14 jours selon l'objectif et la phase (TARGET sur les domaines de temps et les stimuli), les expositions (E5) et l'interférence ; 2 ou 3 variantes par demande.

**3. Composition des modalités** par stimulus : gymnastique / haltérophilie / monostructural (ex. couplet G + M pour `mixed_modal_medium`) ; patterns exclus ou pénalisés selon les notes du planificateur (`grip`, `lower_muscular`).

**4. Sélection des mouvements** : filtres (matériel, restrictions, niveau technique, exclusions) + règles de sécurité : **pas de mouvement de coût technique 3 à haut volume sous fatigue pour novice ou débutant** (ex. arraché à haute répétition dans un metcon long). Scaling par la famille de progression (`progressionFamily.rank`).

**5. Calibrage du schéma de répétitions** : on choisit reps, rounds et charges pour que la **durée attendue** (modèle de débit par niveau, doc 07 §2) tombe dans le domaine de temps du stimulus. Charges : % e1RM modéré, ou standard d'implément (wall ball, KB). Time cap = p90 attendu + marge.

**6. Structure** : échauffement (général + spécifique aux mouvements du jour) → bloc force ou skill (selon le stimulus) → metcon → accessoires optionnels → retour au calme.

**7. Benchmarks** : WODs de référence rejoués périodiquement (répétition *prévue*, doc 07 §4).

### OUTPUTS
Séances avec blocs `conditioning` (`ConditioningSpec` : format, items, time cap, score, durée attendue p50/p90, options de scaling), éventuellement `strength` / `skill`, et `DemandProfile`.

### VALIDATION
Cohérence stimulus ↔ format ↔ durée attendue (**règle clé**) ; densité EMOM réalisable (travail ≤ 40–45 s par minute au niveau de l'athlète, hypothèse) ; L4 (répétitions par mouvement, contacts de sauts) ; mouvements techniques adaptés au niveau ; scaling disponible pour chaque mouvement de niveau supérieur à celui de l'athlète.

### FAILURE MODES
| Cas | Comportement |
|-----|--------------|
| Stimulus infaisable avec le matériel | Variante au poids du corps du même stimulus, sinon stimulus voisin : `SELECT.STIMULUS_FALLBACK` |
| Durée attendue hors domaine après calibrage | Autre format admissible ; sinon autre stimulus |
| Aucun scaling pour un mouvement | Mouvement exclu |
| Débit de travail inconnu pour un exercice | Donnée catalogue manquante ⇒ exercice non candidat en conditioning (erreur de couverture du catalogue en CI) |

---

## 4. HyroxEngine (identifiant interne `hybrid_race`)

### INPUTS
Objectif (terminer ou performer), date et division, rôle, quota, `AthleteState` (capacités course et stations, E3, E5), matériel (sled, SkiErg, rameur, wall ball, sandbag…), restrictions, services du RunningEngine.

### DECISION PROCESS

**1. Modèle de course** : 8 × (1 km de course + 1 station) : SkiErg, sled push, sled pull, burpee broad jumps, rameur, farmers carry, sandbag lunges, wall balls. Distances, répétitions et charges par division : **table de données versionnée, remplie à partir du règlement officiel de la saison** (source et date consignées ; confiance `established` une fois vérifiée). Aucune valeur n'est codée en dur.

**2. Familles de séances** :

| Famille | But | Exemple |
|---------|-----|---------|
| `hr_technique` | Efficacité aux stations (wall ball, sled, transitions) | EMOM technique, faible fatigue |
| `hr_specific_strength` | Force spécifique (poussée, tirage, fentes, portés) | Sled lourd ou substitut + fentes + portés |
| `hr_station_endurance` | Tenir le volume de station | Blocs de wall balls fractionnés |
| `hr_compromised_run` | Courir après une station | 4–6 × (station + 1 km) |
| `hr_aerobic` | Base aérobie hybride | Ergomètres + course en zone 2, long |
| `hr_threshold` | Seuil hybride | Intervalles course / ergomètre au seuil |
| `hr_race_pace` | Allure de course cible | Segments à l'allure objectif |
| `hr_partial_sim` | Simulation partielle | 4 stations + 4 km |
| `hr_full_sim` | Simulation complète | **Fréquence contrôlée** |

**3. Rampe de spécificité** (selon les semaines restantes, paramètres `provisional`) :

| Phase | Part des séances spécifiques (race pace, simulations, course compromise) | Simulation complète |
|-------|-------------------------------------------------------------------------|---------------------|
| Générale | faible | en principe aucune |
| Développement | moyenne | selon la politique de fréquence |
| Spécifique | élevée | selon la politique de fréquence |
| Affûtage | réduite en volume, spécificité maintenue | aucune dans une fenêtre finale paramétrable |

**3 bis. Politique de fréquence de la simulation complète (V1.1).** Le principe de **fréquence contrôlée** est conservé, mais aucun intervalle n'est universel (l'hypothèse « 4–6 semaines » de la V1 n'est plus une règle). L'intervalle minimal et le nombre maximal par cycle sont calculés par une politique paramétrable du ruleset (G2) :

```ts
fullSimPolicy(ctx: { level: Level; hybridRaceExperience: 'none' | 'some' | 'experienced'; phase: PhaseKind;
                     readiness: Readiness; weeksToRace: number; lastFullSimAt?: ISODate; recoveryAfterLastSim?: 'good' | 'poor' | 'unknown' })
  → { allowed: boolean; minWeeksSinceLast: number; maxPerCycle: number; finalWindowDays: number; reasons: ReasonCode[] };
```

Tendances par défaut : un premier HYROX ou un niveau débutant ⇒ moins de simulations complètes (préférer les simulations partielles) ; lecture de l'état `caution` / `reduce` ou mauvaise récupération après la précédente ⇒ report ; proximité de la course ⇒ fenêtre finale sans simulation complète.

**4. Course dans les séances HYROX** : allures fournies par le RunningEngine (allure de course cible, allure compromise attendue = allure fraîche + écart mesuré ou estimé). Chaque portion courue produit une `RunningExposure` (contexte `compromised`, etc.) comptée selon doc 04 §5.

**5. Substitutions de stations** (fidélité, table relue par l'expert HYROX) :

| Station | Fidélité élevée | Moyenne | Faible |
|---------|-----------------|---------|--------|
| SkiErg | — | rameur | assault bike ; tirages élastique debout |
| Sled push | — | poussée sur tapis non motorisé | fentes marchées lourdes + sprint vélo |
| Sled pull | — | tirage de corde lestée | rowing lourd + marche arrière à l'élastique |
| Burpee broad jump | (poids du corps, espace nécessaire) | burpee + saut en longueur séparés | burpees sur place (si `no_jumping` : exclu) |
| Rameur | — | SkiErg | vélo |
| Farmers carry | haltères / KB (charge suffisante) | portés unilatéraux alternés | portés plus légers + temps prolongé |
| Sandbag lunges | fentes avec sac lesté ou poids en rack avant | fentes haltères | fentes au poids du corps |
| Wall balls | — | thrusters haltères ou médecine-ball | squat + push press légers |

   Fidélité faible ⇒ `SELECT.SUBSTITUTION_LOW_FIDELITY` (avertissement), avec en phase spécifique une recommandation d'accès au vrai matériel au moins 1 séance sur 2 semaines.

### OUTPUTS
Séances avec blocs `hybrid_station_work` (`HybridSpec`), `running`, `strength`, avec les exigences de transitions, les allures, les charges de station et le `DemandProfile` (souvent `lower_muscular`, `locomotor`, `grip`, `high_intensity_systemic` élevés : d'où l'importance de l'InterferenceManager).

### VALIDATION
Fréquence de simulation complète conforme à la politique `fullSimPolicy` ; aucune simulation dans la fenêtre finale ; charges des stations conformes à la division (ou progressivement inférieures en phase générale, avec une progression définie) ; substitutions signalées ; exposition de course comptée ; L1 et I5 autour des séances clés.

### FAILURE MODES
| Cas | Comportement |
|-----|--------------|
| « HYROX complet en 20 min, sans matériel » | `NO_VALID_SOLUTION` + alternatives (doc 01 §7) |
| Aucun matériel de station | Séances à substitutions de faible fidélité + avertissement + suggestion de profil de matériel « salle » |
| Course dans moins de N semaines | Macrocycle compressé ; objectif `finish` recommandé si les capacités sont loin de la cible |
| `no_running` | La course de l'épreuve est remplacée par un ergomètre en entraînement, avec l'avertissement que la préparation est incomplète |
