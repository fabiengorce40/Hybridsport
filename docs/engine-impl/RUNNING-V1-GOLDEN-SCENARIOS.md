# RUNNING-V1-GOLDEN-SCENARIOS — scénarios de référence R1–R12 (révisés en 5B)

> **Définition seulement** : aucune séance générée, aucun code. Révisé après l’arbitrage 5B ([`RUNNING-5B-SCIENTIFIC-ARBITRATION.md`](RUNNING-5B-SCIENTIFIC-ARBITRATION.md)). Les scénarios deviendront des goldens en 5C/5D, avec déterminisme, trace et reproductibilité par ruleset.
>
> **Abréviations**
> - Réf. = `RunningReferenceConfidence` ; Presc. = `RUNNING_PRESCRIPTION_CONFIDENCE`.
> - Archétypes V1 (11) : EASY_RUN (dont `LOW_DOSE_RECOVERY`), LONG_RUN, STEADY_RUN, THRESHOLD (CONTINUOUS ou INTERVALS), VO2_INTERVALS, SHORT_INTERVALS, STRIDES (module), HILL_REPETITIONS, RACE_PACE_SESSION, PROGRESSION_RUN, TEST_SESSION.
> - Les codes de raison sont **conceptuels** (préfixes indicatifs : `REF.`, `PERF.`, `CONF.`, `LOAD.`, `PROG.`, `REPLAN.`, `RETURN.`, `SAFETY.`, `TAPER.`, `CONC.`, `TID.`).
>
> **Changements 5B par rapport à la 5A**
> - archétypes fusionnés ;
> - hausse de référence sur preuve suffisamment fiable (B1) ;
> - variable dominante sans priorité universelle (B2) ;
> - G1 reclassés (B5) ;
> - codes de raison ajoutés ;
> - références faisant autorité précisées.

---

### R1 — Novice sans référence fiable, objectif général, 3 séances par semaine
- **Entrées** : P-R0, GENERAL_RUNNING, 3 séances, sans historique fiable, sans montre.
- **Références faisant autorité** : aucune. Les observations d’entraînement (calibration) deviendront la première source.
- **Confiance** : Réf. aucune ; Presc. LOW.
- **Archétypes autorisés** : EASY_RUN (alternance course / marche possible via `repeat` en `easy_low`).
- **Archétypes interdits** : TEST_SESSION maximal, VO2_INTERVALS, SHORT_INTERVALS, HILL_REPETITIONS, THRESHOLD, RACE_PACE_SESSION. STRIDES seulement après une régularité établie.
- **Autorité de progression** : ProgressionEngine sous G1 NOVICE_ENTRY ; variable dominante candidate : fréquence ou durée hebdomadaire selon l’adhérence.
- **Points d’attention charge** : `weeklyDistance` UNKNOWN (non déclarée) ⇒ jamais imputée ; progression en HOLD tant que les retours manquent.
- **Points d’attention concurrent** : aucun.
- **Inconnues** : tolérance, capacité, toute allure.
- **Interactions G1** : NOVICE_ENTRY (pas de test maximal, conditions d’arrêt), PAIN_STOP, OUT_OF_SCOPE (questions d’éligibilité).
- **Codes de raison attendus** : `REF.NONE`, `CONF.PRESCRIPTION_LOW`, `SAFETY.NOVICE_ENTRY`, `LOAD.DIMENSION_UNKNOWN`, `PROG.HOLD_AWAITING_FEEDBACK`.
- **Hypothèses interdites** : allure calculée par l’âge, le sexe, le poids ou une formule de FCmax ; 80/20 ; hausse de 10 % présentée comme préventive.

