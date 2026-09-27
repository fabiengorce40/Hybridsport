# RUNNING-V1-REFERENCE-MODEL — références, confiance et cibles

> **Phase 5A, spécification seulement** (aucun code). Sections couvertes : E (références), F (hiérarchie), G (critical speed), K (modèle de cible), Z (confiance de prescription). Sources : voir [`RUNNING-EVIDENCE-REVIEW-PACK.md`](RUNNING-EVIDENCE-REVIEW-PACK.md). Niveau maximal de vérification : **SEARCH_SUMMARY**.

**Règle 1.** Le moteur ne fabrique **jamais** une allure quand les données sont insuffisantes. Sans référence exploitable, la cible est exprimée en effort perçu (et en FC si elle est disponible et étalonnée), et la confiance de prescription vaut LOW.

**Règle 2.** Une référence alimente le **modèle de performance**. Elle ne devient une cible de séance que par une décision de prescription tracée (voir domain spec §B.1).

---

## E. Modèle de références

### E.1 Champs communs d’une `RunningReference`

| Champ | Contenu | Obligatoire | Remarque |
|---|---|---|---|
| `type` | Un des types de §E.2 | oui | |
| `value` | Valeur mesurée ou déclarée | oui | Temps, vitesse, FC, RPE… |
| `unit` | Unité (s, m/s, s/km, bpm, échelle RPE…) | oui | Unités SI en interne |
| `distance` | Distance de l’effort | si pertinent | |
| `duration` | Durée de l’effort | si pertinent | |
| `date` | Date de la mesure | oui | La récence en dépend |
| `protocol` | Protocole (course officielle, contre-la-montre solo, test à paliers, CS à 2 ou 3 essais…) | oui (ou `UNKNOWN`) | |
| `source` | `USER_ENTRY`, `IMPORT`, `LAB_REPORT`, `COACH`, `ENGINE_OBSERVATION` | oui | |
| `specificity` | Proximité avec la décision visée (distance, durée, terrain) | calculée **par décision** | Pas une propriété fixe de la référence |
| `reliability` | Fiabilité propre du protocole et de la mesure | oui | Ordinale : LOW / MEDIUM / HIGH |
| `confidence` | `RunningReferenceConfidence` **pour une décision donnée** | calculée | §F |
| `conditions` | Terrain, dénivelé, chaleur, vent, surface, état de forme, si connus | facultatif | Non corrigés automatiquement en V1 |

### E.2 Types de référence

| Type | Description | Ce qu’il informe le mieux | Limites | Fiabilité typique (hypothèse) |
|---|---|---|---|---|
| `RECENT_RACE_RESULT` | Temps de course officielle récente | Performance à cette distance ; capacité à la même distance | Conditions, parcours, stratégie ; spécificité faible pour une distance éloignée | HIGH si récente et à distance proche |
| `RECENT_TIME_TRIAL` | Contre-la-montre solo récent | Performance à la distance du test | Motivation, allure solo, mesure de distance | MEDIUM à HIGH |
| `CRITICAL_SPEED_TEST` | Plusieurs efforts maximaux de durées différentes, modélisés | CS et D’ (§G) | Aucun consensus sur le protocole ni le modèle optimal (scoping review 2026) | MEDIUM ; dépend du protocole |
| `MULTI_DISTANCE_PERFORMANCE_MODEL` | Modèle ajusté sur plusieurs performances (relation vitesse–durée, équivalences) | Estimation à une distance non courue | Hypothèse de modèle ; extrapolation au-delà des distances observées | Selon le nombre, la récence et l’accord des performances |
| `LAB_THRESHOLD` | LT1 / LT2 / VT1 / VT2 / MLSS mesurés en laboratoire | Frontières de domaines | Méthode et définition du seuil ; vitesse sur tapis ≠ sur route ; rare | HIGH pour la frontière mesurée, avec sa définition |
| `FIELD_THRESHOLD` | Estimation de seuil sur le terrain (test de durée fixe, test à paliers) | Frontière 2 approximative | Validité variable selon le protocole (Jamnick 2020 : pas de cadre consensuel) | LOW à MEDIUM |
| `VMA_TEST` | Test de vitesse maximale aérobie (paliers, piste) | Capacité aérobie maximale ; borne du domaine sévère | Dépend du protocole ; ne donne pas la frontière 2 | MEDIUM |
| `VO2MAX_TEST` | VO2max mesuré en laboratoire | Capacité aérobie maximale | Ne donne pas directement une allure ; l’économie varie entre individus | HIGH pour VO2max ; LOW pour prescrire une allure |
| `RECENT_TRAINING_PERFORMANCE` | Séances réalisées (allures tenues, RPE, FC) | Tolérance actuelle ; confirmation ou infirmation d’une référence | Effort sous-maximal : ce n’est pas une performance maximale | LOW à MEDIUM ; plusieurs observations concordantes nécessaires |
| `USER_DECLARED_REFERENCE` | Temps ou allure déclaré sans preuve | Point de départ | Date, conditions et exactitude incertaines | LOW |
| `HEART_RATE_REFERENCE` | FCmax mesurée, FC à une frontière mesurée, FC de repos | Signal complémentaire d’intensité | Dérive cardiaque, chaleur, fatigue ; FCmax estimée par formule d’âge non fiable individuellement | Signal complémentaire, jamais seul |
| `RPE_REFERENCE` | Ancrage individuel de l’échelle d’effort perçu | Signal d’intensité universel, sans capteur | Subjectif ; demande un apprentissage | Signal complémentaire, toujours disponible |

