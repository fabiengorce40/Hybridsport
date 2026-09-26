# 06 — I. Calcul de la durée réelle

## 1. Objectif

La durée affichée doit correspondre à la durée réellement vécue. Elle est **calculée** à partir des composants — jamais déclarée par un gabarit.

## 2. Modèle par composant

Toutes les valeurs par défaut sont des paramètres (ruleset + attributs `timing` des exercices), puis **calibrées par utilisateur**.

| Composant | Formule |
|-----------|---------|
| Série de force | `reps × secondsPerRep(exercice, tempo)` |
| Récupération entre séries | `restS` prescrit (les valeurs réelles observées alimentent la calibration) |
| Ramp-up | somme des séries de montée + récup courte (ex. 60–90 s) |
| Mise en place exercice | `setupSeconds` (rack, chargement barre, réglage machine) |
| Changement de charge | `plateChangeSeconds × nb de changements` |
| Transition entre exercices | `transitionSeconds` (déplacement, matériel), réduit si même station |
| Superset / circuit | `rounds × (Σ travail + Σ transitions internes) + (rounds − 1) × récup entre tours` |
| EMOM | `minutes` exactes |
| AMRAP | `timeCap` exacte |
| For Time | estimation du temps de réalisation par le **modèle de débit** de l'utilisateur (reps/min par mouvement selon niveau) plafonnée par le `timeCap` ; incertitude élevée ⇒ P90 = time cap |
| Intervalles | `n × (travail + récup)` − dernière récup |
| Course continue | `distance × allure cible` (ou durée prescrite) |
| Échauffement / retour au calme | durée prescrite par l'archétype (minimum incompressible) |
| Transition entre blocs | paramètre (ex. 60–180 s selon changement de matériel) |
| Brief / lecture consignes | petite constante par bloc nouveau |

## 3. Sortie : une distribution, pas un nombre

```ts
interface DurationEstimate {
  p50: number;              // durée affichée (arrondie à 5 min)
  p10: number; p90: number; // incertitude (surtout For Time, AMRAP à récup libre)
  breakdown: { blockId: string; p50: number }[];
  confidence: number;
}
```

Les composants incertains (For Time, récupérations « libres ») ont une variance ; l'incertitude est propagée par blocs (somme des moyennes, variance combinée).

## 4. Tolérance mesurable (proposition à valider)

Pour une durée cible `T` :

| Critère | Valeur par défaut |
|---------|-------------------|
| Écart de la médiane estimée | `|p50 − T| ≤ max(5 min, 10 % de T)` |
| Dépassement pessimiste | `p90 ≤ T + max(8 min, 15 % de T)` |
| Plafond de la disponibilité du jour | `p90 ≤ maxMinutes du jour` (**contrainte dure**) |
| Précision réelle (mesurée en production) | ≥ 80 % des séances terminées ont une durée réelle dans `T ± 15 %` |

Ex. `T = 60 min` ⇒ p50 ∈ [54, 66], p90 ≤ 69 min, jamais au-delà de la disponibilité déclarée.

## 5. Ajustement automatique à la durée cible

Si la séance construite ne respecte pas la tolérance, un **ajusteur déterministe** agit selon un ordre de priorité propre à l'archétype :

**Trop long** (on coupe d'abord ce qui compte le moins) :
1. Retirer le finisher optionnel.
2. Réduire les séries d'accessoires (jusqu'au minimum de l'archétype).
3. Passer des accessoires en superset (gain de temps sans perte de volume).
4. Réduire les récupérations dans la fourchette admissible (jamais sous le minimum du stimulus : un 3RM ne se fait pas avec 60 s de récup).
5. Réduire le volume du bloc secondaire.
6. En dernier recours, réduire le bloc principal — et le signaler (la séance change de nature).

Jamais : supprimer l'échauffement ou le descendre sous son minimum.

**Trop court** : ajouter dans l'ordre inverse (séries d'accessoires, bloc accessoire pertinent pour les objectifs, finisher), sans dépasser les budgets de volume/fatigue hebdomadaires. S'il n'y a rien de pertinent à ajouter, une séance plus courte est acceptée et affichée avec sa durée réelle (on ne remplit pas pour remplir).

## 6. Calibration personnelle

- Chaque séance réalisée enregistre `startedAt`, `endedAt`, horodatage de chaque série ⇒ durée réelle par bloc.
- Facteurs personnels mis à jour de façon bayésienne (lissage, bornés) : `restOverrunFactor`, `transitionFactor`, débit par mouvement (For Time).
- Les facteurs ne s'appliquent qu'après un nombre minimal d'observations (ex. 3 séances) pour éviter les réactions à une séance atypique.
- Métrique globale suivie : erreur absolue médiane de l'estimation par archétype ⇒ sert à corriger les valeurs par défaut du ruleset.
