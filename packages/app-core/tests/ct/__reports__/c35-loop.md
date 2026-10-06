# C3.5 — boucle moteur → terrain → moteur

> Chemin réel app-core (Beta 0 expérimental, gouvernance C3 TEST_ONLY). Aucun historique simulé.

### A — composée par C3 (semaine 1)

- Intention : `crosstraining.mixed_modal_medium` · date 2026-10-05
- Format : `amrap` (["admissible_for_stimulus","governed_order"])
- Mouvements : ex.row_erg {"type":"distance","distanceM":250} ; ex.air_squat {"type":"reps","reps":15} ; ex.band_assisted_pull_up {"type":"reps","reps":8}
- Historique vu par C3 : {"sameStimulus":0,"planned":0,"recentMovements":[],"lastFormat":"none"}
- Mouvement : monostructural → ex.row_erg (["not_used_recently","technical_cost:1","relevance:3"])
- Mouvement : lower_body → ex.air_squat (["not_used_recently","technical_cost:1","relevance:2"])
- Mouvement : upper_pull → ex.band_assisted_pull_up (["not_used_recently","technical_cost:1","relevance:0"])

- Résultat réel de A : {"kind":"rounds_reps","rounds":2,"reps":5} · chrono 780 s (pause d'1 min exclue)

### B — composée par C3 (semaine 2), en connaissance de A

- Intention : `crosstraining.mixed_modal_medium` · date 2026-10-12
- Format : `for_time` (["admissible_for_stimulus","not_used_in_window"])
- Mouvements : ex.row_erg {"type":"distance","distanceM":250} ; ex.reverse_lunge_bw {"type":"reps","reps":15} ; ex.push_up {"type":"reps","reps":10}
- Historique vu par C3 : {"sameStimulus":1,"planned":0,"recentMovements":["ex.air_squat","ex.band_assisted_pull_up","ex.row_erg"],"lastFormat":"amrap"}
- Mouvement : monostructural → ex.row_erg (["recently_used_no_fresh_alternative","technical_cost:1","relevance:3"])
- Mouvement : lower_body → ex.reverse_lunge_bw (["not_used_recently","technical_cost:1","relevance:0"])
- Mouvement : upper_push → ex.push_up (["not_used_recently","technical_cost:1","relevance:3"])

- **Influence de A sur B** : B lit A (1 séance(s) du stimulus, mouvements récents ["ex.air_squat","ex.band_assisted_pull_up","ex.row_erg"]), choisit un format non utilisé dans la fenêtre (`for_time`, critère `not_used_in_window`).

### Variante — A abandonnée

- Décision persistée de B : {"sessionId":"2026-10-05.crosstraining.1","causes":["abandoned"],"action":"exclude_movements"}
- Mouvements de A : ex.row_erg, ex.air_squat, ex.band_assisted_pull_up ; mouvements de B : ex.skierg, ex.reverse_lunge_bw, ex.push_up (aucun en commun)

### Terrain — abandon avec la salle complète Beta 0 (rameur seul ergomètre)

- Semaine 2 : 3 séance(s) CT refusée(s) explicitement (`engine_refused`, formats écartés tracés) : [{"format":"for_time","causes":["ROLE_UNFILLED:monostructural"]},{"format":"emom","causes":["ROLE_UNFILLED:lower_body"]},{"format":"amrap","causes":["ROLE_UNFILLED:monostructural"]}]
- Semaine 4 (fenêtre de récence dépassée) : 3 séance(s) planifiée(s).
