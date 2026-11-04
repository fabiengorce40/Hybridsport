# REKKA V3 — intégration de la planche finale carbone

4 novembre 2026. Travail local uniquement. **Aucune publication autorisée ni effectuée.**

## Base vérifiée et isolation

| Référence | État vérifié |
|---|---|
| Work antérieur | `ca0b317af3c958590cef8d94beb9bf7f0217ba02`, branche `codex/rekka-v3-sober-fast-track-integration`, récupéré et conservé |
| Nouvelle branche locale | `codex/rekka-v3-final-carbon`, dérivée de ce commit, sans fusion |
| Code intégré et build des captures | `cb12954ef0a233e6381a2e2acb026b7a6103d823` |
| BÊTA distante | Lecture `ls-remote` : `claude/rekka-beta` reste à `f2218c57d037ef322ba83d3ae2a85549a7dc6fd9` |
| Source production annoncée | Référence distante toujours à `f9f7e2e94dc87bb0176d55f8f730f2563c1f60a9` ; ceci ne certifie pas la version effectivement servie |
| Jalon 3 Claude | `claude/rekka-v1-rc-j3` absent des références accessibles ; `ca60bcd` non récupéré dans l'audit précédent, aucune récupération nouvelle prétendue |
| Travaux en cours | Worktree propre au départ. Les autres branches/worktrees et leurs commits sont préservés |

La base Work inclut déjà le portage sélectif des visuels sur le code BÊTA schéma 5. Aucun ancien package métier V2 n'est réintroduit. Les rapports 18 et 19 restent la référence de l'audit indépendant précédent ; leurs résultats historiques sont distingués des exécutions de cette mission.

## Référence graphique et ressources

La planche finale jointe (six téléphones, image native 934×1536) est prioritaire sur les anciennes montagnes et silhouettes. Aucun nouveau concept de design ni prototype séparé n'est livré.

- Fond global natif CSS : noir carbone/anthracite, diagonales très discrètes et disque partiel en dégradés radiaux. Aucun téléchargement de texture et aucune image de fond différente selon la page.
- Logo A1 : planche de logos officielle retrouvée, A1 supérieur gauche isolé sur fond transparent puis encodé WebP sans perte (~558 ko). **Le fichier source détouré/vectoriel original n'est pas disponible. L'extraction assistée peut différer dans ses microtraits : ce n'est pas une identité au pixel près.** Ressource `src/sober/assets/rekka-a1.webp`, affichée uniquement à l'accueil, jamais remplacée par une police.
- Titres sportifs : police condensée Barlow déjà embarquée ; corps et saisies Inter. La police source de la maquette n'est pas identifiée avec certitude.
- Pinceau du chrono : SVG organique déjà raccordé au véritable contrat de repos ; conservé. Aucun nouvel état temporel décoratif.
- Pictogrammes sportifs canoniques existants, pictogrammes fonctionnels de profil en SVG. Aucun portrait manga, croquis d'exercice, silhouette anatomique ou montagne n'est rendu dans le parcours V3.
- Les ressources historiques restent disponibles pour les builds hors V3. Leur présence dans le dépôt/bundle ne signifie pas leur affichage dans V3.

## Composants raccordés

| Écran | Vrais composants | Intégration et comportement conservé |
|---|---|---|
| Accueil | `Home0`, `RekkaBrand`, `SportLinks`, `SessionCard0` | A1, slogan visible « Nourris ta flamme. », date réelle, prochaine séance et CTA, quatre sports, bilan semaine. Ancien slogan supprimé en V3. Alertes douleur, matériel et conflits conservées |
| Planning | `Planning0`, `PlanningCatalog`, `SessionCard0` | Groupes par sport, navigation semaine, liste/grille et période conservées. Explications et replanification accessibles via « Organisation et replanification ». Alertes critiques/stale non masquées |
| Présentation | `StrengthPreview` appelé par `Session0` | Liste typographique et numérotation néon, objectif et prescriptions dépliables, durée et séries réelles, démarrage et précontrôle existants. Aucun dessin d'exercice |
| Séance active | `LiveWorkout`, `SetLine`, `RestTimer0` | Navigation exercices/séries, muscles textuels, saisies, validation/dévalidation, phases RC5, RIR et indices originaux, commandes et fin de séance, vrai chrono persistant. Aucune silhouette |
| Progression | `Progress0` dans `History0` | Sélecteur des quatre sports, exercice réel, métriques charge/répétitions/volume issues des journaux existants. Aucun point inventé. Historique, course libre et limites expérimentales conservés |
| Profil | `Settings0`, `ProfileIcon`, assistant `Setup` existant | Six entrées. Objectifs ouvre les vrais profils sportifs ; disponibilités/matériel/sports affichent les déclarations et accèdent à l'assistant existant ; données ouvre le même import/export protégé ; paramètres conserve version, journal et outils BÊTA |
| Autres sports | Lecteurs Course/HYROX/CT existants, `VisualHeader`, tokens | Même identité carbone, couleurs officielles et interactions spécifiques ; aucun modèle Musculation imposé |

