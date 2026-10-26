# REKKA BÊTA — mise à jour automatique : audit et proposition d'architecture

**Statut : proposition à valider. Aucun mécanisme de mise à jour, aucun workflow et aucune branche partagée n'ont été modifiés.**

Audit réalisé sur `origin/claude/rekka-beta` (`e2cdcc5`, BÊTA publiée sur `https://rekka-beta.pages.dev`).

## 1. Audit de l'existant

### 1.1 Déploiement Cloudflare Pages (`.github/workflows/rekka-beta-pages.yml`)

| Point | Constat |
|---|---|
| Déclencheur | Tout `push` sur `claude/rekka-beta` touchant l'application ou les paquets. Un lancement manuel est possible, mais seulement depuis cette branche. |
| Vérifications avant publication | `pnpm check` (lint, types, toute la suite de tests) puis la build BÊTA, **dans le même job, avant le déploiement**. Si un test échoue, rien n'est publié. |
| Publication | `wrangler pages deploy` vers le projet `rekka-beta`, branche `main` : l'adresse stable `rekka-beta.pages.dev` est conservée. Une garde refuse d'écraser un projet qui ne contient pas la BÊTA. |
| Vérification après publication | `version.json` = ce commit, puis E2E complet sur l'adresse publiée. |
| Isolation | Lecture seule sur le dépôt, jamais `gh-pages`. Ni la production, ni TEST, ni la prévisualisation ne sont touchées. |

**Le déploiement continu existe donc déjà.** Lacunes constatées :

- **D1** — L'E2E navigateur ne tourne qu'**après** la publication. Une régression d'interface est publiée avant d'être détectée.
- **D2** — Rien ne contrôle ce qui arrive sur `claude/rekka-beta` : aucune vérification sur les demandes de fusion et aucune protection de branche. Un push direct non vérifié déclenche quand même `pnpm check` avant publication, mais il n'existe pas d'étape « validé » distincte.
- **D3** — Aucun retour arrière outillé. Cloudflare conserve les déploiements précédents, mais rien n'existe pour republier une version antérieure.
- **D4** — `version.json` ne contient que le commit et le canal. Il n'y a ni numéro de version, ni date de publication, ni notes.

### 1.2 Service worker et mise à jour de la PWA

| Point | Constat (`public/sw.js`, `main.tsx`, `version.tsx`) |
|---|---|
| Enregistrement | `register('./sw.js', { updateViaCache: 'none' })` : le script n'est jamais servi depuis le cache HTTP. |
| Stratégie | Page : **réseau d'abord** (revalidée), cache en secours hors ligne. `assets/` (noms hachés) : cache d'abord, mis en cache à la demande. Seuls la page, le manifeste et deux icônes sont pré-mis en cache. |
| Activation | `skipWaiting()` + `clients.claim()` : tout nouveau service worker prend la main **immédiatement**. Les anciens caches `rekka-beta-*` sont alors supprimés. |
| Détection | `version.json` (`no-store`) est relu au lancement et au retour au premier plan. Le bandeau « Nouvelle version de KAIRO disponible » propose « Mettre à jour », qui recharge la page. |
| Données | Le service worker ne supprime que ses caches, jamais le stockage local. |

Lacunes constatées :

- **S1 — La mise à jour est déjà forcée, sans contrôle.** Comme la page est servie par le réseau d'abord, tout redémarrage en ligne charge la dernière build : Android qui tue l'application en arrière-plan, rechargement, ouverture. Cela peut arriver **pendant une séance**.
- **S2** — Le bouton « Mettre à jour » s'affiche et fonctionne aussi pendant une séance.
- **S3** — Le hors ligne est incomplet : les fichiers `assets/` ne sont mis en cache qu'après avoir été demandés une fois. Le nouveau service worker supprime l'ancien cache dès son activation, et une page encore ouverte sur l'ancienne build peut alors perdre un fichier qu'elle n'avait pas encore chargé.
- **S4** — Aucun téléchargement en arrière-plan de la nouvelle version : rien n'est préparé avant le rechargement. Un rechargement sur un réseau faible donne donc une page lente ou incomplète.
- **S5** — Le texte du bandeau dit « KAIRO » au lieu de REKKA.

### 1.3 Stockage et données

| Point | Constat |
|---|---|
| Clés | Toutes préfixées `rekka-beta:` (état, préférences Liste / Grille, période, son). Le préfixe est stable d'une build à l'autre. |
| Séance en cours | La Musculation est **enregistrée série par série** (`recordProgrammeSet`, effort, douleur, minuteur de repos) : un rechargement ne perd aucune série validée. Les chronomètres de Course, Cross-training et HYROX vivent dans l'écran tant que la séance n'est pas terminée : **un rechargement perd le chrono en cours.** |
| Schéma | Les états sont versionnés et migrés à la lecture (`migrateToCurrent`). Une sauvegarde illisible est conservée à part, jamais effacée. |
| Version plus récente | Un état écrit par une build plus récente produit l'écran « version plus récente » et n'est pas écrasé. Revenir à une build plus ancienne après un changement de schéma **bloque donc l'application** sans perdre les données (**risque R6**). |

