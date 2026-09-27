# RUNNING-V1-GOLDEN-SCENARIOS — scénarios de référence R1–R12

> **Phase 5A : définition seulement.** Aucune séance n’est générée et aucun code n’est écrit. Ces scénarios deviendront des goldens en 5B, avec les mêmes exigences que S1–S7 en Strength : déterminisme, trace, reproductibilité par ruleset.
>
> Chaque scénario précise : entrées, ce qui est connu, ce qui est inconnu, la confiance attendue, les décisions d’architecture attendues et les hypothèses interdites. La confiance « Réf. » est `RunningReferenceConfidence` ; la confiance « Presc. » est `RUNNING_PRESCRIPTION_CONFIDENCE`.

---

### R1 — Novice sans référence fiable, objectif général, 3 séances par semaine
- **Entrées** : P-R0, GENERAL_RUNNING, 3 séances de course par semaine, pas d’historique fiable, pas de montre.
- **Connu** : disponibilité, objectif.
- **Inconnu** : tolérance mécanique, capacité aérobie, toute allure.
- **Confiance** : Réf. aucune ; Presc. LOW.
- **Décisions attendues** :
  - cibles en effort seulement (plafond easy) ;
  - EASY_RUN, avec alternance course / marche possible ;
  - phase FOUNDATION ; variable dominante = fréquence puis durée ;
  - pas de test maximal d’emblée (`R-G1-NOVICE-ENTRY`) ;
  - retour post-séance manuel exigé ;
  - LOAD CHANGE ASSESSMENT sur la base réalisée.
- **Hypothèses interdites** : allure calculée à partir de l’âge, du sexe, du poids ou d’une formule de FCmax ; « 80/20 » ; hausse de 10 % par semaine présentée comme préventive ; séance à haute intensité.

### R2 — Débutant, premier 5 km, 2 à 3 séances par semaine
- **Entrées** : P-R1, objectif 5K (date éventuelle), 2 à 3 séances, référence déclarée ou absente.
- **Connu** : objectif, fréquence.
- **Inconnu** : performance réelle, tolérance à l’intensité.
- **Confiance** : Réf. LOW (déclarée) ; Presc. LOW.
- **Décisions attendues** :
  - priorité EFFORT ; STRIDES introduits après une base de régularité ;
  - intensité SEVERE différée ou très limitée ;
  - TEST_SESSION ou course de contrôle proposé quand la tolérance le permet ;
  - fréquence variable (2 ou 3) sans changement de logique.
- **Hypothèses interdites** : l’allure objectif 5K traitée comme une référence ; plan type « 5K en N semaines » appliqué sans condition ; taper pour une charge quasi nulle (Q-TAPER-4).

### R3 — Intermédiaire, 10 km, référence récente fiable, 3 séances par semaine
- **Entrées** : P-R3, 10K, RECENT_RACE_RESULT à 10 km, récente, en conditions normales ; 3 séances.
- **Connu** : performance 10 km, historique régulier.
- **Inconnu** : frontière 1, FC individuelle.
- **Confiance** : Réf. HIGH pour la frontière 2 approchée et l’allure spécifique 10K ; MEDIUM pour le plafond easy ; Presc. MEDIUM à HIGH selon l’archétype.
- **Décisions attendues** :
  - plages d’allure pour THRESHOLD_LIKE et RACE_PACE ; effort prioritaire pour l’easy ;
  - à 3 séances, TID décrite par séance plutôt qu’en pourcentage ;
  - une variable dominante par cycle.
- **Hypothèses interdites** : allure 10K = « seuil » ; CS inférée comme vérité ; allure unique exacte ; toutes les dimensions progressant ensemble.

### R4 — Intermédiaire, semi-marathon, 4 séances par semaine
- **Entrées** : P-R3, HALF_MARATHON, 4 séances, une ou deux références (par exemple 10 km récent et semi ancien).
- **Connu** : 10 km récent ; historique de sorties longues modéré.
- **Inconnu** : tolérance à une sortie longue plus longue ; validité actuelle du semi ancien.
- **Confiance** : Réf. HIGH (10 km, pour ses usages) et LOW (semi ancien) ; Presc. MEDIUM pour l’allure spécifique semi (extrapolation modérée).
- **Décisions attendues** :
  - hiérarchie par décision : le 10 km sert pour THRESHOLD_LIKE, un semi mis à jour est souhaité pour l’allure spécifique ;
  - LONG_RUN progressé en durée ;
  - STEADY / CONTINUOUS_THRESHOLD éligibles ;
  - taper CONTEXT_DEPENDENT à l’approche de la course.
