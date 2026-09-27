# RUNNING-ADVERSARIAL-SCENARIOS-V0 — scénarios adversariaux

> **Phase 5C, théorique.** Chaque scénario vérifie que le moteur **dégrade, maintient (HOLD), calibre, réduit ou refuse** plutôt que d’inventer. Règles : [`RUNNING-RULESET-V0.md`](RUNNING-RULESET-V0.md).
>
> **Réponses possibles** : DEGRADE (précision réduite, tracée) · HOLD · CALIBRATE · REDUCE · REFUSE (`NO_VALID_RUNNING_PROPOSAL`) · REPLAN.

| # | Scénario | Piège | Comportement attendu | Réponse | Codes clés | Règle |
|---|---|---|---|---|---|---|
| A01 | Deux courses en conflit (5 km récent lent, 10 km ancien rapide) | Retenir la plus flatteuse ou faire la moyenne | Estimation la plus prudente ; confiance −1 ; calibration proposée | DEGRADE + CALIBRATE | `REF.CONFLICT`, `PERF.CONFLICT_CONSERVATIVE` | §E, V13 |
| A02 | Objectif irréaliste (10 km en 30:00 visé, 55:00 récent) | Utiliser l’allure visée comme cible | L’allure objectif n’est jamais une référence ; RACE_PACE sur la référence récente ; signal au planificateur (`GOAL.UNREALISTIC_INFO`), sans escalade de charge | DEGRADE | `REF.GOAL_NOT_REFERENCE` | 5A §I |
| A03 | Aucune référence (P-R2 avec historique) | Fabriquer une allure | RPE seul ; test proposé si éligible | DEGRADE + CALIBRATE | `REF.NONE`, `ELIG.RPE_ONLY` | §E, §Q |
| A04 | Déclaration irréaliste (« 10 km en 32 min », séances easy à 7:00 / km) | Faire confiance à la déclaration | Déclaration LOW ; observations cohérentes (V15) plus lentes ⇒ baisse ; calibration | DEGRADE + CALIBRATE | `REF.DECLARED_ONLY`, `PERF.DOWNGRADE_OBSERVATIONS` | §F |
| A05 | Fréquence très faible (1 séance par semaine) | Construire un « plan » quand même | Sous V26 ⇒ mode maintien : EASY seulement, HOLD, message | REDUCE + HOLD | `FREQ.BELOW_MINIMUM_PRACTICAL` | V26 |
| A06 | Fréquence très élevée (8 séances demandées, P-R2 habitué à 3) | Multiplier la charge | Fréquence hors bande : durée hebdomadaire maintenue dans la bande (redistribution) ; V10 inchangé ; doubles séances quotidiennes hors V1 ⇒ refus de cette partie | REDUCE (+ REFUSE des doubles) | `LOAD.FREQUENCY_ABOVE_BAND`, `SCOPE.DOUBLE_SESSIONS_V1` | §Y, V10 |
| A07 | Marathon sans historique de sortie longue (plus longue sortie 50 min, épreuve dans 12 semaines) | Inventer une progression du long run | LONG_RUN ancrée à 50 ; confiance de prescription LOW ; portions spécifiques BLOCKED (V39) ; HOLD (V23) ; risque de délai signalé au planificateur | HOLD + DEGRADE | `CONF.LONG_EVENT_HISTORY_MISSING`, `GOAL.TIMEFRAME_RISK`, `PROG.HOLD_MAGNITUDE_UNDEFINED` | §J |
| A08 | Reprise après une interruption de durée inconnue | Assimiler à MODERATE | UNKNOWN : confiance réduite, structure conservatrice, demande d’information, HOLD | DEGRADE + HOLD | `RETURN.STATE_UNKNOWN`, `RETURN.INFO_REQUESTED` | §X |
| A09 | Plusieurs semaines sans aucun retour saisi | Conclure à une interruption, ou à une adhérence parfaite | Absence de données ≠ absence de course : état UNKNOWN ; demande d’information ; aucune inférence ; charge UNKNOWN | HOLD | `FEEDBACK.MISSING`, `LOAD.DIMENSION_UNKNOWN` | I2 |
| A10 | Athlète hybride surchargé (3 séances de jambes lourdes et 2 HYROX dans la semaine) | Maintenir les séances HD de course | Demandes déclarées ; alternatives EASY proposées ; le planificateur peut refuser les séances HD ; HOLD ; si même les EASY ne se placent pas, décision du planificateur | REDUCE + HOLD | `CONC.OVERLOAD_SIGNAL`, `PROG.HOLD_CONCURRENT_LOAD` | §Z, I16 |
| A11 | Pas de FC | Exiger une FC ou l’estimer par l’âge | Aucune cible FC ; aucune formule d’âge | DEGRADE (sans effet) | `TARGET.HR_UNAVAILABLE` | V02, 5A §E |
| A12 | Pas de GPS | Bloquer les cibles | NO_WEARABLE : RPE, répétitions à la durée, distance UNKNOWN | DEGRADE | `TARGET.NO_WEARABLE` | §H |
| A13 | CS ancienne (test il y a 8 mois) | Utiliser CS comme frontière | STALE ⇒ LOW ; CS non utilisée pour la frontière 2 ; calibration | DEGRADE + CALIBRATE | `REF.STALE_REVIEW`, `REF.CS_STALE` | V12 |
| A14 | Conflit allure / RPE (RPE 8 déclaré dans la plage d’allure THRESHOLD) | Pousser l’allure | Priorité basculée vers le RPE pour les séances suivantes ; si les observations sont cohérentes (V15) ⇒ baisse ; si chaleur ou dénivelé déclarés ⇒ observation non comptée | DEGRADE | `TARGET.PRIORITY_SWITCHED_TO_EFFORT`, `PERF.DOWNGRADE_OBSERVATIONS` | §H, V15 |
| A15 | Temps disponible incompatible avec une séance de qualité (30 min ; THRESHOLD prudente = 43) | Supprimer l’échauffement ou compresser en silence | Leviers : échauffement au plancher 10 (V06), retour au calme 5 ⇒ il reste 15 min de travail possible au lieu de 24 ; V31 vide ⇒ impossible de juger si le stimulus reste suffisant ⇒ **REPLACE** par une EASY de 30 min ; proposition au planificateur de déplacer la séance | REPLACE | `TIME.QUALITY_NOT_FIT`, `REPLAN.REPLACE_WITH_EASY` | V06, V31 |
| A16 | P-R0 demande un test maximal | Accepter | Refus de ce test (G1 NOVICE_ENTRY) ; séances à l’effort | REFUSE (du test) | `SAFETY.NOVICE_NO_MAX_TEST` | §Q |
| A17 | Référence invraisemblable (5 km en 12:00 déclaré, easy à 6:30 / km) | Accepter la référence | Conflit massif avec les observations ⇒ référence exclue de la prescription ; demande de vérification | DEGRADE + CALIBRATE | `REF.IMPLAUSIBLE_CONFLICT` | V13 |
| A18 | Douleur déclarée en cours de programme | Continuer la progression | PAIN_STOP : STOP_SESSION ou REDUCE selon la déclaration ; PAUSE_PROGRESSION ; OUT_OF_SCOPE si symptômes non locomoteurs | REDUCE / REFUSE | `SAFETY.PAIN_STOP`, `PROG.HOLD_PAIN_PAUSE` | G1 |
| A19 | Changement de version du ruleset au milieu d’un bloc | Mélanger les règles | La trace porte la version ; les goldens de l’ancienne version restent rejouables ; aucune séance recalculée sans le signaler | HOLD (pas de changement silencieux) | `RULESET.VERSION_CHANGED` | I20 |
| A20 | Paramètre de dose vide pour un archétype choisi (THRESHOLD sans historique) | Remplir avec une valeur « standard » | `PRESCRIPTION_BLOCKED_BY_PARAMETER(V35)` ; composition refaite sans cet archétype ou `NO_VALID` si rien ne reste | REFUSE (du composant) | `PRESCRIPTION_BLOCKED_BY_PARAMETER` | I19 |

**Bilan** :
- 20 scénarios adversariaux ;
- aucune réponse n’invente de valeur ;
- 4 refus explicites (A06 partiel, A16, A18 selon la déclaration, A20 composant) ;
- les autres dégradent, maintiennent, calibrent, réduisent ou remplacent, toujours de façon tracée.