### 1.4 Suivi des versions

Les Réglages affichent le commit et la date de build. Il n'y a pas de numéro de version, de notes de version ni d'historique des mises à jour.

## 2. Architecture proposée

### 2.1 Pipeline (GitHub → Cloudflare Pages)

1. **Développement :** `claude/kairo-rc4-dev` n'est **jamais publiée automatiquement**.
2. **Intégration validée :** une demande de fusion vers `claude/rekka-beta`. Un nouveau workflow `rekka-beta-check.yml` s'exécute sur cette demande, **sans secret et sans déploiement** :
   - `pnpm check` ;
   - build BÊTA ;
   - E2E BÊTA sur un serveur local ;
   - E2E de mise à jour (build A puis build B), à 360 et 390 px ;
   - contrôle de la note de version (§ 2.4).
3. **Publication :** la fusion sur `claude/rekka-beta` déclenche le workflow existant, renforcé :
   - mêmes vérifications **avant** le déploiement, E2E local compris (corrige D1) ;
   - déploiement uniquement si toutes réussissent ;
   - vérification sur l'adresse publiée, comme aujourd'hui.
4. **Protection de branche** de `claude/rekka-beta` : demande de fusion obligatoire, vérification « REKKA BÊTA — vérification » obligatoire, pas de push forcé. *Ce réglage se fait dans GitHub (Settings → Branches) : je ne peux pas l'activer moi-même.*
5. **Retour arrière** (D3) : lancement manuel du workflow avec un commit déjà publié de `claude/rekka-beta`. Il est rebâti, revérifié et republié sous un **nouveau numéro de build**, et les téléphones le reçoivent comme une mise à jour. Le retour arrière est refusé si ce commit a un schéma de données plus ancien que la version en ligne (§ 3, R6).
6. La production et TEST ne sont pas modifiées. Aucun déclencheur ne vise leurs branches.

### 2.2 Service worker (mise à jour maîtrisée)

- **Cache versionné par build** : `rekka-beta-<build>`. À la build, un module Vite écrit dans `sw.js` la **liste complète des fichiers** : page, manifeste, icônes, tous les `assets/`.
- **Installation = téléchargement en arrière-plan** (S4) : le nouveau service worker pré-charge tous les fichiers dans son propre cache. Si un seul fichier échoue (réseau coupé), l'installation échoue, la version actuelle reste intacte et un nouvel essai a lieu à la prochaine vérification.
- **Plus de `skipWaiting` automatique** : la nouvelle version **attend** (état *waiting*) que l'application l'accepte.
- **Page en cache d'abord** depuis le cache de la version active. L'application ne change plus de version en cours de route (corrige S1) et fonctionne entièrement hors ligne (S3).
- L'ancien cache n'est supprimé **qu'à l'activation** de la nouvelle version, jamais avant.
- Le service worker ne touche jamais au stockage local (règle conservée et testée).

### 2.3 Côté application

- **Détection** au lancement et au retour au premier plan : `registration.update()` et `version.json`. Le téléchargement démarre aussitôt, en arrière-plan.
- **Message** une fois la nouvelle version prête (téléchargée) : « Une nouvelle version de REKKA est disponible. » avec le bouton **« Mettre à jour maintenant »**.
- **Garde « séance en cours »** : une séance est démarrée et non terminée dans l'état enregistré, ou un écran de séance ou de lecteur est ouvert. Pendant une séance :
  - le message devient « Mise à jour prête — elle sera appliquée après votre séance » ;
  - le bouton est désactivé ;
  - rien n'est activé automatiquement.
- **Activation automatique sûre** au prochain démarrage : si une version est prête **et** qu'aucune séance n'est en cours, elle est activée avant l'affichage de l'application (message `SKIP_WAITING`, puis un seul rechargement). Sinon, l'application démarre sur la version actuelle.
- **Avant toute activation :** l'état est réenregistré (aucune saisie en attente n'est perdue). Une **copie de sauvegarde** de l'état est écrite sous `rekka-beta:kairo.state.backup.<schéma>` quand la nouvelle build va migrer le schéma.

### 2.4 Suivi des versions

- `apps/kairo/release-notes.json`, maintenu sur la branche BÊTA : `[{ version: "0.7.0", date, items: ["…"] }, …]`.
- La CI refuse une publication si l'application a changé sans nouvelle entrée de notes.
- `version.json` publié : `{ commit, channel, version, publishedAt, notes }`. La build embarque aussi ses propres informations.
- **Réglages → « Version »** :
  - numéro de version ;
  - commit publié ;
  - date de publication ;
  - nouveautés de la version ;
  - **historique simple**, construit à partir des notes et complété localement par la date d'installation de chaque version sur ce téléphone (clé `rekka-beta:kairo.updates`, sans donnée sportive).

