# 11 — Stratégie de tests du moteur

Objectif : **aucune fonctionnalité critique n'est considérée terminée parce qu'elle fonctionne une fois.** Chaque règle, chaque interaction et chaque profil type est vérifié automatiquement, de façon reproductible (graines figées), sur la durée (52 semaines).

## 1. Vue d'ensemble

| Couche | Ce qu'elle prouve | Volume visé | Exécution |
|--------|-------------------|-------------|-----------|
| Unitaires | Chaque règle, formule, fonction de similarité, levier de durée, modèle de progression | Chaque règle : nominal + bornes + cas limites + données manquantes | À chaque commit |
| Intégration | Interactions : planificateur ↔ interférence, générateur ↔ durée ↔ validateur ↔ réparateur, résultat → progression → adaptation | ~50–100 | À chaque commit |
| Scénarios | Profils réalistes sur 1 à 12 semaines | ≥ 20 scénarios | À chaque commit |
| Propriétés (fuzz) | Invariants sur des milliers de profils générés | 1 000 par commit, 50 000 la nuit | Commit + nightly |
| Métamorphiques | Relations attendues entre entrées et sorties | ~30 relations | À chaque commit |
| Golden | Stabilité des programmes de référence approuvés | ≥ 8 profils golden | À chaque commit |
| Longitudinaux | Absence de dérive sur 26 et 52 semaines | ≥ 12 profils × 5 trajectoires | Nightly + avant release |
| **Parcours adversariaux** (V1.1) | Pas d'oscillation, de replans excessifs, de progression incohérente ni de dérive face à des événements défavorables combinés | ≥ 15 parcours × plusieurs graines | Nightly + avant release |
| Mutation | Les tests détectent réellement la modification d'une règle | Score minimal sur `rules/`, `validation/`, `constraints/`, `duration/` | Hebdomadaire + avant release |
| Performance | Budgets de temps (doc 01 §8) | Benchmarks | À chaque commit (tolérance), nightly (strict) |

## 2. Tests unitaires

Pour **chaque règle** (convention : `rules/<id>.test.ts`) :
- cas nominal conforme ; violation juste au-dessus ou au-dessous de la borne ; valeur exacte de la borne ;
- données manquantes (le comportement conservateur attendu est explicite) ;
- la fonction `repair()` produit une action qui résout la violation sans en créer une autre de niveau supérieur ;
- la fiche est complète (test générique sur tout le registre).

