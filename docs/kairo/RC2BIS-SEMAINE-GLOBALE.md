# KAIRO RC2 bis — Optimisation globale de la semaine (étude)

**Branche d'étude :** `claude/kairo-rc2bis-week-study`, issue de `claude/kairo-rc2-planner-study` (`43e8172`).

- **RC1 et RC2 sont intactes :** aucun commit sur `claude/kairo-rc1` ni sur `claude/kairo-rc2-planner-study`.
- **Rien n'est engagé :** aucune fusion, aucun déploiement, aucune règle activée ni approuvée.
- **Aucune politique sportive n'est implémentée dans l'application.**

> Des tests verts ne prouvent pas la qualité sportive. Les planchers de volume, les fenêtres G4 / M3 et la matrice
> d'interférence sont **provisoires** ; toutes les variantes ci-dessous sont **exploratoires** et ne valent pas
> recommandation de seuil.

Données et relance :
- `packages/app-core/tests/rc2bis/__reports__/rc2bis-study.json` : métriques brutes, fronts complets ;
- `rc2bis-semaine.md` : tous les tableaux (matrices, fronts par cas, variantes, simulations) ;
- relance : `RC2BIS_STUDY=1 npx vitest run packages/app-core/tests/rc2bis/rc2bis-study.test.ts` (≈ 12 min).

## 0. Méthode

### 0.1 Capacité d'étude et preuve d'inertie

Une seule capacité est ajoutée : l'**organisation imposée** d'une semaine (`pins`).

- **Planificateur** (`PlannerInput.pins`) : chaque épingle associe une séance à un jour, avec en option `minutes`, la
  part explicite d'une journée double.
- **Application** (`PlannerEnvironment.studyPins`) : relais de ces épingles. `beta0Environment()` ne la fournit jamais.

Garanties, toutes testées dans `rc2bis-inert.test.ts`, inclus dans `pnpm check` :

| test | garantie |
|---|---|
| I-1 | L'environnement de l'application ne porte aucune organisation imposée. |
| I-2 | Organisation absente ou vide ⇒ semaine persistée **identique octet pour octet** à RC1. |
| I-3 | RC1 sur 4 semaines est **identique** aux mesures publiées par l'étude RC2 (`rc2-study.json`). |
| I-4 | Une organisation égale au placement RC1 reproduit les mêmes jours. |
| F-1 | Une séance non épinglée ne prend **jamais** un jour réservé ; chaque séance épinglée et placée est sur son jour. |
| C-0 | Avec la règle G4 actuelle, une journée double est refusée pour la seconde séance (conflit tracé, pas de fusion). |
| C-1 | Sans part explicite, une seconde séance n'est **jamais** placée sur un jour occupé. |
| C-2 | Journée double explicite : deux séances **distinctes**, chacune dans sa part, total ≤ disponibilité du jour. |
| C-3 | Une part trop courte **refuse** la séance (`FEASIBILITY.TIME_EXCEEDED`) au lieu de retirer des exercices. |
| C-4 | Limite documentée : la part n'est pas persistée (voir §4). |

Les tests RC2 (`rc2-inert.test.ts`) restent verts.

> **Correction en cours d'étude.** La première exécution a révélé qu'une séance non épinglée (celle qui n'a pas de
> jour) pouvait occuper le jour réservé à une séance épinglée traitée plus tard. Les jours épinglés sont désormais
> réservés (F-1). Cette correction est sans effet en l'absence d'épingles (I-2). Les résultats ci-dessous sont ceux de
> l'exécution corrigée.

### 0.2 Ce qui est comparé

On compare des **organisations hebdomadaires entières**, pas des déplacements isolés.

- **Énumération.** Pour chaque profil et chaque scénario, toutes les organisations **maximales** : autant de séances
  que la capacité le permet. Aucune séance n'est retirée volontairement.
- **Planification.** Chaque organisation passe par le **chemin réel** : moteurs, composition de la rotation A/B/C,
  interférence Strength, matériel, durées, règle G4 de placement.
- **M3 en détection seule.** Aucune action n'est appliquée : l'organisation est mesurée telle qu'elle est, et ses
  conflits sont comptés.
- **Références :**
  - RC1 : placement glouton + M3 Beta 0 avec MOVE / SWAP / RECOMPOSE ;
  - stratégies RC2 : A·P1, D0, DB·P1.

