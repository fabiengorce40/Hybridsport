# REKKA — RC4.5 lot O1 + O2 : performance de planification (décision D4)

| | |
|---|---|
| **Base** | `c0f7891`, branche `claude/kairo-rc4-dev` |
| **O1** | Port Musculation (`packages/planner/src/ports.ts`) : paramètres Strength et identifiants des emplacements à temps résiduel lus **une fois par port**. Le contenu d'un port est fixé à sa création. |
| **O2** | `readStrengthParams` et `readStrengthParam` (`packages/strength/src/params.ts`) : lecture validée **mémorisée par ruleset chargé**. Liste fermée `STRENGTH_RC45_PERF_CHANGES`. |
| **Inchangé** | Décisions sportives (matrice RC4 strictement identique) ; Running ; aucune fusion ni déploiement. |

## Conditions de D4 et preuves

| Condition | Mise en œuvre | Preuve |
|---|---|---|
| Cache fondé sur l'identité du ruleset chargé et son immuabilité | `WeakMap<LoadedRuleset, …>`. Le `LoadedRuleset` est construit sur une copie validée du document et n'expose que des lectures. | `params-cache.test.ts` : même objet, même résultat, identique à une lecture sur un chargement neuf |
| Pas de cache d'erreurs de validation | Le résultat n'est mis en cache qu'après une lecture complète réussie. | Paramètre invalide : l'erreur est levée à chaque appel (`readStrengthParams` et `readStrengthParam`). |
| Aucun résultat périmé entre deux versions de contenu | Une clé par objet chargé (4F, F6, version d'origine du registre versionné). Garde de fraîcheur : métadonnées et valeur de chaque paramètre identiques à celles de la mise en cache, sinon nouvelle lecture. | Tests « deux versions sans contamination » et « paramètre remplacé ⇒ relu » |
| Pas de mutation partagée | Valeurs mémorisées gelées en profondeur | Test : mutation refusée |
| Séparation des rulesets et des profils | — | Test : 3 niveaux × 2 archétypes × 2 rulesets, entrelacés ; séances identiques dans l'ordre inverse |
| Matrice RC4 strictement identique | — | Banc 6 profils × 6 semaines : séances, exercices, charges, volumes et dates IDENTIQUES à F6, sur 3 passages ; rapports `rc4-matrice` et longitudinaux inchangés |

## Mesures avant / après, même machine, même session

**Banc Node** (simulation 6 semaines, médiane de 3 passages, ms) :

| Profil | Avant | Après | Écart |
|---|---|---|---|
| P1 | 3 244 | 2 273 | −30 % |
| P1b | 1 428 | 914 | −36 % |
| P2 | 5 130 | 3 954 | −23 % |
| P3 | 2 984 | 2 443 | −18 % |
| P4 (sans Musculation) | 214 | 279 | bruit (+65 ms) |
| P5 | 941 | 726 | −23 % |
| **Total** | **13 941** | **10 589** | **−24 %** |

**Mobile**, navigateur avec CPU ralenti ×4, coût de planification à l'ouverture (médiane de 5 passages, ms) :

| Profil | Avant | Après | Écart |
|---|---|---|---|
| P1 | 3 881 | 2 953 | −24 % |
| P1b | 2 098 | 1 693 | −19 % |
| P2 | 4 697 | 4 160 | −11 % |
| P3 | 3 911 | 3 070 | −22 % |
| P5 | 2 066 | 1 842 | −11 % |

## Validation

- `pnpm check` : 2 920 tests réussis, 2 ignorés (déjà ignorés auparavant), lint et types OK.
- `pnpm kairo:build` : OK.
- `pnpm kairo:e2e` : OK.
