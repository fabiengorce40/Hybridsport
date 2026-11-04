# Work — intégration V3 sobre sur la BÊTA RC5

## Base et récupération

Branche locale `codex/rekka-v3-sober-fast-track-integration`, base `f2218c57d037ef322ba83d3ae2a85549a7dc6fd9` (BÊTA distante et jalon 2 accessibles). `ca60bcd` / jalon 3 Claude non accessibles : aucune prétention de les avoir intégrés. La maquette jointe `1000030406(1).png` est accessible ; elle est identique à la référence historique Work (empreinte SHA256 `1355276c972acea461d4623e5be0ec7c993e59abfd37c991632248d0717302c6`).

Travail ancien retrouvé dans `rekka-v3`, branche `codex/rekka-v3-sober-beta-visual`, base schéma 4 `cc1ac3b…`, non commité. V2 visuel `e80aa8f…` et V2.4.3/4 accessibles. Le travail ancien est préservé. Aucun cherry-pick de moteur ni fusion massive. Réutilisation sélective de `sober/Artwork`, `StrengthPreview`, `LiveWorkout`, `sober.css`, et saisie numérique ajustable ; raccordement sur les contrats RC5 actuels.

## Intégration réelle

- `Session0` utilise les vues V3 pour la présentation et la séance Musculation active : vrai `useStartFlow`, mêmes transitions de journal, RIR, douleur, substitution, fin et chronomètres RC5.
- `SetLine` reste propriétaire des valeurs et de la validation existantes ; seule sa branche de rendu `appearance=v3` est ajoutée. Phases et indices originaux conservés. `rampup` reste une montée hors progression ; aucune série réordonnée ou recalculée.
- Chronomètre : calcul, intervalle, vibration et actions existants conservés. Habillage vectoriel au pinceau, lisibilité centrale, +15, pause/reprise et passage. **−15 omis**, conformément à « lorsque compatibles » : cette action n'existe pas dans le contrat actuel.
- Chronomètre global persisté et commandes existantes accessibles dans les commandes de séance ; aucune horloge en mémoire réintroduite.
- Accueil, Planning, Progression et Profil partagent logo et montagnes sobres. Les vrais graphiques `Progress0`, propositions de planning, imports protégés et historiques ne sont pas remplacés.
- `SportIcon` canonique remplace les emblèmes raster/cibles en V3, petites formes simples et couleurs exactes calculées. Textes Cross-training clairs quand le violet officiel manquerait de contraste ; formes et graphiques restent violets.
- Course, HYROX, CT conservent leurs propres lecteurs. Surfaces et en-têtes harmonisés ; aucun modèle Musculation imposé.

Activation explicite par `VITE_REKKA_VISUAL=v3` avec canal BÊTA et thème v2, commande `pnpm --filter @hybridsport/kairo build:beta:v3`, sortie `apps/kairo/dist-beta-v3`. Le build historique reste disponible. Aucun prototype parallèle ne sert de route de remplacement.

## Écarts de fidélité explicités

La maquette fournit deux vues de séance, pas cinq planches détaillées. Les autres écrans appliquent son langage visuel aux fonctions actuelles. Les illustrations techniques/anatomiques exactes et le tracé original du cercle ne sont pas disponibles séparément : SVG reconstruits, pas reproduction pixel identique. Aucun pourcentage de fidélité revendiqué. Le logo existant est réutilisé. Les exercices affichés viennent du catalogue : un développé couché n'est pas renommé incliné.

Les informations RC5 (phases, objectifs, RIR, états et avertissements réels), les zones tactiles ≥44 px et le bandeau BÊTA ajoutent de la hauteur par rapport à l'image. Le chrono est dans le flux, accessible par défilement et ne recouvre pas les champs. Il ne faut pas effacer ces données pour forcer une ressemblance artificielle.

## Contrôles prévus et preuves

Audit de base en worktree intact ; typage, ESLint, build et suite complète sérialisée ; Chromium 360/390/large ; parité exacte de l'état persistant avant/après pour les mêmes données/actions ; trois séances réelles avec traçage `progression-stab-1` ; quatre sports ; aperçu/annulation/confirmation ; migrations et import confirmé ; PWA/précache/reprise hors ligne. Résultats et captures complétés après exécution. Aucune réussite déduite d'une déclaration de Claude.

## Publication future et secours — non autorisés