### 2.5 Tests prévus

Ils sont automatisés avec Playwright (Chromium, contexte persistant, 360 et 390 px) et exécutés en CI :

| Cas | Méthode |
|---|---|
| Première installation | Contexte vierge → service worker actif, tous les fichiers en cache, version affichée. |
| Mise à jour d'une PWA installée | Build A utilisée → build B publiée → message → « Mettre à jour maintenant » → build B affichée, stockage identique octet pour octet. |
| Séance en cours | Séance démarrée (séries validées) → B publiée → message « après votre séance », pas d'activation, y compris au rechargement → fin de séance → mise à jour proposée puis appliquée, séries conservées. |
| Conservation des données | Profil, objectifs, séances planifiées et réalisées, historique et charges, préférences : comparaison complète avant / après, plus un état réel importé. |
| Hors ligne | Réseau coupé après installation → application complète, navigation dans tous les écrans. |
| Redémarrage (approche d'Android) | Fermeture de toutes les pages du contexte persistant, puis réouverture : activation automatique sûre ou maintien selon la garde. |
| Échec de téléchargement | Un fichier de B renvoie une erreur → A reste active et fonctionnelle, aucun message trompeur, nouvel essai réussi ensuite. |
| Retour à la version précédente | Republication de A sous un nouveau numéro de build → les téléphones passent à A, données intactes. Le retour arrière vers un schéma plus ancien est refusé. |
| Migration de schéma | État enregistré par la BÊTA actuelle (`e2cdcc5`) relu par la nouvelle build, copie de sauvegarde présente. |

**Limite :** le redémarrage réel d'un téléphone Android et le comportement de Chrome Android (mise en arrière-plan, arrêt du processus) ne peuvent être qu'approchés en CI. Une vérification manuelle sur votre téléphone reste nécessaire. Elle sera décrite en 5 étapes dans le rapport.

## 3. Risques identifiés

| # | Risque | Mesure |
|---|---|---|
| R1 | **Version de transition :** l'ancien service worker (`skipWaiting`) installe le nouveau, qui peut s'activer une première fois sans garde. | Publier la transition hors séance. Les séries de Musculation sont déjà enregistrées une par une. Toutes les mises à jour suivantes sont gardées. |
| R2 | Android peut fermer l'application pendant une séance. Une version *waiting* s'active alors au démarrage suivant si aucun onglet n'est ouvert : c'est un comportement du navigateur. | Les chronos de Course, Cross-training et HYROX sont perdus dans ce cas, avant comme après. Proposition complémentaire (lot séparé) : enregistrer l'heure de départ du chrono dans l'état. La garde de démarrage refuse d'activer tant qu'une séance est en cours. |
| R3 | Cache d'abord : un service worker défectueux pourrait figer une version. | Le script `sw.js` reste toujours revalidé (`updateViaCache: 'none'`) : un correctif publié remplace donc le service worker. Prévoir un « interrupteur » dans `version.json` qui force l'activation de la version suivante. |
| R4 | Fichiers à télécharger plus volumineux (pré-chargement complet, environ 1 Mo). | Téléchargement en arrière-plan une seule fois par version. Acceptable. |
| R5 | Une fusion validée mais fausse sur le plan sportif est publiée automatiquement. | Il appartient à la validation de la demande de fusion de l'empêcher. Le retour arrière (§ 2.1.5) permet de corriger. |
| R6 | Retour arrière après un changement de schéma : l'ancienne build affiche « version plus récente » et bloque. | Retour arrière refusé dans ce cas (corriger en avant), plus la copie de sauvegarde avant migration. |
| R7 | Protection de branche non activée : un push direct sur `claude/rekka-beta` reste possible. | Le push direct reste vérifié (`pnpm check` et E2E avant publication), mais l'activation de la protection dans GitHub est recommandée. |
| R8 | Le développement en cours (RC5.3) ne doit pas partir en BÊTA. | La mise à jour automatique est développée à partir de `claude/rekka-beta` (`e2cdcc5`), sans RC5.1 ni RC5.3. Seuls les lots validés y sont fusionnés. |

## 4. Plan de mise en œuvre (après accord)

1. Développer sur une branche de travail issue de `claude/rekka-beta`, par exemple `claude/rekka-beta-autoupdate` (à autoriser) :
   - service worker, garde, message, Réglages « Version », notes ;
   - workflows de vérification et de retour arrière ;
   - tests.
2. Valider localement : `pnpm check`, build et tous les E2E du § 2.5, à 360 et 390 px.
3. Demande de fusion vers `claude/rekka-beta`. **La fusion publie** : elle n'aura lieu qu'avec votre accord explicite.
4. Vérification sur l'adresse publiée, puis test manuel sur votre téléphone Android.