- **Hypothèses interdites** : long run = part fixe du volume ; semi ancien pris comme référence HIGH ; formule pondérée pour combiner les deux références.

### R5 — Avancé, 10 km, 5 séances par semaine, plusieurs références cohérentes
- **Entrées** : P-R4, 10K, 5 séances ; 5 km, 10 km et semi récents et concordants ; FC de laboratoire éventuelle.
- **Connu** : relation vitesse–durée bien décrite ; CS estimable (MULTI_DISTANCE_PERFORMANCE_MODEL).
- **Inconnu** : réponse individuelle au polarisé ou au pyramidal.
- **Confiance** : Réf. HIGH ; Presc. HIGH pour les séances spécifiques sur terrain plat.
- **Décisions attendues** :
  - CS utilisée comme **un** signal, confrontée aux performances ;
  - priorité PACE sur terrain plat ; plages étroites ;
  - plusieurs séances de qualité possibles, bornées par `R-G1-HI-DENSITY` ;
  - TID orientée par le contexte (l’avantage du POL est surtout documenté chez les très entraînés, à court terme) ;
  - D’ informatif seulement.
- **Hypothèses interdites** : dosage des répétitions par D’ ; POL imposé comme universel ; hausse d’allure sans nouvelle performance.

### R6 — Marathon, historique long, 5 séances par semaine
- **Entrées** : P-R3 ou P-R4, MARATHON, 5 séances ; plusieurs années de pratique ; sorties longues régulières ; semi récent.
- **Connu** : tolérance au long run ; semi récent.
- **Inconnu** : performance marathon réelle (extrapolation depuis le semi).
- **Confiance** : Réf. HIGH (semi) ; Presc. MEDIUM pour l’allure marathon (extrapolation), MEDIUM à HIGH pour le long run (historique).
- **Décisions attendues** :
  - LONG_RUN central, avec portions spécifiques en SPECIFIC ;
  - allure marathon en plage, avec l’effort affiché en parallèle ;
  - progression sur une variable dominante (long run **ou** volume) ;
  - taper : principe SUPPORTED, amplitude dans une plage, durée CONTEXT_DEPENDENT.
- **Hypothèses interdites** : allure marathon = fraction fixe de CS ou de la VMA ; taper « 41–60 % sur 21 jours » en constante ; long run borné par un pourcentage.

### R7 — Athlète hybride, 3 courses + musculation / cross-training
- **Entrées** : P-R2 et P-HYBRID ; 3 séances de course ; 2 à 3 séances de musculation (dont jambes) ; HYROX éventuel.
- **Connu** : programme Strength (demandes par structure, priorités).
- **Inconnu** : charge locomotrice HYROX assimilable à de la course.
- **Confiance** : selon les références ; Presc. MEDIUM au plus tant que la charge concurrente n’est pas stabilisée.
- **Décisions attendues** :
  - RunningEngine produit des demandes de séance (`priority`, `mechanicalDemand`, `locomotorDemand`, `placementConstraints`) ;
  - le GlobalPlanner place les séances et l’InterferenceManager arbitre ;
  - course intégrée (`wod_embedded`) comptée dans la charge ;
  - TID course seule jugée trompeuse (Q-TID-4).
- **Hypothèses interdites** : « séparer exactement X heures » ; « course + musculation = mauvais » ; RunningEngine qui place lui-même les séances ; correction par sexe appliquée à la prescription ; modification des paramètres Strength.

### R8 — Retour après interruption
- **Entrées** : P-R3, LONG_BREAK (seuil en paramètre), référence 10 km antérieure à l’interruption.
- **Connu** : niveau antérieur.
- **Inconnu** : niveau actuel, tolérance actuelle.
- **Confiance** : Réf. dégradée à LOW ; Presc. LOW.
- **Décisions attendues** :
  - phase RETURN ; effort prioritaire ;
  - progression par fréquence puis durée ;
  - VO2_INTERVALS et TEST_SESSION maximal différés ;
  - G1 `R-G1-RETURN-PROTOCOL` ;
  - une nouvelle référence est requise avant toute prescription d’allure HIGH.
