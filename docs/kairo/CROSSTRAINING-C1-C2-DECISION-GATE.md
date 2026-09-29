# Cross-training : Decision Gate C1 → C2

**Statut : pour arbitrage.** Ce document ne prend **aucune** décision. Aucune valeur n'est ajoutée au registre et aucun code de C2 n'est écrit. Le seul ajout au dépôt est un **spike de test** qui interroge le pipeline réel du CORE (§F). Il ne contient aucun code de production.

## A. Baseline

| Élément | État |
|---|---|
| HEAD de référence | `3738aff` (C1 gelé) |
| Arbre de travail | propre à `3738aff`. Seul ajout de ce gate : `packages/crosstraining/tests/spike/c2-replay-core-compat.test.ts` et ce document |
| Tests | **1 365** au vert (1 348 de C1 + 17 assertions du spike). Typecheck et lint propres |
| CORE, Running, Strength | **0 ligne modifiée** depuis `3738aff` (vérifié par `git diff`) ; le test d'architecture vérifie aussi `1d37a50` |
| Registre Cross-training | 31 paramètres, tous `UNRESOLVED` ; 16 décisions `PENDING` ; 4 politiques G1 `UNSIGNED` ; `CORE_EXT_C1`, `GLOBAL_PLANNER` et `CT_CONTENT` `UNSATISFIED` |
| Accès aux sources | **texte intégral toujours inaccessible**. La politique réseau bloque `pmc.ncbi.nlm.nih.gov`, `pubmed.ncbi.nlm.nih.gov`, `link.springer.com`, `journals.plos.org`, `www.mdpi.com`, `www.frontiersin.org`, `api.crossref.org`, `europepmc.org`, `www.sciencedirect.com`. Constat du 2026-09-29, par `curl` et `WebFetch` |

## B. Matrice des décisions

### B.0 Source de la liste et écarts constatés avec le code

Le §5 du dossier de preuve liste, pour « débloquer C2, puis C3 » : **CT-D15, CT-D1, CT-D2, CT-D3, CT-D8, CT-D9, CT-G1**. Aucune autre décision n'est ajoutée. La confrontation avec le code C1 révèle toutefois trois écarts, **à arbitrer, non corrigés ici** :

1. **CT-D6 est exigé par le code, mais absent du §5.** Le socle (`CT_FOUNDATION_DEFINITION`, `capabilities.ts`), évalué pour **toute** prescription, contient `ct.safety.repsPerMovementCap` et `ct.safety.jumpContactsCap` (CT-D6).
   - En l'état du code, aucun rejeu n'est possible sans CT-D6 ou sans modifier la définition du socle.
   - CT-D6 n'est pas une nouvelle décision : elle existe dans le registre depuis C1. Elle est présentée en **B.8** comme écart, pas comme ajout.
2. **Le §5 laisse croire que CT-D15 seule débloque C2.** Le code exige en réalité, pour `ctReplayHold` et le socle :
   - CT-D15 ;
   - une partie de CT-D1 (`ct.stimulus.catalog`, `ct.stimulus.admissibleFormats`) ;
   - CT-D6 ;
   - CT-G1 (3 paramètres) ;
   - la signature des **4** politiques G1 (le socle) ;
   - `CT_CONTENT`.
3. **Le CORE exige une donnée que `ctReplayHold` ne liste pas** : les parts d'énergie prévues (`fingerprintInputs.energy`, §F-9). Le paramètre qui peut la fournir est `ct.stimulus.intensityBand` (CT-D1). Il appartient aujourd'hui à `ctIntensityTargets`, pas à `ctReplayHold`.

### B.1 Synthèse

| ID | Question | Nécessaire au plus petit C2 (§D) ? | Classe |
|---|---|---|---|
| CT-D15 | Le rejeu d'une séance réalisée est-il une source de dose ; fenêtre, complétion, retour négatif | **Oui** | **C** |
| CT-D1 | Stimuli, formats admissibles, bande d'intensité ; domaines de temps, travail / repos | **Oui, en partie** (catalogue, formats admissibles, bande d'intensité). Domaines de temps et travail / repos : non | **C** |
| CT-D2 | Débits d'estimation ; construction d'une dose à partir des débits | **Estimation : oui** (exigée par le CORE, §F-7). **Construction de dose : non** | **C** (estimation) |
| CT-D3 | Marge du time cap | **Non**, si le rejeu garde le cap enregistré et refuse un for time sans cap | **D** |
| CT-D8 | Densité EMOM | **Non** (EMOM rejoué tel quel) | **D** |
| CT-D9 | Cible d'effort (RPE) | **Non** (aucune cible dans un rejeu ; sRPE mesuré seulement) | **D** |
| CT-G1 | Novice, reprise, volume excentrique nouveau, douleur (signatures G1) | **Oui** (socle et `ctReplayHold`) | **C** |
| CT-D6 (écart B.0-1) | Plafonds de répétitions et de contacts par séance | **Oui en l'état du code** ; sinon, décision structurelle sur le socle | **D** (valeurs) — voir H.5 |

### B.2 CT-D15 — rejeu de l'historique réalisé

- **Question** : un rejeu **strict** (même prescription, rien de recalculé) d'une séance réellement complétée est-il accepté comme source de dose ? Avec quelle fenêtre de récence, quel critère de complétion, quel retour négatif ?
- **Paramètres** : `ct.history.anchorPolicy`, `ct.history.recencyBand`, `ct.history.negativeResponse`, `ct.history.completionCriterion`.
- **Capacités** : `ctReplayHold` (et `ctBenchmarks` pour `completionCriterion`). Politique G1 : `CT-G1-PAIN`.
- **Niveau de preuve** : aucune source n'étudie le rejeu. S20 (ABSTRACT ONLY) exclut l'ACWR comme règle. S21 (ABSTRACT ONLY) décrit une perte d'adaptation, pas une fenêtre de ré-exposition. S9 et S11 (ABSTRACT ONLY) établissent le sRPE comme mesure.
- **Ce que la littérature établit** :
  - le sRPE est une mesure valide de charge interne en HIFT, avec une fiabilité limitée de la correspondance RPE ↔ effort physiologique (S11) ;
  - le désentraînement de moins de 4 semaines est le plus souvent partiel (S21) ;
  - l'ACWR n'est pas un outil fondé (S20).
