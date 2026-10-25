# RC5.3 — Lot R2 : réussite exacte, essais de charge et de répétitions

> Branche de développement `claude/kairo-rc4-dev` uniquement. Aucun déploiement. Lot appliqué après R4 et R1.
> Extension aux répétitions validée le 2026-10-25.

## 1. Ce qui est implémenté

| Règle | Implémentation |
|---|---|
| Contenu versionné | Ruleset `0.11.0-strength-rc53-r2`, surcouche du lot R1 (R1 `0.10.0`, R4 `0.9.0` et antérieurs conservés au registre). Politique : `exactSuccess` (2 réussites exactes pour l'intermédiaire, 3 pour l'avancé, +1 sans RIR saisi), `probes` (répétitions incluses, refus de repli 4 semaines). |
| R2.1 Réussite exacte | Principal autorégulé, exposition non modifiée, RIR déclaré = cible : la décision jusque-là « bloquée » devient **un pas de charge** au seuil du niveau (trace `ADVANCED` cause `exact_success`). Débutant : modèle linéaire inchangé. Plafond du cycle respecté. |
| R2.2 Essais | Toute hausse — charge (tous modèles) **ou répétitions** (double progression) — est un essai (`probe` : prescription d'avant la hausse). Exposition probante réussie : confirmé. En dessous / partielle : **retour à la dernière prescription réussie** (charge et répétitions), maintien compté, trace `PROBE_REVERTED`, **jamais de baisse de charge** au-delà de cette prescription. |
| R2.3 Refus | Le niveau refusé (charge ou répétitions) n'est pas retenté : maintien `probe_refused` (aucun compteur d'échec). Expiration au prochain cycle (lot R3) ; sans mésocycle, après 4 semaines. |
| Vraie baisse de performance | Toujours détectée par les règles communes : **deux** expositions en dessous À la prescription réussie (aucun essai en cours) ⇒ régression. Un essai annulé remet le compteur « en dessous » à zéro (ce n'est pas un échec de la prescription réussie). |
| Séance modifiée, décharge, données absentes | L'essai reste **en attente** : ni validé, ni annulé (R4). |
| Données | Champs facultatifs `probe` et `probeRefused` sur la track : les états existants sont relus et réécrits à l'identique (TA-18). |

## 2. Oscillation du pec deck : corrigée

Pec deck, S4 (24 semaines, athlète à capacité cachée) — charge en semaine 12 / 24, baisses de charge :

| Athlète | Avant RC5.3 | R4 + R1 | R4 + R1 + R2 |
|---|---|---|---|
| Intermédiaire progressant | 40 / 45 kg, 1 baisse | 35 / 45 kg, 3 baisses | **40 / 45 kg, 0 baisse** |
| Avancé progressant | 35 / 35 kg, 2 baisses | 35 / 40 kg, 4 baisses | **40 / 40 kg, 0 baisse** |
| Débutant stable | 35 / 35 kg, 2 baisses | 35 / 40 kg, 4 baisses | **40 / 40 kg, 0 baisse** |
| Intermédiaire stable | 35 / 35 kg, 2 baisses | 35 / 40 kg, 4 baisses | **40 / 40 kg, 0 baisse** |

L'oscillation existait déjà avant RC5.3 (avancé, stables) ; R1 l'avait accélérée. Avec R2, l'essai de répétitions
non confirmé revient aux répétitions réussies à 40 kg ; l'essai à 45 kg non confirmé revient à 40 kg au haut de plage.

## 3. Résultats (24 semaines, 216 simulations)

Tableaux complets : `rc53-etudes/lot-r2-vs-r1.md` (effet propre de R2) et `rc53-etudes/lot-r2-vs-reference.md`
(R4 + R1 + R2 contre le code d'avant RC5.3).

### Contre le code d'avant RC5.3 (tous profils)

| Athlète | Niveau | Régressions | Écart accessoires S24 | Gain principaux 24 sem. (réel) |
|---|---|---|---|---|
| Progressant | Débutant | 41 → **0** | −13,9 → −12,6 % | +11,3 → +10,2 % (+34,5) ⚠ |
| Progressant | Intermédiaire | 105 → **27** | −6,1 → **−4,5 %** | +12,9 → +11,9 % (+17,2) |
| Progressant | Avancé | 156 → **36** | −2,8 → **−1,3 %** | +11,5 → +11,5 % (+9,2) |
| Stable | Débutant | 322 → **54** | −2,4 → −1,8 % | +6,8 → **+3,1 %** (0) |
| Stable | Intermédiaire / avancé | 176 / 177 → **60 / 69** | −1,5 / −1,4 → +1,2 / +0,3 % | +2,5 → +2,5 % (0) |
| Fatigué | Intermédiaire | 176 → **14** | −8,7 → **−3,9 %** | +9,0 → **+11,6 %** (+17,2) |
| Fatigué | Avancé | 221 → **31** | −8,2 → **−2,1 %** | +3,7 → **+7,8 %** (+9,2) |
| Stagnation | Intermédiaire / avancé | 157 / 177 → **58 / 62** | −3,7 / −3,7 → −0,9 / −1,2 % | +7,5 / +7,0 → +7,8 / +7,8 % (+6,0 / +3,2) |

- **Répétitions** : beaucoup moins de pas de répétitions (ex. intermédiaire progressant 1 180 → 753) : la référence
  multipliait montées et redescentes ; les accessoires restent maintenant au plus près de la capacité réelle.
- **Hausses injustifiées** : 26 → 18 (R1) → **16**.
- Démarrages 72 / 72 identiques ; 6 624 séances ; 0 dépassement de durée ; R-A 6 624 / 6 624 ; plancher de volume
  2 401 → 2 406.

### Régressions restantes

1. **Principaux : gain toujours limité par le plafond permanent de +15 %** (débutant progressant +10,2 % pour +34,5 %
   réels). Correction prévue au **lot R3** (plafond par cycle, réévaluation).
2. **Multisport : squat et soulevé roumain toujours à 40 kg** (expositions toutes allégées) : lot R3 (état « progression
   non évaluable », réévaluation des tracks linéaires).
3. **Débutant stable** : principaux un peu sous la charge idéale (−2,6 % contre +0,9 %) : chaque essai annulé le garde
   un pas sous sa limite. Écart d'un pas, sans régression.
4. **Stagnation avancé** : gain des principaux à 12 semaines +7,0 → +9,8 % (réel +3,2 %), revenu à +7,8 % à 24 semaines :
   les réussites exactes poussent jusqu'au refus. Les essais annulés le contiennent ; à surveiller avec R3.

## 4. Tests

| Fichier | Cas |
|---|---|
| `packages/strength/tests/unit/rc53-r2.test.ts` (16) | 1 réussite exacte (intermédiaire, avancé, effort inconnu, sans politique, plafond, séance modifiée) ; 2–3 essai de charge confirmé / annulé, refus et expiration ; 4–5 essai de répétition confirmé / annulé, refus ; 6 stagnation réelle (deux expositions en dessous ⇒ régression), compteur remis à zéro après annulation ; 7–8 fatigue (séance adaptée), séance modifiée réussie, décharge : essai en attente ; 9 grands paliers (machine 5 kg) : retour à 40 kg au haut de plage, jamais 35 kg. |
| `packages/strength/tests/unit/rc53-r4.test.ts` (+3, point 4 de la demande) | Séries retirées par manque de temps : prescription intacte (non marquée, preuve ordinaire) ; exposition insuffisante (interrompue, sans données : aucune décision ni compteur) ; fatigue / interférence modifiant réellement l'effort (marquée). |
| `packages/app-core/tests/rc53/rc53-r2.test.ts` (4) | 12 semaines, athlète à capacité cachée : pec deck et leg extension jamais sous leur charge de départ ; essais annulés bornés ; principaux au-dessus du départ ; athlète stable contenu à deux pas. |

### Tests existants ajustés

| Test | Ajustement |
|---|---|
| `strength-s4-adversarial`, `strength-s5-effort` | « Réussite exacte ⇒ décision bloquée » devient « un pas après 2 réussites exactes observées, 3 sans RIR » (R2.1, constat C2 corrigé). |
| `rc51-ab` (profils hors hypertrophie) | Composition, séries, démarrages, volumes et charge de départ identiques ; durée à ± 2 min ; l'évolution des charges est mesurée par le banc RC5.3. |
| Registre, rapports, fixtures | Contenu courant 0.11.0 ; scénarios A, banc qualité, registre scientifique, fixtures E2E régénérés. |

## 5. Limites

Hypothèses de simulation : voir `RC5.3-LOT-R4.md` § 5. L'expiration de repli du refus (4 semaines) ne sert qu'en
l'absence de mésocycle ; elle sera remplacée par la frontière de cycle au lot R3.
