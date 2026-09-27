# 02 — Archétypes et emplacements

## 6. Système d'emplacements (slots)

Un emplacement = **un besoin de mouvement × un rôle**. Il exprime ce que la séance doit obtenir, jamais un exercice.

### 6.1 Besoins de mouvement (11)

Les besoins de la liste proposée ont été discutés un par un. « Primary strength », « secondary compound » et « accessory » ne sont **pas** des besoins mais des **rôles** (§6.2). « Unilateral » devient `single_leg`, un besoin du bas du corps. Le haut du corps unilatéral n'est pas un besoin distinct : c'est une modalité d'exécution des besoins de poussée et de tirage.

| Besoin | Exigence (`SlotRequirement` du CORE) | Pourquoi il est nécessaire |
|--------|--------------------------------------|----------------------------|
| `knee_dominant` | `pattern: squat`, `compound: true` | Force et masse des quadriceps ; base de la plupart des objectifs |
| `hip_dominant` | `pattern: hinge`, `compound: true` | Chaîne postérieure ; soutien course et HYROX |
| `single_leg` | `pattern: lunge` | Soutien course et HYROX, équilibre gauche / droite, moindre charge axiale |
| `push_horizontal` | `pattern: push_horizontal` | Pectoraux, triceps, épaules |
| `push_vertical` | `pattern: push_vertical` | Épaules ; soutien cross-training |
| `pull_horizontal` | `pattern: pull_horizontal` | Dos, équilibre poussée / tirage |
| `pull_vertical` | `pattern: pull_vertical` | Grand dorsal ; soutien cross-training (préparation gymnique) |
| `trunk` | `region: core`, `movementTypes: [strength, isometric]` | Tronc (anti-extension, anti-rotation) ; robustesse |
| `carry` | `pattern: carry` | Soutien HYROX, grip, tronc |
| `isolation_upper` | `pattern: isolation_upper` | Hypertrophie des bras, des épaules et des pectoraux ; volume à faible coût systémique |
| `isolation_lower` | `pattern: isolation_lower` | Ischio-jambiers (flexion), quadriceps (extension), mollets ; soutien course (mollets) |

Hors liste, et pourquoi :
- `olympic` : hors périmètre ;
- `jumping` / pliométrie : relève de l'entraînement de puissance du cross-training ou de la course ; exposition E4 à gérer ailleurs ;
- `rotation` dynamique : couvert par `trunk` en V1.

### 6.2 Rôles (3)

