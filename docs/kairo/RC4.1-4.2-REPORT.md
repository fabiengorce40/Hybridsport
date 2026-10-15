# KAIRO — RC4.1 et RC4.2 : rapport

Branche : `claude/kairo-rc4-dev` (à partir de l'audit RC4, commit 0bad48c). Rien n'a été déployé. Aucune modification de RC3 TEST (`claude/kairo-rc1-test-env`), de la production (`claude/crosstraining-c1-c2-spike-vbg8dv`, gh-pages) ni d'un workflow.

Périmètre respecté :
- aucune règle sportive modifiée (moteurs Running, HYROX, Cross-training, Musculation et planificateur inchangés) ;
- aucune autre anomalie RC4 traitée (F2–F11 et F13 et suivantes restent ouvertes et figées par leurs tests).

## RC4.1 — Ressenti en fin de séance Running

### Avant
`finishProgrammeSession` n'acceptait aucune difficulté pour la course : chaque séance réalisée était enregistrée `unexpectedDifficulty: UNKNOWN`. Le moteur Running ne progresse que sur des séances « bien tolérées » (EASIER ou AS_EXPECTED). La course ne progressait donc jamais : c'était le constat F1 de l'audit.

### Après
- **Interface** (`Session0.tsx`, feuille de fin de séance Course) : question facultative « Difficulté ressentie (facultatif) », avec quatre choix :
  - Plus facile que prévu ;
  - Comme prévu ;
  - Plus difficile que prévu ;
  - Beaucoup plus difficile.

  Un second appui sur le choix le désélectionne. Le texte indique que, sans réponse, la séance est enregistrée « ressenti inconnu ».
- **app-core** (`beta0-app.ts`) : `FinishInput.difficulty` est facultatif. Il est transmis tel quel par le chemin Beta 0 : `finishProgrammeSession` → `recordSessionExecution` → contrat Running `RealizedSession.unexpectedDifficulty`.
  - Sans réponse, la valeur reste `UNKNOWN` ; aucune valeur n'est supposée.
  - Une valeur hors liste, ou une difficulté envoyée pour un autre sport que la course, est refusée (`RUN_DIFFICULTY_INVALID`).
- **Persistance** : la valeur est enregistrée dans le champ EXISTANT `running.realized[].unexpectedDifficulty`. Aucun nouveau champ n'est persisté et le schéma ne change pas.
  - Conséquence : la branche de repli `claude/kairo-rc1-test-rollback` reste compatible, sans mise à jour.
  - Les anciennes données (`UNKNOWN`) sont relues telles quelles, sans migration.

### Tests
| Test | Vérifie |
|---|---|
| `rc4-findings` F1 (réécrit), 4 semaines par le chemin réel | « Comme prévu » : valeur persistée et progression (S4 ≠ S1). « Plus facile » : même progression que « comme prévu ». Question ignorée : `UNKNOWN`, aucune progression. « Plus difficile » : persistée, aucune progression. |
| `tests/rc4/rc41-run-difficulty.test.ts` | Reprise des anciennes données : la fixture RC1 `running-test-inprogress` se termine avec « comme prévu » ; les entrées réalisées antérieures sont inchangées. Les quatre valeurs et l'absence de valeur (`UNKNOWN`) sont persistées. Une valeur invalide ou un sport non-course est refusé. |
| `apps/kairo/tests/rc41-run-difficulty-dom.test.tsx` (3 tests) | Quatre options, désélection possible. « Plus facile que prévu » → `EASIER`. Question ignorée → `UNKNOWN`. « Beaucoup plus difficile » → `MUCH_HARDER`. |

Matrice RC4 régénérée (`tests/rc4-audit/__reports__/rc4-matrice.md`, même banc de 6 profils × 6 semaines, réponse par défaut « comme prévu »). La course progresse désormais :
- P1, P1b et P5 : seuil 3×5 min (S1–S3) → 4×5 min (S4–S5) → 5×5 min (S6) ; footing 30 → 33 min ;
- P4 : sortie longue 80 → 81 min (les deux autres courses de S5–S6 restent non planifiées faute de temps, constat RC4 inchangé).

Avant RC4.1, toutes les semaines étaient identiques.

## RC4.2 — Faisabilité HYROX

### Avant
Un profil débutant n'obtenait aucune séance HYROX, et un profil avancé perdait un rôle sur trois. Aucun avertissement ne l'expliquait (constat F12).

### Après
- **Sonde** `hyroxRoleFeasibility` (`packages/app-core/src/hr-feasibility.ts`), sur le modèle de `ctIntentFeasibility` (RC3.2).
  - Pour chaque type de séance HYROX, une semaine HYROX seule est planifiée par le chemin Beta 0 complet (programme → planificateur → moteur HYROX), avec le niveau, le matériel, les disponibilités et l'objectif déclarés.
  - Faisable ⇔ le moteur compose une séance. Il n'y a aucune table et aucune prescription inventée ; les refus ne sont pas contournés.
  - La sonde est pure : le profil et l'état ne sont pas modifiés, et le résultat ne dépend pas du jour de la semaine.
- **Facteurs** : ils sont lus dans la trace du refus, avec la même lecture que le Cross-training (`feasibilityFactors`, désormais exportée).
  - `SAFETY.HYROX.LEVEL_NOT_ELIGIBLE` est attribué au **niveau** seul, jamais à une « coupure ».
  - Un refus sans facteur identifiable (`NO_ELIGIBLE_RACE_SEGMENT`) est affiché tel quel : « le moteur ne précise pas quel paramètre bloque ».
- **Onboarding et « Modifier »** (`Setup.tsx` + `HrFeasibility.tsx`) :
  - **types réalisables** : liste lue de la sonde ;
  - **marque par type** : « Irréalisable avec votre profil actuel » (attribut `data-hr-feasibility`) ;
  - **types impossibles** : chacun avec sa restriction (niveau ; stations composables insuffisantes avec le matériel et le niveau ; durée hors du temps disponible) ;
  - **type choisi impossible** : avertissement explicite et boutons « Choisir « … » » limités aux types réalisables ;
  - **mode Équilibré** : impact annoncé (« les semaines où le programme retient un type impossible, cette séance HYROX n'est pas proposée ») ;
  - **matériel pas encore choisi** : la vérification est annoncée, jamais supposée ;
  - **coupure déclarée** : la sonde ne tourne pas, et l'avertissement existant s'applique.
- **Onglet Programme** (profil existant, `HrRoleCheck`) : le même bilan s'affiche dès que le moteur refuse au moins un type.

### Matrice lue du moteur
Fichier : `packages/app-core/tests/rc4/__reports__/hr-feasibility.md`.

| Niveau | Types réalisables | Types impossibles et cause |
|---|---|---|
| Débutant | aucun, quel que soit le matériel | tous les types : niveau |
| Intermédiaire | tous, sauf au poids du corps | au poids du corps, seul « Capacité stations » reste réalisable ; « Endurance de force », « Conditionnement stations » et « Course compromise » sont refusés pour le matériel, « Simulation partielle » sans facteur attribuable |
| Avancé | variable | « Conditionnement stations » : matériel, même en salle complète. « Course compromise » : temps disponible (profil P3). « Simulation partielle » sans facteur attribuable avec home_equipped, dumbbells_only et bodyweight. Au poids du corps, seul « Capacité stations » est réalisable. |

Pour « Conditionnement stations » en avancé, le moteur ne trouve pas 3 stations éligibles, d'où le libellé « stations composables insuffisantes avec le matériel et le niveau déclarés ». Ce libellé ne désigne pas le seul matériel.

### Tests
| Test | Vérifie |
|---|---|
| `tests/rc4/rc42-hr-feasibility.test.ts` (6 tests) | Matrice régénérée. Aucun statut « inconnu ». Chaque refus porte sa cause. Constats F12 : niveau, matériel et temps. Cohérence avec la planification réelle (type irréalisable ⇒ séance bloquée, réalisable ⇒ composée). Mode Équilibré sur 4 semaines : chaque séance bloquée correspond à un type annoncé impossible. Coupure : facteur coupure. Pureté. |
| `rc4-findings` F12 (réécrit) | Le moteur est inchangé (débutant : `LEVEL_NOT_ELIGIBLE` ; avancé : un rôle sur trois bloqué), ET la sonde annonce les types impossibles et leur restriction, y compris le rôle réellement bloqué. |
| `apps/kairo/tests/rc42-hr-feasibility-dom.test.tsx` (3 tests) | Onboarding débutant : « aucun type réalisable », restriction de niveau, aucune séance inventée. Onboarding intermédiaire au poids du corps : types réalisables, restriction matériel, choix d'un type réalisable ⇒ séance composée. Profil avancé existant en mode Équilibré : onglet Programme et « Modifier ». |

## Validation
| Étape | Résultat |
|---|---|
| `pnpm check` (typecheck racine + app, ESLint, Vitest) | ✅ 234 fichiers, 2 812 tests réussis, 1 ignoré (préexistant) |
| `pnpm kairo:build` | ✅ (avertissement préexistant sur la taille des chunks) |
| Build canal TEST (`build:rc1-test`) | non exécutée : ce script et le canal `rc1-test` n'existent que sur `claude/kairo-rc1-test-env`, qui n'est pas fusionnée dans cette branche de développement. À exécuter lors d'une éventuelle intégration RC4 → TEST. |
| `pnpm kairo:e2e` (Chromium mobile, `vite preview` sur 4173) | ✅ 221 vérifications |

## Limites
- Le ressenti est facultatif. Sans réponse, la course ne progresse pas, comme le veut la règle Running existante. L'interface le dit, sans forcer de réponse.
- La sonde HYROX évalue chaque type sur une semaine HYROX seule, à une séance par semaine. Dans un programme multisport, le planificateur peut encore refuser une séance faute de place, pour des raisons qui ne tiennent pas au type. Ces refus restent signalés par les motifs RC3.1 A8.
- « Simulation partielle » refusée pour `NO_ELIGIBLE_RACE_SEGMENT` : le moteur n'attribue pas de facteur, et l'interface le dit au lieu d'en deviner un.
- Le coût de la sonde (5 planifications) est mémorisé par profil. Il n'est recalculé que si le niveau, le matériel, les disponibilités ou l'objectif changent.

En attente de votre accord pour toute étape suivante.
