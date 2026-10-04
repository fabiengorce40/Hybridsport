# Audit global A1 : état réel de KAIRO

**Baseline** : HEAD `c08f371`, working tree propre.
- 126 fichiers de test, 1 685 tests verts.
- Architecture : 96/96 sur 14 fichiers.

Audit **sans modification fonctionnelle**. Seul ce fichier est ajouté.

**Convention des classes :**

| Classe | Signification |
|---|---|
| **A** | Production-capable : code + données et gouvernance réellement disponibles |
| **B** | Implémenté, bloqué en production (paramètre, signature, contenu ou gouvernance manquant) |
| **C** | Partiel |
| **D** | Absent |

« Testé en TEST_ONLY » ne vaut jamais A.

---

## 1. Paquets et dépendances

```
apps/kairo (PWA React) → app-core → programme → planner → strength | running | crosstraining | hyrox → engine → domain
                           ├──────→ planner (chemin multisport V2)
                           └──────→ strength, running (chemin V0), engine, domain
```

| Paquet | Rôle | Tests |
|---|---|---|
| domain | contrats, schémas zod, sérialisation (`session_record` v6) | (avec engine) |
| engine (CORE) | validation, durée, réparation, empreinte, anti-doublon, migrations, profil de demande | 512 |
| strength | moteur Strength (archétypes, sélection, dose, tracks, interférence) | 260 |
| running | moteur Running (vagues 1 à 3, TEST, composition hebdo, références) | 511 |
| crosstraining | C1 (infrastructure), C2 (amorçage et rejeu strict) | 171 |
| hyrox | H1 (une station), contrat de réalisation | 34 |
| planner | Global Planner (placement, interférence, voisinage, réessai, réalisations CT/HYROX) | 82 |
| programme | Programme Engine P1 (longitudinal, adhérence, décisions gouvernées) | 31 |
| app-core | état applicatif, V0, chemin multisport, programme, exécutions, persistance | 78 |
| apps/kairo | UI PWA (onboarding, accueil, planning, séance, course, historique, profil, minuteur de repos) | 6 |

- Graphe sans cycle, vérifié par `dependency-graph.test.ts`.
- **L'UI n'appelle que le chemin V0** : onboarding, `ensureCurrentWeek`, séance, séries, course, douleur, export.
- Le programme, le planificateur multisport, les exécutions F1, CT et HYROX ne sont pas raccordés à l'UI.

---

## 2. Cartographie fonctionnelle

### Fait structurant

**Aucun contenu de production n'existe dans le dépôt.**

- **Strength** : ruleset `fixtures:strength-lock-0.4.0` avec 68 paramètres, tous `draft` et provisoires. Catalogue de test de 54 exercices.
- **Running** : ruleset de test du CORE avec 30 paramètres `draft`, catalogue de test de 33 exercices.
- **Gouvernance Running** : 14 décisions expertes en attente, 4 politiques G1 non signées, 47 paramètres (32 `EXPERT_PROPOSED`, 15 `UNRESOLVED`), ruleset non verrouillé, `GLOBAL_PLANNER_INTEGRATION` non satisfait.
- **Gouvernance CT** : 32/32 paramètres non résolus, 16/16 décisions en attente, 4 politiques G1 non signées, `CT_CONTENT` et `GLOBAL_PLANNER` non satisfaits. Les 11 capacités sont fermées en production.
- **HYROX, planificateur, programme** : aucun paramètre gouverné présent (`hybrid_race.*`, `planner.*`, `programme.*`, `demand.doseNormalization`).

En conséquence, **aucune capacité sportive n'est A au sens strict**. L'application V0 fonctionne sous autorité `provisional` (Strength) ou `simulation` (Running), acceptée explicitement par l'utilisateur à l'onboarding.

### Par couche

