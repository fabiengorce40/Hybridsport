# RUNNING-RECENT-LOAD-CONTEXT — contexte de charge récente (remplace la « bande habituelle »)

> **Phase 5D (corrections B4 et S).** Documentation seulement.
>
> - **Renommage** : la « bande habituelle » (V21, min / max des 4 semaines) devient **`RecentLoadContext`**.
> - **Portée** : c’est un **contexte de programmation**. Ce n’est **ni une bande de sécurité, ni une bande de tolérance**, et il n’infère **aucun risque de blessure**.
> - **Pas d’ACWR.**
> - Ce n’est **pas un nouveau concept d’architecture** : il remplace et précise un paramètre existant.

## 1. Ce que le contexte sert à décider

| Usage | Question posée | Ce qu’il ne dit pas |
|---|---|---|
| LCA | La semaine prévue dépasse-t-elle ce que l’athlète a **réellement réalisé récemment** ? | Si c’est sûr ou toléré |
| Progression | Une valeur proposée est-elle une **restauration** d’une dose déjà démontrée, ou une **nouvelle** hausse ? | La hausse admissible (V23, non résolu) |
| Rééquilibrage | Faut-il raccourcir les séances EASY ? | — |

## 2. Méthodes d’agrégation comparées

| Méthode | Principe | Semaine aberrante | Semaine manquante | Semaine à zéro | Progression rapide | Reprise | Risque d’interprétation | Décision |
|---|---|---|---|---|---|---|---|---|
| Min / max sur 4 semaines (5C) | Bande [min, max] | Le max est entraîné par l’aberration ; le min par une semaine creuse | Réduit l’échantillon | Le min tombe à 0 | Le max suit | Mélange avant / après la coupure | **Élevé** : lu comme « zone sûre » | **Rejetée comme bande** |
| Médiane | Niveau typique | Robuste | Robuste si ≥ 3 semaines | Robuste (une semaine à zéro sur 4 ne domine pas) | Retard (lent à suivre) | idem | Faible | **Retenue** comme niveau typique |
| Quantiles (P25–P75) | Bande robuste | Robuste | Instable sur 4 points | Robuste | Retard | idem | Moyen (encore une « bande ») ; quantiles peu définis sur 4 valeurs | Non retenue (échantillon trop petit) |
| Moyenne pondérée exponentielle | Lissage | Atténuée | Imputation nécessaire | Tirée vers 0 | Suit partiellement | idem | Composante proche de l’ACWR ; constante de lissage arbitraire | **Non retenue** (FUTURE_RFC éventuelle) |
| Historique simple, sans bande | Liste des semaines | — | Visible | Visible | Visible | Visible | Nul | **Retenue** comme donnée brute, exposée dans la trace |

## 3. Décision : `RecentLoadContext`

Par dimension (durée hebdomadaire, distance si mesurée, fréquence, long run, exposition haute intensité, exposition modérée à forte, charge interne sRPE, charge locomotrice concurrente) :

| Champ | Définition | Provenance |
|---|---|---|
| `weeks[]` | Les **N** dernières semaines complètes, valeur ou **UNKNOWN** | N = **4** par défaut, configurable (EXPERT_PROPOSED, PROGRAMMING_HEURISTIC) |
| `typicalLevel` | **Médiane** des semaines connues | EXPERT_PROPOSED |
| `recentDemonstrated` | **Maximum réalisé** d’une semaine connue **sans retour négatif** (pas de douleur, pas de MUCH_HARDER) | EXPERT_PROPOSED |
| `flags` | `MISSING_WEEK`, `ZERO_WEEK`, `OUTLIER_WEEK` (valeur > 2 × médiane : seuil de signalement EXPERT_PROPOSED, sans effet de décision), `POST_RETURN_ONLY`, `INSUFFICIENT_HISTORY` | TECHNICAL / EXPERT_PROPOSED |
| `status` | `AVAILABLE` / `UNKNOWN` | TECHNICAL |

**Règles**
1. **Semaine manquante** (aucune donnée) : UNKNOWN, **exclue**, jamais 0.
2. **Semaine à zéro déclarée** (aucune course confirmée) : 0, comptée, signalée `ZERO_WEEK`.
3. **Moins de 2 semaines connues sur N** : `status = UNKNOWN` (`INSUFFICIENT_HISTORY`) ⇒ la dimension est traitée comme UNKNOWN (I2).
4. **Semaine aberrante** : conservée ; signalée ; elle peut entraîner `recentDemonstrated` seulement si elle est sans retour négatif. Si elle est déclarée de façon suspecte (conflit avec les autres données), la revue est demandée.
5. **Reprise** (MODERATE, LONG, UNKNOWN) : le contexte **ne contient que les semaines post-retour** (`POST_RETURN_ONLY`) ; les semaines d’avant la coupure restent dans l’historique, mais ne servent pas de niveau démontré actuel.
6. **Progression rapide** : `recentDemonstrated` suit la meilleure semaine récente réalisée sans retour négatif ; la médiane reste un repère de niveau typique.

**Classes de la LCA** (catégories opérationnelles) :
- **WITHIN_RECENT_CONTEXT** : valeur prévue ≤ `recentDemonstrated` ;
- **INCREASE_BEYOND_CONTEXT** : valeur prévue > `recentDemonstrated`, évaluée par les règles de progression (V23 non résolu ⇒ HOLD, sauf test demandé) ;
- **MULTI_DIMENSION_INCREASE** : plus d’une dimension au-delà du contexte ⇒ refusé ;
- **LARGE_INCREASE** : V22 (P-R0–1) ;
- **UNKNOWN_CONTEXT** : dimension UNKNOWN ⇒ pas de progression sur cette dimension.

**Un niveau démontré n’est pas un niveau sûr** : il dit seulement que l’athlète l’a réalisé récemment sans retour négatif.

## 4. Effet sur les goldens 5C

| Scénario | 5C (bande min / max) | 5D (RecentLoadContext) | Changement |
|---|---|---|---|
| R2 | Bande 90–110 ; semaine 110 = borne haute | `recentDemonstrated` 110 ; semaine 110 ⇒ WITHIN | Aucun |
| R3 | 150–170 ; 153 | Démontré 170 ; 153 ⇒ WITHIN | Aucun |
| R4 | 200–225 ; 207 | Démontré 225 ; long run démontré 90 ⇒ **restauration possible** (voir les goldens V1) | Nouveau : progression par restauration |
| R5 | 290–310 ; 282 (sous la bande) | Démontré 310 ; 282 ⇒ WITHIN (la notion de « sous la bande » disparaît : aucun plancher) | Libellé seulement |
| R6, R7, R9, R12 | Dans la bande | WITHIN | Aucun |
| R8 | — | `POST_RETURN_ONLY` : aucune semaine post-retour ⇒ UNKNOWN_CONTEXT | Aucun (déjà bloqué) |

## 5. Ce qui reste non scientifique

- N = 4, la médiane et le maximum démontré sont des **choix de programmation** (EXPERT_PROPOSED).
- Aucune source ne valide une fenêtre ou une agrégation pour la programmation de la course. Impellizzeri 2020 met seulement en garde contre les ratios et leurs artefacts.
