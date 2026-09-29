# Cross-training : carte du domaine, des capacités et des paramètres

Statut : cartographie préalable (aucun comportement implémenté). Base : Course fermée à `1d37a50`. Running, Strength et CORE ne sont **pas** modifiés. HYROX et le planificateur global ne sont pas commencés.

## 0. Sources disponibles (inventaire honnête)

| Source | Contenu | Autorité |
|---|---|---|
| `docs/engine-spec/06-moteurs-disciplines.md` §3 | Principe « le stimulus d'abord », 8 stimuli avec domaines de temps, intensité, rapport travail / repos, formats admissibles ; règles de validation et modes d'échec | **Hypothèses de conception** du CORE, « données relues par un expert » : aucune relecture n'a eu lieu |
| `docs/engine-spec/04-charge-athlete-state.md` | Expositions E1–E6 (le conditioning ne compte pas en séries E1 ; E2 par répétitions ; E4 contacts de sauts ; E5 minutes par bande **estimées**), limites L1–L5 | Valeurs `provisional` / `heuristic` |
| `docs/engine-spec/07-seance-duree-doublons.md` | Modèle de durée par débit de travail, anti-doublon | Méthode ; valeurs provisoires |
| `docs/engine-impl/RUNNING-V1-CONCURRENT-INTERFERENCE-SPEC.md` | La course intégrée aux WOD (`wod_embedded`) compte dans la charge course ; l'objectif cross-training est porté par le planificateur global | Spec Course |
| CORE (`packages/domain`, `packages/engine`) | Blocs `emom`, `amrap`, `for_time`, `continuous`, `sets` ; prescriptions `reps`, `calories`, `distance`, `timed`, `intervals`, `hold` ; estimation de durée par débit ; profil de demande par structure ; récupération minimale (L1) ; anti-doublon ; tolérance de durée | Code accepté ; paramètres du ruleset de test **provisoires** |
| Catalogue de test du CORE | 8 mouvements pertinents : air squat, KB swing, pompes, tractions, rameur, SkiErg, wall ball, box jump. Débits `RATES(x)` = multiplicateurs de fixture (0,6 / 0,75 / 1 / 1,2) | **Fixture de test**, aucune source |
| Revue de littérature Cross-training | — | **Inexistante** (la Course a eu 5A à 5G, un registre scientifique et des revues sourcées) |

Conséquence : **aucune valeur sportive Cross-training n'est aujourd'hui gouvernée.** Tout ce qui dépend d'un nombre (domaine de temps, densité, dose d'entrée, magnitude de progression, plafonds) est bloqué jusqu'à une décision.

## 1. Archétypes de séance (stimuli)

Selon la spec 06 §3, l'archétype est le **stimulus**, et le format le sert (jamais la variété).

| Stimulus | Blocs | Formats admissibles (spec) | Valeurs numériques de la spec | Statut |
|---|---|---|---|---|
| `strength_plus_conditioning` | force + metcon court | séries + For Time court / AMRAP court | force 12–20 min, metcon 6–12 min | Bloqué (valeurs non gouvernées ; bloc force = moteur Strength ou délégation à définir) |
| `aerobic_capacity` | metcon long | AMRAP long, EMOM long peu dense, intervalles longs | 20–40 min, modérée | Bloqué |
| `threshold` | intervalles | intervalles, EMOM dense, AMRAP moyen | 8–20 min cumulées ; 3–6 min / 1–2 min | Bloqué |
| `anaerobic_intervals` | intervalles courts | intervalles courts, type Tabata (novice exclu) | 6–15 min ; travail / repos 1:1 à 1:3 | Bloqué (G1 : exclusion novice à signer) |
| `mixed_modal_medium` | metcon | For Time (rounds), AMRAP, chipper court | 8–15 min, élevée | Bloqué |
| `muscular_endurance` | circuit | circuits, EMOM | 10–20 min | Bloqué |
| `skill_plus_conditioning` | skill + metcon peu technique | EMOM skill + AMRAP / intervalles | skill 10–15 min | Bloqué (acquisition de compétences non modélisée) |
| `long_chipper` (avancé) | chipper | chipper, priorité tâche | 20–35 min | Bloqué (réservé avancé : G1 / niveau) |
| `benchmark` (spec §7) | WOD de référence rejoué | format du benchmark | cadence non définie | Bloqué (contenu des benchmarks et cadence non gouvernés) |

Le **tableau stimulus → formats admissibles** est qualitatif. Il peut être importé tel quel comme donnée candidate (provenance : spec 06), sans aucun nombre. Les **domaines de temps** et les **intensités** sont des nombres : ils sont bloqués.

