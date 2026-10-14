# KAIRO RC3.3 — Enregistrement des courses libres

Branche `claude/kairo-rc3-dev`, après `dd59f80`. Commit : `b7dba9f`.

Garde-fous :
- aucune règle sportive ni prescription modifiée ;
- planificateur et contrat Running inchangés ;
- RC1 TEST et production inchangés ;
- rien n'a été fusionné ni déployé.

## 1. Avant / après

| | avant | après |
|---|---|---|
| Saisir une course faite hors programme (Beta 0) | **impossible** : seule la « dernière course » de l'onboarding existait ; l'écran V0 « Course » est inaccessible en Beta 0 | « Ajouter une course » dans l'**Historique** et dans **Réglages → Profil Course** |
| Champs | — | date, heure de départ, distance (facultative), durée (h / min / s), ressenti, commentaire facultatif |
| Allure | — | allure moyenne **calculée** depuis la distance et la durée saisies, affichée en direct ; sans distance, aucune allure |
| Date et heure | `logFreeRun` datait toujours la course « maintenant » | début déclaré ; fin = début + durée ; jamais dans le futur |
| Doublons | refus seulement si l'horodatage était identique | refus de toute course qui **chevauche** une course déjà enregistrée (course libre ressaisie, ou course du programme au même moment) |
| Historique | courses libres invisibles | cartes « Course libre · Hors programme », intercalées par date (durée, distance, allure, ressenti, commentaire) |
| Saisie incomplète | — | bouton désactivé avec la raison (« Pour enregistrer : … ») ; refus app-core expliqués |

## 2. Intégration

- **Un seul historique.** La course passe par le contrat existant `logFreeRun` et devient une entrée de
  `running.realized`, au contrat du moteur Running. Ce contrat est inchangé. Le commentaire est une annexe
  `running.notes`, indexée par l'identifiant de la course.
- **Données Running.** Le moteur la lit comme toute course réalisée :
  - elle fournit la dose de départ des semaines suivantes ;
  - avec sa distance, elle fournit une allure observée, qui permet de programmer un TEST.
- **TEST.** Vérifié dans les deux sens :
  - après une course libre **avec** distance, « programmer un test » programme le TEST ;
  - **sans** distance, c'est le repli explicite RC3.1 A2 qui s'applique.
- **Pas de rétroactivité.** Les semaines persistées et l'état du programme sont identiques, octet pour octet, avant et
  après la saisie, y compris en profil multisport. Une course bloquée faute de course enregistrée reste bloquée dans
  la semaine en cours ; la semaine suivante est planifiée normalement.
- **Pas de double comptage.**
  - une seule entrée au contrat Running ;
  - absente de l'historique des séances du programme ;
  - chevauchement refusé.
- **Persistance.** La course et son commentaire sont conservés après fermeture et réouverture (vérifié en DOM), à
  l'enregistrement d'une course du programme et à la réinitialisation Beta (« Effacer et recréer »).

### Défaut corrigé en route

Trois endroits reconstruisaient `state.running` en ne gardant que deux champs. Le nouveau commentaire y aurait été
perdu, notamment à l'enregistrement d'une course du programme. Les trois sont corrigés, et un test le vérifie.

## 3. Validations de saisie (refus, état inchangé)

| saisie | réponse |
|---|---|
| durée 0, négative, non numérique, > 24 h | « Durée invalide » |
| distance 0, négative, infinie | « Distance invalide » (bouton désactivé dans le formulaire) |
| 5 km en 1 min | « Distance et durée incompatibles (vitesse impossible) » |
| date ou heure illisible | « Date ou heure invalide » |
| course qui se terminerait dans le futur | « Cette course se terminerait dans le futur » |
| même course ressaisie, ou chevauchement | « Cette course est déjà enregistrée… jamais comptée deux fois » |
| commentaire > 280 caractères | refus (le champ est aussi limité) |

Trois garde-fous de saisie sont **techniques**, et non des règles sportives : 24 h, vitesse au-delà de 12,5 m/s (au-delà
du record du 100 m), 280 caractères. Ils sont déclarés comme constantes techniques.

## 4. Tests et validation

| contrôle | résultat |
|---|---|
| `pnpm check` | ✅ 2 713 réussis, 1 ignoré |
| app-core RC3.3 | ✅ 9 : saisie, allure, 13 saisies invalides, doublons et chevauchements, course du programme au même moment, persistance (export, course du programme, réinitialisation), aucune séance modifiée, dose de départ, TEST avec et sans distance, multisport |
| DOM RC3.3 | ✅ 4 : Historique (formulaire expliqué, allure, enregistrement, rechargement), refus (distance, doublon, futur), profil Course jusqu'au TEST, profil sans course |
| Build production | ✅ |
| E2E complet | ✅ 221 contrôles |
| Rendu Android 360 px (profil Galaxy S9+) | ✅ aucun défilement horizontal, aucune erreur de page |

Un défaut d'affichage a été trouvé et corrigé à 360 px : dans le champ de durée à trois composants, les minutes
s'affichaient « 4! » au lieu de « 45 ». Les marges internes du composant partagé ont été réduites, et la largeur des
trois champs a été vérifiée.

**E2E existant ajusté.** Un contrôle comptait les « Ressenti : » dans l'historique pour vérifier les 4 retours
terrain. Il compte désormais leur marqueur `data-history-feedback`, puisque les courses libres affichent aussi un
ressenti.

## 5. Limites et décisions

1. **Course déclarée à l'onboarding.** La « dernière course » saisie à l'onboarding est datée du moment de la
   déclaration : sa vraie date n'est pas demandée. Elle apparaît désormais dans l'historique comme course libre, à
   cette date. Option : demander sa date à l'onboarding.
2. **Douleur.** Le formulaire ne demande pas de douleur, conformément à la liste de champs demandée. Le contrat le
   permet : la déclaration activerait la pause douleur existante. À ajouter si vous le souhaitez.
3. **Profils sans course activée.** L'entrée n'est pas affichée, faute de moteur Running dans le programme. HYROX
   comprend de la course : à décider si ces profils doivent aussi pouvoir enregistrer une course libre.
4. **Correction et suppression.** Une course enregistrée ne peut être ni modifiée ni supprimée. Ce n'était pas
   demandé ; à prévoir si une saisie erronée doit pouvoir être retirée.

## 6. Suite

En attente de votre validation avant RC3.4.
