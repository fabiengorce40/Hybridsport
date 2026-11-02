# Chronomètre global — préparation rétrocompatible, 28 octobre 2026

Branche `codex/rekka-continuation-20261027`, base `434c710`. Aucun changement de schéma `kairo.state`, de moteur, de BÊTA ou de production. Aucun déploiement ni fusion.

## Comparaison

| Option | Compatibilité | Points restant à résoudre |
|---|---|---|
| État séparé, clé liée à `requestId` et `startedAt` | La sauvegarde sportive et son export JSON restent identiques ; une ancienne version ignore la clé auxiliaire. | Le fichier principal historique ne contient pas l'horloge ; un compagnon distinct doit être exporté et restauré explicitement. L'import d'une ancienne sauvegarde sur un appareil possédant déjà une ancienne clé identique peut rattacher un état obsolète. La coordination import/écriture et la récupération après interruption doivent être conçues avant activation. |
| Champ dans le format strict existant | Une seule sauvegarde transporterait le chrono. | `zProgrammeLog` est strict : une ancienne version peut refuser un état contenant ce champ. Une migration ascendante et surtout un retour arrière sans perte sont à démontrer. Aucune migration de ce type n'a été appliquée. |

L'option séparée est retenue pour la préparation, sans activer le chronomètre dans l'interface tant que les risques d'import et de retour arrière ne sont pas levés. Un identifiant et une date de début identiques ne prouvent pas à eux seuls qu'une sauvegarde importée représente la dernière version d'une séance.

## Code préparé

- `apps/kairo/src/clock/global-clock.ts` : horloge auxiliaire versionnée, indépendante de l'état sportif ; pause/reprise horodatées ; lecture refusée si l'état est illisible ou d'une autre version ; aucune écriture pour une séance déclarée close ; refus d'écraser un état auxiliaire existant à l'import du compagnon.
- Les écritures publiques nécessitent un adaptateur de verrou : en son absence elles refusent la commande. Test avec Web Locks et deux onglets ; les fonctions non verrouillées ne sont pas exposées. L'intégration devra utiliser le même verrou pour toutes les opérations concernées, y compris import et réinitialisation.
- Un export/import compagnon est préparé comme fonction distincte : ce n'est pas encore une option utilisable dans les réglages et il ne modifie pas l'export principal. Aucun chrono n'est encore affiché ou commandé par ce module dans une séance réelle.

## Contrôles réalisés

- 9 tests ciblés sur la version finale du module : pause/reprise, relecture en pause, temps actif, fermeture déclarée, identité différente, état illisible, erreur d'écriture, compagnon, clé de sauvegarde inchangée et commandes concurrentes ; les quatre disciplines sont représentées comme identifiants de test, non comme séances réelles exécutées avec le nouveau chrono.
- Test Chromium sur un profil jetable : clé historique inchangée, pause, rechargement, fermeture/réouverture du profil, reprise, séance déclarée close, restauration du compagnon dans un second profil et sérialisation de deux onglets. Fonctionnement hors ligne après chargement également essayé. Test du composant isolé à travers Vite, **pas une PWA installée ni une séance réelle avec le nouveau chrono**.
- Parcours existants rejoués en local : `base`, `cross`, `hyrox`, `recovery`, `planning`, `session` et `reps` ; mise à jour PWA locale ancienne interface → V2 avec deux clés de test et préférence de grille conservées. Ces parcours vérifient l'application existante : ils ne vérifient pas l'intégration du nouveau chrono, qui n'existe pas encore.
- Correction indépendante : cibles de navigation entre exercices de 36 à 44 px ; vérifiées en 360 et 390 px avec le parcours de séance. Captures mises à jour.
- Groupes de tests : 3 035 réussis et 2 ignorés pendant les travaux ; le module final et sa neuvième assertion ont ensuite été retestés séparément. Le [bilan détaillé](REKKA-CHRONO-TESTS-2026-10-28.md) précise le périmètre. TypeScript racine/application et ESLint complet réussis.
- Build BÊTA locale : réussie, JavaScript environ 1,416 Mo minifié / 400 Ko gzip. Le nouveau module est inutilisé par la build : aucun gain de performance ni nouvelle fonctionnalité visible n'est revendiqué.

## Blocages avant intégration

1. Définir et tester une procédure transactionnelle ou échouant en sécurité pour l'import principal, la restauration du compagnon, la réinitialisation, les plantages entre écritures et la récupération explicite ; ne jamais réattacher silencieusement une ancienne clé à une sauvegarde importée.
2. Vérifier la coexistence de plusieurs onglets, des anciennes versions qui ignorent le compagnon, des erreurs de quota, des fermetures, changements d’horloge système et séances terminées avec les vrais sélecteurs et les vraies transitions de l'application. Le test de clôture isolé reçoit un booléen de test ; il ne valide pas le cycle réel de clôture.
3. Définir une expérience d'export et de restauration compréhensible, puis tester le transfert réel, le mode hors ligne, les quatre sports et la PWA mise à jour. Sans verrou navigateur, refuser l'opération et avertir l'utilisateur.
4. Conserver séparément les chronomètres propres à Course, HYROX, Cross-training et au repos ; une pause de présentation globale ne doit pas modifier leur résultat ou la prescription.

La pause globale persistante demandée est donc **préparée mais non livrée**. Le retour à l'ancienne version est vérifié seulement pour l'état strict non modifié et l'ignorance théorique de la clé auxiliaire ; la reprise d'une horloge depuis un export principal seul n'est pas garantie. Le travail restant est technique : ne pas activer un bouton tant que ces scénarios ne sont pas vérifiés.
