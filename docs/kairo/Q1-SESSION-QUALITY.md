# Q1 — qualité des séances générées (audit)

Base : `ec55a61` (M3.1). Q1 n'est pas un moteur : c'est un **diagnostic de lecture**. Il reçoit une prescription déjà composée et produit des critères et un verdict. Il ne choisit, ne modifie et ne réécrit rien.

```
MOTEUR SPORTIF → PRESCRIPTION → DIAGNOSTIC DE QUALITÉ → PLANIFICATEUR / M3 → EXÉCUTION
```

## 1. Réponse courte

**Aucune séance générée par KAIRO n'a aujourd'hui une qualité sportive démontrée.** Toutes sont techniquement valides et reçoivent `UNRESOLVED`, avec une seule cause : aucune règle des quatre moteurs n'est approuvée.

| Sport | Valeurs utilisées |
|---|---|
| Strength | `draft`, provisoires, hypothèse interne |
| Running | 38 valeurs `EXPERT_PROPOSED` (candidates), 10 non résolues |
| Cross-training C3 | TEST_ONLY, présentées comme `EXPERT_PROPOSED` |
| HYROX H2 | TEST_ONLY, `draft` |

Une séance techniquement valide reçoit donc `UNRESOLVED` : c'est préférable à une fausse validation.

## 2. Architecture

| Couche | Emplacement | Contenu |
|---|---|---|
| CORE (générique) | `packages/engine/src/quality/` | verdicts, statuts, bases, verdict mécanique, base lue dans les seuls champs structurés des paramètres, critères génériques (intégrité, durée p90 ≤ disponible) |
| HYROX H2 | `packages/hyrox/src/h2/quality.ts` | rôle ↔ structure ↔ stations, totaux, charges, time cap, technicité, accumulation, course |
| Cross-training C3 | `packages/crosstraining/src/c3/quality.ts` | format ↔ stimulus, équilibre et redondance, dose et tours estimés, densité, répétition, technicité |
| Strength, Running (gelés) | `packages/planner/src/ports.ts` | critères génériques + lecture de leurs propres traces (aucune règle réécrite) |
| Planificateur | `planner.ts` | diagnostic de chaque prescription générée (placée ou composée mais non placée), avant M3 |
| app-core | `planning.ts`, `beta0*.ts` | persistance compacte (`verdict` + `critère\|statut\|base`), vue, garde de démarrage |

**Verdict (aucun score, aucune pondération)** :
- un critère bloquant ⇒ `BLOCKED` ;
- sinon un critère non démontré ⇒ `UNRESOLVED` ;
- sinon un avertissement ⇒ `ACCEPTABLE_WITH_WARNINGS` ;
- sinon `ACCEPTABLE`.

**Base d'un critère** (provenance du jugement, jamais un texte libre) :
- `DERIVED` : vérification mathématique ou définitionnelle ;
- `APPROVED` : statut `approved`, non provisoire, approbation enregistrée ;
- `EXPERT` : consensus d'experts non approuvé ;
- `PROVISIONAL` : valeur non approuvée ;
- `TEST_ONLY` / `SIMULATION_ONLY` : valeur de démonstration, déclarée par l'environnement d'exécution ;
- `UNRESOLVED` : aucune règle ni valeur.

Un critère qui dépend de valeurs non approuvées est toujours `UNRESOLVED`, jamais `PASS`.

## 3. Qualité démontrée : définition

Une séance a une qualité démontrée si son verdict est `ACCEPTABLE` ou `ACCEPTABLE_WITH_WARNINGS`. Il faut pour cela que chaque critère soit `PASS` (ou `WARNING`) sur une base `DERIVED` ou `APPROVED`. **Aucune plage de qualité approuvée n'existe aujourd'hui** : aucun critère gouverné ne peut donc passer.

## 4. Les deux cas observés sur téléphone

### HYROX — Endurance de force

Séance : 4 tours de farmer walk 100 m @ 24 kg et de fentes sandbag 50 m @ 10 kg, time cap 1702 s.

| Calcul | Valeur |
|---|---|
| Totaux | farmer 400 m @ 24 kg ; fentes 200 m @ 10 kg ; 8 passages |
| Durée estimée | typique 1093 s, lente 1480 s |
| Time cap | estimation lente × 1,15 = 1702 s |
| Transitions | 7, durée non chiffrée |

Provenance :
- `structureVolume` : volume 4×3 essayé puis écarté (troisième station impossible : `STATIONS_UNFILLED:2/3`), 4×2 retenu ;
- stations : choix départagé **par identifiant** parmi des stations de même pertinence ;
- doses, charges, tours, débits : tous TEST_ONLY.

**Seule preuve** : la cohérence DÉFINITIONNELLE (structure admise pour le rôle, stations chargées). Le reste vient de paramètres TEST_ONLY.

### Cross-training — AMRAP 12 min

Séance : SkiErg 250 m, 15 squats, 8 tractions élastique.

Pourquoi ces choix :
- **AMRAP** : format admis pour `mixed_modal_medium`, le moins récemment utilisé ;
- **12 min et doses** : `ct.dose.construction` (TEST_ONLY) ;
- **mouvements** : classement « non récent, coût technique, pertinence catalogue, identifiant ». Le SkiErg n'est choisi que parce que le rameur (pertinence 3) a été utilisé récemment.

Estimation : 3,6 à 6,1 tours (débits TEST_ONLY). Aucune redondance. **Qualité non démontrée.**

## 5. Composée mais non placée, M3, BALANCED

- **Même prescription ⇒ même diagnostic**, placée ou non (tests F, A22, Q-A3).
- **« Faire maintenant »** ne contourne jamais une qualité `BLOCKED` (`QUALITY_BLOCKED`).
- **Séance `UNRESOLVED`** : elle reste exécutable selon la règle produit EXISTANTE de la Beta 0 (séances provisoires explicitement acceptées au profil). Ce n'est pas une décision Q1 : le statut de cette règle pour la production reste UNRESOLVED.
- **M3** ne lit ni ne change aucun diagnostic. Une séance déplacée est re-diagnostiquée sur SA prescription (A26).
- **BALANCED** fait tourner les rôles H2 : ce n'est **pas** une preuve de qualité. Un même rôle donne le même verdict, en spécialisé comme en équilibré (scénario E, A28).

## 6. Rapports

- `packages/planner/tests/q1/__reports__/q1-quality-audit.md` : tableaux « séances » et « décisions et provenance », scénarios A, B, C, D, F, G, J, rôles H2 et formats C3.
- `packages/app-core/tests/q1/__reports__/q1-app.md` : scénarios E, H, I.

## 7. Dettes et décisions humaines

1. Approuver, avec leurs sources, des **plages de qualité** par rôle H2 et par stimulus / format C3 (doses, tours, nombre de stations, équilibre des patterns).
2. Statut des séances `UNRESOLVED` en production : bloquées, ou autorisées sous avertissement ?
3. Départage des stations HYROX et des mouvements CT **par identifiant** : faut-il un critère sportif à la place ?
4. Persister avec la séance Running les valeurs candidates utilisées (aujourd'hui, la base Running du diagnostic est inconnue).
5. Mode d'exécution des moteurs : le mode du planificateur (`PRODUCTION`) n'est pas transmis aux contextes HYROX / Cross-training. C'est l'appelant qui le fournit (app-core : cohérent) : risque d'incohérence pour tout autre appelant.