## 2. Structures et formats

| Format | Priorité | Représentation CORE | Score | Manques |
|---|---|---|---|---|
| For Time (rounds) | tâche | `for_time { rounds, timeCapS }` + items | temps (ou reps au cap) | Type de score non représenté |
| AMRAP | temps | `amrap { timeCapS }` | rounds + reps | Idem |
| EMOM | temps | `emom { minutes }` | complétion par minute | Densité réalisable non validée par le CORE (règle du moteur ; valeur 40–45 s = hypothèse) |
| Intervalles (monostructural) | temps | item `intervals { reps, work, recoveryS }` ou `timed { workS, rounds, restS }` | distance / calories / allure | Allure de rameur (/500 m) non représentée (`paceSecPerKm` seulement) |
| Chipper | tâche | `for_time { rounds: 1 }` + items | temps | — |
| Continu monostructural | temps | `continuous` + `timed` / `distance` | distance / temps | — |
| Bloc force / skill | — | `sets` (bloc `strength` / `skill`) | charges / reps | Délégation au moteur Strength ou règles propres : à décider |

**Manques du CORE (non corrigés : le CORE est fermé)** :
1. **Aucune charge sur un item de conditioning.** `reps`, `calories` et `distance` n'ont pas de champ de charge : KB swing 24 kg, thruster 43 kg, wall ball 9 kg ne sont pas prescriptibles.
2. **Aucune cible d'effort sur un bloc ou item de conditioning.** `zEffort` n'existe que sur les séries de musculation.
3. **Pas de type de score**, ni de mise à l'échelle déclarée. `alternatives` (≤ 3) peut porter une variante plus facile, sans sémantique de scaling.

⇒ Proposition : une RFC `CORE-EXT-C1` (charge, effort, score, scaling sur le conditioning), sur le modèle de CORE-EXT-R1. Elle est **à décider**, pas à implémenter. En attendant, seuls les mouvements **non chargés** (poids du corps, ergomètres) sont prescriptibles sans contourner le CORE.

## 3. Représentation de l'intensité

