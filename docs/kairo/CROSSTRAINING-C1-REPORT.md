# Cross-training C1 : rapport

Périmètre : paquet `@hybridsport/crosstraining`, socle de gouvernance seulement. Aucune séance Cross-training n'est générable. Pas de connexion à l'application, pas de C2–C7, pas de HYROX, pas de planificateur global.

## 1. Livré

- **Registre** : 31 paramètres, tous `UNRESOLVED`. Estimation, prescription et résultat sont des paramètres distincts.
- **Gouvernance** : 16 décisions en attente, 4 politiques G1 non signées, 3 dépendances techniques non satisfaites (`CORE_EXT_C1`, `GLOBAL_PLANNER`, `CT_CONTENT`).
- **Capacités** : 10 capacités et un socle, dérivés de la gouvernance. Aucune n'est active.
- **Contexte** : schéma strict, sans aucune valeur par défaut. Contrat de séance réalisée où `prescription` et `result` sont séparés et cohérents avec la définition du format.
- **Moteur** : `propose` renvoie toujours `no_valid_proposal`, avec des raisons explicites :
  - multisport ;
  - socle ;
  - sources de dose ;
  - simulation ;
  - `PRESCRIPTION_NOT_IMPLEMENTED`, même avec des valeurs injectées.
- **Documents** :
  - `CROSSTRAINING-EVIDENCE-PACK.md` ;
  - `CORE-EXT-C1-COMPATIBILITY.md` (RFC).

## 2. Tests (84 tests Cross-training ; suite complète : 1 348, verte)

- Gouvernance non résolue ⇒ **refus explicite, jamais de repli** :
  - résolution fail-closed de chaque paramètre, dans les deux modes ;
  - refus pour chacun des 9 stimuli par le pipeline réel du CORE ;
  - propriétés : aucune proposition quelle que soit la gouvernance, 300 cas.
- Déterminisme.
- Architecture :
  - aucune constante non justifiée ;
  - dépendances limitées à `domain`, `engine` et `zod` ;
  - CORE, Running et Strength inchangés depuis `1d37a50`.

## 3. Mutation (Stryker, lanceur `command`, `--bail=1`)

Configuration : `stryker/crosstraining-c1/`.

| Passe | Périmètre | Tués |
|---|---|---|
| 1 | `src/**` | 90,4 % (897 / 992) |
| 2 | `src/**`, après les tests de lacunes | **97,2 %** (964 / 992) |
| 3 | `context.ts`, après les tests d'acceptation | 164 / 182, puis refine morte supprimée |

**Lacunes réelles trouvées et couvertes** (`tests/unit/mutation-gaps.test.ts`). Aucun défaut du code, seulement du comportement non vérifié :
- dépendances de chaque capacité (décision, G1, technique : chacune bloque seule) ;
- approbation limitée à l'état exact de la maturité ;
- identifiants ancrés ;
- déduplication des raisons ;
- trace exacte d'un refus d'admissibilité ;
- au moins un item par format ;
- contrat de charge ;
- audience et sévérité des codes ;
- acceptation de chaque quantité, format et type de résultat.

**Code mort supprimé** : `refine(Number.isFinite)` dans `context.ts`, car zod 4 refuse déjà les nombres non finis.

**Survivants restants : équivalents**
- Conditions de `resultIssues` : chaque discriminant (format, type de résultat) est redondant avec la présence du champ lu (`timeCapS`, `minutesCompleted`, `intervalsCompleted`), qui n'existe que sur la variante correspondante.
- Chaînes de code et de chemin d'une anomalie `custom` de zod, sans effet observable.
- Copie de `ruleRefs`, toujours vide.
- Séparateur d'un message d'erreur de schéma de gouvernance.
