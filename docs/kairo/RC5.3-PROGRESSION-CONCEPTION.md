# RC5.3 — Progression musculaire individualisée : conception (règles et tests d'acceptation)

> **Conception à valider.** Aucune modification du moteur sur la branche de développement. Les règles ont été
> prototypées dans une copie jetable (patch : `rc53-etudes/rc53-prototype.patch`) pour produire les résultats
> comparatifs de `RC5.3-PROGRESSION-RESULTATS.md`. BÊTA `e2cdcc5` intacte ; aucun déploiement, aucune fusion.

## 0. Constats de départ (code actuel)

| # | Constat | Effet |
|---|---|---|
| C1 | Les tracks sont par archétype : un accessoire présent dans Haut A et Haut B progresse sur deux tracks. | Progression des accessoires communs deux fois plus lente (RC5.2). |
| C2 | Réussite exacte d'un principal autorégulé : `DECISION_BLOCKED` (capacité `exact_success_progression` non gouvernée). | Un athlète exactement dans la cible ne progresse jamais en charge. |
| C3 | Phase fixe `accumulation`, `mesocycleEnded: false` : aucun cycle, aucune décharge ; le plafond de cycle (+15 %) devient définitif. | Plafond permanent à +15 %. |
| C4 | Interférence et état du jour **relèvent le RIR cible sans changer la charge** (`decideLoad`, branche track). L'exposition est ensuite classée contre ce RIR relevé. | Athlète simulé « conforme » : fausse hausse (constat RC5.2). Athlète réel, qui déclare son vrai RIR : classement « en dessous » à tort, donc maintien, puis **régression** après deux expositions. |

## 1. Règles proposées

### R1 — Progression partagée entre séances A/B (variante CA)

- **R1.1 — Track partagée.** Une famille de progression regroupe les archétypes d'une même variante (`str_upper_a`/`str_upper_b` → `str_upper` ; idem en bas), déclarée dans le contenu versionné (attribut `progressionFamily`, pas d'expression régulière). Un accessoire suivi qui a le même exercice au même emplacement (même suffixe : `iso_upper`, `single_leg`…) dans A et B utilise **une seule track**. Le compteur de création de track est commun.
- **R1.2 — Prescriptions spécifiques.** Un même exercice à des rôles différents (ex. haltères seuls : développé épaules **principal lourd** en Haut B, **accessoire volume** en Haut A) garde **deux tracks**, chacune avec ses répétitions, son RIR et sa charge.
- **R1.3 — Historique partagé.** L'e1RM **observé** de l'exposition la plus récente d'un exercice est recopié sur toutes ses tracks autorégulées actives (lourd / volume, A / B). Il sert aux décisions autorégulées et à la réévaluation (R3). Jamais un maximum : la valeur de la séance qui vient d'être réalisée.
- **R1.4 — Données existantes.** Deux tracks actives de même clé (famille, suffixe, exercice), créées avant R1, fusionnent à la première frontière de semaine : on conserve celle dont l'exposition est la plus récente ; l'autre est close (`merged`), son historique reste lisible. Aucune semaine déjà planifiée n'est réécrite.

### R2 — Critères de progression (réussite exacte, essais de charge)

- **R2.1 — Réussite exacte.** Une exposition **non modifiée**, réussie exactement (répétitions atteintes, RIR déclaré = cible) incrémente la série de réussites exactes de la track. Au seuil, la track propose **un pas de charge** :
  - débutant : règle linéaire existante, hausse à chaque réussite ;
  - intermédiaire : **2** réussites exactes ;
  - avancé : **3** réussites exactes ;
  - **+1** si l'effort est inconnu (aucun RIR saisi).
- **R2.2 — Essai de charge.** Toute hausse de charge, quel que soit le modèle (linéaire, autorégulé, double progression), est un **essai** : confirmé si l'exposition probante suivante est réussie ; **annulé** si elle est en dessous ou partielle. Dans ce cas, retour à la charge précédente (double progression : haut de plage), maintien compté et trace `PROGRESSION.PROBE_REVERTED`.
- **R2.3 — Pas d'oscillation.** Une charge refusée par un essai annulé n'est plus retentée **avant le prochain mésocycle**, sauf exposition « au-dessus » (marge réellement mesurée).
- **R2.4 — Répétitions.** La double progression reste inchangée : +1 répétition par réussite jusqu'au haut de plage, puis pas de charge (essai, R2.2). Granularité du matériel conservée (saut refusé si le RIR prévu est trop bas).
- **R2.5 — Aucune hausse systématique.** Aucune hausse sur : exposition modifiée (R4), décharge (R3), douleur, substitution, données absentes, charge non portée, ni au-delà du plafond de cycle.

### R3 — Mésocycles

- **R3.1 — Durée.** Durée initiale configurable de **4 à 6 semaines**. Valeurs par défaut proposées :
  - débutant : 6 semaines ;
  - intermédiaire : 5 semaines ;
  - avancé : 4 semaines.

  Réglage utilisateur facultatif (Programme), borné à 4–6.
