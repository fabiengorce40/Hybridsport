# Chronomètre global — sécurité et reprise, 28 octobre 2026

Base : `434ecc8`, branche isolée `codex/rekka-continuation-20261027`. La pause globale auxiliaire n'est pas activée : ne pas présenter cette préparation comme une fonctionnalité utilisable.

## Risque reproductible et décision

Le test `apps/kairo/tests/global-clock.test.ts` reproduit au niveau du module qu'un remplacement du stockage principal par une sauvegarde ancienne, sans intervention sur le stockage auxiliaire, retrouve la pause précédente quand `requestId` et `startedAt` sont identiques. Il s'agit d'une reproduction synthétique de l'écriture historique, pas d'un test DOM complet de restauration d'une séance. Le couple d'identifiants ne garantit pas l'identité d'une incarnation de sauvegarde. Le test documente la faille ; il ne la corrige pas.

Les imports et remises à zéro réels passent par `StoreProvider.reset`, le reset du programme de test par `apply`, et une ancienne application peut écrire directement `kairo.state` sans prendre les Web Locks de la nouvelle. Le stockage strict et le stockage auxiliaire sont deux écritures distinctes. Le verrou par séance du module ne coordonne donc ni tous les remplacements du profil, ni une ancienne version ; un crash entre écritures demeure possible. Aucun protocole de reprise ou de nettoyage n'est branché sur les cycles de vie réels. L'activation reste bloquée tant que ces cas ne sont pas résolus et testés.

Avant activation : concevoir une identité d'incarnation et une invalidation échouant en sécurité à chaque remplacement du profil, y compris annulation, quota, interruption et plusieurs onglets ; établir un comportement sûr après utilisation d'une ancienne version et après import d'un compagnon explicitement lié à la sauvegarde principale ; vérifier les fermetures et la suppression effective ou l'invalidation irréversible des anciens états. Prouver la compatibilité avec les formats stricts avant toute modification de ceux-ci. Les durées de Course, HYROX, Cross-training et de repos possèdent leurs propres contrats et ne doivent pas être modifiées par cette horloge de présentation.

## Correctif indépendant livré

Commit `ca4b7fe` : lors d'un remplacement complet du profil, `reset` valide et enregistre d'abord l'état ; si l'écriture échoue, il conserve l'état en mémoire et n'annonce pas une importation réussie. Une erreur de lecture du fichier est aussi affichée. Le test DOM injecte une erreur de quota et vérifie que les données en mémoire et sur disque restent inchangées et qu'aucun message de succès n'apparaît. Le format des données exportées et les moteurs ne sont pas modifiés.

## Contrôles

- Tests ciblés : 23 réussis sur import/réinitialisation/parcours Beta ; 11 réussis sur le module d'horloge et l'échec d'import.
- TypeScript racine et application, ESLint complet et build BÊTA locale : réussis. Bundle principal : 1 416,48 ko minifiés / 400,26 ko gzip.
- Premier lancement groupé sous `Europe/London` : deux échecs de `rc43-free-run-type-dom.test.tsx`, qui attend des identifiants UTC fixes pour une heure locale. Exemple attendu `08:50Z`, obtenu `07:50Z`. Ce défaut de portabilité des tests n'est pas masqué ; une seconde campagne a été exécutée sous UTC, conformément à la campagne précédente.
- Campagne UTC : 31 groupes réussis, 3 038 tests réussis et 4 exécutions ignorées. Les deux tests conditionnels ignorés ont été comptés deux fois par le lanceur de groupes : il s'agit de deux tests distincts. Le test DOM a été renforcé après l'exécution de son groupe, puis relancé séparément avec succès ; le code applicatif n'a pas changé entre les groupes.
- E2E navigateur : le parcours `base` n'a pas démarré car Chromium Playwright est absent. Les autres parcours, la mise à jour PWA et les captures pause/reprise n'ont pas été validés dans ce cycle. Le build ne signifie ni publication ni déploiement.

## Conditions avant BÊTA

Finaliser et valider l'invalidation, la concurrence, les imports/export, les anciennes versions et les interruptions, puis connecter l'interface et rejouer les quatre sports et les scénarios PWA, hors ligne et captures réels. Vérifier également les deux tests dépendants du fuseau. Aucune fusion ni publication n'a été effectuée.

## Résultats détaillés des groupes UTC

| Groupe | Code | Résultat des tests |
|---|---:|---|
| `apps-kairo-tests-01` | 0 | Tests 63 passed (63) |
| `apps-kairo-tests-02` | 0 | Tests 37 passed (37) |
| `apps-kairo-tests-03` | 0 | Tests 53 passed (53) |
| `apps-kairo-tests-04` | 0 | Tests 34 passed (34) |
| `apps-kairo-tests-05` | 0 | Tests 5 passed (5) |
| `packages-app-core-tests-01` | 0 | Tests 101 passed (101) |
| `packages-app-core-tests-02` | 0 | Tests 86 passed | 1 skipped (87) |
| `packages-app-core-tests-03` | 0 | Tests 142 passed (142) |
| `packages-app-core-tests-04` | 0 | Tests 122 passed (122) |
| `packages-app-core-tests-05` | 0 | Tests 105 passed (105) |
| `packages-app-core-tests-06` | 0 | Tests 79 passed | 1 skipped (80) |
| `packages-app-core-tests-07` | 0 | Tests 99 passed (99) |
| `packages-app-core-tests-08` | 0 | Tests 74 passed (74) |
| `packages-crosstraining-tests-01` | 0 | Tests 143 passed (143) |
| `packages-crosstraining-tests-02` | 0 | Tests 105 passed (105) |
| `packages-engine-tests-01` | 0 | Tests 69 passed (69) |
| `packages-engine-tests-02` | 0 | Tests 88 passed (88) |
| `packages-engine-tests-03` | 0 | Tests 176 passed (176) |
| `packages-engine-tests-04` | 0 | Tests 130 passed (130) |
| `packages-engine-tests-05` | 0 | Tests 73 passed (73) |
| `packages-hyrox-tests-01` | 0 | Tests 95 passed (95) |
| `packages-planner-tests-01` | 0 | Tests 99 passed (99) |
| `packages-planner-tests-02` | 0 | Tests 154 passed (154) |
| `packages-programme-tests-01` | 0 | Tests 46 passed (46) |
| `packages-running-tests-01` | 0 | Tests 212 passed (212) |
| `packages-running-tests-02` | 0 | Tests 184 passed (184) |
| `packages-running-tests-03` | 0 | Tests 123 passed (123) |
| `packages-strength-tests-01` | 0 | Tests 85 passed (85) |
| `packages-strength-tests-02` | 0 | Tests 69 passed (69) |
| `packages-strength-tests-03` | 0 | Tests 164 passed (164) |
| `packages-strength-tests-04` | 0 | Tests 23 passed | 2 skipped (25) |
