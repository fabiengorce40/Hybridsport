# Dette technique CORE : dépassement flottant des parts d'énergie de l'empreinte

**Statut : OUVERT, non corrigé.** Le CORE est gelé. Ce document décrit le défaut ; il ne le corrige pas. Toute correction est une modification du CORE à arbitrer séparément.

| Champ | Valeur |
|---|---|
| Composant | `packages/engine/src/duplicate/fingerprint.ts` (`buildFingerprint`) ; schéma `zFingerprintInputs` (`packages/domain/src/duplicate.ts`) |
| Découvert par | `packages/crosstraining/tests/spike/c2-replay-energy-shares.test.ts`, test V3 (Decision Gate Cross-training, annexe J) |
| Gravité | Faible en usage nominal ; incohérence de contrat (voir Risque) |

## Reproduction

Moteur de test proposant une séance valide avec :

```ts
fingerprintInputs.energy = { low: Number.MAX_VALUE, moderate: Number.MAX_VALUE, high: 0 }
```

puis `runSportSession` avec un ruleset contenant les paramètres anti-doublon. Le test V3 de `c2-replay-energy-shares.test.ts` fige ce comportement.

Mécanisme (`fingerprint.ts`) :

```ts
const energyTotal = inp.energy.low + inp.energy.moderate + inp.energy.high;   // = Infinity
if (!(energyTotal > 0)) problems.push(... 'répartition énergétique nulle' ...); // Infinity > 0 : passe
energy: { low: inp.energy.low / energyTotal, ... }                                // = 0, 0, 0
```

## Comportement observé (mesuré)

1. Chaque part passe le schéma (`z.number().nonnegative()` : `MAX_VALUE` est fini).
2. La somme vaut `Infinity` et passe le contrôle `> 0`.
3. L'empreinte est **acceptée**, séance identique, avec `energy = {0, 0, 0}` (somme 0).
4. Réinjectée comme parts historiques d'un rejeu, cette empreinte est **refusée** (`TECHNICAL.STRUCTURE_INVALID` « répartition énergétique nulle »).

## Comportement attendu

L'invariant implicite de l'empreinte est que les parts stockées somment à 1. Une entrée dont la somme n'est pas un nombre **fini** strictement positif doit être refusée **à la construction**, avec la même raison technique qu'une somme nulle. Elle ne doit jamais produire une empreinte que le CORE refuserait ensuite.

## Risque

- **Incohérence** : le CORE produit une empreinte qu'il déclarerait lui-même invalide en entrée.
- **Anti-doublon** : `1 − ½·Σ|Δ|` entre `{0, 0, 0}` et un vecteur normalisé vaut ½, une similarité artificielle sur la composante `energy`.
- **Historique** : une empreinte `{0, 0, 0}` stockée ne pourrait pas servir de source de parts à un rejeu.
- **Probabilité** : très faible, car seul un moteur qui fournit des parts proches de `Number.MAX_VALUE` déclenche le cas. Aucun moteur actuel (Strength : paramètre ; Running : `energyOf`) ne le fait à notre connaissance ; non vérifié exhaustivement.

## Correction candidate la plus locale (non appliquée)

Dans `buildFingerprint`, remplacer la condition :

```ts
if (!(energyTotal > 0))
```

par :

```ts
if (!(Number.isFinite(energyTotal) && energyTotal > 0))
```

Cette correction garde la même raison (`TECHNICAL.STRUCTURE_INVALID`), avec un libellé éventuellement précisé (« répartition énergétique nulle ou non finie »). Elle ne change pas le schéma de domaine. Aucune autre modification n'est nécessaire : la division par une somme finie strictement positive produit des parts finies dont la somme vaut 1 (idempotence mesurée, annexe J-E2).

Alternative non locale, non recommandée ici : borner chaque part dans `zFingerprintInputs`. C'est une modification de contrat de domaine, qui touche tous les moteurs.

## Tests nécessaires (lors de la correction)

1. **CORE, unitaire** (`buildFingerprint`) : `{MAX_VALUE, MAX_VALUE, 0}` ⇒ `ok: false`, raison `TECHNICAL.STRUCTURE_INVALID`.
2. **CORE, unitaire** : non-régression. `{MAX_VALUE, 0, 0}` (somme finie) ⇒ accepté, parts `{1, 0, 0}` ; `{0, 0, 0}` ⇒ refus inchangé ; `Number.MIN_VALUE` ⇒ accepté `{1, 0, 0}`.
3. **CORE, propriété** (fast-check) : pour tout vecteur de parts finies non négatives de somme finie > 0, l'empreinte est acceptée, somme 1 à la précision flottante, et renormaliser les parts obtenues redonne exactement les mêmes parts ; sinon refus.
4. **Pipeline** (`runSportSession`) : la proposition fautive est refusée (`NO_VALID_SOLUTION`, raison dans la trace) et jamais réparée.
5. **Spike Cross-training** : mettre à jour l'assertion V3 de `c2-replay-energy-shares.test.ts`, qui fige aujourd'hui le comportement fautif, pour attendre le refus.
6. **Mutation** : la condition `Number.isFinite` doit être tuée par le test 1.

Le test d'architecture Cross-training vérifie que le CORE est inchangé depuis la baseline : la correction exigera une mise à jour de baseline, validée explicitement.