Profils : les configurations RC1, A à E.
- A : prise de masse, Musculation 3× / course 2× / CT 1×.
- B : hybride, course 3× / Musculation 2× / CT 1×.
- C : salle complète.
- D : haltères seulement.
- E : planification de A, avec une récupération dégradée à chaque contrôle. Il ne sert que dans les simulations
  4 semaines.

Scénarios (minutes par jour, du lundi au dimanche) :

| clé | disponibilité | journées doubles |
|---|---|---|
| S5 | 75 · 60 · 0 · 60 · 75 · 90 · 0 (5 jours) | aucune |
| S6 | 75 · 60 · 75 · 60 · 75 · 90 · 0 (profil RC1) | aucune |
| S6D | idem S6 | mer. et sam. **explicitement** (course 35 min + reste pour l'autre séance), règle G4 actuelle |
| S6Dx | idem S6D | idem, avec une règle G4 **exploratoire** « même jour admis » (fenêtre 0 h, jamais approuvée) |
| SIRR | 45 · 0 · 90 · 30 · 0 · 120 · 60 (irrégulier) | aucune |

On ne suppose jamais qu'un jour quelconque accepte deux séances : seuls mercredi et samedi le peuvent, dans S6D et
S6Dx. La paire est **toujours** une course + une séance de force (Musculation ou CT). Deux séances de force le même
jour sont exclues : c'est une décision sportive non prise.

### 0.3 Critères (aucune pondération)

| critère | sens | définition |
|---|---|---|
| séances conservées | ↑ | séances placées sur la semaine 1 |
| courses conservées | ↑ | courses placées |
| courses pré-fatiguées | ↓ | course placée le lendemain d'une séance de force à demande **élevée** genou ou hanche |
| séries bas du corps | ↑ | quadriceps + ischios + mollets + fessiers, séries planifiées (bilan Strength) |
| séries haut du corps | ↑ | pectoraux + dos + épaules |
| séries partagées à J+1 | ↓ | séances de force voisines : somme, par groupe partagé, du minimum des séries |
| séances au-delà du temps alloué | ↓ | durée estimée (p50) supérieure aux minutes du jour ou de la part |
| conflits M3 résiduels | ↓ | conflits détectés par les règles TEST de Beta 0 |

Les contraintes de matériel et de durée sont mesurées par les **séances refusées** (catégorie du moteur). Le résultat
est un **front de Pareto** : une organisation est retenue si aucune autre n'est au moins aussi bonne partout et
strictement meilleure sur au moins un critère. **Aucun score global n'est calculé.**

## 1. Résultat principal

**Une évaluation globale peut améliorer simultanément, mais seulement en partie.** Sur les 20 cas énumérés, profils A
à D × 5 scénarios :

1. **Le point idéal n'est atteint dans aucun cas.** Aucune organisation n'est la meilleure à la fois sur le volume du
   bas du corps, l'espacement de la force et la pré-fatigue des courses. Le compromis est **structurel**, pas un
   défaut de recherche : 2 736 organisations évaluées avec la matrice actuelle, 1 920 de plus pour les variantes.
2. **RC1 est souvent dominée, parfois nettement.** Des organisations sont au moins aussi bonnes partout et
   strictement meilleures quelque part :

   | profil | S5 | S6 | S6Dx | SIRR |
   |---|---|---|---|---|
   | A | 4 / 60 | 1 / 60 | 3 / 244 | 15 / 60 |
   | B | 0 / 60 | **19 / 60** | **66 / 276** | 2 / 60 |
   | C | 4 / 60 | 2 / 60 | 4 / 244 | 15 / 60 |
   | D | 5 / 60 | 0 / 60 | 0 | 1 / 60 |

   Exemples sur la semaine 1 :
   - **B·S6** : *lun C · mar M · mer C · jeu C · ven X · sam M* garde les 6 séances et les 3 courses, sans
     pré-fatigue. Le bas du corps passe de **8 à 18** séries, les conflits M3 de 2 à 0.
   - **A·S6** : *lun C · mar M · mer C · jeu X · ven M · sam M* garde le même volume que RC1 (31 / 28). La
     pré-fatigue des courses passe de 1 à 0, les séries partagées de 29 à 23, les conflits M3 de 1 à 0.
3. **Les stratégies RC2 ne dominent jamais RC1.** A·P1 = RC1 en semaine 1. D0 et DB réduisent les séries partagées
   mais font chuter le bas du corps (A·S6 : 31 → 12). Le front contient de meilleurs compromis que toutes les
   stratégies RC2 testées.
4. **Le critère « volume » récompense l'empilement de la Musculation.** Le moteur Strength **n'allège pas** une séance
   voisine d'une autre séance de Musculation : la récupération intra-discipline est bloquée (`same_discipline_recovery`
   dans `PLAN.WEEK_PRESCRIPTION`). Il n'allège que pour une course ou du CT. Les organisations au **bas du corps
   maximal** groupent donc la Musculation.
   - A·S6 : *lun M · mar M · mer M · jeu X · ven C · sam C* donne 40 séries de bas du corps, mais **48,5 séries
     partagées** à J+1.
   - Le volume **planifié** n'est donc pas un volume **utile** ; ce biais vient du moteur, pas du planificateur.

