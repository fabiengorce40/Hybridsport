# REKKA V3.1.1 — audit et correction des chronomètres (Android)

Date : 10 novembre 2026.
Branche isolée : `claude/rekka-v3-1-1-timers`, créée depuis le HEAD réel de `claude/rekka-beta` (`3aa5629`).
Rien n'est publié.

## 1. Symptôme signalé

Sur un Samsung Android réel, le compte à rebours de repos est irrégulier :
- certaines secondes passent trop vite ;
- d'autres restent affichées trop longtemps ;
- le compteur saute parfois de 3 s.

## 2. Diagnostic

**Calcul du temps : correct.**
- Repos : `restRemainingS = ceil((échéance − maintenant) / 1 s)`, calculé depuis l'échéance persistante (`rest.endsAt`).
- Chronomètre global : `sessionElapsedS`, calculé depuis `startedAt` et les pauses horodatées.
- La mesure en temps réel montre 0 écart entre la valeur affichée et la valeur exacte recalculée, à chaque changement observé (§ 4).
- Aucune dérive ; app-core n'est pas modifié.

**Rafraîchissement : défauts confirmés.**
1. *Repos sondé toutes les 250 ms, sans alignement.*
   - Chaque seconde affichée peut apparaître jusqu'à 250 ms en retard.
   - Dès que les minuteries sont retardées (fil principal chargé), les secondes affichées deviennent inégales.
2. *Chronomètre global sondé toutes les 1 000 ms, avec une phase arbitraire.*
   - La période d'échantillonnage étant égale à la période d'affichage, la moindre gigue près d'une frontière double une valeur ou en saute une.
   - Mesuré avant correction : intervalles de 347 à 1 653 ms autour de la pause et de la reprise.
3. *Séance entière re-rendue chaque seconde.*
   - La minuterie de 1 s de `SessionBody` re-rend tout l'écran : 6 cartes, 16 lignes, lectures de l'état, aperçu « Pourquoi cette séance ».
   - Le repos est re-rendu en plus 4 fois par seconde.

**Rendu graphique : coûts identifiés, non mesurables sans GPU Android.**
- Flou d'arrière-plan (`backdrop-filter: blur(12px)`) sur l'en-tête fixe et sur la barre de repos flottante. Leurs fonds étaient déjà opaques à 95-96 %, donc le flou était quasi invisible.
- Anneau au pinceau : un SVG avec filtre `drop-shadow`, sous un masque `conic-gradient`, re-rastérisé à chaque mise à jour.
- Sur un GPU mobile, ces coûts peuvent retenir l'affichage de plusieurs trames. Le texte change alors en retard puis rattrape d'un coup, ce qui correspond au saut de 3 s observé.

