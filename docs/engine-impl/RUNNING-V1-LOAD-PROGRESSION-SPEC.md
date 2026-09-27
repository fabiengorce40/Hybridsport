# RUNNING-V1-LOAD-PROGRESSION-SPEC — distribution, charge, sécurité, reprise, taper, progression, retours

> **Phase 5A, spécification seulement** (aucun code). Sections couvertes : L (TID), Q (charge), R (sécurité), S (reprise et interruption), T (taper), X (progression), Y (retours). Niveau de preuve maximal : **SEARCH_SUMMARY**.

**Interdits de cette spec**
- ne pas coder « 80/20 » ;
- ne pas implémenter la règle « +10 % par semaine » ;
- ne pas utiliser l’ACWR comme prédicteur de blessure ;
- ne pas inventer de seuil de blessure ;
- ne pas convertir les plages de taper en constantes universelles.

---

## L. Distribution de l’intensité (TID)

### L.1 Preuve (SEARCH_SUMMARY)
- **Oliveira, Boppre, Fonseca 2024** (Sports Med, PMID 38717713) : 17 études, 437 participants, interventions d’au moins 4 semaines.
  - Avantage du polarisé (POL) sur le VO2peak : SMD 0,24 (IC 95 % 0,01–0,48).
  - Avantage surtout marqué dans les interventions de moins de 12 semaines et chez les athlètes très entraînés.
  - Pas de différence claire pour les contre-la-montre (TT), le temps jusqu’à épuisement (TTE) et VT2/LT2 par rapport aux autres TID (d’après la mission et le résumé de recherche).
  - Méthode GRADE utilisée.
- **Rosenblat, Perrotta, Vicenzino 2019** (JSCR) : 4 études POL vs seuil ; effet modéré en faveur du POL sur les contre-la-montre ; preuves limitées.

### L.2 Conséquence : TID = `CONTEXT_DEPENDENT`
Le moteur ne fixe aucune distribution universelle. Types reconnus (descriptifs) : `POLARIZED`, `PYRAMIDAL`, `THRESHOLD_HEAVY`, `OTHER`.

La TID est une **résultante observée et une orientation**, pas une cible imposée. Elle se décide après examen de :

| Facteur | Influence candidate (hypothèse `EXPERT_DESIGN_REVIEW`) |
|---|---|
| Objectif | 5K / 10K : plus de temps en SEVERE et THRESHOLD_LIKE ; marathon : plus de MODERATE |
| Niveau | L’avantage du POL est surtout observé chez les très entraînés (Oliveira 2024) ; aucune extrapolation automatique aux débutants |
| Phase | FOUNDATION : peu d’intensité ; SPECIFIC : intensité spécifique |
| Fréquence hebdomadaire | Avec 2 ou 3 séances, chaque séance de qualité pèse lourd dans la distribution ; un pourcentage de temps a peu de sens à faible fréquence |
| Charge récente | Une hausse récente limite l’ajout d’intensité (voir §Q) |
| Sports concurrents | En P-HYBRID, une partie de l’intensité vient d’autres disciplines : la TID course seule est trompeuse |

### L.3 Unité de mesure
La TID est calculée en **temps dans le domaine** (sur la durée de travail, taxonomie §J.2), et secondairement en nombre de séances par catégorie. Le temps par domaine n’est estimable qu’avec une confiance suffisante ; sinon, la TID est décrite par séance (easy / qualité), sans pourcentage.

---

## Q. Charge de course multidimensionnelle

### Q.1 Dimensions
La charge n’est pas réduite à `weeklyKilometers`. `RunningLoad` (par séance, agrégée par période) comprend :

