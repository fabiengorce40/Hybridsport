# 13 — Risques, décisions techniques, points à définir, décisions à valider

## 1. Risques propres au moteur

| # | Risque | Impact | Mitigation prévue |
|---|--------|--------|-------------------|
| RE1 | **Programmes valides mais sportivement médiocres** | Critique | Archétypes relus par des experts (G2) ; golden tests relus ; observabilité de l'abandon par archétype ; bêta avec des pratiquants exigeants |
| RE2 | **Paramètres provisoires pris pour des vérités** | Élevé | Chaque paramètre porte sa confiance ; rapport de gouvernance ; plages approuvées ; aucun paramètre `provisional` en G1 au lancement (selon la politique retenue) |
| RE3 | **Explosion combinatoire du placement** avec 4 disciplines, des doubles séances et des activités externes | Moyen | Budget de nœuds, heuristiques MRV, repli glouton et recherche locale, benchmarks en CI |
| RE4 | **Sur-contrainte** : trop de règles HARD ⇒ `NO_VALID_SOLUTION` fréquents | Élevé | Seules 5 limites de charge retenues ; métrique de taux d'échec par règle ; les fuzz tests révèlent les profils non couverts |
| RE5 | **Sous-contrainte** : trop peu de règles ⇒ programmes absurdes en cas limite | Élevé | Plafonds L4 ; tests de propriétés et métamorphiques ; tests longitudinaux |
| RE6 | **Dérives lentes** sur 6 à 12 mois (inflation des capacités, disparition des décharges, stagnation) | Élevé | Plafonds de progression par cycle ; tests longitudinaux 52 semaines ; détecteurs de dérive |
| RE7 | **Estimation de durée fausse** (For Time, salles bondées) | Moyen-élevé | p90 ≤ disponible, calibration personnelle, métriques par archétype |
| RE8 | **Données utilisateur pauvres ou fausses** (1RM déclaré optimiste) | Moyen | Confiance faible ⇒ RIR prioritaire, calibration, tests |
| RE9 | **Couverture du catalogue insuffisante** pour certains profils de matériel | Moyen | Rapport de couverture en CI ; relâchements tracés ; alertes d'observabilité |
| RE10 | **Instabilité du plan** (trop de révisions) | Moyen | Cible de stabilité, coût de changement, portée minimale, zone gelée |
| RE11 | **Complexité de relecture** des règles par les experts | Moyen | Export lisible, relecture par lots, plages approuvées pour limiter les relectures |
| RE12 | **Comportement en cas de douleur mal calibré** (trop laxiste ou trop alarmiste) | Élevé | Classe G1, avis d'un professionnel de santé recommandé, communication claire, pas de diagnostic |
| RE13 | **Marque HYROX** | Moyen | Identifiant neutre `hybrid_race` ; table des divisions issue d'une source vérifiée ; libellé configurable |

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

## 4. Décisions métier à valider

Chaque décision porte un numéro stable, référencé dans les autres documents.

