# Taille de l’état persisté — Strength (3 / semaine) + Running (3 / semaine), 52 semaines

JSON compact écrit par `saveState` (Kio). Réalisations TEST_ONLY. Compaction de l’historique appliquée par `ensureBeta0Week`.

| Poste | 4 sem. | 12 sem. | 26 sem. | 52 sem. |
|---|---|---|---|---|
| séances planifiées (session_record) | 84 | 254 | 550 | 1099 |
| raisons persistées des séances | 74 | 170 | 335 | 641 |
| semaines planifiées (autres champs) | 22 | 49 | 96 | 184 |
| audit du programme | 27 | 92 | 200 | 401 |
| programme (définition, semaines, résultats) | 24 | 68 | 145 | 288 |
| Strength : expositions | 10 | 28 | 61 | 122 |
| Strength : tracks et compteurs | 3 | 3 | 3 | 3 |
| empreintes (anti-doublon) | 23 | 68 | 147 | 295 |
| Running : réalisé et références | 3 | 7 | 15 | 30 |
| autres | 1 | 1 | 1 | 1 |
| **Total** | **271** | **741** | **1554** | **3064** |
| séances compactées | 11 | 51 | 121 | 251 |

