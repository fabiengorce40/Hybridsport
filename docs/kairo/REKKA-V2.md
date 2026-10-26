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

---

## V2-2 — Prototype isolé

### Ce que c'est, et ce que ce n'est pas

- **Quatre écrans de référence** navigables à 360 et 390 px :
  - **Accueil** ;
  - **Planning** (liste et grille) ;
  - **Séance Musculation** (phases, série en cours, validation, chronomètre global, pause) ;
  - **Progression** (graphique, records, régularité, jalons, indicateur indisponible).
- **Navigation cible :** Accueil / Planning / Séances / Progression / Profil. « Séances » et « Profil » sont des écrans d'attente qui expliquent ce qu'ils regrouperont.
- **Données de démonstration** (`prototype/demo-data.ts`) : inventées, signalées par un bandeau magenta permanent « Prototype · données de démonstration · non connecté au moteur ».
  - Le chronomètre est annoncé comme « simulation ».
  - Le back-off est marqué « exemple visuel ».
  - Le logo et l'illustration portent « provisoire ».
- **Ce n'est pas une fonctionnalité :**
  - aucun import d'app-core, du magasin ni des moteurs (vérifié par test) ;
  - aucune lecture ni écriture du stockage ;
  - aucun service worker ;
  - rien n'est conservé au rechargement.

### Fichiers

| Fichier | Rôle |
|---|---|
| `apps/kairo/prototype/index.html`, `main.tsx` | Entrée distincte, `<html data-theme="v2">`. Paramètre `?ecran=accueil\|planning\|seance\|progression\|seances\|profil`. |
| `apps/kairo/prototype/Prototype.tsx` | Les écrans, construits avec les composants `r-*` du lot V2-1 |
| `apps/kairo/prototype/demo-data.ts` | Données de démonstration |
| `apps/kairo/prototype/prototype.css` | Mise en page propre au prototype |
| `apps/kairo/vite.prototype.config.ts` | Build séparée vers `dist-prototype/` (ignorée par Git). La build de l'application (`dist/`) n'est pas touchée. |
| `apps/kairo/scripts/prototype-single.mjs` | Version en **une seule page** : JS, CSS et polices intégrés, aucune requête réseau |
| `apps/kairo/scripts/e2e-prototype.mjs` | E2E mobile à 360 et 390 px, avec captures |
| `apps/kairo/tests/v2-prototype-dom.test.tsx` | Tests DOM et test d'isolation |
| `apps/kairo/package.json` | Scripts `proto:dev`, `proto:build`, `proto:preview`, `proto:single` |
| `apps/kairo/tsconfig.json`, `eslint.config.mjs`, `.gitignore` | Prise en compte du dossier `prototype/` ; `dist-prototype/` ignoré |
| `docs/kairo/captures/v2/` | Captures à 360 et 390 px (12) |

### Consulter le prototype sans modifier la BÊTA

1. **Fichier autonome (recommandé sur téléphone) :** `rekka-v2-prototype.html`, environ 434 Ko.
   - Il est remis avec ce rapport. On l'ouvre dans Chrome Android depuis les téléchargements.
   - Il fonctionne sans réseau.
   - Il n'a aucun lien avec l'application installée : autre adresse, aucun stockage, aucun service worker.
   - Pour le régénérer : `pnpm --filter @hybridsport/kairo proto:single`, sortie dans `apps/kairo/dist-prototype/rekka-v2-prototype.html`.
2. **En local, avec rechargement à chaud :** `pnpm --filter @hybridsport/kairo proto:dev`, puis l'adresse affichée. Ajouter `--host` pour l'ouvrir depuis un téléphone sur le même réseau.
3. **Build servie :** `pnpm --filter @hybridsport/kairo proto:build && pnpm --filter @hybridsport/kairo proto:preview` (port 4180).

**Aucune de ces méthodes ne publie quoi que ce soit.** La branche `claude/rekka-v2` n'a aucun workflow de déploiement.

### Poids

| Élément | Taille |
|---|---|
| JavaScript du prototype | 243 Ko (75 Ko gzip), React seul, aucun moteur |
| CSS | 19,5 Ko (4,7 Ko gzip) |
| Polices | 137 Ko (6 woff2) |
| Fichier autonome | 434 Ko |

### Vérifications

