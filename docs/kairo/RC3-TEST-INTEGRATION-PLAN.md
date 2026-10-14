# KAIRO RC3 TEST — Plan d'intégration de RC3.1 à RC3.5 dans l'environnement de test

**Statut : préparation seulement.**
- Rien n'a été fusionné, poussé sur `claude/kairo-rc1-test-env` ni déployé.
- Production intacte :
  - `claude/crosstraining-c1-c2-spike-vbg8dv` = `f9f7e2e` ;
  - `gh-pages` = `7bf4a77` ;
  - dernière exécution de `kairo-pages.yml` : 2026-10-11, run 38179370211.
- RC1 TEST actuel : branche `efc5f2f`, déploiement `849ccee` (run 38528201782).

## 1. Différences entre les deux branches

Les deux branches partent du **même commit** `f0b09e4` (version candidate RC1).

| | `claude/kairo-rc1-test-env` (+5 commits) | `claude/kairo-rc3-dev` (+13 commits) |
|---|---|---|
| Contenu | infrastructure de test seulement : canal `rc1-test` (`channel.ts`, préfixe de stockage, bandeau), transformation du manifeste et du service worker (`vite.config.ts`), workflow Cloudflare, E2E d'isolation, documentation | RC3.1 → RC3.5 : `packages/app-core` (12 fichiers), interface `apps/kairo/src` (15 fichiers), tests, rapports |
| Paquets (`packages/`) | **aucun changement** | moteurs inchangés ; app-core seulement |
| Fichiers communs modifiés | **aucun** | |
| Dépendances (`pnpm-lock.yaml`) | inchangées | inchangées |