| Dimension | Mesure | Disponible en saisie manuelle |
|---|---|---|
| distance | m | oui (déclarée) |
| duration | s | oui |
| intensity exposure | temps par domaine (ou par séance si confiance insuffisante) | partiellement (via RPE ou archétype) |
| high-intensity duration | temps en SEVERE + SPRINT_NEUROMUSCULAR | via archétype + réalisation |
| long-run load | durée de la plus longue sortie et fréquence des longues | oui |
| mechanical exposure | ordinal par séance (archétype × dose × terrain déclaré) | oui |
| frequency | nombre de séances course par période | oui |
| recent history | fenêtre récente vs référence plus longue (fenêtres en paramètres) | oui |
| concurrent locomotor load | charge locomotrice des autres disciplines (via `RunningExposure` et `runningContribution()` existants, et la musculation des jambes) | selon les autres moteurs |
| session RPE × durée (sRPE) | charge interne | oui ; Foster 2001 : sRPE valide par rapport à la méthode FC (SEARCH_SUMMARY) |

Aucune dimension n’est convertie en un score unique pondéré. Les dimensions sont évaluées **séparément** par la LOAD CHANGE ASSESSMENT.

### Q.2 LOAD CHANGE ASSESSMENT
Évaluation du **changement** de charge proposé, dimension par dimension, par rapport à une **base récente**.

| Entrée | Contenu |
|---|---|
| recent baseline | Charge habituelle récente par dimension (fenêtre en paramètre) |
| magnitude | Écart relatif et absolu proposé par dimension |
| intensity change | Ajout ou retrait de temps en HEAVY / THRESHOLD_LIKE / SEVERE |
| frequency change | Ajout ou retrait de séances |
| long-run change | Évolution de la plus longue sortie |
| athlete history | Plus haute charge déjà tolérée durablement, ancienneté de pratique |
| return status | En reprise ou non (§S) |
| concurrent load | Évolution simultanée de la charge locomotrice d’autres disciplines |

Sortie (ordinale, par dimension puis globale) :

| Classe | Signification | Conséquence |
|---|---|---|
| `WITHIN_HABITUAL` | Dans la plage habituelle ou déjà tolérée | Accepté |
| `MODERATE_INCREASE` | Hausse sur une seule dimension, dans des bornes | Accepté, tracé |
| `MULTI_DIMENSION_INCREASE` | Hausses simultanées sur plusieurs dimensions | Refusé : une seule dimension progresse (§X) |
| `LARGE_INCREASE` | Au-delà d’une borne de garde-fou | Refusé ; proposition réduite (`PRODUCT_GUARDRAIL`, G1 candidat) |
| `OUT_OF_SCOPE` | Situation hors périmètre (douleur, symptômes, cas médical) | Arrêt de la progression, message de réorientation |

**Bornes.** Elles sont des **garde-fous V1** (`PRODUCT_GUARDRAIL` / `SAFETY_SIGNOFF_REQUIRED`), pas des seuils physiologiques. Aucune valeur n’est fixée en 5A.

### Q.3 Pourquoi pas la règle des 10 %
- **Damsted et al. 2018** (IJSPT, PMID 30534459) : 4 articles ; 3 trouvent une association entre hausse de charge et blessure ; preuves très limitées ; pas de seuil clair de 10 % ; pas de différence entre des hausses de 10 % et de 24 %.
- **Buist et al. 2008** (AJSM, PMID 17940147, GRONORUN) : 532 débutants ; un programme gradué de 13 semaines appliquant la règle des 10 % contre un programme standard de 8 semaines donne 20,8 % contre 20,3 % de blessés, sans effet.
- **Nielsen et al. 2014** (JOSPT, DANO-RUN) : 874 débutants suivis par GPS ; une hausse de plus de 30 % sur 2 semaines est associée à plus de blessures liées à la distance qu’une hausse de moins de 10 % ; l’effet varie selon le type de blessure. **C’est une association observationnelle, pas un seuil de prescription.**
- **Fredette et al. 2022** (J Athl Train) : 36 études ; preuves contradictoires sur le lien entre paramètres d’entraînement et blessures.
- **Impellizzeri et al. 2020** (IJSPP) : l’ACWR n’est pas soutenu pour la gestion du risque de blessure (artefacts statistiques).

