# 07 — J. Système de progression

## 1. Niveaux de progression

1. **Programme** : périodisation (phases, décharges, affûtage, tests).
2. **Semaine** : évolution du volume/intensité d'une semaine à l'autre au sein d'une phase.
3. **Exercice / séance-type** : évolution de la prescription selon les résultats réels (`ProgressionTrack`).
4. **Capacités** : mise à jour des estimations (e1RM, allures, benchmarks) qui alimentent tout le reste.

## 2. Estimations de capacités

| Capacité | Sources | Méthode |
|----------|---------|---------|
| e1RM par exercice ancre | Tests, séries réalisées (reps × charge × RPE) | Formule reconnue (Epley/Brzycki + tables RPE) ; on retient une estimation lissée, pas le max ponctuel |
| Allures course | Test, course, séances de qualité réussies | Modèle VDOT/vitesse critique ; mise à jour prudente (hausse plafonnée par cycle) |
| Cross-training | Benchmarks, WODs scorés, skills acquis | Scores de benchmark + niveau par modalité |
| HYROX | Temps de course, temps par station, simulations | Profil par station + pénalité de course compromise |

Chaque estimation porte une **confiance** (0..1) qui décroît avec le temps et augmente avec des mesures récentes et directes. Une confiance faible ⇒ prescriptions plus prudentes et/ou par RPE, et test planifié.

## 3. Modèles de progression (musculation)

| Modèle | Public | Règle (paramétrable) |
|--------|--------|----------------------|
| Linéaire | Débutant | Toutes les séries réussies à RPE ≤ cible ⇒ +1 incrément (le plus petit pas disponible du matériel) à la séance suivante |
| Double progression | Débutant/intermédiaire, accessoires | Fourchette de reps (ex. 8–12) ; en haut de fourchette sur toutes les séries ⇒ charge ↑, reps ↓ bas de fourchette |
| Autorégulée RPE/RIR + e1RM | Intermédiaire/avancé | Charge du jour = e1RM × %(reps, RPE cible) ; e1RM mis à jour après chaque séance |
| Ondulée / par blocs | Avancé | Variation d'intensité intra-semaine, progression sur le mésocycle |

Règles d'échec :
- 1 séance manquée (reps non atteintes) ⇒ maintien.
- 2 échecs consécutifs ⇒ réduction (ex. −5 à −10 %) ou changement de variante.
- RPE systématiquement > cible + 1 ⇒ recalage de l'e1RM à la baisse.
- Arrondi toujours au pas réel du matériel déclaré (disques de 1,25 kg ? haltères par pas de 2 kg ?).

## 4. Progression course

- Volume hebdo : hausse progressive bornée, avec semaine de décharge toutes les 3–4 semaines (paramètre selon niveau).
- Allures : recalculées **uniquement** sur preuves (test, course, séries de qualité réussies de manière répétée à RPE bas) — une seule bonne séance ne suffit pas.
- Séances de qualité : progression par durée totale à l'allure cible, puis par réduction de récupération, puis par allure.
- Sortie longue : progression par durée, plafonnée en part du volume hebdo.

## 5. Progression cross-training

- Échelles de scaling par mouvement (ex. traction : élastique → négatives → stricte → kipping → chest-to-bar).
- Passage d'un palier : critère objectif (ex. 3 × 5 stricts réalisés) déclaré ou journalisé.
- Charges des mouvements haltéro liées aux e1RM correspondants.
- Benchmarks retestés périodiquement (fenêtre anti-doublon exemptée).

## 6. Progression HYROX

- Allure de course compromise (écart entre allure fraîche et allure après station).
- Stations : progression de charge (sled), de volume (wall balls), de densité (moins de pauses).
- Simulations de plus en plus complètes à l'approche de la course, puis affûtage.

## 7. Tests périodiques

- Planifiés par la macro-planification, typiquement en fin de phase (toutes les 4–6 semaines), dans une semaine allégée.
- Protocoles standardisés dans le catalogue (`BenchmarkWorkout` de type `test`).
- Résultat ⇒ mise à jour des capacités ⇒ recalcul des prescriptions futures (révision du plan, explications à l'utilisateur).
- Test raté / non réalisé ⇒ conserver les valeurs antérieures (confiance diminuée), jamais de valeur inventée.

## 8. Réponse à la performance

| Signal | Réponse |
|--------|---------|
| Nettement mieux que prévu (plusieurs séances) | Hausse de la capacité estimée, dans la limite du plafond de progression par cycle |
| Moins bien que prévu, ponctuel | Aucun changement (bruit), noté |
| Moins bien que prévu, répété | Baisse d'estimation ou allègement, recherche de cause (fatigue, sommeil déclaré, séances manquées) |
| RPE de séance très élevé répété | Signal de fatigue ⇒ module d'adaptation (doc 08) |
