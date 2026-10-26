# REKKA V2 — refonte visuelle : suivi des lots

**Branche :** `claude/rekka-v2`, créée depuis la BÊTA publiée `e2cdcc5`.

**Garanties :**
- aucun moteur sportif modifié ;
- RC5.3 absent ;
- aucun déploiement : aucun workflow ne se déclenche sur cette branche (§ V2-0).

## V2-0 — Préparation et isolation

### Références vérifiées avant création (26/10/2026)

| Référence | Commit | Rôle |
|---|---|---|
| `claude/rekka-beta` | `e2cdcc5` | BÊTA publiée (déploiement Cloudflare n° 4 réussi le 24/10). **Base de la V2.** |
| `claude/kairo-rc4-dev` | `dc99d25` | Développement : RC5.1, RC5.3 (R4, R1, R2 validés ; **R3 en cours, non validé**), RC5.4. Inchangée. |
| `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e` | Production (GitHub Pages). Inchangée. |
| `claude/rekka-v2` | créée depuis `e2cdcc5` | Refonte V2 |

### Isolation

- **Workflows présents sur la base :**
  - `kairo-pages.yml` se déclenche sur la branche de production uniquement ;
  - `rekka-beta-pages.yml` se déclenche sur `claude/rekka-beta` uniquement.

  Un push sur `claude/rekka-v2` ne publie donc **rien**.
- Aucun fichier de `packages/` n'est modifié par les lots V2-0 à V2-2 : moteurs, app-core, schémas et migrations restent intacts.
- **Données utilisateur :** aucun contrat de données modifié. Le thème V2 est un attribut HTML, pas une donnée enregistrée.

### Retour arrière

| Niveau | Procédure |
|---|---|
| Un lot | `git revert <commit du lot>` sur `claude/rekka-v2` (un commit par lot) |
| Le thème V2 | Build sans `VITE_REKKA_THEME=v2` : l'interface actuelle s'affiche à l'identique (thème `kairo` par défaut) |
| Toute la V2 | Abandon de la branche `claude/rekka-v2`. La BÊTA, la production et le développement ne dépendent pas d'elle. |

### Dépendances

- La V2 s'appuie sur la BÊTA `e2cdcc5` : RC4.6 et corrections Course, **sans** RC5.1, RC5.3 ni RC5.4.
- **RC5.4** (approuvé sur le principe) pourra être repris selon la procédure démontrée ci-dessous, après votre accord.
- **Mise à jour sûre de la PWA :** prérequis de toute publication BÊTA de la V2. Proposition : `docs/kairo/REKKA-BETA-MAJ-AUTO.md`, sur `claude/kairo-rc4-dev`.

### Rapport : reprise de RC5.4 sans RC5.3 R3 (démontrée, **non intégrée**)

L'essai a été fait dans un espace de travail jetable, sur une branche locale non poussée issue de `e2cdcc5`.

| Commit RC5.4 (développement) | Reprise sur `e2cdcc5` | Ajustement nécessaire |
|---|---|---|
| `4c5b570` lot A — phases | sans conflit | — |
| `7d3e186` lot B — chronomètre | conflit sur 2 fixtures **générées** (`apps/kairo/tests/fixtures/r51-*.json`) | Garder la version BÊTA, puis régénérer (`R51_WRITE_FIXTURE=1`) |
| `4316878` lot C — durées | sans conflit | — |
| `206b711` lot D — E2E et ajustements | sans conflit, mais **dépendance cachée à R3** : il retire l'import `beta0Environment` de deux bancs de test (`tests/rc46/b4-cross-inputs.test.ts`, `tests/rc46/quality-bench.ts`), devenu inutile seulement avec R3 | Garder ces deux fichiers dans leur version BÊTA |
| `dc99d25` — constante de médiane | conflit sur l'instantané de taille et la fixture C-9, **régénérés avec R3** | Garder la version BÊTA, puis régénérer (`LOTC_WRITE_FIXTURE=1`, instantané inchangé) |

