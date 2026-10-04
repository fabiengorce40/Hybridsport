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

Les gouvernances TEST_ONLY ne servent qu'aux tests. **Aucune** n'est présentée comme une recommandation validée. L'hybride Strength + Running reste refusé par Running en production tant que `GLOBAL_PLANNER_INTEGRATION` et les fenêtres d'interférence ne sont pas décidés. Il n'est accepté que dans l'environnement expérimental Beta 0 (voir « Chemin hybride »).

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

## Chemin hybride Strength + Running

```
profil → programmeDefinitionFromProfile → Programme Engine → Global Planner → Strength (archétype déclaré)
                                                                           → Running (composition DU MOTEUR)
```

### Responsabilités

| Acteur | Décide | Ne décide jamais |
|---|---|---|
| Programme | nombre de séances par sport, cadre d'intention (stimulus, objectif, phase, tolérance), priorité, évaluation déclarée | archétype Running (`composition: 'engine'`) |
| Global Planner | jours, ordre, une séance par jour, interférence, moteur appelé, régénération après composition | rôle ou archétype d'une séance |
| Running | composition hebdomadaire `composeRunningWeek` (§R : KEY / LONG / TEST / EASY), sonde = génération réelle, règles V26 / V10 / V11 | jours attribués |
| Strength | contenu de ses séances | — (archétype V0 `str_full_body` déclaré : aucun choix de split gouverné n'existe) |

### Passe de composition (planificateur)

1. **Avant placement** : les règles de composition sont résolues. Non gouvernées dans le mode → demandes refusées (`governance_blocked`, `RULE.PLANNER.COMPOSITION_UNRESOLVED`), aucun jour réservé.
2. **Réservation** : les jours sont réservés avec l'archétype de complément du moteur (EASY, §R étape 5).
3. **Composition** : Running compose sur les jours réservés. Une séance déclarée par le programme (surcharge d'évaluation TEST) est **verrouillée** : elle **remplace** une séance, elle ne s'y ajoute pas. Le réessai sur créneau plus long (F1) reste actif pour elle.
4. **Régénération** : chaque séance composée est régénérée sur son jour (même graine), puis l'interférence est revérifiée.

Trace par séance :
- `intent` réellement utilisée ;
- `composition { authority: approved | provisional, role }` ;
- `PLAN.PLANNER.COMPOSITION_APPLIED` ;
- lectures de règles (`RULE.RUNNING.CANDIDATE_VALUE_USED`), sans doublon.

### Autorité de l'environnement (jamais un booléen global)

| Autorité | Mode | Valeurs |
|---|---|---|
| `production` | PRODUCTION | approuvées seulement ; un environnement `production` portant des valeurs SIMULATION_ONLY est refusé (`ENVIRONMENT_SIMULATION_IN_PRODUCTION`) |
| `beta0_experimental` | CANDIDATE (sinon `ENVIRONMENT_AUTHORITY_MISMATCH`) | SIMULATION_ONLY déclarées, listées dans `BETA0_SIMULATION` |
| `test_only` | libre | environnements des tests |

Chaque semaine persistée porte `authority` et `simulation`. Une semaine antérieure porte `authority: 'unknown'` (champ additif, rien n'est reconstitué).

### Valeurs SIMULATION_ONLY de `beta0Environment()`

Aucune valeur nouvelle : uniquement des fixtures existantes, source unique `planner/tests/simulation.ts`.
- Écarts d'interférence par structure (`planner.interference.structureWindows`).
- Normalisation des doses (`demand.doseNormalization`).
- `GLOBAL_PLANNER_INTEGRATION` déclaré satisfait pour Running. L'intégration est tenue par la **provenance obligatoire** : `requirePlannerProvenance` refuse tout appel multisport sans la note `kairo.global_planner.v2`, que seul le port Running du planificateur pose.
- Moteur Running en simulation (comme V0).

Les règles de composition V26 / V10 / V11 sont les valeurs **candidates** de la gouvernance Running existante. En PRODUCTION, elles ne sont pas résolues (fail-closed).

Le chemin V0 reste inchangé : hybride Running toujours refusé (`HYBRID_PLANNER_UNAVAILABLE`). Instantané V0 identique avant/après.

### Contrat de lecture UI : `selectBeta0Week(state, today, weekIndex?)`

Projection en lecture seule, sans logique sportive :
- programme ;
- semaine (index, début, statut glissant) ;
- autorité, `experimental`, valeurs de simulation ;
- séances ordonnées : sport, date, statut (planifiée / réalisée / modifiée / abandonnée / manquée / non planifiée), durée cible, archétype, rôle, autorité de composition, catégorie et raison principale si non planifiée, douleur ;
- adhérence descriptive.

Le statut glissant y est calculé sans horizon d'avance gouverné : seule la semaine courante est planifiable.

## Limites connues avant le raccordement de l'UI

- **Hybride** :
  - une séance par jour ;
  - aucune règle de récupération inter-disciplines universelle : seuls les écarts par structure de la gouvernance (SIMULATION_ONLY en Beta 0) s'appliquent ;
  - aucune double séance.
- **Composition sur les jours réservés** : Running compose sur les jours que le planificateur lui a attribués. Si la séance clé exige un TEST trop long pour ces créneaux, Running se replie (traces `WEEK_KEY_FALLBACK`) ; le planificateur ne déplace pas les jours pour la composition.
- **Adaptation** : aucune politique d'adaptation en Beta 0. Les décisions de clôture sont `BLOCKED` : ni progression ni réévaluation automatique, seulement la composition du moteur à partir de l'historique.
- **Strength** : archétype `str_full_body` seulement.

- L'UI est raccordée au chemin Beta 0 (voir `BETA-0-UI.md`) ; le chemin V0 ne sert plus qu'aux profils antérieurs sans programme.
- Aucune correction d'exécution (refus explicite d'une seconde saisie).
- Les historiques CT et HYROX sont stockés faiblement typés (`record(unknown)`), validés aux frontières des moteurs.
- Le stockage est local uniquement.
