# 08 — Tests, profils golden, simulations longitudinales

Tests conçus **avant** l'implémentation. Ils utilisent le banc du CORE : graine et instant injectés, goldens relus (`UPDATE_GOLDEN=1`), fast-check, harnais longitudinal, et un ruleset **de test** aux valeurs provisoires qui n'existe que dans les tests.

## 23. Tests

### 23.1 Tests unitaires (une décision locale chacun)

| Zone | Cas |
|------|-----|
| P1 contexte | Contexte valide accepté ; champ inconnu refusé ; incohérence d'intention ⇒ `TECHNICAL.*` ; références contradictoires ⇒ `STATE.REFERENCE_CONFLICT` et confiance −1 |
| P2 archétype | Niveau non admis ; preset déclaré infaisable ⇒ `PLAN.ARCHETYPE_NOT_APPLICABLE` |
| P3 besoins | Priorité par objectif ; note `avoid_high_lower_body` ⇒ besoin du bas du corps abaissé ; besoin principal exclu ⇒ `PLAN.CONTEXT_INCOMPATIBLE` |
| F1–F9 filtres | Un cas de rejet par filtre, avec compteur par raison |
| C1–C8 tri | Pour chaque critère : deux candidats identiques sauf sur ce critère ⇒ le critère décide, et le critère suivant ne départage qu'une égalité |
| Glouton | Pas deux fois la même famille ; second `axialLoad = 3` rétrogradé ; station réutilisée |
| Alternatives | 2 à 3 alternatives, toutes admissibles |
| Ancres | Création (proposée, non déclarée) ; répétition seulement si l'intention existe ; rotation à la frontière ; suspension pour douleur ; substitution sans mise à jour de la track |
| Dosage | Profil de base par stimulus × rôle × classe ; chaque modificateur M1–M6 isolément ; contradiction ⇒ prudence ; M3 ne dépasse jamais le haut de la plage |
| Charge | R1–R6 ⇒ confiance attendue ; mode par confiance ; %1RM seulement si `high` et reps valides ; arrondi réalisable ; plafond matériel ⇒ `DOSE.LOAD.CAP_REACHED` ; machine sans conversion vers la barre |
| Montée | Requise ou non selon les conditions ; nombre de paliers par bande ; charges croissantes, dédoublonnées après arrondi, < charge de travail ; mode RIR ; aucune sur l'isolation |
| Progression | Chaque modèle PM1–PM4 ; chaque classement (`above` … `substituted`) ; `pain` / `safety_pause` ⇒ suspension ; `no_data` ⇒ gel ; plafond par cycle ; décharge ⇒ aucune hausse |
| Volume | Volume restant = cible − réalisé − prévu ; répartition au prorata ; L4 ; soutien au maintien |
| Multisport | Chaque situation du tableau §14 |
| Durée | Construction dans le budget ; emplacements optionnels ajoutés par priorité ; rien ajouté pour remplir ; `DURATION.TARGET_BELOW_ARCHETYPE_MIN` |
| Contrôles STR-V1 à V8 | Un cas conforme et un cas violant pour chacun ; fiche de règle présente |

> **Amendé par l'addendum V1.2** (doc 10 §9 : remplacé par la faisabilité calculée depuis l'équipement réel).

### 23.2 Tests de propriété (fast-check)

Pour tout profil, preset, contexte et graine générés :
1. aucun exercice impossible avec le matériel ;
2. aucune série avec reps ≤ 0, séries ≤ 0, repos < 0 ;
3. aucune charge NaN, infinie, négative, ou nulle alors qu'elle est chargée ;
4. aucun exercice ne satisfait un emplacement qu'il ne couvre pas (`slotAccepts`) ;
5. aucune séance sans bloc principal ;
6. aucune répétition intentionnelle inventée (`repetitionIntents ⊆ intention`) ;
7. aucune restriction ni exclusion violée ;
8. montées en charge < charge de travail et strictement croissantes ;
9. séries difficiles prévues par groupe ≤ L4 ;
10. une seule variable dominante progresse par pas (hors séquence PM2, testée à part) ;
11. déterminisme : même entrée + même graine ⇒ même proposition octet pour octet ;
12. invariance à l'ordre du catalogue et des listes d'entrée ;
13. toute proposition passe l'acceptation du CORE (schéma, intention, provenance) ;
14. p50 proposé ≤ borne haute, sauf `NO_VALID_PROPOSAL`.

### 23.3 Tests métamorphiques

| Relation | Attendu |
|----------|---------|
| Ajouter du matériel | Une séance possible reste possible ; aucun emplacement requis ne perd son candidat |
| Augmenter un peu le temps disponible | Pas de séance moins complète (emplacements requis identiques, optionnels ⊇), sauf départage tracé |
| Retirer une préférence faible | Les emplacements principaux et les ancres d'une séance clé ne changent pas |
| Ajouter une restriction | Jamais plus permissif : candidats ⊆, demande ≤ |
| Ajouter une note restrictive du planificateur | Demande du bas du corps ≤ ; RIR ≥ |
| Passer la lecture de l'état de `normal` à `caution` | Dosage ≤ (séries ≤, RIR ≥) |
| Permuter l'ordre des exercices du catalogue | Proposition identique |
| Renommer les identifiants de preset (équipement identique) | Proposition identique |
| Doubler l'historique d'une séance identique sans intention | L'anti-doublon du CORE se déclenche ; la proposition alternative gagne si B1–B5 sont à égalité |

### 23.4 Tests d'architecture (propres au moteur)

