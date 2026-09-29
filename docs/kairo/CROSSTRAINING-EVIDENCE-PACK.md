# Cross-training : dossier de preuve et de décision (revue C1)

**Statut : pour revue.** Ce dossier ne change **aucune** valeur du registre. Les 31 paramètres de `packages/crosstraining/src/governance/registry.ts` restent `UNRESOLVED`. Une valeur n'entre dans le registre que par une décision tracée (maturité, approbation, référence à ce dossier).

## 0. Méthode et limites

### Règles appliquées
- Chaque paramètre est classé :
  - **(a) soutenu** directement par une source ;
  - **(b) dérivé / calculé** à partir d'une source soutenue, avec une dérivation écrite ;
  - **(c) décision** experte ou produit ;
  - **(d) non résolu**.
- Une recommandation de **population** (ex. ACSM) n'est jamais convertie en prescription **individuelle** sans dérivation justifiée. Aucune dérivation de ce type n'est proposée ici.
- Les exemples de programmation CrossFit / HYROX ne valident **aucun** paramètre. Ils ne sont pas cités comme preuve.
- Hiérarchie retenue :
  1. consensus et position stands ;
  2. revues systématiques et méta-analyses ;
  3. études primaires évaluées par les pairs ;
  4. revues narratives.

### Niveau de vérification (limite importante)
La politique réseau de l'environnement bloque les sites des articles : PubMed, PMC, Springer, PLOS, MDPI, Crossref. La vérification a donc été faite **au niveau du résumé**, par des résultats de recherche. **Aucun texte intégral n'a été lu.**

Conséquences :
- chaque source porte un niveau de vérification (`V-ABS` : résumé ou notice ; `V-CIT` : citation bibliographique seulement) ;
- **aucune valeur chiffrée** n'est proposée à partir d'un résumé seul ;
- un chiffre dont l'attribution entre plusieurs articles est incertaine est signalé et **n'est pas utilisé** ;
- avant toute décision qui s'appuie sur une source, l'expert doit lire le texte intégral.

## 1. Registre des sources

Colonnes : population · statut d'entraînement · intervention · résultat · limites · applicabilité à KAIRO.

### S1 — Feito et al. 2018, *Sports* 6(3):76. Définition du HIFT (article de définition et de recherche) · `V-ABS`
- **Contenu** : le HIFT est « un style d'entraînement qui incorpore des mouvements fonctionnels variés, réalisés à haute intensité (**relative aux capacités de l'individu**), pour améliorer la condition physique générale et la performance ». Durées d'activité variées, avec ou sans repos. Distinct du HIIT.
- **Population / intervention / résultat** : sans objet (définition).
- **Limites** : pas de données empiriques de dose.
- **Applicabilité** : cadre de vocabulaire pour CT-D1. L'intensité est définie comme **relative à l'individu**, ce qui interdit une intensité absolue commune. Ne fixe ni stimulus, ni domaine de temps, ni format.

### S2 — Revue systématique avec méta-analyse, HIFT chez des individus en bonne santé (*BMC Public Health*, 2025) · `V-ABS`
- **Population** : 19 études, 911 participants en bonne santé.
- **Intervention** : programmes HIFT. Durées, fréquences et formats non vérifiés (texte intégral non lu).
- **Résultat** : effets positifs sur force, puissance, vitesse, endurance, agilité. Réponse d'endurance possiblement plus forte chez les femmes, contre un groupe contrôle sans exercice.
- **Limites** : hétérogénéité des programmes probable. Aucune relation dose-réponse vérifiée.
- **Applicabilité** : soutient l'**intérêt** du Cross-training, pas un paramètre de dose.

### S3 — Revue systématique avec méta-analyse, HIFT chez des athlètes (*PLOS ONE*, 2023, et correctif 2024) · `V-ABS`
- **Population** : 13 études, 478 athlètes de 10 à 24,5 ans.
- **Intervention** : HIFT ajouté à l'entraînement sportif.
- **Résultat** : effets petits à grands sur force, puissance, souplesse et performance spécifique. **Aucun effet significatif** sur l'endurance et l'agilité.
- **Limites** : population jeune et sportive. Un correctif a été publié (contenu non lu).
- **Applicabilité** : faible pour l'adulte récréatif de KAIRO. Aucun paramètre.

