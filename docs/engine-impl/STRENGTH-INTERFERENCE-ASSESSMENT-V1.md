# STRENGTH-INTERFERENCE-ASSESSMENT-V1 — matrice et frontières d’autorité

> Document **généré** depuis `strength.interference.assessment` (ruleset candidat) et `assessNeighborStructure` : ne pas éditer à la main.

## 1. Entrées

| Entrée (4E §F) | Source dans le contexte | Rôle |
|---|---|---|
| `temporalProximity` | `week.neighbors[].hoursFromThisSession` (avant ou après, symétrique) | bandes de proximité |
| `structuralOverlap` | structures sollicitées par les exercices proposés (table de dérivation du CORE, seuil `touchThreshold`) ou optionnels retirés | conditionne le signal au planificateur ; les ajustements ne touchent que les exercices qui sollicitent la structure |
| `enduranceModality` | profil de demande transmis par le planificateur (`locomotor_impact` pour la course) | modificateur d’impact |
| `sessionImportance` | `priority` (key / standard / optional) | delta d’importance |
| `expectedFatigue` | niveau de demande par structure (none / low / moderate / high) | niveau de base |
| `locomotorImpact` | demande `locomotor_impact` | +1 si haute ET demande de la structure déjà haute |
| `gripDemand` | structure `grip` | évaluée comme toute structure (exclusion F9 si HIGH) |

## 2. Calcul (ordinal, sans coefficient)

`niveau = demande (low 1, moderate 2, high 3) + importance + bande de proximité + modificateurs d’impact`, borné à NONE (0)…VERY_HIGH (4).

- Fenêtre de recherche : 72 h (au-delà, voisine ignorée). **36 h n’est plus une frontière binaire.**
- Bandes : ≤ 12 h : +1 · ≤ 24 h : +0 · ≤ 48 h : -1 · au-delà : -2
- Importance : key 0 · standard -1 · optional -2
- Modificateurs : demande `locomotor_impact` ≥ high et structure ∈ {lower_knee, lower_hip} à demande ≥ high : +1
- Le niveau retenu par structure est le plus élevé des voisines ; chaque couple (voisine, structure) est tracé (`PLAN.INTERFERENCE_ASSESSED`).

## 3. Actions graduées

| Niveau | Action | Effet |
|---|---|---|
| NONE | `none` | aucun |
| LOW | `trace` | trace seulement |
| MODERATE | `rir_only` | RIR + `rirDelta` de la structure sur les exercices qui la sollicitent ; aucune série retirée, aucune exclusion, aucun optionnel retiré |
| HIGH | `full` | ajustement complet de la structure (séries, RIR, exclusion F9, optionnels retirés) — règle historique |
| VERY_HIGH | `full_and_signal` | ajustement complet + `PLAN.INTERFERENCE_SIGNAL` au planificateur si la séance recouvre la structure |

Les notes du planificateur (`plannerNotes`) et la semaine inconnue gardent leur effet historique (abaissement complet).

## 4. Matrice (structure `lower_knee`, sans puis avec impact locomoteur haut)

| Demande | Importance | ≤ 12 h | ≤ 24 h | ≤ 48 h | ≤ 72 h |
|---|---|---|---|---|---|
| high | key | VERY_HIGH / VERY_HIGH | HIGH / VERY_HIGH | MODERATE / HIGH | LOW / MODERATE |
| high | standard | HIGH / VERY_HIGH | MODERATE / HIGH | LOW / MODERATE | NONE / LOW |
| high | optional | MODERATE / HIGH | LOW / MODERATE | NONE / LOW | NONE / NONE |
| moderate | key | HIGH / HIGH | MODERATE / MODERATE | LOW / LOW | NONE / NONE |
| moderate | standard | MODERATE / MODERATE | LOW / LOW | NONE / NONE | NONE / NONE |
| moderate | optional | LOW / LOW | NONE / NONE | NONE / NONE | NONE / NONE |
| low | key | MODERATE / MODERATE | LOW / LOW | NONE / NONE | NONE / NONE |
| low | standard | LOW / LOW | NONE / NONE | NONE / NONE | NONE / NONE |
| low | optional | NONE / NONE | NONE / NONE | NONE / NONE | NONE / NONE |

## 5. Frontières d’autorité

- Le StrengthEngine **consomme** le contexte hebdomadaire ; il ne déplace, ne supprime ni ne reprogramme **jamais** une séance, et ne change jamais le stimulus demandé.
- VERY_HIGH ⇒ **signal structuré** (`PLAN.INTERFERENCE_SIGNAL {structure, level, source, overlap}`) dans la proposition : le planificateur global reste seul décideur.
- Si l’objet de l’archétype devient impossible, le moteur répond `no_valid_proposal` (`PLAN.CONTEXT_INCOMPATIBLE`), comme en 0.2.0.
- Statut : `PROGRAMMING_HEURISTIC` — mécanismes soutenus selon le contexte (Wilson 2012 ; Lundberg 2022), bandes et deltas heuristiques.
