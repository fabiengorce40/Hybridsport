# KAIRO RC2 — Planner multisport : audit, stratégies de récupération et mesure sportive (étude)

**Branche d'étude :** `claude/kairo-rc2-planner-study`, issue de `claude/kairo-rc1` (`f0b09e4`).

- **RC1 est intacte :** aucun commit sur `claude/kairo-rc1`.
- **Rien n'est engagé :** aucune fusion, aucun déploiement, aucune règle sportive approuvée modifiée.
- **Aucune règle de récupération n'est implémentée ni activée.**

Les stratégies sont simulées grâce à des **capacités d'étude inertes** :
- M3 : `sameSport` / `sports` sur une règle de paire, et départage `later` ;
- placement : `planner.placement.spacingGroups`.

Aucune gouvernance existante ne les renseigne, et `beta0Environment` est inchangé. C'est prouvé par
`rc2-inert.test.ts` : un environnement d'étude **sans** règle reproduit RC1 octet pour octet sur 4 semaines.

Données :
- `packages/app-core/tests/rc2/__reports__/rc2-study.json` : 70 simulations ;
- `rc2-strategies.md` : tableaux complets.

Relance : `RC2_STUDY=1 npx vitest run packages/app-core/tests/rc2/rc2-study.test.ts`.

> Des tests verts ne prouvent pas la qualité sportive. Les planchers et hauts de volume, les fenêtres d'interférence
> et les paramètres testés sont **expérimentaux** ; ces chiffres servent à décider, pas à valider.

## Phase 1 — Audit des contraintes

### 1.1 Pourquoi deux Full Body consécutifs (lundi / mardi)

Placement initial (`planMultisportWeek`), cause **exacte** pour la configuration A :

1. **Ordre des demandes**, en alternance : Musculation 1, Course 1, CT, Musculation 2, Course 2, Musculation 3.
2. **Choix du jour.** Chaque demande prend le jour libre le plus éloigné de **toutes** les séances déjà placées, tous
   sports confondus. Le placement se fait ensuite :
   - Musculation 1 → lundi ;
   - Course 1 → samedi ;
   - CT → mercredi.
3. **Musculation 2.** Mardi, jeudi et vendredi sont **à égalité** (écart de 1 jour). Le départage par la date la plus
   tôt donne **mardi**, collé au Full Body de lundi. Course 2 prend alors jeudi, Musculation 3 vendredi.
4. **Aucun critère n'espace les séances d'un même sport.**
5. **M3 n'intervient pas.** Ses règles de paire ignorent explicitement deux séances du même sport (« la même
   discipline reste à son moteur »).

### 1.2 Possibilités de déplacement et disponibilités

| Config. | Séances placées / jours disponibles | Jour libre | Conséquence |
|---|---|---|---|
| A, C, E (masse) | 6 / 6 (lun–sam ; dim 0 min) | aucun | MOVE impossible (`MOVE:NO_FREE_DAY`) ; seul SWAP peut agir |
| B (hybride) | 6 / 6 | aucun | idem |
| D (haltères) | 5 / 6 (CT refusé) | 1 | MOVE possible |

**Contraintes de SWAP (existantes) :**
- jamais deux séances composées du même sport (rôles A/B/C) ;
- ordre de composition préservé ;
- `protectPriority` : jamais une séance clé (Course du samedi), jamais un sport plus prioritaire ;
- tout échange qui crée un **nouveau** conflit est annulé.

### 1.3 Conflits avec Running et Cross-training ; décisions M3

- **Depuis R1** (demande composite), M3 est actif. Il détecte chaque semaine un conflit genou CT (mer.) ↔ Course
  (jeu.) qu'il ne résout pas : `MOVE:NO_FREE_DAY`, `SWAP:PRIORITY_PROTECTED` (le CT, moins prioritaire, n'a pas de
  partenaire de rang supérieur ou égal), `RECOMPOSE:NO_EFFECT`. Le résidu reste visible.
- **Interférence côté Strength** (règles existantes, valeurs TEST : voisine à moins de 36 h, structures genou et
  hanche) : une Course voisine retire `fb.iso_lower` et `fb.single_leg` des Full Body. C'est **le** déterminant du
  volume du bas du corps (phase 3).