- **Ce qu'elle n'établit pas** :
  - qu'une séance déjà réussie est sûre à répéter ;
  - une fenêtre de récence ;
  - un seuil de retour négatif ;
  - une définition de « complété ».
- **Options documentées (dossier §2 et §5)** : rejeu strict (HOLD) comme option au risque le plus faible, « raisonnement, pas preuve ». Critère de complétion : « dans le cap, sans scaling, sans abandon ».
- **Conséquences techniques** : voir H.1. Le contrat de séance réalisée C1 ne sait **pas** prouver « sans scaling » ni l'origine de l'enregistrement (§D-5).
- **Conséquences sportives** : aucune progression. L'athlète refait ce qu'il a déjà fait, et la stagnation est assumée.
- **Risques** :
  - une séance complétée peut avoir été mal tolérée (S19 : rhabdomyolyses après des séances menées à terme) ;
  - la fenêtre de récence peut rejouer une séance après une coupure ;
  - un enregistrement déclaratif peut être faux.
- **Réversibilité** : élevée. Un rejeu ne crée aucune donnée nouvelle, et la capacité peut être désactivée par gouvernance.
- **KEEP BLOCKED** : aucune séance Cross-training générée. Le contenu reste manuel (hors KAIRO).

### B.3 CT-D1 — stimuli, formats, intensité (sous-ensemble utile à C2)

- **Question pour C2** :
  - quels stimuli existent (`ct.stimulus.catalog`) ;
  - quels formats sont admissibles par stimulus (`ct.stimulus.admissibleFormats`) ;
  - quelle bande d'intensité prévue par stimulus (`ct.stimulus.intensityBand`), exigée par le CORE pour l'empreinte.
- **Paramètres hors C2** : `ct.stimulus.timeDomains`, `ct.stimulus.workRestRatios` (calibrage C3).
- **Capacités** : socle (`catalog`), `ctReplayHold` et `ctCalibratedDose` (`admissibleFormats`), `ctIntensityTargets` (`intensityBand`). Voir l'écart B.0-3.
- **Niveau de preuve** : S1 (définition), S12, S13, S15 (réponses aiguës). Tous ABSTRACT ONLY.
- **Ce que la littérature établit** :
  - l'intensité du HIFT est relative à l'individu (S1) ;
  - à volume égal, le format change la charge aiguë : le RFT est plus stressant que l'EMOM (S12, entraînés, n = 12) ;
  - l'AMRAP réduit la vitesse d'exécution (S13, n = 12) ;
  - la durée change les déterminants de la performance (S15).
- **Ce qu'elle n'établit pas** :
  - une taxonomie de stimuli ;
  - un lien format → adaptation chronique ;
  - une bande d'intensité par stimulus ;
  - des bornes de domaine de temps.
- **Options documentées** : table stimulus → formats décidée (c), taxonomie de la spec 06 comme **hypothèse de conception** (jamais une preuve).
- **Conséquences techniques** : la table des formats est déjà lue fail-closed par `formatAdmissibility`. La bande d'intensité alimente `fingerprintInputs.energy` (sinon refus technique du CORE, §F-9).
- **Conséquences sportives** : un stimulus mal défini fausse l'anti-doublon et la répartition future (C7). Sans effet sur la dose rejouée.
- **Risques** : une classification d'intensité erronée biaise l'anti-doublon (composante `energy`) et, plus tard, la récupération.
- **Réversibilité** : moyenne. La définition des stimuli structure l'historique enregistré, et la changer rend des séances anciennes non comparables.
- **KEEP BLOCKED** : bloque C2 (socle et empreinte).

### B.4 CT-D2 — débits d'estimation (et construction de dose)

- **Question** : d'où viennent les débits (reps, calories, mètres par minute) servant **uniquement** à estimer une durée ? Une dose prescrite peut-elle en être construite ?
- **Paramètres** : `ct.estimation.workRates` (ESTIMATION) ; `ct.dose.construction` (PRESCRIPTION, **non nécessaire à C2**).
- **Capacités** : `ctCalibratedDose`. De fait aussi `CT_CONTENT`, car le DurationEngine du CORE lit les débits du catalogue **pour tout item** (§F-7).
- **Niveau de preuve** : aucune source. S22 : absence de norme trouvée (recherche non systématique).
- **Ce que la littérature établit** : rien sur les débits par mouvement et par niveau.
- **Ce qu'elle n'établit pas** : toute valeur de débit.
- **Options documentées** : mesures propres à KAIRO, jugement expert, ou données de l'athlète (méthode à décider). Fixtures du catalogue de test **exclues**.
- **Constat technique (spike)** :
  - le CORE calcule le travail de **chaque** item, même dans un AMRAP ou un EMOM dont la durée est fixe. Un item sans donnée d'estimation (débit dans la bonne unité, ou `secondsPerRep` pour des reps) est **refusé** (§F-7) ;
  - la **valeur** du débit est sans effet sur un AMRAP ou un EMOM (durée fixe) ;
  - elle compte pour un for time (sous le cap) et fixe entièrement la durée d'un bloc continu en reps, calories ou distance.
- **Conséquences techniques** : sans données d'estimation gouvernées, le catalogue Cross-training reste une fixture, donc `CT_CONTENT` reste insatisfait.
- **Conséquences sportives** : un débit faux fausse la durée estimée (dépassement du temps disponible) pour for time et continu. Il ne change jamais la dose rejouée.
- **Risques** : sous-estimation ⇒ séance plus longue que le temps disponible.
- **Réversibilité** : élevée (données de catalogue versionnées).
- **KEEP BLOCKED** : C2 reste possible **seulement** si les formats rejoués n'exigent aucun débit dont la valeur compte, et si le catalogue fournit tout de même une donnée d'existence. Voir H.3 : cette option a elle-même besoin d'une décision.

### B.5 CT-D3 — marge du time cap