| Couche | A | B | C | D | Maturité estimée |
|---|---|---|---|---|---|
| CORE | validation, sécurité (douleur, matériel, restrictions), durée, réparation (frontières charge et allure), sérialisation v6, migrations, empreinte | anti-doublon (poids absents hors fixtures), récupération A3 (`recovery.minGapMatrix` provisoire), profil de demande (`demand.doseNormalization` absent) | — | — | ≈ 85 % |
| Strength | — | 4 archétypes (full body, haut, bas, support), sélection, dose, tracks d'ancres, interférence graduée : tous sur paramètres provisoires | périodisation (phase fixe `accumulation`), capacités et e1RM non alimentées, voisins multisport (mécanisme présent, normalisation absente) | décharge planifiée, tests de force | ≈ 60 % code / 0 % gouverné |
| Running | — | EASY, LONG, THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS, RACE_PACE, TEST, STRIDES ; composition hebdomadaire ; références ; progression par pas ; allures (candidates, simulation seulement) | objectifs avec date cible (taper et marathon bloqués), extrapolation de performance bloquée | PROGRESSION_RUN (post-V1) | ≈ 70 % code / 0 % gouverné |
| Cross-training | — | C2 amorçage et rejeu strict | C1 (analyse, refus systématique) | autres formats (AMRAP, EMOM, for time, intervalles), dose calibrée, progression, benchmarks, charges | ≈ 25 % |
| HYROX | — | H1 (une station, dose et charge gouvernées, aucune valeur) | historique transporté non exploité | sélection de station, course + station, simulation, séance HYROX complète, progression, préparation de course | ≈ 10 % |
| Global Planner | placement, priorité déclarée, une séance par jour, réessai créneau, résultat partiel auditable | interférence (fenêtres absentes), voisinage (normalisation absente) | — | doubles séances, espacement même discipline, composition Running dans le planificateur | ≈ 60 % |
| Programme Engine | création, objectifs, horizon glissant, adhérence descriptive, évaluations (contrat) | décisions (politique absente ⇒ BLOCKED), avance d'horizon | phases déclarées, sans effet | périodisation, décharge, reprise après absence, changement d'objectif | ≈ 45 % |
| app-core | V0 complet (Strength + Running mono-sport) | chemin multisport et programme (CT/HYROX non raccordés en production) | exécutions F1 (API sans UI) | correction d'exécution, synchronisation | ≈ 65 % |
| UI (apps/kairo) | V0 : onboarding, planning, séance avec séries, minuteur, course, historique, export | — | — | programme, multisport, CT, HYROX, exécution F1, édition d'objectifs | ≈ 35 % |

---

## 3. Parcours utilisateur réel

Sans fixtures TEST_ONLY, avec l'environnement applicatif par défaut et l'UI actuelle.

| Étape | Contrat | Implémentation | Persistance | Gouvernance | app-core | UI | Production |
|---|---|---|---|---|---|---|---|
| Onboarding / profil | oui | oui | oui | n/a | oui | oui | oui (contenu provisoire accepté) |
| Sports | oui | Strength, Running ; CT/HYROX « indisponibles » | oui | — | oui | oui | partiel |
| Objectifs | oui (profil V0 ; programme P1) | oui | oui | — | oui | V0 seulement | partiel |
| Disponibilités | oui | oui | oui | — | oui | oui | oui |
| Programme | oui (P1) | oui | oui | politique absente | oui | **non** | non |
| Planning | V0 et planificateur | oui | oui | interférence absente | oui | V0 | V0 seulement |
| Séance | oui | Strength, Running | oui | provisoire / simulation | oui | oui | provisoire |
| Exécution | V0 ; F1 pour 4 sports | oui | oui | — | oui | V0 seulement | V0 |
| Historique | oui | oui | oui | — | oui | V0 | V0 |
| Adaptation | progression Strength (tracks), ancre Running ; programme | oui | oui | paramètres provisoires ; politique programme absente | oui | non | non |
| Semaine suivante | V0 automatique | oui | oui | — | oui | oui | V0 |

### Premier point de rupture

Un utilisateur qui choisit **Strength + Running** (profil hybride typique) **ne reçoit aucune séance de course**. Le moteur Running refuse tout athlète multisport tant que `GLOBAL_PLANNER_INTEGRATION` n'est pas satisfait, et l'UI V0 affiche ce refus.

