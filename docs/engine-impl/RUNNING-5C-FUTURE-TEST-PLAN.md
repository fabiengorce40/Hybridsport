# RUNNING-5C-FUTURE-TEST-PLAN — tests à écrire avant le code (phase 5C et suivantes)

> **Phase 5B (section AC) : spécification seulement.** Aucun test n’est implémenté.
>
> - **Convention** : chaque cas indique l’entrée, le comportement attendu et l’oracle (ce qui fait échouer le test).
> - **Nature** : U = unitaire ; P = propriété (fast-check) ; G = golden ; C = contrat CORE.
> - Les valeurs de paramètres seront celles du ruleset candidat. Les tests portent sur les **invariants** et les **comportements**, pas sur des constantes inventées.

## 1. Références et modèle de performance

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-REF-01 | U | Deux références valides en conflit au-delà de la tolérance | Confiance de décision baissée d’un niveau ; estimation la plus prudente retenue ; `REF.CONFLICT` | Moyenne pondérée, ou retenue de la plus rapide |
| T-REF-02 | U | Déclaration contredite par plusieurs observations concordantes | Les observations l’emportent pour la prescription ; déclaration conservée | Déclaration utilisée comme autorité |
| T-REF-03 | U | Référence ancienne (au-delà d’une bande de récence) | Confiance dégradée + demande de revue `REF.STALE_REVIEW` ; **aucune invalidation binaire** | Référence supprimée ou gardée HIGH |
| T-REF-04 | P | Vieillissement monotone | Pour une même référence, la confiance ne croît jamais quand l’âge augmente, toutes choses égales | Confiance qui remonte avec l’âge |
| T-REF-05 | U | Référence déclarée seule (R12) | Réf. LOW ; aucune plage d’allure étroite ; priorité EFFORT | Confiance > LOW ou allure étroite |
| T-REF-06 | U | Une séance isolée réussie au-dessus de la référence | Aucune réécriture de la capacité ; au plus `PERF.TEST_PROPOSED` | Référence haussée |
| T-REF-07 | U | Plusieurs observations cohérentes au-dessus de la référence (B1) | Hausse autorisée avec une confiance inférieure à celle d’une performance maximale ; `PERF.UPGRADE_EVIDENCE` | Hausse refusée par principe, ou confiance HIGH |
| T-REF-08 | U | Hausse substantielle sans preuve fiable | Refusée ; tracée | Hausse acceptée |
| T-REF-09 | P | Asymétrie baisse / hausse | La preuve exigée pour une baisse n’est jamais supérieure à celle d’une hausse équivalente | Inversion |
| T-PERF-01 | U | Distance cible encadrée par deux performances | Interpolation ; `PERF.INTERPOLATED` | Extrapolation utilisée |
| T-PERF-02 | P | Extrapolation croissante | La confiance ne croît jamais avec le rapport d’extrapolation | Non monotone |
| T-PERF-03 | U | 10 km HIGH, aucun historique long, objectif marathon (§Z) | Réf. HIGH pour le 10K ; Presc. ≤ MEDIUM pour le marathon ; `invalidFor` contient l’allure marathon si l’extrapolation est lointaine | Presc. HIGH |
| T-PERF-04 | U | `PerformanceEstimate` consommée comme cible sans décision | Refus (erreur de contrat) | Cible créée directement |
| T-PERF-05 | U | Moteur configuré sans famille VDOT | Fonctionne ; aucune dépendance à VDOT | Échec sans VDOT |

## 2. Critical speed

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-CS-01 | G | R1–R4, R6–R12 sans CS | Tous produisent une proposition valide | Un scénario exige CS |
| T-CS-02 | U | CS à 2 essais, sans corroboration | Confiance plafonnée ; `REF.CS_UNCORROBORATED` | CS HIGH |
| T-CS-03 | U | CS corroborée par une course | CS utilisée comme signal de la frontière 2, en plage | CS utilisée comme cible exacte |
| T-CS-04 | U | Demande de prédiction marathon depuis CS seule | Refus ou confiance LOW, `PERF.OUT_OF_TRIAL_RANGE` | Prédiction HIGH |
| T-CS-05 | U | D’ présente | Stockée à part ; jamais utilisée pour doser une répétition | D’ influence la dose |
| T-CS-06 | U | Modèle CS non déclaré | Référence refusée ou confiance LOW | Acceptée comme fiable |

## 3. Signaux disponibles (sans montre, sans FC, sans allure)

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-SIG-01 | G | Athlète sans montre ni GPS, saisie manuelle | Programme complet ; cibles en effort ; retours manuels acceptés | Champ capteur exigé |
| T-SIG-02 | U | FC indisponible | Aucune `targetHRRange` ; priorité jamais HR | Plage FC inventée (formule d’âge) |
| T-SIG-03 | U | Allure indisponible (aucune référence) | Aucune `targetPaceRange` ; priorité EFFORT (règle 1) | Allure fabriquée |
| T-SIG-04 | U | FCmax seulement par formule d’âge | Jamais utilisée pour borner un domaine | Borne FC dérivée |
| T-SIG-05 | U | HILL_REPETITIONS avec référence d’allure fiable | Priorité EFFORT ; pas de PACE | Cible d’allure en côte |

