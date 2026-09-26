# 13 — Risques, décisions techniques, points à définir, décisions à valider

## 1. Risques propres au moteur

| # | Risque | Impact | Mitigation prévue |
|---|--------|--------|-------------------|
| RE1 | **Programmes valides mais sportivement médiocres** | Critique | Archétypes relus par des experts (G2) ; golden tests relus ; observabilité de l'abandon par archétype ; bêta avec des pratiquants exigeants |
| RE2 | **Paramètres provisoires pris pour des vérités** | Élevé | Chaque paramètre porte sa confiance ; rapport de gouvernance ; plages approuvées ; aucun paramètre `provisional` en G1 au lancement (selon la politique retenue) |
| RE3 | **Explosion combinatoire du placement** avec 4 disciplines, des doubles séances et des activités externes | Moyen | Budget de nœuds, heuristiques MRV, repli glouton et recherche locale, benchmarks en CI |
| RE4 | **Sur-contrainte** : trop de règles HARD ⇒ `NO_VALID_SOLUTION` fréquents | Élevé | Seules 5 limites de charge retenues, avec un niveau HARD/SOFT contextuel (V1.1) ; plus de HARD anti-doublon général ; métrique de taux d'échec par règle ; les fuzz tests révèlent les profils non couverts |
| RE5 | **Sous-contrainte** : trop peu de règles ⇒ programmes absurdes en cas limite | Élevé | Plafonds L4 ; tests de propriétés et métamorphiques ; tests longitudinaux |
| RE6 | **Dérives lentes** sur 6 à 12 mois (inflation des capacités, disparition des décharges, stagnation) | Élevé | Plafonds de progression par cycle ; tests longitudinaux 52 semaines ; détecteurs de dérive |
| RE7 | **Estimation de durée fausse** (For Time, salles bondées) | Moyen-élevé | p90 ≤ disponible, calibration personnelle, métriques par archétype |
| RE8 | **Données utilisateur pauvres ou fausses** (1RM déclaré optimiste) | Moyen | Confiance faible ⇒ RIR prioritaire, calibration, tests |
| RE9 | **Couverture du catalogue insuffisante** pour certains profils de matériel | Moyen | Rapport de couverture en CI ; relâchements tracés ; alertes d'observabilité |
| RE10 | **Instabilité du plan** (trop de révisions) | Moyen | Cible de stabilité, coût de changement, portée minimale, zone gelée |
| RE11 | **Complexité de relecture** des règles par les experts | Moyen | Export lisible, relecture par lots, plages approuvées pour limiter les relectures |
| RE12 | **Comportement en cas de douleur mal calibré** (trop laxiste ou trop alarmiste) | Élevé | Architecture P1–P4 validée ; contenus G1 isolés dans le ruleset, approuvés par un professionnel de santé avant production ; cliquet de sécurité ; pas de diagnostic |
| RE13 | **Marque HYROX** | Moyen | Identifiant neutre `hybrid_race` ; table des divisions issue d'une source vérifiée ; libellé configurable |
| RE14 | **Politiques contextuelles trop complexes** (L1–L3, simulations, décharges) : combinatoire difficile à relire et à tester | Moyen | Politiques exprimées comme tables de données ; tests par facteur ; trace de chaque décision ; export lisible pour les experts |
| RE15 | **Oscillations et replans en cascade** face à des événements répétés | Élevé | Coût de changement, zone gelée, portée minimale ; parcours adversariaux (doc 11 §8 bis) |

## 2. Décisions techniques (proposées)