| Vérification | Résultat |
|---|---|
| E2E prototype (`e2e-prototype.mjs`), 360 et 390 px | **64 vérifications OK**, dont :<br>• bandeau sur chaque écran ;<br>• thème V2 et polices locales chargées ;<br>• provisoires identifiés ;<br>• action principale visible sans défilement ;<br>• navigation à 5 onglets ;<br>• Planning liste puis grille (7 lignes), états écrits ;<br>• phases titrées, une seule série en cours, validation qui la fait avancer ;<br>• chronomètre dans la barre du haut, annoncé comme simulation, pause libellée ;<br>• Progression ;<br>• indicateur indisponible ;<br>• aucun défilement horizontal ;<br>• **aucune requête externe, stockage local vide, aucune erreur** |
| Fichier autonome ouvert en `file://` | aucune erreur, aucune requête réseau, polices chargées |
| Tests DOM du prototype (5) | ✓, dont l'isolation (aucun import `@hybridsport/*` ni de l'application) |
| Application principale, thème par défaut : build et E2E principal | ✓, **303 vérifications** (interface inchangée) |
| `pnpm check` (types, lint, suite complète) | ✓ **3 020 tests réussis**, 0 échec |

### Captures (`docs/kairo/captures/v2/`, 360 et 390 px)

| Fichier | Écran |
|---|---|
| `v2-{360,390}-01-accueil.png` | Accueil : logo et illustration provisoires, séance du jour, semaine, (bas de page : disciplines, quêtes) |
| `v2-{360,390}-02-planning-liste.png` | Planning, liste : pictogramme, couleur et état écrit par séance |
| `v2-{360,390}-03-planning-grille.png` | Planning, grille : une ligne par jour |
| `v2-{360,390}-04-seance.png` | Séance : chronomètre global, montées en charge (cyan) validées, série de travail (néon) en cours |
| `v2-{360,390}-05-seance-pause-travail.png` | Séance en pause, séries de travail |
| `v2-{360,390}-06-progression.png` | Progression : chiffres clés, évolution des charges, records |

### Inventaire des ressources graphiques manquantes