- **Question** : comment calculer un time cap nouveau.
- **Paramètre** : `ct.format.timeCapMargin`. **Capacité** : `ctCalibratedDose`.
- **Niveau de preuve** : aucune source.
- **Littérature** : n'établit rien.
- **Nécessaire à C2 ?** **Non**, sous deux conditions :
  - un for time rejoué garde **exactement** son cap enregistré ;
  - un for time enregistré **sans** cap n'est pas rejouable (le CORE exige `timeCapS`, §F-3).
- **Risque si décidé maintenant** : aucune donnée pour calibrer.
- **Réversibilité** : sans objet.
- **KEEP BLOCKED** : aucun effet sur C2.

### B.6 CT-D8 — densité EMOM

- **Question** : fraction maximale de travail par minute.
- **Paramètre** : `ct.format.emomDensity`. **Capacité** : `ctCalibratedDose`.
- **Niveau de preuve** : S12, S13, ABSTRACT ONLY, qualitatifs. L'hypothèse « 40–45 s » de la spec **n'a aucune source** : conclusion C1 inchangée.
- **Nécessaire à C2 ?** **Non** : un EMOM rejoué garde sa prescription. Un EMOM à plusieurs mouvements reste bloqué pour une autre raison, l'ambiguïté de sémantique (§F-4).
- **KEEP BLOCKED** : aucun effet sur C2.

### B.7 CT-D9 — cible d'effort

- **Question** : prescrire une cible RPE, ou seulement mesurer le sRPE.
- **Paramètres** : `ct.intensity.effortTargetByStimulus` (et `ct.stimulus.intensityBand`). **Capacité** : `ctIntensityTargets` (dépend aussi de `CORE_EXT_C1`).
- **Niveau de preuve** : S9, S10, S11, ABSTRACT ONLY. Mesure : oui. Cible fine : la limite de fiabilité de S11 s'y oppose. Conclusion C1 inchangée.
- **Nécessaire à C2 ?** **Non** :
  - le CORE n'a aucun champ de cible d'effort pour un metcon (compatibilité P3) ;
  - un rejeu n'en a pas besoin ;
  - le sRPE reste une **mesure** (contrat C1). Son usage comme signal de retour négatif relève de CT-D15.
- **KEEP BLOCKED** : aucun effet sur C2.

### B.8 CT-G1 — politiques de sécurité

- **Question** :
  - exclusions novice (`ct.safety.novicePolicy`) ;
  - protocole de reprise (`ct.return.protocol`) ;
  - volume excentrique sur un mouvement nouveau (`ct.safety.novelEccentricVolume`) ;
  - signature des politiques `CT-G1-PAIN`, `CT-G1-NOVICE`, `CT-G1-RETURN`, `CT-G1-EXERTIONAL`.
- **Capacités** : socle (les 3 paramètres et les 4 signatures), `ctReplayHold` (`CT-G1-PAIN`), `ctFirstExposure`, `ctTechnicalMovements`.
- **Niveau de preuve** : S8, S16, S19, S21, ABSTRACT ONLY. S19 : risque qualitatif (cas rapportés). S8 n'établit pas l'exclusion des novices.
- **Ce que la littérature établit** : la rhabdomyolyse après HIFT est rapportée en cas cliniques, surtout sur des volumes élevés de pompes et de tractions (S19). Le reste relève de la politique de prudence.
- **Ce qu'elle n'établit pas** : un seuil, une règle novice, un protocole de reprise.
- **Conséquences techniques** : sans signature, le socle reste désactivé ⇒ aucune prescription.
- **Conséquences sportives** : définit **qui** peut recevoir un rejeu (novice ? après coupure ?).
- **Risques** : ce sont des politiques de sécurité. Leur signature engage la responsabilité produit.
- **Réversibilité** : élevée côté code (dé-signature), mais une séance déjà servie ne se retire pas.
- **KEEP BLOCKED** : bloque tout, C2 compris.

### B.9 CT-D6 (écart B.0-1) — plafonds par séance

- **Question** : plafond de répétitions d'un même mouvement et de contacts de sauts par séance.
- **Paramètres** : `ct.safety.repsPerMovementCap`, `ct.safety.jumpContactsCap`. **Capacité** : socle.
- **Niveau de preuve** : S18, S19, ABSTRACT ONLY. Risque qualitatif ; **aucun** seuil.
- **Nécessaire à C2 ?** **Oui en l'état du code**, puisque le socle l'exige. Question structurelle : voir H.5.
- **Classe** : **D** pour les valeurs.

## C. Audit des sources, une par une

Niveau de vérification :
- **ABSTRACT ONLY** : résumé ou notice, obtenu via des résultats de moteur de recherche ;
- **SECONDARY CITATION** : l'information vient d'une source secondaire, pas du résumé de l'article ;
- **INACCESSIBLE** : non lue ou non attribuable.

**Aucune source n'a pu être relue en texte intégral** (A). Aucune valeur numérique n'est promue.