### R2 — Débutant, premier 5 km, 2 à 3 séances par semaine
- **Entrées** : P-R1, 5K (date éventuelle), 2 à 3 séances, référence déclarée ou absente.
- **Références faisant autorité** : USER_DECLARED_REFERENCE (LOW) si présente ; les observations d’entraînement l’emportent dès qu’elles sont concordantes.
- **Confiance** : Réf. LOW ; Presc. LOW.
- **Archétypes autorisés** : EASY_RUN, STRIDES (module), TEST_SESSION ou contre-la-montre **quand la tolérance le permet**, SHORT_INTERVALS par effort limité (EXPERT_DESIGN_REVIEW).
- **Archétypes interdits** : THRESHOLD CONTINUOUS, LONG_RUN spécifique, RACE_PACE_SESSION tant que la confiance est LOW.
- **Autorité de progression** : ProgressionEngine ; variable dominante choisie selon la phase et l’adhérence (souvent la fréquence ou la durée ; l’intensité n’est pas exclue par principe).
- **Points d’attention charge** : à 2 séances, chaque séance de qualité pèse lourd ; TID décrite par séance.
- **Points d’attention concurrent** : aucun.
- **Inconnues** : performance réelle.
- **Interactions G1** : PAIN_STOP ; NOVICE_ENTRY seulement si l’athlète est reclassé P-R0.
- **Codes de raison attendus** : `REF.DECLARED_ONLY`, `CONF.PRESCRIPTION_LOW`, `TID.PER_SESSION`, `PERF.TEST_PROPOSED`, `TAPER.NOT_ELIGIBLE_LOW_LOAD`.
- **Hypothèses interdites** : allure objectif 5K traitée comme une référence ; plan « 5K en N semaines » appliqué sans condition ; taper imposé.

### R3 — Intermédiaire, 10 km, référence récente fiable, 3 séances par semaine
- **Entrées** : P-R3, 10K, RECENT_RACE_RESULT à 10 km récent en conditions normales, 3 séances.
- **Références faisant autorité** : la course de 10 km pour l’allure spécifique 10K et l’estimation de la frontière 2 (en plage) ; les observations pour la tolérance.
- **Confiance** : Réf. HIGH (10K), MEDIUM (frontière 2 dérivée), LOW à MEDIUM (plafond easy) ; Presc. MEDIUM à HIGH selon l’archétype.
- **Archétypes autorisés** : EASY_RUN, THRESHOLD (INTERVALS ou CONTINUOUS), VO2_INTERVALS, SHORT_INTERVALS, HILL_REPETITIONS, RACE_PACE_SESSION, STRIDES, LONG_RUN (non central).
- **Archétypes interdits** : aucun par principe ; densité bornée par `hi.densityPolicy`.
- **Autorité de progression** : ProgressionEngine ; une variable dominante (volume de travail de qualité ou intensité selon la phase).
- **Points d’attention charge** : à 3 séances, la part de qualité est forte ; LCA sur `highIntensityExposure`.
- **Points d’attention concurrent** : aucun.
- **Inconnues** : frontière 1, FC individuelle.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `REF.RACE_SPECIFIC`, `PERF.THRESHOLD_FROM_RACE_RANGE`, `CONF.PRESCRIPTION_HIGH`, `PROG.DOMINANT_VARIABLE`, `TID.PER_SESSION`.
- **Hypothèses interdites** : allure 10K = seuil ; CS inférée comme vérité ; allure unique exacte ; plusieurs dimensions progressant ensemble.

### R4 — Intermédiaire, semi-marathon, 4 séances par semaine
- **Entrées** : P-R3, HALF_MARATHON, 4 séances ; 10 km récent et semi ancien.
- **Références faisant autorité** :
  - le 10 km récent pour la frontière 2 ;
  - le semi ancien seulement comme indice, avec décroissance contextuelle et demande de revue ;
  - un semi (ou un contre-la-montre long) récent souhaité pour l’allure spécifique.
- **Confiance** : Réf. HIGH (10K), LOW (semi ancien) ; Presc. MEDIUM pour l’allure semi (extrapolation modérée).
- **Archétypes autorisés** : EASY_RUN, LONG_RUN (durée), STEADY_RUN, THRESHOLD, PROGRESSION_RUN, RACE_PACE_SESSION (plage large), STRIDES, VO2_INTERVALS (complémentaire).
- **Archétypes interdits** : aucun par principe.
- **Autorité de progression** : ProgressionEngine ; variable dominante candidate : `longRunDuration` ou `intervalVolume` selon l’écart à l’objectif.
- **Points d’attention charge** : `longRunDuration` évaluée par rapport à son propre historique.
- **Points d’attention concurrent** : aucun.
- **Inconnues** : tolérance à un long run plus long ; performance actuelle au semi.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `REF.STALE_REVIEW`, `PERF.EXTRAPOLATED_MODERATE`, `CONF.PRESCRIPTION_MEDIUM`, `PROG.DOMINANT_VARIABLE`, `TAPER.POLICY_CONTEXT`.
- **Hypothèses interdites** : long run = pourcentage du volume ; semi ancien pris comme référence HIGH ; formule pondérée pour combiner les références.