**Résultat sur la base BÊTA, avec RC5.4 et sans RC5.3 :**

| Vérification | Résultat |
|---|---|
| Types et lint | verts |
| Tests | **3 018 réussis, 0 échec** (261 fichiers) |
| Build de production | OK |
| E2E principal | OK, 303 vérifications |
| E2E RC5.4 à 360 et 390 px | OK, 38 vérifications |

**Conclusion :** RC5.4 ne dépend pas fonctionnellement de RC5.3. Les seules adhérences sont des fichiers de test générés et deux imports retirés par anticipation. La reprise est sûre en suivant la procédure ci-dessus. Elle se fera dans un lot dédié, **après votre accord**.

---

## V2-1 — Design system

### Livré

| Fichier | Contenu |
|---|---|
| `apps/kairo/src/design/rekka-v2.css` | **Jetons** sous `:root[data-theme="v2"]` uniquement :<br>• palette validée ;<br>• surfaces et textes dérivés (contraste vérifié) ;<br>• rôles : accent, succès, alerte, danger, record, démonstration ;<br>• disciplines : Musculation néon, Course cyan, HYROX magenta, Cross-training violet ;<br>• phases : montée en charge cyan, travail néon, back-off or, adaptation neutre ;<br>• typographie, espacements, rayons, tailles tactiles (44 / 48 px), ombres et lueurs, états (focus, désactivé, pressé), mouvements.<br>**Pont** vers les jetons de l'ancien thème (`--bg`, `--accent`, `--k-*`, `--sport-*`) : les écrans existants adoptent la palette sans réécriture.<br>Polices `@font-face`.<br>Réduction des mouvements. |
| `apps/kairo/src/design/rekka-components.css` | **Composants communs `r-*`** :<br>• écran, titres, carte ;<br>• boutons primaire, secondaire et discret ;<br>• puces, badges (discipline, succès, record, démo) ;<br>• pictogramme de discipline, progression, statistique ;<br>• emplacement d'illustration avec visuel de substitution identifié ;<br>• barre de navigation, barre du haut et chronomètre ;<br>• phases et séries (état et type indépendants) ;<br>• quête et jalons (RPG modéré) ;<br>• bandeau « démonstration ». |
| `apps/kairo/src/design/SportIcon.tsx` | Pictogrammes SVG originaux des 4 disciplines, avec nom accessible : la couleur n'est jamais le seul signal |
| `apps/kairo/src/design/theme.ts` | **Bascule** : `kairo` par défaut (aucun attribut, interface actuelle identique), `v2` si la build reçoit `VITE_REKKA_THEME=v2` |
| `apps/kairo/src/design/fonts/` | Barlow Condensed 600/700/800 et Inter 400/600/800, sous-ensemble latin couvrant le français, woff2, **licences SIL OFL 1.1** jointes |
| `apps/kairo/src/main.tsx` | Import des deux feuilles et application du thème (sans effet par défaut) |
| `apps/kairo/tests/v2-design-system.test.ts` | Tests du lot (§ Vérifications) |

**Polices sous des noms propres** (`REKKA Inter`, `REKKA Barlow Condensed`). L'ancienne pile de polices commence par `'Inter'`. Sans renommage, l'ancien thème aurait téléchargé et affiché Inter, et changé d'aspect. Un test le verrouille.

### Poids (build de production, mesuré)

| Élément | Avant (`e2cdcc5`) | Après V2-1 | Remarque |
|---|---|---|---|
| CSS | 34,3 Ko (≈ 7 Ko gzip) | 48,4 Ko (10,4 Ko gzip) | +14 Ko brut, environ +3 Ko gzip |
| JavaScript | 1 410,9 Ko | 1 411,0 Ko | +0,1 Ko |
| Polices (fichiers publiés) | — | 6 × environ 22 Ko = 137 Ko | **Téléchargées seulement en thème V2**, au premier affichage, puis servies par le service worker (cache des `assets/`) : le hors-ligne est conservé après le premier chargement |
| Total `dist` | 1 466,8 Ko | 1 617,8 Ko | +151 Ko, dont 137 Ko de polices non chargées par l'ancien thème |

