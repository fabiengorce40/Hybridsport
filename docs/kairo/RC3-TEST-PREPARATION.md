# KAIRO RC3 TEST — Rapport de préparation (étapes 1 à 3)

**Rien n'est publié.**
- `claude/kairo-rc1-test-env` : `efc5f2f`, inchangée, jamais poussée.
- Production `claude/crosstraining-c1-c2-spike-vbg8dv` : `f9f7e2e`.
- `gh-pages` : `7bf4a77`.
- Aucune exécution de workflow depuis le 2026-10-14 07:25 UTC (run 38528201782, déploiement de test `849ccee`),
  vérifié par l'API GitHub après les pushs.

Décisions appliquées : D1, D2, D3, D4 (option B), D5.

## 1. Branches préparées

| branche | commit | contenu | pousser déclenche ? |
|---|---|---|---|
| `claude/kairo-rc3-dev` | `8dff0a9` | RC3.1 → RC3.5 ; tests de migration ; D5 ; garde D3 | rien |
| `claude/kairo-rc3-test-candidate` | `a7c1e51` | `claude/kairo-rc1-test-env` (`efc5f2f`) + fusion `--no-ff` de `claude/kairo-rc3-dev` (`b87c3f0`, sans conflit) + libellé D2 | rien |
| `claude/kairo-rc1-test-rollback` | `b2b1f3f` | **descend de la candidate** ; arbre applicatif identique à RC1 TEST (`efc5f2f`) plus la lecture tolérante | rien |

Les déclencheurs `push` des deux workflows sont limités, l'un à `claude/kairo-rc1-test-env`, l'autre à la branche de
production. La candidate n'a **pas** de branche amont configurée : un `git push` sans argument ne peut pas viser la
branche de test.

### Ce que contient la candidate

1. **RC3.1 → RC3.5.**
2. **D5.** Le marqueur de compactage de l'historique n'est plus jamais retenu comme motif d'une séance non planifiée.
   Testé sur les 4 semaines d'historique RC1 réel.
3. **D2.** Titre, bandeau et nom du manifeste : « KAIRO RC3 — TEST ». **Inchangés**, et vérifiés par l'E2E :
   - préfixe de stockage `kairo-rc1-test:` ;
   - identifiant PWA `./?kairo-channel=rc1-test` ;
   - cache du service worker `kairo-rc1-test-1` ;
   - nom court « KAIRO TEST ».
4. **D3.** Garde de publication de production (§4).

## 2. Validations (étape 2)

### Candidate

| contrôle | résultat |
|---|---|
| `pnpm check` | ✅ 2 781 réussis, 1 ignoré, dont **31** de migration RC1 → RC3 et **7** de garde |
| Build de production | ✅ aucune trace du canal de test ; `sw.js` et `manifest.webmanifest` identiques aux sources, octet pour octet |
| Build de test | ✅ « KAIRO RC3 — TEST », mêmes identifiant PWA, cache et préfixe de stockage |
| E2E de production | ✅ 221 / 221 |
| E2E du canal de test | ✅ **241 / 241** : 20 d'isolation (aucune clé hors préfixe, données de production intactes sur origine partagée, aucune requête externe) + 221 du parcours complet |
| Mise à jour sur la même origine (navigateur) | ✅ **93 / 93** sur les 10 états RC1 réels : RC1 TEST avec ses données, puis bascule vers la candidate et rechargement |

Détail de la mise à jour sur la même origine :
- nouvelle build servie ; titre et bandeau RC3 ;
- aucune donnée illisible ; journaux, profil et données Course identiques ;
- séance de musculation reprise avec **00:29** de repos restant ;
- TEST commencé en RC1 repris avec le lecteur ;
- historique de 4 semaines intact ;
- hors ligne fonctionnel ; aucune erreur de page.

### Tests de migration (dans `pnpm check`)