### R5 — Avancé, 10 km, 5 séances par semaine, plusieurs références cohérentes
- **Entrées** : P-R4 ; 5 km, 10 km et semi récents et concordants ; FC de laboratoire éventuelle.
- **Références faisant autorité** : l’interpolation multi-distances ; CS comme **signal corroboré** ; LAB_THRESHOLD pour la frontière mesurée si présente.
- **Confiance** : Réf. HIGH ; Presc. HIGH sur terrain plat.
- **Archétypes autorisés** : les 11.
- **Archétypes interdits** : aucun ; densité bornée par la politique (PRODUCT_GUARDRAIL).
- **Autorité de progression** : ProgressionEngine ; l’intensité peut être la variable dominante (confiance HIGH, charge stable).
- **Points d’attention charge** : `highIntensityExposure`, `sessionDensity`.
- **Points d’attention concurrent** : aucun.
- **Inconnues** : réponse individuelle aux différentes TID.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `PERF.INTERPOLATED`, `REF.CS_CORROBORATED`, `CONF.PRESCRIPTION_HIGH`, `TID.EMERGENT`, `PROG.DOMINANT_INTENSITY`.
- **Hypothèses interdites** : dosage par D’ ; polarisé imposé ; hausse de référence sur une séance isolée.

### R6 — Marathon, historique long, 5 séances par semaine
- **Entrées** : P-R3 ou P-R4, MARATHON ; plusieurs années de pratique ; long runs réguliers ; semi récent.
- **Références faisant autorité** : le semi récent (extrapolation vers le marathon par une famille de modèles choisie en ruleset) ; l’historique de long run pour la tolérance.
- **Confiance** : Réf. HIGH (semi) ; Presc. MEDIUM (allure marathon), MEDIUM à HIGH (long run).
- **Archétypes autorisés** : EASY_RUN, LONG_RUN (central, portions spécifiques), STEADY_RUN, THRESHOLD, RACE_PACE_SESSION, PROGRESSION_RUN, STRIDES, VO2_INTERVALS (complémentaire).
- **Archétypes interdits** : aucun par principe.
- **Autorité de progression** : ProgressionEngine ; une variable dominante (`longRunDuration` **ou** `weeklyDuration` **ou** `specificity`).
- **Points d’attention charge** : `mechanicalExposure` du long run ; `longRunDuration` et `weeklyDuration` jamais en hausse ensemble.
- **Points d’attention concurrent** : aucun.
- **Inconnues** : performance marathon réelle.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `PERF.EXTRAPOLATED_FAR`, `CONF.LONG_EVENT_HISTORY_OK`, `PROG.DOMINANT_VARIABLE`, `TAPER.PRINCIPLE_SUPPORTED`, `TAPER.MAGNITUDE_EXPERT`.
- **Hypothèses interdites** : allure marathon = fraction fixe de CS ou de la VMA ; taper de 41–60 % sur 21 jours comme constante ; long run en pourcentage ; VDOT comme autorité.

### R7 — Athlète hybride, 3 courses + musculation / cross-training
- **Entrées** : P-R2 et P-HYBRID ; 3 courses ; 2 à 3 séances de musculation dont jambes ; HYROX éventuel.
- **Références faisant autorité** : selon les références disponibles ; le programme Strength fournit ses demandes par structure (non modifié).
- **Confiance** : Presc. plafonnée à MEDIUM tant que la charge concurrente n’est pas stable.
- **Archétypes autorisés** : EASY_RUN, THRESHOLD, SHORT_INTERVALS, VO2_INTERVALS, STRIDES, LONG_RUN (selon l’objectif), HILL_REPETITIONS (avec contrainte de placement).
- **Archétypes interdits** : aucun par principe ; HILL_REPETITIONS et LONG_RUN soumis à l’arbitrage de l’InterferenceManager.
- **Autorité de progression** : ProgressionEngine sous l’intention du GlobalPlanner ; HOLD si la charge concurrente augmente.
- **Points d’attention charge** : `concurrentLocomotorLoad` ESTIMATED ou UNKNOWN (jamais 0) ; course intégrée (`wod_embedded`) comptée.
- **Points d’attention concurrent** :
  - demandes de séance (`mechanicalDemand`, `locomotorDemand`, `metabolicDemand`, `structuralDemand`, `recoveryDemand`, `sessionPriority`, `placementConstraints`) ;
  - le GlobalPlanner place les séances ;
  - pas d’espacement universel ;
  - sexe et statut d’entraînement comme contexte d’interprétation seulement.