**Fusion d'essai** (arbre de travail temporaire, non committée, non poussée) :
- automatique, **sans conflit** ;
- `pnpm check` : 2 743 réussis, 1 ignoré ;
- build de production et build de test ;
- E2E du canal de test : **241 / 241** (20 contrôles d'isolation + 221 du parcours complet) ;
- E2E de production : OK.
- Dans la build de production fusionnée : aucune trace du canal de test ; `sw.js` et `manifest.webmanifest` identiques
  aux sources, octet pour octet.

## 2. Données RC1 TEST déjà sur le téléphone

### 2.1 Ce qui garantit la continuité

| élément | RC1 TEST | après intégration | effet |
|---|---|---|---|
| origine | `kairo-rc1-test.pages.dev` | **inchangée** (même projet, même branche `main`) | même stockage local |
| clé de l'état | `kairo-rc1-test:kairo.state` | **inchangée** | les données sont relues |
| version du schéma | 2 | **2** | aucune migration à exécuter |
| service worker | `sw.js`, cache `kairo-rc1-test-1` | **identique octet pour octet** | aucun remplacement ; la page passe par le réseau en premier et sera revalidée, donc la nouvelle build est servie au premier chargement en ligne |
| `id` du manifeste | `./?kairo-channel=rc1-test` | **inchangé** | l'application installée reste la même |

RC3 n'ajoute au schéma que **4 champs facultatifs** :
- `cause` sur une demande non planifiée (RC3.1 A8) ;
- `running.notes` (RC3.3) ;
- `running.timeUnknown` (RC3.4) ;
- `runPlayer` sur une séance en cours (RC3.5).

Aucun champ existant n'est modifié ni supprimé.

### 2.2 Tests de migration (préparés et verts)

Les **10 états RC1** de test sont produits par le **code RC1 TEST réel** (`efc5f2f`). Ce sont les fixtures
`packages/app-core/tests/rc3-test/fixtures/rc1-*.json`, c'est-à-dire le texte exact stocké sur le téléphone :

1. Musculation en cours, chrono de repos qui tourne ;
2. Musculation en cours, chrono de repos en pause (40 s figées) ;
3. Cross-training en cours, chrono lancé, tours saisis ;
4. HYROX en cours, en pause, avec une charge réelle ;
5. TEST Running commencé ;
6. Course adaptée par le contrôle avant séance (genou P2, remplacée par le rameur), en cours ;
7. Pause douleur active ;
8. TEST demandé sans distance (cas A2) ;
9. Semaine 2 après TEST (séance de seuil) ;
10. Profil hybride Musculation + Course sur 4 semaines : séances faites, manquées, retours terrain.

**`rc1-migration.test.ts` (30 tests)**

| garantie | résultat |
|---|---|
| Relecture | ✅ sans migration ni copie « illisible » |
| Réécriture | ✅ **identique octet pour octet** au texte RC1 |
| Profils, journaux de séance, contrôles avant séance, réalisations et références Running | ✅ identiques |
| Historique | ✅ **identique** à celui que calcule le code RC1 (empreinte SHA-256 de référence, `reference-rc1-efc5f2f.json`) |
| Semaine suivante planifiée par RC3 | ✅ **identique** à la planification RC1, au seul champ `cause` près (même empreinte) |
| Musculation | ✅ même temps de repos restant ; pause, « passer », fin de séance ; séries conservées |
| Cross-training et HYROX | ✅ temps, tours, étapes et charges conservés ; reprise et fin |
| TEST Running commencé en RC1 | ✅ le lecteur RC3.5 démarre sur la séance persistée ; la fin enregistre la référence |
| Course adaptée | ✅ le lecteur déroule la séance adaptée (rameur) |
| Pause douleur | ✅ conservée ; tout nouveau départ refusé |
| Vues RC3.1 à RC3.4 | ✅ motif A8 sans valeur candidate ; repli A2 la semaine suivante ; dernière course de l'onboarding visible comme course libre ; profil Course relu |

**Comparaison différentielle complète, RC1 contre RC3, sur les mêmes états.**
- Historique : **aucune différence**.
- Planification de la semaine suivante : seul le champ `cause` est ajouté.
- Vues de la semaine : seuls diffèrent le motif affiché des séances non planifiées (RC3.1 A8, voulu) et le champ
  `runningTestFallback` (null).

### 2.3 Mise à jour sur la même origine (navigateur, comme sur le téléphone)

Script local (non versionné, rejoué à l'étape 2 ; Chromium, 360 × 740, tactile) :
1. sert la build **RC1 TEST** avec des données RC1, service worker installé ;
2. bascule le serveur, sur la même adresse, vers la build **fusionnée** ;
3. recharge.

Résultat : **27 / 27** sur 3 jeux de données (Musculation en cours, TEST en cours, historique de 4 semaines).

| contrôle | résultat |
|---|---|
| Nouvelle build | ✅ servie au rechargement |
| Données | ✅ aucune donnée illisible ; données identiques ; aucune clé hors du préfixe de test |
| Musculation | ✅ séance proposée à la reprise ; repos restant **00:29** (30 s attendues) |
| Course | ✅ TEST repris, lecteur lancé |
| Historique | ✅ affiché avec les retours terrain ; « Ajouter une course » présent |
| Hors ligne | ✅ fonctionne après la mise à jour |
| Erreurs de page | ✅ aucune |

**À savoir.** En local, la nouvelle build n'est servie que si l'hébergeur signale un fichier modifié. Mon serveur
local valide par date : une build construite **avant** l'ancienne était resservie (réponse 304). Cloudflare Pages
valide par contenu (ETag), donc ce cas ne se produit pas. Le workflow vérifie de toute façon `version.json` sur
l'adresse déployée.

### 2.4 Comportement existant à connaître (inchangé, RC1 compris)

Une séance laissée **en cours** au-delà de la fin de sa semaine est retirée des journaux à la clôture de la semaine.
RC1 et RC3 donnent la même empreinte. Recommandation : terminer (ou déclarer arrêtée) toute séance en cours avant la
mise à jour.

## 3. Workflows et production

| workflow | déclencheur | effet |
|---|---|---|
| `kairo-rc1-test-pages.yml` (branche de test seulement) | **push sur `claude/kairo-rc1-test-env`** (chemins `apps/kairo`, `packages`…) ou lancement manuel ; job gardé sur cette branche | `pnpm check`, build de test, déploiement Cloudflare `kairo-rc1-test`, E2E sur l'adresse déployée |
| `kairo-pages.yml` (production) | push sur `claude/crosstraining-c1-c2-spike-vbg8dv` ; **lancement manuel depuis n'importe quelle branche** | publie `gh-pages` (`contents: write`) |

Conséquences :
1. **Pousser l'intégration sur `claude/kairo-rc1-test-env`, c'est déployer.** Aucun push ne sera fait sur cette
   branche sans votre accord.
2. **Pousser `claude/kairo-rc3-dev` ou une branche candidate ne déclenche rien**, ni test ni production.
3. **Risque résiduel, déjà signalé en RC1.** Un lancement manuel de « KAIRO — PWA GitHub Pages » depuis la branche de
   test publierait cette branche en production. Correctif proposé (décision D3) : dans la copie de `kairo-pages.yml`
   des branches de test **seulement**, ajouter une garde de job
   `if: github.ref == 'refs/heads/claude/crosstraining-c1-c2-spike-vbg8dv'`. Un lancement depuis une branche de test
   ne fait alors plus rien. La branche de production n'est pas touchée.

Aucune action de cette préparation n'a déclenché de workflow : la dernière exécution de `kairo-pages.yml` date du
2026-10-11.

## 4. Retour à RC1 TEST

Le point délicat : **le code RC1 refuse les données écrites par RC3 dès qu'un des 4 champs ajoutés est présent**.
Ses schémas sont stricts. Vérifié avec le code RC1 réel :

| données écrites par RC3 | relues par RC1 |
|---|---|
| données RC1 simplement ouvertes par RC3 (10 / 10) | ✅ lisibles |
| semaine suivante planifiée sans séance « non planifiée » (8 / 10) | ✅ lisibles |
| semaine suivante avec une séance non planifiée (`cause`) | ❌ « Données illisibles » |
| lecteur Course lancé (`runPlayer`) | ❌ |
| course libre commentée (`running.notes`) | ❌ |
| dernière course datée à l'onboarding (`running.timeUnknown`) | ❌ |

Rien n'est effacé dans ces cas : RC1 garde une copie de secours et propose de l'exporter. Mais il ne peut pas
l'utiliser. Après quelques jours d'essai, un retour « sec » à RC1 afficherait presque sûrement « Données
illisibles ».

### Options

| option | données conservées | préparation |
|---|---|---|
| **A. Retour Cloudflare au déploiement `849ccee`** (*Deployments* → *Rollback*), puis import de l'export fait **avant** la mise à jour | données RC1 d'avant la mise à jour ; **perte de tout ce qui a été saisi pendant l'essai RC3** | aucune, sauf l'export préalable (étape 0) |
| **B. Build « RC1 TEST de repli » préparée à l'avance (recommandée)** : code RC1 `efc5f2f` + **lecture tolérante** qui retire les 4 champs RC3 au chargement | **toutes** les séances, l'historique et les profils, y compris ceux de l'essai ; seules les annexes RC3 sont perdues : commentaires de courses, marque « heure non renseignée », progression du lecteur, motif persisté | branche `claude/kairo-rc1-test-rollback`, testée sur les états écrits par RC3 ; déployée **seulement si besoin** (push sur `claude/kairo-rc1-test-env`, avec votre accord) |

Les deux options ne touchent jamais la production.

## 5. Plan d'intégration proposé

Chaque étape attend votre accord.

| étape | qui | action | déploie ? |
|---|---|---|---|
| 0 | vous | sur le téléphone, dans RC1 TEST : terminer ou arrêter toute séance en cours, puis **Réglages → Exporter mes données** et garder le fichier | non |
| 1 | moi | branche **candidate** `claude/kairo-rc3-test-candidate` : fusion `--no-ff` de `claude/kairo-rc3-dev` dans `claude/kairo-rc1-test-env` ; garde D3 ; libellé D2 si validé ; push | **non** (aucun workflow sur cette branche) |
| 2 | moi | sur la candidate : `pnpm check`, builds de production et de test, E2E de production, E2E d'isolation + parcours (241), mise à jour sur la même origine (27), tests de migration (30) | non |
| 3 | moi | si B est retenue : branche `claude/kairo-rc1-test-rollback` (RC1 + lecture tolérante), tests de relecture des états écrits par RC3, E2E | non |
| 4 | vous | relecture du rapport de l'étape 2 et **feu vert au déploiement** | — |
| 5 | moi | avance rapide de `claude/kairo-rc1-test-env` sur la candidate (aucun nouveau commit, aucune réécriture d'historique), puis push | **oui, test seulement** : le workflow fait `pnpm check`, build, déploiement, puis `version.json` et E2E sur l'adresse réelle |
| 6 | moi | contrôle : exécution réussie, `version.json` = commit fusionné, canal `rc1-test` ; production inchangée (`gh-pages`, branche de production, aucune exécution de `kairo-pages.yml`) | — |
| 7 | vous | sur le téléphone, en ligne : ouvrir KAIRO TEST, **recharger une fois**, puis vérifier données, historique et une séance | — |

## 6. Risques

| risque | probabilité | effet | parade |
|---|---|---|---|
| Données RC1 non relues | faible (10 états réels, mise à jour sur la même origine vérifiée) | écran « Données illisibles », copie conservée | export de l'étape 0 ; aucun écrasement possible (copie de secours automatique) |
| Ancienne build encore affichée | faible | RC1 continue de fonctionner | ouvrir en ligne puis recharger ; `version.json` vérifié par le workflow |
| Séance laissée en cours d'une semaine à l'autre | existant, aussi en RC1 | séance retirée à la clôture | étape 0 |
| Retour à RC1 après l'essai | certain si option A | « Données illisibles » | option B (recommandée) ou import de l'export |
| Publication accidentelle en production | très faible (lancement manuel du mauvais workflow) | publication de la branche de test sur `gh-pages` | garde D3 |
| Bandeau « KAIRO RC1 — TEST » sur du RC3 | certain sans D2 | confusion de version | D2 (libellé seulement) |
| Règles RC3 non validées sportivement | — | essais terrain = objectif | bandeau « règles expérimentales non validées » conservé |

## 7. Décisions demandées

- **D1.** Valider ce plan (étapes 0 à 7).
- **D2.** Libellé visible « KAIRO RC3 — TEST » : titre, bandeau, nom du manifeste. Le préfixe de stockage, l'`id` du
  manifeste et le cache du service worker restent **inchangés**, sinon les données seraient perdues. Par défaut :
  changer le libellé.
- **D3.** Garde de branche dans la copie de `kairo-pages.yml` des branches de test. Par défaut : oui.
- **D4.** Retour arrière : option B (build de repli préparée à l'avance) ou A. Par défaut : B.
- **D5 (mineur, facultatif).** Sur les très anciennes semaines compactées, le motif interne retenu par RC3.1 A8 est
  le marqueur de compactage. Le texte affiché est le même qu'en RC1 (message générique de la catégorie). Correctif
  d'une ligne possible ; non bloquant.