### Inventaire des 117 styles intégrés et migration proposée

| Propriété | Nombre | Migration |
|---|---|---|
| `margin` (surtout `margin: 0` sur `p` et `h*`) | 56 | Classe utilitaire `.r-flush` ou reset typographique dans `.r-card` (marges à 0 par défaut) : suppression mécanique |
| `gap` | 19 | Variantes `.r-stack.gap-1/2/3` |
| `padding`, `paddingLeft`, `paddingBottom` | 13 | Jetons `--r-space-*` dans les composants |
| `minHeight` | 6 | Jetons tactiles `--r-touch(-min)` |
| `marginTop` | 6 | Utilitaires d'espacement |
| couleur, fond, bordure (`color`, `background`, `border*`) | 9 | **Prioritaire** : ces valeurs échappent au thème. Remplacement par des classes d'état (`.r-badge.danger`, etc.) |
| autres (position, transform, flex…) | 8 | Au cas par cas, dans le composant concerné |

Fichiers les plus concernés : `Setup.tsx` (13), `FreeRunForm.tsx` (8), `PreSessionCheck.tsx` (8), `Session0.tsx` (7), `Home0.tsx` (6), `screens/Session.tsx` (6, chemin V0). La migration se fait **dans le lot qui refond chaque écran**, jamais en masse : un écran = un commit, avec ses tests d'interface.

### Remplacement progressif de KAIRO par REKKA

| Catégorie | Exemples | Traitement |
|---|---|---|
| **Visible par l'utilisateur** (≈ 30 textes) | « KAIRO ne remplace pas un avis médical », « KAIRO ne pose aucun diagnostic », « Nouvelle version de KAIRO disponible », « KAIRO FIELD TEST », titre et manifeste (`index.html`, `manifest.webmanifest`) | Remplacés **écran par écran** dans les lots d'intégration, **en même temps que les tests qui les citent** (≈ 800 requêtes de tests portent sur des libellés) |
| **Identifiants techniques** | codes de raison `KAIRO.CHECKIN_*` (`present.ts`), `__KAIRO_BUILD__`, `VITE_KAIRO_CHANNEL`, clés de stockage `kairo.*`, cache du service worker, paquet `@hybridsport/kairo`, dossier `apps/kairo` | **Jamais renommés** : contrats persistés (données, cache, codes de raison), sans valeur visible |
| **Commentaires** | en-têtes de fichiers | Sans objet |

### Vérifications

| Test (`v2-design-system.test.ts`) | Résultat |
|---|---|
| Palette identique au cahier des charges | ✓ |
| Contrastes calculés :<br>• textes ≥ 4,5:1 sur fond, carte et surface ;<br>• couleurs de discipline et de phase ≥ 3:1 ;<br>• texte sur bouton néon ≥ 7:1 (15,7:1) | ✓ |
| Isolation :<br>• aucun jeton V2 hors de `[data-theme="v2"]` ;<br>• `styles.css` et `kairo-ds.css` sans jeton V2 ;<br>• aucune règle globale sur `body` ou `html` hors thème | ✓ |
| Pont : chaque couleur de l'ancien thème est redéfinie en V2 (le test a trouvé et fait corriger `--sport-*`) | ✓ |
| Cibles tactiles ≥ 44 px (boutons, puces, onglets) ; validation de série 48 px | ✓ |
| Polices : 6 woff2, ≤ 160 Ko, licences présentes, aucune URL distante | ✓ |
| Bascule `kairo` / `v2` sans résidu | ✓ |
| Polices sous des noms propres, ancien thème non affecté | ✓ |
| Tests d'interface existants (37 fichiers, 169 tests) | ✓ inchangés |