**Hypothèses non vérifiables ici (pas d'appareil Samsung accessible) :**
- part exacte du GPU dans le symptôme ;
- limitation des minuteries par l'économie d'énergie Samsung ou par la PWA installée ;
- comportement du navigateur Samsung Internet.

## 3. Corrections

Uniquement le rendu V3 ; aucune modification des moteurs, d'app-core ni du schéma.

| Fichier | Modification |
|---|---|
| `src/sober/useAlignedSecond.ts` (nouveau) | Rafraîchissement d'affichage aligné sur la référence persistante : un rendu juste après chaque changement de seconde affichée (marge de 15 ms). Recalage sur la frontière suivante après un retard ; resynchronisation immédiate à `visibilitychange`, `pageshow` et `focus`. Aucun comptage : la valeur est toujours recalculée. |
| `src/RestTimer0.tsx` | V3 : sondage de 250 ms remplacé par `useAlignedSecond(échéance)`. Rendu hérité inchangé. |
| `src/sober/SessionClock.tsx` (nouveau) | Chronomètre global autonome, aligné sur « début + pauses » via `useAlignedSecond`. Même balisage et mêmes actions de pause et reprise (app-core). |
| `src/screens/beta0/Session0.tsx` | V3 Musculation : l'en-tête utilise `SessionClock`. La séance entière n'est plus re-rendue chaque seconde, mais toutes les 30 s, pour les minutes affichées dans le menu. Les autres sports et l'ancien rendu sont inchangés. |
| `src/sober/sober.css` | Flou d'arrière-plan retiré (en-tête et repos). Confinement (`contain`) des deux barres. Pinceau masqué sans filtre recalculé, isolé dans sa propre couche. |
| `scripts/measure-rest-timer.mjs` (nouveau) | Banc de mesure en temps réel (§ 4). |
| `tests/aligned-second.test.tsx` (nouveau) | 4 tests : alignement, recalage après blocage, pause, retour au premier plan. |

Conservé, et vérifié par les E2E :
- pause et reprise du repos, +15 s, « Passer » ;
- persistance, verrouillage et réouverture, cohérence entre onglets ;
- anneau dégressif, qui se met à jour en même temps que les chiffres ;
- pause et reprise du chronomètre global.

## 4. Mesures en temps réel (avant / après)

Conditions du banc :
- `scripts/measure-rest-timer.mjs`, Chromium sans affichage, 390 × 844, build BÊTA ;
- aucune horloge simulée : `Date` est seulement décalé d'un écart fixe vers la semaine de la fixture, et minuteries, trames et rendu restent natifs ;
- processeur ralenti par CDP (×4 et ×10) pour approcher un téléphone ;
- **ce n'est pas un test sur Samsung.**

Phase « repos au premier plan, 60 s » :

| Mesure | ×4 avant | ×4 après | ×10 avant | ×10 après |
|---|---|---|---|---|
| Changements du repos (pas de 1 s) | 60 / 60 | 60 / 60 | 60 / 60 | 60 / 60 |
| Sauts ≥ 2 s (repos) | 0 | 0 | 0 | 0 |
| Écart affiché / valeur exacte | 0 | 0 | 0 | 0 |
| Intervalle repos p95 / max (ms) | 1 002 / 1 003 | 1 008 / 1 012 | 1 006 / 1 014 | 1 016 / 1 019 |
| Intervalle global p95 / max (ms) | 1 026 / 1 041 | 1 015 / 1 020 | 1 026 / 1 043 | 1 025 / 1 027 |
| Script (ms / min) | 2 162 | 796 (−63 %) | 4 690 | 1 690 (−64 %) |
| Travail total du fil principal (ms / min) | 4 253 | 2 830 | 8 815 | 5 479 |
| Tâches longues (nombre / max ms) | 1 / 58 | 0 | 15 / 92 | 2 / 108 |
| Trames > 50 ms | 0 | 0 | 13 | 4 |

Phases annexes :

| Phase | Avant | Après |
|---|---|---|
| Pause 5 s | Repos figé ; intervalles du global 347 à 1 653 ms | Repos figé ; global régulier, 996 à 1 001 ms (×4) |
| Reprise + 15 s | Saut attendu de +15 s ; valeurs exactes ensuite | Identique |
| Gel du cycle de vie 8 s (comme un verrouillage), puis reprise | Valeurs exactes dès la reprise | Identique ; intervalles réguliers |
| Rechargement | Valeurs exactes | Valeurs exactes ; à ×10, un rattrapage de 2 s du global pendant le démarrage chargé, valeur affichée exacte |

Écart min. de 136 à 250 ms en début de phase : ce n'est pas un défaut, la phase démarre entre deux secondes.

**Lecture.** Le banc de bureau ne reproduit pas le saut de 3 s, et ne peut pas reproduire le coût GPU Android. Les corrections suppriment les causes structurelles mesurables :
- rafraîchissements non alignés ;
- gigue du chronomètre global ;
- environ deux tiers du script ;
- l'essentiel des tâches longues ;
- les coûts de peinture les plus lourds.

## 5. Montées en charge (`rampup`) — constat et proposition (non appliquée)

Constat :
- Le moteur prescrit les montées de deux façons :
  - `relative_to_working` (ex. 40 % puis 60 % de la charge de travail) ;
  - un effort cible (RPE 3, 5 puis 7) lorsque la charge de travail n'est pas encore connue (calibration).
- Aucune de ces formes ne fournit de charge absolue. Le champ « kg » reste vide (« — ») : c'est correct, aucune charge n'est inventée.
- En V3.1, la consigne d'une montée à répétitions fixes n'est lue que par les lecteurs d'écran. À l'écran, on voit « Éch. 1 · — kg × 5 », sans l'indication « 40 % de la charge de travail » ou « effort léger ».

Proposition, sans modifier le moteur ni les prescriptions :
1. Section « Montée en charge · échauffement de l'exercice, hors volume et progression », visuellement distincte des « Séries de travail » : ton atténué, lignes plus compactes, libellés `Éch. 1, Éch. 2`.
2. Consigne visible sous chaque ligne de montée : « 40 % de la charge de travail » ou « effort léger (RPE 3) », texte déjà produit par `intensityLabel`.
3. Lorsque la charge de la première série de travail est saisie ou prescrite, afficher à titre indicatif « ≈ 16 kg ». C'est un calcul d'affichage (fraction × charge saisie), jamais enregistré ni pré-rempli dans le champ, et sans palier inventé. **Ce point nécessite votre arbitrage.**
4. Avant cela, aucune modification.

## 6. Contrôles restant à faire sur Android réel

1. Compte à rebours de 2 min observé en entier, au premier plan, application installée (PWA) et dans Chrome : vérifier la régularité.
2. Économie d'énergie Samsung activée et désactivée.
3. Verrouillage de 30 s puis réouverture : la valeur doit être exacte dès l'affichage.
4. Pause, reprise, +15 s, « Passer ».
5. Deux onglets.
6. Fluidité du défilement pendant un repos actif.
