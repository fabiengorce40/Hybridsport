# 05 — Progression, volume, interaction multisport, durée

## 12. Progression

Décision de progression = **ProgressionEngine** (doc 08), avec les modèles décrits ici. Le StrengthEngine **applique** la prochaine prescription de chaque track ; il ne décide pas seul d'une hausse.

### 12.1 Modèles V1 (4)

Règle V1.2 : **une variable dominante progresse à la fois**, sauf modèle explicitement défini et testé.

| Modèle | Variable dominante | Pour qui / quoi | Règle |
|--------|-------------------|-----------------|-------|
| **PM1 — Linéaire en charge** | Charge | Novice et débutant, emplacement principal | Toutes les séries de travail réussies à l'effort cible ⇒ charge + incrément réalisable à la séance suivante |
| **PM2 — Double progression** | Reps, puis charge (**modèle à deux variables, explicitement défini**) | Accessoires, isolation, machines, haltères, et l'hypertrophie en général | Reps montées dans la plage ; haut de plage atteint sur toutes les séries à l'effort cible ⇒ charge + incrément et reps au bas de la plage. Une seule variable change à chaque pas |
| **PM3 — Autorégulé RIR + e1RM** | Charge (via l'e1RM lissé) | Intermédiaire et avancé, emplacement principal, avec du RIR saisi | Doc 08 §1 : classement `above` / `on_target` / `below`, e1RM lissé, pas bornés |
| **PM4 — Progression de séries** | Séries (par groupe et par semaine) | Hypertrophie, phase d'accumulation | +1 série par groupe prioritaire et par semaine, dans la plage L5 ; plafond atteint ⇒ décharge (planificateur) |

Variantes plutôt que modèles supplémentaires :
- **Progression de difficulté** : pour une charge plafonnée ou un exercice au poids du corps, le « pas de charge » de PM1 ou PM2 devient le **rang suivant** de la `progressionFamily` du catalogue (ex. pompe inclinée → pompe → pompe lestée).
- **Densité** : pas de modèle de progression V1 en musculation. La réduction des repos reste un levier de durée, jamais un objectif progressé (erreur empêchée : dégrader la qualité des séries lourdes pour « progresser »).

Le choix du modèle se fait par track : `strength.progression.modelFor[level][role][exerciseClass]` (G2).

### 12.2 Classement d'une exposition

| Classement | Définition (paramètres G2) | Effet |
|------------|----------------------------|-------|
| `above` | Reps cibles atteintes et RIR réel ≥ cible + seuil | Progression (PM3 : recalage de l'e1RM après répétition) |
| `on_target` | Reps cibles atteintes, RIR dans la tolérance | Progression au prochain pas |
| `partial` | Au moins une série de travail manquée **ou** RIR sous la cible − 1 sur une seule série | Maintien |
| `below` | Reps manquées sur plusieurs séries, ou RIR ≤ cible − seuil | Maintien ; `below` × 2 consécutifs ⇒ réduction (pas G2) ou variante : `PROGRESSION.REGRESSED` |
| `no_data` | Séance cochée sans charges ni reps | `DATA.ASSUMED_AS_PRESCRIBED` ; **progression gelée** (on n'avance pas sur une hypothèse) |
| `interrupted` | Séance arrêtée (hors douleur) | Les séries réalisées sont classées normalement ; les séries non réalisées ne comptent **pas** comme `below` |
| `pain` / `safety_pause` | `skipReason` correspondant | **Jamais un échec de performance** : track suspendue, régularité non affectée (V1.2, doc 08 principe 6) |
| `substituted` | Exercice remplacé | Aucune mise à jour de la track de l'ancre ; l'exécution nourrit la capacité de l'exercice substitué (§17) |

La progression se décide sur des **preuves répétées** (paramètre `strength.progression.evidenceRequired[model]`), avec une exception pour PM1 chez le novice (une séance réussie suffit).

Il n'y a aucune hausse si la régularité est faible ou si la lecture de l'état est `caution` / `reduce`. Les **bornes par cycle** (plafond de gain de capacité par mésocycle, G2) empêchent la progression infinie.

**VALIDATION** : une seule variable progresse par pas (propriété, sauf PM2 dont la séquence est testée) ; pas réalisables ; aucune progression en décharge ; bornes par cycle.
**FAILURE** : charge plafonnée ⇒ progression de difficulté ou `DOSE.LOAD.CAP_REACHED` ; données absentes ⇒ gel.

## 13. Volume

**Erreur empêchée** : un volume absurde (trop ou trop peu), une dérive au fil des semaines, ou plusieurs séances de musculation qui s'ignorent.

### 13.1 Mesure

**E1** (doc 04 §3.1), calculé par l'AthleteState et non par le moteur :
- séries difficiles réalisées ;
- muscle primaire = 1, secondaire = 0,5 (paramètre `heuristic`) ;
- `rampup` exclues ;
- conditioning exclu.

Le StrengthEngine **prévoit** les séries difficiles de sa proposition avec la même règle (`plannedHardSets` par muscle), pour que prévu et réalisé soient comparables.

### 13.2 Décision

1. **Cible hebdomadaire** par groupe : plage L5 `strength.volume.weeklyRange[goal][level][muscleGroup]` (G2). Le **plancher** est un TARGET (B1), le **haut** de plage est SOFT (B5). Pour le soutien : **plage de maintien** (`strength.volume.supportRange`), bien plus basse.
2. **Volume restant** pour la semaine = cible − E1 réalisé sur 7 j − séries prévues des autres séances de musculation de la semaine (`WeekContext.strengthSessionsThisWeek`).
3. **Répartition** : le volume restant est réparti sur les séances de musculation restantes qui couvrent le groupe, au prorata (M3). La séance courante prend sa part, dans les bornes de séries par emplacement.
4. **Plafond par séance** (L4, **G1**) : séries difficiles par groupe et par séance. C'est un contrôle STR-V2 du validateur, HARD.
5. **Progression du volume** : seulement via PM4 (hypertrophie, accumulation), et dans L5.
6. **Réduction** : décharge (M2), lecture de l'état (M4), multisport (M5), temps (M6).

### 13.3 Coordination de plusieurs séances de musculation

Le moteur ne voit que sa séance, mais reçoit les séries **prévues** des autres séances de la semaine (via le planificateur). Il ne réécrit jamais une autre séance : si la semaine est déséquilibrée, c'est le planificateur qui arbitre. Le moteur signale `PLAN.VOLUME_IMBALANCE_WEEK` quand il ne peut pas atteindre le plancher d'un groupe prioritaire.

**VALIDATION** : aucune séance au-delà de L4 (HARD, CORE) ; semaine dans L5 (test golden et longitudinal) ; dérive détectée (§25).
**FAILURE** : E1 inconnu ⇒ départ au bas de la plage (doc 04) et `DATA.EXPOSURE_UNKNOWN`.

## 14. Interaction multisport

**Principe** : le GlobalPlanner place les séances et l'InterferenceManager résout les conflits. Le StrengthEngine **reçoit** le contexte (voisins, notes du planificateur, séances clés) et **adapte sa proposition** : choix d'exercice (C4, F9), dosage (M5), emplacements optionnels. Il ne déplace ni ne supprime jamais une séance.

| Situation (contexte reçu) | Adaptation du StrengthEngine | Ce qu'il ne fait pas |
|---------------------------|------------------------------|----------------------|
| Séance jambes (A3) la veille d'intervalles (note `avoid_high_lower_body`) | Demande `lower_knee` / `lower_hip` abaissée à `moderate` : exercices à `axialLoad` et excentrique moindres (C4), RIR +1 à +2, séries −, `isolation_lower` retirée ; si impossible sans perdre l'objet de l'archétype ⇒ `PLAN.CONTEXT_INCOMPATIBLE` pour que le planificateur change de variante | Déplacer les intervalles |
| Squat lourd avant une sortie longue (< 48 h) | Si la note l'indique : stimulus `strength_heavy` → limitation de charge (RIR +2, reps plus hautes) ; le principal reste, dosé plus bas | Supprimer le squat de sa propre initiative |
| Grip lourd avant farmers / sled (I4) | C4 pénalise `cost.grip = 3` ; tirages avec appui ou machine ; pas de `carry` | Toucher à la séance HYROX |
| Gros volume quadriceps avant une séance HYROX (`wall balls`, fentes) | Volume quadriceps au plancher de maintien ; `hip_dominant` et haut du corps prioritaires dans les emplacements optionnels | — |
| Haut du corps après une course facile | Aucune adaptation nécessaire (structures différentes) ; séance normale | Dégrader sans raison |
| Voisins inconnus (`DATA.WEEK_CONTEXT_UNKNOWN`) | Hypothèse prudente sur le bas du corps (§2) | — |

La demande réelle de la séance (profil de demande par structure) est **dérivée par le CORE** à partir des exercices et doses (`deriveDemandProfile`), et revérifiée par la récupération minimale L1 (validation A3). Le moteur fournit les doses et les bandes d'intensité.

**VALIDATION** : métamorphique « une note restrictive supplémentaire ne rend jamais la séance plus exigeante » ; L1 revalidé par le CORE.
**FAILURE** : contexte incompatible avec l'objet de l'archétype ⇒ `PLAN.CONTEXT_INCOMPATIBLE` (06 §20).

## 15. Durée

**Erreur empêchée** : générer 85 minutes pour une séance de 60, puis laisser le CORE couper au hasard. Le moteur construit **dans le budget** ; le `fitDuration` du CORE reste le filet de sécurité et l'autorité finale.

### 15.1 Estimation par prescription

Tous les termes existent déjà dans le DurationEngine du CORE (estimation par composants) :

| Terme | Source |
|-------|--------|
| Temps d'exécution | reps × `secondsPerRep` (catalogue), ou temps / distance selon la prescription |
| Repos | `restAfterS` × facteurs de dépassement (ruleset) |
| Installation | `setupS` de l'exercice |
| Changements de charge | `loadChangeS` |
| Transitions | table des classes de transition (`transitionClass`) |
| Montées en charge | séries `rampup` (§11) |
| Échauffement / retour au calme | blocs à durée minimale (`minDurationS`) |

### 15.2 Construction dans le budget

1. Budget = durée cible **T** (intention) ; contrainte : p90 ≤ temps disponible **A** (HARD, CORE).
2. On place les emplacements **requis** avec leur dosage de base, montées en charge comprises. Si leur p50 dépasse la borne haute de tolérance alors que M6 est déjà au plancher ⇒ `DURATION.TARGET_BELOW_ARCHETYPE_MIN` (le planificateur doit changer d'archétype ; le moteur n'invente pas une séance amputée).
3. On ajoute les emplacements **optionnels** par priorité de besoin (02 §6.3), **tant que** p50 ≤ borne haute et p90 ≤ A.
4. S'il reste de l'écart sous la borne basse : on **n'ajoute rien pour remplir** (spec 07 §3.3). La séance est plus courte et le dit (`DURATION.SHORTER_ACCEPTED`, émis par le CORE).
5. On déclare les **leviers** de l'archétype (ordre de la fiche), pour que le CORE puisse ajuster s'il le faut.

L'estimation utilise la **fonction pure du CORE** (`estimateDuration`), jamais une estimation parallèle : prévu et contrôlé coïncident.

**Objectif mesurable** : sur les profils golden et en longitudinal, part des séances pour lesquelles le CORE applique au moins un levier ≤ seuil (paramètre de test). Un taux élevé signale un budget mal construit (observabilité, doc 10).

**VALIDATION** : p90 ≤ A (CORE) ; aucun ajout artificiel (propriété) ; métamorphique « un peu plus de temps ne dégrade pas la séance ».
**FAILURE** : `DURATION.TARGET_BELOW_ARCHETYPE_MIN` ⇒ aucune proposition.
