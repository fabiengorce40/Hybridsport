# KAIRO RC1 — TEST : environnement de test isolé

**Source :** `claude/kairo-rc1` @ `f0b09e4`.
**Branche de l'environnement de test :** `claude/kairo-rc1-test-env`, créée depuis ce commit.

- **Production intacte :** aucune fusion de PR, aucun push sur `claude/crosstraining-c1-c2-spike-vbg8dv` ni sur
  `gh-pages`.
- **Workflow de production inchangé :** `kairo-pages.yml` n'est pas modifié.
- **Règles sportives :** les moteurs et les règles de RC1 sont inchangés.
- **Ce qui est ajouté :** un **canal de distribution** de l'interface, actif seulement à la construction de la
  version de test.

## 1. Hébergement

### 1.1 Options étudiées

| option | isolation | décision |
|---|---|---|
| Second déploiement sur le même site GitHub Pages | **aucune** : même branche `gh-pages`, un déploiement remplace l'autre | **écartée** (risque de remplacer la production) |
| GitHub Pages d'un **autre dépôt** (`fabiengorce40.github.io/<autre>/`) | **insuffisante** : même origine `https://fabiengorce40.github.io`, donc **même stockage local** que la production (le stockage est partagé par origine, pas par chemin) | **écartée** |
| **Cloudflare Pages, projet séparé** | **origine distincte** (`https://<projet>.pages.dev`) : stockage, service worker, cache et installation PWA séparés ; HTTPS ; gratuit | **retenue** |
| Vercel, projet séparé | origine distincte (`*.vercel.app`), équivalente | alternative valable, non préparée |

### 1.2 Ce qui manque pour déployer, et pourquoi le déploiement n'a pas été fait

- **Pas de compte de déploiement :** cette session n'a aucun compte ni jeton Cloudflare, Vercel ou Netlify.
- **Hôtes bloqués :** son réseau refuse `api.cloudflare.com`, `api.vercel.com`, `api.netlify.com`, et même
  `fabiengorce40.github.io`.

**Aucune adresse de test n'existe donc encore.** Le déploiement est entièrement préparé : workflow
`.github/workflows/kairo-rc1-test-pages.yml`, sur la branche de test seulement. Il s'exécute dans GitHub Actions dès
que les identifiants sont fournis.

### 1.3 Procédure (une seule fois, par le propriétaire du dépôt)

1. **Compte Cloudflare** (gratuit) : <https://dash.cloudflare.com/sign-up>.
2. **Identifiant de compte :** tableau de bord Cloudflare → *Workers & Pages* → colonne de droite, *Account ID* →
   copier.
3. **Jeton d'API :**
   - chemin : *My Profile* → *API Tokens* → *Create Token* → *Create Custom Token* ;
   - permission : **Account → Cloudflare Pages → Edit** ;
   - ressource : votre compte seulement ;
   - créer, puis copier le jeton (il n'est affiché qu'une fois).
4. **Secrets du dépôt GitHub `fabiengorce40/Hybridsport` :**
   - chemin : *Settings* → *Secrets and variables* → *Actions* → *New repository secret* ;
   - `CLOUDFLARE_API_TOKEN` = le jeton ;
   - `CLOUDFLARE_ACCOUNT_ID` = l'identifiant de compte.
5. **Lancement :** onglet *Actions* → **« KAIRO RC1 — TEST (Cloudflare Pages, isolé) »** → *Run workflow* → choisir la
   branche **`claude/kairo-rc1-test-env`**.

   N'importe quelle autre branche ne fait rien : le workflow est gardé sur cette branche. Le workflow lui-même fait,
   dans l'ordre :
   1. `pnpm check` ;
   2. construction de la version de test ;
   3. création du projet Cloudflare Pages `kairo-rc1-test` s'il n'existe pas ;
   4. déploiement ;
   5. vérification de l'isolation et parcours E2E complet **sur l'adresse déployée**.
6. **Adresse :** elle est affichée dans le résumé de l'exécution (notice « KAIRO RC1 — TEST déployé : … »). L'adresse
   stable du projet est en principe `https://kairo-rc1-test.pages.dev`, si ce nom est libre ; sinon Cloudflare ajoute
   un suffixe, et c'est l'adresse **affichée** qui fait foi.

Pour une adresse plus facile à retenir, on peut renommer le projet : variable `CF_PROJECT` du workflow, avant le
premier déploiement.

## 2. Séparation des données