### S4 — ACSM Position Stand, Garber et al. 2011, *MSSE* 43(7):1334-59 · `V-ABS`
- **Population** : adultes apparemment en bonne santé.
- **Contenu** :
  - cardio d'intensité modérée ≥ 30 min/j, ≥ 5 j/sem (≥ 150 min/sem), **ou** vigoureuse ≥ 20 min/j, ≥ 3 j/sem (≥ 75 min/sem), ou une combinaison (≥ 500–1000 MET·min/sem) ;
  - un programme régulier inclut cardio, résistance, souplesse et neuromoteur.
- **Limites** : recommandation de **santé publique**, par semaine, pour une population.
- **Applicabilité** : **aucune dérivation vers une dose de séance.** Le document peut servir de repère produit hebdomadaire au planificateur global (hors périmètre), jamais de dose Cross-training.

### S5 — ACSM Position Stand 2009, *Progression models in resistance training for healthy adults* · `V-ABS`
- **Contenu** : augmenter la charge de **2 à 10 %** (moins pour les petits groupes musculaires, plus pour les grands) quand l'individu réalise **1 à 2 répétitions au-delà** de l'objectif sur **deux séances consécutives**.
- **Population** : adultes en bonne santé, **musculation**.
- **Limites** : séries classiques, pas de mouvements chargés intégrés à un metcon.
- **Applicabilité** : candidate pour CT-D5 et CT-D12, **seulement par une dérivation que l'expert doit écrire** (transposition d'un contexte de séries à un contexte de fatigue métabolique). Classé **(c)**.

### S6 — Buchheit & Laursen 2013, *Sports Med* 43(5):313-38. HIIT, Part I : accent cardio-pulmonaire (revue narrative) · `V-ABS`
- **Contenu** : programmation du HIIT par manipulation travail / récupération, choix du mode d'exercice, référence au temps passé près de VO₂max. Part II : anaérobie et charge neuromusculaire.
- **Population** : surtout des athlètes de sports d'endurance et collectifs.
- **Limites** : revue narrative. Modes cycliques (course, vélo), non multimodaux.
- **Applicabilité** : cadre conceptuel pour `ct.stimulus.workRestRatios` et `ct.intensity.*`. **Aucun rapport chiffré transposable** sans dérivation. Les mouvements multimodaux ne sont pas des modes cycliques.

### S7 — Milanović, Sporiš & Weston 2015, *Sports Med*. Méta-analyse HIT vs endurance continue sur VO₂max · `V-ABS`
- **Population** : adultes sains de 18 à 45 ans, essais contrôlés d'au moins 2 semaines.
- **Résultat** : les deux méthodes augmentent VO₂max. La **comparaison** HIT vs continu est rapportée différemment selon les sources secondaires : **non vérifiée**, non utilisée.
- **Applicabilité** : contexte pour les stimuli `aerobic_capacity` et `anaerobic_intervals`. Aucun paramètre.

### S8 — Tabata et al. 1996, *MSSE* 28(10):1327-30 · `V-ABS`
- **Population** : jeunes hommes. Expérience 2 : n = 7.
- **Intervention** : ergocycle, 7 à 8 × 20 s à ~170 % de VO₂max, 10 s de repos, 5 j/sem, 6 semaines. Comparée à un entraînement continu à 70 % de VO₂max.
- **Résultat** : hausse des capacités aérobie et anaérobie avec le protocole intermittent.
- **Limites** :
  - échantillon minuscule ;
  - intensité **supra-maximale sur ergomètre** ;
  - un « Tabata » de salle avec des mouvements multimodaux n'en reproduit pas l'intensité.
- **Applicabilité** : **n'établit pas** l'exclusion des novices (règle de la spec 06), ni aucun paramètre multimodal. L'exclusion novice reste une politique **G1 à signer (c)**.

### S9 — Foster et al. 2001, *JSCR* 15(1):109-15. Méthode du sRPE · `V-ABS`
- **Population / intervention** :
  - cyclisme stable et intermittent ;
  - basket-ball.
- **Résultat** : charge sRPE (durée × RPE de séance) cohérente avec une méthode fondée sur la FC. Score absolu plus élevé en basket-ball.
- **Limites** : l'échelle est une CR10 modifiée (0–10). Détail de l'échelle et de la collecte non relu en texte intégral.
- **Applicabilité** : **mesure de résultat / surveillance** (champ `sessionRpe` du contrat de séance réalisée). **Ce n'est pas une cible de prescription.**

