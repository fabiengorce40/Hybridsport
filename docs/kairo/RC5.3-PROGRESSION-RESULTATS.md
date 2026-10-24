# RC5.3 — Progression individualisée : résultats comparatifs et régressions

> Étude seulement : prototype dans une copie jetable (`rc53-etudes/rc53-prototype.patch`), activé par `RC53=1`.
> Branche de développement inchangée côté moteur ; BÊTA `e2cdcc5` intacte ; aucun déploiement, aucune fusion.
> Règles et tests d'acceptation : `RC5.3-PROGRESSION-CONCEPTION.md`.

## 1. Protocole

| Élément | Valeur |
|---|---|
| Durée | **24 semaines** (mesures à 12 et 24), chemin réel de l'application. |
| Profils | Musculation 4× (S4), + Course (P1b), + HYROX (S4H), haltères seuls (S4D), Full Body 3× (S3), objectif force (S4F). |
| Niveaux | Débutant, intermédiaire, avancé. |
| Variantes | **A** : code actuel (RC5.1). **P** : prototype, R4 strict. **S** : prototype, R4 souple (**recommandé**). |
| Combinaisons | 6 profils × 3 niveaux × 4 athlètes × 3 variantes = 216 simulations de 24 semaines. |

**Athlète simulé à capacité cachée.** Le moteur ne voit que les répétitions et le RIR déclarés : jamais la capacité réelle.
- La capacité de l'athlète (e1RM) évolue selon une trajectoire ; il réalise ses séries et déclare son **RIR réel**. L'ancien athlète « conforme » déclarait le RIR cible.
- Hypothèses de simulation, à valider : gain de capacité par semaine de 1,5 % (débutant), 0,75 % (intermédiaire) et 0,4 % (avancé).
- Les quatre trajectoires :
  - **progressant** : gain continu ;
  - **stable** : aucun gain ;
  - **fatigué** : gain continu, mais performance −8 % et contrôle « fatigue élevée » les semaines 3–4, 11–12 et 19–20 ;
  - **stagnation** : gain pendant 8 semaines, puis plus rien.

**Indicateurs.**
- **Écart à la charge idéale** : charge prescrite comparée à la charge que permet la capacité réelle (aux répétitions et au RIR visés).
- **Écart de capacité des accessoires** : charge et répétitions prescrites comparées à la capacité réelle.
- **Hausse injustifiée** : charge prescrite supérieure à la charge idéale + 1 pas.

## 2. Résultats principaux

### Charges des mouvements principaux et accessoires (tous profils)

| Athlète | Niveau | Gain réel | Gain 12 sem. A → S | Gain 24 sem. A → S | Écart principaux S24 A → S | Écart accessoires S24 A → S | Régressions A → S |
|---|---|---|---|---|---|---|---|
| Progressant | Débutant | +34,5 % | +12,0 → +12,7 | **+12,0 → +30,3** | −18,2 → **−6,2** | −13,4 → −8,6 | 41 → 33 |
| Progressant | Intermédiaire | +17,3 % | +7,9 → +8,4 | **+13,0 → +16,1** | −9,7 → −7,2 | −6,0 → −5,5 | 105 → 80 |
| Progressant | Avancé | +9,2 % | +6,5 → +6,8 | +11,2 → +10,8 | −2,1 → −2,5 | −2,9 → **−5,9** ⚠ | 156 → 103 |
| Stable | Débutant | 0 % | +5,0 → +2,1 | **+7,0 → +1,8** | +0,8 → −4,1 ⚠ | −2,3 → −4,7 ⚠ | 322 → 128 |
| Stable | Intermédiaire | 0 % | +1,8 → +1,1 | +1,8 → +1,8 | −4,1 → −4,1 | −1,7 → −0,4 | 176 → 138 |
| Stable | Avancé | 0 % | +1,8 → +1,8 | +1,8 → +1,8 | −4,1 → −4,1 | −1,5 → −1,1 | 177 → 127 |
| Fatigué | Débutant | +34,5 % | +11,1 → +10,2 | **+12,3 → +26,8** | −19,1 → −8,3 | −14,5 → −11,2 | 111 → 83 |
| Fatigué | Intermédiaire | +17,3 % | +6,5 → +7,1 | **+8,2 → +15,8** | −13,5 → −7,5 | −8,6 → −4,9 | **176 → 54** |
| Fatigué | Avancé | +9,2 % | +5,2 → +6,5 | **+2,0 → +11,4** | −10,3 → −2,0 | −8,4 → −4,3 | **221 → 74** |
| Stagnation | Débutant | +12,0 % | +12,0 → +12,7 | +12,0 → +13,1 | −5,0 → −4,6 | −3,8 → −6,7 ⚠ | 135 → 87 |
| Stagnation | Intermédiaire | +6,0 % | +7,1 → +6,5 | +7,1 → +7,1 | −5,3 → −5,3 | −3,8 → −3,1 | 157 → 76 |
| Stagnation | Avancé | +3,2 % | +6,5 → +6,8 | +6,5 → +6,8 | −1,1 → −0,8 | −4,0 → −3,6 | 177 → 118 |