`packages/app-core/tests/rc3-test/rc1-migration.test.ts` (31 tests), sur 10 états **produits par le code RC1 TEST
réel** :
- relecture sans migration ; réécriture **octet pour octet** ;
- historique **identique** à celui que calcule le code RC1 (empreinte SHA-256 de référence) ;
- semaine suivante planifiée **comme par RC1**, au seul champ `cause` près ;
- séances en cours reprises et terminées : Musculation (repos qui tourne ou en pause), Cross-training, HYROX, TEST,
  course adaptée ;
- pause douleur conservée ;
- D5.

## 3. Branche de repli (étape 3, option B)

### Principe

La branche contient le code RC1 TEST (`efc5f2f`) plus une **lecture tolérante** (`packages/app-core/src/store.ts`).
À la lecture, et **seulement** si le schéma RC1 refuse la donnée, elle retire **exactement** les 4 champs que RC3
ajoute :

| champ RC3 | contenu |
|---|---|
| `running.notes` | commentaires des courses libres |
| `running.timeUnknown` | marque « heure non renseignée » des courses datées sans heure |
| `programmeLogs.*.runPlayer` | progression du lecteur de séance Course |
| `planner.weeks.*.requests.*.cause` | motif persisté d'une séance non planifiée (RC3.1 A8) |

Garanties :
- **Aucune réparation au-delà.** Tout autre champ inconnu laisse la donnée « illisible », avec sa copie de secours
  habituelle. Testé, y compris un champ RC3 placé au mauvais endroit.
- **Le texte RC3 d'origine est conservé** sur l'appareil, sous `kairo-rc1-test:kairo.rc3-original`, avant la
  réécriture. Rien n'est effacé.
- **Message clair au chargement :** « Données de l'essai RC3 relues : séances, historique, références, profil et
  douleurs conservés. Mis de côté (non affichés dans cette version) : … Copie complète gardée sur l'appareil. »
- Garde de publication et ses tests conservés.

### Ce qui est conservé : votre critère

Vérifié sur **9 états écrits par la candidate RC3** pendant un essai simulé. Ils utilisent toutes les fonctions RC3 :
- séances RC1 reprises et terminées en RC3 ;
- séance de Musculation en cours avec fatigue élevée (A1) ;
- TEST avec lecteur, en cours et terminé, référence créée ;
- séance de seuil déroulée au lecteur ;
- courses libres commentées, corrigées, supprimées, avec douleur et zones ;
- performance déclarée ;
- dernière course datée et repli A2 ;
- semaines planifiées par RC3 ;
- Cross-training et HYROX terminés, dont un avec douleur ;
- pause douleur.

