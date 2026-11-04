# Audit indépendant Work — REKKA V1

Audit commencé le 4 novembre 2026. Base examinée : `f2218c57d037ef322ba83d3ae2a85549a7dc6fd9`. Aucun moteur modifié pour l'audit. Les résultats exécutés sont complétés dans la section QA en fin de mission ; les déclarations historiques ne valent pas exécution actuelle.

## Références et périmètre vérifié

| Référence | Constat | Nature de preuve |
|---|---|---|
| `claude/rekka-beta` | `f2218c57d037ef322ba83d3ae2a85549a7dc6fd9` | Lecture `git ls-remote`, objets récupérés et code examiné |
| `claude/rekka-v1-beta-j2` | Même SHA que BÊTA | Lecture distante |
| Production `claude/crosstraining-c1-c2-spike-vbg8dv` | `f9f7e2e94dc87bb0176d55f8f730f2563c1f60a9` | Lecture distante et objet local |
| `claude/rekka-v1-rc-j3`, `ca60bcd` | Absents du workspace et des références distantes accessibles ; GitHub ne trouve pas ce commit | Non vérifiable, environnement local Claude non partagé |
| Version HTTP BÊTA | Accès direct `/` et `/version.json` refusé HTTP 403 ; outil web également inaccessible | Version effectivement déployée non certifiée |
| Ancien V3 Work | Worktree `rekka-v3`, branche `codex/rekka-v3-sober-beta-visual`, modifications non commitées, base `cc1ac3b…` en schéma 4 | Fichiers récupérables, préservés |
| V2.4.3 / V2.4.4 | `77e287a…` / `cc1ac3b…`, conservés | Historique local |
| Ancien visuel | `e80aa8fda475356bb6594283b72efe4cf439dd01` et branches V2 disponibles | Historique local, direction manga ancienne |

Le tableau 16 de Claude annonce encore `097bacb` dans sa table de références : cette ligne est périmée par rapport au HEAD distant f2218c5. Les travaux locaux Claude ultérieurs ne sont pas réputés présents. La refonte est basée sur la BÊTA actuelle accessible, pas sur V2 ni sur un jalon 3 imaginaire.

## Déploiement et autorisations

`.github/workflows/rekka-beta-pages.yml` : push sur `claude/rekka-beta` pour les chemins applicatifs, et `workflow_dispatch` gardé par la même branche. Le workflow cible `CF_PROJECT=rekka-beta`, déploie avec `--branch=main` et comporte encore une création de projet si absent. Ce chemin est incompatible avec l'interdiction actuelle de créer un projet : ne pas l'exécuter pendant cette mission. Permissions GitHub du workflow `contents: read` ; présence et périmètre des jetons Cloudflare non vérifiés, aucun secret consulté.

Aucun connecteur Cloudflare disponible après recherche. Branches surveillées et déploiements automatiques de l'intégration Pages non certifiables. Aucun push, lancement de workflow, création de projet ni déploiement. La production et ESSAI sont préservées. Le domaine public seul n'établit pas la configuration du compte.

## Matrice indépendante

| Domaine | État réel | Problèmes / limites | Priorité | Action |
|---|---|---|---|---|
| Base actuelle | Schéma 5 dans `model.ts`, migrations additives dans `store.ts` | Jalon 3 privé inaccessible | P1 | Proposer l'intégration sur f2218c5, comparer ultérieurement au vrai jalon 3 |
| Musculation | Personnalisation, prescriptions, RIR, phases et rotation présents ; progression BÊTA `progression-stab-1` active | Statut candidate V1 est un statut produit, pas une certification sportive indépendante | P1 | Préserver tous les contrats et leur traçage ; tests avant/après |
| Course | Références de test, lecteur, RPE/intensités, historique et report unitaire présents | Recalcul après modification du profil encore centré Musculation/HYROX ; FT-12/24 ouverts | P1 | Chantier métier distinct de la refonte |
| HYROX | Lecteur et prescriptions spécifiques, durées, journaux, garde-fous | Expérimental ; ne pas inventer de progression fiable dans l'UI | P1 | Garder avertissements et lecteur propre |
| Cross-training | Lecteur spécifique, stimuli et politiques gouvernées | Expérimental ; les refus de sécurité ne constituent pas des erreurs à contourner | P1 | Préserver les refus, aucune nouvelle politique activée |
| Replanification | Aperçus purs, confirmations, garde contre aperçu périmé, séances protégées | Ne pas confondre recalcul semaine obsolète et modification du profil Course | P1 | Tester les deux parcours, ne pas écrire lors d'un simple aperçu |
| Séance manquée | Déclaration et report avec confirmation et contrôles présents | Limite de voisinage de récupération intersemaine à examiner séparément | P1 | Sonde ciblée ; ne pas corriger l'algorithme dans V3 |
| Import / suppression | Comparaison, consentement, copie exacte et garde multi-onglets présents | Certaines erreurs de stockage/migration nécessitent un examen complémentaire | P1 | Conserver les protections et tester échecs, quota et données illisibles |
| Chronomètres | Échéances et pauses persistées, global et lecteurs dédiés | Repos : seulement pause/resume/extend/skip, pas de réduction -15 | P2 | Afficher les seules actions compatibles ; pas de réécriture temporelle |
| PWA | Identité BÊTA, précache assets/icônes et isolation de préfixe dans `vite.config.ts` | Mise à jour et reprise immédiatement hors ligne à vérifier ; Android réel non testé ici | P1 | Tests de vraies builds et essai terrain ultérieur |
| Graphique | Ancienne BÊTA manga, ressources raster et titres condensés | Ancien V3 récupérable mais dépendances UI et fixtures schéma 4 | P1 | Réemploi sélectif de composants ; aucun package métier ancien importé |
| Performance | Moteurs dans le navigateur, gros bundle connu | Mesure de taille et parcours requise, pas de promesse de fluidité Samsung non mesurée | P2 | Relever build et erreurs ; éviter animations permanentes |

