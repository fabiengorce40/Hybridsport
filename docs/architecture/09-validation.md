# 09 — L. Validation automatique des séances et des plans

## 1. Rôle

Le validateur est le **garde-barrière unique** : toute sortie — génération, adaptation, édition manuelle, future suggestion d'IA — passe par `validatePlan()` avant publication. Il réutilise le **même registre de règles** que le générateur (doc 04 §4), donc une règle n'est jamais écrite deux fois.

## 2. Couches de validation

| # | Couche | Exemples de contrôles |
|---|--------|------------------------|
| 1 | **Schéma** | Types, champs obligatoires, bornes numériques (Zod) : reps > 0, charge ≥ 0, allure plausible |
| 2 | **Structure** | Échauffement en tête, retour au calme selon archétype, blocs ordonnés, pas de bloc vide, formats cohérents (EMOM ⇒ travail ≤ 60 s/minute) |
| 3 | **Référentiel** | Exercices existants et actifs, matériel disponible, niveau technique ≤ niveau utilisateur (+1 max en progression encadrée), aucune contre-indication vs limitations |
| 4 | **Dosage** | Volumes par muscle dans la fourchette, intensité cohérente avec les reps (5 reps à 95 % 1RM = incohérent), RPE plausibles, allures issues des zones de l'utilisateur, charges arrondies au pas matériel |
| 5 | **Durée** | Tolérance doc 06 ; p90 ≤ disponibilité du jour |
| 6 | **Variété** | Règles dures anti-doublon doc 05 |
| 7 | **Semaine / inter-disciplines** | Budgets, écarts de récupération, interférences (doc 04 §3.4), séances à haute intensité max, jours de repos, kilométrage total |
| 8 | **Programme** | Progression bornée semaine à semaine, décharges présentes, affûtage avant événement, tests planifiés |
| 9 | **Sécurité** | Règles `safety` : débutant sans haltérophilie lourde, pas de max test sans expérience, limitations respectées |

## 3. Rapport

```ts
interface ValidationReport {
  valid: boolean;                       // aucune violation 'hard' ou 'safety'
  errors: Violation[];                  // bloquant
  warnings: Violation[];                // souple, affecte le score qualité
  infos: Violation[];                   // relâchements tracés (ex. VARIETY_RELAXED_EQUIPMENT_LIMITED)
  qualityScore: number;                 // 0..100, agrégé des pénalités souples
  rulesetVersion: string; engineVersion: string;
}
```

## 4. Boucle génération ⇄ validation

1. Générer.
2. Valider.
3. Si erreurs : appliquer les `repair()` des règles violées (ex. déplacer une séance, remplacer un exercice, ajuster le volume), **ciblées** sur les éléments en cause.
4. Revalider. Maximum N itérations (ex. 3).
5. Si toujours invalide : `EngineError` explicite, trace complète, événement Sentry. **Jamais** de publication d'un plan invalide, jamais de règle désactivée pour « faire passer ».

## 5. Au-delà de l'exécution : audit qualité en batch

- En CI et avant chaque release du moteur/ruleset : génération sur un **corpus de profils** (personas + profils générés aléatoirement), simulation de 12 semaines avec comportements réalistes (séances manquées, performances variables).
- Métriques : taux de validité (doit être 100 %), score qualité moyen/min, précision de durée théorique, indices de variété, respect des répartitions d'intensité.
- **Comparaison avec la version précédente** : toute régression de métrique au-delà d'un seuil bloque la release.

## 6. Relecture experte

- `engine-cli` produit des **rapports lisibles** (Markdown/HTML) d'un programme complet pour un persona.
- Les spécialistes (course, force, cross, HYROX) relisent et annotent ; leurs remarques deviennent des **règles** et des **tests de régression**.
- Un ensemble de programmes validés par les experts sert de **golden set** (snapshot approuvé) : toute modification du moteur qui les change doit être revue explicitement.