### 1.1 Compromis non dominés représentatifs (semaine 1, extrait)

Profil A, 6 jours (S6). Les 8 organisations non dominées sont toutes listées dans `rc2bis-semaine.md`.

| organisation | conservées | courses | pré-fatigue | bas | haut | partagées J+1 | conflits M3 |
|---|---|---|---|---|---|---|---|
| RC1 — lun M · mar M · mer X · jeu C · ven M · sam C | 6 | 2 | 1 | 31 | 28 | 29 | 1 |
| ✓ lun C · mar M · mer C · jeu X · ven M · sam M | 6 | 2 | 0 | 31 | 28 | 23 | 0 |
| volume max — lun M · mar M · mer M · jeu X · ven C · sam C | 6 | 2 | 0 | **40** | 28 | 48,5 | 1 |
| espacement max — lun M · mar X · mer C · jeu M · ven C · sam M | 6 | 2 | 0 | 12 | 28 | **1,5** | 0 |
| intermédiaire — lun M · mar X · mer M · jeu M · ven C · sam C | 6 | 2 | 0 | 31 | 28 | 20 | 3 |

Profil B, hybride, 6 jours (S6) :

| organisation | conservées | courses | pré-fatigue | bas | haut | partagées J+1 | conflits M3 |
|---|---|---|---|---|---|---|---|
| RC1 — lun C · mar C · mer X · jeu M · ven C · sam M | 6 | 3 | 0 | 8 | 20,5 | 2,5 | 2 |
| ✓ lun C · mar M · mer C · jeu C · ven X · sam M | 6 | 3 | 0 | **18** | 20,5 | 2,5 | 0 |
| ✓ lun M · mar C · mer C · jeu X · ven C · sam M | 6 | 3 | 0 | 8 | 20,5 | **0** | 0 |
| volume max — lun C · mar C · mer C · jeu X · ven M · sam M | 6 | 3 | 0 | **28** | 20,5 | 29 | 7 |

**Lecture.** Dans chaque profil, le front va de « bas du corps maximal mais Musculation empilée » à « espacement
maximal mais bas du corps divisé par 2 à 3 ». Les organisations qui dominent RC1 se trouvent au milieu.
**Choisir un point du front est une décision sportive** (§6), pas un calcul.

### 1.2 Sur 4 semaines (exécution réelle, contrôles scénarisés RC1)

| cas | représentant | réalisées | course (séances / min) | bas / sem. | partagées J+1 (4 sem.) | violations |
|---|---|---|---|---|---|---|
| A·S6 | RC1 | 23 | 8 / 242 | 30,3 | 107,5 | 0 |
| A·S6 | volume max | 22 | 7 / 212 | 37,8 | 169 | 0 |
| A·S6 | espacement max | 22 | 7 / 212 | 12 | 9,5 | 0 |
| A·S6Dx | espacement max avec journée double (sam C+X) | 23 | 8 / 242 | 21 | 5,5 | 0 |
| B·S6 | RC1 | 22 | 11 / 333 | 8 | 7 | 0 |
| B·S6 | volume max | 23 | 12 / 363 | 26,5 | 87,5 | 0 |
| B·S6 | espacement max | 23 | 11 / 333 | 8 | **0** | 0 |
| B·S6Dx | espacement max avec journée double (mer C+M) | 22 | 11 / 333 | **18** | **0** | 0 |
| E·S6 | RC1 / volume max / espacement max | 24 / 24 / 24 | 8 / 240 | 30,3 / 37 / 12 | 106 / 194,5 / 6 | 0 |

**0 violation de zone exclue dans toutes les simulations**, profils C et E compris (tableau complet dans
`rc2bis-semaine.md`).

