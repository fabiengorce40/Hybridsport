# REKKA ESSAI — correction Android pleine surface

Périmètre : branche `codex/rekka-android-icon-fullbleed`, base `ed1e1d6`,
application identique au déploiement `0d526ac`. Aucun moteur, profil, stockage,
programme ou écran modifié. Aucun développement Musculation V2.1 inclus.

## Cause et correction

La source officielle 1536² contient un extérieur noir et un contour arrondi.
L'ancien générateur réduisait **l'ensemble** à 379² dans un PNG noir 512²,
soit 66/67 pixels de marge supplémentaires, avant application du masque Android.
Le manifeste publiait cette image comme `maskable`. Ce sont deux encadrements
préintégrés, pas une couleur de thème imposée par Samsung.

Le décor bleu nuit/rose/violet est prolongé par une retouche du fond uniquement
(`decor-fullbleed.webp`, compression sans perte). Le R et ses couleurs ne sont
pas générés : le script recompose les pixels officiels au-dessus du décor.
Le contour noir/argenté et les coins arrondis préintégrés sont exclus. Les zones
néon du R, du cercle et des ornements sont protégées avant rééchantillonnage.

- `any` : décor plein canevas, premier plan officiel à échelle 1.
- `maskable` : même décor plein canevas, premier plan à échelle 0,78.
  Tous les pixels néon protégés sont dans un rayon de 0,39003 du canevas,
  inférieur au rayon sûr Android de 0,4. Aucun carré noir n'est ajouté.
- PNG `any` : 48, 72, 96, 180 (Apple Touch), 192 et 512.
- PNG `maskable` : 192 et 512 ; favicon ICO 16/32/48.
- Simulations reproductibles carré, carré arrondi, cercle et squircle :
  `apps/kairo/resources/android-test-icons/qa/android-masks.png`.

Retouche de décor : outil intégré imagegen, source officielle en référence.
Consigne : retirer R/cercle de la plaque de décor, prolonger la même ville aux
quatre bords sans cadre ni vignette ; recomposer ensuite les pixels originaux.
Le résultat génératif n'est jamais utilisé pour remplacer le dessin du R.

## Manifeste, cache et données

Le chemin des icônes devient `icons/rekka-v2-city-fullbleed-v2-<revision>/`.
Le hash est calculé sur les exports, et non sur la source inchangée. Le worker
change donc même si l'illustration officielle reste identique. Manifeste et
worker sont revalidés ; les nouveaux PNG versionnés peuvent rester immuables.
Le worker ne supprime que les anciens caches `rekka-android-test-*`.
Aucune opération sur localStorage, IndexedDB ou données d'autres origines.

`id`, `scope`, `start_url`, nom et chemin du manifeste sont conservés.
Nom : REKKA ESSAI ; thème et fond de lancement : `#071127`.
Un changement d'icône ne crée pas une nouvelle identité PWA.

## Vérifications et publication

Le workflow dédié refuse toute publication si : projet, domaine, source Git,
branche Cloudflare, absence de bindings ou version ESSAI attendue diffèrent.
Il vérifie en lecture seule les anciens assets effectivement servis et leurs
SHA-256, puis recontrôle l'isolation immédiatement avant `pages deploy`.
La seule commande d'écriture cible le projet existant `rekka-v2-android-test`.
Aucun `project create`, aucune fusion, aucun déploiement BÊTA/production.
Après publication : identité du projet, commit, état, manifeste servi, tous les
hashs d'icônes et worker sont vérifiés ; BÊTA et production comparées avant/après.
Le verrou sur le précédent commit empêche de republier ce workflow après succès.

QA locale : générateur avec assertions pixels/sécurité/bords, TypeScript racine
et application, ESLint ciblé, build Vite. Le navigateur Chromium local n'est pas
installé ; le workflow installe Chromium et exécute avant publication l'E2E de
migration depuis **l'exacte version d'icônes 0d526ac**, préservation localStorage
et IndexedDB, manifeste et PNG hors ligne, origine BÊTA simulée inchangée.
Le Samsung réel et son lanceur restent à vérifier sur le téléphone de l'utilisateur.

## Actualisation Samsung sans perte de données

1. Ouvrir l'adresse stable dans le navigateur ayant installé la PWA, actualiser,
   puis ouvrir et fermer REKKA ESSAI. Accepter la mise à jour d'icône si proposée.
2. Téléphone en Wi-Fi et branché : laisser l'application fermée pour que le
   navigateur mette à jour son paquet Android. Un délai peut être nécessaire.
3. Si installation via Chrome et ancienne icône persistante : ouvrir
   `chrome://webapks`, repérer REKKA ESSAI et son domaine exact, utiliser `Update`
   si disponible ; ouvrir l'app, la fermer, puis forcer son arrêt dans les
   paramètres Android. Attendre la fin de la mise à jour, puis rouvrir.
4. Si installation via Samsung Internet, rouvrir dans ce même navigateur ; son
   cycle de mise à jour WebAPK peut prendre environ 24 h en Wi-Fi.

Ne pas effacer les données, le stockage du site, ni désinstaller pour cette
actualisation. Une réinstallation n'est pas prescrite ; si elle devait être
étudiée, exporter les données d'abord et prévenir du risque de perte locale.

Références officielles : https://web.dev/articles/manifest-updates ;
https://web.dev/learn/pwa/update ;
https://developer.chrome.com/blog/improvements-to-web-app-updates.
