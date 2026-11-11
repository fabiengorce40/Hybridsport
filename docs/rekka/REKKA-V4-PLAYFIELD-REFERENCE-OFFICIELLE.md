# REKKA V4 — Planche Playfield Pro OFFICIELLE et garde-fous

## Référence visuelle figée
L'unique référence graphique est la **planche de sept écrans validée explicitement par l'utilisateur**, fournie le 11 novembre 2026 dans le chat (image originale **`1000030889.png`**, 1024 × 1536).

Elle comporte, en ordre :
1. Accueil ;
2. Séance en cours ;
3. Progression ;
4. Planning ;
5. Détail exercice ;
6. Bilan de séance ;
7. Profil.

Les rendus graphiques doivent la suivre dans les détails : gabarits, rythme typographique, palette, formes, espace, icônes, hiérarchie, illustrations cohérentes, 4 onglets bas (Accueil / Planning / Progression / Profil), anneau de repos dégressif.

**Ne pas prendre comme référence visuelle les captures des anciennes builds V4.** Elles sont des constats des écarts et non une nouvelle direction.

### Couleurs strictes
| Rôle | Hex |
|---|---|
| Primaire | `#1647C8` |
| CTA | `#FDCB32` |
| Secondaire | `#FA6A58` |
| Fond | `#FFF7EA` |
| Texte | `#0E1B35` |

### Écarts légitimes imposés par l'application réelle
La planche contient des informations **inventées pour l'illustration** :
- utilisateur « Alex » ;
- « Niveau 12 », « 3450 XP » ;
- calories fictives (1240, 432) ;
- valeurs de performance fictives « +2,5 % » ;
- résultats de graphiques fictifs.

REKKA **ne doit jamais afficher ces chiffres comme des faits**. Remplacer par les valeurs du profil réel, des séances réellement prescrites, des journaux persistés et de `progressView`, ou afficher « non disponible ». Aucun système d'XP, estimation calorique ou score inventé ne doit être ajouté pendant la refonte.

La planche présente parfois du développé couché à la **barre** alors que la séance de démonstration peut prescrire du développé couché **haltères** : ne pas afficher une barre lorsque la prescription réelle concerne deux haltères.

Toute photo/vidéo d'exercice doit être fiable et compatible avec le mouvement ; autrement conserver une illustration clairement indicative.

### Ce qui a été porté dans la branche
- Quatre onglets navigables, accès à « Mes séances » via l'accueil.
- Accueil : vraie séance, progression de séries depuis `selectProgrammeSession`, 3 cartes de KPI réels, semaine lisible.
- Séance active : cartes de tous les exercices, steppers `−/+ ` avec saisie libre, validation de série persistée, cercle de repos et prochaine série issue de la prescription, accès à l'exercice suivant.
- Progression : vraie synthèse, sélecteur Semaine/Mois/Année basé sur les dates réellement enregistrées, graphiques sans courbes inventées.
- Planning : semaine réelle 7 jours et catalogue complet dans « Organisation et séances détaillées », replanification avec consentement intacte.
- Détail exercice : vue dédiée, illustration originale indicative, onglets Infos / Historique / Conseils fonctionnels, séries réelles.
- Bilan : célébration graphique mais données vérifiables et formulaire original de clôture conservé.
- Profil : cinq rubriques dans l'ordre de la maquette, accès Paramètres dans l'en-tête ; pas de fausse photo, de niveau ni d'XP.

Tout est **isolé derrière `VITE_REKKA_SKIN=playfield-pro`** et derrière `html[data-rekka-theme="playfield-pro"]`. Ne pas modifier la BÊTA, la production ni les moteurs.

## Critères de validation qui restent BLOQUANTS

1. Vérifier le HEAD exact de `codex/rekka-v4-playfield-reference-exact`.
2. Exécuter **`pnpm check`** ; résoudre intégralement les erreurs TypeScript, ESLint et unitaires.
3. Construire la vraie V4 avec la commande de build BÊTA isolée (`pnpm --filter kairo build:beta` ou la commande monorepo réellement configurée).
4. Réexécuter `e2e-v4-screens.mjs` depuis `apps/kairo` sur la vraie build, puis E2E V3.1 et tous les parcours BÊTA ; comparer les états aux captures de la planche à 360, 390 et 412 px.
5. Mesurer absence de scroll horizontal et recouvrement par le dock de repos / clavier, exactitude anneau aux 100 %, 50 %, 0 %, pause/reprise, +15s, fermeture/réouverture, arrière-plan et hors ligne.
6. Vérifier `Playfield_TABS` au nombre de 4, retour vers toutes les séances depuis l'accueil, navigation profil, détails exercice, retour et démarrage.
7. Vérifier qu'aucun champ de poids ou de répétitions n'écrit une valeur avant l'action de validation ; maintenir les montées en charge exclues du volume.
8. Audit du rendu, écran par écran, comparatif côte à côte avec la **vraie planche originale** et capture compilée. Les différences de géométrie, illustration, courbes, typographie ou espacement doivent être signalées.
9. Tester sur Samsung véritable, particulièrement cadence visuelle des secondes et cibles tactiles `≥44 × 44px`.
10. Mettre en place le fichier de capture des 7 vues et 4 états supplémentaires de séance, sans utiliser une capture comme composant React.

**Statut** : intégration du code et des styles effectuée sur branche isolée. **Cette note ne certifie pas la fidélité pixel-perfect.** Sans compilation et comparaison réelle de captures, il est interdit de présenter la V4 comme visuellement validée. Aucune fusion, aucun déploiement, aucune modification des workflows.
