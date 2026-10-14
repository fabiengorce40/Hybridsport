# Protection du workflow de production `kairo-pages.yml`

**Objectif :** seule la branche `claude/crosstraining-c1-c2-spike-vbg8dv` peut publier en production, c'est-à-dire
sur GitHub Pages via la branche `gh-pages`. Une branche de test ou d'étude lancée par erreur avec *Run workflow*
(`workflow_dispatch`) ne doit rien publier.

**Branche du correctif :** `claude/kairo-pages-guard`, créée depuis la production (`f9f7e2e`).

Ce correctif ne touche ni la branche de production, ni `gh-pages`, ni aucune PR. Il n'a déclenché aucun déploiement.

## 1. Le point qui change tout : quelle copie du workflow s'exécute

Un lancement manuel exécute la copie de `kairo-pages.yml` **de la branche choisie** dans le menu *Run workflow*, et
non celle de la branche de production.

Aujourd'hui, **11 branches** du dépôt contiennent une copie **identique** du workflow : `workflow_dispatch` actif,
**aucune garde de branche**. Le job `deploy` pousse alors sur `gh-pages` le code de la branche choisie.

| branche | rôle |
|---|---|
| `claude/crosstraining-c1-c2-spike-vbg8dv` | **production** |
| `claude/c4-crosstraining-full-session` | PR #2 |
| `claude/strength-fixes-precheck` | PR #3 |
| `claude/kairo-rc1` | RC1 (`f0b09e4`) |
| `claude/kairo-rc1-test-env` | environnement de test |
| `claude/consolidation-pr2-pr3`, `claude/strength-r1-r2`, `claude/kairo-p0-safety-audit`, `claude/kairo-rc2-planner-study`, `claude/kairo-rc2bis-week-study`, `claude/kairo-rc3-prep` | études |

**Conséquence :** mettre la garde **seulement** sur la branche de production protège les branches **créées
ensuite** depuis la production. Cela ne protège **pas** un lancement manuel depuis les 10 autres branches existantes.
Il faut donc appliquer la garde à **chaque** copie (option A), ou rendre la publication indépendante des copies
(option B, §5).

## 2. Diff exact

Fichier `docs/kairo/ops/kairo-pages-guard.patch`. Il s'applique **sans conflit** aux 11 branches, vérifié par
`git apply --check` sur chacune.

```diff
--- a/.github/workflows/kairo-pages.yml
+++ b/.github/workflows/kairo-pages.yml
@@ -19,8 +19,21 @@ concurrency:
 env:
   SITE_URL: https://fabiengorce40.github.io/Hybridsport/
 
+# Garde de publication : SEULE la branche de production publie sur GitHub Pages. Un lancement manuel
+# (workflow_dispatch) depuis toute autre branche ou étiquette est refusé explicitement et ne publie rien.
 jobs:
+  refuse:
+    if: github.ref != 'refs/heads/claude/crosstraining-c1-c2-spike-vbg8dv'
+    runs-on: ubuntu-latest
+    permissions: {}
+    steps:
+      - name: Publication refusée (branche non autorisée)
+        run: |
+          echo "::error::Publication refusée : seule la branche claude/crosstraining-c1-c2-spike-vbg8dv peut déployer en production (référence reçue : ${GITHUB_REF})."
+          exit 1
+
   deploy:
+    if: github.ref == 'refs/heads/claude/crosstraining-c1-c2-spike-vbg8dv'
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
```

**Comportement :**

| lancement | `refuse` | `deploy` | `verify` | effet |
|---|---|---|---|---|
| push sur la production | sauté | **exécuté** | exécuté | publication normale, inchangée |
| *Run workflow* sur la production | sauté | **exécuté** | exécuté | publication normale, inchangée |
| *Run workflow* sur toute autre branche (protégée par la garde) | **échoue** avec « Publication refusée… » | sauté | sauté (dépend de `deploy`) | **rien n'est publié** |
| *Run workflow* sur une étiquette | **échoue** | sauté | sauté | rien n'est publié |

La comparaison est **exacte** sur la référence complète (`refs/heads/…`). Une branche nommée
`…-vbg8dv-copy`, `x/claude/…` ou une étiquette du même nom ne passe pas.

## 3. Tests et vérifications

### `apps/kairo/tests/deploy-guard.test.ts`

7 tests, inclus dans `pnpm check`, lus **dans le fichier** : la condition n'est pas recopiée dans le test.

| test | vérifie |
|---|---|
| G-1 | Le déclenchement automatique reste limité à la production. |
| G-2 | Le job qui pousse sur `gh-pages` porte la garde exacte. |
| G-3 | Décision pour 9 références (production, RC1, test, RC3, homonymes, étiquette, `main`, PR) : seule la production publie, toutes les autres sont refusées. |
| G-4 | Le job de refus échoue avec un message, n'a **aucune permission** (`permissions: {}`) et ne fait ni checkout ni push. |
| G-5 | `verify` dépend de `deploy`, donc il est sauté avec lui. |
| G-6 | Permissions : seule `contents: write` (indispensable pour pousser `gh-pages`), aucune autre portée en écriture. |
| G-7 | **Tout** workflow du dépôt qui pousse sur `gh-pages` porte la garde, ce qui protège aussi les workflows futurs. |

### Contre-épreuve

Sur le fichier **sans** la garde, **4 tests sur 7 échouent** (G-2, G-3, G-4, G-7). Avec la garde, 7 sur 7 passent.

### Autres vérifications

- **actionlint :** aucune alerte (YAML, expressions, contextes).
- **`pnpm check` :** voir le compte rendu de fin.

### Permissions observées

Lecture seule par l'API GitHub, certaines routes étant inaccessibles depuis cette session.

