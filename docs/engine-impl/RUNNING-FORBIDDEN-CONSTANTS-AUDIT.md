# RUNNING-FORBIDDEN-CONSTANTS-AUDIT — audit des constantes interdites

> **Phase 5B (section AA).**
>
> - **Périmètre** : les 9 documents 5A (`docs/engine-impl/RUNNING-*`) et les documents d’architecture initiaux (`docs/architecture/*`).
> - **Méthode** : recherche systématique des motifs 80/20, 10 %, ACWR / aigu-chronique, 5 zones, 24 h, VDOT / Daniels, part du long run, fréquence fixe, % d’allure easy, % de seuil, % d’intervalle, taper fixe, période de reprise fixe, et des bornes horaires voisines (48 h, 6 h, J-5).
> - **Les documents d’architecture verrouillés ne sont PAS modifiés** ; ce document consigne les corrections à y porter après validation.
>
> **Classes**
> - REMOVE : à supprimer ;
> - REPLACE : à remplacer par le concept 5A / 5B indiqué ;
> - KEEP_AS_HEURISTIC : à conserver comme heuristique gouvernée, sans valeur de vérité ;
> - KEEP_AS_HISTORICAL_REFERENCE : citation de source, exemple ou entrée de scénario, sans valeur de règle ;
> - REQUIRES_EVIDENCE : à conserver seulement si une preuve est apportée, sinon à retirer.

## 1. Documents d’architecture (non modifiés)

