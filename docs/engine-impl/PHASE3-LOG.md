# Phase 3 — Journal d'implémentation du CORE

Référence normative : [TRAINING ENGINE SPECIFICATION V1.2](../engine-spec/README.md).

## Lot 0 — Baseline (avant toute modification de code)

| Élément | Constat |
|---------|---------|
| Branche | `claude/fitness-app-architecture-81fs92`, à jour avec `origin` (commit `c94b1cc`) |
| Contenu | Documentation uniquement (`docs/architecture/`, `docs/engine-spec/`, `README.md`, `.gitignore`) |
| Code existant | Aucun |
| Scripts existants | Aucun (pas de `package.json`) |
| Tests existants | Aucun ⇒ baseline : 0 test, rien à exécuter |
| Typecheck / lint existants | Aucun |
| Environnement | Node v22.22.2, npm 10.9.7, pnpm 10.33.0, accès au registre npm |
| Choix d'outillage | TypeScript **5.9.3** (typescript-eslint 8.70 exige `< 6.1`, donc pas TS 7) ; Vitest 5 ; fast-check 4 ; ESLint 9 + typescript-eslint ; Zod 4 (validation à l'exécution prévue par la spec) |

Configuration fonctionnelle existante réécrite : aucune (il n'y en avait pas).