Attention aux écarts de courses réalisées, par exemple 7 contre 8 en A : ils viennent du **scénario scripté**. Ce
scénario manque la 5ᵉ séance de la semaine 4 (`k === 4`), dont le sport dépend de l'organisation. Ce ne sont pas des
effets de l'organisation.

Les conflits M3 des simulations ne sont pas comparables à RC1 : l'étude est en détection seule, RC1 résout par
MOVE / SWAP.

## 2. La « règle des 36 h » : ce qui est réellement actif

**La règle binaire de 36 h n'est plus la règle active.** `strength.interference.neighborWindowHours = 36` n'est lue
que si `strength.interference.assessment` est **absente** (sémantique du ruleset 0.2.0). Le ruleset verrouillé
provisoire porte cette matrice ordinale.

Calcul du niveau : demande (élevée = 3) + importance (clé 0, standard −1) + proximité (≤ 12 h +1, ≤ 24 h 0,
≤ 48 h −1, au-delà −2) + impact locomoteur élevé (+1). Le résultat sur la structure genou est le suivant (lecture
directe de `assessNeighborStructure`) :

| voisine | 0 h | 12 h | 24 h | 36 h | 48 h | 72 h |
|---|---|---|---|---|---|---|
| course rôle **clé** | très élevé → allègement complet + signal | idem | idem | élevé → allègement complet | élevé → allègement complet | modéré → RIR seul |
| course **facile** | très élevé → allègement complet + signal | idem | élevé → allègement complet | modéré → RIR seul | modéré → RIR seul | faible → trace |
| CT force + conditionnement | élevé → allègement complet | idem | modéré → RIR seul | faible | faible | aucun |

L'effet réel est donc un allègement **complet** du bas du corps jusqu'à **48 h** après une course clé et jusqu'à
**24 h** après une course facile. C'est ce qui explique les 8 séries de bas du corps de RC1 en B : la Musculation y
est à J+1 d'une course.

### 2.1 Facile / qualité / longue / intensité réelle : non distinguables aujourd'hui

- **Le moteur Running de Beta 0 ne produit que des `running.easy`.** C'est vrai sur 4 semaines, pour les objectifs
  GENERAL / 5K / 10K / semi et les niveaux P_R2 / P_R3, en 2× comme en 3×. Aucune séance de qualité ni sortie longue
  n'existe dans le chemin réel.
- **La demande dérivée ne distingue pas l'intensité.** Une course facile de 30 min est dérivée en demande **élevée**
  genou, hanche, impact et systémique, comme toute course (normalisation TEST des doses). L'intensité réelle et la
  charge du bas du corps ne sont donc **pas observables**.
- **La seule distinction disponible est le rôle.** KEY → importance « clé », EASY → « standard ». Une course de
  rôle KEY reste un archétype facile : la règle traite comme une séance clé une course qui ne l'est pas en intensité.

Conséquence : séparer les seuils par type de course n'a pas de sens tant que la demande ne porte pas l'intensité.
Toute variante actuelle ne peut jouer que sur le rôle, l'impact ou la proximité.

### 2.2 Variantes exploratoires (aucune approuvée)

| variante | contenu | effet sur la matrice |
|---|---|---|
| V1 | importance standard −2 | Course facile : allègement complet seulement ≤ 12 h, RIR seul à 24 h. |
| V2 | sans majoration d'impact | Course clé : allègement complet ≤ 24 h ; course facile : RIR seul à 24 h. |
| V3 | bandes ≤ 12 h / ≤ 36 h, au-delà −2 | Allègement complet prolongé jusqu'à 36 h, nettement relâché à 48 h. |

Sur les organisations, A et B en S6 et S6Dx (tableau §3 de `rc2bis-semaine.md`) :

- **Aucune variante ne débloque, à elle seule, un meilleur bas du corps quand toutes les séances sont conservées.**
  Le maximum reste 40–41 en A et 28 en B, atteint en empilant la Musculation (§1, point 4).
- **V1 et V2 relèvent le bas du corps des organisations espacées.** A·S6, espacement minimal : 12 → 21 (V1) et
  31 (V2). B·S6 : 8 → 27 (V1, V2). Sauf V2 en A, **la pré-fatigue des courses augmente** (A·S6 V1 : 1 → 2 ; B·S6 : 0 → 2 ou 3). On reporte la
  fatigue sur la course au lieu de protéger la Musculation.
