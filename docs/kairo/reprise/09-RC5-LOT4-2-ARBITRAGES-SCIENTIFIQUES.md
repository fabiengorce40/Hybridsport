# Reprise RC5 — Lot 4.2 : arbitrages scientifiques, équilibre musculaire et planification hybride

- **Branche locale isolée :** `claude/rekka-lot42-20261101`, créée sur `0cb7706` (lot 4.1). Aucun push, aucune fusion, aucun déploiement.
- **Nature du lot :**
  - audit Q1 à Q8 ;
  - banc d'arbitrage reproductible ;
  - **une** correction technique démontrée (planificateur, § 7) ;
  - quatre options **proposées et inactives** (§ 8).
- **Aucune règle scientifique activée.** Aucun seuil R4 modifié. Aucune politique de volume indirect imposée. Aucun planning existant modifié.
- **Rapports reproductibles :**
  - `packages/app-core/tests/rc5/__reports__/lot42-arbitrages.md` et `.json` : 9 variantes × 18 profils × 12 semaines, régénérés par `LOT42_BENCH=1 pnpm vitest run packages/app-core/tests/rc5/rc5-lot42-arbitrages.test.ts` ;
  - `lot41-simulations.md` : régénéré.

## 1. État Git initial

| Élément | État constaté |
|---|---|
| `claude/rekka-reprise-20261031` | HEAD `0cb7706` (lot 4.1), arbre propre, aucun stash |
| Historique local | `a443b4f`, `bbd934e`, `e7335d7`, `0680831`, `0cb7706` : aucun n'est poussé |
| BÊTA `claude/rekka-beta` | `bc19fb1`, inchangée (vérifiée au début et à la fin) |
| Production `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e`, inchangée (vérifiée au début et à la fin) |
| Branche de travail | `claude/rekka-lot42-20261101`, créée sur `0cb7706` |

## 2. Matrice des décisions

| Catégorie | Contenu | Statut |
|---|---|---|
| **Correction technique autorisée, réalisée** | Planificateur : un jour indispensable à un autre sport est essayé en dernier (§ 7). Avant, une séance était refusée alors qu'un planning valide existait. | Active |
| **Diagnostics et outils de test** | Banc 4.2 : variantes de simulation, volume direct / indirect, 7 jours glissants, poussée / tirage H/V, interférences, rapport reproductible. Sonde historique `placementProbe: 'first'` (environnement de test seulement). | Tests seulement |
| **Évolutions fonctionnelles à confirmer** | Q3 : semaine courte `shortWeek: 'alternate_region'` (option de la règle de composition), ou composition à 3 Full Body. Q7 : recherche d'un autre jour après refus pour récupération (spécification). | Option inactive / spécification |
| **Arbitrages scientifiques suspendus** | Q1 : décompte des synergistes (variantes B1, B2, C). Q2 : borne haute glissante (`highWindow`). Q4 : départage `volume_fit` par déficit relatif (`volumeFitTieBreak`). Q5 : bande descriptive poussée / tirage. | Options inactives, chiffrées |
| **Dépendances R4** | Q8 : hausses décidées sur séances allégées (multisport) ; R4 (`5e119d6`, branche `claude/kairo-rc4-dev`) non intégré ; R3 requis selon son propre rapport. | Analyse seulement |

**Garantie :**
- aucune politique publiée (1.0, 1.1) ni la règle de composition candidate ne déclare une option du lot 4.2 ;
- l'environnement Beta 0 n'en active aucune ;
- tout cela est vérifié par les tests `lot42-options.test.ts` et `rc5-lot42-arbitrages.test.ts`.

## 3. Audit et causes racines (Q1 à Q8)

### Q1 — Décompte des muscles synergistes

- **Comportement actuel :**
  - le catalogue F6 déclare **principaux** les triceps de tous les développés, les biceps des tirages verticaux et les fessiers de tous les squats, fentes et charnières ;
  - le volume compte 1 pour un groupe principal et 0,5 (`secondaryWeight`) pour un secondaire.
- **Problème :** sous la politique 1.1, la borne haute des bras (14) et des fessiers (14) est atteinte par les seuls polyarticulaires. Elle bride alors le dos, les pectoraux, les quadriceps et les ischio-jambiers, ce qui est signalé (`limitedBy`).
- **Mesure (variante A, prévu par semaine, séries brutes) :** sur L4-1, les bras reçoivent **0 série directe** et 15,5 indirectes ; les épaules 3 directes et 13,4 indirectes.
- **Solutions comparées sur 18 profils** (`lot42-arbitrages.md` § Q1) :