| Moyen | Disponible | Gouverné ? |
|---|---|---|
| Domaine de temps du stimulus | Spec (hypothèse) | Non |
| Densité (EMOM : travail par minute ; rapport travail / repos) | Spec (hypothèse) | Non |
| RPE de séance (sRPE, E6) | Méthode établie (Foster), saisie utilisateur | Méthode oui ; aucune cible RPE par stimulus |
| Cible RPE par bloc | **Non représentable** dans le CORE | — |
| Charge (% e1RM, standard d'implément) | Non représentable (manque 1) | Non |
| Allure / puissance ergomètre | `paceSecPerKm` seulement | Non |
| Bande E5 (low / moderate / high) | « estimée d'après le stimulus » (spec 04) | Correspondance stimulus → bande non gouvernée |

## 4. Volume et dose

- **Grandeurs** : reps, rounds, calories, mètres, secondes, charge, dans leurs unités natives. Aucune équivalence inventée entre elles (spec 04 : le conditioning ne compte pas en séries E1).
- **Calibrage** (spec 06 §5) : reps et rounds choisis pour que la durée attendue, calculée avec le débit par niveau (`workRate`), tombe dans le domaine du stimulus. Time cap = p90 + marge.
  - Débits : fixture non sourcée ⇒ **bloqué**.
  - Marge du time cap : non définie ⇒ **bloqué**.
- **Origines possibles d'une dose, de la plus défendable à la moins défendable** :
  1. **Rejeu** d'une séance réalisée (même stimulus, même format, mêmes items) : aucune valeur sportive, comme V19 en Course. Exige une fenêtre de récence et une définition du « retour négatif » propres au Cross-training : deux valeurs à décider.
  2. **Calibrage** par débits sourcés (`workRate` par niveau, par mouvement).
  3. **Table d'entrée** par stimulus et par niveau : première exposition, expert.

## 5. Coût de récupération

| Élément | État |
|---|---|
| Profil de demande par structure | Dérivé par le CORE à partir du coût catalogue (ordinal 0–3) et de tables du ruleset (`demand.*`, provisoires). Il s'applique automatiquement aux séances Cross-training |
| L1 récupération minimale par structure | CORE (`recovery.minGapMatrix`, provisoire) : s'applique |
| L2 séances intenses par semaine | Classement des stimuli Cross-training comme « haute intensité systémique » non gouverné |
| E5 minutes par bande | Correspondance stimulus → bande non gouvernée |
| E6 sRPE | Signal relatif à soi-même ; aucune limite (spec 04) |
| Coût métabolique / fatigue résiduelle par stimulus | Aucune donnée |

## 6. Interférence avec les autres disciplines

| Sens | Mécanisme | État |
|---|---|---|
| Cross-training → Course | Course intégrée (`wod_embedded`, E3), sauts et fentes (E4, impact locomoteur) | Spec Course : compte dans la charge course. Mais la Course (fermée) refuse tout contexte P-HYBRID : il n'y a aucun échange possible sans le planificateur global |
| Cross-training → Musculation | Patterns (E2), structures `lower_knee` / `lower_hip` / `grip` (demande), E1 non compté | Strength consomme les séances voisines (notes, profil de demande) ; hypothèse prudente si la semaine est inconnue |
| Course / Musculation → Cross-training | Fraîcheur par structure (S1), L1 | CORE L1 seulement |
| Multisport (P-HYBRID) | Répartition des stimuli entre disciplines | **Planificateur global : non commencé.** Politique à décider (§12, CT-D11) |

## 7. Matériel et capacités

- **Matériel** : presets du catalogue.
  - « Salle complète » ne dit pas si elle inclut le matériel Cross-training / HYROX (point du backlog UI).
  - Le rameur, le SkiErg, les wall balls, les box et les kettlebells existent comme équipements.
- **Couverture du catalogue** : 8 mouvements. Il manque burpee, corde à sauter, sit-up, deadlift, thruster, épaulé, arraché, toes-to-bar, vélo, course intégrée…
  - Le contenu Cross-training (catalogue + ruleset + archétypes) doit être livré par le paquet, comme Strength (fixtures du paquet), et relu par un expert.
- **Compétences** (tractions, muscle-up, double-under, haltérophilie) : `skillLevel` 1–5, `progressionFamily.rank` pour le scaling. Aucun modèle de « compétence acquise » n'existe côté utilisateur.
- **Capacités proposées** (drapeaux, sur le modèle de la Course ; toutes désactivées sans valeurs) :

| Capacité | Dépendances |
|---|---|
| `ctReplayHold` | fenêtre de récence, retour négatif (CT-D15) |
| `ctCalibratedDose` | stimuli (CT-D1), débits (CT-D2), marge time cap (CT-D3) |
| `ctProgression` | CT-D5 |
| `ctFirstExposure` | CT-D4 |
| `ctLoadedMovements` | CORE-EXT-C1 + CT-D12 |
| `ctTechnicalMovements` (olympiques, gymnastique avancée) | CT-D7, CT-D13 |
| `ctIntensityTargets` | CORE-EXT-C1 + CT-D9 |
| `ctBenchmarks` | CT-D14 |
| `ctWeeklyComposition` | CT-D1, CT-D10 |
| `ctHybridPlanning` | planificateur global (CT-D11) |

## 8. Progression

- **Variables** (une seule à la fois, par analogie avec §T de la Course : à confirmer) :
  - reps par round, rounds ou durée ;
  - charge ;
  - densité (EMOM) ;
  - complexité du mouvement (`progressionFamily.rank`) ;
  - passage d'une variante plus facile au mouvement standard (scaling → Rx).
- **Conditions** : tolérance (séances terminées dans le cap, sans retour négatif, sRPE non dégradé) et régularité (S5).
- **Magnitude** : aucune valeur ⇒ **bloqué** (CT-D5).
- **Benchmarks** : rejeu prévu (spec 07 §4) ; cadence non gouvernée.

## 9. Première exposition

Sans historique d'un stimulus ou d'un mouvement : une dose d'entrée est nécessaire (analogue aux V33 / V35 de la Course). Rien n'est gouverné ⇒ **bloqué** (CT-D4). Le « test » Cross-training (benchmark) fixerait un repère de performance, jamais une dose de volume (même principe que la décision D2 de la Course).

## 10. Contraintes de sécurité (candidats G1 / G3)

| Contrainte | Source | Valeur | État |
|---|---|---|---|
| Douleur (P1–P4), pause | CORE G1 (fictif en V0) | — | Hérité ; signature G1 absente |
| Novice exclu des intervalles type Tabata | Spec 06 | règle | Candidat G1 |
| Pas de mouvement de coût technique 3 à haut volume sous fatigue (novice, débutant) | Spec 06 | « haut volume » non chiffré | Bloqué (CT-D7) |
| Plafonds par séance : reps d'un même mouvement dans un WOD, contacts de sauts (L4) | Spec 04 | « bornes larges » non chiffrées | Bloqué (CT-D6) |
| Densité EMOM réalisable | Spec 06 | 40–45 s / min (hypothèse) | Bloqué (CT-D8) |
| Volume élevé et excentrique sur un mouvement nouveau (novice, reprise) : risque de rhabdomyolyse | Connaissance générale, non sourcée ici | — | À instruire (G1) |
| Restrictions et contre-indications (`no_impact`, `no_overhead`…) | Catalogue + CORE | — | Appliqué par le CORE |
| Reprise après coupure | Aucune règle Cross-training | — | Bloqué (G1-RETURN à définir) |
| Scaling obligatoire pour un mouvement au-dessus du niveau | Spec 06 | règle | Implémentable (qualitatif), sans table de scaling ⇒ mouvement exclu |

## 11. Registre des paramètres à gouverner

Tous **non résolus** au départ (maturité `UNRESOLVED`, aucune valeur). « Hypothèse » = valeur citée par la spec du CORE, conservée seulement comme note pour l'expert, jamais comme valeur.

| Id proposé | Objet | Hypothèse existante | Gouvernance | Décision |
|---|---|---|---|---|
| `ct.stimulus.catalog` | stimuli et formats admissibles (qualitatif) | spec 06 | EXPERT | CT-D1 |
| `ct.stimulus.timeDomains` | domaine de temps par stimulus | spec 06 | EXPERT | CT-D1 |
| `ct.stimulus.intensityBand` | bande E5 par stimulus | — | EXPERT | CT-D1 / CT-D9 |
| `ct.stimulus.workRestRatios` | rapports travail / repos | spec 06 (1:1 à 1:3…) | EXPERT | CT-D1 |
| `ct.catalog.workRates` | débits par mouvement et par niveau | fixture | EXPERT | CT-D2 |
| `ct.format.timeCapMargin` | marge du time cap sur le p90 | — | EXPERT | CT-D3 |
| `ct.format.emomDensity` | travail maximal par minute | 40–45 s | EXPERT | CT-D8 |
| `ct.firstExposure.byStimulus` | dose d'entrée par stimulus et niveau | — | EXPERT / G1 | CT-D4 |
| `ct.progression.magnitude` | pas par variable | — | EXPERT | CT-D5 |
| `ct.progression.toleranceRule` | conditions d'un pas | — | EXPERT | CT-D5 |
| `ct.safety.repsPerMovementCap` | L4 reps d'un mouvement dans un WOD | — | G1 / G3 | CT-D6 |
| `ct.safety.jumpContactsCap` | L4 contacts de sauts par séance | — | G1 / G3 | CT-D6 |
| `ct.safety.technicalUnderFatigue` | seuil « haut volume » coût technique 3 | — | G1 | CT-D7 |
| `ct.intensity.rpeByStimulus` | cible d'effort par stimulus | — | EXPERT | CT-D9 |
| `ct.load.implementStandards` | standards d'implément (wall ball, KB…) | — | EXPERT | CT-D12 |
| `ct.load.percentE1rmByStimulus` | charges relatives | spec 06 (« % e1RM modéré ») | EXPERT | CT-D12 |
| `ct.scaling.rules` | règles et tables de scaling | — | EXPERT | CT-D13 |
| `ct.benchmark.set` / `ct.benchmark.cadence` | benchmarks et cadence | — | EXPERT | CT-D14 |
| `ct.history.anchorPolicy` | rejeu de la dernière séance réalisée | analogue V19 (règle) | EXPERT / PRODUIT | CT-D15 |
| `ct.history.recencyBand` | fenêtre de récence | — (celle de la Course n'est pas transposable) | EXPERT | CT-D15 |
| `ct.history.negativeResponse` | définition du retour négatif | analogue 5E (Course) | EXPERT | CT-D15 |
| `ct.hi.classification` | stimuli comptés « haute intensité » (L2) | — | EXPERT / G3 | CT-D10 |
| `ct.week.stimulusDistribution` | répartition sur 14 jours | spec 06 (qualitatif) | EXPERT | CT-D10 |
| `ct.safety.novicePolicy` | exclusions novice (Tabata, chipper…) | spec 06 (règles) | G1 | CT-G1 |
| `ct.return.protocol` | reprise après coupure | — | G1 | CT-G1 |
| `ct.hybrid.policy` | Cross-training avec un autre sport | — | PRODUIT / planificateur | CT-D11 |

## 12. Décisions à prendre (groupées)

- **CT-D1** stimuli, domaines de temps, formats admissibles, rapports travail / repos.
- **CT-D2** débits de travail (catalogue).
- **CT-D3** marge du time cap.
- **CT-D4** premières expositions.
- **CT-D5** progression (magnitude, conditions).
- **CT-D6** plafonds L4.
- **CT-D7** technique sous fatigue.
- **CT-D8** densité EMOM.
- **CT-D9** cibles d'effort.
- **CT-D10** haute intensité et répartition hebdomadaire.
- **CT-D11** multisport.
- **CT-D12** charges.
- **CT-D13** scaling.
- **CT-D14** benchmarks.
- **CT-D15** rejeu de l'historique.
- **CT-G1** novice, reprise, douleur.
- **RFC** `CORE-EXT-C1` : charge, effort, score, scaling dans le conditioning. Modification du CORE : décision distincte.

## 13. Ce qui est implémentable immédiatement (aucune valeur inventée)

1. **Paquet `@hybridsport/crosstraining`**, isolé : dépend de `domain`, `engine`, `zod`. Architecture vérifiée par test : ni Running ni Strength n'en dépendent, et CORE, Running et Strength restent inchangés.
2. **Contrat de contexte** (validé à la frontière, fail-closed) : niveau, objectif, matériel, compétences déclarées, historique réalisé (stimulus, format, items, score, complétion dans le cap, sRPE, douleur), benchmarks.
3. **Registre de gouvernance typé** : tous les paramètres du §11, `UNRESOLVED`, maturités, états de production. Test : aucun nombre dans les entrées non résolues.
4. **Capacités et analyse** (éligibilité séparée de la précision), dérivées de la gouvernance. Toutes désactivées ⇒ refus explicites, tracés.
5. **Pipeline de refus complet** : un archétype non prescriptible ⇒ `PRESCRIPTION_NOT_IMPLEMENTED` et codes propres (`CT.*`), jamais une séance factice. Contrat `SportEngine` du CORE.
6. **Contrat de séance réalisée** et **validation structurelle** qualitative :
   - cohérence format ↔ champs ;
   - format admissible pour le stimulus (table qualitative candidate) ;
   - mouvement chargé ⇒ refus tant que CORE-EXT-C1 manque ;
   - mouvement au-dessus du niveau sans scaling ⇒ exclu.
7. **Connexion à l'application** : le Cross-training activé devient « moteur présent, en simulation » ; ses séances sont refusées avec des raisons lisibles, et les séances réalisées peuvent être enregistrées (base du futur rejeu).
8. **Tests** : propriétés (aucune séance sans valeurs gouvernées, déterminisme), architecture (aucune constante cachée), mutation ciblée.

Aucune séance Cross-training n'est proposée à l'utilisateur tant que CT-D15 (rejeu) ou CT-D1 à CT-D3 (calibrage) ne sont pas décidés.

## 14. Plan de mise en œuvre (vagues)

| Vague | Contenu | Prérequis |
|---|---|---|
| **C1 — socle** | §13 points 1 à 8 | aucun |
| **C2 — rejeu (HOLD)** | Rejouer exactement un metcon réalisé récent (mouvements non chargés), refus sinon ; séance marquée simulation | CT-D15 (+ G1 douleur hérité) |
| **C3 — calibrage** | Reps et rounds calibrés par débits dans le domaine du stimulus ; time cap | CT-D1, CT-D2, CT-D3, CT-D8 ; revue sourcée préalable |
| **C4 — progression** | Pas minimal, une variable | CT-D5 |
| **C5 — première exposition, benchmarks** | Doses d'entrée ; benchmarks comme repères de performance | CT-D4, CT-D14, CT-G1 |
| **C6 — charges, effort, technique** | Mouvements chargés, cibles d'effort, haltérophilie / gymnastique avancée | RFC CORE-EXT-C1 acceptée ; CT-D7, CT-D9, CT-D12, CT-D13 |
| **C7 — semaine Cross-training** | Répartition des stimuli, haute intensité | CT-D1, CT-D10 |
| **Gate Cross-training** | Mutation, propriétés adverses, déterminisme, CORE / Running / Strength inchangés | — |

Recommandation :
1. **C1 maintenant.**
2. **En parallèle, une revue sourcée** (comme celle de D2 / D6 pour la Course) pour CT-D1, CT-D2, CT-D3, CT-D8, CT-D9 et CT-D15. Elle distingue ce que les sources établissent de ce qui reste une décision d'implémentation.
3. **Ensuite C2, puis C3**, une fois ces décisions validées.