Les profils mono-sport Strength ou Running fonctionnent sous autorité provisoire ou de simulation. Cross-training et HYROX sont indisponibles dès l'étape « sports ».

---

## 4. Les quatre sports

### Strength

- **Séances générables** : `str_full_body`, `str_upper`, `str_lower`, `str_support`. Dans l'application, seul `str_full_body` est utilisé : le choix du split n'est pas gouverné.
- **Progression active** : tracks d'ancres et tracks suivis. La réalisation passe par `classifyExposure`, `updateTrack`, `createTrack` puis la prescription suivante. Elle fonctionne dans V0, sur paramètres provisoires.
- **Historique consommé** : expositions, tracks, E1 sur 7 jours, anti-doublon.
- **Objectifs** : strength, hypertrophy, general (support existe au contrat).
- **Phases** : contrat présent (accumulation, intensification, deload, maintenance, transition), phase **fixe** dans l'application.
- **Limites** :
  - aucune périodisation ni décharge planifiée ;
  - capacités et e1RM non fournies par l'application ;
  - semaine multisport « inconnue » sans normalisation de doses ;
  - incréments d'équipement non déclarés.
- **Paramètres** : 68, tous provisoires, avec un « verrou » de test (4F).
- **Évaluations** : aucune (pas de test de force).
- **Pour une vraie programmation pluri-semaines** : phases gouvernées, décharge, alternance des splits, évaluation e1RM, incréments réels.

### Running

- **Archétypes** :
  - présents : EASY, LONG, THRESHOLD, SEVERE, SHORT_INTERVAL, HILLS, RACE_PACE, TEST, STRIDES ;
  - post-V1 : PROGRESSION_RUN ;
  - composition hebdomadaire et séances manquées gérées par le moteur.
- **Objectifs** : GENERAL_RUNNING, FIVE_K, TEN_K, HALF_MARATHON, MARATHON, avec date cible au contrat.
- **Progression** : par pas minimal, sortie longue, premières expositions au seuil et au sévère. Ce sont des **capacités candidates, actives en simulation seulement**.
- **Références** : TEST vers TIME_TRIAL. La chaîne fonctionne (V0 et F1), avec un protocole TEST candidat.
- **Bloqué** :
  - production entière : socle (G1 non signées, 14 décisions, verrou du ruleset) ;
  - multisport (`hybridPlanning`) ;
  - taper, marathon, extrapolation de performance ;
  - 15 paramètres non résolus.
- **Date cible** : transportée, sans affûtage possible.

### Cross-training

- **C1** : infrastructure (analyse, raisons, capacités). Refuse toujours de prescrire.
- **C2 amorçage** : un mouvement, une durée, tirés de l'allowlist. Bloqué en production : allowlist non remplie, durées non approuvées (CT-D4), socle non résolu.
- **C2 rejeu strict** : la boucle fonctionne en TEST_ONLY (F1).
- **Ce qui empêche C2 en production** :
  1. les 4 politiques G1 ne sont pas signées ;
  2. `ct.safety.novicePolicy`, `ct.return.protocol` et `ct.safety.novelEccentricVolume` ne sont pas résolus ;
  3. `ct.bootstrap.movementAllowlist` est vide ;
  4. `ct.history.recencyBand` et les paramètres CT-D15 ne sont pas résolus ;
  5. `CT_CONTENT` (catalogue relu) n'est pas satisfait ;
  6. le ruleset n'est pas verrouillé ;
  7. les poids et seuils anti-doublon `crosstraining` manquent : dès qu'un historique CT existe, le CORE refuse techniquement ;
  8. en multisport, il faut aussi `ct.hybrid.policy` et CT-D11 ;
  9. aucun contenu CT de production n'est raccordé à l'application.
- **Autres formats** : absents (D).

### HYROX

| Capacité | État |
|---|---|
| H1 station isolée | B (code complet, aucune valeur gouvernée) |
| Historique de station | C (contrat et transport, non exploité) |
| Sélection de station | D (intention de programme seulement) |
| Course + station | D |
| Simulation | D |
| Séance HYROX complète | D |
| Progression | D |
| Préparation de course | D (objectif minimal seulement) |