| N° | Décision proposée | Où |
|----|-------------------|----|
| 1 | Reclasser les 8 dimensions de C6 en **LOAD / STATE / CONSTRAINT / CONTEXT / DERIVED** et **abandonner les 8 budgets hebdomadaires** | [04 §1–2](04-charge-athlete-state.md) |
| 2 | Ne retenir que **5 limites** (L1 récupération minimale, L2 séances intenses, L3 progression locomotrice, L4 plafonds de bon sens, L5 plage de volume musculaire), avec les niveaux proposés | [04 §4](04-charge-athlete-state.md) |
| 3 | **Classes de gouvernance G1–G5** et rôles d'approbation ; l'équipe produit peut ajuster les paramètres G2 **dans une plage approuvée** par l'expert | [09 §4](09-validation-repair-regles.md) |
| 4 | **Politique de blocage du build** : option A, B ou C (recommandation : B avant le lancement, A pour G1 dès la bêta publique) | [09 §6](09-validation-repair-regles.md) |
| 5 | Deux axes indépendants pour les règles : **nature** (SAFETY, FEASIBILITY, HEURISTIC, PREFERENCE, TECHNICAL) × **niveau** (HARD, SOFT, TARGET) | [01 §3](01-architecture-pipeline.md) |
| 6 | **Hiérarchie des priorités en 12 niveaux** (faisabilité et plancher de récupération sortis de « durée » et « récupération » ; ajout de la stabilité et des objectifs secondaires) | [01 §5](01-architecture-pipeline.md) |
| 7 | **Place du plaisir et de l'adhérence** : niveau 11 (avec les préférences) ou plus haut ? | [01 §5](01-architecture-pipeline.md) |
| 8 | **Score lexicographique avec tolérance** plutôt qu'une somme pondérée unique | [01 §4](01-architecture-pipeline.md) |
| 9 | **Coûts ordinaux (0–3)** dans le catalogue et **niveaux de demande ordinaux** (4 niveaux) plutôt que des valeurs continues | [03 §2](03-catalogue.md), [04 §6](04-charge-athlete-state.md) |
| 10 | Lecture de l'état = **catégorie** (`normal` / `caution` / `reduce`) issue de règles explicites ; **aucun score de fatigue** ; sRPE utilisé uniquement en relatif et en interne | [04 §3](04-charge-athlete-state.md) |
| 11 | Liste des **6 structures** du profil de demande (`lower_muscular`, `upper_muscular`, `axial_posterior`, `locomotor`, `high_intensity_systemic`, `grip`) | [04 §6](04-charge-athlete-state.md) |
| 12 | **Taille du catalogue V1** (≈ 250–350 exercices) et presets de matériel supportés (salle, box, salle HYROX, maison équipée, haltères seuls, poids du corps) | [03 §7](03-catalogue.md) |
| 13 | Liste initiale des **patterns** (extensible par données) et granularité des **groupes musculaires** (17) | [03 §4–5](03-catalogue.md) |
| 14 | **Modèle de confiance** par crans (source, ancienneté par paliers, pertinence, cohérence) et effets sur la prescription | [04 §7](04-charge-athlete-state.md) |
| 15 | **Kilomètres hybrides asymétriques** : comptés entièrement pour la contrainte locomotrice, partiellement pour le volume spécifique de course | [04 §5](04-charge-athlete-state.md) |
| 16 | **Matrice L1 de départ** (élevé → élevé ≥ 48 h, élevé ↔ modéré ≥ 24 h), à relire par les experts | [04 §6](04-charge-athlete-state.md) |
| 17 | **Table L2** (séances intenses par semaine selon le niveau ; pas de jours intenses consécutifs pour novice et débutant) | [04 §4](04-charge-athlete-state.md) |
| 18 | **Modèle d'allure** : équivalence de performance (type VDOT / Riegel) comme modèle principal, vitesse critique comme modèle secondaire | [06 §2](06-moteurs-disciplines.md) |
| 19 | **Volume de course piloté en temps**, et en distance pour les objectifs de course | [06 §2](06-moteurs-disciplines.md) |
| 20 | **Tables de dosage de musculation** proposées (plages par objectif), à relire par l'expert | [06 §1](06-moteurs-disciplines.md) |
| 21 | **Sémantique de la durée** : « 60 min » = temps disponible total `A` ; durée cible `T = A − marge` ; contrainte `p90 ≤ A` ; affichage du p50 | [07 §3](07-seance-duree-doublons.md) |
| 22 | **5 profils de tolérance** et leurs plages de départ (asymétriques) | [07 §3.2](07-seance-duree-doublons.md) |
| 23 | **Hiérarchie de réduction** par défaut (stimulus principal préservé, échauffement jamais supprimé) | [07 §3.3](07-seance-duree-doublons.md) |
| 24 | **« On ne remplit pas pour remplir »** : une séance plus courte que la cible est acceptée si rien de pertinent ne peut être ajouté | [07 §3.3](07-seance-duree-doublons.md) |
| 25 | **Répétition prévue déclarée** (`RepetitionIntent`, jamais inférée après coup) + avertissement de stagnation si aucune évolution | [07 §4](07-seance-duree-doublons.md) |
| 26 | Règle HARD anti-doublon : **même WOD (similarité ≥ 0,9) interdit sur 21 jours**, hors retest prévu | [07 §4](07-seance-duree-doublons.md) |
| 27 | Progression : **une variable à la fois**, plafond par cycle, **pas de changement de capacité en milieu de semaine** | [08 §1](08-progression-adaptation.md) |
| 28 | **Questions de feedback** minimales ; RIR demandé uniquement sur la dernière série de travail des ancres | [08 §2](08-progression-adaptation.md) |
| 29 | **Arbre `replanAfterMissedSession`** (SKIP par défaut pour une séance optionnelle, fenêtre de 48–72 h pour une séance clé, jamais de fusion de deux séances clés, pas de doublement) | [08 §3](08-progression-adaptation.md) |
| 30 | **Zone gelée** : les prochaines 24 h ne changent pas sans action de l'utilisateur | [08 §3](08-progression-adaptation.md) |
| 31 | **Rampe de spécificité HYROX** ; simulation complète au plus toutes les 4–6 semaines, aucune dans les 10–14 derniers jours | [06 §4](06-moteurs-disciplines.md) |
| 32 | **Table des substitutions HYROX** avec fidélité ; recommandation d'accès au vrai matériel en phase spécifique | [06 §4](06-moteurs-disciplines.md) |
| 33 | **Catalogue des stimuli de cross-training** et principe « le format sert le stimulus » | [06 §3](06-moteurs-disciplines.md) |
| 34 | **Comportement en cas de douleur** (4 niveaux) en classe G1, avec l'avis d'un professionnel de santé | [09 §7.2](09-validation-repair-regles.md) |
| 35 | **Populations hors périmètre V1** et comportement en cas de drapeau rouge au questionnaire d'aptitude | [09 §7.1](09-validation-repair-regles.md) |
| 36 | **Macro** : proportions des phases, décharge tous les k semaines (k selon le niveau), synchronisée entre disciplines | [05 §1.2](05-planner-interference.md) |
| 37 | **Répartition demandée par l'utilisateur** (« courir 3× ») traitée comme une cible forte, jamais modifiée en silence | [05 §1.2](05-planner-interference.md) |
| 38 | **Objectif secondaire absorbé** par l'objectif principal quand ils sont compatibles (ex. 10 km sans date absorbé par la préparation HYROX), avec réévaluation après l'événement | [12 §3](12-exemple-complet.md) |
| 39 | **Propositions de replanification multiples et classées** ; application directe seulement pour une action explicite de l'utilisateur, sinon confirmation | [08 §3](08-progression-adaptation.md) |
| 40 | **IA** : aucun LLM en V1 (templates) ; après la V1, interprétation du langage naturel en événements structurés **confirmés par l'utilisateur** | [10 §4](10-reason-codes-versioning-observabilite-ia.md) |
| 41 | **Montée de version du moteur** : séances futures régénérées à la frontière de semaine ; correctif de sécurité immédiat | [10 §2](10-reason-codes-versioning-observabilite-ia.md) |
| 42 | **Barrières de CI** proposées, dont le seuil de score de mutation et le processus d'approbation des diffs golden | [11 §7, §10](11-tests.md) |
| 43 | **Trajectoires longitudinales** (improving, plateau, declining, noisy, breakthrough) et détecteurs de dérive | [11 §8](11-tests.md) |
| 44 | **Budgets de performance** (semaine < 300 ms sur mobile, cycle < 2 s côté serveur, simulation de 52 semaines < 30 s en CI) | [01 §8](01-architecture-pipeline.md) |
| 45 | Signalement explicite `GOAL.TARGET_UNASSESSABLE_YET` : **pas d'estimation de temps cible sans données suffisantes** | [12 §1](12-exemple-complet.md) |

## 5. Suite proposée après validation

1. Arbitrage des décisions 1 à 45 (des réponses en bloc sont possibles : « OK sauf 7, 15, 21 »).
2. Production du **contenu** de la section 3 (paramètres, archétypes, catalogue) en format relisible par les experts.
3. Seulement ensuite : implémentation dans l'ordre de la feuille de route de la phase 1 (doc 12), en commençant par `core/`, `rules/`, `catalog/`, `duration/` et leurs tests.
