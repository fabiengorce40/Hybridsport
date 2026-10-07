# H2.5 — taille de l’état HYROX (programme HYROX seul, 2 séances / semaine, toutes exécutées)

| Période | Séances réalisées | Total (Kio) | Prescription | Décisions H2 | Runtime | Résultat (log) | Réalisations H2 | Audit programme | Empreintes |
|---|---|---|---|---|---|---|---|---|---|
| 1 séance | 1 | 23.7 | 4.4 | 10.4 | 0.1 | 0.1 | 0.9 | 0.2 | — |
| 4 semaines | 8 | 95.9 | 17.4 | 40.4 | 0.5 | 1.1 | 7.4 | 1.7 | — |
| 12 semaines | 24 | 280.0 | 52.1 | 117.0 | 1.5 | 3.4 | 22.1 | 5.8 | — |

- Runtime par séance : 64 o / 63 o / 63 o (horodatage + cumul + position + charges ; aucune écriture par seconde).
- Empreintes HYROX : non stockées côté application (anti-doublon CORE non alimenté pour HYROX ; la mémoire H2 passe par les réalisations).
- Les semaines clôturées sont compactées par `compactHistory` (décisions conservées).
