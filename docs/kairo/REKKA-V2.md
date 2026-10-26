# REKKA V2 — refonte visuelle : suivi des lots

**Branche :** `claude/rekka-v2`, créée depuis la BÊTA publiée `e2cdcc5`.

**Garanties :**
- aucun moteur sportif modifié ;
- RC5.3 absent ;
- aucun déploiement : aucun workflow ne se déclenche sur cette branche (§ V2-0).

## V2-0 — Préparation et isolation

### Références vérifiées avant création (26/10/2026)

| Référence | Commit | Rôle |
|---|---|---|
| `claude/rekka-beta` | `e2cdcc5` | BÊTA publiée (déploiement Cloudflare n° 4 réussi le 24/10). **Base de la V2.** |
| `claude/kairo-rc4-dev` | `dc99d25` | Développement : RC5.1, RC5.3 (R4, R1, R2 validés ; **R3 en cours, non validé**), RC5.4. Inchangée. |
| `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e` | Production (GitHub Pages). Inchangée. |
| `claude/rekka-v2` | créée depuis `e2cdcc5` | Refonte V2 |

### Isolation

- **Workflows présents sur la base :**
  - `kairo-pages.yml` se déclenche sur la branche de production uniquement ;
  - `rekka-beta-pages.yml` se déclenche sur `claude/rekka-beta` uniquement.

  Un push sur `claude/rekka-v2` ne publie donc **rien**.
- Aucun fichier de `packages/` n'est modifié par les lots V2-0 à V2-2 : moteurs, app-core, schémas et migrations restent intacts.
- **Données utilisateur :** aucun contrat de données modifié. Le thème V2 est un attribut HTML, pas une donnée enregistrée.

### Retour arrière

| Niveau | Procédure |
|---|---|
| Un lot | `git revert <commit du lot>` sur `claude/rekka-v2` (un commit par lot) |
| Le thème V2 | Build sans `VITE_REKKA_THEME=v2` : l'interface actuelle s'affiche à l'identique (thème `kairo` par défaut) |
| Toute la V2 | Abandon de la branche `claude/rekka-v2`. La BÊTA, la production et le développement ne dépendent pas d'elle. |

### Dépendances

- La V2 s'appuie sur la BÊTA `e2cdcc5` : RC4.6 et corrections Course, **sans** RC5.1, RC5.3 ni RC5.4.
- **RC5.4** (approuvé sur le principe) pourra être repris selon la procédure démontrée ci-dessous, après votre accord.
- **Mise à jour sûre de la PWA :** prérequis de toute publication BÊTA de la V2. Proposition : `docs/kairo/REKKA-BETA-MAJ-AUTO.md`, sur `claude/kairo-rc4-dev`.

### Rapport : reprise de RC5.4 sans RC5.3 R3 (démontrée, **non intégrée**)

L'essai a été fait dans un espace de travail jetable, sur une branche locale non poussée issue de `e2cdcc5`.

| Commit RC5.4 (développement) | Reprise sur `e2cdcc5` | Ajustement nécessaire |
|---|---|---|
| `4c5b570` lot A — phases | sans conflit | — |
| `7d3e186` lot B — chronomètre | conflit sur 2 fixtures **générées** (`apps/kairo/tests/fixtures/r51-*.json`) | Garder la version BÊTA, puis régénérer (`R51_WRITE_FIXTURE=1`) |
| `4316878` lot C — durées | sans conflit | — |
| `206b711` lot D — E2E et ajustements | sans conflit, mais **dépendance cachée à R3** : il retire l'import `beta0Environment` de deux bancs de test (`tests/rc46/b4-cross-inputs.test.ts`, `tests/rc46/quality-bench.ts`), devenu inutile seulement avec R3 | Garder ces deux fichiers dans leur version BÊTA |
| `dc99d25` — constante de médiane | conflit sur l'instantané de taille et la fixture C-9, **régénérés avec R3** | Garder la version BÊTA, puis régénérer (`LOTC_WRITE_FIXTURE=1`, instantané inchangé) |

**Résultat sur la base BÊTA, avec RC5.4 et sans RC5.3 :**

| Vérification | Résultat |
|---|---|
| Types et lint | verts |
| Tests | **3 018 réussis, 0 échec** (261 fichiers) |
| Build de production | OK |
| E2E principal | OK, 303 vérifications |
| E2E RC5.4 à 360 et 390 px | OK, 38 vérifications |

**Conclusion :** RC5.4 ne dépend pas fonctionnellement de RC5.3. Les seules adhérences sont des fichiers de test générés et deux imports retirés par anticipation. La reprise est sûre en suivant la procédure ci-dessus. Elle se fera dans un lot dédié, **après votre accord**.

---

## V2-1 — Design system

Voir la section suivante du document.