| # | Référence | Question qu'elle informe | Population | Protocole | Résultat pertinent | Limites | Vérification | Peut soutenir | Ne peut pas soutenir |
|---|---|---|---|---|---|---|---|---|---|
| S1 | Feito Y, Heinrich KM, et al. *High-Intensity Functional Training (HIFT): Definition and Research Implications for Improved Fitness.* Sports 2018;6(3):76. doi:10.3390/sports6030076 | Vocabulaire (CT-D1) | — | Article de définition | Intensité **relative à l'individu** ; durées variées, avec ou sans repos | Aucune donnée de dose | ABSTRACT ONLY | Principe « intensité relative » (CT-D1, CT-D13, qualitatif) | Stimuli, domaines, formats, toute valeur |
| S2 | *Effects of high-intensity functional training on physical fitness in healthy individuals: a systematic review with meta-analysis.* BMC Public Health 2025. doi:10.1186/s12889-025-21538-5 (auteurs non relus) | Intérêt général du HIFT | 19 études, 911 sujets sains | Programmes HIFT hétérogènes | Effets positifs force, puissance, vitesse, endurance, agilité | Programmes non relus ; pas de dose-réponse | ABSTRACT ONLY | Pertinence du Cross-training (produit) | Tout paramètre de dose |
| S3 | *Effects of high-intensity functional training on physical fitness and sport-specific performance among the athletes: a systematic review with meta-analysis.* PLOS ONE 2023 (PMID 38064433) ; correctif 2024 | Transfert chez des athlètes jeunes | 13 études, 478 athlètes de 10 à 24,5 ans | HIFT ajouté | Force, puissance, souplesse ; **pas** d'effet endurance ni agilité | Population jeune ; correctif non lu | ABSTRACT ONLY | Contexte | Tout paramètre |
| S4 | Garber CE et al. *ACSM Position Stand. Quantity and Quality of Exercise…* MSSE 2011;43(7):1334-59 (PMID 21694556) | Volume hebdomadaire de santé | Adultes apparemment en bonne santé | Position stand | ≥ 150 min/sem modéré ou ≥ 75 min/sem vigoureux ; composantes du programme | Population, santé publique, hebdomadaire | ABSTRACT ONLY | Repère produit hebdomadaire (planificateur, hors périmètre) | Toute dose de séance, CT-D4, CT-D10 comme plafond |
| S5 | ACSM. *Progression Models in Resistance Training for Healthy Adults.* MSSE 2009;41(3):687-708 (PMID 19204579) | Progression de charge (CT-D5, CT-D12) | Adultes en bonne santé, musculation | Position stand | +2 à 10 % quand +1 à 2 reps au-delà de l'objectif sur 2 séances consécutives | Séries classiques, pas de metcon | **SECONDARY CITATION** (règle lue dans des résumés secondaires) | Cadre d'une dérivation experte future (C4 / C6) | C2 ; toute transposition automatique au metcon |
| S6 | Buchheit M, Laursen PB. *High-intensity interval training, solutions to the programming puzzle. Part I.* Sports Med 2013;43(5):313-38 (PMID 23539308) | Travail / repos (CT-D1), intensité | Surtout athlètes endurance et collectifs | Revue narrative | Manipulation travail / récupération ; temps près de VO₂max | Narrative ; modes cycliques | ABSTRACT ONLY | Cadre conceptuel | Tout rapport chiffré multimodal |
| S7 | Milanović Z, Sporiš G, Weston M. *Effectiveness of HIT and Continuous Endurance Training for VO₂max Improvements.* Sports Med 2015 (PMID 26243014) | Stimuli aérobie / intervalles | Adultes sains de 18 à 45 ans | Méta-analyse d'essais contrôlés ≥ 2 sem | Les deux augmentent VO₂max ; comparaison **non vérifiée** | Comparaison rapportée de façon contradictoire | ABSTRACT ONLY | Contexte | Tout paramètre |
| S8 | Tabata I et al. *Effects of moderate-intensity endurance and high-intensity intermittent training on anaerobic capacity and VO₂max.* MSSE 1996;28(10):1327-30 | Stimulus `anaerobic_intervals`, règle novice | Jeunes hommes (exp. 2 : n = 7) | Ergocycle 7–8 × 20 s à ~170 % VO₂max / 10 s, 5 j/sem, 6 sem | Hausse aérobie et anaérobie | Minuscule ; supra-maximal sur ergomètre | ABSTRACT ONLY | Aucun paramètre multimodal | Exclusion novice (G1) ; « Tabata » multimodal |
| S9 | Foster C et al. *A New Approach to Monitoring Exercise Training.* JSCR 2001;15(1):109-15 (PMID 11708692) | Mesure de l'effort (résultat) | Cyclisme ; basket-ball | sRPE vs méthode fondée sur la FC | Relation cohérente ; score plus élevé en basket | Échelle et moment de collecte non relus | ABSTRACT ONLY | Champ `sessionRpe` comme **mesure** | Toute cible (CT-D9) |
| S10 | Borg GA. *Psychophysical bases of perceived exertion.* MSSE 1982 (PMID 7154893) | Définition de l'échelle | — | Méthodologie | Échelle catégorie-ratio | La borne 0–10 vient d'une source secondaire | ABSTRACT ONLY + **SECONDARY CITATION** (bornes) | Définition de l'échelle | Borne 0–10 (convention à confirmer, C) |
| S11 | (a) *Validity, Reliability, and Application of the Session-RPE Method…during HIFT.* Sports 2018;6(3):84 (PMID 30134535) ; (b) *Validity of Session RPE Method…during HIFT.* Sports 2018;6(3):68 | Mesure de l'effort en HIFT ; CT-D9 | Pratiquants de HIFT | sRPE vs TRIMP d'Edwards | Valide ; RPE à 30 min < 0, 10 et 20 min ; **faible fiabilité** RPE ↔ %FCmax | Effectifs non relus | ABSTRACT ONLY | sRPE comme mesure (a) ; moment de collecte à fixer (C) | Cible RPE fine |
| S12 | Smith JS, Bellissimo GF, Amorim FT. *The physiological responses to volume-matched HIFT protocols with varied time domains.* Front Physiol 2025 (doi:10.3389/fphys.2024.1511961 ; PMID 40007896) | Format ↔ charge aiguë (CT-D1, CT-D8) | 12 entraînés (6 H, 6 F) | 5 tours (5 power cleans, 8 tractions kipping, 6 thrusters haltères, 10 burpees) : EMOM vs RFT, volume égal | RFT > EMOM : FC, VO₂, RPE, lactate ; CK à 24 h identique | Aigu, n = 12, entraînés, une séance-type | ABSTRACT ONLY | Qualitatif : le format change la charge aiguë | Densité EMOM ; domaine de temps ; transposition aux novices |
| S13 | Barba-Ruíz et al. *Muscular performance analysis in “cross” modalities: AMRAP, EMOM and RFT.* Front Physiol 2024 (doi:10.3389/fphys.2024.1358191) | Format ↔ exécution (CT-D1, CT-D7) | 12 (10 H, 2 F), ≥ 1 an d'expérience | Squat, tractions, développé ; 3 configurations | MPV plus basse en AMRAP ; perte de vitesse max en RFT, min en EMOM | Aigu, petit, surtout H | ABSTRACT ONLY | Qualitatif | Tout seuil |
| S14 | Chiffres EMOM vs RFT (lactate, RPE, FC) | — | — | — | — | Attribution impossible | **INACCESSIBLE** (non attribuable) | Rien | Tout |
| S15 | *Workout Duration Alters the Importance of Predictive Traits on HIFT Workout Performance.* Sports 2025;13(6):156 (doi:10.3390/sports13060156) | Domaine de temps (CT-D1) | Non relue | Même circuit en 5 vs 15 min AMRAP | Déterminants différents (rameur à 5 min ; expérience et composition à 15 min) | Population non relue | ABSTRACT ONLY | Qualitatif : la durée change les déterminants | Bornes de domaine |
| S16 | Brisebois MF, Rigby BR, Nichols DL. *Physiological and Fitness Adaptations after Eight Weeks of HIFT in Physically Inactive Adults.* Sports 2018;6(4):146 (PMID 30428527) | Première exposition (CT-D4) | 14 inactifs (4 H, 10 F) | HIFT 3 j/sem, 8 sem | Mesures santé et fitness (valeurs non relues) | Petit ; contrôle non vérifié | ABSTRACT ONLY | Faisabilité supervisée | Toute dose d'entrée |
| S17 | *Effects of Six Weeks of HIFT on Physical Performance in Participants with Different Training Volumes and Frequencies.* IJERPH 2020 (PMID 32825378) | Volume / fréquence (CT-D5, CT-D10) | 31 (14 H, 17 F) | 6 sem, volume et fréquence élevés vs modérés ; sRPE | Aucune amélioration (saut, sprint, préhension) | Mesures limitées | ABSTRACT ONLY | Prudence « plus ≠ mieux » | Tout seuil |
| S18 | *Injuries During High-Intensity Functional Training: Systematic Review and Meta-Analysis* (PMID 35278328) et autres revues | Risque (CT-D6, CT-D7) | Pratiquants de HIFT | Revues et méta-analyses | ≈ 4,3 / 1000 h ; épaule, dos, genou | Chiffres mêlant plusieurs revues | ABSTRACT ONLY ; chiffres **SECONDARY** | Priorité qualitative de revue (overhead, axial) | Plafond numérique |
| S19 | *Beyond the intensity: A systematic review of rhabdomyolysis following HIFT.* Apunts Sports Med 2024 (pii S2666506924000154) | Sécurité (CT-G1, CT-D6) | Cas rapportés, surtout 20–40 ans | Revue de cas | Membres supérieurs 63 % ; volumes élevés de pompes et tractions | Cas cliniques (preuve faible) ; facteurs de risque issus d'une autre source | ABSTRACT ONLY ; facteurs **SECONDARY** | Qualitatif : volume excentrique nouveau, haut du corps | Tout seuil ; « séance complétée = sûre » |
| S20 | Impellizzeri et al. *Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls.* IJSPP 2020;15(6):907 (PMID 32502973) | Règles de charge (CT-D5, CT-D15) | — | Analyse méthodologique | ACWR non fondé pour la gestion de charge | — | ABSTRACT ONLY | Exclusion de l'ACWR | Une règle de remplacement |
| S21 | Mujika I, Padilla S. *Detraining… Part I.* Sports Med 2000;30(2):79-87 | Récence, reprise (CT-D15, CT-G1) | Revue | Désentraînement < 4 sem | Perte partielle ; force souvent maintenue ≤ 4 sem, avec exceptions | Adaptation ≠ sécurité | ABSTRACT ONLY | Contexte | Fenêtre de récence ; protocole de reprise |
| S22 | Débits par mouvement et par niveau | CT-D2 | — | Recherche non systématique | Aucune norme trouvée | Absence de résultat ≠ absence de littérature | — | Rien | Toute valeur de débit |