## 4. Populations

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-POP-01 | G | Débutant P-R0 (R1) | Pas de test maximal, pas de haute intensité ; G1 NOVICE_ENTRY tracé | Archétype interdit présent |
| T-POP-02 | G | Avancé P-R4 (R5) | Les 11 archétypes éligibles ; densité bornée par la politique | Densité non bornée |
| T-POP-03 | G | Hybride (R7) | Demandes de séance produites ; placement par le GlobalPlanner ; paramètres Strength inchangés | RunningEngine place lui-même, ou modifie Strength |
| T-POP-04 | P | Invariance démographique | Changer l’âge ou le sexe, toutes choses égales, ne change ni les cibles ni les doses | Sortie différente |

## 5. Replanification, reprise, taper

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-REP-01 | U | Séance KEY manquée, créneau conforme disponible | Déplacée ; `REPLAN.MOVED_VALID_SLOT` | Placée à côté d’une autre séance difficile |
| T-REP-02 | U | Séance KEY manquée, pas de créneau conforme | Abandonnée ; `REPLAN.DROPPED_NO_VALID_SLOT` | Empilement |
| T-REP-03 | P | Aucun rattrapage | Charge de la semaine après replanification ≤ charge prévue, sur toute dimension | Dépassement |
| T-REP-04 | U | Plusieurs séances manquées | Base récente recalculée sur le réalisé | Base inchangée |
| T-REP-05 | U | Zone gelée | Séances des prochaines 24 h inchangées sans action de l’utilisateur | Modifiées |
| T-RET-01 | U | État UNKNOWN_RETURN_STATE | Traité au moins comme MODERATE ; questions posées ; HOLD | Traité comme SHORT |
| T-RET-02 | U | LONG_INTERRUPTION | Références dégradées ; archétypes intenses interdits ; G1 RETURN_PROTOCOL | Reprise au niveau antérieur |
| T-RET-03 | U | Informations de reprise manquantes | Progression en HOLD, `PROG.HOLD_RETURN_REQUIREMENTS` | Progression |
| T-RET-04 | U | Raison déclarée « blessure » | Renvoi à la gouvernance douleur ; aucun diagnostic | Texte diagnostique |
| T-TAP-01 | U | Épreuve datée, charge accumulée suffisante | TaperPolicy appliquée : volume en baisse, intensité et fréquence maintenues | Intensité supprimée |
| T-TAP-02 | U | GENERAL_RUNNING ou charge faible | Aucun taper (`TAPER.NOT_ELIGIBLE`) | Taper imposé |
| T-TAP-03 | U | Ampleur du taper | Valeur issue du ruleset (paramètre gouverné), jamais une constante codée | Constante codée |

## 6. Confiance, charge, progression

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-CONF-01 | U | Confiance de prescription LOW | Priorité EFFORT ; plages larges ; archétypes exigeants différés | Allure étroite |
| T-CONF-02 | U | Confiance de prescription HIGH, terrain plat | Plage d’allure étroite autorisée ; priorité PACE | Priorité EFFORT imposée sans raison |
| T-CONF-03 | P | Agrégation par minimum | La confiance de prescription ≤ le niveau de chaque facteur limitant | Supérieure à un facteur |
| T-CONF-04 | U | Confiances distinctes | Réf. HIGH et Presc. LOW coexistent (cas marathon) | Confusion des deux |
| T-LOAD-01 | U | Hausse sur une seule dimension dans les bornes | `MODERATE_INCREASE` accepté | Refus |
| T-LOAD-02 | U | Hausses simultanées sur plusieurs dimensions | `MULTI_DIMENSION_INCREASE` refusé | Accepté |
| T-LOAD-03 | U | Hausse au-delà de la borne de garde-fou | `LARGE_INCREASE` ; proposition réduite ; code nommant le paramètre et son statut | Acceptée silencieusement |
| T-LOAD-04 | U | Hausse d’intensité (temps en SEVERE) | Évaluée sur `highIntensityExposure` | Ignorée |
| T-LOAD-05 | U | Aucune règle des 10 % ni ACWR | Le moteur fonctionne sans aucun paramètre `tenPercent` / ACWR | Dépendance présente |
| T-UNK-01 | P | Propagation d’UNKNOWN | Une dimension UNKNOWN n’est jamais remplacée par 0 ou par une moyenne ; jamais `WITHIN_HABITUAL` | Imputation |
| T-UNK-02 | U | Dimension structurante UNKNOWN (long run avant de progresser sur le long run) | HOLD sur cette dimension | Progression |
| T-PROG-01 | P | Une seule variable dominante | Pour toute décision, au plus une dimension en UP | Deux dimensions en UP |
| T-PROG-02 | U | Intensité comme variable dominante (confiance HIGH, charge stable, DEVELOPMENT) | Autorisée | Refusée par une priorité universelle |
| T-PROG-03 | U | Conditions de HOLD (5B §R.3), une par une | HOLD avec le code correspondant | Progression |
| T-PROG-04 | U | Progression du long run | En durée, relative à l’historique propre ; aucun pourcentage du volume | Borne en % du volume |
| T-PROG-05 | U | Progression du fractionné | Une variable (répétitions **ou** durée **ou** récupération) par décision | Plusieurs à la fois |
| T-PROG-06 | U | `magnitudeClass` | Libellés opérationnels issus des paramètres ; aucun seuil codé | Constante codée |