`App.tsx` transmet seulement la navigation vers l'assistant de modification existant. `Artwork.tsx` supprime les décorations précédentes et conserve les libellés musculaires et le SVG du chrono. Les scripts E2E sont adaptés aux nouvelles entrées Profil, sans enlever les assertions de conservation, d'import ou de confirmation.

## Invariants métier

Comparaison Git depuis `ca0b317` : **aucun changement dans `packages/`, `.github/`, les moteurs, schémas, migrations, sélecteurs sportifs, stockage ou politiques**. Les arbres métier et workflows restent identiques. Schéma 5 et `progression-stab-1` restent actifs selon la même configuration que la base Work.

Le fichier `RestTimer0.tsx` ne change que son import décoratif et retire les montagnes. Ses actions, échéances, pause/reprise, extension et passage ne sont pas réécrits. La réduction −15 s n'existe pas dans ce contrat : elle n'est pas simulée par un faux bouton. C'est un écart explicite avec la maquette.

Toutes les fixtures, installations et états utilisés sont fictifs et locaux. Aucun stockage du compte utilisateur réel n'est consulté ou modifié. Aucun effacement de données existantes, push, merge, appel de déploiement ou modification Cloudflare.

## Résultats réellement exécutés

Preuves détaillées : dossier de validation `REKKA-V3-CARBONE-VALIDATION.zip`, comprenant captures brutes, comparaisons, métriques Chromium et journaux. Exécution des suites lourdes limitée à un worker, sans augmentation des délais des tests.

| Contrôle | Résultat de cette mission |
|---|---|
| TypeScript racine et application | Réussi |
| ESLint dépôt | Réussi |
| Build BÊTA V3 et build par défaut hors V3 | Réussis ; avertissement de chunk >1000 ko conservé, pas masqué |
| Suite exhaustive Vitest | **3331 réussis, 11 ignorés, 0 échec, 310 fichiers** ; 694 s. JSON complet conservé |
| Composants V3 | 10 tests réussis, inclus dans l'exhaustif : saisies, protection/dévalidation, focus, phases/indices/RIR, contrat chrono, absence d'illustrations/logos répétés |
| Chromium 360/390/1024 | Six vraies vues ; aucun débordement horizontal constaté ; navigation et cibles actives de séance ≥44 px ; charge 200,5 lisible et exacte ; brouillons, dévalidation et états protégés |
| Composition calculée | Éditeur au-dessus de toutes les séries, validation après les séries ; fond carbone et police calculés ; logo seulement accueil ; aucun ancien lecteur/prototype visible sur la route active |
| Contrastes contrôlés | Couleurs calculées titre/muscles sur la surface V3 la plus claire (contrôle conservateur sRGB) : 12,31:1 et 7,66:1, seuil 4,5:1 passé ; pas une certification exhaustive de tous les pixels/états |
| Couleurs calculées | Icônes accueil ET bordures des catégories Planning : rgb(220,255,53), rgb(57,221,235), rgb(255,67,139), rgb(139,92,246). Anneau chrono : rgb(220,255,53) |
| Progression | Changement de sport et de métrique sans aucune écriture ; répétitions/volume affichés égaux aux données enregistrées |
| Chronos | Repos/global, pause/reprise, +15, passage, échéance après changement d'onglet, rechargement et reprise hors ligne ; mouvement réduit contrôlé |
| Parité BÊTA f2218c5 / V3 | État schéma 5 complet strictement identique pour la même fixture, heure et suite d'actions (ouverture, précontrôle, démarrage, 10 répétitions à 24 kg, validation et repos) |
| Course, CT, HYROX, récupération, planning | Parcours E2E concernés réussis. Le premier passage récupération a trouvé un recouvrement par la tabbar ; suppression du nouveau contexte d'empilement de l'écran, parcours final réussi |
| Personnalisation/replanification | 360/390 : aperçu, annulation, confirmation, historique conservé et aucune séance réalisée remplacée ; parcours réussi |
| Progression sportive active | Trois séances réellement générées, décisions `progression-stab-1` et traçage conservés ; suite E2E réussie |
| Politiques expérimentales | E2E de garde-fous réussi ; aucune politique supplémentaire activée |
| Migration/sauvegardes | Navigateur : 1/2/3 lus par le lecteur historique schéma 4 puis migration exacte vers 5 ; 4→5 également réussi ; exports/import confirmé, IndexedDB et refus de lecture v5 par ancien lecteur sans écrasement |
| PWA | Manifeste BÊTA/identifiant conservés, aucune erreur d'installabilité Chromium ; précache, vraie mise à jour depuis f2218c5, toutes clés BÊTA strictement conservées ; redémarrage hors ligne |
| Secours schéma 5 | Build f2218c5 relisant une sauvegarde réellement produite par V3 : journaux/charges/performance conservés, lecteur historique utilisable |
| Sondes métier de l'audit 18 | Deux tests de démonstration reproduisent encore les deux défauts de report ci-dessous ; **leur réussite ne signifie pas que les défauts sont corrigés** |