**Fraction d'un vrai moteur HYROX** : environ 10 %. Ce sont les briques (station, charge générique, contrat de réalisation), pas l'entraînement.

---

## 5. Gouvernance et science : paramètres non résolus

Aucune valeur n'est proposée ici.

**Légende des colonnes** : « Expert » = décision experte, « Produit » = décision produit, « Contourner ? » = peut-on avancer sans la résoudre.

### Critique : bloque toute production d'un sport

| ID | Paquet | Capacité bloquée | Gouv. | État | Expert | Produit | Contourner ? |
|---|---|---|---|---|---|---|---|
| Contenu Strength (ruleset et catalogue de production) | strength / contenu | toute prescription Strength en production | G1–G5 | fixtures provisoires | oui | oui | Beta 0 en provisoire |
| G1-PAIN / SCOPE / NOVICE / RETURN (Running) | running | socle Running | G1 | non signé | médecin / expert | — | Beta 0 en simulation |
| 14 décisions E-* (Running) | running | progression, allures, sortie longue, taper… | G2 | en attente | oui | — | idem |
| `running.*` (15 non résolus) | running | marathon, extrapolation, taper, retour long… | G1/G2 | non résolu | oui | — | oui (hors V1) |
| CT-G1 (4) et socle CT (3) | crosstraining | C2 | G1 | non signé / non résolu | oui | — | non (CT hors Beta 0) |
| `ct.bootstrap.movementAllowlist` (CT-D4) | crosstraining | amorçage C2 | G1 | vide | oui | — | non |
| `hybrid_race.h1.*` (doses, niveaux, profil, multisport) | hyrox | H1 | G1/G3 | absent | oui | — | non (HYROX hors Beta 0) |

### Multisport : bloque l'usage hybride

| ID | Paquet | Capacité bloquée | Gouv. | État | Expert | Produit | Contourner ? |
|---|---|---|---|---|---|---|---|
| `GLOBAL_PLANNER_INTEGRATION` (Running) | running | Running en multisport | technique | non satisfait | — | oui | **non** pour Strength + Running |
| `planner.interference.structureWindows` | planner | interférence entre disciplines | G2 | absent | oui | — | non en multisport (tout conflit) |
| `demand.doseNormalization` | engine | profil de demande, voisinage | G2 | absent | oui | — | oui (voisinage prudent) |
| `ct.hybrid.policy` / CT-D11 | crosstraining | CT en multisport | G1/G2 | non résolu | oui | — | non |
| `duplicate.weights.crosstraining` | engine / contenu | rejeu CT, anti-doublon | G2 | absent | oui | — | non pour CT |

### Longitudinal : bloque l'adaptation

| ID | Paquet | Capacité bloquée | Gouv. | État | Expert | Produit | Contourner ? |
|---|---|---|---|---|---|---|---|
| `programme.adaptation.decisionPolicy` | programme | HOLD / PROGRESS / REGRESS / REASSESS | G2 | absent | oui | oui | oui (BLOCKED, transport seul) |
| `programme.planning.horizonWeeks` | programme | planification à l'avance | G2 | absent | — | oui | oui |
| Phases et décharge | strength / programme | périodisation | G2 | absent | oui | oui | oui (Beta 0) |
| Évaluations Strength / CT / HYROX | moteurs | réévaluation | G2 | absent | oui | oui | oui |

---

## 6. Programme Engine