## Comparaison aux rapports de Claude

- Confirmé par le code : schéma 5 ; chronomètres persistants ; `beta0Environment()` choisit `progression-stab-1` et les fins de séance utilisent cet environnement ; phases `rampup`, `working/top_set`, `backoff` conservées ; Progression projette les données enregistrées ; aperçu et confirmation de la semaine obsolète ; import protégé.
- Déclaré dans les rapports : statut candidate V1, résultats historiques `3321` et publication réussie du jalon 2. Ces nombres et cette publication ne sont pas réutilisés comme preuves de la présente exécution.
- Non vérifiable : commit local Claude ca60bcd, contenu du jalon 3 non poussé, HEAD réellement servi, configuration Pages et validation Samsung.
- Les anomalies décrites dans le doc 15 sur l'ancienne replanification silencieuse ont été corrigées dans le code du doc 17 ; ne pas les réannoncer comme actuelles.
- Aucune activation nouvelle de R4, B1ISO, RED-GUARD, SW-ALT n'est autorisée. La refonte doit laisser les packages métier identiques à f2218c5.

## Décision de base pour la phase 2

Aucun P0 démontré rendant dangereuse une adaptation uniquement visuelle. Continuer localement sur `codex/rekka-v3-sober-fast-track-integration` depuis f2218c5. Garder le worktree d'audit intact pour comparer avant/après. Les points P1 restent des conditions de préparation à la V1 et ne sont pas discrètement corrigés par une modification sportive.

## Anomalies indépendantes établies pendant l'audit

**P1 — Récupération au changement de semaine (défaut reproduit).** `beta0-app.ts:537-560` ne considère que la semaine courante et la précédente pour les voisins d'un report. Une sonde synthétique validée schéma 5 propose puis accepte dimanche 11 octobre pour un Full Body, alors qu'un autre Full Body est déjà prévu lundi 12 octobre : 24 h au lieu de 36 h. Le test de démonstration passe parce qu'il constate le défaut, il ne certifie pas sa correction. Preuve scratch `independent-audit/recovery-boundary.test.ts` et journal associé. Ceci contredit la portée générale « avant comme après » annoncée au doc 17. Aucun correctif sportif réalisé dans la refonte.

**P1 — Durée d'un créneau de report (défaut reproduit).** Le filtre de `beta0-app.ts:565-571` accepte une disponibilité positive sans comparer les minutes au besoin de la séance. Le contrôle interférence de `planner.ts:96-100` ne remplace pas ce contrôle de durée.

**P1 — Résilience stockage (lecture de code, pas panne reproduite).** Si la copie exacte avant migration échoue (`store.ts:140-146`), le résultat peut rester `ok` avec avertissement ; aucune garantie absolue de copie avant toute future écriture. L'écriture de copie de données illisibles (`store.ts:149-152`) peut lever une erreur de quota non interceptée. L'import sécurisé, lui, refuse le remplacement quand sa copie échoue.

**Import :** `Settings0.tsx:50-51` appelle `openWeek` sur l'état importé : selon la date, des semaines peuvent être préparées/clôturées. Le fichier importé et l'état actif ne sont donc pas systématiquement identiques octet pour octet ; l'export de l'état existant est fidèle. La garde multi-onglets est une suite d'écritures localStorage, pas une transaction atomique.

**P2 documentaire :** `progression-policies.ts:2-5` annonce encore qu'aucune politique n'est active, alors que `progression-stab-1` est sélectionnée dans l'environnement BÊTA. Ce commentaire n'est pas modifié dans le chantier graphique.

La Course utilise les décisions produit `MINIMAL_STEP` (60 s / une répétition, deux séances tolérées et une seule variable) et des garde-fous HOLD ; la décrire comme systématiquement figée serait inexact. La première exposition HILLS reste bloquée dans l'attente de sources. HYROX/CT demeurent expérimentaux ; leur gouvernance de test BÊTA n'est pas une approbation production.

Deuxième sonde exécutée : une prescription de 54 min (estimation médiane 50,8 min) est proposée puis acceptée sur une disponibilité de 15 min, sans changer la prescription. Deux tests de démonstration exécutés, 2/2 : ils établissent les deux défauts préexistants et ne les corrigent pas.
