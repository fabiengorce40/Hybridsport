# REKKA — RC4.5 : rapport final des décisions D1 à D4

| | |
|---|---|
| **Base** | `c0f7891` (document de décision), branche `claude/kairo-rc4-dev` |
| **Commits** | `cbbdd69` : O1 + O2 (D4) · `42331d4` : R-A (D2) · rapport et études : ce commit |
| **Inchangé** | Running ; branches TEST, production et repli ; aucune fusion, aucun déploiement. R1-bis-4 et F8-c restent au stade expérimental : rien n'est intégré, le code d'étude est archivé. |

## Synthèse

| Décision | Statut | Résultat |
|---|---|---|
| **D4 — O1 + O2** | **Implémenté** (`cbbdd69`) | Matrice RC4 strictement identique. Banc Node −24 % (P1 −30 %, P1b −36 %). Mobile ×4 −11 à −24 %. Toutes les conditions sont tenues (§ 1). |
| **D2 — R-A** | **Implémenté** (`42331d4`) | Diagnostic séparé, en lecture seule. Chemins de démarrage, séances et progressions inchangés. Indicateur distinct des divergences du planificateur : 6 / 12 sur la consolidation, identiques dès la planification (§ 2). |
| **D1 — R1-bis-4** | Étude jetable | Scénario Haut / Bas : **mollets 0 → 16 séries**, squat bulgare, leg curl et autres groupes intacts. **Mais** sur un profil mixte construit pour le test, la progression suivie de l'emplacement isolation passe de la leg extension au leg curl. **Critère non tenu partout : ne pas intégrer en l'état** (§ 3). |
| **D3 — F8-c** | Étude jetable | Identité stable et sans effet sur les séances, la graine et les progressions. Mais, en Full Body, une même lettre recouvre un mouvement principal différent d'une semaine à l'autre dans 60 à 100 % des cas. **F8-c n'est qu'une étiquette de créneau**, pas une variante (§ 4). |
| **Planning en grille** | Feuille de route mise à jour | Agenda à une ligne par jour, cartes côte à côte, sélecteur Liste / Grille, couleurs par sport. Prochain lot UI (§ 5). |

---

## 1. D4 — O1 + O2 (implémenté)

Détail : `RC4.5-O1-O2-PERF.md`.
- **O1 :** port Musculation, paramètres et emplacements résiduels lus une fois par port.
- **O2 :** `readStrengthParams` et `readStrengthParam` mémorisés par **identité du ruleset chargé** (`WeakMap`) :
  - garde de fraîcheur (métadonnées et valeur de chaque paramètre inchangées) ;
  - **aucune erreur en cache** ;
  - valeurs gelées ;
  - liste fermée `STRENGTH_RC45_PERF_CHANGES`.
- **Tests :** même objet et même contenu qu'une lecture neuve ; deux versions sans contamination ; erreur levée à chaque appel ; paramètre remplacé ⇒ relu ; mutation refusée ; 3 niveaux × 2 archétypes × 2 rulesets entrelacés, séances identiques dans l'ordre inverse.
- **Mesures, même machine :**
  - banc Node, médiane de 3 passages : 13 941 → 10 589 ms ;
  - mobile ×4, médiane de 5 passages : P1 3 881 → 2 953, P1b 2 098 → 1 693, P2 4 697 → 4 160, P3 3 911 → 3 070, P5 2 066 → 1 842 ms.

## 2. D2 — R-A (implémenté)

Détail : `RC4.5-RA-REPRODUCTIBILITE.md`.
- **Module :** `reproducibility.ts`, avec `diagnoseReproducibility` et `weekReproducibility`. Aucun module de l'application ne l'utilise, ce que vérifie un test.
- **Fix-B :** non implémenté.
- **Classes :**
  - `identical` ;
  - `progression_since_planning` : adaptation voulue, fourchettes ou charges avancées ;
  - `history_since_planning` : progressions créées depuis la planification ;
  - **`planner_divergence`** : indicateur distinct ;
  - `not_regenerable`.
- **Consolidation (12 séances) :**
  - historique : 2 ;
  - progression : 4 ;
  - **planificateur : 6** (S1-1, S2-1, S3-1, S3-2, S4-1, S4-2).
- Ces 6 divergences sont **déjà présentes à la planification**, avant toute séance de la semaine. C'est la preuve qu'elles viennent du planificateur et non de l'historique.

## 3. D1 — R1-bis-4 (étude, non intégrée)

**Règle testée** (`rc45-etudes/R1bis4-etude.patch`) :
1. Une fois la proposition **définitive** retenue par le CORE, si les mollets (`lo.calves`, séance Bas du corps) ont été omis faute de temps, le port relance le moteur avec **tous les exercices épinglés** sur cette proposition.
2. L'échange résiduel est alors autorisé. Victime admissible : instance supplémentaire d'un emplacement répété, accessoire facultatif, **sans progression**, jamais à dominante ischio-jambiers, groupes maintenus au plancher.
3. Le port **n'accepte le résultat que si la seule différence est « 1 instance retirée, mollets ajoutés »**. Sinon, la séance d'origine est gardée.