| Variante | Définition | Effet type (L4-1 ; Full Body 3× H3 ; Force) | Risques |
|---|---|---|---|
| A, actuel | catalogue F6, poids 0,5 | Dos 8 et pectoraux 9,9 (cibles 10) ; bras et fessiers à la borne haute (13,8 ; 14) | Cibles du dos et des pectoraux inatteignables (signalées) |
| **B1** | bras **synergistes** des poussées et tirages polyarticulaires ; poids 0,5 inchangé | Dos **10**, pectoraux **10** ; H3 : pectoraux 4,8 → **9,5**, dos 8,1 → **10** ; Force : pectoraux et dos 5 → **7** (cibles 7) | Travail réel des bras +2 à 3 séries brutes (16,5 en décompte A), durée +1 à 4 min. **Forme générale 3× : pectoraux 6 → 3,3** (à expliquer avant toute activation). |
| B2 | B1, plus fessiers synergistes des exercices à dominante genou | Proche de B1 ; fessiers comptés plus bas. Matériel limité : quadriceps 8 → 10, mais fessiers bruts 16,1 | Peu soutenu : le squat profond sollicite fortement les fessiers |
| C (0,25) | B1 avec un poids indirect de 0,25 (s'applique aussi aux autres secondaires) | Bras bruts **18,5** ; pectoraux 8 ; épaules 10,8 | Le volume réel des bras monte encore ; très sensible au poids |
| C (0,75) | B1 avec un poids indirect de 0,75 | Proche de A : dos 9,5, bras 14,8 | — |

- **Sensibilité :** le résultat dépend fortement du poids indirect. Pour les bras bruts sur L4-1 :
  - 14,8 à 0,75 ;
  - 16,5 à 0,5 ;
  - 18,5 à 0,25.

  Un coefficient par exercice n'est **pas** justifiable en l'état des données (§ 5).
- **Recommandation (scientifique, suspendue) : B1 avec le poids existant de 0,5**, sans nouveau coefficient.
  - Il aligne le moteur sur le principe déjà gouverné du dépôt : décompte fractionnaire des séries indirectes.
  - Les fessiers restent principaux du squat et des charnières.
  - Prérequis : expliquer le recul de la forme générale 3× (pectoraux).

### Q2 — Semaine civile et 7 jours glissants

- **Comportement actuel (politique 1.1) :** cible et borne haute sont comptées sur la semaine civile. La récupération entre séances reste assurée par la règle de région (36 h).
- **Constat technique annexe (non corrigé) :** le choix des exercices lit encore les 7 jours glissants (`volumeFit`, `remainingShare`, `weeklyProjection`).
  - Aligner ces fonctions sur la semaine civile a été essayé et mesuré, puis **annulé** : cela ne corrige pas Q4, et les pectoraux baissent légèrement ailleurs.
  - L'incohérence est documentée, sans changement.
- **Mesure, réalisé** (jours où la somme glissante dépasse la borne haute, sur 84 jours) :

| Scénario | Dépassements glissants (groupe : max glissant / max semaine civile, borne) |
|---|---|
| L4-1, 4 séances réparties | bras 15 / 14 (14) : 15 jours |
| L42-EARLY, lundi au jeudi | bras 15 / 14 : 10 jours |
| L42-SUNMON, dimanche puis lundi | bras 15 / 14 : **20 jours** |
| L4-4 / HIST, passage de Full Body à A/B | bras **19** / 14 ; fessiers **16** / 14 : 27 jours |
| L42-SHORT, semaines courtes puis retour à 4 | bras **21,5** / 14 ; pectoraux 15 / 10 ; épaules 15 / 10 : 17 jours |
| L41-MISS, séances manquées et jours changés | bras 15 / 14 : 12 jours |
| Hybrides (L4-2, L41-RUN) | aucun |

- **Lecture :**
  - Les dépassements portent surtout sur les bras, conséquence directe de Q1.
  - Les cas marqués sont le **passage d'une rotation à l'autre** et le **retour d'une semaine courte**, où la nouvelle semaine repart de zéro alors que la précédente vient de finir chargée.
  - Il n'y a aucune double comptabilisation ; aucune prescription historique n'est touchée.
- **Garde-fou testé (option `highWindow: 'calendar_and_rolling'`, inactive) :**
  - il **supprime** tous les dépassements (par exemple L4-4 : 27 jours → 0) ;
  - mais il retire du volume partout (L4-1 : bras 13,8 → 11,5, dos 8 → 7,5 ; L4-3 : dos 7 → 5,2) ;
  - et il crée des **refus** : Force 0 → **10**, Course 4× 0 → **9**, priorités dos 0 → 2.
- **Recommandation :**
  - garder la semaine civile ;
  - **ne pas** activer ce garde-fou ;
  - envisager plutôt un **signal** (diagnostic de dépassement glissant, sans effet sur les prescriptions) ;
  - régler la cause (Q1, B1), qui fait disparaître la plupart des dépassements des bras.

### Q3 — Semaines hybrides : séance sacrifiée

- **Cause racine 1, défaut technique (corrigé, § 7) :** le planificateur choisissait les jours par espacement seulement.
  - La Course prenait le dernier jour Musculation **choisi par l'utilisateur**, alors que d'autres jours lui convenaient. La séance Musculation était refusée « faute de jours ».
  - Profils touchés : L41-RUN (4× + Course 2×) et L42-RUN3 (3× + Course 2×). Ils ont **7 jours disponibles** : le document 08 attribuait à tort leurs refus à un manque de jours.
- **Cause racine 2, structurelle :** L4-2 a 5 jours disponibles pour 6 séances. La 4ᵉ séance n'a **aucun** jour (jamais inventé). L'ordre de rotation, avec Haut en tête, fait toujours tomber une séance **Bas**.

| Stratégie, L4-2 HYROX (12 semaines) | Séances H / B / FB | Quadriceps | Ischios | Fessiers | Pectoraux | Dos | Squat | Sous 36 h | Durée max |
|---|---|---|---|---|---|---|---|---|---|
| Actuel | 24 / 12 / 0 | 3,8 | 2,8 | 3,8 | 7,2 | 5,3 | 100 → 105 | 0 | 34 |
| 1. Autre créneau | aucun jour libre : sans objet | | | | | | | | |
| 2. Réorganisation | sans objet, mêmes 5 jours | | | | | | | | |
| 3. Région alternée (option `shortWeek`) | **18 / 18** / 0 | 4,3 | 3,3 | 5 | 5,7 | 3,8 | 100 → 107,5 | 0 | 41 |
| 4. Trois Full Body (approximation : profil demandant 3×) | 0 / 0 / 36 | **4,8** | **4,2** | **7** | **7,7** | **6,3** | 100 → 102,5 (1 baisse) | **1** | 48 |
| 5. Planning alternatif expliqué | aperçu existant « Planning actuel / Planning proposé » ; la stratégie 3 ou 4 y serait présentée avec ses compromis | | | | | | | | |

- **Semaines courtes non hybrides (L42-SHORT, 3 jours pendant 4 semaines) :** option 3 = Haut / Bas 22 / 22 au lieu de 24 / 20 ; quadriceps 8,3 → 9,2 ; pectoraux 9,9 → 9,1.
- **Recommandation :**
  - correction technique **active** (aucune séance refusée si un jour valide existe) ;
  - pour les semaines réellement courtes, **stratégie 4** (3 Full Body quand 3 jours seulement sont possibles). C'est la meilleure sur tous les groupes, mais elle exige :
    - une décision produit (une demande de 4 séances composée en 3 Full Body) ;
    - l'examen du cas sous 36 h ;
  - à défaut, stratégie 3, option déjà implémentée et inactive, qui équilibre les régions au prix du haut du corps ;
  - dans les deux cas, présentation dans l'aperçu « Planning actuel / Planning proposé », avec « Conserver mon planning » et « Appliquer le nouveau planning ».

### Q4 — Full Body 3× : pectoraux 6,6 → 4,8

- **Cause racine (traces `SELECT.EXERCISE.CHOSEN`) :** ce n'est **pas** le budget de volume.
  - L'emplacement `fb.iso_upper` se départage à égalité en semaine 1 (critère `volume_fit` : pectoraux et épaules sont tous deux « sous la cible », donc ex aequo) ; l'élévation latérale l'emporte par `variant` ou `seed_tiebreak`.
  - La décision produit S4 « continuité > variété » la conserve ensuite toutes les semaines (`decidingCriterion: track`).
  - Au lot 4, le même départage était tombé sur le pec deck.
- **Écarté :**
  - un exercice supplémentaire (contraire à la demande) ;
  - la fenêtre glissante (hypothèse testée et réfutée, § Q2).
- **Solution étudiée (option `volumeFitTieBreak: 'relative_deficit'`, inactive) :** départager par le déficit relatif le plus grand. Même emplacement, même temps.

| Profil | Pectoraux A → option | Autres effets | Refus, durée |
|---|---|---|---|
| L41-H3 | **4,8 → 9,5** | épaules 7,8 → 7 (cible 8) ; fessiers 13 → 12,8 | 0 → 0 ; 52 → 52 min |
| L4-4 / HIST | 8,7 → 9,8 | épaules 9,1 → 8,8 | 0 → 0 |
| L4-1, L4-3, Force, forme générale, STAG, DIFF | identique | — | — |
| L4-5, H4P, EARLY, SUNMON, MISS | identique | fessiers 12,1 → **14** (borne haute) | 0 → 0 |
| **L42-RUN3** (Full Body 3× + Course) | **7,5 → 3,2** (recul) | épaules 6,2 → 6 | 0 → 0 ; 50 → 48 min |

- **Recommandation :** **pas en l'état**.
  - L'option corrige H3, mais elle fait reculer les pectoraux d'un autre Full Body (L42-RUN3).
  - Le départage par déficit relatif se joue en semaine 1 puis se fige (continuité S4) : il reste sensible à la composition de cette première semaine.
  - Elle modifie un critère de sélection et relève donc d'une **décision**, à prendre après analyse du cas L42-RUN3.
  - Effet de bord : les fessiers atteignent leur borne haute dans 5 profils (relève de Q1).
- **Remarque :** B1 (Q1) corrige aussi H3 (pectoraux 9,5), par un autre mécanisme, sans recul sur L42-RUN3 (pectoraux 7,5 → 7,5).

### Q5 — Poussée / tirage

- **Indicateur descriptif** (rapport § Q5) : par schéma (poussée H, poussée V, tirage H, tirage V), séries directes prévues et séances par semaine, plus le rapport hebdomadaire.
  - Un **déséquilibre persistant** est défini comme un rapport hors d'une bande descriptive pendant plusieurs semaines consécutives.
  - Bande **candidate, non validée** : 0,67–1,5. Aucun effet sur les prescriptions.
- **Résultats :**
  - A/B standard : 0,88–1,0, équilibré.
  - Matériel limité (L4-3) : 1,43 chaque semaine, **sans aucun tirage vertical** (0 série) ; contrainte de matériel (haltères + banc).
  - Force : 1,2 constant (poussée H 3, V 3 ; tirage H 3, V 2).
  - Priorités dos et épaules (H4P) : 0,55, hors bande **11 semaines**, voulu par l'utilisateur.
  - Course 3× : 0,75.
- **Recommandation :**
  - garder l'indicateur en **diagnostic** ;
  - le seuil doit tenir compte des priorités déclarées (H4P ne doit pas être signalé) et du matériel (L4-3 : signaler l'absence de tirage vertical plutôt que le rapport) ;
  - aucune modification des prescriptions.

### Q6 — Interférences HYROX

- **Méthode :** même script et même profil L4-2, avec le code du lot 4 (`0680831`, sonde historique, arbre de travail isolé) puis avec le code courant.
  - Sur les budgets du lot 4.1, la sonde historique n'est **pas viable** : 322 refus sur 18 profils (variante H), ce qui confirme le défaut V3.
  - La comparaison porte donc sur les placements réels de chaque version.

| Mesure, L4-2 sur 12 semaines | Lot 4 | Courant (4.1 / 4.2) |
|---|---|---|
| Séances Bas, toutes à 24 h après une séance HYROX | 12 / 12 | 12 / 12 (5 jours pour 6 séances : structurel) |
| Séance HYROX la veille du Bas A | `station_capacity`, chaque semaine A | `strength_endurance` (S1), puis `station_capacity` |
| Squat prescrit à RIR 6 (plancher multisport 4, plus interférence modérée `rir_only`) | 2 semaines sur 6 | 3 semaines sur 6 |
| Soulevé roumain prescrit à RIR 6 | 6 / 6 | 6 / 6 |
| Refus de planification | 12 | 12 |
| Squat, charge (athlète à capacité réelle) | 100 → 102,5 | 100 → 105 |

- **Lecture :**
  - L'écart entre placements est **faible** : une séance de squat allégée de plus sur 6.
  - L'allègement est la règle existante (interférence modérée → effort seul, aucune série retirée, tracé `PLAN.INTERFERENCE_ASSESSED`).
  - Aucun seuil n'a été modifié.
- **Recommandation :** conserver la sonde par rang. L'adjacence HYROX / Bas est structurelle avec 5 jours. La seule vraie amélioration est Q3 (stratégie 4 ou 3), avec R4 / R3 pour la lecture des séances allégées (Q8).

### Q7 — Recherche d'un autre créneau après refus pour récupération

- **Comportement actuel :**
  - le port Musculation refuse `PLAN.PERSONALIZATION_BLOCKED{cause: strength_recovery_window}` (36 h par région) ;
  - `classifyRefusal` le classe `non_retryable_engine_refusal` et la boucle du planificateur s'arrête ;
  - seule une contrainte de **créneau** (durée) est réessayée.
- **Fréquence dans le banc :** **0** sur 18 profils × 12 semaines, avec des jours choisis réguliers. Le cas réel est la séance déplacée la veille (test d'intégration du lot 4).
- **Spécification proposée (non implémentée) :**
  1. Nouvelle classe `retryable_recovery_constraint`, liste fermée : `strength_recovery_window` seulement. Sécurité, gouvernance et intention ne sont jamais réessayées.
  2. Candidats : jours **encore libres** de la semaine, parmi les jours **autorisés** pour ce sport (`minutesFor`). Les jours verrouillés (séances commencées ou terminées) sont exclus. Ordre déterministe : espacement, puis départage du § 7, puis date.
  3. Chaque candidat est généré par le port, avec les mêmes contrôles (36 h, interférences, budget de durée). Aucun autre sport n'est déplacé.
  4. Trace : `PLAN.PLANNER.RECOVERY_RETRY {fromDate, cause, tried[], chosen | none, compromise}`. Elle donne le créneau refusé, les créneaux examinés, la raison du choix ou de chaque rejet, et le compromis restant (par exemple « même région à 48 h au lieu de 72 h »).
  5. **Aucune application automatique** à un planning existant : la proposition passe par l'aperçu « Planning actuel / Planning proposé ». Seule une **nouvelle** semaine générée en bénéficierait directement, à confirmer.
- **Recommandation :** implémenter après confirmation. Effort faible (`refusal.ts`, boucle de `planner.ts`, codes), risque limité à la liste fermée.

### Q8 — Conflit scientifique R4

- **Règle actuelle (sans R4) :** une exposition prescrite à RIR relevé (interférence, plancher multisport) est classée contre ce RIR relevé. Une réussite compte comme preuve (`evidenceRequired`) : 2 en autorégulé, 1 en double progression ou linéaire. Une hausse peut donc être décidée sur une séance allégée.
- **Paramètres concernés (`strength.progression`) :**
  - `evidenceRequired` (1 / 1 / 2 / 1) ;
  - `aboveRirMargin` 1, `belowRirMargin` 2 ;
  - `regressionFraction` 0,1, `regressAfterBelow` 2 ;
  - `cycleCapFraction` 0,15 ;
  - pas de charge de 2,5 kg à la barre (`loadStepIncrements` 1).
- **Simulations, principaux du bas du corps chez le multisport :**
  - L41-RUN, 4 séances placées depuis le § 7 : séances Bas toutes à RIR 6. Squat 100 → 107,5 kg en S8, puis **95 kg** en S10 et 97,5 kg en S12. Le soulevé roumain fait de même. Ce sont des hausses décidées sur des séances allégées, intenables ensuite.
  - L42-RUN3 (Full Body + Course) : squat 100 → 110, avec une baisse.
  - L4-2 HYROX : 100 → 105, sans baisse.
- **R4 (`5e119d6`, branche `claude/kairo-rc4-dev`, non intégré) :**
  - lecture souple ; aucune hausse ni régression décidée sur une séance allégée ;
  - son propre rapport mesure une forte baisse des régressions chez le fatigué (176 → 50) ;
  - mais il **bloque** les principaux du bas du corps du multisport dont toutes les expositions sont allégées (40 kg sur 24 semaines) ;
  - correction annoncée par R3 (réévaluation de fin de cycle, non validée).
- **Options :**
  - (a) statu quo : hausses sur séances allégées, régressions comme L41-RUN ;
  - (b) R4 seul : régressions évitées, bas du corps du multisport bloqué ;
  - (c) R4 + R3 : régressions évitées, hausse par réévaluation ;
  - (d) R4 avec une exception : une séance allégée par le seul **plancher multisport** (durable, chaque semaine) compte comme référence, et non comme allègement du jour.
- **Recommandation :**
  - (d) en premier lieu, à valider. Le plancher multisport est une dose de référence durable, comme le niveau ; c'est cohérent avec la définition « modificateur durable » de R4 lui-même.
  - Puis R3 pour les allègements du jour.
  - Ne pas intégrer R4 seul. Aucun seuil modifié dans ce lot.

## 4. Comparaison synthétique des solutions

| Q | Option recommandée | Gain principal mesuré | Coût ou risque mesuré | Nature de la décision |
|---|---|---|---|---|
| Q1 | B1, poids 0,5 | dos et pectoraux à leur cible (A/B, H3, Force) | bras bruts +2 à 3 séries ; forme générale : pectoraux 6 → 3,3 | Scientifique |
| Q2 | semaine civile + signal glissant | aucun refus ajouté | aucun garde-fou actif | Scientifique / produit |
| Q3 | correction active ; puis stratégie 4 (3 Full Body) | L41-RUN 36 → 48 séances ; L42-RUN3 24 → 36 ; HYROX : tous les groupes en hausse | 1 séance sous 36 h (stratégie 4) | Technique (fait) / produit |
| Q4 | départage par déficit relatif, **après analyse** | H3 : pectoraux 4,8 → 9,5 | L42-RUN3 : pectoraux 7,5 → 3,2 ; fessiers à la borne haute dans 5 profils | Scientifique (sélection) |
| Q5 | indicateur descriptif | déséquilibres visibles (L4-3 : aucun tirage vertical) | seuil à valider | Produit |
| Q6 | sonde par rang conservée | — | +1 séance de squat allégée sur 6 (HYROX) | Aucune |
| Q7 | recherche bornée avec aperçu | refus « récupération » résolus quand un jour existe | 0 cas dans le banc | Produit |
| Q8 | R4 + exception plancher multisport, puis R3 | — | à simuler après décision | Scientifique (R4) |

## 5. Justifications scientifiques et niveau de confiance

| Point | Source ou principe | Confiance |
|---|---|---|
| Décompte fractionnaire des séries indirectes | Principe gouverné du dépôt (`science/principles.ts` : « méthode la mieux soutenue », `secondaryWeight` 0,5 conservé comme approximation) ; méta-régression de Pelland et al. (2024, prépublication) : le décompte « direct = 1, indirect = 0,5 » prédit mieux l'hypertrophie que le décompte direct seul ou total | Modérée |
| Bras des polyarticulaires : hypertrophie réelle mais moindre qu'en travail direct | Comparaisons mono- / polyarticulaires des fléchisseurs du coude (par exemple Mannarino et al., 2021) | Modérée à faible (effectifs réduits) |
| Fessiers principaux du squat profond (contre B2) | Kubo et al. (2019) : le squat profond augmente le volume du grand fessier | Modérée |
| Coefficient par exercice | Aucune donnée suffisante | Insuffisante : non proposé |
| Bande poussée / tirage | Aucune donnée validant un rapport universel | Insuffisante : descriptif seulement |
| Effort relevé sur séance allégée (interférence) | Règle existante gouvernée, inchangée | — |

Toutes les variantes de ce lot sont des **conventions de décompte** ou de **sélection**. Les résultats du banc comparent des règles. Ils ne mesurent aucun gain physiologique.

## 6. Simulations comparatives sur 12 semaines

- **Contenu :** 18 profils, soit les 14 du lot 4.1 et 4 scénarios ciblés :
  - Musculation 3× + Course ;
  - séances lundi à jeudi ;
  - dimanche puis lundi ;
  - 3 jours pendant 4 semaines.
- **Variantes :** 9 (A, B1, B2, C25, C75, Q2, Q3, Q4, H).
- **Résultats détaillés :** `lot42-arbitrages.md`.
- **Contrôles transverses :**
  - aucune erreur du banc ;
  - aucune séance sous 36 h dans les 9 variantes × 18 profils (la stratégie 4 de Q3 en produit 1, hors banc) ;
  - aucune durée au-delà de la limite.
- **Scénarios couverts par la demande :**

| Scénario demandé | Profil |
|---|---|
| HYROX 4× | L4-2 |
| Musculation 3× + Course | L42-RUN3 |
| Full Body 3× | L41-H3 |
| Matériel limité | L4-3 |
| Priorités fessiers et cuisses | L4-1 |
| Jours réduits | L42-SHORT |
| Séances manquées | L41-MISS, L4-5 |
| Replanification après conflit | L4-5 (jours changés), test d'intégration du lot 4 |
| Passage d'une semaine à l'autre | L42-SUNMON, L4-4 |
| Historique | L41-HIST |

- **Effets de la correction technique** (`lot41-simulations.md` régénéré) :
  - seul **L41-RUN** change parmi les 14 profils du lot 4.1 : 36 → 48 séances placées ;
  - quadriceps 4 → 5,3, ischios 3 → 4,5, fessiers 4 → 7,2 ;
  - durée maximale 34 → 42 min (limite 60) ; aucune séance sous 36 h ;
  - squat et soulevé roumain avec une baisse chacun : effet Q8, inscrit en liste fermée et expliqué dans le test du lot 4.1 ;
  - L42-RUN3 : 24 → 36 séances, squat 100 → 110.

## 7. Correction technique réalisée

- **Fichier :** `packages/planner/src/planner.ts`, choix du jour d'une demande.
- **Avant :** jours libres triés par espacement maximal.
- **Après :** même tri, mais les jours **indispensables à un autre sport** passent en **dernier**. Ce sont les jours où ce sport a autant ou plus de demandes restantes que de jours encore possibles.
- **Garanties :**
  - aucun jour n'est exclu, et aucun jour n'est inventé (L4-2 : la séance sans jour reste signalée `NOT_ENOUGH_DAYS`) ;
  - jours choisis par l'utilisateur respectés ;
  - déterministe ;
  - semaines existantes non replanifiées : la version de planification est inchangée, donc rien ne se recalcule en silence ;
  - séances commencées et terminées intactes.
- **Pourquoi c'est technique :** un planning respectant toutes les contraintes existait et le planificateur ne le trouvait pas. Aucune règle sportive n'est modifiée.

## 8. Modifications volontairement suspendues

Options implémentées, **inactives**, utilisées seulement par les variantes de simulation :

| Option | Emplacement | Effet si activée |
|---|---|---|
| `shortWeek: 'alternate_region'` | `CompositionBand` (`composition.ts`) | Semaine courte impaire avec une séance Bas en tête (Q3) |
| `volumeFitTieBreak: 'relative_deficit'` | politique de personnalisation (contrat), `volumeFit` / `selection.ts` | Départage par déficit relatif (Q4) |
| `highWindow: 'calendar_and_rolling'` | politique de personnalisation, `engine.ts` | Borne haute aussi sur 7 jours glissants (Q2) |
| `placementProbe: 'first'` | port Musculation / environnement de test | Sonde historique (Q6, diagnostic) |

Non implémentés :
- Q1 B1 (changement de catalogue ou de décompte) ;
- Q3 stratégie 4 (composition à 3 Full Body) ;
- Q7 (recherche d'un autre jour après refus pour récupération) ;
- Q8 (R4 et son exception) ;
- signal glissant de Q2 ;
- indicateur poussée / tirage dans l'application.

## 9. Résultats des tests

| Vérification | Résultat |
|---|---|
| `pnpm check` (typage, lint, tests) | **OK** : 284 fichiers, 3 199 tests réussis, 3 ignorés (dont le rapport complet sur demande) |
| `lot42-options.test.ts` (Strength) | Q3 inactif par défaut, ordre inchangé en semaine complète, alternance en semaine courte ; contrats Q2 / Q4 absents des politiques publiées |
| `rc5-lot42-arbitrages.test.ts` (app-core) | Correction : 3 séances Musculation sur les jours choisis, la Course ailleurs ; jamais de jour inventé ; déterminisme ; export / import. Options inactives par défaut ; reclassement Q1 ; Q4 relève les pectoraux de H3 ; Q3 équilibre Haut / Bas. Rapport complet sur demande. |
| `rc5-lot41-simulations.test.ts` | Rapport régénéré (seul L41-RUN change). Liste fermée des baisses de charge complétée par `L41-RUN:back_squat` et `L41-RUN:romanian_deadlift`, avec justification Q8. Les autres invariants sont inchangés. |
| Tests d'architecture | `strength-architecture` (constantes justifiées, aucune multiplication dans la sélection) ; `crosstraining-architecture` (liste fermée lot 4.2) |
| E2E navigateur (code final, build BÊTA locale) | Rotation A/B 360 et 390 px, lots 2 et 3, personnalisation, séance mobile, répétitions, jours Musculation, hors ligne, stockage auxiliaire du chronomètre : **OK**. Parcours `base`, `cross`, `hyrox`, `recovery`, `planning` : **5 / 5 OK**. Parcours complet `e2e.mjs` (build standard) : **310 OK**, comme au lot 4.1. Interface non modifiée par ce lot. |

## 10. Migration navigateur avec les vraies builds historiques

- **Protocole :** `e2e-v22-upgrade.mjs` et `e2e-storage-guard.mjs`.
  - Builds historiques réelles, conservées dans des arbres de travail isolés : **V2.1 `5695917`** (format v3) et **reprise `b850b98`** (format v4).
  - Build courante préparée par `prepare-android-test.mjs`, avec l'empreinte de commit fictive du protocole.
  - Données de la fixture non modifiées.

| Exécution | V2.1 (v3) → v5 | `b850b98` (v4) → v5 | Sécurité des données |
|---|---|---|---|
| Code du lot 4.1 (`0cb7706`), début du lot 4.2 | **3 / 3 PASS** | **4 / 4 PASS** | **OK** |
| Code final du lot 4.2 (build courante reconstruite après toutes les modifications) | **3 / 3 PASS** | **4 / 4 PASS** | **OK** |

Chaque PASS vérifie :
- données riches et aller-retour d'export exacts ;
- copie d'avant migration conservée ;
- IndexedDB, worker, icônes ;
- l'ancienne build refuse le format v5 sans l'écraser.

## 11. Fichiers modifiés

**Correction technique**
- `packages/planner/src/planner.ts`.

**Options inactives**
- `packages/strength/src/composition.ts` ;
- `packages/strength/src/codes.ts` (paramètre facultatif `shortWeek` de `PLAN.WEEK_COMPOSITION`) ;
- `packages/strength/src/personalization-contract.ts` ;
- `packages/strength/src/volume.ts` ;
- `packages/strength/src/selection.ts` ;
- `packages/strength/src/engine.ts` ;
- `packages/planner/src/ports.ts` ;
- `packages/app-core/src/planning.ts`.

**Tests et banc**
- Nouveaux : `packages/strength/tests/unit/lot42-options.test.ts`, `packages/app-core/tests/rc5/lot42-bench.ts`, `rc5-lot42-arbitrages.test.ts`.
- Modifiés : `lot41-bench.ts` (athlète exporté, simulation réutilisable), `rc5-lot41-simulations.test.ts`, `crosstraining-architecture.test.ts`.

**Rapports**
- `__reports__/lot42-arbitrages.md` et `.json` ;
- `__reports__/lot41-simulations.md` (régénéré).

**Documentation**
- `docs/kairo/reprise/09-RC5-LOT4-2-ARBITRAGES-SCIENTIFIQUES.md`.

## 12. Risques résiduels

1. **Correction du planificateur :** davantage de séances placées chez le multisport, donc plus de séances allégées. Cela met au jour Q8 : L41-RUN a des baisses de charge sur les principaux du bas.
2. **Bras et fessiers à leur borne haute** et dépassements glissants (Q1, Q2) : inchangés tant que Q1 n'est pas arbitré.
3. **L4-3 (matériel limité) :** aucun tirage vertical. Constat ; aucune correction (matériel).
4. **Options inactives :** code présent mais jamais exécuté par l'application. Tests de non-activation en place.
5. **Banc :** athlète modèle (capacité exponentielle, RIR entier). La stratégie Q3-4 n'est **approchée** que par un profil demandant 3 séances.
6. **Erreur du document 08 corrigée ici :** les refus de L41-RUN n'étaient pas un manque de jours.

## 13. Décisions à soumettre à validation

| Q | Décision | Options | Recommandation |
|---|---|---|---|
| Q1 | Décompte des synergistes | A statu quo / **B1** / B2 / C (0,25 ou 0,75) | B1 avec le poids existant de 0,5, après explication du recul des pectoraux en forme générale |
| Q2 | Fenêtre de la borne haute | semaine civile / garde-fou glissant / **signal** | Semaine civile + signal ; pas de garde-fou (refus et volume perdu) |
| Q3 | Semaine courte | statu quo / région alternée / **3 Full Body** / aperçu seul | 3 Full Body via l'aperçu, après examen du cas sous 36 h ; sinon région alternée |
| Q4 | Départage de l'isolation | statu quo / déficit relatif / seconde isolation / B1 (Q1) | Ne pas activer en l'état (recul de L42-RUN3). B1 corrige aussi H3 ; décider Q1 d'abord. |
| Q5 | Indicateur poussée / tirage | aucun / **diagnostic** tenant compte des priorités et du matériel | Diagnostic, seuil à valider |
| Q6 | Sonde de placement | **par rang** / historique | Par rang (historique non viable) |
| Q7 | Autre jour après refus pour récupération | non / **recherche bornée + aperçu** | Implémenter après confirmation |
| Q8 | R4 | statu quo / R4 seul / R4 + R3 / **R4 + exception du plancher multisport** | Exception du plancher multisport, puis R3 |

## 14. Commit

- **Commit local unique** sur `claude/rekka-lot42-20261101`. Son empreinte est donnée dans le rapport final (`git log -1`).
- Aucun push, aucune fusion, aucun déploiement. BÊTA `bc19fb1` et production `f9f7e2e` intactes.
