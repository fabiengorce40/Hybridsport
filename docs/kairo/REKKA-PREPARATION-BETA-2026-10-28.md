# Préparation BÊTA — 28 octobre 2026

Branche isolée, sans fusion ni déploiement. Les résultats concernent une build locale et ne constituent pas une autorisation de publication.

## Chronomètre

En Musculation, l'horloge en mémoire se met en pause et reprend, reste accessible dans la même instance et n'est jamais restaurée après rechargement. Une nouvelle instance affiche l'incertitude et permet de redémarrer le seul chrono. Pendant une pause la durée reste figée. Pendant une période active, la différence entre horloge monotone et heure système est vérifiée à chaque affichage et au retour de visibilité ; si les deux diffèrent de plus de 2 secondes, si elles reculent ou ne sont pas lisibles, le chrono devient incertain. Cette tolérance évite de traiter les écarts de lecture comme une panne, mais ne garantit pas une précision supérieure à deux secondes ni la détection d'une erreur affectant les deux sources de façon identique. Une pause n'est pas invalidée pendant la veille ; la reprise établit de nouvelles références. Les séries, les moteurs et le repos ne sont pas modifiés par cette décision.

## Contrôles

- 31 groupes en UTC : 3 049 tests réussis, 2 ignorés (tests conditionnels C4_BASELINE et PERF_SEED_DIR), aucun groupe échoué ou expiré. Deux groupes en parallèle, un worker chacun et un délai de 90 s par groupe. Résultat sur le code applicatif du commit `0134b2b`.
- TypeScript racine/application, ESLint et build BÊTA locale réussis. Le test navigateur supplémentaire a également passé ESLint ciblé. Bundle JS : environ 1 418,76 ko minifiés / 400,90 ko gzip.
- Chromium installé ; parcours base, Cross-training, HYROX, récupération et planning réussis. Le parcours mobile Musculation 360 et 390 px réussit : séries, charge, répétitions, repos, pause/reprise globale, rechargement et demande de réinitialisation. Un second onglet ne reprend pas silencieusement le chrono du premier. Des parcours de Course et clôture sont compris dans le parcours base ; ils ne valident pas un chrono global dans les autres sports.
- Mise à jour locale de deux builds avec identifiants de test : deux clés BÊTA de test identiques avant/après et vue grille conservée. Contrôle hors ligne limité : après premier chargement et activation du service worker, rechargement de l'écran initial et conservation d'une sentinelle localStorage. Ce n'est pas un essai d'une séance complète hors ligne.
- Capture des séances : `captures/stabilisation-v2/chrono-360-390.jpg`.

## Limites avant décision

Le chrono global reste limité à la Musculation. L'heure précédente est perdue au redémarrage et les instances d'onglets ont des chronos distincts. Le test à deux onglets ne valide pas l'écriture simultanée de données sportives, qui relève du store existant. Un décalage identique des deux horloges ne peut pas être détecté. Veille réelle, fermeture de PWA installée, import pendant séance, écriture concurrente et séance complète hors ligne n'ont pas été testés sur un téléphone physique. La mise à jour testée ne démontre pas le retour arrière B → A.

## Checklist Android physique

1. Exporter une copie du profil avant essai ; noter la version installée.
2. Démarrer Musculation, valider une série et saisir charge et répétitions ; mettre le chrono global en pause puis reprendre, en vérifiant que le repos reste indépendant.
3. Garder l'app ouverte en arrière-plan, éteindre l'écran puis attendre plusieurs minutes et revenir ; comparer à une horloge externe. Répéter en pause et après une veille prolongée. Si incertain, vérifier le message et la remise à zéro du seul chrono.
4. Recharger puis fermer/réouvrir la PWA : vérifier le message d'incertitude, la série et le repos enregistrés. Tester le mode avion après un premier chargement complet.
5. Terminer une séance et vérifier l'historique ; essayer Course, HYROX et Cross-training sans assimiler leurs lecteurs au chrono global. Revenir en ligne et exporter une seconde copie.

## Retour arrière envisagé — à valider avant publication

Exporter d'abord les données et conserver la copie indépendamment de la PWA. Comparer les schémas et ouvrir une copie de cette sauvegarde avec la version cible dans un environnement isolé ; vérifier les quatre sports et l'historique. Préparer la version précédente et ses fichiers de service worker, puis vérifier la mise à jour/retour sur un profil de test distinct, y compris hors ligne. Ne pas effacer le stockage local ni importer une sauvegarde ancienne par-dessus les données courantes pour effectuer le retour. Si la lecture rétrocompatible ou le service worker ne sont pas démontrés, suspendre le retour et conserver la copie exportée. Une version logicielle antérieure et un retour arrière effectif exigeraient une autorisation distincte ; aucun n'a été exécuté ici.