**Interdits**

- FCmax par formule d’âge (220 − âge ou variantes) comme référence de prescription : non retenue. Elle peut seulement apparaître comme « estimation grossière » à confiance LOW, et elle n’est jamais utilisée pour borner un domaine sans autre signal.
- Aucune correction démographique (âge, sexe) appliquée à une référence.

---

## F. Hiérarchie contextuelle des références

### F.1 L’exemple de la mission, audité

L’ordre proposé : course récente pertinente > test de terrain validé récent > plusieurs performances cohérentes > observations d’entraînement récentes > modèle générique > référence déclarée > calibration.

**Audit**

1. **La pertinence dépend de la décision.** Une course de 10 km récente est très informative pour une allure 10K ou pour estimer la frontière 2. Elle l’est bien moins pour une allure marathon plusieurs mois plus tard, surtout sans historique de long run.
2. **« Plusieurs performances cohérentes » peut surpasser une course isolée.** C’est le cas si ces performances encadrent la distance visée et si la course isolée a été faite dans des conditions atypiques.
3. **Les observations d’entraînement** ne mesurent pas une performance maximale. Elles sont faibles pour **augmenter** une référence, mais fortes pour **contredire** une référence trop optimiste (par exemple, des allures prescrites jamais tenues).
4. **Le « modèle générique »** (équivalence de distances) n’est pas une référence : c’est un **transformateur** de référence. Il hérite de la confiance de sa source et la dégrade avec la distance d’extrapolation.
5. **La « calibration »** (séances de départ à l’effort) produit des observations d’entraînement ; elle ne forme pas un rang séparé.

### F.2 Hiérarchie retenue : par décision, ordinale, sans pondération

Le moteur répond à une décision précise (« prescrire une cible THRESHOLD_LIKE », « prescrire une allure spécifique semi », « estimer la frontière 1 »). Pour chaque décision, il classe les références candidates selon des **critères ordinaux** appliqués **dans l’ordre** (tri lexicographique, sans somme pondérée) :

1. **Validité du protocole pour la grandeur visée.** Exemple : VO2MAX_TEST n’est pas valide pour une allure ; RECENT_RACE_RESULT à 10 km est valide pour une allure 10K.
2. **Spécificité** (distance et durée proches de la décision).
3. **Récence** (seuils ordinaux de récence en paramètres `PROGRAMMING_HEURISTIC`, non fixés en 5A).
4. **Fiabilité** du protocole et de la source.
5. **Accord** avec les autres références.

Aucune formule pondérée n’est utilisée. Les seuils (ce qu’est une référence « récente », une distance « proche ») sont des paramètres de ruleset, avec statut et provenance.

### F.3 Conflits

- **Deux références valides divergent** au-delà d’une tolérance (paramètre) : la confiance de la décision baisse d’un niveau. Le moteur retient, pour la prescription, la **plus prudente** des estimations (la moins exigeante), et il propose un test ou une course de contrôle si la tolérance le permet.
- **Une référence déclarée contredit des observations d’entraînement concordantes** : les observations l’emportent pour la prescription ; la déclaration est conservée et tracée.
- **Hausse de référence** : elle exige une référence nouvelle de type performance (course, contre-la-montre, test). Des séances « faciles à tenir » peuvent **proposer** un test, jamais augmenter seules les allures. Ce principe reprend « la hausse d’allure repose sur des preuves » (`07-progression.md`) ; toute limite de hausse par cycle est un `PRODUCT_GUARDRAIL`.
- **Baisse de référence** : elle peut découler d’observations d’entraînement concordantes (échecs répétés) ou d’une interruption (reprise). La baisse est plus facile que la hausse (asymétrie de prudence, `PRODUCT_GUARDRAIL`).