| élément | production (inchangée) | test RC1 |
|---|---|---|
| origine | `https://fabiengorce40.github.io` | `https://<projet>.pages.dev` (distincte) |
| clé d'état | `kairo.state` | `kairo-rc1-test:kairo.state` |
| copies illisibles | `kairo.unreadable.*` | `kairo-rc1-test:kairo.unreadable.*` |
| sonde de stockage | `kairo.probe` | `kairo-rc1-test:kairo.probe` |
| cache du service worker | `kairo-beta0-2` (supprime les autres caches de son origine) | `kairo-rc1-test-1`, ne supprime **que** les caches `kairo-rc1-test-*` |
| manifeste PWA | `KAIRO`, sans `id` | `KAIRO RC1 — TEST`, `KAIRO TEST`, `id: ./?kairo-channel=rc1-test`, couleur `#8A1C1C` |
| titre, bandeau | `KAIRO` | `KAIRO RC1 — TEST`, bandeau rouge fixe : « données séparées · règles expérimentales non validées » |
| réseau | aucune requête externe | aucune requête externe (vérifié) |

Deux niveaux de séparation :

1. **Origines différentes :** le navigateur sépare déjà tout entre les deux sites, à savoir le stockage local, le
   service worker, le cache et l'application installée.
2. **Préfixe de toutes les clés du test :** en plus, même sur une origine **partagée**, la version de test ne lit ni
   n'écrit jamais une clé de la production. Son service worker n'en supprime jamais les caches.

Aucun mécanisme d'import ou de synchronisation n'existe entre les deux, donc **aucun partage automatique**.

**Production inchangée à l'exécution :**
- sans la variable `VITE_KAIRO_CHANNEL=rc1-test`, aucune transformation n'est appliquée ;
- `dist/sw.js` et `dist/manifest.webmanifest` sont **identiques octet pour octet** aux sources ;
- le texte « KAIRO RC1 » et la chaîne `kairo-rc1-test` sont absents de la build de production ;
- l'E2E de production passe tel quel.

## 3. Fonctionnalités réellement testables

Toutes ont été parcourues automatiquement **sur la version de test** : 221 vérifications de l'E2E complet, rejouées
avec la clé de stockage du canal de test.

- **Onboarding :** profil sportif, sports, objectifs Running, disponibilités, matériel choisi explicitement.
- **Programme et planning :** Musculation, course, Cross-training et HYROX ; aucun code interne affiché.
- **Contrôle avant séance :**
  - douleur (Oui / Non, réponse obligatoire, « Passer » conserve les douleurs connues) ;
  - fatigue et récupération.
- **Adaptation et report :** séance adaptée (genou P2) et séance reportée (épaule).
- **Musculation :**
  - Full Body (1 à 3 séances par semaine) ;
  - **Haut du corps / Bas du corps** à 4 séances par semaine ;
  - séries à cocher, charges et répétitions, répétitions en réserve ;
  - chrono de repos (pause, +15 s, conservé au rechargement), reprise de séance interrompue.
- **Cross-training :**
  - AMRAP, EMOM et For time (time cap, abandon, douleur) ;
  - séance complète expérimentale (C4) ;
  - **bloc de force délégué** (C4.3).
- **HYROX** (rôles, time cap, course compromise).
- **Running :** séance de course, historique, retour terrain.
- **Matériel :** lieu d'entraînement, **matériel indisponible et substitution** en séance.
- **Séance composée non placée :** « Faire maintenant », avec la règle de conflit appliquée.
- **Journal Beta et export JSON.**
- **PWA :**
  - manifeste, service worker actif, hors ligne après le premier chargement ;
  - **installable selon Chrome** : aucune erreur d'installabilité ;
  - écrans mobiles 360 × 640 et 390 × 844, profils Android Galaxy S9+ et Pixel 7 (émulation).

**Règles TEST_ONLY et restrictions de douleur conservées :**
- l'application affiche partout son statut **« Beta expérimentale »** ;
- le bandeau de test précise « règles expérimentales non validées » ;
- les exclusions de douleur restent vérifiées par l'E2E (aucun exercice exclu proposé).

## 4. Installation sur Android (une fois l'adresse obtenue)

