# 09 — SessionValidator, RepairEngine, gouvernance des règles, sécurité

## 1. SessionValidator

Indépendant des générateurs : **le générateur propose, le validateur contrôle.** Le validateur n'importe aucun générateur ; il dépend seulement de `domain`, `rules`, `catalog`, `duration`, `similarity` et `constraints`. Il valide de la même manière une séance générée, adaptée, éditée à la main ou proposée par une IA.

### INPUTS
`Session` (ou `WeekPlan`, `Program`), `ValidationContext` (profil, matériel, disponibilité du jour, séances voisines prévues et réalisées, `AthleteState`, intentions de répétition), ruleset, catalogue.

### Contrôles

| Famille | Exemples | Niveau |
|---------|----------|--------|
| Technique | Schéma, NaN, négatifs, 0 rep, références existantes et actives, sérialisation aller-retour | HARD |
| Structure | Échauffement en tête (ou justification d'archétype), retour au calme, blocs non vides, formats cohérents (EMOM : travail < 60 s par minute), time cap ≥ p50 attendu | HARD |
| Matériel | Chaque exercice est faisable ; charges réalisables | HARD |
| Sécurité | Restrictions, douleurs actives, éligibilité à l'effort maximal, mouvements techniques sous fatigue (novice), L4 | HARD |
| Durée | p90 ≤ temps disponible (HARD) ; p50 dans la tolérance du profil (SOFT) | HARD / SOFT |
| Récupération | L1, L2, règles I* avec les séances voisines | HARD / SOFT |
| Volume | L5 (sur la semaine), plafonds par séance | SOFT / HARD |
| Cohérence du stimulus | Stimulus ↔ format ↔ durée attendue ; reps ↔ %e1RM ↔ RIR ; allures ↔ zones | HARD pour les incohérences, SOFT pour le reste |
| Doublon | Classification du DuplicateDetectionEngine | HARD (accidentel dur) / SOFT |
| Progression | Pas réalisables, bornes par cycle, cohérence avec la phase | HARD / SOFT |
| Interférence | InterferenceManager sur la semaine projetée | HARD / SOFT |

### OUTPUTS
```ts
interface ValidationReport {
  status: 'VALID' | 'VALID_WITH_WARNINGS' | 'INVALID';
  errors: Violation[];              // HARD
  warnings: Violation[];            // SOFT au-dessus du seuil d'alerte
  scores: { tier: number; value: number }[];   // score par niveau de priorité (doc 01 §4)
  repairSuggestions: RepairAction[];            // proposées par les règles violées
  rulesEvaluated: { ruleId: string; version: string }[];
  rulesetVersion: string; engineVersion: string; catalogVersion: string;
}
interface Violation { ruleId: string; ruleVersion: string; nature: RuleNature; level: 'hard' | 'soft'; target: EntityRef; code: ReasonCode; }
```

### FAILURE MODES
Le validateur lui-même ne doit jamais planter sur une entrée malformée : il renvoie `INVALID` avec des erreurs techniques. Les tests de propriétés (*fuzz*) le vérifient.

## 2. RepairEngine

```
Generator → Validator → INVALID → RepairEngine → Validator → … (≤ N) → VALID | REPAIR_EXHAUSTED
```

### Principes
1. **Réparation ciblée** : chaque violation propose des `RepairAction` via la fonction `repair()` de sa règle (remplacer un exercice, ajuster les séries, réduire un repos, déplacer une séance, changer de variante…).
2. **Ordre** : on traite d'abord les violations de plus haut niveau (sécurité, puis faisabilité, puis récupération…).
3. **Garde anti-boucle** : nombre maximal de tentatives (proposition : 3 par séance, 2 par semaine) ; mémoire des états déjà visités (hachage de l'empreinte) pour ne jamais revenir à une séance déjà rejetée ; une action ne peut pas réintroduire une violation déjà corrigée.
4. **Escalade** : réparation locale → **régénération** de la séance (nouvelle sélection en excluant les éléments fautifs) → changement de variante (demande au GlobalPlanner) → `NO_VALID_SOLUTION` avec les raisons et les alternatives.
5. **Aucune réparation ne désactive une règle.** Un relâchement n'existe que s'il est **prévu par la règle elle-même** (ex. anti-doublon avec matériel limité), et il est tracé.

### OUTPUTS
Séance réparée + historique des actions (reason codes) ou `EngineError { code: 'REPAIR_EXHAUSTED' | 'NO_VALID_SOLUTION' }`.

### Observabilité
Taux d'invalidité avant réparation, nombre moyen de tentatives, règles le plus souvent violées. Un générateur qui fait beaucoup appel au réparateur est un générateur à corriger (doc 10).

## 3. Registre et fiche des règles (C3, conservé et précisé)

Chaque règle garde la fiche définie en phase 1 (doc 04 §4.2), avec des statuts renommés :

```ts
interface RuleMetadata {
  id: string; title: string; description: string;
  category: RuleCategory;          // voir §4
  nature: 'SAFETY' | 'FEASIBILITY' | 'PROGRAMMING_HEURISTIC' | 'PREFERENCE' | 'TECHNICAL';
  level: 'hard' | 'soft' | 'target';
  discipline?: Discipline; scope: 'session' | 'week' | 'phase' | 'program' | 'cross_discipline';
  rationale: string;
  references: Reference[];
  confidence: 'established' | 'consensus' | 'heuristic' | 'provisional';
  version: string; modifiedAt: ISODate; changelog: ChangelogEntry[];
  review: { status: 'draft' | 'reviewed' | 'approved' | 'deprecated'; approvals: Approval[] };
  governance: GovernanceClass;     // voir §4 — qui a le droit d'approuver
}
interface Approval { role: 'sports_expert' | 'product' | 'engineering' | 'medical_advisor'; name: string; qualification?: string; date: ISODate; verdict: 'approved' | 'changes_requested'; notes?: string; }
```

Statuts :

| Statut | Signification |
|--------|---------------|
| `draft` | Écrite et testée, pas encore relue |
| `reviewed` | Relue par l'équipe (pair produit ou ingénierie) : cohérence, tests, rationale, références |
| `approved` | Approuvée par le **rôle requis par sa classe de gouvernance** (§4) |
| `deprecated` | Retirée des nouveaux plans ; conservée pour expliquer les anciens plans |

## 4. Qui valide quoi : classes de gouvernance

| Classe | Contenu | Exemples | Approbation requise | Modifiable par l'équipe produit ? |
|--------|---------|----------|---------------------|-----------------------------------|
| **G1 — Sécurité sportive** | Règles qui protègent l'intégrité physique | Comportement en cas de douleur, éligibilité aux efforts maximaux, restrictions ↔ contre-indications, mouvements techniques interdits aux novices sous fatigue, plafonds L4, contenu des questionnaires d'aptitude | **Expert sportif qualifié** (+ avis d'un professionnel de santé recommandé pour le comportement en cas de douleur et le questionnaire d'aptitude) | **Non** |
| **G2 — Heuristiques de programmation** | Choix d'entraînement fondés sur la littérature ou le consensus | L1, L2, L3, L5, tables de dosage, modèles de progression, zones et modèle d'allure, rampe de spécificité HYROX, fréquence des simulations, affûtage, stimuli de cross-training, contributions hybrides | **Expert de la discipline concernée** | **Oui, dans une plage approuvée** : l'expert approuve une *plage* pour chaque paramètre ; le produit peut ajuster à l'intérieur (version mineure, sans nouvelle relecture). Sortir de la plage ⇒ nouvelle approbation |
| **G3 — Préférences et UX produit** | Choix de produit sans enjeu physiologique direct | Poids de la variété, prise en compte des préférences, diversité des formats, questions de feedback, arrondis d'affichage, cible de durée à l'intérieur des contraintes, stabilité du plan | **Produit** | Oui |
| **G4 — Règles techniques** | Intégrité et fonctionnement du logiciel | Schéma, références, NaN, sérialisation, déterminisme, arrondi au matériel réalisable, bornes de solveur, nombre de tentatives de réparation | **Ingénierie** (revue de code + tests) | Non applicable |
| **G5 — Données de catalogue** | Métadonnées sportives des exercices | Patterns, muscles, coûts ordinaux, niveau technique, substitutions et fidélité, débits de travail, table des divisions HYROX | **Expert** (par lot) ; table HYROX : vérification sur la source officielle | Non (hors libellés et alias) |

Pourquoi les **plages approuvées** en G2 : l'expert garde la maîtrise de ce qui est sportivement acceptable, et l'équipe peut calibrer à partir des données de bêta sans bloquer chaque ajustement sur une relecture. Toute sortie de plage est détectée automatiquement (test de CI qui compare le ruleset aux plages approuvées).

## 5. Cycle de validation

```
draft ──(tests + fiche complète + revue de code)──► reviewed ──(approbation du rôle requis)──► approved
  ▲                                                     │                                           │
  └──────────────── changes_requested ◄─────────────────┘                                           │
approved ──(modification de logique, OU paramètre hors plage approuvée)──► draft (nouvelle version)   │
approved ──(paramètre dans la plage, G2/G3)──► approved (version mineure, changelog)                 │
approved/reviewed ──(retrait)──► deprecated ◄─────────────────────────────────────────────────────────┘
```

- **Relecture par lots** : `engine-cli rules export --changed-since <version>` produit le dossier de relecture (fiches + diff + programmes d'exemple des personas golden concernés).
- **Traçabilité** : chaque plan référence `rulesetVersion` ; chaque décision de la trace référence `ruleId@version`.
- **Rapport d'état** en CI (non bloquant pour l'instant) : nombre de règles par classe et par statut ; liste des règles G1 et G2 non `approved`.

## 6. Politique de blocage du build : options (décision reportée)

| Option | Principe | + | − |
|--------|----------|---|---|
| **A. Blocage strict** | Un build de production échoue si une règle G1 ou G2 active n'est pas `approved` | Garantie maximale | Peut bloquer un correctif urgent ; pression sur la disponibilité des experts |
| **B. Blocage G1 seulement** | G1 doit être `approved` ; G2 non approuvé ⇒ avertissement de release + marquage dans l'observabilité | Protège l'essentiel | Des heuristiques non relues peuvent partir en production |
| **C. Pas de blocage technique ; porte de release humaine** | Rapport d'état obligatoire dans la checklist de release, signé par un responsable | Souple | Dépend de la discipline de l'équipe |

Recommandation provisoire : **B avant le lancement commercial, et A pour G1 dès la bêta publique.** Décision à valider (n° 4).

## 7. Sécurité : limites du produit et comportements conservateurs

### 7.1 Limites déclarées du produit
- Le moteur **n'est pas un dispositif médical** : pas de diagnostic, pas d'avis thérapeutique, pas de programme de rééducation.
- Hors périmètre V1 (orientation vers un professionnel) : grossesse et post-partum, pathologies cardiovasculaires connues, blessure en cours de traitement, mineurs (selon l'âge minimal retenu).
- Questionnaire d'aptitude à l'onboarding : un drapeau rouge ⇒ recommandation de consultation médicale et **accès limité aux intensités élevées** tant que l'utilisateur n'a pas confirmé l'avis d'un professionnel (le périmètre exact est une décision G1).

### 7.2 Comportement en cas de douleur signalée (règles G1, à valider par un expert et, idéalement, par un professionnel de santé)

| Signal | Comportement du moteur | Communication |
|--------|------------------------|---------------|
| Inconfort **léger**, pendant ou après | Exercices sollicitant la zone (`painSensitiveAreas`) : substitution ou réduction de charge pour les 7 jours suivants ; aucune séance clé à forte demande sur la zone | « Nous avons adapté les exercices qui sollicitent [zone]. Si la gêne persiste, consulte un professionnel. » |
| Douleur **modérée**, ou légère signalée 2 fois en 14 j | Restriction temporaire automatique sur la zone (`source: pain_report`) jusqu'à la levée par l'utilisateur ; volume global réduit | Recommandation explicite de consulter un professionnel de santé |
| Douleur **sévère**, ou persistante | Arrêt de toute sollicitation de la zone ; séances clés à haute intensité suspendues ; reprise **uniquement** après confirmation de l'utilisateur | Message clair : arrêter et consulter |
| Signes d'alerte généraux (douleur thoracique, malaise, essoufflement anormal, vertiges) | Aucune adaptation sportive : **interruption** et message d'urgence (appeler les secours) ; blocage des séances jusqu'à confirmation | Message d'urgence, sans interprétation |

Le moteur **ne tente jamais d'interpréter** une douleur (pas de « c'est probablement une tendinite »). La zone et l'intensité déclenchent seulement des comportements prudents, documentés et versionnés.

### 7.3 Autres règles SAFETY transverses
Pas de test maximal sans éligibilité (niveau, historique récent) ; pas de hausse brutale au retour d'une interruption (reprise progressive après ≥ 2 semaines d'arrêt, paramètre) ; plafonds L4 ; mouvements techniques exclus sous forte fatigue pour les novices ; limitations respectées strictement, avec substitutions ou exclusions.