| # | Emplacement | Occurrence | Motif | Classe | Remplacement / justification |
|---|---|---|---|---|---|
| A1 | `04-moteur-entrainement.md` l. 84 | « charge (ACWR) » | ACWR | **REPLACE** | LOAD CHANGE ASSESSMENT multidimensionnelle ; ACWR non soutenu (Impellizzeri 2020) |
| A2 | `04` l. 132 | « Fenêtres 7/14/28 j par dimension » | fenêtres fixes | **KEEP_AS_HEURISTIC** | `running.load.baselineWindows` (PROGRAMMING_HEURISTIC, valeurs à justifier) |
| A3 | `04` l. 132 | « ratio aigu/chronique par dimension » | ACWR | **REPLACE** | Comparaison à la base récente par dimension, sans ratio comme autorité |
| A4 | `04` l. 142 | `minutesByZone: Record<IntensityZone, number>` | zones | **REPLACE** | Temps par domaine interne (`RunningIntensityDomain`) |
| A5 | `04` l. 159 | `maxHighIntensitySessions` | fréquence d’intensité fixe | **KEEP_AS_HEURISTIC** | `running.hi.densityPolicy` (PRODUCT_GUARDRAIL + EXPERT_DESIGN_REVIEW, sans valeur) |
| A6 | `04` l. 159 | `minLowIntensityShare` | part facile minimale (type 80/20) | **REQUIRES_EVIDENCE** | TID émergente ; aucune part minimale sans preuve (Oliveira 2024) |
| A7 | `04` l. 161 | `maxMinutesHighZones` | zones + plafond | **REPLACE** | Exposition à haute intensité (dimension `highIntensityExposure`) évaluée par la LCA |
| A8 | `04` l. 192 | « Jambes lourdes (> 80 % 1RM) … ≥ 24 h … Dure » | 24 h | **REPLACE** | Contrainte de placement déclarative ; bandes de proximité de l’InterferenceManager (PROGRAMMING_HEURISTIC) ; aucun espacement universel (Huiberts 2024). Le seuil « > 80 % 1RM » relève du domaine Strength : hors périmètre Running. |
| A9 | `04` l. 192 | « préférable : la course clé avant » | ordre | **KEEP_AS_HEURISTIC** | `running.placement.heavyLowerOrderPolicy` (souple) |
| A10 | `04` l. 193 | « ≥ 6 h d’écart » entre deux séances intenses le même jour | horaire fixe | **REQUIRES_EVIDENCE** | Doubles séances hors V1 Running ; sinon paramètre de l’InterferenceManager |
| A11 | `04` l. 195 | « Hausse hebdo de la contribution bornée ET ratio aigu/chronique sous un seuil » (Dure) | 10 % implicite + ACWR | **REPLACE** | LCA : catégories opérationnelles (PRODUCT_GUARDRAIL) ; pas de ratio |
| A12 | `04` l. 196 ; `05` l. 72 | « < 48 h » même groupe ; « ≥ 48 h » même pattern | horaire fixe | **KEEP_AS_HISTORICAL_REFERENCE** | Règles du domaine Strength / anti-doublon, hors périmètre Running |
| A13 | `04` l. 198 | « Affûtage … suppression des séances à fort coût neuromusculaire J-5 → J » (Dure) | taper fixe | **REQUIRES_EVIDENCE** | `TaperPolicy` : principe SUPPORTED ; durée CONTEXT_DEPENDENT ; taper non obligatoire |
| A14 | `04` l. 244 | « modèle type VDOT/Daniels ou vitesse critique » | VDOT | **REPLACE** | Modèle multi-référence ; VDOT n’est pas une autorité ; famille d’extrapolation = EXPERT_DESIGN_REVIEW |
| A15 | `04` l. 244 | « test planifié (5 km ou 30 min) en semaine 1–2 » | test précoce | **KEEP_AS_HEURISTIC** | Autorisé pour P-R1 et plus ; pas de test maximal d’entrée pour P-R0 (G1 NOVICE_ENTRY) |
| A16 | `04` l. 245 | « Zones d’intensité (5 zones) » | 5 zones | **REPLACE** | 3 domaines internes + catégories d’usage ; 5 niveaux possibles à l’affichage seulement |
| A17 | `04` l. 246 | « majoritairement facile (type 80/20) » | 80/20 | **REMOVE** | TID émergente ; 80/20 rejetée comme règle universelle |
| A18 | `04` l. 246 | « 1–2 séances de qualité/semaine selon niveau » | fréquence fixe | **KEEP_AS_HEURISTIC** | `running.hi.densityPolicy` sans valeur ; à justifier par l’expert |
| A19 | `04` l. 247 ; `07` l. 41 | « sortie longue (part du volume hebdo plafonnée) » | long run % | **REMOVE** | Progression relative à l’historique propre du long run (`running.longRun.progressionPolicy`) |
| A20 | `04` l. 276 ; `08` l. 54, l. 86 | « espacer les séances clés de 48 h » ; « ≤ 48 h » ; « garder 48 h après tes squats » | horaire fixe | **REPLACE** | Contraintes déclaratives (`keyAdjacencyPolicy`, `heavyLowerOrderPolicy`) ; la fenêtre de replacement d’une séance manquée est un paramètre de l’AdaptationEngine (PROGRAMMING_HEURISTIC) |
| A21 | `07` l. 15 | « VDOT/vitesse critique ; hausse plafonnée par cycle » | VDOT + plafond | **REPLACE** | `upgradeEvidencePolicy` (B1) + `substantialUpgradeBound` (PROGRAMMING_HEURISTIC) |
| A22 | `07` l. 32 | « 2 échecs consécutifs ⇒ réduction (−5 à −10 %) » | % fixe | **REQUIRES_EVIDENCE** | Côté course : baisse de référence sur observations concordantes (§F.4) ; aucun pourcentage |
| A23 | `07` l. 38 | « semaine de décharge toutes les 3–4 semaines » | période fixe | **KEEP_AS_HEURISTIC** | `running.progression.deloadPolicy` (EXPERT_DESIGN_REVIEW : périodique ou conditionnelle) |
| A24 | `08` l. 56 | « ≥ 1 semaine d’absence » | période de reprise | **KEEP_AS_HEURISTIC** | Exemple ; frontières des états de reprise en paramètre (`return.stateBoundaries`, G1 pour LONG) |
| A25 | `08` l. 84 | « prochaines 24 h ne changent pas » (zone gelée) | 24 h | **KEEP_AS_HEURISTIC** | Règle produit d’interface, non physiologique ; conservée |
| A26 | `09-validation.md` l. 18 | « décharges présentes, affûtage avant événement » (validation) | décharge et taper obligatoires | **REPLACE** | La décharge dépend de la politique ; le taper n’est pas obligatoire (TaperPolicy.eligibility) |
| A27 | `02-modele-donnees.md` l. 190, l. 192 | `zone?: IntensityZone` dans les segments de course | zones | **REPLACE** | `RunningTarget.domain` + plages (RFC CORE-EXT-R1, option B) |
| A28 | `02` l. 269 | `CapacityEstimate` clé `'vdot'`, `confidence: number` | VDOT + score | **REPLACE** | `RunningReference` / `PerformanceEstimate` ; confiance ordinale (LOW / MEDIUM / HIGH) |
| A29 | `02` l. 146 | Phases `base / build / peak / taper / deload / transition / test` | phases | **KEEP_AS_HISTORICAL_REFERENCE** | Correspondance avec FOUNDATION … RETURN à établir ; aucune constante |
| A30 | `13-design-system.md` l. 24 | `intensity.z1 … z5` | 5 niveaux | **KEEP_AS_HEURISTIC** | Échelle de **présentation** (TECHNICAL) ; pas un modèle interne |
| A31 | `12-roadmap.md` l. 37 | « allures, zones, … affûtage » | zones | **REPLACE** | Libellé à ajuster : domaines d’intensité ; taper selon la politique |
| A32 | `06-calcul-duree.md` l. 44, l. 63 ; `README.md` l. 56 | « ±10 % (min ±5 min) » | 10 % | **KEEP_AS_HEURISTIC** | Tolérance de **durée de séance**, déjà déclarée hypothèse ; sans rapport avec la progression de charge |
| A33 | `05-anti-doublon.md` l. 69 | « même WOD interdit sur 21 jours » | 21 jours | **KEEP_AS_HISTORICAL_REFERENCE** | Anti-doublon, sans rapport avec le taper |
| A34 | `10-strategie-tests.md` l. 45, l. 73 | « 1–3 semaines d’arrêt » ; « reprise après 3 semaines » | période de reprise | **KEEP_AS_HISTORICAL_REFERENCE** | Scénarios de test, pas des règles |