| # | Décision | Justification |
|---|----------|---------------|
| DT1 | Moteur pur TypeScript, contrats `EngineResult` sans exception métier | C10, testabilité |
| DT2 | Unions discriminées pour les blocs et les prescriptions | Exhaustivité vérifiée par le compilateur, pas d'objets remplis de `null` |
| DT3 | Pipeline de séance commun (`session/`) + stratégies par discipline | Pas de duplication, comportement homogène |
| DT4 | Variantes de séance dans les demandes hebdomadaires | Permet au planificateur de remplacer une séance sans rappeler les moteurs |
| DT5 | Solveur maison : MRV + forward checking + branch & bound + budget + repli | Petit espace, déterminisme, pas de dépendance lourde (solveur externe inutile à cette échelle) |
| DT6 | Score lexicographique avec tolérance par niveau de priorité | Respecte la hiérarchie sans rendre les niveaux bas inutiles |
| DT7 | Ordinaux (0–3, `none`/`low`/`moderate`/`high`) pour les coûts et les demandes | Honnêteté épistémique, lisibilité pour les experts |
| DT8 | Graine dérivée et stockée ; `SeededRng` uniquement pour départager | Déterminisme |
| DT9 | Reason codes versionnés + templates localisés (sans LLM) | Explicabilité, i18n, coût nul |
| DT10 | Registre de règles avec fiche obligatoire et classes de gouvernance | C3 |
| DT11 | Archivage immuable des rulesets et catalogues ; trace stockée | Explication des anciens programmes |
| DT12 | fast-check (propriétés), Stryker + mutation de paramètres, simulateur longitudinal maison | Couverture réelle des règles |
| DT13 | `EnforcementPolicy`, `fullSimPolicy`, modes de décharge et `PaceModel` exprimés comme politiques paramétrables du ruleset (V1.1) | Les heuristiques restent réglables sans changer le code ni les contrats |
| DT14 | `ReplanResult { recommended, alternatives }` | Une recommandation principale en UX, alternatives conservées |
| DT15 | Hiérarchie A (filtres) / B (score lexicographique à 6 niveaux) / C (hystérésis) (V1.2) | Simplicité, explicabilité, anti-oscillation |
| DT16 | `programStatus`, `eligibility`, `healthDataConsent` en entrée ; `REST_RECOMMENDED` issue valide (V1.2) | Sécurité et périmètre sans vérité médicale codée |
| DT17 | `ParameterMetadata` et cliquet G1 (`safeDirection`, `approvedBaseline`) (V1.2) | Aucune constante sportive cachée ; sécurité non assouplissable en douce |

## 3. Points encore à définir (contenu à produire, pas des décisions de principe)

1. **Valeurs de tous les paramètres** du ruleset (plages approuvées par les experts).
2. **Liste complète des archétypes V1** par discipline, avec emplacements, leviers de compression et durées min/max.
3. **Catalogue V1** : exercices, métadonnées, substitutions, débits de travail par niveau.
4. **Table officielle des divisions HYROX** de la saison (distances, charges), avec la source.
5. Table **reps × RIR → % e1RM** et formule d'e1RM retenue.
6. **Règles de calcul des profils de demande** (seuils de passage d'un niveau à l'autre par structure).
7. **Poids de similarité** par discipline et seuils `warn` / `hard`.
8. **Marges de durée** par profil et facteurs de timing par défaut.
9. **Liste des zones corporelles** et correspondance avec les `painSensitiveAreas` et les restrictions.
10. **Descripteurs d'effort perçu** par zone (textes validés).
11. **Protocoles de tests** (course, force, stations, benchmarks de cross-training).
12. **Modèle d'athlète synthétique** pour les simulations longitudinales.
13. Premier jour de la semaine et gestion des fuseaux horaires et du changement d'heure dans le planificateur.
14. Gestion de **plusieurs profils de matériel** dans une même semaine (maison le mardi, salle le reste du temps).
15. Liste des **stimuli de cross-training** et table stimulus → formats, relues par un expert.
16. Rétention des données d'historique au-delà de 52 semaines (agrégats), en cohérence avec le RGPD.
17. **Tables de l'`EnforcementPolicy`** pour L1, L2 et L3 (V1.1).
18. **Paramètres de `fullSimPolicy`** et critères de choix du mode de décharge (V1.1).
19. **Règles de crédit de programmation Running** pour les kilomètres hybrides (V1.1).
20. **Signaux et pondérations du score d'adhérence**, et seuil minimal de données (V1.1).
21. **Liste fermée des cas HARD anti-doublon** (V1.1).
22. **Seuils des assertions** des parcours adversariaux (oscillation, churn, nombre de révisions) (V1.1).
23. **Contenus G1 douleur** (V1.2) : descriptions P1–P4, liste des symptômes P4, seuils temporels, règles d'escalade, formulations, instructions d'urgence localisées, règles de reprise.
24. **Contenus G1 éligibilité** (V1.2) : questionnaire d'aptitude, correspondance réponse → classe E/S/D/I, populations à validation particulière, âge seuil, liste des restrictions médicales exprimables.
25. **Table de correspondance** catalogue → 8 structures de planification, et seuils de niveaux par structure (V1.2).
26. **Seuil d'hystérésis** (couche C) et tolérances ε de la couche B (V1.2).
27. **Valeurs initiales** des critères de couverture CC1–CC11 et plage attendue du test d'équité des modalités (V1.2).

## 4. Décisions métier : statut après arbitrage (V1.2)

Chaque décision porte un numéro stable, référencé dans les autres documents.

