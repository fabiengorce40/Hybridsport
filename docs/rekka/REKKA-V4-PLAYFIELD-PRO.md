# REKKA V4 — Playfield Pro (branche graphique isolée)

## Référence graphique
Maquette Playfield Pro validée dans la conversation le 10 novembre 2026 :
sept vues — Accueil, Séance en cours, Progression, Planning, Détail exercice,
Bilan de séance et Profil — et illustration de développé couché corrigée.

**La maquette est une référence visuelle et NON un écran à incruster.**
Chaque élément visible doit être un composant React/TypeScript et CSS.
Aucune donnée sportive, valeur de performance ou statistique d’illustration
ne doit être utilisée en lieu et place des sélecteurs métier réels.

### Palette
- Bleu royal primaire : `#1647C8`
- Jaune d’action : `#FDCB32`
- Corail secondaire : `#FA6A58`
- Fond crème : `#FFF7EA`
- Texte bleu nuit : `#0E1B35`

La V4 abandonne le jaune-vert, les fonds de magnésie et l’ambiance carbone
de la BÊTA V3.1. Les contrastes, les tailles tactiles et la hiérarchie
fonctionnelle priment sur les animations.

## Architecture d’intégration
- Source BÊTA protégée : `claude/rekka-beta` à `3aa56291f4ce5b4697dd32760e32b89009ceb3f4`.
- Branche : `codex/rekka-v4-playfield-pro`.
- Thème conditionné par `SOBER_V3`, plus attribut HTML `data-rekka-theme="playfield-pro"`.
- V3.1 conservée comme ossature fonctionnelle : accordéons des exercices,
  poids/répétitions modifiables dans les lignes, chronomètres persistants,
  repos flottant, historique, validation et confirmation de fin de séance.
- Illustration neuve `playfield/assets/barbell-hero.svg` : barre et disques
  géométriquement coaxiaux, centres sur un même axe horizontal.
- SVG REKKA neuf ; pas d’import d’une capture de maquette comme interface.

## Écrans et contraintes
1. **Accueil** : salutation issue du profil, prochaine séance depuis la
   projection canonique, CTA réel, sport et semaine réels.
2. **Séance en cours** : cinq exercices si le programme en a cinq, pas
   « cinq » en dur ; mêmes prescriptions, mêmes brouillons, aucune valeur
   fictive, mêmes actions existantes.
3. **Progression** : `progressView` uniquement ; courbes des vraies données,
   historique réel, aucun KPI ou trophée inventé.
4. **Planning** : semaines et contraintes existantes ; conservations des
   avertissements, replanification avec consentement, séances non placées.
5. **Détail exercice** : consulter les prescriptions réelles et les options
   existantes, sans déformer le geste ou le matériel.
6. **Bilan de séance** : conserver le dialogue de confirmation, le ressenti,
   les douleurs déclarées et les statistiques enregistrées seulement.
7. **Profil** : objectifs, matériel, sports, sauvegarde et paramètres existants.

## Contrôles bloquants AVANT toute proposition de publication
- `pnpm check`, typecheck, ESLint, build BÊTA.
- E2E V3.1 et E2E BÊTA à 360 / 390 / 412 / 1024 px.
- Capture réelle des **sept vues**, données fictives, sans captures statiques
  utilisées comme composant.
- Vérification des cibles ≥44 px, contrastes, zoom texte, clavier Samsung.
- Contrôle du repos : ring décroissant réellement lié au temps restant,
  pause/reprise, prolongation 15 secondes, retour d’onglet et hors ligne.
- Non-régression : poids, répétitions, séries d’échauffement (hors volume),
  charge totale, RIR, validation/dévalidation, temps écoulé, historique.
- Migrations format 2→5 / 3→5 / 4→5, mise à jour depuis BÊTA V3.1,
  sauvegarde/restauration, multionglets, protection des données.
- Aucun moteur, règle de récupération, progression, planification, schéma
  ou workflow de déploiement modifié.