- **V3 ne change presque rien en semaine pleine** : les séances sont à 24 h ou 48 h. Elle augmente le nombre
  d'organisations qui dominent RC1 en S6Dx (A : 3 → 7).

**Aucune de ces variantes ne doit être adoptée sans décision sportive.** Elles montrent seulement où se trouve le
levier : la proximité course → Musculation, et l'absence d'intensité dans la demande.

## 3. Cas impossibles ou bloqués

| cas | cause | preuve |
|---|---|---|
| Journée double avec la règle G4 actuelle (S6D) | Fenêtre G4 TEST de 24 h sur toutes les structures : deux sports différents le même jour sont toujours en conflit dès qu'ils partagent une structure (course et force partagent genou, hanche, systémique). | A : 184 / 244 organisations ont un refus, B : 216 / 276. Test C-0. |
| Course de 30 min dans une part de 30 min | Durée p90 du moteur 1 815 s > 1 800 s : la séance est **refusée**, jamais raccourcie. Part d'étude portée à 35 min. | Test C-3. |
| CT sur une part de 40–55 min (S6Dx) | Le moteur CT refuse la séance : durée ou format. | 26 / 244 (A), 42 / 276 (B). |
| CT en haltères seulement (D) | Refus systématique du moteur CT (matériel). | D·S6 : 60 / 60 ; D·S6D et S6Dx : 244 / 244. RC1 ne garde que 5 séances. |
| Musculation sur un jour de 30 ou 45 min (SIRR) | Refus du moteur (durée minimale), jamais de retrait d'exercices. | SIRR : 60 / 60 organisations avec refus ; RC1 A ne garde que 3 séances sur 6. |
| 6 séances sur 5 jours (S5) sans journée double | Capacité insuffisante : une séance est toujours non placée. | S5 : 5 / 6 partout. |

Un sixième cas tient au critère lui-même : **maximiser le volume planifié et l'espacement en même temps** est
impossible avec le moteur actuel. Le volume maximal s'obtient en groupant la Musculation, que rien n'allège (§1,
point 4).

## 4. Séances combinées : contraintes explicites et limites

**Ce qui est garanti** (testé) :
- **Jamais de fusion :** deux séances distinctes, deux enregistrements, deux identifiants.
- **Jamais de retrait d'exercices pour tenir :** une part trop courte refuse la séance, avec la raison tracée.
- **Durée :** chaque séance est générée pour **sa** part, et la somme ne dépasse pas la journée.
- **Fatigue :** le moteur Strength voit la course du jour à 0 h, bande ≤ 12 h. Il applique donc un allègement
  **complet** du bas du corps, avec un signal au planificateur. Pour une course clé, le niveau est « très élevé ».

**Ce qui n'est pas modélisé**, et doit l'être avant tout usage réel :
1. **L'ordre et l'heure.** Le planificateur raisonne en jours : 0 h, que la course soit le matin ou le soir.
   L'hypothèse d'étude (course le matin, force le soir) n'est **ni vérifiée ni exploitée**. Course après force et
   force après course sont traitées pareil.
2. **La part n'est pas persistée.** La semaine persistée garde une disponibilité par jour, la journée entière. La
   régénération du contrôle pré-séance (`regenerateSession`) relit donc 75 ou 90 min au lieu de 40 ou 55 (test C-4).
   Dans les cas observés, la séance régénérée était identique, mais **rien ne la borne à sa part**.
3. **La règle G4** interdit aujourd'hui toute journée double (voir §3). Il faudrait une décision explicite sur une
   fenêtre « même jour » par structure. La variante S6Dx (fenêtre 0 h partout) n’est qu’un outil d’exploration. Les fenêtres
   TEST valant toutes 24 h, elle ne change que les paires du même jour ; une fenêtre calibrée au-delà de 24 h demanderait
   un paramètre « même jour » distinct.

**Apport mesuré des journées doubles** (S6Dx, exploratoire) :
- **B** : 66 organisations dominent RC1, contre 19 sans journée double. *lun X · mar C · mer C+M · jeu C · sam M*
  donne, sur 4 semaines, **18 séries de bas du corps et 0 série partagée**, contre 8 et 7 pour RC1. Contrepartie :
  Musculation du mercredi allégée par la course du matin, et 18 conflits M3 détectés sur 4 semaines.
- **A** : gain modeste. 3 organisations dominent RC1 ; le meilleur espacement donne 1 série partagée au lieu de
  1,5, avec un bas du corps de 21 contre 31 pour RC1.