1. Ouvrir l'adresse **affichée par le workflow** dans **Chrome pour Android**.
2. Vérifier le **bandeau rouge « KAIRO RC1 — TEST »** en haut de l'écran.
3. Menu ⋮ → **« Ajouter à l'écran d'accueil »**, ou **« Installer l'application »**. Le nom proposé est « KAIRO RC1 —
   TEST » (ou « KAIRO TEST » sous l'icône). Confirmer.
4. L'icône est la même que celle de la version publique. Les deux applications coexistent séparément, et le **nom**
   les distingue sur l'écran d'accueil.
5. Ouvrir une fois en ligne : le hors-ligne fonctionne ensuite.
6. Ne jamais saisir les données de la version publique dans le test : les deux sont indépendants, sans transfert.

## 5. Retour arrière

| action | effet sur la production |
|---|---|
| **Désinstaller sur le téléphone :** appui long sur « KAIRO TEST » → Désinstaller. Pour effacer les données : Chrome → Paramètres → Paramètres des sites → *Toutes les données* → `<projet>.pages.dev` → Effacer. | aucun (autre origine) |
| **Revenir à un déploiement précédent :** Cloudflare → *Workers & Pages* → `kairo-rc1-test` → *Deployments* → déploiement voulu → *Rollback to this deployment*. | aucun |
| **Retirer l'environnement :** supprimer le projet `kairo-rc1-test` dans Cloudflare, puis les deux secrets GitHub. On peut aussi supprimer la branche `claude/kairo-rc1-test-env`, sur décision. | aucun |
| **Arrêter les déploiements :** désactiver le workflow « KAIRO RC1 — TEST » (*Actions* → workflow → ⋯ → *Disable workflow*). | aucun |

## 6. Limitations

- **Pas encore d'adresse :** le déploiement attend les secrets Cloudflare (§1.3). La vérification sur l'adresse
  réelle sera faite par le workflow, job `verify`.
- **Android :** vérifié par émulation Chromium (viewports et profils d'appareils, installabilité selon Chrome). Ni
  l'installation sur un vrai téléphone ni le hors-ligne réel n'ont pu être testés depuis cette session.
- **Icône identique** à la production, seul le nom diffère. Une icône marquée « TEST » serait un petit ajout,
  facultatif.
- **Données :** elles restent sur l'appareil, dans le stockage local du navigateur. « Effacer les données du site »
  les supprime. Aucune sauvegarde distante.
- **Contenu :** il est le même que RC1. Running ne produit que des courses faciles sans saisie de distance (voir
  `RC3-PREPARATION.md`), et la récupération intra-Musculation n'est pas représentée.
- **Lancement manuel du workflow de production :** si quelqu'un lance à la main `kairo-pages.yml`
  (*workflow_dispatch*) **en choisissant la branche de test**, ce workflow publierait le code de cette branche sur
  `gh-pages`, comme pour toute autre branche aujourd'hui. Recommandation : ne lancer manuellement que le workflow
  « KAIRO RC1 — TEST ». Ajouter une garde de branche à `kairo-pages.yml` demanderait votre accord, car c'est un
  workflow de production : je ne l'ai pas modifié.

## 7. Preuves

### 7.1 Production inchangée (API GitHub)

L'état a été relevé avant et après le travail.

| référence | avant | après |
|---|---|---|
| `gh-pages` | `7bf4a77`, « KAIRO PWA f9f7e2e… », 2026-10-11 22:13 UTC | voir le compte rendu de fin |
| `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e`, 2026-10-11 22:10 UTC | voir le compte rendu de fin |
| dernière exécution de `kairo-pages.yml` | run 38179370211 (f9f7e2e, succès, 2026-10-11) | voir le compte rendu de fin |

### 7.2 Vérifications locales

- **Build de production :** `pnpm kairo:build`, servie sur `http://localhost:4173` ; E2E standard **221 ok, 0 échec**.
- **Build de test :** `pnpm kairo:build:rc1-test`, servie sur `http://localhost:4174`, autre origine.
  `E2E_URL=http://localhost:4174/ E2E_PROD_URL=http://localhost:4173/ pnpm kairo:e2e:rc1-test` donne **241 ok,
  0 échec** :
  - **20 vérifications d'isolation :**
    - sur une origine partagée simulée, `kairo.state` et la copie de production restent intactes octet pour octet,
      et le cache de production n'est pas supprimé ;
    - aucune clé n'est écrite hors du préfixe ;
    - sur des origines séparées, le stockage n'est pas partagé ;
    - aucune requête externe, aucune erreur de page ;
  - **221 vérifications** du parcours complet.
- **Tests unitaires du canal :** `apps/kairo/tests/channel.test.ts`.
- **Correction trouvée par l'E2E sur la version de test :** une première version du bandeau, collante en haut,
  masquait le bouton « Retour » des écrans de séance. Le bandeau est maintenant fixe, et la page, les
  superpositions et les éléments collants sont décalés de sa hauteur.