Erreurs intermédiaires corrigées : sélecteurs de nouveaux tests trop larges, règle de police historique plus spécifique, mauvaise hypothèse du premier runner migration (lecteur identifié en schéma 4, pas 3), ordre des séries et recouvrement de dialogue. Les échecs initiaux ne sont pas cachés par un délai arbitraire ou un clic forcé.

## Comparaison graphique et écarts explicites

Captures brutes de l'application à 390×960, plus versions 360 et 1024 ; vue complète de présentation et séance active ; gros plan du chrono et des quatre sports. La planche de six captures n'est pas utilisée comme interface.

Chaque comparaison comporte référence, rendu React, superposition 50 % et différence RGB amplifiée ×2. Les intérieurs des téléphones sont recadrés, ramenés à largeur 390 sans étirer la hauteur. Recadrages source (x0,y0,x1,y1) : accueil (16,44,297,697), planning (327,44,608,697), présentation (639,44,920,697), actif (16,774,297,1460), progression (327,774,608,1460), profil (639,774,920,1460). Bandeaux BÊTA retirés seulement dans les panneaux de comparaison, présents dans les captures brutes. **Aucun score 95/100 % revendiqué** : les états et données ne sont pas exactement ceux de la maquette.

| Élément | Résultat / différence restante |
|---|---|
| Fond | Carbone natif partagé, aucune montagne. Disque construit en CSS ; il n'a pas la gravure photographique exacte de la planche |
| Logo | A1 reconnaissable et unique sur accueil ; extraction et microtexture à valider, source original transparent toujours préférable |
| Accueil/Planning | De vraies alertes de conflit et de charge sont conservées, ce qui augmente les cartes/hauteurs. Aucun avertissement supprimé pour imiter un état sans conflit |
| Planning | Filtres liste/grille/période et numéro de semaine du programme conservés ; date exacte affichée. Pas d'invention d'un numéro ISO ou d'un planning conforme à la maquette |
| Présentation | Consignes et report de séance restent disponibles au-delà de la zone principale ; titres et prescriptions viennent du catalogue réel |
| Actif | Ligne de prescription RC5/RIR conservée et consignes accessibles via menu ; hauteur légèrement supérieure. −15 s absent car non supporté ; Passer disponible sous l'anneau |
| Progression | La capture a seulement une séance réellement saisie : un point, pas une courbe fictive à cinq points. Les périodes et l'historique reflètent les données. Axes plus simples que la planche |
| Profil | Les sous-titres reflètent le profil fictif réel (7 créneaux, 28 équipements), pas les exemples 4–5 de la maquette. Notifications/thème ne sont pas de faux réglages : les paramètres exposent les outils existants |
| BÊTA | Bandeaux d'identité/version et avertissement expérimental conservés, absents de la planche ; aucune identité ESSAI substituée à la BÊTA |
| Appareils | Chromium mobile simulé, pas validation sur Samsung physique ; clavier Android, reprise longue et notifications système restent à essayer sur appareil |
| Performance | Aucun paquet ajouté, texture native, nouveau logo ~558 ko. Bundle historique important et avertissement Vite conservés : optimisation différée, aucune promesse de performance terrain |

