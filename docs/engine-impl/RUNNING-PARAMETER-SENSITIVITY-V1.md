# RUNNING-PARAMETER-SENSITIVITY-V1 — sensibilité et tests aux bornes (5D)

> **Phase 5D (section T).** Pour chaque paramètre chiffré actif ou à forte influence :
> - valeur en dessous / candidate / au-dessus ;
> - pour les seuils, comportement **au voisinage de la borne**.
>
> **Type de réponse**
> - SMOOTH : la sortie varie continûment ;
> - ORDINAL : saut de catégorie à effet borné et documenté ;
> - DISCONTINUOUS : saut de prescription.
>
> **Une falaise non justifiée est un défaut.**

## 1. Tests aux bornes (seuils)

| Paramètre | Valeurs testées | Comportement | Type | Justification ou défaut |
|---|---|---|---|---|
| Mise à jour de performance (B2), P-R2 : 1 × V42 = 3 % | 2,9 / 3,0 / 3,1 % (amélioration observée, preuve COHERENT) | HOLD / HOLD / UPDATE_UP (MEDIUM) | ORDINAL | La nouvelle valeur (+3,1 %) reste dans la plage HIGH (±3 %) déjà prescrite : la cible bouge d’environ 1 % au plus. **Pas de défaut.** |
| Mise à jour (B2) : 2 × V42 = 6 % | 5,9 / 6,0 / 6,1 % | UPDATE_UP / UPDATE_UP / REQUEST_CALIBRATION | ORDINAL | Au-delà, aucune hausse sans test : l’effet est **plus prudent**, et la cible reste la précédente. **Pas de défaut.** |
| Conflit (B1), P-R2 : 2 × V42 = 6 % | 5,9 / 6,0 / 6,1 % | MINOR (enveloppe) / MINOR / MAJOR (estimation prudente + calibration) | ORDINAL | La borne prudente de la cible est identique dans les trois cas ; seules la confiance et la calibration changent. **Pas de défaut.** |
| Conflit (B1) : 1 × V42 = 3 % | 2,9 / 3,0 / 3,1 % | NONE / NONE / MINOR | SMOOTH | L’enveloppe s’élargit de façon continue avec l’écart. |
| V24 frontière LONG | 27 / 28 / 29 jours | MODERATE (dose ancrée, sans hausse) / LONG / LONG (≤ réalisé post-retour, sinon dose G1) | **DISCONTINUOUS** | Saut **vers le plus prudent** ; accepté **seulement comme frontière de sécurité conservatrice**, soumise à la décision G1. Signalé au dossier G1 (question sur un traitement en rampe). **Défaut potentiel, gouverné.** |
| V24 frontière SHORT | 7 / 8 jours | SHORT / MODERATE (références −1 bande, pas de test la 1re semaine) | ORDINAL | Effet borné (confiance −1). |
| V22 garde-fou (P-R0–1) | 129 / 130 / 131 % | WITHIN (si dans le contexte) / limite / proposition **plafonnée à 130 %** | SMOOTH (plafonnement) | La sortie est plafonnée, pas refusée : pas de falaise. |
| V12 récence | 8 / 9 semaines | RECENT (FULL ±3 %) / AGING (confiance −1 ⇒ BROAD ±6 %) | ORDINAL | Élargissement de la cible d’un palier ; effet borné ; **HIGH_SENSITIVITY** (C7). |
| V26 fréquence minimale | 1 / 2 / 3 séances | Mode maintien / programme structuré / programme structuré | ORDINAL | Règle de périmètre produit (B5). |
| V10 densité (P-R3) | 1 / 2 / 3 | Moins de LONG_RUN désignée / goldens 5C / une séance HD de plus | ORDINAL | Nature discrète des séances. |
| V11 séparation | Consécutif oui / non | Refus en V1 sauf exception demandée par le planificateur | ORDINAL | PRODUCT_GUARDRAIL (B6). |
| V02 plafond easy | RPE 3 / 4 | 4 : chevauche STEADY (3–5) | ORDINAL | Bandes volontairement chevauchantes (B8) ; combinées aux autres signaux. |

## 2. Sensibilité des valeurs (en dessous / candidate / au-dessus)

| Tag | En dessous | Candidate | Au-dessus | Effet sur les goldens | Type | Sens. |
|---|---|---|---|---|---|---|
| V42 | P-R2 2 % | 3 % | 4 % | R9 (écart 11 %) : MAJOR dans les trois cas ; des conflits plus fins basculent de catégorie | SMOOTH / ORDINAL | **HIGH** |
| V03 | 2 % / 4 % | 3 % / 6 % | 4 % / 8 % | Largeur des cibles R3, R5, R4 ; aucun changement d’éligibilité | SMOOTH | **HIGH** |
| V04 | 0–2 % | 0–5 % | 0–8 % | R5 seuil : 246–251 / 246–258 / 246–266 s/km | SMOOTH | **HIGH** |
| V38 exposant | 1,04 | 1,06 | 1,08 | R4 allure semi : 297 / 301 / 306 s/km, soit ±1,5 %, **à l’intérieur de la plage ±6 %** | SMOOTH | **HIGH** (famille), MED (exposant) |
| V02 | Bandes étroites | Bandes chevauchantes | Bandes très larges | Largeur des cibles en RPE seul (R6, R9) | SMOOTH | **HIGH** |
| V08 | Récupérations courtes | Candidates | Longues | Premières expositions et R11 seulement (le reste vient de l’historique) | SMOOTH | **HIGH** |
| V10 | voir §1 | | | | ORDINAL | **HIGH** |
| V12 | 4 / 8 sem. | 8 / 16 | 12 / 24 | R4 : le 10K à 6 semaines passe AGING à 4 semaines | ORDINAL | **HIGH** |
| V21 N | 3 | 4 | 6 | R4 : maximum démontré du long run 90 (N = 3 ou 4) ; avec N = 6, un maximum plus ancien pourrait être retenu | ORDINAL | MED |
| V22 | 115 % | 130 % | 150 % | R2 : 105 % ⇒ WITHIN dans les trois cas | SMOOTH | **HIGH** |
| V24 | voir §1 | | | | DISCONTINUOUS (gouverné) | **HIGH** |
| V27 | 41 % | plage 41–60 % | 60 % | R11 : volume 141,6 / 96,0–141,6 / 96,0 min | SMOOTH | **HIGH** |
| V28m | 2 sem. | 2–3 sem. | 3 sem. | Aucun golden marathon en taper (R6 à 14 semaines) | SMOOTH | MED |
| V15 | 2 / 1 | 3 / 2 | 5 / 3 | Fréquence des mises à jour sur observations | ORDINAL | MED |
| V06, V07, V09 | — | — | — | ±5 min par séance | SMOOTH | LOW / MED |

## 3. Défauts et falaises

| Constat | Statut |
|---|---|
| 3 % et 6 % constants de la 5C (falaises binaires) | **Corrigés** : remplacés par V42 et V43, ordinaux avec continuité de la borne prudente |
| V22 « refusé » | **Corrigé** : plafonnement |
| V24 à 28 jours | **Falaise conservatrice gouvernée** : question posée au dossier G1 (traitement en rampe près de la frontière, ou frontière maintenue) |
| V12 à 8 semaines | Palier ordinal accepté, HIGH_SENSITIVITY |

## 4. HIGH_SENSITIVITY restants

- **Chiffrés** : V02, V03, V04, V08, V10, V12, V22, V24, V27, **V38, V42, V43**.
- **Vides critiques** : V23, V31, V32 ; et V33, V34 (G1).