| donnée | résultat |
|---|---|
| Séances : journaux, séries, charges, efforts, contrôles avant séance, adaptations, résultats du programme | ✅ identiques |
| Historique | ✅ identique (mêmes entrées) |
| Performances de référence (TEST, déclarées) | ✅ identiques |
| Réalisations Running, courses libres comprises (y compris corrigées, sans les supprimées) | ✅ identiques |
| Profil | ✅ identique |
| Douleurs : pause active, zones (y compris celles d'une course libre) | ✅ identiques |
| Séance en cours au moment du repli | ✅ reprise et terminée par le code RC1 (TEST ⇒ référence ; Musculation ⇒ séries conservées) |

Preuves :
- **17 tests app-core**, **2 tests d'interface** ;
- état relu = texte RC3 **exact** moins les 4 champs, comparé à un attendu construit indépendamment du code testé ;
- **repli de bout en bout sur la même origine, 21 / 21** :
  1. RC1 TEST avec ses données ;
  2. candidate RC3 : lecteur lancé et course libre commentée avec douleur, **saisis dans l'interface** ;
  3. build de repli : message affiché ; séances, réalisations, références, profil, douleurs, contrôles et résultats
     identiques ; copie RC3 conservée ; TEST en cours repris ; hors ligne ; aucune erreur.
- `pnpm check` de la branche de repli : 2 693 réussis, 1 ignoré.
- E2E du canal de test : 241 / 241 ; E2E de production : 221 / 221.

### Données RC3 qui ne pourront pas être conservées en RC1 (liste exacte)

Elles ne sont pas effacées : elles restent dans la copie `kairo-rc1-test:kairo.rc3-original`. Mais RC1 ne peut ni
les afficher ni les utiliser.

1. **Commentaires des courses libres** (`running.notes`). Les courses elles-mêmes sont conservées : date, durée,
   distance, ressenti, douleur.
2. **Marque « heure non renseignée »** (`running.timeUnknown`). La course est conservée à l'instant conventionnel
   déjà enregistré par RC3 ; RC1 ne sait simplement plus que l'heure était inconnue.
3. **Progression du lecteur de séance Course** (`runPlayer`) :
   - position, pauses et temps actif ;
   - étapes validées ou passées, avec leur temps ;
   - pour une séance **terminée**, le résultat saisi (durée, distance, temps du test) est conservé ;
   - pour une séance **en cours**, elle continue en RC1 sans lecteur, avec le chrono de RC1 compté depuis le début de
     la séance.
4. **Motif persisté des séances non planifiées** (`cause`). RC1 retrouve son ancien motif affiché, éventuellement
   moins précis : il peut à nouveau citer une « valeur candidate ».

**Ce qui disparaît avec le code RC3, sans perte de donnée :**
- saisie, correction et suppression de courses libres ;
- lecteur Course ;
- ajustement de l'effort selon la fatigue (A1) pour les **nouveaux** départs ;
- repli A2 pour les **nouvelles** semaines : un TEST demandé sans distance redevient « non planifié » ;
- avertissements de faisabilité Cross-training ;
- date de la dernière course à l'onboarding.

RC1 n'affichait déjà pas les courses libres dans l'historique : elles restent dans les données Course et sont lues
par le moteur Running.

## 4. Protection contre une publication accidentelle en production

### Garde appliquée

C'est le correctif déjà préparé sur `claude/kairo-pages-guard` (`8482ae2`), repris **à l'identique** pour éviter des
copies divergentes. Validé par actionlint 1.7.7.
- **Job `refuse`** : sans aucune permission, il échoue avec « Publication refusée » si la référence n'est pas
  exactement `refs/heads/claude/crosstraining-c1-c2-spike-vbg8dv`.
- **Job `deploy`** : celui qui pousse sur `gh-pages`, gardé par la même condition exacte.
- **Job `verify`** : dépend de `deploy`, donc sauté avec lui.
- **7 tests** (`apps/kairo/tests/deploy-guard.test.ts`) lisent le fichier lui-même. Le test G-7 exige que **tout**
  workflow qui pousse sur `gh-pages` porte la garde.

### Copies du workflow (inventaire de toutes les branches distantes)

Un lancement manuel exécute **la copie de la branche choisie**.

| branches | copie de `kairo-pages.yml` |
|---|---|
| `claude/kairo-rc3-dev`, `claude/kairo-rc3-test-candidate`, `claude/kairo-rc1-test-rollback`, `claude/kairo-pages-guard` | **gardée** |
| `claude/kairo-rc1-test-env` | **non gardée** aujourd'hui ; gardée **dès** son avance sur la candidate |
| production `claude/crosstraining-c1-c2-spike-vbg8dv` | non gardée, mais c'est la source autorisée |
| `claude/c4-crosstraining-full-session` (PR #2), `claude/strength-fixes-precheck` (PR #3), `claude/kairo-rc1`, `claude/consolidation-pr2-pr3`, `claude/strength-r1-r2`, `claude/kairo-p0-safety-audit`, `claude/kairo-rc2-planner-study`, `claude/kairo-rc2bis-week-study`, `claude/kairo-rc3-prep`, `claude/kairo-rc1-test-rest-labels` | **NON GARDÉE** |
| `claude/fitness-app-architecture-81fs92` (branche par défaut), `claude/running-wave2-mutation-closure-mawomr`, `gh-pages` | absente |

### Limites : la production n'est PAS totalement protégée

Chemins de publication **non gardés** qui subsistent :

1. **Lancement manuel depuis l'une des 10 branches non gardées** ci-dessus, plus `claude/kairo-rc1-test-env` tant
   qu'elle n'a pas avancé. Il publierait cette branche sur `gh-pages`.
   - Le bouton *Run workflow* n'apparaît normalement que si le workflow existe sur la branche par défaut, ce qui
     n'est pas le cas ici.
   - Mais un lancement manuel sur une branche non par défaut **a déjà eu lieu** (run 38523443393, workflow de test,
     2026-10-14). Ce chemin est donc à considérer comme **ouvert** (API, `gh workflow run`, interface).
2. **Branches futures** créées depuis une branche non gardée : elles hériteront d'une copie non gardée.
3. **Aucune protection de dépôt** : `gh-pages` non protégée, aucune règle (*rulesets* vide). Un compte ayant le droit
   d'écriture peut :
   - pousser directement sur `gh-pages` ;
   - modifier ou retirer la garde d'une copie ;
   - ajouter un autre workflow.

   La garde n'empêche rien de tout cela.
4. **Push sur la production** : publication normale, voulue.
5. **Non vérifiable d'ici** (accès refusé par le proxy) : permissions *Actions* du dépôt, environnements GitHub,
   source de publication de GitHub Pages.

Pour fermer ces chemins (hors de mon autorisation actuelle) :
- appliquer la garde aux 10 autres branches (procédure dans `docs/kairo/KAIRO-PAGES-GUARD.md`) ;
- l'appliquer aussi à la production : ce push **republie** la production, sauf avec `[skip ci]` ;
- protéger `gh-pages` ou ajouter une règle de dépôt.

Ces trois mesures demandent votre décision.

## 5. Publication (étapes 5 à 7) : en attente de votre autorisation explicite

**Avant**, sur le téléphone, dans RC1 TEST : terminer ou arrêter toute séance en cours, puis Réglages → « Exporter
mes données ».

### Déployer RC3 TEST

Avance rapide de `efc5f2f` à `a7c1e51`, sans nouveau commit ni réécriture d'historique :

```bash
git push origin a7c1e51:refs/heads/claude/kairo-rc1-test-env
```

Le workflow de test se déclenche ensuite (chemins `apps/**` et `packages/**` modifiés) :
- `pnpm check`, build, déploiement Cloudflare `kairo-rc1-test` ;
- vérification de `version.json` et E2E sur l'adresse réelle.

Je contrôlerai ensuite l'exécution et l'absence de toute exécution de `kairo-pages.yml`.

### Revenir à RC1 en cas de défaut

Avance rapide de `a7c1e51` à `b2b1f3f`, possible car la branche de repli descend de la candidate :

```bash
git push origin b2b1f3f:refs/heads/claude/kairo-rc1-test-env
```

Le même workflow redéploie alors RC1 avec la lecture tolérante.

**À éviter :** le retour au déploiement Cloudflare `849ccee` depuis le tableau de bord. Ce code RC1 d'origine
déclarerait « illisibles » les données écrites par RC3 (option A du plan).

## 6. Points d'attention

- **`claude/kairo-rc1-test-rest-labels`** (`077a933`, 2026-10-14, une autre session) : libellés du repos montée en
  charge / séries de travail, posés sur RC1 TEST. Cette branche **n'est pas** intégrée à la candidate, car ce n'était
  pas demandé. À intégrer plus tard si vous le souhaitez.
- **Copie RC3 d'origine.** Elle est réécrite à chaque chargement de données RC3 par la build de repli. Elle s'ajoute
  à l'état dans le stockage local : environ 300 Ko au plus sur 4 semaines d'historique.
- **Séance laissée en cours au-delà de sa semaine** : retirée à la clôture, en RC1 comme en RC3. Comportement
  existant, d'où l'étape préalable.