## 2. Documents 5A

| # | Emplacement | Occurrence | Classe | Traitement 5B |
|---|---|---|---|---|
| R1 | `RUNNING-V1-DOMAIN-SPEC.md` §A.1 | « une allure unique » pour `distance` | **REPLACE** (erreur factuelle) | Corrigé : `paceSecPerKm` est déjà une plage |
| R2 | `RUNNING-V1-REFERENCE-MODEL.md` §F.3 | « Hausse de référence : exige une référence nouvelle de type performance » | **REPLACE** (B1) | Corrigé : preuve suffisamment fiable, dont observations multiples cohérentes |
| R3 | `RUNNING-V1-LOAD-PROGRESSION-SPEC.md` §X.3 point 5 | « Intensité ou allure en dernier » | **REMOVE** (B2) | Corrigé : une variable dominante, sans priorité universelle |
| R4 | idem §Q.2 | Bornes des classes LCA « garde-fous … SAFETY_SIGNOFF_REQUIRED », G1 `LOAD-INCREASE-BOUND` | **REPLACE** (B3, B5) | Corrigé : catégories opérationnelles ; PRODUCT_GUARDRAIL, G1 seulement en contexte NOVICE / RETURN |
| R5 | idem §T.2 | « 41–60 % … plage de départ » | **REPLACE** (B4) | Corrigé : signal de preuve non prescriptif ; quatre composantes séparées |
| R6 | idem §R.4 | 7 G1 candidats | **REPLACE** (B5) | Renvoi à la revue G1 (4 G1_SAFETY) |
| R7 | `RUNNING-EVIDENCE-REVIEW-PACK.md` (lignes sources) | 41–60 %, ≤ 21 jours, 10 %, 24 %, > 30 %, « 2 à 3 HIIT » | **KEEP_AS_HISTORICAL_REFERENCE** | Citations de sources, attribuées ; jamais des constantes |
| R8 | `RUNNING-V1-SESSION-TAXONOMY.md` §P | « 2 à 3 séances HIIT par semaine » | **KEEP_AS_HISTORICAL_REFERENCE** | Déjà marqué « ne devient pas une constante » |
| R9 | `RUNNING-V1-SESSION-TAXONOMY.md` §I | RECOVERY_RUN, THRESHOLD_INTERVALS / CONTINUOUS_THRESHOLD distincts | **REPLACE** (arbitrage §J) | Note de fusion ajoutée ; fiches conservées comme trace |
| R10 | `RUNNING-V1-REFERENCE-MODEL.md` §Z.2 | « Une seule observation ⇒ plafonnée à MEDIUM (hypothèse) » | **KEEP_AS_HEURISTIC** | `running.confidence.singleObservationCap` (EXPERT_DESIGN_REVIEW) |
| R11 | `RUNNING-SCIENCE-REGISTRY-DRAFT.md` | `upgradeRequiresPerformance`, `changeAssessment.bounds` (G1), `tenPercentRule` (INSUFFICIENT_EVIDENCE), taper « plage de départ » | **REPLACE** | Brouillon remplacé par le registre scientifique V1 et le registre des paramètres V0 (bandeau ajouté) |
| R12 | `RUNNING-V1-GOLDEN-SCENARIOS.md` | « 2 à 3 séances », « 3 séances », « 5 séances » | **KEEP_AS_HISTORICAL_REFERENCE** | Entrées de scénario définies par la mission, pas des recommandations |
| R13 | `RUNNING-V1-DOMAIN-SPEC.md` §AG, `RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC.md` | Mentions de 80/20, 24 h, VDOT, ACWR | **KEEP_AS_HISTORICAL_REFERENCE** | Mentions critiques (table de divergences) |
| R14 | `RUNNING-V1-LOAD-PROGRESSION-SPEC.md` §S | « zone gelée 24 h » | **KEEP_AS_HEURISTIC** | Règle produit (voir A25) |

**Motifs recherchés sans occurrence** dans les 5A :
- pourcentage fixe d’allure easy ;
- pourcentage fixe de seuil ;
- pourcentage fixe d’intervalle ;
- période de reprise fixe ;
- fréquence fixe par niveau.

## 3. Bilan

| Classe | Architecture | 5A | Total |
|---|---|---|---|
| REMOVE | 2 | 1 | 3 |
| REPLACE | 14 | 7 | 21 |
| KEEP_AS_HEURISTIC | 10 | 2 | 12 |
| KEEP_AS_HISTORICAL_REFERENCE | 4 | 4 | 8 |
| REQUIRES_EVIDENCE | 4 | 0 | 4 |
| **Total (lignes d’audit)** | **34** | **14** | **48** |

Une ligne peut regrouper plusieurs emplacements du même motif (A12, A19, A20, A32, A34). Les corrections des documents d’architecture sont **différées** : elles exigent la validation du contre-audit, et ces documents restent verrouillés en 5B.