- ✅ **Validées** (22) : 1, 3, 5, 8, 9, 10, 14, 19, 21, 23, 24, 25, 28, 29, 32, 33, 37, 38, 40, 41, 43, 45.
- ✏️ **Modifiées ou laissées paramétrables** (16) : 2, 7, 15, 16, 17, 18, 20, 22, 26, 27, 30, 31, 36, 39, 42, 44. La formulation ci-dessous est la version V1.1 (terminologie mise à jour en V1.2). Les valeurs numériques restent provisoires et devront être calibrées et relues.
- ✅ **Validées avec modification en V1.2** (7) : 4, 6, 11, 12, 13, 34, 35. Pour 34 et 35, l'**architecture** est validée ; les **contenus G1** restent à approuver par un professionnel de santé avant production.
- Aucune décision ne reste ouverte.

| N° | Décision | Statut V1.1 | Où |
|----|----------|-------------|----|
| 1 | Reclasser les 8 dimensions de C6 en **LOAD / STATE / CONSTRAINT / CONTEXT / DERIVED** et **abandonner les 8 budgets hebdomadaires** | ✅ Validée | [04 §1–2](04-charge-athlete-state.md) |
| 2 | **5 limites** (L1 à L5) conservées ; **L1, L2, L3 : niveau HARD/SOFT et seuils contextuels** (stimulus, structure, niveau, phase, proximité d'une séance clé, qualité des données), valeurs provisoires jamais présentées comme des vérités physiologiques | ✏️ Modifiée / paramétrable | [04 §4](04-charge-athlete-state.md) |
| 3 | **Classes de gouvernance G1–G5** et rôles d'approbation ; l'équipe produit peut ajuster les paramètres G2 **dans une plage approuvée** par l'expert | ✅ Validée | [09 §4](09-validation-repair-regles.md) |
| 4 | **Politique de blocage du build** : matrice graduée par environnement (local, CI, staging, bêta fermée, bêta publique / production) et par catégorie (SAFETY, FEASIBILITY, TECHNICAL, règle métier, golden, mutation, longitudinal, parcours adversariaux) ; **cliquet de sécurité G1** ; aucun contournement pour SAFETY, FEASIBILITY, TECHNICAL ni assouplissement G1 | ✅ Validée avec modification (V1.2) | [09 §6](09-validation-repair-regles.md) |
| 5 | Deux axes indépendants pour les règles : **nature** (SAFETY, FEASIBILITY, HEURISTIC, PREFERENCE, TECHNICAL) × **niveau** (HARD, SOFT, TARGET) | ✅ Validée | [01 §3](01-architecture-pipeline.md) |
| 6 | **Hiérarchie de décision A / B / C** (référence architecturale) : A — Admissibility (A1 Safety, A2 Feasibility, A3 Minimum recovery constraints, A4 Integrity) ; B — Optimization (B1 Primary goal coherence, B2 Progression, B3 Adherence, B4 Secondary goals, B5 Distribution quality, B6 Variety / weak preferences) ; C — Replanning stability (hystérésis). Remplace définitivement les 12 niveaux | ✅ Validée avec modification (V1.2) | [01 §5](01-architecture-pipeline.md) |
| 7 | **Adhérence en B3** : sous la couche A, la cohérence avec l'objectif principal (B1) et la progression (B2) ; départage les solutions sportivement comparables ; score d'adhérence explicable | ✏️ Modifiée (V1.1), terminologie B3 (V1.2) | [01 §5.1](01-architecture-pipeline.md) |
| 8 | **Score lexicographique avec tolérance** plutôt qu'une somme pondérée unique | ✅ Validée | [01 §4](01-architecture-pipeline.md) |
| 9 | **Coûts ordinaux (0–3)** dans le catalogue et **niveaux de demande ordinaux** (4 niveaux) plutôt que des valeurs continues | ✅ Validée | [03 §2](03-catalogue.md), [04 §6](04-charge-athlete-state.md) |
| 10 | Lecture de l'état = **catégorie `unknown` / `normal` / `caution` / `reduce`** issue de règles explicites ; `unknown` ≠ `normal` ; **aucun score de fatigue** ; sRPE utilisé uniquement en relatif et en interne | ✅ Validée (+ `unknown`, modification obligatoire 1) | [04 §3](04-charge-athlete-state.md) |
| 11 | **8 structures de planification dérivées** : `lower_knee`, `lower_hip`, `upper_push`, `upper_pull`, `axial`, `locomotor_impact`, `high_intensity_systemic`, `grip` ; excentrique, lourd/volume et course compromise restent dans Exposure/Context | ✅ Validée avec modification (V1.2) | [04 §6](04-charge-athlete-state.md) |
| 12 | **Complétude du catalogue = critères CC1–CC11** (le nombre d'exercices n'est plus un objectif) ; 6 presets modifiables ; machines et poulies candidats de première classe, **aucun bonus global pour les charges libres** | ✅ Validée avec modification (V1.2) | [03 §7](03-catalogue.md) |
| 13 | **Taxonomie en 4 couches** : patterns → muscles (17 groupes) → zones fonctionnelles → structures de planification dérivées ; pas de pseudo-précision biomécanique supplémentaire | ✅ Validée avec modification (V1.2) | [03 §2 bis, §4–5 bis](03-catalogue.md) |
| 14 | **Modèle de confiance** par crans (source, ancienneté par paliers, pertinence, cohérence) et effets sur la prescription | ✅ Validée | [04 §7](04-charge-athlete-state.md) |
| 15 | **Kilomètres hybrides** : 100 % de l'exposition brute conservée et utilisée pour L3 ; séparation exposition brute / crédit de programmation Running / contexte / intensité / continuité ; **aucun coefficient universel figé** | ✏️ Modifiée / paramétrable | [04 §5](04-charge-athlete-state.md) |
| 16 | **Matrice L1 de départ** (élevé → élevé ≥ 48 h, élevé ↔ modéré ≥ 24 h) **paramétrable** et modulée par la politique contextuelle ; relecture experte | ✏️ Modifiée / paramétrable | [04 §6](04-charge-athlete-state.md) |
| 17 | **Table L2 paramétrable** (séances intenses par semaine selon le niveau et la phase ; niveau HARD/SOFT contextuel) | ✏️ Modifiée / paramétrable | [04 §4](04-charge-athlete-state.md) |
| 18 | **Modèle d'allure interchangeable** (`PaceModel`) ; modèle par défaut (équivalence type VDOT / Riegel, ou vitesse critique) choisi par paramètre avec l'expert course | ✏️ Modifiée / paramétrable | [06 §2](06-moteurs-disciplines.md) |
| 19 | **Volume de course piloté en temps**, et en distance pour les objectifs de course | ✅ Validée | [06 §2](06-moteurs-disciplines.md) |
| 20 | **Tables de dosage de musculation entièrement paramétrables** (classe G2), valeurs proposées à relire | ✏️ Modifiée / paramétrable | [06 §1](06-moteurs-disciplines.md) |
| 21 | **Sémantique de la durée** : « 60 min » = temps disponible total `A` ; durée cible `T = A − marge` ; contrainte `p90 ≤ A` ; affichage du p50 | ✅ Validée | [07 §3](07-seance-duree-doublons.md) |
| 22 | **Profils de tolérance** conservés ; marges et plages **provisoires, à calibrer** ; invariants : `p90 ≤ disponible`, pas de remplissage artificiel | ✏️ Modifiée / paramétrable | [07 §3.2](07-seance-duree-doublons.md) |
| 23 | **Hiérarchie de réduction** par défaut (stimulus principal préservé, échauffement jamais supprimé) | ✅ Validée | [07 §3.3](07-seance-duree-doublons.md) |
| 24 | **« On ne remplit pas pour remplir »** : une séance plus courte que la cible est acceptée si rien de pertinent ne peut être ajouté | ✅ Validée | [07 §3.3](07-seance-duree-doublons.md) |
| 25 | **Répétition prévue déclarée** (`RepetitionIntent`, jamais inférée après coup) + avertissement de stagnation si aucune évolution | ✅ Validée | [07 §4](07-seance-duree-doublons.md) |
| 26 | Anti-doublon : **plus de règle HARD générale** ; répétition accidentelle très similaire ⇒ **forte pénalité** ; HARD seulement pour des cas explicitement justifiés (liste fermée de règles avec fiche) ; benchmarks, retests et progressions autorisés et tracés | ✏️ Modifiée / paramétrable | [07 §4](07-seance-duree-doublons.md) |
| 27 | Progression : **une variable dominante progresse généralement à la fois, sauf modèle explicitement défini et testé** ; plafond par cycle ; pas de changement de capacité en milieu de semaine | ✏️ Modifiée / paramétrable | [08 §1](08-progression-adaptation.md) |
| 28 | **Questions de feedback** minimales ; RIR demandé uniquement sur la dernière série de travail des ancres | ✅ Validée | [08 §2](08-progression-adaptation.md) |
| 29 | **Arbre `replanAfterMissedSession`** (SKIP par défaut pour une séance optionnelle, fenêtre de 48–72 h pour une séance clé, jamais de fusion de deux séances clés, pas de doublement) | ✅ Validée | [08 §3](08-progression-adaptation.md) |
| 30 | **Zone gelée de 24 h** (paramètre) comme règle de stabilité UX, **avec exceptions** : sécurité, douleur, indisponibilité explicite, demande de l'utilisateur, impossibilité devenue certaine | ✏️ Modifiée / paramétrable | [08 §3](08-progression-adaptation.md) |
| 31 | **Rampe de spécificité HYROX** ; fréquence contrôlée de la simulation complète via une **politique paramétrable** (`fullSimPolicy` : niveau, expérience HYROX, phase, récupération, proximité de la course) ; pas d'intervalle universel | ✏️ Modifiée / paramétrable | [06 §4](06-moteurs-disciplines.md) |
| 32 | **Table des substitutions HYROX** avec fidélité ; recommandation d'accès au vrai matériel en phase spécifique | ✅ Validée | [06 §4](06-moteurs-disciplines.md) |
| 33 | **Catalogue des stimuli de cross-training** et principe « le format sert le stimulus » | ✅ Validée | [06 §3](06-moteurs-disciplines.md) |
| 34 | **Douleur : architecture P1–P4 validée** (choix fermés, aucune interprétation, pipeline P4 → interruption → blocage selon le ruleset G1 → message localisé). **Contenus G1 non figés** : liste des symptômes P4, seuils temporels, escalade, formulations, instructions d'urgence, reprise | ✅ Validée avec modification (V1.2) | [09 §7](09-validation-repair-regles.md) |
| 35 | **Périmètre V1** : adultes de 18 ans et plus ; classes E / S / D / I ; aucune autorisation médicale inventée. **Contenus G1 non figés** : questionnaire d'aptitude, correspondance réponse → classe, populations à validation particulière, âge seuil, restrictions médicales, reprise | ✅ Validée avec modification (V1.2) | [09 §8](09-validation-repair-regles.md) |
| 36 | **Macro** : proportions des phases paramétrables ; **décharges globales, partielles ou par discipline**, mode choisi par le GlobalPlanner selon le contexte (plus de synchronisation imposée) | ✏️ Modifiée / paramétrable | [05 §1.2](05-planner-interference.md) |
| 37 | **Répartition demandée par l'utilisateur** (« courir 3× ») traitée comme une cible forte, jamais modifiée en silence | ✅ Validée | [05 §1.2](05-planner-interference.md) |
| 38 | **Objectif secondaire absorbé** par l'objectif principal quand ils sont compatibles (ex. 10 km sans date absorbé par la préparation HYROX), avec réévaluation après l'événement | ✅ Validée | [12 §3](12-exemple-complet.md) |
| 39 | Plusieurs propositions calculées et classées, mais **une recommandation principale affichée par défaut** ; alternatives accessibles au second plan ; confirmation si des séances visibles changent | ✏️ Modifiée / paramétrable | [08 §3](08-progression-adaptation.md) |
| 40 | **IA** : aucun LLM en V1 (templates) ; après la V1, interprétation du langage naturel en événements structurés **confirmés par l'utilisateur** | ✅ Validée | [10 §4](10-reason-codes-versioning-observabilite-ia.md) |
| 41 | **Montée de version du moteur** : séances futures régénérées à la frontière de semaine ; correctif de sécurité immédiat | ✅ Validée | [10 §2](10-reason-codes-versioning-observabilite-ia.md) |
| 42 | **Barrières de CI** conservées ; **seuils paramétrables** (score de mutation calibré après la première mesure) ; processus d'approbation des diffs golden inchangé ; parcours adversariaux ajoutés | ✏️ Modifiée / paramétrable | [11 §7, §10](11-tests.md) |
| 43 | **Trajectoires longitudinales** (improving, plateau, declining, noisy, breakthrough) et détecteurs de dérive | ✅ Validée | [11 §8](11-tests.md) |
| 44 | **Cibles de performance provisoires et paramétrables** (semaine < 300 ms sur mobile, cycle < 2 s côté serveur, simulation de 52 semaines < 30 s en CI), bloquantes seulement après calibration | ✏️ Modifiée / paramétrable | [01 §8](01-architecture-pipeline.md) |
| 45 | Signalement explicite `GOAL.TARGET_UNASSESSABLE_YET` : **pas d'estimation de temps cible sans données suffisantes** | ✅ Validée | [12 §1](12-exemple-complet.md) |

## 5. Suite proposée après validation

1. Gate d'architecture V1.2 (voir README) : l'implémentation du CORE peut commencer, sans figer les valeurs sportives.
2. Production du **contenu** de la section 3 (paramètres, archétypes, catalogue) en format relisible par les experts.
3. Seulement ensuite : implémentation dans l'ordre de la feuille de route de la phase 1 (doc 12), en commençant par `core/`, `rules/`, `catalog/`, `duration/` et leurs tests.
