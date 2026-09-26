# TRAINING ENGINE SPECIFICATION — Changelog

## V1.2 (2026-09-26) — revue finale des 7 décisions ouvertes

> Statut : **les 45 décisions sont arbitrées.** `TRAINING_ENGINE_SPEC_V1_2_ARCHITECTURE_GATE = PASS` (voir README).
> Seuls les points arbitrés et les références devenues obsolètes ont été modifiés.

### 1. Changelog V1.1 → V1.2

| # | Changement | Fichiers | Détail |
|---|-----------|----------|--------|
| V12-1 | **Décision 4 : blocage du build** | 09 §6 ; 11 §10 | Les options A/B/C sont remplacées par la matrice validée (local, CI, staging, bêta fermée, bêta publique / production × SAFETY, FEASIBILITY, TECHNICAL, règle métier, golden, mutation, longitudinal, parcours adversariaux). **Cliquet de sécurité G1** (`safeDirection`, `approvedBaseline`). Contournement d'urgence limité ; jamais pour SAFETY, FEASIBILITY, TECHNICAL ni un assouplissement G1. Aucune API de désactivation de règle |
| V12-2 | **SAFETY / FEASIBILITY / TECHNICAL distincts** | 01 §3 ; 09 §1 ; 10 §1, §3 | Même effet (`INVALID`), raisons différentes : domaines de reason codes `SAFETY.*`, `FEASIBILITY.*`, `TECHNICAL.*`, `RULE.*` ; observabilité ventilée par nature |
| V12-3 | **Décision 6 : hiérarchie A / B / C** | 01 §4, §5, §5.1 ; 05 §1.2 ; 08 §3 ; 09 §2 ; 12 §7 | Remplace définitivement les 12 niveaux. A — Admissibility (A1–A4, filtres) ; B — Optimization (B1–B6, lexicographique à tolérance) ; C — Replanning stability (hystérésis, partagée par l'AdaptationEngine et le GlobalPlanner). Cas de conflit de référence documentés. `SolutionScore` : `admissible` + 6 valeurs `optimization` |
| V12-4 | **Décision 11 : 8 structures dérivées** | 04 §4.1, §6 ; 05 §2.3 ; 06 ; 12 | `lower_knee`, `lower_hip`, `upper_push`, `upper_pull`, `axial`, `locomotor_impact`, `high_intensity_systemic`, `grip`. Dérivées par une table de correspondance versionnée ; alias « bas du corps » pour I1 ; excentrique, lourd/volume et course compromise restent dans Exposure/Context |
| V12-5 | **Décision 12 : complétude du catalogue** | 03 §2, §7 ; 06 §1 ; 10 §3 ; 11 §2 | Critères CC1–CC11 ; le nombre d'exercices n'est plus un objectif ; attributs `stability` et `loadCeiling` ; préférences de modalité liées à l'emplacement ; **interdiction d'un bonus global pour les charges libres** ; machines et poulies candidats de première classe ; test d'équité et métrique de part des modalités |
| V12-6 | **Décision 13 : taxonomie en 4 couches** | 03 §2 bis, §4, §5, §5 bis | Patterns → muscles (17, validés) → zones fonctionnelles (liste fermée) → structures dérivées ; précisions sur les patterns (unilatéral, hybrides, olympique, locomoteurs) |
| V12-7 | **Décision 34 : douleur** | 09 §7 ; 02 §7 ; 08 §3 | Architecture P1–P4 validée ; pipeline P4 → interruption → `paused_safety` → blocage selon le ruleset G1 → message localisé. **Non figés** (contenus G1) : liste P4, seuils temporels, escalade, formulations, instructions d'urgence, reprise |
| V12-8 | **Décision 35 : périmètre V1** | 09 §8 ; 02 §1 | Adultes de 18 ans et plus ; classes E / S / D / I ; `eligibility` en entrée ; aucune autorisation médicale inventée. **Non figés** (contenus G1) : questionnaire, correspondance, populations à validation particulière, âge seuil, restrictions médicales, reprise |
| V12-9 | **Correction transversale 1 : `programStatus`** | 02 §8 ; 04 §8 ; 01 §7, §10 ; 05 §1.1 ; 08 §3 | `active` / `paused_safety` / `suspended_scope` ; génération refusée hors `active` (`SAFETY_BLOCK` / nouveau code `OUT_OF_SCOPE`) ; historique conservé |
| V12-10 | **Correction transversale 2 : sans consentement santé** | 09 §7.3 ; 02 §7 ; 04 §3.2, §8 ; 10 §3 | Adaptation immédiate possible ; aucune persistance (`persisted = false`) ; aucune détection de récurrence ; `painHistory = 'unavailable'` + `DATA.HEALTH_HISTORY_UNAVAILABLE` ; P4 toujours traité |
| V12-11 | **Correction transversale 3 : progression** | 08 §1 ; 02 §6 ; 01 §5.1 | `skipReason = pain` / `safety_pause` (et séances non réalisées en `paused_safety`) jamais interprétés comme une baisse de performance, ni dans la régularité, ni dans l'adhérence ; progression suspendue |
| V12-12 | **`REST_RECOMMENDED`** | 09 §2 ; 01 §7 ; 10 §1, §3 | Issue valide du RepairEngine (pas une `EngineError`), marquée `skipped` sans pénalité de progression |
| V12-13 | **Paramètres sportifs : aucune constante cachée** | 09 §3.1 | `ParameterMetadata` (id, version, statut, confiance, provisoire, source, justification, classe, plage approuvée, cliquet) ; test d'architecture : aucune valeur sportive littérale dans le CORE |
| V12-14 | **Références devenues obsolètes** | 08 §1 (principe 3) ; 07 §3.2 ; 03 §4 ; 13 ; README | « lecture de l'état non `normal` » ⇒ `caution`/`reduce` + `unknownPolicy` (cohérence avec V1.1) ; « décision à valider n° 21 » ⇒ validée ; attribut de pattern `locomotor` ⇒ `isLocomotor` (évite la confusion avec la structure `locomotor_impact`) ; statuts et textes des décisions dans le document 13 ; points à définir 23–27 ; DT15–DT17 ; risque RE12 |

### 2. Vérification automatique des références croisées

Script de vérification exécuté sur `docs/engine-spec/` :
- liens Markdown vers des fichiers existants ;
- références de sections (formes « doc NN §X », lien « NN §X », « (NN §X) ») vers un titre existant du document cité (les références explicites à la phase 1 sont exclues) ;
- numéros de décision compris entre 1 et 45 ;
- absence de termes obsolètes (anciennes structures, niveaux numérotés, « décision reportée », « décision à valider », `DELOAD_SYNC`, etc.).

Résultat : **232 références vérifiées, 0 erreur** (exécution finale, changelog inclus ; 2 résidus et 2 faux positifs du script corrigés en cours de route).

### 3. Décisions

- **45 / 45 arbitrées.** Validées (dont avec modification) : 1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 19, 21, 23, 24, 25, 28, 29, 32, 33, 34, 35, 37, 38, 40, 41, 43, 45. Principe arbitré, valeurs paramétrables : 2, 7, 15, 16, 17, 18, 20, 22, 26, 27, 30, 31, 36, 39, 42, 44.
- Pour 34 et 35 : **architecture** validée ; **contenus G1** à approuver par un professionnel de santé avant production.

## V1.1 (2026-09-26) — arbitrages de la revue contradictoire

> Statut : **architecture validée, implémentation NON autorisée.** Les décisions 4, 6, 11, 12, 13, 34 et 35 restent ouvertes.
> Seuls les points arbitrés ont été modifiés. Le reste de la V1 est inchangé.

### 1. Changelog V1 → V1.1

| # | Modification obligatoire | Fichiers modifiés | Changement |
|---|--------------------------|-------------------|------------|
| M1 | Readiness `unknown` | 04 §3.2, §8 ; 12 §1–2 ; 11 §2 | Catégories `unknown` / `normal` / `caution` / `reduce`. Données insuffisantes ⇒ `unknown`, jamais `normal`. Comportement par défaut paramétrable (`unknownPolicy = as_normal`) ; l'incertitude reste visible dans l'état et la trace (`DATA.READINESS_UNKNOWN`) |
| M2 | L1 / L2 / L3 contextuels | 04 §4, nouveau §4.1 ; 01 §3 ; 09 §1 | Valeurs explicitement non physiologiques (provisoires). Nouvelle `EnforcementPolicy` : le niveau HARD/SOFT et le seuil dépendent du stimulus, de la structure, du niveau, de la phase, de la proximité d'une séance clé et de la qualité des données. Décision tracée (`RULE.ENFORCEMENT`) |
| M3 | Kilomètres hybrides | 04 §5 (réécrit) ; 06 §2 ; 11 §3 | 100 % de l'exposition brute conservée et utilisée pour L3. Séparation : exposition locomotrice brute / crédit de programmation Running / contexte (`fresh`, `compromised`, `embedded`…) / intensité / continuité. Plus de coefficient universel ; crédit calculé par des règles paramétrables (G2) |
| M4 | Anti-doublon | 07 §4 ; 09 §1 ; 13 (décision 26) | Suppression de la règle générale « similarité ≥ 0,9 sur 21 j = HARD ». Répétition accidentelle très similaire ⇒ forte pénalité SOFT. HARD seulement dans une liste fermée de cas justifiés. Benchmarks, retests et progressions autorisés et tracés |
| M5 | Progression | 08 §1 | « Une variable dominante progresse généralement à la fois, sauf modèle explicitement défini et testé » |
| M6 | Zone gelée | 08 §3 | 24 h (paramètre) conservées comme règle de stabilité UX, avec 5 exceptions : sécurité, douleur, indisponibilité explicite, demande de l'utilisateur, impossibilité devenue certaine (`ADAPT.FROZEN_ZONE_OVERRIDE`) |
| M7 | Simulation HYROX complète | 06 §4 (nouveau §3 bis) ; 12 §4, §9 | Fréquence contrôlée par `fullSimPolicy` (niveau, expérience HYROX, phase, lecture de l'état, récupération, proximité de la course). « 4–6 semaines » n'est plus une règle universelle |
| M8 | Décharges | 05 §1.2 A.3 ; 12 §4 | Plus de synchronisation imposée. Modes `global`, `partial` et `discipline_reduction`, choisis par le GlobalPlanner selon le contexte ; invariant : réduction réelle de la demande visée |
| M9 | Replanification UX | 08 §3 ; 01 §10 | `ReplanResult { recommended, alternatives[] }` : une recommandation principale affichée par défaut, alternatives au second plan |
| M10 | Durée | 07 §3.2 | Architecture conservée ; marges déclarées provisoires, à calibrer. Invariants réaffirmés : `p90 ≤ temps disponible`, pas de remplissage artificiel |
| M11 | Adhérence | 01 §5, nouveau §5.1 | Adhérence probable remontée au niveau 7 (sous sécurité, faisabilité, contraintes essentielles, cohérence de l'objectif et progression). Elle départage les solutions sportivement comparables. Les préférences deviennent des entrées du score d'adhérence. Hiérarchie : décision 6 toujours ouverte |
| M12 | Tests adversariaux | 11 §1, nouveau §8 bis, §10 | Catégorie **ADVERSARIAL ATHLETE JOURNEYS** : 15 parcours, assertions anti-oscillation, anti-cascade, progression cohérente, absence de dérive, explicabilité |

Modifications de paramétrabilité associées aux décisions « à modifier / paramétrable » :

| Décision | Changement |
|----------|------------|
| 16, 17 | Matrice L1 et table L2 explicitement paramétrables, modulées par l'`EnforcementPolicy` |
| 18 | Modèle d'allure interchangeable (`PaceModel`), choix par paramètre du ruleset |
| 20 | Tables de dosage de musculation entièrement paramétrables (G2) |
| 22 | Profils de tolérance provisoires, à calibrer |
| 36 | Proportions des phases paramétrables ; modes de décharge |
| 42 | Seuils de CI paramétrables (score de mutation calibré après la première mesure) ; parcours adversariaux ajoutés aux barrières |
| 44 | Cibles de performance provisoires, bloquantes seulement après calibration |

Autres mises à jour : document 13 (statut de chaque décision, risques RE14–RE15, décisions techniques DT13–DT14) ; README (statut V1.1).

### 2. Décisions définitivement validées (22)

1, 3, 5, 8, 9, 10 (avec l'ajout de `unknown`), 14, 19, 21, 23, 24, 25, 28, 29, 32, 33, 37, 38, 40, 41, 43, 45.

### 3. Décisions encore ouvertes

- **Ouvertes jusqu'à leur revue spécifique (7)** : 4 (politique de blocage du build), 6 (hiérarchie des priorités), 11 (structures du profil de demande), 12 (taille du catalogue et presets de matériel), 13 (patterns et groupes musculaires), 34 (comportement en cas de douleur), 35 (populations hors périmètre et questionnaire d'aptitude).
- **Principe arbitré, valeurs à calibrer (16)** : 2, 7, 15, 16, 17, 18, 20, 22, 26, 27, 30, 31, 36, 39, 42, 44. Leur formulation V1.1 est fixée ; leurs **paramètres** restent provisoires jusqu'à la relecture experte (G2) et la calibration sur données réelles.

### 4. Conséquences architecturales

| Modification | Conséquence |
|--------------|-------------|
| `unknown` | `AthleteState.readiness` s'élargit ; toute règle qui lit la lecture de l'état doit traiter explicitement `unknown` (vérifié par l'exhaustivité TypeScript). Nouveau paramètre `readiness.unknownPolicy` |
| `EnforcementPolicy` | Le niveau d'une règle n'est plus seulement une métadonnée statique : `rules/` expose `resolveEnforcement(ruleId, ctx)`, appelé par le solveur, l'InterferenceManager et le validateur, **toujours avec le même contexte**, pour que générateur et validateur restent cohérents. La politique est une table versionnée du ruleset |
| Kilomètres hybrides | `RunningExposure` s'enrichit de `continuity` et `raw` ; `runningContribution()` renvoie `locomotorRaw` et un crédit de programmation séparés. `state/` agrège le brut, `running/` calcule le crédit |
| Anti-doublon | `DuplicateReport.classification` gagne `accidental_strong` et `hard_justified`. Les cas HARD deviennent des règles distinctes (avec fiche), non un seuil de similarité |
| Progression | Chaque `ProgressionModel` déclare `progressableVariables` et `multiVariable: boolean` ; un modèle multi-variables exige des tests dédiés |
| Zone gelée | L'AdaptationEngine reçoit un motif d'exception typé ; sans motif autorisé, les changements calculés dans la zone sont reportés |
| `fullSimPolicy`, modes de décharge | Politiques paramétrables consommées par le HyroxEngine et le GlobalPlanner ; nouveaux reason codes `PLAN.MACRO.DELOAD{mode}` |
| `ReplanResult` | Le contrat de `replan()` et `replanAfterMissedSession()` change (un `recommended` + des alternatives). Aucune conséquence sur le moteur interne ; la couche UI affiche une recommandation par défaut |
| Adhérence | Nouveau calcul de score d'adhérence dans `state/` (signaux de réalisation) et nouveau niveau de priorité dans le score lexicographique ; les préférences ne sont plus un niveau autonome |
| Tests | Nouveau répertoire `tests/adversarial/` et simulateur d'événements combinés, réutilisant le simulateur longitudinal |

Aucune modification des principes C1–C10, du pipeline, des moteurs de discipline dans leur structure, ni des contrats hors `replan`.

### 5. Nouveaux tests ajoutés

- **Unitaires** (11 §2) : readiness `unknown` ; sens de chaque facteur de l'`EnforcementPolicy` (données pauvres jamais plus permissives) ; `locomotorRaw = raw` et crédit borné ; anti-doublon très similaire ⇒ pénalité et non `INVALID` ; progression mono ou multi-variable ; exceptions de la zone gelée ; `fullSimPolicy` ; modes de décharge ; `recommended` unique ; l'adhérence ne départage que dans la tolérance ε.
- **Intégration** (11 §3) : kilomètres HYROX, brut vs crédit justifié.
- **ADVERSARIAL ATHLETE JOURNEYS** (11 §8 bis) : AJ01–AJ15 (disponibilités changeantes ou alternées, séances clés manquées, matériel changeant, pics et baisses de performance, changement d'objectif aller-retour, interruptions, disciplines ajoutées puis retirées, douleurs récidivantes, temps réduit, événements combinés, événements hors-ligne désordonnés, mise à jour du moteur en période perturbée), avec des assertions d'absence d'oscillation, de cascade de replans, de progression incohérente, de doublement, de perte de sécurité et de dérive.
- **Barrières de CI** (11 §10) : parcours adversariaux bloquants avant release ; seuils de mutation et de performance paramétrables.

## V1 (2026-09-26)

Version initiale proposée.
