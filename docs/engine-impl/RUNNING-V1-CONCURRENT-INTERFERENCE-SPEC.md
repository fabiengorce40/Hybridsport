# RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC — entraînement concurrent et contrat avec le GlobalPlanner

> **Phase 5A, spécification seulement** (aucun code). Sections couvertes : U (entraînement concurrent), V (architecture de semaine, côté interférence). Le StrengthEngine, son `InterferenceAssessment` et ses paramètres **ne sont pas modifiés** ; ce document décrit seulement ce que RunningEngine devra échanger avec eux.

## 1. Principe d’autorité

- RunningEngine **ne crée pas de second planner**. Il ne place pas les séances dans la semaine multisport.
- Le **GlobalPlanner** décide du placement final. L’**InterferenceManager** évalue les conflits entre séances de disciplines différentes.
- RunningEngine **déclare** ses séances (demande de séance, domain spec §V) et **réagit** aux décisions reçues (alternative, réduction, suppression d’un OPTIONAL).
- Le StrengthEngine a déjà une évaluation d’interférence ordinale (`STRENGTH-INTERFERENCE-ASSESSMENT-V1.md`). Elle lit la demande `locomotor_impact` transmise par le planificateur pour la course. Running V1 devra **fournir** cette demande de façon structurée, sans que RunningEngine lise ou modifie les paramètres Strength.

## 2. Preuve (SEARCH_SUMMARY)

- **Huiberts, Wüst, van der Zwaard 2024** (Sports Med), 59 études, 1346 participants :
  - force du bas du corps atténuée chez les hommes, pas chez les femmes ;
  - pas de différence de sexe pour la force du haut du corps, la puissance ou le VO2max ;
  - les non-entraînés (pas les entraînés) montrent un gain de VO2max plus faible en concurrent.
  - ⇒ Les effets dépendent du **sexe**, du **statut d’entraînement** et de l’**outcome**.
- **Blagrove, Howatson, Hayes 2018** (Sports Med, PMID 29249083) : la musculation peut améliorer l’économie de course ; l’ampleur dépend de la méthode et de la vitesse.
- Aucune source vérifiée en 5A ne fixe un espacement en heures entre musculation et course.

**Conséquences**

- pas de règle universelle « course + musculation = mauvais » ;
- pas de règle « séparer exactement X heures » ;
- la musculation est un **possible atout** pour l’économie (bénéfice à exprimer dans le GlobalPlanner, pas dans RunningEngine).

## 3. Entrées que l’InterferenceManager doit considérer (côté course)

| Entrée | Fournie par | Contenu |
|---|---|---|
| strength lower-body | StrengthEngine (demandes par structure, déjà présentes) | Demande par structure (`lower_knee`, `lower_hip`, …), importance |
| HYROX / cross-training locomotor load | Autres moteurs (`RunningExposure`, `runningContribution()`) | Course intégrée, charge locomotrice non « course » (sled, fentes, sauts…) |
| running intensity | RunningEngine | Domaine d’intensité principal de la séance, temps en SEVERE / THRESHOLD_LIKE |
| running mechanical demand | RunningEngine | `mechanicalDemand`, `locomotorDemand` (ordinaux, taxonomie §I) |
| session importance | RunningEngine | `priority` : KEY / SUPPORT / OPTIONAL |
| temporal proximity | GlobalPlanner | Proximité entre séances (bandes opérationnelles, pas des frontières biologiques ; même doctrine que Strength) |
| athlete status | Profil | Population, contexte hybride, reprise ; sexe et statut d’entraînement comme **contexte d’interprétation**, jamais comme multiplicateur |

## 4. Ce que RunningEngine fournit (demande de séance)

Pour chaque séance : `sessionType`, `priority`, `stimulus`, `estimatedDuration`, `estimatedLoad` (multidimensionnel), `mechanicalDemand`, `recoveryDemand`, `placementConstraints`. Voir domain spec §V.

Exemples de `placementConstraints` **déclaratives** (aucune durée fixe) :

| Contrainte | Sens |
|---|---|
| `AVOID_ADJACENT_KEY_SAME_DIMENSION` | Ne pas coller deux séances KEY qui sollicitent la même dimension (locomotrice, métabolique sévère) |
| `PREFER_BEFORE_HEAVY_LOWER` | Préférer la séance KEY course avant une séance de jambes lourde (reprend l’ordre « souple » de `04-moteur-entrainement.md`), sans durée d’espacement imposée |
| `PREFER_LONGEST_SLOT` | LONG_RUN sur le créneau le plus long |
| `NOT_AFTER_HIGH_LOCOMOTOR` | Éviter une séance à `locomotorDemand` HIGH juste après une autre séance à charge locomotrice HIGH (HYROX, jambes) |
| `FLEXIBLE` | EASY / OPTIONAL : placement libre |

Les **seuils** de proximité et la gravité de chaque conflit sont des paramètres de l’InterferenceManager (`PROGRAMMING_HEURISTIC`, avec provenance). Le « ≥ 24 h dur » de l’architecture initiale est requalifié (domain spec §AG).

## 5. Résolution d’un conflit (ordre candidat)

1. **Priorité** : la séance KEY de la discipline prioritaire de la semaine (fixée par le GlobalPlanner selon l’objectif) est protégée.
2. **Déplacement** : si un créneau respecte les contraintes.
3. **Modulation** de la séance moins prioritaire :
   - côté course, archétype de moindre demande mécanique (par exemple THRESHOLD_INTERVALS au lieu de HILL_REPETITIONS), séance raccourcie, ou priorité EFFORT ;
   - côté Strength, les ajustements existants de son `InterferenceAssessment`, inchangés.
4. **Suppression** d’une séance OPTIONAL.
5. **Signal** à l’utilisateur si aucune solution ne préserve la séance KEY.

Chaque étape est tracée. Il n’existe pas de pénalité numérique pondérée : l’ordre est lexicographique, comme en Strength.

## 6. `HYBRID_RUNNING_SUPPORT` (architecture seulement)

- L’objectif HYROX ou cross-training est porté par le GlobalPlanner.
- RunningEngine reçoit une intention « course au service de » avec :
  - archétypes éligibles (par exemple EASY_RUN, THRESHOLD_INTERVALS, SHORT_INTERVALS) ;
  - fréquence ;
  - budget de charge locomotrice restant après les autres disciplines.
- La course **intégrée** aux séances HYROX (`RunningExposure` `wod_embedded`) compte dans la charge course (LOAD CHANGE ASSESSMENT) ; RunningEngine ne la prescrit pas.
- Aucun moteur HYROX n’est créé en V1.

## 7. Questions ouvertes
Voir Q-CONC-1 à Q-CONC-5 dans [`RUNNING-EVIDENCE-REVIEW-PACK.md`](RUNNING-EVIDENCE-REVIEW-PACK.md) : ordre intra-journée, effet de la proximité selon l’intensité de la course, rôle du sexe et du statut d’entraînement, part de la charge locomotrice HYROX assimilable à de la course, bénéfice de la musculation sur l’économie selon le niveau.