- **Force à J+1 inévitable sur une semaine pleine.** 3 Musculation et 1 bloc CT font 4 séances de force sur 6 jours :
  au moins une adjacence force à J+1 est inévitable. La paire Musculation ↔ Musculation est évitable (ex.
  M · C · M · C · M · X), mais elle place alors la Course entre deux Full Body.

### 1.4 Calcul du volume par groupe (contributions directes et indirectes)

- **Règle Strength E1 :** primaire = 1 par série de travail ; secondaire = 0,5 (`strength.volume.secondaryWeight`).
  Montées en charge, séries facultatives, échauffement et retour au calme sont exclus.
- **Pas de double comptage :** chaque groupe est compté au plus une fois par exercice (un groupe primaire n'est jamais
  aussi compté en secondaire).
- **Cohérent avec la règle, mais à lire avec prudence :**
  - **bras** = biceps + triceps : chaque développé ou tirage y ajoute 0,5, d'où 16–20 séries pour un haut de 14 ;
  - **tronc** inclut les lombaires (le RDL contribue au tronc) ;
  - **squat :** chaque groupe primaire reçoit la série entière (quadriceps ET fessiers).
- **Écart :** le bilan hebdomadaire (`assessStrengthWeekVolume`) **n'inclut pas** les blocs de force CT (comptés
  seulement pour l'alternance). Les mesures « exécutées » de cette étude les incluent.

## Phase 2 — Stratégies comparées (TEST_ONLY, étude)

**Stratégies** (actions M3, dans l'ordre d'essai) :

| Stratégie | Actions |
|---|---|
| A | MOVE |
| B | MOVE puis SWAP |
| C | MOVE, SWAP puis RECOMPOSE |
| D0 (exploratoire) | espacement des séances de force (Musculation + CT) **au placement initial**, M3 RC1 |
| DB (exploratoire) | D0 + règle « force » + B |

**Détection d'étude « force ».** Paires Musculation ↔ Musculation et Musculation ↔ Cross-training (bloc délégué
compris), sur les structures CORE genou, hanche, poussée, tirage et axial. Départage `importance` → `rank` → `later`.

| Paramètre | Fenêtre | Niveaux | Seuil sportif ? |
|---|---|---|---|
| P1 | < 36 h (J+1) | élevé | non, paramètre d'étude |
| P2 | < 36 h (J+1) | modéré ou élevé | non |
| P3 | < 60 h (J+1 et J+2) | élevé | non |

**Préservé dans toutes les variantes :**
- semaines commencées jamais replanifiées (comportement existant) ;
- douleurs connues et contrôle pré-séance (**0 violation de zone** sur les 70 simulations) ;
- matériel : moteurs régénérés avec le profil ;
- priorités : `protectPriority` et séance clé de Course jamais déplacée.

## Phase 3 — Mesure sportive (4 semaines × 5 configurations × 14 variantes)

**Lecture des colonnes :**
- **paires J+1** : séances de force réalisées à 24 h partageant au moins un groupe ;
- **séries partagées** : somme du minimum des séries par groupe partagé, sur ces paires ;
- **bas du corps** : quadriceps + ischio-jambiers + mollets + fessiers, en séries planifiées par semaine (moyenne) ;
- **haut du corps** : pectoraux + dos + épaules.

### A. Prise de masse prioritaire (salle commerciale) — RC1 : lun M · mar M · mer X · jeu C · ven M · sam C

| Variante | Paires J+1 | Séries partagées | Dont CT | Bas du corps | Haut du corps | Course (séances / min) | Min / sem. | Résidus | Répét. variante / exercice |
|---|---|---|---|---|---|---|---|---|---|
| RC1 | 8 | 107,5 | 4 | 30,2 | 28,0 | 8 / 242 | 250 | 3 | 1 / 16 |
| A-P1 | 8 | 107,5 | 4 | 30,2 | 28,0 | 8 / 242 | 250 | 17 | 1 / 16 |
| B-P1 | 8 | 89,5 | 5 | 28,2 | 28,0 | 8 / 242 | 249 | 15 | 2 / 15 |
| C-P1 | 8 | 89,5 | 5 | 28,2 | 28,0 | 8 / 242 | 249 | 15 | 2 / 15 |
| B-P2 | 8 | 107,5 | 4 | 30,2 | 28,0 | 8 / 242 | 250 | 35 | 1 / 16 |
| B-P3 | 8 | 107,5 | 4 | 30,2 | 28,0 | 8 / 242 | 250 | 20 | 1 / 16 |
| D0 ⚠ | 6 | 46,5 | 3 | **12,0** | 28,0 | 8 / 242 | 230 | 0 | 2 / 10 |
| DB-P1 ⚠ | 7 | 18,0 | 7 | **12,0** | 28,0 | 8 / 242 | 232 | 0 | 1 / 13 |

