# REKKA BÊTA — version complète de validation utilisateur

**Branche :** `claude/rekka-beta`, issue de `claude/kairo-rc4-dev` (`fbaf32c`) avec la seule couche de canal BÊTA en plus.

**Adresse stable :** `https://rekka-beta.pages.dev` (projet Cloudflare Pages `rekka-beta`). L'adresse réelle est confirmée par le journal de déploiement du workflow.

**Isolation :** production (GitHub Pages), TEST (`kairo-rc1-test`) et prévisualisation R5.1 (`kairo-r51-preview`) **non modifiés**.

## 1. Canal BÊTA (ce qui distingue cette build)

| Élément | BÊTA | Production |
|---|---|---|
| Origine | `rekka-beta.pages.dev` (propre) | `fabiengorce40.github.io/Hybridsport` |
| Stockage local | Toutes les clés préfixées `rekka-beta:` (état, Liste / Grille, période, son du lecteur de course) | Clés historiques `kairo.*` |
| Service worker | Cache `rekka-beta-1` ; ne supprime **que** ses propres caches ; ne touche jamais au stockage local | Cache `kairo-beta0-2` |
| Manifeste PWA | « REKKA BÊTA », nom court « REKKA β », identifiant `./?kairo-channel=beta`, couleur `#0E5E52` | « KAIRO » |
| Identité visible | Bandeau fixe « REKKA BÊTA · *commit* · données séparées » ; titre « REKKA BÊTA » ; commit aussi dans Réglages | Aucun bandeau |
| Version publiée | `version.json` : `{"commit": …, "channel": "beta"}` | `version.json` de production |

- **Mises à jour sans perte :** le préfixe est stable. Une nouvelle build relit exactement les mêmes clés et applique les migrations de schéma existantes. Le service worker ne supprime que des caches.
- **Garde anti-écrasement :** le workflow refuse de publier si le projet `rekka-beta` existe déjà sans publier la BÊTA REKKA.

## 2. Fonctionnalités réellement disponibles (code de `claude/kairo-rc4-dev` à `fbaf32c`)

- **Accueil et navigation :**
  - accueil (séance du jour, progression de la semaine, avertissements) ;
  - barre de navigation Accueil / Planning / Historique / Programme / Réglages ;
  - création du programme guidée (sports, objectifs, disponibilités, matériel).
- **Planning :**
  - **Grille** : une ligne par jour, navigation entre semaines ;
  - **Liste** : catalogue par sport, cette semaine / 2 semaines ;
  - préférences mémorisées ;
  - séances non planifiées affichées avec leur motif.
- **Génération des séances :**
  - **Musculation** : Full Body, Haut / Bas ; progression par track, mollets à temps résiduel, une seule isolation du haut du corps en Full Body (RC4.6 V3), tirage complémentaire à temps résiduel (RC4.6 L1b-4) ;
  - **Course** : allures, tests, courses libres ;
  - **Cross-training** : formats, bloc de force délégué ;
  - **HYROX** : stations, rôles, faisabilité.
- **Planification multisport :** placement global G5, arbitrage des interférences M3, explication des déplacements.
- **Séances interactives :**
  - validation série par série (charge, répétitions, RIR) ;
  - minuteur de repos (pause, prolongation, son, vibration) ;
  - lecteur de course (étapes, chrono, distance validée à la main) ;
  - minuteur Cross-training ;
  - déroulé HYROX.
- **Adaptations et avertissements :**
  - contrôle avant séance (douleur, fatigue, récupération) ;
  - séance adaptée, reportée ou maintenue (interférence acceptée) ;
  - pause de sécurité en cas de douleur ;
  - matériel indisponible (substitution) ;
  - récupération après course libre ;
  - avertissements de semaine (volume, interférences).
- **Reproductibilité :** entrées croisées Musculation persistées (RC4.6 lot 1).
- **Historique et données :**
  - historique des séances ;
  - Journal Beta (ressenti terrain) ;
  - export et import des données ;
  - bandeau « Nouvelle version disponible » avec « Mettre à jour » ;
  - fonctionnement hors ligne après le premier chargement.

## 2 bis. Mise à jour Course (corrections du commit `9eb1a4c`, appliquées seules)