| Fonction | État |
|---|---|
| Orchestration longitudinale | B (fonctionne ; non raccordée à l'UI) |
| Horizon glissant | B (semaine courante seule sans paramètre) |
| Adhérence descriptive | A (calcul factuel, aucun seuil) |
| Feedback | A pour le transport (F1) |
| Évaluations | C (contrat ; chemin réel Running TEST seulement) |
| Adaptation | B (politique absente ⇒ BLOCKED) |
| Progression | D au niveau programme (variantes déclarées seulement) |

### KAIRO adapte-t-il réellement l'entraînement ?

| Sport | Réponse |
|---|---|
| Strength | **Oui, localement** : la progression par tracks modifie la prescription suivante (règles provisoires). Aucune adaptation de programme |
| Running | **Partiellement** : ancre d'historique, progression par pas, composition et références. Simulation seulement |
| Cross-training | **Transport seulement**, plus le rejeu strict (reproduire, pas progresser). Simulation |
| HYROX | **Non** : historique transporté, non consommé |
| Programme | **Non** sans politique gouvernée : décisions BLOCKED |

---

## 7. Global Planner

| Fonction | État | Bêta | V2 |
|---|---|---|---|
| Placement, priorité, une séance par jour | fonctionnel | requis (fait) | — |
| Réessai sur créneau | fonctionnel | requis (fait) | — |
| Disponibilités | fonctionnel | requis | créneaux horaires |
| Interférence entre disciplines | mécanisme, fenêtres absentes | **requis pour hybride** | affinage |
| Profil de demande et voisinage | mécanisme, normalisation absente | souhaitable | — |
| Doubles séances | absent | non | V2 |
| Espacement même discipline | délégué aux moteurs | Strength : à vérifier | V2 |
| Composition Running dans le planificateur | absente (V0 seulement) | **requis** si le planificateur remplace V0 | — |
| Historique (semaine précédente) | fonctionnel | requis | — |

---

## 8. Application

| Besoin | État |
|---|---|
| Onboarding | V0 (sports, objectif Strength, Running, matériel, disponibilités) |
| Création de programme | API seulement |
| Calendrier | vue semaine V0 |
| Détail séance, cases à cocher, saisie des séries, minuteur | V0 |
| Saisie Running (durée, distance, TEST) | V0 |
| Résultat CT | absent de l'UI (API F1) |
| Résultat HYROX | absent de l'UI (API F1) |
| Historique | V0 |
| Progression visible | partielle (tracks non exposés en vue dédiée) |
| Modification sports / objectifs | V0 (replanification de la semaine) |
| Reprise après fermeture | stockage local versionné, sauvegarde des données illisibles |

---

## 9. Persistance et migration

**Points solides :**
- `session_record` v6 avec migrations v1 → v6 testées. Une combinaison de versions malformée est refusée.
- Export/import testé, y compris après exécutions sur les quatre sports.
- Stockage local : une donnée illisible est sauvegardée avant écrasement, une version plus récente n'est jamais écrasée.

**Risques :**

| Risque | Impact | Classe |
|---|---|---|
| Deux chemins (`planProgrammeWeek` V2 et programme) écrivent la même clé `planner.weeks[weekStart]` : V2 peut écraser une semaine du programme portant des exécutions | référence de preuve vers une séance différente | **P0** (corruption) |
| Le chemin V2 `planProgrammeWeek` ignore la pause douleur (le chemin programme la respecte) | séances générées malgré une douleur déclarée | **P0** (sécurité) |
| `AppState` v1 sans aucune migration enregistrée (champs additifs seulement) | premier changement non additif : perte de données sans migration | P1 |
| Séances V0 stockées en `SessionDraft` brut, hors `session_record` | évolution du schéma de séance non migrée | P1 |
| Historiques CT et HYROX stockés en `record(unknown)`, validés seulement à la réalisation et à la frontière du moteur | un enregistrement corrompu bloque les générations futures du sport (fail-closed, sans réparation) | P2 |
| `ProgrammeState` v1 : `measured` hérité, aucune voie de migration propre | dette de schéma | P2 |
| Stockage local uniquement, aucune synchronisation | perte en cas de changement d'appareil ou de nettoyage du navigateur | P1 (Beta 1) |
| Aucune correction d'exécution | saisie erronée irréversible | P2 |

---

## 10. Tests

| Type | Fichiers |
|---|---|
| Unitaires | 57 |
| Intégration | 24 |
| Architecture | 14 |
| E2E | 3 |
| Golden | 7 |
| Longitudinaux | 2 |
| Spikes | 6 |
| Adversarial, metamorphic, mutation (engine) | présents |

33 fichiers contiennent des propriétés fast-check.

**Par paquet** : engine 512, Strength 260, Running 511, CT 171, HYROX 34, planner 82, programme 31, app-core 78, UI 6.

**Angles morts :**
1. L'UI n'est couverte que sur V0 (6 tests) : aucun test UI du programme ni du multisport.
2. Aucun test de migration d'`AppState` (aucune migration n'existe).
3. Aucun test de cohabitation des chemins V0, V2 et programme sur un même état (risque P0 ci-dessus).
4. Les E2E multisport reposent tous sur des gouvernances TEST_ONLY : aucun test « environnement par défaut + profil hybride » côté UI.
5. Aucun test de volumétrie (historiques longs, quota de stockage).
6. Le longitudinal Strength existe ; aucun longitudinal multisport pluri-semaines au-delà de 3 semaines.