- **R3.2 — Structure.** Semaines 1 à L−1 en accumulation ; **semaine L = décharge** (phase `deload` existante du ruleset : séries × 0,6, RIR +2). Aucune décision de progression pendant la décharge : ni hausse, ni baisse, ni compteur.
- **R3.3 — Position.** La position est **dérivée** de l'index de semaine du programme (`weekIndex mod L`) : aucun état ajouté, régénération identique, reproductible.
- **R3.4 — Réévaluation à la frontière** (1re semaine d'un nouveau cycle), pour chaque track chargée, une seule fois par cycle :
  - autorégulée avec e1RM observé : charge idéale = e1RM × % (répétitions + RIR), arrondie au pas inférieur.
    - Charge courante trop lourde (idéale < charge − 1 pas) : baisse vers l'idéale, **au plus −10 %**.
    - Charge trop légère (idéale ≥ charge + 2 pas) : hausse de **2 pas au plus**.
  - stagnation (aucun gain dans le cycle et ≥ 2 maintiens) : **remise à −5 %**, répétitions au bas de plage ; le compteur de maintiens repart à zéro.
  - nouveau cycle : référence du plafond = charge réévaluée (le plafond de +15 % est désormais **par cycle**) ; essais refusés oubliés.
- **R3.5 — Rotation d'exercices.** Pas de rotation automatique à la fin d'un cycle (continuité, décision S4). La rotation reste réservée à la stagnation persistante (règle existante).

### R4 — Séances allégées et modifiées

- **R4.1 — Exposition modifiée.** Une exposition est modifiée si son exercice a reçu un modificateur `interference`, `interference_rir`, `readiness` ou `time` (`DOSE.MODIFIED`), ou si la séance a été adaptée au démarrage.
- **R4.2 — Classement.** Une exposition modifiée est classée par rapport au **RIR de base de la track**, jamais par rapport au RIR relevé. Elle n'est **ni une preuve de progrès** (aucune hausse, aucune série de réussites, e1RM inchangé), **ni un échec** (aucun compteur « en dessous », aucune régression). Trace : `HELD` `modified_prescription` / `below_modified`.
- **R4.3 — Signal conservé.** Un « en dessous » sur séance modifiée reste visible (trace) pour la récupération ; il ne pénalise jamais la charge.
- **R4.4 — Option à décider (non prototypée).** Recalculer la charge quand un modificateur relève le RIR (cohérence affichée : « 40 kg × 6 à RIR 4 » est irréaliste si 40 kg correspond à RIR 2).

### R5 — Adaptations préservées

Aucun changement des règles de douleur (suspension, pause de sécurité), d'état du jour (RIR +1 persistant), d'interférence multisport (réductions, arbitrage M3), de matériel (substitution, préréglages) et de durée. R4 change seulement **la lecture** de ces séances par la progression.

## 2. Tests d'acceptation

| Id | Règle | Test (Given / When / Then) |
|---|---|---|
| TA-01 | R1.1 | A/B, pec deck dans Haut A et Haut B : **une** track ; 2 expositions par semaine la font avancer ; première hausse de charge au même rythme qu'avant RC5.1 (± 1 semaine). |
| TA-02 | R1.2 | Haltères seuls : développé épaules principal (Haut B) et accessoire (Haut A) = **2 tracks**, prescriptions différentes (6 répétitions lourdes / plage 8–12). |
| TA-03 | R1.3 | Après une exposition lourde à e1RM observé, la track volume du même exercice porte le même e1RM ; sa charge prescrite ne change pas avant sa propre exposition ou la frontière de cycle. |
| TA-04 | R1.4 | État RC5.1 avec deux tracks pec deck : relu octet pour octet ; à la frontière suivante, une track active (la plus récente), l'autre `closed/merged` ; aucune semaine planifiée réécrite. |
| TA-05 | R2.1 | Intermédiaire, 2 réussites exactes observées → +1 pas ; avancé : 3 ; effort inconnu : +1 exposition ; jamais sur exposition modifiée. |
| TA-06 | R2.2 | Essai suivi d'une exposition en dessous → charge précédente, `PROBE_REVERTED`, maintien compté. |
| TA-07 | R2.3 | Athlète **stable** sur 24 semaines : au plus **un** essai annulé par charge et par cycle ; charge finale à ± 1 pas de la charge idéale. |
| TA-08 | R2.5 | Athlète stable : **aucune hausse nette** au-delà de la charge idéale + 1 pas ; zéro hausse sur séances modifiées ou en décharge. |
| TA-09 | R3.1–3.3 | Semaines L, 2L… en décharge (séries réduites, RIR +2) ; position identique après redémarrage et régénération ; `RC53_MESO` 4, 5 et 6 acceptés, valeur hors bornes refusée. |
| TA-10 | R3.4 | Athlète **progressant** : la charge dépasse le plafond du 1er cycle dès le 2e cycle (plafond par cycle). Athlète en **stagnation** : remise à −5 % à la frontière, plus aucune hausse continue après le plateau. |
| TA-11 | R4 | Course/HYROX (séances réduites par interférence) : **zéro régression** due à une exposition modifiée ; aucune hausse décidée sur une exposition modifiée. |
| TA-12 | R4 | Athlète **fatigué** (contrôle « fatigue élevée ») : séances adaptées, aucune baisse de charge ni hausse pendant les semaines de fatigue. |
| TA-13 | R5 | Douleur, fatigue, course libre, inconnu : décisions de démarrage identiques à l'actuel ; matériel indisponible : substitution inchangée. |
| TA-14 | — | 12 et 24 semaines, débutant / intermédiaire / avancé, progressant / stable / fatigué / stagnation : progression en **charges ET en répétitions** mesurée ; écart à la charge idéale réduit ou égal à l'actuel. |
| TA-15 | — | Volumes par groupe : aucune semaine de plus sous le plancher hors décharge ; durées : aucun dépassement du temps disponible. |
| TA-16 | — | Haltères seuls, poids du corps, 3× Full Body, objectif force : programmes créés et progressants (aucune configuration valide rendue impossible). |
| TA-17 | — | Reproductibilité R-A identique sur toutes les semaines ; contenus antérieurs relus et régénérés à l'identique (registre versionné). |
| TA-18 | — | Données BÊTA (`e2cdcc5`, avant RC5.1) et données RC5.1 : relues sans migration, réécrites octet pour octet. |