### S10 — Borg 1982, *MSSE*. Bases psychophysiques de l'effort perçu (échelle CR10) · `V-ABS`
- **Contenu** : échelle catégorie-ratio. L'échelle originale admet des valeurs au-delà de 10.
- **Applicabilité** : définition de l'échelle. KAIRO borne `sessionRpe` à 0–10 (convention sRPE de S9). Ce choix est **à confirmer (c)**, car la CR10 originale n'est pas bornée à 10.

### S11 — sRPE en HIFT : deux études de validité (*Sports* 2018, 6(3):84 et 6(3):68) · `V-ABS`
- **Population** : pratiquants de HIFT.
- **Résultat** :
  - le sRPE est valide contre des mesures fondées sur la FC (TRIMP d'Edwards), aux niveaux individuel, groupe et sexe ;
  - l'effort perçu relevé 30 min après l'exercice est plus bas qu'à 0, 10 et 20 min.
- **Limite rapportée** : **faible fiabilité** de la capacité des pratiquants à faire correspondre leur RPE à l'effort physiologique relatif (% FCmax).
- **Applicabilité** :
  - soutient le sRPE comme **mesure** de charge interne **(a)** ;
  - la limite de fiabilité **s'oppose** à l'usage du RPE comme **cible** de prescription fine sans décision experte (CT-D9) ;
  - le moment de collecte doit être fixé **(c)**.

### S12 — Smith, Bellissimo & Amorim 2025, *Front. Physiol.* EMOM vs RFT à volume égal · `V-ABS`
- **Population** : 12 pratiquants **entraînés** (6 hommes, 6 femmes).
- **Intervention** : 5 tours de 5 power cleans, 8 tractions kipping, 6 thrusters haltères et 10 burpees, en EMOM et en RFT, volume total égal.
- **Résultat** :
  - RFT plus stressant que l'EMOM : FC, VO₂ pendant et après, RPE, lactate ;
  - créatine kinase à 24 h **sans différence** entre les deux formats ;
  - les deux formats sont « vigoureux » (77–95 % de FCmax, 64–90 % de VO₂max).
- **Limites** : réponses **aiguës**, petit échantillon, pratiquants entraînés, une seule séance-type.
- **Applicabilité** : soutient **qualitativement** que le format change la charge aiguë à volume égal **(a, aigu, entraînés)**. Ne fixe **aucune densité EMOM** (CT-D8) et aucun domaine de temps.

### S13 — Barba-Ruíz et al. 2024, *Front. Physiol.* AMRAP vs EMOM vs RFT · `V-ABS`
- **Population** : 12 pratiquants (10 hommes, 2 femmes, 31,5 ± 6,7 ans), au moins 1 an d'expérience.
- **Intervention** : squat, tractions et développé, 10 répétitions, trois configurations travail / repos.
- **Résultat** :
  - vitesse propulsive moyenne plus basse en AMRAP ;
  - perte de vitesse intra-série maximale en RFT, minimale en EMOM ;
  - FC différente entre les trois formats.
- **Limites** : aigu, petit échantillon, surtout des hommes.
- **Applicabilité** : même portée que S12 (qualitatif, aigu). Aucun paramètre.

### S14 — chiffres EMOM vs RFT sans attribution certaine · **non utilisé**
- **Chiffres** : lactate 6,5 vs 11,2 mmol/L, RPE 4 vs 7, FC 153 vs 171 bpm.
- **Problème** : le résumé de recherche les associe à l'une des études S12, S13 ou PeerJ 2025 (« designs à charge égale, novices et expérimentés »). L'attribution n'a pas pu être vérifiée.

### S15 — Durée d'un AMRAP : 5 vs 15 min (*Sports* 2025, 13(6):156) · `V-ABS`
- **Intervention** : même circuit (rameur, thrusters, box jumps) en 5 ou 15 minutes.
- **Résultat** :
  - à 5 min, la performance est surtout liée aux capacités de rameur ;
  - à 15 min, elle est surtout liée à l'expérience et à la composition corporelle.
- **Applicabilité** : soutient qu'un **domaine de temps change les déterminants** **(a, étroit)**. Ne fixe **aucune borne** de domaine (CT-D1).

### S16 — Brisebois, Rigby & Nichols 2018, *Sports* 6(4):146 · `V-ABS`
- **Population** : 14 adultes **inactifs** (4 hommes, 10 femmes), sans expérience du HIFT.
- **Intervention** : HIFT 3 j/sem pendant 8 semaines.
- **Mesures** : FC de repos, pression artérielle, VO₂max, composition corporelle, force et endurance.
- **Limites** : petit échantillon, pas de groupe contrôle vérifié. Résultats chiffrés non relus.
- **Applicabilité** : montre qu'un programme **supervisé** a été mené chez des inactifs. **Aucune dose d'entrée transposable** (CT-D4).

### S17 — HIFT 6 semaines, volumes et fréquences différents (*IJERPH* 2020) · `V-ABS`
- **Population** : 31 pratiquants (14 hommes, 17 femmes), groupe volume et fréquence élevés (n = 17) vs modérés (n = 14).
- **Mesures** : saut, sprint 20 m, préhension. Charge interne mesurée par sRPE, monotonie et contrainte.
- **Résultat** : **aucune amélioration** dans l'un ou l'autre groupe. Le volume et la fréquence ne semblent pas influencer ces mesures.
- **Applicabilité** : prudence contre toute règle « plus de volume = mieux ». Aucun paramètre.

### S18 — Blessures en HIFT : revue systématique avec méta-analyse (PubMed 35278328) et autres revues · `V-ABS`
- **Résultats rapportés par le résumé de recherche** :
  - 4,3 blessures / 1000 h au total, 9,9 / 1000 h dans les cohortes prospectives ;
  - étendue de 0,04 à 18,9 selon les études ;
  - prévalence de 36 % ;
  - sièges les plus fréquents : épaule, dos, genou.
- **Attribution** : le résumé mélange plusieurs revues. L'attribution exacte de chaque chiffre est **à vérifier**.
- **Applicabilité** :
  - contexte de risque, comparable à d'autres sports récréatifs selon les auteurs ;
  - **aucun plafond numérique** n'en découle (CT-D6) ;
  - l'épaule et le rachis sont des localisations fréquentes, ce qui pèse dans la priorité de revue des mouvements au-dessus de la tête et chargés sur l'axe.

### S19 — Rhabdomyolyse après HIFT : revue systématique (*Apunts Sports Medicine*, 2024) · `V-ABS`
- **Nature des données** : surtout des **cas rapportés** (niveau de preuve faible).
- **Résultat** :
  - atteinte des membres supérieurs dans 63 % des cas ;
  - patients de 20 à 40 ans surtout ;
  - cause probable : un entraînement mal structuré, avec de nombreuses répétitions de pompes et de tractions.
- **Facteurs de risque généraux de la rhabdomyolyse d'effort** (source de revue associée) : déshydratation, inactivité récente, chaleur, compléments.
- **Applicabilité** : soutient **qualitativement** `ct.safety.novelEccentricVolume` et `ct.safety.repsPerMovementCap` **(a, qualitatif)**. Les **seuils** restent **(d)**.

### S20 — Impellizzeri et al. 2020, *IJSPP* 15(6):907. Limites de l'ACWR · `V-ABS`
- **Contenu** : aucune preuve pour utiliser l'ACWR dans la gestion de charge ou pour réduire le risque de blessure. Propriétés statistiques problématiques.
- **Applicabilité** : **exclut** l'ACWR comme règle de progression ou de tolérance (CT-D5, CT-D15). Argument **contre** une dérivation.

### S21 — Mujika & Padilla 2000, *Sports Med* 30:79-87. Désentraînement à court terme (< 4 semaines) · `V-ABS`
- **Contenu** : perte partielle ou complète des adaptations quand le stimulus devient insuffisant. La force est en général maintenue jusqu'à 4 semaines d'inactivité, avec des exceptions (force excentrique chez les très entraînés, force isocinétique récemment acquise).
- **Applicabilité** : contexte pour `ct.return.protocol` et `ct.history.recencyBand`. Le texte décrit une **perte d'adaptation**, pas une **fenêtre sûre de ré-exposition** : une fenêtre de récence n'en est **pas dérivable** sans décision.

### S22 — Débits de mouvement (reps, calories ou mètres par minute) par niveau · **aucune source trouvée**
- La recherche n'a trouvé **aucune norme publiée** de débit par mouvement et par niveau pour les mouvements multimodaux.
- Seule existe une référence de test de terrain (burpee test de 3 min), sans rapport avec une norme de débit.

## 2. Classement des paramètres

Chaque `reviewRef` du registre (`…EVIDENCE-PACK.md#ct-dN`) renvoie aux lignes de la décision CT-DN ci-dessous.

Légende : **a** soutenu · **b** dérivé · **c** décision · **d** non résolu. Aucun paramètre n'est **a** ou **b** au niveau d'une **valeur** : seules certaines **règles qualitatives** le sont.

### Priorité 1 : CT-D1, CT-D2, CT-D3, CT-D8, cibles d'effort (CT-D9), rejeu (CT-D15)

| Paramètre | Catégorie | Classe | Sources | Ce qui est soutenu | Ce qui reste à décider |
|---|---|---|---|---|---|
| `ct.stimulus.catalog` | CLASSIFICATION | **c** | S1, S6, S12, S15 | Le HIFT est multimodal, d'intensité relative à l'individu (S1). Le format et la durée changent la réponse aiguë et les déterminants (S12, S13, S15) | Liste des stimuli, et définition de chaque stimulus par son intention physiologique. La taxonomie de la spec 06 est une hypothèse de conception |
| `ct.stimulus.admissibleFormats` | CLASSIFICATION | **c** | S12, S13 | À volume égal, l'EMOM impose une charge aiguë moindre que le RFT, et l'AMRAP réduit la vitesse d'exécution (aigu, entraînés) | Table stimulus → formats. La littérature ne relie aucun format à une adaptation chronique |
| `ct.stimulus.timeDomains` | PRESCRIPTION | **d → c** | S15 | 5 et 15 min ne sollicitent pas les mêmes déterminants | Toutes les bornes. Aucune source ne fixe de domaine de temps par stimulus |
| `ct.stimulus.intensityBand` | CLASSIFICATION | **c** | S1, S6 | Intensité relative (S1) | Correspondance stimulus → bande E5 |
| `ct.stimulus.workRestRatios` | PRESCRIPTION | **c** | S6, S8 | Rapports documentés pour le HIIT cyclique (S6) et un protocole supra-maximal (S8) | Transposition au multimodal **non justifiée** sans dérivation experte écrite |
| `ct.estimation.workRates` (ESTIMATION) | ESTIMATION | **d** | S22 | Aucune norme publiée | Origine des débits : mesure (données réalisées de l'utilisateur, **par athlète**, **b** si la méthode est décidée) ou estimation experte (**c**). Les fixtures du catalogue de test sont **exclues** |
| `ct.dose.construction` (PRESCRIPTION) | PRESCRIPTION | **c** | — | — | Si et comment une dose prescrite peut être dérivée d'un débit d'**estimation**. Par défaut, **aucune** dérivation : les deux concepts restent séparés (§3) |
| `ct.format.timeCapMargin` | PRESCRIPTION | **c** | — | Aucune source | Règle produit / experte (marge sur l'estimation lente) ; le time cap est une borne de structure et de sécurité |
| `ct.format.emomDensity` | PRESCRIPTION | **d → c** | S12, S13 | L'EMOM laisse une récupération intra-minute qui réduit la charge aiguë | La fraction maximale de travail par minute. L'hypothèse « 40–45 s » de la spec **n'a aucune source** |
| `ct.intensity.effortTargetByStimulus` | PRESCRIPTION | **c** | S9, S10, S11 | Le sRPE est une **mesure** valide de la charge interne en HIFT (S11) | Une **cible** d'effort par stimulus. S11 rapporte une faible fiabilité de la correspondance RPE ↔ effort physiologique, ce qui s'oppose à une cible fine. Cadre CORE-EXT-C1 (§ compatibilité) |
| `ct.history.anchorPolicy` | HISTORY | **c** | S20 | L'ACWR est exclu (S20) | Rejouer une séance réalisée (HOLD) n'augmente pas la dose : c'est l'option au risque le plus faible, mais c'est un **raisonnement**, pas une preuve. Décision produit + experte |
| `ct.history.recencyBand` | HISTORY | **c** | S21 | Désentraînement < 4 semaines : le plus souvent partiel | Fenêtre de récence. Non dérivable de S21 (perte d'adaptation ≠ sécurité de ré-exposition) |
| `ct.history.negativeResponse` | HISTORY | **c** | S9, S11, S19 | Le sRPE, la douleur déclarée et la non-complétion sont mesurables | Définition du retour négatif (quels signaux, quels seuils) |
| `ct.history.completionCriterion` | RESULT | **c** | — | Définitionnel (§3) | « Terminé comme prescrit » : dans le cap, sans scaling, sans abandon. Décision produit |

### Autres décisions

| Paramètre | Classe | Sources | Note |
|---|---|---|---|
| `ct.firstExposure.byStimulus` (CT-D4) | **d** | S4, S16 | S4 est une recommandation de population ; S16 est un programme supervisé chez des inactifs, sans dose détaillée relue. Aucune dose d'entrée n'en découle |
| `ct.progression.magnitude` / `toleranceRule` (CT-D5) | **c** | S5, S17, S20 | S5 (2–10 %, +1–2 répétitions sur deux séances) vaut pour la musculation. Toute transposition doit être une dérivation écrite. S20 exclut l'ACWR. S17 : plus de volume n'a rien amélioré en 6 semaines |
| `ct.safety.repsPerMovementCap`, `jumpContactsCap` (CT-D6) | **a** (qualitatif) / **d** (valeur) | S18, S19 | Risque lié aux hauts volumes de répétitions du haut du corps (cas rapportés). Aucun seuil |
| `ct.safety.technicalUnderFatigue` (CT-D7) | **c** | S13, S18 | La vitesse d'exécution chute en AMRAP (S13) ; les épaules et le dos sont des sièges fréquents de blessure (S18). Seuil à décider |
| `ct.hi.classification`, `ct.week.stimulusDistribution` (CT-D10) | **c** | S4, S12 | S4 est hebdomadaire et de santé publique : ce n'est pas un plafond de haute intensité |
| `ct.hybrid.policy` (CT-D11) | hors périmètre | — | Planificateur global. Le moteur Cross-training refuse (HYBRID_PLANNER_UNAVAILABLE) |
| `ct.load.implementStandards`, `percentE1rmByStimulus` (CT-D12) | **c** | S5 | Standards d'implément = décision produit. % d'e1RM : aucune source multimodale |
| `ct.scaling.rules` (CT-D13) | **c** | S1 | Le principe d'intensité relative (S1) justifie l'existence du scaling, pas ses tables |
| `ct.benchmark.set` / `cadence` (CT-D14) | **c** | — | Les benchmarks sont des repères de **performance**, jamais une dose |
| `ct.safety.novicePolicy` (CT-G1) | **c** (signature G1) | S8, S16 | S8 n'établit pas l'exclusion des novices ; c'est une politique de prudence à signer |
| `ct.return.protocol` (CT-G1) | **c** (signature G1) | S21 | Contexte seulement |
| `ct.safety.novelEccentricVolume` (CT-G1) | **a** (qualitatif) / **d** (valeur) | S19 | Mouvement nouveau, volume élevé, excentrique (pompes, tractions) : risque rapporté en cas cliniques |

## 3. Trois concepts à ne jamais confondre

| Concept | Définition | Où il vit | Paramètre(s) | Exemple |
|---|---|---|---|---|
| **Estimation** | Débit **interne** d'un mouvement, pour estimer une durée (p50 / p90). Jamais montré ni prescrit | Catalogue (`workRate`) lu par le DurationEngine du CORE | `ct.estimation.workRates` (source des valeurs du catalogue Cross-training) | « un athlète intermédiaire fait environ N wall balls par minute » |
| **Prescription** | Ce que l'athlète **doit faire** : reps, calories, mètres, durée, charge, cible d'effort | Séance du CORE (item, bloc) | `ct.dose.construction`, `ct.stimulus.timeDomains`, `ct.format.*`, `ct.load.*`, `ct.intensity.*` | « 3 tours : 15 wall balls 6 kg, 12 cal rameur ; time cap 12 min » |
| **Résultat** | Ce qui a été **mesuré** : temps, rounds + reps, minutes tenues, calories ou distance totales, sRPE, douleur | Séance réalisée (contrat `zRealizedCtSession` : `prescription` et `result` séparés) | `ct.history.completionCriterion` (règle de comparaison seulement) | « 9:42 » · « 5 tours + 3 reps » · « capped à 84 reps » |

### Règles
- Un débit d'estimation ne sert **jamais** directement à calculer une dose prescrite. Si une telle dérivation est décidée, elle passe par `ct.dose.construction`, un paramètre distinct, décidé et tracé.
- Un résultat mesuré ne devient une **référence** que par une règle décidée (`ct.history.*`). Il ne devient jamais un débit d'estimation par défaut.
- Le même nombre (ex. calories) peut apparaître dans les trois rôles, mais sous trois champs de trois objets différents. Le contrat de contexte refuse les champs croisés (test `context.test.ts`).

## 4. Population → athlète

Aucune source de ce dossier ne permet de dériver une prescription **individuelle** :
- S4 et S5 sont des recommandations de population, dont une pour la musculation ;
- S12, S13 et S15 sont des réponses aiguës moyennes de petits groupes entraînés ;
- S2 et S3 sont des effets moyens de programmes hétérogènes.

La seule voie individuelle admissible sans nouvelle preuve est le **rejeu de ce que l'athlète a lui-même réalisé** (CT-D15). C'est une décision **(c)**, d'où la priorité de C2 dans le plan.

## 5. Questions pour l'expert (décisions minimales pour débloquer C2, puis C3)

1. **CT-D15 (débloque C2)** :
   - le rejeu strict d'une séance réalisée, terminée dans le cap, sans douleur, est-il accepté comme source de dose ;
   - quelle fenêtre de récence ;
   - quel critère de complétion ;
   - quel retour négatif.
2. **CT-D1** :
   - liste des stimuli ;
   - formats admissibles par stimulus ;
   - domaines de temps (bornes décidées, **sans** source quantitative disponible).
3. **CT-D2** :
   - origine des débits d'estimation (mesures propres à KAIRO, jugement expert, ou données de l'athlète) ;
   - la dose prescrite peut-elle être construite à partir des débits (`ct.dose.construction`) ?
4. **CT-D3 / CT-D8** : marge du time cap ; densité EMOM (l'hypothèse 40–45 s n'a pas de source).
5. **CT-D9** : cible d'effort ou effort **mesuré seulement** (S11 plaide pour la seconde option en V1).
6. **CT-G1** : exclusions novice, reprise, volume excentrique nouveau.

## 6. Sources (liens des notices consultées)

- S1 : [Feito et al. 2018](https://digitalcommons.kennesaw.edu/facpubs/4262/)
- S2 : [BMC Public Health 2025](https://link.springer.com/article/10.1186/s12889-025-21538-5)
- S3 : [PLOS ONE 2023](https://pubmed.ncbi.nlm.nih.gov/38064433/)
- S4 : [Garber 2011](https://pubmed.ncbi.nlm.nih.gov/21694556/)
- S5 : [ACSM 2009](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/)
- S6 : [Buchheit & Laursen 2013](https://pubmed.ncbi.nlm.nih.gov/23539308/)
- S7 : [Milanović 2015](https://pubmed.ncbi.nlm.nih.gov/26243014/)
- S8 : [Tabata 1996](https://www.semanticscholar.org/paper/Effects-of-moderate-intensity-endurance-and-on-and-Tabata-Nishimura/5f90dcc82933b2300a47d6acb859d74089a25e0c)
- S9 : [Foster 2001](https://pubmed.ncbi.nlm.nih.gov/11708692/)
- S10 : [Borg 1982](https://pubmed.ncbi.nlm.nih.gov/7154893/)
- S11 : [sRPE en HIFT](https://pubmed.ncbi.nlm.nih.gov/30134535/)
- S12 : [Smith et al. 2025](https://pubmed.ncbi.nlm.nih.gov/40007896/)
- S13 : [Barba-Ruíz 2024](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2024.1358191/full)
- S15 : [Sports 2025](https://doi.org/10.3390/sports13060156)
- S16 : [Brisebois 2018](https://pubmed.ncbi.nlm.nih.gov/30428527/)
- S17 : [IJERPH 2020](https://pubmed.ncbi.nlm.nih.gov/32825378/)
- S18 : [Blessures en HIFT](https://pubmed.ncbi.nlm.nih.gov/35278328/)
- S19 : [Rhabdomyolyse et HIFT](https://www.sciencedirect.com/science/article/pii/S2666506924000154)
- S20 : [Impellizzeri 2020](https://pubmed.ncbi.nlm.nih.gov/32502973/)
- S21 : [Mujika & Padilla 2000](https://www.semanticscholar.org/paper/Detraining:-Loss-of-Training-Induced-Physiological-Mujika-Padilla/976e67d8710929b988ba84e15d4b1c10e4b09420)
