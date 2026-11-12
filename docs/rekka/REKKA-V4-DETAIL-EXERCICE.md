# REKKA V4 · Détail exercice

Base vérifiée sur GitHub : `a65f64e1fd60875fb6ffc950586ded1ac7923a77`.
Branche locale : `codex/rekka-v4-playfield-exercise-detail`.

## Mesures de la référence

Image officielle `06-1000030896.png`, 728 × 1536 px. Conversion à 390 px par
le facteur 390/728. Origine verticale estimée à y=75 px sur la référence,
sous la barre d’état. Mesures de la référence, en pixels CSS arrondis.

| Zone | Référence à 390 px (x, y, largeur, hauteur) | Écart observé dans le code de départ | Mise en œuvre |
|---|---|---|---|
| Barre | Centre du titre vers (195, 37) | Retour encadré et absence de menu | Barre à trois colonnes, retour et menu de prescription |
| Identification | Titre x≈101, y≈99 ; séparateur x≈87 | Petit pictogramme, titre et sous-titre réduits | Haltère vectoriel 57 px, séparateur, titre gras |
| Carte | ≈8, 182, 375, 490 | Illustration, onglets et contenu séparés | Une carte claire avec ombre |
| Atlas | ≈17, 195, 355, 221 | Cadre bleu et visuels génériques pour d’autres mouvements | Recadrage atlas officiel 662 × 411 ; indisponibilité explicite ailleurs |
| Onglets | ≈16, 435, 359, 46 | Groupe avec fond commun et petits labels | Trois pilules et état actif jaune |
| Consignes | ≈22, 507, 211, 136 | Liste des séries prescrites | Consignes de l’identifiant exact ; prescription accessible par le menu |
| Miniature | ≈240, 529, 132, 118 | Absente | Emplacement explicite sans bouton vidéo en l’absence de média vérifié |

La police REKKA Inter du thème sert de base. La police originale et les ombres
exactes ne sont pas identifiables à partir du JPEG seul. Aucun écart après
compilation n’est quantifié, car Chromium s’arrête au lancement dans cet
environnement. Les captures, superpositions, différences, contrôles de
débordement et validation Samsung restent à réaliser.

## Couverture éditoriale

Le catalogue actif de musculation contient 54 identifiants. Onze fiches
comportent des muscles, consignes et conseils propres à la variante. Une
illustration correspond au développé couché à la barre, et aucune vidéo
vérifiée n’est disponible. Les 43 autres identifiants sont ceux de
`strengthContent().catalog.exercises()` qui ne figurent pas dans
`exerciseDetails`. La liste couverte figure dans
`apps/kairo/src/playfield/exercise-details.ts`. L’atlas existant apparaît
dans le précache du build.

L’historique réutilise `progressView` par identifiant exact. Il affiche
les dates, séries de travail, répétitions et charges maximales enregistrées,
ainsi que la variation lorsque la vue de progression la fournit.

## Reprise des captures

Après installation de Chromium Playwright dans un environnement qui permet
son lancement, compiler avec `pnpm kairo:build:beta` puis exécuter
`REKKA_DETAIL_ONLY=1 node apps/kairo/scripts/e2e-v4-screens.mjs captures-detail`.
Ce mode sélectionne le développé couché à la barre dans une copie en mémoire
de la fixture fictive et vérifie un second exercice. Le script couvre 360,
390, 412 et 1024 px et capture 360 et 390 px.
