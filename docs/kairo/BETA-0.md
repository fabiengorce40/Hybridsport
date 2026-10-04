# KAIRO Beta 0 : définition officielle et invariants de persistance

## Périmètre

| Élément | Beta 0 |
|---|---|
| Sports exposés | Strength, Running |
| Modes | mono-sport ; hybride Strength + Running |
| Orchestration | **Programme Engine = voie principale** ; chemin V0 conservé temporairement (repli et migration) |
| Persistance | local-first : stockage local versionné + export/import ; aucun cloud ni synchronisation |
| Statut | **interne / expérimental** |
| Cross-training, HYROX | présents dans le dépôt et testés, **non exposés** |

### Statut scientifique

Les contenus actuels sont des fixtures provisoires :
- Strength sous autorité `provisional` ;
- Running sous autorité `simulation`.

Les gouvernances TEST_ONLY ne servent qu'aux tests. **Aucune** n'est présentée comme une recommandation validée. L'hybride Strength + Running reste refusé par Running en production tant que `GLOBAL_PLANNER_INTEGRATION` et les fenêtres d'interférence ne sont pas décidés.

## Sécurité : douleur

- **Prédicat unique** : `activePainPause` (app-core/weeks.ts), qui reprend la règle G1 fail-closed existante, sans seuil.
- **Garde commune** : `assertPlanningAllowed`, appliquée par les deux chemins qui écrivent `planner.weeks` (programme et multisport V2).
- **Chemin V0** : la même règle s'applique dans `generateSession`. Toutes les séances de la semaine sont `unavailable`, avec la raison `KAIRO.SAFETY_PAUSE_ACTIVE_PAIN`.
- **Après import** : un état importé avec douleur active reste bloqué.
- **Bibliothèques** : le planificateur et le Programme Engine sont sans état. La frontière persistante est app-core.

## Source de vérité

| Donnée | Propriétaire | Forme |
|---|---|---|
| Semaine planifiée (séances, refus, conflits) | `AppState.planner.weeks[weekStart]` | **canonique** : séances en `session_record` v6 (enveloppe versionnée) ; `owner` unique |
| Programme (intentions, résumé des demandes, décisions) | `AppState.programmeState` | référence la semaine par `plannerRef` ; **aucune prescription recopiée** |
| Exécution | `programmeState.results` | une seule par `requestId` ; preuve référencée (`evidence`) |
| Historiques sportifs | `strength`, `running`, `crosstraining`, `hyrox` | contrats des moteurs ; occurrence = `requestId` |
| Semaines et séances V0 | `plans`, `sessions` | **legacy** : `SessionDraft` brut, `storage: 'legacy_v0'` ; chemin voué à disparaître après Beta 0 |

## Semaines : états et opérations

| État | Définition | Opérations autorisées |
|---|---|---|
| `absent` | aucune semaine persistée | création |
| `planned` | planifiée, aucune exécution | replanification (même propriétaire, ou multisport vers programme) ; exécution |
| `started` | au moins une exécution enregistrée | exécutions des autres séances ; clôture. **Jamais remplacée** |
| `closed` | clôturée par le programme | lecture seule. **Jamais remplacée** ; double clôture refusée |

- Toute écriture passe par `writePlannedWeek`. Les refus sont explicites (`WEEK_NOT_REPLACEABLE`, `WEEK_OWNED_BY_PROGRAMME`), sans fusion implicite.
- Le chemin multisport ne peut jamais remplacer une semaine du programme.

## AppState v2

### Migration v1 → v2 (`migrateV1toV2`)

Déterministe, sans invention, et validée strictement par le schéma v2 :
- les séances V0 reçoivent le marqueur `storage: 'legacy_v0'`, sans provenance ni `session_record` reconstitués ;
- le propriétaire de chaque semaine est déduit de la seule donnée existante : référencée par le programme → `programme`, sinon → `multisport` ;
- une donnée déjà v2 n'est jamais remigrée ;
- une donnée v1 malformée est refusée et sauvegardée, jamais réparée.

### Export / import

- Égalité **sémantique** garantie après relecture.
- L'export JSON n'est pas canonique octet par octet : l'ordre des clés suit le schéma après relecture.
- Testé sur le cycle complet : profil → programme → planification → exécutions → clôture → export → import → reprise → semaine suivante.
- Testé aussi : rechargement à chaque frontière critique, double import.

## Limites connues avant le raccordement de l'UI

- L'UI appelle encore uniquement le chemin V0.
- Aucune correction d'exécution (refus explicite d'une seconde saisie).
- Les historiques CT et HYROX sont stockés faiblement typés (`record(unknown)`), validés aux frontières des moteurs.
- Le stockage est local uniquement.