- La sélection ne lit ni `equipment.class` ni `loadModel`, hors faisabilité et arrondi (absence de biais).
- Aucune constante sportive dans le code du moteur (le scanner du CORE est étendu au paquet du moteur).
- Le moteur n'importe ni validateur, ni réparateur, ni pipeline : il propose seulement.
- Aucune lecture de l'horloge ni hasard non injecté.
- Chaque paramètre `strength.*` lu est déclaré et cité dans `parametersUsed`.

## 24. Profils golden

Chaque golden fixe l'entrée complète (profil, `StrengthContext`, intentions de la semaine, ruleset de test, catalogue de test, graine). La sortie est relue humainement puis figée. Les **assertions structurelles** ci-dessous sont vérifiées **en plus** du golden, et restent vraies quand les paramètres G2 changent (un changement de paramètre modifie le golden, jamais les assertions).

| Profil | Entrée | Assertions structurelles |
|--------|--------|--------------------------|
| **S1** | Débutant, 3 séances / semaine, 45 min, haltères + banc | A1 ×3 ; ≤ 1 exercice `technical ≥ 2` par séance, jamais en fin ; RIR ≥ plancher débutant ; PM1 sur le principal ; séries classiques (pas de circuit) ; p90 ≤ 45 min ; aucun test maximal ; mêmes ancres les 3 semaines du golden |
| **S2** | Intermédiaire, 4 / semaine, 60 min, salle complète, hypertrophie | A2 / A3 ×2 ; volume de la semaine par groupe prioritaire dans L5 ; isolation présente ; part des machines et poulies > 0 sur les emplacements `accessory` ; PM2 / PM4 ; p90 ≤ 60 min |
| **S3** | Intermédiaire, 3 musculation + 3 course, objectif 10 km | Soutien course (A4, ou A1 avec `supportFor = running`) ; volume du bas du corps au plancher de maintien ; aucune demande `high` du bas du corps dans les 24 h avant une séance de qualité (contexte fourni) ; mollets et unilatéral présents ; RIR plus élevé sur le bas du corps |
| **S4** | Intermédiaire, 2 musculation + HYROX | A4 avec `supportFor = hybrid_race` ; `carry` et `single_leg` présents selon l'accent ; grip `high` évité la veille d'une séance de sled / farmers ; spécificité des stations **absente** (propriété du moteur HybridRace) |
| **S5** | Avancé, 4 / semaine, 75 min, force + hypertrophie | Stimulus alterné `strength_heavy` / `strength_volume` (décision du planificateur, entrée du golden) ; PM3 sur les principaux avec R1 ; `top_set` seulement si éligible (STR-V7) ; volume dans L5 avancé ; p90 ≤ 75 min |
| **S6** | 30 min, salle complète | A1 ou A4 ; emplacements requis présents ; optionnels absents ; montées en charge conservées ; aucun levier du CORE nécessaire (construction dans le budget) ; sinon `DURATION.TARGET_BELOW_ARCHETYPE_MIN` si l'archétype demandé ne tient pas |
| **S7** | Machines + poulies disponibles, historique biaisé vers les charges libres | Sur 4 semaines : part des modalités par rôle mesurée ; **les charges libres ne sont pas choisies systématiquement** (au moins une machine ou une poulie sur les emplacements `accessory` à stabilité préférée) ; aucun critère de sélection ne porte sur la classe d'équipement (trace de `decidingCriterion`) |

## 25. Simulations longitudinales

Harnais : `runLongitudinal` du CORE, étendu d'un **simulateur d'exécution** déterministe. Ce simulateur réalise les séances selon un profil de réponse paramétré (progression régulière, plateau, séances manquées, douleur, substitution de matériel, feedback incomplet), puis l'AthleteState et les tracks sont reconstruits chaque semaine.

Horizons : **12, 26 et 52 semaines**, pour les profils S1 à S5 et S7.

| Détecteur | Mesure | Échec si (seuils = paramètres de test, décision D-S8) |
|-----------|--------|-----------------------------------------------------|
| Stagnation artificielle | Prescription d'une ancre inchangée sur N semaines sans cause (`no_data`, douleur, décharge) | N dépassé |
| Progression infinie | Capacité estimée vs plafond par cycle | Gain > plafond sur un mésocycle |
| Dérive du volume | Séries par groupe et par semaine vs L5 | Hors plage plus de k semaines consécutives |
| Changements excessifs | Taux de changement d'exercice hors rotation planifiée | Taux > seuil |
| Absence de variation | Même exercice non ancré sur M semaines, ou ancre au-delà de `maxWeeks` | Dépassement |
| Surutilisation d'une modalité | Part d'une classe d'équipement sur un rôle, avec alternatives admissibles disponibles | Part > seuil (S7 en particulier) |
| Ancre éternelle | Durée de vie d'une track | > `strength.anchor.maxWeeks` |
| Décharge ignorée | Semaine de phase `deload` avec dosage non réduit, ou progression pendant la décharge | Une occurrence |
| Répétition accidentelle | Classification `accidental_*` du CORE sur des séances de musculation | Taux > seuil |
| Oscillation après substitution | Alternance A ↔ B sur un emplacement pendant que la cause persiste | Une oscillation |
| Douleur traitée comme un échec | `REGRESSED` après une exposition `pain` / `safety_pause` | Une occurrence |
| Reproductibilité | Empreinte de la simulation (hash) | Différente entre deux exécutions |

Chaque détecteur dispose d'un **auto-test** : un scénario construit pour le déclencher le déclenche effectivement, pour qu'un détecteur ne puisse pas rester silencieux par construction.