| Rôle | Signification | Préférence de modalité portée par l'emplacement | Ancrable |
|------|---------------|--------------------------------------------------|----------|
| `primary` | Le mouvement qui porte l'objectif de la séance (force ou volume principal) | `load_ceiling` pour l'objectif `strength` ; neutre pour les autres | Oui, par défaut |
| `secondary` | Composé complémentaire | Neutre | Oui, sur option (paramètre de l'archétype) |
| `accessory` | Volume ciblé, faible coût systémique ou technique | `stability` | Non en V1 (double progression suivie par exercice, sans répétition prévue) |

La préférence de modalité est un **libellé ordinal** (`load_ceiling`, `stability`, `specificity`), jamais un bonus chiffré (§16).

### 6.3 Instanciation

Un emplacement d'archétype déclare :
- son besoin et son rôle ;
- son nombre d'exercices (`count.min`, `count.max`) ;
- `minFamilies` (CC1) ;
- son statut : `required`, `optional` ou `conditional`, avec une condition sur l'objectif, le stimulus ou le contexte.

La **priorité d'un besoin** dépend de l'objectif (table G2 `strength.needs.priority[goal]`, et `strength.support.emphasis[supportFor]` pour le soutien). Elle sert à trois choses :
- l'ordre de la sélection gloutonne ;
- l'ordre d'ajout des emplacements optionnels dans le budget de durée ;
- le calcul de B1.

## 5. Archétypes V1 (4)

### 5.1 Analyse des candidats

| Candidat | Conservé ? | Raison |
|----------|-----------|--------|
| Full body | **Oui** | Indispensable de 1 à 3 séances par semaine, au débutant et au soutien |
| Upper | **Oui** | Base de la répartition haut / bas pour 4 séances |
| Lower | **Oui** | Idem |
| Push / Pull | **Non** | Utile à 5 ou 6 séances par semaine (hors V1). À 4 séances, haut / bas ×2 couvre le même besoin, avec une fréquence de 2 par groupe |
| Upper/lower complémentaires | **Non comme archétype** | Ce sont deux occurrences de upper et de lower, avec des stimulus différents (lourd / volume) : décision du planificateur |
| Strength focused / hypertrophy focused | **Non comme archétype** | C'est le **stimulus** de l'intention (`strength_heavy`, `strength_volume`, `strength_general`) qui change le dosage, pas la structure |
| Hybrid support | **Oui** | Structure réellement différente : moins d'emplacements, `single_leg`, `carry` et `trunk` prioritaires, volume du bas du corps limité, durée courte |

Les **stimulus** de l'intention (identifiants de données, liste du ruleset `strength.stimuli`) : `strength_heavy`, `strength_volume`, `strength_general` et `strength_support`. Ils fixent le profil de dosage (§9) et la répartition énergétique de l'empreinte.

### 5.2 Fiches

Durées : les fourchettes sont des **ordres de grandeur provisoires** pour la revue (`duration.minS` / `maxS` du schéma = paramètres de contenu G2). Le minimum est la durée sous laquelle l'archétype perd son objet ; en dessous, c'est au planificateur de changer d'archétype.

#### A1 — `str_full_body`

| Rubrique | Contenu |
|----------|---------|
| Objectif | Couvrir le bas et le haut du corps en une séance |
| Utilisation | 1 à 3 séances par semaine ; débutant ; `general` ; `strength` / `hypertrophy` à 2–3 séances ; séance courte (30 min) |
| Ne pas utiliser | 4 séances par semaine en hypertrophie (fréquence et volume par séance trop élevés) ; veille d'une séance clé de course ou HYROX si le bas du corps ne peut pas être allégé (utiliser A4) |
| Blocs | `warmup` → `strength` (principal) → `strength` (secondaire) → `accessory` → `cooldown` |
| Emplacements requis | 1 principal `knee_dominant` **ou** `hip_dominant` (alternance d'une séance à l'autre décidée par l'accent de la semaine, paramètre) ; 1 `push_*` ; 1 `pull_*` |
| Emplacements optionnels | Le second besoin du bas du corps (secondaire) ; `single_leg` ; `isolation_upper` ; `trunk` |
| Durée | Environ 30–75 min (min, max : G2) |
| Contraintes | Au plus 1 exercice `technical ≥ 2` pour un novice (G1, STR-V6) ; poussée et tirage présents |
| Leviers (ordre) | `drop_optional_block` (tronc/isolation si optionnels) → `superset_accessories` → `reduce_sets` (accessoires) → `drop_accessory` (≥ 1) → `reduce_main_volume` (dernier recours) |
| CC1 | Chaque emplacement requis : ≥ N candidats et ≥ 2 familles (N = `coverage.cc1.minCandidates`) dans chaque preset faisable |
| Presets | Faisable : salle, maison équipée, haltères + banc, box. Poids du corps : **faisable en mode dégradé** si le catalogue couvre `knee_dominant` et `pull_*` (sinon déclaré infaisable ; décision de catalogue D-S3) |

#### A2 — `str_upper`

| Rubrique | Contenu |
|----------|---------|
| Objectif | Poussées et tirages du haut du corps, avec un volume suffisant pour l'hypertrophie ou la force |
| Utilisation | 3 à 4 séances par semaine (répartition haut / bas) ; soutien cross-training (haut du corps) ; lendemain d'une séance clé du bas du corps (course ou HYROX) |
| Ne pas utiliser | Programme à 1–2 séances par semaine (le bas du corps ne serait pas couvert) |
| Blocs | `warmup` → `strength` (principal) → `strength` (secondaire) → `accessory` → `cooldown` |
| Emplacements requis | Principal `push_horizontal` ou `push_vertical` ; secondaire `pull_vertical` ou `pull_horizontal` (le tirage opposé à la poussée principale est prioritaire) |
| Emplacements optionnels | Le second besoin de poussée et le second de tirage ; `isolation_upper` (1 à 2) ; `trunk` ; `carry` (si `supportFor = hybrid_race`) |
| Durée | Environ 35–80 min |
| Contraintes | Rapport poussée / tirage sur la semaine suivi en B5 (et non en HARD) |
| Leviers | `superset_accessories` → `reduce_sets` → `drop_accessory` → `reduce_main_volume` |
| CC1 / presets | Tous les presets chargés ; poids du corps en mode dégradé (poussée : pompes et variantes ; tirage : barre de traction requise, sinon infaisable) |

#### A3 — `str_lower`

| Rubrique | Contenu |
|----------|---------|
| Objectif | Force ou volume du bas du corps |
| Utilisation | 3 à 4 séances par semaine (répartition haut / bas) ; `strength`, `hypertrophy` |
| Ne pas utiliser | Dans les 24 h avant une séance clé de course ou HYROX, ou en affûtage (I1, I5, I7 : c'est le planificateur qui l'évite). Si l'intention l'impose malgré la note `avoid_high_lower_body` : le moteur abaisse la demande (§14), et sinon `PLAN.CONTEXT_INCOMPATIBLE` |
| Blocs | `warmup` → `strength` (principal) → `strength` (secondaire) → `accessory` → `cooldown` |
| Emplacements requis | Principal `knee_dominant` ou `hip_dominant` ; secondaire : l'autre besoin |
| Emplacements optionnels | `single_leg` ; `isolation_lower` (1 à 2 : flexion du genou, mollets) ; `trunk` |
| Durée | Environ 40–80 min |
| Contraintes | L4 (quadriceps, fessiers, ischio-jambiers par séance) ; charge axiale : au plus un exercice `axialLoad = 3` par séance (G2 à relire) |
| Leviers | `reduce_sets` (accessoires) → `drop_accessory` → `reduce_main_volume` |
| CC1 / presets | Salle, maison équipée : faisable. Haltères seuls : faisable (goblet, split squat, RDL haltères ; limite de charge signalée par `loadCeiling`). Poids du corps : **déclaré infaisable** pour `strength` (pas de progression de charge), faisable pour `general` (décision D-S3) |

#### A4 — `str_support`

| Rubrique | Contenu |
|----------|---------|
| Objectif | Robustesse et force de base au service d'une autre discipline, au coût minimal pour elle |
| Utilisation | `support` (course, HYROX, cross-training) ; 1 à 3 séances par semaine ; séances courtes |
| Ne pas utiliser | Comme séance principale d'un objectif `strength` ou `hypertrophy` |
| Blocs | `warmup` → `strength` (principal) → `accessory` (circuit ou supersets autorisés) → `cooldown` |
| Emplacements requis | 1 principal choisi par la table d'accent (`hip_dominant` ou `single_leg` pour la course ; `single_leg` ou `knee_dominant` pour HYROX ; `knee_dominant` ou `hip_dominant` pour le cross-training) ; 1 `pull_*` ou `push_*` |
| Emplacements optionnels | `single_leg`, `trunk`, `carry` (priorité selon l'accent), `isolation_lower` (mollets, course) |
| Durée | Environ 25–50 min |
| Contraintes | Volume du bas du corps limité par la table d'accent et le contexte de semaine ; excentrique lourd évité avant une séance de qualité (via le choix d'exercice et le RIR) ; séances clés de l'autre discipline protégées (la note du planificateur prime) |
| Leviers | `superset_accessories` → `drop_accessory` → `reduce_sets` → `reduce_main_volume` |
| CC1 / presets | Tous les presets, poids du corps compris (mode dégradé documenté) |

### 5.3 Pourquoi ce n'est pas une séance figée

L'archétype fixe des **besoins**, des rôles, des bornes et des leviers. Ce qui varie :
- l'exercice de chaque emplacement (§7) ;
- le dosage (objectif × rôle × phase × niveau × contexte, §9) ;
- les emplacements optionnels réellement présents (budget, contexte, priorité des besoins) ;
- l'alternance des besoins principaux entre les occurrences.
