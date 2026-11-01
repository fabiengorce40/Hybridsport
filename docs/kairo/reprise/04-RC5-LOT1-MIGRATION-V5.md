# Reprise RC5 — Lot 1 : contenus versionnés, sauvegarde avant migration, format v5

- **Branche :** `claude/rekka-reprise-20261031`, locale.
- **Décisions appliquées :** D3 (v5 additif, détection des versions incompatibles, sauvegarde avant migration). D1 : R3 non repris.
- Aucune règle scientifique modifiée, aucune prescription changée, aucun code RC5 sportif intégré dans ce lot.

## 1. Contenus Strength versionnés (collision corrigée)

| Avant | Après |
|---|---|
| `personalizedStrengthContent` nommait toujours son contenu `0.8.0-strength-personalization-v1`, quelle que soit sa base. Après RC5.1, ce nom aurait désigné un **autre** contenu que celui des semaines V2.1/V2.2 déjà générées, dont l'ESSAI. | `personalizedRulesetVersion(base)` : le **nom historique est conservé** pour la base L1b-4, donc les prescriptions actuelles et historiques sont inchangées. Toute autre base reçoit `<base>+personalization-v1`. |
| Registre implicite, L1b-4 = « contenu courant » | `strengthContentRegistry()` : contenu courant, L1b-4 explicite (et sa personnalisation), L1-V3, F6, 4F. L1b-4 reste relisible quand RC5.1 deviendra le contenu courant. |

Tests :
- le nom historique est conservé sur L1b-4 ;
- une autre base reçoit un nom dérivé ;
- **aucune version ne désigne deux contenus différents** ;
- une semaine personnalisée générée aujourd'hui enregistre la version historique et est relue avec le même contenu.

## 2. Format v5 et migrations

- **`migrateV4toV5` :** seul `schemaVersion` change. La chaîne complète v1 → v2 → v3 → v4 → v5 est **non destructive**.
- **Champs v5 déclarés (facultatifs) :**
  - `ProgrammeLog.clock { pausedAt?, pausedS }` : chronomètre horodaté RC5.4, utilisé au lot 2 ;
  - `ProgrammeLog.timing { activeS, pausedS, plannedS }` : durées figées, lot 2.
- **Champs R4 (`doseModified`, `referenceRir`) :** ils appartiennent au contrat `domain`, verrouillé par l'empreinte du CORE. Ils seront ajoutés **avec le lot R4**, dans le même format v5.
- **Règle :** **aucune build intermédiaire ne doit être déployée** avant la fin de l'intégration RC5. Le format v5 est figé à ce moment-là.

### Sauvegarde avant migration (D3)
- Toute donnée d'une version antérieure est copiée **à l'identique**, avant la première écriture de la donnée migrée, sous `kairo.premigration.v<version>.<empreinte>` (préfixe BÊTA compris).
- Une seule copie par texte ; elle n'est jamais supprimée.
- **Copie impossible** (stockage plein) : la donnée reste lisible, rien n'est écrit au chargement, et l'utilisateur est **prévenu** (« … exportez vos données depuis Réglages »).

### Versions incompatibles
- Donnée plus récente que l'application : écran « Mise à jour requise ». **Rien n'est écrit ni copié.**
- Anciennes builds face à une donnée v5 :
  - ESSAI V2.1 (v3) et reprise avant le lot 1 (v4) refusent proprement, sans réécrire.
  - La protection des données (marque `schema: 5`) couvre les onglets restés ouverts.

## 3. Tests

| Test | Résultat |
|---|---|
| `packages/app-core/tests/rc5/rc5-lot1-migration.test.ts` | **14/14** : v2, v3, v4 → v5 identiques hormis la version ; v1 → v5 ; copie exacte et unique ; aucune copie pour une donnée v5 ; copie impossible signalée sans écriture ; version plus récente refusée sans écriture ; champs RC5.4 acceptés ; contenus versionnés |
| `e2e-v22-upgrade.mjs` généralisé (version source et cible), build V2.1 (v3) → v5 | v1, v2, v3 → v5 : **OK**. Export identique hormis la version, copie avant migration identique au texte d'origine, IndexedDB et service worker conservés, l'ancienne build refuse v5 sans réécrire. |
| Même script, build reprise `b850b98` (v4) → v5 | v1, v2, v3, v4 → v5 : **OK** (mêmes vérifications) |
| Sécurité des données, personnalisation 360/390, icônes et hors ligne, mise à jour A → B (4 clés identiques), jours Musculation 360/390, séance et répétitions mobile, hors ligne | OK |
| E2E complet `e2e-beta.mjs` + `e2e.mjs` | **342** vérifications OK |
| `pnpm check` | **3 109 tests réussis**, 0 échec |

Tests mis à jour, sans affaiblissement :
- 6 assertions qui fixaient « v4 » visent désormais le format courant ;
- le test de migration RC1 vérifie en plus la copie avant migration (exacte, unique) et l'absence de copie illisible ;
- les données de test historiques restent dans leur ancien format, comme entrées de migration.

## 4. Risques

| Risque | Traitement |
|---|---|
| Copie avant migration impossible (stockage plein) | Signalée à l'utilisateur ; la migration v4 → v5 est additive (seul le numéro change) |
| Place occupée | Une copie par version migrée et par texte (environ 217 Ko pour un état réel), en plus de la copie de la protection des données |
| Build intermédiaire déployée avant la fin de RC5 | Interdit : v5 n'est figé qu'après le lot R4 (champs `domain`) |
| Lot 5 (R4) : régression connue, indiquée par son propre auteur (« principaux du bas du corps bloqués chez le multisport dont toutes les expositions sont allégées — à corriger par la réévaluation R3 »), alors que R3 est exclu (D1) | **Conflit scientifique à arbitrer avant le lot 5** ; aucune décision prise seul |