### C. Salle complète — même semaine type

| Variante | Paires J+1 | Séries partagées | Bas du corps | Haut du corps | Course | Résidus |
|---|---|---|---|---|---|---|
| RC1 | 8 | 114,0 | 30,0 | 39,6 | 8 / 242 | 3 |
| B-P1 / C-P1 | 8 | 94,0 | 27,8 | 39,6 | 8 / 242 | 15 / 14 |
| D0 ⚠ | 6 | 54,0 | **12,0** | 34,4 | 8 / 242 | 0 |
| DB-P1 ⚠ | 7 | 16,5 | **12,0** | 38,1 | 8 / 242 | 0 |

### D. Haltères seulement (1 jour libre) — RC1 : lun M · mer M · jeu M · ven C · sam C

| Variante | Paires J+1 | Séries partagées | Bas du corps | Course | Résidus | Actions |
|---|---|---|---|---|---|---|
| RC1 | 3 | 45,5 | 17,2 | 5 / 150 | 0 | 1 MOVE (règle existante) |
| **A-P1** | **1** | **13,0** | **17,2** | 5 / 150 | 2 | 4 MOVE |
| B-P1 / C-P1 | 0 | 0 | 15,0 | 5 / 150 | 0 | 4 MOVE, 1 SWAP |
| B-P3 | 3 | 43,5 | 15,0 | 5 / 150 | 17 | — |
| D0 / DB-P1 | 4 | 67,5 | 22,5 | 5 / 150 | 0 / 8 | — |

### E. Récupération dégradée — même semaine type que A

| Variante | Paires J+1 | Séries partagées | Bas du corps | Course | Résidus |
|---|---|---|---|---|---|
| RC1 | 8 | 106,0 | 30,2 | 8 / 240 | 3 |
| B-P1 / C-P1 | 8 | 72,5 | 26,0 | 8 / 240 | 10 |
| D0 ⚠ / DB-P1 ⚠ | 8 | 60,0 / 13,5 | **12,0** | 8 / 240 | 0 |

### B. Hybride (Course prioritaire)

Aucune variante ne change quoi que ce soit : la Musculation y est déjà espacée, et les 4 paires J+1 viennent du bloc
CT. Résidus : 6 (P1) ou 14 (P2, P3).

### Constats

1. **Course préservée partout :** mêmes séances et mêmes minutes dans les 70 simulations. Aucune variante ne touche
   la séance clé.
2. **Semaine pleine (A, C, E) : A, B et C ne suppriment aucune paire J+1.**
   - Pas de jour libre, donc MOVE impossible.
   - Presque tout échange crée un nouveau conflit, donc il est annulé. B et C avec P1 réussissent 1 à 2 échanges
     sur 4 semaines : séries partagées −17 à −32 %, bas du corps −7 à −14 %.
   - **RECOMPOSE (C) n'apporte rien** de plus que B ; une recomposition a même retiré des quadriceps (config. C).
3. **P2 et P3 sur-détectent :** aucune résolution supplémentaire, mais 20 à 35 conflits résiduels, affichés sous les
   séances. C'est du bruit pour l'utilisateur.
4. **Espacement au placement (D0, DB) :** les séries partagées baissent fortement (−50 à −87 %), mais le **bas du
   corps chute d'environ 60 %** (30 → 12 séries). En espaçant la Musculation, la Course se retrouve entre deux Full
   Body, et les règles d'interférence **existantes** retirent les créneaux du bas du corps. **À ne pas retenir** pour
   un objectif de masse.
5. **Avec un jour libre (D) :** A-P1 réduit les séries partagées de 71 % **sans aucune perte** de volume. B et C
   suppriment toutes les paires, au prix de −13 % de bas du corps.
6. **Répétitions :** inchangées ou légèrement modifiées (variantes répétées 1 à 3 sur 4 semaines). Les stratégies
   n'introduisent pas de monotonie.