**Lecture.**
- Avec S, la charge suit **la capacité réelle** :
  - l'athlète progressant ou fatigué gagne 2 à 5 fois plus que avec A, sans dépasser sa capacité ;
  - l'athlète stable n'est plus poussé au-delà de sa capacité (débutant : +1,8 % contre +7 %, avec 2,5 fois moins de régressions) ;
  - l'athlète en stagnation cesse de progresser après son plateau.
- **Régressions −20 à −70 %**, surtout chez l'athlète fatigué : les séances adaptées ne sont plus lues comme des échecs.
- Le plafond de +15 % devient **par cycle**. Exemple, intermédiaire progressant : A est bloqué à 45 kg, S monte à 47,5 kg en semaine 21.

### Profils multisports (Course, HYROX)

| Athlète | Niveau | Gain réel | Gain 24 sem. A → S | Écart principaux A → S | Régressions A → S |
|---|---|---|---|---|---|
| Progressant | Débutant | +34,5 % | +12,5 → **+23,4** | −18,2 → −10,2 | 10 → 5 |
| Progressant | Intermédiaire | +17,3 % | +12,5 → +13,3 | −10,0 → −9,4 | 31 → 19 |
| Stable | Débutant | 0 % | +6,2 → **0,0** | 0 → −5,9 ⚠ | 123 → 40 |
| Fatigué | Intermédiaire | +17,3 % | +6,2 → **+12,5** | −15,0 → −10,0 | **63 → 15** |
| Fatigué | Avancé | +9,2 % | **0,0 → +9,4** | −11,1 → −2,8 | **77 → 19** |
| Stagnation | Débutant | +12,0 % | +12,5 → +9,4 ⚠ | −5,3 → −7,9 | 51 → 23 |

Le constat C4 est **confirmé avec un athlète réaliste**. Avec A, quand l'interférence relève le RIR cible, l'athlète déclare son RIR réel ; la séance est classée en dessous, puis la charge régresse (fatigué avancé : charge finale = charge initiale).

### R4 strict (P) contre R4 souple (S)

Différences seulement chez l'intermédiaire : S progresse un peu plus, sans hausse décidée sur une séance allégée.

| Cas | P (strict) | S (souple) |
|---|---|---|
| Progressant, tous profils | +15,5 % | +16,1 % |
| Progressant, multisport | +11,7 % | +13,3 % |
| Fatigué, tous profils | +13,9 % | +15,8 % |
| Fatigué, multisport | +8,6 % | +12,5 % |

**Recommandation : S.**

## 3. Contrôles d'acceptation

