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
| Récupération | L1, L2, L3 (niveau issu de la politique contextuelle, doc 04 §4.1), règles I* avec les séances voisines | HARD / SOFT selon le contexte |
| Volume | L5 (sur la semaine), plafonds par séance | SOFT / HARD |
| Cohérence du stimulus | Stimulus ↔ format ↔ durée attendue ; reps ↔ %e1RM ↔ RIR ; allures ↔ zones | HARD pour les incohérences, SOFT pour le reste |
| Doublon | Classification du DuplicateDetectionEngine | SOFT (pénalité, forte si très similaire) ; HARD uniquement pour les cas explicitement justifiés (doc 07 §4) |
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

Chaque violation HARD porte un reason code du domaine de sa nature : `SAFETY.*` (protection), `FEASIBILITY.*` (exécution réellement possible), `TECHNICAL.*` (intégrité du système) ou `RULE.*` (règle métier). Les trois premières produisent toutes `INVALID`, mais restent distinguées dans le rapport et dans l'observabilité (doc 10 §3). Les filtres de la couche A (doc 01 §5) sont évalués avant tout score.

### FAILURE MODES
Le validateur lui-même ne doit jamais planter sur une entrée malformée : il renvoie `INVALID` avec des erreurs techniques. Les tests de propriétés (*fuzz*) le vérifient.

## 2. RepairEngine

```
Generator → Validator → INVALID → RepairEngine → Validator → … (≤ N) → VALID | REST_RECOMMENDED | REPAIR_EXHAUSTED
```

