# REKKA — RC4.5 lot R-A : diagnostic de reproductibilité (décision D2)

| | |
|---|---|
| **Base** | `cbbdd69` (O1 + O2), branche `claude/kairo-rc4-dev` |
| **Ajout** | `packages/app-core/src/reproducibility.ts` : `diagnoseReproducibility` (une séance) et `weekReproducibility` (une semaine). Ce sont des fonctions pures, en lecture seule. |
| **Inchangé** | Les quatre chemins de démarrage (`start-check.ts` intact, garde de reproductibilité sur l'état courant) ; séances prescrites ; progressions ; Running. Fix-B n'est pas implémenté. |

## Principe

La séance persistée est comparée à deux régénérations à état du jour inconnu :
1. **« maintenant »** : le chemin existant `regenerateSession`, qui lit les historiques arrêtés à la planification avec les progressions courantes ;
2. **« état de planification »** : on ignore en plus les progressions ouvertes après la planification de la semaine.

Une progression qui a seulement *avancé* depuis la planification ne peut pas être relue à son état d'alors : les progressions ne sont pas versionnées. L'écart qu'elle produit est classé à part.

| Classe | Signification |
|---|---|
| `identical` | Séance prescrite identique : blocs, exercices, séries, répétitions, charges. |
| `progression_since_planning` | Mêmes exercices, séries et RIR. Seules des prescriptions fines (répétitions, charge) ont avancé avec les progressions. C'est l'adaptation voulue. |
| `history_since_planning` | Le contenu diffère maintenant, mais il est reproduit depuis l'état de planification : des progressions ont été créées depuis par les séances réalisées. |
| **`planner_divergence`** | **Indicateur distinct.** Le contenu diffère même depuis l'état de planification : la séance a été générée face à des versions intermédiaires des autres séances de la semaine. |
| `not_regenerable` | Séance non placée, sport non régénérable, ou refus du moteur. |

`weekReproducibility` donne les effectifs par classe, `contentReproducible` et **`plannerDivergences`**.

## Résultat : profil de consolidation, 12 séances Musculation sur 4 semaines

Le diagnostic est fait juste avant chaque séance, comme au démarrage.

| Classe | Séances |
|---|---|
| `history_since_planning` | S1-2, S1-3 |
| `progression_since_planning` | S2-2, S2-3, S3-3, S4-3 |
| `planner_divergence` | S1-1, S2-1, S3-1, S3-2, S4-1, S4-2 |

- **Contenu reproduit : 6 / 12. Divergences du planificateur : 6 / 12.** Ces 6 séances sont exactement celles déjà classées « planificateur » dans l'étude (`RC4.5-DECISION-R1BIS-REPRO-F8BIS-PERF.md`, § 2).
- **Contrôle croisé :** les divergences relevées par `weekReproducibility` **dès la planification** (aucune séance de la semaine réalisée) sont exactement les mêmes 6 séances. L'indicateur du planificateur ne dépend donc pas de l'historique de la semaine.
- **Cohérence avec la garde de démarrage, qui n'est pas modifiée :** « contenu identique maintenant » équivaut aux classes `identical` ou `progression_since_planning`, pour les 12 séances.

## Tests (`tests/rc45/reproducibility-diagnostic.test.ts`)

- L'état n'est jamais modifié par le diagnostic.
- Cohérence avec la garde des chemins de démarrage.
- Classes du profil de consolidation (ci-dessus).
- Indicateur hebdomadaire égal à l'indicateur au démarrage.
- Aucun module de l'application n'utilise le diagnostic (chemins de démarrage compris).

## Validation

- `pnpm check` : 2 925 tests réussis, 2 ignorés (déjà ignorés auparavant).
- `pnpm kairo:build` : OK.
- `pnpm kairo:e2e` : OK.
- Banc RC4 : identique à O1 + O2.