⇒ Aucun seuil de hausse n’est présenté comme préventif. Toute borne est un garde-fou produit, à signer (G1).

---

## R. Gouvernance de la sécurité

### R.1 Ce que le moteur ne prétend pas faire
Le moteur **ne prétend pas prévenir les blessures**, et aucun message produit ne doit le laisser croire.

### R.2 Ce que le moteur peut faire
- éviter des progressions manifestement agressives (LOAD CHANGE ASSESSMENT) ;
- réduire la prescription selon la readiness et la tolérance déclarées ;
- gérer une reprise progressive (§S) ;
- signaler une situation hors périmètre (douleur persistante, symptômes, contexte médical) et arrêter la progression.

### R.3 Classes de règles (à distinguer dans le registre)

| Classe | Définition | Exemple Running | Statut registre |
|---|---|---|---|
| **Performance rule** | Règle soutenue par des preuves sur un effet de performance | Réduire le volume en taper en maintenant intensité et fréquence | SUPPORTED / SUPPORTED_WITH_RANGE |
| **Programming heuristic** | Pratique raisonnable sans valeur démontrée | Ne pas placer deux séances KEY consécutives ; progression d’une seule variable à la fois | PROGRAMMING_HEURISTIC / EXPERT_DESIGN_REVIEW |
| **Product guardrail** | Borne du produit pour limiter les écarts, sans prétention physiologique | Borne de hausse de charge ; pas de test maximal pour P-R0 ; hausse d’allure sur preuve seulement | PRODUCT_GUARDRAIL |
| **Safety guardrail** | Règle destinée à limiter un risque pour la personne, validée par un responsable | Arrêt de progression sur douleur déclarée ; plafond de reprise après longue interruption ; message hors périmètre | SAFETY_SIGNOFF_REQUIRED (G1) |

### R.4 G1 candidats (visa de sécurité requis avant production)

| Identifiant | Objet | Pourquoi G1 |
|---|---|---|
| `R-G1-LOAD-INCREASE-BOUND` | Borne(s) de la LOAD CHANGE ASSESSMENT (classe LARGE_INCREASE) | Aucune valeur soutenue ; effet direct sur l’exposition |
| `R-G1-RETURN-PROTOCOL` | Reprise après LONG_BREAK : plafond de départ, rythme de retour, archétypes interdits | Risque en reprise ; pas de preuve chiffrée vérifiée |
| `R-G1-PAIN-STOP` | Conduite à tenir sur douleur ou symptôme déclaré (arrêt de progression, réorientation) | Sécurité de la personne ; frontière médicale |
| `R-G1-NOVICE-ENTRY` | Point d’entrée P-R0 (alternance course / marche, pas de test maximal, fréquence de départ) | Population la plus exposée, sans tolérance connue |
| `R-G1-LONGRUN-BOUND` | Éventuelle borne du long run (absolue ou relative à l’historique) | Pas de part fixe soutenue ; exposition mécanique |
| `R-G1-HI-DENSITY` | Nombre maximal de séances à haute intensité par période et espacement minimal | Pas de valeur universelle ; exposition |
| `R-G1-OUT-OF-SCOPE` | Liste des situations hors périmètre (grossesse, pathologie, mineurs…) | Frontière produit et médicale |

---

## S. Reprise et interruption

**Principes**
- Replanification **minimale** : la plus petite modification qui garde la semaine cohérente.
- Pas de rattrapage mécanique des kilomètres perdus.
- **Ne jamais empiler deux séances difficiles** parce qu’une séance a été manquée (`PRODUCT_GUARDRAIL`).
- La zone gelée (`08-adaptation.md`) est respectée : les séances des prochaines 24 h ne changent pas sans action de l’utilisateur.

