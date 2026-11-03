# Reprise RC5 — Intégration des lots 1 à 4.5 dans la BÊTA REKKA

## 1. Branches et commits

| Élément | Valeur |
|---|---|
| BÊTA réelle (avant) | `claude/rekka-beta` à `bc19fb1`, déployée sur Cloudflare Pages `rekka-beta` (workflow `rekka-beta-pages.yml`, exécution n° 6, succès, 27/10) |
| Production | `claude/crosstraining-c1-c2-spike-vbg8dv` à `f9f7e2e` : **non touchée** (vérifiée avant et après) |
| Source Claude | `claude/rekka-lot45-progression-validation` à `acebdb2` (lots RC5 1 à 4.5) |
| Ancêtre commun | `e2cdcc5` |
| Écart | BÊTA : 2 commits propres (`f4820b4` identité visuelle REKKA V2 approuvée, `bc19fb1` plages de répétitions mobiles) ; RC5 : 79 commits (reprise V2.1 / V2.2, reprises 1–3A, lots RC5 1 à 4.5) |
| Branche d'intégration | `claude/rekka-rc5-beta-integration`, créée sur `bc19fb1` |
| Commit d'intégration | `cd1e6f4` (fusion sans réécriture, `--no-ff`), puis commit de validation (script de mise à jour BÊTA, ce document) |
| Publication | avance rapide de `claude/rekka-beta` (aucun commit distant écrasé, aucun force push) |

## 2. Audit BÊTA / RC5

| Domaine | BÊTA actuelle (`bc19fb1`) | Claude RC5 (`acebdb2`) | Action |
|---|---|---|---|
| Musculation | moteur V0 / RC4, format 2, sans personnalisation | V2.1 personnalisation (7 étapes), lots 3 (phases), 4 (Haut / Bas A/B), 4.1 (volume), 4.4 (récupération), 4.5 (RIR de référence) | **intégré** |
| Course | moteur Running | `packages/running` identique | conservé (aucun changement) |
| HYROX | moteur HYROX | `packages/hyrox` identique ; placement multisport corrigé (4.2) | conservé ; planification intégrée |
| Cross-training | moteur Cross-training | `packages/crosstraining` : code identique (test d'architecture seulement) | conservé |
| Planning | planificateur RC4 | replanification V2.2 avec aperçu et confirmation, garde de récupération sur la séance prescrite, placement réaliste, propositions hybrides (prototype hors interface) | **intégré** |
| Chronomètres | chronomètre de séance en mémoire | horloge globale unique horodatée, persistante, pauses figées (lot 2), isolation des onglets | **intégré** |
| Historique | format 2 | format 5, migration non destructive, copie exacte d'avant migration | **préservé** (E2E de mise à jour) |
| Sauvegardes | export / import | export / import, protection entre onglets et versions (« Données remplacées par une autre version »), contenus versionnés | **préservé et renforcé** |
| Interface | identité REKKA V2 approuvée (`REKKA_V2`), écrans BÊTA | mêmes écrans BÊTA portés, phases des séries, profil Musculation, replanification ; thème alternatif V2-1 présent mais **non activé** dans la build BÊTA | **identité BÊTA conservée** |

## 3. Conflits résolus

Six conflits, tous dans l'interface (l'identité REKKA V2 de la BÊTA avait été portée dans RC5) :

| Fichier | Résolution |
|---|---|
| `main.tsx`, `History0.tsx`, `Planning0.tsx`, `Settings0.tsx` | imports ajoutés par RC5 (thème, replanification, profil Musculation, durée approximative) conservés ; code BÊTA hors conflit intact |
| `design/kairo-ds.css` | plage de répétitions renvoyée à la ligne au lieu d'être tronquée (même intention que le correctif `bc19fb1`, qui est par ailleurs déjà présent dans RC5) |
| `rekka/visual.css` | couleur des titres de phase (lot 3) ajoutée à l'identité REKKA |