## Anomalies métier et limites indépendantes du design

1. **P1, récupération dimanche/lundi** : report d'un Full Body vers dimanche accepté malgré un Full Body lundi suivant, 24 h au lieu des 36 h attendues dans la sonde. Toujours reproduit sur les packages du candidat.
2. **P1, durée du créneau** : séance ~54 min (p50 ~50,8) reportable vers 15 min ; toujours reproduit.
3. Les limites de résilience du stockage et de replanification Course décrites au rapport 18 ne sont pas corrigées ni requalifiées en réussites par une refonte graphique.
4. HYROX et CT restent expérimentaux. Les parcours passent, sans certification sportive générale ni activation de R4/B1ISO/RED-GUARD.
5. Jalon 3 Claude non partagé, version effectivement servie par le domaine BÊTA et configuration du compte Cloudflare non certifiées.

## Procédure proposée pour la BÊTA existante — à autoriser séparément

**Arrêt avant toute opération distante d'écriture.** La cible future demeure exclusivement `rekka-beta`, pas ESSAI/production ni une nouvelle application.

1. Recevoir la validation graphique et, séparément, l'autorisation de publication. Obtenir le vrai jalon 3 si disponible, comparer ses changements fonctionnels avant toute intégration ; ne pas les écraser.
2. Relire les HEAD BÊTA/production et refaire la comparaison. Consulter en lecture seule Cloudflare : projet existant, dépôt connecté, branche de production, branches de preview et filtres automatiques ; si invérifiable, arrêter la publication.
3. Auditer les permissions GitHub et les déclencheurs exacts. Le workflow actuel écoute les pushes `claude/rekka-beta`, propose aussi `workflow_dispatch`, cible `rekka-beta` et déploie `--branch=main`. Il contient encore un chemin de création de projet : **ne pas l'exécuter tel quel si créer un projet reste interdit**.
4. Faire approuver un chemin de publication ne visant que le projet existant, sans création, et activant explicitement `VITE_KAIRO_CHANNEL=beta`, `VITE_REKKA_THEME=v2`, `VITE_REKKA_VISUAL=v3`. Le workflow actuel n'est pas changé dans cette mission ; un push ordinaire ne garantit pas la sélection de ce rendu.
5. Après autorisation, intégrer seulement les commits revus sur la vraie branche BÊTA, sans force push et sans toucher ESSAI/production. Un push BÊTA peut déjà déclencher le workflow : il fait partie de la publication autorisée, jamais d'une étape « neutre ».
6. Garder un artefact immuable BÊTA précédent schéma 5, sauvegarde exportée volontairement par le testeur, SHA et identifiant de déploiement. Build/QA du SHA définitif puis publication unique sur le projet existant.
7. Vérifier `/version.json`, manifeste/id/scope, route réelle, couleurs, chronos, saisie, données, hors ligne et mise à jour sur Samsung. Ne jamais importer la fixture de QA dans le stockage réel du testeur.

### Retour arrière compatible schéma 5

Réactiver le dernier artefact BÊTA **schéma 5** vérifié (f2218c5 testé ici comme secours, ou une version ultérieure qualifiée), en conservant domaine, identité PWA, namespace et données. Ne jamais revenir à un lecteur schéma 3/4 ni changer `schemaVersion` manuellement. Ne pas effacer localStorage, IndexedDB ou sauvegardes ; l'éventuelle rotation des caches SW doit suivre le mécanisme existant et préserver les données. Contrôler mise à jour/réouverture en ligne avant l'essai hors ligne, et relire les journaux conservés. Un rollback du seul code ne résout pas les P1 sportifs connus.

## État de livraison

Code intégré dans la vraie application, branché sur les actions actuelles, testé localement et prêt pour **revue visuelle**. Les anomalies métier et le blocage Cloudflare restent explicitement ouverts. Le commit documentaire suivant ne change pas l'arbre applicatif testé ; le SHA final est communiqué avec la livraison. **Aucun push, aucune fusion et aucun déploiement.**
