# 13 — Design system (fondations)

> Ce document fixe les **principes et la structure** du design system. Les valeurs exactes (palette, typographie) seront choisies sur maquettes et validées avant la phase 8.

## 1. Principes

1. **Moins d'éléments, mieux dessinés.** Chaque écran a une action principale évidente.
2. **Lisibilité en effort** : lisible à 1 m, en sueur, entre deux séries. Chiffres grands, contraste élevé, cibles tactiles ≥ 48 pt dans le lecteur de séance.
3. **Les données sont le décor** : pas d'illustrations décoratives ; la typographie et les chiffres portent l'identité.
4. **Une couleur d'accent**, pas un arc-en-ciel. Les disciplines se distinguent par un marqueur discret (pastille / icône), pas par des écrans entiers colorés.
5. **Mouvement utile uniquement** : transitions courtes (150–250 ms), retour haptique sur les actions clés (série cochée, fin de récupération).
6. **Sombre et clair** supportés dès le départ via des tokens sémantiques (jamais de couleur en dur dans un composant).

## 2. Tokens

```
color/
  bg.primary · bg.elevated · bg.sunken
  text.primary · text.secondary · text.tertiary · text.inverse
  border.subtle · border.strong
  accent.default · accent.pressed · accent.subtle       ← une seule teinte d'accent
  state.success · state.warning · state.danger · state.info
  discipline.strength · discipline.running · discipline.crosstraining · discipline.hyrox  ← marqueurs uniquement, désaturés
  intensity.z1 … intensity.z5                            ← échelle séquentielle unique (zones / RPE)

typography/   (une famille sans-serif moderne à chiffres tabulaires ; éventuellement une variante condensée pour les grands chiffres)
  display.xl (chrono) · display.l · title.l · title.m · body.l · body.m · label.m · caption · numeric.* (tabular-nums)

space/        échelle 4 pt : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
radius/       sm 8 · md 12 · lg 20 · full
elevation/    0 · 1 (au plus 2 niveaux)
motion/       duration.fast 150 · duration.base 220 · easing.standard
haptics/      light · success · warning
```

## 3. Composants de base

Bouton (primaire, secondaire, fantôme, destructif ; tailles M/L), champ texte, champ numérique à pas (kg, reps), sélecteur segmenté, liste, ligne de réglage, feuille modale (bottom sheet), toast/snackbar, bannière hors-ligne, état vide, état d'erreur, squelette de chargement, tab bar, en-tête d'écran.

## 4. Composants sportifs

| Composant | Rôle |
|-----------|------|
| `SessionHero` | Séance du jour : titre, discipline, durée, objectif, bouton Démarrer |
| `BlockHeader` | Nom du bloc, format (EMOM 12', AMRAP 10'), durée |
| `SetRow` | Série : cible (reps × charge @ RPE), saisie rapide préremplie, case à cocher |
| `RestTimer` | Chrono de récupération plein écran/compact, +15 s / passer, notification locale |
| `IntervalTimer` | Travail/récup, tours, décompte, signaux sonores/haptiques |
| `WodCard` | Format, time cap, mouvements, charges, scaling |
| `PaceTarget` | Allure cible (mn/km) + zone + effort perçu |
| `EffortScale` | Saisie RPE 1–10 avec descripteurs |
| `WeekStrip` | Semaine compacte (jours, état des séances) |
| `ProgressMetric` | Une métrique, sa tendance, sans graphique superflu |

## 5. Gouvernance

- `packages/ui` est la **seule** source de composants ; les écrans n'ont pas de style ad hoc (règle de lint : interdiction de couleurs/tailles littérales hors tokens).
- Chaque composant a ses états (défaut, pressé, désactivé, chargement, erreur) documentés dans Storybook.
- Accessibilité : contraste WCAG AA minimum, Dynamic Type / tailles de police système, lecteurs d'écran sur les parcours clés.
