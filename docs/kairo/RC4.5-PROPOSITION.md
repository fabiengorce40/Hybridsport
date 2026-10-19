# REKKA — Proposition RC4.5 (à valider avant toute implémentation)

| | |
|---|---|
| **Base** | `9d6440a` (RC4.4 clôturé), branche `claude/kairo-rc4-dev` |
| **Statut** | Proposition seulement. Aucun code n'est écrit avant votre accord. |
| **Règles reconduites** | Aucune fusion vers TEST ou production, aucun déploiement. Aucun nouveau champ persisté sans migration et repli présentés. Aucune valeur sportive inventée. Autorisation Running non élargie. |

La feuille de route (`REPRISE-RC4-ROADMAP.md` §5) consacre RC4.5 à la **Musculation : équilibre, couverture, variation** (F4, F5, F6, F8). Je propose d'abord de solder les corrections issues de RC4.4, qui ne demandent aucune décision sportive, puis de traiter les anomalies Musculation selon vos décisions R6, R7 et R9.

---

## 1. Priorités

| Ordre | Bloc | Décision sportive nécessaire | Persistance |
|---|---|---|---|
| **1** | Corrections RC4.4 (C1–C4) | Non | Aucune |
| **2** | F5 — volume au-dessus de la borne haute | R7a (statut seulement) | Aucune (calcul) |
| **3** | F6 — mollets jamais programmés | R7b | Aucune (contenu provisoire) |
| **4** | F8 — variation intra-semaine | R9 | Aucune |
| **5** | F4 résiduel — quadriceps P1 (7,2 séries pour une cible de 10) | R6 | Selon l'option |
| **6** | Lot C — **conception** de la migration et du repli (aucun code) | D7 | Présentée seulement |

Hors RC4.5 :
- F7 et F13 (progressions Musculation, Cross-training, HYROX), prévues en RC4.6 ;
- l'intégration RC4 → TEST, qui demande un accord de déploiement.

---

## 2. Corrections nécessaires (issues de RC4.4)