Ajouts V1.1 (unitaires) :
- **Readiness** : aucune donnée récente ⇒ `unknown` (jamais `normal`) + `DATA.READINESS_UNKNOWN` ; sortie de `unknown` dès que le minimum de données est atteint ; `unknownPolicy = as_normal` produit la même programmation que `normal`, mais l'état et la trace diffèrent.
- **Politique d'application L1/L2/L3** : pour chaque facteur (stimulus, structure, niveau, phase, proximité d'une séance clé, qualité des données), un test vérifie le sens attendu (ex. `dataQuality = none` n'est jamais plus permissif que `adequate`) ; la décision est tracée.
- **Kilomètres hybrides** : `locomotorRaw` égal à l'exposition brute ; crédit de programmation borné par `raw` ; crédit nul si la continuité et l'intensité ne satisfont pas les critères paramétrés.
- **Anti-doublon** : une séance accidentelle très similaire produit une pénalité forte et **jamais** `INVALID` hors des cas HARD listés ; un retest déclaré n'est pas pénalisé.
- **Progression** : un modèle « une variable dominante » ne fait progresser qu'une variable ; un modèle multi-variables déclaré progresse selon sa règle documentée ; un modèle non déclaré ne peut pas faire progresser deux variables.
- **Zone gelée** : chaque exception (sécurité, douleur, indisponibilité, demande utilisateur, impossibilité certaine) autorise une modification tracée ; aucune autre cause ne le permet.
- **`fullSimPolicy`** : premier HYROX ⇒ moins de simulations complètes qu'un athlète expérimenté ; lecture de l'état `reduce` ⇒ report ; fenêtre finale respectée.
- **Décharges** : chacun des modes `global`, `partial` et `discipline_reduction` réduit réellement la demande sur les structures visées.
- **Replanification** : un seul `recommended` par résultat, de rang 1 ; les alternatives sont classées et valides.
- **Adhérence** : l'adhérence (B3) ne départage que des solutions dans la tolérance ε de B1 et B2 ; elle ne fait jamais gagner une solution non admissible ou moins cohérente avec l'objectif principal.

Ajouts V1.2 (unitaires et propriétés) :
- **Hiérarchie A/B/C** : un test par cas de conflit de référence (doc 01 §5) avec les reason codes attendus ; propriété : aucune solution qui viole la couche A n'est jamais choisie, quel que soit son score B ; propriété d'hystérésis : un événement sans effet sur la couche A et avec un gain sous le seuil ne produit aucune révision.
- **SAFETY / FEASIBILITY / TECHNICAL** : chaque violation HARD produit `INVALID` avec un reason code du bon domaine ; aucune violation n'est comptée dans le mauvais domaine.
- **Structures dérivées (8)** : poussée lourde puis tirage lourd le lendemain autorisés par L1 ; squat lourd la veille d'une séance de seuil détecté (alias « bas du corps ») ; double-unders à haut volume la veille d'intervalles pris en compte par `locomotor_impact` ; tirage de sled et soulevé de terre lourd à moins de 24 h ⇒ conflit `grip` ; chaque exercice hors mobilité correspond à au moins une structure ; dérivation stable pour une séance identique.
- **Taxonomie** : chaque exercice a un pattern primaire et au moins un muscle primaire ; les exercices hybrides produisent les structures attendues ; cohérence muscles → zones fonctionnelles.
- **Catalogue** : rapport de couverture CC1–CC11 (bloquant avant bêta) ; **test d'équité des modalités** (profil hypertrophie en salle sur 12 semaines : part machines + poulies dans une plage paramétrée) ; deux candidats de même score (un libre, une machine) ne font pas gagner systématiquement la même modalité ; test d'architecture : aucun bonus global « libre » ou « polyarticulaire » dans le score.
- **Douleur (mécanismes, sans contenu médical figé)** : après P2 ou P3, aucune séance future ne sollicite la zone ; P4 ⇒ interruption, `paused_safety`, aucune génération tant que les règles G1 ne l'autorisent pas, message identifié par une clé de contenu localisée ; bouton douleur en séance ; escalade exécutée selon la règle G1 fournie par le ruleset de test.
- **Consentement santé absent** : aucune persistance du `PainReport` ; `painHistory = 'unavailable'` ; aucune détection de récurrence ; `DATA.HEALTH_HISTORY_UNAVAILABLE` présent ; P4 toujours traité.
- **Progression** : les sauts `pain` / `safety_pause` et les séances non réalisées en `paused_safety` ne produisent jamais `below`, ne baissent ni la régularité ni le score d'adhérence.
- **`REST_RECOMMENDED`** : issue valide (pas une `EngineError`), marquée `skipped` avec le bon `skipReason`, sans pénalité de progression.
- **`programStatus` et éligibilité** : aucune génération en `paused_safety` (`SAFETY_BLOCK`) ni en `suspended_scope` (`OUT_OF_SCOPE`) ; `declaration_required` sans déclaration ⇒ pas de génération ; historique intact pendant une pause ou une suspension.
- **Paramètres** : test d'architecture : aucune valeur sportive littérale dans le CORE ; tout paramètre du ruleset a des métadonnées complètes (id, version, statut, confiance, source, provisoire) ; **cliquet G1** : un assouplissement sans approbation fait échouer la CI ; aucune API de désactivation de règle.

Exemples : écart L1 de 47 h 59 vs 48 h 00 ; arrondi d'une charge de 71,3 kg avec des disques de 1,25 kg ; similarité de deux WOD identiques = 1 et de deux WOD disjoints ≈ 0 ; confiance d'une référence de 20 semaines ⇒ −2 crans ; levier `reduce_rest` qui ne descend jamais sous le plancher du stimulus.

## 3. Tests d'intégration (exemples)

- Placement de 5 séances avec une séance clé de course et une musculation `lower_heavy` ⇒ l'InterferenceManager déplace ou change la variante, et la trace contient `PLAN.SESSION.MOVED.*`.
- Générateur → DurationEngine → validateur : une séance dont p90 dépasse le temps disponible est ajustée, jamais publiée.
- Résultat de séance supérieur aux prévisions → ProgressionEngine → la capacité n'augmente qu'au recalcul suivant et dans la borne.
- Séance manquée → `replanAfterMissedSession` → options valides uniquement, sans doublement.
- Changement de matériel → substitutions → aucune référence à un matériel absent dans toutes les séances futures.
- Kilomètres HYROX → `RunningExposure` → exposition brute conservée à 100 % et prise en compte dans L3 ; crédit de programmation Running calculé par `runningContribution()` et justifié par des reason codes (aucun coefficient codé en dur).

## 4. Scénarios (profils réalistes)

| Id | Scénario | Assertions clés |
|----|----------|-----------------|
| SC01 | Débutant musculation, 3×/sem, 45 min, **haltères uniquement** | Aucun exercice à la barre ; full body ; montée en charge adaptée aux haltères ; p90 ≤ 45 |
| SC02 | Coureur, objectif 10 km, 3×/sem | 1 sortie longue, ≤ 1 qualité (selon le niveau), allures issues de la référence, L3 respecté |
| SC03 | Athlète HYROX, 5×/sem | Rampe de spécificité ; simulations complètes à la bonne fréquence ; interférences résolues |
| SC04 | Musculation + course | Séances jambes lourdes jamais dans les 24 h avant une séance de qualité ; volumes L5 atteints |
| SC05 | Cross-training + HYROX + course | Stimuli variés et justifiés ; exposition de course totale bornée ; pas de double demande de grip rapprochée |
| SC06 | Seulement 30 min disponibles par séance | Archétypes courts ; aucun dépassement ; `NO_VALID_SOLUTION` pour les demandes impossibles |
| SC07 | Changement de matériel (salle → maison) en milieu de cycle | Continuité des progressions via les équivalences ; substitutions signalées |
| SC08 | Deux séances manquées dans la semaine | Pas de rattrapage en doublon ; séances clés préservées si possible ; SKIP justifié |
| SC09 | Changement de disponibilités (5 → 3 jours) | Replanification minimale ; objectif principal préservé ; quotas réduits dans l'ordre des priorités |
| SC10 | Performance largement supérieure aux prévisions | Mise à jour bornée des capacités ; pas de saut de charge irréaliste |
| SC11 | Aucune référence de performance | Prescription à l'effort perçu ; tests planifiés (sauf novice) |
| SC12 | Restriction `no_impact` + objectif course | `CONFLICTING_GOALS` + alternatives |
| SC13 | Douleur légère au genou, puis signalée à nouveau | Restriction temporaire, message de consultation, levée par l'utilisateur |
| SC14 | Retour après 3 semaines d'arrêt | Reprise progressive, capacités à confiance réduite |
| SC15 | HYROX sans sled ni SkiErg | Substitutions de faible fidélité signalées, recommandation d'accès au matériel |
| SC16 | « HYROX complet, 20 min, sans matériel » | `NO_VALID_SOLUTION` + alternatives |
| SC17 | Double séance autorisée | Ordre et écart respectés |
| SC18 | Activité externe récurrente (club le mardi) | Traitée comme une séance verrouillée dans l'interférence |
| SC19 | Événement dans 3 semaines | Macrocycle compressé, affûtage correct |
| SC20 | Mise à jour du moteur en milieu de semaine | Aucune modification avant la frontière de semaine (hors correctif de sécurité) |

## 5. Tests de propriétés (fuzz)

**Générateurs** (fast-check) de profils *plausibles* : disciplines (1–4), objectifs cohérents ou volontairement conflictuels, niveaux, disponibilités (0–7 jours, 15–120 min), matériel (presets + tirages aléatoires), restrictions, historiques synthétiques (0–52 semaines, régularité variable), références (absentes, cohérentes, contradictoires).

**Invariants vérifiés sur chaque programme produit** :
1. Aucun exercice impossible avec le matériel disponible.
2. Aucune référence à un exercice inexistant ou déprécié.
3. Aucune durée négative ou nulle ; aucun NaN ou Infinity ; aucune série à 0 répétition ; charges ≥ 0 et réalisables.
4. p90 ≤ temps disponible du jour, pour chaque séance.
5. Aucune séance un jour indisponible ou une date bloquée.
6. Toutes les contraintes HARD sont respectées (le validateur, indépendant, repasse sur tout).
7. Chaque séance a une intention, un stimulus et au moins un objectif affichable.
8. Chaque séance est exécutable : blocs non vides, prescriptions complètes pour leur type.
9. Restrictions et exclusions respectées.
10. L1 et L2 respectés, y compris aux jonctions de semaines.
11. **Sérialisation aller-retour** : `parse(serialize(p))` est égal en profondeur à `p`, et le validateur donne le même résultat.
12. **Déterminisme** : deux exécutions avec la même entrée et la même graine donnent des sorties identiques octet pour octet.
13. Soit un résultat `ok`, soit une `EngineError` typée **avec** raisons et alternatives : jamais d'exception non gérée.
14. Toute raison émise est enregistrée et possède un template.

Tout contre-exemple trouvé est **réduit** automatiquement par fast-check et ajouté aux régressions (fixture permanente).

## 6. Tests métamorphiques

Relations qui doivent être vraies sans connaître la « bonne » réponse :
- Ajouter du matériel ne rend jamais une solution infaisable, et le nombre d'erreurs `EQUIPMENT` ne peut pas augmenter.
- Augmenter le temps disponible d'un jour ne crée jamais de dépassement de durée.
- Retirer un jour disponible n'augmente jamais le nombre de séances de la semaine.
- Ajouter une restriction ne fait jamais apparaître d'exercice qui la viole et ne fait pas augmenter la demande sur la zone concernée.
- Renommer les identifiants utilisateur ou changer la langue ne change pas le contenu sportif (seule la graine peut le changer, et elle est figée dans le test).
- Une performance réalisée supérieure ne fait jamais baisser la capacité estimée.
- Marquer une séance réalisée comme manquée ne fait jamais augmenter l'exposition calculée.

## 7. Golden tests

Profils de référence permanents, avec des graines figées :

| Id | Profil |
|----|--------|
| `GOLDEN_STRENGTH_BEGINNER_3D` | Débutant musculation, 3 j, 45 min, salle |
| `GOLDEN_STRENGTH_DB_ONLY_3D` | Débutant, haltères uniquement |
| `GOLDEN_RUNNING_10K_3D` | 10 km, 3 j, référence 5 km récente |
| `GOLDEN_RUNNING_HALF_5D` | Semi-marathon, 5 j |
| `GOLDEN_HYROX_INTERMEDIATE_5D` | HYROX Open intermédiaire, 5 j, sans sled |
| `GOLDEN_CROSSTRAINING_INTERMEDIATE_4D` | Cross-training général, 4 j, box |
| `GOLDEN_HYBRID_RUN_STRENGTH_5D` | Course + musculation, 5 j |
| `GOLDEN_HYBRID_ALL4_5D` | Musculation + cross-training + HYROX + course, 5 j, 60 min |
| `GOLDEN_TIME_CRUNCHED_30MIN_3D` | 30 min, 3 j |

**Processus** :
1. À chaque modification, régénération et **diff structuré** : séances, exercices, prescriptions, durées, reason codes.
2. Un changement **n'est jamais accepté automatiquement**. Le diff est présenté en revue avec une justification obligatoire (« pourquoi ce programme change-t-il ? ») ; les changements touchant des règles G1 ou G2 exigent l'accord du rôle concerné (doc 09 §4).
3. Chaque version approuvée est stockée avec son rapport lisible (`engine-cli report`) pour la relecture experte.

## 8. Tests longitudinaux (26 et 52 semaines)

**Simulateur** : `simulate({ profile, weeks: 26 | 52, trajectory, behaviors, seed })`. À chaque semaine : planification → génération → **exécution simulée** (résultats produits par un modèle d'athlète synthétique) → `processWorkoutResult` → adaptation.

**Trajectoires de performance simulées** (modèles simples et paramétrés, **pas** des modèles physiologiques) :
- `improving` : l'athlète réussit les séances et progresse avec un rendement décroissant ;
- `plateau` : réussite, puis stagnation à partir de la semaine X ;
- `declining` : baisse progressive (surcharge simulée, vie personnelle) ;
- `noisy` : forte variance, séances manquées aléatoires (10–30 %) ;
- `breakthrough` : bond de performance ponctuel (test exceptionnel).

**Comportements** : vacances de 1 à 3 semaines, changement de disponibilités, douleur signalée puis levée, ajout d'une discipline, nouvel objectif après un événement, changement de matériel, mise à jour du moteur.

**Détecteurs de dérive** (assertions à chaque semaine et sur l'ensemble de la trajectoire) :

| Dérive | Assertion (bornes dans le ruleset de test) |
|--------|-------------------------------------------|
| Répétitions excessives | Répétitions accidentelles ≤ seuil ; nombre d'exercices distincts par pattern sur 12 semaines dans une plage (ni 1, ni 30) |
| Volumes aberrants | E1 hebdomadaire par groupe ≤ plafond ; exposition de course ≤ f(base) ; aucune croissance monotone non bornée sur 52 semaines |
| Intensités absurdes | Charges ≤ plafond (capacité × facteur borné) ; allures dans les zones ; aucun % e1RM hors table |
| Stagnation artificielle | Avec la trajectoire `improving`, ≥ X % des ancres progressent par mésocycle ; `PLANNED_BUT_STAGNANT` ≤ seuil |
| Progression infinie | Avec la trajectoire `plateau`, les prescriptions se stabilisent (pas de hausse continue) ; les capacités respectent le plafond par cycle |
| Accumulation incontrôlée | Nombre de révisions par semaine borné ; pas de dette de séances manquées reportée indéfiniment |
| Séances progressivement impossibles | p90 ≤ disponibilité à chaque semaine ; charges ≤ matériel ; aucun `NO_VALID_SOLUTION` apparu en cours de simulation sans changement d'entrée |
| Disparition des décharges et des tests | Décharge présente selon le rythme prévu ; tests planifiés en fin de phase |
| Dérive de la répartition d'intensité | Part de basse intensité en course dans la plage cible sur chaque bloc de 4 semaines |
| Instabilité | Distance moyenne entre semaines consécutives sans événement ≤ seuil |

Une dérive détectée devient un **test de régression longitudinal permanent**.

## 8 bis. ADVERSARIAL ATHLETE JOURNEYS (V1.1)

But : vérifier que le moteur **reste stable et cohérent** quand l'utilisateur fait tout ce qui complique la planification, sur plusieurs semaines. Ces scénarios cherchent délibérément à provoquer des oscillations, des replans excessifs, des progressions incohérentes et des dérives.

**Parcours (≥ 15, chacun exécuté avec plusieurs graines et plusieurs profils)** :

| Id | Parcours |
|----|----------|
| AJ01 | Disponibilités modifiées chaque semaine pendant 8 semaines (5 → 3 → 6 → 2 → 4 jours…) |
| AJ02 | Disponibilités qui alternent entre deux configurations (A, B, A, B…) |
| AJ03 | 1 à 2 séances manquées par semaine pendant 6 semaines, toujours la séance clé |
| AJ04 | Séances manquées aléatoires (30 %) combinées à des séances déplacées par l'utilisateur |
| AJ05 | Changements de matériel répétés (salle ↔ maison ↔ poids du corps) sur 4 semaines |
| AJ06 | Performances soudainement très supérieures (tests et séances) puis retour à la normale |
| AJ07 | Période de baisse de 4 semaines (RPE élevés, reps manquées) puis reprise |
| AJ08 | Changement d'objectif en milieu de cycle, puis retour à l'objectif initial 3 semaines plus tard |
| AJ09 | Interruption de 3 semaines puis reprise, deux fois dans l'année |
| AJ10 | Ajout puis retrait d'une discipline à 4 semaines d'intervalle |
| AJ11 | Douleur signalée, levée, puis signalée à nouveau sur la même zone |
| AJ12 | Temps réduit (« je n'ai que 30 min ») sur toutes les séances d'une semaine |
| AJ13 | Événements combinés dans la même semaine : disponibilités réduites + séance manquée + changement de matériel + douleur légère |
| AJ14 | Suite d'événements hors-ligne rejoués dans le désordre puis réordonnés par horodatage |
| AJ15 | Mise à jour du moteur au milieu d'une période perturbée |

**Assertions** (seuils = paramètres du ruleset de test) :

| Propriété | Mesure |
|-----------|--------|
| Pas d'oscillation | Aucune séance déplacée A → B → A sur 14 jours sans nouvel événement qui le justifie ; pour AJ02, les semaines A se ressemblent entre elles (même ossature), de même pour les semaines B |
| Pas de replans excessifs | Nombre de révisions ≤ nombre d'événements (un événement ne déclenche pas de cascade) ; portée moyenne des replans minimale ; les 24 h de la zone gelée ne changent que pour les exceptions autorisées |
| Churn borné | Distance entre la semaine prévue et la semaine replanifiée proportionnée à l'ampleur de l'événement |
| Progression cohérente | Aucune capacité ne monte pendant une période de baisse ; pas de saut au-delà du plafond après un pic ; pas de reprise au niveau d'avant l'interruption sans réadaptation |
| Pas de doublement | Aucune séance manquée « rattrapée » en doublant la charge ; pas d'accumulation de dette de séances |
| Séances clés | Les séances clés de l'objectif principal sont préservées autant que les contraintes le permettent ; chaque perte est expliquée |
| Sécurité | Les contraintes SAFETY et les restrictions liées aux douleurs ne sont jamais levées par un autre événement |
| Pas de dérive | Tous les détecteurs du §8 restent verts à la fin du parcours et 8 semaines après le dernier événement (retour à la stabilité) |
| Explicabilité | Chaque révision possède des reason codes cohérents avec l'événement qui l'a causée |

Tout échec devient un parcours de régression permanent.

## 9. Tests de mutation

- **Mutation de code** (Stryker) sur `rules/`, `constraints/`, `validation/`, `duration/`, `similarity/`, avec un score minimal **paramétrable** (valeur initiale à fixer après la première mesure ; décision 42).
- **Mutation de paramètres du ruleset** (outil maison, plus parlant pour ce domaine) : chaque paramètre critique est muté (ex. `L1.high_high = 48 h → 24 h`, plancher de repos du 3RM 180 s → 60 s, seuil anti-doublon 0,9 → 0,99) et **au moins un test doit échouer**. Un paramètre dont la mutation ne fait échouer aucun test est signalé comme **non couvert**.
- Rapport de mutation joint à chaque release du ruleset.

## 10. Barrières de CI

La politique complète, par environnement et par catégorie (SAFETY, FEASIBILITY, TECHNICAL, règle métier, golden, mutation, longitudinal, parcours adversariaux), est la **matrice validée de la doc 09 §6** (décision 4). Résumé pour la CI (fusion sur main) :

| Barrière | CI |
|----------|----|
| Tests SAFETY, FEASIBILITY, TECHNICAL (unitaires, propriétés, invariants, déterminisme, sérialisation, frontières d'architecture) | **Bloquant immédiatement** |
| Assouplissement d'un paramètre G1 sans approbation (cliquet) | **Bloquant** |
| Tests de règles métier (G2), scénarios, métamorphiques, propriétés (1 000) | Bloquant |
| Golden : aucun diff non approuvé | Bloquant pour la fusion |
| Parcours adversariaux : assertions de sécurité | Bloquant (nightly et pré-release) |
| Parcours adversariaux : assertions de stabilité | Avertissement jusqu'à calibration, bloquant avant bêta |
| Longitudinaux 52 semaines | Nightly (ticket) ; bloquant avant bêta (échantillon) et avant production (corpus complet) |
| Mutation | Avertissement ; bloquant avant bêta sur G1 et FEASIBILITY, avant production avec un seuil global calibré |
| Performance (cibles provisoires) | Avertissement ; bloquant seulement après calibration sur de vrais appareils (décision 44) |
| Rapport d'état de gouvernance | Selon l'environnement (doc 09 §6) |
