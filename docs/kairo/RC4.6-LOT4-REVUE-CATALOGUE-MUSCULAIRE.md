# RC4.6 — Lot 4 : revue du catalogue musculaire (biceps, triceps, deltoïdes postérieurs)

**Statut :** revue documentaire et calculs seulement. **Aucun coefficient, aucune attribution, aucun seuil modifié.** Les propositions ci-dessous sont **à faire valider par un professionnel qualifié** (préparateur physique ou kinésithérapeute du sport), avant toute décision.

- **Données :** catalogue de test Strength actuel (`0.3.0-strength-test-f6`, statut `draft`, non relu). Séances du banc RC4.6 avec le contenu courant (V3 + L1b-4), 8 profils, 6 semaines.
- **Comptage actuel** (`strength.volume`) : un groupe reçoit 1 série si l'un de ses muscles est **principal** de l'exercice, 0,5 s'il n'est que **secondaire** (`secondaryWeight`).

## 1. Incohérences relevées

| # | Muscle | Constat | Exercices concernés |
|---|---|---|---|
| I1 | **Biceps** | **Principal** au tirage vertical, **secondaire** au rowing. Le rôle mécanique est pourtant comparable : flexion du coude, synergiste du tirage. | Principal : tractions, tractions assistées, tirage vertical. Secondaire : rowing poulie, machine, haltère. |
| I2 | **Triceps** | **Principal** sur tous les développés. Il y joue le même rôle de synergiste (extension du coude) que le biceps au rowing, compté secondaire. | Développé couché, couché haltères, presse pectoraux, pompes, pompes inclinées, développé épaules (haltères, barre, machine). |
| I3 | **Deltoïdes postérieurs** | Secondaire seulement au **rowing poulie**. **Absent** du rowing machine, du rowing haltère et des tirages verticaux, malgré l'extension horizontale ou l'extension d'épaule. | Rowing machine, rowing haltère, tractions, tirage vertical. |
| I4 | **Deltoïdes postérieurs** | **Principal** d'un exercice de **mobilité** (mobilité d'épaule). Sans effet sur les volumes (prescription en temps, aucune série), mais attribution trompeuse. | Mobilité d'épaule. |
| I5 | **Groupe « épaules »** | Il additionne trois chefs aux rôles distincts. Le total masque un déséquilibre : antérieurs ≈ 10–11 séries par semaine (développés), postérieurs ≈ 2–5, latéraux ≈ 3–5. | Tous profils (tableau § 3). |
| I6 | **Gainage** (abdominaux, lombaires) | Comptés secondaires (0,5) sur des polyarticulaires où ils stabilisent sans produire le mouvement. Cela alimente le volume « tronc ». | Squat (lombaires), soulevé de terre roumain (lombaires), développé barre (abdominaux), pompes (abdominaux), squat goblet (abdominaux). |

## 2. Convention biomécanique proposée (à valider)

**Trois rôles** par exercice et par muscle, et un **volume hypertrophique estimé** = séries de travail × coefficient du rôle :

| Rôle | Définition | Coefficient proposé |
|---|---|---|
| **Moteur principal** | Produit le mouvement de l'articulation principale, sur toute l'amplitude ; c'est lui que l'exercice vise. | 1 |
| **Synergiste** | Contribue au mouvement sur une articulation secondaire (ex. coude dans un développé ou un tirage), sous charge réelle mais souvent moindre. | 0,5 |
| **Stabilisateur** | Maintient une posture (gainage, préhension, adducteurs) sans produire le mouvement. | 0 pour l'hypertrophie, information conservée pour la fatigue et l'interférence |

**Application aux exercices de poussée et de tirage :**

| Exercice | Moteurs (1) | Synergistes (0,5) | Stabilisateurs (0) |
|---|---|---|---|
| Développés horizontaux (couché, haltères, machine, pompes) | Pectoraux | Triceps, deltoïdes antérieurs | Abdominaux (pompes) |
| Développés verticaux (haltères, barre, machine) | Deltoïdes antérieurs | Triceps, deltoïdes latéraux | Abdominaux (barre) |
| Tirages verticaux (tractions, tirage vertical) | Grand dorsal | Biceps, trapèzes et rhomboïdes, deltoïdes postérieurs | Préhension |
| Rowings (poulie, machine, haltère) | Trapèzes moyens et rhomboïdes, grand dorsal | Biceps, deltoïdes postérieurs | Préhension, lombaires (haltère) |
| Pec deck, écarté | Pectoraux | Deltoïdes antérieurs | — |
| Curl, extension triceps, élévations latérales | Biceps, triceps, deltoïdes latéraux | — | Préhension (curl) |

