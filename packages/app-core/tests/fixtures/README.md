# Fixtures d'état applicatif

`pre-s1-state.json` : AppState **réel** produit par le code de l'application AVANT Strength S1 (commit `ec84c88`),
exporté tel quel (`exportState`). Reproduit la semaine observée sur le téléphone (lun. / mer. / jeu. / ven. :
Musculation « Full body » ; mar. / dim. : Course « Footing facile »).

Génération (sans toucher au dépôt de travail) :

```sh
git archive ec84c88 | tar -x -C /tmp/pre && cd /tmp/pre && pnpm install --offline --frozen-lockfile
# test vitest jetable : createBeta0Programme(emptyState(), profile({ priorities: ['strength', 'running'],
#   strength: { enabled: true, goal: 'hypertrophy', sessionsPerWeek: 4 },
#   running: { enabled: true, population: 'P_R1', goal: 'GENERAL_RUNNING', wearable: false, sessionsPerWeek: 2, returnState: 'NONE' },
#   availability: [60, 60, 60, 60, 60, 0, 60] }), clock('2026-10-05', '07:30:00'),
#   { lastRun: { realizedDurationS: 1800, distanceM: 5000, difficulty: 'AS_EXPECTED' } }) puis exportState(...)
```

Ne jamais régénérer ce fichier avec le code courant : il doit rester un état ANTÉRIEUR à S1.