| Test | Résultat |
|---|---|
| TA-01 Track partagée A/B | ✓ Pec deck : 1 track (A : 2). |
| TA-02 Prescriptions spécifiques | ✓ Haltères seuls : développé épaules principal (6 répétitions, 44 kg) et accessoire (11–12 répétitions, 40 kg) = 2 tracks. |
| TA-03 Historique partagé | ✓ e1RM observé recopié entre tracks autorégulées du même exercice. |
| TA-04 Fusion des tracks existantes | **Non prototypé** : à implémenter (R1.4). |
| TA-06 / TA-07 Essais | ✓ Au plus **1 essai annulé** par charge et par cycle (toutes simulations). |
| TA-09 Mésocycle et décharge | ✓ Cycles 6 / 5 / 4 semaines, décharge tracée, aucune décision de progression en décharge. ⚠ voir § 4.4. |
| TA-11 / TA-12 Séances modifiées, fatigue | ✓ Régressions fortement réduites (tableaux). |
| TA-13 Adaptations au démarrage | ✓ Douleur, fatigue, course libre, inconnu : décisions identiques à A. |
| TA-15 Durées | ✓ 0 dépassement (A et S), maximum 64 min. |
| TA-15 Volumes | ✓ Hors décharge : moins de semaines sous le plancher (ex. avancé 392 → 251) et au-dessus du haut (123 → 94). |
| TA-16 Configurations | ✓ Haltères seuls, Full Body 3×, force, Course, HYROX : 552 séances planifiées dans chaque variante. |
| TA-17 Reproductibilité | ✓ R-A 552/552 dans toutes les simulations. |
| TA-18 Données existantes | ✓ 13 états (10 BÊTA `e2cdcc5`, 3 RC5.1) réécrits **octet pour octet** ; semaines anciennes identiques à A après ouverture. |

## 4. Régressions et points à décider

1. **Accessoires de l'avancé progressant** : l'écart à la capacité réelle passe de −2,9 % à −5,9 % (multisport : −3,7 % → −8,1 %). Chaque semaine de décharge et chaque séance allégée est une exposition sans progression ; l'avancé, qui progresse lentement, le ressent plus. Pistes :
   - décharge plus courte ou moins fréquente pour l'avancé ;
   - séances allégées comptées en preuve (déjà le cas en S) pour les accessoires.
2. **Débutant stable** : charge des principaux un peu plus basse qu'avec A (−4,1 % contre +0,8 %). Les essais annulés le maintiennent un pas sous sa limite. Les 10 « hausses injustifiées » (A : 5) sont des essais, tous annulés à l'exposition suivante.
3. **Stagnation débutant multisport** : +9,4 % contre +12 % réels. S est un peu prudent.
4. **Décharge trop forte** : séries × 0,6 arrondi à l'inférieur, donc 3 séries deviennent **1** (−67 %). À décider : arrondi au plus proche (3 → 2) ou facteur propre à la décharge. Les semaines de décharge sont, par construction, sous le plancher de volume.
5. **Nombre d'événements de progression des accessoires** : moins de pas de répétitions et de charge qu'avec A (ex. intermédiaire progressant : 708 → 520 répétitions). Ce n'est pas un recul de la charge suivie : A multipliait les montées puis les régressions.
6. **Non prototypé** : fusion des tracks existantes (R1.4) ; option R4.4 (recalcul de la charge quand le RIR est relevé).
7. **Hypothèses de simulation** : gains hebdomadaires, fatigue −8 % et arrondi du RIR déclaré. À valider par un professionnel avant toute conclusion sportive définitive.

## 5. Plan d'implémentation proposé (après autorisation)

Lots successifs, chacun testé séparément, sur la branche de développement uniquement :
1. **R4** séances allégées : marquage de la dose modifiée et classement au RIR de base. C'est la correction de risque, la plus utile, dont le constat C4 a été vérifié.
2. **R1** CA, historique partagé et fusion des tracks existantes.
3. **R2** réussite exacte et essais de charge (confirmation / annulation, refus jusqu'au prochain cycle).
4. **R3** mésocycles : durée configurable 4–6, décharge, réévaluation, plafond par cycle. Avec les décisions du § 4.4.

Contenu et règles versionnés (registre), version de planification inchangée tant que les semaines existantes doivent rester identiques. Tests d'acceptation TA-01 à TA-18 automatisés.