**Justification biomécanique et repères de la littérature** (références à faire confirmer par le professionnel) :
- **Développés :** l'extension du coude est nécessaire, mais le mouvement est piloté par l'adduction horizontale (pectoraux) ou la flexion (deltoïde antérieur) de l'épaule. La longue portion du triceps, biarticulaire, est peu allongée quand l'épaule est fléchie.
- **Tirages :** l'extension et l'adduction d'épaule (grand dorsal), ou la rétraction scapulaire (trapèzes, rhomboïdes), pilotent le mouvement. La flexion du coude (biceps, brachial) accompagne.
- **Bras et polyarticulaires :** le travail polyarticulaire fait progresser les bras, mais en général moins qu'un travail direct. Chez le débutant, ajouter des isolations change peu le résultat (Gentil et coll., 2013).
- **Comptage fractionnel :** des méta-régressions dose-réponse récentes trouvent un meilleur ajustement quand les séries « indirectes » comptent environ pour moitié (Pelland et coll., 2024, prépublication).
- **Stabilisateurs :** l'activité de gainage ne correspond pas à une stimulation hypertrophique comparable à un travail dynamique. Le coefficient 0 est **une hypothèse à valider**, ainsi que le maintien d'un travail de tronc dédié.

## 3. Conséquences sur les indicateurs (séances actuelles, séries par semaine)

Conventions comparées :
- **A** — actuelle ;
- **B** — triceps des développés et biceps des tirages verticaux en synergistes (I1, I2) ;
- **B + R** — B, plus deltoïdes postérieurs synergistes sur tous les rowings (I3, partiel) ;
- **P** — convention complète du § 2 : synergistes, deltoïdes postérieurs sur tous les tirages, stabilisateurs à 0.

↓ / ↑ = semaines sous le plancher / au-dessus de la borne haute. Bornes : épaules 8–16, bras 6–14, tronc 4–10. Pectoraux et dos sont identiques dans toutes les conventions.

| Profil | Convention | Épaules (groupe) | dont antérieurs / latéraux / postérieurs (par chef) | Bras | Tronc |
|---|---|---|---|---|---|
| P1 | A actuelle | 13,6 | 10,8 / 2,7 / 2,1 | 16,9 ↑6 | 7,8 |
| P1 | B synergistes bras | 13,6 | 10,8 / 2,7 / 2,1 | 9,8 | 7,8 |
| P1 | B + deltoïdes postérieurs (rowings) | 14,2 ↑1 | 10,8 / 2,7 / 2,8 | 9,8 | 7,8 |
| P1 | P complète (synergistes + stabilisateurs 0) | 16,8 ↑3 | 10,8 / 2,7 / 5,2 | 9,8 | 3,5 ↓5 |
| P1b | A actuelle | 15,2 | 10,2 / 5,2 / 1,8 | 18,2 ↑6 | 9,3 ↑2 |
| P1b | B synergistes bras | 15,2 | 10,2 / 5,2 / 1,8 | 10,2 | 9,3 ↑2 |
| P1b | B + deltoïdes postérieurs (rowings) | 15,4 ↑1 | 10,2 / 5,2 / 2,1 | 10,2 | 9,3 ↑2 |
| P1b | P complète (synergistes + stabilisateurs 0) | 18,4 ↑6 | 10,2 / 5,2 / 5,1 | 10,2 | 4,2 ↓4 |
| P2 | A actuelle | 13,9 | 10,8 / 2,7 / 2,4 | 16,9 ↑6 | 7,6 |
| P2 | B synergistes bras | 13,9 | 10,8 / 2,7 / 2,4 | 9,8 | 7,6 |
| P2 | B + deltoïdes postérieurs (rowings) | 14,2 | 10,8 / 2,7 / 2,8 | 9,8 | 7,6 |
| P2 | P complète (synergistes + stabilisateurs 0) | 16,8 ↑3 | 10,8 / 2,7 / 5,2 | 9,8 | 3,0 ↓6 |
| P3 | A actuelle | 13,3 | 10,6 / 2,7 / 2,1 | 16,4 ↑6 | 7,8 |
| P3 | B synergistes bras | 13,3 | 10,6 / 2,7 / 2,1 | 9,5 | 7,8 |
| P3 | B + deltoïdes postérieurs (rowings) | 13,8 | 10,6 / 2,7 / 2,6 | 9,5 | 7,8 |
| P3 | P complète (synergistes + stabilisateurs 0) | 16,2 ↑2 | 10,6 / 2,7 / 4,9 | 9,5 | 3,5 ↓4 |
| P5 | A actuelle | 14,0 | 11,1 / 2,9 / 2,2 | 16,8 ↑6 | 9,1 |
| P5 | B synergistes bras | 14,0 | 11,1 / 2,9 / 2,2 | 10,0 | 9,1 |
| P5 | B + deltoïdes postérieurs (rowings) | 15,0 | 11,1 / 2,9 / 3,2 | 10,0 | 9,1 |
| P5 | P complète (synergistes + stabilisateurs 0) | 17,2 ↑4 | 11,1 / 2,9 / 5,4 | 10,0 | 5,7 |
| S3 | A actuelle | 14,1 | 10,9 / 2,9 / 2,5 | 16,5 ↑6 | 7,1 |
| S3 | B synergistes bras | 14,1 | 10,9 / 2,9 / 2,5 | 9,7 | 7,1 |
| S3 | B + deltoïdes postérieurs (rowings) | 14,4 | 10,9 / 2,9 / 2,8 | 9,7 | 7,1 |
| S3 | P complète (synergistes + stabilisateurs 0) | 16,7 ↑4 | 10,9 / 2,9 / 5,1 | 9,7 | 2,5 ↓6 |
| S4 | A actuelle | 15,2 | 10,2 / 5,2 / 1,8 | 18,2 ↑6 | 9,0 |
| S4 | B synergistes bras | 15,2 | 10,2 / 5,2 / 1,8 | 10,2 | 9,0 |
| S4 | B + deltoïdes postérieurs (rowings) | 15,4 ↑1 | 10,2 / 5,2 / 2,1 | 10,2 | 9,0 |
| S4 | P complète (synergistes + stabilisateurs 0) | 18,4 ↑6 | 10,2 / 5,2 / 5,1 | 10,2 | 3,2 ↓5 |