## 7. Sécurité

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-SAF-01 | U | Douleur qui modifie la foulée (déclarée) | STOP_SESSION + PAUSE_PROGRESSION | Poursuite |
| T-SAF-02 | U | Symptôme non locomoteur déclaré | OUT_OF_SCOPE | Programme généré |
| T-SAF-03 | P | Précédence G1 | Aucun paramètre non G1 ne relâche une borne G1 (NOVICE / RETURN) | Relâchement |
| T-SAF-04 | U | Paramètre G1 non signé en mode PRODUCTION | Blocage (même doctrine que le verrou Strength) | Passage |

## 8. Déterminisme, versionnement, CORE

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-DET-01 | P | Même entrée, même ruleset, même graine | Même sortie et même trace (octet pour octet) | Divergence |
| T-DET-02 | P | Permutation de l’ordre des références en entrée | Même décision | Décision dépendante de l’ordre |
| T-VER-01 | U | Changement de version de ruleset | La trace porte la version ; les goldens de l’ancienne version restent reproductibles | Non reproductible |
| T-VER-02 | U | Paramètre sans statut ni provenance | Refus du ruleset | Accepté |
| T-CORE-01 | C | `run_structure` valide (séries, répétitions, récupérations, cibles) | Sérialisation / désérialisation identique | Perte de champ |
| T-CORE-02 | C | `run_structure` avec durée ET distance sur une même dose | Refus | Accepté |
| T-CORE-03 | C | `sets > 1` sans `betweenSetRecovery` | Refus | Accepté |
| T-CORE-04 | C | Cible sans effort ni allure | Refus | Accepté |
| T-CORE-05 | C | Cible avec effort seul (athlète sans montre) | Acceptée | Refus |
| T-CORE-06 | C | `estimates` incohérents avec la structure | Refus | Accepté |
| T-CORE-07 | C | Lecteur `session_record` v3 face à une donnée v4 | Refus explicite | Lecture partielle |
| T-CORE-08 | C | Migration v3 → v4 des séances existantes (`intervals`, `distance`) | Identité ; aucun champ reconstruit | Transformation |
| T-CORE-09 | C | `reduce_run_volume` sur `run_structure` | Échauffement et retour au calme réduits d’abord au-dessus du plancher, puis le travail ; la cible n’est jamais modifiée | Stimulus principal supprimé en premier |
| T-CORE-10 | C | Domaine `easy_low` | Plages interprétées comme plafonds (conformité = dépassement seulement) | Cible basse exigée |

## 9. Goldens R1–R12

| ID | Nature | Cas | Attendu | Oracle d’échec |
|---|---|---|---|---|
| T-GOLD-R1 … T-GOLD-R12 | G | Chaque scénario de `RUNNING-V1-GOLDEN-SCENARIOS.md` | Archétypes autorisés / interdits respectés ; codes de raison attendus présents ; hypothèses interdites absentes | Toute violation |

## 10. Décompte

| Groupe | Cas |
|---|---|
| Références et performance | 14 |
| Critical speed | 6 |
| Signaux | 5 |
| Populations | 4 |
| Replanification, reprise, taper | 12 |
| Confiance, charge, UNKNOWN, progression | 17 |
| Sécurité | 4 |
| Déterminisme, versions, CORE | 14 |
| Goldens | 12 |
| **Total** | **88** |

Tous les thèmes requis sont couverts :
- conflits de références, références anciennes, référence déclarée seule ;
- CS disponible ou non ;
- sans montre, sans FC, sans allure ;
- débutant, avancé, hybride ;
- séance manquée, reprise, taper ;
- confiance faible et élevée ;
- hausse de charge, hausse d’intensité ;
- progression du long run et du fractionné ;
- déterminisme, versionnement du ruleset, propagation d’UNKNOWN ;
- sérialisation du fractionné CORE.
