# REKKA FAST TRACK V1 — jalon 2 : finalisation fonctionnelle et mise à jour de la BÊTA existante

**Branche de travail :** `claude/rekka-v1-fast-track`, partie de `8c8460e` (audit FAST TRACK) et de `d59d91d` (lot 4.6).

**Publication :** uniquement sur le projet Cloudflare Pages existant `rekka-beta` (https://rekka-beta.pages.dev), par une avance rapide de `claude/rekka-beta` (§ 8).

**Production `f9f7e2e` : jamais touchée.**

## 1. Chantier A — replanification avec confirmation obligatoire

**Défaut corrigé.** `ensureBeta0Week` régénérait sans accord la semaine courante quand une mise à jour changeait la version de planification et que la semaine n'était pas commencée. Ce n'est plus le cas : l'ouverture ne modifie jamais la semaine.

**Nouveau parcours** (`packages/app-core/src/beta0-app.ts`, `week-changes.ts` ; `apps/kairo/src/planning/WeekProposal.tsx`) :

- Une carte **« Nouveau planning proposé »** apparaît dans Planning ; l'Accueil affiche un avis.
- **« Voir la proposition »** calcule à la demande, sans rien écrire :
  - **Planning actuel / Planning proposé** ;
  - les changements : séances conservées, déplacées, remplacées, ajoutées, retirées, non planifiées (avec leur cause) ;
  - la **récupération** : avertissements, dont ceux introduits par la proposition.
- **« Conserver mon planning »** : choix tracé (`KAIRO.WEEK_STALE_KEPT`). La semaine reste telle quelle et n'est plus proposée.
- **« Appliquer le nouveau planning »** : vérifie que rien n'a changé depuis l'aperçu, sinon `REPLAN_STALE`. Recalcule, puis trace `KAIRO.WEEK_REPLANNED_STALE` avec `confirmedBy: user`.
- **Protection** : seules les semaines `stale_replaceable` sont concernées (aucun résultat, aucune séance en cours, aucune séance passée, semaine non clôturée). Historique, charges et performances ne sont jamais modifiés.
- Le recalcul Musculation existant (profil modifié) prend les **mêmes libellés et la même comparaison**.

## 2. Chantier B — séances manquées

Accès : écran d'une séance planifiée, ni commencée ni enregistrée → **« Séance manquée ou à reporter ? »**.

**« Je ne l'ai pas faite »** :
- confirmation obligatoire ;
- résultat `missed` **déclaré**, jamais une réalisation ;
- aucune performance ni progression enregistrée ;
- aucun rattrapage automatique.

**Reporter** : seulement vers un jour **de la même semaine**, à partir d'aujourd'hui, qui remplit toutes ces conditions :
- disponible dans le profil ;
- sans autre séance prévue ;
- sans conflit de récupération :
  - règle Musculation existante `recoveryHours` (36 h par région, Full Body compris, Haut et Bas compatibles), **avant comme après** le jour visé ;
  - interférences multisport gouvernées (`manualPlacementConflicts`).

**Fonctionnement du report** :
- aperçu (planning actuel / proposé), puis « Appliquer le report » ou « Conserver mon planning » ;
- prescription inchangée, tracée par `KAIRO.SESSION_POSTPONED` ;
- en pause douleur, aucun report n'est proposé ;
- les jours refusés sont listés avec leur cause.

Un défaut a été trouvé pendant le développement : le seul contrôle d'interférence acceptait un Full Body placé le lendemain d'un autre Full Body. La règle de récupération Musculation a été ajoutée et un test le démontre.

## 3. Chantier C — écran Progression

L'onglet Progression remplace les 3 compteurs par un **suivi réel**, construit uniquement à partir des données existantes. Aucun moteur n'est modifié.

| Sport | Ce qui est affiché |
|---|---|
| Musculation | Par exercice (principaux d'abord) : charge maximale par séance (courbe), meilleures répétitions, séries réalisées, volume, tendance (première / dernière charge) ; totaux hebdomadaires. |
| Course | Durée, distance ; allure **seulement** si la distance est connue et la course terminée ; régularité réalisée / prévue. |
| HYROX, Cross-training | Nombre de séances, durée mesurée, dates. Mention « sport expérimental, pas de suivi de progression ». |

- États vides explicites.
- Fichiers : sélecteur pur `progressView` (`packages/app-core/src/progress-view.ts`), écran `apps/kairo/src/screens/beta0/Progress0.tsx`.
- **Limite connue :** la largeur 360 / 390 px est obtenue par la mise en page CSS mais n'a pas été mesurée en navigateur pour cet écran (les E2E 360 / 390 existants passent).

## 4. Chantier D — identité PWA REKKA

- **Icônes officielles REKKA**, identiques à la branche `codex/rekka-android-icon-fullbleed` :
  - copiées dans la BÊTA sous de **nouveaux noms** : `rekka-icon-192/512(-maskable).png`, `rekka-apple-touch-icon.png`, `rekka-favicon.ico` ;
  - icône masquable dans la zone sûre Android ;
  - empreintes conformes à `icons.json`.
- **Manifeste** :
  - fond et couleur de thème bleu nuit `#04121f` ;
  - icônes 192, 512 et masquables ;
  - **`id`, `start_url` et `scope` inchangés** : l'application installée est mise à jour sur place, jamais dupliquée.
- **Service worker** : nouvelles icônes dans le précache.
- **Production** : build identique (aucun fichier `rekka-*`).
- **Couleurs de sport** de la charte : déjà corrigées au jalon 1.
- **Limites :**
  - l'arrière-plan de l'icône est une scène nocturne, pas un aplat ;
  - sur un lanceur Android réel, l'icône d'une WebAPK peut mettre du temps à se rafraîchir ;
  - jamais vérifié sur un appareil.

## 5. Chantier E — HYROX et Cross-training (expérimentaux)

- À l'accueil, les deux sports portent la mention **« Expérimental »** : règles en cours de validation, aucune progression automatique.
- **Nouvel E2E `e2e-beta-ct-hyrox.mjs`**, ajouté à la vérification post-déploiement :
  - marquage expérimental ;
  - **garde-fou** : après une coupure déclarée, aucune règle de reprise n'est validée ; un avertissement s'affiche et **aucune séance HYROX n'est planifiée** (refus explicite) ;
  - parcours complets : séance, chronomètres, pause, rechargement, persistance, historique, refus après douleur.
- Aucun garde-fou scientifique n'a été contourné.

## 6. D2 — `progression-stab-1` activée sur la BÊTA

**Activation.**
- `beta0Environment()` lit `PROGRESSION_POLICIES['progression-stab-1']`.
- L'option `progressionPolicy: null` reproduit la lecture antérieure ; elle sert aux bancs et aux références figées, jamais au produit.

**Défaut critique trouvé et corrigé.**
- La fin de séance de l'application (`finishProgrammeSession`) n'était appelée **sans environnement**. La politique ne se serait donc jamais appliquée aux vraies séances, alors que les simulations, elles, la transmettaient.
- L'environnement BÊTA est désormais transmis par défaut. Seule la lecture de progression en dépend.

**Vérifications** (`rc5-fasttrack-progression-activation`, `rc5-fasttrack-progression-policy`, `e2e-beta-progression.mjs`) :

| Point | Résultat |
|---|---|
| 1. Ruleset versionné | Identifiant `progression-stab-1` dans chaque décision `PROGRESSION.EXPOSURE_CLASSIFIED`. Paramètre déclaré dans le registre des codes Strength : sans cette déclaration, **chaque fin de séance aurait échoué** (révélé par le test). |
| 2. Séances historiques | **Bascule en cours de programme** (activation en semaine 6) : l'audit antérieur est **identique** à celui sans politique, sans identifiant, et relu ; les nouvelles décisions sont tracées. |
| 3. Format 5 | L'export puis l'import restituent l'état à l'identique ; aucun changement de schéma. |
| 4 à 6. Décisions, principaux, accessoires | Squat, soulevé de terre roumain et développé couché ≥ lecture antérieure (progression, retour, séances manquées, course). Accessoires > 0 et à moins de 20 % par suivi. |
| 7. Fatigue réelle | Fatigue persistante : baisses toujours détectées, squat < 100. |
| 8. Après interruption | Scénario de retour identique ou meilleur. L'hystérésis compte des expositions : après une coupure, une baisse antérieure bloque encore 3 hausses (prudent). |
| 9. Fin de séance | Zéro erreur sur 14 scénarios et 6 profils hybrides, 12 semaines. |
| 10. E2E | Trois séances Musculation réelles dans la build BÊTA : aucune fin bloquée, décisions tracées `progression-stab-1`, relues après rechargement. Étape ajoutée à la vérification post-déploiement. |

**Compromis connu (non masqué).**
- Forte réduction des oscillations sur 24 semaines : changements de sens 331 → 146, allers-retours 273 → 96.
- Charges principales préservées dans les simulations.
- **Charge finale cumulée −3 à −5 % sur 5 profils hybrides**, surtout sur les accessoires (doc 15 § 4).

**Non activé :** R4 (séances allégées). La plage de validité de l'estimation n'est pas modifiée.

**Références figées.** Les bancs des lots 4 à 4.6 et le banc qualité RC4.6 sont épinglés sur la lecture antérieure (`progressionPolicy: null`). Ils restent comparables à leurs rapports ; la politique active est testée séparément.

## 7. D3 et D4 — préparés, NON activés

### D3 — redistribution : recommandation fondée sur les simulations de 24 semaines (doc 14 § 8)

| Profil représentatif | RED-GUARD | SW-ALT + RED-GUARD | Meilleure option |
|---|---|---|---|
| Musculation 4× + HYROX 2× (L4-2) | déficit 8,9 | 12,2 | RED-GUARD |
| HYROX intensif 3× (L43-HYX3) | 14,5 | **10,0** | SW-ALT + RED-GUARD |
| Semaine courte (L42-SHORT) | 3,8 | 3,3 | SW-ALT + RED-GUARD (écart faible) |
| Course (L41-RUN, L42-RUN3) | inchangé | inchangé | aucun effet |

**Critère explicite proposé** (reproductible, indépendant du nom du sport) :
- appliquer **SW-ALT + RED-GUARD** si la semaine compte **au moins 3 séances non Musculation à dominante bas du corps** (HYROX, course longue), **ou** si c'est une semaine courte ;
- sinon **RED-GUARD** ;
- **aucune redistribution** si une garde de récupération ou de durée est menacée (garde `keep_residual`).

Dans tous les cas : mollets préservés, durée ≤ limite, squat inchangé.

**À faire avant activation :**
- coder ce sélecteur dans le contenu candidat versionné (chaîne de lecture déjà prête) ;
- le passer sur les 20 profils ;
- **décision du propriétaire du produit**.

### D4 — reprise après une longue interruption : politique PRUDENTE proposée (information, pas de prescription automatique)

**Constat dans le code :**
- Musculation : seule la reprise après douleur existe (`resumeTrack`) ; aucune règle de désentraînement ;
- HYROX et Cross-training : refus explicite après une coupure (conservé) ;
- Course : coupure longue ou inconnue refusée.

**Sources reconnues sur lesquelles s'appuyer** (à relire par un expert avant tout chiffrage) :
- Mujika I., Padilla S. — *Detraining: loss of training-induced physiological and performance adaptations*, Sports Medicine, 2000 (parties I et II) ;
- Bosquet L. et al. — méta-analyse sur l'arrêt de l'entraînement et la performance musculaire, Scand. J. Med. Sci. Sports, 2013 ;
- American College of Sports Medicine — *Position stand: progression models in resistance training for healthy adults*, Med. Sci. Sports Exerc., 2009.

**Politique proposée** (inactive). Elle ne fait que diriger vers des mécanismes **déjà existants** ; aucun nouveau seuil chiffré n'est inventé :

1. Durée de coupure déclarée (catégories `SHORT`, `MODERATE`, `LONG`, `UNKNOWN` déjà présentes dans le profil) et date de la dernière séance réalisée.
2. **Coupure courte** : reprise des suivis existants. Première séance au RIR prudent existant (`cautiousRir`). Aucune hausse tant qu'une exposition de reprise n'a pas été lue (mécanisme d'hystérésis existant).
3. **Coupure moyenne ou longue** : **recalibrage** par les séances d'étalonnage existantes (semaine 1 du programme), au lieu de reprendre les anciennes charges. Volume de la semaine limité à la bande basse existante.
4. **Signaux d'alerte** (douleur, maladie, coupure inconnue) : **aucune prescription automatique**. Message d'information recommandant un avis médical ou professionnel ; la pause douleur existante s'applique.
5. HYROX et Cross-training : refus conservé jusqu'à validation de leurs règles.

À valider avant activation :
- seuils de durée par catégorie ;
- choix entre recalibrage et reprise ;
- message affiché.

## 8. Publication (BÊTA existante uniquement)

- **Projet :** Cloudflare Pages `rekka-beta`, URL https://rekka-beta.pages.dev.
- **Déclencheur :** `.github/workflows/rekka-beta-pages.yml`, push sur `claude/rekka-beta` seulement (chemins `apps/kairo/**`, `packages/**`, `pnpm-lock.yaml`, workflow).
  - Aucune autre branche ne déclenche ce projet.
  - La production (`kairo-pages.yml`) ne se déclenche que sur `claude/crosstraining-c1-c2-spike-vbg8dv`, jamais poussée.
  - Les workflows Android ne se déclenchent que sur des branches `codex/…`.
- **Méthode :**
  - `claude/rekka-beta` (`097bacb`) est un ancêtre du commit intégré ; publication par **avance rapide, sans force** ;
  - le workflow exécute `pnpm check`, la build, la garde de projet, `wrangler pages deploy --project-name=rekka-beta`, puis la vérification sur l'URL stable : version servie, E2E BÊTA, hors ligne, progression, HYROX et Cross-training.
- **Correction vers l'avant :**
  - données au format 5 inchangé : aucun changement de schéma dans ce jalon, rien à migrer ;
  - en cas d'anomalie, un correctif est publié de la même façon ;
  - un retour à `097bacb` reste lisible : même format 5, et les nouvelles traces d'audit sont des paramètres libres.