**Lecture :**
- **B** règle l'alerte des bras sans rien déplacer : 16–18 séries (au-dessus de la borne haute 6 semaines sur 6) → **9,5–10,2**, dans la plage. Épaules et tronc sont inchangés.
- **B + R** est quasi neutre : épaules +0,2 à +0,7, 1 semaine au-dessus de la borne haute dans quelques profils. C'est la correction de cohérence I3 sur les rowings.
- **P** **déplace** les alertes au lieu de les résoudre :
  - les **épaules** passent au-dessus de la borne haute, car les deltoïdes postérieurs synergistes des tirages verticaux s'ajoutent à un groupe déjà nourri par les antérieurs ;
  - le **tronc** passe sous le plancher (2,5–5,7 séries), car le gainage des polyarticulaires n'est plus compté.
- Une convention P cohérente demande donc **en même temps** :
  - de **séparer le groupe épaules par chef** (antérieur, latéral, postérieur), avec des cibles propres ;
  - de revoir la place d'un travail de tronc dédié.
- Le détail par chef confirme I5 : les **antérieurs** reçoivent 10–11 séries par semaine, les **postérieurs** 2–5. Les rowings et le tirage complémentaire (L1b-4) aident peu ce chef, faute d'attribution.

**Effet attendu sur la sélection, et pas seulement sur les indicateurs :**
- La règle « un ajout facultatif dont tous les groupes principaux dépassent la borne haute est omis » écarte aujourd'hui l'extension triceps et les curls (bras au-dessus de 14).
- Avec B, les bras passent sous la borne haute : ces isolations **redeviendraient éligibles**. Les programmes changeraient (plus d'isolations de bras, moins de temps pour d'autres accessoires).
- Le critère de sélection par volume se fonde sur les groupes **principaux** : changer les attributions change donc aussi les choix d'exercices.
- Toute convention retenue doit passer par un lot dédié : contenu de catalogue versionné, banc avant / après, relecture des anciennes semaines.

## 4. Recommandation

1. **Faire valider par un professionnel qualifié :**
   - la grille du § 2 (rôles par exercice) ;
   - le coefficient synergiste de 0,5 ;
   - le traitement des stabilisateurs : 0, ou une valeur faible.
2. **Si la validation est obtenue**, ordre proposé, chaque étape en lot séparé avec banc avant / après :
   - **(a) B + R** : cohérence biceps / triceps et deltoïdes postérieurs des rowings. Effet principal : alerte des bras levée. Mesurer l'effet sur la sélection des isolations de bras.
   - **(b) Séparation du groupe épaules par chef**, avec des cibles propres à valider. Préalable à toute extension aux tirages verticaux.
   - **(c) Stabilisateurs** : seulement avec une décision explicite sur le travail de tronc dédié.
3. **Correctif de forme** (I4), sans effet sur les volumes : retirer le rôle « principal » de la mobilité d'épaule. À valider avec le reste.
4. **Ne rien modifier avant cette validation** : ni coefficients, ni attributions, ni seuils.

**Questions à poser au professionnel :**
- Le triceps des développés et le biceps des tirages relèvent-ils du synergiste à 0,5 ? Un coefficient différent par exercice est-il justifié (par exemple 0,5 en développé couché, plus élevé en dips) ?
- Les deltoïdes postérieurs doivent-ils être comptés sur les tirages verticaux, ou seulement sur les rowings ?
- Quelles cibles hebdomadaires par chef de l'épaule ?
- Le gainage induit par les polyarticulaires doit-il compter dans le volume de tronc pour l'hypertrophie ?
