# KAIRO RC3.2 — Cross-training et matériel (A3) · boutons désactivés expliqués

- Branche : `claude/kairo-rc3-dev`, après RC3.1 (`cf24c9f`).
- Commit de correction : `b3925bd`.

Garde-fous respectés :
- aucune règle sportive, aucune prescription du moteur et aucun code du planificateur modifiés ;
- RC1 TEST et production inchangés ;
- rien n'a été fusionné ni déployé.

## 1. Matrice de faisabilité (moteur réel)

**Méthode.** La sonde `ctIntentFeasibility` (app-core) ne contient aucune table : pour chaque intention, elle
**planifie réellement** une semaine Cross-training seule par le chemin Beta 0 complet :
- programme, puis planificateur, puis moteur Cross-training (délégation au moteur Musculation comprise) ;
- avec le matériel, le niveau, les disponibilités et la coupure déclarés.

Faisable ⇔ le moteur compose une séance. Sinon, deux informations sont lues dans la trace du moteur :
- la cause décisive (RC3.1 A8) ;
- les facteurs : temps, matériel, niveau, sécurité. Un facteur non attribuable n'est jamais deviné.

Matrice régénérée à chaque test : `packages/app-core/tests/rc32/__reports__/ct-feasibility.md`. Profil
Cross-training seul, 60 min du lundi au vendredi, sans coupure. ✅ réalisable ; ❌ irréalisable (facteur lu dans
la trace).

| niveau | matériel | Mixte | Capacité aérobie | Seuil | Intervalles intenses | Endurance musculaire | Force + conditionnement |
|---|---|---|---|---|---|---|---|
| débutant | salle commerciale, box, salle hybride, maison équipée, poids du corps, salle complète | ✅ | ✅ | ✅ | ✅ | ❌ niveau | ❌ non attribuable |
| débutant | haltères seules | ❌ temps + matériel | ✅ | ✅ | ✅ | ❌ niveau | ❌ non attribuable |
| intermédiaire | salle commerciale, box, salle hybride, maison équipée, salle complète | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| intermédiaire | haltères seules, poids du corps | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ non attribuable |
| **avancé** | **tous** | ❌ niveau | ❌ niveau | ❌ niveau | ❌ niveau | ❌ niveau | ❌ non attribuable |

Constats :
- **A3 confirmé.** « Force + conditionnement » est irréalisable avec haltères seules ou poids du corps. Il l'est
  aussi pour tout débutant, quel que soit le matériel ; la trace ne dit pas pourquoi.
- **Nouveau constat, à décider de votre côté.** Au niveau **avancé**, aucune intention Cross-training n'est
  réalisable : le moteur répond `DOSE_UNDECIDED:advanced`, aucune dose n'étant validée pour ce niveau. Je n'ai rien
  changé ; l'interface le dit désormais clairement.
- **Cohérence vérifiée.** Pour 3 profils, la sonde et la planification réelle d'un profil complet donnent le même
  résultat (séance composée ou bloquée) pour chacune des 6 intentions.

## 2. Avant / après

| situation | avant (RC3.1) | après (RC3.2) |
|---|---|---|
| Onboarding, haltères seules + « Force + conditionnement » | aucun avertissement, programme créé ; séance CT **bloquée chaque semaine** | avertissement explicite au choix du matériel ; options **réellement** réalisables proposées en boutons (débutant + haltères : Capacité aérobie, Seuil, Intervalles intenses) ; un clic suffit à corriger |
| Choix de l'intention avant de connaître le matériel | rien | « La faisabilité sera vérifiée par le moteur dès que votre matériel sera choisi » |
| Modification du programme (profil existant) | aucun avertissement | intentions marquées « réalisable / irréalisable » dès l'étape Objectifs (matériel connu) ; avertissement et options |
| Profil existant enregistré avec une intention irréalisable | « Aucune séance valide n'a pu être construite pour ce créneau. » | séance bloquée : « Cette intention… ne peut pas être composée avec votre profil actuel : l'onglet Programme indique les intentions réalisables » ; onglet Programme : intention en cause et options réalisables, à choisir dans « Modifier » |
| Bouton « Continuer » / « Créer » désactivé | grisé, **sans explication** (retour terrain : HYROX non complété) | encadré « Pour continuer : » listant exactement ce qui manque |

L'encadré « Pour continuer : » couvre les cas suivants :
- case « J'ai compris » non cochée ;
- aucun sport choisi ;
- champs Cross-training ou HYROX manquants, nommés un par un ;
- dernière course sans durée ;
- date d'objectif passée ;
- aucun jour disponible ;
- lieu d'entraînement non choisi ;
- séance en cours lors d'une recréation.

**Migration.** Aucune donnée n'est migrée : le profil enregistré est inchangé et la sonde le relit tel quel. Les
états réels de la version déployée (`deployed-state-dom`, fixtures f9f7e2e) se chargent toujours, et les tests
passent.

## 3. Validation

| contrôle | résultat |
|---|---|
| `pnpm check` | ✅ 2 700 réussis, 1 ignoré |
| Tests ciblés | ✅ app-core : 6 (matrice, cohérence avec la planification réelle, sécurité, sonde pure) ; DOM : 5 (boutons expliqués, onboarding, non-régression, modification, profil existant) |
| Build production | ✅ |
| E2E complet (build production locale) | ✅ 221 contrôles, « E2E OK » |
| Captures 360 px | encadré « Pour continuer » ; avertissement avec options |
| Temps de la sonde | 231 ms dans Chromium sur ordinateur, pour 6 intentions ; probablement autour d'une seconde sur un téléphone d'entrée de gamme. Calculée seulement quand le niveau, le matériel ou les disponibilités changent. |

## 4. Limites et décisions

1. **Avancé : aucune intention CT réalisable.** C'est une décision sportive : doses à valider pour ce niveau, ou
   intentions non proposées.
2. **« Force + conditionnement », causes non attribuables.** Pour un débutant ou un matériel limité, la trace
   indique seulement que la séance complète de Musculation déléguée est refusée. Le message le dit tel quel.
3. **Rien n'empêche la création** d'un programme avec une intention irréalisable : l'avertissement et les options
   sont affichés, et le choix reste à l'utilisateur. Vous pouvez préférer bloquer la création ; c'est une
   décision produit.
4. **Ancien assistant V0 (`screens/Onboarding.tsx`, A14).** Il est hors périmètre et inaccessible aux nouveaux
   profils ; ses boutons ne sont pas expliqués.

## 5. Suite proposée (non commencée, en attente de votre accord)

**RC3.3 — A9 : course libre en Beta 0.** Enregistrer une course hors programme fournit une allure observée, ce qui
rend le TEST possible et prolonge A2. C'est le point suivant de la feuille de route.