- **Inconnues** : charge locomotrice HYROX assimilable à de la course.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `CONC.DEMAND_DECLARED`, `CONC.PLACEMENT_BY_PLANNER`, `LOAD.CONCURRENT_ESTIMATED`, `TID.CONCURRENT_INCLUDED`, `PROG.HOLD_CONCURRENT_RISE`.
- **Hypothèses interdites** : « séparer exactement X heures » ; « course + musculation = mauvais » ; RunningEngine qui place lui-même les séances ; modification des paramètres Strength ; correction par sexe.

### R8 — Retour après interruption
- **Entrées** : P-R3 ; interruption de durée LONG (frontière en paramètre) ou d’état UNKNOWN ; 10 km antérieur.
- **Références faisant autorité** : aucune à HIGH. Le 10 km antérieur est dégradé (décroissance + demande de revue) ; les observations de reprise priment.
- **Confiance** : Réf. LOW ; Presc. LOW.
- **Archétypes autorisés** : EASY_RUN, STRIDES (selon la tolérance).
- **Archétypes interdits** : VO2_INTERVALS, SHORT_INTERVALS, TEST_SESSION maximal, HILL_REPETITIONS, RACE_PACE_SESSION, jusqu’à ce que les conditions de reprise soient remplies.
- **Autorité de progression** : ProgressionEngine sous G1 RETURN_PROTOCOL ; HOLD tant que les informations requises manquent (charge antérieure, durée, raison, tolérance, course récente, readiness).
- **Points d’attention charge** : base récente = réalisé depuis la reprise.
- **Points d’attention concurrent** : selon le profil.
- **Inconnues** : niveau et tolérance actuels ; raison de l’interruption.
- **Interactions G1** : RETURN_PROTOCOL (LONG / UNKNOWN) ; PAIN_STOP ; OUT_OF_SCOPE si la raison déclarée est médicale.
- **Codes de raison attendus** : `RETURN.STATE_LONG` ou `RETURN.STATE_UNKNOWN`, `REF.DEGRADED_AFTER_BREAK`, `PROG.HOLD_RETURN_REQUIREMENTS`, `SAFETY.RETURN_PROTOCOL`.
- **Hypothèses interdites** : reprise au niveau antérieur ; allures antérieures conservées ; pourcentage de perte inventé ; diagnostic.

### R9 — Objectif de course, référence ancienne ou conflictuelle
- **Entrées** : P-R2 ou P-R3, 10K ou semi ; 10 km ancien rapide ; séances récentes plus lentes que prévu.
- **Références faisant autorité** : pour la prescription, l’estimation **la plus prudente** ; les observations concordantes peuvent **baisser** la référence.
- **Confiance** : Réf. LOW (conflit non résolu) ; Presc. LOW à MEDIUM.
- **Archétypes autorisés** : EASY_RUN, THRESHOLD par effort, TEST_SESSION ou contre-la-montre de contrôle, STRIDES.
- **Archétypes interdits** : RACE_PACE_SESSION en PACE (seulement en effort) tant que le conflit dure.
- **Autorité de progression** : ProgressionEngine ; la variable dominante ne peut pas être l’intensité en PACE tant que la confiance est LOW.
- **Points d’attention charge** : aucun point particulier.
- **Points d’attention concurrent** : selon le profil.
- **Inconnues** : niveau actuel réel.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `REF.CONFLICT`, `PERF.CONFLICT_CONSERVATIVE`, `REF.DOWNGRADE_CONCORDANT_OBS`, `PERF.TEST_PROPOSED`.
- **Hypothèses interdites** : moyenne pondérée des références ; référence ancienne gardée HIGH ; hausse sur une séance isolée.

### R10 — Séance manquée dans une semaine
- **Entrées** : P-R2 à P-R4 ; une séance KEY manquée en milieu de semaine.
- **Références faisant autorité** : inchangées.
- **Confiance** : inchangée.
- **Archétypes autorisés** : ceux de la semaine planifiée.
- **Archétypes interdits** : aucun ajout de séance difficile adjacente à une autre séance difficile.
- **Autorité de progression** : AdaptationEngine (replanification) ; aucune progression déclenchée par le manque.
- **Points d’attention charge** : la charge de la semaine ne dépasse pas le prévu ; pas de rattrapage.
- **Points d’attention concurrent** : les contraintes de placement du GlobalPlanner restent valides.
- **Inconnues** : raison si elle n’est pas renseignée.
- **Interactions G1** : aucune (sauf si la raison est PAIN : PAIN_STOP).
- **Hiérarchie de décision** : séances importantes à venir > récupération > spécificité > volume compatible.
- **Codes de raison attendus** : `REPLAN.MISSED_KEY`, `REPLAN.MOVED_VALID_SLOT` ou `REPLAN.DROPPED_NO_VALID_SLOT`, `REPLAN.NO_MAKE_UP`, `REPLAN.FROZEN_ZONE_RESPECTED`.
- **Hypothèses interdites** : empiler deux séances difficiles ; rattraper des kilomètres ; modèle de dette ; hausse de la semaine suivante.

