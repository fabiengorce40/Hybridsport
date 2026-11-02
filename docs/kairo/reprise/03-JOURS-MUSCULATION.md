# Reprise 3A — Jours Musculation définis après les disponibilités générales

**Branche :** `claude/rekka-reprise-20261031`, locale. Format des données inchangé (schéma v4) ; aucune migration.

## Défaut corrigé

Dans la V2.1, l'assistant fixait les « jours possibles pour la musculation » à l'étape Objectifs, d'après les disponibilités **par défaut** (lundi, mercredi, vendredi, samedi). L'étape Disponibilités, qui vient après, ne les resynchronisait jamais.

Le planificateur interdisant la Musculation hors de ces jours (`planning.ts`, `availableMinutesFor`), des séances restaient non placées sans raison visible. Exemple : disponibilités du lundi au vendredi, Musculation impossible le jeudi.

## Comportement

| Règle demandée | Mise en œuvre |
|---|---|
| Jours Musculation choisis **après** les disponibilités générales | Onboarding et « Modifier le programme » : section « Jours Musculation » à l'étape **Disponibilités**, sous la grille. « Ma musculation » : grille générale, puis jours, dans l'étape « Votre semaine ». L'assistant d'onboarding ne propose plus de jours. |
| Compatibles avec les disponibilités | Seuls les jours disponibles sont sélectionnables ; les autres sont marqués « indisponible ». |
| Disponibilités modifiées ⇒ incompatibilités signalées, corrigées avec accord | Un jour choisi devenu indisponible reste coché. Un avertissement le signale, l'étape est bloquée, et le bouton « Retirer … des jours Musculation » le corrige. Les jours nouvellement disponibles ne sont jamais ajoutés d'office : un bouton « Ajouter ce jour » est proposé. |
| Aucune modification silencieuse | Une personnalisation déjà confirmée est une préférence explicite : rien n'est changé sans action. Vérifié aussi sur le stockage dans « Modifier le programme ». |
| Proposition initiale sans imposer | Tant que l'utilisateur n'a rien choisi, la proposition = tous les jours disponibles, et elle suit les changements de la grille. L'avis « Proposition : … Décochez … » l'accompagne. |
| Pas de séances consécutives incompatibles avec la récupération | La règle reste celle du planificateur, inchangée : refus `strength_recovery_window` sous 36 h en régime Full Body (1 à 3 séances), d'une semaine à l'autre comprise. |
| Fréquence impossible expliquée | Moins de jours que de séances : message **bloquant**. Jours trop rapprochés : message **informatif** « au plus K séances respectent 36 h de récupération… N−K ne seront pas placées », non bloquant (l'utilisateur peut accepter). |

## Fichiers

| Fichier | Rôle |
|---|---|
| `packages/app-core/src/strength-days.ts` | `strengthDaysCheck` (lecture seule) et `withStrengthDays`. La règle de récupération reproduit exactement `tooClose` (`planning.ts`) : bande Full Body et `recoveryHours` de la politique, sans valeur inventée. |
| `apps/kairo/src/strength/StrengthDays.tsx` | Section et raisons bloquantes |
| `StrengthCustomization.tsx` (mode `daysLater`), `ProfileForm.tsx`, `Setup.tsx` | Branchement, proposition suivie tant que rien n'est choisi |
| `strength-personalization.css` | Cibles tactiles des jours à 44 px (26 px auparavant) |

## Tests

| Test | Résultat |
|---|---|
| `packages/app-core/tests/strength-days.test.ts` | 6/6, dont la **cohérence avec le planificateur réel** : lundi, mardi et mercredi pour 3 séances donnent 2 placées et 1 refusée pour récupération, comme annoncé ; jours espacés : tout est placé. |
| `apps/kairo/tests/strength-days-dom.test.tsx` | 7/7 : ordre grille puis jours, proposition suivie, préférence conservée et incompatibilité signalée jusqu'à l'accord, jours nouveaux non ajoutés, fréquence bloquante, récupération expliquée puis séance non placée motivée, « Modifier le programme » sans modification silencieuse, « Ma musculation » |
| `scripts/e2e-strength-days.mjs`, Chromium 360 et 390 px | OK : mêmes parcours, aucun débordement, cibles de 44 px. Captures dans `captures-3a/`. |
| E2E complet `e2e-beta.mjs` + `e2e.mjs` | **342** vérifications. FIELD TEST DAY et MUSCULATION passent désormais **sans** choix explicite des jours. |
| Personnalisation et replanification 360/390, migrations v1 à v3 → v4, icônes et hors ligne, sécurité des données, séance et répétitions mobile | OK |
| `pnpm check` | **3 095 tests réussis**, 0 échec |

## Limite

L'explication de récupération porte sur la Musculation seule. Les autres sports peuvent aussi occuper ces jours ; le Planning donne alors le motif de chaque séance non placée.
