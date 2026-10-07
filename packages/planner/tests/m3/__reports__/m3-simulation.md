# M3 — simulation hebdomadaire de l’objectif réel

> Priorités déclarées : HYROX (×2), Running composé (×2), Strength (×2), Cross-training (×1). Disponibilité TEST_ONLY : lun–mer, ven–dim. Politique M3 TEST_ONLY.

## 4 semaines

| semaine | planifiées | conflits initiaux | décisions | résidus | conflits avec l’historique | statut |
|---|---|---|---|---|---|---|
| 2026-10-05 | 6 / 7 | 2 | — | 2 | 0 | PARTIAL |
| 2026-10-12 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-10-19 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-10-26 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |

## 12 semaines

| semaine | planifiées | conflits initiaux | décisions | résidus | conflits avec l’historique | statut |
|---|---|---|---|---|---|---|
| 2026-10-05 | 6 / 7 | 2 | — | 2 | 0 | PARTIAL |
| 2026-10-12 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-10-19 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-10-26 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-11-02 | 6 / 7 | 2 | — | 2 | 0 | PARTIAL |
| 2026-11-09 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-11-16 | 6 / 7 | 11 | — | 11 | 9 | PARTIAL |
| 2026-11-23 | 6 / 7 | 10 | SWAP running.2, SWAP hyrox.1 | 1 | 6 | PARTIAL |
| 2026-11-30 | 5 / 7 | 1 | SWAP strength.2 | 0 | 0 | RESOLVED |
| 2026-12-07 | 5 / 7 | 1 | SWAP strength.2 | 0 | 0 | RESOLVED |
| 2026-12-14 | 5 / 7 | 1 | SWAP strength.2 | 0 | 0 | RESOLVED |
| 2026-12-21 | 5 / 7 | 1 | SWAP strength.2 | 0 | 0 | RESOLVED |

- Conflits impliquant l’historique réalisé / abandonné sur 12 semaines : 66 ; aucun avec une séance manquée ou seulement prévue.
- 7 séances demandées pour 6 jours disponibles : une demande Strength reste non planifiée (`NOT_ENOUGH_DAYS`, premier passage V2) ; M3 ne crée pas de jour et ne supprime rien.
- Conflits avec l’historique : la séance longue du dimanche (réalisée) et la séance du lundi ; l’historique ne cède jamais, la séance du lundi n’a ni jour libre ni échange admis : résidu visible.
- À partir de la semaine 8, Running refuse (`DOSE_ANCHOR_UNAVAILABLE`) : à ce niveau, les réalisations ne sont pas réinjectées dans le moteur Running (ports sans état) et son ancre de dose de test expire. Ce n’est pas un effet de M3 (boucle complète : app-core `m3-beta0.test.ts`). Les semaines suivantes, avec deux séances de moins, M3 résout le conflit restant par un échange.
