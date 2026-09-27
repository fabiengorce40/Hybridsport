# 07 — Paramètres du ruleset, règles G2 à relire, risques, décisions ouvertes

## 1. Paramètres du ruleset (section 22)

**Aucune valeur n'est fixée ici.** Chaque paramètre aura, dans le ruleset : un identifiant, une version, un statut, une confiance, une source ou justification, le drapeau `provisional` et, pour G2, une plage approuvée par l'expert (spec 09 §3.1, §4). Les hypothèses de la spec V1.2 (doc 06 §1) peuvent servir de **point de départ à la discussion** avec l'expert, jamais de valeur par défaut dans le code.

| Identifiant | Forme | Classe | Utilisé par |
|-------------|-------|--------|-------------|
| `strength.stimuli` | liste d'identifiants | G2 | intention, dosage |
| `strength.needs.priority` | `goal → need → rang` | G2 | P3, glouton, budget, B1 |
| `strength.support.emphasis` | `supportFor → need → rang` et plafond de volume du bas du corps | G2 | A4, P3 |
| `strength.archetype.duration` | `archetype → {minS, maxS}` | G2 | schéma d'archétype |
| `strength.selection.criteriaOrder` | `role → ordre de C1 à C8` | G2 (C1–C4), G3 (C5–C7) | §7.2 |
| `strength.selection.skillCeiling` | `level → skillLevel max` | **G1** | F7 |
| `strength.selection.localSearchMaxSwaps` | nombre | G4 | amélioration locale |
| `strength.proposals.max` | nombre | G4 | §3 |
| `strength.dose.base` | `stimulus → role → exerciseClass → {repRange, rirTarget, setsRange, restRange}` | G2 | §9 |
| `strength.dose.modifiers` | bornes de M1 à M6 | G2 | §9.2 |
| `strength.dose.tempoPolicy` | conditions | G2 | §9.4 |
| `strength.load.e1rmFormula` | identifiant de formule + `validRepRange` | G2 | §10 |
| `strength.load.pctTable` | `(reps, RIR) → %` | G2 | §10 |
| `strength.load.assumedRirWhenUnknown` | nombre | G2 | R2 |
| `strength.load.referenceWindows` | paliers d'ancienneté | G2 | §10.1 |
| `strength.load.defaultIncrements` | `loadModel → kg[]` | G4 | arrondi |
| `strength.rampup.minRelativeIntensity` / `steps` / `reps` / `restS` / `samePatternMax` | seuils et tables | G2 | §11 |
| `strength.progression.modelFor` | `level → role → exerciseClass → modèle` | G2 | §12 |
| `strength.progression.steps` | `modèle → pas` (réalisables) | G2 | §12 |
| `strength.progression.classification` | seuils `above` / `partial` / `below` | G2 | §12.2 |
| `strength.progression.evidenceRequired` | `modèle → nombre d'expositions` | G2 | §12.2 |
| `strength.progression.cycleCap` | plafond de gain par mésocycle | G2 | §12 |
| `strength.progression.regressionStep` | pas de réduction | G2 | `below` × 2 |
| `strength.anchor.maxWeeks` / `rotationPolicy` | `level → semaines` ; politique | G2 | §8 |
| `strength.volume.weeklyRange` | `goal → level → groupe → {floor, high}` (L5) | G2 | §13 |
| `strength.volume.supportRange` | idem pour le soutien | G2 | §13 |
| `strength.volume.sessionCap` | `level → groupe → max` (L4) | **G1** | STR-V2 |
| `strength.volume.muscleGroups` | alias muscles → groupes | G5 | §13 |
| `strength.interference.adjustments` | `note / voisin → ajustements C4 et M5` | G2 | §14 |
| `strength.axialLoad.maxHighPerSession` | nombre | G2 | A3 |
| `strength.substitution.patternFallback` | `need → pattern de repli` | G2 | F4 |
| `strength.substitution.primaryF4Policy` | `change_stimulus` ou `no_proposal` | G2 | §17 |
| `strength.maxEffort.threshold` | seuil de `top_set` / de série lourde | **G1** | STR-V7 |
| `strength.benchmark.safetyWindowDays` | nombre | **G1** | STR-V8 |
| `strength.fingerprint.energyByStimulus` | `stimulus → {low, moderate, high}` | G2 | empreinte |
| `strength.frequency.maxPerWeek` | nombre | G3 | périmètre |

## 2. Règles G2 à faire relire (section 26)

Colonne « Source » : **aucune référence n'est inventée**. `EVIDENCE_REVIEW_REQUIRED` signifie qu'une recherche documentaire est nécessaire avant approbation. Les pistes citées sont des **directions de recherche à vérifier**, pas des citations validées.