La seule cible future reste `rekka-beta` existante. Vérifier en lecture seule les paramètres Pages, toutes les branches automatiques, le HEAD réellement servi et les droits avant toute opération. Le workflow actuel peut créer un projet absent : ne pas le lancer aveuglément. Refuser toute création et toute cible ESSAI/production. Valider visuellement les écarts, puis autoriser séparément push/intégration/publication avec SHA approuvé.

Construire l'artefact V3 au SHA approuvé, écrire `version.json` avec `commit` complet et `channel:beta`, vérifier le manifeste (id/scope/start_url inchangés), l'intégrité de l'artefact et la route. Le workflow actuel utilise le build historique : l'activation V3 ou un envoi de l'artefact vérifié doit être préparé et autorisé explicitement. Aucun réglage Cloudflare modifié pendant cette mission.

Secours : artefact de `f2218c5` compatible **schéma 5**, même origine et même identité PWA. Tester sa lecture d'une sauvegarde fictive V3, sans réinitialisation. Ne pas revenir au secours V2.4.4 schéma 4. Le retour de code ne restaure pas les données ; conserver les exports, ne jamais vider le stockage. Les deux anomalies P1 du report restent des conditions V1 distinctes du visuel.

## Résultats locaux et version

Commit du code applicatif testé : `a5ec75d94557330cdc65722651a402447fc38fca` ; branche `codex/rekka-v3-sober-fast-track-integration`. Les commits suivants de rapport/fixtures conservent le même arbre `apps/kairo/src` et les mêmes packages métier ; le manifeste de livraison externe indique le HEAD complet final. Aucun push, fusion ou déploiement.

- Suite complète candidat : **3328 réussis, 11 ignorés**. Après le dernier ajustement de libellé RIR, **8 tests ciblés** réussis, TypeScript et ESLint réussis.
- E2E V3 360/390/1024 : six vues, pas de débordement, cibles actives de séance ≥44 px, charge 200,5 conservée, brouillons et dévalidation, commandes et focus, chronos global/repos et arrière-plan, reprise et hors ligne.
- Parité persistante exacte avec f2218c5 pour mêmes fixture/heure/actions ; les données et décisions ne sont pas calculées dans les nouveaux composants.
- Trois séances générées réelles : 3 décisions `progression-stab-1`, rechargées identiquement. Les fixtures de comparaison visuelle sont construites et fictives ; elles ne constituent pas une preuve de qualité de génération.
- Course, HYROX, CT, récupération, planning, personnalisation/replanification et garde-fous expérimentaux : parcours concernés réussis.
- Migration navigateur 1/2/3/4 →5 ; import confirmé et données conservées ; mise à jour f2218c5 →V3, précache et rechargement hors ligne ; secours f2218c5 schéma 5 testé.
- Couleurs réellement peintes des pictogrammes : rgb(220,255,53), rgb(57,221,235), rgb(255,67,139), rgb(139,92,246). Typographie calculée du titre de séance : REKKA Inter ; fond rgb(8,20,26).

Le libellé RIR compte correctement les séries de travail après les montées tout en transmettant l'indice originel. Les runners temporaires générés sont exclus de Git/ESLint ; leurs sources réelles restent contrôlées. Aucun script métier ou test utile supprimé.

Les captures sont fournies dans le dossier de validation `REKKA-WORK-V3-PREUVES-QA.zip` : six vues à 390 px, variantes 360/1024, vues complètes, avant/après BÊTA, références recadrées, superpositions et différences RGB, gros plan et démonstration GIF du chrono, couleurs des quatre sports. Les comparaisons utilisent une largeur commune de 390 px, sans bordures de téléphone ni bandeau BÊTA dans la référence ; elles ne donnent aucun score de fidélité, car les contenus et ressources diffèrent.

### Limites restant à valider

Ressources exactes d'illustration et de pinceau absentes ; reconstruction SVG, logo historique réutilisé, dimensions supplémentaires pour les informations RC5 et l'accessibilité. Les décorations manga ne sont plus affichées dans les en-têtes V3, mais certains anciens assets restent dans le bundle/précache pour compatibilité. Livraison mesurée ~4,61 Mo contre ~4,57 Mo pour la BÊTA initiale (environ +42 ko), 19 assets ; warning de chunk conservé. Optimisation P2, pas de promesse de mesure sur appareil réel.

Les deux P1 de report décrits au rapport 18 ne sont pas corrigés. Cloudflare non vérifié et commit Claude ca60bcd non accessible. Le candidat est **intégré localement et proposé pour revue graphique**, il n'est pas une autorisation ni une certification de publication V1.