**Conclusions C1 maintenues** (aucune meilleure source vérifiée) :
- aucun débit fiable publié ;
- aucun fondement pour un time cap générique ;
- 40–45 s EMOM non sourcé ;
- sRPE = mesure, pas cible ;
- rejeu = décision de conception.

## D. Le plus petit C2 possible

### D.1 Définition testée

**C2 = rejeu strict, non chargé, mono-sport, d'une séance Cross-training réellement complétée.**

Contenu :
- même stimulus que l'intention ;
- prescription recopiée à l'identique, **rien de recalculé** : ni dose, ni cap, ni densité, ni cible ;
- nouvel identifiant de séance ;
- aucun levier de compression déclaré.

### D.2 Ce que C2 exige (vérifié contre le code et le pipeline réel)

| Besoin | Détail | Origine |
|---|---|---|
| Décisions | **CT-D15** (4 paramètres) ; **CT-D1 partiel** (`stimulus.catalog`, `stimulus.admissibleFormats`, `stimulus.intensityBand`) ; **CT-G1** (3 paramètres) ; **CT-D6** en l'état du socle (ou H.5) ; **CT-D2 estimation** (données du catalogue, H.3) | `capabilities.ts` ; spike §F-7 et §F-9 |
| Peut rester non résolu | CT-D2 `dose.construction`, CT-D3, CT-D4, CT-D5, CT-D7, CT-D8, CT-D9, CT-D10, CT-D11, CT-D12, CT-D13, CT-D14 ; `stimulus.timeDomains`, `stimulus.workRestRatios` | — |
| Capacités | `ctReplayHold` + socle. Aucune autre | `analysis.ts` (sources de dose) |
| Politiques G1 à signer | les **4** : `CT-G1-PAIN`, `CT-G1-NOVICE`, `CT-G1-RETURN`, `CT-G1-EXERTIONAL` (socle) | `CT_FOUNDATION_DEFINITION` |
| Dépendances techniques | `CT_CONTENT` : catalogue Cross-training relu, avec données d'estimation pour chaque mouvement rejouable ; ruleset avec paramètres anti-doublon pour `crosstraining` (§F-10). **Pas** `CORE_EXT_C1`. **Pas** `GLOBAL_PLANNER` (mono-sport) | spike |
| Mode | PRODUCTION exige : paramètres `PRODUCTION_ELIGIBLE`, ruleset verrouillé, décisions `APPROVED`. CANDIDATE exige un moteur en SIMULATION. **Choix produit hors CT-D*, à expliciter** | `capabilities.ts`, `engine.ts` |

