# REKKA V2 — ressources FINALES validées (V2-2C)

Dossier vide tant qu'aucune ressource finale n'est livrée. Un fichier déposé ici sous le nom exact ci-dessous
remplace automatiquement la ressource provisoire du kit au prochain build (`design/assets.tsx`, `resolveAsset`), et
l'étiquette « provisoire » de l'Accueil disparaît. Ne déposer que des ressources **validées par le propriétaire**.

| Fichier attendu | Rôle | Spécification |
|---|---|---|
| `rekka-logo.svg` | Logo REKKA final | Logo **calligraphique au pinceau**, jaune-vert néon (dégradé `#F4FF39` → `#80EF57` ou équivalent validé), proche du trait de la planche. SVG vectoriel en contours, fond transparent, `viewBox` défini, aucun script / lien / image incorporée, aucun texte autre que « REKKA ». Lisible à 180 px de large. |
| `accueil-hero.webp` | Illustration d'Accueil finale | Illustration **cyberpunk / anime immersive** : personnage original, ville lumineuse, touches de nature fantastique. **Aucun texte ni élément d'interface.** 1080 × 1200 px environ (cadrage `cover` sur un bandeau ≈ 1 : 1), ≤ 300 Ko. Zone calme en haut à gauche (logo) et tiers inférieur plus sombre (texte d'accueil). |

Les tests `tests/v2-assets.test.ts` vérifient la sûreté des SVG et le poids des WebP de ce dossier.