- Comparaison des SHA distants BÊTA et production après l’audit.




## Finalisation et QA (10 novembre 2026)

### Isolation
- **Drapeau explicite** `PLAYFIELD_V4` (`src/playfield/flag.ts`), au-dessus de `SOBER_V3` (canal BÊTA + `VITE_REKKA_VISUAL=v3`).
  - Il est activé par `VITE_REKKA_SKIN=playfield-pro`, présent seulement dans `build:beta` de cette branche.
  - `build:beta:v31` reconstruit la V3.1 à l'identique, pour comparaison.
- **Builds non concernées** : production, préparation ESSAI et builds historiques. Toutes les règles de `playfield.css` sont sous `html[data-rekka-theme="playfield-pro"]`, sauf les classes propres `pf-*`.
- **Déploiement** : aucun workflow n'écoute `codex/rekka-v4-playfield-pro`.

### Corrections apportées
- **Jetons de couleur.** Les jetons V3 (`:root[data-rekka][data-rekka-visual]`, spécificité 0,3,0) écrasaient ceux de V4. Conséquences : fond carbone et textes blancs sur blanc dans le bilan. Un bloc de spécificité 0,3,1 rétablit la palette claire pour `--k-*`, `--r-*` et les sports.
- **Couleurs de sport.** Les néons V3 sont remplacés par des déclinaisons lisibles : Musculation `#1647C8`, Course `#D9473A`, HYROX `#B07A00`, Cross-training `#6D4BD8`. Les accents du Planning sont colorés par discipline.
- **Contrastes (≥ 4,5:1) et cibles (≥ 44 px), écran par écran :**
  - titres de groupe du Planning, volet de replanification ;
  - état vide de la Progression ;
  - chevrons du Profil ;
  - objectif et chevrons du Détail exercice ;
  - guidage de saisie ;
  - case « douleur » de fin de séance ;
  - en-tête, navigation, séries, coches et pastilles du bilan.
- **Bilan de séance (nouveau, `SessionSummary`).** Il n'affiche que des faits enregistrés :
  - issue déclarée et durée active figée ;
  - séries de travail validées et exercices terminés ;
  - montées en charge à part (hors volume) ;
  - douleurs déclarées et avertissement d'arrêt.

  Aucun record, calorie ou score.
- **Illustration de barre.** La barre passe désormais devant la face du disque jusqu'au moyeu, et le manchon ressort derrière l'épaisseur. Tout reste sur l'axe y = 214 ; l'inscription « 20 KG » n'est plus masquée. Sur l'accueil, l'illustration est un fond discret à droite, sous un voile qui préserve le contraste du texte.
- **Performance Android.** Aucun flou d'arrière-plan (en-tête de séance, repos flottant, fond de feuille). Pas de filtre recalculé sous le masque de l'anneau de repos.

### Écarts connus avec la maquette
- **Maquettes non consultables.** Les maquettes Playfield Pro validées dans la conversation ne sont pas accessibles dans l'environnement de travail. La comparaison s'est faite sur ce document et sur les références du dépôt ; aucune fidélité au pixel n'est revendiquée.
- **Pas d'illustration de développé couché avec un pratiquant.** Le dépôt n'en contient aucune, et aucune n'a été dessinée : seule la barre chargée, géométriquement vérifiée, est utilisée.
- **Chronomètres.** Les corrections V3.1.1 (`claude/rekka-v3-1-1-timers`, non publiées) ne sont pas incluses : cette branche part de la BÊTA `3aa5629`. Les coûts de rendu sont toutefois neutralisés sous V4.
- **Rangée de points du bilan.** L'écran de lecture d'une séance terminée garde sa navigation d'exercices `01…06` (composant existant), restylée.

### Contrôles
Voir le rapport de mission : `pnpm check`, E2E complets, sept écrans à 360 / 390 / 412 / 1024 px (`scripts/e2e-v4-screens.mjs`), migrations, mise à jour depuis la BÊTA V3.1 `3aa5629`, parité des données avec `3aa5629`.