| Ressource | Usage | Format recommandé | Remplacement provisoire actuel |
|---|---|---|---|
| **Logo REKKA complet** (dégradé jaune électrique → néon) | Accueil, onboarding, bilans | SVG vectoriel | Texte « REKKA » en Barlow Condensed incliné et dégradé, badge « Logo provisoire » |
| **Logo compact et monochrome** | Barre du haut, cartes de partage | SVG | — |
| **Icône PWA** (192, 512, 512 masquable) | Écran d'accueil Android | PNG | Icônes KAIRO actuelles (inchangées) |
| **Symbole 烈火** stylisé | Élément secondaire de marque | SVG | Caractères en texte (police système, rendu variable selon l'appareil) |
| **Illustration d'accueil** (paysage cyber / fantasy, personnage original) | Bannière d'accueil | AVIF ou WebP, 1080 × 720 et 720 × 480, ≤ 150 Ko | Dégradé violet / magenta / cyan, grille et soleil en CSS, badge « Illustration provisoire » |
| **Illustrations d'onboarding** (3 à 4) | Étapes d'accueil | AVIF ou WebP, ≤ 120 Ko chacune | — (lot V2-9) |
| **Illustrations de bilan / partage** (par discipline) | Fin de séance, cartes 9:16 et 4:5 | AVIF ou WebP, 1080 × 1920 | — (lot V2-11) |
| **Visuels de jalons / badges** (RPG modéré) | Progression | SVG | Étoiles en texte (★ / ☆) |
| **Pictogrammes de discipline définitifs** (facultatif) | Partout | SVG 24 px, trait 2 px | Pictogrammes SVG originaux du lot V2-1 (utilisables tels quels) |

Les visuels définitifs doivent être **originaux** : aucune reprise d'Edgerunners, de personnages ou de logos protégés (cahier des charges § 2.4).

### Écarts connus et points à valider

- **Planche visuelle :** je n'ai pas accès à la planche validée. Le prototype suit les décisions écrites (palette, ambiance Digital Club × Cyberpunk × RPG, densité équilibrée). Votre validation visuelle sur téléphone est l'étape prévue (cahier des charges, phase 4).
- **Captures pleine page :** la barre de navigation fixe y apparaît au milieu de la page. C'est un artefact de la capture, pas un défaut d'affichage.
- **Animations :** transitions courtes seulement (validation, onglets) ; `prefers-reduced-motion` est respecté.

**Arrêt après V2-2 :** aucune intégration dans l'application, aucune reprise de RC5.4 et aucune publication tant que vous n'avez pas validé le prototype.

---

## V2-2B — Refonte graphique fidèle à la planche validée (prototype)

- **Branche :** `claude/rekka-v2-2b`, issue de `claude/rekka-v2` (`0aec4ff`).
- **Garanties :**
  - aucun moteur, aucune donnée enregistrée, aucun contrat modifié ;
  - RC5.3 et RC5.4 non intégrés ;
  - BÊTA, production et leurs workflows inchangés ;
  - ancien thème toujours actif par défaut dans l'application ;
  - aucune image distante ni dépendance réseau.
- **Références :** kit `REKKA_V2_Kit`, examiné en entier (planche, identité, ambiance, 5 maquettes, instructions). **Aucune image du kit n'est intégrée** : ce sont des recadrages de référence, pas des assets.

### Sous-lots (commits séparés)

| Commit | Sous-lot | Contenu |
|---|---|---|
| `8fed186` | V2-2B.1 Identité et Accueil | Scène vectorielle originale (provisoire). Logo typographique (provisoire). Accueil : grand univers illustré, logo, 烈火, « Nourris ta flamme. », accueil, séance du jour à bordure dégradée et **vrai bouton** lecture, 4 tuiles de discipline, « Ma semaine » (3 mesures, histogramme par jour) |
| `03057d5` | V2-2B.2 Planning | En-tête paysage. Bascule Liste / Grille en segments. Semaine et sélecteur de jours (filtre). Cartes compactes : jour, pictogramme, discipline, titre, durée, **état écrit dans un badge**. **Légende supprimée.** Grille à une ligne par jour |
| `4467b0e` | V2-2B.3 Séance | En-tête : chronomètre global et bouton pause. Bandeau de séance (visuel provisoire). Exercice numéroté, muscles. Phases titrées (montée en charge cyan, travail jaune-vert, back-off seulement s'il est présent). Séries numérotées, **répétitions et charges modifiables**. Barre de repos distincte. **La série en cours est toujours ramenée au-dessus de la barre de repos.** Barre de navigation sur « Séances ». Tout est **libellé « simulation »**. |
| `853f164` | V2-2B.4 Progression et Profil | Progression : filtres discipline et période (4 semaines / 3 mois / 1 an), 3 tuiles de mesures, courbe, records, jalons, mention « non disponible ». Profil : paysage, avatar provisoire, **aucun niveau ni XP**, onglets Objectifs / Stats / Badges, objectifs par discipline, « Mes disciplines », accès Historique et Réglages. Écran Séances harmonisé. |

### Inventaire des assets — sans ambiguïté

| Asset | Statut | Détail |
|---|---|---|
| Polices Barlow Condensed et Inter | **Produit, final** | Lot V2-1. Locales, licence OFL. |
| Pictogrammes de discipline (4) | **Produit, utilisable** | SVG originaux du lot V2-1, avec nom accessible |
| Composants d'interface (boutons, puces, segments, cartes, badges d'état, séries, barres, graphique) | **Produit, final pour l'intégration** | CSS et React. Aucun texte ni élément d'interface dans une image. |
| Logo REKKA | **PROVISOIRE** | `prototype/brand/Wordmark.tsx` : logo **typographique** (Barlow Condensed 800 inclinée, dégradé jaune électrique → néon, entailles anguleuses). Il évoque la planche **sans reproduire le logo au pinceau validé**. Nom accessible « … Logo provisoire ». |
| Logo final, versions compacte et monochrome, 烈火 stylisé | **MANQUANT** | À recréer en vectoriel original de qualité. Destination prévue : `public/rekka-v2/brand/rekka-logo.svg`, `rekka-mark.svg`, `rekka-mono.svg`, `rekka-kanji.svg`. **Je ne fabrique pas un faux logo final à partir des pixels de la planche.** |
| Icônes PWA (192, 512, masquable) | **MANQUANT** | Après validation du logo. L'icône BÊTA actuelle n'est pas touchée. |
| Illustration d'accueil | **PROVISOIRE** | `prototype/art/Scene.tsx` : scène **vectorielle originale générée** (ciel violet-magenta, soleil, ville néon, pagode, reflets, végétation), étiquetée « Illustration provisoire ». **Ni personnage ni rendu peint** : elle n'égale pas l'illustration de la planche. |
| Illustration d'accueil finale (`home-hero.webp`, sans texte ni interface) | **MANQUANT** | Paysage cyberpunk / fantasy avec personnage original, comme la planche ; 1080 × 720 et version mobile, ≤ 150 Ko |
| Paysage de montagne (en-têtes Planning, Séances, Progression, Profil) | **PROVISOIRE** | Variante « montagne » de la même scène vectorielle |
| Illustration de profil finale (`profile-hero.webp`) | **MANQUANT** | — |
| Bandeau de séance (salle de sport, personnage) | **PROVISOIRE** | Motif CSS abstrait (néons de plafond), étiqueté « Visuel provisoire » |
| Avatar | **PROVISOIRE** | Initiale sur pastille dégradée, « Avatar provisoire ». Un portrait ou un avatar choisi par l'utilisateur est à définir. |
| Visuels « Mes disciplines » (personnages par sport) | **MANQUANT** | Remplacés par les pictogrammes, avec une mention écrite à l'écran |
| Visuels de badges / jalons (`badges/*.svg`) | **MANQUANT** | Étoiles en texte (★ / ☆) |

### Écarts entre le prototype et la planche validée

| Écran | Conforme à la planche | Écart restant |
|---|---|---|
| **Accueil** | Composition (univers illustré en haut, logo, 烈火, slogan, accueil, séance du jour à bordure néon et bouton lecture, 4 tuiles colorées, « Ma semaine » avec 3 mesures et barres par jour), palette, hiérarchie | **Illustration** : scène vectorielle sans personnage, moins riche que la peinture. **Logo** : typographique, pas au pinceau. **« Nourris ta flamme. »** en Inter inclinée, sans écriture manuscrite. Pas de pictogrammes devant les 3 mesures. |
| **Planning** | Segments Liste / Grille, semaine, sélecteur de jours (aujourd'hui en néon), cartes compactes avec badge d'état coloré et écrit, jour coloré par discipline, carte du jour en néon | En-tête paysage provisoire. « Mobilité » de la maquette absente (non prévue par le moteur). Repos sans sous-titre « Récupération active ». |
| **Séance** | Chronomètre global et pause en en-tête, bandeau, exercice numéroté en néon, muscles en puces, phases cyan / jaune-vert, séries numérotées, série en cours encadrée, barre de repos (icône, temps, gros bouton pause, +10 s), navigation « Séances » | **Bandeau** sans illustration de salle ni personnage (visuel provisoire). Barre de repos plus haute que sur la maquette ; elle ne masque jamais la série en cours. Mention « simulation » ajoutée (exigence du lot). |
| **Progression** | Filtres discipline et période, 3 tuiles avec indicateurs, courbe jaune-vert avec aire, records en or, « Voir tous » | En-tête paysage provisoire. Pictogramme « tractions » de la maquette remplacé par la Course (données de démonstration). Jalons ajoutés sous les records (RPG modéré). |
| **Profil** | Paysage, avatar cerclé de néon, nom, roue des réglages, onglets Objectifs / Stats / Badges, objectifs avec liseré de couleur de discipline, « Mes disciplines » avec barres | **Pas de « Niveau 28 » ni de barre d'XP**, volontairement : la valeur est illustrative. Remplacés par « Membre depuis… » et « 4 disciplines actives ». Avatar et visuels de disciplines provisoires. |
| **Global** | Palette exacte, typographies, néon, densité, navigation à 5 onglets, contrastes | Bandeau magenta « Prototype · données de démonstration » en haut de chaque écran : volontaire, à retirer à l'intégration |

### Vérifications

| Vérification | Résultat |
|---|---|
| E2E du prototype, 360 et 390 px | **OK**, dont :<br>• bandeau sur les 5 écrans ;<br>• polices locales chargées ;<br>• logo et illustration provisoires identifiés ;<br>• action principale visible sans défilement ;<br>• 5 onglets ;<br>• Planning liste et grille, états écrits ;<br>• **la série en cours n'est pas masquée par la barre de repos**, y compris après changement de série ;<br>• état indépendant du type ;<br>• repos distinct du chronomètre global ;<br>• **Profil sans niveau ni XP** ;<br>• aucun défilement horizontal ;<br>• aucune requête externe, stockage vide, aucune erreur |
| Tests DOM du prototype | 5 / 5 :<br>• isolation ;<br>• Accueil ;<br>• Planning ;<br>• Séance : saisie modifiable, décocher une montée la remet en cours ;<br>• Progression (période) et Profil (pas de niveau, avatar provisoire, onglets) |
| Fichier autonome (`proto:single`, 468 Ko) ouvert en `file://` | aucune erreur, aucune requête réseau, polices chargées |
| Application principale (thème par défaut) : build et E2E principal | ✓ 303 vérifications |
| `pnpm check` (types, lint, suite complète) | ✓ **3 020 tests réussis**, 0 échec |

### Captures (`docs/kairo/captures/v2-2b/`, 360 et 390 px)

| Fichier | Écran |
|---|---|
| `v2-{360,390}-01-accueil.png` | Accueil |
| `v2-{360,390}-02-planning-liste.png` | Planning, liste |
| `v2-{360,390}-03-planning-grille.png` | Planning, grille |
| `v2-{360,390}-04-seance.png` | Séance, série en cours au-dessus de la barre de repos |
| `v2-{360,390}-05-seance-pause-travail.png` | Séance en pause, séries de travail |
| `v2-{360,390}-06-progression.png` | Progression |
| `v2-{360,390}-07-seances.png` | Séances (écran d'attente harmonisé) |
| `v2-{360,390}-08-profil.png` | Profil |

**Arrêt :** aucune publication, aucune intégration dans l'application, RC5.4 non repris. J'attends votre retour visuel.
