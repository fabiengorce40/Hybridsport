# REKKA ESSAI — icône officielle du 29 octobre 2026

Source officielle : image utilisateur `1000030298.png`, conservée sans retouche
dans `apps/kairo/resources/android-test-icons/source-officielle.png`.
Le R jaune/vert néon, son cercle et la ville cyberpunk sont conservés intégralement.
Les exports PNG utilisent Lanczos sans filtre ni modification de couleur.

Formats : 48, 72, 96, 180 (Apple Touch), 192, 512 px ; ICO 16/32/48 ;
PNG maskable opaque de 512 px. La version maskable réduit proportionnellement
l'image entière sur un fond noir, sans recadrage. Le contenu visible entier
reste dans le cercle central de rayon 40 % (contrôle pixel par pixel).
Le générateur Python et le fichier `icons.json` permettent la reproduction et
la vérification SHA-256 des exports. La source n'est pas publiée dans la PWA.

L'intégration est limitée à la copie `dist-android-test` par le script
`prepare-android-test.mjs`. Les ressources historiques `public/icon*`, le moteur,
les écrans, le stockage, les séances et les données ne sont pas modifiés.
Les icônes historiques ne sont pas copiées dans le paquet final ESSAI.
Le manifeste reste au même emplacement et conserve id, scope et start_url.
Le nom d'installation est REKKA ESSAI ; les couleurs sont bleu nuit #071127
(theme_color) et noir #000000 (background_color).

Les nouveaux fichiers d'icônes ont des URL distinctes sous
`icons/rekka-v2-city-v1/`. Le nouveau cache du worker contient toutes les icônes,
le manifeste et le favicon. Son activation supprime seulement les anciens
caches `rekka-android-test-*`, jamais localStorage ou IndexedDB.
Le manifeste et le worker sont revalidés sur le réseau. La BÊTA reste sur une
autre origine et conserve son propre manifeste, ses ressources et son worker.

Contrôles : typecheck TypeScript, build Vite, ESLint des scripts ; test Chromium
sur deux origines locales, migration de l'ancien worker vers le nouveau,
conservation des sentinelles localStorage/IndexedDB, comparaison du manifeste,
décodage des icônes hors ligne et BÊTA simulée inchangée.
Le workflow Cloudflare refuse un projet inattendu, une version préalable
inconnue, un domaine partagé ou un binding de données. Il ne crée aucun projet,
ne fusionne aucune branche et ne déploie que `rekka-v2-android-test`.
Après déploiement il compare la BÊTA et la production avant/après, puis vérifie
les octets du manifeste et des icônes servis par le domaine stable.

## Actualisation Samsung sans effacement

Ouvrir REKKA ESSAI en ligne, puis la fermer. Chrome Android peut actualiser
le WebAPK en différé ; garder le téléphone en Wi-Fi et branché. Selon la version
de Chrome, `chrome://webapks` permet de sélectionner uniquement REKKA ESSAI puis
de demander Update. Relancer l'application, la refermer et attendre la mise à
jour. Ne pas effacer les données du site ou celles de Chrome. Ne pas désinstaller
l'application pour forcer cette opération. La mise à jour réelle de l'icône
dans le lanceur Samsung dépend de Chrome/Android et doit être confirmée sur le
téléphone ; les tests Chromium ne simulent pas une installation WebAPK.

Référence : https://web.dev/articles/manifest-updates
Zone sûre : https://web.dev/articles/maskable-icon
