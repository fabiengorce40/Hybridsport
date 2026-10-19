# Taille de l’état persisté — Strength (3 / semaine) + Running (3 / semaine), 52 semaines

JSON compact écrit par `saveState` (Kio). Réalisations TEST_ONLY. Compaction de l’historique appliquée par `ensureBeta0Week`.

| Poste | 4 sem. | 12 sem. | 26 sem. | 52 sem. |
|---|---|---|---|---|
| séances planifiées (session_record) | 85 | 253 | 548 | 1095 |
| raisons persistées des séances | 76 | 177 | 348 | 665 |
| semaines planifiées (autres champs) | 27 | 68 | 140 | 273 |
| audit du programme | 30 | 101 | 220 | 442 |
| programme (définition, semaines, résultats) | 24 | 68 | 145 | 288 |
| Strength : expositions | 10 | 28 | 60 | 120 |
| Strength : tracks et compteurs | 3 | 4 | 4 | 4 |
| empreintes (anti-doublon) | 23 | 69 | 149 | 298 |
| Running : réalisé et références | 3 | 8 | 16 | 30 |
| autres | 1 | 1 | 1 | 1 |
| **Total** | **282** | **776** | **1630** | **3216** |
| séances compactées | 11 | 51 | 121 | 251 |