### F.4 `RunningReferenceConfidence` (LOW / MEDIUM / HIGH)

La confiance est attribuée **par décision**, selon des règles ordinales explicites (aucun score).

| Niveau | Condition candidate (hypothèses à valider, `EXPERT_DESIGN_REVIEW`) |
|---|---|
| **HIGH** | Au moins une référence valide pour la grandeur, spécifique, récente, de fiabilité HIGH, **et** aucun conflit non résolu |
| **MEDIUM** | Une référence valide mais moins spécifique ou moins récente, ou une extrapolation modérée par un modèle d’équivalence, ou un accord partiel |
| **LOW** | Uniquement référence déclarée, référence ancienne, extrapolation lointaine, conflit non résolu, ou observations d’entraînement seules |
| *(aucune)* | Aucune référence : la décision n’est pas prise en allure ; effort perçu seulement |

---

## G. Critical Speed (CS) et D’

### G.1 Ce que dit la preuve (SEARCH_SUMMARY)

- **Scoping review 2026** (Sports Med, PMID 41931241, 124 études, PRISMA-ScR ; auteurs non capturés par la recherche) : absence de consensus sur la mesure et la modélisation optimales, sur la façon dont CS et D’ influencent la performance, et sur leur application à l’entraînement. La mission rapporte aussi que la revue présente CS comme une frontière pertinente entre domaines heavy et severe.
- **Jones et al. 2019** (Physiol Rep) : CP/CS proposée plutôt que MLSS comme indice de l’état stable métabolique maximal. Position **débattue** (commentaire García-Tabar).
- **Galán-Rioja et al. 2020** (Sports Med) : CP ne correspond pas simplement à MLSS, VT1, VT2 ni RCP. Ce ne sont pas des synonymes ; les résultats chiffrés ne sont pas extraits.

### G.2 Rôles de CS dans le moteur

| Rôle | Retenu ? | Condition |
|---|---|---|
| Référence physiologique (estimation de la frontière 2) | Oui, **comme un signal** | Protocole connu ; plage d’incertitude conservée |
| Outil de prescription (domaines THRESHOLD_LIKE / SEVERE) | Oui, **indirectement** | Via la plage de la frontière 2, jamais « allure = CS » sans marge décidée |
| Modèle de performance (prédiction de temps) | Partiel | Seulement dans la plage de durées couverte par les essais ; aucune extrapolation au marathon sans autre référence |
| Signal parmi plusieurs | **Toujours** | Confronté aux autres références (§F.3) |

### G.3 Protocoles nécessaires pour une estimation exploitable (conditions minimales candidates)

- Au moins deux efforts maximaux (trois ou plus préférables pour évaluer l’ajustement), de durées **suffisamment différentes**, dans une plage de durées compatible avec le modèle choisi. Le nombre d’essais et les bornes de durée sont `EXPERT_DESIGN_REVIEW` ; aucune valeur n’est fixée en 5A.
- Efforts réellement maximaux, sur terrain plat et dans des conditions comparables, à des dates rapprochées (fenêtre en paramètre).
- Modèle déclaré (linéaire distance–temps, hyperbolique vitesse–durée, autre) et **tracé** avec la référence. Le choix du modèle change CS et D’ (absence de consensus).
- Qualité d’ajustement conservée ; un mauvais ajustement fait tomber la confiance à LOW.
- Des courses récentes de distances différentes peuvent servir d’essais (MULTI_DISTANCE_PERFORMANCE_MODEL), avec une fiabilité inférieure à un protocole dédié si les conditions diffèrent.

### G.4 D’ séparé de CS

- D’ (capacité de travail finie au-dessus de CS) est une **grandeur distincte**, avec sa propre incertitude, en général plus grande que celle de CS. Elle est stockée séparément et jamais fusionnée en une « allure ».
- **Usage V1 : informatif seulement.** D’ n’est pas utilisé pour doser des répétitions en domaine sévère en V1 (INSUFFICIENT_EVIDENCE pour la prescription ; question Q-CS). Sa présence peut éclairer une revue experte.

---

## K. Modèle de cible (allure, effort, fréquence cardiaque)

### K.1 Principe

Une prescription n’est jamais une allure exacte unique si l’incertitude ne le justifie pas. Une `RunningTarget` contient une ou plusieurs **plages** :

