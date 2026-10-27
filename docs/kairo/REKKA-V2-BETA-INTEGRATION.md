# REKKA V2 — intégration dans la vraie BÊTA

Base : `claude/rekka-beta`, commit `e2cdcc51c42268361844b0dcf353be2771e829f2`. Travail isolé sur `claude/rekka-v2-beta-integration`.

Cette intégration utilise les composants de la BÊTA, son StoreProvider, ses sélecteurs et ses transitions existantes. Aucun import du prototype ni de ses données de démonstration. Aucun fichier `packages/` modifié.

## Visuels validés

- Quatre emblèmes circulaires PNG transparents recréés depuis la référence de Fabien : Course bleu/cyan, Cross-training orange/or, HYROX jaune-vert, Musculation magenta. Déclinaisons WebP 384 px pour l'interface, transparence conservée.
- Quatre bannières de séance validées : course au bord de l'eau, curl avec prise corrigée, battle ropes, poussée de traîneau. Choix depuis le sport réel de la séance, sans substitution de prescription.
- Accueil : ville et athlète, logo pinceau, kanjis, devise, véritable prochaine séance et accès au planning. Aucun cadre de visée ajouté.
- Planning, Progression et Profil : ville de l'accueil, cadrages adaptés.
- Navigation BÊTA : Accueil / Planning / Séances / Progression / Profil. Le programme et son édition restent disponibles dans Séances ; historique et saisie de courses libres restent dans Progression ; les réglages et exports restent dans Profil.
- Progression : décompte réel des séances enregistrées, durée réellement renseignée et sports pratiqués. Aucun niveau, XP ou record fictif. La courbe de démonstration du prototype n'est pas recopiée sur de vraies données.

## Données et mise à jour

Aucun changement du schéma, des clés `rekka-beta:*`, du manifeste, du service worker ni des moteurs. Le thème est actif uniquement sur le canal beta, désactivable par `VITE_REKKA_THEME=off`. L'interface de production conserve ses routes et son thème.

L'application installée depuis `https://rekka-beta.pages.dev` recevra les modifications seulement après publication réussie d'une nouvelle build sur cette même origine. Une intégration locale ou une branche de développement n'actualise pas l'application installée. Le bandeau de version permet de confirmer la nouvelle build.

## Vérifications

- `TZ=UTC pnpm check` : 3 007 tests réussis, 2 ignorés ; TypeScript et lint réussis avant le dernier ajustement de navigation, vérifiés à nouveau ensuite.
- Build BÊTA réussie.
- Test de mise à jour ancienne interface (`VITE_REKKA_THEME=off`, build aaaaaaa) vers REKKA V2 (build bbbbbbb) : réussite. Bandeau de mise à jour affiché, nouvelle interface et navigation actives, données conservées octet pour octet et préférence Grille conservée.
- Captures de la vraie application avec un export utilisateur de test à 360 et 390 px dans `docs/kairo/captures/live-final/` ; aucun débordement horizontal sur les cinq écrans.
- Tests E2E BÊTA complets : réussite (`E2E REKKA BÊTA OK`), dont les quatre sports, le contrôle pré-séance, les résultats, le RIR, le planning Liste/Grille, les exports et la persistance. Les libellés de navigation sont adaptés uniquement avec `E2E_REKKA_V2=1` ; les assertions sportives, de persistance et d'isolation sont conservées.

Les tests utilisent un export de test du dépôt, jamais les données du téléphone de Fabien.

## Publication

Publication sur la BÊTA autorisée par Fabien le 27 octobre 2026, y compris un transfert unique des ressources par l’API GitHub. Vérifier l’intégrité des fichiers, le succès du workflow et le `version.json` réellement disponible sur `https://rekka-beta.pages.dev` avant d’annoncer une mise à jour au téléphone. La production n’est pas une cible de publication.