## 5. Comparaison RC1 / RC2 / RC2 bis, semaine 1, profil × scénario

| cas | RC1 bas / partagées / pré-fatigue / conflits | RC2 DB·P1 bas / partagées | meilleur compromis dominant RC1 |
|---|---|---|---|
| A·S6 | 31 / 29 / 1 / 1 | 12 / 4 | lun C · mar M · mer C · jeu X · ven M · sam M : 31 / 23 / 0 / 0 |
| B·S6 | 8 / 2,5 / 0 / 2 | 8 / 2,5 | lun C · mar M · mer C · jeu C · ven X · sam M : 18 / 2,5 / 0 / 0 |
| C·S6 | 30 / 30 / 1 / 1 | — (voir JSON) | 2 organisations dominantes (JSON) |
| D·S6 | 33 / 13 / 0 / 0, CT refusé | — | aucune : RC1 est non dominée |
| A·S5 | 27 / 26,5 / 1 / 2 | 27 / 26,5 | 4 dominantes (lun M · mar M · jeu M · ven C · sam C, …) |
| B·S5 | 28 / 31,5 / 0 / 1 | — | aucune |
| A·SIRR | 6 / 0 / 0 / 0, 3 séances | — | 15 dominantes, jusqu'à 4 séances et 43 séries de bas du corps |

D·S6D et D·S6Dx ne sont pas comparables : le CT est toujours refusé. Les 244 organisations y sont donc des variantes
d'une semaine à 5 séances.

## 6. Décisions sportives nécessaires (aucune prise ici)

1. **Quel compromis du front ?** Arbitrer entre volume du bas du corps, espacement de la Musculation et protection
   des courses. Aucun calcul ne peut le décider sans pondération sportive explicite, que l'étude s'interdit.
2. **Récupération intra-Musculation.** Faut-il qu'une séance de Musculation voisine en allège une autre ? Sans cela,
   le volume planifié récompense l'empilement (§1, point 4). C'est aujourd'hui une politique bloquée.
3. **Intensité des courses.** Quand le moteur Running produira-t-il de la qualité et des sorties longues ? Et avec
   quelle demande dérivée (dose réelle par intensité) ? Préalable à toute règle « facile / qualité / longue ».
4. **Importance d'une course de rôle KEY à archétype facile.** Doit-elle compter comme « clé » pour l'interférence ?
5. **Proximité course → Musculation.** Les fenêtres et bandes de la matrice (V1 / V2 / V3) sont exploratoires.
   Chacune déplace la fatigue d'un sport à l'autre.
6. **Journées doubles :**
   - autorisation par l'utilisateur seulement (jamais supposée) ;
   - fenêtre G4 « même jour » par structure ;
   - ordre imposé ou déclaré ;
   - part persistée et respectée par la régénération ;
   - paires admises (force + force ?).
7. **Disponibilités courtes.** Faut-il une séance de Musculation « courte » dédiée pour 30–45 min ? Aujourd'hui elle
   est refusée.

## 7. Limites de l'étude

- **Semaine 1** pour l'énumération ; la rotation A/B/C et la progression sur 4 semaines ne sont vues que pour les
  représentants. Les organisations sont répétées à l'identique chaque semaine.
- **Pré-fatigue intra-semaine seulement :** le dimanche de la semaine précédente est ignoré.
- **Volume planifié**, pas volume utile (point 4 du §1). Les séries partagées mesurent une proximité, pas une
  récupération réelle.
- **Paramètres TEST partout :** G4 24 h, M3 48 h / 72 h, normalisation des doses, planchers de volume. Une autre
  calibration peut déplacer le front.
- **Profil E :** ses organisations n'ont pas été énumérées, puisqu'elles sont celles de A.
- **Part de course de 35 min** et paires course + force : hypothèses d'étude.

## 8. Commits et preuves

Commits sur `claude/kairo-rc2bis-week-study` :
- capacité d'étude `pins` et banc d'énumération ;
- réservation des jours épinglés et test de fidélité ;
- résultats et rapport.

Validation :
- `pnpm check` : 2 681 tests réussis, 3 sautés, 0 échec, sur la version incluant la réservation des jours épinglés ;
- `pnpm kairo:build` : OK (avertissement habituel de taille de bloc) ;
- `pnpm kairo:e2e` (sur `vite preview`) : 221 vérifications ok, 0 échec, « E2E OK ».