- **Dépôt public.** Seuls les comptes ayant le droit d'**écriture** peuvent lancer *Run workflow*.
- **Aucune protection** de branche sur `gh-pages` ni sur la production (`protected: false`), **aucune règle**
  (*rulesets* vide).
- **Non lisibles d'ici** (refus du proxy) : permissions Actions du dépôt et environnements. À vérifier dans
  *Settings* → *Actions* → *General* et *Settings* → *Environments*.
- **Le workflow demande `contents: write` au niveau global.** Après le correctif, le job `refuse` n'a plus aucune
  permission ; `deploy` garde `contents: write`, nécessaire.

## 4. Application sans risque — option A (recommandée maintenant)

Aucune étape ne publie, à condition de suivre l'ordre indiqué.

### Étape 1 — Production

Seule cette étape touche la branche de production. Elle demande votre autorisation explicite.

**Attention :** pousser sur la production **déclenche le workflow**, donc une **publication**. Le correctif ne
modifie que `.github/workflows/`, et ce chemin fait partie des chemins déclencheurs. La publication porterait
exactement le même code applicatif que la production actuelle (`f9f7e2e`) : c'est une republication identique, plus
la vérification E2E sur l'adresse HTTPS.

Deux façons de faire :

- **Avec republication identique (simple) :** fusion *fast-forward* de `claude/kairo-pages-guard` vers la production
  (un seul commit au-dessus de `f9f7e2e`).

  ```bash
  git fetch origin
  git checkout claude/crosstraining-c1-c2-spike-vbg8dv
  git merge --ff-only origin/claude/kairo-pages-guard
  git push origin claude/crosstraining-c1-c2-spike-vbg8dv
  ```

  Ensuite : *Actions* → « KAIRO — PWA GitHub Pages ». Le job `refuse` doit être *skipped*, `deploy` et `verify`
  *success*.

- **Sans aucune publication :** même commit, mais avec `[skip ci]` dans le message du commit poussé. GitHub ne lance
  alors aucun workflow pour ce push. La garde ne sera exercée qu'à la prochaine publication normale.

### Étape 2 — Les 10 autres branches

Ces branches ne déclenchent **jamais** `kairo-pages.yml` par un push : son déclencheur `push` est limité à la
production.

```bash
git fetch origin
git show origin/claude/kairo-pages-guard:docs/kairo/ops/kairo-pages-guard.patch > /tmp/guard.patch
for b in claude/c4-crosstraining-full-session claude/strength-fixes-precheck claude/kairo-rc1 claude/kairo-rc1-test-env \
         claude/consolidation-pr2-pr3 claude/strength-r1-r2 claude/kairo-p0-safety-audit \
         claude/kairo-rc2-planner-study claude/kairo-rc2bis-week-study claude/kairo-rc3-prep; do
  git checkout "$b" && git pull --ff-only origin "$b" \
  && git apply /tmp/guard.patch \
  && git commit -am "kairo-pages.yml : garde de publication (production seulement)" && git push origin "$b"
done
```

Le correctif est d'abord copié hors du dépôt (`/tmp/guard.patch`) : il n'existe pas dans les autres branches.

À savoir avant de lancer la boucle :

- **PR #2 et #3 :** le commit s'ajoute à leur contenu. C'est sans effet applicatif, mais cela modifie ces PR. Vous
  pouvez aussi les laisser telles quelles : leur copie ne publie que si quelqu'un lance *Run workflow* en les
  choisissant.
- **`claude/kairo-rc1` :** sa tête passerait de `f0b09e4` à un nouveau commit. Le **code applicatif reste celui de
  `f0b09e4`**, mais si `f0b09e4` doit rester la référence exacte de RC1, mieux vaut ne pas toucher cette branche et
  appliquer la consigne du point suivant.
- **Branches d'étude devenues inutiles :** les supprimer supprime aussi leur copie du workflow.

### Étape 3 — Contrôle

1. *Run workflow* sur une branche d'étude protégée : `refuse` échoue avec le message, `deploy` et `verify` sont
   sautés.
2. Vérifier que `gh-pages` n'a pas bougé :
   `git ls-remote origin refs/heads/gh-pages` doit afficher le même SHA avant et après.

**Tant qu'une branche n'est pas protégée**, la consigne reste : ne lancer *Run workflow* de « KAIRO — PWA GitHub
Pages » que sur la branche de production.

## 5. Option B (durable) : publication indépendante des copies

Principe : passer la source GitHub Pages de « branche `gh-pages` » à **« GitHub Actions »**, avec les actions
`actions/upload-pages-artifact` et `actions/deploy-pages`, et l'environnement **`github-pages`** restreint à la seule
branche de production.

Le chemin dans GitHub : *Settings* → *Environments* → `github-pages` → *Deployment branches and tags* → *Selected
branches* → `claude/crosstraining-c1-c2-spike-vbg8dv`.

Effet : GitHub refuse lui-même tout déploiement depuis une autre branche, **quelle que soit la copie du workflow**.
Les anciennes copies qui poussent sur `gh-pages` ne publient plus rien, puisque Pages ne lit plus cette branche.

C'est la protection la plus solide, mais elle **change le mécanisme de publication de la production** (réglage
Pages et réécriture du job `deploy`). Elle mérite une étape dédiée, avec votre accord et une fenêtre de vérification.
Elle n'est pas préparée ici.

## 6. Retour arrière

- **Option A :** revenir sur le commit de garde (`git revert`) de la branche concernée. Rien d'autre ne change.
- **Le correctif ne modifie pas le job `deploy` lui-même**, en dehors de sa condition. La publication normale est
  strictement identique.