### D.3 Données historiques minimales

Une séance `zRealizedCtSession` :
- du **même stimulus** ;
- dans la fenêtre de récence (CT-D15) ;
- avec une prescription **sans** `load` ;
- sur des mouvements non chargeables (ou `bodyweight_plus` sans charge) ;
- avec un résultat qui satisfait le critère de complétion (CT-D15) ;
- sans retour négatif (CT-D15) ;
- avec le sRPE et la douleur renseignés si le retour négatif les exige.

### D.4 Formats

| Format | Rejouable sans transformation ? | Condition / raison (spike §F) |
|---|---|---|
| AMRAP (reps, distance) | **Oui** | Durée fixe ; débit sans effet sur la durée mais **requis** au catalogue |
| For time **avec** cap enregistré | **Oui** | Cap recopié ; débits utilisés pour p50 / p90 sous le cap |
| For time **sans** cap | **Non** | Le CORE exige `timeCapS` ⇒ il faudrait inventer un cap (CT-D3) |
| EMOM **un** mouvement | **Oui** | — |
| EMOM **plusieurs** mouvements | **Non** | Accepté par le CORE, mais ni le contrat C1 ni le CORE ne disent si c'est « alterné » ou « tous chaque minute » : ambiguïté non résolue (compatibilité P7) |
| Continu : distance, durée | **Oui** | La durée dépend du débit (distance) ou est fixe (durée) |
| Continu : reps | Oui, si la donnée d'estimation existe | Durée entièrement estimée par le débit |
| Calories (tout format) | **Non**, sauf débit `cal_per_min` au catalogue | Le rameur du catalogue de test n'a qu'un débit en m/min ⇒ refus, même en AMRAP (§F-6) |
| Intervalles (format Cross-training) | **Non** | Pas de bloc CORE. L'approximation continu + `timed` perd l'ordre des stations (P8) ; un seul mouvement ne porte pas à la fois une durée et une quantité |
| Item `sets` à une série | **Non nécessaire** | Accepté, mais estimé par `secondsPerRep` et non par le débit : sémantique différente d'un item `reps` (§F-8). À ne pas utiliser pour le non chargé |
| Tout mouvement chargé ou chargeable | **Non** | Hors C2 (décision « load » reportée avec HYROX) |

### D.5 Prouver qu'une séance est « completed »

Le contrat C1 permet :
- for time : `time` ≤ cap, ou `capped` ;
- AMRAP : `rounds_reps` ;
- EMOM : minutes tenues ≤ minutes prescrites ;
- continu : `total` ;
- tout format : `abandoned`.

Il **ne permet pas** :
1. de prouver l'exécution **Rx** : la variante **réellement exécutée** n'est pas enregistrée, seulement la variante **prescrite** (`variantOf`) ;
2. de savoir **qui** a enregistré la séance (application ou saisie libre) : pas de champ de provenance ;
3. de relier la séance réalisée à une séance **prescrite par KAIRO**.

Pour le continu, « complété » n'a pas de définition dans le contrat (total mesuré vs quantité prescrite). **Ce sont des lacunes du contrat Cross-training (pas du CORE)**, à combler en C2 selon l'option retenue en H.1-d.

### D.6 Réponses aux questions posées