- **Hypothèses interdites** : reprise au niveau de charge antérieur ; allures antérieures conservées telles quelles ; pourcentage de perte de performance inventé.

### R9 — Objectif de course, référence ancienne ou conflictuelle
- **Entrées** : P-R2 ou P-R3, 10K ou semi ; références qui divergent (par exemple un 10 km ancien rapide et des séances récentes plus lentes que prévu).
- **Connu** : conflit entre références.
- **Inconnu** : niveau actuel réel.
- **Confiance** : Réf. LOW (conflit non résolu) ; Presc. LOW à MEDIUM.
- **Décisions attendues** :
  - conflit détecté et tracé ; estimation la plus prudente retenue pour la prescription ;
  - les observations récentes concordantes l’emportent sur la référence ancienne pour baisser ;
  - test ou course de contrôle proposé ; plages élargies.
- **Hypothèses interdites** : moyenne pondérée des références ; référence ancienne rapide gardée comme HIGH ; hausse sur des séances « faciles ».

### R10 — Séance manquée dans une semaine
- **Entrées** : P-R2 à P-R4 ; une séance KEY manquée en milieu de semaine.
- **Connu** : semaine planifiée, séance manquée, jours restants.
- **Inconnu** : raison (si non renseignée).
- **Confiance** : inchangée.
- **Décisions attendues** :
  - MISSED_ONE_SESSION ; replanification minimale ;
  - déplacement seulement si un créneau respecte les contraintes (pas adjacent à une autre KEY) ; sinon abandon ;
  - zone gelée respectée ;
  - `reasonForModification` pris en compte (TIME ≠ tolérance).
- **Hypothèses interdites** : deux séances difficiles empilées ; kilomètres « rattrapés » ; volume de la semaine suivante augmenté pour compenser.

### R11 — Taper pré-compétition
- **Entrées** : P-R3, objectif 10K, semi ou marathon avec date ; charge antérieure connue.
- **Connu** : date de course, charge des semaines précédentes.
- **Inconnu** : réponse individuelle au taper.
- **Confiance** : Presc. MEDIUM (principe soutenu, amplitude en plage).
- **Décisions attendues** :
  - phase TAPER ; volume réduit, intensité et fréquence maintenues (principe SUPPORTED) ;
  - amplitude dans la plage SUPPORTED_WITH_RANGE ;
  - durée CONTEXT_DEPENDENT selon la distance et le niveau ;
  - sources tracées.
- **Hypothèses interdites** : constantes universelles (41–60 %, ≤ 21 jours) ; suppression de l’intensité ; taper identique pour 5K et marathon sans justification.

### R12 — Référence déclarée uniquement
- **Entrées** : P-R1 ou P-R2 ; objectif 10K ; seule donnée : « je cours le 10 km en X » (déclaré, non daté, sans conditions).
- **Connu** : déclaration.
- **Inconnu** : date, conditions, exactitude.
- **Confiance** : Réf. LOW ; Presc. LOW.
- **Décisions attendues** :
  - la déclaration est conservée comme USER_DECLARED_REFERENCE ;
  - allure seulement indicative (plage large) ou absente ; priorité EFFORT ;
  - calibration par observations d’entraînement ; test proposé ;
  - aucune hausse sans performance.
- **Hypothèses interdites** : déclaration traitée comme RECENT_RACE_RESULT ; allures étroites ; seuils ou CS dérivés comme s’ils étaient mesurés.

---

## Invariants transverses (à tester en 5B sur R1–R12)
1. Aucune allure sans référence valide pour la décision (R1, R2, R12).
2. Une estimation de performance n’est jamais une cible sans décision tracée (tous).
3. Pas de multi-progression (R3, R6).
4. Pas d’empilement de séances difficiles (R10).
5. CS n’est jamais seule autorité (R5).
6. Pas de correction démographique (R1, R7).
7. Déterminisme : même entrée, même ruleset, même graine ⇒ même sortie et même trace.
8. Toute valeur issue du registre est tracée avec son statut.
