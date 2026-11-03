# REKKA V1 — tableau FAST TRACK (référence unique de suivi)

À mettre à jour à chaque session. Les détails de l'audit sont dans `15-REKKA-FAST-TRACK-V1-AUDIT.md`.

**Règles :**
- aucun push, aucune fusion, aucun déploiement sans autorisation explicite ;
- la production (`f9f7e2e`) n'est jamais touchée ;
- aucune politique scientifique n'est activée sans décision.

## État des références (dernière vérification : 3 novembre 2026)

| Référence | Commit | Note |
|---|---|---|
| BÊTA publiée (`claude/rekka-beta`, rekka-beta.pages.dev) | `097bacb` | Exécution n° 7 réussie (CI). Pas encore de validation sur appareil. |
| Production (`claude/crosstraining-c1-c2-spike-vbg8dv`) | `f9f7e2e` | Intouchable. |
| Lot 4.6 (local) | `d59d91d` | Non poussé. |
| FAST TRACK (local) | `claude/rekka-v1-fast-track` | Non poussé ; voir le journal. |

## Jalons

| Jalon | État |
|---|---|
| 1 — Socle V1 (audit, P0 identifiés, données sécurisées, parcours vérifiés) | **Atteint en local.** Audit fait, P0-1 corrigé, P0-2 en décision (D1). |
| 2 — Fonctionnalités V1 complètes | En cours. |
| 3 — Release Candidate | À venir. |
| 4 — Validation terrain Android | À venir. Requiert une publication autorisée. |

## Tâches

Statuts : FAIT (commit local) · EN COURS · À FAIRE · DÉCISION (attend un arbitrage) · REPORTÉ.

| ID | Chantier | Prio | Tâche | Statut | Preuve, branche, dépendance |
|---|---|---|---|---|---|
| FT-01 | E | — | Vérifier les références Git et le statut Cloudflare | FAIT | Doc 15 § 0 |
| FT-02 | E | — | Audit global V1 (4 sports, 20 parcours) | FAIT | Doc 15 |
| FT-03 | D | P0 | Import confirmé, comparaison, copie exacte avant remplacement ; effacement protégé | FAIT | `Settings0.tsx`, `store.tsx`, `app-core/store.ts` ; `import-failure-dom` (4 tests) |
| FT-04 | D | P1 | Hors ligne dès la première visite (précache BÊTA) ; test du cache du SW et étape post-déploiement | FAIT | `vite.config.ts`, `e2e-offline-smoke.mjs`, `rekka-beta-pages.yml`. À confirmer sur Android |
| FT-05 | C | P1 | Couleurs de sport de la charte ; couleur de thème bleu nuit | FAIT | `rekka/visual.css`, `vite.config.ts`, `e2e-beta.mjs` |
| FT-06 | A | P1 | P-CLSTAB : 20 profils sur 12 et 24 semaines ; profils en régression | FAIT | Doc 15 § 4 ; `lot46-shard-profiles-*` |
| FT-07 | A | P1 | Politiques de progression versionnées, tracées, relisibles, inactives | FAIT | `progression-policies.ts` ; `rc5-fasttrack-progression-policy` (3 tests) |
| FT-08 | A | P1 | B1ISO : cause des 140 changements (rotation A/B, pas d'instabilité) | FAIT | `rc5-fasttrack-b1iso` (2 tests) |
| FT-09 | A | P1 | Activer la politique de progression retenue (BÊTA) | DÉCISION D2 | Après décision : une ligne dans `beta0Environment` + E2E |
| FT-10 | B | P1 | Replanification après mise à jour : proposition « Planning actuel / Planning proposé », « Conserver mon planning » / « Appliquer le nouveau planning » | À FAIRE | `beta0-app.ts:283-289` ; prioritaire sur FT-12 |
| FT-11 | B/A | P1 | Séance manquée : action utilisateur (déclarer, reporter) | À FAIRE | Règle Course existante |
| FT-12 | B | P1 | Replanification étendue à la Course | À FAIRE | Dépend de FT-10 |
| FT-13 | C | P1 | Écran Progression : charges des exercices principaux, séances par sport | À FAIRE | Après D2 de préférence |
| FT-14 | C | P1 | Icônes REKKA (audit et intégration de `codex/rekka-android-icon-fullbleed`) | À FAIRE | Identité PWA |
| FT-15 | E | P1 | E2E BÊTA : parcours CT et HYROX | À FAIRE | Selon D1 |
| FT-16 | A | P1 | Reprise Musculation après une coupure longue | DÉCISION D4 | Règle à sourcer |
| FT-17 | B | P1 | Sélection explicite de redistribution (RED-GUARD / SW-ALT), puis simulation | À FAIRE puis DÉCISION D3 | Critère proposé dans le doc 15 § 4 |
| FT-18 | A | — | Périmètre V1 HYROX et Cross-training | DÉCISION D1 | Recommandation : V1 Musculation + Course, CT et HYROX « Expérimental » |
| FT-19 | A | P1 | Allures Course EASY/LONG | DÉCISION D5 | Recommandation : durée + RPE en V1 |
| FT-20 | C | P2 | Textes « KAIRO » restants dans la BÊTA | REPORTÉ | Bandeau, accueil, profil |
| FT-21 | C | P2 | Avancement de l'accueil conservé au rechargement | REPORTÉ | |
| FT-22 | A | P2 | Incréments de charge reliés à l'équipement déclaré | REPORTÉ | Sans palier inventé |

## Derniers contrôles (commit FAST TRACK local, build BÊTA locale)

**Tests unitaires :** `pnpm check` (typecheck, lint, tests), **3291 tests réussis**, dont 9 nouveaux.

**E2E :**
- E2E BÊTA du workflow : OK.
- `e2e.mjs` : 310 contrôles OK.
- 5 parcours (base, cross, hyrox, recovery, planning) : OK.
- Rotation A/B, phases, chronomètre, personnalisation à 390 px, séance mobile, répétitions mobile, jours de Musculation : OK.
- Horloge globale : OK.
- Hors ligne (première visite et rechargement) : OK.

**Migrations et données :**
- format 3 → 5 et 4 → 5 : OK ;
- sécurité des données (garde multi-onglets) : OK ;
- **mise à jour depuis la BÊTA publiée `097bacb`** : données identiques octet pour octet ;
- **mise à jour depuis `bc19fb1` (format 2 → 5)** : OK, et le retour arrière refuse sans écrire.

## Décisions en attente

D1 à D5 : voir le doc 15 § 6. La recommandation et les conséquences y sont indiquées pour chacune.

## Journal

| Date | Branche | Commit | Contenu |
|---|---|---|---|
| 2026-11-03 | `claude/rekka-lot46-progression-stabilization` | `d59d91d` | Lot 4.6 (simulation, rien d'activé). |
| 2026-11-03 | `claude/rekka-v1-fast-track` | (ce commit) | Audit V1, tableau, FT-03 à FT-08. Local, non poussé. |
