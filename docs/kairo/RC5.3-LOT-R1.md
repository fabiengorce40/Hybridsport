# RC5.3 — Lot R1 : progression partagée A/B, historique partagé, fusion des tracks

> Branche de développement `claude/kairo-rc4-dev` uniquement. Aucun déploiement. Lot appliqué après R4.

## 1. Ce qui est implémenté

| Règle | Implémentation |
|---|---|
| Contenu versionné | Ruleset `0.10.0-strength-rc53-r1`, surcouche du lot R4 (`0.9.0`, conservé au registre avec RC5.1 et les contenus antérieurs). |
| R1.1 Track partagée | Attribut de contenu `progressionFamily` (Haut A / Haut B ⇒ `str_upper`, Bas A / Bas B ⇒ `str_lower` ; aucune expression régulière) et politique `sharedProgression`. Clé de progression d'un emplacement : `famille/suffixe` (`ua.iso_upper` et `ub.iso_upper` ⇒ `str_upper/iso_upper`). Un accessoire suivi reprend la track de la famille au même suffixe ; celle de l'archétype lui-même prime ; compteur de création commun. |
| R1.2 Prescriptions spécifiques | Suffixes différents ⇒ tracks différentes : haltères seuls, développé épaules principal (Haut B, `main_push_v`) et accessoire (Haut A, `push_2v`) gardent leurs prescriptions propres. Les ancres (principaux) restent par archétype. |
| R1.3 Historique partagé | Après une exposition à effort **observé**, l'e1RM de la track autorégulée mise à jour est recopié sur les autres tracks autorégulées actives du même exercice (trace `PROGRESSION.E1RM_SHARED`). Leur prescription (charge, répétitions, RIR) ne change pas. |
| R1.4 Fusion | À la frontière de semaine, deux tracks d'accessoire actives de même clé (famille, suffixe, exercice), créées avant R1 : la plus récemment exposée est conservée, l'autre est close `merged` (historique intact, trace `PROGRESSION.TRACK_CLOSED`). Aucune semaine planifiée réécrite. |
| Sans la politique | Contenus antérieurs : une track par archétype, aucun partage, aucune fusion (reproduits à l'identique). |

## 2. Résultats (24 semaines, 216 simulations)

Tableaux complets : `rc53-etudes/lot-r1-vs-r4.md` (effet propre de R1) et `rc53-etudes/lot-r1-vs-reference.md` (R4 + R1 contre
le code d'avant RC5.3).

### Accessoires communs (S4 intermédiaire progressant)

| Exercice | Avant RC5.3 : charge S12 / S24, hausses | R4 + R1 : charge S12 / S24, hausses / baisses |
|---|---|---|
| Squat bulgare (Bas A et B) | 42 / 40 kg ; 3 hausses, 1 baisse | 42 / **46 kg** ; 8 hausses, 2 baisses |
| Haltères seuls, squat bulgare | 42 / 40 kg | 42 / **44 kg** |
| Pec deck (Haut A et B) | 40 / 45 kg ; 2 hausses, 1 baisse | **35** / 45 kg ; 4 hausses, 3 baisses ⚠ |
| Leg extension (Bas A et B) | 40 / 45 kg | **35** / 45 kg ⚠ |

Parcours de référence (athlète « conforme », 4 semaines, S4) : première hausse de charge d'un accessoire commun en
semaine **4** (avant : 6e semaine avec RC5.1 ; rythme d'avant RC5.1 retrouvé, TA-01). Pec deck : une seule track,
deux expositions par semaine.

### Effet propre de R1 (référence : lot R4)

| Indicateur | Effet |
|---|---|
| Hausses de charge des accessoires | +5 à +22 par cellule (ex. avancé progressant 149 → 169). |
| Écart de capacité des accessoires | Progressant débutant −14,4 → **−13,3 %** ; intermédiaire −6,9 → −6,2 % ; avancé −3,1 → −3,5 % ; stables −0,2 à −0,5 point. |
| Régressions | En hausse : progressant débutant 38 → 44, intermédiaire 98 → 106, fatigué intermédiaire 50 → 63, fatigué avancé 98 → 104. ⚠ |
| Hausses injustifiées | Avant RC5.3 26 → R4 23 → R1 **18** (aucune nouvelle). |
| Principaux | Inchangés (R1 ne touche pas les ancres). |
| Démarrages, séances, durées, R-A, volumes | Identiques (72 / 72 ; 6 624 séances ; 0 dépassement ; R-A 6 624 / 6 624 ; plancher 2 410 → 2 410). |

### Régression restante : oscillation de la double progression ⚠

Pec deck (S4 intermédiaire progressant) : 40 kg, répétitions 12 → 20 (+1 par réussite exacte, deux expositions par
semaine) ; l'athlète atteint sa limite, deux expositions « en dessous », régression de 10 % arrondie au pas machine
(5 kg) ⇒ **35 kg**, puis remontée à 40 kg, et ainsi de suite. Le mécanisme existait déjà avant RC5.1 (même rythme de deux
expositions) ; R1 le rend à nouveau visible. Correction prévue au **lot R2** : une hausse de répétitions est, comme une
hausse de charge, un **essai** ; une exposition « en dessous » qui suit ramène aux dernières répétitions réussies, sans
baisse de charge.

## 3. Tests

| Fichier | Contenu |
|---|---|
| `packages/strength/tests/unit/rc53-r1.test.ts` (6) | Contenu (familles, politique) ; clé de progression (famille, sans famille, sans politique) ; track partagée reprise par Haut B, priorité à la track propre, track close / suspendue ignorée, autre suffixe ignoré ; prescription de la track partagée appliquée. |
| `packages/app-core/tests/rc53/rc53-r1.test.ts` (6) | TA-01 (une track pour pec deck / leg extension / squat bulgare, deux expositions par semaine, première hausse ≤ semaine 8), TA-02 (haltères seuls : deux tracks, répétitions distinctes), TA-03 (e1RM partagé, prescription inchangée, trace), TA-04 (état RC5.1 relu octet pour octet ; une track active par clé, la plus récemment exposée ; l'autre close `merged`, inchangée ; semaines conservées). |
| `rc53-conservation` (TA-18) | Inchangé par R1 hormis la fusion voulue (neutralisée dans l'empreinte, vérifiée par TA-04). |

### Tests existants ajustés (justification)

| Test | Ajustement |
|---|---|
| Scénario A (4 semaines) | Première hausse de charge revenue dans les 4 semaines (R1, TA-01). |
| `strength-s4-adversarial` (continuité) | Le Pallof press, accessoire non suivi, passe de Haut A à Haut B en semaine 4 (emplacement tronc omis, cause « volume » tracée) : vérifié présent dans la semaine plutôt que dans une séance donnée. |
| Registre (`f6`, `l1v3`, `l1b4`, `journey`, `rc51-ab`, `rc53-r4`) | Contenu courant 0.10.0 ; R4 0.9.0 conservé. |
| Rapports et fixtures | Scénarios A (avec et sans RIR), banc qualité, documents du registre scientifique, fixtures E2E : régénérés (tracks partagées). |

## 4. Limites

Mêmes hypothèses de simulation que le lot R4 (`RC5.3-LOT-R4.md` § 5). La fusion choisit la track la plus récemment
exposée : sa prescription peut être en retard d'une exposition sur l'autre (aucune valeur fusionnée, aucun maximum).