- **Saisie Course en trois natures**, choix obligatoire :
  - sortie d'entraînement : jamais utilisée comme performance de référence ;
  - chrono personnel : effort maximal confirmé ;
  - course officielle.
- **Requalification** d'un chrono en sortie d'entraînement :
  - uniquement après confirmation explicite ;
  - la référence reste dans l'historique ;
  - aucun doublon de course réalisée.
- **Nouvelle tentative ciblée** des séances de course refusées de la semaine en cours, après une saisie ou une requalification.
- **Séance de course non planifiée** :
  - information nommée (« Il manque votre dernière course réelle ») ;
  - actions directes : enregistrer une course, requalifier un chrono.
- **Profil Course** : capacités affichées (séances clés disponibles ou non prévues par l'objectif, source des allures).
- **Données existantes :** aucune modification automatique. Le schéma reste en version 2, avec un seul champ facultatif ajouté (`running.requalified`). Les états enregistrés par la BÊTA précédente (`0a194f0`) sont relus sans migration et réécrits octet pour octet.
- **Non inclus :** RC5.1 (Haut A/B et Bas A/B), études et autres développements non validés de `claude/kairo-rc4-dev`.

## 3. Absent ou limité (ne pas considérer comme intégré)

- **Études non intégrées :**
  - variantes **Haut A/B et Bas A/B** (non commencées, en attente de décision) ;
  - **B4+** pour Cross-training et HYROX (lot 3, étude seulement) ;
  - **nouvelle convention de comptage musculaire** (lot 4, revue seulement, à valider par un professionnel) ;
  - prototypes jetables L1-bis, L2 et L2-bis.
- **Interface :** les textes de l'application disent encore « KAIRO » ; seul le canal affiche « REKKA BÊTA ».
- **Contenu sportif :** ruleset et catalogue **provisoires** (statut `draft`, non relus). Les séances sont marquées provisoires ou expérimentales.
- **Données :** aucun compte ni synchronisation. Les données restent sur le téléphone ; sauvegarde par « Exporter mes données ».
- **Capteurs :** aucun GPS ni cardiofréquencemètre. Les distances de course se valident à la main.

## 4. Vérifications

| Vérification | Résultat |
|---|---|
| `pnpm check` (typecheck, lint, tests) | **2988 tests réussis**, 2 ignorés |
| Build de production `pnpm kairo:build` | Réussie, **identique** : aucune trace du canal, titre « KAIRO » |
| E2E de production `pnpm kairo:e2e` | Réussi (303 vérifications) |
| Build BÊTA `pnpm kairo:build:beta` | Réussie : titre, manifeste et service worker BÊTA |
| E2E BÊTA `pnpm kairo:e2e:beta` (local) | **Réussi (335 vérifications)** : identité et commit, isolation des clés et caches de production, TEST et prévisualisation, état utilisateur importé, Liste / Grille, mise à jour du service worker sans perte, parcours complet sur téléphone (360 / 390 px) |
| Mise à jour réelle `pnpm kairo:e2e:beta-update` (local) | **Réussie** : build A utilisée, build B publiée, « Mettre à jour », commit B affiché, données identiques octet pour octet |
| Après déploiement (workflow) | `version.json` = commit et canal BÊTA, puis E2E BÊTA complet sur l'adresse stable |

## 5. Installer la BÊTA sur l'écran d'accueil Android

1. Ouvrir **Chrome** sur le téléphone et aller à l'adresse de la BÊTA.
2. Attendre le chargement complet. Le bandeau vert « REKKA BÊTA · *commit* » s'affiche en haut.
3. Menu **⋮** (en haut à droite) → **Ajouter à l'écran d'accueil** ou **Installer l'application** → **Installer**.
4. L'icône **« REKKA β »** apparaît sur l'écran d'accueil. Elle s'ouvre en plein écran, sans barre d'adresse, avec des données séparées de toute autre version.
5. **Mises à jour :** à l'ouverture, un bandeau « Nouvelle version disponible » apparaît si une build plus récente est publiée. Appuyer sur **Mettre à jour**. Les données sont conservées.
6. **Sauvegarde conseillée :** Réglages → « Exporter mes données », de temps en temps.

Ne pas utiliser « Effacer les données du site » dans Chrome pour cette adresse : cela supprime les données de la BÊTA.