---

## 11. Dette et risques

| # | Prio | Problème | Paquet | Dépendance | Lot |
|---|---|---|---|---|---|
| 1 | P0 | Chemin V2 `planProgrammeWeek` sans pause douleur | app-core | — | petit |
| 2 | P0 | Clé `planner.weeks` partagée entre V2 et le programme (écrasement possible) | app-core | — | petit |
| 3 | P1 | Hybride Strength + Running impossible (Running refuse) | running / gouvernance | décision `GLOBAL_PLANNER_INTEGRATION` et fenêtres d'interférence | petit (code) + décision |
| 4 | P1 | Programme et multisport non raccordés à l'UI | apps/kairo | 1, 2 | moyen |
| 5 | P1 | Aucun contenu de production (Strength, Running) | contenu | experts | gros (hors code) |
| 6 | P1 | Migration `AppState` absente ; séances V0 hors `session_record` | app-core | — | moyen |
| 7 | P1 | Composition Running (KEY / LONG / TEST) absente du chemin planificateur | planner / app-core | — | moyen |
| 8 | P1 (Beta 1) | Synchronisation et sauvegarde hors appareil | app | décision produit | moyen |
| 9 | P2 | Historiques CT / HYROX faiblement typés dans `AppState` | app-core | — | petit |
| 10 | P2 | Correction d'exécution absente | app-core / programme | décision produit | petit |
| 11 | P2 | Dose HYROX en calories non générable (débits catalogue) | contenu | — | petit |
| 12 | P2 | Strength : phase fixe, aucun split ni décharge | strength / programme | décisions | moyen |
| 13 | P3 | `measured` hérité dans `ProgrammeState` | programme | — | petit |
| 14 | P3 | Doubles séances, espacement même discipline | planner | décisions | moyen |

---

## 12. Définition des bêtas

### Beta 0 : utilisable par nous-mêmes

- **Sports** : Strength et Running, mono-sport **et hybride** Strength + Running.
- **Autorités** : provisoire (Strength), simulation (Running). Bannière explicite.
- **Planification** : programme P1 (création, semaine courante, exécutions, clôture), politique de décision désactivée (BLOCKED visible).
- **UI** : onboarding programme, semaine, séance (séries, minuteur), course, historique, export/import.
- Corrections P0 faites ; migration `AppState` en place.
- **Hors périmètre** : CT, HYROX.

### Beta 1 : petit groupe de testeurs

- Beta 0, plus :
  - contenu Strength et Running relu (au moins G1 signées pour la douleur et le périmètre) ;
  - fenêtres d'interférence approuvées ;
  - politique de programme minimale approuvée ;
  - sauvegarde hors appareil ;
  - correction d'exécution ;
  - télémétrie d'erreurs.
- CT C2 en option si les décisions CT sont signées.

### V1 : publiable

- Gouvernance complète des sports publiés (ruleset verrouillé).
- Évaluations Running et Strength, périodisation minimale, décharge.
- CT C2 en production ; HYROX au minimum H1 + course, ou exclu explicitement.
- Synchronisation, conformité, paywall.

---

## 13. Roadmap critique : HEAD → Beta 0 (8 lots maximum)