| Cas | Définition (seuils en paramètres, non fixés en 5A) | Décision candidate |
|---|---|---|
| `MISSED_ONE_SESSION` | Une séance manquée dans la semaine | Séance EASY / SUPPORT manquée : abandonnée. Séance KEY manquée : déplacée **seulement** si un créneau respecte les contraintes de placement (pas adjacente à une autre KEY) ; sinon abandonnée, ou remplacée par la séance KEY suivante inchangée. |
| `MISSED_MULTIPLE_SESSIONS` | Plusieurs séances manquées sur une période courte | Pas de rattrapage ; la semaine suivante reprend au niveau de charge **réellement réalisé** (base récente recalculée par la LOAD CHANGE ASSESSMENT) |
| `SHORT_BREAK` | Interruption courte | Reprise sur la base récente réduite ; priorité aux séances EASY ; intensité réintroduite progressivement. Mujika & Padilla 2000 : chez les très entraînés, le VO2max décline rapidement dès le court terme, en restant au-dessus des non-entraînés ; le seuil lactique baisse. |
| `LONG_BREAK` | Interruption longue | Phase RETURN : références d’allure **dégradées** (confiance LOW ; hausse interdite sans nouvelle preuve) ; progression par fréquence puis durée ; G1 `R-G1-RETURN-PROTOCOL` |
| `LOW_ADHERENCE` | Adhérence faible durable | Replanification vers moins de séances et un programme plus simple ; pas de maintien d’un programme irréaliste ; signal au GlobalPlanner |
| `POST_RACE_RECOVERY` | Après une course | Phase RECOVERY ; durée selon la distance courue (paramètre `PROGRAMMING_HEURISTIC`) ; **la course devient une référence** (RECENT_RACE_RESULT), avec ses conditions |

---

## T. Taper

### T.1 Preuve (SEARCH_SUMMARY)
- **Wang et al. 2023** (PLoS One, PMID 37163550) : 14 études ; le taper améliore les contre-la-montre et le temps jusqu’à épuisement. Taper efficace : jusqu’à 21 jours, réduction de volume de 41 à 60 %, intensité et fréquence inchangées.
- **Bosquet et al. 2007** (méta-analyse, PMID 17762369) : 27 études ; taper de 2 semaines avec réduction exponentielle du volume de 41 à 60 %, intensité et fréquence maintenues.

### T.2 Classification

| Élément | Statut |
|---|---|
| Principe : réduire la charge avant la compétition améliore la performance d’endurance | **SUPPORTED** (deux méta-analyses convergentes, SEARCH_SUMMARY) |
| Mécanisme : baisse du volume, intensité et fréquence maintenues | **SUPPORTED** (convergent) |
| Amplitude de réduction du volume (41–60 %) | **SUPPORTED_WITH_RANGE** : plage issue de méta-analyses multi-sports. C’est une plage de départ, **pas une constante**. |
| Durée (≤ 21 jours ; environ 2 semaines chez Bosquet) | **CONTEXT_DEPENDENT** : selon la distance, le niveau et la charge antérieure |
| Forme (exponentielle, linéaire, en palier) | **CONTEXT_DEPENDENT** / INSUFFICIENT_EVIDENCE pour la course seule dans ce dossier |

### T.3 Relation avec l’objectif, le niveau et la charge antérieure (questions ouvertes, pas de valeurs)

| Facteur | Hypothèse à tester (Q-TAPER) |
|---|---|
| 5K / 10K | Taper plus court que pour le marathon |
| Semi | Intermédiaire |
| Marathon | Taper le plus long des objectifs V1 |
| Niveau de l’athlète | Taper peu utile quand la charge antérieure est faible (P-R0, P-R1) : on ne réduit que ce qui a été accumulé |
| Charge antérieure | L’amplitude utile dépend de la charge accumulée |

Les méta-analyses vérifiées couvrent plusieurs sports d’endurance et ne permettent pas, au niveau SEARCH_SUMMARY, de différencier ces cas pour la course.

---

## X. Progression

