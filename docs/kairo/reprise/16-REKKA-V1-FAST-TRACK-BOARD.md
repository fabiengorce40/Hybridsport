# REKKA V1 — tableau FAST TRACK (référence unique de suivi)

À mettre à jour à chaque session. Les détails de l'audit sont dans `15-REKKA-FAST-TRACK-V1-AUDIT.md`.

**Règles :**
- aucun push, aucune fusion, aucun déploiement sans autorisation explicite (l'autorisation du jalon 2 ne couvre que sa mise à jour de la BÊTA existante) ;
- la production (`f9f7e2e`) n'est jamais touchée ;
- aucune politique scientifique n'est activée sans décision (seule `progression-stab-1` est autorisée, sur la BÊTA).

## État des références (dernière vérification indépendante : 4 novembre 2026)

| Référence | Commit | Note |
|---|---|---|
| BÊTA distante (`claude/rekka-beta`) | `f2218c57d037ef322ba83d3ae2a85549a7dc6fd9` | HEAD distant vérifié par Work ; version servie non vérifiable (HTTP 403). |
| Production (`claude/crosstraining-c1-c2-spike-vbg8dv`) | `f9f7e2e` | Intouchable. |
| Lot 4.6 (local) | `d59d91d` | Non poussé. |
| FAST TRACK | `claude/rekka-v1-fast-track` | Jalon 2 intégré ; voir le journal et le doc 17. |

## Jalons

| Jalon | État |
|---|---|
| 1 — Socle V1 (audit, P0 identifiés, données sécurisées, parcours vérifiés) | **Atteint en local.** Audit fait, P0-1 corrigé, P0-2 en décision (D1). |
| 2 — Fonctionnalités V1 complètes | **Atteint** (doc 17) : replanification confirmée, séances manquées, Progression, identité PWA, E2E HYROX / CT, `progression-stab-1` active sur la BÊTA. |
| 3 — Release Candidate | À venir. |
| 4 — Validation terrain Android | À venir. Requiert une publication autorisée. |

## Tâches

Statuts : FAIT (commit local) · EN COURS · À FAIRE · DÉCISION (attend un arbitrage) · REPORTÉ.

| ID | Chantier | Prio | Tâche | Statut | Preuve, branche, dépendance |
|---|---|---|---|---|---|
| FT-01 | E | — | Vérifier les références Git et le statut Cloudflare | PARTIEL | HEAD vérifiés par Work ; HTTP BÊTA 403 et paramètres Pages non vérifiables, doc 18 |
| FT-02 | E | — | Audit global V1 (4 sports, 20 parcours) | FAIT | Doc 15 |
| FT-03 | D | P0 | Import confirmé, comparaison, copie exacte avant remplacement ; effacement protégé | FAIT | `Settings0.tsx`, `store.tsx`, `app-core/store.ts` ; `import-failure-dom` (4 tests) |
| FT-04 | D | P1 | Hors ligne dès la première visite (précache BÊTA) ; test du cache du SW et étape post-déploiement | FAIT | `vite.config.ts`, `e2e-offline-smoke.mjs`, `rekka-beta-pages.yml`. À confirmer sur Android |
| FT-05 | C | P1 | Couleurs de sport de la charte ; couleur de thème bleu nuit | FAIT | `rekka/visual.css`, `vite.config.ts`, `e2e-beta.mjs` |
| FT-06 | A | P1 | P-CLSTAB : 20 profils sur 12 et 24 semaines ; profils en régression | FAIT | Doc 15 § 4 ; `lot46-shard-profiles-*` |
| FT-07 | A | P1 | Politiques de progression versionnées, tracées, relisibles, inactives | FAIT | `progression-policies.ts` ; `rc5-fasttrack-progression-policy` (3 tests) |
| FT-08 | A | P1 | B1ISO : cause des 140 changements (rotation A/B, pas d'instabilité) | FAIT | `rc5-fasttrack-b1iso` (2 tests) |
| FT-09 | A | P1 | Activer `progression-stab-1` (BÊTA) | FAIT | D2 validée ; `beta0.ts` ; fin de séance avec environnement ; `rc5-fasttrack-progression-activation` (4) ; `e2e-beta-progression.mjs` |
| FT-10 | B | P1 | Replanification après mise à jour : proposition « Planning actuel / Planning proposé », « Conserver mon planning » / « Appliquer le nouveau planning » | FAIT | `staleWeekProposal`, `WeekProposal.tsx` ; tests app-core et DOM ; `e2e.mjs` |
| FT-11 | B/A | P1 | Séance manquée : déclarer, reporter (récupération vérifiée), aperçu et confirmation | FAIT | `missedSessionOptions`, `MissedSession.tsx` ; 5 + 2 tests |
| FT-12 | B | P1 | Replanification étendue à la Course | À FAIRE | Dépend de FT-10 |
| FT-13 | C | P1 | Écran Progression : charges des exercices, Course, HYROX / CT (faits fiables seulement) | FAIT | `progress-view.ts`, `Progress0.tsx` ; 8 + 3 tests ; 360 / 390 px à mesurer en navigateur |
| FT-14 | C | P1 | Icônes REKKA, manifeste (id inchangé), précache | FAIT | `vite.config.ts` ; `beta-channel` ; `e2e-beta.mjs` (icônes servies) |
| FT-15 | E | P1 | E2E BÊTA : HYROX et CT (expérimental, garde-fous, parcours) | FAIT | `e2e-beta-ct-hyrox.mjs`, étape post-déploiement |
| FT-16 | A | P1 | Reprise Musculation après une coupure longue | DÉCISION D4 | Politique prudente proposée et sourcée, inactive (doc 17 § 7) |
| FT-17 | B | P1 | Sélection explicite de redistribution (RED-GUARD / SW-ALT) | DÉCISION D3 | Critère reproductible proposé (doc 17 § 7) ; à coder dans le candidat versionné puis simuler sur 20 profils |
| FT-18 | A | — | Périmètre V1 HYROX et Cross-training | FAIT (D1) | Quatre sports ; HYROX et CT « Expérimental », garde-fous intacts |
| FT-19 | A | P1 | Allures Course EASY/LONG | FAIT (D5) | Durée, intensité, RPE en V1 ; allures seulement si données fiables |
| FT-20 | C | P2 | Textes « KAIRO » restants dans la BÊTA | REPORTÉ | Bandeau, accueil, profil |
| FT-21 | C | P2 | Avancement de l'accueil conservé au rechargement | REPORTÉ | |
| FT-22 | A | P2 | Incréments de charge reliés à l'équipement déclaré | REPORTÉ | Sans palier inventé |
| FT-23 | E | P1 | Publication jalon 2 sur la BÊTA existante (avance rapide de `claude/rekka-beta`) | voir journal | Doc 17 § 8 |
| FT-24 | B | P1 | Reporter / replanifier aussi la Course depuis la proposition (au-delà du report d'une séance) | À FAIRE (jalon 3) | Dépend de FT-10 (fait) |
| FT-25 | C | P1 | Audit final interface 360 / 390 px (Progression, propositions, séance manquée) | PARTIEL (Work V3) | Rendu mesuré 360/390/1024, hors jalon 3 privé inaccessible ; doc 19 |
| FT-26 | E | P1 | Validation terrain Android (installation, séances complètes, hors ligne, sauvegarde) | À FAIRE (jalon 4) | Requiert la BÊTA publiée |

## Derniers contrôles (jalon 2, build BÊTA locale `c0ffee0`)

**Tests unitaires :** `pnpm check` (typecheck, lint, tests), **3321 tests réussis**.

**E2E :**
- E2E BÊTA du workflow : OK.
- `e2e.mjs` : 313 contrôles OK.
- 5 parcours (base, cross, hyrox, recovery, planning) : OK.
- Rotation A/B, phases, chronomètre, personnalisation à 390 px, séance mobile, répétitions mobile, jours de Musculation : OK.
- Horloge globale : OK.
- Hors ligne (première visite et rechargement) : OK.
- **Progression `progression-stab-1` (3 séances réelles)** : OK.
- **HYROX et Cross-training (expérimental, garde-fous)** : OK.

**Migrations et données :**
- format 3 → 5 et 4 → 5 : OK ;
- sécurité des données (garde multi-onglets) : OK ;
- **mise à jour depuis la BÊTA publiée `097bacb`** : données identiques octet pour octet, préférence conservée, **redémarrage hors ligne** après mise à jour (vérifié 4 fois) ;
- **mise à jour depuis `bc19fb1` (format 2 → 5)** : OK, et le retour arrière refuse sans écrire.

**Défauts de harnais corrigés :**
- lecture de l'ancienne page avant le rechargement de mise à jour ;
- publication simulée non atomique.

Il n'y avait aucun défaut produit derrière ces échecs.

## Décisions en attente

- **D1, D2 et D5** : tranchées (jalon 2).
- **D3 (redistribution)** et **D4 (reprise après coupure)** : propositions prêtes et inactives (doc 17 § 7). Elles attendent la décision du propriétaire.

## Journal

| Date | Branche | Commit | Contenu |
|---|---|---|---|
| 2026-11-03 | `claude/rekka-lot46-progression-stabilization` | `d59d91d` | Lot 4.6 (simulation, rien d'activé). |
| 2026-11-03 | `claude/rekka-v1-fast-track` | (ce commit) | Audit V1, tableau, FT-03 à FT-08. Local, non poussé. |
| 2026-11-03 | `claude/rekka-v1-fast-track` | `8d93350` … | Jalon 2 : replanification confirmée, séances manquées, Progression, identité PWA, E2E HYROX / CT, `progression-stab-1` active. |

## Reprise indépendante Work — 4 novembre 2026

| ID | Priorité | État / prochaine action | Dépendance |
|---|---|---|---|
| WORK-01 | P1 V1 | Défaut report dimanche/lundi reproduit : récupération 24 h acceptée au lieu de 36 h | Correction métier séparément autorisée puis tests frontière hebdomadaire |
| WORK-02 | P1 V1 | Défaut report séance ~51 min sur disponibilité 15 min reproduit | Correction métier séparément autorisée puis test durée |
| WORK-03 | P1 | Jalon 3 `ca60bcd` / `claude/rekka-v1-rc-j3` inaccessible à Work | Rendre le commit disponible, comparer avant intégration finale ; rien d'écrasé |
| WORK-04 | P1 | Refonte V3 réelle portée depuis f2218c5 en branche isolée ; QA locale exécutée : suite complète 3328 réussis / 11 ignorés, 8 ciblés finaux, Chromium 360/390/1024 | Rapport 19 et validation graphique |
| WORK-05 | P1 | Vérification Cloudflare/HEAD servi bloquée ; aucun connecteur, HTTP 403 | Lecture seule du compte avant publication ; workflow actuel autorise création si absent |
| WORK-06 | P1 | Résilience copie prémigration / quota : limites de code à reproduire | Chantier données distinct ; aucune migration modifiée en V3 |
| WORK-07 | P2 | Commentaire « aucune politique active » périmé | Mise à jour documentaire hors moteurs |

Chemin critique : résoudre/valider WORK-01/02 et les décisions sportives ouvertes, récupérer le jalon 3, comparer au candidat V3, finaliser QA/validation visuelle, vérifier l'isolation Cloudflare, puis autorisation distincte de publication. Android réel reste un jalon terrain. Les chantiers graphiques, données et contrôles de récupération sont parallélisables dans des fichiers distincts ; aucune nouvelle politique scientifique activée. Les résultats ci-dessus `3321` sont ceux du rapport Claude historique ; voir rapport 18 pour les exécutions indépendantes.

Validation indépendante : base f2218c5 3321 tests réussis / 11 ignorés ; V3 3328 / 11 et 8 ciblés finaux. Mise à jour PWA, précache, migrations 1/2/3/4→5, parité de séance et secours schéma5 vérifiés localement. WORK-04 reste en attente de validation graphique ; WORK-01/02/03/05/06 et le terrain Android ne sont pas levés. Aucun jalon 3 privé déclaré atteint par Work.