### R11 — Taper pré-compétition
- **Entrées** : P-R3 ; épreuve datée (10K, semi ou marathon) ; charge antérieure connue.
- **Références faisant autorité** : inchangées ; la course deviendra une RECENT_RACE_RESULT.
- **Confiance** : Presc. MEDIUM (principe soutenu ; ampleur et durée selon le contexte).
- **Archétypes autorisés** : séances courtes de rappel spécifique (RACE_PACE_SESSION courte), EASY_RUN, STRIDES.
- **Archétypes interdits** : nouvelles séances à forte demande (par exemple LONG_RUN long, HILL_REPETITIONS longues) à l’approche immédiate ; la frontière temporelle exacte relève de l’expert (EXPERT_DESIGN_REVIEW).
- **Autorité de progression** : ProgressionEngine en direction DOWN pour le volume ; intensité et fréquence maintenues.
- **Points d’attention charge** : réduction du volume dans la plage de preuve, ajustée par épreuve et niveau.
- **Points d’attention concurrent** : décharge synchronisée avec les autres disciplines (GlobalPlanner).
- **Inconnues** : réponse individuelle.
- **Interactions G1** : aucune.
- **Codes de raison attendus** : `TAPER.PRINCIPLE_SUPPORTED`, `TAPER.MAGNITUDE_RANGE`, `TAPER.DURATION_CONTEXT`, `TAPER.INTENSITY_MAINTAINED`.
- **Hypothèses interdites** : constantes universelles (41–60 %, ≤ 21 jours) ; suppression de l’intensité ; taper identique pour toutes les épreuves ; taper obligatoire sans charge accumulée.

### R12 — Référence déclarée uniquement
- **Entrées** : P-R1 ou P-R2 ; 10K ; « je cours le 10 km en X » (non daté, sans conditions).
- **Références faisant autorité** : aucune au-dessus de LOW. La déclaration est conservée comme USER_DECLARED_REFERENCE ; les observations concordantes peuvent la confirmer (hausse de confiance) ou la contredire.
- **Confiance** : Réf. LOW ; Presc. LOW.
- **Archétypes autorisés** : EASY_RUN, STRIDES, THRESHOLD par effort, TEST_SESSION ou contre-la-montre (proposé).
- **Archétypes interdits** : RACE_PACE_SESSION en PACE.
- **Autorité de progression** : ProgressionEngine ; intensité en PACE exclue tant que la confiance est LOW.
- **Points d’attention charge** : aucun point particulier.
- **Points d’attention concurrent** : selon le profil.
- **Inconnues** : date, conditions, exactitude de la déclaration.
- **Interactions G1** : PAIN_STOP.
- **Codes de raison attendus** : `REF.DECLARED_ONLY`, `CONF.PRESCRIPTION_LOW`, `PERF.TEST_PROPOSED`, `TARGET.EFFORT_PRIORITY`.
- **Hypothèses interdites** : déclaration traitée comme une course ; plages étroites ; seuils ou CS dérivés comme mesurés.

---

## Invariants transverses (à tester en 5C)
1. Aucune allure sans référence valide pour la décision (R1, R2, R12).
2. Une estimation de performance ne devient jamais une cible sans décision tracée (tous).
3. Une seule variable de progression dominante (R3–R6).
4. Pas d’empilement de séances difficiles, pas de rattrapage (R10).
5. CS jamais obligatoire ni seule autorité (R5 ; tous les autres scénarios fonctionnent sans CS).
6. Pas de correction démographique (R1, R7).
7. UNKNOWN jamais imputé (R1, R7).
8. Un paramètre non G1 ne relâche jamais une contrainte G1 (R1, R8).
9. Déterminisme : même entrée, même ruleset, même graine ⇒ même sortie et même trace.
10. Toute valeur issue du registre est tracée avec son statut.
