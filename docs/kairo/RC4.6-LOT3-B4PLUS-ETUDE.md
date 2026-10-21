# RC4.6 — Lot 3 : étude B4+ compacte (Cross-training, HYROX)

**Statut :** étude en **copie jetable**, **rien n'est intégré**. Patch et mesures : `docs/kairo/rc46-audit/etudes/lot3-b4plus-*`.

## 1. Ce que Cross-training et HYROX lisent réellement

| Sport | Entrées lues à la génération | Forme réellement consommée par le moteur |
|---|---|---|
| Cross-training | Séances Cross-training de la semaine (toutes dates), et, pour le bloc de force délégué, séances de Musculation et autres blocs | `plannedSessions` : prescription CT, stimulus et date de chaque séance CT. Empreintes anti-doublon. Pour le bloc délégué : exercices, séries de travail, archétype et empreinte des séances de force. |
| HYROX | Séances HYROX de la semaine (toutes dates) | Expositions H2 (`h2ExposureOf`) et empreintes anti-doublon. |

**Le moteur ne lit jamais la séance entière : il lit une projection calculée par le port.**

## 2. Représentations comparées (6 semaines, 6 profils avec Cross-training ou HYROX)

| Représentation | Principe |
|---|---|
| **R0 — séances complètes** | Persister les séances lues (B4+ complet de l'étude L2-bis). |
| **R1 — projection** | Persister la projection consommée par le moteur (ci-dessus), pour chaque séance. La régénération la relit à la place des séances de la semaine. |
| **R2 — projection si périmée** | R1, seulement quand la projection lue diffère de celle de la semaine finale. |
| **R3 — projection si nécessaire** | R1, seulement quand la régénération avec la semaine finale **ne reproduit pas** la séance (vérifié en fin de planification). |
| **R4 — empreinte seule** | Condensé des entrées lues (16 octets) : détecte l'écart, ne permet pas de reproduire. |

## 3. Résultats

| Profil | Séances CT / HYROX | Divergences R-A (réf.) | R1, R2, R3 : divergences | Projection périmée | Coût R0 | Coût R1 | Coût R2 | Coût R3 | Coût R4 |
|---|---|---|---|---|---|---|---|---|---|
| P2 (CT 2×) | 12 CT | 0 | 0 | 6 | 314 Ko (47 %) | 97 Ko (15 %) | 49 Ko (7,4 %) | **0** | 0,2 Ko |
| P2F (CT force 2×) | 12 CT | **1** | **0** | 6 | 309 Ko (45 %) | 114 Ko (16 %) | 56 Ko (8,1 %) | **10 Ko (1,5 %)** | 0,2 Ko |
| Consolidation (CT force 1×) | 6 CT | 0 | 0 | 0 | 126 Ko (22 %) | 37 Ko (6,4 %) | 0 | **0** | 0,1 Ko |
| P3 (HYROX 2×) | 12 HYROX | **1** | **0** | 6 | 21 Ko (3,7 %) | 12,6 Ko (2,2 %) | 6 Ko (1,1 %) | **1,1 Ko (0,2 %)** | 0,2 Ko |
| P4 (Course + HYROX) | 12 HYROX | 0 | 0 | 5 | 21 Ko (7,6 %) | 12,8 Ko (4,7 %) | 5,3 Ko (1,9 %) | **0** | 0,2 Ko |
| P5 (4 sports) | 6 CT, 6 HYROX | 0 | 0 | 1 CT | 112 Ko (17 %) | 33 Ko (5,0 %) | 5,4 Ko (0,8 %) | **0** | 0,2 Ko |

- Pourcentages : part de l'état persisté au bout de 6 semaines.
- La référence vérifie la mesure : les divergences de régénération avec la semaine finale sont exactement les divergences R-A.

## 4. Comparaison

| Critère | R0 complet | R1 projection | R2 si périmée | **R3 si nécessaire** | R4 empreinte |
|---|---|---|---|---|---|
| **Exactitude** | Exacte | Exacte (0 divergence, dont les 2 cas de référence) | Exacte | Exacte | **Non** : détecte seulement |
| **Taille** | Inacceptable (+22 à +47 %) | Forte en CT (+5 à +16 %) | Moyenne (+0,8 à +8 %) | **≤ 1,5 %**, nulle sans divergence | Négligeable |
| **Compatibilité historique** | Champ facultatif, repli comme B4 | idem | idem | idem, mais un changement **après** planification (déplacement manuel d'une séance de la semaine) peut rendre une séance non reproductible sans projection persistée | idem |
| **Impact M3** | Aucun (persistance seule) | Aucun | Aucun | **Aucun.** Le cas P3 est une séance déplacée par M3 : la projection fige les entrées réellement lues après l'arbitrage. | Aucun |
| **Complexité** | Faible | Moyenne : les ports CT et HYROX exposent leur projection et l'acceptent en entrée ; régénération app-core | Moyenne + comparaison en fin de planification | Moyenne + **une régénération de contrôle par séance CT / HYROX** retenue (coût de planification à mesurer) | Faible |
| **Maintenance** | — | Projection liée au format interne des moteurs (`plannedSessions`, expositions H2) : à versionner comme le contenu | idem | idem | — |

## 5. Recommandation

1. **R3 « projection si nécessaire »** est la meilleure option mesurée : exacte, coût nul dans 4 profils sur 6, au plus 1,5 % de l'état.
   - Point de vigilance : la projection doit être (re)calculée à chaque changement de la semaine après la planification, sinon le repli s'applique. Le seul cas identifié est le déplacement manuel d'une séance.
   - La régénération de contrôle doit se faire **une fois**, sur la semaine retenue, et non pour chaque organisation candidate G5.
2. **R1** si l'on préfère la robustesse sans contrôle : exacte et simple, mais +5 à +16 % d'état sur les profils Cross-training.
3. **R4** peut compléter le diagnostic R-A à très faible coût, en classant explicitement « entrées modifiées depuis la planification ». Elle ne rend pas la régénération exacte.
4. **R0 est exclue** (taille).
5. **Avant intégration :**
   - format de projection versionné (`v`) ;
   - lot de compatibilité comme B4 : anciens états relus à l'identique, repli explicite ;
   - mesure du coût de planification de R3.

**Aucune intégration avant votre décision.**