| Plage | Unité | Disponible si |
|---|---|---|
| `targetPaceRange` | s/km (min, max) | Référence valide pour la décision, confiance ≥ un seuil de prescription (paramètre) |
| `targetEffortRange` | échelle RPE (min, max) ou descripteur verbal | Toujours |
| `targetHRRange` | bpm (min, max) | Référence FC individuelle (§E.2) ; jamais par formule d’âge seule |

La **largeur** de la plage d’allure croît quand la confiance baisse. Cette relation est un principe ; la largeur exacte est `EXPERT_DESIGN_REVIEW`.

### K.2 Priorité contextuelle

Chaque cible porte une **priorité** (`PACE`, `EFFORT`, `HR`) et la **raison** de ce choix.

| Contexte | Priorité candidate | Raison |
|---|---|---|
| Surface plane et régulière (piste, route plate), référence fiable, domaine THRESHOLD_LIKE / SEVERE / allure spécifique | PACE | L’allure est mesurable et directement liée à la référence |
| EASY_LOW, RECOVERY_RUN | EFFORT (plafond), avec l’allure comme borne indicative | L’easy est une **limite supérieure** (taxonomie §M) |
| Chaleur, vent, dénivelé, fatigue, terrain irrégulier **déclarés** | EFFORT | Le lien allure–intensité est perturbé ; V1 ne corrige pas l’allure |
| HILL_REPETITIONS | EFFORT | L’allure en côte n’est pas comparable |
| STRIDES, SPRINT_NEUROMUSCULAR | EFFORT (qualité, relâchement) | Efforts trop courts pour une allure ou une FC utiles |
| Aucune référence d’allure | EFFORT (+ HR si disponible) | Règle 1 |
| Efforts longs en MODERATE, référence FC fiable | HR possible en second signal | La FC est retardée sur les efforts courts et dérive sur les efforts longs |

**Hors V1** : les données météo, le GPS et le dénivelé mesuré ne sont pas intégrés. Le contexte est **déclaratif**, et le modèle est prêt à recevoir ces signaux plus tard sans changer de structure.

---

## Z. Confiance de prescription (`RUNNING_PRESCRIPTION_CONFIDENCE`)

### Z.1 Distinction

- `REFERENCE_CONFIDENCE` : confiance dans l’estimation d’une capacité (« sa performance 10 km est de X »).
- `RUNNING_PRESCRIPTION_CONFIDENCE` : confiance dans le fait que la **séance prescrite** produira le stimulus visé, sera tolérée et correspond à l’objectif.

**Exemple de la mission.** La performance 10 km est connue avec précision (référence HIGH), mais la prescription marathon reçoit LOW : aucun historique de course longue, extrapolation lointaine, tolérance mécanique inconnue.

### Z.2 Facteurs (ordinaux, sans score)

| Facteur | Effet sur la confiance de prescription |
|---|---|
| Spécificité de la référence pour la séance | Faible ⇒ baisse |
| Récence | Ancienne ⇒ baisse |
| Nombre d’observations | Une seule ⇒ plafonnée à MEDIUM (hypothèse) |
| Accord entre références | Conflit ⇒ baisse |
| Spécificité de l’objectif (distance de l’objectif vs distances observées) | Extrapolation lointaine ⇒ baisse |
| Terrain / contexte déclaré | Contexte perturbé ⇒ priorité EFFORT, confiance d’allure baissée |
| Historique d’entraînement (fréquence, long runs, séances de qualité réalisées) | Absence d’historique pour l’archétype ⇒ baisse |
| Statut de reprise | En reprise ⇒ plafonnée à LOW pour les allures (hypothèse) |

**Règle d’agrégation candidate** : la confiance de prescription est le **minimum** des niveaux produits par les facteurs limitants. C’est une règle ordinale, sans pondération, et chaque facteur limitant est tracé. Cette règle est `EXPERT_DESIGN_REVIEW`.

### Z.3 Conséquences

| Niveau | Conséquences candidates |
|---|---|
| HIGH | Plage d’allure étroite possible ; priorité PACE autorisée dans les contextes compatibles |
| MEDIUM | Plage d’allure plus large ; effort perçu affiché en parallèle ; mise à jour attendue après retour |
| LOW | Priorité EFFORT ; allure seulement indicative (ou absente) ; archétypes à haute exigence différés ou raccourcis ; test ou course de contrôle proposé quand la tolérance le permet |

La confiance de prescription est **tracée** avec chaque séance, à l’image de la `PrescriptionConfidence` ordinale du StrengthEngine (même esprit, objet distinct).