- **Workflow BÊTA :** conservé à l'identique, drapeau `E2E_REKKA_V2=1` compris.
- **Documentation et captures de la BÊTA :** conservées.
- **Code applicatif fusionné :** identique à `acebdb2`.

## 4. Fonctionnalités intégrées

- **Musculation :**
  - personnalisation en 7 étapes et cibles par groupe musculaire ;
  - phases des séries (`rampup`, `working`, `top_set`, `backoff`), les montées en charge restant exclues du volume productif et de la progression ;
  - rotation Haut A / Bas A / Haut B / Bas B pour les profils éligibles ;
  - volume par groupe principal et cibles inatteignables expliquées ;
  - récupération contrôlée sur la séance prescrite ;
  - catalogue `0.3.1-…-lot44`, les anciennes versions restant au registre ;
  - progression fondée sur le RIR réellement prescrit.
- **Planning :**
  - jours de Musculation choisis après les disponibilités ;
  - placement multisport corrigé ;
  - replanification partielle avec aperçu, confirmation et séances protégées.
- **Chronomètres :** horloge globale persistante (arrière-plan, rechargement, fin de séance).
- **Données :**
  - format 5 avec copie exacte d'avant migration ;
  - protection entre onglets et versions ;
  - export et import.

## 5. Politiques candidates restées inactives

