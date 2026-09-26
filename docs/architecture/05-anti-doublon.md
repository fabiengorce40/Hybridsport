# 05 — H. Variété & anti-doublon

## 1. Principe

**Variété ≠ aléatoire.** L'objectif n'est pas de maximiser la nouveauté, mais d'éviter la **répétition non justifiée**.
Une répétition *voulue* (exercice ancre d'un cycle, benchmark retesté, séance de seuil hebdomadaire) est explicitement marquée et **exemptée** de pénalité — tout en restant mesurée.

## 2. Niveaux de similarité détectés

| Niveau | Question | Représentation |
|--------|----------|----------------|
| Exercice identique | Même `exerciseId` ? | Égalité |
| Mouvement équivalent | Même `equivalenceGroupId` (back squat ≈ front squat ≈ safety bar squat) ? | Groupe d'équivalence |
| Pattern moteur | Même pattern principal (squat, hinge, pull vertical…) ? | `patterns[0]` |
| Groupe musculaire | Chargement cumulé d'un groupe sur une fenêtre | Vecteur muscles pondéré |
| Combinaison d'exercices | Même ensemble (ou quasi) d'exercices dans une séance / un WOD | Jaccard pondéré sur les exercices et équivalences |
| Structure de séance | Même enchaînement de blocs / formats / volumes | Séquence de (kind, format, durée) |
| WOD similaire | Même format + domaine de temps + modalités + mouvements + schéma de reps | Empreinte WOD |
| Stimulus énergétique | Répartition des systèmes (aérobie/anaérobie/neural) trop monotone | Distribution sur la fenêtre |

## 3. Empreintes

```ts
interface ExerciseFeatures { id: string; eq: string; pattern: string; muscles: Record<string, number>; equipment: string[]; modality: 'G' | 'W' | 'M' | 'run' | 'erg'; }

interface SessionFingerprint {
  discipline: Discipline;
  archetype: string;
  exerciseIds: string[];               // ordonnés par importance
  equivalenceIds: string[];
  patternVector: Record<string, number>;  // volume par pattern
  muscleVector: Record<string, number>;   // charge par muscle
  structure: { kind: string; format: string; minutes: number }[];
  stimulus: { aerobic: number; anaerobic: number; neural: number };
  wod?: { format: WodFormat; timeDomain: 'short' | 'medium' | 'long'; modalities: string; repScheme: string };
}
```

## 4. Fonctions de similarité (déterministes, testées)

- **Exercice** : `1.0` identique · `0.8` même groupe d'équivalence · `0.5` même pattern et ≥ 60 % de recouvrement musculaire · `0.2` même pattern seul · `0` sinon. *(Valeurs = paramètres du ruleset.)*
- **Séance** : combinaison pondérée
  `S = w1·Jaccard(équivalences) + w2·cos(patternVector) + w3·sim(structure) + w4·sim(stimulus) + w5·[même archétype]`
- **WOD** : `S = w1·[même format] + w2·[même domaine de temps] + w3·Jaccard(mouvements pondérés) + w4·sim(schéma de reps)`

## 5. Mémoire d'exposition

- Historique des expositions par exercice / équivalence / pattern avec **décroissance** (demi-vie paramétrable, ex. 10 jours) : `exposure = Σ exp(-Δt / τ)`.
- Fenêtres glissantes : 7, 14, 28 jours.
- Inclut séances **planifiées à venir** ET **réellement réalisées** (une séance planifiée non faite ne compte pas comme exposition réelle, mais compte pour la structure du plan futur).

## 6. Utilisation dans le moteur

**(a) Pendant la génération — pénalité souple.**
Score d'un candidat exercice :
```
score = pertinence_objectif        (pattern/muscle requis par l'archétype)
      + continuité_progression     (ancre du cycle → bonus fort)
      + adéquation_niveau_matériel
      − pénalité_exposition        (exposition décroissante × similarité)
      − pénalité_fatigue_locale    (muscle encore fatigué)
      + départage déterministe     (PRNG à graine, uniquement à score égal ± ε)
```

**(b) Après génération — contrôles durs (validateur)** — exemples de valeurs par défaut, à valider par les spécialistes :

| Règle | Défaut |
|-------|--------|
| Même WOD (similarité ≥ 0,9) | interdit sur 21 jours, sauf retest de benchmark planifié |
| Même structure de séance non-ancre (≥ 0,85) | ≤ 2 fois / 14 jours |
| Même exercice accessoire | ≤ 2 séances / 7 jours |
| Même pattern en fatigue élevée | ≥ 48 h d'écart |
| Groupe musculaire | dans la fourchette de volume hebdo (ni trop, ni trop peu) |
| Stimulus (cross-training) | aucun domaine de temps > 50 % des metcons sur 14 jours |
| Course | pas deux séances de qualité du même type d'affilée si ≥ 2 qualités / semaine |

**(c) Exemptions explicites.**
Un `PlannedExercise` lié à une `ProgressionTrack` de type *ancre* ou un test/benchmark planifié porte `repetitionIntent: 'progression' | 'retest'` ⇒ exclu des pénalités de variété, **mais** soumis aux règles de fatigue et de volume.

## 7. Garde-fous

- Si toutes les alternatives sont pénalisées (matériel très limité : poids du corps uniquement), la cohérence prime : le moteur accepte la répétition, varie le dosage/tempo/format et le trace (`VARIETY_RELAXED_EQUIPMENT_LIMITED`).
- Les seuils sont des **paramètres de ruleset**, pas des constantes dispersées.
- Métrique de qualité suivie en batch : indice de diversité par profil sur 12 semaines simulées (voir doc 10), avec bornes haute ET basse (trop de variété = mauvais signe aussi).