7. **Durées :** les minutes hebdomadaires restent dans l'enveloppe (186 à 260 min pour 435 disponibles). D0 et DB les
   réduisent, parce que des créneaux sont retirés.
8. **Blocs CT :** les stratégies déplacent le problème plus qu'elles ne le résolvent. Avec DB, le bloc CT se retrouve
   collé aux deux Full Body (7 à 8 adjacences CT au lieu de 4).

## Phase 4 — Recommandation

**Recommandation : ne retenir aucune stratégie comme règle à ce stade.** Si une règle de récupération est validée, le
seul candidat sans dégradation observée est **A (déplacer seulement) avec une détection de type P1 (J+1, niveau
élevé)**, en TEST_ONLY :

- **Ce qu'elle apporte :** une réduction nette quand un jour libre existe (−71 % en D). Sur une semaine pleine, elle
  est neutre (aucun changement de séance) mais **affiche** des conflits résiduels.
- **Ce qu'il faut écarter :**
  - B et C : gain modeste et coût sur le bas du corps ; RECOMPOSE est sans effet utile ;
  - P2 et P3 : bruit ;
  - D0 et DB : forte dégradation de la prise de masse.
- **Le vrai problème des semaines pleines est structurel :** 4 séances de force et 2 courses sur 6 jours. Supprimer
  la paire Musculation ↔ Musculation impose de rapprocher Course et Musculation, ce que l'interférence existante
  sanctionne. **Aucun arbitrage local ne peut résoudre ce compromis : c'est une décision sportive.**

### Décisions sportives à te soumettre

1. **Deux Full Body consécutifs** : acceptables si les variantes diffèrent (A/B, accents différents) ? Ou interdits ?
2. **Priorité en semaine pleine** : préserver le volume du bas du corps (masse), ou espacer la force (récupération),
   quitte à perdre environ 60 % du bas du corps ?
3. **Interférence Course → Musculation** (valeurs TEST : voisine à moins de 36 h ⇒ retrait de l'isolation bas du corps
   et de l'unilatéral) : à valider ou à revoir. C'est elle qui rend l'espacement coûteux.
4. **Semaine impossible** : quand 4 séances de force et 2 courses tiennent sur 6 jours, faut-il proposer à
   l'utilisateur un 7ᵉ jour, une fréquence réduite, ou accepter un conflit visible ?
5. **Fenêtre et seuil de détection** (si règle) : P1 (J+1, niveau élevé) est le seul paramètre testé sans effet
   négatif ; aucun seuil physiologique n'en est déduit.
6. **Blocs CT** : les compter dans le bilan hebdomadaire Strength ? Avec quel poids ? Les éloigner des Full Body ?
7. **Affichage des conflits résiduels** : les montrer (transparence) ou seulement au-delà d'un seuil (éviter le bruit) ?

### Piste technique suivante (non implémentée, à valider)

Remplacer la réparation locale par une **évaluation globale de la semaine** au placement : comparer des dispositions
complètes selon les paires de force, le volume du bas du corps, la séance clé de Course et les conflits M3. Cela exige
des **pondérations**, qui sont des décisions sportives (points 1 à 4).

## Limites

- Une seule grille de disponibilités : lundi–samedi, dimanche indisponible.
- Valeurs d'interférence, planchers et hauts : TEST, non approuvés.
- Simulation déterministe et réponses scénarisées au contrôle pré-séance.
- La mesure des paires porte sur les séances **réalisées** (semaines avec douleur comprises).
- Groupes musculaires agrégés (bras, tronc).
- Le bilan Strength n'inclut pas les blocs CT.

## Validation

| Commande | Résultat |
|---|---|
| `pnpm check` | `Test Files  217 passed \| 2 skipped (219)` · `Tests  2671 passed \| 2 skipped (2673)` · code de sortie 0 (l'étude lourde est ignorée par défaut) |
| `pnpm kairo:build` | `✓ built`, code de sortie 0 |
| `pnpm kairo:e2e` | `E2E OK`, 221 vérifications, 0 `ÉCHEC` |
| `RC2_STUDY=1 … rc2-study.test.ts` | 70 simulations, 0 violation de zone, rapports régénérés |
| Rapports RC1 régénérés par `pnpm check` | **identiques** (aucun diff) : capacités d'étude sans effet sur le produit |