Elles sont présentes dans le code et **inactives** :
- B1 (catalogue candidat hors registre) et réévaluation des isolations ;
- redistribution du volume, toutes variantes ;
- Q2 (borne glissante) et Q4 ;
- semaines courtes (`shortWeek`) ;
- propositions hybrides (prototype non branché à l'interface) ;
- lecture R4 et variantes de progression : option de simulation `progressionReading`, jamais renseignée.

**Vérification :**
- tests `rc5-lot44-options`, `rc5-lot45-candidates` et `rc5-lot43-planning` : environnement Beta 0 sans option, politique publiée sans option, contenus candidats absents du registre ;
- build BÊTA sans `VITE_REKKA_THEME` : le thème alternatif V2-1 n'est pas appliqué.

## 6. Tests avant publication

Sur la branche d'intégration (`cd1e6f4`), avant tout push :

| Contrôle | Résultat |
|---|---|
| `pnpm check` (TypeScript, ESLint, tests) | **vert** : 294 fichiers, **3277 tests**, 9 ignorés. Les ignorés sont les bancs de simulation sur demande (`LOT43_BENCH`, `LOT44_BENCH`, `LOT45_BENCH`, fusions) : ils sont lourds et lancés à la main ; leurs rapports sont versionnés |
| Build BÊTA (`pnpm kairo:build:beta`) | verte |
| E2E BÊTA : rotation A/B, phases, chronomètre, personnalisation (390 px), séance et répétitions mobiles (390 px), jours de Musculation, hors ligne | **tous verts** |
| **E2E du workflow de publication** (`e2e-beta.mjs`, `E2E_REKKA_V2=1`), exécuté en local sur la build candidate | **vert** (« E2E REKKA BÊTA OK ») |
| Parcours complets : base, cross, hyrox, recovery, planning | **verts** |
| E2E standard (`e2e.mjs`) | **310 vérifications OK** |
| Horloge globale et stockage auxiliaire (pause, rechargement, hors ligne, deux onglets) | vert |
| Garde de sécurité des données | vert |
| 360 px | mise à jour BÊTA réelle (360 px) et migrations (360 px) vertes ; captures du workflow |

- **Comparaison avec les références 4.4 et 4.5 :** mêmes suites, même nombre de tests que le lot 4.5 (3277), même code applicatif.
- **Activation involontaire :** aucune (§ 5).

## 7. Migrations

| Migration | Données | Résultat |
|---|---|---|
| **BÊTA publiée `bc19fb1` (format 2) → candidate (format 5)**, script `e2e-beta-rc5-upgrade.mjs` | programme créé par l'ancien parcours, puis état utilisateur importé : 7 séances journalisées, 19 expositions, 9 suivis | **vert** |
| V2.1 `5695917` (format 3) → candidate | formats 1 à 3 | **3 / 3** |
| `b850b98` (format 4) → candidate | formats 1 à 4 | **4 / 4** |

**Déroulé de la migration depuis la BÊTA publiée :**
1. La build A (la BÊTA réellement publiée, reconstruite depuis `bc19fb1`) est en cours d'utilisation.
2. La build B est publiée pendant que la page est ouverte : `version.json` change, le bandeau « Nouvelle version disponible » s'affiche, l'utilisateur appuie sur « Mettre à jour », et B s'exécute.

**Ce qui est vérifié :**
- l'export de B est **identique** à celui de A, hors numéro de format : séances, charges, expositions, suivis, profil, journaux ;
- la **copie exacte** du texte d'avant migration est conservée (`kairo.premigration.*`) ;
- l'identité REKKA est conservée, le Planning est affiché, les données sont identiques après rechargement, et aucune erreur JavaScript n'apparaît ;
- **retour arrière :** la build A rouverte sur les données v5 affiche « Mise à jour requise » et **ne les modifie pas**.

**Garanties :**
- aucune réinitialisation, aucune suppression ;
- séances commencées ou terminées, charges et prescriptions historiques relues avec leur contenu d'origine (registre versionné) ;
- fonctionnement hors ligne vérifié.

## 8. Publication

Complétée après la publication (section suivante du compte rendu).

## 9. Procédure de retour arrière

- **Référence de retour arrière :** le commit `bc19fb1`, déployé par l'exécution n° 6 du workflow BÊTA (succès), et le déploiement Cloudflare correspondant du projet `rekka-beta`.
- **Procédure :**
  1. **Aucun accès Cloudflare direct depuis cette session** : le jeton n'est jamais manipulé.
  2. Le retour arrière se fait :
     - par **`git revert`** du commit de fusion sur `claude/rekka-beta`, puis un push qui redéploie l'ancien code par le workflow ;
     - ou, par le propriétaire du compte, par la restauration du déploiement précédent dans le tableau de bord Cloudflare Pages.
- **Données, limite démontrée :**
  - les utilisateurs **déjà migrés** au format 5 voient, avec l'ancienne build, l'écran « Mise à jour requise » : données intactes, application inutilisable ;
  - la copie d'avant migration (format 2) reste sur l'appareil ;
  - un retour arrière **ne restaure pas** les données locales ;
  - le bon remède à un défaut est donc une **correction publiée en avant**. Le retour arrière n'est qu'un dernier recours, sans perte de données.
- **Utilisateurs non encore migrés :** non concernés.

## 10. Risques résiduels

- **Changement d'expérience :**
  - la création d'un programme Musculation passe désormais par la personnalisation en 7 étapes (V2.1) ;
  - les programmes existants ne sont pas modifiés ; les **nouvelles semaines** sont générées avec les moteurs RC5 ;
  - les semaines déjà planifiées gardent leur contenu.
- **Progression :** en multisport, le haut du corps progresse plus lentement depuis le lot 4.5. La charge est calculée pour l'effort réellement prescrit ; c'est attendu (document 12, § 15).
- **Vérification post-publication :**
  - les hôtes `*.pages.dev` ne sont pas joignables depuis cette session (politique réseau) ;
  - la vérification de la BÊTA publiée repose sur le travail `verify` du workflow : `version.json` doit correspondre au commit publié, puis `e2e-beta.mjs` s'exécute sur l'adresse HTTPS stable, depuis GitHub ;
  - un contrôle manuel sur téléphone reste recommandé.
- **Données d'un ancien onglet resté ouvert :** la protection « Données remplacées par une autre version » s'applique.