### X.1 Variables progressables
Durée hebdomadaire, distance hebdomadaire, fréquence, durée du long run, volume de travail de qualité (fractionné), durée des répétitions, intensité ou allure, durée des récupérations (à la baisse), densité des séances, spécificité.

### X.2 Principe
**Ne pas augmenter toutes les dimensions en même temps.** Par cycle de progression, une **variable dominante** progresse ; les autres restent stables ou baissent (`PROGRAMMING_HEURISTIC`, cohérent avec la classe MULTI_DIMENSION_INCREASE de §Q.2).

### X.3 Choix de la variable dominante (ProgressionEngine) : ordre de décision candidat
1. **Conditions bloquantes** : reprise, adhérence faible, retours négatifs répétés ou LOAD CHANGE ASSESSMENT défavorable ⇒ aucune progression (maintien ou baisse).
2. **Priorité de la phase** (domain spec §W) : FOUNDATION ⇒ fréquence puis durée ; DEVELOPMENT ⇒ volume de qualité ; SPECIFIC ⇒ spécificité ; TAPER ⇒ baisse du volume.
3. **Écart principal à l’objectif** : par exemple, le long run reste insuffisant pour un marathon, donc il devient la variable dominante.
4. **Variable la moins récemment progressée** parmi les éligibles, pour éviter de toujours pousser la même.
5. **Intensité ou allure en dernier** : elle ne progresse que sur **nouvelle référence** (modèle de références §F.3), jamais par incrément automatique.

Cet ordre est `EXPERT_DESIGN_REVIEW`. Les incréments eux-mêmes sont des paramètres (`PROGRAMMING_HEURISTIC`), bornés par la LOAD CHANGE ASSESSMENT.

### X.4 Décharge
Une semaine allégée périodique (`07-progression.md` : « toutes les 3–4 semaines ») est une `PROGRAMMING_HEURISTIC` sans preuve vérifiée en 5A. Option V1 à trancher : décharge **périodique** ou **conditionnelle** (retours, adhérence, charge). Question Q-PROG-5.

---

## Y. Modèle de retour post-séance

RunningEngine V1 fonctionne en **saisie manuelle** ; ni montre ni GPS n’est requis.

| Champ | Type | Obligatoire | Usage |
|---|---|---|---|
| `completed` | FULL / PARTIAL / SKIPPED | oui | Adhérence, replanification |
| `actualDuration` | s | recommandé | Charge réalisée |
| `actualDistance` | m | facultatif | Charge réalisée |
| `actualPace` | s/km (moyenne ou par bloc) | facultatif | Observation d’entraînement (modèle de références) |
| `actualHR` | bpm (moyenne / max) | si disponible | Signal complémentaire |
| `sessionRPE` | échelle déclarée (conventionnellement CR-10 pour la sRPE) | recommandé | Charge interne (Foster 2001) |
| `intervalCompletion` | répétitions réalisées / prévues | si fractionné | Tolérance, référence |
| `targetCompliance` | BELOW / WITHIN / ABOVE (par bloc) | recommandé | Conformité à la cible ; ABOVE sur une séance easy est un signal |
| `unexpectedDifficulty` | NONE / HARDER / MUCH_HARDER | recommandé | Signal de tolérance |
| `readiness` / `tolerance` | déclaratif (fatigue, sommeil, douleur oui/non + localisation) | recommandé | Douleur ⇒ `R-G1-PAIN-STOP` |
| `reasonForModification` | TIME / FATIGUE / PAIN / WEATHER / TERRAIN / OTHER | si modifiée | Distingue une contrainte externe d’un problème de tolérance |

**Règles d’interprétation (candidates)**
- Un retour isolé ne modifie pas une référence ; plusieurs retours concordants peuvent la **baisser**, jamais la hausser (modèle de références §F.3).
- `reasonForModification = TIME` n’est pas un signal de tolérance.
- `reasonForModification = PAIN` déclenche la gouvernance de sécurité.