| Mesure | Résultat |
|---|---|
| Scénario A (Haut / Bas 4×, hypertrophie), avec et sans RIR | **Mollets 0 → 16 séries** (4 par semaine, séance Bas #2, suivis puis progressifs). **Victime : la leg extension supplémentaire.** Squat bulgare (progression 8–12 → 12), leg curl, soulevés de terre : **identiques**. Quadriceps 16 → 13 par semaine (plancher 10). Ischio-jambiers, fessiers et haut du corps identiques. |
| Effets secondaires (scénario A) | La leg extension de la séance Bas #1 de la semaine 2 devient une **1ʳᵉ exposition** (RIR 3 de calibration au lieu de 1), car son exposition de la semaine 1 a été échangée. Des libellés de trace (« critère : variant ») sont dus à l'épinglage. |
| Scénario B, consolidation, multi-configuration, matrice RC4, autres rapports | **Inchangés.** Suite app-core avec R1-bis-4 actif : 758 tests réussis ; seuls les deux rapports du scénario A changent. |
| Banc RC4 (6 profils) | **Identique** : aucun profil ne déclenche l'échange. |
| 4 profils mixtes construits (P1b, Haut / Bas 4× + course, temps disponible réduit à 45–60 min) | **Placements G5 / M3 et réductions d'interférence identiques.** Mais l'échange n'a lieu qu'**en semaine 1** : mollets +4 séries en tout sur 6 semaines, car l'instance devient ensuite suivie, donc protégée. **Profil X55 :** comme la leg extension de la semaine 1 est échangée, la progression suivie de l'emplacement `lo.iso_lower` est créée sur le **leg curl** au lieu de la leg extension (semaines 2 à 5 : leg curl en progression à 40 kg, leg extension en calibration). |

**Conclusion D1 :**
- Bénéfice net et propre sur le scénario Haut / Bas visé.
- Critère « ne jamais modifier les exercices suivis » **non tenu** dans un cas mixte : l'échange déplace la progression suivie d'un emplacement.
- Bénéfice faible hors scénario A.
- **Recommandation : ne pas intégrer.**

Piste si les mollets en Haut / Bas restent prioritaires : interdire l'échange tant que l'emplacement de la victime n'a **aucune progression suivie** sur l'archétype. Cela supprimerait l'effet X55, mais aussi le gain de la semaine 1. À mesurer avant toute décision.

## 4. D3 — F8-c (étude, non intégrée)

**Définition testée** : identité A / B / C = rang de l'index de demande `k` parmi les séances du même archétype de la semaine.
- Elle est déduite des demandes **persistées** : `requestId` et archétype composé.
- Aucun champ nouveau, aucune graine changée, aucune progression séparée.
- Rien n'est transmis au moteur. Le rollback n'est pas concerné, puisque rien de nouveau n'est écrit.

| Mesure (banc RC4, 6 × 6) | P1 | P1b | P2 | P3 | P5 |
|---|---|---|---|---|---|
| Séances, exercices, charges, progressions | identiques (lecture seule) | = | = | = | = |
| Séances dont l'ordre d'identité ≠ ordre des dates (placements G5) | 0 / 18 | 0 / 24 | **18 / 18** | **15 / 18** | 0 / 18 |
| Même lettre, semaines successives : mouvement principal **changé** | **15 / 15** | 0 / 20 | **15 / 15** | 9 / 15 | **13 / 15** |
| Semaines où l'affichage actuel partage une lettre (séances aux mêmes exercices) | 5 | 10 | 5 | 4 | 5 |

**Conclusion D3 :**
- F8-c n'altère ni les séances existantes ni les progressions : c'est démontré par construction et vérifié sur le banc.
- Mais ce n'est **pas** une variante : en Full Body, l'alternance genou / hanche fait qu'une même lettre désigne un contenu différent d'une semaine à l'autre. Sur P2 et P3, la lettre ne suit même pas l'ordre du calendrier.
- La présenter comme « Variante A » contredirait la règle d'affichage actuelle (« rien n'est présenté comme varié à tort »).
- **Recommandation :** ne pas afficher F8-c sous forme de variantes. Au plus, un repère de créneau (« séance Full Body 1 / 2 / 3 »), dont l'utilité sans contenu stable est faible.
- L'objectif final (variantes réellement différentes, cohérentes et progressives) demande un **chantier de conception distinct**, par exemple des familles d'exercices par variante avec une progression par exercice partagée. Il n'est pas lancé.

## 5. Planning en grille

`REPRISE-RC4-ROADMAP.md`, § 1 et ligne R5.1, mis à jour :
- agenda hebdomadaire, **une ligne par jour**, cartes de séances côte à côte ;
- sélecteur Liste / Grille, couleurs par sport, séances cliquables ;
- mobile lisible à 360 px (défilement de la ligne du jour, pas de 7 colonnes compressées) ;
- **pas de calendrier à sept cases**.

Prévu pour le **prochain lot UI**, en interface seule, sans changement d'app-core ni des moteurs. Tests DOM et E2E mobile prévus.

## 6. Validation après chaque implémentation

| Lot | `pnpm check` | Build | E2E | Banc RC4 |
|---|---|---|---|---|
| O1 + O2 | 2 920 réussis, 2 ignorés | OK | OK | strictement identique à F6 (3 passages) |
| R-A | 2 925 réussis, 2 ignorés | OK | OK | identique |

## 7. Décisions demandées

| # | Question | Recommandation |
|---|---|---|
| D1-bis | R1-bis-4 : abandon, ou mesure de la piste « aucune progression suivie sur l'emplacement » ? | Mesurer seulement si les mollets en Haut / Bas restent prioritaires ; sinon, abandon. |
| D3-bis | F8-c : abandon, ou simple repère de créneau, sans le mot « variante » ? | Abandon. Ouvrir plus tard un chantier « variantes réelles ». |
| UI | Lancer le lot Planning en grille (R5.1) ? | Oui, prochain lot UI. |

Aucune autre modification avant votre accord.