| Lot | Objectif | Débloque | Dépend de | Critère de sortie |
|---|---|---|---|---|
| **L1 Sécurisation** | P0 : pause douleur sur tous les chemins ; clé unique ou interdiction croisée V2 / programme ; tests de cohabitation | intégrité des données | — | tests de cohabitation verts |
| **L2 Persistance** | migration `AppState` v1 → v2 (séances V0 en `session_record`, historiques typés), test de migration réel | évolutions sans perte | L1 | état v1 réel relu en v2 |
| **L3 Hybride Strength + Running** | décision produit `GLOBAL_PLANNER_INTEGRATION` en simulation ; composition Running (KEY / LONG / TEST) appelée depuis le chemin planificateur ; fenêtres d'interférence provisoires étiquetées (mode simulation) | premier profil hybride réel | décision humaine | semaine S + R générée hors fixtures de test |
| **L4 Programme dans l'app** | création de programme depuis le profil, `planProgrammeCurrentWeek` comme voie principale, V0 conservé en repli | parcours longitudinal | L1–L3 | onboarding → programme → semaine 1 |
| **L5 UI exécution F1** | écrans d'exécution Strength et Running branchés sur `recordSessionExecution`, clôture de semaine, adhérence affichée | boucle fermée visible | L4 | semaine 1 → semaine 2 dans l'UI |
| **L6 UI historique et programme** | vue programme (semaines, statuts, décisions BLOCKED expliquées), historique par sport | lisibilité | L5 | parcours complet sans console |
| **L7 Robustesse Beta 0** | E2E UI (Playwright) du parcours complet, volumétrie locale, export/import UI | confiance | L6 | E2E UI vert |
| **L8 Packaging Beta 0** | PWA installable, bannière d'autorité, journal de version | Beta 0 | L7 | installé et utilisé une semaine réelle |

**Beta 1** :
1. contenu relu et G1 signées ;
2. fenêtres d'interférence et politique de programme approuvées ;
3. synchronisation ;
4. correction d'exécution ;
5. CT C2 si signé.

**V1** : gouvernance verrouillée, évaluations, périodisation, HYROX (ou exclusion), conformité.

---

## 14. Question stratégique

| Critère | A : moteurs d'abord | B : UI maintenant + moteurs en parallèle | C : sous-ensemble de sports pour Beta 0 |
|---|---|---|---|
| Vitesse vers un produit testable | lente | moyenne | **rapide** |
| Risque | moteurs jamais confrontés à l'usage | dispersion sur 4 sports | faible |
| Valeur utilisateur | nulle à court terme | moyenne | **élevée** (S + R couvrent le cœur hybride) |
| Dette | faible côté UI, forte côté hypothèses | moyenne | faible |
| Capacité à tester les moteurs réellement | faible | moyenne | **élevée** (usage réel S + R) |

**Recommandation : C, puis B.**

1. Beta 0 limitée à Strength + Running, mono et hybride : V0 existant, programme, F1, UI.
2. Une fois Beta 0 utilisée, CT puis HYROX avancent en parallèle de l'UI, selon le rythme des décisions expertes.

CT et HYROX dépendent surtout de **décisions et de contenus** non disponibles. Le code n'est pas leur goulot d'étranglement.

---

## 15. Décisions humaines les plus urgentes

1. **Périmètre Beta 0** : Strength + Running (mono et hybride), CT et HYROX exclus.
2. **Hybride S + R en simulation** : accepter de marquer `GLOBAL_PLANNER_INTEGRATION` satisfait et de fournir des fenêtres d'interférence provisoires étiquetées pour Beta 0 (autorité simulation), ou attendre une approbation experte.
3. **Voie principale de l'application** : le programme (P1) remplace V0 comme voie principale, V0 restant en repli.
4. **Contenu de production** : désigner qui produit et signe le contenu Strength et Running (G1 douleur, périmètre, novice, reprise) avant Beta 1.
5. **Persistance Beta 1** : stockage local seul, ou synchronisation et sauvegarde dès Beta 1.
