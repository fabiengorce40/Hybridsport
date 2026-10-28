# REKKA V2 — essai Android isolé, préparation du 28 octobre 2026

## Décision proposée

Publier uniquement après accord sur une **origine HTTPS propre**, distincte de l'origine effective de la BÊTA et de la production : par exemple un nouveau projet Cloudflare Pages `rekka-v2-android-test`, si ce nom est disponible et si le compte y autorise la création. L'URL réelle sera fournie et vérifiée après création ; l'exemple n'est ni réservé ni publié. Ne jamais publier cet essai dans le projet Cloudflare `rekka-beta`, sur son domaine, ni dans un simple sous-dossier de la même origine. Une origine est le triplet protocole/hôte/port : le chemin seul ne sépare pas localStorage, IndexedDB ou Cache Storage.

La copie locale, produite depuis la build `f45c242`, porte le nom d'installation `REKKA ESSAI`, le titre `REKKA V2 ESSAI`, un id de manifeste spécifique et le cache `rekka-android-test-1`. Le manifeste conserve le scope et l'URL de départ relatifs `./`; le service worker est enregistré depuis `./sw.js`, sans élargir son scope. La build conserve le canal applicatif BÊTA : elle emploie le même préfixe logique `rekka-beta:` et certains textes internes disent encore « REKKA BÊTA ». **La protection des données repose donc impérativement sur l'origine distincte**, non sur le nom, le chemin ou le préfixe. L'icône reste celle existante ; distinguer les applications par leur nom et leur URL. Aucune donnée n'est migrée ni importée.

Le paquet local `rekka-android-test-f45c242.zip` correspond à la copie test. SHA-256 : `a60f4a028640c4b9cb26b697cf5d60d69aa2f91f8685089bd5922fc992527b0a`. L'archive est un artefact local, pas une URL Android installable. La build cible est `f45c242c1e13a780d9c46084cf15ff6991707a62`; les commits ultérieurs ne concernent que la préparation. Le fichier `version.json` et le commit injecté dans le JavaScript correspondent à cette build. Les workflows existants n'autorisent leurs déploiements que depuis leurs branches spécifiques ; aucun workflow de publication d'essai n'a été créé ni déclenché.

## Vérifications effectuées

Build locale canal BÊTA réussie, copie adaptée localement sans modifier `dist-beta`. Test Playwright sur deux origines locales `127.0.0.1:4174` et `127.0.0.1:4175` : identités de manifestes, enregistrements service worker, caches propres et valeurs différentes sous la même clé localStorage ; mise à jour du worker de test puis suppression des données, caches et worker de l'origine de test, avec vérification que la valeur, le cache et le worker de l'origine BÊTA simulée restent identiques. Les deux origines sont des simulations locales, pas les environnements hébergés réels ; aucune PWA n'a été installée sur Android. Tests ciblés de canal/déploiement/ressources : 18 réussis ; ESLint ciblé réussi. La validation précédente de l'application reste consignée dans `REKKA-PREPARATION-BETA-2026-10-28.md`.

Avant publication, vérifier le vrai domaine BÊTA, le domaine de production et le domaine alloué au nouvel hébergement ; confirmer qu'ils ont bien trois origines distinctes et que l'hébergement du test ne modifie pas le projet BÊTA. Vérifier le commit, `version.json`, le manifeste, le worker et le scope sur la vraie URL, puis réexécuter le test d'isolation sur copies jetables. Un domaine HTTPS public est potentiellement accessible à d'autres personnes : définir son mode d'accès avant publication, sans supposer qu'une URL difficile à deviner soit privée. Toute protection d'accès doit être compatible avec l'installation et le mode hors ligne.

## Installation Samsung Android — après publication autorisée uniquement

1. Sur la BÊTA actuelle, exporter les données et conserver la copie à part. Ne pas importer cette copie dans l'essai : créer un profil de test avec des valeurs fictives. Les deux origines ne se synchronisent pas.
2. Dans Google Chrome sur le Samsung, ouvrir l'**URL HTTPS réelle de test**, qui sera communiquée après publication. Vérifier visuellement le domaine : il doit être différent de celui de la BÊTA. Attendre le chargement complet en ligne.
3. Dans le menu Chrome ⋮, choisir « Ajouter à l'écran d'accueil », puis « Installer » ou « Installer l'application » selon les libellés proposés. Le nom attendu sur l'écran d'accueil est **REKKA ESSAI**. Conserver l'application BÊTA existante et ouvrir l'essai par cette nouvelle icône.
4. Si Chrome ne propose qu'un raccourci ou refuse l'installation, noter le message et arrêter le test d'installation : ne pas considérer le raccourci comme une PWA installée. Certains libellés varient selon Chrome et Android.
5. Avant le mode avion, ouvrir en ligne les vues et les ressources nécessaires ; un chargement initial de la page ne garantit pas que toutes les illustrations ou tous les écrans ont été mis en cache.

## Checklist d'essai

- Créer un profil fictif et démarrer une séance Musculation ; saisir charge et répétitions, cocher une série, puis vérifier l'enregistrement.
- Mettre le chrono global en pause et noter l'heure ; verrouiller le téléphone plusieurs minutes, déverrouiller, vérifier qu'il n'a pas avancé, puis reprendre. Répéter avec le chrono actif et comparer à une horloge externe ; si le temps est incertain, vérifier le message et réinitialiser seulement le chrono.
- Changer d'écran, revenir à la séance ; fermer puis rouvrir la PWA : vérifier le message d'incertitude, la conservation des séries et du repos, puis reprendre.
- Ouvrir les écrans nécessaires en ligne, activer le mode avion, démarrer ou reprendre une séance et vérifier la saisie, la clôture et la réouverture. Revenir en ligne ; noter toute ressource absente.
- Tester séparément Course, HYROX et Cross-training, y compris leurs propres lecteurs et résultats ; le nouveau chrono global reste limité à Musculation.
- Revenir à la BÊTA existante et vérifier qu'elle présente son profil et ses données habituels. Le faire sans modifier ni importer ses données.

## Suppression ciblée après essai

Exporter les données fictives de test uniquement si tu souhaites les conserver. Sur Samsung, maintenir l'icône **REKKA ESSAI**, choisir « Désinstaller » ou « Supprimer » selon l'option affichée, puis confirmer le nom. Une suppression du seul raccourci ne garantit pas l'effacement des données du site. Si l'on souhaite effacer les données de test, dans Chrome ouvrir les paramètres du site correspondant à **l'origine exacte de test** et supprimer uniquement ses données ; vérifier deux fois le domaine avant confirmation. Ne pas utiliser l'effacement global des données de Chrome, ni supprimer les données du domaine BÊTA. Retourner ensuite dans la BÊTA existante et contrôler le profil. Les intitulés peuvent varier selon les versions d'Android et de Chrome.

## Risques et limites

L'isolation ne vaut que si les origines restent différentes ; l'utilisateur ou une suppression globale des données de Chrome peut effacer plusieurs sites. Le mode hors ligne ne garantit pas les contenus jamais chargés, ni la persistance après nettoyage par le système. La mise à jour et la suppression ont été simulées localement, pas sur l'hébergement final ni sur le Samsung. Les écritures sportives simultanées multi-onglets et les changements d'horloge affectant identiquement les deux horloges restent à étudier. Le chrono global en mémoire est perdu après fermeture ; sa remise à zéro ne touche pas la séance. Aucune URL n'a été publiée.