### C1 — Expliquer les déplacements G5 dans le Planning (dette T1)
- **Constat :** une séance déplacée par G5 porte `PLAN.PLANNER.GLOBAL_PLACEMENT_APPLIED` (jour d'origine, jour retenu, Full Body avant et après), mais l'interface ne l'affiche pas.
- **Proposition :** une phrase lisible sur la carte de séance, sur le modèle des raisons M3 (`data-m3`), par exemple : « Déplacée du mardi au jeudi pour éviter deux Full Body à la suite. »
- **Garanties :** aucun code interne affiché ; test DOM.
- **Persistance :** aucune (raison déjà persistée).

### C2 — Mesurer le coût de G5 sur un téléphone (dette T2)
- **Mesure :** temps de planification d'une semaine P2 (pire cas : 6 candidates refusées) dans l'E2E, avec ralentissement CPU Chromium ×4 et ×6 (profil d'un téléphone moyen).
- **Seulement si la mesure dépasse un seuil que vous fixez** (par exemple 3 s) :
  - réutiliser les profils de demande calculés pour l'évaluation rapide ;
  - ou réduire `maxCandidates` (paramètre gouverné, sans changer le code).
- **Garantie :** même résultat exigé (banc identique).

### C3 — Hygiène du code (dettes T3, T4)
- `week-load.ts` : importer les codes de raison du planificateur au lieu de chaînes littérales.
- Exporter `planCore` par l'index du planificateur, ou garder l'import interne en le documentant.
- **Critère :** aucun changement de comportement, banc identique.

### C4 — Durée des tests (dette T5)
- Mutualiser les simulations 6 semaines identiques dans un même fichier (calcul unique par profil).
- **Critère :** mêmes assertions, durée mesurée avant et après.

---

## 3. Améliorations Musculation (selon vos décisions)

### F5 — Volume au-dessus de la borne haute déclaré « atteint » (R7a)
- **Constat :**
  - bras 16–18 séries pour une borne haute de 14 ;
  - épaules jusqu'à 18,5 pour 16 ;
  - statut affiché : « atteint ».
- **Option proposée (minimale) :**
  - nouveau statut **« au-dessus de la borne haute »** dans le bilan hebdomadaire du moteur Musculation, avec la borne existante du ruleset ;
  - affichage seulement : **aucune réduction automatique**.
- **Option étendue (sur décision) :** utiliser ce statut pour orienter la sélection des accessoires. Cela relève du même mécanisme que F6.
- **Persistance :** aucune (statut calculé).

### F6 — Mollets jamais programmés (R7b)
- **Cause :** les mollets ne passent que par le créneau facultatif `fb.iso_lower`, toujours attribué au leg curl (contenu provisoire).
- **Options :**

  | Option | Contenu | Effet attendu |
  |---|---|---|
  | **a** | Sélection orientée vers le groupe le plus en déficit pour les créneaux d'isolation facultatifs (règle du moteur, gouvernée) | Mollets ≥ 1 exposition par semaine si le créneau est disponible |
  | **b** | Créneau dédié aux mollets dans le contenu provisoire (Full Body et Bas du corps) | Exposition garantie, durée de séance en hausse |
  | **c** | Aucun changement, statut « non couvert » affiché | Transparence seulement |

- **Recommandation :** option **a**. Elle s'appuie sur la cible déjà déclarée (4 séries) et ne crée pas de créneau.

### F8 — Variation intra-semaine perdue après la semaine 1 (R9)
- **Constat :** Full Body A · B · C en semaine 1, puis A · B · A ; Haut / Bas : la même séance deux fois.
- **Cause :** les pistes de progression ancrent les exercices ; la règle de variation (TEST_ONLY) n'est pas appliquée.
- **Options :**
  - appliquer la variation gouvernée quand deux séances de la semaine partagent le même gabarit, **à volume identique par groupe** (garde existante de RC4) et sans casser les pistes ;
  - ou conserver l'ancrage, avec un avertissement.
- **Point de vigilance :** l'interaction avec la progression (F7, RC4.6). Une variation ne doit pas remettre une piste à zéro.

### F4 résiduel — quadriceps en P1 (R6)
- **Constat :** après G5, en moyenne :
  - quadriceps 7,2 pour une cible de 10 : **seul groupe du bas du corps encore sous la cible** ;
  - ischio-jambiers 8,5 (cible 8) et fessiers 11,5 (cible 6) : désormais dans la cible.
- **Options :**
  - priorité du volume bas du corps selon l'objectif déclaré (prise de masse) quand la course voisine est faible ;
  - ou statu quo avec le déficit affiché (lot D étendu à la semaine).
- **Persistance :** une compensation semaine par semaine exigerait un champ nouveau, donc une migration à présenter d'abord.

---

## 4. Lot C — présentation de la migration seulement

Présenter, sans coder :
- le champ « maintien volontaire » ;
- sa migration ;
- la compatibilité avec la branche de repli RC1 (`0cf2ceb`), c'est-à-dire la liste fermée des champs retirés à la lecture ;
- les tests de relecture.

Il ne serait implémenté qu'après votre validation séparée.

---

## 5. Décisions demandées

| # | Question | Options | Recommandation |
|---|---|---|---|
| **R7a** | Statut « au-dessus de la borne haute » | Affichage seul / orientation de la sélection | Affichage seul |
| **R7b** | Mollets | a / b / c (§3) | a |
| **R9** | Variation intra-semaine | Appliquer à volume identique / garder l'ancrage | Appliquer à volume identique |
| **R6** | Bas du corps P1 | Priorité selon l'objectif / statu quo avec déficit affiché | À arbitrer après F5–F8 (leurs effets peuvent suffire) |
| **P-V** | Régénérer les semaines non commencées pour G5 (version de planification) | Oui / non | Non tant que RC4 n'est pas intégré à TEST |
| **S-L** | Seuil de « longue suite » de jours consécutifs | Valeur / aucun | Aucun sans référence sportive |
| **C2** | Seuil de temps acceptable sur téléphone | Valeur | 3 s par semaine planifiée |

---

## 6. Critères de validation et de non-régression

- **Banc RC4 (6 profils × 6 semaines) comparé à `9d6440a` :**
  - seuls les profils et les groupes visés changent ;
  - toute autre différence est expliquée ou bloquante.
- **C1, C3, C4 :** banc strictement identique.
- **F5 :** statut affiché ; volumes prévus identiques si l'option « affichage seul » est retenue.
- **F6 (option a) :**
  - mollets ≥ 1 exposition par semaine quand un créneau d'isolation est disponible ;
  - aucun groupe en déficit ne baisse ;
  - durée des séances inchangée.
- **F8 :** séances différentes à volume par groupe identique ; pistes de progression conservées.
- **Running :** structures identiques ; tests RC4.1 et RC4.3 inchangés.
- **Persistance :**
  - aucun nouveau champ ;
  - relecture des fixtures RC1 identique ;
  - branche de repli non modifiée.
- **Validation complète :** `pnpm check`, `pnpm kairo:build` et E2E (avec la mesure C2), puis un rapport `RC4.5-REPORT.md`.

En attente de votre accord et de vos décisions avant de commencer.