### Principes
1. **Réparation ciblée** : chaque violation propose des `RepairAction` via la fonction `repair()` de sa règle (remplacer un exercice, ajuster les séries, réduire un repos, déplacer une séance, changer de variante…).
2. **Ordre** : on traite les violations dans l'ordre de la couche A (A1 sécurité → A2 faisabilité → A3 récupération minimale → A4 intégrité, doc 01 §5), puis les pénalités de la couche B.
3. **Garde anti-boucle** : nombre maximal de tentatives (proposition : 3 par séance, 2 par semaine) ; mémoire des états déjà visités (hachage de l'empreinte) pour ne jamais revenir à une séance déjà rejetée ; une action ne peut pas réintroduire une violation déjà corrigée.
4. **Escalade** : réparation locale → **régénération** de la séance (nouvelle sélection en excluant les éléments fautifs) → changement de variante (demande au GlobalPlanner) → **`REST_RECOMMENDED`** si le repos est une issue sportivement valide (ex. restrictions de douleur qui retirent l'objet de la séance, lecture de l'état `reduce`) → sinon `NO_VALID_SOLUTION` avec les raisons et les alternatives.
5. **Aucune réparation ne désactive une règle.** Un relâchement n'existe que s'il est **prévu par la règle elle-même** (ex. anti-doublon avec matériel limité), et il est tracé.

### OUTPUTS
Trois issues :
- **séance réparée** + historique des actions (reason codes) ;
- **`REST_RECOMMENDED`** (V1.2) : issue **valide**, pas une erreur. La séance est remplacée par un repos (éventuellement une option de récupération légère autorisée par les règles), avec reason codes (`REPAIR.REST_RECOMMENDED{cause}`). Elle compte comme une séance `skipped` avec `skipReason` adapté (`pain` ou `safety_pause` si c'est la cause), donc sans pénalité de progression (doc 08 §1) ;
- `EngineError { code: 'REPAIR_EXHAUSTED' | 'NO_VALID_SOLUTION' }`.

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

### 3.1 Paramètres sportifs : aucune constante cachée (V1.2)

Toute valeur sportive non validée **vit dans le ruleset**, jamais dans le code du CORE. Le CORE ne connaît que des identifiants de paramètres.

```ts
interface ParameterMetadata {
  id: string;                          // 'L1.matrix.high_high.hours', 'duration.margin.strength_sets'…
  value: unknown;                      // valeur courante
  unit?: string;
  version: string; modifiedAt: ISODate;
  status: 'draft' | 'reviewed' | 'approved' | 'deprecated';
  confidence: 'established' | 'consensus' | 'heuristic' | 'provisional';
  provisional: boolean;                // true tant que non calibré ou non approuvé
  source: { kind: 'study' | 'guideline' | 'book' | 'expert_consensus' | 'internal_hypothesis'; citation?: string };
  justification: string;
  governance: GovernanceClass;         // G1–G5
  approvedRange?: { min: unknown; max: unknown };   // G2 : plage approuvée par l'expert
  safeDirection?: 'increase' | 'decrease';           // G1 : sens prudent (cliquet, §6)
  approvedBaseline?: unknown;                        // G1 : dernière valeur de référence approuvée
}
```

Un test d'architecture vérifie qu'aucune valeur sportive littérale n'apparaît dans le CORE hors du chargement du ruleset.

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
- **Rapport d'état** en CI : nombre de règles et de paramètres par classe et par statut ; liste des éléments G1 et G2 non `approved`. Son effet bloquant dépend de l'environnement (matrice §6).

## 6. Politique de blocage du build (décision 4, validée en V1.2)

**A. Violations à l'exécution** (sorties du moteur) : dans **tous** les environnements, une violation SAFETY, FEASIBILITY, TECHNICAL ou d'une règle métier HARD (selon l'`EnforcementPolicy`) produit `INVALID`. Une règle métier SOFT produit une pénalité et un avertissement. Le moteur n'expose **aucune** API de désactivation de règle (vérifié par un test d'architecture).

**B. Barrières de livraison**

| Catégorie | Local | CI (fusion sur main) | Staging | Bêta fermée | Bêta publique / Production |
|-----------|-------|----------------------|---------|-------------|----------------------------|
| Test SAFETY en échec | Échec visible | **Bloque immédiatement** | Bloque | Bloque | Bloque |
| Assouplissement d'un paramètre G1 sans approbation (cliquet) | Autorisé sur la branche | **Bloque** | Bloque | Bloque | Bloque |
| Statut des règles et paramètres G1 | `draft` toléré | Avertissement | Avertissement | **`reviewed` minimum + valeurs prudentes** | **`approved` obligatoire** |
| Test FEASIBILITY en échec | Échec visible | Bloque immédiatement | Bloque | Bloque | Bloque |
| Test TECHNICAL en échec (schéma, NaN, déterminisme, sérialisation, frontières d'architecture) | Échec visible | Bloque immédiatement | Bloque | Bloque | Bloque |
| Test de règle métier (G2) en échec | Échec visible | Bloque | Bloque | Bloque | Bloque |
| Statut des règles et paramètres G2 | `draft` toléré | Rapport | Rapport | Toléré (`draft`/`reviewed`), liste publiée en interne | **Plage `approved`** pour les règles HARD ; SOFT/TARGET : `reviewed` minimum |
| G3 / G4 | — | Revue de code | — | — | — |
| Régression golden (diff non approuvé) | Avertissement | **Bloque la fusion** jusqu'à approbation humaine | Bloque | Bloque | Bloque |
| Mutation testing | Optionnel | Avertissement (seuil non calibré) | Avertissement | **Bloquant sur G1 et FEASIBILITY** (100 % des mutations de paramètres G1 détectées) | **Bloquant, seuil global calibré** |
| Test longitudinal 52 semaines | Optionnel | Nightly, crée un ticket | Avertissement | **Bloque** (échantillon) | **Bloque** (corpus complet) |
| Parcours adversarial — assertions de sécurité | Optionnel | **Bloque immédiatement** (nightly et pré-release) | Bloque | Bloque | Bloque |
| Parcours adversarial — assertions de stabilité | Optionnel | Avertissement (seuils non calibrés) | Avertissement | **Bloque** | Bloque |

**Cliquet de sécurité (G1)** : chaque paramètre G1 déclare `safeDirection` et `approvedBaseline` (§3.1). Le durcir est toujours permis ; l'assouplir par rapport à la référence exige une approbation experte enregistrée. Un paramètre de sécurité provisoire ne peut donc pas devenir plus permissif en douce.

**Contournement d'urgence** (correctif critique) : possible uniquement pour une régression golden ou un test de stabilité, avec deux approbateurs, une justification journalisée et une revue a posteriori sous 48 h. **Jamais** pour SAFETY, FEASIBILITY, TECHNICAL ou un assouplissement G1.

## 7. Sécurité : limites du produit et douleur (décision 34, architecture validée en V1.2)

### 7.1 Principes

- Le moteur **n'est pas un dispositif médical** : il ne diagnostique pas, n'identifie aucune pathologie, n'affirme jamais qu'un mouvement est médicalement sûr et ne remplace pas un professionnel de santé.
- Il travaille **uniquement** avec des **choix fermés** faits par l'utilisateur (niveau, zones fonctionnelles, mouvements concernés), des restrictions prudentes et des règles G1 versionnées. Pas de questions de type diagnostic, pas d'analyse de texte libre.
- Formulation contrôlée : jamais « ce mouvement est sûr », toujours « séance adaptée pour ne pas solliciter la zone signalée ».
- Module isolé `safety/` (douleur, éligibilité) : règles G1 **isolées, versionnées, testées et approuvées avant production**.

### 7.2 Architecture P1–P4 (validée) — contenus G1 non figés

| Niveau | Nature de la déclaration | Actions possibles du moteur (mécanismes) |
|--------|--------------------------|------------------------------------------|
| **P1** | Gêne légère déclarée | Adapter : charge et volume réduits sur les exercices sollicitant la zone, substituts prioritaires. Supprimer : efforts maximaux et pliométrie sollicitant la zone. Proposer : séance adaptée, saut de l'exercice. Escalade vers P2 selon les règles G1 |
| **P2** | Douleur affectant certains mouvements | Supprimer : exercices sollicitant la zone au-delà d'un seuil G1 et mouvements cochés (course et impacts si membre inférieur, selon règle G1). Adapter : reste de la séance. Proposer : séance sans la zone, ou `REST_RECOMMENDED`. Recommander une évaluation professionnelle (texte G1). Restriction maintenue jusqu'à la déclaration de résolution, puis reprise selon les règles G1 |
| **P3** | Douleur importante | Supprimer : toute sollicitation de la zone, séances à haute intensité ; `programStatus = paused_safety` dans les cas définis par G1 (ex. zone centrale, plusieurs zones). Proposer : repos ; activité légère n'impliquant pas la zone seulement sur demande explicite et si G1 l'autorise. Recommandation forte d'évaluation professionnelle. Reprise sur **déclaration de l'utilisateur**, jamais présentée comme une autorisation |
| **P4** | Signal potentiellement préoccupant (liste fixe de symptômes généraux) | **Pipeline** : `P4 → interruption de la séance → programStatus = paused_safety → blocage de la génération selon le ruleset G1 → message de sécurité localisé`. Aucune adaptation, aucune interprétation |

**Contenus G1 qui ne sont PAS figés dans cette spécification** (à valider par un professionnel de santé compétent avant production ; ils vivent dans le ruleset, versionnés, avec statut et confiance) :
- les descriptions des niveaux présentées à l'utilisateur ;
- la **liste exacte des symptômes P4** ;
- les **seuils temporels** (durées de restriction, fenêtres de récurrence) ;
- les **règles d'escalade** (P1 → P2, etc.) ;
- les **formulations médicales** et recommandations ;
- les **instructions d'urgence** localisées ;
- les **règles de reprise** après douleur ou interruption.

Le CORE implémente les **mécanismes** : interruption, restrictions par zone et par mouvement, `programStatus`, blocage, affichage d'un message identifié par une clé de contenu. Il n'implémente aucune vérité médicale.

Règles communes :
- Un bouton « douleur » est disponible **pendant** la séance : l'exercice en cours s'arrête, puis même grille.
- Exercices sautés et séances non réalisées pour douleur ou pause de sécurité : `skipReason = pain` / `safety_pause`, **jamais** des échecs de performance (doc 08 §1).
- Données minimales : niveau, zones, mouvements cochés, dates.

### 7.3 Absence de consentement aux données de santé (V1.2)

Si `healthDataConsent = false` :
- **adaptation immédiate** possible à partir de l'information fournie pendant l'interaction (la séance en cours et, si l'utilisateur le demande, la séance générée juste après) ;
- **aucune persistance** de la donnée de santé (`PainReport.persisted = false`, effacée à la fin de l'interaction) ;
- **aucune fausse détection longitudinale** : pas de détection de récurrence ni d'escalade fondée sur l'historique ;
- le moteur **sait que l'historique est indisponible** : `AthleteState.signals.painHistory = 'unavailable'`, reason code `DATA.HEALTH_HISTORY_UNAVAILABLE` ; les règles G1 qui dépendent de l'historique appliquent leur variante prudente prévue pour ce cas (ex. recommandation de consulter renforcée) ;
- P4 reste pleinement traité pour l'interaction en cours (interruption et message).

### 7.4 Autres règles SAFETY transverses
Pas de test maximal sans éligibilité (niveau, historique récent) ; reprise progressive après une interruption (règles G1) ; plafonds L4 ; mouvements techniques exclus sous forte fatigue pour les novices ; limitations respectées strictement, avec substitutions ou exclusions.

## 8. Périmètre V1 et éligibilité (décision 35, validée en V1.2)

Le moteur **n'accorde jamais d'autorisation médicale**. Il peut seulement enregistrer une **déclaration de l'utilisateur** et appliquer un comportement prévu par le ruleset G1.

Classes de comportement :
- **E** : exclusion à l'onboarding ;
- **S** : programmation suspendue (`programStatus = suspended_scope`) ;
- **D** : déclaration de l'utilisateur requise, puis réglages prudents ;
- **I** : information seulement.

| Population | Statut V1 | Comportement |
|------------|-----------|--------------|
| Adultes (18 ans et plus) en bonne santé générale | Cible | Normal |
| Débutants (y compris sédentaires sans drapeau au questionnaire) | Cible | Réglages prudents |
| Intermédiaires, avancés | Cible | Normal |
| Très haut niveau (élite) | Hors cible, toléré | **I** |
| Mineurs | Hors périmètre | **E** (contrôle d'âge) |
| Grossesse | Hors périmètre | **E** à l'onboarding ; **S** si déclarée en cours d'usage (historique conservé) ; orientation vers un suivi spécialisé |
| Post-partum | Hors périmètre sans déclaration | **D**, sinon **S** |
| Pathologie cardiovasculaire connue ou symptômes cardiaques | Hors périmètre | **E / S** ; conditions voisines classées **E** ou **D** par le ruleset G1 |
| Rééducation | Hors périmètre | Pas de rééducation ; restrictions déclarées (liste fermée) exclues de la programmation, sans objectif de rééducation |
| Blessure aiguë | Hors périmètre (pour la zone) | Décision 34 (P3) ; pause si zone centrale ou multiple |
| Restrictions médicales | Partiel | Seulement si exprimables dans la liste fermée ; sinon **S** + orientation |
| Handicap nécessitant une programmation spécialisée | Hors périmètre V1 | Message honnête ; programmation possible seulement via les restrictions existantes, sans prétention d'adaptation spécialisée ; interface accessible dans tous les cas |
| Personnes très âgées ou fragiles | Hors périmètre si fragilité déclarée | Fragilité déclarée ⇒ **S** + orientation ; au-delà d'un **âge seuil** ⇒ **D** + réglages prudents |

**Contenus G1 non figés** (ruleset, à approuver avec un professionnel de santé avant production) : le **questionnaire d'aptitude** exact, la **correspondance réponse → classe**, les **populations nécessitant une validation particulière**, l'**âge seuil**, la **liste des restrictions médicales** exprimables, les règles de **reprise**.

Architecture : la couche applicative calcule `eligibility` à partir du questionnaire et des règles G1, puis le transmet au moteur (doc 02 §1). Le moteur en déduit `programStatus` et refuse toute génération hors `active` (`OUT_OF_SCOPE`).