| Question | Réponse (vérifiée) |
|---|---|
| Conserver strictement la prescription ? | **Oui**, pour les formats de D.4, si : aucun levier ; nouvel identifiant ; contraintes vérifiées **avant** de proposer (matériel, restrictions, zones douloureuses, mouvements restreints, exclusions) ; identité **vérifiée après** le pipeline. Sinon le CORE répare ou raccourcit, et la séance n'est plus un rejeu (§F-11 à §F-13) |
| Estimation de débit nécessaire ? | **Oui, comme donnée du catalogue** (le CORE l'exige pour tout item). Sa valeur compte pour for time et continu, pas pour AMRAP / EMOM |
| Cible RPE nécessaire ? | **Non** |
| Nouveau time cap nécessaire ? | **Non**, si seuls les for time **avec** cap enregistré sont rejouables |
| Parts d'énergie (empreinte) nécessaires ? | **Oui**. Sans elles, le CORE refuse (§F-9) ⇒ `ct.stimulus.intensityBand` (CT-D1) ou KEEP BLOCKED |
| Multisport ? | **Refusé** (`HYBRID_PLANNER_UNAVAILABLE`). Dans l'application, `hybrid` est vrai dès qu'un autre sport est activé : C2 ne sert que les utilisateurs **Cross-training seul** |

## E. Graphe de dépendances (état C1, pour C2)

```
CT-D15 ─┬─ ct.history.anchorPolicy ─────────┐
        ├─ ct.history.recencyBand ──────────┤
        ├─ ct.history.negativeResponse ─────┤
        └─ ct.history.completionCriterion ──┤
CT-D1 ──── ct.stimulus.admissibleFormats ───┼──► ctReplayHold ◄── G1: CT-G1-PAIN
                                            │         ▲
                                            │         └── tech: CT_CONTENT
CT-D1 ──── ct.stimulus.catalog ─────────────┐
CT-D6 ──┬─ ct.safety.repsPerMovementCap ────┤
        └─ ct.safety.jumpContactsCap ───────┤
CT-G1 ──┬─ ct.safety.novicePolicy ──────────┼──► socle (ctFoundation) ◄── G1: PAIN, NOVICE, RETURN, EXERTIONAL
        ├─ ct.return.protocol ──────────────┤         ▲
        └─ ct.safety.novelEccentricVolume ──┘         └── tech: CT_CONTENT

Hors capacités, exigé par le CORE (spike) :
CT-D1 ──── ct.stimulus.intensityBand ──► fingerprintInputs.energy (sinon refus technique)
CT-D2 ──── ct.estimation.workRates ────► catalogue (workRate / secondsPerRep) ⇒ CT_CONTENT
ruleset ── duplicate.* (crosstraining) ─► anti-doublon dès qu'un historique comparable existe

Rejeu proposable ⇔ ctReplayHold activée ET socle activé ET non multisport
                 ET (PRODUCTION : décisions APPROVED + PRODUCTION_ELIGIBLE + ruleset verrouillé
                     | CANDIDATE : moteur en SIMULATION)
```

## F. Spike de compatibilité CORE (résultats réels)

Fichier : `packages/crosstraining/tests/spike/c2-replay-core-compat.test.ts` (17 assertions, vertes).

Méthode :
- `runSportSession` réel (acceptation, durée, empreinte, anti-doublon, validation, réparation) ;
- catalogue et ruleset de **test** du CORE ;
- moteur **de test** qui propose une séance fixe ;
- critère : séance renvoyée **identique** à la séance proposée (formats, champs de bloc, exercices, prescriptions).

| # | Représentation | Résultat |
|---|---|---|
| F-1 | AMRAP : reps + distance | **Identique** |
| F-2 | For time avec cap : reps + distance | **Identique** |
| F-3 | For time **sans** cap | **Refusé** (schéma CORE : `timeCapS` obligatoire) |
| F-4 | EMOM un mouvement / deux mouvements | Identique / identique. Mais même durée estimée : le CORE n'interprète pas le contenu d'un EMOM (sémantique alternée non portée) |
| F-5 | Continu : distance ; `timed` (durée) | **Identique** |
| F-6 | Calories (AMRAP et for time) sur un mouvement sans débit `cal_per_min` | **Refusé**, même en AMRAP : la durée calcule le travail de chaque item |
| F-7 | (conséquence de F-6) | Tout item exige une donnée d'estimation au catalogue : débit dans la bonne unité, ou `secondsPerRep` pour des reps |
| F-8 | Item `sets` à une série, non chargé, vs item `reps` | Les deux passent, avec des **estimations p50 différentes** (`secondsPerRep` vs débit) : sémantique différente |
| F-8b | Intervalles multi-stations (continu + items `timed`) | Accepté, mais l'ordre A / B / A / B est perdu **avant** le CORE : incompatible |
| F-9 | Empreinte sans parts d'énergie | **Refusé** (technique) |
| F-10a | Rejeu avec le **même** identifiant qu'une séance de l'historique | Accepté ; l'anti-doublon **ignore** la comparaison (même séance) : contournement silencieux ⇒ un rejeu doit porter un nouvel identifiant |
| F-10b | Nouvel identifiant, ruleset **sans** `duplicate.*` | **Refusé** (`TECHNICAL.PARAMETER_MISSING duplicate.weights`) : fail-closed |
| F-10c | Nouvel identifiant, ruleset **avec** `duplicate.*` (celui que l'application charge), sans intention de répétition | Accepté, **identique** ; classé `accidental_*`, pénalité B6 (SOFT). Aucun type d'intention de répétition du CORE ne signifie « rejeu » |
| F-11 | Matériel absent (box) | **Modifié** : le CORE répare (substitution ou retrait) |
| F-12 | Restriction `no_impact` | **Modifié** (réparation) |
| F-13 | Temps insuffisant, aucun levier | **Refusé** (jamais de compression silencieuse) |
| F-14 | Temps insuffisant, levier `shorten_conditioning` déclaré | **Modifié** (bloc raccourci) |

**Conclusion** : le rejeu non chargé est représentable **sans modifier le CORE** pour AMRAP, for time avec cap, EMOM à un mouvement et continu (distance, durée ; reps si données d'estimation), sous réserve de :
- parts d'énergie fournies ;
- données d'estimation au catalogue ;
- paramètres anti-doublon `crosstraining` au ruleset ;
- nouvel identifiant ;
- aucun levier ;
- pré-contrôle des contraintes et vérification d'identité après le pipeline.

Rien de chargé n'a été testé comme option, conformément au périmètre.

## G. Surface volontairement impossible après C2 (selon le plus petit C2)

- Toute séance **nouvelle** : calibrage (C3), progression (C4), première exposition et benchmarks (C5), charges, effort et technique (C6), semaine (C7).
- Mouvements chargés ou chargeables ; toute décision « load » (reportée avec HYROX).
- For time sans cap ; EMOM à plusieurs mouvements ; intervalles ; calories sans débit `cal_per_min`.
- Cibles d'effort ; nouveaux time caps ; densité EMOM.
- Séances réparées ou raccourcies par le CORE : refus, pas de « rejeu modifié ».
- Multisport, tant que le planificateur global n'existe pas.
- Stimulus sans séance réalisée admissible dans la fenêtre : refus (pas de première exposition).
- Toute séance issue d'un historique déclaratif, si l'option H.1-d retenue l'exclut.

## H. Dossier de décision experte (décisions C nécessaires à C2)

Aucune option n'est retenue ici. Aucune valeur n'est proposée : là où une option demande une valeur, elle est **à fournir par l'expert**.

### H.1 CT-D15 — rejeu

**H.1-a `ct.history.anchorPolicy`**
- **Option A — Rejeu strict de la dernière séance complétée du même stimulus.**
  - Déterministe, aucun choix.
  - Risque : rejoue toujours la même séance (stagnation, anti-doublon `accidental`).
- **Option B — Rejeu strict d'une séance complétée du même stimulus, choisie parmi celles de la fenêtre** (règle de choix à décider : la plus ancienne, rotation…).
  - Plus de variété ; exige une règle de choix supplémentaire (décision).
- **KEEP BLOCKED** : aucun C2.

**H.1-b `ct.history.recencyBand`**
- **Option A — Fenêtre fixe** (bornes **à fournir par l'expert**).
  - Simple ; non dérivable de S21 : décision assumée.
- **Option B — Pas de fenêtre fixe ; rejeu seulement si `returnState = NONE`** (la reprise relève alors de CT-G1).
  - Moins d'hypothèses chiffrées ; dépend entièrement de l'état de reprise **déclaré**. Risque : longue inactivité non déclarée.
- **KEEP BLOCKED**.

**H.1-c `ct.history.negativeResponse`**
- **Option A — Douleur déclarée (P1+) OU abandon ⇒ séance non rejouable.**
  - Aucun seuil numérique ; n'utilise pas le sRPE.
- **Option B — Option A + seuil de sRPE** (seuil **à fournir** ; moment de collecte à fixer, S11).
  - Plus sensible ; introduit une valeur non sourcée et la question de fiabilité (S11).
- **KEEP BLOCKED**.

**H.1-d `ct.history.completionCriterion` et preuve**
- **Option A — « Complété » = résultat terminal du format** (for time : `time` ≤ cap ; EMOM : toutes les minutes tenues ; AMRAP : non abandonné). **Continu exclu.** Enregistrement par l'application seulement.
  - Exige d'ajouter au contrat Cross-training : provenance (application vs saisie) et variante exécutée. Aucun changement CORE.
- **Option B — Même chose, saisies déclaratives acceptées.**
  - Plus d'historique disponible ; preuve plus faible.
- **Option C — A ou B, plus « Rx exigé »** (variante exécutée = prescrite).
  - Exclut les séances scalées ; exige le champ « variante exécutée ».
- **KEEP BLOCKED**.

### H.2 CT-D1 — sous-ensemble C2

**H.2-a `ct.stimulus.catalog`**
- **Option A — Taxonomie à 9 stimuli de la spec 06**, adoptée **comme décision de conception** (pas comme preuve).
- **Option B — Taxonomie réduite pour C2** (liste **à fournir**), le reste bloqué.
- **KEEP BLOCKED**.

**H.2-b `ct.stimulus.admissibleFormats`**
- **Option A — Table décidée par stimulus**, limitée aux formats de D.4 rejouables.
- **Option B — Pour C2 seulement : le format admissible est celui de la séance réalisée** (le rejeu ne choisit aucun format).
  - Moins d'hypothèses ; la table reste à décider pour C3.
- **KEEP BLOCKED**.

**H.2-c `ct.stimulus.intensityBand`** (exigé par l'empreinte du CORE)
- **Option A — Bande par stimulus décidée par l'expert.**
- **Option B — Parts d'énergie dérivées de la séance réalisée** (règle de dérivation **à écrire**, par exemple à partir du sRPE).
  - Transforme une mesure en intensité prévue : dérivation à justifier (classe B seulement si écrite et reproductible).
- **KEEP BLOCKED** : le CORE refuse toute proposition.

### H.3 CT-D2 — données d'estimation (sans construction de dose)
- **Option A — Débits décidés par l'expert pour chaque mouvement rejouable**, clairement marqués ESTIMATION.
  - Ouvre for time et continu.
- **Option B — C2 limité aux formats à durée fixe (AMRAP, EMOM à un mouvement)** : le catalogue doit quand même porter une donnée d'estimation (valeur sans effet sur la durée, démontré par F-4).
  - Le moins d'hypothèses de valeur, mais une donnée non décidée resterait au catalogue.
  - Politique à assumer explicitement ; sinon cette option n'est pas conforme à « aucune constante implicite ».
- **KEEP BLOCKED** : C2 impossible (tout item exige une donnée, F-7).

### H.4 CT-G1 — politiques de sécurité
- **Option A — Rejeu exclu pour les novices et en reprise** (`returnState ≠ NONE`).
  - Politique signée ; C2 réservé aux non-novices sans coupure déclarée.
- **Option B — Rejeu autorisé aux novices, reprise exclue.**
  - Élargit ; le risque S19 (volume nouveau) est plus faible pour une séance déjà réalisée, mais il n'est pas nul.
- **`ct.safety.novelEccentricVolume`** : pour un rejeu, le mouvement n'est pas nouveau par définition. La politique peut déclarer « sans objet pour le rejeu » (décision) ou fixer une règle.
- **KEEP BLOCKED** : bloque tout.

### H.5 CT-D6 (écart B.0-1) — plafonds et socle
- **Option A — Décider les plafonds** (valeurs **à fournir**). Le socle reste inchangé.
  - Aucune source chiffrée (D pour les valeurs) : décision de prudence.
- **Option B — Pour le rejeu strict, retirer les plafonds du socle**, avec justification écrite (la prescription a déjà été complétée sans retour négatif).
  - Modifie la définition des capacités (code C2).
  - Risque : S19 montre qu'une séance menée à terme peut avoir été nocive ; le filtre repose alors entièrement sur `negativeResponse`.
- **Option C — Plafond fixé à la valeur déjà réalisée par l'athlète** (aucune valeur générique).
  - Équivaut à « pas plus que ce qui a été fait ». Un rejeu strict le satisfait par construction ; utile surtout pour C3 et au-delà.
- **KEEP BLOCKED** : C2 impossible en l'état du code.

## I. Limites de recommandation

Identifications seulement, **aucune n'est une décision** :

- **Option la plus conservatrice techniquement** :
  - H.1-a A, H.1-b B, H.1-c A, H.1-d A ;
  - H.2-b B ;
  - H.3 A (pas de donnée non décidée au catalogue) ;
  - H.4 A ;
  - H.5 C ;
  - C2 limité à AMRAP, for time avec cap, EMOM à un mouvement, continu distance / durée ;
  - mono-sport ; refus de toute séance réparée.
- **Option avec le moins d'hypothèses chiffrées** :
  - H.1-b B et H.1-c A (aucun nombre) ;
  - H.2-b B ;
  - H.5 C.

  Restent nécessairement des décisions sans preuve : les débits (H.3, si for time ou continu) et la bande d'intensité (H.2-c).
- **Capacités ouvertes** : H.1 à H.5 ouvrent **uniquement** `ctReplayHold` et le socle. Aucune option de ce gate n'ouvre le calibrage, la progression, la première exposition, les charges, l'effort, les benchmarks, la semaine ou le multisport.
- **Hors CT-D, à trancher séparément** :
  - C2 en **simulation seulement** ou éligible à la **production** ;
  - C2 **moteur seulement**, ou connecté à l'application (enregistrement des séances réalisées Cross-training, aujourd'hui absent).

**STOP.** C2 n'est pas codé. CORE, Running et Strength sont inchangés. C3–C7, HYROX et le planificateur global ne sont pas commencés.
