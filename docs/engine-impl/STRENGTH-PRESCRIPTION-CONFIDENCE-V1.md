# STRENGTH-PRESCRIPTION-CONFIDENCE-V1 — algorithme ordinal

> Document **généré** depuis `strength.prescriptionConfidence` (ruleset candidat) et `assessMeasured` : ne pas éditer à la main.

Règles `pc-1.0.0` (G2, `PROGRAMMING_HEURISTIC`) : **aucun coefficient, aucune somme pondérée** — des facteurs qualitatifs tracés (`DOSE.LOAD.CONFIDENCE`) combinés par des règles ordonnées.

## 1. Facteurs

| Facteur (4E §E) | Définition | Paramètre |
|---|---|---|
| récence | fraîche ≤ 42 j · vieillissante ≤ 112 j · ancienne ≤ 365 j · expirée au-delà | `strength.load.referenceWindowsDays` (existant) |
| spécificité | données de CET exercice (mesurées) > capacité déclarée > transfert d’un équivalent | hiérarchie de référence |
| observations utilisables | séries valides pour l’estimation, dans la fenêtre vieillissante | `high.minObservations` = 4 |
| séances distinctes | nombre de dates d’exposition | `high.minSessions` = 2 |
| cohérence | dispersion (max − min) / médiane des estimations ≤ tolérance | `strength.load.conflictTolerance` (existant) = 0.15 |
| incertitude du RIR | RIR absent sur une série, ou niveau ∈ {novice, beginner} | `rirUncertainLevels` |
| cohérence charge / reps | estimation hors plage valide ⇒ borne inférieure seule (LOW) | `strength.load.validRepRange` (existant) |
| pénalité de transfert | 1 cran(s), jamais HIGH | `strength.load.equivalenceTransferPenalty` (existant) |
| conflit | écart avec une capacité déclarée au-delà de la tolérance ⇒ un cran de moins | `strength.load.conflictTolerance` |
| capacité déclarée | jamais au-dessus de MEDIUM | `declaredCap` |

## 2. Règles (dans l’ordre)

1. Récence expirée ⇒ `none` (calibration prudente).
2. **HIGH** seulement si **toutes** les conditions : ≥ 2 séances ET ≥ 4 observations, données fraîches, cohérentes, RIR fiable, aucune donnée transférée.
3. Sinon **MEDIUM** si les données sont fraîches ou vieillissantes ; sinon **LOW**.
4. Conflit avec une capacité déclarée ⇒ un cran de moins.
5. Capacité déclarée : niveau de sa source, dégradé par l’âge, plafonné, puis conflit.
6. Transfert : pénalité de transfert, plafonné à MEDIUM.

Effet : HIGH ⇒ charge prescrite (ou % d’e1RM) ; MEDIUM ⇒ charge **suggérée** + effort, montée spécifique en relatif ; LOW ⇒ effort + fourchette indicative ; none ⇒ calibration à l’effort.

## 3. Hiérarchie de référence de charge

1. Données spécifiques récentes fiables : série à ± `repsTolerance` répétition(s) et ± `rirTolerance` RIR de la cible, RIR connu, fenêtre fraîche (`strength.load.specificObservation`) ;
2. historique de l’exercice (dernière charge réalisée, e1RM lissé de la track quand le modèle autorégulé la porte) ;
3. modèle personnel (`PersonalLoadModel` : **contrat seulement**, non implémenté, aucune ML) ;
4. e1RM générique (formule d’Epley, table `pctByRepsToFailure`) : **repli d’amorçage**, jamais au-dessus d’une donnée spécifique fiable ;
5. calibration prudente (`strength.calibration`).

## 4. Exemples calculés

| Cas | Niveau | Facteurs |
|---|---|---|
| 2 séances, 4 séries avec RIR, fraîches, cohérentes | **HIGH** | récence fresh · 4 obs · 2 séance(s) · consistent · RIR reliable |
| 1 séance, 4 séries | **MEDIUM** | récence fresh · 4 obs · 1 séance(s) · consistent · RIR reliable |
| 2 séances, 2 séries | **MEDIUM** | récence fresh · 2 obs · 2 séance(s) · consistent · RIR reliable |
| 2 séances, 4 séries, un RIR absent | **MEDIUM** | récence fresh · 4 obs · 2 séance(s) · consistent · RIR uncertain |
| 2 séances, 4 séries, niveau débutant | **MEDIUM** | récence fresh · 4 obs · 2 séance(s) · consistent · RIR uncertain |
| 2 séances, 4 séries, estimations dispersées (> tolérance) | **MEDIUM** | récence fresh · 4 obs · 2 séance(s) · inconsistent · RIR reliable |
| 2 séances, 4 séries, conflit avec une capacité déclarée | **MEDIUM** | récence fresh · 4 obs · 2 séance(s) · consistent · RIR reliable · conflit |
| dernière séance à 60 jours | **MEDIUM** | récence aging · 4 obs · 2 séance(s) · consistent · RIR reliable |
| dernière séance à 200 jours | **LOW** | récence old · 4 obs · 2 séance(s) · consistent · RIR reliable |

## 5. Limites

- Les seuils de séances et d’observations sont des heuristiques ; la dégradation par l’éloignement de l’échec (RIR élevé) n’est **pas** modélisée faute de source lue.
- `strength.calibration.mediumAfterExposures` / `highAfterExposures` ne sont lus par aucun code (dette du ruleset 0.2.0) ; la V1 les remplace sans les modifier.
