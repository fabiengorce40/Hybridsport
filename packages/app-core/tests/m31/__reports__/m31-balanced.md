# M3.1 — HYROX équilibré : 4 semaines (chemin réel de l’application)

> Politique de rotation TEST_ONLY (SIMULATION_ONLY en Beta 0) : candidates = les cinq rôles H2, critères « moins récemment réalisé » puis « moins récemment assigné ». Réalisations TEST_ONLY. Ce n’est pas une périodisation.

## HYROX 2 séances / semaine (6 jours disponibles)

| semaine | séance | rôle demandé (programme) | rôle composé (H2) | placement (M3) | exécution | rôles réalisés lus en début de semaine |
|---|---|---|---|---|---|---|
| 1 | hyrox.1 | station_capacity | station_capacity | placée 2026-10-05 | réalisée | — |
| 1 | hyrox.2 | strength_endurance | strength_endurance | placée 2026-10-10 | réalisée | — |
| 2 | hyrox.1 | mixed_station_conditioning | mixed_station_conditioning | placée 2026-10-12 | réalisée | station_capacity, strength_endurance |
| 2 | hyrox.2 | compromised_running | compromised_running | placée 2026-10-17 | non réalisée | station_capacity, strength_endurance |
| 3 | hyrox.1 | partial_simulation | partial_simulation | placée 2026-10-19 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning |
| 3 | hyrox.2 | compromised_running | compromised_running | placée 2026-10-24 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning |
| 4 | hyrox.1 | station_capacity | station_capacity | placée 2026-10-26 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running |
| 4 | hyrox.2 | strength_endurance | strength_endurance | placée 2026-10-31 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running |

Rôles distincts composés sur 4 semaines : 5 / 5. La séance manquée de la semaine 2 garde son rôle « non réalisé » : il est reproposé ensuite.

## HYROX 3 séances / semaine + Running ×2 (4 jours disponibles)

| semaine | séance | rôle demandé (programme) | rôle composé (H2) | placement (M3) | exécution | rôles réalisés lus en début de semaine |
|---|---|---|---|---|---|---|
| 1 | hyrox.1 | station_capacity | station_capacity | placée 2026-10-05 | réalisée | — |
| 1 | hyrox.2 | strength_endurance | strength_endurance | placée 2026-10-07 | réalisée | — |
| 1 | hyrox.3 | mixed_station_conditioning | mixed_station_conditioning | composée, NON placée | réalisée maintenant (hors planning) | — |
| 2 | hyrox.2 | partial_simulation | partial_simulation | placée 2026-10-14 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning |
| 2 | hyrox.1 | compromised_running | compromised_running | placée 2026-10-16 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning |
| 2 | hyrox.3 | station_capacity | station_capacity | composée, NON placée | non réalisée | station_capacity, strength_endurance, mixed_station_conditioning |
| 3 | hyrox.2 | mixed_station_conditioning | mixed_station_conditioning | placée 2026-10-21 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running |
| 3 | hyrox.1 | strength_endurance | strength_endurance | placée 2026-10-23 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running |
| 3 | hyrox.3 | station_capacity | station_capacity | composée, NON placée | non réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running |
| 4 | hyrox.2 | compromised_running | compromised_running | placée 2026-10-28 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running, mixed_station_conditioning, strength_endurance |
| 4 | hyrox.1 | station_capacity | station_capacity | placée 2026-10-30 | réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running, mixed_station_conditioning, strength_endurance |
| 4 | hyrox.3 | partial_simulation | partial_simulation | composée, NON placée | non réalisée | station_capacity, strength_endurance, mixed_station_conditioning, partial_simulation, compromised_running, mixed_station_conditioning, strength_endurance |

Semaine 1 : la séance non placée (mixed_station_conditioning) est réalisée manuellement ; elle est lue comme réalisée en semaine 2.
