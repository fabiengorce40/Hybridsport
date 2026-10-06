# H2.5 — boucle moteur → terrain → moteur (HYROX)

> Chemin réel app-core (Beta 0 expérimental, gouvernance H2 TEST_ONLY). Aucun historique simulé.

### A — composée par H2 (semaine 1)

- Rôle : `hybrid_race.h2.compromised_running` (RACE_SPECIFIC) · date 2026-10-05 · structure `run_station_alternation` · 2 tour(s) · time cap 2265 s
- Composantes (un tour) : ex.burpee_broad_jump 40 distance_m → course 800 m (after_station, allure non prescrite) → ex.farmers_carry 100 distance_m @ 24 kg → course 800 m (after_station, allure non prescrite)
- Historique vu par H2 : {"sameRole":0,"planned":0,"recentStations":[],"lastStructure":"none"}
- Structure : {"structure":"run_station_alternation","criteria":["admitted_for_role","governed_order"]}
- Station 1 : burpee_broad_jump (["not_used_recently","relevance:3","tie_broken_by_id_over:farmers_carry"])
- Station 2 : farmers_carry (["not_used_recently","relevance:3","tie_broken_by_id_over:row"])

- Résultat réel de A : {"kind":"completed","elapsedS":2160} · charges réelles [{"itemId":"plan.2026-10-05.hyrox.1.h2.s3","kg":20}] · pause de 8 min exclue du chrono

### B — composée par H2 (semaine 2), en connaissance de A

- Rôle : `hybrid_race.h2.compromised_running` (RACE_SPECIFIC) · date 2026-10-12 · structure `run_station_alternation` · 2 tour(s) · time cap 2219 s
- Composantes (un tour) : ex.row_erg 500 distance_m → course 800 m (after_station, allure non prescrite) → ex.sandbag_lunge 50 distance_m @ 10 kg → course 800 m (after_station, allure non prescrite)
- Historique vu par H2 : {"sameRole":1,"planned":0,"recentStations":["burpee_broad_jump","farmers_carry"],"lastStructure":"run_station_alternation"}
- Structure : {"structure":"run_station_alternation","criteria":["admitted_for_role","same_as_last_only_option_left"]}
- Station 1 : row (["not_used_recently","relevance:3","tie_broken_by_id_over:sandbag_lunge"])
- Station 2 : sandbag_lunge (["not_used_recently","relevance:3","tie_broken_by_id_over:skierg"])

- **Influencé par A** : B lit A (1 séance(s) du rôle dans la fenêtre, stations récentes ["burpee_broad_jump","farmers_carry"]) et choisit des stations fraîches : row, sandbag_lunge. Contrefactuel (même état SANS la réalisation de A) : burpee_broad_jump, farmers_carry.
- **Non influencé (aucune politique gouvernée)** : doses et distance de course identiques (aucune progression), charge réelle de A non lue pour prescrire (aucune adaptation H3), temps réalisé non interprété, structure imposée par le rôle.

### Variante — A abandonnée

- Résultat de A : {"kind":"abandoned","elapsedS":900,"roundsCompleted":0,"itemsCompletedInRound":2}
- Décision persistée de B : {"sessionId":"2026-10-05.hyrox.2","causes":["abandoned"],"action":"exclude_stations"}
- Stations de A : row, sandbag_lunge ; stations de B : burpee_broad_jump, farmers_carry (aucune en commun)

### Variante — douleur

- A : abandon + douleur (`REPORTED`) → pause douleur centrale.
- Après levée : séances HYROX de la semaine 2 refusées explicitement : {"sessionId":"2026-10-05.hyrox.2","causes":["abandoned","pain"],"action":"refuse"}
