# M3 — taille de l’arbitrage persisté

Forme compacte persistée par app-core (`arbitration` : statut, passes, version, conflits initiaux, décisions, résidus ; les raisons de gouvernance ne sont persistées que si l’arbitrage est indisponible ou bloqué). Semaine planifiée complète : sortie du planificateur (séances, raisons, voisines).

| semaines | arbitrage compact (Kio) | moyenne / semaine (o) | max / semaine (o) | semaine planifiée complète (Kio) | part de l’arbitrage |
|---|---|---|---|---|---|
| 4 | 11.6 | 2968 | 3708 | 456 | 2.54 % |
| 12 | 23.4 | 1994 | 3708 | 1306 | 1.79 % |
| 52 | 43.8 | 862 | 3708 | 5330 | 0.82 % |

Mesure applicative (Beta 0, Strength + Running, 52 semaines) : `packages/app-core/tests/longitudinal/__reports__/state-size.md` (+0,7 % avec M3).
