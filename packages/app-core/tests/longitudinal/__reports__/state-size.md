# Taille de l’état persisté — Strength (3 / semaine) + Running (3 / semaine), 52 semaines

JSON compact écrit par `saveState` (Kio). Réalisations TEST_ONLY. Compaction de l’historique appliquée par `ensureBeta0Week`.

| Poste | 4 sem. | 12 sem. | 26 sem. | 52 sem. |
|---|---|---|---|---|
| séances planifiées (session_record) | 85 | 256 | 556 | 1112 |
| raisons persistées des séances | 76 | 176 | 346 | 661 |
| semaines planifiées (autres champs) | 27 | 68 | 140 | 273 |
| audit du programme | 30 | 103 | 225 | 453 |
| programme (définition, semaines, résultats) | 24 | 68 | 145 | 288 |
| Strength : expositions | 10 | 29 | 62 | 124 |
| Strength : tracks et compteurs | 4 | 4 | 4 | 4 |
| empreintes (anti-doublon) | 23 | 69 | 150 | 301 |
| Running : réalisé et références | 3 | 8 | 16 | 30 |
| autres | 1 | 1 | 1 | 1 |
| **Total** | **283** | **782** | **1645** | **3246** |
| séances compactées | 11 | 51 | 121 | 251 |