| Id | Principe | Paramètres | Justification | Source à rechercher | Confiance actuelle |
|----|----------|-----------|---------------|---------------------|--------------------|
| STR-G2-01 | Profils de dosage par stimulus × rôle × classe d'exercice | `strength.dose.base` | Les plages de reps, d'effort et de repos dépendent de l'objectif et du rôle | EVIDENCE_REVIEW_REQUIRED — piste : prises de position sur les modèles de progression en musculation (ex. ACSM, à vérifier) | `consensus` (plages), `heuristic` (valeurs) |
| STR-G2-02 | Modificateurs de dosage (niveau, phase, lecture de l'état, multisport, temps) et priorité à la prudence | `strength.dose.modifiers` | Adapter sans changer la structure | EVIDENCE_REVIEW_REQUIRED | `heuristic` |
| STR-G2-03 | Plages de volume hebdomadaire par groupe, objectif et niveau (L5) | `strength.volume.weeklyRange`, `supportRange` | Relation dose-réponse volume / hypertrophie ; volume de maintien pour le soutien | EVIDENCE_REVIEW_REQUIRED — piste : méta-analyses dose-réponse du volume d'entraînement (à rechercher) | `consensus` (effet), `heuristic` (bornes) |
| STR-G2-04 | Pondération 0,5 des muscles secondaires dans E1 | (CORE, doc 04) | Comptage simple et explicable | EVIDENCE_REVIEW_REQUIRED | `heuristic` |
| STR-G2-05 | Table reps × RIR → %e1RM et formule d'e1RM, avec leur plage de validité | `strength.load.pctTable`, `e1rmFormula` | Prescription de charge quand la confiance est élevée | EVIDENCE_REVIEW_REQUIRED — piste : échelles RPE fondées sur les répétitions en réserve (à vérifier) ; formules d'estimation du 1RM (à comparer) | `consensus` (principe), `heuristic` (table) |
| STR-G2-06 | RIR supposé quand il est inconnu (R2) | `strength.load.assumedRirWhenUnknown` | Prudence | Jugement d'expert | `provisional` |
| STR-G2-07 | Montées en charge : conditions, paliers, reps, repos | `strength.rampup.*` | Préparation aux charges lourdes sans fatigue | EVIDENCE_REVIEW_REQUIRED (pratique professionnelle à documenter) | `consensus` (pratique), `heuristic` (tables) |
| STR-G2-08 | Modèles de progression par niveau, rôle et classe ; pas ; classement ; preuves ; plafonds par cycle | `strength.progression.*` | Progression mesurable, bornée, sans « progression infinie » | EVIDENCE_REVIEW_REQUIRED — piste : littérature sur l'autorégulation et la double progression (à rechercher) | `consensus` (modèles), `heuristic` (pas, seuils) |
| STR-G2-09 | Durée de vie et rotation des ancres | `strength.anchor.*` | Stabilité pour progresser, variation pour éviter la stagnation | Jugement d'expert (pratique de coaching) | `heuristic` |
| STR-G2-10 | Priorité des besoins par objectif et accents de soutien par discipline | `strength.needs.priority`, `strength.support.emphasis` | Pertinence pour l'objectif et les autres disciplines | EVIDENCE_REVIEW_REQUIRED (soutien course : force et pliométrie en endurance ; soutien HYROX : pratique professionnelle) | `heuristic` |
| STR-G2-11 | Ajustements multisport (bas du corps avant une séance de qualité, grip, charge axiale) | `strength.interference.adjustments`, `strength.axialLoad.maxHighPerSession` | Protéger les séances clés des autres disciplines | EVIDENCE_REVIEW_REQUIRED — piste : littérature sur l'interférence force / endurance (à rechercher) | `heuristic` |
| STR-G2-12 | Ordre des critères de sélection C1–C4 par rôle, préférence de modalité par emplacement, **aucun bonus de modalité** | `strength.selection.criteriaOrder` | Le besoin de l'emplacement décide, pas la catégorie d'équipement | Jugement d'expert | `heuristic` |
| STR-G2-13 | Replis de pattern et politique F4 sur le principal | `strength.substitution.*` | Préserver l'objectif de l'emplacement | Jugement d'expert | `heuristic` |
| STR-G2-14 | Contrôles STR-V1, STR-V3 et STR-V4 | fiches de règles | Cohérence de la séance | Jugement d'expert | `heuristic` |
| STR-G2-15 | Répartition énergétique de l'empreinte par stimulus | `strength.fingerprint.energyByStimulus` | Anti-doublon entre séances | Jugement d'expert | `provisional` |
| STR-G2-16 | Durées minimale et maximale des archétypes | `strength.archetype.duration` | Seuil sous lequel l'archétype perd son objet | Jugement d'expert + calibration sur données réelles | `provisional` |

**Règles G1** (expert qualifié ; le produit ne peut pas les modifier) : plafond technique par niveau (F7), L4 par séance (STR-V2), exercice technique sous fatigue chez le novice (STR-V6), éligibilité à l'effort maximal (STR-V7), fenêtre de sécurité des séries de référence maximales (STR-V8).

**Règles PRODUCT / TECHNICAL** (G3 / G4) :
- critères C5–C7 (variété locale, préférence, logistique) ;
- nombre de propositions ;
- borne de l'amélioration locale ;
- incréments par défaut et arrondis ;
- fréquence maximale ;
- questions de feedback ;
- STR-V5 (charge réalisable) ;
- schéma du `StrengthContext` ;
- déterminisme.

## 3. Risques (section 27)

| Risque | Effet | Atténuation |
|--------|-------|-------------|
| Paramètres G2 mal calibrés | Séances trop faciles ou trop dures | Plages approuvées par l'expert ; observabilité (écart prévu / réalisé, taux de `below`) ; bêta encadrée |
| Données de feedback pauvres (séries cochées sans valeurs) | Progression gelée en permanence | Valeurs préremplies (0 tap si conforme) ; `no_data` visible ; confiance affichée |
| Catalogue incomplet pour un preset | `NO_VALID_PROPOSAL` fréquent | CC1–CC11 bloquants avant la production ; faisabilité déclarée des archétypes |
| Biais de modalité réintroduit par le contenu du catalogue (ordinaux `stability` / `loadCeiling` mal saisis) | Machines sous-choisies malgré l'absence de bonus | S7, longitudinal (part des modalités), relecture G5 des ordinaux |
| Contexte de semaine absent (planificateur non encore implémenté) | Adaptation multisport aveugle | Hypothèse prudente + `DATA.WEEK_CONTEXT_UNKNOWN` ; S3 et S4 testés avec un contexte fourni |
| e1RM surestimé (R4 déclaratif) | Charges trop lourdes | Mode RIR prioritaire en confiance `low` ; cohérence des sources ; mesures prioritaires |
| Ancre inadaptée qui persiste | Stagnation | Détection de stagnation (CORE) ; durée maximale ; rotation à la frontière du mésocycle |
| Complexité du dosage (6 modificateurs) | Difficulté d'explication | Un reason code par modificateur ; priorité à la prudence, déterministe ; tests unitaires par modificateur |
| Dépendance aux extensions CORE-EXT-1 à 3 | Blocage de l'implémentation | Décision demandée avant la phase 4B (§4) |

## 4. Décisions non résolues (section 28)

### 4.1 Extensions du contrat CORE (bloquantes pour l'implémentation)

Motif : **impossibilité réelle d'implémenter correctement** le moteur (clause de la consigne). Les trois extensions sont **additives** : tous les champs sont facultatifs, aucun comportement existant ne change, et chacune a une migration triviale.

| Id | Proposition minimale | Impact CORE | Migration |
|----|---------------------|-------------|-----------|
| **CORE-EXT-1** | `zSetPrescription` : `load?: { mode: 'absolute' \| 'suggested' \| 'indicative'; kg?: number; rangeKg?: {min, max} }`, `rpe?`, `repRange?: {min, max}`, `tempo?: string`. `zItem` : `slotId?`, `progressionTrackId?`, `anchorCandidate?: boolean`, `alternatives?: ExerciseId[]` | Schéma de séance (domain) ; validateur : contrôles de finitude et de bornes (G4) ; DurationEngine inchangé | `session_record` v2 → v3 : ajout de champs facultatifs, contenu sportif inchangé (la garde de migration du CORE le vérifie) |
| **CORE-EXT-2** | `SportSessionRequest.disciplineContext?: unknown`, transmis tel quel à `SportEngineInput.disciplineContext` ; **validé par le moteur** (schéma strict du `StrengthContext`) | Contrat SportEngine (pass-through, aucune logique) | Aucune (entrée) |
| **CORE-EXT-3** | `propose()` peut renvoyer `{ proposals: [], reasons: ReasonCode[] }` (ou une union). Le CORE trace les raisons dans l'étape `proposal` et répond `NO_VALID_SOLUTION` avec ces raisons | `runSportSession`, acceptation | Aucune |

### 4.2 Autres décisions à prendre

| Id | Question | Options | Recommandation |
|----|----------|---------|----------------|
| D-S1 | Le soutien comme profil unique (`support` + `supportFor`) ou trois objectifs | Unique / trois | **Unique** : même mécanisme, accents paramétrés |
| D-S2 | L'accessoire est-il ancrable en V1 ? | Oui / non | **Non** : la double progression par exercice suffit ; cela réduit le nombre d'intentions |
| D-S3 | Preset poids du corps : faisabilité de A1 et A3 | Faisable dégradé / infaisable | A1 faisable dégradé ; A3 infaisable pour `strength`. **Dépend du catalogue** (CC1) |
| D-S4 | Politique F4 sur le principal d'un objectif `strength` | Changer de stimulus / aucune proposition | **Changer de stimulus**, tracé (continuité de service), à valider par l'expert |
| D-S5 | Transfert de capacité entre exercices d'une même classe d'équivalence | −1 cran / aucun | **−1 cran**, à valider par l'expert |
| D-S6 | Référence de charge des machines propre à chaque salle | Par exercice / par exercice et salle | Par exercice en V1 ; par salle si l'utilisateur en déclare plusieurs (produit) |
| D-S7 | `top_set` + `backoff` pour l'avancé en V1 | Oui / non | **Oui**, limité au stimulus `strength_heavy` et soumis à STR-V7 |
| D-S8 | Seuils de test longitudinal (dérive de volume, taux de changement d'exercices) | À fixer | Fixés comme paramètres de test en phase 4B, puis revus avec l'expert |
